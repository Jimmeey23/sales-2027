// The year's CRM sends for a studio, built with the same cadence builder the Collaterals tab
// uses, so the calendar file, the year grid and the month rail can never disagree.
import { db } from '../db.js';
import { buildCommsSends, COMMS_SLOTS, CHANNEL_NAME, type CollateralCustomChannel } from '../../src/lib/commsPlan.js';
import { monthOfferIds } from './planAudit.js';
import { studioScopeIds } from './studios.js';

export interface CrmEvent {
  uid: string;
  date: string; // YYYY-MM-DD
  time: string | null;
  month: number;
  studioId: number;
  studio: string;
  channel: string;
  channelName: string;
  label: string;
  audience: string | null;
  segment: string;
  offers: string[];
  goal: string | null;
  message: string | null;
  note: string | null;
}

const json = (v: any, d: any) => {
  if (v == null) return d;
  if (typeof v === 'object') return v;
  try {
    return JSON.parse(v);
  } catch {
    return d;
  }
};
const pad = (n: number) => String(n).padStart(2, '0');
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const EXCLUDED = ['Copper + Cloves', 'Plash Pilates', 'Outdoor / Unassigned'];

const SEGMENT: Record<string, string> = {
  'New to Physique 57': 'new',
  'Welcome back': 'lapsed',
  'Members only': 'members',
};

export function crmStudios(studio: number | null) {
  const all = db.prepare('SELECT id, name FROM studios ORDER BY id').all() as any[];
  if (studio) {
    const ids = studioScopeIds(db, studio);
    return all.filter(s => s.id === studio || (ids.includes(s.id) && s.id === ids[0]));
  }
  return all.filter(s => !EXCLUDED.includes(s.name));
}

export function crmEvents(year: number, studio: number | null): { events: CrmEvent[]; studios: string[] } {
  const studios = crmStudios(studio);
  const events: CrmEvent[] = [];
  for (const s of studios) {
    for (let month = 1; month <= 12; month++) {
      const ids = monthOfferIds(s.id, year, month);
      if (!ids.length) continue;
      const offers = db
        .prepare(`SELECT id, name, plan_slot, validity_start, validity_end FROM offers WHERE id IN (${ids.map(() => '?').join(',')})`)
        .all(...ids) as any[];
      const plan = db.prepare('SELECT content FROM monthly_plans WHERE studio_id=? AND year=? AND month=?').get(s.id, year, month) as any;
      const state = json(json(plan?.content, {})?.collaterals, {});
      const hidden: string[] = Array.isArray(state?.hiddenChannels) ? state.hiddenChannels : [];
      const custom: CollateralCustomChannel[] = Array.isArray(state?.customChannels) ? state.customChannels : [];
      const first = state?.byOffer?.[String(offers[0]?.id)] || {};
      const leads = { whatsapp: first.waLead ?? 10, email: first.emailLead ?? 12, tent: first.tentLead ?? 15 };
      const { sends } = buildCommsSends(offers, { year, month, hidden, custom, leads, reminder: new Date(year, month, -1), slots: COMMS_SLOTS });
      for (const send of sends)
        events.push({
          uid: `crm-${year}-${s.id}-${month}-${send.key}@p57-sales-plan`,
          date: iso(send.date),
          time: send.time && /\d/.test(send.time) && !/order/i.test(send.time) ? send.time : null,
          month,
          studioId: s.id,
          studio: s.name,
          channel: send.channel,
          channelName: send.channel === 'custom' ? send.label : CHANNEL_NAME[send.channel],
          label: send.label,
          audience: send.audience,
          segment: send.audience ? SEGMENT[send.audience] || 'other' : 'team',
          offers: send.names,
          goal: send.goal || null,
          message: send.message || null,
          note: send.note || null,
        });
    }
  }
  events.sort((a, b) => a.date.localeCompare(b.date) || a.studio.localeCompare(b.studio));
  return { events, studios: studios.map(s => s.name) };
}

const escapeText = (v: string) => String(v || '').replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const fold = (line: string) => {
  const out: string[] = [];
  let rest = line;
  while (Buffer.byteLength(rest, 'utf8') > 74) {
    let cut = 74;
    while (Buffer.byteLength(rest.slice(0, cut), 'utf8') > 74) cut--;
    out.push(rest.slice(0, cut));
    rest = ' ' + rest.slice(cut);
  }
  out.push(rest);
  return out.join('\r\n');
};
const to24 = (t: string) => {
  const m = t.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
  if (!m) return null;
  let h = Number(m[1]);
  const ap = (m[3] || '').toLowerCase();
  if (ap === 'pm' && h < 12) h += 12;
  if (ap === 'am' && h === 12) h = 0;
  return `${pad(h)}${m[2]}00`;
};

export function crmIcs(year: number, studio: number | null) {
  const { events, studios } = crmEvents(year, studio);
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const label = studio ? studios[0] || 'Studio' : 'All locations';
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Physique 57 India//CRM Plan//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(`P57 CRM ${year} · ${label}`)}`,
    `X-WR-CALDESC:${escapeText(`Client outreach plan ${year}: at most four messages per audience per month, offers combined.`)}`,
    'X-WR-TIMEZONE:Asia/Kolkata',
    'REFRESH-INTERVAL;VALUE=DURATION:PT12H',
    'X-PUBLISHED-TTL:PT12H',
  ];
  for (const e of events) {
    const day = e.date.replace(/-/g, '');
    const t = e.time ? to24(e.time) : null;
    const next = new Date(`${e.date}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    const title = `${e.channelName} · ${e.label}${e.audience ? ` — ${e.audience}` : ''}${studio ? '' : ` (${e.studio})`}`;
    const detail = [
      e.offers.length ? `Offers: ${e.offers.join(', ')}` : '',
      e.goal ? `Purpose: ${e.goal}` : '',
      e.note ? `Note: ${e.note}` : '',
      e.message ? `\nDraft:\n${e.message}` : '',
    ]
      .filter(Boolean)
      .join('\n');
    lines.push(
      'BEGIN:VEVENT',
      `UID:${e.uid}`,
      `DTSTAMP:${stamp}`,
      ...(t
        ? [`DTSTART;TZID=Asia/Kolkata:${day}T${t}`, `DURATION:PT30M`]
        : [`DTSTART;VALUE=DATE:${day}`, `DTEND;VALUE=DATE:${next.toISOString().slice(0, 10).replace(/-/g, '')}`]),
      `SUMMARY:${escapeText(title)}`,
      `DESCRIPTION:${escapeText(detail)}`,
      `LOCATION:${escapeText(e.studio)}`,
      `CATEGORIES:${escapeText(`CRM,${e.channelName}`)}`,
      'TRANSP:TRANSPARENT',
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}
