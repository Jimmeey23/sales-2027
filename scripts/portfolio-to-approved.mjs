/* Rebuilds server/data/approved-plan-2027.json (and, through generate-approved-plan-module.py,
   src/data/approvedPlan2027.ts) from the plan of record, server/data/portfolio-2027/v5-portfolio.json.

     node scripts/portfolio-to-approved.mjs && python3 scripts/generate-approved-plan-module.py .

   The approved-plan shape feeds the Activations and Marketing tabs, the month covers and
   chapters, the offer library, the default month plan and the legacy-theme check. It used to
   be a separate export (29 Oct 2026) with its own themes, offers and targets, so those
   screens disagreed with the month plans. Generated from the portfolio, they cannot.

   Slots: the approved shape has three (newcomer, lapsed, renewal). Referral offers count as
   newcomer; upgrades, spot sales, goodwill, privates, bookouts and corporate count as renewal.
   Each month lists its true-slot offer first, so the slot's headline offer is the real one. */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PORTFOLIO = path.join(ROOT, 'server', 'data', 'portfolio-2027', 'v5-portfolio.json');
const OUT = path.join(ROOT, 'server', 'data', 'approved-plan-2027.json');
const plan = JSON.parse(fs.readFileSync(PORTFOLIO, 'utf8'));
const previous = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : [];

const NAME = { SHQ: 'Bandra', KH: 'Kemps Corner', KK: 'Kenkere House', POP: 'Pop-up' };
const SLOT = { newcomer: 'newcomer', referral: 'newcomer', lapsed: 'lapsed' };
const RANK = { newcomer: 0, referral: 1, lapsed: 2, renewal: 3 };
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const money = n => `₹${Math.round(n).toLocaleString('en-IN')}`;
const day = iso => `${Number(iso.slice(8, 10))} ${MON[Number(iso.slice(5, 7)) - 1]}`;
const when = v => (!v ? '' : v.start === v.end ? day(v.start) : `${day(v.start)} – ${day(v.end)}`);
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

/* The product an offer prices, said the way the plan's other screens read it ("1M unlimited",
   "12-class pack"): limited editions by name, everything else by which catalogue product the
   shelf price fits (≤30% under list), tie-broken by which one the offer mentions first. */
const CATALOGUE = [
  ['oneMonth', '1M unlimited', /\b1 Month\b|\b1M\b/i],
  ['threeMonth', '3M unlimited', /\b3 Months\b|\b3M\b/i],
  ['sixMonth', '6M unlimited', /\b6 Months\b|\b6M\b/i],
  ['annual', 'annual unlimited', /annual/i],
  ['twelveClass', '12-class pack', /12-class/i],
  ['tenClass', '10-class pack', /10-class/i],
  ['eightClass', '8-class pack', /8-class/i],
  ['fourClass', '4-class pack', /4-class/i],
  ['privateSession', '60-minute private session', /private/i],
  ['single', 'single class', /single/i],
  ['paidTrial', 'paid trial class', /trial/i],
];
function productOf(o, prices) {
  const text = `${o.name} ${o.benefit}`;
  if (/9-Month/i.test(text)) return { label: '9M unlimited' };
  if (/10-private pack/i.test(text)) return { label: '10-class pack of privates' };
  if (/Book out the studio/i.test(text)) return { label: '1-class pass (studio bookout for up to 12)' };
  if (/2 Months Unlimited/i.test(text)) return { label: '2M unlimited' };
  if (/3 classes for/i.test(text) && o.price < 5000) return { label: '3-class pass' };
  if (/9-Class Pack/i.test(text)) return { label: '9-class pack' };
  if (/\b90 classes\b/i.test(text)) return { label: '90-class pack' };
  if (/gift/i.test(text) && o.price < 3000) return { label: o.mechanics?.city === 'Pop-up' ? '1-class pass' : '2-class pass' };
  const fits = CATALOGUE.filter(([k]) => prices[k] && o.price <= prices[k] && o.price >= prices[k] * 0.7);
  if (!fits.length) return { label: '' };
  const at = re => { const i = text.search(re); return i < 0 ? Infinity : i; };
  const [key, label] = fits.sort((a, b) => at(a[2]) - at(b[2]))[0];
  return { label, list: prices[key] };
}
function youPay(o, prices) {
  const { label, list } = productOf(o, prices);
  if (!label) return [o.benefit];
  const off = list ? Math.round((1 - o.price / list) * 100) : 0;
  const head = list && off > 0 ? `${label}: ${money(o.price)} (${off}% off the ${money(list)} list price).` : list ? `${label}: ${money(o.price)} (list price).` : `${label}: ${money(o.price)}.`;
  return [head, o.benefit];
}

const out = [];
for (const studio of plan.studios) {
  const name = NAME[studio.studio.code];
  for (const m of studio.months) {
    const old = previous.find(e => e.studio === name && e.month === m.month);
    const dates = (m.keyDates || []).map(k => `${k.name} (${day(k.date)}${k.approx ? ', approx.' : ''})`);
    const offers = [...m.offers]
      .map((o, i) => ({ o, i }))
      .sort((a, b) => (RANK[a.o.slot] ?? 9) - (RANK[b.o.slot] ?? 9) || a.i - b.i)
      .map(({ o }) => ({
        slot: SLOT[o.slot] || 'renewal',
        name: o.name,
        tagline: o.headline,
        fields: {
          'Commercial job': [o.objective],
          'Who qualifies': [o.audience],
          'You pay': youPay(o, studio.prices),
          'You get': (o.mechanicTags || []).map(t => `• ${cap(t)}`),
          When: [when(o.validity)],
          Rules: [`• ${o.conditions}`],
          'Effective discount': [`${o.effectiveDiscountPercent}% effective (${o.mechanics?.discountRule || 'rule not stated'}).`],
          'Expected revenue': [`₹${(o.expectedRevenue / 100000).toFixed(1)}L counted · ${o.buyers} buyers`],
          'Rate of sale': [`${o.buyers} × ${money(o.ticket ?? o.price)} (${o.mechanics?.city || ''} pricing).`],
          'Why it works': [o.rationale],
          'What to watch': [o.kpi],
          Model: [o.internalDescription],
        },
      }));
    const f = m.funnel || {};
    out.push({
      studio: name,
      month: m.month,
      theme: m.theme,
      hook: m.focus && m.focus !== m.theme ? m.focus : dates.slice(0, 3).join(' · ') || m.offers.map(o => o.name).join(' · '),
      job: m.objective,
      moment: dates.length ? `Key dates: ${dates.join('; ')}.` : m.offers[0]?.headline || '',
      figures: {
        target: m.target,
        projected: m.target,
        newClientPlan: m.streams.newClient,
        renewalPlan: m.streams.renewal,
        reactivationPlan: m.streams.reactivation,
        otherPlan: m.streams.other,
        leadsTrials: [f.leads || 0, f.trials || 0],
        renewals: [f.renewalRate ? Math.round((f.existingPayingRenewals || 0) / f.renewalRate) : f.existingPayingRenewals || 0, f.existingPayingRenewals || 0],
        // The lapsed pool is a measured snapshot the portfolio does not carry; keep it.
        lapsed: [old?.figures?.lapsed?.[0] ?? 0, f.winbacksNeeded || 0],
        newBuyers: f.newBuyers || 0,
      },
      offers,
    });
  }
}
fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
console.log(`Wrote ${path.relative(ROOT, OUT)}: ${out.length} studio-months, ${out.reduce((s, e) => s + e.offers.length, 0)} offers.`);
