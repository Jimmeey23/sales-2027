// 2027 location sales playbooks — generated from the uploaded P57 exports (Sales, Leads, New clients,
// Lapsed/renewals, Sessions, Check-ins, Memberships). Regenerate with scripts/playbook2027 (see README there).
// All money is ₹ incl. GST. Do not hand-edit numbers; edit gen.py and regenerate. Headlines, diagnosis,
// offers, months, rhythm and scorecard text are from the 2027 plan of record (scripts/refresh-playbook-plan.ts).
import type { PlaybookData } from '../components/Playbook2027';

export const PLAYBOOK_2027: PlaybookData = {
  meta: {
    generated: '26 Oct 2026',
    ttm: 'Oct 2025 – Sep 2026',
    capacityWindow: 'Apr – Sep 2026',
    sources: [
      'Sales – Raw (25.4k payments, Jul-2023 → 22-Oct-2026)',
      'Leads (25.6k)',
      'New clients / first visits (21.3k)',
      'Lapsed & renewals (29.5k package lifecycles)',
      'Sessions (26k classes)',
      'Check-ins (152.8k)',
      'Memberships price list (143 active products)',
    ],
    method: [
      'Revenue = succeeded, non-voided payments incl. GST. TTM = Oct-2025 to Sep-2026.',
      'Streams: first-ever purchase = new; repeat within 45 days = renewal; 46–120 days = return; >120 days = win-back.',
      "Repurchase = another purchase on a later day within 120 days (150 for April cohort), restricted to 1-month/2-week unlimited and 4–12 class packs so long plans don't bias it.",
      'Lever values are in-year: new members realise 73% of first-year value inside the calendar year (measured on the Jul-2024–Sep-2025 cohort).',
      'Baseline = 2026 forecast × (1 + half of 2026 YTD growth, capped −5% to +10%). Levers are summed then cut 15% for overlap.',
    ],
    usageRenewal: [
      ['12+ / month', 529, 87.33],
      ['5–8 / month', 239, 77.41],
      ['9–12 / month', 258, 86.82],
      ['≤4 / month', 128, 57.03],
    ],
  },
  studios: {
    'Kemps Corner': {
      name: 'Kemps Corner',
      city: 'Mumbai',
      headline:
        '2027 plan of record: ₹420.0L target across twelve themed months; ₹264.4L is carried by named offers and the rest is full-price trade.',
      snapshot: [
        ['TTM revenue', '₹322.5L', '+21% vs prior 12 months', true],
        ['2027 target', '₹420.0L', '+30% on the last 12 months', true],
        ['Paying clients (TTM)', '1,132', '₹27,854 per client · ATV ₹9,669', true],
        ['New-client revenue', '15%', 'renewal 40% · return 24% · win-back 21%', true],
        ['Trial conversion', '33.1%', 'non-hosted · hosted 3.6%', false],
        ['Effective discount', '17.6%', '2025: 9.1%', false],
        ['Class fill', '47%', '6.6 per class · late-cancel 10.4%', true],
        ['Dormant 60–365 days', '846', '370 with 3+ past purchases', false],
      ],
      diagnosis: [
        {
          title: 'Renewals carry the year',
          stat: '55%',
          detail: 'Renewal plan ₹231.0L of ₹420.0L; 987 renewal purchases planned from 1,289 due.',
          implication:
            "Renewal offers: The Baker's Dozen, The 57-Hour Hangover Sale, Put a Ring On It, Monogamy Is Overrated, Bura Na Mano, Renewal Hai, Club Nine: The Founders’ Table, Spin Class (Literally), Moving In Together (The 9-Month Lease), The 9:09 Panic Attack, The Cloud Nine 90, Don't Ghost Us After the Party, Auto-Reply: Out of Office, Still Squatting, Happy Hour (Zero Hangover, All Glutes), Private Practice, Rain Check (Literally), Kitty Party, But Make It Cardio, Team Building Without the Trust Falls, Freedom to Pause (Not Quit), Price Ki Azaadi (Freedom From Price Hikes), Lock It Before the Laddoos, Gold Rush (Dhanteras Edition), From Phuljhadi to Anaar, Black Friday Blind Box (No Duds), 11.11: Treat Yourself, Not Your Ex, The Advent-ure Calendar (Opens in January), Boxing Day (Gloves Optional).",
        },
        {
          title: 'New clients',
          stat: '902',
          detail: 'New-client plan ₹100.8L: 6,572 leads → 3,352 trials → 902 new buyers.',
          implication:
            "Newcomer offers: Third Time's the Charm, Blind Date (No Catfishing), Love Bombing (The Healthy Kind), Lift Like a Girl, Party Crasher Pass, Plus One, Plus Nine, Mom Said Get Off the Couch, Group Project (Finally, Everyone Pulls Their Weight), Mom-entum, Shy Girl Starter Pack, No Strings Attached, Squad Goals, Squat Goals, Glow-Up or Give Back, Diwali Gifting, Minus the Dry-Fruit Box, Bride Squad, Assemble (Groom Can Come Too), Resolution Insurance (Claim Approved), The Gift They Won’t Regift.",
        },
        {
          title: 'Lapsed clients',
          stat: '440',
          detail: 'Reactivation plan ₹50.4L: 440 reactivated from 7,258 touches.',
          implication:
            "Lapsed offers: U Up? It's 2027, It’s Not You, It’s Your Schedule, Faking Your Own Death Didn’t Work, Gone With the Wind, Back With the Rain, We Need to Talk, New Phone, Who Dis?, Diwali Cleaning: Found Your Old Grip Socks?, Shaadi Mein Zaroor Aana (Come Back Before the Baraat), The Ex-Files: Season Finale.",
        },
        {
          title: 'Peak month: Apr',
          stat: '₹60.0L',
          detail:
            'Cloud Nine — 9 Years of Physique 57 · 9th anniversary: limited editions, the wheel, the 9:09 flash and the Golden Glute Awards.',
          implication:
            'Flagship month: win on excitement and economics. Two products that exist only in April (the 9-Month Lease and the 9-Class Pack), a 9:09 flash, a wheel you can double, numbered Club Nine annuals and a month of events, with no offer above 25% effective (cash ≤20% except annuals, the flash and the bulk pack). Every April buyer leaves with a reason to come back in May.',
        },
      ],
      build: {
        forecast2026: 33438467.26,
        momentum: 8.29,
        baseline: 36211098.98,
        levers: [
          {
            id: 'conversion',
            name: 'Trial-to-member conversion',
            value: 1556929,
            math: '952 non-hosted first visits × (33.1% → 40.2%) = +68 members × ₹31,356 first-year value × 0.73 in-year realisation',
            why: "Plan of record: carried by the newcomer offers — Third Time's the Charm, Blind Date (No Catfishing), Love Bombing (The Healthy Kind), Lift Like a Girl, Party Crasher Pass, Plus One, Plus Nine, Mom Said Get Off the Couch, Group Project (Finally, Everyone Pulls Their Weight), Mom-entum, Shy Girl Starter Pack, No Strings Attached, Squad Goals, Squat Goals, Glow-Up or Give Back, Diwali Gifting, Minus the Dry-Fruit Box, Bride Squad, Assemble (Groom Can Come Too), Resolution Insurance (Claim Approved), The Gift They Won’t Regift.",
          },
          {
            id: 'leads',
            name: 'Online-lead speed to trial',
            value: 239069,
            math: '774 online leads × trial rate 25.1% → 28.1% × 45% trial→member = +10 members × ₹31,356 × 0.73',
            why: "Plan of record: carried by the newcomer offers — Third Time's the Charm, Blind Date (No Catfishing), Love Bombing (The Healthy Kind), Lift Like a Girl, Party Crasher Pass, Plus One, Plus Nine, Mom Said Get Off the Couch, Group Project (Finally, Everyone Pulls Their Weight), Mom-entum, Shy Girl Starter Pack, No Strings Attached, Squad Goals, Squat Goals, Glow-Up or Give Back, Diwali Gifting, Minus the Dry-Fruit Box, Bride Squad, Assemble (Groom Can Come Too), Resolution Insurance (Claim Approved), The Gift They Won’t Regift.",
          },
          {
            id: 'referral',
            name: 'Paid-on-conversion referral engine',
            value: 1044613,
            math: '224 referral leads × +50% volume × 40.6% lead→member = +46 members × ₹31,356 × 0.73',
            why: "Plan of record: carried by the newcomer offers — Third Time's the Charm, Blind Date (No Catfishing), Love Bombing (The Healthy Kind), Lift Like a Girl, Party Crasher Pass, Plus One, Plus Nine, Mom Said Get Off the Couch, Group Project (Finally, Everyone Pulls Their Weight), Mom-entum, Shy Girl Starter Pack, No Strings Attached, Squad Goals, Squat Goals, Glow-Up or Give Back, Diwali Gifting, Minus the Dry-Fruit Box, Bride Squad, Assemble (Groom Can Come Too), Resolution Insurance (Claim Approved), The Gift They Won’t Regift.",
          },
          {
            id: 'winback',
            name: 'Tiered win-back of dormant clients',
            value: 1872533,
            math: '370 loyal dormant (3+ purchases) × +10pts return + 476 light dormant × +5pts = +61 returners × ₹47,866 avg return spend (×0.8 / ×0.4)',
            why: "Plan of record: carried by the lapsed offers — U Up? It's 2027, It’s Not You, It’s Your Schedule, Faking Your Own Death Didn’t Work, Gone With the Wind, Back With the Rain, We Need to Talk, New Phone, Who Dis?, Diwali Cleaning: Found Your Old Grip Socks?, Shaadi Mein Zaroor Aana (Come Back Before the Baraat), The Ex-Files: Season Finale.",
          },
          {
            id: 'discount',
            name: 'Swap % discounts for value-adds',
            value: 2186651,
            math: 'Price: ₹383L gross × (17.6% → 9.1% effective discount) × 50% kept = ₹16.3L. Renewal: 457 discounted membership/pack sales × 60% moved to value-add × half the 19-pt repurchase gap × ₹21,581 = ₹5.6L',
            why: "Plan of record: carried by the renewal offers — The Baker's Dozen, The 57-Hour Hangover Sale, Put a Ring On It, Monogamy Is Overrated, Bura Na Mano, Renewal Hai, Club Nine: The Founders’ Table, Spin Class (Literally), Moving In Together (The 9-Month Lease), The 9:09 Panic Attack, The Cloud Nine 90, Don't Ghost Us After the Party, Auto-Reply: Out of Office, Still Squatting, Happy Hour (Zero Hangover, All Glutes), Private Practice, Rain Check (Literally), Kitty Party, But Make It Cardio, Team Building Without the Trust Falls, Freedom to Pause (Not Quit), Price Ki Azaadi (Freedom From Price Hikes), Lock It Before the Laddoos, Gold Rush (Dhanteras Edition), From Phuljhadi to Anaar, Black Friday Blind Box (No Duds), 11.11: Treat Yourself, Not Your Ex, The Advent-ure Calendar (Opens in January), Boxing Day (Gloves Optional).",
          },
          {
            id: 'usage',
            name: 'First-30-day habit programme',
            value: 85959,
            math: '58 unlimited memberships ended at ≤4 visits/month × 30% moved to 5–8 visits × +20pt renewal = +4 renewals × ₹16,164 × 1.5 cycles',
            why: "Plan of record: carried by the renewal offers — The Baker's Dozen, The 57-Hour Hangover Sale, Put a Ring On It, Monogamy Is Overrated, Bura Na Mano, Renewal Hai, Club Nine: The Founders’ Table, Spin Class (Literally), Moving In Together (The 9-Month Lease), The 9:09 Panic Attack, The Cloud Nine 90, Don't Ghost Us After the Party, Auto-Reply: Out of Office, Still Squatting, Happy Hour (Zero Hangover, All Glutes), Private Practice, Rain Check (Literally), Kitty Party, But Make It Cardio, Team Building Without the Trust Falls, Freedom to Pause (Not Quit), Price Ki Azaadi (Freedom From Price Hikes), Lock It Before the Laddoos, Gold Rush (Dhanteras Edition), From Phuljhadi to Anaar, Black Friday Blind Box (No Duds), 11.11: Treat Yourself, Not Your Ex, The Advent-ure Calendar (Opens in January), Boxing Day (Gloves Optional).",
          },
          {
            id: 'capacity',
            name: 'Add Strength Lab capacity',
            value: 517839,
            math: '+4 Strength Lab sessions/week × 52 × ₹4,149 revenue/session × 60% ramp',
            why: '',
          },
          {
            id: 'annual',
            name: 'Long-plan renewal desk',
            value: 630843,
            math: '36 annual/6-month plans worth ₹52.6L expire in 2027 × +20pt renewal × 60% of original value (many step down to 3-month/1-month)',
            why: "Plan of record: carried by the renewal offers — The Baker's Dozen, The 57-Hour Hangover Sale, Put a Ring On It, Monogamy Is Overrated, Bura Na Mano, Renewal Hai, Club Nine: The Founders’ Table, Spin Class (Literally), Moving In Together (The 9-Month Lease), The 9:09 Panic Attack, The Cloud Nine 90, Don't Ghost Us After the Party, Auto-Reply: Out of Office, Still Squatting, Happy Hour (Zero Hangover, All Glutes), Private Practice, Rain Check (Literally), Kitty Party, But Make It Cardio, Team Building Without the Trust Falls, Freedom to Pause (Not Quit), Price Ki Azaadi (Freedom From Price Hikes), Lock It Before the Laddoos, Gold Rush (Dhanteras Edition), From Phuljhadi to Anaar, Black Friday Blind Box (No Duds), 11.11: Treat Yourself, Not Your Ex, The Advent-ure Calendar (Opens in January), Boxing Day (Gloves Optional).",
          },
        ],
        leverTotal: 8134436.67,
        haircut: 0.15,
        projection: 43125370.15,
        appTargetAtBuild: 42000000,
      },
      offers: [
        {
          name: "Third Time's the Charm",
          tag: 'Acquisition',
          months: 'Jan',
          audience: 'First-time clients (phone verified).',
          mechanic:
            '3-class pass: ₹3,885. Replaces the Newcomers 2-for-1 for January. Mumbai: 3 classes for ₹3,885 (price of 2 singles) — mix barre, powerCycle and Strength Lab (Lab seats at Supreme HQ; Kwality off-peak only), use within 14 days. Kenkere: 3 barre classes for ₹2,835 (counts as the once-in-a-lifetime 2-for-1; replaces the 50% intro in January). Then the standard 15% on a first membership: 1 Month ₹17,203 / ₹12,406.',
          economics:
            '33% effective (OK: intro/acquisition product, credited/converted at ≤20%). ₹5.2L counted · 30 buyers',
          logic:
            '60.6% of first-timers never take a 2nd class. Purchase within 60 days by month-1 visits: 0 return visits 10.8%, 1 → 43.9%, 2 → 73.3%, 3–4 → 88.6%. The 2-for-1 route converts 20.8% (Bandra 17%). A third class moves people into the 73–89% band.',
          kpi: 'Packs with all 3 classes used in 14 days (target 60%); pack → membership (target 35% vs 20.8% on 2-for-1).',
          lever: 'conversion',
        },
        {
          name: "U Up? It's 2027.",
          tag: 'Win-back',
          months: 'Jan',
          audience: 'Standard lapsed 15%, bonus earned (≈20% effective if earned)',
          mechanic:
            '1M unlimited: ₹17,203 (15% off the ₹20,239 list price). Lapsed 61–365 days: the standard 15% on 1 Month (₹17,203 / ₹12,406) or a 12-class pack (₹16,735 / ₹11,156). Take 12 classes by 31 Jan and get +5 days (pack buyers: +1 class). Pop-ups: 15% on an 8- or 10-class pack (₹5,891 / ₹7,229) and +1 class for 6 classes by 31 Jan.',
          economics: '20% effective (OK: ≤20% effective). ₹3.4L counted · 20 buyers',
          logic:
            'Bandra is reactivation-led (3,209 lapsed vs 5,065 renewed membership records). Renewal climbs with usage: Bandra members using <50% of sessions renew 49–58% vs 82% at 75%+. The bonus is only paid for attendance that predicts the next renewal.',
          kpi: 'Lapsed buyers; share hitting 12 classes (target 40%); Feb renewal of Jan winbacks.',
          lever: 'winback',
        },
        {
          name: "The Baker's Dozen",
          tag: 'Renewal',
          months: 'Jan',
          audience: '≈21',
          mechanic:
            'annual unlimited: ₹1,86,533 (15% off the ₹2,19,450 list price). Annual Unlimited at 15% off — Mumbai ₹1,86,533 (list ₹2,19,450), Kenkere ₹1,32,804 (list ₹1,56,240) — for 13 months instead of 12, plus the standard annual perks (2 privates, 4 guest passes, 1 hosted class, monthly trainer check-ins).',
          economics: '21.5% effective (OK: annual (≤25%)). ₹11.2L counted · 6 buyers',
          logic:
            "Annual is Kwality's #1 product (32 units, ₹51.6L in the last 12 months) and Bandra's #3 (15 units, ₹23.8L). The ANN-2026-25%-KH code gave away ₹9.7L at a flat 25%; this gives less cash away (≈21.5% effective) and adds time, which costs little at spare capacity.",
          kpi: 'Annual re-up rate (target 75%); 3M/6M → annual upgrades.',
          lever: 'annual',
        },
        {
          name: 'The 57-Hour Hangover Sale',
          tag: 'Renewal',
          months: 'Jan',
          audience: 'Everyone, while the capped stock lasts; one per person.',
          mechanic:
            '1M unlimited: ₹15,000 (26% off the ₹20,239 list price). 1 Month Unlimited at a flat ₹15,000 in Mumbai (list ₹20,239, 26% off) or ₹10,000 at Kenkere (list ₹14,595, 31% off). Fri 1 Jan 00:00 to Sun 3 Jan 09:00 — 57 hours. Capped at 57 memberships per city, 1 per person, activate by 15 Jan.',
          economics: '26% effective (OK: spot offer (cap waived)). ₹3.6L counted · 24 buyers',
          logic:
            'January is the strongest non-April month in Mumbai (Jan-26: Kwality ₹27.4L, Bandra ₹20.0L; Kenkere ₹11.1L). A capped spot price creates urgency without training clients to wait — only 57 units per city, so the maximum discount exposure is ~₹3.0L in Mumbai and ~₹2.6L in Bengaluru.',
          kpi: 'Sell-out time; share of spot buyers renewing in Feb at standard price (target 55%).',
          lever: 'annual',
        },
        {
          name: 'Blind Date (No Catfishing)',
          tag: 'Acquisition',
          months: 'Feb',
          audience: 'First-time clients (phone verified).',
          mechanic:
            '1M unlimited: ₹16,204 (20% off the ₹20,239 list price). Mumbai: 2 mystery classes in 10 days for ₹999. The format (Barre, powerCycle or Strength Lab) and the trainer stay sealed in an envelope until you walk in; date two is booked at the desk before you leave. Kenkere: 2 mystery Barre classes (trainer and playlist sealed) for ₹709. Pop-ups: the paid trial (≈₹945), with the second class free if it is booked at the desk. Buy within 72 hours of date two and the ₹999 / ₹709 is credited against 1 Month at the standard 15% (₹16,204 / ₹11,697 net). Pop-ups: 8-class pack at 15% (₹5,891).',
          economics: '20% effective (OK: ≤20% effective). ₹3.6L counted · 22 buyers',
          logic:
            'Kenkere’s VDAY50! code (38 uses, ₹2.6L given away at 50%) bought February volume at a huge cost. A booked second visit lifts trial→member from 10.8% to 43.9%, and a mystery format gets newcomers into the class they would never pick, which is usually the one that sells the membership.',
          kpi: 'Second-date booked at the desk (target 70%); trial → member (target 30%).',
          lever: 'conversion',
        },
        {
          name: 'Love Bombing (The Healthy Kind)',
          tag: 'Acquisition',
          months: 'Feb',
          audience: 'Current members bringing a never-been friend.',
          mechanic:
            '1M unlimited: ₹17,203 (15% off the ₹20,239 list price). Every active member gets three printed love letters at the desk (and a WhatsApp version). Each one gives a never-been friend 2 free classes within 14 days. If the friend buys 1 Month or a 12-class pack within 72 hours of class 2: their standard 15% (₹17,203 / ₹12,406; pop-ups 8-class ₹5,891) plus P57 grip socks, and the member gets +5 days (pack: +1 class) per friend who buys, up to 15 days. Partner Barre on Sun 14 Feb counts as class 2.',
          economics: '18% effective (OK: ≤20% effective). ₹2.1L counted · 12 buyers',
          logic:
            'Referrals convert 41.2% at Kwality, 22.6% at Bandra, 28.3% at Kenkere and 76.1% at pop-ups, versus 3.8–5.7% for website leads. The 2026 BOGO codes (70 uses, ₹3.1L given) went mostly to existing clients; this one pays out only when a genuinely new person buys.',
          kpi: 'Letters redeemed; new buyers from referral (target +40% vs Feb-26).',
          lever: 'conversion',
        },
        {
          name: 'It’s Not You, It’s Your Schedule',
          tag: 'Win-back',
          months: 'Feb',
          audience: 'Lapsed 61–365 days.',
          mechanic:
            '12-class pack: ₹17,203 (13% off the ₹19,688 list price). Lapsed 61–365 days pick a relationship status at the standard 15%: Exclusive = 3 Months (₹49,177 / ₹35,879) + 1 extra freeze; Casual = a 12-class pack (₹16,735 / ₹11,156); It’s Complicated = 1 Month (₹17,203 / ₹12,406) + 1 free freeze for the week life gets in the way. Pop-ups: 8-class pack at 15% (₹5,891). Galentine’s class Sat 13 Feb: bring a friend free.',
          economics: '15% effective (OK: ≤20% effective). ₹1.7L counted · 10 buyers',
          logic:
            'Lapsers average 2.6–3.4 visits in the first half of a membership vs 6.4 for renewers: they left because the plan did not fit the week, not because of the price. Letting them pick the commitment removes the objection without deepening the discount.',
          kpi: 'Reactivations; mix of Exclusive / Casual / Complicated (target 30% Exclusive).',
          lever: 'winback',
        },
        {
          name: 'Put a Ring On It',
          tag: 'Renewal',
          months: 'Feb',
          audience: 'Members renewing in February (any expiry date).',
          mechanic:
            '6M unlimited: ₹96,658 (15% off the ₹1,13,715 list price). Any February renewal: 3 Months at 15% (₹49,177 / ₹35,879) + a P57 mini-band “ring”; 6 Months at 15% + 1 private session (₹96,658 / ₹69,883); Annual at the standard 20% + the annual perks + your name engraved on the Wall of Commitment. Say yes at the desk and the bell rings, confetti, the class applauds. Pop-ups: 10-class pack at 10% + the mini-band (₹7,655).',
          economics: '20% effective (OK: ≤20% effective). ₹12.0L counted · 20 buyers',
          logic:
            'Members using 75%+ of their sessions renew at 82–88%, and longer plans keep them using them. The best perks sit on the longest plans; nothing is unlocked by a class count, so every renewer qualifies.',
          kpi: '3M+ share of renewal value (target 45%); proposals accepted at the desk.',
          lever: 'annual',
        },
        {
          name: 'Lift Like a Girl',
          tag: 'Acquisition',
          months: 'Mar',
          audience: 'First-time clients (phone verified).',
          mechanic:
            '1M unlimited: ₹17,203 (15% off the ₹20,239 list price). Supreme HQ only, Mon 8–Sun 14 Mar: women new to P57 get their first Strength Lab class free (normally needs the 2-for-1), in off-peak Lab slots. Book a second class before leaving and buy 1 Month or a 12-class pack within 72 hours: the standard 15% (₹17,203 / ₹16,735) plus a free Lab induction seat for a friend.',
          economics: '15% effective (OK: ≤20% effective). ₹2.9L counted · 17 buyers',
          logic:
            "Bandra's Lab runs ~48% full vs Kwality's 83%, so Kwality is excluded. Strength/powerCycle-first visits convert 20.4% vs barre 25.6% today — this tests whether a free, coached Lab first visit closes that gap.",
          kpi: 'Lab first visits; Lab-first → purchase vs barre trial (target ≥25%).',
          lever: 'conversion',
        },
        {
          name: 'Monogamy Is Overrated',
          tag: 'Renewal',
          months: 'Mar',
          audience: 'No price discount; ≈17% value on a 12-class pack, ≈16% on 1M if the bonus is earned',
          mechanic:
            "1M unlimited: ₹19,688 (3% off the ₹20,239 list price). For members who've used one format in the last 60 days. Pack members renew at list and get 2 bonus classes valid only in formats they've never tried (Mumbai: powerCycle / Strength Lab induction / Cardio Barre; Kenkere: Cardio Barre / Mat 57 / Foundations). Unlimited members renew at list and get +5 days if they take 3 different formats in their first 30 days.",
          economics: '17% effective (OK: ≤20% effective). ₹5.9L counted · 30 buyers',
          logic:
            'One-format members renew 58–67% vs 85–87% for members on 4+ formats. Bonus classes cost little in off-peak slots and target the single biggest renewal predictor after attendance.',
          kpi: 'Members trying a new format (target 40% of eligible); 60-day renewal of exposed vs unexposed members.',
          lever: 'annual',
        },
        {
          name: 'Bura Na Mano, Renewal Hai',
          tag: 'Renewal',
          months: 'Mar',
          audience: 'Members expiring 1–31 Mar only',
          mechanic:
            "3M unlimited: ₹49,177 (15% off the ₹57,855 list price). Holi, Sun 21–Mon 22 Mar (48 hours): 3 Months at 15% off (₹49,177 / ₹35,879) or a 12-class pack at 10% (₹17,719 / ₹11,813), each with a limited-edition 'Holi Hai' P57 tee (retail ≈₹2,000 — confirm).",
          economics: '18.5% effective (OK: ≤20% effective). ₹6.9L counted · 14 buyers',
          logic:
            'In 2026 Kwality did ₹20.2L in March, then ₹50.0L in April at 20.4% discount depth — March renewals waited. A short, fun window with a 3M upgrade pulls them forward at ≤20% effective.',
          kpi: 'March renewal yield (target 70%); 3M share of March renewals.',
          lever: 'annual',
        },
        {
          name: 'Party Crasher Pass',
          tag: 'Acquisition',
          months: 'Apr',
          audience: 'First-time clients (phone verified).',
          mechanic:
            '1M unlimited: ₹16,204 (20% off the ₹20,239 list price). Mumbai: 3 classes in 9 days for ₹999, any format, including a Birthday Bash party class (17–18 Apr). Kenkere: 3 Barre classes for ₹699 (replaces the 50% intro in April; counts as the once-in-a-lifetime 2-for-1). Pop-ups: 2 classes for ₹999. The pass price is credited against a first 1 Month or 12-class pack bought within 72 hours of class 3, on top of the standard 15% (1 Month nets ₹16,204 / ₹11,707). Buy within 9 hours of class 3 and you hit the Impulse Buzzer: confetti, applause, name on the Reckless Decisions board.',
          economics: '20% effective (OK: ≤20% effective). ₹3.4L counted · 21 buyers',
          logic:
            'A booked sequence of classes is what converts; the party class gives newcomers the best room of the year, and the buzzer turns a sale into a show for whoever is waiting.',
          kpi: 'Pass → member (target 35%); buzzer hits (bought within 9 hours).',
          lever: 'conversion',
        },
        {
          name: 'Plus One, Plus Nine',
          tag: 'Acquisition',
          months: 'Apr',
          audience: 'Current members bringing a never-been friend.',
          mechanic:
            '1M unlimited: ₹17,203 (15% off the ₹20,239 list price). Any active member whose never-been friend buys in April gets +9 days (pack members: +2 classes). Three buying friends = a free month. The friend gets the standard 15% and a Cloud Nine tote. Bring Your Barre-stie day (Thu 8 Apr): every member gets a free guest pass.',
          economics: '15% effective (OK: ≤20% effective). ₹1.7L counted · 10 buyers',
          logic:
            'Referrals convert at 22–76% against 3.8–5.7% for website leads. A tier at three friends gives the super-connectors a reason to keep going.',
          kpi: 'Referral buyers (target 2× April 2026); members reaching three.',
          lever: 'conversion',
        },
        {
          name: 'Faking Your Own Death Didn’t Work',
          tag: 'Win-back',
          months: 'Apr',
          audience: 'Lapsed 61 days–3 years.',
          mechanic:
            '1M unlimited: ₹17,203 (15% off the ₹20,239 list price). Lapsed 61 days–3 years get an obituary postcard (“Here lies a perfectly good plank”). It is the ticket to the candle-lit Séance Class on Thu 15 Apr. Come back on the standard 15% on 1 Month, a 12-class pack or 3 Months, plus a bonus for every year since your first class (max 3): +1 class on packs, +1 day on unlimited. Photo at the Back From the Dead frame; your row at the Throwback Reunion (Sat 24 Apr).',
          economics: '20% effective (OK: ≤20% effective). ₹3.4L counted · 20 buyers',
          logic:
            'Lapsed clients already know the product; what they need is a moment and a reason that is not just a discount. A personal postcard with a dated class beats a generic reminder.',
          kpi: 'Postcards → Séance Class attendance; reactivations (target +30% vs Apr-26).',
          lever: 'winback',
        },
        {
          name: 'Club Nine: The Founders’ Table',
          tag: 'Renewal',
          months: 'Apr',
          audience: 'Members on 3-Month or longer plans; annual renewers.',
          mechanic:
            'annual unlimited: ₹1,75,560 (20% off the ₹2,19,450 list price). 9 numbered Annual Unlimited seats per studio at the standard 20% (₹1,75,560 / ₹1,24,992) with the annual perks doubled: 4 privates, 8 guest passes, 2 hosted classes, monthly trainer check-ins, a numbered jacket, your name on the Club Nine wall and 48-hour priority booking all year. Unveiled at the Birthday Bash on Sat 17 Apr.',
          economics: '25% effective (OK: annual (≤25%)). ₹8.8L counted · 5 buyers',
          logic:
            'Annual buyers are the most valuable members in the book; a numbered seat with doubled perks costs less than a deeper price and gives them something to show off.',
          kpi: 'Seats sold (9 per studio); annual share of April renewals.',
          lever: 'annual',
        },
        {
          name: 'Spin Class (Literally)',
          tag: 'Renewal',
          months: 'Apr',
          audience: 'Members renewing 1 Month or a 12-class pack.',
          mechanic:
            '1M unlimited: ₹18,215 (10% off the ₹20,239 list price). Renew 1 Month or a 12-class pack in April at 10% off (₹18,215 / ₹17,719; Kenkere ₹13,136 / ₹11,813; pop-up 10-pack ₹7,655) and spin the Wheel of Nine. Published odds: +1 class 30%, smoothie 20%, guest pass 15%, grip socks 10%, +3 days 10%, extra freeze 8%, 30-min private 5%, P57 tote 1.5%, a free month 0.5%. Then choose: keep it, double it by booking 9 classes in your first 21 days, or donate it to a friend as a guest pass.',
          economics: '19.5% effective (OK: ≤20% effective). ₹8.2L counted · 45 buyers',
          logic:
            'Clients who use 75%+ of their sessions renew at 80–86%. The doubling option pays the prize only when the member books the classes that make them renew again; the expected value of a spin is ≈₹1,900 Mumbai / ₹1,350 Bengaluru.',
          kpi: 'April renewal yield vs April 2026; share of spins doubled (target 35%).',
          lever: 'annual',
        },
        {
          name: 'Moving In Together (The 9-Month Lease)',
          tag: 'Renewal',
          months: 'Apr',
          audience: 'Members ready for a long commitment and returning clients who want the best price of the year.',
          mechanic:
            '9M unlimited: ₹1,44,999. A 9-Month Unlimited that exists only in April: Mumbai ₹1,44,999 (a 6-Month plus a 3-Month cost ₹1,71,570), Kenkere ₹1,02,999 (₹1,24,425). 9 freezes (min 3 days each), the anniversary hoodie, a numbered brass studio key and your name on the Lease Wall. 99 numbered keys across Kwality and Supreme HQ, 39 at Kenkere; a live counter on the studio screens.',
          economics: '17.5% effective (OK: ≤20% effective). ₹15.9L counted · 11 buyers',
          logic:
            'A numbered, one-month-only product gives people a reason to buy now without cutting the price of the core memberships. April 2026 was bought with 40–48% codes; scarcity sells the long plan at 17.5–20% instead.',
          kpi: 'Keys sold vs 99 / 39; 6M+ share of April membership revenue (target 50%).',
          lever: 'annual',
        },
        {
          name: 'The 9:09 Panic Attack',
          tag: 'Renewal',
          months: 'Apr',
          audience: 'Everyone: members, pack buyers and newcomers.',
          mechanic:
            '9-class pack: ₹11,499. The Limited Edition 9-Class Pack (99 days to use it) exists only in April. Plank Your Price at the desk: hold 57 seconds and it is ₹12,999 (Kenkere ₹8,699), 1:57 for ₹12,249 (₹8,199), 2:57 for the floor, ₹11,499 (₹7,699). On Fri 9 Apr, two 99-minute windows from 9:09 am and 9:09 pm give everyone the floor price, no plank needed: siren in studio, countdown on Instagram. Pop-ups: a 9-class pack at ₹6,499 in the same windows.',
          economics: '23.7% effective (OK: spot offer (≤25%)). ₹2.3L counted · 20 buyers',
          logic:
            'A price you earn with your body is the most Physique 57 thing there is, and every plank at the desk is a show for whoever is waiting. The floor price (23.7% / 24.0%) sits inside the 25% spot cap, and plan revenue is counted at the floor.',
          kpi: 'Packs sold in the two 9:09 windows; pack → membership by June.',
          lever: 'annual',
        },
        {
          name: 'The Cloud Nine 90',
          tag: 'Renewal',
          months: 'Apr',
          audience: 'High-frequency pack buyers.',
          mechanic:
            '90-class pack: ₹1,34,999. 90 classes valid for 12 months: Mumbai ₹1,34,999 (₹1,500 a class; 90 singles cost ₹1,74,825 at list, so 22.8% off), Bengaluru ₹99,999 (₹1,111 a class against ₹1,27,575, 21.6% off). April only, any format.',
          economics: '22.8% effective (OK: bulk purchase (≤25%)). ₹1.3L counted · 1 buyers',
          logic:
            'The Anniversary Big 85 Flex sold 4 times at Kemps Corner and once at Kenkere House in April 2026; this replaces it at a price inside the bulk cap.',
          kpi: 'Packs sold; classes used per month of the pack.',
          lever: 'annual',
        },
        {
          name: 'Mom Said Get Off the Couch',
          tag: 'Acquisition',
          months: 'May',
          audience: 'First-time clients (phone verified).',
          mechanic:
            '8-class pack: ₹10,500 (20% off the ₹13,125 list price). Students and under-25s (ID checked): 8-class pack at 20% off — Mumbai ₹10,500, Kenkere ₹6,972, pop-ups ₹5,544 — valid 45 days, Golden Hours only (Mon–Fri 10 am–12 pm, Sat–Sun 4–7 pm). On sale 1 May–30 Jun.',
          economics: '20% effective (OK: ≤20% effective). ₹1.9L counted · 18 buyers',
          logic:
            'Weekday 10–12 and weekend 4–7 pm run 27–41% full; the marginal cost of a seat there is near zero. Students arriving home in May are a predictable, untapped audience.',
          kpi: 'Golden Hours fill (target +15 pts); student repeat purchase.',
          lever: 'conversion',
        },
        {
          name: 'Group Project (Finally, Everyone Pulls Their Weight)',
          tag: 'Acquisition',
          months: 'May',
          audience: 'First-time clients (phone verified).',
          mechanic:
            '8-class pack: ₹9,844 (25% off the ₹13,125 list price). 4+ students buy 8-class packs together in one transaction: 25% off each — Mumbai ₹9,844, Kenkere ₹6,536, pop-ups ₹5,198. Golden Hours validity, 45 days.',
          economics: '25% effective (OK: bulk purchase (≤25%)). ₹1.2L counted · 12 buyers',
          logic:
            'Bulk purchase is one of the few places 25% is allowed. Groups attend together (higher usage → higher renewal) and bring four new names per sale.',
          kpi: 'Squads sold; squad members buying again within 60 days.',
          lever: 'conversion',
        },
        {
          name: 'Mom-entum',
          tag: 'Acquisition',
          months: 'May',
          audience: 'First-time clients (phone verified).',
          mechanic:
            "1M unlimited: ₹17,203 (15% off the ₹20,239 list price). Mother–child pairs (either way round), 1–16 May. If one is new: the newcomer's standard 15% on 1 Month / 12-class, a shared 30-min duo private and a P57 gift for mum (≈₹2,000 retail — confirm). If both are members: renew together at 10% each + the duo private.",
          economics: '18% effective (OK: ≤20% effective). ₹1.7L counted · 10 buyers',
          logic:
            "Duos with a booked second class convert best; Mother's Day gives a reason. The perk is a shared session, not a bigger discount.",
          kpi: 'Duos trialled; both-buy rate.',
          lever: 'conversion',
        },
        {
          name: "Don't Ghost Us After the Party",
          tag: 'Renewal',
          months: 'May',
          audience: '≈20% effective on 3M, ≈20% on 1M with the private',
          mechanic:
            '3M unlimited: ₹49,177 (15% off the ₹57,855 list price). Everyone who bought in April and takes 8+ classes in May: next renewal 3 Months at 15% (₹49,177 / ₹35,879) or 1 Month at 10% (₹18,215 / ₹13,136), plus a 30-min private. Pop-ups: 10-class pack at 15% + a bonus class.',
          economics: '19.5% effective (OK: ≤20% effective). ₹9.0L counted · 30 buyers',
          logic:
            '2026 anniversary-code buyers renewed at only 24.5%. Attendance in the month after purchase is the best predictor of renewal; the reward is earned by it.',
          kpi: 'April cohort with 8+ May visits (target 55%); April cohort renewal at next expiry (target 55%).',
          lever: 'annual',
        },
        {
          name: 'Shy Girl Starter Pack',
          tag: 'Acquisition',
          months: 'Jun, Jul',
          audience: 'First-time clients (phone verified).',
          mechanic:
            '1M unlimited: ₹16,204 (20% off the ₹20,239 list price). For nervous starters: a 30-min private + one group class within 7 days for ₹1,999 (Kenkere ₹1,499). ₹999 (Kenkere ₹749) is credited against a first 1 Month or 12-class pack bought within 72 hours, with the standard 15% — 1 Month nets ₹16,204 / ₹11,657.',
          economics: '20% effective (OK: ≤20% effective). ₹1.3L counted · 8 buyers',
          logic:
            'Half of CRM leads never trial (Bandra 1,114 of 2,317; Kenkere 2,053 of 3,217). A private first visit removes the intimidation barrier. No historical data on private-first conversion — this is a test.',
          kpi: "Packs sold to 'Not Tried' leads; private-first → member (target 40%).",
          lever: 'conversion',
        },
        {
          name: 'Auto-Reply: Out of Office, Still Squatting',
          tag: 'Renewal',
          months: 'Jun',
          audience: 'No price discount; ≈9% value from virtual privates',
          mechanic:
            '3M unlimited: ₹57,855 (list price). 3 Months Unlimited at list (₹57,855 / ₹42,210) with unlimited freezes (blocks of 3+ days, plan must end within 6 months) and 2 virtual 30-min privates to use while travelling.',
          economics: '9% effective (OK: ≤20% effective). ₹10.4L counted · 18 buyers',
          logic:
            'Travel is the main reason members lapse in June–July. Flexibility removes the reason; list price protects the ticket. Virtual privates cost trainer time only.',
          kpi: '1M → 3M upgrades; June–July lapse rate vs 2026.',
          lever: 'annual',
        },
        {
          name: 'Happy Hour (Zero Hangover, All Glutes)',
          tag: 'Renewal',
          months: 'Jun',
          audience: 'Members and newcomers buying private sessions.',
          mechanic:
            '60-minute private session: ₹4,200 (20% off the ₹5,250 list price). Privates booked in quiet hours (Mon–Fri 12–4 pm, Sat 1–4 pm): 20% off a single private (Mumbai ₹4,200 vs ₹5,250; Kenkere 20% off list) and a free 30-min virtual private with every 2 in-studio privates booked in June.',
          economics: '20% effective (OK: ≤20% effective). ₹3.4L counted · 40 buyers',
          logic:
            "Privates are 6.2% of Kwality's revenue (₹20.1L in 12 months) but only ₹31k at Bandra — the biggest product gap in the portfolio. Quiet-hour pricing uses capacity that is otherwise unpaid.",
          kpi: 'Privates booked 12–4 pm; Bandra privates revenue (target ₹1.5L in June).',
          lever: 'annual',
        },
        {
          name: 'Private Practice',
          tag: 'Renewal',
          months: 'Jun',
          audience: 'Members and newcomers buying private sessions.',
          mechanic:
            '10-class pack of privates: ₹39,375. 10-private pack at 25% off — Mumbai ₹39,375 (list ₹52,500); Kenkere 25% off list — valid 6 months, with a posture and strength assessment in session one. 20-pack: 25% off plus a P57 retail kit.',
          economics: '25% effective (OK: bulk purchase (≤25%)). ₹2.0L counted · 5 buyers',
          logic:
            "Bulk private purchase is one of the allowed 25% cases. Kwality's PR1V@TE10 code (39 uses) shows demand; a pack converts one-off buyers into a 6-month relationship.",
          kpi: 'Packs sold; trainer utilisation.',
          lever: 'annual',
        },
        {
          name: 'Gone With the Wind, Back With the Rain',
          tag: 'Win-back',
          months: 'Jul',
          audience: 'Standard lapsed 15% only',
          mechanic:
            '1M unlimited: ₹17,203 (15% off the ₹20,239 list price). Lapsed 61–365 days, 15–31 Jul: the standard 15% on 1 Month or a 12-class pack + 2 extra freezes + a 15-min comeback assessment + first access to August’s Freedom Weekend.',
          economics: '15% effective (OK: ≤20% effective). ₹3.8L counted · 22 buyers',
          logic:
            'An event with a start date beats a generic reminder. Freezes answer the monsoon objection at no cash cost.',
          kpi: 'Reactivations; comeback assessments booked.',
          lever: 'winback',
        },
        {
          name: 'Rain Check (Literally)',
          tag: 'Renewal',
          months: 'Jul',
          audience: '≈15% effective',
          mechanic:
            '1M unlimited: ₹18,215 (10% off the ₹20,239 list price). July 1 Month renewers: 10% off (₹18,215 / ₹13,136) + 3 late-cancel amnesty tokens (valid to 30 Sep) + automatic credit-back on official red-alert days. Take 12+ classes in July: +3 days. Pop-ups: 10-class pack at 10% + 2 tokens.',
          economics: '15% effective (OK: ≤20% effective). ₹5.5L counted · 30 buyers',
          logic:
            "Average late cancels per membership: Bandra 1.18, Kenkere 1.36. Late-cancel fees in the monsoon make members feel they 'wasted' a month and lapse.",
          kpi: 'July 1M renewal yield (target 70%); tokens used.',
          lever: 'annual',
        },
        {
          name: 'Kitty Party, But Make It Cardio',
          tag: 'Renewal',
          months: 'Jul',
          audience: 'Anyone booking the studio for a private group of up to 12.',
          mechanic:
            "1-class pass (studio bookout for up to 12): ₹24,999. Book out the studio for a private 50-min class for up to 12 (birthdays, bachelorettes, kitty parties, reunions): Mumbai ₹24,999, Kenkere ₹14,999, pop-ups ₹9,999. Every first-timer gets Third Time's the Charm (3-for-2) and the standard 15% on a first membership within 7 days; the host gets 2 guest passes.",
          economics: '0% effective (OK: ≤20% effective). ₹1.0L counted · 4 buyers',
          logic:
            'Hosted classes are a top lead source (Kwality 394, Bandra 353, Kenkere 281 leads) but convert only 4.6–6.1%. A paid bookout has a host who brings warm friends and pays for the room.',
          kpi: 'Bookouts sold; guest → member (target 15%).',
          lever: 'annual',
        },
        {
          name: 'Team Building Without the Trust Falls',
          tag: 'Renewal',
          months: 'Jul',
          audience: 'Offices, HR and team leads; 10+ units on one invoice.',
          mechanic:
            '1M unlimited: ₹15,179 (25% off the ₹20,239 list price). A company buys 10+ memberships or packs on one invoice: 25% off each (1 Month ₹15,179 Mumbai / ₹10,946 Kenkere). Or book a corporate studio bookout and get a 15% employee code for 30 days.',
          economics: '25% effective (OK: bulk purchase (≤25%)). ₹1.5L counted · 10 buyers',
          logic:
            'Bulk purchase is an allowed 25% case. Corporate buyers bring 10+ new members per sale and fit the monsoon trough.',
          kpi: 'Corporate deals.',
          lever: 'annual',
        },
        {
          name: 'No Strings Attached',
          tag: 'Acquisition',
          months: 'Aug',
          audience: 'First-time clients (phone verified).',
          mechanic:
            '1M unlimited: ₹16,204 (20% off the ₹20,239 list price). Mumbai: 2 classes in 7 days for ₹999 (any format), credited against 1 Month at the standard 15% bought within 72 hours (₹16,204 net). Kenkere: 2 Barre classes for ₹709, credited the same way (₹11,697 net). Pop-ups: paid trial (≈₹945) → 8-class pack at 15% (₹5,891). The No-Strings clause: in the first 14 days of the month, if it is not for you, the desk converts what is left into an 8-class pack (60 days). No break-up fee, no awkward conversation.',
          economics: '20% effective (OK: ≤20% effective). ₹3.6L counted · 22 buyers',
          logic:
            'Clients with 5+ visits in month one buy again at 93.5%. A break-up clause costs almost nothing (few use it) and answers the objection the desk hears most: “what if I can’t keep it up?”.',
          kpi: 'Trial → member (target 35%); No-Strings switches (expect <10%).',
          lever: 'conversion',
        },
        {
          name: 'Squad Goals, Squat Goals',
          tag: 'Acquisition',
          months: 'Aug',
          audience: 'Current members bringing 2–4 never-been friends.',
          mechanic:
            '1M unlimited: ₹17,203 (15% off the ₹20,239 list price). Friendship Day (Sun 1 Aug) to 15 Aug, siblings count for Raksha Bandhan: a member books a free Squad Class for 2–4 never-been friends. Friends who buy 1 Month or a 12-class pack within 7 days get their standard 15% (₹17,203 / ₹12,406; pop-ups 8-class ₹5,891) and friendship-band grip socks; the member gets +5 days (pack: +1 class) per friend who buys, up to 15 days.',
          economics: '18.5% effective (OK: ≤20% effective). ₹1.9L counted · 11 buyers',
          logic:
            'Referrals convert at 22–76%; friends who start together come together. A free group class lowers the bar for the nervous friend, and the member is paid only when someone buys.',
          kpi: 'Squad Classes booked; friend → purchase (target 30%).',
          lever: 'conversion',
        },
        {
          name: 'Freedom to Pause (Not Quit)',
          tag: 'Renewal',
          months: 'Aug',
          audience: 'Members renewing in August.',
          mechanic:
            '6M unlimited: ₹96,658 (15% off the ₹1,13,715 list price). Any August renewal: 3 Months at 15% (₹49,177 / ₹35,879) + 2 Freedom Freezes (min 3 days each, any time Sep–Nov, made for Ganeshotsav and Diwali travel); 6 Months at 15% + 1 private + 3 Freedom Freezes (₹96,658 / ₹69,883); Annual at the standard 20% + perks + 4 Freedom Freezes. Pop-ups: 10-class pack at 15% + 30 extra days of validity (₹7,229).',
          economics: '19.6% effective (OK: ≤20% effective). ₹15.5L counted · 37 buyers',
          logic:
            'Members lapse in Sep–Nov when travel breaks the habit. A freeze keeps them paying and coming back instead of cancelling; freezes have no cash cost, so the cash discount stays at the standard 15%.',
          kpi: 'Renewal yield vs Aug-26; Sep–Nov lapse rate of August renewers.',
          lever: 'annual',
        },
        {
          name: 'Price Ki Azaadi (Freedom From Price Hikes)',
          tag: 'Renewal',
          months: 'Aug',
          audience: 'Members and returning clients; annual renewers due Aug–Nov.',
          mechanic:
            'annual unlimited: ₹1,75,560 (20% off the ₹2,19,450 list price). Freedom Weekend, Fri 13–Tue 17 Aug: Annual Unlimited at the standard 20% (₹1,75,560 / ₹1,24,992) with the annual perks, +15 bonus days, and your 2028 renewal locked at today’s 2027 list price, whatever the 2028 price list says. 47 memberships in Mumbai and 19 in Bengaluru, for 1947.',
          economics: '24.1% effective (OK: annual (≤25%)). ₹8.8L counted · 5 buyers',
          logic:
            'A price lock costs nothing in 2027 and answers the renewal-price objection a year early. It sells the annual on certainty, not depth, and every lock is a 2028 renewal already in the book.',
          kpi: 'Annuals sold (target 8 Mumbai, 1 Bengaluru); 2028 locks.',
          lever: 'annual',
        },
        {
          name: 'Glow-Up or Give Back',
          tag: 'Acquisition',
          months: 'Sep',
          audience: 'First-time clients (phone verified).',
          mechanic:
            "2M unlimited: ₹34,406. 2 Months Unlimited at the standard 15% — Mumbai ₹34,406, Kenkere ₹24,812 — with a fitness check on day 1 and a re-test on day 56 (before Diwali, 29 Oct). Take 30+ classes and don't improve on 2 of 3 measures: your third month is free.",
          economics: '15% effective (OK: ≤20% effective). ₹4.1L counted · 12 buyers',
          logic:
            "New clients' first 60-day spend averages ₹11,150 at Kwality, ₹8,411 at Bandra and ₹6,747 at Kenkere — under one month's list price. A 2-month bundle doubles it; the 30-class condition makes the guarantee rarely paid.",
          kpi: 'Bundles sold; day-56 re-test attendance; 3rd-month purchases.',
          lever: 'conversion',
        },
        {
          name: 'We Need to Talk',
          tag: 'Win-back',
          months: 'Sep',
          audience: '6M ≈22% effective with the private',
          mechanic:
            '6M unlimited: ₹90,972 (20% off the ₹1,13,715 list price). Named list — lapsed clients with ≥₹50k lifetime spend (Kenkere ≥₹35k): a call from the studio manager, then 6 Months at 20% (₹90,972 / ₹65,772) or 3 Months at the standard 15% (₹49,177 / ₹35,879), unlimited freezes and a 30-min private to restart.',
          economics:
            '22% effective (OK: 6M+/long plan, ≤25% effective incl. perks (cash ≤20%)). ₹3.5L counted · 5 buyers',
          logic:
            'These clients bought big before; a long plan at a serious price fits them. A personal call converts better than a broadcast.',
          kpi: 'Calls made (100% of list); restarts.',
          lever: 'winback',
        },
        {
          name: 'New Phone, Who Dis?',
          tag: 'Win-back',
          months: 'Sep',
          audience: 'Standard lapsed 15% only',
          mechanic:
            "1M unlimited: ₹17,203 (15% off the ₹20,239 list price). Lapsed 61–180 days: a free 'no questions asked' comeback class; buy within 7 days for the standard 15% on 1 Month or a 12-class pack + 1 extra freeze. Pop-ups: free comeback class, then 15% on an 8- or 10-class pack.",
          economics: '15% effective (OK: ≤20% effective). ₹4.1L counted · 24 buyers',
          logic:
            'A free first step lowers the barrier; the 7-day window keeps the decision fast. The freeze has no cash cost.',
          kpi: 'Comeback classes booked; comeback → purchase within 7 days (target 35%).',
          lever: 'winback',
        },
        {
          name: 'Lock It Before the Laddoos',
          tag: 'Renewal',
          months: 'Sep',
          audience: '≈18',
          mechanic:
            '3M unlimited: ₹49,177 (15% off the ₹57,855 list price). Renew to 3 Months at 15% off (₹49,177 / ₹35,879) by 30 Sep: a Diwali hamper (≈₹2,000 retail — confirm) and unlimited freezes for Oct–Dec travel.',
          economics: '18.5% effective (OK: ≤20% effective). ₹11.8L counted · 24 buyers',
          logic:
            'October–December are troughs (Kwality Nov-25 ₹18.5L; Bandra Oct-25 ₹10.2L). Locking 3M before the festive season protects the base.',
          kpi: '3M renewals and upgrades.',
          lever: 'annual',
        },
        {
          name: 'Diwali Gifting, Minus the Dry-Fruit Box',
          tag: 'Acquisition',
          months: 'Oct',
          audience: 'First-time clients (phone verified).',
          mechanic:
            '3-class pass: ₹3,885. A festive gift envelope with 3 classes for the price of 2 — Mumbai ₹3,885, Kenkere ₹2,835, pop-ups ₹1,890 — for someone new. The recipient gets the standard 15% on a first membership; the giver gets 1 bonus class when they buy.',
          economics:
            '33% effective (OK: intro/acquisition product, credited/converted at ≤20%). ₹1.2L counted · 30 buyers',
          logic:
            'Gifting is real festive spend; the 3-for-2 gets recipients to the 3-visit mark that converts at 73–89%.',
          kpi: 'Gift envelopes sold; activation rate; recipient → member.',
          lever: 'conversion',
        },
        {
          name: 'Diwali Cleaning: Found Your Old Grip Socks?',
          tag: 'Win-back',
          months: 'Oct',
          audience: 'Standard lapsed 15% + retail (≤20% effective)',
          mechanic:
            '1M unlimited: ₹17,203 (15% off the ₹20,239 list price). Lapsed clients: bring (or just mention) your old grip socks, get the standard 15% on 1 Month or a 12-class pack, and swap them for a new pair of P57 grip socks.',
          economics: '19% effective (OK: ≤20% effective). ₹3.8L counted · 22 buyers',
          logic: "A physical prompt from the client's own home is a memorable trigger; the retail cost is low.",
          kpi: 'Reactivations.',
          lever: 'winback',
        },
        {
          name: 'Gold Rush (Dhanteras Edition)',
          tag: 'Renewal',
          months: 'Oct',
          audience: 'Annual cap 25%',
          mechanic:
            'annual unlimited: ₹1,71,171 (22% off the ₹2,19,450 list price). Dhanteras window, Tue 26–Thu 28 Oct: Annual Unlimited at 22% off (₹1,71,171 / ₹1,21,867) + 1 extra private (3 in total) + a gold-foil membership card, with the standard annual perks.',
          economics: '24.4% effective (OK: annual (≤25%)). ₹6.8L counted · 4 buyers',
          logic:
            "Dhanteras is India's 'buy something lasting' day; an annual fits. ≈24.5% effective sits under the annual cap.",
          kpi: 'Annuals sold.',
          lever: 'annual',
        },
        {
          name: 'From Phuljhadi to Anaar',
          tag: 'Renewal',
          months: 'Oct',
          audience: 'Members on 1 Month or class packs.',
          mechanic:
            '6M unlimited: ₹90,972 (20% off the ₹1,13,715 list price). 1 Month and pack members upgrade to 6 Months at 20% off (₹90,972 / ₹65,772) with 3 extra freezes, or to 3 Months at 15% (₹49,177 / ₹35,879).',
          economics: '20% effective (OK: ≤20% effective). ₹11.7L counted · 18 buyers',
          logic: 'Upgrading lifts cash per member 2.3–4.4× and protects the base through November, the softest month.',
          kpi: '1M → 3M/6M upgrades.',
          lever: 'annual',
        },
        {
          name: 'Bride Squad, Assemble (Groom Can Come Too)',
          tag: 'Acquisition',
          months: 'Nov',
          audience: 'Wedding parties and friend groups (min 4, at least 2 new).',
          mechanic:
            '12-class pack: ₹17,325 (12% off the ₹19,688 list price). Wedding season: a group of 4+ (at least 2 new to P57) buy 12-class packs together at 12% off each (Mumbai ₹17,325, Kenkere ₹11,550; packs valid 60 days) and get one hosted private Squad Class for the group, that ends on a choreographed Sangeet routine. Pop-ups: 8-class packs at 5% (₹6,584) + a hosted Pilates squad class. Grooms, cousins and the friend who “doesn’t do group fitness” all count.',
          economics: '18.7% effective (OK: ≤20% effective). ₹3.1L counted · 18 buyers',
          logic:
            'November–December is shaadi season: brides, bridesmaids and families are motivated and arrive in groups. A group rate recruits several newcomers in one conversation, and the hosted class is time we already have, not cash.',
          kpi: 'Squads formed; new buyers from squads (target 50% of squad members).',
          lever: 'conversion',
        },
        {
          name: 'Shaadi Mein Zaroor Aana (Come Back Before the Baraat)',
          tag: 'Win-back',
          months: 'Nov',
          audience: 'Lapsed 61–365 days.',
          mechanic:
            '1M unlimited: ₹17,203 (15% off the ₹20,239 list price). Lapsed 61–365 days: the standard 15% on 1 Month or a 12-class pack (₹17,203 / ₹12,406) + matching “Bride Tribe” grip socks, and a seat at the Sangeet Choreo Barre on Sat 20 Nov: a full Barre class that ends with a 10-minute dance-floor routine you can actually use at the wedding.',
          economics: '18.5% effective (OK: ≤20% effective). ₹1.4L counted · 8 buyers',
          logic:
            'An event with a date beats a generic reminder, and the wedding season is the date. The socks and the class cost little and give a returner a reason to post.',
          kpi: 'Reactivations; Sangeet Choreo attendance → purchase.',
          lever: 'winback',
        },
        {
          name: 'Black Friday Blind Box (No Duds)',
          tag: 'Renewal',
          months: 'Nov',
          audience: 'Members renewing or upgrading; annual renewers due Nov–Jan.',
          mechanic:
            '6M unlimited: ₹96,658 (15% off the ₹1,13,715 list price). Fri 26–Mon 29 Nov: 3 Months at 10% (₹52,070 / ₹37,989), 6 Months at 15% (₹96,658 / ₹69,883) or Annual at 20% (₹1,75,560 / ₹1,24,992), then pick a sealed black box. Every box holds one bonus, from ₹1,500 to ₹5,250 at list: +5 days, 2 guest passes, a 30-min private, a P57 tote + socks, or a full private session. One Black Box per studio, in the annual pile only, adds the “I Survived Black Friday” hoodie. Pop-ups: 10-class pack at 10% + a box (≤1 class) (₹7,655). No discount on 1 Month.',
          economics: '19.6% effective (OK: ≤20% effective). ₹8.3L counted · 11 buyers',
          logic:
            'Black Friday discounts train members to wait. A mystery bonus keeps the cash discount at the standard ladder (10/15/20%) and makes opening the box the content.',
          kpi: '3M+ share of November renewal value; boxes opened on camera.',
          lever: 'annual',
        },
        {
          name: '11.11: Treat Yourself, Not Your Ex',
          tag: 'Renewal',
          months: 'Nov',
          audience: 'Everyone: newcomers, pack buyers and members.',
          mechanic:
            '8-class pack: ₹10,500 (20% off the ₹13,125 list price). Thu 11 Nov, 11:11 am to 10:11 pm only: an 8-class pack at 20% off: Mumbai ₹10,500 (list ₹13,125), Kenkere ₹6,972 (₹8,715), pop-ups ₹5,544 (₹6,930). One per person, usual validity, members and newcomers alike.',
          economics: '20% effective (OK: spot offer (≤25%)). ₹1.1L counted · 10 buyers',
          logic:
            'Singles’ Day is now a shopping date in India. A one-day pack price brings in fence-sitters and members topping up, at a discount that never reaches memberships.',
          kpi: 'Packs sold in 11 hours; pack buyers → membership by January.',
          lever: 'annual',
        },
        {
          name: 'Resolution Insurance (Claim Approved)',
          tag: 'Acquisition',
          months: 'Dec',
          audience: 'First-time clients (phone verified); members buying for a January start.',
          mechanic:
            '1M unlimited: ₹17,203 (15% off the ₹20,239 list price). Buy in December, start any day 1–10 Jan 2028. Newcomers: 1 Month at the standard 15% (₹17,203 / ₹12,406) with Resolution Insurance: no late-cancel fees all January, one “life happens” freeze, and a trainer call if you miss 3 booked classes, to rebuild your week. Members can gift the same plan or buy 3 Months at 15% starting in January.',
          economics: '15% effective (OK: ≤20% effective). ₹2.2L counted · 13 buyers',
          logic:
            'Most January resolutions fail in week two. Cover for the usual excuses (late cancels, a bad week) costs little and is exactly what a nervous December buyer needs to hear.',
          kpi: 'Pre-sold January starts; January attendance of insured buyers.',
          lever: 'conversion',
        },
        {
          name: 'The Gift They Won’t Regift',
          tag: 'Acquisition',
          months: 'Dec',
          audience: 'Members and non-members buying for someone new; offices.',
          mechanic:
            '2-class pass: ₹2,499. A boxed gift for someone new: Mumbai ₹2,499 (2 classes in any format + grip socks + ₹1,000 off a first membership), Kenkere ₹1,799 (2 Barre classes + socks + ₹750 off), pop-ups ₹1,199 (1 class + socks + ₹400 off). The credit is valid within 14 days of class 2, on top of the standard 15%. Offices buying 10+ boxes get 10% off the boxes and a hosted team class.',
          economics: '20% effective (OK: ≤20% effective). ₹0.7L counted · 29 buyers',
          logic:
            'A gift arrives with a friend’s endorsement, which is why gifted and referred clients convert far better than ad leads. The credit only pays out when the recipient buys.',
          kpi: 'Boxes sold; boxes redeemed by 31 Jan; recipient → member (target 30%).',
          lever: 'conversion',
        },
        {
          name: 'The Ex-Files: Season Finale',
          tag: 'Win-back',
          months: 'Dec',
          audience: 'Lapsed 90+ days.',
          mechanic:
            '1M unlimited: ₹18,215 (10% off the ₹20,239 list price). Lapsed 90+ days: 1 Month or a 12-class pack at 10% (₹18,215 / ₹13,136), or 3 Months at 15% (₹49,177 / ₹35,879), plus a plus-one guest pass to the NYE Countdown Class (Fri 31 Dec, 11 am). Pop-ups: 8-class pack at 5% + a plus-one class (₹6,584).',
          economics: '19.6% effective (OK: ≤20% effective). ₹2.6L counted · 14 buyers',
          logic:
            'People who come back in December arrive in January already in the habit. The plus-one turns a returner into a referral at the busiest social week of the year.',
          kpi: 'Reactivations; plus-ones who buy in January.',
          lever: 'winback',
        },
        {
          name: 'The Advent-ure Calendar (Opens in January)',
          tag: 'Renewal',
          months: 'Dec',
          audience: 'Members renewing in December.',
          mechanic:
            '3M unlimited: ₹50,912 (12% off the ₹57,855 list price). Renew in December, 3 Months at 12% (₹50,912 / ₹37,145), 6 Months at 15% (₹96,658 / ₹69,883) or Annual at the standard 20%, and take home a 12-door P57 Advent-ure Calendar. One door a week from 3 Jan 2028: 3 guest passes, 2 smoothies, a 30-min virtual private, 2 extra days, a freeze, grip socks, a front-row reservation, a playlist pick and one golden door. Worth ≈₹4,000 Mumbai / ₹3,000 Bengaluru at list. Pop-ups: 10-class pack at 10% + a 3-door mini calendar (₹7,655).',
          economics: '18.9% effective (OK: ≤20% effective). ₹14.8L counted · 27 buyers',
          logic:
            'January drop-off is when renewals are lost. Spreading the perks across Jan–Mar gives members a reason to show up every week of the hardest quarter, which is what keeps them renewing.',
          kpi: 'December renewal yield; Q1 2028 visits of calendar holders vs others.',
          lever: 'annual',
        },
        {
          name: 'Boxing Day (Gloves Optional)',
          tag: 'Renewal',
          months: 'Dec',
          audience: 'Everyone: pack buyers, members topping up, newcomers.',
          mechanic:
            '12-class pack: ₹15,750 (20% off the ₹19,688 list price). Sun 26–Mon 27 Dec only: 12-class packs at 20% off: Mumbai ₹15,750 (list ₹19,688), Kenkere ₹10,500 (₹13,125); pop-ups 10-class pack at 20% (₹6,804). Two per person; buy now, start whenever January starts for you.',
          economics: '20% effective (OK: spot offer (≤25%)). ₹5.7L counted · 36 buyers',
          logic:
            'The week after Christmas is empty in studio but busy on phones. A two-day pack price pulls January purchases forward without touching membership prices.',
          kpi: 'Packs sold in 48 hours; January visits on Boxing Day packs.',
          lever: 'annual',
        },
      ],
      months: [
        {
          month: 'Jan',
          event: 'Resolutions with receipts',
          theme: 'Resolutions with Receipts',
          focus:
            'Turn New Year intent into paid commitments that are active on 1 Feb; re-up the annuals due Dec–Feb; test the 3-for-2 newcomer pack.',
          offers: ["Third Time's the Charm", "U Up? It's 2027.", "The Baker's Dozen", 'The 57-Hour Hangover Sale'],
          actions: [
            "Third Time's the Charm: First class: awkward. Second: better. Third: hooked. 3 classes for the price of 2.",
            "U Up? It's 2027.: U up? Your mat's been asking about you.",
            "The Baker's Dozen: 12 months is so 2026. Renew your annual and get 13.",
            'The 57-Hour Hangover Sale: Hungover? Same. 1 month unlimited, flat ₹15,000. 57 hours only.',
          ],
          why: 'Key dates: New Year + 57-Hour Hangover Sale (to 3 Jan 09:00) (1 Jan).',
        },
        {
          month: 'Feb',
          event: 'Valentine’s + Galentine’s + Singles Awareness Day',
          theme: 'Red Flags, Green Flags',
          focus:
            'Turn Valentine’s-season traffic into first memberships through a mystery-class intro; recruit through members’ love letters; move February renewals onto 3–12 month plans; let lapsed clients come back on the commitment they choose. Every reward is tied to a purchase or a visit.',
          offers: [
            'Blind Date (No Catfishing)',
            'Love Bombing (The Healthy Kind)',
            'It’s Not You, It’s Your Schedule',
            'Put a Ring On It',
          ],
          actions: [
            'Blind Date (No Catfishing): Two classes. You don’t know which. That’s the fun part.',
            'Love Bombing (The Healthy Kind): Love bombing, but it’s two free classes and zero manipulation.',
            'It’s Not You, It’s Your Schedule: It’s not you, it’s your schedule. Pick a relationship status.',
            'Put a Ring On It: If you like it, then you should’ve put a 6-month on it.',
          ],
          why: 'Key dates: Green Flag Week: Blind Date envelopes at every desk (1 Feb); Galentine’s class (bring a friend free) (13 Feb); Valentine’s Day: Partner Barre (14 Feb); Singles Awareness Day: Hate-Squat Hour (break-up playlist class) (15 Feb).',
        },
        {
          month: 'Mar',
          event: "Women's Day + Main Character Month (format exploration)",
          theme: 'Main Character Month',
          focus:
            "Hold the March trough: widen members' formats, use Women's Day for Bandra Lab acquisition, stop March expiries waiting for April, fix Bengaluru's second-visit leak.",
          offers: ['Lift Like a Girl', 'Monogamy Is Overrated', 'Bura Na Mano, Renewal Hai'],
          actions: [
            "Lift Like a Girl: Women's Day isn't about flowers. It's about deadlifts.",
            'Monogamy Is Overrated: Committed to one class? Cute. Members who play the field stay longer.',
            'Bura Na Mano, Renewal Hai: Bura na mano, renewal hai. 48 hours only.',
          ],
          why: "Key dates: Galentine’s-to-Women’s-Day open house (bring a friend) (2 Mar); International Women's Day — Lift Like a Girl week (Bandra) (8 Mar); Holi (approx.) — 48-hour renewal window 21–22 Mar (22 Mar, approx.).",
        },
        {
          month: 'Apr',
          event: '9th anniversary: limited editions, the wheel, the 9:09 flash and the Golden Glute Awards',
          theme: 'Cloud Nine — 9 Years of Physique 57',
          focus:
            'Flagship month: win on excitement and economics. Two products that exist only in April (the 9-Month Lease and the 9-Class Pack), a 9:09 flash, a wheel you can double, numbered Club Nine annuals and a month of events, with no offer above 25% effective (cash ≤20% except annuals, the flash and the bulk pack). Every April buyer leaves with a reason to come back in May.',
          offers: [
            'Party Crasher Pass',
            'Plus One, Plus Nine',
            'Faking Your Own Death Didn’t Work',
            'Club Nine: The Founders’ Table',
            'Spin Class (Literally)',
            'Moving In Together (The 9-Month Lease)',
            'The 9:09 Panic Attack',
            'The Cloud Nine 90',
          ],
          actions: [
            'Party Crasher Pass: It’s our 9th birthday and you’re invited. 3 classes for ₹999.',
            'Plus One, Plus Nine: Bring a friend, get 9 days. Bring three, get a month.',
            'Faking Your Own Death Didn’t Work: We wrote your obituary. You’re not getting out of it that easily.',
            'Club Nine: The Founders’ Table: Nine numbered seats per studio. Founder perks for a year.',
            'Spin Class (Literally): Renew, then spin. Every spin wins. Feeling brave? Double it.',
            'Moving In Together (The 9-Month Lease): Nine years in, we’re ready to move in together. 99 keys. No second batch.',
            'The 9:09 Panic Attack: Plank for your price. Or wait for 9:09 and panic with everyone else.',
            'The Cloud Nine 90: Ninety classes. One year. Zero commitment issues.',
          ],
          why: 'Key dates: Launch: “Nine Years in Ninety Seconds” film; 9-Month Lease and 9-Class Pack on sale (1 Apr); Blind Date With a Class (format and trainer secret until you walk in) (3 Apr); Throwback Class: the 2018 playlist and original choreography (6 Apr); Bring Your Barre-stie: free guest pass for every member (8 Apr); The 9:09 Panic Attack: two 99-minute flash windows (9 Apr); Séance Class (candle-lit winback class) (15 Apr); Club Nine Unveiling + Birthday Bash (17–18 Apr) (17 Apr); Physique 57 India 9th anniversary: ‘9 at 9’ class, cake and the Time Capsule (18 Apr); Throwback Reunion + Golden Glute Awards (24 Apr); Lock-In: last keys, midnight close of anniversary prices (30 Apr).',
        },
        {
          month: 'May',
          event: "Students home for the holidays + Mother's Day",
          theme: 'Home for the Holidays',
          focus:
            "Students home from college fill empty off-peak seats; Mother's Day duos; keep April's buyers attending.",
          offers: [
            'Mom Said Get Off the Couch',
            'Group Project (Finally, Everyone Pulls Their Weight)',
            'Mom-entum',
            "Don't Ghost Us After the Party",
          ],
          actions: [
            "Mom Said Get Off the Couch: Home for the summer and Mom's already said 'do something'?",
            'Group Project (Finally, Everyone Pulls Their Weight): Group projects: usually one person does all the work. Not here.',
            'Mom-entum: She carried you for 9 months. You can carry her to class.',
            "Don't Ghost Us After the Party: Great party. Now show up 8 times in May.",
          ],
          why: "Key dates: Mother's Day (9 May).",
        },
        {
          month: 'Jun',
          event: 'Privates month + Out of Office',
          theme: 'Privates Month + Out of Office',
          focus:
            "Grow privates with off-peak pricing and bulk packs (Bandra's biggest gap); stop summer travel lapses with freezes, not discounts; test a private-first intro.",
          offers: [
            'Shy Girl Starter Pack',
            'Auto-Reply: Out of Office, Still Squatting',
            'Happy Hour (Zero Hangover, All Glutes)',
            'Private Practice',
          ],
          actions: [
            'Shy Girl Starter Pack: Not a front-row person yet? Start with a private.',
            "Auto-Reply: Out of Office, Still Squatting: Auto-reply: I'm on vacation, but my membership isn't lapsing.",
            'Happy Hour (Zero Hangover, All Glutes): Happy hour, but the only thing on tap is a trainer.',
            'Private Practice: Ten sessions. One trainer who knows your knees better than your physio.',
          ],
          why: "Key dates: Father's Day (20 Jun).",
        },
        {
          month: 'Jul',
          event: 'Studio bookouts + monsoon',
          theme: 'Book the Studio + Rain Check',
          focus:
            'Studio bookouts and corporate bulk as new channels; protect monsoon renewals; bring lapsed clients back before August.',
          offers: [
            'Shy Girl Starter Pack',
            'Gone With the Wind, Back With the Rain',
            'Rain Check (Literally)',
            'Kitty Party, But Make It Cardio',
            'Team Building Without the Trust Falls',
          ],
          actions: [
            'Shy Girl Starter Pack: Not a front-row person yet? Start with a private.',
            'Gone With the Wind, Back With the Rain: Left us in the summer heat? Come back for the monsoon.',
            "Rain Check (Literally): Monsoon happens. Your late-cancel fee doesn't have to.",
            'Kitty Party, But Make It Cardio: Kitty party, but make it cardio.',
            'Team Building Without the Trust Falls: Team building without the trust falls.',
          ],
          why: 'Key dates: Freedom Weekend early-access list opens (for August) (15 Jul).',
        },
        {
          month: 'Aug',
          event: 'Friendship Day + Freedom Weekend + Raksha Bandhan',
          theme: 'Azaadi From Average',
          focus:
            'Recruit whole friend groups on Friendship Day; sell annuals over Freedom Weekend with a 2028 price lock instead of a deeper discount; remove the commitment objection for newcomers with a break-up clause; protect the festive-season renewal book with freezes. Every reward is tied to a purchase or a visit, never to a class count.',
          offers: [
            'No Strings Attached',
            'Squad Goals, Squat Goals',
            'Freedom to Pause (Not Quit)',
            'Price Ki Azaadi (Freedom From Price Hikes)',
          ],
          actions: [
            'No Strings Attached: Commitment issues? Same. Here’s a membership with a break-up clause.',
            'Squad Goals, Squat Goals: Your squad. Our studio. Matching socks, obviously.',
            'Freedom to Pause (Not Quit): Pause for Ganpati. Pause for Diwali. Just don’t quit.',
            'Price Ki Azaadi (Freedom From Price Hikes): Freedom from price hikes. Lock your 2028 renewal at 2027 prices.',
          ],
          why: 'Key dates: Friendship Day: Squad Classes (1 Aug); Freedom Weekend opens: Price Ki Azaadi (13–17 Aug) (13 Aug); Independence Day: Freedom Flow class at 8:15 am (15 Aug); Raksha Bandhan (approx.): Sibling Barre (17 Aug, approx.).',
        },
        {
          month: 'Sep',
          event: 'The Comeback (winback month) + 57 Days to Diwali',
          theme: 'The Comeback + 57 Days to Diwali',
          focus:
            'Winback month: manager calls for high-value lapsed clients, fast comebacks for recent lapsers; a results-guarantee bundle; lock 3M plans before the festive dip.',
          offers: ['Glow-Up or Give Back', 'We Need to Talk', 'New Phone, Who Dis?', 'Lock It Before the Laddoos'],
          actions: [
            'Glow-Up or Give Back: 57 days to Diwali. Glow up, or we give back.',
            'We Need to Talk: We need to talk. Not like that — we just miss you.',
            "New Phone, Who Dis?: New phone, who dis? (It's us. Your favourite class.)",
            'Lock It Before the Laddoos: Lock it before the laddoos.',
          ],
          why: 'Key dates: 57 Days to Diwali countdown begins (2 Sep); World Heart Day (29 Sep).',
        },
        {
          month: 'Oct',
          event: 'Diwali gifting + upgrades',
          theme: 'Festival of Lights',
          focus: 'Gift-led acquisition, 1M→6M upgrades and a Dhanteras annual window, without open codes.',
          offers: [
            'Diwali Gifting, Minus the Dry-Fruit Box',
            'Diwali Cleaning: Found Your Old Grip Socks?',
            'Gold Rush (Dhanteras Edition)',
            'From Phuljhadi to Anaar',
          ],
          actions: [
            "Diwali Gifting, Minus the Dry-Fruit Box: This Diwali, gift something they'll actually use.",
            'Diwali Cleaning: Found Your Old Grip Socks?: Diwali cleaning found your old grip socks. Sign?',
            'Gold Rush (Dhanteras Edition): Buy gold this Dhanteras. The kind that lifts.',
            'From Phuljhadi to Anaar: Upgrade from a phuljhadi to an anaar.',
          ],
          why: 'Key dates: Dhanteras window (26–28 Oct, approx.) (26 Oct, approx.); Diwali (approx.) (29 Oct, approx.).',
        },
        {
          month: 'Nov',
          event: 'Wedding season + 11.11 + Black Friday',
          theme: 'Shaadi Season (and a Very Black Friday)',
          focus:
            'Sell group packs into the wedding season; bring lapsed clients back before the baraat; one loud 11-hour pack day on 11.11; and a Black Friday that moves renewals onto long plans with a mystery bonus instead of a deeper price.',
          offers: [
            'Bride Squad, Assemble (Groom Can Come Too)',
            'Shaadi Mein Zaroor Aana (Come Back Before the Baraat)',
            'Black Friday Blind Box (No Duds)',
            '11.11: Treat Yourself, Not Your Ex',
          ],
          actions: [
            'Bride Squad, Assemble (Groom Can Come Too): Four of you, one wedding, zero excuses. Squad rates inside.',
            'Shaadi Mein Zaroor Aana (Come Back Before the Baraat): Shaadi mein zaroor aana. And to class before that.',
            'Black Friday Blind Box (No Duds): Black Friday, but every box is a winner. We checked.',
            '11.11: Treat Yourself, Not Your Ex: 11.11. Eleven hours. Treat yourself, not your ex.',
          ],
          why: 'Key dates: 11.11: Treat Yourself, Not Your Ex (11:11 am–10:11 pm) (11 Nov); Sangeet Choreo Barre (ends on a dance-floor routine) (20 Nov); Black Friday Blind Box opens (26–29 Nov) (26 Nov); Cyber Monday: last boxes (29 Nov).',
        },
        {
          month: 'Dec',
          event: 'Gifting + Christmas + Boxing Day + NYE',
          theme: 'Party Season Survival Guide',
          focus:
            'Renew December’s book onto long plans with perks spread across Q1; sell January starts now with Resolution Insurance; turn gifting into January newcomers; bank pack demand on Boxing Day; win back long-lapsed clients with a plus-one to the NYE Countdown Class.',
          offers: [
            'Resolution Insurance (Claim Approved)',
            'The Gift They Won’t Regift',
            'The Ex-Files: Season Finale',
            'The Advent-ure Calendar (Opens in January)',
            'Boxing Day (Gloves Optional)',
          ],
          actions: [
            'Resolution Insurance (Claim Approved): Insure your resolution before you make it. Claim approved.',
            'The Gift They Won’t Regift: The one gift that doesn’t end up in next year’s Secret Santa.',
            'The Ex-Files: Season Finale: Every great series needs a finale. Yours is a comeback.',
            'The Advent-ure Calendar (Opens in January): An advent calendar you open in January, when you actually need it.',
            'Boxing Day (Gloves Optional): Boxing Day. No gloves, just a 12-class pack at 20% off.',
          ],
          why: 'Key dates: Advent-ure Calendars and gift boxes on sale (1 Dec); Ugly Sweater Barre (18 Dec); Christmas Eve candle-lit class (24 Dec); Boxing Day (Gloves Optional): 26–27 Dec (26 Dec); NYE Countdown Class (11 am) (31 Dec).',
        },
      ],
      rhythm: [
        [
          'Newcomer journey',
          "Offers: Third Time's the Charm, Blind Date (No Catfishing), Love Bombing (The Healthy Kind), Lift Like a Girl, Party Crasher Pass, Plus One, Plus Nine, Mom Said Get Off the Couch, Group Project (Finally, Everyone Pulls Their Weight), Mom-entum, Shy Girl Starter Pack, No Strings Attached, Squad Goals, Squat Goals, Glow-Up or Give Back, Diwali Gifting, Minus the Dry-Fruit Box, Bride Squad, Assemble (Groom Can Come Too), Resolution Insurance (Claim Approved), The Gift They Won’t Regift. Watch each offer's “What to watch” measures and rate of sale monthly.",
        ],
        [
          'Lapsed journey',
          "Offers: U Up? It's 2027, It’s Not You, It’s Your Schedule, Faking Your Own Death Didn’t Work, Gone With the Wind, Back With the Rain, We Need to Talk, New Phone, Who Dis?, Diwali Cleaning: Found Your Old Grip Socks?, Shaadi Mein Zaroor Aana (Come Back Before the Baraat), The Ex-Files: Season Finale. Watch each offer's “What to watch” measures and rate of sale monthly.",
        ],
        [
          'Renewal journey',
          "Offers: The Baker's Dozen, The 57-Hour Hangover Sale, Put a Ring On It, Monogamy Is Overrated, Bura Na Mano, Renewal Hai, Club Nine: The Founders’ Table, Spin Class (Literally), Moving In Together (The 9-Month Lease), The 9:09 Panic Attack, The Cloud Nine 90, Don't Ghost Us After the Party, Auto-Reply: Out of Office, Still Squatting, Happy Hour (Zero Hangover, All Glutes), Private Practice, Rain Check (Literally), Kitty Party, But Make It Cardio, Team Building Without the Trust Falls, Freedom to Pause (Not Quit), Price Ki Azaadi (Freedom From Price Hikes), Lock It Before the Laddoos, Gold Rush (Dhanteras Edition), From Phuljhadi to Anaar, Black Friday Blind Box (No Duds), 11.11: Treat Yourself, Not Your Ex, The Advent-ure Calendar (Opens in January), Boxing Day (Gloves Optional). Watch each offer's “What to watch” measures and rate of sale monthly.",
        ],
      ],
      scorecard: [
        ['Leads → trials', '6,572', '3,352', 'Newcomer journeys'],
        ['Trials → new buyers', '3,352', '902', 'Newcomer journeys'],
        ['Renewals due → purchases', '1,289', '987', 'Renewal journeys'],
        ['Lapsed touches → reactivated', '7,258', '440', 'Lapsed journeys'],
        ['Target → offers planned', '₹420.0L', '₹264.4L', 'Plan of record'],
      ],
      funnel: {
        newShare: 0.15,
        avgFirstPurchase: 6776.34,
        visitsPerBuyer: 2.01,
        leadsPerVisit: 1.28,
        renewalShare: 0.4,
        winbackShare: 0.21,
        convNow: 33.09,
        convTarget: 40.21,
      },
      channels: [
        ['Website & online', 774, 25.1, 11.2],
        ['Hosted & walk-in', 394, 83.5, 6.1],
        ['Referrals', 224, 81.7, 40.6],
        ['Calls & WhatsApp', 190, 72.1, 44.7],
        ['Other', 140, 26.4, 15.7],
        ['Social & influencer', 23, 47.8, 26.1],
      ],
      slots: [
        ['Weekday · Early (before 9)', 49, 4333, 432],
        ['Weekday · Evening (4–7)', 48, 5613, 341],
        ['Weekday · Late evening (7+)', 51, 6300, 258],
        ['Weekday · Late morning (9–12)', 42, 4824, 554],
        ['Weekend · Afternoon (12–4)', 34, 2478, 30],
        ['Weekend · Early (before 9)', 20, 2056, 28],
        ['Weekend · Evening (4–7)', 42, 6302, 128],
        ['Weekend · Late morning (9–12)', 60, 6709, 318],
      ],
      monthly: {
        '2024': [
          1743644, 1416438, 1467829, 2946166, 1371263, 1318832, 1479662, 1627443, 2663280, 1369886, 1073076, 2693880,
        ],
        '2025': [
          2059180, 2057027, 1529392, 3125414, 1623868, 2008034, 2111894, 4479335, 2516678, 2634376, 1851052, 2685743,
        ],
        '2026': [2744705, 1921110, 2018321, 5001388, 2428386, 2180716, 2580030, 2996981, 3206431, null, null, null],
      },
      seasonality: [0.86, 0.86, 0.64, 1.31, 0.68, 0.84, 0.88, 1.87, 1.05, 1.1, 0.77, 1.12],
      entry: [
        ['Studio 1 Month Unlimited', 119, 15354, 41574, 55],
        ['Studio 12 Class Package', 68, 15099, 36472, 63],
        ['Studio 8 Class Package', 59, 10854, 24224, 46],
        ['Studio 4 Class Package', 58, 5963, 11557, 38],
        ['Studio Single Class', 147, 1710, 9898, 55],
        ['Studio Newcomers 2 For 1', 120, 1695, 8330, 31],
        ['Session', 279, 1840, 7836, 39],
      ],
    },
    Bandra: {
      name: 'Bandra',
      city: 'Mumbai',
      headline:
        '2027 plan of record: ₹228.2L target across twelve themed months; ₹156.3L is carried by named offers and the rest is full-price trade.',
      snapshot: [
        ['TTM revenue', '₹198.3L', '-3% vs prior 12 months', false],
        ['2027 target', '₹228.2L', '+15% on the last 12 months', true],
        ['Paying clients (TTM)', '940', '₹20,484 per client · ATV ₹9,187', true],
        ['New-client revenue', '16%', 'renewal 36% · return 23% · win-back 25%', true],
        ['Trial conversion', '23.3%', 'non-hosted · hosted 3.7%', false],
        ['Effective discount', '12.7%', '2025: 9.3%', false],
        ['Class fill', '45%', '5.8 per class · late-cancel 12.0%', true],
        ['Dormant 60–365 days', '680', '234 with 3+ past purchases', false],
      ],
      diagnosis: [
        {
          title: 'Renewals carry the year',
          stat: '51%',
          detail: 'Renewal plan ₹116.4L of ₹228.2L; 534 renewal purchases planned from 873 due.',
          implication:
            "Renewal offers: The Baker's Dozen, The 57-Hour Hangover Sale, Put a Ring On It, Monogamy Is Overrated, Bura Na Mano, Renewal Hai, Club Nine: The Founders’ Table, Spin Class (Literally), Moving In Together (The 9-Month Lease), The 9:09 Panic Attack, The Cloud Nine 90, Don't Ghost Us After the Party, Auto-Reply: Out of Office, Still Squatting, Happy Hour (Zero Hangover, All Glutes), Private Practice, Rain Check (Literally), Kitty Party, But Make It Cardio, Team Building Without the Trust Falls, Freedom to Pause (Not Quit), Price Ki Azaadi (Freedom From Price Hikes), Lock It Before the Laddoos, Gold Rush (Dhanteras Edition), From Phuljhadi to Anaar, Black Friday Blind Box (No Duds), 11.11: Treat Yourself, Not Your Ex, The Advent-ure Calendar (Opens in January), Boxing Day (Gloves Optional).",
        },
        {
          title: 'New clients',
          stat: '733',
          detail: 'New-client plan ₹61.6L: 6,525 leads → 3,394 trials → 733 new buyers.',
          implication:
            "Newcomer offers: Third Time's the Charm, Blind Date (No Catfishing), Love Bombing (The Healthy Kind), Lift Like a Girl, Party Crasher Pass, Plus One, Plus Nine, Mom Said Get Off the Couch, Group Project (Finally, Everyone Pulls Their Weight), Mom-entum, Shy Girl Starter Pack, No Strings Attached, Squad Goals, Squat Goals, Glow-Up or Give Back, Diwali Gifting, Minus the Dry-Fruit Box, Bride Squad, Assemble (Groom Can Come Too), Resolution Insurance (Claim Approved), The Gift They Won’t Regift.",
        },
        {
          title: 'Lapsed clients',
          stat: '373',
          detail: 'Reactivation plan ₹41.1L: 373 reactivated from 4,612 touches.',
          implication:
            "Lapsed offers: U Up? It's 2027, It’s Not You, It’s Your Schedule, Faking Your Own Death Didn’t Work, Gone With the Wind, Back With the Rain, We Need to Talk, New Phone, Who Dis?, Diwali Cleaning: Found Your Old Grip Socks?, Shaadi Mein Zaroor Aana (Come Back Before the Baraat), The Ex-Files: Season Finale.",
        },
        {
          title: 'Peak month: Apr',
          stat: '₹33.0L',
          detail:
            'Cloud Nine — 9 Years of Physique 57 · 9th anniversary: limited editions, the wheel, the 9:09 flash and the Golden Glute Awards.',
          implication:
            'Flagship month: win on excitement and economics. Two products that exist only in April (the 9-Month Lease and the 9-Class Pack), a 9:09 flash, a wheel you can double, numbered Club Nine annuals and a month of events, with no offer above 25% effective (cash ≤20% except annuals, the flash and the bulk pack). Every April buyer leaves with a reason to come back in May.',
        },
      ],
      build: {
        forecast2026: 19766420.88,
        momentum: -0.89,
        baseline: 19589680.86,
        levers: [
          {
            id: 'conversion',
            name: 'Trial-to-member conversion',
            value: 1459188,
            math: '1,087 non-hosted first visits × (23.3% → 30.9%) = +83 members × ₹24,008 first-year value × 0.73 in-year realisation',
            why: "Plan of record: carried by the newcomer offers — Third Time's the Charm, Blind Date (No Catfishing), Love Bombing (The Healthy Kind), Lift Like a Girl, Party Crasher Pass, Plus One, Plus Nine, Mom Said Get Off the Couch, Group Project (Finally, Everyone Pulls Their Weight), Mom-entum, Shy Girl Starter Pack, No Strings Attached, Squad Goals, Squat Goals, Glow-Up or Give Back, Diwali Gifting, Minus the Dry-Fruit Box, Bride Squad, Assemble (Groom Can Come Too), Resolution Insurance (Claim Approved), The Gift They Won’t Regift.",
          },
          {
            id: 'leads',
            name: 'Online-lead speed to trial',
            value: 168333,
            math: '1,145 online leads × trial rate 28.8% → 31.8% × 28% trial→member = +10 members × ₹24,008 × 0.73',
            why: "Plan of record: carried by the newcomer offers — Third Time's the Charm, Blind Date (No Catfishing), Love Bombing (The Healthy Kind), Lift Like a Girl, Party Crasher Pass, Plus One, Plus Nine, Mom Said Get Off the Couch, Group Project (Finally, Everyone Pulls Their Weight), Mom-entum, Shy Girl Starter Pack, No Strings Attached, Squad Goals, Squat Goals, Glow-Up or Give Back, Diwali Gifting, Minus the Dry-Fruit Box, Bride Squad, Assemble (Groom Can Come Too), Resolution Insurance (Claim Approved), The Gift They Won’t Regift.",
          },
          {
            id: 'referral',
            name: 'Paid-on-conversion referral engine',
            value: 588862,
            math: '299 referral leads × +50% volume × 22.4% lead→member = +33 members × ₹24,008 × 0.73',
            why: "Plan of record: carried by the newcomer offers — Third Time's the Charm, Blind Date (No Catfishing), Love Bombing (The Healthy Kind), Lift Like a Girl, Party Crasher Pass, Plus One, Plus Nine, Mom Said Get Off the Couch, Group Project (Finally, Everyone Pulls Their Weight), Mom-entum, Shy Girl Starter Pack, No Strings Attached, Squad Goals, Squat Goals, Glow-Up or Give Back, Diwali Gifting, Minus the Dry-Fruit Box, Bride Squad, Assemble (Groom Can Come Too), Resolution Insurance (Claim Approved), The Gift They Won’t Regift.",
          },
          {
            id: 'winback',
            name: 'Tiered win-back of dormant clients',
            value: 932979,
            math: '234 loyal dormant (3+ purchases) × +10pts return + 446 light dormant × +5pts = +46 returners × ₹33,755 avg return spend (×0.8 / ×0.4)',
            why: "Plan of record: carried by the lapsed offers — U Up? It's 2027, It’s Not You, It’s Your Schedule, Faking Your Own Death Didn’t Work, Gone With the Wind, Back With the Rain, We Need to Talk, New Phone, Who Dis?, Diwali Cleaning: Found Your Old Grip Socks?, Shaadi Mein Zaroor Aana (Come Back Before the Baraat), The Ex-Files: Season Finale.",
          },
          {
            id: 'discount',
            name: 'Swap % discounts for value-adds',
            value: 729228,
            math: 'Price: ₹220L gross × (12.7% → 9.3% effective discount) × 50% kept = ₹3.7L. Renewal: 446 discounted membership/pack sales × 60% moved to value-add × half the 14-pt repurchase gap × ₹19,617 = ₹3.6L',
            why: "Plan of record: carried by the renewal offers — The Baker's Dozen, The 57-Hour Hangover Sale, Put a Ring On It, Monogamy Is Overrated, Bura Na Mano, Renewal Hai, Club Nine: The Founders’ Table, Spin Class (Literally), Moving In Together (The 9-Month Lease), The 9:09 Panic Attack, The Cloud Nine 90, Don't Ghost Us After the Party, Auto-Reply: Out of Office, Still Squatting, Happy Hour (Zero Hangover, All Glutes), Private Practice, Rain Check (Literally), Kitty Party, But Make It Cardio, Team Building Without the Trust Falls, Freedom to Pause (Not Quit), Price Ki Azaadi (Freedom From Price Hikes), Lock It Before the Laddoos, Gold Rush (Dhanteras Edition), From Phuljhadi to Anaar, Black Friday Blind Box (No Duds), 11.11: Treat Yourself, Not Your Ex, The Advent-ure Calendar (Opens in January), Boxing Day (Gloves Optional).",
          },
          {
            id: 'usage',
            name: 'First-30-day habit programme',
            value: 64195,
            math: '43 unlimited memberships ended at ≤4 visits/month × 30% moved to 5–8 visits × +20pt renewal = +3 renewals × ₹16,283 × 1.5 cycles',
            why: "Plan of record: carried by the renewal offers — The Baker's Dozen, The 57-Hour Hangover Sale, Put a Ring On It, Monogamy Is Overrated, Bura Na Mano, Renewal Hai, Club Nine: The Founders’ Table, Spin Class (Literally), Moving In Together (The 9-Month Lease), The 9:09 Panic Attack, The Cloud Nine 90, Don't Ghost Us After the Party, Auto-Reply: Out of Office, Still Squatting, Happy Hour (Zero Hangover, All Glutes), Private Practice, Rain Check (Literally), Kitty Party, But Make It Cardio, Team Building Without the Trust Falls, Freedom to Pause (Not Quit), Price Ki Azaadi (Freedom From Price Hikes), Lock It Before the Laddoos, Gold Rush (Dhanteras Edition), From Phuljhadi to Anaar, Black Friday Blind Box (No Duds), 11.11: Treat Yourself, Not Your Ex, The Advent-ure Calendar (Opens in January), Boxing Day (Gloves Optional).",
          },
          {
            id: 'privates',
            name: 'Build a privates line',
            value: 393188,
            math: 'Privates to 3% of revenue (₹5.9L) from ₹0.3L TTM × 70% year-one',
            why: '',
          },
          {
            id: 'annual',
            name: 'Long-plan renewal desk',
            value: 335253,
            math: '20 annual/6-month plans worth ₹27.9L expire in 2027 × +20pt renewal × 60% of original value (many step down to 3-month/1-month)',
            why: "Plan of record: carried by the renewal offers — The Baker's Dozen, The 57-Hour Hangover Sale, Put a Ring On It, Monogamy Is Overrated, Bura Na Mano, Renewal Hai, Club Nine: The Founders’ Table, Spin Class (Literally), Moving In Together (The 9-Month Lease), The 9:09 Panic Attack, The Cloud Nine 90, Don't Ghost Us After the Party, Auto-Reply: Out of Office, Still Squatting, Happy Hour (Zero Hangover, All Glutes), Private Practice, Rain Check (Literally), Kitty Party, But Make It Cardio, Team Building Without the Trust Falls, Freedom to Pause (Not Quit), Price Ki Azaadi (Freedom From Price Hikes), Lock It Before the Laddoos, Gold Rush (Dhanteras Edition), From Phuljhadi to Anaar, Black Friday Blind Box (No Duds), 11.11: Treat Yourself, Not Your Ex, The Advent-ure Calendar (Opens in January), Boxing Day (Gloves Optional).",
          },
        ],
        leverTotal: 4671226.32,
        haircut: 0.15,
        projection: 23560223.23,
        appTargetAtBuild: 22820000,
      },
      offers: [
        {
          name: "Third Time's the Charm",
          tag: 'Acquisition',
          months: 'Jan',
          audience: 'First-time clients (phone verified).',
          mechanic:
            '3-class pass: ₹3,885. Replaces the Newcomers 2-for-1 for January. Mumbai: 3 classes for ₹3,885 (price of 2 singles) — mix barre, powerCycle and Strength Lab (Lab seats at Supreme HQ; Kwality off-peak only), use within 14 days. Kenkere: 3 barre classes for ₹2,835 (counts as the once-in-a-lifetime 2-for-1; replaces the 50% intro in January). Then the standard 15% on a first membership: 1 Month ₹17,203 / ₹12,406.',
          economics:
            '33% effective (OK: intro/acquisition product, credited/converted at ≤20%). ₹3.1L counted · 18 buyers',
          logic:
            '60.6% of first-timers never take a 2nd class. Purchase within 60 days by month-1 visits: 0 return visits 10.8%, 1 → 43.9%, 2 → 73.3%, 3–4 → 88.6%. The 2-for-1 route converts 20.8% (Bandra 17%). A third class moves people into the 73–89% band.',
          kpi: 'Packs with all 3 classes used in 14 days (target 60%); pack → membership (target 35% vs 20.8% on 2-for-1).',
          lever: 'conversion',
        },
        {
          name: "U Up? It's 2027.",
          tag: 'Win-back',
          months: 'Jan',
          audience: 'Standard lapsed 15%, bonus earned (≈20% effective if earned)',
          mechanic:
            '1M unlimited: ₹17,203 (15% off the ₹20,239 list price). Lapsed 61–365 days: the standard 15% on 1 Month (₹17,203 / ₹12,406) or a 12-class pack (₹16,735 / ₹11,156). Take 12 classes by 31 Jan and get +5 days (pack buyers: +1 class). Pop-ups: 15% on an 8- or 10-class pack (₹5,891 / ₹7,229) and +1 class for 6 classes by 31 Jan.',
          economics: '20% effective (OK: ≤20% effective). ₹1.9L counted · 11 buyers',
          logic:
            'Bandra is reactivation-led (3,209 lapsed vs 5,065 renewed membership records). Renewal climbs with usage: Bandra members using <50% of sessions renew 49–58% vs 82% at 75%+. The bonus is only paid for attendance that predicts the next renewal.',
          kpi: 'Lapsed buyers; share hitting 12 classes (target 40%); Feb renewal of Jan winbacks.',
          lever: 'winback',
        },
        {
          name: "The Baker's Dozen",
          tag: 'Renewal',
          months: 'Jan',
          audience: '≈21',
          mechanic:
            'annual unlimited: ₹1,86,533 (15% off the ₹2,19,450 list price). Annual Unlimited at 15% off — Mumbai ₹1,86,533 (list ₹2,19,450), Kenkere ₹1,32,804 (list ₹1,56,240) — for 13 months instead of 12, plus the standard annual perks (2 privates, 4 guest passes, 1 hosted class, monthly trainer check-ins).',
          economics: '21.5% effective (OK: annual (≤25%)). ₹5.6L counted · 3 buyers',
          logic:
            "Annual is Kwality's #1 product (32 units, ₹51.6L in the last 12 months) and Bandra's #3 (15 units, ₹23.8L). The ANN-2026-25%-KH code gave away ₹9.7L at a flat 25%; this gives less cash away (≈21.5% effective) and adds time, which costs little at spare capacity.",
          kpi: 'Annual re-up rate (target 75%); 3M/6M → annual upgrades.',
          lever: 'annual',
        },
        {
          name: 'The 57-Hour Hangover Sale',
          tag: 'Renewal',
          months: 'Jan',
          audience: 'Everyone, while the capped stock lasts; one per person.',
          mechanic:
            '1M unlimited: ₹15,000 (26% off the ₹20,239 list price). 1 Month Unlimited at a flat ₹15,000 in Mumbai (list ₹20,239, 26% off) or ₹10,000 at Kenkere (list ₹14,595, 31% off). Fri 1 Jan 00:00 to Sun 3 Jan 09:00 — 57 hours. Capped at 57 memberships per city, 1 per person, activate by 15 Jan.',
          economics: '26% effective (OK: spot offer (cap waived)). ₹2.1L counted · 14 buyers',
          logic:
            'January is the strongest non-April month in Mumbai (Jan-26: Kwality ₹27.4L, Bandra ₹20.0L; Kenkere ₹11.1L). A capped spot price creates urgency without training clients to wait — only 57 units per city, so the maximum discount exposure is ~₹3.0L in Mumbai and ~₹2.6L in Bengaluru.',
          kpi: 'Sell-out time; share of spot buyers renewing in Feb at standard price (target 55%).',
          lever: 'annual',
        },
        {
          name: 'Blind Date (No Catfishing)',
          tag: 'Acquisition',
          months: 'Feb',
          audience: 'First-time clients (phone verified).',
          mechanic:
            '1M unlimited: ₹16,204 (20% off the ₹20,239 list price). Mumbai: 2 mystery classes in 10 days for ₹999. The format (Barre, powerCycle or Strength Lab) and the trainer stay sealed in an envelope until you walk in; date two is booked at the desk before you leave. Kenkere: 2 mystery Barre classes (trainer and playlist sealed) for ₹709. Pop-ups: the paid trial (≈₹945), with the second class free if it is booked at the desk. Buy within 72 hours of date two and the ₹999 / ₹709 is credited against 1 Month at the standard 15% (₹16,204 / ₹11,697 net). Pop-ups: 8-class pack at 15% (₹5,891).',
          economics: '20% effective (OK: ≤20% effective). ₹2.3L counted · 14 buyers',
          logic:
            'Kenkere’s VDAY50! code (38 uses, ₹2.6L given away at 50%) bought February volume at a huge cost. A booked second visit lifts trial→member from 10.8% to 43.9%, and a mystery format gets newcomers into the class they would never pick, which is usually the one that sells the membership.',
          kpi: 'Second-date booked at the desk (target 70%); trial → member (target 30%).',
          lever: 'conversion',
        },
        {
          name: 'Love Bombing (The Healthy Kind)',
          tag: 'Acquisition',
          months: 'Feb',
          audience: 'Current members bringing a never-been friend.',
          mechanic:
            '1M unlimited: ₹17,203 (15% off the ₹20,239 list price). Every active member gets three printed love letters at the desk (and a WhatsApp version). Each one gives a never-been friend 2 free classes within 14 days. If the friend buys 1 Month or a 12-class pack within 72 hours of class 2: their standard 15% (₹17,203 / ₹12,406; pop-ups 8-class ₹5,891) plus P57 grip socks, and the member gets +5 days (pack: +1 class) per friend who buys, up to 15 days. Partner Barre on Sun 14 Feb counts as class 2.',
          economics: '18% effective (OK: ≤20% effective). ₹1.4L counted · 8 buyers',
          logic:
            'Referrals convert 41.2% at Kwality, 22.6% at Bandra, 28.3% at Kenkere and 76.1% at pop-ups, versus 3.8–5.7% for website leads. The 2026 BOGO codes (70 uses, ₹3.1L given) went mostly to existing clients; this one pays out only when a genuinely new person buys.',
          kpi: 'Letters redeemed; new buyers from referral (target +40% vs Feb-26).',
          lever: 'conversion',
        },
        {
          name: 'It’s Not You, It’s Your Schedule',
          tag: 'Win-back',
          months: 'Feb',
          audience: 'Lapsed 61–365 days.',
          mechanic:
            '12-class pack: ₹17,203 (13% off the ₹19,688 list price). Lapsed 61–365 days pick a relationship status at the standard 15%: Exclusive = 3 Months (₹49,177 / ₹35,879) + 1 extra freeze; Casual = a 12-class pack (₹16,735 / ₹11,156); It’s Complicated = 1 Month (₹17,203 / ₹12,406) + 1 free freeze for the week life gets in the way. Pop-ups: 8-class pack at 15% (₹5,891). Galentine’s class Sat 13 Feb: bring a friend free.',
          economics: '15% effective (OK: ≤20% effective). ₹1.0L counted · 6 buyers',
          logic:
            'Lapsers average 2.6–3.4 visits in the first half of a membership vs 6.4 for renewers: they left because the plan did not fit the week, not because of the price. Letting them pick the commitment removes the objection without deepening the discount.',
          kpi: 'Reactivations; mix of Exclusive / Casual / Complicated (target 30% Exclusive).',
          lever: 'winback',
        },
        {
          name: 'Put a Ring On It',
          tag: 'Renewal',
          months: 'Feb',
          audience: 'Members renewing in February (any expiry date).',
          mechanic:
            '6M unlimited: ₹96,658 (15% off the ₹1,13,715 list price). Any February renewal: 3 Months at 15% (₹49,177 / ₹35,879) + a P57 mini-band “ring”; 6 Months at 15% + 1 private session (₹96,658 / ₹69,883); Annual at the standard 20% + the annual perks + your name engraved on the Wall of Commitment. Say yes at the desk and the bell rings, confetti, the class applauds. Pop-ups: 10-class pack at 10% + the mini-band (₹7,655).',
          economics: '20% effective (OK: ≤20% effective). ₹7.8L counted · 13 buyers',
          logic:
            'Members using 75%+ of their sessions renew at 82–88%, and longer plans keep them using them. The best perks sit on the longest plans; nothing is unlocked by a class count, so every renewer qualifies.',
          kpi: '3M+ share of renewal value (target 45%); proposals accepted at the desk.',
          lever: 'annual',
        },
        {
          name: 'Lift Like a Girl',
          tag: 'Acquisition',
          months: 'Mar',
          audience: 'First-time clients (phone verified).',
          mechanic:
            '1M unlimited: ₹17,203 (15% off the ₹20,239 list price). Supreme HQ only, Mon 8–Sun 14 Mar: women new to P57 get their first Strength Lab class free (normally needs the 2-for-1), in off-peak Lab slots. Book a second class before leaving and buy 1 Month or a 12-class pack within 72 hours: the standard 15% (₹17,203 / ₹16,735) plus a free Lab induction seat for a friend.',
          economics: '15% effective (OK: ≤20% effective). ₹1.7L counted · 10 buyers',
          logic:
            "Bandra's Lab runs ~48% full vs Kwality's 83%, so Kwality is excluded. Strength/powerCycle-first visits convert 20.4% vs barre 25.6% today — this tests whether a free, coached Lab first visit closes that gap.",
          kpi: 'Lab first visits; Lab-first → purchase vs barre trial (target ≥25%).',
          lever: 'conversion',
        },
        {
          name: 'Monogamy Is Overrated',
          tag: 'Renewal',
          months: 'Mar',
          audience: 'No price discount; ≈17% value on a 12-class pack, ≈16% on 1M if the bonus is earned',
          mechanic:
            "1M unlimited: ₹19,688 (3% off the ₹20,239 list price). For members who've used one format in the last 60 days. Pack members renew at list and get 2 bonus classes valid only in formats they've never tried (Mumbai: powerCycle / Strength Lab induction / Cardio Barre; Kenkere: Cardio Barre / Mat 57 / Foundations). Unlimited members renew at list and get +5 days if they take 3 different formats in their first 30 days.",
          economics: '17% effective (OK: ≤20% effective). ₹3.9L counted · 20 buyers',
          logic:
            'One-format members renew 58–67% vs 85–87% for members on 4+ formats. Bonus classes cost little in off-peak slots and target the single biggest renewal predictor after attendance.',
          kpi: 'Members trying a new format (target 40% of eligible); 60-day renewal of exposed vs unexposed members.',
          lever: 'annual',
        },
        {
          name: 'Bura Na Mano, Renewal Hai',
          tag: 'Renewal',
          months: 'Mar',
          audience: 'Members expiring 1–31 Mar only',
          mechanic:
            "3M unlimited: ₹49,177 (15% off the ₹57,855 list price). Holi, Sun 21–Mon 22 Mar (48 hours): 3 Months at 15% off (₹49,177 / ₹35,879) or a 12-class pack at 10% (₹17,719 / ₹11,813), each with a limited-edition 'Holi Hai' P57 tee (retail ≈₹2,000 — confirm).",
          economics: '18.5% effective (OK: ≤20% effective). ₹4.4L counted · 9 buyers',
          logic:
            'In 2026 Kwality did ₹20.2L in March, then ₹50.0L in April at 20.4% discount depth — March renewals waited. A short, fun window with a 3M upgrade pulls them forward at ≤20% effective.',
          kpi: 'March renewal yield (target 70%); 3M share of March renewals.',
          lever: 'annual',
        },
        {
          name: 'Party Crasher Pass',
          tag: 'Acquisition',
          months: 'Apr',
          audience: 'First-time clients (phone verified).',
          mechanic:
            '1M unlimited: ₹16,204 (20% off the ₹20,239 list price). Mumbai: 3 classes in 9 days for ₹999, any format, including a Birthday Bash party class (17–18 Apr). Kenkere: 3 Barre classes for ₹699 (replaces the 50% intro in April; counts as the once-in-a-lifetime 2-for-1). Pop-ups: 2 classes for ₹999. The pass price is credited against a first 1 Month or 12-class pack bought within 72 hours of class 3, on top of the standard 15% (1 Month nets ₹16,204 / ₹11,707). Buy within 9 hours of class 3 and you hit the Impulse Buzzer: confetti, applause, name on the Reckless Decisions board.',
          economics: '20% effective (OK: ≤20% effective). ₹2.4L counted · 15 buyers',
          logic:
            'A booked sequence of classes is what converts; the party class gives newcomers the best room of the year, and the buzzer turns a sale into a show for whoever is waiting.',
          kpi: 'Pass → member (target 35%); buzzer hits (bought within 9 hours).',
          lever: 'conversion',
        },
        {
          name: 'Plus One, Plus Nine',
          tag: 'Acquisition',
          months: 'Apr',
          audience: 'Current members bringing a never-been friend.',
          mechanic:
            '1M unlimited: ₹17,203 (15% off the ₹20,239 list price). Any active member whose never-been friend buys in April gets +9 days (pack members: +2 classes). Three buying friends = a free month. The friend gets the standard 15% and a Cloud Nine tote. Bring Your Barre-stie day (Thu 8 Apr): every member gets a free guest pass.',
          economics: '15% effective (OK: ≤20% effective). ₹1.0L counted · 6 buyers',
          logic:
            'Referrals convert at 22–76% against 3.8–5.7% for website leads. A tier at three friends gives the super-connectors a reason to keep going.',
          kpi: 'Referral buyers (target 2× April 2026); members reaching three.',
          lever: 'conversion',
        },
        {
          name: 'Faking Your Own Death Didn’t Work',
          tag: 'Win-back',
          months: 'Apr',
          audience: 'Lapsed 61 days–3 years.',
          mechanic:
            '1M unlimited: ₹17,203 (15% off the ₹20,239 list price). Lapsed 61 days–3 years get an obituary postcard (“Here lies a perfectly good plank”). It is the ticket to the candle-lit Séance Class on Thu 15 Apr. Come back on the standard 15% on 1 Month, a 12-class pack or 3 Months, plus a bonus for every year since your first class (max 3): +1 class on packs, +1 day on unlimited. Photo at the Back From the Dead frame; your row at the Throwback Reunion (Sat 24 Apr).',
          economics: '20% effective (OK: ≤20% effective). ₹2.2L counted · 13 buyers',
          logic:
            'Lapsed clients already know the product; what they need is a moment and a reason that is not just a discount. A personal postcard with a dated class beats a generic reminder.',
          kpi: 'Postcards → Séance Class attendance; reactivations (target +30% vs Apr-26).',
          lever: 'winback',
        },
        {
          name: 'Club Nine: The Founders’ Table',
          tag: 'Renewal',
          months: 'Apr',
          audience: 'Members on 3-Month or longer plans; annual renewers.',
          mechanic:
            'annual unlimited: ₹1,75,560 (20% off the ₹2,19,450 list price). 9 numbered Annual Unlimited seats per studio at the standard 20% (₹1,75,560 / ₹1,24,992) with the annual perks doubled: 4 privates, 8 guest passes, 2 hosted classes, monthly trainer check-ins, a numbered jacket, your name on the Club Nine wall and 48-hour priority booking all year. Unveiled at the Birthday Bash on Sat 17 Apr.',
          economics: '25% effective (OK: annual (≤25%)). ₹5.3L counted · 3 buyers',
          logic:
            'Annual buyers are the most valuable members in the book; a numbered seat with doubled perks costs less than a deeper price and gives them something to show off.',
          kpi: 'Seats sold (9 per studio); annual share of April renewals.',
          lever: 'annual',
        },
        {
          name: 'Spin Class (Literally)',
          tag: 'Renewal',
          months: 'Apr',
          audience: 'Members renewing 1 Month or a 12-class pack.',
          mechanic:
            '1M unlimited: ₹18,215 (10% off the ₹20,239 list price). Renew 1 Month or a 12-class pack in April at 10% off (₹18,215 / ₹17,719; Kenkere ₹13,136 / ₹11,813; pop-up 10-pack ₹7,655) and spin the Wheel of Nine. Published odds: +1 class 30%, smoothie 20%, guest pass 15%, grip socks 10%, +3 days 10%, extra freeze 8%, 30-min private 5%, P57 tote 1.5%, a free month 0.5%. Then choose: keep it, double it by booking 9 classes in your first 21 days, or donate it to a friend as a guest pass.',
          economics: '19.5% effective (OK: ≤20% effective). ₹5.5L counted · 30 buyers',
          logic:
            'Clients who use 75%+ of their sessions renew at 80–86%. The doubling option pays the prize only when the member books the classes that make them renew again; the expected value of a spin is ≈₹1,900 Mumbai / ₹1,350 Bengaluru.',
          kpi: 'April renewal yield vs April 2026; share of spins doubled (target 35%).',
          lever: 'annual',
        },
        {
          name: 'Moving In Together (The 9-Month Lease)',
          tag: 'Renewal',
          months: 'Apr',
          audience: 'Members ready for a long commitment and returning clients who want the best price of the year.',
          mechanic:
            '9M unlimited: ₹1,44,999. A 9-Month Unlimited that exists only in April: Mumbai ₹1,44,999 (a 6-Month plus a 3-Month cost ₹1,71,570), Kenkere ₹1,02,999 (₹1,24,425). 9 freezes (min 3 days each), the anniversary hoodie, a numbered brass studio key and your name on the Lease Wall. 99 numbered keys across Kwality and Supreme HQ, 39 at Kenkere; a live counter on the studio screens.',
          economics: '17.5% effective (OK: ≤20% effective). ₹5.8L counted · 4 buyers',
          logic:
            'A numbered, one-month-only product gives people a reason to buy now without cutting the price of the core memberships. April 2026 was bought with 40–48% codes; scarcity sells the long plan at 17.5–20% instead.',
          kpi: 'Keys sold vs 99 / 39; 6M+ share of April membership revenue (target 50%).',
          lever: 'annual',
        },
        {
          name: 'The 9:09 Panic Attack',
          tag: 'Renewal',
          months: 'Apr',
          audience: 'Everyone: members, pack buyers and newcomers.',
          mechanic:
            '9-class pack: ₹11,499. The Limited Edition 9-Class Pack (99 days to use it) exists only in April. Plank Your Price at the desk: hold 57 seconds and it is ₹12,999 (Kenkere ₹8,699), 1:57 for ₹12,249 (₹8,199), 2:57 for the floor, ₹11,499 (₹7,699). On Fri 9 Apr, two 99-minute windows from 9:09 am and 9:09 pm give everyone the floor price, no plank needed: siren in studio, countdown on Instagram. Pop-ups: a 9-class pack at ₹6,499 in the same windows.',
          economics: '23.7% effective (OK: spot offer (≤25%)). ₹1.4L counted · 12 buyers',
          logic:
            'A price you earn with your body is the most Physique 57 thing there is, and every plank at the desk is a show for whoever is waiting. The floor price (23.7% / 24.0%) sits inside the 25% spot cap, and plan revenue is counted at the floor.',
          kpi: 'Packs sold in the two 9:09 windows; pack → membership by June.',
          lever: 'annual',
        },
        {
          name: 'The Cloud Nine 90',
          tag: 'Renewal',
          months: 'Apr',
          audience: 'High-frequency pack buyers.',
          mechanic:
            '90-class pack: ₹1,34,999. 90 classes valid for 12 months: Mumbai ₹1,34,999 (₹1,500 a class; 90 singles cost ₹1,74,825 at list, so 22.8% off), Bengaluru ₹99,999 (₹1,111 a class against ₹1,27,575, 21.6% off). April only, any format.',
          economics: '22.8% effective (OK: bulk purchase (≤25%)). ₹1.3L counted · 1 buyers',
          logic:
            'The Anniversary Big 85 Flex sold 4 times at Kemps Corner and once at Kenkere House in April 2026; this replaces it at a price inside the bulk cap.',
          kpi: 'Packs sold; classes used per month of the pack.',
          lever: 'annual',
        },
        {
          name: 'Mom Said Get Off the Couch',
          tag: 'Acquisition',
          months: 'May',
          audience: 'First-time clients (phone verified).',
          mechanic:
            '8-class pack: ₹10,500 (20% off the ₹13,125 list price). Students and under-25s (ID checked): 8-class pack at 20% off — Mumbai ₹10,500, Kenkere ₹6,972, pop-ups ₹5,544 — valid 45 days, Golden Hours only (Mon–Fri 10 am–12 pm, Sat–Sun 4–7 pm). On sale 1 May–30 Jun.',
          economics: '20% effective (OK: ≤20% effective). ₹1.3L counted · 12 buyers',
          logic:
            'Weekday 10–12 and weekend 4–7 pm run 27–41% full; the marginal cost of a seat there is near zero. Students arriving home in May are a predictable, untapped audience.',
          kpi: 'Golden Hours fill (target +15 pts); student repeat purchase.',
          lever: 'conversion',
        },
        {
          name: 'Group Project (Finally, Everyone Pulls Their Weight)',
          tag: 'Acquisition',
          months: 'May',
          audience: 'First-time clients (phone verified).',
          mechanic:
            '8-class pack: ₹9,844 (25% off the ₹13,125 list price). 4+ students buy 8-class packs together in one transaction: 25% off each — Mumbai ₹9,844, Kenkere ₹6,536, pop-ups ₹5,198. Golden Hours validity, 45 days.',
          economics: '25% effective (OK: bulk purchase (≤25%)). ₹0.8L counted · 8 buyers',
          logic:
            'Bulk purchase is one of the few places 25% is allowed. Groups attend together (higher usage → higher renewal) and bring four new names per sale.',
          kpi: 'Squads sold; squad members buying again within 60 days.',
          lever: 'conversion',
        },
        {
          name: 'Mom-entum',
          tag: 'Acquisition',
          months: 'May',
          audience: 'First-time clients (phone verified).',
          mechanic:
            "1M unlimited: ₹17,203 (15% off the ₹20,239 list price). Mother–child pairs (either way round), 1–16 May. If one is new: the newcomer's standard 15% on 1 Month / 12-class, a shared 30-min duo private and a P57 gift for mum (≈₹2,000 retail — confirm). If both are members: renew together at 10% each + the duo private.",
          economics: '18% effective (OK: ≤20% effective). ₹1.0L counted · 6 buyers',
          logic:
            "Duos with a booked second class convert best; Mother's Day gives a reason. The perk is a shared session, not a bigger discount.",
          kpi: 'Duos trialled; both-buy rate.',
          lever: 'conversion',
        },
        {
          name: "Don't Ghost Us After the Party",
          tag: 'Renewal',
          months: 'May',
          audience: '≈20% effective on 3M, ≈20% on 1M with the private',
          mechanic:
            '3M unlimited: ₹49,177 (15% off the ₹57,855 list price). Everyone who bought in April and takes 8+ classes in May: next renewal 3 Months at 15% (₹49,177 / ₹35,879) or 1 Month at 10% (₹18,215 / ₹13,136), plus a 30-min private. Pop-ups: 10-class pack at 15% + a bonus class.',
          economics: '19.5% effective (OK: ≤20% effective). ₹6.0L counted · 20 buyers',
          logic:
            '2026 anniversary-code buyers renewed at only 24.5%. Attendance in the month after purchase is the best predictor of renewal; the reward is earned by it.',
          kpi: 'April cohort with 8+ May visits (target 55%); April cohort renewal at next expiry (target 55%).',
          lever: 'annual',
        },
        {
          name: 'Shy Girl Starter Pack',
          tag: 'Acquisition',
          months: 'Jun, Jul',
          audience: 'First-time clients (phone verified).',
          mechanic:
            '1M unlimited: ₹16,204 (20% off the ₹20,239 list price). For nervous starters: a 30-min private + one group class within 7 days for ₹1,999 (Kenkere ₹1,499). ₹999 (Kenkere ₹749) is credited against a first 1 Month or 12-class pack bought within 72 hours, with the standard 15% — 1 Month nets ₹16,204 / ₹11,657.',
          economics: '20% effective (OK: ≤20% effective). ₹0.8L counted · 5 buyers',
          logic:
            'Half of CRM leads never trial (Bandra 1,114 of 2,317; Kenkere 2,053 of 3,217). A private first visit removes the intimidation barrier. No historical data on private-first conversion — this is a test.',
          kpi: "Packs sold to 'Not Tried' leads; private-first → member (target 40%).",
          lever: 'conversion',
        },
        {
          name: 'Auto-Reply: Out of Office, Still Squatting',
          tag: 'Renewal',
          months: 'Jun',
          audience: 'No price discount; ≈9% value from virtual privates',
          mechanic:
            '3M unlimited: ₹57,855 (list price). 3 Months Unlimited at list (₹57,855 / ₹42,210) with unlimited freezes (blocks of 3+ days, plan must end within 6 months) and 2 virtual 30-min privates to use while travelling.',
          economics: '9% effective (OK: ≤20% effective). ₹6.9L counted · 12 buyers',
          logic:
            'Travel is the main reason members lapse in June–July. Flexibility removes the reason; list price protects the ticket. Virtual privates cost trainer time only.',
          kpi: '1M → 3M upgrades; June–July lapse rate vs 2026.',
          lever: 'annual',
        },
        {
          name: 'Happy Hour (Zero Hangover, All Glutes)',
          tag: 'Renewal',
          months: 'Jun',
          audience: 'Members and newcomers buying private sessions.',
          mechanic:
            '60-minute private session: ₹4,200 (20% off the ₹5,250 list price). Privates booked in quiet hours (Mon–Fri 12–4 pm, Sat 1–4 pm): 20% off a single private (Mumbai ₹4,200 vs ₹5,250; Kenkere 20% off list) and a free 30-min virtual private with every 2 in-studio privates booked in June.',
          economics: '20% effective (OK: ≤20% effective). ₹2.2L counted · 26 buyers',
          logic:
            "Privates are 6.2% of Kwality's revenue (₹20.1L in 12 months) but only ₹31k at Bandra — the biggest product gap in the portfolio. Quiet-hour pricing uses capacity that is otherwise unpaid.",
          kpi: 'Privates booked 12–4 pm; Bandra privates revenue (target ₹1.5L in June).',
          lever: 'annual',
        },
        {
          name: 'Private Practice',
          tag: 'Renewal',
          months: 'Jun',
          audience: 'Members and newcomers buying private sessions.',
          mechanic:
            '10-class pack of privates: ₹39,375. 10-private pack at 25% off — Mumbai ₹39,375 (list ₹52,500); Kenkere 25% off list — valid 6 months, with a posture and strength assessment in session one. 20-pack: 25% off plus a P57 retail kit.',
          economics: '25% effective (OK: bulk purchase (≤25%)). ₹1.2L counted · 3 buyers',
          logic:
            "Bulk private purchase is one of the allowed 25% cases. Kwality's PR1V@TE10 code (39 uses) shows demand; a pack converts one-off buyers into a 6-month relationship.",
          kpi: 'Packs sold; trainer utilisation.',
          lever: 'annual',
        },
        {
          name: 'Gone With the Wind, Back With the Rain',
          tag: 'Win-back',
          months: 'Jul',
          audience: 'Standard lapsed 15% only',
          mechanic:
            '1M unlimited: ₹17,203 (15% off the ₹20,239 list price). Lapsed 61–365 days, 15–31 Jul: the standard 15% on 1 Month or a 12-class pack + 2 extra freezes + a 15-min comeback assessment + first access to August’s Freedom Weekend.',
          economics: '15% effective (OK: ≤20% effective). ₹2.4L counted · 14 buyers',
          logic:
            'An event with a start date beats a generic reminder. Freezes answer the monsoon objection at no cash cost.',
          kpi: 'Reactivations; comeback assessments booked.',
          lever: 'winback',
        },
        {
          name: 'Rain Check (Literally)',
          tag: 'Renewal',
          months: 'Jul',
          audience: '≈15% effective',
          mechanic:
            '1M unlimited: ₹18,215 (10% off the ₹20,239 list price). July 1 Month renewers: 10% off (₹18,215 / ₹13,136) + 3 late-cancel amnesty tokens (valid to 30 Sep) + automatic credit-back on official red-alert days. Take 12+ classes in July: +3 days. Pop-ups: 10-class pack at 10% + 2 tokens.',
          economics: '15% effective (OK: ≤20% effective). ₹3.6L counted · 20 buyers',
          logic:
            "Average late cancels per membership: Bandra 1.18, Kenkere 1.36. Late-cancel fees in the monsoon make members feel they 'wasted' a month and lapse.",
          kpi: 'July 1M renewal yield (target 70%); tokens used.',
          lever: 'annual',
        },
        {
          name: 'Kitty Party, But Make It Cardio',
          tag: 'Renewal',
          months: 'Jul',
          audience: 'Anyone booking the studio for a private group of up to 12.',
          mechanic:
            "1-class pass (studio bookout for up to 12): ₹24,999. Book out the studio for a private 50-min class for up to 12 (birthdays, bachelorettes, kitty parties, reunions): Mumbai ₹24,999, Kenkere ₹14,999, pop-ups ₹9,999. Every first-timer gets Third Time's the Charm (3-for-2) and the standard 15% on a first membership within 7 days; the host gets 2 guest passes.",
          economics: '0% effective (OK: ≤20% effective). ₹0.7L counted · 3 buyers',
          logic:
            'Hosted classes are a top lead source (Kwality 394, Bandra 353, Kenkere 281 leads) but convert only 4.6–6.1%. A paid bookout has a host who brings warm friends and pays for the room.',
          kpi: 'Bookouts sold; guest → member (target 15%).',
          lever: 'annual',
        },
        {
          name: 'Team Building Without the Trust Falls',
          tag: 'Renewal',
          months: 'Jul',
          audience: 'Offices, HR and team leads; 10+ units on one invoice.',
          mechanic:
            '1M unlimited: ₹15,179 (25% off the ₹20,239 list price). A company buys 10+ memberships or packs on one invoice: 25% off each (1 Month ₹15,179 Mumbai / ₹10,946 Kenkere). Or book a corporate studio bookout and get a 15% employee code for 30 days.',
          economics: '25% effective (OK: bulk purchase (≤25%)). ₹1.5L counted · 10 buyers',
          logic:
            'Bulk purchase is an allowed 25% case. Corporate buyers bring 10+ new members per sale and fit the monsoon trough.',
          kpi: 'Corporate deals.',
          lever: 'annual',
        },
        {
          name: 'No Strings Attached',
          tag: 'Acquisition',
          months: 'Aug',
          audience: 'First-time clients (phone verified).',
          mechanic:
            '1M unlimited: ₹16,204 (20% off the ₹20,239 list price). Mumbai: 2 classes in 7 days for ₹999 (any format), credited against 1 Month at the standard 15% bought within 72 hours (₹16,204 net). Kenkere: 2 Barre classes for ₹709, credited the same way (₹11,697 net). Pop-ups: paid trial (≈₹945) → 8-class pack at 15% (₹5,891). The No-Strings clause: in the first 14 days of the month, if it is not for you, the desk converts what is left into an 8-class pack (60 days). No break-up fee, no awkward conversation.',
          economics: '20% effective (OK: ≤20% effective). ₹2.4L counted · 15 buyers',
          logic:
            'Clients with 5+ visits in month one buy again at 93.5%. A break-up clause costs almost nothing (few use it) and answers the objection the desk hears most: “what if I can’t keep it up?”.',
          kpi: 'Trial → member (target 35%); No-Strings switches (expect <10%).',
          lever: 'conversion',
        },
        {
          name: 'Squad Goals, Squat Goals',
          tag: 'Acquisition',
          months: 'Aug',
          audience: 'Current members bringing 2–4 never-been friends.',
          mechanic:
            '1M unlimited: ₹17,203 (15% off the ₹20,239 list price). Friendship Day (Sun 1 Aug) to 15 Aug, siblings count for Raksha Bandhan: a member books a free Squad Class for 2–4 never-been friends. Friends who buy 1 Month or a 12-class pack within 7 days get their standard 15% (₹17,203 / ₹12,406; pop-ups 8-class ₹5,891) and friendship-band grip socks; the member gets +5 days (pack: +1 class) per friend who buys, up to 15 days.',
          economics: '18.5% effective (OK: ≤20% effective). ₹1.2L counted · 7 buyers',
          logic:
            'Referrals convert at 22–76%; friends who start together come together. A free group class lowers the bar for the nervous friend, and the member is paid only when someone buys.',
          kpi: 'Squad Classes booked; friend → purchase (target 30%).',
          lever: 'conversion',
        },
        {
          name: 'Freedom to Pause (Not Quit)',
          tag: 'Renewal',
          months: 'Aug',
          audience: 'Members renewing in August.',
          mechanic:
            '6M unlimited: ₹96,658 (15% off the ₹1,13,715 list price). Any August renewal: 3 Months at 15% (₹49,177 / ₹35,879) + 2 Freedom Freezes (min 3 days each, any time Sep–Nov, made for Ganeshotsav and Diwali travel); 6 Months at 15% + 1 private + 3 Freedom Freezes (₹96,658 / ₹69,883); Annual at the standard 20% + perks + 4 Freedom Freezes. Pop-ups: 10-class pack at 15% + 30 extra days of validity (₹7,229).',
          economics: '19.6% effective (OK: ≤20% effective). ₹10.1L counted · 24 buyers',
          logic:
            'Members lapse in Sep–Nov when travel breaks the habit. A freeze keeps them paying and coming back instead of cancelling; freezes have no cash cost, so the cash discount stays at the standard 15%.',
          kpi: 'Renewal yield vs Aug-26; Sep–Nov lapse rate of August renewers.',
          lever: 'annual',
        },
        {
          name: 'Price Ki Azaadi (Freedom From Price Hikes)',
          tag: 'Renewal',
          months: 'Aug',
          audience: 'Members and returning clients; annual renewers due Aug–Nov.',
          mechanic:
            'annual unlimited: ₹1,75,560 (20% off the ₹2,19,450 list price). Freedom Weekend, Fri 13–Tue 17 Aug: Annual Unlimited at the standard 20% (₹1,75,560 / ₹1,24,992) with the annual perks, +15 bonus days, and your 2028 renewal locked at today’s 2027 list price, whatever the 2028 price list says. 47 memberships in Mumbai and 19 in Bengaluru, for 1947.',
          economics: '24.1% effective (OK: annual (≤25%)). ₹5.3L counted · 3 buyers',
          logic:
            'A price lock costs nothing in 2027 and answers the renewal-price objection a year early. It sells the annual on certainty, not depth, and every lock is a 2028 renewal already in the book.',
          kpi: 'Annuals sold (target 8 Mumbai, 1 Bengaluru); 2028 locks.',
          lever: 'annual',
        },
        {
          name: 'Glow-Up or Give Back',
          tag: 'Acquisition',
          months: 'Sep',
          audience: 'First-time clients (phone verified).',
          mechanic:
            "2M unlimited: ₹34,406. 2 Months Unlimited at the standard 15% — Mumbai ₹34,406, Kenkere ₹24,812 — with a fitness check on day 1 and a re-test on day 56 (before Diwali, 29 Oct). Take 30+ classes and don't improve on 2 of 3 measures: your third month is free.",
          economics: '15% effective (OK: ≤20% effective). ₹2.1L counted · 6 buyers',
          logic:
            "New clients' first 60-day spend averages ₹11,150 at Kwality, ₹8,411 at Bandra and ₹6,747 at Kenkere — under one month's list price. A 2-month bundle doubles it; the 30-class condition makes the guarantee rarely paid.",
          kpi: 'Bundles sold; day-56 re-test attendance; 3rd-month purchases.',
          lever: 'conversion',
        },
        {
          name: 'We Need to Talk',
          tag: 'Win-back',
          months: 'Sep',
          audience: '6M ≈22% effective with the private',
          mechanic:
            '6M unlimited: ₹90,972 (20% off the ₹1,13,715 list price). Named list — lapsed clients with ≥₹50k lifetime spend (Kenkere ≥₹35k): a call from the studio manager, then 6 Months at 20% (₹90,972 / ₹65,772) or 3 Months at the standard 15% (₹49,177 / ₹35,879), unlimited freezes and a 30-min private to restart.',
          economics:
            '22% effective (OK: 6M+/long plan, ≤25% effective incl. perks (cash ≤20%)). ₹2.8L counted · 4 buyers',
          logic:
            'These clients bought big before; a long plan at a serious price fits them. A personal call converts better than a broadcast.',
          kpi: 'Calls made (100% of list); restarts.',
          lever: 'winback',
        },
        {
          name: 'New Phone, Who Dis?',
          tag: 'Win-back',
          months: 'Sep',
          audience: 'Standard lapsed 15% only',
          mechanic:
            "1M unlimited: ₹17,203 (15% off the ₹20,239 list price). Lapsed 61–180 days: a free 'no questions asked' comeback class; buy within 7 days for the standard 15% on 1 Month or a 12-class pack + 1 extra freeze. Pop-ups: free comeback class, then 15% on an 8- or 10-class pack.",
          economics: '15% effective (OK: ≤20% effective). ₹2.2L counted · 13 buyers',
          logic:
            'A free first step lowers the barrier; the 7-day window keeps the decision fast. The freeze has no cash cost.',
          kpi: 'Comeback classes booked; comeback → purchase within 7 days (target 35%).',
          lever: 'winback',
        },
        {
          name: 'Lock It Before the Laddoos',
          tag: 'Renewal',
          months: 'Sep',
          audience: '≈18',
          mechanic:
            '3M unlimited: ₹49,177 (15% off the ₹57,855 list price). Renew to 3 Months at 15% off (₹49,177 / ₹35,879) by 30 Sep: a Diwali hamper (≈₹2,000 retail — confirm) and unlimited freezes for Oct–Dec travel.',
          economics: '18.5% effective (OK: ≤20% effective). ₹6.4L counted · 13 buyers',
          logic:
            'October–December are troughs (Kwality Nov-25 ₹18.5L; Bandra Oct-25 ₹10.2L). Locking 3M before the festive season protects the base.',
          kpi: '3M renewals and upgrades.',
          lever: 'annual',
        },
        {
          name: 'Diwali Gifting, Minus the Dry-Fruit Box',
          tag: 'Acquisition',
          months: 'Oct',
          audience: 'First-time clients (phone verified).',
          mechanic:
            '3-class pass: ₹3,885. A festive gift envelope with 3 classes for the price of 2 — Mumbai ₹3,885, Kenkere ₹2,835, pop-ups ₹1,890 — for someone new. The recipient gets the standard 15% on a first membership; the giver gets 1 bonus class when they buy.',
          economics:
            '33% effective (OK: intro/acquisition product, credited/converted at ≤20%). ₹0.6L counted · 16 buyers',
          logic:
            'Gifting is real festive spend; the 3-for-2 gets recipients to the 3-visit mark that converts at 73–89%.',
          kpi: 'Gift envelopes sold; activation rate; recipient → member.',
          lever: 'conversion',
        },
        {
          name: 'Diwali Cleaning: Found Your Old Grip Socks?',
          tag: 'Win-back',
          months: 'Oct',
          audience: 'Standard lapsed 15% + retail (≤20% effective)',
          mechanic:
            '1M unlimited: ₹17,203 (15% off the ₹20,239 list price). Lapsed clients: bring (or just mention) your old grip socks, get the standard 15% on 1 Month or a 12-class pack, and swap them for a new pair of P57 grip socks.',
          economics: '19% effective (OK: ≤20% effective). ₹1.9L counted · 11 buyers',
          logic: "A physical prompt from the client's own home is a memorable trigger; the retail cost is low.",
          kpi: 'Reactivations.',
          lever: 'winback',
        },
        {
          name: 'Gold Rush (Dhanteras Edition)',
          tag: 'Renewal',
          months: 'Oct',
          audience: 'Annual cap 25%',
          mechanic:
            'annual unlimited: ₹1,71,171 (22% off the ₹2,19,450 list price). Dhanteras window, Tue 26–Thu 28 Oct: Annual Unlimited at 22% off (₹1,71,171 / ₹1,21,867) + 1 extra private (3 in total) + a gold-foil membership card, with the standard annual perks.',
          economics: '24.4% effective (OK: annual (≤25%)). ₹3.4L counted · 2 buyers',
          logic:
            "Dhanteras is India's 'buy something lasting' day; an annual fits. ≈24.5% effective sits under the annual cap.",
          kpi: 'Annuals sold.',
          lever: 'annual',
        },
        {
          name: 'From Phuljhadi to Anaar',
          tag: 'Renewal',
          months: 'Oct',
          audience: 'Members on 1 Month or class packs.',
          mechanic:
            '6M unlimited: ₹90,972 (20% off the ₹1,13,715 list price). 1 Month and pack members upgrade to 6 Months at 20% off (₹90,972 / ₹65,772) with 3 extra freezes, or to 3 Months at 15% (₹49,177 / ₹35,879).',
          economics: '20% effective (OK: ≤20% effective). ₹5.8L counted · 9 buyers',
          logic: 'Upgrading lifts cash per member 2.3–4.4× and protects the base through November, the softest month.',
          kpi: '1M → 3M/6M upgrades.',
          lever: 'annual',
        },
        {
          name: 'Bride Squad, Assemble (Groom Can Come Too)',
          tag: 'Acquisition',
          months: 'Nov',
          audience: 'Wedding parties and friend groups (min 4, at least 2 new).',
          mechanic:
            '12-class pack: ₹17,325 (12% off the ₹19,688 list price). Wedding season: a group of 4+ (at least 2 new to P57) buy 12-class packs together at 12% off each (Mumbai ₹17,325, Kenkere ₹11,550; packs valid 60 days) and get one hosted private Squad Class for the group, that ends on a choreographed Sangeet routine. Pop-ups: 8-class packs at 5% (₹6,584) + a hosted Pilates squad class. Grooms, cousins and the friend who “doesn’t do group fitness” all count.',
          economics: '18.7% effective (OK: ≤20% effective). ₹2.1L counted · 12 buyers',
          logic:
            'November–December is shaadi season: brides, bridesmaids and families are motivated and arrive in groups. A group rate recruits several newcomers in one conversation, and the hosted class is time we already have, not cash.',
          kpi: 'Squads formed; new buyers from squads (target 50% of squad members).',
          lever: 'conversion',
        },
        {
          name: 'Shaadi Mein Zaroor Aana (Come Back Before the Baraat)',
          tag: 'Win-back',
          months: 'Nov',
          audience: 'Lapsed 61–365 days.',
          mechanic:
            '1M unlimited: ₹17,203 (15% off the ₹20,239 list price). Lapsed 61–365 days: the standard 15% on 1 Month or a 12-class pack (₹17,203 / ₹12,406) + matching “Bride Tribe” grip socks, and a seat at the Sangeet Choreo Barre on Sat 20 Nov: a full Barre class that ends with a 10-minute dance-floor routine you can actually use at the wedding.',
          economics: '18.5% effective (OK: ≤20% effective). ₹0.9L counted · 5 buyers',
          logic:
            'An event with a date beats a generic reminder, and the wedding season is the date. The socks and the class cost little and give a returner a reason to post.',
          kpi: 'Reactivations; Sangeet Choreo attendance → purchase.',
          lever: 'winback',
        },
        {
          name: 'Black Friday Blind Box (No Duds)',
          tag: 'Renewal',
          months: 'Nov',
          audience: 'Members renewing or upgrading; annual renewers due Nov–Jan.',
          mechanic:
            '6M unlimited: ₹96,658 (15% off the ₹1,13,715 list price). Fri 26–Mon 29 Nov: 3 Months at 10% (₹52,070 / ₹37,989), 6 Months at 15% (₹96,658 / ₹69,883) or Annual at 20% (₹1,75,560 / ₹1,24,992), then pick a sealed black box. Every box holds one bonus, from ₹1,500 to ₹5,250 at list: +5 days, 2 guest passes, a 30-min private, a P57 tote + socks, or a full private session. One Black Box per studio, in the annual pile only, adds the “I Survived Black Friday” hoodie. Pop-ups: 10-class pack at 10% + a box (≤1 class) (₹7,655). No discount on 1 Month.',
          economics: '19.6% effective (OK: ≤20% effective). ₹5.3L counted · 7 buyers',
          logic:
            'Black Friday discounts train members to wait. A mystery bonus keeps the cash discount at the standard ladder (10/15/20%) and makes opening the box the content.',
          kpi: '3M+ share of November renewal value; boxes opened on camera.',
          lever: 'annual',
        },
        {
          name: '11.11: Treat Yourself, Not Your Ex',
          tag: 'Renewal',
          months: 'Nov',
          audience: 'Everyone: newcomers, pack buyers and members.',
          mechanic:
            '8-class pack: ₹10,500 (20% off the ₹13,125 list price). Thu 11 Nov, 11:11 am to 10:11 pm only: an 8-class pack at 20% off: Mumbai ₹10,500 (list ₹13,125), Kenkere ₹6,972 (₹8,715), pop-ups ₹5,544 (₹6,930). One per person, usual validity, members and newcomers alike.',
          economics: '20% effective (OK: spot offer (≤25%)). ₹0.6L counted · 6 buyers',
          logic:
            'Singles’ Day is now a shopping date in India. A one-day pack price brings in fence-sitters and members topping up, at a discount that never reaches memberships.',
          kpi: 'Packs sold in 11 hours; pack buyers → membership by January.',
          lever: 'annual',
        },
        {
          name: 'Resolution Insurance (Claim Approved)',
          tag: 'Acquisition',
          months: 'Dec',
          audience: 'First-time clients (phone verified); members buying for a January start.',
          mechanic:
            '1M unlimited: ₹17,203 (15% off the ₹20,239 list price). Buy in December, start any day 1–10 Jan 2028. Newcomers: 1 Month at the standard 15% (₹17,203 / ₹12,406) with Resolution Insurance: no late-cancel fees all January, one “life happens” freeze, and a trainer call if you miss 3 booked classes, to rebuild your week. Members can gift the same plan or buy 3 Months at 15% starting in January.',
          economics: '15% effective (OK: ≤20% effective). ₹1.2L counted · 7 buyers',
          logic:
            'Most January resolutions fail in week two. Cover for the usual excuses (late cancels, a bad week) costs little and is exactly what a nervous December buyer needs to hear.',
          kpi: 'Pre-sold January starts; January attendance of insured buyers.',
          lever: 'conversion',
        },
        {
          name: 'The Gift They Won’t Regift',
          tag: 'Acquisition',
          months: 'Dec',
          audience: 'Members and non-members buying for someone new; offices.',
          mechanic:
            '2-class pass: ₹2,499. A boxed gift for someone new: Mumbai ₹2,499 (2 classes in any format + grip socks + ₹1,000 off a first membership), Kenkere ₹1,799 (2 Barre classes + socks + ₹750 off), pop-ups ₹1,199 (1 class + socks + ₹400 off). The credit is valid within 14 days of class 2, on top of the standard 15%. Offices buying 10+ boxes get 10% off the boxes and a hosted team class.',
          economics: '20% effective (OK: ≤20% effective). ₹0.4L counted · 16 buyers',
          logic:
            'A gift arrives with a friend’s endorsement, which is why gifted and referred clients convert far better than ad leads. The credit only pays out when the recipient buys.',
          kpi: 'Boxes sold; boxes redeemed by 31 Jan; recipient → member (target 30%).',
          lever: 'conversion',
        },
        {
          name: 'The Ex-Files: Season Finale',
          tag: 'Win-back',
          months: 'Dec',
          audience: 'Lapsed 90+ days.',
          mechanic:
            '1M unlimited: ₹18,215 (10% off the ₹20,239 list price). Lapsed 90+ days: 1 Month or a 12-class pack at 10% (₹18,215 / ₹13,136), or 3 Months at 15% (₹49,177 / ₹35,879), plus a plus-one guest pass to the NYE Countdown Class (Fri 31 Dec, 11 am). Pop-ups: 8-class pack at 5% + a plus-one class (₹6,584).',
          economics: '19.6% effective (OK: ≤20% effective). ₹1.5L counted · 8 buyers',
          logic:
            'People who come back in December arrive in January already in the habit. The plus-one turns a returner into a referral at the busiest social week of the year.',
          kpi: 'Reactivations; plus-ones who buy in January.',
          lever: 'winback',
        },
        {
          name: 'The Advent-ure Calendar (Opens in January)',
          tag: 'Renewal',
          months: 'Dec',
          audience: 'Members renewing in December.',
          mechanic:
            '3M unlimited: ₹50,912 (12% off the ₹57,855 list price). Renew in December, 3 Months at 12% (₹50,912 / ₹37,145), 6 Months at 15% (₹96,658 / ₹69,883) or Annual at the standard 20%, and take home a 12-door P57 Advent-ure Calendar. One door a week from 3 Jan 2028: 3 guest passes, 2 smoothies, a 30-min virtual private, 2 extra days, a freeze, grip socks, a front-row reservation, a playlist pick and one golden door. Worth ≈₹4,000 Mumbai / ₹3,000 Bengaluru at list. Pop-ups: 10-class pack at 10% + a 3-door mini calendar (₹7,655).',
          economics: '18.9% effective (OK: ≤20% effective). ₹7.7L counted · 14 buyers',
          logic:
            'January drop-off is when renewals are lost. Spreading the perks across Jan–Mar gives members a reason to show up every week of the hardest quarter, which is what keeps them renewing.',
          kpi: 'December renewal yield; Q1 2028 visits of calendar holders vs others.',
          lever: 'annual',
        },
        {
          name: 'Boxing Day (Gloves Optional)',
          tag: 'Renewal',
          months: 'Dec',
          audience: 'Everyone: pack buyers, members topping up, newcomers.',
          mechanic:
            '12-class pack: ₹15,750 (20% off the ₹19,688 list price). Sun 26–Mon 27 Dec only: 12-class packs at 20% off: Mumbai ₹15,750 (list ₹19,688), Kenkere ₹10,500 (₹13,125); pop-ups 10-class pack at 20% (₹6,804). Two per person; buy now, start whenever January starts for you.',
          economics: '20% effective (OK: spot offer (≤25%)). ₹2.8L counted · 18 buyers',
          logic:
            'The week after Christmas is empty in studio but busy on phones. A two-day pack price pulls January purchases forward without touching membership prices.',
          kpi: 'Packs sold in 48 hours; January visits on Boxing Day packs.',
          lever: 'annual',
        },
      ],
      months: [
        {
          month: 'Jan',
          event: 'Resolutions with receipts',
          theme: 'Resolutions with Receipts',
          focus:
            'Turn New Year intent into paid commitments that are active on 1 Feb; re-up the annuals due Dec–Feb; test the 3-for-2 newcomer pack.',
          offers: ["Third Time's the Charm", "U Up? It's 2027.", "The Baker's Dozen", 'The 57-Hour Hangover Sale'],
          actions: [
            "Third Time's the Charm: First class: awkward. Second: better. Third: hooked. 3 classes for the price of 2.",
            "U Up? It's 2027.: U up? Your mat's been asking about you.",
            "The Baker's Dozen: 12 months is so 2026. Renew your annual and get 13.",
            'The 57-Hour Hangover Sale: Hungover? Same. 1 month unlimited, flat ₹15,000. 57 hours only.',
          ],
          why: 'Key dates: New Year + 57-Hour Hangover Sale (to 3 Jan 09:00) (1 Jan).',
        },
        {
          month: 'Feb',
          event: 'Valentine’s + Galentine’s + Singles Awareness Day',
          theme: 'Red Flags, Green Flags',
          focus:
            'Turn Valentine’s-season traffic into first memberships through a mystery-class intro; recruit through members’ love letters; move February renewals onto 3–12 month plans; let lapsed clients come back on the commitment they choose. Every reward is tied to a purchase or a visit.',
          offers: [
            'Blind Date (No Catfishing)',
            'Love Bombing (The Healthy Kind)',
            'It’s Not You, It’s Your Schedule',
            'Put a Ring On It',
          ],
          actions: [
            'Blind Date (No Catfishing): Two classes. You don’t know which. That’s the fun part.',
            'Love Bombing (The Healthy Kind): Love bombing, but it’s two free classes and zero manipulation.',
            'It’s Not You, It’s Your Schedule: It’s not you, it’s your schedule. Pick a relationship status.',
            'Put a Ring On It: If you like it, then you should’ve put a 6-month on it.',
          ],
          why: 'Key dates: Green Flag Week: Blind Date envelopes at every desk (1 Feb); Galentine’s class (bring a friend free) (13 Feb); Valentine’s Day: Partner Barre (14 Feb); Singles Awareness Day: Hate-Squat Hour (break-up playlist class) (15 Feb).',
        },
        {
          month: 'Mar',
          event: "Women's Day + Main Character Month (format exploration)",
          theme: 'Main Character Month',
          focus:
            "Hold the March trough: widen members' formats, use Women's Day for Bandra Lab acquisition, stop March expiries waiting for April, fix Bengaluru's second-visit leak.",
          offers: ['Lift Like a Girl', 'Monogamy Is Overrated', 'Bura Na Mano, Renewal Hai'],
          actions: [
            "Lift Like a Girl: Women's Day isn't about flowers. It's about deadlifts.",
            'Monogamy Is Overrated: Committed to one class? Cute. Members who play the field stay longer.',
            'Bura Na Mano, Renewal Hai: Bura na mano, renewal hai. 48 hours only.',
          ],
          why: "Key dates: Galentine’s-to-Women’s-Day open house (bring a friend) (2 Mar); International Women's Day — Lift Like a Girl week (Bandra) (8 Mar); Holi (approx.) — 48-hour renewal window 21–22 Mar (22 Mar, approx.).",
        },
        {
          month: 'Apr',
          event: '9th anniversary: limited editions, the wheel, the 9:09 flash and the Golden Glute Awards',
          theme: 'Cloud Nine — 9 Years of Physique 57',
          focus:
            'Flagship month: win on excitement and economics. Two products that exist only in April (the 9-Month Lease and the 9-Class Pack), a 9:09 flash, a wheel you can double, numbered Club Nine annuals and a month of events, with no offer above 25% effective (cash ≤20% except annuals, the flash and the bulk pack). Every April buyer leaves with a reason to come back in May.',
          offers: [
            'Party Crasher Pass',
            'Plus One, Plus Nine',
            'Faking Your Own Death Didn’t Work',
            'Club Nine: The Founders’ Table',
            'Spin Class (Literally)',
            'Moving In Together (The 9-Month Lease)',
            'The 9:09 Panic Attack',
            'The Cloud Nine 90',
          ],
          actions: [
            'Party Crasher Pass: It’s our 9th birthday and you’re invited. 3 classes for ₹999.',
            'Plus One, Plus Nine: Bring a friend, get 9 days. Bring three, get a month.',
            'Faking Your Own Death Didn’t Work: We wrote your obituary. You’re not getting out of it that easily.',
            'Club Nine: The Founders’ Table: Nine numbered seats per studio. Founder perks for a year.',
            'Spin Class (Literally): Renew, then spin. Every spin wins. Feeling brave? Double it.',
            'Moving In Together (The 9-Month Lease): Nine years in, we’re ready to move in together. 99 keys. No second batch.',
            'The 9:09 Panic Attack: Plank for your price. Or wait for 9:09 and panic with everyone else.',
            'The Cloud Nine 90: Ninety classes. One year. Zero commitment issues.',
          ],
          why: 'Key dates: Launch: “Nine Years in Ninety Seconds” film; 9-Month Lease and 9-Class Pack on sale (1 Apr); Blind Date With a Class (format and trainer secret until you walk in) (3 Apr); Throwback Class: the 2018 playlist and original choreography (6 Apr); Bring Your Barre-stie: free guest pass for every member (8 Apr); The 9:09 Panic Attack: two 99-minute flash windows (9 Apr); Séance Class (candle-lit winback class) (15 Apr); Club Nine Unveiling + Birthday Bash (17–18 Apr) (17 Apr); Physique 57 India 9th anniversary: ‘9 at 9’ class, cake and the Time Capsule (18 Apr); Throwback Reunion + Golden Glute Awards (24 Apr); Lock-In: last keys, midnight close of anniversary prices (30 Apr).',
        },
        {
          month: 'May',
          event: "Students home for the holidays + Mother's Day",
          theme: 'Home for the Holidays',
          focus:
            "Students home from college fill empty off-peak seats; Mother's Day duos; keep April's buyers attending.",
          offers: [
            'Mom Said Get Off the Couch',
            'Group Project (Finally, Everyone Pulls Their Weight)',
            'Mom-entum',
            "Don't Ghost Us After the Party",
          ],
          actions: [
            "Mom Said Get Off the Couch: Home for the summer and Mom's already said 'do something'?",
            'Group Project (Finally, Everyone Pulls Their Weight): Group projects: usually one person does all the work. Not here.',
            'Mom-entum: She carried you for 9 months. You can carry her to class.',
            "Don't Ghost Us After the Party: Great party. Now show up 8 times in May.",
          ],
          why: "Key dates: Mother's Day (9 May).",
        },
        {
          month: 'Jun',
          event: 'Privates month + Out of Office',
          theme: 'Privates Month + Out of Office',
          focus:
            "Grow privates with off-peak pricing and bulk packs (Bandra's biggest gap); stop summer travel lapses with freezes, not discounts; test a private-first intro.",
          offers: [
            'Shy Girl Starter Pack',
            'Auto-Reply: Out of Office, Still Squatting',
            'Happy Hour (Zero Hangover, All Glutes)',
            'Private Practice',
          ],
          actions: [
            'Shy Girl Starter Pack: Not a front-row person yet? Start with a private.',
            "Auto-Reply: Out of Office, Still Squatting: Auto-reply: I'm on vacation, but my membership isn't lapsing.",
            'Happy Hour (Zero Hangover, All Glutes): Happy hour, but the only thing on tap is a trainer.',
            'Private Practice: Ten sessions. One trainer who knows your knees better than your physio.',
          ],
          why: "Key dates: Father's Day (20 Jun).",
        },
        {
          month: 'Jul',
          event: 'Studio bookouts + monsoon',
          theme: 'Book the Studio + Rain Check',
          focus:
            'Studio bookouts and corporate bulk as new channels; protect monsoon renewals; bring lapsed clients back before August.',
          offers: [
            'Shy Girl Starter Pack',
            'Gone With the Wind, Back With the Rain',
            'Rain Check (Literally)',
            'Kitty Party, But Make It Cardio',
            'Team Building Without the Trust Falls',
          ],
          actions: [
            'Shy Girl Starter Pack: Not a front-row person yet? Start with a private.',
            'Gone With the Wind, Back With the Rain: Left us in the summer heat? Come back for the monsoon.',
            "Rain Check (Literally): Monsoon happens. Your late-cancel fee doesn't have to.",
            'Kitty Party, But Make It Cardio: Kitty party, but make it cardio.',
            'Team Building Without the Trust Falls: Team building without the trust falls.',
          ],
          why: 'Key dates: Freedom Weekend early-access list opens (for August) (15 Jul).',
        },
        {
          month: 'Aug',
          event: 'Friendship Day + Freedom Weekend + Raksha Bandhan',
          theme: 'Azaadi From Average',
          focus:
            'Recruit whole friend groups on Friendship Day; sell annuals over Freedom Weekend with a 2028 price lock instead of a deeper discount; remove the commitment objection for newcomers with a break-up clause; protect the festive-season renewal book with freezes. Every reward is tied to a purchase or a visit, never to a class count.',
          offers: [
            'No Strings Attached',
            'Squad Goals, Squat Goals',
            'Freedom to Pause (Not Quit)',
            'Price Ki Azaadi (Freedom From Price Hikes)',
          ],
          actions: [
            'No Strings Attached: Commitment issues? Same. Here’s a membership with a break-up clause.',
            'Squad Goals, Squat Goals: Your squad. Our studio. Matching socks, obviously.',
            'Freedom to Pause (Not Quit): Pause for Ganpati. Pause for Diwali. Just don’t quit.',
            'Price Ki Azaadi (Freedom From Price Hikes): Freedom from price hikes. Lock your 2028 renewal at 2027 prices.',
          ],
          why: 'Key dates: Friendship Day: Squad Classes (1 Aug); Freedom Weekend opens: Price Ki Azaadi (13–17 Aug) (13 Aug); Independence Day: Freedom Flow class at 8:15 am (15 Aug); Raksha Bandhan (approx.): Sibling Barre (17 Aug, approx.).',
        },
        {
          month: 'Sep',
          event: 'The Comeback (winback month) + 57 Days to Diwali',
          theme: 'The Comeback + 57 Days to Diwali',
          focus:
            'Winback month: manager calls for high-value lapsed clients, fast comebacks for recent lapsers; a results-guarantee bundle; lock 3M plans before the festive dip.',
          offers: ['Glow-Up or Give Back', 'We Need to Talk', 'New Phone, Who Dis?', 'Lock It Before the Laddoos'],
          actions: [
            'Glow-Up or Give Back: 57 days to Diwali. Glow up, or we give back.',
            'We Need to Talk: We need to talk. Not like that — we just miss you.',
            "New Phone, Who Dis?: New phone, who dis? (It's us. Your favourite class.)",
            'Lock It Before the Laddoos: Lock it before the laddoos.',
          ],
          why: 'Key dates: 57 Days to Diwali countdown begins (2 Sep); World Heart Day (29 Sep).',
        },
        {
          month: 'Oct',
          event: 'Diwali gifting + upgrades',
          theme: 'Festival of Lights',
          focus: 'Gift-led acquisition, 1M→6M upgrades and a Dhanteras annual window, without open codes.',
          offers: [
            'Diwali Gifting, Minus the Dry-Fruit Box',
            'Diwali Cleaning: Found Your Old Grip Socks?',
            'Gold Rush (Dhanteras Edition)',
            'From Phuljhadi to Anaar',
          ],
          actions: [
            "Diwali Gifting, Minus the Dry-Fruit Box: This Diwali, gift something they'll actually use.",
            'Diwali Cleaning: Found Your Old Grip Socks?: Diwali cleaning found your old grip socks. Sign?',
            'Gold Rush (Dhanteras Edition): Buy gold this Dhanteras. The kind that lifts.',
            'From Phuljhadi to Anaar: Upgrade from a phuljhadi to an anaar.',
          ],
          why: 'Key dates: Dhanteras window (26–28 Oct, approx.) (26 Oct, approx.); Diwali (approx.) (29 Oct, approx.).',
        },
        {
          month: 'Nov',
          event: 'Wedding season + 11.11 + Black Friday',
          theme: 'Shaadi Season (and a Very Black Friday)',
          focus:
            'Sell group packs into the wedding season; bring lapsed clients back before the baraat; one loud 11-hour pack day on 11.11; and a Black Friday that moves renewals onto long plans with a mystery bonus instead of a deeper price.',
          offers: [
            'Bride Squad, Assemble (Groom Can Come Too)',
            'Shaadi Mein Zaroor Aana (Come Back Before the Baraat)',
            'Black Friday Blind Box (No Duds)',
            '11.11: Treat Yourself, Not Your Ex',
          ],
          actions: [
            'Bride Squad, Assemble (Groom Can Come Too): Four of you, one wedding, zero excuses. Squad rates inside.',
            'Shaadi Mein Zaroor Aana (Come Back Before the Baraat): Shaadi mein zaroor aana. And to class before that.',
            'Black Friday Blind Box (No Duds): Black Friday, but every box is a winner. We checked.',
            '11.11: Treat Yourself, Not Your Ex: 11.11. Eleven hours. Treat yourself, not your ex.',
          ],
          why: 'Key dates: 11.11: Treat Yourself, Not Your Ex (11:11 am–10:11 pm) (11 Nov); Sangeet Choreo Barre (ends on a dance-floor routine) (20 Nov); Black Friday Blind Box opens (26–29 Nov) (26 Nov); Cyber Monday: last boxes (29 Nov).',
        },
        {
          month: 'Dec',
          event: 'Gifting + Christmas + Boxing Day + NYE',
          theme: 'Party Season Survival Guide',
          focus:
            'Renew December’s book onto long plans with perks spread across Q1; sell January starts now with Resolution Insurance; turn gifting into January newcomers; bank pack demand on Boxing Day; win back long-lapsed clients with a plus-one to the NYE Countdown Class.',
          offers: [
            'Resolution Insurance (Claim Approved)',
            'The Gift They Won’t Regift',
            'The Ex-Files: Season Finale',
            'The Advent-ure Calendar (Opens in January)',
            'Boxing Day (Gloves Optional)',
          ],
          actions: [
            'Resolution Insurance (Claim Approved): Insure your resolution before you make it. Claim approved.',
            'The Gift They Won’t Regift: The one gift that doesn’t end up in next year’s Secret Santa.',
            'The Ex-Files: Season Finale: Every great series needs a finale. Yours is a comeback.',
            'The Advent-ure Calendar (Opens in January): An advent calendar you open in January, when you actually need it.',
            'Boxing Day (Gloves Optional): Boxing Day. No gloves, just a 12-class pack at 20% off.',
          ],
          why: 'Key dates: Advent-ure Calendars and gift boxes on sale (1 Dec); Ugly Sweater Barre (18 Dec); Christmas Eve candle-lit class (24 Dec); Boxing Day (Gloves Optional): 26–27 Dec (26 Dec); NYE Countdown Class (11 am) (31 Dec).',
        },
      ],
      rhythm: [
        [
          'Newcomer journey',
          "Offers: Third Time's the Charm, Blind Date (No Catfishing), Love Bombing (The Healthy Kind), Lift Like a Girl, Party Crasher Pass, Plus One, Plus Nine, Mom Said Get Off the Couch, Group Project (Finally, Everyone Pulls Their Weight), Mom-entum, Shy Girl Starter Pack, No Strings Attached, Squad Goals, Squat Goals, Glow-Up or Give Back, Diwali Gifting, Minus the Dry-Fruit Box, Bride Squad, Assemble (Groom Can Come Too), Resolution Insurance (Claim Approved), The Gift They Won’t Regift. Watch each offer's “What to watch” measures and rate of sale monthly.",
        ],
        [
          'Lapsed journey',
          "Offers: U Up? It's 2027, It’s Not You, It’s Your Schedule, Faking Your Own Death Didn’t Work, Gone With the Wind, Back With the Rain, We Need to Talk, New Phone, Who Dis?, Diwali Cleaning: Found Your Old Grip Socks?, Shaadi Mein Zaroor Aana (Come Back Before the Baraat), The Ex-Files: Season Finale. Watch each offer's “What to watch” measures and rate of sale monthly.",
        ],
        [
          'Renewal journey',
          "Offers: The Baker's Dozen, The 57-Hour Hangover Sale, Put a Ring On It, Monogamy Is Overrated, Bura Na Mano, Renewal Hai, Club Nine: The Founders’ Table, Spin Class (Literally), Moving In Together (The 9-Month Lease), The 9:09 Panic Attack, The Cloud Nine 90, Don't Ghost Us After the Party, Auto-Reply: Out of Office, Still Squatting, Happy Hour (Zero Hangover, All Glutes), Private Practice, Rain Check (Literally), Kitty Party, But Make It Cardio, Team Building Without the Trust Falls, Freedom to Pause (Not Quit), Price Ki Azaadi (Freedom From Price Hikes), Lock It Before the Laddoos, Gold Rush (Dhanteras Edition), From Phuljhadi to Anaar, Black Friday Blind Box (No Duds), 11.11: Treat Yourself, Not Your Ex, The Advent-ure Calendar (Opens in January), Boxing Day (Gloves Optional). Watch each offer's “What to watch” measures and rate of sale monthly.",
        ],
      ],
      scorecard: [
        ['Leads → trials', '6,525', '3,394', 'Newcomer journeys'],
        ['Trials → new buyers', '3,394', '733', 'Newcomer journeys'],
        ['Renewals due → purchases', '873', '534', 'Renewal journeys'],
        ['Lapsed touches → reactivated', '4,612', '373', 'Lapsed journeys'],
        ['Target → offers planned', '₹228.2L', '₹156.3L', 'Plan of record'],
      ],
      funnel: {
        newShare: 0.16,
        avgFirstPurchase: 5062.58,
        visitsPerBuyer: 2.26,
        leadsPerVisit: 1.67,
        renewalShare: 0.36,
        winbackShare: 0.25,
        convNow: 23.28,
        convTarget: 30.91,
      },
      channels: [
        ['Website & online', 1145, 28.8, 8],
        ['Hosted & walk-in', 364, 85.4, 5.2],
        ['Calls & WhatsApp', 324, 75, 25.3],
        ['Referrals', 299, 85.3, 22.4],
        ['Other', 110, 35.5, 18.2],
        ['Social & influencer', 75, 33.3, 13.3],
      ],
      slots: [
        ['Weekday · Early (before 9)', 35, 3914, 312],
        ['Weekday · Evening (4–7)', 40, 4321, 246],
        ['Weekday · Late evening (7+)', 45, 4961, 257],
        ['Weekday · Late morning (9–12)', 51, 4409, 399],
        ['Weekend · Afternoon (12–4)', 46, 3671, 31],
        ['Weekend · Evening (4–7)', 33, 3695, 102],
        ['Weekend · Late morning (9–12)', 60, 6353, 252],
      ],
      monthly: {
        '2024': [0, 0, 0, 0, 866821, 1274749, 861547, 1337302, 2396991, 1259834, 986449, 1871469],
        '2025': [
          1118758, 1262779, 1322870, 2849987, 1793574, 1516610, 1859595, 3057104, 1564732, 1019961, 1318309, 1442056,
        ],
        '2026': [2003539, 1539479, 1127106, 2744837, 1501790, 1437424, 1889427, 2280685, 1529410, null, null, null],
      },
      seasonality: [0.67, 0.75, 0.79, 1.7, 1.07, 0.9, 1.11, 1.82, 0.93, 0.61, 0.79, 0.86],
      entry: [
        ['Studio 1 Month Unlimited', 108, 14962, 47050, 59],
        ['Studio 12 Class Package', 73, 14690, 36557, 53],
        ['Studio 8 Class Package', 38, 11031, 29931, 55],
        ['Studio 4 Class Package', 39, 5827, 13203, 44],
        ['Studio Newcomers 2 For 1', 582, 1723, 11081, 35],
        ['Session', 243, 1807, 8162, 39],
        ['Studio Single Class', 128, 1687, 6816, 47],
      ],
    },
    'Kenkere House': {
      name: 'Kenkere House',
      city: 'Bengaluru',
      headline:
        '2027 plan of record: ₹125.9L target across twelve themed months; ₹68.8L is carried by named offers and the rest is full-price trade.',
      snapshot: [
        ['TTM revenue', '₹107.5L', '+15% vs prior 12 months', true],
        ['2027 target', '₹125.9L', '+17% on the last 12 months', true],
        ['Paying clients (TTM)', '751', '₹13,877 per client · ATV ₹5,627', true],
        ['New-client revenue', '16%', 'renewal 46% · return 24% · win-back 15%', true],
        ['Trial conversion', '25.7%', 'non-hosted · hosted 3.3%', false],
        ['Effective discount', '7.9%', '2025: 8.5%', true],
        ['Class fill', '49%', '5.7 per class · late-cancel 24.8%', true],
        ['Dormant 60–365 days', '527', '177 with 3+ past purchases', false],
      ],
      diagnosis: [
        {
          title: 'Renewals carry the year',
          stat: '53%',
          detail: 'Renewal plan ₹66.7L of ₹125.9L; 434 renewal purchases planned from 720 due.',
          implication:
            "Renewal offers: The Baker's Dozen, The 57-Hour Hangover Sale, Put a Ring On It, Monogamy Is Overrated, Bura Na Mano, Renewal Hai, Club Nine: The Founders’ Table, Spin Class (Literally), Moving In Together (The 9-Month Lease), The 9:09 Panic Attack, Don't Ghost Us After the Party, Auto-Reply: Out of Office, Still Squatting, Happy Hour (Zero Hangover, All Glutes), Private Practice, Rain Check (Literally), Kitty Party, But Make It Cardio, Freedom to Pause (Not Quit), Price Ki Azaadi (Freedom From Price Hikes), Lock It Before the Laddoos, Gold Rush (Dhanteras Edition), From Phuljhadi to Anaar, Black Friday Blind Box (No Duds), 11.11: Treat Yourself, Not Your Ex, The Advent-ure Calendar (Opens in January), Boxing Day (Gloves Optional).",
        },
        {
          title: 'New clients',
          stat: '633',
          detail: 'New-client plan ₹42.8L: 9,409 leads → 3,387 trials → 633 new buyers.',
          implication:
            "Newcomer offers: Third Time's the Charm, Blind Date (No Catfishing), Love Bombing (The Healthy Kind), The Second Date's On Us, Party Crasher Pass, Plus One, Plus Nine, Mom Said Get Off the Couch, Group Project (Finally, Everyone Pulls Their Weight), Mom-entum, Shy Girl Starter Pack, No Strings Attached, Squad Goals, Squat Goals, Glow-Up or Give Back, Diwali Gifting, Minus the Dry-Fruit Box, Bride Squad, Assemble (Groom Can Come Too), Resolution Insurance (Claim Approved), The Gift They Won’t Regift.",
        },
        {
          title: 'Lapsed clients',
          stat: '84',
          detail: 'Reactivation plan ₹7.6L: 84 reactivated from 3,207 touches.',
          implication:
            "Lapsed offers: U Up? It's 2027, It’s Not You, It’s Your Schedule, Faking Your Own Death Didn’t Work, Gone With the Wind, Back With the Rain, We Need to Talk, New Phone, Who Dis?, Diwali Cleaning: Found Your Old Grip Socks?, Shaadi Mein Zaroor Aana (Come Back Before the Baraat), The Ex-Files: Season Finale.",
        },
        {
          title: 'Peak month: Apr',
          stat: '₹15.1L',
          detail:
            'Cloud Nine — 9 Years of Physique 57 · 9th anniversary: limited editions, the wheel, the 9:09 flash and the Golden Glute Awards.',
          implication:
            'Flagship month: win on excitement and economics. Two products that exist only in April (the 9-Month Lease and the 9-Class Pack), a 9:09 flash, a wheel you can double, numbered Club Nine annuals and a month of events, with no offer above 25% effective (cash ≤20% except annuals, the flash and the bulk pack). Every April buyer leaves with a reason to come back in May.',
        },
      ],
      build: {
        forecast2026: 11148458.49,
        momentum: 9.95,
        baseline: 12257958.9,
        levers: [
          {
            id: 'conversion',
            name: 'Trial-to-member conversion',
            value: 340304,
            math: '789 non-hosted first visits × (25.7% → 29.4%) = +29 members × ₹16,090 first-year value × 0.73 in-year realisation',
            why: "Plan of record: carried by the newcomer offers — Third Time's the Charm, Blind Date (No Catfishing), Love Bombing (The Healthy Kind), The Second Date's On Us, Party Crasher Pass, Plus One, Plus Nine, Mom Said Get Off the Couch, Group Project (Finally, Everyone Pulls Their Weight), Mom-entum, Shy Girl Starter Pack, No Strings Attached, Squad Goals, Squat Goals, Glow-Up or Give Back, Diwali Gifting, Minus the Dry-Fruit Box, Bride Squad, Assemble (Groom Can Come Too), Resolution Insurance (Claim Approved), The Gift They Won’t Regift.",
          },
          {
            id: 'leads',
            name: 'Online-lead speed to trial',
            value: 1039195,
            math: '1,905 online leads × trial rate 12.4% → 20.6% × 57% trial→member = +88 members × ₹16,090 × 0.73',
            why: "Plan of record: carried by the newcomer offers — Third Time's the Charm, Blind Date (No Catfishing), Love Bombing (The Healthy Kind), The Second Date's On Us, Party Crasher Pass, Plus One, Plus Nine, Mom Said Get Off the Couch, Group Project (Finally, Everyone Pulls Their Weight), Mom-entum, Shy Girl Starter Pack, No Strings Attached, Squad Goals, Squat Goals, Glow-Up or Give Back, Diwali Gifting, Minus the Dry-Fruit Box, Bride Squad, Assemble (Groom Can Come Too), Resolution Insurance (Claim Approved), The Gift They Won’t Regift.",
          },
          {
            id: 'referral',
            name: 'Paid-on-conversion referral engine',
            value: 777508,
            math: '455 referral leads × +50% volume × 29.0% lead→member = +66 members × ₹16,090 × 0.73',
            why: "Plan of record: carried by the newcomer offers — Third Time's the Charm, Blind Date (No Catfishing), Love Bombing (The Healthy Kind), The Second Date's On Us, Party Crasher Pass, Plus One, Plus Nine, Mom Said Get Off the Couch, Group Project (Finally, Everyone Pulls Their Weight), Mom-entum, Shy Girl Starter Pack, No Strings Attached, Squad Goals, Squat Goals, Glow-Up or Give Back, Diwali Gifting, Minus the Dry-Fruit Box, Bride Squad, Assemble (Groom Can Come Too), Resolution Insurance (Claim Approved), The Gift They Won’t Regift.",
          },
          {
            id: 'winback',
            name: 'Tiered win-back of dormant clients',
            value: 390162,
            math: '177 loyal dormant (3+ purchases) × +10pts return + 350 light dormant × +5pts = +35 returners × ₹18,439 avg return spend (×0.8 / ×0.4)',
            why: "Plan of record: carried by the lapsed offers — U Up? It's 2027, It’s Not You, It’s Your Schedule, Faking Your Own Death Didn’t Work, Gone With the Wind, Back With the Rain, We Need to Talk, New Phone, Who Dis?, Diwali Cleaning: Found Your Old Grip Socks?, Shaadi Mein Zaroor Aana (Come Back Before the Baraat), The Ex-Files: Season Finale.",
          },
          {
            id: 'usage',
            name: 'First-30-day habit programme',
            value: 32599,
            math: '27 unlimited memberships ended at ≤4 visits/month × 30% moved to 5–8 visits × +20pt renewal = +2 renewals × ₹13,169 × 1.5 cycles',
            why: "Plan of record: carried by the renewal offers — The Baker's Dozen, The 57-Hour Hangover Sale, Put a Ring On It, Monogamy Is Overrated, Bura Na Mano, Renewal Hai, Club Nine: The Founders’ Table, Spin Class (Literally), Moving In Together (The 9-Month Lease), The 9:09 Panic Attack, Don't Ghost Us After the Party, Auto-Reply: Out of Office, Still Squatting, Happy Hour (Zero Hangover, All Glutes), Private Practice, Rain Check (Literally), Kitty Party, But Make It Cardio, Freedom to Pause (Not Quit), Price Ki Azaadi (Freedom From Price Hikes), Lock It Before the Laddoos, Gold Rush (Dhanteras Edition), From Phuljhadi to Anaar, Black Friday Blind Box (No Duds), 11.11: Treat Yourself, Not Your Ex, The Advent-ure Calendar (Opens in January), Boxing Day (Gloves Optional).",
          },
          {
            id: 'capacity',
            name: 'Second weekend late-morning class',
            value: 319496,
            math: '+2 weekend 9–12 sessions/week × 52 × ₹5,120 revenue/session × 60% ramp',
            why: '',
          },
          {
            id: 'annual',
            name: 'Long-plan renewal desk',
            value: 63525,
            math: '5 annual/6-month plans worth ₹5.3L expire in 2027 × +20pt renewal × 60% of original value (many step down to 3-month/1-month)',
            why: "Plan of record: carried by the renewal offers — The Baker's Dozen, The 57-Hour Hangover Sale, Put a Ring On It, Monogamy Is Overrated, Bura Na Mano, Renewal Hai, Club Nine: The Founders’ Table, Spin Class (Literally), Moving In Together (The 9-Month Lease), The 9:09 Panic Attack, Don't Ghost Us After the Party, Auto-Reply: Out of Office, Still Squatting, Happy Hour (Zero Hangover, All Glutes), Private Practice, Rain Check (Literally), Kitty Party, But Make It Cardio, Freedom to Pause (Not Quit), Price Ki Azaadi (Freedom From Price Hikes), Lock It Before the Laddoos, Gold Rush (Dhanteras Edition), From Phuljhadi to Anaar, Black Friday Blind Box (No Duds), 11.11: Treat Yourself, Not Your Ex, The Advent-ure Calendar (Opens in January), Boxing Day (Gloves Optional).",
          },
        ],
        leverTotal: 2962789.18,
        haircut: 0.15,
        projection: 14776329.71,
        appTargetAtBuild: 12590000,
      },
      offers: [
        {
          name: "Third Time's the Charm",
          tag: 'Acquisition',
          months: 'Jan',
          audience: 'First-time clients (phone verified).',
          mechanic:
            '3-class pass: ₹2,835. Replaces the Newcomers 2-for-1 for January. Mumbai: 3 classes for ₹3,885 (price of 2 singles) — mix barre, powerCycle and Strength Lab (Lab seats at Supreme HQ; Kwality off-peak only), use within 14 days. Kenkere: 3 barre classes for ₹2,835 (counts as the once-in-a-lifetime 2-for-1; replaces the 50% intro in January). Then the standard 15% on a first membership: 1 Month ₹17,203 / ₹12,406.',
          economics:
            '33% effective (OK: intro/acquisition product, credited/converted at ≤20%). ₹1.5L counted · 12 buyers',
          logic:
            '60.6% of first-timers never take a 2nd class. Purchase within 60 days by month-1 visits: 0 return visits 10.8%, 1 → 43.9%, 2 → 73.3%, 3–4 → 88.6%. The 2-for-1 route converts 20.8% (Bandra 17%). A third class moves people into the 73–89% band.',
          kpi: 'Packs with all 3 classes used in 14 days (target 60%); pack → membership (target 35% vs 20.8% on 2-for-1).',
          lever: 'conversion',
        },
        {
          name: "U Up? It's 2027.",
          tag: 'Win-back',
          months: 'Jan',
          audience: 'Standard lapsed 15%, bonus earned (≈20% effective if earned)',
          mechanic:
            '1M unlimited: ₹12,406 (15% off the ₹14,595 list price). Lapsed 61–365 days: the standard 15% on 1 Month (₹17,203 / ₹12,406) or a 12-class pack (₹16,735 / ₹11,156). Take 12 classes by 31 Jan and get +5 days (pack buyers: +1 class). Pop-ups: 15% on an 8- or 10-class pack (₹5,891 / ₹7,229) and +1 class for 6 classes by 31 Jan.',
          economics: '20% effective (OK: ≤20% effective). ₹1.0L counted · 8 buyers',
          logic:
            'Bandra is reactivation-led (3,209 lapsed vs 5,065 renewed membership records). Renewal climbs with usage: Bandra members using <50% of sessions renew 49–58% vs 82% at 75%+. The bonus is only paid for attendance that predicts the next renewal.',
          kpi: 'Lapsed buyers; share hitting 12 classes (target 40%); Feb renewal of Jan winbacks.',
          lever: 'winback',
        },
        {
          name: "The Baker's Dozen",
          tag: 'Renewal',
          months: 'Jan',
          audience: '≈21',
          mechanic:
            'annual unlimited: ₹1,32,804 (15% off the ₹1,56,240 list price). Annual Unlimited at 15% off — Mumbai ₹1,86,533 (list ₹2,19,450), Kenkere ₹1,32,804 (list ₹1,56,240) — for 13 months instead of 12, plus the standard annual perks (2 privates, 4 guest passes, 1 hosted class, monthly trainer check-ins).',
          economics: '21.5% effective (OK: annual (≤25%)). ₹2.7L counted · 2 buyers',
          logic:
            "Annual is Kwality's #1 product (32 units, ₹51.6L in the last 12 months) and Bandra's #3 (15 units, ₹23.8L). The ANN-2026-25%-KH code gave away ₹9.7L at a flat 25%; this gives less cash away (≈21.5% effective) and adds time, which costs little at spare capacity.",
          kpi: 'Annual re-up rate (target 75%); 3M/6M → annual upgrades.',
          lever: 'annual',
        },
        {
          name: 'The 57-Hour Hangover Sale',
          tag: 'Renewal',
          months: 'Jan',
          audience: 'Everyone, while the capped stock lasts; one per person.',
          mechanic:
            '12-class pack: ₹10,000 (24% off the ₹13,125 list price). 1 Month Unlimited at a flat ₹15,000 in Mumbai (list ₹20,239, 26% off) or ₹10,000 at Kenkere (list ₹14,595, 31% off). Fri 1 Jan 00:00 to Sun 3 Jan 09:00 — 57 hours. Capped at 57 memberships per city, 1 per person, activate by 15 Jan.',
          economics: '31% effective (OK: spot offer (cap waived)). ₹1.0L counted · 10 buyers',
          logic:
            'January is the strongest non-April month in Mumbai (Jan-26: Kwality ₹27.4L, Bandra ₹20.0L; Kenkere ₹11.1L). A capped spot price creates urgency without training clients to wait — only 57 units per city, so the maximum discount exposure is ~₹3.0L in Mumbai and ~₹2.6L in Bengaluru.',
          kpi: 'Sell-out time; share of spot buyers renewing in Feb at standard price (target 55%).',
          lever: 'annual',
        },
        {
          name: 'Blind Date (No Catfishing)',
          tag: 'Acquisition',
          months: 'Feb',
          audience: 'First-time clients (phone verified).',
          mechanic:
            '1M unlimited: ₹11,697 (20% off the ₹14,595 list price). Mumbai: 2 mystery classes in 10 days for ₹999. The format (Barre, powerCycle or Strength Lab) and the trainer stay sealed in an envelope until you walk in; date two is booked at the desk before you leave. Kenkere: 2 mystery Barre classes (trainer and playlist sealed) for ₹709. Pop-ups: the paid trial (≈₹945), with the second class free if it is booked at the desk. Buy within 72 hours of date two and the ₹999 / ₹709 is credited against 1 Month at the standard 15% (₹16,204 / ₹11,697 net). Pop-ups: 8-class pack at 15% (₹5,891).',
          economics: '20% effective (OK: ≤20% effective). ₹1.1L counted · 9 buyers',
          logic:
            'Kenkere’s VDAY50! code (38 uses, ₹2.6L given away at 50%) bought February volume at a huge cost. A booked second visit lifts trial→member from 10.8% to 43.9%, and a mystery format gets newcomers into the class they would never pick, which is usually the one that sells the membership.',
          kpi: 'Second-date booked at the desk (target 70%); trial → member (target 30%).',
          lever: 'conversion',
        },
        {
          name: 'Love Bombing (The Healthy Kind)',
          tag: 'Acquisition',
          months: 'Feb',
          audience: 'Current members bringing a never-been friend.',
          mechanic:
            '1M unlimited: ₹12,406 (15% off the ₹14,595 list price). Every active member gets three printed love letters at the desk (and a WhatsApp version). Each one gives a never-been friend 2 free classes within 14 days. If the friend buys 1 Month or a 12-class pack within 72 hours of class 2: their standard 15% (₹17,203 / ₹12,406; pop-ups 8-class ₹5,891) plus P57 grip socks, and the member gets +5 days (pack: +1 class) per friend who buys, up to 15 days. Partner Barre on Sun 14 Feb counts as class 2.',
          economics: '19% effective (OK: ≤20% effective). ₹0.6L counted · 5 buyers',
          logic:
            'Referrals convert 41.2% at Kwality, 22.6% at Bandra, 28.3% at Kenkere and 76.1% at pop-ups, versus 3.8–5.7% for website leads. The 2026 BOGO codes (70 uses, ₹3.1L given) went mostly to existing clients; this one pays out only when a genuinely new person buys.',
          kpi: 'Letters redeemed; new buyers from referral (target +40% vs Feb-26).',
          lever: 'conversion',
        },
        {
          name: 'It’s Not You, It’s Your Schedule',
          tag: 'Win-back',
          months: 'Feb',
          audience: 'Lapsed 61–365 days.',
          mechanic:
            '12-class pack: ₹12,406 (5% off the ₹13,125 list price). Lapsed 61–365 days pick a relationship status at the standard 15%: Exclusive = 3 Months (₹49,177 / ₹35,879) + 1 extra freeze; Casual = a 12-class pack (₹16,735 / ₹11,156); It’s Complicated = 1 Month (₹17,203 / ₹12,406) + 1 free freeze for the week life gets in the way. Pop-ups: 8-class pack at 15% (₹5,891). Galentine’s class Sat 13 Feb: bring a friend free.',
          economics: '15% effective (OK: ≤20% effective). ₹0.5L counted · 4 buyers',
          logic:
            'Lapsers average 2.6–3.4 visits in the first half of a membership vs 6.4 for renewers: they left because the plan did not fit the week, not because of the price. Letting them pick the commitment removes the objection without deepening the discount.',
          kpi: 'Reactivations; mix of Exclusive / Casual / Complicated (target 30% Exclusive).',
          lever: 'winback',
        },
        {
          name: 'Put a Ring On It',
          tag: 'Renewal',
          months: 'Feb',
          audience: 'Members renewing in February (any expiry date).',
          mechanic:
            '6M unlimited: ₹69,883 (15% off the ₹82,215 list price). Any February renewal: 3 Months at 15% (₹49,177 / ₹35,879) + a P57 mini-band “ring”; 6 Months at 15% + 1 private session (₹96,658 / ₹69,883); Annual at the standard 20% + the annual perks + your name engraved on the Wall of Commitment. Say yes at the desk and the bell rings, confetti, the class applauds. Pop-ups: 10-class pack at 10% + the mini-band (₹7,655).',
          economics: '20% effective (OK: ≤20% effective). ₹3.4L counted · 8 buyers',
          logic:
            'Members using 75%+ of their sessions renew at 82–88%, and longer plans keep them using them. The best perks sit on the longest plans; nothing is unlocked by a class count, so every renewer qualifies.',
          kpi: '3M+ share of renewal value (target 45%); proposals accepted at the desk.',
          lever: 'annual',
        },
        {
          name: "The Second Date's On Us",
          tag: 'Acquisition',
          months: 'Mar',
          audience: 'First-time clients (phone verified).',
          mechanic:
            '1M unlimited: ₹12,406 (15% off the ₹14,595 list price). Kenkere: Newcomers Intro (first class at 50% off, ₹709) → class 2 free if booked at the desk before leaving, within 7 days → 1 Month (₹12,406) or 8-class pack (₹7,408) at the standard 15% within 72 hours of class 2, plus 1 extra freeze. Pop-ups: paid trial (≈₹945) → second class free if booked before leaving → 8- or 10-class pack at 15% within 72 hours.',
          economics: '15% effective (OK: ≤20% effective). ₹2.1L counted · 17 buyers',
          logic:
            'Kenkere logged 3,217 leads in 12 months; only 36% reached a trial and 13.1% converted. 581 single-class sales show high drop-in, low commitment. A booked second visit lifts conversion from 10.8% to 43.9%.',
          kpi: 'Second-visit rate (target 55%); trial → member (target 25% vs 18.7%).',
          lever: 'conversion',
        },
        {
          name: 'Monogamy Is Overrated',
          tag: 'Renewal',
          months: 'Mar',
          audience: 'No price discount; ≈17% value on a 12-class pack, ≈16% on 1M if the bonus is earned',
          mechanic:
            "1M unlimited: ₹13,125 (10% off the ₹14,595 list price). For members who've used one format in the last 60 days. Pack members renew at list and get 2 bonus classes valid only in formats they've never tried (Mumbai: powerCycle / Strength Lab induction / Cardio Barre; Kenkere: Cardio Barre / Mat 57 / Foundations). Unlimited members renew at list and get +5 days if they take 3 different formats in their first 30 days.",
          economics: '17% effective (OK: ≤20% effective). ₹1.4L counted · 11 buyers',
          logic:
            'One-format members renew 58–67% vs 85–87% for members on 4+ formats. Bonus classes cost little in off-peak slots and target the single biggest renewal predictor after attendance.',
          kpi: 'Members trying a new format (target 40% of eligible); 60-day renewal of exposed vs unexposed members.',
          lever: 'annual',
        },
        {
          name: 'Bura Na Mano, Renewal Hai',
          tag: 'Renewal',
          months: 'Mar',
          audience: 'Members expiring 1–31 Mar only',
          mechanic:
            "3M unlimited: ₹35,879 (15% off the ₹42,210 list price). Holi, Sun 21–Mon 22 Mar (48 hours): 3 Months at 15% off (₹49,177 / ₹35,879) or a 12-class pack at 10% (₹17,719 / ₹11,813), each with a limited-edition 'Holi Hai' P57 tee (retail ≈₹2,000 — confirm).",
          economics: '19.7% effective (OK: ≤20% effective). ₹1.8L counted · 5 buyers',
          logic:
            'In 2026 Kwality did ₹20.2L in March, then ₹50.0L in April at 20.4% discount depth — March renewals waited. A short, fun window with a 3M upgrade pulls them forward at ≤20% effective.',
          kpi: 'March renewal yield (target 70%); 3M share of March renewals.',
          lever: 'annual',
        },
        {
          name: 'Party Crasher Pass',
          tag: 'Acquisition',
          months: 'Apr',
          audience: 'First-time clients (phone verified).',
          mechanic:
            '1M unlimited: ₹11,707 (20% off the ₹14,595 list price). Mumbai: 3 classes in 9 days for ₹999, any format, including a Birthday Bash party class (17–18 Apr). Kenkere: 3 Barre classes for ₹699 (replaces the 50% intro in April; counts as the once-in-a-lifetime 2-for-1). Pop-ups: 2 classes for ₹999. The pass price is credited against a first 1 Month or 12-class pack bought within 72 hours of class 3, on top of the standard 15% (1 Month nets ₹16,204 / ₹11,707). Buy within 9 hours of class 3 and you hit the Impulse Buzzer: confetti, applause, name on the Reckless Decisions board.',
          economics: '20% effective (OK: ≤20% effective). ₹1.1L counted · 9 buyers',
          logic:
            'A booked sequence of classes is what converts; the party class gives newcomers the best room of the year, and the buzzer turns a sale into a show for whoever is waiting.',
          kpi: 'Pass → member (target 35%); buzzer hits (bought within 9 hours).',
          lever: 'conversion',
        },
        {
          name: 'Plus One, Plus Nine',
          tag: 'Acquisition',
          months: 'Apr',
          audience: 'Current members bringing a never-been friend.',
          mechanic:
            '1M unlimited: ₹12,406 (15% off the ₹14,595 list price). Any active member whose never-been friend buys in April gets +9 days (pack members: +2 classes). Three buying friends = a free month. The friend gets the standard 15% and a Cloud Nine tote. Bring Your Barre-stie day (Thu 8 Apr): every member gets a free guest pass.',
          economics: '15% effective (OK: ≤20% effective). ₹0.5L counted · 4 buyers',
          logic:
            'Referrals convert at 22–76% against 3.8–5.7% for website leads. A tier at three friends gives the super-connectors a reason to keep going.',
          kpi: 'Referral buyers (target 2× April 2026); members reaching three.',
          lever: 'conversion',
        },
        {
          name: 'Faking Your Own Death Didn’t Work',
          tag: 'Win-back',
          months: 'Apr',
          audience: 'Lapsed 61 days–3 years.',
          mechanic:
            '1M unlimited: ₹12,406 (15% off the ₹14,595 list price). Lapsed 61 days–3 years get an obituary postcard (“Here lies a perfectly good plank”). It is the ticket to the candle-lit Séance Class on Thu 15 Apr. Come back on the standard 15% on 1 Month, a 12-class pack or 3 Months, plus a bonus for every year since your first class (max 3): +1 class on packs, +1 day on unlimited. Photo at the Back From the Dead frame; your row at the Throwback Reunion (Sat 24 Apr).',
          economics: '20% effective (OK: ≤20% effective). ₹1.0L counted · 8 buyers',
          logic:
            'Lapsed clients already know the product; what they need is a moment and a reason that is not just a discount. A personal postcard with a dated class beats a generic reminder.',
          kpi: 'Postcards → Séance Class attendance; reactivations (target +30% vs Apr-26).',
          lever: 'winback',
        },
        {
          name: 'Club Nine: The Founders’ Table',
          tag: 'Renewal',
          months: 'Apr',
          audience: 'Members on 3-Month or longer plans; annual renewers.',
          mechanic:
            'annual unlimited: ₹1,24,992 (20% off the ₹1,56,240 list price). 9 numbered Annual Unlimited seats per studio at the standard 20% (₹1,75,560 / ₹1,24,992) with the annual perks doubled: 4 privates, 8 guest passes, 2 hosted classes, monthly trainer check-ins, a numbered jacket, your name on the Club Nine wall and 48-hour priority booking all year. Unveiled at the Birthday Bash on Sat 17 Apr.',
          economics: '25% effective (OK: annual (≤25%)). ₹1.2L counted · 1 buyers',
          logic:
            'Annual buyers are the most valuable members in the book; a numbered seat with doubled perks costs less than a deeper price and gives them something to show off.',
          kpi: 'Seats sold (9 per studio); annual share of April renewals.',
          lever: 'annual',
        },
        {
          name: 'Spin Class (Literally)',
          tag: 'Renewal',
          months: 'Apr',
          audience: 'Members renewing 1 Month or a 12-class pack.',
          mechanic:
            '1M unlimited: ₹13,136 (10% off the ₹14,595 list price). Renew 1 Month or a 12-class pack in April at 10% off (₹18,215 / ₹17,719; Kenkere ₹13,136 / ₹11,813; pop-up 10-pack ₹7,655) and spin the Wheel of Nine. Published odds: +1 class 30%, smoothie 20%, guest pass 15%, grip socks 10%, +3 days 10%, extra freeze 8%, 30-min private 5%, P57 tote 1.5%, a free month 0.5%. Then choose: keep it, double it by booking 9 classes in your first 21 days, or donate it to a friend as a guest pass.',
          economics: '19.3% effective (OK: ≤20% effective). ₹2.9L counted · 22 buyers',
          logic:
            'Clients who use 75%+ of their sessions renew at 80–86%. The doubling option pays the prize only when the member books the classes that make them renew again; the expected value of a spin is ≈₹1,900 Mumbai / ₹1,350 Bengaluru.',
          kpi: 'April renewal yield vs April 2026; share of spins doubled (target 35%).',
          lever: 'annual',
        },
        {
          name: 'Moving In Together (The 9-Month Lease)',
          tag: 'Renewal',
          months: 'Apr',
          audience: 'Members ready for a long commitment and returning clients who want the best price of the year.',
          mechanic:
            '9M unlimited: ₹1,02,999. A 9-Month Unlimited that exists only in April: Mumbai ₹1,44,999 (a 6-Month plus a 3-Month cost ₹1,71,570), Kenkere ₹1,02,999 (₹1,24,425). 9 freezes (min 3 days each), the anniversary hoodie, a numbered brass studio key and your name on the Lease Wall. 99 numbered keys across Kwality and Supreme HQ, 39 at Kenkere; a live counter on the studio screens.',
          economics: '20% effective (OK: ≤20% effective). ₹2.1L counted · 2 buyers',
          logic:
            'A numbered, one-month-only product gives people a reason to buy now without cutting the price of the core memberships. April 2026 was bought with 40–48% codes; scarcity sells the long plan at 17.5–20% instead.',
          kpi: 'Keys sold vs 99 / 39; 6M+ share of April membership revenue (target 50%).',
          lever: 'annual',
        },
        {
          name: 'The 9:09 Panic Attack',
          tag: 'Renewal',
          months: 'Apr',
          audience: 'Everyone: members, pack buyers and newcomers.',
          mechanic:
            '9-class pack: ₹7,699. The Limited Edition 9-Class Pack (99 days to use it) exists only in April. Plank Your Price at the desk: hold 57 seconds and it is ₹12,999 (Kenkere ₹8,699), 1:57 for ₹12,249 (₹8,199), 2:57 for the floor, ₹11,499 (₹7,699). On Fri 9 Apr, two 99-minute windows from 9:09 am and 9:09 pm give everyone the floor price, no plank needed: siren in studio, countdown on Instagram. Pop-ups: a 9-class pack at ₹6,499 in the same windows.',
          economics: '24% effective (OK: spot offer (≤25%)). ₹0.6L counted · 8 buyers',
          logic:
            'A price you earn with your body is the most Physique 57 thing there is, and every plank at the desk is a show for whoever is waiting. The floor price (23.7% / 24.0%) sits inside the 25% spot cap, and plan revenue is counted at the floor.',
          kpi: 'Packs sold in the two 9:09 windows; pack → membership by June.',
          lever: 'annual',
        },
        {
          name: 'Mom Said Get Off the Couch',
          tag: 'Acquisition',
          months: 'May',
          audience: 'First-time clients (phone verified).',
          mechanic:
            '8-class pack: ₹6,972 (20% off the ₹8,715 list price). Students and under-25s (ID checked): 8-class pack at 20% off — Mumbai ₹10,500, Kenkere ₹6,972, pop-ups ₹5,544 — valid 45 days, Golden Hours only (Mon–Fri 10 am–12 pm, Sat–Sun 4–7 pm). On sale 1 May–30 Jun.',
          economics: '20% effective (OK: ≤20% effective). ₹0.5L counted · 7 buyers',
          logic:
            'Weekday 10–12 and weekend 4–7 pm run 27–41% full; the marginal cost of a seat there is near zero. Students arriving home in May are a predictable, untapped audience.',
          kpi: 'Golden Hours fill (target +15 pts); student repeat purchase.',
          lever: 'conversion',
        },
        {
          name: 'Group Project (Finally, Everyone Pulls Their Weight)',
          tag: 'Acquisition',
          months: 'May',
          audience: 'First-time clients (phone verified).',
          mechanic:
            '8-class pack: ₹6,536 (25% off the ₹8,715 list price). 4+ students buy 8-class packs together in one transaction: 25% off each — Mumbai ₹9,844, Kenkere ₹6,536, pop-ups ₹5,198. Golden Hours validity, 45 days.',
          economics: '25% effective (OK: bulk purchase (≤25%)). ₹0.3L counted · 5 buyers',
          logic:
            'Bulk purchase is one of the few places 25% is allowed. Groups attend together (higher usage → higher renewal) and bring four new names per sale.',
          kpi: 'Squads sold; squad members buying again within 60 days.',
          lever: 'conversion',
        },
        {
          name: 'Mom-entum',
          tag: 'Acquisition',
          months: 'May',
          audience: 'First-time clients (phone verified).',
          mechanic:
            "1M unlimited: ₹12,406 (15% off the ₹14,595 list price). Mother–child pairs (either way round), 1–16 May. If one is new: the newcomer's standard 15% on 1 Month / 12-class, a shared 30-min duo private and a P57 gift for mum (≈₹2,000 retail — confirm). If both are members: renew together at 10% each + the duo private.",
          economics: '18% effective (OK: ≤20% effective). ₹0.5L counted · 4 buyers',
          logic:
            "Duos with a booked second class convert best; Mother's Day gives a reason. The perk is a shared session, not a bigger discount.",
          kpi: 'Duos trialled; both-buy rate.',
          lever: 'conversion',
        },
        {
          name: "Don't Ghost Us After the Party",
          tag: 'Renewal',
          months: 'May',
          audience: '≈20% effective on 3M, ≈20% on 1M with the private',
          mechanic:
            '3M unlimited: ₹35,879 (15% off the ₹42,210 list price). Everyone who bought in April and takes 8+ classes in May: next renewal 3 Months at 15% (₹49,177 / ₹35,879) or 1 Month at 10% (₹18,215 / ₹13,136), plus a 30-min private. Pop-ups: 10-class pack at 15% + a bonus class.',
          economics: '19.5% effective (OK: ≤20% effective). ₹2.6L counted · 12 buyers',
          logic:
            '2026 anniversary-code buyers renewed at only 24.5%. Attendance in the month after purchase is the best predictor of renewal; the reward is earned by it.',
          kpi: 'April cohort with 8+ May visits (target 55%); April cohort renewal at next expiry (target 55%).',
          lever: 'annual',
        },
        {
          name: 'Shy Girl Starter Pack',
          tag: 'Acquisition',
          months: 'Jun, Jul',
          audience: 'First-time clients (phone verified).',
          mechanic:
            '1M unlimited: ₹11,657 (20% off the ₹14,595 list price). For nervous starters: a 30-min private + one group class within 7 days for ₹1,999 (Kenkere ₹1,499). ₹999 (Kenkere ₹749) is credited against a first 1 Month or 12-class pack bought within 72 hours, with the standard 15% — 1 Month nets ₹16,204 / ₹11,657.',
          economics: '20% effective (OK: ≤20% effective). ₹0.3L counted · 3 buyers',
          logic:
            'Half of CRM leads never trial (Bandra 1,114 of 2,317; Kenkere 2,053 of 3,217). A private first visit removes the intimidation barrier. No historical data on private-first conversion — this is a test.',
          kpi: "Packs sold to 'Not Tried' leads; private-first → member (target 40%).",
          lever: 'conversion',
        },
        {
          name: 'Auto-Reply: Out of Office, Still Squatting',
          tag: 'Renewal',
          months: 'Jun',
          audience: 'No price discount; ≈9% value from virtual privates',
          mechanic:
            '3M unlimited: ₹42,210 (list price). 3 Months Unlimited at list (₹57,855 / ₹42,210) with unlimited freezes (blocks of 3+ days, plan must end within 6 months) and 2 virtual 30-min privates to use while travelling.',
          economics: '8% effective (OK: ≤20% effective). ₹3.0L counted · 7 buyers',
          logic:
            'Travel is the main reason members lapse in June–July. Flexibility removes the reason; list price protects the ticket. Virtual privates cost trainer time only.',
          kpi: '1M → 3M upgrades; June–July lapse rate vs 2026.',
          lever: 'annual',
        },
        {
          name: 'Happy Hour (Zero Hangover, All Glutes)',
          tag: 'Renewal',
          months: 'Jun',
          audience: 'Members and newcomers buying private sessions.',
          mechanic:
            '60-minute private session: ₹3,297 (20% off the ₹4,121 list price). Privates booked in quiet hours (Mon–Fri 12–4 pm, Sat 1–4 pm): 20% off a single private (Mumbai ₹4,200 vs ₹5,250; Kenkere 20% off list) and a free 30-min virtual private with every 2 in-studio privates booked in June.',
          economics: '20% effective (OK: ≤20% effective). ₹1.1L counted · 16 buyers',
          logic:
            "Privates are 6.2% of Kwality's revenue (₹20.1L in 12 months) but only ₹31k at Bandra — the biggest product gap in the portfolio. Quiet-hour pricing uses capacity that is otherwise unpaid.",
          kpi: 'Privates booked 12–4 pm; Bandra privates revenue (target ₹1.5L in June).',
          lever: 'annual',
        },
        {
          name: 'Private Practice',
          tag: 'Renewal',
          months: 'Jun',
          audience: 'Members and newcomers buying private sessions.',
          mechanic:
            '10-class pack of privates: ₹30,909. 10-private pack at 25% off — Mumbai ₹39,375 (list ₹52,500); Kenkere 25% off list — valid 6 months, with a posture and strength assessment in session one. 20-pack: 25% off plus a P57 retail kit.',
          economics: '25% effective (OK: bulk purchase (≤25%)). ₹0.6L counted · 2 buyers',
          logic:
            "Bulk private purchase is one of the allowed 25% cases. Kwality's PR1V@TE10 code (39 uses) shows demand; a pack converts one-off buyers into a 6-month relationship.",
          kpi: 'Packs sold; trainer utilisation.',
          lever: 'annual',
        },
        {
          name: 'Gone With the Wind, Back With the Rain',
          tag: 'Win-back',
          months: 'Jul',
          audience: 'Standard lapsed 15% only',
          mechanic:
            '1M unlimited: ₹12,406 (15% off the ₹14,595 list price). Lapsed 61–365 days, 15–31 Jul: the standard 15% on 1 Month or a 12-class pack + 2 extra freezes + a 15-min comeback assessment + first access to August’s Freedom Weekend.',
          economics: '15% effective (OK: ≤20% effective). ₹1.1L counted · 9 buyers',
          logic:
            'An event with a start date beats a generic reminder. Freezes answer the monsoon objection at no cash cost.',
          kpi: 'Reactivations; comeback assessments booked.',
          lever: 'winback',
        },
        {
          name: 'Rain Check (Literally)',
          tag: 'Renewal',
          months: 'Jul',
          audience: '≈15% effective',
          mechanic:
            '1M unlimited: ₹13,136 (10% off the ₹14,595 list price). July 1 Month renewers: 10% off (₹18,215 / ₹13,136) + 3 late-cancel amnesty tokens (valid to 30 Sep) + automatic credit-back on official red-alert days. Take 12+ classes in July: +3 days. Pop-ups: 10-class pack at 10% + 2 tokens.',
          economics: '15% effective (OK: ≤20% effective). ₹1.6L counted · 12 buyers',
          logic:
            "Average late cancels per membership: Bandra 1.18, Kenkere 1.36. Late-cancel fees in the monsoon make members feel they 'wasted' a month and lapse.",
          kpi: 'July 1M renewal yield (target 70%); tokens used.',
          lever: 'annual',
        },
        {
          name: 'Kitty Party, But Make It Cardio',
          tag: 'Renewal',
          months: 'Jul',
          audience: 'Anyone booking the studio for a private group of up to 12.',
          mechanic:
            "1-class pass (studio bookout for up to 12): ₹14,999. Book out the studio for a private 50-min class for up to 12 (birthdays, bachelorettes, kitty parties, reunions): Mumbai ₹24,999, Kenkere ₹14,999, pop-ups ₹9,999. Every first-timer gets Third Time's the Charm (3-for-2) and the standard 15% on a first membership within 7 days; the host gets 2 guest passes.",
          economics: '0% effective (OK: ≤20% effective). ₹0.4L counted · 3 buyers',
          logic:
            'Hosted classes are a top lead source (Kwality 394, Bandra 353, Kenkere 281 leads) but convert only 4.6–6.1%. A paid bookout has a host who brings warm friends and pays for the room.',
          kpi: 'Bookouts sold; guest → member (target 15%).',
          lever: 'annual',
        },
        {
          name: 'No Strings Attached',
          tag: 'Acquisition',
          months: 'Aug',
          audience: 'First-time clients (phone verified).',
          mechanic:
            '1M unlimited: ₹11,697 (20% off the ₹14,595 list price). Mumbai: 2 classes in 7 days for ₹999 (any format), credited against 1 Month at the standard 15% bought within 72 hours (₹16,204 net). Kenkere: 2 Barre classes for ₹709, credited the same way (₹11,697 net). Pop-ups: paid trial (≈₹945) → 8-class pack at 15% (₹5,891). The No-Strings clause: in the first 14 days of the month, if it is not for you, the desk converts what is left into an 8-class pack (60 days). No break-up fee, no awkward conversation.',
          economics: '20% effective (OK: ≤20% effective). ₹1.1L counted · 9 buyers',
          logic:
            'Clients with 5+ visits in month one buy again at 93.5%. A break-up clause costs almost nothing (few use it) and answers the objection the desk hears most: “what if I can’t keep it up?”.',
          kpi: 'Trial → member (target 35%); No-Strings switches (expect <10%).',
          lever: 'conversion',
        },
        {
          name: 'Squad Goals, Squat Goals',
          tag: 'Acquisition',
          months: 'Aug',
          audience: 'Current members bringing 2–4 never-been friends.',
          mechanic:
            '1M unlimited: ₹12,406 (15% off the ₹14,595 list price). Friendship Day (Sun 1 Aug) to 15 Aug, siblings count for Raksha Bandhan: a member books a free Squad Class for 2–4 never-been friends. Friends who buy 1 Month or a 12-class pack within 7 days get their standard 15% (₹17,203 / ₹12,406; pop-ups 8-class ₹5,891) and friendship-band grip socks; the member gets +5 days (pack: +1 class) per friend who buys, up to 15 days.',
          economics: '19.8% effective (OK: ≤20% effective). ₹0.5L counted · 4 buyers',
          logic:
            'Referrals convert at 22–76%; friends who start together come together. A free group class lowers the bar for the nervous friend, and the member is paid only when someone buys.',
          kpi: 'Squad Classes booked; friend → purchase (target 30%).',
          lever: 'conversion',
        },
        {
          name: 'Freedom to Pause (Not Quit)',
          tag: 'Renewal',
          months: 'Aug',
          audience: 'Members renewing in August.',
          mechanic:
            '6M unlimited: ₹69,883 (15% off the ₹82,215 list price). Any August renewal: 3 Months at 15% (₹49,177 / ₹35,879) + 2 Freedom Freezes (min 3 days each, any time Sep–Nov, made for Ganeshotsav and Diwali travel); 6 Months at 15% + 1 private + 3 Freedom Freezes (₹96,658 / ₹69,883); Annual at the standard 20% + perks + 4 Freedom Freezes. Pop-ups: 10-class pack at 15% + 30 extra days of validity (₹7,229).',
          economics: '20% effective (OK: ≤20% effective). ₹4.5L counted · 15 buyers',
          logic:
            'Members lapse in Sep–Nov when travel breaks the habit. A freeze keeps them paying and coming back instead of cancelling; freezes have no cash cost, so the cash discount stays at the standard 15%.',
          kpi: 'Renewal yield vs Aug-26; Sep–Nov lapse rate of August renewers.',
          lever: 'annual',
        },
        {
          name: 'Price Ki Azaadi (Freedom From Price Hikes)',
          tag: 'Renewal',
          months: 'Aug',
          audience: 'Members and returning clients; annual renewers due Aug–Nov.',
          mechanic:
            'annual unlimited: ₹1,24,992 (20% off the ₹1,56,240 list price). Freedom Weekend, Fri 13–Tue 17 Aug: Annual Unlimited at the standard 20% (₹1,75,560 / ₹1,24,992) with the annual perks, +15 bonus days, and your 2028 renewal locked at today’s 2027 list price, whatever the 2028 price list says. 47 memberships in Mumbai and 19 in Bengaluru, for 1947.',
          economics: '24.1% effective (OK: annual (≤25%)). ₹1.2L counted · 1 buyers',
          logic:
            'A price lock costs nothing in 2027 and answers the renewal-price objection a year early. It sells the annual on certainty, not depth, and every lock is a 2028 renewal already in the book.',
          kpi: 'Annuals sold (target 8 Mumbai, 1 Bengaluru); 2028 locks.',
          lever: 'annual',
        },
        {
          name: 'Glow-Up or Give Back',
          tag: 'Acquisition',
          months: 'Sep',
          audience: 'First-time clients (phone verified).',
          mechanic:
            "2M unlimited: ₹24,812. 2 Months Unlimited at the standard 15% — Mumbai ₹34,406, Kenkere ₹24,812 — with a fitness check on day 1 and a re-test on day 56 (before Diwali, 29 Oct). Take 30+ classes and don't improve on 2 of 3 measures: your third month is free.",
          economics: '15% effective (OK: ≤20% effective). ₹1.2L counted · 5 buyers',
          logic:
            "New clients' first 60-day spend averages ₹11,150 at Kwality, ₹8,411 at Bandra and ₹6,747 at Kenkere — under one month's list price. A 2-month bundle doubles it; the 30-class condition makes the guarantee rarely paid.",
          kpi: 'Bundles sold; day-56 re-test attendance; 3rd-month purchases.',
          lever: 'conversion',
        },
        {
          name: 'We Need to Talk',
          tag: 'Win-back',
          months: 'Sep',
          audience: '6M ≈22% effective with the private',
          mechanic:
            '6M unlimited: ₹65,772 (20% off the ₹82,215 list price). Named list — lapsed clients with ≥₹50k lifetime spend (Kenkere ≥₹35k): a call from the studio manager, then 6 Months at 20% (₹90,972 / ₹65,772) or 3 Months at the standard 15% (₹49,177 / ₹35,879), unlimited freezes and a 30-min private to restart.',
          economics:
            '22% effective (OK: 6M+/long plan, ≤25% effective incl. perks (cash ≤20%)). ₹1.5L counted · 3 buyers',
          logic:
            'These clients bought big before; a long plan at a serious price fits them. A personal call converts better than a broadcast.',
          kpi: 'Calls made (100% of list); restarts.',
          lever: 'winback',
        },
        {
          name: 'New Phone, Who Dis?',
          tag: 'Win-back',
          months: 'Sep',
          audience: 'Standard lapsed 15% only',
          mechanic:
            "1M unlimited: ₹12,406 (15% off the ₹14,595 list price). Lapsed 61–180 days: a free 'no questions asked' comeback class; buy within 7 days for the standard 15% on 1 Month or a 12-class pack + 1 extra freeze. Pop-ups: free comeback class, then 15% on an 8- or 10-class pack.",
          economics: '15% effective (OK: ≤20% effective). ₹1.2L counted · 10 buyers',
          logic:
            'A free first step lowers the barrier; the 7-day window keeps the decision fast. The freeze has no cash cost.',
          kpi: 'Comeback classes booked; comeback → purchase within 7 days (target 35%).',
          lever: 'winback',
        },
        {
          name: 'Lock It Before the Laddoos',
          tag: 'Renewal',
          months: 'Sep',
          audience: '≈18',
          mechanic:
            '3M unlimited: ₹35,879 (15% off the ₹42,210 list price). Renew to 3 Months at 15% off (₹49,177 / ₹35,879) by 30 Sep: a Diwali hamper (≈₹2,000 retail — confirm) and unlimited freezes for Oct–Dec travel.',
          economics: '19.7% effective (OK: ≤20% effective). ₹3.6L counted · 10 buyers',
          logic:
            'October–December are troughs (Kwality Nov-25 ₹18.5L; Bandra Oct-25 ₹10.2L). Locking 3M before the festive season protects the base.',
          kpi: '3M renewals and upgrades.',
          lever: 'annual',
        },
        {
          name: 'Diwali Gifting, Minus the Dry-Fruit Box',
          tag: 'Acquisition',
          months: 'Oct',
          audience: 'First-time clients (phone verified).',
          mechanic:
            '3-class pass: ₹2,835. A festive gift envelope with 3 classes for the price of 2 — Mumbai ₹3,885, Kenkere ₹2,835, pop-ups ₹1,890 — for someone new. The recipient gets the standard 15% on a first membership; the giver gets 1 bonus class when they buy.',
          economics:
            '33% effective (OK: intro/acquisition product, credited/converted at ≤20%). ₹0.2L counted · 8 buyers',
          logic:
            'Gifting is real festive spend; the 3-for-2 gets recipients to the 3-visit mark that converts at 73–89%.',
          kpi: 'Gift envelopes sold; activation rate; recipient → member.',
          lever: 'conversion',
        },
        {
          name: 'Diwali Cleaning: Found Your Old Grip Socks?',
          tag: 'Win-back',
          months: 'Oct',
          audience: 'Standard lapsed 15% + retail (≤20% effective)',
          mechanic:
            '1M unlimited: ₹12,406 (15% off the ₹14,595 list price). Lapsed clients: bring (or just mention) your old grip socks, get the standard 15% on 1 Month or a 12-class pack, and swap them for a new pair of P57 grip socks.',
          economics: '20% effective (OK: ≤20% effective). ₹0.7L counted · 6 buyers',
          logic: "A physical prompt from the client's own home is a memorable trigger; the retail cost is low.",
          kpi: 'Reactivations.',
          lever: 'winback',
        },
        {
          name: 'Gold Rush (Dhanteras Edition)',
          tag: 'Renewal',
          months: 'Oct',
          audience: 'Annual cap 25%',
          mechanic:
            'annual unlimited: ₹1,21,867 (22% off the ₹1,56,240 list price). Dhanteras window, Tue 26–Thu 28 Oct: Annual Unlimited at 22% off (₹1,71,171 / ₹1,21,867) + 1 extra private (3 in total) + a gold-foil membership card, with the standard annual perks.',
          economics: '24.2% effective (OK: annual (≤25%)). ₹1.2L counted · 1 buyers',
          logic:
            "Dhanteras is India's 'buy something lasting' day; an annual fits. ≈24.5% effective sits under the annual cap.",
          kpi: 'Annuals sold.',
          lever: 'annual',
        },
        {
          name: 'From Phuljhadi to Anaar',
          tag: 'Renewal',
          months: 'Oct',
          audience: 'Members on 1 Month or class packs.',
          mechanic:
            '6M unlimited: ₹65,772 (20% off the ₹82,215 list price). 1 Month and pack members upgrade to 6 Months at 20% off (₹90,972 / ₹65,772) with 3 extra freezes, or to 3 Months at 15% (₹49,177 / ₹35,879).',
          economics: '20% effective (OK: ≤20% effective). ₹2.4L counted · 5 buyers',
          logic: 'Upgrading lifts cash per member 2.3–4.4× and protects the base through November, the softest month.',
          kpi: '1M → 3M/6M upgrades.',
          lever: 'annual',
        },
        {
          name: 'Bride Squad, Assemble (Groom Can Come Too)',
          tag: 'Acquisition',
          months: 'Nov',
          audience: 'Wedding parties and friend groups (min 4, at least 2 new).',
          mechanic:
            '12-class pack: ₹11,550 (12% off the ₹13,125 list price). Wedding season: a group of 4+ (at least 2 new to P57) buy 12-class packs together at 12% off each (Mumbai ₹17,325, Kenkere ₹11,550; packs valid 60 days) and get one hosted private Squad Class for the group, that ends on a choreographed Sangeet routine. Pop-ups: 8-class packs at 5% (₹6,584) + a hosted Pilates squad class. Grooms, cousins and the friend who “doesn’t do group fitness” all count.',
          economics: '19.8% effective (OK: ≤20% effective). ₹0.9L counted · 8 buyers',
          logic:
            'November–December is shaadi season: brides, bridesmaids and families are motivated and arrive in groups. A group rate recruits several newcomers in one conversation, and the hosted class is time we already have, not cash.',
          kpi: 'Squads formed; new buyers from squads (target 50% of squad members).',
          lever: 'conversion',
        },
        {
          name: 'Shaadi Mein Zaroor Aana (Come Back Before the Baraat)',
          tag: 'Win-back',
          months: 'Nov',
          audience: 'Lapsed 61–365 days.',
          mechanic:
            '1M unlimited: ₹12,406 (15% off the ₹14,595 list price). Lapsed 61–365 days: the standard 15% on 1 Month or a 12-class pack (₹17,203 / ₹12,406) + matching “Bride Tribe” grip socks, and a seat at the Sangeet Choreo Barre on Sat 20 Nov: a full Barre class that ends with a 10-minute dance-floor routine you can actually use at the wedding.',
          economics: '19.8% effective (OK: ≤20% effective). ₹0.4L counted · 3 buyers',
          logic:
            'An event with a date beats a generic reminder, and the wedding season is the date. The socks and the class cost little and give a returner a reason to post.',
          kpi: 'Reactivations; Sangeet Choreo attendance → purchase.',
          lever: 'winback',
        },
        {
          name: 'Black Friday Blind Box (No Duds)',
          tag: 'Renewal',
          months: 'Nov',
          audience: 'Members renewing or upgrading; annual renewers due Nov–Jan.',
          mechanic:
            '6M unlimited: ₹69,883 (15% off the ₹82,215 list price). Fri 26–Mon 29 Nov: 3 Months at 10% (₹52,070 / ₹37,989), 6 Months at 15% (₹96,658 / ₹69,883) or Annual at 20% (₹1,75,560 / ₹1,24,992), then pick a sealed black box. Every box holds one bonus, from ₹1,500 to ₹5,250 at list: +5 days, 2 guest passes, a 30-min private, a P57 tote + socks, or a full private session. One Black Box per studio, in the annual pile only, adds the “I Survived Black Friday” hoodie. Pop-ups: 10-class pack at 10% + a box (≤1 class) (₹7,655). No discount on 1 Month.',
          economics: '19.8% effective (OK: ≤20% effective). ₹2.7L counted · 5 buyers',
          logic:
            'Black Friday discounts train members to wait. A mystery bonus keeps the cash discount at the standard ladder (10/15/20%) and makes opening the box the content.',
          kpi: '3M+ share of November renewal value; boxes opened on camera.',
          lever: 'annual',
        },
        {
          name: '11.11: Treat Yourself, Not Your Ex',
          tag: 'Renewal',
          months: 'Nov',
          audience: 'Everyone: newcomers, pack buyers and members.',
          mechanic:
            '8-class pack: ₹6,972 (20% off the ₹8,715 list price). Thu 11 Nov, 11:11 am to 10:11 pm only: an 8-class pack at 20% off: Mumbai ₹10,500 (list ₹13,125), Kenkere ₹6,972 (₹8,715), pop-ups ₹5,544 (₹6,930). One per person, usual validity, members and newcomers alike.',
          economics: '20% effective (OK: spot offer (≤25%)). ₹0.6L counted · 8 buyers',
          logic:
            'Singles’ Day is now a shopping date in India. A one-day pack price brings in fence-sitters and members topping up, at a discount that never reaches memberships.',
          kpi: 'Packs sold in 11 hours; pack buyers → membership by January.',
          lever: 'annual',
        },
        {
          name: 'Resolution Insurance (Claim Approved)',
          tag: 'Acquisition',
          months: 'Dec',
          audience: 'First-time clients (phone verified); members buying for a January start.',
          mechanic:
            '1M unlimited: ₹12,406 (15% off the ₹14,595 list price). Buy in December, start any day 1–10 Jan 2028. Newcomers: 1 Month at the standard 15% (₹17,203 / ₹12,406) with Resolution Insurance: no late-cancel fees all January, one “life happens” freeze, and a trainer call if you miss 3 booked classes, to rebuild your week. Members can gift the same plan or buy 3 Months at 15% starting in January.',
          economics: '15% effective (OK: ≤20% effective). ₹0.5L counted · 4 buyers',
          logic:
            'Most January resolutions fail in week two. Cover for the usual excuses (late cancels, a bad week) costs little and is exactly what a nervous December buyer needs to hear.',
          kpi: 'Pre-sold January starts; January attendance of insured buyers.',
          lever: 'conversion',
        },
        {
          name: 'The Gift They Won’t Regift',
          tag: 'Acquisition',
          months: 'Dec',
          audience: 'Members and non-members buying for someone new; offices.',
          mechanic:
            '2-class pass: ₹1,799. A boxed gift for someone new: Mumbai ₹2,499 (2 classes in any format + grip socks + ₹1,000 off a first membership), Kenkere ₹1,799 (2 Barre classes + socks + ₹750 off), pop-ups ₹1,199 (1 class + socks + ₹400 off). The credit is valid within 14 days of class 2, on top of the standard 15%. Offices buying 10+ boxes get 10% off the boxes and a hosted team class.',
          economics: '20% effective (OK: ≤20% effective). ₹0.2L counted · 9 buyers',
          logic:
            'A gift arrives with a friend’s endorsement, which is why gifted and referred clients convert far better than ad leads. The credit only pays out when the recipient buys.',
          kpi: 'Boxes sold; boxes redeemed by 31 Jan; recipient → member (target 30%).',
          lever: 'conversion',
        },
        {
          name: 'The Ex-Files: Season Finale',
          tag: 'Win-back',
          months: 'Dec',
          audience: 'Lapsed 90+ days.',
          mechanic:
            '1M unlimited: ₹13,136 (10% off the ₹14,595 list price). Lapsed 90+ days: 1 Month or a 12-class pack at 10% (₹18,215 / ₹13,136), or 3 Months at 15% (₹49,177 / ₹35,879), plus a plus-one guest pass to the NYE Countdown Class (Fri 31 Dec, 11 am). Pop-ups: 8-class pack at 5% + a plus-one class (₹6,584).',
          economics: '19.7% effective (OK: ≤20% effective). ₹0.5L counted · 4 buyers',
          logic:
            'People who come back in December arrive in January already in the habit. The plus-one turns a returner into a referral at the busiest social week of the year.',
          kpi: 'Reactivations; plus-ones who buy in January.',
          lever: 'winback',
        },
        {
          name: 'The Advent-ure Calendar (Opens in January)',
          tag: 'Renewal',
          months: 'Dec',
          audience: 'Members renewing in December.',
          mechanic:
            '3M unlimited: ₹37,145 (12% off the ₹42,210 list price). Renew in December, 3 Months at 12% (₹50,912 / ₹37,145), 6 Months at 15% (₹96,658 / ₹69,883) or Annual at the standard 20%, and take home a 12-door P57 Advent-ure Calendar. One door a week from 3 Jan 2028: 3 guest passes, 2 smoothies, a 30-min virtual private, 2 extra days, a freeze, grip socks, a front-row reservation, a playlist pick and one golden door. Worth ≈₹4,000 Mumbai / ₹3,000 Bengaluru at list. Pop-ups: 10-class pack at 10% + a 3-door mini calendar (₹7,655).',
          economics: '19.1% effective (OK: ≤20% effective). ₹3.2L counted · 8 buyers',
          logic:
            'January drop-off is when renewals are lost. Spreading the perks across Jan–Mar gives members a reason to show up every week of the hardest quarter, which is what keeps them renewing.',
          kpi: 'December renewal yield; Q1 2028 visits of calendar holders vs others.',
          lever: 'annual',
        },
        {
          name: 'Boxing Day (Gloves Optional)',
          tag: 'Renewal',
          months: 'Dec',
          audience: 'Everyone: pack buyers, members topping up, newcomers.',
          mechanic:
            '12-class pack: ₹10,500 (20% off the ₹13,125 list price). Sun 26–Mon 27 Dec only: 12-class packs at 20% off: Mumbai ₹15,750 (list ₹19,688), Kenkere ₹10,500 (₹13,125); pop-ups 10-class pack at 20% (₹6,804). Two per person; buy now, start whenever January starts for you.',
          economics: '20% effective (OK: spot offer (≤25%)). ₹1.5L counted · 14 buyers',
          logic:
            'The week after Christmas is empty in studio but busy on phones. A two-day pack price pulls January purchases forward without touching membership prices.',
          kpi: 'Packs sold in 48 hours; January visits on Boxing Day packs.',
          lever: 'annual',
        },
      ],
      months: [
        {
          month: 'Jan',
          event: 'Resolutions with receipts',
          theme: 'Resolutions with Receipts',
          focus:
            'Turn New Year intent into paid commitments that are active on 1 Feb; re-up the annuals due Dec–Feb; test the 3-for-2 newcomer pack.',
          offers: ["Third Time's the Charm", "U Up? It's 2027.", "The Baker's Dozen", 'The 57-Hour Hangover Sale'],
          actions: [
            "Third Time's the Charm: First class: awkward. Second: better. Third: hooked. 3 classes for the price of 2.",
            "U Up? It's 2027.: U up? Your mat's been asking about you.",
            "The Baker's Dozen: 12 months is so 2026. Renew your annual and get 13.",
            'The 57-Hour Hangover Sale: Hungover? Same. 1 month unlimited, flat ₹15,000. 57 hours only.',
          ],
          why: 'Key dates: New Year + 57-Hour Hangover Sale (to 3 Jan 09:00) (1 Jan).',
        },
        {
          month: 'Feb',
          event: 'Valentine’s + Galentine’s + Singles Awareness Day',
          theme: 'Red Flags, Green Flags',
          focus:
            'Turn Valentine’s-season traffic into first memberships through a mystery-class intro; recruit through members’ love letters; move February renewals onto 3–12 month plans; let lapsed clients come back on the commitment they choose. Every reward is tied to a purchase or a visit.',
          offers: [
            'Blind Date (No Catfishing)',
            'Love Bombing (The Healthy Kind)',
            'It’s Not You, It’s Your Schedule',
            'Put a Ring On It',
          ],
          actions: [
            'Blind Date (No Catfishing): Two classes. You don’t know which. That’s the fun part.',
            'Love Bombing (The Healthy Kind): Love bombing, but it’s two free classes and zero manipulation.',
            'It’s Not You, It’s Your Schedule: It’s not you, it’s your schedule. Pick a relationship status.',
            'Put a Ring On It: If you like it, then you should’ve put a 6-month on it.',
          ],
          why: 'Key dates: Green Flag Week: Blind Date envelopes at every desk (1 Feb); Galentine’s class (bring a friend free) (13 Feb); Valentine’s Day: Partner Barre (14 Feb); Singles Awareness Day: Hate-Squat Hour (break-up playlist class) (15 Feb).',
        },
        {
          month: 'Mar',
          event: "Women's Day + Main Character Month (format exploration)",
          theme: 'Main Character Month',
          focus:
            "Hold the March trough: widen members' formats, use Women's Day for Bandra Lab acquisition, stop March expiries waiting for April, fix Bengaluru's second-visit leak.",
          offers: ["The Second Date's On Us", 'Monogamy Is Overrated', 'Bura Na Mano, Renewal Hai'],
          actions: [
            "The Second Date's On Us: First date: half price. Second date: on us. Third: it's a relationship.",
            'Monogamy Is Overrated: Committed to one class? Cute. Members who play the field stay longer.',
            'Bura Na Mano, Renewal Hai: Bura na mano, renewal hai. 48 hours only.',
          ],
          why: "Key dates: Galentine’s-to-Women’s-Day open house (bring a friend) (2 Mar); International Women's Day — Lift Like a Girl week (Bandra) (8 Mar); Holi (approx.) — 48-hour renewal window 21–22 Mar (22 Mar, approx.).",
        },
        {
          month: 'Apr',
          event: '9th anniversary: limited editions, the wheel, the 9:09 flash and the Golden Glute Awards',
          theme: 'Cloud Nine — 9 Years of Physique 57',
          focus:
            'Flagship month: win on excitement and economics. Two products that exist only in April (the 9-Month Lease and the 9-Class Pack), a 9:09 flash, a wheel you can double, numbered Club Nine annuals and a month of events, with no offer above 25% effective (cash ≤20% except annuals, the flash and the bulk pack). Every April buyer leaves with a reason to come back in May.',
          offers: [
            'Party Crasher Pass',
            'Plus One, Plus Nine',
            'Faking Your Own Death Didn’t Work',
            'Club Nine: The Founders’ Table',
            'Spin Class (Literally)',
            'Moving In Together (The 9-Month Lease)',
            'The 9:09 Panic Attack',
          ],
          actions: [
            'Party Crasher Pass: It’s our 9th birthday and you’re invited. 3 classes for ₹999.',
            'Plus One, Plus Nine: Bring a friend, get 9 days. Bring three, get a month.',
            'Faking Your Own Death Didn’t Work: We wrote your obituary. You’re not getting out of it that easily.',
            'Club Nine: The Founders’ Table: Nine numbered seats per studio. Founder perks for a year.',
            'Spin Class (Literally): Renew, then spin. Every spin wins. Feeling brave? Double it.',
            'Moving In Together (The 9-Month Lease): Nine years in, we’re ready to move in together. 99 keys. No second batch.',
            'The 9:09 Panic Attack: Plank for your price. Or wait for 9:09 and panic with everyone else.',
          ],
          why: 'Key dates: Launch: “Nine Years in Ninety Seconds” film; 9-Month Lease and 9-Class Pack on sale (1 Apr); Blind Date With a Class (format and trainer secret until you walk in) (3 Apr); Throwback Class: the 2018 playlist and original choreography (6 Apr); Bring Your Barre-stie: free guest pass for every member (8 Apr); The 9:09 Panic Attack: two 99-minute flash windows (9 Apr); Séance Class (candle-lit winback class) (15 Apr); Club Nine Unveiling + Birthday Bash (17–18 Apr) (17 Apr); Physique 57 India 9th anniversary: ‘9 at 9’ class, cake and the Time Capsule (18 Apr); Throwback Reunion + Golden Glute Awards (24 Apr); Lock-In: last keys, midnight close of anniversary prices (30 Apr).',
        },
        {
          month: 'May',
          event: "Students home for the holidays + Mother's Day",
          theme: 'Home for the Holidays',
          focus:
            "Students home from college fill empty off-peak seats; Mother's Day duos; keep April's buyers attending.",
          offers: [
            'Mom Said Get Off the Couch',
            'Group Project (Finally, Everyone Pulls Their Weight)',
            'Mom-entum',
            "Don't Ghost Us After the Party",
          ],
          actions: [
            "Mom Said Get Off the Couch: Home for the summer and Mom's already said 'do something'?",
            'Group Project (Finally, Everyone Pulls Their Weight): Group projects: usually one person does all the work. Not here.',
            'Mom-entum: She carried you for 9 months. You can carry her to class.',
            "Don't Ghost Us After the Party: Great party. Now show up 8 times in May.",
          ],
          why: "Key dates: Mother's Day (9 May).",
        },
        {
          month: 'Jun',
          event: 'Privates month + Out of Office',
          theme: 'Privates Month + Out of Office',
          focus:
            "Grow privates with off-peak pricing and bulk packs (Bandra's biggest gap); stop summer travel lapses with freezes, not discounts; test a private-first intro.",
          offers: [
            'Shy Girl Starter Pack',
            'Auto-Reply: Out of Office, Still Squatting',
            'Happy Hour (Zero Hangover, All Glutes)',
            'Private Practice',
          ],
          actions: [
            'Shy Girl Starter Pack: Not a front-row person yet? Start with a private.',
            "Auto-Reply: Out of Office, Still Squatting: Auto-reply: I'm on vacation, but my membership isn't lapsing.",
            'Happy Hour (Zero Hangover, All Glutes): Happy hour, but the only thing on tap is a trainer.',
            'Private Practice: Ten sessions. One trainer who knows your knees better than your physio.',
          ],
          why: "Key dates: Father's Day (20 Jun).",
        },
        {
          month: 'Jul',
          event: 'Studio bookouts + monsoon',
          theme: 'Book the Studio + Rain Check',
          focus:
            'Studio bookouts and corporate bulk as new channels; protect monsoon renewals; bring lapsed clients back before August.',
          offers: [
            'Shy Girl Starter Pack',
            'Gone With the Wind, Back With the Rain',
            'Rain Check (Literally)',
            'Kitty Party, But Make It Cardio',
          ],
          actions: [
            'Shy Girl Starter Pack: Not a front-row person yet? Start with a private.',
            'Gone With the Wind, Back With the Rain: Left us in the summer heat? Come back for the monsoon.',
            "Rain Check (Literally): Monsoon happens. Your late-cancel fee doesn't have to.",
            'Kitty Party, But Make It Cardio: Kitty party, but make it cardio.',
          ],
          why: 'Key dates: Freedom Weekend early-access list opens (for August) (15 Jul).',
        },
        {
          month: 'Aug',
          event: 'Friendship Day + Freedom Weekend + Raksha Bandhan',
          theme: 'Azaadi From Average',
          focus:
            'Recruit whole friend groups on Friendship Day; sell annuals over Freedom Weekend with a 2028 price lock instead of a deeper discount; remove the commitment objection for newcomers with a break-up clause; protect the festive-season renewal book with freezes. Every reward is tied to a purchase or a visit, never to a class count.',
          offers: [
            'No Strings Attached',
            'Squad Goals, Squat Goals',
            'Freedom to Pause (Not Quit)',
            'Price Ki Azaadi (Freedom From Price Hikes)',
          ],
          actions: [
            'No Strings Attached: Commitment issues? Same. Here’s a membership with a break-up clause.',
            'Squad Goals, Squat Goals: Your squad. Our studio. Matching socks, obviously.',
            'Freedom to Pause (Not Quit): Pause for Ganpati. Pause for Diwali. Just don’t quit.',
            'Price Ki Azaadi (Freedom From Price Hikes): Freedom from price hikes. Lock your 2028 renewal at 2027 prices.',
          ],
          why: 'Key dates: Friendship Day: Squad Classes (1 Aug); Freedom Weekend opens: Price Ki Azaadi (13–17 Aug) (13 Aug); Independence Day: Freedom Flow class at 8:15 am (15 Aug); Raksha Bandhan (approx.): Sibling Barre (17 Aug, approx.).',
        },
        {
          month: 'Sep',
          event: 'The Comeback (winback month) + 57 Days to Diwali',
          theme: 'The Comeback + 57 Days to Diwali',
          focus:
            'Winback month: manager calls for high-value lapsed clients, fast comebacks for recent lapsers; a results-guarantee bundle; lock 3M plans before the festive dip.',
          offers: ['Glow-Up or Give Back', 'We Need to Talk', 'New Phone, Who Dis?', 'Lock It Before the Laddoos'],
          actions: [
            'Glow-Up or Give Back: 57 days to Diwali. Glow up, or we give back.',
            'We Need to Talk: We need to talk. Not like that — we just miss you.',
            "New Phone, Who Dis?: New phone, who dis? (It's us. Your favourite class.)",
            'Lock It Before the Laddoos: Lock it before the laddoos.',
          ],
          why: 'Key dates: 57 Days to Diwali countdown begins (2 Sep); World Heart Day (29 Sep).',
        },
        {
          month: 'Oct',
          event: 'Diwali gifting + upgrades',
          theme: 'Festival of Lights',
          focus: 'Gift-led acquisition, 1M→6M upgrades and a Dhanteras annual window, without open codes.',
          offers: [
            'Diwali Gifting, Minus the Dry-Fruit Box',
            'Diwali Cleaning: Found Your Old Grip Socks?',
            'Gold Rush (Dhanteras Edition)',
            'From Phuljhadi to Anaar',
          ],
          actions: [
            "Diwali Gifting, Minus the Dry-Fruit Box: This Diwali, gift something they'll actually use.",
            'Diwali Cleaning: Found Your Old Grip Socks?: Diwali cleaning found your old grip socks. Sign?',
            'Gold Rush (Dhanteras Edition): Buy gold this Dhanteras. The kind that lifts.',
            'From Phuljhadi to Anaar: Upgrade from a phuljhadi to an anaar.',
          ],
          why: 'Key dates: Dhanteras window (26–28 Oct, approx.) (26 Oct, approx.); Diwali (approx.) (29 Oct, approx.).',
        },
        {
          month: 'Nov',
          event: 'Wedding season + 11.11 + Black Friday',
          theme: 'Shaadi Season (and a Very Black Friday)',
          focus:
            'Sell group packs into the wedding season; bring lapsed clients back before the baraat; one loud 11-hour pack day on 11.11; and a Black Friday that moves renewals onto long plans with a mystery bonus instead of a deeper price.',
          offers: [
            'Bride Squad, Assemble (Groom Can Come Too)',
            'Shaadi Mein Zaroor Aana (Come Back Before the Baraat)',
            'Black Friday Blind Box (No Duds)',
            '11.11: Treat Yourself, Not Your Ex',
          ],
          actions: [
            'Bride Squad, Assemble (Groom Can Come Too): Four of you, one wedding, zero excuses. Squad rates inside.',
            'Shaadi Mein Zaroor Aana (Come Back Before the Baraat): Shaadi mein zaroor aana. And to class before that.',
            'Black Friday Blind Box (No Duds): Black Friday, but every box is a winner. We checked.',
            '11.11: Treat Yourself, Not Your Ex: 11.11. Eleven hours. Treat yourself, not your ex.',
          ],
          why: 'Key dates: 11.11: Treat Yourself, Not Your Ex (11:11 am–10:11 pm) (11 Nov); Sangeet Choreo Barre (ends on a dance-floor routine) (20 Nov); Black Friday Blind Box opens (26–29 Nov) (26 Nov); Cyber Monday: last boxes (29 Nov).',
        },
        {
          month: 'Dec',
          event: 'Gifting + Christmas + Boxing Day + NYE',
          theme: 'Party Season Survival Guide',
          focus:
            'Renew December’s book onto long plans with perks spread across Q1; sell January starts now with Resolution Insurance; turn gifting into January newcomers; bank pack demand on Boxing Day; win back long-lapsed clients with a plus-one to the NYE Countdown Class.',
          offers: [
            'Resolution Insurance (Claim Approved)',
            'The Gift They Won’t Regift',
            'The Ex-Files: Season Finale',
            'The Advent-ure Calendar (Opens in January)',
            'Boxing Day (Gloves Optional)',
          ],
          actions: [
            'Resolution Insurance (Claim Approved): Insure your resolution before you make it. Claim approved.',
            'The Gift They Won’t Regift: The one gift that doesn’t end up in next year’s Secret Santa.',
            'The Ex-Files: Season Finale: Every great series needs a finale. Yours is a comeback.',
            'The Advent-ure Calendar (Opens in January): An advent calendar you open in January, when you actually need it.',
            'Boxing Day (Gloves Optional): Boxing Day. No gloves, just a 12-class pack at 20% off.',
          ],
          why: 'Key dates: Advent-ure Calendars and gift boxes on sale (1 Dec); Ugly Sweater Barre (18 Dec); Christmas Eve candle-lit class (24 Dec); Boxing Day (Gloves Optional): 26–27 Dec (26 Dec); NYE Countdown Class (11 am) (31 Dec).',
        },
      ],
      rhythm: [
        [
          'Newcomer journey',
          "Offers: Third Time's the Charm, Blind Date (No Catfishing), Love Bombing (The Healthy Kind), The Second Date's On Us, Party Crasher Pass, Plus One, Plus Nine, Mom Said Get Off the Couch, Group Project (Finally, Everyone Pulls Their Weight), Mom-entum, Shy Girl Starter Pack, No Strings Attached, Squad Goals, Squat Goals, Glow-Up or Give Back, Diwali Gifting, Minus the Dry-Fruit Box, Bride Squad, Assemble (Groom Can Come Too), Resolution Insurance (Claim Approved), The Gift They Won’t Regift. Watch each offer's “What to watch” measures and rate of sale monthly.",
        ],
        [
          'Lapsed journey',
          "Offers: U Up? It's 2027, It’s Not You, It’s Your Schedule, Faking Your Own Death Didn’t Work, Gone With the Wind, Back With the Rain, We Need to Talk, New Phone, Who Dis?, Diwali Cleaning: Found Your Old Grip Socks?, Shaadi Mein Zaroor Aana (Come Back Before the Baraat), The Ex-Files: Season Finale. Watch each offer's “What to watch” measures and rate of sale monthly.",
        ],
        [
          'Renewal journey',
          "Offers: The Baker's Dozen, The 57-Hour Hangover Sale, Put a Ring On It, Monogamy Is Overrated, Bura Na Mano, Renewal Hai, Club Nine: The Founders’ Table, Spin Class (Literally), Moving In Together (The 9-Month Lease), The 9:09 Panic Attack, Don't Ghost Us After the Party, Auto-Reply: Out of Office, Still Squatting, Happy Hour (Zero Hangover, All Glutes), Private Practice, Rain Check (Literally), Kitty Party, But Make It Cardio, Freedom to Pause (Not Quit), Price Ki Azaadi (Freedom From Price Hikes), Lock It Before the Laddoos, Gold Rush (Dhanteras Edition), From Phuljhadi to Anaar, Black Friday Blind Box (No Duds), 11.11: Treat Yourself, Not Your Ex, The Advent-ure Calendar (Opens in January), Boxing Day (Gloves Optional). Watch each offer's “What to watch” measures and rate of sale monthly.",
        ],
      ],
      scorecard: [
        ['Leads → trials', '9,409', '3,387', 'Newcomer journeys'],
        ['Trials → new buyers', '3,387', '633', 'Newcomer journeys'],
        ['Renewals due → purchases', '720', '434', 'Renewal journeys'],
        ['Lapsed touches → reactivated', '3,207', '84', 'Lapsed journeys'],
        ['Target → offers planned', '₹125.9L', '₹68.8L', 'Plan of record'],
      ],
      funnel: {
        newShare: 0.16,
        avgFirstPurchase: 3141.22,
        visitsPerBuyer: 2.44,
        leadsPerVisit: 2.52,
        renewalShare: 0.46,
        winbackShare: 0.15,
        convNow: 25.73,
        convTarget: 29.39,
      },
      channels: [
        ['Website & online', 1905, 12.4, 7],
        ['Hosted & walk-in', 524, 69.5, 4.8],
        ['Referrals', 455, 78.9, 29],
        ['Calls & WhatsApp', 180, 71.1, 47.2],
        ['Other', 82, 56.1, 46.3],
        ['Social & influencer', 71, 42.3, 8.5],
      ],
      slots: [
        ['Weekday · Early (before 9)', 52, 3525, 182],
        ['Weekday · Evening (4–7)', 44, 3218, 314],
        ['Weekday · Late evening (7+)', 58, 3234, 142],
        ['Weekday · Late morning (9–12)', 38, 3109, 234],
        ['Weekend · Afternoon (12–4)', 78, 0, 12],
        ['Weekend · Evening (4–7)', 31, 2401, 93],
        ['Weekend · Late morning (9–12)', 72, 5120, 189],
      ],
      monthly: {
        '2024': [587000, 630613, 635804, 677555, 569821, 357548, 604502, 648086, 577643, 645739, 707876, 680197],
        '2025': [750828, 815920, 609461, 962639, 605520, 781728, 955327, 698329, 1127406, 484055, 979046, 527555],
        '2026': [1110874, 833988, 621187, 1215530, 985683, 917710, 1088189, 959985, 1028435, null, null, null],
      },
      seasonality: [0.97, 1.05, 0.79, 1.24, 0.78, 1.01, 1.23, 0.9, 1.46, 0.62, 1.26, 0.68],
      entry: [
        ['Studio 1 Month Unlimited', 81, 13559, 33186, 48],
        ['Studio 8 Class Package', 62, 8359, 19515, 39],
        ['Studio Newcomers 2 Week Unlimited', 30, 6586, 15027, 33],
        ['Studio Newcomers 2 For 1', 75, 1377, 8885, 47],
        ['New Client Intro Pack', 52, 709, 6786, 37],
        ['Studio Single Class', 197, 1346, 5674, 42],
        ['Session', 177, 1913, 5188, 32],
      ],
    },
    'Pop-up': {
      name: 'Pop-up',
      city: 'Bengaluru',
      headline:
        '2027 plan of record: ₹23.1L target across twelve themed months; ₹10.5L is carried by named offers and the rest is full-price trade.',
      snapshot: [
        ['TTM revenue', '₹15.4L', 'first full year', true],
        ['2027 target', '₹23.1L', '+50% on the last 12 months', true],
        ['Paying clients (TTM)', '513', '₹3,003 per client · ATV ₹848', true],
        ['New-client revenue', '25%', 'renewal 62% · return 9% · win-back 4%', true],
        ['Trial conversion', '34.0%', 'non-hosted · hosted 5.2%', true],
        ['Effective discount', '1.9%', '2025: 0.5%', false],
        ['Class fill', '28%', '3.0 per class · late-cancel 4.6%', false],
        ['Dormant 60–365 days', '300', '49 with 3+ past purchases', false],
      ],
      diagnosis: [
        {
          title: 'Renewals carry the year',
          stat: '44%',
          detail: 'Renewal plan ₹10.1L of ₹23.1L; 140 renewal purchases planned from 182 due.',
          implication:
            "Renewal offers: Same Time Next Week, Put a Ring On It, Spin Class (Literally), The 9:09 Panic Attack, Don't Ghost Us After the Party, Rain Check (Literally), Kitty Party, But Make It Cardio, Freedom to Pause (Not Quit), Black Friday Blind Box (No Duds), 11.11: Treat Yourself, Not Your Ex, The Advent-ure Calendar (Opens in January), Boxing Day (Gloves Optional).",
        },
        {
          title: 'New clients',
          stat: '608',
          detail: 'New-client plan ₹11.3L: 7,111 leads → 1,849 trials → 608 new buyers.',
          implication:
            "Newcomer offers: Third Time's the Charm, Blind Date (No Catfishing), Love Bombing (The Healthy Kind), The Second Date's On Us, Party Crasher Pass, Plus One, Plus Nine, Mom Said Get Off the Couch, Group Project (Finally, Everyone Pulls Their Weight), Mom-entum, No Strings Attached, Squad Goals, Squat Goals, Diwali Gifting, Minus the Dry-Fruit Box, Bride Squad, Assemble (Groom Can Come Too), The Gift They Won’t Regift.",
        },
        {
          title: 'Lapsed clients',
          stat: '24',
          detail: 'Reactivation plan ₹1.4L: 24 reactivated from 2,221 touches.',
          implication:
            "Lapsed offers: U Up? It's 2027, It’s Not You, It’s Your Schedule, Faking Your Own Death Didn’t Work, Gone With the Wind, Back With the Rain, New Phone, Who Dis?, Diwali Cleaning: Found Your Old Grip Socks?, The Ex-Files: Season Finale.",
        },
        {
          title: 'Peak month: Sep',
          stat: '₹2.7L',
          detail: 'The Comeback + 57 Days to Diwali · The Comeback (winback month) + 57 Days to Diwali.',
          implication:
            'Winback month: manager calls for high-value lapsed clients, fast comebacks for recent lapsers; a results-guarantee bundle; lock 3M plans before the festive dip.',
        },
      ],
      build: {
        forecast2026: 1540884.84,
        momentum: 0,
        baseline: 1540884.84,
        levers: [
          {
            id: 'conversion',
            name: 'Trial-to-member conversion',
            value: 35241,
            math: '444 non-hosted first visits × (34.0% → 39.4%) = +24 members × ₹2,000 first-year value × 0.73 in-year realisation',
            why: "Plan of record: carried by the newcomer offers — Third Time's the Charm, Blind Date (No Catfishing), Love Bombing (The Healthy Kind), The Second Date's On Us, Party Crasher Pass, Plus One, Plus Nine, Mom Said Get Off the Couch, Group Project (Finally, Everyone Pulls Their Weight), Mom-entum, No Strings Attached, Squad Goals, Squat Goals, Diwali Gifting, Minus the Dry-Fruit Box, Bride Squad, Assemble (Groom Can Come Too), The Gift They Won’t Regift.",
          },
          {
            id: 'leads',
            name: 'Online-lead speed to trial',
            value: 107546,
            math: '997 online leads × trial rate 11.5% → 20.2% × 85% trial→member = +73 members × ₹2,000 × 0.73',
            why: "Plan of record: carried by the newcomer offers — Third Time's the Charm, Blind Date (No Catfishing), Love Bombing (The Healthy Kind), The Second Date's On Us, Party Crasher Pass, Plus One, Plus Nine, Mom Said Get Off the Couch, Group Project (Finally, Everyone Pulls Their Weight), Mom-entum, No Strings Attached, Squad Goals, Squat Goals, Diwali Gifting, Minus the Dry-Fruit Box, Bride Squad, Assemble (Groom Can Come Too), The Gift They Won’t Regift.",
          },
          {
            id: 'referral',
            name: 'Paid-on-conversion referral engine',
            value: 39542,
            math: '71 referral leads × +50% volume × 76.1% lead→member = +27 members × ₹2,000 × 0.73',
            why: "Plan of record: carried by the newcomer offers — Third Time's the Charm, Blind Date (No Catfishing), Love Bombing (The Healthy Kind), The Second Date's On Us, Party Crasher Pass, Plus One, Plus Nine, Mom Said Get Off the Couch, Group Project (Finally, Everyone Pulls Their Weight), Mom-entum, No Strings Attached, Squad Goals, Squat Goals, Diwali Gifting, Minus the Dry-Fruit Box, Bride Squad, Assemble (Groom Can Come Too), The Gift They Won’t Regift.",
          },
          {
            id: 'winback',
            name: 'Drop-in reactivation',
            value: 144000,
            math: '300 dormant drop-in clients × 12% return × ₹4,000 (≈ one 4-class pack)',
            why: "Plan of record: carried by the lapsed offers — U Up? It's 2027, It’s Not You, It’s Your Schedule, Faking Your Own Death Didn’t Work, Gone With the Wind, Back With the Rain, New Phone, Who Dis?, Diwali Cleaning: Found Your Old Grip Socks?, The Ex-Files: Season Finale.",
          },
          {
            id: 'packs',
            name: 'Credit-to-pack upgrades',
            value: 182400,
            math: '76 clients bought 3+ single credits × 30% upgrade to an 8/10-pack × 2 cycles × ~₹4,000 net uplift',
            why: "Final plan: carried by the renewal offers — Credit Where It's Due, Pack + Passport.",
          },
        ],
        leverTotal: 508728.37,
        haircut: 0.15,
        projection: 1973303.96,
        appTargetAtBuild: 2310000,
      },
      offers: [
        {
          name: "Third Time's the Charm",
          tag: 'Acquisition',
          months: 'Jan',
          audience: 'First-time clients (phone verified).',
          mechanic:
            '3-class pass: ₹1,890. Replaces the Newcomers 2-for-1 for January. Mumbai: 3 classes for ₹3,885 (price of 2 singles) — mix barre, powerCycle and Strength Lab (Lab seats at Supreme HQ; Kwality off-peak only), use within 14 days. Kenkere: 3 barre classes for ₹2,835 (counts as the once-in-a-lifetime 2-for-1; replaces the 50% intro in January). Then the standard 15% on a first membership: 1 Month ₹17,203 / ₹12,406.',
          economics:
            '33% effective (OK: intro/acquisition product, credited/converted at ≤20%). ₹0.2L counted · 3 buyers',
          logic:
            '60.6% of first-timers never take a 2nd class. Purchase within 60 days by month-1 visits: 0 return visits 10.8%, 1 → 43.9%, 2 → 73.3%, 3–4 → 88.6%. The 2-for-1 route converts 20.8% (Bandra 17%). A third class moves people into the 73–89% band.',
          kpi: 'Packs with all 3 classes used in 14 days (target 60%); pack → membership (target 35% vs 20.8% on 2-for-1).',
          lever: 'conversion',
        },
        {
          name: "U Up? It's 2027.",
          tag: 'Win-back',
          months: 'Jan',
          audience: 'Standard lapsed 15%, bonus earned (≈20% effective if earned)',
          mechanic:
            '10-class pack: ₹7,229 (15% off the ₹8,505 list price). Lapsed 61–365 days: the standard 15% on 1 Month (₹17,203 / ₹12,406) or a 12-class pack (₹16,735 / ₹11,156). Take 12 classes by 31 Jan and get +5 days (pack buyers: +1 class). Pop-ups: 15% on an 8- or 10-class pack (₹5,891 / ₹7,229) and +1 class for 6 classes by 31 Jan.',
          economics: '20% effective (OK: ≤20% effective). ₹0.2L counted · 3 buyers',
          logic:
            'Bandra is reactivation-led (3,209 lapsed vs 5,065 renewed membership records). Renewal climbs with usage: Bandra members using <50% of sessions renew 49–58% vs 82% at 75%+. The bonus is only paid for attendance that predicts the next renewal.',
          kpi: 'Lapsed buyers; share hitting 12 classes (target 40%); Feb renewal of Jan winbacks.',
          lever: 'winback',
        },
        {
          name: 'Same Time Next Week',
          tag: 'Renewal',
          months: 'Jan, Mar, Sep, Oct',
          audience: 'Pop-up clients whose class pack is running out.',
          mechanic:
            '10-class pack: ₹7,229 (15% off the ₹8,505 list price). Pop-up regulars whose pack is running out take the same pack again at 15%: Copper + Cloves 10-class ₹7,229 (list ₹8,505) or 8-class ₹5,891 (list ₹6,930), with one extra week of validity. Bought before the old pack expires.',
          economics: '15% effective (OK: ≤20% effective). ₹0.4L counted · 5 buyers',
          logic:
            'The pop-ups sell class packs, not memberships, so renewal is a repurchase decision rather than an expiry date. Four of the twelve months carried a renewal target with no renewal offer in the catalogue; this is the standing one.',
          kpi: 'Packs repurchased within 14 days of running out (target 55%); share of pop-up renewal revenue with an offer behind it.',
          lever: 'annual',
        },
        {
          name: 'Blind Date (No Catfishing)',
          tag: 'Acquisition',
          months: 'Feb',
          audience: 'First-time clients (phone verified).',
          mechanic:
            '8-class pack: ₹5,891 (15% off the ₹6,930 list price). Mumbai: 2 mystery classes in 10 days for ₹999. The format (Barre, powerCycle or Strength Lab) and the trainer stay sealed in an envelope until you walk in; date two is booked at the desk before you leave. Kenkere: 2 mystery Barre classes (trainer and playlist sealed) for ₹709. Pop-ups: the paid trial (≈₹945), with the second class free if it is booked at the desk. Buy within 72 hours of date two and the ₹999 / ₹709 is credited against 1 Month at the standard 15% (₹16,204 / ₹11,697 net). Pop-ups: 8-class pack at 15% (₹5,891).',
          economics: '15% effective (OK: ≤20% effective). ₹0.2L counted · 3 buyers',
          logic:
            'Kenkere’s VDAY50! code (38 uses, ₹2.6L given away at 50%) bought February volume at a huge cost. A booked second visit lifts trial→member from 10.8% to 43.9%, and a mystery format gets newcomers into the class they would never pick, which is usually the one that sells the membership.',
          kpi: 'Second-date booked at the desk (target 70%); trial → member (target 30%).',
          lever: 'conversion',
        },
        {
          name: 'Love Bombing (The Healthy Kind)',
          tag: 'Acquisition',
          months: 'Feb',
          audience: 'Current members bringing a never-been friend.',
          mechanic:
            '8-class pack: ₹5,891 (15% off the ₹6,930 list price). Every active member gets three printed love letters at the desk (and a WhatsApp version). Each one gives a never-been friend 2 free classes within 14 days. If the friend buys 1 Month or a 12-class pack within 72 hours of class 2: their standard 15% (₹17,203 / ₹12,406; pop-ups 8-class ₹5,891) plus P57 grip socks, and the member gets +5 days (pack: +1 class) per friend who buys, up to 15 days. Partner Barre on Sun 14 Feb counts as class 2.',
          economics: '15% effective (OK: ≤20% effective). ₹0.1L counted · 2 buyers',
          logic:
            'Referrals convert 41.2% at Kwality, 22.6% at Bandra, 28.3% at Kenkere and 76.1% at pop-ups, versus 3.8–5.7% for website leads. The 2026 BOGO codes (70 uses, ₹3.1L given) went mostly to existing clients; this one pays out only when a genuinely new person buys.',
          kpi: 'Letters redeemed; new buyers from referral (target +40% vs Feb-26).',
          lever: 'conversion',
        },
        {
          name: 'It’s Not You, It’s Your Schedule',
          tag: 'Win-back',
          months: 'Feb',
          audience: 'Lapsed 61–365 days.',
          mechanic:
            '8-class pack: ₹5,891 (15% off the ₹6,930 list price). Lapsed 61–365 days pick a relationship status at the standard 15%: Exclusive = 3 Months (₹49,177 / ₹35,879) + 1 extra freeze; Casual = a 12-class pack (₹16,735 / ₹11,156); It’s Complicated = 1 Month (₹17,203 / ₹12,406) + 1 free freeze for the week life gets in the way. Pop-ups: 8-class pack at 15% (₹5,891). Galentine’s class Sat 13 Feb: bring a friend free.',
          economics: '15% effective (OK: ≤20% effective). ₹0.1L counted · 2 buyers',
          logic:
            'Lapsers average 2.6–3.4 visits in the first half of a membership vs 6.4 for renewers: they left because the plan did not fit the week, not because of the price. Letting them pick the commitment removes the objection without deepening the discount.',
          kpi: 'Reactivations; mix of Exclusive / Casual / Complicated (target 30% Exclusive).',
          lever: 'winback',
        },
        {
          name: 'Put a Ring On It',
          tag: 'Renewal',
          months: 'Feb',
          audience: 'Members renewing in February (any expiry date).',
          mechanic:
            '10-class pack: ₹7,655 (10% off the ₹8,505 list price). Any February renewal: 3 Months at 15% (₹49,177 / ₹35,879) + a P57 mini-band “ring”; 6 Months at 15% + 1 private session (₹96,658 / ₹69,883); Annual at the standard 20% + the annual perks + your name engraved on the Wall of Commitment. Say yes at the desk and the bell rings, confetti, the class applauds. Pop-ups: 10-class pack at 10% + the mini-band (₹7,655).',
          economics: '19% effective (OK: ≤20% effective). ₹0.2L counted · 3 buyers',
          logic:
            'Members using 75%+ of their sessions renew at 82–88%, and longer plans keep them using them. The best perks sit on the longest plans; nothing is unlocked by a class count, so every renewer qualifies.',
          kpi: '3M+ share of renewal value (target 45%); proposals accepted at the desk.',
          lever: 'annual',
        },
        {
          name: "The Second Date's On Us",
          tag: 'Acquisition',
          months: 'Mar, Jun, Jul, Sep',
          audience: 'First-time clients (phone verified).',
          mechanic:
            '8-class pack: ₹5,891 (15% off the ₹6,930 list price). Kenkere: Newcomers Intro (first class at 50% off, ₹709) → class 2 free if booked at the desk before leaving, within 7 days → 1 Month (₹12,406) or 8-class pack (₹7,408) at the standard 15% within 72 hours of class 2, plus 1 extra freeze. Pop-ups: paid trial (≈₹945) → second class free if booked before leaving → 8- or 10-class pack at 15% within 72 hours.',
          economics: '15% effective (OK: ≤20% effective). ₹0.5L counted · 8 buyers',
          logic:
            'Kenkere logged 3,217 leads in 12 months; only 36% reached a trial and 13.1% converted. 581 single-class sales show high drop-in, low commitment. A booked second visit lifts conversion from 10.8% to 43.9%.',
          kpi: 'Second-visit rate (target 55%); trial → member (target 25% vs 18.7%).',
          lever: 'conversion',
        },
        {
          name: 'Party Crasher Pass',
          tag: 'Acquisition',
          months: 'Apr',
          audience: 'First-time clients (phone verified).',
          mechanic:
            '8-class pack: ₹4,893 (29% off the ₹6,930 list price). Mumbai: 3 classes in 9 days for ₹999, any format, including a Birthday Bash party class (17–18 Apr). Kenkere: 3 Barre classes for ₹699 (replaces the 50% intro in April; counts as the once-in-a-lifetime 2-for-1). Pop-ups: 2 classes for ₹999. The pass price is credited against a first 1 Month or 12-class pack bought within 72 hours of class 3, on top of the standard 15% (1 Month nets ₹16,204 / ₹11,707). Buy within 9 hours of class 3 and you hit the Impulse Buzzer: confetti, applause, name on the Reckless Decisions board.',
          economics: '15% effective (OK: ≤20% effective). ₹0.1L counted · 3 buyers',
          logic:
            'A booked sequence of classes is what converts; the party class gives newcomers the best room of the year, and the buzzer turns a sale into a show for whoever is waiting.',
          kpi: 'Pass → member (target 35%); buzzer hits (bought within 9 hours).',
          lever: 'conversion',
        },
        {
          name: 'Plus One, Plus Nine',
          tag: 'Acquisition',
          months: 'Apr',
          audience: 'Current members bringing a never-been friend.',
          mechanic:
            '8-class pack: ₹5,891 (15% off the ₹6,930 list price). Any active member whose never-been friend buys in April gets +9 days (pack members: +2 classes). Three buying friends = a free month. The friend gets the standard 15% and a Cloud Nine tote. Bring Your Barre-stie day (Thu 8 Apr): every member gets a free guest pass.',
          economics: '15% effective (OK: ≤20% effective). ₹0.1L counted · 1 buyers',
          logic:
            'Referrals convert at 22–76% against 3.8–5.7% for website leads. A tier at three friends gives the super-connectors a reason to keep going.',
          kpi: 'Referral buyers (target 2× April 2026); members reaching three.',
          lever: 'conversion',
        },
        {
          name: 'Faking Your Own Death Didn’t Work',
          tag: 'Win-back',
          months: 'Apr',
          audience: 'Lapsed 61 days–3 years.',
          mechanic:
            '10-class pack: ₹7,229 (15% off the ₹8,505 list price). Lapsed 61 days–3 years get an obituary postcard (“Here lies a perfectly good plank”). It is the ticket to the candle-lit Séance Class on Thu 15 Apr. Come back on the standard 15% on 1 Month, a 12-class pack or 3 Months, plus a bonus for every year since your first class (max 3): +1 class on packs, +1 day on unlimited. Photo at the Back From the Dead frame; your row at the Throwback Reunion (Sat 24 Apr).',
          economics: '20% effective (OK: ≤20% effective). ₹0.1L counted · 2 buyers',
          logic:
            'Lapsed clients already know the product; what they need is a moment and a reason that is not just a discount. A personal postcard with a dated class beats a generic reminder.',
          kpi: 'Postcards → Séance Class attendance; reactivations (target +30% vs Apr-26).',
          lever: 'winback',
        },
        {
          name: 'Spin Class (Literally)',
          tag: 'Renewal',
          months: 'Apr',
          audience: 'Members renewing 1 Month or a 12-class pack.',
          mechanic:
            '10-class pack: ₹7,655 (10% off the ₹8,505 list price). Renew 1 Month or a 12-class pack in April at 10% off (₹18,215 / ₹17,719; Kenkere ₹13,136 / ₹11,813; pop-up 10-pack ₹7,655) and spin the Wheel of Nine. Published odds: +1 class 30%, smoothie 20%, guest pass 15%, grip socks 10%, +3 days 10%, extra freeze 8%, 30-min private 5%, P57 tote 1.5%, a free month 0.5%. Then choose: keep it, double it by booking 9 classes in your first 21 days, or donate it to a friend as a guest pass.',
          economics: '18% effective (OK: ≤20% effective). ₹0.5L counted · 7 buyers',
          logic:
            'Clients who use 75%+ of their sessions renew at 80–86%. The doubling option pays the prize only when the member books the classes that make them renew again; the expected value of a spin is ≈₹1,900 Mumbai / ₹1,350 Bengaluru.',
          kpi: 'April renewal yield vs April 2026; share of spins doubled (target 35%).',
          lever: 'annual',
        },
        {
          name: 'The 9:09 Panic Attack',
          tag: 'Renewal',
          months: 'Apr',
          audience: 'Everyone: members, pack buyers and newcomers.',
          mechanic:
            '9-class pack: ₹6,499. The Limited Edition 9-Class Pack (99 days to use it) exists only in April. Plank Your Price at the desk: hold 57 seconds and it is ₹12,999 (Kenkere ₹8,699), 1:57 for ₹12,249 (₹8,199), 2:57 for the floor, ₹11,499 (₹7,699). On Fri 9 Apr, two 99-minute windows from 9:09 am and 9:09 pm give everyone the floor price, no plank needed: siren in studio, countdown on Instagram. Pop-ups: a 9-class pack at ₹6,499 in the same windows.',
          economics: '17.5% effective (OK: ≤20% effective). ₹0.1L counted · 2 buyers',
          logic:
            'A price you earn with your body is the most Physique 57 thing there is, and every plank at the desk is a show for whoever is waiting. The floor price (23.7% / 24.0%) sits inside the 25% spot cap, and plan revenue is counted at the floor.',
          kpi: 'Packs sold in the two 9:09 windows; pack → membership by June.',
          lever: 'annual',
        },
        {
          name: 'Mom Said Get Off the Couch',
          tag: 'Acquisition',
          months: 'May',
          audience: 'First-time clients (phone verified).',
          mechanic:
            '8-class pack: ₹5,544 (20% off the ₹6,930 list price). Students and under-25s (ID checked): 8-class pack at 20% off — Mumbai ₹10,500, Kenkere ₹6,972, pop-ups ₹5,544 — valid 45 days, Golden Hours only (Mon–Fri 10 am–12 pm, Sat–Sun 4–7 pm). On sale 1 May–30 Jun.',
          economics: '20% effective (OK: ≤20% effective). ₹0.2L counted · 3 buyers',
          logic:
            'Weekday 10–12 and weekend 4–7 pm run 27–41% full; the marginal cost of a seat there is near zero. Students arriving home in May are a predictable, untapped audience.',
          kpi: 'Golden Hours fill (target +15 pts); student repeat purchase.',
          lever: 'conversion',
        },
        {
          name: 'Group Project (Finally, Everyone Pulls Their Weight)',
          tag: 'Acquisition',
          months: 'May',
          audience: 'First-time clients (phone verified).',
          mechanic:
            '8-class pack: ₹5,198 (25% off the ₹6,930 list price). 4+ students buy 8-class packs together in one transaction: 25% off each — Mumbai ₹9,844, Kenkere ₹6,536, pop-ups ₹5,198. Golden Hours validity, 45 days.',
          economics: '25% effective (OK: bulk purchase (≤25%)). ₹0.1L counted · 2 buyers',
          logic:
            'Bulk purchase is one of the few places 25% is allowed. Groups attend together (higher usage → higher renewal) and bring four new names per sale.',
          kpi: 'Squads sold; squad members buying again within 60 days.',
          lever: 'conversion',
        },
        {
          name: 'Mom-entum',
          tag: 'Acquisition',
          months: 'May',
          audience: 'First-time clients (phone verified).',
          mechanic:
            "8-class pack: ₹5,891 (15% off the ₹6,930 list price). Mother–child pairs (either way round), 1–16 May. If one is new: the newcomer's standard 15% on 1 Month / 12-class, a shared 30-min duo private and a P57 gift for mum (≈₹2,000 retail — confirm). If both are members: renew together at 10% each + the duo private.",
          economics: '18% effective (OK: ≤20% effective). ₹0.1L counted · 2 buyers',
          logic:
            "Duos with a booked second class convert best; Mother's Day gives a reason. The perk is a shared session, not a bigger discount.",
          kpi: 'Duos trialled; both-buy rate.',
          lever: 'conversion',
        },
        {
          name: "Don't Ghost Us After the Party",
          tag: 'Renewal',
          months: 'May, Jun',
          audience: '≈20% effective on 3M, ≈20% on 1M with the private',
          mechanic:
            '10-class pack: ₹7,229 (15% off the ₹8,505 list price). Everyone who bought in April and takes 8+ classes in May: next renewal 3 Months at 15% (₹49,177 / ₹35,879) or 1 Month at 10% (₹18,215 / ₹13,136), plus a 30-min private. Pop-ups: 10-class pack at 15% + a bonus class.',
          economics: '18% effective (OK: ≤20% effective). ₹0.3L counted · 4 buyers',
          logic:
            '2026 anniversary-code buyers renewed at only 24.5%. Attendance in the month after purchase is the best predictor of renewal; the reward is earned by it.',
          kpi: 'April cohort with 8+ May visits (target 55%); April cohort renewal at next expiry (target 55%).',
          lever: 'annual',
        },
        {
          name: 'Gone With the Wind, Back With the Rain',
          tag: 'Win-back',
          months: 'Jul',
          audience: 'Standard lapsed 15% only',
          mechanic:
            '10-class pack: ₹7,229 (15% off the ₹8,505 list price). Lapsed 61–365 days, 15–31 Jul: the standard 15% on 1 Month or a 12-class pack + 2 extra freezes + a 15-min comeback assessment + first access to August’s Freedom Weekend.',
          economics: '15% effective (OK: ≤20% effective). ₹0.2L counted · 3 buyers',
          logic:
            'An event with a start date beats a generic reminder. Freezes answer the monsoon objection at no cash cost.',
          kpi: 'Reactivations; comeback assessments booked.',
          lever: 'winback',
        },
        {
          name: 'Rain Check (Literally)',
          tag: 'Renewal',
          months: 'Jul',
          audience: '≈15% effective',
          mechanic:
            '10-class pack: ₹7,655 (10% off the ₹8,505 list price). July 1 Month renewers: 10% off (₹18,215 / ₹13,136) + 3 late-cancel amnesty tokens (valid to 30 Sep) + automatic credit-back on official red-alert days. Take 12+ classes in July: +3 days. Pop-ups: 10-class pack at 10% + 2 tokens.',
          economics: '12% effective (OK: ≤20% effective). ₹0.3L counted · 4 buyers',
          logic:
            "Average late cancels per membership: Bandra 1.18, Kenkere 1.36. Late-cancel fees in the monsoon make members feel they 'wasted' a month and lapse.",
          kpi: 'July 1M renewal yield (target 70%); tokens used.',
          lever: 'annual',
        },
        {
          name: 'Kitty Party, But Make It Cardio',
          tag: 'Renewal',
          months: 'Jul',
          audience: 'Anyone booking the studio for a private group of up to 12.',
          mechanic:
            "1-class pass (studio bookout for up to 12): ₹9,999. Book out the studio for a private 50-min class for up to 12 (birthdays, bachelorettes, kitty parties, reunions): Mumbai ₹24,999, Kenkere ₹14,999, pop-ups ₹9,999. Every first-timer gets Third Time's the Charm (3-for-2) and the standard 15% on a first membership within 7 days; the host gets 2 guest passes.",
          economics: '0% effective (OK: ≤20% effective). ₹0.2L counted · 2 buyers',
          logic:
            'Hosted classes are a top lead source (Kwality 394, Bandra 353, Kenkere 281 leads) but convert only 4.6–6.1%. A paid bookout has a host who brings warm friends and pays for the room.',
          kpi: 'Bookouts sold; guest → member (target 15%).',
          lever: 'annual',
        },
        {
          name: 'No Strings Attached',
          tag: 'Acquisition',
          months: 'Aug',
          audience: 'First-time clients (phone verified).',
          mechanic:
            '8-class pack: ₹5,891 (15% off the ₹6,930 list price). Mumbai: 2 classes in 7 days for ₹999 (any format), credited against 1 Month at the standard 15% bought within 72 hours (₹16,204 net). Kenkere: 2 Barre classes for ₹709, credited the same way (₹11,697 net). Pop-ups: paid trial (≈₹945) → 8-class pack at 15% (₹5,891). The No-Strings clause: in the first 14 days of the month, if it is not for you, the desk converts what is left into an 8-class pack (60 days). No break-up fee, no awkward conversation.',
          economics: '15% effective (OK: ≤20% effective). ₹0.2L counted · 4 buyers',
          logic:
            'Clients with 5+ visits in month one buy again at 93.5%. A break-up clause costs almost nothing (few use it) and answers the objection the desk hears most: “what if I can’t keep it up?”.',
          kpi: 'Trial → member (target 35%); No-Strings switches (expect <10%).',
          lever: 'conversion',
        },
        {
          name: 'Squad Goals, Squat Goals',
          tag: 'Acquisition',
          months: 'Aug',
          audience: 'Current members bringing 2–4 never-been friends.',
          mechanic:
            '8-class pack: ₹5,891 (15% off the ₹6,930 list price). Friendship Day (Sun 1 Aug) to 15 Aug, siblings count for Raksha Bandhan: a member books a free Squad Class for 2–4 never-been friends. Friends who buy 1 Month or a 12-class pack within 7 days get their standard 15% (₹17,203 / ₹12,406; pop-ups 8-class ₹5,891) and friendship-band grip socks; the member gets +5 days (pack: +1 class) per friend who buys, up to 15 days.',
          economics: '17% effective (OK: ≤20% effective). ₹0.1L counted · 2 buyers',
          logic:
            'Referrals convert at 22–76%; friends who start together come together. A free group class lowers the bar for the nervous friend, and the member is paid only when someone buys.',
          kpi: 'Squad Classes booked; friend → purchase (target 30%).',
          lever: 'conversion',
        },
        {
          name: 'Freedom to Pause (Not Quit)',
          tag: 'Renewal',
          months: 'Aug',
          audience: 'Members renewing in August.',
          mechanic:
            '10-class pack: ₹7,229 (15% off the ₹8,505 list price). Any August renewal: 3 Months at 15% (₹49,177 / ₹35,879) + 2 Freedom Freezes (min 3 days each, any time Sep–Nov, made for Ganeshotsav and Diwali travel); 6 Months at 15% + 1 private + 3 Freedom Freezes (₹96,658 / ₹69,883); Annual at the standard 20% + perks + 4 Freedom Freezes. Pop-ups: 10-class pack at 15% + 30 extra days of validity (₹7,229).',
          economics: '15% effective (OK: ≤20% effective). ₹0.4L counted · 6 buyers',
          logic:
            'Members lapse in Sep–Nov when travel breaks the habit. A freeze keeps them paying and coming back instead of cancelling; freezes have no cash cost, so the cash discount stays at the standard 15%.',
          kpi: 'Renewal yield vs Aug-26; Sep–Nov lapse rate of August renewers.',
          lever: 'annual',
        },
        {
          name: 'New Phone, Who Dis?',
          tag: 'Win-back',
          months: 'Sep',
          audience: 'Standard lapsed 15% only',
          mechanic:
            "8-class pack: ₹5,891 (15% off the ₹6,930 list price). Lapsed 61–180 days: a free 'no questions asked' comeback class; buy within 7 days for the standard 15% on 1 Month or a 12-class pack + 1 extra freeze. Pop-ups: free comeback class, then 15% on an 8- or 10-class pack.",
          economics: '15% effective (OK: ≤20% effective). ₹0.2L counted · 4 buyers',
          logic:
            'A free first step lowers the barrier; the 7-day window keeps the decision fast. The freeze has no cash cost.',
          kpi: 'Comeback classes booked; comeback → purchase within 7 days (target 35%).',
          lever: 'winback',
        },
        {
          name: 'Diwali Gifting, Minus the Dry-Fruit Box',
          tag: 'Acquisition',
          months: 'Oct',
          audience: 'First-time clients (phone verified).',
          mechanic:
            '3-class pass: ₹1,890. A festive gift envelope with 3 classes for the price of 2 — Mumbai ₹3,885, Kenkere ₹2,835, pop-ups ₹1,890 — for someone new. The recipient gets the standard 15% on a first membership; the giver gets 1 bonus class when they buy.',
          economics:
            '33% effective (OK: intro/acquisition product, credited/converted at ≤20%). ₹0.1L counted · 4 buyers',
          logic:
            'Gifting is real festive spend; the 3-for-2 gets recipients to the 3-visit mark that converts at 73–89%.',
          kpi: 'Gift envelopes sold; activation rate; recipient → member.',
          lever: 'conversion',
        },
        {
          name: 'Diwali Cleaning: Found Your Old Grip Socks?',
          tag: 'Win-back',
          months: 'Oct',
          audience: 'Standard lapsed 15% + retail (≤20% effective)',
          mechanic:
            '10-class pack: ₹7,229 (15% off the ₹8,505 list price). Lapsed clients: bring (or just mention) your old grip socks, get the standard 15% on 1 Month or a 12-class pack, and swap them for a new pair of P57 grip socks.',
          economics: '20% effective (OK: ≤20% effective). ₹0.2L counted · 3 buyers',
          logic: "A physical prompt from the client's own home is a memorable trigger; the retail cost is low.",
          kpi: 'Reactivations.',
          lever: 'winback',
        },
        {
          name: 'Bride Squad, Assemble (Groom Can Come Too)',
          tag: 'Acquisition',
          months: 'Nov',
          audience: 'Wedding parties and friend groups (min 4, at least 2 new).',
          mechanic:
            '8-class pack: ₹6,584 (5% off the ₹6,930 list price). Wedding season: a group of 4+ (at least 2 new to P57) buy 12-class packs together at 12% off each (Mumbai ₹17,325, Kenkere ₹11,550; packs valid 60 days) and get one hosted private Squad Class for the group, that ends on a choreographed Sangeet routine. Pop-ups: 8-class packs at 5% (₹6,584) + a hosted Pilates squad class. Grooms, cousins and the friend who “doesn’t do group fitness” all count.',
          economics: '18.6% effective (OK: ≤20% effective). ₹0.7L counted · 10 buyers',
          logic:
            'November–December is shaadi season: brides, bridesmaids and families are motivated and arrive in groups. A group rate recruits several newcomers in one conversation, and the hosted class is time we already have, not cash.',
          kpi: 'Squads formed; new buyers from squads (target 50% of squad members).',
          lever: 'conversion',
        },
        {
          name: 'Black Friday Blind Box (No Duds)',
          tag: 'Renewal',
          months: 'Nov',
          audience: 'Members renewing or upgrading; annual renewers due Nov–Jan.',
          mechanic:
            '10-class pack: ₹7,655 (10% off the ₹8,505 list price). Fri 26–Mon 29 Nov: 3 Months at 10% (₹52,070 / ₹37,989), 6 Months at 15% (₹96,658 / ₹69,883) or Annual at 20% (₹1,75,560 / ₹1,24,992), then pick a sealed black box. Every box holds one bonus, from ₹1,500 to ₹5,250 at list: +5 days, 2 guest passes, a 30-min private, a P57 tote + socks, or a full private session. One Black Box per studio, in the annual pile only, adds the “I Survived Black Friday” hoodie. Pop-ups: 10-class pack at 10% + a box (≤1 class) (₹7,655). No discount on 1 Month.',
          economics: '20% effective (OK: ≤20% effective). ₹0.2L counted · 2 buyers',
          logic:
            'Black Friday discounts train members to wait. A mystery bonus keeps the cash discount at the standard ladder (10/15/20%) and makes opening the box the content.',
          kpi: '3M+ share of November renewal value; boxes opened on camera.',
          lever: 'annual',
        },
        {
          name: '11.11: Treat Yourself, Not Your Ex',
          tag: 'Renewal',
          months: 'Nov',
          audience: 'Everyone: newcomers, pack buyers and members.',
          mechanic:
            '8-class pack: ₹5,544 (20% off the ₹6,930 list price). Thu 11 Nov, 11:11 am to 10:11 pm only: an 8-class pack at 20% off: Mumbai ₹10,500 (list ₹13,125), Kenkere ₹6,972 (₹8,715), pop-ups ₹5,544 (₹6,930). One per person, usual validity, members and newcomers alike.',
          economics: '20% effective (OK: spot offer (≤25%)). ₹0.2L counted · 4 buyers',
          logic:
            'Singles’ Day is now a shopping date in India. A one-day pack price brings in fence-sitters and members topping up, at a discount that never reaches memberships.',
          kpi: 'Packs sold in 11 hours; pack buyers → membership by January.',
          lever: 'annual',
        },
        {
          name: 'The Gift They Won’t Regift',
          tag: 'Acquisition',
          months: 'Dec',
          audience: 'Members and non-members buying for someone new; offices.',
          mechanic:
            '1-class pass: ₹1,199. A boxed gift for someone new: Mumbai ₹2,499 (2 classes in any format + grip socks + ₹1,000 off a first membership), Kenkere ₹1,799 (2 Barre classes + socks + ₹750 off), pop-ups ₹1,199 (1 class + socks + ₹400 off). The credit is valid within 14 days of class 2, on top of the standard 15%. Offices buying 10+ boxes get 10% off the boxes and a hosted team class.',
          economics: '20% effective (OK: ≤20% effective). ₹0.0L counted · 4 buyers',
          logic:
            'A gift arrives with a friend’s endorsement, which is why gifted and referred clients convert far better than ad leads. The credit only pays out when the recipient buys.',
          kpi: 'Boxes sold; boxes redeemed by 31 Jan; recipient → member (target 30%).',
          lever: 'conversion',
        },
        {
          name: 'The Ex-Files: Season Finale',
          tag: 'Win-back',
          months: 'Dec',
          audience: 'Lapsed 90+ days.',
          mechanic:
            '8-class pack: ₹6,584 (5% off the ₹6,930 list price). Lapsed 90+ days: 1 Month or a 12-class pack at 10% (₹18,215 / ₹13,136), or 3 Months at 15% (₹49,177 / ₹35,879), plus a plus-one guest pass to the NYE Countdown Class (Fri 31 Dec, 11 am). Pop-ups: 8-class pack at 5% + a plus-one class (₹6,584).',
          economics: '18.6% effective (OK: ≤20% effective). ₹0.1L counted · 2 buyers',
          logic:
            'People who come back in December arrive in January already in the habit. The plus-one turns a returner into a referral at the busiest social week of the year.',
          kpi: 'Reactivations; plus-ones who buy in January.',
          lever: 'winback',
        },
        {
          name: 'The Advent-ure Calendar (Opens in January)',
          tag: 'Renewal',
          months: 'Dec',
          audience: 'Members renewing in December.',
          mechanic:
            '10-class pack: ₹7,655 (10% off the ₹8,505 list price). Renew in December, 3 Months at 12% (₹50,912 / ₹37,145), 6 Months at 15% (₹96,658 / ₹69,883) or Annual at the standard 20%, and take home a 12-door P57 Advent-ure Calendar. One door a week from 3 Jan 2028: 3 guest passes, 2 smoothies, a 30-min virtual private, 2 extra days, a freeze, grip socks, a front-row reservation, a playlist pick and one golden door. Worth ≈₹4,000 Mumbai / ₹3,000 Bengaluru at list. Pop-ups: 10-class pack at 10% + a 3-door mini calendar (₹7,655).',
          economics: '18.2% effective (OK: ≤20% effective). ₹0.3L counted · 4 buyers',
          logic:
            'January drop-off is when renewals are lost. Spreading the perks across Jan–Mar gives members a reason to show up every week of the hardest quarter, which is what keeps them renewing.',
          kpi: 'December renewal yield; Q1 2028 visits of calendar holders vs others.',
          lever: 'annual',
        },
        {
          name: 'Boxing Day (Gloves Optional)',
          tag: 'Renewal',
          months: 'Dec',
          audience: 'Everyone: pack buyers, members topping up, newcomers.',
          mechanic:
            '10-class pack: ₹6,804 (20% off the ₹8,505 list price). Sun 26–Mon 27 Dec only: 12-class packs at 20% off: Mumbai ₹15,750 (list ₹19,688), Kenkere ₹10,500 (₹13,125); pop-ups 10-class pack at 20% (₹6,804). Two per person; buy now, start whenever January starts for you.',
          economics: '20% effective (OK: spot offer (≤25%)). ₹0.3L counted · 5 buyers',
          logic:
            'The week after Christmas is empty in studio but busy on phones. A two-day pack price pulls January purchases forward without touching membership prices.',
          kpi: 'Packs sold in 48 hours; January visits on Boxing Day packs.',
          lever: 'annual',
        },
      ],
      months: [
        {
          month: 'Jan',
          event: 'Resolutions with receipts',
          theme: 'Resolutions with Receipts',
          focus:
            'Turn New Year intent into paid commitments that are active on 1 Feb; re-up the annuals due Dec–Feb; test the 3-for-2 newcomer pack.',
          offers: ["Third Time's the Charm", "U Up? It's 2027.", 'Same Time Next Week'],
          actions: [
            "Third Time's the Charm: First class: awkward. Second: better. Third: hooked. 3 classes for the price of 2.",
            "U Up? It's 2027.: U up? Your mat's been asking about you.",
            'Same Time Next Week: Your pack is nearly out. Same one again, 15% less.',
          ],
          why: 'Key dates: New Year + 57-Hour Hangover Sale (to 3 Jan 09:00) (1 Jan).',
        },
        {
          month: 'Feb',
          event: 'Valentine’s + Galentine’s + Singles Awareness Day',
          theme: 'Red Flags, Green Flags',
          focus:
            'Turn Valentine’s-season traffic into first memberships through a mystery-class intro; recruit through members’ love letters; move February renewals onto 3–12 month plans; let lapsed clients come back on the commitment they choose. Every reward is tied to a purchase or a visit.',
          offers: [
            'Blind Date (No Catfishing)',
            'Love Bombing (The Healthy Kind)',
            'It’s Not You, It’s Your Schedule',
            'Put a Ring On It',
          ],
          actions: [
            'Blind Date (No Catfishing): Two classes. You don’t know which. That’s the fun part.',
            'Love Bombing (The Healthy Kind): Love bombing, but it’s two free classes and zero manipulation.',
            'It’s Not You, It’s Your Schedule: It’s not you, it’s your schedule. Pick a relationship status.',
            'Put a Ring On It: If you like it, then you should’ve put a 6-month on it.',
          ],
          why: 'Key dates: Green Flag Week: Blind Date envelopes at every desk (1 Feb); Galentine’s class (bring a friend free) (13 Feb); Valentine’s Day: Partner Barre (14 Feb); Singles Awareness Day: Hate-Squat Hour (break-up playlist class) (15 Feb).',
        },
        {
          month: 'Mar',
          event: "Women's Day + Main Character Month (format exploration)",
          theme: 'Main Character Month',
          focus:
            "Hold the March trough: widen members' formats, use Women's Day for Bandra Lab acquisition, stop March expiries waiting for April, fix Bengaluru's second-visit leak.",
          offers: ["The Second Date's On Us", 'Same Time Next Week'],
          actions: [
            "The Second Date's On Us: First date: half price. Second date: on us. Third: it's a relationship.",
            'Same Time Next Week: Your pack is nearly out. Same one again, 15% less.',
          ],
          why: "Key dates: Galentine’s-to-Women’s-Day open house (bring a friend) (2 Mar); International Women's Day — Lift Like a Girl week (Bandra) (8 Mar); Holi (approx.) — 48-hour renewal window 21–22 Mar (22 Mar, approx.).",
        },
        {
          month: 'Apr',
          event: '9th anniversary: limited editions, the wheel, the 9:09 flash and the Golden Glute Awards',
          theme: 'Cloud Nine — 9 Years of Physique 57',
          focus:
            'Flagship month: win on excitement and economics. Two products that exist only in April (the 9-Month Lease and the 9-Class Pack), a 9:09 flash, a wheel you can double, numbered Club Nine annuals and a month of events, with no offer above 25% effective (cash ≤20% except annuals, the flash and the bulk pack). Every April buyer leaves with a reason to come back in May.',
          offers: [
            'Party Crasher Pass',
            'Plus One, Plus Nine',
            'Faking Your Own Death Didn’t Work',
            'Spin Class (Literally)',
            'The 9:09 Panic Attack',
          ],
          actions: [
            'Party Crasher Pass: It’s our 9th birthday and you’re invited. 3 classes for ₹999.',
            'Plus One, Plus Nine: Bring a friend, get 9 days. Bring three, get a month.',
            'Faking Your Own Death Didn’t Work: We wrote your obituary. You’re not getting out of it that easily.',
            'Spin Class (Literally): Renew, then spin. Every spin wins. Feeling brave? Double it.',
            'The 9:09 Panic Attack: Plank for your price. Or wait for 9:09 and panic with everyone else.',
          ],
          why: 'Key dates: Launch: “Nine Years in Ninety Seconds” film; 9-Month Lease and 9-Class Pack on sale (1 Apr); Blind Date With a Class (format and trainer secret until you walk in) (3 Apr); Throwback Class: the 2018 playlist and original choreography (6 Apr); Bring Your Barre-stie: free guest pass for every member (8 Apr); The 9:09 Panic Attack: two 99-minute flash windows (9 Apr); Séance Class (candle-lit winback class) (15 Apr); Club Nine Unveiling + Birthday Bash (17–18 Apr) (17 Apr); Physique 57 India 9th anniversary: ‘9 at 9’ class, cake and the Time Capsule (18 Apr); Throwback Reunion + Golden Glute Awards (24 Apr); Lock-In: last keys, midnight close of anniversary prices (30 Apr).',
        },
        {
          month: 'May',
          event: "Students home for the holidays + Mother's Day",
          theme: 'Home for the Holidays',
          focus:
            "Students home from college fill empty off-peak seats; Mother's Day duos; keep April's buyers attending.",
          offers: [
            'Mom Said Get Off the Couch',
            'Group Project (Finally, Everyone Pulls Their Weight)',
            'Mom-entum',
            "Don't Ghost Us After the Party",
          ],
          actions: [
            "Mom Said Get Off the Couch: Home for the summer and Mom's already said 'do something'?",
            'Group Project (Finally, Everyone Pulls Their Weight): Group projects: usually one person does all the work. Not here.',
            'Mom-entum: She carried you for 9 months. You can carry her to class.',
            "Don't Ghost Us After the Party: Great party. Now show up 8 times in May.",
          ],
          why: "Key dates: Mother's Day (9 May).",
        },
        {
          month: 'Jun',
          event: 'Privates month + Out of Office',
          theme: 'Privates Month + Out of Office',
          focus:
            "Grow privates with off-peak pricing and bulk packs (Bandra's biggest gap); stop summer travel lapses with freezes, not discounts; test a private-first intro.",
          offers: ["The Second Date's On Us", "Don't Ghost Us After the Party"],
          actions: [
            "The Second Date's On Us: First date: half price. Second date: on us. Third: it's a relationship.",
            "Don't Ghost Us After the Party: Great party. Now show up 8 times in May.",
          ],
          why: "Key dates: Father's Day (20 Jun).",
        },
        {
          month: 'Jul',
          event: 'Studio bookouts + monsoon',
          theme: 'Book the Studio + Rain Check',
          focus:
            'Studio bookouts and corporate bulk as new channels; protect monsoon renewals; bring lapsed clients back before August.',
          offers: [
            "The Second Date's On Us",
            'Gone With the Wind, Back With the Rain',
            'Rain Check (Literally)',
            'Kitty Party, But Make It Cardio',
          ],
          actions: [
            "The Second Date's On Us: First date: half price. Second date: on us. Third: it's a relationship.",
            'Gone With the Wind, Back With the Rain: Left us in the summer heat? Come back for the monsoon.',
            "Rain Check (Literally): Monsoon happens. Your late-cancel fee doesn't have to.",
            'Kitty Party, But Make It Cardio: Kitty party, but make it cardio.',
          ],
          why: 'Key dates: Freedom Weekend early-access list opens (for August) (15 Jul).',
        },
        {
          month: 'Aug',
          event: 'Friendship Day + Freedom Weekend + Raksha Bandhan',
          theme: 'Azaadi From Average',
          focus:
            'Recruit whole friend groups on Friendship Day; sell annuals over Freedom Weekend with a 2028 price lock instead of a deeper discount; remove the commitment objection for newcomers with a break-up clause; protect the festive-season renewal book with freezes. Every reward is tied to a purchase or a visit, never to a class count.',
          offers: ['No Strings Attached', 'Squad Goals, Squat Goals', 'Freedom to Pause (Not Quit)'],
          actions: [
            'No Strings Attached: Commitment issues? Same. Here’s a membership with a break-up clause.',
            'Squad Goals, Squat Goals: Your squad. Our studio. Matching socks, obviously.',
            'Freedom to Pause (Not Quit): Pause for Ganpati. Pause for Diwali. Just don’t quit.',
          ],
          why: 'Key dates: Friendship Day: Squad Classes (1 Aug); Freedom Weekend opens: Price Ki Azaadi (13–17 Aug) (13 Aug); Independence Day: Freedom Flow class at 8:15 am (15 Aug); Raksha Bandhan (approx.): Sibling Barre (17 Aug, approx.).',
        },
        {
          month: 'Sep',
          event: 'The Comeback (winback month) + 57 Days to Diwali',
          theme: 'The Comeback + 57 Days to Diwali',
          focus:
            'Winback month: manager calls for high-value lapsed clients, fast comebacks for recent lapsers; a results-guarantee bundle; lock 3M plans before the festive dip.',
          offers: ["The Second Date's On Us", 'New Phone, Who Dis?', 'Same Time Next Week'],
          actions: [
            "The Second Date's On Us: First date: half price. Second date: on us. Third: it's a relationship.",
            "New Phone, Who Dis?: New phone, who dis? (It's us. Your favourite class.)",
            'Same Time Next Week: Your pack is nearly out. Same one again, 15% less.',
          ],
          why: 'Key dates: 57 Days to Diwali countdown begins (2 Sep); World Heart Day (29 Sep).',
        },
        {
          month: 'Oct',
          event: 'Diwali gifting + upgrades',
          theme: 'Festival of Lights',
          focus: 'Gift-led acquisition, 1M→6M upgrades and a Dhanteras annual window, without open codes.',
          offers: [
            'Diwali Gifting, Minus the Dry-Fruit Box',
            'Diwali Cleaning: Found Your Old Grip Socks?',
            'Same Time Next Week',
          ],
          actions: [
            "Diwali Gifting, Minus the Dry-Fruit Box: This Diwali, gift something they'll actually use.",
            'Diwali Cleaning: Found Your Old Grip Socks?: Diwali cleaning found your old grip socks. Sign?',
            'Same Time Next Week: Your pack is nearly out. Same one again, 15% less.',
          ],
          why: 'Key dates: Dhanteras window (26–28 Oct, approx.) (26 Oct, approx.); Diwali (approx.) (29 Oct, approx.).',
        },
        {
          month: 'Nov',
          event: 'Wedding season + 11.11 + Black Friday',
          theme: 'Shaadi Season (and a Very Black Friday)',
          focus:
            'Sell group packs into the wedding season; bring lapsed clients back before the baraat; one loud 11-hour pack day on 11.11; and a Black Friday that moves renewals onto long plans with a mystery bonus instead of a deeper price.',
          offers: [
            'Bride Squad, Assemble (Groom Can Come Too)',
            'Black Friday Blind Box (No Duds)',
            '11.11: Treat Yourself, Not Your Ex',
          ],
          actions: [
            'Bride Squad, Assemble (Groom Can Come Too): Four of you, one wedding, zero excuses. Squad rates inside.',
            'Black Friday Blind Box (No Duds): Black Friday, but every box is a winner. We checked.',
            '11.11: Treat Yourself, Not Your Ex: 11.11. Eleven hours. Treat yourself, not your ex.',
          ],
          why: 'Key dates: 11.11: Treat Yourself, Not Your Ex (11:11 am–10:11 pm) (11 Nov); Sangeet Choreo Barre (ends on a dance-floor routine) (20 Nov); Black Friday Blind Box opens (26–29 Nov) (26 Nov); Cyber Monday: last boxes (29 Nov).',
        },
        {
          month: 'Dec',
          event: 'Gifting + Christmas + Boxing Day + NYE',
          theme: 'Party Season Survival Guide',
          focus:
            'Renew December’s book onto long plans with perks spread across Q1; sell January starts now with Resolution Insurance; turn gifting into January newcomers; bank pack demand on Boxing Day; win back long-lapsed clients with a plus-one to the NYE Countdown Class.',
          offers: [
            'The Gift They Won’t Regift',
            'The Ex-Files: Season Finale',
            'The Advent-ure Calendar (Opens in January)',
            'Boxing Day (Gloves Optional)',
          ],
          actions: [
            'The Gift They Won’t Regift: The one gift that doesn’t end up in next year’s Secret Santa.',
            'The Ex-Files: Season Finale: Every great series needs a finale. Yours is a comeback.',
            'The Advent-ure Calendar (Opens in January): An advent calendar you open in January, when you actually need it.',
            'Boxing Day (Gloves Optional): Boxing Day. No gloves, just a 12-class pack at 20% off.',
          ],
          why: 'Key dates: Advent-ure Calendars and gift boxes on sale (1 Dec); Ugly Sweater Barre (18 Dec); Christmas Eve candle-lit class (24 Dec); Boxing Day (Gloves Optional): 26–27 Dec (26 Dec); NYE Countdown Class (11 am) (31 Dec).',
        },
      ],
      rhythm: [
        [
          'Newcomer journey',
          "Offers: Third Time's the Charm, Blind Date (No Catfishing), Love Bombing (The Healthy Kind), The Second Date's On Us, Party Crasher Pass, Plus One, Plus Nine, Mom Said Get Off the Couch, Group Project (Finally, Everyone Pulls Their Weight), Mom-entum, No Strings Attached, Squad Goals, Squat Goals, Diwali Gifting, Minus the Dry-Fruit Box, Bride Squad, Assemble (Groom Can Come Too), The Gift They Won’t Regift. Watch each offer's “What to watch” measures and rate of sale monthly.",
        ],
        [
          'Lapsed journey',
          "Offers: U Up? It's 2027, It’s Not You, It’s Your Schedule, Faking Your Own Death Didn’t Work, Gone With the Wind, Back With the Rain, New Phone, Who Dis?, Diwali Cleaning: Found Your Old Grip Socks?, The Ex-Files: Season Finale. Watch each offer's “What to watch” measures and rate of sale monthly.",
        ],
        [
          'Renewal journey',
          "Offers: Same Time Next Week, Put a Ring On It, Spin Class (Literally), The 9:09 Panic Attack, Don't Ghost Us After the Party, Rain Check (Literally), Kitty Party, But Make It Cardio, Freedom to Pause (Not Quit), Black Friday Blind Box (No Duds), 11.11: Treat Yourself, Not Your Ex, The Advent-ure Calendar (Opens in January), Boxing Day (Gloves Optional). Watch each offer's “What to watch” measures and rate of sale monthly.",
        ],
      ],
      scorecard: [
        ['Leads → trials', '7,111', '1,849', 'Newcomer journeys'],
        ['Trials → new buyers', '1,849', '608', 'Newcomer journeys'],
        ['Renewals due → purchases', '182', '140', 'Renewal journeys'],
        ['Lapsed touches → reactivated', '2,221', '24', 'Lapsed journeys'],
        ['Target → offers planned', '₹23.1L', '₹10.5L', 'Plan of record'],
      ],
      funnel: {
        newShare: 0.25,
        avgFirstPurchase: 909.19,
        visitsPerBuyer: 1.2,
        leadsPerVisit: 3.36,
        renewalShare: 0.62,
        winbackShare: 0.04,
        convNow: 34.01,
        convTarget: 39.43,
      },
      channels: [
        ['Website & online', 997, 11.5, 9.8],
        ['Other', 283, 19.8, 13.4],
        ['Calls & WhatsApp', 238, 71, 62.6],
        ['Referrals', 71, 90.1, 76.1],
        ['Hosted & walk-in', 57, 73.7, 1.8],
        ['Social & influencer', 43, 79.1, 14],
      ],
      slots: [
        ['Weekday · Early (before 9)', 17, 1099, 120],
        ['Weekday · Evening (4–7)', 24, 1646, 77],
        ['Weekday · Late evening (7+)', 27, 1764, 50],
        ['Weekday · Late morning (9–12)', 23, 1637, 75],
        ['Weekend · Late morning (9–12)', 48, 2913, 102],
      ],
      monthly: {
        '2024': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        '2025': [0, 0, 0, 0, 0, 0, 0, 0, 0, 65205, 126357, 118178],
        '2026': [134662, 127682, 120015, 105840, 107730, 156529, 145925, 142852, 189909, null, null, null],
      },
      seasonality: [1.05, 0.99, 0.93, 0.82, 0.84, 1.22, 1.14, 1.11, 1.48, 0.51, 0.98, 0.92],
      entry: [
        ['Session', 46, 1535, 3403, 30],
        ['Copper + Cloves Credit', 51, 472, 3382, 65],
        ['Copper + Cloves Single Class', 96, 945, 2239, 30],
      ],
    },
  },
};
