import React from 'react';
import { useParams } from 'react-router-dom';
import { useApp } from '../App';
import { Callout, ErrorState, Loading } from '../components/ui';
import { lakh, usePlanData } from './plan/usePlanData';
import TargetsTab from './plan/TargetsTab';
import Playbook2027 from '../components/Playbook2027';
const AnnualPlanner = React.lazy(() => import('./AnnualPlanner'));
const Anniversary = React.lazy(() => import('./Anniversary'));
import RevenueTab from './plan/RevenueTab';
import CampaignsTab from './plan/CampaignsTab';
import MarketingTab from './plan/MarketingTab';

// Plan has exactly six tabs: Target Metrics, Approvals & Calculations, Sales Plan,
// Activations & Community Activations, Anniversary Plan, Marketing & Performance Marketing.
const LEGACY_TABS: Record<string, string> = { revenue: 'approvals', campaigns: 'activations' };
export default function SalesPlan() {
  const { tab: rawTab = 'targets' } = useParams(),
    tab = LEGACY_TABS[rawTab] || rawTab,
    { boot, studioId, year } = useApp();
  const { data, loading, error, reload } = usePlanData();
  const studio = boot.studios.find(s => s.id === studioId);
  const growth = data && data.lastYear ? data.annual / data.lastYear - 1 : null;
  const peak = data ? [...data.months].sort((a, b) => b.target - a.target)[0] : null;
  return (
    <div className="ws-page">
      {/* A short head, not a dashboard: the page's content starts within a screenful.
          The figures that used to live in four tiles and a scrolling marquee are down
          to one line each, and the month-by-month detail belongs to the Year plan. */}
      <header className="ws-strip">
        <div className="ws-strip-title">
          <span className="ws-strip-eyebrow">
            {studio ? `${studio.city} · ${year}` : `All locations · ${year}`}
          </span>
          <h1>{studio ? studio.name : 'Combined plan'}</h1>
        </div>
        {data && (
          <dl className="ws-strip-figures">
            <div>
              <dt>Target</dt>
              <dd>{lakh(data.annual)}</dd>
            </div>
            <div>
              <dt>vs {year - 1}</dt>
              <dd className={growth !== null && growth < 0 ? 'neg' : 'pos'}>
                {growth === null ? '—' : `${growth >= 0 ? '+' : ''}${(growth * 100).toFixed(0)}%`}
              </dd>
            </div>
            <div>
              <dt>Peak</dt>
              <dd>
                {peak ? new Date(year, peak.month - 1).toLocaleString('en-IN', { month: 'short' }) : '—'}{' '}
                <em>{lakh(peak?.target)}</em>
              </dd>
            </div>
          </dl>
        )}
      </header>
      {year !== boot.planningYear && ['activations', 'marketing'].includes(tab) && (
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
            {tab === 'targets' && <TargetsTab data={data} onSaved={reload} section="metrics" />}
            {tab === 'approvals' && (
              <div className="ws-embedded">
                <React.Suspense fallback={<Loading />}>
                  <AnnualPlanner />
                </React.Suspense>
                <div className="ws-toolbar">
                  <div>
                    <h2>Calculations · how each month's target is made up</h2>
                    <p>The revenue streams behind every target and the volumes each one needs.</p>
                  </div>
                </div>
                <RevenueTab data={data} />
              </div>
            )}
            {tab === 'plan' && (
              <>
                {studio ? (
                  <Playbook2027 scope={studio.name} showMonths={false} />
                ) : (
                  <p className="ws-strip-hint">
                    The playbook is written per location — pick one above. The year plan below covers all four.
                  </p>
                )}
                <TargetsTab data={data} onSaved={reload} section="plan" />
              </>
            )}
            {tab === 'activations' && <CampaignsTab data={data} onSaved={reload} />}
            {tab === 'anniversary' && (
              <React.Suspense fallback={<Loading />}>
                <Anniversary />
              </React.Suspense>
            )}
            {tab === 'marketing' && <MarketingTab data={data} />}
          </>
        )
      )}
    </div>
  );
}
