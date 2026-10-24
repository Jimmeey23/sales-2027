import React, { useId } from 'react';
import type { KeyDateKind } from '../data/keyDates';

type Theme =
  | 'fireworks'
  | 'kite'
  | 'flag'
  | 'heart'
  | 'bloom'
  | 'moon'
  | 'diya'
  | 'ribbon'
  | 'yoga'
  | 'tag'
  | 'gift'
  | 'rain'
  | 'planet'
  | 'water'
  | 'book'
  | 'community'
  | 'braille'
  | 'spark';

const RULES: Array<[RegExp, Theme]> = [
  [/new year|eve\b/i, 'fireworks'],
  [/braille/i, 'braille'],
  [/earth|environment|biodiversity|climate|clean energy/i, 'planet'],
  [/water|ocean|sea|river/i, 'water'],
  [/education|book|literacy|language|learning/i, 'book'],
  [/family|friendship|social justice|peace|humanitarian|human rights|solidarity|community|older persons|youth|play|disabilit|autism|down syndrome|inclusion/i, 'community'],
  [/sankranti|pongal/i, 'kite'],
  [/republic|independence|maharashtra day|rajyotsava|shivaji|gandhi/i, 'flag'],
  [/valentine|heart|friendship|mother|father|raksha/i, 'heart'],
  [/holi|vasant|ganesh/i, 'bloom'],
  [/eid|muharram|bakri/i, 'moon'],
  [/diwali|navratri|dussehra|karva|ram navami|janmashtami|gudi|ugadi|nanak|shivaratri/i, 'diya'],
  [/cancer|women|health|menstrual|mental|diabetes|doctor/i, 'ribbon'],
  [/earth|water|ocean|environment|biodiversity/i, 'bloom'],
  [/yoga/i, 'yoga'],
  [/black friday|cyber/i, 'tag'],
  [/christmas|wedding|party/i, 'gift'],
  [/monsoon/i, 'rain'],
];

// Each theme: [gradient from, gradient to, accent]
const PALETTE: Record<Theme, [string, string, string]> = {
  fireworks: ['#1f1b4d', '#6d3bd2', '#ffd36b'],
  kite: ['#ff9a3d', '#ff4d6d', '#fff2c2'],
  flag: ['#ff9933', '#138808', '#ffffff'],
  heart: ['#ff6b8b', '#c2185b', '#ffe3ea'],
  bloom: ['#ff5fa2', '#7c4dff', '#ffe066'],
  moon: ['#0f2b4a', '#1b7f79', '#ffe9a8'],
  diya: ['#7a1f0e', '#ff8a00', '#ffe27a'],
  ribbon: ['#7b5cd6', '#c06be0', '#ffffff'],
  yoga: ['#2e8b78', '#9bd8a8', '#fff7d6'],
  tag: ['#161616', '#e5322d', '#ffffff'],
  gift: ['#b3202f', '#1f7a4d', '#ffe8a3'],
  rain: ['#2c3e5c', '#5b8fb9', '#d9ecff'],
  planet: ['#0e5660', '#32a58b', '#bbf1c3'],
  water: ['#134b7b', '#27a9bb', '#c7f4f1'],
  book: ['#354c78', '#6c79bd', '#ffe4a8'],
  community: ['#6a3f91', '#d2658f', '#ffe0a8'],
  braille: ['#23486f', '#477fc0', '#fff0bc'],
  spark: ['#31405f', '#6f7fb5', '#ffe9a8'],
};

export const festivalTheme = (name: string, kind: KeyDateKind): Theme =>
  RULES.find(([re]) => re.test(name))?.[1] ?? (kind === 'brand' ? 'spark' : kind === 'retail' ? 'tag' : 'spark');

function Motif({ theme, accent }: { theme: Theme; accent: string }) {
  const f = { fill: accent };
  const s = { fill: 'none', stroke: accent, strokeWidth: 2.5, strokeLinecap: 'round' as const };
  switch (theme) {
    case 'fireworks':
      return (
        <g>
          {[
            [34, 30, 14],
            [78, 22, 10],
            [62, 52, 16],
          ].map(([cx, cy, r], i) => (
            <g key={i} {...s}>
              {Array.from({ length: 8 }, (_, k) => {
                const a = (k / 8) * Math.PI * 2;
                return <line key={k} x1={cx + Math.cos(a) * r * 0.4} y1={cy + Math.sin(a) * r * 0.4} x2={cx + Math.cos(a) * r} y2={cy + Math.sin(a) * r} />;
              })}
            </g>
          ))}
        </g>
      );
    case 'kite':
      return (
        <g>
          <path d="M60 10 L84 34 L60 62 L36 34 Z" {...f} opacity=".95" />
          <path d="M60 10 L60 62 M36 34 L84 34" stroke="#ff4d6d" strokeWidth="1.5" />
          <path d="M60 62 C54 72 66 76 58 86" {...s} />
        </g>
      );
    case 'flag':
      return (
        <g>
          <rect x="30" y="14" width="60" height="12" fill="#ff9933" />
          <rect x="30" y="26" width="60" height="12" fill="#fff" />
          <rect x="30" y="38" width="60" height="12" fill="#138808" />
          <circle cx="60" cy="32" r="4" fill="none" stroke="#1b3a8f" strokeWidth="1.5" />
          <line x1="30" y1="12" x2="30" y2="70" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
        </g>
      );
    case 'heart':
      return <path d="M60 62 C28 40 36 14 54 22 C58 24 60 28 60 28 C60 28 62 24 66 22 C84 14 92 40 60 62Z" {...f} />;
    case 'bloom':
      return (
        <g>
          {[0, 72, 144, 216, 288].map(a => (
            <ellipse key={a} cx="60" cy="24" rx="9" ry="16" {...f} opacity=".9" transform={`rotate(${a} 60 40)`} />
          ))}
          <circle cx="60" cy="40" r="7" fill="#ff7a00" />
        </g>
      );
    case 'moon':
      return (
        <g>
          <path d="M72 14 A28 28 0 1 0 72 66 A22 22 0 1 1 72 14Z" {...f} />
          <path d="M84 24 l3 7 7 .6 -5.4 4.6 1.8 7 -6.4 -3.8 -6.4 3.8 1.8 -7 -5.4 -4.6 7 -.6Z" {...f} />
        </g>
      );
    case 'diya':
      return (
        <g>
          <path d="M34 50 Q60 74 86 50 Q60 58 34 50Z" {...f} />
          <path d="M60 18 C70 30 72 38 60 48 C48 38 50 30 60 18Z" fill="#fff" opacity=".95" />
          <path d="M60 30 C65 36 65 41 60 46 C55 41 55 36 60 30Z" fill="#ff8a00" />
        </g>
      );
    case 'ribbon':
      return (
        <g {...s} strokeWidth="9">
          <path d="M60 18 C40 18 40 44 60 44 C80 44 80 18 60 18Z" />
          <path d="M52 44 L42 70 M68 44 L78 70" />
        </g>
      );
    case 'yoga':
      return (
        <g>
          <circle cx="60" cy="18" r="8" {...f} />
          <path d="M60 28 L60 50 M60 36 L38 24 M60 36 L82 24 M60 50 L44 66 M60 50 L76 66" {...s} strokeWidth="4" />
          <circle cx="60" cy="44" r="30" fill="none" stroke={accent} strokeWidth="1.2" opacity=".5" />
        </g>
      );
    case 'tag':
      return (
        <g>
          <path d="M30 40 L52 18 H88 V54 L66 76 Z" {...f} />
          <circle cx="76" cy="30" r="5" fill="#161616" />
          <text x="54" y="52" fontSize="16" fontWeight="800" fill="#e5322d" transform="rotate(-10 54 52)">%</text>
        </g>
      );
    case 'gift':
      return (
        <g>
          <rect x="34" y="34" width="52" height="34" rx="3" {...f} />
          <rect x="30" y="26" width="60" height="12" rx="3" {...f} opacity=".85" />
          <path d="M60 26 V68" stroke="#b3202f" strokeWidth="5" />
          <path d="M60 26 C48 8 36 20 60 26 C84 20 72 8 60 26Z" {...s} />
        </g>
      );
    case 'rain':
      return (
        <g {...s}>
          <path d="M34 40 C28 40 26 30 36 28 C38 16 58 14 62 26 C74 22 86 30 80 40Z" {...f} stroke="none" />
          {[42, 56, 70].map(x => (
            <line key={x} x1={x} y1="50" x2={x - 5} y2="66" />
          ))}
        </g>
      );
    case 'planet':
      return (
        <g>
          <circle cx="60" cy="40" r="28" fill={accent} opacity=".24" />
          <circle cx="60" cy="40" r="25" fill="none" stroke={accent} strokeWidth="3" />
          <path d="M43 29l8-5 7 3 1 7-6 4-2 7-7 1-4-8zm22-7 9 4 5 8-5 4-6-3-2-6-5-2zm-5 25 8-4 8 3-2 9-8 6-6-5z" {...f} />
          <path d="M23 43c10-11 18-14 28-14m17 24c9-5 15-7 27-4" {...s} opacity=".55" />
        </g>
      );
    case 'water':
      return (
        <g>
          <circle cx="87" cy="23" r="11" {...f} opacity=".8" />
          {[43, 56, 69].map((y, i) => <path key={y} d={`M22 ${y}c10-9 20 9 30 0s20 9 30 0 20 9 32 0`} {...s} strokeWidth={i === 1 ? 4 : 2.5} opacity={i === 1 ? .95 : .65} />)}
          <path d="M44 19c-8 10-9 14-4 19 5 4 13 1 13-5 0-4-4-9-9-14z" {...f} />
        </g>
      );
    case 'book':
      return (
        <g>
          <path d="M22 25c14-5 27-3 38 5v35c-11-8-24-10-38-5zm76 0c-14-5-27-3-38 5v35c11-8 24-10 38-5z" {...f} />
          <path d="M60 30v35M30 34c9-2 17 0 23 4M90 34c-9-2-17 0-23 4M30 44c9-2 17 0 23 4M90 44c-9-2-17 0-23 4" {...s} strokeWidth="2" />
          <path d="M26 68h68" {...s} opacity=".55" />
        </g>
      );
    case 'community':
      return (
        <g>
          <circle cx="60" cy="22" r="9" {...f} />
          <circle cx="34" cy="34" r="7" {...f} opacity=".8" />
          <circle cx="86" cy="34" r="7" {...f} opacity=".8" />
          <path d="M43 66c1-17 7-27 17-27s16 10 17 27zm-25 0c0-13 5-21 15-22 5 0 9 2 12 6-4 5-6 10-7 16zm57-16c3-4 7-6 12-6 10 1 15 9 15 22H82c-1-6-3-11-7-16z" {...f} />
          <path d="M54 49c3-4 9-4 12 0l-6 7z" fill="#fff" opacity=".9" />
        </g>
      );
    case 'braille':
      return (
        <g>
          {[0, 1, 2].map(row => [0, 1].map(col => <circle key={`${row}-${col}`} cx={48 + col * 24} cy={22 + row * 19} r="5.5" {...f} />))}
          <path d="M31 70h58" {...s} strokeWidth="3" opacity=".6" />
        </g>
      );
    default:
      return (
        <g {...f}>
          <path d="M60 12 L66 34 L88 40 L66 46 L60 68 L54 46 L32 40 L54 34Z" />
          <circle cx="86" cy="16" r="3" />
          <circle cx="30" cy="62" r="2.5" />
        </g>
      );
  }
}

// A small illustrated tile for a festival or moment. Drawn in code so it needs no image files or network access.
export default function FestivalArt({ name, kind, className = '' }: { name: string; kind: KeyDateKind; className?: string }) {
  const id = useId().replace(/:/g, '');
  const theme = festivalTheme(name, kind);
  const [a, b, accent] = PALETTE[theme];
  return (
    <svg className={`fest-art ${className}`} viewBox="0 0 120 80" role="img" aria-label={`${name} illustration`} preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={a} />
          <stop offset="1" stopColor={b} />
        </linearGradient>
      </defs>
      <rect width="120" height="80" fill={`url(#g${id})`} />
      <circle cx="104" cy="8" r="26" fill="#fff" opacity=".08" />
      <circle cx="10" cy="76" r="30" fill="#000" opacity=".1" />
      <Motif theme={theme} accent={accent} />
    </svg>
  );
}
