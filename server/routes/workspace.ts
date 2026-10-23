import { stringify } from 'csv-stringify/sync';
import { z } from 'zod';
import { db, audit } from '../db.js';
import { permission, ROLE_PERMISSIONS } from '../lib/auth.js';
import { dashboard, studioProfile, dataCoverage } from '../lib/intelligence.js';
import { currentScenario } from '../lib/targetScenarios.js';
import { bodyError, id, studioFilter } from '../http.js';
import type { Express } from 'express';

export default function registerWorkspaceRoutes(app: Express) {
  app.get('/api/bootstrap', (req, res) => {
    let studios = db.prepare('SELECT * FROM studios WHERE active=1 ORDER BY city,name').all() as any[];
    if (['studio_manager', 'sales_associate'].includes(req.user!.role))
      studios = studios.filter(s => s.id === req.user!.assigned_studio_id);
    const products = db.prepare('SELECT * FROM products WHERE active=1 ORDER BY name').all();
    const years = (
      db
        .prepare(
          `SELECT DISTINCT CAST(substr(month,1,4) AS INTEGER) year FROM transactions UNION SELECT DISTINCT year FROM monthly_targets ORDER BY year`,
        )
        .all() as any[]
    ).map(r => r.year);
    res.json({
      user: req.user,
      studios,
      products,
      years,
      planningYear: 2027,
      aiConfigured: Boolean(process.env.OPENAI_API_KEY),
      aiModel: process.env.OPENAI_API_KEY ? process.env.OPENAI_MODEL || 'gpt-4.1-mini' : null,
      coverage: dataCoverage(),
      permissions: ROLE_PERMISSIONS,
      targetScenario: currentScenario(),
      demo: { enabled: true, label: 'Real imported actuals · demonstration draft plans' },
    });
  });
  app.get('/api/memberships', (req, res) => {
    const year = Number(req.query.year || 2027);
    if (!Number.isInteger(year) || year < 2020 || year > 2100) throw bodyError('Invalid catalogue year.');
    const studioId = studioFilter(req, req.query.studio ? id(req.query.studio) : undefined);
    const studioClause = studioId ? 'AND p.studio_id=?' : '';
    const catalogueVisibility = req.user!.permissions.includes('product_edit') ? 'p.active IN (0,1)' : 'p.active=1';
    const products = db
      .prepare(
        `SELECT p.*,s.name studio,s.city FROM products p LEFT JOIN studios s ON s.id=p.studio_id
    WHERE ${catalogueVisibility} ${studioClause} ORDER BY s.name,p.category,p.name`,
      )
      .all(...(studioId ? [studioId] : [])) as any[];
    const offerStudioClause = studioId ? 'AND (o.studio_id=? OR o.studio_id IS NULL)' : '';
    const offers = db
      .prepare(
        `SELECT o.id,o.name,o.headline,o.customer_copy,o.objective,o.offer_type,o.studio_id,s.name studio,
    o.eligible_products,o.benefit,o.validity_start,o.validity_end,o.redemption_conditions,o.status,o.approval_status,
    o.generation_source,o.data_mode,o.performance_notes,o.year,o.month
    FROM offers o LEFT JOIN studios s ON s.id=o.studio_id WHERE o.year=? AND o.status NOT IN ('archived','rejected') ${offerStudioClause}
    ORDER BY CASE WHEN o.status='active' THEN 0 WHEN o.status='approved' THEN 1 ELSE 2 END,o.name`,
      )
      .all(...(studioId ? [year, studioId] : [year])) as any[];
    res.json({
      year,
      studioId: studioId || null,
      products,
      offers: offers.map(o => ({ ...o, eligible_products: JSON.parse(o.eligible_products || '[]') })),
    });
  });
  app.get('/api/memberships/:id/analytics', permission('financial'), (req, res) => {
    const productId = id(req.params.id),
      year = Number(req.query.year || 2027);
    if (!Number.isInteger(year) || year < 2000 || year > 2100) throw bodyError('Invalid analytics year.');
    const product = db.prepare('SELECT * FROM products WHERE id=?').get(productId) as any;
    if (!product) return res.status(404).json({ error: 'Catalogue item not found.' });
    const studioId = studioFilter(req, req.query.studio ? id(req.query.studio) : undefined);
    const selectedStudio = studioId ?? product.studio_id ?? null;
    const scopeClause = selectedStudio ? 'AND studio_id=?' : '';
    const args = selectedStudio ? [product.name, selectedStudio] : [product.name];
    const totals = db
      .prepare(
        `SELECT COUNT(*) transactions,COUNT(DISTINCT member_ref) customers,
    COALESCE(SUM(amount),0) gross_revenue,COALESCE(SUM(COALESCE(net_amount,amount)),0) net_revenue,
    COALESCE(SUM(discount_amount),0) discounts,AVG(amount) average_ticket,
    MIN(purchased_at) first_sale,MAX(purchased_at) last_sale
    FROM transactions WHERE LOWER(TRIM(COALESCE(product_name,'')))=LOWER(TRIM(?)) ${scopeClause}`,
      )
      .get(...args) as any;
    const yearTotals = db
      .prepare(
        `SELECT COUNT(*) transactions,COUNT(DISTINCT member_ref) customers,
    COALESCE(SUM(amount),0) gross_revenue,COALESCE(SUM(COALESCE(net_amount,amount)),0) net_revenue,
    COALESCE(SUM(discount_amount),0) discounts,AVG(amount) average_ticket
    FROM transactions WHERE LOWER(TRIM(COALESCE(product_name,'')))=LOWER(TRIM(?)) AND substr(purchased_at,1,4)=? ${scopeClause}`,
      )
      .get(product.name, String(year), ...(selectedStudio ? [selectedStudio] : [])) as any;
    const monthly = db
      .prepare(
        `SELECT substr(purchased_at,1,7) month,COUNT(*) transactions,
    COUNT(DISTINCT member_ref) customers,COALESCE(SUM(amount),0) gross_revenue,
    COALESCE(SUM(COALESCE(net_amount,amount)),0) net_revenue,COALESCE(SUM(discount_amount),0) discounts
    FROM transactions WHERE LOWER(TRIM(COALESCE(product_name,'')))=LOWER(TRIM(?)) AND substr(purchased_at,1,4)=? ${scopeClause}
    GROUP BY substr(purchased_at,1,7) ORDER BY month`,
      )
      .all(product.name, String(year), ...(selectedStudio ? [selectedStudio] : []));
    res.json({
      productId,
      year,
      studioId: selectedStudio,
      match: 'Exact product name, case-insensitive',
      lifetime: totals,
      selectedYear: yearTotals,
      monthly,
    });
  });
  app.patch('/api/products/:id', permission('product_edit'), (req, res) => {
    const productId = id(req.params.id),
      before = db.prepare('SELECT * FROM products WHERE id=?').get(productId) as any;
    if (!before) return res.status(404).json({ error: 'Catalogue item not found.' });
    if (
      ['studio_manager', 'sales_associate'].includes(req.user!.role) &&
      before.studio_id !== req.user!.assigned_studio_id
    ) {
      return res.status(403).json({ error: 'You can only edit catalogue items assigned to your location.' });
    }
    const schema = z.object({
      name: z.string().trim().min(1).max(180),
      category: z.string().trim().min(1).max(80),
      list_price: z.number().finite().nonnegative().nullable(),
      sessions_included: z.number().finite().nonnegative(),
      validity_days: z.number().int().nonnegative().nullable(),
      active: z.boolean(),
    });
    const input = schema.parse(req.body);
    const duplicate = db
      .prepare('SELECT id FROM products WHERE studio_id IS ? AND name=? AND id<>?')
      .get(before.studio_id, input.name, productId) as any;
    if (duplicate) throw bodyError('Another catalogue item at this location already uses that name.', 409);
    db.prepare(
      `UPDATE products SET name=?,category=?,list_price=?,sessions_included=?,validity_days=?,active=?,source='manual',updated_at=CURRENT_TIMESTAMP WHERE id=?`,
    ).run(
      input.name,
      input.category,
      input.list_price,
      input.sessions_included,
      input.validity_days,
      Number(input.active),
      productId,
    );
    const after = db.prepare('SELECT * FROM products WHERE id=?').get(productId) as any;
    audit({
      userId: req.user!.id,
      action: 'update_membership_settings',
      entityType: 'product',
      entityId: productId,
      studioId: after.studio_id,
      before,
      after,
    });
    res.json(after);
  });
  app.get('/api/dashboard', (req, res) => {
    const year = Number(req.query.year || 2026),
      month = req.query.month ? Number(req.query.month) : null;
    const studioId = studioFilter(req, req.query.studio ? id(req.query.studio) : undefined);
    res.json(dashboard(year, month, studioId));
  });
  app.get('/api/studios/:id', (req, res) => {
    const studioId = studioFilter(req, id(req.params.id));
    const profile = studioProfile(studioId, Number(req.query.year || 2026));
    if (!profile) return res.status(404).json({ error: 'Studio not found.' });
    res.json(profile);
  });
  app.post('/api/studios', permission('settings'), (req, res) => {
    const name = String(req.body.name || '').trim();
    if (!name) throw bodyError('Studio name is required.');
    const code = String(req.body.code || name.replace(/[^A-Za-z]/g, '').slice(0, 6)).toUpperCase();
    const result = db
      .prepare('INSERT INTO studios(name,code,city,aliases,max_discount_percent,monthly_capacity) VALUES (?,?,?,?,?,?)')
      .run(
        name,
        code,
        String(req.body.city || 'Unspecified'),
        JSON.stringify([name]),
        Number(req.body.maxDiscountPercent ?? 20),
        req.body.monthlyCapacity || null,
      );
    audit({
      userId: req.user!.id,
      action: 'create',
      entityType: 'studio',
      entityId: result.lastInsertRowid,
      after: req.body,
    });
    res.status(201).json(db.prepare('SELECT * FROM studios WHERE id=?').get(result.lastInsertRowid));
  });
  app.patch('/api/studios/:id', permission('settings'), (req, res) => {
    const studioId = id(req.params.id),
      before = db.prepare('SELECT * FROM studios WHERE id=?').get(studioId) as any;
    if (!before) return res.status(404).json({ error: 'Studio not found.' });
    const maxDiscount = Number(req.body.maxDiscountPercent ?? before.max_discount_percent);
    if (maxDiscount < 0 || maxDiscount > 100) throw bodyError('Discount ceiling must be between 0 and 100%.');
    db.prepare('UPDATE studios SET city=?,max_discount_percent=?,monthly_capacity=?,active=? WHERE id=?').run(
      req.body.city ?? before.city,
      maxDiscount,
      req.body.monthlyCapacity ?? before.monthly_capacity,
      req.body.active ?? before.active,
      studioId,
    );
    const after = db.prepare('SELECT * FROM studios WHERE id=?').get(studioId);
    audit({
      userId: req.user!.id,
      action: 'update_commercial_rules',
      entityType: 'studio',
      entityId: studioId,
      studioId,
      before,
      after,
      reason: req.body.reason,
    });
    res.json(after);
  });
}
