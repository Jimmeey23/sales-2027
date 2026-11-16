/* Builds src/data/anniversary2027.json, the Anniversary tab's plan of action for April 2027.

     node scripts/build-anniversary-plan.mjs

   Every number (targets, streams, funnel, offer prices, buyers and revenue) is read from the
   April months of the plan of record, server/data/portfolio-2027/v5-portfolio.json, so the
   tab cannot disagree with the month plan or Target Metrics. The creative plan (acts, events,
   activations, comms, studio plays, merch, run sheet, KPIs, risks) is written here.
   April 2026 actuals quoted in `why` and `repeat` are measured history from the sales export. */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const plan = JSON.parse(fs.readFileSync(path.join(ROOT, 'server/data/portfolio-2027/v5-portfolio.json'), 'utf8'));
const OUT = path.join(ROOT, 'src/data/anniversary2027.json');
const STUDIOS = [
  ['KH', 'Kemps Corner', 1],
  ['SHQ', 'Bandra', 2],
  ['KK', 'Kenkere House', 3],
  ['POP', 'Pop-ups', 4],
];
const april = code => plan.studios.find(s => s.studio.code === code).months.find(m => m.month === 4);
const L = v => `₹${(v / 100000).toFixed(1)}L`;

/* ── Numbers from the plan ─────────────────────────────────────────────── */
const targets = STUDIOS.map(([code, studio]) => {
  const m = april(code);
  return { studio, apr26: m.priorYear, apr27: m.target, newClient: m.streams.newClient, renewal: m.streams.renewal, reactivation: m.streams.reactivation, other: m.streams.other, offers: m.offersPlannedRevenue };
});
const sum = k => targets.reduce((t, r) => t + r[k], 0);
targets.push({ studio: 'Total', apr26: sum('apr26'), apr27: sum('apr27'), newClient: sum('newClient'), renewal: sum('renewal'), reactivation: sum('reactivation'), other: sum('other'), offers: sum('offers') });
const total = targets.at(-1);

const funnel = STUDIOS.map(([code, studio]) => {
  const f = april(code).funnel;
  return { studio, leads: f.leads, trials: f.trials, newBuyers: f.newBuyers, renewals: f.existingPayingRenewals, winbacks: f.winbacksNeeded, trialToMember: f.trialToMember };
});

const order = april('KH').offers.map(o => o.bankId);
for (const [code] of STUDIOS) for (const o of april(code).offers) if (!order.includes(o.bankId)) order.push(o.bankId);
const offers = order.map(id => {
  const rows = STUDIOS.map(([code, studio]) => {
    const o = april(code).offers.find(x => x.bankId === id);
    return o && { studio, price: o.price, effectiveDiscount: o.effectiveDiscountPercent, buyers: o.buyers, revenue: o.expectedRevenue, rule: o.mechanics.discountRule };
  }).filter(Boolean);
  const o = STUDIOS.map(([c]) => april(c).offers.find(x => x.bankId === id)).find(Boolean);
  return {
    id, name: o.name, slot: o.slot, type: o.type, headline: o.headline, details: o.benefit, message: o.customerCopy,
    job: o.objective, why: o.rationale, audience: o.audience, rules: o.conditions, kpi: o.kpi,
    window: `${o.validity.start} → ${o.validity.end}`, tags: o.mechanicTags, studios: rows,
    revenue: rows.reduce((t, r) => t + r.revenue, 0), buyers: rows.reduce((t, r) => t + r.buyers, 0),
  };
});

/* ── The creative plan ─────────────────────────────────────────────────── */
const acts = [
  {
    n: 'I', name: 'The pre-party', dates: '18 Mar – 4 Apr',
    line: 'Tease it, reward March renewers with first pick, launch loud on 1 April, hand out the passports.',
    events: [
      ['Thu 18 Mar', 'Teaser: “Something’s turning 9.” Countdown sticker on every mirror; nothing else explained.', 'Curiosity before the price list exists.', 'All'],
      ['Tue 30 – Wed 31 Mar', 'Platinum Hour: 48-hour early access for everyone who renewed in March. First pick of numbered keys (001 goes to the first Platinum member through the door) and the first Club Nine seats.', 'Rewards March commitment; sells the first keys before launch.', 'All'],
      ['Thu 1 Apr', 'Launch: the “Nine Years in Ninety Seconds” film, then the April Fools’ price list (“₹57 lifetime membership”) that turns into the real one at noon. The 9-Month Lease and the 9-Class Pack go on sale; the Impulse Buzzer goes live at every desk.', 'The loudest first day of the year; explains how to play.', 'All'],
      ['Sat 3 Apr', 'Blind Date With a Class: format and trainer secret until you walk in.', 'Members try a class they would never book; first passport stamp.', 'All'],
      ['Sun 4 Apr', 'Nine Lives Passports handed out: nine experiences to collect in April (Throwback, Plank of Fame, a Lab or powerCycle class, Séance, Birthday Bash, Reunion, a new trainer, a friend, the Awards).', 'Attendance across the month: collect what you enjoy, no class count.', 'All'],
    ],
  },
  {
    n: 'II', name: 'Anniversary week', dates: '5 – 11 Apr',
    line: 'Seven days, seven moments: the wheel, the throwback, the plank-off, best friends, the 9:09 panic and the first birthday party.',
    events: [
      ['Mon 5 Apr', 'The Wheel of Nine opens: renew, spin, keep, double or donate.', 'Renewals with a prize everyone talks about.', 'All'],
      ['Tue 6 Apr', 'Throwback Class: the 2018 playlist and the original choreography, taught by the longest-serving trainer.', 'Nostalgia for long-time members; the best content of the month.', 'All'],
      ['Wed 7 Apr', 'Plank of Fame: a studio plank-off. The top 9 at each studio win a private and a year on the wall; everyone gets their Plank Your Price time.', 'Bragging rights; introduces privates and the 9-Class Pack.', 'All'],
      ['Thu 8 Apr', 'Bring Your Barre-stie: a free guest pass for every member; Plus One, Plus Nine pays out on any friend who buys.', 'Referral acquisition at its warmest.', 'All'],
      ['Fri 9 Apr', 'The 9:09 Panic Attack: siren, countdown and the floor price for 99 minutes from 9:09 am and again from 9:09 pm.', 'The month’s biggest sales spike, on the entry product.', 'All'],
      ['Sat 10 Apr', 'Kenkere Birthday Class with pop-up regulars invited from Copper + Cloves and Plash Pilates.', 'Bengaluru’s own party; turns pop-up regulars into Kenkere visitors.', 'Kenkere House · Pop-ups'],
      ['Sun 11 Apr', 'Trainer Swap Sunday: Mumbai trainers swap studios for the day; a Mumbai guest trainer at Kenkere.', 'A new face for every regular; cross-studio visits.', 'All'],
    ],
  },
  {
    n: 'III', name: 'The haunting', dates: '12 – 23 Apr',
    line: 'The lapsed list gets its obituary, gold envelopes hide in the studios, and the birthday weekend arrives.',
    events: [
      ['12 – 25 Apr', 'Hidden 9s: nine gold envelopes hidden in each studio each week (guest passes, smoothies, grip socks, one private). Found it? Post it.', 'Footfall and Stories every day of the fortnight.', 'All'],
      ['Tue 13 Apr', 'Obituary postcards land with the lapsed list: “Here lies a perfectly good plank.” WhatsApp version the same day.', 'The winback with a story people screenshot.', 'All'],
      ['Thu 15 Apr', 'Séance Class: candle-lit, the postcard is the ticket; the Back From the Dead photo frame by the door.', 'Winback in person; the 15% comeback offer after class.', 'All'],
      ['Sat 17 Apr', 'Club Nine Unveiling + Birthday Bash: the nine numbered seats revealed, DJ class, cake; Party Crasher Pass holders get the party class.', 'Status for annual buyers; the best room of the year for newcomers.', 'All'],
      ['Sun 18 Apr', 'The anniversary: ‘9 at 9’ — nine trainers, one class at 9 am. Then the Time Capsule: members write a note to open in April 2028.', 'The emotional peak; a 2028 renewal conversation already booked.', 'All'],
      ['Wed 21 Apr', 'Founders’ Hour: nine years in nine stories, live, with a trainer Q&A (studio and Instagram Live).', 'Brand story; keeps week three warm.', 'Mumbai · streamed'],
    ],
  },
  {
    n: 'IV', name: 'Awards & Lock-In', dates: '24 – 30 Apr',
    line: 'The Throwback Reunion and the Golden Glute Awards, the last keys, and a midnight close with no extension.',
    events: [
      ['Sat 24 Apr', 'Throwback Reunion (a row for every cohort, Class of 2018 to Class of 2026), then the Golden Glute Awards: member-voted categories and a trainer roast.', 'Community and content; every winner is a renewal conversation.', 'All'],
      ['Tue 27 Apr', 'Last call: live key counter on every screen and Story; Club Nine seats left, by studio.', 'Real scarcity, shown honestly.', 'All'],
      ['Fri 30 Apr', 'The Lock-In: last-day desk hours to 10 pm, the final keys, and anniversary prices close at midnight. No extension, no second batch.', 'Deadline pressure on the biggest tickets; price integrity for May.', 'All'],
    ],
  },
];

const activations = [
  ['The Impulse Buzzer', 'Newcomers', 'A big red buzzer at the desk. A newcomer who buys within 9 hours of their third Party Crasher class hits it: confetti, applause, name on the Reckless Decisions board.', 'Party Crasher Pass'],
  ['Wheel of Nine (double-or-donate)', 'Renewals', 'Spin after an April renewal. Keep the prize, double it by booking 9 classes in the first 21 days, or donate it to a friend as a guest pass. Published odds on the wall.', 'Spin Class (Literally)'],
  ['Plank Your Price', 'Entry pack', 'Hold a plank at the desk: 57 seconds, 1:57 or 2:57 sets the 9-Class Pack price. Every attempt is a show for whoever is waiting.', 'The 9:09 Panic Attack'],
  ['Keys and the Lease Wall', 'Biggest ticket', '99 numbered brass keys in Mumbai, 39 in Bengaluru. Every buyer’s name goes on the Lease Wall; a live counter on the studio screens.', 'Moving In Together (The 9-Month Lease)'],
  ['The Club Nine wall', 'Annuals', 'Nine numbered seats per studio, unveiled at the Birthday Bash; jackets numbered 1–9; priority booking all year.', 'Club Nine: The Founders’ Table'],
  ['Obituaries, Séance & the Resurrection frame', 'Winback', 'Obituary postcards to the lapsed list, a candle-lit Séance Class, and a Back From the Dead photo frame for every returner (posted with permission).', 'Faking Your Own Death Didn’t Work'],
  ['Bring Your Barre-stie', 'Referral', 'A free guest pass for every member on 8 April; three buying friends earn a free month.', 'Plus One, Plus Nine'],
  ['The 9:09 Panic Attack', 'Flash sale', 'Siren, countdown, two 99-minute windows on 9 April. The floor price for everyone, no plank needed.', 'The 9:09 Panic Attack'],
  ['Nine Lives Passport', 'Attendance', 'Nine April experiences to collect. Five stamps enter the Awards draw; all nine get a passport pin. No purchase needed and nothing is unlocked by a class count.', '— (marketing cost)'],
  ['Hidden 9s', 'Footfall', 'Gold envelopes hidden in each studio, nine a week, 12–25 April.', '— (marketing cost)'],
  ['Golden Glute Awards', 'Community', 'Member-voted: Front Row Forever, Loudest Shaker, Grip Sock Icon, Comeback of the Year, Plank Champion, Best Studio Duo, Trainer of the Year, plus the trainer roast.', '— (marketing cost)'],
  ['Time Capsule', 'Next year', 'A note from every member, sealed on 18 April and opened at the 10th anniversary, each one a renewal conversation in April 2028.', '— (marketing cost)'],
].map(([name, tag, drama, sells]) => ({ name, tag, drama, sells }));

const role = { KH: 'Retention-led', SHQ: 'Reactivation-led', KK: 'Conversion-led', POP: 'Reach-led' };
const studioPlays = STUDIOS.map(([code, studio]) => {
  const m = april(code);
  const top = [...m.offers].sort((a, b) => b.expectedRevenue - a.expectedRevenue).slice(0, 3);
  const PLAYS = {
    KH: ['Sell the keys first: Platinum Hour and the first week carry the 9-Month Lease.', 'Club Nine at 5 seats, then stop; push 6-Month upgrades after.', 'Hold discount depth under 15% of gross (April 2026 ran at 30.1%).'],
    SHQ: ['Obituary postcards to every 61-day-to-3-year lapser; Séance Class at Supreme HQ.', 'Lab seats on every Party Crasher Pass; Plank of Fame in the Lab.', 'Bandra discounted 25.3% in April 2026 and still earned less than 2025: no code above the plan.'],
    KK: ['Party Crasher at ₹699 replaces the 50% intro for April; book class 3 at the desk.', 'The Birthday Class on 10 April with pop-up regulars as guests.', 'Two of the 39 Bengaluru keys; a Mumbai guest trainer on Trainer Swap Sunday.'],
    POP: ['Wheel of Nine on the 10-class pack; the 9:09 pack at ₹6,499.', 'Every regular invited to the Kenkere Birthday Class.', 'One referral push: Plus One, Plus Nine with the Cloud Nine tote.'],
  };
  return {
    studio, role: role[code], target: m.target, prior: m.priorYear, growth: m.growthPercent,
    offersRevenue: m.offersPlannedRevenue, standardTrade: m.target - m.offersPlannedRevenue,
    lead: top.map(o => `${o.name} (${o.buyers} × ₹${o.ticket.toLocaleString('en-IN')} = ${L(o.expectedRevenue)})`),
    plays: PLAYS[code],
  };
});

const comms = [
  ['T−14 · 18 Mar', 'Teaser', 'Instagram, mirror stickers', 'Something’s turning 9. (No dates, no prices.)'],
  ['T−2 · 30 Mar', 'Platinum Hour', 'WhatsApp to March renewers', 'You renewed in March, so you get first pick: keys 001–009 and the first Club Nine seats open now, 48 hours before everyone else.'],
  ['1 Apr', 'Launch', 'All channels + film', 'Nine years in ninety seconds. The 9-Month Lease and the 9-Class Pack exist for 30 days only.'],
  ['5 Apr', 'Wheel opens', 'WhatsApp to renewals due in April', 'Renew in April and spin the Wheel of Nine. Every spin wins.'],
  ['8 Apr', 'Barre-stie day', 'WhatsApp + Stories', 'Bring your barre-stie free today. If they join, you get 9 days.'],
  ['9 Apr', '9:09 Panic Attack', 'Stories countdown, push, WhatsApp at 8:55', 'The floor price is live for 99 minutes. Panic responsibly.'],
  ['13 Apr', 'Obituaries', 'Postcard + WhatsApp to the lapsed list', 'We wrote your obituary. You’re invited to the Séance Class on 15 April.'],
  ['16 Apr', 'Birthday weekend', 'All channels', 'Club Nine unveiling on Saturday, ‘9 at 9’ on Sunday. Cake is not optional.'],
  ['23 Apr', 'Awards', 'Voting form + Stories', 'Vote for the Golden Glute Awards: front row forever, loudest shaker, comeback of the year.'],
  ['27 Apr', 'Last keys', 'Live counter on screens + Stories', 'Keys left: [live count]. When they’re gone, they’re gone.'],
  ['30 Apr', 'Lock-In', 'WhatsApp + desk to 10 pm', 'Anniversary prices close at midnight. No extension.'],
].map(([when, what, channel, message]) => ({ when, what, channel, message }));

const merch = [
  ['Numbered brass keys', '99 Mumbai · 39 Bengaluru', 'Moving In Together (The 9-Month Lease)'],
  ['Anniversary hoodies', '≈ 20 (lease buyers) + trainers', 'Moving In Together (The 9-Month Lease)'],
  ['Numbered Club Nine jackets', '9 per studio', 'Club Nine: The Founders’ Table'],
  ['Cloud Nine totes', '≈ 25', 'Plus One, Plus Nine'],
  ['Grip socks, smoothie vouchers, passport pins', 'Wheel, Hidden 9s and passports', 'Spin Class (Literally); activations'],
  ['Obituary postcards', 'One per lapsed client on the list', 'Faking Your Own Death Didn’t Work'],
  ['Wheel of Nine, Impulse Buzzer, confetti cannons', 'One set per studio', 'Desk activations'],
  ['Lease Wall, Club Nine wall, Back From the Dead frame', 'One per studio', 'In-studio'],
  ['Nine Lives Passports (print + digital)', 'All active members', 'Attendance'],
  ['Time Capsule box', 'One per studio', '18 April'],
].map(([item, qty, forWhat]) => ({ item, qty, for: forWhat }));

const runSheet = [
  ['Platinum early-access list (March renewers) and desk script', 'Studio managers', '1 Mar'],
  ['All 8 April offers set up in Momence with offer IDs (O27-13…18, 53, 54); numbered keys as a capped product', 'Sales head', '15 Mar'],
  ['25% cap sign-off on every April price (Plank Your Price tiers, Club Nine perks, the 90-pack)', 'Sales head', '20 Mar'],
  ['Teaser assets; film “Nine Years in Ninety Seconds”; 9:09 countdown; April Fools’ price list', 'Marketing', '15 Mar'],
  ['Keys, jackets, hoodies, totes, wheel, buzzer, confetti, walls and frame delivered', 'Marketing', '25 Mar'],
  ['Passports, Hidden 9s envelopes, awards categories and voting form', 'Marketing', '28 Mar'],
  ['Trainer roster for every event; head trainer owns each one; Trainer Swap Sunday pairs', 'Head trainers', '28 Mar'],
  ['Obituary postcards printed and addressed to the lapsed list', 'Marketing', '8 Apr'],
  ['Birthday Bash, ‘9 at 9’ and Awards line-up: DJ, cake, trophies, photographer', 'Head trainers', '10 Apr'],
  ['Daily tracker: sales, keys and seats vs April daily targets; 9:09 window results', 'Studio managers', 'Daily from 30 Mar'],
  ['May follow-up lists: doubled-wheel members, passport holders under 3 stamps, Séance attendees who did not buy', 'Studio managers', '3 May'],
].map(([what, owner, by]) => ({ what, owner, by }));

const roles = [
  ['Sales head', 'Prices, caps and the daily tracker; signs off every April offer; owns the revenue number.'],
  ['Studio managers', 'Momence set-up, the desk scripts, keys and seats inventory, the May follow-up lists.'],
  ['Head trainers', 'Every event, the trainer roster, the Throwback, the plank-off and the Awards.'],
  ['Marketing', 'Film, teaser, countdowns, print (postcards, passports), merch and the comms calendar.'],
  ['Front desk', 'The buzzer, the wheel, Plank Your Price and the three-sentence pitch for each offer.'],
].map(([who, owns]) => ({ who, owns }));

const kpis = [
  ['April revenue', `${L(total.apr27)} across the four locations (+${Math.round((total.apr27 / total.apr26 - 1) * 100)}% on April 2026)`],
  ['Average discount', 'Under 15% of gross sales at every studio (April 2026: Kemps Corner 30.1%, Bandra 25.3%, Kenkere 8.8%)'],
  ['Product mix', 'At least half of April membership revenue from 3-Month, 6-Month, 9-Month and Annual plans'],
  ['Keys and seats', '17 of the 9-Month Leases sold (11 Kemps Corner, 4 Bandra, 2 Kenkere); 9 Club Nine seats'],
  ['Newcomers', `${funnel.reduce((t, f) => t + f.newBuyers, 0)} new buyers; Party Crasher pass → member 35%`],
  ['Referrals', 'Referral buyers at 2× April 2026'],
  ['Repeat purchase', 'April 2027 buyers who buy again May–Oct: targets by studio below'],
].map(([kpi, target]) => ({ kpi, target }));

const risks = [
  ['Discount creep at the desk', 'One reward per purchase; offers, the wheel and the flash price never combine; no desk overrides above the plan price.'],
  ['The keys do not sell out', 'No second batch and no price cut. Move the conversation to Club Nine or a 6-Month after 20 April.'],
  ['Lead volume (Kemps Corner needs 941 April leads; its best month had far fewer)', 'Fund April paid media explicitly, push Barre-stie day and Plus One, Plus Nine; review leads weekly against the funnel.'],
  ['April pulls May revenue forward', 'No anniversary price after 30 April; May offers reward April buyers who attend, they do not extend April pricing.'],
  ['Event fatigue and staff overload', 'A head trainer owns each event; no more than one event a day in week two; rota published by 28 March.'],
].map(([risk, mitigation]) => ({ risk, mitigation }));

const pack = {
  generated: new Date().toISOString().slice(0, 10),
  source: 'scripts/build-anniversary-plan.mjs (numbers from server/data/portfolio-2027/v5-portfolio.json, April)',
  title: 'Cloud Nine: the 9th Anniversary',
  subtitle: 'Physique 57 India · April 2027 · four acts, eight offers, twelve activations and a midnight close',
  summary: `April 2027 target: ${L(total.apr27)} across the four locations, against ${L(total.apr26)} in April 2026 — the first ₹1 crore month in Physique 57 India’s history. Named offers carry ${L(total.offers)} (${Math.round((total.offers / total.apr27) * 100)}%); the rest is full-price trade. April has to win on excitement and on economics: two products that exist only this month, a flash pack you can earn with a plank, a wheel you can double, numbered annual seats, a month of events, and no offer above 25% effective.`,
  idea: 'Cloud Nine: nine years, one month, no chill. April is a party in four acts. The pre-party rewards March renewers with first pick; anniversary week runs a moment a day; the haunting sends the lapsed list its own obituary; and the month closes with the Golden Glute Awards and a midnight Lock-In. Every reward is something to do or to show off — a key, a seat, a stamp, a spin — which costs less than a discount and brings clients into the studio, which is what makes them renew.',
  nines: [
    ['9-Month Lease', '99 numbered keys in Mumbai, 39 in Bengaluru'],
    ['Club Nine', '9 numbered annual seats per studio'],
    ['Wheel of Nine', 'every spin wins; double or donate'],
    ['9-Class Pack', 'plank for your price; 99 days to use it'],
    ['9:09', 'two 99-minute flash windows on 9 April'],
    ['Plus Nine', '+9 days for every friend who joins'],
    ['Nine Lives', 'a passport of nine April experiences'],
    ['Hidden 9s', 'nine gold envelopes a week per studio'],
    ['9 at 9', 'nine trainers, one class, 9 am on 18 April'],
  ].map(([name, line]) => ({ name, line })),
  why: [
    { head: 'April 2026 was bought with discount', body: 'Kemps Corner’s April 2026 was a record ₹50.0L, but its average discount was 30.1% (April 2025: 14.1%) and anniversary codes ran at 40–48% effective. Bandra discounted more (25.3%) and still earned less than in April 2025.' },
    { head: 'April buyers do not all come back', body: 'Between May and October 2026, 57% of Kemps Corner’s April buyers bought again, 51% at Bandra, 68% at Kenkere House and 41% at the pop-ups. The doubled wheel, the passports and the May follow-ups are built to fix this.' },
    { head: 'Usage drives renewal', body: 'Clients who use 75% or more of their sessions renew at around 80–86%; those under a quarter renew at 30–40%. Events that make people book classes are the best retention tool there is.' },
    { head: 'Scarcity beats discount', body: 'A numbered, one-month-only product gives people a reason to buy now without cutting the price of the core memberships.' },
    { head: 'March waits for April', body: 'March is one of the weakest months at every studio. Platinum Hour makes renewing in March the way to get the anniversary first.' },
  ],
  targets, funnel, offers, acts, activations, studioPlays, comms, merch, runSheet, roles, kpis, risks,
  guardrails: [
    'Cap: no April offer goes above 25% effective, counting every bonus at list. Cash stays ≤20% except Club Nine (annual), the 9:09 floor price (spot) and the Cloud Nine 90 (bulk).',
    'One reward per purchase: offers, the wheel and the flash price do not combine. Passport and game prizes are attendance rewards, not a discount on a sale.',
    'Scarcity is real: 99 keys in Mumbai and 39 in Bengaluru means exactly that. No second batch.',
    'Price integrity: no anniversary prices after 30 April.',
    'Every redemption is tagged with its offer ID (O27-13…18, O27-53, O27-54) so April can be judged offer by offer.',
  ],
  repeat: [
    { studio: 'Kemps Corner', apr26: '57.4%', target: '65%' },
    { studio: 'Bandra', apr26: '50.6%', target: '60%' },
    { studio: 'Kenkere House', apr26: '68.3%', target: '72%' },
    { studio: 'Pop-ups', apr26: '40.8%', target: '50%' },
  ],
  afterActions: [
    { head: 'No Graceful Exit (May)', body: 'April buyers who attend 12+ classes in their first 30 days are offered the upgrade to a 3-Month with a private session.' },
    { head: 'Doubled wheels', body: 'Every member who chose to double gets a trainer check-in at day 10; doubled prizes are credited once the 9 classes are attended.' },
    { head: 'Passport follow-up', body: 'Members with fewer than 3 stamps get a trainer call in the first week of May.' },
    { head: 'Resurrection follow-up', body: 'Everyone who came to the Séance Class but did not buy gets a personal message within 7 days.' },
    { head: 'Time Capsule', body: 'Opened at the 10th anniversary in April 2028, with a renewal conversation for every member who wrote one.' },
  ],
};

const left = JSON.stringify(pack).match(/Stronger in 30|Amazing Race|challenge/gi);
if (left) throw new Error(`Challenge wording in the pack: ${left.join(', ')}`);
fs.writeFileSync(OUT, JSON.stringify(pack, null, 2) + '\n');
console.log(`Wrote ${path.relative(ROOT, OUT)}: ${L(total.apr27)} target, ${offers.length} offers, ${acts.reduce((t, a) => t + a.events.length, 0)} events.`);
