import { stringify } from 'csv-stringify/sync';
import { z } from 'zod';
import { db, audit } from '../db.js';
import { permission, canAccessStudio } from '../lib/auth.js';
import { generateYearTargets, observedFunnel, recommendTarget, type TargetScenario } from '../lib/intelligence.js';
import { calculateFunnel } from '../lib/calculations.js';
import { applyTargetScenario, currentScenario, rebaseTarget, TARGET_SCENARIOS } from '../lib/targetScenarios.js';
import { POPUP_CHILDREN, rollUpPopup } from '../lib/plan2027.js';
import { bodyError, id, studioFilter } from '../http.js';
import type { Express } from 'express';

export default function registerTargetsRoutes(app: Express) {
  app.get('/api/targets/scenario', (_req, res) => res.json({ scenario: currentScenario(), options: TARGET_SCENARIOS }));
  // Rescales every studio-month for the year, so it needs approval rights, not just edit rights.
  app.post('/api/targets/scenario', permission('target_approve'), (req, res) => {
    const scenario = z.enum(TARGET_SCENARIOS).parse(req.body.scenario),
      year = Number(req.body.year || 2027);
    res.json(applyTargetScenario(year, scenario, req.user!.id));
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
      note: 'Read-only scenario preview. No target, approval, baseline forecast, or version was changed. Kemps retains seasonal monthly values within the directed ₹30–40L guardrail.',
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
  app.patch('/api/targets/:id', permission('target_edit'), (req, res) => {
    const targetId = id(req.params.id),
      before = db.prepare('SELECT * FROM monthly_targets WHERE id=?').get(targetId) as any;
    if (!before) return res.status(404).json({ error: 'Target not found.' });
    if (!canAccessStudio(req.user!, before.studio_id)) return res.status(403).json({ error: 'Studio access denied.' });
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
    const streams = {
      newClient: Math.max(0, Number(req.body.newClientTarget ?? before.new_client_target)),
      renewal: Math.max(0, Number(req.body.renewalTarget ?? before.renewal_target)),
      repeat: Math.max(0, Number(req.body.repeatTarget ?? before.repeat_target)),
      reactivation: Math.max(0, Number(req.body.reactivationTarget ?? before.reactivation_target)),
    };
    const assumptions = JSON.parse(before.assumptions || '{}');
    const observedRates = observedFunnel(before.studio_id);
    const rates = { ...observedRates, ...(assumptions.conversionRates || {}) };
    const funnel = calculateFunnel({
      revenueTarget: selected,
      revenueAchieved: 0,
      existingClientRevenue: streams.repeat,
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
    const nextVersion = before.version + 1;
    db.prepare(
      `UPDATE monthly_targets SET proposed_target=?,approved_target=?,scenario=?,new_client_target=?,renewal_target=?,repeat_target=?,reactivation_target=?,
    target_growth=?,funnel=?,assumptions=?,source=?,version=?,override_reason=?,updated_by=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`,
    ).run(
      proposed,
      approved,
      scenario,
      streams.newClient,
      streams.renewal,
      streams.repeat,
      streams.reactivation,
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
    res.json({ ...after, funnel: JSON.parse(after.funnel), assumptions: JSON.parse(after.assumptions || '{}') });
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
