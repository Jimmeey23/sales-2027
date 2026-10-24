import React from 'react';

export interface MarqueeItem {
  label: string;
  value?: React.ReactNode;
  tone?: 'accent' | 'warn';
  onClick?: () => void;
}

// A slow, endless ticker of key numbers. The list is rendered twice so the loop is seamless; hovering pauses it,
// and it stays still for people who prefer reduced motion.
export default function Marquee({
  items,
  speed = 40,
  variant = 'light',
}: {
  items: MarqueeItem[];
  speed?: number;
  variant?: 'light' | 'dark';
}) {
  if (!items.length) return null;
  const run = (hidden: boolean) => (
    <ul aria-hidden={hidden || undefined}>
      {items.map((item, i) => (
        <li key={i} className={`${item.tone ? `mq-${item.tone}` : ''} ${item.onClick ? 'mq-clickable' : ''}`}>
          {item.onClick ? (
            <button type="button" onClick={item.onClick} tabIndex={hidden ? -1 : 0}>
              <span>{item.label}</span>
              {item.value !== undefined && <b>{item.value}</b>}
            </button>
          ) : (
            <>
              <span>{item.label}</span>
              {item.value !== undefined && <b>{item.value}</b>}
            </>
          )}
        </li>
      ))}
    </ul>
  );
  return (
    <div
      className={`mq mq-${variant}`}
      style={{ '--mq-duration': `${Math.max(20, items.length * (60 / speed) * 4)}s` } as React.CSSProperties}
    >
      <div className="mq-track">
        {run(false)}
        {run(true)}
      </div>
    </div>
  );
}
