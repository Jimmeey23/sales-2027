import fs from 'node:fs';
import { db, audit } from '../server/db.js';
import { offerRow, monthPlan, type PlanMonth } from '../server/lib/approvedPlan2027.js';

// Rebuilds plan months of 2027 from server/data/approved-plan-2027.json — the approved plan is the
// source of truth for the offers, their copy and the month's brief. Offers are matched by name and
// updated in place (notes, approvals and ids survive); anything the plan no longer uses is archived.
// Pass the months to sync (default January and February, where the Stronger in 30 challenge moved).
const YEAR = 2027;
const args = process.argv
  .slice(2)
  .filter(a => /^\d{1,2}$/.test(a))
  .map(Number);
const MONTHS = args.length ? args : [1, 2];
const MOVED = ['week zero', 'back for stronger', 'finish line renewal'];
const plan = JSON.parse(fs.readFileSync('server/data/approved-plan-2027.json', 'utf8')) as PlanMonth[];
const admin =
  (db.prepare("SELECT id FROM users WHERE role='administrator' ORDER BY id LIMIT 1").get() as any)?.id ?? null;
const json = (v: any, f: any) => {
  try {
    return v ? JSON.parse(v) : f;
  } catch {
    return f;
  }
};
const studios = new Map(
  (
    db
      .prepare("SELECT id,name FROM studios WHERE name IN ('Kemps Corner','Bandra','Kenkere House','Pop-up')")
      .all() as any[]
  ).map(s => [s.name, s.id as number]),
);
const PLAN_OWNED = new Set(['offer_bank', 'approved_plan_2027']);
const streamOf = (slot: string) =>
  slot === 'newcomer' ? 'newClientPlan' : slot === 'lapsed' ? 'reactivationPlan' : 'renewalPlan';

const report = { months: 0, inserted: 0, updated: 0, moved: 0, archived: 0 };
db.transaction(() => {
  // 1. The challenge offers leave January for February, keeping their ids and history.
  for (const studio of studios.values()) {
    const rows = db
      .prepare(
        "SELECT id,name FROM offers WHERE studio_id=? AND year=? AND month=1 AND status NOT IN ('archived','rejected')",
      )
      .all(studio, YEAR) as any[];
    for (const r of rows) {
      if (!MOVED.includes(String(r.name).toLowerCase())) continue;
      db.prepare('UPDATE offers SET month=2, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(r.id);
      report.moved++;
    }
  }

  for (const month of MONTHS) {
    for (const m of plan.filter(r => r.month === month)) {
      const studioId = studios.get(m.studio);
      if (!studioId) continue;
      const existing = db
        .prepare(
          "SELECT * FROM offers WHERE studio_id=? AND year=? AND month=? AND status NOT IN ('archived','rejected')",
        )
        .all(studioId, YEAR, month) as any[];
      const used = new Set<number>();
      const slots: Record<string, number | null> = { newcomer: null, lapsed: null, renewal: null };
      const extras: number[] = [];

      for (const o of m.offers) {
        const { row, rev, buyers } = offerRow(o, studioId);
        const target = (m.figures as any)[streamOf(o.slot)] || 0;
        const asp = buyers ? Math.round(rev / buyers) : 0;
        const match = existing.find(
          (r: any) => !used.has(r.id) && String(r.name).toLowerCase() === o.name.toLowerCase(),
        );
        let id: number;
        if (match) {
          used.add(match.id);
          db.prepare(
            `UPDATE offers SET name=?, headline=?, customer_copy=?, internal_description=?, rationale=?, objective=?,
              offer_type=?, audience=?, benefit=?, redemption_conditions=?, effective_discount=?, success_metrics=?, cta=?,
              plan_slot=?, expected_revenue=?, revenue_target=?, target_purchases=?, expected_asp=?, provenance=?,
              updated_at=CURRENT_TIMESTAMP WHERE id=?`,
          ).run(
            row.name,
            row.headline,
            row.customer_copy,
            row.internal_description,
            row.rationale,
            row.objective,
            row.offer_type,
            row.audience,
            row.benefit,
            row.redemption_conditions,
            row.effective_discount,
            row.success_metrics,
            row.cta,
            row.plan_slot,
            rev,
            target,
            buyers,
            asp,
            JSON.stringify({ ...json(match.provenance, {}), source: 'approved_plan_2027', fields: o.fields }),
            match.id,
          );
          id = match.id;
          report.updated++;
        } else {
          id = db
            .prepare(
              `INSERT INTO offers(offer_uid,name,headline,customer_copy,internal_description,rationale,objective,offer_type,
                studio_id,month,year,audience,benefit,redemption_conditions,effective_discount,success_metrics,cta,plan_slot,
                data_mode,status,approval_status,expected_revenue,revenue_target,target_purchases,expected_asp,generation_source,provenance)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'user','draft','pending',?,?,?,?,'offer_bank',?)`,
            )
            .run(
              `P57-${YEAR}-${Math.random().toString(36).slice(2, 12).toUpperCase()}`,
              row.name,
              row.headline,
              row.customer_copy,
              row.internal_description,
              row.rationale,
              row.objective,
              row.offer_type,
              studioId,
              month,
              YEAR,
              row.audience,
              row.benefit,
              row.redemption_conditions,
              row.effective_discount,
              row.success_metrics,
              row.cta,
              row.plan_slot,
              rev,
              target,
              buyers,
              asp,
              JSON.stringify({ source: 'approved_plan_2027', fields: o.fields }),
            ).lastInsertRowid as number;
          report.inserted++;
        }
        if (!slots[o.slot]) slots[o.slot] = id;
        else extras.push(id);
      }

      for (const r of existing) {
        if (used.has(r.id)) continue;
        // Only the plan's own offers are retirable here: a mechanic imported by another script
        // (April's wheel, ticket and gifts) belongs to that month even when the plan omits it.
        if (!PLAN_OWNED.has(String(r.generation_source))) continue;
        db.prepare("UPDATE offers SET status='archived', updated_at=CURRENT_TIMESTAMP WHERE id=?").run(r.id);
        report.archived++;
      }

      const prior = db
        .prepare('SELECT content, offer_ids FROM monthly_plans WHERE studio_id=? AND year=? AND month=?')
        .get(studioId, YEAR, month) as any;
      const keyDates = json(prior?.content, {})?.keyDates;
      // Offers another importer attached to this month (April's wheel, ticket and gifts) stay on the
      // plan: only the plan's own ids are replaced.
      const planOwnedIds = new Set(
        (
          db
            .prepare(
              `SELECT id FROM offers WHERE studio_id=? AND year=? AND month=? AND generation_source IN (${[...PLAN_OWNED].map(() => '?').join(',')})`,
            )
            .all(studioId, YEAR, month, ...PLAN_OWNED) as any[]
        ).map(r => Number(r.id)),
      );
      const foreign = (json(prior?.offer_ids, []) as any[]).filter(id => !planOwnedIds.has(Number(id)));
      const { strategy, focusPoints, kpis, actions } = monthPlan(m);
      const content = {
        ...(keyDates ? { keyDates } : {}),
        focusPoints,
        kpis,
        kpi: kpis[0],
        approvedPlan: { figures: m.figures, moment: m.moment, hook: m.hook },
      };
      db.prepare(
        `INSERT INTO monthly_plans(studio_id,year,month,theme,objective,strategy,actions,notes,status,content,slots,offer_ids)
         VALUES (?,?,?,?,?,?,?,?,'draft',?,?,?)
         ON CONFLICT(studio_id,year,month) DO UPDATE SET theme=excluded.theme, objective=excluded.objective,
         strategy=excluded.strategy, actions=excluded.actions, notes=excluded.notes, content=excluded.content,
         slots=excluded.slots, offer_ids=excluded.offer_ids, updated_at=CURRENT_TIMESTAMP`,
      ).run(
        studioId,
        YEAR,
        month,
        m.theme,
        m.job,
        strategy,
        JSON.stringify(actions),
        `Moment: ${m.moment}`,
        JSON.stringify(content),
        JSON.stringify(slots),
        JSON.stringify([...new Set([...foreign.map(Number), ...extras])]),
      );
      report.months++;
    }
  }
})();

audit({
  userId: admin,
  action: 'plan.january_february_rebuild',
  entityType: 'monthly_plans',
  entityId: '2027-01-02',
  after: report,
  reason: 'The Stronger in 30 challenge moved from January to February.',
});
console.log(report);
