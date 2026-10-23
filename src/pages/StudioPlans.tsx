import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Archive,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Edit3,
  GripVertical,
  Plus,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
  WandSparkles,
  X,
} from 'lucide-react';
import { api, patch, post } from '../api';
import { useApp } from '../App';
import { useLoad, useOnChange } from '../hooks';
import { MONTHS, MONTHS_SHORT, OBJECTIVES, money, number, percent, titleCase } from '../types';
import {
  Badge,
  Button,
  Callout,
  Card,
  CardHeader,
  Drawer,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Loading,
  Progress,
  Select,
  StatusBadge,
  TableScroll,
  Tabs,
  Textarea,
} from '../components/ui';
import PageHeader from '../components/PageHeader';
import { TargetEditor } from './AnnualPlanner';
import { MONTH_OBJECTIVES, defaultPlan, studioPlaybook, type ActionItem } from '../data/planDefaults';

// Lakh with one decimal keeps plan numbers readable (₹126.1L rather than ₹1Cr).
const lakh = (v: number | null | undefined) =>
  v === null || v === undefined || !Number.isFinite(v)
    ? '—'
    : `₹${(v / 100000).toLocaleString('en-IN', { maximumFractionDigits: 1 })}L`;
const targetOf = (t: any) => (t ? (t.approved_target ?? t.proposed_target ?? 0) : 0);
const pad = (n: number) => String(n).padStart(2, '0');
const lastDay = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();
const SLOT_KEYS = ['newcomer', 'lapsed', 'renewal'] as const;
const SLOT_LABELS: Record<string, string> = { newcomer: 'Newcomer', lapsed: 'Lapsed member', renewal: 'Renewal' };
const SECTION_LABELS: Record<string, string> = {
  studio_actions: 'Studio-specific actions & insights',
  always_on: 'Always-on programmes',
  recovery: 'Recovery rules (if the month falls behind)',
};

export function StudioPlansHub() {
  const { year, studioId } = useApp(),
    navigate = useNavigate();
  const { data, loading, error, reload } = useLoad<any>(() => api(`/studio-plans?year=${year}`), [year]);
  if (studioId) return <Navigate to={`/plan/${studioId}`} replace />;
  if (loading && !data) return <Loading label="Loading studio plans…" />;
  if (error && !data) return <ErrorState message={error} retry={() => reload().catch(() => {})} />;
  const rows = data?.rows || [];
  const total = rows.reduce((s: number, r: any) => s + (r.approved || r.proposed), 0);
  return (
    <div>
      <PageHeader
        eyebrow={`${year} SALES PLANS`}
        title="Pick a studio"
        description={`Each studio has its own month-by-month plan: target, how to hit it, and the offers that drive it. Combined target: ${lakh(total)}.`}
      />
      <div className="sp-hub-grid">
        {rows.map((r: any) => {
          const target = r.approved || r.proposed;
          return (
            <div
              key={r.id}
              className="sp-hub-card"
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/plan/${r.id}`)}
              onKeyDown={e => e.key === 'Enter' && navigate(`/plan/${r.id}`)}
            >
              <div className="sp-hub-top">
                <div>
                  <strong>{r.name}</strong>
                  <span>{r.city}</span>
                </div>
                <ChevronRight size={18} />
              </div>
              <div className="sp-hub-target">
                {lakh(target)}
                <small>{r.approved ? 'approved target' : 'proposed target'}</small>
              </div>
              <div className="sp-hub-stats">
                <span>
                  <b>
                    {r.approved_months}/{r.target_months || 12}
                  </b>{' '}
                  months approved
                </span>
                <span>
                  <b>{r.planned_months}/12</b> months planned
                </span>
                <span>
                  <b>{r.offers}</b> offers
                </span>
              </div>
              {r.children?.length > 0 && (
                <div className="sp-hub-children">
                  {r.children.map((c: any) => (
                    <button
                      key={c.id}
                      onClick={e => {
                        e.stopPropagation();
                        navigate(`/plan/${c.id}`);
                      }}
                    >
                      <span>{c.name}</span>
                      <b>{lakh(c.approved || c.proposed)}</b>
                      <ChevronRight size={14} />
                    </button>
                  ))}
                </div>
              )}
              <Progress value={r.planned_months} max={12} tone="purple" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function StudioPlan() {
  const { id } = useParams(),
    [params, setParams] = useSearchParams(),
    navigate = useNavigate();
  const { boot, year, can, toast, studioId: globalStudio, setStudioId } = useApp();
  const studioId = Number(id),
    month = Math.min(12, Math.max(1, Number(params.get('month') || 1)));
  const [view, setView] = useState(params.get('view') || 'board'),
    [tab, setTab] = useState(params.get('tab') || 'target'),
    [editing, setEditing] = useState<any>(null);
  const { data, setData, loading, error, reload } = useLoad<any>(
    () => api(`/studio-plans/${studioId}?year=${year}`),
    [studioId, year],
  );
  const parentId = data?.parent?.id;
  const city = boot.studios.find(s => s.id === studioId)?.city;
  // Every offer in the studio's city, so the library can offer options from sister studios too.
  const {
    data: offerData,
    setData: setOfferData,
    reload: reloadOffers,
  } = useLoad<any>(async () => {
    const rows: any[] = [];
    for (let page = 1; page < 20; page++) {
      const result = await api(
        `/offers?${city ? `city=${encodeURIComponent(city)}` : `studio=${studioId}`}&year=${year}&limit=100&page=${page}`,
      );
      rows.push(...result.rows);
      if (rows.length >= result.total || !result.rows.length) break;
    }
    return { rows };
  }, [studioId, year, city]);
  const setMonth = (m: number) =>
    setParams(
      p => {
        p.set('month', String(m));
        return p;
      },
      { replace: true },
    );
  useEffect(() => {
    setParams(
      p => {
        p.set('tab', tab);
        p.set('view', view);
        return p;
      },
      { replace: true },
    );
  }, [tab, view]);
  // The topbar studio filter drives this page: opening a plan selects its studio, and changing the filter switches plans.
  useEffect(() => {
    if (globalStudio !== studioId) setStudioId(studioId);
  }, []);
  useOnChange(globalStudio, () => {
    if (!globalStudio) navigate('/plan');
    else if (globalStudio !== studioId) navigate(`/plan/${globalStudio}?month=${month}&tab=${tab}&view=${view}`);
  });
  const offers: any[] = (offerData?.rows || []).filter((o: any) => !['archived', 'rejected'].includes(o.status));
  const isOwn = (o: any) => o.studio_id === studioId || (parentId && o.studio_id === parentId);
  const planFor = (m: number) => data?.plans.find((p: any) => p.month === m);
  const exists = (oid: any) => oid && offers.some(o => o.id === oid);
  // Months without a saved choice use the plan's primary newcomer / lapsed / renewal offers and its other imported offers.
  const slotsFor = (m: number): Record<string, number | null> => {
    const saved = planFor(m)?.slots;
    return Object.fromEntries(
      SLOT_KEYS.map(slot => [
        slot,
        saved
          ? exists(saved[slot])
            ? saved[slot]
            : null
          : (offers.find(o => isOwn(o) && o.month === m && o.plan_slot === slot && o.plan_rank === 1)?.id ?? null),
      ]),
    );
  };
  const extrasFor = (m: number): number[] => {
    const saved = planFor(m)?.offer_ids;
    if (Array.isArray(saved)) return saved.filter(exists);
    return offers
      .filter(o => isOwn(o) && o.month === m && o.generation_source === 'plan_2027' && !o.plan_slot)
      .map(o => o.id);
  };
  const selectedIds = (m: number): number[] => [
    ...(Object.values(slotsFor(m)).filter(Boolean) as number[]),
    ...extrasFor(m),
  ];
  const savePlan = async (m: number, body: any) => {
    const result = await api(`/studio-plans/${studioId}/${year}/${m}`, { method: 'PUT', body: JSON.stringify(body) });
    setData((d: any) => ({ ...d, plans: [...d.plans.filter((p: any) => p.month !== m), result] }));
    return result;
  };
  const savePicks = async (m: number, slots: Record<string, number | null>, extras: number[]) => {
    try {
      await savePlan(m, { slots, offer_ids: [...new Set(extras)].filter(id => !Object.values(slots).includes(id)) });
    } catch (e: any) {
      toast(e.message, 'error');
    }
  };
  const setSelection = (m: number, ids: number[]) => {
    const slots = slotsFor(m);
    return savePicks(
      m,
      Object.fromEntries(Object.entries(slots).map(([k, v]) => [k, v && ids.includes(v) ? v : null])),
      ids,
    );
  };
  const updateOffer = (saved: any) =>
    setOfferData((d: any) => ({ ...d, rows: d.rows.map((o: any) => (o.id === saved.id ? { ...o, ...saved } : o)) }));
  if (loading && !data) return <Loading label="Loading studio plan…" />;
  if (error && !data) return <ErrorState message={error} retry={() => reload().catch(() => {})} />;
  if (!data) return null;
  const studio = data.studio,
    target = data.targets.find((t: any) => t.month === month);
  const annual = data.targets.reduce((s: number, t: any) => s + targetOf(t), 0);
  const plannedRevenue = MONTHS.reduce(
    (s, _, i) =>
      s + selectedIds(i + 1).reduce((x, oid) => x + (offers.find(o => o.id === oid)?.expected_revenue || 0), 0),
    0,
  );
  const isRollup = data.children?.length > 0;
  const ctx = {
    studio,
    year,
    offers,
    selectedIds,
    setSelection,
    slotsFor,
    extrasFor,
    savePicks,
    isOwn,
    parentId,
    updateOffer,
    reloadOffers: () => reloadOffers().catch(() => {}),
    targets: data.targets,
    plans: data.plans,
    isRollup,
    onEditTarget: (t: any) => setEditing(t),
    canEditTarget: can('target_edit') && !isRollup,
  };
  return (
    <div>
      <div className="sp-head">
        <button
          className="sp-back"
          onClick={() => {
            setStudioId(null);
            navigate('/plan');
          }}
        >
          <ArrowLeft size={15} /> All studios
        </button>
        <div className="sp-head-row">
          <div>
            <div className="eyebrow">
              {studio.city} · {year} SALES PLAN
              {data.parent && (
                <>
                  {' '}
                  · part of <Link to={`/plan/${data.parent.id}`}>{data.parent.name}</Link>
                </>
              )}
            </div>
            <h2>{studio.name}</h2>
          </div>
          <Select aria-label="Switch studio" value={studioId} onChange={e => setStudioId(Number(e.target.value))}>
            {boot.studios.map(s => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="sp-kpis">
          <div>
            <span>Annual target</span>
            <strong>{lakh(annual)}</strong>
          </div>
          <div>
            <span>Months approved</span>
            <strong>{data.targets.filter((t: any) => t.approved_target !== null).length}/12</strong>
          </div>
          <div>
            <span>Offers in plan</span>
            <strong>{MONTHS.reduce((s, _, i) => s + selectedIds(i + 1).length, 0)}</strong>
          </div>
          <div>
            <span>Offer-led revenue planned</span>
            <strong>{lakh(plannedRevenue)}</strong>
            <small>{annual ? percent(plannedRevenue / annual, 0, true) : '—'} of target</small>
          </div>
        </div>
        {isRollup && (
          <div className="sp-venues">
            {data.children.map((c: any) => (
              <Link key={c.id} to={`/plan/${c.id}`} className="sp-venue">
                <span>{c.name}</span>
                <strong>{lakh(c.targets.reduce((s: number, t: any) => s + targetOf(t), 0))}</strong>
                <small>
                  own target, strategy & offers <ChevronRight size={12} />
                </small>
              </Link>
            ))}
            <p className="muted">Pop-up totals are the sum of its venues. Edit a venue's targets in its own plan.</p>
          </div>
        )}
      </div>
      <Tabs
        value={view}
        onChange={setView}
        items={[
          { id: 'board', label: 'Year plan & offers' },
          { id: 'month', label: 'Month detail' },
          { id: 'playbook', label: 'Studio playbook' },
        ]}
      />
      {view === 'board' && (
        <AnnualBoard
          {...ctx}
          onOpenMonth={(m: number) => {
            setMonth(m);
            setView('month');
            setTab('plan');
          }}
        />
      )}
      {view === 'month' && (
        <>
          <MonthStrip
            targets={data.targets}
            month={month}
            setMonth={setMonth}
            selectedIds={selectedIds}
            planFor={planFor}
          />
          <div className="sp-month-title">
            <h3>
              {MONTHS[month - 1]} {year}
            </h3>
            {target ? (
              <Badge tone={target.approved_target !== null ? 'green' : 'amber'}>
                {target.approved_target !== null ? 'Approved target' : 'Proposed target'}
              </Badge>
            ) : (
              <Badge tone="red">No target</Badge>
            )}
          </div>
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { id: 'target', label: '1 · Target' },
              { id: 'plan', label: '2 · Plan to hit it' },
              { id: 'offers', label: '3 · Offers', count: selectedIds(month).length },
            ]}
          />
          {tab === 'target' && (
            <TargetView
              target={target}
              actual={data.actuals.find((a: any) => a.month === month)?.revenue || 0}
              offerExpected={selectedIds(month).reduce(
                (s, oid) => s + (offers.find(o => o.id === oid)?.expected_revenue || 0),
                0,
              )}
              canEdit={ctx.canEditTarget}
              isRollup={isRollup}
              onEdit={() => setEditing(target)}
              onNext={() => setTab('plan')}
            />
          )}
          {tab === 'plan' && (
            <PlanView
              key={`${studioId}-${year}-${month}`}
              studio={studio}
              year={year}
              month={month}
              target={target}
              saved={planFor(month)}
              canEdit={can('target_edit')}
              activations={data.activations || []}
              theme={data.themes?.[month]}
              items={data.items}
              offers={selectedIds(month)
                .map(oid => offers.find(o => o.id === oid))
                .filter(Boolean)}
              onSave={(body: any) => savePlan(month, body)}
              onManage={() => setView('playbook')}
              onOffers={() => setTab('offers')}
            />
          )}
          {tab === 'offers' && <OffersCuration {...ctx} month={month} target={target} />}
        </>
      )}
      {view === 'playbook' && (
        <PlaybookEditor
          studioId={studioId}
          year={year}
          items={data.items}
          canEdit={can('target_edit')}
          onChange={(items: any[]) => setData((d: any) => ({ ...d, items }))}
        />
      )}
      {editing && (
        <TargetEditor
          target={{ ...editing, studio: studio.name }}
          canApprove={can('target_approve')}
          onClose={() => setEditing(null)}
          onSave={async body => {
            try {
              await patch(`/targets/${editing.id}`, body);
              setEditing(null);
              await reload();
              toast('Target updated.');
            } catch (e: any) {
              toast(e.message, 'error');
            }
          }}
        />
      )}
    </div>
  );
}

function MonthStrip({ targets, month, setMonth, selectedIds, planFor }: any) {
  const max = Math.max(1, ...targets.map(targetOf));
  return (
    <>
      <div className="sp-months" role="tablist" aria-label="Month">
        {MONTHS_SHORT.map((m, i) => {
          const t = targets.find((x: any) => x.month === i + 1),
            value = targetOf(t);
          return (
            <button
              key={m}
              role="tab"
              aria-selected={month === i + 1}
              className={month === i + 1 ? 'active' : ''}
              onClick={() => setMonth(i + 1)}
            >
              <span className="sp-m-name">{m}</span>
              <span className="sp-m-bar">
                <i style={{ height: `${Math.max(6, (value / max) * 100)}%` }} />
              </span>
              <span className="sp-m-value">{lakh(value)}</span>
              <span className="sp-m-flags">
                <i className={`flag ${t?.approved_target !== null && t ? 'ok' : ''}`} title="Target approved" />
                <i className={`flag ${planFor(i + 1)?.strategy ? 'ok' : ''}`} title="Plan written" />
                <i className={`flag ${selectedIds(i + 1).length ? 'ok' : ''}`} title="Offers in plan" />
              </span>
            </button>
          );
        })}
      </div>
      <p className="sp-legend">
        <i className="flag ok" /> done <i className="flag" /> to do — dots: target approved · plan written · offers in
        plan
      </p>
    </>
  );
}

// ---------- Year plan: one row per month; fixed newcomer / lapsed / renewal slots plus other offers ----------
type DropTarget = { month: number; slot: string } | 'library';
function AnnualBoard({
  studio,
  year,
  offers,
  slotsFor,
  extrasFor,
  savePicks,
  isOwn,
  updateOffer,
  reloadOffers,
  targets,
  onEditTarget,
  canEditTarget,
  onOpenMonth,
}: any) {
  const { boot, can, toast } = useApp();
  const [editingOffer, setEditingOffer] = useState<any>(null),
    [suggestions, setSuggestions] = useState<Record<number, any[]>>({}),
    [busy, setBusy] = useState<Record<number, boolean>>({});
  const [engine, setEngine] = useState(boot.aiConfigured ? 'ai' : 'engine'),
    [over, setOver] = useState<string | null>(null);
  const [libOpen, setLibOpen] = useState(true),
    [libMonth, setLibMonth] = useState<number | 0>(0),
    [libType, setLibType] = useState('all'),
    [libScope, setLibScope] = useState('city'),
    [libQuery, setLibQuery] = useState('');
  const canCurate = can('target_edit');
  const inPlan = new Set(
    MONTHS.flatMap((_, i) => [...Object.values(slotsFor(i + 1)), ...extrasFor(i + 1)].filter(Boolean)),
  );
  const library = offers
    .filter(
      (o: any) =>
        (libScope === 'city' || isOwn(o)) &&
        (!libMonth || o.month === libMonth) &&
        (libType === 'all' || (libType === 'other' ? !o.plan_slot : o.plan_slot === libType)) &&
        (!libQuery ||
          `${o.name} ${o.benefit} ${o.audience} ${o.studio}`.toLowerCase().includes(libQuery.toLowerCase())),
    )
    .sort((a: any, b: any) => (a.month || 13) - (b.month || 13) || (a.plan_rank || 9) - (b.plan_rank || 9));

  // Offers from another studio in the city are copied into this studio; own offers move to the target month.
  const bringIn = async (offer: any, month: number) => {
    const days = (d: string | null, fallback: number) =>
      `${year}-${pad(month)}-${pad(Math.min(Number(d?.slice(8, 10)) || fallback, lastDay(year, month)))}`;
    if (!isOwn(offer)) {
      const copy = await post('/offers', {
        name: offer.name,
        headline: offer.headline,
        customerCopy: offer.customer_copy,
        benefit: offer.benefit,
        audience: offer.audience,
        rationale: offer.rationale,
        objective: offer.objective,
        offerType: offer.offer_type,
        studioId: studio.id,
        year,
        month,
        validityStart: days(offer.validity_start, 1),
        validityEnd: days(offer.validity_end, lastDay(year, month)),
        redemptionConditions: offer.redemption_conditions,
        targetPurchases: offer.target_purchases,
        expectedAsp: offer.expected_asp,
        expectedRevenue: offer.expected_revenue,
        revenueTarget: offer.revenue_target,
        effectiveDiscount: offer.effective_discount,
        generationSource: 'manual',
        dataMode: 'user',
        status: 'draft',
        provenance: { copiedFrom: offer.id, studio: offer.studio },
      });
      await reloadOffers();
      return copy.id;
    }
    if (offer.studio_id === studio.id && offer.month !== month)
      updateOffer(
        await patch(`/offers/${offer.id}`, {
          month,
          year,
          validityStart: days(offer.validity_start, 1),
          validityEnd: days(offer.validity_end, lastDay(year, month)),
          reason: 'Moved on the year plan.',
        }),
      );
    return offer.id;
  };
  const place = async (offer: any, from: { month: number; slot: string } | null, to: DropTarget) => {
    try {
      if (from) {
        const s = slotsFor(from.month),
          x = extrasFor(from.month);
        await savePicks(
          from.month,
          from.slot === 'extra' ? s : { ...s, [from.slot]: null },
          from.slot === 'extra' ? x.filter((id: number) => id !== offer.id) : x,
        );
      }
      if (to === 'library') return;
      const id = await bringIn(offer, to.month),
        s = slotsFor(to.month),
        x = extrasFor(to.month);
      if (to.slot === 'extra') await savePicks(to.month, s, [...x, id]);
      else
        await savePicks(
          to.month,
          { ...s, [to.slot]: id },
          x.filter((v: number) => v !== id),
        );
    } catch (e: any) {
      toast(e.message, 'error');
    }
  };
  const dropProps = (key: string, to: DropTarget) => ({
    className: over === key ? 'drop' : '',
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      setOver(key);
    },
    onDragLeave: () => setOver(null),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      setOver(null);
      const p = JSON.parse(e.dataTransfer.getData('text/plain') || '{}');
      const o = offers.find((x: any) => x.id === p.offerId);
      if (o) place(o, p.from, to);
    },
  });
  const drag = (offer: any, from: { month: number; slot: string } | null) =>
    canCurate
      ? {
          draggable: true,
          onDragStart: (e: React.DragEvent) => {
            e.dataTransfer.setData('text/plain', JSON.stringify({ offerId: offer.id, from }));
            e.dataTransfer.effectAllowed = 'move';
          },
        }
      : {};
  const suggest = async (m: number) => {
    setBusy(b => ({ ...b, [m]: true }));
    try {
      const t = targets.find((x: any) => x.month === m),
        picked = [...Object.values(slotsFor(m)), ...extrasFor(m)]
          .map(id => offers.find((o: any) => o.id === id)?.name)
          .filter(Boolean);
      const result = await post('/offers/generate', {
        studioId: studio.id,
        year,
        month: m,
        objective: MONTH_OBJECTIVES[m - 1],
        source: engine,
        count: 3,
        tone: 'witty',
        targetRevenue: Math.round((targetOf(t) || 1000000) * 0.1),
        maxDiscountPercent: studio.max_discount_percent,
        instructions: `Suggest offers for ${studio.name} (${studio.city}) in ${MONTHS[m - 1]} that complement: ${picked.join(', ') || 'no existing offers'}. Use ${studio.city} prices.`,
      });
      setSuggestions(s => ({ ...s, [m]: result.offers.map((o: any) => ({ ...o, source: result.source })) }));
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy(b => ({ ...b, [m]: false }));
    }
  };
  const accept = async (m: number, s: any) => {
    try {
      const saved = await post('/offers', {
        ...s,
        studioId: studio.id,
        year,
        month: m,
        generationSource: s.source === 'openai' ? 'openai' : 'rules_engine',
        dataMode: 'user',
        status: 'draft',
      });
      await reloadOffers();
      await savePicks(m, slotsFor(m), [...extrasFor(m), saved.id]);
      setSuggestions(x => ({ ...x, [m]: x[m].filter(o => o !== s) }));
      toast(`“${saved.name}” added to ${MONTHS[m - 1]}.`);
    } catch (e: any) {
      toast(e.message, 'error');
    }
  };
  const optionsFor = (m: number, slot: string) =>
    offers
      .filter((o: any) => o.month === m && (slot === 'extra' ? !o.plan_slot : o.plan_slot === slot))
      .sort((a: any, b: any) => Number(!isOwn(a)) - Number(!isOwn(b)) || (a.plan_rank || 9) - (b.plan_rank || 9));

  return (
    <div className="yp">
      <div className="yp-toolbar">
        <span className="muted">
          Each month needs a newcomer, lapsed-member and renewal offer. Pick from the dropdowns, drag from the library,
          or click any offer to edit it.
        </span>
        <div className="button-row tight">
          <Select aria-label="Suggestion engine" value={engine} onChange={e => setEngine(e.target.value)}>
            <option value="ai" disabled={!boot.aiConfigured}>
              AI suggestions{boot.aiConfigured ? '' : ' (not configured)'}
            </option>
            <option value="engine">Rules engine</option>
          </Select>
          {can('offer_create') && (
            <Button
              size="sm"
              variant="secondary"
              icon={<WandSparkles size={14} />}
              onClick={async () => {
                for (let m = 1; m <= 12; m++) await suggest(m);
              }}
            >
              Suggest for all months
            </Button>
          )}
          <Button size="sm" variant={libOpen ? 'dark' : 'secondary'} onClick={() => setLibOpen(o => !o)}>
            {libOpen ? 'Hide' : 'Show'} offer library
          </Button>
        </div>
      </div>
      <div className={`yp-layout ${libOpen ? 'with-library' : ''}`}>
        <div className="yp-table-wrap">
          <div className="yp-table" role="table" aria-label="Year plan">
            <div className="yp-row yp-head" role="row">
              <div>Month</div>
              <div>Target</div>
              {SLOT_KEYS.map(s => (
                <div key={s}>{SLOT_LABELS[s]} offer</div>
              ))}
              <div>Other offers</div>
            </div>
            {MONTHS_SHORT.map((label, i) => {
              const m = i + 1,
                t = targets.find((x: any) => x.month === m),
                total = targetOf(t),
                slots = slotsFor(m),
                extras = extrasFor(m);
              const chosen = [...Object.values(slots), ...extras]
                .filter(Boolean)
                .map(id => offers.find((o: any) => o.id === id))
                .filter(Boolean);
              const planned = chosen.reduce((s: number, o: any) => s + (o.expected_revenue || 0), 0),
                cover = total ? planned / total : 0;
              return (
                <div key={label} className="yp-row" role="row">
                  <div className="yp-month">
                    <button onClick={() => onOpenMonth(m)} title="Open month detail">
                      {MONTHS[i]} <ChevronRight size={13} />
                    </button>
                    {SLOT_KEYS.filter(s => !slots[s]).length > 0 && (
                      <span className="yp-gap">
                        {SLOT_KEYS.filter(s => !slots[s]).length} slot
                        {SLOT_KEYS.filter(s => !slots[s]).length > 1 ? 's' : ''} empty
                      </span>
                    )}
                  </div>
                  <div className="yp-target">
                    <button
                      disabled={!canEditTarget || !t}
                      onClick={() => onEditTarget(t)}
                      title={canEditTarget ? 'Edit target' : undefined}
                    >
                      {lakh(total)}
                    </button>
                    <Progress value={planned} max={total || 1} tone={cover >= 0.5 ? 'green' : 'purple'} />
                    <small>
                      {lakh(planned)} planned · {percent(cover, 0, true)}
                    </small>
                  </div>
                  {SLOT_KEYS.map(slot => {
                    const offer = offers.find((o: any) => o.id === slots[slot]),
                      key = `${m}-${slot}`,
                      d = dropProps(key, { month: m, slot });
                    return (
                      <div
                        key={slot}
                        className={`yp-slot ${d.className}`}
                        onDragOver={d.onDragOver}
                        onDragLeave={d.onDragLeave}
                        onDrop={d.onDrop}
                      >
                        {offer ? (
                          <OfferChip
                            offer={offer}
                            studioId={studio.id}
                            {...drag(offer, { month: m, slot })}
                            onEdit={() => setEditingOffer(offer)}
                            onRemove={canCurate ? () => savePicks(m, { ...slots, [slot]: null }, extras) : undefined}
                          />
                        ) : (
                          <span className="yp-empty">Drop or pick a {SLOT_LABELS[slot].toLowerCase()} offer</span>
                        )}
                        {canCurate && (
                          <select
                            className="yp-pick"
                            aria-label={`${MONTHS[i]} ${slot} offer`}
                            value=""
                            onChange={async e => {
                              const o = offers.find((x: any) => x.id === Number(e.target.value));
                              if (o) await place(o, null, { month: m, slot });
                            }}
                          >
                            <option value="">{offer ? 'Swap…' : 'Choose…'}</option>
                            {optionsFor(m, slot).map((o: any) => (
                              <option key={o.id} value={o.id}>
                                {o.name} · {o.expected_asp ? money(o.expected_asp) : '—'}
                                {isOwn(o) ? '' : ` (${o.studio})`}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    );
                  })}
                  {(() => {
                    const d = dropProps(`${m}-extra`, { month: m, slot: 'extra' });
                    return (
                      <div
                        className={`yp-extras ${d.className}`}
                        onDragOver={d.onDragOver}
                        onDragLeave={d.onDragLeave}
                        onDrop={d.onDrop}
                      >
                        {extras.map((id: number) => {
                          const o = offers.find((x: any) => x.id === id);
                          return o ? (
                            <OfferChip
                              key={id}
                              offer={o}
                              studioId={studio.id}
                              compact
                              {...drag(o, { month: m, slot: 'extra' })}
                              onEdit={() => setEditingOffer(o)}
                              onRemove={
                                canCurate
                                  ? () =>
                                      savePicks(
                                        m,
                                        slots,
                                        extras.filter((x: number) => x !== id),
                                      )
                                  : undefined
                              }
                            />
                          ) : null;
                        })}
                        {suggestions[m]?.map((s, k) => (
                          <div key={k} className="yp-suggest">
                            <Sparkles size={12} />
                            <span>
                              <b>{s.name}</b> {lakh(s.expectedRevenue)}
                            </span>
                            <button onClick={() => accept(m, s)}>Add</button>
                            <button
                              aria-label="Dismiss"
                              onClick={() => setSuggestions(x => ({ ...x, [m]: x[m].filter(o => o !== s) }))}
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                        {canCurate && (
                          <div className="yp-extra-actions">
                            <select
                              className="yp-pick"
                              aria-label={`Add an offer to ${MONTHS[i]}`}
                              value=""
                              onChange={async e => {
                                const o = offers.find((x: any) => x.id === Number(e.target.value));
                                if (o) await place(o, null, { month: m, slot: 'extra' });
                              }}
                            >
                              <option value="">+ Add offer…</option>
                              {offers
                                .filter((o: any) => (o.month === m || !inPlan.has(o.id)) && !chosen.includes(o))
                                .sort((a: any, b: any) => Number(!isOwn(a)) - Number(!isOwn(b)))
                                .map((o: any) => (
                                  <option key={o.id} value={o.id}>
                                    {o.name}
                                    {o.month && o.month !== m ? ` · ${MONTHS_SHORT[o.month - 1]}` : ''}
                                    {isOwn(o) ? '' : ` (${o.studio})`}
                                  </option>
                                ))}
                            </select>
                            {can('offer_create') && (
                              <button className="yp-ai" disabled={busy[m]} onClick={() => suggest(m)}>
                                <Sparkles size={12} /> {busy[m] ? '…' : 'Suggest'}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        </div>
        {libOpen &&
          (() => {
            const d = dropProps('library', 'library');
            return (
              <aside
                className={`yp-library ${d.className}`}
                onDragOver={d.onDragOver}
                onDragLeave={d.onDragLeave}
                onDrop={d.onDrop}
              >
                <h4>
                  Offer library <span>{library.length}</span>
                </h4>
                <div className="yp-lib-filters">
                  <Select
                    aria-label="Library month"
                    value={libMonth}
                    onChange={e => setLibMonth(Number(e.target.value))}
                  >
                    <option value={0}>All months</option>
                    {MONTHS.map((n, i) => (
                      <option key={n} value={i + 1}>
                        {n}
                      </option>
                    ))}
                  </Select>
                  <Select aria-label="Offer type" value={libType} onChange={e => setLibType(e.target.value)}>
                    <option value="all">All types</option>
                    {SLOT_KEYS.map(s => (
                      <option key={s} value={s}>
                        {SLOT_LABELS[s]}
                      </option>
                    ))}
                    <option value="other">Other</option>
                  </Select>
                  <Select aria-label="Studios" value={libScope} onChange={e => setLibScope(e.target.value)}>
                    <option value="city">All {studio.city} studios</option>
                    <option value="own">This studio only</option>
                  </Select>
                  <Input value={libQuery} onChange={e => setLibQuery(e.target.value)} placeholder="Search offers" />
                </div>
                <p className="muted">
                  Drag into a month. Offers from other studios are copied in. Drop here to take an offer out of the
                  plan.
                </p>
                <div className="yp-lib-list">
                  {library.map((o: any) => (
                    <OfferChip
                      key={o.id}
                      offer={o}
                      studioId={studio.id}
                      showMonth
                      inPlan={inPlan.has(o.id)}
                      {...drag(o, null)}
                      onEdit={() => setEditingOffer(o)}
                    />
                  ))}
                  {!library.length && <p className="muted">No offers match these filters.</p>}
                </div>
              </aside>
            );
          })()}
      </div>
      {editingOffer && (
        <OfferEditor
          offer={editingOffer}
          onClose={() => setEditingOffer(null)}
          onSaved={(o: any) => {
            updateOffer(o);
            setEditingOffer(null);
          }}
        />
      )}
    </div>
  );
}

function OfferChip({ offer, studioId, compact, showMonth, inPlan, onEdit, onRemove, ...drag }: any) {
  const other = offer.studio_id !== studioId;
  return (
    <div
      className={`yp-chip ${compact ? 'compact' : ''} ${inPlan ? 'in-plan' : ''}`}
      {...drag}
      onClick={onEdit}
      role="button"
      tabIndex={0}
      onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && onEdit()}
      title={offer.benefit || offer.name}
    >
      <div className="yp-chip-top">
        <strong>{offer.name}</strong>
        {onRemove && (
          <button
            className="sp-icon"
            aria-label="Remove from plan"
            onClick={e => {
              e.stopPropagation();
              onRemove();
            }}
          >
            <X size={12} />
          </button>
        )}
      </div>
      <small>
        {[
          showMonth && offer.month ? MONTHS_SHORT[offer.month - 1] : null,
          offer.plan_slot ? SLOT_LABELS[offer.plan_slot] : null,
          offer.expected_asp ? money(offer.expected_asp) : null,
          offer.target_purchases ? `${number(offer.target_purchases)} units` : null,
          offer.expected_revenue ? lakh(offer.expected_revenue) : null,
        ]
          .filter(Boolean)
          .join(' · ')}
      </small>
      {(other || inPlan) && (
        <small className="yp-tag">
          {other ? offer.studio : ''}
          {other && inPlan ? ' · ' : ''}
          {inPlan ? 'in plan' : ''}
        </small>
      )}
    </div>
  );
}

function OfferEditor({ offer, onClose, onSaved }: { offer: any; onClose: () => void; onSaved: (o: any) => void }) {
  const { can, toast } = useApp(),
    navigate = useNavigate();
  const [f, setF] = useState<any>({
    name: offer.name,
    headline: offer.headline || '',
    benefit: offer.benefit || '',
    customerCopy: offer.customer_copy || '',
    audience: offer.audience || '',
    offerType: offer.offer_type,
    objective: offer.objective,
    validityStart: offer.validity_start || '',
    validityEnd: offer.validity_end || '',
    expectedAsp: offer.expected_asp ?? '',
    targetPurchases: offer.target_purchases ?? '',
    expectedRevenue: offer.expected_revenue ?? '',
    effectiveDiscount: offer.effective_discount ?? '',
    rationale: offer.rationale || '',
    redemptionConditions: offer.redemption_conditions || '',
  });
  const set = (k: string, v: any) => setF((x: any) => ({ ...x, [k]: v }));
  const num = (v: any) => (v === '' || v === null ? null : Number(v));
  const save = async () => {
    try {
      onSaved(
        await patch(`/offers/${offer.id}`, {
          ...f,
          expectedAsp: num(f.expectedAsp),
          targetPurchases: num(f.targetPurchases),
          expectedRevenue: num(f.expectedRevenue),
          effectiveDiscount: num(f.effectiveDiscount),
          reason: 'Edited on the studio plan.',
        }),
      );
      toast('Offer saved.');
    } catch (e: any) {
      toast(e.message, 'error');
    }
  };
  const disabled = !can('offer_edit');
  return (
    <Drawer
      title="Edit offer"
      subtitle={`${offer.studio || ''}${offer.month ? ` · ${MONTHS[offer.month - 1]} ${offer.year}` : ''}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={() => navigate(`/offers/${offer.id}/edit`)}>
            Full offer builder
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button icon={<Save size={15} />} onClick={save} disabled={disabled}>
            Save
          </Button>
        </>
      }
    >
      <div className="form-grid two">
        <Field label="Offer name" className="span-2">
          <Input value={f.name} onChange={e => set('name', e.target.value)} disabled={disabled} />
        </Field>
        <Field label="Campaign / headline" className="span-2">
          <Input value={f.headline} onChange={e => set('headline', e.target.value)} disabled={disabled} />
        </Field>
        <Field label="What the client gets" className="span-2">
          <Textarea rows={3} value={f.benefit} onChange={e => set('benefit', e.target.value)} disabled={disabled} />
        </Field>
        <Field label="Who it is for">
          <Input value={f.audience} onChange={e => set('audience', e.target.value)} disabled={disabled} />
        </Field>
        <Field label="Goal">
          <Select value={f.objective} onChange={e => set('objective', e.target.value)} disabled={disabled}>
            {OBJECTIVES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
            {!OBJECTIVES.some(([v]) => v === f.objective) && (
              <option value={f.objective}>{titleCase(f.objective)}</option>
            )}
          </Select>
        </Field>
        <Field label="Starts">
          <Input
            type="date"
            value={f.validityStart}
            onChange={e => set('validityStart', e.target.value)}
            disabled={disabled}
          />
        </Field>
        <Field label="Ends">
          <Input
            type="date"
            value={f.validityEnd}
            onChange={e => set('validityEnd', e.target.value)}
            disabled={disabled}
          />
        </Field>
        <Field label="Offer price (₹)">
          <Input
            type="number"
            min="0"
            value={f.expectedAsp}
            onChange={e => set('expectedAsp', e.target.value)}
            disabled={disabled}
          />
        </Field>
        <Field label="Units target">
          <Input
            type="number"
            min="0"
            value={f.targetPurchases}
            onChange={e => set('targetPurchases', e.target.value)}
            disabled={disabled}
          />
        </Field>
        <Field label="Expected revenue (₹)">
          <Input
            type="number"
            min="0"
            value={f.expectedRevenue}
            onChange={e => set('expectedRevenue', e.target.value)}
            disabled={disabled}
          />
        </Field>
        <Field label="Value to client / discount %">
          <Input
            type="number"
            min="0"
            max="100"
            value={f.effectiveDiscount}
            onChange={e => set('effectiveDiscount', e.target.value)}
            disabled={disabled}
          />
        </Field>
        <Field label="Customer copy" className="span-2">
          <Textarea
            rows={2}
            value={f.customerCopy}
            onChange={e => set('customerCopy', e.target.value)}
            disabled={disabled}
          />
        </Field>
        <Field label="Terms" className="span-2">
          <Textarea
            rows={2}
            value={f.redemptionConditions}
            onChange={e => set('redemptionConditions', e.target.value)}
            disabled={disabled}
          />
        </Field>
        <Field label="Why this offer" className="span-2">
          <Textarea rows={3} value={f.rationale} onChange={e => set('rationale', e.target.value)} disabled={disabled} />
        </Field>
      </div>
      {offer.mechanics && Object.keys(offer.mechanics).length > 0 && (
        <Callout tone="info">
          This offer has calculated mechanics; saving recalculates its price and revenue from them. Use the full builder
          to change mechanics.
        </Callout>
      )}
    </Drawer>
  );
}

function TargetView({
  target,
  actual,
  offerExpected,
  canEdit,
  isRollup,
  onEdit,
  onNext,
}: {
  target: any;
  actual: number;
  offerExpected: number;
  canEdit: boolean;
  isRollup: boolean;
  onEdit: () => void;
  onNext: () => void;
}) {
  if (!target)
    return <EmptyState title="No target for this month" text="Generate targets from the Target Matrix first." />;
  const total = targetOf(target),
    f = target.funnel || {},
    a = target.assumptions || {},
    pb = a.playbook,
    wb = a.workbook,
    labels = a.streamLabels || {};
  const streams = [
    ['New clients', target.new_client_target],
    [labels.renewal || 'Renewals', target.renewal_target],
    ['Repeat purchases', target.repeat_target],
    ['Reactivation', target.reactivation_target],
    ['Other', target.other_target],
  ].filter(([, v]) => Number(v) > 0) as Array<[string, number]>;
  const funnel = (
    wb
      ? [
          ['Leads', f.requiredLeads],
          ['First visits / trials', f.requiredCompletedTrials],
          ['New paying clients', f.requiredNewBuyers],
        ]
      : [
          ['Leads', f.requiredLeads],
          ['Trial bookings', f.requiredTrialBookings],
          ['Trials attended', f.requiredCompletedTrials],
          ['New buyers', f.requiredNewBuyers],
        ]
  ) as Array<[string, number]>;
  return (
    <div className="sp-grid">
      <Card>
        <CardHeader
          title="The number"
          action={
            canEdit && (
              <Button size="sm" variant="secondary" icon={<Edit3 size={14} />} onClick={onEdit}>
                Edit target
              </Button>
            )
          }
        />
        <div className="sp-big">{money(total)}</div>
        <div className="sp-compare">
          <div>
            <span>Last year (same month)</span>
            <strong>{lakh(target.historical_revenue)}</strong>
          </div>
          <div>
            <span>Growth needed</span>
            <strong>{percent(target.target_growth)}</strong>
          </div>
          <div>
            <span>Actual so far</span>
            <strong>{actual ? lakh(actual) : '—'}</strong>
          </div>
          <div>
            <span>Offers in plan expect</span>
            <strong>{offerExpected ? lakh(offerExpected) : '—'}</strong>
          </div>
        </div>
        {actual > 0 && (
          <>
            <Progress value={actual} max={total} tone="green" />
            <small className="muted">{percent(actual / total, 0, true)} of target achieved</small>
          </>
        )}
        {a.planSource && (
          <small className="muted">
            Source: {a.planSource}. {a.scenarioExplanation}
          </small>
        )}
        {isRollup && (
          <Callout tone="info">Edit each venue's target in its own plan; this total updates automatically.</Callout>
        )}
      </Card>
      <Card>
        <CardHeader title="Where the money comes from" />
        <div className="sp-streams">
          {streams.map(([label, value]) => (
            <div key={label}>
              <div>
                <span>{label}</span>
                <strong>{lakh(value)}</strong>
              </div>
              <Progress value={value} max={total} tone="purple" />
            </div>
          ))}
        </div>
        <small className="muted">
          {number(target.target_transactions)} {wb ? 'paying clients' : 'sales'} at ~{money(target.expected_aov)}{' '}
          average.
        </small>
      </Card>
      <Card className="sp-span">
        <CardHeader title="New-client funnel needed" subtitle="Work backwards from the new-client revenue target" />
        <div className="sp-funnel">
          {funnel.map(([label, value], i) => (
            <React.Fragment key={label}>
              {i > 0 && <ChevronRight size={18} />}
              <div>
                <strong>{number(value)}</strong>
                <span>{label}</span>
              </div>
            </React.Fragment>
          ))}
        </div>
        {pb && (
          <div className="sp-funnel sp-funnel-secondary">
            <div>
              <strong>{number(pb.renewalPurchases)}</strong>
              <span>Renewal purchases (of {number(pb.renewalsDue)} due)</span>
            </div>
            <div>
              <strong>{number(pb.reactivated)}</strong>
              <span>Reactivated clients</span>
            </div>
            <div>
              <strong>{number(pb.lapsedTouches)}</strong>
              <span>Lapsed outreach touches</span>
            </div>
          </div>
        )}
        {wb && (
          <div className="sp-funnel sp-funnel-secondary">
            <div>
              <strong>{number(wb.packageConversions)}</strong>
              <span>Package conversions</span>
            </div>
            <div>
              <strong>{number(wb.existingPaying)}</strong>
              <span>Existing paying clients</span>
            </div>
            <div>
              <strong>{number(wb.checkins)}</strong>
              <span>Check-ins target</span>
            </div>
            <div>
              <strong>{lakh(wb.offerLed)}</strong>
              <span>Offer-led revenue (workbook)</span>
            </div>
          </div>
        )}
        {f.warnings?.map((w: string) => (
          <Callout tone="warning" key={w}>
            {w}
          </Callout>
        ))}
        <div className="button-row">
          <Button onClick={onNext} icon={<ChevronRight size={15} />}>
            Next: plan to hit it
          </Button>
        </div>
      </Card>
    </div>
  );
}

function PlanView({
  studio,
  year,
  month,
  target,
  saved,
  canEdit,
  onSave,
  activations,
  theme,
  items,
  offers,
  onManage,
  onOffers,
}: {
  studio: any;
  year: number;
  month: number;
  target: any;
  saved: any;
  canEdit: boolean;
  onSave: (body: any) => Promise<any>;
  activations: any[];
  theme?: string;
  items: any[];
  offers: any[];
  onManage: () => void;
  onOffers: () => void;
}) {
  const { toast } = useApp();
  const fallback = useMemo(
    () => defaultPlan(studio.name, month, target, activations, theme),
    [studio.name, month, target, activations, theme],
  );
  const initial =
    saved?.strategy || saved?.actions?.length
      ? saved
      : { ...fallback, ...(saved ? { offer_ids: saved.offer_ids } : {}) };
  const [plan, setPlan] = useState<any>(initial),
    [dirty, setDirty] = useState(false),
    [newAction, setNewAction] = useState('');
  const source = studioPlaybook(studio.name)?.months[month - 1];
  const MON = MONTHS_SHORT[month - 1],
    monthActs = activations.filter(a => String(a.Month).startsWith(MON) || String(a.Month).endsWith(MON));
  const set = (key: string, value: any) => {
    setPlan((p: any) => ({ ...p, [key]: value }));
    setDirty(true);
  };
  const setAction = (i: number, patchValue: Partial<ActionItem>) =>
    set(
      'actions',
      plan.actions.map((a: ActionItem, j: number) => (j === i ? { ...a, ...patchValue } : a)),
    );
  const save = async (status = plan.status) => {
    try {
      const { theme, objective, strategy, actions, notes } = plan;
      setPlan({ ...plan, ...(await onSave({ theme, objective, strategy, actions, notes, status })) });
      setDirty(false);
      toast(`${MONTHS[month - 1]} plan saved.`);
    } catch (e: any) {
      toast(e.message, 'error');
    }
  };
  const done = plan.actions.filter((a: ActionItem) => a.done).length;
  const enabled = items.filter(i => i.enabled);
  return (
    <div className="sp-grid">
      <Card className="sp-span">
        <CardHeader
          title="Month strategy"
          subtitle={
            saved?.strategy
              ? `Saved ${new Date(saved.updated_at).toLocaleDateString('en-IN')}`
              : 'Suggested from the 2027 plan — edit and save'
          }
          action={
            <div className="button-row tight">
              {!saved?.strategy && <Badge tone="amber">Not saved</Badge>}
              {plan.status === 'final' && <Badge tone="green">Final</Badge>}
              {canEdit && (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<RotateCcw size={14} />}
                    onClick={() => {
                      setPlan({ ...fallback, status: plan.status });
                      setDirty(true);
                    }}
                  >
                    Reset to suggestion
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<Save size={14} />}
                    disabled={!dirty && !!saved?.strategy}
                    onClick={() => save()}
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    icon={<CheckCircle2 size={14} />}
                    onClick={() => save(plan.status === 'final' ? 'draft' : 'final')}
                  >
                    {plan.status === 'final' ? 'Reopen' : 'Mark final'}
                  </Button>
                </>
              )}
            </div>
          }
        />
        <div className="form-grid two">
          <Field label="Theme">
            <Input value={plan.theme || ''} onChange={e => set('theme', e.target.value)} disabled={!canEdit} />
          </Field>
          <Field label="Main objective">
            <Input value={plan.objective || ''} onChange={e => set('objective', e.target.value)} disabled={!canEdit} />
          </Field>
        </div>
        <Field label="How we hit the target">
          <Textarea
            rows={7}
            value={plan.strategy || ''}
            onChange={e => set('strategy', e.target.value)}
            disabled={!canEdit}
          />
        </Field>
        {source && (
          <Callout tone="info" title={`Playbook · lead offer “${source.offer}”`}>
            {source.objective}. Pace: {source.leads} leads · {source.trials} trials · {source.buyers} new buyers ·{' '}
            {source.renewalPurchases} renewals of {source.renewalsDue ?? '—'} due · {source.reactivated} reactivations.
          </Callout>
        )}
        {monthActs.map(a => (
          <Callout key={a.Activation} tone="success" title={`Activation · ${a.Activation} (${a.Format})`}>
            {a.Mechanics} Rewards: {a.Rewards}. Target {a['Participant target'] ?? '—'} participants · KPI:{' '}
            {a['Primary KPI']}
            {a['Linked offer'] && a['Linked offer'] !== '—' ? ` · linked offer: ${a['Linked offer']}` : ''}.
          </Callout>
        ))}
      </Card>
      <Card className="sp-span">
        <CardHeader
          title="Offers in this month's plan"
          subtitle={`${offers.length} selected · ${lakh(offers.reduce((s, o) => s + (o.expected_revenue || 0), 0))} expected`}
          action={
            <Button size="sm" variant="secondary" onClick={onOffers}>
              Choose offers
            </Button>
          }
        />
        {offers.length ? (
          <div className="sp-plan-offers">
            {offers.map(o => (
              <div key={o.id}>
                <strong>{o.name}</strong>
                <span>{o.benefit || o.headline}</span>
                <small>
                  {o.audience || '—'} · {o.validity_start?.slice(5) || '—'} → {o.validity_end?.slice(5) || '—'} ·{' '}
                  {o.expected_revenue ? lakh(o.expected_revenue) : 'revenue —'}
                </small>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">No offers selected. Pick them on the Offers tab or drag them in on the year plan.</p>
        )}
      </Card>
      <Card className="sp-span">
        <CardHeader title="Action plan" subtitle={`${done} of ${plan.actions.length} done`} />
        {[1, 2, 3, 4, 5].map(week => {
          const rows = plan.actions
            .map((a: ActionItem, i: number) => [a, i] as const)
            .filter(([a]: any) => a.week === week);
          if (!rows.length) return null;
          return (
            <div key={week} className="sp-week">
              <h4>Week {week}</h4>
              {rows.map(([a, i]: any) => (
                <div key={i} className={`sp-action ${a.done ? 'done' : ''}`}>
                  <button
                    className="sp-check"
                    aria-label={a.done ? 'Mark not done' : 'Mark done'}
                    onClick={() => setAction(i, { done: !a.done })}
                    disabled={!canEdit}
                  >
                    {a.done && <Check size={13} />}
                  </button>
                  <input
                    className="sp-action-text"
                    value={a.text}
                    onChange={e => setAction(i, { text: e.target.value })}
                    disabled={!canEdit}
                  />
                  <input
                    className="sp-owner"
                    value={a.owner}
                    placeholder="Owner"
                    onChange={e => setAction(i, { owner: e.target.value })}
                    disabled={!canEdit}
                  />
                  <select
                    className="sp-weeksel"
                    value={a.week}
                    onChange={e => setAction(i, { week: Number(e.target.value) })}
                    disabled={!canEdit}
                  >
                    {[1, 2, 3, 4, 5].map(w => (
                      <option key={w} value={w}>
                        Wk {w}
                      </option>
                    ))}
                  </select>
                  {canEdit && (
                    <button
                      className="sp-del"
                      aria-label="Remove action"
                      onClick={() =>
                        set(
                          'actions',
                          plan.actions.filter((_: any, j: number) => j !== i),
                        )
                      }
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          );
        })}
        {canEdit && (
          <form
            className="sp-add"
            onSubmit={e => {
              e.preventDefault();
              if (!newAction.trim()) return;
              set('actions', [...plan.actions, { text: newAction.trim(), owner: '', week: 1, done: false }]);
              setNewAction('');
            }}
          >
            <Input value={newAction} onChange={e => setNewAction(e.target.value)} placeholder="Add an action…" />
            <Button size="sm" variant="secondary" icon={<Plus size={14} />} type="submit">
              Add
            </Button>
          </form>
        )}
        <Field label="Notes">
          <Textarea
            rows={3}
            value={plan.notes || ''}
            onChange={e => set('notes', e.target.value)}
            disabled={!canEdit}
          />
        </Field>
        {canEdit && dirty && (
          <div className="button-row">
            <Button icon={<Save size={15} />} onClick={() => save()}>
              Save plan
            </Button>
          </div>
        )}
      </Card>
      <Card className="sp-span">
        <CardHeader
          title="Studio playbook in force"
          subtitle={`${enabled.length} of ${items.length} items switched on`}
          action={
            <Button size="sm" variant="secondary" onClick={onManage}>
              Manage playbook
            </Button>
          }
        />
        {Object.keys(SECTION_LABELS).map(section => {
          const list = enabled.filter(i => i.section === section);
          return list.length ? (
            <div key={section} className="sp-week">
              <h4>{SECTION_LABELS[section]}</h4>
              <div className="sp-ref">
                {list.map(i => (
                  <div key={i.id}>
                    <strong>{i.title}</strong>
                    <p>{i.body}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null;
        })}
      </Card>
    </div>
  );
}

// Curate which offers are in a month's plan, and create new ones (manual, AI or rules engine).
function OffersCuration({
  studio,
  year,
  month,
  target,
  offers,
  selectedIds,
  setSelection,
  reloadOffers,
  updateOffer,
}: any) {
  const { boot, can, toast } = useApp(),
    navigate = useNavigate();
  const [showGen, setShowGen] = useState(false),
    [busy, setBusy] = useState(false),
    [result, setResult] = useState<any>(null),
    [showAll, setShowAll] = useState(false),
    [editingOffer, setEditingOffer] = useState<any>(null);
  const [form, setForm] = useState({
    objective: MONTH_OBJECTIVES[month - 1],
    source: boot.aiConfigured ? 'ai' : 'engine',
    targetRevenue: Math.round(target?.new_client_target || targetOf(target) * 0.1 || 100000),
    maxDiscountPercent: studio.max_discount_percent,
    count: 3,
    instructions: '',
  });
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const chosen: number[] = selectedIds(month);
  const candidates = offers.filter((o: any) => showAll || o.month === month || chosen.includes(o.id));
  const toggle = (oid: number) =>
    setSelection(month, chosen.includes(oid) ? chosen.filter(x => x !== oid) : [...chosen, oid]);
  const generate = async () => {
    setBusy(true);
    try {
      setResult(
        await post('/offers/generate', {
          ...form,
          studioId: studio.id,
          year,
          month,
          targetRevenue: Number(form.targetRevenue),
          maxDiscountPercent: Number(form.maxDiscountPercent),
          tone: 'witty',
        }),
      );
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };
  const addGenerated = async (s: any) => {
    try {
      const saved = await post('/offers', {
        ...s,
        studioId: studio.id,
        year,
        month,
        generationSource: result.source === 'openai' ? 'openai' : 'rules_engine',
        dataMode: 'user',
        status: 'draft',
      });
      await reloadOffers();
      await setSelection(month, [...chosen, saved.id]);
      setResult((r: any) => ({ ...r, offers: r.offers.filter((o: any) => o !== s) }));
      toast(`“${saved.name}” added to the plan.`);
    } catch (e: any) {
      toast(e.message, 'error');
    }
  };
  const start = `${year}-${pad(month)}-01`,
    end = `${year}-${pad(month)}-14`;
  const newManual = () =>
    navigate('/offers?view=manual', {
      state: {
        concept: {
          studioId: studio.id,
          year,
          month,
          objective: form.objective,
          eligibleProducts: [],
          validityStart: start,
          validityEnd: end,
          revenueTarget: form.targetRevenue,
        },
      },
    });
  const expected = chosen.reduce((s, oid) => s + (offers.find((o: any) => o.id === oid)?.expected_revenue || 0), 0),
    total = targetOf(target);
  return (
    <div>
      <Card>
        <CardHeader
          title={`${MONTHS[month - 1]} offer options`}
          subtitle={`Tick the offers that belong in this month's plan. ${chosen.length} selected${total ? ` · ${lakh(expected)} of ${lakh(total)} (${percent(expected / total, 0, true)})` : ''}`}
          action={
            <div className="button-row tight">
              <label className="sp-toggle">
                <input type="checkbox" checked={showAll} onChange={e => setShowAll(e.target.checked)} /> Show all {year}{' '}
                offers
              </label>
              {can('offer_create') && (
                <>
                  <Button size="sm" variant="secondary" icon={<Plus size={14} />} onClick={newManual}>
                    Create manually
                  </Button>
                  <Button size="sm" icon={<WandSparkles size={14} />} onClick={() => setShowGen(s => !s)}>
                    Generate options
                  </Button>
                </>
              )}
            </div>
          }
        />
        {showGen && (
          <div className="sp-gen">
            <div className="form-grid four">
              <Field label="Goal">
                <Select value={form.objective} onChange={e => set('objective', e.target.value)}>
                  {OBJECTIVES.map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Revenue to drive (₹)">
                <Input
                  type="number"
                  min="0"
                  value={form.targetRevenue}
                  onChange={e => set('targetRevenue', e.target.value)}
                />
              </Field>
              <Field label="Max discount %" hint={`Studio cap ${studio.max_discount_percent}%`}>
                <Input
                  type="number"
                  min="0"
                  max={studio.max_discount_percent}
                  value={form.maxDiscountPercent}
                  onChange={e => set('maxDiscountPercent', e.target.value)}
                />
              </Field>
              <Field label="Engine">
                <Select value={form.source} onChange={e => set('source', e.target.value)}>
                  <option value="ai" disabled={!boot.aiConfigured}>
                    AI {boot.aiConfigured ? '' : '(not configured)'}
                  </option>
                  <option value="engine">Rules engine</option>
                </Select>
              </Field>
            </div>
            <Field label="Extra instructions (optional)">
              <Input
                value={form.instructions}
                onChange={e => set('instructions', e.target.value)}
                placeholder="e.g. no discounts above 10%, focus on lapsed members, make it cheeky"
              />
            </Field>
            <div className="button-row">
              <Button icon={<Sparkles size={15} />} onClick={generate} disabled={busy}>
                {busy ? 'Generating…' : `Generate ${form.count} options`}
              </Button>
            </div>
            {result?.offers?.length > 0 && (
              <div className="sp-suggest-row">
                {result.offers.map((s: any, k: number) => (
                  <div key={k} className="sp-card suggestion">
                    <div className="sp-card-top">
                      <Badge tone="purple">
                        <Sparkles size={11} /> {result.source === 'openai' ? 'AI' : 'Rules engine'}
                      </Badge>
                      {s.recommended && <Badge tone="green">Recommended</Badge>}
                    </div>
                    <strong>{s.name}</strong>
                    <p>{s.benefit}</p>
                    <small>
                      {lakh(s.expectedRevenue)} · {percent(s.effectiveDiscount)} discount
                    </small>
                    <Button size="sm" variant="secondary" icon={<Plus size={13} />} onClick={() => addGenerated(s)}>
                      Add to plan
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {candidates.length ? (
          <TableScroll>
            <table className="data-table">
              <thead>
                <tr>
                  <th>In plan</th>
                  <th>Offer</th>
                  <th>Who it's for</th>
                  <th>Dates</th>
                  <th className="num">Units</th>
                  <th className="num">Expected revenue</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {candidates.map((o: any) => (
                  <tr key={o.id} className={chosen.includes(o.id) ? 'selected-row' : ''}>
                    <td>
                      <input
                        type="checkbox"
                        aria-label={`Include ${o.name}`}
                        checked={chosen.includes(o.id)}
                        onChange={() => toggle(o.id)}
                        disabled={!can('target_edit')}
                      />
                    </td>
                    <td>
                      <strong>{o.name}</strong>
                      <span>{o.benefit || o.headline}</span>
                    </td>
                    <td>{o.audience || '—'}</td>
                    <td>
                      {o.validity_start?.slice(5) || '—'} → {o.validity_end?.slice(5) || '—'}
                    </td>
                    <td className="num">{number(o.target_purchases)}</td>
                    <td className="num">
                      <strong>{o.expected_revenue ? lakh(o.expected_revenue) : '—'}</strong>
                    </td>
                    <td>
                      <StatusBadge status={o.approval_status === 'approved' ? 'approved' : o.status} />
                    </td>
                    <td>
                      <div className="sp-row-actions">
                        <button title="Edit" onClick={() => setEditingOffer(o)}>
                          <Edit3 size={14} />
                        </button>
                        {can('offer_approve') && o.approval_status !== 'approved' && (
                          <button
                            title="Approve"
                            onClick={async () => {
                              try {
                                updateOffer(await post(`/offers/${o.id}/action`, { action: 'approve' }));
                                toast('Offer approved.');
                              } catch (e: any) {
                                toast(e.message, 'error');
                              }
                            }}
                          >
                            <Check size={14} />
                          </button>
                        )}
                        {can('offer_edit') && (
                          <button
                            title="Archive"
                            onClick={async () => {
                              try {
                                await post(`/offers/${o.id}/action`, { action: 'archive' });
                                await reloadOffers();
                              } catch (e: any) {
                                toast(e.message, 'error');
                              }
                            }}
                          >
                            <Archive size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        ) : (
          <EmptyState
            title="No offers for this month"
            text="Generate options, create one manually, or tick “Show all” to pull one from another month."
          />
        )}
      </Card>
      {editingOffer && (
        <OfferEditor
          offer={editingOffer}
          onClose={() => setEditingOffer(null)}
          onSaved={(o: any) => {
            updateOffer(o);
            setEditingOffer(null);
          }}
        />
      )}
    </div>
  );
}

// Switch studio playbook items on/off, edit their wording, add or delete them.
function PlaybookEditor({
  studioId,
  year,
  items,
  canEdit,
  onChange,
}: {
  studioId: number;
  year: number;
  items: any[];
  canEdit: boolean;
  onChange: (items: any[]) => void;
}) {
  const { toast } = useApp();
  const [drafts, setDrafts] = useState<Record<string, { title: string; body: string }>>({});
  const update = async (item: any, body: any) => {
    try {
      const saved = await patch(`/studio-plans/items/${item.id}`, body);
      onChange(items.map(i => (i.id === item.id ? saved : i)));
    } catch (e: any) {
      toast(e.message, 'error');
    }
  };
  const remove = async (item: any) => {
    try {
      await api(`/studio-plans/items/${item.id}`, { method: 'DELETE' });
      onChange(items.filter(i => i.id !== item.id));
    } catch (e: any) {
      toast(e.message, 'error');
    }
  };
  const add = async (section: string) => {
    const d = drafts[section];
    if (!d?.title?.trim()) return;
    try {
      const saved = await post(`/studio-plans/${studioId}/items`, {
        section,
        year,
        title: d.title,
        body: d.body || '',
      });
      onChange([...items, saved]);
      setDrafts(x => ({ ...x, [section]: { title: '', body: '' } }));
    } catch (e: any) {
      toast(e.message, 'error');
    }
  };
  return (
    <div className="sp-grid">
      {Object.entries(SECTION_LABELS).map(([section, label]) => {
        const list = items.filter(i => i.section === section);
        return (
          <Card key={section} className="sp-span">
            <CardHeader
              title={label}
              subtitle={`${list.filter(i => i.enabled).length} of ${list.length} on · switched-on items show in every month's plan`}
            />
            {list.map(item => (
              <div key={item.id} className={`sp-item ${item.enabled ? '' : 'off'}`}>
                <label className="sp-switch" title={item.enabled ? 'Switch off' : 'Switch on'}>
                  <input
                    type="checkbox"
                    checked={!!item.enabled}
                    disabled={!canEdit}
                    onChange={e => update(item, { enabled: e.target.checked })}
                  />
                  <span />
                </label>
                <div className="sp-item-fields">
                  <input
                    defaultValue={item.title}
                    disabled={!canEdit}
                    onBlur={e =>
                      e.target.value.trim() && e.target.value !== item.title && update(item, { title: e.target.value })
                    }
                    aria-label="Title"
                  />
                  <textarea
                    defaultValue={item.body}
                    rows={2}
                    disabled={!canEdit}
                    onBlur={e => e.target.value !== item.body && update(item, { body: e.target.value })}
                    aria-label="Details"
                  />
                  {item.source && (
                    <small className="muted">
                      {item.source === 'user' ? 'Added by your team' : `Source: ${item.source}`}
                    </small>
                  )}
                </div>
                {canEdit && (
                  <button className="sp-del" aria-label="Delete item" onClick={() => remove(item)}>
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
            {!list.length && <p className="muted">Nothing here yet.</p>}
            {canEdit && (
              <div className="sp-item-add">
                <Input
                  value={drafts[section]?.title || ''}
                  onChange={e => setDrafts(x => ({ ...x, [section]: { ...x[section], title: e.target.value } }))}
                  placeholder="New item title"
                />
                <Input
                  value={drafts[section]?.body || ''}
                  onChange={e => setDrafts(x => ({ ...x, [section]: { ...x[section], body: e.target.value } }))}
                  placeholder="Details"
                />
                <Button size="sm" variant="secondary" icon={<Plus size={14} />} onClick={() => add(section)}>
                  Add
                </Button>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
