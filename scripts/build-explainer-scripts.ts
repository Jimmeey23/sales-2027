#!/usr/bin/env npx tsx
/* Builds every month's explainer script from the 2027 plan of record
   (server/data/portfolio-2027/v5-portfolio.json) — the same data the app imports
   and displays. One script per studio × month (48 total), each with the narration
   words the video speaks and the figures each scene shows.

   Output:
     public/explainer/scripts/<slug>-<MM>.json   one script (scenes + narration + voice blocks)
     public/explainer/scripts/index.json          index of all 48 scripts

   Run: npx tsx scripts/build-explainer-scripts.ts
*/

import fs from 'node:fs';
import path from 'node:path';
import { buildExplainer, narrationHash, type ExplainerOffer } from '../src/lib/explainerScript';

const PLAN = 'server/data/portfolio-2027/v5-portfolio.json';
const OUT_DIR = 'public/explainer/scripts';
const YEAR = 2027;

/* App names, keyed by the portfolio's studio codes — the same mapping MonthWorkspace uses. */
const APP_NAME: Record<string, string> = {
  SHQ: 'Bandra',
  KH: 'Kemps Corner',
  KK: 'Kenkere House',
  POP: 'Pop-up',
};

const slug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[()]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const SLOT_LABEL: Record<string, string> = {
  newcomer: 'New clients',
  new_client: 'New clients',
  lapsed: 'Win-backs',
  reactivation: 'Win-backs',
  renewal: 'Renewals',
  retention: 'Renewals',
  upsell: 'Revenue boost',
  spot: 'Revenue boost',
};

const day = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });

function weekOf(title: string, index: number): number {
  const text = String(title || '').toLowerCase();
  const week = text.match(/week\s*([0-5])/);
  if (week) return Number(week[1]);
  const leading = text.match(/^\s*([1-5])\b/);
  if (leading) return Number(leading[1]);
  return Math.min(5, Math.max(1, index + 1));
}

function planSteps(month: any) {
  const actions: { week: number; text: string }[] = [];
  (month.sections || []).forEach((section: any, index: number) => {
    const week = weekOf(section.title, index);
    for (const item of section.items || []) {
      const label = String(item.label || '').trim();
      const value = String(item.value || '').trim();
      const detail = String(item.detail || '').trim();
      const body = detail || (value && !label.startsWith(value) ? value : '');
      const text = (body || value || label).slice(0, 500);
      if (!text) continue;
      actions.push({ week, text });
    }
  });
  return [1, 2, 3, 4]
    .map((week) => ({ label: `W${week}`, text: actions.filter((a) => a.week === week)[0]?.text ?? '' }))
    .filter((step) => step.text);
}

function offerFor(o: any): ExplainerOffer {
  const start = o.validity?.start ? new Date(`${o.validity.start}T00:00:00Z`) : null;
  const end = o.validity?.end ? new Date(`${o.validity.end}T00:00:00Z`) : null;
  return {
    id: o.id || o.bankId || 'offer',
    name: String(o.name || 'Offer'),
    slot: String(o.slot || ''),
    slotLabel: SLOT_LABEL[String(o.slot || '')] || 'Revenue boost',
    headline: o.headline || null,
    benefit: o.customerCopy || o.customerMessage || o.benefit || null,
    rationale: o.rationale || null,
    audience: o.audience || null,
    conditions: o.conditions || null,
    kpi: o.kpi || null,
    offerType: o.type || null,
    ticket: Number(o.ticket ?? o.price ?? 0) || 0,
    buyers: Number(o.buyers) || 0,
    revenue: Number(o.expectedRevenue) || 0,
    discount: o.effectiveDiscountPercent == null ? null : Number(o.effectiveDiscountPercent),
    validity: start && end ? `${day(start)} – ${day(end)}` : null,
  };
}

function scriptFor(studioName: string, block: any, month: any) {
  const offers: ExplainerOffer[] = (month.offers || []).map(offerFor);
  const offerRevenue = Number(month.offersPlannedRevenue) || offers.reduce((s, o) => s + o.revenue, 0);
  return buildExplainer({
    studioName,
    month: month.month,
    year: YEAR,
    theme: month.theme || null,
    description: month.focus || null,
    target: Number(month.target) || 0,
    lastYear: Number(month.priorYear) || 0,
    streams: [
      { key: 'newClient', label: 'New clients', value: Number(month.streams?.newClient) || 0 },
      { key: 'renewal', label: 'Renewals', value: Number(month.streams?.renewal) || 0 },
      { key: 'reactivation', label: 'Comeback', value: Number(month.streams?.reactivation) || 0 },
      { key: 'other', label: 'Other', value: Number(month.streams?.other) || 0 },
    ],
    standardTrade: month.standardTrade
      ? {
          revenue: Number(month.standardTrade.revenue) || 0,
          shareOfMonth: Number(month.standardTrade.shareOfMonth) || 0,
          note: month.standardTrade.note || null,
        }
      : null,
    leads: Number(month.funnel?.leads) || 0,
    trials: Number(month.funnel?.trials) || 0,
    buyers: Number(month.funnel?.newBuyers) || 0,
    renewalsDue: Number(month.funnel?.renewalsDue) || 0,
    renewalCoverage: month.funnel?.renewalRate == null ? null : Number(month.funnel.renewalRate),
    offers,
    offerRevenue,
    plan: planSteps(month),
  });
}

const BLOCK_A_KINDS = new Set(['open', 'target', 'streams', 'funnel']);

const plan = JSON.parse(fs.readFileSync(path.resolve(PLAN), 'utf8'));
const studios = plan.studios as any[];
const index: any[] = [];
let words = 0;

fs.mkdirSync(path.resolve(OUT_DIR), { recursive: true });

for (const block of studios) {
  const studioName = APP_NAME[block.studio.code] || block.studio.name;
  const key = slug(studioName);
  for (const month of block.months) {
    const script = scriptFor(studioName, block, month);
    const file = `${key}-${String(month.month).padStart(2, '0')}.json`;
    const blockA = script.scenes.filter((s) => BLOCK_A_KINDS.has(s.kind));
    const blockB = script.scenes.filter((s) => !BLOCK_A_KINDS.has(s.kind));
    const out = {
      slug: key,
      month: month.month,
      studio: block.studio.code,
      studioName,
      monthName: script.monthName,
      year: YEAR,
      title: script.title,
      duration: script.duration,
      scenes: script.scenes.length,
      hash: narrationHash(script),
      scenesKinds: script.scenes.map((s) => s.kind),
      voiceBlocks: {
        a: blockA.map((s) => s.narration).join(' '),
        b: blockB.map((s) => s.narration).join(' '),
      },
      script,
    };
    fs.writeFileSync(path.resolve(OUT_DIR, file), `${JSON.stringify(out, null, 2)}\n`);
    words += script.scenes.reduce((t, sc) => t + sc.narration.split(/\s+/).length, 0);
    index.push({
      slug: key,
      month: month.month,
      studio: studioName,
      title: script.title,
      duration: script.duration,
      scenes: script.scenes.length,
      hash: out.hash,
      file,
    });
  }
}

fs.writeFileSync(
  path.resolve(OUT_DIR, 'index.json'),
  `${JSON.stringify({ generatedAt: new Date().toISOString(), year: YEAR, count: index.length, scripts: index }, null, 2)}\n`
);

console.log(`Built ${index.length} scripts (4 locations × 12 months), ~${words} narration words total.`);
index.forEach((x) => console.log(`  ${x.file} · ${x.scenes} scenes · ${Math.round(x.duration / 60000)} min est · hash ${x.hash}`));
