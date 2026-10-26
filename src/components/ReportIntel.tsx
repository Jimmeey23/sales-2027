import React from 'react';
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { Badge, Card, CardHeader, TableScroll } from './ui';
import {
  APRIL_HISTORY,
  EXEC_SUMMARY,
  FUNNEL,
  FUNNEL_INSIGHTS,
  FUNNEL_ROWS,
  LAPSED,
  OFFER_EFFECTIVENESS,
  OFFERS_FAILED,
  OFFERS_WORKED,
  REPORT_LABEL,
  REPORT_META,
  REPORT_STUDIOS,
  STUDIO_PROFILES,
  type ReportStudio,
} from '../data/salesIntelligenceReport';

const L = (v: number) => `₹${v.toFixed(1)}L`;
const studiosFor = (s: ReportStudio | null) => (s ? [s] : REPORT_STUDIOS);

function Source() {
  return <Badge tone="purple">Report · {REPORT_META.date}</Badge>;
}

/* ---------- Performance tab ---------- */
export function ReportPerformance({ studio }: { studio: ReportStudio | null }) {
  const list = studiosFor(studio);
  return (
    <>
      {list.map(s => {
        const p = STUDIO_PROFILES[s];
        return (
          <Card key={s}>
            <CardHeader title={`${REPORT_LABEL[s]} — ${p.headline}`} subtitle={p.summary} action={<Source />} />
            <TableScroll>
              <table className="data-table ob-table">
                <thead>
                  <tr>
                    <th>Metric (TTM)</th>
                    <th>Value</th>
                    <th>Comparison</th>
                  </tr>
                </thead>
                <tbody>
                  {p.metrics.map(([m, v, c]) => (
                    <tr key={m}>
                      <td>{m}</td>
                      <td>
                        <strong>{v}</strong>
                      </td>
                      <td>{c}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
            <div className="ri-grid">
              <div>
                <h4>Product behaviour</h4>
                <p>{p.product}</p>
              </div>
              <div>
                <h4>Seasonality</h4>
                <p>{p.seasonality}</p>
              </div>
            </div>
          </Card>
        );
      })}

      <div className="ob-two">
        <Card>
          <CardHeader
            title="Acquisition funnel"
            subtitle="Lead cohorts Aug-2025 to Jul-2026; trial cohorts to Aug-2026"
            action={<Source />}
          />
          <TableScroll>
            <table className="data-table ob-table">
              <thead>
                <tr>
                  <th>Stage</th>
                  {list.map(s => (
                    <th key={s} className="num">
                      {REPORT_LABEL[s]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FUNNEL_ROWS.map(([k, label]) => (
                  <tr key={k}>
                    <td>{label}</td>
                    {list.map(s => (
                      <td key={s} className="num">
                        {FUNNEL[s][k]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        </Card>
        <Card>
          <CardHeader
            title="Lapsed pool as of 22 Oct 2026"
            subtitle="Clients whose last paid coverage ended"
            action={<Source />}
          />
          <TableScroll>
            <table className="data-table ob-table">
              <thead>
                <tr>
                  <th>Studio</th>
                  <th className="num">Active</th>
                  <th className="num">Grace 0–60d</th>
                  <th className="num">61–180d</th>
                  <th className="num">181–365d</th>
                  <th className="num">1–2 yrs</th>
                  <th className="num">High-value</th>
                  <th className="num">React./mo</th>
                </tr>
              </thead>
              <tbody>
                {list.map(s => {
                  const r = LAPSED[s];
                  return (
                    <tr key={s}>
                      <td>
                        <strong>{REPORT_LABEL[s]}</strong>
                      </td>
                      <td className="num">{r.active}</td>
                      <td className="num">{r.grace}</td>
                      <td className="num">{r.l180}</td>
                      <td className="num">{r.l365}</td>
                      <td className="num">{r.l2y}</td>
                      <td className="num">{r.highValue}</td>
                      <td className="num">{r.reactivation}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableScroll>
          <p className="data-note">
            Reactivations earn ₹4.8–7.6k each, about a third of a renewal. Renewing clients make 1.09–1.19 renewal
            purchases a month.
          </p>
        </Card>
      </div>
    </>
  );
}

/* ---------- Findings tab ---------- */
export function ReportFindings({ studio }: { studio: ReportStudio | null }) {
  const list = studiosFor(studio);
  const april = APRIL_HISTORY.filter(a => list.includes(a.studio));
  return (
    <>
      <Card>
        <CardHeader title="Executive summary" subtitle={REPORT_META.basis} action={<Source />} />
        <ul className="ri-list">
          {EXEC_SUMMARY.map(x => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </Card>

      {list.map(s => {
        const p = STUDIO_PROFILES[s];
        return (
          <Card key={s}>
            <CardHeader title={`${REPORT_LABEL[s]}: diagnosis`} subtitle={p.headline} action={<Source />} />
            <div className="ri-grid">
              <div>
                <h4>Strongest drivers</h4>
                <p>{p.strongest}</p>
                <h4>Weakest drivers</h4>
                <p>{p.weakest}</p>
                <h4>Constraints</h4>
                <p>{p.constraints}</p>
              </div>
              <div>
                <h4>Acquisition</h4>
                <ul className="ri-list">
                  {p.acquisition.map(x => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
                <h4>Most promising segments</h4>
                <ul className="ri-list">
                  {p.segments.map(x => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="ri-highlight">
              <strong>Single biggest opportunity: {p.opportunity.title}.</strong> {p.opportunity.body}
            </div>
            <p className="data-note">
              <strong>Discounts:</strong> {p.discounts}
            </p>
          </Card>
        );
      })}

      <Card>
        <CardHeader
          title="Discount & offer effectiveness"
          subtitle="Effective discount / renewed within 30 days of expiry · commitment products since Jan-2025 · associations, not proof of cause"
          action={<Source />}
        />
        <TableScroll>
          <table className="data-table ob-table">
            <thead>
              <tr>
                <th>Offer family</th>
                <th className="num">Kwality</th>
                <th className="num">Bandra</th>
                <th className="num">Kenkere</th>
              </tr>
            </thead>
            <tbody>
              {OFFER_EFFECTIVENESS.map(o => (
                <tr key={o.family}>
                  <td>{o.family}</td>
                  <td className="num">{o.kwality}</td>
                  <td className="num">{o.bandra}</td>
                  <td className="num">{o.kenkere}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
        <div className="ri-grid">
          <div>
            <h4>What worked</h4>
            <ul className="ri-icons">
              {OFFERS_WORKED.map(x => (
                <li key={x}>
                  <CheckCircle2 size={15} className="positive-text" />
                  <span>{x}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4>What didn’t</h4>
            <ul className="ri-icons">
              {OFFERS_FAILED.map(x => (
                <li key={x}>
                  <XCircle size={15} className="negative-text" />
                  <span>{x}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Card>

      {april.length > 0 && (
        <Card>
          <CardHeader
            title="April anniversary history"
            subtitle="Class revenue ₹ lakh (effective discount)"
            action={<Source />}
          />
          <table className="data-table ob-table">
            <thead>
              <tr>
                <th>Studio</th>
                <th className="num">April 2025</th>
                <th className="num">April 2026</th>
                <th className="num">vs Jan–Mar avg</th>
                <th>May–Jun avg after</th>
              </tr>
            </thead>
            <tbody>
              {april.map(a => (
                <tr key={a.studio}>
                  <td>
                    <strong>{REPORT_LABEL[a.studio]}</strong>
                  </td>
                  <td className="num">{a.a25}</td>
                  <td className="num">{a.a26}</td>
                  <td className="num">{a.lift}</td>
                  <td>{a.after}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="data-note">
            April works as a moment (every studio lifts 1.35–2.3×) but depth didn’t drive the lift. Bandra doubled its
            discount and earned less; Kwality’s extra ₹18L cost ₹22L of discount, mostly early renewals.
          </p>
        </Card>
      )}

      <Card>
        <CardHeader title="Funnel & retention insights" action={<Source />} />
        <ul className="ri-list">
          {FUNNEL_INSIGHTS.map(x => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </Card>
    </>
  );
}
