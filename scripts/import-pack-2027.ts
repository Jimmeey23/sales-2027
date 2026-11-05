#!/usr/bin/env npx tsx
/* Load the P57 2027 Sales Plan Pack (converted by scripts/pack-to-plan.py) through the
   app's own plan importer, in replace mode, for every location it names.
     npx tsx scripts/import-pack-2027.ts [server/data/pack-2027/plan-2027.json] [--dry] */
import 'dotenv/config';
import fs from 'node:fs';
import { db } from '../server/db.js';
import { applySalesPlans, parseSalesPlanSet, previewSalesPlan, resolveStudioId } from '../server/lib/salesPlanImport.js';

const file = process.argv.slice(2).find(a => !a.startsWith('--')) || 'server/data/pack-2027/plan-2027.json';
const dry = process.argv.includes('--dry');
const set = parseSalesPlanSet(JSON.parse(fs.readFileSync(file, 'utf8')));
const studios = db.prepare('SELECT id,name,code,aliases FROM studios ORDER BY id').all() as any[];
const userId = (db.prepare("SELECT id FROM users WHERE role='administrator' AND active=1 ORDER BY id LIMIT 1").get() as any)?.id ?? null;
const context = { year: set.year, mode: 'replace' as const, approve: true, useRates: true, userId };

for (const d of set.documents)
  console.log(d.studioName, '→ studio', resolveStudioId(studios, { id: d.studioId, name: d.studioName }), '·', d.months.length, 'months ·', d.totals.offers, 'offers · target', d.totals.target);
if (dry) process.exit(0);
const result = db.transaction(() => applySalesPlans(set, context, studios))();
if (result.unresolved.length) throw new Error(`Unmatched locations: ${JSON.stringify(result.unresolved)}`);
for (const s of result.studios) console.log('imported', s.studio?.name, JSON.stringify(s.result).slice(0, 200));
