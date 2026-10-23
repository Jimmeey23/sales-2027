import ExcelJS from 'exceljs';
import { stringify } from 'csv-stringify/sync';
import { db, audit } from '../db.js';
import { permission } from '../lib/auth.js';
import { dataCoverage } from '../lib/intelligence.js';
import {
  parseReportOptions,
  reportCatalog,
  reportDefaults,
  reportSupportsStudio,
  runReport,
} from '../lib/reporting.js';
import { sendReportExport } from '../lib/reportExport.js';
import { asyncRoute, bodyError, id, studioFilter } from '../http.js';
import type { Express } from 'express';

export default function registerReportsRoutes(app: Express) {
  const reportingOptions = (req: any, input: any, exportMode = false) => {
    const raw = { ...input };
    if (reportSupportsStudio(String(raw.report || ''))) {
      const studioId = studioFilter(
        req,
        raw.studio !== undefined && raw.studio !== '' && raw.studio !== 'all' ? id(raw.studio) : undefined,
      );
      if (studioId) raw.studio = studioId;
      else delete raw.studio;
    }
    return parseReportOptions(raw, exportMode);
  };
  app.get('/api/reporting/catalog', permission('financial'), (req, res) => {
    res.json({
      reports: reportCatalog(req.user!.permissions),
      defaults: reportDefaults(),
      formats: ['csv', 'xlsx', 'print'],
      maxExportRows: 10000,
    });
  });
  app.get('/api/reporting/run', permission('financial'), (req, res) => {
    res.json(runReport(reportingOptions(req, req.query)));
  });
  app.get(
    '/api/reporting/export',
    permission('export'),
    asyncRoute(async (req: any, res: any) => {
      const format = req.query.format === 'xlsx' ? 'xlsx' : 'csv';
      const result = runReport(reportingOptions(req, { ...req.query, limit: 10000 }, true), true);
      audit({
        userId: req.user!.id,
        action: 'export_advanced_report',
        entityType: 'report',
        entityId: result.definition.id,
        studioId: result.options.studio,
        after: {
          format,
          from: result.options.from,
          to: result.options.to,
          rows: result.returnedRows,
          columns: result.columns.map((column: any) => column.key),
        },
      });
      await sendReportExport(res, result, format);
    }),
  );
  app.get('/api/reporting/saved', permission('financial'), (req, res) => {
    const rows = db
      .prepare(
        `SELECT r.*,s.name studio FROM saved_reports r LEFT JOIN studios s ON s.id=r.studio_id WHERE r.user_id=? ORDER BY r.updated_at DESC`,
      )
      .all(req.user!.id) as any[];
    res.json({ rows: rows.map(row => ({ ...row, config: JSON.parse(row.config || '{}') })) });
  });
  app.post('/api/reporting/saved', permission('financial'), (req, res) => {
    const name = String(req.body.name || '').trim();
    if (!name || name.length > 100) throw bodyError('Saved report names must contain 1–100 characters.');
    const options = reportingOptions(req, {
      ...(req.body.config || {}),
      report: req.body.report || req.body.config?.report,
    });
    const savedId = req.body.id ? id(req.body.id) : null;
    const before = savedId
      ? (db.prepare('SELECT * FROM saved_reports WHERE id=? AND user_id=?').get(savedId, req.user!.id) as any)
      : null;
    if (savedId && !before) throw bodyError('Saved report view not found.', 404);
    if (
      !savedId &&
      Number((db.prepare('SELECT COUNT(*) n FROM saved_reports WHERE user_id=?').get(req.user!.id) as any).n) >= 100
    )
      throw bodyError('Saved-view limit reached. Delete an old view before creating another.', 422);
    let idValue = savedId;
    if (savedId)
      db.prepare(
        'UPDATE saved_reports SET name=?,report_id=?,studio_id=?,config=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=?',
      ).run(name, options.report, options.studio || null, JSON.stringify(options), savedId, req.user!.id);
    else
      idValue = Number(
        db
          .prepare('INSERT INTO saved_reports(user_id,name,report_id,studio_id,config) VALUES (?,?,?,?,?)')
          .run(req.user!.id, name, options.report, options.studio || null, JSON.stringify(options)).lastInsertRowid,
      );
    const after = db.prepare('SELECT * FROM saved_reports WHERE id=?').get(idValue) as any;
    audit({
      userId: req.user!.id,
      action: savedId ? 'update_saved_report' : 'create_saved_report',
      entityType: 'saved_report',
      entityId: idValue,
      studioId: options.studio,
      before,
      after,
    });
    res.status(savedId ? 200 : 201).json({ ...after, config: JSON.parse(after.config) });
  });
  app.delete('/api/reporting/saved/:id', permission('financial'), (req, res) => {
    const savedId = id(req.params.id),
      before = db.prepare('SELECT * FROM saved_reports WHERE id=? AND user_id=?').get(savedId, req.user!.id) as any;
    if (!before) throw bodyError('Saved report view not found.', 404);
    db.prepare('DELETE FROM saved_reports WHERE id=?').run(savedId);
    audit({
      userId: req.user!.id,
      action: 'delete_saved_report',
      entityType: 'saved_report',
      entityId: savedId,
      studioId: before.studio_id,
      before,
    });
    res.json({ ok: true });
  });

  app.get(
    '/api/reports/:type',
    permission('export'),
    asyncRoute(async (req: any, res: any) => {
      const type = req.params.type,
        year = Number(req.query.year || 2027),
        format = req.query.format === 'xlsx' ? 'xlsx' : 'csv';
      const studioId = studioFilter(req, req.query.studio ? id(req.query.studio) : undefined);
      let rows: any[] = [],
        title = type;
      if (type === 'targets' || type === 'monthly-plans' || type === 'funnel') {
        rows = db
          .prepare(
            `SELECT s.name Studio,s.city City,t.year Year,t.month Month,t.scenario Scenario,t.historical_revenue 'Historical comparable revenue (INR)',
      t.baseline_forecast 'Baseline forecast (INR)',t.proposed_target 'Proposed target (INR)',t.approved_target 'Approved target (INR)',t.target_growth 'Target growth (%)',
      t.new_client_target 'New-client target (INR)',t.renewal_target 'Renewal target (INR)',t.repeat_target 'Repeat purchase target (INR)',
      t.reactivation_target 'Reactivation target (INR)',t.target_transactions 'Target transactions',t.expected_aov 'Expected AOV (INR)',t.funnel 'Funnel calculation JSON',t.assumptions 'Assumptions and provenance JSON'
      FROM monthly_targets t JOIN studios s ON s.id=t.studio_id WHERE t.year=? ${studioId ? 'AND t.studio_id=?' : ''} ORDER BY s.name,t.month`,
          )
          .all(...(studioId ? [year, studioId] : [year]));
      } else if (type === 'offers' || type === 'ai-offers' || type === 'anniversary') {
        rows = db
          .prepare(
            `SELECT o.offer_uid 'Offer ID',o.name 'Offer name',s.name Studio,o.year Year,o.month Month,o.objective Objective,o.audience Audience,
      o.offer_type 'Offer type',o.benefit Benefit,o.revenue_target 'Revenue target (INR)',o.expected_asp 'Expected ASP (INR)',o.expected_revenue 'Expected revenue (INR)',
      o.effective_discount 'Effective discount (%)',o.actual_revenue 'Observed actual revenue (INR)',o.actual_redemptions 'Observed redemptions',o.status Status,
      o.approval_status 'Approval status',o.generation_source 'Generation source',o.data_mode 'Data mode',o.customer_copy 'Customer copy',o.rationale Rationale,
      o.risks 'Risks JSON',o.mechanics 'Mechanics JSON' FROM offers o LEFT JOIN studios s ON s.id=o.studio_id WHERE 1=1
      ${type === 'ai-offers' ? `AND o.generation_source IN ('openai','rules_engine')` : ''} ${type === 'anniversary' ? 'AND o.month=4' : ''}
      ${studioId ? 'AND o.studio_id=?' : ''} ${type !== 'ai-offers' && type !== 'anniversary' ? '' : 'AND o.year=?'} ORDER BY o.updated_at DESC`,
          )
          .all(
            ...(studioId ? (type === 'offers' ? [studioId] : [studioId, year]) : type === 'offers' ? [] : [year]),
          ) as any[];
      } else if (type === 'campaigns') {
        rows = db
          .prepare(
            `SELECT c.name Campaign,s.name Studio,c.start_date 'Start date',c.end_date 'End date',c.audience Audience,c.objective Objective,
      o.name Offer,c.target_revenue 'Target revenue (INR)',c.expected_purchases 'Expected purchases',c.status Status,c.approval_status 'Approval status',
      u.name Owner,c.data_mode 'Data mode',p.revenue 'Actual observed revenue (INR)',p.redemptions 'Actual redemptions',p.buyers 'Actual buyers'
      FROM campaigns c JOIN studios s ON s.id=c.studio_id LEFT JOIN offers o ON o.id=c.offer_id LEFT JOIN users u ON u.id=c.owner_id
      LEFT JOIN campaign_performance p ON p.campaign_id=c.id WHERE c.year=? ${studioId ? 'AND c.studio_id=?' : ''} ORDER BY c.start_date`,
          )
          .all(...(studioId ? [year, studioId] : [year]));
      } else if (type === 'historical') {
        rows = db
          .prepare(
            `SELECT s.name Studio,s.city City,t.month Month,COUNT(*) Transactions,SUM(t.amount) 'Revenue gross collected (INR)',AVG(t.amount) 'Average transaction (INR)',
      SUM(CASE WHEN t.revenue_stream='new_client' THEN t.amount ELSE 0 END) 'First observed purchase revenue (INR)',
      SUM(CASE WHEN t.revenue_stream='renewal' THEN t.amount ELSE 0 END) 'Inferred renewal revenue (INR)',
      SUM(CASE WHEN t.revenue_stream='reactivation' THEN t.amount ELSE 0 END) 'Inferred reactivation revenue (INR)',SUM(t.discount_amount) 'Discount value (INR)'
      FROM transactions t JOIN studios s ON s.id=t.studio_id WHERE t.month LIKE ? ${studioId ? 'AND t.studio_id=?' : ''} GROUP BY s.id,t.month ORDER BY t.month,s.name`,
          )
          .all(...(studioId ? [`${year}-%`, studioId] : [`${year}-%`]));
      } else if (type === 'performance') {
        rows = db
          .prepare(
            `SELECT s.name Studio,o.name Offer,o.source_campaign 'Source campaign',o.actual_sales Transactions,o.actual_redemptions Redemptions,
      o.actual_revenue 'Observed attributed revenue (INR)',o.effective_discount 'Effective discount (%)',o.actual_discount_cost 'Discount cost (INR)',o.performance_notes 'Attribution note'
      FROM offers o LEFT JOIN studios s ON s.id=o.studio_id WHERE o.generation_source='historical_import' ${studioId ? 'AND o.studio_id=?' : ''} ORDER BY o.actual_revenue DESC`,
          )
          .all(...(studioId ? [studioId] : []));
      } else throw bodyError('Unknown report type.', 404);
      const filename = `p57-${type}-${year}.${format}`;
      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        return res.send('\uFEFF' + stringify(rows, { header: true }));
      }
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'P57 Sales Intelligence Studio';
      const sheet = workbook.addWorksheet(title.slice(0, 28));
      sheet.columns = rows.length
        ? Object.keys(rows[0]).map(key => ({ header: key, key, width: Math.min(45, Math.max(14, key.length + 2)) }))
        : [{ header: 'No data', key: 'empty', width: 30 }];
      rows.forEach(row => sheet.addRow(row));
      sheet.getRow(1).font = { bold: true };
      sheet.autoFilter = rows.length
        ? { from: { row: 1, column: 1 }, to: { row: 1, column: Object.keys(rows[0]).length } }
        : undefined;
      const notes = workbook.addWorksheet('Read me');
      notes.addRows([
        [title],
        [`Generated: ${new Date().toISOString()}`],
        [`Planning/performance year: ${year}`],
        ...dataCoverage().limitations.map(x => [x]),
        ['AI and rules-engine outputs are recommendations; approved commercial decisions remain separate.'],
      ]);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      await workbook.xlsx.write(res);
      res.end();
    }),
  );
}
