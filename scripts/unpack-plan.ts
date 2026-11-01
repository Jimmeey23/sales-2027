import fs from 'node:fs';
import path from 'node:path';

/* The other half of scripts/build-kc-plan.ts: a `p57-sales-plan/1` document, taken apart into
   the month files the builder assembles.

     npx tsx scripts/unpack-plan.ts path/to/plan.json           → server/data/kc-2027/month-01..12.json
     npx tsx scripts/unpack-plan.ts path/to/plan.json --check    → report, write nothing

   This is how a plan that was authored elsewhere becomes the source of truth in the repo: the
   document is not paraphrased, its months are written out as they are. Only the two fields the
   builder derives again (`name`, `growthPercent`) are dropped, so build(unpack(x)) is x. */

const args = process.argv.slice(2);
const file = args.find(arg => !arg.startsWith('--'));
const check = args.includes('--check');
const dir = path.join(process.cwd(), 'server', 'data', 'kc-2027');

if (!file) {
  console.error('Usage: npx tsx scripts/unpack-plan.ts <plan.json> [--check]');
  process.exit(1);
}

const document = JSON.parse(fs.readFileSync(file, 'utf8'));
if (!/^p57-sales-plan\/\d+$/.test(String(document.schema || ''))) {
  console.error(`Not a plan document: expected a p57-sales-plan/N schema, found “${document.schema || 'none'}”.`);
  process.exit(1);
}
const studios = Array.isArray(document.studios) ? document.studios.filter(Boolean) : [];
const studio = studios.length === 1 ? studios[0] : null;
if (!studio) {
  console.error(`Expected exactly one location in the document, found ${studios.length}.`);
  process.exit(1);
}
const months = Array.isArray(studio.months) ? studio.months : [];
if (months.length !== 12) {
  console.error(`Expected 12 months, found ${months.length}.`);
  process.exit(1);
}

// Fields the builder writes from the year block, not from the month.
const DERIVED = new Set(['name', 'growthPercent']);

const written: string[] = [];
for (const month of months) {
  const number = Number(month.month);
  if (!Number.isInteger(number) || number < 1 || number > 12) {
    console.error(`A month is numbered “${month.month}”, which is not 1–12.`);
    process.exit(1);
  }
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(month)) if (!DERIVED.has(key)) out[key] = value;
  const target = path.join(dir, `month-${String(number).padStart(2, '0')}.json`);
  written.push(
    `month-${String(number).padStart(2, '0')}.json · ${month.theme || '(no theme)'} · ₹${Number(month.target || 0).toLocaleString('en-IN')} · ${(month.offers || []).length} offers`,
  );
  if (!check) fs.writeFileSync(target, `${JSON.stringify(out, null, 2)}\n`);
}

/* The year contract goes beside the months: the location, the year block, the basis, the
   measured window, the trailing rates and the price book exactly as the document states them,
   so scripts/build-kc-plan.ts rebuilds the same document instead of substituting its own. */
const envelope = {
  schema: document.schema,
  generatedAt: document.generatedAt,
  year: document.year,
  currency: document.currency,
  units: document.units,
  studio: studio.studio,
  yearBlock: studio.year,
  offers: months.reduce((total: number, month: any) => total + (month.offers || []).length, 0),
  basis: studio.basis,
  measuredWindow: studio.measuredWindow,
  trailing: studio.trailing,
  prices: studio.prices,
};
if (!check) fs.writeFileSync(path.join(dir, 'year.json'), `${JSON.stringify(envelope, null, 2)}\n`);

console.log(
  `${check ? 'Would write' : 'Wrote'} ${written.length} month files in ${path.relative(process.cwd(), dir)}:`,
);
for (const line of written) console.log(`  ${line}`);
const offers = months.reduce((total: number, month: any) => total + (month.offers || []).length, 0);
const target = months.reduce((total: number, month: any) => total + Number(month.target || 0), 0);
console.log(`Year: ₹${target.toLocaleString('en-IN')} across ${offers} offers.`);
if (!check)
  console.log(
    '\nNext: npx tsx scripts/build-kc-plan.ts, then npm run plan:import-json -- server/data/kc-2027/plan-2027.json --studio=1 --mode=replace --write',
  );
