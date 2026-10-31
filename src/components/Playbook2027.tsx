import React, { useMemo, useState } from 'react';
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useApp } from '../App';
import { useLoad } from '../hooks';
import { PLAYBOOK_2027 } from '../data/playbook2027';
import { Card, CardHeader, ErrorState, Loading, TableScroll } from './ui';

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
  // Written offers and month picks below were folded into the 2027 offer bank (server/lib/offerBank2027.ts);
  // the page shows each month's picks from the plan instead.
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
// The playbook reads in lakh everywhere — targets, months, offers — so the build
// section does too. A crore figure beside lakh rows reads as a different currency.
const money = (v: number | null | undefined) =>
  v == null ? '—' : `₹${(Math.abs(v) / 1e5).toFixed(1)}L`;
const int = (v: number) => Math.round(v).toLocaleString('en-IN');

// The evidence line in the data is one long sentence naming the offers behind a lever:
// "Final plan: carried by the lapsed offers — A, B, C." Split it so the section can show
// a count up front and the names only when asked.
const evidence = (why: string) => {
  if (!why) return null;
  const match = why.match(/carried by the (.+?) offers? — (.+)$/i);
  const offers = (match ? match[2] : why).split(/,\s*/).map(o => o.replace(/\.$/, '').trim()).filter(Boolean);
  if (!offers.length) return null;
  return { group: match ? match[1] : '', offers };
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
  // Each month's offers are the ones its plan picked from the offer bank.
  const { data: planDetail } = useLoad<any>(
    () => import('../api').then(({ api }) => api(`/studio-plans/${studio?.id}?year=2027`)),
    [studio?.id],
  );

  // Targets and volumes come from the one target breakdown (Targets tab) — never recomputed here.
  const bd = live?.locations?.[0];
  const liveTarget: number = Number(bd?.total?.target || 0) || pb.build.appTargetAtBuild;
  const monthPlan = useMemo(
    () =>
      pb.months.map((m, i) => {
        const x = bd?.months?.[i];
        return {
          ...m,
          offers: ((planDetail?.plans || []).find((p: any) => p.month === i + 1)?.offers || []).map(
            (o: any) => o.name,
          ) as string[],
          target: Number(x?.target || 0),
          buyers: Number(x?.newPaying || 0),
          visits: Number(x?.firstVisits || 0),
          leads: Number(x?.leads || 0),
        };
      }),
    [pb, bd, planDetail],
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
  // Four steps, not nine rows: the levers are summed here and broken out in the list
  // below, so the big picture reads first and the detail follows it.
  const momentumValue = b.baseline - b.forecast2026;
  const haircutValue = -(b.leverTotal * b.haircut);
  const buildSteps = [
    {
      id: 'base',
      name: '2026 forecast',
      note: 'what this studio is already selling',
      value: b.forecast2026,
      kind: 'base' as const,
      from: 0,
      to: b.forecast2026,
    },
    {
      id: 'momentum',
      name: `Momentum ${b.momentum >= 0 ? '+' : ''}${b.momentum.toFixed(1)}%`,
      note: 'same clients, same prices',
      value: momentumValue,
      kind: momentumValue >= 0 ? ('add' as const) : ('cut' as const),
      from: b.forecast2026,
      to: b.baseline,
    },
    {
      id: 'levers',
      name: `${b.levers.length} growth levers`,
      note: 'each one below',
      value: b.leverTotal,
      kind: 'add' as const,
      from: b.baseline,
      to: b.baseline + b.leverTotal,
    },
    {
      id: 'haircut',
      name: `Overlap haircut ${(b.haircut * 100).toFixed(0)}%`,
      note: 'levers that claim the same sale are counted once',
      value: haircutValue,
      kind: 'cut' as const,
      from: b.baseline + b.leverTotal + haircutValue,
      to: b.baseline + b.leverTotal,
    },
    {
      id: 'total',
      name: '2027 projection',
      note: `against the ${money(liveTarget)} target`,
      value: b.projection,
      kind: 'total' as const,
      from: 0,
      to: b.projection,
    },
  ];
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
      <Card className="pb27-build">
        <header className="pb27-build-head">
          <div>
            <h4>
              From {money(b.forecast2026)} to {money(b.projection)}
            </h4>
            <p>
              {buildSteps.filter(s => s.kind === 'add' || s.kind === 'cut').length} moves, each sized from this
              studio&rsquo;s own data. A check on the one target — not a second one.
            </p>
          </div>
          <div className={`pb27-score ${gap >= 0 ? 'ok' : 'short'}`}>
            <span>Levers vs target</span>
            <strong>{coverage.toFixed(0)}%</strong>
            <small>{gap >= 0 ? `${money(gap)} of headroom` : `${money(-gap)} still to find`}</small>
          </div>
        </header>

        {/* The whole year in one scale: where 2026 leaves the studio, what each step
            adds or takes away, and where that lands against the live target. */}
        <ol className="pb27-bridge">
          {buildSteps.map(step => {
            const start = step.kind === 'base' || step.kind === 'total' ? 0 : step.kind === 'cut' ? step.to : step.from;
            const width = Math.abs(step.value);
            return (
              <li key={step.id} className={`pb27-bs is-${step.kind}`}>
                <span className="pb27-bs-name">
                  {step.name}
                  {step.note && <em>{step.note}</em>}
                </span>
                <span className="pb27-bs-track">
                  {/* The ghost is the running total, so a +₹11.1L step reads against the
                      ₹111.5L it is added to rather than floating on its own. */}
                  {step.kind !== 'base' && step.kind !== 'total' && (
                    <em
                      style={{ width: `${(Math.max(step.from, step.to) / maxBar) * 100}%` }}
                      aria-hidden
                    />
                  )}
                  <i
                    style={{
                      left: `${(start / maxBar) * 100}%`,
                      width: `${Math.max((width / maxBar) * 100, 0.6)}%`,
                    }}
                  />
                  <span
                    className="pb27-bs-target"
                    style={{ left: `${(liveTarget / maxBar) * 100}%` }}
                    aria-hidden
                  />
                </span>
                <span className="pb27-bs-val">
                  {step.kind !== 'base' && step.kind !== 'total' && Math.abs(step.value) < 50000
                    ? 'no change'
                    : `${step.kind === 'add' ? '+' : step.kind === 'cut' ? '−' : ''}${money(step.value)}`}
                </span>
              </li>
            );
          })}
        </ol>
        <p className="pb27-scale">
          <i aria-hidden /> The live 2027 target: <strong>{money(liveTarget)}</strong>
          {gap >= 0 ? ' — cleared before the year starts.' : ' — not yet reached.'}
        </p>

        <div className={`pb27-verdict ${gap >= 0 ? 'ok' : 'short'}`}>
          {gap >= 0 ? (
            <>
              The steps clear the {money(liveTarget)} target
              {coverage > 112
                ? ' — the stretch is within reach if the levers land.'
                : ' — the year is won on execution, not on new ideas.'}
            </>
          ) : (
            <>
              One more step is needed: <strong>{money(-gap)}</strong> has to come from a new source — another venue,
              corporate blocks or a pricing change — or the target comes down to{' '}
              <strong>{money(b.projection)}</strong>.
            </>
          )}
        </div>

        <h5 className="pb27-sub">
          What each lever is worth
          <span>
            {b.levers.length} levers · {lakh(b.leverTotal)} together
          </span>
        </h5>
        <ul className="pb27-lv">
          {b.levers.map((l, i) => {
            const ev = evidence(l.why);
            const share = b.leverTotal ? (l.value / b.leverTotal) * 100 : 0;
            return (
              <li key={l.id}>
                <div className="pb27-lv-head">
                  <span className="pb27-lv-num">{i + 1}</span>
                  <span className="pb27-lv-name">{l.name}</span>
                  <span className="pb27-lv-bar" aria-hidden>
                    <i style={{ width: `${Math.max(share, 1.5)}%` }} />
                  </span>
                  <span className="pb27-lv-val">
                    +{lakh(l.value)}
                    <em>{share.toFixed(0)}%</em>
                  </span>
                </div>
                <p className="pb27-lv-math">{l.math}</p>
                {ev && (
                  <details className="pb27-lv-ev">
                    <summary>
                      Carried by {ev.offers.length} {ev.group ? `${ev.group} ` : ''}offers
                    </summary>
                    <p>{ev.offers.join(' · ')}</p>
                  </details>
                )}
              </li>
            );
          })}
        </ul>
      </Card>

      <Card>
        <CardHeader
          title="Monthly revenue: 2025 and 2026 actuals vs 2027 target"
          subtitle="Actuals from the sales export (Oct 2026 partial, Nov–Dec 2026 not yet available); 2027 from the live plan"
        />
        <div style={{ height: 280 }}>
          <ResponsiveContainer>
            <ComposedChart data={chart} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="#e9dfd7" vertical={false} />
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
              <Bar dataKey="2025 actual" fill="#d6cac0" radius={[3, 3, 0, 0]} />
              <Bar dataKey="2026 actual" fill="#8fa79f" radius={[3, 3, 0, 0]} />
              <Line dataKey="2027 target" stroke="var(--a1, #245e56)" strokeWidth={2.5} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>

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
