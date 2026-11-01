import 'dotenv/config';
import fs from 'node:fs';
import { db } from '../server/db.js';
import {
  IMPORT_MODES,
  applySalesPlan,
  importedPlan,
  parseSalesPlan,
  previewSalesPlan,
  type ImportMode,
} from '../server/lib/salesPlanImport.js';

/* Importing a year plan from the command line, for the same document the app's Import plan
   dialog takes.

     npm run plan:import-json -- path/to/plan.json --studio=1 --mode=replace --approve

   Modes are the dialog's: add plans only months that are not planned yet, modify rewrites
   the months the file carries, replace makes the year exactly the document. The dry run is
   the default — pass --write to commit. */

const args = process.argv.slice(2);
const file = args.find(arg => !arg.startsWith('--'));
const flag = (name: string) => args.includes(`--${name}`);
const option = (name: string) => {
  const hit = args.find(arg => arg.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
};

if (!file) {
  console.error(
    'Usage: npm run plan:import-json -- <plan.json> [--studio=1] [--year=2027] [--mode=add|modify|replace] [--approve] [--no-rates] [--write]',
  );
  process.exit(1);
}

const mode = (option('mode') || 'modify') as ImportMode;
if (!IMPORT_MODES.includes(mode)) {
  console.error(`Unknown mode “${mode}”. Use ${IMPORT_MODES.join(', ')}.`);
  process.exit(1);
}

const plan = parseSalesPlan(fs.readFileSync(file, 'utf8'));
const studioArg = option('studio');
const studios = db.prepare('SELECT id,name FROM studios ORDER BY id').all() as Array<{ id: number; name: string }>;
const studioId =
  (studioArg ? Number(studioArg) : null) ??
  plan.studioId ??
  studios.find(studio => studio.name.toLowerCase() === String(plan.studioName || '').toLowerCase())?.id ??
  null;
if (!studioId || !studios.some(studio => studio.id === studioId)) {
  console.error(`Unknown location. This document names “${plan.studioName || 'none'}”.`);
  process.exit(1);
}
const year = Number(option('year')) || plan.year;
const admin =
  Number(
    (db.prepare("SELECT id FROM users WHERE role='administrator' AND active=1 ORDER BY id LIMIT 1").get() as any)?.id,
  ) || null;
const context = { studioId, year, mode, approve: flag('approve'), useRates: !flag('no-rates'), userId: admin };
const preview = previewSalesPlan(plan, context);
const lakh = (value: number) => `₹${(Number(value) / 100000).toFixed(2)}L`;

console.log(
  `${plan.schema} · ${studios.find(studio => studio.id === studioId)!.name} ${year} · mode ${mode} · target ${lakh(preview.totals.target)} · ${preview.totals.offers} offers`,
);
for (const month of preview.months)
  console.log(
    `  ${String(month.month).padStart(2, '0')} ${month.name.padEnd(9)} ${month.action.padEnd(6)} ${lakh(month.target).padStart(9)} · ${month.offers} offers (${month.offersCreate} new, ${month.offersUpdate} matched) · ${month.actions} actions`,
  );
for (const warning of preview.warnings) console.log(`  ! ${warning}`);
const previous = importedPlan(studioId, year);
if (previous) console.log(`  Previously imported ${previous.importedAt} (${previous.hash}).`);

if (!flag('write')) {
  console.log('\nDry run — nothing written. Re-run with --write to import.');
} else {
  const result = applySalesPlan(plan, context);
  console.log(
    `\nWritten: ${result.summary.months} months (${result.summary.created} new, ${result.summary.updated} updated), ${result.summary.offers} offer changes, ${result.assumptions} rates.`,
  );
}
