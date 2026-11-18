import React from 'react';
import '../styles/receipt-offer-art.css';

/* Reference visuals for the April 2027 offers ("Nine Years. We Kept The Receipts."). Each offer
   gets a small animated scene drawn in SVG, so the art ships with the app, scales cleanly and
   follows the receipt voice: paper, ink, a stamp, a key, a stopwatch. Motion stops under
   prefers-reduced-motion. */

const PAPER = '#fbf7ee';
const INK = '#2b2320';
const RED = '#b8323f';
const GOLD = '#c9a24a';

function Receipt({ x, y, w = 120, lines, children }: { x: number; y: number; w?: number; lines: [string, string?][]; children?: React.ReactNode }) {
  const h = 26 + lines.length * 13;
  const teeth = Array.from({ length: 10 }, (_, i) => {
    const s = w / 10;
    return `L${x + w - i * s - s / 2},${y + h + 5} L${x + w - (i + 1) * s},${y + h}`;
  }).join(' ');
  return (
    <g className="roa-paper">
      <path d={`M${x},${y} L${x + w},${y} L${x + w},${y + h} ${teeth} Z`} fill={PAPER} stroke="rgba(0,0,0,.08)" />
      {lines.map(([l, r], i) => (
        <g key={i} className="roa-line" style={{ animationDelay: `${0.25 + i * 0.18}s` }}>
          <text x={x + 9} y={y + 18 + i * 13} className="roa-mono">
            {l}
          </text>
          {r && (
            <text x={x + w - 9} y={y + 18 + i * 13} className="roa-mono" textAnchor="end">
              {r}
            </text>
          )}
        </g>
      ))}
      {children}
    </g>
  );
}

function Stamp({ x, y, text, color = RED, rot = -12, delay = 1.6 }: { x: number; y: number; text: string; color?: string; rot?: number; delay?: number }) {
  const w = text.length * 7.4 + 18;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <g className="roa-stamp" style={{ animationDelay: `${delay}s` }}>
        <rect x={-w / 2} y={-13} width={w} height={26} rx={3} fill="none" stroke={color} strokeWidth={2.4} />
        <rect x={-w / 2 + 3.5} y={-9.5} width={w - 7} height={19} rx={2} fill="none" stroke={color} strokeWidth={0.9} />
        <text x={0} y={4} textAnchor="middle" className="roa-stamp-text" fill={color}>
          {text}
        </text>
      </g>
    </g>
  );
}

const SCENES: Record<string, () => React.ReactNode> = {
  'Suspiciously Clean Record': () => (
    <>
      <Receipt x={60} y={14} w={140} lines={[['PHYSIQUE 57'], ['----------------'], ['ON FILE SINCE', '—'], ['CLASSES TAKEN', '0'], ['STATUS'], ['  NO RECORD FOUND']]} />
      <Stamp x={130} y={92} text="ACCOUNT OPENED" />
      <g className="roa-clock">
        <circle cx={226} cy={40} r={20} fill="none" stroke={GOLD} strokeWidth={2} />
        <line x1={226} y1={40} x2={226} y2={27} stroke={GOLD} strokeWidth={2} className="roa-hand" />
        <text x={226} y={76} textAnchor="middle" className="roa-label">
          9 HRS
        </text>
      </g>
    </>
  ),
  'Last Seen Wearing Leggings': () => (
    <>
      <g className="roa-sway">
        <rect x={78} y={10} width={124} height={124} rx={3} fill={PAPER} stroke="rgba(0,0,0,.1)" />
        <text x={140} y={32} textAnchor="middle" className="roa-poster">
          MISSING
        </text>
        <path d="M128 46 h24 l-3 46 h-7 l-2 -30 l-2 30 h-7 z" fill={INK} opacity={0.82} />
        <text x={140} y={108} textAnchor="middle" className="roa-mono">
          LAST SEEN 14 AUG
        </text>
        <text x={140} y={121} textAnchor="middle" className="roa-mono">
          7AM · THIRD BARRE
        </text>
        <circle cx={140} cy={14} r={3} fill={RED} />
      </g>
      <text x={226} y={70} textAnchor="middle" className="roa-label roa-pulse">
        REWARD
      </text>
      <text x={226} y={84} textAnchor="middle" className="roa-label roa-pulse">
        OFFERED
      </text>
    </>
  ),
  'Certified Insufferable': () => (
    <>
      <rect x={50} y={16} width={170} height={112} rx={6} fill={PAPER} stroke={GOLD} strokeWidth={1.4} />
      <rect x={57} y={23} width={156} height={98} rx={4} fill="none" stroke={GOLD} strokeWidth={0.6} />
      <text x={135} y={46} textAnchor="middle" className="roa-cert">
        Certificate of
      </text>
      <text x={135} y={66} textAnchor="middle" className="roa-cert-big">
        INSUFFERABILITY
      </text>
      <text x={135} y={84} textAnchor="middle" className="roa-mono">
        312 CLASSES · NINE YEARS
      </text>
      <g transform="translate(206 112)">
      <g className="roa-seal">
        {Array.from({ length: 12 }, (_, i) => (
          <path key={i} d="M0 -22 L5 -14 L-5 -14 Z" fill={GOLD} transform={`rotate(${i * 30})`} />
        ))}
        <circle r={15} fill={GOLD} />
        <text y={4} textAnchor="middle" className="roa-seal-text">
          IX
        </text>
      </g>
      </g>
      <g className="roa-shine">
        <rect x={50} y={16} width={30} height={112} fill="url(#roa-shine)" />
      </g>
    </>
  ),
  'Your Future Self Is Unreliable': () => (
    <>
      {['JUL', 'JUN', 'MAY'].map((m, i) => (
        <g key={m} className="roa-page" style={{ animationDelay: `${0.4 + i * 0.5}s` }}>
          <rect x={70 + i * 8} y={24 + i * 6} width={86} height={90} rx={6} fill={PAPER} stroke="rgba(0,0,0,.12)" />
          <rect x={70 + i * 8} y={24 + i * 6} width={86} height={22} rx={6} fill={i === 2 ? RED : '#7c6f68'} />
          <text x={113 + i * 8} y={40 + i * 6} textAnchor="middle" className="roa-cal-head">
            {m}
          </text>
        </g>
      ))}
      <g>
        <rect x={84} y={36} width={86} height={90} rx={6} fill={PAPER} stroke={GOLD} strokeWidth={1.5} />
        <rect x={84} y={36} width={86} height={22} rx={6} fill={GOLD} />
        <text x={127} y={52} textAnchor="middle" className="roa-cal-head">
          APR
        </text>
        <text x={127} y={98} textAnchor="middle" className="roa-cal-day">
          5
        </text>
      </g>
      <g className="roa-pop">
        <circle cx={214} cy={58} r={26} fill={RED} />
        <text x={214} y={56} textAnchor="middle" className="roa-badge-big">
          +9
        </text>
        <text x={214} y={70} textAnchor="middle" className="roa-badge-small">
          DAYS
        </text>
      </g>
    </>
  ),
  'Nine Month Sentence': () => (
    <>
      <g className="roa-swing" style={{ transformOrigin: '140px 14px' }}>
        <line x1={140} y1={4} x2={140} y2={30} stroke="#8a7a5a" strokeWidth={1.4} />
        <circle cx={140} cy={44} r={16} fill="none" stroke={GOLD} strokeWidth={7} />
        <rect x={136} y={58} width={8} height={56} rx={2} fill={GOLD} />
        <rect x={144} y={92} width={12} height={6} fill={GOLD} />
        <rect x={144} y={104} width={9} height={6} fill={GOLD} />
        <g transform="translate(158 40) rotate(10)">
          <rect x={0} y={0} width={44} height={22} rx={4} fill={PAPER} stroke="rgba(0,0,0,.15)" />
          <text x={22} y={15} textAnchor="middle" className="roa-tag">
            No. 001
          </text>
        </g>
      </g>
      <text x={232} y={112} textAnchor="middle" className="roa-label">
        99 KEYS
      </text>
      <text x={48} y={112} textAnchor="middle" className="roa-label">
        NO PAROLE
      </text>
    </>
  ),
  'Plank Or Pay': () => (
    <>
      <g transform="translate(110 72)">
        <circle r={44} fill={PAPER} stroke={INK} strokeWidth={3} />
        <rect x={-7} y={-56} width={14} height={9} rx={2} fill={INK} />
        <circle r={44} fill="none" stroke={RED} strokeWidth={5} strokeDasharray="276" className="roa-ring" />
        <text y={8} textAnchor="middle" className="roa-timer">
          <tspan className="roa-t1">0:57</tspan>
        </text>
      </g>
      <g className="roa-drop">
        {[
          ['₹12,999', 0],
          ['₹12,249', 1],
          ['₹11,499', 2],
        ].map(([p, i]) => (
          <text key={p as string} x={216} y={46 + (i as number) * 26} textAnchor="middle" className={`roa-price roa-price-${i}`}>
            {p}
          </text>
        ))}
      </g>
      <text x={216} y={128} textAnchor="middle" className="roa-label">
        9:09 · 99 MIN
      </text>
    </>
  ),
  'Prove It': () => (
    <>
      <Receipt x={40} y={20} w={150} lines={[['MEMBER SINCE', '2019'], ['CLASSES TAKEN', '312'], ['REFERRALS ON FILE', '0'], ['For nine years.'], ['Interesting.']]} />
      <g className="roa-pop" style={{ animationDelay: '1.8s' }}>
        <circle cx={226} cy={66} r={14} fill={GOLD} />
        <circle cx={226} cy={56} r={5.5} fill={PAPER} />
        <path d="M216 76 a10 8 0 0 1 20 0" fill={PAPER} />
        <text x={226} y={102} textAnchor="middle" className="roa-label">
          BRING HER
        </text>
      </g>
      <Stamp x={118} y={104} text="+1 ON FILE" color={GOLD} rot={8} delay={2.4} />
    </>
  ),
};

export default function ReceiptOfferArt({ name }: { name: string }) {
  const scene = SCENES[name];
  if (!scene) return null;
  return (
    <figure className="roa" aria-label={`Illustration for ${name}`}>
      <svg viewBox="0 0 280 140" role="img">
        <defs>
          <linearGradient id="roa-shine" x1="0" x2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset=".5" stopColor="#fff" stopOpacity=".7" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        </defs>
        {scene()}
      </svg>
    </figure>
  );
}
