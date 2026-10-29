export type PlaybookMonth = {
  revenueL: number;
  objective: string;
  offer: string;
  leads: number;
  trials: number;
  buyers: number;
  renewalPurchases: number;
  reactivated: number;
  lapsedTouches: number;
  renewalsDue?: number;
  vs2026?: number;
};
export type StudioPlaybook = {
  sourceName: string;
  annualL: number;
  ttmGrowth: string;
  insight: string;
  priority: string;
  months: PlaybookMonth[];
  streamsL?: { new: number; renewal: number; reactivation: number };
  conservativeL?: number;
  stretchL?: number;
  attendance?: number;
  actions?: Array<[string, string]>;
};

// Mumbai studio playbooks. Numbers are a separate Base scenario (₹ lakh, incl. GST) and never
// overwrite app targets; objectives, lead offers and summaries are from the final approved 2027 plan.
export const PLAYBOOKS_2027: Record<string, StudioPlaybook> = {
  'Kemps Corner': {
    sourceName: 'Kwality House (Kemps Corner)',
    annualL: 398.1,
    ttmGrowth: '+21%',
    insight:
      'Final plan: ₹398.0L target, ₹422.2L projected — new clients ₹58.2L, renewals ₹241.6L, reactivation ₹47.9L.',
    priority:
      '1,425 leads → 1,096 trials → 236 new buyers; 968 renewal purchases of 1,420 due; 580 reactivated from 7,258 touches.',
    months: [
      {
        revenueL: 31.2,
        objective:
          'Convert January trial demand; get lapsed clients and new clients onto a membership in time to join the challenge; re-up the Jan-2026 annuals (8 annuals, ₹12.5L due).',
        offer: 'Week Zero',
        leads: 77,
        trials: 59,
        buyers: 14,
        renewalPurchases: 79,
        reactivated: 42,
        lapsedTouches: 523,
        renewalsDue: 120,
        vs2026: 14,
      },
      {
        revenueL: 24.3,
        objective:
          'Duo and referral acquisition in place of BOGO (BOGO buyers were 79–94% existing clients and renewed at 33–53%). Keep Stronger in 30 finishers attending.',
        offer: 'The Second Date for Two',
        leads: 102,
        trials: 78,
        buyers: 17,
        renewalPurchases: 85,
        reactivated: 36,
        lapsedTouches: 456,
        renewalsDue: 83,
        vs2026: 26,
      },
      {
        revenueL: 24.3,
        objective: 'Purpose-led reach; Bandra reactivation; stop March trials from waiting for the anniversary.',
        offer: 'The Second Date',
        leads: 96,
        trials: 74,
        buyers: 16,
        renewalPurchases: 61,
        reactivated: 45,
        lapsedTouches: 561,
        renewalsDue: 100,
        vs2026: 20,
      },
      {
        revenueL: 57.6,
        objective:
          "The year's best, most playful offers and the first ₹1 Cr sales month (target ₹104.5L), without the 26–31% discounts of April 2026. Caps: 20% on ≤1M products, 15% on 3M+.",
        offer: 'Cloud Nine Intro',
        leads: 113,
        trials: 88,
        buyers: 18,
        renewalPurchases: 130,
        reactivated: 76,
        lapsedTouches: 951,
        renewalsDue: 120,
        vs2026: 15,
      },
      {
        revenueL: 27.3,
        objective:
          'Retain the April cohort (target ≥55% renewal at next expiry vs 24.5% for 2026 anniversary-code buyers at Kwality); duo acquisition.',
        offer: 'Mother Shaker Second Date',
        leads: 133,
        trials: 103,
        buyers: 22,
        renewalPurchases: 65,
        reactivated: 51,
        lapsedTouches: 644,
        renewalsDue: 108,
        vs2026: 13,
      },
      {
        revenueL: 27.2,
        objective: 'Stop summer lapses; fill weekday 10–12 and weekend 4–7 pm (27–41% full) with students.',
        offer: 'Week Zero: Home for the Summer',
        leads: 151,
        trials: 116,
        buyers: 24,
        renewalPurchases: 76,
        reactivated: 49,
        lapsedTouches: 607,
        renewalsDue: 133,
        vs2026: 25,
      },
      {
        revenueL: 31.8,
        objective:
          'Attendance and late cancels (Kenkere 21–30%); get people on a membership before the race starts on 1 Aug.',
        offer: 'Kickstart 21: Race Ready Cohort',
        leads: 130,
        trials: 100,
        buyers: 21,
        renewalPurchases: 79,
        reactivated: 51,
        lapsedTouches: 638,
        renewalsDue: 129,
        vs2026: 23,
      },
      {
        revenueL: 36.0,
        objective:
          'Attendance-led renewals and upgrades; bring new clients in on a Rookie leaderboard; second seasonal peak in Mumbai.',
        offer: 'Starting Gun Week',
        leads: 141,
        trials: 109,
        buyers: 24,
        renewalPurchases: 91,
        reactivated: 44,
        lapsedTouches: 554,
        renewalsDue: 143,
        vs2026: 20,
      },
      {
        revenueL: 37.4,
        objective: 'Reactivate before the festive season; carry race momentum into a festive countdown.',
        offer: '57-Day Proof',
        leads: 124,
        trials: 96,
        buyers: 21,
        renewalPurchases: 76,
        reactivated: 47,
        lapsedTouches: 593,
        renewalsDue: 169,
        vs2026: 17,
      },
      {
        revenueL: 47.6,
        objective:
          "Gift-led revenue; protect Kenkere's Dasara trough; catch Kwality's late-October surge without codes.",
        offer: 'Gift a Flight',
        leads: 141,
        trials: 109,
        buyers: 24,
        renewalPurchases: 96,
        reactivated: 46,
        lapsedTouches: 573,
        renewalsDue: 122,
        vs2026: 16,
      },
      {
        revenueL: 20.2,
        objective: 'Long commitments in the softest Mumbai month.',
        offer: 'Black Friday Week Zero',
        leads: 91,
        trials: 70,
        buyers: 16,
        renewalPurchases: 55,
        reactivated: 32,
        lapsedTouches: 400,
        renewalsDue: 88,
        vs2026: -7,
      },
      {
        revenueL: 33.1,
        objective: 'Pre-sell January and Stronger in 30 (2028) entries; renew on personal usage data.',
        offer: 'Kickstart 21: Pre-Solution Cohort',
        leads: 121,
        trials: 94,
        buyers: 19,
        renewalPurchases: 75,
        reactivated: 61,
        lapsedTouches: 758,
        renewalsDue: 105,
        vs2026: 6,
      },
    ],
  },
  Bandra: {
    sourceName: 'Supreme HQ Bandra',
    annualL: 228.1,
    ttmGrowth: '−3%',
    insight:
      'Final plan: ₹228.2L target, ₹243.4L projected — new clients ₹37.0L, renewals ₹151.7L, reactivation ₹23.3L.',
    priority:
      '2,125 leads → 1,213 trials → 217 new buyers; 692 renewal purchases of 991 due; 369 reactivated from 4,612 touches.',
    months: [
      {
        revenueL: 17.6,
        objective:
          'Convert January trial demand; get lapsed clients and new clients onto a membership in time to join the challenge; re-up the Jan-2026 annuals (8 annuals, ₹12.5L due).',
        offer: 'Week Zero',
        leads: 152,
        trials: 87,
        buyers: 15,
        renewalPurchases: 50,
        reactivated: 33,
        lapsedTouches: 419,
        renewalsDue: 60,
        vs2026: -12,
      },
      {
        revenueL: 16.2,
        objective:
          'Duo and referral acquisition in place of BOGO (BOGO buyers were 79–94% existing clients and renewed at 33–53%). Keep Stronger in 30 finishers attending.',
        offer: 'The 30-Day Proof',
        leads: 141,
        trials: 81,
        buyers: 14,
        renewalPurchases: 66,
        reactivated: 23,
        lapsedTouches: 285,
        renewalsDue: 66,
        vs2026: 5,
      },
      {
        revenueL: 13.6,
        objective: 'Purpose-led reach; Bandra reactivation; stop March trials from waiting for the anniversary.',
        offer: 'Kickstart 21: She Moves Cohort',
        leads: 150,
        trials: 86,
        buyers: 15,
        renewalPurchases: 36,
        reactivated: 29,
        lapsedTouches: 358,
        renewalsDue: 71,
        vs2026: 20,
      },
      {
        revenueL: 33.0,
        objective:
          "The year's best, most playful offers and the first ₹1 Cr sales month (target ₹104.5L), without the 26–31% discounts of April 2026. Caps: 20% on ≤1M products, 15% on 3M+.",
        offer: 'Cloud Nine Intro',
        leads: 239,
        trials: 136,
        buyers: 24,
        renewalPurchases: 88,
        reactivated: 54,
        lapsedTouches: 673,
        renewalsDue: 74,
        vs2026: 20,
      },
      {
        revenueL: 18.7,
        objective:
          'Retain the April cohort (target ≥55% renewal at next expiry vs 24.5% for 2026 anniversary-code buyers at Kwality); duo acquisition.',
        offer: 'Mother Shaker Second Date',
        leads: 220,
        trials: 126,
        buyers: 22,
        renewalPurchases: 55,
        reactivated: 29,
        lapsedTouches: 365,
        renewalsDue: 85,
        vs2026: 25,
      },
      {
        revenueL: 15.5,
        objective: 'Stop summer lapses; fill weekday 10–12 and weekend 4–7 pm (27–41% full) with students.',
        offer: 'Golden Hours Flight',
        leads: 204,
        trials: 116,
        buyers: 20,
        renewalPurchases: 50,
        reactivated: 19,
        lapsedTouches: 238,
        renewalsDue: 86,
        vs2026: 8,
      },
      {
        revenueL: 21.4,
        objective:
          'Attendance and late cancels (Kenkere 21–30%); get people on a membership before the race starts on 1 Aug.',
        offer: 'Kickstart 21: Race Ready Cohort',
        leads: 205,
        trials: 117,
        buyers: 22,
        renewalPurchases: 62,
        reactivated: 27,
        lapsedTouches: 337,
        renewalsDue: 90,
        vs2026: 13,
      },
      {
        revenueL: 25.5,
        objective:
          'Attendance-led renewals and upgrades; bring new clients in on a Rookie leaderboard; second seasonal peak in Mumbai.',
        offer: 'Starting Gun Week',
        leads: 142,
        trials: 81,
        buyers: 16,
        renewalPurchases: 70,
        reactivated: 34,
        lapsedTouches: 424,
        renewalsDue: 106,
        vs2026: 12,
      },
      {
        revenueL: 18.0,
        objective: 'Reactivate before the festive season; carry race momentum into a festive countdown.',
        offer: 'The Second Date',
        leads: 194,
        trials: 111,
        buyers: 20,
        renewalPurchases: 56,
        reactivated: 37,
        lapsedTouches: 466,
        renewalsDue: 114,
        vs2026: 18,
      },
      {
        revenueL: 16.6,
        objective:
          "Gift-led revenue; protect Kenkere's Dasara trough; catch Kwality's late-October surge without codes.",
        offer: 'Festival of Lights Second Date',
        leads: 200,
        trials: 114,
        buyers: 20,
        renewalPurchases: 57,
        reactivated: 33,
        lapsedTouches: 408,
        renewalsDue: 89,
        vs2026: 11,
      },
      {
        revenueL: 13.6,
        objective: 'Long commitments in the softest Mumbai month.',
        offer: 'Black Friday Week Zero',
        leads: 130,
        trials: 74,
        buyers: 14,
        renewalPurchases: 51,
        reactivated: 27,
        lapsedTouches: 344,
        renewalsDue: 69,
        vs2026: 5,
      },
      {
        revenueL: 18.5,
        objective: 'Pre-sell January and Stronger in 30 (2028) entries; renew on personal usage data.',
        offer: 'Kickstart 21: Pre-Solution Cohort',
        leads: 147,
        trials: 84,
        buyers: 15,
        renewalPurchases: 51,
        reactivated: 24,
        lapsedTouches: 295,
        renewalsDue: 81,
        vs2026: 30,
      },
    ],
  },
};

// Each month of the final plan runs three journeys — newcomer, lapsed and renewal — each with
// a rate of sale and a “what to watch” line; the rhythm tracks those.
export const EXECUTION_RHYTHM = [
  [
    'Newcomer journey',
    "Track leads → trials → new buyers against the month's plan and the newcomer offer's rate of sale.",
  ],
  ['Lapsed journey', "Work the month's lapsed touches; count reactivations against the plan."],
  ['Renewal journey', 'Work renewals due against planned purchases with the renewal offer, inside its window.'],
  ['Weekly · what to watch', "Review each offer's “What to watch” measures and record one corrective action."],
  ['Rules', "Apply each offer's rules as written: who qualifies, when it runs and its credit windows."],
];
