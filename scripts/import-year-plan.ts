import 'dotenv/config';
import fs from 'node:fs';
import { db } from '../server/db.js';
import {
  IMPORT_MODES,
  applySalesPlans,
  importedPlan,
  parseSalesPlanSet,
  previewSalesPlan,
  resolveStudioId,
  type ImportMode,
  type SalesPlanDocument,
} from '../server/lib/salesPlanImport.js';

/* Importing a year plan from the command line, for the same document the app's Import plan
   dialog takes.

     npm run plan:import-json -- path/to/plan.json --studio=1 --mode=replace --approve
     npm run plan:import-json -- path/to/portfolio.json --mode=replace

   Modes are the dialog's: add plans only months that are not planned yet, modify rewrites
   the months the file carries, replace makes the year exactly the document. The dry run is
   the default — pass --write to commit.

   A document that names several locations is imported location by location: each one is
   matched to the workspace's studio by id, name, alias or code, and written on its own. */

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

const set = parseSalesPlanSet(fs.readFileSync(file, 'utf8'));
const studios = db.prepare('SELECT id,name,code,aliases FROM studios ORDER BY id').all() as Array<{
  id: number;
  name: string;
  code: string | null;
  aliases: string | null;
}>;
const studioArg = option('studio');
const year = Number(option('year')) || set.year;
const admin =
  Number(
    (db.prepare("SELECT id FROM users WHERE role='administrator' AND active=1 ORDER BY id LIMIT 1").get() as any)?.id,
  ) || null;
const context = { year, mode, approve: flag('approve'), useRates: !flag('no-rates'), userId: admin };
const lakh = (value: number) => `₹${(Number(value) / 100000).toFixed(2)}L`;

// A single location named on the command line wins, because that is what the flag is for —
// but only for a file that carries one location; a portfolio is never forced onto one studio.
const forced = studioArg ? Number(studioArg) : null;
if (forced && !studios.some(studio => studio.id === forced)) {
  console.error(`No studio with id ${forced}.`);
  process.exit(1);
}
if (forced && set.documents.length > 1) {
  console.error('This document describes several locations; import it as a portfolio without --studio.');
  process.exit(1);
}
const resolve = (document: SalesPlanDocument): number | null => {
  if (forced) return forced;
  return resolveStudioId(studios, { id: document.studioId, name: document.studioName });
};

const targets = set.documents.map(document => ({ document, studioId: resolve(document) }));
const unresolved = targets.filter(entry => !entry.studioId);
if (unresolved.length) {
  for (const entry of unresolved)
    console.error(
      `Unknown location: the document names “${entry.document.studioName || entry.document.studioId || 'none'}”, which is not a studio in this workspace.`,
    );
  process.exit(1);
}

if (set.documents.length > 1 || set.offerBank.length)
  console.log(
    `Portfolio ${set.version || ''} · ${targets.length} locations · ${set.year} · mode ${mode} · bank ${set.offerBank.length} offers`.replace(
      / +/g,
      ' ',
    ),
  );

const results: Array<{ studioId: number; preview: ReturnType<typeof previewSalesPlan> }> = [];
for (const { document, studioId } of targets) {
  const preview = previewSalesPlan(document, { ...context, studioId: studioId! });
  results.push({ studioId: studioId!, preview });
  const name = studios.find(studio => studio.id === studioId)!.name;
  console.log(
    `\n${document.schema} · ${name} ${document.year} · target ${lakh(preview.totals.target)} · ${preview.totals.offers} offers`,
  );
  for (const month of preview.months)
    console.log(
      `  ${String(month.month).padStart(2, '0')} ${month.name.padEnd(9)} ${month.action.padEnd(6)} ${lakh(month.target).padStart(9)} · ${month.offers} offers (${month.offersCreate} new, ${month.offersUpdate} matched) · ${month.actions} actions`,
    );
  for (const warning of preview.warnings) console.log(`  ! ${warning}`);
  const previous = importedPlan(studioId!, document.year);
  if (previous) console.log(`  Previously imported ${previous.importedAt} (${previous.hash}).`);
}

const total = results.reduce((sum, entry) => sum + entry.preview.totals.target, 0);
console.log(`\nPortfolio target ${lakh(total)} across ${results.length} location${results.length === 1 ? '' : 's'}.`);

if (!flag('write')) {
  console.log('Dry run — nothing written. Re-run with --write to import.');
} else {
  const applied = applySalesPlans(set, context, studios);
  for (const entry of applied.studios) {
    const summary = entry.result.summary;
    console.log(
      `Written: ${entry.studio?.name} — ${summary.months} months (${summary.created} new, ${summary.updated} updated), ${summary.offers} offer changes, ${entry.result.assumptions} rates.`,
    );
  }
  for (const entry of applied.unresolved)
    console.error(`  ! Skipped “${entry.name || entry.id}” — no studio in this workspace matches it.`);
  if (applied.context) {
    const { bank, policies, settings } = applied.context;
    console.log(
      `Portfolio context: ${bank.created} bank offers across ${bank.locations} locations (${bank.retired} retired), ${policies} policies, settings: ${settings.join(', ')}.`,
    );
  }
}
