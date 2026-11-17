// 2027 location sales playbooks — generated from the uploaded P57 exports (Sales, Leads, New clients,
// Lapsed/renewals, Sessions, Check-ins, Memberships). All money is ₹ incl. GST. Do not hand-edit numbers.
// Offers, month themes and month actions are not stored here: the playbook page reads them from the
// month plans in the database.
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
          implication: '',
        },
        {
          title: 'New clients',
          stat: '236',
          detail: 'New-client plan ₹58.2L: 1,425 leads → 1,096 trials → 236 new buyers.',
          implication: '',
        },
        {
          title: 'Lapsed clients',
          stat: '580',
          detail: 'Reactivation plan ₹47.9L: 580 reactivated from 7,258 touches.',
          implication: '',
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
            why: '',
          },
          {
            id: 'leads',
            name: 'Online-lead speed to trial',
            value: 239069,
            math: '774 online leads × trial rate 25.1% → 28.1% × 45% trial→member = +10 members × ₹31,356 × 0.73',
            why: '',
          },
          {
            id: 'referral',
            name: 'Paid-on-conversion referral engine',
            value: 1044613,
            math: '224 referral leads × +50% volume × 40.6% lead→member = +46 members × ₹31,356 × 0.73',
            why: '',
          },
          {
            id: 'winback',
            name: 'Tiered win-back of dormant clients',
            value: 1872533,
            math: '370 loyal dormant (3+ purchases) × +10pts return + 476 light dormant × +5pts = +61 returners × ₹47,866 avg return spend (×0.8 / ×0.4)',
            why: '',
          },
          {
            id: 'discount',
            name: 'Swap % discounts for value-adds',
            value: 2186651,
            math: 'Price: ₹383L gross × (17.6% → 9.1% effective discount) × 50% kept = ₹16.3L. Renewal: 457 discounted membership/pack sales × 60% moved to value-add × half the 19-pt repurchase gap × ₹21,581 = ₹5.6L',
            why: '',
          },
          {
            id: 'usage',
            name: 'First-30-day habit programme',
            value: 85959,
            math: '58 unlimited memberships ended at ≤4 visits/month × 30% moved to 5–8 visits × +20pt renewal = +4 renewals × ₹16,164 × 1.5 cycles',
            why: '',
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
            why: '',
          },
        ],
        leverTotal: 8134436.67,
        haircut: 0.15,
        projection: 43125370.15,
        appTargetAtBuild: 42000000,
      },
      offers: [],
      months: [
        {
          month: 'Jan',
        },
        {
          month: 'Feb',
        },
        {
          month: 'Mar',
        },
        {
          month: 'Apr',
        },
        {
          month: 'May',
        },
        {
          month: 'Jun',
        },
        {
          month: 'Jul',
        },
        {
          month: 'Aug',
        },
        {
          month: 'Sep',
        },
        {
          month: 'Oct',
        },
        {
          month: 'Nov',
        },
        {
          month: 'Dec',
        },
      ],
      rhythm: [
        [
          'Newcomer journey',
          "Work the offers this month's plan picked; watch each one's success measures and rate of sale monthly.",
        ],
        [
          'Lapsed journey',
          "Work the offers this month's plan picked; watch each one's success measures and rate of sale monthly.",
        ],
        [
          'Renewal journey',
          "Work the offers this month's plan picked; watch each one's success measures and rate of sale monthly.",
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
          implication: '',
        },
        {
          title: 'New clients',
          stat: '217',
          detail: 'New-client plan ₹37.0L: 2,125 leads → 1,213 trials → 217 new buyers.',
          implication: '',
        },
        {
          title: 'Lapsed clients',
          stat: '369',
          detail: 'Reactivation plan ₹23.3L: 369 reactivated from 4,612 touches.',
          implication: '',
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
            why: '',
          },
          {
            id: 'leads',
            name: 'Online-lead speed to trial',
            value: 168333,
            math: '1,145 online leads × trial rate 28.8% → 31.8% × 28% trial→member = +10 members × ₹24,008 × 0.73',
            why: '',
          },
          {
            id: 'referral',
            name: 'Paid-on-conversion referral engine',
            value: 588862,
            math: '299 referral leads × +50% volume × 22.4% lead→member = +33 members × ₹24,008 × 0.73',
            why: '',
          },
          {
            id: 'winback',
            name: 'Tiered win-back of dormant clients',
            value: 932979,
            math: '234 loyal dormant (3+ purchases) × +10pts return + 446 light dormant × +5pts = +46 returners × ₹33,755 avg return spend (×0.8 / ×0.4)',
            why: '',
          },
          {
            id: 'discount',
            name: 'Swap % discounts for value-adds',
            value: 729228,
            math: 'Price: ₹220L gross × (12.7% → 9.3% effective discount) × 50% kept = ₹3.7L. Renewal: 446 discounted membership/pack sales × 60% moved to value-add × half the 14-pt repurchase gap × ₹19,617 = ₹3.6L',
            why: '',
          },
          {
            id: 'usage',
            name: 'First-30-day habit programme',
            value: 64195,
            math: '43 unlimited memberships ended at ≤4 visits/month × 30% moved to 5–8 visits × +20pt renewal = +3 renewals × ₹16,283 × 1.5 cycles',
            why: '',
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
            why: '',
          },
        ],
        leverTotal: 4671226.32,
        haircut: 0.15,
        projection: 23560223.23,
        appTargetAtBuild: 22820000,
      },
      offers: [],
      months: [
        {
          month: 'Jan',
        },
        {
          month: 'Feb',
        },
        {
          month: 'Mar',
        },
        {
          month: 'Apr',
        },
        {
          month: 'May',
        },
        {
          month: 'Jun',
        },
        {
          month: 'Jul',
        },
        {
          month: 'Aug',
        },
        {
          month: 'Sep',
        },
        {
          month: 'Oct',
        },
        {
          month: 'Nov',
        },
        {
          month: 'Dec',
        },
      ],
      rhythm: [
        [
          'Newcomer journey',
          "Work the offers this month's plan picked; watch each one's success measures and rate of sale monthly.",
        ],
        [
          'Lapsed journey',
          "Work the offers this month's plan picked; watch each one's success measures and rate of sale monthly.",
        ],
        [
          'Renewal journey',
          "Work the offers this month's plan picked; watch each one's success measures and rate of sale monthly.",
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
          implication: '',
        },
        {
          title: 'New clients',
          stat: '154',
          detail: 'New-client plan ₹23.3L: 3,035 leads → 607 trials → 154 new buyers.',
          implication: '',
        },
        {
          title: 'Lapsed clients',
          stat: '257',
          detail: 'Reactivation plan ₹12.4L: 257 reactivated from 3,207 touches.',
          implication: '',
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
            why: '',
          },
          {
            id: 'leads',
            name: 'Online-lead speed to trial',
            value: 1039195,
            math: '1,905 online leads × trial rate 12.4% → 20.6% × 57% trial→member = +88 members × ₹16,090 × 0.73',
            why: '',
          },
          {
            id: 'referral',
            name: 'Paid-on-conversion referral engine',
            value: 777508,
            math: '455 referral leads × +50% volume × 29.0% lead→member = +66 members × ₹16,090 × 0.73',
            why: '',
          },
          {
            id: 'winback',
            name: 'Tiered win-back of dormant clients',
            value: 390162,
            math: '177 loyal dormant (3+ purchases) × +10pts return + 350 light dormant × +5pts = +35 returners × ₹18,439 avg return spend (×0.8 / ×0.4)',
            why: '',
          },
          {
            id: 'usage',
            name: 'First-30-day habit programme',
            value: 32599,
            math: '27 unlimited memberships ended at ≤4 visits/month × 30% moved to 5–8 visits × +20pt renewal = +2 renewals × ₹13,169 × 1.5 cycles',
            why: '',
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
            why: '',
          },
        ],
        leverTotal: 2962789.18,
        haircut: 0.15,
        projection: 14776329.71,
        appTargetAtBuild: 12590000,
      },
      offers: [],
      months: [
        {
          month: 'Jan',
        },
        {
          month: 'Feb',
        },
        {
          month: 'Mar',
        },
        {
          month: 'Apr',
        },
        {
          month: 'May',
        },
        {
          month: 'Jun',
        },
        {
          month: 'Jul',
        },
        {
          month: 'Aug',
        },
        {
          month: 'Sep',
        },
        {
          month: 'Oct',
        },
        {
          month: 'Nov',
        },
        {
          month: 'Dec',
        },
      ],
      rhythm: [
        [
          'Newcomer journey',
          "Work the offers this month's plan picked; watch each one's success measures and rate of sale monthly.",
        ],
        [
          'Lapsed journey',
          "Work the offers this month's plan picked; watch each one's success measures and rate of sale monthly.",
        ],
        [
          'Renewal journey',
          "Work the offers this month's plan picked; watch each one's success measures and rate of sale monthly.",
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
          implication: '',
        },
        {
          title: 'New clients',
          stat: '24',
          detail: 'New-client plan ₹2.0L: 1,385 leads → 295 trials → 24 new buyers.',
          implication: '',
        },
        {
          title: 'Lapsed clients',
          stat: '317',
          detail: 'Reactivation plan ₹1.2L: 317 reactivated from 2,221 touches.',
          implication: '',
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
            why: '',
          },
          {
            id: 'leads',
            name: 'Online-lead speed to trial',
            value: 107546,
            math: '997 online leads × trial rate 11.5% → 20.2% × 85% trial→member = +73 members × ₹2,000 × 0.73',
            why: '',
          },
          {
            id: 'referral',
            name: 'Paid-on-conversion referral engine',
            value: 39542,
            math: '71 referral leads × +50% volume × 76.1% lead→member = +27 members × ₹2,000 × 0.73',
            why: '',
          },
          {
            id: 'winback',
            name: 'Drop-in reactivation',
            value: 144000,
            math: '300 dormant drop-in clients × 12% return × ₹4,000 (≈ one 4-class pack)',
            why: '',
          },
          {
            id: 'packs',
            name: 'Credit-to-pack upgrades',
            value: 182400,
            math: '76 clients bought 3+ single credits × 30% upgrade to an 8/10-pack × 2 cycles × ~₹4,000 net uplift',
            why: '',
          },
        ],
        leverTotal: 508728.37,
        haircut: 0.15,
        projection: 1973303.96,
        appTargetAtBuild: 2310000,
      },
      offers: [],
      months: [
        {
          month: 'Jan',
        },
        {
          month: 'Feb',
        },
        {
          month: 'Mar',
        },
        {
          month: 'Apr',
        },
        {
          month: 'May',
        },
        {
          month: 'Jun',
        },
        {
          month: 'Jul',
        },
        {
          month: 'Aug',
        },
        {
          month: 'Sep',
        },
        {
          month: 'Oct',
        },
        {
          month: 'Nov',
        },
        {
          month: 'Dec',
        },
      ],
      rhythm: [
        [
          'Newcomer journey',
          "Work the offers this month's plan picked; watch each one's success measures and rate of sale monthly.",
        ],
        [
          'Lapsed journey',
          "Work the offers this month's plan picked; watch each one's success measures and rate of sale monthly.",
        ],
        [
          'Renewal journey',
          "Work the offers this month's plan picked; watch each one's success measures and rate of sale monthly.",
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
