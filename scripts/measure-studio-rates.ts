import { db } from '../server/db.js';
import { PLAN_ASSUMPTIONS_2027 } from '../server/lib/targetBreakdown.js';

// Measures the funnel and spend constants each location is planned on, straight from the imported
// history — leads → first visits, first visits → paying clients (a purchase inside 90 days), first
// month spend per new paying client, and monthly spend per existing paying client.
//
// The plan's requirement maths (leads, trials, buyers, paying members) divides by these numbers, so
// they must be the rates the studio actually delivers, not a hypothetical. Run this after a history
// import and paste the output into PLAN_ASSUMPTIONS_2027 (server/lib/targetBreakdown.ts).
//
//   npx tsx scripts/measure-studio-rates.ts          # table + copy-paste block
//   npx tsx scripts/measure-studio-rates.ts --check  # exit 1 when the constants have drifted
//   npx tsx scripts/measure-studio-rates.ts --json   # machine-readable

const NON_RENEWABLE = `(product_name LIKE '%Newcomer%' OR product_name LIKE '%2 For 1%' OR product_name LIKE '%Single Class'
  OR product_name LIKE '%Single Class Package' OR product_name LIKE 'Session%' OR product_name LIKE '%Retail%'
  OR product_name LIKE 'Money Credits%' OR product_name LIKE 'Test%' OR product_name LIKE '%Private Class' OR product_name LIKE 'Juniors%')`;
const TRIAL_PRODUCT = `(product_name LIKE '%Newcomer%' OR product_name LIKE '%2 For 1%' OR product_name LIKE '%Single Class' OR product_name LIKE '%Intro Pack%')`;

const STUDIOS = ['Kemps Corner', 'Bandra', 'Kenkere House', 'Copper + Cloves', 'Plash Pilates'];
const MIN_SAMPLE = 20;
// A measured rate may sit this far from the constant before --check complains (0.5 of a point).
const TOLERANCE = 0.005;

const shift = (ym: string, n: number) => {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};

/** Latest month with a full month of transactions behind it. */
function latestComplete() {
  const row = db.prepare('SELECT MAX(purchased_at) d FROM transactions').get() as any;
  const d = String(row?.d || '').slice(0, 10);
  if (d.length !== 10) return null;
  const [y, m] = d.split('-').map(Number);
  const complete = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10) === d;
  return complete ? `${y}-${String(m).padStart(2, '0')}` : shift(`${y}-${String(m).padStart(2, '0')}`, -1);
}

const ceil0 = (v: number) => Math.max(0, v);

function measure(studioId: number, from: string, to: string) {
  const ids = `studio_id = ? AND month BETWEEN ? AND ?`;
  const one = <T>(sql: string, ...p: any[]) => db.prepare(sql).get(...p) as T;

  const leads = (one<{ n: number }>(`SELECT COUNT(*) n FROM leads WHERE ${ids}`, studioId, from, to)?.n ?? 0) as number;

  const visitsRow = one<{ n: number; converted: number }>(
    `SELECT COUNT(*) n,
            SUM(CASE WHEN first_purchase_at IS NOT NULL
                      AND julianday(first_purchase_at) - julianday(first_visit_at) BETWEEN 0 AND 90
                     THEN 1 ELSE 0 END) converted
       FROM member_visits WHERE ${ids}`,
    studioId,
    from,
    to,
  );
  const visits = visitsRow?.n ?? 0;
  const converted = visitsRow?.converted ?? 0;

  // First month spend: what a new paying client actually pays, trial/intro tickets excluded.
  const first = one<{ members: number; revenue: number }>(
    `SELECT COUNT(DISTINCT member_ref) members, COALESCE(SUM(amount),0) revenue
       FROM transactions
      WHERE ${ids} AND revenue_stream='new_client' AND amount>0 AND NOT ${TRIAL_PRODUCT}`,
    studioId,
    from,
    to,
  );
  const trial = one<{ n: number; revenue: number }>(
    `SELECT COUNT(*) n, COALESCE(SUM(amount),0) revenue
       FROM transactions
      WHERE ${ids} AND revenue_stream='new_client' AND amount>0 AND ${TRIAL_PRODUCT}`,
    studioId,
    from,
    to,
  );

  // Monthly spend per existing paying client: renewal/reactivation/additional revenue over the
  // members who produced it, averaged across the window's months.
  const perMonth = db
    .prepare(
      `SELECT month,
              COUNT(DISTINCT member_ref) members,
              COALESCE(SUM(amount),0) revenue
         FROM transactions
        WHERE ${ids} AND amount>0 AND revenue_stream!='new_client'
        GROUP BY month ORDER BY month`,
    )
    .all(studioId, from, to) as Array<{ members: number; revenue: number }>;
  const existingSpend = perMonth.length
    ? perMonth.reduce((sum, r) => sum + (r.members ? r.revenue / r.members : 0), 0) / perMonth.length
    : 0;

  const renewal = one<{ revenue: number; tx: number }>(
    `SELECT COALESCE(SUM(amount),0) revenue, COUNT(*) tx
       FROM transactions WHERE ${ids} AND revenue_stream='renewal' AND amount>0`,
    studioId,
    from,
    to,
  );
  const renewed = one<{ n: number }>(
    `SELECT COUNT(*) n FROM customer_packages
      WHERE studio_id=? AND status='Renewed' AND end_date>=? AND end_date<? AND NOT ${NON_RENEWABLE}`,
    studioId,
    `${from}-01`,
    `${shift(to, 1)}-01`,
  );
  const renewalDenom = Math.max(renewal?.tx ?? 0, renewed?.n ?? 0);

  const reactivation = one<{ members: number; revenue: number }>(
    `SELECT COUNT(DISTINCT member_ref) members, COALESCE(SUM(amount),0) revenue
       FROM transactions WHERE ${ids} AND revenue_stream='reactivation' AND amount>0`,
    studioId,
    from,
    to,
  );

  const closed = one<{ renewed: number; closed: number }>(
    `SELECT SUM(status='Renewed') renewed, SUM(status IN ('Renewed','Lapsed')) closed
       FROM customer_packages
      WHERE studio_id=? AND end_date>=? AND end_date<? AND NOT ${NON_RENEWABLE}`,
    studioId,
    `${from}-01`,
    `${shift(to, 1)}-01`,
  );

  const leadToVisit = leads >= MIN_SAMPLE && visits > 0 && visits / leads <= 0.95 ? visits / leads : null;
  const payingPerVisit = visits >= MIN_SAMPLE ? converted / visits : null;

  return {
    leads,
    visits,
    converted,
    leadToVisit,
    payingPerVisit,
    firstMonthSpend: first?.members ? first.revenue / first.members : null,
    firstBuyers: first?.members ?? 0,
    trialSpend: trial?.n ? trial.revenue / trial.n : null,
    existingSpend: existingSpend || null,
    renewalTicket: renewalDenom ? renewal.revenue / renewalDenom : null,
    renewalRate: closed?.closed ? closed.renewed / closed.closed : null,
    reactivationTicket: reactivation?.members ? reactivation.revenue / reactivation.members : null,
    reactivationBuyers: reactivation?.members ?? 0,
  };
}

const r3 = (v: number | null) => (v == null ? '—' : v.toFixed(3));
const money = (v: number | null) => (v == null ? '—' : Math.round(v).toLocaleString('en-IN'));

const to = latestComplete();
if (!to) {
  console.error('No transaction history to measure. Import history first.');
  process.exit(1);
}
const from = shift(to, -11);
const json = process.argv.includes('--json');
const check = process.argv.includes('--check');

const rows = STUDIOS.map(name => {
  const studio = db.prepare('SELECT id FROM studios WHERE name=?').get(name) as any;
  const m = studio ? measure(studio.id, from, to) : null;
  return { name, studioId: studio?.id ?? null, measured: m };
}).filter(r => r.measured);

if (json) {
  console.log(JSON.stringify({ window: { from, to }, studios: rows }, null, 2));
  process.exit(0);
}

console.log(`Measured ${from} → ${to} (trailing 12 complete months)\n`);
const head = ['location', 'leads', 'trials', 'lead→trial', 'trial→pay', '1st spend', 'existing / mo', 'renewal ₹'];
const table = rows.map(r => {
  const m = r.measured!;
  return [
    r.name,
    String(m.leads),
    String(m.visits),
    r3(m.leadToVisit),
    r3(m.payingPerVisit),
    money(m.firstMonthSpend),
    money(m.existingSpend),
    money(m.renewalTicket),
  ];
});
const widths = head.map((h, i) => Math.max(h.length, ...table.map(t => t[i].length)));
const line = (cells: string[]) => cells.map((c, i) => c.padEnd(widths[i])).join('  ');
console.log(line(head));
console.log(line(widths.map(w => '─'.repeat(w))));
table.forEach(t => console.log(line(t)));

// Drift against the constants the plan is currently built on.
const drift: string[] = [];
for (const row of rows) {
  const a = PLAN_ASSUMPTIONS_2027[row.name];
  const m = row.measured!;
  if (!a) continue;
  // Rates move in points, money in rupees — so each key carries its own tolerance.
  const pairs: Array<[string, number | null, number, number]> = [
    ['leadToVisit', m.leadToVisit, a.leadToVisit, TOLERANCE],
    ['payingPerVisit', m.payingPerVisit, a.payingPerVisit, TOLERANCE],
    ['firstMonthSpend', m.firstMonthSpend, a.firstMonthSpend, 50],
    ['existingSpend', m.existingSpend, a.existingSpend, 50],
  ];
  for (const [key, measured, constant, tolerance] of pairs) {
    if (measured == null) continue;
    const delta = Math.abs(measured - constant);
    if (delta > tolerance) {
      drift.push(
        `${row.name}.${key}: plan ${constant} vs history ${measured.toFixed(3)} (${(measured - constant >= 0 ? '+' : '') + (measured - constant).toFixed(3)})`,
      );
    }
  }
}

console.log('\nCopy into server/lib/targetBreakdown.ts › PLAN_ASSUMPTIONS_2027\n');
for (const row of rows) {
  const m = row.measured!;
  console.log(`  '${row.name}': {`);
  console.log(`    firstMonthSpend: ${m.firstMonthSpend ? Math.round(m.firstMonthSpend) : 'null'},`);
  console.log(`    payingPerVisit: ${m.payingPerVisit?.toFixed(3) ?? 'null'},`);
  console.log(`    leadToVisit: ${m.leadToVisit?.toFixed(3) ?? 'null'},`);
  console.log(`    visitToPackage: ${m.payingPerVisit?.toFixed(3) ?? 'null'},`);
  console.log(`    existingSpend: ${m.existingSpend ? Math.round(m.existingSpend) : 'null'},`);
  console.log('  },');
}

if (check) {
  if (!drift.length) {
    console.log('\nConstants match the measured history.');
    process.exit(0);
  }
  console.error('\nConstants have drifted from the measured history:');
  drift.forEach(d => console.error(`  · ${d}`));
  process.exit(1);
}

if (drift.length) {
  console.log('\nDrift against PLAN_ASSUMPTIONS_2027:');
  drift.forEach(d => console.log(`  · ${d}`));
  process.exit(ceil0(0));
}
