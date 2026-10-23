import { describe, expect, it } from 'vitest';
import { db } from '../server/db.js';
import { actualMetrics } from '../server/lib/intelligence.js';
import { renewalReport } from '../server/lib/renewals.js';
import { reportCatalog, reportDefaults, runReport } from '../server/lib/reporting.js';

const options = (report: string, extra: any = {}) => ({ report, from: '2026-01', to: '2026-10', limit: 200, ...extra });

describe('advanced reporting catalogue', () => {
  it('offers twenty-one executable reports across five domains', () => {
    const catalog = reportCatalog(['settings']);
    expect(catalog).toHaveLength(21);
    expect(new Set(catalog.map(report => report.category))).toEqual(new Set(['Executive','Commercial','Retention','Operations','Governance']));
    const defaults = reportDefaults();
    for (const definition of catalog) {
      const result = runReport({ report: definition.id, from: definition.period === 'actual' ? defaults.actualFrom : defaults.planningFrom,
        to: definition.period === 'actual' ? defaults.actualTo : defaults.planningTo, scenario: definition.scenarioFilter ? 'standard' : undefined, limit: 3 });
      expect(result.returnedRows).toBeLessThanOrEqual(3);
      expect(result.columns.length).toBeGreaterThan(0);
      for (const metric of result.summary) expect(metric.value === null || Number.isFinite(metric.value)).toBe(true);
    }
  });
  it('hides audit activity without settings permission', () => {
    expect(reportCatalog([]).some(report => report.id === 'audit-activity')).toBe(false);
    expect(reportCatalog(['settings']).some(report => report.id === 'audit-activity')).toBe(true);
  });
});

describe('executive report calculations', () => {
  it('matches observed monthly revenue and preserves target basis', () => {
    const result = runReport(options('monthly-performance',{ from: '2026-09', to: '2026-09', studio: 1 }));
    const actual = actualMetrics(1,'2026-09');
    expect(result.totalRows).toBe(1); expect(result.rows[0].revenue).toBeCloseTo(actual.revenue,5);
    expect(result.rows[0].transactions).toBe(actual.transactions); expect(['approved','proposed']).toContain(result.rows[0].target_basis);
  });
  it('does not convert missing future actuals to zero or zero-percent attainment', () => {
    const result = runReport(options('target-attainment',{ from: '2027-01', to: '2027-01', studio: 1 }));
    expect(result.rows[0].revenue).toBeNull(); expect(result.rows[0].attainment_percent).toBeNull();
    expect(result.summary.find(metric => metric.key === 'revenue')?.value).toBeNull();
    expect(result.summary.find(metric => metric.key === 'attainment')?.value).toBeNull();
  });
  it('reconciles annual studio totals to monthly rows', () => {
    const monthly = runReport(options('monthly-performance',{ from: '2026-01', to: '2026-09', studio: 1 }));
    const annual = runReport(options('annual-studio-performance',{ from: '2026-01', to: '2026-09', studio: 1 }));
    expect(annual.totalRows).toBe(1);
    expect(annual.rows[0].revenue).toBeCloseTo(monthly.rows.reduce((sum,row) => sum + (row.revenue || 0),0),5);
    expect(annual.rows[0].observed_months).toBe(monthly.rows.filter(row => row.revenue !== null).length);
  });
  it('calculates discount exposure using revenue plus discount', () => {
    const result = runReport(options('discount-exposure',{ from: '2026-09', to: '2026-09', studio: 1 }));
    const row = result.rows[0];
    expect(row.discount_percent).toBeCloseTo(row.discount / (row.revenue + row.discount) * 100,5);
    expect(result.summary.find(metric => metric.key === 'exposure')?.value).toBeCloseTo(row.discount_percent,5);
  });
  it('keeps target-scenario reports read-only and ordered', () => {
    const before = JSON.stringify(db.prepare('SELECT id,version,proposed_target,approved_target FROM monthly_targets ORDER BY id').all());
    const standard = runReport(options('target-scenarios',{ from: '2027-01', to: '2027-12', studio: 1, scenario: 'standard' }));
    const aggressive = runReport(options('target-scenarios',{ from: '2027-01', to: '2027-12', studio: 1, scenario: 'aggressive' }));
    expect(aggressive.summary[0].value).toBeGreaterThanOrEqual(standard.summary[0].value);
    for (const row of [...standard.rows,...aggressive.rows]) { expect(row.proposed_target).toBeGreaterThanOrEqual(2000000); expect(row.proposed_target).toBeLessThanOrEqual(6000000); }
    expect(JSON.stringify(db.prepare('SELECT id,version,proposed_target,approved_target FROM monthly_targets ORDER BY id').all())).toBe(before);
  });
});

describe('commercial, retention and operational reports', () => {
  it('reconciles renewal-due rows with the established renewal engine', () => {
    const advanced = runReport(options('renewal-due',{ from: '2026-11', to: '2026-11', studio: 3 }));
    const established = renewalReport('2026-11',3);
    expect(advanced.rows[0].due_packages).toBe(established.summary.duePackages);
    expect(advanced.rows[0].paid_due_value).toBeCloseTo(established.summary.paidDueValue,5);
    expect(advanced.rows[0].list_due_value).toBeCloseTo(established.summary.listDueValue,5);
  });
  it('keeps historical renewal revenue separate from due values', () => {
    const result = runReport(options('historical-renewal-revenue',{ from: '2026-09', to: '2026-09', studio: 3 }));
    const direct = db.prepare("SELECT COUNT(*) n,SUM(amount) revenue FROM transactions WHERE studio_id=3 AND month='2026-09' AND revenue_stream='renewal'").get() as any;
    expect(result.rows[0].transactions).toBe(direct.n); expect(result.rows[0].revenue).toBeCloseTo(direct.revenue,5);
    expect(result.definition.notes.join(' ')).toContain('not joined to the forward renewal-due cohort');
  });
  it('excludes current/future Checkins and calculates rates from bookings', () => {
    const result = runReport(options('attendance-cancellations',{ from: '2026-09', to: '2026-09', studio: 3 }));
    const direct = db.prepare(`SELECT COUNT(*) n,SUM(checked_in) attended,SUM(late_cancelled) cancelled FROM checkins
      WHERE studio_id=3 AND month='2026-09' AND session_at<strftime('%s','now','start of day')`).get() as any;
    expect(result.rows[0].bookings).toBe(direct.n); expect(result.rows[0].checkin_rate).toBeCloseTo(direct.attended / direct.n * 100,5);
    expect(result.rows[0].late_cancellation_rate).toBeCloseTo(direct.cancelled / direct.n * 100,5);
  });
  it('applies offer status and data-mode filters rather than ignoring them', () => {
    const result = runReport(options('offer-portfolio',{ from: '2027-01', to: '2027-12', status: 'draft', dataMode: 'scenario' }));
    expect(result.totalRows).toBeGreaterThan(0);
    for (const row of result.rows) { expect(row.status).toBe('draft'); expect(row.data_mode).toBe('scenario'); }
    expect(() => runReport(options('monthly-performance',{ status: 'draft' }))).toThrow(/does not support a status filter/);
  });
});

describe('report shaping and validation', () => {
  it('sorts, searches, projects columns and makes preview truncation explicit', () => {
    const full = runReport(options('product-performance',{ studio: 1, limit: 1000 }));
    const result = runReport(options('product-performance',{ studio: 1, search: 'Studio', columns: 'product,revenue', sort: 'revenue', direction: 'desc', limit: 2 }));
    expect(result.totalRows).toBeGreaterThan(2); expect(result.returnedRows).toBe(2); expect(result.truncated).toBe(true);
    expect(result.columns.map(column => column.key)).toEqual(['product','revenue']);
    expect(Object.keys(result.rows[0])).toEqual(['product','revenue']);
    expect(result.rows[0].revenue).toBeGreaterThanOrEqual(result.rows[1].revenue);
    for (const row of result.rows) expect(row.product).toContain('Studio');
    expect(result.summary[0].value).toBeGreaterThan(0); expect(full.totalRows).toBeGreaterThanOrEqual(result.totalRows);
  });
  it('uses all matching rows for summaries before table limits', () => {
    const full = runReport(options('product-performance',{ studio: 1, limit: 1000 }));
    const limited = runReport(options('product-performance',{ studio: 1, limit: 1 }));
    expect(limited.summary[0].value).toBeCloseTo(full.summary[0].value,5);
  });
  it('rejects export overflow instead of silently truncating', () => {
    expect(() => runReport(options('product-performance',{ limit: 1 }),true)).toThrow(/above the 10,000-row export limit|Narrow the filters/);
  });
  it('rejects invalid periods, columns, sort fields and studio scope', () => {
    expect(() => runReport(options('monthly-performance',{ from: '2026-13' }))).toThrow(/valid YYYY-MM/);
    expect(() => runReport(options('monthly-performance',{ from: '2026-12', to: '2026-01' }))).toThrow(/cannot be after/);
    expect(() => runReport(options('monthly-performance',{ columns: 'not_a_column' }))).toThrow(/Unknown report column/);
    expect(() => runReport(options('monthly-performance',{ sort: 'not_a_column' }))).toThrow(/Unknown report sort/);
    expect(() => runReport(options('import-provenance',{ studio: 1 }))).toThrow(/consolidated business report/);
    expect(() => runReport(options('monthly-performance',{ studio: 99999 }))).toThrow(/not found or inactive/);
  });
  it('returns only aggregate audit metadata', () => {
    const result = runReport(options('audit-activity',{ from: '2026-10', to: '2026-10', limit: 5 }));
    for (const row of result.rows) { expect(row.before).toBeUndefined(); expect(row.after).toBeUndefined(); expect(row.reason).toBeUndefined(); }
  });
});
