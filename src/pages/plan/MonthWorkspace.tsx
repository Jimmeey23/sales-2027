import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CalendarHeart,
  ChevronLeft,
  ChevronRight,
  Flag,
  Gift,
  Handshake,
  HeartHandshake,
  Lightbulb,
  Link2,
  ListChecks,
  Minus,
  PartyPopper,
  Pencil,
  Plus,
  RefreshCcw,
  Save,
  Sigma,
  Target,
  Trash2,
  Trophy,
  Unlink,
  X,
} from 'lucide-react';
import { api } from '../../api';
import { useApp } from '../../App';
import { Badge, Button } from '../../components/ui';
import { LOCATION_COLORS, accentFor, locationStudioIds } from '../../data/locations';
import Marquee from '../../components/Marquee';
import { KEY_DATE_LABELS, formatKeyDate, keyDatesFor } from '../../data/keyDates';
import { OFFER_LIBRARY } from '../../data/offerLibrary';
import { MONTHS, money, number, titleCase } from '../../types';
import type { ActionItem } from '../../data/planDefaults';
import { monthActivations } from './CampaignsTab';
import { lakh, type MonthEconomics, type PlanData } from './usePlanData';

const SLOT_KEYS = ['newcomer', 'lapsed', 'renewal'] as const;
const LIVE = (o: any) => !['archived', 'rejected'].includes(o.status);
const STREAMS = [
  { key: 'newClient', field: 'new_client_target', body: 'newClientTarget', label: 'New clients', color: 'var(--a1)' },
  {
    key: 'renewal',
    field: 'renewal_target',
    body: 'renewalTarget',
    label: 'Renewals',
    color: 'color-mix(in srgb, var(--a1) 62%, #fff)',
  },
  {
    key: 'reactivation',
    field: 'reactivation_target',
    body: 'reactivationTarget',
    label: 'Reactivation',
    color: 'color-mix(in srgb, var(--a1) 36%, #fff)',
  },
  {
    key: 'repeat',
    field: 'repeat_target',
    body: 'repeatTarget',
    label: 'Existing / repeat',
    color: 'color-mix(in srgb, var(--a1) 16%, #fff)',
  },
] as const;
// Which revenue stream an offer mainly serves, for grouping the month's offers.
const STREAM_OF: Record<string, string> = {
  acquisition: 'New clients',
  trial_conversion: 'New clients',
  referral: 'New clients',
  new_client: 'New clients',
  retention: 'Ticket & renewal',
  annual_membership: 'Ticket & renewal',
  additional_purchase: 'Ticket & renewal',
  aov: 'Ticket & renewal',
  reactivation: 'Reactivation',
};
const n = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const pct = (v: number | null | undefined, d = 0) => (v === null || v === undefined ? '—' : `${(v * 100).toFixed(d)}%`);

type Prices = { keys: Record<string, string>; prices: Record<string, Record<string, number | null>> };

// Full-screen month plan: everything for one month in one place, editable per studio, with alternate offers on the side.
export default function MonthWorkspace({
  data,
  month,
  setMonth,
  onClose,
  onSaved,
}: {
  data: PlanData;
  month: number;
  setMonth: (m: number) => void;
  onClose: () => void;
  onSaved: () => Promise<unknown>;
}) {
  const { boot, year, can, toast } = useApp(),
    navigate = useNavigate();
  const [studioIdx, setStudioIdx] = useState(0),
    [solo, setSolo] = useState(false),
    [prices, setPrices] = useState<Prices | null>(null);
  const plan = data.plans[studioIdx],
    studio = plan.studio,
    row = plan.months[month - 1],
    econ = plan.economics.months[month - 1],
    combinedRow = data.months[month - 1];
  const editable = can('target_edit');
  const targetRow = plan.detail.targets.find((t: any) => t.month === month);
  const saved = plan.detail.plans.find((p: any) => p.month === month);
  const others = 3;

  useEffect(() => {
    api<Prices>('/studio-plans/products/prices')
      .then(setPrices)
      .catch(() => {});
  }, []);

  // Offers this studio can pick from (Pop-up includes its venues).
  const ownIds = useMemo(() => locationStudioIds(studio, boot.studios), [studio, boot.studios]);
  const ownOffers = useMemo(
    () => data.offers.filter(o => LIVE(o) && ownIds.includes(o.studio_id)),
    [data.offers, ownIds],
  );
  const exists = (id: any) => id && ownOffers.some(o => o.id === id);
  const slots: Record<string, number | null> = Object.fromEntries(
    SLOT_KEYS.map(slot => [
      slot,
      saved?.slots
        ? exists(saved.slots[slot])
          ? saved.slots[slot]
          : null
        : (ownOffers.find(o => o.month === month && o.plan_slot === slot && o.plan_rank === 1)?.id ?? null),
    ]),
  );
  const extras: number[] = Array.isArray(saved?.offer_ids)
    ? saved.offer_ids.filter(exists)
    : ownOffers
        .filter(o => o.month === month && o.generation_source === 'plan_2027' && !o.plan_slot)
        .sort((a, b) => n(b.expected_revenue) - n(a.expected_revenue))
        .map(o => o.id)
        // Unsaved months start with at most four offers; more can be added by hand.
        .slice(0, Math.max(0, 4 - Object.values(slots).filter(Boolean).length));
  const selectedIds = [...(Object.values(slots).filter(Boolean) as number[]), ...extras];
  const selected = selectedIds.map(id => ownOffers.find(o => o.id === id)).filter(Boolean) as any[];
  const slotOf = (id: number) => Object.entries(slots).find(([, v]) => v === id)?.[0];
  const alternates = ownOffers
    .filter(o => !selectedIds.includes(o.id))
    .sort(
      (a, b) =>
        (a.month === month ? 0 : 1) - (b.month === month ? 0 : 1) ||
        Math.abs((a.month || 13) - month) - Math.abs((b.month || 13) - month) ||
        n(b.expected_revenue) - n(a.expected_revenue),
    )
    .slice(0, 16);
  const altGroups = useMemo(() => {
    const labels = prices?.keys || {};
    // Offers without a recorded pricing product are matched to a membership from their wording.
    const guess = (o: any) => {
      const t = `${o.benefit || ''} ${o.headline || ''} ${o.name || ''}`.toLowerCase();
      if (/annual|12 ?m(onth)?\b|year/.test(t)) return 'ANNUAL';
      if (/\b6 ?m(onth)?\b|six[- ]month/.test(t)) return '6M';
      if (/\b3 ?m(onth)?\b|three[- ]month/.test(t)) return '3M';
      if (/\b1 ?m(onth)?\b|one[- ]month/.test(t)) return '1M';
      if (/private/.test(t)) return 'PRIV10';
      if (/\b8 (single )?class|8-class/.test(t)) return '8C';
      if (/\b12 (single )?class|12-class/.test(t)) return '12C';
      if (/\b20 (single )?class|20 sessions/.test(t)) return '20C';
      if (/\b10 (single )?class|10 sessions/.test(t)) return 'CC10';
      if (/single class/.test(t)) return 'SINGLE';
      return null;
    };
    const groups = new Map<string, any[]>();
    for (const o of alternates) {
      const key = o.provenance?.pricing?.product || guess(o);
      const label = key ? labels[key] || key : 'Other offers';
      groups.set(label, [...(groups.get(label) || []), o]);
    }
    const order = Object.values(labels);
    return [...groups.entries()].sort((a, b) => {
      const ia = order.indexOf(a[0]),
        ib = order.indexOf(b[0]);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
  }, [alternates, prices]);
  const ideas = OFFER_LIBRARY.filter(t => t.months.includes(month));
  const offerRevenue = selected.reduce((s, o) => s + n(o.expected_revenue), 0);
  const groups = ['New clients', 'Ticket & renewal', 'Reactivation', 'Other'].map(g => ({
    label: g,
    offers: selected.filter(o => (STREAM_OF[o.objective] || 'Other') === g),
  }));

  const initialForm = () => ({
    theme: saved?.theme ?? row.theme ?? '',
    objective: saved?.objective ?? row.objective ?? '',
    strategy: saved?.strategy ?? '',
    notes: saved?.notes ?? '',
    status: saved?.status ?? 'draft',
    actions: (saved?.actions as ActionItem[]) || [],
    target: n(targetRow?.proposed_target),
    streams: Object.fromEntries(STREAMS.map(s => [s.key, Math.round(n(targetRow?.[s.field]))])) as Record<
      string,
      number
    >,
  });
  const [form, setForm] = useState(initialForm),
    [busy, setBusy] = useState(false),
    [editing, setEditing] = useState<number | null>(null);
  // Reset whenever the month or studio changes, or fresh data arrives after a save.
  useEffect(() => setForm(initialForm()), [month, studioIdx, data]);
  useEffect(() => setEditing(null), [month, studioIdx]);
  const set = (patch: Partial<ReturnType<typeof initialForm>>) => setForm(f => ({ ...f, ...patch }));

  const approved = targetRow?.approved_target !== null && targetRow?.approved_target !== undefined;
  const effective = approved ? n(targetRow.approved_target) : form.target;
  const streamTotal = STREAMS.reduce((s, x) => s + n(form.streams[x.key]), 0);
  const streamsOver = streamTotal > effective * 1.001;
  const targetDirty =
    !!targetRow &&
    (form.target !== n(targetRow.proposed_target) ||
      STREAMS.some(s => form.streams[s.key] !== Math.round(n(targetRow[s.field]))));

  // Offer changes save immediately and, unless solo mode is on, mirror to every other location.
  const offerChange = async (body: any, done: string) => {
    setBusy(true);
    try {
      const r = await api<{ studios: number[] }>(`/studio-plans/${studio.id}/${year}/${month}/offers`, {
        method: 'POST',
        body: JSON.stringify({ ...body, solo }),
      });
      await onSaved();
      toast(r.studios.length > 1 ? `${done} — mirrored to ${r.studios.length - 1} other locations.` : `${done}.`);
      return true;
    } catch (e: any) {
      toast(e.message, 'error');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (streamsOver) return toast('Revenue split is larger than the target — trim a stream first.', 'error');
    setBusy(true);
    try {
      await api(`/studio-plans/${studio.id}/${year}/${month}`, {
        method: 'PUT',
        body: JSON.stringify({
          theme: form.theme || null,
          objective: form.objective || null,
          strategy: form.strategy || null,
          notes: form.notes || null,
          status: form.status,
          actions: form.actions.filter(a => a.text.trim()),
        }),
      });
      if (targetDirty)
        await api(`/targets/${targetRow.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            proposedTarget: form.target,
            ...Object.fromEntries(STREAMS.map(s => [s.body, n(form.streams[s.key])])),
          }),
        });
      await onSaved();
      toast(`${MONTHS[month - 1]} plan saved for ${studio.name}.`);
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const { base, local } = monthActivations(data, month);
  const dates = keyDatesFor(year, month);
  const challenge = local.find(a => a.Format?.toLowerCase().includes('challenge'));
  const event = local.find(a => !a.Format?.toLowerCase().includes('challenge'));
  const fieldProps = { disabled: !editable };
  const coverage = econ?.renewal.coverage ?? null;

  return (
    <div className="mw-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <section
        className="mw accented"
        role="dialog"
        aria-label={`${MONTHS[month - 1]} plan`}
        style={{ '--a1': accentFor(studio.name) } as React.CSSProperties}
      >
        <header className="mw-hero">
          <div className="mw-hero-top">
            <div className="mw-nav">
              <button aria-label="Previous month" disabled={month === 1} onClick={() => setMonth(month - 1)}>
                <ChevronLeft size={18} />
              </button>
              <div>
                <span className="mw-eyebrow">
                  {studio.name} · {year} · {form.theme || row.theme}
                </span>
                <h2>{MONTHS[month - 1]}</h2>
              </div>
              <button aria-label="Next month" disabled={month === 12} onClick={() => setMonth(month + 1)}>
                <ChevronRight size={18} />
              </button>
            </div>
            <div className="mw-head-actions">
              {editable && (
                <label className={`mw-solo ${solo ? 'on' : ''}`} title="When off, offer changes copy to every location">
                  <input type="checkbox" checked={solo} onChange={e => setSolo(e.target.checked)} />
                  <span className="mw-switch" />
                  {solo ? <Unlink size={14} /> : <Link2 size={14} />}
                  {solo ? `Solo: ${studio.name} only` : 'Synced to all locations'}
                </label>
              )}
              {editable && (
                <Button icon={<Save size={15} />} disabled={busy} onClick={save}>
                  {busy ? 'Saving…' : 'Save month'}
                </Button>
              )}
              <button className="mw-close" aria-label="Close" onClick={onClose}>
                <X size={20} />
              </button>
            </div>
          </div>
          <div className="mw-stats">
            <div>
              <span>Target</span>
              <strong>{lakh(effective)}</strong>
              <small>
                {approved ? 'approved' : 'proposed'} · LY {lakh(row.lastYear)}
              </small>
            </div>
            <div>
              <span>Offers carry</span>
              <strong>{lakh(offerRevenue)}</strong>
              <small>
                {selected.length} offers · {effective ? pct(offerRevenue / effective) : '—'} of target
              </small>
            </div>
            <div>
              <span>Renewals covered</span>
              <strong className={coverage !== null && coverage < 1 ? 'warn' : ''}>{pct(coverage)}</strong>
              <small>
                {lakh(econ?.renewal.expected)} expected of {lakh(econ?.renewal.target)}
              </small>
            </div>
            <div>
              <span>Funnel</span>
              <strong>{number(row.leads)} leads</strong>
              <small>
                → {number(row.trials)} trials → {number(row.buyers)} members
              </small>
            </div>
          </div>
          {data.plans.length > 1 && (
            <div className="mw-studios" role="tablist" aria-label="Location">
              {data.plans.map((p, i) => (
                <button
                  key={p.studio.id}
                  role="tab"
                  aria-selected={i === studioIdx}
                  className={i === studioIdx ? 'active' : ''}
                  style={{ '--loc': LOCATION_COLORS[p.studio.name] } as React.CSSProperties}
                  onClick={() => setStudioIdx(i)}
                >
                  <i />
                  {p.studio.name}
                  <b>{lakh(p.months[month - 1].target)}</b>
                </button>
              ))}
              <span className="mw-studios-total">
                All locations <b>{lakh(combinedRow.target)}</b>
              </span>
            </div>
          )}
          <Marquee
            variant="dark"
            items={[
              ...dates.map(d => ({ label: d.name, value: `${formatKeyDate(d)} ${MONTHS[month - 1].slice(0, 3)}` })),
              { label: 'Theme', value: form.theme || row.theme, tone: 'accent' as const },
              ...(econ
                ? [
                    { label: 'Avg first spend', value: money(econ.newClient.firstSpend, true) },
                    { label: 'Trial → member', value: pct(econ.newClient.trialToMember) },
                    { label: 'Lead → trial', value: pct(econ.newClient.leadToTrial) },
                    { label: 'Memberships expiring', value: number(econ.renewal.projectedExpiries) },
                    { label: 'Renewal rate', value: pct(econ.renewal.renewalRate) },
                    ...(econ.renewal.gap > 0
                      ? [{ label: 'Renewal gap', value: lakh(econ.renewal.gap), tone: 'warn' as const }]
                      : []),
                  ]
                : []),
              ...selected.map(o => ({ label: o.name, value: money(o.expected_revenue, true) })),
            ]}
          />
        </header>

        <div className="mw-body pane-offers">
          <main className="mw-main">
            {(
              <>
                <div className="mw-dates">
                  <SectionHead
                    icon={CalendarHeart}
                    title="Important days"
                    hint="Festivals, holidays and moments that shape demand."
                  />
                  <div className="mw-date-list">
                    {dates.map(d => (
                      <div key={d.name} className={`mw-date kd-${d.kind}`}>
                        <b>
                          {formatKeyDate(d)}
                          <small>{MONTHS[month - 1].slice(0, 3)}</small>
                        </b>
                        <span>
                          {d.name}
                          <small>
                            {KEY_DATE_LABELS[d.kind]}
                            {d.approx ? ' · date to confirm' : ''}
                          </small>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mw-section">
                  <SectionHead icon={Flag} title="Focus" hint="The story the team sells all month." />
                  <div className="mw-fields">
                    <label>
                      <span>Theme</span>
                      <input value={form.theme} onChange={e => set({ theme: e.target.value })} {...fieldProps} />
                    </label>
                    <label>
                      <span>Objective</span>
                      <input
                        value={form.objective}
                        onChange={e => set({ objective: e.target.value })}
                        {...fieldProps}
                      />
                    </label>
                    <label className="wide">
                      <span>Strategy — how we hit the number</span>
                      <textarea
                        rows={3}
                        value={form.strategy}
                        placeholder="e.g. Lead with the festive gifting pack, push renewals in week 2…"
                        onChange={e => set({ strategy: e.target.value })}
                        {...fieldProps}
                      />
                    </label>
                  </div>
                </div>

                <div className="mw-section">
                  <SectionHead
                    icon={Target}
                    title="Target & split"
                    hint="What we need, and which stream brings it in."
                  />
                  <div className="mw-target">
                    <label>
                      <span>Proposed target (₹)</span>
                      <input
                        type="number"
                        min={0}
                        value={form.target}
                        onChange={e => set({ target: n(e.target.value) })}
                        disabled={!editable || !targetRow}
                      />
                      <small>
                        {approved
                          ? `Approved at ${lakh(n(targetRow.approved_target))} — approval governs the plan.`
                          : `${lakh(form.target)} · last year ${lakh(row.lastYear)}`}
                      </small>
                    </label>
                    <div className="mw-split-bar">
                      {STREAMS.map(s => (
                        <span
                          key={s.key}
                          style={{
                            width: `${(n(form.streams[s.key]) / Math.max(streamTotal, effective, 1)) * 100}%`,
                            background: s.color,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="mw-streams">
                    {STREAMS.map(s => (
                      <label key={s.key} style={{ '--c': s.color } as React.CSSProperties}>
                        <span>
                          <i /> {s.label}
                        </span>
                        <input
                          type="number"
                          min={0}
                          value={form.streams[s.key]}
                          onChange={e => set({ streams: { ...form.streams, [s.key]: n(e.target.value) } })}
                          disabled={!editable || !targetRow}
                        />
                        <small>
                          {lakh(n(form.streams[s.key]))} ·{' '}
                          {effective ? ((n(form.streams[s.key]) / effective) * 100).toFixed(0) : 0}%
                        </small>
                      </label>
                    ))}
                  </div>
                  <p className={`mw-split-note ${streamsOver ? 'neg' : ''}`}>
                    Allocated {lakh(streamTotal)} of {lakh(effective)}
                    {streamsOver
                      ? ' — over target, trim a stream.'
                      : effective - streamTotal > 1
                        ? ` · ${lakh(effective - streamTotal)} unallocated (other / retail)`
                        : ''}
                  </p>
                </div>
              </>
            )}
            {econ && <Economics econ={econ} window={plan.economics.window} />}

            {(
              <>
                <div className="mw-section">
                  <SectionHead
                    icon={Gift}
                    title={`Offers · ${selected.length}`}
                    hint={`${lakh(offerRevenue)} expected. Edit here, or swap in an alternate from the right.`}
                  />
                  {selected.length ? (
                    groups
                      .filter(g => g.offers.length)
                      .map(g => (
                        <div key={g.label} className="mw-offer-group">
                          <h5>
                            {g.label}
                            <span>{lakh(g.offers.reduce((s, o) => s + n(o.expected_revenue), 0))}</span>
                          </h5>
                          {g.offers.map(o =>
                            editing === o.id ? (
                              <OfferEditor
                                key={o.id}
                                offer={o}
                                studioId={studio.id}
                                prices={prices}
                                solo={solo}
                                others={others}
                                busy={busy}
                                onCancel={() => setEditing(null)}
                                onSave={async edit => {
                                  if (
                                    await offerChange({ op: 'update', offerId: o.id, edit }, `“${edit.name}” updated`)
                                  )
                                    setEditing(null);
                                }}
                              />
                            ) : (
                              <OfferCard
                                key={o.id}
                                offer={o}
                                list={prices?.prices[studio.id]?.[o.provenance?.pricing?.product]}
                                productLabel={prices?.keys[o.provenance?.pricing?.product]}
                                slot={slotOf(o.id)}
                                editable={editable}
                                onEdit={() => setEditing(o.id)}
                                onRemove={() => offerChange({ op: 'remove', offerId: o.id }, `“${o.name}” removed`)}
                              />
                            ),
                          )}
                        </div>
                      ))
                  ) : (
                    <p className="muted">No offers picked yet — add one from the alternates on the right.</p>
                  )}
                </div>
              </>
            )}
            {(
              <>
                <div className="mw-section">
                  <SectionHead
                    icon={PartyPopper}
                    title="Activations"
                    hint="Challenge, event, partner and retention play."
                  />
                  <div className="mw-acts">
                    <Act
                      icon={Trophy}
                      label="Challenge"
                      tone="purple"
                      title={challenge?.Activation || base.challenge[0]}
                      text={challenge?.Mechanics || base.challenge[1]}
                    />
                    <Act
                      icon={PartyPopper}
                      label="Event"
                      tone="coral"
                      title={event?.Activation || base.event[0]}
                      text={event?.Mechanics || base.event[1]}
                    />
                    <Act
                      icon={Handshake}
                      label="Partnership"
                      tone="gold"
                      title={base.partner[0]}
                      text={base.partner[1]}
                    />
                    <Act icon={HeartHandshake} label="Retention" tone="green" title="Members" text={base.retention} />
                  </div>
                  <p className="mw-kpi">KPI: {local[0]?.['Primary KPI'] || base.kpi}</p>
                </div>
              </>
            )}
            {(
              <>
                <div className="mw-section">
                  <SectionHead icon={ListChecks} title="Action plan" hint="Who does what, week by week." />
                  {form.actions.map((a, i) => {
                    const patchAction = (p: Partial<ActionItem>) =>
                      set({ actions: form.actions.map((x, j) => (j === i ? { ...x, ...p } : x)) });
                    return (
                      <div key={i} className="mw-action">
                        <input
                          type="checkbox"
                          checked={a.done}
                          onChange={e => patchAction({ done: e.target.checked })}
                          {...fieldProps}
                        />
                        <input
                          value={a.text}
                          placeholder="Action"
                          onChange={e => patchAction({ text: e.target.value })}
                          {...fieldProps}
                        />
                        <input
                          value={a.owner}
                          placeholder="Owner"
                          className="mw-owner"
                          onChange={e => patchAction({ owner: e.target.value })}
                          {...fieldProps}
                        />
                        <select value={a.week} onChange={e => patchAction({ week: n(e.target.value) })} {...fieldProps}>
                          {[1, 2, 3, 4, 5].map(w => (
                            <option key={w} value={w}>
                              Week {w}
                            </option>
                          ))}
                        </select>
                        {editable && (
                          <button
                            aria-label="Remove action"
                            onClick={() => set({ actions: form.actions.filter((_, j) => j !== i) })}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {editable && (
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<Plus size={14} />}
                      onClick={() => set({ actions: [...form.actions, { text: '', owner: '', week: 1, done: false }] })}
                    >
                      Add action
                    </Button>
                  )}
                  <label className="mw-notes">
                    <span>Notes</span>
                    <textarea
                      rows={3}
                      value={form.notes}
                      onChange={e => set({ notes: e.target.value })}
                      {...fieldProps}
                    />
                  </label>
                  {editable && (
                    <label className="mw-final">
                      <input
                        type="checkbox"
                        checked={form.status === 'final'}
                        onChange={e => set({ status: e.target.checked ? 'final' : 'draft' })}
                      />
                      Mark this month’s plan as final
                    </label>
                  )}
                </div>
              </>
            )}
          </main>

          {(
            <aside className="mw-side">
              <h4>
                <RefreshCcw size={15} /> Alternate offers
              </h4>
              <p className="muted">
                {studio.name}’s other offers — this month’s first.{' '}
                {solo ? 'Adds apply to this location only.' : 'Adding copies it to every location at local prices.'}
              </p>
              {alternates.length ? (
                altGroups.map(([group, list]) => (
                  <section key={group} className="mw-alt-group">
                    <h5>
                      {group} <em>{list.length}</em>
                    </h5>
                    {list.map(o => (
                      <div key={o.id} className="mw-alt">
                        <div>
                          <strong>{o.name}</strong>
                          <span>
                            {o.month ? MONTHS[o.month - 1].slice(0, 3) : 'Any month'} · {titleCase(o.offer_type)}
                            {o.plan_slot ? ` · ${titleCase(o.plan_slot)}` : ''}
                          </span>
                          {(o.benefit || o.headline) && <p>{o.benefit || o.headline}</p>}
                        </div>
                        <div>
                          <b>{money(o.expected_revenue, true)}</b>
                          {editable && (
                            <button
                              aria-label={`Add ${o.name}`}
                              disabled={busy}
                              onClick={() => offerChange({ op: 'add', offerId: o.id }, `“${o.name}” added`)}
                            >
                              <Plus size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </section>
                ))
              ) : (
                <p className="muted">No other offers for this studio yet.</p>
              )}
              {ideas.length > 0 && (
                <>
                  <h4>
                    <Lightbulb size={15} /> Ideas for {MONTHS[month - 1]}
                  </h4>
                  {ideas.map(t => (
                    <button key={t.id} className="mw-idea" onClick={() => navigate('/offers')}>
                      <Badge tone="purple">{t.family}</Badge>
                      <strong>{t.name}</strong>
                      <span>{t.benefit}</span>
                      <em>{t.why}</em>
                    </button>
                  ))}
                </>
              )}
            </aside>
          )}
        </div>
      </section>
    </div>
  );
}

// The month's volumes, built bottom-up from history, with every step shown so the numbers can be challenged.
function Economics({ econ, window }: { econ: MonthEconomics; window: { from: string; to: string } }) {
  const nc = econ.newClient,
    r = econ.renewal,
    re = econ.reactivation;
  const steps = [
    { label: 'New-client revenue', value: lakh(nc.target), note: 'from the revenue split' },
    {
      label: 'Paying members',
      value: number(nc.buyers),
      note: `÷ (${money(nc.firstSpend, true)} first spend + ${money(nc.trialSpend, true)} trial fee ÷ ${pct(nc.trialToMember)})`,
    },
    { label: 'Completed trials', value: number(nc.trials), note: `÷ ${pct(nc.trialToMember)} trial → member` },
    { label: 'Leads', value: number(nc.leads), note: `÷ ${pct(nc.leadToTrial)} lead → trial` },
  ];
  return (
    <div className="mw-section mw-econ">
      <SectionHead
        icon={Sigma}
        title="The maths"
        hint={`Built bottom-up from history, ${window.from} → ${window.to}.`}
      />
      <div className="mw-chain">
        {steps.map((s, i) => (
          <React.Fragment key={s.label}>
            {i > 0 && <ArrowRight size={16} className="mw-chain-arrow" />}
            <div>
              <span>{s.label}</span>
              <strong>{s.value}</strong>
              <small>{s.note}</small>
            </div>
          </React.Fragment>
        ))}
      </div>
      <p className="mw-reason">
        Average first membership spend is {money(nc.firstSpend, true)} across {number(nc.samples.firstSpendBuyers)} new
        buyers in the last 12 months
        {nc.samples.seasonalFirstSpend
          ? `, blended with ${money(nc.samples.seasonalFirstSpend, true)} in ${nc.samples.seasonalMonth}`
          : ''}
        . Trial → member uses {number(nc.samples.trialCohort)} trials given 90 days to convert
        {nc.samples.seasonalTrialToMember !== null
          ? ` (same month last year: ${pct(nc.samples.seasonalTrialToMember)})`
          : ''}
        . Trial fees bring in {lakh(nc.trialRevenue)} of the new-client number on their own.
      </p>

      <div className="mw-renewal">
        <div className="mw-renewal-head">
          <div>
            <span>Renewal revenue we can expect</span>
            <strong>{lakh(r.expected)}</strong>
            <small>of {lakh(r.target)} renewal target</small>
          </div>
          <div className="mw-cover">
            <div className="mw-cover-bar">
              <i style={{ width: `${Math.min(100, (r.coverage || 0) * 100)}%` }} />
            </div>
            <b className={r.gap > 0 ? 'neg' : 'pos'}>
              {r.gap > 0 ? `${lakh(r.gap)} short` : `Covered · ${lakh(r.expected - r.target)} headroom`}
            </b>
          </div>
        </div>
        <div className="mw-renewal-math">
          <span>
            <b>{number(r.projectedExpiries)}</b> memberships expire
            <small>
              {number(r.bookedExpiries)} already booked · {number(r.baselineExpiries)} expired same month last year
            </small>
          </span>
          <span>
            × <b>{pct(r.renewalRate)}</b> renew
            <small>renewed ÷ (renewed + lapsed), last 12 months</small>
          </span>
          <span>
            × <b>{money(r.ticket, true)}</b> per renewal
            <small>renewal revenue ÷ renewed memberships</small>
          </span>
          <span>
            = <b>{number(r.expectedRenewers)}</b> renewals
            <small>{number(r.renewersNeeded)} needed to hit target</small>
          </span>
        </div>
        {econ.alternates.length > 0 && (
          <div className="mw-gap">
            <h5>Closing the {lakh(r.gap)} renewal gap</h5>
            {econ.alternates.map(a => (
              <div key={a.key}>
                <strong>{a.name}</strong>
                <span>{a.logic}</span>
                <b>
                  {number(a.units)} → {lakh(a.revenue)}
                </b>
              </div>
            ))}
          </div>
        )}
      </div>
      <p className="mw-reason">
        Reactivation: {lakh(re.target)} ÷ {money(re.ticket, true)} average comeback ticket ={' '}
        <b>{number(re.needed)} returning members</b>, from {number(re.lapsedPool)} members lapsed 61–365 days (
        {re.lapsedPool ? pct(re.needed / re.lapsedPool, 1) : '—'} response needed).
      </p>
    </div>
  );
}

function OfferCard({ offer: o, slot, list, productLabel, editable, onEdit, onRemove }: any) {
  const linked = !!o.provenance?.linkGroup;
  const offerPrice = n(o.expected_asp),
    pctOff = list ? Math.max(0, 1 - offerPrice / list) : n(o.effective_discount) / 100,
    original = list || (pctOff > 0 && pctOff < 1 ? offerPrice / (1 - pctOff) : null),
    saving = original ? Math.max(0, original - offerPrice) : 0;
  const membership = productLabel || o.provenance?.pricing?.product || titleCase(o.offer_type);
  // Imported rationale is written as "Why: … / Logic: … / KPI: …" lines.
  const reasons = String(o.rationale || '')
    .split('\n')
    .map(line => line.match(/^(Why|Logic|KPI):\s*(.*)$/))
    .filter(Boolean) as RegExpMatchArray[];
  return (
    <article className="oc">
      <header className="oc-head">
        <div>
          <div className="oc-tags">
            {slot && <span className="oc-tag must">{titleCase(slot)} must-have</span>}
            <span className="oc-tag">{membership}</span>
            <span className={`oc-tag ${linked ? 'linked' : 'solo'}`}>
              {linked ? <Link2 size={11} /> : <Unlink size={11} />}
              {linked ? 'All locations' : 'This location'}
            </span>
          </div>
          <h3>{o.name}</h3>
          {o.headline && <p className="oc-job">{o.headline}</p>}
        </div>
        {editable && (
          <div className="oc-actions">
            <button aria-label={`Edit ${o.name}`} onClick={onEdit}>
              <Pencil size={14} />
            </button>
            <button aria-label={`Remove ${o.name}`} className="danger" onClick={onRemove}>
              <Minus size={14} />
            </button>
          </div>
        )}
      </header>

      <div className="oc-benefit">
        <Gift size={14} />
        <span>{o.benefit || '—'}</span>
      </div>

      <div className="oc-price">
        <div>
          <span>List price</span>
          <s>{original ? money(original) : '—'}</s>
        </div>
        <div>
          <span>Offer price</span>
          <strong>{offerPrice ? money(offerPrice) : '—'}</strong>
        </div>
        <div>
          <span>Client saves</span>
          <b className={saving ? '' : 'none'}>
            {saving ? `${money(saving)} · ${pct(pctOff, 1)}` : 'Value-add, no price cut'}
          </b>
        </div>
        <div className="oc-revenue">
          <span>Plan</span>
          <strong>{lakh(n(o.expected_revenue))}</strong>
          <small>
            {number(o.target_purchases)} × {money(offerPrice, true)}
          </small>
        </div>
      </div>

      <dl className="oc-facts">
        <div>
          <dt>Target cohort</dt>
          <dd>{o.audience || '—'}</dd>
        </div>
        <div>
          <dt>Window</dt>
          <dd>
            {o.validity_start
              ? `${new Date(o.validity_start).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${
                  o.validity_end
                    ? new Date(o.validity_end).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                    : '—'
                }`
              : '—'}
          </dd>
        </div>
        <div className="wide">
          <dt>Terms</dt>
          <dd>{o.redemption_conditions || 'One offer per purchase; not stackable with standing perks.'}</dd>
        </div>
      </dl>

      {(reasons.length > 0 || o.rationale) && (
        <details className="oc-why">
          <summary>Why this offer works</summary>
          {reasons.length ? (
            reasons.map(([, k, v]) => (
              <p key={k}>
                <b>{k}</b>
                {v}
              </p>
            ))
          ) : (
            <p>{o.rationale}</p>
          )}
        </details>
      )}
    </article>
  );
}

function OfferEditor({
  offer,
  studioId,
  prices,
  solo,
  others,
  busy,
  onCancel,
  onSave,
}: {
  offer: any;
  studioId: number;
  prices: Prices | null;
  solo: boolean;
  others: number;
  busy: boolean;
  onCancel: () => void;
  onSave: (edit: any) => void;
}) {
  const pricing = offer.provenance?.pricing || {};
  const [f, setF] = useState({
    name: offer.name || '',
    headline: offer.headline || '',
    benefit: offer.benefit || '',
    audience: offer.audience || '',
    rationale: offer.rationale || '',
    product: pricing.product || '',
    discount: Math.round(n(pricing.discount ?? n(offer.effective_discount) / 100) * 100),
    units: n(offer.target_purchases),
    asp: Math.round(n(offer.expected_asp)),
    validity_start: offer.validity_start || '',
    validity_end: offer.validity_end || '',
  });
  const list = f.product ? prices?.prices[studioId]?.[f.product] : null;
  const asp = list ? Math.round(list * (1 - f.discount / 100)) : f.asp;
  const up = (p: Partial<typeof f>) => setF(x => ({ ...x, ...p }));
  return (
    <form
      className="mw-editor"
      onSubmit={e => {
        e.preventDefault();
        onSave({
          name: f.name,
          headline: f.headline || null,
          benefit: f.benefit || null,
          audience: f.audience || null,
          rationale: f.rationale || null,
          validity_start: f.validity_start || null,
          validity_end: f.validity_end || null,
          target_purchases: f.units,
          ...(f.product ? {} : { expected_asp: f.asp }),
          pricing: { product: f.product || null, discount: f.discount / 100, mechanic: f.benefit },
        });
      }}
    >
      <div className="mw-editor-grid">
        <label className="wide">
          <span>Offer name — make it memorable</span>
          <input value={f.name} required minLength={3} onChange={e => up({ name: e.target.value })} />
        </label>
        <label className="wide">
          <span>Commercial job</span>
          <input value={f.headline} onChange={e => up({ headline: e.target.value })} />
        </label>
        <label className="wide">
          <span>Mechanic (what the client gets)</span>
          <textarea rows={2} value={f.benefit} onChange={e => up({ benefit: e.target.value })} />
        </label>
        <label>
          <span>Audience</span>
          <input value={f.audience} onChange={e => up({ audience: e.target.value })} />
        </label>
        <label>
          <span>Priced on</span>
          <select value={f.product} onChange={e => up({ product: e.target.value })}>
            <option value="">Manual price</option>
            {Object.entries(prices?.keys || {}).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
                {prices?.prices[studioId]?.[k] ? ` · ${money(prices.prices[studioId][k], true)}` : ' · not sold here'}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Discount %</span>
          <input
            type="number"
            min={0}
            max={50}
            value={f.discount}
            onChange={e => up({ discount: n(e.target.value) })}
          />
        </label>
        <label>
          <span>Units (this location)</span>
          <input type="number" min={0} value={f.units} onChange={e => up({ units: n(e.target.value) })} />
        </label>
        <label>
          <span>Price per sale (₹)</span>
          <input type="number" min={0} value={asp} disabled={!!list} onChange={e => up({ asp: n(e.target.value) })} />
        </label>
        <label>
          <span>Window</span>
          <div className="mw-dates-in">
            <input type="date" value={f.validity_start} onChange={e => up({ validity_start: e.target.value })} />
            <input type="date" value={f.validity_end} onChange={e => up({ validity_end: e.target.value })} />
          </div>
        </label>
        <label className="wide">
          <span>Reasoning — why it exists and why the mechanic works</span>
          <textarea rows={4} value={f.rationale} onChange={e => up({ rationale: e.target.value })} />
        </label>
      </div>
      <div className="mw-editor-foot">
        <span>
          Expected <b>{money(asp * f.units, true)}</b> here.{' '}
          {solo
            ? 'Solo mode: saved to this location only and unlinked from the others.'
            : `Copy, mechanic and discount also update in up to ${others} other locations at their own prices; their unit targets stay.`}
        </span>
        <div>
          <Button size="sm" variant="ghost" type="button" onClick={onCancel}>
            Cancel
          </Button>
          <Button size="sm" type="submit" disabled={busy}>
            {busy ? 'Saving…' : solo ? 'Save here only' : 'Save everywhere'}
          </Button>
        </div>
      </div>
    </form>
  );
}

function SectionHead({ icon: Icon, title, hint }: { icon: any; title: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <header className="mw-sh">
      <span className="mw-sh-icon">
        <Icon size={16} />
      </span>
      <h4>{title}</h4>
      {hint && <p>{hint}</p>}
    </header>
  );
}

function Act({ icon: Icon, label, title, text, tone }: any) {
  return (
    <div className={`mw-act mw-act-${tone}`}>
      <Icon size={15} />
      <div>
        <small>{label}</small>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
    </div>
  );
}
