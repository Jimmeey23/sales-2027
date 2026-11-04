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
            <TrendingUp size={15} /> Combined projected revenue
          </span>
          <strong
            className="mw-offer-total-value"
            data-revenue={revenue}
            title={forecastedCount ? money(revenue) : undefined}
          >
            {forecastedCount ? lakh(revenue) : '—'}
          </strong>
          <p>
            From {count} selected {count === 1 ? 'offer' : 'offers'} <span>· Projected, not actual revenue</span>
          </p>
        </div>
        {target > 0 && (
          <div className="mw-offer-total-target">
            <span>Month target</span>
            <strong>{lakh(target)}</strong>
            {coverage !== null && forecastedCount > 0 && (
              <>
                <b>{coverage}% covered</b>
                <progress
                  max={100}
                  value={Math.min(100, Math.max(0, coverage))}
                  aria-label="Projected revenue coverage of month target"
                  aria-valuetext={`${coverage}% of the month target`}
                />
                <span>
                  {revenue < target
                    ? `${lakh(target - revenue)} below target`
                    : revenue > target
                      ? `${lakh(revenue - target)} above target`
                      : 'Target fully covered'}
                </span>
              </>
            )}
          </div>
        )}
      </div>
      <dl className="mw-offer-total-breakdown">
        {categories.map(category => (
          <div key={category.key} data-offer-category={category.key}>
            <dt>
              {category.label}
              <span>
                {category.count} {category.count === 1 ? 'offer' : 'offers'}
              </span>
            </dt>
            <dd title={category.forecastedCount ? money(category.revenue) : undefined}>
              {category.forecastedCount ? lakh(category.revenue) : '—'}
            </dd>
          </div>
        ))}
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
