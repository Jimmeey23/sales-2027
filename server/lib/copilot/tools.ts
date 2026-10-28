// The Copilot tool belt.
//
// Each tool answers one class of commercial question from real rows and returns three
// things together: a written answer, typed cards the drawer can render (KPIs, bars,
// tables), and the exact sources it used. Nothing here calls an AI provider, invents a
// number, or implies an approval — that separation is what keeps the answers accurate.

import { db } from '../../db.js';
import { commercialCatalog } from '../commercial.js';
import {
  attendanceFor,
  buildOffer,
  channels,
  latestObservedMonth,
  monthNames,
  observed,
  offersFor,
  planFor,
  pricing,
  productMix,
  renewalCoverage,
  renewals,
  rollupMonth,
  segments,
  studios,
  studioCapacity,
  targets,
  type Studio,
} from './context.js';
import { classify } from './intents.js';
import type { CopilotSlots } from './intents.js';
import {
  addMonths,
  count,
  daysInMonth,
  delta,
  monthKey,
  monthLabel,
  monthRange,
  pct,
  rupees,
  safeDiv,
  type MonthRef,
} from './text.js';

export type Card =
  | {
      kind: 'kpi';
      items: { label: string; value: string; delta?: string; tone?: 'good' | 'bad' | 'neutral'; hint?: string }[];
    }
  | {
      kind: 'bars';
      title?: string;
      format?: 'money' | 'percent' | 'count';
      rows: { label: string; value: number; display?: string; tone?: 'good' | 'bad' | 'neutral' }[];
    }
  | { kind: 'table'; title?: string; columns: string[]; rows: (string | number)[][]; align?: ('l' | 'r')[] }
  | {
      kind: 'list';
      title?: string;
      rows: { title: string; meta?: string; detail?: string; tone?: 'good' | 'bad' | 'warn' }[];
    }
  | { kind: 'note'; tone: 'info' | 'warn' | 'success'; text: string };

export interface Source {
  label: string;
  detail?: string;
  table?: string;
}

export interface ToolOutput {
  type: string;
  content: string;
  cards?: Card[];
  sources?: Source[];
  followUps?: string[];
  nextActions?: string[];
  /** Shown by "why?" so every number can be traced back to its formula. */
  calculation?: { label: string; formula: string; value: string }[];
  data?: any;
}

export interface ToolContext {
  studio: Studio | null;
  /** True when the studio was picked for the user because they did not name one. */
  assumedStudio?: boolean;
  scopeLabel: string;
  year: number;
  months: MonthRef[];
  primary: MonthRef;
  slots: CopilotSlots;
  message: string;
  history: any[];
}

export type ToolId =
  | 'overview'
  | 'month_gap'
  | 'year_outlook'
  | 'compare_studios'
  | 'funnel'
  | 'channels'
  | 'renewals'
  | 'segments'
  | 'products'
  | 'attendance'
  | 'offer_portfolio'
  | 'offer_build'
  | 'offer_compare'
  | 'what_if'
  | 'price_ladder'
  | 'plan_summary'
  | 'key_days'
  | 'explain'
  | 'navigate';

export type Tool = (ctx: ToolContext) => ToolOutput;

const BAR_MONTHS = monthNames().map(name => name.slice(0, 3));

function money(value: number | null | undefined) {
  return rupees(value);
}

function toneFor(value: number | null | undefined): 'good' | 'bad' | 'neutral' {
  if (value == null || !Number.isFinite(value)) return 'neutral';
  return value >= 0 ? 'good' : 'bad';
}

function headline(title: string, lines: string[]) {
  return [`**${title}**`, ...lines.filter(line => line && line.trim())].join('\n');
}

function bullets(items: string[]) {
  return items.filter(Boolean).map(item => `- ${item}`).join('\n');
}

function observedWindow(ctx: ToolContext, size = 6): string[] {
  const latest = latestObservedMonth();
  const [year, month] = latest.split('-').map(Number);
  const end = { year, month };
  const keys: string[] = [];
  for (let offset = size - 1; offset >= 0; offset -= 1) {
    const ref = addMonths(end, -offset);
    keys.push(monthKey(ref.year, ref.month));
  }
  return keys;
}

function targetFor(ctx: ToolContext, ref: MonthRef) {
  return rollupMonth(ref.year, ref.month, ctx.studio?.id ?? null);
}

function sourceForTargets(year: number): Source {
  return {
    label: `2027 monthly targets · ${year}`,
    table: 'monthly_targets',
    detail: 'Approved target where present, otherwise the proposed target (labelled in the answer).',
  };
}

// ─────────────────────────────────────────────────────────── overview

const overview: Tool = ctx => {
  const yearTargets = targets(ctx.year, ctx.studio?.id ?? null);
  const annual = yearTargets.reduce((sum, row) => sum + (row.target ?? 0), 0);
  const historical = yearTargets.reduce((sum, row) => sum + (row.historical_revenue ?? 0), 0);
  const growth = safeDiv(annual, historical);
  const latest = latestObservedMonth();
  const recent = observed(ctx.studio?.id ?? null, latest);
  const nextRef = addMonths({ year: ctx.year, month: 1 }, 0);
  const due = renewals(monthKey(nextRef.year, nextRef.month), ctx.studio?.id ?? null);

  const monthly = yearTargets
    .filter(row => row.studio_id === ctx.studio?.id || !ctx.studio)
    .reduce<Map<number, { target: number; historical: number }>>((map, row) => {
      const current = map.get(row.month) ?? { target: 0, historical: 0 };
      current.target += row.target ?? 0;
      current.historical += row.historical_revenue ?? 0;
      map.set(row.month, current);
      return map;
    }, new Map());

  const rows = [...monthly.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([month, value]) => ({
      label: `${BAR_MONTHS[month - 1]}`,
      value: value.target,
      display: money(value.target),
      tone: toneFor(value.target - value.historical),
    }));

  const hardest = [...monthly.entries()]
    .map(([month, value]) => ({
      month,
      gap: (value.target ?? 0) - (value.historical ?? 0),
      growth: safeDiv((value.target ?? 0) - (value.historical ?? 0), value.historical ?? 0),
    }))
    .sort((a, b) => (b.growth ?? 0) - (a.growth ?? 0))
    .slice(0, 3);

  const barsValue = monthly.size
    ? [...monthly.entries()].sort((a, b) => (b[1].target ?? 0) - (a[1].target ?? 0))[0]
    : null;

  return {
    type: 'analysis',
    content: headline(`${ctx.scopeLabel} · ${ctx.year} at a glance`, [
      `Annual target **${money(annual)}** across ${yearTargets.length ? new Set(yearTargets.map(row => row.studio_id)).size : 0} studio(s), against **${money(historical)}** last year — ${growth ? `${delta(growth - 1)} growth` : 'no like-for-like comparison yet'}.`,
      latest && recent
        ? `Latest complete month **${latest}**: ${money(recent.revenue)} revenue, ${count(recent.transactions)} transactions, check-in ${pct(recent.checkin_rate)}.`
        : 'No complete observed month is imported yet, so I will not quote actuals.',
      due.summary.duePackages
        ? `Next month already carries **${count(due.summary.duePackages)} open packages** worth ${money(due.summary.paidDueValue)} of known paid value.`
        : 'No open packages are due next month in the imported book.',
      `The three hardest months by growth are ${hardest
        .map(item => `${monthNames()[item.month - 1]} (${item.growth == null ? 'n/a' : delta(item.growth)})`)
        .join(', ')}.`,
      `Largest target: ${barsValue ? `${monthNames()[barsValue[0] - 1]} at ${money(barsValue[1].target)}` : 'not set'}.`,
    ]),
    cards: [
      {
        kind: 'kpi',
        items: [
          { label: `${ctx.year} target`, value: money(annual), delta: growth ? delta(growth - 1) : undefined, tone: 'neutral' },
          {
            label: 'Last year same months',
            value: money(historical),
            hint: 'Imported history on the same targets, not a forecast.',
          },
          latest && recent
            ? { label: `Observed ${latest}`, value: money(recent.revenue), delta: pct(recent.checkin_rate) + ' check-in', tone: 'neutral' }
            : { label: 'Observed month', value: 'not imported' },
          {
            label: 'Renewals due next',
            value: count(due.summary.duePackages),
            delta: money(due.summary.paidDueValue),
            tone: due.summary.duePackages ? 'warn' as any : 'neutral',
          },
        ],
      },
      { kind: 'bars', title: `${ctx.year} target by month`, format: 'money', rows },
    ],
    sources: [sourceForTargets(ctx.year), { label: 'Observed actuals', table: 'transactions / leads / checkins', detail: `Latest complete month: ${latest}` }, { label: 'Renewals', table: 'customer_packages' }],
    followUps: [
      `How do we hit the April ${ctx.year} target?`,
      'Which months look hardest?',
      'Where is the funnel leaking?',
      'Break the member base into segments',
    ],
    nextActions: [
      `Open ${monthNames()[hardest[0]?.month - 1] ?? 'the biggest month'} and confirm the offer mix before the month locks.`,
      'Check renewals due in the next 30 days against the studio’s capacity.',
    ],
    calculation: [
      { label: 'Annual target', formula: 'Σ monthly approved/proposed target', value: money(annual) },
      { label: 'Like-for-like growth', formula: 'target ÷ historical − 1', value: growth ? delta(growth - 1) : 'n/a' },
    ],
    data: { annual, historical },
  };
};

// ─────────────────────────────────────────────────────────── month gap

const monthGap: Tool = ctx => {
  const roll = targetFor(ctx, ctx.primary);
  const key = monthKey(ctx.primary.year, ctx.primary.month);
  const due = renewals(key, ctx.studio?.id ?? null);
  const planList = ctx.studio
    ? [{ studio: ctx.studio, plan: planFor(ctx.studio.id, ctx.primary.year, ctx.primary.month) }]
    : studios()
        .map(studio => ({ studio, plan: planFor(studio.id, ctx.primary.year, ctx.primary.month) }))
        .filter(item => item.plan);
  const plan = planList[0]?.plan ?? null;
  const target = roll.target ?? 0;
  const historical = roll.historical ?? 0;
  const gap = target - historical;
  const growth = safeDiv(gap, historical);
  const days = daysInMonth(ctx.primary.year, ctx.primary.month);
  const perDay = safeDiv(gap, days) ?? 0;

  const buyers = roll.buyers || 0;
  const trials = roll.trials || 0;
  const leads = roll.leads || 0;
  const newClientRevenue = roll.byStudio.reduce(
    (sum, row) => sum + (Number(row.funnel?.requiredNewClientRevenue) || 0),
    0,
  );
  const spendPerBuyer = safeDiv(newClientRevenue, buyers) ?? 0;
  const buyerPerTrial = safeDiv(buyers, trials) ?? 0;
  const trialPerLead = safeDiv(trials, leads) ?? 0;

  const levers = [
    {
      label: 'Trials +2 pts',
      extraBuyers: trials * 0.02,
      revenue: trials * 0.02 * spendPerBuyer,
      detail: `${count(trials)} required trials × 2 pts × ${money(spendPerBuyer)} first-month spend`,
    },
    {
      label: 'Leads +2 pts',
      extraBuyers: leads * 0.02 * buyerPerTrial,
      revenue: leads * 0.02 * buyerPerTrial * spendPerBuyer,
      detail: `${count(leads)} required leads × 2 pts × ${pct(buyerPerTrial)} trial → buyer`,
    },
    {
      label: 'Repeat value +5%',
      extraBuyers: 0,
      revenue: Math.max(0, target - newClientRevenue) * 0.05,
      detail: `5% of the ${money(Math.max(0, target - newClientRevenue))} that renewals and repeats carry`,
    },
    {
      label: 'Renewals +10%',
      extraBuyers: 0,
      revenue: due.summary.paidDueValue * 0.1,
      detail: `10% of ${money(due.summary.paidDueValue)} known paid value expiring — an assumption, not a forecast`,
    },
  ]
    .map(lever => ({ ...lever, shareOfGap: safeDiv(lever.revenue, gap) }))
    .sort((a, b) => b.revenue - a.revenue);

  const cards: Card[] = [
    {
      kind: 'kpi',
      items: [
        { label: `${roll.label} target`, value: money(target), hint: roll.basis === 'approved' ? 'Approved' : 'Proposed' },
        { label: 'Same month last year', value: money(historical) },
        { label: 'Gap to close', value: money(gap), delta: growth == null ? undefined : delta(growth), tone: toneFor(-gap) },
        { label: 'Per trading day', value: money(perDay), hint: `${days} days in ${roll.label}` },
      ],
    },
    {
      kind: 'bars',
      title: 'Where the gap can come from (scenario, not a forecast)',
      format: 'money',
      rows: levers.map(lever => ({ label: lever.label, value: Math.round(lever.revenue), display: money(lever.revenue) })),
    },
    {
      kind: 'kpi',
      items: [
        { label: 'New buyers needed', value: count(buyers) },
        { label: 'Trials needed', value: count(trials) },
        { label: 'Leads needed', value: count(leads) },
        { label: 'Renewals due', value: count(due.summary.duePackages), delta: money(due.summary.paidDueValue) },
      ],
    },
  ];

  const planLine = plan
    ? `The month’s plan is **${plan.theme || 'untitled'}**${ctx.studio ? '' : ` at ${planList[0]?.studio.name}`} — ${String(plan.objective || 'no objective recorded').replace(/\.+$/, '')}. ${plan.offers.length} offers are linked.`
    : `No monthly plan is written for ${roll.label} yet, so the levers below are the only committed maths.`;

  return {
    type: 'analysis',
    content: headline(`${roll.label} · ${ctx.scopeLabel}`, [
      `Target **${money(target)}** (${roll.basis}); last year **${money(historical)}**. The gap is **${money(gap)}**${growth == null ? '' : ` (${delta(growth)} growth)`}, or **${money(perDay)} a day**.`,
      planLine,
      `The cheapest mix, in order:`,
      bullets(
        levers
          .slice(0, 3)
          .map(
            lever =>
              `**${money(lever.revenue)}** — ${lever.detail} (${lever.shareOfGap == null ? 'n/a' : pct(lever.shareOfGap, 0)} of the gap)`,
          ),
      ),
      `Renewals due: **${count(due.summary.duePackages)} packages**, ${money(due.summary.paidDueValue)} known paid value. Every figure above is a labelled scenario on real inputs, not a forecast.`,
    ]),
    cards,
    sources: [
      sourceForTargets(ctx.primary.year),
      { label: 'Funnel requirement', table: 'monthly_targets.funnel', detail: 'Derived by target_breakdown from observed conversion.' },
      { label: 'Renewals due', table: 'customer_packages', detail: `Open packages expiring ${roll.label}.` },
    ],
    followUps: [
      `Which offers are planned for ${roll.label}?`,
      `What if trial conversion improves 5 points in ${roll.label}?`,
      `Show renewals due in ${roll.label}`,
      `Compare this with the other studios`,
    ],
    nextActions: [
      `Assign the top lever to one owner with a weekly checkpoint (${levers[0]?.label.toLowerCase()}).`,
      `Work the ${count(due.summary.duePackages)} renewals due before the month starts.`,
    ],
    calculation: [
      { label: 'Target', formula: 'approved target, else proposed target, summed across studios', value: money(target) },
      { label: 'Gap', formula: 'target − same month last year', value: money(gap) },
      { label: 'Per day', formula: 'gap ÷ days in month', value: money(perDay) },
      { label: 'Spend per new buyer', formula: 'required new-client revenue ÷ required new buyers', value: money(spendPerBuyer) },
    ],
    data: { roll, levers },
  };
};

// ─────────────────────────────────────────────────────────── year outlook

const yearOutlook: Tool = ctx => {
  const rows = ctx.months.map((ref: MonthRef) => targetFor(ctx, ref));
  const table: (string | number)[][] = rows.map(row => [
    row.label.replace(String(ctx.year), '').trim(),
    money(row.target),
    money(row.historical),
    row.historical ? delta((row.target ?? 0) / row.historical - 1) : 'n/a',
    money((row.target ?? 0) - (row.historical ?? 0)),
  ]);
  const ranked = [...rows]
    .filter(row => row.historical)
    .map(row => ({ ...row, growth: (row.target ?? 0) / (row.historical ?? 1) - 1 }))
    .sort((a, b) => b.growth - a.growth);

  const quarters = [1, 2, 3, 4].map(quarter => {
    const slice = rows.filter(row => Math.floor((row.month - 1) / 3) + 1 === quarter);
    return {
      quarter,
      target: slice.reduce((sum, row) => sum + (row.target ?? 0), 0),
      historical: slice.reduce((sum, row) => sum + (row.historical ?? 0), 0),
    };
  });

  return {
    type: 'analysis',
    content: headline(`${ctx.year} outlook · ${ctx.scopeLabel}`, [
      `${rows.length} months, target **${money(rows.reduce((sum, row) => sum + (row.target ?? 0), 0))}**.`,
      `Hardest: ${ranked.slice(0, 3).map(row => `**${row.label}** ${delta(row.growth)}`).join(' · ')}.`,
      `Easiest: ${ranked.slice(-2).reverse().map(row => `**${row.label}** ${delta(row.growth)}`).join(' · ')}.`,
      `Biggest quarter by target: **Q${quarters.slice().sort((a, b) => b.target - a.target)[0]?.quarter}** at ${money(quarters.slice().sort((a, b) => b.target - a.target)[0]?.target)}.`,
      `Every row compares a planning target with imported last-year revenue for the same month — it is not a forecast and does not include this year’s actuals.`,
    ]),
    cards: [
      { kind: 'bars', title: `${ctx.year} target vs last year`, format: 'money', rows: rows.map(row => ({ label: row.label.slice(0, 3), value: row.target ?? 0, display: money(row.target), tone: toneFor((row.target ?? 0) - (row.historical ?? 0)) })) },
      { kind: 'table', title: 'Month by month', columns: ['Month', 'Target', 'Last year', 'Growth', 'Gap'], rows: table, align: ['l', 'r', 'r', 'r', 'r'] },
      { kind: 'bars', title: 'Quarterly target', format: 'money', rows: quarters.map(quarter => ({ label: `Q${quarter.quarter}`, value: quarter.target, display: money(quarter.target) })) },
    ],
    sources: [sourceForTargets(ctx.year)],
    followUps: [`How do we hit ${ranked[0]?.label}?`, `Compare studios for ${ctx.year}`, 'Which offers are planned for Q2?'],
    nextActions: [`Protect ${ranked[0]?.label}: it carries the steepest growth requirement.`, 'Re-check the two easiest months for over-planning.'],
    calculation: [{ label: 'Growth', formula: 'target ÷ last year − 1', value: 'per month' }],
    data: rows,
  };
};

// ─────────────────────────────────────────────────────────── studio benchmark

const compareStudios: Tool = ctx => {
  const list = studios();
  const rows = list.map(studio => {
    const yearRows = targets(ctx.year, studio.id);
    const target = yearRows.reduce((sum, row) => sum + (row.target ?? 0), 0);
    const historical = yearRows.reduce((sum, row) => sum + (row.historical_revenue ?? 0), 0);
    const latest = observed(studio.id, latestObservedMonth());
    const mix = productMix(studio.id, observedWindow(ctx, 6));
    const premium = mix.slice(0, 1)[0];
    return {
      studio,
      target,
      historical,
      growth: safeDiv(target - historical, historical),
      observedRevenue: latest?.revenue ?? null,
      aov: latest?.aov ?? null,
      discountRate: latest ? safeDiv(latest.discount_cost, latest.revenue) : null,
      checkinRate: latest?.checkin_rate ?? null,
      topCategory: premium ? `${premium.category} (${pct(premium.share, 0)})` : 'n/a',
    };
  });
  rows.sort((a, b) => b.target - a.target);
  const leader = rows[0];
  const steepest = [...rows].filter(row => row.growth != null).sort((a, b) => (b.growth ?? 0) - (a.growth ?? 0))[0];

  return {
    type: 'analysis',
    content: headline(`Studio benchmark · ${ctx.year}`, [
      `**${leader?.studio.name}** carries the largest target (${money(leader?.target)}), ${pct(safeDiv(leader?.target ?? 0, rows.reduce((sum, row) => sum + row.target, 0)) ?? 0, 0)} of the group.`,
      `Steepest growth requirement: **${steepest?.studio.name}** at ${steepest?.growth == null ? 'n/a' : delta(steepest.growth)}.`,
      `Observed AOV is ${money(Math.min(...rows.map(row => row.aov ?? Infinity)))}–${money(Math.max(...rows.map(row => row.aov ?? 0)))}; discount depth ranges ${pct(Math.min(...rows.map(row => row.discountRate ?? 1)))}–${pct(Math.max(...rows.map(row => row.discountRate ?? 0)))}.`,
      `Comparing studios is a benchmark, not a target transfer: capacity, catchment and price mix differ.`,
    ]),
    cards: [
      { kind: 'bars', title: `${ctx.year} target by studio`, format: 'money', rows: rows.map(row => ({ label: row.studio.name, value: row.target, display: money(row.target) })) },
      {
        kind: 'table',
        title: 'Target, growth and observed quality',
        columns: ['Studio', 'Target', 'Last year', 'Growth', 'AOV', 'Discount', 'Check-in'],
        rows: rows.map(row => [
          row.studio.name,
          money(row.target),
          money(row.historical),
          row.growth == null ? 'n/a' : delta(row.growth),
          row.aov == null ? 'n/a' : money(row.aov),
          row.discountRate == null ? 'n/a' : pct(row.discountRate),
          row.checkinRate == null ? 'n/a' : pct(row.checkinRate),
        ]),
        align: ['l', 'r', 'r', 'r', 'r', 'r', 'r'],
      },
    ],
    sources: [sourceForTargets(ctx.year), { label: 'Observed quality', table: 'transactions / checkins', detail: `Latest complete month: ${latestObservedMonth()}` }],
    followUps: ['Compare the funnel across studios', 'Which studio has the best channel mix?', `Show the ${leader?.studio.name} price ladder`],
    nextActions: [`Benchmark ${steepest?.studio.name}’s funnel against ${leader?.studio.name} before adding discount.`],
    calculation: [{ label: 'Growth', formula: 'target ÷ historical − 1', value: 'per studio' }],
    data: rows.map(row => ({ studio: row.studio.name, target: row.target, growth: row.growth })),
  };
};

// ─────────────────────────────────────────────────────────── funnel

const funnel: Tool = ctx => {
  const roll = targetFor(ctx, ctx.primary);
  const latest = latestObservedMonth();
  const actual = observed(ctx.studio?.id ?? null, latest);
  const buyers = roll.buyers;
  const trials = roll.trials;
  const leads = roll.leads;
  const newClientRevenue = roll.byStudio.reduce((sum, row) => sum + (Number(row.funnel?.requiredNewClientRevenue) || 0), 0);
  const spendPerBuyer = safeDiv(newClientRevenue, buyers);
  const requiredTrialRate = safeDiv(trials, leads);
  const requiredBuyerRate = safeDiv(buyers, trials);
  const observedTrialRate = actual?.lead_to_purchase ?? null;
  const observedBuyerRate = actual?.trial_conversion ?? null;

  const rows = [
    { label: 'Leads', value: leads, display: count(leads) },
    { label: 'Trials / first visits', value: trials, display: count(trials) },
    { label: 'New buyers', value: buyers, display: count(buyers) },
  ];

  const sensitivity = [
    {
      label: '+2 pts lead → trial',
      revenue: (leads ?? 0) * 0.02 * (requiredBuyerRate ?? 0) * (spendPerBuyer ?? 0),
    },
    {
      label: '+2 pts trial → buyer',
      revenue: (trials ?? 0) * 0.02 * (spendPerBuyer ?? 0),
    },
    {
      label: '+10% leads at the current rate',
      revenue: (leads ?? 0) * 0.1 * (requiredTrialRate ?? 0) * (requiredBuyerRate ?? 0) * (spendPerBuyer ?? 0),
    },
  ];

  return {
    type: 'analysis',
    content: headline(`Funnel · ${roll.label} ${ctx.scopeLabel}`, [
      `The plan needs **${count(leads)} leads → ${count(trials)} trials → ${count(buyers)} buyers** (${pct(requiredTrialRate)} lead → trial, ${pct(requiredBuyerRate)} trial → buyer).`,
      actual
        ? `Observed in ${latest}: lead → purchase **${pct(observedTrialRate)}**, trial → buyer **${pct(observedBuyerRate)}** across ${count(actual.completed_trials)} first visits.`
        : 'No complete observed month is imported, so the only rates quoted are the plan’s own requirement.',
      actual && observedBuyerRate != null && requiredBuyerRate != null
        ? `That is a **${((observedBuyerRate - requiredBuyerRate) * 100).toFixed(1)} pt** difference on trial → buyer — ${observedBuyerRate >= requiredBuyerRate ? 'the plan is asking less than the studio currently delivers, so the risk sits upstream in leads' : 'the plan is asking for more conversion than the studio currently delivers'}.`
        : 'Conversion difference not calculated without an observed cohort.',
      actual && observedBuyerRate === 0 && (actual.completed_trials ?? 0) > 0
        ? `**Caveat:** the ${latest} cohort is still inside its 90-day purchase window, so a ${pct(0, 0)} trial → buyer reading is immaturity, not a collapse.`
        : '',
      `Sensitivity, on the plan’s own funnel: **${money(sensitivity[1].revenue)}** for +2 pts trial → buyer, **${money(sensitivity[0].revenue)}** for +2 pts lead → trial.`,
    ]),
    cards: [
      { kind: 'bars', title: `Required funnel · ${roll.label}`, format: 'count', rows },
      {
        kind: 'kpi',
        items: [
          { label: 'Required lead → trial', value: pct(requiredTrialRate) },
          { label: 'Required trial → buyer', value: pct(requiredBuyerRate) },
          { label: `Observed trial → buyer`, value: observedBuyerRate == null ? 'not mature' : pct(observedBuyerRate) },
          { label: 'Spend per new buyer', value: money(spendPerBuyer) },
        ],
      },
      { kind: 'bars', title: 'Value of a conversion improvement', format: 'money', rows: sensitivity.map(item => ({ label: item.label, value: Math.round(item.revenue), display: money(item.revenue) })) },
    ],
    sources: [
      { label: 'Funnel requirement', table: 'monthly_targets.funnel' },
      { label: 'Observed cohort', table: 'leads / member_visits', detail: `Mature cohorts only, latest complete month ${latest}` },
    ],
    followUps: ['Which lead sources convert best?', 'Where is the capacity constraint?', `How do we hit ${roll.label}?`],
    nextActions: ['Fix the weakest conversion step before adding spend.', 'Track trial → buyer weekly, not monthly.'],
    calculation: [
      { label: 'Required lead → trial', formula: 'required trials ÷ required leads', value: pct(requiredTrialRate) },
      { label: 'Required trial → buyer', formula: 'required new buyers ÷ required trials', value: pct(requiredBuyerRate) },
      { label: 'Value of +2 pts', formula: 'trials × 2% × first-month spend', value: money(sensitivity[1].revenue) },
    ],
    data: { rows, sensitivity },
  };
};

// ─────────────────────────────────────────────────────────── channels

const channelTool: Tool = ctx => {
  const window = observedWindow(ctx, 6);
  const rows = channels(ctx.studio?.id ?? null, window).filter(row => row.leads >= 5);
  const ranked = [...rows].sort((a, b) => (b.conversion ?? 0) - (a.conversion ?? 0));
  const best = ranked[0];
  const worst = ranked[ranked.length - 1];
  const bestLtv = [...rows].sort((a, b) => (b.ltvPerLead ?? 0) - (a.ltvPerLead ?? 0))[0];
  const totalLeads = rows.reduce((sum, row) => sum + row.leads, 0);

  return {
    type: 'analysis',
    content: headline(`Lead sources · last 6 observed months · ${ctx.scopeLabel}`, [
      `${count(totalLeads)} leads across ${rows.length} sources. Best conversion: **${best?.source ?? 'n/a'}** at ${pct(best?.conversion)}; weakest: **${worst?.source ?? 'n/a'}** at ${pct(worst?.conversion)}.`,
      `Highest lifetime value per lead: **${bestLtv?.source ?? 'n/a'}** at ${money(bestLtv?.ltvPerLead)}.`,
      best && worst && (worst.conversion ?? 0) < (best.conversion ?? 0) * 0.5
        ? `Reallocating a fifth of ${worst?.source}’s volume to ${best?.source} at the same cost would raise conversions by about **${count(Math.round(worst!.leads * 0.2 * ((best!.conversion ?? 0) - (worst!.conversion ?? 0))))}**.`
        : 'Source quality is broadly comparable, so creative and offer timing matter more than channel mix.',
      `Attribution is as imported: a converted lead is credited to its source, not to a multi-touch path.`,
    ]),
    cards: [
      { kind: 'bars', title: 'Conversion by source', format: 'percent', rows: ranked.slice(0, 8).map(row => ({ label: row.source, value: Math.round((row.conversion ?? 0) * 1000) / 10, display: pct(row.conversion), tone: (row.conversion ?? 0) >= 0.2 ? 'good' : 'neutral' })) },
      {
        kind: 'table',
        title: 'Source quality',
        columns: ['Source', 'Leads', 'Converted', 'Rate', 'LTV / lead'],
        rows: ranked.slice(0, 8).map(row => [row.source, count(row.leads), count(row.converted), pct(row.conversion), money(row.ltvPerLead)]),
        align: ['l', 'r', 'r', 'r', 'r'],
      },
    ],
    sources: [{ label: 'Lead sources', table: 'leads', detail: `Months ${window[0]} → ${window[window.length - 1]}, current-state snapshots` }],
    followUps: ['Where does the funnel leak?', 'Break the member base into segments', 'Compare studios on channel mix'],
    nextActions: [`Shift a test budget slice from ${worst?.source ?? 'the weakest source'} to ${best?.source ?? 'the strongest source'} for one month.`],
    calculation: [{ label: 'Conversion', formula: 'converted leads ÷ leads', value: 'per source' }],
    data: rows,
  };
};

// ─────────────────────────────────────────────────────────── renewals

const renewalTool: Tool = ctx => {
  const key = monthKey(ctx.primary.year, ctx.primary.month);
  const report = renewals(key, ctx.studio?.id ?? null) as any;
  const rate = ctx.slots.percent && ctx.slots.percent > 0 && ctx.slots.percent <= 1 ? ctx.slots.percent : null;
  const projection = rate ? report.summary.paidDueValue * rate : null;
  const top = ((report.products ?? []) as any[]).slice(0, 5) as any[];
  const coverage = renewalCoverage();
  const beyondBook = !report.summary.duePackages && coverage.last && key > coverage.last;

  return {
    type: 'analysis',
    content: headline(`Renewals due · ${monthLabel(ctx.primary.year, ctx.primary.month)} · ${ctx.scopeLabel}`, [
      `**${count(report.summary.duePackages)} open packages** expire, carrying ${money(report.summary.paidDueValue)} of known paid value (${count(report.summary.paidValuePackages)} packages priced) and ${money(report.summary.listDueValue)} of matched current list value.`,
      projection == null
        ? 'Add “at 60% conversion” to see an explicitly labelled scenario.'
        : `At **${pct(rate)} conversion** that is ${money(projection)} of revenue from known values only — a scenario, not a forecast.`,
      top.length
        ? `Biggest cohorts: ${top.map(item => `${item.product_name} (${item.due_packages})`).join(' · ')}.`
        : 'No product-level cohorts resolved for this month.',
      `Unpriced packages (${count(report.summary.zeroAmountDuePackages)}) are excluded from value rather than assumed free.`,
      beyondBook
        ? `**Why zero:** the imported package book ends at ${monthLabel(Number(coverage.last!.slice(0, 4)), Number(coverage.last!.slice(5, 7)))}, so no package is on record expiring in ${monthLabel(ctx.primary.year, ctx.primary.month)}. That is a coverage gap, not a renewal pipeline of zero.`
        : '',
      ctx.assumedStudio ? `Using **${ctx.studio?.name}** because no studio was named in the question.` : '',
    ]),
    cards: [
      {
        kind: 'kpi',
        items: [
          { label: 'Packages due', value: count(report.summary.duePackages) },
          { label: 'Known paid value', value: money(report.summary.paidDueValue) },
          { label: 'Matched list value', value: money(report.summary.listDueValue) },
          rate ? { label: `Scenario @ ${pct(rate)}`, value: money(projection), hint: 'Not a forecast' } : { label: 'Scenario', value: 'add a % conversion' },
        ],
      },
      top.length
        ? { kind: 'bars', title: 'Due by product', format: 'money', rows: top.map(item => ({ label: item.product_name, value: item.paid_due_value, display: money(item.paid_due_value) })) }
        : { kind: 'note', tone: 'info', text: 'No product-level cohorts for this month.' },
    ],
    sources: [{ label: 'Renewal report', table: 'customer_packages', detail: 'Currently open packages only; future coverage can change.' }],
    followUps: [`Renewals due at 60% conversion`, 'Break the member base into segments', 'Which offers are planned for this month?'],
    nextActions: ['Work the largest cohort first, by exact paid value.', 'Do not treat missing package values as free renewals.'],
    calculation: [
      { label: 'Due packages', formula: 'open packages with end_date inside the month', value: count(report.summary.duePackages) },
      { label: 'Scenario revenue', formula: 'known paid due value × assumed conversion', value: projection == null ? 'n/a' : money(projection) },
    ],
    data: report,
  };
};

// ─────────────────────────────────────────────────────────── segments

const segmentTool: Tool = ctx => {
  const base = segments(ctx.studio?.id ?? null);
  const topValue = [...base.rows].sort((a, b) => b.revenue - a.revenue)[0];
  const atRisk = base.rows.find(row => row.id === 'at_risk');
  return {
    type: 'analysis',
    content: headline(`Member base · ${ctx.scopeLabel}`, [
      `**${count(base.total)} members** and ${money(base.revenue)} of observed package revenue across the imported book.`,
      `**${topValue?.label}** carry ${pct(topValue?.revenueShare, 0)} of revenue from ${pct(topValue?.share, 0)} of members.`,
      atRisk
        ? `**${count(atRisk.members)} members** (${pct(atRisk.share)}) are in the at-risk window — ${money(atRisk.revenue)} of historic revenue and the highest-value group to call this week.`
        : 'No members currently sit in the at-risk window.',
      `Segments are behavioural (recency and purchase count), not survey or consent-based — use them to prioritise effort, not to gate service.`,
    ]),
    cards: [
      { kind: 'bars', title: 'Revenue share by segment', format: 'percent', rows: base.rows.map(row => ({ label: row.label, value: Math.round(row.revenueShare * 1000) / 10, display: pct(row.revenueShare, 0), tone: row.id === 'champions' ? 'good' : row.id === 'at_risk' ? 'bad' : 'neutral' })) },
      {
        kind: 'table',
        title: 'Segment detail',
        columns: ['Segment', 'Members', 'Share', 'Revenue', 'Avg value'],
        rows: base.rows.map(row => [row.label, count(row.members), pct(row.share), money(row.revenue), money(row.avgValue)]),
        align: ['l', 'r', 'r', 'r', 'r'],
      },
      { kind: 'list', title: 'What to do with each segment', rows: base.rows.map(row => ({ title: row.label, meta: `${count(row.members)} members · ${money(row.revenue)}`, detail: row.play })) },
    ],
    sources: [{ label: 'Member base', table: 'customer_packages + segment_rules', detail: 'Recency and purchase-count thresholds from the studio rules.' }],
    followUps: ['Show renewals due this month', 'Which lead sources convert best?', 'What offers are planned for lapsed members?'],
    nextActions: ['Call the at-risk cohort before extending any discount.', 'Ask champions for referrals at their next renewal.'],
    calculation: [
      { label: 'Segments', formula: 'recency bands × purchase-count bands', value: 'champions / loyal / new / at risk / hibernating / lapsed' },
      { label: 'Revenue share', formula: 'segment revenue ÷ total package revenue', value: 'per segment' },
    ],
    data: base,
  };
};

// ─────────────────────────────────────────────────────────── products

const productTool: Tool = ctx => {
  const window = observedWindow(ctx, 6);
  const categories = productMix(ctx.studio?.id ?? null, window);
  const items = productMix(ctx.studio?.id ?? null, window, false).slice(0, 8);
  const leader = categories[0];
  return {
    type: 'analysis',
    content: headline(`What carries the revenue · ${ctx.scopeLabel}`, [
      `**${leader?.category}** leads at ${money(leader?.revenue)} (${pct(leader?.share, 0)} of the last six observed months).`,
      `AOV by category ranges ${money(Math.min(...categories.map(row => row.aov)))}–${money(Math.max(...categories.map(row => row.aov)))}.`,
      `Top single products: ${items.slice(0, 4).map(item => `${item.category} (${money(item.revenue)})`).join(' · ')}.`,
      `Revenue is gross collected value as imported; retail and credits are excluded from service mix where the import classifies them separately.`,
    ]),
    cards: [
      { kind: 'bars', title: 'Revenue by category', format: 'money', rows: categories.slice(0, 8).map(row => ({ label: row.category, value: row.revenue, display: money(row.revenue) })) },
      { kind: 'table', title: 'Top products', columns: ['Product', 'Revenue', 'Transactions', 'AOV'], rows: items.map(row => [row.category, money(row.revenue), count(row.transactions), money(row.aov)]), align: ['l', 'r', 'r', 'r'] },
    ],
    sources: [{ label: 'Observed product mix', table: 'transactions', detail: `Months ${window[0]} → ${window[window.length - 1]}` }],
    followUps: ['Show the price ladder', 'Where does the funnel leak?', 'Break the member base into segments'],
    nextActions: [`Protect ${leader?.category} availability; it carries the mix.`],
    calculation: [{ label: 'Share', formula: 'category revenue ÷ total revenue', value: 'per category' }],
    data: { categories, items },
  };
};

// ─────────────────────────────────────────────────────────── attendance

const attendanceTool: Tool = ctx => {
  let year = ctx.year;
  let profile = attendanceFor(ctx.studio?.id ?? null, year) as any;
  const latest = latestObservedMonth();
  const latestYear = Number(latest.slice(0, 4));
  // Check-ins only exist for imported history; quote that year rather than an empty planning year.
  if (!profile?.summary?.bookings && latestYear !== year) {
    const fallback = attendanceFor(ctx.studio?.id ?? null, latestYear) as any;
    if (fallback?.summary?.bookings) {
      profile = fallback;
      year = latestYear;
    }
  }
  if (!profile) {
    return {
      type: 'analysis',
      content: 'No check-in history is imported for that scope, so attendance quality cannot be quoted.',
      cards: [],
      sources: [{ label: 'Check-ins', table: 'checkins' }],
      followUps: ['Show the funnel instead'],
    };
  }
  const summary = profile.summary || {};
  const weekdays = (profile.weekdays ?? []).slice().sort((a: any, b: any) => b.bookings - a.bookings);
  const bands = (profile.timeBands ?? []).slice().sort((a: any, b: any) => b.bookings - a.bookings);
  const roll = targetFor(ctx, ctx.primary);
  const capacity = studioCapacity(ctx.studio);
  const headroom = capacity ? capacity - (summary.bookings ?? 0) / 12 : null;
  return {
    type: 'analysis',
    content: headline(`Attendance quality · ${ctx.scopeLabel}${year !== ctx.year ? ` · observed ${year}` : ''}`, [
      `Check-in rate **${pct(summary.checkin_rate)}**, late cancellations **${pct(summary.late_cancellation_rate)}**, visits per active member ${summary.visits_per_member?.toFixed(1) ?? 'n/a'}.`,
      `Busiest day **${weekdays[0]?.day ?? 'n/a'}** (${count(weekdays[0]?.bookings)} bookings); busiest band **${bands[0]?.band ?? 'n/a'}**.`,
      summary.attended_lead_hours
        ? `Members book about **${summary.attended_lead_hours.toFixed(0)}h** ahead when they attend, versus ${summary.cancelled_lead_hours?.toFixed(0) ?? 'n/a'}h when they late-cancel — early commitment is a usable signal.`
        : 'Booking-lead-time comparison is not available.',
      capacity
        ? `Recorded monthly capacity is **${count(capacity)} visits**; the trailing average is ${count((summary.bookings ?? 0) / 12)} bookings, so ${headroom && headroom > 0 ? `there is roughly ${count(headroom)} visits of headroom` : 'capacity is the constraint before demand'}.`
        : 'No capacity figure is recorded for this studio.',
      `Next-month return rate is ${pct(summary.next_month_return_rate)} — the strongest early-warning metric on the dashboard.`,
    ]),
    cards: [
      {
        kind: 'kpi',
        items: [
          { label: 'Check-in rate', value: pct(summary.checkin_rate) },
          { label: 'Late cancellations', value: pct(summary.late_cancellation_rate), tone: 'bad' },
          { label: 'Visits / member', value: summary.visits_per_member?.toFixed(1) ?? 'n/a' },
          { label: 'Next-month return', value: pct(summary.next_month_return_rate) },
        ],
      },
      { kind: 'bars', title: 'Bookings by day', format: 'count', rows: weekdays.map((row: any) => ({ label: row.day.slice(0, 3), value: row.bookings, display: count(row.bookings) })) },
      { kind: 'bars', title: 'Bookings by time band', format: 'count', rows: bands.map((row: any) => ({ label: row.band, value: row.bookings, display: count(row.bookings) })) },
    ],
    sources: [{ label: 'Attendance profile', table: 'checkins', detail: `Completed sessions in ${year} only${year !== ctx.year ? ` — the ${ctx.year} planning year has no check-ins yet` : ''}` }],
    followUps: ['Where is the capacity headroom?', 'Which classes fill best?', 'Show the funnel'],
    nextActions: [`Fill ${bands[bands.length - 1]?.band ?? 'the quietest band'} with an off-peak offer before adding classes.`],
    calculation: [{ label: 'Check-in rate', formula: 'check-ins ÷ bookings (completed sessions)', value: pct(summary.checkin_rate) }],
    data: { summary, weekdays, bands },
  };
};

// ─────────────────────────────────────────────────────────── offer portfolio

const offerPortfolio: Tool = ctx => {
  const offers = offersFor(ctx.studio?.id ?? null, ctx.year);
  const monthFilter = ctx.months.length < 12 ? new Set(ctx.months.map(ref => ref.month)) : null;
  // 2027 bank offers are saved with month = NULL until a plan picks them; keep those separate.
  const unassigned = offers.filter(offer => offer.month == null);
  const dated = offers.filter(offer => offer.month != null);
  const scoped = monthFilter ? dated.filter(offer => monthFilter.has(offer.month)) : dated;
  const byMonth = new Map<number, any[]>();
  for (const offer of scoped) {
    const list = byMonth.get(offer.month) ?? [];
    list.push(offer);
    byMonth.set(offer.month, list);
  }
  const depth = scoped.length ? scoped.reduce((sum, offer) => sum + (Number(offer.effective_discount) || 0), 0) / scoped.length : null;
  const budget = scoped.reduce((sum, offer) => sum + ((Number(offer.expected_revenue) || 0) * (Number(offer.effective_discount) || 0)) / 100, 0);
  const mechanisms = new Map<string, number>();
  for (const offer of scoped) mechanisms.set(offer.offer_type || 'other', (mechanisms.get(offer.offer_type || 'other') ?? 0) + 1);
  const gaps = ctx.months.filter(ref => !byMonth.get(ref.month)?.length).map(ref => monthLabel(ref.year, ref.month, true));

  return {
    type: 'analysis',
    content: headline(`Offer portfolio · ${ctx.scopeLabel}`, [
      `**${scoped.length} live offers** across ${byMonth.size} month(s); average discount depth **${depth == null ? 'n/a' : pct(depth / 100)}**.`,
      `Indicative discount spend at planned revenue: **${money(budget)}** — the cost of the benefits, not cash marketing spend.`,
      `Mechanism mix: ${[...mechanisms.entries()].slice(0, 5).map(([name, n]) => `${name.replaceAll('_', ' ')} ×${n}`).join(' · ')}.`,
      gaps.length ? `Months with no offer yet: ${gaps.join(', ')}.` : 'Every month in scope has at least one offer.',
      unassigned.length
        ? `A further **${unassigned.length} bank offers** carry no month yet — they are drafts waiting for a plan to pick them, so I left them out of the month counts.`
        : '',
      `Offers here are drafts or proposals; nothing is approved or published by asking.`,
    ]),
    cards: [
      { kind: 'bars', title: 'Offers per month', format: 'count', rows: [...byMonth.entries()].sort((a, b) => a[0] - b[0]).map(([month, list]) => ({ label: BAR_MONTHS[month - 1], value: list.length, display: `${list.length}` })) },
      {
        kind: 'table',
        title: ctx.months.length <= 3 ? 'Offers in scope' : 'Largest planned offers',
        columns: ['Offer', 'Month', 'Type', 'Depth', 'Expected'],
        rows: [...scoped]
          .sort((a, b) => (b.expected_revenue ?? 0) - (a.expected_revenue ?? 0))
          .slice(0, 8)
          .map(offer => [offer.name, BAR_MONTHS[offer.month - 1], String(offer.offer_type || '').replaceAll('_', ' '), offer.effective_discount ? pct(offer.effective_discount / 100) : 'n/a', money(offer.expected_revenue)]),
        align: ['l', 'l', 'l', 'r', 'r'],
      },
    ],
    sources: [{ label: 'Offer bank', table: 'offers', detail: 'Excludes archived and rejected rows.' }],
    followUps: ['Build a new offer for this month', 'Which mechanism works best?', 'How much discount are we planning?'],
    nextActions: gaps.length ? [`Write an offer for ${gaps[0]} before it reaches the print deadline.`] : ['Check depth consistency across the quarter.'],
    calculation: [
      { label: 'Average depth', formula: 'mean effective_discount across live offers', value: depth == null ? 'n/a' : pct(depth / 100) },
      { label: 'Indicative discount spend', formula: 'Σ expected revenue × depth', value: money(budget) },
    ],
    data: { scoped, byMonth: [...byMonth.entries()] },
  };
};

// ─────────────────────────────────────────────────────────── offer building

const IDEA_KINDS: { kind: any; angle: string }[] = [
  { kind: 'newcomer_2_for_1', angle: 'Lowest-risk entrance: two classes for the price of one.' },
  { kind: 'newcomer_3_for_2', angle: 'Stronger commitment: three classes for the price of two.' },
  { kind: 'intro_pack', angle: 'A low-ticket first purchase that converts to a pack.' },
  { kind: 'first_membership', angle: 'Membership entry for a trial that is already convinced.' },
  { kind: 'lapsed_return', angle: 'Win back a lapsed member with a soft landing.' },
  { kind: 'class_pack', angle: 'Pack upgrade for someone already attending.' },
];

const offerBuild: Tool = ctx => {
  if (!ctx.studio)
    return {
      type: 'studio_required',
      content: 'Name a studio (or pick one in the header) so I can price the offer against its real product master and policy. I will not guess a price.',
      sources: [{ label: 'Policy', table: 'studio_offer_policies' }],
      followUps: ['Build a 3-for-2 newcomer offer at Kemps Corner'],
    };

  const explicit = ctx.slots.offerKind;
  const requestedCount = /\b(\d)\b/.exec(ctx.message)?.[1];
  const wantedCount = Math.max(1, Math.min(5, Number(requestedCount) || (explicit ? 1 : 3)));

  const targetsToTry = explicit
    ? [explicit.slug]
    : IDEA_KINDS.slice(0, Math.max(wantedCount, 3)).map(item => item.kind);

  const built: any[] = [];
  const failures: string[] = [];
  for (const kind of targetsToTry) {
    if (built.length >= wantedCount) break;
    try {
      const concept = buildOffer({
        studioId: ctx.studio.id,
        kind,
        year: ctx.primary.year,
        month: ctx.primary.month,
        targetRevenue: (targetFor(ctx, ctx.primary).target ?? 0) * 0.05,
      }) as any;
      if (concept?.financials?.errors?.length) {
        failures.push(`${kind}: ${concept.financials.errors[0]}`);
        continue;
      }
      built.push(concept);
    } catch (error: any) {
      failures.push(`${kind}: ${error.message}`);
    }
  }

  if (!built.length)
    return {
      type: 'policy_issue',
      content: `I could not build that safely at ${ctx.studio.name}: ${failures.slice(0, 3).join('; ')}. Nothing has been saved.`,
      sources: [{ label: 'Policy', table: 'studio_offer_policies' }],
      followUps: ['Show the price ladder'],
    };

  const primary = built[0];
  const ideas = built.map(concept => ({
    name: concept.name,
    hook: concept.headline || concept.benefit,
    mechanism: String(concept.offerType || 'percentage').replaceAll(' ', '_'),
    audience: concept.audience || 'Newcomers',
    month: ctx.primary.month,
    benefit: concept.benefit,
    pricing: `${money(concept.financials.sellingPrice)} selling · ${money(concept.mechanics?.listedPrice)} list · ${pct((concept.financials.effectiveDiscountPercent ?? 0) / 100)} benefit`,
    whyItWorks: concept.rationale || 'Policy-checked against the studio catalogue and discount ceiling.',
    channels: 'Reception tent card, WhatsApp broadcast, front-desk script',
  }));

  return {
    type: 'offer_concept',
    content: headline(`${primary.name} · ${ctx.studio.name} · ${monthLabel(ctx.primary.year, ctx.primary.month)}`, [
      `${primary.benefit}.`,
      `**${money(primary.financials.sellingPrice)}** for ${money(primary.financials.referenceValue ?? primary.financials.customerValue)} of class value — a **${pct((primary.financials.effectiveDiscountPercent ?? 0) / 100)}** customer benefit, checked against the ${pct(((primary.mechanics?.maxDiscountPercent ?? ctx.studio.max_discount_percent ?? 0) as number) / 100, 0)} cap that applies to this mechanism.`,
      `Built on ${primary.productName} at ${money(primary.mechanics?.listedPrice)} a class: ${count(primary.financials.expectedBuyers)} expected buyers at a ${pct(primary.mechanics?.redemptionRate ?? 0, 0)} redemption assumption, so scenario revenue is ${money(primary.financials.expectedRevenue)}.`,
      primary.financials.economicsComplete
        ? `Contribution at that volume is ${money(primary.financials.contributionMargin)}.`
        : `Contribution is not computed: ${primary.financials.warnings?.[0] ?? 'a cost input is missing'} I will not present an incomplete margin as a number.`,
      built.length > 1 ? `I priced ${built.length} alternatives — each is a draft, not an approval.` : 'This is a single policy-checked draft; nothing is approved or published.',
      ctx.assumedStudio ? `Using **${ctx.studio.name}** (the largest 2027 plan) because no studio was named — say a studio to price it there instead.` : '',
      failures.length ? `Skipped: ${failures.slice(0, 2).join('; ')}.` : '',
    ]),
    cards: [
      {
        kind: 'table',
        title: 'Policy-checked options',
        columns: ['Offer', 'Selling', 'List', 'Benefit', 'Scenario revenue'],
        rows: built.map(concept => [
          concept.name,
          money(concept.financials.sellingPrice),
          money(concept.mechanics?.listedPrice),
          pct((concept.financials.effectiveDiscountPercent ?? 0) / 100),
          money(concept.financials.expectedRevenue),
        ]),
        align: ['l', 'r', 'r', 'r', 'r'],
      },
      { kind: 'note', tone: 'info', text: 'Saving a draft runs policy and financial validation again. Approval and publishing stay separate.' },
      ctx.assumedStudio
        ? { kind: 'note', tone: 'warn', text: `Priced at ${ctx.studio.name} only. Prices, policy caps and capacity differ by studio.` }
        : { kind: 'note', tone: 'success', text: `Prices come from the ${ctx.studio.name} product master; nothing was substituted.` },
    ],
    sources: [
      { label: 'Studio policy', table: 'studio_offer_policies', detail: `Ceiling ${pct((ctx.studio.max_discount_percent ?? 0) / 100)}` },
      { label: 'Product master', table: 'products', detail: 'Real list prices, no substitutes' },
    ],
    calculation: [
      {
        label: 'Selling price',
        formula: `${money(primary.mechanics?.listedPrice)} list × ${primary.mechanics?.paidQuantity ?? 1} paid of ${primary.mechanics?.bundleQuantity ?? 1}`,
        value: money(primary.financials.sellingPrice),
      },
      {
        label: 'Reference value',
        formula: `${money(primary.mechanics?.listedPrice)} list × ${primary.mechanics?.bundleQuantity ?? 1} classes`,
        value: money(primary.financials.referenceValue ?? primary.financials.customerValue),
      },
      {
        label: 'Customer benefit',
        formula: '(reference − selling) ÷ reference',
        value: pct((primary.financials.effectiveDiscountPercent ?? 0) / 100),
      },
      {
        label: 'Scenario revenue',
        formula: `selling price × ${count(primary.financials.expectedBuyers)} expected buyers`,
        value: money(primary.financials.expectedRevenue),
      },
    ],
    followUps: ['Compare 2-for-1 with 3-for-2', 'What if we add a bonus class?', 'Save the first one as a draft'],
    nextActions: ['Pick one, then open it in Offer Studio to edit the creative and save a draft.'],
    data: { concepts: built, failures, ideas },
  } as ToolOutput;
};

// ─────────────────────────────────────────────────────────── compare mechanisms

const offerCompare: Tool = ctx => {
  if (!ctx.studio) return offerBuild({ ...ctx, slots: { ...ctx.slots, offerKind: null } });
  const kinds = ['newcomer_2_for_1', 'newcomer_3_for_2'] as const;
  const built = kinds.map(kind => {
    try {
      return buildOffer({
        studioId: ctx.studio!.id,
        kind,
        year: ctx.primary.year,
        month: ctx.primary.month,
        targetRevenue: (targetFor(ctx, ctx.primary).target ?? 0) * 0.05,
      }) as any;
    } catch {
      return null;
    }
  });
  const valid = built.filter(Boolean) as any[];
  const marginComparable = valid.length > 1 && valid.every(concept => concept.financials.economicsComplete);
  const best = marginComparable
    ? [...valid].sort((a, b) => (b.financials.contributionMargin ?? 0) - (a.financials.contributionMargin ?? 0))[0]
    : [...valid].sort((a, b) => (a.financials.effectiveDiscountPercent ?? 0) - (b.financials.effectiveDiscountPercent ?? 0))[0];
  return {
    type: 'offer_concept',
    content: headline(`2-for-1 vs 3-for-2 · ${ctx.studio.name}`, [
      ...valid.map(concept => `${concept.name}: **${money(concept.financials.sellingPrice)}** selling, ${pct((concept.financials.effectiveDiscountPercent ?? 0) / 100)} benefit, scenario revenue ${money(concept.financials.expectedRevenue)}.`),
      best
        ? marginComparable
          ? `Higher contribution margin: **${best.name}** — it trades a bigger commitment for a smaller percentage benefit.`
          : `Contribution cannot be compared because a variable cost is missing for both, so I am comparing on customer benefit only: **${best.name}** asks for the least.`
        : 'Neither option could be priced safely.',
      `Mechanism choice is a margin decision, not a marketing one: the deeper the percentage, the more volume it must buy back.`,
    ]),
    cards: [
      {
        kind: 'table',
        title: 'Mechanism comparison',
        columns: ['Offer', 'Selling', 'Benefit', 'Scenario revenue', 'Contribution'],
        rows: valid.map(concept => [concept.name, money(concept.financials.sellingPrice), pct((concept.financials.effectiveDiscountPercent ?? 0) / 100), money(concept.financials.expectedRevenue), concept.financials.economicsComplete ? money(concept.financials.contributionMargin) : 'incomplete']),
        align: ['l', 'r', 'r', 'r', 'r'],
      },
    ],
    sources: [{ label: 'Studio policy', table: 'studio_offer_policies' }, { label: 'Product master', table: 'products' }],
    calculation: [
      { label: 'Selling price', formula: 'list price × paid classes', value: valid.map(concept => `${concept.name.split('.')[0]}: ${money(concept.financials.sellingPrice)}`).join(' · ') },
      { label: 'Customer benefit', formula: '(reference − selling) ÷ reference', value: valid.map(concept => pct((concept.financials.effectiveDiscountPercent ?? 0) / 100)).join(' vs ') },
      { label: 'Scenario revenue', formula: 'selling price × expected buyers', value: valid.map(concept => money(concept.financials.expectedRevenue)).join(' vs ') },
    ],
    followUps: ['Build a 3-for-2 draft', 'What if we add a free class instead?', 'Show the price ladder'],
    nextActions: ['Choose on contribution margin and capacity, not on headline discount.'],
    data: { built: valid },
  };
};

// ─────────────────────────────────────────────────────────── what if

const whatIf: Tool = ctx => {
  const text = ctx.message;
  const priceChange = /(?:raise|increase|lift|hike)[^%.]*?(\d+(?:\.\d+)?)\s*%/.exec(text);
  const cut = /(?:cut|drop|lower|discount|reduce)[^%.]*?(\d+(?:\.\d+)?)\s*%/.exec(text);
  const volume = /(\d+(?:\.\d+)?)\s*%\s*(?:more|fewer|less|volume|lost|drop)/.exec(text);
  const conversion = /(\d+(?:\.\d+)?)\s*(?:points?|pts?|%)\s*(?:better|more|improvement|uplift)/.exec(text);
  const priceDelta = priceChange ? Number(priceChange[1]) / 100 : cut ? -Number(cut[1]) / 100 : 0;
  const volumeDelta = volume ? Number(volume[1]) / 100 * (/(?:fewer|less|lost|drop)/.test(volume[0]) ? -1 : 1) : 0;
  const conversionDelta = conversion ? Number(conversion[1]) / 100 : 0;

  const roll = targetFor(ctx, ctx.primary);
  const base = roll.target ?? roll.historical ?? 0;
  const newClientRevenue = roll.byStudio.reduce((sum, row) => sum + (Number(row.funnel?.requiredNewClientRevenue) || 0), 0);
  const repeatShare = Math.max(0, base - newClientRevenue);
  const newRevenue = newClientRevenue * (1 + priceDelta) * (1 + volumeDelta) * (1 + conversionDelta * 2) + repeatShare * (1 + priceDelta) * (1 + volumeDelta * 0.4);
  const revenueDelta = newRevenue - base;
  const discountCost = newRevenue * Math.max(0, -priceDelta);
  const breakEvenVolume = priceDelta < 0 ? -priceDelta / (1 + priceDelta) : priceDelta > 0 ? -priceDelta / (1 + priceDelta) : 0;

  const assumptions = [
    priceDelta ? `price ${delta(priceDelta)} applied to both new-client and repeat revenue` : 'no price change detected',
    volumeDelta ? `volume ${delta(volumeDelta)} (new-client volume moves fully, repeat at 40%)` : 'volume held flat',
    conversionDelta ? `conversion +${(conversionDelta * 100).toFixed(1)} pts treated as roughly double the revenue effect on new clients` : 'conversion held flat',
  ].join(' · ');

  return {
    type: 'analysis',
    content: headline(`Scenario · ${roll.label} ${ctx.scopeLabel}`, [
      `Base **${money(base)}** (${roll.basis} target). Modelled outcome **${money(newRevenue)}**, a change of **${money(revenueDelta)}** (${delta(safeDiv(revenueDelta, base) ?? 0)}).`,
      priceDelta < 0 ? `You would need about **${pct(breakEvenVolume, 0)} more volume** to stay revenue-neutral at that price.` : priceDelta > 0 ? `Break-even volume loss at this price rise is about **${pct(-breakEvenVolume, 0)}** — beyond that the rise costs more revenue than it adds.` : 'No price effect modelled.',
      `Assumptions: ${assumptions}.`,
      `This is arithmetic on the plan’s own revenue split, not a demand model: elasticity is not estimated from your data, so treat the output as a range-edge, not a forecast.`,
    ]),
    cards: [
      {
        kind: 'kpi',
        items: [
          { label: 'Base', value: money(base) },
          { label: 'Modelled', value: money(newRevenue), delta: delta(safeDiv(revenueDelta, base) ?? 0), tone: toneFor(revenueDelta) },
          { label: 'Change', value: money(revenueDelta), tone: toneFor(revenueDelta) },
          { label: 'Discount cost', value: money(discountCost) },
        ],
      },
      priceDelta ? { kind: 'note', tone: 'warn', text: `Break-even volume: ${pct(Math.abs(breakEvenVolume), 0)} ${priceDelta < 0 ? 'more' : 'less'}.` } : { kind: 'note', tone: 'info', text: 'Name a price or volume change to model, for example “what if we raise prices 5% and lose 3% of volume”.' },
    ],
    sources: [sourceForTargets(ctx.primary.year), { label: 'Revenue split', table: 'monthly_targets.funnel' }],
    followUps: ['What if conversion improves 5 points?', `How do we hit ${roll.label}?`, 'Build an offer that protects margin'],
    nextActions: ['Test the assumption on one studio before applying it to the group.'],
    calculation: [
      { label: 'New revenue', formula: 'new-client revenue × price × volume × conversion + repeat revenue × price × volume', value: money(newRevenue) },
      { label: 'Break-even volume', formula: '−price change ÷ (1 + price change)', value: priceDelta ? pct(Math.abs(breakEvenVolume), 1) : 'n/a' },
    ],
    data: { base, newRevenue, revenueDelta, priceDelta, volumeDelta, conversionDelta },
  };
};

// ─────────────────────────────────────────────────────────── price ladder

const priceLadder: Tool = ctx => {
  const catalog = pricing(ctx.studio?.id ?? null);
  const products = (catalog.products ?? [])
    .filter((product: any) => Number(product.list_price) > 0)
    .sort((a: any, b: any) => Number(b.list_price) - Number(a.list_price));
  const withPerClass = products
    .filter((product: any) => Number(product.sessions_included) > 1)
    .map((product: any) => ({
      ...product,
      perClass: Number(product.list_price) / Number(product.sessions_included),
    }));
  const best = [...withPerClass].sort((a, b) => a.perClass - b.perClass)[0];
  const ceiling = ctx.studio?.max_discount_percent ?? null;

  return {
    type: 'analysis',
    content: headline(`Price ladder · ${ctx.scopeLabel}`, [
      `**${products.length} priced products**. Highest: ${products[0]?.name ?? 'n/a'} at ${money(Number(products[0]?.list_price))}; lowest: ${products[products.length - 1]?.name ?? 'n/a'} at ${money(Number(products[products.length - 1]?.list_price))}.`,
      best ? `Best value per class: **${best.name}** at ${money(best.perClass)} a class across ${best.sessions_included} sessions.` : 'No multi-class pack is priced in the catalogue.',
      ceiling != null ? `Discount ceiling for this studio is **${pct(ceiling / 100)}** — every offer I build is checked against it.` : 'No discount ceiling is recorded.',
      `Prices are current product-master list prices (MRP), not last year’s transacted prices.`,
    ]),
    cards: [
      {
        kind: 'table',
        title: 'Priced products',
        columns: ['Product', 'List price', 'Sessions', 'Per class'],
        rows: products.slice(0, 12).map((product: any) => [
          product.name,
          money(Number(product.list_price)),
          product.sessions_included ?? '—',
          product.sessions_included > 1 ? money(Number(product.list_price) / Number(product.sessions_included)) : '—',
        ]),
        align: ['l', 'r', 'r', 'r'],
      },
    ],
    sources: [{ label: 'Product master', table: 'products', detail: 'Active, priced products only' }, { label: 'Policy', table: 'studio_offer_policies' }],
    calculation: [
      { label: 'Price per class', formula: 'list price ÷ sessions included', value: best ? `${money(best.perClass)} (${best.name})` : 'n/a' },
      { label: 'Discount ceiling', formula: 'studio policy cap on customer benefit', value: ceiling == null ? 'not recorded' : pct(ceiling / 100) },
    ],
    followUps: ['Build an offer on the 3-for-2 pack', 'What if we raise prices 5%?', 'Which category carries revenue?'],
    nextActions: ['Use the best per-class pack as the entry point in creative.'],
    data: { products: products.length, best },
  };
};

// ─────────────────────────────────────────────────────────── month plan

const planSummary: Tool = ctx => {
  const list = ctx.studio ? [ctx.studio] : studios();
  const plans = list
    .map(studio => ({ studio, plan: planFor(studio.id, ctx.primary.year, ctx.primary.month) }))
    .filter(item => item.plan);
  if (!plans.length) {
    const roll = targetFor(ctx, ctx.primary);
    return {
      type: 'analysis',
      content: `No monthly plan is written for ${monthLabel(ctx.primary.year, ctx.primary.month)} yet. The target is **${money(roll.target)}**; I can draft the levers or the offer mix instead.`,
      sources: [sourceForTargets(ctx.primary.year)],
      followUps: [`How do we hit ${monthLabel(ctx.primary.year, ctx.primary.month)}?`, 'Build an offer for this month'],
    };
  }
  const primary = plans[0].plan!;
  return {
    type: 'analysis',
    content: headline(`${monthLabel(ctx.primary.year, ctx.primary.month)} · ${primary.theme || 'Monthly plan'}`, [
      `**Objective.** ${primary.objective || 'Not recorded.'}`,
      `**Strategy.** ${primary.strategy || 'Not recorded.'}`,
      primary.actions.length
        ? `**Actions.**\n${bullets(
            primary.actions.slice(0, 5).map((action: any) =>
              typeof action === 'string'
                ? action
                : `Week ${action.week ?? '—'} · ${action.owner ?? 'owner TBC'} — ${action.text ?? action.label ?? ''}`,
            ),
          )}`
        : '**Actions.** None recorded.',
      `**Offers linked:** ${primary.offers.length ? primary.offers.map(offer => offer.name).join(', ') : 'none yet'}.`,
      !ctx.studio && plans.length > 1
        ? `Showing **${plans[0].studio.name}**; every studio has its own plan for this month: ${plans.map(item => `${item.studio.name} — ${item.plan!.theme || 'untitled'}`).join(' · ')}.`
        : '',
    ]),
    cards: [
      {
        kind: 'table',
        title: 'Offers in this month',
        columns: ['Offer', 'Type', 'Audience', 'Depth', 'Expected'],
        rows: primary.offers.slice(0, 8).map(offer => [
          offer.name,
          String(offer.offer_type || '').replaceAll('_', ' '),
          offer.audience || '—',
          offer.effective_discount ? pct(offer.effective_discount / 100) : '—',
          money(offer.expected_revenue),
        ]),
        align: ['l', 'l', 'l', 'r', 'r'],
      },
    ],
    sources: [{ label: 'Monthly plan', table: 'monthly_plans' }, { label: 'Offer bank', table: 'offers' }],
    calculation: [
      { label: 'Offers linked', formula: 'offers with this studio, year and month, excluding archived/rejected', value: `${primary.offers.length}` },
      { label: 'Planned revenue on those offers', formula: 'Σ expected_revenue', value: money(primary.offers.reduce((sum, offer) => sum + (Number(offer.expected_revenue) || 0), 0)) },
      { label: 'Mean discount depth', formula: 'mean effective_discount', value: primary.offers.length ? pct(primary.offers.reduce((sum, offer) => sum + (Number(offer.effective_discount) || 0), 0) / primary.offers.length / 100) : 'n/a' },
    ],
    followUps: [`How do we hit ${monthLabel(ctx.primary.year, ctx.primary.month)}?`, 'Show the collaterals needed', 'Which offers should I drop?'],
    nextActions: ['Lock the offer mix, then the collateral deadline follows from the lead time.'],
    data: primary,
  };
};

// ─────────────────────────────────────────────────────────── key days

const KEY_DAYS = [
  { date: '2027-01-01', name: 'New Year', months: [1], note: 'Resolution window; start the year with the re-up ladder.' },
  { date: '2027-01-26', name: 'Republic Day', months: [1], note: 'Public holiday — schedule around a late-morning class.' },
  { date: '2027-02-14', name: 'Valentine’s Day', months: [2], note: 'Pairs and duo classes; referral mechanic fits.' },
  { date: '2027-03-08', name: 'International Women’s Day', months: [3], note: 'Owns the month: members-first, community-led.' },
  { date: '2027-04-18', name: 'Physique 57 anniversary (9 years)', months: [4], note: 'Flagship month; birthday box and member stories.' },
  { date: '2027-06-21', name: 'International Yoga Day', months: [6], note: 'Cross-format trial with stretch and recovery.' },
  { date: '2027-08-15', name: 'Independence Day', months: [8], note: 'Long weekend; plan the schedule around it.' },
  { date: '2027-10-29', name: 'Diwali (Deepavali)', months: [10], note: 'Festive gifting, guest passes and retail bundles.' },
  { date: '2027-12-25', name: 'Christmas', months: [12], note: 'Gifting and year-end packs; close the year strong.' },
];

const keyDays: Tool = ctx => {
  const months = new Set(ctx.months.map(ref => ref.month));
  const scoped = ctx.months.length >= 12 ? KEY_DAYS : KEY_DAYS.filter(day => day.months.some(month => months.has(month)));
  return {
    type: 'analysis',
    content: headline(`Key days · ${ctx.months.length >= 12 ? ctx.year : ctx.months.map(ref => monthLabel(ref.year, ref.month, true)).join(', ')}`, [
      scoped.length
        ? scoped.map(day => `**${day.name}** — ${new Date(day.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}: ${day.note}`).join('\n')
        : 'No brand key days fall inside that window.',
      `Launch windows: creative and collateral should be finalised about three weeks before the date, and the offer should open a week ahead.`,
    ]),
    cards: [
      {
        kind: 'list',
        title: 'Moments and what they are for',
        rows: scoped.map(day => ({
          title: `${day.name} · ${new Date(day.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`,
          meta: `Launch by ${new Date(new Date(day.date).getTime() - 21 * 86400000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`,
          detail: day.note,
        })),
      },
    ],
    sources: [{ label: 'Brand calendar', detail: 'Festival dates fixed for 2027 (Diwali 29 Oct, anniversary 18 Apr).' }],
    calculation: [
      { label: 'Launch deadline', formula: 'event date − 21 days', value: scoped[0] ? new Date(new Date(scoped[0].date).getTime() - 21 * 86400000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'n/a' },
      { label: 'Offer opens', formula: 'event date − 7 days', value: scoped[0] ? new Date(new Date(scoped[0].date).getTime() - 7 * 86400000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'n/a' },
    ],
    followUps: ['What offers are planned for Diwali?', 'Build an anniversary offer', 'Which months look hardest?'],
    nextActions: ['Put the three-week launch deadline in the collateral plan.'],
    data: scoped,
  };
};

// ─────────────────────────────────────────────────────────── explain

const explain: Tool = ctx => {
  const previous = [...ctx.history]
    .reverse()
    .find(item => item.role === 'assistant' && (item.attachments?.calculation?.length || item.attachments?.meta?.calculation?.length));
  if (!previous)
    return {
      type: 'explain',
      content: 'There is no earlier calculation in this conversation to unpack. Ask a question first and I will show the working underneath it.',
      followUps: ['Give me the 2027 overview'],
    };
  const calc = (previous.attachments.calculation ?? previous.attachments.meta.calculation) as {
    label: string;
    formula: string;
    value: string;
  }[];
  const sources = (previous.attachments.sources ?? previous.attachments.meta.sources) as Source[] | undefined;
  return {
    type: 'explain',
    content: headline('How that answer was calculated', [
      ...calc.map(item => `- **${item.label}**: ${item.formula} → **${item.value}**`),
      sources?.length ? `\nSources: ${sources.map(source => `${source.label}${source.table ? ` (${source.table})` : ''}`).join(' · ')}.` : '',
      'No model wrote these numbers — they come from SQL over your imported data, with the formulas above.',
    ]),
    cards: [
      {
        kind: 'table',
        title: 'Working',
        columns: ['Step', 'Formula', 'Value'],
        rows: calc.map(item => [item.label, item.formula, item.value]),
        align: ['l', 'l', 'r'],
      },
    ],
    sources: sources ?? [],
    followUps: ['Show the renewals behind that', 'Which months look hardest?'],
  };
};

// ─────────────────────────────────────────────────────────── navigate

const navigate: Tool = ctx => {
  const wantsOffers = /offer|bank|library/i.test(ctx.message);
  const wantsReports = /report/i.test(ctx.message);
  const label = monthLabel(ctx.primary.year, ctx.primary.month, true);
  const route = wantsOffers ? '/sales-plan/offers' : wantsReports ? '/reports' : '/sales-plan/plan';
  return {
    type: 'navigation',
    content: wantsOffers
      ? 'The offer bank is where drafts, approvals and publishing live. I can open it, but nothing changes until you save.'
      : wantsReports
        ? 'Reports runs the saved, auditable queries. Opening it will not change any plan data.'
        : `${label} lives in the Sales plan workspace — cover, targets, offers, collaterals and execution.`,
    cards: [{ kind: 'note', tone: 'info', text: `Route ready: ${route}` }],
    sources: [],
    followUps: wantsOffers ? ['What offers are planned for this month?'] : ['What is the plan for this month?'],
    data: {
      action: {
        kind: 'navigate',
        route,
        label,
        month: monthKey(ctx.primary.year, ctx.primary.month),
        studioId: ctx.studio?.id ?? null,
      },
    },
  };
};

export const TOOLS: Record<ToolId, Tool> = {
  overview,
  month_gap: monthGap,
  year_outlook: yearOutlook,
  compare_studios: compareStudios,
  funnel,
  channels: channelTool,
  renewals: renewalTool,
  segments: segmentTool,
  products: productTool,
  attendance: attendanceTool,
  offer_portfolio: offerPortfolio,
  offer_build: offerBuild,
  offer_compare: offerCompare,
  what_if: whatIf,
  price_ladder: priceLadder,
  plan_summary: planSummary,
  key_days: keyDays,
  explain,
  navigate,
};

export function routeIntent(intent: string, message: string): ToolId {
  const byIntent: Record<string, ToolId> = {
    help: 'overview',
    month_gap: 'month_gap',
    year_outlook: 'year_outlook',
    compare_studios: 'compare_studios',
    funnel: 'funnel',
    channels: 'channels',
    renewals: 'renewals',
    segments: 'segments',
    products: 'products',
    attendance: 'attendance',
    offer_portfolio: 'offer_portfolio',
    offer_build: 'offer_build',
    offer_compare: 'offer_compare',
    what_if: 'what_if',
    price_ladder: 'price_ladder',
    plan_summary: 'plan_summary',
    key_days: 'key_days',
    explain: 'explain',
    navigate: 'navigate',
  };
  if (byIntent[intent]) return byIntent[intent];
  // Fall back on the question's own shape rather than guessing a specialised tool.
  const classified = classify(message);
  if (classified.candidates[0] && byIntent[classified.candidates[0].id]) return byIntent[classified.candidates[0].id];
  return 'overview';
}

/** Cheap, data-free suggestions used by the drawer's command palette. */
export function toolCatalogue() {
  return Object.entries(TOOLS).map(([id, _tool]) => ({ id }));
}

export { monthRange, monthKey, count, pct, rupees, delta };
