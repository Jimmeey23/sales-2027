import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRightLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Library,
  Pin,
  PinOff,
  Plus,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { api, post } from '../api';
import { useApp } from '../App';
import { useLoad } from '../hooks';
import { LoadingRows } from './ui';
import { MONTHS, MONTHS_SHORT, money, number, percent, titleCase } from '../types';
import { selectedInMonth } from '../pages/plan/TargetsTab';
import type { PlanData } from '../pages/plan/usePlanData';

/* ─────────────────────────────────────────────────────────────────────────────
   The offer bank, standing beside the offer studio.

   It is open when you arrive, folds away to a spine as soon as the pointer
   leaves it, and comes back the moment you hover or tab into it — so the plan
   keeps the whole screen until you actually want the bank. Offers can be put
   into a month's plan, or swapped for one already on the plan, without leaving
   the page.
   ──────────────────────────────────────────────────────────────────────────── */

type BankOffer = {
  id: number;
  name: string;
  studio?: string;
  objective?: string;
  offer_type?: string;
  effective_discount?: number | null;
  expected_revenue?: number | null;
  actual_revenue?: number | null;
  status?: string;
  audience?: string;
  provenance?: any;
};

export default function OfferBankRail({
  data,
  reload,
  month,
  onMonth,
}: {
  data: PlanData;
  reload: () => Promise<any>;
  month: number;
  onMonth: (month: number) => void;
}) {
  const { boot, studioId, year, toast, can } = useApp();
  const [open, setOpen] = useState(true);
  const [pinned, setPinned] = useState(false);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState<number | null>(null);
  const [swapFor, setSwapFor] = useState<BankOffer | null>(null);

  const studio =
    boot.studios.find(s => s.id === studioId) ||
    (studioId ? undefined : undefined) ||
    boot.studios.find(s => s.id === 1) ||
    boot.studios[0];

  const query = new URLSearchParams({ bank: '1', year: String(year), limit: '60' });
  if (studioId) query.set('studio', String(studioId));
  const {
    data: bank,
    loading,
    reload: reloadBank,
  } = useLoad<{ rows: BankOffer[]; total: number }>(() => api(`/offers?${query.toString()}`), [studioId, year]);

  const onPlan = useMemo(() => {
    const rows = selectedInMonth(data, month) as any[];
    return rows.map(o => ({ id: Number(o.id), name: o.name }));
  }, [data, month]);
  const onPlanIds = useMemo(() => new Set(onPlan.map(o => o.id)), [onPlan]);

  const rows = useMemo(() => {
    const all = bank?.rows || [];
    const needle = q.trim().toLowerCase();
    return [...all]
      .filter(o => !onPlanIds.has(Number(o.id)))
      .filter(o => !needle || `${o.name} ${o.studio} ${o.objective} ${o.audience || ''}`.toLowerCase().includes(needle))
      .sort((a, b) => Number(!!b.provenance?.recommended) - Number(!!a.provenance?.recommended))
      .slice(0, 40);
  }, [bank, q, onPlanIds]);

  // Auto-hide: pinned keeps it open; otherwise the rail folds the moment the pointer leaves.
  const leave = () => {
    if (!pinned) setOpen(false);
  };
  useEffect(() => {
    if (pinned) setOpen(true);
  }, [pinned]);

  const editable = can('target_edit') || can('offer_edit');

  const send = async (offer: BankOffer, op: 'add' | 'replace', replaceId?: number) => {
    if (!studio) return;
    setBusy(offer.id);
    try {
      await post(`/studio-plans/${studio.id}/${year}/${month}/offers`, { op: 'add', offerId: offer.id, solo: false });
      if (op === 'replace' && replaceId) {
        await post(`/studio-plans/${studio.id}/${year}/${month}/offers`, {
          op: 'remove',
          offerId: replaceId,
          solo: false,
        });
      }
      await reload();
      await reloadBank();
      toast(
        op === 'replace'
          ? `“${offer.name}” took the place of the offer you picked in ${MONTHS[month - 1]}.`
          : `“${offer.name}” added to ${MONTHS[month - 1]} — mirrored across locations.`,
      );
      setSwapFor(null);
    } catch (error: any) {
      toast(error.message || 'Could not change this month’s offers.', 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <aside
      className={`bank-rail${open ? ' is-open' : ''}${pinned ? ' is-pinned' : ''}`}
      aria-label="Offer bank"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={leave}
      onFocusCapture={() => setOpen(true)}
    >
      <button
        type="button"
        className="bank-spine"
        aria-label={open ? 'Fold the offer bank' : 'Open the offer bank'}
        aria-expanded={open}
        tabIndex={open ? -1 : 0}
        onClick={() => setOpen(v => !v)}
      >
        <Library size={15} />
        <span>Offer bank</span>
        <em>{bank?.total ?? ''}</em>
      </button>

      <div className="bank-panel" aria-hidden={!open} inert={!open}>
        <header className="bank-head">
          <div>
            <span className="bank-eyebrow">Offer bank</span>
            <strong>
              {month ? MONTHS[month - 1] : 'This year'} · {studio?.name || 'All studios'}
            </strong>
          </div>
          <div className="bank-head-actions">
            <button
              type="button"
              className={`bank-pin${pinned ? ' is-on' : ''}`}
              title={pinned ? 'Unpin — fold when the pointer leaves' : 'Pin open'}
              aria-pressed={pinned}
              onClick={() => setPinned(p => !p)}
            >
              {pinned ? <Pin size={13} /> : <PinOff size={13} />}
            </button>
            <button
              type="button"
              className="bank-pin"
              title="Fold"
              aria-label="Fold the offer bank"
              onClick={() => setOpen(false)}
            >
              <X size={13} />
            </button>
          </div>
        </header>

        <div className="bank-months" role="tablist" aria-label="Month to add into">
          <button
            type="button"
            className="bank-month-step"
            onClick={() => onMonth(month > 1 ? month - 1 : 12)}
            aria-label="Previous month"
          >
            <ChevronLeft size={12} />
          </button>
          <span className="bank-month-now">{MONTHS_SHORT[month - 1]}</span>
          <button
            type="button"
            className="bank-month-step"
            onClick={() => onMonth(month < 12 ? month + 1 : 1)}
            aria-label="Next month"
          >
            <ChevronRight size={12} />
          </button>
          <small>{onPlan.length} on the plan</small>
        </div>

        <label className="bank-search">
          <Search size={13} />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search the bank"
            aria-label="Search the offer bank"
          />
        </label>

        <div className="bank-list">
          {loading && !bank ? (
            <LoadingRows rows={3} />
          ) : rows.length === 0 ? (
            <p className="bank-empty">
              {q ? 'Nothing matches that search.' : 'Every matching offer is already on this month.'}
            </p>
          ) : (
            rows.map(offer => {
              const discount = Number(offer.effective_discount) || 0;
              const revenue = Number(offer.actual_revenue ?? offer.expected_revenue) || 0;
              const isSwapping = swapFor?.id === offer.id;
              return (
                <article key={offer.id} className={`bank-card${isSwapping ? ' is-swapping' : ''}`}>
                  <div className="bank-card-top">
                    <span className="bank-card-kicker">
                      {offer.provenance?.recommended && (
                        <b>
                          <Sparkles size={10} /> Pick
                        </b>
                      )}
                      {titleCase(offer.objective || '')}
                    </span>
                    <span className="bank-card-studio">{offer.studio || 'All studios'}</span>
                  </div>
                  <strong className="bank-card-name">{offer.name}</strong>
                  <div className="bank-card-facts">
                    <span>
                      <b>{discount > 0 ? percent(discount) : '—'}</b> off
                    </span>
                    <span>
                      <b>{revenue ? money(revenue, true) : '—'}</b> forecast
                    </span>
                    <span>{titleCase(offer.offer_type || '')}</span>
                  </div>

                  {isSwapping ? (
                    <div className="bank-swap">
                      <span>Replace which offer in {MONTHS[month - 1]}?</span>
                      {onPlan.length === 0 && <em>Nothing is on this month yet — add it instead.</em>}
                      {onPlan.map(item => (
                        <button
                          key={item.id}
                          type="button"
                          disabled={busy !== null}
                          onClick={() => send(offer, 'replace', item.id)}
                        >
                          <ArrowRightLeft size={11} />
                          {item.name}
                        </button>
                      ))}
                      <button type="button" className="bank-swap-cancel" onClick={() => setSwapFor(null)}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="bank-card-actions">
                      <button
                        type="button"
                        className="bank-add"
                        disabled={!editable || busy !== null}
                        title={`Add ${offer.name} to ${MONTHS[month - 1]}`}
                        onClick={() => send(offer, 'add')}
                      >
                        {busy === offer.id ? <Check size={12} /> : <Plus size={12} />}
                        Add to {MONTHS_SHORT[month - 1]}
                      </button>
                      <button
                        type="button"
                        className="bank-replace"
                        disabled={!editable || onPlan.length === 0 || busy !== null}
                        title="Swap this offer in for one already on the month"
                        onClick={() => setSwapFor(offer)}
                      >
                        <ArrowRightLeft size={12} />
                        Replace
                      </button>
                    </div>
                  )}
                </article>
              );
            })
          )}
        </div>

        <footer className="bank-foot">
          <span>{bank?.total ? `${number(bank.total)} in the bank` : 'Bank'}</span>
          <span className="bank-foot-note">Hover the spine to open</span>
        </footer>
      </div>
    </aside>
  );
}
