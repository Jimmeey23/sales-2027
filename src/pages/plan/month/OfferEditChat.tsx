import React, { useEffect, useRef, useState } from 'react';
import { Check, MessageSquare, Send, X } from 'lucide-react';
import { api } from '../../../api';
import { Button } from '../../../components/ui';
import { MONTHS, money } from '../../../types';
import { announceChange } from '../../../lib/copilotActions';

/* Chat with the copilot to change one offer or every offer in the month. The copilot only
   proposes; each change is shown as before → after and saved through the normal offer update,
   so pricing, policy and audit rules still run. */

type Msg = { role: 'user' | 'assistant'; content: string; edits?: Edit[]; applied?: number[] };
type Edit = { offerId: number; changes: Record<string, any>; why: string };

const LABELS: Record<string, string> = {
  name: 'Name',
  headline: 'Headline',
  benefit: 'Benefit',
  customer_copy: 'Customer copy',
  audience: 'Audience',
  cta: 'Call to action',
  redemption_conditions: 'Conditions',
  validity_start: 'Starts',
  validity_end: 'Ends',
  target_purchases: 'Buyers target',
  expected_asp: 'Price',
  pricing: 'Discount',
};

const show = (key: string, value: any) => {
  if (value === null || value === undefined || value === '') return '—';
  if (key === 'expected_asp') return money(Number(value));
  if (key === 'pricing') return typeof value?.discount === 'number' ? `${Math.round(value.discount * 1000) / 10}% off` : '—';
  return String(value);
};
const current = (offer: any, key: string) =>
  key === 'pricing' ? { discount: offer?.provenance?.pricing?.discount } : offer?.[key];

export function OfferEditChat({
  offers,
  month,
  year,
  studioName,
  theme,
  objective,
  target,
  focusId,
  onApply,
  onClose,
}: {
  offers: any[];
  month: number;
  year: number;
  studioName: string;
  theme?: string;
  objective?: string;
  target?: number;
  focusId?: number | null;
  onApply: (offerId: number, changes: Record<string, any>, name: string) => Promise<boolean>;
  onClose: () => void;
}) {
  const [scope, setScope] = useState<string>(focusId ? String(focusId) : 'all');
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (focusId) setScope(String(focusId));
  }, [focusId]);
  useEffect(() => {
    const node = end.current;
    if (node && typeof node.scrollIntoView === 'function') node.scrollIntoView({ block: 'end' });
  }, [msgs]);

  const byId = new Map(offers.map(o => [o.id, o]));
  const targetIds = scope === 'all' ? offers.map(o => o.id) : [Number(scope)];

  const send = async () => {
    const message = input.trim();
    if (!message || busy || !targetIds.length) return;
    const history = msgs.map(m => ({ role: m.role, content: m.content }));
    setMsgs(m => [...m, { role: 'user', content: message }]);
    setInput('');
    setBusy(true);
    try {
      const r = await api<{ reply: string; edits: Edit[] }>('/copilot/offer-edit', {
        method: 'POST',
        body: JSON.stringify({ message, offerIds: targetIds, history, month, year, studio: studioName, theme, objective, target }),
      });
      setMsgs(m => [...m, { role: 'assistant', content: r.reply, edits: r.edits, applied: [] }]);
    } catch (e: any) {
      setMsgs(m => [...m, { role: 'assistant', content: e.message || 'Copilot could not answer.' }]);
    } finally {
      setBusy(false);
    }
  };

  // Approved offers ask first; the planner's yes covers every approved offer in the batch.
  const apply = async (index: number, edits: Edit[]) => {
    const locked = edits.map(e => byId.get(e.offerId)).filter(o => o?.approval_status === 'approved');
    if (
      locked.length &&
      !window.confirm(
        `${locked.length === 1 ? `“${locked[0].name}” is` : `${locked.length} offers are`} already approved.\n\nApply the copilot's changes anyway? ${locked.length === 1 ? 'It' : 'They'} will be re-approved with the new terms.`,
      )
    )
      return;
    setBusy(true);
    const done: number[] = [];
    for (const edit of edits) {
      const offer = byId.get(edit.offerId);
      const ok = await onApply(edit.offerId, edit.changes, offer?.name || 'Offer');
      if (ok && offer?.approval_status === 'approved') {
        try {
          await api(`/offers/${edit.offerId}/action`, { method: 'POST', body: JSON.stringify({ action: 'approve' }) });
        } catch {
          /* stays pending; the card shows it */
        }
      }
      if (ok) done.push(edit.offerId);
    }
    setBusy(false);
    if (done.length) {
      setMsgs(m => m.map((x, i) => (i === index ? { ...x, applied: [...(x.applied || []), ...done] } : x)));
      announceChange();
    }
  };

  return (
    <aside className="oec" aria-label="Edit offers with copilot">
      <header className="oec-head">
        <span className="oec-title">
          <MessageSquare size={14} /> Edit with copilot
        </span>
        <select value={scope} onChange={e => setScope(e.target.value)} aria-label="Which offers to edit">
          <option value="all">All {MONTHS[month - 1]} offers ({offers.length})</option>
          {offers.map(o => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
        <button type="button" className="oec-close" onClick={onClose} aria-label="Close">
          <X size={14} />
        </button>
      </header>

      <div className="oec-log">
        {!msgs.length && (
          <p className="oec-hint">
            Tell the copilot what to change — e.g. “drop the discount to 12%”, “make conditions one per client, new
            members only”, “rewrite the headline for Diwali”, or “raise every buyer target by 10%”.
          </p>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={`oec-msg is-${m.role}`}>
            <p>{m.content}</p>
            {m.edits?.map(edit => {
              const offer = byId.get(edit.offerId);
              const done = m.applied?.includes(edit.offerId);
              return (
                <div key={edit.offerId} className="oec-edit">
                  <strong>{offer?.name || `Offer #${edit.offerId}`}</strong>
                  <ul>
                    {Object.entries(edit.changes).map(([k, v]) => (
                      <li key={k}>
                        <span>{LABELS[k] || k}</span>
                        <s>{show(k, current(offer, k))}</s>
                        <b>{show(k, v)}</b>
                      </li>
                    ))}
                  </ul>
                  {edit.why && <em>{edit.why}</em>}
                  <Button variant={done ? 'ghost' : 'primary'} disabled={busy || done} onClick={() => apply(i, [edit])}>
                    {done ? (
                      <>
                        <Check size={12} /> Applied
                      </>
                    ) : offer?.approval_status === 'approved' ? (
                      'Apply (approved — asks first)'
                    ) : (
                      'Apply'
                    )}
                  </Button>
                </div>
              );
            })}
            {(() => {
              const left = (m.edits || []).filter(e => !m.applied?.includes(e.offerId));
              return left.length > 1 ? (
                <Button variant="dark" disabled={busy} onClick={() => apply(i, left)}>
                  Apply all {left.length} changes
                </Button>
              ) : null;
            })()}
          </div>
        ))}
        {busy && <div className="oec-msg is-assistant is-typing">Thinking…</div>}
        <div ref={end} />
      </div>

      <form
        className="oec-input"
        onSubmit={e => {
          e.preventDefault();
          send();
        }}
      >
        <textarea
          value={input}
          maxLength={2000}
          rows={2}
          placeholder={scope === 'all' ? `Change all ${MONTHS[month - 1]} offers…` : `Change ${byId.get(Number(scope))?.name || 'this offer'}…`}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        <button type="submit" disabled={busy || !input.trim()} aria-label="Send">
          <Send size={14} />
        </button>
      </form>
    </aside>
  );
}
