/* Rebuilds the two Mumbai studio playbooks in src/data/2027Playbooks.ts from the plan of record
   (via src/data/approvedPlan2027.ts), so the Insights finding and the Revenue tab quote the same
   target, funnel and lead offer as the month plans.

     npx tsx scripts/refresh-mumbai-playbooks.ts && npx prettier --write src/data/2027Playbooks.ts

   ttmGrowth and the sourceName are measured history and kept; the lapsed pool (lapsedTouches)
   is a measured snapshot the portfolio does not carry, so it is kept too. */
import fs from 'node:fs';
import { PLAYBOOKS_2027 } from '../src/data/2027Playbooks';
import { APPROVED_PLAN_2027, approvedOffer } from '../src/data/approvedPlan2027';

const FILE = 'src/data/2027Playbooks.ts';
const plan = JSON.parse(fs.readFileSync('server/data/portfolio-2027/v5-portfolio.json', 'utf8'));
const CODE: Record<string, string> = { 'Kemps Corner': 'KH', Bandra: 'SHQ' };
const L1 = (v: number) => Math.round(v / 10000) / 10;
const N = (v: number) => Math.round(v).toLocaleString('en-IN');

const next: any = structuredClone(PLAYBOOKS_2027);
for (const [studio, pb] of Object.entries<any>(next)) {
  const s = plan.studios.find((x: any) => x.studio.code === CODE[studio]);
  const entries = APPROVED_PLAN_2027.filter(e => e.studio === studio).sort((a, b) => a.month - b.month);
  pb.annualL = L1(s.year.target);
  pb.months = s.months.map((m: any, i: number) => {
    const e = entries[i];
    const due = e.figures.renewals[0];
    return {
      revenueL: L1(m.target),
      objective: m.objective,
      offer: (approvedOffer(e, 'newcomer') || e.offers[0]).name,
      leads: m.funnel.leads,
      trials: m.funnel.trials,
      buyers: m.funnel.newBuyers,
      renewalPurchases: m.funnel.existingPayingRenewals,
      reactivated: m.funnel.winbacksNeeded,
      lapsedTouches: pb.months[i]?.lapsedTouches ?? 0,
      renewalsDue: due,
      vs2026: Math.round(m.growthPercent),
    };
  });
  const sum = (k: string) => pb.months.reduce((t: number, m: any) => t + (m[k] || 0), 0);
  const y = s.year.streams;
  pb.insight = `Plan of record: ₹${pb.annualL.toFixed(1)}L target (+${s.year.growthPercent}% on ₹${L1(s.year.priorYear).toFixed(1)}L) — new clients ₹${L1(y.newClient).toFixed(1)}L, renewals ₹${L1(y.renewal).toFixed(1)}L, reactivation ₹${L1(y.reactivation).toFixed(1)}L.`;
  pb.priority = `${N(sum('leads'))} leads → ${N(sum('trials'))} trials → ${N(sum('buyers'))} new buyers; ${N(sum('renewalPurchases'))} renewal purchases of ${N(sum('renewalsDue'))} due; ${N(sum('reactivated'))} reactivated.`;
}

const src = fs.readFileSync(FILE, 'utf8');
const start = src.indexOf('export const PLAYBOOKS_2027');
const end = src.indexOf('\n};\n', start) + 4;
const body = `export const PLAYBOOKS_2027: Record<string, StudioPlaybook> = ${JSON.stringify(next, null, 2)};\n`;
const out = (src.slice(0, start) + body + src.slice(end))
  .replace(
    "// Mumbai studio playbooks. Numbers are a separate Base scenario (₹ lakh, incl. GST) and never\n// overwrite app targets; objectives, lead offers and summaries are from the final approved 2027 plan.",
    '// Mumbai studio playbooks (₹ lakh, incl. GST), generated from the 2027 plan of record by\n// scripts/refresh-mumbai-playbooks.ts: targets, funnels, objectives and lead offers match the month plans.',
  )
  .replace('// Each month of the final plan runs three journeys', '// Each month of the plan runs three journeys');
fs.writeFileSync(FILE, out);
console.log('Rewrote', Object.keys(next).join(', '));
