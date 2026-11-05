import type { CSSProperties } from 'react';
import { TrendingUp } from 'lucide-react';
import { lakh } from './usePlanData';
import { money } from '../../types';

export default function OfferRevenueSummary({
  revenue,
  count,
  forecastedCount,
  target,
  categories,
}: {
  revenue: number;
  count: number;
  forecastedCount: number;
  target: number;
  categories: Array<{ key: string; label: string; revenue: number; count: number; forecastedCount: number }>;
}) {
  const missing = count - forecastedCount;
  const ratio = target > 0 ? revenue / target : null;
  const tone = ratio === null || !forecastedCount ? 'pending' : ratio > 1.1 ? 'over' : ratio < 0.9 ? 'under' : 'ok';
  const coverage = ratio !== null ? Math.round(ratio * 100) : null;
  const ring = Math.min(100, Math.max(0, coverage ?? 0));
  const R = 34;
  const C = 2 * Math.PI * R;
  const sum = categories.reduce((acc, c) => acc + Math.max(0, c.forecastedCount ? c.revenue : 0), 0);
  const gap =
    target > 0 && forecastedCount
      ? revenue < target
        ? `${lakh(target - revenue)} still to find`
        : revenue > target
          ? `${lakh(revenue - target)} above target`
          : 'Target fully covered'
      : null;
  // One bar measured against the month target: each journey's share, then what is still open.
  const scale = Math.max(target, sum, 1);
  return (
    <section
      className={`mw-offer-total ors is-${tone}`}
      aria-label="Combined projected offer revenue"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="ors-top">
        <div className="ors-main">
          <span className="ors-label">
            <TrendingUp size={13} /> Combined projected revenue
          </span>
          <strong className="mw-offer-total-value ors-value" data-revenue={revenue} title={forecastedCount ? money(revenue) : undefined}>
            {forecastedCount ? lakh(revenue) : '—'}
          </strong>
          <div className="ors-chips">
            <span>
              {count} {count === 1 ? 'offer' : 'offers'}
            </span>
            <span className="is-muted">Projected, not actual</span>
            {missing > 0 && <span className="is-warn">{missing} awaiting forecast</span>}
          </div>
        </div>
        {target > 0 && (
          <div className="ors-target">
            <svg viewBox="0 0 80 80" className="ors-ring" aria-hidden="true">
              <circle cx="40" cy="40" r={R} className="track" />
              <circle cx="40" cy="40" r={R} className="fill" strokeDasharray={C} strokeDashoffset={C * (1 - ring / 100)} />
            </svg>
            <div className="ors-ring-copy">
              <b>{coverage !== null && forecastedCount ? `${coverage}%` : '—'}</b>
              <span>of {lakh(target)}</span>
            </div>
            {gap && <em className={`ors-gap is-${tone}`}>{gap}</em>}
          </div>
        )}
      </div>

      <div className="ors-bar" role="img" aria-label="Offer revenue by journey against the month target">
        {categories.map(category => {
          const value = category.forecastedCount ? Math.max(0, category.revenue) : 0;
          return value > 0 ? (
            <i
              key={category.key}
              data-offer-category={category.key}
              style={{ width: `${(value / scale) * 100}%` } as CSSProperties}
              title={`${category.label}: ${lakh(value)}`}
            />
          ) : null;
        })}
        {target > sum && <i className="is-open" style={{ width: `${((target - sum) / scale) * 100}%` }} title="Still to find" />}
      </div>

      <dl className="ors-legend">
        {categories.map(category => {
          const value = category.forecastedCount ? Math.max(0, category.revenue) : 0;
          const part = sum > 0 ? Math.round((value / sum) * 100) : 0;
          return (
            <div key={category.key} data-offer-category={category.key}>
              <dt>
                <i aria-hidden="true" />
                {category.label}
                <small>
                  {category.count} {category.count === 1 ? 'offer' : 'offers'}
                </small>
              </dt>
              <dd title={category.forecastedCount ? money(category.revenue) : undefined}>
                {category.forecastedCount ? lakh(category.revenue) : '—'}
                {category.forecastedCount > 0 && sum > 0 && <em>{part}%</em>}
              </dd>
            </div>
          );
        })}
      </dl>
      {missing > 0 && (
        <p className="ors-warning">
          {missing} selected {missing === 1 ? 'offer is' : 'offers are'} awaiting a valid forecast and{' '}
          {missing === 1 ? 'is' : 'are'} not included in this total.
        </p>
      )}
    </section>
  );
}
