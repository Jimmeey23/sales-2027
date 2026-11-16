"""Hand-written narration copy for the 2027 month explainers.

Numbers never live here: build_narration.py injects each studio's own figures. This file holds
the voice: the month's story, how each offer works in plain words, and the week-by-week beats.

Tone: warm, a little cheeky, always professional. One joke per beat, never at a client's expense.
"""

# ---------------------------------------------------------------- month stories
# open:  sets the scene and names the theme (spoken before any number)
# plan:  the four weeks, in the order they happen
# close: the sign-off line (after the recap of target, offers and buyers)
MONTHS = {
    1: dict(
        open=("Happy New Year, team. January is the one month when people walk in already wanting to change. "
              "Our theme is Resolutions with Receipts: we help people keep the promise, not just make it."),
        plan=["Week one, the flash sale opens, and the clock does the selling.",
              "Week two, every first-timer books class two before leaving class one.",
              "Week three, we personally call every lapsed member on the list.",
              "Week four, February expiries get their Baker's Dozen conversation."],
        close="Resolutions fade by February. Our receipts won't."),
    2: dict(
        open=("February. The shortest month, and the most romantic. Our theme is Red Flags, Green Flags: "
              "Valentine's, Galentine's and Singles Awareness Day, and a studio that is very much a green flag."),
        plan=["Week one, blind-date envelopes at every desk, and the love letters go out to members.",
              "Week two, Galentine's and Valentine's weekend, with Partner Barre on Sunday the fourteenth.",
              "Week three, the Hate-Squat Hour for the singles, and every renewal hears Put a Ring On It.",
              "Week four, last call for lapsed members to pick their relationship status."],
        close="Short month, long commitments. That's the dream."),
    3: dict(
        open=("March is Main Character Month. Women's Day, Holi, and a whole studio full of people "
              "who deserve the spotlight. This month we hand it to them, and gently suggest they renew while standing in it."),
        plan=["Week one, Women's Day, with every free Strength Lab seat filled.",
              "Week two, Holi, and the forty-eight hour renewal window opens.",
              "Week three, nudge every member who has only tried one format.",
              "Week four, no March expiry leaves without a conversation."],
        close="Everyone gets to be the main character. Our job is the plot."),
    4: dict(
        open=("April is our birthday month. Nine years of Physique 57, and the theme is Cloud Nine: "
              "a party in four acts, eight offers, and more confetti than is strictly sensible."),
        plan=["Week one, Platinum Hour, the launch film, and the numbered keys go live with a public counter.",
              "Week two, anniversary week: the wheel, the plank-off, Barre-stie day and the nine-oh-nine panic attack.",
              "Week three, obituary postcards, the Séance Class, the Club Nine unveiling and nine at nine on the eighteenth.",
              "Week four, the Throwback Reunion, the Golden Glute Awards, and a midnight lock-in on the thirtieth."],
        close="Nine years in, and honestly? We've never looked better."),
    5: dict(
        open=("May is Home for the Holidays. Students are back, mums are celebrated, "
              "and the studio has afternoons that are suspiciously quiet. This month we fill those quiet hours, "
              "and keep April's party guests from turning into ghosts."),
        plan=["Week one, student offers go live in the quiet afternoon hours.",
              "Week two, Mother's Day duos, gifts wrapped, tissues on standby.",
              "Week three, every April joiner is tracked towards eight classes.",
              "Week four, squads of four close their group buys."],
        close="Quiet hours, filled. Party guests, kept. That's a good May."),
    6: dict(
        open=("June is Privates Month, with a side of Out of Office. Half our members are packing for holidays, "
              "the other half want results before they go. Either way, a trainer who knows your name is the answer."),
        plan=["Week one, the private session offers go live, and trainers build their call lists.",
              "Week two, the happy hour push fills twelve to four.",
              "Week three, travellers renew with freezes, so nobody lapses on a beach.",
              "Week four, count every conversion and brief the monsoon plan for July."],
        close="Members on holiday, memberships on track. Lovely."),
    7: dict(
        open=("July. The monsoon is here to test everyone's willpower. Our theme is Book the Studio plus Rain Check. "
              "We bring groups in together, make it easy to come back after the summer, and take the guilt out of rainy cancellations. "
              "The plan, thankfully, brought an umbrella."),
        plan=["Week one, corporate and kitty party bookings open.",
              "Week two, we call everyone who left in the summer heat.",
              "Week three, the Rain Check renewal does the heavy lifting.",
              "Week four, returning members get first access to August's Freedom Weekend."],
        close="It's raining offers. Hallelujah."),
    8: dict(
        open=("August is Azaadi From Average. Friendship Day, Independence Day and Raksha Bandhan, "
              "and a month about freedom: from commitment issues, from price hikes, and from quitting when life gets busy."),
        plan=["Week one, Friendship Day, and members book free Squad Classes for their friends.",
              "Week two, Freedom Weekend from the thirteenth, with annuals and a 2028 price lock.",
              "Week three, Independence Day and Sibling Barre, and every trial hears about the break-up clause.",
              "Week four, every renewal leaves with Freedom Freezes for the festive season."],
        close="Freedom looks good on you. So does a longer plan."),
    9: dict(
        open=("September is The Comeback, plus fifty-seven days to Diwali. Routines are back, festive photos are coming, "
              "and everyone suddenly remembers they wanted to feel great in October. We're here to help, with a deadline."),
        plan=["Week one, newcomers measure day one and hear the glow-up guarantee.",
              "Week two, studio managers call our highest-value lapsed members.",
              "Week three, the seven-day comeback window opens for everyone else.",
              "Week four, every renewal is locked before the laddoos arrive."],
        close="Fifty-seven days. No pressure. Well, a little pressure."),
    10: dict(
        open=("October is the Festival of Lights. Dhanteras, Diwali, gifting season, and a lot of very good sweets. "
              "This month, we sell sparkle: upgrades, gifts, and a golden annual membership that lasts longer than any box of kaju katli."),
        plan=["Week one, every monthly member hears the anaar upgrade pitch.",
              "Week two, gift cards go live at the desk, online and in office inboxes.",
              "Week three, Dhanteras, and the gold annual for seventy-two hours only.",
              "Week four, Diwali cleaning brings old members home."],
        close="Lights on, targets lit. Happy Diwali."),
    11: dict(
        open=("November is Shaadi Season, and a very Black Friday. Half our members have a wedding to dance at, "
              "and the other half have a sale to wait for. We have something for both."),
        plan=["Week one, bride squads and wedding parties get their group rate.",
              "Week two, eleven eleven: eleven hours of pack prices, and no exes invited.",
              "Week three, the Sangeet Choreo Barre on the twentieth, and lapsed members come back before the baraat.",
              "Week four, the Black Friday Blind Box, four days, long plans only, and no duds."],
        close="Wedding-ready and fully booked. That's November."),
    12: dict(
        open=("December is the Party Season Survival Guide. Office parties, family dinners, and a January that is coming whether we like it or not. "
              "This month we help members get through the season, and set up the new year before it starts."),
        plan=["Week one, Advent-ure Calendars and gift boxes go on sale.",
              "Week two, every December renewal hears the calendar pitch, and offices get their gift boxes.",
              "Week three, Ugly Sweater Barre, and Resolution Insurance for the I'll start in January crowd.",
              "Week four, Boxing Day packs, and the NYE Countdown Class for our comeback members."],
        close="That's a wrap on 2027. See you on the mat in January."),
}

# ---------------------------------------------------------------- offers
# Keyed by the offer name exactly as the plan writes it.
# hook: the line that makes people smile. how: what the client actually gets.
OFFERS = {
    "The 57-Hour Hangover Sale": dict(
        hook="First up, the 57-Hour Hangover Sale.",
        how="One month unlimited at a flat price, for fifty-seven hours only, with a capped number of memberships. "
            "It vanishes faster than everyone's New Year's Eve plans."),
    "Third Time's the Charm": dict(
        hook="Then, Third Time's the Charm.",
        how="Three classes for the price of two. The first class is awkward, the second is better, the third, they're hooked. "
            "Book class two before they leave class one."),
    "U Up? It's 2027.": dict(
        hook="For lapsed members, U Up? It's 2027.",
        how="Fifteen per cent off to come back, and five bonus days for anyone who hits twelve classes in January. "
            "Their mat has been asking about them."),
    "The Baker's Dozen": dict(
        hook="And for our loyal annual members, The Baker's Dozen.",
        how="Renew your annual and get a thirteenth month, plus privates, guest passes and monthly trainer check-ins. "
            "Twelve months is so last year."),
    "Lift Like a Girl": dict(
        hook="For Women's Day, Lift Like a Girl.",
        how="A free first Strength Lab class for newcomers, eighth to fourteenth of March. "
            "Women's Day isn't about flowers. It's about deadlifts."),
    "The Second Date's On Us": dict(
        hook="For newcomers, The Second Date's On Us.",
        how="First class at half price, the second one free, and the third? That's a relationship, "
            "with fifteen per cent off the first month and an extra freeze."),
    "Bura Na Mano, Renewal Hai": dict(
        hook="For Holi, Bura Na Mano, Renewal Hai.",
        how="A forty-eight hour window for members expiring in March. Three months at fifteen per cent off and a limited Holi tee. "
            "Colours wash out. Abs don't."),
    "Monogamy Is Overrated": dict(
        hook="Then, Monogamy Is Overrated.",
        how="Renew this month and we pay for two classes in formats you've never tried. "
            "Members who play the field stay longer. That's data, not gossip."),
    "Plus One, Plus Nine": dict(
        hook="Next, Plus One, Plus Nine.",
        how="Bring a friend who joins and get nine bonus days. Bring three, and get a whole month. "
            "Presents for presents, because it's our birthday."),
    "Party Crasher Pass": dict(
        hook="For newcomers, the Party Crasher Pass.",
        how="Three classes, including the birthday party class, at a tiny price that comes off their first month if they join. "
            "Everyone's invited."),
    "Spin Class (Literally)": dict(
        hook="Then, Spin Class, literally.",
        how="Renew in April for ten per cent off, then spin the Wheel of Nine. Every spin wins, "
            "and the odds are on the wall, because we're fit, not shady."),
    "Club Nine: The Founders’ Table": dict(
        hook="And finally, Club Nine, The Founders' Table.",
        how="Nine numbered annual seats per studio, with double the perks, a numbered jacket, and a name on the wall. "
            "No seat is ever added."),
    "Mom Said Get Off the Couch": dict(
        hook="First, Mom Said Get Off the Couch.",
        how="Students get eight classes at twenty per cent off, in the off-peak hours when the studio is practically theirs. "
            "Mum will be thrilled."),
    "Mom-entum": dict(
        hook="For Mother's Day, Mom-entum.",
        how="Mother and child duos get a duo private and a gift for mum, and newcomers get fifteen per cent off their first month. "
            "She carried you for nine months. You can carry her to class."),
    "Group Project (Finally, Everyone Pulls Their Weight)": dict(
        hook="Then, Group Project, where finally, everyone pulls their weight.",
        how="Squads of four students buying together each get twenty-five per cent off, off-peak only. "
            "Free-loaders still have to do the planks."),
    "Don't Ghost Us After the Party": dict(
        hook="And for April's new friends, Don't Ghost Us After the Party.",
        how="Show up eight times this month, and your next renewal costs less, plus a private on us. "
            "Great party. Now the real test."),
    "Happy Hour (Zero Hangover, All Glutes)": dict(
        hook="First, Happy Hour. Zero hangover, all glutes.",
        how="Privates booked between twelve and four get twenty per cent off, plus a free virtual session for every two. "
            "The only thing on tap is a trainer."),
    "Private Practice": dict(
        hook="Next, Private Practice.",
        how="Ten private sessions at twenty-five per cent off, with one trainer who knows your knees better than your physio."),
    "Shy Girl Starter Pack": dict(
        hook="For the nervous newcomer, the Shy Girl Starter Pack.",
        how="Start with a thirty-minute private, then join class with a trainer who already knows your name. "
            "Part of the price comes off the first month."),
    "Auto-Reply: Out of Office, Still Squatting": dict(
        hook="And for travellers, Auto-Reply, Out of Office, Still Squatting.",
        how="Three months with unlimited freezes and two virtual privates for the road. "
            "They're on vacation. Their membership isn't lapsing."),
    "Team Building Without the Trust Falls": dict(
        hook="First, Team Building Without the Trust Falls.",
        how="Offices buying ten or more memberships save twenty-five per cent each. "
            "The only thing colleagues will drop is their excuses."),
    "Kitty Party, But Make It Cardio": dict(
        hook="Then, Kitty Party, But Make It Cardio.",
        how="Book out the studio for up to twelve friends, your playlist, our instructor. "
            "Every first-timer in the room then gets three classes for the price of two."),
    "Gone With the Wind, Back With the Rain": dict(
        hook="For lapsed members, Gone With the Wind, Back With the Rain.",
        how="Fifteen per cent off to return, two extra freezes for flooded days, and first access to Freedom Weekend in August."),
    "Rain Check (Literally)": dict(
        hook="And for renewals, Rain Check, literally.",
        how="Renew in July for ten per cent off and three Rain Check tokens, with classes credited back on red-alert days. "
            "Monsoon happens. Late-cancel fees don't have to."),
    "Glow-Up or Give Back": dict(
        hook="For newcomers, Glow-Up or Give Back.",
        how="We measure on day one and again before the festive photos. Do thirty classes and don't improve? "
            "The third month is on us. Confidence, guaranteed."),
    "We Need to Talk": dict(
        hook="Then, We Need to Talk. Not like that.",
        how="Our studio managers personally call high-value lapsed members. Say yes, and get six months at twenty per cent off, "
            "unlimited freezes and a private to restart."),
    "New Phone, Who Dis?": dict(
        hook="For everyone else who drifted, New Phone, Who Dis?",
        how="One free, no-questions-asked comeback class. Buy within seven days, and get fifteen per cent off plus an extra freeze."),
    "Lock It Before the Laddoos": dict(
        hook="And for renewals, Lock It Before the Laddoos.",
        how="Renew for three months by the thirtieth: fifteen per cent off, a Diwali hamper, and unlimited freezes for festive travel."),
    "From Phuljhadi to Anaar": dict(
        hook="First, From Phuljhadi to Anaar.",
        how="Monthly members upgrade to six months at twenty per cent off, with three extra freezes for the festive madness. "
            "Small sparkle to big sparkle."),
    "Diwali Gifting, Minus the Dry-Fruit Box": dict(
        hook="Then, Diwali Gifting, Minus the Dry-Fruit Box.",
        how="Gift three classes for the price of two. If the recipient joins, the giver earns a bonus class. "
            "Nobody needs a fourteenth box of almonds."),
    "Diwali Cleaning: Found Your Old Grip Socks?": dict(
        hook="For lapsed members, Diwali Cleaning. Found your old grip socks?",
        how="That's a sign. Fifteen per cent off the return, and a brand-new pair of socks on us."),
    "Gold Rush (Dhanteras Edition)": dict(
        hook="And for Dhanteras, Gold Rush.",
        how="An annual at twenty-two per cent off, an extra private, and a gold-foil card, for seventy-two hours only. "
            "Gold that actually lifts."),
    "Blind Date (No Catfishing)": dict(
        hook="First up, Blind Date, no catfishing.",
        how="Two mystery classes for nine ninety-nine. The format and the trainer stay sealed until you walk in. "
            "Love it, and the whole fee comes off your first month."),
    "Love Bombing (The Healthy Kind)": dict(
        hook="Then, Love Bombing, the healthy kind.",
        how="Every member writes a love letter to a friend: two free classes. If the friend joins, they get fifteen per cent off "
            "and grip socks, and the member gets five extra days."),
    "Put a Ring On It": dict(
        hook="For renewals, Put a Ring On It.",
        how="Renew for three months and get the ring, which is a mini-band, relax. Six months comes with a private, "
            "and annual members go on the Wall of Commitment. Say yes at the desk and the bell rings."),
    "It’s Not You, It’s Your Schedule": dict(
        hook="And for lapsed members, It's Not You, It's Your Schedule.",
        how="They pick a relationship status: Exclusive is three months, Casual is a twelve-class pack, "
            "It's Complicated is one month with a free freeze. Fifteen per cent off whichever they choose."),
    "Moving In Together (The 9-Month Lease)": dict(
        hook="First up, Moving In Together, the nine-month lease.",
        how="Nine months unlimited, nine freezes, the anniversary hoodie and a numbered brass key. "
            "Ninety-nine keys in Mumbai, thirty-nine in Bengaluru, and no second batch."),
    "Club Nine: The Founders’ Table": dict(
        hook="Then, Club Nine, the Founders' Table.",
        how="Nine numbered annual seats per studio, with the perks doubled: four privates, eight guest passes, "
            "priority booking all year and a numbered jacket."),
    "Spin Class (Literally)": dict(
        hook="For renewals, Spin Class. Literally.",
        how="Renew in April and spin the Wheel of Nine. Every spin wins. Then keep it, double it by booking nine classes, "
            "or give it to a friend."),
    "Party Crasher Pass": dict(
        hook="For newcomers, the Party Crasher Pass.",
        how="Three classes for nine ninety-nine, party class included, credited against a first month. "
            "Decide within nine hours and you get to hit the big red buzzer."),
    "Faking Your Own Death Didn’t Work": dict(
        hook="For lapsed members, Faking Your Own Death Didn't Work.",
        how="They get an obituary postcard, which is also their ticket to the candle-lit Séance Class. "
            "Fifteen per cent off to rise from the dead, plus a bonus for every year they've been with us."),
    "Plus One, Plus Nine": dict(
        hook="Then, Plus One, Plus Nine.",
        how="Bring a friend who joins and get nine extra days. Bring three and the next month is on us."),
    "The 9:09 Panic Attack": dict(
        hook="Then, the nine-oh-nine panic attack.",
        how="The limited nine-class pack. Plank for your price at the desk, or wait for nine-oh-nine on the ninth, "
            "when everyone gets the floor price for ninety-nine minutes."),
    "The Cloud Nine 90": dict(
        hook="And for our heaviest users, the Cloud Nine ninety.",
        how="Ninety classes, one year, about fifteen hundred rupees a class in Mumbai. Zero commitment issues."),
    "No Strings Attached": dict(
        hook="First up, No Strings Attached.",
        how="Two classes for nine ninety-nine, credited against a first month, and a break-up clause: "
            "if it's not for them after two weeks, what's left turns into a class pack."),
    "Price Ki Azaadi (Freedom From Price Hikes)": dict(
        hook="Then, Price Ki Azaadi, freedom from price hikes.",
        how="Over Freedom Weekend, the annual at twenty per cent off with fifteen extra days, "
            "and next year's renewal locked at this year's price."),
    "Squad Goals, Squat Goals": dict(
        hook="For Friendship Day, Squad Goals, Squat Goals.",
        how="Members book a free Squad Class for up to four friends. Friends who join get fifteen per cent off and "
            "friendship-band grip socks. Siblings count, it's Rakhi month."),
    "Freedom to Pause (Not Quit)": dict(
        hook="And for renewals, Freedom to Pause, not quit.",
        how="Renew for three months and get two Freedom Freezes for Ganpati and Diwali travel, "
            "or six months with a private and three freezes."),
    "Bride Squad, Assemble (Groom Can Come Too)": dict(
        hook="First up, Bride Squad, Assemble. The groom can come too.",
        how="Four or more of you, at least two new, buy twelve-class packs together at twelve per cent off "
            "and get a private Squad Class that ends on a Sangeet routine."),
    "Shaadi Mein Zaroor Aana (Come Back Before the Baraat)": dict(
        hook="For lapsed members, Shaadi Mein Zaroor Aana.",
        how="Fifteen per cent off to come back, matching Bride Tribe socks, and a seat at the Sangeet Choreo Barre."),
    "11.11: Treat Yourself, Not Your Ex": dict(
        hook="Then, eleven eleven: treat yourself, not your ex.",
        how="Eleven hours only, eight-class packs at twenty per cent off. One per person."),
    "Black Friday Blind Box (No Duds)": dict(
        hook="And finally, the Black Friday Blind Box. No duds.",
        how="Renew for three, six or twelve months and pick a sealed box: extra days, guest passes, a private. "
            "Every box wins, and one annual box per studio hides the hoodie."),
    "The Advent-ure Calendar (Opens in January)": dict(
        hook="First up, the Advent-ure Calendar, which opens in January.",
        how="Renew in December and take home twelve doors of perks, one a week from the third of January: "
            "guest passes, a private, smoothies and a golden door. Perfect for the hardest quarter."),
    "Boxing Day (Gloves Optional)": dict(
        hook="Then, Boxing Day. Gloves optional.",
        how="Two days only, twelve-class packs at twenty per cent off. Stock up before January."),
    "Resolution Insurance (Claim Approved)": dict(
        hook="For newcomers, Resolution Insurance. Claim approved.",
        how="Buy your first month now, start any day from the first to the tenth of January, "
            "and January's late-cancel fees are on us, plus a freeze for when life happens."),
    "The Gift They Won’t Regift": dict(
        hook="Then, The Gift They Won't Regift.",
        how="A boxed gift: two classes, grip socks, and a thousand rupees off a first membership. Offices buying ten get a team class."),
    "The Ex-Files: Season Finale": dict(
        hook="And for lapsed members, The Ex-Files: Season Finale.",
        how="Ten per cent off to come back, fifteen on three months, and a plus-one to the NYE Countdown Class."),
    "Same Time Next Week": dict(
        hook="For pack regulars, Same Time Next Week.",
        how="Nearly out of classes? Take the same pack again at fifteen per cent off, plus an extra week of validity so nothing goes to waste."),
}

# ---------------------------------------------------------------- reusable lines
TARGET_UP = [
    "That's {pct} per cent more than last {month}. Ambitious, yes. Unreasonable, no.",
    "That's {pct} per cent up on last {month}. A stretch, but a friendly one.",
    "That's {pct} per cent above last {month}. We're growing, and the plan knows exactly how.",
]
TARGET_FLAT = ["That's right in line with last {month}. Steady hands, steady numbers."]
TARGET_DOWN = [
    "That's {pct} per cent below last {month}, by design. A smaller mountain, so let's climb it properly.",
    "That's {pct} per cent under last {month}. A realistic number, which means there's no excuse to miss it.",
]
STREAM_LEAD = {
    "renewal": "Our existing members carry this month, so every renewal conversation matters.",
    "newClient": "New clients carry this month, so every trial is a first impression worth getting right.",
    "reactivation": "Comebacks carry this month, so it's time to call some old friends.",
    "other": "The extras carry this month, so every add-on counts.",
}
FUNNEL_TAIL = [
    "Every five trials should become about one member. Make those first classes unforgettable.",
    "The trial class is where this month is won. Warm welcome, clear next step, every time.",
    "Roughly one in five trials becomes a member. Our job is to make it one in four.",
]
COVER_TAIL = [
    "The rest comes from full-price sales, so the offers are a boost, not a crutch.",
    "The rest is full-price. Offers open the door. Great classes keep it open.",
]

# A week beat that names an offer is only read when the studio runs that offer.
PLAN_NEEDS = {
    1: ["The 57-Hour Hangover Sale", "Third Time's the Charm", "U Up? It's 2027.", "The Baker's Dozen"],
    2: ["Blind Date (No Catfishing)", None, "Put a Ring On It", "It’s Not You, It’s Your Schedule"],
    3: ["Lift Like a Girl", "Bura Na Mano, Renewal Hai", "Monogamy Is Overrated", None],
    4: ["Moving In Together (The 9-Month Lease)", "Spin Class (Literally)", "Faking Your Own Death Didn’t Work", None],
    5: ["Mom Said Get Off the Couch", "Mom-entum", "Don't Ghost Us After the Party",
        "Group Project (Finally, Everyone Pulls Their Weight)"],
    6: ["Private Practice", "Happy Hour (Zero Hangover, All Glutes)", "Auto-Reply: Out of Office, Still Squatting", None],
    7: ["Kitty Party, But Make It Cardio", "Gone With the Wind, Back With the Rain", "Rain Check (Literally)", None],
    8: ["Squad Goals, Squat Goals", "Price Ki Azaadi (Freedom From Price Hikes)", "No Strings Attached",
        "Freedom to Pause (Not Quit)"],
    9: ["Glow-Up or Give Back", "We Need to Talk", "New Phone, Who Dis?", "Lock It Before the Laddoos"],
    10: ["From Phuljhadi to Anaar", "Diwali Gifting, Minus the Dry-Fruit Box", "Gold Rush (Dhanteras Edition)",
         "Diwali Cleaning: Found Your Old Grip Socks?"],
    11: ["Bride Squad, Assemble (Groom Can Come Too)", "11.11: Treat Yourself, Not Your Ex",
         "Shaadi Mein Zaroor Aana (Come Back Before the Baraat)", "Black Friday Blind Box (No Duds)"],
    12: ["The Advent-ure Calendar (Opens in January)", "The Gift They Won’t Regift", "Resolution Insurance (Claim Approved)",
         "Boxing Day (Gloves Optional)"],
}
PLAN_FALLBACK = [
    "Week one, every offer goes live and the team knows them by heart.",
    "Week two, check sell-through every Monday and follow up every trial within a day.",
    "Week three, a mid-month check against the target.",
    "Week four, close the month, tag every redemption, and brief next month.",
]
