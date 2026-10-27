import { stringify } from 'csv-stringify/sync';
import { z } from 'zod';
import { db, audit } from '../db.js';
import { permission, canAccessStudio } from '../lib/auth.js';
import { generateYearTargets, observedFunnel, recommendTarget, type TargetScenario } from '../lib/intelligence.js';
import { calculateFunnel } from '../lib/calculations.js';
import { applyTargetScenario, currentScenario, rebaseTarget, TARGET_SCENARIOS } from '../lib/targetScenarios.js';
import { POPUP_CHILDREN, POPUP_PARENT, rollUpPopup } from '../lib/plan2027.js';
import { PLAN_ASSUMPTIONS_2027, UNIT_GROUPS, syncBreakdownFunnels, targetBreakdown } from '../lib/targetBreakdown.js';
import { bodyError, id, studioFilter } from '../http.js';
import type { Express } from 'express';

export default function registerTargetsRoutes(app: Express) {
  app.get('/api/targets/scenario', (_req, res) => res.json({ scenario: currentScenario(), options: TARGET_SCENARIOS }));
  // Rescales every studio-month for the year, so it needs approval rights, not just edit rights.
  app.post('/api/targets/scenario', permission('target_approve'), (req, res) => {
    const scenario = z.enum(TARGET_SCENARIOS).parse(req.body.scenario),
      year = Number(req.body.year || 2027);
    const result = applyTargetScenario(year, scenario, req.user!.id);
    syncBreakdownFunnels(year);
    res.json(result);
  });
  // The detailed month-by-month breakdown of the one target per location (Targets tab).
  app.get('/api/targets/breakdown', (req, res) => {
    const year = Number(req.query.year || 2027);
    const studioId = studioFilter(req, req.query.studio ? id(req.query.studio) : undefined);
    const names = ['Kemps Corner', 'Bandra', 'Kenkere House', POPUP_PARENT];
    const studios = studioId
      ? [studioId]
      : (names
          .map(n => (db.prepare('SELECT id FROM studios WHERE name=?').get(n) as any)?.id)
          .filter(Boolean) as number[]);
    const locations = studios.map(sid => targetBreakdown(sid, year)).filter(Boolean);
    res.json({
      year,
      scenario: currentScenario(),
      unitGroups: UNIT_GROUPS,
      locations,
      covered: Object.keys(PLAN_ASSUMPTIONS_2027),
    });
  });
  app.get('/api/targets', (req, res) => {
    const year = Number(req.query.year || 2027),
      studioId = studioFilter(req, req.query.studio ? id(req.query.studio) : undefined);
    const rows = db
      .prepare(
        `SELECT t.*,s.name studio,s.city,s.max_discount_percent FROM monthly_targets t JOIN studios s ON s.id=t.studio_id
    WHERE t.year=? ${studioId ? 'AND t.studio_id=?' : ''} ORDER BY s.city,s.name,t.month`,
      )
      .all(...(studioId ? [year, studioId] : [year])) as any[];
    res.json({
      year,
      rows: rows.map(r => ({
        ...r,
        funnel: JSON.parse(r.funnel || '{}'),
        assumptions: JSON.parse(r.assumptions || '{}'),
      })),
      reconciliation: {
        annualProposed: rows.reduce((s, r) => s + r.proposed_target, 0),
        annualApproved: rows.reduce((s, r) => s + (r.approved_target || 0), 0),
        approvedMonths: rows.filter(r => r.approved_target !== null).length,
        totalMonths: rows.length,
      },
    });
  });
  app.get('/api/targets/scenario-preview', (req, res) => {
    const year = Number(req.query.year || 2027);
    if (year < 2020 || year > 2100) throw bodyError('Invalid planning year.');
    const studioId = studioFilter(req, req.query.studio ? id(req.query.studio) : undefined);
    const studios = db
      .prepare(`SELECT id,name FROM studios WHERE active=1 ${studioId ? 'AND id=?' : ''} ORDER BY name`)
      .all(...(studioId ? [studioId] : [])) as any[];
    const scenarios: TargetScenario[] = ['nominal', 'standard', 'aggressive'];
    const rows: any[] = [];
    for (const studio of studios)
      for (let month = 1; month <= 12; month++) {
        for (const scenario of scenarios) {
          const rec = recommendTarget(studio.id, year, month, scenario);
          rows.push({ ...rec, assumptions: JSON.parse(rec.assumptions), funnel: JSON.parse(rec.funnel) });
        }
      }
    const totals = scenarios.map(scenario => {
      const selected = rows.filter(row => row.scenario === scenario),
        target = selected.reduce((sum, row) => sum + row.proposed_target, 0);
      const comparable = selected.reduce((sum, row) => sum + row.historical_revenue, 0);
      return {
        scenario,
        annualTarget: target,
        comparableRevenue: comparable,
        yoyGrowthPercent: comparable > 0 ? (target / comparable - 1) * 100 : null,
      };
    });
    res.json({
      year,
      rows,
      totals,
      aggressiveHighest:
        totals[2].annualTarget >= totals[1].annualTarget && totals[2].annualTarget >= totals[0].annualTarget,
      note: 'Read-only scenario preview. No target, approval, baseline forecast, or version was changed. Kemps retains seasonal monthly values within the directed ₹20–60L guardrail (₹35L/mo average).',
    });
  });
  app.post('/api/targets/generate', permission('target_edit'), (req, res) => {
    const year = Number(req.body.year || 2027);
    if (year < 2020 || year > 2100) throw bodyError('Invalid planning year.');
    const scenario = ['nominal', 'standard', 'aggressive', 'conservative', 'base', 'stretch'].includes(
      req.body.scenario,
    )
      ? (req.body.scenario as TargetScenario)
      : undefined;
    const studioId = req.body.studioId ? studioFilter(req, id(req.body.studioId)) : undefined;
    generateYearTargets(year, req.user!.id, Boolean(req.body.overwrite), scenario, studioId);
    syncBreakdownFunnels(year);
    audit({
      userId: req.user!.id,
      action: 'generate_recommendations',
      entityType: 'annual_targets',
      entityId: year,
      studioId,
      after: {
        year,
        studioId: studioId || null,
        scenario: scenario || 'preserved_or_standard',
        overwrite: Boolean(req.body.overwrite),
      },
    });
    res.json({ ok: true, year, studioId: studioId || null, scenario: scenario || 'preserved_or_standard' });
  });
  app.post('/api/targets/studio/:studioId/:year/approve-all', permission('target_approve'), (req, res) => {
    const studioId = studioFilter(req, id(req.params.studioId));
    const year = id(req.params.year);
    if (year < 2020 || year > 2100) throw bodyError('Invalid planning year.');
    const rows = db
      .prepare('SELECT * FROM monthly_targets WHERE studio_id=? AND year=? ORDER BY month')
      .all(studioId, year) as any[];
    if (rows.length !== 12) throw bodyError('All 12 monthly targets must exist before approving the location.');
    const pending = rows.filter(row => row.approved_target == null);
    if (!pending.length) return res.json({ ok: true, approved: 0, alreadyApproved: 12 });
    const reason = 'Approved all monthly targets for this location in one action.';
    const approve = db.transaction(() => {
      for (const row of pending) {
        const version = row.version + 1;
        db.prepare(
          `UPDATE monthly_targets SET approved_target=proposed_target,source='approved_decision',version=?,override_reason=?,updated_by=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`,
        ).run(version, reason, req.user!.id, row.id);
        const after = db.prepare('SELECT * FROM monthly_targets WHERE id=?').get(row.id) as any;
        db.prepare(
          'INSERT INTO target_versions(target_id,version,snapshot,change_reason,changed_by) VALUES (?,?,?,?,?)',
        ).run(row.id, version, JSON.stringify(after), reason, req.user!.id);
      }
    });
    approve();
    pending.forEach(row => rebaseTarget(row.id));
    const name = (db.prepare('SELECT name FROM studios WHERE id=?').get(studioId) as any)?.name;
    if (POPUP_CHILDREN.includes(name)) rollUpPopup(year, req.user!.id);
    syncBreakdownFunnels(year);
    audit({
      userId: req.user!.id,
      action: 'approve_all_location_targets',
      entityType: 'annual_targets',
      entityId: `${studioId}-${year}`,
      studioId,
      before: pending,
      after: { approvedMonths: pending.map(row => row.month) },
      reason,
    });
    res.json({ ok: true, approved: pending.length });
  });
  app.patch('/api/targets/:id', permission('target_edit'), (req, res) => {
    const targetId = id(req.params.id),
      before = db.prepare('SELECT * FROM monthly_targets WHERE id=?').get(targetId) as any;
    if (!before) return res.status(404).json({ error: 'Target not found.' });
    if (!canAccessStudio(req.user!, before.studio_id)) return res.status(403).json({ error: 'Studio access denied.' });
    const monthlyPlan =
      req.body.monthlyPlan === undefined
        ? undefined
        : z
            .object({
              theme: z.string().max(200).nullable(),
              objective: z.string().max(300).nullable(),
              strategy: z.string().max(5000).nullable(),
              notes: z.string().max(5000).nullable(),
              content: z.record(z.string(), z.unknown()).optional(),
              status: z.enum(['draft', 'final']),
              actions: z
                .array(
                  z.object({
                    text: z.string().trim().min(1).max(500),
                    owner: z.string().max(80).default(''),
                    week: z.number().int().min(1).max(5).default(1),
                    done: z.boolean().default(false),
                  }),
                )
                .max(60),
            })
            .parse(req.body.monthlyPlan);
    if (req.body.approvedTarget !== undefined && !req.user!.permissions.includes('target_approve'))
      return res.status(403).json({ error: 'Target approval permission required.' });
    const proposed = req.body.proposedTarget !== undefined ? Number(req.body.proposedTarget) : before.proposed_target;
    const approved =
      req.body.approvedTarget !== undefined
        ? req.body.approvedTarget === null
          ? null
          : Number(req.body.approvedTarget)
        : before.approved_target;
    if (![proposed, ...(approved === null ? [] : [approved])].every(v => Number.isFinite(v) && v >= 0))
      throw bodyError('Targets must be finite, non-negative values.');
    const scenario = ['nominal', 'standard', 'aggressive', 'conservative', 'base', 'stretch'].includes(
      req.body.scenario,
    )
      ? req.body.scenario
      : before.scenario;
    const reason = String(req.body.reason || '').trim();
    if (before.approved_target !== approved && !reason)
      throw bodyError('A reason is required when changing an approved target.');
    const selected = approved ?? proposed;
    const rawStreams = {
      newClient: Number(req.body.newClientTarget ?? before.new_client_target),
      renewal: Number(req.body.renewalTarget ?? before.renewal_target),
      repeat: Number(req.body.repeatTarget ?? before.repeat_target),
      reactivation: Number(req.body.reactivationTarget ?? before.reactivation_target),
    };
    if (!Object.values(rawStreams).every(value => Number.isFinite(value) && value >= 0))
      throw bodyError('Revenue stream allocations must be finite, non-negative amounts.');
    const streams = rawStreams;
    const rawOther = Number(req.body.otherTarget ?? before.other_target);
    if (!Number.isFinite(rawOther) || rawOther < 0)
      throw bodyError('Other revenue must be a finite, non-negative amount.');
    const other = req.body.requireFullCoverage ? 0 : rawOther;
    const assumptions = JSON.parse(before.assumptions || '{}');
    const observedRates = observedFunnel(before.studio_id);
    const rates = { ...observedRates, ...(assumptions.conversionRates || {}) };
    const funnel = calculateFunnel({
      revenueTarget: selected,
      revenueAchieved: 0,
      existingClientRevenue: streams.repeat + other,
      renewalRevenue: streams.renewal,
      reactivationRevenue: streams.reactivation,
      averageFirstPurchase: Number(
        req.body.averageFirstPurchase ?? assumptions.averageFirstPurchase ?? before.expected_aov ?? 0,
      ),
      trialToPurchaseRate: Number(req.body.trialToPurchaseRate ?? rates.trialToPurchaseRate),
      bookingToAttendanceRate: Number(req.body.bookingToAttendanceRate ?? rates.bookingToAttendanceRate),
      leadToBookingRate: Number(req.body.leadToBookingRate ?? rates.leadToBookingRate),
    });
    assumptions.averageFirstPurchase = Number(
      req.body.averageFirstPurchase ?? assumptions.averageFirstPurchase ?? before.expected_aov ?? 0,
    );
    assumptions.conversionRates = {
      trialToPurchaseRate: Number(req.body.trialToPurchaseRate ?? rates.trialToPurchaseRate),
      bookingToAttendanceRate: Number(req.body.bookingToAttendanceRate ?? rates.bookingToAttendanceRate),
      leadToBookingRate: Number(req.body.leadToBookingRate ?? rates.leadToBookingRate),
    };
    const studioCapacity = Number(
      (db.prepare('SELECT monthly_capacity FROM studios WHERE id=?').get(before.studio_id) as any)?.monthly_capacity ||
        0,
    );
    if (studioCapacity && funnel.requiredCompletedTrials !== null && funnel.requiredCompletedTrials > studioCapacity)
      funnel.warnings.push(
        `Required completed trials exceed observed monthly class capacity (${Math.round(studioCapacity)}); target requires a capacity review.`,
      );
    if (
      ['averageFirstPurchase', 'trialToPurchaseRate', 'bookingToAttendanceRate', 'leadToBookingRate'].some(
        key => req.body[key] !== undefined,
      )
    )
      assumptions.lastAssumptionEdit = { by: req.user!.id, at: new Date().toISOString(), source: 'manual_assumption' };
    let totalStreams = streams.newClient + streams.renewal + streams.repeat + streams.reactivation;
    const explicitStreams = ['newClientTarget', 'renewalTarget', 'repeatTarget', 'reactivationTarget'].some(
      key => req.body[key] !== undefined,
    );
    if (!explicitStreams && totalStreams > 0 && Math.abs(totalStreams - selected) > 0.01) {
      const scale = selected / totalStreams;
      streams.newClient *= scale;
      streams.renewal *= scale;
      streams.repeat *= scale;
      streams.reactivation *= scale;
      totalStreams = selected;
    }
    if (totalStreams > selected * 1.001)
      throw bodyError('Revenue stream allocations exceed the selected target. Adjust allocations before saving.');
    if (
      req.body.requireFullCoverage &&
      Math.abs(streams.newClient + streams.renewal + streams.reactivation - selected) > 1
    )
      throw bodyError('New-client, renewal, and comeback revenue must add up to the selected monthly target.');
    const nextVersion = before.version + 1;
    const saveTogether = db.transaction(() => {
      db.prepare(
        `UPDATE monthly_targets SET proposed_target=?,approved_target=?,scenario=?,new_client_target=?,renewal_target=?,repeat_target=?,reactivation_target=?,other_target=?,
        target_growth=?,funnel=?,assumptions=?,source=?,version=?,override_reason=?,updated_by=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`,
      ).run(
        proposed,
        approved,
        scenario,
        streams.newClient,
        streams.renewal,
        streams.repeat,
        streams.reactivation,
        other,
        before.historical_revenue > 0 ? (proposed / before.historical_revenue - 1) * 100 : null,
        JSON.stringify(funnel),
        JSON.stringify(assumptions),
        approved !== before.approved_target ? 'approved_decision' : 'user_recommendation',
        nextVersion,
        reason || before.override_reason,
        req.user!.id,
        targetId,
      );
      const after = db.prepare('SELECT * FROM monthly_targets WHERE id=?').get(targetId) as any;
      db.prepare(
        'INSERT INTO target_versions(target_id,version,snapshot,change_reason,changed_by) VALUES (?,?,?,?,?)',
      ).run(targetId, nextVersion, JSON.stringify(after), reason || 'Target or scenario updated.', req.user!.id);
      if (monthlyPlan)
        db.prepare(
          `INSERT INTO monthly_plans(studio_id,year,month,theme,objective,strategy,actions,notes,status,content,updated_by)
           VALUES (?,?,?,?,?,?,?,?,?,?,?)
           ON CONFLICT(studio_id,year,month) DO UPDATE SET theme=excluded.theme,objective=excluded.objective,
             strategy=excluded.strategy,actions=excluded.actions,notes=excluded.notes,status=excluded.status,
             content=COALESCE(excluded.content,monthly_plans.content),
             updated_by=excluded.updated_by,updated_at=CURRENT_TIMESTAMP`,
        ).run(
          before.studio_id,
          before.year,
          before.month,
          monthlyPlan.theme,
          monthlyPlan.objective,
          monthlyPlan.strategy,
          JSON.stringify(monthlyPlan.actions),
          monthlyPlan.notes,
          monthlyPlan.status,
          monthlyPlan.content === undefined ? null : JSON.stringify(monthlyPlan.content),
          req.user!.id,
        );
      return after;
    });
    const after = saveTogether();
    audit({
      userId: req.user!.id,
      action: approved !== before.approved_target ? 'approve_target' : 'update_target',
      entityType: 'monthly_target',
      entityId: targetId,
      studioId: before.studio_id,
      before,
      after,
      reason,
    });
    rebaseTarget(targetId);
    const studioName = (db.prepare('SELECT name FROM studios WHERE id=?').get(before.studio_id) as any)?.name;
    if (POPUP_CHILDREN.includes(studioName)) rollUpPopup(before.year, req.user!.id);
    syncBreakdownFunnels(before.year);
    const saved = db.prepare('SELECT * FROM monthly_targets WHERE id=?').get(targetId) as any;
    res.json({
      ...saved,
      funnel: JSON.parse(saved.funnel || '{}'),
      assumptions: JSON.parse(saved.assumptions || '{}'),
    });
  });
  app.get('/api/targets/:id/versions', (req, res) => {
    const target = db.prepare('SELECT studio_id FROM monthly_targets WHERE id=?').get(id(req.params.id)) as any;
    if (!target || !canAccessStudio(req.user!, target.studio_id))
      return res.status(404).json({ error: 'Target not found.' });
    res.json(
      db
        .prepare(
          `SELECT v.*,u.name changed_by_name FROM target_versions v LEFT JOIN users u ON u.id=v.changed_by WHERE target_id=? ORDER BY version DESC`,
        )
        .all(id(req.params.id)),
    );
  });
  app.post('/api/funnel/calculate', (req, res) => {
    const input = req.body;
    const base = calculateFunnel(input);
    const scenario = (name: string, factor: number) =>
      calculateFunnel({
        ...input,
        trialToPurchaseRate: Math.min(1, Number(input.trialToPurchaseRate || 0) * factor),
        bookingToAttendanceRate: Math.min(1, Number(input.bookingToAttendanceRate || 0) * factor),
        leadToBookingRate: Math.min(1, Number(input.leadToBookingRate || 0) * factor),
      });
    res.json({
      base,
      scenarios: { conservative: scenario('conservative', 0.85), base, stretch: scenario('stretch', 1.1) },
      notes: [
        'Operational counts round upward.',
        'Zero or invalid conversion rates produce a warning and null downstream counts, never Infinity.',
        'Conservative/stretch scenarios adjust conversion assumptions by −15%/+10%; they are sensitivity cases, not forecasts.',
      ],
    });
  });
}
