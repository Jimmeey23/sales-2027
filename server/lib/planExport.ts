import ExcelJS from 'exceljs';
import { stringify } from 'csv-stringify/sync';
import { db } from '../db.js';
import { planEconomics } from './planEconomics.js';
import { studioPlanDetail } from '../routes/studioPlans.js';
import { keyDatesFor, KEY_DATE_LABELS } from '../../src/data/keyDates.js';
import { offerSummary } from '../../src/lib/offerSummary.js';
import { monthSections } from './planMonths.js';

/* The year plan, as a document rather than a screen.

   Everything the app shows for a month lives in three places — the plan row (theme, story,
   actions, which offers it picked), the target row (the money and the funnel), and the offer
   bank (what each picked offer actually is). The studio needs that as one artefact it can
   hand to a regional head, drop in a deck, or open in Excel, for one location or for all of
   them. This module assembles the three into a single, stable structure, and then renders it
   as JSON, CSV, Excel or Markdown without any of the four formats inventing a number the
   others do not have.

   Shape (`schema` keeps the contract explicit for anything that imports it back):

     { schema, generatedAt, year, currency, scope, totals, studios: [ { studio, year, basis,
       trailing, months: [ { month, theme, target, streams, funnel, offers, keyDates, sections } ] } ] }
*/

export const PLAN_EXPORT_SCHEMA = 'p57-sales-plan/1';
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const round = (value: any) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : null;
};
const money = (value: any) => round(value);

type AnyRow = Record<string, any>;

const offerColumns =
  'id,name,headline,customer_copy,internal_description,rationale,objective,offer_type,audience,excluded_audience,benefit,mechanics,provenance,eligible_products,validity_start,validity_end,redemption_conditions,cta,target_purchases,expected_asp,expected_revenue,effective_discount,margin_impact,status,approval_status,run_ads,plan_slot,plan_rank';

function offersById(ids: number[]) {
  const clean = [...new Set(ids.filter(Boolean))];
  if (!clean.length) return new Map<number, AnyRow>();
  const rows = db
    .prepare(
      `SELECT ${offerColumns} FROM offers WHERE id IN (${clean.map(() => '?').join(',')}) AND status NOT IN ('archived','rejected')`,
    )
    .all(...clean) as AnyRow[];
  return new Map(rows.map(row => [Number(row.id), row]));
}

function parseJson(value: any, fallback: any) {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

/** One offer, flattened into the shape a reader (or a spreadsheet) wants. */
function offerRecord(row: AnyRow, slot: string | null) {
  const mechanics = parseJson(row.mechanics, {});
  const provenance = parseJson(row.provenance, {});
  // One plain sentence — the membership, what the client gets, and what the offer is for.
  const description = offerSummary({ ...row, provenance, mechanics }).sentence;
  return {
    id: Number(row.id),
    slot: slot || row.plan_slot || null,
    name: row.name,
    description,
    headline: row.headline || null,
    benefit: row.benefit || null,
    customerCopy: row.customer_copy || null,
    internalDescription: row.internal_description || null,
    rationale: row.rationale || null,
    objective: row.objective || null,
    type: row.offer_type || null,
    audience: row.audience || null,
    excludedAudience: row.excluded_audience || null,
    conditions: row.redemption_conditions || null,
    cta: row.cta || null,
    status: row.status || null,
    approval: row.approval_status || null,
    runAds: Boolean(Number(row.run_ads || 0)),
    price: money(row.expected_asp),
    expectedRevenue: money(row.expected_revenue),
    buyers: round(row.target_purchases),
    effectiveDiscountPercent:
      row.effective_discount === null ? null : Number(Number(row.effective_discount).toFixed(2)),
    contributionMargin: money(row.margin_impact),
    validity: { start: row.validity_start || null, end: row.validity_end || null },
    mechanics,
  };
}

/** The month's written plan: the story, the actions, and any custom sections. */
function sectionsOf(plan: AnyRow | null) {
  if (!plan) return [];
  const actions = Array.isArray(plan.actions) ? plan.actions : [];
  const out: Array<{ title: string; items: Array<{ label: string; value: string; detail: string }> }> = [];
  const grouped = new Map<string, Array<{ label: string; value: string; detail: string }>>();
  for (const item of actions) {
    const title = item.section || item.week ? String(item.section || `Week ${item.week}`) : 'Actions';
    const list = grouped.get(title) || [];
    list.push({
      label: String(item.label || item.title || item.name || ''),
      value: String(item.value || item.owner || ''),
      detail: String(item.detail || item.text || ''),
    });
    grouped.set(title, list);
  }
  for (const [title, items] of grouped) out.push({ title, items });
  const custom = parseJson(plan.content?.customSections, []);
  if (Array.isArray(custom)) {
    for (const section of custom) {
      out.push({
        title: String(section.title || 'Section'),
        items: (Array.isArray(section.items) ? section.items : []).map((item: AnyRow) => ({
          label: String(item.label || ''),
          value: String(item.value || ''),
          detail: String(item.detail || ''),
        })),
      });
    }
  }
  return out;
}

export interface PlanExportRequest {
  year: number;
  studioIds: number[];
  userId: number;
}

/** Build the whole document. Pure read: nothing is written, nothing is cached. */
export function buildYearPlan({ year, studioIds, userId }: PlanExportRequest) {
  const studios = studioIds.map(studioId => {
    const detail: any = studioPlanDetail(studioId, year, userId);
    if (!detail) return null;
    const economics: any = planEconomics(studioId, year);
    const plans = new Map<number, AnyRow>((detail.plans || []).map((p: AnyRow) => [Number(p.month), p]));
    const targets = new Map<number, AnyRow>((detail.targets || []).map((t: AnyRow) => [Number(t.month), t]));
    const months: AnyRow[] = [];

    for (let month = 1; month <= 12; month++) {
      const plan = plans.get(month) || null;
      const target = targets.get(month) || null;
      const econ = economics.months?.[month - 1] || null;
      const slots: AnyRow = parseJson(plan?.slots, {});
      const extras: number[] = Array.isArray(plan?.offer_ids) ? plan.offer_ids.map(Number) : [];
      const slotIds = Object.values(slots || {})
        .map(Number)
        .filter(Boolean);
      const bank = offersById([...slotIds, ...extras]);
      const offers = [
        ...Object.entries(slots || {})
          .filter(([, id]) => Number(id))
          .map(([slot, id]) => {
            const row = bank.get(Number(id));
            return row ? offerRecord(row, slot) : null;
          }),
        ...extras
          .filter(id => !slotIds.includes(id))
          .map(id => {
            const row = bank.get(id);
            return row ? offerRecord(row, null) : null;
          }),
      ].filter(Boolean) as AnyRow[];

      const revenueTarget = Number(target?.approved_target || target?.proposed_target || econ?.revenue?.target || 0);
      const priorYear = Number(target?.historical_revenue || econ?.benchmark?.prior2026Revenue || 0);
      const streams = {
        newClient: money(target?.new_client_target) ?? 0,
        renewal: money(target?.renewal_target) ?? 0,
        reactivation: money(target?.reactivation_target) ?? 0,
        other: money(target?.other_target ?? 0) ?? 0,
      };
      const funnel = {
        leads: econ?.newClient?.leads ?? null,
        trials: econ?.newClient?.trials ?? null,
        buyers: econ?.newClient?.buyers ?? null,
        renewalsDue: econ?.renewal?.projectedExpiries ?? null,
        renewalCoverage: econ?.renewal?.coverage ?? null,
        leadToTrial: econ?.newClient?.leadToTrial ?? null,
        trialToMember: econ?.newClient?.trialToMember ?? null,
      };
      // The month as the workspace reads it: cover, overview, execution, collateral, CRM.
      // Built by the same modules the screens use, so the file cannot drift from the page.
      const sections = monthSections({
        year,
        month,
        studioName: detail.studio.name,
        plan,
        target,
        econ,
        offers,
        revenues: {
          target: revenueTarget,
          priorYear,
          streams: {
            newClient: streams.newClient,
            renewal: streams.renewal,
            reactivation: streams.reactivation,
          },
        },
        funnel,
      });
      months.push({
        month,
        name: MONTH_NAMES[month - 1],
        status: target?.status || plan?.status || 'draft',
        theme: plan?.theme || null,
        objective: plan?.objective || null,
        strategy: plan?.strategy || null,
        notes: plan?.notes || null,
        target: money(revenueTarget),
        priorYear: money(priorYear),
        growthPercent: priorYear ? Number((((revenueTarget - priorYear) / priorYear) * 100).toFixed(1)) : null,
        streams,
        funnel: {
          ...funnel,
          newBuyers: funnel.buyers,
          existingPayingRenewals: econ?.renewal?.renewersNeeded ?? null,
          winbacksNeeded: econ?.reactivation?.needed ?? null,
          expiringMemberships: funnel.renewalsDue,
          spendPerVisit: money(econ?.newClient?.spendPerVisit),
          firstMonthSpend: money(econ?.newClient?.firstSpend),
          renewalTicket: money(econ?.renewal?.ticket),
          winbackTicket: money(econ?.reactivation?.ticket),
        },
        feasibility: econ?.benchmark?.feasibility || null,
        offers,
        keyDates: keyDatesFor(year, month).map(date => ({
          day: date.day,
          end: date.end ?? null,
          date: `${year}-${String(month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`,
          name: date.name,
          kind: date.kind,
          label: KEY_DATE_LABELS[date.kind] || date.kind,
          approx: Boolean(date.approx),
          note: date.note || null,
        })),
        sections: sectionsOf(plan),
        cover: sections.cover,
        overview: sections.overview,
        execution: sections.execution,
        collateral: sections.collateral,
        crm: sections.crm,
      });
    }

    const sum = (pick: (m: AnyRow) => number | null) => months.reduce((total, m) => total + (Number(pick(m)) || 0), 0);
    const trailing: AnyRow = economics.trailing || {};

    return {
      studio: {
        id: Number(detail.studio.id),
        name: detail.studio.name,
        city: detail.studio.city || null,
        code: detail.studio.code || null,
      },
      year: {
        target: sum(m => m.target),
        priorYear: sum(m => m.priorYear),
        growthPercent: null as number | null,
        streams: {
          newClient: sum(m => m.streams.newClient),
          renewal: sum(m => m.streams.renewal),
          reactivation: sum(m => m.streams.reactivation),
          other: sum(m => m.streams.other),
        },
      },
      basis: economics.basis || null,
      measuredWindow: economics.window || null,
      trailing,
      prices: economics.prices || {},
      months,
    };
  });

  const live = studios.filter(Boolean) as AnyRow[];
  for (const studio of live) {
    const prior = Number(studio.year.priorYear) || 0;
    studio.year.growthPercent = prior
      ? Number((((Number(studio.year.target) - prior) / prior) * 100).toFixed(1))
      : null;
  }
  const totals = {
    target: live.reduce((n, s) => n + (Number(s.year.target) || 0), 0),
    priorYear: live.reduce((n, s) => n + (Number(s.year.priorYear) || 0), 0),
    offers: live.reduce((n, s) => n + s.months.reduce((m: number, month: AnyRow) => m + month.offers.length, 0), 0),
  } as AnyRow;
  totals.growthPercent = totals.priorYear
    ? Number((((totals.target - totals.priorYear) / totals.priorYear) * 100).toFixed(1))
    : null;

  return {
    schema: PLAN_EXPORT_SCHEMA,
    generatedAt: new Date().toISOString(),
    year,
    currency: 'INR',
    units: 'rupees',
    scope: {
      type: live.length > 1 ? 'portfolio' : 'studio',
      studios: live.map(s => ({ id: s.studio.id, name: s.studio.name, city: s.studio.city })),
    },
    totals,
    studios: live,
  };
}

/* ── Rendering ─────────────────────────────────────────────────────────────── */

const csvValue = (value: any) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  if (typeof value === 'string' && /^\s*[=+\-@]/.test(value)) return `'${value}`;
  return value;
};

/** One row per offer, with its month and location repeated — the shape a spreadsheet filters. */
export function renderPlanCsv(doc: AnyRow) {
  const rows: AnyRow[] = [];
  for (const studio of doc.studios) {
    for (const month of studio.months) {
      const base = {
        location: studio.studio.name,
        city: studio.studio.city,
        month: month.name,
        monthNumber: month.month,
        theme: month.theme,
        status: month.status,
        revenueTarget: month.target,
        priorYear: month.priorYear,
        growthPercent: month.growthPercent,
        newClientTarget: month.streams.newClient,
        renewalTarget: month.streams.renewal,
        reactivationTarget: month.streams.reactivation,
        otherTarget: month.streams.other,
        leads: month.funnel.leads,
        trials: month.funnel.trials,
        newBuyers: month.funnel.newBuyers,
        renewersNeeded: month.funnel.existingPayingRenewals,
        winbacksNeeded: month.funnel.winbacksNeeded,
        expiringMemberships: month.funnel.expiringMemberships,
        renewalCoverage: month.funnel.renewalCoverage,
        leadToTrial: month.funnel.leadToTrial,
        trialToMember: month.funnel.trialToMember,
        spendPerVisit: month.funnel.spendPerVisit,
        firstMonthSpend: month.funnel.firstMonthSpend,
        renewalTicket: month.funnel.renewalTicket,
      };
      if (!month.offers.length) {
        rows.push({ ...base, offerSlot: '', offerName: '' });
        continue;
      }
      for (const offer of month.offers) {
        rows.push({
          ...base,
          offerSlot: offer.slot || '',
          offerName: offer.name,
          offerDescription: offer.description,
          offerHeadline: offer.headline,
          offerBenefit: offer.benefit,
          offerAudience: offer.audience,
          offerType: offer.type,
          offerObjective: offer.objective,
          offerStatus: offer.status,
          offerApproval: offer.approval,
          offerRunAds: offer.runAds ? 'yes' : 'no',
          offerPrice: offer.price,
          offerRevenue: offer.expectedRevenue,
          offerBuyers: offer.buyers,
          offerEffectiveDiscount: offer.effectiveDiscountPercent,
          offerContribution: offer.contributionMargin,
          offerValidityStart: offer.validity.start,
          offerValidityEnd: offer.validity.end,
          offerConditions: offer.conditions,
          offerCta: offer.cta,
          offerMechanics: offer.mechanics,
        });
      }
    }
  }
  const columns = Object.keys(rows[0] || {});
  const csv = stringify(
    rows.map(row => Object.fromEntries(Object.entries(row).map(([k, v]) => [k, csvValue(v)]))),
    {
      header: true,
      columns: columns.map(key => ({ key, header: key })),
    },
  );
  return `\uFEFF${csv}`;
}

/** A readable document, one section per location, in the order the workspace reads. */
const rupeesText = (value: any) =>
  value === null || value === undefined ? '—' : `₹${Number(value).toLocaleString('en-IN')}`;
const shareText = (value: any) =>
  value === null || value === undefined ? '—' : `${(Number(value) * 100).toFixed(0)}%`;
const growthText = (value: any) =>
  value === null || value === undefined ? '—' : `${Number(value) > 0 ? '+' : ''}${value}%`;

/** One month, in reading order: cover, overview, execution, offers, collateral, CRM. */
function renderMonthMarkdown(month: AnyRow) {
  const lines: string[] = [];
  const cover = month.cover || {};
  const overview = month.overview || {};
  const execution = month.execution || {};
  const collateral = month.collateral || { pieces: [] };
  const crm = month.crm || { sends: [] };

  lines.push(`### ${month.name} — ${cover.theme || month.theme || 'No theme set'}`);
  lines.push('');
  lines.push(
    `${cover.kicker || ''} · ${month.status || 'draft'} · target ${rupeesText(month.target)} (${growthText(
      month.growthPercent,
    )} vs ${rupeesText(month.priorYear)}) · ${cover.carriedPercent ?? 0}% of the target carried by the offers`,
  );
  lines.push('');

  lines.push('**Cover.**');
  lines.push('');
  if (cover.moment) {
    lines.push(`*The moment.* ${cover.moment}`);
    lines.push('');
  }
  if (cover.objective) {
    lines.push(`*The job.* ${cover.objective}`);
    lines.push('');
  }
  if (cover.brief) {
    lines.push(`*The brief.* ${cover.brief}`);
    lines.push('');
  }
  if (cover.risk) {
    lines.push(`*What goes wrong.* ${cover.risk}`);
    lines.push('');
  }
  if (cover.signature) {
    lines.push(`*The move.* ${cover.signature}`);
    lines.push('');
  }

  lines.push('**Overview.**');
  lines.push('');
  for (const [label, text] of [
    ['Where the money comes from', overview.brief],
    ['Who has to walk in', overview.leads],
    ['Who has to stay', overview.renewals],
  ] as Array<[string, string]>) {
    if (!text) continue;
    lines.push(`- **${label}.** ${text}`);
  }
  lines.push('');
  lines.push(
    `Target ${rupeesText(month.target)} · new ${rupeesText(month.streams?.newClient)} · renewals ${rupeesText(
      month.streams?.renewal,
    )} · comeback ${rupeesText(month.streams?.reactivation)}${
      month.streams?.other ? ` · other ${rupeesText(month.streams.other)}` : ''
    }`,
  );
  lines.push('');
  lines.push(
    `Funnel: ${month.funnel?.leads ?? '—'} leads → ${month.funnel?.trials ?? '—'} trials → ${
      month.funnel?.newBuyers ?? '—'
    } buyers · ${month.funnel?.existingPayingRenewals ?? '—'} renewals · ${
      month.funnel?.winbacksNeeded ?? '—'
    } win-backs · lead → trial ${shareText(month.funnel?.leadToTrial)} · trial → member ${shareText(
      month.funnel?.trialToMember,
    )}`,
  );
  lines.push('');

  lines.push('**Execution.**');
  lines.push('');
  if (execution.weeks?.length) {
    for (const week of execution.weeks) {
      lines.push(`*Week ${week.week}*`);
      for (const action of week.actions) lines.push(`- ${action.owner ? `${action.owner}: ` : ''}${action.text}`);
      lines.push('');
    }
  }
  if (execution.actions?.length) {
    lines.push(
      `${execution.actions.filter((a: AnyRow) => a.done).length} of ${execution.actions.length} actions done.`,
    );
    lines.push('');
  }
  if (execution.strategy?.length) {
    lines.push('Strategy:');
    for (const line of execution.strategy) lines.push(`- ${line.label ? `**${line.label}:** ` : ''}${line.text}`);
    lines.push('');
  }
  if (execution.activations?.length) {
    lines.push('Activations:');
    for (const item of execution.activations)
      lines.push(`- **${item.title || 'Activation'}**${item.text ? ` — ${item.text}` : ''}`);
    lines.push('');
  }
  if (execution.kpi) {
    lines.push(`*What to watch.* ${execution.kpi}`);
    lines.push('');
  }
  const dates = (month.keyDates || []).filter((d: AnyRow) => d.kind !== 'awareness');
  if (dates.length) {
    lines.push(`*Key dates:* ${dates.map((d: AnyRow) => `${d.day} ${month.name.slice(0, 3)} ${d.name}`).join(' · ')}`);
    lines.push('');
  }

  if (month.offers.length) {
    lines.push('**Offers.**');
    lines.push('');
    lines.push('| Slot | Offer | What it is | Audience | Price | Revenue | Buyers | Discount | Approval |');
    lines.push('| --- | --- | --- | --- | ---: | ---: | ---: | ---: | --- |');
    for (const offer of month.offers) {
      lines.push(
        `| ${offer.slot || '—'} | ${offer.name} | ${offer.description || '—'} | ${offer.audience || '—'} | ${rupeesText(
          offer.price,
        )} | ${rupeesText(offer.expectedRevenue)} | ${offer.buyers ?? '—'} | ${
          offer.effectiveDiscountPercent === null ? '—' : `${offer.effectiveDiscountPercent}%`
        } | ${offer.approval || offer.status || '—'} |`,
      );
    }
    lines.push('');
  }

  const pieces = collateral.pieces || [];
  if (pieces.length) {
    lines.push('**Collateral.**');
    lines.push('');
    if (collateral.title) {
      lines.push(`*${collateral.title}.* ${collateral.subtitle || ''}`.trim());
      lines.push('');
    }
    for (const piece of pieces) {
      lines.push(`*${piece.offer}*${piece.slot ? ` · ${piece.slot}` : ''}`);
      lines.push('');
      for (const channel of piece.channels || []) {
        lines.push(`- **${channel.title}** — final by ${channel.due} (${channel.lead} days ahead)`);
        for (const item of channel.items || []) lines.push(`  - ${item}`);
        if (channel.copyText) {
          lines.push(`  - ${channel.copyLabel}:`);
          for (const copyLine of String(channel.copyText).split('\n')) lines.push(`    > ${copyLine}`);
        }
      }
      lines.push('');
    }
  }

  if (crm.sends?.length) {
    lines.push('**CRM calendar.**');
    lines.push('');
    lines.push(
      `${crm.rule || 'One audience, one send.'} ${crm.sendsCount} outreaches this month instead of ${
        crm.ifSentPerOffer
      }${crm.saved ? ` (${crm.saved} fewer)` : ''}.`,
    );
    lines.push('');
    lines.push('| Date | Channel | Send | Audience | Offers |');
    lines.push('| --- | --- | --- | --- | --- |');
    for (const send of crm.sends) {
      lines.push(
        `| ${send.day} | ${send.channel} | ${send.label} | ${send.audience || 'All clients'} | ${(send.offers || []).join(', ')} |`,
      );
    }
    lines.push('');
  }

  if (month.sections?.length) {
    for (const section of month.sections) {
      lines.push(`**${section.title}**`);
      lines.push('');
      for (const item of section.items) {
        lines.push(`- ${item.label}${item.value ? `: ${item.value}` : ''}${item.detail ? ` — ${item.detail}` : ''}`);
      }
      lines.push('');
    }
  }
  lines.push('---');
  lines.push('');
  return lines;
}

export function renderPlanMarkdown(doc: AnyRow) {
  const lines: string[] = [];
  const monthName = doc.month ? String(doc.studios[0]?.months[0]?.name || '') : '';
  lines.push(`# Physique 57 · ${doc.year} sales plan${doc.month ? ` · ${monthName}` : ''}`);
  lines.push('');
  lines.push(
    `Generated ${new Date(doc.generatedAt).toISOString().slice(0, 10)} · ${
      doc.scope.type === 'portfolio' ? 'all locations' : doc.scope.studios[0]?.name
    } · currency INR`,
  );
  lines.push('');
  if (doc.scope.type === 'portfolio') {
    lines.push('| Location | 2027 target | 2026 actual | Growth | Offers |');
    lines.push('| --- | ---: | ---: | ---: | ---: |');
    for (const studio of doc.studios) {
      const offers = studio.months.reduce((n: number, m: AnyRow) => n + m.offers.length, 0);
      lines.push(
        `| ${studio.studio.name} | ${rupeesText(studio.year.target)} | ${rupeesText(
          studio.year.priorYear,
        )} | ${growthText(studio.year.growthPercent)} | ${offers} |`,
      );
    }
    lines.push(
      `| **Total** | **${rupeesText(doc.totals.target)}** | **${rupeesText(doc.totals.priorYear)}** | **${growthText(
        doc.totals.growthPercent,
      )}** | **${doc.totals.offers}** |`,
    );
    lines.push('');
  }

  for (const studio of doc.studios) {
    lines.push(`## ${studio.studio.name}${studio.studio.city ? ` · ${studio.studio.city}` : ''}`);
    lines.push('');
    lines.push(
      `Plan basis: ${
        studio.basis === 'observed_history' ? 'measured on the trailing twelve months' : 'playbook defaults'
      } · measured window ${studio.measuredWindow?.from || '—'} → ${studio.measuredWindow?.to || '—'}${
        doc.month ? ` · ${monthName} only` : ''
      }`,
    );
    lines.push('');
    for (const month of studio.months) lines.push(...renderMonthMarkdown(month));
  }
  return lines.join('\n');
}

/** A message, not a document: the shape that survives a paste into WhatsApp, Slack or an
 *  email — no tables, no markup, no line longer than a phone can show. */
export function renderPlanText(doc: AnyRow) {
  const rupees = (value: any) =>
    value === null || value === undefined ? '—' : `₹${Number(value).toLocaleString('en-IN')}`;
  const short = (value: any) =>
    value === null || value === undefined || value === ''
      ? '—'
      : Number(value) >= 100000
        ? `₹${(Number(value) / 100000).toFixed(1)}L`
        : `₹${Math.round(Number(value)).toLocaleString('en-IN')}`;
  const growth = (value: any) =>
    value === null || value === undefined ? '—' : `${Number(value) > 0 ? '+' : ''}${value}%`;
  const scope =
    doc.scope.type === 'portfolio' ? 'ALL LOCATIONS' : String(doc.scope.studios[0]?.name || '').toUpperCase();
  const lines: string[] = [];
  lines.push(`P57 · ${doc.year} SALES PLAN — ${scope}`);
  lines.push(`Generated ${new Date(doc.generatedAt).toISOString().slice(0, 10)} · amounts in INR`);
  lines.push('');
  lines.push(
    `${doc.month ? 'Month' : 'Year'} target ${short(doc.totals.target)} (${growth(
      doc.totals.growthPercent,
    )} vs ${short(doc.totals.priorYear)}) · ${doc.totals.offers} offers`,
  );

  for (const studio of doc.studios) {
    lines.push('');
    lines.push(
      `${studio.studio.name.toUpperCase()}${studio.studio.city ? ` · ${studio.studio.city}` : ''} — ${short(
        studio.year.target,
      )} (${growth(studio.year.growthPercent)} vs ${short(studio.year.priorYear)})`,
    );
    for (const month of studio.months) {
      if (!month.offers.length && !month.theme) continue;
      lines.push('');
      lines.push(`${month.name} · ${month.theme || 'No theme set'} — ${short(month.target)}`);
      // One month, pulled out on its own, has to carry its own reasoning — a list of offers
      // without the argument behind them is not the plan.
      if (doc.month) {
        if (month.cover?.moment) lines.push(`  The moment: ${month.cover.moment}`);
        if (month.cover?.objective) lines.push(`  The job: ${month.cover.objective}`);
        if (month.execution?.actions?.length)
          lines.push(
            `  Execution: ${
              month.execution.weeks?.length || 0
            } weeks of actions · ${month.execution.activations?.length || 0} activations · ${
              month.execution.actions.filter((a: AnyRow) => a.done).length
            } done`,
          );
        if (month.crm?.sends?.length)
          lines.push(
            `  CRM: ${month.crm.sends.length} sends, ${month.collateral?.pieces?.length || 0} offers with collateral`,
          );
      }
      for (const offer of month.offers) {
        const money = offer.expectedRevenue ? ` (${short(offer.expectedRevenue)} forecast)` : '';
        lines.push(`• ${offer.name}: ${offer.description || offer.headline || ''}${money}`);
      }
      const dates = month.keyDates.filter((d: AnyRow) => d.kind !== 'awareness').slice(0, 3);
      if (dates.length)
        lines.push(
          `  Key dates: ${dates.map((d: AnyRow) => `${d.day} ${month.name.slice(0, 3)} ${d.name}`).join(' · ')}`,
        );
    }
  }
  lines.push('');
  lines.push('Generated by P57 Sales Intelligence Studio. Figures come from the saved plan.');
  return lines.join('\n');
}

/** Copyable forms of the same document. Text is the message; the rest match the download. */
export function renderPlanCopy(doc: AnyRow, format: string) {
  const normal = String(format || 'text').toLowerCase();
  if (normal === 'md' || normal === 'markdown')
    return { format: 'md', mime: 'text/markdown', text: renderPlanMarkdown(doc) };
  if (normal === 'csv') return { format: 'csv', mime: 'text/csv', text: renderPlanCsv(doc) };
  if (normal === 'json') return { format: 'json', mime: 'application/json', text: JSON.stringify(doc, null, 2) };
  if (normal === 'text' || normal === 'txt' || normal === 'message')
    return { format: 'text', mime: 'text/plain', text: renderPlanText(doc) };
  return null;
}

/** Five sheets: the summary, the month grid, every offer, the dates, the assumptions. */
/* ── The print document ──────────────────────────────────────────────────────

   One file that opens in any browser and prints to A4: a cover, the year at a glance, then
   each location's month — its cover write-ups, overview, week-by-week execution, the offers
   with their maths, the collateral to produce with the copy to use, and the CRM calendar. The
   page starts fresh at every month, so a studio head can print the month they are in.
*/
const esc = (value: any) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const dayLabel = (value: any) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
};

const rupeesHtml = (value: any) =>
  value === null || value === undefined ? '—' : `₹${Number(value).toLocaleString('en-IN')}`;
const shortHtml = (value: any) => {
  const n = Number(value);
  if (!Number.isFinite(n) || !n) return '—';
  return n >= 10000000 ? `₹${(n / 10000000).toFixed(1)}Cr` : `₹${(n / 100000).toFixed(1)}L`;
};

function documentStyles() {
  return `
  :root {
    --ink: #14110f;
    --muted: #6b625c;
    --line: #ddd3cb;
    --accent: #b3172a;
    --paper: #fffdfa;
  }
  * { box-sizing: border-box; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body {
    margin: 0;
    background: #efeae4;
    color: var(--ink);
    font: 10.2px/1.42 "Instrument Sans", -apple-system, "Segoe UI", Helvetica, Arial, sans-serif;
  }
  .sheet {
    width: 210mm;
    min-height: 297mm;
    margin: 0 auto;
    padding: 14mm 15mm 12mm;
    background: var(--paper);
    position: relative;
  }
  .sheet + .sheet { margin-top: 10mm; }
  h1, h2, h3, h4 { font-family: Fraunces, "Iowan Old Style", Georgia, serif; font-weight: 600; margin: 0; letter-spacing: -0.01em; }
  h1 { font-size: 34px; line-height: 1.05; }
  h2 { font-size: 24px; line-height: 1.1; }
  h3 { font-size: 15px; line-height: 1.2; }
  h4 { font-size: 12px; }
  p { margin: 0 0 6px; }
  .kicker {
    font-size: 9px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--accent); font-weight: 600;
  }
  .runhead {
    display: flex; justify-content: space-between; align-items: baseline;
    border-bottom: 1px solid var(--ink); padding-bottom: 5px; margin-bottom: 12px;
    font-size: 9px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted);
  }
  .lede { font-size: 12px; line-height: 1.38; color: #2a2420; }
  .muted { color: var(--muted); }
  .grid { display: grid; gap: 10px; }
  .writeups { column-count: 2; column-gap: 8mm; }
  .writeups .block { break-inside: avoid; }
  .g2 { grid-template-columns: 1fr 1fr; }
  .g3 { grid-template-columns: 1fr 1fr 1fr; }
  .g4 { grid-template-columns: repeat(4, 1fr); }
  .stat { border: 1px solid var(--line); border-radius: 3px; padding: 7px 9px; background: #fff; }
  .stat .k { font-size: 8px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); }
  .stat .v { font-family: Fraunces, Georgia, serif; font-size: 17px; line-height: 1.2; }
  .block { margin-bottom: 9px; }
  .channel, .stat, .week { break-inside: avoid; }
  .block > .kicker { margin-bottom: 2px; }
  .rule { height: 1px; background: var(--line); margin: 8px 0; }
  table { width: 100%; border-collapse: collapse; font-size: 9.2px; }
  th { text-align: left; font-size: 8px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted);
       border-bottom: 1px solid var(--ink); padding: 4px 5px 4px 0; vertical-align: bottom; }
  td { border-bottom: 1px solid var(--line); padding: 4px 5px 4px 0; vertical-align: top; }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; padding-right: 0; }
  .tag { display: inline-block; font-size: 7.5px; letter-spacing: 0.09em; text-transform: uppercase;
         border: 1px solid var(--line); border-radius: 999px; padding: 1px 5px; color: var(--muted); }
  .tag.on { border-color: var(--accent); color: var(--accent); }
  .week { margin-bottom: 6px; }
  .week h4 { font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--accent); margin-bottom: 2px; }
  ul { margin: 0 0 6px; padding-left: 14px; }
  li { margin-bottom: 1.5px; }
  table.offers { table-layout: fixed; }
  table.offers td { word-break: break-word; }
  td.slot, th.slot { width: 22mm; }
  td.when, th.when { width: 17mm; }
  td.who, th.who { width: 28mm; }
  .spec { font-size: 8.2px; color: var(--muted); margin: 2px 0 3px; }
  .spec-list { font-size: 7.6px; color: var(--muted); line-height: 1.32; margin: 2px 0 8px;
               border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); padding: 4px 0; }
  .spec-list div + div { margin-top: 2px; }
  .pieces { column-count: 2; column-gap: 8mm; }
  .pieces.wide { column-count: 3; column-gap: 6mm; }
  .piece { margin-bottom: 8px; page-break-inside: avoid; break-inside: avoid; }
  .piece h4 { margin-bottom: 3px; }
  .copy { background: #faf6f1; border-left: 2px solid var(--accent); padding: 4px 6px; margin: 2px 0 5px;
          font-size: 7.4px; line-height: 1.3; white-space: pre-wrap; }
  .channel { margin-bottom: 4px; }
  .channel .head { display: flex; justify-content: space-between; gap: 8px; border-bottom: 1px dotted var(--line); }
  .month-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; margin-bottom: 8px; }
  .month-head .theme { font-family: Fraunces, Georgia, serif; font-size: 31px; line-height: 1; text-align: right; max-width: 86mm; }
  .footnote { position: absolute; bottom: 8mm; left: 15mm; right: 15mm; display: flex; justify-content: space-between;
              font-size: 8px; color: var(--muted); border-top: 1px solid var(--line); padding-top: 4px; }
  .cover-sheet { display: flex; flex-direction: column; justify-content: space-between; }
  .cover-sheet .big { font-family: Fraunces, Georgia, serif; font-size: 64px; line-height: 0.92; letter-spacing: -0.02em; }
  .locations { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .loc { border: 1px solid var(--line); padding: 8px 10px; }
  .loc .n { font-family: Fraunces, Georgia, serif; font-size: 15px; }
  .bar { height: 5px; background: #ece4dd; margin-top: 4px; }
  .bar > span { display: block; height: 5px; background: var(--accent); }
  .print-cta {
    position: fixed; right: 18px; bottom: 18px; z-index: 9;
    font: 600 12px/1 "Instrument Sans", system-ui, sans-serif; letter-spacing: 0.02em;
    padding: 11px 16px; border: 0; border-radius: 999px; cursor: pointer;
    background: #b3172a; color: #fff; box-shadow: 0 6px 20px rgba(20, 17, 15, 0.22);
  }
  .print-cta:hover { background: #94131f; }
  @page { size: A4; margin: 0; }
  @media print {
    body { background: #fff; }
    .print-cta { display: none; }
    /* Every part of every month starts a fresh page. A part with more in it than A4 holds —
       five offers' worth of copy, say — flows onto the next page instead of being cut off. */
    .sheet { width: auto; min-height: 0; margin: 0; padding: 11mm 13mm 9mm; break-inside: auto; }
    .sheet + .sheet { break-before: page; }
    /* The running head already names the location and month on every page, so the footnote
       is noise in print — and an orphaned one can push a blank page. */
    .footnote { display: none; }
    .theme, h2, h3, h4, .kicker { break-after: avoid; }
    /* A table that would leave one row behind on the next page moves whole instead. */
    .keep { break-inside: avoid; }
  }
  `;
}

function monthSheet(studioName: string, month: AnyRow, page: number, year: number) {
  const cover = month.cover || {};
  const overview = month.overview || {};
  const execution = month.execution || {};
  const pieces = month.collateral?.pieces || [];
  const sends = month.crm?.sends || [];
  const dates = (month.keyDates || []).filter((d: AnyRow) => d.kind !== 'awareness');
  const foot = (label: string, offset: number) =>
    `<div class="footnote"><span>${esc(studioName)} · ${esc(month.name)} ${esc(year)} · ${esc(label)}</span><span>page ${
      page + offset
    }</span></div>`;
  const head = (right: string) =>
    `<div class="runhead"><span>${esc(studioName)} · ${esc(month.name)}</span><span>${esc(right)}</span></div>`;

  const parts: string[] = [];

  /* 1 · The month as an argument: what it is, what it is for, how it runs. */
  parts.push(`<section class="sheet">`);
  parts.push(head(`${esc(year)} plan`));
  parts.push(`<div class="month-head"><div>
    <div class="kicker">${esc(cover.kicker || '')}</div>
    <h2>${esc(month.name)}</h2>
    <div class="muted">${esc(month.status || 'draft')} · target ${rupeesHtml(month.target)} · ${
      month.growthPercent === null ? '—' : `${Number(month.growthPercent) > 0 ? '+' : ''}${month.growthPercent}%`
    } vs ${rupeesHtml(month.priorYear)} · ${cover.carriedPercent ?? 0}% carried by the offers</div>
  </div><div class="theme">${esc(cover.theme || month.theme || '')}</div></div>`);

  parts.push(`<div class="grid g4 block">
    ${[
      ['Target', shortHtml(month.target)],
      ['New clients', shortHtml(month.streams?.newClient)],
      ['Renewals', shortHtml(month.streams?.renewal)],
      ['Comeback', shortHtml(month.streams?.reactivation)],
    ]
      .map(([k, v]) => `<div class="stat"><div class="k">${k}</div><div class="v">${v}</div></div>`)
      .join('')}
  </div>`);

  parts.push(`<div class="writeups">`);
  for (const [label, text] of [
    ['The moment', cover.moment],
    ['The job', cover.objective],
    ['The brief', cover.brief],
    ['What goes wrong', cover.risk],
    ['The move', cover.signature],
  ] as Array<[string, string]>) {
    if (!text) continue;
    parts.push(`<div class="block"><div class="kicker">${label}</div><p class="lede">${esc(text)}</p></div>`);
  }
  parts.push(`</div>`);

  parts.push(`<div class="rule"></div><div class="block"><div class="kicker">Overview</div></div>`);
  for (const [label, text] of [
    ['Where the money comes from', overview.brief],
    ['Who has to walk in', overview.leads],
    ['Who has to stay', overview.renewals],
  ] as Array<[string, string]>) {
    if (!text) continue;
    parts.push(`<p><strong>${label}.</strong> ${esc(text)}</p>`);
  }
  parts.push(
    `<p class="muted">Funnel ${month.funnel?.leads ?? '—'} leads → ${month.funnel?.trials ?? '—'} trials → ${
      month.funnel?.newBuyers ?? '—'
    } buyers · ${month.funnel?.existingPayingRenewals ?? '—'} renewals · ${month.funnel?.winbacksNeeded ?? '—'} win-backs · lead → trial ${
      month.funnel?.leadToTrial === null || month.funnel?.leadToTrial === undefined
        ? '—'
        : `${Math.round(Number(month.funnel.leadToTrial) * 100)}%`
    } · trial → member ${
      month.funnel?.trialToMember === null || month.funnel?.trialToMember === undefined
        ? '—'
        : `${Math.round(Number(month.funnel.trialToMember) * 100)}%`
    }</p>`,
  );

  if (execution.weeks?.length) {
    parts.push(`<div class="rule"></div><div class="block"><div class="kicker">Execution</div><div class="grid g2">`);
    for (const week of execution.weeks) {
      parts.push(
        `<div class="week"><h4>Week ${week.week}</h4><ul>${week.actions
          .map(
            (action: AnyRow) =>
              `<li>${action.owner ? `<strong>${esc(action.owner)}:</strong> ` : ''}${esc(action.text)}</li>`,
          )
          .join('')}</ul></div>`,
      );
    }
    parts.push(`</div></div>`);
  }
  parts.push(foot('the month', 1));
  parts.push(`</section>`);

  /* 2 · What it sells, and when every message about it leaves the studio. */
  parts.push(`<section class="sheet">`);
  parts.push(head('Offers · CRM'));

  if (month.offers.length) {
    parts.push(`<div class="block keep"><h3>Offers</h3>
      <table class="offers"><colgroup><col style="width:19mm"><col><col style="width:27mm">
      <col style="width:17mm"><col style="width:12mm"><col style="width:19mm"></colgroup>
      <thead><tr><th>Slot</th><th>Offer</th><th>Audience</th><th class="num">Price</th>
      <th class="num">Buyers</th><th class="num">Revenue</th></tr></thead><tbody>`);
    for (const offer of month.offers) {
      const validity = offer.validity;
      const window =
        validity && typeof validity === 'object' && (validity.start || validity.end)
          ? `${validity.start ? dayLabel(validity.start) : '—'} → ${validity.end ? dayLabel(validity.end) : '—'}`
          : typeof validity === 'string'
            ? validity
            : '';
      parts.push(`<tr>
        <td><span class="tag">${esc(offer.slot || '—')}</span></td>
        <td><strong>${esc(offer.name)}</strong>
          <div class="muted">${esc(offer.description || '')}</div>
          <div class="muted">${esc(offer.approval || offer.status || '')}${
            offer.effectiveDiscountPercent === null || offer.effectiveDiscountPercent === undefined
              ? ''
              : ` · ${offer.effectiveDiscountPercent}% off list`
          }${window ? ` · ${esc(window)}` : ''}</div></td>
        <td>${esc(offer.audience || '')}</td>
        <td class="num">${rupeesHtml(offer.price)}</td>
        <td class="num">${offer.buyers ?? '—'}</td>
        <td class="num">${rupeesHtml(offer.expectedRevenue)}</td>
      </tr>`);
    }
    parts.push(`</tbody></table></div>`);
  }

  if (execution.activations?.length || execution.kpi || dates.length) {
    parts.push(`<div class="rule"></div><div class="block"><div class="kicker">Activations & what to watch</div>`);
    if (execution.activations?.length) {
      parts.push(
        `<ul>${execution.activations
          .map(
            (item: AnyRow) => `<li><strong>${esc(item.title)}</strong>${item.text ? ` — ${esc(item.text)}` : ''}</li>`,
          )
          .join('')}</ul>`,
      );
    }
    if (execution.kpi) parts.push(`<p><strong>What to watch.</strong> ${esc(execution.kpi)}</p>`);
    if (dates.length) {
      parts.push(
        `<p class="muted"><strong>Key dates.</strong> ${dates
          .map((d: AnyRow) => `${esc(d.day)} ${esc(month.name.slice(0, 3))} — ${esc(d.name)}`)
          .join(' · ')}</p>`,
      );
    }
    parts.push(`</div>`);
  }

  parts.push(`<div class="rule"></div><div class="block keep"><h3>CRM calendar</h3>`);
  if (sends.length) {
    parts.push(`<p class="muted">${esc(month.crm?.rule || 'One audience, one send.')} ${sends.length} outreaches this month instead of ${
      month.crm?.ifSentPerOffer ?? sends.length
    }${month.crm?.saved ? ` — ${month.crm.saved} fewer` : ''}. Leads per send: WhatsApp ${
      month.crm?.leads?.whatsapp ?? '—'
    }, email ${month.crm?.leads?.email ?? '—'}, tent card ${month.crm?.leads?.tent ?? '—'}.</p>
    <table><thead><tr><th class="when">Date</th><th class="slot">Channel</th><th>Send</th><th class="who">Audience</th><th>Offers</th></tr></thead><tbody>`);
    for (const send of sends) {
      parts.push(
        `<tr><td class="when">${esc(send.day)}</td><td class="slot"><span class="tag">${esc(
          send.channel,
        )}</span></td><td>${esc(send.label)}</td><td class="who">${esc(send.audience || 'All clients')}</td><td>${esc(
          (send.offers || []).join(', '),
        )}${send.note ? `<div class="muted">${esc(send.note)}</div>` : ''}</td></tr>`,
      );
    }
    parts.push(`</tbody></table>`);
  } else {
    parts.push(`<p class="muted">No sends scheduled for this month.</p>`);
  }
  parts.push(`</div>`);
  parts.push(foot('offers · CRM', 2));
  parts.push(`</section>`);

  /* 3 · What has to be made, the spec behind it, and the copy to use. */
  parts.push(`<section class="sheet">`);
  parts.push(head('Collateral'));

  parts.push(`<div class="block keep"><h3>What each channel needs</h3>
    <div class="spec-list">${(month.collateral?.channelSpec || [])
      .map(
        (spec: AnyRow) =>
          `<div><strong>${esc(spec.title)}</strong> · final by ${esc(spec.due)} (${esc(
            spec.lead,
          )} days ahead) — ${(spec.items || []).map((item: string) => esc(item)).join(' · ')}</div>`,
      )
      .join('')}</div></div>`);

  if (pieces.length) {
    parts.push(
      `<div class="rule"></div><div class="block"><h3>${esc(
        month.collateral?.title || 'Marketing & collaterals',
      )}</h3><p class="muted">${esc(month.collateral?.subtitle || '')}</p><div class="pieces${
        pieces.length > 3 ? ' wide' : ''
      }">`,
    );
    for (const piece of pieces) {
      parts.push(`<div class="piece"><h4>${esc(piece.offer)}${piece.slot ? ` · ${esc(piece.slot)}` : ''}</h4>`);
      for (const channel of piece.channels || []) {
        parts.push(`<div class="channel">
          <div class="head"><strong>${esc(channel.title)}</strong>
            <span class="muted">final by ${esc(channel.due)}</span></div>
          ${channel.copyText ? `<div class="copy">${esc(channel.copyText)}</div>` : ''}
        </div>`);
      }
      parts.push(`</div>`);
    }
    parts.push(`</div></div>`);
  } else {
    parts.push(`<p class="muted">No collateral planned for this month.</p>`);
  }

  if (execution.strategy?.length || month.notes) {
    parts.push(`<div class="rule"></div><div class="block keep"><h3>The thinking behind it</h3>`);
    for (const line of execution.strategy || []) {
      parts.push(`<p>${line.label ? `<strong>${esc(line.label)}.</strong> ` : ''}${esc(line.text)}</p>`);
    }
    if (month.notes) parts.push(`<p class="muted"><strong>Notes.</strong> ${esc(month.notes)}</p>`);
    parts.push(`</div>`);
  }
  parts.push(foot('collateral', 3));
  parts.push(`</section>`);
  return parts.join('\n');
}

export function renderPlanDocument(doc: AnyRow) {
  const monthCount = doc.studios.reduce((n: number, s: AnyRow) => n + s.months.length, 0);
  const singleMonth = doc.month ? doc.studios[0]?.months[0] || null : null;
  const out: string[] = [];
  out.push(`<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Physique 57 · ${doc.year} sales plan</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Instrument+Sans:wght@400;500;600&display=swap" rel="stylesheet">
<style>${documentStyles()}</style></head><body>`);

  /* Cover */
  out.push(`<section class="sheet cover-sheet">
    <div>
      <div class="kicker">Physique 57 · sales plan</div>
      <div class="big">${
        singleMonth
          ? `${esc(singleMonth.name)}<br>${esc(singleMonth.cover?.theme || singleMonth.theme || '')}.`
          : `${esc(doc.year)}<br>The year, month<br>by month.`
      }</div>
      <p class="lede" style="max-width:130mm;margin-top:10mm">
        ${doc.scope.type === 'portfolio' ? 'All locations' : esc(doc.scope.studios[0]?.name || '')} ·
        ${monthCount} month${monthCount === 1 ? '' : 's'} · ${doc.totals.offers} offers · target ${rupeesHtml(
          doc.totals.target,
        )} (${
          doc.totals.growthPercent === null
            ? '—'
            : `${Number(doc.totals.growthPercent) > 0 ? '+' : ''}${doc.totals.growthPercent}%`
        } on ${rupeesHtml(doc.totals.priorYear)}).
        ${
          singleMonth
            ? `The month in full: its cover, the overview, how it runs week by week, the offers
        with their maths, the collateral to produce, and the ${singleMonth.crm?.sends?.length || 0} messages
        that leave the studio.`
            : `Every month opens with what it is for, then how it runs, what it sells, what has to be
        made, and when every message leaves the studio.`
        }
      </p>
    </div>
    <div>
      <div class="locations">
        ${doc.studios
          .map(
            (studio: AnyRow) => `<div class="loc">
              <div class="n">${esc(studio.studio.name)}</div>
              <div class="muted">${esc(studio.studio.city || '')} · ${
                studio.basis === 'observed_history' ? 'measured on the trailing year' : 'playbook defaults'
              }</div>
              <div style="margin-top:6px">${shortHtml(studio.year.target)} <span class="muted">(${
                studio.year.growthPercent === null
                  ? '—'
                  : `${Number(studio.year.growthPercent) > 0 ? '+' : ''}${studio.year.growthPercent}%`
              })</span></div>
              <div class="bar"><span style="width:${Math.min(
                100,
                Math.round(((studio.year.target || 0) / Math.max(1, doc.totals.target)) * 100),
              )}%"></span></div>
            </div>`,
          )
          .join('')}
      </div>
      <div class="footnote"><span>Generated ${new Date(doc.generatedAt).toISOString().slice(0, 10)} · Physique 57</span><span>Print · save as PDF</span></div>
    </div>
  </section>`);

  for (const studio of doc.studios) {
    studio.months.forEach((month: AnyRow, index: number) =>
      out.push(monthSheet(studio.studio.name, month, index * 2, doc.year)),
    );
  }

  // The button that makes the last step obvious: the browser's own print dialog is where a
  // studio head turns this into the PDF they forward.
  out.push(`<button class="print-cta" type="button" onclick="window.print()">Print · save as PDF</button>`);
  out.push(`</body></html>`);
  return out.join('\n');
}

/** One month of a document, or the whole year. */
export function scopePlanToMonth(doc: AnyRow, month: number | null) {
  if (!month || month < 1 || month > 12) return doc;
  const studios = doc.studios
    .map((studio: AnyRow) => {
      const months = studio.months.filter((m: AnyRow) => Number(m.month) === month);
      if (!months.length) return null;
      const target = months.reduce((n: number, m: AnyRow) => n + (Number(m.target) || 0), 0);
      const priorYear = months.reduce((n: number, m: AnyRow) => n + (Number(m.priorYear) || 0), 0);
      return {
        ...studio,
        year: {
          ...studio.year,
          target,
          priorYear,
          growthPercent: priorYear ? Number((((target - priorYear) / priorYear) * 100).toFixed(1)) : null,
        },
        months,
      };
    })
    .filter(Boolean);
  const totalTarget = studios.reduce((n: number, s: AnyRow) => n + (Number(s.year.target) || 0), 0);
  const totalPrior = studios.reduce((n: number, s: AnyRow) => n + (Number(s.year.priorYear) || 0), 0);
  return {
    ...doc,
    month,
    scope: { ...doc.scope, month },
    studios,
    totals: {
      target: totalTarget,
      priorYear: totalPrior,
      growthPercent: totalPrior ? Number((((totalTarget - totalPrior) / totalPrior) * 100).toFixed(1)) : null,
      offers: studios.reduce(
        (n: number, s: AnyRow) => n + s.months.reduce((m: number, x: AnyRow) => m + x.offers.length, 0),
        0,
      ),
    },
  };
}

export async function renderPlanXlsx(doc: AnyRow) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'P57 Sales Intelligence Studio';
  workbook.created = new Date();
  workbook.subject = `${doc.year} sales plan`;
  workbook.description = 'Full-year plan: targets, funnel requirements, offers, key dates.';

  const header = (sheet: ExcelJS.Worksheet, row: number, labels: string[]) => {
    sheet.getRow(row).values = labels;
    sheet.getRow(row).font = { bold: true, size: 9, color: { argb: 'FF6B675C' } };
    sheet.getRow(row).border = { bottom: { style: 'thin', color: { argb: 'FFDDD9CE' } } };
    sheet.views = [{ state: 'frozen', ySplit: row }];
  };
  const title = (sheet: ExcelJS.Worksheet, text: string, subtitle: string) => {
    sheet.mergeCells('A1:F1');
    sheet.getCell('A1').value = 'PHYSIQUE 57 · SALES INTELLIGENCE';
    sheet.getCell('A1').font = { bold: true, size: 10, color: { argb: 'FFD93A2B' } };
    sheet.mergeCells('A2:F2');
    sheet.getCell('A2').value = text;
    sheet.getCell('A2').font = { bold: true, size: 18, color: { argb: 'FF14130F' } };
    sheet.mergeCells('A3:F3');
    sheet.getCell('A3').value = subtitle;
    sheet.getCell('A3').font = { size: 10, color: { argb: 'FF6B675C' } };
  };

  const summary = workbook.addWorksheet('Summary', { views: [{ showGridLines: false }] });
  title(
    summary,
    `${doc.year} sales plan — ${doc.scope.type === 'portfolio' ? 'all locations' : doc.scope.studios[0]?.name}`,
    `Generated ${new Date(doc.generatedAt).toISOString().slice(0, 16).replace('T', ' ')} · amounts in INR`,
  );
  header(summary, 5, ['Location', 'City', `${doc.year} target`, 'Prior year', 'Growth', 'Offers']);
  let r = 6;
  for (const studio of doc.studios) {
    const offers = studio.months.reduce((n: number, m: AnyRow) => n + m.offers.length, 0);
    summary.getRow(r).values = [
      studio.studio.name,
      studio.studio.city || '',
      studio.year.target,
      studio.year.priorYear,
      studio.year.growthPercent === null ? null : studio.year.growthPercent / 100,
      offers,
    ];
    r++;
  }
  summary.getRow(r).values = [
    'Total',
    '',
    doc.totals.target,
    doc.totals.priorYear,
    doc.totals.growthPercent / 100,
    doc.totals.offers,
  ];
  summary.getRow(r).font = { bold: true };
  summary.getColumn(3).numFmt = summary.getColumn(4).numFmt = '₹#,##0';
  summary.getColumn(5).numFmt = '0.0%';
  summary.columns.forEach((column, index) => (column.width = [26, 12, 16, 16, 10, 8][index] || 12));

  const months = workbook.addWorksheet('Months', { views: [{ showGridLines: false }] });
  title(months, 'Month by month', 'The target, its split, and the people it needs');
  header(months, 5, [
    'Location',
    'Month',
    'Theme',
    'Status',
    'Target',
    'Prior year',
    'Growth',
    'New clients',
    'Renewals',
    'Comeback',
    'Other',
    'Leads',
    'Trials',
    'New buyers',
    'Renewers needed',
    'Win-backs',
    'Expiring',
    'Coverage',
    'Lead→trial',
    'Trial→member',
  ]);
  r = 6;
  for (const studio of doc.studios) {
    for (const month of studio.months) {
      months.getRow(r).values = [
        studio.studio.name,
        month.name,
        month.theme || '',
        month.status,
        month.target,
        month.priorYear,
        month.growthPercent === null ? null : month.growthPercent / 100,
        month.streams.newClient,
        month.streams.renewal,
        month.streams.reactivation,
        month.streams.other,
        month.funnel.leads,
        month.funnel.trials,
        month.funnel.newBuyers,
        month.funnel.existingPayingRenewals,
        month.funnel.winbacksNeeded,
        month.funnel.expiringMemberships,
        month.funnel.renewalCoverage,
        month.funnel.leadToTrial,
        month.funnel.trialToMember,
      ];
      r++;
    }
  }
  for (const col of [5, 6, 8, 9, 10, 11]) months.getColumn(col).numFmt = '₹#,##0';
  for (const col of [7, 18, 19, 20]) months.getColumn(col).numFmt = '0.0%';
  months.columns.forEach(
    (column, index) =>
      (column.width = [24, 12, 34, 10, 14, 14, 9, 13, 12, 11, 9, 9, 9, 10, 13, 11, 11, 10, 11, 12][index] || 12),
  );

  /* The five sheets that make the file a plan rather than a table of targets: the cover's
     argument, the overview, the week-by-week execution, the collateral to produce and the
     CRM calendar. Each is one row per month (or per item within the month), so the workbook
     filters and pivots the same way the rest of it does. */

  const cover = workbook.addWorksheet('Cover', { views: [{ showGridLines: false }] });
  title(cover, 'The month cover', 'What the month is called, what it argues, and what it is for');
  header(cover, 5, [
    'Location',
    'Month',
    'Kicker',
    'Theme',
    'The moment',
    'The job',
    'The brief',
    'What goes wrong',
    'The move',
    'Status',
    'Target',
    'Carried %',
    'New clients',
    'Renewals',
    'Comeback',
  ]);
  r = 6;
  for (const studio of doc.studios) {
    for (const month of studio.months) {
      const c = month.cover || {};
      cover.getRow(r).values = [
        studio.studio.name,
        month.name,
        c.kicker || '',
        c.theme || month.theme || '',
        c.moment || '',
        c.objective || month.objective || '',
        c.brief || '',
        c.risk || '',
        c.signature || '',
        month.status || '',
        month.target,
        (c.carriedPercent ?? 0) / 100,
        month.streams.newClient,
        month.streams.renewal,
        month.streams.reactivation,
      ];
      cover.getRow(r).alignment = { wrapText: true, vertical: 'top' };
      r++;
    }
  }
  for (const col of [11, 13, 14, 15]) cover.getColumn(col).numFmt = '₹#,##0';
  cover.getColumn(12).numFmt = '0%';
  cover.columns.forEach(
    (column, index) => (column.width = [22, 12, 30, 26, 60, 60, 70, 46, 40, 10, 14, 10, 13, 13, 12][index] || 12),
  );

  const overview = workbook.addWorksheet('Overview', { views: [{ showGridLines: false }] });
  title(overview, 'The month, in plain words', 'Where the money comes from, and who has to walk in and stay');
  header(overview, 5, [
    'Location',
    'Month',
    'Where the money comes from',
    'Who has to walk in',
    'Who has to stay',
    'Target',
    'Leads',
    'Trials',
    'New buyers',
    'Renewers needed',
    'Win-backs',
    'Lead → trial',
    'Trial → member',
  ]);
  r = 6;
  for (const studio of doc.studios) {
    for (const month of studio.months) {
      const o = month.overview || {};
      overview.getRow(r).values = [
        studio.studio.name,
        month.name,
        o.brief || '',
        o.leads || '',
        o.renewals || '',
        month.target,
        month.funnel.leads,
        month.funnel.trials,
        month.funnel.newBuyers,
        month.funnel.existingPayingRenewals,
        month.funnel.winbacksNeeded,
        month.funnel.leadToTrial,
        month.funnel.trialToMember,
      ];
      overview.getRow(r).alignment = { wrapText: true, vertical: 'top' };
      r++;
    }
  }
  overview.getColumn(6).numFmt = '₹#,##0';
  for (const col of [12, 13]) overview.getColumn(col).numFmt = '0%';
  overview.columns.forEach(
    (column, index) => (column.width = [22, 12, 62, 54, 50, 14, 9, 9, 11, 15, 11, 11, 12][index] || 12),
  );

  const execution = workbook.addWorksheet('Execution', { views: [{ showGridLines: false }] });
  title(execution, 'How the month runs', 'The actions by week, the strategy, and the activations that create demand');
  header(execution, 5, ['Location', 'Month', 'Kind', 'Week', 'Owner', 'Detail', 'Done']);
  r = 6;
  for (const studio of doc.studios) {
    for (const month of studio.months) {
      const e = month.execution || {};
      for (const action of e.actions || []) {
        execution.getRow(r).values = [
          studio.studio.name,
          month.name,
          'Action',
          action.week,
          action.owner,
          action.text,
          action.done ? 'yes' : 'no',
        ];
        r++;
      }
      for (const line of e.strategy || []) {
        execution.getRow(r).values = [studio.studio.name, month.name, 'Strategy', null, line.label, line.text, ''];
        r++;
      }
      for (const item of e.activations || []) {
        execution.getRow(r).values = [studio.studio.name, month.name, 'Activation', null, item.title, item.text, ''];
        r++;
      }
      if (e.kpi) {
        execution.getRow(r).values = [studio.studio.name, month.name, 'What to watch', null, '', e.kpi, ''];
        r++;
      }
    }
  }
  execution.getRow(5).alignment = { wrapText: false };
  execution.columns.forEach((column, index) => (column.width = [22, 12, 14, 8, 20, 92, 8][index] || 12));

  const collateral = workbook.addWorksheet('Collateral', { views: [{ showGridLines: false }] });
  title(collateral, 'Marketing & collaterals', 'What has to be made, when it is due, and the copy to use');
  header(collateral, 5, [
    'Location',
    'Month',
    'Offer',
    'Slot',
    'Channel',
    'Final by',
    'Lead days',
    'Deliverables',
    'Copy label',
    'Copy',
  ]);
  r = 6;
  for (const studio of doc.studios) {
    for (const month of studio.months) {
      for (const piece of month.collateral?.pieces || []) {
        for (const channel of piece.channels || []) {
          collateral.getRow(r).values = [
            studio.studio.name,
            month.name,
            piece.offer,
            piece.slot || '',
            channel.title,
            channel.due,
            channel.lead,
            (channel.items || []).join('\n• '),
            channel.copyLabel,
            channel.copyText,
          ];
          collateral.getRow(r).alignment = { wrapText: true, vertical: 'top' };
          r++;
        }
      }
    }
  }
  collateral.columns.forEach((column, index) => (column.width = [22, 12, 34, 11, 22, 11, 10, 62, 30, 70][index] || 12));

  const crm = workbook.addWorksheet('CRM', { views: [{ showGridLines: false }] });
  title(crm, 'CRM calendar', 'One audience, one send — the day every message leaves the studio');
  header(crm, 5, ['Location', 'Month', 'Date', 'Channel', 'Send', 'Audience', 'Offers', 'Note']);
  r = 6;
  for (const studio of doc.studios) {
    for (const month of studio.months) {
      const plan = month.crm || { sends: [] };
      for (const send of plan.sends || []) {
        crm.getRow(r).values = [
          studio.studio.name,
          month.name,
          send.date,
          send.channel,
          send.label,
          send.audience || 'All clients',
          (send.offers || []).join(', '),
          send.note || '',
        ];
        r++;
      }
      if (!(plan.sends || []).length) {
        crm.getRow(r).values = [studio.studio.name, month.name, '', '', 'No sends scheduled', '', '', ''];
        r++;
      }
    }
  }
  crm.columns.forEach((column, index) => (column.width = [22, 12, 12, 11, 20, 22, 56, 26][index] || 12));

  const offers = workbook.addWorksheet('Offers', { views: [{ showGridLines: false }] });
  title(offers, 'Every offer in the plan', 'The month it belongs to, what it is, and what it is expected to make');
  header(offers, 5, [
    'Location',
    'Month',
    'Slot',
    'Offer',
    'What it is',
    'Audience',
    'Objective',
    'Type',
    'Price',
    'Expected revenue',
    'Buyers',
    'Discount %',
    'Contribution',
    'Validity start',
    'Validity end',
    'Status',
    'Approval',
    'Run ads',
    'Conditions',
  ]);
  r = 6;
  for (const studio of doc.studios) {
    for (const month of studio.months) {
      for (const offer of month.offers) {
        offers.getRow(r).values = [
          studio.studio.name,
          month.name,
          offer.slot || '',
          offer.name,
          offer.description || '',
          offer.audience || '',
          offer.objective || '',
          offer.type || '',
          offer.price,
          offer.expectedRevenue,
          offer.buyers,
          offer.effectiveDiscountPercent === null ? null : offer.effectiveDiscountPercent / 100,
          offer.contributionMargin,
          offer.validity.start || '',
          offer.validity.end || '',
          offer.status || '',
          offer.approval || '',
          offer.runAds ? 'yes' : 'no',
          offer.conditions || '',
        ];
        r++;
      }
    }
  }
  for (const col of [9, 10, 13]) offers.getColumn(col).numFmt = '₹#,##0';
  offers.getColumn(12).numFmt = '0.0%';
  offers.columns.forEach(
    (column, index) =>
      (column.width = [22, 12, 11, 40, 64, 26, 16, 16, 12, 16, 9, 11, 13, 12, 12, 10, 12, 8, 46][index] || 12),
  );

  const dates = workbook.addWorksheet('Key dates', { views: [{ showGridLines: false }] });
  title(dates, 'Key dates', 'The days that change how a month is bought');
  header(dates, 5, ['Location', 'Month', 'Date', 'Name', 'Kind', 'Note']);
  r = 6;
  for (const studio of doc.studios) {
    for (const month of studio.months) {
      for (const date of month.keyDates) {
        dates.getRow(r).values = [studio.studio.name, month.name, date.date, date.name, date.label, date.note || ''];
        r++;
      }
    }
  }
  dates.columns.forEach((column, index) => (column.width = [22, 12, 12, 34, 12, 60][index] || 12));

  const assumptions = workbook.addWorksheet('Assumptions', { views: [{ showGridLines: false }] });
  title(assumptions, 'Measured assumptions', 'The rates every requirement in the plan divides by');
  header(assumptions, 5, ['Location', 'Metric', 'Value']);
  r = 6;
  for (const studio of doc.studios) {
    const t = studio.trailing || {};
    const rows: Array<[string, any]> = [
      ['Plan basis', studio.basis === 'observed_history' ? 'measured history' : 'playbook defaults'],
      ['Measured window', `${studio.measuredWindow?.from || '—'} → ${studio.measuredWindow?.to || '—'}`],
      ['Lead → trial', t.leadToTrial],
      ['Trial → member', t.trialToMember],
      ['Spend per visit', t.spendPerVisit],
      ['First-month spend', t.firstSpend],
      ['Monthly spend, existing member', t.existingSpend],
      ['Renewal rate', t.renewalRate],
      ['Renewal ticket', t.renewalTicket],
      ['Win-back ticket', t.reactivationTicket],
    ];
    for (const [metric, value] of rows) {
      assumptions.getRow(r).values = [studio.studio.name, metric, value ?? null];
      r++;
    }
  }
  assumptions.columns.forEach((column, index) => (column.width = [24, 34, 24][index] || 12));

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer as ArrayBuffer);
}
