import crypto from 'node:crypto';
import { db } from '../db.js';

// Offers planned for one location are mirrored to every other planning location by default. Mirrors share a
// `provenance.linkGroup`; each copy keeps its own studio, unit target and prices from that studio's product list.
// Solo edits detach an offer from its group so later shared edits no longer overwrite it.
// Each location has one offer bank (rows with no month). Picking a bank offer for a month makes that month's
// copy (`provenance.bankId`), which holds the month's own units and revenue; removing it deletes the copy.

export const PLANNING_LOCATIONS = ['Kemps Corner', 'Bandra', 'Kenkere House', 'Pop-up'];
const SLOT_KEYS = ['newcomer', 'lapsed', 'renewal'] as const;
// Months start with at most this many offers; planners can add more by hand.
export const DEFAULT_PICKS = 4;

// Generic product keys, resolved to each studio's own product (first match wins).
export const PRODUCT_KEYS: Record<string, { label: string; names: string[] }> = {
  '1M': {
    label: '1 month unlimited',
    names: ['Studio 1 Month Unlimited Membership', 'Studio 1 Month Unlimited', '1 Month Unlimited'],
  },
  '3M': {
    label: '3 month unlimited',
    names: ['Studio 3 Month Unlimited Membership', 'Studio 3 Month Unlimited', '3 Month Unlimited'],
  },
  '6M': {
    label: '6 month unlimited',
    names: ['Studio 6 Month Unlimited Membership', 'Studio 6 Month Unlimited', '6 Month Unlimited'],
  },
  ANNUAL: {
    label: 'Annual unlimited',
    names: ['Studio Annual Unlimited Membership', 'Studio Annual Unlimited', 'Annual Unlimited'],
  },
  '2W': {
    label: '2-week newcomer unlimited',
    names: [
      'Studio Newcomers 2 Week Unlimited Membership',
      'Studio Newcomers 2 Week Unlimited',
      'Studio 2 Week Unlimited',
    ],
  },
  INTRO: {
    label: 'Newcomer intro / 2-for-1',
    names: ['New Client Intro Pack', 'Newcomers 2 For 1', 'Studio Newcomer 2 for 1'],
  },
  '4C': {
    label: '4-class pack',
    names: ['Studio 4 Class', 'Studio 4 Class Package', 'Plash Pilates 4 Class Package'],
  },
  CC8: {
    label: 'C+C 8-class pack',
    names: ['Copper + Cloves 8 Class Package', 'Studio 8 Class', 'Studio 8 Class Package'],
  },
  '8C': {
    label: '8-class pack',
    names: ['Studio 8 Class', 'Studio 8 Class Package', 'Copper + Cloves 8 Class Package'],
  },
  '12C': {
    label: '12-class pack',
    names: ['Studio 12 Class', 'Studio 12 Class Package', 'Copper + Cloves 12 Class Package'],
  },
  '20C': {
    label: '20-class pack',
    names: ['Studio 20 Single Class Pack', 'Studio 20 Single Class Package', 'Studio 20 Class'],
  },
  PRIV10: {
    label: '10 privates',
    names: ['Studio Private Class X 10', 'Studio 4 Private Class Package', 'Studio Private Class'],
  },
  CC10: {
    label: 'C+C 10-pack',
    names: ['Copper + Cloves 10 Class Package', 'Copper + Cloves 10 Class Pack', 'Studio 10 Single Class Pack'],
  },
  SINGLE: {
    label: 'Single class',
    names: [
      'Studio Single Class',
      'Copper + Cloves Single Class Package',
      'Copper + Cloves Single Class',
      'Plash Pilates Single Class Package',
    ],
  },
};

const json = (v: any, fallback: any) => {
  try {
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
};

export function planningStudios() {
  return db
    .prepare(`SELECT id, name FROM studios WHERE name IN (${PLANNING_LOCATIONS.map(() => '?').join(',')})`)
    .all(...PLANNING_LOCATIONS) as Array<{ id: number; name: string }>;
}

export function listPrice(studioId: number, key?: string | null) {
  const names = key ? PRODUCT_KEYS[key]?.names : null;
  if (!names?.length) return null;
  for (const name of names) {
    const p = db
      .prepare('SELECT list_price FROM products WHERE studio_id=? AND name=? AND active=1 AND list_price>1')
      .get(studioId, name) as any;
    if (p) return Number(p.list_price);
  }
  // Pop-up and hosted Bengaluru venues share the Bengaluru catalogue hosted at Kenkere House when not duplicated per venue.
  const studio = db.prepare('SELECT city FROM studios WHERE id=?').get(studioId) as { city?: string } | undefined;
  if (studio?.city) {
    for (const name of names) {
      const p = db
        .prepare(
          'SELECT p.list_price FROM products p JOIN studios s ON s.id=p.studio_id WHERE s.city=? AND p.name=? AND p.active=1 AND p.list_price>1 ORDER BY p.id LIMIT 1',
        )
        .get(studio.city, name) as any;
      if (p) return Number(p.list_price);
    }
  }
  return null;
}

// A studio's price level relative to another, from their 1-month unlimited prices.
function priceRatio(to: number, from: number) {
  const a = listPrice(to, '1M'),
    b = listPrice(from, '1M');
  return a && b ? a / b : 1;
}

// Price an offer for a studio: list price of its product less the planned discount, or — when the offer has no
// product key — the source ASP scaled by the two studios' price levels.
export function priceFor(studioId: number, pricing: any, fallback?: { asp: number; fromStudio: number }) {
  const list = listPrice(studioId, pricing?.product);
  if (list) return Math.round(list * (1 - Math.min(0.5, Math.max(0, Number(pricing?.discount) || 0))));
  if (fallback?.asp) return Math.round(fallback.asp * priceRatio(studioId, fallback.fromStudio));
  return 0;
}

export function selection(studioId: number, year: number, month: number) {
  const plan = db
    .prepare('SELECT slots, offer_ids FROM monthly_plans WHERE studio_id=? AND year=? AND month=?')
    .get(studioId, year, month) as any;
  // A month's offers are exactly what the planner picked; nothing is filled in by default.
  const savedSlots = json(plan?.slots, null) || {},
    savedIds = json(plan?.offer_ids, null);
  const slots: Record<string, number | null> = Object.fromEntries(SLOT_KEYS.map(slot => [slot, savedSlots[slot] ?? null]));
  const offerIds: number[] = Array.isArray(savedIds) ? savedIds : [];
  return { slots, offerIds };
}

export function saveSelection(
  studioId: number,
  year: number,
  month: number,
  slots: Record<string, number | null>,
  offerIds: number[],
  userId: number | null,
) {
  const slotted = Object.values(slots).filter(Boolean);
  const ids = [...new Set(offerIds)].filter(id => !slotted.includes(id));
  db.prepare(
    `INSERT INTO monthly_plans(studio_id,year,month,offer_ids,slots,updated_by) VALUES (?,?,?,?,?,?)
     ON CONFLICT(studio_id,year,month) DO UPDATE SET offer_ids=excluded.offer_ids, slots=excluded.slots,
     updated_by=excluded.updated_by, updated_at=CURRENT_TIMESTAMP`,
  ).run(studioId, year, month, JSON.stringify(ids), JSON.stringify(slots), userId);
}

function addToPlan(studioId: number, year: number, month: number, offer: any, userId: number | null) {
  const { slots, offerIds } = selection(studioId, year, month);
  if ([...Object.values(slots), ...offerIds].includes(offer.id)) return;
  const slot = offer.plan_slot as string | null;
  if (slot && slot in slots && !slots[slot]) slots[slot] = offer.id;
  else offerIds.push(offer.id);
  saveSelection(studioId, year, month, slots, offerIds, userId);
}

// Where an offer sits in a month's plan (its slot, else its place in the list), so a replacement can take it.
export function planPosition(studioId: number, year: number, month: number, offerId: number) {
  const { slots, offerIds } = selection(studioId, year, month);
  const slot = Object.keys(slots).find(k => slots[k] === offerId);
  return slot ? { slot } : { index: offerIds.indexOf(offerId) };
}

export function moveInPlan(
  studioId: number,
  year: number,
  month: number,
  offerId: number,
  at: { slot?: string; index?: number },
  userId: number | null,
) {
  const { slots, offerIds } = selection(studioId, year, month);
  for (const k of Object.keys(slots)) if (slots[k] === offerId) slots[k] = null;
  const ids = offerIds.filter(id => id !== offerId);
  if (at.slot && at.slot in slots && !slots[at.slot]) slots[at.slot] = offerId;
  else ids.splice(at.index != null && at.index >= 0 ? at.index : ids.length, 0, offerId);
  saveSelection(studioId, year, month, slots, ids, userId);
}

function removeFromPlan(studioId: number, year: number, month: number, offerId: number, userId: number | null) {
  const { slots, offerIds } = selection(studioId, year, month);
  for (const k of Object.keys(slots)) if (slots[k] === offerId) slots[k] = null;
  saveSelection(
    studioId,
    year,
    month,
    slots,
    offerIds.filter(id => id !== offerId),
    userId,
  );
}

const getOffer = (id: number) => db.prepare('SELECT * FROM offers WHERE id=?').get(id) as any;

function groupOf(offer: any) {
  const prov = json(offer.provenance, {});
  if (prov.linkGroup) return prov.linkGroup as string;
  const group = offer.offer_uid;
  db.prepare('UPDATE offers SET provenance=? WHERE id=?').run(JSON.stringify({ ...prov, linkGroup: group }), offer.id);
  return group;
}

function siblings(group: string, excludeId: number) {
  return db
    .prepare(
      `SELECT * FROM offers WHERE json_extract(provenance,'$.linkGroup')=? AND id!=? AND status NOT IN ('archived','rejected')`,
    )
    .all(group, excludeId) as any[];
}

// Copy an offer into another studio, repriced for that studio.
function cloneTo(offer: any, studioId: number, group: string, userId: number | null) {
  const prov = json(offer.provenance, {});
  const asp = priceFor(studioId, prov.pricing, { asp: Number(offer.expected_asp) || 0, fromStudio: offer.studio_id });
  const units = Number(offer.target_purchases) || 0;
  const financials = json(offer.financials, {});
  financials.sellingPrice = asp;
  financials.expectedBuyers = units;
  financials.expectedRevenue = asp * units;
  financials.contributionMargin = null;
  financials.economicsComplete = false;
  if (offer.studio_id !== studioId)
    financials.warnings = [...new Set([...(financials.warnings || []), 'Destination pricing changed; refresh product and benefit costs before approval.'])];
  const skip = new Set(['id', 'offer_uid', 'studio_id', 'created_at', 'updated_at', 'version', 'created_by']);
  const row: Record<string, any> = Object.fromEntries(Object.entries(offer).filter(([k]) => !skip.has(k)));
  Object.assign(row, {
    expected_asp: asp,
    expected_revenue: asp * units,
    revenue_target: asp * units,
    margin_impact: null,
    financials: JSON.stringify(financials),
    provenance: JSON.stringify({ ...prov, linkGroup: group, copiedFrom: offer.id }),
  });
  const cols = Object.keys(row);
  const uid = `P57-${new Date().getFullYear()}-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
  const id = db
    .prepare(
      `INSERT INTO offers(offer_uid,studio_id,created_by,${cols.join(',')}) VALUES (?,?,?${',?'.repeat(cols.length)})`,
    )
    .run(uid, studioId, userId, ...Object.values(row)).lastInsertRowid as number;
  return getOffer(id);
}

const bankIdOf = (offer: any) => (offer.month == null ? offer.id : (json(offer.provenance, {}).bankId as number | undefined));

// The bank offer of `studioId` matching `offer` (same row, same name, or a repriced copy added to that bank).
function bankOfferFor(offer: any, studioId: number, year: number, group: string, userId: number | null) {
  const source = offer.month == null ? offer : getOffer(bankIdOf(offer) ?? -1) || { ...offer, month: null };
  if (source.studio_id === studioId && source.id) return source;
  const named = db
    .prepare(
      `SELECT * FROM offers WHERE studio_id=? AND year=? AND month IS NULL AND lower(name)=lower(?) AND status NOT IN ('archived','rejected')`,
    )
    .get(studioId, year, source.name) as any;
  return named || cloneTo({ ...source, year, month: null }, studioId, group, userId);
}

// This month's copy of a bank offer, made on first pick.
function monthCopy(bank: any, year: number, month: number, group: string, userId: number | null) {
  const existing = db
    .prepare(
      `SELECT * FROM offers WHERE studio_id=? AND year=? AND month=? AND json_extract(provenance,'$.bankId')=? AND status NOT IN ('archived','rejected')`,
    )
    .get(bank.studio_id, year, month, bank.id) as any;
  if (existing) return existing;
  const copy = cloneTo({ ...bank, year, month }, bank.studio_id, group, userId);
  const prov = json(copy.provenance, {});
  db.prepare('UPDATE offers SET provenance=? WHERE id=?').run(JSON.stringify({ ...prov, bankId: bank.id }), copy.id);
  return getOffer(copy.id);
}

function pick(offer: any, studioId: number, year: number, month: number, group: string, userId: number | null) {
  if (offer.studio_id === studioId && offer.month === month && offer.year === year) return offer;
  return monthCopy(bankOfferFor(offer, studioId, year, group, userId), year, month, group, userId);
}

// A month copy that left the plan is gone; bank offers and anything a campaign uses stay.
function dropCopy(offer: any) {
  if (offer.month == null || !json(offer.provenance, {}).bankId) return;
  if (db.prepare('SELECT 1 FROM campaigns WHERE offer_id=?').get(offer.id)) return;
  db.prepare('DELETE FROM offer_versions WHERE offer_id=?').run(offer.id);
  db.prepare('DELETE FROM offers WHERE id=?').run(offer.id);
}

const SHARED_TEXT = [
  'name',
  'headline',
  'benefit',
  'rationale',
  'customer_copy',
  'internal_description',
  'audience',
  'excluded_audience',
  'cta',
  'offer_type',
  'objective',
  'plan_slot',
  'redemption_conditions',
  'validity_start',
  'validity_end',
  'performance_notes',
] as const;

export interface OfferEdit {
  name?: string;
  headline?: string | null;
  benefit?: string | null;
  rationale?: string | null;
  customer_copy?: string | null;
  internal_description?: string | null;
  audience?: string | null;
  excluded_audience?: string | null;
  cta?: string | null;
  offer_type?: string;
  objective?: string;
  plan_slot?: string | null;
  redemption_conditions?: string | null;
  validity_start?: string | null;
  validity_end?: string | null;
  performance_notes?: string | null;
  success_metrics?: string[];
  risks?: string[];
  target_purchases?: number;
  expected_asp?: number;
  photoKey?: string | null;
  pricing?: {
    product?: string | null;
    discount?: number;
    mechanic?: string;
    customListPrice?: number | null;
    customAsp?: boolean;
  };
}

function applyEdit(offer: any, edit: OfferEdit, ownFields: boolean, sourceStudio: number) {
  const prov = json(offer.provenance, {});
  const pricing = edit.pricing ? { ...(prov.pricing || {}), ...edit.pricing } : prov.pricing;
  const next: Record<string, any> = {};
  for (const k of SHARED_TEXT) if (edit[k] !== undefined) next[k] = edit[k];
  if (edit.success_metrics !== undefined) next.success_metrics = JSON.stringify(edit.success_metrics);
  if (edit.risks !== undefined) next.risks = JSON.stringify(edit.risks);
  const units =
    ownFields && edit.target_purchases !== undefined ? edit.target_purchases : Number(offer.target_purchases) || 0;
  let asp = Number(offer.expected_asp) || 0;
  const hasCustomAsp = Boolean(pricing?.customAsp) || (!pricing?.product && edit.expected_asp !== undefined);
  if (hasCustomAsp && edit.expected_asp !== undefined) {
    asp = ownFields ? edit.expected_asp : Math.round(edit.expected_asp * priceRatio(offer.studio_id, sourceStudio));
  } else if (edit.pricing) {
    if (pricing?.customListPrice && Number(pricing.customListPrice) > 0 && !pricing?.product) {
      const baseList = ownFields
        ? Number(pricing.customListPrice)
        : Math.round(Number(pricing.customListPrice) * priceRatio(offer.studio_id, sourceStudio));
      asp = Math.round(baseList * (1 - Math.min(0.5, Math.max(0, Number(pricing?.discount) || 0))));
    } else {
      asp = priceFor(offer.studio_id, pricing, { asp, fromStudio: offer.studio_id }) || asp;
    }
  } else if (edit.expected_asp !== undefined) {
    asp = ownFields ? edit.expected_asp : Math.round(edit.expected_asp * priceRatio(offer.studio_id, sourceStudio));
  }
  if (edit.pricing?.discount !== undefined) next.effective_discount = Number(edit.pricing.discount) * 100;
  if (edit.pricing || edit.expected_asp !== undefined || edit.target_purchases !== undefined || edit.benefit !== undefined) {
    const financials = json(offer.financials, {});
    financials.sellingPrice = asp;
    financials.expectedBuyers = units;
    financials.expectedRevenue = asp * units;
    financials.contributionMargin = null;
    financials.economicsComplete = false;
    financials.warnings = [...new Set([...(financials.warnings || []), 'Offer economics changed; refresh product and benefit costs before approval.'])];
    next.financials = JSON.stringify(financials);
    next.margin_impact = null;
  }
  const nextProv = { ...prov, pricing };
  if (edit.photoKey !== undefined) {
    if (edit.photoKey) nextProv.photoKey = edit.photoKey;
    else delete nextProv.photoKey;
  }
  if (offer.approval_status === 'approved' || offer.status === 'approved') {
    next.approval_status = 'pending';
    next.status = 'draft';
  }
  Object.assign(next, {
    target_purchases: units,
    expected_asp: asp,
    expected_revenue: asp * units,
    revenue_target: asp * units,
    provenance: JSON.stringify(nextProv),
  });
  const cols = Object.keys(next);
  db.prepare(
    `UPDATE offers SET ${cols.map(c => `${c}=?`).join(',')}, version=version+1, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
  ).run(...Object.values(next), offer.id);
  if (edit.plan_slot !== undefined && offer.studio_id && offer.year && offer.month) {
    const { slots, offerIds } = selection(offer.studio_id, offer.year, offer.month);
    const inPlan = [...Object.values(slots), ...offerIds].includes(offer.id);
    if (inPlan) {
      for (const k of Object.keys(slots)) if (slots[k] === offer.id) slots[k] = null;
      const cleanIds = offerIds.filter(id => id !== offer.id);
      if (edit.plan_slot && edit.plan_slot in slots && !slots[edit.plan_slot]) slots[edit.plan_slot] = offer.id;
      else cleanIds.push(offer.id);
      saveSelection(offer.studio_id, offer.year, offer.month, slots, cleanIds, null);
    }
  }
}

export type LinkedOp =
  | { op: 'add'; offerId: number; solo: boolean }
  | { op: 'remove'; offerId: number; solo: boolean }
  | { op: 'delete'; offerId: number; solo: boolean }
  | { op: 'update'; offerId: number; solo: boolean; edit: OfferEdit }
  | { op: 'create'; solo: boolean; edit: OfferEdit };

// Runs one plan edit for a studio-month, mirroring it to the other planning locations unless `solo`.
export function linkedOfferChange(
  studioId: number,
  year: number,
  month: number,
  change: LinkedOp,
  userId: number | null,
) {
  const touched = new Set<number>([studioId]);
  let createdOfferId: number | undefined;
  db.transaction(() => {
    const others = planningStudios().filter(s => s.id !== studioId);

    if (change.op === 'create') {
      const uid = `P57-${year}-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
      const group = uid;
      const baseName = String(change.edit.name || 'New monthly offer').trim();
      const baseId = db
        .prepare(
          `INSERT INTO offers(
            offer_uid, name, objective, offer_type, studio_id, year, month,
            status, approval_status, generation_source, data_mode,
            target_purchases, expected_asp, expected_revenue, revenue_target,
            financials, risks, success_metrics, provenance, created_by
          ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        )
        .run(
          uid,
          baseName,
          change.edit.objective || 'acquisition',
          change.edit.offer_type || 'percentage',
          studioId,
          year,
          null,
          'draft',
          'pending',
          'manual',
          'user',
          change.edit.target_purchases ?? 10,
          change.edit.expected_asp ?? 0,
          0,
          0,
          JSON.stringify({}),
          JSON.stringify(change.edit.risks || []),
          JSON.stringify(change.edit.success_metrics || []),
          JSON.stringify(change.solo ? {} : { linkGroup: group }),
          userId,
        ).lastInsertRowid as number;
      // New offers go into the bank, then this month picks them.
      const created = getOffer(baseId);
      applyEdit(created, { ...change.edit, name: baseName }, true, studioId);
      const local = pick(getOffer(baseId), studioId, year, month, group, userId);
      addToPlan(studioId, year, month, local, userId);
      createdOfferId = local.id;
      if (!change.solo) {
        for (const s of others) {
          const twin = pick(local, s.id, year, month, group, userId);
          addToPlan(s.id, year, month, twin, userId);
          touched.add(s.id);
        }
      }
      return;
    }

    const offer = getOffer(change.offerId);
    if (!offer) throw Object.assign(new Error('Offer not found.'), { status: 404 });

    if (change.op === 'add') {
      // Picking a bank offer (from any location's bank) makes this month's copy of it.
      const group = groupOf(offer);
      const local = pick(offer, studioId, year, month, group, userId);
      addToPlan(studioId, year, month, local, userId);
      if (!change.solo)
        for (const s of others) {
          const twin = pick(local, s.id, year, month, group, userId);
          addToPlan(s.id, year, month, twin, userId);
          touched.add(s.id);
        }
    }

    if (change.op === 'remove') {
      const group = json(offer.provenance, {}).linkGroup;
      const twins = !change.solo && group ? siblings(group, offer.id).filter(o => o.year === year && o.month === month) : [];
      removeFromPlan(studioId, year, month, offer.id, userId);
      dropCopy(offer);
      for (const twin of twins) {
        removeFromPlan(twin.studio_id, year, month, twin.id, userId);
        dropCopy(twin);
        touched.add(twin.studio_id);
      }
    }

    if (change.op === 'delete') {
      // Deleting from a month retires the offer: the month copy goes and its bank offer is archived.
      const archive = db.prepare(`UPDATE offers SET status='archived', updated_at=CURRENT_TIMESTAMP WHERE id=?`);
      const group = json(offer.provenance, {}).linkGroup;
      const twins = !change.solo && group ? siblings(group, offer.id).filter(o => o.year === year && o.month === month) : [];
      for (const o of [offer, ...twins]) {
        removeFromPlan(o.studio_id, year, month, o.id, userId);
        const bankId = bankIdOf(o);
        if (bankId) archive.run(bankId);
        if (o.month == null) continue;
        archive.run(o.id);
        dropCopy(o);
        touched.add(o.studio_id);
      }
    }

    if (change.op === 'update') {
      applyEdit(offer, change.edit, true, studioId);
      const group = json(offer.provenance, {}).linkGroup;
      if (change.solo && group) {
        // Customised for this location only: leave the group so shared edits stop overwriting it.
        const prov = json(getOffer(offer.id).provenance, {});
        delete prov.linkGroup;
        db.prepare('UPDATE offers SET provenance=? WHERE id=?').run(
          JSON.stringify({ ...prov, detachedFrom: group }),
          offer.id,
        );
      }
      if (!change.solo && group)
        for (const twin of siblings(group, offer.id)) {
          applyEdit(twin, change.edit, false, studioId);
          touched.add(twin.studio_id);
        }
    }
  })();
  return { studios: [...touched], ...(createdOfferId ? { offerId: createdOfferId } : {}) };
}

const STREAM_OF: Record<string, 'newClient' | 'renewal' | 'reactivation'> = {
  acquisition: 'newClient',
  trial_conversion: 'newClient',
  referral: 'newClient',
  new_client: 'newClient',
  retention: 'renewal',
  annual_membership: 'renewal',
  additional_purchase: 'renewal',
  aov: 'renewal',
  reactivation: 'reactivation',
};
const revenueOf = (o: any) => {
  if (!o || o.data_mode === 'demo' || o.generation_source === 'demo_seed') return 0;
  const v = Number(o.expected_revenue);
  return Number.isFinite(v) ? v : 0;
};

// Makes a studio-month's offers carry its revenue target: first adds unpicked offers for the short
// stream, then raises planned purchases on the largest unapproved offer until nothing is short.
export function coverPlan(studioId: number, year: number, month: number, userId: number | null) {
  const t = db
    .prepare('SELECT proposed_target, approved_target, renewal_target, reactivation_target FROM monthly_targets WHERE studio_id=? AND year=? AND month=?')
    .get(studioId, year, month) as any;
  const total = Number(t?.approved_target ?? t?.proposed_target) || 0;
  if (!total) return { added: [] as number[], raised: [] as number[], short: 0 };
  const scale = Number(t.proposed_target) ? total / Number(t.proposed_target) : 1;
  const renewal = Math.min(total, (Number(t.renewal_target) || 0) * scale);
  const reactivation = Math.min(total - renewal, (Number(t.reactivation_target) || 0) * scale);
  const targets = { newClient: total - renewal - reactivation, renewal, reactivation };

  const added: number[] = [], raised: number[] = [];
  db.transaction(() => {
    const pool = db
      .prepare(`SELECT * FROM offers WHERE studio_id=? AND year=? AND month IS NULL AND status NOT IN ('archived','rejected')`)
      .all(studioId, year) as any[];
    const picked = () => {
      const { slots, offerIds } = selection(studioId, year, month);
      const ids = [...Object.values(slots), ...offerIds].filter(Boolean) as number[];
      return ids.map(id => getOffer(id)).filter(Boolean);
    };
    const streamSum = (list: any[], key: string) =>
      list.filter(o => STREAM_OF[o.objective] === key).reduce((s, o) => s + revenueOf(o), 0);

    for (const key of Object.keys(targets) as (keyof typeof targets)[]) {
      if (targets[key] <= 0) continue;
      let left = targets[key] - streamSum(picked(), key);
      const chosen = new Set(picked().map(o => bankIdOf(o)));
      for (const b of pool
        .filter(o => !chosen.has(o.id) && STREAM_OF[o.objective] === key && revenueOf(o) > 0)
        .sort((a, b) => revenueOf(b) - revenueOf(a))) {
        if (left <= 0) break;
        const o = monthCopy(b, year, month, groupOf(b), userId);
        addToPlan(studioId, year, month, o, userId);
        added.push(o.id);
        left -= revenueOf(o);
      }
      if (left > 0) raise(picked().filter(o => STREAM_OF[o.objective] === key), left);
    }
    // Anything still short overall (e.g. a stream with no offers at all) goes on the biggest offer.
    const gap = total - picked().reduce((s, o) => s + revenueOf(o), 0);
    if (gap > 0) raise(picked(), gap);

    function raise(list: any[], left: number) {
      const lead = list
        .filter(o => o.approval_status !== 'approved' && Number(o.expected_asp) > 0 && revenueOf(o) >= 0)
        .sort((a, b) => revenueOf(b) - revenueOf(a))[0];
      if (!lead) return;
      const units = (Number(lead.target_purchases) || 0) + Math.ceil(left / Number(lead.expected_asp));
      applyEdit(lead, { target_purchases: units }, true, studioId);
      raised.push(lead.id);
    }
  })();
  const after = (() => {
    const { slots, offerIds } = selection(studioId, year, month);
    return [...Object.values(slots), ...offerIds].filter(Boolean).reduce((s: number, id: any) => s + revenueOf(getOffer(id)), 0);
  })();
  return { added, raised: [...new Set(raised)], short: Math.max(0, Math.round(total - after)) };
}
