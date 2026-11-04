import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  CalendarClock,
  Clock,
  Dumbbell,
  Mail,
  Megaphone,
  MessageCircle,
  Pencil,
  Plus,
  Printer,
  RotateCcw,
  Star,
  Trash2,
} from 'lucide-react';
import { MONTHS } from '../types';
import { keyDatesFor } from '../data/keyDates';
import { SLOT_LABEL, VOICE, collateralCopy, clip, hash, noPrice } from '../lib/collateralPlan';
import {
  AUDIENCE,
  CHANNEL_NAME,
  buildCommsSends,
  buildSingleSends,
  dayKey,
  fmtDay,
  PHASE_LABEL,
  type CommsPhase,
  type CollateralCustomChannel,
  type CommsChannel,
} from '../lib/commsPlan';

// Marketing & collaterals for one studio-month: one row per channel (WhatsApp, email, in-studio tent card), each
// with a production-style sample built from the chosen offer and Physique 57 India photography, and the specs,
// deadline and brand-voice copy the studio team needs beside it. Everything is derived from the offer, so switching
// or replacing an offer rewrites the creatives and copy.

// Photography in public/p57/pro. `pos` keeps faces in frame when the photo is cropped; `tags` match offer wording.
type Photo = { id: string; pos: string; tags: string[]; fresh?: boolean };
const PHOTOS: Photo[] = [
  { id: 'p01', pos: '50% 40%', tags: ['cycle', 'duo', 'lapsed'] },
  { id: 'p02', pos: '50% 28%', tags: ['strength', 'lapsed'] },
  { id: 'p03', pos: '62% 45%', tags: ['barre', 'calm', 'newcomer'] },
  { id: 'p04', pos: '50% 16%', tags: ['strength', 'renewal'] },
  { id: 'p05', pos: '50% 10%', tags: ['strength', 'renewal'] },
  { id: 'p06', pos: '50% 8%', tags: ['strength', 'renewal'] },
  { id: 'p08', pos: '50% 42%', tags: ['barre', 'group', 'newcomer'] },
  { id: 'p09', pos: '50% 20%', tags: ['strength', 'newcomer', 'lapsed'] },
  { id: 'p10', pos: '50% 18%', tags: ['strength', 'renewal'] },
  { id: 'p12', pos: '50% 50%', tags: ['barre', 'newcomer'] },
  { id: 'p13', pos: '50% 26%', tags: ['barre', 'strength', 'newcomer'] },
  { id: 'p14', pos: '50% 32%', tags: ['barre', 'group', 'newcomer'] },
  { id: 'p15', pos: '50% 48%', tags: ['calm', 'lapsed'] },
  { id: 'p16', pos: '50% 32%', tags: ['calm', 'newcomer'] },
  { id: 'p17', pos: '50% 28%', tags: ['calm', 'newcomer'] },
  { id: 'p18', pos: '50% 26%', tags: ['barre', 'strength', 'newcomer'] },
  { id: 'p19', pos: '50% 22%', tags: ['strength', 'renewal'] },
  { id: 'p20', pos: '50% 55%', tags: ['studio', 'newcomer'] },
  { id: 'p21', pos: '50% 60%', tags: ['studio', 'newcomer'] },
  { id: 'p23', pos: '50% 50%', tags: ['cycle', 'renewal'] },
  { id: 'p24', pos: '62% 28%', tags: ['cycle', 'lapsed'] },
  { id: 'p25', pos: '50% 28%', tags: ['cycle', 'lapsed'] },
  { id: 'p26', pos: '50% 16%', tags: ['strength', 'renewal'] },
  { id: 'p27', pos: '50% 18%', tags: ['strength', 'renewal'] },
  { id: 'p28', pos: '50% 28%', tags: ['cycle', 'newcomer', 'lapsed'] },
  { id: 'p29', pos: '50% 22%', tags: ['cycle', 'lapsed'] },
  { id: 'p30', pos: '50% 22%', tags: ['cycle', 'renewal'] },
  { id: 'p31', pos: '50% 28%', tags: ['barre', 'lapsed'] },
  { id: 'p32', pos: '50% 24%', tags: ['strength', 'renewal'] },
  { id: 'p33', pos: '40% 28%', tags: ['strength', 'renewal'] },
  { id: 'p34', pos: '50% 50%', tags: ['group', 'strength', 'newcomer'] },
  { id: 'p35', pos: '40% 32%', tags: ['duo', 'group', 'lapsed', 'newcomer'] },
  { id: 'p36', pos: '60% 38%', tags: ['barre', 'newcomer'] },
  { id: 'p37', pos: '50% 50%', tags: ['strength', 'renewal'] },
  { id: 'p38', pos: '50% 38%', tags: ['duo', 'lapsed'] },
  { id: 'p39', pos: '50% 38%', tags: ['duo', 'renewal'] },
  { id: 'p40', pos: '50% 40%', tags: ['strength', 'renewal'] },
  { id: 'p41', pos: '50% 28%', tags: ['strength', 'renewal'] },
  { id: 'p42', pos: '50% 28%', tags: ['strength', 'lapsed'] },
  { id: 'p43', pos: '50% 28%', tags: ['strength', 'renewal'] },
  { id: 'p44', pos: '50% 40%', tags: ['lapsed'] },
  { id: 'p45', pos: '50% 18%', tags: ['strength', 'renewal'] },
  // Studio shoot set (Nike maternity, P57 final, trainer shots). `fresh` photos lead every creative set.
  { id: 'n01', pos: '40% 30%', tags: ['cycle', 'duo', 'lapsed', 'renewal'], fresh: true },
  { id: 'n02', pos: '50% 40%', tags: ['strength', 'duo', 'renewal'], fresh: true },
  { id: 'n03', pos: '50% 30%', tags: ['barre', 'duo', 'newcomer', 'lapsed'], fresh: true },
  { id: 'n04', pos: '50% 45%', tags: ['barre', 'newcomer'], fresh: true },
  { id: 'n05', pos: '45% 25%', tags: ['barre', 'calm', 'renewal'], fresh: true },
  { id: 'n06', pos: '50% 25%', tags: ['barre', 'lapsed', 'renewal'], fresh: true },
  { id: 'n07', pos: '50% 35%', tags: ['strength', 'newcomer', 'renewal'], fresh: true },
  { id: 'n08', pos: '50% 30%', tags: ['cycle', 'newcomer', 'lapsed'], fresh: true },
  { id: 'n09', pos: '60% 40%', tags: ['barre', 'strength', 'renewal'], fresh: true },
  { id: 'n10', pos: '50% 30%', tags: ['strength', 'lapsed', 'renewal'], fresh: true },
  { id: 'n11', pos: '50% 40%', tags: ['barre', 'calm', 'lapsed'], fresh: true },
  { id: 'n12', pos: '60% 25%', tags: ['group', 'duo', 'newcomer', 'strength'], fresh: true },
  { id: 'n13', pos: '65% 30%', tags: ['duo', 'group', 'newcomer'], fresh: true },
  { id: 'n14', pos: '50% 22%', tags: ['duo', 'strength', 'newcomer'], fresh: true },
  { id: 'n15', pos: '50% 22%', tags: ['duo', 'strength', 'newcomer'], fresh: true },
  { id: 'n16', pos: '40% 35%', tags: ['group', 'calm', 'strength', 'lapsed'], fresh: true },
  { id: 'n17', pos: '50% 60%', tags: ['calm', 'group', 'lapsed'], fresh: true },
  { id: 'n18', pos: '50% 45%', tags: ['calm', 'barre', 'renewal'], fresh: true },
  { id: 'n19', pos: '50% 45%', tags: ['calm', 'newcomer', 'lapsed'], fresh: true },
  { id: 'n20', pos: '50% 22%', tags: ['group', 'duo', 'newcomer', 'renewal'], fresh: true },
  { id: 'n21', pos: '40% 45%', tags: ['barre', 'strength', 'renewal'], fresh: true },
  { id: 'n22', pos: '35% 25%', tags: ['barre', 'calm', 'lapsed'], fresh: true },
  { id: 'n23', pos: '50% 30%', tags: ['duo', 'strength', 'lapsed', 'renewal'], fresh: true },
  { id: 'n24', pos: '50% 35%', tags: ['strength', 'barre', 'newcomer'], fresh: true },
  { id: 'n25', pos: '50% 40%', tags: ['duo', 'strength', 'renewal'], fresh: true },
  { id: 'n26', pos: '60% 30%', tags: ['barre', 'strength', 'lapsed'], fresh: true },
  { id: 'n27', pos: '50% 50%', tags: ['barre', 'newcomer', 'renewal'], fresh: true },
  { id: 'n28', pos: '60% 35%', tags: ['barre', 'strength', 'newcomer'], fresh: true },
];

// Each channel has several finished layouts; the default rotates by offer and month, and the team can switch.
const LAYOUTS = {
  square: [
    ['overlay', 'Full bleed'],
    ['split', 'Split panel'],
    ['frame', 'Editorial frame'],
    ['duotone', 'Duotone'],
  ],
  email: [
    ['overlay', 'Cinematic'],
    ['split', 'Split hero'],
    ['arch', 'Arch window'],
  ],
  tent: [
    ['classic', 'Classic'],
    ['full', 'Full bleed'],
    ['arch', 'Arch'],
  ],
} as const;
type Piece = keyof typeof LAYOUTS;
// The house cut for each piece. A team that picks another layout still gets it, per offer.
const HOUSE_LAYOUT: Record<Piece, string> = { square: 'overlay', email: 'overlay', tent: 'classic' };

// Offer wording → the kind of picture that sells it.
const THEMES: [RegExp, string][] = [
  [/cycle|ride|spin|power ?cycle/, 'cycle'],
  [/friend|duo|pair|squad|refer|bring|together|couple|sister|mother/, 'duo'],
  [/strength|lift|fit\b|hiit|sculpt|power/, 'strength'],
  [/reset|consult|prenatal|mama|matern|calm|stretch|recover|wellness/, 'calm'],
  [/barre|first class|trial|intro|welcome/, 'barre'],
];



/* The CRM calendar itself lives in src/lib/commsPlan.ts: the export renders the same month,
   and a calendar computed twice would eventually disagree with itself. */

const CHANNEL_ICON: Record<CommsChannel, React.ReactNode> = {
  whatsapp: <MessageCircle size={10} />,
  email: <Mail size={10} />,
  tent: <Printer size={10} />,
  custom: <Megaphone size={10} />,
};

function CommsCalendar({
  offers,
  year,
  month,
  monthName,
  hidden,
  custom,
  leads,
}: {
  offers: any[];
  year: number;
  month: number;
  monthName: string;
  hidden: string[];
  custom: CollateralCustomChannel[];
  leads: { whatsapp: number; email: number; tent: number };
}) {
  const [mode, setMode] = useState<'club' | 'single'>('club');
  const [picked, setPicked] = useState<string | null>(null);
  const reminder = new Date(year, month, -1);
  const slots = ['newcomer', 'lapsed', 'renewal'];
  const clubbed = useMemo(
    () => buildCommsSends(offers, { year, month, hidden, custom, leads, reminder, slots }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [offers, year, month, hidden, custom, leads.whatsapp, leads.email, leads.tent],
  );
  const perOffer = useMemo(
    () => buildSingleSends(offers, { year, month, hidden, custom, leads, reminder, slots }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [offers, year, month, hidden, custom, leads.whatsapp, leads.email, leads.tent],
  );
  const active = mode === 'club' ? clubbed : perOffer;
  const { sends, groups } = active;
  const keyDates = useMemo(() => keyDatesFor(year, month), [year, month]);
  if (!sends.length) return null;

  const byDay = new Map(groups.map(group => [group.key, group]));
  // A month's outreach begins before the month does: the print order and the first emails
  // go out in the last fortnight of the previous month, so the grid runs from the Monday of
  // the first send to the Sunday of the last and marks which days belong to the month.
  const gridStart = new Date(sends[0].date);
  gridStart.setDate(gridStart.getDate() - ((gridStart.getDay() + 6) % 7));
  const gridEnd = new Date(sends[sends.length - 1].date);
  gridEnd.setDate(gridEnd.getDate() + (6 - ((gridEnd.getDay() + 6) % 7)));
  const gridDays: Date[] = [];
  for (const cursor = new Date(gridStart); cursor <= gridEnd; cursor.setDate(cursor.getDate() + 1))
    gridDays.push(new Date(cursor));
  const monthMarks = [...new Set(gridDays.map(day => day.getMonth() + 1))].flatMap(m =>
    keyDatesFor(year, m).map(k => ({ ...k, inMonth: m })),
  );
  // A month-long observance is marked once, on its first day, rather than dotting every
  // cell: the calendar is for sends, not for a second layer of shading.
  const marksFor = (day: Date) => monthMarks.filter(k => k.inMonth === day.getMonth() + 1 && k.day === day.getDate());
  const saved = Math.max(perOffer.sends.length - clubbed.sends.length, 0);
  const span = `${fmtDay(groups[0].date)} – ${fmtDay(groups[groups.length - 1].date)}`;
  const list = picked ? groups.filter(group => group.key === picked) : groups;
  const pickedGroup = list.length === 1 && picked ? list[0] : null;

  return (
    <section className="col-crm" aria-label={`CRM calendar for ${monthName}`}>
      <header className="col-crm-head">
        <div>
          <small>CRM calendar · {monthName}</small>
          <h5>What goes out, and when</h5>
          <p>
            One audience, one send. Offers written for the same people leave in the same broadcast, email and print
            order — {offers.length} offers, {clubbed.sends.length} outreaches instead of {perOffer.sends.length}.
          </p>
        </div>
        <div className="col-crm-aside">
          <div className="crm-mode" role="group" aria-label="How the month is sent">
            <button
              type="button"
              className={mode === 'club' ? 'is-on' : ''}
              aria-pressed={mode === 'club'}
              onClick={() => setMode('club')}
            >
              Clubbed
            </button>
            <button
              type="button"
              className={mode === 'single' ? 'is-on' : ''}
              aria-pressed={mode === 'single'}
              onClick={() => setMode('single')}
            >
              One per offer
            </button>
          </div>
          <dl className="col-crm-stats">
            <div>
              <dt>Outreaches</dt>
              <dd>
                {sends.length}
                {mode === 'club' && <em>not {perOffer.sends.length}</em>}
              </dd>
            </div>
            <div>
              <dt>Sends saved</dt>
              <dd>{saved}</dd>
            </div>
            <div>
              <dt>Window</dt>
              <dd className="is-span">{span}</dd>
            </div>
          </dl>
        </div>
      </header>

      <div className="col-crm-body">
        {/* The month as it is actually worked: a day grid, with the sends sitting on their dates. */}
        <div className="crm-cal">
          <div className="crm-cal-head" aria-hidden="true">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="crm-cal-grid">
            {gridDays.map(date => {
              const group = byDay.get(dayKey(date));
              const marks = marksFor(date);
              const inMonth = date.getMonth() === month - 1;
              const chips: Array<{ channel: CommsChannel; count: number }> = [];
              for (const send of group?.sends || []) {
                const hit = chips.find(c => c.channel === send.channel);
                if (hit) hit.count += 1;
                else chips.push({ channel: send.channel, count: 1 });
              }
              const selected = picked === dayKey(date);
              return (
                <button
                  key={dayKey(date)}
                  type="button"
                  className={`crm-cell${group ? ' has-sends' : ''}${selected ? ' is-picked' : ''}${
                    inMonth ? '' : ' is-prep'
                  }`}
                  onClick={() => group && setPicked(selected ? null : dayKey(date))}
                  aria-pressed={selected}
                  aria-label={`${date.getDate()} ${MONTHS[date.getMonth()]}${
                    group ? `, ${group.sends.length} sends` : ', nothing goes out'
                  }`}
                >
                  <span className="crm-cell-date">
                    {date.getDate()}
                    {date.getDate() === 1 && <i className="crm-cell-month">{MONTHS[date.getMonth()].slice(0, 3)}</i>}
                  </span>
                  {marks.length > 0 && (
                    <i className={`crm-cell-kd is-${marks[0].kind}`} title={marks.map(m => m.name).join(' · ')} />
                  )}
                  <span className="crm-cell-chips">
                    {chips.map(chip => (
                      <span key={chip.channel} className={`crm-chip is-${chip.channel}`}>
                        {CHANNEL_ICON[chip.channel]}
                        {chip.count > 1 ? chip.count : ''}
                      </span>
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="crm-cal-note">
            Shaded days belong to the month before — the print order and the first emails leave before the month opens.
            A dot marks a key date.
          </p>
        </div>

        {/* The same month as a run sheet, so the studio can work top to bottom. */}
        <div className="crm-sched">
          <div className="crm-sched-head">
            <span>{pickedGroup ? fmtDay(pickedGroup.date) : 'The month, in order'}</span>
            {picked && (
              <button type="button" onClick={() => setPicked(null)}>
                Show all
              </button>
            )}
          </div>
          <div className="crm-phases">
            {(['prep', 'launch', 'nudge', 'close'] as CommsPhase[]).map(phase => {
              const inPhase = list.filter(group => (group.sends[0]?.phase || 'launch') === phase);
              if (!inPhase.length) return null;
              const count = inPhase.reduce((sum, group) => sum + group.sends.length, 0);
              return (
                <section key={phase} className={`crm-phase is-${phase}`}>
                  <header className="crm-phase-head">
                    <i aria-hidden="true" />
                    <div>
                      <b>{PHASE_LABEL[phase].title}</b>
                      <span>{PHASE_LABEL[phase].hint}</span>
                    </div>
                    <em>
                      {count} {count === 1 ? 'send' : 'sends'}
                    </em>
                  </header>
                  <ol>
                    {inPhase.map(group => (
                      <li key={group.key}>
                        <div className="crm-sched-date">
                          <b>{group.date.getDate()}</b>
                          <span>{MONTHS[group.date.getMonth()].slice(0, 3)}</span>
                          <small>{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][group.date.getDay()]}</small>
                        </div>
                        <div className="crm-sched-sends">
                          {group.sends.map(send => (
                            <article key={send.key} className={`crm-send is-${send.channel}`}>
                              <span className="crm-send-top">
                                <i className="crm-send-ch">
                                  {CHANNEL_ICON[send.channel]}
                                  {CHANNEL_NAME[send.channel]}
                                </i>
                                <b>{send.label}</b>
                                {send.audience && <em>{send.audience}</em>}
                                {send.time && <time>{send.time}</time>}
                              </span>
                              {send.goal && <p className="crm-send-goal">{send.goal}</p>}
                              {send.message && (
                                <details className="crm-send-msg">
                                  <summary>Draft message</summary>
                                  <p>{send.message}</p>
                                </details>
                              )}
                              <span className="crm-send-offers">
                                {send.names.map((name, index) => (
                                  <b key={`${send.key}-${index}`}>{name}</b>
                                ))}
                              </span>
                              {send.note && <span className="crm-send-note">{send.note}</span>}
                            </article>
                          ))}
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>
              );
            })}
          </div>
        </div>
      </div>

      <footer className="col-crm-foot">
        <span>
          {clubbed.sends.filter(s => s.names.length > 1).length} shared sends · nothing goes out twice in a day to the
          same audience
        </span>
        <span>
          Leads: WhatsApp −{leads.whatsapp}d · email −{leads.email}d · print −{leads.tent}d · nudge day 12 · follow-up day 16 · last call 48h before close
        </span>
      </footer>
    </section>
  );
}

// The back of a tent card states the offer in three clauses, each with a short caption and a
// qualifier — "standing perk / on an 8-class pack or bigger". The clauses come from the offer's
// own wording, so the card never says anything the plan does not.
type TentPerk = { label: string; note: string; icon: 'dumbbell' | 'star' | 'clock' };
const SPLIT_AT = /\s+(on|of|for|at|with|to|in)\s+/i;
const perkIcon = (text: string, index: number): TentPerk['icon'] => {
  if (/day|freeze|week|month|valid|until/i.test(text)) return 'clock';
  if (/class|pack|session|private|pt\b|duo|guest/i.test(text)) return 'dumbbell';
  return index === 0 ? 'star' : index === 1 ? 'dumbbell' : 'clock';
};
function tentPerks(sources: string[], tail: { studio: string; month: string }): TentPerk[] {
  const seen = new Set<string>();
  const out: TentPerk[] = [];
  // A modifier opener reads as its own caption: "free / comeback class", "bonus / guest passes".
  const MODIFIER = /^(free|bonus|extra|complimentary|annual|plus)$/i;
  for (const source of sources) {
    for (const raw of String(source || '').split(/(?:\s\+\s|\s·\s|\s+and\s+|;\s|\.\s|,\s(?=[a-z]))/)) {
      const clause = raw
        .replace(/^[+\-–—\s]+/, '')
        .replace(/[.\s]+$/, '')
        .trim();
      if (clause.length < 3 || clause.length > 74) continue;
      const hit = clause.match(SPLIT_AT);
      const at = hit && hit.index && hit.index > 2 ? hit.index : -1;
      let label = at > 0 ? clause.slice(0, at).trim() : clause;
      let note = at > 0 ? clause.slice(at + 1).trim() : '';
      if (!note) {
        const words = label.split(/\s+/);
        if (words.length > 1 && MODIFIER.test(words[0])) {
          label = words[0];
          note = words.slice(1).join(' ');
        }
      }
      if (!note) note = ['at the studio', `this ${tail.month.toLowerCase()}`, 'ask at reception'][out.length] || '';
      const key = `${label}|${note}`.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        label: clip(label, 26),
        note: clip(note, 38),
        icon: perkIcon(`${label} ${note}`, out.length),
      });
      if (out.length === 3) return out;
    }
  }
  const fillers: TentPerk[] = [
    { label: 'At the studio', note: tail.studio, icon: 'dumbbell' },
    { label: `${tail.month} only`, note: 'while places last', icon: 'star' },
    { label: 'Ask at reception', note: 'we will set it up', icon: 'clock' },
  ];
  for (const filler of fillers) {
    if (out.length === 3) break;
    if (out.some(p => p.label.toLowerCase() === filler.label.toLowerCase())) continue;
    out.push(filler);
  }
  return out.slice(0, 3);
}

// Three different photos for one offer: matched to what the offer is about, then its audience, rotated by month and
// studio so each month's creatives look different.
function pickPhotos(offer: any, slot: string, month: number, studio: string): Photo[] {
  const text = `${offer.name} ${offer.benefit || ''} ${offer.headline || ''}`.toLowerCase();
  const theme = THEMES.find(([re]) => re.test(text))?.[1];
  const bySlot = PHOTOS.filter(p => p.tags.includes(slot));
  const byTheme = theme ? PHOTOS.filter(p => p.tags.includes(theme)) : [];
  const pool = [...new Map([...byTheme, ...bySlot].map(p => [p.id, p])).values()];
  const start = month * 3 + hash(studio) + hash(String(offer.id));
  // The newest studio shoot leads: fresh photos first, topped up from the wider pool.
  const fresh = pool.filter(p => p.fresh);
  const out: Photo[] = [];
  const take = (list: Photo[], i: number) => {
    for (let k = 0; k < list.length; k++) {
      const p = list[(start + i * Math.max(1, Math.floor(list.length / 3)) + k) % list.length];
      if (!out.includes(p)) return out.push(p);
    }
  };
  [0, 1, 2].forEach(i => fresh.length && take(fresh, i));
  for (let i = 0; out.length < 3 && i < 6; i++) take(pool, i);
  return out;
}

export type { CollateralCustomChannel } from '../lib/commsPlan';

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

export interface CollateralsState {
  title?: string;
  subtitle?: string;
  hiddenChannels?: string[];
  byOffer?: Record<string, CollateralOfferOverride>;
  customChannels?: CollateralCustomChannel[];
}

export default function MarketingCollaterals({
  id,
  offers,
  studioName,
  city,
  year,
  month,
  theme,
  hook,
  editable = false,
  collaterals,
  onChangeCollaterals,
  onDeleteSection,
}: {
  id?: string;
  offers: any[];
  studioName: string;
  city: string;
  year: number;
  month: number;
  theme: string;
  hook?: string;
  editable?: boolean;
  collaterals?: CollateralsState;
  onChangeCollaterals?: (next: CollateralsState) => void;
  onDeleteSection?: () => void;
}) {
  const [pickId, setPickId] = useState<number | null>(null);
  const [layoutPick, setLayoutPick] = useState<Record<string, string>>({});
  // The header reads as a heading; the pencil opens it for renaming.
  const [renaming, setRenaming] = useState(false);
  const offer = offers.find(o => o.id === pickId) || offers[0];
  const slot = (offer?.plan_slot as keyof typeof VOICE) in VOICE ? (offer.plan_slot as keyof typeof VOICE) : 'newcomer';
  const shots = useMemo(
    () => (offer ? pickPhotos(offer, slot, month, studioName) : []),
    [offer, slot, month, studioName],
  );
  const state: CollateralsState = collaterals || {};
  const patchState = (patch: Partial<CollateralsState>) => onChangeCollaterals?.({ ...state, ...patch });
  const hiddenChannels = state.hiddenChannels || [];
  const customChannels = state.customChannels || [];
  const due = (lead: number) => fmtDay(new Date(year, month - 1, 1 - lead));
  const monthName = MONTHS[month - 1];

  const hideChannel = (ch: string) => patchState({ hiddenChannels: [...new Set([...hiddenChannels, ch])] });
  const restoreChannel = (ch: string) => patchState({ hiddenChannels: hiddenChannels.filter(x => x !== ch) });
  const addCustomChannel = () => {
    const next: CollateralCustomChannel = {
      id: `ch-${Date.now()}`,
      title: 'Instagram Story & Reel',
      lead: 8,
      items: ['9:16 vertical video / story sequence (1080×1920 px)', 'Direct booking link sticker + Momence UTM tag'],
      copyLabel: 'Caption & hook',
      copyText: `${theme || monthName} at ${studioName} — book your spot before the window closes.`,
    };
    patchState({ customChannels: [...customChannels, next] });
  };
  const updateCustomChannel = (cid: string, patch: Partial<CollateralCustomChannel>) =>
    patchState({ customChannels: customChannels.map(c => (c.id === cid ? { ...c, ...patch } : c)) });
  const removeCustomChannel = (cid: string) => patchState({ customChannels: customChannels.filter(c => c.id !== cid) });

  if (!offer)
    return (
      <div id={id} className="mw-section col-section">
        <div className="col-head">
          <div>
            {editable && renaming ? (
              <>
                <input
                  className="col-edit-heading"
                  aria-label="Collaterals section title"
                  value={state.title ?? 'Marketing & collaterals needed'}
                  onChange={e => patchState({ title: e.target.value })}
                />
                <input
                  className="col-edit-sub"
                  aria-label="Collaterals section subtitle"
                  value={state.subtitle ?? (hook || 'Everything the studio team needs to launch this month’s offers.')}
                  onChange={e => patchState({ subtitle: e.target.value })}
                />
              </>
            ) : (
              <h4>{state.title || 'Marketing & collaterals needed'}</h4>
            )}
          </div>
          {editable && (
            <div className="col-head-actions">
              <button
                type="button"
                className={`mw-mini-btn${renaming ? ' is-active' : ''}`}
                onClick={() => setRenaming(v => !v)}
                title={renaming ? 'Done renaming' : 'Rename this section'}
                aria-pressed={renaming}
              >
                <Pencil size={12} /> {renaming ? 'Done' : 'Rename'}
              </button>
              <button type="button" className="mw-mini-btn" onClick={addCustomChannel}>
                <Plus size={13} /> Add channel
              </button>
              {onDeleteSection && (
                <button
                  type="button"
                  className="mw-mini-btn is-danger"
                  onClick={onDeleteSection}
                  title="Remove section from month plan"
                >
                  <Trash2 size={13} /> Delete section
                </button>
              )}
            </div>
          )}
        </div>
        <p className="muted">
          Pick or create an offer above to preview WhatsApp, email and tent card creatives, or add custom collateral
          channels below.
        </p>
        {customChannels.map(ch => (
          <div key={ch.id} className="col-row is-custom">
            <aside className="col-spec" style={{ gridColumn: '1 / -1' }}>
              <header>
                <span>
                  <Megaphone size={15} />
                </span>
                {editable ? (
                  <input
                    className="col-inline-title"
                    value={ch.title}
                    onChange={e => updateCustomChannel(ch.id, { title: e.target.value })}
                  />
                ) : (
                  <b>{ch.title}</b>
                )}
                <i>
                  <CalendarClock size={12} /> Final by {due(ch.lead)}
                  {editable && (
                    <input
                      type="number"
                      min={1}
                      max={45}
                      className="col-lead-input"
                      aria-label="Lead days"
                      value={ch.lead}
                      onChange={e => updateCustomChannel(ch.id, { lead: Math.max(1, Number(e.target.value) || 1) })}
                    />
                  )}
                </i>
                {editable && (
                  <button
                    type="button"
                    className="mw-mini-icon is-danger"
                    aria-label={`Delete ${ch.title}`}
                    onClick={() => removeCustomChannel(ch.id)}
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </header>
              {editable ? (
                <div className="col-edit-list">
                  {ch.items.map((it, idx) => (
                    <div key={idx} className="col-edit-item">
                      <input
                        value={it}
                        onChange={e =>
                          updateCustomChannel(ch.id, {
                            items: ch.items.map((x, i) => (i === idx ? e.target.value : x)),
                          })
                        }
                      />
                      <button
                        type="button"
                        aria-label="Remove deliverable"
                        onClick={() => updateCustomChannel(ch.id, { items: ch.items.filter((_, i) => i !== idx) })}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="mw-mini-btn"
                    onClick={() => updateCustomChannel(ch.id, { items: [...ch.items, 'New deliverable requirement'] })}
                  >
                    <Plus size={12} /> Add requirement
                  </button>
                </div>
              ) : (
                <ul>
                  {ch.items.map((t, idx) => (
                    <li key={idx}>{t}</li>
                  ))}
                </ul>
              )}
              <div className="col-copy">
                {editable ? (
                  <>
                    <input
                      className="col-copy-label-input"
                      value={ch.copyLabel}
                      onChange={e => updateCustomChannel(ch.id, { copyLabel: e.target.value })}
                    />
                    <textarea
                      rows={3}
                      className="col-copy-textarea"
                      value={ch.copyText}
                      onChange={e => updateCustomChannel(ch.id, { copyText: e.target.value })}
                    />
                  </>
                ) : (
                  <>
                    <small>{ch.copyLabel}</small>
                    <p>{ch.copyText}</p>
                  </>
                )}
              </div>
            </aside>
          </div>
        ))}
      </div>
    );

  const n = Math.max(1, offers.length);
  const offerName = clip(String(offer.name), 44);
  const ov: CollateralOfferOverride = state.byOffer?.[String(offer.id)] || {};
  const patchOfferOv = (patch: Partial<CollateralOfferOverride>) =>
    patchState({
      byOffer: {
        ...(state.byOffer || {}),
        [String(offer.id)]: { ...ov, ...patch },
      },
    });

  const end = new Date(year, month, 0);
  // Every word the month puts in front of a client comes from the shared builder: the exported
  // plan prints the same copy this screen previews.
  const shared = collateralCopy({ offer, year, month, studioName, theme, overrides: ov, offerCount: offers.length });
  const v = VOICE[shared.slot];
  const {
    kicker,
    headline,
    altHead,
    intro,
    subjects,
    preheader,
    emailCta,
    detail,
    closes,
    waLaunchText,
    waLaunchButton,
    waReminderHeadline,
    waReminderText,
    waReminderButton,
    waWindow,
    tentFront,
  } = shared;
  const waLead = shared.leads.whatsapp;
  const emailLead = shared.leads.email;
  const tentLead = shared.leads.tent;
  const waItems = shared.items.whatsapp;
  const emailItems = shared.items.email;
  const tentItems = shared.items.tent;
  const bare = (value: string) =>
    String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  // A tent card is read standing up: one whole line, cut at a sentence or a clause boundary.
  const cardLine = (value: string, max: number, ellipsis = false) => {
    const clean = String(value || '')
      .replace(/\s+/g, ' ')
      .trim();
    if (clean.length <= max) return clean;
    const head = clean.slice(0, max);
    const tail = ellipsis ? '…' : '.';
    const stop = Math.max(head.lastIndexOf('. '), head.lastIndexOf('; '), head.lastIndexOf(', '));
    if (stop > max * 0.45) return head.slice(0, stop).trim() + tail;
    return `${head.replace(/[\s,;:.]+\S*$/, '')}${tail}`;
  };
  // One confident line, sized to the measure — a poster fits its line, it never wraps it.
  const tentHeadSize = Math.min(7.2, 152 / Math.max(8, tentFront.length));
  const tentKickSize = Math.min(4.05, 100 / Math.max(12, kicker.length));
  // The card is a fixed print: copy that runs long shrinks the type block instead of
  // spilling into the foot. Scaled together, so the hierarchy never changes.
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const fitCard = useCallback(() => {
    const el = bodyRef.current;
    if (!el) return;
    // Line-clamped boxes report their clamped height to scrollHeight, so measure the
    // children's real print extent instead.
    const printed = () => {
      let bottom = 0;
      for (const child of Array.from(el.children)) {
        const c = child as HTMLElement;
        bottom = Math.max(bottom, c.offsetTop + c.offsetHeight);
      }
      return bottom;
    };
    let scale = 1;
    el.style.setProperty('--ct-fit', '1');
    for (let i = 0; i < 16; i += 1) {
      if (printed() <= el.clientHeight + 1) break;
      scale = Math.max(0.68, scale - 0.04);
      el.style.setProperty('--ct-fit', scale.toFixed(3));
    }
  }, []);
  useEffect(() => {
    fitCard();
    const el = bodyRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => fitCard());
    ro.observe(el);
    document.fonts?.ready.then(() => fitCard()).catch(() => undefined);
    return () => ro.disconnect();
  }, [fitCard, tentFront, kicker, detail, month]);
  const tentBack = shared.tentBack;
  // The back card states the offer in three clauses and closes with two short lines.
  const perks = tentPerks([detail, String(offer.provenance?.pricing?.mechanic || ''), String(offer.benefit || '')], {
    studio: studioName,
    month: monthName,
  });
  const closingLines = [v.closing[0], v.closing[1]];
  const backQuote = (() => {
    const written = String(ov.tentBack || '').trim();
    if (written) {
      const parts = written.split(/(?<=[.!?])\s+/).filter(Boolean);
      return [parts[0] || written, parts.slice(1).join(' ')].filter(Boolean) as string[];
    }
    return closingLines;
  })();

  const waSends = [
    {
      label: 'Launch broadcast',
      day: `1 ${monthName.slice(0, 3)}`,
      time: '9:00 AM',
      layout: '',
      photo: shots[0],
      kicker,
      headline,
      text: waLaunchText,
      button: waLaunchButton,
    },
    {
      label: 'Reminder · 48h before close',
      day: fmtDay(new Date(year, month, -1)),
      time: '6:30 PM',
      layout: '',
      photo: shots[2] ?? shots[0],
      kicker: `Last call · ${monthName}`,
      headline: waReminderHeadline,
      text: waReminderText,
      button: waReminderButton,
    },
  ];
  const bg = (p: Photo) => ({ backgroundImage: `url(/p57/pro/${p.id}.jpg)`, backgroundPosition: p.pos });
  const Photo = ({ p }: { p: Photo }) => <div className="cr-photo" style={bg(p)} />;
  const layout = (piece: Piece) => layoutPick[`${offer.id}:${piece}`] ?? HOUSE_LAYOUT[piece];
  waSends[0].layout = layout('square');
  waSends[1].layout = layout('square');
  const Layouts = ({ piece }: { piece: Piece }) => (
    <div className="cr-layouts" role="radiogroup" aria-label="Layout">
      {LAYOUTS[piece].map(([k, label]) => (
        <button
          key={k}
          type="button"
          role="radio"
          aria-checked={layout(piece) === k}
          className={layout(piece) === k ? 'is-on' : ''}
          onClick={() => setLayoutPick(s => ({ ...s, [`${offer.id}:${piece}`]: k }))}
        >
          {label}
        </button>
      ))}
    </div>
  );

  const Logo = ({ light = false }: { light?: boolean }) => (
    <img className="cr-logo" src={light ? '/p57/logo-light.png' : '/p57/logo.png'} alt="Physique 57 India" />
  );
  const Spec = ({
    channelKey,
    title,
    icon: Icon,
    lead,
    onLeadChange,
    items,
    onItemsChange,
    copy,
  }: {
    channelKey: string;
    title: string;
    icon: any;
    lead: number;
    onLeadChange?: (d: number) => void;
    items: string[];
    onItemsChange?: (next: string[]) => void;
    copy?: React.ReactNode;
  }) => (
    <aside className="col-spec">
      <header>
        <span className="col-spec-icon">
          <Icon size={15} />
        </span>
        <div className="col-spec-id">
          <b>{title}</b>
          <i>
            <CalendarClock size={11} /> Final by {due(lead)}
            {editable && onLeadChange && (
              <input
                type="number"
                min={1}
                max={45}
                className="col-lead-input"
                aria-label={`${title} lead days`}
                title="Lead days before month start"
                value={lead}
                onChange={e => onLeadChange(Math.max(1, Number(e.target.value) || 1))}
              />
            )}
          </i>
        </div>
        {editable && (
          <button
            type="button"
            className="mw-mini-icon is-danger col-spec-hide"
            title={`Remove ${title} from this month`}
            aria-label={`Remove ${title}`}
            onClick={() => hideChannel(channelKey)}
          >
            <Trash2 size={13} />
          </button>
        )}
      </header>
      <span className="col-spec-cap">Deliverables</span>
      {editable && onItemsChange ? (
        <div className="col-edit-list">
          {items.map((t, idx) => (
            <div key={idx} className="col-edit-item">
              <input
                value={t}
                aria-label={`${title} requirement ${idx + 1}`}
                onChange={e => onItemsChange(items.map((x, i) => (i === idx ? e.target.value : x)))}
              />
              <button
                type="button"
                aria-label="Remove requirement"
                onClick={() => onItemsChange(items.filter((_, i) => i !== idx))}
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          <button
            type="button"
            className="mw-mini-btn"
            onClick={() => onItemsChange([...items, 'New channel deliverable'])}
          >
            <Plus size={12} /> Add requirement
          </button>
        </div>
      ) : (
        <ul>
          {items.map((t, idx) => (
            <li key={idx}>{t}</li>
          ))}
        </ul>
      )}
      {copy && (
        <div className="col-copy">
          <span className="col-spec-cap">Copy to use</span>
          {copy}
        </div>
      )}
    </aside>
  );

  const CHANNEL_LABELS: Record<string, string> = {
    whatsapp: 'WhatsApp broadcast',
    email: 'Email campaign',
    tent: 'In-studio tent card',
  };

  return (
    <div id={id} className="mw-section col-section">
      <div className="col-head">
        <div style={{ flex: '1 1 320px', minWidth: 0 }}>
          <small>
            {theme || monthName} · {studioName}
          </small>
          {editable && renaming ? (
            <div className="col-head-edit-fields">
              <input
                className="col-edit-heading"
                aria-label="Collaterals section title"
                value={state.title ?? 'Marketing & collaterals needed'}
                onChange={e => patchState({ title: e.target.value })}
              />
              <input
                className="col-edit-sub"
                aria-label="Collaterals section subtitle"
                value={
                  state.subtitle ??
                  (hook ||
                    'Everything the studio team needs to launch this month’s offers, with a sample of each piece.')
                }
                onChange={e => patchState({ subtitle: e.target.value })}
              />
            </div>
          ) : (
            <>
              <h4>{state.title || 'Marketing & collaterals needed'}</h4>
              <p className="muted">
                {state.subtitle ||
                  hook ||
                  'Everything the studio team needs to launch this month’s offers, with a sample of each piece.'}
              </p>
            </>
          )}
        </div>
        {editable && (
          <div className="col-head-actions">
            <button
              type="button"
              className={`mw-mini-btn${renaming ? ' is-active' : ''}`}
              onClick={() => setRenaming(v => !v)}
              title={renaming ? 'Done renaming' : 'Rename this section'}
              aria-pressed={renaming}
            >
              <Pencil size={12} /> {renaming ? 'Done' : 'Rename'}
            </button>
            <button type="button" className="mw-mini-btn" onClick={addCustomChannel}>
              <Plus size={13} /> Add channel
            </button>
            {Object.keys(ov).length > 0 && (
              <button
                type="button"
                className="mw-mini-btn"
                onClick={() => {
                  const nextByOffer = { ...(state.byOffer || {}) };
                  delete nextByOffer[String(offer.id)];
                  patchState({ byOffer: nextByOffer });
                }}
              >
                <RotateCcw size={12} /> Reset offer copy
              </button>
            )}
            {onDeleteSection && (
              <button
                type="button"
                className="mw-mini-btn is-danger"
                onClick={onDeleteSection}
                title="Remove collaterals section"
              >
                <Trash2 size={13} /> Delete section
              </button>
            )}
          </div>
        )}
      </div>

      {/* The production clock, in the one place the page hero above does not already cover it. */}
      {(() => {
        const live = (['whatsapp', 'email', 'tent'] as const).filter(c => !hiddenChannels.includes(c));
        const lock = due(Math.max(waLead, emailLead, tentLead));
        return (
          <div className="col-ledger">
            <span>
              Artwork locks <b>{lock}</b>
            </span>
            {live.includes('tent') && (
              <span>
                Print at desk <b>{due(tentLead)}</b>
              </span>
            )}
            {live.includes('whatsapp') && (
              <span>
                First send <b>1 {monthName.slice(0, 3)}</b>
              </span>
            )}
          </div>
        );
      })()}

      {/* Every send of the month, on one rail — the comms plan the studio actually runs. */}
      <CommsCalendar
        offers={offers}
        year={year}
        month={month}
        monthName={monthName}
        hidden={hiddenChannels}
        custom={customChannels}
        leads={{ whatsapp: waLead, email: emailLead, tent: tentLead }}
      />

      {editable && hiddenChannels.length > 0 && (
        <div className="mw-restore-strip">
          <span>Removed channels:</span>
          {hiddenChannels.map(ch => (
            <button key={ch} type="button" onClick={() => restoreChannel(ch)}>
              <RotateCcw size={11} /> Restore {CHANNEL_LABELS[ch] || ch}
            </button>
          ))}
        </div>
      )}

      <div className="col-tabs" role="tablist" aria-label="Offer to preview">
        {(['newcomer', 'lapsed', 'renewal'] as const).map(k => {
          const list = offers.filter(o => (o.plan_slot in VOICE ? o.plan_slot : 'newcomer') === k);
          if (!list.length) return null;
          return (
            <div key={k} className={`col-tab-group is-${k}`}>
              <span>{SLOT_LABEL[k]}</span>
              {list.map(o => (
                <button
                  key={o.id}
                  role="tab"
                  aria-selected={o.id === offer.id}
                  className={o.id === offer.id ? 'is-on' : ''}
                  onClick={() => setPickId(o.id)}
                >
                  {o.name}
                </button>
              ))}
            </div>
          );
        })}
      </div>

      {editable && (
        <div className="col-creative-bar">
          <label>
            <span>Creative kicker</span>
            <input value={kicker} onChange={e => patchOfferOv({ kicker: e.target.value })} />
          </label>
          <label>
            <span>Primary creative headline</span>
            <input value={headline} onChange={e => patchOfferOv({ headline: e.target.value })} />
          </label>
          <label>
            <span>Email hero headline</span>
            <input value={altHead} onChange={e => patchOfferOv({ altHead: e.target.value })} />
          </label>
        </div>
      )}

      {/* WhatsApp: A4 portrait creative, previewed as the received message */}
      {!hiddenChannels.includes('whatsapp') && (
        <div className="col-row is-wa">
          <div className="cr-stage">
            <div className="wa-pair is-duo">
              {/* Both sends, side by side: the launch broadcast as it lands on the first,
                  then the reminder two days before the offer closes. */}
              {waSends.map(w => (
                <div key={w.label} className="wa-send">
                  <span className="wa-label">
                    {w.label} · {w.day}, {w.time}
                  </span>
                  <div className="wa-phone">
                    <div className="wa-bar">
                      <span className="wa-back">‹</span>
                      <span className="wa-av">
                        <img src="/p57/logo-light.png" alt="" />
                      </span>
                      <div>
                        <b>
                          Physique 57 India <i className="wa-tick">✓</i>
                        </b>
                        <small>Business account</small>
                      </div>
                    </div>
                    <div className="wa-chat">
                      <span className="wa-day">{w.day}</span>
                      <div className="wa-bubble">
                        <figure className={`cr-square is-${w.layout}`}>
                          <Photo p={w.photo} />
                          <div className="cr-shade" />
                          <header>
                            <Logo light />
                            <span>{city}</span>
                          </header>
                          <div className="cr-body">
                            <small>{w.kicker}</small>
                            <h3>{w.headline}</h3>
                            <p>{offerName}</p>
                          </div>
                          <footer>
                            <span className="cr-value">
                              <b>57</b>
                              <em>min</em>
                            </span>
                            <div>
                              <strong>Reply YES to book</strong>
                              <span>
                                {closes} · {studioName}
                              </span>
                            </div>
                          </footer>
                        </figure>
                        <p className="wa-text">
                          {w.text
                            .split(/(\*[^*]+\*)/)
                            .map((t, i) => (t.startsWith('*') ? <b key={i}>{t.slice(1, -1)}</b> : t))}
                        </p>
                        <span className="wa-time">{w.time}</span>
                      </div>
                      <div className="wa-buttons">
                        <span>{w.button}</span>
                        <span>Stop promotions</span>
                      </div>
                    </div>
                    <div className="wa-input">
                      <span>Message</span>
                      <i />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Layouts piece="square" />
          </div>
          <Spec
            channelKey="whatsapp"
            title="WhatsApp broadcast"
            icon={MessageCircle}
            lead={waLead}
            onLeadChange={d => patchOfferOv({ waLead: d })}
            items={waItems}
            onItemsChange={next => patchOfferOv({ waItems: next })}
            copy={
              editable ? (
                <div className="col-copy-edit">
                  <label>
                    <small>Send window</small>
                    <input value={waWindow} onChange={e => patchOfferOv({ waWindow: e.target.value })} />
                  </label>
                  <label>
                    <small>Launch message</small>
                    <textarea
                      rows={4}
                      value={waLaunchText}
                      onChange={e => patchOfferOv({ waLaunchText: e.target.value })}
                    />
                  </label>
                  <div className="col-copy-row2">
                    <label>
                      <small>Launch CTA button</small>
                      <input value={waLaunchButton} onChange={e => patchOfferOv({ waLaunchButton: e.target.value })} />
                    </label>
                    <label>
                      <small>Reminder CTA button</small>
                      <input
                        value={waReminderButton}
                        onChange={e => patchOfferOv({ waReminderButton: e.target.value })}
                      />
                    </label>
                  </div>
                  <label>
                    <small>Reminder message (48h before close)</small>
                    <textarea
                      rows={3}
                      value={waReminderText}
                      onChange={e => patchOfferOv({ waReminderText: e.target.value })}
                    />
                  </label>
                </div>
              ) : (
                <>
                  <small>Send window</small>
                  <p>{waWindow}</p>
                </>
              )
            }
          />
        </div>
      )}

      {/* Email: 600px template */}
      {!hiddenChannels.includes('email') && (
        <div className="col-row">
          <div className="cr-stage">
            <figure className={`cr-email is-${layout('email')}`}>
              <div className="cr-hero">
                <Photo p={shots[1]} />
                <div className="cr-shade" />
                <header>
                  <Logo light={layout('email') !== 'arch'} />
                  <span>
                    {studioName} · {city}
                  </span>
                </header>
                <div className="cr-hero-text">
                  <small>{kicker}</small>
                  <h3>{altHead}</h3>
                </div>
              </div>
              <div className="cr-mail-body">
                <h4>{offer.name}</h4>
                <p>{clip(detail, 120)}</p>
                <span className="cr-cta">
                  {emailCta} <ArrowRight size={13} />
                </span>
                <small className="cr-mail-fine">
                  Until {fmtDay(end)} · {studioName}, {city} · Unsubscribe
                </small>
              </div>
            </figure>
            <Layouts piece="email" />
          </div>
          <Spec
            channelKey="email"
            title="Email"
            icon={Mail}
            lead={emailLead}
            onLeadChange={d => patchOfferOv({ emailLead: d })}
            items={emailItems}
            onItemsChange={next => patchOfferOv({ emailItems: next })}
            copy={
              editable ? (
                <div className="col-copy-edit">
                  <small>Subject line options</small>
                  <div className="col-edit-list">
                    {subjects.map((s, idx) => (
                      <div key={idx} className="col-edit-item">
                        <input
                          value={s}
                          onChange={e =>
                            patchOfferOv({ subjects: subjects.map((x, i) => (i === idx ? e.target.value : x)) })
                          }
                        />
                        <button
                          type="button"
                          aria-label="Remove subject line"
                          onClick={() => patchOfferOv({ subjects: subjects.filter((_, i) => i !== idx) })}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="mw-mini-btn"
                      onClick={() => patchOfferOv({ subjects: [...subjects, `${offerName} — ${monthName}`] })}
                    >
                      <Plus size={12} /> Add subject line
                    </button>
                  </div>
                  <label>
                    <small>Preheader</small>
                    <input value={preheader} onChange={e => patchOfferOv({ preheader: e.target.value })} />
                  </label>
                  <label>
                    <small>Opening line</small>
                    <textarea rows={2} value={intro} onChange={e => patchOfferOv({ intro: e.target.value })} />
                  </label>
                  <label>
                    <small>Button CTA</small>
                    <input value={emailCta} onChange={e => patchOfferOv({ emailCta: e.target.value })} />
                  </label>
                </div>
              ) : (
                <>
                  <small>Subject line options</small>
                  <ol className="col-subjects">
                    {subjects.map((s, idx) => (
                      <li key={idx}>{s}</li>
                    ))}
                  </ol>
                  <small>Preheader</small>
                  <p>{preheader}</p>
                  <small>Opening line</small>
                  <p>{intro}</p>
                </>
              )
            }
          />
        </div>
      )}

      {/* Tent card: the printed face laid onto the card in the studio photograph */}
      {!hiddenChannels.includes('tent') && (
        <div className="col-row is-tent">
          <div className="cr-stage">
            <div className="cr-tent-stage">
              <figure className={`cr-tent cr-tent-front is-${layout('tent')}`}>
                <div className="ct-sheet">
                  <div className="ct-photo" style={bg(shots[2])}>
                    <span className="ct-seal">
                      <b>{monthName.slice(0, 3)}</b>
                      <em>only</em>
                    </span>
                  </div>
                  <div className="ct-body" ref={bodyRef}>
                    <img className="ct-logo" src="/p57/logo.png" alt="Physique 57 India" />
                    <span className="ct-kicker" style={{ fontSize: `${tentKickSize.toFixed(2)}cqw` }}>
                      {kicker}
                    </span>
                    <h3
                      className="ct-headline"
                      style={{ fontSize: `calc(${tentHeadSize.toFixed(2)}cqw * var(--ct-fit, 1))` }}
                    >
                      {tentFront}
                    </h3>
                    <p className="ct-detail">
                      {!bare(detail).startsWith(bare(offerName).slice(0, 14)) && <b>{offerName}. </b>}
                      {cardLine(detail, 104, true)}
                    </p>
                  </div>
                  <div className="ct-foot">
                    <div className="cr-qr" aria-hidden="true">
                      {Array.from({ length: 49 }, (_, i) => (
                        <i key={i} className={(i * 7 + month * 3 + i * i) % 3 ? '' : 'on'} />
                      ))}
                    </div>
                    <div>
                      <b>Scan to claim</b>
                      <span>Or ask at reception · {closes}</span>
                    </div>
                  </div>
                </div>
              </figure>
            </div>
            <Layouts piece="tent" />
          </div>
          <Spec
            channelKey="tent"
            title="In-studio tent card"
            icon={Printer}
            lead={tentLead}
            onLeadChange={d => patchOfferOv({ tentLead: d })}
            items={tentItems}
            onItemsChange={next => patchOfferOv({ tentItems: next })}
            copy={
              editable ? (
                <div className="col-copy-edit">
                  <label>
                    <small>Front headline</small>
                    <input value={tentFront} onChange={e => patchOfferOv({ tentFront: e.target.value })} />
                  </label>
                  <label>
                    <small>Back pull-quote (one line per sentence)</small>
                    <textarea rows={2} value={tentBack} onChange={e => patchOfferOv({ tentBack: e.target.value })} />
                  </label>
                </div>
              ) : (
                <>
                  <small>Front</small>
                  <p>{tentFront}</p>
                  <small>Back</small>
                  <ul className="ct-back-list">
                    {perks.map((perk, i) => (
                      <li key={`${perk.label}-${i}`}>
                        <b>{perk.label}</b>
                        {perk.note ? ` — ${perk.note}` : ''}
                      </li>
                    ))}
                  </ul>
                  <p>{backQuote.join(' ')}</p>
                </>
              )
            }
          />
        </div>
      )}

      {/* Custom added collateral channels */}
      {customChannels.map(ch => (
        <div key={ch.id} className="col-row is-custom">
          <aside className="col-spec" style={{ gridColumn: '1 / -1' }}>
            <header>
              <span>
                <Megaphone size={15} />
              </span>
              {editable ? (
                <input
                  className="col-inline-title"
                  value={ch.title}
                  onChange={e => updateCustomChannel(ch.id, { title: e.target.value })}
                />
              ) : (
                <b>{ch.title}</b>
              )}
              <i>
                <CalendarClock size={12} /> Final by {due(ch.lead)}
                {editable && (
                  <input
                    type="number"
                    min={1}
                    max={45}
                    className="col-lead-input"
                    aria-label="Lead days"
                    value={ch.lead}
                    onChange={e => updateCustomChannel(ch.id, { lead: Math.max(1, Number(e.target.value) || 1) })}
                  />
                )}
              </i>
              {editable && (
                <button
                  type="button"
                  className="mw-mini-icon is-danger"
                  aria-label={`Delete ${ch.title}`}
                  onClick={() => removeCustomChannel(ch.id)}
                >
                  <Trash2 size={13} />
                </button>
              )}
            </header>
            {editable ? (
              <div className="col-edit-list">
                {ch.items.map((it, idx) => (
                  <div key={idx} className="col-edit-item">
                    <input
                      value={it}
                      onChange={e =>
                        updateCustomChannel(ch.id, { items: ch.items.map((x, i) => (i === idx ? e.target.value : x)) })
                      }
                    />
                    <button
                      type="button"
                      aria-label="Remove deliverable"
                      onClick={() => updateCustomChannel(ch.id, { items: ch.items.filter((_, i) => i !== idx) })}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="mw-mini-btn"
                  onClick={() => updateCustomChannel(ch.id, { items: [...ch.items, 'New deliverable requirement'] })}
                >
                  <Plus size={12} /> Add requirement
                </button>
              </div>
            ) : (
              <ul>
                {ch.items.map((t, idx) => (
                  <li key={idx}>{t}</li>
                ))}
              </ul>
            )}
            <div className="col-copy">
              {editable ? (
                <div className="col-copy-edit">
                  <input
                    className="col-copy-label-input"
                    value={ch.copyLabel}
                    onChange={e => updateCustomChannel(ch.id, { copyLabel: e.target.value })}
                  />
                  <textarea
                    rows={3}
                    value={ch.copyText}
                    onChange={e => updateCustomChannel(ch.id, { copyText: e.target.value })}
                  />
                </div>
              ) : (
                <>
                  <small>{ch.copyLabel}</small>
                  <p>{ch.copyText}</p>
                </>
              )}
            </div>
          </aside>
        </div>
      ))}
    </div>
  );
}
