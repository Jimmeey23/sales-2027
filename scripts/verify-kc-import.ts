import fs from 'node:fs';
import { db } from '../server/db.js';

/* Reads the imported year back out of the database and compares it field by field with the
   document it came from. Anything the app would print differently shows up here rather than on
   a screen: themes, targets and streams, the funnel, notes, key dates, the Week 1–4 execution
   plan with its owners, and every offer's copy and economics. */

const file = process.argv[2];
if (!file) throw new Error('Usage: npx tsx scripts/verify-kc-import.ts <plan.json>');
const document = JSON.parse(fs.readFileSync(file, 'utf8'));
const studio = document.studios[0];

const targets = db
  .prepare('SELECT * FROM monthly_targets WHERE studio_id=1 AND year=2027 ORDER BY month')
  .all() as any[];
const plans = db.prepare('SELECT * FROM monthly_plans WHERE studio_id=1 AND year=2027 ORDER BY month').all() as any[];
const offers = db
  .prepare(
    `SELECT * FROM offers WHERE studio_id=1 AND year=2027 AND generation_source='plan_import' ORDER BY month, plan_rank`,
  )
  .all() as any[];

const problems: string[] = [];
const check = (label: string, actual: unknown, expected: unknown) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) problems.push(`${label}: ${actual} ≠ ${expected}`);
};

let rows = 0;
for (const month of studio.months) {
  const target = targets.find(row => row.month === month.month)!;
  const plan = plans.find(row => row.month === month.month)!;
  const content = JSON.parse(plan.content || '{}');
  const actions = JSON.parse(plan.actions || '[]');
  const expectedActions = (month.sections || []).reduce((n: number, s: any) => n + (s.items || []).length, 0);
  rows++;

  check(`M${month.month} theme`, plan.theme, month.theme);
  check(`M${month.month} objective`, plan.objective, month.objective);
  check(`M${month.month} strategy`, plan.strategy, month.strategy);
  check(`M${month.month} notes`, plan.notes, month.notes);
  check(`M${month.month} status`, plan.status, month.status || 'draft');
  check(`M${month.month} target`, Number(target.proposed_target), month.target);
  check(
    `M${month.month} streams`,
    {
      newClient: Number(target.new_client_target),
      renewal: Number(target.renewal_target),
      reactivation: Number(target.reactivation_target),
      other: Number(target.other_target),
    },
    month.streams,
  );
  check(`M${month.month} actions`, actions.length, expectedActions);
  check(`M${month.month} keyDates`, (content.keyDates || []).length, (month.keyDates || []).length);
  check(`M${month.month} sections`, (content.sections || []).length, (month.sections || []).length);
  check(`M${month.month} feasibility`, content.feasibility, month.feasibility);
  const monthOffers = offers.filter(row => row.month === month.month);
  check(`M${month.month} offers`, monthOffers.length, month.offers.length);
  for (const offer of month.offers) {
    const row = monthOffers.find(entry => entry.name === offer.name);
    if (!row) {
      problems.push(`M${month.month} offer missing: ${offer.name}`);
      continue;
    }
    check(`M${month.month} ${offer.name} slot`, row.plan_slot, offer.slot);
    check(`M${month.month} ${offer.name} headline`, row.headline, offer.headline);
    check(`M${month.month} ${offer.name} copy`, row.customer_copy, offer.customerCopy);
    check(`M${month.month} ${offer.name} revenue`, Number(row.expected_revenue), offer.expectedRevenue);
    check(`M${month.month} ${offer.name} buyers`, Number(row.target_purchases), offer.buyers);
    check(`M${month.month} ${offer.name} validity`, [row.validity_start, row.validity_end], [
      offer.validity?.start,
      offer.validity?.end,
    ]);
  }
}

const yearTarget = targets.reduce((sum, row) => sum + Number(row.proposed_target), 0);
const yearStreams = targets.reduce(
  (total, row) =>
    total +
    Number(row.new_client_target) +
    Number(row.renewal_target) +
    Number(row.reactivation_target) +
    Number(row.other_target),
  0,
);
check('year target', yearTarget, studio.year.target);
check('year streams', yearStreams, studio.year.target);
check('offer count', offers.length, document.totals.offers);

console.log(`${rows} months · ${offers.length} offers · year ₹${yearTarget.toLocaleString('en-IN')}`);
console.log(problems.length ? `\n${problems.length} differences:\n  ${problems.slice(0, 40).join('\n  ')}` : 'Every checked field matches the document.');
