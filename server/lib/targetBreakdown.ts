import { db } from '../db.js';
import { POPUP_CHILDREN, POPUP_PARENT } from './plan2027.js';

// One target per location-month lives in monthly_targets (approved, else proposed, under the active
// scenario). This module turns that single number into every planning metric — clients, funnel,
// units, check-ins — with the same formulas as Bengaluru_Sales_Plan_2027.xlsx › 2027 Targets.
// Nothing here is a second target: change the target (or switch Standard ↔ Stretch) and every
// metric recalculates.

export const UNIT_GROUPS = [
  { key: 'm1', label: '1M & short-term unlimited' },
  { key: 'm3', label: '3M unlimited' },
  { key: 'm6', label: '6M unlimited' },
  { key: 'annual', label: 'Annual' },
  { key: 'packs', label: 'Class packs' },
  { key: 'singles', label: 'Singles / credits' },
  { key: 'intro', label: 'Newcomer / intro' },
  { key: 'privates', label: 'Privates' },
] as const;
type UnitKey = (typeof UNIT_GROUPS)[number]['key'];

export interface PlanAssumptions {
  source: string;
  firstMonthSpend: number; // avg first-month spend per new paying client (₹)
  payingPerVisit: number; // new paying clients per first visit
  leadToVisit: number; // first visits per lead
  visitToPackage: number; // first visit → package/membership conversion
  existingSpend: number; // avg monthly spend per existing paying client (₹)
  retailShare: number; // retail share of revenue
  classesPerMonth: number;
  capacity: number; // avg spots per class
  fill: number; // planned fill rate
  mix: Record<UnitKey, number>; // share of non-retail revenue
  price: Record<UnitKey, number>; // realised ₹ per unit
  t12: Partial<Omit<PlanAssumptions, 'source' | 't12' | 'notes'>>;
  notes: string[];
}

const zeroMix = (m: Partial<Record<UnitKey, number>>) =>
  Object.fromEntries(UNIT_GROUPS.map(g => [g.key, m[g.key] ?? 0])) as Record<UnitKey, number>;

// Sources: Kenkere House and Pop-up = workbook “2027 Assumptions”. Kemps Corner and Bandra = the same
// definitions measured on the Momence exports for Oct-2025 → Sep-2026 (T12), with the 2027 changes
// from the location playbooks (conversion recovery, fill, Strength Lab and privates).
const POPUP_VENUE: PlanAssumptions = {
  source: 'Bengaluru_Sales_Plan_2027.xlsx › 2027 Assumptions (Pop-up, split evenly across the two venues)',
  firstMonthSpend: 1450,
  payingPerVisit: 0.88,
  leadToVisit: 0.32,
  visitToPackage: 0.32,
  existingSpend: 2500,
  retailShare: 0.005,
  classesPerMonth: 40,
  capacity: 10.5,
  fill: 0.38,
  mix: zeroMix({ m1: 0.03, packs: 0.32, singles: 0.65 }),
  price: zeroMix({ m1: 7676, packs: 8106, singles: 679 }),
  t12: {
    firstMonthSpend: 1359,
    payingPerVisit: 0.914,
    leadToVisit: 0.297,
    visitToPackage: 0.301,
    existingSpend: 2390,
    retailShare: 0,
    classesPerMonth: 34.2,
    capacity: 10.9,
    fill: 0.237,
  },
  notes: [
    'Pop-up visits are mostly paid at the door, so most first visits become paying clients.',
    'Pack-led follow-up lifts lead → first visit from 30% to 32%.',
  ],
};

const POPUP_COMBINED: PlanAssumptions = {
  ...POPUP_VENUE,
  source: 'Bengaluru_Sales_Plan_2027.xlsx › 2027 Assumptions (Pop-up: Copper + Cloves and Plash Pilates combined)',
  classesPerMonth: 80,
  t12: { ...POPUP_VENUE.t12, classesPerMonth: 68.4 },
};

export const PLAN_ASSUMPTIONS_2027: Record<string, PlanAssumptions> = {
  'Kemps Corner': {
    source: 'Momence exports Oct-2025 → Sep-2026 (T12) + Kemps Corner 2027 playbook',
    firstMonthSpend: 9150,
    payingPerVisit: 0.5,
    leadToVisit: 0.78,
    visitToPackage: 0.29,
    existingSpend: 18100,
    retailShare: 0.022,
    classesPerMonth: 363,
    capacity: 13.85,
    fill: 0.5,
    mix: zeroMix({
      m1: 0.174,
      m3: 0.13,
      m6: 0.044,
      annual: 0.168,
      packs: 0.311,
      singles: 0.094,
      intro: 0.008,
      privates: 0.071,
    }),
    price: zeroMix({
      m1: 15400,
      m3: 44900,
      m6: 92200,
      annual: 160900,
      packs: 13760,
      singles: 1680,
      intro: 1770,
      privates: 16540,
    }),
    t12: {
      firstMonthSpend: 9154,
      payingPerVisit: 0.505,
      leadToVisit: 0.783,
      visitToPackage: 0.241,
      existingSpend: 18092,
      retailShare: 0.022,
      classesPerMonth: 345.7,
      capacity: 13.85,
      fill: 0.449,
    },
    notes: [
      'First visit → package rises from 24% to 29%: non-hosted trial conversion returns to its H1-2025 level (40%) via Second Class in 7 and Fast-Track 35.',
      '+4 Strength Lab sessions a week (≈17 classes a month); fill 45% → 50% through off-peak steering.',
      'Lead → first visit stays at T12 (78%): many first visits arrive without a logged lead.',
    ],
  },
  Bandra: {
    source: 'Momence exports Oct-2025 → Sep-2026 (T12) + Bandra 2027 playbook',
    firstMonthSpend: 6850,
    payingPerVisit: 0.45,
    leadToVisit: 0.6,
    visitToPackage: 0.25,
    existingSpend: 16000,
    retailShare: 0.029,
    classesPerMonth: 267,
    capacity: 12.8,
    fill: 0.47,
    mix: zeroMix({
      m1: 0.206,
      m3: 0.124,
      m6: 0.081,
      annual: 0.123,
      packs: 0.32,
      singles: 0.08,
      intro: 0.035,
      privates: 0.031,
    }),
    price: zeroMix({
      m1: 15460,
      m3: 45000,
      m6: 91960,
      annual: 158470,
      packs: 12770,
      singles: 1810,
      intro: 1790,
      privates: 5000,
    }),
    t12: {
      firstMonthSpend: 6840,
      payingPerVisit: 0.451,
      leadToVisit: 0.599,
      visitToPackage: 0.19,
      existingSpend: 15994,
      retailShare: 0.029,
      classesPerMonth: 266.9,
      capacity: 12.8,
      fill: 0.417,
    },
    notes: [
      'First visit → package rises from 19% to 25%: non-hosted conversion back to its H1-2025 level (31%).',
      'Privates grow from 0.2% to ~3% of revenue (Form Fix Duo), taken from class packs.',
      'Fill 42% → 47% by pruning thin early-morning and weekend-evening classes.',
    ],
  },
  'Kenkere House': {
    source: 'Bengaluru_Sales_Plan_2027.xlsx › 2027 Assumptions (Kenkere House)',
    firstMonthSpend: 5000,
    payingPerVisit: 0.42,
    leadToVisit: 0.4,
    visitToPackage: 0.22,
    existingSpend: 11000,
    retailShare: 0.03,
    classesPerMonth: 195,
    capacity: 12,
    fill: 0.52,
    mix: zeroMix({
      m1: 0.24,
      m3: 0.22,
      m6: 0.03,
      annual: 0.09,
      packs: 0.24,
      singles: 0.09,
      intro: 0.045,
      privates: 0.045,
    }),
    price: zeroMix({
      m1: 12629,
      m3: 39444,
      m6: 69883,
      annual: 122223,
      packs: 9523,
      singles: 1427,
      intro: 1800,
      privates: 5295,
    }),
    t12: {
      firstMonthSpend: 4788,
      payingPerVisit: 0.38,
      leadToVisit: 0.398,
      visitToPackage: 0.169,
      existingSpend: 11095,
      retailShare: 0.031,
      classesPerMonth: 190.3,
      capacity: 11.9,
      fill: 0.437,
    },
    notes: [
      'First-month spend lifted by steering newcomers to 2–3 week unlimited starters instead of the ₹709 intro pack.',
      'First visit → package 17% → 22% through the hosted-class fix and paid, credit-back trials.',
      'Fill 44% → 52% (second weekend late-morning class, Show-Up Streak).',
    ],
  },
  'Copper + Cloves': POPUP_VENUE,
  'Plash Pilates': POPUP_VENUE,
};

const daysIn = (year: number, month: number) => new Date(year, month, 0).getDate();
const mkey = (y: number, m: number) => `${y}-${String(m).padStart(2, '0')}`;

function latestCompleteMonth() {
  const row = db.prepare('SELECT MAX(purchased_at) d FROM transactions').get() as any;
  const d = String(row?.d || '').slice(0, 10);
  if (d.length !== 10) return '2026-09';
  const [y, m] = d.split('-').map(Number);
  const complete = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10) === d;
  return complete ? mkey(y, m) : mkey(m === 1 ? y - 1 : y, m === 1 ? 12 : m - 1);
}

// Prior-year comparison for each month: actual where the month is complete; otherwise an estimate —
// the same month two years back × year-to-date growth, or the last-three-month run-rate for a studio
// without a comparable history (the workbook's "actual / Q4 est." column).
function priorYear(studioIds: number[], year: number) {
  const ph = studioIds.map(() => '?').join(',');
  const rev = (key: string) =>
    Number(
      (
        db
          .prepare(`SELECT COALESCE(SUM(amount),0) v FROM transactions WHERE studio_id IN (${ph}) AND month=?`)
          .get(...studioIds, key) as any
      ).v,
    );
  const latest = latestCompleteMonth();
  const py = year - 1;
  const [ly, lm] = latest.split('-').map(Number);
  const lastFull = ly > py ? 12 : ly === py ? lm : 0;
  let ytdNow = 0,
    ytdBefore = 0;
  for (let m = 1; m <= lastFull; m++) {
    ytdNow += rev(mkey(py, m));
    ytdBefore += rev(mkey(py - 1, m));
  }
  const growth = ytdBefore >= 500000 ? ytdNow / ytdBefore : null;
  const runRate =
    lastFull >= 3 ? (rev(mkey(py, lastFull)) + rev(mkey(py, lastFull - 1)) + rev(mkey(py, lastFull - 2))) / 3 : 0;
  return Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    if (m <= lastFull) return { value: rev(mkey(py, m)), estimated: false };
    const base = rev(mkey(py - 1, m));
    const value = growth !== null && base > 0 ? base * Math.min(Math.max(growth, 0.8), 1.4) : runRate;
    return { value, estimated: true };
  });
}
const ceil = (v: number) => Math.ceil(v - 1e-9);

export interface BreakdownMonth {
  month: number;
  seasonIndex: number;
  target: number;
  lastYear: number;
  growth: number | null;
  newRevenue: number;
  existingRevenue: number;
  newPaying: number;
  firstVisits: number;
  leads: number;
  packageConversions: number;
  existingPaying: number;
  totalPaying: number;
  avgSpend: number;
  leadsPerWeek: number;
  checkins: number;
  units: Record<UnitKey, number>;
  retailRevenue: number;
  lastYearEstimated?: boolean;
}

function monthMetrics(year: number, row: any, a: PlanAssumptions): BreakdownMonth {
  const target = Number(row.approved_target ?? row.proposed_target ?? 0);
  const scale = row.proposed_target ? target / Number(row.proposed_target) : 1;
  const newRevenue = Math.min(target, Number(row.new_client_target || 0) * scale);
  const existingRevenue = target - newRevenue;
  const newPaying = newRevenue > 0 ? ceil(newRevenue / a.firstMonthSpend) : 0;
  const firstVisits = newPaying > 0 ? ceil(newPaying / a.payingPerVisit) : 0;
  const leads = firstVisits > 0 ? ceil(firstVisits / a.leadToVisit) : 0;
  const existingPaying = Math.round(existingRevenue / a.existingSpend);
  const totalPaying = newPaying + existingPaying;
  const retailRevenue = target * a.retailShare;
  const nonRetail = target - retailRevenue;
  const units = Object.fromEntries(
    UNIT_GROUPS.map(g => [g.key, a.price[g.key] > 0 ? Math.round((nonRetail * a.mix[g.key]) / a.price[g.key]) : 0]),
  ) as Record<UnitKey, number>;
  const lastYear = Number(row.historical_revenue || 0);
  return {
    month: row.month,
    seasonIndex: 0,
    target,
    lastYear,
    growth: lastYear > 0 ? target / lastYear - 1 : null,
    newRevenue,
    existingRevenue,
    newPaying,
    firstVisits,
    leads,
    packageConversions: Math.round(firstVisits * a.visitToPackage),
    existingPaying,
    totalPaying,
    avgSpend: totalPaying ? target / totalPaying : 0,
    leadsPerWeek: leads / (daysIn(year, row.month) / 7),
    checkins: Math.round(a.classesPerMonth * a.capacity * a.fill),
    units,
    retailRevenue,
  };
}

const SUM_KEYS = [
  'target',
  'lastYear',
  'newRevenue',
  'existingRevenue',
  'newPaying',
  'firstVisits',
  'leads',
  'packageConversions',
  'existingPaying',
  'totalPaying',
  'leadsPerWeek',
  'checkins',
  'retailRevenue',
] as const;

function addMonths(a: BreakdownMonth, b: BreakdownMonth): BreakdownMonth {
  const out: any = { ...a, units: { ...a.units } };
  for (const k of SUM_KEYS) out[k] = (a as any)[k] + (b as any)[k];
  for (const g of UNIT_GROUPS) out.units[g.key] = a.units[g.key] + b.units[g.key];
  out.growth = out.lastYear > 0 ? out.target / out.lastYear - 1 : null;
  out.avgSpend = out.totalPaying ? out.target / out.totalPaying : 0;
  return out;
}

function finalise(months: BreakdownMonth[], year: number) {
  const annual = months.reduce((s, m) => s + m.target, 0);
  months.forEach(m => (m.seasonIndex = annual ? (m.target / annual) * 12 : 0));
  const total = months.slice(1).reduce(addMonths, { ...months[0], units: { ...months[0].units } });
  total.month = 0;
  total.seasonIndex = 12;
  const weeks = (new Date(year, 11, 31).getTime() - new Date(year, 0, 1).getTime()) / 864e5 / 7 + 1 / 7;
  total.leadsPerWeek = total.leads / weeks;
  const avg = {
    existingPaying: total.existingPaying / 12,
    totalPaying: total.totalPaying / 12,
    avgSpend: total.totalPaying ? total.target / total.totalPaying : 0,
  };
  return { months, total, monthlyAverage: avg };
}

const studioByName = (name: string) => db.prepare('SELECT id,name,city FROM studios WHERE name=?').get(name) as any;

// Planner overrides saved in the month workspace's assumption editor (studio_assumptions) win over
// the defaults above, so there is one set of rates behind every funnel number in the app.
const OVERRIDE_MAP = {
  firstSpend: 'firstMonthSpend',
  trialToMember: 'payingPerVisit',
  leadToTrial: 'leadToVisit',
} as const;
export function effectiveAssumptions(studioId: number, year: number, base: PlanAssumptions) {
  const rows = db
    .prepare('SELECT key, value FROM studio_assumptions WHERE studio_id=? AND year=?')
    .all(studioId, year) as Array<{ key: string; value: number }>;
  const a: PlanAssumptions & { overridden: string[] } = { ...base, overridden: [] };
  for (const r of rows) {
    const k = (OVERRIDE_MAP as any)[r.key] as keyof PlanAssumptions | undefined;
    if (k && Number.isFinite(r.value) && r.value > 0) {
      (a as any)[k] = r.value;
      a.overridden.push(k);
    }
  }
  return a;
}
export const assumptionsFor = (studioName: string) =>
  studioName === POPUP_PARENT ? POPUP_COMBINED : PLAN_ASSUMPTIONS_2027[studioName] || null;

function leafBreakdown(studio: { id: number; name: string }, year: number, override?: PlanAssumptions) {
  const base = override || PLAN_ASSUMPTIONS_2027[studio.name];
  if (!base) return null;
  const a = effectiveAssumptions(studio.id, year, base);
  const rows = db
    .prepare('SELECT * FROM monthly_targets WHERE studio_id=? AND year=? ORDER BY month')
    .all(studio.id, year) as any[];
  if (rows.length !== 12) return null;
  const months = rows.map(r => monthMetrics(year, r, a));
  // Venues without their own sales history keep the stored comparison; everything else is measured.
  const ids =
    studio.name === POPUP_PARENT
      ? [studio.id, ...POPUP_CHILDREN.map(n => studioByName(n)?.id).filter(Boolean)]
      : [studio.id];
  const prior = priorYear(ids, year);
  if (prior.some(p => p.value > 0))
    months.forEach((m, i) => {
      m.lastYear = prior[i].value;
      m.lastYearEstimated = prior[i].estimated;
      m.growth = m.lastYear > 0 ? m.target / m.lastYear - 1 : null;
    });
  return { studio, assumptions: a, ...finalise(months, year) };
}

// Breakdown for one location. Pop-up is the sum of its venues, each with its own assumptions.
export function targetBreakdown(studioId: number, year: number) {
  const studio = db.prepare('SELECT id,name,city FROM studios WHERE id=?').get(studioId) as any;
  if (!studio) return null;
  if (studio.name === POPUP_PARENT) {
    // Computed on the roll-up with the workbook's combined Pop-up assumptions (both venues' classes),
    // so small venue-level unit counts are not lost to rounding.
    const parent = leafBreakdown(studio, year, POPUP_COMBINED);
    if (!parent) return null;
    const venues = POPUP_CHILDREN.map(studioByName)
      .filter(Boolean)
      .map(v => ({
        studio: v,
        annual: Number(
          (
            db
              .prepare(
                'SELECT SUM(COALESCE(approved_target,proposed_target)) v FROM monthly_targets WHERE studio_id=? AND year=?',
              )
              .get(v.id, year) as any
          )?.v || 0,
        ),
      }));
    return { ...parent, venues };
  }
  const leaf = leafBreakdown(studio, year);
  return leaf ? { ...leaf, venues: [] as Array<{ studio: any; annual: number }> } : null;
}

// Writes the breakdown's volumes into monthly_targets.funnel so every other screen (offers, copilot,
// overview, intelligence) reads the same leads / first visits / new paying clients. Idempotent and
// does not create target versions: the target itself is unchanged.
export function syncBreakdownFunnels(year: number) {
  const update = db.prepare(
    'UPDATE monthly_targets SET funnel=?, historical_revenue=?, target_growth=? WHERE studio_id=? AND year=? AND month=?',
  );
  const tx = db.transaction(() => {
    const names = [...Object.keys(PLAN_ASSUMPTIONS_2027), POPUP_PARENT];
    for (const name of names) {
      const s = studioByName(name);
      if (!s) continue;
      const b = targetBreakdown(s.id, year);
      if (!b) continue;
      const rows = db
        .prepare(
          'SELECT month,funnel,historical_revenue,target_growth FROM monthly_targets WHERE studio_id=? AND year=?',
        )
        .all(s.id, year) as any[];
      for (const m of b.months) {
        const row = rows.find(r => r.month === m.month);
        if (!row) continue;
        const funnel = JSON.parse(row.funnel || '{}');
        const next = {
          ...funnel,
          requiredNewClientRevenue: m.newRevenue,
          requiredNewBuyers: m.newPaying,
          requiredCompletedTrials: m.firstVisits,
          requiredTrialBookings: m.firstVisits,
          requiredLeads: m.leads,
          calculationPath: [
            {
              label: 'New paying clients',
              formula: 'New-client revenue ÷ first-month spend',
              value: m.newPaying,
              unit: 'clients',
            },
            {
              label: 'First visits / trials',
              formula: 'New paying clients ÷ paying clients per first visit',
              value: m.firstVisits,
              unit: 'visits',
            },
            { label: 'Leads needed', formula: 'First visits ÷ lead → first-visit rate', value: m.leads, unit: 'leads' },
          ],
          source: 'target_breakdown',
        };
        const json = JSON.stringify(next);
        // The prior-year comparison (actual, or estimate for incomplete months) is shared too, so every
        // "vs last year" in the app uses the same base as the breakdown.
        const ly = Math.round(m.lastYear * 100) / 100;
        const growth = ly > 0 ? Math.round((m.target / ly - 1) * 1000) / 10 : null;
        if (json !== row.funnel || (ly > 0 && Math.abs(Number(row.historical_revenue || 0) - ly) > 0.5))
          update.run(
            json,
            ly > 0 ? ly : row.historical_revenue,
            ly > 0 ? growth : row.target_growth,
            s.id,
            year,
            m.month,
          );
      }
    }
  });
  tx();
}
