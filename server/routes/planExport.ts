import type { Express } from 'express';
import { db, audit } from '../db.js';
import { permission } from '../lib/auth.js';
import { canAccessStudio } from '../lib/auth.js';
import { asyncRoute } from '../http.js';
import {
  buildYearPlan,
  renderPlanCopy,
  renderPlanCsv,
  renderPlanDocument,
  renderPlanMarkdown,
  renderPlanXlsx,
  scopePlanToMonth,
} from '../lib/planExport.js';

/* The full-year plan as a file.

   Five formats, one document, and the whole plan in each of them — not just the offers.
   JSON is the round-trip format — it can be edited and imported back. CSV is one row per offer
   for the spreadsheet the studio already has. Excel carries a sheet per section: cover,
   overview, execution, collateral, CRM, plus the month grid, the dates and the assumptions.
   Markdown survives a paste into a deck or a message. HTML is the print document — A4, a page
   per month, "save as PDF" from any browser.

   `month=1..12` narrows the file to one month; without it the file is the year. */

export default function registerPlanExportRoutes(app: Express) {
  const resolveScope = (req: any) => {
    const year = Number(req.query.year || 2027);
    const raw = String(req.query.studios ?? req.query.studio ?? 'all');
    const requested =
      raw === 'all' || raw === ''
        ? (
            db
              .prepare("SELECT id FROM studios WHERE name IN ('Kemps Corner','Bandra','Kenkere House','Pop-up')")
              .all() as any[]
          ).map(row => Number(row.id))
        : raw
            .split(',')
            .map(Number)
            .filter(n => Number.isInteger(n) && n > 0);
    const ids = [...new Set(requested)].filter(id => canAccessStudio(req.user!, id));
    const month = Number(req.query.month || 0);
    return { year, ids, month: Number.isInteger(month) && month >= 1 && month <= 12 ? month : null };
  };

  const scopeLabel = (doc: any) => {
    const where =
      doc.scope.type === 'portfolio'
        ? 'all-locations'
        : String(doc.scope.studios[0]?.name || 'studio')
            .toLowerCase()
            .replaceAll(' ', '-');
    if (!doc.month) return where;
    const name = String(doc.studios[0]?.months[0]?.name || `month-${doc.month}`).toLowerCase();
    return `${where}-${name}`;
  };

  app.get(
    '/api/plan/export',
    permission('export'),
    asyncRoute(async (req: any, res: any) => {
      const { year, ids, month } = resolveScope(req);
      if (!ids.length) return res.status(403).json({ error: 'No location in scope for this account.' });
      const format = String(req.query.format || 'json').toLowerCase();
      const doc = scopePlanToMonth(buildYearPlan({ year, studioIds: ids, userId: req.user!.id }), month);
      const stamp = new Date().toISOString().slice(0, 10);
      const base = `p57-sales-plan-${year}-${scopeLabel(doc)}-${stamp}`;

      audit({
        userId: req.user!.id,
        action: 'export_plan',
        entityType: 'plan',
        entityId: year,
        after: { format, studios: ids, month },
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
      if (format === 'html' || format === 'pdf' || format === 'print') {
        // The print document: opens in the browser and prints to A4, one page per month.
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Content-Disposition', `inline; filename="${base}.html"`);
        return res.send(renderPlanDocument(doc));
      }
      if (format === 'xlsx' || format === 'excel') {
        const buffer = await renderPlanXlsx(doc);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${base}.xlsx"`);
        return res.send(buffer);
      }
      return res.status(400).json({ error: `Unknown export format “${format}”.` });
    }),
  );

  // The same document as text, for the clipboard rather than the downloads folder: a message
  // for WhatsApp or an email, Markdown for a doc, CSV for a sheet, JSON for a script.
  app.get(
    '/api/plan/copy',
    permission('export'),
    asyncRoute(async (req: any, res: any) => {
      const { year, ids, month } = resolveScope(req);
      if (!ids.length) return res.status(403).json({ error: 'No location in scope for this account.' });
      const doc = scopePlanToMonth(buildYearPlan({ year, studioIds: ids, userId: req.user!.id }), month);
      const rendered = renderPlanCopy(doc, String(req.query.format || 'text'));
      if (!rendered) return res.status(400).json({ error: `Unknown copy format “${req.query.format}”.` });
      audit({
        userId: req.user!.id,
        action: 'copy_plan',
        entityType: 'plan',
        entityId: year,
        after: { format: rendered.format, studios: ids, month },
      });
      res.json({
        year,
        format: rendered.format,
        mime: rendered.mime,
        chars: rendered.text.length,
        lines: rendered.text.split('\n').length,
        scope: doc.scope,
        text: rendered.text,
      });
    }),
  );

  // The dialog needs to know what a download will contain before it downloads it.
  app.get('/api/plan/export/preview', permission('export'), (req: any, res: any) => {
    const { year, ids, month } = resolveScope(req);
    if (!ids.length) return res.status(403).json({ error: 'No location in scope for this account.' });
    const doc = scopePlanToMonth(buildYearPlan({ year, studioIds: ids, userId: req.user!.id }), month);
    const months = doc.studios.reduce((n: number, s: any) => n + s.months.length, 0);
    const withOffers = doc.studios.reduce(
      (n: number, s: any) => n + s.months.filter((m: any) => m.offers.length).length,
      0,
    );
    const sends = doc.studios.reduce(
      (n: number, s: any) => n + s.months.reduce((m: number, x: any) => m + (x.crm?.sends?.length || 0), 0),
      0,
    );
    res.json({
      year,
      month,
      scope: doc.scope,
      totals: doc.totals,
      counts: {
        studios: doc.studios.length,
        months,
        monthsWithOffers: withOffers,
        offers: doc.totals.offers,
        collateralPieces: doc.studios.reduce(
          (n: number, s: any) => n + s.months.reduce((m: number, x: any) => m + (x.collateral?.pieces?.length || 0), 0),
          0,
        ),
        crmSends: sends,
      },
      formats: ['xlsx', 'html', 'md', 'json', 'csv'],
      monthsAvailable: [...new Set(doc.studios.flatMap((s: any) => s.months.map((m: any) => m.month)))].sort(
        (a: any, b: any) => a - b,
      ),
      generatedAt: doc.generatedAt,
    });
  });
}
