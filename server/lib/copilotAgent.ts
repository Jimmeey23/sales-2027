// The app-wide copilot: Claude reads the plan with tools and proposes changes as actions.
// Nothing is written here. The browser shows each proposed action, the planner applies one or
// all of them, and each goes through the app's normal routes (policy, audit, versioning intact).
import { db } from '../db.js';
import { canAccessStudio } from './auth.js';
import { anthropicClient, changeSchema, COPILOT_MODEL } from './offerEditCopilot.js';

export type AgentAction =
  | { kind: 'update_offer'; studioId: number; year: number; month: number; offerId: number; offerName: string; approved: boolean; changes: Record<string, any>; why: string; allLocations: boolean }
  | { kind: 'add_offer'; studioId: number; year: number; month: number; offerId: number; offerName: string; why: string; allLocations: boolean }
  | { kind: 'remove_offer'; studioId: number; year: number; month: number; offerId: number; offerName: string; approved: boolean; why: string; allLocations: boolean }
  | { kind: 'delete_offer'; studioId: number; year: number; month: number; offerId: number; offerName: string; approved: boolean; why: string; allLocations: boolean }
  | { kind: 'create_offer'; studioId: number; year: number; month: number; fields: Record<string, any>; why: string; allLocations: boolean }
  | { kind: 'update_plan'; studioId: number; year: number; month: number; changes: Record<string, any>; why: string };

export interface AgentScope {
  path?: string | null;
  studioId?: number | null;
  year?: number | null;
  month?: number | null;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const json = (v: any, d: any) => {
  if (v == null) return d;
  if (typeof v === 'object') return v;
  try {
    return JSON.parse(v);
  } catch {
    return d;
  }
};

function studios(user: any) {
  return (db.prepare('SELECT id, name, max_discount_percent FROM studios ORDER BY id').all() as any[]).filter(s =>
    canAccessStudio(user, s.id),
  );
}

function offerBrief(o: any) {
  const prov = json(o.provenance, {});
  return {
    id: o.id,
    name: o.name,
    approval_status: o.approval_status,
    objective: o.objective,
    offer_type: o.offer_type,
    plan_slot: o.plan_slot,
    headline: o.headline,
    benefit: o.benefit,
    customer_copy: o.customer_copy ? String(o.customer_copy).slice(0, 600) : null,
    audience: o.audience,
    cta: o.cta,
    redemption_conditions: o.redemption_conditions,
    validity_start: o.validity_start,
    validity_end: o.validity_end,
    target_purchases: o.target_purchases,
    expected_asp: o.expected_asp,
    expected_revenue: o.expected_revenue,
    effective_discount_percent: o.effective_discount,
    cash_discount: prov.pricing?.discount ?? null,
    product: prov.pricing?.product ?? null,
    list_price: prov.pricing?.customListPrice ?? null,
  };
}

function monthOfferIds(studioId: number, year: number, month: number): number[] {
  const plan = db.prepare('SELECT * FROM monthly_plans WHERE studio_id=? AND year=? AND month=?').get(studioId, year, month) as any;
  const ids = new Set<number>();
  const slots = json(plan?.slots, {});
  for (const v of Object.values(slots || {})) if (Number(v) > 0) ids.add(Number(v));
  for (const v of json(plan?.offer_ids, []) || []) if (Number(v) > 0) ids.add(Number(v));
  if (!ids.size)
    for (const r of db.prepare('SELECT id FROM offers WHERE studio_id=? AND year=? AND month=?').all(studioId, year, month) as any[])
      ids.add(r.id);
  return [...ids];
}

function monthPlan(user: any, studioId: number, year: number, month: number) {
  if (!canAccessStudio(user, studioId)) return { error: 'No access to that studio.' };
  const plan = db.prepare('SELECT * FROM monthly_plans WHERE studio_id=? AND year=? AND month=?').get(studioId, year, month) as any;
  const target = db
    .prepare('SELECT proposed_target, approved_target, new_client_target, renewal_target, reactivation_target FROM monthly_targets WHERE studio_id=? AND year=? AND month=? ORDER BY id DESC LIMIT 1')
    .get(studioId, year, month) as any;
  const ids = monthOfferIds(studioId, year, month);
  const offers = ids.length
    ? (db.prepare(`SELECT * FROM offers WHERE id IN (${ids.map(() => '?').join(',')})`).all(...ids) as any[])
    : [];
  return {
    studioId,
    year,
    month: MONTHS[month - 1],
    plan: plan
      ? { theme: plan.theme, objective: plan.objective, strategy: plan.strategy, notes: plan.notes, status: plan.status }
      : null,
    target: target || null,
    offers: offers.map(offerBrief),
  };
}

function yearOverview(user: any, studioId: number, year: number) {
  if (!canAccessStudio(user, studioId)) return { error: 'No access to that studio.' };
  return Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    const plan = db.prepare('SELECT theme, objective, status FROM monthly_plans WHERE studio_id=? AND year=? AND month=?').get(studioId, year, m) as any;
    const t = db.prepare('SELECT proposed_target, approved_target FROM monthly_targets WHERE studio_id=? AND year=? AND month=? ORDER BY id DESC LIMIT 1').get(studioId, year, m) as any;
    const ids = monthOfferIds(studioId, year, m);
    const names = ids.length
      ? (db.prepare(`SELECT name FROM offers WHERE id IN (${ids.map(() => '?').join(',')})`).all(...ids) as any[]).map(r => r.name)
      : [];
    return { month: MONTHS[i], theme: plan?.theme ?? null, objective: plan?.objective ?? null, status: plan?.status ?? null, target: t?.approved_target ?? t?.proposed_target ?? null, offers: names };
  });
}

function searchOffers(user: any, query: string, studioId?: number | null, limit = 15) {
  const q = `%${String(query || '').trim()}%`;
  const rows = db
    .prepare(
      `SELECT * FROM offers WHERE (name LIKE ? OR headline LIKE ? OR benefit LIKE ? OR audience LIKE ? OR offer_type LIKE ?) ${studioId ? 'AND (studio_id=? OR studio_id IS NULL)' : ''} ORDER BY updated_at DESC LIMIT ?`,
    )
    .all(...[q, q, q, q, q, ...(studioId ? [studioId] : []), Math.min(30, limit)]) as any[];
  return rows.filter(r => !r.studio_id || canAccessStudio(user, r.studio_id)).map(r => ({ ...offerBrief(r), studio_id: r.studio_id, month: r.month, year: r.year }));
}

const CHANGE_PROPS = {
  name: { type: 'string' },
  headline: { type: 'string' },
  benefit: { type: 'string' },
  customer_copy: { type: 'string' },
  audience: { type: 'string' },
  cta: { type: 'string' },
  redemption_conditions: { type: 'string' },
  validity_start: { type: 'string', description: 'YYYY-MM-DD' },
  validity_end: { type: 'string', description: 'YYYY-MM-DD' },
  target_purchases: { type: 'number', description: 'Planned buyers' },
  expected_asp: { type: 'number', description: 'Price the client pays, rupees' },
  discount_percent: { type: 'number', description: 'Cash discount off list, 0-50' },
};
const WHERE = {
  studio_id: { type: 'integer' },
  year: { type: 'integer' },
  month: { type: 'integer', description: '1-12' },
};
const ALL = { all_locations: { type: 'boolean', description: 'Mirror to every planning location. Default false: only this studio.' } };

const TOOLS: any[] = [
  { name: 'list_studios', description: 'List the studios (id, name, max discount %) the user can plan for.', input_schema: { type: 'object', properties: {} } },
  { name: 'get_year_overview', description: "One studio's 12 months: theme, objective, status, revenue target and offer names.", input_schema: { type: 'object', properties: { studio_id: WHERE.studio_id, year: WHERE.year }, required: ['studio_id', 'year'] } },
  { name: 'get_month_plan', description: "A studio's month: plan text (theme, objective, strategy, notes), revenue targets and every offer with full terms.", input_schema: { type: 'object', properties: WHERE, required: ['studio_id', 'year', 'month'] } },
  { name: 'search_offers', description: 'Search the offer bank by words in name, headline, benefit, audience or type.', input_schema: { type: 'object', properties: { query: { type: 'string' }, studio_id: WHERE.studio_id }, required: ['query'] } },
  { name: 'propose_offer_update', description: 'Propose changes to an existing offer. Include only fields that change.', input_schema: { type: 'object', properties: { ...WHERE, offer_id: { type: 'integer' }, changes: { type: 'object', properties: CHANGE_PROPS }, why: { type: 'string' }, ...ALL }, required: ['studio_id', 'year', 'month', 'offer_id', 'changes', 'why'] } },
  { name: 'propose_add_offer', description: "Propose adding an existing offer (from search_offers) to a month's plan.", input_schema: { type: 'object', properties: { ...WHERE, offer_id: { type: 'integer' }, why: { type: 'string' }, ...ALL }, required: ['studio_id', 'year', 'month', 'offer_id', 'why'] } },
  { name: 'propose_remove_offer', description: "Propose taking an offer out of a month's plan (the offer stays in the bank).", input_schema: { type: 'object', properties: { ...WHERE, offer_id: { type: 'integer' }, why: { type: 'string' }, ...ALL }, required: ['studio_id', 'year', 'month', 'offer_id', 'why'] } },
  { name: 'propose_delete_offer', description: 'Propose deleting an offer permanently. Use only when the user asks to delete.', input_schema: { type: 'object', properties: { ...WHERE, offer_id: { type: 'integer' }, why: { type: 'string' }, ...ALL }, required: ['studio_id', 'year', 'month', 'offer_id', 'why'] } },
  {
    name: 'propose_create_offer',
    description: 'Propose a brand-new offer for a month. Name, objective and offer type are required; give real terms.',
    input_schema: {
      type: 'object',
      properties: {
        ...WHERE,
        fields: {
          type: 'object',
          properties: {
            ...CHANGE_PROPS,
            objective: { type: 'string', enum: ['new_client', 'renewal', 'reactivation', 'upsell', 'retention'] },
            offer_type: { type: 'string', description: 'e.g. percentage, bonus, bundle, intro' },
            plan_slot: { type: 'string', enum: ['newcomer', 'lapsed', 'renewal'] },
            rationale: { type: 'string' },
          },
          required: ['name', 'objective', 'offer_type'],
        },
        why: { type: 'string' },
        ...ALL,
      },
      required: ['studio_id', 'year', 'month', 'fields', 'why'],
    },
  },
  {
    name: 'propose_plan_update',
    description: "Propose rewriting a month's plan text: theme (max 200 chars), objective (max 300), strategy, notes.",
    input_schema: {
      type: 'object',
      properties: { ...WHERE, changes: { type: 'object', properties: { theme: { type: 'string' }, objective: { type: 'string' }, strategy: { type: 'string' }, notes: { type: 'string' } } }, why: { type: 'string' } },
      required: ['studio_id', 'year', 'month', 'changes', 'why'],
    },
  },
];

const SYSTEM = `You are the copilot inside Physique 57 India's sales-planning app (barre and fitness studios: Kemps Corner, Bandra, Kenkere House, a pop-up). Managers plan each month's membership and class-pack offers against a revenue target. You can read the plan with tools and propose changes: edit, add, remove, create or delete offers, and rewrite month plans.

Work like a sharp commercial strategist:
- Read before you act. Call get_month_plan or get_year_overview for the months involved; never guess ids, prices or names.
- Every change is a proposal. Use the propose_* tools; the manager reviews and applies them. Never claim something is saved.
- Be specific and creative where asked: names that are memorable, copy that is concrete and premium (no emojis, no exclamation marks), mechanics that fit the month's moment and stream (new clients, renewals, win-backs).
- Keep the money honest: discounts are cash off list, 0–50% and never above the studio's max discount; do not invent performance numbers. When you change price, discount or buyers, say what it does to revenue (buyers × price).
- Approved offers can be changed; the manager will be asked to confirm. Mention when a proposal touches an approved offer.
- Default to the studio and month the manager is looking at. Mirror to all locations only when asked.
- Bulk requests ("all offers", "the whole quarter") mean one proposal per item.
- Questions get answers, not proposals. Keep the final reply short: what you found, what you propose and why, in plain sentences or a few bullets.`;

const n = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : null);

export async function runAgent(input: {
  message: string;
  history: { role: string; content: string }[];
  scope: AgentScope;
  user: any;
}): Promise<{ reply: string; actions: AgentAction[] }> {
  const client = await anthropicClient(120_000);
  const { user, scope } = input;
  const actions: AgentAction[] = [];
  const studioList = studios(user);
  const capOf = (sid: number) => Number(studioList.find(s => s.id === sid)?.max_discount_percent ?? 50) || 50;
  const offerRow = (id: number) => db.prepare('SELECT * FROM offers WHERE id=?').get(id) as any;

  const scopeNote = {
    page: scope.path || null,
    studio: scope.studioId ? studioList.find(s => s.id === scope.studioId) || { id: scope.studioId } : null,
    year: scope.year || null,
    month: scope.month ? { number: scope.month, name: MONTHS[scope.month - 1] } : null,
    studios: studioList,
  };

  const turns = input.history
    .slice(-10)
    .filter(h => h.content)
    .map(h => ({ role: (h.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant', content: h.content }));
  while (turns.length && turns[0].role !== 'user') turns.shift();
  const messages: any[] = [...turns, { role: 'user', content: `Context: ${JSON.stringify(scopeNote)}\n\nRequest: ${input.message}` }];

  const run = (name: string, a: any): any => {
    const where = { studioId: Number(a.studio_id), year: Number(a.year), month: Number(a.month) };
    const okWhere = () => {
      if (!canAccessStudio(user, where.studioId)) return 'No access to that studio.';
      if (!(where.month >= 1 && where.month <= 12)) return 'Month must be 1-12.';
      return null;
    };
    switch (name) {
      case 'list_studios':
        return studioList;
      case 'get_year_overview':
        return yearOverview(user, Number(a.studio_id), Number(a.year));
      case 'get_month_plan':
        return monthPlan(user, where.studioId, where.year, where.month);
      case 'search_offers':
        return searchOffers(user, a.query, n(a.studio_id));
      case 'propose_offer_update': {
        const bad = okWhere();
        if (bad) return { error: bad };
        const o = offerRow(Number(a.offer_id));
        if (!o) return { error: 'Offer not found.' };
        const changes: Record<string, any> = {};
        const rejected: string[] = [];
        for (const [k, v] of Object.entries(a.changes || {})) {
          if (v === null || v === undefined || v === '') continue;
          if (k === 'discount_percent') {
            const pct = Math.max(0, Math.min(Number(v), capOf(where.studioId), 50));
            changes.pricing = { discount: pct / 100 };
            continue;
          }
          const one = changeSchema.safeParse({ [k]: v });
          if (one.success) changes[k] = (one.data as any)[k];
          else rejected.push(k);
        }
        if (!Object.keys(changes).length) return { error: 'No valid changes.', rejected };
        actions.push({ kind: 'update_offer', ...where, offerId: o.id, offerName: o.name, approved: o.approval_status === 'approved', changes, why: String(a.why || ''), allLocations: !!a.all_locations });
        return { queued: actions.length, rejected };
      }
      case 'propose_add_offer':
      case 'propose_remove_offer':
      case 'propose_delete_offer': {
        const bad = okWhere();
        if (bad) return { error: bad };
        const o = offerRow(Number(a.offer_id));
        if (!o) return { error: 'Offer not found.' };
        const base = { ...where, offerId: o.id, offerName: o.name, why: String(a.why || ''), allLocations: !!a.all_locations };
        if (name === 'propose_add_offer') actions.push({ kind: 'add_offer', ...base });
        else actions.push({ kind: name === 'propose_remove_offer' ? 'remove_offer' : 'delete_offer', ...base, approved: o.approval_status === 'approved' });
        return { queued: actions.length };
      }
      case 'propose_create_offer': {
        const bad = okWhere();
        if (bad) return { error: bad };
        const f = a.fields || {};
        if (!f.name || String(f.name).trim().length < 3) return { error: 'Name needs 3+ characters.' };
        const fields: Record<string, any> = {
          name: String(f.name).trim().slice(0, 200),
          objective: String(f.objective || 'new_client').slice(0, 80),
          offer_type: String(f.offer_type || 'percentage').slice(0, 80),
        };
        if (f.plan_slot) fields.plan_slot = String(f.plan_slot).slice(0, 40);
        if (f.rationale) fields.rationale = String(f.rationale).slice(0, 5000);
        for (const [k, v] of Object.entries(f)) {
          if (k in fields || v === null || v === undefined || v === '') continue;
          if (k === 'discount_percent') {
            fields.pricing = { discount: Math.max(0, Math.min(Number(v), capOf(where.studioId), 50)) / 100 };
            continue;
          }
          const one = changeSchema.safeParse({ [k]: v });
          if (one.success) fields[k] = (one.data as any)[k];
        }
        actions.push({ kind: 'create_offer', ...where, fields, why: String(a.why || ''), allLocations: !!a.all_locations });
        return { queued: actions.length };
      }
      case 'propose_plan_update': {
        const bad = okWhere();
        if (bad) return { error: bad };
        const c = a.changes || {};
        const changes: Record<string, any> = {};
        if (c.theme) changes.theme = String(c.theme).slice(0, 200);
        if (c.objective) changes.objective = String(c.objective).slice(0, 300);
        if (c.strategy) changes.strategy = String(c.strategy).slice(0, 5000);
        if (c.notes) changes.notes = String(c.notes).slice(0, 5000);
        if (!Object.keys(changes).length) return { error: 'No valid changes.' };
        actions.push({ kind: 'update_plan', ...where, changes, why: String(a.why || '') });
        return { queued: actions.length };
      }
      default:
        return { error: `Unknown tool ${name}` };
    }
  };

  let reply = '';
  for (let step = 0; step < 12; step++) {
    const response = await client.messages.create({
      model: COPILOT_MODEL,
      max_tokens: 16000,
      output_config: { effort: 'high' },
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
      tools: TOOLS,
      messages,
    } as any);
    if (response.stop_reason === 'refusal') {
      reply = 'Claude declined this request.';
      break;
    }
    messages.push({ role: 'assistant', content: response.content });
    const text = response.content
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('\n')
      .trim();
    if (text) reply = text;
    const uses = response.content.filter((b: any) => b.type === 'tool_use') as any[];
    if (response.stop_reason !== 'tool_use' || !uses.length) break;
    messages.push({
      role: 'user',
      content: uses.map(u => {
        let result: any;
        try {
          result = run(u.name, u.input || {});
        } catch (e: any) {
          result = { error: e.message };
        }
        const body = JSON.stringify(result);
        return { type: 'tool_result', tool_use_id: u.id, content: body.slice(0, 60000), is_error: !!result?.error };
      }),
    });
  }
  return { reply: reply || (actions.length ? 'Here is what I propose.' : 'Done.'), actions };
}
