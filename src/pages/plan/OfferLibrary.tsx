import React, { useMemo, useState } from 'react';
import { CheckCircle2, ChevronDown, Plus, RefreshCcw, Search, SlidersHorizontal, X } from 'lucide-react';
import { lakh } from './usePlanData';

/* The offer library: every other offer this location could run, docked beside the month's
   own cards so adding one is a single decision rather than a round trip through a drawer.
   It scrolls on its own — the month column keeps its place — and carries the controls a
   library of a hundred and sixty offers needs: search, audience, membership, sort, and two
   filters for the states that actually change what you can do with an offer. */

export interface LibraryOffer {
  id: number;
  name?: string | null;
  benefit?: string | null;
  headline?: string | null;
  offer_type?: string | null;
  objective?: string | null;
  audience?: string | null;
  plan_slot?: string | null;
  approval_status?: string | null;
  expected_revenue?: number | string | null;
  expected_asp?: number | string | null;
  target_purchases?: number | string | null;
  effective_discount?: number | string | null;
  redemption_conditions?: string | null;
  rationale?: string | null;
  customer_copy?: string | null;
  provenance?: { pricing?: { product?: string | null } | null } | null;
}

type Scope = 'all' | 'newcomer' | 'lapsed' | 'renewal';
type Sort = 'relevant' | 'revenue' | 'ticket' | 'name';

const num = (v: unknown) => {
  const parsed = Number(v);
  return Number.isFinite(parsed) ? parsed : 0;
};
const titleCase = (v: string) => v.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const SCOPE_LABELS: Array<[Scope, string]> = [
  ['all', 'All'],
  ['newcomer', 'Newcomer'],
  ['lapsed', 'Winback'],
  ['renewal', 'Renewal'],
];

const SORTS: Array<[Sort, string]> = [
  ['relevant', 'Most relevant'],
  ['revenue', 'Revenue, high to low'],
  ['ticket', 'Best average ticket'],
  ['name', 'A to Z'],
];

/** Offers without a recorded pricing product are matched to a membership from their wording. */
function membershipKey(o: LibraryOffer) {
  if (o.provenance?.pricing?.product) return o.provenance.pricing.product;
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
}

export default function OfferLibrary({
  offers,
  month,
  selected,
  editable,
  busy,
  labels,
  isRecommended,
  alternateFor,
  photoFor,
  onAdd,
  onSwap,
  onClose,
}: {
  offers: LibraryOffer[];
  month: number;
  selected: Array<{ id: number; name?: string | null; approval_status?: string | null }>;
  editable: boolean;
  busy: boolean;
  labels: Record<string, string>;
  isRecommended: (o: any, month: number) => boolean;
  alternateFor: (o: any, month: number) => { for: string } | null | undefined;
  photoFor: (o: any, index: number) => { url: string; pos: string };
  onAdd: (o: any) => void;
  onSwap: (currentId: number, o: any) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<Scope>('all');
  const [sort, setSort] = useState<Sort>('relevant');
  const [alternatesOnly, setAlternatesOnly] = useState(false);
  const [bigOnly, setBigOnly] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);
  const [advanced, setAdvanced] = useState(false);

  const filtering = scope !== 'all' || alternatesOnly || bigOnly || query.trim().length > 0;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = offers.filter(o => {
      if (
        scope === 'newcomer' &&
        o.plan_slot !== 'newcomer' &&
        !['acquisition', 'trial_conversion', 'new_client', 'referral'].includes(o.objective || '')
      )
        return false;
      if (scope === 'lapsed' && o.plan_slot !== 'lapsed' && o.objective !== 'reactivation') return false;
      if (
        scope === 'renewal' &&
        o.plan_slot !== 'renewal' &&
        !['retention', 'annual_membership', 'additional_purchase', 'aov'].includes(o.objective || '')
      )
        return false;
      if (alternatesOnly && !alternateFor(o, month)) return false;
      if (bigOnly && num(o.expected_revenue) < 500000) return false;
      if (!q) return true;
      const hay =
        `${o.name || ''} ${o.benefit || ''} ${o.headline || ''} ${o.audience || ''} ${o.offer_type || ''}`.toLowerCase();
      return q.split(/\s+/).every(t => hay.includes(t));
    });
    if (sort === 'revenue') return [...list].sort((a, b) => num(b.expected_revenue) - num(a.expected_revenue));
    if (sort === 'ticket') return [...list].sort((a, b) => num(b.expected_asp) - num(a.expected_asp));
    if (sort === 'name') return [...list].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    return list;
  }, [offers, query, scope, sort, alternatesOnly, bigOnly, alternateFor, month]);

  /* Grouped by the membership the offer prices against, in the order the price list runs —
     the same shape the studio thinks in when it asks "what else can I sell on a 3-month?". */
  const groups = useMemo(() => {
    const map = new Map<string, LibraryOffer[]>();
    for (const o of filtered) {
      const key = membershipKey(o);
      const label = key ? labels[key] || key : 'Other offers';
      const list = map.get(label) || [];
      list.push(o);
      map.set(label, list);
    }
    const order = Object.values(labels);
    return [...map.entries()].sort((a, b) => {
      const ia = order.indexOf(a[0]);
      const ib = order.indexOf(b[0]);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
  }, [filtered, labels]);

  const reset = () => {
    setQuery('');
    setScope('all');
    setSort('relevant');
    setAlternatesOnly(false);
    setBigOnly(false);
  };

  return (
    <div className="olib">
      <header className="olib-head">
        <div className="olib-title">
          <span className="olib-kicker">
            <i aria-hidden="true" />
            Offer library
          </span>
          <strong>
            {filtering ? `${filtered.length} of ${offers.length}` : offers.length}
            <em>{offers.length === 1 ? 'offer' : 'offers'} to run</em>
          </strong>
        </div>
        <button type="button" className="olib-close" onClick={onClose} aria-label="Hide the offer library">
          <X size={15} />
        </button>
      </header>

      <div className="olib-controls">
        <div className="olib-search">
          <Search size={14} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search offers, audiences, conditions…"
            aria-label="Search the offer library"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} aria-label="Clear library search">
              <X size={12} />
            </button>
          )}
        </div>

        <div className="olib-scopes" role="group" aria-label="Audience">
          {SCOPE_LABELS.map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={scope === id}
              className={scope === id ? 'is-on' : ''}
              onClick={() => setScope(id)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="olib-row">
          <select
            className="olib-sort"
            value={sort}
            onChange={e => setSort(e.target.value as Sort)}
            aria-label="Sort the library"
          >
            {SORTS.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className={`olib-advanced${advanced ? ' is-on' : ''}`}
            aria-expanded={advanced}
            onClick={() => setAdvanced(v => !v)}
            title="More filters"
          >
            <SlidersHorizontal size={13} />
            Filters
            {(alternatesOnly || bigOnly) && <i />}
          </button>
        </div>

        {advanced && (
          <div className="olib-toggles">
            <button
              type="button"
              aria-pressed={alternatesOnly}
              className={alternatesOnly ? 'is-on' : ''}
              onClick={() => setAlternatesOnly(v => !v)}
            >
              Swappable only
            </button>
            <button
              type="button"
              aria-pressed={bigOnly}
              className={bigOnly ? 'is-on' : ''}
              onClick={() => setBigOnly(v => !v)}
            >
              ₹5L or more
            </button>
            {filtering && (
              <button type="button" className="olib-reset" onClick={reset}>
                Reset
              </button>
            )}
          </div>
        )}
      </div>

      <div className="olib-list">
        {!offers.length && <p className="olib-empty">No other offers for this location yet.</p>}
        {!!offers.length && !filtered.length && (
          <p className="olib-empty">
            Nothing matches{query ? ` “${query}”` : ''}.{' '}
            <button type="button" onClick={reset}>
              Clear filters
            </button>
          </p>
        )}

        {groups.map(([group, list]) => (
          <section key={group} className="olib-group">
            <h5>
              {group}
              <em>{list.length}</em>
            </h5>
            {list.map((o, idx) => {
              const approved = o.approval_status === 'approved';
              const open = openId === o.id;
              const photo = photoFor(o, idx);
              const slotText = o.plan_slot
                ? o.plan_slot === 'lapsed'
                  ? 'Winback'
                  : titleCase(o.plan_slot)
                : 'Any audience';
              return (
                <article key={o.id} className={`olib-row-item${open ? ' is-open' : ''}`}>
                  <button
                    type="button"
                    className="olib-main"
                    aria-expanded={open}
                    onClick={() => setOpenId(open ? null : o.id)}
                  >
                    <span
                      className="olib-thumb"
                      style={{ backgroundImage: `url(${photo.url})`, backgroundPosition: photo.pos }}
                      aria-hidden="true"
                    />
                    <span className="olib-copy">
                      <span className="olib-tags">
                        {slotText}
                        {approved && <b>Approved</b>}
                        {isRecommended(o, month) && <b className="is-rec">Recommended</b>}
                      </span>
                      <strong>{o.name}</strong>
                      <em>{o.headline || o.benefit || titleCase(o.offer_type || 'Offer')}</em>
                    </span>
                    <span className="olib-side">
                      <b>{lakh(num(o.expected_revenue))}</b>
                      <ChevronDown size={13} className={open ? 'is-flipped' : undefined} />
                    </span>
                  </button>

                  {open && (
                    <div className="olib-detail">
                      {(o.rationale || o.customer_copy) && (
                        <p>
                          {String(o.rationale || o.customer_copy)
                            .split('\n')[0]
                            .replace(/^Why: /, '')}
                        </p>
                      )}
                      <dl>
                        <div>
                          <dt>Audience</dt>
                          <dd>{o.audience || '—'}</dd>
                        </div>
                        <div>
                          <dt>Value</dt>
                          <dd>
                            {num(o.effective_discount)
                              ? `${num(o.effective_discount).toFixed(0)}% effective`
                              : 'At list'}
                          </dd>
                        </div>
                        <div>
                          <dt>Avg ticket</dt>
                          <dd>{num(o.expected_asp) ? lakh(num(o.expected_asp)) : '—'}</dd>
                        </div>
                        <div>
                          <dt>Buyers</dt>
                          <dd>{o.target_purchases || '—'}</dd>
                        </div>
                      </dl>
                      {o.redemption_conditions && <p className="olib-fine">{o.redemption_conditions}</p>}
                      {editable && !approved && (
                        <div className="olib-actions">
                          <button type="button" className="olib-add" disabled={busy} onClick={() => onAdd(o)}>
                            <Plus size={13} /> Add to month
                          </button>
                          {selected.length > 0 && (
                            <label className="olib-swap" title="Swap this offer in for one of the month's cards">
                              <RefreshCcw size={12} />
                              <select
                                aria-label={`Replace an offer with ${o.name}`}
                                disabled={busy}
                                value=""
                                onChange={e => onSwap(Number(e.target.value), o)}
                              >
                                <option value="" disabled>
                                  Swap for…
                                </option>
                                {selected.map(cur => (
                                  <option key={cur.id} value={cur.id} disabled={cur.approval_status === 'approved'}>
                                    {cur.name}
                                  </option>
                                ))}
                              </select>
                            </label>
                          )}
                        </div>
                      )}
                      {approved && (
                        <span className="olib-approved">
                          <CheckCircle2 size={12} /> Approved — reopen the month to swap it.
                        </span>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </section>
        ))}
      </div>
    </div>
  );
}
