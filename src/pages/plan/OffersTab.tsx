import React, { lazy, Suspense, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  BookOpen,
  CalendarRange,
  Dices,
  Edit3,
  ExternalLink,
  Library,
  PenLine,
  Save,
  Search,
  Sparkles,
  Target,
  WandSparkles,
} from 'lucide-react';
import { post } from '../../api';
import { useApp } from '../../App';
import { MONTHS, MONTHS_SHORT, OBJECTIVES, SEGMENTS, money, percent, titleCase } from '../../types';
import { Badge, Button, Callout, Field, Input, Loading, Select, StatusBadge, Textarea } from '../../components/ui';
import { FAMILY_TONES, OFFER_LIBRARY, type OfferTemplate } from '../../data/offerLibrary';
import { planningLocations } from '../../data/locations';
import { MONTH_OBJECTIVES } from '../../data/planDefaults';
import { lakh, type PlanData } from './usePlanData';
import { offersInMonth } from './TargetsTab';

const OfferBuilder = lazy(() => import('../OfferBuilder'));
const OfferBank = lazy(() => import('../OfferBank'));
const GoalBuilder = lazy(() => import('../GoalBuilder'));
// One offer studio: every way to find, generate or build an offer is a view here.
export const OFFER_VIEWS = [
  { id: 'planned', label: 'Planned promotions', icon: CalendarRange },
  { id: 'library', label: 'Offer library', icon: Library },
  { id: 'playbook', label: 'Playbook', icon: BookOpen },
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
      {view === 'playbook' && <Playbook />}
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

function OfferRow({ o, onOpen }: { o: any; onOpen: () => void }) {
  const pricing = parseJson(o.provenance).pricing || {};
  const asp = Number(o.expected_asp) || 0,
    disc = Number(o.effective_discount) || 0;
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
            <b>{money(o.expected_revenue, true)}</b>
            {o.target_purchases ? <small>{o.target_purchases} sales</small> : null}
          </dd>
        </div>
      </dl>
      <div className="os-offer-status">
        <StatusBadge status={o.status} />
        <small>{OBJ[o.objective] || titleCase(o.objective)}</small>
      </div>
    </button>
  );
}

function Planned({ data }: { data: PlanData }) {
  const navigate = useNavigate();
  const [month, setMonth] = useState(0),
    [status, setStatus] = useState(''),
    [q, setQ] = useState('');
  const all = data.months.flatMap(m => offersInMonth(data, m.month));
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
            const n = offersInMonth(data, m.month).length;
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
        const offers = offersInMonth(data, m.month).filter(match),
          expected = offersInMonth(data, m.month).reduce((n, o) => n + (o.expected_revenue || 0), 0),
          cover = m.target ? Math.min(100, (expected / m.target) * 100) : 0;
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
                  <span className="os-label">Offers cover</span>
                  <b>{lakh(expected)}</b>
                </div>
                <div>
                  <span className="os-label">Offers</span>
                  <b>{offersInMonth(data, m.month).length}</b>
                </div>
                <div className="os-cover" aria-hidden>
                  <span style={{ width: `${cover}%` }} />
                </div>
              </div>
            </header>
            {offers.length ? (
              <div className="os-offer-list">
                {offers.map(o => (
                  <OfferRow key={o.id} o={o} onOpen={() => navigate(`/offers/${o.id}/edit`)} />
                ))}
              </div>
            ) : (
              <p className="os-empty">
                {q || status ? 'No offers match these filters.' : 'No promotions planned yet.'}
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}

export function templateConcept(t: OfferTemplate, studioId: number, year: number, month = t.months[0]) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    name: t.name,
    headline: t.hook,
    customerCopy: t.benefit,
    rationale: t.why,
    internalDescription: `Guardrail: ${t.guardrail}`,
    objective: t.objective,
    offerType: t.mechanism,
    audience: t.audience,
    benefit: t.benefit,
    studioId,
    year,
    month,
    validityStart: `${year}-${pad(month)}-01`,
    validityEnd: `${year}-${pad(month)}-14`,
    mechanics: t.mechanics,
  };
}

function Playbook() {
  const { boot, studioId, year } = useApp(),
    navigate = useNavigate();
  const [family, setFamily] = useState(''),
    [month, setMonth] = useState('');
  const sid = studioId || planningLocations(boot.studios)[0]?.id;
  const rows = OFFER_LIBRARY.filter(
    t => (!family || t.family === family) && (!month || t.months.includes(Number(month))),
  );
  return (
    <>
      <div className="ws-filterbar">
        <div className="ws-chipset">
          {['', ...new Set(OFFER_LIBRARY.map(t => t.family))].map(f => (
            <button key={f || 'all'} className={family === f ? 'active' : ''} onClick={() => setFamily(f)}>
              {f || 'All'}
            </button>
          ))}
        </div>
        <Select value={month} onChange={e => setMonth(e.target.value)}>
          <option value="">Any month</option>
          {MONTHS.map((m, i) => (
            <option key={m} value={i + 1}>
              {m}
            </option>
          ))}
        </Select>
      </div>
      <div className="ws-offer-grid">
        {rows.map(t => (
          <div key={t.id} className="ws-template">
            <header>
              <Badge tone={FAMILY_TONES[t.family] as any}>{t.family}</Badge>
              <span>{t.months.length === 12 ? 'Always-on' : t.months.map(m => MONTHS_SHORT[m - 1]).join(' · ')}</span>
            </header>
            <strong>{t.name}</strong>
            <em>“{t.hook}”</em>
            <p>{t.benefit}</p>
            <dl>
              <div>
                <dt>Why it works</dt>
                <dd>{t.why}</dd>
              </div>
              <div>
                <dt>Guardrail</dt>
                <dd>{t.guardrail}</dd>
              </div>
              <div>
                <dt>Audience</dt>
                <dd>
                  {titleCase(t.audience)} · {titleCase(t.mechanism)}
                </dd>
              </div>
            </dl>
            <Button
              size="sm"
              icon={<Edit3 size={14} />}
              onClick={() =>
                navigate('/offers?view=manual', {
                  state: { concept: templateConcept(t, sid!, year, month ? Number(month) : t.months[0]) },
                })
              }
            >
              Use in builder
            </Button>
          </div>
        ))}
      </div>
    </>
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
  });
  const [result, setResult] = useState<any>(null),
    [loading, setLoading] = useState(''),
    [error, setError] = useState(''),
    [saved, setSaved] = useState<Record<number, number>>({});
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const monthRow = data.plans.find(p => p.studio.id === Number(form.studioId))?.months[form.month - 1];
  const run = async (source: 'ai' | 'engine' | 'random') => {
    setLoading(source);
    setError('');
    setSaved({});
    const payload = {
      ...form,
      studioId: Number(form.studioId),
      year,
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
                    </div>
                    {o.rationale && (
                      <p className="ws-logic">
                        <b>Why · </b>
                        {o.rationale}
                      </p>
                    )}
                    {f.errors?.length > 0 && <Callout tone="warning">{f.errors.join(' ')}</Callout>}
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
  );
}
