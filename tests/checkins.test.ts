import { describe, expect, it } from 'vitest';
import { db } from '../server/db.js';
import { attendanceProfile, observedFunnel, recommendTarget } from '../server/lib/intelligence.js';

const kemps = db.prepare("SELECT id FROM studios WHERE name='Kemps Corner'").get() as any;

describe('Checkins provenance, privacy and behavioural metrics', () => {
  it('reconciles the committed source import without silently losing rows', () => {
    const source = db.prepare("SELECT * FROM imports WHERE category='checkins' AND status='committed' ORDER BY id DESC LIMIT 1").get() as any;
    expect(source).toBeTruthy();
    expect(source.total_rows).toBe(source.valid_rows + source.invalid_rows + source.duplicate_rows);
    expect(source.imported_rows).toBe(source.valid_rows);
    expect(source.total_rows).toBeGreaterThan(150000);
    expect(source.duplicate_rows).toBeGreaterThan(0);
    expect(Number((db.prepare('SELECT COUNT(*) n FROM checkins').get() as any).n)).toBe(source.imported_rows);
  });

  it('stores compact pseudonymous keys and no customer names, emails or Paid revenue field', () => {
    const columns = (db.prepare('PRAGMA table_info(checkins)').all() as any[]).map(column => column.name);
    expect(columns).not.toContain('email');
    expect(columns).not.toContain('first_name');
    expect(columns).not.toContain('last_name');
    expect(columns).not.toContain('paid');
    const types = db.prepare('SELECT typeof(source_uid) source_type,typeof(member_ref) member_type FROM checkins LIMIT 1').get() as any;
    expect(types).toEqual({ source_type: 'blob', member_type: 'blob' });
  });

  it('keeps check-in, late cancellation and other non-check-in counts mutually exclusive', () => {
    const profile = attendanceProfile(kemps.id, 2026);
    const s = profile.summary;
    expect(s.bookings).toBe(s.checkins + s.late_cancellations + s.other_not_checked);
    expect(s.checkin_rate).toBeGreaterThan(0);
    expect(s.checkin_rate).toBeLessThanOrEqual(1);
    expect(s.late_cancellation_rate).toBeGreaterThanOrEqual(0);
    expect(s.late_cancellation_rate).toBeLessThanOrEqual(1);
    const overlap = Number((db.prepare('SELECT COUNT(*) n FROM checkins WHERE checked_in=1 AND late_cancelled=1').get() as any).n);
    expect(overlap).toBe(0);
  });

  it('excludes current-day and future sessions from observed annual behaviour', () => {
    const profile = attendanceProfile(kemps.id, 2026);
    const expected = Number((db.prepare(`SELECT COUNT(*) n FROM checkins WHERE studio_id=? AND month BETWEEN '2026-01' AND '2026-12'
      AND session_at<strftime('%s','now','start of day')`).get(kemps.id) as any).n);
    expect(profile.summary.bookings).toBe(expected);
    expect(profile.monthly.every(row => row.month < '2026-11')).toBe(true);
  });

  it('uses observed all-booking attendance without inventing a trial-specific rate', () => {
    const funnel = observedFunnel(kemps.id);
    expect(funnel.sources.bookingToAttendanceRate).toBe('checkins_historical_all_bookings');
    expect(funnel.sampleSizes.bookingCohort).toBeGreaterThan(1000);
    expect(funnel.bookingRateScope).toContain('not trial-specific');
    expect(funnel.bookingToAttendanceRate).toBeGreaterThan(0.8);
    expect(funnel.bookingToAttendanceRate).toBeLessThanOrEqual(1);
    expect(funnel.sources.leadToBookingRate).toBe('manual_assumption');
  });

  it('returns bounded attendance-return and operational outlook metrics, not a revenue forecast', () => {
    const profile = attendanceProfile(kemps.id, 2026);
    expect(profile.summary.next_month_return_rate).toBeGreaterThanOrEqual(0);
    expect(profile.summary.next_month_return_rate).toBeLessThanOrEqual(1);
    expect(profile.outlook.baseline_attended).toBeGreaterThan(0);
    expect(profile.outlook.planning_low).toBeLessThanOrEqual(profile.outlook.baseline_attended);
    expect(profile.outlook.planning_high).toBeGreaterThanOrEqual(profile.outlook.baseline_attended);
    expect(profile.outlook.method).toContain('not a confidence interval or revenue forecast');
  });
});

describe('Kemps Corner January 2027 rent-aware planning', () => {
  it('retains monthly seasonality inside the directed ₹30–40L guardrail with a preserved baseline and rationale', () => {
    const rows = db.prepare(`SELECT * FROM monthly_targets WHERE studio_id=? AND year=2027 ORDER BY month`).all(kemps.id) as any[];
    expect(rows).toHaveLength(12);
    expect(rows.reduce((sum, row) => sum + row.proposed_target, 0)).toBe(38900000);
    expect(new Set(rows.map(row => row.proposed_target)).size).toBeGreaterThan(4);
    for (const row of rows) {
      expect(row.proposed_target).toBeGreaterThanOrEqual(3000000);
      expect(row.proposed_target).toBeLessThanOrEqual(4000000);
      const assumptions = JSON.parse(row.assumptions);
      expect(assumptions.rentAdjustment.effectiveMonth).toBe('2027-01');
      expect(assumptions.rentAdjustment.source).toBe('user_directed_planning_assumption');
      expect(assumptions.rentAdjustment.preAdjustmentTarget).toBeGreaterThan(0);
      expect(assumptions.conversionSources.bookingToAttendanceRate).toBe('checkins_historical_all_bookings');
      expect(row.baseline_forecast).toBeGreaterThan(0);
    }
    const april = rows.find(row => row.month === 4);
    expect(april.baseline_forecast).toBeGreaterThan(5000000);
    expect(april.proposed_target).toBe(4000000);
  });

  it('reapplies the rent constraint on regeneration without rewriting the baseline forecast', () => {
    for (const month of [1, 4, 9]) {
      const recommendation = recommendTarget(kemps.id, 2027, month, 'base');
      const assumptions = JSON.parse(recommendation.assumptions);
      expect(recommendation.proposed_target).toBeGreaterThanOrEqual(3000000);
      expect(recommendation.proposed_target).toBeLessThanOrEqual(4000000);
      expect(recommendation.baseline_forecast).toBe(assumptions.rentAdjustment.preAdjustmentTarget);
      expect(JSON.parse(recommendation.funnel).requiredTrialBookings).toBeGreaterThan(0);
    }
  });
});
