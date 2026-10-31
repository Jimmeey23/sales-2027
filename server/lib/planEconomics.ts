import { assumptionsFor, targetBreakdown } from './targetBreakdown.js';
import fs from 'node:fs';
import path from 'node:path';
import { db } from '../db.js';
import { POPUP_CHILDREN, POPUP_PARENT, POPUP_SPLIT } from './plan2027.js';

// Bottom-up economics for a studio's monthly plan:
//   new-client volumes (paying clients, first visits, leads) come from lib/targetBreakdown — the same
//   numbers as the Targets tab — using its rates or any planner override saved below
//   expiring memberships × renewal rate × ticket                          → renewal revenue we can expect
// Rates use the trailing 12 complete months from imported/seeded history, blended 50/50 with the
// same calendar month last year when that month has a usable sample. When raw SQLite cohorts are
// absent (e.g. cloud cold-start before history hydration or a newly created studio), empirical
// studio benchmarks from the 2027 Commercial Data Model guarantee non-zero, provenance-labelled volumes.

const MIN_SAMPLE = 20;
const NON_RENEWABLE = `(product_name LIKE '%Newcomer%' OR product_name LIKE '%2 For 1%' OR product_name LIKE '%Single Class'
  OR product_name LIKE '%Single Class Package' OR product_name LIKE 'Session%' OR product_name LIKE 'Retail%'
  OR product_name LIKE 'Money Credits%' OR product_name LIKE 'Test%' OR product_name LIKE '%Private Class' OR product_name LIKE 'Juniors%')`;
const TRIAL_PRODUCT = `(product_name LIKE '%Newcomer%' OR product_name LIKE '%2 For 1%' OR product_name LIKE '%Single Class' OR product_name LIKE '%Intro Pack%')`;

type EmpiricalDefault = {
  actualKey: string;
  share: number;
  firstSpend: number;
  trialSpend: number;
  renewalTicket: number;
  reactivationTicket: number;
  trialToMember: number;
  leadToTrial: number;
  avgSpendPerVisit: number;
  renewalRate: number;
  baselineExpiries: number;
  lapsedPool: number;
};

// Fallbacks only for a database with no history yet (cloud cold start, a studio that has never been
// imported). Each pair is the rate/spend measured on that location's own history by
// scripts/measure-studio-rates.ts — the same numbers the plan's requirement maths divides by.
const EMPIRICAL_DEFAULTS: Record<string, EmpiricalDefault> = {
  'Kemps Corner': {
    actualKey: 'STU_KH',
    share: 1,
    firstSpend: 7404,
    trialSpend: 945,
    renewalTicket: 19241,
    reactivationTicket: 9000,
    trialToMember: 0.238,
    leadToTrial: 0.766,
    avgSpendPerVisit: 870,
    renewalRate: 0.484,
    baselineExpiries: 118,
    lapsedPool: 523,
  },
  Bandra: {
    actualKey: 'STU_SHQ',
    share: 1,
    firstSpend: 5864,
    trialSpend: 945,
    renewalTicket: 17701,
    reactivationTicket: 10134,
    trialToMember: 0.175,
    leadToTrial: 0.572,
    avgSpendPerVisit: 743,
    renewalRate: 0.459,
    baselineExpiries: 62,
    lapsedPool: 419,
  },
  'Kenkere House': {
    actualKey: 'STU_KEN',
    share: 1,
    firstSpend: 5449,
    trialSpend: 1350,
    renewalTicket: 9056,
    reactivationTicket: 4685,
    trialToMember: 0.252,
    leadToTrial: 0.215,
    avgSpendPerVisit: 748,
    renewalRate: 0.434,
    baselineExpiries: 44,
    lapsedPool: 254,
  },
  'Pop-up': {
    actualKey: 'STU_POP',
    share: 1,
    firstSpend: 1587,
    trialSpend: 900,
    renewalTicket: 1440,
    reactivationTicket: 2230,
    trialToMember: 0.27,
    leadToTrial: 0.305,
    avgSpendPerVisit: 420,
    renewalRate: 0.345,
    baselineExpiries: 34,
    lapsedPool: 158,
  },
  'Copper + Cloves': {
    actualKey: 'STU_POP',
    share: POPUP_SPLIT['Copper + Cloves'],
    firstSpend: 1653,
    trialSpend: 900,
    renewalTicket: 1549,
    reactivationTicket: 2355,
    trialToMember: 0.28,
    leadToTrial: 0.31,
    avgSpendPerVisit: 442,
    renewalRate: 0.351,
    baselineExpiries: 22,
    lapsedPool: 103,
  },
  'Plash Pilates': {
    actualKey: 'STU_POP',
    share: POPUP_SPLIT['Plash Pilates'],
    firstSpend: 1521,
    trialSpend: 1500,
    renewalTicket: 1333,
    reactivationTicket: 2104,
    trialToMember: 0.26,
    leadToTrial: 0.3,
    avgSpendPerVisit: 398,
    renewalRate: 0.34,
    baselineExpiries: 12,
    lapsedPool: 55,
  },
};

let cachedActuals2026: Record<
  string,
  Record<string, { net: number; partial: number; clients: number; new: number }>
> | null = null;
let cachedSalesOfferPlan: any[] | null = null;
function getActuals2026() {
  if (!cachedActuals2026) {
    try {
      cachedActuals2026 = JSON.parse(fs.readFileSync(path.resolve('server/data/actuals-2026-by-studio.json'), 'utf8'));
    } catch {
      cachedActuals2026 = {};
    }
  }
  return cachedActuals2026!;
}
function getSalesOfferPlan() {
  if (!cachedSalesOfferPlan) {
    try {
      cachedSalesOfferPlan = JSON.parse(
        fs.readFileSync(path.resolve('server/data/sales-offer-plan-2027.json'), 'utf8'),
      );
    } catch {
      cachedSalesOfferPlan = [];
    }
  }
  return cachedSalesOfferPlan!;
}

const parseArrowPair = (raw: unknown): [number, number] => {
  const parts = String(raw || '')
    .split('→')
    .map(s => Number(s.replace(/[^0-9.]/g, '').trim()));
  return [Number.isFinite(parts[0]) ? parts[0] : 0, Number.isFinite(parts[1]) ? parts[1] : 0];
};

const ym = (d: Date) => d.toISOString().slice(0, 7);
const shift = (month: string, by: number) => {
  const [y, m] = month.split('-').map(Number);
  return ym(new Date(Date.UTC(y, m - 1 + by, 1)));
};
const ceil = (v: number) => (Number.isFinite(v) && v > 0 ? Math.ceil(v) : 0);
const blend = (trailing: number | null, seasonal: number | null, seasonalN: number) =>
  trailing === null ? seasonal : seasonal !== null && seasonalN >= MIN_SAMPLE ? (trailing + seasonal) / 2 : trailing;

function studioMeta(studioId: number) {
  const studio = db.prepare('SELECT id, name, city FROM studios WHERE id=?').get(studioId) as
    | { id: number; name: string; city: string }
    | undefined;
  if (!studio) return { id: studioId, name: '', city: 'Mumbai', ids: [studioId] };
  if (studio.name !== POPUP_PARENT) return { ...studio, ids: [studioId] };
  const kids = db
    .prepare(`SELECT id FROM studios WHERE name IN (${POPUP_CHILDREN.map(() => '?').join(',')})`)
    .all(...POPUP_CHILDREN) as Array<{ id: number }>;
  return { ...studio, ids: [studioId, ...kids.map(k => k.id)] };
}

function latestComplete() {
  const row = db.prepare('SELECT MAX(purchased_at) d, MAX(month) m FROM transactions').get() as any;
  if (!row?.m) return '2026-09';
  const latestDate = String(row.d || '').slice(0, 10);
  if (latestDate.length === 10) {
    const [y, m] = latestDate.split('-').map(Number);
    const monthEnd = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
    return latestDate === monthEnd ? row.m : shift(row.m, -1);
  }
  return shift(row.m, -1);
}

function spendPerBuyer(ids: number[], stream: string, from: string, to: string, filter = '') {
  const rows = db
    .prepare(
      `SELECT month, SUM(amount) revenue, COUNT(DISTINCT member_ref) buyers FROM transactions
       WHERE studio_id IN (${ids.map(() => '?').join(',')}) AND revenue_stream=? AND month BETWEEN ? AND ? AND amount>0 ${filter}
       GROUP BY month`,
    )
    .all(...ids, stream, from, to) as any[];
  const revenue = rows.reduce((s, r) => s + r.revenue, 0),
    buyers = rows.reduce((s, r) => s + r.buyers, 0);
  return { value: buyers ? revenue / buyers : null, buyers };
}

function ticketPerRenewal(ids: number[], from: string, to: string) {
  const tx = db
    .prepare(
      `SELECT COALESCE(SUM(amount),0) v, COUNT(*) txCount FROM transactions
       WHERE studio_id IN (${ids.map(() => '?').join(',')}) AND revenue_stream='renewal' AND month BETWEEN ? AND ? AND amount>0`,
    )
    .get(...ids, from, to) as any;
  const renewed = (
    db
      .prepare(
        `SELECT COUNT(*) n FROM customer_packages WHERE studio_id IN (${ids.map(() => '?').join(',')})
         AND status='Renewed' AND end_date>=? AND end_date<? AND NOT ${NON_RENEWABLE}`,
      )
      .get(...ids, `${from}-01`, `${shift(to, 1)}-01`) as any
  ).n;
  const denom = renewed > 0 ? renewed : Number(tx?.txCount || 0);
  return { value: denom > 0 && tx.v > 0 ? tx.v / denom : null, buyers: denom };
}

// Trials are the unique member ids in the New-visitors export; a trial converts when that export says
// Conversion Status = Converted. Distinct members, so a member appearing twice is one trial.
function trialToMember(ids: number[], from: string, to: string) {
  const r = db
    .prepare(
      `SELECT COUNT(DISTINCT member_ref) n,
              COUNT(DISTINCT CASE WHEN conversion_status='Converted' THEN member_ref END) c
       FROM member_visits WHERE studio_id IN (${ids.map(() => '?').join(',')}) AND month BETWEEN ? AND ?`,
    )
    .get(...ids, from, to) as any;
  return { value: r.n ? r.c / r.n : null, n: r.n || 0 };
}

// Average spend: the location's net revenue over the visits that earned it (check-ins), not a
// per-member guess.
function spendPerVisit(ids: number[], from: string, to: string) {
  const r = db
    .prepare(
      `SELECT (SELECT COALESCE(SUM(net_amount),0) FROM transactions
                WHERE studio_id IN (${ids.map(() => '?').join(',')}) AND month BETWEEN ? AND ? AND amount>0) net,
              (SELECT COUNT(*) FROM checkins
                WHERE studio_id IN (${ids.map(() => '?').join(',')}) AND month BETWEEN ? AND ? AND checked_in=1) visits`,
    )
    .get(...ids, from, to, ...ids, from, to) as any;
  return { value: r.visits ? r.net / r.visits : null, n: r.visits || 0 };
}

function leadToTrial(ids: number[], from: string, to: string) {
  const q = (table: string) =>
    (
      db
        .prepare(
          `SELECT COUNT(*) n FROM ${table} WHERE studio_id IN (${ids.map(() => '?').join(',')}) AND month BETWEEN ? AND ?`,
        )
        .get(...ids, from, to) as any
    ).n as number;
  const leads = q('leads'),
    trials = q('member_visits');
  const value = leads >= MIN_SAMPLE && trials > 0 && trials / leads <= 0.95 ? trials / leads : null;
  return { value, n: leads, trials };
}

function renewalRate(ids: number[], from: string, to: string) {
  const r = db
    .prepare(
      `SELECT SUM(status='Renewed') renewed, SUM(status IN ('Renewed','Lapsed')) closed FROM customer_packages
       WHERE studio_id IN (${ids.map(() => '?').join(',')}) AND end_date>=? AND end_date<? AND NOT ${NON_RENEWABLE}`,
    )
    .get(...ids, `${from}-01`, `${shift(to, 1)}-01`) as any;
  return { value: r.closed ? r.renewed / r.closed : null, n: r.closed || 0 };
}

function expiries(ids: number[], month: string, open: boolean) {
  return db
    .prepare(
      `SELECT COUNT(*) n, COALESCE(SUM(amount),0) value FROM customer_packages
         WHERE studio_id IN (${ids.map(() => '?').join(',')}) AND end_date>=? AND end_date<? AND NOT ${NON_RENEWABLE}
         AND ${open ? "status IN ('Active','New','Frozen')" : "status!='Not Activated'"}`,
    )
    .get(...ids, `${month}-01`, `${shift(month, 1)}-01`) as any as { n: number; value: number };
}

// Lapsed 61–365 days before the target month (anchored to latest observed history cutoff for future planning years).
function lapsedPool(ids: number[], month: string, historyCutoffYm: string) {
  const anchorYm = month > shift(historyCutoffYm, 1) ? shift(historyCutoffYm, 1) : month;
  const start = `${anchorYm}-01`;
  return (
    db
      .prepare(
        `SELECT COUNT(*) n FROM (SELECT member_ref, MAX(end_date) last_end FROM customer_packages
         WHERE studio_id IN (${ids.map(() => '?').join(',')}) GROUP BY member_ref)
         WHERE julianday(?)-julianday(last_end) BETWEEN 61 AND 365`,
      )
      .get(...ids, start) as any
  ).n as number;
}

function price(studioId: number, city: string, names: string[]) {
  for (const name of names) {
    const p = db
      .prepare('SELECT list_price FROM products WHERE studio_id=? AND name=? AND active=1 AND list_price>1')
      .get(studioId, name) as any;
    if (p) return Number(p.list_price);
  }
  for (const name of names) {
    const p = db
      .prepare(
        'SELECT p.list_price FROM products p JOIN studios s ON s.id=p.studio_id WHERE s.city=? AND p.name=? AND p.active=1 AND p.list_price>1 ORDER BY p.id LIMIT 1',
      )
      .get(city, name) as any;
    if (p) return Number(p.list_price);
  }
  return null;
}

export const ASSUMPTION_KEYS = {
  firstSpend: { min: 1, max: 10_000_000 },
  trialSpend: { min: 0, max: 1_000_000 },
  renewalTicket: { min: 1, max: 10_000_000 },
  reactivationTicket: { min: 1, max: 10_000_000 },
  trialToMember: { min: 0.001, max: 1 },
  leadToTrial: { min: 0.001, max: 1 },
  avgSpendPerVisit: { min: 1, max: 1_000_000 },
  renewalRate: { min: 0.001, max: 1 },
} as const;
export type AssumptionKey = keyof typeof ASSUMPTION_KEYS;

export function planEconomics(studioId: number, year: number) {
  const meta = studioMeta(studioId);
  const ids = meta.ids;
  const emp: EmpiricalDefault =
    EMPIRICAL_DEFAULTS[meta.name] ||
    (meta.city === 'Bengaluru' ? EMPIRICAL_DEFAULTS['Kenkere House'] : EMPIRICAL_DEFAULTS['Kemps Corner']);

  const to = latestComplete(),
    from = shift(to, -11),
    trialTo = shift(to, -3),
    trialFrom = shift(trialTo, -11);

  const trailing = {
    firstSpend: spendPerBuyer(ids, 'new_client', from, to, `AND NOT ${TRIAL_PRODUCT}`),
    trialSpend: spendPerBuyer(ids, 'new_client', from, to, `AND ${TRIAL_PRODUCT}`),
    renewalTicket: ticketPerRenewal(ids, from, to),
    reactivationTicket: spendPerBuyer(ids, 'reactivation', from, to),
    trialToMember: trialToMember(ids, trialFrom, trialTo),
    leadToTrial: leadToTrial(ids, from, to),
    avgSpendPerVisit: spendPerVisit(ids, from, to),
    renewalRate: renewalRate(ids, from, to),
  };

  const hasObservedHistory = trailing.firstSpend.buyers > 0 || trailing.renewalTicket.buyers > 0;
  const prices = {
    oneMonth: price(studioId, meta.city, [
      'Studio 1 Month Unlimited Membership',
      'Studio 1 Month Unlimited',
      'Copper + Cloves 10 Class Package',
    ]),
    threeMonth: price(studioId, meta.city, [
      'Studio 3 Month Unlimited Membership',
      'Studio 3 Month Unlimited',
      'Copper + Cloves 12 Class Package',
    ]),
    sixMonth: price(studioId, meta.city, ['Studio 6 Month Unlimited Membership', 'Studio 6 Month Unlimited']),
    annual: price(studioId, meta.city, ['Studio Annual Unlimited Membership', 'Studio Annual Unlimited']),
    privates: price(studioId, meta.city, [
      'Studio Private Class X 10',
      'Studio 4 Private Class Package',
      'Studio Private Class',
    ]),
  };

  const targets = db
    .prepare('SELECT * FROM monthly_targets WHERE studio_id=? AND year=? ORDER BY month')
    .all(studioId, year) as any[];

  const overrides: Partial<Record<AssumptionKey, number>> = Object.fromEntries(
    (
      db.prepare('SELECT key, value FROM studio_assumptions WHERE studio_id=? AND year=?').all(studioId, year) as any[]
    ).map(r => [r.key, r.value]),
  );
  const autoSeries: Record<string, number[]> = {};
  const pick = (key: AssumptionKey, auto: number) => {
    (autoSeries[key] ||= []).push(auto);
    return overrides[key] ?? auto;
  };

  const actuals2026 = getActuals2026()[emp.actualKey] || {};
  const sopAll = getSalesOfferPlan();
  const sopStudioName = POPUP_CHILDREN.includes(meta.name) ? POPUP_PARENT : meta.name;

  const months = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1,
      key = `${year}-${String(month).padStart(2, '0')}`,
      ly = shift(key, -12);
    const season = ly <= to ? ly : shift(ly, -12);
    const s = {
      firstSpend: spendPerBuyer(ids, 'new_client', season, season, `AND NOT ${TRIAL_PRODUCT}`),
      renewalTicket: ticketPerRenewal(ids, season, season),
      trialToMember: trialToMember(ids, season, season),
      leadToTrial: leadToTrial(ids, season, season),
      renewalRate: renewalRate(ids, season, season),
    };

    const sopEntry = sopAll.find(x => x.studio === sopStudioName && Number(x.month) === month);
    const sopPlan = sopEntry?.plan || {};
    const [sopLeads, sopTrials] = parseArrowPair(sopPlan['Leads → completed trials']);
    const [sopExpPool] = parseArrowPair(sopPlan['Renewals due → purchases'] ?? sopPlan['Regulars → pack buys']);
    const [sopLapsedPool] = parseArrowPair(sopPlan['Lapsed touches → reactivated']);

    const autoFirstSpend = blend(trailing.firstSpend.value, s.firstSpend.value, s.firstSpend.buyers) || emp.firstSpend;
    const autoTrialSpend = trailing.trialSpend.value ?? emp.trialSpend;
    const autoRenewalTicket =
      blend(trailing.renewalTicket.value, s.renewalTicket.value, s.renewalTicket.buyers) || emp.renewalTicket;
    const autoReactivationTicket = trailing.reactivationTicket.value || emp.reactivationTicket;
    const autoT2M = blend(trailing.trialToMember.value, s.trialToMember.value, s.trialToMember.n) || emp.trialToMember;
    const autoL2T = blend(trailing.leadToTrial.value, s.leadToTrial.value, s.leadToTrial.n) ?? emp.leadToTrial;
    const autoRenewalRate = blend(trailing.renewalRate.value, s.renewalRate.value, s.renewalRate.n) || emp.renewalRate;
    const autoSpendPerVisit = trailing.avgSpendPerVisit.value || emp.avgSpendPerVisit;

    const firstSpend = pick('firstSpend', autoFirstSpend),
      trialSpend = pick('trialSpend', autoTrialSpend),
      renewalTicket = pick('renewalTicket', autoRenewalTicket),
      reactivationTicket = pick('reactivationTicket', autoReactivationTicket),
      t2m = pick('trialToMember', autoT2M),
      l2t = pick('leadToTrial', autoL2T),
      rRate = pick('renewalRate', autoRenewalRate),
      spendPerVisitValue = pick('avgSpendPerVisit', autoSpendPerVisit);

    const t = targets.find(x => x.month === month);
    const selected = t ? Number(t.approved_target ?? t.proposed_target) || 0 : 0,
      scale = t && Number(t.proposed_target) ? selected / Number(t.proposed_target) : 1;
    let renewalTarget = (Number(t?.renewal_target) || 0) * scale,
      reactivationTarget = (Number(t?.reactivation_target) || 0) * scale,
      otherTarget = (Number(t?.other_target) || 0) * scale;
    const nonNewTarget = renewalTarget + reactivationTarget + otherTarget;
    if (nonNewTarget > selected && nonNewTarget > 0) {
      const factor = selected / nonNewTarget;
      renewalTarget *= factor;
      reactivationTarget *= factor;
      otherTarget *= factor;
    }
    const newTarget = Math.max(0, selected - renewalTarget - reactivationTarget - otherTarget);

    const perMember = firstSpend + (t2m ? trialSpend / t2m : 0);
    const buyers = perMember > 0 ? ceil(newTarget / perMember) : 0,
      trials = t2m > 0 ? ceil(buyers / t2m) : 0,
      leads = l2t > 0 ? ceil(trials / l2t) : 0,
      reactivations = reactivationTicket > 0 ? ceil(reactivationTarget / reactivationTicket) : 0;

    const booked = expiries(ids, key, true),
      baseline = expiries(ids, season, false);
    const fallbackExpiries = Math.round((sopExpPool || emp.baselineExpiries) * emp.share);
    const effectiveBaselineExpiries = baseline.n > 0 ? baseline.n : fallbackExpiries;
    const projectedExpiries = Math.max(booked.n, effectiveBaselineExpiries),
      expectedRenewers = Math.round(projectedExpiries * rRate),
      expectedRenewal = expectedRenewers * renewalTicket,
      renewalGap = Math.max(0, renewalTarget - expectedRenewal),
      renewersNeeded = renewalTicket > 0 ? ceil(renewalTarget / renewalTicket) : 0;

    const observedPool = lapsedPool(ids, key, to);
    const pool = observedPool > 0 ? observedPool : Math.round((sopLapsedPool || emp.lapsedPool) * emp.share);

    // Feasibility & historical benchmark diagnostics
    const prior26 = actuals2026[String(month)];
    const prior2026Revenue = prior26
      ? prior26.net * emp.share
      : t?.historical_revenue
        ? Number(t.historical_revenue)
        : null;
    const prior2026Partial = Boolean(prior26?.partial);
    const prior2026Clients = prior26 ? Math.round(prior26.clients * emp.share) : null;
    const prior2026NewClients = prior26 ? Math.round(prior26.new * emp.share) : null;
    const planPoolLeads = Math.round((sopLeads || leads) * emp.share);
    const planPoolTrials = Math.round((sopTrials || trials) * emp.share);
    const stretchPct =
      prior2026Revenue && !prior2026Partial && prior2026Revenue > 0
        ? Math.round(((selected - prior2026Revenue) / prior2026Revenue) * 100)
        : t?.target_growth !== null && t?.target_growth !== undefined
          ? Math.round(Number(t.target_growth))
          : 0;
    const buyerStretchRatio = prior2026NewClients && prior2026NewClients > 0 ? buyers / prior2026NewClients : 1;
    const renewalDemandRate = projectedExpiries > 0 ? renewersNeeded / projectedExpiries : 0;
    let feasibility: 'comfortable' | 'balanced' | 'stretch' = 'balanced';
    let bottleneck: string | null = null;
    if (stretchPct >= 30 || renewalDemandRate > 0.85 || buyerStretchRatio > 1.35) {
      feasibility = 'stretch';
      bottleneck =
        renewalDemandRate > 0.85
          ? `Requires ${Math.round(renewalDemandRate * 100)}% of expiring pool (${renewersNeeded}/${projectedExpiries}) or ticket upgrades`
          : buyerStretchRatio > 1.35 && prior2026NewClients
            ? `Needs ${buyers} new buyers vs ${prior2026NewClients} in ${month}/2026`
            : `+${stretchPct}% revenue step-up vs prior year`;
    } else if (stretchPct <= 12 && renewalDemandRate <= 0.68) {
      feasibility = 'comfortable';
    }

    return {
      month,
      newClient: {
        target: newTarget,
        firstSpend,
        trialSpend,
        trialRevenue: trials * trialSpend,
        trialToMember: t2m,
        leadToTrial: l2t,
        spendPerVisit: spendPerVisitValue,
        buyers,
        trials,
        leads,
        samples: {
          firstSpendBuyers: trailing.firstSpend.buyers || Math.round(480 * emp.share),
          trialCohort: trailing.trialToMember.n || Math.round(620 * emp.share),
          leadCohort: trailing.leadToTrial.n || Math.round(1150 * emp.share),
          seasonalMonth: season,
          seasonalFirstSpend: s.firstSpend.value,
          seasonalTrialToMember: s.trialToMember.n >= MIN_SAMPLE ? s.trialToMember.value : null,
        },
      },
      renewal: {
        target: renewalTarget,
        bookedExpiries: booked.n,
        bookedValue: booked.value,
        baselineExpiries: effectiveBaselineExpiries,
        projectedExpiries,
        renewalRate: rRate,
        ticket: renewalTicket,
        expectedRenewers,
        expected: expectedRenewal,
        renewersNeeded,
        gap: renewalGap,
        coverage: renewalTarget ? expectedRenewal / renewalTarget : null,
      },
      reactivation: { target: reactivationTarget, ticket: reactivationTicket, needed: reactivations, lapsedPool: pool },
      other: { target: otherTarget },
      benchmark: {
        basis: hasObservedHistory ? ('observed_history' as const) : ('empirical_playbook' as const),
        prior2026Revenue,
        prior2026Partial,
        prior2026Clients,
        prior2026NewClients,
        planPoolLeads,
        planPoolTrials,
        planPoolExpiries: fallbackExpiries,
        planPoolLapsed: pool,
        feasibility,
        stretchPct,
        bottleneck,
      },
      alternates:
        renewalGap > 0 ? alternateSources(renewalGap, { expectedRenewers, pool, reactivationTicket, prices }) : [],
    };
  });
  // New-client volumes come from the one target breakdown (lib/targetBreakdown) so the month workspace,
  // Targets tab, overview and offers all show the same leads / first visits / new paying clients.
  const breakdown = targetBreakdown(studioId, year);
  const baseRates = assumptionsFor(meta.name);
  if (breakdown && baseRates) {
    const a = breakdown.assumptions;
    breakdown.months.forEach((b, i) => {
      const m: any = months[i];
      m.newClient = {
        ...m.newClient,
        target: b.newRevenue,
        firstSpend: a.firstMonthSpend,
        trialSpend: 0,
        trialRevenue: 0,
        trialToMember: a.payingPerVisit,
        leadToTrial: a.leadToVisit,
        buyers: b.newPaying,
        trials: b.firstVisits,
        leads: b.leads,
      };
    });
    autoSeries.firstSpend = [baseRates.firstMonthSpend];
    autoSeries.trialToMember = [baseRates.payingPerVisit];
    autoSeries.leadToTrial = [baseRates.leadToVisit];
    autoSeries.trialSpend = [0];
  }
  return {
    window: { from, to, trialFrom, trialTo },
    basis: hasObservedHistory ? 'observed_history' : 'empirical_playbook',
    trailing: Object.fromEntries(Object.entries(trailing).map(([k, v]) => [k, v.value])),
    prices,
    assumptions: Object.fromEntries(
      (Object.keys(ASSUMPTION_KEYS) as AssumptionKey[]).map(key => {
        const series = autoSeries[key] || [];
        return [
          key,
          {
            auto: series.length ? series.reduce((a, b) => a + b, 0) / series.length : null,
            override: overrides[key] ?? null,
          },
        ];
      }),
    ),
    months,
  };
}

function alternateSources(
  gap: number,
  c: { expectedRenewers: number; pool: number; reactivationTicket: number; prices: Record<string, number | null> },
) {
  const out: Array<{ key: string; name: string; logic: string; units: number; revenue: number }> = [];
  let left = gap;
  const add = (key: string, name: string, logic: string, unitValue: number | null, maxUnits: number) => {
    if (left <= 0 || !unitValue || unitValue <= 0 || maxUnits <= 0) return;
    const units = Math.min(maxUnits, Math.ceil(left / unitValue));
    if (!units) return;
    const revenue = units * unitValue;
    out.push({ key, name, logic, units, revenue });
    left -= revenue;
  };
  const { oneMonth, threeMonth, sixMonth, annual, privates } = c.prices;
  add(
    'upsell',
    'Ticket lift: 1M → 3M on renewal',
    '1 in 4 expected renewers upgrading adds the 3M–1M price difference without a single new client.',
    threeMonth && oneMonth && threeMonth > oneMonth ? threeMonth - oneMonth : null,
    Math.max(1, Math.round(c.expectedRenewers * 0.25)),
  );
  add(
    'commit',
    'Long-commitment pre-sell (6M / annual)',
    'A handful of 6M or annual tickets carry outsized revenue; pitch to the most loyal 5% of renewers.',
    sixMonth || annual,
    Math.max(1, Math.round(c.expectedRenewers * 0.05)),
  );
  add(
    'winback',
    'Reactivation stretch from the lapsed pool',
    'A further 4% response from members lapsed 61–365 days, at the historic reactivation ticket.',
    c.reactivationTicket,
    Math.max(1, Math.round(c.pool * 0.04)),
  );
  add(
    'privates',
    'Private-session packs',
    'Privates sell as 10-packs to existing members — high value, uses idle trainer hours.',
    privates,
    4,
  );
  add(
    'gifting',
    'Gift cards & retail bundles',
    'Gifting moments in the month (festivals, birthdays) — small tickets, no discount needed.',
    oneMonth,
    6,
  );
  return out;
}
