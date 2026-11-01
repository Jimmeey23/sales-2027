import fs from 'node:fs';
import path from 'node:path';

/* Builds the Kemps Corner 2027 plan document (p57-sales-plan/1) out of the month-by-month
   transcription in server/data/kc-2027, so the document the app imports is generated from one
   source of truth rather than hand-assembled:

     npx tsx scripts/build-kc-plan.ts          → server/data/kc-2027/plan-2027.json
     npm run plan:import-json -- server/data/kc-2027/plan-2027.json --studio=1 --mode=replace --write

   The year totals below are the document's own numbers; the script fails if the months no longer
   add up to them, which is the check that keeps a transcription typo out of the plan of record. */

const DIR = path.join(process.cwd(), 'server', 'data', 'kc-2027');
const OUT = path.join(DIR, 'plan-2027.json');

const EXPECTED = {
  target: 42_000_000,
  priorYear: 33_438_469,
  growthPercent: 25.6,
  offers: 55,
  streams: { newClient: 6_192_000, renewal: 26_410_544, reactivation: 5_287_456, other: 4_110_000 },
};

const STUDIO = { id: 1, name: 'Kemps Corner', city: 'Mumbai' };

type Month = Record<string, any> & {
  month: number;
  target: number;
  priorYear: number;
  streams: { newClient: number; renewal: number; reactivation: number; other: number };
  offers: any[];
};

const months: Month[] = fs
  .readdirSync(DIR)
  .filter(file => /^month-\d{2}\.json$/.test(file))
  .sort()
  .map(file => JSON.parse(fs.readFileSync(path.join(DIR, file), 'utf8')) as Month);

if (months.length !== 12) throw new Error(`Expected 12 month files, found ${months.length}.`);
months.forEach((month, index) => {
  if (month.month !== index + 1)
    throw new Error(`month-${String(index + 1).padStart(2, '0')} says month ${month.month}.`);
  const streamSum = month.streams.newClient + month.streams.renewal + month.streams.reactivation + month.streams.other;
  if (streamSum !== month.target)
    throw new Error(`Month ${month.month}: streams add up to ${streamSum}, target is ${month.target}.`);
});

const sum = (pick: (month: Month) => number) => months.reduce((total, month) => total + pick(month), 0);
const target = sum(month => month.target);
const priorYear = sum(month => month.priorYear);
const streamTotals = {
  newClient: sum(month => month.streams.newClient),
  renewal: sum(month => month.streams.renewal),
  reactivation: sum(month => month.streams.reactivation),
  other: sum(month => month.streams.other),
};
const offerCount = sum(month => month.offers.length);
const growthPercent = Number((((target - priorYear) / priorYear) * 100).toFixed(1));

const problems: string[] = [];
if (target !== EXPECTED.target) problems.push(`target ${target} ≠ ${EXPECTED.target}`);
if (priorYear !== EXPECTED.priorYear) problems.push(`prior year ${priorYear} ≠ ${EXPECTED.priorYear}`);
if (offerCount !== EXPECTED.offers) problems.push(`offers ${offerCount} ≠ ${EXPECTED.offers}`);
for (const key of Object.keys(EXPECTED.streams) as Array<keyof typeof EXPECTED.streams>) {
  if (streamTotals[key] !== EXPECTED.streams[key])
    problems.push(`${key} ${streamTotals[key]} ≠ ${EXPECTED.streams[key]}`);
}
if (problems.length) throw new Error(`The months no longer match the plan:\n  ${problems.join('\n  ')}`);

const document = {
  schema: 'p57-sales-plan/1',
  generatedAt: '2026-11-01T12:00:00+05:30',
  year: 2027,
  currency: 'INR',
  units: 'rupees',
  scope: { type: 'studio', studios: [STUDIO] },
  totals: {
    target,
    priorYear,
    growthPercent,
    offers: offerCount,
    streams: streamTotals,
  },
  studios: [
    {
      studio: STUDIO,
      year: {
        target,
        priorYear,
        growthPercent,
        streams: streamTotals,
      },
      basis: 'observed_history',
      measuredWindow: {
        current: '2025-10-01 → 2026-09-30',
        trial: '2025-07-01 → 2026-06-30',
        note: 'Twelve complete months of Kwality House trading, plus the trial window the trial-to-member rate is measured on.',
      },
      trailing: {
        firstSpend: 10694.114170854271,
        trialSpend: 1771.7326007326008,
        renewalTicket: 10416.355120718697,
        reactivationTicket: 11467.624133333333,
        trialToMember: 0.26865671641791045,
        leadToTrial: 0.8022922636103151,
        avgSpendPerVisit: 1727.1277977414722,
        renewalRate: 0.6613442257705161,
      },
      prices: {
        oneMonth: 20239,
        threeMonth: 57855,
        sixMonth: 113715,
        annual: 219450,
        twelveClassPack: 19688,
        privateThirty: 3333,
      },
      months,
    },
  ],
};

fs.writeFileSync(OUT, `${JSON.stringify(document, null, 2)}\n`);
const kb = (fs.statSync(OUT).size / 1024).toFixed(0);
console.log(
  `Wrote ${path.relative(process.cwd(), OUT)} — 12 months, ${offerCount} offers, ` +
    `₹${target.toLocaleString('en-IN')} (+${growthPercent}%), ${kb} KB.`,
);
