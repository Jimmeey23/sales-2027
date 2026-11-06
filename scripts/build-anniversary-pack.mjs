// Builds src/data/anniversary2027.json from the 9th Anniversary pack document
// (read with macOS textutil) plus the April 2027 offers currently in the app (read-only GET).
// Usage: node scripts/build-anniversary-pack.mjs [path/to/9th_Anniversary...docx] [apiBase]
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const DOCX =
  process.argv[2] ||
  '/Users/jimmeeygondaa/Downloads/P57_2027_Sales_Plan_Pack (2)/4_Anniversary/9th_Anniversary_Cloud_Nine_April_2027.docx';
const API = process.argv[3] || 'http://localhost:5173/api';
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/data/anniversary2027.json');

const L = execFileSync('textutil', ['-convert', 'txt', '-stdout', DOCX], { encoding: 'utf8' }).split('\n');
const at = (t, from = 0) => {
  const i = L.findIndex((l, k) => k >= from && l.trim() === t);
  if (i < 0) throw new Error('anchor not found: ' + t);
  return i;
};
const startsAt = (t, from = 0) => {
  const i = L.findIndex((l, k) => k >= from && l.trim().startsWith(t));
  if (i < 0) throw new Error('anchor not found: ' + t);
  return i;
};
const rows = (from, cols, n) =>
  Array.from({ length: n }, (_, r) => L.slice(from + r * cols, from + (r + 1) * cols).map(s => s.trim()));
const num = s => Number(String(s).replace(/[₹,\s]/g, '')) || 0;
const bullets = (from, to) =>
  L.slice(from, to)
    .map(s => s.replace(/^\s*•\s*/, '').trim())
    .filter(Boolean);

// ---- prose
const title = L[0].trim(),
  subtitle = L[1].trim(),
  summary = L[2].trim();
const ideaI = at('The idea'),
  whyI = at('Why it is built this way');
const idea = L[ideaI + 1].trim();
const why = bullets(whyI + 1, at('April 2027 targets')).map(b => {
  const k = b.indexOf('. ');
  return { head: b.slice(0, k).trim(), body: b.slice(k + 2).trim() };
});

// ---- targets
const tI = at('April 2027 targets');
const hdr1 = at('Studio', tI) + 7;
const targets = rows(hdr1, 7, 5).map(r => ({
  studio: r[0], apr26: num(r[1]), apr27: num(r[2]), newClient: num(r[3]), renewal: num(r[4]), reactivation: num(r[5]), addOn: num(r[6]),
}));
const hdr2 = at('Studio', hdr1 + 35) + 9;
const funnel = rows(hdr2, 9, 4).map(r => ({
  studio: r[0], leads: num(r[1]), firstVisits: num(r[2]), newMembers: num(r[3]), newPaying: num(r[4]), renewals: num(r[5]), winbacks: num(r[6]),
  m3: num(r[7]), m6: num(r[8]), annual: null,
}));
// the table has 10 columns (3-Month, 6-Month, Annual): re-read with 10
const hdr2b = at('Studio', hdr1 + 35) + 10;
const funnel2 = rows(hdr2b, 10, 4).map(r => ({
  studio: r[0], leads: num(r[1]), firstVisits: num(r[2]), newMembers: num(r[3]), newPaying: num(r[4]), renewals: num(r[5]), winbacks: num(r[6]),
  m3: num(r[7]), m6: num(r[8]), annual: num(r[9]),
}));
void funnel;

// ---- offer share table
const oI = at('What the anniversary offers have to sell');
const oh = at('Offer', oI) + 8;
const offerUnits = rows(oh, 8, 5).map(r => ({
  offer: r[0], slot: r[1], kcUnits: num(r[2]), kcRevenue: num(r[3]), baUnits: num(r[4]), baRevenue: num(r[5]), khUnits: num(r[6]), khRevenue: num(r[7]),
}));
const totI = at('Anniversary offers total', oh);
const offerTotals = { kc: num(L[totI + 3]), ba: num(L[totI + 5]), kh: num(L[totI + 7]) };
const shareI = at('Share of the April target', totI);
const offerShare = { kc: L[shareI + 3].trim(), ba: L[shareI + 5].trim(), kh: L[shareI + 7].trim() };

// ---- limited editions
const leI = at('The two limited editions');
const leH = at('Limited Edition 9-Class Pack', leI);
const labels = ['Price', 'Compared with list', 'What comes with it', 'How many', 'Effective discount', 'Who it is for', 'Its job'];
const leRows = rows(leH + 1, 3, 7);
const limitedEditions = [1, 2].map(c => ({
  name: c === 1 ? 'Limited Edition 9-Month Unlimited' : 'Limited Edition 9-Class Pack',
  fields: leRows.map((r, i) => ({ label: labels[i], value: r[c] })),
}));

// ---- calendar
const calI = at('The April calendar');
const calH = at('Commercial job', calI) + 1;
const calEnd = at('The activations and the offers attached to them');
const calendar = rows(calH, 3, Math.floor((calEnd - calH) / 3)).map(r => ({ date: r[0], what: r[1], job: r[2] }));

// ---- activations
const aI = at('The activations and the offers attached to them');
const activationsIntro = L[aI + 1].trim();
const aH = at('Cap check', aI) + 1;
const aEnd = at('The anniversary offers', aH);
const activations = rows(aH, 4, Math.floor((aEnd - aH) / 4)).map(r => ({ name: r[0], drama: r[1], sells: r[2], cap: r[3] }));

// ---- economics / retention / run sheet
const guardrails = bullets(at('Economics and guardrails') + 1, at('After April: making the anniversary stick'));
const afterI = at('After April: making the anniversary stick');
const rtH = at('Target for April 2027 buyers (May–Oct 2027)', afterI) + 1;
const repeat = rows(rtH, 3, 4).map(r => ({ studio: r[0], apr26: r[1], target: r[2] }));
const rsI = at('Run sheet');
const afterActions = bullets(rtH + 12, rsI).map(b => {
  const k = b.indexOf(': ');
  return { head: b.slice(0, k), body: b.slice(k + 2) };
});
const rsH = at('By when', rsI) + 1;
const runSheet = rows(rsH, 3, Math.floor((L.length - rsH - 1) / 3)).map(r => ({ what: r[0], owner: r[1], by: r[2] })).filter(r => r.what);

// ---- pre-sale and pop-up paragraphs
const presale = L[startsAt('Pre-sale: Platinum Tier Delusion')].replace(/^Pre-sale: /, '').trim();
const presaleBody = L[startsAt('Pre-sale: Platinum Tier Delusion') + 1].trim();
const popupBody = L[startsAt('Pop-ups: Nine Lives') + 1].trim();
const bulkI = startsAt('Bulk pack: The Cloud Nine 90');
const bulk = { name: 'The Cloud Nine 90', quote: L[bulkI + 1].trim(), body: L[bulkI + 2].trim() };

// ---- the app's April offers (read-only), the current wording of every mechanic
let appOffers = [];
try {
  const res = await fetch(`${API}/offers?year=2027&month=4`);
  const j = await res.json();
  appOffers = j.rows.map(o => {
    let m = {};
    try { m = typeof o.mechanics === 'string' ? JSON.parse(o.mechanics) : o.mechanics || {}; } catch {}
    return {
      studioId: o.studio_id, studio: o.studio, name: o.name, slot: o.plan_slot, rank: o.plan_rank, type: o.offer_type,
      headline: o.headline, benefit: o.benefit, audience: o.audience, objective: o.objective, rationale: o.rationale,
      when: m.when || null, priceText: m.priceText || null, listPrice: m.listPrice || null, targetBasis: m.targetBasis || null,
      units: o.target_purchases, asp: o.expected_asp, revenue: o.expected_revenue, effectiveDiscount: o.effective_discount, status: o.status,
    };
  });
} catch (e) {
  console.warn('could not read app offers:', e.message);
}

const out = {
  generated: new Date().toISOString().slice(0, 10),
  source: path.basename(DOCX),
  title, subtitle, summary, idea, why, targets, funnel: funnel2, offerUnits, offerTotals, offerShare,
  limitedEditions, calendar, activationsIntro, activations, presale: { name: presale.split(' (March)')[0], body: presaleBody }, bulk,
  popup: { name: 'Nine Lives, Ten Classes', body: popupBody }, guardrails, repeat, afterActions, runSheet, appOffers,
};
writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log('wrote', OUT, { calendar: calendar.length, activations: activations.length, runSheet: runSheet.length, appOffers: appOffers.length });
