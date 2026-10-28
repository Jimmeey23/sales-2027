import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  Flag,
  Handshake,
  HeartHandshake,
  LayoutGrid,
  Megaphone,
  PartyPopper,
  Rows3,
  Trophy,
} from 'lucide-react';
import { MONTHS, MONTHS_SHORT, money } from '../../types';
import { Badge, Button } from '../../components/ui';
import { api } from '../../api';
import { useApp } from '../../App';
import { ACTIVATIONS_2027 } from '../../data/activations';
import { lakh, type PlanData } from './usePlanData';

export function monthActivations(data: PlanData, month: number) {
  const base = ACTIVATIONS_2027[month - 1],
    seen = new Set<string>();
  const local = data.activations.filter(
    a => String(a.Month).startsWith(MONTHS_SHORT[month - 1]) && !seen.has(a.Activation) && seen.add(a.Activation),
  );
  return { base, local };
}

export default function CampaignsTab({ data, onSaved }: { data: PlanData; onSaved: () => Promise<unknown> }) {
  const [layout, setLayout] = useState('timeline'),
    navigate = useNavigate(),
    [editMonth, setEditMonth] = useState<number | null>(null),
    [draft, setDraft] = useState<any>(null),
    [saving, setSaving] = useState(false);
  const { year, can, toast } = useApp();
  const selectedPlan = data.plans.length === 1 ? data.plans[0] : null;
  // Editing activations is a permission, not a passcode. The passcode is only for AI.
  const canEdit = Boolean(selectedPlan && can('target_edit'));
  const campaignsIn = (month: number) => data.campaigns.filter(c => Number(String(c.start_date).slice(5, 7)) === month);
  const openEditor = (month: number, base: any) => {
    const saved = selectedPlan?.detail.plans.find((p: any) => p.month === month);
    const overrides = saved?.content?.activations || {};
    setEditMonth(month);
    setDraft({
      activations: Object.fromEntries(
        ['challenge', 'event', 'partner', 'retention'].map(key => [
          key,
          {
            title:
              overrides[key]?.title ??
              (key === 'challenge'
                ? base.challenge[0]
                : key === 'event'
                  ? base.event[0]
                  : key === 'partner'
                    ? base.partner[0]
                    : 'Members'),
            text:
              overrides[key]?.text ??
              (key === 'challenge'
                ? base.challenge[1]
                : key === 'event'
                  ? base.event[1]
                  : key === 'partner'
                    ? base.partner[1]
                    : base.retention),
          },
        ]),
      ),
      customActivations: [...(saved?.content?.customActivations || [])],
    });
  };
  const saveEditor = async () => {
    if (!selectedPlan || editMonth === null || !draft) return;
    const current = selectedPlan.detail.plans.find((p: any) => p.month === editMonth);
    setSaving(true);
    try {
      await api(`/studio-plans/${selectedPlan.studio.id}/${year}/${editMonth}`, {
        method: 'PUT',
        body: JSON.stringify({
          content: {
            ...(current?.content || {}),
            activations: draft.activations,
            customActivations: draft.customActivations,
          },
        }),
      });
      await onSaved();
      setEditMonth(null);
      setDraft(null);
      toast('Monthly activations saved.');
    } catch (error: any) {
      toast(error.message || 'Could not save activations.', 'error');
    } finally {
      setSaving(false);
    }
  };
  return (
    <>
      <div className="ws-toolbar">
        <div>
          <h2>Campaigns, challenges & activations</h2>
          <p>
            One hero campaign per month, backed by a challenge, a community activation, a partnership and a retention
            play.
          </p>
        </div>
        <div className="ws-segmented">
          {[
            ['timeline', 'Timeline', Rows3],
            ['cards', 'Month cards', LayoutGrid],
          ].map(([id, label, Icon]: any) => (
            <button key={id} className={layout === id ? 'active' : ''} onClick={() => setLayout(id)}>
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
      </div>
      {can('target_edit') && !selectedPlan && (
        <p className="ws-act-edit-note">Choose a location from the location bar to add or edit its activations.</p>
      )}
      <div className={layout === 'timeline' ? 'ws-timeline' : 'ws-camp-grid'}>
        {data.months.map(m => {
          const { base, local } = monthActivations(data, m.month),
            scheduled = campaignsIn(m.month);
          return (
            <article key={m.month} className="ws-camp">
              <header>
                <div>
                  <span>{MONTHS[m.month - 1]}</span>
                  <strong>{m.leadOffer}</strong>
                  <em>{m.objective}</em>
                </div>
                <b>{lakh(m.target)}</b>
              </header>
              <div className="ws-camp-body">
                <Item
                  icon={Trophy}
                  tone="purple"
                  label="Challenge"
                  title={
                    selectedPlan?.detail.plans.find((p: any) => p.month === m.month)?.content?.activations?.challenge
                      ?.title ||
                    (local[0]?.Format?.toLowerCase().includes('challenge') ? local[0].Activation : base.challenge[0])
                  }
                  text={
                    selectedPlan?.detail.plans.find((p: any) => p.month === m.month)?.content?.activations?.challenge
                      ?.text ||
                    (local[0]?.Format?.toLowerCase().includes('challenge') ? local[0].Mechanics : base.challenge[1])
                  }
                />
                <Item
                  icon={PartyPopper}
                  tone="coral"
                  label="Activation / event"
                  title={
                    selectedPlan?.detail.plans.find((p: any) => p.month === m.month)?.content?.activations?.event
                      ?.title ||
                    local.find(a => !a.Format?.toLowerCase().includes('challenge'))?.Activation ||
                    base.event[0]
                  }
                  text={
                    selectedPlan?.detail.plans.find((p: any) => p.month === m.month)?.content?.activations?.event
                      ?.text ||
                    local.find(a => !a.Format?.toLowerCase().includes('challenge'))?.Mechanics ||
                    base.event[1]
                  }
                />
                <Item
                  icon={Handshake}
                  tone="gold"
                  label="Partnership"
                  title={
                    selectedPlan?.detail.plans.find((p: any) => p.month === m.month)?.content?.activations?.partner
                      ?.title || base.partner[0]
                  }
                  text={
                    selectedPlan?.detail.plans.find((p: any) => p.month === m.month)?.content?.activations?.partner
                      ?.text || base.partner[1]
                  }
                />
                <Item
                  icon={HeartHandshake}
                  tone="green"
                  label="Retention play"
                  title={
                    selectedPlan?.detail.plans.find((p: any) => p.month === m.month)?.content?.activations?.retention
                      ?.title || 'Members'
                  }
                  text={
                    selectedPlan?.detail.plans.find((p: any) => p.month === m.month)?.content?.activations?.retention
                      ?.text || base.retention
                  }
                />
                {(
                  selectedPlan?.detail.plans.find((p: any) => p.month === m.month)?.content?.customActivations || []
                ).map((item: any) => (
                  <Item
                    key={item.id}
                    icon={PartyPopper}
                    tone="coral"
                    label={item.label || 'Custom activation'}
                    title={item.title}
                    text={item.text}
                  />
                ))}
              </div>
              {canEdit && (
                <div className="ws-act-actions">
                  <Button variant="secondary" size="sm" onClick={() => openEditor(m.month, base)}>
                    Manage activations
                  </Button>
                </div>
              )}
              <footer>
                <span>
                  <Flag size={12} /> KPI: {local[0]?.['Primary KPI'] || base.kpi}
                </span>
                {local[0]?.['Participant target'] && <span>Target {local[0]['Participant target']} participants</span>}
                {scheduled.length > 0 && (
                  <span className="ws-sched">
                    <Megaphone size={12} />
                    {scheduled.length} scheduled:{' '}
                    {scheduled
                      .slice(0, 2)
                      .map(c => c.name)
                      .join(', ')}
                    {scheduled.length > 2 ? '…' : ''}{' '}
                    {scheduled[0]?.target_revenue
                      ? `· ${money(
                          scheduled.reduce((n, c) => n + (c.target_revenue || 0), 0),
                          true,
                        )}`
                      : ''}
                  </span>
                )}
              </footer>
              {local.length > 0 && local[0]?.Why && <p className="ws-why">Why: {local[0].Why}</p>}
            </article>
          );
        })}
      </div>
      {editMonth !== null && draft && (
        <div
          className="ws-act-editor"
          role="dialog"
          aria-modal="true"
          aria-label={`Edit ${MONTHS[editMonth - 1]} activations`}
        >
          <div className="ws-act-editor-card">
            <header>
              <h3>
                {MONTHS[editMonth - 1]} activations · {selectedPlan?.studio.name}
              </h3>
              <button type="button" aria-label="Close" onClick={() => setEditMonth(null)}>
                ×
              </button>
            </header>
            {['challenge', 'event', 'partner', 'retention'].map(key => (
              <fieldset key={key}>
                <legend>{key === 'event' ? 'Activation / event' : key[0].toUpperCase() + key.slice(1)}</legend>
                <label>
                  Title
                  <input
                    value={draft.activations[key].title}
                    onChange={e =>
                      setDraft((d: any) => ({
                        ...d,
                        activations: { ...d.activations, [key]: { ...d.activations[key], title: e.target.value } },
                      }))
                    }
                  />
                </label>
                <label>
                  Details
                  <textarea
                    value={draft.activations[key].text}
                    onChange={e =>
                      setDraft((d: any) => ({
                        ...d,
                        activations: { ...d.activations, [key]: { ...d.activations[key], text: e.target.value } },
                      }))
                    }
                  />
                </label>
              </fieldset>
            ))}
            <div className="ws-act-custom-head">
              <strong>Additional activations</strong>
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  setDraft((d: any) => ({
                    ...d,
                    customActivations: [
                      ...d.customActivations,
                      { id: `custom-${Date.now()}`, label: 'Custom activation', title: '', text: '' },
                    ],
                  }))
                }
              >
                Add activation
              </Button>
            </div>
            {draft.customActivations.map((item: any, index: number) => (
              <fieldset key={item.id}>
                <legend>Additional activation {index + 1}</legend>
                <label>
                  Label
                  <input
                    value={item.label}
                    onChange={e =>
                      setDraft((d: any) => ({
                        ...d,
                        customActivations: d.customActivations.map((x: any) =>
                          x.id === item.id ? { ...x, label: e.target.value } : x,
                        ),
                      }))
                    }
                  />
                </label>
                <label>
                  Title
                  <input
                    value={item.title}
                    onChange={e =>
                      setDraft((d: any) => ({
                        ...d,
                        customActivations: d.customActivations.map((x: any) =>
                          x.id === item.id ? { ...x, title: e.target.value } : x,
                        ),
                      }))
                    }
                  />
                </label>
                <label>
                  Details
                  <textarea
                    value={item.text}
                    onChange={e =>
                      setDraft((d: any) => ({
                        ...d,
                        customActivations: d.customActivations.map((x: any) =>
                          x.id === item.id ? { ...x, text: e.target.value } : x,
                        ),
                      }))
                    }
                  />
                </label>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() =>
                    setDraft((d: any) => ({
                      ...d,
                      customActivations: d.customActivations.filter((x: any) => x.id !== item.id),
                    }))
                  }
                >
                  Delete activation
                </Button>
              </fieldset>
            ))}
            <footer>
              <Button variant="secondary" onClick={() => setEditMonth(null)}>
                Cancel
              </Button>
              <Button disabled={saving} onClick={() => void saveEditor()}>
                {saving ? 'Saving…' : 'Save activations'}
              </Button>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}

function Item({ icon: Icon, tone, label, title, text }: any) {
  return (
    <div className={`ws-act ws-act-${tone}`}>
      <Icon size={15} />
      <div>
        <Badge tone="neutral">{label}</Badge>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
    </div>
  );
}
