import { stringify } from 'csv-stringify/sync';
import { db, audit } from '../db.js';
import { permission, canAccessStudio } from '../lib/auth.js';
import { recalculateSegments } from '../lib/segments.js';
import { bodyError, id, studioFilter } from '../http.js';
import type { Express } from 'express';

export default function registerCampaignsRoutes(app: Express) {
  function campaignConflicts(body: any, excludeId?: number) {
    return db
      .prepare(
        `SELECT c.id,c.name,c.start_date,c.end_date,c.audience,o.name offer_name,o.benefit FROM campaigns c LEFT JOIN offers o ON o.id=c.offer_id
    WHERE c.studio_id=? AND c.data_mode!='demo' AND c.status NOT IN ('archived','rejected') AND c.start_date<=? AND c.end_date>=? ${excludeId ? 'AND c.id!=?' : ''}
    AND (LOWER(COALESCE(c.audience,''))=LOWER(COALESCE(?,'')) OR COALESCE(c.audience,'')='' OR COALESCE(?,'')='')`,
      )
      .all(
        ...[
          body.studioId,
          body.endDate,
          body.startDate,
          ...(excludeId ? [excludeId] : []),
          body.audience || '',
          body.audience || '',
        ],
      );
  }
  app.get('/api/campaigns', (req, res) => {
    const year = Number(req.query.year || 2027),
      studioId = studioFilter(req, req.query.studio ? id(req.query.studio) : undefined);
    const rows = db
      .prepare(
        `SELECT c.*,s.name studio,o.name offer_name,o.benefit,o.approval_status offer_approval,u.name owner,
    p.revenue actual_revenue,p.redemptions,p.buyers,p.customers_reached,p.effective_discount FROM campaigns c JOIN studios s ON s.id=c.studio_id
    LEFT JOIN offers o ON o.id=c.offer_id LEFT JOIN users u ON u.id=c.owner_id LEFT JOIN campaign_performance p ON p.campaign_id=c.id
    WHERE c.year=? AND c.data_mode!='demo' ${studioId ? 'AND c.studio_id=?' : ''} ${req.query.month ? 'AND CAST(substr(c.start_date,6,2) AS INTEGER)=?' : ''} ORDER BY c.start_date`,
      )
      .all(...[year, ...(studioId ? [studioId] : []), ...(req.query.month ? [Number(req.query.month)] : [])]) as any[];
    const withWarnings = rows.map(c => ({
      ...c,
      tasks: JSON.parse(c.tasks || '[]'),
      conflicts: campaignConflicts(c, c.id),
    }));
    res.json({ rows: withWarnings });
  });
  app.post('/api/campaigns', permission('campaign_edit'), (req, res) => {
    const b = req.body,
      studioId = studioFilter(req, id(b.studioId));
    if (!b.name || !b.startDate || !b.endDate || b.endDate < b.startDate)
      throw bodyError('Valid campaign name and start/end dates are required.');
    const conflicts = campaignConflicts({ ...b, studioId });
    if (conflicts.length && !b.force)
      return res.status(409).json({ error: 'Potential audience and offer overlap detected.', conflicts });
    const result = db
      .prepare(
        `INSERT INTO campaigns(name,studio_id,offer_id,year,start_date,end_date,audience,objective,target_revenue,expected_purchases,status,approval_status,owner_id,tasks,data_mode,notes,created_by)
    VALUES (?,?,?,?,?,?,?,?,?,?, 'draft','pending',?,?,?,?,?)`,
      )
      .run(
        b.name,
        studioId,
        b.offerId || null,
        Number(b.year || b.startDate.slice(0, 4)),
        b.startDate,
        b.endDate,
        b.audience || '',
        b.objective || '',
        Number(b.targetRevenue || 0),
        b.expectedPurchases || null,
        b.ownerId || req.user!.id,
        JSON.stringify(b.tasks || []),
        b.dataMode || 'user',
        b.notes || null,
        req.user!.id,
      );
    audit({
      userId: req.user!.id,
      action: 'create',
      entityType: 'campaign',
      entityId: result.lastInsertRowid,
      studioId,
      after: { ...b, conflictsOverridden: conflicts.length && b.force },
    });
    res.status(201).json(db.prepare('SELECT * FROM campaigns WHERE id=?').get(result.lastInsertRowid));
  });
  app.patch('/api/campaigns/:id', permission('campaign_edit'), (req, res) => {
    const campaignId = id(req.params.id),
      before = db.prepare('SELECT * FROM campaigns WHERE id=?').get(campaignId) as any;
    if (!before || !canAccessStudio(req.user!, before.studio_id))
      return res.status(404).json({ error: 'Campaign not found.' });
    const b = {
      ...before,
      ...req.body,
      studioId: before.studio_id,
      startDate: req.body.startDate || before.start_date,
      endDate: req.body.endDate || before.end_date,
      targetRevenue: req.body.targetRevenue ?? before.target_revenue,
      expectedPurchases: req.body.expectedPurchases ?? before.expected_purchases,
    };
    if (b.endDate < b.startDate) throw bodyError('Campaign end date must be on or after its start date.');
    const conflicts = campaignConflicts(b, campaignId);
    if (conflicts.length && !b.force)
      return res.status(409).json({ error: 'Potential audience and offer overlap detected.', conflicts });
    if (
      b.status === 'active' &&
      (!req.user!.permissions.includes('campaign_approve') ||
        (b.approvalStatus !== 'approved' && before.approval_status !== 'approved'))
    )
      return res.status(403).json({ error: 'Campaign approval is required before activation.' });
    if (b.status === 'active' && before.offer_id) {
      const linkedOffer = db
        .prepare('SELECT approval_status,status FROM offers WHERE id=?')
        .get(before.offer_id) as any;
      if (!linkedOffer || linkedOffer.approval_status !== 'approved')
        return res
          .status(422)
          .json({ error: 'The linked offer must be approved before the campaign can become active.' });
    }
    if (
      b.approvalStatus === 'approved' &&
      before.approval_status !== 'approved' &&
      !req.user!.permissions.includes('campaign_approve')
    )
      return res.status(403).json({ error: 'Campaign approval permission required.' });
    db.prepare(
      `UPDATE campaigns SET name=?,offer_id=?,start_date=?,end_date=?,audience=?,objective=?,target_revenue=?,expected_purchases=?,status=?,approval_status=?,owner_id=?,tasks=?,notes=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`,
    ).run(
      b.name,
      b.offerId ?? before.offer_id,
      b.startDate,
      b.endDate,
      b.audience || '',
      b.objective || '',
      Number(b.targetRevenue || 0),
      b.expectedPurchases || null,
      b.status || before.status,
      b.approvalStatus || before.approval_status,
      b.ownerId || before.owner_id,
      JSON.stringify(b.tasks || (before.tasks && JSON.parse(before.tasks)) || []),
      b.notes ?? before.notes,
      campaignId,
    );
    const after = db.prepare('SELECT * FROM campaigns WHERE id=?').get(campaignId);
    audit({
      userId: req.user!.id,
      action: 'update',
      entityType: 'campaign',
      entityId: campaignId,
      studioId: before.studio_id,
      before,
      after,
      reason: b.reason,
    });
    res.json(after);
  });
  app.post('/api/campaigns/:id/duplicate', permission('campaign_edit'), (req, res) => {
    const before = db.prepare('SELECT * FROM campaigns WHERE id=?').get(id(req.params.id)) as any;
    if (!before || !canAccessStudio(req.user!, before.studio_id))
      return res.status(404).json({ error: 'Campaign not found.' });
    const start = req.body.startDate || before.start_date,
      end = req.body.endDate || before.end_date;
    const result = db
      .prepare(
        `INSERT INTO campaigns(name,studio_id,offer_id,year,start_date,end_date,audience,objective,target_revenue,expected_purchases,status,approval_status,owner_id,tasks,data_mode,notes,created_by)
    VALUES (?,?,?,?,?,?,?,?,?,?,'draft','pending',?,?, 'user',?,?)`,
      )
      .run(
        `${before.name} · copy`,
        before.studio_id,
        before.offer_id,
        Number(String(start).slice(0, 4)),
        start,
        end,
        before.audience,
        before.objective,
        before.target_revenue,
        before.expected_purchases,
        before.owner_id,
        before.tasks,
        before.notes,
        req.user!.id,
      );
    res.status(201).json(db.prepare('SELECT * FROM campaigns WHERE id=?').get(result.lastInsertRowid));
  });
  app.post('/api/campaigns/:id/performance', permission('campaign_edit'), (req, res) => {
    const campaignId = id(req.params.id),
      campaign = db.prepare('SELECT * FROM campaigns WHERE id=?').get(campaignId) as any;
    if (!campaign || !canAccessStudio(req.user!, campaign.studio_id))
      return res.status(404).json({ error: 'Campaign not found.' });
    const fields = [
      'eligibleAudience',
      'customersReached',
      'responses',
      'redemptions',
      'buyers',
      'transactions',
      'revenue',
      'effectiveDiscount',
      'discountCost',
      'subsequentRevenue',
    ];
    const values = fields.map(f => Number(req.body[f] || 0));
    if (values.some(v => !Number.isFinite(v) || v < 0))
      throw bodyError('Performance values must be non-negative numbers.');
    const aov = Number(req.body.transactions) > 0 ? Number(req.body.revenue) / Number(req.body.transactions) : null;
    db.prepare(
      `INSERT INTO campaign_performance(campaign_id,eligible_audience,customers_reached,responses,redemptions,buyers,transactions,revenue,aov,effective_discount,discount_cost,subsequent_revenue,notes,recorded_by)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(campaign_id) DO UPDATE SET eligible_audience=excluded.eligible_audience,customers_reached=excluded.customers_reached,
    responses=excluded.responses,redemptions=excluded.redemptions,buyers=excluded.buyers,transactions=excluded.transactions,revenue=excluded.revenue,aov=excluded.aov,
    effective_discount=excluded.effective_discount,discount_cost=excluded.discount_cost,subsequent_revenue=excluded.subsequent_revenue,notes=excluded.notes,recorded_by=excluded.recorded_by,updated_at=CURRENT_TIMESTAMP`,
    ).run(campaignId, ...values.slice(0, 7), aov, ...values.slice(7), req.body.notes || null, req.user!.id);
    audit({
      userId: req.user!.id,
      action: 'record_actuals',
      entityType: 'campaign_performance',
      entityId: campaignId,
      studioId: campaign.studio_id,
      after: req.body,
    });
    res.json(db.prepare('SELECT * FROM campaign_performance WHERE campaign_id=?').get(campaignId));
  });
  app.get('/api/performance', (req, res) => {
    const year = Number(req.query.year || 2027),
      studioId = studioFilter(req, req.query.studio ? id(req.query.studio) : undefined);
    const campaigns = db
      .prepare(
        `SELECT c.*,s.name studio,o.name offer_name,p.*,c.target_revenue planned_revenue,c.expected_purchases planned_purchases
    FROM campaigns c JOIN studios s ON s.id=c.studio_id LEFT JOIN offers o ON o.id=c.offer_id JOIN campaign_performance p ON p.campaign_id=c.id
    WHERE c.year=? ${studioId ? 'AND c.studio_id=?' : ''} ORDER BY p.updated_at DESC`,
      )
      .all(...(studioId ? [year, studioId] : [year])) as any[];
    const historical = db
      .prepare(
        `SELECT o.id,o.name,o.actual_revenue revenue,o.actual_redemptions redemptions,o.actual_sales transactions,o.effective_discount,
    o.actual_discount_cost discount_cost,s.name studio,o.source_campaign,o.performance_notes FROM offers o LEFT JOIN studios s ON s.id=o.studio_id
    WHERE o.generation_source='historical_import' ${studioId ? 'AND o.studio_id=?' : ''} ORDER BY o.actual_revenue DESC LIMIT 200`,
      )
      .all(...(studioId ? [studioId] : []));
    const classified = campaigns.map(c => ({
      ...c,
      learning:
        c.revenue >= c.planned_revenue && c.effective_discount <= 15
          ? 'repeat'
          : c.redemptions > 0 && c.revenue < c.planned_revenue * 0.5
            ? 'review_or_retire'
            : 'test_again',
      attribution: 'Observed campaign performance; no causal incrementality is claimed.',
    }));
    res.json({ campaigns: classified, historical });
  });

  app.get('/api/segments', (req, res) => {
    const studioId = studioFilter(req, req.query.studio ? id(req.query.studio) : undefined);
    const rows = db
      .prepare(
        `SELECT ss.*,s.name studio FROM segment_snapshots ss JOIN studios s ON s.id=ss.studio_id ${studioId ? 'WHERE ss.studio_id=?' : ''} ORDER BY s.name,ss.audience_size DESC`,
      )
      .all(...(studioId ? [studioId] : []));
    res.json({ rows, rules: db.prepare('SELECT * FROM segment_rules WHERE id=1').get() });
  });
  app.patch('/api/segments/rules', permission('target_edit'), (req, res) => {
    const before = db.prepare('SELECT * FROM segment_rules WHERE id=1').get();
    const fields = [
      'expiry_days',
      'recently_lapsed_days',
      'long_lapsed_days',
      'high_value_percentile',
      'frequent_purchase_count',
      'promo_sensitivity_threshold',
    ];
    const values = fields.map(f => Number(req.body[f] ?? (before as any)[f]));
    if (values.some(v => !Number.isFinite(v) || v < 0)) throw bodyError('Segment rules must be non-negative numbers.');
    db.prepare(
      `UPDATE segment_rules SET expiry_days=?,recently_lapsed_days=?,long_lapsed_days=?,high_value_percentile=?,frequent_purchase_count=?,promo_sensitivity_threshold=?,updated_at=CURRENT_TIMESTAMP WHERE id=1`,
    ).run(...values);
    recalculateSegments();
    const after = db.prepare('SELECT * FROM segment_rules WHERE id=1').get();
    audit({
      userId: req.user!.id,
      action: 'update_segment_rules',
      entityType: 'segment_rules',
      entityId: 1,
      before,
      after,
      reason: req.body.reason,
    });
    res.json(after);
  });
  app.get('/api/anniversary', (req, res) => {
    const year = Number(req.query.year || 2027),
      studioId = studioFilter(req, req.query.studio ? id(req.query.studio) : undefined);
    const baseline = db
      .prepare(
        `SELECT s.id studio_id,s.name studio,t.month,SUM(t.amount) revenue,COUNT(*) transactions,AVG(t.amount) aov FROM transactions t JOIN studios s ON s.id=t.studio_id
    WHERE t.month LIKE ? ${studioId ? 'AND s.id=?' : ''} GROUP BY s.id,t.month ORDER BY s.name,t.month`,
      )
      .all(...(studioId ? [`%-04`, studioId] : ['%-04']));
    const campaigns = db
      .prepare(
        `SELECT c.*,s.name studio,o.name offer_name,o.data_mode FROM campaigns c JOIN studios s ON s.id=c.studio_id LEFT JOIN offers o ON o.id=c.offer_id
    WHERE c.year=? AND CAST(substr(c.start_date,6,2) AS INTEGER)=4 ${studioId ? 'AND c.studio_id=?' : ''}`,
      )
      .all(...(studioId ? [year, studioId] : [year]));
    const ordinary = db
      .prepare(
        `SELECT s.name studio,AVG(monthly_revenue) ordinary_month_average FROM (SELECT studio_id,month,SUM(amount) monthly_revenue FROM transactions WHERE month NOT LIKE '%-04' GROUP BY studio_id,month) x JOIN studios s ON s.id=x.studio_id ${studioId ? 'WHERE s.id=?' : ''} GROUP BY s.id`,
      )
      .all(...(studioId ? [studioId] : []));
    res.json({
      baseline,
      campaigns,
      ordinary,
      retentionPlan: [
        {
          week: 'April · at purchase',
          action: 'Capture preferred class cadence and book the first May visit before checkout.',
        },
        { week: 'May · days 1–7', action: 'Send attendance-based check-in; no automatic follow-on discount.' },
        {
          week: 'May · days 8–21',
          action:
            'Prompt second purchase only for clients with healthy attendance; offer onboarding to inactive buyers.',
        },
        {
          week: 'June · cohort review',
          action:
            'Compare 30/60-day attendance and subsequent purchases against non-anniversary cohorts; report observed, not causal, retention.',
        },
      ],
    });
  });
}
