// 2027 activation library: one challenge, one community activation and one partnership per month,
// tuned to each month's commercial objective. Planning suggestions — adapt before launch.
export interface MonthActivation {
  challenge: [string, string];
  event: [string, string];
  partner: [string, string];
  retention: string;
  kpi: string;
}

export const ACTIVATIONS_2027: MonthActivation[] = [
  {
    challenge: ['Reset 27 Challenge', '20 classes in 27 days, live leaderboard on WhatsApp; finishers earn 2 classes.'],
    event: ['New Year Open House', 'Free taster classes + body-assessment desk; book-on-the-spot trial slots.'],
    partner: ['Clean-eating café collab', 'Partner café gives a reset bowl to anyone showing a January booking.'],
    retention: 'Week-1 welcome call for every new joiner; 10-day attendance check.',
    kpi: 'Trial → commitment %, visits per new member',
  },
  {
    challenge: ['Bestie Streak', 'Book 8 classes with a friend in February; both get a free class.'],
    event: ['Galentine’s Barre & Brunch', 'Members bring two friends to a themed class + brunch.'],
    partner: ['Jewellery / florist pop-up', 'Valentine gifting table in studio; members shop, guests sign up.'],
    retention: 'Referral thank-you message + guest follow-up inside 72 hours.',
    kpi: 'Referred guests, guest → buyer %',
  },
  {
    challenge: ['Women Who Lead Masterclass', 'IWD panel + class; Golden Ticket pre-sale for April.'],
    event: ['Q1 Progress Check-ins', 'Trainer-led 10-minute goal resets for every active member.'],
    partner: ['Women-founder brand collab', 'Co-hosted IWD class with a women-led brand; shared audience.'],
    retention: 'T−14 renewal calls for March expiries; usage-based package recommendation.',
    kpi: 'Q1 renewal rate, Golden Tickets sold',
  },
  {
    challenge: ['Anniversary 57 Challenge', '57 classes or 57 days of consistency; anniversary merch for finishers.'],
    event: [
      'Anniversary Week Celebration',
      'Signature class, member awards, conversion desk with anniversary pricing.',
    ],
    partner: ['Premium wellness hamper partners', 'Anniversary hampers from partner brands for top buyers.'],
    retention: 'Anniversary loyalty tier unlocked for 12+ month members.',
    kpi: 'Anniversary revenue, ASP held vs 2026',
  },
  {
    challenge: ['Build Your Base 4-week series', 'Foundations series for the April cohort: technique, core, form.'],
    event: ['Beginner Foundations Workshop', '90-minute technique clinic for new and returning clients.'],
    partner: ['Athleisure brand try-on day', 'Partner brand fits members; discount code tied to class attendance.'],
    retention: 'April-cohort 30-day check-in and next-pack recommendation.',
    kpi: 'April cohort 60-day retention',
  },
  {
    challenge: ['Out-of-Office Streak', 'Travel-proof plan: virtual + in-studio classes count toward a streak.'],
    event: ['Midyear Member Challenge finale', 'Celebration class + progress photo wall.'],
    partner: ['Travel / staycation partner', 'Monthly draw for members who keep a 3-visits-a-week streak.'],
    retention: 'Freeze-instead-of-cancel prompt for travelling members.',
    kpi: 'Freezes vs cancellations, visits per member',
  },
  {
    challenge: ['Rain Check Consistency', 'Show up in the monsoon: 12 classes in July unlocks bonus validity.'],
    event: ['Monsoon Cosy Classes', 'Candle-lit stretch & barre evenings; bring-a-friend nights.'],
    partner: ['Umbrella / cab partner', 'Rain-day ride credits for early-morning bookings.'],
    retention: 'Late-cancel nudges and waitlist release to protect attendance.',
    kpi: 'Check-in rate, late-cancel rate',
  },
  {
    challenge: ['Friends Who Squat Together', 'Referral ladder: 1, 3, 5 friends unlock rising rewards.'],
    event: ['Bring-a-Friend Week', 'Every member gets two guest passes; hosted Saturday social.'],
    partner: ['Corporate wellness pilot', 'Lunch-hour classes for one anchor office; team pack pricing.'],
    retention: 'Upgrade conversations: 8+ visits/month → 3-month or longer.',
    kpi: 'Referrals, upgrades to 3M+',
  },
  {
    challenge: ['The Return Policy', '“Come back for 3” — lapsed members complete 3 classes in 14 days.'],
    event: ['Comeback Class Saturdays', 'Free comeback class for 61–365-day lapsed members.'],
    partner: ['Festive-wear stylist collab', 'Pre-festive styling + fitness edit content with a local label.'],
    retention: 'Lapsed sequence: day-61 perk + personal call for ≥₹50k lifetime clients.',
    kpi: 'Reactivated members, comeback → purchase %',
  },
  {
    challenge: ['Festive Fit 21', '21 classes before Diwali; finishers get a gift card to share.'],
    event: ['Gift a Shake Diwali drive', 'Giftable packs and gift cards at the front desk and online.'],
    partner: ['Gifting / mithai partner', 'Gift-card bundles with a premium festive partner.'],
    retention: 'Member appreciation classes; thank-you notes for long-tenure members.',
    kpi: 'Gift cards sold, festive revenue',
  },
  {
    challenge: ['Strong Monday Commitment', 'Lock in 6–12 month plans; commitment wall in studio.'],
    event: ['Member Appreciation Week', 'Free guest pass + signature class for all active members.'],
    partner: ['Black Friday brand tie-ups', 'Partner perks for longer commitments instead of deeper discounts.'],
    retention: 'Pre-renew Q1 expiries with continuity pricing.',
    kpi: 'Long-commitment share, discount exposure',
  },
  {
    challenge: ['12 Days of Shake', 'One themed class a day for 12 days; daily prize draw.'],
    event: ['Year-End Celebration Class', 'Awards, recap reel and January pre-sale desk.'],
    partner: ['New Year gifting partner', 'Pre-solution gift bundles: pack + partner hamper.'],
    retention: 'December renewals closed by the 20th; January pre-sale to active members.',
    kpi: 'January pre-sales, December renewals',
  },
];

export const CHANNEL_LABELS: Record<string, string> = {
  meta_lead: 'Meta · lead gen',
  meta_retarget: 'Meta · retargeting',
  google_search: 'Google · search',
  meta_reactivation: 'Meta · lapsed audience',
};
// Share of the monthly paid budget per ad set (planning default).
export const AD_SPLIT: Array<[string, number, string, string]> = [
  ['meta_lead', 0.5, 'Women 24–45 within 5 km, fitness & wellness interests', 'Lead form → trial booking'],
  ['meta_retarget', 0.2, 'Website visitors, IG engagers, video viewers (30 days)', 'Book a trial / claim offer'],
  ['google_search', 0.2, '“barre classes near me”, “pilates <area>”, brand terms', 'Landing page → trial'],
  ['meta_reactivation', 0.1, 'Uploaded 61–365-day lapsed list (custom audience)', 'Comeback offer'],
];
export const CPL_BY_CITY: Record<string, number> = { Mumbai: 550, Bengaluru: 420 };

export function collateralFor(offer: string, activation: MonthActivation) {
  return [
    {
      asset: `“${offer}” hero creative`,
      formats: 'IG feed 4:5, Story 9:16, Reel 15–30s',
      channel: 'Instagram / Meta ads',
      due: 'T−14',
    },
    {
      asset: `${offer} WhatsApp broadcast`,
      formats: 'Image + 3-line copy + booking link',
      channel: 'WhatsApp (members + leads)',
      due: 'T−7',
    },
    { asset: `${offer} email`, formats: 'Header banner + body copy', channel: 'Email (members, lapsed)', due: 'T−7' },
    {
      asset: `${activation.challenge[0]} kit`,
      formats: 'Leaderboard poster, tracker card, Story template',
      channel: 'In-studio + Stories',
      due: 'T−10',
    },
    {
      asset: `${activation.event[0]} invite`,
      formats: 'Event poster, RSVP Story, reminder message',
      channel: 'Instagram, WhatsApp, front desk',
      due: 'T−10',
    },
    {
      asset: 'Landing page / website banner',
      formats: 'Desktop + mobile banner, offer T&Cs',
      channel: 'Website, Momence',
      due: 'T−7',
    },
    {
      asset: 'Front-desk & studio signage',
      formats: 'A3 poster, counter card, mirror decal',
      channel: 'In-studio',
      due: 'T−5',
    },
    {
      asset: 'Trainer talking points',
      formats: 'One-page script + objection handling',
      channel: 'Team briefing',
      due: 'T−3',
    },
  ];
}
