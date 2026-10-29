// 2027 activations from the final approved plan: each month's theme and moment, hook and commercial job,
// and the renewal offer that holds the book.
import { approvedMonth, approvedOffer, field } from './approvedPlan2027';

export interface MonthActivation {
  challenge: [string, string];
  event: [string, string];
  partner: [string, string];
  retention: string;
  kpi: string;
}

export const ACTIVATIONS_2027: MonthActivation[] = Array.from({ length: 12 }, (_, i) => {
  const e = approvedMonth(i + 1),
    renewal = approvedOffer(e, 'renewal');
  return {
    challenge: [e.theme, e.moment],
    event: [e.hook, e.job],
    // The final plan names no partnerships.
    partner: ['', ''],
    retention: renewal ? `${renewal.name}: ${renewal.tagline}` : '',
    kpi: e.offers
      .map(o => field(o, 'What to watch'))
      .filter(Boolean)
      .join(' '),
  };
});

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
