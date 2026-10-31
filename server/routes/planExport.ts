import type { Express } from 'express';
import { db, audit } from '../db.js';
import { permission } from '../lib/auth.js';
import { canAccessStudio } from '../lib/auth.js';
import { asyncRoute } from '../http.js';
import { buildYearPlan, renderPlanCsv, renderPlanMarkdown, renderPlanXlsx } from '../lib/planExport.js';

/* The full-year plan as a file.

   Four formats, one document. JSON is the round-trip format — it can be edited and imported
   back. CSV is one row per offer for the spreadsheet the studio already has. Excel adds the
   month grid, the dates and the measured assumptions as their own sheets. Markdown is the
   version that survives a paste into a deck or a message. */

export default function registerPlanExportRoutes(app: Express) {
  const resolveScope = (req: any) => {
    const year = Number(req.query.year || 2027);
    const raw = String(req.query.studios ?? req.query.studio ?? 'all');
    const requested =
      raw === 'all' || raw === ''
        ? (db.prepare("SELECT id FROM studios WHERE name IN ('Kemps Corner','Bandra','Kenkere House','Pop-up')").all() as any[]).map(
            row => Number(row.id),
          )
        : raw
            .split(',')
            .map(Number)
            .filter(n => Number.isInteger(n) && n > 0);
    const ids = [...new Set(requested)].filter(id => canAccessStudio(req.user!, id));
    return { year, ids };
  };

  app.get('/api/plan/export', permission('export'), asyncRoute(async (req: any, res: any) => {
    const { year, ids } = resolveScope(req);
    if (!ids.length) return res.status(403).json({ error: 'No location in scope for this account.' });
    const format = String(req.query.format || 'json').toLowerCase();
    const doc = buildYearPlan({ year, studioIds: ids, userId: req.user!.id });
    const stamp = new Date().toISOString().slice(0, 10);
    const scopeName = doc.scope.type === 'portfolio' ? 'all-locations' : String(doc.scope.studios[0]?.name || 'studio').toLowerCase().replaceAll(' ', '-');
    const base = `p57-sales-plan-${year}-${scopeName}-${stamp}`;

    audit({
      userId: req.user!.id,
      action: 'export_plan',
      entityType: 'plan',
      entityId: year,
      after: { format, studios: ids },
    });

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${base}.json"`);
      return res.send(JSON.stringify(doc, null, 2));
    }
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${base}.csv"`);
      return res.send(renderPlanCsv(doc));
    }
    if (format === 'md' || format === 'markdown') {
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${base}.md"`);
      return res.send(renderPlanMarkdown(doc));
    }
    if (format === 'xlsx' || format === 'excel') {
      const buffer = await renderPlanXlsx(doc);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${base}.xlsx"`);
      return res.send(buffer);
    }
    return res.status(400).json({ error: `Unknown export format “${format}”.` });
  }));

  // The dialog needs to know what a download will contain before it downloads it.
  app.get('/api/plan/export/preview', permission('export'), (req: any, res: any) => {
    const { year, ids } = resolveScope(req);
    if (!ids.length) return res.status(403).json({ error: 'No location in scope for this account.' });
    const doc = buildYearPlan({ year, studioIds: ids, userId: req.user!.id });
    const months = doc.studios.reduce((n, s) => n + s.months.length, 0);
    const withOffers = doc.studios.reduce(
      (n, s) => n + s.months.filter((m: any) => m.offers.length).length,
      0,
    );
    res.json({
      year,
      scope: doc.scope,
      totals: doc.totals,
      counts: { studios: doc.studios.length, months, monthsWithOffers: withOffers, offers: doc.totals.offers },
      formats: ['json', 'csv', 'xlsx', 'md'],
      generatedAt: doc.generatedAt,
    });
  });
}
