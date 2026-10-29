// 2027 location sales playbooks — generated from the uploaded P57 exports (Sales, Leads, New clients,
// Lapsed/renewals, Sessions, Check-ins, Memberships). Regenerate with scripts/playbook2027 (see README there).
// All money is ₹ incl. GST. Do not hand-edit numbers; edit gen.py and regenerate. Headlines, diagnosis,
// offers, months, rhythm and scorecard text are from the final approved 2027 plan.
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
        'Final approved 2027 plan: ₹398.0L target, ₹422.2L projected across twelve themed months, each run as three journeys — newcomer, lapsed and renewal.',
      snapshot: [
        ['TTM revenue', '₹322.5L', '+21% vs prior 12 months', true],
        ['2026 forecast', '₹334.4L', 'Jan–Sep actual + Q4 at 2026 run-rate', true],
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
          stat: '61%',
          detail: 'Renewal plan ₹241.6L of ₹398.0L; 968 renewal purchases planned from 1,420 due.',
          implication:
            'Renewal offers: Finish Line Renewal, Partners in Crime, Lock In Early, Club Nine, The Afterparty, The Pause Button, Midyear Report Card, Pit Stop, Festive Pause Button, Renew & Gift, Club Nine: Last Seats, Challenge-Ready Renewal.',
        },
        {
          title: 'New clients',
          stat: '236',
          detail: 'New-client plan ₹58.2L: 1,425 leads → 1,096 trials → 236 new buyers.',
          implication:
            'Newcomer offers: Week Zero, The Second Date for Two, The Second Date, Cloud Nine Intro, Mother Shaker Second Date, Week Zero: Home for the Summer, Kickstart 21: Race Ready Cohort, Starting Gun Week, 57-Day Proof, Gift a Flight, Black Friday Week Zero, Kickstart 21: Pre-Solution Cohort.',
        },
        {
          title: 'Lapsed clients',
          stat: '580',
          detail: 'Reactivation plan ₹47.9L: 580 reactivated from 7,258 touches.',
          implication:
            "Lapsed offers: Back for Stronger, It's Not You, It's Our Schedule, Beat Your Best, Since Day One, A Class for Mum, Out of Office, Not Out of Shape, Warm-Up Lap, Back on Track, The Return Policy, Come Home for Diwali, High-Value Homecoming, Your 2027 Wrapped.",
        },
        {
          title: 'Peak month: Apr',
          stat: '₹57.6L',
          detail: 'Cloud Nine (9th anniversary) · 9 years of Physique 57 India · first ₹1 Cr month.',
          implication:
            "The year's best, most playful offers and the first ₹1 Cr sales month (target ₹104.5L), without the 26–31% discounts of April 2026. Caps: 20% on ≤1M products, 15% on 3M+.",
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
            why: 'Final plan: carried by the newcomer offers — Week Zero, The Second Date for Two, The Second Date, Cloud Nine Intro, Mother Shaker Second Date, Week Zero: Home for the Summer, Kickstart 21: Race Ready Cohort, Starting Gun Week, 57-Day Proof, Gift a Flight, Black Friday Week Zero, Kickstart 21: Pre-Solution Cohort.',
          },
          {
            id: 'leads',
            name: 'Online-lead speed to trial',
            value: 239069,
            math: '774 online leads × trial rate 25.1% → 28.1% × 45% trial→member = +10 members × ₹31,356 × 0.73',
            why: 'Final plan: carried by the newcomer offers — Week Zero, The Second Date for Two, The Second Date, Cloud Nine Intro, Mother Shaker Second Date, Week Zero: Home for the Summer, Kickstart 21: Race Ready Cohort, Starting Gun Week, 57-Day Proof, Gift a Flight, Black Friday Week Zero, Kickstart 21: Pre-Solution Cohort.',
          },
          {
            id: 'referral',
            name: 'Paid-on-conversion referral engine',
            value: 1044613,
            math: '224 referral leads × +50% volume × 40.6% lead→member = +46 members × ₹31,356 × 0.73',
            why: 'Final plan: carried by the newcomer offers — Week Zero, The Second Date for Two, The Second Date, Cloud Nine Intro, Mother Shaker Second Date, Week Zero: Home for the Summer, Kickstart 21: Race Ready Cohort, Starting Gun Week, 57-Day Proof, Gift a Flight, Black Friday Week Zero, Kickstart 21: Pre-Solution Cohort.',
          },
          {
            id: 'winback',
            name: 'Tiered win-back of dormant clients',
            value: 1872533,
            math: '370 loyal dormant (3+ purchases) × +10pts return + 476 light dormant × +5pts = +61 returners × ₹47,866 avg return spend (×0.8 / ×0.4)',
            why: "Final plan: carried by the lapsed offers — Back for Stronger, It's Not You, It's Our Schedule, Beat Your Best, Since Day One, A Class for Mum, Out of Office, Not Out of Shape, Warm-Up Lap, Back on Track, The Return Policy, Come Home for Diwali, High-Value Homecoming, Your 2027 Wrapped.",
          },
          {
            id: 'discount',
            name: 'Swap % discounts for value-adds',
            value: 2186651,
            math: 'Price: ₹383L gross × (17.6% → 9.1% effective discount) × 50% kept = ₹16.3L. Renewal: 457 discounted membership/pack sales × 60% moved to value-add × half the 19-pt repurchase gap × ₹21,581 = ₹5.6L',
            why: 'Final plan: carried by the renewal offers — Finish Line Renewal, Partners in Crime, Lock In Early, Club Nine, The Afterparty, The Pause Button, Midyear Report Card, Pit Stop, Festive Pause Button, Renew & Gift, Club Nine: Last Seats, Challenge-Ready Renewal.',
          },
          {
            id: 'usage',
            name: 'First-30-day habit programme',
            value: 85959,
            math: '58 unlimited memberships ended at ≤4 visits/month × 30% moved to 5–8 visits × +20pt renewal = +4 renewals × ₹16,164 × 1.5 cycles',
            why: 'Final plan: carried by the renewal offers — Finish Line Renewal, Partners in Crime, Lock In Early, Club Nine, The Afterparty, The Pause Button, Midyear Report Card, Pit Stop, Festive Pause Button, Renew & Gift, Club Nine: Last Seats, Challenge-Ready Renewal.',
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
            why: 'Final plan: carried by the renewal offers — Finish Line Renewal, Partners in Crime, Lock In Early, Club Nine, The Afterparty, The Pause Button, Midyear Report Card, Pit Stop, Festive Pause Button, Renew & Gift, Club Nine: Last Seats, Challenge-Ready Renewal.',
          },
        ],
        leverTotal: 8134436.67,
        haircut: 0.15,
        projection: 43125370.15,
        appTargetAtBuild: 42000000,
      },
      offers: [
        {
          name: 'Week Zero',
          tag: 'Acquisition',
          months: 'Jan',
          audience: 'First-time clients (phone verified).',
          mechanic:
            'Intro: ₹2k for the 7-day unlimited intro, credited in full against a qualifying purchase within 72 hours. Then any pack or membership at 15% off list (the standing new-client perk). Unlimited Barre and powerCycle for 7 days (max 2 classes a day); Goal-setting chat after class 1; owner check-in on day 3; Lab Induction seat at Kwality/Bandra; Buy any pack or membership within 72 hours of day 7: full intro fee credited + the standing 15%; A membership makes you eligible for Stronger in 30 2.0 from the week you join (target scaled)',
          economics:
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero. ₹4.1L counted (+₹55.7k vs the ₹3.6L stream plan) · 18 buyers',
          logic:
            'January leads are the most motivated of the year. Clients with 5+ visits in month one convert at 94%; a credited week lets the habit form before the ask, and the challenge gives a reason to join now.',
          kpi: 'Intro → purchase (target 45%); classes in the intro week (target 4+).',
          lever: 'conversion',
        },
        {
          name: 'Back for Stronger',
          tag: 'Win-back',
          months: 'Jan',
          audience: 'Clients lapsed 61–365 days.',
          mechanic:
            '1M unlimited: ₹17.2k (15% off the ₹20.2k list price). 1M unlimited or a 12-class pack at the standing 15% lapsed perk; Full entry to Stronger in 30 2.0, including finisher rewards; A free comeback class to book before buying',
          economics:
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero. ₹4.1L counted (+₹50.4k vs the ₹3.6L stream plan) · 48 buyers',
          logic:
            'The challenge is members-only, so lapsed clients need a membership to take part. A deadline and a social event do more than a deeper discount.',
          kpi: 'Lapsed clients entering the challenge.',
          lever: 'winback',
        },
        {
          name: 'Finish Line Renewal',
          tag: 'Renewal',
          months: 'Jan',
          audience: 'Active members renewing in January or early February.',
          mechanic:
            "Renewal at your product's list price (no % off). Challenge finishers renew at list and get: +7 days on 1M, +2 classes on a pack, +14 days on 3M or longer; Members who reach 50% of the target get +3 days on 1M or +1 class on a pack",
          economics:
            '7.0% effective = 0% cash + 7.0% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero. ₹20.7L counted (+₹50.4k vs the ₹20.1L stream plan) · 83 buyers',
          logic:
            'Renewers average 6.4 visits in the first half of a membership vs 2.6–3.4 for lapsers. Rewarding finishers pays for the behaviour that produces renewals; full-price renewers renew again at 61–68% vs 50–54% after discounts.',
          kpi: 'Challenge finish rate; renewal yield.',
          lever: 'annual',
        },
        {
          name: 'The Second Date for Two',
          tag: 'Acquisition',
          months: 'Feb',
          audience: 'Two first-timers who trial together.',
          mechanic:
            '1M unlimited: ₹17.2k (15% off the ₹20.2k list price). Free first Barre class for both; Class 2 booked together before leaving, free within 7 days; Both buy within 72 hours of class 2: standing 15% each + one shared 30-minute duo private',
          economics:
            '21.5% effective = 15% cash + 6.5% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero. ₹3.5L counted (+₹34.1k vs the ₹3.2L stream plan) · 21 buyers',
          logic:
            'Replaces BOGO (mostly existing clients, 33–53% renewal). Pairs keep each other attending, and the booked second class is the lever.',
          kpi: 'Both new (check in Momence).',
          lever: 'conversion',
        },
        {
          name: "It's Not You, It's Our Schedule",
          tag: 'Win-back',
          months: 'Feb',
          audience: 'Clients lapsed 61–365 days.',
          mechanic:
            "1M unlimited: ₹17.2k (15% off the ₹20.2k list price). 1M unlimited at the standing 15% lapsed perk; 2 extra freezes so travel can't break it again; A free comeback class to book first",
          economics:
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero. ₹2.4L counted (+₹20.1k vs the ₹2.2L stream plan) · 36 buyers',
          logic: "Valentine's gives a story without a deeper discount; freezes answer the most common lapse reason.",
          kpi: 'Message open-to-buy rate.',
          lever: 'winback',
        },
        {
          name: 'Partners in Crime',
          tag: 'Renewal',
          months: 'Feb',
          audience: 'Two active members renewing in the same week.',
          mechanic:
            "Renewal at your product's list price (no % off). Each gets +3 days on 1M, +1 class on a pack, or +7 days on 3M or longer",
          economics:
            '6.0% effective = 0% cash + 6.0% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero. ₹16.1L counted (+₹23.8k vs the ₹15.8L stream plan) · 88 buyers',
          logic: 'Pairs keep each other attending; attendance predicts renewal. Tag pairs to measure it.',
          kpi: 'Next-renewal rate of pairs vs singles.',
          lever: 'annual',
        },
        {
          name: 'The Second Date',
          tag: 'Acquisition',
          months: 'Mar',
          audience: 'First-time clients starting with Barre.',
          mechanic:
            'Then any pack or membership at 15% off list (the standing new-client perk). Free first Barre class; Class 2 free within 7 days, booked at the desk; 15% within 72 hours of class 2; 10% until day 14',
          economics:
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero. ₹4.0L counted (+₹33.2k vs the ₹3.7L stream plan) · 19 buyers',
          logic: 'March is a trough; protecting the second visit protects conversion.',
          kpi: 'Second-visit share.',
          lever: 'conversion',
        },
        {
          name: 'Beat Your Best',
          tag: 'Win-back',
          months: 'Mar',
          audience: 'Lapsed clients with a recorded best month.',
          mechanic:
            "1M unlimited: ₹20.2k (list price). 1M unlimited at list; Match your best month's class count → +6 days",
          economics:
            '20.0% effective = 0% cash + 20.0% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero. ₹3.9L counted (+₹42k vs the ₹3.5L stream plan) · 47 buyers',
          logic: 'Personal data beats generic offers and sets a goal; the reward is earned.',
          kpi: 'Data build needed.',
          lever: 'winback',
        },
        {
          name: 'Lock In Early',
          tag: 'Renewal',
          months: 'Mar',
          audience: 'Members expiring 1 Mar–15 Apr.',
          mechanic:
            "Renewal at your product's list price (no % off). Renew at list + 2 bonus classes (packs) or +7 days (unlimited); First booking window for anniversary party classes",
          economics:
            '7.0% effective = 0% cash + 7.0% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero. ₹14.4L counted (+₹28.2k vs the ₹14.1L stream plan) · 63 buyers',
          logic: "In 2026, ₹36.7L of Kwality's April came from early renewals at 30%+. Bonus time protects the ticket.",
          kpi: 'March renewals vs due.',
          lever: 'annual',
        },
        {
          name: 'Cloud Nine Intro',
          tag: 'Acquisition',
          months: 'Apr',
          audience: 'First-time clients (phone verified).',
          mechanic:
            'Intro: ₹1k for the 9-day unlimited intro, credited in full against a qualifying purchase within 72 hours. Then any pack or membership at 15% off list (the standing new-client perk). Unlimited Barre and powerCycle for 9 days (max 2 a day) + a Lab Induction seat (Kwality/Bandra); Buy any pack or membership within 72 hours of day 9: intro fee credited + standing 15% + anniversary tote (≈₹1,000)',
          economics:
            '21.0% effective = 15% cash + 6.0% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero. ₹6.3L counted (+₹1.1L vs the ₹5.2L stream plan) · 24 buyers',
          logic:
            'The anniversary is worth an eye-catching price. Nine days builds the habit; the credited purchase protects the commitment price.',
          kpi: 'Intro volume vs spare seats; intro → purchase (target 40%).',
          lever: 'conversion',
        },
        {
          name: 'Since Day One',
          tag: 'Win-back',
          months: 'Apr',
          audience: 'Lapsed clients (first-class date known).',
          mechanic:
            '12-class pack: ₹19.7k (list price). 12-class pack at list; 1 bonus class for each year since your first class (max 2)',
          economics:
            '14.8% effective = 0% cash + 14.8% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero. ₹8.0L counted (+₹67.9k vs the ₹7.3L stream plan) · 80 buyers',
          logic: 'Anniversary month, personal anniversary. First-visit dates are in the Day End – New export.',
          kpi: 'Personalisation needs a mail-merge of first-class dates.',
          lever: 'winback',
        },
        {
          name: 'Club Nine',
          tag: 'Renewal',
          months: 'Apr',
          audience: 'Active members (and lapsed high-value clients).',
          mechanic:
            'Annual unlimited: ₹2.2L (list price). Annual unlimited at full list price, numbered 1–9 at each studio; 2 extra privates (4 in total with the standing 2); Name on the Club Nine wall; 48-hour early booking all year; 4 extra guest passes and an anniversary box',
          economics:
            '5.7% effective = 0% cash + 5.7% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero. ₹40.9L counted (+₹3.1L vs the ₹37.8L stream plan) · 130 buyers',
          logic:
            'Scarcity replaces a price lock (no list-price change in 2027). Kwality sells about 3 annuals a month, so 9 in April is a stretch but credible.',
          kpi: 'Seat counter by studio. Effective ≈5.7% (Mumbai) / 6.6% (Bengaluru).',
          lever: 'annual',
        },
        {
          name: 'Mother Shaker Second Date',
          tag: 'Acquisition',
          months: 'May',
          audience: 'A mother and a family member, both new.',
          mechanic:
            '1M unlimited: ₹17.2k (15% off the ₹20.2k list price). Free first Barre class for both; Class 2 booked together, free within 7 days; Both buy within 72 hours of class 2: standing 15% each + one shared 30-minute duo private',
          economics:
            '21.5% effective = 15% cash + 6.5% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero. ₹5.5L counted (+₹40.8k vs the ₹5.0L stream plan) · 27 buyers',
          logic: 'Duo + booked second class.',
          kpi: 'Both new.',
          lever: 'conversion',
        },
        {
          name: 'A Class for Mum',
          tag: 'Win-back',
          months: 'May',
          audience: 'Lapsed clients.',
          mechanic:
            '12-class pack: ₹16.7k (15% off the ₹19.7k list price). 12-class pack at the standing 15%; A free class for their mother (or any mum)',
          economics:
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero. ₹4.2L counted (+₹28.8k vs the ₹3.9L stream plan) · 51 buyers',
          logic: 'On-theme, cash cost unchanged, gift class is a warm lead.',
          kpi: 'Gift classes booked.',
          lever: 'winback',
        },
        {
          name: 'The Afterparty',
          tag: 'Renewal',
          months: 'May',
          audience: 'April buyers and May renewers.',
          mechanic:
            "Renewal at your product's list price (no % off). Book 8 classes in May → a free hosted class + a trainer progress check; Renew at list",
          economics:
            '2.0% effective = 0% cash + 2.0% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero. ₹15.2L counted (+₹29.9k vs the ₹14.9L stream plan) · 68 buyers',
          logic: 'Target ≥55% of April commitment buyers renewing at next expiry (2026 code buyers: 24.5% at Kwality).',
          kpi: 'April cohort attendance in May.',
          lever: 'annual',
        },
        {
          name: 'Week Zero: Home for the Summer',
          tag: 'Acquisition',
          months: 'Jun',
          audience: 'First-time clients.',
          mechanic:
            'Intro: ₹2k for the 7-day unlimited intro, credited in full against a qualifying purchase within 72 hours. Then any pack or membership at 15% off list (the standing new-client perk). 7 days unlimited (max 2 a day); Credited within 72 hours against any pack or membership + standing 15%; Buy 1M before you travel → 1 virtual private to use abroad',
          economics:
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero. ₹5.5L counted (+₹61.2k vs the ₹4.9L stream plan) · 30 buyers',
          logic: 'Short-stay visitors need a short, intense entry.',
          kpi: 'Intro conversion.',
          lever: 'conversion',
        },
        {
          name: 'Out of Office, Not Out of Shape',
          tag: 'Win-back',
          months: 'Jun',
          audience: 'Lapsed clients.',
          mechanic:
            '1M unlimited: ₹17.2k (15% off the ₹20.2k list price). 1M at the standing 15%; 2 extra freezes; A written travel workout plan',
          economics:
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero. ₹3.6L counted (+₹28.7k vs the ₹3.3L stream plan) · 49 buyers',
          logic: 'Answers "I\'ll be away" without cash.',
          kpi: 'Freeze usage.',
          lever: 'winback',
        },
        {
          name: 'The Pause Button',
          tag: 'Renewal',
          months: 'Jun',
          audience: '1M and 3M renewers.',
          mechanic: '3M unlimited: ₹57.9k (list price). 3M unlimited at list; Unlimited freezes (use within 6 months)',
          economics:
            '0.0% effective = 0% cash. Guest passes, consults, freezes and early booking are valued at zero. ₹18.3L counted (+₹2.8L vs the ₹15.5L stream plan) · 78 buyers',
          logic: 'The best time of year for this offer: travel is the main reason to let a membership lapse.',
          kpi: 'June renewal yield.',
          lever: 'annual',
        },
        {
          name: 'Kickstart 21: Race Ready Cohort',
          tag: 'Acquisition',
          months: 'Jul',
          audience: 'First-time clients.',
          mechanic:
            'Kickstart 21 cohort: ₹10k (list price). Cohort Mon 12 Jul → graduates 1 Aug, race day one; 21 days unlimited + coach, WhatsApp, fitness checks; Graduates: standing 15% within 7 days and a Rookie leaderboard entry',
          economics:
            '0.0% effective = 0% cash. Guest passes, consults, freezes and early booking are valued at zero. ₹4.9L counted (−₹10.8k vs the ₹5.0L stream plan) · 23 buyers',
          logic: 'Gives July a goal and a date; graduation lands on the race start.',
          kpi: 'Graduates entering the race.',
          lever: 'conversion',
        },
        {
          name: 'Warm-Up Lap',
          tag: 'Win-back',
          months: 'Jul',
          audience: 'Lapsed clients.',
          mechanic:
            '1M unlimited: ₹17.2k (15% off the ₹20.2k list price). 1M at the standing 15%, start 15 Jul–1 Aug; Free race-prep assessment; Full race entry',
          economics:
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero. ₹4.5L counted (+₹49.5k vs the ₹4.0L stream plan) · 56 buyers',
          logic: 'An event with a date beats a discount for lapsed clients.',
          kpi: 'Lapsed race entries.',
          lever: 'winback',
        },
        {
          name: 'Midyear Report Card',
          tag: 'Renewal',
          months: 'Jul',
          audience: 'July renewers.',
          mechanic:
            "Renewal at your product's list price (no % off). Personal half-year stats and a trainer review; Renew the recommended product at list → 2 guest passes",
          economics:
            '0.0% effective = 0% cash. Guest passes, consults, freezes and early booking are valued at zero. ₹19.6L counted (+₹86.2k vs the ₹18.8L stream plan) · 81 buyers',
          logic: 'A mid-year version of Wrapped that moves members to the right product.',
          kpi: 'Needs stats export.',
          lever: 'annual',
        },
        {
          name: 'Starting Gun Week',
          tag: 'Acquisition',
          months: 'Aug',
          audience: 'First-time clients.',
          mechanic:
            'Intro: ₹2k for the 7-day unlimited intro, credited in full against a qualifying purchase within 72 hours. Then any pack or membership at 15% off list (the standing new-client perk). 7 days unlimited (max 2 a day); classes count on the Rookie leaderboard; Credited within 72 hours against any pack or membership + standing 15%; Race kit (bib and tote, ≈₹1,000) with the purchase',
          economics:
            '21.0% effective = 15% cash + 6.0% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero. ₹6.7L counted (+₹90.9k vs the ₹5.8L stream plan) · 30 buyers',
          logic:
            'An individual race is intimidating for beginners; a Rookie leaderboard and an unlimited week make it winnable.',
          kpi: 'Rookie entries; intro conversion.',
          lever: 'conversion',
        },
        {
          name: 'Back on Track',
          tag: 'Win-back',
          months: 'Aug',
          audience: 'Lapsed clients.',
          mechanic:
            '1M unlimited: ₹17.8k (12% off the ₹20.2k list price). 1M at 12% off; Finish the race target → +3 days',
          economics:
            '22.0% effective = 12% cash + 10.0% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero. ₹4.1L counted (+₹54.3k vs the ₹3.5L stream plan) · 51 buyers',
          logic: 'Race + earned bonus; max effective 22%.',
          kpi: 'Lapsed racers finishing.',
          lever: 'winback',
        },
        {
          name: 'Pit Stop',
          tag: 'Renewal',
          months: 'Aug',
          audience: 'Members expiring in August or early September.',
          mechanic:
            "Renewal at your product's list price (no % off). Renew at list; race progress carries over; Race finishers get +7 days on 1M or +14 days on 3M+; Upgrade to 3M with unlimited freezes",
          economics:
            '7.0% effective = 0% cash + 7.0% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero. ₹23.6L counted (+₹1.5L vs the ₹22.1L stream plan) · 96 buyers',
          logic: 'The race lifts attendance, and attendance lifts renewals; finisher bonuses are earned.',
          kpi: 'Race finish rate; renewal yield.',
          lever: 'annual',
        },
        {
          name: '57-Day Proof',
          tag: 'Acquisition',
          months: 'Sep',
          audience: 'First-time clients.',
          mechanic:
            '1M unlimited: ₹17.2k (15% off the ₹20.2k list price). 1M unlimited at the standing 15%; Fitness check on day 1, coach check-ins; Re-test before 28 Oct: 20+ classes and no improvement on 2 of 3 measures → your next month free',
          economics:
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero. ₹6.0L counted (−₹4.1k vs the ₹6.1L stream plan) · 24 buyers',
          logic:
            "A finish line before Diwali and a results promise carry new clients into October, Kenkere's weakest month.",
          kpi: 'October renewals of September joiners.',
          lever: 'conversion',
        },
        {
          name: 'The Return Policy',
          tag: 'Win-back',
          months: 'Sep',
          audience: 'Clients lapsed 61–365 days.',
          mechanic:
            '12-class pack: ₹17.3k (12% off the ₹19.7k list price). Free comeback class; Buy 1M or a 12-class pack within 7 days at 12% off + 1 bonus class',
          economics:
            '21.9% effective = 12% cash + 9.9% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero. ₹4.7L counted (+₹20.3k vs the ₹4.5L stream plan) · 47 buyers',
          logic: 'Time-limited to keep decisions fast.',
          kpi: 'Reactivations vs plan.',
          lever: 'winback',
        },
        {
          name: 'Festive Pause Button',
          tag: 'Renewal',
          months: 'Sep',
          audience: '1M and 3M renewers.',
          mechanic:
            '3M unlimited: ₹57.9k (list price). 3M at list; Unlimited freezes (use within 6 months); Festive gift (≈₹1,000)',
          economics:
            '1.7% effective = 0% cash + 1.7% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero. ₹24.2L counted (+₹2.2L vs the ₹22.1L stream plan) · 78 buyers',
          logic: 'October–December are troughs; locking 3M now carries members through them.',
          kpi: '3M renewals.',
          lever: 'annual',
        },
        {
          name: 'Gift a Flight',
          tag: 'Acquisition',
          months: 'Oct',
          audience: 'Anyone buying for a friend who is new to P57.',
          mechanic:
            'Intro: ₹2.5k for the Tasting Flight gift (3 classes in 10 days), credited in full against a qualifying purchase within 72 hours. Then any pack or membership at 15% off list (the standing new-client perk). A Tasting Flight as a Diwali gift card; The recipient follows the Flight journey; the fee is credited if they buy within 72 hours of class 3; The giver gets 1 bonus class when the recipient buys',
          economics:
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero. ₹8.3L counted (+₹95.8k vs the ₹7.4L stream plan) · 29 buyers',
          logic:
            'Gifting is real Diwali spend, and a Flight is a better gift than cash credit because it leads into the best-converting journey.',
          kpi: 'Gift activations; recipient conversion.',
          lever: 'conversion',
        },
        {
          name: 'Come Home for Diwali',
          tag: 'Win-back',
          months: 'Oct',
          audience: 'Lapsed clients.',
          mechanic:
            '12-class pack: ₹16.7k (15% off the ₹19.7k list price). 12-class pack at the standing 15% + a comeback class in Diwali week',
          economics:
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero. ₹5.0L counted (+₹31.2k vs the ₹4.7L stream plan) · 48 buyers',
          logic: 'Simple and on-theme.',
          kpi: 'Reactivations.',
          lever: 'winback',
        },
        {
          name: 'Renew & Gift',
          tag: 'Renewal',
          months: 'Oct',
          audience: 'October renewers.',
          mechanic:
            "Renewal at your product's list price (no % off). Renew at list → 5% back as credit usable only on a Gift a Shake card",
          economics:
            '5.0% effective = 0% cash + 5.0% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero. ₹30.0L counted (+₹44.3k vs the ₹29.5L stream plan) · 99 buyers',
          logic: 'Turns renewal value into new-client acquisition.',
          kpi: 'Credit used on gifts.',
          lever: 'annual',
        },
        {
          name: 'Black Friday Week Zero',
          tag: 'Acquisition',
          months: 'Nov',
          audience: 'First-time clients.',
          mechanic:
            'Intro: ₹2k for the 7-day unlimited intro, credited in full against a qualifying purchase within 72 hours. Then any pack or membership at 15% off list (the standing new-client perk). 7 days unlimited (max 2 a day); Credited within 72 hours against any pack or membership + standing 15%; Upgrade to 3M before day 21 of a 1M: the 1M amount is credited and the 3M gets unlimited freezes (use within 6 months)',
          economics:
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero. ₹4.0L counted (+₹54k vs the ₹3.5L stream plan) · 20 buyers',
          logic: 'Black Friday urgency without a deeper %.',
          kpi: 'Intro conversion; day-21 upgrades.',
          lever: 'conversion',
        },
        {
          name: 'High-Value Homecoming',
          tag: 'Win-back',
          months: 'Nov',
          audience: 'Lapsed clients with ≥₹50k lifetime spend.',
          mechanic:
            '3M unlimited: ₹49.2k (15% off the ₹57.9k list price). Manager call; 3M at the standing 15% + unlimited freezes + one 30-minute private',
          economics:
            '19.5% effective = 15% cash + 4.5% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero. ₹2.8L counted (+₹51.7k vs the ₹2.3L stream plan) · 30 buyers',
          logic: 'These clients bought big before; 3M fits them.',
          kpi: 'Effective ≈19.5–20% (amber vs 15% 3M+ guardrail).',
          lever: 'winback',
        },
        {
          name: 'Club Nine: Last Seats',
          tag: 'Renewal',
          months: 'Nov',
          audience: 'Active members.',
          mechanic: 'Annual unlimited: ₹2.2L (list price). Only the Club Nine seats unsold in April, same perks',
          economics:
            '5.7% effective = 0% cash + 5.7% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero. ₹13.0L counted (+₹1.1L vs the ₹11.9L stream plan) · 55 buyers',
          logic: 'Closes the scarcity story.',
          kpi: 'Seats remaining.',
          lever: 'annual',
        },
        {
          name: 'Kickstart 21: Pre-Solution Cohort',
          tag: 'Acquisition',
          months: 'Dec',
          audience: 'First-time clients.',
          mechanic:
            'Kickstart 21 cohort: ₹10k (list price). Cohort starts Mon 3 Jan 2028; sold in December; 21 days unlimited + coach, WhatsApp, fitness checks, graduation; Graduates who buy a membership join Stronger in 30 (2028) with a scaled target',
          economics:
            '0.0% effective = 0% cash. Guest passes, consults, freezes and early booking are valued at zero. ₹4.7L counted (−₹11.9k vs the ₹4.8L stream plan) · 21 buyers',
          logic: 'Moves January demand into December cash and lands graduates in the members-only challenge.',
          kpi: 'Pre-sales; January graduation.',
          lever: 'conversion',
        },
        {
          name: 'Your 2027 Wrapped',
          tag: 'Win-back',
          months: 'Dec',
          audience: 'Lapsed clients.',
          mechanic:
            '12-class pack: ₹16.7k (15% off the ₹19.7k list price). Personal stats page (classes, favourite trainer, best month); 12-class pack at the standing 15% + a comeback class',
          economics:
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero. ₹5.7L counted (+₹60.2k vs the ₹5.1L stream plan) · 67 buyers',
          logic: 'Year-in-review pages get shared; it reminds lapsed clients of their own habit.',
          kpi: 'Stats export needed.',
          lever: 'winback',
        },
        {
          name: 'Challenge-Ready Renewal',
          tag: 'Renewal',
          months: 'Dec',
          audience: 'Members expiring Dec–Jan.',
          mechanic:
            "Renewal at your product's list price (no % off). Renew at list so the membership covers all of January; Stronger in 30 challenge kit (≈₹1,000)",
          economics:
            '4.0% effective = 0% cash + 4.0% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero. ₹19.5L counted (+₹47.5k vs the ₹19.0L stream plan) · 79 buyers',
          logic: 'Members-only challenge = a natural reason to renew before it starts.',
          kpi: 'December renewals of January expiries.',
          lever: 'annual',
        },
      ],
      months: [
        {
          month: 'Jan',
          event: 'New Year · members-only 30-day challenge',
          theme: 'Stronger in 30 2.0',
          focus:
            'Convert January trial demand; get lapsed clients and new clients onto a membership in time to join the challenge; re-up the Jan-2026 annuals (8 annuals, ₹12.5L due).',
          offers: ['Week Zero', 'Back for Stronger', 'Finish Line Renewal'],
          actions: [
            "Week Zero: Seven days unlimited. Then you're in the challenge.",
            "Back for Stronger: The challenge starts without you. Unless you're back by 7 Jan.",
            'Finish Line Renewal: Finish Stronger in 30 and your renewal gets a medal.',
          ],
          why: 'Stronger in 30 2.0 runs all January for active members. Entry is free with an active membership or pack, so every January offer doubles as a challenge entry ticket.',
        },
        {
          month: 'Feb',
          event: "Valentine's Day (Sun 14 Feb) · Galentine's (Sat 13 Feb)",
          theme: 'Better Together',
          focus:
            'Duo and referral acquisition in place of BOGO (BOGO buyers were 79–94% existing clients and renewed at 33–53%). Keep Stronger in 30 finishers attending.',
          offers: ['The Second Date for Two', "It's Not You, It's Our Schedule", 'Partners in Crime'],
          actions: [
            'The Second Date for Two: Bring someone. Your second dates are on us too.',
            "It's Not You, It's Our Schedule: Let's try again. This time with freezes.",
            'Partners in Crime: Renew with your workout partner. You both get more time.',
          ],
          why: "Galentine's hosted class, Sat 13 Feb, with a named associate and the Encore QR at the door.",
        },
        {
          month: 'Mar',
          event: "International Women's Day (Mon 8 Mar)",
          theme: 'She Moves',
          focus: 'Purpose-led reach; Bandra reactivation; stop March trials from waiting for the anniversary.',
          offers: ['The Second Date', 'Beat Your Best', 'Lock In Early'],
          actions: [
            'The Second Date: Your second class is booked before you leave.',
            "Beat Your Best: Remember March 2025? 18 classes. Let's beat it.",
            'Lock In Early: Renew in March, keep the anniversary perks.',
          ],
          why: 'Class of 2024 Reunion at Bandra (638 lapsed launch-cohort clients). Anniversary teaser from 16 Mar.',
        },
        {
          month: 'Apr',
          event: '9 years of Physique 57 India · first ₹1 Cr month',
          theme: 'Cloud Nine (9th anniversary)',
          focus:
            "The year's best, most playful offers and the first ₹1 Cr sales month (target ₹104.5L), without the 26–31% discounts of April 2026. Caps: 20% on ≤1M products, 15% on 3M+.",
          offers: ['Cloud Nine Intro', 'Since Day One', 'Club Nine'],
          actions: [
            'Cloud Nine Intro: Nine days unlimited for less than one class.',
            'Since Day One: You first shook with us on 12 Jun 2023. One class for every year.',
            'Club Nine: Nine numbered memberships per studio. Full price. Founder perks.',
          ],
          why: 'Club Nine: 9 numbered annual memberships per studio at full price. Anniversary party classes in week 2. Hard close 30 Apr, 23:59.',
        },
        {
          month: 'May',
          event: "Mother's Day (Sun 9 May)",
          theme: 'The Afterparty',
          focus:
            'Retain the April cohort (target ≥55% renewal at next expiry vs 24.5% for 2026 anniversary-code buyers at Kwality); duo acquisition.',
          offers: ['Mother Shaker Second Date', 'A Class for Mum', 'The Afterparty'],
          actions: [
            'Mother Shaker Second Date: Bring your mum. Both second classes are on us.',
            'A Class for Mum: Come back, and bring your mother for free.',
            'The Afterparty: Book 8 in May; get a hosted class and a progress check.',
          ],
          why: 'Every April buyer gets the 30-day Afterparty plan: week-1 call, 8 classes in May unlocks a hosted class and a progress check.',
        },
        {
          month: 'Jun',
          event: "Summer travel · college holidays · Father's Day (Sun 20 Jun)",
          theme: 'Out of Office',
          focus: 'Stop summer lapses; fill weekday 10–12 and weekend 4–7 pm (27–41% full) with students.',
          offers: ['Week Zero: Home for the Summer', 'Out of Office, Not Out of Shape', 'The Pause Button'],
          actions: [
            'Week Zero: Home for the Summer: Back in town? A week unlimited, credited if you stay.',
            "Out of Office, Not Out of Shape: Freeze when you fly. Train when you're home.",
            'The Pause Button: Three months unlimited. Freeze it as often as you like.',
          ],
          why: 'Golden Hours launch for students and under-25s.',
        },
        {
          month: 'Jul',
          event: 'Monsoon · Amazing Race warm-up',
          theme: 'Monsoon I: Rain Check',
          focus:
            'Attendance and late cancels (Kenkere 21–30%); get people on a membership before the race starts on 1 Aug.',
          offers: ['Kickstart 21: Race Ready Cohort', 'Warm-Up Lap', 'Midyear Report Card'],
          actions: [
            'Kickstart 21: Race Ready Cohort: 21 days that end on the Amazing Race start line.',
            'Warm-Up Lap: Get race-fit before the gun goes on 1 August.',
            'Midyear Report Card: Your half-year, in numbers.',
          ],
          why: 'Race registrations open 15 Jul. Monsoon Streak leaderboard by studio.',
        },
        {
          month: 'Aug',
          event: 'Month-long individual race · Friendship Day (Sun 1 Aug)',
          theme: 'The Amazing Race 2.0',
          focus:
            'Attendance-led renewals and upgrades; bring new clients in on a Rookie leaderboard; second seasonal peak in Mumbai.',
          offers: ['Starting Gun Week', 'Back on Track', 'Pit Stop'],
          actions: [
            'Starting Gun Week: Seven days unlimited from the day the race starts.',
            'Back on Track: Your lane is still open.',
            'Pit Stop: Renew mid-race and keep your streak.',
          ],
          why: 'The Amazing Race 2.0: every client races on their own against a studio leaderboard, 1–31 Aug. Rookie leaderboard for first-timers.',
        },
        {
          month: 'Sep',
          event: '57 days to Diwali (2 Sep → 28 Oct)',
          theme: 'Monsoon III: The Comeback',
          focus: 'Reactivate before the festive season; carry race momentum into a festive countdown.',
          offers: ['57-Day Proof', 'The Return Policy', 'Festive Pause Button'],
          actions: [
            '57-Day Proof: Measure on day 1. Re-test before Diwali.',
            'The Return Policy: Come back within 7 days of your comeback class and get a bonus.',
            'Festive Pause Button: Renew 3 months; Diwali and year-end travel covered.',
          ],
          why: '57 Days to Diwali countdown starts 2 Sep; Bandra reunion repeat.',
        },
        {
          month: 'Oct',
          event: 'Diwali (Fri 29 Oct) · Dasara week in Bengaluru',
          theme: 'Festival of Lights',
          focus: "Gift-led revenue; protect Kenkere's Dasara trough; catch Kwality's late-October surge without codes.",
          offers: ['Gift a Flight', 'Come Home for Diwali', 'Renew & Gift'],
          actions: [
            'Gift a Flight: Give someone three classes and a reason to stay.',
            "Come Home for Diwali: Your mat's still here.",
            'Renew & Gift: Renew in October; 5% back to spend on a gift card.',
          ],
          why: 'Gift cards on sale from 1 Oct; candle-lit evening classes in Diwali week; limited-run format #3.',
        },
        {
          month: 'Nov',
          event: 'Black Friday (Fri 26 Nov) → Cyber Monday (29 Nov)',
          theme: 'Black Friday, Strong Monday',
          focus: 'Long commitments in the softest Mumbai month.',
          offers: ['Black Friday Week Zero', 'High-Value Homecoming', 'Club Nine: Last Seats'],
          actions: [
            'Black Friday Week Zero: Seven days unlimited, fully credited.',
            'High-Value Homecoming: A manager call, three flexible months and a private.',
            'Club Nine: Last Seats: The last numbered seats.',
          ],
          why: 'Club Nine last seats (only those unsold in April).',
        },
        {
          month: 'Dec',
          event: 'Year-end · pre-sell January',
          theme: 'Wrapped',
          focus: 'Pre-sell January and Stronger in 30 (2028) entries; renew on personal usage data.',
          offers: ['Kickstart 21: Pre-Solution Cohort', 'Your 2027 Wrapped', 'Challenge-Ready Renewal'],
          actions: [
            'Kickstart 21: Pre-Solution Cohort: Buy in December. Start Mon 3 Jan. Arrive in Stronger in 30.',
            "Your 2027 Wrapped: You took 87 classes with us. Here's to the next year.",
            "Challenge-Ready Renewal: Renew in December so you're covered for all of Stronger in 30.",
          ],
          why: '"Your 2027 Wrapped": a personal year-in-review for every client, ending in a usage-based renewal recommendation.',
        },
      ],
      rhythm: [
        [
          'Newcomer journey',
          "Offers: Week Zero, The Second Date for Two, The Second Date, Cloud Nine Intro, Mother Shaker Second Date, Week Zero: Home for the Summer, Kickstart 21: Race Ready Cohort, Starting Gun Week, 57-Day Proof, Gift a Flight, Black Friday Week Zero, Kickstart 21: Pre-Solution Cohort. Watch each offer's “What to watch” measures and rate of sale monthly.",
        ],
        [
          'Lapsed journey',
          "Offers: Back for Stronger, It's Not You, It's Our Schedule, Beat Your Best, Since Day One, A Class for Mum, Out of Office, Not Out of Shape, Warm-Up Lap, Back on Track, The Return Policy, Come Home for Diwali, High-Value Homecoming, Your 2027 Wrapped. Watch each offer's “What to watch” measures and rate of sale monthly.",
        ],
        [
          'Renewal journey',
          "Offers: Finish Line Renewal, Partners in Crime, Lock In Early, Club Nine, The Afterparty, The Pause Button, Midyear Report Card, Pit Stop, Festive Pause Button, Renew & Gift, Club Nine: Last Seats, Challenge-Ready Renewal. Watch each offer's “What to watch” measures and rate of sale monthly.",
        ],
      ],
      scorecard: [
        ['Leads → trials', '1,425', '1,096', 'Newcomer journeys'],
        ['Trials → new buyers', '1,096', '236', 'Newcomer journeys'],
        ['Renewals due → purchases', '1,420', '968', 'Renewal journeys'],
        ['Lapsed touches → reactivated', '7,258', '580', 'Lapsed journeys'],
        ['Target → projected', '₹398.0L', '₹422.2L', 'Final approved plan'],
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
        'Final approved 2027 plan: ₹228.2L target, ₹243.4L projected across twelve themed months, each run as three journeys — newcomer, lapsed and renewal.',
      snapshot: [
        ['TTM revenue', '₹198.3L', '-3% vs prior 12 months', false],
        ['2026 forecast', '₹197.7L', 'Jan–Sep actual + Q4 at 2026 run-rate', true],
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
          stat: '66%',
          detail: 'Renewal plan ₹151.7L of ₹228.2L; 692 renewal purchases planned from 991 due.',
          implication:
            'Renewal offers: Finish Line Renewal, Partners in Crime, Lock In Early, Lock In Before You Clock Out, The Afterparty, The Pause Button, Monsoon Streak, Pit Stop, Festive Pause Button, Renew & Gift, Club Nine: Last Seats, Challenge-Ready Renewal.',
        },
        {
          title: 'New clients',
          stat: '217',
          detail: 'New-client plan ₹37.0L: 2,125 leads → 1,213 trials → 217 new buyers.',
          implication:
            'Newcomer offers: Week Zero, The 30-Day Proof, Kickstart 21: She Moves Cohort, Cloud Nine Intro, Mother Shaker Second Date, Golden Hours Flight, Kickstart 21: Race Ready Cohort, Starting Gun Week, The Second Date, Festival of Lights Second Date, Black Friday Week Zero, Kickstart 21: Pre-Solution Cohort.',
        },
        {
          title: 'Lapsed clients',
          stat: '369',
          detail: 'Reactivation plan ₹23.3L: 369 reactivated from 4,612 touches.',
          implication:
            'Lapsed offers: Back for Stronger, Come Back as a Pair, Class of 2024 Reunion, Nine Years, Nine Reasons, The Comeback Squad, Pay-As-You-Return, Warm-Up Lap, Back on Track, We Kept Your Spot, Come Home for Diwali, Black Friday Comeback, Challenge Comeback Ticket.',
        },
        {
          title: 'Peak month: Apr',
          stat: '₹33.0L',
          detail: 'Cloud Nine (9th anniversary) · 9 years of Physique 57 India · first ₹1 Cr month.',
          implication:
            "The year's best, most playful offers and the first ₹1 Cr sales month (target ₹104.5L), without the 26–31% discounts of April 2026. Caps: 20% on ≤1M products, 15% on 3M+.",
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
            why: 'Final plan: carried by the newcomer offers — Week Zero, The 30-Day Proof, Kickstart 21: She Moves Cohort, Cloud Nine Intro, Mother Shaker Second Date, Golden Hours Flight, Kickstart 21: Race Ready Cohort, Starting Gun Week, The Second Date, Festival of Lights Second Date, Black Friday Week Zero, Kickstart 21: Pre-Solution Cohort.',
          },
          {
            id: 'leads',
            name: 'Online-lead speed to trial',
            value: 168333,
            math: '1,145 online leads × trial rate 28.8% → 31.8% × 28% trial→member = +10 members × ₹24,008 × 0.73',
            why: 'Final plan: carried by the newcomer offers — Week Zero, The 30-Day Proof, Kickstart 21: She Moves Cohort, Cloud Nine Intro, Mother Shaker Second Date, Golden Hours Flight, Kickstart 21: Race Ready Cohort, Starting Gun Week, The Second Date, Festival of Lights Second Date, Black Friday Week Zero, Kickstart 21: Pre-Solution Cohort.',
          },
          {
            id: 'referral',
            name: 'Paid-on-conversion referral engine',
            value: 588862,
            math: '299 referral leads × +50% volume × 22.4% lead→member = +33 members × ₹24,008 × 0.73',
            why: 'Final plan: carried by the newcomer offers — Week Zero, The 30-Day Proof, Kickstart 21: She Moves Cohort, Cloud Nine Intro, Mother Shaker Second Date, Golden Hours Flight, Kickstart 21: Race Ready Cohort, Starting Gun Week, The Second Date, Festival of Lights Second Date, Black Friday Week Zero, Kickstart 21: Pre-Solution Cohort.',
          },
          {
            id: 'winback',
            name: 'Tiered win-back of dormant clients',
            value: 932979,
            math: '234 loyal dormant (3+ purchases) × +10pts return + 446 light dormant × +5pts = +46 returners × ₹33,755 avg return spend (×0.8 / ×0.4)',
            why: 'Final plan: carried by the lapsed offers — Back for Stronger, Come Back as a Pair, Class of 2024 Reunion, Nine Years, Nine Reasons, The Comeback Squad, Pay-As-You-Return, Warm-Up Lap, Back on Track, We Kept Your Spot, Come Home for Diwali, Black Friday Comeback, Challenge Comeback Ticket.',
          },
          {
            id: 'discount',
            name: 'Swap % discounts for value-adds',
            value: 729228,
            math: 'Price: ₹220L gross × (12.7% → 9.3% effective discount) × 50% kept = ₹3.7L. Renewal: 446 discounted membership/pack sales × 60% moved to value-add × half the 14-pt repurchase gap × ₹19,617 = ₹3.6L',
            why: 'Final plan: carried by the renewal offers — Finish Line Renewal, Partners in Crime, Lock In Early, Lock In Before You Clock Out, The Afterparty, The Pause Button, Monsoon Streak, Pit Stop, Festive Pause Button, Renew & Gift, Club Nine: Last Seats, Challenge-Ready Renewal.',
          },
          {
            id: 'usage',
            name: 'First-30-day habit programme',
            value: 64195,
            math: '43 unlimited memberships ended at ≤4 visits/month × 30% moved to 5–8 visits × +20pt renewal = +3 renewals × ₹16,283 × 1.5 cycles',
            why: 'Final plan: carried by the renewal offers — Finish Line Renewal, Partners in Crime, Lock In Early, Lock In Before You Clock Out, The Afterparty, The Pause Button, Monsoon Streak, Pit Stop, Festive Pause Button, Renew & Gift, Club Nine: Last Seats, Challenge-Ready Renewal.',
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
            why: 'Final plan: carried by the renewal offers — Finish Line Renewal, Partners in Crime, Lock In Early, Lock In Before You Clock Out, The Afterparty, The Pause Button, Monsoon Streak, Pit Stop, Festive Pause Button, Renew & Gift, Club Nine: Last Seats, Challenge-Ready Renewal.',
          },
        ],
        leverTotal: 4671226.32,
        haircut: 0.15,
        projection: 23560223.23,
        appTargetAtBuild: 22820000,
      },
      offers: [
        {
          name: 'Week Zero',
          tag: 'Acquisition',
          months: 'Jan',
          audience: 'First-time clients (phone verified).',
          mechanic:
            'Intro: ₹2k for the 7-day unlimited intro, credited in full against a qualifying purchase within 72 hours. Then any pack or membership at 15% off list (the standing new-client perk). Unlimited Barre and powerCycle for 7 days (max 2 classes a day); Goal-setting chat after class 1; owner check-in on day 3; Lab Induction seat at Kwality/Bandra; Buy any pack or membership within 72 hours of day 7: full intro fee credited + the standing 15%; A membership makes you eligible for Stronger in 30 2.0 from the week you join (target scaled)',
          economics:
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero. ₹3.1L counted (+₹42k vs the ₹2.7L stream plan) · 19 buyers',
          logic:
            'January leads are the most motivated of the year. Clients with 5+ visits in month one convert at 94%; a credited week lets the habit form before the ask, and the challenge gives a reason to join now.',
          kpi: 'Intro → purchase (target 45%); classes in the intro week (target 4+).',
          lever: 'conversion',
        },
        {
          name: 'Back for Stronger',
          tag: 'Win-back',
          months: 'Jan',
          audience: 'Clients lapsed 61–365 days.',
          mechanic:
            '1M unlimited: ₹17.2k (15% off the ₹20.2k list price). 1M unlimited or a 12-class pack at the standing 15% lapsed perk; Full entry to Stronger in 30 2.0, including finisher rewards; A free comeback class to book before buying',
          economics:
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero. ₹2.5L counted (+₹38.9k vs the ₹2.2L stream plan) · 38 buyers',
          logic:
            'The challenge is members-only, so lapsed clients need a membership to take part. A deadline and a social event do more than a deeper discount.',
          kpi: 'Lapsed clients entering the challenge.',
          lever: 'winback',
        },
        {
          name: 'Finish Line Renewal',
          tag: 'Renewal',
          months: 'Jan',
          audience: 'Active members renewing in January or early February.',
          mechanic:
            "Renewal at your product's list price (no % off). Challenge finishers renew at list and get: +7 days on 1M, +2 classes on a pack, +14 days on 3M or longer; Members who reach 50% of the target get +3 days on 1M or +1 class on a pack",
          economics:
            '7.0% effective = 0% cash + 7.0% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero. ₹11.8L counted (+₹28.7k vs the ₹11.5L stream plan) · 53 buyers',
          logic:
            'Renewers average 6.4 visits in the first half of a membership vs 2.6–3.4 for lapsers. Rewarding finishers pays for the behaviour that produces renewals; full-price renewers renew again at 61–68% vs 50–54% after discounts.',
          kpi: 'Challenge finish rate; renewal yield.',
          lever: 'annual',
        },
        {
          name: 'The 30-Day Proof',
          tag: 'Acquisition',
          months: 'Feb',
          audience: 'First-time clients.',
          mechanic:
            '1M unlimited: ₹17.2k (15% off the ₹20.2k list price). 1M unlimited at the standing 15%; Day-1 fitness check (3 measures), coach check-ins on days 7 and 21; Day-30 re-test: 12+ classes and no improvement on 2 of 3 measures → next month free',
          economics:
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero. ₹2.2L counted (+₹23.6k vs the ₹2.0L stream plan) · 16 buyers',
          logic:
            'Bandra has the lowest new-client conversion (17–26%). A guarantee answers the core objection; 12 classes almost always produce improvement, so it rarely pays out.',
          kpi: 'Guarantee claims; conversion vs other Bandra journeys.',
          lever: 'conversion',
        },
        {
          name: 'Come Back as a Pair',
          tag: 'Win-back',
          months: 'Feb',
          audience: 'Lapsed clients plus a friend who is new to P57.',
          mechanic:
            '12-class pack: ₹16.7k (15% off the ₹19.7k list price). Lapsed client: 12-class pack at the standing 15%; Friend: free first class; If the friend buys, the lapsed client gets 2 guest passes and 48-hour priority booking for a month',
          economics:
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero. ₹1.4L counted (+₹24.1k vs the ₹1.2L stream plan) · 25 buyers',
          logic: 'One message, two streams: reactivation and a warm new lead.',
          kpi: 'Friends who buy.',
          lever: 'winback',
        },
        {
          name: 'Partners in Crime',
          tag: 'Renewal',
          months: 'Feb',
          audience: 'Two active members renewing in the same week.',
          mechanic:
            "Renewal at your product's list price (no % off). Each gets +3 days on 1M, +1 class on a pack, or +7 days on 3M or longer",
          economics:
            '6.0% effective = 0% cash + 6.0% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero. ₹12.1L counted (+₹17.8k vs the ₹11.9L stream plan) · 68 buyers',
          logic: 'Pairs keep each other attending; attendance predicts renewal. Tag pairs to measure it.',
          kpi: 'Next-renewal rate of pairs vs singles.',
          lever: 'annual',
        },
        {
          name: 'Kickstart 21: She Moves Cohort',
          tag: 'Acquisition',
          months: 'Mar',
          audience: 'First-time clients.',
          mechanic:
            "Kickstart 21 cohort: ₹10k (list price). Cohort starts Mon 8 Mar (Women's Day); second cohort Mon 22 Mar; 21 days unlimited + coach, WhatsApp group, fitness checks, graduation; Each member gets a free class to gift a woman she nominates; Graduates: standing 15% within 7 days",
          economics:
            '0.0% effective = 0% cash. Guest passes, consults, freezes and early booking are valued at zero. ₹2.7L counted (+₹1.9k vs the ₹2.6L stream plan) · 17 buyers',
          logic: 'Purpose-led reach with the engagement of a cohort; the gift class creates warm leads.',
          kpi: 'Nominee classes converted.',
          lever: 'conversion',
        },
        {
          name: 'Class of 2024 Reunion',
          tag: 'Win-back',
          months: 'Mar',
          audience: 'Clients lapsed 61 days–2 years (Bandra priority: 2024 opening cohort).',
          mechanic:
            '12-class pack: ₹17.3k (12% off the ₹19.7k list price). Free reunion class; Buy within 7 days: 12-class pack at 12% off + 1 bonus class',
          economics:
            '21.9% effective = 12% cash + 9.9% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero. ₹2.2L counted (+₹38.5k vs the ₹1.9L stream plan) · 33 buyers',
          logic:
            'May–Sep 2024 brought 1,000+ first visits at Bandra; 638 are now lapsed 1–2 years. Reaching people who already know the studio is the cheapest reach Bandra has.',
          kpi: 'RSVPs → attendance → purchase. Repeat in September.',
          lever: 'winback',
        },
        {
          name: 'Lock In Early',
          tag: 'Renewal',
          months: 'Mar',
          audience: 'Members expiring 1 Mar–15 Apr.',
          mechanic:
            "Renewal at your product's list price (no % off). Renew at list + 2 bonus classes (packs) or +7 days (unlimited); First booking window for anniversary party classes",
          economics:
            '7.0% effective = 0% cash + 7.0% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero. ₹8.3L counted (+₹16.2k vs the ₹8.1L stream plan) · 37 buyers',
          logic: "In 2026, ₹36.7L of Kwality's April came from early renewals at 30%+. Bonus time protects the ticket.",
          kpi: 'March renewals vs due.',
          lever: 'annual',
        },
        {
          name: 'Cloud Nine Intro',
          tag: 'Acquisition',
          months: 'Apr',
          audience: 'First-time clients (phone verified).',
          mechanic:
            'Intro: ₹1k for the 9-day unlimited intro, credited in full against a qualifying purchase within 72 hours. Then any pack or membership at 15% off list (the standing new-client perk). Unlimited Barre and powerCycle for 9 days (max 2 a day) + a Lab Induction seat (Kwality/Bandra); Buy any pack or membership within 72 hours of day 9: intro fee credited + standing 15% + anniversary tote (≈₹1,000)',
          economics:
            '21.0% effective = 15% cash + 6.0% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero. ₹5.7L counted (+₹98.1k vs the ₹4.7L stream plan) · 32 buyers',
          logic:
            'The anniversary is worth an eye-catching price. Nine days builds the habit; the credited purchase protects the commitment price.',
          kpi: 'Intro volume vs spare seats; intro → purchase (target 40%).',
          lever: 'conversion',
        },
        {
          name: 'Nine Years, Nine Reasons',
          tag: 'Win-back',
          months: 'Apr',
          audience: 'Clients lapsed 61 days–2 years.',
          mechanic:
            '12-class pack: ₹16.7k (15% off the ₹19.7k list price). A personal note listing 9 things new at your studio (formats, trainers, schedule); 12-class pack at the standing 15% lapsed perk; Invite to an anniversary party class',
          economics:
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero. ₹4.5L counted (+₹62.4k vs the ₹3.8L stream plan) · 62 buyers',
          logic:
            'Lapsed clients left something that no longer exists; showing what\'s new answers "why go back". April has the most attention of the year.',
          kpi: 'Bandra needs 54 reactivations in April from 673 touches.',
          lever: 'winback',
        },
        {
          name: 'Lock In Before You Clock Out',
          tag: 'Renewal',
          months: 'Apr',
          audience: 'Members expiring 1 Apr–15 Jun only.',
          mechanic:
            "Renewal at your product's list price (no % off). Renew at list; +3 classes on packs, +7 days on 1M, +14 days on 3M or longer",
          economics:
            '10.0% effective = 0% cash + 10.0% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero. ₹23.0L counted (+₹88.3k vs the ₹22.1L stream plan) · 95 buyers',
          logic:
            '2026 anniversary-code buyers renewed at 24.5% at Kwality vs 61.6% at full price. Restricting eligibility limits pull-forward.',
          kpi: 'Renewal purchases vs due (plan KH 130 vs 120 due).',
          lever: 'annual',
        },
        {
          name: 'Mother Shaker Second Date',
          tag: 'Acquisition',
          months: 'May',
          audience: 'A mother and a family member, both new.',
          mechanic:
            '1M unlimited: ₹17.2k (15% off the ₹20.2k list price). Free first Barre class for both; Class 2 booked together, free within 7 days; Both buy within 72 hours of class 2: standing 15% each + one shared 30-minute duo private',
          economics:
            '21.5% effective = 15% cash + 6.5% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero. ₹4.2L counted (+₹45.5k vs the ₹3.7L stream plan) · 27 buyers',
          logic: 'Duo + booked second class.',
          kpi: 'Both new.',
          lever: 'conversion',
        },
        {
          name: 'The Comeback Squad',
          tag: 'Win-back',
          months: 'May',
          audience: 'Lapsed clients.',
          mechanic:
            '1M unlimited: ₹17.2k (15% off the ₹20.2k list price). 1M unlimited at the standing 15%; A fixed weekly squad class, trainer WhatsApp group, week-4 check-in',
          economics:
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero. ₹2.1L counted (+₹28.8k vs the ₹1.8L stream plan) · 32 buyers',
          logic: 'Reactivations renew at only 37–47%; a squad builds the habit first.',
          kpi: 'Squad members renewing at 1M end.',
          lever: 'winback',
        },
        {
          name: 'The Afterparty',
          tag: 'Renewal',
          months: 'May',
          audience: 'April buyers and May renewers.',
          mechanic:
            "Renewal at your product's list price (no % off). Book 8 classes in May → a free hosted class + a trainer progress check; Renew at list",
          economics:
            '2.0% effective = 0% cash + 2.0% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero. ₹12.1L counted (+₹23.7k vs the ₹11.9L stream plan) · 57 buyers',
          logic: 'Target ≥55% of April commitment buyers renewing at next expiry (2026 code buyers: 24.5% at Kwality).',
          kpi: 'April cohort attendance in May.',
          lever: 'annual',
        },
        {
          name: 'Golden Hours Flight',
          tag: 'Acquisition',
          months: 'Jun',
          audience: 'Students or under-25s with ID.',
          mechanic:
            'Intro: ₹1.5k for the Student Tasting Flight (3 classes in 10 days), credited in full against a qualifying purchase within 72 hours. 8-class pack: ₹10.5k (20% off the ₹13.1k list price). 3 classes in 10 days in weekday 10–12 or weekend 4–7 pm classes; Full fee credited within 72 hours against the Golden Hours 8-class pack (20% off, valid in those slots only)',
          economics:
            '20.0% effective = 20% cash. Guest passes, consults, freezes and early booking are valued at zero. ₹3.3L counted (+₹12.5k vs the ₹3.2L stream plan) · 24 buyers',
          logic: 'Those slots run at 27–41% fill; students fill them without cannibalising peak classes.',
          kpi: 'Golden Hours fill.',
          lever: 'conversion',
        },
        {
          name: 'Pay-As-You-Return',
          tag: 'Win-back',
          months: 'Jun',
          audience: 'Lapsed clients.',
          mechanic:
            '4-class pack: ₹7.1k (list price). 4-class pack at list; Buy a 12-class pack within 14 days → the full 4-pack price is credited',
          economics:
            '0.0% effective = 0% cash. Guest passes, consults, freezes and early booking are valued at zero. ₹1.2L counted (+₹14k vs the ₹1.1L stream plan) · 23 buyers',
          logic: "Lowest barrier to return; Bandra's reactivation rate is the lowest in the group (2.8% a month).",
          kpi: '4 → 12 ladder rate.',
          lever: 'winback',
        },
        {
          name: 'The Pause Button',
          tag: 'Renewal',
          months: 'Jun',
          audience: '1M and 3M renewers.',
          mechanic: '3M unlimited: ₹57.9k (list price). 3M unlimited at list; Unlimited freezes (use within 6 months)',
          economics:
            '0.0% effective = 0% cash. Guest passes, consults, freezes and early booking are valued at zero. ₹11.6L counted (+₹1.5L vs the ₹10.1L stream plan) · 52 buyers',
          logic: 'The best time of year for this offer: travel is the main reason to let a membership lapse.',
          kpi: 'June renewal yield.',
          lever: 'annual',
        },
        {
          name: 'Kickstart 21: Race Ready Cohort',
          tag: 'Acquisition',
          months: 'Jul',
          audience: 'First-time clients.',
          mechanic:
            'Kickstart 21 cohort: ₹10k (list price). Cohort Mon 12 Jul → graduates 1 Aug, race day one; 21 days unlimited + coach, WhatsApp, fitness checks; Graduates: standing 15% within 7 days and a Rookie leaderboard entry',
          economics:
            '0.0% effective = 0% cash. Guest passes, consults, freezes and early booking are valued at zero. ₹4.0L counted (+₹2.5k vs the ₹3.9L stream plan) · 24 buyers',
          logic: 'Gives July a goal and a date; graduation lands on the race start.',
          kpi: 'Graduates entering the race.',
          lever: 'conversion',
        },
        {
          name: 'Warm-Up Lap',
          tag: 'Win-back',
          months: 'Jul',
          audience: 'Lapsed clients.',
          mechanic:
            '1M unlimited: ₹17.2k (15% off the ₹20.2k list price). 1M at the standing 15%, start 15 Jul–1 Aug; Free race-prep assessment; Full race entry',
          economics:
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero. ₹2.0L counted (+₹26.7k vs the ₹1.8L stream plan) · 30 buyers',
          logic: 'An event with a date beats a discount for lapsed clients.',
          kpi: 'Lapsed race entries.',
          lever: 'winback',
        },
        {
          name: 'Monsoon Streak',
          tag: 'Renewal',
          months: 'Jul',
          audience: 'July renewers.',
          mechanic:
            "Renewal at your product's list price (no % off). Renew at list; 12+ classes and zero late cancels in July → +7 days (unlimited) or +1 class (packs)",
          economics:
            '7.0% effective = 0% cash + 7.0% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero. ₹14.5L counted (+₹28.4k vs the ₹14.2L stream plan) · 64 buyers',
          logic:
            "Fixes behaviour and revenue together; Bandra's 2025 late-cancel spike fell once the rule was enforced.",
          kpi: 'Late-cancel rate (Kenkere target <15%).',
          lever: 'annual',
        },
        {
          name: 'Starting Gun Week',
          tag: 'Acquisition',
          months: 'Aug',
          audience: 'First-time clients.',
          mechanic:
            'Intro: ₹2k for the 7-day unlimited intro, credited in full against a qualifying purchase within 72 hours. Then any pack or membership at 15% off list (the standing new-client perk). 7 days unlimited (max 2 a day); classes count on the Rookie leaderboard; Credited within 72 hours against any pack or membership + standing 15%; Race kit (bib and tote, ≈₹1,000) with the purchase',
          economics:
            '21.0% effective = 15% cash + 6.0% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero. ₹3.7L counted (+₹50.1k vs the ₹3.2L stream plan) · 20 buyers',
          logic:
            'An individual race is intimidating for beginners; a Rookie leaderboard and an unlimited week make it winnable.',
          kpi: 'Rookie entries; intro conversion.',
          lever: 'conversion',
        },
        {
          name: 'Back on Track',
          tag: 'Win-back',
          months: 'Aug',
          audience: 'Lapsed clients.',
          mechanic:
            '1M unlimited: ₹17.8k (12% off the ₹20.2k list price). 1M at 12% off; Finish the race target → +3 days',
          economics:
            '22.0% effective = 12% cash + 10.0% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero. ₹2.9L counted (+₹41.7k vs the ₹2.5L stream plan) · 39 buyers',
          logic: 'Race + earned bonus; max effective 22%.',
          kpi: 'Lapsed racers finishing.',
          lever: 'winback',
        },
        {
          name: 'Pit Stop',
          tag: 'Renewal',
          months: 'Aug',
          audience: 'Members expiring in August or early September.',
          mechanic:
            "Renewal at your product's list price (no % off). Renew at list; race progress carries over; Race finishers get +7 days on 1M or +14 days on 3M+; Upgrade to 3M with unlimited freezes",
          economics:
            '7.0% effective = 0% cash + 7.0% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero. ₹19.2L counted (+₹1.2L vs the ₹18.0L stream plan) · 74 buyers',
          logic: 'The race lifts attendance, and attendance lifts renewals; finisher bonuses are earned.',
          kpi: 'Race finish rate; renewal yield.',
          lever: 'annual',
        },
        {
          name: 'The Second Date',
          tag: 'Acquisition',
          months: 'Sep',
          audience: 'First-time clients starting with Barre.',
          mechanic:
            'Then any pack or membership at 15% off list (the standing new-client perk). Free first Barre class; Class 2 free within 7 days, booked at the desk; 15% within 72 hours of class 2; 10% until day 14',
          economics:
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero. ₹3.5L counted (+₹28.6k vs the ₹3.2L stream plan) · 24 buyers',
          logic: 'Core fix.',
          kpi: 'Second-visit share.',
          lever: 'conversion',
        },
        {
          name: 'We Kept Your Spot',
          tag: 'Win-back',
          months: 'Sep',
          audience: 'Lapsed clients with a most-booked trainer.',
          mechanic:
            '12-class pack: ₹16.7k (15% off the ₹19.7k list price). Message from that trainer with a reserved spot in their class; 12-class pack at the standing 15%',
          economics:
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero. ₹2.5L counted (+₹38.3k vs the ₹2.1L stream plan) · 41 buyers',
          logic: 'Trainer relationships are what clients miss.',
          kpi: 'Needs most-booked trainer per client.',
          lever: 'winback',
        },
        {
          name: 'Festive Pause Button',
          tag: 'Renewal',
          months: 'Sep',
          audience: '1M and 3M renewers.',
          mechanic:
            '3M unlimited: ₹57.9k (list price). 3M at list; Unlimited freezes (use within 6 months); Festive gift (≈₹1,000)',
          economics:
            '1.7% effective = 0% cash + 1.7% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero. ₹13.0L counted (+₹1.6L vs the ₹11.4L stream plan) · 57 buyers',
          logic: 'October–December are troughs; locking 3M now carries members through them.',
          kpi: '3M renewals.',
          lever: 'annual',
        },
        {
          name: 'Festival of Lights Second Date',
          tag: 'Acquisition',
          months: 'Oct',
          audience: 'First-timers at candle-lit 7 pm classes in Diwali week.',
          mechanic:
            'Then any pack or membership at 15% off list (the standing new-client perk). Free candle-lit class; Class 2 booked at the door, free within 7 days; 15% within 72 hours of class 2',
          economics:
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero. ₹3.2L counted (+₹26.4k vs the ₹2.9L stream plan) · 24 buyers',
          logic: 'Hosted first visits convert at 1–3% today; booking the second class at the door is the fix.',
          kpi: 'Door bookings.',
          lever: 'conversion',
        },
        {
          name: 'Come Home for Diwali',
          tag: 'Win-back',
          months: 'Oct',
          audience: 'Lapsed clients.',
          mechanic:
            '12-class pack: ₹16.7k (15% off the ₹19.7k list price). 12-class pack at the standing 15% + a comeback class in Diwali week',
          economics:
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero. ₹2.0L counted (+₹28.8k vs the ₹1.8L stream plan) · 35 buyers',
          logic: 'Simple and on-theme.',
          kpi: 'Reactivations.',
          lever: 'winback',
        },
        {
          name: 'Renew & Gift',
          tag: 'Renewal',
          months: 'Oct',
          audience: 'October renewers.',
          mechanic:
            "Renewal at your product's list price (no % off). Renew at list → 5% back as credit usable only on a Gift a Shake card",
          economics:
            '5.0% effective = 0% cash + 5.0% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero. ₹10.9L counted (+₹16.1k vs the ₹10.7L stream plan) · 59 buyers',
          logic: 'Turns renewal value into new-client acquisition.',
          kpi: 'Credit used on gifts.',
          lever: 'annual',
        },
        {
          name: 'Black Friday Week Zero',
          tag: 'Acquisition',
          months: 'Nov',
          audience: 'First-time clients.',
          mechanic:
            'Intro: ₹2k for the 7-day unlimited intro, credited in full against a qualifying purchase within 72 hours. Then any pack or membership at 15% off list (the standing new-client perk). 7 days unlimited (max 2 a day); Credited within 72 hours against any pack or membership + standing 15%; Upgrade to 3M before day 21 of a 1M: the 1M amount is credited and the 3M gets unlimited freezes (use within 6 months)',
          economics:
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero. ₹2.3L counted (+₹31k vs the ₹2.0L stream plan) · 18 buyers',
          logic: 'Black Friday urgency without a deeper %.',
          kpi: 'Intro conversion; day-21 upgrades.',
          lever: 'conversion',
        },
        {
          name: 'Black Friday Comeback',
          tag: 'Win-back',
          months: 'Nov',
          audience: 'Lapsed clients.',
          mechanic: '1M unlimited: ₹17.8k (12% off the ₹20.2k list price). 1M at 12% off + 3 days',
          economics:
            '22.0% effective = 12% cash + 10.0% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero. ₹1.6L counted (+₹19.2k vs the ₹1.4L stream plan) · 27 buyers',
          logic: 'Same window as the new-client offer.',
          kpi: 'Effective 22%.',
          lever: 'winback',
        },
        {
          name: 'Club Nine: Last Seats',
          tag: 'Renewal',
          months: 'Nov',
          audience: 'Active members.',
          mechanic: 'Annual unlimited: ₹2.2L (list price). Only the Club Nine seats unsold in April, same perks',
          economics:
            '5.7% effective = 0% cash + 5.7% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero. ₹10.1L counted (+₹82.1k vs the ₹9.2L stream plan) · 51 buyers',
          logic: 'Closes the scarcity story.',
          kpi: 'Seats remaining.',
          lever: 'annual',
        },
        {
          name: 'Kickstart 21: Pre-Solution Cohort',
          tag: 'Acquisition',
          months: 'Dec',
          audience: 'First-time clients.',
          mechanic:
            'Kickstart 21 cohort: ₹10k (list price). Cohort starts Mon 3 Jan 2028; sold in December; 21 days unlimited + coach, WhatsApp, fitness checks, graduation; Graduates who buy a membership join Stronger in 30 (2028) with a scaled target',
          economics:
            '0.0% effective = 0% cash. Guest passes, consults, freezes and early booking are valued at zero. ₹2.9L counted (+₹0.7k vs the ₹2.9L stream plan) · 17 buyers',
          logic: 'Moves January demand into December cash and lands graduates in the members-only challenge.',
          kpi: 'Pre-sales; January graduation.',
          lever: 'conversion',
        },
        {
          name: 'Challenge Comeback Ticket',
          tag: 'Win-back',
          months: 'Dec',
          audience: 'Lapsed clients.',
          mechanic:
            '1M unlimited: ₹17.2k (15% off the ₹20.2k list price). 1M at the standing 15%, start any day until 1 Jan; Eligible for Stronger in 30 (Jan 2028)',
          economics:
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero. ₹1.9L counted (+₹18.7k vs the ₹1.7L stream plan) · 25 buyers',
          logic: "The challenge is members-only; this is the lapsed client's ticket in.",
          kpi: 'January starts.',
          lever: 'winback',
        },
        {
          name: 'Challenge-Ready Renewal',
          tag: 'Renewal',
          months: 'Dec',
          audience: 'Members expiring Dec–Jan.',
          mechanic:
            "Renewal at your product's list price (no % off). Renew at list so the membership covers all of January; Stronger in 30 challenge kit (≈₹1,000)",
          economics:
            '4.0% effective = 0% cash + 4.0% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero. ₹12.9L counted (+₹31.5k vs the ₹12.6L stream plan) · 54 buyers',
          logic: 'Members-only challenge = a natural reason to renew before it starts.',
          kpi: 'December renewals of January expiries.',
          lever: 'annual',
        },
      ],
      months: [
        {
          month: 'Jan',
          event: 'New Year · members-only 30-day challenge',
          theme: 'Stronger in 30 2.0',
          focus:
            'Convert January trial demand; get lapsed clients and new clients onto a membership in time to join the challenge; re-up the Jan-2026 annuals (8 annuals, ₹12.5L due).',
          offers: ['Week Zero', 'Back for Stronger', 'Finish Line Renewal'],
          actions: [
            "Week Zero: Seven days unlimited. Then you're in the challenge.",
            "Back for Stronger: The challenge starts without you. Unless you're back by 7 Jan.",
            'Finish Line Renewal: Finish Stronger in 30 and your renewal gets a medal.',
          ],
          why: 'Stronger in 30 2.0 runs all January for active members. Entry is free with an active membership or pack, so every January offer doubles as a challenge entry ticket.',
        },
        {
          month: 'Feb',
          event: "Valentine's Day (Sun 14 Feb) · Galentine's (Sat 13 Feb)",
          theme: 'Better Together',
          focus:
            'Duo and referral acquisition in place of BOGO (BOGO buyers were 79–94% existing clients and renewed at 33–53%). Keep Stronger in 30 finishers attending.',
          offers: ['The 30-Day Proof', 'Come Back as a Pair', 'Partners in Crime'],
          actions: [
            "The 30-Day Proof: Show up 12 times. If you don't get stronger, next month is free.",
            'Come Back as a Pair: Return with a friend. Their first class is on us.',
            'Partners in Crime: Renew with your workout partner. You both get more time.',
          ],
          why: "Galentine's hosted class, Sat 13 Feb, with a named associate and the Encore QR at the door.",
        },
        {
          month: 'Mar',
          event: "International Women's Day (Mon 8 Mar)",
          theme: 'She Moves',
          focus: 'Purpose-led reach; Bandra reactivation; stop March trials from waiting for the anniversary.',
          offers: ['Kickstart 21: She Moves Cohort', 'Class of 2024 Reunion', 'Lock In Early'],
          actions: [
            "Kickstart 21: She Moves Cohort: Starting Women's Day. 21 days. Stronger together.",
            'Class of 2024 Reunion: Where it all started. One class, the whole launch crew.',
            'Lock In Early: Renew in March, keep the anniversary perks.',
          ],
          why: 'Class of 2024 Reunion at Bandra (638 lapsed launch-cohort clients). Anniversary teaser from 16 Mar.',
        },
        {
          month: 'Apr',
          event: '9 years of Physique 57 India · first ₹1 Cr month',
          theme: 'Cloud Nine (9th anniversary)',
          focus:
            "The year's best, most playful offers and the first ₹1 Cr sales month (target ₹104.5L), without the 26–31% discounts of April 2026. Caps: 20% on ≤1M products, 15% on 3M+.",
          offers: ['Cloud Nine Intro', 'Nine Years, Nine Reasons', 'Lock In Before You Clock Out'],
          actions: [
            'Cloud Nine Intro: Nine days unlimited for less than one class.',
            'Nine Years, Nine Reasons: Nine things changed while you were away.',
            "Lock In Before You Clock Out: Renew in April at today's price, with bonus classes.",
          ],
          why: 'Club Nine: 9 numbered annual memberships per studio at full price. Anniversary party classes in week 2. Hard close 30 Apr, 23:59.',
        },
        {
          month: 'May',
          event: "Mother's Day (Sun 9 May)",
          theme: 'The Afterparty',
          focus:
            'Retain the April cohort (target ≥55% renewal at next expiry vs 24.5% for 2026 anniversary-code buyers at Kwality); duo acquisition.',
          offers: ['Mother Shaker Second Date', 'The Comeback Squad', 'The Afterparty'],
          actions: [
            'Mother Shaker Second Date: Bring your mum. Both second classes are on us.',
            'The Comeback Squad: Rejoin with a group that starts the same day.',
            'The Afterparty: Book 8 in May; get a hosted class and a progress check.',
          ],
          why: 'Every April buyer gets the 30-day Afterparty plan: week-1 call, 8 classes in May unlocks a hosted class and a progress check.',
        },
        {
          month: 'Jun',
          event: "Summer travel · college holidays · Father's Day (Sun 20 Jun)",
          theme: 'Out of Office',
          focus: 'Stop summer lapses; fill weekday 10–12 and weekend 4–7 pm (27–41% full) with students.',
          offers: ['Golden Hours Flight', 'Pay-As-You-Return', 'The Pause Button'],
          actions: [
            'Golden Hours Flight: Students: three classes in ten days, in the hours with room.',
            "Pay-As-You-Return: Start with 4. If you're back, it all counts.",
            'The Pause Button: Three months unlimited. Freeze it as often as you like.',
          ],
          why: 'Golden Hours launch for students and under-25s.',
        },
        {
          month: 'Jul',
          event: 'Monsoon · Amazing Race warm-up',
          theme: 'Monsoon I: Rain Check',
          focus:
            'Attendance and late cancels (Kenkere 21–30%); get people on a membership before the race starts on 1 Aug.',
          offers: ['Kickstart 21: Race Ready Cohort', 'Warm-Up Lap', 'Monsoon Streak'],
          actions: [
            'Kickstart 21: Race Ready Cohort: 21 days that end on the Amazing Race start line.',
            'Warm-Up Lap: Get race-fit before the gun goes on 1 August.',
            'Monsoon Streak: 12+ classes, zero late cancels, +7 days.',
          ],
          why: 'Race registrations open 15 Jul. Monsoon Streak leaderboard by studio.',
        },
        {
          month: 'Aug',
          event: 'Month-long individual race · Friendship Day (Sun 1 Aug)',
          theme: 'The Amazing Race 2.0',
          focus:
            'Attendance-led renewals and upgrades; bring new clients in on a Rookie leaderboard; second seasonal peak in Mumbai.',
          offers: ['Starting Gun Week', 'Back on Track', 'Pit Stop'],
          actions: [
            'Starting Gun Week: Seven days unlimited from the day the race starts.',
            'Back on Track: Your lane is still open.',
            'Pit Stop: Renew mid-race and keep your streak.',
          ],
          why: 'The Amazing Race 2.0: every client races on their own against a studio leaderboard, 1–31 Aug. Rookie leaderboard for first-timers.',
        },
        {
          month: 'Sep',
          event: '57 days to Diwali (2 Sep → 28 Oct)',
          theme: 'Monsoon III: The Comeback',
          focus: 'Reactivate before the festive season; carry race momentum into a festive countdown.',
          offers: ['The Second Date', 'We Kept Your Spot', 'Festive Pause Button'],
          actions: [
            'The Second Date: Your second class is booked before you leave.',
            'We Kept Your Spot: A personal note from your favourite trainer.',
            'Festive Pause Button: Renew 3 months; Diwali and year-end travel covered.',
          ],
          why: '57 Days to Diwali countdown starts 2 Sep; Bandra reunion repeat.',
        },
        {
          month: 'Oct',
          event: 'Diwali (Fri 29 Oct) · Dasara week in Bengaluru',
          theme: 'Festival of Lights',
          focus: "Gift-led revenue; protect Kenkere's Dasara trough; catch Kwality's late-October surge without codes.",
          offers: ['Festival of Lights Second Date', 'Come Home for Diwali', 'Renew & Gift'],
          actions: [
            'Festival of Lights Second Date: A candle-lit first class. Your second is booked at the door.',
            "Come Home for Diwali: Your mat's still here.",
            'Renew & Gift: Renew in October; 5% back to spend on a gift card.',
          ],
          why: 'Gift cards on sale from 1 Oct; candle-lit evening classes in Diwali week; limited-run format #3.',
        },
        {
          month: 'Nov',
          event: 'Black Friday (Fri 26 Nov) → Cyber Monday (29 Nov)',
          theme: 'Black Friday, Strong Monday',
          focus: 'Long commitments in the softest Mumbai month.',
          offers: ['Black Friday Week Zero', 'Black Friday Comeback', 'Club Nine: Last Seats'],
          actions: [
            'Black Friday Week Zero: Seven days unlimited, fully credited.',
            'Black Friday Comeback: Back for a month, plus three days.',
            'Club Nine: Last Seats: The last numbered seats.',
          ],
          why: 'Club Nine last seats (only those unsold in April).',
        },
        {
          month: 'Dec',
          event: 'Year-end · pre-sell January',
          theme: 'Wrapped',
          focus: 'Pre-sell January and Stronger in 30 (2028) entries; renew on personal usage data.',
          offers: ['Kickstart 21: Pre-Solution Cohort', 'Challenge Comeback Ticket', 'Challenge-Ready Renewal'],
          actions: [
            'Kickstart 21: Pre-Solution Cohort: Buy in December. Start Mon 3 Jan. Arrive in Stronger in 30.',
            'Challenge Comeback Ticket: Buy now, start by 1 January, join Stronger in 30.',
            "Challenge-Ready Renewal: Renew in December so you're covered for all of Stronger in 30.",
          ],
          why: '"Your 2027 Wrapped": a personal year-in-review for every client, ending in a usage-based renewal recommendation.',
        },
      ],
      rhythm: [
        [
          'Newcomer journey',
          "Offers: Week Zero, The 30-Day Proof, Kickstart 21: She Moves Cohort, Cloud Nine Intro, Mother Shaker Second Date, Golden Hours Flight, Kickstart 21: Race Ready Cohort, Starting Gun Week, The Second Date, Festival of Lights Second Date, Black Friday Week Zero, Kickstart 21: Pre-Solution Cohort. Watch each offer's “What to watch” measures and rate of sale monthly.",
        ],
        [
          'Lapsed journey',
          "Offers: Back for Stronger, Come Back as a Pair, Class of 2024 Reunion, Nine Years, Nine Reasons, The Comeback Squad, Pay-As-You-Return, Warm-Up Lap, Back on Track, We Kept Your Spot, Come Home for Diwali, Black Friday Comeback, Challenge Comeback Ticket. Watch each offer's “What to watch” measures and rate of sale monthly.",
        ],
        [
          'Renewal journey',
          "Offers: Finish Line Renewal, Partners in Crime, Lock In Early, Lock In Before You Clock Out, The Afterparty, The Pause Button, Monsoon Streak, Pit Stop, Festive Pause Button, Renew & Gift, Club Nine: Last Seats, Challenge-Ready Renewal. Watch each offer's “What to watch” measures and rate of sale monthly.",
        ],
      ],
      scorecard: [
        ['Leads → trials', '2,125', '1,213', 'Newcomer journeys'],
        ['Trials → new buyers', '1,213', '217', 'Newcomer journeys'],
        ['Renewals due → purchases', '991', '692', 'Renewal journeys'],
        ['Lapsed touches → reactivated', '4,612', '369', 'Lapsed journeys'],
        ['Target → projected', '₹228.2L', '₹243.4L', 'Final approved plan'],
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
        ['Website & online', 1145, 28.8, 8.0],
        ['Hosted & walk-in', 364, 85.4, 5.2],
        ['Calls & WhatsApp', 324, 75.0, 25.3],
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
        'Final approved 2027 plan: ₹135.0L target, ₹142.8L projected across twelve themed months, each run as three journeys — newcomer, lapsed and renewal.',
      snapshot: [
        ['TTM revenue', '₹107.5L', '+15% vs prior 12 months', true],
        ['2026 forecast', '₹111.5L', 'Jan–Sep actual + Q4 at 2026 run-rate', true],
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
          stat: '60%',
          detail: 'Renewal plan ₹81.6L of ₹135.0L; 573 renewal purchases planned from 662 due.',
          implication:
            'Renewal offers: Finish Line Renewal, Partners in Crime, Pre-Party Upgrade, Lock In Before You Clock Out, The Afterparty, The Pause Button, Monsoon Streak, Pit Stop, Challenge Captain, Festive Pause Pass, Strong Monday Ladder, Challenge-Ready Renewal.',
        },
        {
          title: 'New clients',
          stat: '154',
          detail: 'New-client plan ₹23.3L: 3,035 leads → 607 trials → 154 new buyers.',
          implication:
            'Newcomer offers: Week Zero, Swipe Right Flight, Kickstart 21: She Moves Cohort, Cloud Nine Intro, Kickstart 21: Summer Cohort, Golden Hours Flight, Rain Check Second Date, Starting Gun Week, 57-Day Proof, Gift a Flight, Black Friday Week Zero, Kickstart 21: Pre-Solution Cohort.',
        },
        {
          title: 'Lapsed clients',
          stat: '257',
          detail: 'Reactivation plan ₹12.4L: 257 reactivated from 3,207 touches.',
          implication:
            'Lapsed offers: Back for Stronger, Come Back as a Pair, Beat Your Best, Nine Years, Nine Reasons, A Class for Mum, Out of Office, Not Out of Shape, Warm-Up Lap, Back on Track, The Return Policy, Light Up Your Streak, Black Friday Comeback, Your 2027 Wrapped.',
        },
        {
          title: 'Peak month: Sep',
          stat: '₹14.4L',
          detail: 'Monsoon III: The Comeback · 57 days to Diwali (2 Sep → 28 Oct).',
          implication: 'Reactivate before the festive season; carry race momentum into a festive countdown.',
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
            why: 'Final plan: carried by the newcomer offers — Week Zero, Swipe Right Flight, Kickstart 21: She Moves Cohort, Cloud Nine Intro, Kickstart 21: Summer Cohort, Golden Hours Flight, Rain Check Second Date, Starting Gun Week, 57-Day Proof, Gift a Flight, Black Friday Week Zero, Kickstart 21: Pre-Solution Cohort.',
          },
          {
            id: 'leads',
            name: 'Online-lead speed to trial',
            value: 1039195,
            math: '1,905 online leads × trial rate 12.4% → 20.6% × 57% trial→member = +88 members × ₹16,090 × 0.73',
            why: 'Final plan: carried by the newcomer offers — Week Zero, Swipe Right Flight, Kickstart 21: She Moves Cohort, Cloud Nine Intro, Kickstart 21: Summer Cohort, Golden Hours Flight, Rain Check Second Date, Starting Gun Week, 57-Day Proof, Gift a Flight, Black Friday Week Zero, Kickstart 21: Pre-Solution Cohort.',
          },
          {
            id: 'referral',
            name: 'Paid-on-conversion referral engine',
            value: 777508,
            math: '455 referral leads × +50% volume × 29.0% lead→member = +66 members × ₹16,090 × 0.73',
            why: 'Final plan: carried by the newcomer offers — Week Zero, Swipe Right Flight, Kickstart 21: She Moves Cohort, Cloud Nine Intro, Kickstart 21: Summer Cohort, Golden Hours Flight, Rain Check Second Date, Starting Gun Week, 57-Day Proof, Gift a Flight, Black Friday Week Zero, Kickstart 21: Pre-Solution Cohort.',
          },
          {
            id: 'winback',
            name: 'Tiered win-back of dormant clients',
            value: 390162,
            math: '177 loyal dormant (3+ purchases) × +10pts return + 350 light dormant × +5pts = +35 returners × ₹18,439 avg return spend (×0.8 / ×0.4)',
            why: 'Final plan: carried by the lapsed offers — Back for Stronger, Come Back as a Pair, Beat Your Best, Nine Years, Nine Reasons, A Class for Mum, Out of Office, Not Out of Shape, Warm-Up Lap, Back on Track, The Return Policy, Light Up Your Streak, Black Friday Comeback, Your 2027 Wrapped.',
          },
          {
            id: 'usage',
            name: 'First-30-day habit programme',
            value: 32599,
            math: '27 unlimited memberships ended at ≤4 visits/month × 30% moved to 5–8 visits × +20pt renewal = +2 renewals × ₹13,169 × 1.5 cycles',
            why: 'Final plan: carried by the renewal offers — Finish Line Renewal, Partners in Crime, Pre-Party Upgrade, Lock In Before You Clock Out, The Afterparty, The Pause Button, Monsoon Streak, Pit Stop, Challenge Captain, Festive Pause Pass, Strong Monday Ladder, Challenge-Ready Renewal.',
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
            why: 'Final plan: carried by the renewal offers — Finish Line Renewal, Partners in Crime, Pre-Party Upgrade, Lock In Before You Clock Out, The Afterparty, The Pause Button, Monsoon Streak, Pit Stop, Challenge Captain, Festive Pause Pass, Strong Monday Ladder, Challenge-Ready Renewal.',
          },
        ],
        leverTotal: 2962789.18,
        haircut: 0.15,
        projection: 14776329.71,
        appTargetAtBuild: 12590000,
      },
      offers: [
        {
          name: 'Week Zero',
          tag: 'Acquisition',
          months: 'Jan',
          audience: 'First-time clients (phone verified).',
          mechanic:
            'Intro: ₹1.5k for the 7-day unlimited intro, credited in full against a qualifying purchase within 72 hours. Then any pack or membership at 15% off list (the standing new-client perk). Unlimited Barre and powerCycle for 7 days (max 2 classes a day); Goal-setting chat after class 1; owner check-in on day 3; Lab Induction seat at Kwality/Bandra; Buy any pack or membership within 72 hours of day 7: full intro fee credited + the standing 15%; A membership makes you eligible for Stronger in 30 2.0 from the week you join (target scaled)',
          economics:
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero. ₹4.0L counted (+₹54.3k vs the ₹3.5L stream plan) · 26 buyers',
          logic:
            'January leads are the most motivated of the year. Clients with 5+ visits in month one convert at 94%; a credited week lets the habit form before the ask, and the challenge gives a reason to join now.',
          kpi: 'Intro → purchase (target 45%); classes in the intro week (target 4+).',
          lever: 'conversion',
        },
        {
          name: 'Back for Stronger',
          tag: 'Win-back',
          months: 'Jan',
          audience: 'Clients lapsed 61–365 days.',
          mechanic:
            '1M unlimited: ₹12.4k (15% off the ₹14.6k list price). 1M unlimited or a 12-class pack at the standing 15% lapsed perk; Full entry to Stronger in 30 2.0, including finisher rewards; A free comeback class to book before buying',
          economics:
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero. ₹1.3L counted (+₹17.5k vs the ₹1.1L stream plan) · 23 buyers',
          logic:
            'The challenge is members-only, so lapsed clients need a membership to take part. A deadline and a social event do more than a deeper discount.',
          kpi: 'Lapsed clients entering the challenge.',
          lever: 'winback',
        },
        {
          name: 'Finish Line Renewal',
          tag: 'Renewal',
          months: 'Jan',
          audience: 'Active members renewing in January or early February.',
          mechanic:
            "Renewal at your product's list price (no % off). Challenge finishers renew at list and get: +7 days on 1M, +2 classes on a pack, +14 days on 3M or longer; Members who reach 50% of the target get +3 days on 1M or +1 class on a pack",
          economics:
            '7.0% effective = 0% cash + 7.0% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero. ₹6.7L counted (+₹16.4k vs the ₹6.6L stream plan) · 43 buyers',
          logic:
            'Renewers average 6.4 visits in the first half of a membership vs 2.6–3.4 for lapsers. Rewarding finishers pays for the behaviour that produces renewals; full-price renewers renew again at 61–68% vs 50–54% after discounts.',
          kpi: 'Challenge finish rate; renewal yield.',
          lever: 'annual',
        },
        {
          name: 'Swipe Right Flight',
          tag: 'Acquisition',
          months: 'Feb',
          audience: 'First-time clients.',
          mechanic:
            'Intro: ₹1.8k for the Tasting Flight (3 classes in 10 days), credited in full against a qualifying purchase within 72 hours. Then any pack or membership at 15% off list (the standing new-client perk). 3 classes in 10 days: Barre, powerCycle and Strength Lab (Kwality: held 6 am Lab seats; Kenkere: Barre, Mat, Cardio Barre/FIT); All 3 booked at purchase; "Match" within 72 hours of class 3: full fee credited + standing 15% on any pack or membership',
          economics:
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero. ₹2.2L counted (+₹25.4k vs the ₹2.0L stream plan) · 17 buyers',
          logic:
            'The 2-for-1 converts at 21% into an ₹8k purchase; three visits sit in the 73–89% conversion zone and multi-format members renew at 85–87%.',
          kpi: 'Flight → purchase (target 35–40%).',
          lever: 'conversion',
        },
        {
          name: 'Come Back as a Pair',
          tag: 'Win-back',
          months: 'Feb',
          audience: 'Lapsed clients plus a friend who is new to P57.',
          mechanic:
            '12-class pack: ₹11.2k (15% off the ₹13.1k list price). Lapsed client: 12-class pack at the standing 15%; Friend: free first class; If the friend buys, the lapsed client gets 2 guest passes and 48-hour priority booking for a month',
          economics:
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero. ₹0.9L counted (+₹12.3k vs the ₹0.8L stream plan) · 20 buyers',
          logic: 'One message, two streams: reactivation and a warm new lead.',
          kpi: 'Friends who buy.',
          lever: 'winback',
        },
        {
          name: 'Partners in Crime',
          tag: 'Renewal',
          months: 'Feb',
          audience: 'Two active members renewing in the same week.',
          mechanic:
            "Renewal at your product's list price (no % off). Each gets +3 days on 1M, +1 class on a pack, or +7 days on 3M or longer",
          economics:
            '6.0% effective = 0% cash + 6.0% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero. ₹6.8L counted (+₹10.1k vs the ₹6.7L stream plan) · 52 buyers',
          logic: 'Pairs keep each other attending; attendance predicts renewal. Tag pairs to measure it.',
          kpi: 'Next-renewal rate of pairs vs singles.',
          lever: 'annual',
        },
        {
          name: 'Kickstart 21: She Moves Cohort',
          tag: 'Acquisition',
          months: 'Mar',
          audience: 'First-time clients.',
          mechanic:
            "Kickstart 21 cohort: ₹8k (list price). Cohort starts Mon 8 Mar (Women's Day); second cohort Mon 22 Mar; 21 days unlimited + coach, WhatsApp group, fitness checks, graduation; Each member gets a free class to gift a woman she nominates; Graduates: standing 15% within 7 days",
          economics:
            '0.0% effective = 0% cash. Guest passes, consults, freezes and early booking are valued at zero. ₹2.0L counted (+₹2.9k vs the ₹2.0L stream plan) · 14 buyers',
          logic: 'Purpose-led reach with the engagement of a cohort; the gift class creates warm leads.',
          kpi: 'Nominee classes converted.',
          lever: 'conversion',
        },
        {
          name: 'Beat Your Best',
          tag: 'Win-back',
          months: 'Mar',
          audience: 'Lapsed clients with a recorded best month.',
          mechanic:
            "1M unlimited: ₹14.6k (list price). 1M unlimited at list; Match your best month's class count → +6 days",
          economics:
            '20.0% effective = 0% cash + 20.0% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero. ₹1.1L counted (+₹14.2k vs the ₹1.0L stream plan) · 21 buyers',
          logic: 'Personal data beats generic offers and sets a goal; the reward is earned.',
          kpi: 'Data build needed.',
          lever: 'winback',
        },
        {
          name: 'Pre-Party Upgrade',
          tag: 'Renewal',
          months: 'Mar',
          audience: '1M renewers with 8+ visits a month.',
          mechanic:
            '3M unlimited: ₹42.2k (list price). 3M unlimited at list; Unlimited freezes (use within 6 months); Anniversary tote (≈₹1,000)',
          economics:
            '2.4% effective = 0% cash + 2.4% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero. ₹5.3L counted (+₹48.2k vs the ₹4.8L stream plan) · 33 buyers',
          logic: '3M renews at 71% at Kenkere vs 59% for 1M.',
          kpi: 'Tote stock.',
          lever: 'annual',
        },
        {
          name: 'Cloud Nine Intro',
          tag: 'Acquisition',
          months: 'Apr',
          audience: 'First-time clients (phone verified).',
          mechanic:
            'Intro: ₹0.8k for the 9-day unlimited intro, credited in full against a qualifying purchase within 72 hours. Then any pack or membership at 15% off list (the standing new-client perk). Unlimited Barre and powerCycle for 9 days (max 2 a day) + a Lab Induction seat (Kwality/Bandra); Buy any pack or membership within 72 hours of day 9: intro fee credited + standing 15% + anniversary tote (≈₹1,000)',
          economics:
            '21.0% effective = 15% cash + 6.0% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero. ₹2.6L counted (+₹44.6k vs the ₹2.1L stream plan) · 17 buyers',
          logic:
            'The anniversary is worth an eye-catching price. Nine days builds the habit; the credited purchase protects the commitment price.',
          kpi: 'Intro volume vs spare seats; intro → purchase (target 40%).',
          lever: 'conversion',
        },
        {
          name: 'Nine Years, Nine Reasons',
          tag: 'Win-back',
          months: 'Apr',
          audience: 'Clients lapsed 61 days–2 years.',
          mechanic:
            '12-class pack: ₹11.2k (15% off the ₹13.1k list price). A personal note listing 9 things new at your studio (formats, trainers, schedule); 12-class pack at the standing 15% lapsed perk; Invite to an anniversary party class',
          economics:
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero. ₹1.8L counted (+₹22.4k vs the ₹1.5L stream plan) · 33 buyers',
          logic:
            'Lapsed clients left something that no longer exists; showing what\'s new answers "why go back". April has the most attention of the year.',
          kpi: 'Bandra needs 54 reactivations in April from 673 touches.',
          lever: 'winback',
        },
        {
          name: 'Lock In Before You Clock Out',
          tag: 'Renewal',
          months: 'Apr',
          audience: 'Members expiring 1 Apr–15 Jun only.',
          mechanic:
            "Renewal at your product's list price (no % off). Renew at list; +3 classes on packs, +7 days on 1M, +14 days on 3M or longer",
          economics:
            '10.0% effective = 0% cash + 10.0% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero. ₹8.6L counted (+₹32.9k vs the ₹8.2L stream plan) · 57 buyers',
          logic:
            '2026 anniversary-code buyers renewed at 24.5% at Kwality vs 61.6% at full price. Restricting eligibility limits pull-forward.',
          kpi: 'Renewal purchases vs due (plan KH 130 vs 120 due).',
          lever: 'annual',
        },
        {
          name: 'Kickstart 21: Summer Cohort',
          tag: 'Acquisition',
          months: 'May',
          audience: 'First-time clients.',
          mechanic:
            'Kickstart 21 cohort: ₹8k (list price). Cohorts start Mon 3 May and Mon 17 May; 21 days unlimited + coach, WhatsApp, fitness checks, graduation; Graduates: standing 15% within 7 days',
          economics:
            '0.0% effective = 0% cash. Guest passes, consults, freezes and early booking are valued at zero. ₹1.8L counted (+₹3.4k vs the ₹1.8L stream plan) · 14 buyers',
          logic: 'Kenkere already sells a summer bootcamp; a cohort fixes its conversion problem with structure.',
          kpi: 'Graduate → purchase.',
          lever: 'conversion',
        },
        {
          name: 'A Class for Mum',
          tag: 'Win-back',
          months: 'May',
          audience: 'Lapsed clients.',
          mechanic:
            '12-class pack: ₹11.2k (15% off the ₹13.1k list price). 12-class pack at the standing 15%; A free class for their mother (or any mum)',
          economics:
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero. ₹1.1L counted (+₹9.5k vs the ₹1.0L stream plan) · 23 buyers',
          logic: 'On-theme, cash cost unchanged, gift class is a warm lead.',
          kpi: 'Gift classes booked.',
          lever: 'winback',
        },
        {
          name: 'The Afterparty',
          tag: 'Renewal',
          months: 'May',
          audience: 'April buyers and May renewers.',
          mechanic:
            "Renewal at your product's list price (no % off). Book 8 classes in May → a free hosted class + a trainer progress check; Renew at list",
          economics:
            '2.0% effective = 0% cash + 2.0% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero. ₹6.9L counted (+₹13.5k vs the ₹6.8L stream plan) · 55 buyers',
          logic: 'Target ≥55% of April commitment buyers renewing at next expiry (2026 code buyers: 24.5% at Kwality).',
          kpi: 'April cohort attendance in May.',
          lever: 'annual',
        },
        {
          name: 'Golden Hours Flight',
          tag: 'Acquisition',
          months: 'Jun',
          audience: 'Students or under-25s with ID.',
          mechanic:
            'Intro: ₹1k for the Student Tasting Flight (3 classes in 10 days), credited in full against a qualifying purchase within 72 hours. 8-class pack: ₹7k (20% off the ₹8.7k list price). 3 classes in 10 days in weekday 10–12 or weekend 4–7 pm classes; Full fee credited within 72 hours against the Golden Hours 8-class pack (20% off, valid in those slots only)',
          economics:
            '20.0% effective = 20% cash. Guest passes, consults, freezes and early booking are valued at zero. ₹1.6L counted (+₹2.2k vs the ₹1.6L stream plan) · 14 buyers',
          logic: 'Those slots run at 27–41% fill; students fill them without cannibalising peak classes.',
          kpi: 'Golden Hours fill.',
          lever: 'conversion',
        },
        {
          name: 'Out of Office, Not Out of Shape',
          tag: 'Win-back',
          months: 'Jun',
          audience: 'Lapsed clients.',
          mechanic:
            '1M unlimited: ₹12.4k (15% off the ₹14.6k list price). 1M at the standing 15%; 2 extra freezes; A written travel workout plan',
          economics:
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero. ₹1.1L counted (+₹10.8k vs the ₹1.0L stream plan) · 24 buyers',
          logic: 'Answers "I\'ll be away" without cash.',
          kpi: 'Freeze usage.',
          lever: 'winback',
        },
        {
          name: 'The Pause Button',
          tag: 'Renewal',
          months: 'Jun',
          audience: '1M and 3M renewers.',
          mechanic: '3M unlimited: ₹42.2k (list price). 3M unlimited at list; Unlimited freezes (use within 6 months)',
          economics:
            '0.0% effective = 0% cash. Guest passes, consults, freezes and early booking are valued at zero. ₹7.9L counted (+₹97.9k vs the ₹6.9L stream plan) · 56 buyers',
          logic: 'The best time of year for this offer: travel is the main reason to let a membership lapse.',
          kpi: 'June renewal yield.',
          lever: 'annual',
        },
        {
          name: 'Rain Check Second Date',
          tag: 'Acquisition',
          months: 'Jul',
          audience: 'First-time clients starting with Barre.',
          mechanic:
            'Then any pack or membership at 15% off list (the standing new-client perk). Free first Barre class; Class 2 free within 7 days, booked at the desk; on IMD orange/red-alert days the 7 days pause; 15% within 72 hours of class 2; 10% until day 14',
          economics:
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero. ₹1.7L counted (+₹13.9k vs the ₹1.5L stream plan) · 13 buyers',
          logic: 'Rain breaks the second visit; pausing the window protects it.',
          kpi: 'Second-visit share in July.',
          lever: 'conversion',
        },
        {
          name: 'Warm-Up Lap',
          tag: 'Win-back',
          months: 'Jul',
          audience: 'Lapsed clients.',
          mechanic:
            '1M unlimited: ₹12.4k (15% off the ₹14.6k list price). 1M at the standing 15%, start 15 Jul–1 Aug; Free race-prep assessment; Full race entry',
          economics:
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero. ₹1.5L counted (+₹20.6k vs the ₹1.3L stream plan) · 32 buyers',
          logic: 'An event with a date beats a discount for lapsed clients.',
          kpi: 'Lapsed race entries.',
          lever: 'winback',
        },
        {
          name: 'Monsoon Streak',
          tag: 'Renewal',
          months: 'Jul',
          audience: 'July renewers.',
          mechanic:
            "Renewal at your product's list price (no % off). Renew at list; 12+ classes and zero late cancels in July → +7 days (unlimited) or +1 class (packs)",
          economics:
            '7.0% effective = 0% cash + 7.0% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero. ₹9.4L counted (+₹18.4k vs the ₹9.2L stream plan) · 70 buyers',
          logic:
            "Fixes behaviour and revenue together; Bandra's 2025 late-cancel spike fell once the rule was enforced.",
          kpi: 'Late-cancel rate (Kenkere target <15%).',
          lever: 'annual',
        },
        {
          name: 'Starting Gun Week',
          tag: 'Acquisition',
          months: 'Aug',
          audience: 'First-time clients.',
          mechanic:
            'Intro: ₹1.5k for the 7-day unlimited intro, credited in full against a qualifying purchase within 72 hours. Then any pack or membership at 15% off list (the standing new-client perk). 7 days unlimited (max 2 a day); classes count on the Rookie leaderboard; Credited within 72 hours against any pack or membership + standing 15%; Race kit (bib and tote, ≈₹1,000) with the purchase',
          economics:
            '21.0% effective = 15% cash + 6.0% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero. ₹2.1L counted (+₹29k vs the ₹1.9L stream plan) · 16 buyers',
          logic:
            'An individual race is intimidating for beginners; a Rookie leaderboard and an unlimited week make it winnable.',
          kpi: 'Rookie entries; intro conversion.',
          lever: 'conversion',
        },
        {
          name: 'Back on Track',
          tag: 'Win-back',
          months: 'Aug',
          audience: 'Lapsed clients.',
          mechanic:
            '1M unlimited: ₹12.8k (12% off the ₹14.6k list price). 1M at 12% off; Finish the race target → +3 days',
          economics:
            '22.0% effective = 12% cash + 10.0% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero. ₹0.9L counted (+₹14.1k vs the ₹0.7L stream plan) · 19 buyers',
          logic: 'Race + earned bonus; max effective 22%.',
          kpi: 'Lapsed racers finishing.',
          lever: 'winback',
        },
        {
          name: 'Pit Stop',
          tag: 'Renewal',
          months: 'Aug',
          audience: 'Members expiring in August or early September.',
          mechanic:
            "Renewal at your product's list price (no % off). Renew at list; race progress carries over; Race finishers get +7 days on 1M or +14 days on 3M+; Upgrade to 3M with unlimited freezes",
          economics:
            '7.0% effective = 0% cash + 7.0% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero. ₹7.9L counted (+₹49.9k vs the ₹7.4L stream plan) · 57 buyers',
          logic: 'The race lifts attendance, and attendance lifts renewals; finisher bonuses are earned.',
          kpi: 'Race finish rate; renewal yield.',
          lever: 'annual',
        },
        {
          name: '57-Day Proof',
          tag: 'Acquisition',
          months: 'Sep',
          audience: 'First-time clients.',
          mechanic:
            '1M unlimited: ₹12.4k (15% off the ₹14.6k list price). 1M unlimited at the standing 15%; Fitness check on day 1, coach check-ins; Re-test before 28 Oct: 20+ classes and no improvement on 2 of 3 measures → your next month free',
          economics:
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero. ₹1.8L counted (+₹1.9k vs the ₹1.8L stream plan) · 11 buyers',
          logic:
            "A finish line before Diwali and a results promise carry new clients into October, Kenkere's weakest month.",
          kpi: 'October renewals of September joiners.',
          lever: 'conversion',
        },
        {
          name: 'The Return Policy',
          tag: 'Win-back',
          months: 'Sep',
          audience: 'Clients lapsed 61–365 days.',
          mechanic:
            '12-class pack: ₹11.6k (12% off the ₹13.1k list price). Free comeback class; Buy 1M or a 12-class pack within 7 days at 12% off + 1 bonus class',
          economics:
            '22.8% effective = 12% cash + 10.8% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero. ₹1.3L counted (+₹6.8k vs the ₹1.3L stream plan) · 21 buyers',
          logic: 'Time-limited to keep decisions fast.',
          kpi: 'Reactivations vs plan.',
          lever: 'winback',
        },
        {
          name: 'Challenge Captain',
          tag: 'Renewal',
          months: 'Sep',
          audience: 'September renewers.',
          mechanic:
            "Renewal at your product's list price (no % off). Renew at list; Bring 2 friends who join → +14 days (unlimited) or +2 classes (packs)",
          economics:
            '4.0% effective = 0% cash + 4.0% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero. ₹9.5L counted (+₹9.5k vs the ₹9.5L stream plan) · 56 buyers',
          logic: "Kenkere's strong renewal base can fix its weak acquisition.",
          kpi: 'Captain-referred buyers.',
          lever: 'annual',
        },
        {
          name: 'Gift a Flight',
          tag: 'Acquisition',
          months: 'Oct',
          audience: 'Anyone buying for a friend who is new to P57.',
          mechanic:
            'Intro: ₹1.8k for the Tasting Flight gift (3 classes in 10 days), credited in full against a qualifying purchase within 72 hours. Then any pack or membership at 15% off list (the standing new-client perk). A Tasting Flight as a Diwali gift card; The recipient follows the Flight journey; the fee is credited if they buy within 72 hours of class 3; The giver gets 1 bonus class when the recipient buys',
          economics:
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero. ₹1.3L counted (+₹14.8k vs the ₹1.1L stream plan) · 10 buyers',
          logic:
            'Gifting is real Diwali spend, and a Flight is a better gift than cash credit because it leads into the best-converting journey.',
          kpi: 'Gift activations; recipient conversion.',
          lever: 'conversion',
        },
        {
          name: 'Light Up Your Streak',
          tag: 'Win-back',
          months: 'Oct',
          audience: 'Lapsed clients.',
          mechanic:
            '1M unlimited: ₹12.8k (12% off the ₹14.6k list price). 1M at 12% off; 15 classes in 30 days → +3 days',
          economics:
            '22.0% effective = 12% cash + 10.0% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero. ₹1.1L counted (+₹13.8k vs the ₹1.0L stream plan) · 24 buyers',
          logic: "Kenkere's Dasara trough needs attendance as much as sales.",
          kpi: 'Streak completion.',
          lever: 'winback',
        },
        {
          name: 'Festive Pause Pass',
          tag: 'Renewal',
          months: 'Oct',
          audience: 'October renewers.',
          mechanic:
            "Renewal at your product's list price (no % off). Renew 1M or longer at list; 1 extra freeze for festive travel + 2 guest passes for family",
          economics:
            '0.0% effective = 0% cash. Guest passes, consults, freezes and early booking are valued at zero. ₹4.5L counted (+₹6.6k vs the ₹4.4L stream plan) · 36 buyers',
          logic: "Kenkere's October is a travel trough.",
          kpi: 'October yield.',
          lever: 'annual',
        },
        {
          name: 'Black Friday Week Zero',
          tag: 'Acquisition',
          months: 'Nov',
          audience: 'First-time clients.',
          mechanic:
            'Intro: ₹1.5k for the 7-day unlimited intro, credited in full against a qualifying purchase within 72 hours. Then any pack or membership at 15% off list (the standing new-client perk). 7 days unlimited (max 2 a day); Credited within 72 hours against any pack or membership + standing 15%; Upgrade to 3M before day 21 of a 1M: the 1M amount is credited and the 3M gets unlimited freezes (use within 6 months)',
          economics:
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero. ₹2.7L counted (+₹37.1k vs the ₹2.4L stream plan) · 19 buyers',
          logic: 'Black Friday urgency without a deeper %.',
          kpi: 'Intro conversion; day-21 upgrades.',
          lever: 'conversion',
        },
        {
          name: 'Black Friday Comeback',
          tag: 'Win-back',
          months: 'Nov',
          audience: 'Lapsed clients.',
          mechanic: '1M unlimited: ₹12.8k (12% off the ₹14.6k list price). 1M at 12% off + 3 days',
          economics:
            '22.0% effective = 12% cash + 10.0% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero. ₹1.0L counted (+₹7.9k vs the ₹0.9L stream plan) · 18 buyers',
          logic: 'Same window as the new-client offer.',
          kpi: 'Effective 22%.',
          lever: 'winback',
        },
        {
          name: 'Strong Monday Ladder',
          tag: 'Renewal',
          months: 'Nov',
          audience: 'Members renewing 26–29 Nov.',
          mechanic: "Renewal at your product's list price (no % off). 3M +7 days, 6M +14 days, Annual +30 days",
          economics:
            '8.0% effective = 0% cash + 8.0% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero. ₹8.0L counted (+₹56.8k vs the ₹7.4L stream plan) · 51 buyers',
          logic: 'Rewards length, not depth.',
          kpi: '3M+ share.',
          lever: 'annual',
        },
        {
          name: 'Kickstart 21: Pre-Solution Cohort',
          tag: 'Acquisition',
          months: 'Dec',
          audience: 'First-time clients.',
          mechanic:
            'Kickstart 21 cohort: ₹8k (list price). Cohort starts Mon 3 Jan 2028; sold in December; 21 days unlimited + coach, WhatsApp, fitness checks, graduation; Graduates who buy a membership join Stronger in 30 (2028) with a scaled target',
          economics:
            '0.0% effective = 0% cash. Guest passes, consults, freezes and early booking are valued at zero. ₹1.6L counted (+₹2.5k vs the ₹1.6L stream plan) · 12 buyers',
          logic: 'Moves January demand into December cash and lands graduates in the members-only challenge.',
          kpi: 'Pre-sales; January graduation.',
          lever: 'conversion',
        },
        {
          name: 'Your 2027 Wrapped',
          tag: 'Win-back',
          months: 'Dec',
          audience: 'Lapsed clients.',
          mechanic:
            '12-class pack: ₹11.2k (15% off the ₹13.1k list price). Personal stats page (classes, favourite trainer, best month); 12-class pack at the standing 15% + a comeback class',
          economics:
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero. ₹0.9L counted (+₹10.8k vs the ₹0.8L stream plan) · 18 buyers',
          logic: 'Year-in-review pages get shared; it reminds lapsed clients of their own habit.',
          kpi: 'Stats export needed.',
          lever: 'winback',
        },
        {
          name: 'Challenge-Ready Renewal',
          tag: 'Renewal',
          months: 'Dec',
          audience: 'Members expiring Dec–Jan.',
          mechanic:
            "Renewal at your product's list price (no % off). Renew at list so the membership covers all of January; Stronger in 30 challenge kit (≈₹1,000)",
          economics:
            '4.0% effective = 0% cash + 4.0% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero. ₹3.7L counted (+₹9.1k vs the ₹3.7L stream plan) · 27 buyers',
          logic: 'Members-only challenge = a natural reason to renew before it starts.',
          kpi: 'December renewals of January expiries.',
          lever: 'annual',
        },
      ],
      months: [
        {
          month: 'Jan',
          event: 'New Year · members-only 30-day challenge',
          theme: 'Stronger in 30 2.0',
          focus:
            'Convert January trial demand; get lapsed clients and new clients onto a membership in time to join the challenge; re-up the Jan-2026 annuals (8 annuals, ₹12.5L due).',
          offers: ['Week Zero', 'Back for Stronger', 'Finish Line Renewal'],
          actions: [
            "Week Zero: Seven days unlimited. Then you're in the challenge.",
            "Back for Stronger: The challenge starts without you. Unless you're back by 7 Jan.",
            'Finish Line Renewal: Finish Stronger in 30 and your renewal gets a medal.',
          ],
          why: 'Stronger in 30 2.0 runs all January for active members. Entry is free with an active membership or pack, so every January offer doubles as a challenge entry ticket.',
        },
        {
          month: 'Feb',
          event: "Valentine's Day (Sun 14 Feb) · Galentine's (Sat 13 Feb)",
          theme: 'Better Together',
          focus:
            'Duo and referral acquisition in place of BOGO (BOGO buyers were 79–94% existing clients and renewed at 33–53%). Keep Stronger in 30 finishers attending.',
          offers: ['Swipe Right Flight', 'Come Back as a Pair', 'Partners in Crime'],
          actions: [
            'Swipe Right Flight: Three first dates, three formats, ten days.',
            'Come Back as a Pair: Return with a friend. Their first class is on us.',
            'Partners in Crime: Renew with your workout partner. You both get more time.',
          ],
          why: "Galentine's hosted class, Sat 13 Feb, with a named associate and the Encore QR at the door.",
        },
        {
          month: 'Mar',
          event: "International Women's Day (Mon 8 Mar)",
          theme: 'She Moves',
          focus: 'Purpose-led reach; Bandra reactivation; stop March trials from waiting for the anniversary.',
          offers: ['Kickstart 21: She Moves Cohort', 'Beat Your Best', 'Pre-Party Upgrade'],
          actions: [
            "Kickstart 21: She Moves Cohort: Starting Women's Day. 21 days. Stronger together.",
            "Beat Your Best: Remember March 2025? 18 classes. Let's beat it.",
            'Pre-Party Upgrade: Moving to 3 months? Freeze freely and grab your tote early.',
          ],
          why: 'Class of 2024 Reunion at Bandra (638 lapsed launch-cohort clients). Anniversary teaser from 16 Mar.',
        },
        {
          month: 'Apr',
          event: '9 years of Physique 57 India · first ₹1 Cr month',
          theme: 'Cloud Nine (9th anniversary)',
          focus:
            "The year's best, most playful offers and the first ₹1 Cr sales month (target ₹104.5L), without the 26–31% discounts of April 2026. Caps: 20% on ≤1M products, 15% on 3M+.",
          offers: ['Cloud Nine Intro', 'Nine Years, Nine Reasons', 'Lock In Before You Clock Out'],
          actions: [
            'Cloud Nine Intro: Nine days unlimited for less than one class.',
            'Nine Years, Nine Reasons: Nine things changed while you were away.',
            "Lock In Before You Clock Out: Renew in April at today's price, with bonus classes.",
          ],
          why: 'Club Nine: 9 numbered annual memberships per studio at full price. Anniversary party classes in week 2. Hard close 30 Apr, 23:59.',
        },
        {
          month: 'May',
          event: "Mother's Day (Sun 9 May)",
          theme: 'The Afterparty',
          focus:
            'Retain the April cohort (target ≥55% renewal at next expiry vs 24.5% for 2026 anniversary-code buyers at Kwality); duo acquisition.',
          offers: ['Kickstart 21: Summer Cohort', 'A Class for Mum', 'The Afterparty'],
          actions: [
            'Kickstart 21: Summer Cohort: 21 days to start summer strong.',
            'A Class for Mum: Come back, and bring your mother for free.',
            'The Afterparty: Book 8 in May; get a hosted class and a progress check.',
          ],
          why: 'Every April buyer gets the 30-day Afterparty plan: week-1 call, 8 classes in May unlocks a hosted class and a progress check.',
        },
        {
          month: 'Jun',
          event: "Summer travel · college holidays · Father's Day (Sun 20 Jun)",
          theme: 'Out of Office',
          focus: 'Stop summer lapses; fill weekday 10–12 and weekend 4–7 pm (27–41% full) with students.',
          offers: ['Golden Hours Flight', 'Out of Office, Not Out of Shape', 'The Pause Button'],
          actions: [
            'Golden Hours Flight: Students: three classes in ten days, in the hours with room.',
            "Out of Office, Not Out of Shape: Freeze when you fly. Train when you're home.",
            'The Pause Button: Three months unlimited. Freeze it as often as you like.',
          ],
          why: 'Golden Hours launch for students and under-25s.',
        },
        {
          month: 'Jul',
          event: 'Monsoon · Amazing Race warm-up',
          theme: 'Monsoon I: Rain Check',
          focus:
            'Attendance and late cancels (Kenkere 21–30%); get people on a membership before the race starts on 1 Aug.',
          offers: ['Rain Check Second Date', 'Warm-Up Lap', 'Monsoon Streak'],
          actions: [
            "Rain Check Second Date: Book your second class before you leave. Rain days don't count against you.",
            'Warm-Up Lap: Get race-fit before the gun goes on 1 August.',
            'Monsoon Streak: 12+ classes, zero late cancels, +7 days.',
          ],
          why: 'Race registrations open 15 Jul. Monsoon Streak leaderboard by studio.',
        },
        {
          month: 'Aug',
          event: 'Month-long individual race · Friendship Day (Sun 1 Aug)',
          theme: 'The Amazing Race 2.0',
          focus:
            'Attendance-led renewals and upgrades; bring new clients in on a Rookie leaderboard; second seasonal peak in Mumbai.',
          offers: ['Starting Gun Week', 'Back on Track', 'Pit Stop'],
          actions: [
            'Starting Gun Week: Seven days unlimited from the day the race starts.',
            'Back on Track: Your lane is still open.',
            'Pit Stop: Renew mid-race and keep your streak.',
          ],
          why: 'The Amazing Race 2.0: every client races on their own against a studio leaderboard, 1–31 Aug. Rookie leaderboard for first-timers.',
        },
        {
          month: 'Sep',
          event: '57 days to Diwali (2 Sep → 28 Oct)',
          theme: 'Monsoon III: The Comeback',
          focus: 'Reactivate before the festive season; carry race momentum into a festive countdown.',
          offers: ['57-Day Proof', 'The Return Policy', 'Challenge Captain'],
          actions: [
            '57-Day Proof: Measure on day 1. Re-test before Diwali.',
            'The Return Policy: Come back within 7 days of your comeback class and get a bonus.',
            'Challenge Captain: Bring two friends into the countdown, get two weeks.',
          ],
          why: '57 Days to Diwali countdown starts 2 Sep; Bandra reunion repeat.',
        },
        {
          month: 'Oct',
          event: 'Diwali (Fri 29 Oct) · Dasara week in Bengaluru',
          theme: 'Festival of Lights',
          focus: "Gift-led revenue; protect Kenkere's Dasara trough; catch Kwality's late-October surge without codes.",
          offers: ['Gift a Flight', 'Light Up Your Streak', 'Festive Pause Pass'],
          actions: [
            'Gift a Flight: Give someone three classes and a reason to stay.',
            'Light Up Your Streak: 15 classes in 30 days lights up 3 extra days.',
            'Festive Pause Pass: Renew now; pause for the holidays.',
          ],
          why: 'Gift cards on sale from 1 Oct; candle-lit evening classes in Diwali week; limited-run format #3.',
        },
        {
          month: 'Nov',
          event: 'Black Friday (Fri 26 Nov) → Cyber Monday (29 Nov)',
          theme: 'Black Friday, Strong Monday',
          focus: 'Long commitments in the softest Mumbai month.',
          offers: ['Black Friday Week Zero', 'Black Friday Comeback', 'Strong Monday Ladder'],
          actions: [
            'Black Friday Week Zero: Seven days unlimited, fully credited.',
            'Black Friday Comeback: Back for a month, plus three days.',
            'Strong Monday Ladder: Renew long in the Black Friday window.',
          ],
          why: 'Club Nine last seats (only those unsold in April).',
        },
        {
          month: 'Dec',
          event: 'Year-end · pre-sell January',
          theme: 'Wrapped',
          focus: 'Pre-sell January and Stronger in 30 (2028) entries; renew on personal usage data.',
          offers: ['Kickstart 21: Pre-Solution Cohort', 'Your 2027 Wrapped', 'Challenge-Ready Renewal'],
          actions: [
            'Kickstart 21: Pre-Solution Cohort: Buy in December. Start Mon 3 Jan. Arrive in Stronger in 30.',
            "Your 2027 Wrapped: You took 87 classes with us. Here's to the next year.",
            "Challenge-Ready Renewal: Renew in December so you're covered for all of Stronger in 30.",
          ],
          why: '"Your 2027 Wrapped": a personal year-in-review for every client, ending in a usage-based renewal recommendation.',
        },
      ],
      rhythm: [
        [
          'Newcomer journey',
          "Offers: Week Zero, Swipe Right Flight, Kickstart 21: She Moves Cohort, Cloud Nine Intro, Kickstart 21: Summer Cohort, Golden Hours Flight, Rain Check Second Date, Starting Gun Week, 57-Day Proof, Gift a Flight, Black Friday Week Zero, Kickstart 21: Pre-Solution Cohort. Watch each offer's “What to watch” measures and rate of sale monthly.",
        ],
        [
          'Lapsed journey',
          "Offers: Back for Stronger, Come Back as a Pair, Beat Your Best, Nine Years, Nine Reasons, A Class for Mum, Out of Office, Not Out of Shape, Warm-Up Lap, Back on Track, The Return Policy, Light Up Your Streak, Black Friday Comeback, Your 2027 Wrapped. Watch each offer's “What to watch” measures and rate of sale monthly.",
        ],
        [
          'Renewal journey',
          "Offers: Finish Line Renewal, Partners in Crime, Pre-Party Upgrade, Lock In Before You Clock Out, The Afterparty, The Pause Button, Monsoon Streak, Pit Stop, Challenge Captain, Festive Pause Pass, Strong Monday Ladder, Challenge-Ready Renewal. Watch each offer's “What to watch” measures and rate of sale monthly.",
        ],
      ],
      scorecard: [
        ['Leads → trials', '3,035', '607', 'Newcomer journeys'],
        ['Trials → new buyers', '607', '154', 'Newcomer journeys'],
        ['Renewals due → purchases', '662', '573', 'Renewal journeys'],
        ['Lapsed touches → reactivated', '3,207', '257', 'Lapsed journeys'],
        ['Target → projected', '₹135.0L', '₹142.8L', 'Final approved plan'],
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
        ['Website & online', 1905, 12.4, 7.0],
        ['Hosted & walk-in', 524, 69.5, 4.8],
        ['Referrals', 455, 78.9, 29.0],
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
        'Final approved 2027 plan: ₹19.4L target, ₹19.6L projected across twelve themed months, each run as three journeys — newcomer, lapsed and renewal.',
      snapshot: [
        ['TTM revenue', '₹15.4L', 'first full year', true],
        ['2026 forecast', '₹15.4L', 'Jan–Sep actual + Q4 at 2026 run-rate', true],
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
          stat: '22%',
          detail: 'Renewal plan ₹4.2L of ₹19.4L; 70 renewal purchases planned from 786 due.',
          implication: "Renewal offers: Credit Where It's Due, Pack + Passport.",
        },
        {
          title: 'New clients',
          stat: '24',
          detail: 'New-client plan ₹2.0L: 1,385 leads → 295 trials → 24 new buyers.',
          implication: 'Newcomer offers: First Drop-in Counts, Saturday Squad, Studio Passport.',
        },
        {
          title: 'Lapsed clients',
          stat: '317',
          detail: 'Reactivation plan ₹1.2L: 317 reactivated from 2,221 touches.',
          implication: 'Lapsed offers: Missed You at the Pop-up, Neighbourhood Reunion, Move to Kenkere.',
        },
        {
          title: 'Peak month: Sep',
          stat: '₹2.5L',
          detail: 'Monsoon III: The Comeback · 57 days to Diwali (2 Sep → 28 Oct).',
          implication: 'Reactivate before the festive season; carry race momentum into a festive countdown.',
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
            why: 'Final plan: carried by the newcomer offers — First Drop-in Counts, Saturday Squad, Studio Passport.',
          },
          {
            id: 'leads',
            name: 'Online-lead speed to trial',
            value: 107546,
            math: '997 online leads × trial rate 11.5% → 20.2% × 85% trial→member = +73 members × ₹2,000 × 0.73',
            why: 'Final plan: carried by the newcomer offers — First Drop-in Counts, Saturday Squad, Studio Passport.',
          },
          {
            id: 'referral',
            name: 'Paid-on-conversion referral engine',
            value: 39542,
            math: '71 referral leads × +50% volume × 76.1% lead→member = +27 members × ₹2,000 × 0.73',
            why: 'Final plan: carried by the newcomer offers — First Drop-in Counts, Saturday Squad, Studio Passport.',
          },
          {
            id: 'winback',
            name: 'Drop-in reactivation',
            value: 144000,
            math: '300 dormant drop-in clients × 12% return × ₹4,000 (≈ one 4-class pack)',
            why: 'Final plan: carried by the lapsed offers — Missed You at the Pop-up, Neighbourhood Reunion, Move to Kenkere.',
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
          name: 'First Drop-in Counts',
          tag: 'Acquisition',
          months: 'Jan, Apr, Jul, Oct',
          audience: 'First-time pop-up clients.',
          mechanic:
            '8-class pack: ₹6.9k (list price). First drop-in fee credited toward a C+C 8-class pack bought within 7 days',
          economics:
            '13.6% effective = 0% cash + 13.6% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero. ₹0.2L counted (+₹0.9k vs the ₹0.2L stream plan) · 2 buyers',
          logic: 'Only 2.9% of first visits buy a pack, yet 63% buy something.',
          kpi: 'Pack conversion of first visits.',
          lever: 'conversion',
        },
        {
          name: 'Missed You at the Pop-up',
          tag: 'Win-back',
          months: 'Jan, Apr, Jul, Oct',
          audience: 'Lapsed pop-up clients.',
          mechanic:
            '8-class pack: ₹5.9k (15% off the ₹6.9k list price). 8-class pack at the standing 15% + a free return class',
          economics:
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero. ₹0.2L counted (+₹1.3k vs the ₹0.2L stream plan) · 13 buyers',
          logic: 'Most pop-up reactivations are single credits.',
          kpi: 'Pack share.',
          lever: 'winback',
        },
        {
          name: "Credit Where It's Due",
          tag: 'Renewal',
          months: 'Jan, Feb, Apr, May, Jul, Aug, Oct, Nov',
          audience: 'Clients with 3+ drop-ins in 60 days.',
          mechanic: '10-class pack: ₹8.5k (list price). Last 2 drop-ins credited toward a C+C 10-class pack',
          economics:
            '22.2% effective = 0% cash + 22.2% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero. ₹0.2L counted (−₹1.3k vs the ₹0.2L stream plan) · 2 buyers',
          logic: '186 regulars spent ~₹4,000 each on drop-ins, already half a pack.',
          kpi: 'Effective ≈22%.',
          lever: null,
        },
        {
          name: 'Saturday Squad',
          tag: 'Acquisition',
          months: 'Feb, May, Aug, Nov',
          audience: 'First-timers on Saturdays.',
          mechanic:
            '4-class pack: ₹4k (15% off the ₹4.7k list price). Bring a friend free; Both buy a 4-class pack at the standing 15%',
          economics:
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero. ₹0.1L counted (+₹0.2k vs the ₹0.1L stream plan) · 1 buyers',
          logic: 'Saturday fill is 43% vs 13–20% on weekdays.',
          kpi: 'Saturday attendance.',
          lever: 'conversion',
        },
        {
          name: 'Neighbourhood Reunion',
          tag: 'Win-back',
          months: 'Feb, May, Aug, Nov',
          audience: 'Lapsed pop-up clients.',
          mechanic:
            '4-class pack: ₹4k (15% off the ₹4.7k list price). Monthly reunion class; At the door: 4-class pack at the standing 15%',
          economics:
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero. ₹0.1L counted (+₹1.1k vs the ₹0.1L stream plan) · 8 buyers',
          logic: 'Saturday is the only day with real fill.',
          kpi: 'Door conversion.',
          lever: 'winback',
        },
        {
          name: 'Studio Passport',
          tag: 'Acquisition',
          months: 'Mar, Jun, Sep, Dec',
          audience: 'Pop-up clients.',
          mechanic:
            '10-class pack: ₹7.7k (10% off the ₹8.5k list price). 3 classes across Copper + Cloves / Plash → 1 free Kenkere class; 10-class pack at 10% off',
          economics:
            '10.0% effective = 10% cash. Guest passes, consults, freezes and early booking are valued at zero. ₹0.1L counted (+₹0.1k vs the ₹0.1L stream plan) · 1 buyers',
          logic: '8.8% of Kenkere leads are lost on proximity; the pop-ups are the bridge.',
          kpi: 'Passport → Kenkere conversions.',
          lever: 'conversion',
        },
        {
          name: 'Move to Kenkere',
          tag: 'Win-back',
          months: 'Mar, Jun, Sep, Dec',
          audience: 'Lapsed pop-up clients living near Kenkere.',
          mechanic: '8-class pack: ₹5.9k (15% off the ₹6.9k list price). Kenkere 8-class pack at the standing 15%',
          economics:
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero. ₹0.1L counted (+₹0.5k vs the ₹0.1L stream plan) · 8 buyers',
          logic: 'Proximity-matched routing in both directions.',
          kpi: 'Kenkere conversions.',
          lever: 'winback',
        },
        {
          name: 'Pack + Passport',
          tag: 'Renewal',
          months: 'Mar, Jun, Sep, Dec',
          audience: 'Pop-up regulars.',
          mechanic: '10-class pack: ₹8.5k (list price). 10-class pack at list + 1 Kenkere class',
          economics:
            '16.7% effective = 0% cash + 16.7% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero. ₹0.4L counted (+₹0.4k vs the ₹0.4L stream plan) · 5 buyers',
          logic: 'Introduces regulars to the flagship.',
          kpi: 'Kenkere visits.',
          lever: null,
        },
      ],
      months: [
        {
          month: 'Jan',
          event: 'New Year · members-only 30-day challenge',
          theme: 'Stronger in 30 2.0',
          focus:
            'Convert January trial demand; get lapsed clients and new clients onto a membership in time to join the challenge; re-up the Jan-2026 annuals (8 annuals, ₹12.5L due).',
          offers: ['First Drop-in Counts', 'Missed You at the Pop-up', "Credit Where It's Due"],
          actions: [
            'First Drop-in Counts: Your first class fee comes off your first pack.',
            'Missed You at the Pop-up: Your neighbourhood class is waiting.',
            "Credit Where It's Due: Your last two drop-ins count toward a 10-pack.",
          ],
          why: 'Stronger in 30 2.0 runs all January for active members. Entry is free with an active membership or pack, so every January offer doubles as a challenge entry ticket.',
        },
        {
          month: 'Feb',
          event: "Valentine's Day (Sun 14 Feb) · Galentine's (Sat 13 Feb)",
          theme: 'Better Together',
          focus:
            'Duo and referral acquisition in place of BOGO (BOGO buyers were 79–94% existing clients and renewed at 33–53%). Keep Stronger in 30 finishers attending.',
          offers: ['Saturday Squad', 'Neighbourhood Reunion', "Credit Where It's Due"],
          actions: [
            'Saturday Squad: Saturdays: bring a friend free.',
            'Neighbourhood Reunion: One Saturday a month, all the regulars.',
            "Credit Where It's Due: Your last two drop-ins count toward a 10-pack.",
          ],
          why: "Galentine's hosted class, Sat 13 Feb, with a named associate and the Encore QR at the door.",
        },
        {
          month: 'Mar',
          event: "International Women's Day (Mon 8 Mar)",
          theme: 'She Moves',
          focus: 'Purpose-led reach; Bandra reactivation; stop March trials from waiting for the anniversary.',
          offers: ['Studio Passport', 'Move to Kenkere', 'Pack + Passport'],
          actions: [
            'Studio Passport: 3 stamps at the pop-ups, a free class at Kenkere.',
            'Move to Kenkere: Closer to Kenkere House? Come to the flagship.',
            'Pack + Passport: 10 classes here, 1 at Kenkere.',
          ],
          why: 'Class of 2024 Reunion at Bandra (638 lapsed launch-cohort clients). Anniversary teaser from 16 Mar.',
        },
        {
          month: 'Apr',
          event: '9 years of Physique 57 India · first ₹1 Cr month',
          theme: 'Cloud Nine (9th anniversary)',
          focus:
            "The year's best, most playful offers and the first ₹1 Cr sales month (target ₹104.5L), without the 26–31% discounts of April 2026. Caps: 20% on ≤1M products, 15% on 3M+.",
          offers: ['First Drop-in Counts', 'Missed You at the Pop-up', "Credit Where It's Due"],
          actions: [
            'First Drop-in Counts: Your first class fee comes off your first pack.',
            'Missed You at the Pop-up: Your neighbourhood class is waiting.',
            "Credit Where It's Due: Your last two drop-ins count toward a 10-pack.",
          ],
          why: 'Club Nine: 9 numbered annual memberships per studio at full price. Anniversary party classes in week 2. Hard close 30 Apr, 23:59.',
        },
        {
          month: 'May',
          event: "Mother's Day (Sun 9 May)",
          theme: 'The Afterparty',
          focus:
            'Retain the April cohort (target ≥55% renewal at next expiry vs 24.5% for 2026 anniversary-code buyers at Kwality); duo acquisition.',
          offers: ['Saturday Squad', 'Neighbourhood Reunion', "Credit Where It's Due"],
          actions: [
            'Saturday Squad: Saturdays: bring a friend free.',
            'Neighbourhood Reunion: One Saturday a month, all the regulars.',
            "Credit Where It's Due: Your last two drop-ins count toward a 10-pack.",
          ],
          why: 'Every April buyer gets the 30-day Afterparty plan: week-1 call, 8 classes in May unlocks a hosted class and a progress check.',
        },
        {
          month: 'Jun',
          event: "Summer travel · college holidays · Father's Day (Sun 20 Jun)",
          theme: 'Out of Office',
          focus: 'Stop summer lapses; fill weekday 10–12 and weekend 4–7 pm (27–41% full) with students.',
          offers: ['Studio Passport', 'Move to Kenkere', 'Pack + Passport'],
          actions: [
            'Studio Passport: 3 stamps at the pop-ups, a free class at Kenkere.',
            'Move to Kenkere: Closer to Kenkere House? Come to the flagship.',
            'Pack + Passport: 10 classes here, 1 at Kenkere.',
          ],
          why: 'Golden Hours launch for students and under-25s.',
        },
        {
          month: 'Jul',
          event: 'Monsoon · Amazing Race warm-up',
          theme: 'Monsoon I: Rain Check',
          focus:
            'Attendance and late cancels (Kenkere 21–30%); get people on a membership before the race starts on 1 Aug.',
          offers: ['First Drop-in Counts', 'Missed You at the Pop-up', "Credit Where It's Due"],
          actions: [
            'First Drop-in Counts: Your first class fee comes off your first pack.',
            'Missed You at the Pop-up: Your neighbourhood class is waiting.',
            "Credit Where It's Due: Your last two drop-ins count toward a 10-pack.",
          ],
          why: 'Race registrations open 15 Jul. Monsoon Streak leaderboard by studio.',
        },
        {
          month: 'Aug',
          event: 'Month-long individual race · Friendship Day (Sun 1 Aug)',
          theme: 'The Amazing Race 2.0',
          focus:
            'Attendance-led renewals and upgrades; bring new clients in on a Rookie leaderboard; second seasonal peak in Mumbai.',
          offers: ['Saturday Squad', 'Neighbourhood Reunion', "Credit Where It's Due"],
          actions: [
            'Saturday Squad: Saturdays: bring a friend free.',
            'Neighbourhood Reunion: One Saturday a month, all the regulars.',
            "Credit Where It's Due: Your last two drop-ins count toward a 10-pack.",
          ],
          why: 'The Amazing Race 2.0: every client races on their own against a studio leaderboard, 1–31 Aug. Rookie leaderboard for first-timers.',
        },
        {
          month: 'Sep',
          event: '57 days to Diwali (2 Sep → 28 Oct)',
          theme: 'Monsoon III: The Comeback',
          focus: 'Reactivate before the festive season; carry race momentum into a festive countdown.',
          offers: ['Studio Passport', 'Move to Kenkere', 'Pack + Passport'],
          actions: [
            'Studio Passport: 3 stamps at the pop-ups, a free class at Kenkere.',
            'Move to Kenkere: Closer to Kenkere House? Come to the flagship.',
            'Pack + Passport: 10 classes here, 1 at Kenkere.',
          ],
          why: '57 Days to Diwali countdown starts 2 Sep; Bandra reunion repeat.',
        },
        {
          month: 'Oct',
          event: 'Diwali (Fri 29 Oct) · Dasara week in Bengaluru',
          theme: 'Festival of Lights',
          focus: "Gift-led revenue; protect Kenkere's Dasara trough; catch Kwality's late-October surge without codes.",
          offers: ['First Drop-in Counts', 'Missed You at the Pop-up', "Credit Where It's Due"],
          actions: [
            'First Drop-in Counts: Your first class fee comes off your first pack.',
            'Missed You at the Pop-up: Your neighbourhood class is waiting.',
            "Credit Where It's Due: Your last two drop-ins count toward a 10-pack.",
          ],
          why: 'Gift cards on sale from 1 Oct; candle-lit evening classes in Diwali week; limited-run format #3.',
        },
        {
          month: 'Nov',
          event: 'Black Friday (Fri 26 Nov) → Cyber Monday (29 Nov)',
          theme: 'Black Friday, Strong Monday',
          focus: 'Long commitments in the softest Mumbai month.',
          offers: ['Saturday Squad', 'Neighbourhood Reunion', "Credit Where It's Due"],
          actions: [
            'Saturday Squad: Saturdays: bring a friend free.',
            'Neighbourhood Reunion: One Saturday a month, all the regulars.',
            "Credit Where It's Due: Your last two drop-ins count toward a 10-pack.",
          ],
          why: 'Club Nine last seats (only those unsold in April).',
        },
        {
          month: 'Dec',
          event: 'Year-end · pre-sell January',
          theme: 'Wrapped',
          focus: 'Pre-sell January and Stronger in 30 (2028) entries; renew on personal usage data.',
          offers: ['Studio Passport', 'Move to Kenkere', 'Pack + Passport'],
          actions: [
            'Studio Passport: 3 stamps at the pop-ups, a free class at Kenkere.',
            'Move to Kenkere: Closer to Kenkere House? Come to the flagship.',
            'Pack + Passport: 10 classes here, 1 at Kenkere.',
          ],
          why: '"Your 2027 Wrapped": a personal year-in-review for every client, ending in a usage-based renewal recommendation.',
        },
      ],
      rhythm: [
        [
          'Newcomer journey',
          "Offers: First Drop-in Counts, Saturday Squad, Studio Passport. Watch each offer's “What to watch” measures and rate of sale monthly.",
        ],
        [
          'Lapsed journey',
          "Offers: Missed You at the Pop-up, Neighbourhood Reunion, Move to Kenkere. Watch each offer's “What to watch” measures and rate of sale monthly.",
        ],
        [
          'Renewal journey',
          "Offers: Credit Where It's Due, Pack + Passport. Watch each offer's “What to watch” measures and rate of sale monthly.",
        ],
      ],
      scorecard: [
        ['Leads → trials', '1,385', '295', 'Newcomer journeys'],
        ['Trials → new buyers', '295', '24', 'Newcomer journeys'],
        ['Renewals due → purchases', '786', '70', 'Renewal journeys'],
        ['Lapsed touches → reactivated', '2,221', '317', 'Lapsed journeys'],
        ['Target → projected', '₹19.4L', '₹19.6L', 'Final approved plan'],
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
        ['Calls & WhatsApp', 238, 71.0, 62.6],
        ['Referrals', 71, 90.1, 76.1],
        ['Hosted & walk-in', 57, 73.7, 1.8],
        ['Social & influencer', 43, 79.1, 14.0],
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
