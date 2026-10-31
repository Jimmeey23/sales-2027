import type { Express } from 'express';
import { db, audit } from '../db.js';
import { canAccessStudio, permission } from '../lib/auth.js';
import { bodyError } from '../http.js';
import { selection, saveSelection } from '../lib/linkedOffers.js';
import { persistOffer, validateOfferForSave } from './offers.js';

/* Importing offers from a file.

   A studio head plans in a spreadsheet or a JSON file and needs it in the app, without
   retyping eighteen offers. This takes either a hand-written list of offers or a plan
   export (the `p57-sales-plan/1` document) and reconciles it against the offer bank:

     add      create what is missing, leave what exists alone
     upsert   create what is missing, update what matches (by id, else by name)
     replace  upsert, and make the imported offers exactly what the chosen month runs

   Matching is by id when the file carries one, and by name within the location otherwise,
   so an export can be edited and imported back without duplicating anything. Nothing is
   written on a preview (`dryRun`), and every write goes through the same validation the
   offer form uses — the discount guardrails, the studio cap and the financial model. */

type Mode = 'add' | 'upsert' | 'replace';
const MODES: Mode[] = ['add', 'upsert', 'replace'];

const asNumber = (value: any) => {
  const n = Number(value);
  return Number.isFinite(n) && n !== 0 ? n : null;
};

/** One incoming offer, in the field names the offer editor and the API already speak. */
function toPayload(raw: any, defaults: { studioId: number | null; year: number; month: number | null }) {
  const mechanics = raw.mechanics ?? raw.engineering ?? {};
  return {
    id: asNumber(raw.id),
    name: String(raw.name ?? raw.offer ?? raw.title ?? '').trim(),
    headline: raw.headline ?? raw.hero ?? undefined,
    customerCopy: raw.customerCopy ?? raw.customer_copy ?? raw.copy ?? undefined,
    internalDescription: raw.internalDescription ?? raw.internal_description ?? raw.description ?? undefined,
    rationale: raw.rationale ?? raw.why ?? undefined,
    objective: raw.objective ?? raw.goal ?? undefined,
    offerType: raw.offerType ?? raw.offer_type ?? raw.type ?? undefined,
    studioId: asNumber(raw.studioId ?? raw.studio_id ?? raw.studio) ?? defaults.studioId,
    year: asNumber(raw.year) ?? defaults.year,
    month: raw.month === null ? null : (asNumber(raw.month) ?? defaults.month),
    audience: raw.audience ?? undefined,
    excludedAudience: raw.excludedAudience ?? raw.excluded_audience ?? undefined,
    eligibleProducts: raw.eligibleProducts ?? raw.eligible_products ?? undefined,
    benefit: raw.benefit ?? raw.promise ?? raw.offerLine ?? undefined,
    mechanics,
    validityStart: raw.validityStart ?? raw.validity_start ?? raw.validity?.start ?? undefined,
    validityEnd: raw.validityEnd ?? raw.validity_end ?? raw.validity?.end ?? undefined,
    redemptionConditions: raw.redemptionConditions ?? raw.redemption_conditions ?? raw.conditions ?? undefined,
    targetPurchases: raw.targetPurchases ?? raw.target_purchases ?? raw.buyers ?? undefined,
    expectedAsp: raw.expectedAsp ?? raw.expected_asp ?? raw.price ?? undefined,
    expectedRevenue: raw.expectedRevenue ?? raw.expected_revenue ?? raw.revenue ?? undefined,
    effectiveDiscount: raw.effectiveDiscount ?? raw.effective_discount ?? raw.discount ?? undefined,
    cta: raw.cta ?? raw.callToAction ?? undefined,
    status: raw.status ?? undefined,
    approvalStatus: raw.approval ?? raw.approvalStatus ?? raw.approval_status ?? undefined,
    generationSource: raw.generationSource ?? raw.generation_source ?? 'json_import',
    dataMode: 'user',
  };
}

/** Merge the incoming payload over the stored row, so a partial file never blanks a field. */
function mergeExisting(existing: any, payload: any) {
  const merged: any = { ...existing, ...payload };
  merged.id = existing.id;
  merged.studioId = payload.studioId ?? existing.studio_id;
  merged.year = payload.year ?? existing.year;
  merged.month = payload.month ?? existing.month;
  for (const key of Object.keys(payload)) if (payload[key] === undefined) delete merged[key];
  return merged;
}

/** The offer form clamps a discount to the studio cap rather than rejecting it; say so. */
function capNote(row: any, payload: any) {
  try {
    const asked = Number(payload?.mechanics?.discountPercent);
    const ceiling = Number(JSON.parse(row.mechanics || '{}').maxDiscountPercent);
    if (Number.isFinite(asked) && Number.isFinite(ceiling) && asked > ceiling + 0.5)
      return `Asked for ${asked}% off; this location caps the discount at ${Math.round(ceiling)}%.`;
  } catch {
    /* a malformed mechanics block is reported by the validator, not here */
  }
  return null;
}

const JSON_COLUMNS = new Set([
  'mechanics',
  'financials',
  'eligible_products',
  'risks',
  'success_metrics',
  'provenance',
  'annual_perks',
]);

/** Deep-equal with sorted keys, so a reordered JSON block is not mistaken for an edit. */
function canonical(value: any): string {
  if (value === null || value === undefined) return 'null';
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (typeof value === 'object')
    return `{${Object.keys(value)
      .sort()
      .map(key => `${JSON.stringify(key)}:${canonical(value[key])}`)
      .join(',')}}`;
  if (typeof value === 'number') return String(Math.round(value * 100) / 100);
  return JSON.stringify(value);
}

const rupees = (value: any) =>
  Number.isFinite(Number(value))
    ? `₹${(Number(value) / 100000).toLocaleString('en-IN', { maximumFractionDigits: 1 })}L`
    : '—';

/** The offer form recomputes revenue from the mechanics; a big move is worth flagging. */
function revenueNote(row: any, before: any) {
  const now = Number(row.expected_revenue),
    was = Number(before);
  if (!Number.isFinite(now) || !Number.isFinite(was) || was === 0) return null;
  if (Math.abs(now - was) < Math.max(2, was * 0.001)) return null;
  return `Revenue recomputed from the mechanics: ${rupees(was)} → ${rupees(now)}.`;
}

const sameValue = (key: string, a: any, b: any) => {
  if (JSON_COLUMNS.has(key)) {
    const parse = (value: any) => {
      if (typeof value !== 'string') return value;
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    };
    return canonical(parse(a)) === canonical(parse(b));
  }
  if (typeof a === 'number' || typeof b === 'number') {
    const left = Number(a),
      right = Number(b);
    if (Number.isFinite(left) && Number.isFinite(right)) return Math.abs(left - right) < 0.01;
  }
  return String(a ?? '') === String(b ?? '');
};

export default function registerOfferImportRoutes(app: Express) {
  app.post('/api/offers/import', permission('offer_edit'), (req: any, res: any) => {
    const body = req.body || {};
    const mode = String(body.mode || 'upsert') as Mode;
    if (!MODES.includes(mode)) throw bodyError(`Unknown import mode “${mode}”. Use add, upsert or replace.`);
    const dryRun = body.dryRun !== false;
    const canCreate = req.user.permissions.includes('offer_create') || req.user.permissions.includes('write');
    if (!dryRun && !canCreate) throw bodyError('Your role cannot create offers.', 403);

    const defaultStudio = asNumber(body.studioId ?? body.studio_id ?? body.studio);
    const year = asNumber(body.year) ?? 2027;
    const month = body.month === null ? null : asNumber(body.month);

    // Accept a flat list, or a plan export document, or { offers: [...] }.
    let incoming: any[] = [];
    if (Array.isArray(body)) incoming = body;
    else if (Array.isArray(body.offers)) incoming = body.offers;
    else if (Array.isArray(body.studios)) {
      for (const studio of body.studios) {
        const studioId = asNumber(studio?.studio?.id ?? studio?.studioId);
        for (const m of Array.isArray(studio?.months) ? studio.months : []) {
          for (const offer of Array.isArray(m?.offers) ? m.offers : []) {
            incoming.push({ ...offer, studioId: studioId ?? offer.studioId, month: m.month, year });
          }
        }
      }
    }
    if (!incoming.length) throw bodyError('No offers found in that JSON.');
    if (incoming.length > 500) throw bodyError('Import at most 500 offers at a time.', 413);

    const rows: Array<{ index: number; name: string; action: string; id?: number; messages: string[] }> = [];
    const plan: Array<{ row: any; index: number; existing: any }> = [];

    incoming.forEach((raw, index) => {
      const messages: string[] = [];
      try {
        const payload = toPayload(raw, { studioId: defaultStudio, year, month });
        if (!payload.name || payload.name.length < 3) throw bodyError('Offer name must contain at least 3 characters.');
        const studioId = asNumber(payload.studioId);
        if (!studioId) throw bodyError('Each offer needs a studioId, or a studioId on the import.');
        if (!canAccessStudio(req.user, studioId))
          throw bodyError('Studios outside your access scope cannot be imported.', 403);
        const studio = db.prepare('SELECT id,name FROM studios WHERE id=?').get(studioId);
        if (!studio) throw bodyError(`Studio ${studioId} does not exist.`);

        const existing = payload.id
          ? (db.prepare('SELECT * FROM offers WHERE id=?').get(payload.id) as any)
          : (db
              .prepare(
                "SELECT * FROM offers WHERE studio_id=? AND year=? AND lower(name)=lower(?) AND status NOT IN ('archived','rejected') ORDER BY id DESC",
              )
              .get(studioId, payload.year, payload.name) as any);

        if (existing && !canAccessStudio(req.user, Number(existing.studio_id))) {
          throw bodyError('That offer belongs to a studio outside your access scope.', 403);
        }
        if (existing && mode === 'add') {
          rows.push({
            index,
            name: payload.name,
            action: 'skip',
            id: existing.id,
            messages: ['Already in the offer bank.'],
          });
          return;
        }
        if (!existing && mode === 'replace') {
          // replace is an upsert under the hood; a missing offer is simply created.
        }
        const action = existing ? 'update' : 'create';
        if (action === 'update' && !req.user.permissions.includes('offer_edit')) {
          throw bodyError('Your role cannot edit offers.', 403);
        }
        const merged = existing ? mergeExisting(existing, payload) : payload;
        // Creation goes through the same path as the offer form, including the discount cap.
        if (action === 'create') {
          const offer = dryRun ? null : persistOffer(merged, req.user);
          const validated = validateOfferForSave(merged, req.user);
          const capMessage = capNote(validated, payload);
          if (capMessage) messages.push(capMessage);
          const revenueMessage = revenueNote(validated, payload.expectedRevenue);
          if (revenueMessage) messages.push(revenueMessage);
          rows.push({
            index,
            name: payload.name,
            action: 'create',
            id: offer?.id,
            messages,
          });
          if (offer) plan.push({ row: offer, index, existing: null });
          return;
        }
        const row = validateOfferForSave(merged, req.user);
        if (Number(row.year) === 2027) row.month = null;
        const capMessage = capNote(row, payload);
        if (capMessage) messages.push(capMessage);
        const revenueMessage = revenueNote(row, existing.expected_revenue);
        if (revenueMessage) messages.push(revenueMessage);
        // Re-importing an export unchanged should not bump versions or write audits, so an
        // identical row is reported as a skip rather than as a no-op update.
        const changed = Object.entries(row).filter(([key, value]) => !sameValue(key, value, (existing as any)[key]));
        if (!changed.length) {
          rows.push({ index, name: payload.name, action: 'skip', id: existing.id, messages: ['No change.'] });
          return;
        }
        if (!dryRun) {
          const columns = Object.keys(row);
          db.prepare(
            `UPDATE offers SET ${columns.map(c => `${c}=?`).join(',')}, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
          ).run(...Object.values(row), existing.id);
          const version =
            Number(
              (db.prepare('SELECT MAX(version) v FROM offer_versions WHERE offer_id=?').get(existing.id) as any)?.v ||
                0,
            ) + 1;
          const after = db.prepare('SELECT * FROM offers WHERE id=?').get(existing.id);
          db.prepare('INSERT INTO offer_versions(offer_id,version,snapshot,changed_by) VALUES (?,?,?,?)').run(
            existing.id,
            version,
            JSON.stringify(after),
            req.user!.id,
          );
          audit({
            userId: req.user!.id,
            action: 'update',
            entityType: 'offer',
            entityId: existing.id,
            studioId: Number(existing.studio_id),
            before: existing,
            after,
            reason: 'JSON import',
          });
        }
        rows.push({ index, name: payload.name, action: 'update', id: existing.id, messages });
      } catch (error: any) {
        rows.push({
          index,
          name: String(raw?.name ?? raw?.offer ?? `Row ${index + 1}`),
          action: 'error',
          messages: [String(error?.message || 'Could not import this offer.')],
        });
      }
    });

    // "replace" makes the imported offers exactly what the month runs, so a month can be
    // re-cut from a file in one step. It only touches that month's selection, never the bank.
    let attached = null as null | { studioId: number; month: number; offers: number };
    if (mode === 'replace' && month) {
      const byStudio = new Map<number, number[]>();
      for (const entry of rows) {
        if (entry.action === 'error') continue;
        const raw = incoming[entry.index];
        const studioId = asNumber(raw?.studioId ?? raw?.studio_id) ?? defaultStudio;
        if (!studioId) continue;
        const current = selection(Number(studioId), year, month);
        const id =
          entry.id ??
          (
            db
              .prepare('SELECT id FROM offers WHERE studio_id=? AND year=? AND lower(name)=lower(?) ORDER BY id DESC')
              .get(Number(studioId), year, entry.name) as any
          )?.id;
        if (!id) continue;
        const next = byStudio.get(Number(studioId)) || [...current.offerIds];
        if (!next.includes(Number(id))) next.push(Number(id));
        byStudio.set(Number(studioId), next);
      }
      for (const [studioId, ids] of byStudio) {
        if (!dryRun)
          saveSelection(studioId, year, month, { newcomer: null, lapsed: null, renewal: null }, ids, req.user!.id);
        attached = { studioId, month, offers: ids.length };
      }
    }

    const summary = {
      create: rows.filter(r => r.action === 'create').length,
      update: rows.filter(r => r.action === 'update').length,
      skip: rows.filter(r => r.action === 'skip').length,
      error: rows.filter(r => r.action === 'error').length,
    };
    if (!dryRun) {
      audit({
        userId: req.user!.id,
        action: 'import',
        entityType: 'offer',
        entityId: year,
        after: { mode, summary, month, studios: [...new Set(incoming.map(o => o?.studioId).filter(Boolean))] },
        reason: 'JSON import',
      });
    }
    res.json({ dryRun, mode, year, month, summary, attached, rows });
  });
}
