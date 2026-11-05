#!/usr/bin/env node
/* Splits one location out of a portfolio plan document.

     node scripts/portfolio-to-studio.mjs --studio=KH --out=server/data/kc-2027/plan-2027.json

   A portfolio document carries several locations; a studio document carries one. This is
   the bridge between them, and it is how `server/data/kc-2027/` is kept in step with the
   portfolio instead of drifting into a second, competing plan:

     node scripts/portfolio-to-studio.mjs --studio=KH --out=server/data/kc-2027/plan-2027.json
     npx tsx scripts/unpack-plan.ts server/data/kc-2027/plan-2027.json   # → year.json + month-01..12
     npx tsx scripts/build-kc-plan.ts                                    # → plan-2027.json again

   Nothing is paraphrased: the location's months come out as they are in the portfolio. */

import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const arg = name => args.find(a => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
const code = arg('studio');
const out = arg('out');
const input = arg('in') || 'server/data/portfolio-2027/v5-portfolio.json';

if (!code || !out) {
  console.error('Usage: node scripts/portfolio-to-studio.mjs --studio=KH --out=server/data/kc-2027/plan-2027.json [--in=...]');
  process.exit(1);
}

const plan = JSON.parse(fs.readFileSync(path.resolve(input), 'utf8'));
const block = plan.studios.find(s => s.studio.code === code);
if (!block) {
  console.error(`No location coded ${code} in ${input}. Found: ${plan.studios.map(s => s.studio.code).join(', ')}.`);
  process.exit(1);
}

const months = block.months;
const streams = {};
for (const key of ['newClient', 'renewal', 'reactivation', 'other'])
  streams[key] = months.reduce((s, m) => s + (m.streams[key] || 0), 0);

const document = {
  schema: plan.schema,
  generatedAt: plan.generatedAt,
  year: plan.year,
  currency: plan.currency,
  units: plan.units,
  origin: {
    portfolio: input,
    version: plan.version,
    studioCode: code,
    note: 'Extracted from the portfolio plan of record by scripts/portfolio-to-studio.mjs. The portfolio is the source; this document is a view of one location.',
  },
  scope: { type: 'studio', studios: [block.studio] },
  totals: {
    target: block.year.target,
    priorYear: block.year.priorYear,
    growthPercent: block.year.growthPercent,
    offers: months.reduce((s, m) => s + m.offers.length, 0),
    streams,
  },
  studios: [
    {
      studio: block.studio,
      year: { ...block.year, streams },
      basis: block.basis,
      measuredWindow: block.measuredWindow,
      trailing: block.trailing,
      prices: block.prices,
      months,
    },
  ],
};

fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
fs.writeFileSync(path.resolve(out), `${JSON.stringify(document, null, 2)}\n`);
console.log(
  `Wrote ${out} — ${block.studio.name} (${code}), ${months.length} months, ` +
  `${document.totals.offers} offers, ₹${block.year.target.toLocaleString('en-IN')} (+${block.year.growthPercent}%).`,
);
console.log('\nNext: npx tsx scripts/unpack-plan.ts ' + out + ', then npx tsx scripts/build-kc-plan.ts');
