import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUp, Bot, CheckCircle2, MessageSquarePlus, Sparkles, Trash2, X } from 'lucide-react';
import { api, post } from '../api';
import { useApp } from '../App';
import { money, number } from '../types';
import { Badge, Button, Callout, IconButton, Loading, Select } from './ui';

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
  const loadIndex = async () => {
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
  };
  const selectConversation = async (id: number) => {
    setConversationId(id);
    setError('');
    const detail = await api(`/copilot/conversations/${id}`);
    setMessages(detail.messages);
    if (detail.studio_id) setStudioId(detail.studio_id);
  };
  useEffect(() => {
    loadIndex().catch(() => {});
  }, []);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
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
  const send = async (preset?: string) => {
    const text = (preset ?? input).trim();
    if (!text || sending || creating) return;
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
      const index = await api('/copilot/conversations');
      setConversations(index.rows);
      if (response.savedOffer) toast(`Draft offer #${response.savedOffer.id} saved.`);
    } catch (e: any) {
      setError(e.message);
      setMessages(current => current.filter(item => !String(item.id).startsWith('local-')));
      setInput(text);
    } finally {
      setSending(false);
    }
  };
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
  const prompts = [
    `Give me 5 innovative offers for ${studioName} in January ${year}`,
    `How do we hit the April ${year} target at ${studioName}?`,
    `Which months in ${year} look hardest for ${studioName} and why?`,
    'Plan a monsoon challenge that lifts attendance and renewals',
  ];
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
                  ? `AI strategist · uses your ${year} plan, prices and offer history`
                  : 'Rules-based mode · AI not configured on the server'}
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
                    Offer ideas, how to close a month’s gap, campaign concepts, renewals due or studio performance.
                    Answers use this location’s real targets, prices and history. Nothing is approved or published by
                    chatting.
                  </p>
                  <div className="copilot-prompts">
                    {prompts.map(prompt => (
                      <button key={prompt} onClick={() => send(prompt)} disabled={creating || sending}>
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map(message => (
                <article key={message.id} className={`copilot-message ${message.role}`}>
                  <div className="copilot-message-label">
                    {message.role === 'user'
                      ? 'You'
                      : message.mode === 'deterministic'
                        ? 'Copilot · rules'
                        : message.mode === 'user'
                          ? 'You'
                          : 'P57 Copilot'}
                  </div>
                  <div className="copilot-message-content">
                    {message.role === 'user' ? message.content : <Markdown text={message.content} />}
                  </div>
                  <Attachment
                    attachments={message.attachments}
                    onOpenOffer={id => {
                      onClose();
                      navigate(`/offers/${id}/edit`);
                    }}
                    onBuild={concept => {
                      onClose();
                      navigate('/sales-plan/offers?view=manual', {
                        state: {
                          concept: { ...concept, studioId: concept.studioId || studioId || boot.studios[0]?.id, year },
                        },
                      });
                    }}
                  />
                </article>
              ))}
              {sending && (
                <div className="copilot-thinking">
                  <span />
                  <span />
                  <span /> Reading the plan and thinking…
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
                placeholder="Name a studio, month and outcome…"
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
                ? 'Rules and database calculations only'
                : 'AI answers from your plan data · check numbers before acting'}{' '}
              · Conversations are saved.
            </p>
          </section>
        </div>
      </aside>
    </div>
  );
}

// Minimal markdown: paragraphs, "- " bullets and **bold**.
function Markdown({ text }: { text: string }) {
  const inline = (line: string) =>
    line
      .split(/(\*\*[^*]+\*\*)/g)
      .map((part, i) =>
        part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : part,
      );
  const blocks: React.ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length)
      blocks.push(
        <ul key={blocks.length}>
          {list.map((l, i) => (
            <li key={i}>{inline(l)}</li>
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
  const actions = attachments.nextActions?.length ? (
    <div className="copilot-next">
      <strong>Next steps</strong>
      <ol>
        {attachments.nextActions.map((a: string, i: number) => (
          <li key={i}>{a}</li>
        ))}
      </ol>
    </div>
  ) : null;
  if (
    attachments.type === 'ai_answer' ||
    attachments.type === 'unrecognised' ||
    attachments.type === 'studio_required' ||
    attachments.type === 'help'
  )
    return (
      <>
        {ideas}
        {actions}
      </>
    );
  return (
    <>
      {ideas}
      {actions}
      <LegacyAttachment attachments={attachments} onOpenOffer={onOpenOffer} />
    </>
  );
}

function LegacyAttachment({ attachments, onOpenOffer }: { attachments: any; onOpenOffer: (id: number) => void }) {
  if (attachments.type === 'offer_concept') {
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
  if (attachments.type === 'sales_plan')
    return (
      <div className="copilot-attachment">
        <strong>Sales plan · {attachments.plan.workstreams.length} workstreams</strong>
        <span>
          {attachments.plan.concepts.length} offer concepts · {attachments.plan.renewalDue.packages} renewals due
        </span>
      </div>
    );
  if (attachments.type === 'renewal_report')
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
