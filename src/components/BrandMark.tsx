import React from 'react';

// The P57 mark takes the selected location's accent (`--a1`); the pulse line redraws itself on a slow loop.
export default function BrandMark({ large = false }: { large?: boolean }) {
  const id = React.useId();
  return (
    <div className={`brand-mark p57-mark ${large ? 'large' : ''}`} aria-label="Physique 57">
      <svg viewBox="0 0 52 52" role="img" aria-hidden="true">
        <defs>
          <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" style={{ stopColor: 'color-mix(in srgb, var(--a1, #1f6a57) 70%, #fff)' }} />
            <stop offset="1" style={{ stopColor: 'color-mix(in srgb, var(--a1, #1f6a57) 85%, #000)' }} />
          </linearGradient>
        </defs>
        <rect className="p57-mark-bg" x="1" y="1" width="50" height="50" rx="15" fill={`url(#${id}-bg)`} />
        <rect className="p57-mark-shine" x="1" y="1" width="50" height="50" rx="15" fill="#fff" />
        <path
          className="p57-mark-pulse"
          d="M8 15h9l3 3 6-9 6 9 4-3h8"
          fill="none"
          stroke="#fff"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={100}
        />
        <text
          x="26"
          y="38"
          textAnchor="middle"
          fill="#fff"
          fontFamily="Arial, sans-serif"
          fontSize="18"
          fontWeight="900"
          letterSpacing="-1.6"
        >
          P57
        </text>
      </svg>
    </div>
  );
}
