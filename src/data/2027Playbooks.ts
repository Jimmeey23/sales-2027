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

// Mumbai studio playbooks (₹ lakh, incl. GST), generated from the 2027 plan of record by
// scripts/refresh-mumbai-playbooks.ts: targets, funnels, objectives and lead offers match the month plans.
export const PLAYBOOKS_2027: Record<string, StudioPlaybook> = {
  'Kemps Corner': {
    sourceName: 'Kwality House (Kemps Corner)',
    annualL: 420,
    ttmGrowth: '+21%',
    insight:
      'Plan of record: ₹420.0L target (+30.2% on ₹322.5L) — new clients ₹100.8L, renewals ₹231.0L, reactivation ₹50.4L.',
    priority: '6,572 leads → 3,352 trials → 902 new buyers; 987 renewal purchases of 1,289 due; 440 reactivated.',
    months: [
      {
        revenueL: 33,
        objective:
          'Turn New Year intent into paid commitments that are active on 1 Feb; re-up the annuals due Dec–Feb; test the 3-for-2 newcomer pack.',
        offer: "Third Time's the Charm",
        leads: 518,
        trials: 264,
        buyers: 71,
        renewalPurchases: 78,
        reactivated: 35,
        lapsedTouches: 523,
        renewalsDue: 102,
        vs2026: 20,
      },
      {
        revenueL: 25.7,
        objective:
          'Turn Valentine’s-season traffic into first memberships through a mystery-class intro; recruit through members’ love letters; move February renewals onto 3–12 month plans; let lapsed clients come back on the commitment they choose. Every reward is tied to a purchase or a visit.',
        offer: 'Blind Date (No Catfishing)',
        leads: 400,
        trials: 204,
        buyers: 55,
        renewalPurchases: 60,
        reactivated: 27,
        lapsedTouches: 456,
        renewalsDue: 78,
        vs2026: 34,
      },
      {
        revenueL: 25.7,
        objective:
          "Hold the March trough: widen members' formats, use Women's Day for Bandra Lab acquisition, stop March expiries waiting for April, fix Bengaluru's second-visit leak.",
        offer: 'Lift Like a Girl',
        leads: 400,
        trials: 204,
        buyers: 55,
        renewalPurchases: 60,
        reactivated: 27,
        lapsedTouches: 561,
        renewalsDue: 78,
        vs2026: 27,
      },
      {
        revenueL: 60,
        objective:
          'Flagship month: win on excitement and economics. Two products that exist only in April (the 9-Month Lease and the 9-Class Pack), a 9:09 flash, a wheel you can double, numbered Club Nine annuals and a month of events, with no offer above 25% effective (cash ≤20% except annuals, the flash and the bulk pack). Every April buyer leaves with a reason to come back in May.',
        offer: 'Party Crasher Pass',
        leads: 941,
        trials: 480,
        buyers: 129,
        renewalPurchases: 141,
        reactivated: 63,
        lapsedTouches: 951,
        renewalsDue: 184,
        vs2026: 20,
      },
      {
        revenueL: 28.9,
        objective:
          "Students home from college fill empty off-peak seats; Mother's Day duos; keep April's buyers attending.",
        offer: 'Mom Said Get Off the Couch',
        leads: 451,
        trials: 230,
        buyers: 62,
        renewalPurchases: 68,
        reactivated: 30,
        lapsedTouches: 644,
        renewalsDue: 89,
        vs2026: 19,
      },
      {
        revenueL: 28.8,
        objective:
          "Grow privates with off-peak pricing and bulk packs (Bandra's biggest gap); stop summer travel lapses with freezes, not discounts; test a private-first intro.",
        offer: 'Shy Girl Starter Pack',
        leads: 451,
        trials: 230,
        buyers: 62,
        renewalPurchases: 68,
        reactivated: 30,
        lapsedTouches: 607,
        renewalsDue: 89,
        vs2026: 32,
      },
      {
        revenueL: 33.6,
        objective:
          'Studio bookouts and corporate bulk as new channels; protect monsoon renewals; bring lapsed clients back before August.',
        offer: 'Shy Girl Starter Pack',
        leads: 525,
        trials: 268,
        buyers: 72,
        renewalPurchases: 79,
        reactivated: 35,
        lapsedTouches: 638,
        renewalsDue: 103,
        vs2026: 30,
      },
      {
        revenueL: 38.1,
        objective:
          'Recruit whole friend groups on Friendship Day; sell annuals over Freedom Weekend with a 2028 price lock instead of a deeper discount; remove the commitment objection for newcomers with a break-up clause; protect the festive-season renewal book with freezes. Every reward is tied to a purchase or a visit, never to a class count.',
        offer: 'No Strings Attached',
        leads: 598,
        trials: 305,
        buyers: 82,
        renewalPurchases: 90,
        reactivated: 40,
        lapsedTouches: 554,
        renewalsDue: 118,
        vs2026: 27,
      },
      {
        revenueL: 39.6,
        objective:
          'Winback month: manager calls for high-value lapsed clients, fast comebacks for recent lapsers; a results-guarantee bundle; lock 3M plans before the festive dip.',
        offer: 'Glow-Up or Give Back',
        leads: 620,
        trials: 316,
        buyers: 85,
        renewalPurchases: 93,
        reactivated: 41,
        lapsedTouches: 593,
        renewalsDue: 122,
        vs2026: 24,
      },
      {
        revenueL: 50.2,
        objective: 'Gift-led acquisition, 1M→6M upgrades and a Dhanteras annual window, without open codes.',
        offer: 'Diwali Gifting, Minus the Dry-Fruit Box',
        leads: 786,
        trials: 401,
        buyers: 108,
        renewalPurchases: 118,
        reactivated: 53,
        lapsedTouches: 573,
        renewalsDue: 154,
        vs2026: 91,
      },
      {
        revenueL: 21.4,
        objective:
          'Sell group packs into the wedding season; bring lapsed clients back before the baraat; one loud 11-hour pack day on 11.11; and a Black Friday that moves renewals onto long plans with a mystery bonus instead of a deeper price.',
        offer: 'Bride Squad, Assemble (Groom Can Come Too)',
        leads: 335,
        trials: 171,
        buyers: 46,
        renewalPurchases: 50,
        reactivated: 22,
        lapsedTouches: 400,
        renewalsDue: 65,
        vs2026: 16,
      },
      {
        revenueL: 35,
        objective:
          'Renew December’s book onto long plans with perks spread across Q1; sell January starts now with Resolution Insurance; turn gifting into January newcomers; bank pack demand on Boxing Day; win back long-lapsed clients with a plus-one to the NYE Countdown Class.',
        offer: 'Resolution Insurance (Claim Approved)',
        leads: 547,
        trials: 279,
        buyers: 75,
        renewalPurchases: 82,
        reactivated: 37,
        lapsedTouches: 758,
        renewalsDue: 107,
        vs2026: 30,
      },
    ],
  },
  Bandra: {
    sourceName: 'Supreme HQ Bandra',
    annualL: 228.2,
    ttmGrowth: '−3%',
    insight:
      'Plan of record: ₹228.2L target (+15% on ₹198.4L) — new clients ₹61.6L, renewals ₹116.4L, reactivation ₹41.1L.',
    priority: '6,525 leads → 3,394 trials → 733 new buyers; 534 renewal purchases of 873 due; 373 reactivated.',
    months: [
      {
        revenueL: 17.6,
        objective:
          'Turn New Year intent into paid commitments that are active on 1 Feb; re-up the annuals due Dec–Feb; test the 3-for-2 newcomer pack.',
        offer: "Third Time's the Charm",
        leads: 498,
        trials: 259,
        buyers: 56,
        renewalPurchases: 41,
        reactivated: 29,
        lapsedTouches: 419,
        renewalsDue: 67,
        vs2026: -12,
      },
      {
        revenueL: 16.2,
        objective:
          'Turn Valentine’s-season traffic into first memberships through a mystery-class intro; recruit through members’ love letters; move February renewals onto 3–12 month plans; let lapsed clients come back on the commitment they choose. Every reward is tied to a purchase or a visit.',
        offer: 'Blind Date (No Catfishing)',
        leads: 463,
        trials: 241,
        buyers: 52,
        renewalPurchases: 38,
        reactivated: 27,
        lapsedTouches: 285,
        renewalsDue: 62,
        vs2026: 5,
      },
      {
        revenueL: 13.6,
        objective:
          "Hold the March trough: widen members' formats, use Women's Day for Bandra Lab acquisition, stop March expiries waiting for April, fix Bengaluru's second-visit leak.",
        offer: 'Lift Like a Girl',
        leads: 392,
        trials: 204,
        buyers: 44,
        renewalPurchases: 32,
        reactivated: 22,
        lapsedTouches: 358,
        renewalsDue: 52,
        vs2026: 21,
      },
      {
        revenueL: 33,
        objective:
          'Flagship month: win on excitement and economics. Two products that exist only in April (the 9-Month Lease and the 9-Class Pack), a 9:09 flash, a wheel you can double, numbered Club Nine annuals and a month of events, with no offer above 25% effective (cash ≤20% except annuals, the flash and the bulk pack). Every April buyer leaves with a reason to come back in May.',
        offer: 'Party Crasher Pass',
        leads: 944,
        trials: 491,
        buyers: 106,
        renewalPurchases: 77,
        reactivated: 54,
        lapsedTouches: 673,
        renewalsDue: 126,
        vs2026: 20,
      },
      {
        revenueL: 18.7,
        objective:
          "Students home from college fill empty off-peak seats; Mother's Day duos; keep April's buyers attending.",
        offer: 'Mom Said Get Off the Couch',
        leads: 535,
        trials: 278,
        buyers: 60,
        renewalPurchases: 44,
        reactivated: 31,
        lapsedTouches: 365,
        renewalsDue: 72,
        vs2026: 25,
      },
      {
        revenueL: 15.5,
        objective:
          "Grow privates with off-peak pricing and bulk packs (Bandra's biggest gap); stop summer travel lapses with freezes, not discounts; test a private-first intro.",
        offer: 'Shy Girl Starter Pack',
        leads: 444,
        trials: 231,
        buyers: 50,
        renewalPurchases: 36,
        reactivated: 25,
        lapsedTouches: 238,
        renewalsDue: 59,
        vs2026: 8,
      },
      {
        revenueL: 21.4,
        objective:
          'Studio bookouts and corporate bulk as new channels; protect monsoon renewals; bring lapsed clients back before August.',
        offer: 'Shy Girl Starter Pack',
        leads: 613,
        trials: 319,
        buyers: 69,
        renewalPurchases: 50,
        reactivated: 35,
        lapsedTouches: 337,
        renewalsDue: 82,
        vs2026: 13,
      },
      {
        revenueL: 25.5,
        objective:
          'Recruit whole friend groups on Friendship Day; sell annuals over Freedom Weekend with a 2028 price lock instead of a deeper discount; remove the commitment objection for newcomers with a break-up clause; protect the festive-season renewal book with freezes. Every reward is tied to a purchase or a visit, never to a class count.',
        offer: 'No Strings Attached',
        leads: 731,
        trials: 380,
        buyers: 82,
        renewalPurchases: 60,
        reactivated: 42,
        lapsedTouches: 424,
        renewalsDue: 98,
        vs2026: 12,
      },
      {
        revenueL: 18,
        objective:
          'Winback month: manager calls for high-value lapsed clients, fast comebacks for recent lapsers; a results-guarantee bundle; lock 3M plans before the festive dip.',
        offer: 'Glow-Up or Give Back',
        leads: 517,
        trials: 269,
        buyers: 58,
        renewalPurchases: 42,
        reactivated: 29,
        lapsedTouches: 466,
        renewalsDue: 69,
        vs2026: 18,
      },
      {
        revenueL: 16.6,
        objective: 'Gift-led acquisition, 1M→6M upgrades and a Dhanteras annual window, without open codes.',
        offer: 'Diwali Gifting, Minus the Dry-Fruit Box',
        leads: 471,
        trials: 245,
        buyers: 53,
        renewalPurchases: 39,
        reactivated: 27,
        lapsedTouches: 408,
        renewalsDue: 64,
        vs2026: 63,
      },
      {
        revenueL: 13.6,
        objective:
          'Sell group packs into the wedding season; bring lapsed clients back before the baraat; one loud 11-hour pack day on 11.11; and a Black Friday that moves renewals onto long plans with a mystery bonus instead of a deeper price.',
        offer: 'Bride Squad, Assemble (Groom Can Come Too)',
        leads: 392,
        trials: 204,
        buyers: 44,
        renewalPurchases: 32,
        reactivated: 22,
        lapsedTouches: 344,
        renewalsDue: 52,
        vs2026: 3,
      },
      {
        revenueL: 18.5,
        objective:
          'Renew December’s book onto long plans with perks spread across Q1; sell January starts now with Resolution Insurance; turn gifting into January newcomers; bank pack demand on Boxing Day; win back long-lapsed clients with a plus-one to the NYE Countdown Class.',
        offer: 'Resolution Insurance (Claim Approved)',
        leads: 525,
        trials: 273,
        buyers: 59,
        renewalPurchases: 43,
        reactivated: 30,
        lapsedTouches: 295,
        renewalsDue: 70,
        vs2026: 28,
      },
    ],
  },
};

// Each month of the plan runs three journeys — newcomer, lapsed and renewal — each with
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
