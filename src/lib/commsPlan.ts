// The month's outreach, as a plan rather than a wish.
//
// One audience, one send: every offer written for the same people leaves in the same
// broadcast, the same email and the same print order, so six offers become a handful of
// outreaches instead of twenty-four. The rule is derived, never typed — change an offer's
// lead time, add a channel, or drop an offer, and the calendar moves with it.
//
// This used to live inside the collateral screen, which meant the export could not see it.
// It is the same builder the screen uses, so the calendar a studio manager reads on the page
// and the one in the plan document can never disagree.

export type CommsChannel = 'whatsapp' | 'email' | 'tent' | 'custom';

export interface CollateralCustomChannel {
  id: string;
  title: string;
  lead: number;
  items: string[];
  copyLabel: string;
  copyText: string;
}

export interface CommsSend {
  key: string;
  channel: CommsChannel;
  label: string;
  date: Date;
  audience: string | null;
  names: string[];
  ids: number[];
  note?: string;
  /** Send time, local — when the audience actually reads it. */
  time?: string;
  /** What this send has to achieve. */
  goal?: string;
  /** The draft message, ready to adapt. */
  message?: string;
  /** Where the send sits in the month's arc. */
  phase?: CommsPhase;
}

export type CommsPhase = 'prep' | 'launch' | 'nudge' | 'close';

export const PHASE_LABEL: Record<CommsPhase, { title: string; hint: string }> = {
  prep: { title: 'Prep & tease', hint: 'Print, templates and early-access sends before the month opens' },
  launch: { title: 'Launch week', hint: 'Offers go live — the biggest send of the month' },
  nudge: { title: 'Mid-month nudge', hint: 'Follow up with everyone who opened but has not bought' },
  close: { title: 'Close', hint: 'Deadline reminders and the last call' },
};

export function phaseOf(date: Date, year: number, month: number): CommsPhase {
  const start = new Date(year, month - 1, 1);
  if (date < start) return 'prep';
  const inMonth = date.getFullYear() === year && date.getMonth() === month - 1;
  const d = inMonth ? date.getDate() : 31;
  if (d <= 7) return 'launch';
  if (d <= 21) return 'nudge';
  return 'close';
}

/* The window a group of offers actually runs in: from the earliest start to the latest end,
   falling back to the calendar month. Sends are placed inside it, never before an offer opens
   or after it closes. */
const parseDay = (v: unknown) => {
  const m = String(v || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
};
export function offerWindow(offers: any[], year: number, month: number) {
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);
  const starts = offers.map(o => parseDay(o?.validity_start)).filter(Boolean) as Date[];
  const ends = offers.map(o => parseDay(o?.validity_end)).filter(Boolean) as Date[];
  const start = starts.length ? new Date(Math.min(...starts.map(d => d.getTime()))) : monthStart;
  const end = ends.length ? new Date(Math.max(...ends.map(d => d.getTime()))) : monthEnd;
  return end < start ? { start: monthStart, end: monthEnd } : { start, end };
}
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const clampDay = (d: Date, lo: Date, hi: Date) => (d < lo ? lo : d > hi ? hi : d);
/** Launch on the first live day, nudge and follow-up proportionally through the window, last call 2 days before close. */
export function sendDates(win: { start: Date; end: Date }, year: number, month: number) {
  const span = Math.max(0, Math.round((win.end.getTime() - win.start.getTime()) / 86400000));
  const launch = clampDay(new Date(year, month - 1, 1), win.start, win.end);
  const lastCall = clampDay(addDays(win.end, -2), launch, win.end);
  const at = (share: number, fixed: number) =>
    clampDay(span >= 20 ? new Date(year, month - 1, fixed) : addDays(win.start, Math.round(span * share)), launch, lastCall);
  return { launch, nudge: at(0.4, 12), follow: at(0.55, 16), lastCall };
}
const fmtLong = (d: Date) => `${d.getDate()} ${MONTH_NAMES_SHORT[d.getMonth()]}`;
const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const list = (names: string[]) =>
  names.length <= 1 ? names[0] || 'this month’s offer' : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;

/* The copy is a draft for the team to adapt — short, one ask, one deadline. */
function draft(
  kind: string,
  slot: string | null,
  names: string[],
  month: number,
  closes?: Date,
): { goal: string; message: string; time: string } {
  const m = MONTH_NAMES[month - 1];
  const lead = names[0] || 'this month’s offer';
  const offers = list(names);
  const who =
    slot === 'lapsed' ? 'we’ve missed you' : slot === 'renewal' ? 'thank you for training with us' : 'welcome to Physique 57';
  switch (kind) {
    case 'wa-launch':
      return {
        time: '10:30 am',
        goal: slot === 'renewal' ? 'Book renewal conversations before expiry' : 'Drive the first bookings of the month',
        message:
          slot === 'lapsed'
            ? `Hi {first_name}, ${who}. ${m} is the month to come back — ${lead} is open now. Reply YES and we’ll hold your first class.`
            : slot === 'renewal'
              ? `Hi {first_name}, ${who}. Your membership is up soon — renew in ${m} with ${lead}. Reply RENEW and the desk will set it up.`
              : `Hi {first_name}, ${who}! ${m} starts with ${lead}. Your first class is on us — reply BOOK to pick a time.`,
      };
    case 'wa-tease':
      return {
        time: '7:00 pm',
        goal:
          slot === 'renewal'
            ? 'Let members know renewal terms before anyone else'
            : slot === 'lapsed'
              ? 'Re-open the conversation before the offer goes live'
              : 'Build a waitlist before day 1',
        message: `Hi {first_name}, a first look at ${m}: ${lead}${names.length > 1 ? ` and ${names.length - 1} more` : ''} go live on the 1st. Reply EARLY and we’ll hold a spot for you before it opens.`,
      };
    case 'wa-nudge':
      return {
        time: '6:30 pm',
        goal: 'Convert people who opened the launch but have not booked',
        message: `Hi {first_name}, quick one — ${offers} ${names.length > 1 ? 'are' : 'is'} still open, and spots this week are filling. Want us to save you one?`,
      };
    case 'wa-last':
      return {
        time: '11:00 am',
        goal: 'Create urgency 48 hours before the offers close',
        message: `Last call, {first_name}: ${lead} closes on ${closes ? fmtLong(closes) : `${m}’s last day`}. Reply now and the desk will lock in your price.`,
      };
    case 'em-launch':
      return {
        time: '8:00 am',
        goal:
          slot === 'renewal'
            ? 'Show members exactly what renewing in this month gets them'
            : slot === 'lapsed'
              ? 'Give past clients one clear reason to come back'
              : 'Explain every new-client offer in full, with prices and terms',
        message: `Subject: ${m} at Physique 57 — ${lead}${names.length > 1 ? ` + ${names.length - 1} more` : ''}\n\nOne email, every offer: ${offers}. Each with what you get, what you pay and how long it runs. One button: book at the desk or online.`,
      };
    case 'em-follow':
      return {
        time: '8:00 am',
        goal: 'Social proof for anyone still deciding',
        message: `Subject: What ${m} looks like so far\n\nA member story, the class most booked this month, and a reminder that ${lead} runs until month end.`,
      };
    case 'tent':
      return {
        time: 'Order by 12 pm',
        goal: 'Cards on every desk and mirror by day 1',
        message: `Print order for ${names.length} card${names.length === 1 ? '' : 's'}: ${offers}. QR to the booking link on the back.`,
      };
    default:
      return { time: '', goal: '', message: '' };
  }
}

export interface CommsLeadDays {
  whatsapp: number;
  email: number;
  tent: number;
}

export interface CommsContext {
  year: number;
  month: number;
  hidden: string[];
  custom: CollateralCustomChannel[];
  leads: CommsLeadDays;
  reminder: Date;
  slots: string[];
}

export const COMMS_SLOTS = ['newcomer', 'lapsed', 'renewal'];

export const AUDIENCE: Record<string, string> = {
  newcomer: 'New to Physique 57',
  lapsed: 'Welcome back',
  renewal: 'Members only',
};

export const CHANNEL_NAME: Record<CommsChannel, string> = {
  whatsapp: 'WhatsApp',
  email: 'Email',
  tent: 'Tent card',
  custom: 'Channel',
};

const MONTH_ABBREVIATIONS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
export const fmtDay = (d: Date) => `${d.getDate()} ${MONTH_ABBREVIATIONS[d.getMonth()]}`;

/** Sends are scheduled by counting back from the first of the month. */
export const leadDate = (year: number, month: number, lead: number) => new Date(year, month - 1, 1 - lead);

function groupByDay(sends: CommsSend[]) {
  const groups: { key: string; date: Date; sends: CommsSend[] }[] = [];
  for (const send of sends) {
    const key = dayKey(send.date);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.sends.push(send);
    else groups.push({ key, date: send.date, sends: [send] });
  }
  return groups;
}

/* The cadence rules. A client hears from the studio at most four times a month, never twice
   inside five days, and every send carries every offer written for them — so six offers is
   still four messages, not twenty-four. */
export const CRM_MAX_TOUCHES = 4;
export const CRM_MIN_GAP_DAYS = 5;
export const CADENCE_RULES = [
  `At most ${CRM_MAX_TOUCHES} messages per client per month, per audience`,
  `Never two messages to the same audience within ${CRM_MIN_GAP_DAYS} days`,
  'One send per audience carries all of their offers — no per-offer blasts',
  'Reminders go only to people who have not bought yet',
  'Each touch has one job: preview, launch, reminder, last call',
];

/** The month as the team actually runs it: four touches per audience, offers combined. */
export function buildCommsSends(
  offers: any[],
  { year, month, hidden, custom, leads, slots }: CommsContext,
): { sends: CommsSend[]; groups: { key: string; date: Date; sends: CommsSend[] }[]; naive: number } {
  const sends: CommsSend[] = [];
  const bySlot = new Map<string, any[]>();
  for (const offer of offers) {
    const slot = slots.includes(offer?.plan_slot) ? offer.plan_slot : 'newcomer';
    bySlot.set(slot, [...(bySlot.get(slot) || []), offer]);
  }
  const due = (lead: number) => leadDate(year, month, lead);
  const audience = (slot: string) => AUDIENCE[slot] || slot;
  const wa = !hidden.includes('whatsapp');
  const em = !hidden.includes('email');

  for (const [slot, group] of bySlot) {
    const names = group.map(o => o.name).filter(Boolean);
    const ids = group.map(o => Number(o.id));
    const win = offerWindow(group, year, month);
    const dates = sendDates(win, year, month);
    const liveOn = (d: Date) =>
      group.filter(o => {
        const own = offerWindow([o], year, month);
        return d >= own.start && d <= own.end;
      });
    const pick = (d: Date) => {
      const live = liveOn(d);
      return { names: live.map(o => o.name).filter(Boolean), ids: live.map(o => Number(o.id)) };
    };
    // Offers that open after launch ride on the reminder: it moves to the latest such opening
    // (if that still leaves room before the last call), so there is no separate go-live blast.
    const lateStarts = group
      .map(o => offerWindow([o], year, month).start)
      .filter(d => d > dates.launch)
      .sort((a, b) => a.getTime() - b.getTime());
    let reminder = dates.nudge;
    const latest = lateStarts[lateStarts.length - 1];
    if (latest && latest > reminder && latest.getTime() <= dates.lastCall.getTime() - CRM_MIN_GAP_DAYS * 86400000) reminder = latest;

    const touches: CommsSend[] = [];
    // 1 · Preview, before the month: the one long-form message, by email (WhatsApp if email is off).
    if (em || wa)
      touches.push({
        key: `preview-${slot}`,
        channel: em ? 'email' : 'whatsapp',
        label: 'Preview',
        date: due(em ? leads.email : leads.whatsapp),
        audience: audience(slot),
        names,
        ids,
        note: names.length > 1 ? `one message · ${names.length} offers` : 'one message',
        ...draft(em ? 'em-launch' : 'wa-tease', slot, names, month),
        goal: 'Introduce every offer for this audience in one message, with dates and the booking link.',
      });
    // 2 · Launch: the day offers go live.
    if (wa || em)
      touches.push({
        key: `launch-${slot}`,
        channel: wa ? 'whatsapp' : 'email',
        label: 'Launch',
        date: dates.launch,
        audience: audience(slot),
        ...pick(dates.launch),
        note: 'one broadcast',
        ...draft(wa ? 'wa-launch' : 'em-launch', slot, pick(dates.launch).names, month),
        goal: 'Offers are live today: one clear ask, one link.',
      });
    // 3 · Reminder, mid-month, only to people who opened or enquired and have not bought.
    if (wa || em) {
      const live = pick(reminder);
      const opening = group.filter(o => offerWindow([o], year, month).start > dates.launch).map(o => o.name);
      touches.push({
        key: `reminder-${slot}`,
        channel: em && !wa ? 'email' : wa ? 'whatsapp' : 'email',
        label: 'Reminder',
        date: reminder,
        audience: audience(slot),
        ...live,
        note: 'non-buyers only',
        ...draft('wa-nudge', slot, live.names, month),
        goal: opening.length
          ? `Nudge non-buyers and announce what opens now: ${opening.join(', ')}.`
          : 'Nudge people who showed interest but have not bought. Skip buyers.',
      });
    }
    // 4 · Last call, two days before close, non-buyers only.
    if (wa || em) {
      const live = pick(dates.lastCall);
      touches.push({
        key: `last-${slot}`,
        channel: wa ? 'whatsapp' : 'email',
        label: 'Last call',
        date: dates.lastCall,
        audience: audience(slot),
        ...live,
        note: 'non-buyers only',
        ...draft('wa-last', slot, live.names, month, win.end),
        goal: 'Deadline: the offers close in 48 hours.',
      });
    }

    // Frequency cap: merge any touch that lands inside the minimum gap into the one before it.
    touches.sort((a, b) => a.date.getTime() - b.date.getTime());
    const kept: CommsSend[] = [];
    for (const t of touches) {
      if (!t.names.length) continue;
      const prev = kept[kept.length - 1];
      if (prev && (t.date.getTime() - prev.date.getTime()) / 86400000 < CRM_MIN_GAP_DAYS && t.label !== 'Last call') {
        prev.names = [...new Set([...prev.names, ...t.names])];
        prev.ids = [...new Set([...prev.ids, ...t.ids])];
        continue;
      }
      if (prev && (t.date.getTime() - prev.date.getTime()) / 86400000 < CRM_MIN_GAP_DAYS && t.label === 'Last call') {
        // The deadline matters more than the reminder: replace it.
        kept[kept.length - 1] = { ...t, names: [...new Set([...prev.names, ...t.names])], ids: [...new Set([...prev.ids, ...t.ids])] };
        continue;
      }
      kept.push(t);
    }
    sends.push(...kept.slice(0, CRM_MAX_TOUCHES));
  }

  // The print shop is one order, whatever the audience — staff work, not a client message.
  if (!hidden.includes('tent') && offers.length) {
    sends.push({
      key: 'te-print',
      channel: 'tent',
      label: 'Print run',
      date: due(leads.tent),
      audience: null,
      names: offers.map(o => o.name).filter(Boolean),
      ids: offers.map(o => Number(o.id)),
      note: `one print order · ${offers.length} card${offers.length === 1 ? '' : 's'}`,
      ...draft('tent', null, offers.map(o => o.name).filter(Boolean), month),
      goal: 'Every tent card for the month, in one print order. In studio by the 1st.',
    });
  }

  for (const channel of custom) {
    if (hidden.includes(channel.id)) continue;
    sends.push({
      key: channel.id,
      channel: 'custom',
      label: channel.title,
      date: due(channel.lead),
      audience: null,
      names: offers.map(o => o.name).filter(Boolean),
      ids: offers.map(o => Number(o.id)),
      note: offers.length > 1 ? `one send · ${offers.length} offers` : 'one send',
    });
  }

  sends.sort((a, b) => a.date.getTime() - b.date.getTime() || a.label.localeCompare(b.label));
  for (const send of sends) send.phase = phaseOf(send.date, year, month);

  const channels = (wa ? 1 : 0) + (em ? 1 : 0) + (hidden.includes('tent') ? 0 : 1);
  const naive = offers.length * (channels + (wa ? 3 : 0) + (em ? 1 : 0)) + custom.filter(c => !hidden.includes(c.id)).length;
  return { sends, groups: groupByDay(sends), naive: Math.max(naive, sends.length) };
}

/** The same month if every offer were left to fend for itself — the comparison the
    clubbed calendar is measured against. */
export function buildSingleSends(
  offers: any[],
  { year, month, hidden, custom, leads, reminder, slots }: CommsContext,
): { sends: CommsSend[]; groups: { key: string; date: Date; sends: CommsSend[] }[]; naive: number } {
  const sends: CommsSend[] = [];
  const due = (lead: number) => leadDate(year, month, lead);
  for (const offer of offers) {
    const slot = slots.includes(offer?.plan_slot) ? offer.plan_slot : 'newcomer';
    const names = [offer.name].filter(Boolean);
    const ids = [Number(offer.id)];
    const audience = AUDIENCE[slot] || slot;
    const dates = sendDates(offerWindow([offer], year, month), year, month);
    if (!hidden.includes('whatsapp')) {
      sends.push({
        key: `wa-${offer.id}`,
        channel: 'whatsapp',
        label: 'Launch broadcast',
        date: dates.launch,
        audience,
        names,
        ids,
        note: 'one broadcast',
      });
      sends.push({
        key: `wa-rem-${offer.id}`,
        channel: 'whatsapp',
        label: 'Last call',
        date: dates.lastCall,
        audience,
        names,
        ids,
        note: 'one reminder',
      });
      sends.push({ key: `wa-tease-${offer.id}`, channel: 'whatsapp', label: 'Early-access teaser', date: due(leads.whatsapp), audience, names, ids, note: 'one teaser' });
      sends.push({ key: `wa-nudge-${offer.id}`, channel: 'whatsapp', label: 'Mid-month nudge', date: dates.nudge, audience, names, ids, note: 'one nudge' });
    }
    if (!hidden.includes('email'))
      sends.push({
        key: `em-${offer.id}`,
        channel: 'email',
        label: 'Email campaign',
        date: due(leads.email),
        audience,
        names,
        ids,
        note: 'one email',
      });
    if (!hidden.includes('email'))
      sends.push({ key: `em-follow-${offer.id}`, channel: 'email', label: 'Follow-up email', date: dates.follow, audience, names, ids, note: 'one email' });
    if (!hidden.includes('tent'))
      sends.push({
        key: `te-${offer.id}`,
        channel: 'tent',
        label: 'Print run',
        date: due(leads.tent),
        audience,
        names,
        ids,
        note: 'one card',
      });
  }
  for (const channel of custom) {
    if (hidden.includes(channel.id)) continue;
    sends.push({
      key: `${channel.id}-single`,
      channel: 'custom',
      label: channel.title,
      date: due(channel.lead),
      audience: null,
      names: offers.map(o => o.name).filter(Boolean),
      ids: offers.map(o => Number(o.id)),
      note: 'one send',
    });
  }
  sends.sort((a, b) => a.date.getTime() - b.date.getTime() || a.label.localeCompare(b.label));
  return { sends, groups: groupByDay(sends), naive: sends.length };
}

/** Both readings of the same month, with the saving the clubbed calendar buys. */
export function commsPlan(offers: any[], context: CommsContext) {
  const clubbed = buildCommsSends(offers, context);
  const perOffer = buildSingleSends(offers, context);
  const saved = Math.max(perOffer.sends.length - clubbed.sends.length, 0);
  return { clubbed, perOffer, saved };
}
