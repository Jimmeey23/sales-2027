/* A month's activations, read from that month's plan in the database: the theme and the
   "Activation:" line of its notes, its commercial objective, and the renewal offer it picked.
   Nothing here carries plan content of its own. */

export interface MonthActivation {
  challenge: [string, string];
  event: [string, string];
  partner: [string, string];
  retention: string;
  kpi: string;
}

type PlanLike = { theme?: string | null; objective?: string | null; notes?: string | null } | null | undefined;
type OfferLike = {
  name?: string | null;
  headline?: string | null;
  plan_slot?: string | null;
  slot?: string | null;
  success_metrics?: unknown;
};

const metricsOf = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string' && value.trim().startsWith('[')) {
    try {
      return (JSON.parse(value) as unknown[]).map(String);
    } catch {
      return [];
    }
  }
  return [];
};

export function activationFor(plan: PlanLike, offers: OfferLike[] = []): MonthActivation {
  const activation =
    String(plan?.notes || '')
      .split('\n')
      .map(line => line.trim())
      .find(line => /^activation:/i.test(line))
      ?.replace(/^activation:\s*/i, '') || '';
  const renewal = offers.find(o => /renewal|retention/i.test(String(o.plan_slot || o.slot || '')));
  return {
    challenge: [String(plan?.theme || ''), activation],
    event: ['', String(plan?.objective || '')],
    partner: ['', ''],
    retention: renewal ? [renewal.name, renewal.headline].filter(Boolean).join(': ') : '',
    kpi: offers
      .map(o => metricsOf(o.success_metrics)[0])
      .filter(Boolean)
      .join(' '),
  };
}

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
