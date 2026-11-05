/* The month explainer.

   One deterministic script per studio-month. `buildExplainer` reads the month's plan and
   returns a timeline of scenes; each scene carries the words the narrator speaks, the
   figure it is explaining, and how long it should hold the screen. The player animates
   the scenes and the words together, so what you hear and what you watch never disagree.

   The narration is written to a budget: a month is about ninety seconds and fits in one
   recording. That is a constraint worth having — it forces the script to say what the
   month is actually arguing, and it leaves the charts to carry the detail the voice does
   not read out.

   Nothing here touches React or the DOM, and nothing is random: the same month always
   produces the same script, which is what makes it testable, and recordable. */

import { MONTHS } from '../types';

export type SceneKind = 'open' | 'target' | 'streams' | 'funnel' | 'coverage' | 'offer' | 'plan' | 'close';

export interface ExplainerOffer {
  id: number | string;
  name: string;
  /** The plan slot: newcomer, renewal, lapsed, upsell. */
  slot: string;
  slotLabel: string;
  headline?: string | null;
  /** What the customer actually gets — the mechanic, in one or two sentences. */
  benefit?: string | null;
  rationale?: string | null;
  audience?: string | null;
  conditions?: string | null;
  kpi?: string | null;
  offerType?: string | null;
  ticket: number;
  buyers: number;
  revenue: number;
  discount: number | null;
  validity?: string | null;
}

export interface ExplainerInput {
  studioName: string;
  month: number;
  year: number;
  theme?: string | null;
  description?: string | null;
  target: number;
  lastYear: number;
  streams: { key: string; label: string; value: number }[];
  /** What the month expects at full price — the balance no offer carries. */
  standardTrade?: { revenue: number; shareOfMonth?: number; note?: string } | null;
  leads: number;
  trials: number;
  buyers: number;
  renewalsDue: number;
  renewalCoverage: number | null;
  offers: ExplainerOffer[];
  offerRevenue: number;
  plan: { label?: string; text: string }[];
}

export interface Scene {
  id: string;
  kind: SceneKind;
  /** The line above the scene's figure — what this scene is about. */
  kicker: string;
  /** The figure itself, in as few words as possible. */
  title: string;
  /** What the narrator says. Also the caption. */
  narration: string;
  /** How long the scene holds, in milliseconds. */
  duration: number;
  data: Record<string, any>;
}

export interface ExplainerScript {
  title: string;
  monthName: string;
  scenes: Scene[];
  /** Total runtime at 1× speed, in milliseconds. */
  duration: number;
}

/* ------------------------------------------------------------------ speaking numbers */

const trim = (v: number, digits: number) => String(Number(v.toFixed(digits)));

/** Money as a voice says it. A rupee sign and a lakh of digits read terribly aloud. */
export function spokenMoney(value: number | null | undefined): string {
  const v = Number(value) || 0;
  if (v <= 0) return 'nothing';
  if (v >= 1e7) return `${trim(v / 1e7, 2)} crore rupees`;
  if (v >= 1e5) return `${trim(v / 1e5, v >= 1e6 ? 1 : 2)} lakh rupees`;
  // Below a lakh, round nothing: a ticket of ₹17,203 is not "seventeen thousand".
  return `${Math.round(v).toLocaleString('en-IN')} rupees`;
}

/** Money as the screen shows it. */
export function displayMoney(value: number | null | undefined): string {
  const v = Number(value) || 0;
  if (v >= 1e7) return `₹${trim(v / 1e7, 2)} Cr`;
  if (v >= 1e5) return `₹${trim(v / 1e5, v >= 1e6 ? 1 : 2)}L`;
  return `₹${Math.round(v).toLocaleString('en-IN')}`;
}

const int = (v: number | null | undefined) => Math.round(Number(v) || 0).toLocaleString('en-IN');

/** Ends a fragment as a sentence, so pieces joined into one breath still read as sentences. */
const endStop = (text: string) => {
  const t = text.trim().replace(/[\s,;:—]+$/, '');
  if (!t) return '';
  return /[.?!]$/.test(t) ? t : `${t}.`;
};

/* Prose trimmed to something a narrator can say in one breath. Offer copy is written to
   be read, not spoken: it carries prices, dashes and bracketed asides that flatten a
   voice. Strip the scaffolding and stop at a sentence boundary. */
function speakable(text: string | null | undefined, max = 120): string {
  const clean = String(text || '')
    .replace(/→/g, ' to ')
    .replace(/≥/g, ' at least ')
    .replace(/≤/g, ' at most ')
    .replace(/≈/g, ' about ')
    // A rupee sign is not a word. Neither is an unfilled placeholder like {year}.
    .replace(/\{[^}]*\}/g, '')
    // …which can leave a preposition with nothing to point at ("You joined us in .").
    .replace(/\s+(?:in|on|at|for|of|to|by|from|and|or|the|a|an|is|are|was|were)\s*\./g, '.')
    .replace(/\s+(?:in|on|at|for|of|to|by|from|and|or|the|a|an)\s*,\s*/g, ', ')
    .replace(/₹\s*([\d,]+)/g, '$1 rupees')
    // An ISO date is never spoken, and an ops instruction is spoken as its headline.
    // Ranges first: stripping the dates alone would leave "Momence (… to …)" as "Momence to".
    .replace(/\d{4}-\d{2}-\d{2}\s*(?:to|–|—|-)\s*\d{4}-\d{2}-\d{2}/gi, '')
    .replace(/\d{4}-\d{2}-\d{2}/g, '')
    .replace(/\(\s*\)/g, ' ')
    .replace(/[•·]/g, ', ')
    .replace(/\s*[–—]\s*/g, ' — ')
    .replace(/[()[\]]/g, ' ')
    // …and stripping a bracket can leave a gap before the punctuation that followed it.
    .replace(/\s+([.,;:])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  // Callers add their own full stop, so a trailing one here would land as a doubled mark.
  const tidy = (value: string) => value.replace(/[\s,;:—.]+$/, '');
  if (clean.length <= max) return tidy(clean);
  // "Set up Monogamy Is Overrated in Momence: For members who've used one format…" —
  // a voice should say the first half and stop, not trail into the small print.
  const headline = clean.split(/:\s+/)[0];
  if (headline.length >= 24 && headline.length <= max) return tidy(headline);
  // Otherwise the first complete sentence, if one fits. "Women's Day isn't about flowers."
  // is a mechanic; "Women's Day isn't about flowers. It's about" is not.
  const firstSentence = clean.split(/(?<=\.)\s/)[0];
  if (firstSentence.length >= 20 && firstSentence.length <= max) return tidy(firstSentence);
  const cut = clean.slice(0, max);
  const stop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf(' — '), cut.lastIndexOf(', '));
  const clipped = stop > max * 0.5 ? cut.slice(0, stop) : cut;
  // Never leave a word half-said.
  const space = clipped.lastIndexOf(' ');
  let trimmed = space > max * 0.5 ? clipped.slice(0, space) : clipped;
  /* "It's about." is worse than "It's." A fragment must not end on a word that cannot end
     a sentence, or on a bare figure left over from a price — so strip them, repeatedly,
     because one hanging word can hide behind another. */
  const HANGING =
    /[\s,;:]+(?:and|or|but|the|a|an|to|of|in|on|for|with|its|it's|about|at|by|from|is|are|was|were|be|been|you'll|you|your|than|that|which|who|this|these|those|there|here|not|no|so|if|when|while|plus|per|more|most|only|just|already|up|out|off|over|under|before|after|then|also|\d[\d,.]*)$/i;
  for (let i = 0; i < 4 && HANGING.test(trimmed); i += 1) trimmed = trimmed.replace(HANGING, '');
  return tidy(trimmed);
}

/** Roughly how long this takes to say: 155 words a minute, plus a beat to land. */
function spokenMs(text: string, min = 2600, max = 12000): number {
  const words = String(text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.min(max, Math.max(min, Math.round((words / 155) * 60000) + 700));
}

/* ------------------------------------------------------------------- the script itself */

const SLOT_ORDER = ['newcomer', 'new_client', 'lapsed', 'reactivation', 'renewal', 'retention', 'upsell'];

/* Offer scenes are the longest part of a month and the part that varies most — a month
   carries between two and six. Four are narrated in full; the rest are named in the
   close, so a six-offer month still fits in one recording and no offer goes unmentioned. */
const MAX_NARRATED_OFFERS = 4;

export function buildExplainer(input: ExplainerInput): ExplainerScript {
  const monthName = MONTHS[input.month - 1] || `Month ${input.month}`;
  const scenes: Scene[] = [];
  const target = Number(input.target) || 0;
  const lastYear = Number(input.lastYear) || 0;
  const yoy = lastYear > 0 ? target / lastYear - 1 : null;

  const streams = (input.streams || [])
    .filter(s => Number(s.value) > 0)
    .sort((a, b) => Number(b.value) - Number(a.value));
  const streamTotal = streams.reduce((s, x) => s + Number(x.value), 0) || 1;

  const offers = [...(input.offers || [])].sort((a, b) => {
    const bySlot = SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot);
    return bySlot !== 0 ? bySlot : Number(b.revenue) - Number(a.revenue);
  });
  const offerRevenue = offers.reduce((s, o) => s + (Number(o.revenue) || 0), 0) || Number(input.offerRevenue) || 0;

  /* Every scene is assembled from pieces — a headline here, a figure there — and a voice
     reads them as one breath. Normalising here means a piece that arrives without its full
     stop still ends as a sentence instead of running into the next one. */
  const push = (
    kind: SceneKind,
    id: string,
    kicker: string,
    title: string,
    narration: string,
    data: Record<string, any>,
  ) => {
    const spoken = narration
      .split(/(?<=[.?!])\s+/)
      .map(part => part.trim())
      .filter(Boolean)
      .map(part => (/[.?!]$/.test(part) ? part : `${part}.`))
      .join(' ');
    scenes.push({ id, kind, kicker, title, narration: spoken, duration: spokenMs(spoken), data });
  };

  /* 1 · The title card. */
  {
    const theme = String(input.theme || '').trim();
    push(
      'open',
      'open',
      `${input.studioName} · ${input.year}`,
      monthName,
      endStop(`${monthName} ${input.year} at ${input.studioName}`) +
        (theme ? ` ${endStop(`The theme is ${theme}`)}` : ''),
      {
        month: input.month,
        monthName,
        year: input.year,
        studio: input.studioName,
        theme,
        description: speakable(input.description, 90),
        target,
        offers: offers.length,
      },
    );
  }

  /* 2 · The target, against the same month last year. */
  {
    const change =
      yoy === null
        ? 'There is no comparable month last year to measure it against.'
        : yoy >= 0
          ? `${Math.round(yoy * 100)} per cent above the ${spokenMoney(lastYear)} of last ${monthName}.`
          : `${Math.round(Math.abs(yoy) * 100)} per cent below the ${spokenMoney(lastYear)} of last ${monthName}, which the plan accepts deliberately.`;
    push(
      'target',
      'target',
      'What the month has to do',
      displayMoney(target),
      `The target is ${spokenMoney(target)} — ${change}`,
      { target, lastYear, yoy, delta: target - lastYear, monthName },
    );
  }

  /* 3 · Where the money comes from. */
  if (streams.length) {
    const lead = streams[0];
    const rest = streams.slice(1, 4).map(s => `${s.label.toLowerCase()} ${spokenMoney(s.value)}`);
    push(
      'streams',
      'streams',
      'Where it comes from',
      `${streams.length} streams`,
      endStop(
        `${lead.label} lead at ${spokenMoney(lead.value)}, ${Math.round((Number(lead.value) / streamTotal) * 100)} per cent`,
      ) + (rest.length ? ` ${endStop(`Then ${rest.join(', ')}`)}` : ''),
      {
        streams: streams.map(s => ({
          key: s.key,
          label: s.label,
          value: Number(s.value),
          share: (Number(s.value) / streamTotal) * 100,
        })),
        total: streamTotal,
        standard: Number(input.standardTrade?.revenue || 0),
        standardShare: input.standardTrade?.shareOfMonth ?? 0,
      },
    );
  }

  /* 4 · The funnel behind the new-client number. */
  if (input.leads > 0 || input.trials > 0 || input.buyers > 0) {
    const trialToBuyer = input.trials > 0 ? input.buyers / input.trials : null;
    const renewal =
      input.renewalsDue > 0
        ? ` ${endStop(`${int(input.renewalsDue)} memberships expire this month`)}${
            input.renewalCoverage !== null
              ? ` ${endStop(`${Math.round(input.renewalCoverage * 100)} per cent covered`)}`
              : ''
          }`
        : '';
    push(
      'funnel',
      'funnel',
      'Who has to walk in',
      `${int(input.buyers)} buyers`,
      endStop(
        `${int(input.leads)} leads, ${int(input.trials)} trials, ${int(input.buyers)} buyers` +
          (trialToBuyer !== null && trialToBuyer > 0
            ? `, and ${Math.round(trialToBuyer * 100)} per cent of trials convert`
            : ''),
      ) + renewal,
      {
        leads: input.leads,
        trials: input.trials,
        buyers: input.buyers,
        leadToTrial: input.leads > 0 ? input.trials / input.leads : null,
        trialToBuyer,
        renewalsDue: input.renewalsDue,
        renewalCoverage: input.renewalCoverage,
      },
    );
  }

  /* 5 · How much of the target the offers actually carry. */
  if (target > 0) {
    const share = offerRevenue / target;
    const standard = Number(input.standardTrade?.revenue) || Math.max(0, target - offerRevenue);
    push(
      'coverage',
      'coverage',
      'What the offers carry',
      `${Math.round(share * 100)}%`,
      offers.length
        ? endStop(
            `${offers.length} offers carry ${spokenMoney(offerRevenue)}, ${Math.round(share * 100)} per cent of the ${spokenMoney(target)} target`,
          ) + ` ${endStop(`The other ${spokenMoney(standard)} is expected at full price`)}`
        : endStop(
            `No offers are picked for ${monthName} yet, so the whole ${spokenMoney(target)} rests on full-price trade`,
          ),
      { target, offerRevenue, share, standard, offers: offers.length },
    );
  }

  /* 6 · Every offer, and how it works. */
  offers.forEach((offer, index) => {
    const ticket = Number(offer.ticket) || 0;
    const buyers = Number(offer.buyers) || 0;
    const revenue = Number(offer.revenue) || ticket * buyers;
    const narrated = index < MAX_NARRATED_OFFERS;
    const pieces = narrated
      ? [
          endStop(`${offer.slotLabel}: ${offer.name}`),
          endStop(speakable(offer.benefit || offer.headline, 70)),
          buyers > 0 && ticket > 0
            ? endStop(`${int(buyers)} buyers at ${spokenMoney(ticket)} — ${spokenMoney(revenue)}`)
            : revenue > 0
              ? endStop(`Planned to bring ${spokenMoney(revenue)}`)
              : '',
          offer.discount != null && offer.discount > 0 ? endStop(`${offer.discount} per cent off`) : '',
        ]
      : [];
    push(
      'offer',
      `offer-${offer.id}`,
      `Offer ${index + 1} of ${offers.length} · ${offer.slotLabel}`,
      offer.name,
      pieces.join(' '),
      {
        index,
        count: offers.length,
        narrated,
        name: offer.name,
        slot: offer.slot,
        slotLabel: offer.slotLabel,
        headline: offer.headline || '',
        benefit: offer.benefit || '',
        rationale: offer.rationale || '',
        audience: offer.audience || '',
        conditions: offer.conditions || '',
        kpi: offer.kpi || '',
        offerType: offer.offerType || '',
        ticket,
        buyers,
        revenue,
        discount: offer.discount,
        validity: offer.validity || '',
        share: offerRevenue > 0 ? revenue / offerRevenue : 0,
      },
    );
  });

  /* 7 · How the month runs. */
  const plan = (input.plan || []).filter(p => String(p.text || '').trim());
  if (plan.length) {
    const steps = plan.slice(0, 2).map((p, i) => endStop(`${i === 0 ? 'First' : 'Then'}, ${speakable(p.text, 72)}`));
    push('plan', 'plan', 'How the month runs', `${plan.length} moves`, steps.join(' '), {
      steps: plan.slice(0, 4).map(p => ({ label: p.label || '', text: p.text })),
    });
  }

  /* 8 · The close. */
  const overflow = offers.slice(MAX_NARRATED_OFFERS);
  const overflowRevenue = overflow.reduce((s, o) => s + (Number(o.revenue) || 0), 0);
  push(
    'close',
    'close',
    `${monthName} ${input.year}`,
    'That is the plan',
    (overflow.length
      ? endStop(
          `Also running: ${overflow.map(o => o.name).join(', ')} — ${spokenMoney(overflowRevenue)} between them`,
        ) + ' '
      : '') +
      endStop(
        `That is ${monthName} at ${input.studioName}: ${spokenMoney(target)} across ${offers.length} offers, and ${int(input.buyers)} buyers to find`,
      ),
    { target, offerRevenue, offers: offers.length, buyers: input.buyers, monthName, studio: input.studioName },
  );

  return {
    title: `${monthName} ${input.year} · ${input.studioName}`,
    monthName,
    scenes,
    duration: scenes.reduce((s, scene) => s + scene.duration, 0),
  };
}

/** Where each scene starts, so the scrubber can jump and the bar can fill. */
export function sceneOffsets(script: ExplainerScript): number[] {
  let at = 0;
  return script.scenes.map(scene => {
    const start = at;
    at += scene.duration;
    return start;
  });
}
