import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { money, number, percent } from '../types';

const colours = ['#6857e5', '#f27d5b', '#237a67', '#9b7bc8', '#d6a524', '#4c8dc9', '#a85b75', '#7f8b96'];
const format = (value: any, type: string, compact = true) =>
  value === null || value === undefined
    ? '—'
    : type === 'currency'
      ? money(value, compact)
      : type === 'percent'
        ? percent(value, 1)
        : type === 'ratio'
          ? percent(value, 1, true)
          : number(value, 1);

export default function ReportChart({
  chart,
  mode,
  series,
  limit,
}: {
  chart: any;
  mode: 'bar' | 'line';
  series: string[];
  limit: number;
}) {
  if (!chart?.data?.length) return null;
  const data = chart.data.slice(0, limit),
    visible = chart.series.filter((item: any) => series.includes(item.key));
  const primaryType = visible[0]?.type || 'number';
  const axisFormat = (value: any) => (primaryType === 'currency' ? money(value, true) : number(value, 0));
  const content = (
    <>
      <CartesianGrid stroke="#e9e5ee" vertical={false} />
      <XAxis
        dataKey={chart.x}
        tickLine={false}
        axisLine={false}
        minTickGap={16}
        tick={{ fontSize: 10, fill: '#716d7c' }}
        tickFormatter={value => (String(value).length > 18 ? `${String(value).slice(0, 16)}…` : String(value))}
      />
      <YAxis
        tickLine={false}
        axisLine={false}
        width={62}
        tick={{ fontSize: 10, fill: '#716d7c' }}
        tickFormatter={axisFormat}
      />
      <Tooltip
        formatter={(value: any, name: any, item: any) => [
          format(
            value,
            item?.payload?.type || visible.find((entry: any) => entry.label === name)?.type || 'number',
            false,
          ),
          name,
        ]}
        labelStyle={{ fontWeight: 700, marginBottom: 6 }}
        contentStyle={{
          borderRadius: 12,
          border: '1px solid #e6e2eb',
          boxShadow: '0 12px 32px rgba(34,27,53,.12)',
          fontSize: 11,
        }}
      />
      <Legend iconType="circle" wrapperStyle={{ fontSize: 10, paddingTop: 12 }} />
    </>
  );
  return (
    <div className="report-chart" role="img" aria-label="Report chart">
      <ResponsiveContainer width="100%" height={360}>
        {mode === 'line' ? (
          <LineChart data={data} margin={{ top: 16, right: 16, left: 2, bottom: 8 }}>
            {content}
            {visible.map((item: any, index: number) => (
              <Line
                key={item.key}
                type="monotone"
                dataKey={item.key}
                name={item.label}
                stroke={colours[index % colours.length]}
                strokeWidth={2.4}
                dot={data.length <= 12 ? { r: 2.5 } : false}
                activeDot={{ r: 5 }}
                connectNulls={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        ) : (
          <BarChart data={data} margin={{ top: 16, right: 16, left: 2, bottom: 8 }}>
            {content}
            {visible.map((item: any, index: number) => (
              <Bar
                key={item.key}
                dataKey={item.key}
                name={item.label}
                fill={colours[index % colours.length]}
                radius={[5, 5, 1, 1]}
                maxBarSize={42}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
