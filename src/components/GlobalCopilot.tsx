import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useLocation } from 'react-router-dom';
import { Check, Send, Sparkles, X } from 'lucide-react';
import { api } from '../api';
import { useApp } from '../App';
import {
  announceChange,
  applyAction,
  consentText,
  describeAction,
  getCopilotScope,
  subscribeCopilotScope,
  type CopilotAction,
} from '../lib/copilotActions';

/* The copilot, on every page. Ask it anything about the plan, or ask it to change things:
   edit, add, remove or create offers, rewrite month plans. It proposes; you apply one change
   or all of them. Approved offers are changed only after you agree. */

type Msg = { role: 'user' | 'assistant'; content: string; actions?: CopilotAction[]; done?: number[] };

const LABEL: Record<string, string> = {
  pricing: 'Discount',
  expected_asp: 'Price',
  target_purchases: 'Buyers',
  redemption_conditions: 'Conditions',
  customer_copy: 'Customer copy',
  validity_start: 'Starts',
  validity_end: 'Ends',
  plan_slot: 'Slot',
  offer_type: 'Type',
};
const show = (k: string, v: any) =>
  k === 'pricing'
    ? `${Math.round((v?.discount ?? 0) * 1000) / 10}% off`
    : k === 'expected_asp'
      ? `₹${Number(v).toLocaleString('en-IN')}`
      : String(v);

export default function GlobalCopilot() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const { studioId, year } = useApp() as any;
  const pageScope = useSyncExternalStore(subscribeCopilotScope, getCopilotScope);

  useEffect(() => {
    const node = end.current;
    if (node && typeof node.scrollIntoView === 'function') node.scrollIntoView({ block: 'end' });
  }, [msgs, busy]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setOpen(o => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const scope = {
    path: location.pathname,
    studioId: pageScope.studioId ?? studioId ?? null,
    year: pageScope.year ?? year ?? null,
    month: pageScope.month ?? null,
  };

  const send = async (text?: string) => {
    const message = (text ?? input).trim();
    if (!message || busy) return;
    const history = msgs.map(m => ({ role: m.role, content: m.content }));
    setMsgs(m => [...m, { role: 'user', content: message }]);
    setInput('');
    setBusy(true);
    try {
      const r = await api<{ reply: string; actions: CopilotAction[] }>('/copilot/agent', {
        method: 'POST',
        body: JSON.stringify({ message, history, scope }),
      });
      setMsgs(m => [...m, { role: 'assistant', content: r.reply, actions: r.actions, done: [] }]);
    } catch (e: any) {
      setMsgs(m => [...m, { role: 'assistant', content: e.message || 'Copilot could not answer.' }]);
    } finally {
      setBusy(false);
    }
  };

  const apply = async (mi: number, indexes: number[]) => {
    const msg = msgs[mi];
    const chosen = indexes.map(i => msg.actions![i]);
    const ask = consentText(chosen);
    if (ask && !window.confirm(ask)) return;
    setBusy(true);
    const ok: number[] = [];
    const notes: string[] = [];
    for (const i of indexes) {
      try {
        const n = await applyAction(msg.actions![i]);
        if (n) notes.push(n);
        ok.push(i);
      } catch (e: any) {
        notes.push(`${describeAction(msg.actions![i])}: ${e.message}`);
      }
    }
    setMsgs(m => m.map((x, j) => (j === mi ? { ...x, done: [...(x.done || []), ...ok] } : x)));
    setNote(
      `${ok.length} of ${indexes.length} change${indexes.length === 1 ? '' : 's'} applied.${notes.length ? ' ' + notes.join(' ') : ''}`,
    );
    if (ok.length) announceChange();
    setBusy(false);
  };

  const where = [
    pageScope.label,
    scope.month ? new Date(2000, scope.month - 1, 1).toLocaleString('en', { month: 'long' }) : null,
    scope.year,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <>
      {!open && (
        <button type="button" className="gcp-fab" onClick={() => setOpen(true)} title="Copilot (⌘J)">
          <Sparkles size={16} /> Copilot
        </button>
      )}
      {open && (
        <aside className="gcp" aria-label="Copilot">
          <header className="gcp-head">
            <span className="gcp-title">
              <Sparkles size={14} /> Copilot
              {where && <em>{where}</em>}
            </span>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close copilot">
              <X size={15} />
            </button>
          </header>

          <div className="gcp-log">
            {!msgs.length && (
              <div className="gcp-empty">
                <p>Ask about the plan, or tell me what to change. I propose; you apply.</p>
                {[
                  'Sharpen every offer this month for a higher conversion rate',
                  'Create a renewal offer for members expiring this month',
                  'Rewrite the month plan around the festive moment',
                  'Which months are furthest from target, and what would you change?',
                ].map(s => (
                  <button key={s} type="button" onClick={() => send(s)}>
                    {s}
                  </button>
                ))}
              </div>
            )}
            {msgs.map((m, mi) => {
              const pending = (m.actions || []).map((_, i) => i).filter(i => !m.done?.includes(i));
              return (
                <div key={mi} className={`gcp-msg is-${m.role}`}>
                  <p>{m.content}</p>
                  {!!m.actions?.length && (
                    <div className="gcp-actions">
                      {m.actions.map((a, i) => {
                        const done = m.done?.includes(i);
                        return (
                          <div key={i} className={`gcp-action${done ? ' is-done' : ''}`}>
                            <div className="gcp-action-head">
                              <strong>{describeAction(a)}</strong>
                              {'approved' in a && a.approved && <span className="gcp-lock">Approved · asks first</span>}
                            </div>
                            {'changes' in a && (
                              <ul>
                                {Object.entries(a.changes).map(([k, v]) => (
                                  <li key={k}>
                                    <span>{LABEL[k] || k.replace(/_/g, ' ')}</span>
                                    <b>{show(k, v)}</b>
                                  </li>
                                ))}
                              </ul>
                            )}
                            {a.kind === 'create_offer' && (
                              <ul>
                                {Object.entries(a.fields)
                                  .filter(([k]) => k !== 'name')
                                  .map(([k, v]) => (
                                    <li key={k}>
                                      <span>{LABEL[k] || k.replace(/_/g, ' ')}</span>
                                      <b>{show(k, v)}</b>
                                    </li>
                                  ))}
                              </ul>
                            )}
                            {a.why && <em>{a.why}</em>}
                            <button type="button" disabled={busy || done} onClick={() => apply(mi, [i])}>
                              {done ? (
                                <>
                                  <Check size={12} /> Applied
                                </>
                              ) : (
                                'Apply'
                              )}
                            </button>
                          </div>
                        );
                      })}
                      {pending.length > 1 && (
                        <button type="button" className="gcp-all" disabled={busy} onClick={() => apply(mi, pending)}>
                          Apply all {pending.length} changes
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {busy && <div className="gcp-msg is-assistant is-typing">Working…</div>}
            <div ref={end} />
          </div>

          {note && (
            <div className="gcp-note" role="status">
              {note}
              <button type="button" onClick={() => setNote(null)} aria-label="Dismiss">
                <X size={12} />
              </button>
            </div>
          )}

          <form
            className="gcp-input"
            onSubmit={e => {
              e.preventDefault();
              send();
            }}
          >
            <textarea
              value={input}
              rows={2}
              maxLength={4000}
              placeholder="Ask or tell the copilot what to change…"
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
      )}
    </>
  );
}
