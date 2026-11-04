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
  return (
    <section
      className={`mw-offer-total is-${tone}`}
      aria-label="Combined projected offer revenue"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="mw-offer-total-head">
        <div className="mw-offer-total-main">
          <span className="mw-offer-total-label">
            <TrendingUp size={14} /> Combined projected revenue
          </span>
          <strong
            className="mw-offer-total-value"
            data-revenue={revenue}
            title={forecastedCount ? money(revenue) : undefined}
          >
            {forecastedCount ? lakh(revenue) : '—'}
          </strong>
          <div className="mw-offer-total-chips">
            <span>
              {count} selected {count === 1 ? 'offer' : 'offers'}
            </span>
            <span className="is-muted">Projected, not actual</span>
            {missing > 0 && <span className="is-warn">{missing} awaiting forecast</span>}
          </div>
        </div>
        {target > 0 && (
          <div className="mw-offer-total-target">
            <svg viewBox="0 0 80 80" className="mw-offer-total-ring" aria-hidden="true">
              <circle cx="40" cy="40" r={R} className="track" />
              <circle
                cx="40"
                cy="40"
                r={R}
                className="fill"
                strokeDasharray={C}
                strokeDashoffset={C * (1 - ring / 100)}
              />
              <text x="40" y="44" textAnchor="middle">
                {coverage !== null && forecastedCount ? `${coverage}%` : '—'}
              </text>
            </svg>
            <div className="mw-offer-total-target-copy">
              <span>Month target</span>
              <strong>{lakh(target)}</strong>
              {gap && <b>{gap}</b>}
            </div>
          </div>
        )}
      </div>
      <dl className="mw-offer-total-breakdown">
        {categories.map(category => {
          const value = category.forecastedCount ? Math.max(0, category.revenue) : 0;
          const part = sum > 0 ? Math.round((value / sum) * 100) : 0;
          return (
            <div
              key={category.key}
              data-offer-category={category.key}
              style={{ ['--w' as string]: `${part}%` } as CSSProperties}
            >
              <dt>
                {category.label}
                <span>
                  {category.count} {category.count === 1 ? 'offer' : 'offers'}
                </span>
              </dt>
              <dd title={category.forecastedCount ? money(category.revenue) : undefined}>
                {category.forecastedCount ? lakh(category.revenue) : '—'}
                {category.forecastedCount > 0 && sum > 0 && <em>{part}%</em>}
              </dd>
              <i aria-hidden="true" />
            </div>
          );
        })}
      </dl>
      {missing > 0 && (
        <p className="mw-offer-total-warning">
          {missing} selected {missing === 1 ? 'offer is' : 'offers are'} awaiting a valid forecast and{' '}
          {missing === 1 ? 'is' : 'are'} not included in this total.
        </p>
      )}
    </section>
  );
}
