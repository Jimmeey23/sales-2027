import React, { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CheckSquare, Image, Megaphone, Target } from 'lucide-react';
import { MONTHS, MONTHS_SHORT, money, number } from '../../types';
import { Badge, Input, TableScroll } from '../../components/ui';
import { ACTIVATIONS_2027, AD_SPLIT, CHANNEL_LABELS, CPL_BY_CITY, collateralFor } from '../../data/activations';
import { OFFER_LIBRARY } from '../../data/offerLibrary';
import { lakh, type PlanData } from './usePlanData';
import { selectedInMonth } from './TargetsTab';

export default function MarketingTab({ data }: { data: PlanData }) {
  const [month, setMonth] = useState(1),
    [paidShare, setPaidShare] = useState(45),
    [cplOverride, setCplOverride] = useState<number | ''>('');
  const cityCpl = (city: string) => (cplOverride === '' ? (CPL_BY_CITY[city] ?? 450) : Number(cplOverride));
  const budget = useMemo(
    () =>
      data.months.map((m, i) => {
        const spend = data.plans.reduce(
          (n, p) => n + ((p.months[i].leads * paidShare) / 100) * cityCpl(p.studio.city),
          0,
        );
        return {
          month: m.month,
          name: MONTHS_SHORT[i],
          spend,
          paidLeads: (m.leads * paidShare) / 100,
          target: m.target,
          newClient: m.newClient,
        };
      }),
    [data, paidShare, cplOverride],
  );
  const annual = budget.reduce((n, b) => n + b.spend, 0),
    row = data.months[month - 1],
    spend = budget[month - 1];
  const activation = ACTIVATIONS_2027[month - 1],
    hook = OFFER_LIBRARY.find(o => o.name.toLowerCase().startsWith(row.leadOffer.toLowerCase().split(' (')[0]))?.hook;
  const promos = selectedInMonth(data, month);
  return (
    <>
      <div className="ws-toolbar">
        <div>
          <h2>Marketing collateral & performance ads</h2>
          <p>
            Paid budget is sized from the leads each month needs. Adjust the assumptions to match your actual cost per
            lead.
          </p>
        </div>
        <div className="ws-assume">
          <label>
            Paid share of leads{' '}
            <Input
              type="number"
              min={0}
              max={100}
              value={paidShare}
              onChange={e => setPaidShare(Number(e.target.value) || 0)}
            />
            %
          </label>
          <label>
            Cost per lead ₹{' '}
            <Input
              type="number"
              min={0}
              placeholder="by city"
              value={cplOverride}
              onChange={e => setCplOverride(e.target.value === '' ? '' : Number(e.target.value))}
            />
          </label>
        </div>
      </div>
      <div className="ws-kpis">
        <div className="ws-kpi" style={{ '--c': '#3892b2' } as React.CSSProperties}>
          <span>Annual paid media</span>
          <strong>{lakh(annual)}</strong>
          <small>{data.annual ? `${((annual / data.annual) * 100).toFixed(1)}% of revenue target` : ''}</small>
        </div>
        <div className="ws-kpi" style={{ '--c': '#26776c' } as React.CSSProperties}>
          <span>Paid leads</span>
          <strong>{number(budget.reduce((n, b) => n + b.paidLeads, 0))}</strong>
          <small>{paidShare}% of all leads</small>
        </div>
        <div className="ws-kpi" style={{ '--c': '#b25938' } as React.CSSProperties}>
          <span>Scenario ROAS (new clients)</span>
          <strong>
            {annual
              ? `${((data.months.reduce((n, m) => n + m.newClient, 0) * paidShare) / 100 / annual).toFixed(1)}×`
              : '—'}
          </strong>
          <small>assumes paid leads earn the same revenue share as their lead share</small>
        </div>
        <div className="ws-kpi" style={{ '--c': '#b47039' } as React.CSSProperties}>
          <span>CPL planning assumption</span>
          <strong>
            {cplOverride === '' ? `₹${CPL_BY_CITY.Mumbai} / ₹${CPL_BY_CITY.Bengaluru}` : `₹${cplOverride}`}
          </strong>
          <small>{cplOverride === '' ? 'Mumbai / Bengaluru · editable defaults' : 'editable for all locations'}</small>
        </div>
      </div>
      <div className="ws-card">
        <h3>Monthly paid budget</h3>
        <div style={{ height: 220 }}>
          <ResponsiveContainer>
            <BarChart
              data={budget}
              onClick={(e: any) => e?.activeLabel && setMonth(MONTHS_SHORT.indexOf(e.activeLabel) + 1)}
            >
              <CartesianGrid stroke="#ebe6e1" vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <YAxis tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} tickLine={false} axisLine={false} width={52} />
              <Tooltip formatter={(v: any) => money(v)} />
              <Bar dataKey="spend" name="Paid media" fill="#245f57" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="ws-month-pills">
        {MONTHS_SHORT.map((m, i) => (
          <button key={m} className={month === i + 1 ? 'active' : ''} onClick={() => setMonth(i + 1)}>
            {m}
          </button>
        ))}
      </div>
      <div className="ws-split">
        <div className="ws-card">
          <h3>
            <Megaphone size={16} /> {MONTHS[month - 1]} performance ads · {money(spend.spend)}
          </h3>
          <p className="muted">
            Campaign: <b>{row.leadOffer}</b>
            {hook && <> · hook “{hook}”</>}
          </p>
          {AD_SPLIT.map(([key, share, audience, goal]) => (
            <div key={key} className="ws-adset">
              <div>
                <strong>{CHANNEL_LABELS[key]}</strong>
                <span>{audience}</span>
                <em>Goal: {goal}</em>
              </div>
              <div>
                <b>{money(spend.spend * share)}</b>
                <small>{(share * 100).toFixed(0)}%</small>
              </div>
            </div>
          ))}
          <div className="ws-creative">
            <b>Creative angles</b>
            <ul>
              <li>Offer-led: “{row.leadOffer}” — benefit in the first 2 seconds, price/benefit on screen.</li>
              <li>Community: real members in “{activation.challenge[0]}” — UGC reel, leaderboard moments.</li>
              <li>Event: “{activation.event[0]}” — RSVP story ads to a 5 km radius.</li>
              <li>Retargeting: trainer close-ups + testimonial, CTA “Book your first class”.</li>
            </ul>
          </div>
        </div>
        <div className="ws-card">
          <h3>
            <Image size={16} /> Collateral checklist
          </h3>
          <TableScroll>
            <table className="data-table ws-table">
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Formats</th>
                  <th>Channel</th>
                  <th>Due</th>
                </tr>
              </thead>
              <tbody>
                {collateralFor(row.leadOffer, activation).map(c => (
                  <tr key={c.asset}>
                    <td>
                      <CheckSquare size={13} /> <strong>{c.asset}</strong>
                    </td>
                    <td>{c.formats}</td>
                    <td>{c.channel}</td>
                    <td>
                      <Badge tone="amber">{c.due}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
          {promos.length > 0 && (
            <>
              <h4 className="ws-h4">
                <Target size={14} /> Offers needing creative this month
              </h4>
              {promos.map(o => (
                <div key={o.id} className="ws-offer-line">
                  <div>
                    <strong>{o.name}</strong>
                    <span>
                      {o.studio} · {o.headline || o.benefit}
                    </span>
                  </div>
                  <div>
                    <Badge tone="purple">Story · Reel · WhatsApp</Badge>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </>
  );
}
