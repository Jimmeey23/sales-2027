export type PlaybookMonth = { revenueL: number; objective: string; offer: string; leads: number; trials: number; buyers: number; renewalPurchases: number; reactivated: number; lapsedTouches: number };
export type StudioPlaybook = { sourceName: string; annualL: number; ttmGrowth: string; insight: string; priority: string; months: PlaybookMonth[] };

// Transcribed from the supplied “P57 India — 2027 Monthly Sales Execution Playbooks” PDF.
// Values are a separate Base scenario (₹ lakh, incl. GST); they never overwrite app targets.
export const PLAYBOOKS_2027: Record<string, StudioPlaybook> = {
  'Kemps Corner': { sourceName: 'Kwality House (Kemps Corner)', annualL:398.1, ttmGrowth:'+21%', insight:'Volume and active members are growing, while effective discount rose to 19.5%. April 2026 code buyers renewed at 24.5% versus 61% at full price.', priority:'Protect renewal yield and ticket; aim for 20.5% trial-to-commitment, prioritise morning/evening trial slots, and route bonus visits to lower-fill formats.', months:[
    {revenueL:31.2,objective:'Convert January trial demand quickly',offer:'Resolution Insurance',leads:77,trials:59,buyers:14,renewalPurchases:79,reactivated:42,lapsedTouches:523},
    {revenueL:24.3,objective:'Referral-led acquisition; replace BOGO',offer:'Plus-One, Minus Excuses',leads:102,trials:78,buyers:17,renewalPurchases:85,reactivated:36,lapsedTouches:456},
    {revenueL:24.3,objective:'Protect Q1 renewals; preload April',offer:'The Pre-Game',leads:96,trials:74,buyers:16,renewalPurchases:61,reactivated:45,lapsedTouches:561},
    {revenueL:57.6,objective:'Anniversary revenue with protected selling price',offer:'Still Shaking',leads:113,trials:88,buyers:18,renewalPurchases:130,reactivated:76,lapsedTouches:951},
    {revenueL:27.3,objective:'Retain the April cohort',offer:'The Afterparty',leads:133,trials:103,buyers:22,renewalPurchases:65,reactivated:51,lapsedTouches:644},
    {revenueL:27.2,objective:'Keep summer travellers engaged',offer:'Out of Office, Not Out of Shape',leads:151,trials:116,buyers:24,renewalPurchases:76,reactivated:49,lapsedTouches:607},
    {revenueL:31.8,objective:'Monsoon attendance and renewals',offer:'Rain Check',leads:130,trials:100,buyers:21,renewalPurchases:79,reactivated:51,lapsedTouches:638},
    {revenueL:36.0,objective:'Upgrade to 3M+ and earn referrals',offer:'Friends Who Squat Together',leads:141,trials:109,buyers:24,renewalPurchases:91,reactivated:44,lapsedTouches:554},
    {revenueL:37.4,objective:'Reactivate before the festive season',offer:'The Return Policy',leads:124,trials:96,buyers:21,renewalPurchases:76,reactivated:47,lapsedTouches:593},
    {revenueL:47.6,objective:'Capture late-October demand without codes',offer:'Gift a Shake',leads:141,trials:109,buyers:24,renewalPurchases:96,reactivated:46,lapsedTouches:573},
    {revenueL:20.2,objective:'Lock in longer commitments',offer:'Black Friday, Strong Monday',leads:91,trials:70,buyers:16,renewalPurchases:55,reactivated:32,lapsedTouches:400},
    {revenueL:33.1,objective:'Pre-sell January and close December renewals',offer:'The Pre-Solution',leads:121,trials:94,buyers:19,renewalPurchases:75,reactivated:61,lapsedTouches:758},
  ]},
  'Bandra': { sourceName:'Supreme HQ Bandra', annualL:228.1, ttmGrowth:'−3%', insight:'The only core studio with declining TTM revenue; renewal ticket and yield fell. The lapsed pool is the largest, while 59–68% of revenue is discounted.', priority:'Rebuild renewal value and reactivate lapsed clients. Target 3.4% monthly reactivation of the 61–365-day pool; assign website leads within 2 hours and call T−14 renewals.', months:[
    {revenueL:17.6,objective:'Convert January trial demand',offer:'Resolution Insurance',leads:152,trials:87,buyers:15,renewalPurchases:50,reactivated:33,lapsedTouches:419},
    {revenueL:16.2,objective:'Referral-led acquisition; replace BOGO',offer:'Plus-One, Minus Excuses',leads:141,trials:81,buyers:14,renewalPurchases:66,reactivated:23,lapsedTouches:285},
    {revenueL:13.6,objective:'Start reactivation early',offer:'The Pre-Game + Launch-Cohort Reunion',leads:150,trials:86,buyers:15,renewalPurchases:36,reactivated:29,lapsedTouches:358},
    {revenueL:33.0,objective:'Anniversary revenue with protected selling price',offer:'Still Shaking',leads:239,trials:136,buyers:24,renewalPurchases:88,reactivated:54,lapsedTouches:673},
    {revenueL:18.7,objective:'Retain the April cohort',offer:'The Afterparty',leads:220,trials:126,buyers:22,renewalPurchases:55,reactivated:29,lapsedTouches:365},
    {revenueL:15.5,objective:'Keep summer travellers engaged',offer:'Out of Office, Not Out of Shape',leads:204,trials:116,buyers:20,renewalPurchases:50,reactivated:19,lapsedTouches:238},
    {revenueL:21.4,objective:'Monsoon attendance and renewals',offer:'Rain Check',leads:205,trials:117,buyers:22,renewalPurchases:62,reactivated:27,lapsedTouches:337},
    {revenueL:25.5,objective:'Upgrade and referral growth',offer:'Friends Who Squat Together',leads:142,trials:81,buyers:16,renewalPurchases:70,reactivated:34,lapsedTouches:424},
    {revenueL:18.0,objective:'Reactivate before the festive season',offer:'The Return Policy',leads:194,trials:111,buyers:20,renewalPurchases:56,reactivated:37,lapsedTouches:466},
    {revenueL:16.6,objective:'Gift-led revenue in a soft month',offer:'Gift a Shake',leads:200,trials:114,buyers:20,renewalPurchases:57,reactivated:33,lapsedTouches:408},
    {revenueL:13.6,objective:'Lock in longer commitments',offer:'Black Friday, Strong Monday',leads:130,trials:74,buyers:14,renewalPurchases:51,reactivated:27,lapsedTouches:344},
    {revenueL:18.5,objective:'Pre-sell January',offer:'The Pre-Solution',leads:147,trials:84,buyers:15,renewalPurchases:51,reactivated:24,lapsedTouches:295},
  ]},
  'Kenkere House': { sourceName:'Kenkere House', annualL:126.1, ttmGrowth:'+15%', insight:'Renewals are strong, but new-client revenue fell 47% year over year. Website leads reach a trial only 7.5% of the time; hosted-class conversion is 1.4%.', priority:'Treat conversion as the constraint: qualify website leads by phone, name a trial owner, enforce the 72-hour follow-up, and run Encore at every hosted class.', months:[
    {revenueL:12.0,objective:'Convert January trial demand',offer:'Resolution Insurance',leads:282,trials:93,buyers:19,renewalPurchases:38,reactivated:19,lapsedTouches:237},
    {revenueL:10.2,objective:'Referral-led acquisition; replace VDAY50!/BOGO',offer:'Plus-One, Minus Excuses',leads:221,trials:73,buyers:13,renewalPurchases:47,reactivated:17,lapsedTouches:218},
    {revenueL:8.4,objective:'Protect Q1 renewals; convert hosted classes',offer:'The Pre-Game + Encore',leads:203,trials:67,buyers:12,renewalPurchases:31,reactivated:19,lapsedTouches:244},
    {revenueL:12.8,objective:'Anniversary revenue with protected selling price',offer:'Still Shaking',leads:225,trials:74,buyers:12,renewalPurchases:49,reactivated:27,lapsedTouches:332},
    {revenueL:10.2,objective:'Retain the April cohort',offer:'The Afterparty',leads:231,trials:76,buyers:12,renewalPurchases:49,reactivated:21,lapsedTouches:260},
    {revenueL:10.2,objective:'Keep summer travellers engaged',offer:'Out of Office, Not Out of Shape',leads:190,trials:63,buyers:11,renewalPurchases:51,reactivated:22,lapsedTouches:275},
    {revenueL:13.0,objective:'Monsoon attendance; reduce late cancels',offer:'Rain Check',leads:188,trials:62,buyers:10,renewalPurchases:63,reactivated:27,lapsedTouches:336},
    {revenueL:10.8,objective:'Upgrade 1M members to 3M',offer:'Friends Who Squat Together',leads:225,trials:74,buyers:12,renewalPurchases:51,reactivated:15,lapsedTouches:187},
    {revenueL:13.4,objective:'Reactivate before the festive season',offer:'The Return Policy',leads:165,trials:54,buyers:9,renewalPurchases:51,reactivated:20,lapsedTouches:244},
    {revenueL:7.0,objective:'Gift-led revenue in the weakest month',offer:'Gift a Shake',leads:148,trials:49,buyers:8,renewalPurchases:33,reactivated:21,lapsedTouches:257},
    {revenueL:11.5,objective:'Lock in longer commitments',offer:'Black Friday, Strong Monday',leads:247,trials:81,buyers:14,renewalPurchases:46,reactivated:17,lapsedTouches:214},
    {revenueL:6.5,objective:'Pre-sell January and smooth the dip',offer:'The Pre-Solution',leads:187,trials:61,buyers:10,renewalPurchases:24,reactivated:15,lapsedTouches:187},
  ]},
  'Pop-up': { sourceName:'Bengaluru Pop-ups (combined: Copper + Cloves and Plash Pilates)',annualL:19.5,ttmGrowth:'n/a · opened Oct 2025',insight:'The source combines multiple pop-up venues. Drop-ins are the largest revenue stream; only 2.9% of first visits buy a pack and observed fill is 24%.',priority:'Convert named drop-in regulars to packs and feed Kenkere through Studio Passport. Do not allocate combined source counts to an individual venue.',months:[
    {revenueL:1.6,objective:'Convert drop-in regulars into packs',offer:"Credit Where It's Due",leads:124,trials:32,buyers:2,renewalPurchases:2,reactivated:13,lapsedTouches:158},
    {revenueL:1.5,objective:'Referral acquisition',offer:'Plus-One, Minus Excuses (pop-up edition)',leads:90,trials:24,buyers:1,renewalPurchases:6,reactivated:7,lapsedTouches:90},
    {revenueL:1.4,objective:'Feed Kenkere House',offer:'Studio Passport',leads:111,trials:29,buyers:1,renewalPurchases:5,reactivated:9,lapsedTouches:113},
    {revenueL:1.1,objective:'Anniversary at the pop-ups',offer:'Still Shaking — Pop-up Edition',leads:133,trials:35,buyers:2,renewalPurchases:1,reactivated:9,lapsedTouches:117},
    {revenueL:1.3,objective:'Retain April pack buyers',offer:'The Afterparty',leads:158,trials:41,buyers:2,renewalPurchases:1,reactivated:2,lapsedTouches:23},
    {revenueL:1.8,objective:'Convert drop-ins to packs',offer:"Credit Where It's Due (refresh)",leads:154,trials:40,buyers:2,renewalPurchases:5,reactivated:14,lapsedTouches:180},
    {revenueL:1.9,objective:'Monsoon attendance',offer:'Rain Check',leads:145,trials:38,buyers:2,renewalPurchases:9,reactivated:22,lapsedTouches:270},
    {revenueL:1.8,objective:'Referral growth',offer:'Friends Who Squat Together',leads:162,trials:42,buyers:2,renewalPurchases:4,reactivated:13,lapsedTouches:158},
    {revenueL:2.5,objective:'Reactivate before the festive season',offer:'The Return Policy',leads:243,trials:63,buyers:3,renewalPurchases:10,reactivated:16,lapsedTouches:203},
    {revenueL:1.8,objective:'Gift packs',offer:'Gift a Shake',leads:168,trials:44,buyers:2,renewalPurchases:5,reactivated:32,lapsedTouches:396},
    {revenueL:1.5,objective:'Pack commitment',offer:'Pack Friday',leads:218,trials:57,buyers:3,renewalPurchases:4,reactivated:5,lapsedTouches:68},
    {revenueL:1.2,objective:'Pre-sell January',offer:'The Pre-Solution',leads:145,trials:38,buyers:2,renewalPurchases:1,reactivated:4,lapsedTouches:45},
  ]},
};

export const EXECUTION_RHYTHM = [
  ['Monday · planning','Review prior week, T−14 renewals due, trials without a purchase, and lapsed outreach; assign named lists.'],
  ['Daily · follow-up','Contact each new lead within 2 hours. Follow up after trials the same day, day 2 and day 3.'],
  ['Wednesday · funnel','Review leads, trials and conversions against the weekly target; record one corrective action.'],
  ['Friday · close','Enter revenue, leads, trials, new buyers, renewals and reactivations; mark on track / at risk / behind.'],
  ['Days 22–end · closure','Prioritise warm trials and open renewals; the source reports 35–38% of monthly sales land after day 21.'],
  ['Monthly · governance','Approve next campaign and prepare audience lists/assets 7 days ahead; review discount exposure and reforecast.'],
];
