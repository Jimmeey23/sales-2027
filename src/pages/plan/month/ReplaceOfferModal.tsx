import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeftRight, Loader2, Search, Sparkles, X } from 'lucide-react';
import { api } from '../../../api';
import { MONTHS, money, number } from '../../../types';
import { forecastRevenue } from '../../../lib/forecast';

/* Replace one offer. The studio's bank is listed (same job first), and Claude picks the best
   1–3 bank alternates and, where the bank is thin, drafts fresh offers for the same job. */

type Fresh = {
  name: string;
  headline: string;
  benefit: string;
  audience: string;
  offer_type: string;
  objective: string;
  expected_asp: number;
  target_purchases: number;
  discount_percent: number;
  redemption_conditions: string;
  why: string;
};
type Suggest = { summary: string; picks: { offerId: number; why: string }[]; fresh: Fresh[] };

const lakh = (v: number) => `₹${(Math.max(0, v) / 100000).toLocaleString('en-IN', { maximumFractionDigits: 1 })}L`;

export function ReplaceOfferModal({
  offer,
  bank,
  month,
  year,
  theme,
  busy,
  onPick,
  onCreate,
  onClose,
}: {
  offer: any;
  bank: any[];
  month: number;
  year: number;
  theme?: string;
  busy: boolean;
  onPick: (incoming: any) => Promise<void> | void;
  onCreate: (fresh: Fresh) => Promise<void> | void;
  onClose: () => void;
}) {
  const [q, setQ] = useState('');
  const [ai, setAi] = useState<Suggest | null>(null);
  const [aiErr, setAiErr] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(true);

  // Same job first, then by forecast revenue.
  const ranked = useMemo(() => {
    const same = (o: any) => (o.objective && o.objective === offer.objective) || (o.plan_slot && o.plan_slot === offer.plan_slot);
    return [...bank].sort((a, b) => Number(same(b)) - Number(same(a)) || forecastRevenue(b) - forecastRevenue(a));
  }, [bank, offer]);
  const shown = ranked.filter(o =>
    !q.trim() ? true : `${o.name} ${o.headline || ''} ${o.audience || ''} ${o.offer_type || ''}`.toLowerCase().includes(q.toLowerCase()),
  );
  const byId = useMemo(() => new Map(bank.map(o => [o.id, o])), [bank]);

  useEffect(() => {
    let live = true;
    setAiBusy(true);
    api<Suggest>('/copilot/replace-suggestions', {
      method: 'POST',
      body: JSON.stringify({ offerId: offer.id, candidateIds: ranked.slice(0, 60).map(o => o.id), month, year, theme }),
    })
      .then(r => live && setAi(r))
      .catch(e => live && setAiErr(e.message))
      .finally(() => live && setAiBusy(false));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offer.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const current = forecastRevenue(offer);
  const delta = (o: any) => {
    const d = forecastRevenue(o) - current;
    return d === 0 ? '±₹0' : `${d > 0 ? '+' : '−'}${lakh(Math.abs(d))}`;
  };

  // Rendered at the page root: the month window is a transformed container that would clip it.
  return createPortal(
    <div className="rom-scrim" role="presentation" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="rom" role="dialog" aria-modal="true" aria-label={`Replace ${offer.name}`}>
        <header className="rom-head">
          <div>
            <span className="rom-eyebrow">
              <ArrowLeftRight size={12} /> Replace offer · {MONTHS[month - 1]} {year}
            </span>
            <h3>{offer.name}</h3>
            <p>
              {lakh(current)} forecast · {offer.target_purchases ? `${number(offer.target_purchases)} buyers` : 'no buyer target'}
              {offer.expected_asp ? ` · ${money(offer.expected_asp)}` : ''}
            </p>
          </div>
          <button type="button" className="rom-x" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </header>

        <section className="rom-ai">
          <h4>
            <Sparkles size={13} /> Recommended by AI
          </h4>
          {aiBusy && (
            <p className="rom-muted">
              <Loader2 size={13} className="spin" /> Reading the bank and the month…
            </p>
          )}
          {aiErr && <p className="rom-muted">{aiErr}</p>}
          {ai && (
            <>
              {ai.summary && <p className="rom-summary">{ai.summary}</p>}
              <div className="rom-grid">
                {ai.picks.map(p => {
                  const o = byId.get(p.offerId);
                  if (!o) return null;
                  return (
                    <article key={o.id} className="rom-card is-ai">
                      <span className="rom-tag">From bank</span>
                      <strong>{o.name}</strong>
                      {o.headline && <span className="rom-line">{o.headline}</span>}
                      <span className="rom-figs">
                        {lakh(forecastRevenue(o))} <em className={forecastRevenue(o) >= current ? 'is-up' : 'is-down'}>{delta(o)}</em>
                      </span>
                      <p>{p.why}</p>
                      <button type="button" disabled={busy} onClick={() => onPick(o)}>
                        Use this
                      </button>
                    </article>
                  );
                })}
                {ai.fresh.map((f, i) => (
                  <article key={`f${i}`} className="rom-card is-fresh">
                    <span className="rom-tag">New idea</span>
                    <strong>{f.name}</strong>
                    <span className="rom-line">{f.headline}</span>
                    <span className="rom-figs">
                      {lakh(f.expected_asp * f.target_purchases)} · {money(f.expected_asp)} × {number(f.target_purchases)}
                      {f.discount_percent ? ` · ${f.discount_percent}% off` : ''}
                    </span>
                    <p>{f.why}</p>
                    <button type="button" disabled={busy} onClick={() => onCreate(f)}>
                      Create &amp; use
                    </button>
                  </article>
                ))}
                {!ai.picks.length && !ai.fresh.length && <p className="rom-muted">No stronger option found.</p>}
              </div>
            </>
          )}
        </section>

        <section className="rom-bank">
          <div className="rom-bank-head">
            <h4>Offer bank · {bank.length}</h4>
            <label className="rom-search">
              <Search size={13} />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, audience, type…" />
            </label>
          </div>
          <ul>
            {shown.slice(0, 60).map(o => (
              <li key={o.id}>
                <div>
                  <strong>{o.name}</strong>
                  <span>{[o.objective?.replace(/_/g, ' '), o.offer_type, o.audience].filter(Boolean).join(' · ')}</span>
                </div>
                <span className="rom-figs">
                  {lakh(forecastRevenue(o))} <em className={forecastRevenue(o) >= current ? 'is-up' : 'is-down'}>{delta(o)}</em>
                </span>
                <button type="button" disabled={busy} onClick={() => onPick(o)}>
                  Replace
                </button>
              </li>
            ))}
            {!shown.length && <li className="rom-muted">No bank offers match.</li>}
          </ul>
        </section>
      </div>
    </div>,
    document.body,
  );
}
