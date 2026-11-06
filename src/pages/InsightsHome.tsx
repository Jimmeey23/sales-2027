import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useApp } from '../App';
import { useLoad } from '../hooks';
import { Badge, Button, Callout, EmptyState, ErrorState, Loading } from '../components/ui';
import PageHeader from '../components/PageHeader';
import PackInsights from '../components/PackInsights';

const lakh = (v: number | null | undefined) => (v == null ? '—' : `₹${(v / 1e5).toFixed(1)}L`);
const signed = (v: number | null | undefined) => (v == null ? null : `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`);

// Insights: the 2027 pack's Performance History and Insights document and Targets summary for
// the studio selected in the app header (or each planning studio when "All locations").
export default function InsightsHome() {
  const { studioId, boot } = useApp();
  const navigate = useNavigate();
  const [doc, setDoc] = useState<'insights' | 'targetsSummary'>('insights');
  const [picked, setPicked] = useState<string | null>(null);

  const { data, loading, error, reload } = useLoad<any>(async () => {
    const q = studioId ? `?studio=${studioId}` : '';
    const [pack, brief] = await Promise.all([
      api(`/pack-insights${q}`),
      api(`/overview-brief${q}`).catch(() => null),
    ]);
    return { pack, brief, forStudio: studioId };
  }, [studioId]);

  // Never render data that belongs to the previously selected studio.
  const current = data && data.forStudio === studioId ? data : null;
  const studios: any[] = useMemo(() => current?.pack?.studios ?? [], [current]);
  const all = !studioId;
  useEffect(() => setPicked(null), [studioId]);
  const active = studios.find(s => s.name === picked) ?? studios[0] ?? null;
  const studioName = boot.studios.find(s => s.id === studioId)?.name;
  const perStudio: any[] = current?.brief?.pack?.perStudio ?? [];

  if (error && !current) return <ErrorState message={error} retry={() => reload().catch(() => {})} />;
  if (!current) return <Loading label="Loading pack insights…" />;

  return (
    <div className="insights-hub">
      <PageHeader
        eyebrow="PERFORMANCE HISTORY & INSIGHTS"
        title={all ? 'Insights across all locations' : `Insights: ${studioName ?? current.pack.scope ?? ''}`}
        description={
          <>
            What the 2027 Sales Plan Pack found in each studio&apos;s sales history (Nov-2024 to Oct-2026), and how the
            2027 targets were built from it.
          </>
        }
        meta={
          <>
            <Badge tone="blue">Source: 2027 Sales Plan Pack</Badge>
            {loading && <Badge tone="amber">Updating…</Badge>}
          </>
        }
        actions={
          <Button variant="secondary" onClick={() => navigate('/sales-plan/targets')}>
            Open 2027 targets <ArrowRight size={15} />
          </Button>
        }
      />

      {current.pack.note && (
        <Callout tone="info" title={studios.length ? 'Coverage' : 'No insights for this location'}>
          {current.pack.note}
        </Callout>
      )}

      {!studios.length ? (
        <EmptyState
          title="No pack insights to show"
          text={current.pack.source ? 'Select All locations, Kemps Corner, Bandra, Kenkere House or Pop-up.' : current.pack.note || 'Pack data is missing.'}
        />
      ) : (
        <>
          {all && (
            <div className="pk-hub-grid">
              {studios.map(s => {
                const ps = perStudio.find(p => p.name === s.name);
                const lede = (s.insights.intro || []).find((b: any) => b.t === 'callout');
                return (
                  <button
                    key={s.name}
                    type="button"
                    className={`pk-hub-card ${active?.name === s.name ? 'active' : ''}`}
                    onClick={() => setPicked(s.name)}
                  >
                    <h3>{s.name}</h3>
                    {ps && (
                      <>
                        <span className="pk-kpi">{lakh(ps.l12)}</span>
                        <small>
                          Last 12 months{signed(ps.yoy) ? `, ${signed(ps.yoy)} YoY` : ''} · 2027 target {lakh(ps.target2027)}
                        </small>
                      </>
                    )}
                    {lede?.lead && <p><strong>{lede.lead}</strong></p>}
                  </button>
                );
              })}
            </div>
          )}

          {active && (
            <div key={active.name}>
              <div className="pk-doc-switch">
                <div className="ws-segmented" role="group" aria-label="Document">
                  <button type="button" className={doc === 'insights' ? 'active' : ''} onClick={() => setDoc('insights')}>
                    Performance history & insights
                  </button>
                  <button type="button" className={doc === 'targetsSummary' ? 'active' : ''} onClick={() => setDoc('targetsSummary')}>
                    2027 targets summary
                  </button>
                </div>
                {all && <Badge tone="green">{active.name}</Badge>}
              </div>
              <PackInsights
                doc={active[doc]}
                label={doc === 'insights' ? 'insights' : 'targets summary'}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
