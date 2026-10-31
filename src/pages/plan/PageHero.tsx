import React from 'react';
import type { HeroPhoto } from '../../data/pagePhotos';

/* The opener band that every month page shares: the page number, the page's editorial
   title, one sentence of intent, and the numbers that page is about.

   Inside a month it runs *without* a photograph (`photo` omitted). A month has exactly one
   picture that belongs to it — its cover — and repeating a photograph at the top of every
   sub-tab pushed the actual content down the page for no editorial gain. So the inner pages
   open on paper instead: type, a rule, and the numbers sitting where the reader's eye lands,
   which leaves the whole viewport to the page's real content.

   With a photograph (`photo` supplied) it is the standalone band used outside the month, and
   `variant="sheet"` shaves the bottom corners so it can sit on a paper sheet. */

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
  photo?: HeroPhoto | null;
  meta: Array<{ label: string; value: string }>;
  actions?: React.ReactNode;
  variant?: 'standalone' | 'sheet';
}) {
  const plain = !photo;
  return (
    <header className={`mp-hero${photo ? '' : ' is-plain'}${variant === 'sheet' ? ' is-sheet' : ''}`}>
      {photo && (
        <>
          <div
            className="mp-hero-img"
            style={{ backgroundImage: `url(${photo.url})`, backgroundPosition: photo.pos }}
            aria-hidden="true"
          />
          <div className="mp-hero-scrim" aria-hidden="true" />
        </>
      )}
      <span className="mp-hero-mark" aria-hidden="true">
        {index}
      </span>

      <div className="mp-hero-inner">
        <div className="mp-hero-intro">
          <span className="mp-hero-kicker">
            <i aria-hidden="true" />
            {index} · {label}
          </span>
          <h2>{title}</h2>
          <p className="mp-hero-lede">{description}</p>
        </div>

        <div className={`mp-hero-foot${plain ? ' is-plain' : ''}`}>
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
