"""Hand-written content for the 2027 team comms pack: the redesigned 9th-anniversary
plan, friendly month intros and the collateral each month needs.

Everything numeric about the regular months comes from server/data/approved-plan-2027.json;
this file only holds what the approved plan does not: the anniversary redesign and copy."""

# ---------------------------------------------------------------- city prices (incl. GST)
PRICE = {
    'Mumbai': {'single': 1942.5, '8pk': 13125, '12pk': 19687.5, '3m': 57855, '6m': 113715,
               'annual': 219450, 'private': 5250, 'private10': 52500},
    'Bengaluru': {'single': 1417.5, '8pk': 8715, '12pk': 13125, '3m': 42210, '6m': 82215,
                  'annual': 156240, 'private': 4121.25, 'private10': 41212.5},
}
CITY = {'Kemps Corner': 'Mumbai', 'Bandra': 'Mumbai', 'Kenkere House': 'Bengaluru', 'Pop-up': 'Bengaluru'}
STUDIOS = ['Kemps Corner', 'Bandra', 'Kenkere House', 'Pop-up']
ACCENT = {'Kemps Corner': '#1f6a57', 'Bandra': '#2b5c85', 'Kenkere House': '#7a3b56', 'Pop-up': '#a2712f'}

# ---------------------------------------------------------------- the anniversary redesign
ANNIV = {
    'title': 'Nine Lives',
    'subtitle': 'The 9th Anniversary · 25 March – 9 May 2027',
    'big_idea': (
        "Nine years, nine lives. April becomes a month-long game with a story in three acts: a members-only "
        "Pre-Party in late March, a 30-day Party in April where every class can win you something, and an "
        "Afterparty in early May that turns April buyers into regulars. Every buyer type gets exactly one hero "
        "offer, the biggest money comes from scarce, numbered, near-full-price products, and the fun is "
        "free to play, so it fills classes instead of eating margin."),
    'why_better': [
        ('One hero offer per person',
         'The earlier drafts gave the desk 5–9 overlapping April offers. Now: newcomers get Cloud Nine Intro, '
         'members renewing get the Lucky Nine Wheel, big spenders get Club Nine or the Nine-Month Lease, '
         'lapsed clients get Nine Years, Nine Reasons. Easy to explain in one breath.'),
        ('Scarcity at full price carries the month',
         'Club Nine (9 numbered Annuals per studio, list price) and the Nine-Month Lease (99 per city) bring '
         '~₹30L of high-ticket revenue at 0–20% effective discount, instead of buying volume at 40%+ like April 2026.'),
        ('Fun that drives attendance, not discount',
         'The Nine Lives Passport, Hidden 9s, Plank of Fame and the Golden Glute Awards cost little, are free to play '
         'and push class visits. Clients using 75%+ of their sessions renew at ~80–86%.'),
        ('Three acts beat one spike',
         'Pre-Party lifts the weak March, the Party peaks on 9 April (9:09 flash) and 10 April (Birthday Class), '
         'and the Afterparty in May protects the repeat rate (target 60–72% vs 41–68% after April 2026).'),
        ('New revenue lines',
         'Gift Nine gift cards ride into Mother\'s Day, the Nine Lives merch capsule adds retail, and Squad Goals '
         'turns friend groups into 3-Month memberships.'),
    ],
    'guardrails': [
        'No offer above 25% effective discount, bonuses valued at list. Highest: the 9:09 Flash Pack at 24.0%.',
        'One offer per purchase. Wheel prizes, flash prices and offers never stack.',
        'Average April discount under 15% of gross at every studio (April 2026: KC 30.1%, Bandra 25.3%).',
        'Scarcity is real: 9 Club Nine seats per studio, 99 Lease keys per city. Sold out means sold out.',
        'No anniversary prices after 30 April, 11:59 pm. The Afterparty rewards attendance, not price.',
        'Game prizes not tied to a purchase (Hidden 9s, Plank of Fame, awards) are a marketing cost, budgeted at ₹1.5L.',
    ],
    # offers: units per (KC, BA, KH, Pop) and price per city -> revenue model
    'offers': [
        {'name': 'Club Nine', 'slot': 'renewal', 'stream': 'Renewal & upgrade', 'emoji': '🗝️',
         'tagline': 'Nine numbered Annual memberships per studio. Full price. Founder perks for life.',
         'who': 'Any active member or high-frequency pack buyer. Platinum (March) renewers get first pick.',
         'pay': 'Annual Unlimited at list: ₹2,19,450 Mumbai · ₹1,56,240 Bengaluru (monthly instalment allowed at list).',
         'get': ['Numbered brass key #1–9 and your name on the Club Nine wall',
                 '4 private sessions (2 standing + 2 extra)', '48-hour early booking all year',
                 '4 extra guest passes and the anniversary box (hoodie, socks, bottle)'],
         'when': '25 Mar (Pre-Party) – 30 Apr, or until the 9 seats go', 'disc': '5.7% effective (0% cash)',
         'units': (5, 3, 2, 0), 'price': {'Mumbai': 219450, 'Bengaluru': 156240}, 'start': (3, 25), 'end': (4, 30)},
        {'name': 'The Nine-Month Lease', 'slot': 'renewal', 'stream': 'Renewal & upgrade', 'emoji': '🔑',
         'tagline': 'A 9-Month Unlimited that only exists this April. 99 keys per city, then it is gone forever.',
         'who': 'Members renewing or upgrading from a 1M/3M; also open to newcomers after their intro.',
         'pay': '₹1,39,999 Mumbai · ₹99,999 Bengaluru (6M + 3M at list = ₹1,71,570 / ₹1,24,425).',
         'get': ['9 months unlimited', '9 freezes', 'Numbered Lease key (001–099) + live key counter in studio',
                 'Nine Lives hoodie'],
         'when': '1–30 Apr', 'disc': '21.3% Mumbai · 23.6% Bengaluru (incl. hoodie)',
         'units': (4, 2, 1, 0), 'price': {'Mumbai': 139999, 'Bengaluru': 99999}, 'start': (4, 1), 'end': (4, 30)},
        {'name': 'The Lucky Nine Wheel', 'slot': 'renewal', 'stream': 'Renewal & upgrade', 'emoji': '🎡',
         'tagline': 'Renew your 3-Month or 6-Month at 10% off, then spin. Everyone wins something.',
         'who': 'Active members on a 1M, 3M or 6M renewing or upgrading in April.',
         'pay': '3M: ₹52,070 Mumbai · ₹37,989 Bengaluru. 6M: ₹1,02,344 Mumbai · ₹73,994 Bengaluru.',
         'get': ['One spin: 2 bonus classes · a private session · grip socks · 3 guest passes · '
                 'a Nine Lives tote · Golden Ticket (on 6M only: +2 weeks free)',
                 'Dare card: do 9 classes in your first 14 days and get 1 more bonus class'],
         'when': '5–30 Apr (Platinum renewers spin first on 30–31 Mar)', 'disc': 'Max 23.2% (3M jackpot + dare) · 19.9% (6M Golden Ticket)',
         'units3': (15, 8, 6, 0), 'units6': (2, 1, 1, 0), 'start': (4, 5), 'end': (4, 30)},
        {'name': 'Lock In Before You Clock Out', 'slot': 'renewal', 'stream': 'Renewal & upgrade', 'emoji': '⏰',
         'tagline': 'Pack and 1-Month renewals at 10% off; 12-class packs get a bonus class.',
         'who': 'Pack and 1-Month members renewing in April.',
         'pay': "10% off your product's list price.", 'get': ['10% off', '12-class packs: +1 complimentary class', 'Passport double-stamp'],
         'when': '1–30 Apr', 'disc': '10% (1M, 8-pack) · 19.9% (12-pack incl. bonus class)',
         'units': (55, 32, 28, 4), 'price': {'Mumbai': 17719, 'Bengaluru': 11813}, 'start': (4, 1), 'end': (4, 30)},
        {'name': 'Cloud Nine Intro', 'slot': 'newcomer', 'stream': 'New clients', 'emoji': '☁️',
         'tagline': 'Nine days unlimited for less than one class.',
         'who': 'First-time clients (phone verified).',
         'pay': '₹999 Mumbai · ₹799 Bengaluru, credited in full if you buy within 72 hours of day 9.',
         'get': ['Unlimited Barre + powerCycle for 9 days (max 2/day)', 'Hit the Impulse Buzzer: buy within 72 h and get '
                 'the standing 15% + Nine Lives tote', 'Name on the Reckless Decisions board'],
         'when': '1–21 Apr (intro must end inside April)', 'disc': '21% effective on the follow-on purchase',
         'units': (180, 250, 90, 25), 'price': {'Mumbai': 999, 'Bengaluru': 799}, 'start': (4, 1), 'end': (4, 21)},
        {'name': 'Intro → membership conversions', 'slot': 'newcomer', 'stream': 'New clients', 'emoji': '🔔',
         'tagline': 'The follow-on purchase after Cloud Nine Intro (net of the credited intro fee).',
         'who': 'Cloud Nine Intro clients (≈24% convert).', 'pay': 'Avg first purchase at standing 15%.',
         'get': [], 'when': '1–30 Apr', 'disc': '21% (counted above)', 'model_only': True,
         'units': (30, 40, 15, 4), 'price': {'Mumbai': 15000, 'Bengaluru': 9500}, 'start': (4, 1), 'end': (4, 30)},
        {'name': 'The 9:09 Flash Pack', 'slot': 'newcomer', 'stream': 'Packs & flash', 'emoji': '🚨',
         'tagline': 'A 9-Class Pack, 99 days to use it. Flash price for 99 minutes from 9:09 am and 9:09 pm on 9 April.',
         'who': 'Everyone: newcomers, pack buyers, members buying for a friend.',
         'pay': 'Flash: ₹11,499 Mumbai · ₹7,699 Bengaluru. Rest of April: ₹12,999 · ₹8,699.',
         'get': ['9 classes, valid 99 days', 'Siren in studio + live countdown on Instagram'],
         'when': 'Flash: Fri 9 Apr. Pack on sale 1–30 Apr', 'disc': 'Flash 23.7% Mumbai / 24.0% Bengaluru · regular 13.7% / 14.1%',
         'units': (40, 25, 15, 6), 'price': {'Mumbai': 12100, 'Bengaluru': 8100}, 'start': (4, 9), 'end': (4, 9)},
        {'name': 'Nine Years, Nine Reasons', 'slot': 'lapsed', 'stream': 'Win-backs', 'emoji': '💌',
         'tagline': 'Nine things changed while you were away. Come see them.',
         'who': 'Clients lapsed 61–365 days.',
         'pay': '12-class pack at the standing 15% lapsed perk: ₹16,734 Mumbai · ₹11,156 Bengaluru.',
         'get': ['A personal note with 9 things new at your studio', 'Pose in the Back From the Dead frame at the Resurrection Booth',
                 'Invite to the Birthday Class'],
         'when': '1–30 Apr (postcards land 12 Apr)', 'disc': '15% (standing perk)',
         'units': (30, 16, 14, 3), 'price': {'Mumbai': 16734, 'Bengaluru': 11156}, 'start': (4, 1), 'end': (4, 30)},
        {'name': 'Squad Goals', 'slot': 'newcomer', 'stream': 'Other revenue', 'emoji': '👯',
         'tagline': 'Three or more friends buy a 3-Month together, each gets 12% off and a squad private.',
         'who': 'Groups of 3+ (at least one new client).',
         'pay': '3M at 12% off: ₹50,912 Mumbai · ₹37,145 Bengaluru each.',
         'get': ['12% off each', 'One free group private for the squad', 'Squad photo on the Lease Wall'],
         'when': '1–30 Apr', 'disc': '≈15% incl. the group private',
         'units': (6, 3, 3, 0), 'price': {'Mumbai': 50912, 'Bengaluru': 37145}, 'start': (4, 1), 'end': (4, 30)},
        {'name': 'Gift Nine', 'slot': 'renewal', 'stream': 'Other revenue', 'emoji': '🎁',
         'tagline': 'Pay ₹9,000, gift ₹10,000. Perfect for Mother\'s Day.',
         'who': 'Anyone, members and their families.', 'pay': '₹9,000 gift card worth ₹10,000.',
         'get': ['₹10,000 of credit, valid 6 months', 'Gift-wrapped card + digital version'],
         'when': '20 Apr – 9 May (Mother\'s Day)', 'disc': '10%',
         'units': (30, 20, 12, 2), 'price': {'Mumbai': 9000, 'Bengaluru': 9000}, 'start': (4, 20), 'end': (5, 9)},
        {'name': 'Nine Lives merch capsule', 'slot': 'renewal', 'stream': 'Other revenue', 'emoji': '🧢',
         'tagline': 'Hoodie, grip socks, tote and bottle, numbered drop.',
         'who': 'Everyone.', 'pay': 'Hoodie ₹4,999 · socks ₹999 · tote ₹1,499 · bottle ₹1,299.',
         'get': ['Limited 999-piece run'], 'when': '1 Apr – while stock lasts', 'disc': 'Full price',
         'units': (90, 60, 40, 10), 'price': {'Mumbai': 2400, 'Bengaluru': 2400}, 'start': (4, 1), 'end': (4, 30)},
    ],
    'presale': {
        'name': 'Platinum Pre-Party', 'when': '25–31 Mar 2027',
        'body': ('Members who renew a 3-Month in March get 15% off + 9 bonus days, plus Platinum status: '
                 'first pick of Club Nine seats and Lease keys on 30–31 March (Platinum Hour), first spins of the '
                 'wheel, reserved seats at the Golden Glute Awards. Target: 30 March renewals across the three studios.'),
    },
    'acts': [
        ('Act I · Pre-Party', '25–31 Mar', 'Members only. Platinum renewals, teaser film, Club Nine reveal. Lifts the weak March.'),
        ('Act II · The Party', '1–30 Apr', 'Every hero offer live. Weekly game drops, 9:09 flash, Birthday Class, Golden Glute Awards.'),
        ('Act III · Afterparty', '1–9 May', 'No anniversary prices. Passport rewards, dare-card check-ins, Gift Nine for Mother\'s Day.'),
    ],
    # (month, day_start, day_end, title, what)
    'activations': [
        (3, 25, 31, 'Pre-Party: Platinum renewals open', 'Members-only 3-Month renewal at 15% + 9 days + Platinum status.'),
        (3, 28, 28, 'Teaser: "Nine Years in Ninety Seconds" film', 'Film drops on Instagram + WhatsApp; Club Nine wall unveiled in studio.'),
        (3, 30, 31, 'Platinum Hour', 'Platinum renewers get first pick of Club Nine seats and Lease keys, first wheel spins.'),
        (4, 1, 1, 'Launch day', 'All hero offers live; Nine Lives Passports handed out; Impulse Buzzer live at every desk.'),
        (4, 1, 30, 'Nine Lives Passport', '9 stamps (7 am class, weekend class, new trainer, new format, Blind Date, bring a friend, 9 classes in 9 days, Birthday Class, Time Capsule). Full passport = 1 bonus class + awards seat + draw for a Lease.'),
        (4, 3, 3, 'Blind Date With a Class', 'Format and trainer kept secret until you walk in. Passport stamp.'),
        (4, 6, 6, 'Throwback Class', 'The 2018 playlist and original choreography. Big social content day.'),
        (4, 7, 7, 'Plank of Fame', 'Studio plank-off; top 9 per studio win a private session + a spot on the wall.'),
        (4, 8, 8, 'Bring Your Barre-stie', 'Free guest pass for every member; friends meet the Impulse Buzzer.'),
        (4, 9, 9, 'The 9:09 Panic', 'Flash Pack at 9:09 am and 9:09 pm, 99 minutes each. Siren + countdown.'),
        (4, 10, 10, 'The Birthday Class', 'DJ, cake, confetti, guest trainers swapped between Kemps Corner and Bandra; Kenkere hosts the pop-up regulars.'),
        (4, 11, 11, 'Time Capsule', 'Members write to their future selves, opened at the 10th anniversary in April 2028.'),
        (4, 12, 25, 'Hidden 9s', 'Nine gold envelopes hidden each week (privates, hoodies, retail vouchers).'),
        (4, 12, 30, 'Resurrection Booth', 'Obituary postcards to the lapsed list; Back From the Dead photo frame in studio.'),
        (4, 24, 24, 'Golden Glute Awards & Trainer Roast', 'Member-voted awards night; red carpet for Club Nine + Lease holders.'),
        (4, 30, 30, 'The Lock-In', 'Studio open late; live key counter; last class 9:09 pm. Anniversary prices end at midnight.'),
        (5, 1, 9, 'Afterparty', 'Passport rewards credited, dare-card check-ins, April buyers with 12+ classes offered the 3M upgrade.'),
    ],
}

# ---------------------------------------------------------------- friendly month intros
MONTH_COPY = {
    1: ('New year, fresh starts 🎉', "January is the busiest intent month of the year, so let's catch everyone while the resolution is hot. Big job: get newcomers into a habit in week one and re-up our January annuals."),
    2: ('Love is in the (studio) air 💕', "February is short, so speed matters. We're running Week Zero for new folks, a buddy theme for Valentine's, and setting up the late-Feb renewals that carry us into March."),
    3: ('Warm-up before the big party 🔥', "March is usually quiet, so this year it's the warm-up act. Push renewals early, and from 25 March members can go Platinum and get first dibs on the anniversary."),
    4: ('NINE LIVES: our 9th birthday! 🎂', "This is the big one: our first ₹1 crore month. One hero offer per client type, a game every week, and a party on the 10th. Let's make it loud and keep it profitable."),
    5: ("Afterparty + Mother's Day 💐", "April buyers need a reason to stay, so May is about getting them to class and turning them into regulars. Plus Mother's Day offers in the first half."),
    6: ('Summer mode ☀️', "Lots of people travel in June. Keep travellers attached with pause options and catch the folks who are home for the summer."),
    7: ('Monsoon momentum 🌧️', "Rain is our excuse to stay consistent. Cohort challenge for newcomers, a warm-up comeback for lapsed folks, and streaks for members."),
    8: ('Back on track 🏁', "Back-to-routine season. Starting Gun Week for new clients, quick comebacks in the first half, and Pit Stop renewals all month."),
    9: ('Proof season 💪', "September is about results. 57-Day Proof for newcomers, and we lock in renewals before the festive pause."),
    10: ('Festive & gifting 🪔', "Diwali month! Gifting offers, come-home-for-Diwali win-backs, and renew-and-gift for members."),
    11: ('Black Friday week 🖤', "One sharp window, 20 Nov to 5 Dec. Short, loud and capped. Plus the last Club Nine seats come back on 26 Nov."),
    12: ('Wrap the year 🎁', "Let's close strong: pre-New-Year cohorts, a fun 'Your 2027 Wrapped' for lapsed folks, and renewals that carry into the January challenge."),
}

# Seasonal moments added to the calendar (month, start, end, title)
SEASONAL = [
    (2, 14, 14, "Valentine's Day"), (3, 8, 8, "International Women's Day"),
    (5, 9, 9, "Mother's Day"), (6, 21, 21, 'International Yoga Day'),
    (10, 29, 29, 'Diwali (Lakshmi Puja)'), (11, 26, 26, 'Black Friday'),
    (12, 31, 31, "New Year's Eve"),
]

# What every month needs from design, and a per-month special
BASE_COLLATERAL = [
    ('Hero creative per offer', 'IG feed 4:5, Story 9:16, Reel 15–30 s', 'Instagram / Meta ads', 14),
    ('Landing page + website banner', 'Desktop + mobile banner, T&Cs', 'Website, Momence', 10),
    ('WhatsApp broadcast set', 'Image + 3-line copy + booking link, 1 per segment', 'WhatsApp', 7),
    ('Email set', 'Header banner + body (members, lapsed, leads)', 'Email', 7),
    ('In-studio signage', 'A3 poster, counter card, mirror decal', 'Front desk, studio', 5),
    ('Desk & trainer script', 'One-pager: who gets what + objection handling', 'Team briefing', 3),
]
MONTH_COLLATERAL = {
    1: ['Week-one habit tracker card', 'Annual re-up letter (8 Jan-2026 annuals)'],
    2: ['Valentine buddy-pass cards', 'Renewal reminder sequence for 22 Feb – 10 Mar'],
    3: ['Platinum status card + lanyard', '"Nine Years in Ninety Seconds" teaser film', 'Club Nine wall (numbered plates 1–9)'],
    4: ['Nine Lives Passport (print 2,000)', 'Lucky Nine Wheel (physical, 3 studios) + prize cards', 'Impulse Buzzer + Reckless Decisions board',
        'Lease key counter screen + 198 numbered keys', '9:09 siren + IG countdown stickers', 'Obituary postcards (lapsed list)',
        'Back From the Dead photo frame', 'Golden Glute trophies + voting form', 'Birthday Class décor, DJ, cake', 'Hidden 9s gold envelopes (27/week)',
        'Merch capsule (hoodie, socks, tote, bottle)', 'Gift Nine cards (printed + digital)'],
    5: ["Mother's Day gift card + mum-and-me pass", 'Passport reward certificates', 'Dare-card check-in messages'],
    6: ['Pause Button explainer card', 'Travel-friendly class schedule'],
    7: ['Kickstart 21 cohort welcome kit', 'Monsoon streak tracker'],
    8: ['Starting Gun Week race bib + tracker', 'Pit Stop renewal card'],
    9: ['57-Day Proof progress card', 'Festive pause explainer'],
    10: ['Gift a Flight gift cards', 'Diwali décor + homecoming postcard'],
    11: ['Black Friday countdown assets', 'Club Nine: Last Seats wall update'],
    12: ['"Your 2027 Wrapped" personal stats card', 'Kickstart 21 Jan cohort sign-up sheet'],
}
