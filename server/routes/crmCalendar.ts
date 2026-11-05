import crypto from 'node:crypto';
import QRCode from 'qrcode';
import type { Express, Request } from 'express';
import { asyncRoute, bodyError, id } from '../http.js';
import { canAccessStudio } from '../lib/auth.js';
import { crmEvents, crmIcs } from '../lib/crmCalendar.js';

/* The CRM plan as a calendar.
   · Public, behind a signed token: the .ics feed (subscribe/import) — read-only send dates,
     channels and offer names, no member data — so a phone that scans the QR needs no login.
   · Behind the session: the events as JSON for the year grid, plus the signed links and QR. */

const SECRET = process.env.CALENDAR_SECRET || process.env.MEMBER_HASH_SALT || 'p57-calendar-feed';
const tokenFor = (year: number, studio: number | null) =>
  crypto.createHmac('sha256', SECRET).update(`crm:${year}:${studio ?? 'all'}`).digest('base64url').slice(0, 32);
const verify = (year: number, studio: number | null, token: unknown) => {
  const expected = tokenFor(year, studio);
  const given = String(token ?? '');
  return given.length === expected.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));
};
const parseScope = (raw: unknown) => (raw === undefined || raw === '' || raw === 'all' ? null : id(raw));
const parseYear = (raw: unknown) => {
  const year = Number(raw || 2027);
  if (!Number.isInteger(year) || year < 2020 || year > 2100) throw bodyError('Invalid planning year.');
  return year;
};
const originOf = (req: Request) => {
  const proto = (req.headers['x-forwarded-proto'] as string)?.split(',')[0] || req.protocol || 'https';
  const host = (req.headers['x-forwarded-host'] as string)?.split(',')[0] || req.get('host');
  return `${proto}://${host}`;
};

export function registerPublicCrmCalendarRoutes(app: Express) {
  app.get('/api/calendar/crm.ics', (req, res) => {
    const year = parseYear(req.query.year),
      studio = parseScope(req.query.studio);
    if (!verify(year, studio, req.query.token)) throw bodyError('This calendar link is not valid.', 403);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `${req.query.download ? 'attachment' : 'inline'}; filename="p57-crm-${year}.ics"`);
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.send(crmIcs(year, studio));
  });
}

export default function registerCrmCalendarRoutes(app: Express) {
  app.get('/api/calendar/crm', asyncRoute(async (req: any, res: any) => {
    const year = parseYear(req.query.year),
      studio = parseScope(req.query.studio);
    if (studio && !canAccessStudio(req.user, studio)) throw bodyError('No access to that studio.', 403);
    const { events, studios } = crmEvents(year, studio);
    const token = tokenFor(year, studio);
    const query = `year=${year}${studio ? `&studio=${studio}` : ''}&token=${encodeURIComponent(token)}`;
    const origin = originOf(req);
    const icsUrl = `${origin}/api/calendar/crm.ics?${query}`;
    const downloadUrl = `${icsUrl}&download=1`;
    const webcalUrl = icsUrl.replace(/^https?:\/\//, 'webcal://');
    const googleUrl = `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcalUrl)}`;
    const qr = await QRCode.toDataURL(downloadUrl, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 300,
      color: { dark: '#17130dff', light: '#ffffffff' },
    });
    res.json({ year, studio, label: studio ? studios[0] || 'Studio' : 'All locations', events, icsUrl, downloadUrl, webcalUrl, googleUrl, qr });
  }));
}
