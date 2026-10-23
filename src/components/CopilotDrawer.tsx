import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUp, Bot, CheckCircle2, MessageSquarePlus, Sparkles, Trash2, X } from 'lucide-react';
import { api, post } from '../api';
import { useApp } from '../App';
import { money, number } from '../types';
import { Badge, Button, Callout, IconButton, Loading, Select } from './ui';

export default function CopilotDrawer({ onClose }: { onClose: () => void }) {
  const { boot, studioId: globalStudio, year, toast } = useApp(), navigate = useNavigate();
  const [capability, setCapability] = useState<any>(null), [conversations, setConversations] = useState<any[]>([]);
  const [conversationId, setConversationId] = useState<number | null>(null), [messages, setMessages] = useState<any[]>([]);
  const [studioId, setStudioId] = useState<number | null>(globalStudio), [mode, setMode] = useState('deterministic');
  const [input, setInput] = useState(''), [loading, setLoading] = useState(true), [sending, setSending] = useState(false), [creating, setCreating] = useState(false), [error, setError] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const loadIndex = async () => {
    setLoading(true); setError('');
    try {
      const [capability, index] = await Promise.all([api('/copilot/capability'), api('/copilot/conversations')]);
      setCapability(capability); setConversations(index.rows);
      if (capability.providerConfigured) setMode('auto');
      if (index.rows.length && !conversationId) await selectConversation(index.rows[0].id);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };
  const selectConversation = async (id: number) => {
    setConversationId(id); setError('');
    const detail = await api(`/copilot/conversations/${id}`); setMessages(detail.messages); if (detail.studio_id) setStudioId(detail.studio_id);
  };
  useEffect(() => { loadIndex().catch(() => {}); }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, sending]);
  useEffect(() => { const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); document.addEventListener('keydown', handler); return () => document.removeEventListener('keydown', handler); }, [onClose]);
  const newConversation = async () => {
    if (creating || sending) return;
    setCreating(true); setError(''); setInput('');
    try { const created = await post('/copilot/conversations', { studioId, title: 'New commercial conversation' }); setConversationId(created.id); setMessages([]); const index = await api('/copilot/conversations'); setConversations(index.rows); }
    catch (e: any) { toast(e.message, 'error'); }
    finally { setCreating(false); }
  };
  const send = async (preset?: string) => {
    const text = (preset ?? input).trim(); if (!text || sending || creating) return;
    setSending(true); setError(''); setInput('');
    try {
      let id = conversationId;
      if (!id) { const created = await post('/copilot/conversations', { studioId, title: 'New commercial conversation' }); id = created.id; setConversationId(id); }
      const optimistic = { id: `local-${Date.now()}`, role: 'user', content: text, attachments: {} };
      setMessages(current => [...current, optimistic]);
      const response = await post(`/copilot/conversations/${id}/messages`, { message: text, mode, studioId });
      setMessages(current => [...current, response.message]);
      const index = await api('/copilot/conversations'); setConversations(index.rows);
      if (response.savedOffer) toast(`Draft offer #${response.savedOffer.id} saved.`);
    } catch (e: any) { setError(e.message); setMessages(current => current.filter(item => !String(item.id).startsWith('local-'))); setInput(text); }
    finally { setSending(false); }
  };
  const remove = async () => {
    if (!conversationId || !window.confirm('Delete this saved Copilot conversation? Offers already saved remain unchanged.')) return;
    try { await api(`/copilot/conversations/${conversationId}`, { method: 'DELETE' }); setConversationId(null); setMessages([]); await loadIndex(); }
    catch (e: any) { toast(e.message, 'error'); }
  };
  const prompts = ['Build a complete sales plan for January 2027', 'Build a 3-for-2 newcomer offer', 'Show renewals due in November 2026 at 60% conversion'];
  return <div className="copilot-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
    <aside className="copilot-panel" role="dialog" aria-modal="true" aria-label="P57 Copilot">
      <header className="copilot-header"><div className="copilot-title"><span className="copilot-orb"><Bot size={21}/></span><div><h2>P57 Copilot</h2><p>{capability?.providerConfigured ? 'Provider narrative available · deterministic finance' : 'Deterministic Copilot · not AI'}</p></div></div><div className="row-actions"><IconButton label="New conversation" onClick={newConversation} disabled={creating || sending}><MessageSquarePlus size={18}/></IconButton><IconButton label="Close Copilot" onClick={onClose}><X size={20}/></IconButton></div></header>
      <div className="copilot-body">
        <aside className="copilot-history"><div className="copilot-history-title">Saved conversations <Badge>{conversations.length}</Badge></div>{conversations.map(item => <button key={item.id} className={conversationId === item.id ? 'active' : ''} onClick={() => selectConversation(item.id).catch(e => setError(e.message))}><strong>{item.title}</strong><span>{item.studio || 'Studio not selected'}</span><small>{new Date(item.updated_at).toLocaleDateString('en-IN')}</small></button>)}{!conversations.length && <p>Your saved plans, offer concepts and answers will appear here.</p>}</aside>
        <section className="copilot-chat">
          <div className="copilot-controls"><Select aria-label="Copilot studio" disabled={creating || sending} value={studioId || ''} onChange={e => setStudioId(e.target.value ? Number(e.target.value) : null)}><option value="">Choose a studio</option>{boot.studios.map(studio => <option key={studio.id} value={studio.id}>{studio.name}</option>)}</Select><Select aria-label="Copilot mode" disabled={creating || sending} value={mode} onChange={e => setMode(e.target.value)}><option value="deterministic">Deterministic</option>{capability?.providerConfigured && <><option value="auto">Auto · provider</option><option value="ai">Provider narrative</option></>}</Select>{conversationId && <IconButton label="Delete conversation" onClick={remove}><Trash2 size={16}/></IconButton>}</div>
          <div className="copilot-messages">
            {!messages.length && <div className="copilot-welcome"><span><Sparkles size={24}/></span><h3>Build from the actual studio context.</h3><p>Ask for a sales plan, policy-checked offer, renewal-due report or observed attendance and revenue intelligence. Nothing is approved or published by chatting.</p><div className="copilot-prompts">{prompts.map(prompt => <button key={prompt} onClick={() => send(prompt)} disabled={creating || sending}>{prompt}</button>)}</div></div>}
            {messages.map(message => <article key={message.id} className={`copilot-message ${message.role}`}><div className="copilot-message-label">{message.role === 'user' ? 'You' : message.mode === 'deterministic' ? 'Deterministic Copilot' : message.mode === 'user' ? 'You' : 'Validated provider narrative'}</div><div className="copilot-message-content">{message.content}</div><Attachment attachments={message.attachments} onOpenOffer={id => { onClose(); navigate(`/offers/${id}/edit`); }}/></article>)}
            {sending && <div className="copilot-thinking"><span/><span/><span/> Validating studio data and economics…</div>}
            {loading && <Loading label="Loading saved conversations…"/>}<div ref={endRef}/>
          </div>
          {error && <Callout tone="danger">{error}</Callout>}
          <form className="copilot-composer" onSubmit={e => { e.preventDefault(); send(); }}><textarea value={input} onChange={e => setInput(e.target.value)} placeholder="Name a studio, month and outcome…" rows={2} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}/><Button type="submit" disabled={!input.trim() || sending || creating} aria-label="Send to Copilot"><ArrowUp size={18}/></Button></form>
          <p className="copilot-disclaimer">{mode === 'deterministic' ? 'Validated rules and database calculations · no AI claim' : 'Provider narrative is schema-validated · finances remain deterministic'} · Plans and conversations persist on the server.</p>
        </section>
      </div>
    </aside>
  </div>;
}

function Attachment({ attachments, onOpenOffer }: { attachments: any; onOpenOffer: (id: number) => void }) {
  if (!attachments?.type) return null;
  if (attachments.type === 'offer_concept') {
    const offer = attachments.concept, result = offer?.financials;
    return <div className="copilot-attachment"><div><CheckCircle2 size={16}/><strong>{offer.name}</strong></div><dl><div><dt>Selling price</dt><dd>{money(result?.sellingPrice)}</dd></div><div><dt>Scenario revenue</dt><dd>{money(result?.expectedRevenue, true)}</dd></div><div><dt>Benefit</dt><dd>{number(result?.effectiveDiscountPercent, 1)}%</dd></div></dl>{attachments.savedOfferId && <Button size="sm" variant="secondary" onClick={() => onOpenOffer(attachments.savedOfferId)}>Open saved draft #{attachments.savedOfferId}</Button>}</div>;
  }
  if (attachments.type === 'sales_plan') return <div className="copilot-attachment"><strong>Sales plan · {attachments.plan.workstreams.length} workstreams</strong><span>{attachments.plan.concepts.length} offer concepts · {attachments.plan.renewalDue.packages} renewals due</span></div>;
  if (attachments.type === 'renewal_report') return <div className="copilot-attachment"><strong>{number(attachments.report.summary.duePackages)} open packages due</strong><span>{money(attachments.report.summary.paidDueValue, true)} known paid value · {money(attachments.report.summary.listDueValue, true)} matched list value</span></div>;
  return null;
}
