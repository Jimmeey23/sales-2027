#!/usr/bin/env node
/* Repairs the 2027 portfolio plan of record in place.

     node scripts/repair-portfolio-2027.mjs            # apply
     node scripts/repair-portfolio-2027.mjs --check    # report, write nothing

   Every change is one numbered step below, so a reviewer can read the fix instead of
   reverse-engineering the diff of a 1 MB file. The script is idempotent: applying it twice
   changes nothing the second time.

   It ends by recomputing every derived figure from the offers themselves — month offer
   revenue, growth, year streams, per-month bank plans, portfolio totals — and refuses to
   write if any invariant is broken. The plan is allowed to change; it is not allowed to
   stop adding up. */

import fs from 'node:fs';
import path from 'node:path';

const FILE = path.join(process.cwd(), 'server', 'data', 'portfolio-2027', 'v5-portfolio.json');
const CHECK = process.argv.includes('--check');
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_END = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const CITY_OF = { SHQ: 'Mumbai', KH: 'Mumbai', KK: 'Bengaluru', POP: 'Pop-up' };

const plan = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const log = [];
const step = (n, title, detail) => log.push(`${String(n).padStart(2, '0')}  ${title}\n      ${detail}`);

/** Adds a data gap once, so re-running the repair does not pile up duplicates. */
const addGap = text => {
  if (!plan.dataGaps.some(g => g === text)) plan.dataGaps.push(text);
};

const bankById = new Map(plan.offerBank.map(b => [b.id, b]));
const studioByCode = new Map(plan.studios.map(s => [s.studio.code, s]));
const monthOf = (code, month) => studioByCode.get(code).months.find(m => m.month === month);
const pad = n => String(n).padStart(2, '0');
const monthStart = m => `2027-${pad(m)}-01`;
const monthEnd = m => `2027-${pad(m)}-${MONTH_END[m - 1]}`;
const money = n => `₹${Math.round(n).toLocaleString('en-IN')}`;

const allOffers = () => {
  const out = [];
  for (const studio of plan.studios) for (const month of studio.months) for (const offer of month.offers)
    out.push({ code: studio.studio.code, month, offer });
  return out;
};

/* Push any numeric change made on the bank's side down onto the months that carry it.
   The bank is the source for price, ticket, buyers and revenue; the months are the record
   of where and when each offer runs. */
function syncOffersFromBank() {
  for (const { code, month, offer } of allOffers()) {
    const bank = bankById.get(offer.bankId);
    // Price and discount belong to the offer; buyers and revenue belong to the month it
    // runs in, so an extra month is never overwritten with the home month's figures.
    const own = bank?.planByMonth?.[month.month]?.[code];
    const entry = own || bank?.planByStudio?.[code];
    if (!entry) continue;
    if (entry.price != null) offer.price = entry.price;
    if (entry.ticket != null) offer.ticket = entry.ticket;
    if (entry.discount != null) offer.effectiveDiscountPercent = entry.discount;
    if (own) {
      if (own.buyers != null) offer.buyers = own.buyers;
      if (own.revenue != null) offer.expectedRevenue = own.revenue;
    } else {
      if (entry.buyers != null) offer.buyers = entry.buyers;
      if (entry.revenue != null) offer.expectedRevenue = entry.revenue;
    }
  }
}

/* --------------------------------------------------------------------------------------
   01 · One set of location codes.

   The bank was keyed BA/KC/KK/POP while the studios it feeds are keyed SHQ/KH/KK/POP, so
   any join on code found nothing — including the one that proved the catalogue and the
   months agreed.                                                                          */
{
  let renamed = 0;
  for (const bank of plan.offerBank) {
    const before = JSON.stringify([bank.studios, Object.keys(bank.planByStudio || {})]);
    if (bank.studios) bank.studios = bank.studios.map(c => (c === 'BA' ? 'SHQ' : c === 'KC' ? 'KH' : c));
    if (bank.planByStudio) {
      const next = {};
      for (const [code, entry] of Object.entries(bank.planByStudio)) next[code === 'BA' ? 'SHQ' : code === 'KC' ? 'KH' : code] = entry;
      bank.planByStudio = next;
    }
    if (JSON.stringify([bank.studios, Object.keys(bank.planByStudio || {})]) !== before) renamed++;
  }
  step(1, 'One set of location codes', `Renamed the bank's BA→SHQ and KC→KH in ${renamed} offers, so the catalogue joins to the months it feeds.`);
}

/* --------------------------------------------------------------------------------------
   02 · A bank offer can run in more than one month.

   `month` was a single number, so an offer could not be reused and the plan could not
   respond to a month with a gap in it. `month` stays as the primary month; `months` is
   the full list, and `planByMonth` (built at the end) carries the figures per month.      */
{
  for (const bank of plan.offerBank) if (!Array.isArray(bank.months)) bank.months = [bank.month];
  step(2, 'Offers may run in more than one month', 'Added `months` to all 50 bank offers and `planByMonth` alongside `planByStudio`, which stays the primary-month view.');
}

/* --------------------------------------------------------------------------------------
   03 · O27-28 Team Building declares Kenkere and then drops it.

   No plan, no buyers, no schedule. The declaration is withdrawn rather than invented.      */
{
  const bank = bankById.get('O27-28');
  if (bank.studios.includes('KK')) {
    bank.studios = bank.studios.filter(c => c !== 'KK');
    step(3, 'O27-28 no longer declares Kenkere', 'It was named in `studios` with no plan entry and no schedule. Withdrawn rather than given invented buyers.');
  }
}

/* --------------------------------------------------------------------------------------
   04 · The Bengaluru private price.

   The plan used ₹3,500 and flagged it "— confirm" in the policy. The catalogue
   (server/data/membership-prices.json) says ₹4,121.25, so every Kenkere private figure
   was understated — including the two privates that come with every annual. Kenkere
   4-class was also ₹4,779 against a catalogue ₹4,672.50.                                  */
{
  const kk = studioByCode.get('KK');
  const before = { privates: kk.prices.privateSession, four: kk.prices.fourClass };
  kk.prices.privateSession = 4121;
  kk.prices.fourClass = 4673;
  const PRIVATE = 4121.25;

  // Happy Hour: 20% off a single private; the ticket is two sessions (one free virtual).
  const happy = bankById.get('O27-23');
  const happyPrice = Math.round(PRIVATE * 0.8);
  happy.pricesByCity.Bengaluru = happyPrice;
  Object.assign(happy.planByStudio.KK, { price: happyPrice, ticket: happyPrice * 2 });
  happy.planByStudio.KK.revenue = happy.planByStudio.KK.ticket * happy.planByStudio.KK.buyers;

  // Private Practice: ten privates at 25%.
  const bulk = bankById.get('O27-24');
  const bulkPrice = Math.round(PRIVATE * 10 * 0.75);
  bulk.pricesByCity.Bengaluru = bulkPrice;
  Object.assign(bulk.planByStudio.KK, { price: bulkPrice, ticket: bulkPrice });
  bulk.planByStudio.KK.revenue = bulk.planByStudio.KK.ticket * bulk.planByStudio.KK.buyers;

  syncOffersFromBank();

  plan.policy.perkValues =
    'Private Mumbai ₹5,250; Bengaluru ₹4,121 (confirmed against the membership catalogue). ' +
    'Retail perk ₹2,000 list (confirm); guest pass = single-class price.';
  plan.dataGaps = plan.dataGaps.filter(g => !/Bengaluru private price/i.test(g));

  step(4, 'Bengaluru private price corrected', `Kenkere privateSession ${money(before.privates)} → ${money(kk.prices.privateSession)}, fourClass ${money(before.four)} → ${money(kk.prices.fourClass)}. Happy Hour ${money(2800)} → ${money(happyPrice)}, Private Practice ${money(26250)} → ${money(bulkPrice)}; policy no longer says “confirm”.`);
}

/* --------------------------------------------------------------------------------------
   05 · O27-16 Party Crasher Pass, pop-up price forgot the credit.

   Mumbai and Kenkere net the pass price off the first membership; the pop-up did not, so
   its "20% effective" was 15% in reality.                                                  */
{
  const bank = bankById.get('O27-16');
  const entry = bank.planByStudio.POP;
  if (entry && entry.price === 5892) {
    const corrected = entry.price - 999;
    bank.pricesByCity['Pop-up'] = corrected;
    bank.effectiveDiscountByCity['Pop-up'] = 15;
    Object.assign(entry, { price: corrected, ticket: corrected, discount: 15 });
    entry.revenue = corrected * entry.buyers;
    syncOffersFromBank();
    step(5, 'O27-16 pop-up price nets the credit', `${money(5892)} → ${money(corrected)} (8-class at 15% less the ₹999 credit, as Mumbai and Kenkere already did). Effective discount 20% → 15%.`);
  }
}

/* --------------------------------------------------------------------------------------
   06 · Pop-ups October prior year was double the actual.

   Every other pop-up month ties to history; October was ₹1,30,000 against an observed
   ₹65,205, which understated the ask as +43.5% instead of +186%.                          */
{
  const month = monthOf('POP', 10);
  const observed = plan.studioIntelligence.POP.history.monthly['2025-10'];
  if (month.priorYear !== observed) {
    const before = month.priorYear;
    month.priorYear = observed;
    step(6, 'Pop-ups October prior year corrected', `${money(before)} → ${money(observed)} (observed Oct-2025; every other pop-up month already tied).`);
  }
}

/* --------------------------------------------------------------------------------------
   07 · The pop-ups' win-back revenue had nowhere to sit.

   Seven offers were booked to reactivation while the pop-up year budgeted ₹0 for it. The
   stream now exists, funded out of new-client, with the funnel's win-backs and ticket
   written beside it so the two models still agree.                                        */
{
  const pop = studioByCode.get('POP');
  const TICKET = 5891; // the pop-up re-entry ticket the plan already uses elsewhere
  let moved = 0;
  const when = [];
  for (const month of pop.months) {
    const won = (month.offers || [])
      .filter(o => o.mechanics?.stream === 'reactivation')
      .reduce((sum, o) => sum + (o.expectedRevenue || 0), 0);
    if (!won) continue;
    const winbacks = Math.max(1, Math.round(won / TICKET));
    const amount = winbacks * TICKET;
    // Only the difference moves, so a second run is a no-op rather than a second shift.
    const delta = amount - (month.streams.reactivation || 0);
    month.streams.reactivation = amount;
    month.streams.newClient -= delta;
    month.funnel.winbacksNeeded = winbacks;
    month.funnel.winbackTicket = TICKET;
    moved += delta;
    when.push(`${MONTHS[month.month - 1].slice(0, 3)} ${winbacks}`);
  }
  if (moved) {
    pop.trailing.reactivationTicket = TICKET;
    addGap(
      'Pop-up win-back has no observed history: trailing reactivationTicket stays ₹0 because that is what the trailing twelve ' +
      'months actually show, while 2027 books it at a planned ₹5,891 ticket. The two are deliberately different.',
    );
    step(7, 'Pop-up reactivation is now a real stream', `${money(moved)} moved from new-client to reactivation (${when.join(', ')} win-backs at ${money(TICKET)}), and each month's funnel now carries the win-backs and ticket.`);
  }
}

/* --------------------------------------------------------------------------------------
   08 · Offers that ran past the month that counts them.

   Revenue is booked in the month an offer is filed under, so the purchase window has to
   close with that month. Where the mechanic genuinely needs a longer tail it survives as
   a claim-by date in the conditions.                                                      */
{
  const trimmed = new Set();
  for (const { code, month, offer } of allOffers()) {
    const v = offer.validity || {};
    if (!v.start || !v.end || v.end <= monthEnd(month.month)) continue;
    const tail = v.end;
    v.end = monthEnd(month.month);
    offer.cta = `${v.start} to ${v.end}`;
    const claim = ` Claim by ${tail}.`;
    if (offer.conditions && !offer.conditions.includes(claim)) offer.conditions += claim;
    trimmed.add(`${code} ${MONTHS[month.month - 1].slice(0, 3)} ${offer.name}`);
  }
  const COPY = [
    ['O27-07', 'Window 15 Feb–10 Mar.', 'Window 15–28 Feb; claim by 10 Mar.'],
    ['O27-34', 'Window 15 Aug–5 Sep.', 'Window 15–31 Aug; claim by 5 Sep.'],
  ];
  for (const [id, from, to] of COPY) {
    const bank = bankById.get(id);
    for (const key of ['offerDetails', 'rules', 'benefit', 'description'])
      if (typeof bank[key] === 'string') bank[key] = bank[key].replace(from, to);
  }
  for (const id of ['O27-19', 'O27-20', 'O27-39']) {
    const bank = bankById.get(id);
    for (const key of ['offerDetails', 'rules', 'benefit', 'description'])
      if (typeof bank[key] === 'string') bank[key] = bank[key].replace(/30 Jun/g, '31 May').replace(/15 Nov/g, '31 Oct');
  }
  step(8, 'Purchase windows close with their month', `${trimmed.size} offer instances trimmed to month-end, with the original tail kept as a claim-by date:\n      ${[...trimmed].join('\n      ')}`);
}

/* --------------------------------------------------------------------------------------
   09 · Every offer carries the ticket its revenue was built from.

   The month offers carried `price` — one product's shelf price — while the revenue was
   buyers × a blended ticket that only the bank held. So price × buyers never equalled the
   revenue, and the app, which stores price as expected ASP, recomputed the wrong money.
   `ticket` is now on the offer, and ticket × buyers is the revenue.                       */
{
  let tickets = 0;
  for (const { code, offer } of allOffers()) {
    const entry = bankById.get(offer.bankId)?.planByStudio?.[code];
    offer.ticket = entry?.ticket ?? offer.price ?? (offer.buyers ? Math.round((offer.expectedRevenue || 0) / offer.buyers) : null);
    tickets++;
  }
  step(9, 'Every offer carries its ticket', `${tickets} offers now state the blended ticket behind their revenue, so ticket × buyers = expectedRevenue. The importer uses it for expected ASP, so the app's economics agree with the plan instead of overstating revenue by up to 2.2×.`);
}

/* --------------------------------------------------------------------------------------
   10 · Contribution margin is computed, not filed.

   All 172 offers carried `contributionMargin: null` — a field nothing reads, implying a
   margin model the plan does not have.                                                    */
{
  let removed = 0;
  for (const { offer } of allOffers()) if ('contributionMargin' in offer) { delete offer.contributionMargin; removed++; }
  plan.economics = {
    marginModelled: false,
    reason: 'The plan models revenue and discount cost, not delivery cost. Contribution margin is computed by the offer engine from benefit costs; it is not filed in the plan.',
  };
  step(10, 'Margin is no longer implied', `Removed ${removed} empty contributionMargin fields and said once, at plan level, that the plan models revenue and discount rather than delivery cost.`);
}

/* --------------------------------------------------------------------------------------
   11 · Every offer names who it is for.

   85 of 172 had an empty audience, which also left the CRM cadence — one send per offer
   to its own audience — unbuildable.                                                      */
const AUDIENCE_BY_SLOT = {
  newcomer: 'First-time clients (phone verified).',
  renewal: monthName => `Members whose plan expires in ${monthName}.`,
  lapsed: 'Clients with no purchase in 90+ days.',
  referral: 'Current members bringing a guest.',
  upgrade: 'Members on 1 Month or class packs.',
  spot: 'Everyone, while the capped stock lasts; one per person.',
  privates: 'Members and newcomers buying private sessions.',
  corporate: 'Offices, HR and team leads; 10+ units on one invoice.',
  bookout: 'Anyone booking the studio for a private group of up to 12.',
  goodwill: 'Current members; no purchase needed.',
};
const audienceFor = (offer, month) => {
  const rule = AUDIENCE_BY_SLOT[offer.slot] || 'Current members.';
  return typeof rule === 'function' ? rule(MONTHS[month.month - 1]) : rule;
};
{
  let filled = 0;
  for (const { month, offer } of allOffers()) {
    if (offer.audience && String(offer.audience).trim()) continue;
    offer.audience = audienceFor(offer, month);
    filled++;
  }
  step(11, 'Every offer names an audience', `Filled ${filled} empty audience fields from the offer's slot, so the CRM can segment the plan.`);
}

/* --------------------------------------------------------------------------------------
   12 · Thank U, Next (Year) has no price discount, so it should say 0%.

   The bank's rule check already said "No price discount"; the offers said nothing, which
   put them outside the discount-cap check entirely.                                        */
{
  const bank = bankById.get('O27-44');
  for (const entry of Object.values(bank.planByStudio)) if (entry.discount == null) entry.discount = 0;
  let n = 0;
  for (const { offer } of allOffers()) {
    if (offer.bankId !== 'O27-44') continue;
    if (offer.effectiveDiscountPercent == null) offer.effectiveDiscountPercent = 0;
    // The offer itself is free — a guest pass — but the desk still quotes the guest the
    // price of the first membership it is meant to produce, so the offer needs a price.
    if (offer.price == null && offer.ticket != null) offer.price = offer.ticket;
    n++;
  }
  step(12, 'Thank U, Next (Year) declares 0% discount and a price', `${n} offers now state 0% — matching the bank's “No price discount” rule check — and quote the first membership the guest pass is meant to produce.`);
}

/* --------------------------------------------------------------------------------------
   13 · Extend offers into the months and locations that needed them.

   Eleven studio-months carried a new-client target with no newcomer offer at all, and the
   pop-ups' June had no offers whatsoever. Rather than invent new concepts, existing bank
   offers whose mechanic fits are run at the locations and in the months that need them.
   Buyers scale with that location's own stream for that month against the offer's home
   month, so the same offer is worth proportionally what the location is worth.            */
const EXTENSIONS = [
  { bank: 'O27-10', month: 3, studios: ['KH'] },
  { bank: 'O27-26', month: 7, studios: ['SHQ', 'KH', 'KK'] },
  { bank: 'O27-49', month: 11, studios: ['SHQ', 'KH', 'KK', 'POP'] },
  { bank: 'O27-02', month: 1, studios: ['POP'], price: { 'Pop-up': 1890 }, ticket: { POP: 5891 } },
  { bank: 'O27-12', month: 6, studios: ['POP'] },
  { bank: 'O27-12', month: 7, studios: ['POP'] },
  { bank: 'O27-12', month: 9, studios: ['POP'] },
  { bank: 'O27-22', month: 6, studios: ['POP'] },
];
const streamFor = slot => (slot === 'newcomer' ? 'newClient' : slot === 'lapsed' ? 'reactivation' : slot === 'renewal' ? 'renewal' : 'other');

{
  const added = [];
  for (const ext of EXTENSIONS) {
    const bank = bankById.get(ext.bank);
    if (!bank.months.includes(ext.month)) bank.months.push(ext.month);
    bank.months.sort((a, b) => a - b);

    const key = streamFor(bank.slot);
    const reference = allOffers().find(x => x.offer.bankId === ext.bank && x.month.month === bank.month);

    for (const code of ext.studios) {
      const month = monthOf(code, ext.month);
      if (month.offers.some(o => o.bankId === ext.bank)) continue;

      /* Scale from the closest thing we have: this studio's own plan for the home month
         if it has one, otherwise a studio in the same city, which shares its price book.
         Without that, a pop-up offer would inherit a Mumbai ticket. */
      const baseCode =
        (bank.planByStudio[code] ? code : null) ||
        Object.keys(bank.planByStudio).find(c => CITY_OF[c] === CITY_OF[code]) ||
        Object.keys(bank.planByStudio)[0];
      const baseEntry = bank.planByStudio[baseCode];
      const baseMonth = monthOf(baseCode, bank.month);
      const ratio = month.streams[key] / baseMonth.streams[key];
      const buyers = Math.max(1, Math.round(baseEntry.buyers * ratio));
      const ticket = ext.ticket?.[code] ?? baseEntry.ticket;
      const price = ext.price?.[CITY_OF[code]] ?? baseEntry.price;
      const revenue = ticket * buyers;

      if (!bank.studios.includes(code)) bank.studios.push(code);
      if (ext.price?.[CITY_OF[code]] != null) bank.pricesByCity[CITY_OF[code]] = ext.price[CITY_OF[code]];
      if (bank.effectiveDiscountByCity && bank.effectiveDiscountByCity[CITY_OF[code]] == null && baseEntry.discount != null)
        bank.effectiveDiscountByCity[CITY_OF[code]] = baseEntry.discount;

      const clone = JSON.parse(JSON.stringify(reference.offer));
      clone.id = bank.month === ext.month ? `${ext.bank}-${code}` : `${ext.bank}-${code}-m${ext.month}`;
      clone.price = price;
      clone.ticket = ticket;
      clone.buyers = buyers;
      clone.expectedRevenue = revenue;
      clone.validity = { start: monthStart(ext.month), end: monthEnd(ext.month) };
      clone.cta = `${monthStart(ext.month)} to ${monthEnd(ext.month)}`;
      clone.audience = audienceFor(clone, month);
      month.offers.push(clone);
      added.push(`${code} ${MONTHS[ext.month - 1].slice(0, 3)} · ${bank.name} · ${buyers} × ${money(ticket)} = ${money(revenue)}`);
    }
  }
  step(13, 'Offers extended into the months and locations that needed them', `${added.length} instances added:\n      ${added.join('\n      ')}`);
}

/* --------------------------------------------------------------------------------------
   13b · The pop-ups needed a renewal offer that is not tied to a moment.

   January, March, September and October each carried a renewal target at the pop-ups with
   no renewal offer, because every renewal mechanic in the catalogue hangs on a moment
   (post-April, monsoon, race, Black Friday). The pop-ups sell class packs rather than
   memberships, so their renewal is a repurchase decision and can be served by one standing
   offer. This is the only offer in the repair that is new rather than extended.          */
{
  if (!bankById.has('O27-51')) {
    const pop = studioByCode.get('POP');
    const baseMonth = monthOf('POP', 5); // O27-22's home month is the reference for volume
    const bank = {
      id: 'O27-51',
      month: 1,
      months: [1, 3, 9, 10],
      monthName: MONTHS[0],
      focus: 'Standing pop-up renewal',
      name: 'Same Time Next Week',
      slot: 'renewal',
      type: 'Pack renewal (standing)',
      mechanicTags: ['class pack', 'standing renewal', 'pop-up'],
      studios: ['POP'],
      offerDetails:
        'Pop-up regulars whose pack is running out take the same pack again at 15%: Copper + Cloves 10-class ₹7,229 ' +
        '(list ₹8,505) or 8-class ₹5,891 (list ₹6,930), with one extra week of validity. Bought before the old pack expires.',
      headline: 'Your pack is nearly out. Same one again, 15% less.',
      customerMessage:
        "You're nearly out of classes. Take the same pack again at 15% off — ₹7,229 for ten at Copper + Cloves, " +
        '₹5,891 for eight — and we’ll add a week of validity so none of them go to waste.',
      commercialJob: 'Hold the pop-up renewal rate with a mechanic that works in a month with no moment to hang an offer on.',
      logic:
        'The pop-ups sell class packs, not memberships, so renewal is a repurchase decision rather than an expiry date. ' +
        'Four of the twelve months carried a renewal target with no renewal offer in the catalogue; this is the standing one.',
      rules: '15% off the pack, inside the cap. One per client per pack expiry. The extra week of validity has no cash value.',
      kpi: 'Packs repurchased within 14 days of running out (target 55%); share of pop-up renewal revenue with an offer behind it.',
      pricesByCity: { 'Pop-up': 7229 },
      effectiveDiscountByCity: { 'Pop-up': 15 },
      discountRuleCheck: { 'Pop-up': 'OK: ≤20% effective' },
      validity: { start: monthStart(1), end: monthEnd(1) },
      planByStudio: {},
      plannedRevenue: 0,
    };
    plan.offerBank.push(bank);
    bankById.set('O27-51', bank);

    const added = [];
    for (const monthNumber of bank.months) {
      const month = monthOf('POP', monthNumber);
      const buyers = Math.max(1, Math.round(4 * (month.streams.renewal / baseMonth.streams.renewal)));
      const ticket = 7229;
      bank.planByStudio.POP = { buyers, ticket, revenue: ticket * buyers, price: ticket, discount: 15 };
      const offer = {
        id: monthNumber === bank.month ? 'O27-51-POP' : `O27-51-POP-m${monthNumber}`,
        bankId: 'O27-51',
        slot: 'renewal',
        name: bank.name,
        headline: bank.headline,
        benefit: bank.offerDetails,
        customerCopy: bank.customerMessage,
        description: bank.offerDetails,
        internalDescription: `${buyers} buyers × ${money(ticket)} = ${money(ticket * buyers)} (pop-up pricing).`,
        rationale: bank.logic,
        objective: bank.commercialJob,
        type: bank.type,
        mechanicTags: bank.mechanicTags,
        audience: 'Pop-up clients whose class pack is running out.',
        excludedAudience: null,
        conditions: bank.rules,
        cta: `${monthStart(monthNumber)} to ${monthEnd(monthNumber)}`,
        status: 'draft',
        approval: 'pending',
        runAds: false,
        price: ticket,
        ticket,
        expectedRevenue: ticket * buyers,
        buyers,
        effectiveDiscountPercent: 15,
        kpi: bank.kpi,
        validity: { start: monthStart(monthNumber), end: monthEnd(monthNumber) },
        mechanics: { city: 'Pop-up', stream: 'renewal', discountRule: 'OK: ≤20% effective' },
      };
      month.offers.push(offer);
      added.push(`${MONTHS[monthNumber - 1].slice(0, 3)} · ${buyers} × ${money(ticket)} = ${money(ticket * buyers)}`);
    }
    step('13b', 'A standing renewal offer for the pop-ups', `Added O27-51 “Same Time Next Week” (10-class pack at 15%) to fill the four months that had a renewal target and no renewal offer:\n      ${added.join('\n      ')}`);
  }
}

/* --------------------------------------------------------------------------------------
   14 · Say out loud how much of each month is expected at full price.

   The offers carry 61% of the year. The rest was an unwritten assumption; it is now a
   line in every month, with the number and the owner.                                     */
{
  for (const studio of plan.studios) for (const month of studio.months) {
    const planned = month.offers.reduce((s, o) => s + (o.expectedRevenue || 0), 0);
    const rest = month.target - planned;
    month.standardTrade = {
      revenue: rest,
      shareOfMonth: Number(((rest / month.target) * 100).toFixed(1)),
      note:
        'Full-price trade: memberships, packs and privates sold at list with no offer behind them. ' +
        'Owned by the studio manager and the front desk, not by a campaign. The plan does not model it offer by offer.',
    };
  }
  const total = plan.studios.reduce((s, x) => s + x.months.reduce((t, m) => t + m.standardTrade.revenue, 0), 0);
  const planned = plan.studios.reduce((s, x) => s + x.months.reduce((t, m) => t + m.offers.reduce((u, o) => u + (o.expectedRevenue || 0), 0), 0), 0);
  plan.assumptions = [
    `Offers carry ${money(planned)} of the year (${Math.round((planned / plan.totals.target) * 100)}%); ${money(total)} is expected at full price.`,
    'Full-price trade is not broken down by stream or product — it is the balance of each month’s target after the planned offers, owned by the studio manager.',
    'Offer buyers are the campaign slice only. A month’s funnel needs more buyers than its offers name; the difference is full-price trade.',
  ];
  step(14, 'The full-price assumption is written down', `Every month now states its standardTrade — ${money(total)} across the year — and who owns it, instead of leaving 39% of the plan unspoken.`);
}

/* --------------------------------------------------------------------------------------
   15 · Mark which targets were set by hand and which by a flat uplift.

   Kenkere had eight months at exactly +14.7% and the pop-ups twelve at +43.5%, mixed with
   hand-set months and nothing to tell them apart.                                         */
{
  const lines = [];
  for (const studio of plan.studios) {
    /* A rate repeated across three or more months is a formula left running; a rate that
       appears once or twice is somebody's judgement. */
    const rate = m => Math.round(((m.target - m.priorYear) / m.priorYear) * 1000) / 10;
    const counts = new Map();
    for (const m of studio.months) counts.set(rate(m), (counts.get(rate(m)) || 0) + 1);
    studio.months.forEach(m => { m.targetBasis = counts.get(rate(m)) >= 3 ? 'uplift' : 'hand_set'; });
    const lifted = studio.months.filter(m => m.targetBasis === 'uplift').length;
    if (lifted) lines.push(`${studio.studio.code} ${lifted}/12 at a flat +${[...counts].sort((a, b) => b[1] - a[1])[0][0]}%`);
    else lines.push(`${studio.studio.code} all hand-set`);
  }
  step(15, 'Targets marked by how they were set', lines.join(' · ') + '. A reviewer can now see where a judgement was made and where a formula was left to run.');
}

/* --------------------------------------------------------------------------------------
   16 · Say what "effective discount" means, and give the two offers that assert a cash
        cap the cash figure to support it.                                                 */
{
  plan.policy.discountDefinition =
    'effective% = the cash discount plus the list value of any non-cash perks (extra days, freezes, guest passes, privates, retail), ' +
    'valued at the studio’s own catalogue price. Cash alone is capped at 20%, except spot offers, annuals, bulk privates, bulk ' +
    'purchases and credited intro products, which may reach 25% (and, for credited intro products, whatever the acquisition cost works out to).';
  for (const id of ['O27-35', 'O27-43']) {
    const bank = bankById.get(id);
    if (/cash\s*≤\s*20%/i.test(JSON.stringify(bank.discountRuleCheck || {}))) bank.cashDiscountPercent = 20;
  }
  addGap(
    'Cash and perk components are separated only for the offers that assert a cash cap (O27-35, O27-43); every other offer reports a blended effective discount.',
  );
  step(16, 'The discount definition is testable', 'policy.discountDefinition states how effective% is built, and the two offers whose rule checks assert “cash ≤20%” now carry cashDiscountPercent: 20.');
}

/* --------------------------------------------------------------------------------------
   Recompute everything derivable from the offers themselves.                             */
for (const bank of plan.offerBank) {
  // plans per month, derived from where the offer actually runs
  const byMonth = {};
  for (const { code, month, offer } of allOffers()) {
    if (offer.bankId !== bank.id) continue;
    (byMonth[month.month] ||= {})[code] = {
      buyers: offer.buyers,
      ticket: offer.ticket ?? offer.price,
      revenue: offer.expectedRevenue,
      price: offer.price,
      discount: offer.effectiveDiscountPercent,
    };
  }
  bank.planByMonth = byMonth;
  bank.planByStudio = byMonth[bank.month] || {};
  bank.studios = [...new Set(Object.values(byMonth).flatMap(m => Object.keys(m)))].sort();
  bank.plannedRevenue = Object.values(byMonth).flatMap(m => Object.values(m)).reduce((s, p) => s + (p.revenue || 0), 0);
}

for (const studio of plan.studios) {
  for (const month of studio.months) {
    month.offersPlannedRevenue = month.offers.reduce((s, o) => s + (o.expectedRevenue || 0), 0);
    month.growthPercent = Number((((month.target - month.priorYear) / month.priorYear) * 100).toFixed(1));
    if (month.crm) {
      month.crm.sends = month.offers.map(o => ({ offerId: o.id, audience: o.audience || null, message: o.customerCopy || o.headline || null }));
      month.crm.sendsCount = month.crm.sends.length;
    }
    if (month.collateral?.pieces) {
      const kept = month.collateral.pieces.filter(p => month.offers.some(o => o.id === p.offerId));
      for (const o of month.offers)
        if (!kept.some(p => p.offerId === o.id))
          kept.push({ offerId: o.id, headline: o.headline || o.name, copy: o.customerCopy || o.headline || null, detail: o.benefit || null });
      month.collateral.pieces = kept;
    }
  }
  const year = studio.year;
  year.target = studio.months.reduce((s, m) => s + m.target, 0);
  year.priorYear = studio.months.reduce((s, m) => s + m.priorYear, 0);
  year.growthPercent = Number((((year.target - year.priorYear) / year.priorYear) * 100).toFixed(1));
  for (const key of ['newClient', 'renewal', 'reactivation', 'other'])
    year.streams[key] = studio.months.reduce((s, m) => s + m.streams[key], 0);
}
plan.totals.target = plan.studios.reduce((s, x) => s + x.year.target, 0);
plan.totals.priorYear = plan.studios.reduce((s, x) => s + x.year.priorYear, 0);
plan.totals.growthPercent = Number((((plan.totals.target - plan.totals.priorYear) / plan.totals.priorYear) * 100).toFixed(1));
plan.totals.offers = allOffers().length;
plan.totals.offerBankSize = plan.offerBank.length;
plan.totals.offersPlannedRevenue = allOffers().reduce((s, x) => s + (x.offer.expectedRevenue || 0), 0);
plan.totals.standardTradeRevenue = plan.totals.target - plan.totals.offersPlannedRevenue;
plan.generatedAt = new Date().toISOString();
plan.repairedBy = 'scripts/repair-portfolio-2027.mjs';

/* --------------------------------------------------------------------------------------
   Validate. Nothing is written unless every invariant holds.                              */
const problems = [];
const check = (ok, message) => { if (!ok) problems.push(message); };

for (const studio of plan.studios) {
  const code = studio.studio.code;
  const target = studio.months.reduce((s, m) => s + m.target, 0);
  const prior = studio.months.reduce((s, m) => s + m.priorYear, 0);
  check(target === studio.year.target, `${code}: months ${money(target)} ≠ year ${money(studio.year.target)}`);
  check(prior === studio.year.priorYear, `${code}: prior months ${money(prior)} ≠ year ${money(studio.year.priorYear)}`);
  for (const key of ['newClient', 'renewal', 'reactivation', 'other']) {
    const sum = studio.months.reduce((s, m) => s + m.streams[key], 0);
    check(sum === studio.year.streams[key], `${code}: ${key} months ${money(sum)} ≠ year ${money(studio.year.streams[key])}`);
  }
  check(Object.values(studio.year.streams).reduce((a, b) => a + b, 0) === studio.year.target, `${code}: year streams do not add to the year target`);
  for (const month of studio.months) {
    const label = `${code} ${MONTHS[month.month - 1]}`;
    check(Object.values(month.streams).reduce((a, b) => a + b, 0) === month.target, `${label}: streams do not add to the month target`);
    check(month.offersPlannedRevenue === month.offers.reduce((s, o) => s + (o.expectedRevenue || 0), 0), `${label}: offersPlannedRevenue is stale`);
    check(month.offers.length > 0, `${label}: still has no offers`);
    check(new Set(month.offers.map(o => o.id)).size === month.offers.length, `${label}: duplicate offer id`);
    for (const offer of month.offers) {
      check(offer.ticket == null || !offer.buyers || offer.expectedRevenue == null || offer.ticket * offer.buyers === offer.expectedRevenue,
        `${label} “${offer.name}”: ticket × buyers ≠ revenue`);
      check(!offer.validity?.end || offer.validity.end <= monthEnd(month.month), `${label} “${offer.name}”: window still runs past the month`);
      check(!!offer.audience, `${label} “${offer.name}”: no audience`);
      check(offer.effectiveDiscountPercent != null, `${label} “${offer.name}”: no effective discount`);
    }
  }
}
const ids = new Set(allOffers().map(x => x.offer.id));
check(ids.size === allOffers().length, 'offer ids are not unique across the plan');
for (const bank of plan.offerBank) {
  const at = allOffers().filter(x => x.offer.bankId === bank.id);
  const sum = at.reduce((s, x) => s + (x.offer.expectedRevenue || 0), 0);
  check(at.length > 0, `${bank.id} “${bank.name}” is never scheduled`);
  check(bank.plannedRevenue === sum, `${bank.id}: plannedRevenue ${money(bank.plannedRevenue)} ≠ scheduled ${money(sum)}`);
  for (const { month, code, offer } of at) {
    check((bank.months || [bank.month]).includes(month.month), `${bank.id} runs in month ${month.month}, which it is not filed under`);
    const entry = bank.planByMonth?.[month.month]?.[code];
    check(!!entry, `${bank.id} has no ${code} plan for month ${month.month}`);
    if (entry) check(entry.revenue === offer.expectedRevenue, `${bank.id} ${code} M${month.month}: plan revenue ≠ month offer revenue`);
  }
  for (const code of Object.keys(bank.planByStudio || {}))
    check(at.some(x => x.code === code && x.month.month === bank.month), `${bank.id} plans ${code} for its home month but is not scheduled there`);
}
check(plan.totals.offers === allOffers().length, 'totals.offers does not match the offers carried');
check(plan.totals.offersPlannedRevenue === allOffers().reduce((s, x) => s + (x.offer.expectedRevenue || 0), 0), 'totals.offersPlannedRevenue does not match');
check(plan.totals.offers + 0 === plan.totals.offers, 'nan');

if (problems.length) {
  console.error('\nThe repaired plan does not add up, so nothing was written:\n');
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

if (!CHECK) fs.writeFileSync(FILE, `${JSON.stringify(plan, null, 2)}\n`);
console.log(CHECK ? 'Check only — the repaired plan adds up.\n' : `Wrote ${path.relative(process.cwd(), FILE)}\n`);
for (const line of log) console.log(line);
console.log(
  `\n${plan.totals.offers} offers · ${money(plan.totals.offersPlannedRevenue)} planned · ` +
  `${money(plan.totals.target)} target · ${money(plan.totals.standardTradeRevenue)} at full price`,
);
