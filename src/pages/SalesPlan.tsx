import React from 'react';
import { useParams } from 'react-router-dom';
import { Download, Upload } from 'lucide-react';
import { useApp } from '../App';
import { ErrorState, Loading } from '../components/ui';
import { lakh, usePlanData } from './plan/usePlanData';
import TargetsTab from './plan/TargetsTab';
import Playbook2027 from '../components/Playbook2027';
const AnnualPlanner = React.lazy(() => import('./AnnualPlanner'));
const Anniversary = React.lazy(() => import('./Anniversary'));
import PlanExportDialog from '../components/PlanExportDialog';
import OfferImportDialog from '../components/OfferImportDialog';
import PlanImportDialog from '../components/PlanImportDialog';

// Plan has three tabs: Target Breakdown, Sales Plan and Anniversary Plan. Approvals, Activations,
// Marketing and the old Target Metrics link land on the Target Breakdown.
const LEGACY_TABS: Record<string, string> = {
  targets: 'breakdown',
  revenue: 'breakdown',
  approvals: 'breakdown',
  campaigns: 'breakdown',
  activations: 'breakdown',
  marketing: 'breakdown',
};
export default function SalesPlan() {
  const { tab: rawTab = 'breakdown' } = useParams(),
    tab = LEGACY_TABS[rawTab] || rawTab,
    { boot, studioId, year } = useApp();
  const { data, loading, error, reload } = usePlanData();
  const studio = boot.studios.find(s => s.id === studioId);
  const growth = data && data.lastYear ? data.annual / data.lastYear - 1 : null;
  const peak = data ? [...data.months].sort((a, b) => b.target - a.target)[0] : null;
  // Export and import belong to the plan as a whole, so they sit in its head rather than
  // inside one tab: the same two files serve the review and the next edit of the year.
  const [exporting, setExporting] = React.useState(false);
  const [importing, setImporting] = React.useState(false);
  const [planImporting, setPlanImporting] = React.useState(false);
  return (
    <div className="ws-page">
      {/* A short head, not a dashboard: the page's content starts within a screenful.
          The figures that used to live in four tiles and a scrolling marquee are down
          to one line each, and the month-by-month detail belongs to the Year plan. */}
      <header className="ws-strip">
        <div className="ws-strip-title">
          <span className="ws-strip-eyebrow">{studio ? `${studio.city} · ${year}` : `All locations · ${year}`}</span>
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
        <div className="ws-strip-actions">
          <button type="button" className="ws-strip-action" onClick={() => setPlanImporting(true)}>
            <Upload size={13} />
            Import plan
          </button>
          <button type="button" className="ws-strip-action" onClick={() => setImporting(true)}>
            <Upload size={13} />
            Import offers
          </button>
          <button type="button" className="ws-strip-action is-primary" onClick={() => setExporting(true)}>
            <Download size={13} />
            Export plan
          </button>
        </div>
      </header>
      <PlanExportDialog open={exporting} onClose={() => setExporting(false)} defaultScope={studio ? 'studio' : 'all'} />
      <PlanImportDialog
        open={planImporting}
        onClose={() => setPlanImporting(false)}
        studioId={studioId ?? null}
        year={year}
        onImported={() => reload().catch(() => {})}
      />
      <OfferImportDialog
        open={importing}
        onClose={() => setImporting(false)}
        studioId={studioId ?? null}
        year={year}
        onImported={() => reload().catch(() => {})}
      />
      {loading && !data ? (
        <Loading label="Assembling the sales plan…" />
      ) : error && !data ? (
        <ErrorState message={error} retry={() => reload().catch(() => {})} />
      ) : (
        data && (
          <>
            {tab === 'breakdown' && (
              <div className="ws-embedded">
                <TargetsTab data={data} onSaved={reload} section="metrics" />
                <React.Suspense fallback={<Loading />}>
                  <AnnualPlanner />
                </React.Suspense>
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
            {tab === 'anniversary' && (
              <React.Suspense fallback={<Loading />}>
                <Anniversary />
              </React.Suspense>
            )}
          </>
        )
      )}
    </div>
  );
}
