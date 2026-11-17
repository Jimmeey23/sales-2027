import { db } from '../db.js';

/* Location structure and the month reference the studio-plans API serves. Every theme, activation
   and offer here is read from the database (monthly_plans, offers); nothing is read from bundled
   plan files. */

// Copper + Cloves and Plash Pilates each carry their own target and strategy and roll up into "Pop-up".
export const POPUP_PARENT = 'Pop-up';
export const POPUP_CHILDREN = ['Copper + Cloves', 'Plash Pilates'];
// The pop-ups' split of a combined figure; an editable planning assumption.
export const POPUP_SPLIT: Record<string, number> = { 'Copper + Cloves': 0.5, 'Plash Pilates': 0.5 };

// User-directed Kemps Corner guardrail (rent increase from Jan 2027): average ₹35L a month, each month ₹20–60L.
export const KEMPS_GUARDRAIL = { average: 3500000, min: 2000000, max: 6000000 };

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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

const json = (v: unknown, fallback: any) => {
  try {
    return v ? JSON.parse(String(v)) : fallback;
  } catch {
    return fallback;
  }
};

/* Each month's theme and activation for a location, from its saved month plans and the offers
   those plans picked. A pop-up venue reads the Pop-up location's plan. */
export function planReference(studioName: string, year = 2027) {
  const name = POPUP_CHILDREN.includes(studioName) ? POPUP_PARENT : studioName;
  const studio = db.prepare('SELECT id FROM studios WHERE name=?').get(name) as { id: number } | undefined;
  if (!studio) return { activations: [], themes: {} as Record<number, string>, insights: [] as string[] };
  const plans = db
    .prepare(
      'SELECT month, theme, notes, slots, offer_ids FROM monthly_plans WHERE studio_id=? AND year=? ORDER BY month',
    )
    .all(studio.id, year) as Array<{
    month: number;
    theme: string | null;
    notes: string | null;
    slots: string | null;
    offer_ids: string | null;
  }>;
  const offerById = db.prepare('SELECT name, success_metrics FROM offers WHERE id=?');
  const themes: Record<number, string> = {};
  const activations = plans
    .filter(p => p.theme)
    .map(p => {
      themes[p.month] = String(p.theme);
      const ids = [...new Set([...Object.values(json(p.slots, {})), ...json(p.offer_ids, [])].filter(Boolean))];
      const offers = ids
        .map(id => offerById.get(id) as { name: string; success_metrics: string | null } | undefined)
        .filter(Boolean) as Array<{ name: string; success_metrics: string | null }>;
      const activation =
        String(p.notes || '')
          .split('\n')
          .map(line => line.trim())
          .find(line => /^activation:/i.test(line))
          ?.replace(/^activation:\s*/i, '') || '';
      return {
        Month: MONTH_ABBR[p.month - 1],
        Activation: p.theme,
        Format: /challenge|race|countdown|cohort/i.test(activation) ? 'Challenge' : 'Event',
        Mechanics: activation,
        'Primary KPI': offers
          .map(o => {
            const metric = json(o.success_metrics, [])[0];
            return metric ? `${o.name}: ${metric}` : o.name;
          })
          .join(' · '),
      };
    });
  return { activations, themes, insights: [] as string[] };
}

export const PLAYBOOK_SECTIONS = ['studio_actions', 'always_on', 'recovery'] as const;
