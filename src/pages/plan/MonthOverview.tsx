import React from 'react';
import { Quote, ShieldCheck, Sparkles } from 'lucide-react';
import { MONTHS, number } from '../../types';
import type { MonthChapter, MonthStory } from '../../data/monthNarrative';
import PageHero from './PageHero';

/* The month's opening page. One sheet, not a stack of cards: the photograph and the title
   run edge to edge at the top, then the brief, the three narrative notes and the chapter
   close follow on the same paper, divided by hairlines. The figures stay editable on
   Targets & mix — this page is the story that makes sense of them. */
const lakh = (v: number) => `₹${(Math.max(0, v) / 100000).toLocaleString('en-IN', { maximumFractionDigits: 1 })}L`;
const pct = (v: number | null | undefined, d = 0) =>
  v === null || v === undefined || !Number.isFinite(v) ? '—' : `${(v * 100).toFixed(d)}%`;

export default function MonthOverview({
  month,
  chapter,
  theme,
  studioName,
  roomAngle,
  story,
  target,
  lastYear,
  leads,
  trials,
  buyers,
  offers,
  offerRevenue,
  renewalsDue,
  renewalCoverage,
  photo,
  status,
}: {
  month: number;
  chapter: MonthChapter;
  theme: string;
  studioName: string;
  roomAngle: string;
  story: MonthStory;
  target: number;
  lastYear: number;
  leads: number;
  trials: number;
  buyers: number;
  offers: number;
  offerRevenue: number;
  renewalsDue: number;
  renewalCoverage: number | null;
  photo: { url: string; pos: string };
  status: 'approved' | 'locked' | 'proposed';
}) {
  const yoy = lastYear ? target / lastYear - 1 : null;
  const coveragePct = Math.min(100, Math.max(0, (renewalCoverage ?? 0) * 100));
  return (
    <section className="mw-overview" aria-label={`${MONTHS[month - 1]} overview`}>
      <article className="mo-sheet">
        <PageHero
          variant="sheet"
          index="01"
          label="Overview"
          title={theme}
          description={chapter.moment}
          photo={photo}
          meta={[
            { label: 'Target', value: lakh(target) },
            {
              label: 'vs last year',
              value: yoy === null ? 'first year' : `${yoy >= 0 ? '+' : ''}${Math.round(yoy * 100)}%`,
            },
            { label: 'Leads needed', value: number(leads) },
            { label: 'Renewals due', value: number(renewalsDue) },
          ]}
          actions={
            <span className={`mp-status is-${status}`}>
              {status === 'approved' ? 'Approved' : status === 'locked' ? 'Targets locked' : 'Proposed'}
            </span>
          }
        />

        <div className="mo-body">
          <section className="mo-brief">
            <span className="mo-label">The brief</span>
            <p>{chapter.brief}</p>
            <div className="mo-brief-foot">
              <span>
                {offers
                  ? `${offers} offers planned · ${lakh(offerRevenue)} carried`
                  : 'No offers picked yet — the library is one tap away'}
              </span>
              <em>{studioName}</em>
            </div>
          </section>

          <div className="mo-notes">
            <article className="mo-note">
              <span className="mo-note-head">
                <i>01</i>
                <span>Where the money comes from</span>
              </span>
              <p>{story.split}</p>
            </article>
            <article className="mo-note">
              <span className="mo-note-head">
                <i>02</i>
                <span>Who has to walk in</span>
              </span>
              <p>{story.leads}</p>
              <span className="mo-funnel" aria-hidden="true">
                <b>
                  {number(leads)}
                  <em>leads</em>
                </b>
                <i />
                <b>
                  {number(trials)}
                  <em>trials</em>
                </b>
                <i />
                <b>
                  {number(buyers)}
                  <em>buyers</em>
                </b>
              </span>
            </article>
            <article className="mo-note">
              <span className="mo-note-head">
                <i>03</i>
                <span>Who has to stay</span>
              </span>
              <p>{story.renewals}</p>
              <span className="mo-cover-note">
                <span className="mo-meter" aria-hidden="true">
                  <i style={{ width: `${coveragePct}%` }} />
                </span>
                <small>
                  {number(renewalsDue)} memberships due · {pct(renewalCoverage)} covered by planned renewals
                </small>
              </span>
            </article>
          </div>

          <div className="mo-chapter">
            <article>
              <span className="mo-label">
                <ShieldCheck size={12} />
                What goes wrong
              </span>
              <p>{chapter.risk}</p>
            </article>
            <article>
              <span className="mo-label">
                <Sparkles size={12} />
                The move
              </span>
              <p>{chapter.signature}</p>
            </article>
            <article className="is-room">
              <span className="mo-label">
                <Quote size={12} />
                This room’s angle
              </span>
              <p>{roomAngle}</p>
              <em>{studioName}</em>
            </article>
          </div>
        </div>
      </article>
    </section>
  );
}
