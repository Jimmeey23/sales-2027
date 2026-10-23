import React, { useEffect, useMemo, useState } from 'react';
import { Activity, ArrowDown, ArrowUp, BarChart3, Bookmark, CalendarClock, Check, ChevronRight, Columns3, Database, Download, FileBarChart, FileSpreadsheet, FlaskConical, FolderOpen, LineChart as LineChartIcon, Package, Percent, Printer, RefreshCw, Save, Search, ShieldCheck, SlidersHorizontal, Target, Trash2, UsersRound, X } from 'lucide-react';
import { api, downloadUrl, post } from '../api';
import { useApp } from '../App';
import { useLoad } from '../hooks';
import { money, number, percent, titleCase } from '../types';
import { Badge, Button, Callout, Card, CardHeader, DefinitionList, EmptyState, ErrorState, Field, IconButton, Input, Loading, Modal, Select, TableScroll, Tabs } from '../components/ui';
import PageHeader from '../components/PageHeader';
import ReportChart from '../components/ReportChart';

const categoryIcons: Record<string,any> = { Executive: BarChart3, Commercial: Package, Retention: RefreshCw, Operations: Activity, Governance: ShieldCheck };
const reportIcons: Record<string,any> = {
  'monthly-performance': BarChart3, 'annual-studio-performance': FileBarChart, 'revenue-streams': Activity, 'target-attainment': Target,
  'target-scenarios': SlidersHorizontal, 'product-performance': Package, 'discount-exposure': Percent, 'offer-portfolio': FileSpreadsheet,
  'campaign-performance': CalendarClock, 'experiment-register': FlaskConical, 'lead-sources': UsersRound, 'renewal-due': RefreshCw,
  'package-lifecycle': Package, 'historical-renewal-revenue': CalendarClock, 'attendance-cancellations': Activity,
  'class-attendance': Activity, 'trainer-delivery': UsersRound, 'studio-capacity': BarChart3, 'import-provenance': Database,
  'data-quality': Database, 'audit-activity': ShieldCheck,
};
const categories = ['All','Executive','Commercial','Retention','Operations','Governance'];
const queryFor = (options: any) => {
  const query = new URLSearchParams();
  Object.entries(options || {}).forEach(([key,value]) => {
    if (value === undefined || value === null || value === '') return;
    query.set(key,Array.isArray(value) ? value.join(',') : String(value));
  });
  return query.toString();
};
const defaultsFor = (definition: any, defaults: any, studioId: number | null) => ({
  report: definition.id,
  from: definition.period === 'actual' ? defaults.actualFrom : defaults.planningFrom,
  to: definition.period === 'actual' ? defaults.actualTo : defaults.planningTo,
  studio: definition.studioFilter ? studioId || undefined : undefined,
  status: '', dataMode: '', scenario: definition.scenarioFilter ? 'standard' : undefined,
  limit: 200, sort: definition.defaultSort?.key, direction: definition.defaultSort?.direction || 'desc', search: '',
  columns: definition.columns.map((column: any) => column.key),
});
const cell = (value: any, type = 'text') => value === null || value === undefined || value === '' ? '—' :
  type === 'currency' ? money(value) : type === 'percent' ? percent(value) : type === 'ratio' ? percent(value,1,true) : type === 'number' ? number(value,2) : String(value);

export default function Reports() {
  const { boot, studioId: globalStudio, can, toast } = useApp();
  const catalogue = useLoad<any>(() => api('/reporting/catalog'), []);
  const saved = useLoad<any>(() => api('/reporting/saved'), []);
  const [selectedId,setSelectedId] = useState('monthly-performance'), [category,setCategory] = useState('All'), [librarySearch,setLibrarySearch] = useState('');
  const [draft,setDraft] = useState<any>(null), [applied,setApplied] = useState<any>(null), [resultTab,setResultTab] = useState('overview');
  const [chartMode,setChartMode] = useState<'bar'|'line'>('bar'), [visibleSeries,setVisibleSeries] = useState<string[]>([]), [chartLimit,setChartLimit] = useState(10);
  const [columnModal,setColumnModal] = useState(false), [saveModal,setSaveModal] = useState(false), [savedModal,setSavedModal] = useState(false);
  const [saveName,setSaveName] = useState(''), [savedId,setSavedId] = useState<number | null>(null), [saving,setSaving] = useState(false);
  const definitions = catalogue.data?.reports || [], selected = definitions.find((item: any) => item.id === selectedId) || definitions[0];
  const appliedQuery = useMemo(() => applied ? queryFor(applied) : '',[applied]);
  const result = useLoad<any>(() => appliedQuery ? api(`/reporting/run?${appliedQuery}`) : Promise.resolve(null),[appliedQuery]);
  const dirty = Boolean(draft && applied && JSON.stringify(draft) !== JSON.stringify(applied));

  useEffect(() => {
    if (!catalogue.data || draft) return;
    const definition = catalogue.data.reports[0], options = defaultsFor(definition,catalogue.data.defaults,globalStudio);
    setSelectedId(definition.id); setDraft(options); setApplied(options);
  },[catalogue.data]);
  useEffect(() => {
    if (!selected || !draft || !applied) return;
    const studio = selected.studioFilter ? globalStudio || undefined : undefined;
    setDraft((current: any) => ({ ...current, studio }));
    const next = { ...applied, studio };
    if (queryFor(next) !== appliedQuery) { result.setData(null); setApplied(next); }
  },[globalStudio]);
  useEffect(() => {
    if (!result.data?.chart) { setVisibleSeries([]); return; }
    setVisibleSeries(result.data.chart.series.map((series: any) => series.key));
    setChartMode(result.data.chart.kind === 'line' ? 'line' : 'bar');
  },[result.data?.definition?.id]);

  const commitOptions = (next: any, refreshIdentical = true) => {
    result.setData(null);
    if (queryFor(next) === appliedQuery) { if (refreshIdentical) result.reload().catch(() => {}); }
    else setApplied(next);
  };
  const chooseReport = (id: string) => {
    const definition = definitions.find((item: any) => item.id === id); if (!definition) return;
    const options = defaultsFor(definition,catalogue.data.defaults,definition.studioFilter ? (draft?.studio ?? globalStudio) : null);
    setSelectedId(id); setDraft(options); commitOptions(options); setSavedId(null); setSaveName(''); setResultTab('overview');
    window.setTimeout(() => document.getElementById('report-workbench')?.scrollIntoView({ behavior: 'smooth', block: 'start' }),60);
  };
  const update = (key: string,value: any) => setDraft((current: any) => ({ ...current,[key]: value }));
  const run = () => {
    if (!draft.columns?.length) { toast('Select at least one report column.','error'); return; }
    const next = { ...draft, limit: Number(draft.limit) };
    commitOptions(next);
  };
  const reset = () => selected && chooseReport(selected.id);
  const sortBy = (key: string) => {
    const direction = draft.sort === key && draft.direction === 'desc' ? 'asc' : draft.sort === key ? 'desc' : 'asc';
    const next = { ...draft, sort: key, direction }; setDraft(next); commitOptions(next);
  };
  const toggleColumn = (key: string) => {
    const columns = draft.columns.includes(key) ? draft.columns.filter((item: string) => item !== key) : [...draft.columns,key];
    update('columns',columns);
  };
  const exportReport = (format: 'csv'|'xlsx') => {
    if (dirty) { toast('Run the pending filters before exporting so the file matches the preview.','error'); return; }
    downloadUrl(`/reporting/export?${appliedQuery}&format=${format}`);
  };
  const openSave = () => { setSaveName(saveName || selected?.name || 'My report view'); setSaveModal(true); };
  const saveView = async () => {
    if (!saveName.trim()) return; setSaving(true);
    try {
      const row = await post('/reporting/saved',{ id: savedId, name: saveName.trim(), report: applied.report, config: applied });
      setSavedId(row.id); setSaveModal(false); await saved.reload(); toast(`Saved view “${row.name}” ${savedId ? 'updated' : 'created'}.`);
    } catch (error: any) { toast(error.message,'error'); } finally { setSaving(false); }
  };
  const loadView = (row: any) => {
    const definition = definitions.find((item: any) => item.id === row.report_id); if (!definition) { toast('This saved report is not available to your current role.','error'); return; }
    const options = { ...defaultsFor(definition,catalogue.data.defaults,globalStudio),...row.config, report: row.report_id };
    setSelectedId(row.report_id); setDraft(options); commitOptions(options); setSavedId(row.id); setSaveName(row.name); setSavedModal(false); setResultTab('overview');
  };
  const deleteView = async (row: any) => {
    if (!window.confirm(`Delete saved view “${row.name}”? The underlying report data is not changed.`)) return;
    try { await api(`/reporting/saved/${row.id}`,{ method: 'DELETE' }); if (savedId === row.id) setSavedId(null); await saved.reload(); toast('Saved view deleted.'); }
    catch (error: any) { toast(error.message,'error'); }
  };

  if (catalogue.loading && !catalogue.data) return <Loading label="Building the report catalogue…"/>;
  if (catalogue.error && !catalogue.data) return <ErrorState message={catalogue.error} retry={() => catalogue.reload().catch(() => {})}/>;
  if (!catalogue.data || !selected || !draft) return null;
  const visibleDefinitions = definitions.filter((definition: any) => (category === 'All' || definition.category === category) &&
    `${definition.name} ${definition.description} ${definition.evidence}`.toLowerCase().includes(librarySearch.toLowerCase()));
  const report = result.data;
  const series = report?.chart?.series || [];

  return <div className="reporting-page">
    <PageHeader eyebrow="MANAGEMENT REPORTING STUDIO" title="Every answer. One reporting workspace." description="Explore actuals, plans and operational evidence with reusable filters, interactive previews and consistent exports. No report silently mixes scenarios with observed performance."
      actions={<><Button variant="secondary" icon={<FolderOpen size={16}/>} onClick={() => setSavedModal(true)}>Saved views <Badge>{saved.data?.rows?.length || 0}</Badge></Button><Button variant="secondary" icon={<Printer size={16}/>} onClick={() => window.print()} disabled={dirty || !report}>Print / PDF</Button></>}/>
    <section className="reporting-hero">
      <div><span className="report-hero-icon"><FileBarChart size={25}/></span><div><span>REPORT CATALOGUE</span><h3>{definitions.length} decision-ready reports</h3><p>Five business domains · one calculation and export engine · server-persisted views</p></div></div>
      <div className="report-hero-stats"><div><strong>CSV + XLSX</strong><span>Matching preview & export</span></div><div><strong>10,000</strong><span>Explicit export row guardrail</span></div><div><strong>{saved.data?.rows?.length || 0}</strong><span>Your saved views</span></div></div>
    </section>

    <div className="reporting-shell">
      <Card className="report-library">
        <div className="report-library-heading"><div><span>REPORT LIBRARY</span><strong>{visibleDefinitions.length} of {definitions.length}</strong></div><FileSpreadsheet size={19}/></div>
        <label className="report-library-search"><Search size={15}/><input aria-label="Search report catalogue" value={librarySearch} onChange={event => setLibrarySearch(event.target.value)} placeholder="Find a report…"/>{librarySearch && <button aria-label="Clear report search" onClick={() => setLibrarySearch('')}><X size={13}/></button>}</label>
        <div className="report-category-filter">{categories.map(item => <button key={item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{item}<span>{item === 'All' ? definitions.length : definitions.filter((definition: any) => definition.category === item).length}</span></button>)}</div>
        <div className="report-catalogue-list">{visibleDefinitions.map((definition: any) => {
          const Icon = reportIcons[definition.id] || categoryIcons[definition.category] || FileBarChart;
          return <button key={definition.id} className={`report-catalogue-item ${selected.id === definition.id ? 'selected' : ''}`} onClick={() => chooseReport(definition.id)}>
            <span className={`report-item-icon ${definition.category.toLowerCase()}`}><Icon size={17}/></span><span><strong>{definition.name}</strong><small>{definition.evidence}</small></span><ChevronRight size={14}/>
          </button>;
        })}{!visibleDefinitions.length && <EmptyState title="No reports found" text="Try a different search or category."/>}</div>
        <button className="report-saved-link" onClick={() => setSavedModal(true)}><Bookmark size={15}/><span>Open saved views</span><Badge>{saved.data?.rows?.length || 0}</Badge></button>
      </Card>

      <main className="report-workbench" id="report-workbench">
        <Card className="report-builder-card">
          <div className="report-builder-heading"><div><div className="report-builder-eyebrow"><Badge tone="purple">{selected.category}</Badge><Badge tone={selected.evidence.includes('Actual') || selected.evidence.includes('actual') ? 'green' : 'amber'}>{selected.evidence}</Badge></div><h2>{selected.name}</h2><p>{selected.description}</p></div><div className="report-header-actions"><Button variant="secondary" size="sm" icon={<Save size={14}/>} onClick={openSave} disabled={dirty || !report}>{savedId ? 'Update view' : 'Save view'}</Button>{can('export') && <><Button variant="secondary" size="sm" icon={<Download size={14}/>} onClick={() => exportReport('csv')} disabled={dirty || !report}>CSV</Button><Button size="sm" icon={<FileSpreadsheet size={14}/>} onClick={() => exportReport('xlsx')} disabled={dirty || !report}>XLSX</Button></>}</div></div>
          <div className="report-filter-panel">
            <div className="report-filter-title"><span><SlidersHorizontal size={15}/> Report controls</span>{dirty ? <Badge tone="amber">Pending changes</Badge> : <Badge tone="green">Preview in sync</Badge>}</div>
            <div className="form-grid four report-filter-grid">
              <Field label="From month"><Input aria-label="Report from month" type="month" value={draft.from} onChange={event => update('from',event.target.value)}/></Field>
              <Field label="To month"><Input aria-label="Report to month" type="month" value={draft.to} onChange={event => update('to',event.target.value)}/></Field>
              {selected.studioFilter ? <Field label="Studio"><Select aria-label="Report studio" value={draft.studio || ''} onChange={event => update('studio',event.target.value ? Number(event.target.value) : undefined)}><option value="">All accessible studios</option>{boot.studios.map((studio: any) => <option key={studio.id} value={studio.id}>{studio.name}</option>)}</Select></Field>
                : <Field label="Scope"><Input value="Consolidated business" disabled/></Field>}
              <Field label="Rows in preview"><Select aria-label="Preview row limit" value={draft.limit} onChange={event => update('limit',Number(event.target.value))}>{[50,100,200,500,1000].map(value => <option key={value} value={value}>Up to {value} rows</option>)}</Select></Field>
              {selected.statusOptions?.length > 0 && <Field label="Status"><Select aria-label="Report status" value={draft.status} onChange={event => update('status',event.target.value)}><option value="">All statuses</option>{selected.statusOptions.map((status: string) => <option key={status} value={status}>{titleCase(status)}</option>)}</Select></Field>}
              {selected.dataModeFilter && <Field label="Data mode"><Select aria-label="Report data mode" value={draft.dataMode} onChange={event => update('dataMode',event.target.value)}><option value="">All data modes</option>{['actual','scenario','demo','derived','user'].map(mode => <option key={mode} value={mode}>{titleCase(mode)}</option>)}</Select></Field>}
              {selected.scenarioFilter && <Field label="Target posture"><Select aria-label="Report target posture" value={draft.scenario} onChange={event => update('scenario',event.target.value)}><option value="nominal">Nominal</option><option value="standard">Standard</option><option value="aggressive">Aggressive</option></Select></Field>}
              <Field label="Search within results"><Input aria-label="Search report results" value={draft.search} onChange={event => update('search',event.target.value)} placeholder="Optional text filter"/></Field>
              <Field label="Sort column"><Select aria-label="Report sort column" value={draft.sort || ''} onChange={event => update('sort',event.target.value || undefined)}><option value="">Source order</option>{selected.columns.map((column: any) => <option key={column.key} value={column.key}>{column.label}</option>)}</Select></Field>
              <Field label="Sort direction"><Select aria-label="Report sort direction" value={draft.direction} onChange={event => update('direction',event.target.value)}><option value="asc">Ascending</option><option value="desc">Descending</option></Select></Field>
            </div>
            <div className="report-filter-actions"><Button variant="secondary" size="sm" icon={<Columns3 size={14}/>} onClick={() => setColumnModal(true)}>Columns · {draft.columns.length}/{selected.columns.length}</Button><Button variant="ghost" size="sm" onClick={reset}>Reset</Button><span>{dirty ? 'Run to refresh the preview and enable exports.' : `${applied.from} → ${applied.to}`}</span><Button icon={<RefreshCw size={15}/>} onClick={run} disabled={result.loading}> {result.loading ? 'Running…' : 'Run report'}</Button></div>
          </div>
        </Card>

        {dirty && <Callout tone="warning" title="Preview is from the previous run">Your filter changes are preserved, but the numbers and exports still represent {applied.from} → {applied.to} with the previous options. Select Run report to synchronise them.</Callout>}
        {result.loading && !report && <Loading label="Calculating report from source records…"/>}
        {result.error && !report && <ErrorState message={result.error} retry={run}/>}
        {report && <div className={`report-result ${result.loading ? 'is-refreshing' : ''}`} aria-busy={result.loading}>
          <div className="report-result-meta"><span><span className="live-dot"/> {report.definition.evidence}</span><span>{report.totalRows.toLocaleString('en-IN')} matching rows · generated {new Date(report.generatedAt).toLocaleString('en-IN')}</span>{result.loading && <Badge tone="amber">Refreshing</Badge>}</div>
          <div className="report-kpi-grid">{report.summary.map((metric: any) => <div key={metric.key} className={`report-kpi ${metric.type}`}><span>{metric.label}</span><strong>{cell(metric.value,metric.type)}</strong><small>{metric.type === 'currency' ? 'INR · current filter scope' : metric.type === 'percent' ? 'Calculated from report rows' : 'Current filter scope'}</small></div>)}</div>
          {report.truncated && <Callout tone="info" title="Preview row limit reached">Showing {report.returnedRows.toLocaleString('en-IN')} of {report.totalRows.toLocaleString('en-IN')} rows. Summaries and charts use all matching rows; only the table preview is limited. Exports above 10,000 rows are rejected rather than silently truncated.</Callout>}
          <Tabs value={resultTab} onChange={setResultTab} items={[{ id: 'overview', label: 'Visual overview' },{ id: 'table', label: 'Data table', count: report.totalRows },{ id: 'definitions', label: 'Definitions & provenance' }]}/>
          {resultTab === 'overview' && <div className="report-overview-grid">
            <Card className="report-chart-card"><CardHeader title="Report visual" subtitle={`${report.chart?.data?.length || 0} chart groups · all matching rows before table limits`} action={<div className="report-chart-modes"><IconButton label="Bar chart" aria-pressed={chartMode === 'bar'} className={chartMode === 'bar' ? 'active' : ''} onClick={() => setChartMode('bar')}><BarChart3 size={16}/></IconButton><IconButton label="Line chart" aria-pressed={chartMode === 'line'} className={chartMode === 'line' ? 'active' : ''} onClick={() => setChartMode('line')}><LineChartIcon size={16}/></IconButton></div>}/>
              {report.chart ? <><div className="report-series-controls"><span>Series</span>{series.map((item: any,index: number) => <button key={item.key} className={visibleSeries.includes(item.key) ? 'active' : ''} aria-pressed={visibleSeries.includes(item.key)} onClick={() => {
                const visible = visibleSeries.includes(item.key) ? visibleSeries.filter(key => key !== item.key) : [...visibleSeries,item.key];
                if (visible.length) setVisibleSeries(visible);
              }}><i style={{ background: ['#6857e5','#f27d5b','#237a67','#9b7bc8','#d6a524','#4c8dc9'][index % 6] }}/>{item.label}{visibleSeries.includes(item.key) && <Check size={11}/>}</button>)}<Select aria-label="Chart group limit" value={chartLimit} onChange={event => setChartLimit(Number(event.target.value))}>{[5,10,14].map(value => <option key={value} value={value}>Top {value}</option>)}</Select></div><ReportChart chart={report.chart} mode={chartMode} series={visibleSeries} limit={chartLimit}/></> : <EmptyState title="Tabular report" text="This report is designed for detailed inspection rather than a chart."/>}
            </Card>
            <Card className="report-context-card"><CardHeader title="Scope & evidence"/><DefinitionList items={[["Period",`${report.options.from} → ${report.options.to}`],["Studio",report.options.studio ? boot.studios.find((item: any) => item.id === report.options.studio)?.name : 'All accessible studios'],["Report rows",number(report.totalRows)],["Selected columns",`${report.columns.length} of ${report.allColumns.length}`],["Latest complete sales month",report.provenance.latestCompleteSalesMonth],["Source",report.provenance.source]]}/><Callout tone={report.definition.evidence.toLowerCase().includes('actual') ? 'info' : 'warning'}>{report.definition.notes[0]}</Callout><Button variant="secondary" size="sm" onClick={() => setResultTab('definitions')}>Review all definitions <ChevronRight size={14}/></Button></Card>
          </div>}
          {resultTab === 'table' && <Card className="report-data-card"><CardHeader title="Detailed report data" subtitle={`${report.returnedRows} rows shown · ${report.columns.length} selected columns · select a header to sort`} action={<Badge>{report.options.sort ? `${report.options.sort} · ${report.options.direction}` : 'Source order'}</Badge>}/>
            {report.rows.length ? <TableScroll><table className="data-table report-data-table"><thead><tr><th className="row-number">#</th>{report.columns.map((column: any) => <th key={column.key} className={['currency','number','percent','ratio'].includes(column.type) ? 'num' : ''}><button onClick={() => sortBy(column.key)}>{column.label}{report.options.sort === column.key && (report.options.direction === 'asc' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>)}</button></th>)}</tr></thead><tbody>{report.rows.map((row: any,index: number) => <tr key={index}><td className="row-number">{index + 1}</td>{report.columns.map((column: any) => <td key={column.key} className={['currency','number','percent','ratio'].includes(column.type) ? 'num' : ''}>{cell(row[column.key],column.type)}</td>)}</tr>)}</tbody></table></TableScroll>
              : <EmptyState icon={<Search size={26}/>} title="No rows match this report scope" text="Change the period, studio or filters. No missing values have been imputed."/>}
          </Card>}
          {resultTab === 'definitions' && <div className="report-definitions-grid"><Card><CardHeader title="Metric definitions & limitations"/><ul className="report-notes-list">{report.definition.notes.map((note: string,index: number) => <li key={index}><span>{String(index + 1).padStart(2,'0')}</span><p>{note}</p></li>)}</ul></Card><Card><CardHeader title="Provenance & export integrity"/><DefinitionList items={[["Evidence",report.definition.evidence],["Reporting engine",report.provenance.source],["Studio scope",String(report.provenance.studioScope)],["Sales coverage",`${report.provenance.salesCoverage.first} → ${report.provenance.salesCoverage.last}`],["Sales rows in warehouse",number(report.provenance.salesCoverage.rows)],["Export policy",report.provenance.exportPolicy]]}/><Callout tone="info" title="Secure hand-off">Exports require the export permission and are audited. No public share links or external Momence, WhatsApp, CRM or ad-platform publishing are created.</Callout></Card></div>}
          <div className="report-print-only"><div className="print-title"><div className="brand-mark">P57</div><div><h2>{report.definition.name}</h2><p>{report.options.from} → {report.options.to} · {report.definition.evidence} · generated {new Date(report.generatedAt).toLocaleString('en-IN')}</p></div></div><div className="print-kpis">{report.summary.map((metric: any) => <div key={metric.key}><span>{metric.label}</span><strong>{cell(metric.value,metric.type)}</strong></div>)}</div><table><thead><tr>{report.columns.map((column: any) => <th key={column.key}>{column.label}</th>)}</tr></thead><tbody>{report.rows.map((row: any,index: number) => <tr key={index}>{report.columns.map((column: any) => <td key={column.key}>{cell(row[column.key],column.type)}</td>)}</tr>)}</tbody></table><h3>Definitions and limitations</h3><ul>{report.definition.notes.map((note: string) => <li key={note}>{note}</li>)}</ul></div>
        </div>}
      </main>
    </div>

    {columnModal && <Modal title="Choose report columns" subtitle="Column selection applies to the next run and to CSV/XLSX exports. At least one column is required." onClose={() => setColumnModal(false)} footer={<><Button variant="secondary" onClick={() => update('columns',selected.columns.map((column: any) => column.key))}>Select all</Button><Button onClick={() => { if (draft.columns.length) { setColumnModal(false); run(); } }} disabled={!draft.columns.length}>Apply & run</Button></>}><div className="report-column-picker">{selected.columns.map((column: any) => <label key={column.key} className={draft.columns.includes(column.key) ? 'selected' : ''}><input type="checkbox" checked={draft.columns.includes(column.key)} onChange={() => toggleColumn(column.key)}/><span><strong>{column.label}</strong><small>{titleCase(column.type || 'text')}</small></span>{draft.columns.includes(column.key) && <Check size={15}/>}</label>)}</div></Modal>}
    {saveModal && <Modal title={savedId ? 'Update saved report view' : 'Save this report view'} subtitle="Stores filters, columns, sorting and preview limits under your account. It does not schedule or publish the report." onClose={() => setSaveModal(false)} footer={<><Button variant="secondary" onClick={() => setSaveModal(false)}>Cancel</Button><Button onClick={saveView} disabled={saving || !saveName.trim()}>{saving ? 'Saving…' : savedId ? 'Update saved view' : 'Save view'}</Button></>}><Field label="Saved view name" required><Input aria-label="Saved view name" value={saveName} onChange={event => setSaveName(event.target.value)} maxLength={100} autoFocus/></Field><Callout tone="info">{selected.name} · {applied.from} → {applied.to} · {applied.columns.length} columns</Callout></Modal>}
    {savedModal && <Modal title="Your saved report views" subtitle="Server-persisted configurations. Loading a view runs it against the current database; it is not a frozen snapshot." onClose={() => setSavedModal(false)} width="780px"><div className="saved-report-list">{saved.data?.rows?.map((row: any) => <div key={row.id}><span className="saved-report-icon"><Bookmark size={17}/></span><button className="saved-report-open" onClick={() => loadView(row)}><strong>{row.name}</strong><span>{definitions.find((definition: any) => definition.id === row.report_id)?.name || row.report_id}</span><small>{row.studio || 'All accessible studios'} · {row.config.from} → {row.config.to} · updated {new Date(row.updated_at).toLocaleString('en-IN')}</small></button><IconButton label={`Delete saved view ${row.name}`} onClick={() => deleteView(row)}><Trash2 size={16}/></IconButton></div>)}{!saved.data?.rows?.length && <EmptyState icon={<Bookmark size={26}/>} title="No saved views yet" text="Configure a report, run it, then save the view for reuse across sessions."/>}</div></Modal>}
  </div>;
}
