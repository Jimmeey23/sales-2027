import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { db, audit } from '../db.js';
import { planningStudios, saveSelection } from './linkedOffers.js';

// “2027 Annual Sales and Offer Plan” (P57 2027 Offer Planner export, 25 Oct 2026). For every planning location and
// month it holds the theme, commercial job, funnel numbers, the selected newcomer / winback / renewal offer and two
// alternatives per slot. Parsed from the PDF by scripts/pdf/parse-sales-offer-plan.py.
interface PlanOffer {
  stream: 'newcomer' | 'lapsed' | 'renewal';
  selected: boolean;
  /** Second offer of this stream, carried beside the slot holder in the month. */
  include?: boolean;
  panelPick: boolean;
  name: string;
  tagline: string;
  /** One plain line: what is sold, at what discount, with what included. */
  plain?: string;
  /** The key date this offer is built around, if any. */
  moment?: string | null;
  'Commercial job': string;
  Mechanics: string;
  'Featured product'?: string;
  'Stacked perks'?: string | null;
  'Why it works': string;
  'What to watch': string;
  Model?: string;
  effective: number;
  revenue: number;
  buyers: number;
  modelBuyers?: number;
  ticket?: number;
  streamPlan?: number;
}
interface PlanMonth {
  studio: string;
  month: number;
  theme: string;
  hook: string;
  job: string;
  moment: string;
  plan: Record<string, number | string>;
  offers: PlanOffer[];
  actions?: { week: number; owner: string; done: boolean; text: string }[];
}

const SOURCE = '2027 Annual Sales and Offer Plan';
const OBJECTIVE = { newcomer: 'trial_conversion', lapsed: 'reactivation', renewal: 'retention' } as const;
const L = (v: unknown) => `₹${(Number(v) / 100000).toFixed(1)}L`;
const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const safeJson = (value: unknown): Record<string, any> => {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, any>) : {};
  } catch {
    return {};
  }
};

function load(): PlanMonth[] {
  return JSON.parse(fs.readFileSync(path.resolve('server/data/sales-offer-plan-2027.json'), 'utf8'));
}

// Featured product text such as “3M unlimited at ₹49.2k (15% off ₹57.9k)” → product key and cash discount.
function pricingOf(o: PlanOffer) {
  const text = o['Featured product'] || o.Mechanics;
  const rules: [RegExp, string][] = [
    [/^annual/i, 'ANNUAL'],
    [/^6M\b/i, '6M'],
    [/^3M\b/i, '3M'],
    [/^1M\b/i, '1M'],
    [/^12-class/i, '12C'],
    [/^8-class/i, '8C'],
    [/^10-class/i, 'CC10'],
  ];
  const product = o['Featured product'] ? (rules.find(([re]) => re.test(text))?.[1] ?? null) : null;
  const off = /\((\d+)% off/.exec(text);
  return { product, discount: off ? Number(off[1]) / 100 : 0, mechanic: o.Mechanics };
}

function offerType(o: PlanOffer) {
  const m = `${o.name} ${o.Mechanics}`.toLowerCase();
  if (/gift card/.test(m)) return 'fixed';
  if (/refer|friend|duo|pair|squad of three/.test(m)) return 'referral';
  if (/freeze|extra days|\+\d+ days|validity/.test(m)) return 'validity_extension';
  if (/bonus class|\+\d+ class|credit/.test(m)) return 'bonus_classes';
  if (/\d+% (off|on)|standing 15%|at 1[02]%/.test(m)) return 'percentage';
  return 'experience';
}

// Clears every 2027 month plan at the planning locations (their offers stay in the offer bank), then loads the
// plan's offers: the chosen newcomer, winback and renewal offer fill the slots and every alternative the plan
// considered is added to the month too. Safe to re-run.
export function applySalesOfferPlan(year: number, userId: number | null) {
  const months = load();
  const studios = new Map(planningStudios().map(s => [s.name, s.id]));
  const counts = { archived: 0, cleared: 0, created: 0, reused: 0, months: 0, banked: 0 };
  db.transaction(() => {
    // Retire the earlier imports (2027 base plan offers, January Top 25, Offer Bank workbook). Archived, not deleted.
    counts.archived = db
      .prepare(
        `UPDATE offers SET status='archived', updated_at=CURRENT_TIMESTAMP WHERE year=? AND status!='archived'
         AND generation_source IN ('plan_2027','plan_jan_2027','offer_bank_2027')`,
      )
      .run(year).changes;
    for (const studioId of studios.values())
      for (let month = 1; month <= 12; month++) {
        saveSelection(studioId, year, month, { newcomer: null, lapsed: null, renewal: null }, [], userId);
        counts.cleared++;
      }

    for (const m of months) {
      const studioId = studios.get(m.studio);
      if (!studioId) throw new Error(`Planning location “${m.studio}” not found.`);
      const slots: Record<string, number | null> = { newcomer: null, lapsed: null, renewal: null };
      const options: number[] = [];
      for (const o of m.offers) {
        const group = `SOP27-${String(m.month).padStart(2, '0')}-${slug(o.name)}`;
        const sourceKey = `${SOURCE}:${m.studio}:${m.month}:${o.stream}:${slug(o.name)}`;
        const existing = db
          .prepare(`SELECT id FROM offers WHERE studio_id=? AND year=? AND json_extract(provenance,'$.sourceKey')=?`)
          .get(studioId, year, sourceKey) as any;
        let id = existing?.id as number | undefined;
        if (id) counts.reused++;
        else {
          const revenue = o.selected && o.modelBuyers && o.ticket ? Math.round(o.modelBuyers * o.ticket) : o.revenue;
          const asp = o.buyers ? Math.round(revenue / o.buyers) : 0;
          const rationale = [
            `Why: ${o['Why it works']}`,
            o['What to watch'] ? `Watch: ${o['What to watch']}` : '',
            o.Model ? `Model: ${o.Model}` : '',
          ]
            .filter(Boolean)
            .join('\n');
          const label = o.selected ? 'Selected' : 'Second offer in the month';
          const financials = {
            source: SOURCE,
            expectedBuyers: o.buyers,
            expectedRevenue: revenue,
            sellingPrice: asp,
            contributionMargin: null,
            economicsComplete: false,
            warnings: ['Plan projection; conversion factors and take-up rates are panel hypotheses.'],
          };
          id = db
            .prepare(
              `INSERT INTO offers(offer_uid,name,headline,benefit,customer_copy,rationale,internal_description,objective,offer_type,
               studio_id,month,year,audience,redemption_conditions,target_purchases,expected_asp,expected_revenue,revenue_target,
               effective_discount,source_campaign,status,approval_status,generation_source,data_mode,plan_slot,plan_rank,
               financials,provenance,created_by)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            )
            .run(
              `P57-${year}-${crypto.randomBytes(5).toString('hex').toUpperCase()}`,
              o.name,
              o['Commercial job'],
              o.Mechanics,
              o.tagline,
              rationale,
              `${label} ${o.stream === 'lapsed' ? 'winback' : o.stream} offer for ${m.theme} (${m.studio}, month ${m.month})` +
                `${o.panelPick ? ' · think-tank panel pick' : ''}. ${o['Featured product'] ? `Featured product: ${o['Featured product']}.` : ''}` +
                `${o['Stacked perks'] ? ` Stacked perks (no cash cost): ${o['Stacked perks']}.` : ''}`,
              /founding 57/i.test(o.name) ? 'annual_membership' : OBJECTIVE[o.stream],
              offerType(o),
              studioId,
              // Only the two offers a month carries get a month; the third stays in the
              // location's offer bank as a library alternative.
              o.selected || o.include ? m.month : null,
              year,
              o.stream === 'newcomer'
                ? 'New clients / trials'
                : o.stream === 'lapsed'
                  ? 'Lapsed clients'
                  : 'Renewals due',
              'Does not stack a campaign % on the standing 15% new/lapsed or 10% pack perks.',
              o.buyers,
              asp,
              revenue,
              revenue,
              o.effective,
              m.theme,
              'draft',
              'pending',
              'sales_offer_plan_2027',
              'user',
              o.stream,
              o.selected ? 1 : 2,
              JSON.stringify(financials),
              JSON.stringify({
                sourceKey,
                source: SOURCE,
                linkGroup: group,
                selected: o.selected,
                panelPick: o.panelPick,
                pricing: pricingOf(o),
                plainUsage: o.plain,
                moment: o.moment || undefined,
              }),
              userId,
            ).lastInsertRowid as number;
          const row = db.prepare('SELECT * FROM offers WHERE id=?').get(id);
          db.prepare('INSERT INTO offer_versions(offer_id,version,snapshot,changed_by) VALUES (?,?,?,?)').run(
            id,
            1,
            JSON.stringify(row),
            userId,
          );
          counts.created++;
        }
        // A reused row is refreshed, not just re-dated: edited names, plain lines and moments in
        // the plan have to reach the database without clearing every offer and re-inserting it.
        const prior = db.prepare('SELECT provenance FROM offers WHERE id=?').get(id) as any;
        const merged = {
          ...(prior ? safeJson(prior.provenance) : {}),
          sourceKey,
          source: SOURCE,
          linkGroup: group,
          selected: o.selected,
          panelPick: o.panelPick,
          plainUsage: o.plain,
          moment: o.moment || undefined,
        };
        if (merged.moment === null) delete merged.moment;
        db.prepare(
          `UPDATE offers SET name=?, headline=?, benefit=?, customer_copy=?, rationale=?,
             provenance=?, month=?, plan_slot=?, plan_rank=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
        ).run(
          o.name,
          o['Commercial job'],
          o.Mechanics,
          o.tagline,
          [
            `Why: ${o['Why it works']}`,
            o['What to watch'] ? `Watch: ${o['What to watch']}` : '',
            o.Model ? `Model: ${o.Model}` : '',
          ]
            .filter(Boolean)
            .join('\n'),
          JSON.stringify(merged),
          o.selected || o.include ? m.month : null,
          o.stream,
          o.selected ? 1 : 2,
          id,
        );
        if (o.selected) slots[o.stream] = id;
        else if (o.include) options.push(id!);
      }
      saveSelection(studioId, year, m.month, slots, options, userId);
      const p = m.plan;
      if (m.actions?.length) {
        db.prepare(
          `UPDATE monthly_plans SET actions=?, updated_by=?, updated_at=CURRENT_TIMESTAMP
           WHERE studio_id=? AND year=? AND month=?`,
        ).run(JSON.stringify(m.actions), userId, studioId, year, m.month);
      }
      db.prepare(
        `UPDATE monthly_plans SET theme=?, objective=?, strategy=?, notes=?, updated_by=?, updated_at=CURRENT_TIMESTAMP
         WHERE studio_id=? AND year=? AND month=?`,
      ).run(
        m.theme,
        m.job,
        `Hook: ${m.hook}\nMoment: ${m.moment}`,
        [
          `${SOURCE} — month target ${L(p['Month target'])}, projected with selected offers ${p['Projected with selected offers']}.`,
          `New-client plan ${L(p['New-client plan'])} · Renewal plan ${L(p['Renewal plan'])} · Reactivation plan ${L(p['Reactivation plan'])} · Drop-ins, privates, retail ${L(p['Drop-ins, privates, retail'])}.`,
          Object.entries(p)
            .filter(([, v]) => typeof v === 'string' && /→|^\d+$/.test(v))
            .map(([k, v]) => `${k}: ${v}`)
            .join(' · '),
        ].join('\n'),
        userId,
        studioId,
        year,
        m.month,
      );
      counts.months++;
    }

    // Reconcile: an offer keeps its month only while that month's plan still carries it.
    // Everything else returns to the bank, so a re-run can never leave orphans behind.
    const planned = new Set<number>();
    for (const row of db.prepare('SELECT slots, offer_ids FROM monthly_plans WHERE year=?').all(year) as any[]) {
      const slots = JSON.parse(row.slots || '{}');
      for (const id of Object.values(slots)) if (id) planned.add(Number(id));
      for (const id of JSON.parse(row.offer_ids || '[]')) planned.add(Number(id));
    }
    const stray = (db.prepare('SELECT id FROM offers WHERE year=? AND month IS NOT NULL').all(year) as any[])
      .map(r => Number(r.id))
      .filter(id => !planned.has(id));
    for (const id of stray) db.prepare('UPDATE offers SET month=NULL, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(id);
    counts.banked = stray.length;
  })();
  audit({
    userId,
    action: 'import_plan_offers',
    entityType: 'offers',
    entityId: String(year),
    after: counts,
    reason: `Cleared ${year} month plans to the offer bank and imported the ${SOURCE}.`,
  });
  return counts;
}
