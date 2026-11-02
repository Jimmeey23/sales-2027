import type { Express } from 'express';
import { db } from '../db.js';
import { canAccessStudio, permission } from '../lib/auth.js';
import { bodyError } from '../http.js';
import {
  IMPORT_MODES,
  applySalesPlan,
  applySalesPlans,
  importedPlan,
  parseSalesPlanSet,
  previewSalesPlan,
  resolveStudioId,
  studioKeys,
  PORTFOLIO_SETTING,
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
  /** What the last portfolio import said about the year: its policy, the gaps it admits to,
      what changed since the last document, and what it knows about each location. */
  app.get('/api/plan/portfolio', (req: any, res) => {
    const row = db.prepare('SELECT value, updated_at FROM settings WHERE key=?').get(PORTFOLIO_SETTING) as any;
    if (!row) return res.json({ portfolio: null, intelligence: [] });
    let stored: any = null;
    try {
      stored = JSON.parse(row.value);
    } catch {
      stored = null;
    }
    const intelligence = (stored?.locations || [])
      .filter((entry: any) => entry.studioId && canAccessStudio(req.user!, entry.studioId))
      .map((entry: any) => {
        const saved = db
          .prepare('SELECT value FROM settings WHERE key=?')
          .get(`plan.studioIntelligence.${entry.studioId}`) as any;
        let detail: any = null;
        try {
          detail = saved ? JSON.parse(saved.value) : null;
        } catch {
          detail = null;
        }
        return { ...entry, intelligence: detail };
      });
    res.json({ portfolio: stored, intelligence, updatedAt: row.updated_at });
  });

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

    const set = parseSalesPlanSet(document);
    const studios = db.prepare('SELECT id,name,code,aliases FROM studios ORDER BY id').all() as Studio[];

    /* A document that names several locations is a portfolio: every location in it is imported,
       into its own studio and its own year. Nothing is written until every location has been
       matched and cleared for access, so a portfolio never lands in half the buildings. */
    if (set.documents.length > 1) {
      const resolved = set.documents.map(entry => ({
        document: entry,
        studioId: resolveStudioId(studios, { id: entry.studioId, name: entry.studioName }),
      }));
      const unresolved = resolved.filter(entry => !entry.studioId);
      if (unresolved.length)
        throw bodyError(
          `The document names ${unresolved
            .map(entry => `“${entry.document.studioName || entry.document.studioId || 'an unnamed location'}”`)
            .join(', ')}, which ${
            unresolved.length === 1 ? 'is not a location' : 'are not locations'
          } in this workspace.`,
        );
      const blocked = resolved.filter(entry => !canAccessStudio(req.user!, entry.studioId!));
      if (blocked.length)
        throw bodyError(
          `This portfolio covers ${blocked
            .map(entry => studios.find(studio => studio.id === entry.studioId)?.name)
            .join(', ')}, outside your access scope.`,
          403,
        );

      const keys = studioKeys(set, studios);
      const locations = resolved.map(entry => ({
        key: [...keys.entries()].find(([, id]) => id === entry.studioId)?.[0] || null,
        studio: studios.find(studio => studio.id === entry.studioId) || null,
        year: entry.document.year,
        schema: entry.document.schema,
        hash: entry.document.hash,
        totals: entry.document.totals,
      }));
      const portfolio = {
        version: set.version,
        generatedAt: set.generatedAt,
        year: set.year,
        hash: set.hash,
        totals: set.totals,
        dataGaps: set.dataGaps,
        changesFromPrevious: set.changesFromPrevious,
        policy: set.policy,
        offerBank: set.offerBank.length,
        locations: locations.map(entry => ({
          key: entry.key,
          studioId: entry.studio?.id ?? null,
          name: entry.studio?.name ?? null,
          year: entry.year,
          target: entry.totals.target,
          priorYear: entry.totals.priorYear,
          growthPercent: entry.totals.growthPercent,
          offers: entry.totals.offers,
        })),
      };

      if (dryRun) {
        const previews = resolved.map(entry => {
          const preview = previewSalesPlan(entry.document, {
            studioId: entry.studioId!,
            year: Number(body.year) || entry.document.year,
            mode,
            approve,
            useRates,
            userId: req.user!.id,
          });
          return {
            studio: { id: entry.studioId, name: studios.find(s => s.id === entry.studioId)?.name },
            year: Number(body.year) || entry.document.year,
            schema: entry.document.schema,
            hash: entry.document.hash,
            totals: preview.totals,
            months: preview.months,
            warnings: preview.warnings,
            imported: importedPlan(entry.studioId!, Number(body.year) || entry.document.year),
          };
        });
        return res.json({ dryRun, mode, portfolio, studios: previews });
      }

      const applied = applySalesPlans(
        set,
        {
          year: Number(body.year) || set.year,
          mode,
          approve,
          useRates,
          userId: req.user!.id,
        },
        studios,
      );
      return res.json({
        dryRun,
        mode,
        portfolio,
        studios: applied.studios.map(entry => ({
          studio: entry.studio,
          totals: entry.totals,
          summary: entry.result.summary,
          assumptions: entry.result.assumptions,
          months: entry.result.months,
        })),
        unresolved: applied.unresolved,
        context: applied.context,
      });
    }

    const plan = set.documents[0];
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
