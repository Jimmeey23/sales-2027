import fs from 'node:fs';
import { db, audit } from '../db.js';
import { offerRow, monthPlan, type PlanMonth } from './approvedPlan2027.js';

/* Rebuilds the 2027 plan months from server/data/approved-plan-2027.json — the approved plan
 * is the source of truth for the offers, their copy and the month's brief.
 *
 * It exists because a plan is not only shipped, it is *stored*: every seeded database keeps
 * its own copy of the months, so re-issuing the plan means walking the copies forward. The
 * first case is January: the Stronger in 30 challenge moved to February, so January's plan
 * has to lose the challenge's offers and its borrowed copy on databases that already exist,
 * not only on freshly seeded ones.
 *
 * Offers are matched by name and updated in place (notes, approvals and ids survive);
 * anything the plan no longer uses is archived. */

const YEAR = 2027;
const PLAN_OWNED = new Set(['offer_bank', 'approved_plan_2027']);

/** The offers that carry the February challenge; they belong to February wherever they sit. */
const CHALLENGE_OFFER_NAMES = ['week zero', 'back for stronger', 'finish line renewal'];
const CHALLENGE_JOURNEY = 'week zero';

/** The version of the stored plan this build expects. Bump it whenever the plan JSON changes. */
export const PLAN_SYNC_KEY = 'plan_2027_sync';
export const PLAN_SYNC_VERSION = '2027-01-start-line-own-offers';

const json = (v: any, f: any) => {
  if (v && typeof v === 'object') return v;
  try {
    return v ? JSON.parse(v) : f;
  } catch {
    return f;
  }
};

const streamOf = (slot: string) =>
  slot === 'newcomer' ? 'newClientPlan' : slot === 'lapsed' ? 'reactivationPlan' : 'renewalPlan';

/** True for an offer that belongs to the Stronger in 30 challenge, whichever month it is on. */
export function isChallengeOffer(name: string, provenance: unknown) {
  if (
    CHALLENGE_OFFER_NAMES.includes(
      String(name || '')
        .trim()
        .toLowerCase(),
    )
  )
    return true;
  const fields = json(provenance, {})?.fields || {};
  return (fields.Journey || []).some((j: string) => String(j).trim().toLowerCase() === CHALLENGE_JOURNEY);
}

export interface PlanSyncReport {
  months: number;
  inserted: number;
  updated: number;
  moved: number;
  archived: number;
  studios: string[];
}

export function syncPlanMonths(months: number[] = [1, 2]): PlanSyncReport | null {
  if (!fs.existsSync(new URL('../data/approved-plan-2027.json', import.meta.url))) return null;
  const plan = JSON.parse(
    fs.readFileSync(new URL('../data/approved-plan-2027.json', import.meta.url), 'utf8'),
  ) as PlanMonth[];
  const studios = new Map(
    (
      db
        .prepare("SELECT id,name FROM studios WHERE name IN ('Kemps Corner','Bandra','Kenkere House','Pop-up')")
        .all() as any[]
    ).map(s => [s.name as string, s.id as number]),
  );
  if (!studios.size) return null;
  const report: PlanSyncReport = { months: 0, inserted: 0, updated: 0, moved: 0, archived: 0, studios: [] };
  for (const [name, id] of studios) if (plan.some(m => m.studio === name)) report.studios.push(String(id));

  db.transaction(() => {
    // 1. The challenge offers leave January for February, keeping their ids, notes and history.
    for (const studio of studios.values()) {
      const rows = db
        .prepare(
          "SELECT id,name,provenance FROM offers WHERE studio_id=? AND year=? AND month=1 AND status NOT IN ('archived','rejected')",
        )
        .all(studio, YEAR) as any[];
      for (const row of rows) {
        if (!isChallengeOffer(row.name, row.provenance)) continue;
        db.prepare('UPDATE offers SET month=2, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(row.id);
        report.moved++;
      }
    }

    for (const month of months) {
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
        // Offers another importer attached to this month (April's wheel, ticket and gifts) stay on
        // the plan: only the plan's own ids are replaced.
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
  return report;
}

/* Whether a stored January is what the plan now says it is: three offers of its own, none of
 * them the challenge's, and no challenge copy in its theme, job or brief. Version numbers can
 * be carried over, a database cannot fake this. */
export function januaryIsClean() {
  const stale = db
    .prepare(
      `SELECT COUNT(*) n FROM monthly_plans
        WHERE year=? AND month=1
          AND (lower(theme) LIKE '%stronger in 30%' OR lower(objective) LIKE '%challenge%'
            OR lower(notes) LIKE '%challenge%' OR lower(strategy) LIKE '%challenge%')`,
    )
    .get(YEAR) as any;
  if (Number(stale?.n || 0) > 0) return false;
  const offers = db
    .prepare("SELECT name, provenance FROM offers WHERE year=? AND month=1 AND status NOT IN ('archived','rejected')")
    .all(YEAR) as any[];
  return !offers.some(offer => isChallengeOffer(offer.name, offer.provenance));
}

/* Runs once per database version, and again whenever a stored plan contradicts the JSON — a
 * seeded database keeps its own copy of the months, so the file alone only fixes fresh installs. */
export function ensurePlanJanFebSync() {
  const current = db.prepare('SELECT value FROM settings WHERE key=?').get(PLAN_SYNC_KEY) as any;
  if (current?.value === PLAN_SYNC_VERSION && januaryIsClean()) return null;
  const report = syncPlanMonths([1, 2]);
  if (!report) return null;
  db.prepare(
    'INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP',
  ).run(PLAN_SYNC_KEY, PLAN_SYNC_VERSION);
  audit({
    userId:
      (db.prepare("SELECT id FROM users WHERE role='administrator' AND active=1 ORDER BY id LIMIT 1").get() as any)
        ?.id ?? null,
    action: 'plan.january_february_sync',
    entityType: 'monthly_plans',
    entityId: '2027-01-02',
    after: report,
    reason: 'Stronger in 30 runs in February: January keeps its own offers and copy.',
  });
  if (report.moved || report.months) {
    console.log(
      `Plan resync: January/February rebuilt from the approved plan (${report.months} months, ${report.moved} challenge offers moved to February).`,
    );
  }
  return report;
}
