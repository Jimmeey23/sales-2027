import React from 'react';

/* The opener band that every month page shares: a tall photograph on the left, the page's
   editorial title and one-line explanation on paper to the right, the three numbers that
   page is about, and up to two actions. Same shape as the month cover, one size smaller,
   so the four pages read as chapters of one document rather than four unrelated screens. */

export interface HeroPhoto {
  url: string;
  pos: string;
}

/* Wide and portrait studio photography that the offer cards never use, so a page banner
   can never repeat a card hero inside the same month. */
export const PAGE_PHOTOS: HeroPhoto[] = [
  { url: '/p57/barre-studio.jpg', pos: '50% 24%' },
  { url: '/p57/class-3.jpg', pos: '50% 22%' },
  { url: '/p57/strength-wide.jpg', pos: '50% 42%' },
  { url: '/p57/cycle.jpg', pos: '50% 26%' },
  { url: '/p57/class-4.jpg', pos: '50% 20%' },
  { url: '/p57/tent-scene.jpg', pos: '50% 30%' },
  { url: '/p57/studio-floor.jpg', pos: '50% 34%' },
  { url: '/p57/barre-group.jpg', pos: '50% 26%' },
];

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
