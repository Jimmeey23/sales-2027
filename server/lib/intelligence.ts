import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../db.js';
import { calculateFunnel } from './calculations.js';
import { studioScopeIds } from './studios.js';
import { planEconomics } from './planEconomics.js';
import { PLAYBOOKS_2027 } from '../../src/data/2027Playbooks.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const round = (n: number) => Math.round(n * 100) / 100;
const scalar = (sql: string, ...params: unknown[]) => (db.prepare(sql).get(...params) as any)?.value;
const monthKey = (year: number, month: number) => `${year}-${String(month).padStart(2, '0')}`;

let cachedBengaluruInsights: Record<string, string[]> | null = null;
function loadStudioEmpiricalInsights(): Record<string, string[]> {
  if (cachedBengaluruInsights) return cachedBengaluruInsights;
  cachedBengaluruInsights = {};
  try {
    const file = path.resolve(__dirname, '../data/bengaluru-plan-2027.json');
    if (fs.existsSync(file)) {
      const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
      for (const s of raw.studios || []) {
        if (s?.studio && Array.isArray(s.insights)) {
          cachedBengaluruInsights[String(s.studio)] = s.insights.map(String);
        }
      }
    }
  } catch {
    cachedBengaluruInsights = {};
  }
  return cachedBengaluruInsights;
}

function scopeClause(studioId: number, col = 'studio_id') {
  const ids = studioScopeIds(db, studioId);
  return {
    ids,
    clause: `${col} IN (${ids.map(() => '?').join(',')})`,
  };
}

export function dataCoverage() {
  const sales = db
    .prepare(
      'SELECT MIN(purchased_at) first, MAX(purchased_at) last, COUNT(*) rows, COUNT(DISTINCT studio_id) studios FROM transactions',
    )
    .get() as any;
  const leads = db.prepare('SELECT MIN(created_at) first, MAX(created_at) last, COUNT(*) rows FROM leads').get() as any;
  const trials = db
    .prepare('SELECT MIN(first_visit_at) first, MAX(first_visit_at) last, COUNT(*) rows FROM member_visits')
    .get() as any;
  const sessions = db
    .prepare('SELECT MIN(session_date) first, MAX(session_date) last, COUNT(*) rows FROM class_sessions')
    .get() as any;
  const payroll = db
    .prepare('SELECT MIN(month) first, MAX(month) last, COUNT(*) rows FROM trainer_performance')
    .get() as any;
  const checkins = db
    .prepare(
      `SELECT date(MIN(session_at),'unixepoch') first, date(MAX(session_at),'unixepoch') last, COUNT(*) rows,
    SUM(CASE WHEN session_at>=strftime('%s','now','start of day') THEN 1 ELSE 0 END) future_or_current_day_rows FROM checkins`,
    )
    .get() as any;
  return {
    sales,
    leads,
    trials,
    sessions,
    payroll,
    checkins,
    limitations: [
      'Sales revenue uses Payment Value (gross collected value); voided or unsuccessful rows are excluded and reported during import.',
      'New-client revenue means first observed service purchase inside the imported sales history, not guaranteed lifetime acquisition.',
      'Lead records are current-state snapshots. Lead-to-booking remains an explicit assumption; Checkins supplies an observed all-booking attendance rate, not a trial-specific booking rate.',
      'Checkins excludes current-day and future sessions from behavioural actuals. Unattended source rows are all labelled Not Attended, so their original trial/new status cannot be recovered.',
      'Late cancellation and other non-check-in are separate categories. Checkin Paid values are not imported or added to revenue.',
      'Campaign revenue attached to discount codes is observed attributed revenue, not proven incremental lift.',
      'October 2026 is partial through the latest imported transaction date; do not compare it directly with a complete month.',
    ],
  };
}

export function actualMetrics(studioId: number, month: string) {
  const scope = scopeClause(studioId);
  const revenue = db
    .prepare(
      `SELECT COUNT(*) transactions, COALESCE(SUM(amount),0) revenue, AVG(amount) aov,
    COALESCE(SUM(CASE WHEN revenue_stream='new_client' THEN amount ELSE 0 END),0) new_client,
    COALESCE(SUM(CASE WHEN revenue_stream='renewal' THEN amount ELSE 0 END),0) renewal,
    COALESCE(SUM(CASE WHEN revenue_stream='reactivation' THEN amount ELSE 0 END),0) reactivation,
    COALESCE(SUM(CASE WHEN revenue_stream='additional' THEN amount ELSE 0 END),0) additional,
    COALESCE(SUM(discount_amount),0) discount_cost,
    SUM(CASE WHEN is_first_observed=1 THEN 1 ELSE 0 END) first_purchases,
    AVG(CASE WHEN is_first_observed=1 THEN amount END) first_purchase_value,
    SUM(CASE WHEN discount_amount>0 THEN 1 ELSE 0 END) discounted_transactions
    FROM transactions WHERE ${scope.clause} AND month=?`,
    )
    .get(...scope.ids, month) as any;
  const leads = scalar(`SELECT COUNT(*) value FROM leads WHERE ${scope.clause} AND month=?`, ...scope.ids, month) || 0;
  const completedTrials =
    scalar(`SELECT COUNT(*) value FROM member_visits WHERE ${scope.clause} AND month=?`, ...scope.ids, month) || 0;
  const mature = new Date(`${month}-01T00:00:00Z`).getTime() + 90 * 86400000 < Date.now();
  let trialConversion: number | null = null;
  if (mature) {
    const cohort = db
      .prepare(
        `SELECT COUNT(*) total, SUM(CASE WHEN first_purchase_at IS NOT NULL AND julianday(first_purchase_at)-julianday(first_visit_at) BETWEEN 0 AND 90 THEN 1 ELSE 0 END) converted
      FROM member_visits WHERE ${scope.clause} AND month=?`,
      )
      .get(...scope.ids, month) as any;
    trialConversion = cohort.total > 0 ? (cohort.converted || 0) / cohort.total : null;
  }
  const attendance = db
    .prepare(
      `SELECT COUNT(*) bookings,COALESCE(SUM(checked_in),0) checkins,COALESCE(SUM(late_cancelled),0) late_cancellations,
    COALESCE(SUM(CASE WHEN checked_in=0 AND late_cancelled=0 THEN 1 ELSE 0 END),0) other_not_checked
    FROM checkins WHERE ${scope.clause} AND month=? AND session_at<strftime('%s','now','start of day')`,
    )
    .get(...scope.ids, month) as any;
  return {
    ...revenue,
    leads,
    completed_trials: completedTrials,
    trial_conversion: trialConversion,
    booking_count: attendance.bookings,
    checkin_count: attendance.checkins,
    late_cancellation_count: attendance.late_cancellations,
    other_not_checked_count: attendance.other_not_checked,
    checkin_rate: attendance.bookings ? attendance.checkins / attendance.bookings : null,
    late_cancellation_rate: attendance.bookings ? attendance.late_cancellations / attendance.bookings : null,
    lead_to_purchase: leads
      ? (scalar(
          `SELECT COUNT(*) value FROM leads WHERE ${scope.clause} AND month=? AND converted_at IS NOT NULL AND julianday(converted_at)-julianday(created_at) BETWEEN 0 AND 90`,
          ...scope.ids,
          month,
        ) || 0) / leads
      : null,
  };
}

export function observedFunnel(studioId: number) {
  const scope = scopeClause(studioId);
  const trial = db
    .prepare(
      `SELECT COUNT(*) total, SUM(CASE WHEN first_purchase_at IS NOT NULL AND julianday(first_purchase_at)-julianday(first_visit_at) BETWEEN 0 AND 90 THEN 1 ELSE 0 END) converted
    FROM member_visits WHERE ${scope.clause} AND first_visit_at<=date('now','-90 days')`,
    )
    .get(...scope.ids) as any;
  const lead = db
    .prepare(
      `SELECT COUNT(*) total, SUM(CASE WHEN converted_at IS NOT NULL AND julianday(converted_at)-julianday(created_at) BETWEEN 0 AND 90 THEN 1 ELSE 0 END) converted
    FROM leads WHERE ${scope.clause} AND created_at<=date('now','-90 days')`,
    )
    .get(...scope.ids) as any;
  const attendance = db
    .prepare(
      `SELECT COUNT(*) total,COALESCE(SUM(checked_in),0) attended,COALESCE(SUM(late_cancelled),0) late_cancelled
    FROM checkins WHERE ${scope.clause} AND session_at<strftime('%s','now','start of day')
      AND session_at>=strftime('%s','now','start of day','-12 months')`,
    )
    .get(...scope.ids) as any;
  return {
    trialToPurchaseRate: trial.total ? (trial.converted || 0) / trial.total : 0,
    bookingToAttendanceRate: attendance.total ? attendance.attended / attendance.total : 0.7,
    leadToBookingRate: 0.35,
    sources: {
      trialToPurchaseRate: trial.total ? 'historical' : 'missing',
      bookingToAttendanceRate: attendance.total ? 'checkins_historical_all_bookings' : 'manual_assumption',
      leadToBookingRate: 'manual_assumption',
    },
    sampleSizes: { trialCohort: trial.total || 0, leadCohort: lead.total || 0, bookingCohort: attendance.total || 0 },
    bookingRateScope: attendance.total
      ? 'Observed across all Checkins bookings in the trailing 12 months; not trial-specific.'
      : 'No Checkins history; fallback assumption.',
    lateCancellationRate: attendance.total ? attendance.late_cancelled / attendance.total : null,
    leadToPurchaseObserved: lead.total ? (lead.converted || 0) / lead.total : null,
  };
}

export function attendanceProfile(studioId: number, year: number) {
  const scope = scopeClause(studioId);
  const scopeB = scopeClause(studioId, 'b.studio_id');
  const firstMonth = `${year}-01`,
    lastMonth = `${year}-12`;
  const observed = `session_at<strftime('%s','now','start of day')`;
  const summary = db
    .prepare(
      `SELECT COUNT(*) bookings,COALESCE(SUM(checked_in),0) checkins,COALESCE(SUM(late_cancelled),0) late_cancellations,
    COALESCE(SUM(CASE WHEN checked_in=0 AND late_cancelled=0 THEN 1 ELSE 0 END),0) other_not_checked,
    COALESCE(SUM(complimentary),0) complimentary,
    COUNT(DISTINCT CASE WHEN checked_in=1 THEN member_ref END) active_members,
    COUNT(DISTINCT CASE WHEN checked_in=1 AND visit_type LIKE 'New -%' THEN member_ref END) new_attendees,
    COALESCE(SUM(CASE WHEN checked_in=1 AND visit_type LIKE 'New -%' THEN 1 ELSE 0 END),0) new_attendee_visits,
    AVG(CASE WHEN checked_in=1 AND order_at IS NOT NULL AND session_at>=order_at THEN (session_at-order_at)/3600.0 END) attended_lead_hours,
    AVG(CASE WHEN late_cancelled=1 AND order_at IS NOT NULL AND session_at>=order_at THEN (session_at-order_at)/3600.0 END) cancelled_lead_hours
    FROM checkins WHERE ${scope.clause} AND month BETWEEN ? AND ? AND ${observed}`,
    )
    .get(...scope.ids, firstMonth, lastMonth) as any;
  const monthly = (
    db
      .prepare(
        `SELECT month,COUNT(*) bookings,SUM(checked_in) checkins,SUM(late_cancelled) late_cancellations,
    SUM(CASE WHEN checked_in=0 AND late_cancelled=0 THEN 1 ELSE 0 END) other_not_checked,
    COUNT(DISTINCT CASE WHEN checked_in=1 THEN member_ref END) active_members,
    SUM(CASE WHEN checked_in=1 AND visit_type LIKE 'New -%' THEN 1 ELSE 0 END) new_attendee_visits
    FROM checkins WHERE ${scope.clause} AND month BETWEEN ? AND ? AND ${observed}
    GROUP BY month ORDER BY month`,
      )
      .all(...scope.ids, firstMonth, lastMonth) as any[]
  ).map(row => ({
    ...row,
    checkin_rate: row.bookings ? row.checkins / row.bookings : null,
    late_cancellation_rate: row.bookings ? row.late_cancellations / row.bookings : null,
    visits_per_member: row.active_members ? row.checkins / row.active_members : null,
    partial: row.month === new Date().toISOString().slice(0, 7),
  }));
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const weekdays = (
    db
      .prepare(
        `SELECT CAST(strftime('%w',session_at,'unixepoch') AS INTEGER) day_index,COUNT(*) bookings,
    SUM(checked_in) checkins,SUM(late_cancelled) late_cancellations
    FROM checkins WHERE ${scope.clause} AND month BETWEEN ? AND ? AND ${observed}
    GROUP BY day_index ORDER BY day_index`,
      )
      .all(...scope.ids, firstMonth, lastMonth) as any[]
  ).map(row => ({
    day: dayNames[row.day_index],
    bookings: row.bookings,
    checkins: row.checkins,
    late_cancellations: row.late_cancellations,
    checkin_rate: row.bookings ? row.checkins / row.bookings : null,
    late_cancellation_rate: row.bookings ? row.late_cancellations / row.bookings : null,
  }));
  const timeBands = (
    db
      .prepare(
        `SELECT CASE WHEN CAST(strftime('%H',session_at,'unixepoch') AS INTEGER)<10 THEN 'Before 10:00'
      WHEN CAST(strftime('%H',session_at,'unixepoch') AS INTEGER)<14 THEN '10:00–13:59'
      WHEN CAST(strftime('%H',session_at,'unixepoch') AS INTEGER)<17 THEN '14:00–16:59' ELSE '17:00 onwards' END band,
    MIN(CAST(strftime('%H',session_at,'unixepoch') AS INTEGER)) sort_hour,COUNT(*) bookings,SUM(checked_in) checkins,SUM(late_cancelled) late_cancellations
    FROM checkins WHERE ${scope.clause} AND month BETWEEN ? AND ? AND ${observed}
    GROUP BY band ORDER BY sort_hour`,
      )
      .all(...scope.ids, firstMonth, lastMonth) as any[]
  ).map(row => ({
    band: row.band,
    bookings: row.bookings,
    checkin_rate: row.bookings ? row.checkins / row.bookings : null,
    late_cancellation_rate: row.bookings ? row.late_cancellations / row.bookings : null,
  }));
  const classes = (
    db
      .prepare(
        `SELECT class_name,COUNT(*) bookings,SUM(checked_in) checkins,SUM(late_cancelled) late_cancellations
    FROM checkins WHERE ${scope.clause} AND month BETWEEN ? AND ? AND ${observed} AND class_name IS NOT NULL
    GROUP BY class_name HAVING COUNT(*)>=30 ORDER BY (1.0*SUM(late_cancelled)/COUNT(*)) DESC,bookings DESC LIMIT 8`,
      )
      .all(...scope.ids, firstMonth, lastMonth) as any[]
  ).map(row => ({
    ...row,
    checkin_rate: row.checkins / row.bookings,
    late_cancellation_rate: row.late_cancellations / row.bookings,
  }));
  const matureThrough = latestCompleteMonth();
  const retention = db
    .prepare(
      `WITH member_month AS (
      SELECT member_ref,month,COUNT(*) visits FROM checkins
      WHERE ${scope.clause} AND checked_in=1 AND month BETWEEN ? AND ? AND ${observed} GROUP BY member_ref,month
    ) SELECT COUNT(*) eligible_member_months,
      COALESCE(SUM(CASE WHEN EXISTS(SELECT 1 FROM checkins b WHERE b.member_ref=a.member_ref AND ${scopeB.clause} AND b.checked_in=1
        AND b.month=strftime('%Y-%m',date(a.month||'-01','+1 month')) AND b.${observed}) THEN 1 ELSE 0 END),0) returned,
      AVG(a.visits) average_visits
    FROM member_month a WHERE a.month<?`,
    )
    .get(...scope.ids, firstMonth, lastMonth, ...scopeB.ids, matureThrough) as any;
  const recent = (
    db
      .prepare(
        `SELECT month,COUNT(*) bookings,SUM(checked_in) checkins,SUM(late_cancelled) late_cancellations
    FROM checkins WHERE ${scope.clause} AND month<strftime('%Y-%m','now','start of month') GROUP BY month ORDER BY month DESC LIMIT 12`,
      )
      .all(...scope.ids) as any[]
  ).reverse();
  const recent6 = recent.slice(-6),
    previous6 = recent.slice(-12, -6);
  const sum = (rows: any[], key: string) => rows.reduce((total, row) => total + Number(row[key] || 0), 0);
  const recentAttended = sum(recent6, 'checkins'),
    previousAttended = sum(previous6, 'checkins');
  const rawTrend = previousAttended > 0 ? recentAttended / previousAttended - 1 : null;
  const mean = recent6.length ? recentAttended / recent6.length : 0;
  const variance = recent6.length
    ? recent6.reduce((total, row) => total + Math.pow(row.checkins - mean, 2), 0) / recent6.length
    : 0;
  const volatility = mean > 0 ? Math.sqrt(variance) / mean : null;
  const nextMonthRow = db
    .prepare(
      `SELECT strftime('%Y-%m','now','start of month','+1 month') next_month,
    strftime('%Y-%m','now','start of month','+1 month','-1 year') comparable_month`,
    )
    .get() as any;
  const comparableAttended = Number(
    scalar(
      `SELECT COALESCE(SUM(checked_in),0) value FROM checkins WHERE ${scope.clause} AND month=?`,
      ...scope.ids,
      nextMonthRow.comparable_month,
    ) || 0,
  );
  const appliedTrend = rawTrend === null ? 0 : Math.max(-0.15, Math.min(0.2, rawTrend));
  const baseline = comparableAttended > 0 ? comparableAttended * (1 + appliedTrend) : mean > 0 ? mean : null;
  const spread = Math.sqrt(variance);
  return {
    year,
    summary: {
      ...summary,
      checkin_rate: summary.bookings ? summary.checkins / summary.bookings : null,
      late_cancellation_rate: summary.bookings ? summary.late_cancellations / summary.bookings : null,
      visits_per_member: summary.active_members ? summary.checkins / summary.active_members : null,
      next_month_return_rate: retention.eligible_member_months
        ? retention.returned / retention.eligible_member_months
        : null,
      eligible_return_member_months: retention.eligible_member_months || 0,
    },
    monthly,
    weekdays,
    timeBands,
    classes,
    outlook: {
      recent6,
      raw_attendance_trend: rawTrend,
      applied_trend: rawTrend === null ? null : appliedTrend,
      attendance_volatility: volatility,
      next_month: nextMonthRow.next_month,
      comparable_month: nextMonthRow.comparable_month,
      comparable_attended: comparableAttended,
      baseline_attended: baseline === null ? null : Math.round(baseline),
      planning_low: baseline === null ? null : Math.max(0, Math.round(baseline - spread)),
      planning_high: baseline === null ? null : Math.round(baseline + spread),
      method:
        'Seasonal-naive operational outlook: comparable prior-year attendance adjusted by a capped six-month trend. Range is ± one recent six-month standard deviation, not a confidence interval or revenue forecast.',
    },
    provenance: {
      source: 'Day End Report - Part 4 / Checkins',
      observationCutoff: 'Current-day and future sessions excluded',
      privacy: 'Aggregated output; source names and email addresses are not persisted.',
      limitations: [
        'Booking attendance is observed across all visits, not specifically trial bookings.',
        'The source labels every unattended booking Not Attended, so trial-specific cancellation behaviour is unavailable.',
        'Next-month return means another observed check-in in the following complete calendar month; it is not membership renewal or churn.',
        'Booking lead time uses Order At to session time; it is not cancellation notice time.',
      ],
    },
  };
}

export function latestCompleteMonth() {
  const latest = String(scalar('SELECT MAX(purchased_at) value FROM transactions') || '2026-10-22').slice(0, 10);
  const [year, month] = latest.split('-').map(Number);
  const complete = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10) === latest;
  return complete ? latest.slice(0, 7) : new Date(Date.UTC(year, month - 2, 1)).toISOString().slice(0, 7);
}

function revenueFor(studioId: number, month: string) {
  const scope = scopeClause(studioId);
  return Number(
    scalar(
      `SELECT COALESCE(SUM(amount),0) value FROM transactions WHERE ${scope.clause} AND month=?`,
      ...scope.ids,
      month,
    ) || 0,
  );
}
function periodRevenue(studioId: number, start: string, end: string) {
  const scope = scopeClause(studioId);
  return Number(
    scalar(
      `SELECT COALESCE(SUM(amount),0) value FROM transactions WHERE ${scope.clause} AND month BETWEEN ? AND ?`,
      ...scope.ids,
      start,
      end,
    ) || 0,
  );
}

export type TargetScenario = 'nominal' | 'standard' | 'aggressive' | 'conservative' | 'base' | 'stretch';
export function recommendTarget(studioId: number, year: number, month: number, scenario: TargetScenario = 'standard') {
  const previous = monthKey(year - 1, month),
    prior = monthKey(year - 2, month);
  const latestComplete = latestCompleteMonth();
  const previousValue = revenueFor(studioId, previous),
    priorValue = revenueFor(studioId, prior);
  const previousComplete = previous <= latestComplete;
  const comparable = previousComplete && previousValue > 0 ? previousValue : priorValue;
  const comparableMonth = previousComplete && previousValue > 0 ? previous : prior;
  const trendEnd = latestComplete < `${year - 1}-12` ? latestComplete : `${year - 1}-12`;
  const trendYear = Number(trendEnd.slice(0, 4));
  const trendMonth = Number(trendEnd.slice(5, 7));
  const recent = periodRevenue(studioId, `${trendYear}-01`, trendEnd);
  const old = periodRevenue(studioId, `${trendYear - 1}-01`, `${trendYear - 1}-${String(trendMonth).padStart(2, '0')}`);
  const rawTrend = old > 0 ? recent / old - 1 : 0;
  const trend = Math.max(-0.15, Math.min(0.2, rawTrend));
  const conservative = Math.max(0, comparable * (1 + Math.min(0, trend)));
  const base = Math.max(0, comparable * (1 + trend));
  const lapsed = Number(
    scalar(
      `SELECT COUNT(DISTINCT member_ref) value FROM customer_packages WHERE studio_id=? AND status='Lapsed'`,
      studioId,
    ) || 0,
  );
  const avgSpend = Number(
    scalar(
      `SELECT AVG(amount) value FROM transactions WHERE studio_id=? AND revenue_stream!='new_client' AND amount>0`,
      studioId,
    ) || 0,
  );
  const reactivationUplift = Math.min(base * 0.05, lapsed * avgSpend * 0.02);
  const stretch = Math.max(base, previousValue, priorValue) + reactivationUplift;
  const aggressive = base > 0 ? Math.max(stretch, base * 1.1) : 0;
  const scenarioTarget =
    scenario === 'nominal'
      ? comparable
      : scenario === 'conservative'
        ? conservative
        : scenario === 'stretch'
          ? stretch
          : scenario === 'aggressive'
            ? aggressive
            : base;
  const studioName = String(scalar('SELECT name value FROM studios WHERE id=?', studioId) || '');
  const rentAdjustment =
    studioName === 'Kemps Corner' && year === 2027
      ? {
          effectiveMonth: '2027-01',
          minimumTarget: 2000000,
          maximumTarget: 6000000,
          averageTarget: 3500000,
          preAdjustmentTarget: round(scenarioTarget),
          source: 'user_directed_planning_assumption',
          reason:
            'Kwality House rent increases from January 2027. User-directed guardrail: monthly targets average about ₹35L and may range from ₹20L to ₹60L, keeping seasonality. Baselines remain unadjusted.',
        }
      : null;
  const target = rentAdjustment
    ? Math.min(
        rentAdjustment.maximumTarget,
        Math.max(rentAdjustment.minimumTarget, Math.ceil(scenarioTarget / 100000) * 100000),
      )
    : scenarioTarget;
  const mix = actualMetrics(studioId, comparableMonth);
  const totalMix = mix.new_client + mix.renewal + mix.reactivation + mix.additional;
  const shares =
    totalMix > 0
      ? {
          new_client: mix.new_client / totalMix,
          renewal: mix.renewal / totalMix,
          reactivation: mix.reactivation / totalMix,
          additional: mix.additional / totalMix,
        }
      : { new_client: 0.4, renewal: 0.25, reactivation: 0.1, additional: 0.25 };
  const aov =
    mix.aov ||
    Number(scalar('SELECT AVG(amount) value FROM transactions WHERE studio_id=? AND amount>0', studioId) || 0);
  const firstPurchase =
    mix.first_purchase_value ||
    Number(
      scalar(
        'SELECT AVG(amount) value FROM transactions WHERE studio_id=? AND is_first_observed=1 AND amount>0',
        studioId,
      ) || aov,
    );
  const rates = observedFunnel(studioId);
  const funnel = calculateFunnel({
    revenueTarget: target,
    revenueAchieved: 0,
    existingClientRevenue: target * shares.additional,
    renewalRevenue: target * shares.renewal,
    reactivationRevenue: target * shares.reactivation,
    averageFirstPurchase: firstPurchase,
    trialToPurchaseRate: rates.trialToPurchaseRate,
    bookingToAttendanceRate: rates.bookingToAttendanceRate,
    leadToBookingRate: rates.leadToBookingRate,
  });
  const capacity = Number(scalar('SELECT monthly_capacity value FROM studios WHERE id=?', studioId) || 0);
  if (capacity && funnel.requiredCompletedTrials !== null && funnel.requiredCompletedTrials > capacity)
    funnel.warnings.push(
      `Required completed trials exceed observed monthly class capacity (${Math.round(capacity)}); target requires a capacity review.`,
    );
  return {
    studio_id: studioId,
    year,
    month,
    scenario,
    historical_revenue: round(comparable),
    baseline_forecast: round(base),
    proposed_target: round(target),
    target_growth: comparable > 0 ? round((target / comparable - 1) * 100) : null,
    new_client_target: round(target * shares.new_client),
    renewal_target: round(target * shares.renewal),
    repeat_target: round(target * shares.additional),
    reactivation_target: round(target * shares.reactivation),
    other_target: 0,
    target_transactions: aov > 0 ? Math.ceil(target / aov) : null,
    expected_aov: round(aov),
    funnel: JSON.stringify(funnel),
    assumptions: JSON.stringify({
      comparableMonth,
      previousComplete,
      rawObservedTrend: rawTrend,
      appliedTrend: trend,
      scenario,
      scenarioExplanation:
        scenario === 'nominal'
          ? 'Comparable-month revenue with no growth or decline adjustment.'
          : scenario === 'conservative'
            ? 'Comparable-month revenue with no positive growth uplift; observed decline is retained.'
            : scenario === 'stretch'
              ? 'Best observed comparable month plus a capped reactivation scenario (2% response, maximum 5% revenue uplift).'
              : scenario === 'aggressive'
                ? 'The higher of the legacy stretch case or standard target plus a 10% planning premium; this is an ambitious scenario, not an observed forecast.'
                : 'Comparable-month revenue adjusted by capped observed year-to-date trend.',
      aggressivePlanningPremium: scenario === 'aggressive' ? 0.1 : null,
      reactivationAudience: lapsed,
      averageRepeatSpend: avgSpend,
      reactivationResponseAssumption: 0.02,
      averageFirstPurchase: firstPurchase,
      conversionRates: {
        trialToPurchaseRate: rates.trialToPurchaseRate,
        bookingToAttendanceRate: rates.bookingToAttendanceRate,
        leadToBookingRate: rates.leadToBookingRate,
      },
      conversionSources: rates.sources,
      conversionSampleSizes: rates.sampleSizes,
      attendanceContext: {
        scope: rates.bookingRateScope,
        lateCancellationRate: rates.lateCancellationRate,
        source: 'Day End Report - Part 4 / Checkins',
      },
      rentAdjustment,
      streamMixSource: comparableMonth,
      limitations: comparable ? [] : ['No comparable imported revenue; target cannot be recommended reliably.'],
    }),
    source: 'recommendation',
    data_mode: 'derived',
    version: 1,
  };
}

export function generateYearTargets(
  year: number,
  userId?: number,
  overwrite = false,
  scenario?: TargetScenario,
  studioId?: number,
) {
  const studios = db
    .prepare(`SELECT id FROM studios WHERE active=1 ${studioId ? 'AND id=?' : ''} ORDER BY id`)
    .all(...(studioId ? [studioId] : [])) as any[];
  const insert =
    db.prepare(`INSERT INTO monthly_targets(studio_id,year,month,scenario,historical_revenue,baseline_forecast,proposed_target,target_growth,
    new_client_target,renewal_target,repeat_target,reactivation_target,other_target,target_transactions,expected_aov,funnel,assumptions,source,data_mode,version,updated_by)
    VALUES (@studio_id,@year,@month,@scenario,@historical_revenue,@baseline_forecast,@proposed_target,@target_growth,@new_client_target,@renewal_target,@repeat_target,
    @reactivation_target,@other_target,@target_transactions,@expected_aov,@funnel,@assumptions,@source,@data_mode,@version,@updated_by)
    ON CONFLICT(studio_id,year,month) DO UPDATE SET scenario=excluded.scenario,historical_revenue=excluded.historical_revenue,baseline_forecast=excluded.baseline_forecast,
    proposed_target=excluded.proposed_target,target_growth=excluded.target_growth,new_client_target=excluded.new_client_target,renewal_target=excluded.renewal_target,
    repeat_target=excluded.repeat_target,reactivation_target=excluded.reactivation_target,other_target=excluded.other_target,target_transactions=excluded.target_transactions,
    expected_aov=excluded.expected_aov,funnel=excluded.funnel,assumptions=excluded.assumptions,version=monthly_targets.version+1,updated_by=excluded.updated_by,updated_at=CURRENT_TIMESTAMP`);
  const versionInsert = db.prepare(
    'INSERT INTO target_versions(target_id,version,snapshot,change_reason,changed_by) VALUES (?,?,?,?,?)',
  );
  const transaction = db.transaction(() => {
    for (const studio of studios)
      for (let month = 1; month <= 12; month++) {
        const existing = db
          .prepare('SELECT id,version,approved_target FROM monthly_targets WHERE studio_id=? AND year=? AND month=?')
          .get(studio.id, year, month) as any;
        if (existing && !overwrite) continue;
        const rec = recommendTarget(
          studio.id,
          year,
          month,
          scenario ||
            (existing
              ? (db.prepare('SELECT scenario FROM monthly_targets WHERE id=?').get(existing.id) as any)
              : { scenario: 'standard' }
            ).scenario ||
            'standard',
        );
        insert.run({ ...rec, updated_by: userId || null });
        const saved = db
          .prepare('SELECT * FROM monthly_targets WHERE studio_id=? AND year=? AND month=?')
          .get(studio.id, year, month) as any;
        versionInsert.run(
          saved.id,
          saved.version,
          JSON.stringify(saved),
          existing
            ? 'Regenerated recommendation; approved target preserved.'
            : 'Initial evidence-based recommendation.',
          userId || null,
        );
      }
  });
  transaction();
}

export function dashboard(year: number, month: number | null, studioId?: number) {
  const studios = db
    .prepare(`SELECT * FROM studios WHERE active=1 ${studioId ? 'AND id=?' : ''} ORDER BY city,name`)
    .all(...(studioId ? [studioId] : [])) as any[];
  const selectedMonth =
    month ||
    Number(
      String(scalar('SELECT MAX(month) value FROM transactions WHERE month LIKE ?', `${year}-%`) || `${year}-01`).slice(
        5,
        7,
      ),
    );
  const selectedKey = monthKey(year, selectedMonth);
  const rows = studios.map(studio => {
    const actual = actualMetrics(studio.id, selectedKey);
    const target = db
      .prepare('SELECT * FROM monthly_targets WHERE studio_id=? AND year=? AND month=?')
      .get(studio.id, year, selectedMonth) as any;
    const priorRevenue = revenueFor(studio.id, monthKey(year - 1, selectedMonth));
    const targetValue = target?.approved_target ?? target?.proposed_target ?? null;
    const achievement = targetValue && targetValue > 0 ? (actual.revenue / targetValue) * 100 : null;
    const status =
      achievement === null
        ? 'unplanned'
        : achievement >= 95
          ? 'on_track'
          : achievement >= 80
            ? 'at_risk'
            : 'below_target';
    let action = 'Maintain current plan and monitor revenue quality.';
    if (status === 'below_target') action = 'Review the revenue gap and build a segmented recovery plan.';
    if (actual.trial_conversion !== null && actual.trial_conversion < 0.2 && actual.completed_trials >= 10)
      action = 'Prioritise trial follow-up before increasing lead spend.';
    if (
      actual.discount_cost > 0 &&
      actual.revenue > 0 &&
      actual.discount_cost / (actual.revenue + actual.discount_cost) > 0.12
    )
      action = 'Audit discount exposure and test a value-added alternative.';
    if (actual.booking_count >= 100 && actual.late_cancellation_rate > 0.15)
      action = 'Review class, day and time-band cancellation patterns before adding capacity.';
    return {
      studio,
      actual,
      target,
      target_value: targetValue,
      prior_revenue: priorRevenue,
      target_basis:
        target?.approved_target !== null && target?.approved_target !== undefined
          ? 'approved'
          : target
            ? 'proposed'
            : 'missing',
      achievement,
      yoy: priorRevenue > 0 ? (actual.revenue / priorRevenue - 1) * 100 : null,
      status,
      revenue_gap: targetValue ? Math.max(0, targetValue - actual.revenue) : null,
      recommended_action: action,
    };
  });
  const scope = studioId ? scopeClause(studioId) : null;
  const targetStudioWhere = studioId ? 'AND studio_id=?' : "AND COALESCE(source,'')!='rollup'";
  const targetStudioArgs = studioId ? [studioId] : [];
  const annualTargetRow = db
    .prepare(
      `SELECT COALESCE(SUM(COALESCE(approved_target,proposed_target)),0) target,
    COALESCE(SUM(approved_target),0) approved, COUNT(*) months,
    SUM(CASE WHEN approved_target IS NOT NULL THEN 1 ELSE 0 END) approved_months
    FROM monthly_targets WHERE year=? ${targetStudioWhere}`,
    )
    .get(year, ...targetStudioArgs) as any;
  const ytd = db
    .prepare(
      `SELECT COALESCE(SUM(amount),0) revenue,
    COALESCE(SUM(CASE WHEN revenue_stream='new_client' THEN amount ELSE 0 END),0) new_client,
    COALESCE(SUM(CASE WHEN revenue_stream='renewal' THEN amount ELSE 0 END),0) renewal,
    COALESCE(SUM(CASE WHEN revenue_stream='reactivation' THEN amount ELSE 0 END),0) reactivation,
    COALESCE(SUM(CASE WHEN revenue_stream='additional' THEN amount ELSE 0 END),0) additional,
    AVG(amount) aov, AVG(CASE WHEN is_first_observed=1 THEN amount END) first_aov, COUNT(*) transactions
    FROM transactions WHERE month LIKE ? ${scope ? `AND ${scope.clause}` : ''}`,
    )
    .get(`${year}-%`, ...(scope ? scope.ids : [])) as any;
  const totalLeads = Number(
    scalar(
      `SELECT COUNT(*) value FROM leads WHERE month LIKE ? ${scope ? `AND ${scope.clause}` : ''}`,
      `${year}-%`,
      ...(scope ? scope.ids : []),
    ) || 0,
  );
  const totalTrials = Number(
    scalar(
      `SELECT COUNT(*) value FROM member_visits WHERE month LIKE ? ${scope ? `AND ${scope.clause}` : ''}`,
      `${year}-%`,
      ...(scope ? scope.ids : []),
    ) || 0,
  );
  const latestActualMonth = Number(
    String(
      scalar(
        `SELECT MAX(month) value FROM transactions WHERE month LIKE ? ${scope ? `AND ${scope.clause}` : ''}`,
        `${year}-%`,
        ...(scope ? scope.ids : []),
      ) || `${year}-00`,
    ).slice(5, 7),
  );
  const futureForecast = Number(
    scalar(
      `SELECT COALESCE(SUM(baseline_forecast),0) value FROM monthly_targets WHERE year=? AND month>? ${targetStudioWhere}`,
      year,
      latestActualMonth,
      ...targetStudioArgs,
    ) || 0,
  );
  const annualTarget = annualTargetRow.target || 0;
  const forecast = (ytd.revenue || 0) + futureForecast;
  const offerScope = studioId ? scopeClause(studioId, 'o.studio_id') : null;
  const topOffers = db
    .prepare(
      `SELECT o.id,o.name,o.actual_revenue,o.actual_redemptions,o.effective_discount,s.name studio FROM offers o LEFT JOIN studios s ON s.id=o.studio_id
    WHERE o.actual_revenue IS NOT NULL ${offerScope ? `AND ${offerScope.clause}` : ''} ORDER BY o.actual_revenue DESC LIMIT 5`,
    )
    .all(...(offerScope ? offerScope.ids : []));
  const poorOffers = db
    .prepare(
      `SELECT o.id,o.name,o.actual_revenue,o.actual_redemptions,o.effective_discount,s.name studio FROM offers o LEFT JOIN studios s ON s.id=o.studio_id
    WHERE o.actual_redemptions>=5 AND o.effective_discount>15 ${offerScope ? `AND ${offerScope.clause}` : ''} ORDER BY o.effective_discount DESC LIMIT 5`,
    )
    .all(...(offerScope ? offerScope.ids : []));
  const trend = Array.from({ length: 12 }, (_, i) => {
    const key = monthKey(year, i + 1);
    const revenue = studioId
      ? revenueFor(studioId, key)
      : Number(scalar('SELECT COALESCE(SUM(amount),0) value FROM transactions WHERE month=?', key) || 0);
    const target = Number(
      scalar(
        `SELECT COALESCE(SUM(COALESCE(approved_target,proposed_target)),0) value FROM monthly_targets WHERE year=? AND month=? ${targetStudioWhere}`,
        year,
        i + 1,
        ...targetStudioArgs,
      ) || 0,
    );
    return { month: i + 1, key, revenue, target };
  });
  const actions = buildActions(rows, selectedKey);
  const nonRollupStudioCount = studioId ? 1 : studios.filter(s => s.name !== 'Pop-up').length || studios.length;
  return {
    rows,
    actions,
    trend,
    topOffers,
    poorOffers,
    kpis: {
      annualTarget,
      approvedAnnualTarget: annualTargetRow.approved || 0,
      approvedMonths: annualTargetRow.approved_months || 0,
      totalTargetMonths: nonRollupStudioCount * 12,
      targetBasis: annualTargetRow.approved_months > 0 ? 'mixed/approved' : 'proposed',
      achieved: ytd.revenue || 0,
      remaining: Math.max(0, annualTarget - (ytd.revenue || 0)),
      achievement: annualTarget ? ((ytd.revenue || 0) / annualTarget) * 100 : null,
      forecast,
      forecastGap: annualTarget - forecast,
      onTrack: rows.filter(r => r.status === 'on_track').length,
      atRisk: rows.filter(r => r.status === 'at_risk').length,
      belowTarget: rows.filter(r => r.status === 'below_target').length,
      newClient: ytd.new_client || 0,
      renewal: ytd.renewal || 0,
      reactivation: ytd.reactivation || 0,
      additional: ytd.additional || 0,
      aov: ytd.aov,
      firstAov: ytd.first_aov,
      leads: totalLeads,
      trials: totalTrials,
      trialBookings: null,
      trialConversion: weightedConversion(studioId, year),
      leadConversion: totalLeads
        ? Number(
            scalar(
              `SELECT COUNT(*) value FROM leads WHERE month LIKE ? AND converted_at IS NOT NULL AND julianday(converted_at)-julianday(created_at) BETWEEN 0 AND 90 ${scope ? `AND ${scope.clause}` : ''}`,
              `${year}-%`,
              ...(scope ? scope.ids : []),
            ) || 0,
          ) / totalLeads
        : null,
      activeOffers: Number(
        scalar(
          `SELECT COUNT(*) value FROM offers WHERE status='active' ${studioId ? 'AND (studio_id=? OR studio_id IS NULL)' : ''}`,
          ...(studioId ? [studioId] : []),
        ) || 0,
      ),
      runningCampaigns: Number(
        scalar(
          `SELECT COUNT(*) value FROM campaigns WHERE status='active' AND date('now') BETWEEN start_date AND end_date ${studioId ? 'AND studio_id=?' : ''}`,
          ...(studioId ? [studioId] : []),
        ) || 0,
      ),
    },
    selectedMonth,
    coverage: dataCoverage(),
  };
}

function weightedConversion(studioId: number | undefined, year: number) {
  const scope = studioId ? scopeClause(studioId) : null;
  const row = db
    .prepare(
      `SELECT COUNT(*) total, SUM(CASE WHEN first_purchase_at IS NOT NULL AND julianday(first_purchase_at)-julianday(first_visit_at) BETWEEN 0 AND 90 THEN 1 ELSE 0 END) converted
    FROM member_visits WHERE first_visit_at>=? AND first_visit_at<? AND first_visit_at<=date('now','-90 days') ${scope ? `AND ${scope.clause}` : ''}`,
    )
    .get(`${year}-01-01`, `${year + 1}-01-01`, ...(scope ? scope.ids : [])) as any;
  return row.total ? (row.converted || 0) / row.total : null;
}

function buildActions(rows: any[], period: string) {
  const actions: any[] = [];
  for (const row of rows) {
    const a = row.actual,
      name = row.studio.name;
    if (row.revenue_gap > 0 && row.status === 'below_target')
      actions.push({
        priority: 'high',
        type: 'revenue_gap',
        studio_id: row.studio.id,
        studio: name,
        period,
        title: `${name} has a ₹${Math.round(row.revenue_gap).toLocaleString('en-IN')} monthly revenue gap`,
        evidence: `Observed revenue is ₹${Math.round(a.revenue).toLocaleString('en-IN')} against a ${row.target_basis} target of ₹${Math.round(row.target_value).toLocaleString('en-IN')}.`,
        impact: 'The month is currently below 80% of the selected target.',
        action:
          'Open Goal-Based Offer Builder and split recovery across renewals, reactivation and new-client conversion.',
        expected_contribution: row.revenue_gap,
      });
    if (a.trial_conversion !== null && a.trial_conversion < 0.2 && a.completed_trials >= 10)
      actions.push({
        priority: 'high',
        type: 'trial_conversion',
        studio_id: row.studio.id,
        studio: name,
        period,
        title: `${name} trial conversion is below 20%`,
        evidence: `${a.completed_trials} observed first visits; matured 90-day cohort conversion is ${(a.trial_conversion * 100).toFixed(1)}%.`,
        impact: 'More lead volume alone is unlikely to fix the conversion bottleneck.',
        action: 'Audit 48-hour trial follow-up and use a low-discount trial conversion offer.',
        expected_contribution: null,
      });
    if (a.revenue > 0 && a.discount_cost / (a.revenue + a.discount_cost) > 0.12)
      actions.push({
        priority: 'medium',
        type: 'discount',
        studio_id: row.studio.id,
        studio: name,
        period,
        title: `${name} has elevated discount exposure`,
        evidence: `Imported discounts equal ${((a.discount_cost / (a.revenue + a.discount_cost)) * 100).toFixed(1)}% of gross value before discount.`,
        impact: 'Revenue quality may be weakening even when transaction volume holds.',
        action: 'Compare a bonus-class or validity-extension scenario before increasing percentage discounts.',
        expected_contribution: a.discount_cost,
      });
    if (a.booking_count >= 100 && a.late_cancellation_rate > 0.15)
      actions.push({
        priority: 'medium',
        type: 'late_cancellation',
        studio_id: row.studio.id,
        studio: name,
        period,
        title: `${name} has elevated late cancellations`,
        evidence: `${a.late_cancellation_count} of ${a.booking_count} observed bookings were late cancellations (${(a.late_cancellation_rate * 100).toFixed(1)}%).`,
        impact:
          'Late-cancelled capacity may be harder to reuse; this is an operational signal, not a revenue attribution.',
        action:
          'Review Attendance & Cancellations by class, day and time band before changing the schedule or adding capacity.',
        expected_contribution: null,
      });
  }
  const order = { high: 0, medium: 1, low: 2 };
  return actions
    .sort((a, b) => order[a.priority as keyof typeof order] - order[b.priority as keyof typeof order])
    .slice(0, 12);
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
function historicFindings(
  studioId: number,
  year: number,
  monthly: any[],
  products: any[],
  sources: any[],
  offers: any[],
  attendance: any,
) {
  const through = latestCompleteMonth();
  const comparisons = monthly
    .filter(row => monthKey(year, row.month) <= through)
    .map(row => ({
      month: row.month,
      revenue: row.revenue,
      prior_revenue: row.prior_revenue,
      yoy_percent: row.prior_revenue > 0 ? (row.revenue / row.prior_revenue - 1) * 100 : null,
      transactions: row.transactions,
      discount_cost: row.discount_cost,
      checkin_rate: row.checkin_rate,
      late_cancellation_rate: row.late_cancellation_rate,
    }));
  const findings: any[] = [];
  const strongest = comparisons.filter(row => row.revenue > 0).sort((a, b) => b.revenue - a.revenue)[0];
  if (strongest)
    findings.push({
      type: 'revenue',
      title: 'Strongest complete month',
      finding: `${MONTH_NAMES[strongest.month - 1]} generated ₹${Math.round(strongest.revenue).toLocaleString('en-IN')} across ${strongest.transactions} transactions.`,
      evidence: {
        month: monthKey(year, strongest.month),
        revenue: strongest.revenue,
        transactions: strongest.transactions,
      },
      action: 'Compare its product mix and lead context with weaker complete months before copying a campaign.',
    });
  const movements = comparisons.filter(row => row.prior_revenue > 0);
  const growth = [...movements].sort((a, b) => Number(b.yoy_percent) - Number(a.yoy_percent))[0],
    decline = [...movements].sort((a, b) => Number(a.yoy_percent) - Number(b.yoy_percent))[0];
  if (growth)
    findings.push({
      type: 'yoy',
      title: 'Largest complete-month YoY increase',
      finding: `${MONTH_NAMES[growth.month - 1]} was ${Number(growth.yoy_percent).toFixed(1)}% above the prior-year month.`,
      evidence: growth,
      action: 'Treat this as descriptive change, not proof that a promotion caused the increase.',
    });
  if (decline && Number(decline.yoy_percent) < 0)
    findings.push({
      type: 'yoy',
      title: 'Largest complete-month YoY decline',
      finding: `${MONTH_NAMES[decline.month - 1]} was ${Math.abs(Number(decline.yoy_percent)).toFixed(1)}% below the prior-year month.`,
      evidence: decline,
      action: 'Review acquisition, renewal and attendance contributions separately before increasing discount.',
    });
  const completeRevenue = comparisons.reduce((sum, row) => sum + row.revenue, 0);
  const scope = scopeClause(studioId);
  const completeProducts = db
    .prepare(
      `SELECT product_name name,category,COUNT(*) transactions,SUM(amount) revenue,SUM(discount_amount) discount FROM transactions
    WHERE ${scope.clause} AND month LIKE ? AND month<=? GROUP BY product_name,category ORDER BY revenue DESC LIMIT 5`,
    )
    .all(...scope.ids, `${year}-%`, through) as any[];
  if (completeProducts[0] && completeRevenue > 0)
    findings.push({
      type: 'product',
      title: 'Product concentration',
      finding: `${completeProducts[0].name} contributed ${((completeProducts[0].revenue / completeRevenue) * 100).toFixed(1)}% of complete-period revenue.`,
      evidence: { ...completeProducts[0], periodRevenue: completeRevenue },
      action: 'Protect the strongest product journey while testing whether concentration creates capacity or mix risk.',
    });
  const discount = comparisons.reduce((sum, row) => sum + row.discount_cost, 0);
  if (completeRevenue + discount > 0)
    findings.push({
      type: 'revenue_quality',
      title: 'Complete-period discount exposure',
      finding: `Recorded discounts equal ${((discount / (completeRevenue + discount)) * 100).toFixed(1)}% of net revenue plus discounts.`,
      evidence: { revenue: completeRevenue, discount_cost: discount },
      action: 'Compare revenue quality and subsequent purchases, not redemption volume alone.',
    });
  const eligibleSources = sources
    .filter(source => source.leads >= 20)
    .sort((a, b) => (b.conversions || 0) / b.leads - (a.conversions || 0) / a.leads);
  if (eligibleSources[0]) {
    const source = eligibleSources[0];
    findings.push({
      type: 'acquisition',
      title: 'Highest observed source conversion · minimum 20 leads',
      finding: `${source.source} shows ${source.conversions || 0} conversions from ${source.leads} imported leads.`,
      evidence: source,
      action: 'Lead status is a current snapshot; validate attribution and cohort maturity before shifting spend.',
    });
  }
  const cancellationBand = attendance.timeBands
    ?.filter((band: any) => band.bookings >= 30)
    .sort((a: any, b: any) => b.late_cancellation_rate - a.late_cancellation_rate)[0];
  if (cancellationBand)
    findings.push({
      type: 'attendance',
      title: 'Time-band cancellation review',
      finding: `${cancellationBand.band} has the highest late-cancellation rate among bands with at least 30 bookings (${(cancellationBand.late_cancellation_rate * 100).toFixed(1)}%).`,
      evidence: cancellationBand,
      action: 'Review scheduling and reminder operations; do not label other non-check-ins as late cancellations.',
    });
  const observedOffer = offers.find(offer => offer.actual_revenue > 0);
  if (observedOffer)
    findings.push({
      type: 'offer',
      title: 'Largest attributed historical promotion in profile',
      finding: `${observedOffer.name} has ₹${Math.round(observedOffer.actual_revenue).toLocaleString('en-IN')} in attributed revenue.`,
      evidence: observedOffer,
      action: 'Attributed revenue is not incremental lift; use a controlled newcomer experiment for causal questions.',
    });

  // Curated empirical commercial intelligence from studio playbooks & audited workbooks
  const studioName = String(scalar('SELECT name value FROM studios WHERE id=?', studioId) || '');
  const playbookKey = studioName === 'Copper + Cloves' || studioName === 'Plash Pilates' ? 'Pop-up' : studioName;
  const playbook = PLAYBOOKS_2027[playbookKey];
  if (playbook?.insight) {
    findings.push({
      type: 'commercial_playbook',
      title: 'Commercial cohort structure & pricing insight',
      finding: playbook.insight,
      evidence: {
        studio: studioName,
        ttmGrowth: playbook.ttmGrowth,
      },
      action: playbook.priority,
    });
  }
  const empiricalNotes = loadStudioEmpiricalInsights()[playbookKey] || [];
  for (const [idx, note] of empiricalNotes.slice(0, 3).entries()) {
    findings.push({
      type: 'workbook_evidence',
      title: `Historical cohort & pricing audit · #${idx + 1}`,
      finding: note,
      evidence: { studio: studioName, source: 'Audited 2025–2026 Sales & Cohort Workbook' },
      action: 'Incorporate into 2027 monthly offer design and front-desk renewal scripts.',
    });
  }

  return {
    through,
    comparisons,
    completeProducts,
    findings,
    excludedPartialOrFutureMonths: 12 - comparisons.length,
    methodology:
      'Only months at or before the latest complete business sales month are used for historic findings. Current-state lead conversion, attributed promotion revenue and operational attendance remain different evidence types.',
  };
}

function buildPlanBridge2027(studioId: number, studioName: string) {
  const scope = scopeClause(studioId);
  const through = latestCompleteMonth();
  const playbookKey = studioName === 'Copper + Cloves' || studioName === 'Plash Pilates' ? 'Pop-up' : studioName;
  const playbook = PLAYBOOKS_2027[playbookKey] || null;
  const econ = planEconomics(studioId, 2027);

  const actual2026Rows = Array.from({ length: 12 }, (_, idx) => {
    const m = idx + 1;
    const key = monthKey(2026, m);
    const rev = revenueFor(studioId, key);
    const prior2025 = revenueFor(studioId, monthKey(2025, m));
    return {
      month: m,
      key,
      revenue: rev,
      prior2025,
      complete: key <= through && rev > 0,
      partial: key > through && rev > 0,
    };
  });

  const completeRows = actual2026Rows.filter(r => r.complete);
  const observedComplete2026 = completeRows.reduce((s, r) => s + r.revenue, 0);
  const observedYtd2026 = actual2026Rows.reduce((s, r) => s + r.revenue, 0);
  const completeMonthlyAvg = completeRows.length ? observedComplete2026 / completeRows.length : 0;
  // Estimate Nov–Dec (and full-month Oct) from 2025 Q4 scaled by complete-period YoY or complete monthly average
  const priorComplete2025 = completeRows.reduce((s, r) => s + r.prior2025, 0);
  const yoyRatio = priorComplete2025 > 0 ? observedComplete2026 / priorComplete2025 : 1;
  const projectedRemaining2026 = [10, 11, 12].reduce((sum, m) => {
    const row = actual2026Rows[m - 1];
    if (row.complete) return sum;
    const prior = row.prior2025;
    const est = prior > 0 ? prior * yoyRatio : completeMonthlyAvg;
    return sum + Math.max(row.revenue, est);
  }, 0);
  const annualized2026 = Math.round(observedComplete2026 + projectedRemaining2026);

  const targetRows = db
    .prepare('SELECT * FROM monthly_targets WHERE studio_id=? AND year=2027 ORDER BY month')
    .all(studioId) as any[];
  const targetByMonth = new Map<number, any>(targetRows.map(r => [Number(r.month), r]));

  const streamActuals2026 = db
    .prepare(
      `SELECT
        COALESCE(SUM(amount),0) net_revenue,
        COALESCE(SUM(discount_amount),0) discount_cost,
        COUNT(*) transactions,
        COALESCE(SUM(CASE WHEN discount_amount>0 THEN 1 ELSE 0 END),0) discounted_tx,
        COALESCE(SUM(CASE WHEN revenue_stream='new_client' THEN amount ELSE 0 END),0) new_client,
        COALESCE(SUM(CASE WHEN revenue_stream='renewal' THEN amount ELSE 0 END),0) renewal,
        COALESCE(SUM(CASE WHEN revenue_stream='reactivation' THEN amount ELSE 0 END),0) reactivation,
        COALESCE(SUM(CASE WHEN revenue_stream='additional' THEN amount ELSE 0 END),0) additional
      FROM transactions WHERE ${scope.clause} AND month LIKE '2026-%'`,
    )
    .get(...scope.ids) as any;

  const grossBeforeDiscount = Number(streamActuals2026.net_revenue || 0) + Number(streamActuals2026.discount_cost || 0);
  const effectiveDiscountRate =
    grossBeforeDiscount > 0 ? Number(streamActuals2026.discount_cost || 0) / grossBeforeDiscount : 0;
  const discountedTxShare =
    Number(streamActuals2026.transactions || 0) > 0
      ? Number(streamActuals2026.discounted_tx || 0) / Number(streamActuals2026.transactions)
      : 0;
  // Annualized gross value for discount-discipline simulation
  const annualizedGross =
    effectiveDiscountRate < 0.95 && annualized2026 > 0 ? annualized2026 / (1 - effectiveDiscountRate) : annualized2026;
  const annualizedDiscount = Math.max(0, annualizedGross - annualized2026);
  const recoverableAt10PctCap = Math.max(0, Math.round(annualizedDiscount - annualizedGross * 0.1));
  const recoverableAt8PctCap = Math.max(0, Math.round(annualizedDiscount - annualizedGross * 0.08));

  const monthlyBridge = Array.from({ length: 12 }, (_, idx) => {
    const m = idx + 1;
    const t = targetByMonth.get(m);
    const e = econ?.months?.find(em => em.month === m);
    const a26 = actual2026Rows[idx];
    const econTarget = e ? e.newClient.target + e.renewal.target + e.reactivation.target + (e.other?.target ?? 0) : 0;
    const target2027 = Number(t?.approved_target ?? t?.proposed_target ?? econTarget);
    const baseline2026 = a26.complete
      ? a26.revenue
      : a26.prior2025 > 0
        ? Math.round(a26.prior2025 * yoyRatio)
        : Math.round(completeMonthlyAvg);
    const yoyVs2026Pct = baseline2026 > 0 ? round((target2027 / baseline2026 - 1) * 100) : null;
    return {
      month: m,
      actual2026: a26.revenue,
      baseline2026,
      complete2026: a26.complete,
      partial2026: a26.partial,
      prior2025: a26.prior2025,
      target2027,
      newClient2027: Number(t?.new_client_target ?? e?.newClient.target ?? 0),
      renewal2027: Number(t?.renewal_target ?? e?.renewal.target ?? 0),
      reactivation2027: Number(t?.reactivation_target ?? e?.reactivation.target ?? 0),
      other2027: Number(t?.other_target ?? e?.other?.target ?? 0),
      yoyVs2026Pct,
      newBuyersNeeded: e?.newClient.buyers ?? 0,
      trialsNeeded: e?.newClient.trials ?? 0,
      leadsNeeded: e?.newClient.leads ?? 0,
      renewalsNeeded: e?.renewal.renewersNeeded ?? 0,
      reactivationsNeeded: e?.reactivation.needed ?? 0,
      feasibility: e?.benchmark?.feasibility ?? 'balanced',
      stretchPct: e?.benchmark?.stretchPct ?? yoyVs2026Pct,
      bottleneck: e?.benchmark?.bottleneck ?? null,
    };
  });

  const annualTarget2027 = monthlyBridge.reduce((s, r) => s + r.target2027, 0);
  const streamTargets2027 = {
    newClient: monthlyBridge.reduce((s, r) => s + r.newClient2027, 0),
    renewal: monthlyBridge.reduce((s, r) => s + r.renewal2027, 0),
    reactivation: monthlyBridge.reduce((s, r) => s + r.reactivation2027, 0),
    other: monthlyBridge.reduce((s, r) => s + r.other2027, 0),
  };

  const pickAssumption = (k: keyof NonNullable<typeof econ>['assumptions']) =>
    econ?.assumptions?.[k] ? (econ.assumptions[k].override ?? econ.assumptions[k].auto ?? 0) : 0;

  return {
    throughCompleteMonth: through,
    observedComplete2026: Math.round(observedComplete2026),
    observedYtd2026: Math.round(observedYtd2026),
    annualized2026: Math.round(annualized2026),
    annualTarget2027: Math.round(annualTarget2027),
    bridgeDelta: Math.round(annualTarget2027 - annualized2026),
    bridgePct: annualized2026 > 0 ? round((annualTarget2027 / annualized2026 - 1) * 100) : null,
    streamActuals2026: {
      newClient: Math.round(Number(streamActuals2026.new_client || 0)),
      renewal: Math.round(Number(streamActuals2026.renewal || 0)),
      reactivation: Math.round(Number(streamActuals2026.reactivation || 0)),
      additional: Math.round(Number(streamActuals2026.additional || 0)),
    },
    streamTargets2027,
    discountAudit: {
      observedNetRevenue: Math.round(Number(streamActuals2026.net_revenue || 0)),
      observedDiscountCost: Math.round(Number(streamActuals2026.discount_cost || 0)),
      effectiveDiscountRate,
      discountedTxShare,
      annualizedDiscountPool: Math.round(annualizedDiscount),
      recoverableAt10PctCap,
      recoverableAt8PctCap,
    },
    unitEconomics: econ
      ? {
          newClientTicket: Math.round(pickAssumption('firstSpend')),
          renewalTicket: Math.round(pickAssumption('renewalTicket')),
          reactivationTicket: Math.round(pickAssumption('reactivationTicket')),
          trialToBuy: pickAssumption('trialToMember'),
          leadToTrial: pickAssumption('leadToTrial'),
          renewalRate: pickAssumption('renewalRate'),
          lapsedPool: Math.round(pickAssumption('lapsedPool')),
        }
      : null,
    playbookSummary: playbook
      ? {
          priority: playbook.priority,
          insight: playbook.insight,
        }
      : null,
    monthlyBridge,
  };
}

export function studioProfile(studioId: number, year: number) {
  const studio = db.prepare('SELECT * FROM studios WHERE id=?').get(studioId) as any;
  if (!studio) return null;
  const scope = scopeClause(studioId);
  const availableActualYears = (
    db
      .prepare(
        `SELECT DISTINCT CAST(substr(month,1,4) AS INTEGER) year FROM transactions WHERE ${scope.clause} ORDER BY year DESC`,
      )
      .all(...scope.ids) as any[]
  )
    .map(r => Number(r.year))
    .filter(Number.isFinite);
  const latestObservedMonth =
    String(scalar(`SELECT MAX(month) value FROM transactions WHERE ${scope.clause}`, ...scope.ids) || '2026-10') ||
    '2026-10';
  const monthly = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    ...actualMetrics(studioId, monthKey(year, i + 1)),
    prior_revenue: revenueFor(studioId, monthKey(year - 1, i + 1)),
  }));
  const products = db
    .prepare(
      `SELECT product_name name, category, COUNT(*) transactions, SUM(amount) revenue, AVG(amount) aov, SUM(discount_amount) discount
    FROM transactions WHERE ${scope.clause} AND month LIKE ? GROUP BY product_name,category ORDER BY revenue DESC LIMIT 12`,
    )
    .all(...scope.ids, `${year}-%`);
  const sources = db
    .prepare(
      `SELECT COALESCE(source_name,'Unknown') source, COUNT(*) leads, SUM(CASE WHEN converted_at IS NOT NULL THEN 1 ELSE 0 END) conversions, SUM(ltv) attributed_ltv
    FROM leads WHERE ${scope.clause} AND month LIKE ? GROUP BY source_name ORDER BY leads DESC LIMIT 10`,
    )
    .all(...scope.ids, `${year}-%`);
  const seasonality = db
    .prepare(
      `SELECT CAST(substr(month,6,2) AS INTEGER) month, AVG(revenue) average_revenue, COUNT(*) observations FROM (
    SELECT month,SUM(amount) revenue FROM transactions WHERE ${scope.clause} GROUP BY month) GROUP BY month ORDER BY month`,
    )
    .all(...scope.ids);
  const trainers = db
    .prepare(
      `SELECT trainer_name,trainer_ref,SUM(total_sessions) sessions,SUM(customers) customers,SUM(paid_revenue) paid_revenue,
    AVG(conversion_rate) conversion_rate,AVG(retention_rate) retention_rate,SUM(new_clients) new_clients FROM trainer_performance
    WHERE ${scope.clause} AND month LIKE ? GROUP BY trainer_ref,trainer_name ORDER BY sessions DESC LIMIT 10`,
    )
    .all(...scope.ids, `${year}-%`);
  const funnel = observedFunnel(studioId);
  const attendance = attendanceProfile(studioId, year);
  const segments = db
    .prepare('SELECT * FROM segment_snapshots WHERE studio_id=? ORDER BY audience_size DESC')
    .all(studioId);
  const offerScope = scopeClause(studioId, 'studio_id');
  const offers = db
    .prepare(
      `SELECT id,name,objective,status,actual_revenue,actual_redemptions,effective_discount,expected_revenue FROM offers
    WHERE (${offerScope.clause} OR studio_id IS NULL) AND NOT (year=2027 AND month IS NULL) ORDER BY COALESCE(actual_revenue,expected_revenue,0) DESC LIMIT 8`,
    )
    .all(...offerScope.ids);
  const strengths: string[] = [],
    weaknesses: string[] = [];
  const totalRevenue = monthly.reduce((s, m) => s + m.revenue, 0);
  const totalDiscount = monthly.reduce((s, m) => s + m.discount_cost, 0);
  if (products[0])
    strengths.push(`${(products[0] as any).name} is the largest observed product contributor in ${year}.`);
  if (sources[0])
    strengths.push(
      `${(sources[0] as any).source} is the largest imported lead source; conversion is shown separately.`,
    );
  if (funnel.trialToPurchaseRate > 0 && funnel.trialToPurchaseRate < 0.25)
    weaknesses.push(
      `Matured trial cohorts convert at ${(funnel.trialToPurchaseRate * 100).toFixed(1)}%; follow-up is a priority.`,
    );
  else if (funnel.trialToPurchaseRate >= 0.28)
    strengths.push(
      `Matured 90-day trial cohorts convert at ${(funnel.trialToPurchaseRate * 100).toFixed(1)}%, providing strong front-end leverage.`,
    );
  if (attendance.summary.late_cancellation_rate !== null && attendance.summary.late_cancellation_rate > 0.12)
    weaknesses.push(
      `Late cancellations represent ${(attendance.summary.late_cancellation_rate * 100).toFixed(1)}% of observed bookings in ${year}.`,
    );
  else if (attendance.summary.checkin_rate !== null && attendance.summary.checkin_rate >= 0.8)
    strengths.push(
      `Check-in discipline holds at ${(attendance.summary.checkin_rate * 100).toFixed(1)}% across observed ${year} bookings.`,
    );
  if (attendance.outlook.raw_attendance_trend !== null && attendance.outlook.raw_attendance_trend > 0.05)
    strengths.push(
      `Checked-in visits increased ${(attendance.outlook.raw_attendance_trend * 100).toFixed(1)}% across the latest six complete months versus the prior six months.`,
    );
  if (totalRevenue > 0 && totalDiscount / (totalRevenue + totalDiscount) > 0.1)
    weaknesses.push(
      `Observed discount exposure is ${((totalDiscount / (totalRevenue + totalDiscount)) * 100).toFixed(1)}% of gross value — shifting renewals to value-added perks can recover margin.`,
    );
  if (!weaknesses.length)
    weaknesses.push(
      'No material weakness is asserted automatically; review the funnel and product mix for data-supported opportunities.',
    );
  const historic = historicFindings(
    studioId,
    year,
    monthly,
    products as any[],
    sources as any[],
    offers as any[],
    attendance,
  );
  const planBridge2027 = buildPlanBridge2027(studioId, studio.name);
  return {
    studio,
    isRollup: scope.ids.length > 1,
    rollupStudioIds: scope.ids,
    availableActualYears: availableActualYears.length ? availableActualYears : [2026, 2025],
    latestObservedMonth,
    monthly,
    products,
    sources,
    trainers,
    seasonality,
    funnel,
    attendance,
    segments,
    offers,
    strengths,
    weaknesses,
    historic,
    planBridge2027,
    recommendations: {
      targetMethod: 'Comparable-month actuals adjusted by observed capped trend; approved targets remain separate.',
      totalRevenue,
      totalDiscount,
    },
    coverage: dataCoverage(),
  };
}

export function studiosOverview(requestedYear = 2026, allowedStudioIds?: number[]) {
  const actualYear = requestedYear > 2026 ? 2026 : requestedYear;
  const through = latestCompleteMonth();
  let studios = db.prepare('SELECT * FROM studios WHERE active=1 ORDER BY city DESC, id ASC').all() as any[];
  if (allowedStudioIds?.length) {
    studios = studios.filter(s => allowedStudioIds.includes(s.id));
  }
  const nextMonthKey = '2026-11';
  const nextMonthEnd = '2026-12-01';

  const items = studios.map(studio => {
    const scope = scopeClause(studio.id);
    const isRollup = scope.ids.length > 1;
    const isChildVenue = studio.name === 'Copper + Cloves' || studio.name === 'Plash Pilates';

    const completeRow = db
      .prepare(
        `SELECT COALESCE(SUM(amount),0) revenue, COALESCE(SUM(discount_amount),0) discount,
          COUNT(*) transactions, AVG(amount) aov,
          AVG(CASE WHEN is_first_observed=1 THEN amount END) first_aov
        FROM transactions WHERE ${scope.clause} AND month LIKE ? AND month<=?`,
      )
      .get(...scope.ids, `${actualYear}-%`, `${actualYear}-${through.slice(5, 7)}`) as any;

    const priorCompleteRevenue = Number(
      scalar(
        `SELECT COALESCE(SUM(amount),0) value FROM transactions WHERE ${scope.clause} AND month LIKE ? AND month<=?`,
        ...scope.ids,
        `${actualYear - 1}-%`,
        `${actualYear - 1}-${through.slice(5, 7)}`,
      ) || 0,
    );

    const ytdRevenue = Number(
      scalar(
        `SELECT COALESCE(SUM(amount),0) value FROM transactions WHERE ${scope.clause} AND month LIKE ?`,
        ...scope.ids,
        `${actualYear}-%`,
      ) || 0,
    );

    const topProduct = db
      .prepare(
        `SELECT product_name name, SUM(amount) revenue, COUNT(*) transactions
        FROM transactions WHERE ${scope.clause} AND month LIKE ?
        GROUP BY product_name ORDER BY revenue DESC LIMIT 1`,
      )
      .get(...scope.ids, `${actualYear}-%`) as any;

    const funnel = observedFunnel(studio.id);
    const attendance = attendanceProfile(studio.id, actualYear);
    const bridge = buildPlanBridge2027(studio.id, studio.name);

    const dueRow = db
      .prepare(
        `SELECT COUNT(*) due_packages, COALESCE(SUM(CASE WHEN amount>0 THEN amount ELSE 0 END),0) due_value
        FROM customer_packages WHERE ${scope.clause} AND end_date>=? AND end_date<? AND status IN ('Active','New','Frozen')`,
      )
      .get(...scope.ids, `${nextMonthKey}-01`, nextMonthEnd) as any;

    const gross = Number(completeRow.revenue || 0) + Number(completeRow.discount || 0);
    const discountRate = gross > 0 ? Number(completeRow.discount || 0) / gross : 0;
    const yoyCompletePct =
      priorCompleteRevenue > 0 ? round((Number(completeRow.revenue || 0) / priorCompleteRevenue - 1) * 100) : null;

    const stretchMonths = bridge.monthlyBridge.filter(m => m.feasibility === 'stretch').length;
    const balancedMonths = bridge.monthlyBridge.filter(m => m.feasibility === 'balanced').length;
    const comfortableMonths = bridge.monthlyBridge.filter(m => m.feasibility === 'comfortable').length;

    return {
      studio,
      isRollup,
      isChildVenue,
      actualYear,
      throughCompleteMonth: through,
      completeRevenue: Math.round(Number(completeRow.revenue || 0)),
      priorCompleteRevenue: Math.round(priorCompleteRevenue),
      yoyCompletePct,
      ytdRevenue: Math.round(ytdRevenue),
      annualized2026: bridge.annualized2026,
      target2027: bridge.annualTarget2027,
      bridgeDelta: bridge.bridgeDelta,
      growthTo2027Pct: bridge.bridgePct,
      transactions: Number(completeRow.transactions || 0),
      aov: completeRow.aov ? Math.round(Number(completeRow.aov)) : null,
      firstPurchaseAov: completeRow.first_aov ? Math.round(Number(completeRow.first_aov)) : null,
      discountCost: Math.round(Number(completeRow.discount || 0)),
      discountRate,
      recoverableMarginAt10PctCap: bridge.discountAudit.recoverableAt10PctCap,
      trialToPurchaseRate: funnel.trialToPurchaseRate,
      leadToPurchaseObserved: funnel.leadToPurchaseObserved,
      checkinRate: attendance.summary.checkin_rate,
      lateCancellationRate: attendance.summary.late_cancellation_rate,
      nextMonthReturnRate: attendance.summary.next_month_return_rate,
      activeMembers: attendance.summary.active_members || 0,
      checkinsCount: attendance.summary.checkins || 0,
      dueNextMonthPackages: Number(dueRow?.due_packages || 0),
      dueNextMonthValue: Math.round(Number(dueRow?.due_value || 0)),
      topProduct: topProduct
        ? {
            name: topProduct.name,
            revenue: Math.round(Number(topProduct.revenue || 0)),
            share: ytdRevenue > 0 ? round((Number(topProduct.revenue || 0) / ytdRevenue) * 100) : null,
          }
        : null,
      priority2027: bridge.playbookSummary?.priority || null,
      insight2027: bridge.playbookSummary?.insight || null,
      feasibility: { stretchMonths, balancedMonths, comfortableMonths },
    };
  });

  const activeItems = items.filter(i => i.completeRevenue > 0 || i.ytdRevenue > 0 || i.target2027 > 0);
  const legacyItems = items.filter(i => i.completeRevenue === 0 && i.ytdRevenue === 0 && i.target2027 === 0);

  // Portfolio rollup excludes child venues when Pop-up rollup is present so revenue/targets never double-count
  const hasPopupParent = activeItems.some(i => i.studio.name === 'Pop-up');
  const portfolioItems = activeItems.filter(i => !(hasPopupParent && i.isChildVenue));

  const portfolioCompleteRevenue = portfolioItems.reduce((s, i) => s + i.completeRevenue, 0);
  const portfolioPriorComplete = portfolioItems.reduce((s, i) => s + i.priorCompleteRevenue, 0);
  const portfolioYtdRevenue = portfolioItems.reduce((s, i) => s + i.ytdRevenue, 0);
  const portfolioAnnualized2026 = portfolioItems.reduce((s, i) => s + i.annualized2026, 0);
  const portfolioTarget2027 = portfolioItems.reduce((s, i) => s + i.target2027, 0);
  const portfolioDiscountCost = portfolioItems.reduce((s, i) => s + i.discountCost, 0);
  const portfolioRecoverableMargin = portfolioItems.reduce((s, i) => s + i.recoverableMarginAt10PctCap, 0);
  const portfolioCheckins = portfolioItems.reduce((s, i) => s + i.checkinsCount, 0);
  const portfolioDuePackages = portfolioItems.reduce((s, i) => s + i.dueNextMonthPackages, 0);
  const portfolioDueValue = portfolioItems.reduce((s, i) => s + i.dueNextMonthValue, 0);

  return {
    requestedYear,
    actualYear,
    throughCompleteMonth: through,
    portfolio: {
      studioCount: portfolioItems.length,
      completeRevenue: portfolioCompleteRevenue,
      priorCompleteRevenue: portfolioPriorComplete,
      yoyCompletePct:
        portfolioPriorComplete > 0 ? round((portfolioCompleteRevenue / portfolioPriorComplete - 1) * 100) : null,
      ytdRevenue: portfolioYtdRevenue,
      annualized2026: portfolioAnnualized2026,
      target2027: portfolioTarget2027,
      bridgeDelta: portfolioTarget2027 - portfolioAnnualized2026,
      growthTo2027Pct:
        portfolioAnnualized2026 > 0 ? round((portfolioTarget2027 / portfolioAnnualized2026 - 1) * 100) : null,
      discountCost: portfolioDiscountCost,
      effectiveDiscountRate:
        portfolioCompleteRevenue + portfolioDiscountCost > 0
          ? portfolioDiscountCost / (portfolioCompleteRevenue + portfolioDiscountCost)
          : 0,
      recoverableMarginAt10PctCap: portfolioRecoverableMargin,
      checkinsCount: portfolioCheckins,
      dueNextMonthPackages: portfolioDuePackages,
      dueNextMonthValue: portfolioDueValue,
    },
    studios: activeItems,
    legacyStudios: legacyItems.map(i => i.studio),
    coverage: dataCoverage(),
  };
}
