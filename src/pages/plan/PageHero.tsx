import React from 'react';
import type { HeroPhoto } from '../../data/pagePhotos';

/* The opener band that every month page shares: one photograph, the page number set over it,
   the page's editorial title, one sentence of intent, and the numbers that page is about.
   It is the same object as an offer card's hero and the month cover — same scrim, same
   white serif, same foot — so a page, its cards and the cover read as one document.
   
   `variant="sheet"` shaves the bottom corners so the band can sit on top of a paper sheet
   (the Overview page) instead of standing alone above the sections. */

export default function PageHero({
  index,
  label,
  title,
  description,
  photo,
  meta,
  actions,
  variant = 'standalone',
}: {
  index: string;
  label: string;
  title: string;
  description: React.ReactNode;
  photo: HeroPhoto;
  meta: Array<{ label: string; value: string }>;
  actions?: React.ReactNode;
  variant?: 'standalone' | 'sheet';
}) {
  return (
    <header className={`mp-hero${variant === 'sheet' ? ' is-sheet' : ''}`}>
      <div
        className="mp-hero-img"
        style={{ backgroundImage: `url(${photo.url})`, backgroundPosition: photo.pos }}
        aria-hidden="true"
      />
      <div className="mp-hero-scrim" aria-hidden="true" />
      <span className="mp-hero-mark" aria-hidden="true">
        {index}
      </span>

      <div className="mp-hero-inner">
        <span className="mp-hero-kicker">
          <i aria-hidden="true" />
          {index} · {label}
        </span>
        <h2>{title}</h2>
        <p className="mp-hero-lede">{description}</p>

        <div className="mp-hero-foot">
          <dl className="mp-hero-meta">
            {meta.map(m => (
              <div key={m.label}>
                <dt>{m.label}</dt>
                <dd>{m.value}</dd>
              </div>
            ))}
          </dl>
          {actions && <div className="mp-hero-actions">{actions}</div>}
        </div>
      </div>
    </header>
  );
}
