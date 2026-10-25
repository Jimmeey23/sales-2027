import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { db, audit } from '../db.js';
import { PLAYBOOKS_2027 } from '../../src/data/2027Playbooks.js';

// Sources: "P57 India — 2027 Monthly Sales Execution Playbooks" (Base scenario, ₹ incl. GST),
// "Historical Sales Intelligence Report (2023–2026)", Bengaluru_Sales_Plan_2027.xlsx and
// Physique57_Commercial_Data_Model_v1.0.xlsx (2026 monthly actuals). Extracted JSON lives in server/data.
const DATA_DIR = path.resolve('server/data');
const readJson = (file: string) => JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8'));

export const PLAN_SOURCE = 'P57 2027 Monthly Sales Execution Playbooks · Base';
export const WORKBOOK_SOURCE = 'Bengaluru_Sales_Plan_2027.xlsx · 2027 Targets';
// Copper + Cloves and Plash Pilates each carry their own target and strategy and roll up into "Pop-up".
export const POPUP_PARENT = 'Pop-up';
export const POPUP_CHILDREN = ['Copper + Cloves', 'Plash Pilates'];
// The workbook only reports the pop-ups combined; this split is an editable planning assumption.
export const POPUP_SPLIT: Record<string, number> = { 'Copper + Cloves': 0.5, 'Plash Pilates': 0.5 };

// Mumbai studios follow the playbook PDF (annual stream totals ₹ lakh, booking→attendance proxy).
const MUMBAI_META: Record<
  string,
  {
    streamsL: [number, number, number];
    attendance: number;
    dataModelId: string;
    april: { new: number; renewal: number; reactivation: number };
  }
> = {
  'Kemps Corner': {
    streamsL: [58.8, 241.3, 48.0],
    attendance: 0.89,
    dataModelId: 'STU_KH',
    april: { new: 4.5, renewal: 38.0, reactivation: 7.8 },
  },
  Bandra: {
    streamsL: [37.2, 151.6, 22.9],
    attendance: 0.87,
    dataModelId: 'STU_SHQ',
    april: { new: 4.0, renewal: 22.9, reactivation: 4.2 },
  },
};
// User-directed Kemps Corner guardrail (rent increase from Jan 2027): average ₹35L a month, each month ₹20–60L.
export const KEMPS_GUARDRAIL = { average: 3500000, min: 2000000, max: 6000000 };

const L = 100000;
const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n: number) => String(n).padStart(2, '0');
const lastDay = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();

// Keeps the playbook's month-to-month shape, rescaled to the guardrail average and clamped to its range.
export function kempsMonthlyTargets() {
  const shape = PLAYBOOKS_2027['Kemps Corner'].months.map(m => m.revenueL * L);
  const total = KEMPS_GUARDRAIL.average * 12;
  let values = shape.map(v => (v * total) / shape.reduce((a, b) => a + b, 0));
  for (let pass = 0; pass < 10; pass++) {
    values = values.map(v => Math.min(KEMPS_GUARDRAIL.max, Math.max(KEMPS_GUARDRAIL.min, v)));
    const free = values.map(v => v > KEMPS_GUARDRAIL.min && v < KEMPS_GUARDRAIL.max);
    const gap = total - values.reduce((a, b) => a + b, 0),
      freeSum = values.reduce((s, v, i) => s + (free[i] ? v : 0), 0);
    if (Math.abs(gap) < 1 || !freeSum) break;
    values = values.map((v, i) => (free[i] ? v + (gap * v) / freeSum : v));
  }
  const rounded = values.map(v => Math.round(v / 10000) * 10000);
  const drift = total - rounded.reduce((a, b) => a + b, 0),
    big = rounded.indexOf(Math.max(...rounded.filter(v => v < KEMPS_GUARDRAIL.max)));
  rounded[big] += drift;
  return rounded;
}

// Split a Mumbai month's target into streams in proportion to that month's client counts (April uses the plan's split).
function mumbaiStreams(studio: string, month: number, target: number) {
  const meta = MUMBAI_META[studio],
    pb = PLAYBOOKS_2027[studio],
    m = pb.months[month - 1];
  const scale = target / (m.revenueL * L);
  if (month === 4) {
    const { new: n, renewal: r, reactivation: a } = meta.april;
    return {
      new: n * L * scale,
      renewal: r * L * scale,
      reactivation: a * L * scale,
      other: Math.max(0, target - (n + r + a) * L * scale),
    };
  }
  const sum = (key: 'buyers' | 'renewalPurchases' | 'reactivated') => pb.months.reduce((s, x) => s + x[key], 0);
  let n = ((meta.streamsL[0] * L * m.buyers) / sum('buyers')) * scale,
    r = ((meta.streamsL[1] * L * m.renewalPurchases) / sum('renewalPurchases')) * scale,
    a = ((meta.streamsL[2] * L * m.reactivated) / sum('reactivated')) * scale;
  const allocated = n + r + a;
  if (allocated > target) {
    const k = target / allocated;
    n *= k;
    r *= k;
    a *= k;
  }
  return { new: n, renewal: r, reactivation: a, other: Math.max(0, target - n - r - a) };
}

function writeTarget(
  studioId: number,
  year: number,
  month: number,
  row: Record<string, any>,
  userId: number | null,
  reason: string,
) {
  const before = db
    .prepare('SELECT * FROM monthly_targets WHERE studio_id=? AND year=? AND month=?')
    .get(studioId, year, month) as any;
  let id: number;
  if (before) {
    db.prepare(
      `UPDATE monthly_targets SET ${Object.keys(row)
        .map(k => `${k}=?`)
        .join(',')},version=version+1,override_reason=?,updated_by=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`,
    ).run(...Object.values(row), reason, userId, before.id);
    id = before.id;
  } else {
    id = Number(
      db
        .prepare(
          `INSERT INTO monthly_targets(studio_id,year,month,${Object.keys(row).join(',')},updated_by) VALUES (?,?,?${',?'.repeat(Object.keys(row).length)},?)`,
        )
        .run(studioId, year, month, ...Object.values(row), userId).lastInsertRowid,
    );
  }
  const after = db.prepare('SELECT * FROM monthly_targets WHERE id=?').get(id) as any;
  db.prepare('INSERT INTO target_versions(target_id,version,snapshot,change_reason,changed_by) VALUES (?,?,?,?,?)').run(
    id,
    after.version,
    JSON.stringify(after),
    reason,
    userId,
  );
  return { before, after };
}

export function applyPlanTargets(year: number, userId: number | null) {
  const actuals = readJson('actuals-2026-by-studio.json');
  const bengaluru = readJson('bengaluru-plan-2027.json');
  const salesOfferPlan = readJson('sales-offer-plan-2027.json') as any[];
  const parseArrowPair = (raw: unknown): [number, number] => {
    const parts = String(raw || '')
      .split('→')
      .map(s => Number(s.replace(/[^0-9.]/g, '').trim()));
    return [Number.isFinite(parts[0]) ? parts[0] : 0, Number.isFinite(parts[1]) ? parts[1] : 0];
  };
  const studio = (name: string) => db.prepare('SELECT * FROM studios WHERE name=?').get(name) as any;
  const results: any[] = [];
  const tx = db.transaction(() => {
    const kemps = kempsMonthlyTargets();
    for (const studioName of Object.keys(MUMBAI_META)) {
      const s = studio(studioName);
      if (!s) continue;
      const hasCheckins =
        Number((db.prepare('SELECT COUNT(*) n FROM checkins WHERE studio_id=?').get(s.id) as any)?.n || 0) > 0;
      const meta = MUMBAI_META[studioName],
        pb = PLAYBOOKS_2027[studioName];
      let annual = 0;
      for (let month = 1; month <= 12; month++) {
        const m = pb.months[month - 1],
          target = studioName === 'Kemps Corner' ? kemps[month - 1] : m.revenueL * L;
        const streams = mumbaiStreams(studioName, month, target),
          bookings = Math.ceil(m.trials / meta.attendance);
        const funnel = {
          requiredNewClientRevenue: streams.new,
          requiredNewBuyers: m.buyers,
          requiredCompletedTrials: m.trials,
          requiredTrialBookings: bookings,
          requiredLeads: m.leads,
          calculationPath: [
            {
              label: 'Qualified leads',
              formula: 'Playbook count (trials arriving through a logged lead)',
              value: m.leads,
              unit: 'leads',
            },
            {
              label: 'Trial bookings',
              formula: `ceil(trials ÷ ${Math.round(meta.attendance * 100)}% attendance proxy)`,
              value: bookings,
              unit: 'bookings',
            },
            { label: 'Completed trials', formula: 'Playbook count', value: m.trials, unit: 'trials' },
            { label: 'New commitment buyers', formula: 'Playbook count', value: m.buyers, unit: 'buyers' },
          ],
          warnings: [] as string[],
        };
        const prior = actuals[meta.dataModelId]?.[month];
        const before = db
          .prepare('SELECT baseline_forecast, assumptions FROM monthly_targets WHERE studio_id=? AND year=? AND month=?')
          .get(s.id, year, month) as any;
        const previous = before ? JSON.parse(before.assumptions || '{}') : {};
        const baselineForecast =
          Number(before?.baseline_forecast) > 0 ? Number(before.baseline_forecast) : Math.round(m.revenueL * L);
        const assumptions = {
          ...previous,
          planSource: PLAN_SOURCE,
          bengaluruWorkbook: undefined,
          scenarioRange: undefined,
          conversionSources: {
            ...(previous.conversionSources || {}),
            bookingToAttendanceRate: hasCheckins
              ? 'checkins_historical_all_bookings'
              : previous.conversionSources?.bookingToAttendanceRate || 'playbook_attendance_proxy',
          },
          scenarioExplanation:
            studioName === 'Kemps Corner'
              ? 'Playbook seasonality rescaled to the user-directed Kemps Corner guardrail: about ₹35L a month on average, each month between ₹20L and ₹60L.'
              : `2027 Base plan target from the Monthly Sales Execution Playbooks (${m.vs2026! >= 0 ? '+' : ''}${m.vs2026}% vs 2026E).`,
          comparableMonth: prior
            ? `${year - 1}-${pad(month)}${prior.partial ? ' (partial)' : ''} · Commercial Data Model`
            : previous.comparableMonth,
          playbook: {
            objective: m.objective,
            leadOffer: m.offer,
            leads: m.leads,
            trials: m.trials,
            buyers: m.buyers,
            renewalsDue: m.renewalsDue,
            renewalPurchases: m.renewalPurchases,
            reactivated: m.reactivated,
            lapsedTouches: m.lapsedTouches,
            playbookTarget: m.revenueL * L,
          },
          ...(studioName === 'Kemps Corner'
            ? {
                rentAdjustment: {
                  ...(previous.rentAdjustment || {}),
                  effectiveMonth: '2027-01',
                  minimumTarget: KEMPS_GUARDRAIL.min,
                  maximumTarget: KEMPS_GUARDRAIL.max,
                  averageTarget: KEMPS_GUARDRAIL.average,
                  preAdjustmentTarget: previous.rentAdjustment?.preAdjustmentTarget ?? baselineForecast,
                  source: 'user_directed_planning_assumption',
                  reason:
                    'Kwality House rent increases from January 2027. User-directed guardrail: about ₹35L a month on average, each month ₹20–60L.',
                },
              }
            : {}),
        };
        const transactions = m.buyers + m.renewalPurchases + m.reactivated;
        writeTarget(
          s.id,
          year,
          month,
          {
            scenario: 'base',
            historical_revenue: prior?.net ?? null,
            baseline_forecast: baselineForecast,
            proposed_target: target,
            target_growth: prior?.net ? Math.round((target / prior.net - 1) * 1000) / 10 : null,
            new_client_target: streams.new,
            renewal_target: streams.renewal,
            repeat_target: 0,
            reactivation_target: streams.reactivation,
            other_target: streams.other,
            target_transactions: transactions,
            expected_aov: transactions ? target / transactions : null,
            funnel: JSON.stringify(funnel),
            assumptions: JSON.stringify(assumptions),
            source: 'plan_2027',
            data_mode: 'plan',
          },
          userId,
          `Imported ${PLAN_SOURCE}`,
        );
        annual += target;
      }
      results.push({ studio: studioName, annual });
    }
    // Bengaluru: workbook targets + empirical non-new stream allocation from the 2027 Sales & Offer Plan.
    const bengaluruRow = (planStudio: string, month: number, w: any, share: number, label: string) => {
      const target = w.target * share,
        newRevenue = w.newRevenue * share,
        existing = w.existingRevenue * share;
      const sopEntry = salesOfferPlan.find(x => x.studio === planStudio && Number(x.month) === month);
      const sopPlan = sopEntry?.plan || {};
      const sopRenewal = Number(sopPlan['Renewal plan']) || 0;
      const sopReact = Number(sopPlan['Reactivation plan']) || 0;
      const sopOther = Number(sopPlan['Drop-ins, privates, retail']) || 0;
      const sopNonNew = sopRenewal + sopReact + sopOther;
      const renewalRevenue = sopNonNew > 0 ? existing * (sopRenewal / sopNonNew) : existing * 0.72;
      const reactivationRevenue = sopNonNew > 0 ? existing * (sopReact / sopNonNew) : existing * 0.14;
      const otherRevenue = Math.max(0, existing - renewalRevenue - reactivationRevenue);
      const [sopDue, sopRenPurchases] = parseArrowPair(
        sopPlan['Renewals due → purchases'] ?? sopPlan['Regulars → pack buys'],
      );
      const [sopLapsedPool, sopReactivated] = parseArrowPair(sopPlan['Lapsed touches → reactivated']);
      const leads = Math.round(w.leads * share),
        trials = Math.round(w.trials * share),
        newPaying = Math.round(w.newPaying * share),
        renewalsDue = Math.round(sopDue * share),
        renewalPurchases = Math.max(1, Math.round((sopRenPurchases || w.existingPaying * 0.72) * share)),
        lapsedTouches = Math.round(sopLapsedPool * share),
        reactivated = Math.max(1, Math.round((sopReactivated || w.existingPaying * 0.28) * share));
      const funnel = {
        requiredNewClientRevenue: newRevenue,
        requiredNewBuyers: newPaying,
        requiredCompletedTrials: trials,
        requiredTrialBookings: trials,
        requiredLeads: leads,
        calculationPath: [
          {
            label: 'Leads needed',
            formula: 'Workbook: first visits ÷ lead→first-visit rate',
            value: leads,
            unit: 'leads',
          },
          {
            label: 'First visits / trials',
            formula: 'Workbook: new paying clients ÷ paying-per-first-visit rate',
            value: trials,
            unit: 'visits',
          },
          {
            label: 'New paying clients',
            formula: 'Workbook: new-client revenue ÷ first-month spend',
            value: newPaying,
            unit: 'clients',
          },
        ],
        warnings: [] as string[],
      };
      const assumptions = {
        planSource: WORKBOOK_SOURCE,
        streamLabels: { renewal: planStudio === POPUP_PARENT ? 'Pack conversions & renewals' : 'Renewals & existing' },
        scenarioExplanation: `${label}. Stretch: ₹${Math.round(w.stretch * share).toLocaleString('en-IN')}.`,
        comparableMonth: `${year - 1} same month · workbook (actual / Q4 estimate)`,
        playbook: {
          leads,
          trials,
          buyers: newPaying,
          renewalsDue,
          renewalPurchases,
          reactivated,
          lapsedTouches,
        },
        workbook: {
          leads,
          trials,
          newPaying,
          packageConversions: Math.round(w.packageConversions * share),
          existingPaying: Math.round(w.existingPaying * share),
          renewalsDue,
          renewalPurchases,
          reactivated,
          lapsedTouches,
          checkins: Math.round(w.checkins * share),
          offerLed: w.offerLed * share,
          stretch: w.stretch * share,
          avgSpend: w.avgSpend,
        },
      };
      const transactions = newPaying + renewalPurchases + reactivated;
      return {
        scenario: 'base',
        historical_revenue: w.last * share,
        baseline_forecast: Math.round(w.last * (1 + Math.max(-0.15, Math.min(0.2, Number(w.growth) || 0))) * share),
        proposed_target: target,
        target_growth: Math.round(w.growth * 1000) / 10,
        new_client_target: newRevenue,
        renewal_target: renewalRevenue,
        repeat_target: 0,
        reactivation_target: reactivationRevenue,
        other_target: otherRevenue,
        target_transactions: transactions,
        expected_aov: transactions ? target / transactions : null,
        funnel: JSON.stringify(funnel),
        assumptions: JSON.stringify(assumptions),
        source: 'plan_2027',
        data_mode: 'plan',
      };
    };
    const kh = studio('Kenkere House');
    if (kh) {
      bengaluru.targets['Kenkere House'].forEach((w: any, i: number) =>
        writeTarget(
          kh.id,
          year,
          i + 1,
          bengaluruRow('Kenkere House', i + 1, w, 1, 'Bengaluru workbook 2027 target'),
          userId,
          `Imported ${WORKBOOK_SOURCE}`,
        ),
      );
      results.push({
        studio: 'Kenkere House',
        annual: bengaluru.targets['Kenkere House'].reduce((s: number, w: any) => s + w.target, 0),
      });
    }
    for (const child of POPUP_CHILDREN) {
      const s = studio(child);
      if (!s) continue;
      bengaluru.targets[POPUP_PARENT].forEach((w: any, i: number) =>
        writeTarget(
          s.id,
          year,
          i + 1,
          bengaluruRow(
            POPUP_PARENT,
            i + 1,
            w,
            POPUP_SPLIT[child],
            `${Math.round(POPUP_SPLIT[child] * 100)}% of the workbook pop-up target (venue split is a planning assumption — edit as needed)`,
          ),
          userId,
          `Imported ${WORKBOOK_SOURCE}`,
        ),
      );
      results.push({
        studio: child,
        annual: bengaluru.targets[POPUP_PARENT].reduce((sum: number, w: any) => sum + w.target, 0) * POPUP_SPLIT[child],
      });
    }
    rollUpPopup(year, userId);
    const parent = studio(POPUP_PARENT);
    if (parent)
      results.push({
        studio: POPUP_PARENT,
        annual: (
          db
            .prepare('SELECT SUM(proposed_target) v FROM monthly_targets WHERE studio_id=? AND year=?')
            .get(parent.id, year) as any
        ).v,
      });
  });
  tx();
  audit({
    userId,
    action: 'import_plan',
    entityType: 'annual_targets',
    entityId: year,
    after: results,
    reason: 'Imported 2027 plan targets (Mumbai: playbook; Bengaluru: workbook); approved targets untouched.',
  });
  return results;
}

// Pop-up targets are the sum of its venues; re-run whenever a venue target changes.
export function rollUpPopup(year: number, userId: number | null) {
  const parent = db.prepare('SELECT id FROM studios WHERE name=?').get(POPUP_PARENT) as any;
  const children = POPUP_CHILDREN.map(
    n => (db.prepare('SELECT id FROM studios WHERE name=?').get(n) as any)?.id,
  ).filter(Boolean);
  if (!parent || !children.length) return;
  for (let month = 1; month <= 12; month++) {
    const rows = db
      .prepare(
        `SELECT * FROM monthly_targets WHERE year=? AND month=? AND studio_id IN (${children.map(() => '?').join(',')})`,
      )
      .all(year, month, ...children) as any[];
    if (!rows.length) continue;
    const sum = (k: string) => rows.reduce((s, r) => s + (r[k] || 0), 0);
    const f = rows.map(r => JSON.parse(r.funnel || '{}')),
      fs = (k: string) => f.reduce((s, x) => s + (x[k] || 0), 0);
    const childAssumptions = rows.map(r => JSON.parse(r.assumptions || '{}'));
    const sumNested = (group: 'workbook' | 'playbook', key: string) =>
      childAssumptions.reduce((s, a) => s + (Number(a?.[group]?.[key]) || 0), 0);
    const approved = rows.every(r => r.approved_target !== null) ? sum('approved_target') : null;
    const target = sum('proposed_target');
    const histRevenue = sum('historical_revenue');
    writeTarget(
      parent.id,
      year,
      month,
      {
        scenario: 'base',
        historical_revenue: histRevenue,
        baseline_forecast: sum('baseline_forecast'),
        proposed_target: target,
        approved_target: approved,
        target_growth: histRevenue > 0 ? Math.round((target / histRevenue - 1) * 1000) / 10 : rows[0].target_growth,
        new_client_target: sum('new_client_target'),
        renewal_target: sum('renewal_target'),
        repeat_target: 0,
        reactivation_target: sum('reactivation_target'),
        other_target: sum('other_target'),
        target_transactions: sum('target_transactions'),
        expected_aov: sum('target_transactions') ? target / sum('target_transactions') : null,
        funnel: JSON.stringify({
          requiredNewClientRevenue: fs('requiredNewClientRevenue'),
          requiredNewBuyers: fs('requiredNewBuyers'),
          requiredCompletedTrials: fs('requiredCompletedTrials'),
          requiredTrialBookings: fs('requiredTrialBookings'),
          requiredLeads: fs('requiredLeads'),
          calculationPath: [],
          warnings: [],
        }),
        assumptions: JSON.stringify({
          planSource: `Sum of ${POPUP_CHILDREN.join(' and ')}`,
          rollup: true,
          streamLabels: { renewal: 'Pack conversions & renewals' },
          scenarioExplanation: `Pop-up = ${POPUP_CHILDREN.join(' + ')}. Edit each venue's target; this total updates automatically.`,
          playbook: {
            leads: sumNested('playbook', 'leads') || fs('requiredLeads'),
            trials: sumNested('playbook', 'trials') || fs('requiredCompletedTrials'),
            buyers: sumNested('playbook', 'buyers') || fs('requiredNewBuyers'),
            renewalsDue: sumNested('playbook', 'renewalsDue'),
            renewalPurchases: sumNested('playbook', 'renewalPurchases'),
            reactivated: sumNested('playbook', 'reactivated'),
            lapsedTouches: sumNested('playbook', 'lapsedTouches'),
          },
          workbook: {
            leads: sumNested('workbook', 'leads') || fs('requiredLeads'),
            trials: sumNested('workbook', 'trials') || fs('requiredCompletedTrials'),
            newPaying: sumNested('workbook', 'newPaying') || fs('requiredNewBuyers'),
            packageConversions: sumNested('workbook', 'packageConversions'),
            existingPaying: sumNested('workbook', 'existingPaying'),
            renewalsDue: sumNested('workbook', 'renewalsDue'),
            renewalPurchases: sumNested('workbook', 'renewalPurchases'),
            reactivated: sumNested('workbook', 'reactivated'),
            lapsedTouches: sumNested('workbook', 'lapsedTouches'),
            checkins: sumNested('workbook', 'checkins'),
            offerLed: sumNested('workbook', 'offerLed'),
            stretch: sumNested('workbook', 'stretch'),
            avgSpend: childAssumptions[0]?.workbook?.avgSpend || null,
          },
        }),
        source: 'rollup',
        data_mode: 'plan',
      },
      userId,
      'Pop-up roll-up of venue targets',
    );
  }
}

function offerTypeFor(text: string) {
  const t = text.toLowerCase();
  if (t.includes('referral')) return 'referral';
  if (t.includes('pair') || t.includes('group')) return 'bundle';
  if (t.includes('gift') || t.includes('pre-sale') || t.includes('event') || t.includes('credit used'))
    return 'experience';
  if (t.includes('fixed') || t.includes('bulk') || t.includes('flash')) return 'fixed';
  if (t.startsWith('complimentary') || t.startsWith('bonus')) return 'bonus_classes';
  if (t.includes('validity') && !t.includes('discount')) return 'validity_extension';
  return t.includes('discount') ? 'percentage' : 'experience';
}
function objectiveFor(month: number, o: { name: string; audience: string; product?: string; type?: string }) {
  const a = `${o.audience} ${o.name}`.toLowerCase();
  if (month === 4) return 'anniversary';
  if (a.includes('lapsed')) return 'reactivation';
  if (/renew|expiring|active 1m|active 1m\/3m|travelling members|most active/.test(a)) return 'retention';
  if (/friend|pair|couple|squad|partner|mother|referr|bring/.test(a)) return 'referral';
  if (/first-time|newcomer|new clients/.test(a)) return 'acquisition';
  if ((o.product || '').toLowerCase().includes('annual')) return 'annual_membership';
  return 'additional_purchase';
}
function windowDates(year: number, month: number, window: string) {
  const days = [...window.matchAll(/(\d{1,2})\s*([A-Z][a-z]{2})?/g)];
  const fallback = [`${year}-${pad(month)}-01`, `${year}-${pad(month)}-${lastDay(year, month)}`];
  if (!days.length) return fallback;
  const endMonthName = [...days].reverse().find(d => d[2])?.[2];
  const endMonth = endMonthName && MONTH_ABBR.includes(endMonthName) ? MONTH_ABBR.indexOf(endMonthName) + 1 : month;
  const start = Math.min(Number(days[0][1]), lastDay(year, month)),
    end = Number(days[days.length - 1][1]);
  const em = endMonth < month ? month : endMonth;
  return [`${year}-${pad(month)}-${pad(start)}`, `${year}-${pad(em)}-${pad(Math.min(end, lastDay(year, em)))}`];
}

// April "Still Shaking" portfolio and monthly lead offers for the Mumbai studios (playbook PDF).
// Bengaluru studios use the offer-by-offer calendar in Bengaluru_Sales_Plan_2027.xlsx instead.
const STILL_SHAKING = [
  {
    n: 1,
    name: 'Commitment Issues Pack',
    job: 'New-client acquisition at a higher first ticket',
    audience: 'New leads and first-timers',
    gets: '3M Unlimited at 15% off + 2 guest passes for friends (friends enter the Encore flow)',
    disc: 15,
    type: 'percentage',
    objective: 'acquisition',
    studios: ['Kemps Corner', 'Bandra'],
  },
  {
    n: 2,
    name: '72-Hour Shake-Up',
    job: 'Convert trials now, not "later"',
    audience: 'Trials completed 1 Mar–30 Apr with no purchase',
    gets: '12-class pack at 12% off + 1 bonus class, valid 72 hours after the trial or the April invite',
    disc: 20,
    type: 'percentage',
    objective: 'trial_conversion',
    studios: ['Kemps Corner', 'Bandra'],
  },
  {
    n: 3,
    name: 'The Long Game',
    job: 'Higher-value purchases without price cuts',
    audience: 'Members with 8+ visits a month; 1M/pack renewers',
    gets: 'Annual + 30 days; 6M + 14 days; 3M + 6 classes',
    disc: 11,
    type: 'validity_extension',
    objective: 'annual_membership',
    studios: ['Kemps Corner', 'Bandra'],
  },
  {
    n: 4,
    name: 'Loyalty Shakes',
    job: 'Appreciation with no discount',
    audience: 'All active members',
    gets: 'Free anniversary-week hosted class + 2 bring-a-friend passes (friends enter the Encore flow)',
    disc: 0,
    type: 'experience',
    objective: 'retention',
    studios: ['Kemps Corner', 'Bandra'],
  },
  {
    n: 5,
    name: 'Lock In Before You Clock Out',
    job: 'Protect renewals due Apr–Jun without deep pull-forward',
    audience: 'Members expiring 1 Apr–15 Jun only',
    gets: 'Renew in April at the current price + 3 bonus classes; no % off',
    disc: 15,
    type: 'bonus_classes',
    objective: 'retention',
    studios: ['Kemps Corner', 'Bandra'],
  },
  {
    n: 6,
    name: 'Text Your Ex-ercise',
    job: 'Reactivate the lapsed',
    audience: 'Lapsed 61–365 days (priority) and 1–2 years',
    gets: 'Standing 15% lapsed perk + a free comeback class; +1 bonus class if they rebuy within 7 days',
    disc: 20,
    type: 'percentage',
    objective: 'reactivation',
    studios: ['Kemps Corner', 'Bandra'],
  },
  {
    n: 7,
    name: 'Bring Your Shaker',
    job: 'Referral acquisition',
    audience: 'Active members as referrers',
    gets: 'Friend: Newcomers intro + 15% first-purchase perk. Referrer: 2 bonus classes when the friend buys a commitment product',
    disc: 0,
    type: 'referral',
    objective: 'referral',
    studios: ['Kemps Corner', 'Bandra'],
  },
  {
    n: 8,
    name: "Teacher's Pet Pack",
    job: 'Privates sold as a pack, not via codes',
    audience: 'Privates clients (21 at Kwality)',
    gets: '10 privates + 1 bonus private',
    disc: 9,
    type: 'bonus_classes',
    objective: 'aov',
    studios: ['Kemps Corner'],
  },
];
const LEAD_OFFER_OBJECTIVE: Record<string, string> = {
  'Resolution Insurance': 'trial_conversion',
  'Plus-One, Minus Excuses': 'referral',
  'The Pre-Game': 'retention',
  'The Pre-Game + Launch-Cohort Reunion': 'reactivation',
  'The Afterparty': 'retention',
  'Out of Office, Not Out of Shape': 'retention',
  'Rain Check': 'retention',
  'Friends Who Squat Together': 'referral',
  'The Return Policy': 'reactivation',
  'Gift a Shake': 'additional_purchase',
  'Black Friday, Strong Monday': 'annual_membership',
  'The Pre-Solution': 'revenue_gap',
};

function upsertOffer(uid: string, row: Record<string, any>, userId: number | null) {
  const existing = db.prepare('SELECT id FROM offers WHERE offer_uid=?').get(uid) as any;
  const cols = Object.keys(row);
  if (existing) {
    db.prepare(`UPDATE offers SET ${cols.map(c => `${c}=?`).join(',')},updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(
      ...Object.values(row),
      existing.id,
    );
    return 'updated';
  }
  db.prepare(`INSERT INTO offers(offer_uid,created_by,${cols.join(',')}) VALUES (?,?${',?'.repeat(cols.length)})`).run(
    uid,
    userId,
    ...Object.values(row),
  );
  return 'created';
}
const uidFor = (...parts: any[]) =>
  `PLAN27-${crypto.createHash('sha1').update(parts.join('|')).digest('hex').slice(0, 10).toUpperCase()}`;

export function applyPlanOffers(year: number, userId: number | null) {
  const bengaluru = readJson('bengaluru-plan-2027.json');
  const counts = { created: 0, updated: 0 };
  const tally = (r: string) => {
    (counts as any)[r]++;
  };
  const studioId = (name: string) => (db.prepare('SELECT id FROM studios WHERE name=?').get(name) as any)?.id;
  const tx = db.transaction(() => {
    for (const o of bengaluru.offers) {
      const sid = studioId(o.studio);
      if (!sid) continue;
      const [start, end] = windowDates(year, o.month, o.window);
      tally(
        upsertOffer(
          uidFor('blr', o.studio, o.month, o.name),
          {
            name: o.name,
            headline: o.theme,
            customer_copy: o.gets,
            internal_description: `${o.type} · ${o.product} · ${o.window}`,
            rationale: o.why,
            objective: objectiveFor(o.month, o),
            offer_type: offerTypeFor(o.type),
            studio_id: sid,
            month: o.month,
            year,
            audience: o.audience,
            benefit: o.gets,
            validity_start: start,
            validity_end: end,
            redemption_conditions: `Window: ${o.window}. Replaces the standing 15% newcomer/lapsed and 10% pack perks — never stacks.`,
            target_purchases: o.units,
            expected_asp: o.offerPrice,
            expected_revenue: o.revenue,
            revenue_target: o.revenue,
            effective_discount: o.discount
              ? Math.round(o.discount * 1000) / 10
              : o.fixedPrice && o.listPrice
                ? Math.round((1 - o.fixedPrice / o.listPrice) * 1000) / 10
                : 0,
            status: 'draft',
            approval_status: 'pending',
            generation_source: 'plan_2027',
            data_mode: 'plan',
            provenance: JSON.stringify({
              source: 'Bengaluru_Sales_Plan_2027.xlsx · 2027 Offer Calendar',
              valueToClientPct: o.valuePct,
              listPrice: o.listPrice,
              discount: o.discount,
              fixedPrice: o.fixedPrice,
              bonusValue: o.bonusValue,
              product: o.product,
            }),
            success_metrics: JSON.stringify([
              'Units vs target',
              'Revenue vs expected',
              'Effective discount',
              '90-day repeat purchase',
            ]),
          },
          userId,
        ),
      );
    }
    for (const studio of ['Kemps Corner', 'Bandra']) {
      const sid = studioId(studio);
      if (!sid) continue;
      PLAYBOOKS_2027[studio].months.forEach((m, i) => {
        const month = i + 1;
        if (month === 4) return;
        tally(
          upsertOffer(
            uidFor('mum', studio, month, m.offer),
            {
              name: m.offer,
              headline: m.objective,
              customer_copy: null,
              internal_description:
                'Monthly lead offer · mechanics live in the plan workbook Campaign Calendar tab (not supplied here)',
              rationale: `${m.objective}. Month pace: ${m.leads} leads · ${m.trials} trials · ${m.buyers} new buyers · ${m.renewalPurchases} renewals (of ${m.renewalsDue} due) · ${m.reactivated} reactivations.`,
              objective: LEAD_OFFER_OBJECTIVE[m.offer] || 'revenue_gap',
              offer_type: 'experience',
              studio_id: sid,
              month,
              year,
              audience: null,
              benefit: 'Mechanics to be confirmed from the Campaign Calendar',
              validity_start: `${year}-${pad(month)}-01`,
              validity_end: `${year}-${pad(month)}-${lastDay(year, month)}`,
              redemption_conditions: 'No campaign stacks on the standing perks; it must beat them, not add to them.',
              revenue_target: m.revenueL * L,
              status: 'draft',
              approval_status: 'pending',
              generation_source: 'plan_2027',
              data_mode: 'plan',
              provenance: JSON.stringify({ source: PLAN_SOURCE }),
            },
            userId,
          ),
        );
      });
      for (const o of STILL_SHAKING.filter(x => x.studios.includes(studio))) {
        tally(
          upsertOffer(
            uidFor('apr', studio, o.n),
            {
              name: `Still Shaking · ${o.name}`,
              headline: o.job,
              customer_copy: o.gets,
              internal_description: `April 2027 "Still Shaking" portfolio offer #${o.n}`,
              rationale: `${o.job}. April targets protect selling price: effective discount capped at 20% (≤1M products) and 15% (3M+).`,
              objective: o.objective,
              offer_type: o.type,
              studio_id: sid,
              month: 4,
              year,
              audience: o.audience,
              benefit: o.gets,
              effective_discount: o.disc,
              validity_start: `${year}-04-01`,
              validity_end: `${year}-04-30`,
              redemption_conditions:
                'Public launch 1 Apr (members early access 25–31 Mar for #3, #5, #8). Hard close 30 Apr 23:59, no extension. None stacks with another offer or the standing perks.',
              status: 'draft',
              approval_status: 'pending',
              generation_source: 'plan_2027',
              data_mode: 'plan',
              provenance: JSON.stringify({ source: PLAN_SOURCE }),
            },
            userId,
          ),
        );
      }
    }
  });
  tx();
  audit({
    userId,
    action: 'import_plan_offers',
    entityType: 'offers',
    entityId: year,
    after: counts,
    reason: 'Imported 2027 plan offers (Bengaluru calendar + Mumbai playbook).',
  });
  return counts;
}

// Bengaluru workbook activations and campaign theme per month, for the studio plan page.
export function bengaluruReference(studioName: string) {
  const isPopup = studioName === POPUP_PARENT || POPUP_CHILDREN.includes(studioName);
  if (studioName !== 'Kenkere House' && !isPopup) return { activations: [], themes: {} };
  const data = readJson('bengaluru-plan-2027.json'),
    themes: Record<number, string> = {};
  const key = isPopup ? POPUP_PARENT : 'Kenkere House';
  for (const o of data.offers) if (o.studio === key && !themes[o.month]) themes[o.month] = o.theme;
  return {
    activations: data.activations.filter((a: any) => a.Month !== 'Always-on'),
    themes,
    insights: data.insights || [],
  };
}

const ALWAYS_ON_PDF: Array<[string, string]> = [
  [
    '72-hour rule',
    'Same-day message, day-2 call, day-3 last chance after every trial; 15% first-purchase perk valid 72 hours.',
  ],
  [
    'Encore',
    'Hosted/outdoor attendees get a QR to book a free second class within 7 days + 15% on a first pack; named associate at the door.',
  ],
  [
    'Renewal at T−14',
    'Usage-based recommendation (8+ visits/month → 3M; <50% credits used → smaller pack + attendance plan). WhatsApp T−7, T−2; last chance T+7.',
  ],
  ['Early-habit check', 'Week-1 welcome call; 10-day attendance check (fewer than 2 visits → trainer nudge).'],
  [
    'Lapsed sequence',
    'Day 61: standing 15% lapsed perk + free comeback class. ≥₹50k lifetime clients get a personal call within 2 weeks.',
  ],
  [
    'Standing perks',
    '15% first purchase (new / lapsed 60+ days); 10% on 10/20/30-class packs. No campaign stacks on these — an offer must beat them.',
  ],
];
const RECOVERY_PDF: Array<[string, string]> = [
  [
    'Revenue vs weekly milestone',
    '<90% for 2 consecutive weeks → find the short stream and run its rule; <90% at day 21 → Head of Sales.',
  ],
  ['Leads vs plan', '<80% of plan → check lead capture, then referral asks and Encore before paid media.'],
  ['Lead → trial', '5+ pts below the studio rate (45%) → 2-hour first contact; call every lead stuck >48h.'],
  ['Trial attendance', 'Below 85% → book trials within 72h; T−12h and T−2h reminders.'],
  [
    'Trial → commitment',
    '3+ pts below plan → manager reviews every unconverted trial weekly; top converters take trial classes.',
  ],
  ['Ticket', '>7% below plan → usage-based recommendation script; check code usage against guardrails.'],
  ['Renewal pipeline', '<85% of plan by day 21 → call every unrenewed client; attendance plan, not a price cut.'],
  ['Reactivation', '<70% of plan by day 21 → work the 61–180-day list first; personal calls to high-value clients.'],
  [
    'Discount exposure',
    'Above guardrail or >50% of revenue on discount → remove discretionary codes; manager approval beyond guardrails.',
  ],
  [
    'Campaign redemptions',
    '<50% of target at mid-campaign → re-send to the unopened audience; call the top 50; no extension or deeper discount.',
  ],
];
const MUMBAI_ACTIONS: Record<string, Array<[string, string]>> = {
  'Kemps Corner': [
    [
      'Pricing discipline',
      'Retire PR1V@TE10–20 and ANN-style % codes. Privates sold only as the Teacher’s Pet Pack (≤10% effective). Renewal offers are bonus classes, never % off; the Oct-2026 list-price rise carries the ₹24.0k renewal ticket.',
    ],
    [
      'High-value desk',
      '174 active + 70 grace-period clients with ≥₹50k lifetime spend get a manager-owned renewal call and first refusal on The Long Game (April) and Black Friday (November).',
    ],
    [
      'Conversion',
      'Target 20.5% trial→commitment (from 18.7%). Prioritise evening and morning trial slots (14–17%) over afternoons (7%). Pair low-converting instructors with top converters.',
    ],
    [
      'Capacity',
      'Strength Lab runs at 69% fill — route bonus-class redemptions and upgrades to Barre and powerCycle (41–50% fill).',
    ],
    [
      'Weekly pace',
      'Weeks 1–3 each carry 19–23% of the month; days 22–end carry 38%. Plan ~17–35 leads and 13–27 trials a week.',
    ],
  ],
  Bandra: [
    [
      'Launch-Cohort Reunion',
      'March, repeated in September: hosted class for the 638 clients lapsed 1–2 years. Standing 15% lapsed perk + 1 bonus class if they rebuy within 7 days. Target 3.4%/month of the 61–365-day pool (from 2.8%).',
    ],
    [
      'Website-lead speed',
      'Website leads (41%) assigned within 2 hours; “Shared pricing & schedule” capped at 48h before a call (12.9% stall there today).',
    ],
    [
      'Renewal ticket',
      'Usage-based scripts move 8+-visit 1M clients to 3M. Target ticket ₹21.7k (from ₹21.2k). Standing 10% pack code stays; no other renewal codes.',
    ],
    ['Discount exposure', '59–68% of revenue is sold on discount today. Target below 50% by Q3; report monthly.'],
    [
      'Coaching & pace',
      'Pair the lowest-converting associate with the highest. Only 14% of sales land in days 1–7 — front-load T−14 renewal calls. ~30–56 leads and 17–32 trials a week.',
    ],
  ],
};

export const PLAYBOOK_SECTIONS = ['studio_actions', 'always_on', 'recovery'] as const;

// Seeds a studio's editable playbook items the first time they are requested.
export function ensurePlaybookItems(studioId: number, year: number, userId: number | null) {
  const count = (
    db.prepare('SELECT COUNT(*) n FROM studio_playbook_items WHERE studio_id=? AND year=?').get(studioId, year) as any
  ).n;
  if (count) return;
  const name = (db.prepare('SELECT name FROM studios WHERE id=?').get(studioId) as any)?.name;
  const items: Array<[string, string, string, string]> = [];
  if (MUMBAI_ACTIONS[name]) {
    MUMBAI_ACTIONS[name].forEach(([t, b]) => items.push(['studio_actions', t, b, PLAN_SOURCE]));
    ALWAYS_ON_PDF.forEach(([t, b]) => items.push(['always_on', t, b, PLAN_SOURCE]));
    RECOVERY_PDF.forEach(([t, b]) => items.push(['recovery', t, b, PLAN_SOURCE]));
  } else if (name === 'Kenkere House' || name === POPUP_PARENT || POPUP_CHILDREN.includes(name)) {
    const wb = readJson('bengaluru-plan-2027.json'),
      isPopup = name !== 'Kenkere House';
    wb.insights
      .filter((x: string) => (isPopup ? /pop-up/i.test(x) : !/^6\./.test(x)))
      .forEach((x: string) => {
        const text = x.replace(/^\d\.\s*/, '');
        const [title, ...rest] = text.split(/[;:—]|\.\s/);
        items.push([
          'studio_actions',
          title.trim().slice(0, 90),
          rest.join('. ').trim() || text,
          'Bengaluru_Sales_Plan_2027.xlsx · Summary',
        ]);
      });
    wb.activations
      .filter((a: any) => a.Month === 'Always-on' && (!isPopup || /pop-up/i.test(`${a.Activation} ${a.Mechanics}`)))
      .forEach((a: any) =>
        items.push([
          'always_on',
          a.Activation,
          `${a.Mechanics}${a['Primary KPI'] ? ` KPI: ${a['Primary KPI']}.` : ''}`,
          'Bengaluru_Sales_Plan_2027.xlsx · Activations & Always-On',
        ]),
      );
  }
  const insert = db.prepare(
    'INSERT INTO studio_playbook_items(studio_id,year,section,title,body,enabled,sort,source,updated_by) VALUES (?,?,?,?,?,1,?,?,?)',
  );
  items.forEach(([section, title, body, source], i) =>
    insert.run(studioId, year, section, title, body, i, source, userId),
  );
}
