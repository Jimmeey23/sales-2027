// What the studio actually makes this month, and the words that go on it.
//
// Every channel has its own job: a WhatsApp broadcast sent the week before the month, an
// email that carries the whole month's offers, a tent card that has to read standing up, and
// whatever extra channel the team has added. The copy is written from the offer — its name,
// its customer line, the audience it is for — and never quotes a price: a public creative
// says "a member saving", not "15% off".
//
// This module is the single source for those words. The collateral screen renders them; the
// exported plan document prints them, so the plan a studio manager prints and the screen they
// work from say exactly the same thing.

import { fmtDay, type CollateralCustomChannel } from './commsPlan.js';

export const SLOT_LABEL: Record<string, string> = {
  newcomer: 'New to Physique 57',
  lapsed: 'Welcome back',
  renewal: 'Members only',
};

export type CollateralSlot = 'newcomer' | 'lapsed' | 'renewal';

export const VOICE = {
  newcomer: {
    headlines: [
      'Your first shake starts here.',
      'Fifty-seven minutes. A whole new you.',
      'Lift. Tuck. Shake. Repeat.',
      'Strong looks good on you.',
    ],
    intro: (o: string, s: string) =>
      `Physique 57 is 57 minutes of small, precise movements that work every muscle to the point of the shake. ${o} is the easiest way to start at ${s}, with instructors who will meet you exactly where you are.`,
    subjects: (o: string, m: string) => [
      `Meet the shake: ${o}`,
      '57 minutes. Your new favourite hour.',
      `${m} starts at the barre`,
      'New to Physique 57? This one is for you',
    ],
    preheaders: [
      'Small moves, serious results — your first step is sorted.',
      'Book your spot before the month runs out.',
    ],
    cta: 'Book my first class',
    wa: 'Reply YES and we’ll save your spot at the barre.',
    closing: ['Fifty-seven minutes.', 'Everything else follows.'],
  },
  lapsed: {
    headlines: [
      'Your spot at the barre is waiting.',
      'Missed you at the barre.',
      'Back to the shake.',
      'Pick up where you left off.',
    ],
    intro: (o: string, s: string) =>
      `It’s been a while, and your body remembers more than you think. ${o} brings you back to ${s} with everything you need to find your rhythm again — no pressure, just the shake.`,
    subjects: (o: string, m: string) => [
      'Your spot at the barre is still yours',
      `We saved you a mat this ${m}`,
      `Come back to the shake: ${o}`,
      'It’s been a while. Let’s fix that.',
    ],
    preheaders: ['A comeback offer, made for returning members.', 'Same studio, same shake, a softer way back in.'],
    cta: 'Claim my comeback',
    wa: 'Reply YES and we’ll hold a mat for your first class back.',
    closing: ['Same energy. New goals.', 'Let’s make it happen.'],
  },
  renewal: {
    headlines: [
      'Keep the shake going.',
      'Stronger, every single month.',
      'Your results are just getting started.',
      'Thank you for showing up.',
    ],
    intro: (o: string, s: string) =>
      `You’ve put in the work, and it shows. ${o} keeps your momentum going at ${s} — the community, the instructors and the results you’ve earned.`,
    subjects: (o: string, m: string) => [
      `Keep the shake going: ${o}`,
      'Your results called. They want more.',
      `A thank-you for staying, this ${m}`,
      'Renew now, before your plan runs out',
    ],
    preheaders: ['A members-only thank-you for renewing early.', 'Lock in your next chapter at the barre.'],
    cta: 'Renew my membership',
    wa: 'Reply YES and we’ll renew you before your plan runs out.',
    closing: ['Thank you for showing up.', 'Now let’s go further.'],
  },
} as const;

export const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

/** Public creatives never quote prices or discount numbers. */
export const noPrice = (s: string) =>
  s
    .replace(/\s*\([^)]*(₹|%)[^)]*\)/g, '')
    .replace(/\s*(at|for|from|of|worth)?\s*₹\s?[\d.,]+\s?(k|l|lakh)?/gi, '')
    .replace(/\b\d+(\.\d+)?%\s*off\b/gi, 'a member saving')
    .replace(/\b\d+(\.\d+)?%\s*of\b/gi, 'part of')
    .replace(/\b(the )?standing \d+(\.\d+)?%/gi, 'the standing perk')
    .replace(/\s*\d+(\.\d+)?%/g, '')
    .replace(/\s+\b(at|for|from|of|worth)\s*(?=[+·,.;:—–-]|$)/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

export const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

/** The per-offer copy a team has rewritten by hand, if any. */
export interface CollateralOfferOverride {
  kicker?: string;
  headline?: string;
  altHead?: string;
  waLead?: number;
  waItems?: string[];
  waLaunchText?: string;
  waLaunchButton?: string;
  waReminderHeadline?: string;
  waReminderText?: string;
  waReminderButton?: string;
  waWindow?: string;
  emailLead?: number;
  emailItems?: string[];
  subjects?: string[];
  preheader?: string;
  intro?: string;
  emailCta?: string;
  tentLead?: number;
  tentItems?: string[];
  tentFront?: string;
  tentBack?: string;
}

export interface CollateralCopyInput {
  offer: any;
  year: number;
  month: number;
  studioName: string;
  theme?: string;
  overrides?: CollateralOfferOverride;
  /** How many offers share the month, for the quantities in the checklist. */
  offerCount?: number;
}

export interface CollateralCopy {
  slot: CollateralSlot;
  kicker: string;
  headline: string;
  altHead: string;
  intro: string;
  subjects: string[];
  preheader: string;
  emailCta: string;
  detail: string;
  closes: string;
  waLaunchText: string;
  waLaunchButton: string;
  waReminderHeadline: string;
  waReminderText: string;
  waReminderButton: string;
  waWindow: string;
  tentFront: string;
  tentBack: string;
  items: { whatsapp: string[]; email: string[]; tent: string[] };
  leads: { whatsapp: number; email: number; tent: number };
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** A tent card is read standing up: one whole line, cut at a sentence or a clause boundary. */
const cardLine = (value: string, max: number, ellipsis = false) => {
  const clean = String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (clean.length <= max) return clean;
  const head = clean.slice(0, max);
  const tail = ellipsis ? '…' : '.';
  const stop = Math.max(head.lastIndexOf('. '), head.lastIndexOf('; '), head.lastIndexOf(', '));
  if (stop > max * 0.45) return head.slice(0, stop).trim() + tail;
  return `${head.replace(/[\s,;:.]+\\S*$/, '')}${tail}`;
};

/** Every word the month puts in front of a client, for one offer. */
export function collateralCopy({
  offer,
  year,
  month,
  studioName,
  theme,
  overrides,
  offerCount,
}: CollateralCopyInput): CollateralCopy {
  const ov = overrides || {};
  const slot: CollateralSlot =
    offer?.plan_slot === 'lapsed' || offer?.plan_slot === 'renewal' ? offer.plan_slot : 'newcomer';
  const v = VOICE[slot];
  const monthName = MONTH_NAMES[Math.min(12, Math.max(1, month)) - 1];
  const end = new Date(year, month, 0);
  const n = Math.max(1, offerCount || 1);
  const seed = hash(`${offer?.id}${month}`);
  const tagline = String(offer?.customer_copy || '').trim();

  // The client-facing line makes the best headline — unless it simply repeats the offer's
  // name, which would print the same words twice on the card.
  const bare = (value: string) =>
    String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  const headlineIsName = !!tagline && bare(tagline) === bare(String(offer?.name || ''));
  const defaultHeadline =
    tagline && !headlineIsName && tagline.length <= 46 ? tagline : v.headlines[seed % v.headlines.length];
  const detail = noPrice(String(offer?.benefit || offer?.headline || ''));
  const offerName = clip(String(offer?.name || ''), 44);

  const closes = `Until ${fmtDay(end)}`;
  const defaultWaCopy = `Hi {first_name} ✨\n\n*${defaultHeadline}*\n*${offer?.name}*: ${clip(detail, 110)}\n\n${v.wa} Until ${fmtDay(end)}, ${studioName}.\n\n— Team Physique 57\nReply STOP to opt out`;

  // A tent card takes the shortest line the voice offers, so the print stays one
  // confident line the way the studio's own card does.
  const cardHeadline = [...v.headlines].sort((a, b) => a.length - b.length)[0];

  return {
    slot,
    kicker: ov.kicker ?? `${SLOT_LABEL[slot]} · ${monthName}`,
    headline: ov.headline ?? defaultHeadline,
    altHead: ov.altHead ?? v.headlines[(seed + 1) % v.headlines.length],
    intro: ov.intro ?? v.intro(String(offer?.name || ''), studioName),
    subjects: ov.subjects ?? v.subjects(offerName, monthName),
    preheader: ov.preheader ?? v.preheaders.join(' / '),
    emailCta: ov.emailCta ?? v.cta,
    detail,
    closes,
    waLaunchText: ov.waLaunchText ?? defaultWaCopy,
    waLaunchButton: ov.waLaunchButton ?? 'Book my spot',
    waReminderHeadline: ov.waReminderHeadline ?? `Ends ${fmtDay(end)}.`,
    waReminderText:
      ov.waReminderText ??
      `Hi {first_name} ⏳\n\n*Last call: ${offer?.name}* closes ${fmtDay(end)}.\n\n${v.wa}\n\n— Team Physique 57\nReply STOP to opt out`,
    waReminderButton: ov.waReminderButton ?? 'Claim before it ends',
    waWindow: ov.waWindow ?? `Tue–Thu, 9–11 am or 6–8 pm. Reminder 48h before ${fmtDay(end)}.`,
    tentFront: ov.tentFront ?? cardHeadline,
    tentBack: ov.tentBack ?? v.closing.join(' '),
    items: {
      whatsapp: ov.waItems ?? [
        `${n} broadcast${n > 1 ? 's' : ''} (one per offer) + 1 reminder 48h before close`,
        'A4 portrait creative (2480×3508 px, sent at 1240×1754), text ≤ 20% of image',
        'Message ≤ 450 characters, one link, opt-out line',
        'Business template submitted for approval 3 days ahead',
      ],
      email: ov.emailItems ?? [
        `1 launch email featuring all ${n} offer${n > 1 ? 's' : ''} + 1 last-chance email`,
        'A4 portrait creative (2480×3508 px), exported at 600 px wide for the template, dark-mode safe',
        'Subject ≤ 45 characters + preheader ≤ 90 characters',
        'Segmented sends: new leads, lapsed 61–365 days, renewals due',
      ],
      tent: ov.tentItems ?? [
        `${n} designs, double-sided A4 (210×297 mm) on 350 gsm matte, folded into an A-frame`,
        `Quantity: ${4 * n} per studio (reception, changing room, two on the floor)`,
        'QR to the Momence checkout with a tracking tag per offer',
        'Printed and placed by the 25th of the previous month',
      ],
    },
    leads: {
      whatsapp: ov.waLead ?? 10,
      email: ov.emailLead ?? 12,
      tent: ov.tentLead ?? 15,
    },
  };
}

/** One row per channel: what has to be made, when it is due, and the copy to use. */
export interface CollateralRow {
  key: string;
  title: string;
  lead: number;
  due: string;
  items: string[];
  copyLabel: string;
  copyText: string;
}

export function collateralChannels({
  copy,
  year,
  month,
  studioName,
  theme,
  hidden = [],
  custom = [],
  offerCount = 1,
}: {
  copy: CollateralCopy;
  year: number;
  month: number;
  studioName: string;
  theme?: string;
  hidden?: string[];
  custom?: CollateralCustomChannel[];
  offerCount?: number;
}): CollateralRow[] {
  const monthName = MONTH_NAMES[Math.min(12, Math.max(1, month)) - 1];
  const due = (lead: number) => fmtDay(new Date(year, month - 1, 1 - lead));
  const rows: CollateralRow[] = [];
  if (!hidden.includes('whatsapp'))
    rows.push({
      key: 'whatsapp',
      title: 'WhatsApp broadcast',
      lead: copy.leads.whatsapp,
      due: due(copy.leads.whatsapp),
      items: copy.items.whatsapp,
      copyLabel: 'Launch message',
      copyText: copy.waLaunchText,
    });
  if (!hidden.includes('email'))
    rows.push({
      key: 'email',
      title: 'Email campaign',
      lead: copy.leads.email,
      due: due(copy.leads.email),
      items: copy.items.email,
      copyLabel: `Subject: ${copy.subjects[0]}`,
      copyText: `${copy.preheader}\n\n${copy.intro}\n\n${copy.emailCta}`,
    });
  if (!hidden.includes('tent'))
    rows.push({
      key: 'tent',
      title: 'In-studio tent card',
      lead: copy.leads.tent,
      due: due(copy.leads.tent),
      items: copy.items.tent,
      copyLabel: 'Front',
      copyText: `${copy.tentFront}\n${copy.tentBack}`,
    });
  for (const channel of custom) {
    if (hidden.includes(channel.id)) continue;
    rows.push({
      key: channel.id,
      title: channel.title,
      lead: channel.lead,
      due: due(channel.lead),
      items: channel.items,
      copyLabel: channel.copyLabel,
      copyText: channel.copyText,
    });
  }
  // The theme is the campaign, so it belongs in the row set even when it is only a reminder.
  if (!rows.length && theme)
    rows.push({
      key: 'note',
      title: `${theme} · ${studioName}`,
      lead: 0,
      due: '—',
      items: [`${offerCount} offer${offerCount === 1 ? '' : 's'} on the plan`, 'No channels selected for this month'],
      copyLabel: 'Theme',
      copyText: theme,
    });
  return rows;
}
