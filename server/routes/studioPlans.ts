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

export default function registerStudioPlansRoutes(app: Express) {
  const planRow = (p: any) =>
    p
      ? {
          ...p,
          actions: JSON.parse(p.actions || '[]'),
          offer_ids: p.offer_ids === null || p.offer_ids === undefined ? null : JSON.parse(p.offer_ids),
          slots: p.slots ? JSON.parse(p.slots) : null,
        }
      : null;
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
      (SELECT COUNT(*) FROM offers o WHERE o.studio_id=s.id AND o.year=? AND o.status NOT IN ('archived','rejected')) offers
    FROM studios s LEFT JOIN monthly_targets t ON t.studio_id=s.id AND t.year=?
    WHERE s.active=1 ${scoped ? 'AND s.id=?' : ''} GROUP BY s.id ORDER BY s.city,s.name`,
      )
      .all(...(scoped ? [year, year, year, scoped] : [year, year, year])) as any[];
    // Pop-up venues are listed inside the Pop-up card rather than as separate studios.
    const children = rows.filter(r => POPUP_CHILDREN.includes(r.name));
    res.json({
      year,
      rows: rows
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
    const actuals = db
      .prepare(
        `SELECT CAST(substr(month,6,2) AS INTEGER) month,SUM(amount) revenue FROM transactions WHERE studio_id=? AND substr(month,1,4)=? GROUP BY month`,
      )
      .all(studioId, String(year));
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
    status: z.enum(['draft', 'final']).optional(),
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
  app.put('/api/studio-plans/:studioId/:year/:month', permission('target_edit'), (req, res) => {
    const studioId = studioFilter(req, id(req.params.studioId)),
      year = id(req.params.year),
      month = id(req.params.month);
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
      ...before,
      ...input,
    };
    db.prepare(
      `INSERT INTO monthly_plans(studio_id,year,month,theme,objective,strategy,actions,notes,status,offer_ids,slots,updated_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(studio_id,year,month) DO UPDATE SET theme=excluded.theme,objective=excluded.objective,strategy=excluded.strategy,actions=excluded.actions,
    notes=excluded.notes,status=excluded.status,offer_ids=excluded.offer_ids,slots=excluded.slots,updated_by=excluded.updated_by,updated_at=CURRENT_TIMESTAMP`,
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
