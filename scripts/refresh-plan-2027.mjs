/* Re-issues February, April, August, November and December of the 2027 plan of record
   (server/data/portfolio-2027/v5-portfolio.json), and scrubs the retired challenge names
   (Stronger in 30, The Amazing Race) from every other month.

     node scripts/refresh-plan-2027.mjs           # apply
     node scripts/refresh-plan-2027.mjs --check   # report, write nothing

   What it changes
   · February and August no longer run a challenge. Their offers are rewritten so nothing is
     unlocked by a leaderboard, a finish line or a class count. Every reward is tied to a
     purchase or a visit.
   · April is the 9th anniversary, rebuilt as one plan: two limited editions, a flash pack,
     a bulk pack, a gamified renewal, the newcomer, winback and referral routes.
   · November (Shaadi season + Black Friday) and December (party season) get new offers.

   What it does not change
   · No target, prior year, stream split or funnel moves. Each re-issued month keeps its
     offer revenue close to the old one, and the balance stays declared as standardTrade.

   The month's strategy, week plan, collateral, CRM sends, notes and the portfolio totals are
   regenerated from the offers, so they cannot drift from them. */
import fs from 'node:fs';
import path from 'node:path';

const FILE = path.join(process.cwd(), 'server', 'data', 'portfolio-2027', 'v5-portfolio.json');
const CHECK = process.argv.includes('--check');
const plan = JSON.parse(fs.readFileSync(FILE, 'utf8'));

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const CITY_OF = { SHQ: 'Mumbai', KH: 'Mumbai', KK: 'Bengaluru', POP: 'Pop-up' };
const SUFFIX = { SHQ: 'BA', KH: 'KC', KK: 'KK', POP: 'POP' };
const STREAM = { newcomer: 'newClient', referral: 'newClient', lapsed: 'reactivation', renewal: 'renewal', upgrade: 'renewal', spot: 'renewal', goodwill: 'renewal' };
const LABEL = { newcomer: 'Newcomer', referral: 'Referral', lapsed: 'Lapsed', renewal: 'Renewal', upgrade: 'Upgrade', spot: 'Spot', goodwill: 'Goodwill' };
const money = n => `₹${Math.round(n).toLocaleString('en-IN')}`;
const lakh = n => `₹${(n / 100000).toFixed(1)}L`;
const RULE = {
  cap: 'OK: ≤20% effective',
  annual: 'OK: annual (≤25%)',
  spot: 'OK: spot offer (≤25%)',
  bulk: 'OK: bulk purchase (≤25%)',
};

/* ------------------------------------------------------------------------------------
   The offers. `plan` is per studio code: buyers × ticket = planned revenue. `price` is the
   shelf price the desk quotes; `ticket` is the expected average sale where an offer is a
   ladder (it stays the price where there is one product). */
const O = (def) => def;

const OFFERS = [
  /* ═══════════════ FEBRUARY · Red Flags, Green Flags ═══════════════ */
  O({
    id: 'O27-05', month: 2, slot: 'newcomer', runAds: true,
    name: 'Blind Date (No Catfishing)',
    type: 'Mystery-class intro (credited)',
    tags: ['mystery class', 'credited intro', 'desk-booked second date'],
    headline: 'Two classes. You don’t know which. That’s the fun part.',
    details: 'Mumbai: 2 mystery classes in 10 days for ₹999. The format (Barre, powerCycle or Strength Lab) and the trainer stay sealed in an envelope until you walk in; date two is booked at the desk before you leave. Kenkere: 2 mystery Barre classes (trainer and playlist sealed) for ₹709. Pop-ups: the paid trial (≈₹945), with the second class free if it is booked at the desk. Buy within 72 hours of date two and the ₹999 / ₹709 is credited against 1 Month at the standard 15% (₹16,204 / ₹11,697 net). Pop-ups: 8-class pack at 15% (₹5,891).',
    message: 'Blind date, but the only red flag is our grip socks. Two mystery classes for ₹999 (Kenkere ₹709): you find out the format and the trainer at the door. Like what you see? We credit the full ₹999 against your first month.',
    job: 'Turn Valentine’s-season curiosity into first memberships without a 50% code.',
    logic: 'Kenkere’s VDAY50! code (38 uses, ₹2.6L given away at 50%) bought February volume at a huge cost. A booked second visit lifts trial→member from 10.8% to 43.9%, and a mystery format gets newcomers into the class they would never pick, which is usually the one that sells the membership.',
    rules: 'One per phone number. The intro fee is credited only within 72 hours of class 2. Standard 15% only; no stacking.',
    audience: 'First-time clients (phone verified).',
    kpi: 'Second-date booked at the desk (target 70%); trial → member (target 30%).',
    validity: ['2027-02-01', '2027-02-21'],
    prices: { Mumbai: 16204, Bengaluru: 11697, 'Pop-up': 5891 },
    eff: { Mumbai: 20, Bengaluru: 20, 'Pop-up': 15 },
    rule: { Mumbai: RULE.cap, Bengaluru: RULE.cap, 'Pop-up': RULE.cap },
    plan: { SHQ: [14], KH: [22], KK: [9], POP: [3] },
  }),
  O({
    id: 'O27-06', month: 2, slot: 'referral',
    name: 'Love Bombing (The Healthy Kind)',
    type: 'Love-letter referral',
    tags: ['member love letter', '2 free classes', 'pays only on a new buyer'],
    headline: 'Love bombing, but it’s two free classes and zero manipulation.',
    details: 'Every active member gets three printed love letters at the desk (and a WhatsApp version). Each one gives a never-been friend 2 free classes within 14 days. If the friend buys 1 Month or a 12-class pack within 72 hours of class 2: their standard 15% (₹17,203 / ₹12,406; pop-ups 8-class ₹5,891) plus P57 grip socks, and the member gets +5 days (pack: +1 class) per friend who buys, up to 15 days. Partner Barre on Sun 14 Feb counts as class 2.',
    message: 'Love bombing, but healthy: write a friend a love letter at the desk and they get 2 classes on us. If they join, they get 15% off and grip socks, and you get 5 extra days. Three letters, three chances.',
    job: 'Turn members into recruiters; only pay when a new person buys.',
    logic: 'Referrals convert 41.2% at Kwality, 22.6% at Bandra, 28.3% at Kenkere and 76.1% at pop-ups, versus 3.8–5.7% for website leads. The 2026 BOGO codes (70 uses, ₹3.1L given) went mostly to existing clients; this one pays out only when a genuinely new person buys.',
    rules: 'The friend must be new to P57 (phone verified). Member reward: +5 days per buying friend, max 15. Standard 15% for the friend only.',
    audience: 'Current members bringing a never-been friend.',
    kpi: 'Letters redeemed; new buyers from referral (target +40% vs Feb-26).',
    validity: ['2027-02-01', '2027-02-28'],
    prices: { Mumbai: 17203, Bengaluru: 12406, 'Pop-up': 5891 },
    eff: { Mumbai: 18, Bengaluru: 19, 'Pop-up': 15 },
    rule: { Mumbai: RULE.cap, Bengaluru: RULE.cap, 'Pop-up': RULE.cap },
    plan: { SHQ: [8], KH: [12], KK: [5], POP: [2] },
  }),
  O({
    id: 'O27-07', month: 2, slot: 'renewal',
    name: 'Put a Ring On It',
    type: 'Valentine’s renewal ladder',
    tags: ['renewal ladder', 'proposal moment', 'extra private on 6M'],
    headline: 'If you like it, then you should’ve put a 6-month on it.',
    details: 'Any February renewal: 3 Months at 15% (₹49,177 / ₹35,879) + a P57 mini-band “ring”; 6 Months at 15% + 1 private session (₹96,658 / ₹69,883); Annual at the standard 20% + the annual perks + your name engraved on the Wall of Commitment. Say yes at the desk and the bell rings, confetti, the class applauds. Pop-ups: 10-class pack at 10% + the mini-band (₹7,655).',
    message: 'If you like it, put a ring on it: renew for 3 months at 15% and get the ring (a mini-band, relax), 6 months at 15% with a private, or go annual and get your name on the Wall of Commitment.',
    job: 'Move February renewals onto 3–12 month plans with a reason to say yes on the spot.',
    logic: 'Members using 75%+ of their sessions renew at 82–88%, and longer plans keep them using them. The best perks sit on the longest plans; nothing is unlocked by a class count, so every renewer qualifies.',
    rules: '3M 16.4% / 6M 19.6% effective (perks at list); annual at the standard 20%. One ring per renewal. No stacking.',
    audience: 'Members renewing in February (any expiry date).',
    kpi: '3M+ share of renewal value (target 45%); proposals accepted at the desk.',
    validity: ['2027-02-01', '2027-02-28'],
    prices: { Mumbai: 96658, Bengaluru: 69883, 'Pop-up': 7655 },
    eff: { Mumbai: 20, Bengaluru: 20, 'Pop-up': 19 },
    rule: { Mumbai: RULE.cap, Bengaluru: RULE.cap, 'Pop-up': RULE.cap },
    plan: { SHQ: [13, 60000], KH: [20, 60000], KK: [8, 43000], POP: [3, 7655] },
  }),
  O({
    id: 'O27-08', month: 2, slot: 'lapsed',
    name: 'It’s Not You, It’s Your Schedule',
    type: 'Pick-your-status winback',
    tags: ['standard 15% lapsed', 'choose your commitment', 'free freeze'],
    headline: 'It’s not you, it’s your schedule. Pick a relationship status.',
    details: 'Lapsed 61–365 days pick a relationship status at the standard 15%: Exclusive = 3 Months (₹49,177 / ₹35,879) + 1 extra freeze; Casual = a 12-class pack (₹16,735 / ₹11,156); It’s Complicated = 1 Month (₹17,203 / ₹12,406) + 1 free freeze for the week life gets in the way. Pop-ups: 8-class pack at 15% (₹5,891). Galentine’s class Sat 13 Feb: bring a friend free.',
    message: 'It’s not you, it’s your schedule. Come back on your terms: Exclusive (3 months), Casual (12 classes) or It’s Complicated (1 month + a free freeze). 15% off whichever you pick.',
    job: 'Bring lapsed clients back by letting them choose the commitment.',
    logic: 'Lapsers average 2.6–3.4 visits in the first half of a membership vs 6.4 for renewers: they left because the plan did not fit the week, not because of the price. Letting them pick the commitment removes the objection without deepening the discount.',
    rules: 'Lapsed 61–365 days. Standard lapsed 15% only; freezes have no cash value.',
    audience: 'Lapsed 61–365 days.',
    kpi: 'Reactivations; mix of Exclusive / Casual / Complicated (target 30% Exclusive).',
    validity: ['2027-02-01', '2027-02-21'],
    prices: { Mumbai: 17203, Bengaluru: 12406, 'Pop-up': 5891 },
    eff: { Mumbai: 15, Bengaluru: 15, 'Pop-up': 15 },
    rule: { Mumbai: RULE.cap, Bengaluru: RULE.cap, 'Pop-up': RULE.cap },
    plan: { SHQ: [6], KH: [10], KK: [4], POP: [2] },
  }),

  /* ═══════════════ APRIL · Cloud Nine — 9 Years of Physique 57 ═══════════════ */
  O({
    id: 'O27-13', month: 4, slot: 'upgrade', runAds: true,
    name: 'Moving In Together (The 9-Month Lease)',
    type: 'Limited-edition long plan (numbered)',
    tags: ['limited edition', 'numbered brass key', '9 freezes'],
    headline: 'Nine years in, we’re ready to move in together. 99 keys. No second batch.',
    details: 'A 9-Month Unlimited that exists only in April: Mumbai ₹1,44,999 (a 6-Month plus a 3-Month cost ₹1,71,570), Kenkere ₹1,02,999 (₹1,24,425). 9 freezes (min 3 days each), the anniversary hoodie, a numbered brass studio key and your name on the Lease Wall. 99 numbered keys across Kwality and Supreme HQ, 39 at Kenkere; a live counter on the studio screens.',
    message: 'Nine years in, we’re ready to move in together. The 9-Month Lease: 9 months unlimited, 9 freezes, the anniversary hoodie and a numbered brass key. 99 keys in Mumbai, 39 in Bengaluru. When they’re gone, they’re gone.',
    job: 'The biggest ticket of the month, carrying members to January 2028.',
    logic: 'A numbered, one-month-only product gives people a reason to buy now without cutting the price of the core memberships. April 2026 was bought with 40–48% codes; scarcity sells the long plan at 17.5–20% instead.',
    rules: '17.5% Mumbai / 20.0% Bengaluru effective (hoodie at list; freezes have no cash value). 99 / 39 numbered keys, no second batch. April only.',
    audience: 'Members ready for a long commitment and returning clients who want the best price of the year.',
    kpi: 'Keys sold vs 99 / 39; 6M+ share of April membership revenue (target 50%).',
    validity: ['2027-04-01', '2027-04-30'],
    prices: { Mumbai: 144999, Bengaluru: 102999 },
    eff: { Mumbai: 17.5, Bengaluru: 20 },
    rule: { Mumbai: RULE.cap, Bengaluru: RULE.cap },
    plan: { SHQ: [4], KH: [11], KK: [2] },
  }),
  O({
    id: 'O27-14', month: 4, slot: 'renewal',
    name: 'Club Nine: The Founders’ Table',
    type: 'Numbered annual (status)',
    tags: ['numbered annual', 'doubled perks', 'priority booking'],
    headline: 'Nine numbered seats per studio. Founder perks for a year.',
    details: '9 numbered Annual Unlimited seats per studio at the standard 20% (₹1,75,560 / ₹1,24,992) with the annual perks doubled: 4 privates, 8 guest passes, 2 hosted classes, monthly trainer check-ins, a numbered jacket, your name on the Club Nine wall and 48-hour priority booking all year. Unveiled at the Birthday Bash on Sat 17 Apr.',
    message: 'Nine seats. Nine years. Club Nine is an annual membership with the perks doubled: 4 privates, 8 guest passes, priority booking all year and a numbered jacket. Nine per studio, and then the table is full.',
    job: 'Sell annuals at list-minus-20% by making them a status, not a discount.',
    logic: 'Annual buyers are the most valuable members in the book; a numbered seat with doubled perks costs less than a deeper price and gives them something to show off.',
    rules: 'Annual cap 25% (doubled perks at list). 9 seats per studio.',
    audience: 'Members on 3-Month or longer plans; annual renewers.',
    kpi: 'Seats sold (9 per studio); annual share of April renewals.',
    validity: ['2027-04-01', '2027-04-30'],
    prices: { Mumbai: 175560, Bengaluru: 124992 },
    eff: { Mumbai: 25, Bengaluru: 25 },
    rule: { Mumbai: RULE.annual, Bengaluru: RULE.annual },
    plan: { SHQ: [3], KH: [5], KK: [1] },
  }),
  O({
    id: 'O27-15', month: 4, slot: 'renewal',
    name: 'Spin Class (Literally)',
    type: 'Gamified renewal (wheel + double-or-donate)',
    tags: ['wheel of nine', 'published odds', 'double-or-donate'],
    headline: 'Renew, then spin. Every spin wins. Feeling brave? Double it.',
    details: 'Renew 1 Month or a 12-class pack in April at 10% off (₹18,215 / ₹17,719; Kenkere ₹13,136 / ₹11,813; pop-up 10-pack ₹7,655) and spin the Wheel of Nine. Published odds: +1 class 30%, smoothie 20%, guest pass 15%, grip socks 10%, +3 days 10%, extra freeze 8%, 30-min private 5%, P57 tote 1.5%, a free month 0.5%. Then choose: keep it, double it by booking 9 classes in your first 21 days, or donate it to a friend as a guest pass.',
    message: 'Renew in April and spin the Wheel of Nine: every spin wins. Then decide: keep your prize, double it, or gift it to a friend. Odds are on the wall, because we’re not that kind of casino.',
    job: 'Full-price-adjacent renewals with a prize everyone talks about.',
    logic: 'Clients who use 75%+ of their sessions renew at 80–86%. The doubling option pays the prize only when the member books the classes that make them renew again; the expected value of a spin is ≈₹1,900 Mumbai / ₹1,350 Bengaluru.',
    rules: 'One spin per renewal; published odds; doubled prizes credited only once the 9 classes are attended. ≈19.5% effective on the expected value.',
    audience: 'Members renewing 1 Month or a 12-class pack.',
    kpi: 'April renewal yield vs April 2026; share of spins doubled (target 35%).',
    validity: ['2027-04-01', '2027-04-30'],
    prices: { Mumbai: 18215, Bengaluru: 13136, 'Pop-up': 7655 },
    eff: { Mumbai: 19.5, Bengaluru: 19.3, 'Pop-up': 18 },
    rule: { Mumbai: RULE.cap, Bengaluru: RULE.cap, 'Pop-up': RULE.cap },
    plan: { SHQ: [30], KH: [45], KK: [22], POP: [7] },
  }),
  O({
    id: 'O27-16', month: 4, slot: 'newcomer', runAds: true,
    name: 'Party Crasher Pass',
    type: 'Newcomer intro (credited) + Impulse Buzzer',
    tags: ['credited intro', 'birthday party class', 'impulse buzzer'],
    headline: 'It’s our 9th birthday and you’re invited. 3 classes for ₹999.',
    details: 'Mumbai: 3 classes in 9 days for ₹999, any format, including a Birthday Bash party class (17–18 Apr). Kenkere: 3 Barre classes for ₹699 (replaces the 50% intro in April; counts as the once-in-a-lifetime 2-for-1). Pop-ups: 2 classes for ₹999. The pass price is credited against a first 1 Month or 12-class pack bought within 72 hours of class 3, on top of the standard 15% (1 Month nets ₹16,204 / ₹11,707). Buy within 9 hours of class 3 and you hit the Impulse Buzzer: confetti, applause, name on the Reckless Decisions board.',
    message: 'It’s our 9th birthday and you’re invited: 3 classes for ₹999 (Kenkere ₹699), birthday party class included. Love it? The ₹999 comes off your first month. Decide fast and you get to hit the big red buzzer.',
    job: 'Bring April’s traffic in through a party, and convert it inside 72 hours.',
    logic: 'A booked sequence of classes is what converts; the party class gives newcomers the best room of the year, and the buzzer turns a sale into a show for whoever is waiting.',
    rules: 'One per phone number. Credit valid 72 hours after class 3. Standard 15% only.',
    audience: 'First-time clients (phone verified).',
    kpi: 'Pass → member (target 35%); buzzer hits (bought within 9 hours).',
    validity: ['2027-04-01', '2027-04-24'],
    prices: { Mumbai: 16204, Bengaluru: 11707, 'Pop-up': 4893 },
    eff: { Mumbai: 20, Bengaluru: 20, 'Pop-up': 15 },
    rule: { Mumbai: RULE.cap, Bengaluru: RULE.cap, 'Pop-up': RULE.cap },
    plan: { SHQ: [15], KH: [21], KK: [9], POP: [3] },
  }),
  O({
    id: 'O27-17', month: 4, slot: 'lapsed',
    name: 'Faking Your Own Death Didn’t Work',
    type: 'Winback (obituary + Séance Class)',
    tags: ['obituary postcard', 'séance class', 'loyalty-year bonus'],
    headline: 'We wrote your obituary. You’re not getting out of it that easily.',
    details: 'Lapsed 61 days–3 years get an obituary postcard (“Here lies a perfectly good plank”). It is the ticket to the candle-lit Séance Class on Thu 15 Apr. Come back on the standard 15% on 1 Month, a 12-class pack or 3 Months, plus a bonus for every year since your first class (max 3): +1 class on packs, +1 day on unlimited. Photo at the Back From the Dead frame; your row at the Throwback Reunion (Sat 24 Apr).',
    message: 'We wrote your obituary. It was moving. Unfortunately for you, you’re invited back: 15% off, a bonus for every year you’ve been with us, and a candle-lit Séance Class to rise from the dead.',
    job: 'Win back lapsed clients with a story they want to post.',
    logic: 'Lapsed clients already know the product; what they need is a moment and a reason that is not just a discount. A personal postcard with a dated class beats a generic reminder.',
    rules: 'Lapsed 61 days–3 years. Standard lapsed 15% + loyalty-year bonus (max 3) = ≤20% effective.',
    audience: 'Lapsed 61 days–3 years.',
    kpi: 'Postcards → Séance Class attendance; reactivations (target +30% vs Apr-26).',
    validity: ['2027-04-01', '2027-04-30'],
    prices: { Mumbai: 17203, Bengaluru: 12406, 'Pop-up': 7229 },
    eff: { Mumbai: 20, Bengaluru: 20, 'Pop-up': 20 },
    rule: { Mumbai: RULE.cap, Bengaluru: RULE.cap, 'Pop-up': RULE.cap },
    plan: { SHQ: [13], KH: [20], KK: [8], POP: [2] },
  }),
  O({
    id: 'O27-18', month: 4, slot: 'referral',
    name: 'Plus One, Plus Nine',
    type: 'Referral (tiered)',
    tags: ['tiered referral', '+9 days', 'cloud nine tote'],
    headline: 'Bring a friend, get 9 days. Bring three, get a month.',
    details: 'Any active member whose never-been friend buys in April gets +9 days (pack members: +2 classes). Three buying friends = a free month. The friend gets the standard 15% and a Cloud Nine tote. Bring Your Barre-stie day (Thu 8 Apr): every member gets a free guest pass.',
    message: 'Bring a friend to the party: if they join, you get 9 extra days. Bring three and the next month is on us. They get 15% off and a Cloud Nine tote.',
    job: 'Turn the anniversary into the year’s biggest referral month.',
    logic: 'Referrals convert at 22–76% against 3.8–5.7% for website leads. A tier at three friends gives the super-connectors a reason to keep going.',
    rules: 'Friend must be new to P57. Member reward is acquisition cost, paid only on a purchase.',
    audience: 'Current members bringing a never-been friend.',
    kpi: 'Referral buyers (target 2× April 2026); members reaching three.',
    validity: ['2027-04-01', '2027-04-30'],
    prices: { Mumbai: 17203, Bengaluru: 12406, 'Pop-up': 5891 },
    eff: { Mumbai: 15, Bengaluru: 15, 'Pop-up': 15 },
    rule: { Mumbai: RULE.cap, Bengaluru: RULE.cap, 'Pop-up': RULE.cap },
    plan: { SHQ: [6], KH: [10], KK: [4], POP: [1] },
  }),
  O({
    id: 'O27-53', month: 4, slot: 'spot', runAds: true,
    name: 'The 9:09 Panic Attack',
    type: 'Flash sale (limited 9-Class Pack)',
    tags: ['limited 9-class pack', 'plank your price', '9:09 flash'],
    headline: 'Plank for your price. Or wait for 9:09 and panic with everyone else.',
    details: 'The Limited Edition 9-Class Pack (99 days to use it) exists only in April. Plank Your Price at the desk: hold 57 seconds and it is ₹12,999 (Kenkere ₹8,699), 1:57 for ₹12,249 (₹8,199), 2:57 for the floor, ₹11,499 (₹7,699). On Fri 9 Apr, two 99-minute windows from 9:09 am and 9:09 pm give everyone the floor price, no plank needed: siren in studio, countdown on Instagram. Pop-ups: a 9-class pack at ₹6,499 in the same windows.',
    message: 'Plank for your price: hold it for 57 seconds and the 9-Class Pack is ₹12,999; hold for 2:57 and it’s ₹11,499. Or wait for 9:09 on 9 April, when everyone gets the floor price for 99 minutes. Panic responsibly.',
    job: 'The anniversary’s entry product and its loudest moment.',
    logic: 'A price you earn with your body is the most Physique 57 thing there is, and every plank at the desk is a show for whoever is waiting. The floor price (23.7% / 24.0%) sits inside the 25% spot cap, and plan revenue is counted at the floor.',
    rules: 'Spot offer, ≤25% effective at the floor price. Two packs per person. April only; no anniversary prices after 30 Apr.',
    audience: 'Everyone: members, pack buyers and newcomers.',
    kpi: 'Packs sold in the two 9:09 windows; pack → membership by June.',
    validity: ['2027-04-01', '2027-04-30'],
    prices: { Mumbai: 11499, Bengaluru: 7699, 'Pop-up': 6499 },
    eff: { Mumbai: 23.7, Bengaluru: 24, 'Pop-up': 17.5 },
    rule: { Mumbai: RULE.spot, Bengaluru: RULE.spot, 'Pop-up': RULE.cap },
    stream: 'newClient',
    plan: { SHQ: [12], KH: [20], KK: [8], POP: [2] },
  }),
  O({
    id: 'O27-54', month: 4, slot: 'upgrade',
    name: 'The Cloud Nine 90',
    type: 'Bulk class pack (12 months)',
    tags: ['bulk pack', '90 classes', '12-month validity'],
    headline: 'Ninety classes. One year. Zero commitment issues.',
    details: '90 classes valid for 12 months: Mumbai ₹1,34,999 (₹1,500 a class; 90 singles cost ₹1,74,825 at list, so 22.8% off), Bengaluru ₹99,999 (₹1,111 a class against ₹1,27,575, 21.6% off). April only, any format.',
    message: 'Ninety classes, one year, zero commitment issues: the Cloud Nine 90 works out to ₹1,500 a class. April only.',
    job: 'Lock in a year of revenue from the heaviest pack buyers.',
    logic: 'The Anniversary Big 85 Flex sold 4 times at Kemps Corner and once at Kenkere House in April 2026; this replaces it at a price inside the bulk cap.',
    rules: 'Bulk purchase, ≤25% effective. Non-transferable; 12-month validity.',
    audience: 'High-frequency pack buyers.',
    kpi: 'Packs sold; classes used per month of the pack.',
    validity: ['2027-04-01', '2027-04-30'],
    prices: { Mumbai: 134999, Bengaluru: 99999 },
    eff: { Mumbai: 22.8, Bengaluru: 21.6 },
    rule: { Mumbai: RULE.bulk, Bengaluru: RULE.bulk },
    plan: { SHQ: [1], KH: [1] },
  }),

  /* ═══════════════ AUGUST · Azaadi From Average ═══════════════ */
  O({
    id: 'O27-31', month: 8, slot: 'newcomer', runAds: true,
    name: 'No Strings Attached',
    type: 'Newcomer intro with a break-up clause',
    tags: ['credited intro', 'no-strings guarantee', 'switch to a pack'],
    headline: 'Commitment issues? Same. Here’s a membership with a break-up clause.',
    details: 'Mumbai: 2 classes in 7 days for ₹999 (any format), credited against 1 Month at the standard 15% bought within 72 hours (₹16,204 net). Kenkere: 2 Barre classes for ₹709, credited the same way (₹11,697 net). Pop-ups: paid trial (≈₹945) → 8-class pack at 15% (₹5,891). The No-Strings clause: in the first 14 days of the month, if it is not for you, the desk converts what is left into an 8-class pack (60 days). No break-up fee, no awkward conversation.',
    message: 'Commitment issues? Same. Try 2 classes for ₹999, and if you join, the ₹999 comes off your first month. And if it’s not for you after two weeks, we turn what’s left into a class pack. No strings. Well, one: show up.',
    job: 'Remove the commitment objection that stops August trials from buying.',
    logic: 'Clients with 5+ visits in month one buy again at 93.5%. A break-up clause costs almost nothing (few use it) and answers the objection the desk hears most: “what if I can’t keep it up?”.',
    rules: 'One per phone number. Credit within 72 hours of class 2; the switch must be requested within 14 days of the start date. Standard 15% only.',
    audience: 'First-time clients (phone verified).',
    kpi: 'Trial → member (target 35%); No-Strings switches (expect <10%).',
    validity: ['2027-08-01', '2027-08-21'],
    prices: { Mumbai: 16204, Bengaluru: 11697, 'Pop-up': 5891 },
    eff: { Mumbai: 20, Bengaluru: 20, 'Pop-up': 15 },
    rule: { Mumbai: RULE.cap, Bengaluru: RULE.cap, 'Pop-up': RULE.cap },
    plan: { SHQ: [15], KH: [22], KK: [9], POP: [4] },
  }),
  O({
    id: 'O27-32', month: 8, slot: 'spot',
    name: 'Price Ki Azaadi (Freedom From Price Hikes)',
    type: 'Freedom Weekend annual + 2028 price lock',
    tags: ['annual', '2028 price lock', '+15 days'],
    headline: 'Freedom from price hikes. Lock your 2028 renewal at 2027 prices.',
    details: 'Freedom Weekend, Fri 13–Tue 17 Aug: Annual Unlimited at the standard 20% (₹1,75,560 / ₹1,24,992) with the annual perks, +15 bonus days, and your 2028 renewal locked at today’s 2027 list price, whatever the 2028 price list says. 47 memberships in Mumbai and 19 in Bengaluru, for 1947.',
    message: 'Freedom from price hikes: buy an annual over Freedom Weekend (13–17 Aug) and get 20% off, 15 extra days, and your 2028 renewal locked at 2027 prices. Only 47 in Mumbai, 19 in Bengaluru.',
    job: 'Sell annuals in a month that usually discounts, without going deeper than 20% cash.',
    logic: 'A price lock costs nothing in 2027 and answers the renewal-price objection a year early. It sells the annual on certainty, not depth, and every lock is a 2028 renewal already in the book.',
    rules: 'Annual cap 25% (20% cash + 15 days ≈ 24.1%). Price lock applies to the next annual renewal only. 47 / 19 memberships.',
    audience: 'Members and returning clients; annual renewers due Aug–Nov.',
    kpi: 'Annuals sold (target 8 Mumbai, 1 Bengaluru); 2028 locks.',
    validity: ['2027-08-13', '2027-08-17'],
    prices: { Mumbai: 175560, Bengaluru: 124992 },
    eff: { Mumbai: 24.1, Bengaluru: 24.1 },
    rule: { Mumbai: RULE.annual, Bengaluru: RULE.annual },
    plan: { SHQ: [3], KH: [5], KK: [1] },
  }),
  O({
    id: 'O27-33', month: 8, slot: 'referral',
    name: 'Squad Goals, Squat Goals',
    type: 'Friendship Day squad referral',
    tags: ['squad class', 'friendship-band socks', 'siblings count'],
    headline: 'Your squad. Our studio. Matching socks, obviously.',
    details: 'Friendship Day (Sun 1 Aug) to 15 Aug, siblings count for Raksha Bandhan: a member books a free Squad Class for 2–4 never-been friends. Friends who buy 1 Month or a 12-class pack within 7 days get their standard 15% (₹17,203 / ₹12,406; pop-ups 8-class ₹5,891) and friendship-band grip socks; the member gets +5 days (pack: +1 class) per friend who buys, up to 15 days.',
    message: 'Squad goals, squat goals: book a free Squad Class for up to 4 friends who’ve never been. If they join, they get 15% off and friendship-band grip socks, and you get 5 extra days for each one.',
    job: 'Use Friendship Day to recruit whole friend groups at once.',
    logic: 'Referrals convert at 22–76%; friends who start together come together. A free group class lowers the bar for the nervous friend, and the member is paid only when someone buys.',
    rules: 'Friends must be new to P57 (phone verified). Member reward max 15 days. Standard 15% for friends only.',
    audience: 'Current members bringing 2–4 never-been friends.',
    kpi: 'Squad Classes booked; friend → purchase (target 30%).',
    validity: ['2027-08-01', '2027-08-15'],
    prices: { Mumbai: 17203, Bengaluru: 12406, 'Pop-up': 5891 },
    eff: { Mumbai: 18.5, Bengaluru: 19.8, 'Pop-up': 17 },
    rule: { Mumbai: RULE.cap, Bengaluru: RULE.cap, 'Pop-up': RULE.cap },
    plan: { SHQ: [7], KH: [11], KK: [4], POP: [2] },
  }),
  O({
    id: 'O27-34', month: 8, slot: 'renewal',
    name: 'Freedom to Pause (Not Quit)',
    type: 'Flexible renewal (festive freezes)',
    tags: ['renewal ladder', 'freedom freezes', 'private on 6M'],
    headline: 'Pause for Ganpati. Pause for Diwali. Just don’t quit.',
    details: 'Any August renewal: 3 Months at 15% (₹49,177 / ₹35,879) + 2 Freedom Freezes (min 3 days each, any time Sep–Nov, made for Ganeshotsav and Diwali travel); 6 Months at 15% + 1 private + 3 Freedom Freezes (₹96,658 / ₹69,883); Annual at the standard 20% + perks + 4 Freedom Freezes. Pop-ups: 10-class pack at 15% + 30 extra days of validity (₹7,229).',
    message: 'Freedom to pause, not quit: renew for 3 months at 15% and get 2 Freedom Freezes for festive travel, or 6 months with a private and 3 freezes. Go home for Ganpati. Come back to your spot.',
    job: 'Protect the festive-season renewal book before September’s travel.',
    logic: 'Members lapse in Sep–Nov when travel breaks the habit. A freeze keeps them paying and coming back instead of cancelling; freezes have no cash cost, so the cash discount stays at the standard 15%.',
    rules: '3M 15% / 6M 19.6% effective (private at list; freezes have no cash value). Freezes expire 30 Nov.',
    audience: 'Members renewing in August.',
    kpi: 'Renewal yield vs Aug-26; Sep–Nov lapse rate of August renewers.',
    validity: ['2027-08-01', '2027-08-31'],
    prices: { Mumbai: 96658, Bengaluru: 69883, 'Pop-up': 7229 },
    eff: { Mumbai: 19.6, Bengaluru: 20, 'Pop-up': 15 },
    rule: { Mumbai: RULE.cap, Bengaluru: RULE.cap, 'Pop-up': RULE.cap },
    plan: { SHQ: [24, 42000], KH: [37, 42000], KK: [15, 30000], POP: [6, 7229] },
  }),

  /* ═══════════════ NOVEMBER · Shaadi Season (and a Very Black Friday) ═══════════════ */
  O({
    id: 'O27-45', month: 11, slot: 'newcomer', runAds: true,
    name: 'Bride Squad, Assemble (Groom Can Come Too)',
    type: 'Group buy (wedding party)',
    tags: ['group buy (4+)', 'hosted squad class', 'shaadi season'],
    headline: 'Four of you, one wedding, zero excuses. Squad rates inside.',
    details: 'Wedding season: a group of 4+ (at least 2 new to P57) buy 12-class packs together at 12% off each (Mumbai ₹17,325, Kenkere ₹11,550; packs valid 60 days) and get one hosted private Squad Class for the group, that ends on a choreographed Sangeet routine. Pop-ups: 8-class packs at 5% (₹6,584) + a hosted Pilates squad class. Grooms, cousins and the friend who “doesn’t do group fitness” all count.',
    message: 'Bride squad, assemble: get 4 or more of you together and your 12-class packs are 12% off each, plus a private Squad Class that ends on a Sangeet routine. Groom can come too. We don’t judge.',
    job: 'Sell group packs into the wedding season, the one time in the year people train with a deadline.',
    logic: 'November–December is shaadi season: brides, bridesmaids and families are motivated and arrive in groups. A group rate recruits several newcomers in one conversation, and the hosted class is time we already have, not cash.',
    rules: '4+ buyers on the same day, at least 2 new to P57. 12% cash + hosted class at list ≈ 18.7% (Kenkere 19.8%). No stacking.',
    audience: 'Wedding parties and friend groups (min 4, at least 2 new).',
    kpi: 'Squads formed; new buyers from squads (target 50% of squad members).',
    validity: ['2027-11-01', '2027-11-30'],
    prices: { Mumbai: 17325, Bengaluru: 11550, 'Pop-up': 6584 },
    eff: { Mumbai: 18.7, Bengaluru: 19.8, 'Pop-up': 18.6 },
    rule: { Mumbai: RULE.cap, Bengaluru: RULE.cap, 'Pop-up': RULE.cap },
    plan: { SHQ: [12], KH: [18], KK: [8], POP: [10] },
  }),
  O({
    id: 'O27-44', month: 11, slot: 'lapsed',
    name: 'Shaadi Mein Zaroor Aana (Come Back Before the Baraat)',
    type: 'Wedding-season winback',
    tags: ['standard 15% lapsed', 'sangeet choreo class', 'matching socks'],
    headline: 'Shaadi mein zaroor aana. And to class before that.',
    details: 'Lapsed 61–365 days: the standard 15% on 1 Month or a 12-class pack (₹17,203 / ₹12,406) + matching “Bride Tribe” grip socks, and a seat at the Sangeet Choreo Barre on Sat 20 Nov: a full Barre class that ends with a 10-minute dance-floor routine you can actually use at the wedding.',
    message: 'Shaadi mein zaroor aana… and to class before that. Come back for 15% off, matching grip socks and our Sangeet Choreo Barre on 20 Nov: you’ll leave with a routine for the dance floor.',
    job: 'Bring lapsed clients back while the wedding calendar gives them a reason.',
    logic: 'An event with a date beats a generic reminder, and the wedding season is the date. The socks and the class cost little and give a returner a reason to post.',
    rules: 'Lapsed 61–365 days. Standard lapsed 15% + socks at list ≈ 18.5% (Kenkere 19.8%).',
    audience: 'Lapsed 61–365 days.',
    kpi: 'Reactivations; Sangeet Choreo attendance → purchase.',
    validity: ['2027-11-01', '2027-11-24'],
    prices: { Mumbai: 17203, Bengaluru: 12406 },
    eff: { Mumbai: 18.5, Bengaluru: 19.8 },
    rule: { Mumbai: RULE.cap, Bengaluru: RULE.cap },
    plan: { SHQ: [5], KH: [8], KK: [3] },
  }),
  O({
    id: 'O27-49', month: 11, slot: 'spot', runAds: true,
    name: '11.11: Treat Yourself, Not Your Ex',
    type: '11-hour flash (Singles’ Day)',
    tags: ['11-hour flash', '8-class pack', 'one per person'],
    headline: '11.11. Eleven hours. Treat yourself, not your ex.',
    details: 'Thu 11 Nov, 11:11 am to 10:11 pm only: an 8-class pack at 20% off: Mumbai ₹10,500 (list ₹13,125), Kenkere ₹6,972 (₹8,715), pop-ups ₹5,544 (₹6,930). One per person, usual validity, members and newcomers alike.',
    message: '11.11: for eleven hours, treat yourself, not your ex. 8-class packs at 20% off from 11:11 am to 10:11 pm. One per person. Your ex isn’t invited.',
    job: 'Add a single loud sales day to a quiet month without touching membership prices.',
    logic: 'Singles’ Day is now a shopping date in India. A one-day pack price brings in fence-sitters and members topping up, at a discount that never reaches memberships.',
    rules: 'Spot offer, 20% cash. One per person. 11:11 am–10:11 pm on 11 Nov only.',
    audience: 'Everyone: newcomers, pack buyers and members.',
    kpi: 'Packs sold in 11 hours; pack buyers → membership by January.',
    validity: ['2027-11-11', '2027-11-11'],
    prices: { Mumbai: 10500, Bengaluru: 6972, 'Pop-up': 5544 },
    eff: { Mumbai: 20, Bengaluru: 20, 'Pop-up': 20 },
    rule: { Mumbai: RULE.spot, Bengaluru: RULE.spot, 'Pop-up': RULE.spot },
    stream: 'newClient',
    plan: { SHQ: [6], KH: [10], KK: [8], POP: [4] },
  }),
  O({
    id: 'O27-43', month: 11, slot: 'renewal',
    name: 'Black Friday Blind Box (No Duds)',
    type: 'Long-plan sale + mystery bonus',
    tags: ['long-plan sale', 'blind box bonus', 'no duds'],
    headline: 'Black Friday, but every box is a winner. We checked.',
    details: 'Fri 26–Mon 29 Nov: 3 Months at 10% (₹52,070 / ₹37,989), 6 Months at 15% (₹96,658 / ₹69,883) or Annual at 20% (₹1,75,560 / ₹1,24,992), then pick a sealed black box. Every box holds one bonus, from ₹1,500 to ₹5,250 at list: +5 days, 2 guest passes, a 30-min private, a P57 tote + socks, or a full private session. One Black Box per studio, in the annual pile only, adds the “I Survived Black Friday” hoodie. Pop-ups: 10-class pack at 10% + a box (≤1 class) (₹7,655). No discount on 1 Month.',
    message: 'Black Friday Blind Box: renew for 3, 6 or 12 months and pick a sealed box. Every box wins (extra days, guest passes, a private), and there are no duds. 26–29 Nov only.',
    job: 'Move Q4 renewals onto long plans in a sale weekend, with a bonus instead of a deeper price.',
    logic: 'Black Friday discounts train members to wait. A mystery bonus keeps the cash discount at the standard ladder (10/15/20%) and makes opening the box the content.',
    rules: '3M ≤19.1%, 6M ≤19.6% effective with the largest box; annual ≤24% with the Black Box. One box per plan. No discount on 1 Month.',
    audience: 'Members renewing or upgrading; annual renewers due Nov–Jan.',
    kpi: '3M+ share of November renewal value; boxes opened on camera.',
    validity: ['2027-11-26', '2027-11-29'],
    prices: { Mumbai: 96658, Bengaluru: 69883, 'Pop-up': 7655 },
    eff: { Mumbai: 19.6, Bengaluru: 19.8, 'Pop-up': 20 },
    rule: { Mumbai: RULE.cap, Bengaluru: RULE.cap, 'Pop-up': RULE.cap },
    plan: { SHQ: [7, 75000], KH: [11, 75000], KK: [5, 54000], POP: [2, 7655] },
  }),

  /* ═══════════════ DECEMBER · Party Season Survival Guide ═══════════════ */
  O({
    id: 'O27-46', month: 12, slot: 'renewal',
    name: 'The Advent-ure Calendar (Opens in January)',
    type: 'Renewal + 12-door perk calendar',
    tags: ['12-door calendar', 'perks redeemed Jan–Mar', 'renewal ladder'],
    headline: 'An advent calendar you open in January, when you actually need it.',
    details: 'Renew in December, 3 Months at 12% (₹50,912 / ₹37,145), 6 Months at 15% (₹96,658 / ₹69,883) or Annual at the standard 20%, and take home a 12-door P57 Advent-ure Calendar. One door a week from 3 Jan 2028: 3 guest passes, 2 smoothies, a 30-min virtual private, 2 extra days, a freeze, grip socks, a front-row reservation, a playlist pick and one golden door. Worth ≈₹4,000 Mumbai / ₹3,000 Bengaluru at list. Pop-ups: 10-class pack at 10% + a 3-door mini calendar (₹7,655).',
    message: 'An advent calendar you open in January, when you need it most: renew for 3, 6 or 12 months in December and get 12 doors of perks, one a week from 3 Jan. Guest passes, a private, smoothies and a golden door.',
    job: 'Renew December’s book onto long plans and get Q1 attendance built in.',
    logic: 'January drop-off is when renewals are lost. Spreading the perks across Jan–Mar gives members a reason to show up every week of the hardest quarter, which is what keeps them renewing.',
    rules: '3M 18.9% / 6M 18.5% / annual 21.8% effective (calendar at list). Doors expire 31 Mar 2028; one calendar per renewal.',
    audience: 'Members renewing in December.',
    kpi: 'December renewal yield; Q1 2028 visits of calendar holders vs others.',
    validity: ['2027-12-01', '2027-12-31'],
    prices: { Mumbai: 50912, Bengaluru: 37145, 'Pop-up': 7655 },
    eff: { Mumbai: 18.9, Bengaluru: 19.1, 'Pop-up': 18.2 },
    rule: { Mumbai: RULE.cap, Bengaluru: RULE.cap, 'Pop-up': RULE.cap },
    plan: { SHQ: [14, 55000], KH: [27, 55000], KK: [8, 40000], POP: [4, 7655] },
  }),
  O({
    id: 'O27-47', month: 12, slot: 'spot',
    name: 'Boxing Day (Gloves Optional)',
    type: '2-day pack sale',
    tags: ['2-day flash', '12-class pack', 'stock up for January'],
    headline: 'Boxing Day. No gloves, just a 12-class pack at 20% off.',
    details: 'Sun 26–Mon 27 Dec only: 12-class packs at 20% off: Mumbai ₹15,750 (list ₹19,688), Kenkere ₹10,500 (₹13,125); pop-ups 10-class pack at 20% (₹6,804). Two per person; buy now, start whenever January starts for you.',
    message: 'Boxing Day, gloves optional: 12-class packs are 20% off on 26–27 Dec only. Stock up before the January rush. Two per person.',
    job: 'Bank January’s pack demand in the quietest week of the year.',
    logic: 'The week after Christmas is empty in studio but busy on phones. A two-day pack price pulls January purchases forward without touching membership prices.',
    rules: 'Spot offer, 20% cash. Two per person. 26–27 Dec only.',
    audience: 'Everyone: pack buyers, members topping up, newcomers.',
    kpi: 'Packs sold in 48 hours; January visits on Boxing Day packs.',
    validity: ['2027-12-26', '2027-12-27'],
    prices: { Mumbai: 15750, Bengaluru: 10500, 'Pop-up': 6804 },
    eff: { Mumbai: 20, Bengaluru: 20, 'Pop-up': 20 },
    rule: { Mumbai: RULE.spot, Bengaluru: RULE.spot, 'Pop-up': RULE.spot },
    plan: { SHQ: [18], KH: [36], KK: [14], POP: [5] },
  }),
  O({
    id: 'O27-48', month: 12, slot: 'newcomer', runAds: true,
    name: 'Resolution Insurance (Claim Approved)',
    type: 'Pre-sale with first-month cover',
    tags: ['buy now, start 1–10 Jan', 'late-cancel cover', 'life-happens freeze'],
    headline: 'Insure your resolution before you make it. Claim approved.',
    details: 'Buy in December, start any day 1–10 Jan 2028. Newcomers: 1 Month at the standard 15% (₹17,203 / ₹12,406) with Resolution Insurance: no late-cancel fees all January, one “life happens” freeze, and a trainer call if you miss 3 booked classes, to rebuild your week. Members can gift the same plan or buy 3 Months at 15% starting in January.',
    message: 'Insure your resolution before you make it: buy your first month now, start any day 1–10 January, and January’s late-cancel fees are on us. Plus a freeze for when life happens. Claim approved.',
    job: 'Sell January memberships in December and protect the first month.',
    logic: 'Most January resolutions fail in week two. Cover for the usual excuses (late cancels, a bad week) costs little and is exactly what a nervous December buyer needs to hear.',
    rules: 'Standard 15% only. Start date 1–10 Jan 2028. Cover applies to January only.',
    audience: 'First-time clients (phone verified); members buying for a January start.',
    kpi: 'Pre-sold January starts; January attendance of insured buyers.',
    validity: ['2027-12-01', '2027-12-31'],
    prices: { Mumbai: 17203, Bengaluru: 12406 },
    eff: { Mumbai: 15, Bengaluru: 15 },
    rule: { Mumbai: RULE.cap, Bengaluru: RULE.cap },
    plan: { SHQ: [7], KH: [13], KK: [4] },
  }),
  O({
    id: 'O27-52', month: 12, slot: 'newcomer',
    name: 'The Gift They Won’t Regift',
    type: 'Gift box (credited on conversion)',
    tags: ['gift box', 'credit on first membership', 'office bundles'],
    headline: 'The one gift that doesn’t end up in next year’s Secret Santa.',
    details: 'A boxed gift for someone new: Mumbai ₹2,499 (2 classes in any format + grip socks + ₹1,000 off a first membership), Kenkere ₹1,799 (2 Barre classes + socks + ₹750 off), pop-ups ₹1,199 (1 class + socks + ₹400 off). The credit is valid within 14 days of class 2, on top of the standard 15%. Offices buying 10+ boxes get 10% off the boxes and a hosted team class.',
    message: 'The gift they won’t regift: 2 classes, grip socks and ₹1,000 off their first membership, in a box that looks expensive. Buying for the office? 10+ boxes get 10% off and a team class.',
    job: 'Turn December gifting into January newcomers.',
    logic: 'A gift arrives with a friend’s endorsement, which is why gifted and referred clients convert far better than ad leads. The credit only pays out when the recipient buys.',
    rules: 'Credited intro product (acquisition cost). On conversion: 1 Month at 15% less the credit ≈ 20% effective. Recipient must be new to P57.',
    audience: 'Members and non-members buying for someone new; offices.',
    kpi: 'Boxes sold; boxes redeemed by 31 Jan; recipient → member (target 30%).',
    validity: ['2027-12-01', '2027-12-24'],
    prices: { Mumbai: 2499, Bengaluru: 1799, 'Pop-up': 1199 },
    eff: { Mumbai: 20, Bengaluru: 20, 'Pop-up': 20 },
    rule: { Mumbai: RULE.cap, Bengaluru: RULE.cap, 'Pop-up': RULE.cap },
    plan: { SHQ: [16], KH: [29], KK: [9], POP: [4] },
  }),
  O({
    id: 'O27-50', month: 12, slot: 'lapsed',
    name: 'The Ex-Files: Season Finale',
    type: 'Year-end winback + NYE plus-one',
    tags: ['year-end winback', 'NYE countdown class', 'plus-one guest pass'],
    headline: 'Every great series needs a finale. Yours is a comeback.',
    details: 'Lapsed 90+ days: 1 Month or a 12-class pack at 10% (₹18,215 / ₹13,136), or 3 Months at 15% (₹49,177 / ₹35,879), plus a plus-one guest pass to the NYE Countdown Class (Fri 31 Dec, 11 am). Pop-ups: 8-class pack at 5% + a plus-one class (₹6,584).',
    message: 'The Ex-Files: Season Finale. Before 2027 ends, one last episode: come back for 10% off (15% on 3 months) and bring a plus-one to our NYE Countdown Class.',
    job: 'Reactivate long-lapsed clients before the January price of a fresh start.',
    logic: 'People who come back in December arrive in January already in the habit. The plus-one turns a returner into a referral at the busiest social week of the year.',
    rules: 'Lapsed 90+ days. 1M 19.6% / 3M 18.4% effective with the guest pass at list.',
    audience: 'Lapsed 90+ days.',
    kpi: 'Reactivations; plus-ones who buy in January.',
    validity: ['2027-12-01', '2027-12-31'],
    prices: { Mumbai: 18215, Bengaluru: 13136, 'Pop-up': 6584 },
    eff: { Mumbai: 19.6, Bengaluru: 19.7, 'Pop-up': 18.6 },
    rule: { Mumbai: RULE.cap, Bengaluru: RULE.cap, 'Pop-up': RULE.cap },
    plan: { SHQ: [8], KH: [14], KK: [4], POP: [2] },
  }),
];

/* Which offers each studio runs, in display order. */
const SCHEDULE = {
  2: { SHQ: ['O27-05', 'O27-06', 'O27-07', 'O27-08'], KH: ['O27-05', 'O27-06', 'O27-07', 'O27-08'], KK: ['O27-05', 'O27-06', 'O27-07', 'O27-08'], POP: ['O27-05', 'O27-06', 'O27-07', 'O27-08'] },
  4: {
    SHQ: ['O27-13', 'O27-14', 'O27-15', 'O27-16', 'O27-17', 'O27-18', 'O27-53', 'O27-54'],
    KH: ['O27-13', 'O27-14', 'O27-15', 'O27-16', 'O27-17', 'O27-18', 'O27-53', 'O27-54'],
    KK: ['O27-13', 'O27-14', 'O27-15', 'O27-16', 'O27-17', 'O27-18', 'O27-53'],
    POP: ['O27-15', 'O27-16', 'O27-17', 'O27-18', 'O27-53'],
  },
  8: { SHQ: ['O27-31', 'O27-32', 'O27-33', 'O27-34'], KH: ['O27-31', 'O27-32', 'O27-33', 'O27-34'], KK: ['O27-31', 'O27-32', 'O27-33', 'O27-34'], POP: ['O27-31', 'O27-33', 'O27-34'] },
  11: { SHQ: ['O27-45', 'O27-44', 'O27-49', 'O27-43'], KH: ['O27-45', 'O27-44', 'O27-49', 'O27-43'], KK: ['O27-45', 'O27-44', 'O27-49', 'O27-43'], POP: ['O27-45', 'O27-49', 'O27-43'] },
  12: {
    SHQ: ['O27-46', 'O27-47', 'O27-48', 'O27-52', 'O27-50'],
    KH: ['O27-46', 'O27-47', 'O27-48', 'O27-52', 'O27-50'],
    KK: ['O27-46', 'O27-47', 'O27-48', 'O27-52', 'O27-50'],
    POP: ['O27-46', 'O27-47', 'O27-52', 'O27-50'],
  },
};

/* The month itself: theme, job and key dates. */
const MONTH_META = {
  2: {
    theme: 'Red Flags, Green Flags',
    focus: 'Valentine’s + Galentine’s + Singles Awareness Day',
    objective: 'Turn Valentine’s-season traffic into first memberships through a mystery-class intro; recruit through members’ love letters; move February renewals onto 3–12 month plans; let lapsed clients come back on the commitment they choose. Every reward is tied to a purchase or a visit.',
    keyDates: [
      ['2027-02-01', 'Green Flag Week: Blind Date envelopes at every desk', 'brand'],
      ['2027-02-13', 'Galentine’s class (bring a friend free)', 'retail'],
      ['2027-02-14', 'Valentine’s Day: Partner Barre', 'retail'],
      ['2027-02-15', 'Singles Awareness Day: Hate-Squat Hour (break-up playlist class)', 'brand'],
    ],
  },
  4: {
    theme: 'Cloud Nine — 9 Years of Physique 57',
    focus: '9th anniversary: limited editions, the wheel, the 9:09 flash and the Golden Glute Awards',
    objective: 'Flagship month: win on excitement and economics. Two products that exist only in April (the 9-Month Lease and the 9-Class Pack), a 9:09 flash, a wheel you can double, numbered Club Nine annuals and a month of events, with no offer above 25% effective (cash ≤20% except annuals, the flash and the bulk pack). Every April buyer leaves with a reason to come back in May.',
    keyDates: [
      ['2027-04-01', 'Launch: “Nine Years in Ninety Seconds” film; 9-Month Lease and 9-Class Pack on sale', 'brand'],
      ['2027-04-03', 'Blind Date With a Class (format and trainer secret until you walk in)', 'brand'],
      ['2027-04-06', 'Throwback Class: the 2018 playlist and original choreography', 'brand'],
      ['2027-04-08', 'Bring Your Barre-stie: free guest pass for every member', 'brand'],
      ['2027-04-09', 'The 9:09 Panic Attack: two 99-minute flash windows', 'retail'],
      ['2027-04-15', 'Séance Class (candle-lit winback class)', 'brand'],
      ['2027-04-17', 'Club Nine Unveiling + Birthday Bash (17–18 Apr)', 'brand'],
      ['2027-04-18', 'Physique 57 India 9th anniversary: ‘9 at 9’ class, cake and the Time Capsule', 'brand'],
      ['2027-04-24', 'Throwback Reunion + Golden Glute Awards', 'brand'],
      ['2027-04-30', 'Lock-In: last keys, midnight close of anniversary prices', 'retail'],
    ],
  },
  8: {
    theme: 'Azaadi From Average',
    focus: 'Friendship Day + Freedom Weekend + Raksha Bandhan',
    objective: 'Recruit whole friend groups on Friendship Day; sell annuals over Freedom Weekend with a 2028 price lock instead of a deeper discount; remove the commitment objection for newcomers with a break-up clause; protect the festive-season renewal book with freezes. Every reward is tied to a purchase or a visit, never to a class count.',
    keyDates: [
      ['2027-08-01', 'Friendship Day: Squad Classes', 'retail'],
      ['2027-08-13', 'Freedom Weekend opens: Price Ki Azaadi (13–17 Aug)', 'retail'],
      ['2027-08-15', 'Independence Day: Freedom Flow class at 8:15 am', 'festival'],
      ['2027-08-17', 'Raksha Bandhan (approx.): Sibling Barre', 'festival', true],
    ],
  },
  11: {
    theme: 'Shaadi Season (and a Very Black Friday)',
    focus: 'Wedding season + 11.11 + Black Friday',
    objective: 'Sell group packs into the wedding season; bring lapsed clients back before the baraat; one loud 11-hour pack day on 11.11; and a Black Friday that moves renewals onto long plans with a mystery bonus instead of a deeper price.',
    keyDates: [
      ['2027-11-11', '11.11: Treat Yourself, Not Your Ex (11:11 am–10:11 pm)', 'retail'],
      ['2027-11-20', 'Sangeet Choreo Barre (ends on a dance-floor routine)', 'brand'],
      ['2027-11-26', 'Black Friday Blind Box opens (26–29 Nov)', 'retail'],
      ['2027-11-29', 'Cyber Monday: last boxes', 'retail'],
    ],
  },
  12: {
    theme: 'Party Season Survival Guide',
    focus: 'Gifting + Christmas + Boxing Day + NYE',
    objective: 'Renew December’s book onto long plans with perks spread across Q1; sell January starts now with Resolution Insurance; turn gifting into January newcomers; bank pack demand on Boxing Day; win back long-lapsed clients with a plus-one to the NYE Countdown Class.',
    keyDates: [
      ['2027-12-01', 'Advent-ure Calendars and gift boxes on sale', 'retail'],
      ['2027-12-18', 'Ugly Sweater Barre', 'brand'],
      ['2027-12-24', 'Christmas Eve candle-lit class', 'festival'],
      ['2027-12-26', 'Boxing Day (Gloves Optional): 26–27 Dec', 'retail'],
      ['2027-12-31', 'NYE Countdown Class (11 am)', 'brand'],
    ],
  },
};

/* Text in months this script does not re-issue: the retired challenge names, replaced. */
const SCRUB = [
  ['get them active before Stronger in 30 (members-only)', 'get them active before February’s Valentine’s season'],
  ["Stronger in 30 finishers' night", 'Galentine’s-to-Women’s-Day open house (bring a friend)'],
  ['Amazing Race 2.0 registrations open', 'Freedom Weekend early-access list opens (for August)'],
  ['bring lapsed clients back before the race', 'bring lapsed clients back before August'],
  ['Bring lapsed clients back before the August race.', 'Bring lapsed clients back before August.'],
  [' + a 15-min race-prep assessment + entry to The Amazing Race 2.0', ' + a 15-min comeback assessment + first access to August’s Freedom Weekend'],
  ['and a lane in The Amazing Race 2.0', 'and first access to Freedom Weekend in August'],
  ['Lapsed race entries; reactivations.', 'Reactivations; comeback assessments booked.'],
  ['Winback (pre-race)', 'Winback (monsoon)'],
  ['race entry', 'freedom weekend early access'],
];

/* ------------------------------------------------------------------------------------ */
const bankById = new Map(plan.offerBank.map(b => [b.id, b]));
const byId = new Map(OFFERS.map(o => [o.id, o]));
const studioByCode = new Map(plan.studios.map(s => [s.studio.code, s]));
const log = [];

function bankEntry(def) {
  const old = bankById.get(def.id) || {};
  const meta = MONTH_META[def.month];
  return {
    id: def.id,
    month: def.month,
    monthName: MONTHS[def.month - 1],
    focus: meta.focus,
    name: def.name,
    slot: def.slot,
    type: def.type,
    mechanicTags: def.tags,
    studios: [],
    offerDetails: def.details,
    headline: def.headline,
    customerMessage: def.message,
    commercialJob: def.job,
    logic: def.logic,
    rules: def.rules,
    kpi: def.kpi,
    pricesByCity: def.prices,
    effectiveDiscountByCity: def.eff,
    discountRuleCheck: def.rule,
    validity: { start: def.validity[0], end: def.validity[1] },
    planByStudio: {},
    plannedRevenue: 0,
    months: [def.month],
    planByMonth: {},
    ...(old.cashDiscountPercent && def.id !== 'O27-43' ? { cashDiscountPercent: old.cashDiscountPercent } : {}),
  };
}

function monthOffer(def, code) {
  const city = CITY_OF[code];
  const [buyers, ticketOverride] = def.plan[code];
  const price = def.prices[city];
  if (price == null) throw new Error(`${def.id} has no ${city} price but runs at ${code}`);
  const ticket = ticketOverride ?? price;
  const revenue = buyers * ticket;
  return {
    id: `${def.id}-${SUFFIX[code]}`,
    bankId: def.id,
    slot: def.slot,
    name: def.name,
    headline: def.headline,
    benefit: def.details,
    customerCopy: def.message,
    description: def.details,
    internalDescription: `Plan: ${buyers} buyers × ${money(ticket)} = ${money(revenue)} (${city} pricing).`,
    rationale: def.logic,
    objective: def.job,
    type: def.type,
    mechanicTags: def.tags,
    audience: def.audience,
    excludedAudience: null,
    conditions: def.rules,
    cta: `${def.validity[0]} to ${def.validity[1]}`,
    status: 'draft',
    approval: 'pending',
    runAds: !!def.runAds,
    price,
    expectedRevenue: revenue,
    buyers,
    effectiveDiscountPercent: def.eff[city],
    kpi: def.kpi,
    validity: { start: def.validity[0], end: def.validity[1] },
    mechanics: { city, stream: def.stream || STREAM[def.slot], discountRule: def.rule[city] },
    ticket,
  };
}

const keyDate = ([date, name, kind, approx]) => ({ day: Number(date.slice(8, 10)), date, name, kind, approx: !!approx });
const weekOf = day => Math.min(4, Math.ceil(day / 7));

function rebuildMonth(studio, month) {
  const code = studio.studio.code;
  const meta = MONTH_META[month.month];
  const name = MONTHS[month.month - 1];
  const before = { offers: month.offers.map(o => o.name), revenue: month.offersPlannedRevenue };
  month.theme = meta.theme;
  month.focus = meta.focus;
  month.objective = meta.objective;
  month.offers = SCHEDULE[month.month][code].map(id => monthOffer(byId.get(id), code));
  month.offersPlannedRevenue = month.offers.reduce((s, o) => s + o.expectedRevenue, 0);
  month.keyDates = meta.keyDates.map(keyDate);
  month.strategy = [
    `${meta.theme}.`,
    `Commercial job: ${meta.objective}`,
    ...month.offers.map(o => `${LABEL[o.slot] || o.slot}: ${o.name} (“${o.headline}”). ${o.rationale}`),
  ].join('\n\n');
  // Notes: the build line stays; the offers' share is recomputed.
  const share = Math.round((month.offersPlannedRevenue / month.target) * 100);
  month.notes = String(month.notes || '').replace(
    /Offers carry ₹[\d.]+L \(\d+% of target\)/,
    `Offers carry ${lakh(month.offersPlannedRevenue)} (${share}% of target)`,
  );
  const item = (value, detail) => ({ label: '', value, detail });
  const events = month.keyDates.map(k => ({ week: weekOf(k.day), line: item('Head trainer', `Run ${k.name} (${k.date}): brief trainers, book the room, post the Story the day before.`) }));
  const inWeek = w => events.filter(e => e.week === w).map(e => e.line);
  const old = Object.fromEntries((month.sections || []).map(s => [s.title, s.items]));
  month.sections = [
    {
      title: 'Week 1',
      items: [
        ...month.offers.map(o => item('Studio manager', `Set up ${o.name} in Momence (${o.cta}): ${o.benefit}`)),
        item('Sales lead', `Brief the team on the ${month.offers.length} ${name} offers, who each is for, the discount caps and the no-stacking rule; print the offer cards.`),
        ...month.offers.map(o => item('Sales lead', `Launch ${o.name}: ${o.customerCopy}`)),
        ...inWeek(1),
      ],
    },
    {
      title: 'Week 2',
      items: [item('Sales lead', `Weekly check: ${month.offers.map(o => `${o.name}: ${o.kpi}`).join(' | ')}`), ...inWeek(2)],
    },
    { title: 'Week 3', items: [...(old['Week 3'] || []), ...inWeek(3)] },
    { title: 'Week 4', items: [...(old['Week 4'] || []), ...inWeek(4)] },
  ];
  const channels = o => (o.runAds ? ['WhatsApp', 'Instagram', 'Email', 'Desk card'] : ['WhatsApp', 'Email', 'Desk card']);
  month.collateral = {
    title: meta.theme,
    pieces: month.offers.map(o => ({ offerId: o.id, headline: o.headline, copy: o.customerCopy, detail: o.benefit, channels: channels(o) })),
  };
  month.crm = {
    rule: month.crm?.rule || 'One send per offer to its own audience; no member gets more than 2 offer sends a week.',
    sends: month.offers.map(o => ({ offerId: o.id, audience: o.audience, message: o.customerCopy })),
    sendsCount: month.offers.length,
  };
  month.standardTrade = {
    ...month.standardTrade,
    revenue: month.target - month.offersPlannedRevenue,
    shareOfMonth: Number((((month.target - month.offersPlannedRevenue) / month.target) * 100).toFixed(1)),
  };
  log.push(`${code} ${name.padEnd(9)} ${lakh(before.revenue).padStart(7)} → ${lakh(month.offersPlannedRevenue).padStart(7)} of ${lakh(month.target)} (${share}%)`);
}

// 1. The bank: replace the re-issued entries, drop the retired ones, add the new ones.
const RETIRED = new Set();
const REISSUED_MONTHS = Object.keys(SCHEDULE).map(Number);
for (const b of plan.offerBank) if (REISSUED_MONTHS.includes(b.month) && !byId.has(b.id)) RETIRED.add(b.id);
// An offer re-issued for one month but scheduled in another month too is not retired there:
// check every scheduled use before dropping it.
plan.offerBank = plan.offerBank.filter(b => !RETIRED.has(b.id)).map(b => (byId.has(b.id) ? bankEntry(byId.get(b.id)) : b));
for (const def of OFFERS) if (!plan.offerBank.some(b => b.id === def.id)) plan.offerBank.push(bankEntry(def));
plan.offerBank.sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }));

// 2. The months.
for (const studio of plan.studios)
  for (const month of studio.months) {
    if (SCHEDULE[month.month]) rebuildMonth(studio, month);
    else {
      // Offers from re-issued months that ran here as a repeat (none today) would be dropped.
      month.offers = month.offers.filter(o => !RETIRED.has(o.bankId));
    }
  }

// 3. Scrub the retired challenge names everywhere else.
const scrub = s => SCRUB.reduce((t, [a, b]) => t.split(a).join(b), s);
const walk = v => (typeof v === 'string' ? scrub(v) : Array.isArray(v) ? v.map(walk) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)])) : v);
plan.studios = walk(plan.studios);
plan.offerBank = walk(plan.offerBank);
plan.dataGaps = plan.dataGaps.filter(g => !/Stronger in 30|Amazing Race/.test(g));

// 4. Recompute what is derived from the offers (same rules as repair-portfolio-2027.mjs).
const allOffers = () => plan.studios.flatMap(s => s.months.flatMap(m => m.offers.map(offer => ({ code: s.studio.code, month: m, offer }))));
for (const bank of plan.offerBank) {
  const byMonth = {};
  for (const { code, month, offer } of allOffers()) {
    if (offer.bankId !== bank.id) continue;
    (byMonth[month.month] ||= {})[code] = { buyers: offer.buyers, ticket: offer.ticket ?? offer.price, revenue: offer.expectedRevenue, price: offer.price, discount: offer.effectiveDiscountPercent };
  }
  bank.planByMonth = byMonth;
  bank.planByStudio = byMonth[bank.month] || {};
  bank.studios = [...new Set(Object.values(byMonth).flatMap(m => Object.keys(m)))].sort();
  bank.months = Object.keys(byMonth).map(Number).sort((a, b) => a - b);
  bank.plannedRevenue = Object.values(byMonth).flatMap(m => Object.values(m)).reduce((s, p) => s + (p.revenue || 0), 0);
}
for (const studio of plan.studios)
  for (const month of studio.months) {
    month.offersPlannedRevenue = month.offers.reduce((s, o) => s + (o.expectedRevenue || 0), 0);
    month.standardTrade.revenue = month.target - month.offersPlannedRevenue;
    month.standardTrade.shareOfMonth = Number(((month.standardTrade.revenue / month.target) * 100).toFixed(1));
  }
const offersRevenue = allOffers().reduce((s, x) => s + x.offer.expectedRevenue, 0);
plan.totals.offers = allOffers().length;
plan.totals.offerBankSize = plan.offerBank.length;
plan.totals.offersPlannedRevenue = offersRevenue;
plan.totals.standardTradeRevenue = plan.totals.target - offersRevenue;
plan.assumptions = plan.assumptions.map(a =>
  /^Offers carry/.test(a)
    ? `Offers carry ${money(offersRevenue)} of the year (${Math.round((offersRevenue / plan.totals.target) * 100)}%); ${money(plan.totals.target - offersRevenue)} is expected at full price.`
    : a,
);
const NOTE = 'February and August offers rewritten so no reward depends on a class count; April rebuilt as one 9th-anniversary plan; November and December offers redesigned. Targets unchanged.';
if (!plan.changesFromPrevious.includes(NOTE)) plan.changesFromPrevious.push(NOTE);
plan.refreshedBy = 'scripts/refresh-plan-2027.mjs';

// 5. Invariants.
const problems = [];
const left = JSON.stringify([plan.studios, plan.offerBank, plan.dataGaps]).match(/Stronger in 30|Amazing Race|leaderboard|Rookie track|finisher/gi);
if (left) { const s = JSON.stringify([plan.studios, plan.offerBank, plan.dataGaps]); problems.push(`Challenge wording left: ${[...s.matchAll(/.{60}(Stronger in 30|Amazing Race|leaderboard|Rookie track|finisher).{40}/gi)].map(m => m[0]).slice(0, 8).join("\n    ")}`); }
for (const { code, month, offer } of allOffers()) {
  if (!plan.offerBank.some(b => b.id === offer.bankId)) problems.push(`${code} ${month.month} ${offer.name}: missing bank ${offer.bankId}`);
  if (offer.ticket * offer.buyers !== offer.expectedRevenue) problems.push(`${offer.id}: ticket × buyers ≠ revenue`);
  if (!month.streams[offer.mechanics.stream] && month.streams[offer.mechanics.stream] !== 0) problems.push(`${offer.id}: unknown stream`);
}
for (const b of plan.offerBank) if (!b.studios.length) problems.push(`${b.id} ${b.name} is never scheduled`);

console.log(log.join('\n'));
console.log(`\nOffers ${plan.totals.offers} · bank ${plan.totals.offerBankSize} · offer revenue ${lakh(offersRevenue)} of ${lakh(plan.totals.target)} · retired ${[...RETIRED].join(', ') || 'none'}`);
if (problems.length) {
  console.error('\nNot written:\n  ' + problems.join('\n  '));
  process.exit(1);
}
if (!CHECK) {
  fs.writeFileSync(FILE, JSON.stringify(plan, null, 2) + '\n');
  console.log(`Wrote ${path.relative(process.cwd(), FILE)}`);
}
