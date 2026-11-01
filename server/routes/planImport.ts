import type { Express } from 'express';
import { db } from '../db.js';
import { canAccessStudio, permission } from '../lib/auth.js';
import { bodyError } from '../http.js';
import {
  IMPORT_MODES,
  applySalesPlan,
  importedPlan,
  parseSalesPlan,
  previewSalesPlan,
  type ImportMode,
} from '../lib/salesPlanImport.js';

/* Bringing a year plan back in.

   The export ships `p57-sales-plan/1`; this is its way home. One request carries the whole
   document, the location it belongs to and the mode — add, modify or replace — and answers
   with either the preview (the default) or what was written.

   The location is resolved from the document itself when it names one, so a file exported
   from Kemps Corner lands on Kemps Corner without a picker, and a session that cannot open
   that location is refused rather than writing into it. */

type Studio = { id: number; name: string; code: string | null; aliases: string | null };

function normalise(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ');
}

function studioResolver(studios: Studio[]) {
  const byKey = new Map<string, number>();
  for (const studio of studios) {
    byKey.set(normalise(studio.name), studio.id);
    if (studio.code) byKey.set(normalise(studio.code), studio.id);
    try {
      for (const alias of JSON.parse(studio.aliases || '[]') as string[])
        byKey.set(normalise(String(alias)), studio.id);
    } catch {
      /* an alias list that is not JSON simply adds nothing */
    }
  }
  return (value: any): number | null => {
    if (value === undefined || value === null || value === '') return null;
    const asNumber = Number(value);
    if (Number.isInteger(asNumber) && studios.some(studio => studio.id === asNumber)) return asNumber;
    return byKey.get(normalise(String(value))) ?? null;
  };
}

export default function registerPlanImportRoutes(app: Express) {
  /** What a location's year was last imported from, so the screen can say so. */
  app.get('/api/plan/import/state', (req: any, res) => {
    const studioId = Number(req.query.studio || req.query.studioId || 0);
    const year = Number(req.query.year || 2027);
    if (!Number.isInteger(studioId) || studioId <= 0) throw bodyError('Name a location.');
    if (!canAccessStudio(req.user!, studioId)) throw bodyError('This studio is outside your access scope.', 403);
    res.json({ studioId, year, imported: importedPlan(studioId, year) });
  });

  app.post('/api/plan/import', permission('target_edit'), (req: any, res) => {
    const body = req.body || {};
    const mode = String(body.mode || 'modify') as ImportMode;
    if (!IMPORT_MODES.includes(mode)) throw bodyError(`Unknown import mode “${mode}”. Use add, modify or replace.`);
    const dryRun = body.dryRun !== false;
    const approve = body.approve === true;
    if (approve && !req.user.permissions.includes('target_approve'))
      throw bodyError('Approving targets needs the target-approve permission.', 403);
    const useRates = body.useRates !== false;

    const raw = body.plan ?? body.text ?? body.json ?? body.document ?? null;
    if (!raw) throw bodyError('Paste the plan document (or upload its file) first.');
    let document: any;
    try {
      document = typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch (error: any) {
      throw bodyError(`That JSON could not be parsed: ${error.message}`);
    }
    if (typeof raw === 'string' && !document) throw bodyError('That document is empty.');

    const plan = parseSalesPlan(document);

    const studios = db.prepare('SELECT id,name,code,aliases FROM studios ORDER BY id').all() as Studio[];
    const resolve = studioResolver(studios);
    // The document knows which location it belongs to; a location chosen in the app is the
    // fallback for a file that does not say.
    const studioId =
      (plan.studioId && studios.some(entry => entry.id === plan.studioId) ? plan.studioId : null) ??
      resolve(plan.studioName) ??
      resolve(body.studioId) ??
      null;
    if (!studioId)
      throw bodyError(
        plan.studioName
          ? `The document names “${plan.studioName}”, which is not a location in this workspace.`
          : 'The document does not name a location, and none was chosen.',
      );
    const studio = studios.find(entry => entry.id === studioId);
    if (!canAccessStudio(req.user!, studioId))
      throw bodyError('Studios outside your access scope cannot be imported.', 403);

    const year = Number(body.year) || plan.year;
    const context = { studioId, year, mode, approve, useRates, userId: req.user!.id };
    const preview = previewSalesPlan(plan, context);
    if (dryRun)
      return res.json({
        dryRun,
        mode,
        studio: { id: studioId, name: studio?.name },
        year,
        schema: plan.schema,
        hash: plan.hash,
        totals: preview.totals,
        months: preview.months,
        warnings: preview.warnings,
        assumptions: Object.keys(plan.trailing),
        imported: importedPlan(studioId, year),
      });

    const result = applySalesPlan(plan, context);
    res.json({
      dryRun,
      mode,
      studio: { id: studioId, name: studio?.name },
      year,
      schema: plan.schema,
      hash: plan.hash,
      totals: preview.totals,
      months: preview.months.map(month => {
        const written = result.months.find(entry => entry.month === month.month);
        return { ...month, action: written?.action ?? month.action, written };
      }),
      warnings: preview.warnings,
      assumptions: result.assumptions,
      summary: result.summary,
    });
  });
}
