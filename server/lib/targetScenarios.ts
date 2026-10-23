import { db, audit } from '../db.js';
import { KEMPS_GUARDRAIL, POPUP_PARENT, rollUpPopup } from './plan2027.js';

// Global target scenario. Standard = the imported plan. Aggressive = the sources' stretch case
// (Bengaluru workbook stretch +10%; Mumbai report Stretch ÷ Base: Kwality 442.9/398.1, Bandra 261.1/228.1).
// Aspirational doubles the aggressive uplift. Switching rescales every studio-month from its saved
// Standard values, so dashboards, reports, plans and offer maths all read the same numbers.
export const TARGET_SCENARIOS = ['standard', 'aggressive', 'aspirational'] as const;
export type TargetScenario = typeof TARGET_SCENARIOS[number];
const AGGRESSIVE_UPLIFT: Record<string, number> = { 'Kemps Corner': 442.9 / 398.1 - 1, 'Bandra': 261.1 / 228.1 - 1 };
const DEFAULT_UPLIFT = 0.10;

export function scenarioFactor(studioName: string, scenario: TargetScenario) {
  const uplift = AGGRESSIVE_UPLIFT[studioName] ?? DEFAULT_UPLIFT;
  return scenario === 'standard' ? 1 : scenario === 'aggressive' ? 1 + uplift : 1 + uplift * 2;
}
export function currentScenario(): TargetScenario {
  const value = (db.prepare("SELECT value FROM settings WHERE key='target_scenario'").get() as any)?.value;
  return TARGET_SCENARIOS.includes(value) ? value : 'standard';
}

const STREAMS = ['proposed_target', 'new_client_target', 'renewal_target', 'repeat_target', 'reactivation_target', 'other_target', 'target_transactions'] as const;
const FUNNEL_COUNTS = ['requiredNewBuyers', 'requiredCompletedTrials', 'requiredTrialBookings', 'requiredLeads'] as const;

// Saves the Standard values on a row the first time it is scaled.
function baseOf(row: any, assumptions: any, factor: number) {
  if (assumptions.base) return assumptions.base;
  const funnel = JSON.parse(row.funnel || '{}');
  return {
    ...Object.fromEntries(STREAMS.map(k => [k, row[k] === null ? null : row[k] / factor])),
    funnel: { requiredNewClientRevenue: (funnel.requiredNewClientRevenue ?? 0) / factor, ...Object.fromEntries(FUNNEL_COUNTS.map(k => [k, funnel[k] === null || funnel[k] === undefined ? null : funnel[k] / factor])) },
  };
}

export function applyTargetScenario(year: number, scenario: TargetScenario, userId: number | null) {
  const previous = currentScenario();
  const rows = db.prepare(`SELECT t.*, s.name studio FROM monthly_targets t JOIN studios s ON s.id=t.studio_id WHERE t.year=? AND s.name!=?`).all(year, POPUP_PARENT) as any[];
  const tx = db.transaction(() => {
    for (const row of rows) {
      const assumptions = JSON.parse(row.assumptions || '{}');
      const base = baseOf(row, assumptions, scenarioFactor(row.studio, previous));
      let factor = scenarioFactor(row.studio, scenario);
      let proposed = base.proposed_target * factor;
      if (row.studio === 'Kemps Corner' && year === 2027) {
        // The user-directed ₹20–60L monthly guardrail applies in every scenario.
        const clamped = Math.min(KEMPS_GUARDRAIL.max, Math.max(KEMPS_GUARDRAIL.min, proposed));
        factor = base.proposed_target ? clamped / base.proposed_target : factor; proposed = clamped;
      }
      const funnel = JSON.parse(row.funnel || '{}');
      funnel.requiredNewClientRevenue = base.funnel.requiredNewClientRevenue * factor;
      for (const k of FUNNEL_COUNTS) if (base.funnel[k] !== null && base.funnel[k] !== undefined) funnel[k] = Math.ceil(base.funnel[k] * factor - 1e-9);
      if (Array.isArray(funnel.calculationPath)) funnel.calculationPath = funnel.calculationPath.map((step: any) => step.unit === 'INR' ? step : { ...step, value: step.value === null ? null : Math.ceil(step.value * scenarioFactor(row.studio, scenario) / scenarioFactor(row.studio, previous) - 1e-9) });
      const next = { ...assumptions, base, targetScenario: scenario, scenarioFactor: factor };
      const values = Object.fromEntries(STREAMS.map(k => [k, base[k] === null ? null : k === 'target_transactions' ? Math.round(base[k] * factor) : base[k] * factor]));
      values.proposed_target = proposed;
      db.prepare(`UPDATE monthly_targets SET ${STREAMS.map(k => `${k}=?`).join(',')}, expected_aov=?, target_growth=?, funnel=?, assumptions=?, version=version+1, updated_by=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`)
        .run(...STREAMS.map(k => values[k]), values.target_transactions ? proposed / values.target_transactions : row.expected_aov,
          row.historical_revenue ? Math.round((proposed / row.historical_revenue - 1) * 1000) / 10 : row.target_growth, JSON.stringify(funnel), JSON.stringify(next), userId, row.id);
      const after = db.prepare('SELECT * FROM monthly_targets WHERE id=?').get(row.id) as any;
      db.prepare('INSERT INTO target_versions(target_id,version,snapshot,change_reason,changed_by) VALUES (?,?,?,?,?)').run(row.id, after.version, JSON.stringify(after), `Target scenario → ${scenario}`, userId);
    }
    rollUpPopup(year, userId);
    db.prepare("INSERT INTO settings(key,value,updated_at) VALUES ('target_scenario',?,CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP").run(scenario);
  });
  tx();
  audit({ userId, action: 'switch_target_scenario', entityType: 'annual_targets', entityId: year, before: { scenario: previous }, after: { scenario, rows: rows.length } });
  return { scenario, rows: rows.length };
}

// After a manual target edit, record the new Standard value so later switches scale from it.
export function rebaseTarget(targetId: number) {
  const row = db.prepare('SELECT t.*, s.name studio FROM monthly_targets t JOIN studios s ON s.id=t.studio_id WHERE t.id=?').get(targetId) as any;
  if (!row) return;
  const assumptions = JSON.parse(row.assumptions || '{}');
  const factor = assumptions.scenarioFactor || scenarioFactor(row.studio, currentScenario());
  delete assumptions.base;
  assumptions.base = baseOf(row, assumptions, factor);
  db.prepare('UPDATE monthly_targets SET assumptions=? WHERE id=?').run(JSON.stringify(assumptions), targetId);
}

// Used right after a plan import: the rows just written are Standard values.
export function captureStandardBase(year: number) {
  const rows = db.prepare('SELECT * FROM monthly_targets WHERE year=?').all(year) as any[];
  for (const row of rows) {
    const assumptions = JSON.parse(row.assumptions || '{}');
    delete assumptions.base;
    assumptions.base = baseOf(row, assumptions, 1); assumptions.targetScenario = 'standard'; assumptions.scenarioFactor = 1;
    db.prepare('UPDATE monthly_targets SET assumptions=? WHERE id=?').run(JSON.stringify(assumptions), row.id);
  }
}
