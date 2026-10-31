import ExcelJS from 'exceljs';
import { stringify } from 'csv-stringify/sync';
import { db } from '../db.js';
import { planEconomics } from './planEconomics.js';
import { studioPlanDetail } from '../routes/studioPlans.js';
import { keyDatesFor, KEY_DATE_LABELS } from '../../src/data/keyDates.js';

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
  'id,name,headline,customer_copy,internal_description,rationale,objective,offer_type,audience,excluded_audience,benefit,mechanics,validity_start,validity_end,redemption_conditions,cta,target_purchases,expected_asp,expected_revenue,effective_discount,margin_impact,status,approval_status,run_ads,plan_slot,plan_rank';

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
  return {
    id: Number(row.id),
    slot: slot || row.plan_slot || null,
    name: row.name,
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
    effectiveDiscountPercent: row.effective_discount === null ? null : Number(Number(row.effective_discount).toFixed(2)),
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
      const slotIds = Object.values(slots || {}).map(Number).filter(Boolean);
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
        streams: {
          newClient: money(target?.new_client_target),
          renewal: money(target?.renewal_target),
          reactivation: money(target?.reactivation_target),
          other: money(target?.other_target ?? 0),
        },
        funnel: {
          leads: econ?.newClient?.leads ?? null,
          trials: econ?.newClient?.trials ?? null,
          newBuyers: econ?.newClient?.buyers ?? null,
          existingPayingRenewals: econ?.renewal?.renewersNeeded ?? null,
          winbacksNeeded: econ?.reactivation?.needed ?? null,
          expiringMemberships: econ?.renewal?.projectedExpiries ?? null,
          renewalCoverage: econ?.renewal?.coverage ?? null,
          leadToTrial: econ?.newClient?.leadToTrial ?? null,
          trialToMember: econ?.newClient?.trialToMember ?? null,
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
      });
    }

    const sum = (pick: (m: AnyRow) => number | null) =>
      months.reduce((total, m) => total + (Number(pick(m)) || 0), 0);
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
  const csv = stringify(rows.map(row => Object.fromEntries(Object.entries(row).map(([k, v]) => [k, csvValue(v)]))), {
    header: true,
    columns: columns.map(key => ({ key, header: key })),
  });
  return `\uFEFF${csv}`;
}

/** A readable document, one section per location, that survives a paste into anything. */
export function renderPlanMarkdown(doc: AnyRow) {
  const rupees = (value: any) => (value === null || value === undefined ? '—' : `₹${Number(value).toLocaleString('en-IN')}`);
  const pct = (value: any) => (value === null || value === undefined ? '—' : `${(Number(value) * 100).toFixed(0)}%`);
  const lines: string[] = [];
  lines.push(`# Physique 57 · ${doc.year} sales plan`);
  lines.push('');
  lines.push(
    `Generated ${new Date(doc.generatedAt).toISOString().slice(0, 10)} · ${doc.scope.type === 'portfolio' ? 'all locations' : doc.scope.studios[0]?.name} · currency INR`,
  );
  lines.push('');
  lines.push('| Location | 2027 target | 2026 actual | Growth | Offers |');
  lines.push('| --- | ---: | ---: | ---: | ---: |');
  for (const studio of doc.studios) {
    const offers = studio.months.reduce((n: number, m: AnyRow) => n + m.offers.length, 0);
    lines.push(
      `| ${studio.studio.name} | ${rupees(studio.year.target)} | ${rupees(studio.year.priorYear)} | ${
        studio.year.growthPercent === null ? '—' : `${studio.year.growthPercent > 0 ? '+' : ''}${studio.year.growthPercent}%`
      } | ${offers} |`,
    );
  }
  lines.push(
    `| **Total** | **${rupees(doc.totals.target)}** | **${rupees(doc.totals.priorYear)}** | **${
      doc.totals.growthPercent === null ? '—' : `${doc.totals.growthPercent > 0 ? '+' : ''}${doc.totals.growthPercent}%`
    }** | **${doc.totals.offers}** |`,
  );
  lines.push('');

  for (const studio of doc.studios) {
    lines.push(`## ${studio.studio.name}${studio.studio.city ? ` · ${studio.studio.city}` : ''}`);
    lines.push('');
    lines.push(
      `Plan basis: ${studio.basis === 'observed_history' ? 'measured on the trailing twelve months' : 'playbook defaults'} · measured window ${
        studio.measuredWindow?.from || '—'
      } → ${studio.measuredWindow?.to || '—'}`,
    );
    lines.push('');
    for (const month of studio.months) {
      lines.push(`### ${month.name} — ${month.theme || 'No theme set'}`);
      lines.push('');
      if (month.objective) lines.push(`**Objective.** ${month.objective}`);
      if (month.strategy) {
        lines.push('');
        lines.push(`**Strategy.** ${month.strategy}`);
      }
      lines.push('');
      lines.push(
        `Target ${rupees(month.target)} (${month.growthPercent === null ? '—' : `${month.growthPercent > 0 ? '+' : ''}${month.growthPercent}%`} vs ${rupees(
          month.priorYear,
        )}) · new ${rupees(month.streams.newClient)} · renewals ${rupees(month.streams.renewal)} · comeback ${rupees(
          month.streams.reactivation,
        )}${month.streams.other ? ` · other ${rupees(month.streams.other)}` : ''}`,
      );
      lines.push('');
      lines.push(
        `Funnel: ${month.funnel.leads ?? '—'} leads → ${month.funnel.trials ?? '—'} trials → ${month.funnel.newBuyers ?? '—'} buyers · ${
          month.funnel.existingPayingRenewals ?? '—'
        } renewals · ${month.funnel.winbacksNeeded ?? '—'} win-backs`,
      );
      lines.push('');
      if (month.offers.length) {
        lines.push('| Slot | Offer | Audience | Price | Revenue | Buyers | Discount | Approval |');
        lines.push('| --- | --- | --- | ---: | ---: | ---: | ---: | --- |');
        for (const offer of month.offers) {
          lines.push(
            `| ${offer.slot || '—'} | ${offer.name} | ${offer.audience || '—'} | ${rupees(offer.price)} | ${rupees(
              offer.expectedRevenue,
            )} | ${offer.buyers ?? '—'} | ${offer.effectiveDiscountPercent === null ? '—' : `${offer.effectiveDiscountPercent}%`} | ${
              offer.approval || offer.status || '—'
            } |`,
          );
        }
        lines.push('');
      }
      const dates = month.keyDates.filter((d: AnyRow) => d.kind !== 'awareness');
      if (dates.length) {
        lines.push(`Key dates: ${dates.map((d: AnyRow) => `${d.day} ${month.name.slice(0, 3)} ${d.name}`).join(' · ')}`);
        lines.push('');
      }
      if (month.sections.length) {
        for (const section of month.sections) {
          lines.push(`**${section.title}**`);
          lines.push('');
          for (const item of section.items) {
            lines.push(`- ${item.label}${item.value ? `: ${item.value}` : ''}${item.detail ? ` — ${item.detail}` : ''}`);
          }
          lines.push('');
        }
      }
      lines.push(`Lead → trial ${pct(month.funnel.leadToTrial)} · trial → member ${pct(month.funnel.trialToMember)} · spend per visit ${rupees(
        month.funnel.spendPerVisit,
      )}`);
      lines.push('');
      lines.push('---');
      lines.push('');
    }
  }
  return lines.join('\n');
}

/** Five sheets: the summary, the month grid, every offer, the dates, the assumptions. */
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
  summary.getRow(r).values = ['Total', '', doc.totals.target, doc.totals.priorYear, doc.totals.growthPercent / 100, doc.totals.offers];
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
  months.columns.forEach((column, index) => (column.width = [24, 12, 34, 10, 14, 14, 9, 13, 12, 11, 9, 9, 9, 10, 13, 11, 11, 10, 11, 12][index] || 12));

  const offers = workbook.addWorksheet('Offers', { views: [{ showGridLines: false }] });
  title(offers, 'Every offer in the plan', 'The month it belongs to, what it is, and what it is expected to make');
  header(offers, 5, [
    'Location',
    'Month',
    'Slot',
    'Offer',
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
  for (const col of [8, 9, 12]) offers.getColumn(col).numFmt = '₹#,##0';
  offers.getColumn(11).numFmt = '0.0%';
  offers.columns.forEach((column, index) => (column.width = [22, 12, 11, 46, 26, 16, 16, 12, 16, 9, 11, 13, 12, 12, 10, 12, 8, 46][index] || 12));

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
