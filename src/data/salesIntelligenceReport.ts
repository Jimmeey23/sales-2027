// Source: "P57 India — Historical Sales Intelligence Report (2023–2026)", 23 Oct 2026.
// Figures are ₹ incl. 5% GST; TTM = Oct-2025 to Sep-2026. Keyed by app studio name.

export const REPORT_META = {
  title: 'Historical Sales Intelligence Report (2023–2026)',
  date: '23 Oct 2026',
  model: 'P57_2027_Sales_Target_Model.xlsx',
  basis: '₹ incl. 5% GST · TTM = Oct-2025 to Sep-2026',
};

export type ReportStudio = 'Kemps Corner' | 'Bandra' | 'Kenkere House' | 'Pop-up';
export const REPORT_STUDIOS: ReportStudio[] = ['Kemps Corner', 'Bandra', 'Kenkere House', 'Pop-up'];
export const REPORT_LABEL: Record<ReportStudio, string> = {
  'Kemps Corner': 'Kwality House',
  Bandra: 'Supreme HQ Bandra',
  'Kenkere House': 'Kenkere House',
  'Pop-up': 'Bengaluru Pop-ups',
};
export const reportStudioFor = (name?: string | null): ReportStudio | null =>
  name === 'Copper + Cloves' || name === 'Plash Pilates'
    ? 'Pop-up'
    : REPORT_STUDIOS.includes(name as ReportStudio)
      ? (name as ReportStudio)
      : null;

export const EXEC_SUMMARY = [
  'Kwality House is the strongest grower (+21% TTM); Supreme HQ Bandra is the only studio going backwards (−3%). Kenkere House grew +15%, entirely through renewals — its new-client revenue fell 47% (Jan–Sep 2026 vs 2025).',
  'At the three main studios renewal and repeat purchases are 61–68% of TTM revenue; new clients 15–16%; reactivations 7–10%. Pop-ups are the exception: 48% from existing-client drop-ins.',
  'The top 10% of clients generate 54–60% of class revenue, so renewal economics — not lead volume — is the biggest lever at the main studios.',
];

export const STUDIO_PROFILES: Record<
  ReportStudio,
  {
    headline: string;
    summary: string;
    metrics: Array<[string, string, string]>;
    product: string;
    acquisition: string[];
    seasonality: string;
    discounts: string;
    strongest: string;
    weakest: string;
    segments: string[];
    constraints: string;
    opportunity: { title: string; body: string };
  }
> = {
  'Kemps Corner': {
    headline: 'Grows on volume, leaks on margin',
    summary:
      'Flagship and fastest grower: ₹322.5L TTM, +21% YoY. Growth came from more members and more trials, not higher prices. Effective discount doubled in 2026 and deep-discount buyers don’t renew.',
    metrics: [
      ['Gross sales', '₹322.5L', '+21% vs prior 12 months; Jan–Sep 2026 +16.6%'],
      ['Paying clients', '1,130', 'Median spend ₹7,560'],
      ['Revenue concentration', 'Top 10% = 54% of class revenue', 'Tickets ≥₹1L = 18.6%'],
      [
        'Revenue streams',
        'Renewal ₹198.5L (62%) · new ₹48.4L (15%) · reactivation ₹31.2L (10%)',
        'Drop-ins ₹16.5L · privates ₹15.5L · retail ₹7.2L',
      ],
      ['Core trials (excl. hosted)', '984', '707 prior 12 months (+39%)'],
      ['Trial → commitment (60d)', '18.7%', '22.2% prior; first purchase avg ₹16.9k'],
      ['Leads → trial / → commitment', '45% / 10.9%', 'Best in the group'],
      ['Renewed ≤30 days after expiry', '58.6% (n=1,327)', 'Full price 61.6% vs discounted 53.6%'],
      ['Effective discount (class sales)', '19.5% in 2026', '9.1% in 2025'],
      ['Fill / late cancels', '45% / 10.8%', 'Strength Lab 69% full'],
    ],
    product:
      'Four anchors: annual unlimited ₹53.1L (33 buyers), 1M unlimited ₹51.1L, 10–12-class packs ₹49.1L, 3M unlimited ₹40.8L. 20+ packs renew at 81%, 3M 74%, annual 71%; 1M and 4–8 packs 53–54%; 2-week unlimited 41%. Privates bring ₹20L from 21 clients on deep codes (24–70% off). Fully used packs renew at 62%, under-half used at 22%.',
    acquisition: [
      'Trials grew strongly but conversion slipped 22.2% → 18.7%.',
      'Best channels: website form 33%, walk-ins & incoming calls 32%, referrals 25%. Hosted first visits (428/yr) convert at 1.9%.',
      'Evening trials convert at 17%, afternoon at 7%.',
      'Instructor conversion ranges ~6% to 26% (n≥30 each) — coaching opportunity.',
      '40% of trials have no lead record (walk-ins, direct bookings).',
    ],
    seasonality:
      'April is the peak (₹50.0L in 2026); Aug–Sep second peak. November (₹18.5L) and Feb–Mar (₹19–20L) are troughs. 38% of each month’s sales land after the 21st.',
    discounts:
      'April 2026 hit ₹48.9L class revenue (2.27× Jan–Mar avg) at a 30.5% effective discount; ₹36.7L came from existing clients renewing early. 2026 anniversary-code buyers renewed at 24.5% (n=49) vs 61% at full price. Oct-2026 list-price rise (1M ₹18,638 → ₹20,239) gives room to hold the ticket without codes.',
    strongest: 'Long-commitment renewals, high-value members, strong referral and phone conversion.',
    weakest: 'Deep-discount pull-forwards, privates priced through codes, conversion slippage on a larger trial base.',
    segments: [
      '174 active + 70 grace-period clients with ≥₹50k lifetime spend (upgrade / annual candidates)',
      '705 clients lapsed 61–365 days — largest reactivation pool by value, incl. 87 high-value',
    ],
    constraints: 'Strength Lab capacity (69% fill). Barre and powerCycle have room (41–50%).',
    opportunity: {
      title: 'Protect renewal economics',
      body: 'Renewal is ₹198L a year, so each point of renewal yield ≈ ₹2.9L. Replace 30%+ anniversary pull-forwards with capped, bonus-based offers to hold yield above 69% and the ticket near ₹24k.',
    },
  },
  Bandra: {
    headline: 'Losing on every driver',
    summary:
      'The only studio in decline: ₹198.3L TTM, −3%. Fewer trials, lower conversion, smaller renewal tickets, lower renewal yield and more discounting — but it holds the biggest untapped asset: 1,248 lapsed clients (61 days to 2 years).',
    metrics: [
      ['Gross sales', '₹198.3L', '−3% vs prior 12 months; Jan–Sep 2026 −2%'],
      ['Paying clients', '940', 'Median spend ₹4,830'],
      ['Revenue concentration', 'Top 10% = 56% of class revenue', 'Tickets ≥₹1L = 14%'],
      [
        'Revenue streams',
        'Renewal ₹134.7L (68%) · new ₹31.3L (16%) · reactivation ₹16.3L (8%)',
        'New-client revenue Jan–Sep 2026 −17%',
      ],
      ['Core trials', '1,061', '1,305 prior (−19%)'],
      ['Trial → commitment', '16.3%', '18.2% prior; first purchase ₹14.3k (₹15.4k prior)'],
      ['Leads → trial / → commitment', '44% / 8.1%', 'Trial → commitment from leads 18.3%'],
      ['Renewal yield / ticket', '0.69 / ₹21.2k', '0.74 / ₹24.3k prior'],
      ['Renewed ≤30 days after expiry', '57.3% (n=975)', 'Full price 61.2% vs discounted 53.7%'],
      ['Revenue sold on discount', '59–68%', 'Highest in group; effective discount 13.4% in 2026'],
      ['Fill / late cancels', '42% / 13%', 'powerCycle 40%'],
    ],
    product:
      '10–12-class packs anchor (₹46.8L, 24%), then 1M (₹36.7L), 3M (₹23.9L), annual (₹23.8L). 6M and 3M renew best (77%, 68%); 4–8 packs 52%; 2-week unlimited 33%. Highest upgrade share at renewal (26% up, 13% down) — the ticket fell from mix drift and codes, not refusal to upgrade.',
    acquisition: [
      'Website leads are the largest source (799/yr): 20% reach a trial, 6.8% buy.',
      'Phone enquiries (29% trial → commitment) and WhatsApp (22%) convert best.',
      '12.9% of leads sit at “Shared pricing & schedule” with no next step.',
      'Lead → commitment by associate ranges 10.6% to 18.9%.',
    ],
    seasonality:
      'April (₹27.4L) and August (₹22.8L) peak; October (₹10.2L) and March (₹11.3L) trough. Only 14% of sales land in days 1–7, 35% after the 21st.',
    discounts:
      'April 2026 (₹26.4L class revenue) earned less than April 2025 (₹27.9L) while doubling the effective discount 13% → 26% — the clearest evidence that deeper anniversary discounts don’t buy more revenue.',
    strongest: 'Pack renewals, phone and WhatsApp conversion, upgrade willingness.',
    weakest: 'Website-lead follow-up, discount dependence, renewal ticket, reactivation.',
    segments: [
      '1,248 lapsed clients (incl. 52 high-value): 202 in grace, 253 at 61–180d, 357 at 181–365d, 638 at 1–2 years (2024 opening cohort)',
      '1M renewers with 8+ visits a month (upgrade candidates)',
    ],
    constraints:
      'None on capacity (42% fill). The constraint is follow-up discipline. Reactivation is 2.8%/month — lowest of any studio.',
    opportunity: {
      title: 'Reactivate the lapsed pool and rebuild the renewal ticket',
      body: 'Lift reactivation of the 610-client 61–365d pool from 2.8% to 3.4% a month, add a launch-cohort reunion for the 638 at 1–2 years, and move the renewal ticket halfway back to ₹24.3k.',
    },
  },
  'Kenkere House': {
    headline: 'Best renewals, broken new-client engine',
    summary:
      'Grew +15% TTM (₹107.5L) entirely on retention. Renewal revenue rose 40% (Jan–Sep) while new-client revenue fell 47%, ₹20.9L → ₹11.0L.',
    metrics: [
      ['Gross sales', '₹107.5L', '+15% vs prior 12 months; Jan–Sep 2026 +20%'],
      ['Paying clients', '751', 'Median spend ₹2,126'],
      ['Revenue concentration', 'Top 10% = 60% of class revenue', 'Highest in the group'],
      [
        'Revenue streams',
        'Renewal ₹67.2L (63%) · new ₹16.8L (16%) · reactivation ₹7.9L (7%)',
        'New-client revenue per buyer ₹5,394 (2025) → ₹2,608 (2026)',
      ],
      ['Core trials', '783', '982 prior (−20%)'],
      ['New commitment buyers', '1, 1 and 7 in Jul, Aug, Sep 2026', 'From 52–71 trials a month'],
      ['Trial → commitment (60d)', '13.7% core; 1.4% hosted (492 visits)', '14.0% prior'],
      ['Leads → trial / → commitment', '29.5% / 3.4%', 'Lowest of the three main studios'],
      ['Renewal yield / ticket', '0.86 / ₹13.5k', '0.74 / ₹16.4k prior'],
      ['Renewed ≤30 days after expiry', '61.2% (n=624)', 'Full price 67.9% vs discounted 50.4%'],
      ['Late-cancel rate', '20.7% (25–30% Jun–Aug 2026)', 'Kwality 10.8%'],
      ['Fill', '44%', 'Afternoon slots 71% (21 sessions only)'],
    ],
    product:
      '1M (₹25.8L) and 3M (₹21.3L) dominate, then 10–12 packs (₹12.8L), 4–8 packs (₹12.4L), drop-ins (₹11.5L). 3M renews 71%, packs 64%, 1M 59%, 2-week unlimited 44%. Renewal ticket fell 18% as clients drifted to smaller products; 22% of renewals upgrade.',
    acquisition: [
      'Website leads: 2,067/yr (55% of leads) reach a trial 7.5% of the time and buy 3.6%.',
      'Hosted and outdoor: 492 hosted and 229 outdoor first visits convert at 1.4% and 0%.',
      'Lead volume fell 1,276 (Q3-2025) → 469 (Q3-2026), yet conversion is the binding constraint.',
      'What converts: walk-ins 44%, WhatsApp 28%, website forms 15%, incoming calls 13%.',
      '“Not interested – proximity” closes 8.8% of leads — natural pop-up audience.',
      '43% of revenue has no associate attribution; lead → commitment by associate 6.0%–14.8%.',
    ],
    seasonality:
      'January, April and September peak (₹11–12L). October (₹4.8L in 2025) and December (₹5.3L) are deep troughs — Dasara, Diwali and year-end travel.',
    discounts:
      'Least discount-dependent studio (7.5% effective in 2026). April lift is mild (1.35–1.45×). VDAY50!/BOGO buyers (37% effective) renewed at 53% vs 66% at full price.',
    strongest: 'Renewal yield, 3M retention, low discount reliance.',
    weakest: 'Lead quality, event-to-member conversion, late cancels, falling ticket.',
    segments: [
      'Walk-in, WhatsApp and phone enquirers',
      '1M renewers with 8+ visits (3M upgrades)',
      '447 clients lapsed 61–365 days',
    ],
    constraints: 'Late cancels and show-up (78%), not class capacity.',
    opportunity: {
      title: 'Rebuild the new-client engine',
      body: 'Restore trial → commitment above 15%, convert hosted visits at 4% and qualify website leads: new-client revenue ₹16.8L → ₹21.5L. Plan needs lead → commitment of ~5.5% vs 3.4% today — lead qualification and named trial ownership come before buying more leads.',
    },
  },
  'Pop-up': {
    headline: 'A drop-in feeder, not a standalone line',
    summary:
      'Low-ticket drop-in business: ₹15.4L in its first 12 months (since Oct-2025), running ₹1.1–1.9L a month. Strategic value is as a cheap entry point that feeds packs and Kenkere House.',
    metrics: [
      ['Gross sales', '₹15.4L', 'Best month Sep-2026 (₹1.9L)'],
      ['Paying clients / median spend', '513 / ₹945', ''],
      ['Product mix', 'Drop-in credits 76% (₹11.8L, 1,756 sales at ~₹670)', 'C+C class packs 19% (₹3.0L, 41 sales)'],
      [
        'Revenue streams',
        'Existing drop-ins ₹7.4L · new ₹4.1L (414 buyers at ₹985)',
        'Renewals ₹3.2L (29 clients) · reactivation ₹0.6L',
      ],
      ['First visit → commitment', '2.9%', 'Any paid purchase 63%'],
      ['Leads → trial / → commitment', '22.7% / 1.3%', 'Website leads (1,008) reach a trial 6–8%'],
      ['Classes', '68 sessions/month, 24% fill', '2.6 clients per class; Saturday 43% fill'],
    ],
    product:
      '76% of revenue is ₹472–945 single credits. 186 existing drop-in buyers spent ~₹4,000 each — already more than half a 10-class pack.',
    acquisition: [
      'Referral, dashboard and abandoned-checkout leads convert to a purchase 63–78% of the time — almost always a single credit.',
      'Only 2.9% of first visits buy a pack.',
    ],
    seasonality: 'New studio — no full seasonal cycle yet.',
    discounts: 'Not discount-led; the issue is commitment, not price.',
    strongest: 'Real demand and high first-purchase rate.',
    weakest: 'Shallow commitment, 24% fill.',
    segments: ['186 drop-in regulars', 'Proximity-blocked Kenkere leads (8.8% of Kenkere leads)'],
    constraints: 'Low fill and per-visit buying habit.',
    opportunity: {
      title: 'Convert drop-in regulars into packs; feed Kenkere',
      body: '“Credit Where It’s Due”: credit the last two drop-ins toward a 10-class pack. Add a Studio Passport class at Kenkere. Together these lift commitment conversion from 2.9% to 5%.',
    },
  },
};

export const OFFER_EFFECTIVENESS: Array<{ family: string; kwality: string; bandra: string; kenkere: string }> = [
  { family: 'Full price', kwality: '0% / 61%', bandra: '0% / 60%', kenkere: '0% / 66%' },
  {
    family: 'Anniversary codes (2025–26)',
    kwality: '37.5% / 24.5%',
    bandra: '26.2% / 51%',
    kenkere: '24% / small sample',
  },
  { family: 'BOGO / Valentine', kwality: '28.8% / 33%', bandra: '26.1% / 53%', kenkere: '36.7% / 53%' },
  { family: 'New-client codes (NC15 etc.)', kwality: '12.9% / 53%', bandra: '13.6% / 55%', kenkere: '12.8% / 38%' },
  {
    family: 'Generic 10% pack code (ZAP10 etc.)',
    kwality: '14.8% / 60%',
    bandra: '11.7% / 56%',
    kenkere: '9.2% / 47%',
  },
  { family: 'Privates codes (PR1V@TE)', kwality: '48.4% / —', bandra: '—', kenkere: '—' },
];
export const OFFERS_WORKED = [
  'New-client codes raised the first purchase: ₹21.8k vs ₹10.5k at full price (Kwality), ₹17.4k vs ₹10.2k (Bandra). Keep the 15% perk.',
  'ZAP10 (standing 10% pack code) is the biggest code: 785 redemptions, ₹1.69 Cr of sales; renewals close to full price — behaves like a price, not a promotion.',
  'FLASH3M (16% effective, Apr-2025) moved 15 3M memberships at ₹42k in 12 days; Kwality flash buyers renewed at 68% (n=25).',
];
export const OFFERS_FAILED = [
  '2026 anniversary codes at Kwality (40–50% effective): ₹37L of sales for ₹22L of discount, mostly existing clients, who renewed at 24.5%.',
  'BOGO / Valentine (24–54% effective): bought by existing clients (6–21% new), renewed at 33–53%.',
  'Privates codes: PR1V@TE20 gave ₹10L of discount on ₹4.2L of privates to one client.',
];
export const APRIL_HISTORY: Array<{ studio: ReportStudio; a25: string; a26: string; lift: string; after: string }> = [
  {
    studio: 'Kemps Corner',
    a25: '30.8 (14%)',
    a26: '48.9 (31%)',
    lift: '1.67× → 2.27×',
    after: '22.5, no post-April dip',
  },
  { studio: 'Bandra', a25: '27.9 (13%)', a26: '26.4 (26%)', lift: '2.34× → 1.72×', after: '14.2, slight dip' },
  { studio: 'Kenkere House', a25: '9.5 (8%)', a26: '11.8 (9%)', lift: '1.35× → 1.45×', after: '9.3, no dip' },
];
export const FUNNEL: Record<ReportStudio, Record<string, string>> = {
  'Kemps Corner': {
    leads: '1,411',
    leadTrial: '44.9%',
    attend: '89%',
    withLead: '60%',
    trialCommit: '18.7%',
    leadCommit: '10.9%',
    hosted: '428 / 1.9%',
    firstPurchase: '₹16.9k',
  },
  Bandra: {
    leads: '1,958',
    leadTrial: '44.4%',
    attend: '87%',
    withLead: '81%',
    trialCommit: '16.3%',
    leadCommit: '8.1%',
    hosted: '272 / 2.9%',
    firstPurchase: '₹14.3k',
  },
  'Kenkere House': {
    leads: '3,563',
    leadTrial: '29.5%',
    attend: '78%',
    withLead: '98%',
    trialCommit: '13.7%',
    leadCommit: '3.4%',
    hosted: '492 / 1.4%',
    firstPurchase: '₹14.0k',
  },
  'Pop-up': {
    leads: '1,495',
    leadTrial: '22.7%',
    attend: '95%',
    withLead: '97%',
    trialCommit: '2.9%',
    leadCommit: '1.3%',
    hosted: '56 / 0%',
    firstPurchase: '₹7.7k',
  },
};
export const FUNNEL_ROWS: Array<[string, string]> = [
  ['leads', 'Leads (12 months, excl. bulk import)'],
  ['leadTrial', 'Lead → completed trial (60d)'],
  ['attend', 'Trial booking → attendance (proxy)'],
  ['withLead', 'Share of core trials with a lead record'],
  ['trialCommit', 'Core trial → commitment (60d)'],
  ['leadCommit', 'Lead → commitment (90d)'],
  ['hosted', 'Hosted first visits / conversion'],
  ['firstPurchase', 'Average first commitment purchase'],
];
export const FUNNEL_INSIGHTS = [
  'Speed decides conversion: median trial-to-purchase gap is 3 days; 75% convert within 9 days, 90% within 24.',
  'Evening and morning trials convert 11–17%; afternoon trials 1–7% everywhere.',
  'Renewal within 30 days of expiry: Kenkere 61%, Kwality 59%, Bandra 57%. Median renewal is 1 day before expiry; 25% renew 10+ days early.',
  'Long commitments retain best (3M 68–74%, 6M 63–77%); 2-week unlimited weakest (33–44%).',
  'Packs used under 50% renew at 22–24%; fully used at 59–64%. Renewers average 6.4 visits in the first half vs 2.6–3.4 for lapsers.',
  'First purchases renew at 40–45%, reactivations 37–47%, repeat renewals 64–68% — loyalty forms at the second renewal.',
  'Late cancels: Kenkere 21% (30% Jul-2026), Bandra 13%, Kwality 11%. Bandra’s 35% spike (Aug–Sep 2025) was fixed by Oct-2025 once enforced.',
];

export const LAPSED: Record<
  ReportStudio,
  { active: number; grace: number; l180: number; l365: number; l2y: number; highValue: number; reactivation: string }
> = {
  'Kemps Corner': { active: 274, grace: 261, l180: 335, l365: 370, l2y: 385, highValue: 87, reactivation: '4.9%' },
  Bandra: { active: 178, grace: 202, l180: 253, l365: 357, l2y: 638, highValue: 52, reactivation: '2.8%' },
  'Kenkere House': { active: 123, grace: 156, l180: 232, l365: 215, l2y: 381, highValue: 32, reactivation: '2.7%' },
  'Pop-up': { active: 56, grace: 117, l180: 149, l365: 188, l2y: 6, highValue: 2, reactivation: '— (new)' },
};
