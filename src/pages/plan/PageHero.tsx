import React from 'react';
import type { HeroPhoto } from '../../data/pagePhotos';

/* The opener band that every month page shares: a tall photograph on the left, the page's
   editorial title and one-line explanation on paper to the right, the three numbers that
   page is about, and up to two actions. Same shape as the month cover, one size smaller,
   so the four pages read as chapters of one document rather than four unrelated screens. */

export default function PageHero({
  index,
  label,
  title,
  description,
  photo,
  meta,
  actions,
}: {
  index: string;
  label: string;
  title: string;
  description: React.ReactNode;
  photo: HeroPhoto;
  meta: Array<{ label: string; value: string }>;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mp-hero">
      <div className="mp-hero-photo">
        <div
          className="mp-hero-img"
          style={{ backgroundImage: `url(${photo.url})`, backgroundPosition: photo.pos }}
          aria-hidden="true"
        />
        <div className="mp-hero-scrim" aria-hidden="true" />
        <span className="mp-hero-mark" aria-hidden="true">
          {index}
        </span>
      </div>

      <div className="mp-hero-copy">
        <span className="mp-hero-kicker">
          <i aria-hidden="true" />
          {index} · {label}
        </span>
        <h2>{title}</h2>
        <p>{description}</p>
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
