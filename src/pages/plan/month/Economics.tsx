import React from 'react';
import { ArrowRight } from 'lucide-react';
import { money, number } from '../../../types';
import { lakh, type MonthEconomics } from '../usePlanData';
import { pct } from './shared';

// The month's volumes, built bottom-up from history, with every step shown so the numbers can be challenged.
export function Economics({ econ, window }: { econ: MonthEconomics; window: { from: string; to: string } }) {
  const nc = econ.newClient,
    r = econ.renewal,
    re = econ.reactivation;
  const steps = [
    { label: 'New-client revenue', value: lakh(nc.target), note: 'from the revenue split' },
    {
      label: 'Paying members',
      value: number(nc.buyers),
      note: `÷ (${money(nc.firstSpend, true)} first spend + ${money(nc.trialSpend, true)} trial fee ÷ ${pct(nc.trialToMember)})`,
    },
    { label: 'Completed trials', value: number(nc.trials), note: `÷ ${pct(nc.trialToMember)} trial → member` },
    { label: 'Leads', value: number(nc.leads), note: `÷ ${pct(nc.leadToTrial)} lead → trial` },
  ];
  return (
    <div className="mw-econ-body">
      <section className="mw-econ-card nc">
        <h5>
          <i>1</i> New clients <em>{lakh(nc.target)} to find</em>
        </h5>
        <div className="mw-chain">
          {steps.map((s, i) => (
            <React.Fragment key={s.label}>
              {i > 0 && <ArrowRight size={16} className="mw-chain-arrow" />}
              <div>
                <span>{s.label}</span>
                <strong>{s.value}</strong>
                <small>{s.note}</small>
              </div>
            </React.Fragment>
          ))}
        </div>
        <p className="mw-reason">
          Average first membership spend is {money(nc.firstSpend, true)} across {number(nc.samples.firstSpendBuyers)}{' '}
          new buyers in the last 12 months
          {nc.samples.seasonalFirstSpend
            ? `, blended with ${money(nc.samples.seasonalFirstSpend, true)} in ${nc.samples.seasonalMonth}`
            : ''}
          . Trial → member uses {number(nc.samples.trialCohort)} trials given 90 days to convert
          {nc.samples.seasonalTrialToMember !== null
            ? ` (same month last year: ${pct(nc.samples.seasonalTrialToMember)})`
            : ''}
          . Trial fees bring in {lakh(nc.trialRevenue)} of the new-client number on their own.
        </p>
      </section>

      <section className="mw-econ-card rn">
        <h5>
          <i>2</i> Renewals <em>{lakh(r.target)} target</em>
        </h5>
        <div className="mw-renewal">
          <div className="mw-renewal-head">
            <div>
              <span>Renewal revenue we can expect</span>
              <strong>{lakh(r.expected)}</strong>
              <small>of {lakh(r.target)} renewal target</small>
            </div>
            <div className="mw-cover">
              <div className="mw-cover-bar">
                <i style={{ width: `${Math.min(100, (r.coverage || 0) * 100)}%` }} />
              </div>
              <b className={r.gap > 0 ? 'neg' : 'pos'}>
                {r.gap > 0 ? `${lakh(r.gap)} short` : `Covered · ${lakh(r.expected - r.target)} headroom`}
              </b>
            </div>
          </div>
          <div className="mw-renewal-math">
            <span>
              <b>{number(r.projectedExpiries)}</b> memberships expire
              <small>
                {number(r.bookedExpiries)} already booked · {number(r.baselineExpiries)} expired same month last year
              </small>
            </span>
            <span>
              × <b>{pct(r.renewalRate)}</b> renew
              <small>renewed ÷ (renewed + lapsed), last 12 months</small>
            </span>
            <span>
              × <b>{money(r.ticket, true)}</b> per renewal
              <small>renewal revenue ÷ renewed memberships</small>
            </span>
            <span>
              = <b>{number(r.expectedRenewers)}</b> renewals
              <small>{number(r.renewersNeeded)} needed to hit target</small>
            </span>
          </div>
          {econ.alternates.length > 0 && (
            <div className="mw-gap">
              <h5>Closing the {lakh(r.gap)} renewal gap</h5>
              {econ.alternates.map(a => (
                <div key={a.key}>
                  <strong>{a.name}</strong>
                  <span>{a.logic}</span>
                  <b>
                    {number(a.units)} → {lakh(a.revenue)}
                  </b>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="mw-econ-card re">
        <h5>
          <i>3</i> Comeback / reactivation <em>{lakh(re.target)} target</em>
        </h5>
        <p className="mw-reason">
          {lakh(re.target)} ÷ {money(re.ticket, true)} average comeback ticket ={' '}
          <b>{number(re.needed)} returning members</b>, from {number(re.lapsedPool)} members lapsed 61–365 days (
          {re.lapsedPool ? pct(re.needed / re.lapsedPool, 1) : '—'} response needed).
        </p>
      </section>
    </div>
  );
}
