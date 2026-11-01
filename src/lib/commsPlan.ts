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

/** The month as the team actually runs it: one send per audience per channel. */
export function buildCommsSends(
  offers: any[],
  { year, month, hidden, custom, leads, reminder, slots }: CommsContext,
): { sends: CommsSend[]; groups: { key: string; date: Date; sends: CommsSend[] }[]; naive: number } {
  const sends: CommsSend[] = [];
  const bySlot = new Map<string, any[]>();
  for (const offer of offers) {
    const slot = slots.includes(offer?.plan_slot) ? offer.plan_slot : 'newcomer';
    bySlot.set(slot, [...(bySlot.get(slot) || []), offer]);
  }
  const due = (lead: number) => leadDate(year, month, lead);
  const audience = (slot: string) => AUDIENCE[slot] || slot;

  for (const [slot, group] of bySlot) {
    const names = group.map(o => o.name).filter(Boolean);
    const ids = group.map(o => Number(o.id));
    // The earliest lead in the group wins: the send goes out when the first of these
    // offers needs it, and the copy carries the rest.
    if (!hidden.includes('whatsapp')) {
      sends.push({
        key: `wa-${slot}`,
        channel: 'whatsapp',
        label: 'Launch broadcast',
        date: due(Math.min(...group.map(o => leads.whatsapp))),
        audience: audience(slot),
        names,
        ids,
        note: names.length > 1 ? `one broadcast · ${names.length} offers` : 'one broadcast',
      });
      sends.push({
        key: `wa-rem-${slot}`,
        channel: 'whatsapp',
        label: 'Last call',
        date: reminder,
        audience: audience(slot),
        names,
        ids,
        note: names.length > 1 ? `one reminder · ${names.length} offers` : 'one reminder',
      });
    }
    if (!hidden.includes('email')) {
      sends.push({
        key: `em-${slot}`,
        channel: 'email',
        label: 'Email campaign',
        date: due(Math.min(...group.map(o => leads.email))),
        audience: audience(slot),
        names,
        ids,
        note: names.length > 1 ? `one email · ${names.length} offers` : 'one email',
      });
    }
  }

  // The print shop is one order, whatever the audience: every card in the month goes to
  // the desk together, so the calendar shows a single print run rather than three.
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
    });
  }

  // A team-added channel has no audience split, so it carries the month in one go.
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

  // What the month would cost without the rule: every offer its own broadcast, its own
  // email, its own card and its own reminder.
  const wa = hidden.includes('whatsapp') ? 0 : 1;
  const channels = wa + (hidden.includes('email') ? 0 : 1) + (hidden.includes('tent') ? 0 : 1);
  const naive = offers.length * (channels + wa) + custom.filter(c => !hidden.includes(c.id)).length;
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
    if (!hidden.includes('whatsapp')) {
      sends.push({
        key: `wa-${offer.id}`,
        channel: 'whatsapp',
        label: 'Launch broadcast',
        date: due(leads.whatsapp),
        audience,
        names,
        ids,
        note: 'one broadcast',
      });
      sends.push({
        key: `wa-rem-${offer.id}`,
        channel: 'whatsapp',
        label: 'Last call',
        date: reminder,
        audience,
        names,
        ids,
        note: 'one reminder',
      });
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
