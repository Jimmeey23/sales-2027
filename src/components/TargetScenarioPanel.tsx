import React from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowRight } from 'lucide-react';
import { api } from '../api';
import { useLoad } from '../hooks';
import { MONTHS_SHORT, money, percent, titleCase } from '../types';
import { Badge, Button, Callout, Card, CardHeader, ErrorState, Loading, TableScroll } from './ui';

export default function TargetScenarioPanel({
  year,
  studioId,
  canEdit,
  onSelect,
}: {
  year: number;
  studioId: number | null;
  canEdit: boolean;
  onSelect: (scenario: string) => void;
}) {
  const { data, loading, error, reload } = useLoad<any>(
    () => api(`/targets/scenario-preview?year=${year}${studioId ? `&studio=${studioId}` : ''}`),
    [year, studioId],
  );
  if (loading && !data) return <Loading label="Computing nominal, standard and aggressive scenarios…" />;
  if (error && !data) return <ErrorState message={error} retry={() => reload().catch(() => {})} />;
  if (!data) return null;
  const monthly = Array.from({ length: 12 }, (_, index) => {
    const row: any = { month: MONTHS_SHORT[index] };
    for (const scenario of ['nominal', 'standard', 'aggressive'])
      row[scenario] = data.rows
        .filter((item: any) => item.month === index + 1 && item.scenario === scenario)
        .reduce((sum: number, item: any) => sum + item.proposed_target, 0);
    return row;
  });
  return (
    <div>
      <Callout tone="info" title="Recommendation posture">
        These are read-only target-generation previews. Selecting one prepares a regeneration; it does not change the shared target scaling scenario.
      </Callout>
      <div className="scenario-card-grid">
        {data.totals.map((total: any) => (
          <Card key={total.scenario} className={`scenario-card ${total.scenario}`}>
            <div className="scenario-card-top">
              <Badge
                tone={total.scenario === 'aggressive' ? 'purple' : total.scenario === 'standard' ? 'green' : 'neutral'}
              >
                {titleCase(total.scenario)}
              </Badge>
              {total.scenario === 'aggressive' && data.aggressiveHighest && (
                <Badge tone="green">Highest annual plan</Badge>
              )}
            </div>
            <h2>{money(total.annualTarget, true)}</h2>
            <p>
              {percent(total.yoyGrowthPercent)} YoY against comparable revenue of {money(total.comparableRevenue, true)}
              .
            </p>
            <Button variant="secondary" disabled={!canEdit} onClick={() => onSelect(total.scenario)}>
              Prepare {total.scenario} regeneration <ArrowRight size={14} />
            </Button>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader
          title="Monthly scenario shape"
          subtitle="Summed across the current studio scope · unsaved preview"
        />
        <div className="chart-box tall">
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={monthly}>
              <CartesianGrid stroke="#e8e4ef" vertical={false} />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={value => `₹${(value / 10000000).toFixed(1)}Cr`} />
              <Tooltip formatter={(value: any, name: any) => [money(value, true), titleCase(name)]} />
              <Legend />
              <Bar dataKey="nominal" fill="#b9b3c3" radius={[3, 3, 0, 0]} />
              <Bar dataKey="standard" fill="#6857e5" radius={[3, 3, 0, 0]} />
              <Bar dataKey="aggressive" fill="#f27d5b" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card>
        <CardHeader
          title="Monthly numeric comparison"
          subtitle="Aggressive is the highest planning case; Kemps retains monthly seasonality within the ₹30–40L rent-aware guardrail"
        />
        <TableScroll>
          <table className="data-table">
            <thead>
              <tr>
                <th>Month</th>
                <th className="num">Nominal</th>
                <th className="num">Standard</th>
                <th className="num">Aggressive</th>
                <th className="num">Aggressive vs standard</th>
              </tr>
            </thead>
            <tbody>
              {monthly.map(row => (
                <tr key={row.month}>
                  <td>
                    <strong>{row.month}</strong>
                  </td>
                  <td className="num">{money(row.nominal, true)}</td>
                  <td className="num">{money(row.standard, true)}</td>
                  <td className="num">
                    <strong>{money(row.aggressive, true)}</strong>
                  </td>
                  <td className="num">{money(row.aggressive - row.standard, true)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
      </Card>
      <Callout tone="info">
        {data.note} Nominal holds comparable revenue; standard applies the capped observed trend; aggressive uses the
        higher of the legacy stretch case or standard plus 10%.
      </Callout>
    </div>
  );
}
