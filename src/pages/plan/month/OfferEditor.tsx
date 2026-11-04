import { useState } from 'react';
import { Copy, Plus, Save, Target, Trash2, X } from 'lucide-react';
import { Button } from '../../../components/ui';
import { money, number } from '../../../types';
import { inline, n, type Prices } from './shared';
import { OFFER_CARD_PHOTOS } from './OfferCard';

export const OFFER_OBJECTIVES = [
  ['acquisition', 'New clients · Acquisition'],
  ['trial_conversion', 'New clients · Trial conversion'],
  ['referral', 'New clients · Referral / duo'],
  ['retention', 'Renewals · Member retention'],
  ['annual_membership', 'Renewals · Annual commitment'],
  ['additional_purchase', 'Renewals · Pack / upsell'],
  ['reactivation', 'Comeback · Lapsed reactivation'],
] as const;

export const OFFER_TYPES = [
  ['percentage', 'Percentage discount'],
  ['fixed_price', 'Fixed campaign tariff'],
  ['value_add', 'Value-add / bonus perk'],
  ['bundle', 'Curated bundle'],
  ['bogo_duo', 'Duo / bring-a-friend'],
  ['referral', 'Referral reward'],
  ['annual', 'Annual tier'],
  ['experience', 'Hosted experience'],
] as const;

export function OfferEditor({
  mode = 'edit',
  offer,
  studioId,
  prices,
  solo,
  others,
  busy,
  onCancel,
  onDelete,
  onSave,
}: {
  mode?: 'edit' | 'create';
  offer: any;
  studioId: number;
  prices: Prices | null;
  solo: boolean;
  others: number;
  busy: boolean;
  onCancel: () => void;
  onDelete?: () => void;
  onSave: (edit: any) => void;
}) {
  const parseList = (v: any): string[] => {
    if (Array.isArray(v)) return v.map(String);
    try {
      return v ? JSON.parse(v) : [];
    } catch {
      return [];
    }
  };
  const pricing = offer.provenance?.pricing || {};
  const [f, setF] = useState({
    name: offer.name || '',
    headline: offer.headline || '',
    benefit: offer.benefit || '',
    objective: offer.objective || 'acquisition',
    offer_type: offer.offer_type || 'percentage',
    plan_slot: offer.plan_slot || '',
    photoKey: offer.provenance?.photoKey || '',
    audience: offer.audience || '',
    excluded_audience: offer.excluded_audience || '',
    redemption_conditions: offer.redemption_conditions || '',
    cta: offer.cta || '',
    customer_copy: offer.customer_copy || '',
    rationale: offer.rationale || '',
    product: pricing.product || '',
    customListPrice: pricing.customListPrice ? Math.round(n(pricing.customListPrice)) : 0,
    discount: Math.round(n(pricing.discount ?? n(offer.effective_discount) / 100) * 100),
    customAsp: Boolean(pricing.customAsp),
    units: n(offer.target_purchases),
    asp: Math.round(n(offer.expected_asp)),
    validity_start: offer.validity_start || '',
    validity_end: offer.validity_end || '',
    success_metrics: parseList(offer.success_metrics),
    risks: parseList(offer.risks),
  });
  const catalogList = f.product ? prices?.prices[studioId]?.[f.product] : null;
  const effectiveList = catalogList ?? (f.customListPrice > 0 ? f.customListPrice : null);
  const computedAsp = effectiveList ? Math.round(effectiveList * (1 - f.discount / 100)) : f.asp;
  const asp = f.customAsp || !effectiveList ? f.asp : computedAsp;
  const savings = effectiveList && asp > 0 && effectiveList > asp ? effectiveList - asp : 0;
  const up = (p: Partial<typeof f>) => setF(x => ({ ...x, ...p }));

  return (
    <form
      className="mw-editor"
      onSubmit={e => {
        e.preventDefault();
        onSave({
          name: f.name.trim(),
          headline: f.headline.trim() || null,
          benefit: f.benefit.trim() || null,
          objective: f.objective,
          offer_type: f.offer_type,
          plan_slot: f.plan_slot || null,
          photoKey: f.photoKey || null,
          audience: f.audience.trim() || null,
          excluded_audience: f.excluded_audience.trim() || null,
          redemption_conditions: f.redemption_conditions.trim() || null,
          cta: f.cta.trim() || null,
          customer_copy: f.customer_copy.trim() || null,
          rationale: f.rationale.trim() || null,
          validity_start: f.validity_start || null,
          validity_end: f.validity_end || null,
          target_purchases: f.units,
          expected_asp: asp,
          success_metrics: f.success_metrics.map(s => s.trim()).filter(Boolean),
          risks: f.risks.map(s => s.trim()).filter(Boolean),
          pricing: {
            product: f.product || null,
            discount: f.discount / 100,
            mechanic: f.benefit,
            customListPrice: !f.product && f.customListPrice > 0 ? f.customListPrice : null,
            customAsp: f.customAsp,
          },
        });
      }}
    >
      <div className="mw-editor-head">
        <div>
          <span className="mw-editor-badge">{mode === 'create' ? 'New offer' : 'Edit offer'}</span>
          <h5>{f.name || (mode === 'create' ? 'Build a new monthly offer' : 'Offer details')}</h5>
        </div>
        <button type="button" className="mw-mini-icon" aria-label="Close editor" onClick={onCancel}>
          <X size={15} />
        </button>
      </div>

      {/* Group 1: Hero & Positioning */}
      <div className="mw-editor-section">
        <span className="mw-editor-sec-title">1 · Hero &amp; positioning</span>
        <div className="mw-editor-grid">
          <label className="wide">
            <span>Offer title</span>
            <input
              value={f.name}
              required
              minLength={3}
              placeholder="e.g. Founding 57: Annual Unlimited"
              onChange={e => up({ name: e.target.value })}
            />
          </label>
          <label>
            <span>Revenue stream &amp; objective</span>
            <select value={f.objective} onChange={e => up({ objective: e.target.value })}>
              {OFFER_OBJECTIVES.map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Primary plan slot</span>
            <select value={f.plan_slot} onChange={e => up({ plan_slot: e.target.value })}>
              <option value="">Additional / general offer</option>
              <option value="newcomer">Newcomer primary slot</option>
              <option value="lapsed">Winback / lapsed primary slot</option>
              <option value="renewal">Renewal primary slot</option>
            </select>
          </label>
          <label>
            <span>Offer mechanism type</span>
            <select value={f.offer_type} onChange={e => up({ offer_type: e.target.value })}>
              {OFFER_TYPES.map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Card hero photography</span>
            <select value={f.photoKey} onChange={e => up({ photoKey: e.target.value })}>
              <option value="">Auto-matched from offer wording</option>
              {OFFER_CARD_PHOTOS.map((p, idx) => (
                <option key={p.url} value={p.url}>
                  Studio frame #{idx + 1} · {p.tags.join(', ')}
                </option>
              ))}
            </select>
          </label>
          <label className="wide">
            <span>Subheadline / commercial hook</span>
            <input
              value={f.headline}
              placeholder="Short one-line hook shown right under the card title"
              onChange={e => up({ headline: e.target.value })}
            />
          </label>
          <label className="wide">
            <span>Value-add / mechanic summary (what the client gets)</span>
            <textarea
              rows={2}
              value={f.benefit}
              placeholder="e.g. 15% off 3-Month Unlimited + 2 complimentary guest passes"
              onChange={e => up({ benefit: e.target.value })}
            />
          </label>
        </div>
      </div>

      {/* Group 2: Pricing & Commercials */}
      <div className="mw-editor-section">
        <span className="mw-editor-sec-title">2 · Pricing &amp; plan forecast</span>
        <div className="mw-editor-grid">
          <label>
            <span>Catalog membership / pack</span>
            <select value={f.product} onChange={e => up({ product: e.target.value, customAsp: false })}>
              <option value="">Custom / manual package</option>
              {Object.entries(prices?.keys || {}).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                  {prices?.prices[studioId]?.[k] ? ` · ${money(prices.prices[studioId][k], true)}` : ' · custom here'}
                </option>
              ))}
            </select>
          </label>
          {!f.product && (
            <label>
              <span>List price / MRP (₹)</span>
              <input
                type="number"
                min={0}
                value={f.customListPrice}
                placeholder="Optional MRP before discount"
                onChange={e => up({ customListPrice: n(e.target.value) })}
              />
            </label>
          )}
          <label>
            <span>Discount %</span>
            <input
              type="number"
              min={0}
              max={50}
              value={f.discount}
              onChange={e => up({ discount: Math.min(50, Math.max(0, n(e.target.value))) })}
            />
          </label>
          <label>
            <span className="mw-editor-inline-check">
              Offer price / ASP (₹)
              {effectiveList ? (
                <small>
                  <input
                    type="checkbox"
                    checked={f.customAsp}
                    onChange={e => up({ customAsp: e.target.checked, asp: computedAsp })}
                  />{' '}
                  Override
                </small>
              ) : null}
            </span>
            <input
              type="number"
              min={0}
              value={asp}
              disabled={Boolean(effectiveList) && !f.customAsp}
              onChange={e => up({ asp: n(e.target.value), customAsp: true })}
            />
          </label>
          <label>
            <span>Planned units (this location)</span>
            <input type="number" min={0} value={f.units} onChange={e => up({ units: n(e.target.value) })} />
          </label>
        </div>
        <div className="mw-editor-preview-strip">
          <div>
            <small>List price</small>
            <b>{effectiveList ? money(effectiveList) : '—'}</b>
          </div>
          <div>
            <small>Offer price</small>
            <b>{asp ? money(asp) : '—'}</b>
          </div>
          <div>
            <small>Client saves</small>
            <b>{savings > 0 ? money(savings) : f.discount > 0 ? `${f.discount}% off` : 'Value-add'}</b>
          </div>
          <div>
            <small>Plan forecast</small>
            <b>{money(asp * f.units, true)}</b>
          </div>
        </div>
      </div>

      {/* Group 3: Operational Details & Guardrails */}
      <div className="mw-editor-section">
        <span className="mw-editor-sec-title">3 · Target cohort, window &amp; guardrails</span>
        <div className="mw-editor-grid">
          <label>
            <span>Target cohort (Who it’s for)</span>
            <input
              value={f.audience}
              placeholder="e.g. First-time studio visitors & trial completers"
              onChange={e => up({ audience: e.target.value })}
            />
          </label>
          <label>
            <span>Valid window</span>
            <div className="mw-dates-in">
              <input type="date" value={f.validity_start} onChange={e => up({ validity_start: e.target.value })} />
              <input type="date" value={f.validity_end} onChange={e => up({ validity_end: e.target.value })} />
            </div>
          </label>
          <label>
            <span>Call to action</span>
            <input
              value={f.cta}
              placeholder="e.g. Claim at reception or book via Momence"
              onChange={e => up({ cta: e.target.value })}
            />
          </label>
          <label>
            <span>Exclusions (Not eligible)</span>
            <input
              value={f.excluded_audience}
              placeholder="e.g. Existing active annual members"
              onChange={e => up({ excluded_audience: e.target.value })}
            />
          </label>
          <label className="wide">
            <span>Terms &amp; guardrails</span>
            <textarea
              rows={2}
              value={f.redemption_conditions}
              placeholder="Redemption rules, stacking policy, validity conditions…"
              onChange={e => up({ redemption_conditions: e.target.value })}
            />
          </label>
        </div>
      </div>

      {/* Group 4: Copy, Rationale, Success Metrics & Risks */}
      <div className="mw-editor-section">
        <span className="mw-editor-sec-title">4 · Copy, rationale, metrics &amp; watch-outs</span>
        <div className="mw-editor-grid">
          <label className="wide">
            <span>Client-facing copy / quote</span>
            <textarea
              rows={2}
              value={f.customer_copy}
              placeholder="Client-facing message used on cards and collateral samples…"
              onChange={e => up({ customer_copy: e.target.value })}
            />
          </label>
          <label className="wide">
            <span>Strategic rationale (Why it works)</span>
            <textarea
              rows={3}
              value={f.rationale}
              placeholder={
                'Why: Converts trial momentum within 72h\nLogic: Protects list rate with added value\nWatch: Enforce newcomer eligibility in Momence'
              }
              onChange={e => up({ rationale: e.target.value })}
            />
          </label>
          <div className="mw-editor-list-col">
            <span>Success metrics</span>
            <div className="mw-list-editor">
              {f.success_metrics.map((m, i) => (
                <div key={i} className="mw-list-editor-row">
                  <input
                    value={m}
                    placeholder="KPI or target metric…"
                    onChange={e =>
                      up({ success_metrics: f.success_metrics.map((x, idx) => (idx === i ? e.target.value : x)) })
                    }
                  />
                  <button
                    type="button"
                    aria-label="Remove success metric"
                    onClick={() => up({ success_metrics: f.success_metrics.filter((_, idx) => idx !== i) })}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="mw-mini-btn"
                onClick={() => up({ success_metrics: [...f.success_metrics, ''] })}
              >
                <Plus size={11} /> Add metric
              </button>
            </div>
          </div>
          <div className="mw-editor-list-col">
            <span>Risks &amp; assumptions</span>
            <div className="mw-list-editor">
              {f.risks.map((r, i) => (
                <div key={i} className="mw-list-editor-row">
                  <input
                    value={r}
                    placeholder="Guardrail or assumption…"
                    onChange={e => up({ risks: f.risks.map((x, idx) => (idx === i ? e.target.value : x)) })}
                  />
                  <button
                    type="button"
                    aria-label="Remove risk"
                    onClick={() => up({ risks: f.risks.filter((_, idx) => idx !== i) })}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
              <button type="button" className="mw-mini-btn" onClick={() => up({ risks: [...f.risks, ''] })}>
                <Plus size={11} /> Add risk
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mw-editor-foot">
        <span>
          Expected <b>{money(asp * f.units, true)}</b> here.{' '}
          {solo
            ? 'Solo mode: saved to this location only and unlinked from the others.'
            : `Mirrors across up to ${others} other locations at their local prices unless Solo mode is enabled.`}
        </span>
        <div className="mw-editor-foot-btns">
          {mode === 'edit' && onDelete && (
            <Button
              size="sm"
              variant="ghost"
              type="button"
              disabled={busy}
              icon={<Trash2 size={13} />}
              onClick={onDelete}
            >
              Delete offer
            </Button>
          )}
          <Button size="sm" variant="ghost" type="button" onClick={onCancel}>
            Cancel
          </Button>
          <Button size="sm" type="submit" disabled={busy}>
            {busy
              ? 'Saving…'
              : mode === 'create'
                ? solo
                  ? 'Create here only'
                  : 'Create everywhere'
                : solo
                  ? 'Save here only'
                  : 'Save everywhere'}
          </Button>
        </div>
      </div>
    </form>
  );
}
