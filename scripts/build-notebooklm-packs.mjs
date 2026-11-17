#!/usr/bin/env node
/* Builds the NotebookLM source packs (one per studio × month) from the plan the app shows:
   monthly_plans, monthly_targets and offers in the local database (p57-data/studio.db,
   synced from Supabase by the dev server). Rerun whenever the plan changes.

   Output: docs/notebooklm/<Studio>/<MM-Month>/
     SOURCE - <Studio> <Month> 2027.md   upload this as the notebook's only source
     PASTE INTO NOTEBOOKLM.txt           Video Overview instructions
     SAVE VIDEO AS.txt                   the app's file name for the finished video

   Run: node scripts/build-notebooklm-packs.mjs
*/
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');

const YEAR = 2027;
const DB = process.env.DATABASE_PATH || path.resolve('p57-data/studio.db');
const OUT = path.resolve('docs/notebooklm');
const STUDIOS = ['Bandra', 'Kemps Corner', 'Kenkere House', 'Pop-up'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const SLOT_ORDER = ['newcomer', 'new_client', 'lapsed', 'reactivation', 'renewal', 'retention', 'upsell', 'spot'];

const db = new Database(DB, { readonly: true });
const slugOf = s => s.toLowerCase().replace(/[()]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const json = (v, fallback) => { try { return v ? JSON.parse(v) : fallback; } catch { return fallback; } };

// Indian grouping: 2390000 -> ₹23,90,000; lakhs -> ₹23.9L
const inr = n => '₹' + Math.round(n).toLocaleString('en-IN');
const lakh = n => '₹' + (Math.round(n / 10000) / 10).toFixed(1).replace(/\.0$/, '') + 'L';
const money = n => (n >= 100000 ? `${lakh(n)} (${inr(n)})` : inr(n));
const pct = n => `${Math.round(n)}%`;

function prompt(studio, month) {
  return `Make this an upbeat, energetic team briefing for the ${studio} studio of Physique 57 India, covering its ${month} ${YEAR} sales plan.

- Title it exactly: "${studio}: ${month} ${YEAR} Sales Plan". The year is ${YEAR}. Never say or show 2026 as the plan year.
- Name the studio (${studio}) on the title card and in the closing.
- Follow this order: the theme and focus, the revenue target, where the money comes from, the leads-to-trials-to-buyers funnel, each offer in turn, the week-by-week plan, activation and channels, and a closing call to action.
- Every offer must use its exact name from the source, and its exact mechanics, price, dates and audience. Do not invent, rename or merge offers, and do not mention any offer that is not in the source.
- Use the exact numbers in the source. Do not round, invent or add any figures.
- Show money in Indian rupees using lakh (for example ₹23.9L).
- Keep the playful tone of the offer names.
- Audience: studio managers and the sales team. Aim for 5 to 7 minutes.
`;
}

let built = 0;
const missing = [];
for (const studio of STUDIOS) {
  const s = db.prepare('select id from studios where name = ?').get(studio);
  if (!s) { missing.push(`${studio}: studio not found`); continue; }
  MONTHS.forEach((month, i) => {
    const m = i + 1;
    const mm = String(m).padStart(2, '0');
    const plan = db.prepare('select * from monthly_plans where studio_id = ? and year = ? and month = ?').get(s.id, YEAR, m);
    const target = db.prepare('select * from monthly_targets where studio_id = ? and year = ? and month = ?').get(s.id, YEAR, m);
    if (!plan || !target) { missing.push(`${studio} ${month}: no plan or target`); return; }

    const slots = json(plan.slots, {});
    const extra = json(plan.offer_ids, []);
    const ids = [...new Set([
      ...Object.entries(slots).sort(([a], [b]) => SLOT_ORDER.indexOf(a) - SLOT_ORDER.indexOf(b)).map(([, id]) => id),
      ...extra,
    ].filter(Boolean))];
    const offers = ids.map(id => db.prepare('select * from offers where id = ?').get(id)).filter(Boolean);
    const funnel = json(target.funnel, {});
    const actions = json(plan.actions, []);
    const goal = target.approved_target ?? target.proposed_target;

    const L = [];
    L.push(`# Physique 57 India · ${studio} · ${month} ${YEAR} Sales Plan`, '');
    L.push(`**Studio:** ${studio}  `, `**Month:** ${month} ${YEAR}  `,
      `**Plan year:** ${YEAR}. Every target here is for ${month} ${YEAR}; "last year" means ${month} 2026.`, '');
    L.push(`This is the complete, approved sales plan for this studio and month. It has exactly ${offers.length} offer${offers.length === 1 ? '' : 's'}; there are no others.`, '');
    L.push('## Theme and focus', '', `**Theme:** ${plan.theme}`, '');
    if (plan.objective) L.push(`**Objective:** ${plan.objective}`, '');
    if (plan.strategy) L.push(`**Strategy:** ${plan.strategy}`, '');

    L.push('## The revenue target', '');
    L.push(`- ${month} ${YEAR} target: **${money(goal)}**`);
    if (target.historical_revenue) L.push(`- ${month} 2026 actual: ${money(target.historical_revenue)}`);
    if (target.target_growth != null) L.push(`- Growth on last year: ${pct(target.target_growth)}`);
    L.push('');

    L.push('## Where the money comes from', '');
    const streams = [
      ['Renewals', target.renewal_target],
      ['New clients', target.new_client_target],
      ['Comebacks (lapsed clients returning)', target.reactivation_target],
      ['Repeat purchases', target.repeat_target],
      ['Privates, retail, drop-ins and other', target.other_target],
    ].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
    for (const [label, v] of streams) L.push(`- ${label}: ${money(v)} (${pct((v / goal) * 100)} of target)`);
    L.push('');

    if (funnel.leads || funnel.buyers) {
      L.push('## The funnel: who has to walk in', '');
      if (funnel.leads) L.push(`- Leads: ${funnel.leads}`);
      if (funnel.trials) L.push(`- Trials: ${funnel.trials}`);
      if (funnel.newBuyers ?? funnel.buyers) L.push(`- New buyers: ${funnel.newBuyers ?? funnel.buyers}`);
      if (funnel.trials && (funnel.newBuyers ?? funnel.buyers)) L.push(`- Trial-to-buyer conversion: ${pct(((funnel.newBuyers ?? funnel.buyers) / funnel.trials) * 100)}`);
      if (funnel.renewalsDue) L.push(`- Renewals due this month: ${funnel.renewalsDue}; renewals planned: ${funnel.renewals ?? '—'}${funnel.renewalCoverage ? ` (${pct(funnel.renewalCoverage * 100)} of those due)` : ''}`);
      if (funnel.winbacksNeeded) L.push(`- Lapsed clients to win back: ${funnel.winbacksNeeded}`);
      L.push('');
    }

    const offerTotal = offers.reduce((t, o) => t + (o.expected_revenue || 0), 0);
    L.push(`## The offers (${offers.length})`, '');
    if (offerTotal) L.push(`Together the offers are planned to bring in ${money(offerTotal)}, ${pct((offerTotal / goal) * 100)} of the target. The rest comes from full-price sales.`, '');
    offers.forEach((o, k) => {
      const mech = json(o.mechanics, {});
      L.push(`### Offer ${k + 1} of ${offers.length}: ${o.name}`, '');
      L.push(`- **Type:** ${o.offer_type}`);
      if (o.audience) L.push(`- **Who it's for:** ${o.audience}`);
      if (o.headline) L.push(`- **Headline:** ${o.headline}`);
      if (o.benefit) L.push(`- **What they get:** ${o.benefit}`);
      if (mech.priceText && mech.priceText.includes('₹')) L.push(`- **Price:** ${mech.priceText}`);
      if (mech.when) L.push(`- **When:** ${mech.when}`);
      if (o.objective) L.push(`- **Why we're running it:** ${o.objective}`);
      if (o.target_purchases) L.push(`- **Target:** ${o.target_purchases} sales${o.expected_asp ? ` at about ${inr(o.expected_asp)} each` : ''}${o.expected_revenue ? `, ${money(o.expected_revenue)} in total` : ''}`);
      const rules = (o.redemption_conditions || '').split('\n').map(x => x.trim()).filter(x => x && !/^When:/i.test(x)).join(' ');
      if (rules) L.push(`- **Rules:** ${rules}`);
      if (o.rationale) L.push(`- **The data behind it:** ${o.rationale.replace(/\s*\n\s*/g, ' ')}`);
      L.push('');
    });

    if (actions.length) {
      L.push('## Week by week', '');
      for (const a of actions) L.push(`- **Week ${a.week}:** ${String(a.text).replace(/^./, c => c.toUpperCase())}`);
      L.push('');
    }
    if (plan.notes) {
      L.push('## Activation and channels', '');
      for (const line of plan.notes.split('\n').map(x => x.trim()).filter(Boolean)) L.push(`- ${line}`);
      L.push('');
    }

    const dir = path.join(OUT, studio, `${mm}-${month}`);
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `SOURCE - ${studio} ${month} ${YEAR}.md`), L.join('\n'));
    fs.writeFileSync(path.join(dir, 'PASTE INTO NOTEBOOKLM.txt'), prompt(studio, month));
    fs.writeFileSync(path.join(dir, 'SAVE VIDEO AS.txt'), `${slugOf(studio)}-${mm}.mp4\n`);
    built++;
  });
}
console.log(`built ${built} packs`);
if (missing.length) { console.log('missing:\n  ' + missing.join('\n  ')); process.exitCode = 1; }
