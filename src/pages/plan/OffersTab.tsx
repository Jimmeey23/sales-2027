import React, { lazy, Suspense, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  BookOpen,
  CalendarRange,
  Check,
  Dices,
  Edit3,
  ExternalLink,
  Gift,
  GripVertical,
  Library,
  Package,
  PenLine,
  Save,
  Search,
  Sparkles,
  Target,
  Users,
  WandSparkles,
} from 'lucide-react';
import { api, post } from '../../api';
import { useApp } from '../../App';
import { MONTHS, MONTHS_SHORT, OBJECTIVES, SEGMENTS, money, number, percent, titleCase } from '../../types';
import { Badge, Button, Callout, Field, Input, Loading, Select, StatusBadge, Textarea } from '../../components/ui';
import { planningLocations } from '../../data/locations';
import { MONTH_OBJECTIVES } from '../../data/planDefaults';
import { useLoad } from '../../hooks';
import { lakh, type PlanData } from './usePlanData';
import { selectedInMonth } from './TargetsTab';

const OfferBuilder = lazy(() => import('../OfferBuilder'));
const OfferBank = lazy(() => import('../OfferBank'));
const GoalBuilder = lazy(() => import('../GoalBuilder'));
// One offer studio: every way to find, generate or build an offer is a view here.
export const OFFER_VIEWS = [
  { id: 'planned', label: 'Planned promotions', icon: CalendarRange },
  { id: 'library', label: 'Offer bank', icon: Library },
  { id: 'generate', label: 'Generate', icon: WandSparkles },
  { id: 'gap', label: 'Fill a revenue gap', icon: Target },
  { id: 'manual', label: 'Build manually', icon: PenLine },
];
const embed = (node: React.ReactNode) => (
  <div className="ws-embedded">
    <Suspense fallback={<Loading />}>{node}</Suspense>
  </div>
);
const OBJ = Object.fromEntries(OBJECTIVES);
const BENEFIT_OPTIONS = [
  { id: 'bonus_class', label: 'Bonus class', note: 'Add one class credit', icon: Gift },
  { id: 'guest_pass', label: 'Guest pass', note: 'Bring a friend', icon: Users },
  { id: 'private_session', label: 'Private session', note: 'Add a 1:1 session', icon: Target },
  { id: 'freeze_extension', label: 'Freeze extension', note: 'Extra membership pause', icon: CalendarRange },
  { id: 'trainer_consult', label: 'Trainer consult', note: 'Personal check-in', icon: Sparkles },
  { id: 'hosted_class', label: 'Hosted class', note: 'Add a hosted session', icon: BookOpen },
  { id: 'virtual_private', label: 'Virtual private', note: 'Remote 1:1 session', icon: ExternalLink },
  { id: 'retail_addon', label: 'Retail add-on', note: 'Add a retail gift', icon: Package },
] as const;

export default function OffersTab({ data, reload }: { data: PlanData; reload: () => Promise<any> }) {
  const [params, setParams] = useSearchParams();
  const view = params.get('view') || 'planned';
  return (
    <div className="os-root">
      <nav className="os-nav" aria-label="Offer studio views">
        {OFFER_VIEWS.map(v => {
          const Icon = v.icon;
          return (
            <button
              key={v.id}
              className={view === v.id ? 'active' : ''}
              aria-current={view === v.id ? 'page' : undefined}
              onClick={() => setParams({ view: v.id }, { replace: true })}
            >
              <Icon size={15} />
              {v.label}
            </button>
          );
        })}
      </nav>
      {view === 'planned' && <Planned data={data} />}
      {view === 'library' && embed(<OfferBank />)}
      {view === 'generate' && <Generator data={data} onSaved={() => reload().catch(() => {})} />}
      {view === 'gap' && embed(<GoalBuilder />)}
      {view === 'manual' && embed(<OfferBuilder />)}
    </div>
  );
}

const parseJson = (v: any) => {
  if (!v) return {};
  if (typeof v === 'object') return v;
  try {
    return JSON.parse(v);
  } catch {
    return {};
  }
};
const shortDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '';

function OfferRow({ o, onOpen, selected }: { o: any; onOpen: () => void; selected: boolean }) {
  const pricing = parseJson(o.provenance).pricing || {};
  const financials = parseJson(o.financials);
  const asp = Number(o.expected_asp) || 0,
    disc = Number(o.effective_discount) || 0;
  const completeForecast = o.expected_revenue !== null && o.expected_revenue !== undefined && Number.isFinite(Number(o.expected_revenue));
  const modeledRevenue = financials.expectedRevenue;
  const forecastConsistent = completeForecast && (modeledRevenue == null || Math.abs(Number(o.expected_revenue) - Number(modeledRevenue)) <= Math.max(2, Math.abs(Number(modeledRevenue)) * 0.0001));
  const expectedSales = financials.expectedBuyers ?? (asp ? Math.round(Number(o.expected_revenue) / asp) : null);
  const original = asp && disc > 0 && disc < 100 ? asp / (1 - disc / 100) : null;
  const when =
    o.validity_start || o.validity_end
      ? `${shortDate(o.validity_start)} – ${shortDate(o.validity_end)}`
      : o.month
        ? `${MONTHS_SHORT[o.month - 1]} ${o.year}`
        : '—';
  return (
    <button className="os-offer" onClick={onOpen}>
      <div className="os-offer-main">
        <div className="os-offer-kicker">
          <span>{titleCase(o.offer_type)}</span>
          <span className={selected ? 'os-selection selected' : 'os-selection'}>{selected ? 'On plan' : 'Candidate'}</span>
          {pricing.product && <span>{pricing.product}</span>}
          <span>{o.studio}</span>
        </div>
        <strong className="os-offer-name">{o.name}</strong>
        <p>{o.benefit || o.headline || o.customer_copy}</p>
      </div>
      <dl className="os-offer-facts">
        <div>
          <dt>Price</dt>
          <dd>
            {original && <s>{money(original)}</s>}
            <b>{money(asp || null)}</b>
          </dd>
        </div>
        <div>
          <dt>Discount</dt>
          <dd>
            <b>{disc ? percent(disc, 0) : '—'}</b>
            {original && <small>{money(original - asp)} off</small>}
          </dd>
        </div>
        <div>
          <dt>Cohort</dt>
          <dd>{titleCase(o.audience) || '—'}</dd>
        </div>
        <div>
          <dt>Window</dt>
          <dd>{when}</dd>
        </div>
        <div>
          <dt>Expected</dt>
          <dd>
            <b>{!completeForecast ? 'Incomplete' : forecastConsistent ? money(o.expected_revenue, true) : 'Needs review'}</b>
            {completeForecast && forecastConsistent ? <small>{expectedSales == null ? '' : `${number(expectedSales)} expected · `}{o.target_purchases == null ? 'target not set' : `${number(o.target_purchases)} target sales`}</small> : null}
          </dd>
        </div>
      </dl>
      <div className="os-offer-status">
        <StatusBadge status={o.status} />
        <small>{OBJ[o.objective] || titleCase(o.objective)}</small>
        {o.margin_impact == null && <small className="os-cost-warning">Costs needed</small>}
      </div>
    </button>
  );
}

function Planned({ data }: { data: PlanData }) {
  const navigate = useNavigate();
  const [month, setMonth] = useState(0),
    [status, setStatus] = useState(''),
    [q, setQ] = useState('');
  const all = data.months.flatMap(m => selectedInMonth(data, m.month));
  const statuses = [...new Set(all.map(o => o.status).filter(Boolean))] as string[];
  const match = (o: any) =>
    (!status || o.status === status) &&
    (!q || `${o.name} ${o.headline} ${o.benefit} ${o.audience}`.toLowerCase().includes(q.toLowerCase()));
  const months = data.months.filter(m => !month || m.month === month);
  return (
    <div className="os-planned">
      <div className="os-toolbar">
        <div className="os-months" role="tablist">
          <button className={!month ? 'active' : ''} onClick={() => setMonth(0)}>
            All
          </button>
          {data.months.map(m => {
            const n = selectedInMonth(data, m.month).length;
            return (
              <button
                key={m.month}
                className={month === m.month ? 'active' : ''}
                onClick={() => setMonth(m.month)}
                title={`${n} offers`}
              >
                {MONTHS_SHORT[m.month - 1]}
                {n > 0 && <i>{n}</i>}
              </button>
            );
          })}
        </div>
        <div className="os-toolbar-right">
          <label className="os-search">
            <Search size={14} />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search offers" />
          </label>
          <Select value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {statuses.map(s => (
              <option key={s} value={s}>
                {titleCase(s)}
              </option>
            ))}
          </Select>
        </div>
      </div>
      {months.map(m => {
        const selected = selectedInMonth(data, m.month).filter(o => o.data_mode !== 'demo' && o.generation_source !== 'demo_seed'),
          selectedIds = new Set(selected.map(o => Number(o.id))),
          offers = selected.filter(match),
          expected = selected.reduce((sum, o) => {
            const financials = parseJson(o.financials);
            const modeledRevenue = financials.expectedRevenue;
            const valid = o.expected_revenue !== null && o.expected_revenue !== undefined && Number.isFinite(Number(o.expected_revenue)) &&
              (modeledRevenue == null || Math.abs(Number(o.expected_revenue) - Number(modeledRevenue)) <= Math.max(2, Math.abs(Number(modeledRevenue)) * 0.0001));
            return sum + (valid ? Number(o.expected_revenue) : 0);
          }, 0),
          cover = m.target ? Math.min(100, Math.max(0, (expected / m.target) * 100)) : 0;
        return (
          <section key={m.month} className="os-month">
            <header className="os-month-head">
              <div>
                <span className="os-label">{MONTHS[m.month - 1]}</span>
                <h3>{m.leadOffer}</h3>
                <em>{m.objective}</em>
              </div>
              <div className="os-month-nums">
                <div>
                  <span className="os-label">Target</span>
                  <b>{lakh(m.target)}</b>
                </div>
                <div>
                  <span className="os-label">Selected forecast</span>
                  <b>{lakh(expected)}</b>
                </div>
                <div>
                  <span className="os-label">Selected offers</span>
                  <b>{selected.length}</b>
                </div>
                <div className="os-cover" aria-hidden>
                  <span style={{ width: `${cover}%` }} />
                </div>
              </div>
            </header>
            {offers.length ? (
              <div className="os-offer-list">
                {offers.map(o => (
                  <OfferRow key={o.id} o={o} selected={selectedIds.has(Number(o.id))} onOpen={() => navigate(`/offers/${o.id}/edit`)} />
                ))}
              </div>
            ) : (
              <p className="os-empty">
                {q || status ? 'No offers match these filters.' : 'No offers selected on this month plan yet.'}
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}

function Generator({ data, onSaved }: { data: PlanData; onSaved: () => void }) {
  const { boot, studioId, year, toast } = useApp(),
    navigate = useNavigate();
  const locations = planningLocations(boot.studios);
  const [form, setForm] = useState<any>({
    studioId: studioId || locations[0]?.id,
    month: 1,
    objective: MONTH_OBJECTIVES[0],
    segment: 'new_leads',
    maxDiscountPercent: 15,
    targetRevenue: 300000,
    tone: 'witty',
    instructions: '',
    productId: null,
    benefitPicks: [],
  });
  const [result, setResult] = useState<any>(null),
    [loading, setLoading] = useState(''),
    [error, setError] = useState(''),
    [saved, setSaved] = useState<Record<number, number>>({});
  const { data: catalog, loading: catalogLoading } = useLoad<any>(
    () => api(`/commercial/catalog?studioId=${form.studioId}`),
    [form.studioId],
  );
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const memberships = (catalog?.products || []).filter((p: any) =>
    p.source === 'membership_catalogue' || /membership|unlimited|class\s*pack|package|annual|six\s*month/i.test(`${p.category} ${p.name}`),
  );
  const selectedMembership = memberships.find((p: any) => p.id === Number(form.productId)) || memberships[0];
  const toggleBenefit = (id: string) => set('benefitPicks',
    form.benefitPicks.includes(id) ? form.benefitPicks.filter((item: string) => item !== id) : [...form.benefitPicks, id],
  );
  const dragItem = (e: React.DragEvent, kind: string, value: string | number) => {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', JSON.stringify({ kind, value }));
  };
  const dropItem = (e: React.DragEvent, expected: 'membership' | 'benefit') => {
    e.preventDefault();
    try {
      const item = JSON.parse(e.dataTransfer.getData('text/plain'));
      if (item.kind !== expected) return;
      if (expected === 'membership') set('productId', Number(item.value));
      else if (!form.benefitPicks.includes(item.value)) set('benefitPicks', [...form.benefitPicks, item.value]);
    } catch { /* Ignore unrelated drops. */ }
  };
  const monthRow = data.plans.find(p => p.studio.id === Number(form.studioId))?.months[form.month - 1];
  const run = async (source: 'ai' | 'engine' | 'random') => {
    setLoading(source);
    setError('');
    setSaved({});
    const payload = {
      ...form,
      studioId: Number(form.studioId),
      year,
      productId: selectedMembership?.id,
      benefitPicks: form.benefitPicks,
      targetRevenue: Number(form.targetRevenue) || undefined,
      count: 4,
      theme: monthRow?.leadOffer,
      instructions: form.instructions || undefined,
    };
    try {
      if (source === 'random') {
        const one = await post('/offers/random', payload);
        setResult({ offers: [one], source: 'random_engine' });
      } else setResult(await post('/offers/generate', { ...payload, source }));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading('');
    }
  };
  const save = async (o: any, i: number) => {
    try {
      const r = await post('/offers', {
        ...o,
        generationSource: o.randomised ? 'random_engine' : result.source === 'openai' ? 'openai' : 'rules_engine',
        dataMode: 'user',
        status: result.source === 'openai' ? 'ai_generated' : 'draft',
      });
      setSaved(s => ({ ...s, [i]: r.id }));
      toast('Saved to the offer bank.');
      onSaved();
    } catch (e: any) {
      toast(e.message, 'error');
    }
  };
  return (
    <div className="ws-gen">
      <aside className="ws-gen-sidebar ws-gen-benefits">
        <header>
          <span className="ws-gen-side-icon"><Gift size={15} /></span>
          <div><strong>Benefits</strong><small>Drag into the offer or tap to add</small></div>
        </header>
        <div className="ws-gen-side-list">
          {BENEFIT_OPTIONS.map(item => {
            const Icon = item.icon;
            const active = form.benefitPicks.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                draggable
                aria-pressed={active}
                className={`ws-gen-item ${active ? 'active' : ''}`}
                onClick={() => toggleBenefit(item.id)}
                onDragStart={e => dragItem(e, 'benefit', item.id)}
              >
                <GripVertical size={13} className="ws-gen-grip" />
                <Icon size={16} />
                <span><b>{item.label}</b><small>{item.note}</small></span>
                {active && <Check size={15} />}
              </button>
            );
          })}
        </div>
      </aside>
      <div className="ws-gen-main">
      <aside className="ws-card ws-brief">
        <h3>
          <Sparkles size={16} /> Offer brief
        </h3>
        <Field label="Location">
          <Select value={form.studioId} onChange={e => set('studioId', Number(e.target.value))}>
            {locations.map(s => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
        <div className="form-grid two">
          <Field label="Month">
            <Select
              value={form.month}
              onChange={e => {
                set('month', Number(e.target.value));
                set('objective', MONTH_OBJECTIVES[Number(e.target.value) - 1]);
              }}
            >
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Tone">
            <Select value={form.tone} onChange={e => set('tone', e.target.value)}>
              {['witty', 'premium', 'warm', 'bold', 'playful'].map(t => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Objective">
          <Select value={form.objective} onChange={e => set('objective', e.target.value)}>
            {OBJECTIVES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Audience">
          <Select value={form.segment} onChange={e => set('segment', e.target.value)}>
            {SEGMENTS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        <div className="form-grid two">
          <Field label="Max discount %">
            <Input
              type="number"
              value={form.maxDiscountPercent}
              onChange={e => set('maxDiscountPercent', Number(e.target.value))}
            />
          </Field>
          <Field label="Revenue goal ₹">
            <Input type="number" value={form.targetRevenue} onChange={e => set('targetRevenue', e.target.value)} />
          </Field>
        </div>
        <Field label="Creative direction (optional)">
          <Textarea
            rows={3}
            value={form.instructions}
            onChange={e => set('instructions', e.target.value)}
            placeholder={`e.g. Monsoon-themed, reward consistency, no more than 10% off`}
          />
        </Field>
        {monthRow && (
          <div className="ws-brief-context">
            <span>{MONTHS[form.month - 1]} plan</span>
            <b>{lakh(monthRow.target)}</b>
            <em>
              {monthRow.leadOffer} · {monthRow.objective}
            </em>
          </div>
        )}
        <div className="ws-brief-actions">
          <Button
            onClick={() => run('ai')}
            disabled={!!loading || !boot.aiConfigured}
            icon={<WandSparkles size={15} />}
          >
            {loading === 'ai' ? 'Thinking…' : 'Generate with AI'}
          </Button>
          <Button variant="secondary" onClick={() => run('engine')} disabled={!!loading} icon={<Sparkles size={15} />}>
            {loading === 'engine' ? 'Building…' : 'Rules engine'}
          </Button>
          <Button variant="ghost" onClick={() => run('random')} disabled={!!loading} icon={<Dices size={15} />}>
            Surprise me
          </Button>
        </div>
        {!boot.aiConfigured && (
          <p className="muted">AI is not configured on the server; rules engine and Surprise me still work.</p>
        )}
      </aside>
      <div className="ws-gen-recipe">
        <div className="ws-gen-recipe-head">
          <div><span className="ws-label">Offer recipe</span><strong>Build from a membership and benefits</strong></div>
          <small>Drag items from either side</small>
        </div>
        <div className="ws-gen-recipe-slots">
          <div
            className="ws-gen-drop membership"
            onDragOver={e => e.preventDefault()}
            onDrop={e => dropItem(e, 'membership')}
          >
            <Package size={16} />
            <span><small>Membership</small><b>{selectedMembership?.name || (catalogLoading ? 'Loading memberships…' : 'Choose a membership')}</b></span>
            {selectedMembership && <em>{money(selectedMembership.list_price)}</em>}
          </div>
          <div
            className="ws-gen-drop benefits"
            onDragOver={e => e.preventDefault()}
            onDrop={e => dropItem(e, 'benefit')}
          >
            <Gift size={16} />
            <span><small>Added benefits</small><b>{form.benefitPicks.length ? form.benefitPicks.map((id: string) => BENEFIT_OPTIONS.find(x => x.id === id)?.label).filter(Boolean).join(' · ') : 'Drop benefits here or choose from the left'}</b></span>
            {form.benefitPicks.length > 0 && <button type="button" onClick={() => set('benefitPicks', [])}>Clear</button>}
          </div>
        </div>
        {(form.benefitPicks.length > 0) && <small className="ws-gen-cost-note">Benefit delivery costs are unconfirmed. Generated offers stay blocked from approval until costs are entered.</small>}
      </div>
      <section>
        {error && <Callout tone="danger">{error}</Callout>}
        {loading && (
          <div className="ws-card ws-gen-loading">
            <WandSparkles className="pulse" size={26} />
            <div>
              <strong>Designing offers for {MONTHS[form.month - 1]}…</strong>
              <p>Reading studio prices, history and policy, then calculating every number.</p>
            </div>
          </div>
        )}
        {!result && !loading && (
          <div className="ws-card ws-gen-empty">
            <WandSparkles size={28} />
            <h3>Brief it, then generate</h3>
            <p>
              AI writes the concepts and copy; the app calculates prices, revenue and discount exposure, and checks
              studio policy.
            </p>
          </div>
        )}
        {result && !loading && (
          <>
            <p className="muted">{result.recommendation?.explanation}</p>
            <div className="ws-offer-grid">
              {result.offers.map((o: any, i: number) => {
                const f = o.financials || {};
                return (
                  <div key={`${o.name}-${i}`} className={`ws-concept ${o.recommended ? 'rec' : ''}`}>
                    <header>
                      <Badge tone="purple">{titleCase(o.offerType || o.mechanics?.mechanism)}</Badge>
                      {o.recommended && <Badge tone="green">Recommended</Badge>}
                    </header>
                    <strong>{o.name}</strong>
                    <em>{o.headline}</em>
                    <p>{o.customerCopy || o.benefit}</p>
                    <dl className="ws-concept-details">
                      <div><dt>Membership</dt><dd>{o.productName || selectedMembership?.name || '—'}</dd></div>
                      <div><dt>Location · month</dt><dd>{boot.studios.find(s => s.id === Number(form.studioId))?.name || '—'} · {MONTHS[o.month - 1]}</dd></div>
                      <div><dt>Audience</dt><dd>{titleCase(o.audience || form.segment)}</dd></div>
                      <div><dt>Objective</dt><dd>{OBJ[o.objective] || titleCase(o.objective)}</dd></div>
                      <div><dt>Offer terms</dt><dd>{o.redemptionConditions || 'One redemption per eligible customer; cannot be stacked with another promotion.'}</dd></div>
                      <div><dt>Valid</dt><dd>{o.validityStart || `${year}-${String(form.month).padStart(2, '0')}-01`} – {o.validityEnd || 'End of month'}</dd></div>
                      <div><dt>Call to action</dt><dd>{o.cta || 'Reserve your spot'}</dd></div>
                    </dl>
                    <div className="ws-concept-nums">
                      <div>
                        <small>Price</small>
                        <b>{money(f.sellingPrice ?? o.expectedAsp)}</b>
                      </div>
                      <div>
                        <small>Revenue</small>
                        <b>{money(o.expectedRevenue, true)}</b>
                      </div>
                      <div>
                        <small>Benefit</small>
                        <b>{percent(o.effectiveDiscount)}</b>
                      </div>
                      <div>
                        <small>Target buyers</small>
                        <b>{number(o.targetPurchases)}</b>
                      </div>
                    </div>
                    {o.rationale && (
                      <p className="ws-logic">
                        <b>Why · </b>
                        {o.rationale}
                      </p>
                    )}
                    {o.successMetrics?.length > 0 && <details className="ws-concept-details-list"><summary>Success metrics</summary><ul>{o.successMetrics.map((item: string) => <li key={item}>{item}</li>)}</ul></details>}
                    {o.risks?.length > 0 && <details className="ws-concept-details-list"><summary>Risks and assumptions</summary><ul>{o.risks.map((item: string, idx: number) => <li key={`${idx}-${item}`}>{item}</li>)}</ul></details>}
                    {f.errors?.length > 0 && <Callout tone="warning">{f.errors.join(' ')}</Callout>}
                    {!f.economicsComplete && <Callout tone="warning">Complete cost data before approving this offer.</Callout>}
                    <footer>
                      <Button
                        size="sm"
                        disabled={!!saved[i] || f.errors?.length > 0}
                        icon={<Save size={14} />}
                        onClick={() => save(o, i)}
                      >
                        {saved[i] ? `Saved #${saved[i]}` : 'Save to bank'}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={<Edit3 size={14} />}
                        onClick={() => navigate('/offers?view=manual', { state: { concept: o } })}
                      >
                        Edit
                      </Button>
                    </footer>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>
      </div>
      <aside className="ws-gen-sidebar ws-gen-memberships">
        <header>
          <span className="ws-gen-side-icon"><Package size={15} /></span>
          <div><strong>Memberships</strong><small>{catalogLoading ? 'Loading catalogue…' : `${memberships.length} at this location`}</small></div>
        </header>
        <div className="ws-gen-side-list">
          {memberships.map((product: any) => {
            const active = selectedMembership?.id === product.id;
            return (
              <button
                key={product.id}
                type="button"
                draggable
                aria-pressed={active}
                className={`ws-gen-item ${active ? 'active' : ''}`}
                onClick={() => set('productId', product.id)}
                onDragStart={e => dragItem(e, 'membership', product.id)}
              >
                <GripVertical size={13} className="ws-gen-grip" />
                <Package size={16} />
                <span><b>{product.name}</b><small>{product.validity_days ? `${product.validity_days} days` : product.category}</small></span>
                <em>{money(product.list_price)}</em>
              </button>
            );
          })}
          {!catalogLoading && !memberships.length && <p className="ws-gen-side-empty">No priced membership products are available at this location.</p>}
        </div>
      </aside>
    </div>
  );
}
