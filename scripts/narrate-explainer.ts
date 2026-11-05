#!/usr/bin/env npx tsx
/* Pre-recorded narration for the month explainer.

   The browser's own speech synthesis works everywhere and needs nothing, but it is only
   as good as the voices the viewer's operating system happens to ship. A recorded track
   is better: a real voice, the same voice every time, for every viewer.

     npx tsx scripts/narrate-explainer.ts --list            # every month's narration
     npx tsx scripts/narrate-explainer.ts --list --studio='Kemps Corner' --month=3
     npx tsx scripts/narrate-explainer.ts --manifest        # record which tracks exist

   `--list` prints the words to record, one block per month, under the filename to save
   them as. Record or synthesise each block into `public/explainer/<slug>-<MM>.mp3`, then
   run `--manifest` to tell the app what is there. Nothing has to be recorded for all
   forty-eight months at once: a month with no track simply falls back to the browser's
   voice, and the player says which one it is using.

   Timing needs no cue points. The player measures the recording and maps each scene onto
   it by the scene's share of the words, so re-recording a month is just a new file. */

import fs from 'node:fs';
import path from 'node:path';
import { buildExplainer, type ExplainerOffer } from '../src/lib/explainerScript';

const PLAN = 'server/data/portfolio-2027/v5-portfolio.json';
const OUT_DIR = 'public/explainer';

const args = process.argv.slice(2);
const arg = (name: string) =>
  args
    .find(a => a.startsWith(`--${name}=`))
    ?.split('=')
    .slice(1)
    .join('=');
const has = (name: string) => args.includes(`--${name}`);

/** The names the app uses, keyed by the portfolio's own codes. */
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
};

const textOf = (v: unknown) => (v == null ? '' : String(v).trim());

/** The importer's `weekOf` and `actionsFromSections`, mirrored so the recorded words are
    the words the app will caption. */
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
      const owner = (textOf(item.label) || textOf(item.value) || '').replace(/\s*\|\s*/g, ' / ').trim();
      const body =
        textOf(item.detail) || (textOf(item.value) && !owner.startsWith(textOf(item.value)) ? textOf(item.value) : '');
      const text = (body || textOf(item.value) || '').trim();
      if (!text && !owner) continue;
      actions.push({ week, text: (text || owner).slice(0, 500) });
    }
  });
  return [1, 2, 3, 4]
    .map(week => ({ label: `W${week}`, text: actions.filter(a => a.week === week)[0]?.text ?? '' }))
    .filter(step => step.text);
}

function scriptFor(studioName: string, block: any, month: any, year: number) {
  const offers: ExplainerOffer[] = (month.offers || []).map((o: any) => ({
    id: o.id,
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
    ticket: Number(o.ticket ?? o.price) || 0,
    buyers: Number(o.buyers) || 0,
    revenue: Number(o.expectedRevenue) || 0,
    discount: o.effectiveDiscountPercent ?? null,
    validity: o.cta || null,
  }));
  return buildExplainer({
    studioName,
    month: month.month,
    year,
    theme: month.theme,
    description: month.focus,
    target: month.target,
    lastYear: month.priorYear,
    streams: [
      { key: 'newClient', label: 'New clients', value: month.streams.newClient },
      { key: 'renewal', label: 'Renewals', value: month.streams.renewal },
      { key: 'reactivation', label: 'Comeback', value: month.streams.reactivation },
      { key: 'other', label: 'Other', value: month.streams.other },
    ],
    standardTrade: month.standardTrade || null,
    leads: month.funnel?.leads ?? 0,
    trials: month.funnel?.trials ?? 0,
    buyers: month.funnel?.newBuyers ?? 0,
    renewalsDue: month.funnel?.renewalsDue ?? 0,
    renewalCoverage: month.funnel?.renewalRate ?? null,
    offers,
    offerRevenue: month.offersPlannedRevenue ?? offers.reduce((s, o) => s + o.revenue, 0),
    plan: planSteps(month),
  });
}

const plan = JSON.parse(fs.readFileSync(path.resolve(PLAN), 'utf8'));
const studios = plan.studios as any[];
const onlyStudio = arg('studio');
const onlyMonth = Number(arg('month') || 0);

if (has('list')) {
  for (const block of studios) {
    if (onlyStudio && block.studio.name !== onlyStudio) continue;
    for (const month of block.months) {
      if (onlyMonth && month.month !== onlyMonth) continue;
      const name = APP_NAME[block.studio.code] || block.studio.name;
      const script = scriptFor(name, block, month, plan.year);
      const file = `${slug(name)}-${String(month.month).padStart(2, '0')}.mp3`;
      const words = script.scenes.map(s => s.narration).join(' ');
      console.log(`\n### ${file}`);
      console.log(`# ${script.title} · ${script.scenes.length} scenes · ${words.split(/\s+/).length} words`);
      console.log(words);
    }
  }
} else if (has('manifest')) {
  fs.mkdirSync(path.resolve(OUT_DIR), { recursive: true });
  const available: Record<string, number[]> = {};
  for (const block of studios) {
    const key = slug(APP_NAME[block.studio.code] || block.studio.name);
    const months: number[] = [];
    for (const month of block.months) {
      const file = path.resolve(OUT_DIR, `${key}-${String(month.month).padStart(2, '0')}.mp3`);
      if (fs.existsSync(file) && fs.statSync(file).size > 1024) months.push(month.month);
    }
    available[key] = months;
  }
  fs.writeFileSync(
    path.resolve(OUT_DIR, 'manifest.json'),
    `${JSON.stringify({ generatedAt: new Date().toISOString(), studios: available }, null, 2)}\n`,
  );
  const total = Object.values(available).reduce((s, m) => s + m.length, 0);
  console.log(`Recorded narration: ${total} of 48 months.`);
  for (const [key, months] of Object.entries(available))
    console.log(`  ${key.padEnd(16)} ${months.length}/12${months.length ? `  (${months.join(', ')})` : ''}`);
} else {
  console.error(
    'Usage: npx tsx scripts/narrate-explainer.ts --list | --manifest [--studio="Kemps Corner"] [--month=3]',
  );
  process.exit(1);
}
