import { stringify } from 'csv-stringify/sync';
import { z } from 'zod';
import { db, audit } from '../db.js';
import { permission } from '../lib/auth.js';
import {
  bengaluruReference,
  ensurePlaybookItems,
  PLAYBOOK_SECTIONS,
  POPUP_CHILDREN,
  POPUP_PARENT,
} from '../lib/plan2027.js';
import { bodyError, id, studioFilter } from '../http.js';
import type { Express } from 'express';
import { focusRequestSchema, generateMonthFocus } from '../lib/monthFocus.js';
import { applyProposal, copilotRequestSchema, proposalSchema, proposeOffers } from '../lib/offerCopilot.js';
import { ASSUMPTION_KEYS, planEconomics } from '../lib/planEconomics.js';
import { studioScopeIds } from '../lib/studios.js';
import { coverPlan, PRODUCT_KEYS, linkedOfferChange, listPrice, planningStudios, selection } from '../lib/linkedOffers.js';

export default function registerStudioPlansRoutes(app: Express) {
  // The offers a month picked from the bank, in plan order — the only offers any view shows for that month.
  const pickedOffers = (slots: any, offerIds: any) => {
    const ids = [...Object.values(slots || {}), ...(offerIds || [])].map(Number).filter(Boolean);
    const get = db.prepare(
      `SELECT id,name,headline,objective,benefit,expected_revenue,status FROM offers WHERE id=? AND status NOT IN ('archived','rejected')`,
    );
    return ids.map(i => get.get(i)).filter(Boolean);
  };
  const planRow = (p: any) => {
    if (!p) return null;
    const slots = p.slots ? JSON.parse(p.slots) : null,
      offer_ids = p.offer_ids === null || p.offer_ids === undefined ? null : JSON.parse(p.offer_ids);
    return {
      ...p,
      actions: JSON.parse(p.actions || '[]'),
      content: p.content ? JSON.parse(p.content) : {},
      offer_ids,
      slots,
      offers: pickedOffers(slots, offer_ids),
    };
  };
  const studioIdByName = (name: string) =>
    (db.prepare('SELECT id FROM studios WHERE name=?').get(name) as any)?.id as number | undefined;
  app.get('/api/studio-plans', (req, res) => {
    const year = Number(req.query.year || 2027),
      scoped = studioFilter(req);
    const rows = db
      .prepare(
        `SELECT s.id,s.name,s.code,s.city,
      COALESCE(SUM(t.proposed_target),0) proposed, COALESCE(SUM(t.approved_target),0) approved,
      SUM(CASE WHEN t.approved_target IS NOT NULL THEN 1 ELSE 0 END) approved_months, COUNT(t.id) target_months,
      (SELECT COUNT(*) FROM monthly_plans p WHERE p.studio_id=s.id AND p.year=?) planned_months,
      (SELECT COUNT(*) FROM offers o WHERE o.studio_id=s.id AND o.year=? AND o.data_mode!='demo' AND o.generation_source!='demo_seed' AND o.status NOT IN ('archived','rejected')) offers
    FROM studios s LEFT JOIN monthly_targets t ON t.studio_id=s.id AND t.year=?
    WHERE s.active=1 ${scoped ? 'AND s.id=?' : ''} GROUP BY s.id ORDER BY s.city,s.name`,
      )
      .all(...(scoped ? [year, year, year, scoped] : [year, year, year])) as any[];
    // Pop-up venues are listed inside the Pop-up card rather than as separate studios.
    // Exclude discontinued/legacy historical venues that have neither 2027 targets, plans, nor active offers.
    const activePlanNames = new Set(['Kemps Corner', 'Bandra', 'Kenkere House', POPUP_PARENT, ...POPUP_CHILDREN]);
    const relevant = rows.filter(
      r => activePlanNames.has(r.name) || Number(r.proposed) > 0 || Number(r.approved) > 0 || Number(r.planned_months) > 0,
    );
    const children = relevant.filter(r => POPUP_CHILDREN.includes(r.name));
    res.json({
      year,
      rows: relevant
        .filter(r => !POPUP_CHILDREN.includes(r.name))
        .map(r => (r.name === POPUP_PARENT ? { ...r, children } : r)),
    });
  });
  app.get('/api/studio-plans/:studioId', (req, res) => {
    const studioId = studioFilter(req, id(req.params.studioId)),
      year = Number(req.query.year || 2027);
    const studio = db.prepare('SELECT * FROM studios WHERE id=?').get(studioId) as any;
    if (!studio) return res.status(404).json({ error: 'Studio not found.' });
    const targetsFor = (sid: number) =>
      (
        db.prepare('SELECT * FROM monthly_targets WHERE studio_id=? AND year=? ORDER BY month').all(sid, year) as any[]
      ).map(t => ({ ...t, funnel: JSON.parse(t.funnel || '{}'), assumptions: JSON.parse(t.assumptions || '{}') }));
    const plans = (
      db.prepare('SELECT * FROM monthly_plans WHERE studio_id=? AND year=?').all(studioId, year) as any[]
    ).map(planRow);
    const scopeIds = studioScopeIds(db, studioId);
    const scopeIn = `studio_id IN (${scopeIds.map(() => '?').join(',')})`;
    const actuals = db
      .prepare(
        `SELECT CAST(substr(month,6,2) AS INTEGER) month,SUM(amount) revenue FROM transactions WHERE ${scopeIn} AND substr(month,1,4)=? GROUP BY month`,
      )
      .all(...scopeIds, String(year));
    const children =
      studio.name === POPUP_PARENT
        ? POPUP_CHILDREN.map(name => {
            const cid = studioIdByName(name);
            return cid ? { id: cid, name, targets: targetsFor(cid) } : null;
          }).filter(Boolean)
        : [];
    const parentId = POPUP_CHILDREN.includes(studio.name) ? studioIdByName(POPUP_PARENT) : null;
    ensurePlaybookItems(studioId, year, req.user!.id);
    const items = db
      .prepare('SELECT * FROM studio_playbook_items WHERE studio_id=? AND year=? ORDER BY section,sort,id')
      .all(studioId, year);
    res.json({
      studio,
      year,
      targets: targetsFor(studioId),
      plans,
      actuals,
      children,
      parent: parentId ? { id: parentId, name: POPUP_PARENT } : null,
      items,
      ...bengaluruReference(studio.name),
    });
  });
  const planSchema = z.object({
    theme: z.string().max(200).nullable().optional(),
    objective: z.string().max(300).nullable().optional(),
    strategy: z.string().max(5000).nullable().optional(),
    notes: z.string().max(5000).nullable().optional(),
    content: z.record(z.string(), z.unknown()).optional(),
    status: z.enum(['draft', 'final', 'approved']).optional(),
    offer_ids: z.array(z.number().int().positive()).max(200).nullable().optional(),
    slots: z
      .object({
        newcomer: z.number().int().positive().nullable(),
        lapsed: z.number().int().positive().nullable(),
        renewal: z.number().int().positive().nullable(),
      })
      .nullable()
      .optional(),
    actions: z
      .array(
        z.object({
          text: z.string().trim().min(1).max(500),
          owner: z.string().max(80).optional().default(''),
          week: z.number().int().min(1).max(5).optional().default(1),
          done: z.boolean().optional().default(false),
        }),
      )
      .max(60)
      .optional(),
  });
  app.get('/api/studio-plans/:studioId/economics', (req, res) => {
    const studioId = studioFilter(req, id(req.params.studioId));
    res.json(planEconomics(studioId, id(req.query.year) || new Date().getFullYear() + 1));
  });
  // Studio-specific overrides for conversion rates and spends; null clears one back to the history-based value.
  app.put('/api/studio-assumptions/:studioId/:year', permission('target_edit'), (req, res) => {
    const studioId = studioFilter(req, id(req.params.studioId)),
      year = id(req.params.year);
    const input = z
      .record(z.string(), z.number().finite().nullable())
      .parse(req.body?.values ?? {}) as Record<string, number | null>;
    const upsert = db.prepare(
      `INSERT INTO studio_assumptions (studio_id, year, key, value, updated_by, updated_at) VALUES (?,?,?,?,?,CURRENT_TIMESTAMP)
       ON CONFLICT(studio_id, year, key) DO UPDATE SET value=excluded.value, updated_by=excluded.updated_by, updated_at=CURRENT_TIMESTAMP`,
    );
    const clear = db.prepare('DELETE FROM studio_assumptions WHERE studio_id=? AND year=? AND key=?');
    db.transaction(() => {
      for (const [key, value] of Object.entries(input)) {
        const range = (ASSUMPTION_KEYS as any)[key];
        if (!range) throw bodyError(`Unknown assumption “${key}”.`);
        if (value === null) clear.run(studioId, year, key);
        else if (value < range.min || value > range.max) throw bodyError(`${key} must be between ${range.min} and ${range.max}.`);
        else upsert.run(studioId, year, key, value, req.user!.id);
      }
    })();
    audit({ userId: req.user!.id, action: 'assumptions.update', entityType: 'studio_assumptions', entityId: studioId, studioId, after: input });
    res.json(planEconomics(studioId, year));
  });
  app.post('/api/studio-plans/:studioId/:year/:month/focus/generate', permission('target_edit'), async (req, res) => {
    studioFilter(req, id(req.params.studioId));
    res.json(await generateMonthFocus(focusRequestSchema.parse(req.body)));
  });
  // AI offer copilot: proposals are returned for review and only saved when the planner applies one.
  app.post('/api/studio-plans/:studioId/:year/:month/offers/ai', permission('target_edit'), async (req, res) => {
    const studioId = studioFilter(req, id(req.params.studioId));
    res.json(await proposeOffers(studioId, copilotRequestSchema.parse(req.body)));
  });
  // One-click "Generate with AI" on an offer card: asks for fresh, better-optimised replacements, keeps the
  // strongest (most revenue at the least discount) and swaps it into the same card.
  app.post('/api/studio-plans/:studioId/:year/:month/offers/:offerId/ai/regenerate', permission('target_edit'), async (req, res) => {
    const studioId = studioFilter(req, id(req.params.studioId)),
      year = id(req.params.year),
      month = id(req.params.month),
      offerId = id(req.params.offerId);
    if (month > 12) throw bodyError('Month must be between 1 and 12.');
    const current = db.prepare('SELECT name, approval_status FROM offers WHERE id=? AND studio_id=?').get(offerId, studioId) as any;
    if (!current) throw bodyError('Offer not found.', 404);
    if (current.approval_status === 'approved') throw bodyError('Reopen the approved offer first.', 409);
    const body = copilotRequestSchema.parse({
      ...req.body,
      mode: 'replace',
      replaceOfferId: offerId,
      steer: [
        `Invent a new, different concept to replace “${current.name}” — not a reworded copy of it.`,
        'It must beat it: more revenue for this stream at a lower effective discount, using value-adds over cash off.',
        'Fill every field completely: a specific audience, a concrete benefit, a sharp headline, realistic units and a data-led rationale.',
        `Variation seed ${Math.random().toString(36).slice(2, 8)}.`,
        req.body?.steer || '',
      ]
        .join(' ')
        .slice(0, 400),
    });
    const { proposals } = await proposeOffers(studioId, body);
    const score = (p: any) => Number(p.revenue || 0) * (1 - Math.min(0.5, Number(p.discountPct || 0) / 100));
    const best = [...proposals].filter(p => p.action === 'replace').sort((a, b) => score(b) - score(a))[0];
    if (!best) throw bodyError('The AI could not find a better offer for this card. Try again.', 422);
    const result = applyProposal(studioId, year, month, best, Boolean(req.body?.solo), req.user!.id);
    audit({
      userId: req.user!.id,
      action: 'offer.ai_regenerate',
      entityType: 'offer',
      entityId: result.offerId,
      studioId,
      before: { offerId, name: current.name },
      after: { name: best.name, revenue: best.revenue, discountPct: best.discountPct },
    });
    res.json({ ...result, proposal: best });
  });
  app.post('/api/studio-plans/:studioId/:year/:month/offers/ai/apply', permission('target_edit'), (req, res) => {
    const studioId = studioFilter(req, id(req.params.studioId)),
      year = id(req.params.year),
      month = id(req.params.month);
    if (month > 12) throw bodyError('Month must be between 1 and 12.');
    const body = z.object({ proposal: proposalSchema.passthrough(), solo: z.boolean().default(false) }).parse(req.body);
    const result = applyProposal(studioId, year, month, body.proposal as any, body.solo, req.user!.id);
    audit({
      userId: req.user!.id,
      action: `plan_offer_ai_${body.proposal.action}`,
      entityType: 'monthly_plan',
      entityId: `${studioId}-${year}-${month}`,
      studioId,
      after: { name: body.proposal.name, ...result },
    });
    res.json(result);
  });
  app.get('/api/studio-plans/products/prices', (_req, res) => {
    const studios = planningStudios();
    res.json({
      keys: Object.fromEntries(Object.entries(PRODUCT_KEYS).map(([k, v]) => [k, v.label])),
      prices: Object.fromEntries(
        studios.map(s => [s.id, Object.fromEntries(Object.keys(PRODUCT_KEYS).map(k => [k, listPrice(s.id, k)]))]),
      ),
    });
  });
  const editSchema = z.object({
    name: z.string().trim().min(3).max(200).optional(),
    headline: z.string().max(500).nullable().optional(),
    benefit: z.string().max(1000).nullable().optional(),
    rationale: z.string().max(5000).nullable().optional(),
    customer_copy: z.string().max(3000).nullable().optional(),
    internal_description: z.string().max(3000).nullable().optional(),
    audience: z.string().max(500).nullable().optional(),
    excluded_audience: z.string().max(500).nullable().optional(),
    cta: z.string().max(240).nullable().optional(),
    offer_type: z.string().max(80).optional(),
    objective: z.string().max(80).optional(),
    plan_slot: z.string().max(40).nullable().optional(),
    redemption_conditions: z.string().max(3000).nullable().optional(),
    validity_start: z.string().max(10).nullable().optional(),
    validity_end: z.string().max(10).nullable().optional(),
    performance_notes: z.string().max(3000).nullable().optional(),
    success_metrics: z.array(z.string().max(400)).max(30).optional(),
    risks: z.array(z.string().max(400)).max(30).optional(),
    target_purchases: z.number().min(0).max(10000).optional(),
    expected_asp: z.number().min(0).max(10000000).optional(),
    photoKey: z.string().max(80).nullable().optional(),
    pricing: z
      .object({
        product: z.string().max(20).nullable().optional(),
        discount: z.number().min(0).max(0.5).optional(),
        mechanic: z.string().max(500).optional(),
        customListPrice: z.number().min(0).max(10000000).nullable().optional(),
        customAsp: z.boolean().optional(),
      })
      .optional(),
  });
  const linkedSchema = z.discriminatedUnion('op', [
    z.object({ op: z.literal('add'), offerId: z.number().int().positive(), solo: z.boolean().default(false) }),
    z.object({ op: z.literal('remove'), offerId: z.number().int().positive(), solo: z.boolean().default(false) }),
    z.object({ op: z.literal('delete'), offerId: z.number().int().positive(), solo: z.boolean().default(false) }),
    z.object({
      op: z.literal('update'),
      offerId: z.number().int().positive(),
      solo: z.boolean().default(false),
      edit: editSchema,
    }),
    z.object({
      op: z.literal('create'),
      solo: z.boolean().default(false),
      edit: editSchema,
    }),
  ]);
  // Add, remove, create, delete or edit a planned offer; mirrored to every planning location unless `solo` is set.
  app.post('/api/studio-plans/:studioId/:year/:month/offers', (req, res) => {
    const perms = req.user?.permissions ?? [];
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });
    // Adding or swapping offers is open to anyone who can edit offers; editing/creating/deleting terms needs plan or offer edit rights.
    const needed = ['update', 'create', 'delete'].includes(req.body?.op) ? ['target_edit', 'offer_edit'] : ['target_edit', 'offer_edit'];
    if (!needed.some(k => perms.includes(k)))
      return res.status(403).json({ error: 'Your role cannot change this month’s offers.' });
    const studioId = studioFilter(req, id(req.params.studioId)),
      year = id(req.params.year),
      month = id(req.params.month);
    if (month > 12) throw bodyError('Month must be between 1 and 12.');
    const change = linkedSchema.parse(req.body);
    const result = linkedOfferChange(studioId, year, month, change as any, req.user!.id);
    audit({
      userId: req.user!.id,
      action: `plan_offer_${change.op}`,
      entityType: 'monthly_plan',
      entityId: `${studioId}-${year}-${month}`,
      studioId,
      after: { ...change, mirroredTo: result.studios },
    });
    res.json(result);
  });
  // Top up a month's offers until they carry the full revenue target.
  app.post('/api/studio-plans/:studioId/:year/:month/cover', (req, res) => {
    const perms = req.user?.permissions ?? [];
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });
    if (!['target_edit', 'offer_edit'].some(k => perms.includes(k)))
      return res.status(403).json({ error: 'Your role cannot change this month’s offers.' });
    const studioId = studioFilter(req, id(req.params.studioId)),
      year = id(req.params.year),
      month = id(req.params.month);
    if (month > 12) throw bodyError('Month must be between 1 and 12.');
    const result = coverPlan(studioId, year, month, req.user!.id);
    audit({ userId: req.user!.id, action: 'plan_offer_cover', entityType: 'monthly_plan', entityId: `${studioId}-${year}-${month}`, studioId, after: result });
    res.json(result);
  });
  app.put('/api/studio-plans/:studioId/:year/:month', permission('target_edit'), (req, res) => {
    const studioId = studioFilter(req, id(req.params.studioId)),
      year = id(req.params.year),
      month = id(req.params.month);
    const studio = db.prepare('SELECT name FROM studios WHERE id=?').get(studioId) as any;
    if (!studio) return res.status(404).json({ error: 'Studio not found.' });
    if (month > 12) throw bodyError('Month must be between 1 and 12.');
    const input = planSchema.parse(req.body);
    const before = planRow(
      db.prepare('SELECT * FROM monthly_plans WHERE studio_id=? AND year=? AND month=?').get(studioId, year, month),
    );
    const merged = {
      theme: null,
      objective: null,
      strategy: null,
      notes: null,
      status: 'draft',
      actions: [],
      offer_ids: null,
      slots: null,
      content: {},
      ...before,
      ...input,
    };
    if (input.status === 'approved') {
      if (!req.user!.permissions.includes('target_approve'))
        return res.status(403).json({ error: 'Plan approval permission required.' });
      if (!String(merged.theme || '').trim() || !String(merged.objective || '').trim() || !String(merged.strategy || '').trim())
        throw bodyError('Add a monthly theme, objective, and execution strategy before approving the plan.', 422);
      const ownedActions = (merged.actions || []).filter((action: any) => String(action.text || '').trim() && String(action.owner || '').trim());
      if (!ownedActions.length)
        throw bodyError('Add at least one execution action with a named owner before approving the plan.', 422);
      const target = db
        .prepare('SELECT approved_target,new_client_target,renewal_target,reactivation_target FROM monthly_targets WHERE studio_id=? AND year=? AND month=?')
        .get(studioId, year, month) as any;
      if (target?.approved_target == null)
        throw bodyError('Approve the monthly revenue target before approving its execution plan.', 422);
      const defaults = selection(studioId, year, month);
      const planSlots = merged.slots || defaults.slots;
      const ids = [...Object.values(planSlots), ...(merged.offer_ids ?? defaults.offerIds)]
        .map(Number)
        .filter(Boolean);
      if (!ids.length) throw bodyError('Select at least one offer before approving the monthly plan.', 422);
      const allowedStudioIds = [studioId];
      if (studio.name === POPUP_PARENT) {
        const children = db.prepare(`SELECT id FROM studios WHERE name IN (${POPUP_CHILDREN.map(() => '?').join(',')})`).all(...POPUP_CHILDREN) as any[];
        allowedStudioIds.push(...children.map(child => Number(child.id)));
      }
      const selectedOffers = db
        .prepare(`SELECT id,studio_id,year,month,status,approval_status,data_mode,generation_source,objective,expected_revenue,financials FROM offers WHERE id IN (${ids.map(() => '?').join(',')})`)
        .all(...ids) as any[];
      if (selectedOffers.length !== new Set(ids).size || selectedOffers.some(o => o.data_mode === 'demo' || o.generation_source === 'demo_seed'))
        throw bodyError('Remove invalid or demonstration offers from the plan before approval.', 422);
      if (selectedOffers.some(o => !allowedStudioIds.includes(Number(o.studio_id)) || Number(o.year) !== year || Number(o.month) !== month))
        throw bodyError('Selected offers must belong to this location and month before plan approval.', 422);
      const pending = selectedOffers.filter(o => o.status !== 'approved' || o.approval_status !== 'approved');
      if (pending.length)
        throw bodyError(`Approve all ${pending.length} selected offer${pending.length === 1 ? '' : 's'} before approving the monthly plan.`, 422);
      const coverage = { new_client_target: 0, renewal_target: 0, reactivation_target: 0 };
      const objectiveStreams: Record<string, keyof typeof coverage> = {
        acquisition: 'new_client_target', trial_conversion: 'new_client_target', referral: 'new_client_target', new_client: 'new_client_target',
        retention: 'renewal_target', annual_membership: 'renewal_target', additional_purchase: 'renewal_target', aov: 'renewal_target',
        reactivation: 'reactivation_target',
      };
      const slotStreams: Record<string, keyof typeof coverage> = {
        newcomer: 'new_client_target',
        renewal: 'renewal_target',
        lapsed: 'reactivation_target',
      };
      const streamByOfferId = new Map<number, keyof typeof coverage>();
      for (const [slot, offerId] of Object.entries(planSlots)) {
        const stream = slotStreams[slot];
        if (stream && offerId) streamByOfferId.set(Number(offerId), stream);
      }
      for (const offer of selectedOffers) {
        const stream = objectiveStreams[String(offer.objective || '').toLowerCase()] || streamByOfferId.get(Number(offer.id));
        const revenue = Number(offer.expected_revenue);
        if (stream && Number.isFinite(revenue) && revenue > 0) coverage[stream] += revenue;
      }
      const uncovered = (['new_client_target', 'renewal_target', 'reactivation_target'] as const)
        .map(key => ({ key, gap: Math.max(0, Number(target[key] || 0) - coverage[key]) }))
        .filter(item => item.gap > 1);
      if (uncovered.length) {
        const names: Record<string, string> = { new_client_target: 'new-client', renewal_target: 'renewal', reactivation_target: 'comeback' };
        throw bodyError(`Selected approved offers do not cover the monthly stream targets: ${uncovered.map(item => `${names[item.key]} short by ₹${Math.round(item.gap).toLocaleString('en-IN')}`).join('; ')}.`, 422);
      }
    }
    db.prepare(
      `INSERT INTO monthly_plans(studio_id,year,month,theme,objective,strategy,actions,notes,status,offer_ids,slots,content,updated_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(studio_id,year,month) DO UPDATE SET theme=excluded.theme,objective=excluded.objective,strategy=excluded.strategy,actions=excluded.actions,
    notes=excluded.notes,status=excluded.status,offer_ids=excluded.offer_ids,slots=excluded.slots,content=excluded.content,updated_by=excluded.updated_by,updated_at=CURRENT_TIMESTAMP`,
    ).run(
      studioId,
      year,
      month,
      merged.theme,
      merged.objective,
      merged.strategy,
      JSON.stringify(merged.actions),
      merged.notes,
      merged.status,
      merged.offer_ids === null ? null : JSON.stringify(merged.offer_ids),
      merged.slots ? JSON.stringify(merged.slots) : null,
      JSON.stringify(merged.content || {}),
      req.user!.id,
    );
    const after = planRow(
      db.prepare('SELECT * FROM monthly_plans WHERE studio_id=? AND year=? AND month=?').get(studioId, year, month),
    );
    audit({
      userId: req.user!.id,
      action: before ? 'update' : 'create',
      entityType: 'monthly_plan',
      entityId: after.id,
      studioId,
      before,
      after,
    });
    res.json(after);
  });
  const itemSchema = z.object({
    section: z.enum(PLAYBOOK_SECTIONS),
    title: z.string().trim().min(1).max(200),
    body: z.string().max(3000).default(''),
    enabled: z.boolean().optional(),
    sort: z.number().int().optional(),
  });
  const itemFor = (req: any) => {
    const item = db.prepare('SELECT * FROM studio_playbook_items WHERE id=?').get(id(req.params.itemId)) as any;
    if (!item) throw bodyError('Item not found.', 404);
    studioFilter(req, item.studio_id);
    return item;
  };
  app.post('/api/studio-plans/:studioId/items', permission('target_edit'), (req, res) => {
    const studioId = studioFilter(req, id(req.params.studioId)),
      year = Number(req.body.year || 2027),
      input = itemSchema.parse(req.body);
    const sort = Number(
      (
        db
          .prepare(
            'SELECT COALESCE(MAX(sort),0)+1 n FROM studio_playbook_items WHERE studio_id=? AND year=? AND section=?',
          )
          .get(studioId, year, input.section) as any
      ).n,
    );
    const result = db
      .prepare(
        'INSERT INTO studio_playbook_items(studio_id,year,section,title,body,enabled,sort,source,updated_by) VALUES (?,?,?,?,?,?,?,?,?)',
      )
      .run(
        studioId,
        year,
        input.section,
        input.title,
        input.body,
        input.enabled === false ? 0 : 1,
        sort,
        'user',
        req.user!.id,
      );
    res.status(201).json(db.prepare('SELECT * FROM studio_playbook_items WHERE id=?').get(result.lastInsertRowid));
  });
  app.patch('/api/studio-plans/items/:itemId', permission('target_edit'), (req, res) => {
    const item = itemFor(req),
      input = itemSchema.partial().parse(req.body);
    db.prepare(
      'UPDATE studio_playbook_items SET title=?,body=?,enabled=?,sort=?,updated_by=?,updated_at=CURRENT_TIMESTAMP WHERE id=?',
    ).run(
      input.title ?? item.title,
      input.body ?? item.body,
      input.enabled === undefined ? item.enabled : input.enabled ? 1 : 0,
      input.sort ?? item.sort,
      req.user!.id,
      item.id,
    );
    res.json(db.prepare('SELECT * FROM studio_playbook_items WHERE id=?').get(item.id));
  });
  app.delete('/api/studio-plans/items/:itemId', permission('target_edit'), (req, res) => {
    const item = itemFor(req);
    db.prepare('DELETE FROM studio_playbook_items WHERE id=?').run(item.id);
    audit({
      userId: req.user!.id,
      action: 'delete',
      entityType: 'playbook_item',
      entityId: item.id,
      studioId: item.studio_id,
      before: item,
    });
    res.json({ ok: true });
  });
}
