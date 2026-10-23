import React, { useEffect, useState } from 'react';
import { ArrowDown, ArrowRight, Calculator, Save } from 'lucide-react';
import { api, patch, post } from '../api';
import { useApp } from '../App';
import { useDebouncedEffect, useLoad, useOnChange } from '../hooks';
import { MONTHS, money, number, percent } from '../types';
import { Badge, Button, Callout, Card, CardHeader, Field, Input, Loading, Metric, Select } from '../components/ui';
import PageHeader from '../components/PageHeader';

const initial = {
  revenueTarget: 0,
  revenueAchieved: 0,
  existingClientRevenue: 0,
  renewalRevenue: 0,
  reactivationRevenue: 0,
  averageFirstPurchase: 0,
  trialToPurchaseRate: 0,
  bookingToAttendanceRate: 0,
  leadToBookingRate: 0,
  availableLeads: 0,
};
export default function FunnelSimulator() {
  const { boot, studioId, year, toast, can } = useApp();
  const [studio, setStudio] = useState(studioId || boot.studios[0]?.id),
    [month, setMonth] = useState(1),
    [input, setInput] = useState<any>(initial),
    [result, setResult] = useState<any>(null),
    [targetId, setTargetId] = useState<number | null>(null),
    [sources, setSources] = useState<any>({}),
    [loadingCalc, setLoadingCalc] = useState(false);
  useOnChange(studioId, () => {
    if (studioId) setStudio(studioId);
  });
  const requestKey = `${studio}:${year}:${month}`;
  const { data, loading, error } = useLoad<any>(async () => {
    const [targets, dash, profile] = await Promise.all([
      api(`/targets?year=${year}&studio=${studio}`),
      api(`/dashboard?year=${year}&month=${month}&studio=${studio}`),
      api(`/studios/${studio}?year=${Math.min(year, 2026)}`),
    ]);
    return { targets, dash, profile, key: requestKey };
  }, [studio, month, year]);
  const currentData = data?.key === requestKey ? data : null;
  useEffect(() => {
    if (!currentData) {
      setTargetId(null);
      setInput(initial);
      setSources({});
      setResult(null);
    }
  }, [currentData]);
  useEffect(() => {
    if (!currentData) return;
    const t = currentData.targets.rows.find((r: any) => r.month === month),
      a = currentData.dash.rows[0]?.actual;
    setTargetId(t?.id ?? null);
    const f = currentData.profile.funnel;
    setSources(f.sources);
    setInput((current: any) => ({
      ...current,
      revenueTarget: t?.approved_target ?? t?.proposed_target ?? 0,
      revenueAchieved: a?.revenue || 0,
      existingClientRevenue: t?.repeat_target || 0,
      renewalRevenue: t?.renewal_target || 0,
      reactivationRevenue: t?.reactivation_target || 0,
      averageFirstPurchase: t?.assumptions.averageFirstPurchase || t?.expected_aov || 0,
      trialToPurchaseRate: f.trialToPurchaseRate,
      bookingToAttendanceRate: f.bookingToAttendanceRate,
      leadToBookingRate: f.leadToBookingRate,
    }));
  }, [currentData, month]);
  useDebouncedEffect(
    () => {
      setLoadingCalc(true);
      post('/funnel/calculate', input)
        .then(setResult)
        .catch(() => {})
        .finally(() => setLoadingCalc(false));
    },
    [input],
    180,
  );
  const set = (key: string, value: any) => setInput((current: any) => ({ ...current, [key]: Number(value) }));
  const save = async () => {
    if (!targetId) return;
    try {
      await patch(`/targets/${targetId}`, {
        reason: 'Updated funnel assumptions in Revenue & Funnel Simulator.',
        averageFirstPurchase: input.averageFirstPurchase,
        trialToPurchaseRate: input.trialToPurchaseRate,
        bookingToAttendanceRate: input.bookingToAttendanceRate,
        leadToBookingRate: input.leadToBookingRate,
      });
      toast('Funnel assumptions saved to the studio-month target.');
    } catch (error: any) {
      toast(error.message, 'error');
    }
  };
  const r = result?.base;
  return (
    <div>
      <PageHeader
        eyebrow="REVENUE → OPERATING REQUIREMENTS"
        title="Make the target executable"
        description="Adjust commercial and conversion assumptions to see exactly how many buyers, completed trials, bookings and leads are required. Counts always round upward."
        actions={
          <div className="filter-row">
            <Select value={studio} onChange={e => setStudio(Number(e.target.value))}>
              {boot.studios.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
            <Select value={month} onChange={e => setMonth(Number(e.target.value))}>
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </Select>
          </div>
        }
      />
      {loading && <Loading label="Loading target and observed conversion rates…" />}
      {error && (
        <Callout tone="danger">
          Could not load target and conversion data. Inputs remain zero until you enter values manually.
        </Callout>
      )}
      {!loading && !error && currentData && !targetId && (
        <Callout tone="warning">
          No saved target exists for this studio and month. Enter a target manually; observed revenue and available
          conversion evidence are shown where available.
        </Callout>
      )}
      <div className="simulator-layout">
        <Card>
          <CardHeader
            title="Target and revenue allocation"
            subtitle={`${year} · ${MONTHS[month - 1]} · values in INR`}
            action={<Badge tone="blue">Live calculator</Badge>}
          />
          <div className="form-grid two">
            <NumberField label="Revenue target" value={input.revenueTarget} onChange={v => set('revenueTarget', v)} />
            <NumberField
              label="Revenue already achieved"
              value={input.revenueAchieved}
              onChange={v => set('revenueAchieved', v)}
            />
            <NumberField
              label="Planned existing-client purchases"
              value={input.existingClientRevenue}
              onChange={v => set('existingClientRevenue', v)}
            />
            <NumberField
              label="Planned renewal revenue"
              value={input.renewalRevenue}
              onChange={v => set('renewalRevenue', v)}
            />
            <NumberField
              label="Planned reactivation revenue"
              value={input.reactivationRevenue}
              onChange={v => set('reactivationRevenue', v)}
            />
            <NumberField
              label="Average first-purchase spend"
              value={input.averageFirstPurchase}
              onChange={v => set('averageFirstPurchase', v)}
            />
          </div>
          <div className="form-section-title">Conversion and pipeline assumptions</div>
          <div className="form-grid two">
            <RateField
              label="Trial → purchase"
              value={input.trialToPurchaseRate}
              source={sources.trialToPurchaseRate}
              onChange={v => set('trialToPurchaseRate', v)}
            />
            <RateField
              label="Booking → attendance"
              value={input.bookingToAttendanceRate}
              source={sources.bookingToAttendanceRate}
              onChange={v => set('bookingToAttendanceRate', v)}
            />
            <RateField
              label="Lead → trial booking"
              value={input.leadToBookingRate}
              source={sources.leadToBookingRate}
              onChange={v => set('leadToBookingRate', v)}
            />
            <NumberField
              label="Available leads (forecast scenario)"
              value={input.availableLeads}
              onChange={v => set('availableLeads', v)}
              hint="Used only for the funnel revenue forecast; required leads still come from the target."
            />
          </div>
          {can('target_edit') && (
            <Button variant="secondary" icon={<Save size={15} />} onClick={save} disabled={!targetId}>
              Save assumptions to target
            </Button>
          )}
        </Card>
        <div className="simulator-results">
          <Card className="gap-card">
            <CardHeader
              title="Current revenue gap"
              subtitle="Target less actual, before planned stream contributions"
            />
            <Metric
              label="Remaining gap"
              value={money(r?.remainingGap, true)}
              detail={
                r ? `${money(input.revenueAchieved, true)} achieved against ${money(input.revenueTarget, true)}` : ''
              }
            />
            <Metric
              label="Required new-client revenue"
              value={money(r?.requiredNewClientRevenue, true)}
              detail="After existing, renewal and reactivation plans"
            />
          </Card>
          <Card>
            <CardHeader
              title="Required operating volume"
              subtitle={loadingCalc ? 'Recalculating…' : 'Calculation path, not just the answer'}
            />
            {r && (
              <div className="funnel-calculation">
                {r.calculationPath.slice(2).map((step: any, i: number) => (
                  <React.Fragment key={step.label}>
                    <div>
                      <span>{step.label}</span>
                      <strong>{number(step.value)}</strong>
                      <small>{step.formula}</small>
                    </div>
                    {i < 3 && <ArrowDown size={17} />}
                  </React.Fragment>
                ))}
              </div>
            )}
            {r?.warnings.map((w: string) => (
              <Callout tone="warning" key={w}>
                {w}
              </Callout>
            ))}
          </Card>
        </div>
      </div>
      {r && (
        <>
          <div className="three-column">
            <Card>
              <CardHeader title="Funnel revenue forecast" />
              <Metric
                label="Forecast with available leads"
                value={money(r.funnelRevenueForecast, true)}
                detail={`${number(input.availableLeads)} available leads × ${percent(r.expectedLeadToPurchaseRate, 2, true)} end-to-end conversion`}
              />
              <p className="data-note">
                Without an available-lead input, forecast uses the required-buyer plan. It is a deterministic scenario,
                not a statistical prediction.
              </p>
            </Card>
            <Card>
              <CardHeader title="End-to-end conversion" />
              <Metric
                label="Lead → purchase"
                value={percent(r.expectedLeadToPurchaseRate, 2, true)}
                detail="Lead→booking × attendance × trial→purchase"
              />
              <Metric
                label="Required new buyers"
                value={number(r.requiredNewBuyers)}
                detail={money(r.requiredNewClientRevenue, true) + ' new-client revenue'}
              />
            </Card>
            <Card>
              <CardHeader title="Data integrity" />
              <ul className="check-list">
                <li>Unique clients ≠ transactions</li>
                <li>Trial bookings ≠ completed trials</li>
                <li>Completed trials ≠ purchases</li>
                <li>Zero rates never produce Infinity</li>
              </ul>
            </Card>
          </div>
          <Card>
            <CardHeader
              title="Conservative, base and stretch sensitivity"
              subtitle="Conversion assumptions adjusted by −15% / unchanged / +10%; revenue target remains constant"
            />
            <div className="scenario-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Scenario</th>
                    <th className="num">New buyers</th>
                    <th className="num">Completed trials</th>
                    <th className="num">Bookings</th>
                    <th className="num">Leads required</th>
                    <th className="num">Revenue forecast</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(result.scenarios).map(([name, s]: any) => (
                    <tr key={name}>
                      <td>
                        <Badge tone={name === 'base' ? 'green' : name === 'stretch' ? 'purple' : 'neutral'}>
                          {name}
                        </Badge>
                      </td>
                      <td className="num">{number(s.requiredNewBuyers)}</td>
                      <td className="num">{number(s.requiredCompletedTrials)}</td>
                      <td className="num">{number(s.requiredTrialBookings)}</td>
                      <td className="num">
                        <strong>{number(s.requiredLeads)}</strong>
                      </td>
                      <td className="num">{money(s.funnelRevenueForecast, true)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
function NumberField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  hint?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      <Input type="number" min="0" value={value} onChange={e => onChange(Number(e.target.value))} />
    </Field>
  );
}
function RateField({
  label,
  value,
  onChange,
  source,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  source?: string;
}) {
  return (
    <Field
      label={
        <span className="label-with-badge">
          {label}
          <Badge tone={source === 'historical' ? 'blue' : 'amber'}>
            {source === 'historical' ? 'Historical' : source === 'missing' ? 'Missing' : 'Assumption'}
          </Badge>
        </span>
      }
    >
      <div className="rate-input">
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={value * 100}
          onChange={e => onChange(Number(e.target.value) / 100)}
        />
        <Input
          type="number"
          min="0"
          max="100"
          value={Math.round(value * 1000) / 10}
          onChange={e => onChange(Number(e.target.value) / 100)}
        />
        <span>%</span>
      </div>
    </Field>
  );
}
