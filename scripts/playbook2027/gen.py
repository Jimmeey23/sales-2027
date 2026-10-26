import json
M = json.load(open('model.json')); R = M['R']; LV = json.load(open('levers.json'))
U = {k[0]: k[2] for k in M['usageRenewal']}

def L(v, d=1): return f"₹{v/1e5:,.{d}f}L"
def P(v, d=0): return '—' if v is None else f"{v:.{d}f}%"
def I(v): return f"{v:,.0f}"
def ch(r, name): return next((c for c in r['leads']['channels'] if c[0] == name), [name, 0, 0, 0])
def slot(r, k): return dict(r['capacity']['slots']).get(k)
def fmt(r, k): return dict(r['capacity']['formats']).get(k)

PRICES = {
    'Mumbai': dict(m1=19275, p12=18750, p8=12500, p4=6750, single=1850, intro='Newcomers 2-for-1 ₹1,850', m3=55100, annual=209000, private=5000),
    'Bengaluru': dict(m1=13900, p12=12500, p8=8300, p4=4450, single=1350, intro='Intro Pack ₹675 / 2-for-1 ₹1,350', m3=40200, annual=148800, private=3925),
}
MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
EVENTS = ['New Year reset', "Valentine's & Galentine's", "International Women's Day (8 Mar)", 'P57 Anniversary month',
          "Mother's Day (9 May)", 'International Yoga Day (21 Jun) & Father\'s Day', 'Monsoon season', 'Monsoon season',
          'Monsoon close-out', 'Diwali & World Mental Health Day', 'Black Friday (26 Nov)', 'Year-end & holiday gifting']


DECAY={'Kemps Corner':'Return rate falls from 50% (60–120 days away) to 31% (180–365 days).','Bandra':'Return rate falls from 30% (60–120 days away) to 12% (180–365 days).','Kenkere House':'Return rate falls from 25% (60–120 days away) to 14–19% after 120 days.'}

def common(Lname, r, lv, city):
    pr = PRICES[city]; nc = r['newClients']; ds = r['discount']; d = r['dormant']; wb = r['winback']
    web = ch(r, 'Website & online'); ref = ch(r, 'Referrals'); calls = ch(r, 'Calls & WhatsApp'); host = ch(r, 'Hosted & walk-in')
    ent = {e[0]: e for e in r['entryProducts']}
    m1 = next((e for e in r['entryProducts'] if '1 Month Unlimited' in e[0]), None)
    low = min((e for e in r['entryProducts'] if e[2] < 2500), key=lambda e: e[3], default=None)
    offers = []
    popup = Lname == 'Pop-up'
    if not popup: offers.append(dict(
        name='Fast-Track 35', tag='Conversion', months='All year · peaks Jan, Apr, Jul, Sep',
        audience='Anyone within 7 days of their first class',
        mechanic=f"Buy a 1-Month Unlimited (₹{pr['m1']:,} list) within 7 days of the first class and it runs 35 days instead of 30, plus one guest pass. Replaces — never stacks with — the 15% newcomer perk; the client chooses one.",
        economics=f"10 extra days ≈ ₹{pr['m1']*10/30:,.0f} of perceived value vs ₹{pr['m1']*0.15:,.0f} for 15% off, at near-zero marginal cost while classes run at {r['capacity']['overall']['fill']:.0f}% fill. Cash price stays at list.",
        logic=(f"Entry product decides lifetime value: clients whose first purchase is 1-Month Unlimited spend {L(m1[3])[:-1].replace('₹','₹')}" if False else
               f"Clients whose first purchase is 1-Month Unlimited spend ₹{m1[3]:,.0f} in 180 days" if m1 else "Unlimited entrants are the highest-value cohort")
              + (f" vs ₹{low[3]:,.0f} for {low[0]} entrants." if low and m1 else '.') + f" Median trial-to-purchase gap is ~7 days, so the window matches real behaviour.",
        kpi=f"Share of new buyers entering on Unlimited/8+ packs; non-hosted conversion {P(nc['convNonHosted'],1)} → {P(nc['convH1_2025'] or nc['convH1_2026'],1)}",
        lever='conversion'))
    offers.append(dict(
        name='Second Class in 7', tag='Conversion', months='Always-on',
        audience='Every trial / first-visit client, booked before they leave the studio',
        mechanic='Front desk books the 2nd class at checkout (morning slot preferred). If they attend it within 7 days, their trial fee is credited against any pack or membership bought that week.',
        economics=f"Credit costs only the trial fee ({pr['intro']}) and only when a paid purchase follows.",
        logic=f"Clients who return for a 2nd class convert at {P(nc['convWithSecond'])}; those who don't, {P(nc['convNoSecond'])}. Only {P(nc['secondVisitShare'])} come back today. Buyers naturally return, so the gap overstates cause and effect — but no 2nd visit almost always means no sale.",
        kpi=f"2nd-visit rate {P(nc['secondVisitShare'])} → 55%", lever='conversion'))
    offers.append(dict(
        name='Bring-One Bonus', tag='Acquisition', months='All year · amplified Feb, May, Oct',
        audience='Active members (bonus paid only when the friend buys)',
        mechanic='Friend gets a complimentary first class + Fast-Track eligibility. Referrer earns 3 bonus classes (or 7 extra days on Unlimited) only when the friend buys a pack/membership. 5 paid referrals in a year = one free month.',
        economics=f"Reward ≈ ₹{pr['single']*3:,} list value per converted member, paid in capacity, vs a first-year value of ₹{r['firstYearValue']:,.0f}.",
        logic=f"Referral leads convert at {P(ref[3],1)} vs {P(web[3],1)} for online leads ({ref[3]/max(web[3],0.1):.1f}×) yet are only {ref[1]/r['leads']['ttm']*100:.0f}% of the {I(r['leads']['ttm'])} leads in the last 12 months.",
        kpi=f"Referral leads {I(ref[1])} → {I(ref[1]*1.5)}/yr", lever='referral'))
    if wb['avgReturnValue']:
        offers.append(dict(
            name='Comeback Fortnight', tag='Win-back', months='Mar, May, Jun, Nov (soft months) + monthly 60-day trigger',
            audience=f"Dormant 60–365 days: {d['d60_365']} clients now ({d['loyal60_365']} with 3+ past purchases)",
            mechanic='Tier 1 (3+ purchases): favourite trainer calls, complimentary class, then 1-Month Unlimited with 14 extra days. Tier 2 (1–2 purchases): WhatsApp sequence + 15% lapsed perk on a 4/8-pack. Offer expires in 10 days.',
            economics=f"Extra days instead of price cuts; loyal tier's median lifetime spend is ₹{d['loyalLtvMedian']:,.0f}.",
            logic=f"Historically {P(wb['rateLoyal'])} of loyal and {P(wb['rateLight'])} of light dormant clients returned within a year, spending ₹{wb['avgReturnValue']:,.0f} on average. " + DECAY.get(Lname, '') + " So the trigger fires at day 60.",
            kpi=f"Win-backs from the dormant pool +{round(d['loyal60_365']*0.1+(d['d60_365']-d['loyal60_365'])*0.05)}/yr above trend", lever='winback'))
    ap = r['april']
    if ap['repDisc'] is not None and ap['repFull'] is not None:
        offers.append(dict(
            name='Anniversary Bonus Bank', tag='Renewal', months='April (pre-sale last week of March)',
            audience='All clients; long plans get the biggest bonus',
            mechanic='No percentage codes. Every April purchase earns bonus time scaled to commitment: 1-Month +7 days, 8/12-pack +2 classes, 3-Month +3 weeks, 6-Month +1 month, Annual +2 months and 2 privates. Plus a "Renew-by" price lock for the next renewal.',
            economics=f"April 2026 effective discount was {P(ap['dr2026'],1)} (2025: {P(ap['dr2025'],1)}). Bonus time protects cash price; cost is unsold capacity.",
            logic=f"April 2026 code buyers of 1-month/pack products repurchased within 150 days at {P(ap['repDisc'])} vs {P(ap['repFull'])} for full-price buyers. " + (f"April revenue was {L(ap['rev2026'])} but May fell to {L(ap['may2026'])} — discounts pulled demand forward without keeping it." if (ap['dr2026'] or 0) > 15 else f"Even at a low {ap['dr2026']:.0f}% April discount the gap holds (small sample: {ap['nDisc']} vs {ap['nFull']} buyers)."),
            kpi='April effective discount ≤ 12%; May–Jun repurchase of April buyers ≥ 65%', lever='discount'))
    if not popup: offers.append(dict(
        name='Habit 8', tag='Retention', months='Always-on for new members; challenge push in Jan & Jul',
        audience='New members in their first 30 days',
        mechanic='Attend 8 classes in your first 30 days → one complimentary private (form check) or recovery session. Day-10 and Day-20 nudges if under pace.',
        economics=f"One private (₹{pr['private']:,} list) awarded only to the members most likely to renew.",
        logic=f"Unlimited members averaging ≤4 classes a month renew {P(U['≤4 / month'])}; at 5–8 it is {P(U['5–8 / month'])}, at 9–12 {P(U['9–12 / month'])}. {P(r['frequency']['lightShare'])} of monthly active clients here visit ≤2 times.",
        kpi='New members hitting 8 classes in 30 days ≥ 45%', lever='usage'))
    return offers


def scorecard(r, lvx):
    nc = r['newClients']; ds = r['discount']; web = ch(r, 'Website & online'); ref = ch(r, 'Referrals'); cap = r['capacity']['overall']
    tgt_conv = nc['convH1_2025'] or nc['convH1_2026']
    best = r['leads']['bestWebTrialRate']; tt = web[2] + max(best - web[2], 6) * 0.5 if best - web[2] > 1 else web[2] + 3
    rows = [
        ['Non-hosted trial → member', P(nc['convNonHosted'], 1), P(tgt_conv, 1), 'Return to the studio\'s own H1-2025 level' if nc['convH1_2025'] else 'Hold the H1-2026 level all year'],
        ['2nd class within 7 days', P(nc['secondVisitShare']), '55%', 'Booked at checkout of the first class'],
        ['Online lead → trial', P(web[2], 1), P(tt, 1), 'First reply inside 15 minutes, 2 slot options'],
        ['Referral leads / year', I(ref[1]), I(ref[1] * 1.5), 'Bring-One Bonus, paid on conversion'],
        ['Effective discount rate', P(ds['ttm'], 1), P(max(ds['y2025'] or 8, 8), 1) if ds['ttm'] > max(ds['y2025'] or 8, 8) + 1 else f"≤ {P(ds['ttm'],1)}", 'Value-adds replace % codes'],
        ['Class fill rate', P(cap['fill']), P(min(cap['fill'] + 6, 65)), 'Off-peak steering + timetable pruning'],
        ['Late-cancel rate', P(cap['lateCancel'], 1), P(min(cap['lateCancel'], 12) if cap['lateCancel'] > 13 else cap['lateCancel'], 1), 'Show-up policy' if cap['lateCancel'] > 13 else 'Hold'],
    ]
    return rows


def build(Lname, city, headline, diag, extra_offers, months, rhythm):
    r = R[Lname]; lv = LV[Lname]
    nc = r['newClients']; strm = r['streams']; tot = sum(strm.values())
    offers = common(Lname, r, lv, city) + extra_offers
    newShare = strm['new'] / tot
    avgFirst = strm['new'] / max(r['newBuyers'], 1)
    funnel = dict(newShare=newShare, avgFirstPurchase=avgFirst,
                  visitsPerBuyer=nc['firstVisitsTtm'] / max(r['newBuyers'], 1),
                  leadsPerVisit=r['leads']['ttm'] / max(nc['firstVisitsTtm'], 1),
                  renewalShare=strm['renewal'] / tot, winbackShare=(strm['winback']) / tot,
                  convNow=nc['convNonHosted'], convTarget=max(nc['convNonHosted'], nc['convH1_2025'] or nc['convH1_2026'] or nc['convNonHosted']))
    rev = r['revenue']; ds = r['discount']; cap = r['capacity']['overall']
    snapshot = [
        ['TTM revenue', L(rev['ttm']), (f"{rev['yoy']:+.0f}% vs prior 12 months" if rev['yoy'] is not None else 'first full year'), (rev['yoy'] or 0) >= 0],
        ['2026 forecast', L(rev['forecast2026']), 'Jan–Sep actual + Q4 at 2026 run-rate', True],
        ['Paying clients (TTM)', I(r['clients']), f"₹{r['revPerClient']:,.0f} per client · ATV ₹{r['atv']:,.0f}", True],
        ['New-client revenue', P(strm['new'] / tot * 100), f"renewal {strm['renewal']/tot*100:.0f}% · return {strm['return']/tot*100:.0f}% · win-back {strm['winback']/tot*100:.0f}%", True],
        ['Trial conversion', P(nc['convNonHosted'], 1), f"non-hosted · hosted {P(nc['convHosted'],1)}", nc['convNonHosted'] >= (nc['convH1_2025'] or 0)],
        ['Effective discount', P(ds['ttm'], 1), f"2025: {P(ds['y2025'],1)}", ds['ttm'] <= (ds['y2025'] or 99) + 1],
        ['Class fill', P(cap['fill']), f"{cap['avg']:.1f} per class · late-cancel {P(cap['lateCancel'],1)}", cap['fill'] >= 45],
        ['Dormant 60–365 days', I(r['dormant']['d60_365']), f"{r['dormant']['loyal60_365']} with 3+ past purchases", False],
    ]
    return dict(
        name=Lname, city=city, headline=headline, snapshot=snapshot, diagnosis=diag,
        build=dict(forecast2026=lv['forecast2026'], momentum=lv['momentum'], baseline=lv['baseline'],
                   levers=[dict(id=x['id'], name=x['name'], value=round(x['value']), math=x['math'], why=x['why']) for x in lv['levers']],
                   leverTotal=lv['leverTotal'], haircut=lv['haircut'], projection=lv['projection'], appTargetAtBuild=lv['appTarget']),
        offers=offers, months=months, rhythm=rhythm, scorecard=scorecard(r, lv), funnel=funnel,
        channels=[[c[0], c[1], round(c[2], 1), round(c[3], 1)] for c in r['leads']['channels']],
        slots=[[k, round(v['fill']), round(v['rps']), v['sessions']] for k, v in r['capacity']['slots']],
        monthly=r['monthly'], seasonality=[round(x, 2) for x in r['seasonality']],
        entry=[[e[0], e[1], round(e[2]), round(e[3]), round(e[4])] for e in r['entryProducts']])


def mrow(i, theme, focus, offers, actions, why):
    return dict(month=MONTHS[i], event=EVENTS[i], theme=theme, focus=focus, offers=offers, actions=actions, why=why)


# ---------------- KEMPS CORNER ----------------
r = R['Kemps Corner']; s = r['seasonality']; nc = r['newClients']; ds = r['discount']; ap = r['april']; sl = fmt(r, 'Strength Lab')
kemps = build('Kemps Corner', 'Mumbai',
    f"Fastest-growing studio ({r['revenue']['yoy']:+.0f}% TTM), but growth is being bought: effective discount doubled to {ds['ttm']:.1f}% and trial conversion slipped from {nc['convH1_2025']:.0f}% to {nc['convH1_2026']:.0f}%. 2027 is about protecting price and converting the demand it already has.",
    [
        dict(title='Discounts doubled, and discounted buyers leave', stat=f"{ds['ttm']:.1f}%", detail=f"Effective discount went from {ds['y2025']:.1f}% (2025) to {ds['ttm']:.1f}% (TTM) — {L(ds['valueTtm'])} given away. Discounted 1-month/pack buyers repurchase {ds['repurchaseDiscounted']:.0f}% vs {ds['repurchaseFull']:.0f}% at full price.", implication='Replace % codes with bonus time; keep cash price at list.'),
        dict(title='April was a pull-forward, not a gain', stat=f"{ap['repDisc']:.0f}% vs {ap['repFull']:.0f}%", detail=f"April 2026 hit {L(ap['rev2026'])} at a {ap['dr2026']:.0f}% effective discount; code buyers repurchased within 150 days at {ap['repDisc']:.0f}% vs {ap['repFull']:.0f}% for full-price buyers. May still ran a 29% effective discount.", implication='Anniversary Bonus Bank instead of codes; no discount spill into May.'),
        dict(title='Conversion is leaking at the 2nd visit', stat=f"{nc['secondVisitShare']:.0f}%", detail=f"Only {nc['secondVisitShare']:.0f}% of non-hosted first-timers book a 2nd class; those who do convert at {nc['convWithSecond']:.0f}%. Trainer conversion ranges {nc['trainerSpread'][0]:.0f}%–{nc['trainerSpread'][1]:.0f}%.", implication='Second Class in 7 at checkout; pair trials with the top-converting trainers.'),
        dict(title='Referrals and calls convert 4× online', stat=f"{ch(r,'Referrals')[3]:.0f}%", detail=f"Referral leads convert {ch(r,'Referrals')[3]:.0f}% and calls/WhatsApp {ch(r,'Calls & WhatsApp')[3]:.0f}%, vs {ch(r,'Website & online')[3]:.0f}% for online leads and {ch(r,'Hosted & walk-in')[3]:.0f}% for hosted classes ({ch(r,'Hosted & walk-in')[1]} leads).", implication='Shift effort from hosted volume to referral and speed-to-lead.'),
        dict(title='Strength Lab is full; Barre has room', stat=f"{sl['fill']:.0f}% fill", detail=f"Strength Lab runs at {sl['fill']:.0f}% fill with {sl['empty']:.1f}% empty classes; Barre 57 at {fmt(r,'Barre 57')['fill']:.0f}%, weekend evenings {slot(r,'Weekend · Evening (4–7)')[ 'fill']:.0f}%.", implication='Add Strength Lab sessions; use Barre off-peak capacity for bonus-time offers.'),
        dict(title='A ₹52.6L renewal book lands in 2027', stat='36 plans', detail='36 annual/6-month plans bought since Oct-2025 expire in 2027 (7 in April, 5 in January, 4 each in February and September). Historically only about a third of annual holders bought again around expiry.', implication='Long-plan renewal desk starting 60 days before each expiry.'),
    ],
    [
        dict(name='Strength Lab Plus', tag='Capacity', months='From Feb (after timetable change)', audience='Strength Lab regulars and waitlisted clients',
             mechanic='Add 4 Strength Lab sessions a week in the weekday 7–9am and 7pm+ bands; launch a Strength Lab + Barre 1-Month Unlimited at the standard ₹19,275 so cross-training fills Barre off-peak.',
             economics=f"Each added session earns about ₹{sl['rps']:,.0f} at current yield; 4/week ≈ {L(4*52*sl['rps'])} a year at full ramp.",
             logic=f"Strength Lab fill {sl['fill']:.0f}% vs Barre {fmt(r,'Barre 57')['fill']:.0f}% and powerCycle {fmt(r,'powerCycle')['fill']:.0f}% (Apr–Sep 2026).", kpi='Strength Lab fill stays ≥ 70% after adding sessions', lever='capacity'),
        dict(name='Loyalty Lock', tag='Renewal', months='60 days before every annual/6-month expiry', audience='36 long-plan holders expiring in 2027',
             mechanic='Trainer check-in at day −60; renew before expiry and keep 2026 price plus one extra month (annual) or two weeks (6-month). Step-down path to 3-Month Unlimited offered before they lapse.',
             economics='Price held, not cut; extra time costs off-peak capacity only.', logic='Annual holders from mid-2024 to Sep-2025: ~34% bought anything near expiry and ~10% re-committed long. The book expiring in 2027 is ₹52.6L.', kpi='Long-plan renewal ≥ 55% (any plan), ≥ 30% long', lever='annual'),
    ],
    [
        mrow(0, 'Resolution, made real', 'Acquisition + Habit 8 challenge', ['Fast-Track 35', 'Habit 8'], ['Run Habit 8 as a January challenge for all new members', 'Book every trial into a weekday morning slot (best conversion)'], f"Seasonality index {s[0]:.2f}; January trials convert fastest when booked into mornings ({nc['bySlot'][-1][2]:.0f}% conversion)."),
        mrow(1, 'Bring your person', 'Referral month', ['Bring-One Bonus', 'Second Class in 7'], ['Double referral reward for Feb (6 classes)', 'Galentine\'s duo class Saturday'], f"Referrals convert {ch(r,'Referrals')[3]:.0f}% — Feb ({s[1]:.2f}) needs low-cost acquisition."),
        mrow(2, 'Strong is the new standard', 'Win-back + pre-load April', ['Comeback Fortnight', 'Loyalty Lock'], ['Call loyal dormant clients (Tier 1)', 'Anniversary pre-sale list built by 25 Mar'], f"Softest month ({s[2]:.2f}); dormant pool is {r['dormant']['d60_365']} clients."),
        mrow(3, 'Anniversary', 'Peak revenue — long plans and renewals', ['Anniversary Bonus Bank', 'Loyalty Lock'], ['No % codes; bonus time scaled to commitment', '7 annual plans expire this month — renew before the sale'], f"April ran {L(ap['rev2026'])} in 2026 but at {ap['dr2026']:.0f}% discount; code buyers repurchased {ap['repDisc']:.0f}% vs {ap['repFull']:.0f}%."),
        mrow(4, 'For every mother', 'Protect April buyers', ['Habit 8', 'Bring-One Bonus'], ['Day-20 usage nudge for every April buyer', 'Mother–daughter pass weekend'], f"May fell to {L(ap['may2026'])} after April; the job is renewal of April cohorts ({s[4]:.2f})."),
        mrow(5, 'Breathe, stretch, recover', 'Retention + win-back', ['Comeback Fortnight', 'Second Class in 7'], ['Yoga Day mobility class open to lapsed clients', 'Summer travel freeze instead of cancellations'], f"Soft month ({s[5]:.2f}); win-back has the best return per call."),
        mrow(6, 'Monsoon Strong', 'Habit + capacity', ['Habit 8', 'Strength Lab Plus'], ['Monsoon streak board (12 classes in July)', 'Indoor-only messaging; no rain excuses'], 'Members at 9+ classes/month renew ~87%; monsoon is when frequency drops.'),
        mrow(7, 'Monsoon Strong — long-plan month', 'Annual and 6-month drive (value-add)', ['Loyalty Lock', 'Anniversary Bonus Bank (long-plan edition)'], ['Annual buyers get 2 months + privates, not 20% off', 'Personal invitations to top-10% clients'], f"August is the second-biggest month ({s[7]:.2f}) — Aug-2025 ran ₹44.8L, of which ₹25L was annual/6-month plans and ₹10.9L came through a single 20% code."),
        mrow(8, 'Monsoon finish line', 'Conversion', ['Fast-Track 35', 'Second Class in 7'], ['Trial pairing with top-converting trainers', '4 annual plans expire — renewal desk'], f"Seasonality {s[8]:.2f}; conversion work compounds into Q4."),
        mrow(9, 'Light & balance', 'Gifting + mental-health angle', ['Bring-One Bonus', 'Gift cards (no discount)'], ['Diwali gift cards for clients to buy for friends', 'World Mental Health Day community class'], f"Oct is above average ({s[9]:.2f}); gift cards bring referred clients at full price."),
        mrow(10, 'Black Friday — bonus, not discount', 'Win-back + pack upsell', ['Comeback Fortnight', 'Fast-Track 35'], ['72-hour bonus-classes window on 12-packs', 'Tier-2 dormant WhatsApp sequence'], f"Soft month ({s[10]:.2f}); bonus-class windows keep price intact."),
        mrow(11, 'Finish strong', 'Renewals + January pre-sale', ['Loyalty Lock', 'Habit 8'], ['Pre-sell January memberships to December trialists', 'Holiday freeze option instead of lapses'], f"December index {s[11]:.2f}; January pre-sales carry into Q1."),
    ],
    [
        ['Every lead, 15 minutes', 'Online leads get a WhatsApp reply with two morning slot options within 15 minutes, 7am–9pm. Calls/WhatsApp leads book trials at 72%, online at 25%.'],
        ['Checkout = second booking', 'No trial client leaves without a second class booked inside 7 days. Front desk scorecard tracks this daily.'],
        ['Trainer conversion huddle', f"Monthly review of trial conversion by trainer (range {nc['trainerSpread'][0]:.0f}%–{nc['trainerSpread'][1]:.0f}%). Top-converting trainers take Saturday trial slots."],
        ['Discount gate', 'Any code above 10% needs head-of-sales approval and a named reason; value-adds are the default currency.'],
        ['Day-60 dormant trigger', 'Every client with no purchase for 60 days enters the Comeback sequence automatically; loyal tier gets a trainer call within a week.'],
        ['Renewal desk', 'Long-plan expiries reviewed every Monday for the next 60 days; check-ins logged before the offer is made.'],
    ])

# ---------------- BANDRA ----------------
r = R['Bandra']; s = r['seasonality']; nc = r['newClients']; ds = r['discount']; ap = r['april']
bandra = build('Bandra', 'Mumbai',
    f"The only main studio going backwards ({r['revenue']['yoy']:+.0f}% TTM). Lead volume fell {(1-r['leads']['ttm']/r['leads']['prevTtm'])*100:.0f}% and conversion dropped from {nc['convH1_2025']:.0f}% to {nc['convH1_2026']:.0f}%; fixing conversion and renewal is worth more than buying more leads.",
    [
        dict(title='Conversion is the main problem', stat=f"{nc['convNonHosted']:.0f}%", detail=f"Non-hosted trial conversion is {nc['convNonHosted']:.1f}% (H1-2025: {nc['convH1_2025']:.1f}%). Weekend first visits convert {nc['byDayType'][1][2]:.0f}% vs weekday {nc['byDayType'][0][2]:.0f}%. Only {nc['secondVisitShare']:.0f}% book a 2nd class.", implication='Second Class in 7, weekday-first trial booking, trainer pairing.'),
        dict(title='Fewer leads, weaker channels', stat=f"{I(r['leads']['ttm'])} leads", detail=f"Leads fell from {I(r['leads']['prevTtm'])} to {I(r['leads']['ttm'])}. Online is {ch(r,'Website & online')[1]/r['leads']['ttm']*100:.0f}% of volume but converts {ch(r,'Website & online')[3]:.0f}%; referrals {ch(r,'Referrals')[3]:.0f}%, calls/WhatsApp {ch(r,'Calls & WhatsApp')[3]:.0f}%.", implication='Referral engine + call-first follow-up of online leads.'),
        dict(title='2-for-1 brings volume, not value', stat=f"₹{next(e[3] for e in r['entryProducts'] if '2 For 1' in e[0]):,.0f}", detail=f"Newcomers 2-for-1 is the most common first purchase ({next(e[1] for e in r['entryProducts'] if '2 For 1' in e[0])} clients) but 180-day spend is ₹{next(e[3] for e in r['entryProducts'] if '2 For 1' in e[0]):,.0f} vs ₹{next(e[3] for e in r['entryProducts'] if '1 Month' in e[0]):,.0f} for 1-Month Unlimited entrants.", implication='Keep 2-for-1 as the door, but route every 2-for-1 buyer into Fast-Track 35.'),
        dict(title='Discounting crept up without growth', stat=f"{ds['ttm']:.1f}%", detail=f"Effective discount {ds['y2025']:.1f}% → {ds['ttm']:.1f}%; discounted 1-month/pack buyers repurchase {ds['repurchaseDiscounted']:.0f}% vs {ds['repurchaseFull']:.0f}%. ZAP10 alone ran on 204 sales.", implication='Retire blanket codes; value-adds only.'),
        dict(title='Early mornings and weekend evenings are thin', stat=f"{slot(r,'Weekday · Early (before 9)')['fill']:.0f}% fill", detail=f"Weekday before 9am runs at {slot(r,'Weekday · Early (before 9)')['fill']:.0f}% fill and weekend evenings {slot(r,'Weekend · Evening (4–7)')['fill']:.0f}%; weekend late mornings {slot(r,'Weekend · Late morning (9–12)')['fill']:.0f}%.", implication='Prune/merge thin slots; use them for bonus-time offers and privates.'),
        dict(title='No privates business', stat=L(dict(r['categories']).get('Privates', 0)), detail=f"Privates earned {L(dict(r['categories']).get('Privates', 0))} in 12 months vs ~6% of revenue at Kemps Corner. Thin early slots leave trainer time free.", implication='Launch a privates line from trainer downtime.'),
    ],
    [
        dict(name='Form Fix Duo', tag='Upsell', months='From Feb; push in May & Nov', audience='Pack and membership holders, especially new members',
             mechanic='2 private sessions at list (₹10,000) plus 2 bonus group classes, scheduled in under-filled early/weekend-evening trainer time. Upgrade path to the 10-private package (₹50,000).',
             economics='Uses trainer hours that currently run at 33–40% fill; 70 Duo sales ≈ ₹6L.', logic=f"Privates are {L(dict(r['categories']).get('Privates', 0))} TTM here; thin slots: weekday early {slot(r,'Weekday · Early (before 9)')['fill']:.0f}% and weekend evening {slot(r,'Weekend · Evening (4–7)')['fill']:.0f}% fill.", kpi='Privates ≥ 3% of revenue by Q4', lever='privates'),
        dict(name='Loyalty Lock', tag='Renewal', months='60 days before every annual/6-month expiry', audience='20 long-plan holders expiring in 2027',
             mechanic='Renew before expiry and keep 2026 price plus one extra month (annual) or two weeks (6-month); 3-Month step-down offered before lapse.',
             economics='Price held, not cut.', logic='Annual holders from 2024–25: about 25% bought anything around expiry, ~12% re-committed long. ₹27.9L of plans expire in 2027.', kpi='Long-plan renewal ≥ 50%', lever='annual'),
    ],
    [
        mrow(0, 'Resolution, made real', 'Conversion reset', ['Fast-Track 35', 'Second Class in 7'], ['New trial script + checkout booking rule live 1 Jan', '3 annual plans expire — renewal desk'], f"January is soft here ({s[0]:.2f}); conversion quality matters more than volume."),
        mrow(1, 'Bring your person', 'Referral month', ['Bring-One Bonus', 'Form Fix Duo'], ['Galentine\'s duo powerCycle ride', 'Launch privates line'], f"Referral leads convert {ch(r,'Referrals')[3]:.0f}% vs {ch(r,'Website & online')[3]:.0f}% online."),
        mrow(2, 'Strong is the new standard', 'Win-back + April pre-load', ['Comeback Fortnight'], ['Tier-1 dormant calls by favourite trainer', 'Anniversary waitlist'], f"Seasonality {s[2]:.2f}; {r['dormant']['d60_365']} clients dormant 60–365 days."),
        mrow(3, 'Anniversary', 'Peak — commitments', ['Anniversary Bonus Bank', 'Loyalty Lock'], ['Bonus time scaled to plan length', 'No discount spill-over into May'], f"Biggest month ({s[3]:.2f}); April 2026 ran at {ap['dr2026']:.0f}% discount."),
        mrow(4, 'For every mother', 'Keep April buyers', ['Habit 8', 'Form Fix Duo'], ['Day-20 usage nudge', 'Mother\'s Day duo privates'], f"May index {s[4]:.2f}; protect April cohort."),
        mrow(5, 'Breathe, stretch, recover', 'Retention', ['Comeback Fortnight', 'Habit 8'], ['Yoga Day open class for lapsed clients', 'Freeze-not-cancel for travel'], f"Seasonality {s[5]:.2f}."),
        mrow(6, 'Monsoon Strong', 'Acquisition (indoors wins)', ['Fast-Track 35', 'Bring-One Bonus'], ['Monsoon ride series on powerCycle', 'Online leads called within 15 min'], f"July is above average ({s[6]:.2f})."),
        mrow(7, 'Monsoon Strong — long plans', 'Annual & 6-month drive', ['Loyalty Lock', 'Anniversary Bonus Bank (long-plan edition)'], ['Annual = 2 months + privates, not a code', 'Top-10% client invitations'], f"Peak month ({s[7]:.2f}); Aug-2025's 7 annual sales (₹10.9L) all ran on one code."),
        mrow(8, 'Monsoon finish line', 'Conversion', ['Second Class in 7', 'Fast-Track 35'], ['Weekday-first trial booking', 'Trainer conversion huddle'], f"Seasonality {s[8]:.2f}."),
        mrow(9, 'Light & balance', 'Win-back (softest month)', ['Comeback Fortnight', 'Bring-One Bonus'], ['Diwali gift cards', 'Mental-health community class'], f"Softest month ({s[9]:.2f}) — lean on the dormant pool."),
        mrow(10, 'Black Friday — bonus, not discount', 'Pack upsell + privates', ['Form Fix Duo', 'Fast-Track 35'], ['72-hour bonus-classes window on 12-packs', 'Privates bundle for gifting'], f"Seasonality {s[10]:.2f}."),
        mrow(11, 'Finish strong', 'Renewals + January pre-sale', ['Loyalty Lock', 'Habit 8'], ['Pre-sell January memberships', 'Holiday freeze option'], f"December index {s[11]:.2f}."),
    ],
    [
        ['Call-first follow-up', f"Online leads ({ch(r,'Website & online')[1]} a year) get a call, not just a message — calls/WhatsApp leads convert {ch(r,'Calls & WhatsApp')[3]:.0f}%."],
        ['Weekday-first trials', f"Steer first visits to weekdays: weekday trials convert {nc['byDayType'][0][2]:.0f}% vs weekend {nc['byDayType'][1][2]:.0f}%."],
        ['Checkout = second booking', 'Second class booked before leaving; tracked daily.'],
        ['Code retirement', 'ZAP10-style blanket codes end 31 Dec; any code needs approval.'],
        ['Timetable review', 'Monthly: merge classes averaging under 4 attendees in thin bands; reallocate trainer time to privates.'],
        ['Day-60 dormant trigger', 'Automatic Comeback sequence; loyal tier gets a trainer call.'],
    ])

# ---------------- KENKERE ----------------
r = R['Kenkere House']; s = r['seasonality']; nc = r['newClients']; ds = r['discount']; ap = r['april']; cap = r['capacity']['overall']
web = ch(r, 'Website & online')
kenkere = build('Kenkere House', 'Bengaluru',
    f"Healthy growth ({r['revenue']['yoy']:+.0f}% TTM) and the lowest discount rate ({ds['ttm']:.1f}%), but {I(web[1])} online leads book trials at just {web[2]:.0f}%, hosted classes convert {nc['convHosted']:.0f}%, and a quarter of bookings are late-cancelled. The upside is in the funnel, not in price.",
    [
        dict(title='Online leads are being wasted', stat=f"{web[2]:.0f}%", detail=f"{I(web[1])} online leads ({web[1]/r['leads']['ttm']*100:.0f}% of volume) book a trial {web[2]:.1f}% of the time; calls/WhatsApp {ch(r,'Calls & WhatsApp')[2]:.0f}%. Once trialled, online leads convert ~{web[3]/web[2]*100:.0f}% — the quality is there.", implication='15-minute response + call-first; target 20% lead→trial.'),
        dict(title='Hosted classes inflate visits, not members', stat=f"{nc['convHosted']:.1f}%", detail=f"{nc['hostedTtm']} of {nc['firstVisitsTtm']} first visits ({nc['hostedTtm']/nc['firstVisitsTtm']*100:.0f}%) came through hosted classes, converting {nc['convHosted']:.1f}%. Saturday first visits convert ~10%.", implication='Every hosted class must end with a paid Starter Week offer; cut low-yield partners.'),
        dict(title='Late cancellations are 2× Mumbai', stat=f"{cap['lateCancel']:.0f}%", detail=f"{cap['lateCancel']:.1f}% of bookings are late-cancelled (Mumbai studios: 10–12%), blocking spots in the {slot(r,'Weekend · Late morning (9–12)')['fill']:.0f}%-full weekend late mornings.", implication='Show-up policy + streak reward.'),
        dict(title='Weekend mornings are full; evenings are not', stat=f"{slot(r,'Weekend · Late morning (9–12)')['fill']:.0f}% fill", detail=f"Weekend 9–12 runs at {slot(r,'Weekend · Late morning (9–12)')['fill']:.0f}% fill and ₹{slot(r,'Weekend · Late morning (9–12)')['rps']:,.0f}/class; weekend evenings {slot(r,'Weekend · Evening (4–7)')['fill']:.0f}%, weekday late mornings {slot(r,'Weekday · Late morning (9–12)')['fill']:.0f}%.", implication='Add a second weekend late-morning class; off-peak pack for thin bands.'),
        dict(title='Referrals are the best source', stat=f"{ch(r,'Referrals')[3]:.0f}%", detail=f"{ch(r,'Referrals')[1]} referral leads converted {ch(r,'Referrals')[3]:.0f}% — 4× online.", implication='Bring-One Bonus as the core acquisition offer.'),
        dict(title='Price is disciplined — keep it', stat=f"{ds['ttm']:.1f}%", detail=f"Effective discount is {ds['ttm']:.1f}% (2025: {ds['y2025']:.1f}%). Discounted buyers still repurchase less ({ds['repurchaseDiscounted']:.0f}% vs {ds['repurchaseFull']:.0f}%).", implication='No new % codes; value-adds only.'),
    ],
    [
        dict(name='Weekend Club', tag='Capacity', months='From Feb', audience='Weekend regulars and waitlisted clients',
             mechanic='Add a second Saturday and Sunday 9–12 class; weekend-only 8-class pack at the standard ₹8,300 with priority booking for the new slots.',
             economics=f"₹{slot(r,'Weekend · Late morning (9–12)')['rps']:,.0f} revenue per weekend late-morning class today; 2 extra a week ≈ {L(2*52*slot(r,'Weekend · Late morning (9–12)')['rps'])} at full ramp.",
             logic=f"Weekend 9–12 fill {slot(r,'Weekend · Late morning (9–12)')['fill']:.0f}% vs studio {cap['fill']:.0f}%.", kpi='New weekend slots ≥ 55% fill by June', lever='capacity'),
        dict(name='Show-Up Streak', tag='Operations', months='Live from January', audience='All members',
             mechanic='3 late cancels in 30 days pauses app booking for 7 days; 4 weeks with zero late cancels earns a guest pass. Waitlist auto-promotes up to 6 hours before class.',
             economics='Frees spots in full classes; the reward costs capacity only.', logic=f"Late-cancel rate {cap['lateCancel']:.1f}% vs 10–12% in Mumbai; worst in weekday early ({slot(r,'Weekday · Early (before 9)')['lateCancel']:.0f}%).", kpi='Late-cancel ≤ 15% by Q2, ≤ 12% by Q4', lever=None),
        dict(name='Hosted → Starter Week', tag='Conversion', months='Every hosted / outdoor / partner class', audience='Hosted-class attendees',
             mechanic='Attendees get a 72-hour link to the Newcomers 2-Week Unlimited (₹5,750 list) with Fast-Track 35 eligibility at the end of it. Partners are kept only if ≥ 8% of their attendees buy.',
             economics='Converts free footfall into paid trials at standard intro pricing.', logic=f"{nc['hostedTtm']} hosted first visits converted {nc['convHosted']:.1f}% vs {nc['convNonHosted']:.0f}% for regular trials.", kpi='Hosted conversion ≥ 8%', lever='conversion'),
    ],
    [
        mrow(0, 'Resolution, made real', 'Speed-to-lead launch', ['Fast-Track 35', 'Habit 8'], ['15-minute response rota goes live', 'Show-Up Streak starts'], f"January index {s[0]:.2f}; online leads peak after New Year."),
        mrow(1, 'Bring your person', 'Referral month', ['Bring-One Bonus', 'Weekend Club'], ['Galentine\'s duo class', 'Second weekend class launches'], f"Referral leads convert {ch(r,'Referrals')[3]:.0f}%."),
        mrow(2, 'Strong is the new standard', 'Win-back', ['Comeback Fortnight'], ['Women\'s Day open class for lapsed clients', 'Anniversary waitlist'], f"Soft month ({s[2]:.2f})."),
        mrow(3, 'Anniversary', 'Peak — commitments', ['Anniversary Bonus Bank', 'Weekend Club'], ['Bonus time scaled to commitment', 'No % codes'], f"April index {s[3]:.2f}; discount buyers repurchase {ds['repurchaseDiscounted']:.0f}% vs {ds['repurchaseFull']:.0f}%."),
        mrow(4, 'For every mother', 'Keep April buyers', ['Habit 8', 'Bring-One Bonus'], ['Day-20 usage nudges', 'Mother\'s Day duo'], f"Soft month ({s[4]:.2f})."),
        mrow(5, 'Breathe, stretch, recover', 'Acquisition', ['Fast-Track 35', 'Hosted → Starter Week'], ['Yoga Day hosted class with Starter Week link', 'Partner review: keep only ≥ 8% converters'], f"Seasonality {s[5]:.2f}."),
        mrow(6, 'Monsoon Strong', 'Acquisition peak', ['Fast-Track 35', 'Second Class in 7'], ['Rainy-day indoor messaging', 'Online leads called within 15 min'], f"Strong month ({s[6]:.2f})."),
        mrow(7, 'Monsoon Strong', 'Habit + retention', ['Habit 8', 'Show-Up Streak'], ['Monsoon streak board', 'Late-cancel review'], f"Seasonality {s[7]:.2f}."),
        mrow(8, 'Monsoon finish line', 'Peak — conversion & packs', ['Fast-Track 35', 'Weekend Club'], ['Trainer pairing for trials', 'Pack upsell at checkout'], f"Kenkere's biggest month ({s[8]:.2f})."),
        mrow(9, 'Light & balance', 'Win-back (softest month)', ['Comeback Fortnight', 'Bring-One Bonus'], ['Diwali gift cards', 'Mental-health community class'], f"Softest month ({s[9]:.2f})."),
        mrow(10, 'Black Friday — bonus, not discount', 'Pack upsell', ['Fast-Track 35', 'Habit 8'], ['72-hour bonus-classes window', 'Pre-sell December'], f"Strong month ({s[10]:.2f})."),
        mrow(11, 'Finish strong', 'Renewals + January pre-sale', ['Comeback Fortnight', 'Habit 8'], ['Pre-sell January', 'Holiday freeze instead of lapse'], f"Soft month ({s[11]:.2f})."),
    ],
    [
        ['15-minute response rota', f"Two associates own online leads 7am–9pm; target lead→trial {web[2]:.0f}% → 20%. Calls/WhatsApp leads already book {ch(r,'Calls & WhatsApp')[2]:.0f}%."],
        ['Hosted-class rule', 'Every hosted/partner class ends with the Starter Week link and a front-desk follow-up within 24 hours.'],
        ['Show-up policy', 'Late-cancel dashboard reviewed weekly; repeat offenders get a call before the pause applies.'],
        ['Checkout = second booking', 'Second class booked before leaving, ideally a weekday (weekday trials convert ~31% vs ~21% weekend).'],
        ['Day-60 dormant trigger', 'Automatic Comeback sequence; loyal tier gets a trainer call.'],
        ['No new % codes', 'Value-adds are the default; discount rate stays under 8%.'],
    ])

# ---------------- POP-UP ----------------
r = R['Pop-up']; s = r['seasonality']; nc = r['newClients']; cap = r['capacity']['overall']; web = ch(r, 'Website & online')
popup = build('Pop-up', 'Bengaluru',
    f"A ₹{r['revenue']['ttm']/1e5:.0f}L drop-in business: clients visit {r['frequency']['visitsPerMember']:.1f} times a month, classes average {cap['avg']:.1f} people at {cap['fill']:.0f}% fill, and almost all revenue is single credits. 2027 is about turning drop-ins into pack holders and running fewer, fuller classes.",
    [
        dict(title='Single credits dominate', stat=L(dict(r['categories']).get('Sessions/Single Classes', 0)), detail=f"Singles/credits are {dict(r['categories']).get('Sessions/Single Classes',0)/r['revenue']['ttm']*100:.0f}% of revenue; packs {L(dict(r['categories']).get('Class Packages',0))}. ATV is ₹{r['atv']:,.0f}.", implication='Credit-to-Pack upgrades after the 3rd credit.'),
        dict(title='Classes are too thin', stat=f"{cap['fill']:.0f}% fill", detail=f"{cap['avg']:.1f} attendees per class, {cap['empty']:.0f}% empty; weekday before 9am at {slot(r,'Weekday · Early (before 9)')['fill']:.0f}% fill vs weekend late morning {slot(r,'Weekend · Late morning (9–12)')['fill']:.0f}%.", implication='Cut weekday early slots; concentrate on weekend mornings and evenings.'),
        dict(title='Evenings convert best', stat=f"{nc['bySlot'][0][2]:.0f}%", detail=f"Evening first visits convert {nc['bySlot'][0][2]:.0f}% vs morning {nc['bySlot'][1][2]:.0f}%; weekday {nc['byDayType'][0][2]:.0f}% vs weekend {nc['byDayType'][1][2]:.0f}%.", implication='Book trials into weekday evenings.'),
        dict(title='Online leads rarely trial', stat=f"{web[2]:.0f}%", detail=f"{I(web[1])} online leads book a trial {web[2]:.1f}% of the time; calls/WhatsApp {ch(r,'Calls & WhatsApp')[2]:.0f}% and referrals {ch(r,'Referrals')[2]:.0f}% (converting {ch(r,'Referrals')[3]:.0f}%).", implication='Same 15-minute rota as Kenkere; referral push.'),
    ],
    [
        dict(name='Credit-to-Pack', tag='Upsell', months='Always-on', audience='Clients on their 3rd single credit in 60 days',
             mechanic='At the 3rd credit, offer the Copper + Cloves 8-Class Package (₹6,600) with the last two credits (₹900) credited. Plash: 4-class pack with the same credit-back.',
             economics='Moves a ₹450 transaction to a ₹5,700 net commitment; no discount on the pack price.', logic=f"Clients average {r['frequency']['visitsPerMember']:.1f} visits a month and {r['frequency']['lightShare']:.0f}% come ≤2 times. 76 clients bought 3+ credits in 12 months.", kpi='Pack share of revenue ≥ 35%', lever='packs'),
        dict(name='Evening Edit', tag='Capacity', months='From Jan', audience='Timetable',
             mechanic='Drop the thinnest weekday pre-9am classes, add one weekday evening class, and keep weekend 9–12 as the anchor. Trials booked into weekday evenings first.',
             economics='Fewer classes, more per class: aim for 5 per class instead of 3.', logic=f"Weekday early fill {slot(r,'Weekday · Early (before 9)')['fill']:.0f}%, {slot(r,'Weekday · Early (before 9)')['sessions']} classes in 6 months; evening trials convert {nc['bySlot'][0][2]:.0f}%.", kpi='Average attendance ≥ 5', lever=None),
        dict(name='Drop-in Comeback', tag='Win-back', months='Mar, Jun, Oct', audience=f"{r['dormant']['d60_365']} clients dormant 60–365 days",
             mechanic='WhatsApp: "your spot is saved" — one credit at ₹450 for the venue they last visited, with the Credit-to-Pack path the same week.',
             economics='Standard credit price; win-back is the step into a pack.', logic=f"{r['dormant']['d60_365']} pop-up clients have not booked in 60–365 days; most bought one credit.", kpi='12% of dormant pool returns', lever='winback'),
    ],
    [
        mrow(i, *row) for i, row in enumerate([
            ('Resolution, made real', 'Timetable reset', ['Evening Edit', 'Second Class in 7'], ['New timetable live', '15-minute lead rota shared with Kenkere'], f"Index {s[0]:.2f}."),
            ('Bring your person', 'Referral', ['Bring-One Bonus', 'Credit-to-Pack'], ['Galentine\'s duo class at Copper + Cloves'], f"Referrals convert {ch(r,'Referrals')[3]:.0f}%."),
            ('Strong is the new standard', 'Win-back', ['Drop-in Comeback'], ['Women\'s Day open class'], f"Index {s[2]:.2f}."),
            ('Anniversary', 'Packs', ['Credit-to-Pack', 'Bring-One Bonus'], ['Anniversary bonus class on every pack, no codes'], f"Index {s[3]:.2f} — pop-ups don't spike in April."),
            ('For every mother', 'Packs', ['Credit-to-Pack', 'Bring-One Bonus'], ['Mother\'s Day duo class'], f"Index {s[4]:.2f}."),
            ('Breathe, stretch, recover', 'Acquisition + win-back', ['Drop-in Comeback', 'Second Class in 7'], ['Yoga Day class at Plash'], f"Index {s[5]:.2f}."),
            ('Monsoon Strong', 'Acquisition', ['Second Class in 7', 'Bring-One Bonus'], ['Evening trial push'], f"Index {s[6]:.2f}."),
            ('Monsoon Strong', 'Packs', ['Credit-to-Pack'], ['Monsoon streak board'], f"Index {s[7]:.2f}."),
            ('Monsoon finish line', 'Peak — packs', ['Credit-to-Pack', 'Second Class in 7'], ['Pack upsell at every 3rd credit'], f"Best month ({s[8]:.2f})."),
            ('Light & balance', 'Win-back (softest month)', ['Drop-in Comeback'], ['Diwali gift credits'], f"Softest month ({s[9]:.2f})."),
            ('Black Friday — bonus, not discount', 'Packs', ['Credit-to-Pack', 'Bring-One Bonus'], ['72-hour bonus class on 10-packs'], f"Index {s[10]:.2f}."),
            ('Finish strong', 'January pre-sale', ['Credit-to-Pack'], ['Pre-sell January packs'], f"Index {s[11]:.2f}."),
        ])
    ],
    [
        ['15-minute response rota', 'Shared with Kenkere House; online lead→trial from 12% to 20%.'],
        ['Third-credit trigger', 'Booking system flags the 3rd credit in 60 days; front desk makes the Credit-to-Pack offer in person.'],
        ['Fewer, fuller classes', 'Any slot averaging under 3 people for 6 weeks is cut or moved to an evening.'],
        ['Venue scorecard', 'Monthly revenue, fill and conversion by venue (Copper + Cloves, Plash) to decide 2028 renewals.'],
    ])

out = dict(meta=dict(generated='26 Oct 2026', ttm='Oct 2025 – Sep 2026', capacityWindow='Apr – Sep 2026',
                     sources=['Sales – Raw (25.4k payments, Jul-2023 → 22-Oct-2026)', 'Leads (25.6k)', 'New clients / first visits (21.3k)', 'Lapsed & renewals (29.5k package lifecycles)', 'Sessions (26k classes)', 'Check-ins (152.8k)', 'Memberships price list (143 active products)'],
                     method=[f"Revenue = succeeded, non-voided payments incl. GST. TTM = Oct-2025 to Sep-2026.",
                             'Streams: first-ever purchase = new; repeat within 45 days = renewal; 46–120 days = return; >120 days = win-back.',
                             'Repurchase = another purchase on a later day within 120 days (150 for April cohort), restricted to 1-month/2-week unlimited and 4–12 class packs so long plans don\'t bias it.',
                             f"Lever values are in-year: new members realise {LV['Kemps Corner']['realisation']*100:.0f}% of first-year value inside the calendar year (measured on the Jul-2024–Sep-2025 cohort).",
                             'Baseline = 2026 forecast × (1 + half of 2026 YTD growth, capped −5% to +10%). Levers are summed then cut 15% for overlap.'],
                     usageRenewal=M['usageRenewal']),
           studios={'Kemps Corner': kemps, 'Bandra': bandra, 'Kenkere House': kenkere, 'Pop-up': popup})
json.dump(out, open('playbook2027.json', 'w'), ensure_ascii=False, default=float)
print('ok', len(json.dumps(out, ensure_ascii=False, default=float)))
