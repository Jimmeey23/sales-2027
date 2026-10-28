// Cached, read-only data access for P57 Copilot.
//
// Every number Copilot quotes comes from here, and every accessor is memoised against a
// data-generation counter plus a short TTL, so a burst of questions (or a refined
// follow-up) reuses the same computed answers instead of re-scanning 160k check-ins.

import { db } from '../../db.js';
import { actualMetrics, attendanceProfile, latestCompleteMonth } from '../intelligence.js';
import { renewalReport } from '../renewals.js';
import { buildCommercialOffer, commercialCatalog, type CommercialKind } from '../commercial.js';
import { STUDIO_DEFINITIONS, studioScopeIds } from '../studios.js';
import { MONTH_NAMES, monthKey, monthLabel, rupees, safeDiv } from './text.js';

export interface Studio {
  id: number;
  name: string;
  city: string;
  code: string;
  max_discount_percent: number;
  monthly_capacity: number | null;
  active: number;
}

export interface MonthTarget {
  id: number;
  studio_id: number;
  studio: string;
  year: number;
  month: number;
  key: string;
  label: string;
  scenario: string;
  historical_revenue: number | null;
  baseline_forecast: number | null;
  proposed_target: number | null;
  approved_target: number | null;
  target: number | null;
  target_basis: 'approved' | 'proposed';
  new_client_target: number | null;
  renewal_target: number | null;
  reactivation_target: number | null;
  repeat_target: number | null;
  target_growth: number | null;
  funnel: any;
  assumptions: any;
}

export interface ObservedMonth {
  month: string;
  revenue: number;
  transactions: number;
  aov: number;
  new_client: number;
  renewal: number;
  reactivation: number;
  additional: number;
  discount_cost: number;
  discounted_transactions: number;
  leads: number;
  completed_trials: number;
  trial_conversion: number | null;
  lead_to_purchase: number | null;
  booking_count: number;
  checkin_count: number;
  late_cancellation_count: number;
  checkin_rate: number | null;
  late_cancellation_rate: number | null;
}

// ---------------------------------------------------------------- cache plumbing

type Entry = { at: number; value: unknown };

const CACHE = new Map<string, Entry>();
let generation = 0;
let hits = 0;
let misses = 0;

/** Bumped whenever Copilot-triggered writes happen, so reads cannot go stale. */
export function invalidateCopilotCache(): void {
  generation += 1;
  CACHE.clear();
}

export function cacheStats() {
  const total = hits + misses;
  return {
    entries: CACHE.size,
    hits,
    misses,
    hitRate: total ? Number((hits / total).toFixed(3)) : 0,
    generation,
  };
}

function memo<T>(key: string, ttlMs: number, factory: () => T): T {
  const stamp = `${key}@${generation}`;
  const found = CACHE.get(stamp);
  const now = Date.now();
  if (found && now - found.at < ttlMs) {
    hits += 1;
    return found.value as T;
  }
  misses += 1;
  const value = factory();
  CACHE.set(stamp, { at: now, value });
  if (CACHE.size > 400) {
    // Cheap bound: drop the oldest quarter of the entries.
    const oldest = [...CACHE.entries()].sort((a, b) => a[1].at - b[1].at).slice(0, 100);
    for (const [entryKey] of oldest) CACHE.delete(entryKey);
  }
  return value;
}

export const ONE_MINUTE = 60_000;

// ---------------------------------------------------------------- reference data

export function studios(): Studio[] {
  return memo('studios', 10 * ONE_MINUTE, () =>
    (db.prepare('SELECT * FROM studios WHERE active=1 ORDER BY id').all() as any[]).filter(
      studio => studio.name !== 'Outdoor / Unassigned',
    ),
  );
}

/** Matches a loose mention ("kemps", "bangalore", "plash") to one studio. */
export function resolveStudio(hint: string | null | undefined, fallbackId?: number | null): Studio | null {
  const list = studios();
  if (hint) {
    const needle = hint.toLowerCase();
    const direct = list.find(studio => studio.name.toLowerCase().includes(needle));
    if (direct) return direct;
    const alias = STUDIO_DEFINITIONS.find(definition =>
      definition.aliases.some(name => name.toLowerCase().includes(needle)),
    );
    if (alias) {
      const byName = list.find(studio => studio.name === alias.name);
      if (byName) return byName;
    }
    if (/mumbai/.test(needle)) return list.find(studio => studio.name === 'Kemps Corner') ?? null;
    if (/bengaluru|bangalore/.test(needle)) return list.find(studio => studio.name === 'Kenkere House') ?? null;
  }
  if (fallbackId) return list.find(studio => studio.id === fallbackId) ?? null;
  return null;
}

export function studioIds(studioId: number | null | undefined): number[] {
  if (!studioId) return studios().map(studio => studio.id);
  return studioScopeIds(db, studioId);
}

// ---------------------------------------------------------------- targets & plans

export function targets(year: number, studioId: number | null): MonthTarget[] {
  return memo(`targets:${year}:${studioId ?? 'all'}`, ONE_MINUTE, () => {
    const ids = studioIds(studioId);
    const rows = db
      .prepare(
        `SELECT t.*, s.name studio FROM monthly_targets t JOIN studios s ON s.id=t.studio_id
         WHERE t.year=? AND t.studio_id IN (${ids.map(() => '?').join(',')})
         ORDER BY t.month, t.studio_id`,
      )
      .all(year, ...ids) as any[];
    return rows.map(row => {
      const approved = row.approved_target ?? null;
      const proposed = row.proposed_target ?? null;
      return {
        id: row.id,
        studio_id: row.studio_id,
        studio: row.studio,
        year: row.year,
        month: row.month,
        key: monthKey(row.year, row.month),
        label: monthLabel(row.year, row.month),
        scenario: row.scenario || 'standard',
        historical_revenue: row.historical_revenue ?? null,
        baseline_forecast: row.baseline_forecast ?? null,
        proposed_target: proposed,
        approved_target: approved,
        target: approved ?? proposed,
        target_basis: approved != null ? 'approved' : 'proposed',
        new_client_target: row.new_client_target ?? null,
        renewal_target: row.renewal_target ?? null,
        reactivation_target: row.reactivation_target ?? null,
        repeat_target: row.repeat_target ?? null,
        target_growth: row.target_growth ?? null,
        funnel: parseJson(row.funnel),
        assumptions: parseJson(row.assumptions),
      } satisfies MonthTarget;
    });
  });
}

function parseJson(value: string | null | undefined) {
  try {
    return JSON.parse(value || '{}');
  } catch {
    return {};
  }
}

export function targetsForMonth(year: number, month: number, studioId: number | null): MonthTarget[] {
  return targets(year, studioId).filter(target => target.month === month);
}

/** Rolls several studios' rows into one month (targets, historical, funnel). */
export function rollupMonth(year: number, month: number, studioId: number | null) {
  const rows = targetsForMonth(year, month, studioId);
  const sum = (pick: (row: MonthTarget) => number | null) =>
    rows.reduce((total, row) => total + (pick(row) ?? 0), 0);
  const funnelRows = rows.map(row => row.funnel || {});
  return {
    key: monthKey(year, month),
    label: monthLabel(year, month),
    year,
    month,
    studios: rows.length,
    basis: rows.some(row => row.target_basis === 'approved') ? 'approved' : 'proposed',
    target: rows.length ? sum(row => row.target) : null,
    historical: rows.length ? sum(row => row.historical_revenue) : null,
    newClient: sum(row => row.new_client_target),
    renewal: sum(row => row.renewal_target),
    reactivation: sum(row => row.reactivation_target),
    repeat: sum(row => row.repeat_target),
    leads: funnelRows.reduce((total, funnel) => total + (Number(funnel.requiredLeads) || 0), 0),
    trials: funnelRows.reduce((total, funnel) => total + (Number(funnel.requiredCompletedTrials) || 0), 0),
    buyers: funnelRows.reduce((total, funnel) => total + (Number(funnel.requiredNewBuyers) || 0), 0),
    byStudio: rows,
  };
}

export function planFor(studioId: number, year: number, month: number) {
  return memo(`plan:${studioId}:${year}:${month}`, ONE_MINUTE, () => {
    const row = db
      .prepare('SELECT * FROM monthly_plans WHERE studio_id=? AND year=? AND month=?')
      .get(studioId, year, month) as any;
    if (!row) return null;
    const offers = db
      .prepare(
        `SELECT o.id,o.offer_uid,o.name,o.offer_type,o.audience,o.expected_revenue,o.effective_discount,o.status,o.benefit
         FROM offers o WHERE o.studio_id=? AND o.year=? AND o.month=? AND o.status NOT IN ('archived','rejected')
         ORDER BY COALESCE(o.plan_rank, 99), o.id`,
      )
      .all(studioId, year, month) as any[];
    return {
      id: row.id,
      studioId,
      year,
      month,
      theme: row.theme,
      objective: row.objective,
      strategy: row.strategy,
      actions: parseJsonArray(row.actions),
      notes: row.notes,
      status: row.status,
      slots: parseJson(row.slots),
      offers,
    };
  });
}

function parseJsonArray(value: string | null | undefined): any[] {
  const parsed = parseJson(value);
  // Plan actions are stored as objects (week, owner, done, text); keep them structured.
  if (Array.isArray(parsed)) return parsed;
  if (typeof parsed === 'string' && parsed.trim()) return [parsed];
  return [];
}

// ---------------------------------------------------------------- observed actuals

export function observed(studioId: number | null, month: string): ObservedMonth | null {
  return memo(`observed:${studioId ?? 'all'}:${month}`, 2 * ONE_MINUTE, () => {
    try {
      const ids = studioIds(studioId);
      if (ids.length === 1) {
        const metrics = actualMetrics(ids[0], month) as ObservedMonth;
        if (!metrics.transactions && !metrics.leads) return null;
        return metrics;
      }
      const rows = ids
        .map(id => {
          try {
            return actualMetrics(id, month) as any;
          } catch {
            return null;
          }
        })
        .filter(Boolean) as any[];
      if (!rows.length) return null;
      const total = (field: string) => rows.reduce((sum, row) => sum + (Number(row[field]) || 0), 0);
      const revenue = total('revenue');
      const leads = total('leads');
      const trials = total('completed_trials');
      const converted = rows.reduce(
        (sum, row) => sum + (row.trial_conversion ?? 0) * (Number(row.completed_trials) || 0),
        0,
      );
      const convertedLeads = rows.reduce(
        (sum, row) => sum + (row.lead_to_purchase ?? 0) * (Number(row.leads) || 0),
        0,
      );
      const bookings = total('booking_count');
      return {
        month,
        revenue,
        transactions: total('transactions'),
        aov: safeDiv(revenue, total('transactions')) ?? 0,
        new_client: total('new_client'),
        renewal: total('renewal'),
        reactivation: total('reactivation'),
        additional: total('additional'),
        discount_cost: total('discount_cost'),
        discounted_transactions: total('discounted_transactions'),
        leads,
        completed_trials: trials,
        trial_conversion: safeDiv(converted, trials),
        lead_to_purchase: safeDiv(convertedLeads, leads),
        booking_count: bookings,
        checkin_count: total('checkin_count'),
        late_cancellation_count: total('late_cancellation_count'),
        checkin_rate: safeDiv(total('checkin_count'), bookings),
        late_cancellation_rate: safeDiv(total('late_cancellation_count'), bookings),
      } as ObservedMonth;
    } catch {
      return null;
    }
  });
}

export function latestObservedMonth(): string {
  return memo('latest-observed', 10 * ONE_MINUTE, () => latestCompleteMonth());
}

// ---------------------------------------------------------------- channels

export interface ChannelRow {
  source: string;
  leads: number;
  converted: number;
  conversion: number | null;
  trials: number;
  ltv: number;
  ltvPerLead: number | null;
}

export function channels(studioId: number | null, months: string[]): ChannelRow[] {
  return memo(`channels:${studioId ?? 'all'}:${months.join(',')}`, 2 * ONE_MINUTE, () => {
    const ids = studioIds(studioId);
    const placeholders = months.map(() => '?').join(',');
    const rows = db
      .prepare(
        `SELECT COALESCE(NULLIF(TRIM(source_name),''),'Unknown') source,
                COUNT(*) leads,
                SUM(CASE WHEN converted_at IS NOT NULL THEN 1 ELSE 0 END) converted,
                SUM(CASE WHEN trial_status IS NOT NULL AND trial_status<>'' AND trial_status<>'Not Booked' THEN 1 ELSE 0 END) trials,
                COALESCE(SUM(ltv),0) ltv
         FROM leads WHERE studio_id IN (${ids.map(() => '?').join(',')}) AND month IN (${placeholders})
         GROUP BY 1 ORDER BY leads DESC`,
      )
      .all(...ids, ...months) as any[];
    return rows.map(row => ({
      source: row.source,
      leads: row.leads,
      converted: row.converted,
      conversion: safeDiv(row.converted, row.leads),
      trials: row.trials,
      ltv: row.ltv,
      ltvPerLead: safeDiv(row.ltv, row.leads),
    }));
  });
}

// ---------------------------------------------------------------- member base

export interface SegmentRow {
  id: string;
  label: string;
  members: number;
  share: number;
  revenue: number;
  revenueShare: number;
  avgValue: number;
  play: string;
}

export function segments(studioId: number | null): { rows: SegmentRow[]; total: number; revenue: number } {
  return memo(`segments:${studioId ?? 'all'}`, 2 * ONE_MINUTE, () => {
    const ids = studioIds(studioId);
    const rule = db.prepare('SELECT * FROM segment_rules ORDER BY id DESC LIMIT 1').get() as any;
    const recentlyLapsed = Number(rule?.recently_lapsed_days) || 45;
    const longLapsed = Number(rule?.long_lapsed_days) || 120;
    const frequent = Number(rule?.frequent_purchase_count) || 3;
    const rows = db
      .prepare(
        `SELECT member_ref,
                COALESCE(SUM(amount),0) revenue,
                COUNT(*) purchases,
                MAX(purchase_date) last_purchase,
                MIN(purchase_date) first_purchase,
                CAST(julianday('now') - julianday(MAX(purchase_date)) AS INTEGER) days_since
         FROM customer_packages
         WHERE studio_id IN (${ids.map(() => '?').join(',')})
         GROUP BY member_ref`,
      )
      .all(...ids) as any[];

    const buckets = new Map<string, SegmentRow & { sumDays: number }>();
    const seed: Record<string, Omit<SegmentRow, 'members' | 'share' | 'revenue' | 'revenueShare' | 'avgValue'> & { sumDays?: number }> = {
      champions: { id: 'champions', label: 'Champions', play: 'Protect with early renewal, referral ask, and first access to new formats.' },
      loyal: { id: 'loyal', label: 'Loyal', play: 'Grow basket: upgrade to the next pack size and add a private session.' },
      new: { id: 'new', label: 'New members', play: 'Convert the first 90 days: week-2 check-in, class 6 and 10 milestones.' },
      at_risk: { id: 'at_risk', label: 'At risk', play: 'Reach out inside the next 10 days with a comeback class, not a discount.' },
      hibernating: { id: 'hibernating', label: 'Hibernating', play: 'Win back with a time-boxed return offer; stop discounting after two attempts.' },
      lapsed: { id: 'lapsed', label: 'Lapsed', play: 'Low-cost reactivation: one email, one WhatsApp, then archive from paid media.' },
    };

    for (const row of rows) {
      const days = Number(row.days_since) || 0;
      let key: string;
      if (days <= recentlyLapsed) {
        key = Number(row.purchases) >= frequent ? 'champions' : Number(row.purchases) >= 2 ? 'loyal' : 'new';
      } else if (days <= longLapsed) key = 'at_risk';
      else if (days <= longLapsed * 2) key = 'hibernating';
      else key = 'lapsed';
      const bucket = buckets.get(key) ?? { ...seed[key], members: 0, share: 0, revenue: 0, revenueShare: 0, avgValue: 0, sumDays: 0 };
      bucket.members += 1;
      bucket.revenue += Number(row.revenue) || 0;
      bucket.sumDays += days;
      buckets.set(key, bucket);
    }

    const total = rows.length;
    const revenue = [...buckets.values()].reduce((sum, bucket) => sum + bucket.revenue, 0);
    const order = ['champions', 'loyal', 'new', 'at_risk', 'hibernating', 'lapsed'];
    const result = order
      .map(key => buckets.get(key))
      .filter(Boolean)
      .map(bucket => ({
        id: bucket!.id,
        label: bucket!.label,
        members: bucket!.members,
        share: safeDiv(bucket!.members, total) ?? 0,
        revenue: bucket!.revenue,
        revenueShare: safeDiv(bucket!.revenue, revenue) ?? 0,
        avgValue: safeDiv(bucket!.revenue, bucket!.members) ?? 0,
        play: bucket!.play,
      }));
    return { rows: result, total, revenue };
  });
}

// ---------------------------------------------------------------- product mix

export interface ProductRow {
  category: string;
  revenue: number;
  transactions: number;
  aov: number;
  share: number;
}

export function productMix(studioId: number | null, months: string[], byCategory = true): ProductRow[] {
  return memo(`mix:${studioId ?? 'all'}:${months.join(',')}:${byCategory}`, 2 * ONE_MINUTE, () => {
    const ids = studioIds(studioId);
    const placeholders = months.map(() => '?').join(',');
    const rows = db
      .prepare(
        `SELECT ${byCategory ? 'COALESCE(NULLIF(category,\'\'),\'Uncategorised\')' : 'product_name'} label,
                COALESCE(SUM(amount),0) revenue,
                COUNT(*) transactions,
                AVG(amount) aov
         FROM transactions WHERE studio_id IN (${ids.map(() => '?').join(',')}) AND month IN (${placeholders})
         GROUP BY 1 ORDER BY revenue DESC`,
      )
      .all(...ids, ...months) as any[];
    const total = rows.reduce((sum, row) => sum + Number(row.revenue), 0);
    return rows.map(row => ({
      category: row.label,
      revenue: Number(row.revenue),
      transactions: Number(row.transactions),
      aov: Number(row.aov),
      share: safeDiv(Number(row.revenue), total) ?? 0,
    }));
  });
}

// ---------------------------------------------------------------- attendance profile

export function attendanceFor(studioId: number | null, year: number) {
  return memo(`attendance:${studioId ?? 'all'}:${year}`, 5 * ONE_MINUTE, () => {
    const ids = studioIds(studioId);
    if (ids.length === 1) return attendanceProfile(ids[0], year);
    const profiles = ids.map(id => {
      try {
        return attendanceProfile(id, year) as any;
      } catch {
        return null;
      }
    });
    const valid = profiles.filter(Boolean);
    if (!valid.length) return null;
    // Merge the day/time distributions that the profile returns.
    const merged: any = { ...valid[0] };
    const sumKey = (key: string) => valid.reduce((sum, profile) => sum + (Number(profile?.[key]) || 0), 0);
    for (const key of ['bookings', 'checkins', 'late_cancellations', 'other_not_checked']) {
      if (valid.some(profile => profile[key] != null)) merged[key] = sumKey(key);
    }
    const mergeList = (key: string, labelKey: string) => {
      if (!valid.every(profile => Array.isArray(profile?.[key]))) return;
      const map = new Map<string, any>();
      for (const profile of valid)
        for (const item of profile[key]) {
          const label = String(item[labelKey] ?? item.label ?? '');
          const current = map.get(label) || { ...item, [labelKey]: label };
          for (const field of ['bookings', 'checkins', 'late_cancellations']) {
            if (typeof item[field] === 'number') current[field] = (current[field] || 0) + item[field];
          }
          map.set(label, current);
        }
      merged[key] = [...map.values()];
    };
    mergeList('weekdays', 'day');
    mergeList('timeBands', 'band');
    merged.summary = merged.summary || {};
    return merged;
  });
}

// ---------------------------------------------------------------- renewals

export function renewals(monthKeyValue: string, studioId: number | null) {
  return memo(`renewals:${monthKeyValue}:${studioId ?? 'all'}`, 2 * ONE_MINUTE, () => {
    const ids = studioIds(studioId);
    if (ids.length === 1) return renewalReport(monthKeyValue, ids[0]);
    if (!studioId) return renewalReport(monthKeyValue);
    const reports = ids.map(id => renewalReport(monthKeyValue, id));
    const merge = (pick: (report: any) => number | null | undefined) =>
      reports.reduce((sum, report) => sum + (Number(pick(report)) || 0), 0);
    const base = reports[0] as any;
    return {
      ...base,
      scope: 'merged_studios',
      summary: {
        ...base.summary,
        duePackages: merge(report => report.summary.duePackages),
        paidDueValue: merge(report => report.summary.paidDueValue),
        listDueValue: merge(report => report.summary.listDueValue),
        paidValuePackages: merge(report => report.summary.paidValuePackages),
        listMatchedPackages: merge(report => report.summary.listMatchedPackages),
      },
      products: reports.flatMap(report => report.products),
    } as any;
  });
}

/** How far the imported package book actually reaches, so future months are not implied. */
export function renewalCoverage() {
  return memo('renewal-coverage', 5 * ONE_MINUTE, () => {
    const row = db
      .prepare(
        `SELECT MIN(NULLIF(end_date,'')) first, MAX(NULLIF(end_date,'')) last,
                COUNT(*) total,
                SUM(CASE WHEN end_date IS NULL OR end_date='' THEN 1 ELSE 0 END) missing
         FROM customer_packages`,
      )
      .get() as any;
    return {
      first: row?.first ? String(row.first).slice(0, 7) : null,
      last: row?.last ? String(row.last).slice(0, 7) : null,
      total: Number(row?.total) || 0,
      missing: Number(row?.missing) || 0,
    };
  });
}

/** The studio a question falls back to when none is named: the biggest 2027 plan. */
export function defaultStudio(year: number): Studio | null {
  return memo(`default-studio:${year}`, 5 * ONE_MINUTE, () => {
    const list = studios();
    if (!list.length) return null;
    const totals = new Map<number, number>();
    for (const row of targets(year, null)) totals.set(row.studio_id, (totals.get(row.studio_id) ?? 0) + (row.target ?? 0));
    return [...list].sort((a, b) => (totals.get(b.id) ?? 0) - (totals.get(a.id) ?? 0))[0] ?? list[0];
  });
}

// ---------------------------------------------------------------- offers

export function offersFor(studioId: number | null, year: number) {
  return memo(`offers:${studioId ?? 'all'}:${year}`, 2 * ONE_MINUTE, () => {
    const ids = studioIds(studioId);
    return db
      .prepare(
        `SELECT o.id,o.offer_uid,o.name,o.headline,o.offer_type,o.audience,o.month,o.year,o.status,o.benefit,
                o.expected_revenue,o.actual_revenue,o.effective_discount,o.plan_slot,o.plan_rank,o.studio_id,s.name studio
         FROM offers o JOIN studios s ON s.id=o.studio_id
         WHERE o.studio_id IN (${ids.map(() => '?').join(',')}) AND o.year=? AND o.status NOT IN ('archived','rejected')
         ORDER BY o.month, o.studio_id, COALESCE(o.plan_rank,99), o.id`,
      )
      .all(...ids, year) as any[];
  });
}

// ---------------------------------------------------------------- pricing

export function pricing(studioId: number | null) {
  return memo(`pricing:${studioId ?? 'all'}`, 5 * ONE_MINUTE, () => {
    const ids = studioIds(studioId);
    if (ids.length === 1) {
      const catalog = commercialCatalog(ids[0]);
      return { products: catalog.products as any[], policy: catalog.policy as any };
    }
    return {
      products: ids.flatMap(id => {
        try {
          return commercialCatalog(id).products as any[];
        } catch {
          return [];
        }
      }),
      policy: null,
    };
  });
}

// ---------------------------------------------------------------- offers: build

export function buildOffer(params: {
  studioId: number;
  kind: CommercialKind;
  year: number;
  month: number;
  productId?: number;
  targetRevenue?: number;
  mechanics?: any;
  format?: any;
}) {
  return buildCommercialOffer(params as any);
}

export function studioCapacity(studio: Studio | null) {
  if (!studio) return studios().reduce((sum, item) => sum + (item.monthly_capacity || 0), 0);
  return studio.monthly_capacity || 0;
}

export function monthNames() {
  return MONTH_NAMES;
}

export function describeMonth(year: number, month: number) {
  return { key: monthKey(year, month), label: monthLabel(year, month), money: rupees };
}
