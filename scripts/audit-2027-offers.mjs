#!/usr/bin/env node
/* Audits the 2027 offer plan of record before it is imported.

     node scripts/audit-2027-offers.mjs            # report
     node scripts/audit-2027-offers.mjs --strict   # exit 1 on any critical

   Everything here is provable from the files: no estimate, no inference. The point is
   that a plan can add up (streams → months → year) and still not *work* — the offers
   can carry the wrong streams, the wrong months, or a price that is not the ticket the
   revenue was built from. Those are the checks below.

   Sources:
     server/data/portfolio-2027/v5-portfolio.json   the plan of record (4 locations)
     server/data/kc-2027/month-01..12.json          Kemps Corner's own month files
     server/data/kc-2027/year.json                  the Kemps Corner year contract  */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PORTFOLIO = path.join(ROOT, 'server', 'data', 'portfolio-2027', 'v5-portfolio.json');
const KC_DIR = path.join(ROOT, 'server', 'data', 'kc-2027');
const STRICT = process.argv.includes('--strict');

const read = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_END = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const rupees = n => `₹${Math.round(n).toLocaleString('en-IN')}`;
const lakh = n => `₹${(n / 1e5).toLocaleString('en-IN', { maximumFractionDigits: 1 })}L`;

/* The offer bank is keyed BA/KC/KK/POP; the studios array is keyed SHQ/KH/KK/POP.
   Any join that assumes they are the same silently finds nothing. */
const BANK_CODE = { BA: 'SHQ', KC: 'KH', KK: 'KK', POP: 'POP' };

const findings = [];
const add = (severity, area, title, detail) => findings.push({ severity, area, title, detail });
const ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

if (!fs.existsSync(PORTFOLIO)) {
  console.error(`Missing ${path.relative(ROOT, PORTFOLIO)} — nothing to audit.`);
  process.exit(2);
}
const plan = read(PORTFOLIO);
const banks = new Map(plan.offerBank.map(b => [b.id, b]));

/* Where each bank offer actually landed. */
const scheduled = new Map();
let offerCount = 0;
let offerRevenue = 0;
for (const studio of plan.studios) {
  for (const month of studio.months) {
    for (const offer of month.offers) {
      offerCount++;
      offerRevenue += offer.expectedRevenue || 0;
      if (!scheduled.has(offer.bankId)) scheduled.set(offer.bankId, []);
      scheduled.get(offer.bankId).push({ code: studio.studio.code, month: month.month, offer });
    }
  }
}

/* ---------------------------------------------------------------- 1. year totals */
{
  const t = plan.totals;
  const target = plan.studios.reduce((s, x) => s + x.year.target, 0);
  const prior = plan.studios.reduce((s, x) => s + x.year.priorYear, 0);
  const growth = Number((((target - prior) / prior) * 100).toFixed(1));
  if (t.target !== target) add('critical', 'totals', 'Portfolio target does not equal the sum of its locations', `totals.target ${rupees(t.target)} vs ${rupees(target)}.`);
  if (t.priorYear !== prior) add('critical', 'totals', 'Portfolio prior year does not equal the sum of its locations', `totals.priorYear ${rupees(t.priorYear)} vs ${rupees(prior)}.`);
  if (Math.abs((t.growthPercent ?? growth) - growth) > 0.05) add('high', 'totals', 'Portfolio growth percentage does not recompute', `Says ${t.growthPercent}%, ${rupees(target)} on ${rupees(prior)} is ${growth}%.`);
  if (t.offers !== offerCount) add('critical', 'totals', 'Portfolio offer count does not match the offers it carries', `totals.offers ${t.offers} vs ${offerCount} scheduled.`);
  if (t.offerBankSize !== plan.offerBank.length) add('high', 'totals', 'Portfolio bank size does not match the bank', `Says ${t.offerBankSize}, bank has ${plan.offerBank.length}.`);
  if (t.offersPlannedRevenue !== offerRevenue) add('critical', 'totals', 'Portfolio planned offer revenue does not match the offers', `Says ${rupees(t.offersPlannedRevenue)} vs ${rupees(offerRevenue)}.`);
}

/* ------------------------------------------------- 2. studio year vs its 12 months */
for (const studio of plan.studios) {
  const code = studio.studio.code;
  const y = studio.year;
  const target = studio.months.reduce((s, m) => s + m.target, 0);
  const prior = studio.months.reduce((s, m) => s + m.priorYear, 0);
  const growth = Number((((target - prior) / prior) * 100).toFixed(1));
  if (target !== y.target) add('critical', 'target', `${code}: months do not add to the year target`, `Months ${rupees(target)} vs year ${rupees(y.target)}.`);
  if (prior !== y.priorYear) add('critical', 'target', `${code}: months do not add to the prior year`, `Months ${rupees(prior)} vs year ${rupees(y.priorYear)}.`);
  if (Math.abs((y.growthPercent ?? growth) - growth) > 0.05) add('high', 'target', `${code}: growth does not recompute`, `Says ${y.growthPercent}%, computed ${growth}%.`);
  for (const key of ['newClient', 'renewal', 'reactivation', 'other']) {
    const sum = studio.months.reduce((s, m) => s + (m.streams[key] || 0), 0);
    if (sum !== y.streams[key]) add('critical', 'target', `${code}: ${key} months do not add to the year`, `Months ${rupees(sum)} vs year ${rupees(y.streams[key])}.`);
  }
  const streamSum = Object.values(y.streams).reduce((a, b) => a + b, 0);
  if (streamSum !== y.target) add('critical', 'target', `${code}: year streams do not add to the year target`, `${rupees(streamSum)} vs ${rupees(y.target)}.`);
}

/* ------------------------------------------------------------ 3. month by month */
const streamTarget = { newClient: 0, renewal: 0, reactivation: 0, other: 0 };
const streamOffer = { newClient: 0, renewal: 0, reactivation: 0, other: 0 };
const gaps = { margin: [], audience: [], conditions: [] };

for (const studio of plan.studios) {
  const code = studio.studio.code;
  for (const month of studio.months) {
    const label = `${code} ${MONTHS[month.month - 1]}`;
    const sum = Object.values(month.streams).reduce((a, b) => a + b, 0);
    if (sum !== month.target) add('critical', 'target', `${label}: streams do not add to the month target`, `${rupees(sum)} vs ${rupees(month.target)}.`);

    const growth = month.priorYear ? Number((((month.target - month.priorYear) / month.priorYear) * 100).toFixed(1)) : null;
    if (growth !== null && Math.abs((month.growthPercent ?? growth) - growth) > 0.05)
      add('medium', 'target', `${label}: growth does not recompute`, `Says ${month.growthPercent}%, computed ${growth}%.`);

    /* Which stream each offer's revenue is booked to, against that stream's target. */
    const byStream = {};
    for (const offer of month.offers) {
      const stream = offer.mechanics?.stream || 'unassigned';
      byStream[stream] = (byStream[stream] || 0) + (offer.expectedRevenue || 0);
    }
    for (const key of Object.keys(streamTarget)) {
      streamTarget[key] += month.streams[key] || 0;
      streamOffer[key] += byStream[key] || 0;
    }
    const other = Object.keys(byStream).filter(k => !(k in streamTarget));
    if (other.length) add('medium', 'streams', `${label}: revenue booked to a stream the month does not have`, other.map(k => `${k} ${lakh(byStream[k])}`).join(', ') + '.');

    const slots = new Set(month.offers.map(o => o.slot));
    if (!slots.has('newcomer') && month.streams.newClient)
      add('high', 'coverage', `${label}: new-client revenue with no newcomer offer`, `${lakh(month.streams.newClient)} of new-client target, slots: ${[...slots].join(', ') || 'none'}.`);
    if (!slots.has('renewal') && month.streams.renewal)
      add('high', 'coverage', `${label}: renewal revenue with no renewal offer`, `${lakh(month.streams.renewal)} of renewal target.`);
    if (!month.offers.length && month.target)
      add('critical', 'coverage', `${label}: no offers at all`, `${lakh(month.target)} target with nothing planned to carry it.`);

    /* Buyers: the funnel says how many people must buy; the offers say how many will. */
    const funnel = month.funnel || {};
    const buyers = month.offers.reduce((s, o) => s + (o.buyers || 0), 0);
    const need = (funnel.newBuyers || 0) + (funnel.existingPayingRenewals || 0) + (funnel.winbacksNeeded || 0);
    if (need && buyers < need * 0.6)
      add('low', 'funnel', `${label}: offers name ${buyers} of the ${need} buyers the funnel needs`, `${Math.round((1 - buyers / need) * 100)}% is left to full-price trade that the plan never describes (new ${funnel.newBuyers}, renewals ${funnel.existingPayingRenewals}, winbacks ${funnel.winbacksNeeded}).`);

    const start = `2027-${String(month.month).padStart(2, '0')}-01`;
    const end = `2027-${String(month.month).padStart(2, '0')}-${MONTH_END[month.month - 1]}`;

    for (const offer of month.offers) {
      const who = `${label} “${offer.name}”`;
      const price = offer.price ?? null;
      const buyers = offer.buyers ?? 0;
      const revenue = offer.expectedRevenue ?? null;

      if (price === null) add('high', 'pricing', `${who} has no price`, 'The app stores price as expected ASP, so its economics cannot be checked.');
      if (!buyers) add('high', 'offers', `${who} plans no buyers`, 'It contributes nothing to the month.');
      if (revenue === null) add('critical', 'pricing', `${who} has no expected revenue`, 'Its contribution to the month is unknown.');
      if (price !== null && buyers && revenue !== null && price * buyers !== revenue)
        add('high', 'pricing', `${who}: price × buyers is not its planned revenue`, `${rupees(price)} × ${buyers} = ${rupees(price * buyers)}, planned ${rupees(revenue)} (${rupees(revenue - price * buyers)}). The offer carries one product's price but the revenue is a blended ticket.`);
      if (offer.effectiveDiscountPercent == null) add('medium', 'pricing', `${who} has no effective discount`, 'The discount cap cannot be checked against it.');
      else if (offer.effectiveDiscountPercent > 20 && !/spot|annual|bulk|gift|intro|3-for-2|3 for 2|privates/i.test(`${offer.slot} ${offer.type} ${offer.name}`))
        add('high', 'policy', `${who} is ${offer.effectiveDiscountPercent}% effective`, 'Above the 20% campaign cap and not in an exempt category (spot, annual, bulk, credited intro).');
      /* Whole-plan gaps are counted once at the end rather than once per offer. */
      if (offer.contributionMargin == null) gaps.margin.push(who);
      if (!offer.audience?.trim()) gaps.audience.push(who);
      if (!offer.conditions?.trim()) gaps.conditions.push(who);

      const v = offer.validity || {};
      if (!v.start || !v.end) add('medium', 'dates', `${who} has no validity window`, 'Without dates it can be redeemed indefinitely.');
      else {
        if (v.end < v.start) add('critical', 'dates', `${who} ends before it starts`, `${v.start} → ${v.end}.`);
        else if (v.start > end || v.end < start) add('high', 'dates', `${who} runs outside ${MONTHS[month.month - 1]}`, `${v.start} → ${v.end} while planned in ${MONTHS[month.month - 1]}.`);
        else if (v.start < start || v.end > end) add('high', 'dates', `${who} spills outside ${MONTHS[month.month - 1]}`, `${v.start} → ${v.end}; revenue lands in the neighbouring month.`);
      }

      if (!offer.bankId) add('high', 'bank', `${who} is not linked to a bank offer`, 'It cannot be traced back to the catalogue it came from.');
      else if (!banks.has(offer.bankId)) add('critical', 'bank', `${who} points at missing bank offer ${offer.bankId}`, 'The bank does not contain it.');
    }
  }
}

/* -------------------------------------------- 4. the offer bank against the year */
for (const bank of plan.offerBank) {
  const at = scheduled.get(bank.id) || [];
  const who = `${bank.id} “${bank.name}”`;

  if (!at.length) {
    add('high', 'bank', `${who} is never scheduled`, 'It sits in the catalogue but no location runs it.');
    continue;
  }

  const declared = new Set((bank.studios || []).map(c => BANK_CODE[c] || c));
  const used = new Set(at.map(x => x.code));
  for (const code of used) if (declared.size && !declared.has(code)) add('high', 'bank', `${who} runs at ${code} but was never declared for it`, `Declared: ${[...declared].join(', ')}.`);
  for (const code of declared) if (!used.has(code)) add('high', 'bank', `${who} declares ${code} but is not scheduled there`, 'A location is named in the catalogue and then dropped.');

  const months = new Set(at.map(x => x.month));
  if (months.size !== 1 || !months.has(bank.month)) add('critical', 'bank', `${who} is filed in the wrong month`, `Bank says ${bank.month}, scheduled in ${[...months].join(', ')}.`);

  const planned = bank.plannedRevenue || 0;
  const fromPlans = Object.values(bank.planByStudio || {}).reduce((s, p) => s + (p.revenue || 0), 0);
  const fromMonths = at.reduce((s, x) => s + (x.offer.expectedRevenue || 0), 0);
  if (planned !== fromPlans) add('critical', 'bank', `${who}: plannedRevenue is not its per-studio plan`, `${rupees(planned)} vs ${rupees(fromPlans)}.`);
  if (planned !== fromMonths) add('critical', 'bank', `${who}: plannedRevenue is not what the months carry`, `${rupees(planned)} vs ${rupees(fromMonths)}.`);

  for (const [bankCode, entry] of Object.entries(bank.planByStudio || {})) {
    const code = BANK_CODE[bankCode] || bankCode;
    const hit = at.find(x => x.code === code);
    if (!hit) { add('high', 'bank', `${who} is planned for ${code} but not scheduled there`, 'Planned money with no offer behind it.'); continue; }
    for (const [field, actual] of [['buyers', hit.offer.buyers], ['revenue', hit.offer.expectedRevenue], ['discount', hit.offer.effectiveDiscountPercent]]) {
      if (entry[field] != null && actual != null && entry[field] !== actual)
        add('high', 'bank', `${who} at ${code}: bank ${field} ${entry[field]} ≠ month ${actual}`, 'The catalogue and the month disagree.');
    }
    if (entry.ticket != null && hit.offer.price != null && entry.ticket !== hit.offer.price)
      add('high', 'bank', `${who} at ${code}: bank ticket ${rupees(entry.ticket)} ≠ offer price ${rupees(hit.offer.price)}`, 'The month carries one product’s price where the revenue was built from a blended ticket.');
  }

  const cities = new Set((bank.planByStudio ? Object.keys(bank.planByStudio) : []).map(c => BANK_CODE[c] || c));
  for (const code of used) if (!cities.has(code)) add('high', 'bank', `${who} runs at ${code} with no per-studio plan`, 'No buyers, ticket or revenue was ever planned for it.');
}

/* ------------------------------------- 5. does the offer set earn the year's mix */
for (const key of Object.keys(streamTarget)) {
  const pct = streamTarget[key] ? (streamOffer[key] / streamTarget[key]) * 100 : 0;
  if (pct < 50) add('critical', 'streams', `Offers cover only ${Math.round(pct)}% of the ${key} target`, `${lakh(streamOffer[key])} of offers against ${lakh(streamTarget[key])} of target.`);
  else if (pct < 75) add('high', 'streams', `Offers cover ${Math.round(pct)}% of the ${key} target`, `${lakh(streamOffer[key])} of ${lakh(streamTarget[key])}.`);
  else if (pct > 130) add('medium', 'streams', `Offers overshoot the ${key} target by ${Math.round(pct - 100)}%`, `${lakh(streamOffer[key])} against ${lakh(streamTarget[key])}.`);
}
const totalTarget = Object.values(streamTarget).reduce((a, b) => a + b, 0);
const totalOffer = Object.values(streamOffer).reduce((a, b) => a + b, 0);
console.log(`\nPlanned offer revenue: ${lakh(totalOffer)} of ${lakh(totalTarget)} (${Math.round((totalOffer / totalTarget) * 100)}% of the year).`);

/* --------------------------------------- 5b. whole-plan gaps, reported once each */
if (gaps.margin.length === offerCount && offerCount)
  add('medium', 'economics', 'No offer in the plan carries a contribution margin', `All ${offerCount} offers are null; nothing in the plan can be judged on margin, only on revenue.`);
if (gaps.audience.length)
  add('medium', 'offers', `${gaps.audience.length} of ${offerCount} offers name no audience`, `E.g. ${gaps.audience.slice(0, 3).join('; ')}. The CRM cannot segment an offer with no audience.`);
if (gaps.conditions.length)
  add('medium', 'offers', `${gaps.conditions.length} of ${offerCount} offers have no conditions`, 'Stacking, eligibility and one-per-client are left open at the desk.');

/* ------------------------------------------------- 6. Kemps Corner's own version */
{
  const files = fs.readdirSync(KC_DIR).filter(f => /^month-\d{2}\.json$/.test(f)).sort();
  if (files.length === 12) {
    const months = files.map(f => read(path.join(KC_DIR, f)));
    const kh = plan.studios.find(s => s.studio.code === 'KH');
    const history = plan.studioIntelligence?.KC?.history?.monthly || {};
    const filmed = { 10: '2025-10', 11: '2025-11', 12: '2025-12' };
    if (kh) {
      const fileTarget = months.reduce((s, m) => s + m.target, 0);
      const filePrior = months.reduce((s, m) => s + m.priorYear, 0);
      const fileOffers = months.reduce((s, m) => s + m.offers.length, 0);
      if (fileTarget !== kh.year.target) add('critical', 'version', 'Kemps Corner: two different plans for the same year', `server/data/kc-2027 files target ${rupees(fileTarget)}; the portfolio’s KH block targets ${rupees(kh.year.target)}.`);
      if (filePrior !== kh.year.priorYear)
        add('critical', 'version', 'Kemps Corner: the two plans disagree on the prior year', `Month files ${rupees(filePrior)} (+${(((fileTarget - filePrior) / filePrior) * 100).toFixed(1)}%); portfolio ${rupees(kh.year.priorYear)} (+${kh.year.growthPercent}%).`);
      const khOffers = kh.months.reduce((s, m) => s + m.offers.length, 0);
      if (fileOffers !== khOffers) add('critical', 'version', 'Kemps Corner: the two plans carry different offers', `Month files have ${fileOffers}, the portfolio’s KH block has ${khOffers}.`);
      for (let i = 0; i < 12; i++) {
        const fileMonthTarget = months[i].target;
        const pfMonthTarget = kh.months[i].target;
        if (fileMonthTarget !== pfMonthTarget) add('high', 'version', `Kemps Corner ${MONTHS[i]}: the two plans set different targets`, `Month file ${rupees(fileMonthTarget)}, portfolio ${rupees(pfMonthTarget)} (${rupees(pfMonthTarget - fileMonthTarget)}).`);
        const actual = history[filmed[i + 1]] ?? history[`2026-${String(i + 1).padStart(2, '0')}`];
        if (actual != null && months[i].priorYear !== actual)
          add('critical', 'version', `Kemps Corner ${MONTHS[i]}: prior year is not the observed actual`, `Month file ${rupees(months[i].priorYear)}, observed ${rupees(actual)} (${rupees(months[i].priorYear - actual)}).`);
      }
    }
  }
}

/* ------------------------------------------------------------------- the report */
if (!findings.length) {
  console.log('\nNo findings: the plan adds up and the offers carry it.\n');
  process.exit(0);
}
findings.sort((a, b) => ORDER[a.severity] - ORDER[b.severity] || a.area.localeCompare(b.area));

console.log('');
for (const severity of ['critical', 'high', 'medium', 'low']) {
  const group = findings.filter(f => f.severity === severity);
  if (!group.length) continue;
  console.log(`${severity.toUpperCase()} — ${group.length}`);
  for (const f of group) console.log(`  [${f.area}] ${f.title}\n      ${f.detail}`);
  console.log('');
}
const criticals = findings.filter(f => f.severity === 'critical').length;
console.log(`${findings.length} findings: ${criticals} critical, ${findings.filter(f => f.severity === 'high').length} high, ${findings.filter(f => f.severity === 'medium').length} medium, ${findings.filter(f => f.severity === 'low').length} low.`);
if (STRICT && criticals) process.exit(1);
