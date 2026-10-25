import React, { useState } from 'react';
import { Pause, Play } from 'lucide-react';

export interface MarqueeItem {
  label: string;
  value?: React.ReactNode;
  tone?: 'accent' | 'warn';
  onClick?: () => void;
}

// Seamless dark telemetry ticker. Uses dedicated .mq-strip-* classes so legacy stylesheet layers never collide,
// and keeps every metric value in one signature neon tone.
export default function Marquee({
  items,
  speed = 40,
  variant = 'light',
  tag = 'LIVE',
  className = '',
}: {
  items: MarqueeItem[];
  speed?: number;
  variant?: 'light' | 'dark' | 'minimal';
  tag?: string;
  className?: string;
}) {
  const [paused, setPaused] = useState(false);
  if (!items.length) return null;

  const renderLane = (hidden: boolean) => (
    <div className="mq-strip-lane" aria-hidden={hidden || undefined}>
      {items.map((item, i) => {
        const toneClass = item.tone ? ` is-${item.tone}` : '';
        return (
          <div key={i} className="mq-strip-cell">
            {item.onClick ? (
              <button
                type="button"
                className={`mq-strip-item is-interactive${toneClass}`}
                onClick={item.onClick}
                tabIndex={hidden ? -1 : 0}
              >
                <span className="mq-strip-label">{item.label}</span>
                {item.value !== undefined && <strong className="mq-strip-value">{item.value}</strong>}
                <span className="mq-strip-jump" aria-hidden="true">
                  ↗
                </span>
              </button>
            ) : (
              <div className={`mq-strip-item${toneClass}`}>
                <span className="mq-strip-label">{item.label}</span>
                {item.value !== undefined && <strong className="mq-strip-value">{item.value}</strong>}
              </div>
            )}
            <i className="mq-strip-sep" aria-hidden="true" />
          </div>
        );
      })}
    </div>
  );

  return (
    <div
      className={`mq-strip mq-strip-${variant}${paused ? ' is-paused' : ''}${className ? ` ${className}` : ''}`}
      role="region"
      aria-label="Key commercial metrics ticker"
      style={{ '--mq-duration': `${Math.max(28, items.length * (60 / speed) * 4.4)}s` } as React.CSSProperties}
    >
      <div className="mq-strip-guard">
        <button
          type="button"
          className="mq-strip-status"
          aria-pressed={paused}
          aria-label={paused ? 'Resume metrics ticker' : 'Pause metrics ticker'}
          title={paused ? 'Resume ticker' : 'Pause ticker'}
          onClick={() => setPaused(p => !p)}
        >
          <i className="mq-strip-dot" aria-hidden="true" />
          <span>{paused ? 'PAUSED' : tag}</span>
          <span className="mq-strip-icon" aria-hidden="true">
            {paused ? <Play size={9} /> : <Pause size={9} />}
          </span>
        </button>
      </div>

      <div className="mq-strip-viewport">
        <div className="mq-strip-track">
          {renderLane(false)}
          {renderLane(true)}
        </div>
      </div>
    </div>
  );
}
