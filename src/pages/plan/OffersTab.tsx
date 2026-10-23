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
    <>
      <div className="ws-segmented ws-offer-views">
        {OFFER_VIEWS.map(v => {
          const Icon = v.icon;
          return (
            <button
              key={v.id}
              className={view === v.id ? 'active' : ''}
              onClick={() => setParams({ view: v.id }, { replace: true })}
            >
              <Icon size={15} />
              {v.label}
            </button>
          );
        })}
      </div>
      {view === 'planned' && <Planned data={data} />}
      {view === 'library' && embed(<OfferBank />)}
      {view === 'playbook' && <Playbook />}
      {view === 'generate' && <Generator data={data} onSaved={() => reload().catch(() => {})} />}
      {view === 'gap' && embed(<GoalBuilder />)}
      {view === 'manual' && embed(<OfferBuilder />)}
    </>
  );
}

function OfferCard({ o, onOpen }: { o: any; onOpen: () => void }) {
  return (
    <button className="ws-offer-card" onClick={onOpen}>
      <header>
        <Badge tone="purple">{titleCase(o.offer_type)}</Badge>
        <StatusBadge status={o.status} />
      </header>
      <strong>{o.name}</strong>
      <p>{o.headline || o.benefit || o.customer_copy}</p>
      <div className="ws-offer-meta">
        <span>{o.studio}</span>
        <span>
          {o.month ? MONTHS_SHORT[o.month - 1] : '—'} {o.year}
        </span>
        <span>{OBJ[o.objective] || titleCase(o.objective)}</span>
      </div>
      <footer>
        <div>
          <small>Expected</small>
          <b>{money(o.expected_revenue, true)}</b>
        </div>
        <div>
          <small>Actual</small>
          <b>{money(o.actual_revenue, true)}</b>
        </div>
        <div>
          <small>Benefit</small>
          <b>{percent(o.effective_discount)}</b>
        </div>
      </footer>
    </button>
  );
}

function Planned({ data }: { data: PlanData }) {
  const navigate = useNavigate();
  return (
    <div className="ws-planned">
      {data.months.map(m => {
        const offers = offersInMonth(data, m.month),
          expected = offers.reduce((n, o) => n + (o.expected_revenue || 0), 0);
        return (
          <section key={m.month}>
            <header>
              <div>
                <span>{MONTHS[m.month - 1]}</span>
                <strong>{m.leadOffer}</strong>
                <em>{m.objective}</em>
              </div>
              <div className="ws-planned-nums">
                <span>
                  Target <b>{lakh(m.target)}</b>
                </span>
                <span>
                  Offers cover <b>{lakh(expected)}</b>
                </span>
                <span>{offers.length} offers</span>
              </div>
            </header>
            {offers.length ? (
              <div className="ws-offer-row">
                {offers.map(o => (
                  <OfferCard key={o.id} o={o} onOpen={() => navigate(`/offers/${o.id}/edit`)} />
                ))}
              </div>
            ) : (
              <p className="muted">No promotions planned yet.</p>
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
