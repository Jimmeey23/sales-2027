import express from 'express';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import ExcelJS from 'exceljs';
import { stringify } from 'csv-stringify/sync';
import { z } from 'zod';
import { db, initSchema, audit } from './db.js';
import { authenticate, requireAuth, permission, verifyPassword, createSession, destroySession, canAccessStudio, ROLE_PERMISSIONS } from './lib/auth.js';
import { dashboard, studioProfile, generateYearTargets, dataCoverage, actualMetrics, observedFunnel, recommendTarget, type TargetScenario } from './lib/intelligence.js';
import { calculateFunnel, calculateOffer, solveRevenueGoal } from './lib/calculations.js';
import { generateConcepts, generateWithAI, randomConcept } from './lib/offers.js';
import { recalculateSegments } from './lib/segments.js';
import { inspectImport, validateImport, commitImport, IMPORT_FIELDS } from './lib/importer.js';
import { canonicalStudio } from './lib/studios.js';
import { buildCommercialOffer, commercialCatalog, getPolicy, policyChecks, validateStudioOfferPolicy } from './lib/commercial.js';
import { ensureCommercialSeed } from './lib/commercialSeed.js';
import { renewalReport } from './lib/renewals.js';
import { copilotCapability, deterministicCopilot, providerNarrative } from './lib/copilot.js';
import { parseReportOptions, reportCatalog, reportDefaults, reportSupportsStudio, runReport } from './lib/reporting.js';
import { sendReportExport } from './lib/reportExport.js';
import { bengaluruReference, ensurePlaybookItems, PLAYBOOK_SECTIONS, POPUP_CHILDREN, POPUP_PARENT, rollUpPopup } from './lib/plan2027.js';

initSchema();
ensureCommercialSeed();
const app = express();
const port = Number(process.env.PORT || 3001);
fs.mkdirSync(path.resolve('p57-data/uploads'), { recursive: true });
app.disable('x-powered-by');
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  next();
});
app.use(express.json({ limit: '3mb' }));
app.use(cookieParser());
app.use(authenticate);

const asyncRoute = (handler: any) => (req: any, res: any, next: any) => Promise.resolve(handler(req, res, next)).catch(next);
const bodyError = (message: string, status = 400) => Object.assign(new Error(message), { status });
const id = (value: unknown) => { const n = Number(value); if (!Number.isInteger(n) || n <= 0) throw bodyError('Invalid record identifier.'); return n; };
const studioFilter = (req: any, requested?: number) => {
  if (requested && !canAccessStudio(req.user, requested)) throw bodyError('This studio is outside your access scope.', 403);
  if (['studio_manager','sales_associate'].includes(req.user.role)) return req.user.assigned_studio_id;
  return requested;
};
const upload = multer({ storage: multer.diskStorage({
  destination: path.resolve('p57-data/uploads'),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${path.extname(file.originalname).toLowerCase()}`),
}), limits: { fileSize: 60 * 1024 * 1024 }, fileFilter: (_req, file, cb) => {
  if (!/\.(csv|xlsx|xlsm)$/i.test(file.originalname)) cb(new Error('Supported formats: CSV, XLSX and XLSM. Convert legacy XLS files to XLSX first.')); else cb(null, true);
} });

app.get('/api/health', (_req, res) => res.json({ ok: true, database: true, time: new Date().toISOString() }));
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
app.post('/api/auth/login', (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase(), password = String(req.body.password || '');
  const attemptKey = `${req.ip}:${email}`, nowMs = Date.now();
  const previous = loginAttempts.get(attemptKey);
  if (previous && previous.resetAt <= nowMs) loginAttempts.delete(attemptKey);
  const current = loginAttempts.get(attemptKey);
  if (current && current.count >= 10) return res.status(429).json({ error: 'Too many sign-in attempts. Try again in 15 minutes.' });
  const user = db.prepare('SELECT * FROM users WHERE email=? AND active=1').get(email) as any;
  if (!user || !verifyPassword(password, user.password_hash)) {
    loginAttempts.set(attemptKey, { count: (current?.count || 0) + 1, resetAt: current?.resetAt || nowMs + 15 * 60 * 1000 });
    return res.status(401).json({ error: 'Email or password is incorrect.' });
  }
  loginAttempts.delete(attemptKey);
  createSession(res, user.id);
  res.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role, assigned_studio_id: user.assigned_studio_id, permissions: ROLE_PERMISSIONS[user.role] } });
});
app.post('/api/auth/logout', (req, res) => { destroySession(req, res); res.json({ ok: true }); });
app.post('/api/auth/workspace', (req, res) => {
  if (req.user && req.cookies?.p57_session) return res.json({ user: req.user });
  if (process.env.DIRECT_WORKSPACE === 'false') return res.status(403).json({ error: 'Direct workspace access is disabled by the administrator.' });
  const user = req.user
    ? db.prepare('SELECT * FROM users WHERE id=? AND active=1').get(req.user.id) as any
    : db.prepare("SELECT * FROM users WHERE role='administrator' AND active=1 ORDER BY id LIMIT 1").get() as any;
  if (!user) return res.status(503).json({ error: 'No active administrator is available for the direct workspace.' });
  createSession(res, user.id);
  res.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role, assigned_studio_id: user.assigned_studio_id, permissions: ROLE_PERMISSIONS[user.role] } });
});
app.get('/api/auth/me', (req, res) => res.json({ user: req.user || null }));
app.use('/api', requireAuth);

app.get('/api/bootstrap', (req, res) => {
  let studios = db.prepare('SELECT * FROM studios WHERE active=1 ORDER BY city,name').all() as any[];
  if (['studio_manager','sales_associate'].includes(req.user!.role)) studios = studios.filter(s => s.id === req.user!.assigned_studio_id);
  const products = db.prepare('SELECT * FROM products WHERE active=1 ORDER BY name').all();
  const years = (db.prepare(`SELECT DISTINCT CAST(substr(month,1,4) AS INTEGER) year FROM transactions UNION SELECT DISTINCT year FROM monthly_targets ORDER BY year`).all() as any[]).map(r => r.year);
  res.json({ user: req.user, studios, products, years, planningYear: 2027, aiConfigured: Boolean(process.env.OPENAI_API_KEY),
    aiModel: process.env.OPENAI_API_KEY ? process.env.OPENAI_MODEL || 'gpt-4.1-mini' : null, coverage: dataCoverage(),
    permissions: ROLE_PERMISSIONS, demo: { enabled: true, label: 'Real imported actuals · demonstration draft plans' } });
});
app.get('/api/dashboard', (req, res) => {
  const year = Number(req.query.year || 2026), month = req.query.month ? Number(req.query.month) : null;
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
  const name = String(req.body.name || '').trim(); if (!name) throw bodyError('Studio name is required.');
  const code = String(req.body.code || name.replace(/[^A-Za-z]/g,'').slice(0,6)).toUpperCase();
  const result = db.prepare('INSERT INTO studios(name,code,city,aliases,max_discount_percent,monthly_capacity) VALUES (?,?,?,?,?,?)')
    .run(name, code, String(req.body.city || 'Unspecified'), JSON.stringify([name]), Number(req.body.maxDiscountPercent ?? 20), req.body.monthlyCapacity || null);
  audit({ userId: req.user!.id, action: 'create', entityType: 'studio', entityId: result.lastInsertRowid, after: req.body });
  res.status(201).json(db.prepare('SELECT * FROM studios WHERE id=?').get(result.lastInsertRowid));
});
app.patch('/api/studios/:id', permission('settings'), (req, res) => {
  const studioId = id(req.params.id), before = db.prepare('SELECT * FROM studios WHERE id=?').get(studioId) as any;
  if (!before) return res.status(404).json({ error: 'Studio not found.' });
  const maxDiscount = Number(req.body.maxDiscountPercent ?? before.max_discount_percent);
  if (maxDiscount < 0 || maxDiscount > 100) throw bodyError('Discount ceiling must be between 0 and 100%.');
  db.prepare('UPDATE studios SET city=?,max_discount_percent=?,monthly_capacity=?,active=? WHERE id=?')
    .run(req.body.city ?? before.city, maxDiscount, req.body.monthlyCapacity ?? before.monthly_capacity, req.body.active ?? before.active, studioId);
  const after = db.prepare('SELECT * FROM studios WHERE id=?').get(studioId);
  audit({ userId: req.user!.id, action: 'update_commercial_rules', entityType: 'studio', entityId: studioId, studioId, before, after, reason: req.body.reason });
  res.json(after);
});

app.get('/api/targets', (req, res) => {
  const year = Number(req.query.year || 2027), studioId = studioFilter(req, req.query.studio ? id(req.query.studio) : undefined);
  const rows = db.prepare(`SELECT t.*,s.name studio,s.city,s.max_discount_percent FROM monthly_targets t JOIN studios s ON s.id=t.studio_id
    WHERE t.year=? ${studioId ? 'AND t.studio_id=?' : ''} ORDER BY s.city,s.name,t.month`).all(...(studioId ? [year, studioId] : [year])) as any[];
  res.json({ year, rows: rows.map(r => ({ ...r, funnel: JSON.parse(r.funnel || '{}'), assumptions: JSON.parse(r.assumptions || '{}') })),
    reconciliation: { annualProposed: rows.reduce((s, r) => s + r.proposed_target, 0), annualApproved: rows.reduce((s, r) => s + (r.approved_target || 0), 0),
      approvedMonths: rows.filter(r => r.approved_target !== null).length, totalMonths: rows.length } });
});
app.get('/api/targets/scenario-preview', (req, res) => {
  const year = Number(req.query.year || 2027); if (year < 2020 || year > 2100) throw bodyError('Invalid planning year.');
  const studioId = studioFilter(req,req.query.studio ? id(req.query.studio) : undefined);
  const studios = db.prepare(`SELECT id,name FROM studios WHERE active=1 ${studioId ? 'AND id=?' : ''} ORDER BY name`).all(...(studioId ? [studioId] : [])) as any[];
  const scenarios: TargetScenario[] = ['nominal','standard','aggressive'];
  const rows: any[] = [];
  for (const studio of studios) for (let month = 1; month <= 12; month++) {
    for (const scenario of scenarios) { const rec = recommendTarget(studio.id,year,month,scenario); rows.push({ ...rec, assumptions: JSON.parse(rec.assumptions), funnel: JSON.parse(rec.funnel) }); }
  }
  const totals = scenarios.map(scenario => {
    const selected = rows.filter(row => row.scenario === scenario), target = selected.reduce((sum,row) => sum + row.proposed_target,0);
    const comparable = selected.reduce((sum,row) => sum + row.historical_revenue,0);
    return { scenario, annualTarget: target, comparableRevenue: comparable, yoyGrowthPercent: comparable > 0 ? (target / comparable - 1) * 100 : null };
  });
  res.json({ year, rows, totals, aggressiveHighest: totals[2].annualTarget >= totals[1].annualTarget && totals[2].annualTarget >= totals[0].annualTarget,
    note: 'Read-only scenario preview. No target, approval, baseline forecast, or version was changed. Kemps retains seasonal monthly values within the directed ₹30–40L guardrail.' });
});
app.post('/api/targets/generate', permission('target_edit'), (req, res) => {
  const year = Number(req.body.year || 2027); if (year < 2020 || year > 2100) throw bodyError('Invalid planning year.');
  const scenario = ['nominal','standard','aggressive','conservative','base','stretch'].includes(req.body.scenario) ? req.body.scenario as TargetScenario : undefined;
  const studioId = req.body.studioId ? studioFilter(req,id(req.body.studioId)) : undefined;
  generateYearTargets(year, req.user!.id, Boolean(req.body.overwrite), scenario, studioId);
  audit({ userId: req.user!.id, action: 'generate_recommendations', entityType: 'annual_targets', entityId: year, studioId, after: { year, studioId: studioId || null, scenario: scenario || 'preserved_or_standard', overwrite: Boolean(req.body.overwrite) } });
  res.json({ ok: true, year, studioId: studioId || null, scenario: scenario || 'preserved_or_standard' });
});
app.patch('/api/targets/:id', permission('target_edit'), (req, res) => {
  const targetId = id(req.params.id), before = db.prepare('SELECT * FROM monthly_targets WHERE id=?').get(targetId) as any;
  if (!before) return res.status(404).json({ error: 'Target not found.' });
  if (!canAccessStudio(req.user!, before.studio_id)) return res.status(403).json({ error: 'Studio access denied.' });
  if (req.body.approvedTarget !== undefined && !req.user!.permissions.includes('target_approve')) return res.status(403).json({ error: 'Target approval permission required.' });
  const proposed = req.body.proposedTarget !== undefined ? Number(req.body.proposedTarget) : before.proposed_target;
  const approved = req.body.approvedTarget !== undefined ? (req.body.approvedTarget === null ? null : Number(req.body.approvedTarget)) : before.approved_target;
  if (![proposed, ...(approved === null ? [] : [approved])].every(v => Number.isFinite(v) && v >= 0)) throw bodyError('Targets must be finite, non-negative values.');
  const scenario = ['nominal','standard','aggressive','conservative','base','stretch'].includes(req.body.scenario) ? req.body.scenario : before.scenario;
  const reason = String(req.body.reason || '').trim();
  if (before.approved_target !== approved && !reason) throw bodyError('A reason is required when changing an approved target.');
  const selected = approved ?? proposed;
  const streams = {
    newClient: Math.max(0, Number(req.body.newClientTarget ?? before.new_client_target)),
    renewal: Math.max(0, Number(req.body.renewalTarget ?? before.renewal_target)),
    repeat: Math.max(0, Number(req.body.repeatTarget ?? before.repeat_target)),
    reactivation: Math.max(0, Number(req.body.reactivationTarget ?? before.reactivation_target)),
  };
  const assumptions = JSON.parse(before.assumptions || '{}');
  const observedRates = observedFunnel(before.studio_id);
  const rates = { ...observedRates, ...(assumptions.conversionRates || {}) };
  const funnel = calculateFunnel({ revenueTarget: selected, revenueAchieved: 0, existingClientRevenue: streams.repeat,
    renewalRevenue: streams.renewal, reactivationRevenue: streams.reactivation,
    averageFirstPurchase: Number(req.body.averageFirstPurchase ?? assumptions.averageFirstPurchase ?? before.expected_aov ?? 0),
    trialToPurchaseRate: Number(req.body.trialToPurchaseRate ?? rates.trialToPurchaseRate), bookingToAttendanceRate: Number(req.body.bookingToAttendanceRate ?? rates.bookingToAttendanceRate),
    leadToBookingRate: Number(req.body.leadToBookingRate ?? rates.leadToBookingRate) });
  assumptions.averageFirstPurchase = Number(req.body.averageFirstPurchase ?? assumptions.averageFirstPurchase ?? before.expected_aov ?? 0);
  assumptions.conversionRates = { trialToPurchaseRate: Number(req.body.trialToPurchaseRate ?? rates.trialToPurchaseRate), bookingToAttendanceRate: Number(req.body.bookingToAttendanceRate ?? rates.bookingToAttendanceRate), leadToBookingRate: Number(req.body.leadToBookingRate ?? rates.leadToBookingRate) };
  const studioCapacity = Number((db.prepare('SELECT monthly_capacity FROM studios WHERE id=?').get(before.studio_id) as any)?.monthly_capacity || 0);
  if (studioCapacity && funnel.requiredCompletedTrials !== null && funnel.requiredCompletedTrials > studioCapacity) funnel.warnings.push(`Required completed trials exceed observed monthly class capacity (${Math.round(studioCapacity)}); target requires a capacity review.`);
  if (['averageFirstPurchase','trialToPurchaseRate','bookingToAttendanceRate','leadToBookingRate'].some(key => req.body[key] !== undefined)) assumptions.lastAssumptionEdit = { by: req.user!.id, at: new Date().toISOString(), source: 'manual_assumption' };
  let totalStreams = streams.newClient + streams.renewal + streams.repeat + streams.reactivation;
  const explicitStreams = ['newClientTarget','renewalTarget','repeatTarget','reactivationTarget'].some(key => req.body[key] !== undefined);
  if (!explicitStreams && totalStreams > 0 && Math.abs(totalStreams - selected) > 0.01) {
    const scale = selected / totalStreams;
    streams.newClient *= scale; streams.renewal *= scale; streams.repeat *= scale; streams.reactivation *= scale;
    totalStreams = selected;
  }
  if (totalStreams > selected * 1.001) throw bodyError('Revenue stream allocations exceed the selected target. Adjust allocations before saving.');
  const nextVersion = before.version + 1;
  db.prepare(`UPDATE monthly_targets SET proposed_target=?,approved_target=?,scenario=?,new_client_target=?,renewal_target=?,repeat_target=?,reactivation_target=?,
    target_growth=?,funnel=?,assumptions=?,source=?,version=?,override_reason=?,updated_by=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`)
    .run(proposed, approved, scenario, streams.newClient, streams.renewal, streams.repeat, streams.reactivation,
      before.historical_revenue > 0 ? (proposed / before.historical_revenue - 1) * 100 : null, JSON.stringify(funnel), JSON.stringify(assumptions),
      approved !== before.approved_target ? 'approved_decision' : 'user_recommendation', nextVersion, reason || before.override_reason, req.user!.id, targetId);
  const after = db.prepare('SELECT * FROM monthly_targets WHERE id=?').get(targetId) as any;
  db.prepare('INSERT INTO target_versions(target_id,version,snapshot,change_reason,changed_by) VALUES (?,?,?,?,?)').run(targetId, nextVersion, JSON.stringify(after), reason || 'Target or scenario updated.', req.user!.id);
  audit({ userId: req.user!.id, action: approved !== before.approved_target ? 'approve_target' : 'update_target', entityType: 'monthly_target', entityId: targetId, studioId: before.studio_id, before, after, reason });
  const studioName = (db.prepare('SELECT name FROM studios WHERE id=?').get(before.studio_id) as any)?.name;
  if (POPUP_CHILDREN.includes(studioName)) rollUpPopup(before.year, req.user!.id);
  res.json({ ...after, funnel: JSON.parse(after.funnel), assumptions: JSON.parse(after.assumptions || '{}') });
});
app.get('/api/targets/:id/versions', (req, res) => {
  const target = db.prepare('SELECT studio_id FROM monthly_targets WHERE id=?').get(id(req.params.id)) as any;
  if (!target || !canAccessStudio(req.user!, target.studio_id)) return res.status(404).json({ error: 'Target not found.' });
  res.json(db.prepare(`SELECT v.*,u.name changed_by_name FROM target_versions v LEFT JOIN users u ON u.id=v.changed_by WHERE target_id=? ORDER BY version DESC`).all(id(req.params.id)));
});
app.post('/api/funnel/calculate', (req, res) => {
  const input = req.body;
  const base = calculateFunnel(input);
  const scenario = (name: string, factor: number) => calculateFunnel({ ...input, trialToPurchaseRate: Math.min(1, Number(input.trialToPurchaseRate || 0) * factor),
    bookingToAttendanceRate: Math.min(1, Number(input.bookingToAttendanceRate || 0) * factor), leadToBookingRate: Math.min(1, Number(input.leadToBookingRate || 0) * factor) });
  res.json({ base, scenarios: { conservative: scenario('conservative', .85), base, stretch: scenario('stretch', 1.1) },
    notes: ['Operational counts round upward.', 'Zero or invalid conversion rates produce a warning and null downstream counts, never Infinity.', 'Conservative/stretch scenarios adjust conversion assumptions by −15%/+10%; they are sensitivity cases, not forecasts.'] });
});

function offerRow(body: any) {
  const structured = (value: any, fallback: any) => {
    if (value === undefined || value === null) return fallback;
    if (typeof value !== 'string') return value;
    try { return JSON.parse(value); } catch { return fallback; }
  };
  const mechanics = structured(body.mechanics, {});
  return {
    name: String(body.name || '').trim(), headline: body.headline || null, customer_copy: body.customerCopy || body.customer_copy || null,
    internal_description: body.internalDescription || body.internal_description || null, rationale: body.rationale || null,
    objective: body.objective || 'revenue', offer_type: body.offerType || body.offer_type || mechanics.mechanism || 'percentage',
    studio_id: body.studioId || body.studio_id || null, month: body.month || null, year: body.year || null,
    audience: body.audience || null, excluded_audience: body.excludedAudience || body.excluded_audience || null,
    eligible_products: JSON.stringify(structured(body.eligibleProducts ?? body.eligible_products, [])), benefit: body.benefit || null,
    mechanics: JSON.stringify(mechanics), validity_start: body.validityStart || body.validity_start || null, validity_end: body.validityEnd || body.validity_end || null,
    redemption_conditions: body.redemptionConditions || body.redemption_conditions || null,
    target_purchases: body.targetPurchases ?? body.target_purchases ?? null, expected_asp: body.expectedAsp ?? body.expected_asp ?? null,
    expected_revenue: body.expectedRevenue ?? body.expected_revenue ?? null, effective_discount: body.effectiveDiscount ?? body.effective_discount ?? null,
    margin_impact: body.marginImpact ?? body.margin_impact ?? null, required_leads: body.requiredLeads ?? body.required_leads ?? null,
    required_trials: body.requiredTrials ?? body.required_trials ?? null, expected_conversion: body.expectedConversion ?? body.expected_conversion ?? null,
    expected_redemptions: body.expectedRedemptions ?? body.expected_redemptions ?? null, revenue_target: body.revenueTarget ?? body.revenue_target ?? null,
    status: body.status || 'draft', approval_status: body.approvalStatus || body.approval_status || 'pending', generation_source: body.generationSource || body.generation_source || 'manual',
    data_mode: body.dataMode || body.data_mode || 'user', performance_notes: body.performanceNotes || body.performance_notes || null,
    financials: JSON.stringify(structured(body.financials, {})), risks: JSON.stringify(structured(body.risks, [])), success_metrics: JSON.stringify(structured(body.successMetrics ?? body.success_metrics, [])),
    provenance: JSON.stringify(structured(body.provenance, {})), cta: body.cta || null,
  };
}
function validateOfferForSave(body: any, user: any) {
  const row = offerRow(body);
  if (!row.name || row.name.length < 3) throw bodyError('Offer name must contain at least 3 characters.');
  if (!row.objective) throw bodyError('Campaign objective is required.');
  if (row.studio_id && !canAccessStudio(user, row.studio_id)) throw bodyError('Studio access denied.', 403);
  if (row.month && (row.month < 1 || row.month > 12)) throw bodyError('Month must be between 1 and 12.');
  if (row.validity_start && row.validity_end && row.validity_end < row.validity_start) throw bodyError('Offer validity end must be on or after its start.');
  if (row.studio_id && row.mechanics !== '{}') {
    const studio = db.prepare('SELECT max_discount_percent FROM studios WHERE id=?').get(row.studio_id) as any;
    const mechanics = JSON.parse(row.mechanics);
    const eligible = JSON.parse(row.eligible_products || '[]');
    const { cap } = validateStudioOfferPolicy(row.studio_id, mechanics, eligible);
    mechanics.maxDiscountPercent = Math.min(Number(mechanics.maxDiscountPercent ?? cap), cap);
    const result = calculateOffer(mechanics);
    row.financials = JSON.stringify(result); row.expected_asp = result.sellingPrice; row.expected_revenue = result.expectedRevenue;
    row.effective_discount = result.effectiveDiscountPercent; row.margin_impact = result.contributionMargin; row.target_purchases = result.requiredBuyers;
    row.expected_redemptions = result.expectedRedemptions; row.risks = JSON.stringify([...new Set([...JSON.parse(row.risks), ...result.errors, ...result.warnings])]);
    if (result.errors.length && !['draft','rejected'].includes(row.status)) throw bodyError(`Offer guardrails failed: ${result.errors.join(' ')}`, 422);
  }
  return row;
}
function persistOffer(body: any, user: any) {
  const row = validateOfferForSave(body, user);
  const uid = `P57-${new Date().getFullYear()}-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
  const columns = Object.keys(row), values = Object.values(row);
  const result = db.prepare(`INSERT INTO offers(offer_uid,created_by,${columns.join(',')}) VALUES (?,?${',?'.repeat(columns.length)})`).run(uid, user.id, ...values);
  const offer = db.prepare('SELECT * FROM offers WHERE id=?').get(result.lastInsertRowid) as any;
  db.prepare('INSERT INTO offer_versions(offer_id,version,snapshot,changed_by) VALUES (?,?,?,?)').run(offer.id, 1, JSON.stringify(offer), user.id);
  audit({ userId: user.id, action: 'create', entityType: 'offer', entityId: offer.id, studioId: offer.studio_id, after: offer });
  return offer;
}
app.get('/api/commercial/catalog', (req, res) => {
  const studioId = studioFilter(req, id(req.query.studioId));
  res.json({ ...commercialCatalog(studioId), checks: policyChecks(studioId) });
});
const policyUpdateSchema = z.object({ formats: z.array(z.string().trim().min(1).max(40)).max(6), pricing_zone: z.string().trim().max(80),
  trial_journey: z.record(z.string(),z.string().max(160)), intro_product_id: z.number().int().positive().nullable(), newcomer_product_id: z.number().int().positive().nullable(),
  single_class_product_id: z.number().int().positive().nullable(), private_product_id: z.number().int().positive().nullable(), virtual_private_product_id: z.number().int().positive().nullable(), retail_product_id: z.number().int().positive().nullable(),
  newcomer_max_discount_percent: z.number().min(0).max(50), first_membership_discount: z.number().min(0).max(100), lapsed_return_discount: z.number().min(0).max(100),
  class_pack_discount: z.number().min(0).max(100), annual_discount: z.number().min(0).max(100), six_month_discount: z.number().min(0).max(100),
  annual_perks: z.record(z.string(),z.number().finite().nonnegative()), newcomer_lifetime_limit: z.number().int().min(1).max(100).nullable(),
  default_stacking_rule: z.enum(['not_stackable','benefits_only','full']), notes: z.string().max(2000).nullable(), reason: z.string().max(1000) }).partial();
app.put('/api/commercial/policy/:studioId', permission('settings_manage'), (req, res) => {
  const studioId = studioFilter(req, id(req.params.studioId)), before = getPolicy(studioId), input = policyUpdateSchema.parse(req.body);
  const studio = db.prepare('SELECT * FROM studios WHERE id=?').get(studioId) as any;
  if (input.formats && studio.city === 'Bengaluru' && input.formats.some(format => format.toLowerCase() !== 'barre')) throw bodyError('Bengaluru currently supports Barre only in the studio journey.', 422);
  const merged = { ...before, ...input, annual_perks: { ...before.annual_perks, ...(input.annual_perks || {}) } };
  if (Object.keys(merged.trial_journey || {}).some(format => !merged.formats.map((f: string) => f.toLowerCase()).includes(format.toLowerCase()))) throw bodyError('Remove or reassign trial journeys for formats that are no longer enabled.', 422);
  if (['Kemps Corner','Bandra'].includes(studio.name)) {
    for (const format of ['strength','powercycle']) if (merged.trial_journey[format] && merged.trial_journey[format] !== 'newcomers_2_for_1') throw bodyError(`${format} trials at ${studio.name} require Newcomers 2-for-1.`, 422);
  }
  if (studio.name === 'Kenkere House' && merged.trial_journey.barre !== 'new_client_intro_pack_50_percent_or_newcomers_2_for_1') throw bodyError('Kenkere Barre must retain the 50% intro pack or once-lifetime Newcomers 2-for-1 journey.', 422);
  if (['Copper + Cloves','Plash Pilates'].includes(studio.name) && merged.trial_journey.barre !== 'paid_trial') throw bodyError(`${studio.name} uses a paid-trial journey.`, 422);
  if (studio.name === 'Kenkere House' && merged.newcomer_lifetime_limit !== 1) throw bodyError('Kenkere Newcomers 2-for-1 remains limited to once per customer lifetime.', 422);
  for (const key of ['intro_product_id','newcomer_product_id','single_class_product_id','private_product_id','virtual_private_product_id','retail_product_id']) if ((input as any)[key]) {
    const product = db.prepare('SELECT * FROM products WHERE id=? AND active=1').get((input as any)[key]) as any;
    if (!product) throw bodyError(`Configured ${key} does not reference an active product.`, 422);
    if (product.studio_id !== studioId && !String(input.notes ?? before.notes ?? '').trim()) throw bodyError('A hosted-catalogue product requires an explicit provenance note.', 422);
  }
  db.prepare(`UPDATE studio_offer_policies SET formats=?,pricing_zone=?,trial_journey=?,intro_product_id=?,newcomer_product_id=?,single_class_product_id=?,private_product_id=?,virtual_private_product_id=?,retail_product_id=?,
    newcomer_max_discount_percent=?,first_membership_discount=?,lapsed_return_discount=?,class_pack_discount=?,annual_discount=?,six_month_discount=?,annual_perks=?,newcomer_lifetime_limit=?,default_stacking_rule=?,notes=?,updated_by=?,updated_at=CURRENT_TIMESTAMP WHERE studio_id=?`)
    .run(JSON.stringify(merged.formats),merged.pricing_zone,JSON.stringify(merged.trial_journey),merged.intro_product_id,merged.newcomer_product_id,merged.single_class_product_id,merged.private_product_id,merged.virtual_private_product_id,merged.retail_product_id,
      merged.newcomer_max_discount_percent,merged.first_membership_discount,merged.lapsed_return_discount,merged.class_pack_discount,merged.annual_discount,merged.six_month_discount,JSON.stringify(merged.annual_perks),merged.newcomer_lifetime_limit,merged.default_stacking_rule,merged.notes,req.user!.id,studioId);
  audit({ userId: req.user!.id, action: 'update_offer_policy', entityType: 'studio_offer_policy', entityId: studioId, studioId, before, after: merged, reason: input.reason });
  res.json({ ...commercialCatalog(studioId), checks: policyChecks(studioId) });
});
app.post('/api/commercial/generate', permission('offer_create'), (req, res) => {
  const studioId = studioFilter(req, id(req.body.studioId));
  const kinds = ['newcomer_2_for_1','newcomer_3_for_2','intro_pack','paid_trial','free_trial','first_membership','lapsed_return','class_pack','annual','six_month','student','custom'];
  if (!kinds.includes(req.body.kind)) throw bodyError('Unsupported commercial offer policy.');
  const concept = buildCommercialOffer({ ...req.body, studioId });
  if (req.body.saveDraft === false) return res.json({ concept, savedOffer: null });
  const savedOffer = persistOffer({ ...concept, generationSource: 'policy_engine', dataMode: 'scenario' }, req.user);
  res.status(201).json({ concept, savedOffer });
});
function experimentView(row: any) {
  const results = JSON.parse(row.results || '{}');
  const control = results.control, variant = results.variant;
  let comparison = null;
  if (control?.eligible > 0 && variant?.eligible > 0) {
    const controlRate = Number(control.buyers || 0) / control.eligible, variantRate = Number(variant.buyers || 0) / variant.eligible;
    comparison = { controlPurchaseRate: controlRate, variantPurchaseRate: variantRate, absoluteRateDifference: variantRate - controlRate,
      controlRevenuePerEligible: Number(control.revenue || 0) / control.eligible, variantRevenuePerEligible: Number(variant.revenue || 0) / variant.eligible,
      interpretation: 'Observed arm difference only. Causal lift requires valid randomisation, adequate sample, and consistent execution.' };
  }
  return { ...row, results, comparison };
}
app.get('/api/experiments', (req, res) => {
  const studioId = studioFilter(req, req.query.studio ? id(req.query.studio) : undefined);
  const rows = db.prepare(`SELECT e.*,s.name studio,c.name control_name,c.offer_uid control_uid,v.name variant_name,v.offer_uid variant_uid,u.name created_by_name
    FROM offer_experiments e JOIN studios s ON s.id=e.studio_id JOIN offers c ON c.id=e.control_offer_id JOIN offers v ON v.id=e.variant_offer_id LEFT JOIN users u ON u.id=e.created_by
    ${studioId ? 'WHERE e.studio_id=?' : ''} ORDER BY e.updated_at DESC`).all(...(studioId ? [studioId] : [])) as any[];
  res.json({ rows: rows.map(experimentView) });
});
app.post('/api/experiments/newcomer', permission('offer_create'), (req, res) => {
  const studioId = studioFilter(req,id(req.body.studioId)), startDate = String(req.body.startDate || ''), endDate = String(req.body.endDate || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate) || endDate < startDate) throw bodyError('Experiment dates are invalid.');
  const year = Number(startDate.slice(0,4)), month = Number(startDate.slice(5,7)), minimumSample = Number(req.body.minimumSample || 30);
  if (!Number.isInteger(minimumSample) || minimumSample < 1) throw bodyError('Minimum sample must be a positive integer.');
  const hypothesis = String(req.body.hypothesis || '').trim(); if (hypothesis.length < 10) throw bodyError('A meaningful experiment hypothesis is required.');
  const control = buildCommercialOffer({ studioId,kind:'newcomer_2_for_1',year,month,name:'2-for-1 · Experiment Control' });
  const variant = buildCommercialOffer({ studioId,kind:'newcomer_3_for_2',year,month,name:'3-for-2 · Monthly Alternative' });
  const create = db.transaction(() => {
    const controlOffer = persistOffer({ ...control,generationSource:'policy_engine',dataMode:'scenario' },req.user);
    const variantOffer = persistOffer({ ...variant,generationSource:'policy_engine',dataMode:'scenario' },req.user);
    const result = db.prepare(`INSERT INTO offer_experiments(studio_id,name,hypothesis,control_offer_id,variant_offer_id,start_date,end_date,cadence,status,minimum_sample,results,created_by)
      VALUES (?,?,?,?,?,?,?,'monthly','draft',?,?,?)`).run(studioId,'Monthly Newcomer Value Test',hypothesis,controlOffer.id,variantOffer.id,startDate,endDate,minimumSample,
        JSON.stringify({ source:'not_recorded',note:'No experiment outcomes recorded.' }),req.user!.id);
    audit({ userId:req.user!.id,action:'create_atomic_newcomer_test',entityType:'offer_experiment',entityId:result.lastInsertRowid,studioId,after:{controlOfferId:controlOffer.id,variantOfferId:variantOffer.id,startDate,endDate } });
    return { experimentId:Number(result.lastInsertRowid),controlOffer,variantOffer };
  });
  res.status(201).json(create());
});
app.post('/api/experiments', permission('offer_create'), (req, res) => {
  const studioId = studioFilter(req, id(req.body.studioId)), controlId = id(req.body.controlOfferId), variantId = id(req.body.variantOfferId);
  if (controlId === variantId) throw bodyError('Control and variant must be different offers.');
  const offers = db.prepare('SELECT * FROM offers WHERE id IN (?,?)').all(controlId,variantId) as any[];
  if (offers.length !== 2 || offers.some(offer => offer.studio_id !== studioId)) throw bodyError('Both experiment offers must belong to the selected studio.', 422);
  const startDate = String(req.body.startDate || ''), endDate = req.body.endDate ? String(req.body.endDate) : null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || endDate && !/^\d{4}-\d{2}-\d{2}$/.test(endDate) || endDate && endDate < startDate) throw bodyError('Experiment dates are invalid.');
  const name = String(req.body.name || '').trim(), hypothesis = String(req.body.hypothesis || '').trim();
  if (name.length < 3 || hypothesis.length < 10) throw bodyError('Experiment name and a meaningful hypothesis are required.');
  const minimumSample = Number(req.body.minimumSample || 30); if (!Number.isInteger(minimumSample) || minimumSample < 1) throw bodyError('Minimum sample must be a positive integer.');
  const result = db.prepare(`INSERT INTO offer_experiments(studio_id,name,hypothesis,control_offer_id,variant_offer_id,start_date,end_date,cadence,status,minimum_sample,results,created_by)
    VALUES (?,?,?,?,?,?,?,?,'draft',?,?,?)`).run(studioId,name,hypothesis,controlId,variantId,startDate,endDate,req.body.cadence === 'once' ? 'once' : 'monthly',minimumSample,
      JSON.stringify({ source: 'not_recorded', note: 'No experiment outcomes recorded.' }),req.user!.id);
  audit({ userId: req.user!.id, action: 'create', entityType: 'offer_experiment', entityId: result.lastInsertRowid, studioId, after: req.body });
  res.status(201).json(db.prepare('SELECT * FROM offer_experiments WHERE id=?').get(result.lastInsertRowid));
});
const experimentArm = z.object({ eligible: z.number().nonnegative(), buyers: z.number().nonnegative(), revenue: z.number().nonnegative(), attended: z.number().nonnegative().optional(), benefitCost: z.number().nonnegative().optional() }).passthrough()
  .refine(arm => arm.buyers <= arm.eligible, { message: 'Buyers cannot exceed eligible assignments.' });
app.patch('/api/experiments/:id', permission('offer_edit'), (req, res) => {
  const experimentId = id(req.params.id), before = db.prepare('SELECT * FROM offer_experiments WHERE id=?').get(experimentId) as any;
  if (!before || !canAccessStudio(req.user!,before.studio_id)) return res.status(404).json({ error: 'Experiment not found.' });
  const status = req.body.status ?? before.status; if (!['draft','running','paused','completed'].includes(status)) throw bodyError('Invalid experiment status.');
  let results = req.body.results === undefined ? JSON.parse(before.results || '{}') : req.body.results;
  if (!results || typeof results !== 'object' || Array.isArray(results) || JSON.stringify(results).length > 20000) throw bodyError('Experiment results must be a compact aggregate object.');
  if (results.control || results.variant) {
    const parsed = z.object({ control: experimentArm, variant: experimentArm, source: z.string().min(3).max(300) }).passthrough().safeParse(results);
    if (!parsed.success) throw bodyError('Both result arms require eligible, buyers and revenue, plus an explicit aggregate data source.', 422);
  }
  if (status === 'completed' && (!results.control || !results.variant)) throw bodyError('Cannot complete an experiment without aggregate results for both arms.', 422);
  if (status === 'completed' && (results.control.eligible < before.minimum_sample || results.variant.eligible < before.minimum_sample)) throw bodyError(`Each arm needs at least ${before.minimum_sample} eligible assignments before completion.`, 422);
  db.prepare('UPDATE offer_experiments SET status=?,results=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').run(status,JSON.stringify(results),experimentId);
  const after = db.prepare('SELECT * FROM offer_experiments WHERE id=?').get(experimentId);
  audit({ userId: req.user!.id, action: 'update', entityType: 'offer_experiment', entityId: experimentId, studioId: before.studio_id, before, after, reason: req.body.reason });
  res.json(experimentView(after));
});
app.get('/api/renewals/report', (req, res) => {
  const studioId = studioFilter(req, req.query.studio ? id(req.query.studio) : undefined);
  const now = new Date(), defaultMonth = new Date(Date.UTC(now.getFullYear(),now.getMonth()+1,1)).toISOString().slice(0,7);
  const rate = req.query.conversionRate === undefined || req.query.conversionRate === '' ? null : Number(req.query.conversionRate);
  res.json(renewalReport(String(req.query.month || defaultMonth),studioId,rate,req.query.valueBasis === 'list' ? 'list' : 'paid'));
});
app.get('/api/copilot/capability', (_req, res) => res.json(copilotCapability()));
app.get('/api/copilot/conversations', (req, res) => {
  const rows = db.prepare(`SELECT c.*,s.name studio,(SELECT content FROM copilot_messages m WHERE m.conversation_id=c.id ORDER BY m.id DESC LIMIT 1) last_message
    FROM copilot_conversations c LEFT JOIN studios s ON s.id=c.studio_id WHERE c.user_id=? ORDER BY c.updated_at DESC`).all(req.user!.id) as any[];
  res.json({ rows: rows.filter(row => !row.studio_id || canAccessStudio(req.user!,row.studio_id)) });
});
app.post('/api/copilot/conversations', (req, res) => {
  const studioId = req.body.studioId ? studioFilter(req, id(req.body.studioId)) : null;
  const title = String(req.body.title || 'New commercial conversation').trim().slice(0,120) || 'New commercial conversation';
  const result = db.prepare('INSERT INTO copilot_conversations(user_id,studio_id,title,mode) VALUES (?,?,?,?)').run(req.user!.id,studioId,title,process.env.OPENAI_API_KEY ? 'provider_available' : 'deterministic');
  audit({ userId: req.user!.id, action: 'create', entityType: 'copilot_conversation', entityId: result.lastInsertRowid, studioId });
  res.status(201).json(db.prepare('SELECT * FROM copilot_conversations WHERE id=?').get(result.lastInsertRowid));
});
function copilotConversation(req: any, conversationId: number) {
  const conversation = db.prepare('SELECT * FROM copilot_conversations WHERE id=? AND user_id=?').get(conversationId,req.user.id) as any;
  if (!conversation || conversation.studio_id && !canAccessStudio(req.user,conversation.studio_id)) throw bodyError('Conversation not found.',404);
  return conversation;
}
app.get('/api/copilot/conversations/:id', (req, res) => {
  const conversation = copilotConversation(req,id(req.params.id));
  const messages = db.prepare('SELECT * FROM copilot_messages WHERE conversation_id=? ORDER BY id').all(conversation.id) as any[];
  res.json({ ...conversation, messages: messages.map(message => ({ ...message, attachments: JSON.parse(message.attachments || '{}') })) });
});
app.delete('/api/copilot/conversations/:id', (req, res) => {
  const conversation = copilotConversation(req,id(req.params.id));
  db.prepare('DELETE FROM copilot_conversations WHERE id=?').run(conversation.id);
  audit({ userId: req.user!.id, action: 'delete', entityType: 'copilot_conversation', entityId: conversation.id, studioId: conversation.studio_id });
  res.json({ ok: true });
});
app.post('/api/copilot/conversations/:id/messages', asyncRoute(async (req: any, res: any) => {
  const conversation = copilotConversation(req,id(req.params.id)), message = String(req.body.message || '').trim();
  if (!message || message.length > 4000) throw bodyError('Copilot messages must contain 1–4000 characters.');
  const studioId = req.body.studioId ? studioFilter(req,id(req.body.studioId)) : conversation.studio_id;
  const history = (db.prepare('SELECT * FROM copilot_messages WHERE conversation_id=? ORDER BY id DESC LIMIT 12').all(conversation.id) as any[]).reverse()
    .map(item => ({ ...item, attachments: JSON.parse(item.attachments || '{}') }));
  const deterministic = await deterministicCopilot(message,studioId,history);
  const resolvedStudioId = deterministic.attachments?.concept?.studioId || deterministic.attachments?.plan?.studioId || deterministic.attachments?.report?.studioId || deterministic.attachments?.studioId || studioId;
  if (resolvedStudioId && !canAccessStudio(req.user,resolvedStudioId)) throw bodyError('The resolved studio is outside your access scope.',403);
  const requestedMode = ['auto','deterministic','ai'].includes(req.body.mode) ? req.body.mode : 'auto';
  if (requestedMode === 'ai' && !process.env.OPENAI_API_KEY) throw bodyError('AI provider is not configured. Choose Deterministic Copilot; no AI response has been fabricated.',503);
  const answer = requestedMode === 'ai' || requestedMode === 'auto' && process.env.OPENAI_API_KEY ? await providerNarrative(message,deterministic,history) : deterministic;
  let savedOffer: any = null;
  if (answer.saveOffer) {
    if (!req.user.permissions.includes('offer_create')) answer.content += '\nDraft was not saved: your role lacks offer-create permission.';
    else {
      savedOffer = persistOffer({ ...answer.saveOffer, generationSource: answer.mode === 'deterministic' ? 'copilot_deterministic' : 'copilot_ai_concept', dataMode: 'scenario' },req.user);
      answer.attachments = { ...answer.attachments, savedOfferId: savedOffer.id, savedOfferUid: savedOffer.offer_uid };
      answer.content = answer.content.replace('This concept is ready to save as a draft; it will not be approved or published automatically.',`Saved as draft #${savedOffer.id} (${savedOffer.offer_uid}). Approval and publishing remain separate.`)
        .replace('The previous',`Saved the previous`).replace('concept is ready to save as a draft. Policy and financial validation will run again; no approval or publishing will occur.',`concept as draft #${savedOffer.id}; no approval or publishing occurred.`);
    }
  }
  delete answer.saveOffer;
  const title = conversation.title === 'New commercial conversation' ? message.slice(0,80) : conversation.title;
  const persist = db.transaction(() => {
    db.prepare('INSERT INTO copilot_messages(conversation_id,role,content,attachments,mode) VALUES (?,?,?,?,?)').run(conversation.id,'user',message,'{}','user');
    const inserted = db.prepare('INSERT INTO copilot_messages(conversation_id,role,content,attachments,mode) VALUES (?,?,?,?,?)').run(conversation.id,'assistant',answer.content,JSON.stringify(answer.attachments),answer.mode);
    db.prepare('UPDATE copilot_conversations SET title=?,studio_id=?,mode=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').run(title,resolvedStudioId,answer.mode,conversation.id);
    return Number(inserted.lastInsertRowid);
  });
  const assistantId = persist();
  audit({ userId: req.user!.id, action: 'message', entityType: 'copilot_conversation', entityId: conversation.id, studioId: resolvedStudioId, after: { mode: answer.mode, savedOfferId: savedOffer?.id || null, assistantMessageId: assistantId } });
  res.status(201).json({ conversationId: conversation.id, message: { id: assistantId, role: 'assistant', content: answer.content, attachments: answer.attachments, mode: answer.mode }, savedOffer });
}));
const planRow = (p: any) => p ? { ...p, actions: JSON.parse(p.actions || '[]'), offer_ids: p.offer_ids === null || p.offer_ids === undefined ? null : JSON.parse(p.offer_ids) } : null;
const studioIdByName = (name: string) => (db.prepare('SELECT id FROM studios WHERE name=?').get(name) as any)?.id as number | undefined;
app.get('/api/studio-plans', (req, res) => {
  const year = Number(req.query.year || 2027), scoped = studioFilter(req);
  const rows = db.prepare(`SELECT s.id,s.name,s.code,s.city,
      COALESCE(SUM(t.proposed_target),0) proposed, COALESCE(SUM(t.approved_target),0) approved,
      SUM(CASE WHEN t.approved_target IS NOT NULL THEN 1 ELSE 0 END) approved_months, COUNT(t.id) target_months,
      (SELECT COUNT(*) FROM monthly_plans p WHERE p.studio_id=s.id AND p.year=?) planned_months,
      (SELECT COUNT(*) FROM offers o WHERE o.studio_id=s.id AND o.year=? AND o.status NOT IN ('archived','rejected')) offers
    FROM studios s LEFT JOIN monthly_targets t ON t.studio_id=s.id AND t.year=?
    WHERE s.active=1 ${scoped ? 'AND s.id=?' : ''} GROUP BY s.id ORDER BY s.city,s.name`).all(...(scoped ? [year, year, year, scoped] : [year, year, year])) as any[];
  // Pop-up venues are listed inside the Pop-up card rather than as separate studios.
  const children = rows.filter(r => POPUP_CHILDREN.includes(r.name));
  res.json({ year, rows: rows.filter(r => !POPUP_CHILDREN.includes(r.name)).map(r => r.name === POPUP_PARENT ? { ...r, children } : r) });
});
app.get('/api/studio-plans/:studioId', (req, res) => {
  const studioId = studioFilter(req, id(req.params.studioId)), year = Number(req.query.year || 2027);
  const studio = db.prepare('SELECT * FROM studios WHERE id=?').get(studioId) as any;
  if (!studio) return res.status(404).json({ error: 'Studio not found.' });
  const targetsFor = (sid: number) => (db.prepare('SELECT * FROM monthly_targets WHERE studio_id=? AND year=? ORDER BY month').all(sid, year) as any[])
    .map(t => ({ ...t, funnel: JSON.parse(t.funnel || '{}'), assumptions: JSON.parse(t.assumptions || '{}') }));
  const plans = (db.prepare('SELECT * FROM monthly_plans WHERE studio_id=? AND year=?').all(studioId, year) as any[]).map(planRow);
  const actuals = db.prepare(`SELECT CAST(substr(month,6,2) AS INTEGER) month,SUM(amount) revenue FROM transactions WHERE studio_id=? AND substr(month,1,4)=? GROUP BY month`).all(studioId, String(year));
  const children = studio.name === POPUP_PARENT ? POPUP_CHILDREN.map(name => { const cid = studioIdByName(name); return cid ? { id: cid, name, targets: targetsFor(cid) } : null; }).filter(Boolean) : [];
  const parentId = POPUP_CHILDREN.includes(studio.name) ? studioIdByName(POPUP_PARENT) : null;
  ensurePlaybookItems(studioId, year, req.user!.id);
  const items = db.prepare('SELECT * FROM studio_playbook_items WHERE studio_id=? AND year=? ORDER BY section,sort,id').all(studioId, year);
  res.json({ studio, year, targets: targetsFor(studioId), plans, actuals, children, parent: parentId ? { id: parentId, name: POPUP_PARENT } : null, items, ...bengaluruReference(studio.name) });
});
const planSchema = z.object({ theme: z.string().max(200).nullable().optional(), objective: z.string().max(300).nullable().optional(),
  strategy: z.string().max(5000).nullable().optional(), notes: z.string().max(5000).nullable().optional(), status: z.enum(['draft','final']).optional(),
  offer_ids: z.array(z.number().int().positive()).max(200).nullable().optional(),
  actions: z.array(z.object({ text: z.string().trim().min(1).max(500), owner: z.string().max(80).optional().default(''), week: z.number().int().min(1).max(5).optional().default(1), done: z.boolean().optional().default(false) })).max(60).optional() });
app.put('/api/studio-plans/:studioId/:year/:month', permission('target_edit'), (req, res) => {
  const studioId = studioFilter(req, id(req.params.studioId)), year = id(req.params.year), month = id(req.params.month);
  if (month > 12) throw bodyError('Month must be between 1 and 12.');
  const input = planSchema.parse(req.body);
  const before = planRow(db.prepare('SELECT * FROM monthly_plans WHERE studio_id=? AND year=? AND month=?').get(studioId, year, month));
  const merged = { theme: null, objective: null, strategy: null, notes: null, status: 'draft', actions: [], offer_ids: null, ...before, ...input };
  db.prepare(`INSERT INTO monthly_plans(studio_id,year,month,theme,objective,strategy,actions,notes,status,offer_ids,updated_by) VALUES (?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(studio_id,year,month) DO UPDATE SET theme=excluded.theme,objective=excluded.objective,strategy=excluded.strategy,actions=excluded.actions,
    notes=excluded.notes,status=excluded.status,offer_ids=excluded.offer_ids,updated_by=excluded.updated_by,updated_at=CURRENT_TIMESTAMP`)
    .run(studioId, year, month, merged.theme, merged.objective, merged.strategy, JSON.stringify(merged.actions), merged.notes, merged.status,
      merged.offer_ids === null ? null : JSON.stringify(merged.offer_ids), req.user!.id);
  const after = planRow(db.prepare('SELECT * FROM monthly_plans WHERE studio_id=? AND year=? AND month=?').get(studioId, year, month));
  audit({ userId: req.user!.id, action: before ? 'update' : 'create', entityType: 'monthly_plan', entityId: after.id, studioId, before, after });
  res.json(after);
});
const itemSchema = z.object({ section: z.enum(PLAYBOOK_SECTIONS), title: z.string().trim().min(1).max(200), body: z.string().max(3000).default(''), enabled: z.boolean().optional(), sort: z.number().int().optional() });
const itemFor = (req: any) => {
  const item = db.prepare('SELECT * FROM studio_playbook_items WHERE id=?').get(id(req.params.itemId)) as any;
  if (!item) throw bodyError('Item not found.', 404);
  studioFilter(req, item.studio_id);
  return item;
};
app.post('/api/studio-plans/:studioId/items', permission('target_edit'), (req, res) => {
  const studioId = studioFilter(req, id(req.params.studioId)), year = Number(req.body.year || 2027), input = itemSchema.parse(req.body);
  const sort = Number((db.prepare('SELECT COALESCE(MAX(sort),0)+1 n FROM studio_playbook_items WHERE studio_id=? AND year=? AND section=?').get(studioId, year, input.section) as any).n);
  const result = db.prepare('INSERT INTO studio_playbook_items(studio_id,year,section,title,body,enabled,sort,source,updated_by) VALUES (?,?,?,?,?,?,?,?,?)')
    .run(studioId, year, input.section, input.title, input.body, input.enabled === false ? 0 : 1, sort, 'user', req.user!.id);
  res.status(201).json(db.prepare('SELECT * FROM studio_playbook_items WHERE id=?').get(result.lastInsertRowid));
});
app.patch('/api/studio-plans/items/:itemId', permission('target_edit'), (req, res) => {
  const item = itemFor(req), input = itemSchema.partial().parse(req.body);
  db.prepare('UPDATE studio_playbook_items SET title=?,body=?,enabled=?,sort=?,updated_by=?,updated_at=CURRENT_TIMESTAMP WHERE id=?')
    .run(input.title ?? item.title, input.body ?? item.body, input.enabled === undefined ? item.enabled : input.enabled ? 1 : 0, input.sort ?? item.sort, req.user!.id, item.id);
  res.json(db.prepare('SELECT * FROM studio_playbook_items WHERE id=?').get(item.id));
});
app.delete('/api/studio-plans/items/:itemId', permission('target_edit'), (req, res) => {
  const item = itemFor(req);
  db.prepare('DELETE FROM studio_playbook_items WHERE id=?').run(item.id);
  audit({ userId: req.user!.id, action: 'delete', entityType: 'playbook_item', entityId: item.id, studioId: item.studio_id, before: item });
  res.json({ ok: true });
});
app.get('/api/offers', (req, res) => {
  const clauses = ['1=1'], params: any[] = [];
  const studioId = studioFilter(req, req.query.studio ? id(req.query.studio) : undefined);
  if (studioId) { clauses.push('(o.studio_id=? OR o.studio_id IS NULL)'); params.push(studioId); }
  for (const [query, column] of [['status','o.status'],['objective','o.objective'],['offerType','o.offer_type'],['approval','o.approval_status']] as const) {
    if (req.query[query]) { clauses.push(`${column}=?`); params.push(req.query[query]); }
  }
  if (req.query.year) { clauses.push('o.year=?'); params.push(Number(req.query.year)); }
  if (req.query.month) { clauses.push('o.month=?'); params.push(Number(req.query.month)); }
  if (req.query.city) { clauses.push('s.city=?'); params.push(req.query.city); }
  if (req.query.minDiscount) { clauses.push('o.effective_discount>=?'); params.push(Number(req.query.minDiscount)); }
  if (req.query.maxDiscount) { clauses.push('o.effective_discount<=?'); params.push(Number(req.query.maxDiscount)); }
  const q = String(req.query.q || '').trim();
  if (q) {
    const naturalLanguage = q.trim().split(/\s+/).length > 4;
    const semanticFilters = /performed well|best|highest revenue|lapsed|comeback|reactivat|mumbai|below|under|less than|discount/i.test(q);
    if (!naturalLanguage || !semanticFilters) { clauses.push('(o.name LIKE ? OR o.headline LIKE ? OR o.customer_copy LIKE ? OR o.internal_description LIKE ? OR o.audience LIKE ? OR o.source_campaign LIKE ?)'); const like = `%${q}%`; params.push(like,like,like,like,like,like); }
    if (/lapsed|comeback|reactivat/i.test(q)) { clauses.push(`(o.objective='reactivation' OR o.audience LIKE '%lapsed%' OR o.name LIKE '%laps%' OR o.name LIKE '%comeback%')`); }
    if (/performed well|best|highest revenue/i.test(q)) clauses.push('o.actual_revenue>0');
    const discount = q.match(/(?:below|under|less than|<)\s*(\d+)%/i); if (discount) { clauses.push('o.effective_discount<?'); params.push(Number(discount[1])); }
    if (/mumbai/i.test(q)) { clauses.push(`s.city='Mumbai'`); }
  }
  if (req.query.performance === 'proven') clauses.push('o.actual_revenue>0');
  if (req.query.performance === 'poor') clauses.push('o.actual_redemptions>=5 AND o.effective_discount>15');
  const where = clauses.join(' AND '), page = Math.max(1, Number(req.query.page || 1)), limit = Math.min(100, Math.max(1, Number(req.query.limit || 50)));
  const total = Number((db.prepare(`SELECT COUNT(*) n FROM offers o LEFT JOIN studios s ON s.id=o.studio_id WHERE ${where}`).get(...params) as any).n);
  const rows = db.prepare(`SELECT o.*,s.name studio,s.city,u.name created_by_name FROM offers o LEFT JOIN studios s ON s.id=o.studio_id LEFT JOIN users u ON u.id=o.created_by
    WHERE ${where} ORDER BY o.updated_at DESC,o.id DESC LIMIT ? OFFSET ?`).all(...params, limit, (page - 1) * limit) as any[];
  res.json({ rows: rows.map(o => ({ ...o, mechanics: JSON.parse(o.mechanics || '{}'), financials: JSON.parse(o.financials || '{}'), risks: JSON.parse(o.risks || '[]'), provenance: JSON.parse(o.provenance || '{}') })), total, page, limit });
});
app.get('/api/offers/:id', (req, res) => {
  const offer = db.prepare('SELECT o.*,s.name studio,s.city FROM offers o LEFT JOIN studios s ON s.id=o.studio_id WHERE o.id=?').get(id(req.params.id)) as any;
  if (!offer || (offer.studio_id && !canAccessStudio(req.user!, offer.studio_id))) return res.status(404).json({ error: 'Offer not found.' });
  const versions = db.prepare('SELECT v.id,v.version,v.changed_at,u.name changed_by FROM offer_versions v LEFT JOIN users u ON u.id=v.changed_by WHERE offer_id=? ORDER BY version DESC').all(offer.id);
  const clones = db.prepare('SELECT id,name,studio_id,month,year,status FROM offers WHERE original_offer_id=?').all(offer.id);
  res.json({ ...offer, mechanics: JSON.parse(offer.mechanics || '{}'), financials: JSON.parse(offer.financials || '{}'), risks: JSON.parse(offer.risks || '[]'), provenance: JSON.parse(offer.provenance || '{}'), versions, clones });
});
app.post('/api/offers', permission('offer_create'), (req, res) => {
  res.status(201).json(persistOffer(req.body, req.user));
});
app.patch('/api/offers/:id', permission('offer_edit'), (req, res) => {
  const offerId = id(req.params.id), before = db.prepare('SELECT * FROM offers WHERE id=?').get(offerId) as any;
  if (!before || (before.studio_id && !canAccessStudio(req.user!, before.studio_id))) return res.status(404).json({ error: 'Offer not found.' });
  if (['approved','active','completed'].includes(before.status) && !req.user!.permissions.includes('offer_approve')) return res.status(403).json({ error: 'Approved offer mechanics are locked for your role. Duplicate the offer to create a variation.' });
  const merged = { ...before, ...req.body, studioId: req.body.studioId ?? before.studio_id, customerCopy: req.body.customerCopy ?? before.customer_copy,
    internalDescription: req.body.internalDescription ?? before.internal_description, generationSource: before.generation_source, dataMode: before.data_mode };
  const row = validateOfferForSave(merged, req.user);
  const columns = Object.keys(row);
  db.prepare(`UPDATE offers SET ${columns.map(c => `${c}=?`).join(',')},version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(...Object.values(row), offerId);
  const after = db.prepare('SELECT * FROM offers WHERE id=?').get(offerId) as any;
  db.prepare('INSERT INTO offer_versions(offer_id,version,snapshot,changed_by) VALUES (?,?,?,?)').run(offerId, after.version, JSON.stringify(after), req.user!.id);
  audit({ userId: req.user!.id, action: 'update', entityType: 'offer', entityId: offerId, studioId: after.studio_id, before, after, reason: req.body.reason });
  res.json(after);
});
app.post('/api/offers/:id/action', (req, res) => {
  const offerId = id(req.params.id), before = db.prepare('SELECT o.*,s.max_discount_percent FROM offers o LEFT JOIN studios s ON s.id=o.studio_id WHERE o.id=?').get(offerId) as any;
  if (!before || (before.studio_id && !canAccessStudio(req.user!, before.studio_id))) return res.status(404).json({ error: 'Offer not found.' });
  const action = req.body.action;
  if (['approve','reject'].includes(action)) {
    if (!req.user!.permissions.includes('offer_approve')) return res.status(403).json({ error: 'Offer approval permission required.' });
    const financials = JSON.parse(before.financials || '{}'); if (action === 'approve' && financials.errors?.length) return res.status(422).json({ error: 'Resolve financial guardrail errors before approval.' });
    db.prepare('UPDATE offers SET status=?,approval_status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').run(action === 'approve' ? 'approved' : 'rejected', action === 'approve' ? 'approved' : 'rejected', offerId);
  } else if (['archive','pause','activate','schedule','under_review'].includes(action)) {
    if (['archive','pause','schedule'].includes(action) && !req.user!.permissions.includes('offer_edit')) return res.status(403).json({ error: 'Offer edit permission required.' });
    if (action === 'activate' && (!req.user!.permissions.includes('offer_approve') || before.approval_status !== 'approved')) return res.status(403).json({ error: 'An authorised approver must approve the offer before activation.' });
    const status = ({ archive: 'archived', pause: 'paused', activate: 'active', schedule: 'scheduled', under_review: 'under_review' } as any)[action];
    db.prepare('UPDATE offers SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').run(status, offerId);
  } else if (action === 'clone' || action === 'duplicate') {
    if (!req.user!.permissions.includes('offer_create')) return res.status(403).json({ error: 'Offer creation permission required.' });
    const targetStudio = Number(req.body.studioId || before.studio_id); if (!canAccessStudio(req.user!, targetStudio)) return res.status(403).json({ error: 'Studio access denied.' });
    const studio = db.prepare('SELECT * FROM studios WHERE id=?').get(targetStudio) as any;
    const oldProducts = JSON.parse(before.eligible_products || '[]');
    let newProducts = oldProducts, mechanics = JSON.parse(before.mechanics || '{}');
    if (targetStudio !== before.studio_id) {
      const oldProduct = db.prepare('SELECT name FROM products WHERE id=?').get(oldProducts[0]) as any;
      const product = oldProduct ? db.prepare('SELECT * FROM products WHERE studio_id=? AND name=? AND list_price>0').get(targetStudio, oldProduct.name) as any :
        db.prepare('SELECT * FROM products WHERE studio_id=? AND list_price>0 ORDER BY list_price DESC LIMIT 1').get(targetStudio) as any;
      if (!product) return res.status(422).json({ error: 'No compatible priced product exists at the destination studio. Add a product before cloning.' });
      newProducts = [product.id]; mechanics.listedPrice = product.list_price;
    }
    const { cap } = validateStudioOfferPolicy(targetStudio, mechanics, newProducts);
    mechanics.maxDiscountPercent = Math.min(Number(mechanics.maxDiscountPercent ?? cap), cap);
    const financials = calculateOffer(mechanics); if (financials.errors.length) return res.status(422).json({ error: `Clone is not valid at the destination studio: ${financials.errors.join(' ')}` });
    const payload = { ...before, name: req.body.name || `${before.name} · ${targetStudio !== before.studio_id ? studio.name : 'variation'}`,
      studioId: targetStudio, month: req.body.month || before.month, year: req.body.year || before.year, eligibleProducts: newProducts, mechanics,
      status: 'draft', approvalStatus: 'pending', financials, expectedAsp: financials.sellingPrice, expectedRevenue: financials.expectedRevenue,
      effectiveDiscount: financials.effectiveDiscountPercent, generationSource: before.generation_source, dataMode: 'user' };
    const row = validateOfferForSave(payload, req.user), columns = Object.keys(row);
    const result = db.prepare(`INSERT INTO offers(offer_uid,created_by,original_offer_id,${columns.join(',')}) VALUES (?,?,?${',?'.repeat(columns.length)})`)
      .run(`P57-CLONE-${crypto.randomBytes(5).toString('hex').toUpperCase()}`, req.user!.id, offerId, ...Object.values(row));
    audit({ userId: req.user!.id, action: 'clone', entityType: 'offer', entityId: result.lastInsertRowid, studioId: targetStudio, before: { original: offerId }, after: payload });
    return res.status(201).json(db.prepare('SELECT * FROM offers WHERE id=?').get(result.lastInsertRowid));
  } else return res.status(400).json({ error: 'Unsupported offer action.' });
  const after = db.prepare('SELECT * FROM offers WHERE id=?').get(offerId);
  audit({ userId: req.user!.id, action, entityType: 'offer', entityId: offerId, studioId: before.studio_id, before, after, reason: req.body.reason });
  res.json(after);
});
app.post('/api/offers/simulate', (req, res) => {
  const input = { ...req.body }, policyErrors: string[] = [];
  if (req.body.studioId) {
    try { const { cap } = validateStudioOfferPolicy(Number(req.body.studioId),input,req.body.eligibleProductIds || []); input.maxDiscountPercent = Math.min(Number(input.maxDiscountPercent ?? cap),cap); }
    catch (error: any) { policyErrors.push(error.message); }
  }
  const result = calculateOffer(input); result.errors = [...policyErrors,...result.errors];
  res.json(result);
});
app.post('/api/offers/generate', permission('offer_create'), asyncRoute(async (req: any, res: any) => {
  const studioId = studioFilter(req, id(req.body.studioId));
  const request = { ...req.body, studioId };
  const result = request.source === 'ai' ? await generateWithAI(request) : generateConcepts(request);
  res.json(result);
}));
app.post('/api/offers/random', permission('offer_create'), (req, res) => {
  const studioId = studioFilter(req, id(req.body.studioId));
  const concept = randomConcept({ ...req.body, studioId });
  db.prepare('INSERT INTO generation_history(fingerprint,offer_payload,user_id) VALUES (?,?,?)').run(concept.fingerprint, JSON.stringify(concept), req.user!.id);
  res.json(concept);
});
app.post('/api/goals/solve', permission('offer_create'), (req, res) => {
  const studioId = studioFilter(req, id(req.body.studioId));
  const solution = solveRevenueGoal(Number(req.body.target), Number(req.body.actual), req.body.streams || []);
  const concepts = generateConcepts({ ...req.body, studioId, targetRevenue: solution.gap, count: 3 });
  res.json({ ...solution, primary: concepts.offers.find(o => o.recommended), fallback: concepts.offers.find(o => !o.recommended),
    interventions: solution.uncoveredGap > 0 ? ['Do not assign the entire uncovered gap to one discount campaign.', 'Review lead quality, trial attendance and follow-up capacity.', 'Renew management forecast and document any unachievable residual gap.'] : [],
    assumptions: 'Stream potential = eligible audience × conversion assumption × average spend. Contributions are capped at feasible stream potential and the remaining gap.' });
});

function campaignConflicts(body: any, excludeId?: number) {
  return db.prepare(`SELECT c.id,c.name,c.start_date,c.end_date,c.audience,o.name offer_name,o.benefit FROM campaigns c LEFT JOIN offers o ON o.id=c.offer_id
    WHERE c.studio_id=? AND c.status NOT IN ('archived','rejected') AND c.start_date<=? AND c.end_date>=? ${excludeId ? 'AND c.id!=?' : ''}
    AND (LOWER(COALESCE(c.audience,''))=LOWER(COALESCE(?,'')) OR COALESCE(c.audience,'')='' OR COALESCE(?,'')='')`)
    .all(...[body.studioId, body.endDate, body.startDate, ...(excludeId ? [excludeId] : []), body.audience || '', body.audience || '']);
}
app.get('/api/campaigns', (req, res) => {
  const year = Number(req.query.year || 2027), studioId = studioFilter(req, req.query.studio ? id(req.query.studio) : undefined);
  const rows = db.prepare(`SELECT c.*,s.name studio,o.name offer_name,o.benefit,o.approval_status offer_approval,u.name owner,
    p.revenue actual_revenue,p.redemptions,p.buyers,p.customers_reached,p.effective_discount FROM campaigns c JOIN studios s ON s.id=c.studio_id
    LEFT JOIN offers o ON o.id=c.offer_id LEFT JOIN users u ON u.id=c.owner_id LEFT JOIN campaign_performance p ON p.campaign_id=c.id
    WHERE c.year=? ${studioId ? 'AND c.studio_id=?' : ''} ${req.query.month ? 'AND CAST(substr(c.start_date,6,2) AS INTEGER)=?' : ''} ORDER BY c.start_date`).all(
      ...[year, ...(studioId ? [studioId] : []), ...(req.query.month ? [Number(req.query.month)] : [])]) as any[];
  const withWarnings = rows.map(c => ({ ...c, tasks: JSON.parse(c.tasks || '[]'), conflicts: campaignConflicts(c, c.id) }));
  res.json({ rows: withWarnings });
});
app.post('/api/campaigns', permission('campaign_edit'), (req, res) => {
  const b = req.body, studioId = studioFilter(req, id(b.studioId));
  if (!b.name || !b.startDate || !b.endDate || b.endDate < b.startDate) throw bodyError('Valid campaign name and start/end dates are required.');
  const conflicts = campaignConflicts({ ...b, studioId });
  if (conflicts.length && !b.force) return res.status(409).json({ error: 'Potential audience and offer overlap detected.', conflicts });
  const result = db.prepare(`INSERT INTO campaigns(name,studio_id,offer_id,year,start_date,end_date,audience,objective,target_revenue,expected_purchases,status,approval_status,owner_id,tasks,data_mode,notes,created_by)
    VALUES (?,?,?,?,?,?,?,?,?,?, 'draft','pending',?,?,?,?,?)`).run(b.name, studioId, b.offerId || null, Number(b.year || b.startDate.slice(0,4)), b.startDate, b.endDate,
    b.audience || '', b.objective || '', Number(b.targetRevenue || 0), b.expectedPurchases || null, b.ownerId || req.user!.id, JSON.stringify(b.tasks || []), b.dataMode || 'user', b.notes || null, req.user!.id);
  audit({ userId: req.user!.id, action: 'create', entityType: 'campaign', entityId: result.lastInsertRowid, studioId, after: { ...b, conflictsOverridden: conflicts.length && b.force } });
  res.status(201).json(db.prepare('SELECT * FROM campaigns WHERE id=?').get(result.lastInsertRowid));
});
app.patch('/api/campaigns/:id', permission('campaign_edit'), (req, res) => {
  const campaignId = id(req.params.id), before = db.prepare('SELECT * FROM campaigns WHERE id=?').get(campaignId) as any;
  if (!before || !canAccessStudio(req.user!, before.studio_id)) return res.status(404).json({ error: 'Campaign not found.' });
  const b = { ...before, ...req.body, studioId: before.studio_id, startDate: req.body.startDate || before.start_date, endDate: req.body.endDate || before.end_date,
    targetRevenue: req.body.targetRevenue ?? before.target_revenue, expectedPurchases: req.body.expectedPurchases ?? before.expected_purchases };
  if (b.endDate < b.startDate) throw bodyError('Campaign end date must be on or after its start date.');
  const conflicts = campaignConflicts(b, campaignId); if (conflicts.length && !b.force) return res.status(409).json({ error: 'Potential audience and offer overlap detected.', conflicts });
  if (b.status === 'active' && (!req.user!.permissions.includes('campaign_approve') || b.approvalStatus !== 'approved' && before.approval_status !== 'approved')) return res.status(403).json({ error: 'Campaign approval is required before activation.' });
  if (b.status === 'active' && before.offer_id) {
    const linkedOffer = db.prepare('SELECT approval_status,status FROM offers WHERE id=?').get(before.offer_id) as any;
    if (!linkedOffer || linkedOffer.approval_status !== 'approved') return res.status(422).json({ error: 'The linked offer must be approved before the campaign can become active.' });
  }
  if (b.approvalStatus === 'approved' && before.approval_status !== 'approved' && !req.user!.permissions.includes('campaign_approve')) return res.status(403).json({ error: 'Campaign approval permission required.' });
  db.prepare(`UPDATE campaigns SET name=?,offer_id=?,start_date=?,end_date=?,audience=?,objective=?,target_revenue=?,expected_purchases=?,status=?,approval_status=?,owner_id=?,tasks=?,notes=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`)
    .run(b.name, b.offerId ?? before.offer_id, b.startDate, b.endDate, b.audience || '', b.objective || '', Number(b.targetRevenue || 0), b.expectedPurchases || null,
      b.status || before.status, b.approvalStatus || before.approval_status, b.ownerId || before.owner_id, JSON.stringify(b.tasks || before.tasks && JSON.parse(before.tasks) || []), b.notes ?? before.notes, campaignId);
  const after = db.prepare('SELECT * FROM campaigns WHERE id=?').get(campaignId);
  audit({ userId: req.user!.id, action: 'update', entityType: 'campaign', entityId: campaignId, studioId: before.studio_id, before, after, reason: b.reason });
  res.json(after);
});
app.post('/api/campaigns/:id/duplicate', permission('campaign_edit'), (req, res) => {
  const before = db.prepare('SELECT * FROM campaigns WHERE id=?').get(id(req.params.id)) as any;
  if (!before || !canAccessStudio(req.user!, before.studio_id)) return res.status(404).json({ error: 'Campaign not found.' });
  const start = req.body.startDate || before.start_date, end = req.body.endDate || before.end_date;
  const result = db.prepare(`INSERT INTO campaigns(name,studio_id,offer_id,year,start_date,end_date,audience,objective,target_revenue,expected_purchases,status,approval_status,owner_id,tasks,data_mode,notes,created_by)
    VALUES (?,?,?,?,?,?,?,?,?,?,'draft','pending',?,?, 'user',?,?)`).run(`${before.name} · copy`, before.studio_id, before.offer_id, Number(String(start).slice(0,4)), start, end,
    before.audience, before.objective, before.target_revenue, before.expected_purchases, before.owner_id, before.tasks, before.notes, req.user!.id);
  res.status(201).json(db.prepare('SELECT * FROM campaigns WHERE id=?').get(result.lastInsertRowid));
});
app.post('/api/campaigns/:id/performance', permission('campaign_edit'), (req, res) => {
  const campaignId = id(req.params.id), campaign = db.prepare('SELECT * FROM campaigns WHERE id=?').get(campaignId) as any;
  if (!campaign || !canAccessStudio(req.user!, campaign.studio_id)) return res.status(404).json({ error: 'Campaign not found.' });
  const fields = ['eligibleAudience','customersReached','responses','redemptions','buyers','transactions','revenue','effectiveDiscount','discountCost','subsequentRevenue'];
  const values = fields.map(f => Number(req.body[f] || 0));
  if (values.some(v => !Number.isFinite(v) || v < 0)) throw bodyError('Performance values must be non-negative numbers.');
  const aov = Number(req.body.transactions) > 0 ? Number(req.body.revenue) / Number(req.body.transactions) : null;
  db.prepare(`INSERT INTO campaign_performance(campaign_id,eligible_audience,customers_reached,responses,redemptions,buyers,transactions,revenue,aov,effective_discount,discount_cost,subsequent_revenue,notes,recorded_by)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(campaign_id) DO UPDATE SET eligible_audience=excluded.eligible_audience,customers_reached=excluded.customers_reached,
    responses=excluded.responses,redemptions=excluded.redemptions,buyers=excluded.buyers,transactions=excluded.transactions,revenue=excluded.revenue,aov=excluded.aov,
    effective_discount=excluded.effective_discount,discount_cost=excluded.discount_cost,subsequent_revenue=excluded.subsequent_revenue,notes=excluded.notes,recorded_by=excluded.recorded_by,updated_at=CURRENT_TIMESTAMP`)
    .run(campaignId, ...values.slice(0,7), aov, ...values.slice(7), req.body.notes || null, req.user!.id);
  audit({ userId: req.user!.id, action: 'record_actuals', entityType: 'campaign_performance', entityId: campaignId, studioId: campaign.studio_id, after: req.body });
  res.json(db.prepare('SELECT * FROM campaign_performance WHERE campaign_id=?').get(campaignId));
});
app.get('/api/performance', (req, res) => {
  const year = Number(req.query.year || 2027), studioId = studioFilter(req, req.query.studio ? id(req.query.studio) : undefined);
  const campaigns = db.prepare(`SELECT c.*,s.name studio,o.name offer_name,p.*,c.target_revenue planned_revenue,c.expected_purchases planned_purchases
    FROM campaigns c JOIN studios s ON s.id=c.studio_id LEFT JOIN offers o ON o.id=c.offer_id JOIN campaign_performance p ON p.campaign_id=c.id
    WHERE c.year=? ${studioId ? 'AND c.studio_id=?' : ''} ORDER BY p.updated_at DESC`).all(...(studioId ? [year, studioId] : [year])) as any[];
  const historical = db.prepare(`SELECT o.id,o.name,o.actual_revenue revenue,o.actual_redemptions redemptions,o.actual_sales transactions,o.effective_discount,
    o.actual_discount_cost discount_cost,s.name studio,o.source_campaign,o.performance_notes FROM offers o LEFT JOIN studios s ON s.id=o.studio_id
    WHERE o.generation_source='historical_import' ${studioId ? 'AND o.studio_id=?' : ''} ORDER BY o.actual_revenue DESC LIMIT 200`).all(...(studioId ? [studioId] : []));
  const classified = campaigns.map(c => ({ ...c, learning: c.revenue >= c.planned_revenue && c.effective_discount <= 15 ? 'repeat' : c.redemptions > 0 && c.revenue < c.planned_revenue * .5 ? 'review_or_retire' : 'test_again',
    attribution: 'Observed campaign performance; no causal incrementality is claimed.' }));
  res.json({ campaigns: classified, historical });
});

app.get('/api/segments', (req, res) => {
  const studioId = studioFilter(req, req.query.studio ? id(req.query.studio) : undefined);
  const rows = db.prepare(`SELECT ss.*,s.name studio FROM segment_snapshots ss JOIN studios s ON s.id=ss.studio_id ${studioId ? 'WHERE ss.studio_id=?' : ''} ORDER BY s.name,ss.audience_size DESC`).all(...(studioId ? [studioId] : []));
  res.json({ rows, rules: db.prepare('SELECT * FROM segment_rules WHERE id=1').get() });
});
app.patch('/api/segments/rules', permission('target_edit'), (req, res) => {
  const before = db.prepare('SELECT * FROM segment_rules WHERE id=1').get();
  const fields = ['expiry_days','recently_lapsed_days','long_lapsed_days','high_value_percentile','frequent_purchase_count','promo_sensitivity_threshold'];
  const values = fields.map(f => Number(req.body[f] ?? (before as any)[f]));
  if (values.some(v => !Number.isFinite(v) || v < 0)) throw bodyError('Segment rules must be non-negative numbers.');
  db.prepare(`UPDATE segment_rules SET expiry_days=?,recently_lapsed_days=?,long_lapsed_days=?,high_value_percentile=?,frequent_purchase_count=?,promo_sensitivity_threshold=?,updated_at=CURRENT_TIMESTAMP WHERE id=1`).run(...values);
  recalculateSegments(); const after = db.prepare('SELECT * FROM segment_rules WHERE id=1').get();
  audit({ userId: req.user!.id, action: 'update_segment_rules', entityType: 'segment_rules', entityId: 1, before, after, reason: req.body.reason });
  res.json(after);
});
app.get('/api/anniversary', (req, res) => {
  const year = Number(req.query.year || 2027), studioId = studioFilter(req, req.query.studio ? id(req.query.studio) : undefined);
  const baseline = db.prepare(`SELECT s.id studio_id,s.name studio,t.month,SUM(t.amount) revenue,COUNT(*) transactions,AVG(t.amount) aov FROM transactions t JOIN studios s ON s.id=t.studio_id
    WHERE t.month LIKE ? ${studioId ? 'AND s.id=?' : ''} GROUP BY s.id,t.month ORDER BY s.name,t.month`).all(...(studioId ? [`%-04`, studioId] : ['%-04']));
  const campaigns = db.prepare(`SELECT c.*,s.name studio,o.name offer_name,o.data_mode FROM campaigns c JOIN studios s ON s.id=c.studio_id LEFT JOIN offers o ON o.id=c.offer_id
    WHERE c.year=? AND CAST(substr(c.start_date,6,2) AS INTEGER)=4 ${studioId ? 'AND c.studio_id=?' : ''}`).all(...(studioId ? [year, studioId] : [year]));
  const ordinary = db.prepare(`SELECT s.name studio,AVG(monthly_revenue) ordinary_month_average FROM (SELECT studio_id,month,SUM(amount) monthly_revenue FROM transactions WHERE month NOT LIKE '%-04' GROUP BY studio_id,month) x JOIN studios s ON s.id=x.studio_id ${studioId ? 'WHERE s.id=?' : ''} GROUP BY s.id`).all(...(studioId ? [studioId] : []));
  res.json({ baseline, campaigns, ordinary, retentionPlan: [
    { week: 'April · at purchase', action: 'Capture preferred class cadence and book the first May visit before checkout.' },
    { week: 'May · days 1–7', action: 'Send attendance-based check-in; no automatic follow-on discount.' },
    { week: 'May · days 8–21', action: 'Prompt second purchase only for clients with healthy attendance; offer onboarding to inactive buyers.' },
    { week: 'June · cohort review', action: 'Compare 30/60-day attendance and subsequent purchases against non-anniversary cohorts; report observed, not causal, retention.' },
  ] });
});

app.get('/api/imports', permission('import'), (_req, res) => res.json(db.prepare(`SELECT i.*,u.name created_by_name FROM imports i LEFT JOIN users u ON u.id=i.created_by ORDER BY i.created_at DESC`).all()));
app.post('/api/imports', permission('import'), upload.single('file'), (req, res) => {
  if (!req.file) throw bodyError('Choose a CSV, XLSX or XLSM file.');
  const result = db.prepare(`INSERT INTO imports(filename,file_path,status,created_by) VALUES (?,?, 'uploaded',?)`).run(req.file.originalname, req.file.path, req.user!.id);
  res.status(201).json({ id: result.lastInsertRowid, filename: req.file.originalname, size: req.file.size });
});
app.get('/api/imports/:id', permission('import'), asyncRoute(async (req: any, res: any) => {
  const row = db.prepare('SELECT * FROM imports WHERE id=?').get(id(req.params.id)) as any;
  if (!row) return res.status(404).json({ error: 'Import not found.' });
  if (['uploaded','failed'].includes(row.status) || req.query.inspect === 'true') {
    const inspection = await inspectImport(row.id, req.query.worksheet as string | undefined);
    return res.json({ ...row, inspection });
  }
  res.json({ ...row, mapping: JSON.parse(row.mapping || '{}'), summary: JSON.parse(row.summary || '{}') });
}));
app.post('/api/imports/:id/validate', permission('import'), (req, res) => {
  const importId = id(req.params.id), body = req.body;
  res.status(202).json({ status: 'validating' });
  setImmediate(async () => { try { await validateImport(importId, body.category, body.mapping, body.worksheet); } catch (error) { console.error('Import validation failed', error); } });
});
app.post('/api/imports/:id/commit', permission('import'), (req, res) => {
  const importId = id(req.params.id), userId = req.user!.id, createStudios = Boolean(req.body.createStudios);
  const importRow = db.prepare('SELECT status FROM imports WHERE id=?').get(importId) as any;
  if (!importRow || importRow.status !== 'validated') return res.status(422).json({ error: 'Validate the file before importing.' });
  db.prepare(`UPDATE imports SET status='committing' WHERE id=?`).run(importId);
  res.status(202).json({ status: 'committing' });
  setImmediate(async () => {
    try { const result = await commitImport(importId, userId, createStudios); audit({ userId, action: 'commit_import', entityType: 'import', entityId: importId, after: result }); }
    catch (error: any) { console.error('Import commit failed', error); db.prepare(`UPDATE imports SET status='failed',error=? WHERE id=?`).run(error.message, importId); }
  });
});
app.get('/api/imports/:id/errors.csv', permission('import'), (req, res) => {
  const rows = db.prepare('SELECT row_number,field,message,raw_row FROM import_errors WHERE import_id=? ORDER BY row_number').all(id(req.params.id)) as any[];
  res.setHeader('Content-Type', 'text/csv; charset=utf-8'); res.setHeader('Content-Disposition', `attachment; filename="import-${req.params.id}-errors.csv"`);
  res.send(stringify(rows, { header: true }));
});
app.get('/api/import-fields', permission('import'), (_req, res) => res.json(IMPORT_FIELDS));
app.post('/api/mapping-templates', permission('import'), (req, res) => {
  const name = String(req.body.name || '').trim(); if (!name) throw bodyError('Template name is required.');
  const signature = crypto.createHash('sha256').update((req.body.headers || []).join('|')).digest('hex');
  const result = db.prepare(`INSERT INTO mapping_templates(name,category,signature,mapping,created_by) VALUES (?,?,?,?,?) ON CONFLICT(name,category) DO UPDATE SET mapping=excluded.mapping,signature=excluded.signature`)
    .run(name, req.body.category, signature, JSON.stringify(req.body.mapping || {}), req.user!.id);
  res.status(201).json({ id: result.lastInsertRowid, name });
});
app.get('/api/mapping-templates', permission('import'), (_req, res) => res.json(db.prepare('SELECT * FROM mapping_templates ORDER BY name').all()));

const reportingOptions = (req: any, input: any, exportMode = false) => {
  const raw = { ...input };
  if (reportSupportsStudio(String(raw.report || ''))) {
    const studioId = studioFilter(req, raw.studio !== undefined && raw.studio !== '' && raw.studio !== 'all' ? id(raw.studio) : undefined);
    if (studioId) raw.studio = studioId; else delete raw.studio;
  }
  return parseReportOptions(raw,exportMode);
};
app.get('/api/reporting/catalog', permission('financial'), (req, res) => {
  res.json({ reports: reportCatalog(req.user!.permissions), defaults: reportDefaults(), formats: ['csv','xlsx','print'], maxExportRows: 10000 });
});
app.get('/api/reporting/run', permission('financial'), (req, res) => {
  res.json(runReport(reportingOptions(req,req.query)));
});
app.get('/api/reporting/export', permission('export'), asyncRoute(async (req: any, res: any) => {
  const format = req.query.format === 'xlsx' ? 'xlsx' : 'csv';
  const result = runReport(reportingOptions(req,{ ...req.query, limit: 10000 },true),true);
  audit({ userId: req.user!.id, action: 'export_advanced_report', entityType: 'report', entityId: result.definition.id,
    studioId: result.options.studio, after: { format, from: result.options.from, to: result.options.to, rows: result.returnedRows, columns: result.columns.map((column: any) => column.key) } });
  await sendReportExport(res,result,format);
}));
app.get('/api/reporting/saved', permission('financial'), (req, res) => {
  const rows = db.prepare(`SELECT r.*,s.name studio FROM saved_reports r LEFT JOIN studios s ON s.id=r.studio_id WHERE r.user_id=? ORDER BY r.updated_at DESC`).all(req.user!.id) as any[];
  res.json({ rows: rows.map(row => ({ ...row, config: JSON.parse(row.config || '{}') })) });
});
app.post('/api/reporting/saved', permission('financial'), (req, res) => {
  const name = String(req.body.name || '').trim(); if (!name || name.length > 100) throw bodyError('Saved report names must contain 1–100 characters.');
  const options = reportingOptions(req,{ ...(req.body.config || {}), report: req.body.report || req.body.config?.report });
  const savedId = req.body.id ? id(req.body.id) : null;
  const before = savedId ? db.prepare('SELECT * FROM saved_reports WHERE id=? AND user_id=?').get(savedId,req.user!.id) as any : null;
  if (savedId && !before) throw bodyError('Saved report view not found.',404);
  if (!savedId && Number((db.prepare('SELECT COUNT(*) n FROM saved_reports WHERE user_id=?').get(req.user!.id) as any).n) >= 100) throw bodyError('Saved-view limit reached. Delete an old view before creating another.',422);
  let idValue = savedId;
  if (savedId) db.prepare('UPDATE saved_reports SET name=?,report_id=?,studio_id=?,config=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=?')
    .run(name,options.report,options.studio || null,JSON.stringify(options),savedId,req.user!.id);
  else idValue = Number(db.prepare('INSERT INTO saved_reports(user_id,name,report_id,studio_id,config) VALUES (?,?,?,?,?)')
    .run(req.user!.id,name,options.report,options.studio || null,JSON.stringify(options)).lastInsertRowid);
  const after = db.prepare('SELECT * FROM saved_reports WHERE id=?').get(idValue) as any;
  audit({ userId: req.user!.id, action: savedId ? 'update_saved_report' : 'create_saved_report', entityType: 'saved_report', entityId: idValue,
    studioId: options.studio, before, after });
  res.status(savedId ? 200 : 201).json({ ...after, config: JSON.parse(after.config) });
});
app.delete('/api/reporting/saved/:id', permission('financial'), (req, res) => {
  const savedId = id(req.params.id), before = db.prepare('SELECT * FROM saved_reports WHERE id=? AND user_id=?').get(savedId,req.user!.id) as any;
  if (!before) throw bodyError('Saved report view not found.',404);
  db.prepare('DELETE FROM saved_reports WHERE id=?').run(savedId);
  audit({ userId: req.user!.id, action: 'delete_saved_report', entityType: 'saved_report', entityId: savedId, studioId: before.studio_id, before });
  res.json({ ok: true });
});

app.get('/api/reports/:type', permission('export'), asyncRoute(async (req: any, res: any) => {
  const type = req.params.type, year = Number(req.query.year || 2027), format = req.query.format === 'xlsx' ? 'xlsx' : 'csv';
  const studioId = studioFilter(req, req.query.studio ? id(req.query.studio) : undefined);
  let rows: any[] = [], title = type;
  if (type === 'targets' || type === 'monthly-plans' || type === 'funnel') {
    rows = db.prepare(`SELECT s.name Studio,s.city City,t.year Year,t.month Month,t.scenario Scenario,t.historical_revenue 'Historical comparable revenue (INR)',
      t.baseline_forecast 'Baseline forecast (INR)',t.proposed_target 'Proposed target (INR)',t.approved_target 'Approved target (INR)',t.target_growth 'Target growth (%)',
      t.new_client_target 'New-client target (INR)',t.renewal_target 'Renewal target (INR)',t.repeat_target 'Repeat purchase target (INR)',
      t.reactivation_target 'Reactivation target (INR)',t.target_transactions 'Target transactions',t.expected_aov 'Expected AOV (INR)',t.funnel 'Funnel calculation JSON',t.assumptions 'Assumptions and provenance JSON'
      FROM monthly_targets t JOIN studios s ON s.id=t.studio_id WHERE t.year=? ${studioId ? 'AND t.studio_id=?' : ''} ORDER BY s.name,t.month`).all(...(studioId ? [year, studioId] : [year]));
  } else if (type === 'offers' || type === 'ai-offers' || type === 'anniversary') {
    rows = db.prepare(`SELECT o.offer_uid 'Offer ID',o.name 'Offer name',s.name Studio,o.year Year,o.month Month,o.objective Objective,o.audience Audience,
      o.offer_type 'Offer type',o.benefit Benefit,o.revenue_target 'Revenue target (INR)',o.expected_asp 'Expected ASP (INR)',o.expected_revenue 'Expected revenue (INR)',
      o.effective_discount 'Effective discount (%)',o.actual_revenue 'Observed actual revenue (INR)',o.actual_redemptions 'Observed redemptions',o.status Status,
      o.approval_status 'Approval status',o.generation_source 'Generation source',o.data_mode 'Data mode',o.customer_copy 'Customer copy',o.rationale Rationale,
      o.risks 'Risks JSON',o.mechanics 'Mechanics JSON' FROM offers o LEFT JOIN studios s ON s.id=o.studio_id WHERE 1=1
      ${type === 'ai-offers' ? `AND o.generation_source IN ('openai','rules_engine')` : ''} ${type === 'anniversary' ? 'AND o.month=4' : ''}
      ${studioId ? 'AND o.studio_id=?' : ''} ${type !== 'ai-offers' && type !== 'anniversary' ? '' : 'AND o.year=?'} ORDER BY o.updated_at DESC`).all(
        ...(studioId ? (type === 'offers' ? [studioId] : [studioId,year]) : (type === 'offers' ? [] : [year]))) as any[];
  } else if (type === 'campaigns') {
    rows = db.prepare(`SELECT c.name Campaign,s.name Studio,c.start_date 'Start date',c.end_date 'End date',c.audience Audience,c.objective Objective,
      o.name Offer,c.target_revenue 'Target revenue (INR)',c.expected_purchases 'Expected purchases',c.status Status,c.approval_status 'Approval status',
      u.name Owner,c.data_mode 'Data mode',p.revenue 'Actual observed revenue (INR)',p.redemptions 'Actual redemptions',p.buyers 'Actual buyers'
      FROM campaigns c JOIN studios s ON s.id=c.studio_id LEFT JOIN offers o ON o.id=c.offer_id LEFT JOIN users u ON u.id=c.owner_id
      LEFT JOIN campaign_performance p ON p.campaign_id=c.id WHERE c.year=? ${studioId ? 'AND c.studio_id=?' : ''} ORDER BY c.start_date`).all(...(studioId ? [year, studioId] : [year]));
  } else if (type === 'historical') {
    rows = db.prepare(`SELECT s.name Studio,s.city City,t.month Month,COUNT(*) Transactions,SUM(t.amount) 'Revenue gross collected (INR)',AVG(t.amount) 'Average transaction (INR)',
      SUM(CASE WHEN t.revenue_stream='new_client' THEN t.amount ELSE 0 END) 'First observed purchase revenue (INR)',
      SUM(CASE WHEN t.revenue_stream='renewal' THEN t.amount ELSE 0 END) 'Inferred renewal revenue (INR)',
      SUM(CASE WHEN t.revenue_stream='reactivation' THEN t.amount ELSE 0 END) 'Inferred reactivation revenue (INR)',SUM(t.discount_amount) 'Discount value (INR)'
      FROM transactions t JOIN studios s ON s.id=t.studio_id WHERE t.month LIKE ? ${studioId ? 'AND t.studio_id=?' : ''} GROUP BY s.id,t.month ORDER BY t.month,s.name`).all(...(studioId ? [`${year}-%`,studioId] : [`${year}-%`]));
  } else if (type === 'performance') {
    rows = db.prepare(`SELECT s.name Studio,o.name Offer,o.source_campaign 'Source campaign',o.actual_sales Transactions,o.actual_redemptions Redemptions,
      o.actual_revenue 'Observed attributed revenue (INR)',o.effective_discount 'Effective discount (%)',o.actual_discount_cost 'Discount cost (INR)',o.performance_notes 'Attribution note'
      FROM offers o LEFT JOIN studios s ON s.id=o.studio_id WHERE o.generation_source='historical_import' ${studioId ? 'AND o.studio_id=?' : ''} ORDER BY o.actual_revenue DESC`).all(...(studioId ? [studioId] : []));
  } else throw bodyError('Unknown report type.', 404);
  const filename = `p57-${type}-${year}.${format}`;
  if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8'); res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send('\uFEFF' + stringify(rows, { header: true }));
  }
  const workbook = new ExcelJS.Workbook(); workbook.creator = 'P57 Sales Intelligence Studio';
  const sheet = workbook.addWorksheet(title.slice(0,28)); sheet.columns = rows.length ? Object.keys(rows[0]).map(key => ({ header: key, key, width: Math.min(45, Math.max(14,key.length+2)) })) : [{ header: 'No data', key: 'empty', width: 30 }];
  rows.forEach(row => sheet.addRow(row)); sheet.getRow(1).font = { bold: true }; sheet.autoFilter = rows.length ? { from: { row: 1, column: 1 }, to: { row: 1, column: Object.keys(rows[0]).length } } : undefined;
  const notes = workbook.addWorksheet('Read me'); notes.addRows([[title], [`Generated: ${new Date().toISOString()}`], [`Planning/performance year: ${year}`], ...dataCoverage().limitations.map(x => [x]), ['AI and rules-engine outputs are recommendations; approved commercial decisions remain separate.']]);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'); res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  await workbook.xlsx.write(res); res.end();
}));

app.get('/api/users', permission('users'), (_req, res) => res.json(db.prepare('SELECT id,email,name,role,assigned_studio_id,active,created_at FROM users ORDER BY name').all()));
app.patch('/api/users/:id', permission('users'), (req, res) => {
  const userId = id(req.params.id), before = db.prepare('SELECT id,email,name,role,assigned_studio_id,active FROM users WHERE id=?').get(userId) as any;
  if (!before) return res.status(404).json({ error: 'User not found.' });
  if (!ROLE_PERMISSIONS[req.body.role || before.role]) throw bodyError('Unknown role.');
  db.prepare('UPDATE users SET role=?,assigned_studio_id=?,active=? WHERE id=?').run(req.body.role || before.role, req.body.assignedStudioId ?? before.assigned_studio_id, req.body.active ?? before.active, userId);
  const after = db.prepare('SELECT id,email,name,role,assigned_studio_id,active FROM users WHERE id=?').get(userId);
  audit({ userId: req.user!.id, action: 'update_user_access', entityType: 'user', entityId: userId, before, after, reason: req.body.reason }); res.json(after);
});
app.get('/api/audit', permission('settings'), (req, res) => res.json(db.prepare(`SELECT a.*,u.name user_name,s.name studio FROM audit_logs a LEFT JOIN users u ON u.id=a.user_id LEFT JOIN studios s ON s.id=a.studio_id ORDER BY a.id DESC LIMIT 300`).all()));
app.get('/api/settings', permission('settings'), (_req, res) => res.json({ roles: ROLE_PERMISSIONS, aiConfigured: Boolean(process.env.OPENAI_API_KEY),
  aiModel: process.env.OPENAI_API_KEY ? process.env.OPENAI_MODEL || 'gpt-4.1-mini' : null, database: 'SQLite with WAL, foreign keys and audited relational records',
  integrations: [{ name: 'OpenAI Responses API', configured: Boolean(process.env.OPENAI_API_KEY), note: 'Server-side only; structured concepts are validated and financials recalculated.' },
    { name: 'Momence / WhatsApp / CRM publishing', configured: false, note: 'Not implemented. Internal planning and exports never claim external publication.' }] }));

app.use('/api', (req, res) => res.status(404).json({ error: `API route not found: ${req.method} ${req.path}` }));
app.use((error: any, _req: any, res: any, _next: any) => {
  console.error(error);
  const status = error.status || (error instanceof multer.MulterError ? 400 : 500);
  res.status(status).json({ error: error.message || 'Unexpected server error.', code: error.code, conflicts: error.conflicts });
});
if (process.env.NODE_ENV === 'production') {
  const dist = path.resolve('dist'); app.use(express.static(dist));
  app.use((req, res, next) => req.method === 'GET' && !req.path.startsWith('/api') ? res.sendFile(path.join(dist, 'index.html')) : next());
}
app.listen(port, '0.0.0.0', () => console.log(`P57 API listening on http://0.0.0.0:${port}`));
