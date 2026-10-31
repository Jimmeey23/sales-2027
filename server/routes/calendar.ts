import crypto from 'node:crypto';
import QRCode from 'qrcode';
import type { Express, Request } from 'express';
import { db } from '../db.js';
import { bodyError, id } from '../http.js';
import { keyDatesFor, KEY_DATE_LABELS } from '../../src/data/keyDates.js';
import { studioScopeIds } from '../lib/studios.js';

/* The 2027 plan as a calendar feed.

   Two things are served here:
   · an .ics feed of every offer, campaign and studio moment in the plan, so a phone can
     subscribe to it once and see the year update itself;
   · a one-page "add to calendar" sheet behind a signed token, which is what the QR code
     in the Sales Plan points at. Scanning lands on a page with a single Google Calendar
     button (and a .ics download for Apple/Outlook), so nobody has to retype a webcal URL.

   The feed is read-only and contains campaign dates and offer names only — no member,
   transaction or revenue-target data — which is why it can be reached without a session
   when the signed token is present. */

const SECRET = process.env.CALENDAR_SECRET || process.env.MEMBER_HASH_SALT || 'p57-calendar-feed';

const sign = (payload: string) =>
  crypto.createHmac('sha256', SECRET).update(payload).digest('base64url').slice(0, 32);

const tokenFor = (year: number, studio: number | null) => sign(`${year}:${studio ?? 'all'}`);

const verify = (year: number, studio: number | null, token: unknown) => {
  const expected = tokenFor(year, studio);
  const given = String(token ?? '');
  return given.length === expected.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));
};

type CalEvent = {
  uid: string;
  kind: 'offer' | 'activation' | 'moment';
  title: string;
  detail: string;
  location: string;
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD, inclusive
};

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
const lastDay = (y: number, m: number) => new Date(y, m, 0).getDate();
const addDays = (date: string, days: number) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
const inr = (v: any) =>
  Number.isFinite(Number(v)) && Number(v) !== 0 ? `₹${Math.round(Number(v)).toLocaleString('en-IN')}` : null;

/** Every offer, campaign and moment in the plan for a year, in date order. */
export function planEvents(year: number, studio: number | null): { events: CalEvent[]; studioNames: string[] } {
  const studios = db.prepare('SELECT id,name,city FROM studios ORDER BY id').all() as any[];
  const scope = studio ? studioScopeIds(db, studio) : studios.filter(s => !['Copper + Cloves', 'Plash Pilates', 'Outdoor / Unassigned'].includes(s.name)).map(s => s.id);
  const names = studios.filter(s => scope.includes(s.id)).map(s => s.name);
  const byId = new Map(studios.map(s => [s.id, s]));
  const events: CalEvent[] = [];

  const offers = db
    .prepare(
      `SELECT o.id,o.name,o.month,o.studio_id,o.audience,o.benefit,o.validity_start,o.validity_end,
              o.expected_revenue,o.target_purchases,o.financials,o.plan_slot
       FROM offers o WHERE o.year=? AND o.studio_id IN (${scope.map(() => '?').join(',') || 'NULL'})
         AND o.month IS NOT NULL AND o.status NOT IN ('archived','rejected')
       ORDER BY o.month,o.id`,
    )
    .all(year, ...scope) as any[];
  for (const offer of offers) {
    const financials = (() => {
      try {
        return JSON.parse(offer.financials || '{}');
      } catch {
        return {};
      }
    })();
    const start = offer.validity_start || iso(year, offer.month, 1);
    const end = offer.validity_end || iso(year, offer.month, lastDay(year, offer.month));
    const money = [inr(financials.offerPrice ?? financials.listPrice), inr(offer.expected_revenue)].filter(Boolean);
    events.push({
      uid: `offer-${offer.id}@p57`,
      kind: 'offer',
      title: offer.name,
      detail: [
        offer.audience ? `For: ${offer.audience}` : null,
        offer.benefit || null,
        money.length ? `Price / revenue: ${money.join(' · ')}` : null,
        offer.target_purchases ? `${offer.target_purchases} units` : null,
        byId.get(offer.studio_id)?.name ? `Location: ${byId.get(offer.studio_id)!.name}` : null,
      ]
        .filter(Boolean)
        .join('\n'),
      location: byId.get(offer.studio_id)?.name || '',
      start,
      end,
    });
  }

  const plans = db
    .prepare(
      `SELECT studio_id,month,theme,objective,content FROM monthly_plans
       WHERE year=? AND studio_id IN (${scope.map(() => '?').join(',') || 'NULL'})`,
    )
    .all(year, ...scope) as any[];
  for (const plan of plans) {
    const content = (() => {
      try {
        return JSON.parse(plan.content || '{}');
      } catch {
        return {};
      }
    })();
    const moment = content?.approvedPlan?.moment || content?.approvedPlan?.hook || '';
    const activations = content?.activations
      ? Object.values(content.activations as Record<string, any>)
          .map(a => (typeof a?.title === 'string' ? a.title : null))
          .filter(Boolean)
      : [];
    events.push({
      uid: `campaign-${plan.studio_id}-${plan.month}@p57`,
      kind: 'activation',
      title: `${byId.get(plan.studio_id)?.name || 'Studio'} · ${plan.theme || `Month ${plan.month}`}`,
      detail: [plan.objective, moment, activations.length ? `Activations: ${activations.join(', ')}` : null]
        .filter(Boolean)
        .join('\n'),
      location: byId.get(plan.studio_id)?.name || '',
      start: iso(year, plan.month, 1),
      end: iso(year, plan.month, lastDay(year, plan.month)),
    });
  }

  // The dates that move a studio month — festivals, awareness days, the brand's own
  // anniversary — belong in the calendar even when no offer is attached to them yet.
  for (let month = 1; month <= 12; month++) {
    for (const date of keyDatesFor(year, month)) {
      events.push({
        uid: `moment-${year}-${month}-${date.day}-${date.name.replace(/\W+/g, '-').toLowerCase()}@p57`,
        kind: 'moment',
        title: `${date.name}${date.approx ? ' (date to confirm)' : ''}`,
        detail: [KEY_DATE_LABELS[date.kind], date.note].filter(Boolean).join('\n'),
        location: 'All studios',
        start: iso(year, month, date.day),
        end: iso(year, month, date.end || date.day),
      });
    }
  }

  events.sort((a, b) => a.start.localeCompare(b.start) || a.title.localeCompare(b.title));
  return { events, studioNames: names };
}

const escapeText = (value: string) =>
  value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** RFC 5545 wants lines folded at 75 octets; long descriptions otherwise break strict clients. */
const fold = (line: string) => {
  const bytes = Buffer.from(line, 'utf8');
  if (bytes.length <= 73) return line;
  const out: string[] = [];
  let chunk = '';
  for (const char of line) {
    if (Buffer.byteLength(chunk + char, 'utf8') > 73) {
      out.push(chunk);
      chunk = char;
    } else chunk += char;
  }
  if (chunk) out.push(chunk);
  return out.join('\r\n ');
};

export function calendarFeed(year: number, studio: number | null) {
  const { events, studioNames } = planEvents(year, studio);
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const label = studio ? studioNames[0] || 'Studio' : 'All locations';
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Physique 57 India//Sales Intelligence Studio//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(`P57 ${year} plan · ${label}`)}`,
    `X-WR-CALDESC:${escapeText(`Offers, campaigns and studio moments from the ${year} sales plan.`)}`,
    'X-WR-TIMEZONE:Asia/Kolkata',
    'REFRESH-INTERVAL;VALUE=DURATION:PT12H',
    'X-PUBLISHED-TTL:PT12H',
  ];
  for (const event of events) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${event.uid}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${event.start.replace(/-/g, '')}`,
      // DTEND for an all-day event is exclusive, so a one-day event ends the next day.
      `DTEND;VALUE=DATE:${addDays(event.end, 1).replace(/-/g, '')}`,
      `SUMMARY:${escapeText(event.title)}`,
      `DESCRIPTION:${escapeText(event.detail)}`,
      `LOCATION:${escapeText(event.location)}`,
      `CATEGORIES:${event.kind === 'offer' ? 'Offer' : event.kind === 'activation' ? 'Campaign' : 'Studio moment'}`,
      'TRANSP:TRANSPARENT',
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}

const originOf = (req: Request) => {
  const proto = (req.headers['x-forwarded-proto'] as string)?.split(',')[0] || req.protocol || 'https';
  const host = (req.headers['x-forwarded-host'] as string)?.split(',')[0] || req.get('host');
  return `${proto}://${host}`;
};

const parseScope = (raw: unknown) => (raw === undefined || raw === '' || raw === 'all' ? null : id(raw));

/** Public: the feed itself, the add-to-calendar sheet and the QR image. */
export function registerPublicCalendarRoutes(app: Express) {
  app.get('/api/calendar/plan.ics', (req, res) => {
    const year = Number(req.query.year || 2027),
      studio = parseScope(req.query.studio);
    if (!Number.isInteger(year) || year < 2020 || year > 2100) throw bodyError('Invalid planning year.');
    if (!verify(year, studio, req.query.token)) throw bodyError('This calendar link is not valid.', 403);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `inline; filename="p57-plan-${year}.ics"`);
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.send(calendarFeed(year, studio));
  });

  app.get('/api/calendar/add', (req, res) => {
    const year = Number(req.query.year || 2027),
      studio = parseScope(req.query.studio);
    if (!verify(year, studio, req.query.token)) throw bodyError('This calendar link is not valid.', 403);
    const { events, studioNames } = planEvents(year, studio);
    const label = studio ? studioNames[0] || 'Studio' : 'All locations';
    const origin = originOf(req);
    const query = `year=${year}${studio ? `&studio=${studio}` : ''}&token=${encodeURIComponent(String(req.query.token))}`;
    const icsUrl = `${origin}/api/calendar/plan.ics?${query}`;
    const offers = events.filter(e => e.kind === 'offer').length;
    const campaigns = events.filter(e => e.kind === 'activation').length;
    const moments = events.filter(e => e.kind === 'moment').length;
    const google = `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(
      icsUrl.replace(/^https?:\/\//, 'webcal://'),
    )}`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>P57 ${year} plan · ${label}</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 28px 20px;
    background: radial-gradient(120% 90% at 50% 0%, #fdfbf7, #f1ede4);
    font-family: 'Instrument Sans', ui-sans-serif, system-ui, sans-serif; color: #1b1a16; }
  main { width: 100%; max-width: 430px; background: #fff; border: 1px solid #e8e2d6; border-radius: 16px;
    padding: 26px 24px 24px; box-shadow: 0 18px 44px rgba(27, 26, 22, 0.1); }
  .eyebrow { font-size: 10px; font-weight: 650; letter-spacing: 0.2em; text-transform: uppercase; color: #837e74; }
  h1 { font-family: Fraunces, Georgia, serif; font-size: 27px; font-weight: 500; letter-spacing: -0.02em; margin: 6px 0 4px; }
  p { font-size: 13.5px; line-height: 1.55; color: #67635a; margin: 0 0 18px; }
  dl { display: flex; gap: 18px; margin: 0 0 20px; padding: 14px 0; border-top: 1px solid #efe9dd; border-bottom: 1px solid #efe9dd; }
  dl div { display: flex; flex-direction: column; gap: 2px; }
  dt { font-size: 9.5px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: #837e74; }
  dd { margin: 0; font-family: Fraunces, Georgia, serif; font-size: 21px; }
  a.btn { display: block; text-align: center; text-decoration: none; border-radius: 10px; padding: 14px 16px; font-weight: 600; font-size: 14px; }
  a.primary { background: #1b1a16; color: #fdfbf7; }
  a.secondary { margin-top: 10px; border: 1px solid #ded7c9; color: #1b1a16; }
  small { display: block; margin-top: 16px; font-size: 11.5px; line-height: 1.5; color: #837e74; }
</style></head>
<body><main>
  <span class="eyebrow">Physique 57 India · ${year} sales plan</span>
  <h1>${label}</h1>
  <p>Every offer window, campaign and studio moment for the year, ready to subscribe to. Nothing here is membership or revenue data.</p>
  <dl>
    <div><dt>Offers</dt><dd>${offers}</dd></div>
    <div><dt>Campaigns</dt><dd>${campaigns}</dd></div>
    <div><dt>Moments</dt><dd>${moments}</dd></div>
  </dl>
  <a class="btn primary" href="${google}" rel="noopener">Add to Google Calendar</a>
  <a class="btn secondary" href="${icsUrl}" download>Download .ics (Apple, Outlook)</a>
  <small>Google Calendar opens with the feed ready to subscribe — press <b>Add calendar</b>. It then refreshes itself as the plan changes.</small>
</main></body></html>`);
  });
}

/** Behind the session: the shareable link and its QR, for the Sales Plan. */
export default function registerCalendarRoutes(app: Express) {
  app.get('/api/calendar/share', async (req, res) => {
    const year = Number(req.query.year || 2027),
      studio = parseScope(req.query.studio);
    if (!Number.isInteger(year) || year < 2020 || year > 2100) throw bodyError('Invalid planning year.');
    const token = tokenFor(year, studio);
    const origin = originOf(req);
    const query = `year=${year}${studio ? `&studio=${studio}` : ''}&token=${encodeURIComponent(token)}`;
    const addUrl = `${origin}/api/calendar/add?${query}`;
    const icsUrl = `${origin}/api/calendar/plan.ics?${query}`;
    const { events, studioNames } = planEvents(year, studio);
    const counts = {
      offers: events.filter(e => e.kind === 'offer').length,
      campaigns: events.filter(e => e.kind === 'activation').length,
      moments: events.filter(e => e.kind === 'moment').length,
    };
    const qr = await QRCode.toDataURL(addUrl, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 320,
      color: { dark: '#1b1a16ff', light: '#ffffffff' },
    });
    res.json({ year, studio, label: studio ? studioNames[0] || 'Studio' : 'All locations', addUrl, icsUrl, qr, counts });
  });
}
