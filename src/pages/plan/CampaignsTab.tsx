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

export default function CampaignsTab({ data }: { data: PlanData }) {
  const [layout, setLayout] = useState('timeline'),
    navigate = useNavigate();
  const campaignsIn = (month: number) => data.campaigns.filter(c => Number(String(c.start_date).slice(5, 7)) === month);
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
          <button onClick={() => navigate('/calendar')}>
            <CalendarDays size={15} />
            Open calendar
          </button>
        </div>
      </div>
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
                    local[0]?.Format?.toLowerCase().includes('challenge') ? local[0].Activation : base.challenge[0]
                  }
                  text={local[0]?.Format?.toLowerCase().includes('challenge') ? local[0].Mechanics : base.challenge[1]}
                />
                <Item
                  icon={PartyPopper}
                  tone="coral"
                  label="Activation / event"
                  title={local.find(a => !a.Format?.toLowerCase().includes('challenge'))?.Activation || base.event[0]}
                  text={local.find(a => !a.Format?.toLowerCase().includes('challenge'))?.Mechanics || base.event[1]}
                />
                <Item icon={Handshake} tone="gold" label="Partnership" title={base.partner[0]} text={base.partner[1]} />
                <Item icon={HeartHandshake} tone="green" label="Retention play" title="Members" text={base.retention} />
              </div>
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
      {data.campaigns.length === 0 && (
        <p className="muted" style={{ marginTop: 12 }}>
          No campaigns are scheduled in the calendar yet.{' '}
          <Button size="sm" variant="ghost" onClick={() => navigate('/calendar')}>
            Schedule one
          </Button>
        </p>
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
