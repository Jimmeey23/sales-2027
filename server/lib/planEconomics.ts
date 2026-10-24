import { db } from '../db.js';
import { POPUP_CHILDREN, POPUP_PARENT } from './plan2027.js';

// Bottom-up economics for a studio's monthly plan, built only from imported history:
//   new-client target ÷ average first spend         → paying members needed
//   members ÷ trial→member conversion               → completed trials needed
//   trials ÷ lead→trial conversion                  → leads needed
//   expiring memberships × renewal rate × ticket     → renewal revenue we can expect
// Rates use the trailing 12 complete months, blended 50/50 with the same calendar month last year
// when that month has a usable sample, so seasonality (January resolutions, monsoon dips) shows through.

const MIN_SAMPLE = 30;
// Trial products, single classes and retail are not memberships anyone "renews".
const NON_RENEWABLE = `(product_name LIKE '%Newcomer%' OR product_name LIKE '%2 For 1%' OR product_name LIKE '%Single Class'
  OR product_name LIKE '%Single Class Package' OR product_name LIKE 'Session%' OR product_name LIKE 'Retail%'
  OR product_name LIKE 'Money Credits%' OR product_name LIKE 'Test%' OR product_name LIKE '%Private Class' OR product_name LIKE 'Juniors%')`;

const ym = (d: Date) => d.toISOString().slice(0, 7);
const shift = (month: string, by: number) => {
  const [y, m] = month.split('-').map(Number);
  return ym(new Date(Date.UTC(y, m - 1 + by, 1)));
};
const ceil = (v: number) => (Number.isFinite(v) && v > 0 ? Math.ceil(v) : 0);
const blend = (trailing: number | null, seasonal: number | null, seasonalN: number) =>
  trailing === null ? seasonal : seasonal !== null && seasonalN >= MIN_SAMPLE ? (trailing + seasonal) / 2 : trailing;

function studioIds(studioId: number) {
  const studio = db.prepare('SELECT name FROM studios WHERE id=?').get(studioId) as any;
  if (studio?.name !== POPUP_PARENT) return [studioId];
  const kids = db
    .prepare(`SELECT id FROM studios WHERE name IN (${POPUP_CHILDREN.map(() => '?').join(',')})`)
    .all(...POPUP_CHILDREN) as any[];
  return [studioId, ...kids.map(k => k.id)];
}

function latestComplete() {
  const row = db.prepare('SELECT MAX(month) m FROM transactions').get() as any;
  // The newest month is usually still in progress.
  return shift(row?.m || ym(new Date()), -1);
}

// Average spend per buyer, computed month by month so repeat buyers don't inflate a single "member".
const TRIAL_PRODUCT = `(product_name LIKE '%Newcomer%' OR product_name LIKE '%2 For 1%' OR product_name LIKE '%Single Class')`;
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

// Renewal revenue per renewed membership: each package that renews produces one renewal purchase.
function ticketPerRenewal(ids: number[], from: string, to: string) {
  const revenue = (
    db
      .prepare(
        `SELECT COALESCE(SUM(amount),0) v FROM transactions WHERE studio_id IN (${ids.map(() => '?').join(',')})
         AND revenue_stream='renewal' AND month BETWEEN ? AND ?`,
      )
      .get(...ids, from, to) as any
  ).v;
  const renewed = (
    db
      .prepare(
        `SELECT COUNT(*) n FROM customer_packages WHERE studio_id IN (${ids.map(() => '?').join(',')})
         AND status='Renewed' AND end_date>=? AND end_date<? AND NOT ${NON_RENEWABLE}`,
      )
      .get(...ids, `${from}-01`, `${shift(to, 1)}-01`) as any
  ).n;
  return { value: renewed ? revenue / renewed : null, buyers: renewed };
}

function trialToMember(ids: number[], from: string, to: string) {
  const r = db
    .prepare(
      `SELECT COUNT(*) n, SUM(CASE WHEN first_purchase_at IS NOT NULL AND julianday(first_purchase_at)-julianday(first_visit_at) BETWEEN 0 AND 90 THEN 1 ELSE 0 END) c
       FROM member_visits WHERE studio_id IN (${ids.map(() => '?').join(',')}) AND month BETWEEN ? AND ?`,
    )
    .get(...ids, from, to) as any;
  return { value: r.n ? r.c / r.n : null, n: r.n };
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
  // Lead capture is patchy at some venues (walk-ins skip the CRM); a ratio above 90% means leads are under-logged.
  const value = leads >= MIN_SAMPLE && trials / leads <= 0.9 ? trials / leads : null;
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

// Lapsed 61–365 days before the month starts, with no newer package: the reactivation pool.
function lapsedPool(ids: number[], month: string) {
  const start = `${month}-01`;
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

function price(studioId: number, names: string[]) {
  for (const name of names) {
    const p = db
      .prepare('SELECT list_price FROM products WHERE studio_id=? AND name=? AND active=1 AND list_price>1')
      .get(studioId, name) as any;
    if (p) return Number(p.list_price);
  }
  return null;
}

export function planEconomics(studioId: number, year: number) {
  const ids = studioIds(studioId),
    to = latestComplete(),
    from = shift(to, -11),
    // Conversion needs 90 days to mature, so the trial cohort window ends three months earlier.
    trialTo = shift(to, -3),
    trialFrom = shift(trialTo, -11);
  const trailing = {
    firstSpend: spendPerBuyer(ids, 'new_client', from, to, `AND NOT ${TRIAL_PRODUCT}`),
    trialSpend: spendPerBuyer(ids, 'new_client', from, to, `AND ${TRIAL_PRODUCT}`),
    renewalTicket: ticketPerRenewal(ids, from, to),
    reactivationTicket: spendPerBuyer(ids, 'reactivation', from, to),
    trialToMember: trialToMember(ids, trialFrom, trialTo),
    leadToTrial: leadToTrial(ids, from, to),
    renewalRate: renewalRate(ids, from, to),
  };
  const prices = {
    oneMonth: price(studioId, ['Studio 1 Month Unlimited Membership', 'Studio 1 Month Unlimited']),
    threeMonth: price(studioId, ['Studio 3 Month Unlimited Membership', 'Studio 3 Month Unlimited']),
    sixMonth: price(studioId, ['Studio 6 Month Unlimited Membership', 'Studio 6 Month Unlimited']),
    annual: price(studioId, ['Studio Annual Unlimited Membership', 'Studio Annual Unlimited']),
    privates: price(studioId, ['Studio Private Class X 10', 'Studio 4 Private Class Package']),
  };
  const targets = db
    .prepare('SELECT * FROM monthly_targets WHERE studio_id=? AND year=? ORDER BY month')
    .all(studioId, year) as any[];

  const months = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1,
      key = `${year}-${String(month).padStart(2, '0')}`,
      ly = shift(key, -12);
    // Same calendar month in the most recent year we have data for.
    const season = ly <= to ? ly : shift(ly, -12);
    const s = {
      firstSpend: spendPerBuyer(ids, 'new_client', season, season, `AND NOT ${TRIAL_PRODUCT}`),
      renewalTicket: ticketPerRenewal(ids, season, season),
      trialToMember: trialToMember(ids, season, season),
      leadToTrial: leadToTrial(ids, season, season),
      renewalRate: renewalRate(ids, season, season),
    };
    const firstSpend = blend(trailing.firstSpend.value, s.firstSpend.value, s.firstSpend.buyers) || 0,
      renewalTicket = blend(trailing.renewalTicket.value, s.renewalTicket.value, s.renewalTicket.buyers) || 0,
      reactivationTicket = trailing.reactivationTicket.value || firstSpend,
      t2m = blend(trailing.trialToMember.value, s.trialToMember.value, s.trialToMember.n) || 0.25,
      l2t = blend(trailing.leadToTrial.value, s.leadToTrial.value, s.leadToTrial.n) ?? 0.35,
      rRate = blend(trailing.renewalRate.value, s.renewalRate.value, s.renewalRate.n) || 0.6;

    const t = targets.find(x => x.month === month);
    const selected = t ? Number(t.approved_target ?? t.proposed_target) || 0 : 0,
      scale = t && Number(t.proposed_target) ? selected / Number(t.proposed_target) : 1;
    const newTarget = (Number(t?.new_client_target) || 0) * scale,
      renewalTarget = (Number(t?.renewal_target) || 0) * scale,
      reactivationTarget = (Number(t?.reactivation_target) || 0) * scale;

    // New-client revenue = members × first membership spend + trials × trial spend, and trials = members ÷ t2m,
    // so members = target ÷ (first spend + trial spend ÷ t2m).
    const trialSpend = trailing.trialSpend.value || 0,
      perMember = firstSpend + (t2m ? trialSpend / t2m : 0);
    const buyers = perMember ? ceil(newTarget / perMember) : 0,
      trials = t2m ? ceil(buyers / t2m) : 0,
      leads = l2t ? ceil(trials / l2t) : 0,
      reactivations = reactivationTicket ? ceil(reactivationTarget / reactivationTicket) : 0;

    // Expiries already on the books, and last year's count for the same month as the baseline for what will be sold
    // between now and then.
    const booked = expiries(ids, key, true),
      baseline = expiries(ids, season, false);
    const projectedExpiries = Math.max(booked.n, baseline.n),
      expectedRenewers = Math.round(projectedExpiries * rRate),
      expectedRenewal = expectedRenewers * renewalTicket,
      renewalGap = Math.max(0, renewalTarget - expectedRenewal),
      renewersNeeded = renewalTicket ? ceil(renewalTarget / renewalTicket) : 0;
    const pool = lapsedPool(ids, key);

    return {
      month,
      newClient: {
        target: newTarget,
        firstSpend,
        trialSpend,
        trialRevenue: trials * trialSpend,
        trialToMember: t2m,
        leadToTrial: l2t,
        buyers,
        trials,
        leads,
        samples: {
          firstSpendBuyers: trailing.firstSpend.buyers,
          trialCohort: trailing.trialToMember.n,
          leadCohort: trailing.leadToTrial.n,
          seasonalMonth: season,
          seasonalFirstSpend: s.firstSpend.value,
          seasonalTrialToMember: s.trialToMember.n >= MIN_SAMPLE ? s.trialToMember.value : null,
        },
      },
      renewal: {
        target: renewalTarget,
        bookedExpiries: booked.n,
        bookedValue: booked.value,
        baselineExpiries: baseline.n,
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
      alternates:
        renewalGap > 0 ? alternateSources(renewalGap, { expectedRenewers, pool, reactivationTicket, prices }) : [],
    };
  });
  return {
    window: { from, to, trialFrom, trialTo },
    trailing: Object.fromEntries(Object.entries(trailing).map(([k, v]) => [k, v.value])),
    prices,
    months,
  };
}

// When booked renewals can't carry the renewal target, size the cheapest ways to close the gap (largest first),
// each capped at a realistic share of its audience.
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
    threeMonth && oneMonth ? threeMonth - oneMonth : null,
    Math.round(c.expectedRenewers * 0.25),
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
    Math.round(c.pool * 0.04),
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
