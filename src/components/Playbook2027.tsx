import React, { useMemo, useState } from 'react';
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useApp } from '../App';
import { useLoad } from '../hooks';
import { PLAYBOOK_2027 } from '../data/playbook2027';
import { Badge, Card, CardHeader, ErrorState, Loading, TableScroll } from './ui';

// ---------- types (data lives in src/data/playbook2027.ts) ----------
export type PlaybookKey = 'Kemps Corner' | 'Bandra' | 'Kenkere House' | 'Pop-up';
type Lever = { id: string; name: string; value: number; math: string; why: string };
type Offer = {
  name: string;
  tag: string;
  months: string;
  audience: string;
  mechanic: string;
  economics: string;
  logic: string;
  kpi: string;
  lever: string | null;
};
type MonthRow = {
  month: string;
  event: string;
  theme: string;
  focus: string;
  offers: string[];
  actions: string[];
  why: string;
};
export type StudioPlaybook = {
  name: string;
  city: string;
  headline: string;
  snapshot: Array<[string, string, string, boolean]>;
  diagnosis: Array<{ title: string; stat: string; detail: string; implication: string }>;
  build: {
    forecast2026: number;
    momentum: number;
    baseline: number;
    levers: Lever[];
    leverTotal: number;
    haircut: number;
    projection: number;
    appTargetAtBuild: number;
  };
  offers: Offer[];
  months: MonthRow[];
  rhythm: Array<[string, string]>;
  scorecard: Array<[string, string, string, string]>;
  funnel: {
    newShare: number;
    avgFirstPurchase: number;
    visitsPerBuyer: number;
    leadsPerVisit: number;
    renewalShare: number;
    winbackShare: number;
    convNow: number;
    convTarget: number;
  };
  channels: Array<[string, number, number, number]>;
  slots: Array<[string, number, number, number]>;
  monthly: Record<string, Array<number | null>>;
  seasonality: number[];
  entry: Array<[string, number, number, number, number]>;
};
export type PlaybookData = {
  meta: {
    generated: string;
    ttm: string;
    capacityWindow: string;
    sources: string[];
    method: string[];
    usageRenewal: Array<[string, number, number]>;
  };
  studios: Record<PlaybookKey, StudioPlaybook>;
};

const KEYS: PlaybookKey[] = ['Kemps Corner', 'Bandra', 'Kenkere House', 'Pop-up'];
const POPUP_VENUES = ['Copper + Cloves', 'Plash Pilates'];
export const playbookKeyFor = (name?: string | null): PlaybookKey | null =>
  name && POPUP_VENUES.includes(name) ? 'Pop-up' : KEYS.includes(name as PlaybookKey) ? (name as PlaybookKey) : null;

const lakh = (v: number | null | undefined, d = 1) =>
  v == null ? '—' : `${v < 0 ? '−' : ''}₹${(Math.abs(v) / 1e5).toFixed(d)}L`;
const crore = (v: number | null | undefined) => (v == null ? '—' : `₹${(v / 1e7).toFixed(2)} Cr`);
const int = (v: number) => Math.round(v).toLocaleString('en-IN');
const TAG_TONE: Record<string, 'green' | 'amber' | 'blue' | 'purple' | 'red' | 'neutral' | 'dark'> = {
  Conversion: 'green',
  Acquisition: 'blue',
  'Win-back': 'amber',
  Renewal: 'purple',
  Retention: 'purple',
  Capacity: 'dark',
  Upsell: 'blue',
  Operations: 'neutral',
};

export default function Playbook2027({ scope, showMonths = true }: { scope?: string | null; showMonths?: boolean }) {
  const { boot, scenario } = useApp();
  const fixed = playbookKeyFor(scope);
  // The location always comes from the global location bar (Kemps Corner if none is chosen).
  const key = fixed || 'Kemps Corner';
  const pb = PLAYBOOK_2027.studios[key];
  const studio = boot.studios.find(s => s.name === key);
  const {
    data: live,
    loading,
    error,
    reload,
  } = useLoad<any>(
    () => import('../api').then(({ api }) => api(`/targets/breakdown?year=2027&studio=${studio?.id}`)),
    [studio?.id, scenario],
  );
  const [openOffer, setOpenOffer] = useState<string | null>(null);
  const [openLever, setOpenLever] = useState<string | null>(null);

  // Targets and volumes come from the one target breakdown (Targets tab) — never recomputed here.
  const bd = live?.locations?.[0];
  const liveTarget: number = Number(bd?.total?.target || 0) || pb.build.appTargetAtBuild;
  const monthPlan = useMemo(
    () =>
      pb.months.map((m, i) => {
        const x = bd?.months?.[i];
        return {
          ...m,
          target: Number(x?.target || 0),
          buyers: Number(x?.newPaying || 0),
          visits: Number(x?.firstVisits || 0),
          leads: Number(x?.leads || 0),
        };
      }),
    [pb, bd],
  );

  const chart = useMemo(
    () =>
      monthPlan.map((m, i) => ({
        month: m.month,
        '2025 actual': pb.monthly['2025']?.[i] ?? null,
        '2026 actual': pb.monthly['2026']?.[i] ?? null,
        '2027 target': Math.round(m.target),
      })),
    [monthPlan, pb],
  );

  if (loading && !live) return <Loading label="Loading the 2027 playbook…" />;
  if (error && !live) return <ErrorState message={error} retry={() => reload().catch(() => {})} />;

  const b = pb.build;
  const gap = b.projection - liveTarget;
  const coverage = (b.projection / liveTarget) * 100;
  const maxBar = Math.max(b.projection, liveTarget, b.forecast2026) * 1.02;
  const steps: Array<{ label: string; value: number; kind: 'base' | 'add' | 'cut' | 'total' }> = [
    { label: '2026 forecast', value: b.forecast2026, kind: 'base' },
    {
      label: `Momentum (${b.momentum >= 0 ? '+' : ''}${b.momentum.toFixed(1)}%)`,
      value: b.baseline - b.forecast2026,
      kind: b.baseline >= b.forecast2026 ? 'add' : 'cut',
    },
    ...b.levers.map(l => ({ label: l.name, value: l.value, kind: 'add' as const })),
    { label: `Overlap haircut (−${(b.haircut * 100).toFixed(0)}%)`, value: -b.leverTotal * b.haircut, kind: 'cut' },
    { label: 'Levers add up to', value: b.projection, kind: 'total' },
  ];
  let running = 0;
  const totals = { buyers: 0, visits: 0, leads: 0 };
  monthPlan.forEach(m => {
    totals.buyers += m.buyers;
    totals.visits += m.visits;
    totals.leads += m.leads;
  });

  return (
    <div className="pb27">
      <div className="pb27-hero">
        <div>
          <span className="pb27-eyebrow">
            2027 sales playbook · {pb.name === 'Pop-up' ? 'Bengaluru pop-ups' : pb.name}
          </span>
          <p>{pb.headline}</p>
        </div>
      </div>

      <div className="pb27-kpis">
        {pb.snapshot.map(([label, value, sub, good]) => (
          <div key={label} className={good ? '' : 'pb27-watch'}>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{sub}</small>
          </div>
        ))}
      </div>

      <h3 className="pb27-h">What the data says</h3>
      <div className="pb27-diag">
        {pb.diagnosis.map(d => (
          <Card key={d.title} className="pb27-diag-card">
            <div className="pb27-diag-stat">{d.stat}</div>
            <h4>{d.title}</h4>
            <p>{d.detail}</p>
            <p className="pb27-so">
              <strong>So:</strong> {d.implication}
            </p>
          </Card>
        ))}
      </div>

      <h3 className="pb27-h">How 2027 gets built</h3>
      <div className="pb27-two">
        <Card>
          <CardHeader
            title="From 2026 forecast to 2027, lever by lever"
            subtitle={`A check on the one target (${crore(liveTarget)}, dashed line): what each lever is worth, sized from this studio's own data. Not a second target.`}
          />
          <div className="pb27-wf">
            {steps.map(s => {
              const start = s.kind === 'base' || s.kind === 'total' ? 0 : s.value >= 0 ? running : running + s.value;
              const width = Math.abs(s.value);
              if (s.kind === 'base') running = s.value;
              else if (s.kind !== 'total') running += s.value;
              return (
                <div key={s.label} className={`pb27-wf-row pb27-wf-${s.kind}`}>
                  <span className="pb27-wf-label">{s.label}</span>
                  <div className="pb27-wf-track">
                    <i
                      style={{ left: `${(start / maxBar) * 100}%`, width: `${Math.max((width / maxBar) * 100, 0.4)}%` }}
                    />
                    <b style={{ left: `${(liveTarget / maxBar) * 100}%` }} aria-hidden />
                  </div>
                  <span className="pb27-wf-val">
                    {s.kind === 'add' ? '+' : ''}
                    {lakh(s.value)}
                  </span>
                </div>
              );
            })}
          </div>
          <div className={`pb27-verdict ${gap >= 0 ? 'ok' : 'short'}`}>
            {gap >= 0 ? (
              <>
                The levers add up to <strong>{lakh(b.projection)}</strong>, which covers the target of{' '}
                <strong>{lakh(liveTarget)}</strong> ({coverage.toFixed(0)}%) with <strong>{lakh(gap)}</strong> of
                headroom
                {coverage > 112
                  ? ' — the Stretch target is within reach if the levers land.'
                  : ' — execution, not new ideas, decides the year.'}
              </>
            ) : (
              <>
                The levers add up to <strong>{lakh(b.projection)}</strong> — {coverage.toFixed(0)}% of the target of{' '}
                <strong>{lakh(liveTarget)}</strong>. A further <strong>{lakh(-gap)}</strong> needs a new source (another
                venue, corporate blocks or a pricing change) or a lower target.
              </>
            )}
          </div>
        </Card>
        <Card>
          <CardHeader
            title="The maths behind each lever"
            subtitle="Tap a lever to see the calculation and the evidence"
          />
          <ul className="pb27-levers">
            {b.levers.map(l => (
              <li key={l.id} className={openLever === l.id ? 'open' : ''}>
                <button
                  onClick={() => setOpenLever(openLever === l.id ? null : l.id)}
                  aria-expanded={openLever === l.id}
                >
                  <span>{l.name}</span>
                  <strong>+{lakh(l.value)}</strong>
                </button>
                {openLever === l.id && (
                  <div>
                    <p>
                      <em>Evidence.</em> {l.why}
                    </p>
                    <p>
                      <em>Calculation.</em> {l.math}
                    </p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Monthly revenue: 2025 and 2026 actuals vs 2027 target"
          subtitle="Actuals from the sales export (Oct 2026 partial, Nov–Dec 2026 not yet available); 2027 from the live plan"
        />
        <div style={{ height: 280 }}>
          <ResponsiveContainer>
            <ComposedChart data={chart} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="#e2e7e3" vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis
                tickFormatter={v => `${(v / 1e5).toFixed(liveTarget < 1.2e7 ? 1 : 0)}L`}
                tickLine={false}
                axisLine={false}
                fontSize={12}
                width={44}
              />
              <Tooltip formatter={(v: any) => (v == null ? '—' : lakh(Number(v)))} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="2025 actual" fill="#cfd8d3" radius={[3, 3, 0, 0]} />
              <Bar dataKey="2026 actual" fill="#8fa79c" radius={[3, 3, 0, 0]} />
              <Line dataKey="2027 target" stroke="var(--a1, #216657)" strokeWidth={2.5} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <h3 className="pb27-h">Offer playbook</h3>
      <p className="pb27-note">
        Offers beat the standing perks rather than stack with them: a client gets either the 15% newcomer/lapsed perk or
        the campaign offer. Value is given as time, classes and service — not cash off — because discounted buyers renew
        less at every studio.
      </p>
      <div className="pb27-offers">
        {pb.offers.map(o => {
          const open = openOffer === o.name;
          return (
            <Card key={o.name} className={`pb27-offer ${open ? 'open' : ''}`}>
              <div className="pb27-offer-top">
                <Badge tone={TAG_TONE[o.tag] || 'neutral'}>{o.tag}</Badge>
                <span className="pb27-offer-when">{o.months}</span>
              </div>
              <h4>{o.name}</h4>
              <p className="pb27-offer-aud">{o.audience}</p>
              <p>{o.mechanic}</p>
              <div className="pb27-offer-logic">
                <span>Why — the data</span>
                <p>{o.logic}</p>
              </div>
              {open && (
                <dl className="pb27-offer-more">
                  <dt>Economics</dt>
                  <dd>{o.economics}</dd>
                  <dt>Watch</dt>
                  <dd>{o.kpi}</dd>
                  {o.lever && (
                    <>
                      <dt>Lever</dt>
                      <dd>{b.levers.find(l => l.id === o.lever)?.name || '—'}</dd>
                    </>
                  )}
                </dl>
              )}
              <button className="pb27-link" onClick={() => setOpenOffer(open ? null : o.name)}>
                {open ? 'Less' : 'Economics & KPI'}
              </button>
            </Card>
          );
        })}
      </div>

      {showMonths && (
        <Card>
          <CardHeader
            title="Month by month, 2027"
            subtitle="Target, new paying clients, first visits and leads are the same numbers as Plan › Targets › target breakdown."
          />
          <TableScroll>
            <table className="data-table pb27-months">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Theme &amp; focus</th>
                  <th>Offers</th>
                  <th>Sales team actions</th>
                  <th className="num">Target</th>
                  <th className="num">New paying clients</th>
                  <th className="num">First visits</th>
                  <th className="num">Leads</th>
                </tr>
              </thead>
              <tbody>
                {monthPlan.map(m => (
                  <tr key={m.month}>
                    <td>
                      <strong>{m.month}</strong>
                      <small>{m.event}</small>
                    </td>
                    <td>
                      <strong>{m.theme}</strong>
                      <span>{m.focus}</span>
                      <small>{m.why}</small>
                    </td>
                    <td>
                      {m.offers.map(o => (
                        <span key={o} className="pb27-chip">
                          {o}
                        </span>
                      ))}
                    </td>
                    <td>
                      <ul>
                        {m.actions.map(a => (
                          <li key={a}>{a}</li>
                        ))}
                      </ul>
                    </td>
                    <td className="num">
                      <strong>{lakh(m.target)}</strong>
                    </td>
                    <td className="num">{int(m.buyers)}</td>
                    <td className="num">{int(m.visits)}</td>
                    <td className="num">{int(m.leads)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4}>
                    <strong>2027</strong>
                  </td>
                  <td className="num">
                    <strong>{lakh(monthPlan.reduce((a, m) => a + m.target, 0))}</strong>
                  </td>
                  <td className="num">
                    <strong>{int(totals.buyers)}</strong>
                  </td>
                  <td className="num">
                    <strong>{int(totals.visits)}</strong>
                  </td>
                  <td className="num">
                    <strong>{int(totals.leads)}</strong>
                  </td>
                </tr>
              </tfoot>
            </table>
          </TableScroll>
        </Card>
      )}

      <div className="pb27-two">
        <Card>
          <CardHeader title="Where good members come from" subtitle={`Lead channels, ${PLAYBOOK_2027.meta.ttm}`} />
          <table className="data-table pb27-small">
            <thead>
              <tr>
                <th>Channel</th>
                <th className="num">Leads</th>
                <th className="num">→ trial</th>
                <th className="num">→ member</th>
              </tr>
            </thead>
            <tbody>
              {pb.channels.map(([c, n, tr, cv]) => (
                <tr key={c}>
                  <td>{c}</td>
                  <td className="num">{int(n)}</td>
                  <td className="num">{tr.toFixed(0)}%</td>
                  <td className="num">
                    <span className="pb27-meter" style={{ ['--w' as any]: `${Math.min(cv, 80) / 0.8}%` }}>
                      {cv.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <h5 className="pb27-sub">First purchase decides value (180-day spend)</h5>
          <table className="data-table pb27-small">
            <tbody>
              {pb.entry.slice(0, 6).map(([p, n, first, ltv, rep]) => (
                <tr key={p}>
                  <td>{p}</td>
                  <td className="num">{int(n)} clients</td>
                  <td className="num">first ₹{int(first)}</td>
                  <td className="num">
                    <strong>₹{int(ltv)}</strong>
                  </td>
                  <td className="num">{rep}% buy again</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card>
          <CardHeader
            title="Timetable: where the room is"
            subtitle={`Fill and revenue per class, ${PLAYBOOK_2027.meta.capacityWindow}`}
          />
          <table className="data-table pb27-small">
            <thead>
              <tr>
                <th>Slot</th>
                <th className="num">Classes</th>
                <th className="num">Fill</th>
                <th className="num">₹ / class</th>
              </tr>
            </thead>
            <tbody>
              {pb.slots.map(([s, fill, rps, n]) => (
                <tr key={s}>
                  <td>{s}</td>
                  <td className="num">{int(n)}</td>
                  <td className="num">
                    <span
                      className={`pb27-meter ${fill >= 65 ? 'hot' : fill < 35 ? 'cold' : ''}`}
                      style={{ ['--w' as any]: `${fill}%` }}
                    >
                      {fill}%
                    </span>
                  </td>
                  <td className="num">₹{int(rps)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <h5 className="pb27-sub">Visits drive renewal (unlimited members, all studios)</h5>
          <div className="pb27-usage">
            {PLAYBOOK_2027.meta.usageRenewal
              .slice()
              .sort((a, b) => a[2] - b[2])
              .map(([band, n, r]) => (
                <div key={band}>
                  <span>{band}</span>
                  <i style={{ width: `${r}%` }} />
                  <strong>{r.toFixed(0)}%</strong>
                  <small>{n}</small>
                </div>
              ))}
          </div>
        </Card>
      </div>

      <div className="pb27-two">
        <Card>
          <CardHeader title="Team operating rhythm" subtitle="Weekly habits that make the offers work" />
          <ul className="ob-rules">
            {pb.rhythm.map(([t, body]) => (
              <li key={t}>
                <strong>{t}</strong>
                <span>{body}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader title="2027 scorecard" subtitle="Review monthly; each line maps to a lever above" />
          <table className="data-table pb27-small">
            <thead>
              <tr>
                <th>KPI</th>
                <th className="num">Now</th>
                <th className="num">2027</th>
                <th>How</th>
              </tr>
            </thead>
            <tbody>
              {pb.scorecard.map(([k, now, tgt, how]) => (
                <tr key={k}>
                  <td>
                    <strong>{k}</strong>
                  </td>
                  <td className="num">{now}</td>
                  <td className="num">
                    <strong>{tgt}</strong>
                  </td>
                  <td>
                    <small>{how}</small>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <details className="pb27-method">
        <summary>Method, definitions and sources</summary>
        <ul>
          {PLAYBOOK_2027.meta.method.map(m => (
            <li key={m}>{m}</li>
          ))}
        </ul>
        <p>
          Sources: {PLAYBOOK_2027.meta.sources.join(' · ')}. Generated {PLAYBOOK_2027.meta.generated}.
        </p>
      </details>
    </div>
  );
}
