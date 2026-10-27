import '../styles/target-matrix.css';
import React, { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Check, ChevronRight, History, RefreshCw, Save, ShieldCheck, Sparkles } from 'lucide-react';
import { api, patch, post } from '../api';
import { useApp } from '../App';
import { Link } from 'react-router-dom';
import { useLoad } from '../hooks';
import { MONTHS, MONTHS_SHORT, money, number, percent, titleCase } from '../types';
import {
  Badge,
  Button,
  Callout,
  Card,
  CardHeader,
  DefinitionList,
  ErrorState,
  Field,
  Input,
  Loading,
  Modal,
  Select,
  TableScroll,
  Tabs,
} from '../components/ui';
import PageHeader from '../components/PageHeader';

function TargetCell({
  value,
  basis,
  onSave,
}: {
  value: number | null;
  basis: string;
  onSave: (value: number) => void;
}) {
  const [draft, setDraft] = useState(value ?? 0);
  useEffect(() => setDraft(value ?? 0), [value]);
  return (
    <div className={`target-cell ${basis}`}>
      <span>₹</span>
      <input
        type="number"
        min="0"
        step="1000"
        value={Math.round(draft)}
        onChange={e => setDraft(Number(e.target.value))}
        onBlur={() => {
          if (draft !== value) onSave(Math.max(0, draft));
        }}
        aria-label={`${basis} revenue target`}
      />
    </div>
  );
}
const growth = (value: number | null | undefined, ly: number | null | undefined) =>
  value === null || value === undefined || !ly ? null : (value - ly) / ly;
const growthLabel = (value: number | null | undefined, ly: number | null | undefined) => {
  const g = growth(value, ly);
  return g === null ? '—' : `${g >= 0 ? '+' : '−'}${percent(Math.abs(g), 0, true)}`;
};
const growthTone = (value: number | null | undefined, ly: number | null | undefined) => {
  const g = growth(value, ly);
  return `tm-growth${g === null ? ' muted' : g < 0 ? ' down' : ''}`;
};
export default function AnnualPlanner() {
  const { studioId, year, toast, can } = useApp();
  const [basis, setBasis] = useState('proposed');
  const [editing, setEditing] = useState<any>(null),
    [versions, setVersions] = useState<any>(null),
    [approvingStudio, setApprovingStudio] = useState<number | null>(null);
  const {
    data: raw,
    setData,
    loading,
    error,
    reload,
  } = useLoad<any>(() => api(`/targets?year=${year}${studioId ? `&studio=${studioId}` : ''}`), [year, studioId]);
  // One editable row per target: Pop-up is the sum of its venues (edit the venues), and legacy venues
  // with no target are hidden, so the grid's totals match the plan.
  const data = useMemo(() => {
    if (!raw) return raw;
    const live = new Set(
      raw.rows
        .filter((r: any) => Number(r.proposed_target || 0) > 0 || r.approved_target !== null)
        .map((r: any) => r.studio_id),
    );
    const hasVenues = raw.rows.some((r: any) => r.studio === 'Copper + Cloves' || r.studio === 'Plash Pilates');
    return {
      ...raw,
      rows: raw.rows.filter((r: any) => live.has(r.studio_id) && !(hasVenues && r.studio === 'Pop-up')),
    };
  }, [raw]);
  const groups = useMemo(() => {
    const map = new Map();
    data?.rows.forEach((r: any) => {
      if (!map.has(r.studio_id)) map.set(r.studio_id, { studio: r.studio, city: r.city, months: Array(12).fill(null) });
      map.get(r.studio_id).months[r.month - 1] = r;
    });
    return [...map.values()].map(g => ({
      ...g,
      proposed: g.months.reduce((s: number, r: any) => s + (r?.proposed_target || 0), 0),
      approved: g.months.reduce((s: number, r: any) => s + (r?.approved_target || 0), 0),
      ly: g.months.reduce((s: number, r: any) => s + (r?.historical_revenue || 0), 0),
      approvedCount: g.months.filter((r: any) => r && r.approved_target !== null).length,
    }));
  }, [data]);
  const reconciliation = useMemo(
    () => ({
      proposed: data?.rows.reduce((s: number, r: any) => s + r.proposed_target, 0) || 0,
      approved: data?.rows.reduce((s: number, r: any) => s + (r.approved_target || 0), 0) || 0,
      approvedMonths: data?.rows.filter((r: any) => r.approved_target !== null).length || 0,
    }),
    [data],
  );
  const monthTotals = useMemo(
    () =>
      MONTHS_SHORT.map((_, i) => {
        const rows = data?.rows.filter((r: any) => r.month === i + 1) || [];
        return {
          proposed: rows.reduce((s: number, r: any) => s + r.proposed_target, 0),
          approved: rows.reduce((s: number, r: any) => s + (r.approved_target || 0), 0),
          ly: rows.reduce((s: number, r: any) => s + (r.historical_revenue || 0), 0),
        };
      }),
    [data],
  );
  const lyTotal = monthTotals.reduce((s, t) => s + t.ly, 0);
  const updateRow = (saved: any) =>
    setData((current: any) => ({ ...current, rows: current.rows.map((r: any) => (r.id === saved.id ? saved : r)) }));
  const saveInline = async (row: any, value: number) => {
    try {
      const saved = await patch(
        `/targets/${row.id}`,
        basis === 'approved'
          ? { approvedTarget: value, reason: 'Approved and edited in the annual target matrix.' }
          : { proposedTarget: value },
      );
      updateRow(saved);
      toast(`${row.studio} · ${MONTHS[row.month - 1]} target recalculated.`);
    } catch (error: any) {
      toast(error.message, 'error');
      reload().catch(() => {});
    }
  };
  const approveLocation = async (group: any) => {
    if (approvingStudio !== null) return;
    const firstPending = group.months.find((row: any) => row && row.approved_target == null);
    if (!firstPending) return;
    if (
      !window.confirm(
        `Approve all proposed ${year} monthly targets for ${group.studio}? This will approve ${12 - group.approvedCount} months.`,
      )
    )
      return;
    setApprovingStudio(firstPending.studio_id);
    try {
      const result = await post(`/targets/studio/${firstPending.studio_id}/${year}/approve-all`, {});
      await reload();
      toast(`${group.studio}: ${result.approved} monthly target${result.approved === 1 ? '' : 's'} approved.`);
    } catch (error: any) {
      toast(error.message || 'Could not approve this location’s targets.', 'error');
    } finally {
      setApprovingStudio(null);
    }
  };
  const openVersions = async (row: any) => {
    try {
      const rows = await api(`/targets/${row.id}/versions`);
      setVersions({ target: row, rows });
    } catch (error: any) {
      toast(error.message, 'error');
    }
  };
  if (loading && !data) return <Loading label="Reconciling the annual target matrix…" />;
  if (error && !data) return <ErrorState message={error} retry={() => reload().catch(() => {})} />;
  if (!data) return null;
  return (
    <div className="tm">
      <PageHeader
        eyebrow="ALL STUDIOS"
        title={`${year} target matrix`}
        description="Set and approve monthly revenue targets for every studio in one grid."
      />
      {year === 2027 &&
        (() => {
          const kc = data.rows.filter((r: any) => r.studio === 'Kemps Corner');
          if (!kc.some((r: any) => r.assumptions.rentAdjustment)) return null;
          const vals = kc.map((r: any) => Number(r.approved_target ?? r.proposed_target) || 0);
          const L = (v: number) => `₹${(v / 1e5).toFixed(1)}L`;
          return (
            <Callout tone="info" title="Kemps Corner · rent-aware 2027 operating plan">
              Kwality House rent increases from January 2027. Monthly targets keep their seasonality and currently run
              from {L(Math.min(...vals))} to {L(Math.max(...vals))} (
              {L(vals.reduce((a: number, b: number) => a + b, 0))} for the year). These are proposals until approved; no
              rent expense is modelled.
            </Callout>
          );
        })()}
      <section className="tm-summary" aria-label="Annual target summary">
        <div className="tm-stat">
          <span className="tm-label">Proposed plan</span>
          <strong>{money(reconciliation.proposed, true)}</strong>
          <small>
            {groups.length} {groups.length === 1 ? 'studio' : 'studios'} · 12 months
            {lyTotal > 0 && <> · {growthLabel(reconciliation.proposed, lyTotal)} vs LY</>}
          </small>
        </div>
        <div className="tm-stat">
          <span className="tm-label">Approved</span>
          <strong>{money(reconciliation.approved, true)}</strong>
          <small>
            {reconciliation.approvedMonths} of {data.rows.length} studio-months
          </small>
          <div className="tm-progress" aria-hidden>
            <i
              style={{ width: `${data.rows.length ? (reconciliation.approvedMonths / data.rows.length) * 100 : 0}%` }}
            />
          </div>
        </div>
        <div className="tm-stat">
          <span className="tm-label">Awaiting approval</span>
          <strong>{money(reconciliation.proposed - reconciliation.approved, true)}</strong>
          <small>Recommendation, not a final decision</small>
        </div>
        <div className="tm-stat">
          <span className="tm-label">Last year actual</span>
          <strong>{lyTotal > 0 ? money(lyTotal, true) : '—'}</strong>
          <small>Historical revenue, same months</small>
        </div>
      </section>
      <p className="tm-hint">
        This page is the all-studio number grid. Each studio's month-by-month target, action plan and offers live in{' '}
        <Link to="/sales-plan/plan">Plan › Sales Plan</Link>.
      </p>
      {
        <section className="tm-section">
          <header className="tm-section-head">
            <div>
              <h2>Studio × month targets</h2>
              <p>
                Edit a value and move away to save. Approved edits open an audit-reason dialog. Each cell shows last
                year&apos;s revenue and growth.
              </p>
            </div>
            <div className="tm-toolbar">
              <div className="tm-legend" aria-hidden>
                <span>
                  <i className="dot approved" /> Approved
                </span>
                <span>
                  <i className="dot" /> Proposed
                </span>
              </div>
              <div className="tm-segmented" role="group" aria-label="Values shown">
                <button className={basis === 'proposed' ? 'active' : ''} onClick={() => setBasis('proposed')}>
                  Proposed
                </button>
                <button className={basis === 'approved' ? 'active' : ''} onClick={() => setBasis('approved')}>
                  Approved
                </button>
              </div>
            </div>
          </header>
          <div className="tm-scroll">
            <table className="tm-table">
              <thead>
                <tr>
                  <th className="tm-sticky">Studio</th>
                  {MONTHS_SHORT.map(m => (
                    <th key={m}>{m}</th>
                  ))}
                  <th className="tm-total">Annual</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g: any) => {
                  const annual = basis === 'approved' ? g.approved : g.proposed;
                  return (
                    <tr key={g.studio}>
                      <th scope="row" className="tm-sticky">
                        <strong>{g.studio}</strong>
                        <span>
                          {g.city} · {g.approvedCount}/12 approved
                        </span>
                        {can('target_approve') && g.approvedCount < 12 && g.months.some((row: any) => row) && (
                          <button
                            type="button"
                            className="tm-bulk-approve"
                            disabled={approvingStudio !== null}
                            onClick={() => void approveLocation(g)}
                          >
                            {approvingStudio !== null && g.months.some((row: any) => row?.studio_id === approvingStudio)
                              ? 'Approving…'
                              : 'Approve all months'}
                          </button>
                        )}
                      </th>
                      {g.months.map((r: any, i: number) =>
                        r ? (
                          <td key={r.id} className={r.approved_target !== null ? 'is-approved' : ''}>
                            <TargetCell
                              basis={basis}
                              value={basis === 'approved' ? r.approved_target : r.proposed_target}
                              onSave={value =>
                                basis === 'approved'
                                  ? setEditing({ ...r, approvedTarget: value })
                                  : saveInline(r, value)
                              }
                            />
                            <div className="tm-cell-meta">
                              <span
                                className={growthTone(
                                  basis === 'approved' ? r.approved_target : r.proposed_target,
                                  r.historical_revenue,
                                )}
                                title={`Last year ${money(r.historical_revenue)}`}
                              >
                                {growthLabel(
                                  basis === 'approved' ? r.approved_target : r.proposed_target,
                                  r.historical_revenue,
                                )}
                              </span>
                              <button
                                onClick={() => setEditing(r)}
                                title={`Open detail · ${titleCase(r.scenario)} · v${r.version}${
                                  r.override_reason ? ` · ${r.override_reason}` : ''
                                }`}
                              >
                                {r.approved_target !== null && <ShieldCheck size={11} />}
                                {r.approved_target !== null ? 'approved' : 'detail'}
                              </button>
                              {r.version > 1 && (
                                <button
                                  className="tm-version"
                                  onClick={() => openVersions(r)}
                                  title="Version history"
                                  aria-label={`Version history, version ${r.version}`}
                                >
                                  v{r.version}
                                </button>
                              )}
                            </div>
                            <div className="tm-cell-ly">LY {money(r.historical_revenue, true)}</div>
                          </td>
                        ) : (
                          <td key={i} className="tm-empty">
                            —
                          </td>
                        ),
                      )}
                      <td className="tm-total">
                        <strong>{money(annual, true)}</strong>
                        <span className={growthTone(annual, g.ly)}>{growthLabel(annual, g.ly)} vs LY</span>
                        <div className="tm-cell-ly">LY {money(g.ly, true)}</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row" className="tm-sticky">
                    <strong>Business plan</strong>
                    <span>All studios</span>
                  </th>
                  {monthTotals.map((t, i) => {
                    const v = basis === 'approved' ? t.approved : t.proposed;
                    return (
                      <td key={i}>
                        <strong>{money(v, true)}</strong>
                        <span className={growthTone(v, t.ly)}>{growthLabel(v, t.ly)}</span>
                        <div className="tm-cell-ly">LY {money(t.ly, true)}</div>
                      </td>
                    );
                  })}
                  <td className="tm-total">
                    <strong>
                      {money(basis === 'approved' ? reconciliation.approved : reconciliation.proposed, true)}
                    </strong>
                    <span
                      className={growthTone(
                        basis === 'approved' ? reconciliation.approved : reconciliation.proposed,
                        lyTotal,
                      )}
                    >
                      {growthLabel(basis === 'approved' ? reconciliation.approved : reconciliation.proposed, lyTotal)}{' '}
                      vs LY
                    </span>
                    <div className="tm-cell-ly">LY {money(lyTotal, true)}</div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="tm-note">
            Blank/zero approved cells are intentional until management approves a target. Growth compares the shown
            value with last year&apos;s historical revenue for the same month.
          </p>
        </section>
      }
      {editing && (
        <TargetEditor
          target={editing}
          canApprove={can('target_approve')}
          onClose={() => setEditing(null)}
          onSave={async body => {
            try {
              const saved = await patch(`/targets/${editing.id}`, body);
              updateRow(saved);
              setEditing(null);
              toast('Target, allocations and funnel recalculated.');
            } catch (error: any) {
              toast(error.message, 'error');
            }
          }}
        />
      )}
      {versions && (
        <Modal
          title="Target version history"
          subtitle={`${versions.target.studio} · ${MONTHS[versions.target.month - 1]} ${versions.target.year}`}
          onClose={() => setVersions(null)}
          width="800px"
        >
          <div className="version-list">
            {versions.rows.map((v: any) => (
              <details key={v.id}>
                <summary>
                  <strong>Version {v.version}</strong>
                  <span>
                    {v.changed_by_name || 'System'} · {new Date(v.changed_at).toLocaleString('en-IN')}
                  </span>
                </summary>
                <p>{v.change_reason}</p>
                <pre>{JSON.stringify(JSON.parse(v.snapshot), null, 2)}</pre>
              </details>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
export function TargetEditor({
  target,
  canApprove,
  onClose,
  onSave,
}: {
  target: any;
  canApprove: boolean;
  onClose: () => void;
  onSave: (body: any) => void;
}) {
  const [proposed, setProposed] = useState<any>(target.proposedTarget ?? target.proposed_target),
    [approved, setApproved] = useState<any>(target.approvedTarget ?? target.approved_target ?? ''),
    [reason, setReason] = useState('Management review in annual planner.');
  return (
    <Modal
      title={`Edit ${target.studio} · ${MONTHS[target.month - 1]}`}
      subtitle="Changes are versioned. Leads, first visits, clients and units recalculate from the target (Targets › target breakdown)."
      onClose={onClose}
      width="780px"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            icon={<Save size={15} />}
            onClick={() =>
              onSave({
                proposedTarget: Number(proposed),
                ...(canApprove && approved !== '' ? { approvedTarget: Number(approved) } : {}),
                reason,
              })
            }
          >
            Save & recalculate
          </Button>
        </>
      }
    >
      <div className="form-grid two">
        <Field label="Proposed revenue target (₹)">
          <Input type="number" min="0" value={proposed} onChange={e => setProposed(e.target.value)} />
        </Field>
        <Field
          label="Approved revenue target (₹)"
          hint={
            canApprove
              ? 'Leave blank to keep target unapproved.'
              : 'Your role can edit proposals but cannot approve targets.'
          }
        >
          <Input
            type="number"
            min="0"
            value={approved}
            onChange={e => setApproved(e.target.value)}
            disabled={!canApprove}
          />
        </Field>
        <Field label="Change / approval reason" required>
          <Input value={reason} onChange={e => setReason(e.target.value)} />
        </Field>
      </div>
      <Callout title="Recommendation provenance">
        {String(target.assumptions.scenarioExplanation || '').replace(/\s*Stretch:[^.]*\.?/g, '')} Comparable month:{' '}
        {target.assumptions.comparableMonth || 'unavailable'}. {target.assumptions.rentAdjustment?.reason}
      </Callout>
    </Modal>
  );
}
