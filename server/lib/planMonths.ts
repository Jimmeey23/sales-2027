// A month, as the workspace reads it — cover, overview, execution, collateral and the CRM
// calendar — assembled for the export.
//
// The plan document used to stop at the offers, which is the smallest part of what a studio
// head actually needs in hand: the cover's argument, the brief, the week-by-week run, the
// assets to make and the dates they go out. None of that is authored twice: the narrative and
// the numbers come from the same modules the month workspace renders (monthNarrative,
// ACTIVATIONS_2027), and the collateral copy and CRM calendar from the shared builders the
// collateral screen uses.

import { ACTIVATIONS_2027 } from '../../src/data/activations.js';
import { isLegacyTheme, monthChapter, monthStory } from '../../src/data/monthNarrative.js';
import { collateralChannels, collateralCopy, type CollateralCopy } from '../../src/lib/collateralPlan.js';
import { commsPlan, COMMS_SLOTS, type CollateralCustomChannel } from '../../src/lib/commsPlan.js';

type AnyRow = Record<string, any>;

const parseJson = (value: any, fallback: any) => {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const NAMES = [
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
function nameOf(month: number) {
  return NAMES[Math.min(12, Math.max(1, month)) - 1];
}

/** The strategy field is written as labelled lines — "Moment: …", "Hook: …". */
export function strategyLines(strategy: string | null | undefined) {
  return String(strategy || '')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const labelled = line.match(/^([A-Za-z][A-Za-z ]{1,20}):\s*(.+)$/);
      return { label: labelled ? labelled[1] : '', text: labelled ? labelled[2] : line };
    });
}

export interface MonthSectionInput {
  year: number;
  month: number;
  studioName: string;
  /** The saved plan row: theme, objective, strategy, notes, actions, content, status. */
  plan: AnyRow | null;
  target: AnyRow | null;
  econ: AnyRow | null;
  offers: AnyRow[];
  revenues: {
    target: number;
    priorYear: number;
    streams: { newClient: number; renewal: number; reactivation: number };
  };
  funnel: {
    leads: number | null;
    trials: number | null;
    buyers: number | null;
    renewalsDue: number | null;
    renewalCoverage: number | null;
    leadToTrial: number | null;
    trialToMember: number | null;
  };
}

export interface MonthSections {
  cover: AnyRow;
  overview: AnyRow;
  execution: AnyRow;
  collateral: AnyRow;
  crm: AnyRow;
}

/** Everything about one month that is not the target row or the offer list. */
export function monthSections(input: MonthSectionInput): MonthSections {
  const { year, month, studioName, plan, offers, revenues, funnel } = input;
  const chapter = monthChapter(month);
  const content = parseJson(plan?.content, {});
  /* An imported plan owns its month: its theme, brief and risk print as filed. Only a row
     that has not been through an import is judged against the shipped plan's chapters. */
  const imported = Boolean(content?.planImport);
  const savedTheme = plan?.theme || input.target?.theme || null;
  // A saved theme the final plan does not give this month is a leftover, not a choice.
  const theme = imported
    ? savedTheme || chapter.theme
    : savedTheme && !isLegacyTheme(savedTheme, month)
      ? savedTheme
      : chapter.theme;
  const status = plan?.status || input.target?.status || 'draft';
  const planOffers: Record<string, string> = {};
  for (const offer of offers) {
    const slot = String(offer?.slot || '');
    if (slot && !planOffers[slot]) planOffers[slot] = String(offer?.name || '');
  }

  const story = monthStory(month, {
    studio: studioName,
    target: revenues.target,
    lastYear: revenues.priorYear,
    streams: revenues.streams,
    leads: funnel.leads ?? 0,
    trials: funnel.trials ?? 0,
    buyers: funnel.buyers ?? 0,
    renewalsDue: funnel.renewalsDue ?? 0,
    renewalCoverage: funnel.renewalCoverage ?? null,
    offers: offers.length,
    offerRevenue: offers.reduce((total, offer) => total + (Number(offer.expectedRevenue) || 0), 0),
    theme,
    objective: plan?.objective || chapter.objective,
    planOffers,
  });

  const carried = revenues.target
    ? Math.min(
        100,
        Math.round((offers.reduce((n, o) => n + (Number(o.expectedRevenue) || 0), 0) / revenues.target) * 100),
      )
    : 0;

  /* ── Cover: the argument the month opens with ─────────────────────────────── */
  const cover = {
    kicker: String(content?.kicker || '').trim() || chapter.kicker,
    theme,
    moment: chapter.moment,
    objective: plan?.objective || chapter.objective,
    brief: imported ? String(plan?.notes || plan?.objective || chapter.brief) : chapter.brief,
    risk: imported ? String(content?.ai?.risks?.[0] || '') || chapter.risk : chapter.risk,
    // "The move" names the offers the month actually carries, not the ones the chapter was
    // written against: a month that has swapped an offer must not claim the old one in print.
    signature: offers.length ? offers.map(offer => String(offer.name)).join(' · ') : chapter.signature,
    status,
    target: revenues.target,
    priorYear: revenues.priorYear,
    growthPercent: revenues.priorYear
      ? Number((((revenues.target - revenues.priorYear) / revenues.priorYear) * 100).toFixed(1))
      : null,
    carriedPercent: carried,
    streams: revenues.streams,
    offerCount: offers.length,
  };

  /* ── Overview: the brief, then who has to walk in and who has to stay ─────── */
  const overview = {
    brief: story.split,
    leads: story.leads,
    renewals: story.renewals,
    target: revenues.target,
    streams: revenues.streams,
    funnel: funnel,
  };

  /* ── Execution: the week-by-week run and the activations ──────────────────── */
  const actions = (Array.isArray(plan?.actions) ? plan.actions : [])
    .filter((action: AnyRow) => action && (action.text || action.detail))
    .map((action: AnyRow) => ({
      week: Number(action.week) || null,
      owner: String(action.owner || ''),
      text: String(action.text || action.detail || ''),
      done: Boolean(action.done),
    }));
  const byWeek = [1, 2, 3, 4]
    .map(week => ({ week, actions: actions.filter((action: AnyRow) => action.week === week) }))
    .filter(group => group.actions.length);
  // Activations print as the plan's own words, with any saved overrides winning.
  const activationEdits = parseJson(content?.activations, {});
  const base = ACTIVATIONS_2027[Math.min(12, Math.max(1, month)) - 1] || null;
  const activation = (key: string, title: string, text: string) => {
    const saved = activationEdits?.[key];
    return { title: String(saved?.title || title), text: String(saved?.text || text) };
  };
  const candidates = base
    ? [
        activation('challenge', base.challenge[0], base.challenge[1]),
        activation('event', base.event[0], base.event[1]),
        activation('partner', base.partner[0], base.partner[1]),
        { title: 'Retention', text: activation('retention', 'Retention', base.retention).text },
      ]
    : [];
  // The approved plan files the month's moment under "challenge" and its commercial job under
  // "event". Both already print as the cover, so reprinting them here would say the same thing
  // twice on one page — only what is genuinely an extra activation survives.
  const coverText = new Set(
    [chapter.moment, chapter.brief, chapter.risk, chapter.signature, plan?.objective || chapter.objective]
      .filter(Boolean)
      .map(text => String(text).trim()),
  );
  const seen = new Set<string>();
  const activations = candidates
    .filter(item => item.title || item.text)
    .filter(item => {
      const text = String(item.text || '').trim();
      if (!text) return true;
      if (coverText.has(text) || seen.has(text)) return false;
      seen.add(text);
      return true;
    });

  const execution = {
    weeks: byWeek,
    actions,
    strategy: strategyLines(plan?.strategy),
    activations,
    kpi: base?.kpi || '',
    notes: plan?.notes || null,
  };

  /* ── Collateral: what has to be made, when it is due, and the copy ────────── */
  const collateralState = parseJson(content?.collaterals, {});
  const hidden: string[] = Array.isArray(collateralState?.hiddenChannels) ? collateralState.hiddenChannels : [];
  const custom: CollateralCustomChannel[] = Array.isArray(collateralState?.customChannels)
    ? collateralState.customChannels
    : [];
  const overridesFor = (offer: AnyRow) => collateralState?.byOffer?.[String(offer.id)] || {};

  const pieces = offers.map(offer => {
    const copy: CollateralCopy = collateralCopy({
      offer,
      year,
      month,
      studioName,
      theme,
      overrides: overridesFor(offer),
      offerCount: offers.length,
    });
    return {
      offer: offer.name,
      slot: offer.slot || null,
      description: offer.description || null,
      copy,
      channels: collateralChannels({
        copy,
        year,
        month,
        studioName,
        theme,
        hidden,
        custom,
        offerCount: offers.length,
      }),
    };
  });
  // The production checklist is a property of the channel, not of the offer: printing it under
  // every offer would repeat the same five lines three times on the page.
  const channelSpec: Array<{ key: string; title: string; lead: any; due: string; items: string[] }> = [];
  for (const piece of pieces) {
    for (const channel of piece.channels) {
      if (channelSpec.some(entry => entry.key === channel.key)) continue;
      channelSpec.push({
        key: channel.key,
        title: channel.title,
        lead: channel.lead,
        due: channel.due,
        items: channel.items,
      });
    }
  }

  const collateral = {
    channelSpec,
    title: collateralState?.title || 'Marketing & collaterals needed',
    subtitle:
      collateralState?.subtitle ||
      'Everything the studio team needs to launch this month’s offers, with the copy to use.',
    hiddenChannels: hidden,
    pieces,
  };

  /* ── CRM: the sends, on the day they leave ───────────────────────────────── */
  const leads = {
    whatsapp: pieces[0]?.copy.leads.whatsapp ?? 10,
    email: pieces[0]?.copy.leads.email ?? 12,
    tent: pieces[0]?.copy.leads.tent ?? 15,
  };
  const reminder = new Date(year, month, -1);
  const comms = commsPlan(
    offers.map(offer => ({ id: offer.id, name: offer.name, plan_slot: offer.slot })),
    { year, month, hidden, custom, leads, reminder, slots: COMMS_SLOTS },
  );
  const iso = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const crm = {
    rule: 'One audience, one send.',
    sends: comms.clubbed.sends.map(send => ({
      date: iso(send.date),
      day: `${send.date.getDate()} ${NAMES[send.date.getMonth()].slice(0, 3)}`,
      channel: send.channel,
      label: send.label,
      audience: send.audience,
      offers: send.names,
      note: send.note || null,
    })),
    sendsCount: comms.clubbed.sends.length,
    ifSentPerOffer: comms.perOffer.sends.length,
    saved: comms.saved,
    leads,
  };

  return { cover, overview, execution, collateral, crm };
}

/** The month's name, for callers that need it without a chapter. */
export const monthLabel = (month: number) => nameOf(month);
