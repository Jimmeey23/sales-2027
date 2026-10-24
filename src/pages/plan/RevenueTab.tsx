import React, { useMemo } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { ArrowRight, Lightbulb, LifeBuoy, Repeat, Sparkles, UserPlus, UsersRound, Wallet } from 'lucide-react';
import { MONTHS_SHORT, money, number } from '../../types';
import { TableScroll } from '../../components/ui';
import { EXECUTION_RHYTHM } from '../../data/2027Playbooks';
import { studioPlaybook } from '../../data/planDefaults';
import { LOCATION_COLORS } from '../../data/locations';
import { lakh, type PlanData } from './usePlanData';
import { useSources } from './TargetsTab';

const sum = (rows: any[], key: string) => rows.reduce((n, r) => n + (Number(r[key]) || 0), 0);
const rate = (a: number, b: number) => (b ? `${((a / b) * 100).toFixed(1)}%` : '—');

export default function RevenueTab({ data }: { data: PlanData }) {
  const SOURCES = useSources();
  const m = data.months;
  const t = useMemo(
    () =>
      Object.fromEntries(
        [
          'newClient',
          'renewal',
          'reactivation',
          'other',
          'leads',
          'trials',
          'buyers',
          'renewalsDue',
          'renewalPurchases',
          'reactivated',
          'lapsedTouches',
          'target',
        ].map(k => [k, sum(m, k)]),
      ) as Record<string, number>,
    [m],
  );
  const pie = SOURCES.map(s => ({ name: s.label, value: t[s.key], color: s.color })).filter(x => x.value > 0);
  const streams = [
    {
      key: 'newClient',
      icon: UserPlus,
      title: 'New clients',
      value: t.newClient,
      steps: [
        ['Leads', number(t.leads)],
        ['Trials', `${number(t.trials)} · ${rate(t.trials, t.leads)} of leads`],
        ['New buyers', `${number(t.buyers)} · ${rate(t.buyers, t.trials)} of trials`],
        ['Avg first purchase', money(t.buyers ? t.newClient / t.buyers : 0)],
      ],
      logic:
        'Leads × lead-to-trial × trial-to-purchase × average first purchase. Trial conversion is the historical mature-cohort rate; lead-to-trial is a planning assumption.',
      levers: [
        'Answer every lead within 2 hours',
        '72-hour first-purchase perk after each trial',
        'Same-day, day-2, day-3 trial follow-up',
      ],
    },
    {
      key: 'renewal',
      icon: Repeat,
      title: 'Renewals & existing clients',
      value: t.renewal,
      steps: t.renewalsDue
        ? [
            ['Renewals due', number(t.renewalsDue)],
            ['Renewal purchases', `${number(t.renewalPurchases)} · ${rate(t.renewalPurchases, t.renewalsDue)} of due`],
            ['Avg renewal ticket', money(t.renewalPurchases ? t.renewal / t.renewalPurchases : 0)],
          ]
        : [
            ['Existing paying clients', number(t.renewalPurchases)],
            ['Avg spend', money(t.renewalPurchases ? t.renewal / t.renewalPurchases : 0)],
          ],
      logic:
        'Memberships expiring each month × renewal conversion × average renewal ticket (includes repeat pack purchases by active clients).',
      levers: [
        'T−14 usage-based renewal call',
        'WhatsApp T−7 and T−2; last chance T+7',
        'Upgrade 8+ visits/month members to 3M+',
      ],
    },
    {
      key: 'reactivation',
      icon: LifeBuoy,
      title: 'Reactivation',
      value: t.reactivation,
      steps: [
        ['Lapsed touches', number(t.lapsedTouches)],
        ['Reactivated', `${number(t.reactivated)} · ${rate(t.reactivated, t.lapsedTouches)} response`],
        ['Avg comeback spend', money(t.reactivated ? t.reactivation / t.reactivated : 0)],
      ],
      logic:
        'Lapsed (61–365 day) audience × monthly response rate × average repeat spend. Response is a planning assumption, not a forecast.',
      levers: [
        'Day-61 standing perk + free comeback class',
        'Personal call for ≥₹50k lifetime clients',
        'Monthly lapsed list with named owners',
      ],
    },
    {
      key: 'other',
      icon: Wallet,
      title: 'Other revenue',
      value: t.other,
      steps: [['Share of target', rate(t.other, t.target)]],
      logic: 'Gift cards, privates, workshops, retail and add-ons not attributed to the three main streams.',
      levers: [
        'Gift-card pushes in Oct and Dec',
        'Private-session upsell after assessments',
        'Workshops tied to monthly themes',
      ],
    },
  ];
  return (
    <>
      <div className="ws-split">
        <div className="ws-card">
          <h3>Where the {lakh(t.target)} comes from</h3>
          <div className="ws-donut">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={pie} dataKey="value" innerRadius={62} outerRadius={100} paddingAngle={2}>
                  {pie.map(p => (
                    <Cell key={p.name} fill={p.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => money(v)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="ws-donut-legend">
              {SOURCES.map(s => (
                <div key={s.key}>
                  <i style={{ background: s.color }} />
                  <span>{s.label}</span>
                  <b>{lakh(t[s.key])}</b>
                  <small>{rate(t[s.key], t.target)}</small>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="ws-card">
          <h3>Reasoning by location</h3>
          {data.plans.map(p => (
            <StudioReasoning key={p.studio.id} plan={p} />
          ))}
        </div>
      </div>

      <h2 className="ws-h2">How each stream reaches its number</h2>
      <div className="ws-stream-grid">
        {streams.map(s => {
          const Icon = s.icon,
            color = SOURCES.find(x => x.key === s.key)!.color;
          return (
            <div key={s.key} className="ws-stream" style={{ '--c': color } as React.CSSProperties}>
              <header>
                <Icon size={18} />
                <div>
                  <span>{s.title}</span>
                  <strong>{lakh(s.value)}</strong>
                </div>
                <small>{rate(s.value, t.target)}</small>
              </header>
              <ol className="ws-steps">
                {s.steps.map(([l, v], i) => (
                  <li key={l}>
                    <span>{l}</span>
                    <b>{v}</b>
                    {i < s.steps.length - 1 && <ArrowRight size={12} />}
                  </li>
                ))}
              </ol>
              <p className="ws-logic">
                <b>Logic · </b>
                {s.logic}
              </p>
              <ul className="ws-levers">
                {s.levers.map(l => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="ws-card">
        <h3>Month-by-month calculation</h3>
        <TableScroll>
          <table className="data-table ws-table">
            <thead>
              <tr>
                <th>Month</th>
                <th className="num">Target</th>
                <th>New clients</th>
                <th>Renewals</th>
                <th>Reactivation</th>
                <th className="num">Other</th>
              </tr>
            </thead>
            <tbody>
              {m.map(r => (
                <tr key={r.month}>
                  <td>
                    <strong>{MONTHS_SHORT[r.month - 1]}</strong>
                  </td>
                  <td className="num">
                    <strong>{lakh(r.target)}</strong>
                  </td>
                  <td>
                    <b>{lakh(r.newClient)}</b>
                    <span>
                      {number(r.leads)} leads → {number(r.trials)} trials → {number(r.buyers)} buyers ×{' '}
                      {money(r.buyers ? r.newClient / r.buyers : 0)}
                    </span>
                  </td>
                  <td>
                    <b>{lakh(r.renewal)}</b>
                    <span>
                      {r.renewalsDue ? `${number(r.renewalsDue)} due → ` : ''}
                      {number(r.renewalPurchases)} purchases ×{' '}
                      {money(r.renewalPurchases ? r.renewal / r.renewalPurchases : 0)}
                    </span>
                  </td>
                  <td>
                    <b>{lakh(r.reactivation)}</b>
                    <span>
                      {r.lapsedTouches ? `${number(r.lapsedTouches)} touches → ${number(r.reactivated)} back` : '—'}
                    </span>
                  </td>
                  <td className="num">{lakh(r.other)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
      </div>

      <div className="ws-split">
        <div className="ws-card">
          <h3>
            <UsersRound size={16} /> Weekly execution rhythm
          </h3>
          <ul className="ws-rhythm">
            {EXECUTION_RHYTHM.map(([k, v]) => (
              <li key={k}>
                <b>{k}</b>
                <span>{v}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="ws-card">
          <h3>
            <Sparkles size={16} /> Always-on rules & recovery
          </h3>
          {data.plans.slice(0, 1).map(p => (
            <ul key={p.studio.id} className="ws-rhythm">
              {(p.detail.items || [])
                .filter((i: any) => i.enabled && ['always_on', 'recovery'].includes(i.section))
                .map((i: any) => (
                  <li key={i.id}>
                    <b>{i.title}</b>
                    <span>{i.body}</span>
                  </li>
                ))}
            </ul>
          ))}
        </div>
      </div>
    </>
  );
}

function StudioReasoning({ plan }: { plan: any }) {
  const pb = studioPlaybook(plan.studio.name),
    a = plan.detail.targets[0]?.assumptions || {},
    cr = a.conversionRates || {};
  const insights: string[] = pb
    ? [pb.insight, pb.priority]
    : (plan.detail.insights || [])
        .filter((x: string) => (plan.studio.name === 'Pop-up') === /pop-up/i.test(x))
        .slice(0, 3);
  return (
    <div className="ws-reason" style={{ '--c': LOCATION_COLORS[plan.studio.name] } as React.CSSProperties}>
      <header>
        <strong>{plan.studio.name}</strong>
        <span>
          {lakh(plan.annual)} ·{' '}
          {plan.lastYear ? `${((plan.annual / plan.lastYear - 1) * 100).toFixed(0)}% vs LY` : 'new baseline'}
        </span>
      </header>
      {insights.map(x => (
        <p key={x}>
          <Lightbulb size={13} />
          {x.replace(/^\d+\.\s*/, '')}
        </p>
      ))}
      {cr.trialToPurchaseRate && (
        <div className="ws-chips">
          <span>Trial → buy {(cr.trialToPurchaseRate * 100).toFixed(1)}%</span>
          <span>Attendance {(cr.bookingToAttendanceRate * 100).toFixed(0)}%</span>
          {a.reactivationAudience && <span>Lapsed pool {number(a.reactivationAudience)}</span>}
        </div>
      )}
    </div>
  );
}
