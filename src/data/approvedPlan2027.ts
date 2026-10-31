// Final approved 2027 Sales and Offer Plan, generated from server/data/approved-plan-2027.json
// (alternatives omitted). Every plan, guide and offer text in src/data derives from this.
export type ApprovedStudio = 'Kemps Corner' | 'Bandra' | 'Kenkere House' | 'Pop-up';
export type ApprovedSlot = 'newcomer' | 'lapsed' | 'renewal';
export interface ApprovedOffer {
  slot: ApprovedSlot;
  name: string;
  tagline: string;
  fields: Record<string, string[]>;
}
export interface ApprovedEntry {
  studio: ApprovedStudio;
  month: number;
  theme: string;
  hook: string;
  job: string;
  moment: string;
  figures: {
    target: number;
    projected: number;
    newClientPlan: number;
    renewalPlan: number;
    reactivationPlan: number;
    otherPlan: number;
    leadsTrials: number[];
    renewals: number[];
    lapsed: number[];
    newBuyers: number;
  };
  offers: ApprovedOffer[];
}

export const APPROVED_PLAN_2027: ApprovedEntry[] = [
  {
    studio: 'Kemps Corner',
    month: 1,
    theme: 'Start Line',
    hook: 'New Year · seven days unlimited · the annual re-up',
    job: 'Convert January trial demand and re-up the Jan-2026 annuals (8 annuals, ₹12.5L due). Nothing launches this month, so January sells the habit: a credited first week, a free comeback class and a re-up at list — and every January membership carries into February.',
    moment:
      'January is the first week — a credited seven-day intro, a free comeback class and the annual re-up at list. Nothing launches early: every January membership carries into February, when Stronger in 30 2.0 opens.',
    figures: {
      target: 3120000,
      projected: 3280000,
      newClientPlan: 360000,
      renewalPlan: 2010000,
      reactivationPlan: 360000,
      otherPlan: 390000,
      leadsTrials: [77, 59],
      renewals: [120, 79],
      lapsed: [523, 42],
      newBuyers: 14,
    },
    offers: [
      {
        slot: 'newcomer',
        name: 'The First Seven Days',
        tagline: 'Seven days unlimited. Then decide.',
        fields: {
          Journey: ['Week Zero'],
          'Commercial job': ['Convert high-intent January leads fast'],
          'Who qualifies': ['First-time clients (phone verified).'],
          'You pay': [
            'Intro: ₹2k for the 7-day unlimited intro, credited in full against a qualifying purchase within 72 hours. Then any pack or membership at 15% off list (the standing new-client perk).',
          ],
          'You get': [
            '• Unlimited Barre and powerCycle for 7 days (max 2 classes a day)',
            '• Goal-setting chat after class 1; owner check-in on day 3',
            '• Lab Induction seat at Kwality/Bandra',
            '• Buy any pack or membership within 72 hours of day 7: full intro fee credited + the standing 15%',
            "• Buy in January and you're pre-registered for February's challenge (target scaled)",
          ],
          When: ['1–24 Jan 2027.'],
          Rules: [
            '• One intro per person',
            '• Credit only within 72 hours of day 7',
            '• The 15% is the standing new-client perk, not an extra discount.',
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹4.1L counted (+₹55.7k vs the ₹3.6L stream plan) · 18 buyers'],
          'Rate of sale': ['Needs ≈18 renewal purchases (plan 14).'],
          'Why it works': [
            'January leads are the most motivated of the year. Clients with 5+ visits in month one convert at 94%; a credited week lets the habit form before the ask, and a January purchase hands February a warm list.',
          ],
          'What to watch': ['Intro → purchase (target 45%); classes in the intro week (target 4+).'],
          'Offer auditor': [
            '22/25 (Effect 5, Creativity 4, Clarity 5, Practical 4, Economics 4). Strongest January entry: bold, clear credit rule, and it hands February a warm list.',
          ],
          Model: [
            '59 in pool × 23.7% plan rate × 1.25 conversion factor = 17.5 buyers × ₹26.7k ticket = ₹4.7L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'lapsed',
        name: 'Back to the Barre',
        tagline: 'Your barre is still here. A class on us, then the standing return price.',
        fields: {
          'Commercial job': ['Reactivate lapsed clients early in the year'],
          'Who qualifies': ['Clients lapsed 61–365 days.'],
          'You pay': ['1M unlimited: ₹17.2k (15% off the ₹20.2k list price).'],
          'You get': [
            '• 1M unlimited or a 12-class pack at the standing 15% lapsed perk',
            '• A free comeback class to book before buying',
            "• Buy in January and you're pre-registered for February's challenge",
          ],
          When: ['Buy by 24 Jan 2027.'],
          Rules: [
            '• Standing 15% lapsed perk; no extra discount',
            '• The 15% is the standing lapsed-client perk, not an extra discount.',
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹4.1L counted (+₹50.4k vs the ₹3.6L stream plan) · 48 buyers'],
          'Rate of sale': ['Needs ≈11 1M unlimited sales vs 29 a month today (all buyers).'],
          'Why it works': [
            "Early January is the cheapest week of the year to win someone back: intent is high and the timetable is full. A free comeback class takes the risk out of the first visit, and a January purchase puts them in February's challenge.",
          ],
          'What to watch': ['Lapsed clients buying before 24 Jan.'],
          'Offer auditor': [
            '23/25 (Effect 5, Creativity 4, Clarity 5, Practical 5, Economics 4). A deadline with a reason behind it, and no discount given away.',
          ],
          Model: [
            '523 in pool × 8.0% plan rate × 1.15 conversion factor = 48.3 buyers × ₹9.4k ticket (23% take the featured product) = ₹4.6L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'renewal',
        name: 'The Annual Re-Up',
        tagline: "The January annuals renew at list — and February's challenge comes with them.",
        fields: {
          'Commercial job': ['Re-up the January-2026 annuals at list'],
          'Who qualifies': ['Annual members whose 2026 term started in January (8 annuals, ₹12.5L due).'],
          'You pay': ["Renewal at your product's list price (no % off)."],
          'You get': [
            '• +7 days on 3M, +14 days on 6M or 12M when you re-up by 31 Jan',
            '• Entry to February’s challenge, target scaled to the new term',
          ],
          When: ['2–31 Jan 2027.'],
          Rules: [
            '• No % discount',
            '• Bonus days are earned by re-upping in January',
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '7.0% effective = 0% cash + 7.0% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹20.7L counted (+₹50.4k vs the ₹20.1L stream plan) · 83 buyers'],
          'Rate of sale': ['Needs ≈83 renewal purchases (plan 79).'],
          'Why it works': [
            'Full-price renewers renew again at 61–68% vs 50–54% after a discount. January is when the annuals fall due; a small term bonus is cheaper than a percentage, and it starts the year at list.',
          ],
          'What to watch': ['Annuals re-upped; renewal yield.'],
          'Offer auditor': [
            '22/25 (Effect 5, Creativity 4, Clarity 4, Practical 4, Economics 5). Best renewal mechanic of the set: the bonus is earned by showing up, not by discounting.',
          ],
          Model: [
            '120 in pool × 65.8% plan rate × 1.05 conversion factor = 83.0 buyers × ₹25.5k ticket = ₹21.2L modelled; 50% of uplift counted',
          ],
        },
      },
    ],
  },
  {
    studio: 'Kemps Corner',
    month: 2,
    theme: 'Stronger in 30 2.0',
    hook: "The 30-day challenge (1–28 Feb) · Valentine's (Sun 14 Feb) · Galentine's (Sat 13 Feb)",
    job: "Run the challenge as the month's engine: fill the opening week, hold the middle at Galentine's, and convert finishers into renewals at list. The duo and referral offers run on top (BOGO buyers were 79–94% existing clients and renewed at 33–53%).",
    moment:
      "Stronger in 30 2.0 runs 1–28 Feb for active members and pack holders. The Galentine's hosted class on Sat 13 Feb — named associate, Encore QR at the door — is the mid-challenge event; Valentine's Sunday (14 Feb) is the partner class.",
    figures: {
      target: 2430000,
      projected: 2510000,
      newClientPlan: 320000,
      renewalPlan: 1580000,
      reactivationPlan: 220000,
      otherPlan: 310000,
      leadsTrials: [101, 78],
      renewals: [83, 85],
      lapsed: [456, 36],
      newBuyers: 17,
    },
    offers: [
      {
        slot: 'newcomer',
        name: 'Week Zero',
        tagline: 'Seven days unlimited. Then the challenge clock starts.',
        fields: {
          Journey: ['Week Zero'],
          'Commercial job': ['Convert high-intent February leads fast'],
          'Who qualifies': ['First-time clients (phone verified).'],
          'You pay': [
            'Intro: ₹2k for the 7-day unlimited intro, credited in full against a qualifying purchase within 72 hours. Then any pack or membership at 15% off list (the standing new-client perk).',
          ],
          'You get': [
            '• Unlimited Barre and powerCycle for 7 days (max 2 classes a day)',
            '• Goal-setting chat after class 1; owner check-in on day 3',
            '• Lab Induction seat at Kwality/Bandra',
            '• Buy any pack or membership within 72 hours of day 7: full intro fee credited + the standing 15%',
            '• A membership makes you eligible for Stronger in 30 2.0 from the week you join (target scaled)',
          ],
          When: ['1–21 Feb 2027.'],
          Rules: [
            '• One intro per person',
            '• Credit only within 72 hours of day 7',
            '• The 15% is the standing new-client perk, not an extra discount.',
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹1.7L counted · 6 buyers (the month runs two new-client routes; this is its share)'],
          'Rate of sale': ['Needs ≈18 renewal purchases (plan 14).'],
          'Why it works': [
            'February leads arrive with a deadline attached. Clients with 5+ visits in month one convert at 94%; a credited week lets the habit form before the ask, and the challenge clock gives the month its reason to start now.',
          ],
          'What to watch': ['Intro → purchase (target 45%); classes in the intro week (target 4+).'],
          'Offer auditor': [
            '22/25 (Effect 5, Creativity 4, Clarity 5, Practical 4, Economics 4). Strongest February entry: bold, clear credit rule, tied to the challenge.',
          ],
          Model: [
            '59 in pool × 23.7% plan rate × 1.25 conversion factor = 17.5 buyers × ₹26.7k ticket = ₹4.7L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'lapsed',
        name: 'Back for Stronger',
        tagline: "The challenge starts without you. Unless you're back by 7 Feb.",
        fields: {
          'Commercial job': ['Reactivate lapsed clients through the challenge'],
          'Who qualifies': ['Clients lapsed 61–365 days.'],
          'You pay': ['1M unlimited: ₹17.2k (15% off the ₹20.2k list price).'],
          'You get': [
            '• 1M unlimited or a 12-class pack at the standing 15% lapsed perk',
            '• Full entry to Stronger in 30 2.0, including finisher rewards',
            '• A free comeback class to book before buying',
          ],
          When: ['Buy by 7 Feb for full eligibility; 8–15 Feb entries get a scaled target.'],
          Rules: [
            '• Standing 15% lapsed perk; no extra discount',
            '• The 15% is the standing lapsed-client perk, not an extra discount.',
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹1.4L counted · 5 buyers (the month runs two comeback routes; this is its share)'],
          'Rate of sale': ['Needs ≈11 1M unlimited sales vs 29 a month today (all buyers).'],
          'Why it works': [
            'The challenge is for members and pack holders, so a lapsed client has to buy to take part. A deadline and a social event do more than a deeper discount.',
          ],
          'What to watch': ['Lapsed clients entering the challenge.'],
          'Offer auditor': [
            '23/25 (Effect 5, Creativity 4, Clarity 5, Practical 5, Economics 4). Uses the challenge as the reason to return; no extra cost.',
          ],
          Model: [
            '523 in pool × 8.0% plan rate × 1.15 conversion factor = 48.3 buyers × ₹9.4k ticket (23% take the featured product) = ₹4.6L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'renewal',
        name: 'Finish Line Renewal',
        tagline: 'Finish Stronger in 30 and your renewal gets a medal.',
        fields: {
          'Commercial job': ['Use challenge attendance to drive renewals at list'],
          'Who qualifies': ['Active members renewing in late February or early March.'],
          'You pay': ["Renewal at your product's list price (no % off)."],
          'You get': [
            '• Challenge finishers renew at list and get: +7 days on 1M, +2 classes on a pack, +14 days on 3M or longer',
            '• Members who reach 50% of the target get +3 days on 1M or +1 class on a pack',
          ],
          When: ['Renew 22 Feb–10 Mar 2027.'],
          Rules: [
            '• No % discount',
            '• Bonus is earned through challenge attendance',
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '7.0% effective = 0% cash + 7.0% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹8.9L counted · 34 buyers (the month runs two renewal routes; this is its share)'],
          'Rate of sale': ['Needs ≈83 renewal purchases (plan 79).'],
          'Why it works': [
            'Renewers average 6.4 visits in the first half of a membership vs 2.6–3.4 for lapsers. Rewarding finishers pays for the behaviour that produces renewals; full-price renewers renew again at 61–68% vs 50–54% after discounts.',
          ],
          'What to watch': ['Challenge finish rate; renewal yield.'],
          'Offer auditor': [
            '22/25 (Effect 5, Creativity 4, Clarity 4, Practical 4, Economics 5). Best renewal mechanic of the year: earned, cheap, on-theme.',
          ],
          Model: [
            '120 in pool × 65.8% plan rate × 1.05 conversion factor = 83.0 buyers × ₹25.5k ticket = ₹21.2L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'newcomer',
        name: 'The Second Date for Two',
        tagline: 'Bring someone. You both join the challenge.',
        fields: {
          Journey: ['The Second Date'],
          'Commercial job': ['Two genuinely new clients per sale'],
          'Who qualifies': ['Two first-timers who trial together.'],
          'You pay': ['1M unlimited: ₹17.2k (15% off the ₹20.2k list price).'],
          'You get': [
            '• Free first Barre class for both',
            '• Class 2 booked together before leaving, free within 7 days',
            '• Both buy within 72 hours of class 2: standing 15% each + one shared 30-minute duo private',
            '• Both enter Stronger in 30 2.0 on purchase; both count as finishers if they hit the target',
          ],
          When: ['1–28 Feb.'],
          Rules: [
            '• Both must be new to P57',
            '• The 15% is the standing new-client perk, not an extra discount.',
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '21.5% effective = 15% cash + 6.5% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹1.5L counted · 5 buyers (the month runs two new-client routes; this is its share)'],
          'Rate of sale': ['Needs ≈11 1M unlimited sales vs 29 a month today (all buyers).'],
          'Why it works': [
            'Replaces BOGO (mostly existing clients, 33–53% renewal). Pairs keep each other attending, and the booked second class is the lever. Pairing them into the challenge gives the second class a deadline.',
          ],
          'What to watch': ['Both new (check in Momence).'],
          'Offer auditor': [
            '22/25 (Effect 5, Creativity 4, Clarity 5, Practical 4, Economics 4). Duo version of the core fix.',
          ],
          Model: [
            '78 in pool × 21.8% plan rate × 1.24 conversion factor = 21.1 buyers × ₹18.3k ticket (50% take the featured product) = ₹3.8L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'lapsed',
        name: "It's Not You, It's Our Schedule",
        tagline: "Let's try again. This time with freezes — and a challenge to come back for.",
        fields: {
          'Commercial job': ['Reactivate with humour and flexibility'],
          'Who qualifies': ['Clients lapsed 61–365 days.'],
          'You pay': ['1M unlimited: ₹17.2k (15% off the ₹20.2k list price).'],
          'You get': [
            '• 1M unlimited at the standing 15% lapsed perk',
            "• 2 extra freezes so travel can't break it again",
            '• A free comeback class to book first',
            '• Entry to Stronger in 30 2.0, target scaled to the return date',
          ],
          When: ['1–28 Feb.'],
          Rules: [
            '• Standing perk; no extra % off',
            '• The 15% is the standing lapsed-client perk, not an extra discount.',
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹0.8L counted · 3 buyers (the month runs two comeback routes; this is its share)'],
          'Rate of sale': ['Needs ≈7 1M unlimited sales vs 29 a month today (all buyers).'],
          'Why it works': [
            "Valentine's gives a story without a deeper discount; freezes answer the most common lapse reason.",
          ],
          'What to watch': ['Message open-to-buy rate.'],
          'Offer auditor': [
            '21/25 (Effect 3, Creativity 4, Clarity 5, Practical 5, Economics 4). Fun copy; mechanics are standard.',
          ],
          Model: [
            '456 in pool × 7.9% plan rate × 1.00 conversion factor = 36.0 buyers × ₹7.3k ticket (20% take the featured product) = ₹2.6L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'renewal',
        name: 'Partners in Crime',
        tagline: 'Renew with your workout partner. You both finish the challenge.',
        fields: {
          'Commercial job': ['Social accountability at renewal'],
          'Who qualifies': ['Two active members renewing in the same week.'],
          'You pay': ["Renewal at your product's list price (no % off)."],
          'You get': [
            '• Each gets +3 days on 1M, +1 class on a pack, or +7 days on 3M or longer',
            '• Both enter Stronger in 30 2.0; finishers keep the renewal bonus',
          ],
          When: ['All February.'],
          Rules: [
            '• Both renewals at list',
            '• Register the pair at the desk',
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '6.0% effective = 0% cash + 6.0% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹6.9L counted · 36 buyers (the month runs two renewal routes; this is its share)'],
          'Rate of sale': ['Needs ≈88 renewal purchases (plan 85).'],
          'Why it works': ['Pairs keep each other attending; attendance predicts renewal. Tag pairs to measure it.'],
          'What to watch': ['Next-renewal rate of pairs vs singles.'],
          'Offer auditor': [
            '22/25 (Effect 4, Creativity 4, Clarity 5, Practical 4, Economics 5). Cheap, social, on-theme.',
          ],
          Model: [
            '83 in pool × 102.4% plan rate × 1.03 conversion factor = 87.5 buyers × ₹18.6k ticket = ₹16.3L modelled; 50% of uplift counted',
          ],
        },
      },
    ],
  },
  {
    studio: 'Kemps Corner',
    month: 3,
    theme: 'She Moves',
    hook: "International Women's Day (Mon 8 Mar)",
    job: "Purpose-led reach; Bandra reactivation; stop March trials from waiting for the anniversary. Keep February's challenge finishers attending.",
    moment: 'Class of 2024 Reunion at Bandra (638 lapsed launch-cohort clients). Anniversary teaser from 16 Mar.',
    figures: {
      target: 2430000,
      projected: 2530000,
      newClientPlan: 370000,
      renewalPlan: 1410000,
      reactivationPlan: 350000,
      otherPlan: 310000,
      leadsTrials: [96, 74],
      renewals: [100, 61],
      lapsed: [561, 45],
      newBuyers: 16,
    },
    offers: [
      {
        slot: 'newcomer',
        name: 'The Second Date',
        tagline: 'Your second class is booked before you leave.',
        fields: {
          Journey: ['The Second Date'],
          'Commercial job': ['Core free-trial journey'],
          'Who qualifies': ['First-time clients starting with Barre.'],
          'You pay': ['Then any pack or membership at 15% off list (the standing new-client perk).'],
          'You get': [
            '• Free first Barre class',
            '• Class 2 free within 7 days, booked at the desk',
            '• 15% within 72 hours of class 2; 10% until day 14',
          ],
          When: ['All March.'],
          Rules: [
            '• Strength Lab not included',
            '• The 15% is the standing new-client perk, not an extra discount.',
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹4.0L counted (+₹33.2k vs the ₹3.7L stream plan) · 19 buyers'],
          'Rate of sale': ['Needs ≈19 renewal purchases (plan 16).'],
          'Why it works': ['March is a trough; protecting the second visit protects conversion.'],
          'What to watch': ['Second-visit share.'],
          'Offer auditor': ['23/25 (Effect 5, Creativity 4, Clarity 5, Practical 5, Economics 4). Reliable core.'],
          Model: [
            '74 in pool × 21.6% plan rate × 1.18 conversion factor = 18.9 buyers × ₹23.1k ticket = ₹4.4L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'lapsed',
        name: 'Beat Your Best',
        tagline: "Remember March 2025? 18 classes. Let's beat it.",
        fields: {
          'Commercial job': ['Personalised reactivation from attendance history'],
          'Who qualifies': ['Lapsed clients with a recorded best month.'],
          'You pay': ['1M unlimited: ₹20.2k (list price).'],
          'You get': ['• 1M unlimited at list', "• Match your best month's class count → +6 days"],
          When: ['All March.'],
          Rules: [
            '• Replaces the 15% lapsed perk',
            '• Needs a best-month field from Momence',
            "• Replaces the standing 15% perk; the two don't combine.",
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '20.0% effective = 0% cash + 20.0% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹3.9L counted (+₹42k vs the ₹3.5L stream plan) · 47 buyers'],
          'Rate of sale': ['Needs ≈11 1M unlimited sales vs 29 a month today (all buyers).'],
          'Why it works': ['Personal data beats generic offers and sets a goal; the reward is earned.'],
          'What to watch': ['Data build needed.'],
          'Offer auditor': [
            '20/25 (Effect 4, Creativity 5, Clarity 4, Practical 3, Economics 4). Creative; depends on data work.',
          ],
          Model: [
            '561 in pool × 8.0% plan rate × 1.05 conversion factor = 47.3 buyers × ₹9.1k ticket (23% take the featured product) = ₹4.3L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'renewal',
        name: 'Lock In Early',
        tagline: 'Renew in March, keep the anniversary perks.',
        fields: {
          'Commercial job': ['Protect Q1 renewals without pull-forward discounts'],
          'Who qualifies': ['Members expiring 1 Mar–15 Apr.'],
          'You pay': ["Renewal at your product's list price (no % off)."],
          'You get': [
            '• Renew at list + 2 bonus classes (packs) or +7 days (unlimited)',
            '• First booking window for anniversary party classes',
          ],
          When: ['All March.'],
          Rules: ['• No % discount', "• Doesn't combine with any other campaign offer."],
          'Effective discount': [
            '7.0% effective = 0% cash + 7.0% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹14.4L counted (+₹28.2k vs the ₹14.1L stream plan) · 63 buyers'],
          'Rate of sale': ['Needs ≈63 renewal purchases (plan 61).'],
          'Why it works': [
            "In 2026, ₹36.7L of Kwality's April came from early renewals at 30%+. Bonus time protects the ticket.",
          ],
          'What to watch': ['March renewals vs due.'],
          'Offer auditor': [
            '21/25 (Effect 4, Creativity 3, Clarity 5, Practical 5, Economics 4). Necessary guardrail before April.',
          ],
          Model: [
            '100 in pool × 61.0% plan rate × 1.04 conversion factor = 63.4 buyers × ₹23.1k ticket = ₹14.7L modelled; 50% of uplift counted',
          ],
        },
      },
    ],
  },
  {
    studio: 'Kemps Corner',
    month: 4,
    theme: 'Cloud Nine (9th anniversary)',
    hook: '9 years of Physique 57 India · first ₹1 Cr month',
    job: "The year's best, most playful offers and the first ₹1 Cr sales month (target ₹104.5L), without the 26–31% discounts of April 2026. Caps: 20% on ≤1M products, 15% on 3M+.",
    moment:
      'Club Nine: 9 numbered annual memberships per studio at full price. Anniversary party classes in week 2. Hard close 30 Apr, 23:59.',
    figures: {
      target: 5760000,
      projected: 6250000,
      newClientPlan: 520000,
      renewalPlan: 3780000,
      reactivationPlan: 730000,
      otherPlan: 730000,
      leadsTrials: [114, 88],
      renewals: [120, 130],
      lapsed: [951, 76],
      newBuyers: 18,
    },
    offers: [
      {
        slot: 'newcomer',
        name: 'Cloud Nine Intro',
        tagline: 'Nine days unlimited for less than one class.',
        fields: {
          Journey: ['Week Zero'],
          'Commercial job': ["The year's boldest acquisition offer"],
          'Who qualifies': ['First-time clients (phone verified).'],
          'You pay': [
            'Intro: ₹1k for the 9-day unlimited intro, credited in full against a qualifying purchase within 72 hours. Then any pack or membership at 15% off list (the standing new-client perk).',
          ],
          'You get': [
            '• Unlimited Barre and powerCycle for 9 days (max 2 a day) + a Lab Induction seat (Kwality/Bandra)',
            '• Buy any pack or membership within 72 hours of day 9: intro fee credited + standing 15% + anniversary tote (≈₹1,000)',
          ],
          When: ['1–21 Apr (so the intro ends inside April).'],
          Rules: [
            '• One intro per person',
            '• Tote only with the 72-hour purchase',
            '• The 15% is the standing new-client perk, not an extra discount.',
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '21.0% effective = 15% cash + 6.0% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹6.3L counted (+₹1.1L vs the ₹5.2L stream plan) · 24 buyers'],
          'Rate of sale': ['Needs ≈24 renewal purchases (plan 18).'],
          'Why it works': [
            'The anniversary is worth an eye-catching price. Nine days builds the habit; the credited purchase protects the commitment price.',
          ],
          'What to watch': ['Intro volume vs spare seats; intro → purchase (target 40%).'],
          'Offer auditor': [
            '23/25 (Effect 5, Creativity 5, Clarity 5, Practical 4, Economics 4). Headline April offer.',
          ],
          Model: [
            '88 in pool × 20.5% plan rate × 1.35 conversion factor = 24.3 buyers × ₹30.5k ticket = ₹7.4L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'lapsed',
        name: 'Since Day One',
        tagline: 'You first shook with us on 12 Jun 2023. One class for every year.',
        fields: {
          'Commercial job': ['Reward loyalty in classes, not price'],
          'Who qualifies': ['Lapsed clients (first-class date known).'],
          'You pay': ['12-class pack: ₹19.7k (list price).'],
          'You get': ['• 12-class pack at list', '• 1 bonus class for each year since your first class (max 2)'],
          When: ['All April.'],
          Rules: [
            '• Replaces the 15% lapsed perk',
            "• Replaces the standing 15% perk; the two don't combine.",
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '14.8% effective = 0% cash + 14.8% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹8.0L counted (+₹67.9k vs the ₹7.3L stream plan) · 80 buyers'],
          'Rate of sale': ['Needs ≈20 12-class pack sales vs 28 a month today (all buyers).'],
          'Why it works': [
            'Anniversary month, personal anniversary. First-visit dates are in the Day End – New export.',
          ],
          'What to watch': ['Personalisation needs a mail-merge of first-class dates.'],
          'Offer auditor': [
            '22/25 (Effect 4, Creativity 5, Clarity 5, Practical 4, Economics 4). Personal and on-theme.',
          ],
          Model: [
            '951 in pool × 8.0% plan rate × 1.05 conversion factor = 79.8 buyers × ₹10.9k ticket (25% take the featured product) = ₹8.7L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'renewal',
        name: 'Club Nine',
        tagline: 'Nine numbered memberships per studio. Full price. Founder perks.',
        fields: {
          'Commercial job': ['Sell annuals at list through scarcity'],
          'Who qualifies': ['Active members (and lapsed high-value clients).'],
          'You pay': ['Annual unlimited: ₹2.2L (list price).'],
          'You get': [
            '• Annual unlimited at full list price, numbered 1–9 at each studio',
            '• 2 extra privates (4 in total with the standing 2)',
            '• Name on the Club Nine wall',
            '• 48-hour early booking all year',
            '• 4 extra guest passes and an anniversary box',
          ],
          When: ['From 1 Apr until seats run out; remaining seats return in November.'],
          Rules: [
            '• 9 seats per studio (KH, SHQ, KK); no seats added',
            '• Public seat counter',
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '5.7% effective = 0% cash + 5.7% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹40.9L counted (+₹3.1L vs the ₹37.8L stream plan) · 130 buyers'],
          'Rate of sale': ['Needs ≈7 Annual unlimited sales vs 3 a month today (all buyers).'],
          'Why it works': [
            'Scarcity replaces a price lock (no list-price change in 2027). Kwality sells about 3 annuals a month, so 9 in April is a stretch but credible.',
          ],
          'What to watch': ['Seat counter by studio. Effective ≈5.7% (Mumbai) / 6.6% (Bengaluru).'],
          'Offer auditor': [
            '23/25 (Effect 4, Creativity 5, Clarity 5, Practical 4, Economics 5). Creative and protects price.',
          ],
          Model: [
            '120 in pool × 108.3% plan rate × 1.00 conversion factor = 130.0 buyers × ₹33.8k ticket (5% take the featured product) = ₹44.0L modelled; 50% of uplift counted',
          ],
        },
      },
    ],
  },
  {
    studio: 'Kemps Corner',
    month: 5,
    theme: 'The Afterparty',
    hook: "Mother's Day (Sun 9 May)",
    job: 'Retain the April cohort (target ≥55% renewal at next expiry vs 24.5% for 2026 anniversary-code buyers at Kwality); duo acquisition.',
    moment:
      'Every April buyer gets the 30-day Afterparty plan: week-1 call, 8 classes in May unlocks a hosted class and a progress check.',
    figures: {
      target: 2730000,
      projected: 2830000,
      newClientPlan: 500000,
      renewalPlan: 1490000,
      reactivationPlan: 390000,
      otherPlan: 340000,
      leadsTrials: [134, 103],
      renewals: [108, 65],
      lapsed: [644, 51],
      newBuyers: 22,
    },
    offers: [
      {
        slot: 'newcomer',
        name: 'Mother Shaker Second Date',
        tagline: 'Bring your mum. Both second classes are on us.',
        fields: {
          Journey: ['The Second Date'],
          'Commercial job': ["Duo acquisition around Mother's Day"],
          'Who qualifies': ['A mother and a family member, both new.'],
          'You pay': ['1M unlimited: ₹17.2k (15% off the ₹20.2k list price).'],
          'You get': [
            '• Free first Barre class for both',
            '• Class 2 booked together, free within 7 days',
            '• Both buy within 72 hours of class 2: standing 15% each + one shared 30-minute duo private',
          ],
          When: ['1–16 May.'],
          Rules: [
            '• Both must be new',
            '• The 15% is the standing new-client perk, not an extra discount.',
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '21.5% effective = 15% cash + 6.5% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹5.5L counted (+₹40.8k vs the ₹5.0L stream plan) · 27 buyers'],
          'Rate of sale': ['Needs ≈14 1M unlimited sales vs 29 a month today (all buyers).'],
          'Why it works': ['Duo + booked second class.'],
          'What to watch': ['Both new.'],
          'Offer auditor': ['21/25 (Effect 4, Creativity 4, Clarity 5, Practical 4, Economics 4). Good seasonal duo.'],
          Model: [
            '103 in pool × 21.4% plan rate × 1.24 conversion factor = 27.3 buyers × ₹21.5k ticket (50% take the featured product) = ₹5.9L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'lapsed',
        name: 'A Class for Mum',
        tagline: 'Come back, and bring your mother for free.',
        fields: {
          'Commercial job': ['Reactivation with a gift'],
          'Who qualifies': ['Lapsed clients.'],
          'You pay': ['12-class pack: ₹16.7k (15% off the ₹19.7k list price).'],
          'You get': ['• 12-class pack at the standing 15%', '• A free class for their mother (or any mum)'],
          When: ['1–16 May.'],
          Rules: [
            '• Gift class within 30 days',
            '• The 15% is the standing lapsed-client perk, not an extra discount.',
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹4.2L counted (+₹28.8k vs the ₹3.9L stream plan) · 51 buyers'],
          'Rate of sale': ['Needs ≈13 12-class pack sales vs 28 a month today (all buyers).'],
          'Why it works': ['On-theme, cash cost unchanged, gift class is a warm lead.'],
          'What to watch': ['Gift classes booked.'],
          'Offer auditor': ['20/25 (Effect 3, Creativity 3, Clarity 5, Practical 5, Economics 4). Pleasant; modest.'],
          Model: [
            '644 in pool × 7.9% plan rate × 1.00 conversion factor = 51.0 buyers × ₹8.8k ticket (25% take the featured product) = ₹4.5L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'renewal',
        name: 'The Afterparty',
        tagline: 'Book 8 in May; get a hosted class and a progress check.',
        fields: {
          'Commercial job': ['Retain the April cohort'],
          'Who qualifies': ['April buyers and May renewers.'],
          'You pay': ["Renewal at your product's list price (no % off)."],
          'You get': ['• Book 8 classes in May → a free hosted class + a trainer progress check', '• Renew at list'],
          When: ['All May.'],
          Rules: ['• No % discount', "• Doesn't combine with any other campaign offer."],
          'Effective discount': [
            '2.0% effective = 0% cash + 2.0% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹15.2L counted (+₹29.9k vs the ₹14.9L stream plan) · 68 buyers'],
          'Rate of sale': ['Needs ≈68 renewal purchases (plan 65).'],
          'Why it works': [
            'Target ≥55% of April commitment buyers renewing at next expiry (2026 code buyers: 24.5% at Kwality).',
          ],
          'What to watch': ['April cohort attendance in May.'],
          'Offer auditor': [
            '22/25 (Effect 5, Creativity 3, Clarity 5, Practical 4, Economics 5). Protects the April investment.',
          ],
          Model: [
            '108 in pool × 60.2% plan rate × 1.04 conversion factor = 67.6 buyers × ₹23k ticket = ₹15.5L modelled; 50% of uplift counted',
          ],
        },
      },
    ],
  },
  {
    studio: 'Kemps Corner',
    month: 6,
    theme: 'Out of Office',
    hook: "Summer travel · college holidays · Father's Day (Sun 20 Jun)",
    job: 'Stop summer lapses; fill weekday 10–12 and weekend 4–7 pm (27–41% full) with students.',
    moment: 'Golden Hours launch for students and under-25s.',
    figures: {
      target: 2720000,
      projected: 3090000,
      newClientPlan: 490000,
      renewalPlan: 1550000,
      reactivationPlan: 330000,
      otherPlan: 340000,
      leadsTrials: [151, 116],
      renewals: [133, 76],
      lapsed: [607, 49],
      newBuyers: 24,
    },
    offers: [
      {
        slot: 'newcomer',
        name: 'Week Zero: Home for the Summer',
        tagline: 'Back in town? A week unlimited, credited if you stay.',
        fields: {
          Journey: ['Week Zero'],
          'Commercial job': ['Capture visitors and returning students'],
          'Who qualifies': ['First-time clients.'],
          'You pay': [
            'Intro: ₹2k for the 7-day unlimited intro, credited in full against a qualifying purchase within 72 hours. Then any pack or membership at 15% off list (the standing new-client perk).',
          ],
          'You get': [
            '• 7 days unlimited (max 2 a day)',
            '• Credited within 72 hours against any pack or membership + standing 15%',
            '• Buy 1M before you travel → 1 virtual private to use abroad',
          ],
          When: ['All June.'],
          Rules: [
            '• One intro per person',
            '• The 15% is the standing new-client perk, not an extra discount.',
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹5.5L counted (+₹61.2k vs the ₹4.9L stream plan) · 30 buyers'],
          'Rate of sale': ['Needs ≈30 renewal purchases (plan 24).'],
          'Why it works': ['Short-stay visitors need a short, intense entry.'],
          'What to watch': ['Intro conversion.'],
          'Offer auditor': ['21/25 (Effect 4, Creativity 4, Clarity 5, Practical 4, Economics 4). Seasonal fit.'],
          Model: [
            '116 in pool × 20.7% plan rate × 1.25 conversion factor = 30.0 buyers × ₹20.4k ticket = ₹6.1L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'lapsed',
        name: 'Out of Office, Not Out of Shape',
        tagline: "Freeze when you fly. Train when you're home.",
        fields: {
          'Commercial job': ['Reactivate travellers'],
          'Who qualifies': ['Lapsed clients.'],
          'You pay': ['1M unlimited: ₹17.2k (15% off the ₹20.2k list price).'],
          'You get': ['• 1M at the standing 15%', '• 2 extra freezes', '• A written travel workout plan'],
          When: ['All June.'],
          Rules: [
            '• Standing perk',
            '• The 15% is the standing lapsed-client perk, not an extra discount.',
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹3.6L counted (+₹28.7k vs the ₹3.3L stream plan) · 49 buyers'],
          'Rate of sale': ['Needs ≈11 1M unlimited sales vs 29 a month today (all buyers).'],
          'Why it works': ['Answers "I\'ll be away" without cash.'],
          'What to watch': ['Freeze usage.'],
          'Offer auditor': ['20/25 (Effect 3, Creativity 3, Clarity 5, Practical 5, Economics 4). Fine.'],
          Model: [
            '607 in pool × 8.1% plan rate × 1.00 conversion factor = 49.0 buyers × ₹8k ticket (23% take the featured product) = ₹3.9L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'renewal',
        name: 'The Pause Button',
        tagline: 'Three months unlimited. Freeze it as often as you like.',
        fields: {
          'Commercial job': ['Stop summer lapses'],
          'Who qualifies': ['1M and 3M renewers.'],
          'You pay': ['3M unlimited: ₹57.9k (list price).'],
          'You get': ['• 3M unlimited at list', '• Unlimited freezes (use within 6 months)'],
          When: ['All June.'],
          Rules: ['• Freezes in blocks of 3+ days', "• Doesn't combine with any other campaign offer."],
          'Effective discount': [
            '0.0% effective = 0% cash. Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹18.3L counted (+₹2.8L vs the ₹15.5L stream plan) · 78 buyers'],
          'Rate of sale': ['Needs ≈27 3M unlimited sales vs 9.8 a month today (all buyers).'],
          'Why it works': [
            'The best time of year for this offer: travel is the main reason to let a membership lapse.',
          ],
          'What to watch': ['June renewal yield.'],
          'Offer auditor': ['23/25 (Effect 5, Creativity 4, Clarity 5, Practical 4, Economics 5). Peak relevance.'],
          Model: [
            '133 in pool × 57.1% plan rate × 1.03 conversion factor = 78.3 buyers × ₹27k ticket (35% take the featured product) = ₹21.1L modelled; 50% of uplift counted',
          ],
        },
      },
    ],
  },
  {
    studio: 'Kemps Corner',
    month: 7,
    theme: 'Monsoon I: Rain Check',
    hook: 'Monsoon · Amazing Race warm-up',
    job: 'Attendance and late cancels (Kenkere 21–30%); get people on a membership before the race starts on 1 Aug.',
    moment: 'Race registrations open 15 Jul. Monsoon Streak leaderboard by studio.',
    figures: {
      target: 3180000,
      projected: 3300000,
      newClientPlan: 500000,
      renewalPlan: 1880000,
      reactivationPlan: 400000,
      otherPlan: 400000,
      leadsTrials: [130, 100],
      renewals: [129, 79],
      lapsed: [638, 51],
      newBuyers: 21,
    },
    offers: [
      {
        slot: 'newcomer',
        name: 'Kickstart 21: Race Ready Cohort',
        tagline: '21 days that end on the Amazing Race start line.',
        fields: {
          Journey: ['Kickstart 21'],
          'Commercial job': ['Get new clients race-fit and converted before August'],
          'Who qualifies': ['First-time clients.'],
          'You pay': ['Kickstart 21 cohort: ₹10k (list price).'],
          'You get': [
            '• Cohort Mon 12 Jul → graduates 1 Aug, race day one',
            '• 21 days unlimited + coach, WhatsApp, fitness checks',
            '• Graduates: standing 15% within 7 days and a Rookie leaderboard entry',
          ],
          When: ['Book by 11 Jul.'],
          Rules: [
            '• Cohort fee not credited',
            "• Replaces the standing 15% perk; the two don't combine.",
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '0.0% effective = 0% cash. Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹4.9L counted (−₹10.8k vs the ₹5.0L stream plan) · 23 buyers'],
          'Rate of sale': ['Needs ≈10 Kickstart 21 cohort sales (new product, no current rate).'],
          'Why it works': ['Gives July a goal and a date; graduation lands on the race start.'],
          'What to watch': ['Graduates entering the race.'],
          'Offer auditor': [
            '23/25 (Effect 5, Creativity 5, Clarity 5, Practical 4, Economics 4). Elegant link to August.',
          ],
          Model: [
            '100 in pool × 21.0% plan rate × 1.10 conversion factor = 23.1 buyers × ₹20.6k ticket (45% take the featured product) = ₹4.8L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'lapsed',
        name: 'Warm-Up Lap',
        tagline: 'Get race-fit before the gun goes on 1 August.',
        fields: {
          'Commercial job': ['Reactivate into the race'],
          'Who qualifies': ['Lapsed clients.'],
          'You pay': ['1M unlimited: ₹17.2k (15% off the ₹20.2k list price).'],
          'You get': [
            '• 1M at the standing 15%, start 15 Jul–1 Aug',
            '• Free race-prep assessment',
            '• Full race entry',
          ],
          When: ['15–31 Jul.'],
          Rules: [
            '• Standing perk',
            '• The 15% is the standing lapsed-client perk, not an extra discount.',
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹4.5L counted (+₹49.5k vs the ₹4.0L stream plan) · 56 buyers'],
          'Rate of sale': ['Needs ≈13 1M unlimited sales vs 29 a month today (all buyers).'],
          'Why it works': ['An event with a date beats a discount for lapsed clients.'],
          'What to watch': ['Lapsed race entries.'],
          'Offer auditor': ['23/25 (Effect 5, Creativity 4, Clarity 5, Practical 5, Economics 4). Strong hook.'],
          Model: [
            '638 in pool × 8.0% plan rate × 1.10 conversion factor = 56.1 buyers × ₹8.9k ticket (23% take the featured product) = ₹5.0L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'renewal',
        name: 'Midyear Report Card',
        tagline: 'Your half-year, in numbers.',
        fields: {
          'Commercial job': ['Usage-led renewal'],
          'Who qualifies': ['July renewers.'],
          'You pay': ["Renewal at your product's list price (no % off)."],
          'You get': [
            '• Personal half-year stats and a trainer review',
            '• Renew the recommended product at list → 2 guest passes',
          ],
          When: ['All July.'],
          Rules: ['• No % discount', "• Doesn't combine with any other campaign offer."],
          'Effective discount': [
            '0.0% effective = 0% cash. Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹19.6L counted (+₹86.2k vs the ₹18.8L stream plan) · 81 buyers'],
          'Rate of sale': ['Needs ≈81 renewal purchases (plan 79).'],
          'Why it works': ['A mid-year version of Wrapped that moves members to the right product.'],
          'What to watch': ['Needs stats export.'],
          'Offer auditor': [
            '20/25 (Effect 4, Creativity 4, Clarity 4, Practical 3, Economics 5). Good if data is ready.',
          ],
          Model: [
            '129 in pool × 61.2% plan rate × 1.03 conversion factor = 81.4 buyers × ₹25.2k ticket = ₹20.5L modelled; 50% of uplift counted',
          ],
        },
      },
    ],
  },
  {
    studio: 'Kemps Corner',
    month: 8,
    theme: 'The Amazing Race 2.0',
    hook: 'Month-long individual race · Friendship Day (Sun 1 Aug)',
    job: 'Attendance-led renewals and upgrades; bring new clients in on a Rookie leaderboard; second seasonal peak in Mumbai.',
    moment:
      'The Amazing Race 2.0: every client races on their own against a studio leaderboard, 1–31 Aug. Rookie leaderboard for first-timers.',
    figures: {
      target: 3600000,
      projected: 3890000,
      newClientPlan: 580000,
      renewalPlan: 2210000,
      reactivationPlan: 350000,
      otherPlan: 450000,
      leadsTrials: [142, 109],
      renewals: [143, 91],
      lapsed: [554, 44],
      newBuyers: 24,
    },
    offers: [
      {
        slot: 'newcomer',
        name: 'Starting Gun Week',
        tagline: 'Seven days unlimited from the day the race starts.',
        fields: {
          Journey: ['Week Zero'],
          'Commercial job': ['Bold intro into the Rookie leaderboard'],
          'Who qualifies': ['First-time clients.'],
          'You pay': [
            'Intro: ₹2k for the 7-day unlimited intro, credited in full against a qualifying purchase within 72 hours. Then any pack or membership at 15% off list (the standing new-client perk).',
          ],
          'You get': [
            '• 7 days unlimited (max 2 a day); classes count on the Rookie leaderboard',
            '• Credited within 72 hours against any pack or membership + standing 15%',
            '• Race kit (bib and tote, ≈₹1,000) with the purchase',
          ],
          When: ['1–20 Aug.'],
          Rules: [
            '• One intro per person',
            '• The 15% is the standing new-client perk, not an extra discount.',
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '21.0% effective = 15% cash + 6.0% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹6.7L counted (+₹90.9k vs the ₹5.8L stream plan) · 30 buyers'],
          'Rate of sale': ['Needs ≈30 renewal purchases (plan 24).'],
          'Why it works': [
            'An individual race is intimidating for beginners; a Rookie leaderboard and an unlimited week make it winnable.',
          ],
          'What to watch': ['Rookie entries; intro conversion.'],
          'Offer auditor': ['23/25 (Effect 5, Creativity 5, Clarity 5, Practical 4, Economics 4). Best August entry.'],
          Model: [
            '109 in pool × 22.0% plan rate × 1.25 conversion factor = 30.0 buyers × ₹25.4k ticket = ₹7.6L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'lapsed',
        name: 'Back on Track',
        tagline: 'Your lane is still open.',
        fields: {
          'Commercial job': ['Reactivate into the race'],
          'Who qualifies': ['Lapsed clients.'],
          'You pay': ['1M unlimited: ₹17.8k (12% off the ₹20.2k list price).'],
          'You get': ['• 1M at 12% off', '• Finish the race target → +3 days'],
          When: ['1–15 Aug.'],
          Rules: [
            '• Replaces the 15% lapsed perk',
            "• Replaces the standing 15% perk; the two don't combine.",
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '22.0% effective = 12% cash + 10.0% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹4.1L counted (+₹54.3k vs the ₹3.5L stream plan) · 51 buyers'],
          'Rate of sale': ['Needs ≈11 1M unlimited sales vs 29 a month today (all buyers).'],
          'Why it works': ['Race + earned bonus; max effective 22%.'],
          'What to watch': ['Lapsed racers finishing.'],
          'Offer auditor': [
            '22/25 (Effect 5, Creativity 4, Clarity 5, Practical 4, Economics 4). On-theme and earned.',
          ],
          Model: [
            '554 in pool × 7.9% plan rate × 1.15 conversion factor = 50.6 buyers × ₹9.2k ticket (23% take the featured product) = ₹4.6L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'renewal',
        name: 'Pit Stop',
        tagline: 'Renew mid-race and keep your streak.',
        fields: {
          'Commercial job': ['Renewals during the race'],
          'Who qualifies': ['Members expiring in August or early September.'],
          'You pay': ["Renewal at your product's list price (no % off)."],
          'You get': [
            '• Renew at list; race progress carries over',
            '• Race finishers get +7 days on 1M or +14 days on 3M+',
            '• Upgrade to 3M with unlimited freezes',
          ],
          When: ['All August.'],
          Rules: ['• No % discount', "• Doesn't combine with any other campaign offer."],
          'Effective discount': [
            '7.0% effective = 0% cash + 7.0% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹23.6L counted (+₹1.5L vs the ₹22.1L stream plan) · 96 buyers'],
          'Rate of sale': ['Needs ≈96 renewal purchases (plan 91).'],
          'Why it works': ['The race lifts attendance, and attendance lifts renewals; finisher bonuses are earned.'],
          'What to watch': ['Race finish rate; renewal yield.'],
          'Offer auditor': [
            '23/25 (Effect 5, Creativity 4, Clarity 5, Practical 4, Economics 5). Ties renewals to the race.',
          ],
          Model: [
            '143 in pool × 63.6% plan rate × 1.05 conversion factor = 95.5 buyers × ₹26.2k ticket = ₹25.1L modelled; 50% of uplift counted',
          ],
        },
      },
    ],
  },
  {
    studio: 'Kemps Corner',
    month: 9,
    theme: 'Monsoon III: The Comeback',
    hook: '57 days to Diwali (2 Sep → 28 Oct)',
    job: 'Reactivate before the festive season; carry race momentum into a festive countdown.',
    moment: '57 Days to Diwali countdown starts 2 Sep; Bandra reunion repeat.',
    figures: {
      target: 3740000,
      projected: 3970000,
      newClientPlan: 610000,
      renewalPlan: 2210000,
      reactivationPlan: 450000,
      otherPlan: 470000,
      leadsTrials: [125, 96],
      renewals: [169, 76],
      lapsed: [593, 47],
      newBuyers: 21,
    },
    offers: [
      {
        slot: 'newcomer',
        name: '57-Day Proof',
        tagline: 'Measure on day 1. Re-test before Diwali.',
        fields: {
          Journey: ['The 30-Day Proof'],
          'Commercial job': ['Results-led acquisition into the festive season'],
          'Who qualifies': ['First-time clients.'],
          'You pay': ['1M unlimited: ₹17.2k (15% off the ₹20.2k list price).'],
          'You get': [
            '• 1M unlimited at the standing 15%',
            '• Fitness check on day 1, coach check-ins',
            '• Re-test before 28 Oct: 20+ classes and no improvement on 2 of 3 measures → your next month free',
          ],
          When: ['2–30 Sep.'],
          Rules: [
            '• Identical fitness-check protocol at every studio',
            '• The 15% is the standing new-client perk, not an extra discount.',
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹6.0L counted (−₹4.1k vs the ₹6.1L stream plan) · 24 buyers'],
          'Rate of sale': ['Needs ≈17 1M unlimited sales vs 29 a month today (all buyers).'],
          'Why it works': [
            "A finish line before Diwali and a results promise carry new clients into October, Kenkere's weakest month.",
          ],
          'What to watch': ['October renewals of September joiners.'],
          'Offer auditor': [
            '19/25 (Effect 4, Creativity 5, Clarity 4, Practical 3, Economics 3). Bold; depends on the protocol.',
          ],
          Model: [
            '96 in pool × 21.9% plan rate × 1.15 conversion factor = 24.1 buyers × ₹24.9k ticket (70% take the featured product) = ₹6.0L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'lapsed',
        name: 'The Return Policy',
        tagline: 'Come back within 7 days of your comeback class and get a bonus.',
        fields: {
          'Commercial job': ['Pre-festive reactivation'],
          'Who qualifies': ['Clients lapsed 61–365 days.'],
          'You pay': ['12-class pack: ₹17.3k (12% off the ₹19.7k list price).'],
          'You get': ['• Free comeback class', '• Buy 1M or a 12-class pack within 7 days at 12% off + 1 bonus class'],
          When: ['All September.'],
          Rules: [
            '• Replaces the 15% lapsed perk',
            "• Replaces the standing 15% perk; the two don't combine.",
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '21.9% effective = 12% cash + 9.9% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹4.7L counted (+₹20.3k vs the ₹4.5L stream plan) · 47 buyers'],
          'Rate of sale': ['Needs ≈11 12-class pack sales vs 28 a month today (all buyers).'],
          'Why it works': ['Time-limited to keep decisions fast.'],
          'What to watch': ['Reactivations vs plan.'],
          'Offer auditor': ['21/25 (Effect 4, Creativity 3, Clarity 5, Practical 5, Economics 4). Reliable.'],
          Model: [
            '593 in pool × 7.9% plan rate × 1.00 conversion factor = 47.0 buyers × ₹10.5k ticket (23% take the featured product) = ₹4.9L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'renewal',
        name: 'Festive Pause Button',
        tagline: 'Renew 3 months; Diwali and year-end travel covered.',
        fields: {
          'Commercial job': ['Renew through the festive season'],
          'Who qualifies': ['1M and 3M renewers.'],
          'You pay': ['3M unlimited: ₹57.9k (list price).'],
          'You get': ['• 3M at list', '• Unlimited freezes (use within 6 months)', '• Festive gift (≈₹1,000)'],
          When: ['All September.'],
          Rules: ['• No % discount', "• Doesn't combine with any other campaign offer."],
          'Effective discount': [
            '1.7% effective = 0% cash + 1.7% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹24.2L counted (+₹2.2L vs the ₹22.1L stream plan) · 78 buyers'],
          'Rate of sale': ['Needs ≈27 3M unlimited sales vs 9.8 a month today (all buyers).'],
          'Why it works': ['October–December are troughs; locking 3M now carries members through them.'],
          'What to watch': ['3M renewals.'],
          'Offer auditor': ['23/25 (Effect 5, Creativity 4, Clarity 5, Practical 4, Economics 5). Right timing.'],
          Model: [
            '169 in pool × 45.0% plan rate × 1.02 conversion factor = 77.5 buyers × ₹34.1k ticket (35% take the featured product) = ₹26.4L modelled; 50% of uplift counted',
          ],
        },
      },
    ],
  },
  {
    studio: 'Kemps Corner',
    month: 10,
    theme: 'Festival of Lights',
    hook: 'Diwali (Fri 29 Oct) · Dasara week in Bengaluru',
    job: "Gift-led revenue; protect Kenkere's Dasara trough; catch Kwality's late-October surge without codes.",
    moment: 'Gift cards on sale from 1 Oct; candle-lit evening classes in Diwali week; limited-run format #3.',
    figures: {
      target: 4760000,
      projected: 4930000,
      newClientPlan: 740000,
      renewalPlan: 2950000,
      reactivationPlan: 470000,
      otherPlan: 600000,
      leadsTrials: [142, 109],
      renewals: [122, 96],
      lapsed: [573, 46],
      newBuyers: 24,
    },
    offers: [
      {
        slot: 'newcomer',
        name: 'Gift a Flight',
        tagline: 'Give someone three classes and a reason to stay.',
        fields: {
          Journey: ['The Tasting Flight'],
          'Commercial job': ['Gift-led acquisition'],
          'Who qualifies': ['Anyone buying for a friend who is new to P57.'],
          'You pay': [
            'Intro: ₹2.5k for the Tasting Flight gift (3 classes in 10 days), credited in full against a qualifying purchase within 72 hours. Then any pack or membership at 15% off list (the standing new-client perk).',
          ],
          'You get': [
            '• A Tasting Flight as a Diwali gift card',
            '• The recipient follows the Flight journey; the fee is credited if they buy within 72 hours of class 3',
            '• The giver gets 1 bonus class when the recipient buys',
          ],
          When: ['1 Oct–15 Nov.'],
          Rules: [
            '• Recipient must be new; activate within 60 days',
            '• The 15% is the standing new-client perk, not an extra discount.',
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹8.3L counted (+₹95.8k vs the ₹7.4L stream plan) · 29 buyers'],
          'Rate of sale': ['Needs ≈29 renewal purchases (plan 24).'],
          'Why it works': [
            'Gifting is real Diwali spend, and a Flight is a better gift than cash credit because it leads into the best-converting journey.',
          ],
          'What to watch': ['Gift activations; recipient conversion.'],
          'Offer auditor': [
            '23/25 (Effect 5, Creativity 5, Clarity 5, Practical 4, Economics 4). Creative and on-theme.',
          ],
          Model: [
            '109 in pool × 22.0% plan rate × 1.20 conversion factor = 28.8 buyers × ₹32.2k ticket = ₹9.3L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'lapsed',
        name: 'Come Home for Diwali',
        tagline: "Your mat's still here.",
        fields: {
          'Commercial job': ['Festive reactivation'],
          'Who qualifies': ['Lapsed clients.'],
          'You pay': ['12-class pack: ₹16.7k (15% off the ₹19.7k list price).'],
          'You get': ['• 12-class pack at the standing 15% + a comeback class in Diwali week'],
          When: ['All October.'],
          Rules: [
            '• Standing perk',
            '• The 15% is the standing lapsed-client perk, not an extra discount.',
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹5.0L counted (+₹31.2k vs the ₹4.7L stream plan) · 48 buyers'],
          'Rate of sale': ['Needs ≈12 12-class pack sales vs 28 a month today (all buyers).'],
          'Why it works': ['Simple and on-theme.'],
          'What to watch': ['Reactivations.'],
          'Offer auditor': ['20/25 (Effect 3, Creativity 3, Clarity 5, Practical 5, Economics 4). Plain.'],
          Model: [
            '573 in pool × 8.0% plan rate × 1.05 conversion factor = 48.3 buyers × ₹11k ticket (25% take the featured product) = ₹5.3L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'renewal',
        name: 'Renew & Gift',
        tagline: 'Renew in October; 5% back to spend on a gift card.',
        fields: {
          'Commercial job': ['Renewals that fund gift cards'],
          'Who qualifies': ['October renewers.'],
          'You pay': ["Renewal at your product's list price (no % off)."],
          'You get': ['• Renew at list → 5% back as credit usable only on a Gift a Shake card'],
          When: ['All October.'],
          Rules: ['• Credit valid until 15 Nov', "• Doesn't combine with any other campaign offer."],
          'Effective discount': [
            '5.0% effective = 0% cash + 5.0% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹30.0L counted (+₹44.3k vs the ₹29.5L stream plan) · 99 buyers'],
          'Rate of sale': ['Needs ≈99 renewal purchases (plan 96).'],
          'Why it works': ['Turns renewal value into new-client acquisition.'],
          'What to watch': ['Credit used on gifts.'],
          'Offer auditor': ['21/25 (Effect 4, Creativity 4, Clarity 5, Practical 4, Economics 4). Smart loop.'],
          Model: [
            '122 in pool × 78.7% plan rate × 1.03 conversion factor = 98.9 buyers × ₹30.8k ticket = ₹30.4L modelled; 50% of uplift counted',
          ],
        },
      },
    ],
  },
  {
    studio: 'Kemps Corner',
    month: 11,
    theme: 'Black Friday, Strong Monday',
    hook: 'Black Friday (Fri 26 Nov) → Cyber Monday (29 Nov)',
    job: 'Long commitments in the softest Mumbai month.',
    moment: 'Club Nine last seats (only those unsold in April).',
    figures: {
      target: 2020000,
      projected: 2230000,
      newClientPlan: 350000,
      renewalPlan: 1190000,
      reactivationPlan: 230000,
      otherPlan: 250000,
      leadsTrials: [91, 70],
      renewals: [88, 55],
      lapsed: [400, 32],
      newBuyers: 16,
    },
    offers: [
      {
        slot: 'newcomer',
        name: 'Black Friday Week Zero',
        tagline: 'Seven days unlimited, fully credited.',
        fields: {
          Journey: ['Week Zero'],
          'Commercial job': ['Bold intro in the softest Mumbai month'],
          'Who qualifies': ['First-time clients.'],
          'You pay': [
            'Intro: ₹2k for the 7-day unlimited intro, credited in full against a qualifying purchase within 72 hours. Then any pack or membership at 15% off list (the standing new-client perk).',
          ],
          'You get': [
            '• 7 days unlimited (max 2 a day)',
            '• Credited within 72 hours against any pack or membership + standing 15%',
            '• Upgrade to 3M before day 21 of a 1M: the 1M amount is credited and the 3M gets unlimited freezes (use within 6 months)',
          ],
          When: ['20 Nov–5 Dec.'],
          Rules: [
            '• One intro per person',
            '• The 15% is the standing new-client perk, not an extra discount.',
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹4.0L counted (+₹54k vs the ₹3.5L stream plan) · 20 buyers'],
          'Rate of sale': ['Needs ≈20 renewal purchases (plan 16).'],
          'Why it works': ['Black Friday urgency without a deeper %.'],
          'What to watch': ['Intro conversion; day-21 upgrades.'],
          'Offer auditor': ['22/25 (Effect 5, Creativity 4, Clarity 5, Practical 4, Economics 4). Strong.'],
          Model: [
            '70 in pool × 22.9% plan rate × 1.25 conversion factor = 20.0 buyers × ₹22.7k ticket = ₹4.5L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'lapsed',
        name: 'High-Value Homecoming',
        tagline: 'A manager call, three flexible months and a private.',
        fields: {
          'Commercial job': ['Win back the most valuable lapsers'],
          'Who qualifies': ['Lapsed clients with ≥₹50k lifetime spend.'],
          'You pay': ['3M unlimited: ₹49.2k (15% off the ₹57.9k list price).'],
          'You get': ['• Manager call', '• 3M at the standing 15% + unlimited freezes + one 30-minute private'],
          When: ['All November.'],
          Rules: [
            '• Named list only',
            '• The 15% is the standing lapsed-client perk, not an extra discount.',
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '19.5% effective = 15% cash + 4.5% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹2.8L counted (+₹51.7k vs the ₹2.3L stream plan) · 30 buyers'],
          'Rate of sale': ['Needs ≈5 3M unlimited sales vs 9.8 a month today (all buyers).'],
          'Why it works': ['These clients bought big before; 3M fits them.'],
          'What to watch': ['Effective ≈19.5–20% (amber vs 15% 3M+ guardrail).'],
          'Offer auditor': [
            '19/25 (Effect 4, Creativity 3, Clarity 5, Practical 4, Economics 3). High value; check guardrail.',
          ],
          Model: [
            '400 in pool × 8.0% plan rate × 0.95 conversion factor = 30.4 buyers × ₹11k ticket (18% take the featured product) = ₹3.3L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'renewal',
        name: 'Club Nine: Last Seats',
        tagline: 'The last numbered seats.',
        fields: {
          'Commercial job': ['Annuals at list'],
          'Who qualifies': ['Active members.'],
          'You pay': ['Annual unlimited: ₹2.2L (list price).'],
          'You get': ['• Only the Club Nine seats unsold in April, same perks'],
          When: ['From 26 Nov until sold.'],
          Rules: ['• No new seats created', "• Doesn't combine with any other campaign offer."],
          'Effective discount': [
            '5.7% effective = 0% cash + 5.7% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹13.0L counted (+₹1.1L vs the ₹11.9L stream plan) · 55 buyers'],
          'Rate of sale': ['Needs ≈2 Annual unlimited sales vs 3 a month today (all buyers).'],
          'Why it works': ['Closes the scarcity story.'],
          'What to watch': ['Seats remaining.'],
          'Offer auditor': ['22/25 (Effect 4, Creativity 4, Clarity 5, Practical 4, Economics 5). Good.'],
          Model: [
            '88 in pool × 62.5% plan rate × 1.00 conversion factor = 55.0 buyers × ₹25.6k ticket (4% take the featured product) = ₹14.1L modelled; 50% of uplift counted',
          ],
        },
      },
    ],
  },
  {
    studio: 'Kemps Corner',
    month: 12,
    theme: 'Wrapped',
    hook: 'Year-end · pre-sell January',
    job: "Pre-sell the February 2028 challenge and January's first week; renew on personal usage data.",
    moment:
      '"Your 2027 Wrapped": a personal year-in-review for every client, ending in a usage-based renewal recommendation.',
    figures: {
      target: 3310000,
      projected: 3410000,
      newClientPlan: 480000,
      renewalPlan: 1900000,
      reactivationPlan: 510000,
      otherPlan: 420000,
      leadsTrials: [122, 94],
      renewals: [105, 75],
      lapsed: [758, 61],
      newBuyers: 19,
    },
    offers: [
      {
        slot: 'newcomer',
        name: 'Kickstart 21: Pre-Solution Cohort',
        tagline: 'Buy in December. Start Mon 3 Jan. Arrive at the February challenge.',
        fields: {
          Journey: ['Kickstart 21'],
          'Commercial job': ['Pre-sell January'],
          'Who qualifies': ['First-time clients.'],
          'You pay': ['Kickstart 21 cohort: ₹10k (list price).'],
          'You get': [
            '• Cohort starts Mon 3 Jan 2028; sold in December',
            '• 21 days unlimited + coach, WhatsApp, fitness checks, graduation',
            '• Graduates who buy a membership join the February 2028 challenge with a scaled target',
          ],
          When: ['All December.'],
          Rules: [
            '• Cohort fee not credited',
            "• Replaces the standing 15% perk; the two don't combine.",
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '0.0% effective = 0% cash. Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹4.7L counted (−₹11.9k vs the ₹4.8L stream plan) · 21 buyers'],
          'Rate of sale': ['Needs ≈9 Kickstart 21 cohort sales (new product, no current rate).'],
          'Why it works': [
            'Moves January demand into December cash and lands graduates in the members-only challenge.',
          ],
          'What to watch': ['Pre-sales; January graduation.'],
          'Offer auditor': [
            '23/25 (Effect 5, Creativity 5, Clarity 5, Practical 4, Economics 4). Smooths the December dip.',
          ],
          Model: [
            '94 in pool × 20.2% plan rate × 1.10 conversion factor = 20.9 buyers × ₹21.8k ticket (45% take the featured product) = ₹4.6L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'lapsed',
        name: 'Your 2027 Wrapped',
        tagline: "You took 87 classes with us. Here's to the next year.",
        fields: {
          'Commercial job': ['Data-led reactivation'],
          'Who qualifies': ['Lapsed clients.'],
          'You pay': ['12-class pack: ₹16.7k (15% off the ₹19.7k list price).'],
          'You get': [
            '• Personal stats page (classes, favourite trainer, best month)',
            '• 12-class pack at the standing 15% + a comeback class',
          ],
          When: ['All December.'],
          Rules: [
            '• Standing perk',
            '• The 15% is the standing lapsed-client perk, not an extra discount.',
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹5.7L counted (+₹60.2k vs the ₹5.1L stream plan) · 67 buyers'],
          'Rate of sale': ['Needs ≈17 12-class pack sales vs 28 a month today (all buyers).'],
          'Why it works': ['Year-in-review pages get shared; it reminds lapsed clients of their own habit.'],
          'What to watch': ['Stats export needed.'],
          'Offer auditor': [
            '21/25 (Effect 5, Creativity 5, Clarity 4, Practical 3, Economics 4). Most creative winback; data-dependent.',
          ],
          Model: [
            '758 in pool × 8.0% plan rate × 1.10 conversion factor = 67.1 buyers × ₹9.4k ticket (25% take the featured product) = ₹6.3L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'renewal',
        name: 'Challenge-Ready Renewal',
        tagline: "Renew in December so you're covered for all of Stronger in 30.",
        fields: {
          'Commercial job': ['Renew at list ahead of the challenge'],
          'Who qualifies': ['Members expiring Dec–Jan.'],
          'You pay': ["Renewal at your product's list price (no % off)."],
          'You get': [
            "• Renew at list so the membership covers January and February's challenge",
            '• February challenge kit (≈₹1,000)',
          ],
          When: ['All December.'],
          Rules: ['• No % discount', "• Doesn't combine with any other campaign offer."],
          'Effective discount': [
            '4.0% effective = 0% cash + 4.0% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹19.5L counted (+₹47.5k vs the ₹19.0L stream plan) · 79 buyers'],
          'Rate of sale': ['Needs ≈79 renewal purchases (plan 75).'],
          'Why it works': ['Members-only challenge = a natural reason to renew before it starts.'],
          'What to watch': ['December renewals of January expiries.'],
          'Offer auditor': [
            '24/25 (Effect 5, Creativity 4, Clarity 5, Practical 5, Economics 5). Top December renewal.',
          ],
          Model: [
            '105 in pool × 71.4% plan rate × 1.05 conversion factor = 78.8 buyers × ₹25.3k ticket = ₹19.9L modelled; 50% of uplift counted',
          ],
        },
      },
    ],
  },
  {
    studio: 'Bandra',
    month: 1,
    theme: 'Start Line',
    hook: 'New Year · seven days unlimited · the annual re-up',
    job: 'Convert January trial demand and re-up the Jan-2026 annuals (8 annuals, ₹12.5L due). Nothing launches this month, so January sells the habit: a credited first week, a free comeback class and a re-up at list — and every January membership carries into February.',
    moment:
      'January is the first week — a credited seven-day intro, a free comeback class and the annual re-up at list. Nothing launches early: every January membership carries into February, when Stronger in 30 2.0 opens.',
    figures: {
      target: 1760000,
      projected: 1870000,
      newClientPlan: 270000,
      renewalPlan: 1150000,
      reactivationPlan: 220000,
      otherPlan: 130000,
      leadsTrials: [152, 87],
      renewals: [60, 50],
      lapsed: [419, 33],
      newBuyers: 15,
    },
    offers: [
      {
        slot: 'newcomer',
        name: 'The First Seven Days',
        tagline: 'Seven days unlimited. Then decide.',
        fields: {
          Journey: ['Week Zero'],
          'Commercial job': ['Convert high-intent January leads fast'],
          'Who qualifies': ['First-time clients (phone verified).'],
          'You pay': [
            'Intro: ₹2k for the 7-day unlimited intro, credited in full against a qualifying purchase within 72 hours. Then any pack or membership at 15% off list (the standing new-client perk).',
          ],
          'You get': [
            '• Unlimited Barre and powerCycle for 7 days (max 2 classes a day)',
            '• Goal-setting chat after class 1; owner check-in on day 3',
            '• Lab Induction seat at Kwality/Bandra',
            '• Buy any pack or membership within 72 hours of day 7: full intro fee credited + the standing 15%',
            "• Buy in January and you're pre-registered for February's challenge (target scaled)",
          ],
          When: ['1–24 Jan 2027.'],
          Rules: [
            '• One intro per person',
            '• Credit only within 72 hours of day 7',
            '• The 15% is the standing new-client perk, not an extra discount.',
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹3.1L counted (+₹42k vs the ₹2.7L stream plan) · 19 buyers'],
          'Rate of sale': ['Needs ≈19 renewal purchases (plan 15).'],
          'Why it works': [
            'January leads are the most motivated of the year. Clients with 5+ visits in month one convert at 94%; a credited week lets the habit form before the ask, and a January purchase hands February a warm list.',
          ],
          'What to watch': ['Intro → purchase (target 45%); classes in the intro week (target 4+).'],
          'Offer auditor': [
            '22/25 (Effect 5, Creativity 4, Clarity 5, Practical 4, Economics 4). Strongest January entry: bold, clear credit rule, and it hands February a warm list.',
          ],
          Model: [
            '87 in pool × 17.2% plan rate × 1.25 conversion factor = 18.8 buyers × ₹18.8k ticket = ₹3.5L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'lapsed',
        name: 'Back to the Barre',
        tagline: 'Your barre is still here. A class on us, then the standing return price.',
        fields: {
          'Commercial job': ['Reactivate lapsed clients early in the year'],
          'Who qualifies': ['Clients lapsed 61–365 days.'],
          'You pay': ['1M unlimited: ₹17.2k (15% off the ₹20.2k list price).'],
          'You get': [
            '• 1M unlimited or a 12-class pack at the standing 15% lapsed perk',
            '• A free comeback class to book before buying',
            "• Buy in January and you're pre-registered for February's challenge",
          ],
          When: ['Buy by 24 Jan 2027.'],
          Rules: [
            '• Standing 15% lapsed perk; no extra discount',
            '• The 15% is the standing lapsed-client perk, not an extra discount.',
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹2.5L counted (+₹38.9k vs the ₹2.2L stream plan) · 38 buyers'],
          'Rate of sale': ['Needs ≈9 1M unlimited sales vs 19.7 a month today (all buyers).'],
          'Why it works': [
            "Early January is the cheapest week of the year to win someone back: intent is high and the timetable is full. A free comeback class takes the risk out of the first visit, and a January purchase puts them in February's challenge.",
          ],
          'What to watch': ['Lapsed clients buying before 24 Jan.'],
          'Offer auditor': [
            '23/25 (Effect 5, Creativity 4, Clarity 5, Practical 5, Economics 4). A deadline with a reason behind it, and no discount given away.',
          ],
          Model: [
            '419 in pool × 7.9% plan rate × 1.15 conversion factor = 37.9 buyers × ₹7.7k ticket (23% take the featured product) = ₹2.9L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'renewal',
        name: 'The Annual Re-Up',
        tagline: "The January annuals renew at list — and February's challenge comes with them.",
        fields: {
          'Commercial job': ['Re-up the January-2026 annuals at list'],
          'Who qualifies': ['Annual members whose 2026 term started in January (8 annuals, ₹12.5L due).'],
          'You pay': ["Renewal at your product's list price (no % off)."],
          'You get': [
            '• +7 days on 3M, +14 days on 6M or 12M when you re-up by 31 Jan',
            '• Entry to February’s challenge, target scaled to the new term',
          ],
          When: ['2–31 Jan 2027.'],
          Rules: [
            '• No % discount',
            '• Bonus days are earned by re-upping in January',
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '7.0% effective = 0% cash + 7.0% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹11.8L counted (+₹28.7k vs the ₹11.5L stream plan) · 53 buyers'],
          'Rate of sale': ['Needs ≈53 renewal purchases (plan 50).'],
          'Why it works': [
            'Full-price renewers renew again at 61–68% vs 50–54% after a discount. January is when the annuals fall due; a small term bonus is cheaper than a percentage, and it starts the year at list.',
          ],
          'What to watch': ['Annuals re-upped; renewal yield.'],
          'Offer auditor': [
            '22/25 (Effect 5, Creativity 4, Clarity 4, Practical 4, Economics 5). Best renewal mechanic of the set: the bonus is earned by showing up, not by discounting.',
          ],
          Model: [
            '60 in pool × 83.3% plan rate × 1.05 conversion factor = 52.5 buyers × ₹23k ticket = ₹12.1L modelled; 50% of uplift counted',
          ],
        },
      },
    ],
  },
  {
    studio: 'Bandra',
    month: 2,
    theme: 'Stronger in 30 2.0',
    hook: "The 30-day challenge (1–28 Feb) · Valentine's (Sun 14 Feb) · Galentine's (Sat 13 Feb)",
    job: "Run the challenge as the month's engine: fill the opening week, hold the middle at Galentine's, and convert finishers into renewals at list. The duo and referral offers run on top (BOGO buyers were 79–94% existing clients and renewed at 33–53%).",
    moment:
      "Stronger in 30 2.0 runs 1–28 Feb for active members and pack holders. The Galentine's hosted class on Sat 13 Feb — named associate, Encore QR at the door — is the mid-challenge event; Valentine's Sunday (14 Feb) is the partner class.",
    figures: {
      target: 1620000,
      projected: 1690000,
      newClientPlan: 200000,
      renewalPlan: 1190000,
      reactivationPlan: 120000,
      otherPlan: 120000,
      leadsTrials: [142, 81],
      renewals: [66, 66],
      lapsed: [285, 23],
      newBuyers: 14,
    },
    offers: [
      {
        slot: 'newcomer',
        name: 'Week Zero',
        tagline: 'Seven days unlimited. Then the challenge clock starts.',
        fields: {
          Journey: ['Week Zero'],
          'Commercial job': ['Convert high-intent February leads fast'],
          'Who qualifies': ['First-time clients (phone verified).'],
          'You pay': [
            'Intro: ₹2k for the 7-day unlimited intro, credited in full against a qualifying purchase within 72 hours. Then any pack or membership at 15% off list (the standing new-client perk).',
          ],
          'You get': [
            '• Unlimited Barre and powerCycle for 7 days (max 2 classes a day)',
            '• Goal-setting chat after class 1; owner check-in on day 3',
            '• Lab Induction seat at Kwality/Bandra',
            '• Buy any pack or membership within 72 hours of day 7: full intro fee credited + the standing 15%',
            '• A membership makes you eligible for Stronger in 30 2.0 from the week you join (target scaled)',
          ],
          When: ['1–21 Feb 2027.'],
          Rules: [
            '• One intro per person',
            '• Credit only within 72 hours of day 7',
            '• The 15% is the standing new-client perk, not an extra discount.',
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹1.2L counted · 6 buyers (the month runs two new-client routes; this is its share)'],
          'Rate of sale': ['Needs ≈19 renewal purchases (plan 15).'],
          'Why it works': [
            'February leads arrive with a deadline attached. Clients with 5+ visits in month one convert at 94%; a credited week lets the habit form before the ask, and the challenge clock gives the month its reason to start now.',
          ],
          'What to watch': ['Intro → purchase (target 45%); classes in the intro week (target 4+).'],
          'Offer auditor': [
            '22/25 (Effect 5, Creativity 4, Clarity 5, Practical 4, Economics 4). Strongest February entry: bold, clear credit rule, tied to the challenge.',
          ],
          Model: [
            '87 in pool × 17.2% plan rate × 1.25 conversion factor = 18.8 buyers × ₹18.8k ticket = ₹3.5L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'lapsed',
        name: 'Back for Stronger',
        tagline: "The challenge starts without you. Unless you're back by 7 Feb.",
        fields: {
          'Commercial job': ['Reactivate lapsed clients through the challenge'],
          'Who qualifies': ['Clients lapsed 61–365 days.'],
          'You pay': ['1M unlimited: ₹17.2k (15% off the ₹20.2k list price).'],
          'You get': [
            '• 1M unlimited or a 12-class pack at the standing 15% lapsed perk',
            '• Full entry to Stronger in 30 2.0, including finisher rewards',
            '• A free comeback class to book before buying',
          ],
          When: ['Buy by 7 Feb for full eligibility; 8–15 Feb entries get a scaled target.'],
          Rules: [
            '• Standing 15% lapsed perk; no extra discount',
            '• The 15% is the standing lapsed-client perk, not an extra discount.',
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹0.8L counted · 3 buyers (the month runs two comeback routes; this is its share)'],
          'Rate of sale': ['Needs ≈9 1M unlimited sales vs 19.7 a month today (all buyers).'],
          'Why it works': [
            'The challenge is for members and pack holders, so a lapsed client has to buy to take part. A deadline and a social event do more than a deeper discount.',
          ],
          'What to watch': ['Lapsed clients entering the challenge.'],
          'Offer auditor': [
            '23/25 (Effect 5, Creativity 4, Clarity 5, Practical 5, Economics 4). Uses the challenge as the reason to return; no extra cost.',
          ],
          Model: [
            '419 in pool × 7.9% plan rate × 1.15 conversion factor = 37.9 buyers × ₹7.7k ticket (23% take the featured product) = ₹2.9L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'renewal',
        name: 'Finish Line Renewal',
        tagline: 'Finish Stronger in 30 and your renewal gets a medal.',
        fields: {
          'Commercial job': ['Use challenge attendance to drive renewals at list'],
          'Who qualifies': ['Active members renewing in late February or early March.'],
          'You pay': ["Renewal at your product's list price (no % off)."],
          'You get': [
            '• Challenge finishers renew at list and get: +7 days on 1M, +2 classes on a pack, +14 days on 3M or longer',
            '• Members who reach 50% of the target get +3 days on 1M or +1 class on a pack',
          ],
          When: ['Renew 22 Feb–10 Mar 2027.'],
          Rules: [
            '• No % discount',
            '• Bonus is earned through challenge attendance',
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '7.0% effective = 0% cash + 7.0% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹5.9L counted · 25 buyers (the month runs two renewal routes; this is its share)'],
          'Rate of sale': ['Needs ≈53 renewal purchases (plan 50).'],
          'Why it works': [
            'Renewers average 6.4 visits in the first half of a membership vs 2.6–3.4 for lapsers. Rewarding finishers pays for the behaviour that produces renewals; full-price renewers renew again at 61–68% vs 50–54% after discounts.',
          ],
          'What to watch': ['Challenge finish rate; renewal yield.'],
          'Offer auditor': [
            '22/25 (Effect 5, Creativity 4, Clarity 4, Practical 4, Economics 5). Best renewal mechanic of the year: earned, cheap, on-theme.',
          ],
          Model: [
            '60 in pool × 83.3% plan rate × 1.05 conversion factor = 52.5 buyers × ₹23k ticket = ₹12.1L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'newcomer',
        name: 'The 30-Day Proof',
        tagline: "Show up 12 times. If you don't get stronger, next month is free.",
        fields: {
          Journey: ['The 30-Day Proof'],
          'Commercial job': ['Answer "will it work for me?" (Bandra test)'],
          'Who qualifies': ['First-time clients.'],
          'You pay': ['1M unlimited: ₹17.2k (15% off the ₹20.2k list price).'],
          'You get': [
            '• 1M unlimited at the standing 15%',
            '• Day-1 fitness check (3 measures), coach check-ins on days 7 and 21',
            '• Day-30 re-test: 12+ classes and no improvement on 2 of 3 measures → next month free',
            '• Counts as your Stronger in 30 2.0 entry from day 1',
          ],
          When: ['1–28 Feb.'],
          Rules: [
            '• Measures and protocol fixed in advance and identical at every studio',
            '• Free month must start within 14 days',
            '• The 15% is the standing new-client perk, not an extra discount.',
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹0.8L counted · 3 buyers (the month runs two new-client routes; this is its share)'],
          'Rate of sale': ['Needs ≈11 1M unlimited sales vs 19.7 a month today (all buyers).'],
          'Why it works': [
            'Bandra has the lowest new-client conversion (17–26%). A guarantee answers the core objection; 12 classes almost always produce improvement, so it rarely pays out.',
          ],
          'What to watch': ['Guarantee claims; conversion vs other Bandra journeys.'],
          'Offer auditor': [
            '19/25 (Effect 4, Creativity 5, Clarity 4, Practical 3, Economics 3). Bold; run as a test before scaling.',
          ],
          Model: [
            '81 in pool × 17.3% plan rate × 1.15 conversion factor = 16.1 buyers × ₹15.2k ticket (70% take the featured product) = ₹2.4L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'lapsed',
        name: 'Come Back as a Pair',
        tagline: 'Return with a friend. Their first class is on us — and you both enter the challenge.',
        fields: {
          'Commercial job': ['Reactivation that also brings a new lead'],
          'Who qualifies': ['Lapsed clients plus a friend who is new to P57.'],
          'You pay': ['12-class pack: ₹16.7k (15% off the ₹19.7k list price).'],
          'You get': [
            '• Lapsed client: 12-class pack at the standing 15%',
            '• Friend: free first class',
            '• If the friend buys, the lapsed client gets 2 guest passes and 48-hour priority booking for a month',
            '• Lapsed client and friend both enter Stronger in 30 2.0',
          ],
          When: ['All February.'],
          Rules: [
            '• Friend must be new to P57',
            '• The 15% is the standing lapsed-client perk, not an extra discount.',
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹0.4L counted · 1 buyers (the month runs two comeback routes; this is its share)'],
          'Rate of sale': ['Needs ≈6 12-class pack sales vs 29 a month today (all buyers).'],
          'Why it works': ['One message, two streams: reactivation and a warm new lead.'],
          'What to watch': ['Friends who buy.'],
          'Offer auditor': [
            '21/25 (Effect 4, Creativity 4, Clarity 5, Practical 4, Economics 4). Efficient double play.',
          ],
          Model: [
            '285 in pool × 8.1% plan rate × 1.10 conversion factor = 25.3 buyers × ₹6.6k ticket (25% take the featured product) = ₹1.7L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'renewal',
        name: 'Partners in Crime',
        tagline: 'Renew with your workout partner. You both finish the challenge.',
        fields: {
          'Commercial job': ['Social accountability at renewal'],
          'Who qualifies': ['Two active members renewing in the same week.'],
          'You pay': ["Renewal at your product's list price (no % off)."],
          'You get': [
            '• Each gets +3 days on 1M, +1 class on a pack, or +7 days on 3M or longer',
            '• Both enter Stronger in 30 2.0; finishers keep the renewal bonus',
          ],
          When: ['All February.'],
          Rules: [
            '• Both renewals at list',
            '• Register the pair at the desk',
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '6.0% effective = 0% cash + 6.0% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹6.0L counted · 33 buyers (the month runs two renewal routes; this is its share)'],
          'Rate of sale': ['Needs ≈68 renewal purchases (plan 66).'],
          'Why it works': ['Pairs keep each other attending; attendance predicts renewal. Tag pairs to measure it.'],
          'What to watch': ['Next-renewal rate of pairs vs singles.'],
          'Offer auditor': [
            '22/25 (Effect 4, Creativity 4, Clarity 5, Practical 4, Economics 5). Cheap, social, on-theme.',
          ],
          Model: [
            '66 in pool × 100.0% plan rate × 1.03 conversion factor = 68.0 buyers × ₹18k ticket = ₹12.2L modelled; 50% of uplift counted',
          ],
        },
      },
    ],
  },
  {
    studio: 'Bandra',
    month: 3,
    theme: 'She Moves',
    hook: "International Women's Day (Mon 8 Mar)",
    job: "Purpose-led reach; Bandra reactivation; stop March trials from waiting for the anniversary. Keep February's challenge finishers attending.",
    moment: 'Class of 2024 Reunion at Bandra (638 lapsed launch-cohort clients). Anniversary teaser from 16 Mar.',
    figures: {
      target: 1360000,
      projected: 1420000,
      newClientPlan: 260000,
      renewalPlan: 810000,
      reactivationPlan: 190000,
      otherPlan: 100000,
      leadsTrials: [151, 86],
      renewals: [71, 36],
      lapsed: [358, 29],
      newBuyers: 15,
    },
    offers: [
      {
        slot: 'newcomer',
        name: 'Kickstart 21: She Moves Cohort',
        tagline: "Starting Women's Day. 21 days. Stronger together.",
        fields: {
          Journey: ['Kickstart 21'],
          'Commercial job': ['Cohort acquisition with purpose'],
          'Who qualifies': ['First-time clients.'],
          'You pay': ['Kickstart 21 cohort: ₹10k (list price).'],
          'You get': [
            "• Cohort starts Mon 8 Mar (Women's Day); second cohort Mon 22 Mar",
            '• 21 days unlimited + coach, WhatsApp group, fitness checks, graduation',
            '• Each member gets a free class to gift a woman she nominates',
            '• Graduates: standing 15% within 7 days',
          ],
          When: ['Book by 7 Mar / 21 Mar.'],
          Rules: [
            '• Gift class for someone new to P57',
            "• Replaces the standing 15% perk; the two don't combine.",
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '0.0% effective = 0% cash. Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹2.7L counted (+₹1.9k vs the ₹2.6L stream plan) · 17 buyers'],
          'Rate of sale': ['Needs ≈6 Kickstart 21 cohort sales (new product, no current rate).'],
          'Why it works': ['Purpose-led reach with the engagement of a cohort; the gift class creates warm leads.'],
          'What to watch': ['Nominee classes converted.'],
          'Offer auditor': [
            '22/25 (Effect 4, Creativity 5, Clarity 5, Practical 4, Economics 4). Good fit for the month.',
          ],
          Model: [
            '86 in pool × 17.4% plan rate × 1.10 conversion factor = 16.5 buyers × ₹16.2k ticket (36% take the featured product) = ₹2.7L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'lapsed',
        name: 'Class of 2024 Reunion',
        tagline: 'Where it all started. One class, the whole launch crew.',
        fields: {
          'Commercial job': ["Reactivate Bandra's 638 launch-cohort lapsers"],
          'Who qualifies': ['Clients lapsed 61 days–2 years (Bandra priority: 2024 opening cohort).'],
          'You pay': ['12-class pack: ₹17.3k (12% off the ₹19.7k list price).'],
          'You get': ['• Free reunion class', '• Buy within 7 days: 12-class pack at 12% off + 1 bonus class'],
          When: ['Reunion mid-March; offer 7 days after.'],
          Rules: [
            '• Replaces the 15% lapsed perk',
            "• Replaces the standing 15% perk; the two don't combine.",
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '21.9% effective = 12% cash + 9.9% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹2.2L counted (+₹38.5k vs the ₹1.9L stream plan) · 33 buyers'],
          'Rate of sale': ['Needs ≈9 12-class pack sales vs 29 a month today (all buyers).'],
          'Why it works': [
            'May–Sep 2024 brought 1,000+ first visits at Bandra; 638 are now lapsed 1–2 years. Reaching people who already know the studio is the cheapest reach Bandra has.',
          ],
          'What to watch': ['RSVPs → attendance → purchase. Repeat in September.'],
          'Offer auditor': [
            "22/25 (Effect 5, Creativity 4, Clarity 5, Practical 4, Economics 4). Targeted at Bandra's single biggest asset.",
          ],
          Model: [
            '358 in pool × 8.1% plan rate × 1.15 conversion factor = 33.3 buyers × ₹7.9k ticket (27% take the featured product) = ₹2.6L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'renewal',
        name: 'Lock In Early',
        tagline: 'Renew in March, keep the anniversary perks.',
        fields: {
          'Commercial job': ['Protect Q1 renewals without pull-forward discounts'],
          'Who qualifies': ['Members expiring 1 Mar–15 Apr.'],
          'You pay': ["Renewal at your product's list price (no % off)."],
          'You get': [
            '• Renew at list + 2 bonus classes (packs) or +7 days (unlimited)',
            '• First booking window for anniversary party classes',
          ],
          When: ['All March.'],
          Rules: ['• No % discount', "• Doesn't combine with any other campaign offer."],
          'Effective discount': [
            '7.0% effective = 0% cash + 7.0% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹8.3L counted (+₹16.2k vs the ₹8.1L stream plan) · 37 buyers'],
          'Rate of sale': ['Needs ≈37 renewal purchases (plan 36).'],
          'Why it works': [
            "In 2026, ₹36.7L of Kwality's April came from early renewals at 30%+. Bonus time protects the ticket.",
          ],
          'What to watch': ['March renewals vs due.'],
          'Offer auditor': [
            '21/25 (Effect 4, Creativity 3, Clarity 5, Practical 5, Economics 4). Necessary guardrail before April.',
          ],
          Model: [
            '71 in pool × 50.7% plan rate × 1.04 conversion factor = 37.4 buyers × ₹22.6k ticket = ₹8.4L modelled; 50% of uplift counted',
          ],
        },
      },
    ],
  },
  {
    studio: 'Bandra',
    month: 4,
    theme: 'Cloud Nine (9th anniversary)',
    hook: '9 years of Physique 57 India · first ₹1 Cr month',
    job: "The year's best, most playful offers and the first ₹1 Cr sales month (target ₹104.5L), without the 26–31% discounts of April 2026. Caps: 20% on ≤1M products, 15% on 3M+.",
    moment:
      'Club Nine: 9 numbered annual memberships per studio at full price. Anniversary party classes in week 2. Hard close 30 Apr, 23:59.',
    figures: {
      target: 3300000,
      projected: 3550000,
      newClientPlan: 470000,
      renewalPlan: 2210000,
      reactivationPlan: 380000,
      otherPlan: 240000,
      leadsTrials: [238, 136],
      renewals: [74, 88],
      lapsed: [673, 54],
      newBuyers: 24,
    },
    offers: [
      {
        slot: 'newcomer',
        name: 'Cloud Nine Intro',
        tagline: 'Nine days unlimited for less than one class.',
        fields: {
          Journey: ['Week Zero'],
          'Commercial job': ["The year's boldest acquisition offer"],
          'Who qualifies': ['First-time clients (phone verified).'],
          'You pay': [
            'Intro: ₹1k for the 9-day unlimited intro, credited in full against a qualifying purchase within 72 hours. Then any pack or membership at 15% off list (the standing new-client perk).',
          ],
          'You get': [
            '• Unlimited Barre and powerCycle for 9 days (max 2 a day) + a Lab Induction seat (Kwality/Bandra)',
            '• Buy any pack or membership within 72 hours of day 9: intro fee credited + standing 15% + anniversary tote (≈₹1,000)',
          ],
          When: ['1–21 Apr (so the intro ends inside April).'],
          Rules: [
            '• One intro per person',
            '• Tote only with the 72-hour purchase',
            '• The 15% is the standing new-client perk, not an extra discount.',
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '21.0% effective = 15% cash + 6.0% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹5.7L counted (+₹98.1k vs the ₹4.7L stream plan) · 32 buyers'],
          'Rate of sale': ['Needs ≈32 renewal purchases (plan 24).'],
          'Why it works': [
            'The anniversary is worth an eye-catching price. Nine days builds the habit; the credited purchase protects the commitment price.',
          ],
          'What to watch': ['Intro volume vs spare seats; intro → purchase (target 40%).'],
          'Offer auditor': [
            '23/25 (Effect 5, Creativity 5, Clarity 5, Practical 4, Economics 4). Headline April offer.',
          ],
          Model: [
            '136 in pool × 17.6% plan rate × 1.35 conversion factor = 32.4 buyers × ₹20.6k ticket = ₹6.7L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'lapsed',
        name: 'Nine Years, Nine Reasons',
        tagline: 'Nine things changed while you were away.',
        fields: {
          'Commercial job': ['Reactivate with news, not a deeper discount'],
          'Who qualifies': ['Clients lapsed 61 days–2 years.'],
          'You pay': ['12-class pack: ₹16.7k (15% off the ₹19.7k list price).'],
          'You get': [
            '• A personal note listing 9 things new at your studio (formats, trainers, schedule)',
            '• 12-class pack at the standing 15% lapsed perk',
            '• Invite to an anniversary party class',
          ],
          When: ['All April.'],
          Rules: [
            '• Standing perk; no extra % off',
            '• The 15% is the standing lapsed-client perk, not an extra discount.',
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹4.5L counted (+₹62.4k vs the ₹3.8L stream plan) · 62 buyers'],
          'Rate of sale': ['Needs ≈14 12-class pack sales vs 29 a month today (all buyers).'],
          'Why it works': [
            'Lapsed clients left something that no longer exists; showing what\'s new answers "why go back". April has the most attention of the year.',
          ],
          'What to watch': ['Bandra needs 54 reactivations in April from 673 touches.'],
          'Offer auditor': [
            '21/25 (Effect 4, Creativity 4, Clarity 5, Practical 4, Economics 4). Good story, cost unchanged.',
          ],
          Model: [
            '673 in pool × 8.0% plan rate × 1.15 conversion factor = 62.1 buyers × ₹8.2k ticket (23% take the featured product) = ₹5.1L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'renewal',
        name: 'Lock In Before You Clock Out',
        tagline: "Renew in April at today's price, with bonus classes.",
        fields: {
          'Commercial job': ['Protect Apr–Jun renewals without deep pull-forward'],
          'Who qualifies': ['Members expiring 1 Apr–15 Jun only.'],
          'You pay': ["Renewal at your product's list price (no % off)."],
          'You get': ['• Renew at list', '• +3 classes on packs, +7 days on 1M, +14 days on 3M or longer'],
          When: ['All April.'],
          Rules: [
            '• No % discount',
            '• Members expiring after 15 Jun are not eligible',
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '10.0% effective = 0% cash + 10.0% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹23.0L counted (+₹88.3k vs the ₹22.1L stream plan) · 95 buyers'],
          'Rate of sale': ['Needs ≈95 renewal purchases (plan 88).'],
          'Why it works': [
            '2026 anniversary-code buyers renewed at 24.5% at Kwality vs 61.6% at full price. Restricting eligibility limits pull-forward.',
          ],
          'What to watch': ['Renewal purchases vs due (plan KH 130 vs 120 due).'],
          'Offer auditor': [
            '22/25 (Effect 5, Creativity 3, Clarity 5, Practical 5, Economics 4). The economic backbone of April.',
          ],
          Model: [
            '74 in pool × 118.9% plan rate × 1.08 conversion factor = 95.0 buyers × ₹25.1k ticket = ₹23.8L modelled; 50% of uplift counted',
          ],
        },
      },
    ],
  },
  {
    studio: 'Bandra',
    month: 5,
    theme: 'The Afterparty',
    hook: "Mother's Day (Sun 9 May)",
    job: 'Retain the April cohort (target ≥55% renewal at next expiry vs 24.5% for 2026 anniversary-code buyers at Kwality); duo acquisition.',
    moment:
      'Every April buyer gets the 30-day Afterparty plan: week-1 call, 8 classes in May unlocks a hosted class and a progress check.',
    figures: {
      target: 1870000,
      projected: 1970000,
      newClientPlan: 370000,
      renewalPlan: 1190000,
      reactivationPlan: 180000,
      otherPlan: 130000,
      leadsTrials: [221, 126],
      renewals: [85, 55],
      lapsed: [365, 29],
      newBuyers: 22,
    },
    offers: [
      {
        slot: 'newcomer',
        name: 'Mother Shaker Second Date',
        tagline: 'Bring your mum. Both second classes are on us.',
        fields: {
          Journey: ['The Second Date'],
          'Commercial job': ["Duo acquisition around Mother's Day"],
          'Who qualifies': ['A mother and a family member, both new.'],
          'You pay': ['1M unlimited: ₹17.2k (15% off the ₹20.2k list price).'],
          'You get': [
            '• Free first Barre class for both',
            '• Class 2 booked together, free within 7 days',
            '• Both buy within 72 hours of class 2: standing 15% each + one shared 30-minute duo private',
          ],
          When: ['1–16 May.'],
          Rules: [
            '• Both must be new',
            '• The 15% is the standing new-client perk, not an extra discount.',
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '21.5% effective = 15% cash + 6.5% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹4.2L counted (+₹45.5k vs the ₹3.7L stream plan) · 27 buyers'],
          'Rate of sale': ['Needs ≈14 1M unlimited sales vs 19.7 a month today (all buyers).'],
          'Why it works': ['Duo + booked second class.'],
          'What to watch': ['Both new.'],
          'Offer auditor': ['21/25 (Effect 4, Creativity 4, Clarity 5, Practical 4, Economics 4). Good seasonal duo.'],
          Model: [
            '126 in pool × 17.5% plan rate × 1.24 conversion factor = 27.3 buyers × ₹16.9k ticket (50% take the featured product) = ₹4.6L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'lapsed',
        name: 'The Comeback Squad',
        tagline: 'Rejoin with a group that starts the same day.',
        fields: {
          'Commercial job': ['Cohort reactivation'],
          'Who qualifies': ['Lapsed clients.'],
          'You pay': ['1M unlimited: ₹17.2k (15% off the ₹20.2k list price).'],
          'You get': [
            '• 1M unlimited at the standing 15%',
            '• A fixed weekly squad class, trainer WhatsApp group, week-4 check-in',
          ],
          When: ['Squads start 3 and 17 May.'],
          Rules: [
            '• Squads of 6–10',
            '• The 15% is the standing lapsed-client perk, not an extra discount.',
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹2.1L counted (+₹28.8k vs the ₹1.8L stream plan) · 32 buyers'],
          'Rate of sale': ['Needs ≈7 1M unlimited sales vs 19.7 a month today (all buyers).'],
          'Why it works': ['Reactivations renew at only 37–47%; a squad builds the habit first.'],
          'What to watch': ['Squad members renewing at 1M end.'],
          'Offer auditor': [
            '21/25 (Effect 4, Creativity 4, Clarity 5, Practical 4, Economics 4). Addresses the low re-renewal of reactivations.',
          ],
          Model: [
            '365 in pool × 7.9% plan rate × 1.10 conversion factor = 31.9 buyers × ₹7.4k ticket (23% take the featured product) = ₹2.4L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'renewal',
        name: 'The Afterparty',
        tagline: 'Book 8 in May; get a hosted class and a progress check.',
        fields: {
          'Commercial job': ['Retain the April cohort'],
          'Who qualifies': ['April buyers and May renewers.'],
          'You pay': ["Renewal at your product's list price (no % off)."],
          'You get': ['• Book 8 classes in May → a free hosted class + a trainer progress check', '• Renew at list'],
          When: ['All May.'],
          Rules: ['• No % discount', "• Doesn't combine with any other campaign offer."],
          'Effective discount': [
            '2.0% effective = 0% cash + 2.0% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹12.1L counted (+₹23.7k vs the ₹11.9L stream plan) · 57 buyers'],
          'Rate of sale': ['Needs ≈57 renewal purchases (plan 55).'],
          'Why it works': [
            'Target ≥55% of April commitment buyers renewing at next expiry (2026 code buyers: 24.5% at Kwality).',
          ],
          'What to watch': ['April cohort attendance in May.'],
          'Offer auditor': [
            '22/25 (Effect 5, Creativity 3, Clarity 5, Practical 4, Economics 5). Protects the April investment.',
          ],
          Model: [
            '85 in pool × 64.7% plan rate × 1.04 conversion factor = 57.2 buyers × ₹21.6k ticket = ₹12.3L modelled; 50% of uplift counted',
          ],
        },
      },
    ],
  },
  {
    studio: 'Bandra',
    month: 6,
    theme: 'Out of Office',
    hook: "Summer travel · college holidays · Father's Day (Sun 20 Jun)",
    job: 'Stop summer lapses; fill weekday 10–12 and weekend 4–7 pm (27–41% full) with students.',
    moment: 'Golden Hours launch for students and under-25s.',
    figures: {
      target: 1550000,
      projected: 1730000,
      newClientPlan: 320000,
      renewalPlan: 1010000,
      reactivationPlan: 110000,
      otherPlan: 110000,
      leadsTrials: [203, 116],
      renewals: [86, 50],
      lapsed: [238, 19],
      newBuyers: 20,
    },
    offers: [
      {
        slot: 'newcomer',
        name: 'Golden Hours Flight',
        tagline: 'Students: three classes in ten days, in the hours with room.',
        fields: {
          Journey: ['The Tasting Flight'],
          'Commercial job': ['Student acquisition into empty slots'],
          'Who qualifies': ['Students or under-25s with ID.'],
          'You pay': [
            'Intro: ₹1.5k for the Student Tasting Flight (3 classes in 10 days), credited in full against a qualifying purchase within 72 hours. 8-class pack: ₹10.5k (20% off the ₹13.1k list price).',
          ],
          'You get': [
            '• 3 classes in 10 days in weekday 10–12 or weekend 4–7 pm classes',
            '• Full fee credited within 72 hours against the Golden Hours 8-class pack (20% off, valid in those slots only)',
          ],
          When: ['1 Jun–31 Jul.'],
          Rules: [
            '• ID checked at class 1',
            "• Replaces the standing 15% perk; the two don't combine.",
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '20.0% effective = 20% cash. Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹3.3L counted (+₹12.5k vs the ₹3.2L stream plan) · 24 buyers'],
          'Rate of sale': ['Needs ≈14 8-class pack sales vs 8 a month today (all buyers).'],
          'Why it works': ['Those slots run at 27–41% fill; students fill them without cannibalising peak classes.'],
          'What to watch': ['Golden Hours fill.'],
          'Offer auditor': [
            '21/25 (Effect 4, Creativity 4, Clarity 5, Practical 4, Economics 4). Good use of empty seats.',
          ],
          Model: [
            '116 in pool × 17.2% plan rate × 1.20 conversion factor = 24.0 buyers × ₹14.2k ticket (60% take the featured product) = ₹3.4L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'lapsed',
        name: 'Pay-As-You-Return',
        tagline: "Start with 4. If you're back, it all counts.",
        fields: {
          'Commercial job': ['Low-risk re-entry ladder'],
          'Who qualifies': ['Lapsed clients.'],
          'You pay': ['4-class pack: ₹7.1k (list price).'],
          'You get': [
            '• 4-class pack at list',
            '• Buy a 12-class pack within 14 days → the full 4-pack price is credited',
          ],
          When: ['All June.'],
          Rules: [
            '• Replaces the 15% lapsed perk',
            "• Replaces the standing 15% perk; the two don't combine.",
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '0.0% effective = 0% cash. Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹1.2L counted (+₹14k vs the ₹1.1L stream plan) · 23 buyers'],
          'Rate of sale': ['Needs ≈9 4-class pack sales vs 11 a month today (all buyers).'],
          'Why it works': [
            "Lowest barrier to return; Bandra's reactivation rate is the lowest in the group (2.8% a month).",
          ],
          'What to watch': ['4 → 12 ladder rate.'],
          'Offer auditor': [
            '23/25 (Effect 4, Creativity 4, Clarity 5, Practical 5, Economics 5). Low cost, low barrier.',
          ],
          Model: [
            '238 in pool × 8.0% plan rate × 1.20 conversion factor = 22.8 buyers × ₹6k ticket (41% take the featured product) = ₹1.4L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'renewal',
        name: 'The Pause Button',
        tagline: 'Three months unlimited. Freeze it as often as you like.',
        fields: {
          'Commercial job': ['Stop summer lapses'],
          'Who qualifies': ['1M and 3M renewers.'],
          'You pay': ['3M unlimited: ₹57.9k (list price).'],
          'You get': ['• 3M unlimited at list', '• Unlimited freezes (use within 6 months)'],
          When: ['All June.'],
          Rules: ['• Freezes in blocks of 3+ days', "• Doesn't combine with any other campaign offer."],
          'Effective discount': [
            '0.0% effective = 0% cash. Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹11.6L counted (+₹1.5L vs the ₹10.1L stream plan) · 52 buyers'],
          'Rate of sale': ['Needs ≈14 3M unlimited sales vs 5 a month today (all buyers).'],
          'Why it works': [
            'The best time of year for this offer: travel is the main reason to let a membership lapse.',
          ],
          'What to watch': ['June renewal yield.'],
          'Offer auditor': ['23/25 (Effect 5, Creativity 4, Clarity 5, Practical 4, Economics 5). Peak relevance.'],
          Model: [
            '86 in pool × 58.1% plan rate × 1.03 conversion factor = 51.5 buyers × ₹25.5k ticket (28% take the featured product) = ₹13.1L modelled; 50% of uplift counted',
          ],
        },
      },
    ],
  },
  {
    studio: 'Bandra',
    month: 7,
    theme: 'Monsoon I: Rain Check',
    hook: 'Monsoon · Amazing Race warm-up',
    job: 'Attendance and late cancels (Kenkere 21–30%); get people on a membership before the race starts on 1 Aug.',
    moment: 'Race registrations open 15 Jul. Monsoon Streak leaderboard by studio.',
    figures: {
      target: 2140000,
      projected: 2200000,
      newClientPlan: 390000,
      renewalPlan: 1420000,
      reactivationPlan: 180000,
      otherPlan: 150000,
      leadsTrials: [205, 117],
      renewals: [90, 62],
      lapsed: [337, 27],
      newBuyers: 22,
    },
    offers: [
      {
        slot: 'newcomer',
        name: 'Kickstart 21: Race Ready Cohort',
        tagline: '21 days that end on the Amazing Race start line.',
        fields: {
          Journey: ['Kickstart 21'],
          'Commercial job': ['Get new clients race-fit and converted before August'],
          'Who qualifies': ['First-time clients.'],
          'You pay': ['Kickstart 21 cohort: ₹10k (list price).'],
          'You get': [
            '• Cohort Mon 12 Jul → graduates 1 Aug, race day one',
            '• 21 days unlimited + coach, WhatsApp, fitness checks',
            '• Graduates: standing 15% within 7 days and a Rookie leaderboard entry',
          ],
          When: ['Book by 11 Jul.'],
          Rules: [
            '• Cohort fee not credited',
            "• Replaces the standing 15% perk; the two don't combine.",
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '0.0% effective = 0% cash. Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹4.0L counted (+₹2.5k vs the ₹3.9L stream plan) · 24 buyers'],
          'Rate of sale': ['Needs ≈9 Kickstart 21 cohort sales (new product, no current rate).'],
          'Why it works': ['Gives July a goal and a date; graduation lands on the race start.'],
          'What to watch': ['Graduates entering the race.'],
          'Offer auditor': [
            '23/25 (Effect 5, Creativity 5, Clarity 5, Practical 4, Economics 4). Elegant link to August.',
          ],
          Model: [
            '117 in pool × 18.8% plan rate × 1.10 conversion factor = 24.2 buyers × ₹16.4k ticket (36% take the featured product) = ₹4.0L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'lapsed',
        name: 'Warm-Up Lap',
        tagline: 'Get race-fit before the gun goes on 1 August.',
        fields: {
          'Commercial job': ['Reactivate into the race'],
          'Who qualifies': ['Lapsed clients.'],
          'You pay': ['1M unlimited: ₹17.2k (15% off the ₹20.2k list price).'],
          'You get': [
            '• 1M at the standing 15%, start 15 Jul–1 Aug',
            '• Free race-prep assessment',
            '• Full race entry',
          ],
          When: ['15–31 Jul.'],
          Rules: [
            '• Standing perk',
            '• The 15% is the standing lapsed-client perk, not an extra discount.',
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹2.0L counted (+₹26.7k vs the ₹1.8L stream plan) · 30 buyers'],
          'Rate of sale': ['Needs ≈7 1M unlimited sales vs 19.7 a month today (all buyers).'],
          'Why it works': ['An event with a date beats a discount for lapsed clients.'],
          'What to watch': ['Lapsed race entries.'],
          'Offer auditor': ['23/25 (Effect 5, Creativity 4, Clarity 5, Practical 5, Economics 4). Strong hook.'],
          Model: [
            '337 in pool × 8.0% plan rate × 1.10 conversion factor = 29.7 buyers × ₹7.7k ticket (23% take the featured product) = ₹2.3L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'renewal',
        name: 'Monsoon Streak',
        tagline: '12+ classes, zero late cancels, +7 days.',
        fields: {
          'Commercial job': ['Cut late cancels and lift renewals'],
          'Who qualifies': ['July renewers.'],
          'You pay': ["Renewal at your product's list price (no % off)."],
          'You get': [
            '• Renew at list',
            '• 12+ classes and zero late cancels in July → +7 days (unlimited) or +1 class (packs)',
          ],
          When: ['All July.'],
          Rules: ['• No % discount', "• Doesn't combine with any other campaign offer."],
          'Effective discount': [
            '7.0% effective = 0% cash + 7.0% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹14.5L counted (+₹28.4k vs the ₹14.2L stream plan) · 64 buyers'],
          'Rate of sale': ['Needs ≈64 renewal purchases (plan 62).'],
          'Why it works': [
            "Fixes behaviour and revenue together; Bandra's 2025 late-cancel spike fell once the rule was enforced.",
          ],
          'What to watch': ['Late-cancel rate (Kenkere target <15%).'],
          'Offer auditor': ['22/25 (Effect 5, Creativity 4, Clarity 5, Practical 4, Economics 4). Best July renewal.'],
          Model: [
            '90 in pool × 68.9% plan rate × 1.04 conversion factor = 64.5 buyers × ₹22.9k ticket = ₹14.7L modelled; 50% of uplift counted',
          ],
        },
      },
    ],
  },
  {
    studio: 'Bandra',
    month: 8,
    theme: 'The Amazing Race 2.0',
    hook: 'Month-long individual race · Friendship Day (Sun 1 Aug)',
    job: 'Attendance-led renewals and upgrades; bring new clients in on a Rookie leaderboard; second seasonal peak in Mumbai.',
    moment:
      'The Amazing Race 2.0: every client races on their own against a studio leaderboard, 1–31 Aug. Rookie leaderboard for first-timers.',
    figures: {
      target: 2550000,
      projected: 2760000,
      newClientPlan: 320000,
      renewalPlan: 1800000,
      reactivationPlan: 250000,
      otherPlan: 180000,
      leadsTrials: [142, 81],
      renewals: [106, 70],
      lapsed: [424, 34],
      newBuyers: 16,
    },
    offers: [
      {
        slot: 'newcomer',
        name: 'Starting Gun Week',
        tagline: 'Seven days unlimited from the day the race starts.',
        fields: {
          Journey: ['Week Zero'],
          'Commercial job': ['Bold intro into the Rookie leaderboard'],
          'Who qualifies': ['First-time clients.'],
          'You pay': [
            'Intro: ₹2k for the 7-day unlimited intro, credited in full against a qualifying purchase within 72 hours. Then any pack or membership at 15% off list (the standing new-client perk).',
          ],
          'You get': [
            '• 7 days unlimited (max 2 a day); classes count on the Rookie leaderboard',
            '• Credited within 72 hours against any pack or membership + standing 15%',
            '• Race kit (bib and tote, ≈₹1,000) with the purchase',
          ],
          When: ['1–20 Aug.'],
          Rules: [
            '• One intro per person',
            '• The 15% is the standing new-client perk, not an extra discount.',
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '21.0% effective = 15% cash + 6.0% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹3.7L counted (+₹50.1k vs the ₹3.2L stream plan) · 20 buyers'],
          'Rate of sale': ['Needs ≈20 renewal purchases (plan 16).'],
          'Why it works': [
            'An individual race is intimidating for beginners; a Rookie leaderboard and an unlimited week make it winnable.',
          ],
          'What to watch': ['Rookie entries; intro conversion.'],
          'Offer auditor': ['23/25 (Effect 5, Creativity 5, Clarity 5, Practical 4, Economics 4). Best August entry.'],
          Model: [
            '81 in pool × 19.8% plan rate × 1.25 conversion factor = 20.0 buyers × ₹21.1k ticket = ₹4.2L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'lapsed',
        name: 'Back on Track',
        tagline: 'Your lane is still open.',
        fields: {
          'Commercial job': ['Reactivate into the race'],
          'Who qualifies': ['Lapsed clients.'],
          'You pay': ['1M unlimited: ₹17.8k (12% off the ₹20.2k list price).'],
          'You get': ['• 1M at 12% off', '• Finish the race target → +3 days'],
          When: ['1–15 Aug.'],
          Rules: [
            '• Replaces the 15% lapsed perk',
            "• Replaces the standing 15% perk; the two don't combine.",
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '22.0% effective = 12% cash + 10.0% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹2.9L counted (+₹41.7k vs the ₹2.5L stream plan) · 39 buyers'],
          'Rate of sale': ['Needs ≈9 1M unlimited sales vs 19.7 a month today (all buyers).'],
          'Why it works': ['Race + earned bonus; max effective 22%.'],
          'What to watch': ['Lapsed racers finishing.'],
          'Offer auditor': [
            '22/25 (Effect 5, Creativity 4, Clarity 5, Practical 4, Economics 4). On-theme and earned.',
          ],
          Model: [
            '424 in pool × 8.0% plan rate × 1.15 conversion factor = 39.1 buyers × ₹8.5k ticket (23% take the featured product) = ₹3.3L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'renewal',
        name: 'Pit Stop',
        tagline: 'Renew mid-race and keep your streak.',
        fields: {
          'Commercial job': ['Renewals during the race'],
          'Who qualifies': ['Members expiring in August or early September.'],
          'You pay': ["Renewal at your product's list price (no % off)."],
          'You get': [
            '• Renew at list; race progress carries over',
            '• Race finishers get +7 days on 1M or +14 days on 3M+',
            '• Upgrade to 3M with unlimited freezes',
          ],
          When: ['All August.'],
          Rules: ['• No % discount', "• Doesn't combine with any other campaign offer."],
          'Effective discount': [
            '7.0% effective = 0% cash + 7.0% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹19.2L counted (+₹1.2L vs the ₹18.0L stream plan) · 74 buyers'],
          'Rate of sale': ['Needs ≈74 renewal purchases (plan 70).'],
          'Why it works': ['The race lifts attendance, and attendance lifts renewals; finisher bonuses are earned.'],
          'What to watch': ['Race finish rate; renewal yield.'],
          'Offer auditor': [
            '23/25 (Effect 5, Creativity 4, Clarity 5, Practical 4, Economics 5). Ties renewals to the race.',
          ],
          Model: [
            '106 in pool × 66.0% plan rate × 1.05 conversion factor = 73.5 buyers × ₹27.7k ticket = ₹20.4L modelled; 50% of uplift counted',
          ],
        },
      },
    ],
  },
  {
    studio: 'Bandra',
    month: 9,
    theme: 'Monsoon III: The Comeback',
    hook: '57 days to Diwali (2 Sep → 28 Oct)',
    job: 'Reactivate before the festive season; carry race momentum into a festive countdown.',
    moment: '57 Days to Diwali countdown starts 2 Sep; Bandra reunion repeat.',
    figures: {
      target: 1800000,
      projected: 2030000,
      newClientPlan: 320000,
      renewalPlan: 1140000,
      reactivationPlan: 210000,
      otherPlan: 130000,
      leadsTrials: [194, 111],
      renewals: [114, 56],
      lapsed: [466, 37],
      newBuyers: 20,
    },
    offers: [
      {
        slot: 'newcomer',
        name: 'The Second Date',
        tagline: 'Your second class is booked before you leave.',
        fields: {
          Journey: ['The Second Date'],
          'Commercial job': ['Core free-trial journey'],
          'Who qualifies': ['First-time clients starting with Barre.'],
          'You pay': ['Then any pack or membership at 15% off list (the standing new-client perk).'],
          'You get': [
            '• Free first Barre class',
            '• Class 2 free within 7 days, booked at the desk',
            '• 15% within 72 hours of class 2; 10% until day 14',
          ],
          When: ['All September.'],
          Rules: [
            '• Strength Lab not included',
            '• The 15% is the standing new-client perk, not an extra discount.',
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹3.5L counted (+₹28.6k vs the ₹3.2L stream plan) · 24 buyers'],
          'Rate of sale': ['Needs ≈24 renewal purchases (plan 20).'],
          'Why it works': ['Core fix.'],
          'What to watch': ['Second-visit share.'],
          'Offer auditor': ['23/25 (Effect 5, Creativity 4, Clarity 5, Practical 5, Economics 4). Reliable core.'],
          Model: [
            '111 in pool × 18.0% plan rate × 1.18 conversion factor = 23.6 buyers × ₹15.9k ticket = ₹3.7L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'lapsed',
        name: 'We Kept Your Spot',
        tagline: 'A personal note from your favourite trainer.',
        fields: {
          'Commercial job': ['Trainer-led reactivation'],
          'Who qualifies': ['Lapsed clients with a most-booked trainer.'],
          'You pay': ['12-class pack: ₹16.7k (15% off the ₹19.7k list price).'],
          'You get': [
            '• Message from that trainer with a reserved spot in their class',
            '• 12-class pack at the standing 15%',
          ],
          When: ['All September.'],
          Rules: [
            '• Standing perk',
            '• The 15% is the standing lapsed-client perk, not an extra discount.',
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹2.5L counted (+₹38.3k vs the ₹2.1L stream plan) · 41 buyers'],
          'Rate of sale': ['Needs ≈10 12-class pack sales vs 29 a month today (all buyers).'],
          'Why it works': ['Trainer relationships are what clients miss.'],
          'What to watch': ['Needs most-booked trainer per client.'],
          'Offer auditor': [
            '20/25 (Effect 5, Creativity 4, Clarity 4, Practical 3, Economics 4). High effect; data needed.',
          ],
          Model: [
            '466 in pool × 7.9% plan rate × 1.10 conversion factor = 40.7 buyers × ₹7.1k ticket (25% take the featured product) = ₹2.9L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'renewal',
        name: 'Festive Pause Button',
        tagline: 'Renew 3 months; Diwali and year-end travel covered.',
        fields: {
          'Commercial job': ['Renew through the festive season'],
          'Who qualifies': ['1M and 3M renewers.'],
          'You pay': ['3M unlimited: ₹57.9k (list price).'],
          'You get': ['• 3M at list', '• Unlimited freezes (use within 6 months)', '• Festive gift (≈₹1,000)'],
          When: ['All September.'],
          Rules: ['• No % discount', "• Doesn't combine with any other campaign offer."],
          'Effective discount': [
            '1.7% effective = 0% cash + 1.7% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹13.0L counted (+₹1.6L vs the ₹11.4L stream plan) · 57 buyers'],
          'Rate of sale': ['Needs ≈16 3M unlimited sales vs 5 a month today (all buyers).'],
          'Why it works': ['October–December are troughs; locking 3M now carries members through them.'],
          'What to watch': ['3M renewals.'],
          'Offer auditor': ['23/25 (Effect 5, Creativity 4, Clarity 5, Practical 4, Economics 5). Right timing.'],
          Model: [
            '114 in pool × 49.1% plan rate × 1.02 conversion factor = 57.1 buyers × ₹25.6k ticket (28% take the featured product) = ₹14.6L modelled; 50% of uplift counted',
          ],
        },
      },
    ],
  },
  {
    studio: 'Bandra',
    month: 10,
    theme: 'Festival of Lights',
    hook: 'Diwali (Fri 29 Oct) · Dasara week in Bengaluru',
    job: "Gift-led revenue; protect Kenkere's Dasara trough; catch Kwality's late-October surge without codes.",
    moment: 'Gift cards on sale from 1 Oct; candle-lit evening classes in Diwali week; limited-run format #3.',
    figures: {
      target: 1660000,
      projected: 1730000,
      newClientPlan: 290000,
      renewalPlan: 1070000,
      reactivationPlan: 180000,
      otherPlan: 120000,
      leadsTrials: [200, 114],
      renewals: [89, 57],
      lapsed: [408, 33],
      newBuyers: 20,
    },
    offers: [
      {
        slot: 'newcomer',
        name: 'Festival of Lights Second Date',
        tagline: 'A candle-lit first class. Your second is booked at the door.',
        fields: {
          Journey: ['The Second Date'],
          'Commercial job': ['Hosted first class with the second visit locked in'],
          'Who qualifies': ['First-timers at candle-lit 7 pm classes in Diwali week.'],
          'You pay': ['Then any pack or membership at 15% off list (the standing new-client perk).'],
          'You get': [
            '• Free candle-lit class',
            '• Class 2 booked at the door, free within 7 days',
            '• 15% within 72 hours of class 2',
          ],
          When: ['Diwali week.'],
          Rules: [
            '• Named associate at the door',
            '• The 15% is the standing new-client perk, not an extra discount.',
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹3.2L counted (+₹26.4k vs the ₹2.9L stream plan) · 24 buyers'],
          'Rate of sale': ['Needs ≈24 renewal purchases (plan 20).'],
          'Why it works': [
            'Hosted first visits convert at 1–3% today; booking the second class at the door is the fix.',
          ],
          'What to watch': ['Door bookings.'],
          'Offer auditor': [
            '22/25 (Effect 5, Creativity 4, Clarity 5, Practical 4, Economics 4). Fixes hosted conversion.',
          ],
          Model: [
            '114 in pool × 17.5% plan rate × 1.18 conversion factor = 23.6 buyers × ₹14.7k ticket = ₹3.5L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'lapsed',
        name: 'Come Home for Diwali',
        tagline: "Your mat's still here.",
        fields: {
          'Commercial job': ['Festive reactivation'],
          'Who qualifies': ['Lapsed clients.'],
          'You pay': ['12-class pack: ₹16.7k (15% off the ₹19.7k list price).'],
          'You get': ['• 12-class pack at the standing 15% + a comeback class in Diwali week'],
          When: ['All October.'],
          Rules: [
            '• Standing perk',
            '• The 15% is the standing lapsed-client perk, not an extra discount.',
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹2.0L counted (+₹28.8k vs the ₹1.8L stream plan) · 35 buyers'],
          'Rate of sale': ['Needs ≈9 12-class pack sales vs 29 a month today (all buyers).'],
          'Why it works': ['Simple and on-theme.'],
          'What to watch': ['Reactivations.'],
          'Offer auditor': ['20/25 (Effect 3, Creativity 3, Clarity 5, Practical 5, Economics 4). Plain.'],
          Model: [
            '408 in pool × 8.1% plan rate × 1.05 conversion factor = 34.6 buyers × ₹6.7k ticket (25% take the featured product) = ₹2.3L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'renewal',
        name: 'Renew & Gift',
        tagline: 'Renew in October; 5% back to spend on a gift card.',
        fields: {
          'Commercial job': ['Renewals that fund gift cards'],
          'Who qualifies': ['October renewers.'],
          'You pay': ["Renewal at your product's list price (no % off)."],
          'You get': ['• Renew at list → 5% back as credit usable only on a Gift a Shake card'],
          When: ['All October.'],
          Rules: ['• Credit valid until 15 Nov', "• Doesn't combine with any other campaign offer."],
          'Effective discount': [
            '5.0% effective = 0% cash + 5.0% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹10.9L counted (+₹16.1k vs the ₹10.7L stream plan) · 59 buyers'],
          'Rate of sale': ['Needs ≈59 renewal purchases (plan 57).'],
          'Why it works': ['Turns renewal value into new-client acquisition.'],
          'What to watch': ['Credit used on gifts.'],
          'Offer auditor': ['21/25 (Effect 4, Creativity 4, Clarity 5, Practical 4, Economics 4). Smart loop.'],
          Model: [
            '89 in pool × 64.0% plan rate × 1.03 conversion factor = 58.7 buyers × ₹18.8k ticket = ₹11.0L modelled; 50% of uplift counted',
          ],
        },
      },
    ],
  },
  {
    studio: 'Bandra',
    month: 11,
    theme: 'Black Friday, Strong Monday',
    hook: 'Black Friday (Fri 26 Nov) → Cyber Monday (29 Nov)',
    job: 'Long commitments in the softest Mumbai month.',
    moment: 'Club Nine last seats (only those unsold in April).',
    figures: {
      target: 1360000,
      projected: 1490000,
      newClientPlan: 200000,
      renewalPlan: 920000,
      reactivationPlan: 140000,
      otherPlan: 100000,
      leadsTrials: [130, 74],
      renewals: [69, 51],
      lapsed: [344, 27],
      newBuyers: 14,
    },
    offers: [
      {
        slot: 'newcomer',
        name: 'Black Friday Week Zero',
        tagline: 'Seven days unlimited, fully credited.',
        fields: {
          Journey: ['Week Zero'],
          'Commercial job': ['Bold intro in the softest Mumbai month'],
          'Who qualifies': ['First-time clients.'],
          'You pay': [
            'Intro: ₹2k for the 7-day unlimited intro, credited in full against a qualifying purchase within 72 hours. Then any pack or membership at 15% off list (the standing new-client perk).',
          ],
          'You get': [
            '• 7 days unlimited (max 2 a day)',
            '• Credited within 72 hours against any pack or membership + standing 15%',
            '• Upgrade to 3M before day 21 of a 1M: the 1M amount is credited and the 3M gets unlimited freezes (use within 6 months)',
          ],
          When: ['20 Nov–5 Dec.'],
          Rules: [
            '• One intro per person',
            '• The 15% is the standing new-client perk, not an extra discount.',
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹2.3L counted (+₹31k vs the ₹2.0L stream plan) · 18 buyers'],
          'Rate of sale': ['Needs ≈18 renewal purchases (plan 14).'],
          'Why it works': ['Black Friday urgency without a deeper %.'],
          'What to watch': ['Intro conversion; day-21 upgrades.'],
          'Offer auditor': ['22/25 (Effect 5, Creativity 4, Clarity 5, Practical 4, Economics 4). Strong.'],
          Model: [
            '74 in pool × 18.9% plan rate × 1.25 conversion factor = 17.5 buyers × ₹14.9k ticket = ₹2.6L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'lapsed',
        name: 'Black Friday Comeback',
        tagline: 'Back for a month, plus three days.',
        fields: {
          'Commercial job': ['Year-end reactivation'],
          'Who qualifies': ['Lapsed clients.'],
          'You pay': ['1M unlimited: ₹17.8k (12% off the ₹20.2k list price).'],
          'You get': ['• 1M at 12% off + 3 days'],
          When: ['26–29 Nov.'],
          Rules: [
            '• Replaces the 15% perk',
            "• Replaces the standing 15% perk; the two don't combine.",
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '22.0% effective = 12% cash + 10.0% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹1.6L counted (+₹19.2k vs the ₹1.4L stream plan) · 27 buyers'],
          'Rate of sale': ['Needs ≈6 1M unlimited sales vs 19.7 a month today (all buyers).'],
          'Why it works': ['Same window as the new-client offer.'],
          'What to watch': ['Effective 22%.'],
          'Offer auditor': ['21/25 (Effect 4, Creativity 3, Clarity 5, Practical 5, Economics 4). Fine.'],
          Model: [
            '344 in pool × 7.8% plan rate × 1.00 conversion factor = 27.0 buyers × ₹6.6k ticket (23% take the featured product) = ₹1.8L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'renewal',
        name: 'Club Nine: Last Seats',
        tagline: 'The last numbered seats.',
        fields: {
          'Commercial job': ['Annuals at list'],
          'Who qualifies': ['Active members.'],
          'You pay': ['Annual unlimited: ₹2.2L (list price).'],
          'You get': ['• Only the Club Nine seats unsold in April, same perks'],
          When: ['From 26 Nov until sold.'],
          Rules: ['• No new seats created', "• Doesn't combine with any other campaign offer."],
          'Effective discount': [
            '5.7% effective = 0% cash + 5.7% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹10.1L counted (+₹82.1k vs the ₹9.2L stream plan) · 51 buyers'],
          'Rate of sale': ['Needs ≈2 Annual unlimited sales vs 1.7 a month today (all buyers).'],
          'Why it works': ['Closes the scarcity story.'],
          'What to watch': ['Seats remaining.'],
          'Offer auditor': ['22/25 (Effect 4, Creativity 4, Clarity 5, Practical 4, Economics 5). Good.'],
          Model: [
            '69 in pool × 73.9% plan rate × 1.00 conversion factor = 51.0 buyers × ₹21.4k ticket (3% take the featured product) = ₹10.9L modelled; 50% of uplift counted',
          ],
        },
      },
    ],
  },
  {
    studio: 'Bandra',
    month: 12,
    theme: 'Wrapped',
    hook: 'Year-end · pre-sell January',
    job: "Pre-sell the February 2028 challenge and January's first week; renew on personal usage data.",
    moment:
      '"Your 2027 Wrapped": a personal year-in-review for every client, ending in a usage-based renewal recommendation.',
    figures: {
      target: 1850000,
      projected: 1900000,
      newClientPlan: 290000,
      renewalPlan: 1260000,
      reactivationPlan: 170000,
      otherPlan: 130000,
      leadsTrials: [147, 84],
      renewals: [81, 51],
      lapsed: [295, 24],
      newBuyers: 15,
    },
    offers: [
      {
        slot: 'newcomer',
        name: 'Kickstart 21: Pre-Solution Cohort',
        tagline: 'Buy in December. Start Mon 3 Jan. Arrive at the February challenge.',
        fields: {
          Journey: ['Kickstart 21'],
          'Commercial job': ['Pre-sell January'],
          'Who qualifies': ['First-time clients.'],
          'You pay': ['Kickstart 21 cohort: ₹10k (list price).'],
          'You get': [
            '• Cohort starts Mon 3 Jan 2028; sold in December',
            '• 21 days unlimited + coach, WhatsApp, fitness checks, graduation',
            '• Graduates who buy a membership join the February 2028 challenge with a scaled target',
          ],
          When: ['All December.'],
          Rules: [
            '• Cohort fee not credited',
            "• Replaces the standing 15% perk; the two don't combine.",
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '0.0% effective = 0% cash. Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹2.9L counted (+₹0.7k vs the ₹2.9L stream plan) · 17 buyers'],
          'Rate of sale': ['Needs ≈6 Kickstart 21 cohort sales (new product, no current rate).'],
          'Why it works': [
            'Moves January demand into December cash and lands graduates in the members-only challenge.',
          ],
          'What to watch': ['Pre-sales; January graduation.'],
          'Offer auditor': [
            '23/25 (Effect 5, Creativity 5, Clarity 5, Practical 4, Economics 4). Smooths the December dip.',
          ],
          Model: [
            '84 in pool × 17.9% plan rate × 1.10 conversion factor = 16.5 buyers × ₹17.6k ticket (36% take the featured product) = ₹2.9L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'lapsed',
        name: 'Challenge Comeback Ticket',
        tagline: 'Buy now, start by 1 January, join Stronger in 30.',
        fields: {
          'Commercial job': ['Pre-sell reactivations into the challenge'],
          'Who qualifies': ['Lapsed clients.'],
          'You pay': ['1M unlimited: ₹17.2k (15% off the ₹20.2k list price).'],
          'You get': [
            '• 1M at the standing 15%, start any day until 1 Jan',
            '• Eligible for the February challenge (2028)',
          ],
          When: ['All December.'],
          Rules: [
            '• Standing perk',
            '• The 15% is the standing lapsed-client perk, not an extra discount.',
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹1.9L counted (+₹18.7k vs the ₹1.7L stream plan) · 25 buyers'],
          'Rate of sale': ['Needs ≈6 1M unlimited sales vs 19.7 a month today (all buyers).'],
          'Why it works': ["The challenge is members-only; this is the lapsed client's ticket in."],
          'What to watch': ['January starts.'],
          'Offer auditor': [
            '23/25 (Effect 5, Creativity 4, Clarity 5, Practical 5, Economics 4). Strong link to January.',
          ],
          Model: [
            '295 in pool × 8.1% plan rate × 1.05 conversion factor = 25.2 buyers × ₹8.2k ticket (23% take the featured product) = ₹2.1L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'renewal',
        name: 'Challenge-Ready Renewal',
        tagline: "Renew in December so you're covered for all of Stronger in 30.",
        fields: {
          'Commercial job': ['Renew at list ahead of the challenge'],
          'Who qualifies': ['Members expiring Dec–Jan.'],
          'You pay': ["Renewal at your product's list price (no % off)."],
          'You get': [
            "• Renew at list so the membership covers January and February's challenge",
            '• February challenge kit (≈₹1,000)',
          ],
          When: ['All December.'],
          Rules: ['• No % discount', "• Doesn't combine with any other campaign offer."],
          'Effective discount': [
            '4.0% effective = 0% cash + 4.0% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹12.9L counted (+₹31.5k vs the ₹12.6L stream plan) · 54 buyers'],
          'Rate of sale': ['Needs ≈54 renewal purchases (plan 51).'],
          'Why it works': ['Members-only challenge = a natural reason to renew before it starts.'],
          'What to watch': ['December renewals of January expiries.'],
          'Offer auditor': [
            '24/25 (Effect 5, Creativity 4, Clarity 5, Practical 5, Economics 5). Top December renewal.',
          ],
          Model: [
            '81 in pool × 63.0% plan rate × 1.05 conversion factor = 53.6 buyers × ₹24.7k ticket = ₹13.2L modelled; 50% of uplift counted',
          ],
        },
      },
    ],
  },
  {
    studio: 'Kenkere House',
    month: 1,
    theme: 'Start Line',
    hook: 'New Year · seven days unlimited · the annual re-up',
    job: 'Convert January trial demand and re-up the Jan-2026 annuals (8 annuals, ₹12.5L due). Nothing launches this month, so January sells the habit: a credited first week, a free comeback class and a re-up at list — and every January membership carries into February.',
    moment:
      'January is the first week — a credited seven-day intro, a free comeback class and the annual re-up at list. Nothing launches early: every January membership carries into February, when Stronger in 30 2.0 opens.',
    figures: {
      target: 1290000,
      projected: 1380000,
      newClientPlan: 350000,
      renewalPlan: 660000,
      reactivationPlan: 110000,
      otherPlan: 170000,
      leadsTrials: [405, 81],
      renewals: [42, 41],
      lapsed: [254, 20],
      newBuyers: 20,
    },
    offers: [
      {
        slot: 'newcomer',
        name: 'The First Seven Days',
        tagline: 'Seven days unlimited. Then decide.',
        fields: {
          Journey: ['Week Zero'],
          'Commercial job': ['Convert high-intent January leads fast'],
          'Who qualifies': ['First-time clients (phone verified).'],
          'You pay': [
            'Intro: ₹1.5k for the 7-day unlimited intro, credited in full against a qualifying purchase within 72 hours. Then any pack or membership at 15% off list (the standing new-client perk).',
          ],
          'You get': [
            '• Unlimited Barre and powerCycle for 7 days (max 2 classes a day)',
            '• Goal-setting chat after class 1; owner check-in on day 3',
            '• Lab Induction seat at Kwality/Bandra',
            '• Buy any pack or membership within 72 hours of day 7: full intro fee credited + the standing 15%',
            "• Buy in January and you're pre-registered for February's challenge (target scaled)",
          ],
          When: ['1–24 Jan 2027.'],
          Rules: [
            '• One intro per person',
            '• Credit only within 72 hours of day 7',
            '• The 15% is the standing new-client perk, not an extra discount.',
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹4.0L counted (+₹54.3k vs the ₹3.5L stream plan) · 26 buyers'],
          'Rate of sale': ['Needs ≈26 renewal purchases (plan 20).'],
          'Why it works': [
            'January leads are the most motivated of the year. Clients with 5+ visits in month one convert at 94%; a credited week lets the habit form before the ask, and a January purchase hands February a warm list.',
          ],
          'What to watch': ['Intro → purchase (target 45%); classes in the intro week (target 4+).'],
          'Offer auditor': [
            '22/25 (Effect 5, Creativity 4, Clarity 5, Practical 4, Economics 4). Strongest January entry: bold, clear credit rule, and it hands February a warm list.',
          ],
          Model: [
            '81 in pool × 25.2% plan rate × 1.25 conversion factor = 25.5 buyers × ₹17.9k ticket = ₹4.6L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'lapsed',
        name: 'Back to the Barre',
        tagline: 'Your barre is still here. A class on us, then the standing return price.',
        fields: {
          'Commercial job': ['Reactivate lapsed clients early in the year'],
          'Who qualifies': ['Clients lapsed 61–365 days.'],
          'You pay': ['1M unlimited: ₹12.4k (15% off the ₹14.6k list price).'],
          'You get': [
            '• 1M unlimited or a 12-class pack at the standing 15% lapsed perk',
            '• A free comeback class to book before buying',
            "• Buy in January and you're pre-registered for February's challenge",
          ],
          When: ['Buy by 24 Jan 2027.'],
          Rules: [
            '• Standing 15% lapsed perk; no extra discount',
            '• The 15% is the standing lapsed-client perk, not an extra discount.',
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹1.3L counted (+₹17.5k vs the ₹1.1L stream plan) · 23 buyers'],
          'Rate of sale': ['Needs ≈5 1M unlimited sales vs 17.3 a month today (all buyers).'],
          'Why it works': [
            "Early January is the cheapest week of the year to win someone back: intent is high and the timetable is full. A free comeback class takes the risk out of the first visit, and a January purchase puts them in February's challenge.",
          ],
          'What to watch': ['Lapsed clients buying before 24 Jan.'],
          'Offer auditor': [
            '23/25 (Effect 5, Creativity 4, Clarity 5, Practical 5, Economics 4). A deadline with a reason behind it, and no discount given away.',
          ],
          Model: [
            '254 in pool × 8.0% plan rate × 1.15 conversion factor = 23.5 buyers × ₹6.3k ticket (23% take the featured product) = ₹1.5L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'renewal',
        name: 'The Annual Re-Up',
        tagline: "The January annuals renew at list — and February's challenge comes with them.",
        fields: {
          'Commercial job': ['Re-up the January-2026 annuals at list'],
          'Who qualifies': ['Annual members whose 2026 term started in January (8 annuals, ₹12.5L due).'],
          'You pay': ["Renewal at your product's list price (no % off)."],
          'You get': [
            '• +7 days on 3M, +14 days on 6M or 12M when you re-up by 31 Jan',
            '• Entry to February’s challenge, target scaled to the new term',
          ],
          When: ['2–31 Jan 2027.'],
          Rules: [
            '• No % discount',
            '• Bonus days are earned by re-upping in January',
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '7.0% effective = 0% cash + 7.0% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹6.7L counted (+₹16.4k vs the ₹6.6L stream plan) · 43 buyers'],
          'Rate of sale': ['Needs ≈43 renewal purchases (plan 41).'],
          'Why it works': [
            'Full-price renewers renew again at 61–68% vs 50–54% after a discount. January is when the annuals fall due; a small term bonus is cheaper than a percentage, and it starts the year at list.',
          ],
          'What to watch': ['Annuals re-upped; renewal yield.'],
          'Offer auditor': [
            '22/25 (Effect 5, Creativity 4, Clarity 4, Practical 4, Economics 5). Best renewal mechanic of the set: the bonus is earned by showing up, not by discounting.',
          ],
          Model: [
            '42 in pool × 97.4% plan rate × 1.05 conversion factor = 42.7 buyers × ₹16.1k ticket = ₹6.9L modelled; 50% of uplift counted',
          ],
        },
      },
    ],
  },
  {
    studio: 'Kenkere House',
    month: 2,
    theme: 'Stronger in 30 2.0',
    hook: "The 30-day challenge (1–28 Feb) · Valentine's (Sun 14 Feb) · Galentine's (Sat 13 Feb)",
    job: "Run the challenge as the month's engine: fill the opening week, hold the middle at Galentine's, and convert finishers into renewals at list. The duo and referral offers run on top (BOGO buyers were 79–94% existing clients and renewed at 33–53%).",
    moment:
      "Stronger in 30 2.0 runs 1–28 Feb for active members and pack holders. The Galentine's hosted class on Sat 13 Feb — named associate, Encore QR at the door — is the mid-challenge event; Valentine's Sunday (14 Feb) is the partner class.",
    figures: {
      target: 1090000,
      projected: 1140000,
      newClientPlan: 200000,
      renewalPlan: 670000,
      reactivationPlan: 80000,
      otherPlan: 150000,
      leadsTrials: [280, 56],
      renewals: [44, 50],
      lapsed: [234, 18],
      newBuyers: 14,
    },
    offers: [
      {
        slot: 'newcomer',
        name: 'Week Zero',
        tagline: 'Seven days unlimited. Then the challenge clock starts.',
        fields: {
          Journey: ['Week Zero'],
          'Commercial job': ['Convert high-intent February leads fast'],
          'Who qualifies': ['First-time clients (phone verified).'],
          'You pay': [
            'Intro: ₹1.5k for the 7-day unlimited intro, credited in full against a qualifying purchase within 72 hours. Then any pack or membership at 15% off list (the standing new-client perk).',
          ],
          'You get': [
            '• Unlimited Barre and powerCycle for 7 days (max 2 classes a day)',
            '• Goal-setting chat after class 1; owner check-in on day 3',
            '• Lab Induction seat at Kwality/Bandra',
            '• Buy any pack or membership within 72 hours of day 7: full intro fee credited + the standing 15%',
            '• A membership makes you eligible for Stronger in 30 2.0 from the week you join (target scaled)',
          ],
          When: ['1–21 Feb 2027.'],
          Rules: [
            '• One intro per person',
            '• Credit only within 72 hours of day 7',
            '• The 15% is the standing new-client perk, not an extra discount.',
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹1.3L counted · 6 buyers (the month runs two new-client routes; this is its share)'],
          'Rate of sale': ['Needs ≈26 renewal purchases (plan 20).'],
          'Why it works': [
            'February leads arrive with a deadline attached. Clients with 5+ visits in month one convert at 94%; a credited week lets the habit form before the ask, and the challenge clock gives the month its reason to start now.',
          ],
          'What to watch': ['Intro → purchase (target 45%); classes in the intro week (target 4+).'],
          'Offer auditor': [
            '22/25 (Effect 5, Creativity 4, Clarity 5, Practical 4, Economics 4). Strongest February entry: bold, clear credit rule, tied to the challenge.',
          ],
          Model: [
            '81 in pool × 25.2% plan rate × 1.25 conversion factor = 25.5 buyers × ₹17.9k ticket = ₹4.6L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'lapsed',
        name: 'Back for Stronger',
        tagline: "The challenge starts without you. Unless you're back by 7 Feb.",
        fields: {
          'Commercial job': ['Reactivate lapsed clients through the challenge'],
          'Who qualifies': ['Clients lapsed 61–365 days.'],
          'You pay': ['1M unlimited: ₹12.4k (15% off the ₹14.6k list price).'],
          'You get': [
            '• 1M unlimited or a 12-class pack at the standing 15% lapsed perk',
            '• Full entry to Stronger in 30 2.0, including finisher rewards',
            '• A free comeback class to book before buying',
          ],
          When: ['Buy by 7 Feb for full eligibility; 8–15 Feb entries get a scaled target.'],
          Rules: [
            '• Standing 15% lapsed perk; no extra discount',
            '• The 15% is the standing lapsed-client perk, not an extra discount.',
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹0.5L counted · 2 buyers (the month runs two comeback routes; this is its share)'],
          'Rate of sale': ['Needs ≈5 1M unlimited sales vs 17.3 a month today (all buyers).'],
          'Why it works': [
            'The challenge is for members and pack holders, so a lapsed client has to buy to take part. A deadline and a social event do more than a deeper discount.',
          ],
          'What to watch': ['Lapsed clients entering the challenge.'],
          'Offer auditor': [
            '23/25 (Effect 5, Creativity 4, Clarity 5, Practical 5, Economics 4). Uses the challenge as the reason to return; no extra cost.',
          ],
          Model: [
            '254 in pool × 8.0% plan rate × 1.15 conversion factor = 23.5 buyers × ₹6.3k ticket (23% take the featured product) = ₹1.5L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'renewal',
        name: 'Finish Line Renewal',
        tagline: 'Finish Stronger in 30 and your renewal gets a medal.',
        fields: {
          'Commercial job': ['Use challenge attendance to drive renewals at list'],
          'Who qualifies': ['Active members renewing in late February or early March.'],
          'You pay': ["Renewal at your product's list price (no % off)."],
          'You get': [
            '• Challenge finishers renew at list and get: +7 days on 1M, +2 classes on a pack, +14 days on 3M or longer',
            '• Members who reach 50% of the target get +3 days on 1M or +1 class on a pack',
          ],
          When: ['Renew 22 Feb–10 Mar 2027.'],
          Rules: [
            '• No % discount',
            '• Bonus is earned through challenge attendance',
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '7.0% effective = 0% cash + 7.0% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹3.3L counted · 20 buyers (the month runs two renewal routes; this is its share)'],
          'Rate of sale': ['Needs ≈43 renewal purchases (plan 41).'],
          'Why it works': [
            'Renewers average 6.4 visits in the first half of a membership vs 2.6–3.4 for lapsers. Rewarding finishers pays for the behaviour that produces renewals; full-price renewers renew again at 61–68% vs 50–54% after discounts.',
          ],
          'What to watch': ['Challenge finish rate; renewal yield.'],
          'Offer auditor': [
            '22/25 (Effect 5, Creativity 4, Clarity 4, Practical 4, Economics 5). Best renewal mechanic of the year: earned, cheap, on-theme.',
          ],
          Model: [
            '42 in pool × 97.4% plan rate × 1.05 conversion factor = 42.7 buyers × ₹16.1k ticket = ₹6.9L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'newcomer',
        name: 'Swipe Right Flight',
        tagline: 'Three first dates, three formats, ten days.',
        fields: {
          Journey: ['The Tasting Flight'],
          'Commercial job': ['Multi-format paid entry'],
          'Who qualifies': ['First-time clients.'],
          'You pay': [
            'Intro: ₹1.8k for the Tasting Flight (3 classes in 10 days), credited in full against a qualifying purchase within 72 hours. Then any pack or membership at 15% off list (the standing new-client perk).',
          ],
          'You get': [
            '• 3 classes in 10 days: Barre, powerCycle and Strength Lab (Kwality: held 6 am Lab seats; Kenkere: Barre, Mat, Cardio Barre/FIT)',
            '• All 3 booked at purchase',
            '• "Match" within 72 hours of class 3: full fee credited + standing 15% on any pack or membership',
            '• All three classes count toward Stronger in 30 2.0',
          ],
          When: ['1–28 Feb.'],
          Rules: [
            '• Classes expire on day 10',
            '• The 15% is the standing new-client perk, not an extra discount.',
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹0.7L counted · 5 buyers (the month runs two new-client routes; this is its share)'],
          'Rate of sale': ['Needs ≈17 renewal purchases (plan 14).'],
          'Why it works': [
            'The 2-for-1 converts at 21% into an ₹8k purchase; three visits sit in the 73–89% conversion zone and multi-format members renew at 85–87%.',
          ],
          'What to watch': ['Flight → purchase (target 35–40%).'],
          'Offer auditor': [
            '23/25 (Effect 5, Creativity 5, Clarity 5, Practical 4, Economics 4). Best paid entry; memorable.',
          ],
          Model: [
            '56 in pool × 24.8% plan rate × 1.20 conversion factor = 16.7 buyers × ₹14.8k ticket = ₹2.5L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'lapsed',
        name: 'Come Back as a Pair',
        tagline: 'Return with a friend. Their first class is on us — and you both enter the challenge.',
        fields: {
          'Commercial job': ['Reactivation that also brings a new lead'],
          'Who qualifies': ['Lapsed clients plus a friend who is new to P57.'],
          'You pay': ['12-class pack: ₹11.2k (15% off the ₹13.1k list price).'],
          'You get': [
            '• Lapsed client: 12-class pack at the standing 15%',
            '• Friend: free first class',
            '• If the friend buys, the lapsed client gets 2 guest passes and 48-hour priority booking for a month',
            '• Lapsed client and friend both enter Stronger in 30 2.0',
          ],
          When: ['All February.'],
          Rules: [
            '• Friend must be new to P57',
            '• The 15% is the standing lapsed-client perk, not an extra discount.',
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹0.3L counted · 1 buyers (the month runs two comeback routes; this is its share)'],
          'Rate of sale': ['Needs ≈5 12-class pack sales vs 10.5 a month today (all buyers).'],
          'Why it works': ['One message, two streams: reactivation and a warm new lead.'],
          'What to watch': ['Friends who buy.'],
          'Offer auditor': [
            '21/25 (Effect 4, Creativity 4, Clarity 5, Practical 4, Economics 4). Efficient double play.',
          ],
          Model: [
            '234 in pool × 7.8% plan rate × 1.10 conversion factor = 20.0 buyers × ₹5.3k ticket (25% take the featured product) = ₹1.1L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'renewal',
        name: 'Partners in Crime',
        tagline: 'Renew with your workout partner. You both finish the challenge.',
        fields: {
          'Commercial job': ['Social accountability at renewal'],
          'Who qualifies': ['Two active members renewing in the same week.'],
          'You pay': ["Renewal at your product's list price (no % off)."],
          'You get': [
            '• Each gets +3 days on 1M, +1 class on a pack, or +7 days on 3M or longer',
            '• Both enter Stronger in 30 2.0; finishers keep the renewal bonus',
          ],
          When: ['All February.'],
          Rules: [
            '• Both renewals at list',
            '• Register the pair at the desk',
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '6.0% effective = 0% cash + 6.0% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹3.4L counted · 25 buyers (the month runs two renewal routes; this is its share)'],
          'Rate of sale': ['Needs ≈52 renewal purchases (plan 50).'],
          'Why it works': ['Pairs keep each other attending; attendance predicts renewal. Tag pairs to measure it.'],
          'What to watch': ['Next-renewal rate of pairs vs singles.'],
          'Offer auditor': [
            '22/25 (Effect 4, Creativity 4, Clarity 5, Practical 4, Economics 5). Cheap, social, on-theme.',
          ],
          Model: [
            '44 in pool × 114.5% plan rate × 1.03 conversion factor = 51.9 buyers × ₹13.3k ticket = ₹6.9L modelled; 50% of uplift counted',
          ],
        },
      },
    ],
  },
  {
    studio: 'Kenkere House',
    month: 3,
    theme: 'She Moves',
    hook: "International Women's Day (Mon 8 Mar)",
    job: "Purpose-led reach; Bandra reactivation; stop March trials from waiting for the anniversary. Keep February's challenge finishers attending.",
    moment: 'Class of 2024 Reunion at Bandra (638 lapsed launch-cohort clients). Anniversary teaser from 16 Mar.',
    figures: {
      target: 900000,
      projected: 970000,
      newClientPlan: 200000,
      renewalPlan: 480000,
      reactivationPlan: 100000,
      otherPlan: 120000,
      leadsTrials: [255, 51],
      renewals: [48, 33],
      lapsed: [262, 20],
      newBuyers: 13,
    },
    offers: [
      {
        slot: 'newcomer',
        name: 'Kickstart 21: She Moves Cohort',
        tagline: "Starting Women's Day. 21 days. Stronger together.",
        fields: {
          Journey: ['Kickstart 21'],
          'Commercial job': ['Cohort acquisition with purpose'],
          'Who qualifies': ['First-time clients.'],
          'You pay': ['Kickstart 21 cohort: ₹8k (list price).'],
          'You get': [
            "• Cohort starts Mon 8 Mar (Women's Day); second cohort Mon 22 Mar",
            '• 21 days unlimited + coach, WhatsApp group, fitness checks, graduation',
            '• Each member gets a free class to gift a woman she nominates',
            '• Graduates: standing 15% within 7 days',
          ],
          When: ['Book by 7 Mar / 21 Mar.'],
          Rules: [
            '• Gift class for someone new to P57',
            "• Replaces the standing 15% perk; the two don't combine.",
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '0.0% effective = 0% cash. Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹2.0L counted (+₹2.9k vs the ₹2.0L stream plan) · 14 buyers'],
          'Rate of sale': ['Needs ≈4 Kickstart 21 cohort sales (new product, no current rate).'],
          'Why it works': ['Purpose-led reach with the engagement of a cohort; the gift class creates warm leads.'],
          'What to watch': ['Nominee classes converted.'],
          'Offer auditor': [
            '22/25 (Effect 4, Creativity 5, Clarity 5, Practical 4, Economics 4). Good fit for the month.',
          ],
          Model: [
            '51 in pool × 25.3% plan rate × 1.10 conversion factor = 14.2 buyers × ₹14.4k ticket (27% take the featured product) = ₹2.0L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'lapsed',
        name: 'Beat Your Best',
        tagline: "Remember March 2025? 18 classes. Let's beat it.",
        fields: {
          'Commercial job': ['Personalised reactivation from attendance history'],
          'Who qualifies': ['Lapsed clients with a recorded best month.'],
          'You pay': ['1M unlimited: ₹14.6k (list price).'],
          'You get': ['• 1M unlimited at list', "• Match your best month's class count → +6 days"],
          When: ['All March.'],
          Rules: [
            '• Replaces the 15% lapsed perk',
            '• Needs a best-month field from Momence',
            "• Replaces the standing 15% perk; the two don't combine.",
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '20.0% effective = 0% cash + 20.0% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹1.1L counted (+₹14.2k vs the ₹1.0L stream plan) · 21 buyers'],
          'Rate of sale': ['Needs ≈5 1M unlimited sales vs 17.3 a month today (all buyers).'],
          'Why it works': ['Personal data beats generic offers and sets a goal; the reward is earned.'],
          'What to watch': ['Data build needed.'],
          'Offer auditor': [
            '20/25 (Effect 4, Creativity 5, Clarity 4, Practical 3, Economics 4). Creative; depends on data work.',
          ],
          Model: [
            '262 in pool × 7.8% plan rate × 1.05 conversion factor = 21.4 buyers × ₹6k ticket (23% take the featured product) = ₹1.3L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'renewal',
        name: 'Pre-Party Upgrade',
        tagline: 'Moving to 3 months? Freeze freely and grab your tote early.',
        fields: {
          'Commercial job': ['1M → 3M before April'],
          'Who qualifies': ['1M renewers with 8+ visits a month.'],
          'You pay': ['3M unlimited: ₹42.2k (list price).'],
          'You get': [
            '• 3M unlimited at list',
            '• Unlimited freezes (use within 6 months)',
            '• Anniversary tote (≈₹1,000)',
          ],
          When: ['All March.'],
          Rules: ['• No % discount', "• Doesn't combine with any other campaign offer."],
          'Effective discount': [
            '2.4% effective = 0% cash + 2.4% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹5.3L counted (+₹48.2k vs the ₹4.8L stream plan) · 33 buyers'],
          'Rate of sale': ['Needs ≈7 3M unlimited sales vs 6 a month today (all buyers).'],
          'Why it works': ['3M renews at 71% at Kenkere vs 59% for 1M.'],
          'What to watch': ['Tote stock.'],
          'Offer auditor': ['22/25 (Effect 4, Creativity 4, Clarity 5, Practical 4, Economics 5). Good upgrade lever.'],
          Model: [
            '48 in pool × 68.9% plan rate × 1.00 conversion factor = 33.2 buyers × ₹17.4k ticket (21% take the featured product) = ₹5.8L modelled; 50% of uplift counted',
          ],
        },
      },
    ],
  },
  {
    studio: 'Kenkere House',
    month: 4,
    theme: 'Cloud Nine (9th anniversary)',
    hook: '9 years of Physique 57 India · first ₹1 Cr month',
    job: "The year's best, most playful offers and the first ₹1 Cr sales month (target ₹104.5L), without the 26–31% discounts of April 2026. Caps: 20% on ≤1M products, 15% on 3M+.",
    moment:
      'Club Nine: 9 numbered annual memberships per studio at full price. Anniversary party classes in week 2. Hard close 30 Apr, 23:59.',
    figures: {
      target: 1370000,
      projected: 1470000,
      newClientPlan: 210000,
      renewalPlan: 820000,
      reactivationPlan: 150000,
      otherPlan: 180000,
      leadsTrials: [255, 51],
      renewals: [53, 53],
      lapsed: [356, 29],
      newBuyers: 13,
    },
    offers: [
      {
        slot: 'newcomer',
        name: 'Cloud Nine Intro',
        tagline: 'Nine days unlimited for less than one class.',
        fields: {
          Journey: ['Week Zero'],
          'Commercial job': ["The year's boldest acquisition offer"],
          'Who qualifies': ['First-time clients (phone verified).'],
          'You pay': [
            'Intro: ₹0.8k for the 9-day unlimited intro, credited in full against a qualifying purchase within 72 hours. Then any pack or membership at 15% off list (the standing new-client perk).',
          ],
          'You get': [
            '• Unlimited Barre and powerCycle for 9 days (max 2 a day) + a Lab Induction seat (Kwality/Bandra)',
            '• Buy any pack or membership within 72 hours of day 9: intro fee credited + standing 15% + anniversary tote (≈₹1,000)',
          ],
          When: ['1–21 Apr (so the intro ends inside April).'],
          Rules: [
            '• One intro per person',
            '• Tote only with the 72-hour purchase',
            '• The 15% is the standing new-client perk, not an extra discount.',
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '21.0% effective = 15% cash + 6.0% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹2.6L counted (+₹44.6k vs the ₹2.1L stream plan) · 17 buyers'],
          'Rate of sale': ['Needs ≈17 renewal purchases (plan 13).'],
          'Why it works': [
            'The anniversary is worth an eye-catching price. Nine days builds the habit; the credited purchase protects the commitment price.',
          ],
          'What to watch': ['Intro volume vs spare seats; intro → purchase (target 40%).'],
          'Offer auditor': [
            '23/25 (Effect 5, Creativity 5, Clarity 5, Practical 4, Economics 4). Headline April offer.',
          ],
          Model: [
            '51 in pool × 25.3% plan rate × 1.35 conversion factor = 17.4 buyers × ₹17.4k ticket = ₹3.0L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'lapsed',
        name: 'Nine Years, Nine Reasons',
        tagline: 'Nine things changed while you were away.',
        fields: {
          'Commercial job': ['Reactivate with news, not a deeper discount'],
          'Who qualifies': ['Clients lapsed 61 days–2 years.'],
          'You pay': ['12-class pack: ₹11.2k (15% off the ₹13.1k list price).'],
          'You get': [
            '• A personal note listing 9 things new at your studio (formats, trainers, schedule)',
            '• 12-class pack at the standing 15% lapsed perk',
            '• Invite to an anniversary party class',
          ],
          When: ['All April.'],
          Rules: [
            '• Standing perk; no extra % off',
            '• The 15% is the standing lapsed-client perk, not an extra discount.',
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹1.8L counted (+₹22.4k vs the ₹1.5L stream plan) · 33 buyers'],
          'Rate of sale': ['Needs ≈7 12-class pack sales vs 10.5 a month today (all buyers).'],
          'Why it works': [
            'Lapsed clients left something that no longer exists; showing what\'s new answers "why go back". April has the most attention of the year.',
          ],
          'What to watch': ['Bandra needs 54 reactivations in April from 673 touches.'],
          'Offer auditor': [
            '21/25 (Effect 4, Creativity 4, Clarity 5, Practical 4, Economics 4). Good story, cost unchanged.',
          ],
          Model: [
            '356 in pool × 8.1% plan rate × 1.15 conversion factor = 33.2 buyers × ₹6k ticket (23% take the featured product) = ₹2.0L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'renewal',
        name: 'Lock In Before You Clock Out',
        tagline: "Renew in April at today's price, with bonus classes.",
        fields: {
          'Commercial job': ['Protect Apr–Jun renewals without deep pull-forward'],
          'Who qualifies': ['Members expiring 1 Apr–15 Jun only.'],
          'You pay': ["Renewal at your product's list price (no % off)."],
          'You get': ['• Renew at list', '• +3 classes on packs, +7 days on 1M, +14 days on 3M or longer'],
          When: ['All April.'],
          Rules: [
            '• No % discount',
            '• Members expiring after 15 Jun are not eligible',
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '10.0% effective = 0% cash + 10.0% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹8.6L counted (+₹32.9k vs the ₹8.2L stream plan) · 57 buyers'],
          'Rate of sale': ['Needs ≈57 renewal purchases (plan 53).'],
          'Why it works': [
            '2026 anniversary-code buyers renewed at 24.5% at Kwality vs 61.6% at full price. Restricting eligibility limits pull-forward.',
          ],
          'What to watch': ['Renewal purchases vs due (plan KH 130 vs 120 due).'],
          'Offer auditor': [
            '22/25 (Effect 5, Creativity 3, Clarity 5, Practical 5, Economics 4). The economic backbone of April.',
          ],
          Model: [
            '53 in pool × 100.0% plan rate × 1.08 conversion factor = 56.7 buyers × ₹15.7k ticket = ₹8.9L modelled; 50% of uplift counted',
          ],
        },
      },
    ],
  },
  {
    studio: 'Kenkere House',
    month: 5,
    theme: 'The Afterparty',
    hook: "Mother's Day (Sun 9 May)",
    job: 'Retain the April cohort (target ≥55% renewal at next expiry vs 24.5% for 2026 anniversary-code buyers at Kwality); duo acquisition.',
    moment:
      'Every April buyer gets the 30-day Afterparty plan: week-1 call, 8 classes in May unlocks a hosted class and a progress check.',
    figures: {
      target: 1090000,
      projected: 1120000,
      newClientPlan: 180000,
      renewalPlan: 680000,
      reactivationPlan: 100000,
      otherPlan: 150000,
      leadsTrials: [255, 51],
      renewals: [50, 53],
      lapsed: [279, 23],
      newBuyers: 13,
    },
    offers: [
      {
        slot: 'newcomer',
        name: 'Kickstart 21: Summer Cohort',
        tagline: '21 days to start summer strong.',
        fields: {
          Journey: ['Kickstart 21'],
          'Commercial job': ['Cohort acquisition before the travel season'],
          'Who qualifies': ['First-time clients.'],
          'You pay': ['Kickstart 21 cohort: ₹8k (list price).'],
          'You get': [
            '• Cohorts start Mon 3 May and Mon 17 May',
            '• 21 days unlimited + coach, WhatsApp, fitness checks, graduation',
            '• Graduates: standing 15% within 7 days',
          ],
          When: ['Book by 2 May / 16 May.'],
          Rules: [
            '• Cohort fee not credited',
            "• Replaces the standing 15% perk; the two don't combine.",
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '0.0% effective = 0% cash. Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹1.8L counted (+₹3.4k vs the ₹1.8L stream plan) · 14 buyers'],
          'Rate of sale': ['Needs ≈4 Kickstart 21 cohort sales (new product, no current rate).'],
          'Why it works': [
            'Kenkere already sells a summer bootcamp; a cohort fixes its conversion problem with structure.',
          ],
          'What to watch': ['Graduate → purchase.'],
          'Offer auditor': ['22/25 (Effect 4, Creativity 5, Clarity 5, Practical 4, Economics 4). Fits Kenkere well.'],
          Model: [
            '51 in pool × 25.3% plan rate × 1.10 conversion factor = 14.2 buyers × ₹12.8k ticket (27% take the featured product) = ₹1.8L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'lapsed',
        name: 'A Class for Mum',
        tagline: 'Come back, and bring your mother for free.',
        fields: {
          'Commercial job': ['Reactivation with a gift'],
          'Who qualifies': ['Lapsed clients.'],
          'You pay': ['12-class pack: ₹11.2k (15% off the ₹13.1k list price).'],
          'You get': ['• 12-class pack at the standing 15%', '• A free class for their mother (or any mum)'],
          When: ['1–16 May.'],
          Rules: [
            '• Gift class within 30 days',
            '• The 15% is the standing lapsed-client perk, not an extra discount.',
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹1.1L counted (+₹9.5k vs the ₹1.0L stream plan) · 23 buyers'],
          'Rate of sale': ['Needs ≈6 12-class pack sales vs 10.5 a month today (all buyers).'],
          'Why it works': ['On-theme, cash cost unchanged, gift class is a warm lead.'],
          'What to watch': ['Gift classes booked.'],
          'Offer auditor': ['20/25 (Effect 3, Creativity 3, Clarity 5, Practical 5, Economics 4). Pleasant; modest.'],
          Model: [
            '279 in pool × 8.1% plan rate × 1.00 conversion factor = 22.5 buyers × ₹5.2k ticket (25% take the featured product) = ₹1.2L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'renewal',
        name: 'The Afterparty',
        tagline: 'Book 8 in May; get a hosted class and a progress check.',
        fields: {
          'Commercial job': ['Retain the April cohort'],
          'Who qualifies': ['April buyers and May renewers.'],
          'You pay': ["Renewal at your product's list price (no % off)."],
          'You get': ['• Book 8 classes in May → a free hosted class + a trainer progress check', '• Renew at list'],
          When: ['All May.'],
          Rules: ['• No % discount', "• Doesn't combine with any other campaign offer."],
          'Effective discount': [
            '2.0% effective = 0% cash + 2.0% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹6.9L counted (+₹13.5k vs the ₹6.8L stream plan) · 55 buyers'],
          'Rate of sale': ['Needs ≈55 renewal purchases (plan 53).'],
          'Why it works': [
            'Target ≥55% of April commitment buyers renewing at next expiry (2026 code buyers: 24.5% at Kwality).',
          ],
          'What to watch': ['April cohort attendance in May.'],
          'Offer auditor': [
            '22/25 (Effect 5, Creativity 3, Clarity 5, Practical 4, Economics 5). Protects the April investment.',
          ],
          Model: [
            '50 in pool × 104.2% plan rate × 1.04 conversion factor = 54.6 buyers × ₹12.9k ticket = ₹7.0L modelled; 50% of uplift counted',
          ],
        },
      },
    ],
  },
  {
    studio: 'Kenkere House',
    month: 6,
    theme: 'Out of Office',
    hook: "Summer travel · college holidays · Father's Day (Sun 20 Jun)",
    job: 'Stop summer lapses; fill weekday 10–12 and weekend 4–7 pm (27–41% full) with students.',
    moment: 'Golden Hours launch for students and under-25s.',
    figures: {
      target: 1090000,
      projected: 1200000,
      newClientPlan: 160000,
      renewalPlan: 690000,
      reactivationPlan: 100000,
      otherPlan: 150000,
      leadsTrials: [235, 47],
      renewals: [67, 55],
      lapsed: [295, 24],
      newBuyers: 12,
    },
    offers: [
      {
        slot: 'newcomer',
        name: 'Golden Hours Flight',
        tagline: 'Students: three classes in ten days, in the hours with room.',
        fields: {
          Journey: ['The Tasting Flight'],
          'Commercial job': ['Student acquisition into empty slots'],
          'Who qualifies': ['Students or under-25s with ID.'],
          'You pay': [
            'Intro: ₹1k for the Student Tasting Flight (3 classes in 10 days), credited in full against a qualifying purchase within 72 hours. 8-class pack: ₹7k (20% off the ₹8.7k list price).',
          ],
          'You get': [
            '• 3 classes in 10 days in weekday 10–12 or weekend 4–7 pm classes',
            '• Full fee credited within 72 hours against the Golden Hours 8-class pack (20% off, valid in those slots only)',
          ],
          When: ['1 Jun–31 Jul.'],
          Rules: [
            '• ID checked at class 1',
            "• Replaces the standing 15% perk; the two don't combine.",
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '20.0% effective = 20% cash. Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹1.6L counted (+₹2.2k vs the ₹1.6L stream plan) · 14 buyers'],
          'Rate of sale': ['Needs ≈8 8-class pack sales vs 10.2 a month today (all buyers).'],
          'Why it works': ['Those slots run at 27–41% fill; students fill them without cannibalising peak classes.'],
          'What to watch': ['Golden Hours fill.'],
          'Offer auditor': [
            '21/25 (Effect 4, Creativity 4, Clarity 5, Practical 4, Economics 4). Good use of empty seats.',
          ],
          Model: [
            '47 in pool × 25.1% plan rate × 1.20 conversion factor = 14.2 buyers × ₹11.4k ticket (60% take the featured product) = ₹1.6L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'lapsed',
        name: 'Out of Office, Not Out of Shape',
        tagline: "Freeze when you fly. Train when you're home.",
        fields: {
          'Commercial job': ['Reactivate travellers'],
          'Who qualifies': ['Lapsed clients.'],
          'You pay': ['1M unlimited: ₹12.4k (15% off the ₹14.6k list price).'],
          'You get': ['• 1M at the standing 15%', '• 2 extra freezes', '• A written travel workout plan'],
          When: ['All June.'],
          Rules: [
            '• Standing perk',
            '• The 15% is the standing lapsed-client perk, not an extra discount.',
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹1.1L counted (+₹10.8k vs the ₹1.0L stream plan) · 24 buyers'],
          'Rate of sale': ['Needs ≈5 1M unlimited sales vs 17.3 a month today (all buyers).'],
          'Why it works': ['Answers "I\'ll be away" without cash.'],
          'What to watch': ['Freeze usage.'],
          'Offer auditor': ['20/25 (Effect 3, Creativity 3, Clarity 5, Practical 5, Economics 4). Fine.'],
          Model: [
            '295 in pool × 8.0% plan rate × 1.00 conversion factor = 23.6 buyers × ₹5.2k ticket (23% take the featured product) = ₹1.2L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'renewal',
        name: 'The Pause Button',
        tagline: 'Three months unlimited. Freeze it as often as you like.',
        fields: {
          'Commercial job': ['Stop summer lapses'],
          'Who qualifies': ['1M and 3M renewers.'],
          'You pay': ['3M unlimited: ₹42.2k (list price).'],
          'You get': ['• 3M unlimited at list', '• Unlimited freezes (use within 6 months)'],
          When: ['All June.'],
          Rules: ['• Freezes in blocks of 3+ days', "• Doesn't combine with any other campaign offer."],
          'Effective discount': [
            '0.0% effective = 0% cash. Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹7.9L counted (+₹97.9k vs the ₹6.9L stream plan) · 56 buyers'],
          'Rate of sale': ['Needs ≈12 3M unlimited sales vs 6 a month today (all buyers).'],
          'Why it works': [
            'The best time of year for this offer: travel is the main reason to let a membership lapse.',
          ],
          'What to watch': ['June renewal yield.'],
          'Offer auditor': ['23/25 (Effect 5, Creativity 4, Clarity 5, Practical 4, Economics 5). Peak relevance.'],
          Model: [
            '67 in pool × 82.3% plan rate × 1.03 conversion factor = 56.3 buyers × ₹15.7k ticket (21% take the featured product) = ₹8.9L modelled; 50% of uplift counted',
          ],
        },
      },
    ],
  },
  {
    studio: 'Kenkere House',
    month: 7,
    theme: 'Monsoon I: Rain Check',
    hook: 'Monsoon · Amazing Race warm-up',
    job: 'Attendance and late cancels (Kenkere 21–30%); get people on a membership before the race starts on 1 Aug.',
    moment: 'Race registrations open 15 Jul. Monsoon Streak leaderboard by studio.',
    figures: {
      target: 1390000,
      projected: 1450000,
      newClientPlan: 150000,
      renewalPlan: 920000,
      reactivationPlan: 130000,
      otherPlan: 190000,
      leadsTrials: [215, 43],
      renewals: [73, 68],
      lapsed: [360, 29],
      newBuyers: 11,
    },
    offers: [
      {
        slot: 'newcomer',
        name: 'Rain Check Second Date',
        tagline: "Book your second class before you leave. Rain days don't count against you.",
        fields: {
          Journey: ['The Second Date'],
          'Commercial job': ['Second visit through the monsoon'],
          'Who qualifies': ['First-time clients starting with Barre.'],
          'You pay': ['Then any pack or membership at 15% off list (the standing new-client perk).'],
          'You get': [
            '• Free first Barre class',
            '• Class 2 free within 7 days, booked at the desk; on IMD orange/red-alert days the 7 days pause',
            '• 15% within 72 hours of class 2; 10% until day 14',
          ],
          When: ['All July.'],
          Rules: [
            '• Alert status as published by IMD that day',
            '• The 15% is the standing new-client perk, not an extra discount.',
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹1.7L counted (+₹13.9k vs the ₹1.5L stream plan) · 13 buyers'],
          'Rate of sale': ['Needs ≈13 renewal purchases (plan 11).'],
          'Why it works': ['Rain breaks the second visit; pausing the window protects it.'],
          'What to watch': ['Second-visit share in July.'],
          'Offer auditor': [
            '22/25 (Effect 5, Creativity 4, Clarity 5, Practical 4, Economics 4). Practical monsoon tweak.',
          ],
          Model: [
            '43 in pool × 24.9% plan rate × 1.18 conversion factor = 12.6 buyers × ₹14.4k ticket = ₹1.8L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'lapsed',
        name: 'Warm-Up Lap',
        tagline: 'Get race-fit before the gun goes on 1 August.',
        fields: {
          'Commercial job': ['Reactivate into the race'],
          'Who qualifies': ['Lapsed clients.'],
          'You pay': ['1M unlimited: ₹12.4k (15% off the ₹14.6k list price).'],
          'You get': [
            '• 1M at the standing 15%, start 15 Jul–1 Aug',
            '• Free race-prep assessment',
            '• Full race entry',
          ],
          When: ['15–31 Jul.'],
          Rules: [
            '• Standing perk',
            '• The 15% is the standing lapsed-client perk, not an extra discount.',
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹1.5L counted (+₹20.6k vs the ₹1.3L stream plan) · 32 buyers'],
          'Rate of sale': ['Needs ≈7 1M unlimited sales vs 17.3 a month today (all buyers).'],
          'Why it works': ['An event with a date beats a discount for lapsed clients.'],
          'What to watch': ['Lapsed race entries.'],
          'Offer auditor': ['23/25 (Effect 5, Creativity 4, Clarity 5, Practical 5, Economics 4). Strong hook.'],
          Model: [
            '360 in pool × 8.0% plan rate × 1.10 conversion factor = 31.8 buyers × ₹5.5k ticket (23% take the featured product) = ₹1.7L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'renewal',
        name: 'Monsoon Streak',
        tagline: '12+ classes, zero late cancels, +7 days.',
        fields: {
          'Commercial job': ['Cut late cancels and lift renewals'],
          'Who qualifies': ['July renewers.'],
          'You pay': ["Renewal at your product's list price (no % off)."],
          'You get': [
            '• Renew at list',
            '• 12+ classes and zero late cancels in July → +7 days (unlimited) or +1 class (packs)',
          ],
          When: ['All July.'],
          Rules: ['• No % discount', "• Doesn't combine with any other campaign offer."],
          'Effective discount': [
            '7.0% effective = 0% cash + 7.0% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹9.4L counted (+₹18.4k vs the ₹9.2L stream plan) · 70 buyers'],
          'Rate of sale': ['Needs ≈70 renewal purchases (plan 68).'],
          'Why it works': [
            "Fixes behaviour and revenue together; Bandra's 2025 late-cancel spike fell once the rule was enforced.",
          ],
          'What to watch': ['Late-cancel rate (Kenkere target <15%).'],
          'Offer auditor': ['22/25 (Effect 5, Creativity 4, Clarity 5, Practical 4, Economics 4). Best July renewal.'],
          Model: [
            '73 in pool × 92.6% plan rate × 1.04 conversion factor = 70.2 buyers × ₹13.6k ticket = ₹9.6L modelled; 50% of uplift counted',
          ],
        },
      },
    ],
  },
  {
    studio: 'Kenkere House',
    month: 8,
    theme: 'The Amazing Race 2.0',
    hook: 'Month-long individual race · Friendship Day (Sun 1 Aug)',
    job: 'Attendance-led renewals and upgrades; bring new clients in on a Rookie leaderboard; second seasonal peak in Mumbai.',
    moment:
      'The Amazing Race 2.0: every client races on their own against a studio leaderboard, 1–31 Aug. Rookie leaderboard for first-timers.',
    figures: {
      target: 1160000,
      projected: 1250000,
      newClientPlan: 190000,
      renewalPlan: 740000,
      reactivationPlan: 70000,
      otherPlan: 150000,
      leadsTrials: [255, 51],
      renewals: [76, 55],
      lapsed: [200, 16],
      newBuyers: 13,
    },
    offers: [
      {
        slot: 'newcomer',
        name: 'Starting Gun Week',
        tagline: 'Seven days unlimited from the day the race starts.',
        fields: {
          Journey: ['Week Zero'],
          'Commercial job': ['Bold intro into the Rookie leaderboard'],
          'Who qualifies': ['First-time clients.'],
          'You pay': [
            'Intro: ₹1.5k for the 7-day unlimited intro, credited in full against a qualifying purchase within 72 hours. Then any pack or membership at 15% off list (the standing new-client perk).',
          ],
          'You get': [
            '• 7 days unlimited (max 2 a day); classes count on the Rookie leaderboard',
            '• Credited within 72 hours against any pack or membership + standing 15%',
            '• Race kit (bib and tote, ≈₹1,000) with the purchase',
          ],
          When: ['1–20 Aug.'],
          Rules: [
            '• One intro per person',
            '• The 15% is the standing new-client perk, not an extra discount.',
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '21.0% effective = 15% cash + 6.0% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹2.1L counted (+₹29k vs the ₹1.9L stream plan) · 16 buyers'],
          'Rate of sale': ['Needs ≈16 renewal purchases (plan 13).'],
          'Why it works': [
            'An individual race is intimidating for beginners; a Rookie leaderboard and an unlimited week make it winnable.',
          ],
          'What to watch': ['Rookie entries; intro conversion.'],
          'Offer auditor': ['23/25 (Effect 5, Creativity 5, Clarity 5, Practical 4, Economics 4). Best August entry.'],
          Model: [
            '51 in pool × 25.3% plan rate × 1.25 conversion factor = 16.1 buyers × ₹15.1k ticket = ₹2.4L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'lapsed',
        name: 'Back on Track',
        tagline: 'Your lane is still open.',
        fields: {
          'Commercial job': ['Reactivate into the race'],
          'Who qualifies': ['Lapsed clients.'],
          'You pay': ['1M unlimited: ₹12.8k (12% off the ₹14.6k list price).'],
          'You get': ['• 1M at 12% off', '• Finish the race target → +3 days'],
          When: ['1–15 Aug.'],
          Rules: [
            '• Replaces the 15% lapsed perk',
            "• Replaces the standing 15% perk; the two don't combine.",
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '22.0% effective = 12% cash + 10.0% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹0.9L counted (+₹14.1k vs the ₹0.7L stream plan) · 19 buyers'],
          'Rate of sale': ['Needs ≈4 1M unlimited sales vs 17.3 a month today (all buyers).'],
          'Why it works': ['Race + earned bonus; max effective 22%.'],
          'What to watch': ['Lapsed racers finishing.'],
          'Offer auditor': [
            '22/25 (Effect 5, Creativity 4, Clarity 5, Practical 4, Economics 4). On-theme and earned.',
          ],
          Model: [
            '200 in pool × 8.1% plan rate × 1.15 conversion factor = 18.5 buyers × ₹5.5k ticket (23% take the featured product) = ₹1.0L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'renewal',
        name: 'Pit Stop',
        tagline: 'Renew mid-race and keep your streak.',
        fields: {
          'Commercial job': ['Renewals during the race'],
          'Who qualifies': ['Members expiring in August or early September.'],
          'You pay': ["Renewal at your product's list price (no % off)."],
          'You get': [
            '• Renew at list; race progress carries over',
            '• Race finishers get +7 days on 1M or +14 days on 3M+',
            '• Upgrade to 3M with unlimited freezes',
          ],
          When: ['All August.'],
          Rules: ['• No % discount', "• Doesn't combine with any other campaign offer."],
          'Effective discount': [
            '7.0% effective = 0% cash + 7.0% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹7.9L counted (+₹49.9k vs the ₹7.4L stream plan) · 57 buyers'],
          'Rate of sale': ['Needs ≈57 renewal purchases (plan 55).'],
          'Why it works': ['The race lifts attendance, and attendance lifts renewals; finisher bonuses are earned.'],
          'What to watch': ['Race finish rate; renewal yield.'],
          'Offer auditor': [
            '23/25 (Effect 5, Creativity 4, Clarity 5, Practical 4, Economics 5). Ties renewals to the race.',
          ],
          Model: [
            '76 in pool × 71.9% plan rate × 1.05 conversion factor = 57.4 buyers × ₹14.7k ticket = ₹8.4L modelled; 50% of uplift counted',
          ],
        },
      },
    ],
  },
  {
    studio: 'Kenkere House',
    month: 9,
    theme: 'Monsoon III: The Comeback',
    hook: '57 days to Diwali (2 Sep → 28 Oct)',
    job: 'Reactivate before the festive season; carry race momentum into a festive countdown.',
    moment: '57 Days to Diwali countdown starts 2 Sep; Bandra reunion repeat.',
    figures: {
      target: 1440000,
      projected: 1460000,
      newClientPlan: 180000,
      renewalPlan: 950000,
      reactivationPlan: 130000,
      otherPlan: 190000,
      leadsTrials: [195, 39],
      renewals: [69, 55],
      lapsed: [262, 21],
      newBuyers: 10,
    },
    offers: [
      {
        slot: 'newcomer',
        name: '57-Day Proof',
        tagline: 'Measure on day 1. Re-test before Diwali.',
        fields: {
          Journey: ['The 30-Day Proof'],
          'Commercial job': ['Results-led acquisition into the festive season'],
          'Who qualifies': ['First-time clients.'],
          'You pay': ['1M unlimited: ₹12.4k (15% off the ₹14.6k list price).'],
          'You get': [
            '• 1M unlimited at the standing 15%',
            '• Fitness check on day 1, coach check-ins',
            '• Re-test before 28 Oct: 20+ classes and no improvement on 2 of 3 measures → your next month free',
          ],
          When: ['2–30 Sep.'],
          Rules: [
            '• Identical fitness-check protocol at every studio',
            '• The 15% is the standing new-client perk, not an extra discount.',
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹1.8L counted (+₹1.9k vs the ₹1.8L stream plan) · 11 buyers'],
          'Rate of sale': ['Needs ≈8 1M unlimited sales vs 17.3 a month today (all buyers).'],
          'Why it works': [
            "A finish line before Diwali and a results promise carry new clients into October, Kenkere's weakest month.",
          ],
          'What to watch': ['October renewals of September joiners.'],
          'Offer auditor': [
            '19/25 (Effect 4, Creativity 5, Clarity 4, Practical 3, Economics 3). Bold; depends on the protocol.',
          ],
          Model: [
            '39 in pool × 24.6% plan rate × 1.15 conversion factor = 11.0 buyers × ₹16.2k ticket (70% take the featured product) = ₹1.8L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'lapsed',
        name: 'The Return Policy',
        tagline: 'Come back within 7 days of your comeback class and get a bonus.',
        fields: {
          'Commercial job': ['Pre-festive reactivation'],
          'Who qualifies': ['Clients lapsed 61–365 days.'],
          'You pay': ['12-class pack: ₹11.6k (12% off the ₹13.1k list price).'],
          'You get': ['• Free comeback class', '• Buy 1M or a 12-class pack within 7 days at 12% off + 1 bonus class'],
          When: ['All September.'],
          Rules: [
            '• Replaces the 15% lapsed perk',
            "• Replaces the standing 15% perk; the two don't combine.",
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '22.8% effective = 12% cash + 10.8% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹1.3L counted (+₹6.8k vs the ₹1.3L stream plan) · 21 buyers'],
          'Rate of sale': ['Needs ≈5 12-class pack sales vs 10.5 a month today (all buyers).'],
          'Why it works': ['Time-limited to keep decisions fast.'],
          'What to watch': ['Reactivations vs plan.'],
          'Offer auditor': ['21/25 (Effect 4, Creativity 3, Clarity 5, Practical 5, Economics 4). Reliable.'],
          Model: [
            '262 in pool × 8.2% plan rate × 1.00 conversion factor = 21.4 buyers × ₹6.5k ticket (23% take the featured product) = ₹1.4L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'renewal',
        name: 'Challenge Captain',
        tagline: 'Bring two friends into the countdown, get two weeks.',
        fields: {
          'Commercial job': ['Renewal plus referral'],
          'Who qualifies': ['September renewers.'],
          'You pay': ["Renewal at your product's list price (no % off)."],
          'You get': ['• Renew at list', '• Bring 2 friends who join → +14 days (unlimited) or +2 classes (packs)'],
          When: ['All September.'],
          Rules: ['• Friends must buy', "• Doesn't combine with any other campaign offer."],
          'Effective discount': [
            '4.0% effective = 0% cash + 4.0% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹9.5L counted (+₹9.5k vs the ₹9.5L stream plan) · 56 buyers'],
          'Rate of sale': ['Needs ≈56 renewal purchases (plan 55).'],
          'Why it works': ["Kenkere's strong renewal base can fix its weak acquisition."],
          'What to watch': ['Captain-referred buyers.'],
          'Offer auditor': ['21/25 (Effect 4, Creativity 4, Clarity 5, Practical 4, Economics 4). Useful for Kenkere.'],
          Model: [
            '69 in pool × 79.7% plan rate × 1.02 conversion factor = 55.8 buyers × ₹17.3k ticket = ₹9.6L modelled; 50% of uplift counted',
          ],
        },
      },
    ],
  },
  {
    studio: 'Kenkere House',
    month: 10,
    theme: 'Festival of Lights',
    hook: 'Diwali (Fri 29 Oct) · Dasara week in Bengaluru',
    job: "Gift-led revenue; protect Kenkere's Dasara trough; catch Kwality's late-October surge without codes.",
    moment: 'Gift cards on sale from 1 Oct; candle-lit evening classes in Diwali week; limited-run format #3.',
    figures: {
      target: 750000,
      projected: 790000,
      newClientPlan: 110000,
      renewalPlan: 440000,
      reactivationPlan: 100000,
      otherPlan: 100000,
      leadsTrials: [170, 34],
      renewals: [54, 35],
      lapsed: [276, 23],
      newBuyers: 9,
    },
    offers: [
      {
        slot: 'newcomer',
        name: 'Gift a Flight',
        tagline: 'Give someone three classes and a reason to stay.',
        fields: {
          Journey: ['The Tasting Flight'],
          'Commercial job': ['Gift-led acquisition'],
          'Who qualifies': ['Anyone buying for a friend who is new to P57.'],
          'You pay': [
            'Intro: ₹1.8k for the Tasting Flight gift (3 classes in 10 days), credited in full against a qualifying purchase within 72 hours. Then any pack or membership at 15% off list (the standing new-client perk).',
          ],
          'You get': [
            '• A Tasting Flight as a Diwali gift card',
            '• The recipient follows the Flight journey; the fee is credited if they buy within 72 hours of class 3',
            '• The giver gets 1 bonus class when the recipient buys',
          ],
          When: ['1 Oct–15 Nov.'],
          Rules: [
            '• Recipient must be new; activate within 60 days',
            '• The 15% is the standing new-client perk, not an extra discount.',
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹1.3L counted (+₹14.8k vs the ₹1.1L stream plan) · 10 buyers'],
          'Rate of sale': ['Needs ≈10 renewal purchases (plan 9).'],
          'Why it works': [
            'Gifting is real Diwali spend, and a Flight is a better gift than cash credit because it leads into the best-converting journey.',
          ],
          'What to watch': ['Gift activations; recipient conversion.'],
          'Offer auditor': [
            '23/25 (Effect 5, Creativity 5, Clarity 5, Practical 4, Economics 4). Creative and on-theme.',
          ],
          Model: [
            '34 in pool × 25.3% plan rate × 1.20 conversion factor = 10.3 buyers × ₹13.9k ticket = ₹1.4L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'lapsed',
        name: 'Light Up Your Streak',
        tagline: '15 classes in 30 days lights up 3 extra days.',
        fields: {
          'Commercial job': ['Reactivation with attendance'],
          'Who qualifies': ['Lapsed clients.'],
          'You pay': ['1M unlimited: ₹12.8k (12% off the ₹14.6k list price).'],
          'You get': ['• 1M at 12% off', '• 15 classes in 30 days → +3 days'],
          When: ['All October.'],
          Rules: [
            '• Replaces the 15% perk',
            "• Replaces the standing 15% perk; the two don't combine.",
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '22.0% effective = 12% cash + 10.0% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹1.1L counted (+₹13.8k vs the ₹1.0L stream plan) · 24 buyers'],
          'Rate of sale': ['Needs ≈5 1M unlimited sales vs 17.3 a month today (all buyers).'],
          'Why it works': ["Kenkere's Dasara trough needs attendance as much as sales."],
          'What to watch': ['Streak completion.'],
          'Offer auditor': ['21/25 (Effect 4, Creativity 4, Clarity 5, Practical 4, Economics 4). Good for Kenkere.'],
          Model: [
            '276 in pool × 8.2% plan rate × 1.05 conversion factor = 23.6 buyers × ₹5.2k ticket (23% take the featured product) = ₹1.2L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'renewal',
        name: 'Festive Pause Pass',
        tagline: 'Renew now; pause for the holidays.',
        fields: {
          'Commercial job': ['Hold renewals through festive travel'],
          'Who qualifies': ['October renewers.'],
          'You pay': ["Renewal at your product's list price (no % off)."],
          'You get': [
            '• Renew 1M or longer at list',
            '• 1 extra freeze for festive travel + 2 guest passes for family',
          ],
          When: ['All October.'],
          Rules: ['• No % discount', "• Doesn't combine with any other campaign offer."],
          'Effective discount': [
            '0.0% effective = 0% cash. Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹4.5L counted (+₹6.6k vs the ₹4.4L stream plan) · 36 buyers'],
          'Rate of sale': ['Needs ≈36 renewal purchases (plan 35).'],
          'Why it works': ["Kenkere's October is a travel trough."],
          'What to watch': ['October yield.'],
          'Offer auditor': ['22/25 (Effect 4, Creativity 3, Clarity 5, Practical 5, Economics 5). Cheap and relevant.'],
          Model: [
            '54 in pool × 66.0% plan rate × 1.03 conversion factor = 36.5 buyers × ₹12.5k ticket = ₹4.6L modelled; 50% of uplift counted',
          ],
        },
      },
    ],
  },
  {
    studio: 'Kenkere House',
    month: 11,
    theme: 'Black Friday, Strong Monday',
    hook: 'Black Friday (Fri 26 Nov) → Cyber Monday (29 Nov)',
    job: 'Long commitments in the softest Mumbai month.',
    moment: 'Club Nine last seats (only those unsold in April).',
    figures: {
      target: 1230000,
      projected: 1330000,
      newClientPlan: 240000,
      renewalPlan: 740000,
      reactivationPlan: 90000,
      otherPlan: 160000,
      leadsTrials: [300, 60],
      renewals: [38, 49],
      lapsed: [229, 18],
      newBuyers: 15,
    },
    offers: [
      {
        slot: 'newcomer',
        name: 'Black Friday Week Zero',
        tagline: 'Seven days unlimited, fully credited.',
        fields: {
          Journey: ['Week Zero'],
          'Commercial job': ['Bold intro in the softest Mumbai month'],
          'Who qualifies': ['First-time clients.'],
          'You pay': [
            'Intro: ₹1.5k for the 7-day unlimited intro, credited in full against a qualifying purchase within 72 hours. Then any pack or membership at 15% off list (the standing new-client perk).',
          ],
          'You get': [
            '• 7 days unlimited (max 2 a day)',
            '• Credited within 72 hours against any pack or membership + standing 15%',
            '• Upgrade to 3M before day 21 of a 1M: the 1M amount is credited and the 3M gets unlimited freezes (use within 6 months)',
          ],
          When: ['20 Nov–5 Dec.'],
          Rules: [
            '• One intro per person',
            '• The 15% is the standing new-client perk, not an extra discount.',
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹2.7L counted (+₹37.1k vs the ₹2.4L stream plan) · 19 buyers'],
          'Rate of sale': ['Needs ≈19 renewal purchases (plan 15).'],
          'Why it works': ['Black Friday urgency without a deeper %.'],
          'What to watch': ['Intro conversion; day-21 upgrades.'],
          'Offer auditor': ['22/25 (Effect 5, Creativity 4, Clarity 5, Practical 4, Economics 4). Strong.'],
          Model: [
            '60 in pool × 25.0% plan rate × 1.25 conversion factor = 18.8 buyers × ₹16.6k ticket = ₹3.1L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'lapsed',
        name: 'Black Friday Comeback',
        tagline: 'Back for a month, plus three days.',
        fields: {
          'Commercial job': ['Year-end reactivation'],
          'Who qualifies': ['Lapsed clients.'],
          'You pay': ['1M unlimited: ₹12.8k (12% off the ₹14.6k list price).'],
          'You get': ['• 1M at 12% off + 3 days'],
          When: ['26–29 Nov.'],
          Rules: [
            '• Replaces the 15% perk',
            "• Replaces the standing 15% perk; the two don't combine.",
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '22.0% effective = 12% cash + 10.0% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹1.0L counted (+₹7.9k vs the ₹0.9L stream plan) · 18 buyers'],
          'Rate of sale': ['Needs ≈4 1M unlimited sales vs 17.3 a month today (all buyers).'],
          'Why it works': ['Same window as the new-client offer.'],
          'What to watch': ['Effective 22%.'],
          'Offer auditor': ['21/25 (Effect 4, Creativity 3, Clarity 5, Practical 5, Economics 4). Fine.'],
          Model: [
            '229 in pool × 7.9% plan rate × 1.00 conversion factor = 18.2 buyers × ₹6k ticket (23% take the featured product) = ₹1.1L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'renewal',
        name: 'Strong Monday Ladder',
        tagline: 'Renew long in the Black Friday window.',
        fields: {
          'Commercial job': ['Long renewals'],
          'Who qualifies': ['Members renewing 26–29 Nov.'],
          'You pay': ["Renewal at your product's list price (no % off)."],
          'You get': ['• 3M +7 days, 6M +14 days, Annual +30 days'],
          When: ['26–29 Nov.'],
          Rules: ['• Renew at list', "• Doesn't combine with any other campaign offer."],
          'Effective discount': [
            '8.0% effective = 0% cash + 8.0% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹8.0L counted (+₹56.8k vs the ₹7.4L stream plan) · 51 buyers'],
          'Rate of sale': ['Needs ≈51 renewal purchases (plan 49).'],
          'Why it works': ['Rewards length, not depth.'],
          'What to watch': ['3M+ share.'],
          'Offer auditor': ['21/25 (Effect 4, Creativity 3, Clarity 5, Practical 5, Economics 4). Solid.'],
          Model: [
            '38 in pool × 131.5% plan rate × 1.03 conversion factor = 50.8 buyers × ₹16.8k ticket = ₹8.5L modelled; 50% of uplift counted',
          ],
        },
      },
    ],
  },
  {
    studio: 'Kenkere House',
    month: 12,
    theme: 'Wrapped',
    hook: 'Year-end · pre-sell January',
    job: "Pre-sell the February 2028 challenge and January's first week; renew on personal usage data.",
    moment:
      '"Your 2027 Wrapped": a personal year-in-review for every client, ending in a usage-based renewal recommendation.',
    figures: {
      target: 700000,
      projected: 720000,
      newClientPlan: 160000,
      renewalPlan: 370000,
      reactivationPlan: 80000,
      otherPlan: 90000,
      leadsTrials: [215, 43],
      renewals: [48, 26],
      lapsed: [200, 16],
      newBuyers: 11,
    },
    offers: [
      {
        slot: 'newcomer',
        name: 'Kickstart 21: Pre-Solution Cohort',
        tagline: 'Buy in December. Start Mon 3 Jan. Arrive at the February challenge.',
        fields: {
          Journey: ['Kickstart 21'],
          'Commercial job': ['Pre-sell January'],
          'Who qualifies': ['First-time clients.'],
          'You pay': ['Kickstart 21 cohort: ₹8k (list price).'],
          'You get': [
            '• Cohort starts Mon 3 Jan 2028; sold in December',
            '• 21 days unlimited + coach, WhatsApp, fitness checks, graduation',
            '• Graduates who buy a membership join the February 2028 challenge with a scaled target',
          ],
          When: ['All December.'],
          Rules: [
            '• Cohort fee not credited',
            "• Replaces the standing 15% perk; the two don't combine.",
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '0.0% effective = 0% cash. Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹1.6L counted (+₹2.5k vs the ₹1.6L stream plan) · 12 buyers'],
          'Rate of sale': ['Needs ≈3 Kickstart 21 cohort sales (new product, no current rate).'],
          'Why it works': [
            'Moves January demand into December cash and lands graduates in the members-only challenge.',
          ],
          'What to watch': ['Pre-sales; January graduation.'],
          'Offer auditor': [
            '23/25 (Effect 5, Creativity 5, Clarity 5, Practical 4, Economics 4). Smooths the December dip.',
          ],
          Model: [
            '43 in pool × 24.9% plan rate × 1.10 conversion factor = 11.8 buyers × ₹14.1k ticket (27% take the featured product) = ₹1.7L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'lapsed',
        name: 'Your 2027 Wrapped',
        tagline: "You took 87 classes with us. Here's to the next year.",
        fields: {
          'Commercial job': ['Data-led reactivation'],
          'Who qualifies': ['Lapsed clients.'],
          'You pay': ['12-class pack: ₹11.2k (15% off the ₹13.1k list price).'],
          'You get': [
            '• Personal stats page (classes, favourite trainer, best month)',
            '• 12-class pack at the standing 15% + a comeback class',
          ],
          When: ['All December.'],
          Rules: [
            '• Standing perk',
            '• The 15% is the standing lapsed-client perk, not an extra discount.',
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹0.9L counted (+₹10.8k vs the ₹0.8L stream plan) · 18 buyers'],
          'Rate of sale': ['Needs ≈4 12-class pack sales vs 10.5 a month today (all buyers).'],
          'Why it works': ['Year-in-review pages get shared; it reminds lapsed clients of their own habit.'],
          'What to watch': ['Stats export needed.'],
          'Offer auditor': [
            '21/25 (Effect 5, Creativity 5, Clarity 4, Practical 3, Economics 4). Most creative winback; data-dependent.',
          ],
          Model: [
            '200 in pool × 8.1% plan rate × 1.10 conversion factor = 17.7 buyers × ₹5.6k ticket (25% take the featured product) = ₹1.0L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'renewal',
        name: 'Challenge-Ready Renewal',
        tagline: "Renew in December so you're covered for all of Stronger in 30.",
        fields: {
          'Commercial job': ['Renew at list ahead of the challenge'],
          'Who qualifies': ['Members expiring Dec–Jan.'],
          'You pay': ["Renewal at your product's list price (no % off)."],
          'You get': [
            "• Renew at list so the membership covers January and February's challenge",
            '• February challenge kit (≈₹1,000)',
          ],
          When: ['All December.'],
          Rules: ['• No % discount', "• Doesn't combine with any other campaign offer."],
          'Effective discount': [
            '4.0% effective = 0% cash + 4.0% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹3.7L counted (+₹9.1k vs the ₹3.7L stream plan) · 27 buyers'],
          'Rate of sale': ['Needs ≈27 renewal purchases (plan 26).'],
          'Why it works': ['Members-only challenge = a natural reason to renew before it starts.'],
          'What to watch': ['December renewals of January expiries.'],
          'Offer auditor': [
            '24/25 (Effect 5, Creativity 4, Clarity 5, Practical 5, Economics 5). Top December renewal.',
          ],
          Model: [
            '48 in pool × 53.3% plan rate × 1.05 conversion factor = 27.0 buyers × ₹14.2k ticket = ₹3.8L modelled; 50% of uplift counted',
          ],
        },
      },
    ],
  },
  {
    studio: 'Pop-up',
    month: 1,
    theme: 'Start Line',
    hook: 'New Year · Saturday squad · drop-in to pack',
    job: 'Turn drop-ins into packs and feed Kenkere. Nothing launches this month: the work is the first drop-in, the Saturday squad and the pack conversation at the door — and a February pack carries a Stronger in 30 2.0 entry.',
    moment:
      'January is the first drop-in, the Saturday squad and the pack conversation at the door. Packs bought in February carry a Stronger in 30 2.0 entry.',
    figures: {
      target: 160000,
      newClientPlan: 20000,
      renewalPlan: 20000,
      reactivationPlan: 20000,
      otherPlan: 100000,
      projected: 160000,
      leadsTrials: [123, 32],
      renewals: [60, 2],
      lapsed: [158, 13],
      newBuyers: 2,
    },
    offers: [
      {
        slot: 'newcomer',
        name: 'First Drop-in Counts',
        tagline: 'Your first class fee comes off your first pack.',
        fields: {
          'Commercial job': ['Drop-in → pack from visit one'],
          'Who qualifies': ['First-time pop-up clients.'],
          'You pay': ['8-class pack: ₹6.9k (list price).'],
          'You get': ['• First drop-in fee credited toward a C+C 8-class pack bought within 7 days'],
          When: ['Every month.'],
          Rules: [
            '• One credit per person',
            "• Replaces the standing 15% perk; the two don't combine.",
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '13.6% effective = 0% cash + 13.6% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹0.2L counted (+₹0.9k vs the ₹0.2L stream plan) · 2 buyers'],
          'Rate of sale': ['Needs ≈1 8-class pack sales vs 1.2 a month today (all buyers).'],
          'Why it works': ['Only 2.9% of first visits buy a pack, yet 63% buy something.'],
          'What to watch': ['Pack conversion of first visits.'],
          'Offer auditor': ['21/25 (Effect 4, Creativity 3, Clarity 5, Practical 5, Economics 4). Simple and right.'],
          Model: [
            '32 in pool × 6.3% plan rate × 1.20 conversion factor = 2.4 buyers × ₹9.1k ticket (60% take the featured product) = ₹0.2L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'lapsed',
        name: 'Missed You at the Pop-up',
        tagline: 'Your neighbourhood class is waiting.',
        fields: {
          'Commercial job': ['Reactivate pop-up clients'],
          'Who qualifies': ['Lapsed pop-up clients.'],
          'You pay': ['8-class pack: ₹5.9k (15% off the ₹6.9k list price).'],
          'You get': ['• 8-class pack at the standing 15% + a free return class'],
          When: ['Every month.'],
          Rules: [
            '• Standing perk',
            '• The 15% is the standing lapsed-client perk, not an extra discount.',
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹0.2L counted (+₹1.3k vs the ₹0.2L stream plan) · 13 buyers'],
          'Rate of sale': ['Needs ≈1 8-class pack sales vs 1.2 a month today (all buyers).'],
          'Why it works': ['Most pop-up reactivations are single credits.'],
          'What to watch': ['Pack share.'],
          'Offer auditor': ['20/25 (Effect 3, Creativity 3, Clarity 5, Practical 5, Economics 4). Plain.'],
          Model: [
            '158 in pool × 8.2% plan rate × 1.00 conversion factor = 13.0 buyers × ₹1.6k ticket (9% take the featured product) = ₹0.2L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'renewal',
        name: "Credit Where It's Due",
        tagline: 'Your last two drop-ins count toward a 10-pack.',
        fields: {
          'Commercial job': ['Convert regulars to packs'],
          'Who qualifies': ['Clients with 3+ drop-ins in 60 days.'],
          'You pay': ['10-class pack: ₹8.5k (list price).'],
          'You get': ['• Last 2 drop-ins credited toward a C+C 10-class pack'],
          When: ['Every month.'],
          Rules: ['• Credit within 60 days of the drop-ins', "• Doesn't combine with any other campaign offer."],
          'Effective discount': [
            '22.2% effective = 0% cash + 22.2% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹0.2L counted (−₹1.3k vs the ₹0.2L stream plan) · 2 buyers'],
          'Rate of sale': ['Needs ≈1 10-class pack sales vs 2.3 a month today (all buyers).'],
          'Why it works': ['186 regulars spent ~₹4,000 each on drop-ins, already half a pack.'],
          'What to watch': ['Effective ≈22%.'],
          'Offer auditor': ['23/25 (Effect 5, Creativity 4, Clarity 5, Practical 5, Economics 4). Best pop-up offer.'],
          Model: [
            '60 in pool × 3.3% plan rate × 1.00 conversion factor = 2.0 buyers × ₹11k ticket (70% take the featured product) = ₹0.2L modelled; 50% of uplift counted',
          ],
        },
      },
    ],
  },
  {
    studio: 'Pop-up',
    month: 2,
    theme: 'Stronger in 30 2.0',
    hook: "The 30-day challenge · Saturday squad · Galentine's (Sat 13 Feb)",
    job: "Run the challenge for pack holders: every February pack enters it, the Saturday squad is the welcoming floor, and Galentine's is the reason to bring someone.",
    moment:
      "Stronger in 30 2.0 runs 1–28 Feb and a February pack is the entry. The Saturday squad is the floor; the Galentine's class on Sat 13 Feb is the mid-challenge event.",
    figures: {
      target: 150000,
      projected: 150000,
      newClientPlan: 10000,
      renewalPlan: 50000,
      reactivationPlan: 10000,
      otherPlan: 90000,
      leadsTrials: [92, 24],
      renewals: [60, 6],
      lapsed: [90, 7],
      newBuyers: 1,
    },
    offers: [
      {
        slot: 'newcomer',
        name: 'Saturday Squad',
        tagline: 'Saturdays: bring a friend free — and the pack is your challenge entry.',
        fields: {
          'Commercial job': ['Fill the strongest day'],
          'Who qualifies': ['First-timers on Saturdays.'],
          'You pay': ['4-class pack: ₹4k (15% off the ₹4.7k list price).'],
          'You get': [
            '• Bring a friend free',
            '• Both buy a 4-class pack at the standing 15%',
            '• A February pack is your Stronger in 30 2.0 entry',
          ],
          When: ['Every Saturday.'],
          Rules: [
            '• Friend new to P57',
            '• The 15% is the standing new-client perk, not an extra discount.',
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹0.1L counted · 1 buyers (the month runs two new-client routes; this is its share)'],
          'Rate of sale': ['Needs ≈1 4-class pack sales vs 0 a month today (all buyers).'],
          'Why it works': ['Saturday fill is 43% vs 13–20% on weekdays.'],
          'What to watch': ['Saturday attendance.'],
          'Offer auditor': ['21/25 (Effect 4, Creativity 4, Clarity 5, Practical 4, Economics 4). Good.'],
          Model: [
            '24 in pool × 4.2% plan rate × 1.20 conversion factor = 1.2 buyers × ₹5.5k ticket (70% take the featured product) = ₹0.1L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'lapsed',
        name: 'Neighbourhood Reunion',
        tagline: 'One Saturday a month, all the regulars.',
        fields: {
          'Commercial job': ['Hosted reactivation'],
          'Who qualifies': ['Lapsed pop-up clients.'],
          'You pay': ['4-class pack: ₹4k (15% off the ₹4.7k list price).'],
          'You get': [
            '• Monthly reunion class',
            '• At the door: 4-class pack at the standing 15%',
            '• A February pack is your Stronger in 30 2.0 entry',
          ],
          When: ['Monthly.'],
          Rules: [
            '• Named associate at the door',
            '• The 15% is the standing lapsed-client perk, not an extra discount.',
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹0.1L counted · 8 buyers (the month runs two comeback routes; this is its share)'],
          'Rate of sale': ['Needs ≈1 4-class pack sales vs 0 a month today (all buyers).'],
          'Why it works': ['Saturday is the only day with real fill.'],
          'What to watch': ['Door conversion.'],
          'Offer auditor': ['21/25 (Effect 4, Creativity 4, Clarity 5, Practical 4, Economics 4). Good.'],
          Model: [
            '90 in pool × 7.8% plan rate × 1.10 conversion factor = 7.7 buyers × ₹1.1k ticket (14% take the featured product) = ₹0.1L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'renewal',
        name: "Credit Where It's Due",
        tagline: 'Your last two drop-ins count toward a 10-pack.',
        fields: {
          'Commercial job': ['Convert regulars to packs'],
          'Who qualifies': ['Clients with 3+ drop-ins in 60 days.'],
          'You pay': ['10-class pack: ₹8.5k (list price).'],
          'You get': [
            '• Last 2 drop-ins credited toward a C+C 10-class pack',
            '• A February pack is your Stronger in 30 2.0 entry',
          ],
          When: ['Every month.'],
          Rules: ['• Credit within 60 days of the drop-ins', "• Doesn't combine with any other campaign offer."],
          'Effective discount': [
            '22.2% effective = 0% cash + 22.2% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹0.5L counted · 6 buyers (the month runs two renewal routes; this is its share)'],
          'Rate of sale': ['Needs ≈1 10-class pack sales vs 2.3 a month today (all buyers).'],
          'Why it works': ['186 regulars spent ~₹4,000 each on drop-ins, already half a pack.'],
          'What to watch': ['Effective ≈22%.'],
          'Offer auditor': ['23/25 (Effect 5, Creativity 4, Clarity 5, Practical 5, Economics 4). Best pop-up offer.'],
          Model: [
            '60 in pool × 10.0% plan rate × 1.00 conversion factor = 6.0 buyers × ₹8k ticket (70% take the featured product) = ₹0.5L modelled; 50% of uplift counted',
          ],
        },
      },
    ],
  },
  {
    studio: 'Pop-up',
    month: 3,
    theme: 'She Moves',
    hook: "International Women's Day (Mon 8 Mar)",
    job: "Purpose-led reach; Bandra reactivation; stop March trials from waiting for the anniversary. Keep February's challenge finishers attending.",
    moment: 'Class of 2024 Reunion at Bandra (638 lapsed launch-cohort clients). Anniversary teaser from 16 Mar.',
    figures: {
      target: 140000,
      projected: 140000,
      newClientPlan: 10000,
      renewalPlan: 40000,
      reactivationPlan: 10000,
      otherPlan: 90000,
      leadsTrials: [60, 5],
      renewals: [113, 9],
      lapsed: [111, 29],
      newBuyers: 1,
    },
    offers: [
      {
        slot: 'newcomer',
        name: 'Studio Passport',
        tagline: '3 stamps at the pop-ups, a free class at Kenkere.',
        fields: {
          'Commercial job': ['Feed Kenkere'],
          'Who qualifies': ['Pop-up clients.'],
          'You pay': ['10-class pack: ₹7.7k (10% off the ₹8.5k list price).'],
          'You get': [
            '• 3 classes across Copper + Cloves / Plash → 1 free Kenkere class',
            '• 10-class pack at 10% off',
          ],
          When: ['Every month.'],
          Rules: [
            '• Passport tracked in Momence',
            "• Replaces the standing 15% perk; the two don't combine.",
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '10.0% effective = 10% cash. Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹0.1L counted (+₹0.1k vs the ₹0.1L stream plan) · 1 buyers'],
          'Rate of sale': ['Needs ≈1 10-class pack sales vs 2.3 a month today (all buyers).'],
          'Why it works': ['8.8% of Kenkere leads are lost on proximity; the pop-ups are the bridge.'],
          'What to watch': ['Passport → Kenkere conversions.'],
          'Offer auditor': [
            '22/25 (Effect 4, Creativity 5, Clarity 5, Practical 4, Economics 4). Creative cross-sell.',
          ],
          Model: [
            '29 in pool × 3.4% plan rate × 1.00 conversion factor = 1.0 buyers × ₹6.8k ticket (50% take the featured product) = ₹0.1L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'lapsed',
        name: 'Move to Kenkere',
        tagline: 'Closer to Kenkere House? Come to the flagship.',
        fields: {
          'Commercial job': ['Route lapsed pop-up clients to Kenkere'],
          'Who qualifies': ['Lapsed pop-up clients living near Kenkere.'],
          'You pay': ['8-class pack: ₹5.9k (15% off the ₹6.9k list price).'],
          'You get': ['• Kenkere 8-class pack at the standing 15%'],
          When: ['Every month.'],
          Rules: [
            '• Credited to both studios',
            '• The 15% is the standing lapsed-client perk, not an extra discount.',
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹0.1L counted (+₹0.5k vs the ₹0.1L stream plan) · 8 buyers'],
          'Rate of sale': ['Needs ≈1 8-class pack sales vs 1.2 a month today (all buyers).'],
          'Why it works': ['Proximity-matched routing in both directions.'],
          'What to watch': ['Kenkere conversions.'],
          'Offer auditor': ['20/25 (Effect 3, Creativity 4, Clarity 5, Practical 4, Economics 4). Useful.'],
          Model: [
            '113 in pool × 8.0% plan rate × 0.90 conversion factor = 8.1 buyers × ₹1.1k ticket (9% take the featured product) = ₹0.1L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'renewal',
        name: 'Pack + Passport',
        tagline: '10 classes here, 1 at Kenkere.',
        fields: {
          'Commercial job': ['Pack + cross-sell'],
          'Who qualifies': ['Pop-up regulars.'],
          'You pay': ['10-class pack: ₹8.5k (list price).'],
          'You get': ['• 10-class pack at list + 1 Kenkere class'],
          When: ['Every month.'],
          Rules: ['• Kenkere class within 30 days', "• Doesn't combine with any other campaign offer."],
          'Effective discount': [
            '16.7% effective = 0% cash + 16.7% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹0.4L counted (+₹0.4k vs the ₹0.4L stream plan) · 5 buyers'],
          'Rate of sale': ['Needs ≈3 10-class pack sales vs 2.3 a month today (all buyers).'],
          'Why it works': ['Introduces regulars to the flagship.'],
          'What to watch': ['Kenkere visits.'],
          'Offer auditor': ['21/25 (Effect 4, Creativity 4, Clarity 5, Practical 4, Economics 4). Good.'],
          Model: [
            '60 in pool × 8.3% plan rate × 1.00 conversion factor = 5.0 buyers × ₹8.2k ticket (60% take the featured product) = ₹0.4L modelled; 50% of uplift counted',
          ],
        },
      },
    ],
  },
  {
    studio: 'Pop-up',
    month: 4,
    theme: 'Cloud Nine (9th anniversary)',
    hook: '9 years of Physique 57 India · first ₹1 Cr month',
    job: "The year's best, most playful offers and the first ₹1 Cr sales month (target ₹104.5L), without the 26–31% discounts of April 2026. Caps: 20% on ≤1M products, 15% on 3M+.",
    moment:
      'Club Nine: 9 numbered annual memberships per studio at full price. Anniversary party classes in week 2. Hard close 30 Apr, 23:59.',
    figures: {
      target: 110000,
      projected: 110000,
      newClientPlan: 20000,
      renewalPlan: 10000,
      reactivationPlan: 10000,
      otherPlan: 70000,
      leadsTrials: [60, 1],
      renewals: [117, 9],
      lapsed: [134, 35],
      newBuyers: 2,
    },
    offers: [
      {
        slot: 'newcomer',
        name: 'First Drop-in Counts',
        tagline: 'Your first class fee comes off your first pack.',
        fields: {
          'Commercial job': ['Drop-in → pack from visit one'],
          'Who qualifies': ['First-time pop-up clients.'],
          'You pay': ['8-class pack: ₹6.9k (list price).'],
          'You get': ['• First drop-in fee credited toward a C+C 8-class pack bought within 7 days'],
          When: ['Every month.'],
          Rules: [
            '• One credit per person',
            "• Replaces the standing 15% perk; the two don't combine.",
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '13.6% effective = 0% cash + 13.6% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹0.2L counted (+₹1k vs the ₹0.2L stream plan) · 2 buyers'],
          'Rate of sale': ['Needs ≈1 8-class pack sales vs 1.2 a month today (all buyers).'],
          'Why it works': ['Only 2.9% of first visits buy a pack, yet 63% buy something.'],
          'What to watch': ['Pack conversion of first visits.'],
          'Offer auditor': ['21/25 (Effect 4, Creativity 3, Clarity 5, Practical 5, Economics 4). Simple and right.'],
          Model: [
            '35 in pool × 5.7% plan rate × 1.20 conversion factor = 2.4 buyers × ₹8.8k ticket (60% take the featured product) = ₹0.2L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'lapsed',
        name: 'Missed You at the Pop-up',
        tagline: 'Your neighbourhood class is waiting.',
        fields: {
          'Commercial job': ['Reactivate pop-up clients'],
          'Who qualifies': ['Lapsed pop-up clients.'],
          'You pay': ['8-class pack: ₹5.9k (15% off the ₹6.9k list price).'],
          'You get': ['• 8-class pack at the standing 15% + a free return class'],
          When: ['Every month.'],
          Rules: [
            '• Standing perk',
            '• The 15% is the standing lapsed-client perk, not an extra discount.',
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹0.1L counted (+₹0.9k vs the ₹0.1L stream plan) · 9 buyers'],
          'Rate of sale': ['Needs ≈1 8-class pack sales vs 1.2 a month today (all buyers).'],
          'Why it works': ['Most pop-up reactivations are single credits.'],
          'What to watch': ['Pack share.'],
          'Offer auditor': ['20/25 (Effect 3, Creativity 3, Clarity 5, Practical 5, Economics 4). Plain.'],
          Model: [
            '117 in pool × 7.7% plan rate × 1.00 conversion factor = 9.0 buyers × ₹1.5k ticket (9% take the featured product) = ₹0.1L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'renewal',
        name: "Credit Where It's Due",
        tagline: 'Your last two drop-ins count toward a 10-pack.',
        fields: {
          'Commercial job': ['Convert regulars to packs'],
          'Who qualifies': ['Clients with 3+ drop-ins in 60 days.'],
          'You pay': ['10-class pack: ₹8.5k (list price).'],
          'You get': ['• Last 2 drop-ins credited toward a C+C 10-class pack'],
          When: ['Every month.'],
          Rules: ['• Credit within 60 days of the drop-ins', "• Doesn't combine with any other campaign offer."],
          'Effective discount': [
            '22.2% effective = 0% cash + 22.2% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹0.1L counted (−₹0.6k vs the ₹0.1L stream plan) · 1 buyers'],
          'Rate of sale': ['Needs ≈1 10-class pack sales vs 2.3 a month today (all buyers).'],
          'Why it works': ['186 regulars spent ~₹4,000 each on drop-ins, already half a pack.'],
          'What to watch': ['Effective ≈22%.'],
          'Offer auditor': ['23/25 (Effect 5, Creativity 4, Clarity 5, Practical 5, Economics 4). Best pop-up offer.'],
          Model: [
            '60 in pool × 1.7% plan rate × 1.00 conversion factor = 1.0 buyers × ₹10.7k ticket (70% take the featured product) = ₹0.1L modelled; 50% of uplift counted',
          ],
        },
      },
    ],
  },
  {
    studio: 'Pop-up',
    month: 5,
    theme: 'The Afterparty',
    hook: "Mother's Day (Sun 9 May)",
    job: 'Retain the April cohort (target ≥55% renewal at next expiry vs 24.5% for 2026 anniversary-code buyers at Kwality); duo acquisition.',
    moment:
      'Every April buyer gets the 30-day Afterparty plan: week-1 call, 8 classes in May unlocks a hosted class and a progress check.',
    figures: {
      target: 130000,
      projected: 130000,
      newClientPlan: 30000,
      renewalPlan: 20000,
      reactivationPlan: 0,
      otherPlan: 80000,
      leadsTrials: [60, 1],
      renewals: [23, 2],
      lapsed: [157, 41],
      newBuyers: 2,
    },
    offers: [
      {
        slot: 'newcomer',
        name: 'Saturday Squad',
        tagline: 'Saturdays: bring a friend free.',
        fields: {
          'Commercial job': ['Fill the strongest day'],
          'Who qualifies': ['First-timers on Saturdays.'],
          'You pay': ['4-class pack: ₹4k (15% off the ₹4.7k list price).'],
          'You get': ['• Bring a friend free', '• Both buy a 4-class pack at the standing 15%'],
          When: ['Every Saturday.'],
          Rules: [
            '• Friend new to P57',
            '• The 15% is the standing new-client perk, not an extra discount.',
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹0.3L counted (−₹1.5k vs the ₹0.3L stream plan) · 2 buyers'],
          'Rate of sale': ['Needs ≈2 4-class pack sales vs 0 a month today (all buyers).'],
          'Why it works': ['Saturday fill is 43% vs 13–20% on weekdays.'],
          'What to watch': ['Saturday attendance.'],
          'Offer auditor': ['21/25 (Effect 4, Creativity 4, Clarity 5, Practical 4, Economics 4). Good.'],
          Model: [
            '41 in pool × 4.9% plan rate × 1.20 conversion factor = 2.4 buyers × ₹10.8k ticket (70% take the featured product) = ₹0.3L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'lapsed',
        name: 'Neighbourhood Reunion',
        tagline: 'One Saturday a month, all the regulars.',
        fields: {
          'Commercial job': ['Hosted reactivation'],
          'Who qualifies': ['Lapsed pop-up clients.'],
          'You pay': ['4-class pack: ₹4k (15% off the ₹4.7k list price).'],
          'You get': ['• Monthly reunion class', '• At the door: 4-class pack at the standing 15%'],
          When: ['Monthly.'],
          Rules: [
            '• Named associate at the door',
            '• The 15% is the standing lapsed-client perk, not an extra discount.',
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹0.0L counted (+₹0.3k vs the ₹0.0L stream plan) · 2 buyers'],
          'Rate of sale': ['Needs ≈0 4-class pack sales vs 0 a month today (all buyers).'],
          'Why it works': ['Saturday is the only day with real fill.'],
          'What to watch': ['Door conversion.'],
          'Offer auditor': ['21/25 (Effect 4, Creativity 4, Clarity 5, Practical 4, Economics 4). Good.'],
          Model: [
            '23 in pool × 8.7% plan rate × 1.10 conversion factor = 2.2 buyers × ₹2.1k ticket (14% take the featured product) = ₹0.0L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'renewal',
        name: "Credit Where It's Due",
        tagline: 'Your last two drop-ins count toward a 10-pack.',
        fields: {
          'Commercial job': ['Convert regulars to packs'],
          'Who qualifies': ['Clients with 3+ drop-ins in 60 days.'],
          'You pay': ['10-class pack: ₹8.5k (list price).'],
          'You get': ['• Last 2 drop-ins credited toward a C+C 10-class pack'],
          When: ['Every month.'],
          Rules: ['• Credit within 60 days of the drop-ins', "• Doesn't combine with any other campaign offer."],
          'Effective discount': [
            '22.2% effective = 0% cash + 22.2% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹0.2L counted (−₹1.6k vs the ₹0.2L stream plan) · 1 buyers'],
          'Rate of sale': ['Needs ≈1 10-class pack sales vs 2.3 a month today (all buyers).'],
          'Why it works': ['186 regulars spent ~₹4,000 each on drop-ins, already half a pack.'],
          'What to watch': ['Effective ≈22%.'],
          'Offer auditor': ['23/25 (Effect 5, Creativity 4, Clarity 5, Practical 5, Economics 4). Best pop-up offer.'],
          Model: [
            '60 in pool × 1.7% plan rate × 1.00 conversion factor = 1.0 buyers × ₹14.5k ticket (70% take the featured product) = ₹0.1L modelled; 50% of uplift counted',
          ],
        },
      },
    ],
  },
  {
    studio: 'Pop-up',
    month: 6,
    theme: 'Out of Office',
    hook: "Summer travel · college holidays · Father's Day (Sun 20 Jun)",
    job: 'Stop summer lapses; fill weekday 10–12 and weekend 4–7 pm (27–41% full) with students.',
    moment: 'Golden Hours launch for students and under-25s.',
    figures: {
      target: 180000,
      newClientPlan: 10000,
      renewalPlan: 40000,
      reactivationPlan: 10000,
      otherPlan: 110000,
      projected: 180000,
      leadsTrials: [153, 40],
      renewals: [60, 5],
      lapsed: [180, 14],
      newBuyers: 2,
    },
    offers: [
      {
        slot: 'newcomer',
        name: 'Studio Passport',
        tagline: '3 stamps at the pop-ups, a free class at Kenkere.',
        fields: {
          'Commercial job': ['Feed Kenkere'],
          'Who qualifies': ['Pop-up clients.'],
          'You pay': ['10-class pack: ₹7.7k (10% off the ₹8.5k list price).'],
          'You get': [
            '• 3 classes across Copper + Cloves / Plash → 1 free Kenkere class',
            '• 10-class pack at 10% off',
          ],
          When: ['Every month.'],
          Rules: [
            '• Passport tracked in Momence',
            "• Replaces the standing 15% perk; the two don't combine.",
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '10.0% effective = 10% cash. Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹0.1L counted (+₹0.2k vs the ₹0.1L stream plan) · 2 buyers'],
          'Rate of sale': ['Needs ≈1 10-class pack sales vs 2.3 a month today (all buyers).'],
          'Why it works': ['8.8% of Kenkere leads are lost on proximity; the pop-ups are the bridge.'],
          'What to watch': ['Passport → Kenkere conversions.'],
          'Offer auditor': [
            '22/25 (Effect 4, Creativity 5, Clarity 5, Practical 4, Economics 4). Creative cross-sell.',
          ],
          Model: [
            '40 in pool × 5.0% plan rate × 1.00 conversion factor = 2.0 buyers × ₹7.2k ticket (50% take the featured product) = ₹0.1L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'lapsed',
        name: 'Move to Kenkere',
        tagline: 'Closer to Kenkere House? Come to the flagship.',
        fields: {
          'Commercial job': ['Route lapsed pop-up clients to Kenkere'],
          'Who qualifies': ['Lapsed pop-up clients living near Kenkere.'],
          'You pay': ['8-class pack: ₹5.9k (15% off the ₹6.9k list price).'],
          'You get': ['• Kenkere 8-class pack at the standing 15%'],
          When: ['Every month.'],
          Rules: [
            '• Credited to both studios',
            '• The 15% is the standing lapsed-client perk, not an extra discount.',
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹0.1L counted (+₹0.7k vs the ₹0.1L stream plan) · 13 buyers'],
          'Rate of sale': ['Needs ≈1 8-class pack sales vs 1.2 a month today (all buyers).'],
          'Why it works': ['Proximity-matched routing in both directions.'],
          'What to watch': ['Kenkere conversions.'],
          'Offer auditor': ['20/25 (Effect 3, Creativity 4, Clarity 5, Practical 4, Economics 4). Useful.'],
          Model: [
            '180 in pool × 7.8% plan rate × 0.90 conversion factor = 12.6 buyers × ₹1.2k ticket (9% take the featured product) = ₹0.1L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'renewal',
        name: 'Pack + Passport',
        tagline: '10 classes here, 1 at Kenkere.',
        fields: {
          'Commercial job': ['Pack + cross-sell'],
          'Who qualifies': ['Pop-up regulars.'],
          'You pay': ['10-class pack: ₹8.5k (list price).'],
          'You get': ['• 10-class pack at list + 1 Kenkere class'],
          When: ['Every month.'],
          Rules: ['• Kenkere class within 30 days', "• Doesn't combine with any other campaign offer."],
          'Effective discount': [
            '16.7% effective = 0% cash + 16.7% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹0.4L counted (−₹0.1k vs the ₹0.4L stream plan) · 5 buyers'],
          'Rate of sale': ['Needs ≈3 10-class pack sales vs 2.3 a month today (all buyers).'],
          'Why it works': ['Introduces regulars to the flagship.'],
          'What to watch': ['Kenkere visits.'],
          'Offer auditor': ['21/25 (Effect 4, Creativity 4, Clarity 5, Practical 4, Economics 4). Good.'],
          Model: [
            '60 in pool × 8.3% plan rate × 1.00 conversion factor = 5.0 buyers × ₹8.6k ticket (60% take the featured product) = ₹0.4L modelled; 50% of uplift counted',
          ],
        },
      },
    ],
  },
  {
    studio: 'Pop-up',
    month: 7,
    theme: 'Monsoon I: Rain Check',
    hook: 'Monsoon · Amazing Race warm-up',
    job: 'Attendance and late cancels (Kenkere 21–30%); get people on a membership before the race starts on 1 Aug.',
    moment: 'Race registrations open 15 Jul. Monsoon Streak leaderboard by studio.',
    figures: {
      target: 190000,
      newClientPlan: 10000,
      renewalPlan: 50000,
      reactivationPlan: 10000,
      otherPlan: 120000,
      projected: 200000,
      leadsTrials: [146, 38],
      renewals: [60, 9],
      lapsed: [270, 22],
      newBuyers: 2,
    },
    offers: [
      {
        slot: 'newcomer',
        name: 'First Drop-in Counts',
        tagline: 'Your first class fee comes off your first pack.',
        fields: {
          'Commercial job': ['Drop-in → pack from visit one'],
          'Who qualifies': ['First-time pop-up clients.'],
          'You pay': ['8-class pack: ₹6.9k (list price).'],
          'You get': ['• First drop-in fee credited toward a C+C 8-class pack bought within 7 days'],
          When: ['Every month.'],
          Rules: [
            '• One credit per person',
            "• Replaces the standing 15% perk; the two don't combine.",
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '13.6% effective = 0% cash + 13.6% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹0.1L counted (+₹1.8k vs the ₹0.1L stream plan) · 2 buyers'],
          'Rate of sale': ['Needs ≈1 8-class pack sales vs 1.2 a month today (all buyers).'],
          'Why it works': ['Only 2.9% of first visits buy a pack, yet 63% buy something.'],
          'What to watch': ['Pack conversion of first visits.'],
          'Offer auditor': ['21/25 (Effect 4, Creativity 3, Clarity 5, Practical 5, Economics 4). Simple and right.'],
          Model: [
            '38 in pool × 5.3% plan rate × 1.20 conversion factor = 2.4 buyers × ₹5.3k ticket (60% take the featured product) = ₹0.1L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'lapsed',
        name: 'Missed You at the Pop-up',
        tagline: 'Your neighbourhood class is waiting.',
        fields: {
          'Commercial job': ['Reactivate pop-up clients'],
          'Who qualifies': ['Lapsed pop-up clients.'],
          'You pay': ['8-class pack: ₹5.9k (15% off the ₹6.9k list price).'],
          'You get': ['• 8-class pack at the standing 15% + a free return class'],
          When: ['Every month.'],
          Rules: [
            '• Standing perk',
            '• The 15% is the standing lapsed-client perk, not an extra discount.',
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹0.2L counted (+₹2.6k vs the ₹0.1L stream plan) · 22 buyers'],
          'Rate of sale': ['Needs ≈2 8-class pack sales vs 1.2 a month today (all buyers).'],
          'Why it works': ['Most pop-up reactivations are single credits.'],
          'What to watch': ['Pack share.'],
          'Offer auditor': ['20/25 (Effect 3, Creativity 3, Clarity 5, Practical 5, Economics 4). Plain.'],
          Model: [
            '270 in pool × 8.1% plan rate × 1.00 conversion factor = 22.0 buyers × ₹0.9k ticket (9% take the featured product) = ₹0.2L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'renewal',
        name: "Credit Where It's Due",
        tagline: 'Your last two drop-ins count toward a 10-pack.',
        fields: {
          'Commercial job': ['Convert regulars to packs'],
          'Who qualifies': ['Clients with 3+ drop-ins in 60 days.'],
          'You pay': ['10-class pack: ₹8.5k (list price).'],
          'You get': ['• Last 2 drop-ins credited toward a C+C 10-class pack'],
          When: ['Every month.'],
          Rules: ['• Credit within 60 days of the drop-ins', "• Doesn't combine with any other campaign offer."],
          'Effective discount': [
            '22.2% effective = 0% cash + 22.2% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹0.6L counted (+₹4.5k vs the ₹0.5L stream plan) · 9 buyers'],
          'Rate of sale': ['Needs ≈6 10-class pack sales vs 2.3 a month today (all buyers).'],
          'Why it works': ['186 regulars spent ~₹4,000 each on drop-ins, already half a pack.'],
          'What to watch': ['Effective ≈22%.'],
          'Offer auditor': ['23/25 (Effect 5, Creativity 4, Clarity 5, Practical 5, Economics 4). Best pop-up offer.'],
          Model: [
            '60 in pool × 15.0% plan rate × 1.00 conversion factor = 9.0 buyers × ₹6.7k ticket (70% take the featured product) = ₹0.6L modelled; 50% of uplift counted',
          ],
        },
      },
    ],
  },
  {
    studio: 'Pop-up',
    month: 8,
    theme: 'The Amazing Race 2.0',
    hook: 'Month-long individual race · Friendship Day (Sun 1 Aug)',
    job: 'Attendance-led renewals and upgrades; bring new clients in on a Rookie leaderboard; second seasonal peak in Mumbai.',
    moment:
      'The Amazing Race 2.0: every client races on their own against a studio leaderboard, 1–31 Aug. Rookie leaderboard for first-timers.',
    figures: {
      target: 180000,
      newClientPlan: 20000,
      renewalPlan: 40000,
      reactivationPlan: 10000,
      otherPlan: 110000,
      projected: 180000,
      leadsTrials: [161, 42],
      renewals: [60, 4],
      lapsed: [158, 13],
      newBuyers: 2,
    },
    offers: [
      {
        slot: 'newcomer',
        name: 'Saturday Squad',
        tagline: 'Saturdays: bring a friend free.',
        fields: {
          'Commercial job': ['Fill the strongest day'],
          'Who qualifies': ['First-timers on Saturdays.'],
          'You pay': ['4-class pack: ₹4k (15% off the ₹4.7k list price).'],
          'You get': ['• Bring a friend free', '• Both buy a 4-class pack at the standing 15%'],
          When: ['Every Saturday.'],
          Rules: [
            '• Friend new to P57',
            '• The 15% is the standing new-client perk, not an extra discount.',
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹0.2L counted (−₹0.1k vs the ₹0.2L stream plan) · 2 buyers'],
          'Rate of sale': ['Needs ≈2 4-class pack sales vs 0 a month today (all buyers).'],
          'Why it works': ['Saturday fill is 43% vs 13–20% on weekdays.'],
          'What to watch': ['Saturday attendance.'],
          'Offer auditor': ['21/25 (Effect 4, Creativity 4, Clarity 5, Practical 4, Economics 4). Good.'],
          Model: [
            '42 in pool × 4.8% plan rate × 1.20 conversion factor = 2.4 buyers × ₹6.7k ticket (70% take the featured product) = ₹0.2L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'lapsed',
        name: 'Neighbourhood Reunion',
        tagline: 'One Saturday a month, all the regulars.',
        fields: {
          'Commercial job': ['Hosted reactivation'],
          'Who qualifies': ['Lapsed pop-up clients.'],
          'You pay': ['4-class pack: ₹4k (15% off the ₹4.7k list price).'],
          'You get': ['• Monthly reunion class', '• At the door: 4-class pack at the standing 15%'],
          When: ['Monthly.'],
          Rules: [
            '• Named associate at the door',
            '• The 15% is the standing lapsed-client perk, not an extra discount.',
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹0.2L counted (+₹2.1k vs the ₹0.1L stream plan) · 14 buyers'],
          'Rate of sale': ['Needs ≈2 4-class pack sales vs 0 a month today (all buyers).'],
          'Why it works': ['Saturday is the only day with real fill.'],
          'What to watch': ['Door conversion.'],
          'Offer auditor': ['21/25 (Effect 4, Creativity 4, Clarity 5, Practical 4, Economics 4). Good.'],
          Model: [
            '158 in pool × 8.2% plan rate × 1.10 conversion factor = 14.3 buyers × ₹1.3k ticket (14% take the featured product) = ₹0.2L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'renewal',
        name: "Credit Where It's Due",
        tagline: 'Your last two drop-ins count toward a 10-pack.',
        fields: {
          'Commercial job': ['Convert regulars to packs'],
          'Who qualifies': ['Clients with 3+ drop-ins in 60 days.'],
          'You pay': ['10-class pack: ₹8.5k (list price).'],
          'You get': ['• Last 2 drop-ins credited toward a C+C 10-class pack'],
          When: ['Every month.'],
          Rules: ['• Credit within 60 days of the drop-ins', "• Doesn't combine with any other campaign offer."],
          'Effective discount': [
            '22.2% effective = 0% cash + 22.2% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹0.4L counted (−₹1k vs the ₹0.4L stream plan) · 4 buyers'],
          'Rate of sale': ['Needs ≈3 10-class pack sales vs 2.3 a month today (all buyers).'],
          'Why it works': ['186 regulars spent ~₹4,000 each on drop-ins, already half a pack.'],
          'What to watch': ['Effective ≈22%.'],
          'Offer auditor': ['23/25 (Effect 5, Creativity 4, Clarity 5, Practical 5, Economics 4). Best pop-up offer.'],
          Model: [
            '60 in pool × 6.7% plan rate × 1.00 conversion factor = 4.0 buyers × ₹9.4k ticket (70% take the featured product) = ₹0.4L modelled; 50% of uplift counted',
          ],
        },
      },
    ],
  },
  {
    studio: 'Pop-up',
    month: 9,
    theme: 'Monsoon III: The Comeback',
    hook: '57 days to Diwali (2 Sep → 28 Oct)',
    job: 'Reactivate before the festive season; carry race momentum into a festive countdown.',
    moment: '57 Days to Diwali countdown starts 2 Sep; Bandra reunion repeat.',
    figures: {
      target: 250000,
      projected: 250000,
      newClientPlan: 20000,
      renewalPlan: 70000,
      reactivationPlan: 10000,
      otherPlan: 150000,
      leadsTrials: [241, 63],
      renewals: [60, 10],
      lapsed: [203, 16],
      newBuyers: 3,
    },
    offers: [
      {
        slot: 'newcomer',
        name: 'Studio Passport',
        tagline: '3 stamps at the pop-ups, a free class at Kenkere.',
        fields: {
          'Commercial job': ['Feed Kenkere'],
          'Who qualifies': ['Pop-up clients.'],
          'You pay': ['10-class pack: ₹7.7k (10% off the ₹8.5k list price).'],
          'You get': [
            '• 3 classes across Copper + Cloves / Plash → 1 free Kenkere class',
            '• 10-class pack at 10% off',
          ],
          When: ['Every month.'],
          Rules: [
            '• Passport tracked in Momence',
            "• Replaces the standing 15% perk; the two don't combine.",
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '10.0% effective = 10% cash. Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹0.2L counted (+₹0.8k vs the ₹0.2L stream plan) · 3 buyers'],
          'Rate of sale': ['Needs ≈2 10-class pack sales vs 2.3 a month today (all buyers).'],
          'Why it works': ['8.8% of Kenkere leads are lost on proximity; the pop-ups are the bridge.'],
          'What to watch': ['Passport → Kenkere conversions.'],
          'Offer auditor': [
            '22/25 (Effect 4, Creativity 5, Clarity 5, Practical 4, Economics 4). Creative cross-sell.',
          ],
          Model: [
            '63 in pool × 4.8% plan rate × 1.00 conversion factor = 3.0 buyers × ₹6.1k ticket (50% take the featured product) = ₹0.2L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'lapsed',
        name: 'Move to Kenkere',
        tagline: 'Closer to Kenkere House? Come to the flagship.',
        fields: {
          'Commercial job': ['Route lapsed pop-up clients to Kenkere'],
          'Who qualifies': ['Lapsed pop-up clients living near Kenkere.'],
          'You pay': ['8-class pack: ₹5.9k (15% off the ₹6.9k list price).'],
          'You get': ['• Kenkere 8-class pack at the standing 15%'],
          When: ['Every month.'],
          Rules: [
            '• Credited to both studios',
            '• The 15% is the standing lapsed-client perk, not an extra discount.',
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹0.1L counted (+₹1.1k vs the ₹0.1L stream plan) · 14 buyers'],
          'Rate of sale': ['Needs ≈1 8-class pack sales vs 1.2 a month today (all buyers).'],
          'Why it works': ['Proximity-matched routing in both directions.'],
          'What to watch': ['Kenkere conversions.'],
          'Offer auditor': ['20/25 (Effect 3, Creativity 4, Clarity 5, Practical 4, Economics 4). Useful.'],
          Model: [
            '203 in pool × 7.9% plan rate × 0.90 conversion factor = 14.4 buyers × ₹1k ticket (9% take the featured product) = ₹0.1L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'renewal',
        name: 'Pack + Passport',
        tagline: '10 classes here, 1 at Kenkere.',
        fields: {
          'Commercial job': ['Pack + cross-sell'],
          'Who qualifies': ['Pop-up regulars.'],
          'You pay': ['10-class pack: ₹8.5k (list price).'],
          'You get': ['• 10-class pack at list + 1 Kenkere class'],
          When: ['Every month.'],
          Rules: ['• Kenkere class within 30 days', "• Doesn't combine with any other campaign offer."],
          'Effective discount': [
            '16.7% effective = 0% cash + 16.7% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹0.7L counted (+₹2.5k vs the ₹0.7L stream plan) · 10 buyers'],
          'Rate of sale': ['Needs ≈6 10-class pack sales vs 2.3 a month today (all buyers).'],
          'Why it works': ['Introduces regulars to the flagship.'],
          'What to watch': ['Kenkere visits.'],
          'Offer auditor': ['21/25 (Effect 4, Creativity 4, Clarity 5, Practical 4, Economics 4). Good.'],
          Model: [
            '60 in pool × 16.7% plan rate × 1.00 conversion factor = 10.0 buyers × ₹7.4k ticket (60% take the featured product) = ₹0.7L modelled; 50% of uplift counted',
          ],
        },
      },
    ],
  },
  {
    studio: 'Pop-up',
    month: 10,
    theme: 'Festival of Lights',
    hook: 'Diwali (Fri 29 Oct) · Dasara week in Bengaluru',
    job: "Gift-led revenue; protect Kenkere's Dasara trough; catch Kwality's late-October surge without codes.",
    moment: 'Gift cards on sale from 1 Oct; candle-lit evening classes in Diwali week; limited-run format #3.',
    figures: {
      target: 180000,
      newClientPlan: 10000,
      renewalPlan: 30000,
      reactivationPlan: 20000,
      otherPlan: 110000,
      projected: 190000,
      leadsTrials: [169, 44],
      renewals: [60, 5],
      lapsed: [396, 32],
      newBuyers: 2,
    },
    offers: [
      {
        slot: 'newcomer',
        name: 'First Drop-in Counts',
        tagline: 'Your first class fee comes off your first pack.',
        fields: {
          'Commercial job': ['Drop-in → pack from visit one'],
          'Who qualifies': ['First-time pop-up clients.'],
          'You pay': ['8-class pack: ₹6.9k (list price).'],
          'You get': ['• First drop-in fee credited toward a C+C 8-class pack bought within 7 days'],
          When: ['Every month.'],
          Rules: [
            '• One credit per person',
            "• Replaces the standing 15% perk; the two don't combine.",
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '13.6% effective = 0% cash + 13.6% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹0.1L counted (+₹1.6k vs the ₹0.1L stream plan) · 2 buyers'],
          'Rate of sale': ['Needs ≈1 8-class pack sales vs 1.2 a month today (all buyers).'],
          'Why it works': ['Only 2.9% of first visits buy a pack, yet 63% buy something.'],
          'What to watch': ['Pack conversion of first visits.'],
          'Offer auditor': ['21/25 (Effect 4, Creativity 3, Clarity 5, Practical 5, Economics 4). Simple and right.'],
          Model: [
            '44 in pool × 4.5% plan rate × 1.20 conversion factor = 2.4 buyers × ₹6k ticket (60% take the featured product) = ₹0.1L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'lapsed',
        name: 'Missed You at the Pop-up',
        tagline: 'Your neighbourhood class is waiting.',
        fields: {
          'Commercial job': ['Reactivate pop-up clients'],
          'Who qualifies': ['Lapsed pop-up clients.'],
          'You pay': ['8-class pack: ₹5.9k (15% off the ₹6.9k list price).'],
          'You get': ['• 8-class pack at the standing 15% + a free return class'],
          When: ['Every month.'],
          Rules: [
            '• Standing perk',
            '• The 15% is the standing lapsed-client perk, not an extra discount.',
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹0.3L counted (+₹3.7k vs the ₹0.2L stream plan) · 32 buyers'],
          'Rate of sale': ['Needs ≈3 8-class pack sales vs 1.2 a month today (all buyers).'],
          'Why it works': ['Most pop-up reactivations are single credits.'],
          'What to watch': ['Pack share.'],
          'Offer auditor': ['20/25 (Effect 3, Creativity 3, Clarity 5, Practical 5, Economics 4). Plain.'],
          Model: [
            '396 in pool × 8.1% plan rate × 1.00 conversion factor = 32.0 buyers × ₹1k ticket (9% take the featured product) = ₹0.3L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'renewal',
        name: "Credit Where It's Due",
        tagline: 'Your last two drop-ins count toward a 10-pack.',
        fields: {
          'Commercial job': ['Convert regulars to packs'],
          'Who qualifies': ['Clients with 3+ drop-ins in 60 days.'],
          'You pay': ['10-class pack: ₹8.5k (list price).'],
          'You get': ['• Last 2 drop-ins credited toward a C+C 10-class pack'],
          When: ['Every month.'],
          Rules: ['• Credit within 60 days of the drop-ins', "• Doesn't combine with any other campaign offer."],
          'Effective discount': [
            '22.2% effective = 0% cash + 22.2% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹0.4L counted (+₹1.4k vs the ₹0.3L stream plan) · 5 buyers'],
          'Rate of sale': ['Needs ≈4 10-class pack sales vs 2.3 a month today (all buyers).'],
          'Why it works': ['186 regulars spent ~₹4,000 each on drop-ins, already half a pack.'],
          'What to watch': ['Effective ≈22%.'],
          'Offer auditor': ['23/25 (Effect 5, Creativity 4, Clarity 5, Practical 5, Economics 4). Best pop-up offer.'],
          Model: [
            '60 in pool × 8.3% plan rate × 1.00 conversion factor = 5.0 buyers × ₹7.5k ticket (70% take the featured product) = ₹0.4L modelled; 50% of uplift counted',
          ],
        },
      },
    ],
  },
  {
    studio: 'Pop-up',
    month: 11,
    theme: 'Black Friday, Strong Monday',
    hook: 'Black Friday (Fri 26 Nov) → Cyber Monday (29 Nov)',
    job: 'Long commitments in the softest Mumbai month.',
    moment: 'Club Nine last seats (only those unsold in April).',
    figures: {
      target: 150000,
      projected: 150000,
      newClientPlan: 20000,
      renewalPlan: 30000,
      reactivationPlan: 0,
      otherPlan: 90000,
      leadsTrials: [60, 4],
      renewals: [68, 5],
      lapsed: [218, 57],
      newBuyers: 3,
    },
    offers: [
      {
        slot: 'newcomer',
        name: 'Saturday Squad',
        tagline: 'Saturdays: bring a friend free.',
        fields: {
          'Commercial job': ['Fill the strongest day'],
          'Who qualifies': ['First-timers on Saturdays.'],
          'You pay': ['4-class pack: ₹4k (15% off the ₹4.7k list price).'],
          'You get': ['• Bring a friend free', '• Both buy a 4-class pack at the standing 15%'],
          When: ['Every Saturday.'],
          Rules: [
            '• Friend new to P57',
            '• The 15% is the standing new-client perk, not an extra discount.',
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹0.2L counted (+₹0.3k vs the ₹0.2L stream plan) · 4 buyers'],
          'Rate of sale': ['Needs ≈3 4-class pack sales vs 0 a month today (all buyers).'],
          'Why it works': ['Saturday fill is 43% vs 13–20% on weekdays.'],
          'What to watch': ['Saturday attendance.'],
          'Offer auditor': ['21/25 (Effect 4, Creativity 4, Clarity 5, Practical 4, Economics 4). Good.'],
          Model: [
            '57 in pool × 5.3% plan rate × 1.20 conversion factor = 3.6 buyers × ₹5.8k ticket (70% take the featured product) = ₹0.2L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'lapsed',
        name: 'Neighbourhood Reunion',
        tagline: 'One Saturday a month, all the regulars.',
        fields: {
          'Commercial job': ['Hosted reactivation'],
          'Who qualifies': ['Lapsed pop-up clients.'],
          'You pay': ['4-class pack: ₹4k (15% off the ₹4.7k list price).'],
          'You get': ['• Monthly reunion class', '• At the door: 4-class pack at the standing 15%'],
          When: ['Monthly.'],
          Rules: [
            '• Named associate at the door',
            '• The 15% is the standing lapsed-client perk, not an extra discount.',
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹0.1L counted (+₹0.8k vs the ₹0.0L stream plan) · 6 buyers'],
          'Rate of sale': ['Needs ≈1 4-class pack sales vs 0 a month today (all buyers).'],
          'Why it works': ['Saturday is the only day with real fill.'],
          'What to watch': ['Door conversion.'],
          'Offer auditor': ['21/25 (Effect 4, Creativity 4, Clarity 5, Practical 4, Economics 4). Good.'],
          Model: [
            '68 in pool × 7.4% plan rate × 1.10 conversion factor = 5.5 buyers × ₹1.1k ticket (14% take the featured product) = ₹0.1L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'renewal',
        name: "Credit Where It's Due",
        tagline: 'Your last two drop-ins count toward a 10-pack.',
        fields: {
          'Commercial job': ['Convert regulars to packs'],
          'Who qualifies': ['Clients with 3+ drop-ins in 60 days.'],
          'You pay': ['10-class pack: ₹8.5k (list price).'],
          'You get': ['• Last 2 drop-ins credited toward a C+C 10-class pack'],
          When: ['Every month.'],
          Rules: ['• Credit within 60 days of the drop-ins', "• Doesn't combine with any other campaign offer."],
          'Effective discount': [
            '22.2% effective = 0% cash + 22.2% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹0.3L counted (+₹0.1k vs the ₹0.3L stream plan) · 4 buyers'],
          'Rate of sale': ['Needs ≈3 10-class pack sales vs 2.3 a month today (all buyers).'],
          'Why it works': ['186 regulars spent ~₹4,000 each on drop-ins, already half a pack.'],
          'What to watch': ['Effective ≈22%.'],
          'Offer auditor': ['23/25 (Effect 5, Creativity 4, Clarity 5, Practical 5, Economics 4). Best pop-up offer.'],
          Model: [
            '60 in pool × 6.7% plan rate × 1.00 conversion factor = 4.0 buyers × ₹8.4k ticket (70% take the featured product) = ₹0.3L modelled; 50% of uplift counted',
          ],
        },
      },
    ],
  },
  {
    studio: 'Pop-up',
    month: 12,
    theme: 'Wrapped',
    hook: 'Year-end · pre-sell January',
    job: "Pre-sell the February 2028 challenge and January's first week; renew on personal usage data.",
    moment:
      '"Your 2027 Wrapped": a personal year-in-review for every client, ending in a usage-based renewal recommendation.',
    figures: {
      target: 120000,
      projected: 120000,
      newClientPlan: 20000,
      renewalPlan: 20000,
      reactivationPlan: 10000,
      otherPlan: 70000,
      leadsTrials: [60, 1],
      renewals: [45, 4],
      lapsed: [146, 38],
      newBuyers: 2,
    },
    offers: [
      {
        slot: 'newcomer',
        name: 'Studio Passport',
        tagline: '3 stamps at the pop-ups, a free class at Kenkere.',
        fields: {
          'Commercial job': ['Feed Kenkere'],
          'Who qualifies': ['Pop-up clients.'],
          'You pay': ['10-class pack: ₹7.7k (10% off the ₹8.5k list price).'],
          'You get': [
            '• 3 classes across Copper + Cloves / Plash → 1 free Kenkere class',
            '• 10-class pack at 10% off',
          ],
          When: ['Every month.'],
          Rules: [
            '• Passport tracked in Momence',
            "• Replaces the standing 15% perk; the two don't combine.",
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '10.0% effective = 10% cash. Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹0.2L counted (−₹1.2k vs the ₹0.2L stream plan) · 2 buyers'],
          'Rate of sale': ['Needs ≈1 10-class pack sales vs 2.3 a month today (all buyers).'],
          'Why it works': ['8.8% of Kenkere leads are lost on proximity; the pop-ups are the bridge.'],
          'What to watch': ['Passport → Kenkere conversions.'],
          'Offer auditor': [
            '22/25 (Effect 4, Creativity 5, Clarity 5, Practical 4, Economics 4). Creative cross-sell.',
          ],
          Model: [
            '38 in pool × 5.3% plan rate × 1.00 conversion factor = 2.0 buyers × ₹11.2k ticket (50% take the featured product) = ₹0.2L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'lapsed',
        name: 'Move to Kenkere',
        tagline: 'Closer to Kenkere House? Come to the flagship.',
        fields: {
          'Commercial job': ['Route lapsed pop-up clients to Kenkere'],
          'Who qualifies': ['Lapsed pop-up clients living near Kenkere.'],
          'You pay': ['8-class pack: ₹5.9k (15% off the ₹6.9k list price).'],
          'You get': ['• Kenkere 8-class pack at the standing 15%'],
          When: ['Every month.'],
          Rules: [
            '• Credited to both studios',
            '• The 15% is the standing lapsed-client perk, not an extra discount.',
            "• Doesn't combine with any other campaign offer.",
          ],
          'Effective discount': [
            '15.0% effective = 15% cash. Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹0.1L counted (+₹0k vs the ₹0.1L stream plan) · 4 buyers'],
          'Rate of sale': ['Needs ≈0 8-class pack sales vs 1.2 a month today (all buyers).'],
          'Why it works': ['Proximity-matched routing in both directions.'],
          'What to watch': ['Kenkere conversions.'],
          'Offer auditor': ['20/25 (Effect 3, Creativity 4, Clarity 5, Practical 4, Economics 4). Useful.'],
          Model: [
            '45 in pool × 8.9% plan rate × 0.90 conversion factor = 3.6 buyers × ₹1.9k ticket (9% take the featured product) = ₹0.1L modelled; 50% of uplift counted',
          ],
        },
      },
      {
        slot: 'renewal',
        name: 'Pack + Passport',
        tagline: '10 classes here, 1 at Kenkere.',
        fields: {
          'Commercial job': ['Pack + cross-sell'],
          'Who qualifies': ['Pop-up regulars.'],
          'You pay': ['10-class pack: ₹8.5k (list price).'],
          'You get': ['• 10-class pack at list + 1 Kenkere class'],
          When: ['Every month.'],
          Rules: ['• Kenkere class within 30 days', "• Doesn't combine with any other campaign offer."],
          'Effective discount': [
            '16.7% effective = 0% cash + 16.7% in extras (classes, days, privates, retail). Guest passes, consults, freezes and early booking are valued at zero.',
          ],
          'Expected revenue': ['₹0.1L counted (−₹1k vs the ₹0.2L stream plan) · 1 buyers'],
          'Rate of sale': ['Needs ≈1 10-class pack sales vs 2.3 a month today (all buyers).'],
          'Why it works': ['Introduces regulars to the flagship.'],
          'What to watch': ['Kenkere visits.'],
          'Offer auditor': ['21/25 (Effect 4, Creativity 4, Clarity 5, Practical 4, Economics 4). Good.'],
          Model: [
            '60 in pool × 1.7% plan rate × 1.00 conversion factor = 1.0 buyers × ₹13.2k ticket (60% take the featured product) = ₹0.1L modelled; 50% of uplift counted',
          ],
        },
      },
    ],
  },
];

export const APPROVED_STUDIOS: ApprovedStudio[] = ['Kemps Corner', 'Bandra', 'Kenkere House', 'Pop-up'];

export function approvedEntry(studio: string, month: number): ApprovedEntry | undefined {
  return APPROVED_PLAN_2027.find(e => e.studio === studio && e.month === month);
}

/** The flagship (Kemps Corner) entry stands for the month where a screen is not studio-specific. */
export function approvedMonth(month: number): ApprovedEntry {
  return approvedEntry('Kemps Corner', Math.min(12, Math.max(1, month)))!;
}

export function approvedOffer(entry: ApprovedEntry | undefined, slot: ApprovedSlot): ApprovedOffer | undefined {
  return entry?.offers.find(o => o.slot === slot);
}

/** A field as one line of text. */
export function field(offer: ApprovedOffer | undefined, key: string, sep = ' '): string {
  return (offer?.fields[key] || [])
    .map(s => s.replace(/^•\s*/, ''))
    .join(sep)
    .trim();
}
