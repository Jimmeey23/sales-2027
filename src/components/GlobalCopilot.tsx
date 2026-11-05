import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useLocation } from 'react-router-dom';
import { Check, ChevronDown, Download, Minus, RotateCcw, ShieldCheck, Send, Sparkles, Trash2, X } from 'lucide-react';
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

type Finding = { severity: 'critical' | 'warn' | 'info'; month: number | null; title: string; detail: string };
type Audit = { studio: string; findings: Finding[]; summary: { critical: number; warn: number; info: number; coverage: number | null; yearTarget: number; yearOfferRevenue: number } };
type Step = { type: 'thinking' | 'tool'; text?: string; tool?: string; input?: string; result?: string; error?: boolean };
type Question = { question: string; options: string[] };
type Msg = {
  role: 'user' | 'assistant';
  content: string;
  actions?: CopilotAction[];
  done?: number[];
  audit?: Audit | null;
  steps?: Step[];
  questions?: Question[] | null;
  ms?: number;
};

const TOOL_LABEL: Record<string, string> = {
  list_studios: 'Listed studios',
  get_year_overview: 'Read year overview',
  get_month_plan: 'Read month plan',
  search_offers: 'Searched offer bank',
  run_plan_audit: 'Ran plan audit',
  propose_offer_update: 'Proposed offer edit',
  propose_add_offer: 'Proposed adding offer',
  propose_remove_offer: 'Proposed removing offer',
  propose_delete_offer: 'Proposed deleting offer',
  propose_create_offer: 'Proposed new offer',
  propose_plan_update: 'Proposed plan rewrite',
  ask_clarifying_questions: 'Asked clarifying questions',
};
const STORE = 'p57-copilot-chat';
const load = (): Msg[] => {
  try {
    return JSON.parse(localStorage.getItem(STORE) || '[]');
  } catch {
    return [];
  }
};

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
  const [min, setMin] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>(load);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [custom, setCustom] = useState<Record<string, string>>({});
  const [live, setLive] = useState<Step[]>([]);
  // Where the panel or button sits; null = default corner. Remembered per browser.
  const [pos, setPos] = useState<{ x: number; y: number } | null>(() => {
    try {
      return JSON.parse(localStorage.getItem('p57-copilot-pos') || 'null');
    } catch {
      return null;
    }
  });
  const drag = useRef<{ dx: number; dy: number; moved: boolean } | null>(null);
  const clampPos = (x: number, y: number, w: number, h: number) => ({
    x: Math.max(8, Math.min(window.innerWidth - w - 8, x)),
    y: Math.max(8, Math.min(window.innerHeight - h - 8, y)),
  });
  const startDrag = (e: React.PointerEvent<HTMLElement>, el: HTMLElement | null) => {
    if (!el || (e.target as HTMLElement).closest('button:not(.gcp-fab), input, textarea, select')) return;
    const r = el.getBoundingClientRect();
    drag.current = { dx: e.clientX - r.left, dy: e.clientY - r.top, moved: false };
    const move = (ev: PointerEvent) => {
      if (!drag.current) return;
      drag.current.moved = true;
      setPos(clampPos(ev.clientX - drag.current.dx, ev.clientY - drag.current.dy, r.width, r.height));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      setPos(p => {
        try {
          localStorage.setItem('p57-copilot-pos', JSON.stringify(p));
        } catch {
          /* storage unavailable */
        }
        return p;
      });
      setTimeout(() => (drag.current = null), 0);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  const panelRef = useRef<HTMLElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);
  // Keep the panel on screen when the window shrinks.
  useEffect(() => {
    const onResize = () => setPos(p => (p ? clampPos(p.x, p.y, 120, 60) : p));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
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
    try {
      localStorage.setItem(STORE, JSON.stringify(msgs.slice(-60)));
    } catch {
      /* storage unavailable */
    }
  }, [msgs]);
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

  const send = async (text?: string, mode?: 'audit') => {
    const message = (text ?? input).trim();
    if (!message || busy) return;
    const history = msgs.map(m => ({ role: m.role, content: m.content }));
    setMsgs(m => [...m, { role: 'user', content: message }]);
    setInput('');
    setBusy(true);
    const t0 = Date.now();
    type Round = {
      reply: string;
      actions: CopilotAction[];
      audit?: Audit | null;
      steps?: Step[];
      questions?: Question[] | null;
      done?: boolean;
      state?: unknown;
    };
    try {
      // The copilot works in short rounds (hosting kills long requests); keep calling until it is done,
      // showing the steps so far while it works.
      let state: unknown = null;
      let audit: Audit | null = null;
      let r: Round;
      for (let round = 0; ; round++) {
        r = await api<Round>('/copilot/agent', {
          method: 'POST',
          body: JSON.stringify({ message, history, scope, mode, state }),
        });
        if (r.audit) audit = r.audit;
        if (r.done !== false || !r.state || round >= 14) break;
        state = r.state;
        setLive(r.steps || []);
      }
      setMsgs(m => [
        ...m,
        {
          role: 'assistant',
          content: r.reply || 'The copilot ran out of time. Try a narrower request.',
          actions: r.actions,
          done: [],
          audit,
          steps: r.steps,
          questions: r.questions,
          ms: Date.now() - t0,
        },
      ]);
    } catch (e: any) {
      setMsgs(m => [...m, { role: 'assistant', content: e.message || 'Copilot could not answer.' }]);
    } finally {
      setBusy(false);
      setLive([]);
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

  const clear = () => {
    if (busy || !msgs.length || !window.confirm('Clear this conversation?')) return;
    setMsgs([]);
    setNote(null);
    setAnswers({});
    setCustom({});
  };
  const restart = () => {
    if (busy) return;
    const lastUser = [...msgs].reverse().find(m => m.role === 'user');
    setMsgs([]);
    setNote(null);
    setAnswers({});
    if (lastUser) setTimeout(() => send(lastUser.content), 0);
  };
  const exportChat = () => {
    const lines = [`# P57 Copilot conversation`, `Exported ${new Date().toLocaleString('en-IN')}`, ''];
    for (const m of msgs) {
      lines.push(`## ${m.role === 'user' ? 'You' : 'Copilot'}`, '', m.content, '');
      if (m.steps?.length) {
        lines.push('**Steps**');
        for (const st of m.steps)
          lines.push(st.type === 'tool' ? `- ${TOOL_LABEL[st.tool || ''] || st.tool}: ${st.result || st.input || ''}` : `- Thinking: ${st.text}`);
        lines.push('');
      }
      if (m.audit) {
        lines.push(`**Audit — ${m.audit.studio}**`);
        for (const f of m.audit.findings) lines.push(`- [${f.severity}] ${f.title} — ${f.detail}`);
        lines.push('');
      }
      if (m.actions?.length) {
        lines.push('**Proposed changes**');
        m.actions.forEach((a, i) =>
          lines.push(`- ${describeAction(a)}${m.done?.includes(i) ? ' (applied)' : ''}${a.why ? ` — ${a.why}` : ''}`),
        );
        lines.push('');
      }
      if (m.questions?.length) {
        lines.push('**Questions**');
        m.questions.forEach(q => lines.push(`- ${q.question} (${[...q.options, 'Other'].join(' / ')})`));
        lines.push('');
      }
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `copilot-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.md`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const answer = (mi: number) => {
    const qs = msgs[mi].questions || [];
    const pick = (k: string) => (answers[k] === '__other' ? custom[k]?.trim() || 'your call' : answers[k] || 'your call');
    const text = qs.map((q, qi) => `${q.question} → ${pick(`${mi}-${qi}`)}`).join('\n');
    send(text);
  };

  const audit = () =>
    send(
      `Audit the ${scope.year || ''} sales plan${pageScope.label ? ` for ${pageScope.label}` : scope.studioId ? '' : ' for every studio'}${
        scope.month ? `, starting with ${new Date(2000, scope.month - 1, 1).toLocaleString('en', { month: 'long' })}` : ''
      }. Find loopholes, discrepancies and weak spots, and propose changes that make it stronger and more creative.`,
      'audit',
    );

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
        <button
          type="button"
          ref={fabRef}
          className="gcp-fab"
          style={pos ? { left: pos.x, top: pos.y, right: 'auto', bottom: 'auto' } : undefined}
          onPointerDown={e => startDrag(e, fabRef.current)}
          onClick={() => {
            if (!drag.current?.moved) setOpen(true);
          }}
          title="Copilot (⌘J) — drag to move"
        >
          <Sparkles size={16} /> Copilot
        </button>
      )}
      {open && (
        <aside
          ref={panelRef}
          className={`gcp${min ? ' is-min' : ''}${pos ? ' is-placed' : ''}`}
          aria-label="Copilot"
          style={
            pos
              ? {
                  left: Math.min(pos.x, Math.max(8, window.innerWidth - Math.min(460, window.innerWidth - 32) - 8)),
                  top: Math.min(pos.y, Math.max(8, window.innerHeight - (min ? 70 : 520))),
                  right: 'auto',
                  bottom: min ? 'auto' : 16,
                }
              : undefined
          }
        >
          <header className="gcp-head" onPointerDown={e => startDrag(e, panelRef.current)} onDoubleClick={() => setPos(null)} title="Drag to move · double-click to reset">
            <span className="gcp-title">
              <Sparkles size={14} /> Copilot
              {where && <em>{where}</em>}
            </span>
            <button type="button" className="gcp-audit-btn" onClick={audit} disabled={busy} title="Independently audit the sales plan">
              <ShieldCheck size={13} /> Audit plan
            </button>
            <div className="gcp-tools">
              <button type="button" onClick={exportChat} disabled={!msgs.length} title="Export chat (.md)" aria-label="Export chat">
                <Download size={14} />
              </button>
              <button type="button" onClick={restart} disabled={busy || !msgs.length} title="Restart: clear and re-ask the last question" aria-label="Restart chat">
                <RotateCcw size={14} />
              </button>
              <button type="button" onClick={clear} disabled={busy || !msgs.length} title="Clear chat" aria-label="Clear chat">
                <Trash2 size={14} />
              </button>
              <button type="button" onClick={() => setMin(v => !v)} title={min ? 'Expand' : 'Minimise'} aria-label={min ? 'Expand copilot' : 'Minimise copilot'}>
                {min ? <ChevronDown size={14} style={{ transform: 'rotate(180deg)' }} /> : <Minus size={14} />}
              </button>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close copilot">
                <X size={15} />
              </button>
            </div>
          </header>
          {min ? null : (
          <>

          <div className="gcp-log">
            {!msgs.length && (
              <div className="gcp-empty">
                <p>Ask about the plan, or tell me what to change. I propose; you apply.</p>
                <button type="button" className="gcp-audit-cta" onClick={audit}>
                  <ShieldCheck size={14} /> Audit the whole plan — loopholes, discrepancies, ideas
                </button>
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
                  {m.audit && (
                    <details className="gcp-findings" open={m.audit.summary.critical > 0}>
                      <summary>
                        <b>{m.audit.studio} audit</b>
                        <span className="is-critical">{m.audit.summary.critical} critical</span>
                        <span className="is-warn">{m.audit.summary.warn} warnings</span>
                        <span className="is-info">{m.audit.summary.info} notes</span>
                        {m.audit.summary.coverage != null && (
                          <span>{Math.round(m.audit.summary.coverage * 100)}% of target covered by offers</span>
                        )}
                      </summary>
                      <ul>
                        {m.audit.findings.slice(0, 40).map((f, i) => (
                          <li key={i} className={`is-${f.severity}`}>
                            <b>{f.title}</b>
                            <span>{f.detail}</span>
                          </li>
                        ))}
                        {m.audit.findings.length > 40 && <li className="is-info">…and {m.audit.findings.length - 40} more</li>}
                      </ul>
                    </details>
                  )}
                  {!!m.steps?.length && (
                    <details className="gcp-steps">
                      <summary>
                        {m.steps.filter(x => x.type === 'tool').length} tool call
                        {m.steps.filter(x => x.type === 'tool').length === 1 ? '' : 's'}
                        {m.steps.some(x => x.type === 'thinking') ? ' · reasoning' : ''}
                        {m.ms ? ` · ${Math.round(m.ms / 1000)}s` : ''}
                      </summary>
                      <ol>
                        {m.steps.map((st, si) =>
                          st.type === 'thinking' ? (
                            <li key={si} className="is-thinking">
                              <span>Thinking</span>
                              <p>{st.text}</p>
                            </li>
                          ) : (
                            <li key={si} className={st.error ? 'is-error' : ''}>
                              <span>{TOOL_LABEL[st.tool || ''] || st.tool}</span>
                              {st.result && <b>{st.result}</b>}
                              {st.input && st.input !== '{}' && <code>{st.input}</code>}
                            </li>
                          ),
                        )}
                      </ol>
                    </details>
                  )}
                  <p>{m.content}</p>
                  {!!m.questions?.length && (
                    <div className="gcp-questions">
                      {m.questions.map((q, qi) => (
                        <div key={qi} className="gcp-q">
                          <strong>{q.question}</strong>
                          <div>
                            {[...q.options, '__other'].map(o => (
                              <button
                                key={o}
                                type="button"
                                className={answers[`${mi}-${qi}`] === o ? 'is-on' : ''}
                                disabled={busy || mi !== msgs.length - 1}
                                onClick={() => setAnswers(a => ({ ...a, [`${mi}-${qi}`]: o }))}
                              >
                                {o === '__other' ? 'Other…' : o}
                              </button>
                            ))}
                          </div>
                          {answers[`${mi}-${qi}`] === '__other' && (
                            <input
                              className="gcp-q-other"
                              autoFocus
                              maxLength={300}
                              placeholder="Type your own answer"
                              value={custom[`${mi}-${qi}`] || ''}
                              disabled={busy || mi !== msgs.length - 1}
                              onChange={e => setCustom(c => ({ ...c, [`${mi}-${qi}`]: e.target.value }))}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  answer(mi);
                                }
                              }}
                            />
                          )}
                        </div>
                      ))}
                      {mi === msgs.length - 1 && (
                        <button type="button" className="gcp-all" disabled={busy} onClick={() => answer(mi)}>
                          Continue with these answers
                        </button>
                      )}
                    </div>
                  )}
                  {!!m.actions?.length && (
                    <div className="gcp-actions">
                      {m.actions.map((a, i) => {
                        const done = m.done?.includes(i);
                        return (
                          <div key={i} className={`gcp-action is-${a.kind}${done ? ' is-done' : ''}`}>
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
            {busy && (
              <div className="gcp-working" role="status">
                <span className="gcp-dots" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
                <span>
                  {live.length
                    ? (() => {
                        const lastTool = [...live].reverse().find(x => x.type === 'tool');
                        return lastTool ? `${TOOL_LABEL[lastTool.tool || ''] || lastTool.tool}…` : 'Reasoning…';
                      })()
                    : 'Thinking and reading the plan…'}
                </span>
                {live.length > 0 && <em>{live.filter(x => x.type === 'tool').length} steps</em>}
              </div>
            )}
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
          </>
          )}
        </aside>
      )}
    </>
  );
}
