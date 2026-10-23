import React, { useState } from 'react';
import { FlaskConical, Play, Plus, Pause } from 'lucide-react';
import { api, patch, post } from '../api';
import { useApp } from '../App';
import { useLoad } from '../hooks';
import { money, number, percent, titleCase } from '../types';
import { Badge, Button, Callout, Card, CardHeader, EmptyState, ErrorState, Field, Input, Loading, Metric, Modal, Select, TableScroll, Textarea } from './ui';

export default function ExperimentPanel() {
  const { studioId, toast, can } = useApp();
  const { data, loading, error, reload } = useLoad<any>(() => api(`/experiments${studioId ? `?studio=${studioId}` : ''}`), [studioId]);
  const [creating, setCreating] = useState(false), [results, setResults] = useState<any>(null);
  const update = async (experiment: any, body: any) => { try { await patch(`/experiments/${experiment.id}`, body); toast('Experiment updated and audited.'); await reload(); } catch (e: any) { toast(e.message, 'error'); } };
  if (loading && !data) return <Loading label="Loading offer experiments…"/>;
  if (error && !data) return <ErrorState message={error} retry={() => reload().catch(() => {})}/>;
  const rows = data?.rows || [];
  return <div>
    <div className="planning-summary"><Metric label="Experiments in view" value={number(rows.length)} detail="Control and variant remain linked"/><Metric label="Running" value={number(rows.filter((row: any) => row.status === 'running').length)} detail="Execution status, not performance"/><Metric label="With aggregate outcomes" value={number(rows.filter((row: any) => row.results?.control).length)} detail="Observed arm data only"/><Metric label="Minimum sample / arm" value={number(Math.min(...rows.map((row: any) => row.minimum_sample || 30)))} detail="Configured threshold; not a power analysis"/></div>
    <Card><CardHeader title="Newcomer offer experiments" subtitle="Monthly cadence · aggregate outcomes · no automatic causal-lift claim" action={can('offer_create') && <Button icon={<Plus size={15}/>} onClick={() => setCreating(true)}>Create 2-for-1 vs 3-for-2 test</Button>}/>{rows.length ? <TableScroll><table className="data-table"><thead><tr><th>Experiment</th><th>Control → variant</th><th>Cadence & sample</th><th>Observed purchase rates</th><th>Status</th><th>Actions</th></tr></thead><tbody>{rows.map((row: any) => <tr key={row.id}><td><strong>{row.name}</strong><span>{row.studio} · {row.start_date} → {row.end_date || 'open'}</span><small>{row.hypothesis}</small></td><td><strong>{row.control_name}</strong><span>versus {row.variant_name}</span></td><td>{titleCase(row.cadence)}<small>Minimum {row.minimum_sample} eligible / arm</small></td><td>{row.comparison ? <><strong>{percent(row.comparison.controlPurchaseRate, 1, true)} → {percent(row.comparison.variantPurchaseRate, 1, true)}</strong><small>Difference {percent(row.comparison.absoluteRateDifference, 1, true)} · not causal proof</small></> : <span>No sourced outcomes</span>}</td><td><Badge tone={row.status === 'running' ? 'green' : row.status === 'completed' ? 'blue' : 'amber'}>{titleCase(row.status)}</Badge></td><td><div className="row-actions">{row.status === 'draft' && <Button size="sm" variant="secondary" icon={<Play size={13}/>} onClick={() => update(row, { status: 'running' })}>Start</Button>}{row.status === 'running' && <Button size="sm" variant="secondary" icon={<Pause size={13}/>} onClick={() => update(row, { status: 'paused' })}>Pause</Button>}<Button size="sm" variant="secondary" onClick={() => setResults(row)}>Record results</Button></div></td></tr>)}</tbody></table></TableScroll> : <EmptyState icon={<FlaskConical size={28}/>} title="No experiments in this scope" text="Create two fresh policy-checked drafts and link them as control and variant. No results are assumed."/>}</Card>
    <Callout tone="info">A monthly cadence describes when arms are reviewed; it does not randomise customers by itself. Record the actual assignment and data source before interpreting observed differences.</Callout>
    {creating && <ExperimentCreator onClose={() => setCreating(false)} onDone={async () => { setCreating(false); await reload(); }}/>} 
    {results && <ResultsEditor experiment={results} onClose={() => setResults(null)} onSave={async body => { await update(results, body); setResults(null); }}/>} 
  </div>;
}

function ExperimentCreator({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { boot, studioId: globalStudio, year, toast } = useApp();
  const [studioId, setStudioId] = useState(globalStudio || boot.studios.find(s => s.name === 'Kenkere House')?.id || boot.studios[0].id);
  const [startDate, setStartDate] = useState(`${year}-01-01`), [endDate, setEndDate] = useState(`${year}-12-31`), [minimumSample, setMinimumSample] = useState(30), [saving, setSaving] = useState(false);
  const [hypothesis, setHypothesis] = useState('Three classes for the price of two may improve first-month attendance and downstream purchase while retaining more cash per buyer than 2-for-1.');
  const submit = async () => {
    setSaving(true);
    try {
      await post('/experiments/newcomer', { studioId, hypothesis, startDate, endDate, minimumSample });
      toast('Two draft offers and their linked experiment were saved.'); await onDone();
    } catch (e: any) { toast(e.message, 'error'); } finally { setSaving(false); }
  };
  return <Modal title="Create monthly newcomer value test" subtitle="This creates new draft offers; it does not approve, launch or randomise them." onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={submit} disabled={saving}>{saving ? 'Building & validating…' : 'Create drafts & experiment'}</Button></>}><div className="form-grid two"><Field label="Studio"><Select value={studioId} onChange={e => setStudioId(Number(e.target.value))}>{boot.studios.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field><Field label="Minimum eligible sample / arm"><Input type="number" min="1" value={minimumSample} onChange={e => setMinimumSample(Number(e.target.value))}/></Field><Field label="Start date"><Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}/></Field><Field label="End date"><Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}/></Field></div><Field label="Hypothesis"><Textarea rows={4} value={hypothesis} onChange={e => setHypothesis(e.target.value)}/></Field><Callout tone="warning">Copper + Cloves and Plash Pilates use paid trials, so the policy engine will reject a newcomer bundle there rather than inventing one.</Callout></Modal>;
}

function ResultsEditor({ experiment, onClose, onSave }: { experiment: any; onClose: () => void; onSave: (body: any) => Promise<void> }) {
  const initial = experiment.results || {};
  const [control, setControl] = useState<any>({ eligible: 0, buyers: 0, revenue: 0, attended: 0, benefitCost: 0, ...initial.control });
  const [variant, setVariant] = useState<any>({ eligible: 0, buyers: 0, revenue: 0, attended: 0, benefitCost: 0, ...initial.variant });
  const [source, setSource] = useState(initial.source === 'not_recorded' ? '' : initial.source || ''), [status, setStatus] = useState(experiment.status === 'completed' ? 'completed' : 'running'), [error, setError] = useState('');
  const arm = (label: string, value: any, setter: any) => <fieldset className="experiment-arm"><legend>{label}</legend><div className="form-grid two">{[['eligible','Eligible assigned'],['buyers','Buyers'],['revenue','Cash revenue (₹)'],['attended','Attended classes'],['benefitCost','Benefit cost (₹)']].map(([key, title]) => <Field key={key} label={title}><Input type="number" min="0" value={value[key] ?? 0} onChange={e => setter((current: any) => ({ ...current, [key]: Number(e.target.value) }))}/></Field>)}</div></fieldset>;
  const submit = async () => {
    if (!source.trim()) { setError('An aggregate outcome source is required.'); return; }
    await onSave({ status, results: { control, variant, source, recordedAt: new Date().toISOString() }, reason: 'Aggregate experiment outcomes recorded in Offer Bank.' });
  };
  return <Modal title={`Record outcomes · ${experiment.name}`} subtitle="Use aggregate arm data only. Buyers cannot exceed eligible assignments; revenue is attributed cash, not incremental lift." onClose={onClose} width="820px" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={submit}>Save aggregate results</Button></>}><div className="two-column">{arm('Control · 2-for-1', control, setControl)}{arm('Variant · 3-for-2', variant, setVariant)}</div><div className="form-grid two"><Field label="Aggregate data source" required><Input value={source} onChange={e => setSource(e.target.value)} placeholder="e.g. experiment assignment export, October 2027"/></Field><Field label="Experiment status"><Select value={status} onChange={e => setStatus(e.target.value)}><option value="running">Running</option><option value="paused">Paused</option><option value="completed">Completed</option></Select></Field></div>{error && <Callout tone="danger">{error}</Callout>}<Callout tone="info">The server calculates rate differences after saving. It does not calculate statistical significance or claim causal lift from these fields alone.</Callout></Modal>;
}
