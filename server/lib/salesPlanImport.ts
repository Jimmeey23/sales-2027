import crypto from 'node:crypto';
import { db, audit } from '../db.js';
import { ASSUMPTION_KEYS, type AssumptionKey } from './planEconomics.js';

/* Importing a whole year plan — targets, streams, funnels, the month briefs, the execution
   plan and the offers — from one `p57-sales-plan/1` document.

   The export in `planExport.ts` ships the year in that shape, and a plan is revised outside
   the app more often than inside it: a theme changes, a target is re-cut, three offers are
   rewritten. Retyping twelve months to capture that is where plans go stale. So the document
   is the instruction, and this module is the only place that reads it back.

   Three modes, one meaning each:

     add      plan the months this location does not have yet; leave the rest untouched
     modify   rewrite what the file covers; keep anything the file does not mention
     replace  make the location's year exactly what the file says, offers included

   Nothing here is derived: a theme, an objective, a week's actions, an offer's price all
   travel from the file to the row untouched. The only things computed are the ones the
   database insists on having (a slot, an offer uid, a version) and the month's focus points
   when the file does not spell them out. A preview runs the same code path as the write and
   simply does not commit, so the numbers shown before importing are the numbers stored. */

export const PLAN_SCHEMA = 'p57-sales-plan/1';
export const PLAN_IMPORT_SOURCE = 'plan_import';
const MARKER_PREFIX = 'plan_import';

export type ImportMode = 'add' | 'modify' | 'replace';
export const IMPORT_MODES: ImportMode[] = ['add', 'modify', 'replace'];

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const SLOTS = ['newcomer', 'lapsed', 'renewal'] as const;
type Slot = (typeof SLOTS)[number];

/** Offers this importer owns, and may therefore retire when the plan stops naming them. */
const PLAN_OWNED = new Set([PLAN_IMPORT_SOURCE, 'approved_plan_2027', 'offer_bank']);

/* ── Reading a document ─────────────────────────────────────────────────────── */

const isObj = (v: any) => Boolean(v) && typeof v === 'object' && !Array.isArray(v);

/** Money and counts arrive as numbers, as strings, and occasionally with a rupee sign. */
export function numOf(value: any): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const cleaned = value
      .replace(/[₹,\s]/g, '')
      .replace(/%$/, '')
      .trim();
    if (!cleaned) return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Copy is read whatever shape it arrives in — string, string list, or a labelled object. */
export function textOf(value: any): string {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) {
    return value.map(textOf).filter(Boolean).join('\n');
  }
  if (isObj(value)) {
    return textOf(value.text ?? value.detail ?? value.summary ?? value.description ?? value.value ?? '');
  }
  return String(value).trim();
}

const listOf = (value: any): any[] =>
  Array.isArray(value) ? value : value === null || value === undefined ? [] : [value];

/** The first key that actually carries something, so aliases cost one lookup, not six. */
function first(source: any, keys: string[]): any {
  if (!isObj(source)) return undefined;
  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null && source[key] !== '') return source[key];
  }
  return undefined;
}

const monthNumber = (value: any): number | null => {
  const direct = numOf(value);
  if (direct !== null) return direct >= 1 && direct <= 12 ? Math.round(direct) : null;
  const text = textOf(value).toLowerCase();
  const index = MONTH_NAMES.findIndex(
    name => name.toLowerCase() === text || name.toLowerCase().startsWith(text.slice(0, 3)),
  );
  return text.length >= 3 && index >= 0 ? index + 1 : null;
};

const lakh = (rupees: number) => {
  const value = Number(rupees) || 0;
  if (Math.abs(value) >= 100000) {
    const l = value / 100000;
    return `₹${l >= 10 ? l.toFixed(1) : l.toFixed(2).replace(/\.?0+$/, '')}L`;
  }
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
};

export interface ImportedOffer {
  name: string;
  slot: Slot | null;
  headline: string;
  benefit: string;
  customerCopy: string;
  internalDescription: string;
  rationale: string;
  audience: string;
  conditions: string;
  cta: string;
  objective: string;
  offerType: string;
  price: number | null;
  buyers: number | null;
  expectedRevenue: number | null;
  discountPercent: number | null;
  validityStart: string | null;
  validityEnd: string | null;
  runAds: boolean;
  status: string;
  approval: string;
  rank: number | null;
  successMetrics: string[];
  risks: string[];
  mechanics: Record<string, any>;
  fields: Record<string, any> | null;
  origin: Record<string, any> | null;
}

export interface ImportedSection {
  title: string;
  items: Array<{ label: string; value: string; detail: string }>;
}

export interface ImportedKeyDate {
  day: number;
  end?: number;
  name: string;
  kind: string;
  approx?: boolean;
  note?: string;
}

export interface ImportedMonth {
  month: number;
  theme: string;
  /** The two or three words that sit above the theme. */
  kicker: string;
  objective: string;
  strategy: string;
  notes: string;
  target: number;
  priorYear: number;
  streams: { newClient: number; renewal: number; reactivation: number; other: number };
  funnel: Record<string, any>;
  feasibility: string;
  status: string;
  keyDates: ImportedKeyDate[];
  sections: ImportedSection[];
  focusPoints: string[];
  kpis: string[];
  reasoning: Array<{ heading: string; points: string[] }>;
  risks: string[];
  rationaleLines: string[];
  offers: ImportedOffer[];
}

export interface SalesPlanDocument {
  schema: string;
  generatedAt: string | null;
  studioId: number | null;
  studioName: string | null;
  year: number;
  totals: { target: number; priorYear: number; growthPercent: number | null; offers: number };
  trailing: Record<string, number>;
  prices: Record<string, number>;
  basis: string | null;
  measuredWindow: any;
  months: ImportedMonth[];
  hash: string;
}

const VALIDITY = (value: any, key: string) => {
  if (isObj(value)) return textOf(value[key]) || null;
  return textOf(value) || null;
};

function offerFrom(raw: any, index: number): ImportedOffer | null {
  const source = isObj(raw) ? raw : null;
  if (!source) return null;
  const name = textOf(first(source, ['name', 'offerName', 'offer', 'title']))
    .replace(/\s+/g, ' ')
    .trim();
  if (!name) return null;
  const validity = first(source, ['validity', 'dates', 'window']);
  const price = numOf(first(source, ['price', 'expectedAsp', 'expected_asp', 'sellingPrice', 'asp']));
  const buyers = numOf(first(source, ['buyers', 'targetPurchases', 'target_purchases', 'units', 'expectedBuyers']));
  const revenue = numOf(first(source, ['expectedRevenue', 'expected_revenue', 'revenue', 'modelledRevenue']));
  const rawSlot = textOf(first(source, ['slot', 'planSlot', 'plan_slot', 'journeySlot'])).toLowerCase();
  const slot = (SLOTS as readonly string[]).includes(rawSlot) ? (rawSlot as Slot) : null;
  const discount = numOf(
    first(source, [
      'effectiveDiscountPercent',
      'effectiveDiscount',
      'effective_discount',
      'discountPercent',
      'discount',
    ]),
  );
  const metrics = listOf(first(source, ['successMetrics', 'success_metrics', 'kpis', 'whatToWatch']))
    .map(textOf)
    .filter(Boolean);
  const risks = listOf(first(source, ['risks', 'risk', 'whatToWatchOut']))
    .map(textOf)
    .filter(Boolean);
  return {
    name,
    slot,
    headline: textOf(first(source, ['headline', 'tagline', 'strapline'])),
    benefit: textOf(first(source, ['benefit', 'whatYouGet', 'value'])),
    customerCopy: textOf(first(source, ['customerCopy', 'customer_copy', 'clientCopy', 'copy'])),
    internalDescription: textOf(first(source, ['internalDescription', 'internal_description', 'internal'])),
    rationale: textOf(first(source, ['rationale', 'why', 'whyItWorks', 'reasoning'])),
    audience: textOf(first(source, ['audience', 'whoQualifies', 'who', 'eligibility'])),
    conditions: textOf(first(source, ['conditions', 'redemptionConditions', 'redemption_conditions', 'rules'])),
    cta: textOf(first(source, ['cta', 'callToAction', 'call_to_action'])),
    objective: textOf(first(source, ['objective', 'job', 'stream'])) || guessObjective(slot),
    offerType: textOf(first(source, ['offerType', 'offer_type', 'type', 'mechanic'])) || 'percentage',
    price,
    buyers,
    expectedRevenue: revenue,
    discountPercent: discount,
    validityStart:
      textOf(first(source, ['validityStart', 'validity_start', 'starts', 'start', 'from'])) ||
      VALIDITY(validity, 'start'),
    validityEnd:
      textOf(first(source, ['validityEnd', 'validity_end', 'ends', 'end', 'to'])) || VALIDITY(validity, 'end'),
    runAds: Boolean(first(source, ['runAds', 'run_ads', 'ads']) ?? false),
    status: (textOf(first(source, ['status'])) || 'draft').toLowerCase(),
    approval: (textOf(first(source, ['approval', 'approvalStatus', 'approval_status'])) || 'pending').toLowerCase(),
    rank: numOf(first(source, ['rank', 'planRank', 'plan_rank', 'order'])) ?? index + 1,
    successMetrics: metrics,
    risks,
    mechanics: (() => {
      const value = first(source, ['mechanics', 'mechanism']);
      if (isObj(value)) return value;
      const text = textOf(value);
      return text ? { mechanism: text } : {};
    })(),
    fields: (() => {
      const value = first(source, ['fields', 'planFields', 'detail']);
      return isObj(value) ? value : null;
    })(),
    origin: (() => {
      const value = first(source, ['provenance', 'origin']);
      return isObj(value) ? value : null;
    })(),
  };
}

function guessObjective(slot: Slot | null) {
  if (slot === 'newcomer') return 'acquisition';
  if (slot === 'lapsed') return 'reactivation';
  if (slot === 'renewal') return 'retention';
  return 'acquisition';
}

/** "Week 2", "2", "Second week" — all the same week in the execution plan. */
export function weekOf(title: string, index: number): number {
  const text = String(title || '').toLowerCase();
  const week = text.match(/week\s*([0-5])/);
  if (week) return Number(week[1]);
  const leading = text.match(/^\s*([1-5])\b/);
  if (leading) return Number(leading[1]);
  return Math.min(5, Math.max(1, index + 1));
}

/** The Week 1–4 sections become the month's action plan, one action per line. */
export function actionsFromSections(sections: ImportedSection[]): Array<{
  week: number;
  owner: string;
  text: string;
  done: boolean;
}> {
  const actions: Array<{ week: number; owner: string; text: string; done: boolean }> = [];
  sections.forEach((section, index) => {
    const week = weekOf(section.title, index);
    for (const item of section.items) {
      const owner = (textOf(item.label) || textOf(item.value) || '').replace(/\s*\|\s*/g, ' / ').trim();
      const body =
        textOf(item.detail) || (textOf(item.value) && !owner.startsWith(textOf(item.value)) ? textOf(item.value) : '');
      const text = (body || textOf(item.value) || '').trim();
      if (!text && !owner) continue;
      actions.push({ week, owner: owner.slice(0, 80), text: (text || owner).slice(0, 500), done: false });
    }
  });
  return actions;
}

function keyDatesFrom(raw: any): ImportedKeyDate[] {
  const dates: ImportedKeyDate[] = [];
  for (const entry of listOf(raw)) {
    if (!isObj(entry)) continue;
    const name = textOf(first(entry, ['name', 'title', 'event']));
    if (!name) continue;
    const dateText = textOf(first(entry, ['date', 'when']));
    const fromDate = dateText.match(/(\d{4})-(\d{2})-(\d{2})/);
    const day =
      numOf(first(entry, ['day', 'date_day'])) ??
      (fromDate ? Number(fromDate[3]) : null) ??
      numOf(textOf(first(entry, ['label', 'dayLabel'])).match(/(\d{1,2})/)?.[1]);
    if (!day || day < 1 || day > 31) continue;
    const kind = (textOf(first(entry, ['kind', 'type', 'category'])) || 'festival').toLowerCase();
    const endDay = numOf(first(entry, ['end', 'endDay']));
    dates.push({
      day: Math.round(day),
      ...(endDay ? { end: Math.round(endDay) } : {}),
      name,
      kind,
      ...(entry.approx === true ? { approx: true } : {}),
      ...(textOf(first(entry, ['note', 'why'])) ? { note: textOf(first(entry, ['note', 'why'])) } : {}),
    });
  }
  return dates.sort((a, b) => a.day - b.day);
}

function sectionsFrom(raw: any): ImportedSection[] {
  const sections: ImportedSection[] = [];
  for (const [index, entry] of listOf(raw).entries()) {
    if (!isObj(entry)) continue;
    const title = textOf(first(entry, ['title', 'name', 'week', 'heading'])) || `Week ${index + 1}`;
    const items = listOf(first(entry, ['items', 'tasks', 'actions', 'steps', 'rows']))
      .filter(isObj)
      .map(item => ({
        label: textOf(first(item, ['label', 'owner', 'who', 'lead'])),
        value: textOf(first(item, ['value', 'owners', 'roles'])),
        detail: textOf(first(item, ['detail', 'text', 'task', 'action', 'what', 'description'])),
      }))
      .filter(item => item.label || item.value || item.detail);
    sections.push({ title, items });
  }
  return sections;
}

function monthFrom(raw: any, fallbackMonth: number): ImportedMonth | null {
  if (!isObj(raw)) return null;
  const month = monthNumber(first(raw, ['month', 'monthNumber', 'month_number'])) ?? fallbackMonth;
  if (!month) return null;
  const figures = isObj(raw.figures) ? raw.figures : {};
  const streamsRaw = isObj(raw.streams) ? raw.streams : isObj(figures) ? figures : {};
  const streams = {
    newClient:
      numOf(first(streamsRaw, ['newClient', 'new_client', 'newClientPlan', 'newClients'])) ??
      numOf(first(raw, ['newClientTarget', 'new_client_target'])) ??
      0,
    renewal:
      numOf(first(streamsRaw, ['renewal', 'renewalPlan', 'renewals'])) ??
      numOf(first(raw, ['renewalTarget', 'renewal_target'])) ??
      0,
    reactivation:
      numOf(first(streamsRaw, ['reactivation', 'reactivationPlan', 'comeback', 'winback'])) ??
      numOf(first(raw, ['reactivationTarget', 'reactivation_target'])) ??
      0,
    other: numOf(first(streamsRaw, ['other', 'otherPlan', 'otherTarget'])) ?? numOf(first(raw, ['otherTarget'])) ?? 0,
  };
  const target =
    numOf(first(raw, ['target', 'revenueTarget', 'revenue', 'total'])) ??
    numOf(first(figures, ['target', 'revenue'])) ??
    0;
  const live = target || streams.newClient + streams.renewal + streams.reactivation + streams.other;
  const sections = sectionsFrom(first(raw, ['sections', 'weeks', 'execution', 'actionPlan']));
  const offers = listOf(first(raw, ['offers']))
    .map(offerFrom)
    .filter((offer): offer is ImportedOffer => Boolean(offer));
  const focusPoints = listOf(first(raw, ['focusPoints', 'focus', 'focusAreas']))
    .map(textOf)
    .filter(Boolean);
  const reasoning = listOf(first(raw, ['reasoning', 'aiReasoning']))
    .filter(isObj)
    .map(entry => ({
      heading: textOf(first(entry, ['heading', 'title'])) || 'Why this month works',
      points: listOf(first(entry, ['points', 'items']))
        .map(textOf)
        .filter(Boolean),
    }))
    .filter(entry => entry.points.length);
  const funnel = isObj(first(raw, ['funnel', 'volumes']))
    ? (first(raw, ['funnel', 'volumes']) as Record<string, any>)
    : {};
  return {
    month,
    theme: textOf(first(raw, ['theme', 'chapter', 'name'])),
    kicker: textOf(first(raw, ['kicker', 'hook', 'strapline', 'eyebrow'])),
    objective: textOf(first(raw, ['objective', 'job', 'goal', 'commercialJob'])),
    strategy: textOf(first(raw, ['strategy', 'approach', 'plays', 'plan'])),
    notes: textOf(first(raw, ['notes', 'brief', 'moment', 'narrative'])),
    target: live,
    priorYear:
      numOf(first(raw, ['priorYear', 'lastYear', 'previousYear'])) ??
      numOf(first(figures, ['projected', 'priorYear', 'lastYear'])) ??
      0,
    streams,
    funnel,
    feasibility: textOf(first(raw, ['feasibility', 'stretch', 'risk', 'temper'])),
    status: ['draft', 'final'].includes((textOf(first(raw, ['status'])) || '').toLowerCase())
      ? (textOf(first(raw, ['status'])) || 'draft').toLowerCase()
      : 'draft',
    keyDates: keyDatesFrom(first(raw, ['keyDates', 'dates', 'moments'])),
    sections,
    focusPoints,
    kpis: listOf(first(raw, ['kpis', 'kpi']))
      .map(textOf)
      .filter(Boolean),
    reasoning,
    risks: listOf(first(raw, ['risks', 'watchouts']))
      .map(textOf)
      .filter(Boolean),
    rationaleLines: listOf(first(raw, ['rationale', 'arguments']))
      .map(textOf)
      .filter(Boolean),
    offers,
  };
}

/** Reads any `p57-sales-plan/1`-shaped document into the one shape the writer understands. */
export function parseSalesPlan(input: any): SalesPlanDocument {
  const source = typeof input === 'string' ? JSON.parse(input) : input;
  if (!isObj(source)) throw Object.assign(new Error('The plan must be a JSON object.'), { status: 400 });
  const schema = textOf(source.schema) || PLAN_SCHEMA;
  if (!/^p57-sales-plan\/\d+$/.test(schema))
    throw Object.assign(
      new Error(`This is not a plan document — expected schema “${PLAN_SCHEMA}”, found “${schema || 'none'}”.`),
      { status: 400 },
    );

  // One location or several: a portfolio export is narrowed by the caller, a single location
  // document is read as-is.
  const studios = listOf(source.studios).filter(isObj);
  const studioBlock = studios.length === 1 ? studios[0] : null;
  const year = numOf(first(source, ['year', 'planningYear'])) ?? numOf(first(studioBlock, ['year'])) ?? 2027;
  const studioInfo = isObj(source.studio) ? source.studio : isObj(studioBlock?.studio) ? studioBlock.studio : {};
  const scopeStudio =
    isObj(source.scope) && listOf(source.scope.studios).length === 1 ? listOf(source.scope.studios)[0] : null;

  const rawMonths = listOf(
    first(source, ['months']) ??
      first(studioBlock, ['months']) ??
      first(isObj(source.year) ? source.year : {}, ['months']),
  );
  const months = rawMonths
    .map((raw, index) => monthFrom(raw, index + 1))
    .filter((month): month is ImportedMonth => Boolean(month))
    .sort((a, b) => a.month - b.month);
  if (!months.length)
    throw Object.assign(new Error('No months found in this plan. Expected a `months` list.'), { status: 400 });

  const yearBlock = isObj(studioBlock?.year) ? studioBlock.year : isObj(source.year) ? source.year : {};
  const totalsRaw = isObj(source.totals) ? source.totals : {};
  const target = numOf(first(totalsRaw, ['target', 'revenue'])) ?? months.reduce((sum, m) => sum + m.target, 0);
  const priorYear =
    numOf(first(totalsRaw, ['priorYear', 'lastYear'])) ??
    numOf(first(yearBlock, ['priorYear', 'lastYear'])) ??
    months.reduce((sum, m) => sum + m.priorYear, 0);
  const trailingRaw = isObj(first(studioBlock, ['trailing']) ?? first(source, ['trailing']))
    ? (first(studioBlock, ['trailing']) ?? first(source, ['trailing']))
    : {};
  const trailing: Record<string, number> = {};
  for (const key of Object.keys(ASSUMPTION_KEYS) as AssumptionKey[]) {
    const value = numOf(trailingRaw[key]);
    if (value !== null && value !== 0) trailing[key] = value;
  }
  const pricesSource = first(studioBlock, ['prices']) ?? first(source, ['prices']);
  const pricesRaw: Record<string, any> = isObj(pricesSource) ? pricesSource : {};
  const prices: Record<string, number> = {};
  for (const [key, value] of Object.entries(pricesRaw)) {
    const n = numOf(value);
    if (n !== null) prices[key] = n;
  }

  const hash = crypto.createHash('sha1').update(JSON.stringify(source)).digest('hex').slice(0, 16);

  return {
    schema,
    generatedAt: textOf(first(source, ['generatedAt', 'generated_at'])) || null,
    studioId:
      numOf(first(studioInfo, ['id'])) ?? numOf(first(scopeStudio, ['id'])) ?? numOf(first(source, ['studioId'])),
    studioName:
      textOf(first(studioInfo, ['name'])) ||
      textOf(first(scopeStudio, ['name'])) ||
      textOf(first(source, ['studioName', 'studio'])) ||
      null,
    year,
    totals: {
      target,
      priorYear,
      growthPercent: priorYear ? Number((((target - priorYear) / priorYear) * 100).toFixed(1)) : null,
      offers: months.reduce((sum, m) => sum + m.offers.length, 0),
    },
    trailing,
    prices,
    basis: textOf(first(studioBlock, ['basis'])) || textOf(first(source, ['basis'])) || null,
    measuredWindow: first(studioBlock, ['measuredWindow']) ?? first(source, ['measuredWindow']) ?? null,
    months,
    hash,
  };
}

/* ── What the import would change ───────────────────────────────────────────── */

export interface MonthPreview {
  month: number;
  name: string;
  action: 'create' | 'update' | 'skip';
  theme: string;
  target: number;
  priorYear: number;
  streams: ImportedMonth['streams'];
  offers: number;
  offersCreate: number;
  offersUpdate: number;
  current: { theme: string | null; target: number | null; approved: number | null; offers: number } | null;
  changes: Array<{ field: string; label: string; from: string; to: string }>;
  actions: number;
  messages: string[];
}

export interface ImportContext {
  studioId: number;
  year: number;
  mode: ImportMode;
  approve: boolean;
  useRates: boolean;
  userId: number | null;
}

const json = (value: any, fallback: any) => {
  if (value && typeof value === 'object') return value;
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

function currentMonth(studioId: number, year: number, month: number) {
  const target = db
    .prepare('SELECT * FROM monthly_targets WHERE studio_id=? AND year=? AND month=?')
    .get(studioId, year, month) as any;
  const plan = db
    .prepare('SELECT * FROM monthly_plans WHERE studio_id=? AND year=? AND month=?')
    .get(studioId, year, month) as any;
  if (!target && !plan) return null;
  const ids = [
    ...Object.values(json(plan?.slots, {}) || {}).filter(Boolean),
    ...((json(plan?.offer_ids, []) as any[]) || []),
  ] as number[];
  return { target, plan, offers: new Set(ids.map(Number)).size };
}

function existingOffers(studioId: number, year: number, month: number) {
  return db
    .prepare("SELECT * FROM offers WHERE studio_id=? AND year=? AND month=? AND status NOT IN ('archived','rejected')")
    .all(studioId, year, month) as any[];
}

function matchOffer(rows: any[], name: string, used: Set<number>) {
  const key = name.trim().toLowerCase();
  return rows.find(
    row =>
      !used.has(row.id) &&
      String(row.name || '')
        .trim()
        .toLowerCase() === key,
  );
}

/** The month's focus points, when the document does not spell them out. */
export function focusPointsFor(month: ImportedMonth): string[] {
  if (month.focusPoints.length) return month.focusPoints;
  const name = MONTH_NAMES[month.month - 1];
  const funnel = month.funnel || {};
  const points: string[] = [];
  if (month.target)
    points.push(
      `Hit the ${name} target of ${lakh(month.target)}${month.priorYear ? ` (${lakh(month.priorYear)} last year)` : ''}.`,
    );
  const leads = numOf(funnel.leads);
  const trials = numOf(funnel.trials);
  const buyers = numOf(funnel.newBuyers);
  if (leads || trials || buyers)
    points.push(
      `New clients: ${leads ?? '—'} leads → ${trials ?? '—'} trials → ${buyers ?? '—'} new buyers (${lakh(month.streams.newClient)}).`,
    );
  if (month.streams.renewal) {
    const renewals = numOf(funnel.existingPayingRenewals);
    const coverage = numOf(funnel.renewalCoverage);
    const funded = coverage === null ? '' : `, ${Math.round(Math.min(1, coverage) * 100)}% of the expiring book funded`;
    points.push(
      renewals === null
        ? `Renewals: ${lakh(month.streams.renewal)} planned${funded}.`
        : `Renewals: ${renewals} memberships${funded} (${lakh(month.streams.renewal)}).`,
    );
  }
  if (month.streams.reactivation || month.streams.other) {
    const winbacks = numOf(funnel.winbacksNeeded);
    points.push(
      `Comebacks: ${winbacks === null ? 'lapsed clients returning' : `${winbacks} lapsed clients back`} (${lakh(month.streams.reactivation)}); privates, retail and drop-ins ${lakh(month.streams.other)}.`,
    );
  }
  if (month.offers.length) {
    const named = month.offers.map(offer => offer.name);
    const listed = named.slice(0, 3).join(' · ') + (named.length > 3 ? ` · +${named.length - 3} more` : '');
    points.push(`${month.offers.length} offers this month: ${listed}.`);
  }
  return points.slice(0, 6).map(point => (point.length > 240 ? `${point.slice(0, 237).trimEnd()}…` : point));
}

function strategyFor(month: ImportedMonth): string {
  if (month.strategy) return month.strategy;
  const lines = [
    `${month.theme || MONTH_NAMES[month.month - 1]} — ${month.objective || 'the month’s commercial job'}`,
    ...month.offers.map(offer => {
      const slot = offer.slot ? `${offer.slot[0].toUpperCase()}${offer.slot.slice(1)}: ` : '';
      return `${slot}${offer.name}${offer.headline ? ` — ${offer.headline}` : ''}`;
    }),
  ];
  return lines.filter(Boolean).join('\n\n');
}

function contentFor(month: ImportedMonth, plan: SalesPlanDocument, context: ImportContext) {
  const focusPoints = focusPointsFor(month);
  const actions = actionsFromSections(month.sections);
  const kpis = month.kpis.length
    ? month.kpis
    : month.offers.map(offer => `${offer.name}: ${offer.audience || offer.rationale || 'watch take-up'}`);
  const content: Record<string, any> = {
    ...(month.kicker ? { kicker: month.kicker } : {}),
    // The document's own statement of the month last year. It is kept beside the row because
    // the target row carries the measured history instead, and the plan's growth is against
    // the number the studio wrote — not against whichever vintage the database happens to hold.
    ...(month.priorYear ? { priorYear: month.priorYear } : {}),
    focusPoints,
    ...(kpis.length ? { kpis, kpi: kpis[0] } : {}),
    ...(month.keyDates.length ? { keyDates: month.keyDates } : {}),
    ...(month.sections.length ? { sections: month.sections } : {}),
    ...(month.feasibility ? { feasibility: month.feasibility } : {}),
    ...(Object.keys(month.funnel).length ? { funnel: month.funnel } : {}),
    streams: month.streams,
    planImport: {
      schema: plan.schema,
      source: PLAN_IMPORT_SOURCE,
      generatedAt: plan.generatedAt,
      importedAt: new Date().toISOString(),
      hash: plan.hash,
      mode: context.mode,
      totals: plan.totals,
      basis: plan.basis,
      measuredWindow: plan.measuredWindow,
      prices: plan.prices,
    },
  };
  if (month.reasoning.length || month.risks.length || month.rationaleLines.length) {
    content.ai = {
      splitRationale: month.rationaleLines.join('\n'),
      reasoning: month.reasoning,
      risks: month.risks,
      generatedAt: plan.generatedAt || new Date().toISOString(),
      mode: 'synthesised',
    };
  }
  return { content, focusPoints, actions, kpis };
}

function offerColumnsFor(offer: ImportedOffer, month: ImportedMonth, context: ImportContext, index: number) {
  const streamTarget =
    offer.slot === 'newcomer'
      ? month.streams.newClient
      : offer.slot === 'lapsed'
        ? month.streams.reactivation
        : offer.slot === 'renewal'
          ? month.streams.renewal
          : Math.round(month.target / Math.max(1, month.offers.length));
  const price =
    offer.price ?? (offer.buyers && offer.expectedRevenue ? Math.round(offer.expectedRevenue / offer.buyers) : null);
  return {
    name: offer.name,
    headline: offer.headline || null,
    customer_copy: offer.customerCopy || null,
    internal_description: offer.internalDescription || null,
    rationale: offer.rationale || null,
    objective: offer.objective,
    offer_type: offer.offerType,
    studio_id: context.studioId,
    month: month.month,
    year: context.year,
    audience: offer.audience || null,
    benefit: offer.benefit || null,
    redemption_conditions: offer.conditions || null,
    cta: offer.cta || null,
    plan_slot: offer.slot,
    plan_rank: offer.rank ?? index + 1,
    validity_start: offer.validityStart,
    validity_end: offer.validityEnd,
    target_purchases: offer.buyers,
    expected_asp: price,
    expected_revenue: offer.expectedRevenue,
    revenue_target: streamTarget,
    effective_discount: offer.discountPercent,
    mechanics: JSON.stringify(offer.mechanics || {}),
    provenance: JSON.stringify({
      ...(offer.origin || {}),
      source: PLAN_IMPORT_SOURCE,
      planMonth: month.month,
      slot: offer.slot,
      ...(offer.fields ? { fields: offer.fields } : {}),
    }),
    status: ['draft', 'approved', 'active', 'completed', 'rejected'].includes(offer.status) ? offer.status : 'draft',
    approval_status: ['pending', 'approved', 'rejected'].includes(offer.approval) ? offer.approval : 'pending',
    run_ads: offer.runAds ? 1 : 0,
    success_metrics: JSON.stringify(offer.successMetrics.length ? offer.successMetrics : kpisOf(offer)),
    risks: JSON.stringify(offer.risks),
    data_mode: 'user',
    generation_source: PLAN_IMPORT_SOURCE,
  };
}

function kpisOf(offer: ImportedOffer): string[] {
  const out: string[] = [];
  if (offer.buyers) out.push(`${offer.buyers} buyers planned`);
  if (offer.expectedRevenue) out.push(`${lakh(offer.expectedRevenue)} planned revenue`);
  if (offer.discountPercent !== null) out.push(`${offer.discountPercent}% effective discount`);
  return out;
}

/** Everything the preview and the write share: what each month would become. */
export function previewSalesPlan(
  plan: SalesPlanDocument,
  context: ImportContext,
): {
  months: MonthPreview[];
  warnings: string[];
  totals: { target: number; priorYear: number; months: number; offers: number };
} {
  const warnings: string[] = [];
  const months: MonthPreview[] = [];
  const monthSum = plan.months.reduce((sum, m) => sum + m.target, 0);
  if (plan.totals.target && Math.abs(monthSum - plan.totals.target) > 1)
    warnings.push(
      `The month targets add up to ${lakh(monthSum)}, not the ${lakh(plan.totals.target)} the document states.`,
    );
  if (plan.months.length < 12) warnings.push(`The document covers ${plan.months.length} of 12 months.`);

  for (const month of plan.months) {
    const name = MONTH_NAMES[month.month - 1];
    const current = currentMonth(context.studioId, context.year, month.month);
    const rows = existingOffers(context.studioId, context.year, month.month);
    const used = new Set<number>();
    let offersCreate = 0,
      offersUpdate = 0;
    for (const offer of month.offers) {
      const match = matchOffer(rows, offer.name, used);
      if (match) {
        used.add(match.id);
        offersUpdate++;
      } else offersCreate++;
    }
    const messages: string[] = [];
    const streams = month.streams;
    const streamSum = streams.newClient + streams.renewal + streams.reactivation + streams.other;
    if (month.target && Math.abs(streamSum - month.target) > 1)
      messages.push(`Streams add to ${lakh(streamSum)} against a ${lakh(month.target)} target.`);
    if (!month.offers.length) messages.push('No offers in this month.');
    if (!month.objective) messages.push('No objective in the file — the plan row keeps its own.');
    if (!month.strategy) messages.push('No strategy in the file — it is written from the name, offers and objective.');
    if (month.priorYear === 0) messages.push('No prior-year figure in the file.');

    const action: MonthPreview['action'] = context.mode === 'add' && current ? 'skip' : current ? 'update' : 'create';
    const changes: MonthPreview['changes'] = [];
    const compare = (field: string, label: string, from: any, to: any, format = (v: any) => textOf(v)) => {
      const before = format(from);
      const after = format(to);
      if (before === after) return;
      changes.push({ field, label, from: before || '—', to: after || '—' });
    };
    compare('theme', 'Theme', current?.plan?.theme, month.theme);
    compare('target', 'Target', current?.target?.proposed_target, month.target, v =>
      numOf(v) ? lakh(Number(v)) : '—',
    );
    compare(
      'approved',
      'Approved target',
      current?.target?.approved_target,
      context.approve ? month.target : current?.target?.approved_target,
      v => (numOf(v) ? lakh(Number(v)) : 'not approved'),
    );
    compare('newClient', 'New clients', current?.target?.new_client_target, streams.newClient, v =>
      numOf(v) ? lakh(Number(v)) : '—',
    );
    compare('renewal', 'Renewals', current?.target?.renewal_target, streams.renewal, v =>
      numOf(v) ? lakh(Number(v)) : '—',
    );
    compare('reactivation', 'Comebacks', current?.target?.reactivation_target, streams.reactivation, v =>
      numOf(v) ? lakh(Number(v)) : '—',
    );
    compare('offers', 'Offers', current?.offers, month.offers.length, v => textOf(v ?? '—'));

    months.push({
      month: month.month,
      name,
      action,
      theme: month.theme,
      target: month.target,
      priorYear: month.priorYear,
      streams: month.streams,
      offers: month.offers.length,
      offersCreate,
      offersUpdate,
      current: current
        ? {
            theme: current.plan?.theme ?? null,
            target: numOf(current.target?.proposed_target),
            approved: numOf(current.target?.approved_target),
            offers: current.offers,
          }
        : null,
      changes,
      actions: actionsFromSections(month.sections).length,
      messages,
    });
    for (const message of messages) warnings.push(`${name}: ${message}`);
  }

  return {
    months,
    warnings: [...new Set(warnings)],
    totals: {
      target: plan.totals.target,
      priorYear: plan.totals.priorYear,
      months: plan.months.length,
      offers: plan.totals.offers,
    },
  };
}

/* ── Writing the plan ───────────────────────────────────────────────────────── */

function writeOffers(month: ImportedMonth, context: ImportContext) {
  const rows = existingOffers(context.studioId, context.year, month.month);
  const used = new Set<number>();
  const written: Array<{ id: number; slot: Slot | null; rank: number }> = [];
  let created = 0,
    updated = 0,
    unchanged = 0;
  month.offers.forEach((offer, index) => {
    const columns = offerColumnsFor(offer, month, context, index);
    const match = matchOffer(rows, offer.name, used);
    if (!match) {
      const uid = `P57-${context.year}-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
      const keys = Object.keys(columns);
      const id = db
        .prepare(`INSERT INTO offers(offer_uid,created_by,${keys.join(',')}) VALUES (?,?${',?'.repeat(keys.length)})`)
        .run(uid, context.userId, ...Object.values(columns)).lastInsertRowid as number;
      created++;
      written.push({ id, slot: offer.slot, rank: columns.plan_rank });
      return;
    }
    used.add(match.id);
    const changes = Object.entries(columns).filter(([key, value]) => {
      const before = match[key];
      if (value === null) return before !== null && before !== undefined && before !== '';
      return String(before ?? '') !== String(value);
    });
    if (!changes.length) {
      unchanged++;
      written.push({ id: match.id, slot: offer.slot, rank: columns.plan_rank });
      return;
    }
    db.prepare(
      `UPDATE offers SET ${changes.map(([key]) => `${key}=?`).join(',')}, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
    ).run(...changes.map(([, value]) => value), match.id);
    const version =
      Number((db.prepare('SELECT MAX(version) v FROM offer_versions WHERE offer_id=?').get(match.id) as any)?.v || 0) +
      1;
    db.prepare('INSERT INTO offer_versions(offer_id,version,snapshot,changed_by) VALUES (?,?,?,?)').run(
      match.id,
      version,
      JSON.stringify(db.prepare('SELECT * FROM offers WHERE id=?').get(match.id)),
      context.userId,
    );
    updated++;
    written.push({ id: match.id, slot: offer.slot, rank: columns.plan_rank });
  });

  // Replace makes the month exactly what the file says. Only this importer's own offers are
  // retired: a mechanic another script attached to the month keeps its place.
  let archived = 0;
  if (context.mode === 'replace') {
    for (const row of rows) {
      if (used.has(row.id) || written.some(entry => entry.id === row.id)) continue;
      if (!PLAN_OWNED.has(String(row.generation_source))) continue;
      db.prepare("UPDATE offers SET status='archived', updated_at=CURRENT_TIMESTAMP WHERE id=?").run(row.id);
      archived++;
    }
  }
  return { written, created, updated, unchanged, archived };
}

function writeTarget(month: ImportedMonth, context: ImportContext, plan: SalesPlanDocument) {
  const existing = db
    .prepare('SELECT * FROM monthly_targets WHERE studio_id=? AND year=? AND month=?')
    .get(context.studioId, context.year, month.month) as any;
  const target = Math.round(month.target);
  const approved = context.approve ? target : (numOf(existing?.approved_target) ?? null);
  const funnel = month.funnel || {};
  const assumptions = {
    ...json(existing?.assumptions, {}),
    planImport: {
      hash: plan.hash,
      mode: context.mode,
      importedAt: new Date().toISOString(),
      basis: plan.basis,
      measuredWindow: plan.measuredWindow,
      trailing: plan.trailing,
      prices: plan.prices,
      feasibility: month.feasibility || null,
    },
  };
  const growth = month.priorYear > 0 ? Number(((target / month.priorYear - 1) * 100).toFixed(1)) : null;
  if (!existing) {
    const id = db
      .prepare(
        `INSERT INTO monthly_targets(studio_id,year,month,scenario,historical_revenue,baseline_forecast,proposed_target,
          approved_target,target_growth,new_client_target,renewal_target,repeat_target,reactivation_target,other_target,
          funnel,assumptions,source,data_mode,version,override_reason,updated_by)
         VALUES (?,?,?,'base',?,?,?,?,?,?,?,?,?,?,?,?,'plan_import','imported',1,?,?)`,
      )
      .run(
        context.studioId,
        context.year,
        month.month,
        month.priorYear || null,
        target,
        target,
        approved,
        growth,
        Math.round(month.streams.newClient),
        Math.round(month.streams.renewal),
        Math.max(
          0,
          Math.round(
            target - month.streams.newClient - month.streams.renewal - month.streams.reactivation - month.streams.other,
          ),
        ),
        Math.round(month.streams.reactivation),
        Math.round(month.streams.other),
        JSON.stringify(funnel),
        JSON.stringify(assumptions),
        `Imported plan ${plan.hash}`,
        context.userId,
      ).lastInsertRowid as number;
    return { id, created: true };
  }
  const changed =
    Number(existing.proposed_target) !== target ||
    (approved !== null && Number(existing.approved_target) !== approved) ||
    Number(existing.new_client_target) !== Math.round(month.streams.newClient) ||
    Number(existing.renewal_target) !== Math.round(month.streams.renewal) ||
    Number(existing.reactivation_target) !== Math.round(month.streams.reactivation);
  if (!changed) return { id: existing.id, created: false };
  const version = Number(existing.version || 1) + 1;
  db.prepare(
    `UPDATE monthly_targets SET proposed_target=?, approved_target=?, historical_revenue=?, baseline_forecast=?,
       target_growth=?, new_client_target=?, renewal_target=?, reactivation_target=?, other_target=?,
       funnel=?, assumptions=?, source='plan_import', data_mode='imported', version=?, override_reason=?, updated_by=?,
       updated_at=CURRENT_TIMESTAMP WHERE id=?`,
  ).run(
    target,
    approved,
    month.priorYear || existing.historical_revenue || null,
    target,
    growth,
    Math.round(month.streams.newClient),
    Math.round(month.streams.renewal),
    Math.round(month.streams.reactivation),
    Math.round(month.streams.other),
    JSON.stringify(funnel),
    JSON.stringify(assumptions),
    version,
    `Imported plan ${plan.hash}`,
    context.userId,
    existing.id,
  );
  db.prepare('INSERT INTO target_versions(target_id,version,snapshot,change_reason,changed_by) VALUES (?,?,?,?,?)').run(
    existing.id,
    version,
    JSON.stringify(db.prepare('SELECT * FROM monthly_targets WHERE id=?').get(existing.id)),
    `Plan imported (${plan.hash}).`,
    context.userId,
  );
  return { id: existing.id, created: false };
}

function writePlan(month: ImportedMonth, context: ImportContext, plan: SalesPlanDocument, offerIds: number[]) {
  const { content, actions } = contentFor(month, plan, context);
  const slots: Record<string, number | null> = { newcomer: null, lapsed: null, renewal: null };
  const extras: number[] = [];
  const ordered = [...offerIds];
  const rows = db
    .prepare(
      `SELECT id, plan_slot FROM offers WHERE id IN (${ordered.length ? ordered.map(() => '?').join(',') : 'NULL'})`,
    )
    .all(...ordered) as any[];
  for (const id of ordered) {
    const slot = rows.find(row => Number(row.id) === id)?.plan_slot as Slot | undefined;
    if (slot && SLOTS.includes(slot) && !slots[slot]) slots[slot] = id;
    else extras.push(id);
  }
  db.prepare(
    `INSERT INTO monthly_plans(studio_id,year,month,theme,objective,strategy,actions,notes,status,content,slots,offer_ids,updated_by)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(studio_id,year,month) DO UPDATE SET theme=excluded.theme, objective=excluded.objective,
       strategy=excluded.strategy, actions=excluded.actions, notes=excluded.notes, status=excluded.status,
       content=excluded.content, slots=excluded.slots, offer_ids=excluded.offer_ids,
       updated_by=excluded.updated_by, updated_at=CURRENT_TIMESTAMP`,
  ).run(
    context.studioId,
    context.year,
    month.month,
    month.theme || null,
    month.objective || null,
    strategyFor(month),
    JSON.stringify(actions),
    month.notes || null,
    month.status,
    JSON.stringify(content),
    JSON.stringify(slots),
    JSON.stringify(extras),
    context.userId,
  );
  return { actions: actions.length, offers: ordered.length };
}

function writeAssumptions(plan: SalesPlanDocument, context: ImportContext) {
  const entries = Object.entries(plan.trailing).filter(([key]) => key in ASSUMPTION_KEYS);
  if (!context.useRates || !entries.length) return 0;
  let written = 0;
  for (const [key, value] of entries) {
    const range = ASSUMPTION_KEYS[key as AssumptionKey];
    if (!(value >= range.min && value <= range.max)) continue;
    db.prepare(
      `INSERT INTO studio_assumptions(studio_id,year,key,value,updated_by,updated_at) VALUES (?,?,?,?,?,CURRENT_TIMESTAMP)
       ON CONFLICT(studio_id,year,key) DO UPDATE SET value=excluded.value, updated_by=excluded.updated_by,
         updated_at=CURRENT_TIMESTAMP`,
    ).run(context.studioId, context.year, key, value, context.userId);
    written++;
  }
  return written;
}

export interface ImportResult {
  months: Array<{
    month: number;
    name: string;
    action: 'create' | 'update' | 'skip';
    offersCreated: number;
    offersUpdated: number;
    offersUnchanged: number;
    offersArchived: number;
    actions: number;
  }>;
  assumptions: number;
  summary: { months: number; created: number; updated: number; skipped: number; offers: number };
}

export function applySalesPlan(plan: SalesPlanDocument, context: ImportContext): ImportResult {
  const result: ImportResult = {
    months: [],
    assumptions: 0,
    summary: { months: 0, created: 0, updated: 0, skipped: 0, offers: 0 },
  };
  db.transaction(() => {
    for (const month of plan.months) {
      const name = MONTH_NAMES[month.month - 1];
      const current = currentMonth(context.studioId, context.year, month.month);
      if (context.mode === 'add' && current) {
        result.months.push({
          month: month.month,
          name,
          action: 'skip',
          offersCreated: 0,
          offersUpdated: 0,
          offersUnchanged: 0,
          offersArchived: 0,
          actions: 0,
        });
        result.summary.skipped++;
        continue;
      }
      writeTarget(month, context, plan);
      const offers = writeOffers(month, context);
      writePlan(
        month,
        context,
        plan,
        offers.written.map(entry => entry.id),
      );
      result.months.push({
        month: month.month,
        name,
        action: current ? 'update' : 'create',
        offersCreated: offers.created,
        offersUpdated: offers.updated,
        offersUnchanged: offers.unchanged,
        offersArchived: offers.archived,
        actions: actionsFromSections(month.sections).length,
      });
      result.summary.months++;
      if (current) result.summary.updated++;
      else result.summary.created++;
      result.summary.offers += offers.created + offers.updated;
    }
    result.assumptions = writeAssumptions(plan, context);
    if (context.mode !== 'add')
      db.prepare(
        `INSERT INTO settings(key,value,updated_at) VALUES(?,?,CURRENT_TIMESTAMP)
         ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP`,
      ).run(
        `${MARKER_PREFIX}:${context.studioId}:${context.year}`,
        JSON.stringify({
          schema: plan.schema,
          hash: plan.hash,
          generatedAt: plan.generatedAt,
          importedAt: new Date().toISOString(),
          mode: context.mode,
          months: plan.months.map(m => m.month),
          totals: plan.totals,
        }),
      );
    audit({
      userId: context.userId,
      action: 'plan.import',
      entityType: 'monthly_plans',
      entityId: `${context.year}-${plan.months.map(m => String(m.month).padStart(2, '0')).join('-')}`,
      studioId: context.studioId,
      after: { mode: context.mode, hash: plan.hash, summary: result.summary, totals: plan.totals },
      reason: `Plan imported from a ${plan.schema} document.`,
    });
  })();
  return result;
}

/* ── The marker that keeps a re-issued plan from overwriting an imported one ── */

export function importedPlan(
  studioId: number,
  year: number,
): {
  schema: string;
  hash: string;
  importedAt: string;
  mode: string;
  months: number[];
} | null {
  const row = db.prepare('SELECT value FROM settings WHERE key=?').get(`${MARKER_PREFIX}:${studioId}:${year}`) as any;
  if (!row?.value) return null;
  const parsed = json(row.value, null);
  return parsed && typeof parsed === 'object' ? (parsed as any) : null;
}

/** True when this location's year was imported rather than written by the shipped plan. */
export function planWasImported(studioId: number, year: number, month?: number): boolean {
  const marker = importedPlan(studioId, year);
  if (!marker) return false;
  if (month === undefined) return true;
  return !Array.isArray(marker.months) || marker.months.includes(month);
}
