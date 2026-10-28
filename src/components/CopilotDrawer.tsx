import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUp,
  ArrowUpRight,
  Bot,
  CheckCircle2,
  ChevronDown,
  Gauge,
  MessageSquarePlus,
  Send,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { api, post } from '../api';
import { useApp } from '../App';
import { money, number } from '../types';
import { Badge, Button, Callout, IconButton, Loading, Select } from './ui';

type Tone = 'good' | 'bad' | 'neutral' | 'warn';
type Card =
  | { kind: 'kpi'; items: { label: string; value: string; delta?: string; tone?: Tone; hint?: string }[] }
  | { kind: 'bars'; title?: string; format?: string; rows: { label: string; value: number; display?: string; tone?: Tone }[] }
  | { kind: 'table'; title?: string; columns: string[]; rows: (string | number)[][]; align?: ('l' | 'r')[] }
  | { kind: 'list'; title?: string; rows: { title: string; meta?: string; detail?: string; tone?: Tone }[] }
  | { kind: 'note'; tone: 'info' | 'warn' | 'success'; text: string };

const TONE_CLASS: Record<string, string> = {
  good: 'is-good',
  bad: 'is-bad',
  warn: 'is-warn',
  neutral: 'is-neutral',
};

export default function CopilotDrawer({ onClose }: { onClose: () => void }) {
  const { boot, studioId: globalStudio, year, toast } = useApp(),
    navigate = useNavigate();
  const [capability, setCapability] = useState<any>(null),
    [conversations, setConversations] = useState<any[]>([]);
  const [conversationId, setConversationId] = useState<number | null>(null),
    [messages, setMessages] = useState<any[]>([]);
  const [studioId, setStudioId] = useState<number | null>(globalStudio),
    [mode, setMode] = useState('deterministic');
  const [input, setInput] = useState(''),
    [loading, setLoading] = useState(true),
    [sending, setSending] = useState(false),
    [creating, setCreating] = useState(false),
    [error, setError] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  const loadIndex = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [capability, index] = await Promise.all([api('/copilot/capability'), api('/copilot/conversations')]);
      setCapability(capability);
      setConversations(index.rows);
      if (capability.providerConfigured) setMode('auto');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);
  const selectConversation = useCallback(
    async (id: number) => {
      setConversationId(id);
      setError('');
      const detail = await api(`/copilot/conversations/${id}`);
      setMessages(detail.messages);
      if (detail.studio_id) setStudioId(detail.studio_id);
    },
    [],
  );
  useEffect(() => {
    loadIndex().catch(() => {});
  }, [loadIndex]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, sending]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);
  const newConversation = async () => {
    if (creating || sending) return;
    setCreating(true);
    setError('');
    setInput('');
    try {
      const created = await post('/copilot/conversations', { studioId, title: 'New commercial conversation' });
      setConversationId(created.id);
      setMessages([]);
      const index = await api('/copilot/conversations');
      setConversations(index.rows);
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setCreating(false);
    }
  };
  const send = useCallback(
    async (preset?: string) => {
      const text = (preset ?? input).trim();
      if (!text) return;
      setSending(true);
      setError('');
      setInput('');
      try {
        let id = conversationId;
        if (!id) {
          const created = await post('/copilot/conversations', { studioId, title: 'New commercial conversation' });
          id = created.id;
          setConversationId(id);
        }
        const optimistic = { id: `local-${Date.now()}`, role: 'user', content: text, attachments: {} };
        setMessages(current => [...current, optimistic]);
        const response = await post(`/copilot/conversations/${id}/messages`, { message: text, mode, studioId });
        setMessages(current => [...current, response.message]);
        api('/copilot/conversations')
          .then(index => setConversations(index.rows))
          .catch(() => {});
        if (response.savedOffer) toast(`Draft offer #${response.savedOffer.id} saved.`);
      } catch (e: any) {
        setError(e.message);
        setMessages(current => current.filter(item => !String(item.id).startsWith('local-')));
        setInput(text);
      } finally {
        setSending(false);
      }
    },
    [conversationId, input, mode, studioId, toast],
  );
  const openOffer = useCallback(
    (id: number) => {
      onClose();
      navigate(`/offers/${id}/edit`);
    },
    [navigate, onClose],
  );
  const buildConcept = useCallback(
    (concept: any) => {
      onClose();
      navigate('/sales-plan/offers?view=manual', {
        state: {
          concept: { ...concept, studioId: concept.studioId || studioId || boot.studios[0]?.id, year },
        },
      });
    },
    [boot.studios, navigate, onClose, studioId, year],
  );
  const openRoute = useCallback(
    (action: { route: string; label?: string }) => {
      onClose();
      navigate(action.route);
    },
    [navigate, onClose],
  );
  const remove = async () => {
    if (
      !conversationId ||
      !window.confirm('Delete this saved Copilot conversation? Offers already saved remain unchanged.')
    )
      return;
    try {
      await api(`/copilot/conversations/${conversationId}`, { method: 'DELETE' });
      setConversationId(null);
      setMessages([]);
      await loadIndex();
    } catch (e: any) {
      toast(e.message, 'error');
    }
  };
  const studioName = boot.studios.find(s => s.id === studioId)?.name || 'all locations';
  const suggestions = useMemo(() => {
    const fromServer: { text: string; label?: string }[] = (capability?.intents ?? [])
      .filter((intent: any) => intent.examples?.length && intent.id !== 'help')
      .slice(0, 12)
      .map((intent: any) => ({ text: intent.examples[0], label: intent.label }));
    const fallback = [
      { text: `How do we close the April ${year} gap?`, label: 'Gap to target' },
      { text: 'Where is the funnel leaking?', label: 'Funnel diagnosis' },
      { text: 'Which lead sources convert best?', label: 'Channel quality' },
      { text: `Show renewals due next month at ${studioName}`, label: 'Renewal risk' },
      { text: `Compare the studios for ${year}`, label: 'Studio benchmark' },
      { text: `Build a 3-for-2 offer for April`, label: 'Build an offer' },
    ];
    return (fromServer.length >= 6 ? fromServer : fallback).slice(0, 6);
  }, [capability, studioName, year]);
  const engine = capability?.engineInfo ?? capability;
  return (
    <div className="copilot-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <aside className="copilot-panel" role="dialog" aria-modal="true" aria-label="P57 Copilot">
        <header className="copilot-header">
          <div className="copilot-title">
            <span className="copilot-orb">
              <Bot size={21} />
            </span>
            <div>
              <h2>P57 Copilot</h2>
              <p>
                {capability?.providerConfigured
                  ? `AI strategist · grounded in your ${year} plan, prices and history`
                  : `Deterministic engine ${engine?.engine ?? '2027'} · ${engine?.tools?.length ?? 19} tools · every number sourced`}
              </p>
            </div>
          </div>
          <div className="row-actions">
            <IconButton label="New conversation" onClick={newConversation} disabled={creating || sending}>
              <MessageSquarePlus size={18} />
            </IconButton>
            <IconButton label="Close Copilot" onClick={onClose}>
              <X size={20} />
            </IconButton>
          </div>
        </header>
        <div className="copilot-body">
          <aside className="copilot-history">
            <div className="copilot-history-title">
              Saved conversations <Badge>{conversations.length}</Badge>
            </div>
            {conversations.map(item => (
              <button
                key={item.id}
                className={conversationId === item.id ? 'active' : ''}
                onClick={() => selectConversation(item.id).catch(e => setError(e.message))}
              >
                <strong>{item.title}</strong>
                <span>{item.studio || 'Studio not selected'}</span>
                <small>{new Date(item.updated_at).toLocaleDateString('en-IN')}</small>
              </button>
            ))}
            {!conversations.length && <p>Your saved plans, offer concepts and answers will appear here.</p>}
          </aside>
          <section className="copilot-chat">
            <div className="copilot-controls">
              <Select
                aria-label="Copilot studio"
                disabled={creating || sending}
                value={studioId || ''}
                onChange={e => setStudioId(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">All locations</option>
                {boot.studios.map(studio => (
                  <option key={studio.id} value={studio.id}>
                    {studio.name}
                  </option>
                ))}
              </Select>
              <Select
                aria-label="Copilot mode"
                disabled={creating || sending}
                value={mode}
                onChange={e => setMode(e.target.value)}
              >
                {capability?.providerConfigured && <option value="auto">AI strategist</option>}
                <option value="deterministic">Rules only</option>
              </Select>
              {conversationId && (
                <IconButton label="Delete conversation" onClick={remove}>
                  <Trash2 size={16} />
                </IconButton>
              )}
            </div>
            <div className="copilot-messages">
              {!messages.length && (
                <div className="copilot-welcome">
                  <span>
                    <Sparkles size={24} />
                  </span>
                  <h3>Ask anything about the {year} plan.</h3>
                  <p>
                    Targets and gaps, funnel and channels, renewals and segments, price ladders, policy-checked offer
                    drafts and labelled scenarios. Answers are computed from your imported data, and every one lists
                    its sources. Nothing is approved or published by chatting.
                  </p>
                  <div className="copilot-prompts">
                    {suggestions.map(suggestion => (
                      <button
                        key={suggestion.text}
                        onClick={() => send(suggestion.text)}
                        disabled={creating || sending}
                      >
                        <span>{suggestion.label}</span>
                        {suggestion.text}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map(message => (
                <CopilotMessage
                  key={message.id}
                  message={message}
                  onFollowUp={send}
                  onOpenOffer={openOffer}
                  onBuild={buildConcept}
                  onOpenRoute={openRoute}
                  disabled={sending}
                />
              ))}
              {sending && (
                <div className="copilot-thinking">
                  <span />
                  <span />
                  <span />
                  Reading the plan and calculating…
                </div>
              )}
              {loading && <Loading label="Loading saved conversations…" />}
              <div ref={endRef} />
            </div>
            {error && <Callout tone="danger">{error}</Callout>}
            <form
              className="copilot-composer"
              onSubmit={e => {
                e.preventDefault();
                send();
              }}
            >
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask about a month, a studio, a metric or an offer…"
                rows={2}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
              />
              <Button type="submit" disabled={!input.trim() || sending || creating} aria-label="Send to Copilot">
                <ArrowUp size={18} />
              </Button>
            </form>
            <p className="copilot-disclaimer">
              {mode === 'deterministic'
                ? 'Rules and database calculations only · no model writes the numbers'
                : 'AI answers from your plan data · check numbers before acting'}{' '}
              · Conversations are saved.
            </p>
          </section>
        </div>
      </aside>
    </div>
  );
}

const CopilotMessage = React.memo(function CopilotMessage({
  message,
  onFollowUp,
  onOpenOffer,
  onBuild,
  onOpenRoute,
  disabled,
}: {
  message: any;
  onFollowUp: (text: string) => void;
  onOpenOffer: (id: number) => void;
  onBuild: (concept: any) => void;
  onOpenRoute: (action: { route: string; label?: string }) => void;
  disabled: boolean;
}) {
  const attachments = message.attachments || {};
  const cards: Card[] = Array.isArray(attachments.cards) ? attachments.cards : [];
  const intent = attachments.intent;
  const perf = attachments.performance;
  const followUps: string[] = attachments.followUps ?? [];
  const calculation = attachments.calculation ?? [];
  const sources = attachments.sources ?? [];
  const isUser = message.role === 'user';
  return (
    <article className={`copilot-message ${message.role}`}>
      <div className="copilot-message-label">
        {isUser ? 'You' : message.mode === 'deterministic' ? 'Copilot · rules' : 'P57 Copilot'}
      </div>
      <div className="copilot-message-content">
        {isUser ? message.content : <Markdown text={message.content} />}
      </div>
      {!isUser && (cards.length > 0 || intent) && (
        <div className="copilot-answer">
          {intent && (
            <div className="copilot-meta">
              <Badge>{intent.label}</Badge>
              {typeof intent.confidence === 'number' && (
                <span className={`copilot-confidence ${intent.confident ? 'is-confident' : ''}`}>
                  {Math.round(intent.confidence * 100)}% match
                </span>
              )}
              {perf?.ms != null && (
                <span className="copilot-speed">
                  <Gauge size={12} /> {perf.ms} ms
                </span>
              )}
              {attachments.scope?.assumed && <span className="copilot-assumed">studio assumed</span>}
            </div>
          )}
          {cards.map((card, index) => (
            <AnswerBlock key={index} card={card} />
          ))}
          {attachments.action?.route && (
            <button className="copilot-action" onClick={() => onOpenRoute(attachments.action)}>
              <ArrowUpRight size={14} /> Open {attachments.action.label || attachments.action.route}
            </button>
          )}
          {attachments.nextActions?.length ? (
            <div className="copilot-next">
              <strong>Next steps</strong>
              <ol>
                {attachments.nextActions.map((action: string, index: number) => (
                  <li key={index}>{action}</li>
                ))}
              </ol>
            </div>
          ) : null}
          {(sources.length > 0 || calculation.length > 0) && (
            <details className="copilot-working">
              <summary>
                Where this came from <ChevronDown size={13} />
              </summary>
              {calculation.length > 0 && (
                <dl>
                  {calculation.map((item: any, index: number) => (
                    <div key={index}>
                      <dt>{item.label}</dt>
                      <dd>
                        <code>{item.formula}</code> <b>{item.value}</b>
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
              {sources.length > 0 && (
                <ul>
                  {sources.map((source: any, index: number) => (
                    <li key={index}>
                      <strong>{source.label}</strong>
                      {source.table ? <code>{source.table}</code> : null}
                      {source.detail ? <span>{source.detail}</span> : null}
                    </li>
                  ))}
                </ul>
              )}
            </details>
          )}
          {followUps.length > 0 && (
            <div className="copilot-chips">
              {followUps.slice(0, 4).map(text => (
                <button key={text} onClick={() => onFollowUp(text)} disabled={disabled}>
                  <Send size={11} /> {text}
                </button>
              ))}
              {calculation.length > 0 && (
                <button onClick={() => onFollowUp('why?')} disabled={disabled}>
                  Why?
                </button>
              )}
            </div>
          )}
        </div>
      )}
      <Attachment attachments={attachments} onOpenOffer={onOpenOffer} onBuild={onBuild} />
    </article>
  );
});

function AnswerBlock({ card }: { card: Card }) {
  if (card.kind === 'kpi')
    return (
      <div className="copilot-kpis">
        {card.items.map((item, index) => (
          <div key={index} className={`copilot-kpi ${TONE_CLASS[item.tone || 'neutral']}`}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            {item.delta ? <em>{item.delta}</em> : null}
            {item.hint ? <small>{item.hint}</small> : null}
          </div>
        ))}
      </div>
    );
  if (card.kind === 'bars') {
    const max = Math.max(...card.rows.map(row => Math.abs(row.value)), 1);
    return (
      <div className="copilot-bars">
        {card.title && <strong className="copilot-block-title">{card.title}</strong>}
        {card.rows.map((row, index) => (
          <div key={index} className={`copilot-bar ${TONE_CLASS[row.tone || 'neutral']}`}>
            <span className="copilot-bar-label" title={row.label}>
              {row.label}
            </span>
            <span className="copilot-bar-track">
              <i style={{ width: `${Math.max(2, (Math.abs(row.value) / max) * 100)}%` }} />
            </span>
            <span className="copilot-bar-value">{row.display}</span>
          </div>
        ))}
      </div>
    );
  }
  if (card.kind === 'table')
    return (
      <div className="copilot-table-wrap">
        {card.title && <strong className="copilot-block-title">{card.title}</strong>}
        <table className="copilot-table">
          <thead>
            <tr>
              {card.columns.map(column => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {card.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className={card.align?.[cellIndex] === 'r' ? 'is-num' : ''}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  if (card.kind === 'list')
    return (
      <div className="copilot-list">
        {card.title && <strong className="copilot-block-title">{card.title}</strong>}
        {card.rows.map((row, index) => (
          <div key={index} className={`copilot-list-row ${TONE_CLASS[row.tone || 'neutral']}`}>
            <div>
              <strong>{row.title}</strong>
              {row.meta ? <span>{row.meta}</span> : null}
            </div>
            {row.detail ? <p>{row.detail}</p> : null}
          </div>
        ))}
      </div>
    );
  if (card.kind === 'note')
    return <div className={`copilot-note is-${card.tone}`}>{card.text}</div>;
  return null;
}

// Minimal markdown: paragraphs, "- " bullets, **bold** and _italics_.
function Markdown({ text }: { text: string }) {
  const inline = (line: string) =>
    line.split(/(\*\*[^*]+\*\*|_[^_]+_)/g).map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
      if (part.startsWith('_') && part.endsWith('_') && part.length > 2) return <em key={i}>{part.slice(1, -1)}</em>;
      return part;
    });
  const blocks: React.ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length)
      blocks.push(
        <ul key={blocks.length}>
          {list.map((item, index) => (
            <li key={index}>{inline(item)}</li>
          ))}
        </ul>,
      );
    list = [];
  };
  for (const raw of String(text || '').split('\n')) {
    const line = raw.trim();
    if (/^[-•*]\s+/.test(line)) {
      list.push(line.replace(/^[-•*]\s+/, ''));
      continue;
    }
    flush();
    if (!line) continue;
    if (/^#{1,4}\s/.test(line)) blocks.push(<h4 key={blocks.length}>{inline(line.replace(/^#+\s/, ''))}</h4>);
    else blocks.push(<p key={blocks.length}>{inline(line)}</p>);
  }
  flush();
  return <div className="copilot-md">{blocks}</div>;
}

const ideaConcept = (o: any) => ({
  name: o.name,
  headline: o.hook,
  customerCopy: o.benefit,
  benefit: o.benefit,
  rationale: o.whyItWorks,
  internalDescription: `Pricing sketch: ${o.pricing}. Channels: ${o.channels}.`,
  offerType: o.mechanism,
  month: o.month >= 1 && o.month <= 12 ? o.month : 1,
  mechanics: { mechanism: o.mechanism },
});

function Attachment({
  attachments,
  onOpenOffer,
  onBuild,
}: {
  attachments: any;
  onOpenOffer: (id: number) => void;
  onBuild: (concept: any) => void;
}) {
  if (!attachments?.type) return null;
  const ideas = attachments.aiOffers?.length ? (
    <div className="copilot-ideas">
      {attachments.aiOffers.map((o: any, i: number) => (
        <div key={i} className="copilot-idea">
          <div>
            <Badge tone="purple">{o.mechanism.replaceAll('_', ' ')}</Badge>
            {o.month >= 1 && o.month <= 12 && (
              <Badge>
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][o.month - 1]}
              </Badge>
            )}
          </div>
          <strong>{o.name}</strong>
          <em>“{o.hook}”</em>
          <p>{o.benefit}</p>
          <small>
            <b>Pricing:</b> {o.pricing}
          </small>
          <small>
            <b>Why:</b> {o.whyItWorks}
          </small>
          <small>
            <b>Audience:</b> {o.audience} · <b>Channels:</b> {o.channels}
          </small>
          <Button size="sm" variant="secondary" onClick={() => onBuild(ideaConcept(o))}>
            Build this offer
          </Button>
        </div>
      ))}
    </div>
  ) : null;
  return (
    <>
      {ideas}
      <LegacyAttachment attachments={attachments} onOpenOffer={onOpenOffer} />
    </>
  );
}

function LegacyAttachment({ attachments, onOpenOffer }: { attachments: any; onOpenOffer: (id: number) => void }) {
  if (attachments.type === 'offer_concept' && attachments.concept) {
    const offer = attachments.concept,
      result = offer?.financials;
    return (
      <div className="copilot-attachment">
        <div>
          <CheckCircle2 size={16} />
          <strong>{offer.name}</strong>
        </div>
        <dl>
          <div>
            <dt>Selling price</dt>
            <dd>{money(result?.sellingPrice)}</dd>
          </div>
          <div>
            <dt>Scenario revenue</dt>
            <dd>{money(result?.expectedRevenue, true)}</dd>
          </div>
          <div>
            <dt>Benefit</dt>
            <dd>{number(result?.effectiveDiscountPercent, 1)}%</dd>
          </div>
        </dl>
        {attachments.savedOfferId && (
          <Button size="sm" variant="secondary" onClick={() => onOpenOffer(attachments.savedOfferId)}>
            Open saved draft #{attachments.savedOfferId}
          </Button>
        )}
      </div>
    );
  }
  if (attachments.type === 'sales_plan' && attachments.plan)
    return (
      <div className="copilot-attachment">
        <strong>Sales plan · {attachments.plan.workstreams.length} workstreams</strong>
        <span>
          {attachments.plan.concepts.length} offer concepts · {attachments.plan.renewalDue.packages} renewals due
        </span>
      </div>
    );
  if (attachments.type === 'renewal_report' && attachments.report)
    return (
      <div className="copilot-attachment">
        <strong>{number(attachments.report.summary.duePackages)} open packages due</strong>
        <span>
          {money(attachments.report.summary.paidDueValue, true)} known paid value ·{' '}
          {money(attachments.report.summary.listDueValue, true)} matched list value
        </span>
      </div>
    );
  return null;
}
