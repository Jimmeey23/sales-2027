import React, { useMemo, useState } from 'react';
import { ArrowRight, CalendarClock, Mail, MessageCircle, Printer } from 'lucide-react';
import { MONTHS } from '../types';

// Marketing & collaterals for one studio-month: one row per channel (WhatsApp, email, in-studio tent card), each
// with a production-style sample built from the chosen offer and Physique 57 India photography, and the specs,
// deadline and brand-voice copy the studio team needs beside it. Everything is derived from the offer, so switching
// or replacing an offer rewrites the creatives and copy.

const SLOT_LABEL: Record<string, string> = { newcomer: 'New to Physique 57', lapsed: 'Welcome back', renewal: 'Members only' };

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
  square: [['overlay', 'Full bleed'], ['split', 'Split panel'], ['frame', 'Editorial frame'], ['duotone', 'Duotone']],
  email: [['overlay', 'Cinematic'], ['split', 'Split hero'], ['arch', 'Arch window']],
  tent: [['classic', 'Classic'], ['full', 'Full bleed'], ['arch', 'Arch']],
} as const;
type Piece = keyof typeof LAYOUTS;

// Offer wording → the kind of picture that sells it.
const THEMES: [RegExp, string][] = [
  [/cycle|ride|spin|power ?cycle/, 'cycle'],
  [/friend|duo|pair|squad|refer|bring|together|couple|sister|mother/, 'duo'],
  [/strength|lift|fit\b|hiit|sculpt|power/, 'strength'],
  [/reset|consult|prenatal|mama|matern|calm|stretch|recover|wellness/, 'calm'],
  [/barre|first class|trial|intro|welcome/, 'barre'],
];

const VOICE = {
  newcomer: {
    headlines: ['Your first shake starts here.', 'Fifty-seven minutes. A whole new you.', 'Lift. Tuck. Shake. Repeat.', 'Strong looks good on you.'],
    intro: (o: string, s: string) =>
      `Physique 57 is 57 minutes of small, precise movements that work every muscle to the point of the shake. ${o} is the easiest way to start at ${s}, with instructors who will meet you exactly where you are.`,
    subjects: (o: string, m: string) => [`Meet the shake: ${o}`, '57 minutes. Your new favourite hour.', `${m} starts at the barre`, 'New to Physique 57? This one is for you'],
    preheaders: ['Small moves, serious results — your first step is sorted.', 'Book your spot before the month runs out.'],
    cta: 'Book my first class',
    wa: 'Reply YES and we’ll save your spot at the barre.',
  },
  lapsed: {
    headlines: ['Your spot at the barre is waiting.', 'Missed you at the barre.', 'Back to the shake.', 'Pick up where you left off.'],
    intro: (o: string, s: string) =>
      `It’s been a while, and your body remembers more than you think. ${o} brings you back to ${s} with everything you need to find your rhythm again — no pressure, just the shake.`,
    subjects: (o: string, m: string) => ['Your spot at the barre is still yours', `We saved you a mat this ${m}`, `Come back to the shake: ${o}`, 'It’s been a while. Let’s fix that.'],
    preheaders: ['A comeback offer, made for returning members.', 'Same studio, same shake, a softer way back in.'],
    cta: 'Claim my comeback',
    wa: 'Reply YES and we’ll hold a mat for your first class back.',
  },
  renewal: {
    headlines: ['Keep the shake going.', 'Stronger, every single month.', 'Your results are just getting started.', 'Thank you for showing up.'],
    intro: (o: string, s: string) =>
      `You’ve put in the work, and it shows. ${o} keeps your momentum going at ${s} — the community, the instructors and the results you’ve earned.`,
    subjects: (o: string, m: string) => [`Keep the shake going: ${o}`, 'Your results called. They want more.', `A thank-you for staying, this ${m}`, 'Renew now, before your plan runs out'],
    preheaders: ['A members-only thank-you for renewing early.', 'Lock in your next chapter at the barre.'],
    cta: 'Renew my membership',
    wa: 'Reply YES and we’ll renew you before your plan runs out.',
  },
} as const;

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const fmtDay = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;
// Public creatives never quote prices or discount numbers: drop rupee amounts and % figures from offer wording.
const noPrice = (s: string) =>
  s
    .replace(/\s*\([^)]*(₹|%)[^)]*\)/g, '')
    .replace(/\s*(at|for|from|of|worth)?\s*₹\s?[\d.,]+\s?(k|l|lakh)?/gi, '')
    .replace(/\b\d+(\.\d+)?%\s*off\b/gi, 'a member saving')
    .replace(/\b\d+(\.\d+)?%\s*of\b/gi, 'part of')
    .replace(/\b(the )?standing \d+(\.\d+)?%/gi, 'the standing perk')
    .replace(/\s*\d+(\.\d+)?%/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

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

export default function MarketingCollaterals({
  offers,
  studioName,
  city,
  year,
  month,
  theme,
  hook,
}: {
  offers: any[];
  studioName: string;
  city: string;
  year: number;
  month: number;
  theme: string;
  hook?: string;
}) {
  const [pickId, setPickId] = useState<number | null>(null);
  const [layoutPick, setLayoutPick] = useState<Record<string, string>>({});
  const offer = offers.find(o => o.id === pickId) || offers[0];
  const slot = (offer?.plan_slot as keyof typeof VOICE) in VOICE ? (offer.plan_slot as keyof typeof VOICE) : 'newcomer';
  const shots = useMemo(() => (offer ? pickPhotos(offer, slot, month, studioName) : []), [offer, slot, month, studioName]);

  if (!offer)
    return (
      <div className="mw-section col-section">
        <div className="col-head">
          <div><h4>Marketing &amp; collaterals needed</h4></div>
        </div>
        <p className="muted">Pick this month’s offers to see the WhatsApp, email and tent card requirements and samples.</p>
      </div>
    );

  const v = VOICE[slot];
  const monthName = MONTHS[month - 1];
  const end = new Date(year, month, 0);
  const due = (lead: number) => fmtDay(new Date(year, month - 1, 1 - lead));
  const n = Math.max(1, offers.length);
  const seed = hash(`${offer.id}${month}`);
  const tagline = String(offer.customer_copy || '').trim();
  const headline = tagline && tagline.length <= 46 ? tagline : v.headlines[seed % v.headlines.length];
  const altHead = v.headlines[(seed + 1) % v.headlines.length];
  const detail = noPrice(String(offer.benefit || offer.headline || ''));
  const offerName = clip(String(offer.name), 44);
  const kicker = `${SLOT_LABEL[slot]} · ${monthName}`;
  const closes = `Until ${fmtDay(end)}`;
  const intro = v.intro(offer.name, studioName);
  const subjects = v.subjects(offerName, monthName);
  const waCopy = `Hi {first_name} ✨\n\n*${headline}*\n*${offer.name}*: ${clip(detail, 110)}\n\n${v.wa} Until ${fmtDay(end)}, ${studioName}.\n\n— Team Physique 57\nReply STOP to opt out`;
  const bg = (p: Photo) => ({ backgroundImage: `url(/p57/pro/${p.id}.jpg)`, backgroundPosition: p.pos });
  const Photo = ({ p }: { p: Photo }) => <div className="cr-photo" style={bg(p)} />;
  const layout = (piece: Piece) =>
    layoutPick[`${offer.id}:${piece}`] ?? LAYOUTS[piece][(seed + month + Object.keys(LAYOUTS).indexOf(piece)) % LAYOUTS[piece].length][0];
  const Layouts = ({ piece }: { piece: Piece }) => (
    <div className="cr-layouts" role="radiogroup" aria-label="Layout">
      {LAYOUTS[piece].map(([k, label]) => (
        <button key={k} type="button" role="radio" aria-checked={layout(piece) === k} className={layout(piece) === k ? 'is-on' : ''}
          onClick={() => setLayoutPick(s => ({ ...s, [`${offer.id}:${piece}`]: k }))}>{label}</button>
      ))}
    </div>
  );

  const Logo = ({ light = false }: { light?: boolean }) => (
    <img className="cr-logo" src={light ? '/p57/logo-light.png' : '/p57/logo.png'} alt="Physique 57 India" />
  );
  const Spec = ({ title, icon: Icon, lead, items, copy }: { title: string; icon: any; lead: number; items: string[]; copy?: React.ReactNode }) => (
    <aside className="col-spec">
      <header>
        <span><Icon size={15} /></span>
        <b>{title}</b>
        <i><CalendarClock size={12} /> Final by {due(lead)}</i>
      </header>
      <ul>{items.map(t => <li key={t}>{t}</li>)}</ul>
      {copy && <div className="col-copy">{copy}</div>}
    </aside>
  );

  return (
    <div className="mw-section col-section">
      <div className="col-head">
        <div>
          <small>{theme || monthName} · {studioName}</small>
          <h4>Marketing &amp; collaterals needed</h4>
          <p className="muted">{hook || 'Everything the studio team needs to launch this month’s offers, with a sample of each piece.'}</p>
        </div>
      </div>
      <div className="col-tabs" role="tablist" aria-label="Offer to preview">
        {(['newcomer', 'lapsed', 'renewal'] as const).map(k => {
          const list = offers.filter(o => (o.plan_slot in VOICE ? o.plan_slot : 'newcomer') === k);
          if (!list.length) return null;
          return (
            <div key={k} className={`col-tab-group is-${k}`}>
              <span>{SLOT_LABEL[k]}</span>
              {list.map(o => (
                <button key={o.id} role="tab" aria-selected={o.id === offer.id} className={o.id === offer.id ? 'is-on' : ''} onClick={() => setPickId(o.id)}>
                  {o.name}
                </button>
              ))}
            </div>
          );
        })}
      </div>

      {/* WhatsApp: A4 portrait creative, previewed as the received message */}
      <div className="col-row">
        <div className="cr-stage">
        <div className="wa-phone">
          <div className="wa-bar">
            <span className="wa-back">‹</span>
            <span className="wa-av"><img src="/p57/logo-light.png" alt="" /></span>
            <div><b>Physique 57 India <i className="wa-tick">✓</i></b><small>Business account</small></div>
          </div>
          <div className="wa-chat">
            <span className="wa-day">Today</span>
            <div className="wa-bubble">
        <figure className={`cr-square is-${layout('square')}`}>
          <Photo p={shots[0]} />
          <div className="cr-shade" />
          <header><Logo light /><span>{city}</span></header>
          <div className="cr-body">
            <small>{kicker}</small>
            <h3>{headline}</h3>
            <p>{offerName}</p>
          </div>
          <footer>
            <span className="cr-value"><b>57</b><em>min</em></span>
            <div><strong>Reply YES to book</strong><span>{closes} · {studioName}</span></div>
          </footer>
        </figure>
              <p className="wa-text">{waCopy.split(/(\*[^*]+\*)/).map((t, i) => (t.startsWith('*') ? <b key={i}>{t.slice(1, -1)}</b> : t))}</p>
              <span className="wa-time">9:00 AM</span>
            </div>
            <div className="wa-buttons"><span>Book my spot</span><span>Stop promotions</span></div>
          </div>
          <div className="wa-input"><span>Message</span><i /></div>
        </div>
        <Layouts piece="square" />
        </div>
        <Spec
          title="WhatsApp broadcast"
          icon={MessageCircle}
          lead={10}
          items={[
            `${n} broadcast${n > 1 ? 's' : ''} (one per offer) + 1 reminder 48h before close`,
            'A4 portrait creative (2480×3508 px, sent at 1240×1754), text ≤ 20% of image',
            'Message ≤ 450 characters, one link, opt-out line',
            'Business template submitted for approval 3 days ahead',
          ]}
          copy={<><small>Send window</small><p>Tue–Thu, 9–11 am or 6–8 pm. Reminder 48h before {fmtDay(end)}.</p></>}
        />
      </div>

      {/* Email: 600px template */}
      <div className="col-row">
        <div className="cr-stage">
        <figure className={`cr-email is-${layout('email')}`}>
          <div className="cr-hero">
            <Photo p={shots[1]} />
            <div className="cr-shade" />
            <header><Logo light={layout('email') !== 'arch'} /><span>{studioName} · {city}</span></header>
            <div className="cr-hero-text">
              <small>{kicker}</small>
              <h3>{altHead}</h3>
            </div>
          </div>
          <div className="cr-mail-body">
            <h4>{offer.name}</h4>
            <p>{clip(detail, 120)}</p>
            <span className="cr-cta">{v.cta} <ArrowRight size={13} /></span>
            <small className="cr-mail-fine">Until {fmtDay(end)} · {studioName}, {city} · Unsubscribe</small>
          </div>
        </figure>
        <Layouts piece="email" />
        </div>
        <Spec
          title="Email"
          icon={Mail}
          lead={12}
          items={[
            `1 launch email featuring all ${n} offer${n > 1 ? 's' : ''} + 1 last-chance email`,
            'A4 portrait creative (2480×3508 px), exported at 600 px wide for the template, dark-mode safe',
            'Subject ≤ 45 characters + preheader ≤ 90 characters',
            'Segmented sends: new leads, lapsed 61–365 days, renewals due',
          ]}
          copy={
            <>
              <small>Subject line options</small>
              <ol className="col-subjects">{subjects.map(s => <li key={s}>{s}</li>)}</ol>
              <small>Preheader</small>
              <p>{v.preheaders.join(' / ')}</p>
              <small>Opening line</small>
              <p>{intro}</p>
            </>
          }
        />
      </div>

      {/* Tent card: A4 portrait, shown standing on the reception counter */}
      <div className="col-row is-tent">
        <div className="cr-stage">
        <div className="cr-tent-stage">
          <figure className={`cr-tent is-${layout('tent')}`}>
            <div className="cr-tent-photo" style={bg(shots[2])}>
              <span className="cr-badge cr-value"><b>{monthName.slice(0, 3)}</b><em>only</em></span>
            </div>
            <div className="cr-tent-body">
              <Logo />
              <small>{kicker}</small>
              <h3>{headline}</h3>
              <p><b>{offerName}.</b> {clip(detail, 80)}</p>
              <div className="cr-tent-foot">
                <div className="cr-qr" aria-hidden="true">{Array.from({ length: 49 }, (_, i) => <i key={i} className={(i * 7 + month * 3 + i * i) % 3 ? '' : 'on'} />)}</div>
                <div><b>Scan to claim</b><span>Or ask at reception · {closes}</span></div>
              </div>
            </div>
          </figure>
        </div>
        <Layouts piece="tent" />
        </div>
        <Spec
          title="In-studio tent card"
          icon={Printer}
          lead={15}
          items={[
            `${n} designs, double-sided A4 (210×297 mm) on 350 gsm matte, folded into an A-frame`,
            `Quantity: ${4 * n} per studio (reception, changing room, two on the floor)`,
            'QR to the Momence checkout with a tracking tag per offer',
            'Printed and placed by the 25th of the previous month',
          ]}
          copy={<><small>Front</small><p>{headline}</p><small>Back</small><p>{offer.name}. {detail} {v.wa.replace('Reply YES and', 'Ask at reception and')}</p></>}
        />
      </div>
    </div>
  );
}
