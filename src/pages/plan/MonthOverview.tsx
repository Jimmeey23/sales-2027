import React from 'react';
import { Gift, Quote, RefreshCcw, ShieldCheck, Sparkles, Target, Users } from 'lucide-react';
import { MONTHS, number } from '../../types';
import type { MonthChapter, MonthStory } from '../../data/monthNarrative';

/* The month's opening page: a poster of the month, the four numbers that define it, and
   the narrative behind each one — where the money comes from, who has to walk in, and who
   has to stay. Story first; the editable figures live on Targets & mix. */
const lakh = (v: number) => `₹${(Math.max(0, v) / 100000).toLocaleString('en-IN', { maximumFractionDigits: 1 })}L`;
const pct = (v: number | null | undefined, d = 0) =>
  v === null || v === undefined || !Number.isFinite(v) ? '—' : `${(v * 100).toFixed(d)}%`;

export default function MonthOverview({
  month,
  year,
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
  year: number;
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
  const buyerRate = trials ? buyers / trials : null;
  return (
    <section className="mw-overview" aria-label={`${MONTHS[month - 1]} overview`}>
      <div className="mo-top">
        <figure className="mo-poster">
          <div
            className="mo-photo"
            style={{ backgroundImage: `url(${photo.url})`, backgroundPosition: photo.pos }}
            aria-hidden="true"
          />
          <div className="mo-scrim" aria-hidden="true" />
          <figcaption>
            <span className="mo-kicker">
              <i aria-hidden="true" />
              {chapter.kicker} · {MONTHS[month - 1]} {year}
            </span>
            <p className="mo-theme">{theme}</p>
            <p className="mo-moment">{chapter.moment}</p>
            <span className={`mo-status is-${status}`}>
              {status === 'approved' ? 'Approved' : status === 'locked' ? 'Targets locked' : 'Proposed'}
            </span>
          </figcaption>
        </figure>

        <div className="mo-ledger">
          <span className="mo-label">The month in four lines</span>
          <div className="mo-line">
            <span>
              <Target size={12} />
              Target
            </span>
            <strong>{lakh(target)}</strong>
            <em>{yoy === null ? 'no prior year' : `${yoy >= 0 ? '+' : ''}${Math.round(yoy * 100)}% on last year`}</em>
          </div>
          <div className="mo-line">
            <span>
              <Users size={12} />
              The door
            </span>
            <strong>{number(leads)} leads</strong>
            <em>
              {number(trials)} trials → {number(buyers)} buyers, {pct(buyerRate)} convert
            </em>
          </div>
          <div className="mo-line">
            <span>
              <Gift size={12} />
              The offers
            </span>
            <strong>{offers ? `${offers} planned` : 'None yet'}</strong>
            <em>{offers ? `${lakh(offerRevenue)} carried by them` : 'Pick offers on the Offers page'}</em>
          </div>
          <div className="mo-line">
            <span>
              <RefreshCcw size={12} />
              The renewal book
            </span>
            <strong>{number(renewalsDue)} expiring</strong>
            <em>{pct(renewalCoverage)} covered by the plan</em>
          </div>
        </div>
      </div>

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
          <span className="mo-meter" aria-hidden="true">
            <i style={{ width: `${Math.min(100, Math.max(0, (renewalCoverage ?? 0) * 100))}%` }} />
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
    </section>
  );
}
