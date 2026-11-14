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
        open=("February. The shortest month, and the most romantic. "
              "Our theme pairs Valentine's with Stronger in 30, round two. Love is in the air, "
              "and so are a lot of very committed glutes."),
        plan=["Week one, launch the couples offers and open Stronger in 30.",
              "Week two, Valentine's week, so every member hears about bringing someone new.",
              "Week three, cheer the challengers on, because attendance is the pitch.",
              "Week four, everyone who finished thirty classes gets their Proof of Work price."],
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
        open=("April is our birthday month. Nine years of Physique 57, and the theme is Cloud Nine. "
              "The confetti budget has been approved. So has the target."),
        plan=["Week one, the numbered memberships go live, with a public counter.",
              "Week two, the party class brings new faces in, and every guest gets a follow-up.",
              "Week three, the wheel spins and the Club Nine seats close.",
              "Week four, the Throwback Reunion brings old friends home."],
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
              "Week four, returning members sign up for The Amazing Race."],
        close="It's raining offers. Hallelujah."),
    8: dict(
        open=("August is The Amazing Race, version two. Friendship Day, Independence Day, and a studio-wide race "
              "that turns attendance into a sport. Half the city is on holiday. The other half is on our leaderboard."),
        plan=["Week one, Friendship Day, and every friend gets two classes on us.",
              "Week two, Independence Day, and the midnight annual sale for one day only.",
              "Week three, the rookie leaderboard heats up, so celebrate newcomers by name.",
              "Week four, race finishers get their Medal Detector renewal."],
        close="On your marks. Get set. Sell."),
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
        open=("November is Black Friday, plus Thank U, Next. This month starts with gratitude and ends with the best "
              "long-plan prices of the year. First we say thank you. Then we say, sincerely, have you seen this annual?"),
        plan=["Week one, appreciation week, with guest passes and hundred-class gifts.",
              "Week two, Secret Santa vouchers reach every office and group chat.",
              "Week three, members get the Black Friday dates first.",
              "Week four, four days of Black Friday, long plans only."],
        close="Grateful, gorgeous, and fully booked. That's November."),
    12: dict(
        open=("December is Wrapped. The year is ending, everyone is reflecting, and every member has a story told in classes, "
              "favourite trainers and peak hours. This month we show them that story, and help them write next year's."),
        plan=["Week one, Wrapped cards go out to every member.",
              "Week two, twelve days of Shakemas begin on the thirteenth.",
              "Week three, gift vouchers and resolution pre-orders for the I'll start in January crowd.",
              "Week four, last-seen members get their invitation home."],
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
    "Couples Therapy (Cheaper Than the Real Thing)": dict(
        hook="First, Couples Therapy, cheaper than the real thing.",
        how="Members bring someone new. The member gets ten per cent off, the guest gets fifteen, and both get a duo private. "
            "The only fight is over who holds the plank longer."),
    "Situationship → Relationship": dict(
        hook="Next, Situationship to Relationship.",
        how="First-timers get fifteen per cent off their first month and a spot on the Stronger in 30 rookie track. "
            "Finish it, and they earn an extra week. Commitment never looked this good."),
    "Galentine's Gone Ghost": dict(
        hook="For lapsed members, Galentine's Gone Ghost.",
        how="Come back with your best friend. You get fifteen per cent off, she gets two classes on us, "
            "and if she joins, matching grip socks and bonus days."),
    "Proof of Work": dict(
        hook="And for the challengers, Proof of Work.",
        how="Did thirty classes in thirty days? Your renewal price shows it. Six months at twenty per cent off, "
            "or an annual with an extra private. Receipts, not resolutions."),
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
    "Cloud Nine Limited Edition": dict(
        hook="The headliner, Cloud Nine Limited Edition.",
        how="Nine months, nine freezes, plus one month on us. The memberships are numbered and capped, "
            "and when they're gone, they're gone."),
    "Plus One, Plus Nine": dict(
        hook="Next, Plus One, Plus Nine.",
        how="Bring a friend who joins and get nine bonus days. Bring three, and get a whole month. "
            "Presents for presents, because it's our birthday."),
    "Party Crasher Pass": dict(
        hook="For newcomers, the Party Crasher Pass.",
        how="Three classes, including the birthday party class, at a tiny price that comes off their first month if they join. "
            "Everyone's invited."),
    "Where Are They Now?": dict(
        hook="For old friends, Where Are They Now?",
        how="Fifteen per cent off to come back, a bonus class for every year they've known us, and a seat at the Throwback Reunion. "
            "A lot has changed. We got prettier."),
    "Spin Class (Literally)": dict(
        hook="Then, Spin Class, literally.",
        how="Renew in April for ten per cent off, then spin the Wheel of Nine. Every spin wins, "
            "and the odds are on the wall, because we're fit, not shady."),
    "Club Nine: The Founders' Table": dict(
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
        how="Fifteen per cent off to return, two extra freezes for flooded days, and a lane in The Amazing Race."),
    "Rain Check (Literally)": dict(
        hook="And for renewals, Rain Check, literally.",
        how="Renew in July for ten per cent off and three Rain Check tokens, with classes credited back on red-alert days. "
            "Monsoon happens. Late-cancel fees don't have to."),
    "Friends With Benefits (Strictly Fitness)": dict(
        hook="First, Friends With Benefits. Strictly fitness.",
        how="Bring a friend who's never been, and they get two classes on us. If they join, "
            "you both get race tees, and you get bonus days and double points."),
    "Rookie Mistake (The Only Good One)": dict(
        hook="For newcomers, Rookie Mistake, the only good one.",
        how="Two weeks unlimited at an intro price, plus a spot on the rookie leaderboard. "
            "The only rookie mistake is not starting."),
    "Medal Detector": dict(
        hook="For race finishers, the Medal Detector.",
        how="Finish the race and your renewal finds gold. Six months at twenty per cent off plus a private, "
            "or three months at fifteen per cent off plus bonus days."),
    "At the Stroke of the Midnight Hour": dict(
        hook="And on Independence Day, At the Stroke of the Midnight Hour.",
        how="Annual memberships at twenty-five per cent off, for the fifteenth of August only, with a strictly limited count. "
            "When the world sleeps, our members renew."),
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
    "Thank U, Next (Year)": dict(
        hook="First, Thank U, Next Year.",
        how="Appreciation week. A guest pass to share, a members-only night, and a gift for anyone who's hit a hundred classes. "
            "No catch. Just gratitude, and glutes."),
    "Pop-Up, Don't Drop Out": dict(
        hook="For pop-up trialists, Pop-Up, Don't Drop Out.",
        how="Buy a pack within seventy-two hours of the trial for fifteen per cent off, fifteen extra days, and a class to bring a friend."),
    "Secret Santa Squats": dict(
        hook="For gifting, Secret Santa Squats.",
        how="Two classes and grip socks, sized for a Secret Santa budget. If the recipient loves it, half comes off their first month."),
    "Black Friday, Strong Monday, Sore Tuesday": dict(
        hook="And the big one, Black Friday, Strong Monday, Sore Tuesday.",
        how="Four days of the year's best long-plan prices, plus the last Club Nine seats. "
            "No one-month discounts. We're not that kind of studio."),
    "Resolution Pre-Order (Ships 1 Jan)": dict(
        hook="First, the Resolution Pre-Order. Ships first of January.",
        how="Buy now, start between the first and tenth of January, and a coach checks in during week one so it actually sticks."),
    "Last Seen: 2026 (We Noticed)": dict(
        hook="For long-lapsed members, Last Seen, 2026. We noticed.",
        how="Fifteen per cent off, a free comeback class, and a spot on the Stronger in 30 comeback track, before the new year."),
    "Wrapped: Your Top Artist Was Your Trainer": dict(
        hook="Then, Wrapped. Your top artist was your trainer.",
        how="Every member gets their year in classes, trainers and peak hours, and next year's plan, priced for how they actually train."),
    "12 Days of Shakemas": dict(
        hook="And the finale, Twelve Days of Shakemas.",
        how="A new published deal every day from the thirteenth to the twenty-fourth. No hidden prizes, no tricks. "
            "Day twelve is the big one."),
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
    2: [None, "Couples Therapy (Cheaper Than the Real Thing)", None, "Proof of Work"],
    3: ["Lift Like a Girl", "Bura Na Mano, Renewal Hai", "Monogamy Is Overrated", None],
    4: ["Cloud Nine Limited Edition", "Party Crasher Pass", "Spin Class (Literally)", "Where Are They Now?"],
    5: ["Mom Said Get Off the Couch", "Mom-entum", "Don't Ghost Us After the Party",
        "Group Project (Finally, Everyone Pulls Their Weight)"],
    6: ["Private Practice", "Happy Hour (Zero Hangover, All Glutes)", "Auto-Reply: Out of Office, Still Squatting", None],
    7: ["Kitty Party, But Make It Cardio", "Gone With the Wind, Back With the Rain", "Rain Check (Literally)", None],
    8: ["Friends With Benefits (Strictly Fitness)", "At the Stroke of the Midnight Hour",
        "Rookie Mistake (The Only Good One)", "Medal Detector"],
    9: ["Glow-Up or Give Back", "We Need to Talk", "New Phone, Who Dis?", "Lock It Before the Laddoos"],
    10: ["From Phuljhadi to Anaar", "Diwali Gifting, Minus the Dry-Fruit Box", "Gold Rush (Dhanteras Edition)",
         "Diwali Cleaning: Found Your Old Grip Socks?"],
    11: ["Thank U, Next (Year)", "Secret Santa Squats", "Black Friday, Strong Monday, Sore Tuesday",
         "Black Friday, Strong Monday, Sore Tuesday"],
    12: ["Wrapped: Your Top Artist Was Your Trainer", "12 Days of Shakemas", "Secret Santa Squats",
         "Last Seen: 2026 (We Noticed)"],
}
PLAN_FALLBACK = [
    "Week one, every offer goes live and the team knows them by heart.",
    "Week two, check sell-through every Monday and follow up every trial within a day.",
    "Week three, a mid-month check against the target.",
    "Week four, close the month, tag every redemption, and brief next month.",
]
