import React from 'react';
import { useParams } from 'react-router-dom';
import { useApp } from '../App';
import { Callout, ErrorState, Loading } from '../components/ui';
import { LOCATION_COLORS } from '../data/locations';
import { lakh, usePlanData } from './plan/usePlanData';
import TargetsTab from './plan/TargetsTab';
const AnnualPlanner = React.lazy(() => import('./AnnualPlanner'));
import RevenueTab from './plan/RevenueTab';
import CampaignsTab from './plan/CampaignsTab';
import MarketingTab from './plan/MarketingTab';

export default function SalesPlan() {
  const { tab = 'targets' } = useParams(),
    { boot, studioId, year } = useApp();
  const { data, loading, error, reload } = usePlanData();
  const studio = boot.studios.find(s => s.id === studioId);
  const growth = data && data.lastYear ? data.annual / data.lastYear - 1 : null;
  const peak = data ? [...data.months].sort((a, b) => b.target - a.target)[0] : null;
  return (
    <div className="ws-page">
      <section
        className="ws-hero"
        style={{ '--loc': studio ? LOCATION_COLORS[studio.name] : '#211e2b' } as React.CSSProperties}
      >
        <div>
          <p className="eyebrow">
            {studio ? `${studio.city.toUpperCase()} · SALES PLAN ${year}` : `ALL LOCATIONS · SALES PLAN ${year}`}
          </p>
          <h1>{studio ? studio.name : 'Combined plan'}</h1>
          <p>
            {studio
              ? 'Targets, offers, revenue logic, campaigns and marketing for this location — everything below is filtered to it.'
              : 'Kemps Corner, Bandra, Kenkere House and Pop-up rolled up. Pick a location tab above to focus on one studio.'}
          </p>
        </div>
        {data && (
          <div className="ws-hero-stats">
            <div>
              <span>Annual target</span>
              <strong>{lakh(data.annual)}</strong>
            </div>
            <div>
              <span>vs {year - 1}</span>
              <strong className={growth !== null && growth < 0 ? 'neg' : 'pos'}>
                {growth === null ? '—' : `${growth >= 0 ? '+' : ''}${(growth * 100).toFixed(0)}%`}
              </strong>
            </div>
            <div>
              <span>Monthly average</span>
              <strong>{lakh(data.annual / 12)}</strong>
            </div>
            <div>
              <span>Peak month</span>
              <strong>
                {peak ? new Date(year, peak.month - 1).toLocaleString('en-IN', { month: 'short' }) : '—'} ·{' '}
                {lakh(peak?.target)}
              </strong>
            </div>
          </div>
        )}
      </section>
      {year !== boot.planningYear && ['campaigns', 'marketing'].includes(tab) && (
        <Callout tone="warning" title={`Activation playbook is for ${boot.planningYear}`}>
          Targets and offers below follow {year}, but the campaign and marketing playbook was written for{' '}
          {boot.planningYear}.
        </Callout>
      )}
      {loading && !data ? (
        <Loading label="Assembling the sales plan…" />
      ) : error && !data ? (
        <ErrorState message={error} retry={() => reload().catch(() => {})} />
      ) : (
        data && (
          <>
            {tab === 'targets' && <TargetsTab data={data} />}
            {tab === 'approvals' && (
              <div className="ws-embedded">
                <React.Suspense fallback={<Loading />}>
                  <AnnualPlanner />
                </React.Suspense>
              </div>
            )}
            {tab === 'revenue' && <RevenueTab data={data} />}
            {tab === 'campaigns' && <CampaignsTab data={data} />}
            {tab === 'marketing' && <MarketingTab data={data} />}
          </>
        )
      )}
    </div>
  );
}
