import crypto from 'node:crypto';
import { stringify } from 'csv-stringify/sync';
import { z } from 'zod';
import { db, audit } from '../db.js';
import { permission, canAccessStudio } from '../lib/auth.js';
import { calculateOffer, solveRevenueGoal } from '../lib/calculations.js';
import { generateConcepts, generateWithAI, randomConcept } from '../lib/offers.js';
import {
  buildCommercialOffer,
  commercialCatalog,
  getPolicy,
  policyChecks,
  validateStudioOfferPolicy,
} from '../lib/commercial.js';
import { asyncRoute, bodyError, id, studioFilter } from '../http.js';
import type { Express } from 'express';

function offerRow(body: any) {
  const structured = (value: any, fallback: any) => {
    if (value === undefined || value === null) return fallback;
    if (typeof value !== 'string') return value;
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  };
  const mechanics = structured(body.mechanics, {});
  return {
    name: String(body.name || '').trim(),
    headline: body.headline || null,
    customer_copy: body.customerCopy || body.customer_copy || null,
    internal_description: body.internalDescription || body.internal_description || null,
    rationale: body.rationale || null,
    objective: body.objective || 'revenue',
    offer_type: body.offerType || body.offer_type || mechanics.mechanism || 'percentage',
    studio_id: body.studioId || body.studio_id || null,
    month: body.month || null,
    year: body.year || null,
    audience: body.audience || null,
    excluded_audience: body.excludedAudience || body.excluded_audience || null,
    eligible_products: JSON.stringify(structured(body.eligibleProducts ?? body.eligible_products, [])),
    benefit: body.benefit || null,
    mechanics: JSON.stringify(mechanics),
    validity_start: body.validityStart || body.validity_start || null,
    validity_end: body.validityEnd || body.validity_end || null,
    redemption_conditions: body.redemptionConditions || body.redemption_conditions || null,
    target_purchases: body.targetPurchases ?? body.target_purchases ?? null,
    expected_asp: body.expectedAsp ?? body.expected_asp ?? null,
    expected_revenue: body.expectedRevenue ?? body.expected_revenue ?? null,
    effective_discount: body.effectiveDiscount ?? body.effective_discount ?? null,
    margin_impact: body.marginImpact ?? body.margin_impact ?? null,
    required_leads: body.requiredLeads ?? body.required_leads ?? null,
    required_trials: body.requiredTrials ?? body.required_trials ?? null,
    expected_conversion: body.expectedConversion ?? body.expected_conversion ?? null,
    expected_redemptions: body.expectedRedemptions ?? body.expected_redemptions ?? null,
    revenue_target: body.revenueTarget ?? body.revenue_target ?? null,
    status: body.status || 'draft',
    approval_status: body.approvalStatus || body.approval_status || 'pending',
    generation_source: body.generationSource || body.generation_source || 'manual',
    data_mode: body.dataMode || body.data_mode || 'user',
    performance_notes: body.performanceNotes || body.performance_notes || null,
    financials: JSON.stringify(structured(body.financials, {})),
    risks: JSON.stringify(structured(body.risks, [])),
    success_metrics: JSON.stringify(structured(body.successMetrics ?? body.success_metrics, [])),
    provenance: JSON.stringify(structured(body.provenance, {})),
    cta: body.cta || null,
  };
}
function validateOfferForSave(body: any, user: any) {
  const row = offerRow(body);
  if (!row.name || row.name.length < 3) throw bodyError('Offer name must contain at least 3 characters.');
  if (!row.objective) throw bodyError('Campaign objective is required.');
  if (row.studio_id && !canAccessStudio(user, row.studio_id)) throw bodyError('Studio access denied.', 403);
  if (row.month && (row.month < 1 || row.month > 12)) throw bodyError('Month must be between 1 and 12.');
  if (row.validity_start && row.validity_end && row.validity_end < row.validity_start)
    throw bodyError('Offer validity end must be on or after its start.');
  if (row.studio_id && row.mechanics !== '{}') {
    const studio = db.prepare('SELECT max_discount_percent FROM studios WHERE id=?').get(row.studio_id) as any;
    const mechanics = JSON.parse(row.mechanics);
    const eligible = JSON.parse(row.eligible_products || '[]');
    const { cap } = validateStudioOfferPolicy(row.studio_id, mechanics, eligible);
    mechanics.maxDiscountPercent = Math.min(Number(mechanics.maxDiscountPercent ?? cap), cap);
    const result = calculateOffer(mechanics);
    row.financials = JSON.stringify(result);
    row.expected_asp = result.sellingPrice;
    row.expected_revenue = result.expectedRevenue;
    row.effective_discount = result.effectiveDiscountPercent;
    row.margin_impact = result.contributionMargin;
    row.target_purchases = result.requiredBuyers;
    row.expected_redemptions = result.expectedRedemptions;
    row.risks = JSON.stringify([...new Set([...JSON.parse(row.risks), ...result.errors, ...result.warnings])]);
    if (result.errors.length && !['draft', 'rejected'].includes(row.status))
      throw bodyError(`Offer guardrails failed: ${result.errors.join(' ')}`, 422);
  }
  const financials = typeof row.financials === 'string' ? JSON.parse(row.financials || '{}') : row.financials || {};
  if (
    financials.expectedRevenue != null && row.expected_revenue != null &&
    Math.abs(Number(row.expected_revenue) - Number(financials.expectedRevenue)) >
      Math.max(2, Math.abs(Number(financials.expectedRevenue)) * 0.0001)
  )
    throw bodyError('Expected revenue does not match the saved offer financial model.', 422);
  if (
    ['approved', 'active', 'completed'].includes(row.status) ||
    row.approval_status === 'approved'
  ) {
    if (!user.permissions.includes('offer_approve')) throw bodyError('Offer approval permission required.', 403);
    if (row.expected_asp == null || row.expected_revenue == null)
      throw bodyError('A price and expected revenue forecast are required before approval.', 422);
  }
  return row;
}
export function persistOffer(body: any, user: any) {
  if (
    ['approved', 'active', 'completed'].includes(body.status) ||
    body.approvalStatus === 'approved' || body.approval_status === 'approved'
  )
    throw bodyError('New offers must be saved as drafts; use the approval action after review.', 422);
  const row = validateOfferForSave(body, user);
  // 2027 offers are saved to the location's offer bank; a month uses them only once its plan picks them.
  if (Number(row.year) === 2027) row.month = null;
  const uid = `P57-${new Date().getFullYear()}-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
  const columns = Object.keys(row),
    values = Object.values(row);
  const result = db
    .prepare(`INSERT INTO offers(offer_uid,created_by,${columns.join(',')}) VALUES (?,?${',?'.repeat(columns.length)})`)
    .run(uid, user.id, ...values);
  const offer = db.prepare('SELECT * FROM offers WHERE id=?').get(result.lastInsertRowid) as any;
  db.prepare('INSERT INTO offer_versions(offer_id,version,snapshot,changed_by) VALUES (?,?,?,?)').run(
    offer.id,
    1,
    JSON.stringify(offer),
    user.id,
  );
  audit({
    userId: user.id,
    action: 'create',
    entityType: 'offer',
    entityId: offer.id,
    studioId: offer.studio_id,
    after: offer,
  });
  return offer;
}
export default function registerOffersRoutes(app: Express) {
  app.get('/api/commercial/catalog', (req, res) => {
    const studioId = studioFilter(req, id(req.query.studioId));
    res.json({ ...commercialCatalog(studioId), checks: policyChecks(studioId) });
  });
  const policyUpdateSchema = z
    .object({
      formats: z.array(z.string().trim().min(1).max(40)).max(6),
      pricing_zone: z.string().trim().max(80),
      trial_journey: z.record(z.string(), z.string().max(160)),
      intro_product_id: z.number().int().positive().nullable(),
      newcomer_product_id: z.number().int().positive().nullable(),
      single_class_product_id: z.number().int().positive().nullable(),
      private_product_id: z.number().int().positive().nullable(),
      virtual_private_product_id: z.number().int().positive().nullable(),
      retail_product_id: z.number().int().positive().nullable(),
      newcomer_max_discount_percent: z.number().min(0).max(50),
      first_membership_discount: z.number().min(0).max(100),
      lapsed_return_discount: z.number().min(0).max(100),
      class_pack_discount: z.number().min(0).max(100),
      annual_discount: z.number().min(0).max(100),
      six_month_discount: z.number().min(0).max(100),
      annual_perks: z.record(z.string(), z.number().finite().nonnegative()),
      newcomer_lifetime_limit: z.number().int().min(1).max(100).nullable(),
      default_stacking_rule: z.enum(['not_stackable', 'benefits_only', 'full']),
      notes: z.string().max(2000).nullable(),
      reason: z.string().max(1000),
    })
    .partial();
  app.put('/api/commercial/policy/:studioId', permission('settings'), (req, res) => {
    const studioId = studioFilter(req, id(req.params.studioId)),
      before = getPolicy(studioId),
      input = policyUpdateSchema.parse(req.body);
    const studio = db.prepare('SELECT * FROM studios WHERE id=?').get(studioId) as any;
    if (input.formats && studio.city === 'Bengaluru' && input.formats.some(format => format.toLowerCase() !== 'barre'))
      throw bodyError('Bengaluru currently supports Barre only in the studio journey.', 422);
    const merged = { ...before, ...input, annual_perks: { ...before.annual_perks, ...(input.annual_perks || {}) } };
    if (
      Object.keys(merged.trial_journey || {}).some(
        format => !merged.formats.map((f: string) => f.toLowerCase()).includes(format.toLowerCase()),
      )
    )
      throw bodyError('Remove or reassign trial journeys for formats that are no longer enabled.', 422);
    if (['Kemps Corner', 'Bandra'].includes(studio.name)) {
      for (const format of ['strength', 'powercycle'])
        if (merged.trial_journey[format] && merged.trial_journey[format] !== 'newcomers_2_for_1')
          throw bodyError(`${format} trials at ${studio.name} require Newcomers 2-for-1.`, 422);
    }
    if (
      studio.name === 'Kenkere House' &&
      merged.trial_journey.barre !== 'new_client_intro_pack_50_percent_or_newcomers_2_for_1'
    )
      throw bodyError('Kenkere Barre must retain the 50% intro pack or once-lifetime Newcomers 2-for-1 journey.', 422);
    if (['Copper + Cloves', 'Plash Pilates'].includes(studio.name) && merged.trial_journey.barre !== 'paid_trial')
      throw bodyError(`${studio.name} uses a paid-trial journey.`, 422);
    if (studio.name === 'Kenkere House' && merged.newcomer_lifetime_limit !== 1)
      throw bodyError('Kenkere Newcomers 2-for-1 remains limited to once per customer lifetime.', 422);
    for (const key of [
      'intro_product_id',
      'newcomer_product_id',
      'single_class_product_id',
      'private_product_id',
      'virtual_private_product_id',
      'retail_product_id',
    ])
      if ((input as any)[key]) {
        const product = db.prepare('SELECT * FROM products WHERE id=? AND active=1').get((input as any)[key]) as any;
        if (!product) throw bodyError(`Configured ${key} does not reference an active product.`, 422);
        if (product.studio_id !== studioId && !String(input.notes ?? before.notes ?? '').trim())
          throw bodyError('A hosted-catalogue product requires an explicit provenance note.', 422);
      }
    db.prepare(
      `UPDATE studio_offer_policies SET formats=?,pricing_zone=?,trial_journey=?,intro_product_id=?,newcomer_product_id=?,single_class_product_id=?,private_product_id=?,virtual_private_product_id=?,retail_product_id=?,
    newcomer_max_discount_percent=?,first_membership_discount=?,lapsed_return_discount=?,class_pack_discount=?,annual_discount=?,six_month_discount=?,annual_perks=?,newcomer_lifetime_limit=?,default_stacking_rule=?,notes=?,updated_by=?,updated_at=CURRENT_TIMESTAMP WHERE studio_id=?`,
    ).run(
      JSON.stringify(merged.formats),
      merged.pricing_zone,
      JSON.stringify(merged.trial_journey),
      merged.intro_product_id,
      merged.newcomer_product_id,
      merged.single_class_product_id,
      merged.private_product_id,
      merged.virtual_private_product_id,
      merged.retail_product_id,
      merged.newcomer_max_discount_percent,
      merged.first_membership_discount,
      merged.lapsed_return_discount,
      merged.class_pack_discount,
      merged.annual_discount,
      merged.six_month_discount,
      JSON.stringify(merged.annual_perks),
      merged.newcomer_lifetime_limit,
      merged.default_stacking_rule,
      merged.notes,
      req.user!.id,
      studioId,
    );
    audit({
      userId: req.user!.id,
      action: 'update_offer_policy',
      entityType: 'studio_offer_policy',
      entityId: studioId,
      studioId,
      before,
      after: merged,
      reason: input.reason,
    });
    res.json({ ...commercialCatalog(studioId), checks: policyChecks(studioId) });
  });
  app.post('/api/commercial/generate', permission('offer_create'), (req, res) => {
    const studioId = studioFilter(req, id(req.body.studioId));
    const kinds = [
      'newcomer_2_for_1',
      'newcomer_3_for_2',
      'intro_pack',
      'paid_trial',
      'free_trial',
      'first_membership',
      'lapsed_return',
      'class_pack',
      'annual',
      'six_month',
      'student',
      'custom',
    ];
    if (!kinds.includes(req.body.kind)) throw bodyError('Unsupported commercial offer policy.');
    const concept = buildCommercialOffer({ ...req.body, studioId });
    if (req.body.saveDraft === false) return res.json({ concept, savedOffer: null });
    const savedOffer = persistOffer({ ...concept, generationSource: 'policy_engine', dataMode: 'scenario' }, req.user);
    res.status(201).json({ concept, savedOffer });
  });
  function experimentView(row: any) {
    const results = JSON.parse(row.results || '{}');
    const control = results.control,
      variant = results.variant;
    let comparison = null;
    if (control?.eligible > 0 && variant?.eligible > 0) {
      const controlRate = Number(control.buyers || 0) / control.eligible,
        variantRate = Number(variant.buyers || 0) / variant.eligible;
      comparison = {
        controlPurchaseRate: controlRate,
        variantPurchaseRate: variantRate,
        absoluteRateDifference: variantRate - controlRate,
        controlRevenuePerEligible: Number(control.revenue || 0) / control.eligible,
        variantRevenuePerEligible: Number(variant.revenue || 0) / variant.eligible,
        interpretation:
          'Observed arm difference only. Causal lift requires valid randomisation, adequate sample, and consistent execution.',
      };
    }
    return { ...row, results, comparison };
  }
  app.get('/api/experiments', (req, res) => {
    const studioId = studioFilter(req, req.query.studio ? id(req.query.studio) : undefined);
    const rows = db
      .prepare(
        `SELECT e.*,s.name studio,c.name control_name,c.offer_uid control_uid,v.name variant_name,v.offer_uid variant_uid,u.name created_by_name
    FROM offer_experiments e JOIN studios s ON s.id=e.studio_id JOIN offers c ON c.id=e.control_offer_id JOIN offers v ON v.id=e.variant_offer_id LEFT JOIN users u ON u.id=e.created_by
    ${studioId ? 'WHERE e.studio_id=?' : ''} ORDER BY e.updated_at DESC`,
      )
      .all(...(studioId ? [studioId] : [])) as any[];
    res.json({ rows: rows.map(experimentView) });
  });
  app.post('/api/experiments/newcomer', permission('offer_create'), (req, res) => {
    const studioId = studioFilter(req, id(req.body.studioId)),
      startDate = String(req.body.startDate || ''),
      endDate = String(req.body.endDate || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate) || endDate < startDate)
      throw bodyError('Experiment dates are invalid.');
    const year = Number(startDate.slice(0, 4)),
      month = Number(startDate.slice(5, 7)),
      minimumSample = Number(req.body.minimumSample || 30);
    if (!Number.isInteger(minimumSample) || minimumSample < 1)
      throw bodyError('Minimum sample must be a positive integer.');
    const hypothesis = String(req.body.hypothesis || '').trim();
    if (hypothesis.length < 10) throw bodyError('A meaningful experiment hypothesis is required.');
    const control = buildCommercialOffer({
      studioId,
      kind: 'newcomer_2_for_1',
      year,
      month,
      name: '2-for-1 · Experiment Control',
    });
    const variant = buildCommercialOffer({
      studioId,
      kind: 'newcomer_3_for_2',
      year,
      month,
      name: '3-for-2 · Monthly Alternative',
    });
    const create = db.transaction(() => {
      const controlOffer = persistOffer(
        { ...control, generationSource: 'policy_engine', dataMode: 'scenario' },
        req.user,
      );
      const variantOffer = persistOffer(
        { ...variant, generationSource: 'policy_engine', dataMode: 'scenario' },
        req.user,
      );
      const result = db
        .prepare(
          `INSERT INTO offer_experiments(studio_id,name,hypothesis,control_offer_id,variant_offer_id,start_date,end_date,cadence,status,minimum_sample,results,created_by)
      VALUES (?,?,?,?,?,?,?,'monthly','draft',?,?,?)`,
        )
        .run(
          studioId,
          'Monthly Newcomer Value Test',
          hypothesis,
          controlOffer.id,
          variantOffer.id,
          startDate,
          endDate,
          minimumSample,
          JSON.stringify({ source: 'not_recorded', note: 'No experiment outcomes recorded.' }),
          req.user!.id,
        );
      audit({
        userId: req.user!.id,
        action: 'create_atomic_newcomer_test',
        entityType: 'offer_experiment',
        entityId: result.lastInsertRowid,
        studioId,
        after: { controlOfferId: controlOffer.id, variantOfferId: variantOffer.id, startDate, endDate },
      });
      return { experimentId: Number(result.lastInsertRowid), controlOffer, variantOffer };
    });
    res.status(201).json(create());
  });
  app.post('/api/experiments', permission('offer_create'), (req, res) => {
    const studioId = studioFilter(req, id(req.body.studioId)),
      controlId = id(req.body.controlOfferId),
      variantId = id(req.body.variantOfferId);
    if (controlId === variantId) throw bodyError('Control and variant must be different offers.');
    const offers = db.prepare('SELECT * FROM offers WHERE id IN (?,?)').all(controlId, variantId) as any[];
    if (offers.length !== 2 || offers.some(offer => offer.studio_id !== studioId))
      throw bodyError('Both experiment offers must belong to the selected studio.', 422);
    const startDate = String(req.body.startDate || ''),
      endDate = req.body.endDate ? String(req.body.endDate) : null;
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(startDate) ||
      (endDate && !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) ||
      (endDate && endDate < startDate)
    )
      throw bodyError('Experiment dates are invalid.');
    const name = String(req.body.name || '').trim(),
      hypothesis = String(req.body.hypothesis || '').trim();
    if (name.length < 3 || hypothesis.length < 10)
      throw bodyError('Experiment name and a meaningful hypothesis are required.');
    const minimumSample = Number(req.body.minimumSample || 30);
    if (!Number.isInteger(minimumSample) || minimumSample < 1)
      throw bodyError('Minimum sample must be a positive integer.');
    const result = db
      .prepare(
        `INSERT INTO offer_experiments(studio_id,name,hypothesis,control_offer_id,variant_offer_id,start_date,end_date,cadence,status,minimum_sample,results,created_by)
    VALUES (?,?,?,?,?,?,?,?,'draft',?,?,?)`,
      )
      .run(
        studioId,
        name,
        hypothesis,
        controlId,
        variantId,
        startDate,
        endDate,
        req.body.cadence === 'once' ? 'once' : 'monthly',
        minimumSample,
        JSON.stringify({ source: 'not_recorded', note: 'No experiment outcomes recorded.' }),
        req.user!.id,
      );
    audit({
      userId: req.user!.id,
      action: 'create',
      entityType: 'offer_experiment',
      entityId: result.lastInsertRowid,
      studioId,
      after: req.body,
    });
    res.status(201).json(db.prepare('SELECT * FROM offer_experiments WHERE id=?').get(result.lastInsertRowid));
  });
  const experimentArm = z
    .object({
      eligible: z.number().nonnegative(),
      buyers: z.number().nonnegative(),
      revenue: z.number().nonnegative(),
      attended: z.number().nonnegative().optional(),
      benefitCost: z.number().nonnegative().optional(),
    })
    .passthrough()
    .refine(arm => arm.buyers <= arm.eligible, { message: 'Buyers cannot exceed eligible assignments.' });
  app.patch('/api/experiments/:id', permission('offer_edit'), (req, res) => {
    const experimentId = id(req.params.id),
      before = db.prepare('SELECT * FROM offer_experiments WHERE id=?').get(experimentId) as any;
    if (!before || !canAccessStudio(req.user!, before.studio_id))
      return res.status(404).json({ error: 'Experiment not found.' });
    const status = req.body.status ?? before.status;
    if (!['draft', 'running', 'paused', 'completed'].includes(status)) throw bodyError('Invalid experiment status.');
    let results = req.body.results === undefined ? JSON.parse(before.results || '{}') : req.body.results;
    if (!results || typeof results !== 'object' || Array.isArray(results) || JSON.stringify(results).length > 20000)
      throw bodyError('Experiment results must be a compact aggregate object.');
    if (results.control || results.variant) {
      const parsed = z
        .object({ control: experimentArm, variant: experimentArm, source: z.string().min(3).max(300) })
        .passthrough()
        .safeParse(results);
      if (!parsed.success)
        throw bodyError(
          'Both result arms require eligible, buyers and revenue, plus an explicit aggregate data source.',
          422,
        );
    }
    if (status === 'completed' && (!results.control || !results.variant))
      throw bodyError('Cannot complete an experiment without aggregate results for both arms.', 422);
    if (
      status === 'completed' &&
      (results.control.eligible < before.minimum_sample || results.variant.eligible < before.minimum_sample)
    )
      throw bodyError(`Each arm needs at least ${before.minimum_sample} eligible assignments before completion.`, 422);
    db.prepare('UPDATE offer_experiments SET status=?,results=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').run(
      status,
      JSON.stringify(results),
      experimentId,
    );
    const after = db.prepare('SELECT * FROM offer_experiments WHERE id=?').get(experimentId);
    audit({
      userId: req.user!.id,
      action: 'update',
      entityType: 'offer_experiment',
      entityId: experimentId,
      studioId: before.studio_id,
      before,
      after,
      reason: req.body.reason,
    });
    res.json(experimentView(after));
  });
  app.get('/api/offers', (req, res) => {
    const clauses = ['1=1'],
      params: any[] = [];
    if (req.query.includeDemo !== 'true') clauses.push("COALESCE(o.data_mode,'')!='demo' AND COALESCE(o.generation_source,'')!='demo_seed'");
    // Archived offers leave every list unless a caller asks for them by status — otherwise a
    // replaced plan keeps turning up in the bank it was replaced in.
    if (!req.query.status) clauses.push("COALESCE(o.status,'')!='archived'");
    const studioId = studioFilter(req, req.query.studio ? id(req.query.studio) : undefined);
    if (studioId) {
      clauses.push('(o.studio_id=? OR o.studio_id IS NULL)');
      params.push(studioId);
    }
    for (const [query, column] of [
      ['status', 'o.status'],
      ['objective', 'o.objective'],
      ['offerType', 'o.offer_type'],
      ['approval', 'o.approval_status'],
    ] as const) {
      if (req.query[query]) {
        clauses.push(`${column}=?`);
        params.push(req.query[query]);
      }
    }
    if (req.query.year) {
      clauses.push('o.year=?');
      params.push(Number(req.query.year));
    }
    // The offer bank: a year's offers not tied to a month (month copies live on the month plans).
    if (req.query.bank) clauses.push('o.month IS NULL');
    if (req.query.month) {
      clauses.push('o.month=?');
      params.push(Number(req.query.month));
    }
    if (req.query.city) {
      clauses.push('s.city=?');
      params.push(req.query.city);
    }
    if (req.query.minDiscount) {
      clauses.push('o.effective_discount>=?');
      params.push(Number(req.query.minDiscount));
    }
    if (req.query.maxDiscount) {
      clauses.push('o.effective_discount<=?');
      params.push(Number(req.query.maxDiscount));
    }
    const q = String(req.query.q || '').trim();
    if (q) {
      const naturalLanguage = q.trim().split(/\s+/).length > 4;
      const semanticFilters =
        /performed well|best|highest revenue|lapsed|comeback|reactivat|mumbai|below|under|less than|discount/i.test(q);
      if (!naturalLanguage || !semanticFilters) {
        clauses.push(
          '(o.name LIKE ? OR o.headline LIKE ? OR o.customer_copy LIKE ? OR o.internal_description LIKE ? OR o.audience LIKE ? OR o.source_campaign LIKE ?)',
        );
        const like = `%${q}%`;
        params.push(like, like, like, like, like, like);
      }
      if (/lapsed|comeback|reactivat/i.test(q)) {
        clauses.push(
          `(o.objective='reactivation' OR o.audience LIKE '%lapsed%' OR o.name LIKE '%laps%' OR o.name LIKE '%comeback%')`,
        );
      }
      if (/performed well|best|highest revenue/i.test(q)) clauses.push('o.actual_revenue>0');
      const discount = q.match(/(?:below|under|less than|<)\s*(\d+)%/i);
      if (discount) {
        clauses.push('o.effective_discount<?');
        params.push(Number(discount[1]));
      }
      if (/mumbai/i.test(q)) {
        clauses.push(`s.city='Mumbai'`);
      }
    }
    if (req.query.performance === 'proven') clauses.push('o.actual_revenue>0');
    if (req.query.performance === 'poor') clauses.push('o.actual_redemptions>=5 AND o.effective_discount>15');
    const where = clauses.join(' AND '),
      page = Math.max(1, Number(req.query.page || 1)),
      limit = Math.min(100, Math.max(1, Number(req.query.limit || 50)));
    const total = Number(
      (
        db
          .prepare(`SELECT COUNT(*) n FROM offers o LEFT JOIN studios s ON s.id=o.studio_id WHERE ${where}`)
          .get(...params) as any
      ).n,
    );
    const rows = db
      .prepare(
        `SELECT o.*,s.name studio,s.city,u.name created_by_name FROM offers o LEFT JOIN studios s ON s.id=o.studio_id LEFT JOIN users u ON u.id=o.created_by
    WHERE ${where} ORDER BY o.updated_at DESC,o.id DESC LIMIT ? OFFSET ?`,
      )
      .all(...params, limit, (page - 1) * limit) as any[];
    res.json({
      rows: rows.map(o => ({
        ...o,
        mechanics: JSON.parse(o.mechanics || '{}'),
        financials: JSON.parse(o.financials || '{}'),
        risks: JSON.parse(o.risks || '[]'),
        provenance: JSON.parse(o.provenance || '{}'),
      })),
      total,
      page,
      limit,
    });
  });
  app.get('/api/offers/:id', (req, res) => {
    const offer = db
      .prepare('SELECT o.*,s.name studio,s.city FROM offers o LEFT JOIN studios s ON s.id=o.studio_id WHERE o.id=?')
      .get(id(req.params.id)) as any;
    if (!offer || (offer.studio_id && !canAccessStudio(req.user!, offer.studio_id)))
      return res.status(404).json({ error: 'Offer not found.' });
    const versions = db
      .prepare(
        'SELECT v.id,v.version,v.changed_at,u.name changed_by FROM offer_versions v LEFT JOIN users u ON u.id=v.changed_by WHERE offer_id=? ORDER BY version DESC',
      )
      .all(offer.id);
    const clones = db
      .prepare('SELECT id,name,studio_id,month,year,status FROM offers WHERE original_offer_id=?')
      .all(offer.id);
    res.json({
      ...offer,
      mechanics: JSON.parse(offer.mechanics || '{}'),
      financials: JSON.parse(offer.financials || '{}'),
      risks: JSON.parse(offer.risks || '[]'),
      provenance: JSON.parse(offer.provenance || '{}'),
      versions,
      clones,
    });
  });
  app.post('/api/offers', permission('offer_create'), (req, res) => {
    res.status(201).json(persistOffer(req.body, req.user));
  });
  app.patch('/api/offers/:id', permission('offer_edit'), (req, res) => {
    const offerId = id(req.params.id),
      before = db.prepare('SELECT * FROM offers WHERE id=?').get(offerId) as any;
    if (!before || (before.studio_id && !canAccessStudio(req.user!, before.studio_id)))
      return res.status(404).json({ error: 'Offer not found.' });
    if (['approved', 'active', 'completed'].includes(before.status) && !req.user!.permissions.includes('offer_approve'))
      return res
        .status(403)
        .json({
          error: 'Approved offer mechanics are locked for your role. Duplicate the offer to create a variation.',
        });
    if (
      ['approved', 'active', 'completed'].includes(req.body.status) &&
      req.body.status !== before.status
    )
      throw bodyError('Use the offer approval action to approve or activate an offer.', 422);
    const requestedApproval = req.body.approvalStatus ?? req.body.approval_status;
    if (requestedApproval !== undefined && requestedApproval !== before.approval_status)
      throw bodyError('Use the offer approval action to change approval status.', 422);
    const merged = {
      ...before,
      ...req.body,
      studioId: req.body.studioId ?? before.studio_id,
      customerCopy: req.body.customerCopy ?? before.customer_copy,
      internalDescription: req.body.internalDescription ?? before.internal_description,
      generationSource: before.generation_source,
      dataMode: before.data_mode,
    };
    const row = validateOfferForSave(merged, req.user);
    const columns = Object.keys(row);
    db.prepare(
      `UPDATE offers SET ${columns.map(c => `${c}=?`).join(',')},version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id=?`,
    ).run(...Object.values(row), offerId);
    const after = db.prepare('SELECT * FROM offers WHERE id=?').get(offerId) as any;
    db.prepare('INSERT INTO offer_versions(offer_id,version,snapshot,changed_by) VALUES (?,?,?,?)').run(
      offerId,
      after.version,
      JSON.stringify(after),
      req.user!.id,
    );
    audit({
      userId: req.user!.id,
      action: 'update',
      entityType: 'offer',
      entityId: offerId,
      studioId: after.studio_id,
      before,
      after,
      reason: req.body.reason,
    });
    res.json(after);
  });
  app.post('/api/offers/:id/action', (req, res) => {
    const offerId = id(req.params.id),
      before = db
        .prepare('SELECT o.*,s.max_discount_percent FROM offers o LEFT JOIN studios s ON s.id=o.studio_id WHERE o.id=?')
        .get(offerId) as any;
    if (!before || (before.studio_id && !canAccessStudio(req.user!, before.studio_id)))
      return res.status(404).json({ error: 'Offer not found.' });
    const action = req.body.action;
    if (['approve', 'reject'].includes(action)) {
      if (!req.user!.permissions.includes('offer_approve'))
        return res.status(403).json({ error: 'Offer approval permission required.' });
      const financials = JSON.parse(before.financials || '{}');
      if (action === 'approve' && financials.errors?.length)
        return res.status(422).json({ error: 'Resolve financial guardrail errors before approval.' });
      if (action === 'approve' && (before.expected_asp == null || before.expected_revenue == null))
        return res.status(422).json({ error: 'A price and expected revenue forecast are required before approval.' });
      if (
        action === 'approve' && financials.expectedRevenue != null &&
        Math.abs(Number(before.expected_revenue) - Number(financials.expectedRevenue)) >
          Math.max(2, Math.abs(Number(financials.expectedRevenue)) * 0.0001)
      )
        return res.status(422).json({ error: 'Reconcile the stored revenue forecast with its financial model before approval.' });
      db.prepare('UPDATE offers SET status=?,approval_status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').run(
        action === 'approve' ? 'approved' : 'rejected',
        action === 'approve' ? 'approved' : 'rejected',
        offerId,
      );
    } else if (action === 'unapprove') {
      if (!req.user!.permissions.includes('offer_approve'))
        return res.status(403).json({ error: 'Offer approval permission required.' });
      db.prepare("UPDATE offers SET status='draft',approval_status='pending',updated_at=CURRENT_TIMESTAMP WHERE id=?").run(offerId);
    } else if (['archive', 'pause', 'activate', 'schedule', 'under_review'].includes(action)) {
      if (['archive', 'pause', 'schedule'].includes(action) && !req.user!.permissions.includes('offer_edit'))
        return res.status(403).json({ error: 'Offer edit permission required.' });
      if (
        action === 'activate' &&
        (!req.user!.permissions.includes('offer_approve') || before.approval_status !== 'approved')
      )
        return res.status(403).json({ error: 'An authorised approver must approve the offer before activation.' });
      const status = (
        {
          archive: 'archived',
          pause: 'paused',
          activate: 'active',
          schedule: 'scheduled',
          under_review: 'under_review',
        } as any
      )[action];
      db.prepare('UPDATE offers SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').run(status, offerId);
    } else if (action === 'clone' || action === 'duplicate') {
      if (!req.user!.permissions.includes('offer_create'))
        return res.status(403).json({ error: 'Offer creation permission required.' });
      const targetStudio = Number(req.body.studioId || before.studio_id);
      if (!canAccessStudio(req.user!, targetStudio)) return res.status(403).json({ error: 'Studio access denied.' });
      const studio = db.prepare('SELECT * FROM studios WHERE id=?').get(targetStudio) as any;
      const oldProducts = JSON.parse(before.eligible_products || '[]');
      let newProducts = oldProducts,
        mechanics = JSON.parse(before.mechanics || '{}');
      if (targetStudio !== before.studio_id) {
        const oldProduct = db.prepare('SELECT name FROM products WHERE id=?').get(oldProducts[0]) as any;
        const product = oldProduct
          ? (db
              .prepare('SELECT * FROM products WHERE studio_id=? AND name=? AND list_price>0')
              .get(targetStudio, oldProduct.name) as any)
          : (db
              .prepare('SELECT * FROM products WHERE studio_id=? AND list_price>0 ORDER BY list_price DESC LIMIT 1')
              .get(targetStudio) as any);
        if (!product)
          return res
            .status(422)
            .json({
              error: 'No compatible priced product exists at the destination studio. Add a product before cloning.',
            });
        newProducts = [product.id];
        mechanics.listedPrice = product.list_price;
      }
      const { cap } = validateStudioOfferPolicy(targetStudio, mechanics, newProducts);
      mechanics.maxDiscountPercent = Math.min(Number(mechanics.maxDiscountPercent ?? cap), cap);
      const financials = calculateOffer(mechanics);
      if (financials.errors.length)
        return res
          .status(422)
          .json({ error: `Clone is not valid at the destination studio: ${financials.errors.join(' ')}` });
      const payload = {
        ...before,
        name: req.body.name || `${before.name} · ${targetStudio !== before.studio_id ? studio.name : 'variation'}`,
        studioId: targetStudio,
        month: req.body.month || before.month,
        year: req.body.year || before.year,
        eligibleProducts: newProducts,
        mechanics,
        status: 'draft',
        approvalStatus: 'pending',
        financials,
        expectedAsp: financials.sellingPrice,
        expectedRevenue: financials.expectedRevenue,
        effectiveDiscount: financials.effectiveDiscountPercent,
        generationSource: before.generation_source,
        dataMode: 'user',
      };
      const row = validateOfferForSave(payload, req.user);
      if (Number(row.year) === 2027) row.month = null; // clones land in the destination's offer bank
      const columns = Object.keys(row);
      const result = db
        .prepare(
          `INSERT INTO offers(offer_uid,created_by,original_offer_id,${columns.join(',')}) VALUES (?,?,?${',?'.repeat(columns.length)})`,
        )
        .run(
          `P57-CLONE-${crypto.randomBytes(5).toString('hex').toUpperCase()}`,
          req.user!.id,
          offerId,
          ...Object.values(row),
        );
      audit({
        userId: req.user!.id,
        action: 'clone',
        entityType: 'offer',
        entityId: result.lastInsertRowid,
        studioId: targetStudio,
        before: { original: offerId },
        after: payload,
      });
      return res.status(201).json(db.prepare('SELECT * FROM offers WHERE id=?').get(result.lastInsertRowid));
    } else return res.status(400).json({ error: 'Unsupported offer action.' });
    const after = db.prepare('SELECT * FROM offers WHERE id=?').get(offerId);
    audit({
      userId: req.user!.id,
      action,
      entityType: 'offer',
      entityId: offerId,
      studioId: before.studio_id,
      before,
      after,
      reason: req.body.reason,
    });
    res.json(after);
  });
  app.post('/api/offers/simulate', (req, res) => {
    const input = { ...req.body },
      policyErrors: string[] = [];
    if (req.body.studioId) {
      try {
        const { cap } = validateStudioOfferPolicy(Number(req.body.studioId), input, req.body.eligibleProductIds || []);
        input.maxDiscountPercent = Math.min(Number(input.maxDiscountPercent ?? cap), cap);
      } catch (error: any) {
        policyErrors.push(error.message);
      }
    }
    const result = calculateOffer(input);
    result.errors = [...policyErrors, ...result.errors];
    res.json(result);
  });
  app.post(
    '/api/offers/generate',
    permission('offer_create'),
    asyncRoute(async (req: any, res: any) => {
      const studioId = studioFilter(req, id(req.body.studioId));
      const benefitPicks = z.array(z.enum([
        'bonus_class','guest_pass','private_session','freeze_extension','trainer_consult','hosted_class','virtual_private','retail_addon',
      ])).max(8).parse(req.body.benefitPicks ?? []);
      const request = { ...req.body, studioId, benefitPicks };
      const result = request.source === 'ai' ? await generateWithAI(request) : generateConcepts(request);
      res.json(result);
    }),
  );
  app.post('/api/offers/random', permission('offer_create'), (req, res) => {
    const studioId = studioFilter(req, id(req.body.studioId));
    const benefitPicks = z.array(z.enum([
      'bonus_class','guest_pass','private_session','freeze_extension','trainer_consult','hosted_class','virtual_private','retail_addon',
    ])).max(8).parse(req.body.benefitPicks ?? []);
    const concept = randomConcept({ ...req.body, studioId, benefitPicks });
    db.prepare('INSERT INTO generation_history(fingerprint,offer_payload,user_id) VALUES (?,?,?)').run(
      concept.fingerprint,
      JSON.stringify(concept),
      req.user!.id,
    );
    res.json(concept);
  });
  app.post('/api/goals/solve', permission('offer_create'), (req, res) => {
    const studioId = studioFilter(req, id(req.body.studioId));
    const solution = solveRevenueGoal(Number(req.body.target), Number(req.body.actual), req.body.streams || []);
    const concepts = generateConcepts({ ...req.body, studioId, targetRevenue: solution.gap, count: 3 });
    res.json({
      ...solution,
      primary: concepts.offers.find(o => o.recommended),
      fallback: concepts.offers.find(o => !o.recommended),
      interventions:
        solution.uncoveredGap > 0
          ? [
              'Do not assign the entire uncovered gap to one discount campaign.',
              'Review lead quality, trial attendance and follow-up capacity.',
              'Renew management forecast and document any unachievable residual gap.',
            ]
          : [],
      assumptions:
        'Stream potential = eligible audience × conversion assumption × average spend. Contributions are capped at feasible stream potential and the remaining gap.',
    });
  });
}
