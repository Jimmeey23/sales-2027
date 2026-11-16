/* Re-points the plan text inside src/data/playbook2027.ts (headline, diagnosis, lever notes,
   offers, months, rhythm and scorecard) at the plan of record, via src/data/approvedPlan2027.ts.

     npx tsx scripts/refresh-playbook-plan.ts && npx prettier --write src/data/playbook2027.ts

   The history-derived numbers (snapshot, build values, funnel, channels, slots, monthly,
   seasonality, entry products) need the raw exports and scripts/playbook2027; they are kept
   exactly as they are. Only the sentences that quote the plan are rewritten. */
import fs from 'node:fs';
import { PLAYBOOK_2027 } from '../src/data/playbook2027';
import { APPROVED_PLAN_2027, field, type ApprovedEntry, type ApprovedSlot } from '../src/data/approvedPlan2027';

const FILE = 'src/data/playbook2027.ts';
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const L = (v: number) => `₹${(v / 100000).toFixed(1)}L`;
const N = (v: number) => Math.round(v).toLocaleString('en-IN');
const TAG: Record<ApprovedSlot, string> = { newcomer: 'Acquisition', lapsed: 'Win-back', renewal: 'Renewal' };
const LEVER: Record<ApprovedSlot, string | null> = { newcomer: 'conversion', lapsed: 'winback', renewal: 'annual' };
const SLOT_WORD: Record<ApprovedSlot, string> = { newcomer: 'newcomer', lapsed: 'lapsed', renewal: 'renewal' };
const LEVER_SLOT: Record<string, ApprovedSlot> = {
  conversion: 'newcomer', leads: 'newcomer', referral: 'newcomer', winback: 'lapsed', discount: 'renewal', usage: 'renewal', annual: 'renewal',
};

const pb: any = structuredClone(PLAYBOOK_2027);
for (const [studio, s] of Object.entries<any>(pb.studios)) {
  const months = APPROVED_PLAN_2027.filter(e => e.studio === studio).sort((a, b) => a.month - b.month);
  if (months.length !== 12) throw new Error(`${studio}: ${months.length} plan months`);
  const sum = (f: (e: ApprovedEntry) => number) => months.reduce((t, e) => t + f(e), 0);
  const target = sum(e => e.figures.target);
  const offerRev = (e: ApprovedEntry) =>
    e.offers.reduce((t, o) => t + Number(/₹([\d.]+)L counted/.exec(field(o, 'Expected revenue'))?.[1] || 0) * 100000, 0);
  const planned = sum(offerRev);
  const names = (slot: ApprovedSlot) => [...new Set(months.flatMap(e => e.offers.filter(o => o.slot === slot).map(o => o.name)))];
  const list = (slot: ApprovedSlot) => names(slot).map(n => n.replace(/\.$/, '')).join(', ');
  const f = {
    renewal: sum(e => e.figures.renewalPlan), newClient: sum(e => e.figures.newClientPlan), reactivation: sum(e => e.figures.reactivationPlan),
    leads: sum(e => e.figures.leadsTrials[0]), trials: sum(e => e.figures.leadsTrials[1]), buyers: sum(e => e.figures.newBuyers),
    due: sum(e => e.figures.renewals[0]), renewed: sum(e => e.figures.renewals[1]),
    touches: sum(e => e.figures.lapsed[0]), reactivated: sum(e => e.figures.lapsed[1]),
  };
  const peak = months.reduce((a, b) => (b.figures.target > a.figures.target ? b : a));

  // The snapshot's own 2026 forecast was a separate estimate that disagreed with the Target
  // Breakdown and the Overview; the card shows the 2027 target against the measured TTM instead.
  const ttm = s.snapshot.find((r: any[]) => r[0] === 'TTM revenue');
  const ttmL = ttm ? Number(String(ttm[1]).replace(/[₹L,]/g, '')) * 100000 : 0;
  s.snapshot = s.snapshot.map((r: any[]) =>
    r[0] === '2026 forecast' || r[0] === '2027 target'
      ? ['2027 target', L(target), ttmL ? `${target >= ttmL ? '+' : ''}${Math.round((target / ttmL - 1) * 100)}% on the last 12 months` : 'plan of record', true]
      : r,
  );
  s.headline = `2027 plan of record: ${L(target)} target across twelve themed months; ${L(planned)} is carried by named offers and the rest is full-price trade.`;
  s.diagnosis = [
    { title: 'Renewals carry the year', stat: `${Math.round((f.renewal / target) * 100)}%`, detail: `Renewal plan ${L(f.renewal)} of ${L(target)}; ${N(f.renewed)} renewal purchases planned from ${N(f.due)} due.`, implication: `Renewal offers: ${list('renewal')}.` },
    { title: 'New clients', stat: N(f.buyers), detail: `New-client plan ${L(f.newClient)}: ${N(f.leads)} leads → ${N(f.trials)} trials → ${N(f.buyers)} new buyers.`, implication: `Newcomer offers: ${list('newcomer')}.` },
    { title: 'Lapsed clients', stat: N(f.reactivated), detail: `Reactivation plan ${L(f.reactivation)}: ${N(f.reactivated)} reactivated${f.touches ? ` from ${N(f.touches)} touches` : ''}.`, implication: `Lapsed offers: ${list('lapsed')}.` },
    { title: `Peak month: ${MON[peak.month - 1]}`, stat: L(peak.figures.target), detail: `${peak.theme} · ${peak.hook}.`, implication: peak.job },
  ];
  for (const lever of s.build.levers) {
    const slot = LEVER_SLOT[lever.id];
    if (slot) lever.why = `Plan of record: carried by the ${SLOT_WORD[slot]} offers — ${list(slot)}.`;
  }
  const byName = new Map<string, any>();
  for (const e of months)
    for (const o of e.offers) {
      const seen = byName.get(o.name);
      if (seen) { if (!seen.months.includes(MON[e.month - 1])) seen.months += `, ${MON[e.month - 1]}`; continue; }
      byName.set(o.name, {
        name: o.name, tag: TAG[o.slot], months: MON[e.month - 1], audience: field(o, 'Who qualifies'),
        mechanic: field(o, 'You pay'), economics: `${field(o, 'Effective discount')} ${field(o, 'Expected revenue')}`,
        logic: field(o, 'Why it works'), kpi: field(o, 'What to watch'), lever: LEVER[o.slot],
      });
    }
  s.offers = [...byName.values()];
  s.months = months.map(e => ({
    month: MON[e.month - 1], event: e.hook, theme: e.theme, focus: e.job,
    offers: e.offers.map(o => o.name), actions: e.offers.map(o => `${o.name}: ${o.tagline}`), why: e.moment,
  }));
  const watch = "Watch each offer's “What to watch” measures and rate of sale monthly.";
  s.rhythm = [
    ['Newcomer journey', `Offers: ${list('newcomer')}. ${watch}`],
    ['Lapsed journey', `Offers: ${list('lapsed')}. ${watch}`],
    ['Renewal journey', `Offers: ${list('renewal')}. ${watch}`],
  ];
  s.scorecard = [
    ['Leads → trials', N(f.leads), N(f.trials), 'Newcomer journeys'],
    ['Trials → new buyers', N(f.trials), N(f.buyers), 'Newcomer journeys'],
    ['Renewals due → purchases', N(f.due), N(f.renewed), 'Renewal journeys'],
    ['Lapsed touches → reactivated', f.touches ? N(f.touches) : '—', N(f.reactivated), 'Lapsed journeys'],
    ['Target → offers planned', L(target), L(planned), 'Plan of record'],
  ];
}

const src = fs.readFileSync(FILE, 'utf8');
const head = src.slice(0, src.indexOf('export const PLAYBOOK_2027'))
  .replace('offers, months, rhythm and scorecard text are from the final approved 2027 plan.', 'offers, months, rhythm and scorecard text are from the 2027 plan of record (scripts/refresh-playbook-plan.ts).');
fs.writeFileSync(FILE, `${head}export const PLAYBOOK_2027: PlaybookData = ${JSON.stringify(pb, null, 2)};\n`);
console.log(`Rewrote plan text for ${Object.keys(pb.studios).length} locations.`);
