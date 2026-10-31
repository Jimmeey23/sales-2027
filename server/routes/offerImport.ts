import { parse as parseCsv } from 'csv-parse/sync';
import type { Express } from 'express';
import { db, audit } from '../db.js';
import { canAccessStudio, permission } from '../lib/auth.js';
import { bodyError } from '../http.js';
import { selection, saveSelection } from '../lib/linkedOffers.js';
import { persistOffer, validateOfferForSave } from './offers.js';

/* Importing offers from a file.

   A studio head plans in a spreadsheet or a JSON file and needs it in the app, without
   retyping eighteen offers. This takes either a hand-written list of offers, a plan
   export (the `p57-sales-plan/1` document), or a CSV/TSV pasted straight from a sheet,
   and reconciles it against the offer bank:

     add      create what is missing, leave what exists alone
     upsert   create what is missing, update what matches (by id, else by name)
     replace  upsert, then make the chosen month run exactly the imported offers

   Matching is by id when the file carries one, and by name within the location otherwise,
   so an export can be edited and imported back without duplicating anything. Nothing is
   written on a preview (`dryRun`), and every write goes through the same validation the
   offer form uses — the discount guardrails, the studio cap and the financial model.

   Bulk work happens here rather than in eighteen separate edits: one month and location
   for the whole file, prices or forecasts scaled, dates shifted, a discount ceiling, a
   find-and-replace over names, and per-row decisions taken in the preview. */

type Mode = 'add' | 'upsert' | 'replace';
const MODES: Mode[] = ['add', 'upsert', 'replace'];

const asNumber = (value: any) => {
  const n = Number(value);
  return Number.isFinite(n) && n !== 0 ? n : null;
};
const numeric = (value: any) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

/** The bulk edits a file can be put through before any row is validated. */
type Bulk = {
  studioId: number | null;
  year: number | null;
  month: number | null;
  slot: string | null;
  shiftDays: number;
  scaleRevenue: number;
  scalePrice: number;
  scaleBuyers: number;
  maxDiscount: number | null;
  find: string | null;
  replace: string | null;
  prefix: string;
  suffix: string;
  runAds: boolean | null;
  notes: string | null;
};

const SLOTS = ['newcomer', 'lapsed', 'renewal'];

function readBulk(body: any): Bulk {
  const raw = body.bulk && typeof body.bulk === 'object' ? body.bulk : {};
  const pick = (...keys: string[]) => {
    for (const key of keys) if (raw[key] !== undefined && raw[key] !== null && raw[key] !== '') return raw[key];
    return undefined;
  };
  const scale = (value: any) => {
    const n = numeric(value);
    return n && n > 0 && n !== 1 ? n : 1;
  };
  const slot = pick('slot', 'planSlot');
  return {
    studioId: asNumber(pick('studioId', 'studio')),
    year: asNumber(pick('year')),
    month: numeric(pick('month')),
    slot: slot && SLOTS.includes(String(slot)) ? String(slot) : null,
    shiftDays: numeric(pick('shiftDays', 'shift')) || 0,
    scaleRevenue: scale(pick('scaleRevenue', 'revenueFactor')),
    scalePrice: scale(pick('scalePrice', 'priceFactor')),
    scaleBuyers: scale(pick('scaleBuyers', 'buyersFactor')),
    maxDiscount: numeric(pick('maxDiscount', 'discountCeiling')),
    find: typeof pick('find') === 'string' && pick('find') ? String(pick('find')) : null,
    replace: typeof pick('replace') === 'string' ? String(pick('replace')) : null,
    prefix: typeof pick('prefix') === 'string' ? String(pick('prefix')) : '',
    suffix: typeof pick('suffix') === 'string' ? String(pick('suffix')) : '',
    runAds: typeof pick('runAds') === 'boolean' ? Boolean(pick('runAds')) : null,
    notes: typeof pick('notes') === 'string' && pick('notes') ? String(pick('notes')) : null,
  };
}

const shiftDate = (value: any, days: number) => {
  if (!value || !days) return value;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return value;
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

/** The bulk pass: naming, dates, targets and the month/location, applied before validation. */
function applyBulk(raw: any, bulk: Bulk) {
  const out: any = { ...raw };
  const rename = (value: any) => {
    if (typeof value !== 'string' || !value) return value;
    let next = bulk.find ? value.split(bulk.find).join(bulk.replace ?? '') : value;
    next = `${bulk.prefix}${next}${bulk.suffix}`;
    return next;
  };
  if (bulk.find || bulk.prefix || bulk.suffix) {
    out.name = rename(out.name ?? out.offer ?? out.title);
    delete out.offer;
    delete out.title;
  }
  if (bulk.studioId) {
    out.studioId = bulk.studioId;
    delete out.studio;
  }
  if (bulk.year) out.year = bulk.year;
  if (bulk.month !== null && bulk.month !== undefined) out.month = bulk.month;
  if (bulk.slot) out.slot = bulk.slot;
  if (bulk.runAds !== null) out.runAds = bulk.runAds;
  if (bulk.notes) out.notes = bulk.notes;
  if (bulk.shiftDays) {
    out.validityStart = shiftDate(out.validityStart ?? out.validity_start ?? out.validity?.start, bulk.shiftDays);
    out.validityEnd = shiftDate(out.validityEnd ?? out.validity_end ?? out.validity?.end, bulk.shiftDays);
    if (!out.validityStart && !out.validityEnd && out.validity) out.validity = { ...out.validity };
  }
  if (bulk.scaleRevenue !== 1) {
    const revenue = numeric(out.expectedRevenue ?? out.expected_revenue ?? out.revenue);
    if (revenue !== null) out.expectedRevenue = Math.round(revenue * bulk.scaleRevenue);
  }
  if (bulk.scalePrice !== 1) {
    const price = numeric(out.expectedAsp ?? out.expected_asp ?? out.price);
    if (price !== null) out.expectedAsp = Math.round(price * bulk.scalePrice);
  }
  if (bulk.scaleBuyers !== 1) {
    const buyers = numeric(out.targetPurchases ?? out.target_purchases ?? out.buyers);
    if (buyers !== null) out.targetPurchases = Math.max(1, Math.round(buyers * bulk.scaleBuyers));
  }
  if (bulk.maxDiscount !== null && out.mechanics && typeof out.mechanics === 'object') {
    const discount = numeric((out.mechanics as any).discountPercent);
    if (discount !== null && discount > bulk.maxDiscount)
      out.mechanics = { ...out.mechanics, discountPercent: bulk.maxDiscount };
  }
  return out;
}

/** One incoming offer, in the field names the offer editor and the API already speak. */
function toPayload(raw: any, defaults: { studioId: number | null; year: number; month: number | null }) {
  // Only carry a mechanics block when the file actually has one: an empty object would
  // overwrite the stored model and make the row's own forecast look inconsistent.
  const mechanics = raw.mechanics ?? raw.engineering ?? raw.mechanicsJson;
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
    mechanics:
      mechanics === undefined || mechanics === null || (typeof mechanics === 'object' && !Object.keys(mechanics).length)
        ? undefined
        : mechanics,
    validityStart: raw.validityStart ?? raw.validity_start ?? raw.validity?.start ?? undefined,
    validityEnd: raw.validityEnd ?? raw.validity_end ?? raw.validity?.end ?? undefined,
    redemptionConditions: raw.redemptionConditions ?? raw.redemption_conditions ?? raw.conditions ?? undefined,
    targetPurchases: raw.targetPurchases ?? raw.target_purchases ?? raw.buyers ?? undefined,
    expectedAsp: raw.expectedAsp ?? raw.expected_asp ?? raw.price ?? undefined,
    expectedRevenue: raw.expectedRevenue ?? raw.expected_revenue ?? raw.revenue ?? undefined,
    effectiveDiscount: raw.effectiveDiscount ?? raw.effective_discount ?? raw.discount ?? undefined,
    cta: raw.cta ?? raw.callToAction ?? undefined,
    planSlot: raw.slot ?? raw.planSlot ?? raw.plan_slot ?? undefined,
    planRank: raw.planRank ?? raw.plan_rank ?? undefined,
    runAds: raw.runAds ?? raw.run_ads ?? undefined,
    performanceNotes: raw.notes ?? raw.performanceNotes ?? undefined,
    status: raw.status ?? undefined,
    approvalStatus: raw.approval ?? raw.approvalStatus ?? raw.approval_status ?? undefined,
    // Left undefined so an update keeps the offer's own history; creates are labelled below.
    generationSource: raw.generationSource ?? raw.generation_source ?? undefined,
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
  // Provenance belongs to the offer, not to the file that happened to describe it.
  merged.generationSource = existing.generation_source;
  merged.dataMode = existing.data_mode || 'user';
  // A field the file does not mention keeps what the offer already says — otherwise a
  // three-column correction sheet would blank the other twenty fields.
  for (const key of Object.keys(payload)) if (payload[key] === undefined) merged[key] = existing[key];
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
    // A rupee of rounding is what an exported spreadsheet does to a forecast, not an edit.
    if (Number.isFinite(left) && Number.isFinite(right)) return Math.abs(left - right) < 1;
  }
  return String(a ?? '') === String(b ?? '');
};

const FIELD_LABELS: Record<string, string> = {
  name: 'Name',
  headline: 'Headline',
  customer_copy: 'Copy',
  internal_description: 'Internal note',
  rationale: 'Rationale',
  objective: 'Objective',
  offer_type: 'Type',
  audience: 'Audience',
  excluded_audience: 'Excludes',
  benefit: 'What is included',
  mechanics: 'Mechanics',
  validity_start: 'Starts',
  validity_end: 'Ends',
  redemption_conditions: 'Conditions',
  target_purchases: 'Buyers',
  expected_asp: 'Price',
  expected_revenue: 'Revenue',
  effective_discount: 'Discount',
  margin_impact: 'Contribution',
  status: 'Status',
  plan_slot: 'Slot',
  plan_rank: 'Rank',
  run_ads: 'Run ads',
  performance_notes: 'Notes',
  cta: 'CTA',
};

const show = (key: string, value: any) => {
  if (value === null || value === undefined || value === '') return '—';
  if (JSON_COLUMNS.has(key)) return canonical(value).slice(0, 60);
  if (['expected_asp', 'expected_revenue', 'margin_impact'].includes(key)) return rupees(value);
  if (key === 'effective_discount') return `${Number(value).toFixed(0)}%`;
  return String(value).replace(/\s+/g, ' ').slice(0, 60);
};

/** Fields the form derives; they move because something else moved, so they are not listed. */
const DERIVED = new Set(['financials', 'risks', 'success_metrics', 'expected_redemptions', 'updated_at']);

/** What an update actually changes, in words a planner can check against the file. */
function describeChanges(row: any, existing: any) {
  const out: Array<{ field: string; label: string; from: string; to: string }> = [];
  for (const [key, value] of Object.entries(row)) {
    if (DERIVED.has(key)) continue;
    if (existing[key] === undefined && value === null) continue;
    if (sameValue(key, value, existing[key])) continue;
    out.push({ field: key, label: FIELD_LABELS[key] || key, from: show(key, existing[key]), to: show(key, value) });
  }
  return out;
}

/** A spreadsheet's own column names, mapped onto the names the importer reads. */
const COLUMN_ALIASES: Record<string, string> = {
  offer: 'name',
  offer_name: 'name',
  offer_title: 'name',
  title: 'name',
  campaign: 'name',
  goal: 'objective',
  objective: 'objective',
  type: 'offerType',
  offer_type: 'offerType',
  headline: 'headline',
  hero: 'headline',
  copy: 'customerCopy',
  customer_copy: 'customerCopy',
  description: 'internalDescription',
  internal_description: 'internalDescription',
  internal_note: 'internalDescription',
  why: 'rationale',
  rationale: 'rationale',
  audience: 'audience',
  who: 'audience',
  excludes: 'excludedAudience',
  excluded_audience: 'excludedAudience',
  benefit: 'benefit',
  whats_included: 'benefit',
  promise: 'benefit',
  price: 'expectedAsp',
  asp: 'expectedAsp',
  expected_asp: 'expectedAsp',
  avg_ticket: 'expectedAsp',
  ticket: 'expectedAsp',
  revenue: 'expectedRevenue',
  expected_revenue: 'expectedRevenue',
  forecast: 'expectedRevenue',
  forecast_revenue: 'expectedRevenue',
  buyers: 'targetPurchases',
  units: 'targetPurchases',
  target_purchases: 'targetPurchases',
  discount: 'effectiveDiscount',
  effective_discount: 'effectiveDiscount',
  discount_percent: 'effectiveDiscount',
  contribution: 'marginImpact',
  margin: 'marginImpact',
  start: 'validityStart',
  starts: 'validityStart',
  from: 'validityStart',
  validity_start: 'validityStart',
  end: 'validityEnd',
  ends: 'validityEnd',
  to: 'validityEnd',
  validity_end: 'validityEnd',
  conditions: 'redemptionConditions',
  redemption_conditions: 'redemptionConditions',
  cta: 'cta',
  call_to_action: 'cta',
  slot: 'slot',
  plan_slot: 'slot',
  rank: 'planRank',
  plan_rank: 'planRank',
  run_ads: 'runAds',
  ads: 'runAds',
  notes: 'notes',
  status: 'status',
  studio: 'studioId',
  studio_id: 'studioId',
  location: 'studioId',
  month: 'month',
  year: 'year',
  id: 'id',
};

/** CSV/TSV pasted from a spreadsheet, read into the same rows a JSON array would give. */
function parseDelimited(text: string) {
  const firstLine = text.split(/\r?\n/).find(line => line.trim()) || '';
  const delimiter = firstLine.includes('\t')
    ? '\t'
    : firstLine.split(';').length > firstLine.split(',').length
      ? ';'
      : ',';
  const rows = parseCsv(text, {
    columns: true,
    bom: true,
    trim: true,
    skip_empty_lines: true,
    relax_column_count: true,
    relax_quotes: true,
    delimiter,
  }) as Array<Record<string, any>>;
  // A sheet's headers are written for people ("Expected revenue (₹)"), not for the API.
  return rows.map(row => {
    const out: Record<string, any> = {};
    for (const [key, value] of Object.entries(row)) {
      const clean = String(key)
        .toLowerCase()
        .replace(/\(.*?\)/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '');
      const numericValue =
        typeof value === 'string' && value.trim() !== '' && /^-?[₹\d,]+(\.\d+)?%?$/.test(value.trim())
          ? Number(value.replace(/[₹,%]/g, '').trim())
          : value;
      const label = COLUMN_ALIASES[clean] || clean || key;
      // "Yes"/"no" in an ads column is a boolean, not a word.
      out[label] =
        numericValue === ''
          ? undefined
          : typeof numericValue === 'string' && /^(yes|true|y|1)$/i.test(numericValue.trim())
            ? true
            : typeof numericValue === 'string' && /^(no|false|n|0)$/i.test(numericValue.trim())
              ? false
              : numericValue;
    }
    return out;
  });
}

/** Everything the request carries: an export document, an array, CSV, or raw JSON text. */
function collectIncoming(body: any): any[] {
  if (body.text || body.csv) {
    const text = String(body.text || body.csv).trim();
    if (!text) throw bodyError('Nothing was pasted to import.');
    if (text.startsWith('[') || text.startsWith('{')) {
      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch (error: any) {
        throw bodyError(`That JSON could not be parsed: ${error.message}`);
      }
      return collectIncoming(parsed);
    }
    try {
      return parseDelimited(text);
    } catch (error: any) {
      throw bodyError(`That file could not be read as CSV: ${error.message}`);
    }
  }
  const source = body.json ?? body;
  if (Array.isArray(source)) return source;
  if (Array.isArray(source.offers)) return source.offers;
  if (Array.isArray(source.studios)) {
    const out: any[] = [];
    for (const studio of source.studios) {
      const studioId = asNumber(studio?.studio?.id ?? studio?.studioId);
      for (const m of Array.isArray(studio?.months) ? studio.months : []) {
        for (const offer of Array.isArray(m?.offers) ? m.offers : []) {
          out.push({ ...offer, studioId: studioId ?? offer.studioId, month: m.month });
        }
      }
    }
    return out;
  }
  return [];
}

export default function registerOfferImportRoutes(app: Express) {
  app.post('/api/offers/import', permission('offer_edit'), (req: any, res: any) => {
    const body = req.body || {};
    const mode = String(body.mode || 'upsert') as Mode;
    if (!MODES.includes(mode)) throw bodyError(`Unknown import mode “${mode}”. Use add, upsert or replace.`);
    const dryRun = body.dryRun !== false;
    const canCreate = req.user.permissions.includes('offer_create') || req.user.permissions.includes('write');
    if (!dryRun && !canCreate) throw bodyError('Your role cannot create offers.', 403);

    const bulk = readBulk(body);
    const defaultStudio = asNumber(body.studioId ?? body.studio_id ?? body.studio) ?? bulk.studioId;
    const year = asNumber(body.year) ?? bulk.year ?? 2027;
    const rawMonth = body.month ?? bulk.month;
    const month = rawMonth === null || rawMonth === undefined || rawMonth === '' ? null : asNumber(rawMonth);
    // Naming a month in the bulk edits is the same request as "put these on that month".
    const attach = body.attach === undefined ? Boolean(bulk.month && month) : Boolean(body.attach);
    const decisions: Record<string, 'skip' | 'apply'> =
      body.decisions && typeof body.decisions === 'object' ? body.decisions : {};
    const only = Array.isArray(body.only) ? body.only.map((v: any) => String(v).toLowerCase()) : [];
    const ignore = Array.isArray(body.ignore) ? body.ignore.map((v: any) => String(v).toLowerCase()) : [];

    let incoming = collectIncoming(body);
    if (only.length) incoming = incoming.filter(raw => only.includes(String(raw?.name ?? '').toLowerCase()));
    if (ignore.length) incoming = incoming.filter(raw => !ignore.includes(String(raw?.name ?? '').toLowerCase()));
    if (!incoming.length) throw bodyError('No offers found in that file.');
    const limit = Math.max(1, Math.min(2000, numeric(body.limit) || 500));
    if (incoming.length > limit) throw bodyError(`Import at most ${limit} offers at a time.`, 413);

    const rows: Array<{
      index: number;
      name: string;
      action: string;
      id?: number;
      messages: string[];
      changes?: Array<{ field: string; label: string; from: string; to: string }>;
    }> = [];
    const written: Array<{ id: number; studioId: number; slot: string | null }> = [];

    incoming.forEach((original, index) => {
      const messages: string[] = [];
      const raw = applyBulk(original, bulk);
      try {
        if (decisions[String(index)] === 'skip') {
          rows.push({ index, name: String(raw?.name ?? `Row ${index + 1}`), action: 'skip', messages: ['Left out.'] });
          return;
        }
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
          written.push({ id: existing.id, studioId, slot: payload.planSlot ?? existing.plan_slot ?? null });
          return;
        }
        const action = existing ? 'update' : 'create';
        if (action === 'update' && !req.user.permissions.includes('offer_edit')) {
          throw bodyError('Your role cannot edit offers.', 403);
        }
        const merged = existing ? mergeExisting(existing, payload) : payload;
        // Creation goes through the same path as the offer form, including the discount cap.
        if (action === 'create') {
          merged.generationSource = merged.generationSource || 'json_import';
          const validated = validateOfferForSave(merged, req.user, { reconcile: true });
          const offer = dryRun ? null : persistOffer(merged, req.user, { reconcile: true, allowApproved: true });
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
            changes: [],
          });
          if (offer) written.push({ id: offer.id, studioId, slot: payload.planSlot ?? null });
          return;
        }
        const row = validateOfferForSave(merged, req.user, { reconcile: true });
        // 2027 offers live in the bank; the month owns the selection, not the offer. An
        // offer that already carries a month keeps it, so a re-import is never a "change".
        if (Number(row.year) === 2027) row.month = existing.month ?? null;
        const capMessage = capNote(row, payload);
        if (capMessage) messages.push(capMessage);
        const revenueMessage = revenueNote(row, existing.expected_revenue);
        if (revenueMessage) messages.push(revenueMessage);
        try {
          if (JSON.parse(row.financials || '{}').reconciled)
            messages.push('Financial model re-pointed at the imported forecast.');
        } catch {
          /* financials is always written by the validator; nothing to report if it is not JSON */
        }
        const changes = describeChanges(row, existing);
        // Re-importing an export unchanged should not bump versions or write audits, so an
        // identical row is reported as a skip rather than as a no-op update.
        if (!changes.length) {
          rows.push({ index, name: payload.name, action: 'skip', id: existing.id, messages: ['No change.'] });
          written.push({ id: existing.id, studioId, slot: row.plan_slot ?? existing.plan_slot ?? null });
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
            reason: 'File import',
          });
        }
        rows.push({ index, name: payload.name, action: 'update', id: existing.id, messages, changes });
        written.push({ id: existing.id, studioId, slot: row.plan_slot ?? existing.plan_slot ?? null });
      } catch (error: any) {
        rows.push({
          index,
          name: String(raw?.name ?? raw?.offer ?? `Row ${index + 1}`),
          action: 'error',
          messages: [String(error?.message || 'Could not import this offer.')],
        });
      }
    });

    // Months are chosen, not filled: an import can put what it brought on a month
    // (`attach`), and `replace` makes the imported offers exactly what that month runs.
    let attached: null | { studioId: number; month: number; offers: number; removed: number } = null;
    if (month && (mode === 'replace' || attach) && written.length) {
      const byStudio = new Map<number, Array<{ id: number; slot: string | null }>>();
      for (const entry of written) {
        const list = byStudio.get(entry.studioId) || [];
        if (!list.some(item => item.id === entry.id)) list.push({ id: entry.id, slot: entry.slot });
        byStudio.set(entry.studioId, list);
      }
      for (const [studioId, incoming_] of byStudio) {
        const current = selection(studioId, year, month);
        const currentIds = [...Object.values(current.slots).filter((v): v is number => !!v), ...current.offerIds];
        const ids = incoming_.map(entry => entry.id);
        const finalIds = mode === 'replace' ? ids : [...currentIds, ...ids.filter(id => !currentIds.includes(id))];
        const slots: Record<string, number | null> =
          mode === 'replace'
            ? { newcomer: null, lapsed: null, renewal: null }
            : {
                ...current.slots,
              };
        for (const entry of incoming_) {
          if (!entry.slot || !(entry.slot in slots)) continue;
          if (mode === 'replace' || !slots[entry.slot]) slots[entry.slot] = entry.id;
        }
        const removed = mode === 'replace' ? currentIds.filter(id => !finalIds.includes(id)).length : 0;
        if (!dryRun) saveSelection(studioId, year, month, slots, finalIds, req.user!.id);
        attached = { studioId, month, offers: [...new Set(finalIds)].length, removed };
      }
    }

    const summary = {
      create: rows.filter(r => r.action === 'create').length,
      update: rows.filter(r => r.action === 'update').length,
      skip: rows.filter(r => r.action === 'skip').length,
      error: rows.filter(r => r.action === 'error').length,
      changedFields: rows.reduce((sum, r) => sum + (r.changes?.length || 0), 0),
    };
    if (!dryRun) {
      audit({
        userId: req.user!.id,
        action: 'import',
        entityType: 'offer',
        entityId: year,
        after: {
          mode,
          summary,
          month,
          studios: [...new Set(incoming.map(o => o?.studioId).filter(Boolean))],
          bulk: { ...bulk },
        },
        reason: 'File import',
      });
    }
    res.json({ dryRun, mode, year, month, bulk, summary, attached, rows });
  });
}
