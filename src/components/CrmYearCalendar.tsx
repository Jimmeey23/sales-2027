import React, { useEffect, useMemo, useState } from 'react';
import { CalendarPlus, Download, Link2, Mail, Megaphone, MessageCircle, Printer, X } from 'lucide-react';
import { api } from '../api';
import { CADENCE_RULES } from '../lib/commsPlan';

/* The whole year's client outreach on one page: twelve month grids with the sends on their
   days, filters by channel and audience, a detail panel for any day, and the plan as a
   calendar file — download, subscribe, or scan the QR on a phone. */

type CrmEvent = {
  uid: string;
  date: string;
  time: string | null;
  month: number;
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
};
type Feed = { events: CrmEvent[]; icsUrl: string; downloadUrl: string; webcalUrl: string; googleUrl: string; qr: string; label: string };

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const ICON: Record<string, React.ReactNode> = {
  whatsapp: <MessageCircle size={11} />,
  email: <Mail size={11} />,
  tent: <Printer size={11} />,
  custom: <Megaphone size={11} />,
};
const SEGMENTS: [string, string][] = [
  ['new', 'New clients'],
  ['members', 'Members / renewals'],
  ['lapsed', 'Lapsed'],
  ['team', 'Team tasks'],
];
const CHANNELS: [string, string][] = [
  ['whatsapp', 'WhatsApp'],
  ['email', 'Email'],
  ['tent', 'Print'],
  ['custom', 'Other'],
];
const pad = (n: number) => String(n).padStart(2, '0');

export default function CrmYearCalendar({ year, studioId, focusMonth }: { year: number; studioId: number | null; focusMonth?: number }) {
  const [feed, setFeed] = useState<Feed | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [channels, setChannels] = useState<string[]>(CHANNELS.map(c => c[0]));
  const [segments, setSegments] = useState<string[]>(SEGMENTS.map(s => s[0]));
  const [day, setDay] = useState<string | null>(null);
  const [share, setShare] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let live = true;
    setFeed(null);
    setError(null);
    api<Feed>(`/calendar/crm?year=${year}${studioId ? `&studio=${studioId}` : ''}`)
      .then(f => live && setFeed(f))
      .catch(e => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [year, studioId]);

  const shown = useMemo(
    () => (feed?.events || []).filter(e => channels.includes(e.channel) && segments.includes(e.segment)),
    [feed, channels, segments],
  );
  const byDay = useMemo(() => {
    const m = new Map<string, CrmEvent[]>();
    for (const e of shown) m.set(e.date, [...(m.get(e.date) || []), e]);
    return m;
  }, [shown]);
  const clientSends = shown.filter(e => e.segment !== 'team').length;
  const toggle = (list: string[], set: (v: string[]) => void, v: string) =>
    set(list.includes(v) ? (list.length > 1 ? list.filter(x => x !== v) : list) : [...list, v]);

  useEffect(() => {
    if (!focusMonth) return;
    const el = document.getElementById(`crmy-m-${focusMonth}`);
    if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [focusMonth, feed]);

  if (error) return <p className="crmy-empty">Could not load the CRM calendar: {error}</p>;
  if (!feed) return <p className="crmy-empty">Building the year’s outreach…</p>;

  const picked = day ? byDay.get(day) || [] : [];

  return (
    <section className="crmy" aria-label={`CRM year calendar ${year}`}>
      <header className="crmy-head">
        <div>
          <small>CRM year · {feed.label}</small>
          <h5>{year} client outreach</h5>
          <p>
            {clientSends} client messages and {shown.length - clientSends} team tasks across the year. Each audience hears
            from the studio at most four times a month.
          </p>
        </div>
        <div className="crmy-export">
          <a className="crmy-btn is-dark" href={feed.googleUrl} target="_blank" rel="noopener noreferrer">
            <CalendarPlus size={13} /> Add to Google Calendar
          </a>
          <a className="crmy-btn" href={feed.downloadUrl}>
            <Download size={13} /> Download .ics
          </a>
          <button type="button" className="crmy-btn" onClick={() => setShare(v => !v)} aria-expanded={share}>
            <Link2 size={13} /> QR &amp; subscribe
          </button>
        </div>
      </header>

      {share && (
        <div className="crmy-share">
          <img src={feed.qr} alt="QR code that downloads the CRM calendar" width={150} height={150} />
          <div>
            <strong>Scan to add the events to your phone’s calendar</strong>
            <p>
              The QR downloads the year’s CRM events as a calendar file — open it and your calendar app imports them. To
              keep it updated as the plan changes, subscribe instead: in Google Calendar choose <b>Other calendars → From
              URL</b> and paste the link below, or tap <b>Add to Google Calendar</b>. Apple Calendar: open the webcal link.
            </p>
            <div className="crmy-link">
              <code>{feed.icsUrl}</code>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(feed.icsUrl).then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  });
                }}
              >
                {copied ? 'Copied' : 'Copy link'}
              </button>
              <a href={feed.webcalUrl}>webcal://</a>
            </div>
            <small>Read-only: send dates, channels and offer names. No client data.</small>
          </div>
        </div>
      )}

      <div className="crmy-filters">
        <div role="group" aria-label="Channels">
          {CHANNELS.map(([k, label]) => (
            <button key={k} type="button" className={channels.includes(k) ? 'is-on' : ''} aria-pressed={channels.includes(k)} onClick={() => toggle(channels, setChannels, k)}>
              <span className={`crmy-dot is-${k}`} /> {label}
            </button>
          ))}
        </div>
        <div role="group" aria-label="Audiences">
          {SEGMENTS.map(([k, label]) => (
            <button key={k} type="button" className={segments.includes(k) ? 'is-on' : ''} aria-pressed={segments.includes(k)} onClick={() => toggle(segments, setSegments, k)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <details className="crmy-rules">
        <summary>How the cadence is kept humane</summary>
        <ul>
          {CADENCE_RULES.map(r => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </details>

      <div className="crmy-body">
        <div className="crmy-grid">
          {MONTHS.map((name, i) => {
            const m = i + 1;
            const first = new Date(year, i, 1);
            const lead = (first.getDay() + 6) % 7;
            const days = new Date(year, m, 0).getDate();
            const count = shown.filter(e => e.date.startsWith(`${year}-${pad(m)}`) && e.segment !== 'team').length;
            return (
              <div key={m} id={`crmy-m-${m}`} className={`crmy-month${focusMonth === m ? ' is-focus' : ''}`}>
                <div className="crmy-month-head">
                  <b>{name}</b>
                  <em>{count} sends</em>
                </div>
                <div className="crmy-dow" aria-hidden="true">
                  {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, k) => (
                    <span key={k}>{d}</span>
                  ))}
                </div>
                <div className="crmy-days">
                  {Array.from({ length: lead }, (_, k) => (
                    <span key={`b${k}`} />
                  ))}
                  {Array.from({ length: days }, (_, k) => {
                    const key = `${year}-${pad(m)}-${pad(k + 1)}`;
                    const list = byDay.get(key) || [];
                    const kinds = [...new Set(list.map(e => e.channel))];
                    return (
                      <button
                        key={key}
                        type="button"
                        className={`crmy-day${list.length ? ' has' : ''}${day === key ? ' is-picked' : ''}`}
                        disabled={!list.length}
                        onClick={() => setDay(day === key ? null : key)}
                        title={list.map(e => `${e.channelName} · ${e.label}${e.audience ? ` — ${e.audience}` : ''}`).join('\n')}
                      >
                        {k + 1}
                        {list.length > 0 && (
                          <i>
                            {kinds.slice(0, 3).map(c => (
                              <span key={c} className={`crmy-dot is-${c}`} />
                            ))}
                          </i>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <aside className={`crmy-detail${day ? ' is-open' : ''}`} aria-live="polite">
          {day ? (
            <>
              <div className="crmy-detail-head">
                <b>{new Date(`${day}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</b>
                <button type="button" onClick={() => setDay(null)} aria-label="Close day">
                  <X size={13} />
                </button>
              </div>
              {picked.map(e => (
                <article key={e.uid} className={`crmy-send is-${e.channel}`}>
                  <span className="crmy-send-top">
                    {ICON[e.channel]} {e.channelName} · {e.label}
                    {e.time && <em>{e.time}</em>}
                  </span>
                  {e.audience && <span className="crmy-aud">{e.audience}{feed.label === 'All locations' ? ` · ${e.studio}` : ''}</span>}
                  {e.goal && <p>{e.goal}</p>}
                  {e.offers.length > 0 && (
                    <ul>
                      {e.offers.map(o => (
                        <li key={o}>{o}</li>
                      ))}
                    </ul>
                  )}
                  {e.message && (
                    <details>
                      <summary>Draft message</summary>
                      <p className="crmy-msg">{e.message}</p>
                    </details>
                  )}
                </article>
              ))}
            </>
          ) : (
            <p className="crmy-hint">Pick a highlighted day to see what goes out, to whom, and with which offers.</p>
          )}
        </aside>
      </div>
    </section>
  );
}
