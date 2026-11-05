// The app-wide copilot: Claude reads the plan with tools and proposes changes as actions.
// Nothing is written here. The browser shows each proposed action, the planner applies one or
// all of them, and each goes through the app's normal routes (policy, audit, versioning intact).
import { db } from '../db.js';
import { canAccessStudio } from './auth.js';
import { auditYear } from './planAudit.js';
import { anthropicClient, changeSchema, COPILOT_MODEL } from './offerEditCopilot.js';

export type AgentAction =
  | { kind: 'update_offer'; studioId: number; year: number; month: number; offerId: number; offerName: string; approved: boolean; changes: Record<string, any>; why: string; allLocations: boolean }
  | { kind: 'add_offer'; studioId: number; year: number; month: number; offerId: number; offerName: string; why: string; allLocations: boolean }
  | { kind: 'remove_offer'; studioId: number; year: number; month: number; offerId: number; offerName: string; approved: boolean; why: string; allLocations: boolean }
  | { kind: 'delete_offer'; studioId: number; year: number; month: number; offerId: number; offerName: string; approved: boolean; why: string; allLocations: boolean }
  | { kind: 'create_offer'; studioId: number; year: number; month: number; fields: Record<string, any>; why: string; allLocations: boolean }
  | { kind: 'update_plan'; studioId: number; year: number; month: number; changes: Record<string, any>; why: string };

export interface AgentStep {
  type: 'thinking' | 'tool';
  text?: string;
  tool?: string;
  input?: string;
  result?: string;
  error?: boolean;
}
export interface AgentQuestion {
  question: string;
  options: string[];
}

export interface AgentState {
  messages: any[];
  actions: AgentAction[];
  steps: AgentStep[];
  nudged: boolean;
  step: number;
  reply: string;
}

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
  {
    name: 'ask_clarifying_questions',
    description:
      "Ask the manager 1-3 short questions before acting, when the answer depends on a preference you cannot read from the plan (tone, how aggressive a discount, which studios, keep or replace, budget). Each question MUST have 4 or 5 distinct, concrete options (never fewer than 4); the app adds an 'Other' choice for custom answers, so do not include one. Calling this ends your turn; you will get the answers next turn. Do not ask what the data already tells you, and do not ask for simple or clearly specified requests.",
    input_schema: {
      type: 'object',
      properties: {
        questions: {
          type: 'array',
          items: {
            type: 'object',
            properties: { question: { type: 'string' }, options: { type: 'array', items: { type: 'string' }, minItems: 4, maxItems: 5 } },
            required: ['question', 'options'],
          },
        },
      },
      required: ['questions'],
    },
  },
  { name: 'list_studios', description: 'List the studios (id, name, max discount %) the user can plan for.', input_schema: { type: 'object', properties: {} } },
  { name: 'get_year_overview', description: "One studio's 12 months: theme, objective, status, revenue target and offer names.", input_schema: { type: 'object', properties: { studio_id: WHERE.studio_id, year: WHERE.year }, required: ['studio_id', 'year'] } },
  { name: 'run_plan_audit', description: "Run the deterministic audit of one studio's year: coverage gaps, missing prices/targets/conditions, discounts over cap, dates outside the month, stream gaps, plan text naming missing offers, repeated offers.", input_schema: { type: 'object', properties: { studio_id: WHERE.studio_id, year: WHERE.year }, required: ['studio_id', 'year'] } },
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
- When a request is open-ended and a preference would change the answer, call ask_clarifying_questions first (once). Otherwise act.
- Questions get answers, not proposals. Keep the final reply short: what you found, what you propose and why, in plain sentences or a few bullets.`;

const n = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : null);

export async function runAgent(input: {
  message: string;
  history: { role: string; content: string }[];
  scope: AgentScope;
  user: any;
  system?: string;
  maxSteps?: number;
  /** Working state from the previous round; absent on the first call. */
  state?: AgentState | null;
  /** Wall-clock budget for this round. Serverless hosts kill long requests, so the agent works in rounds. */
  budgetMs?: number;
}): Promise<{
  reply: string;
  actions: AgentAction[];
  steps: AgentStep[];
  questions: AgentQuestion[] | null;
  done: boolean;
  state?: AgentState;
}> {
  const started = Date.now();
  const client = await anthropicClient(150_000);
  const { user, scope } = input;
  const prior = input.state;
  const actions: AgentAction[] = prior?.actions ? [...prior.actions] : [];
  const steps: AgentStep[] = prior?.steps ? [...prior.steps] : [];
  let questions: AgentQuestion[] | null = null;
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
  const messages: any[] = prior?.messages?.length
    ? prior.messages
    : [...turns, { role: 'user', content: `Context: ${JSON.stringify(scopeNote)}\n\nRequest: ${input.message}` }];

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
      case 'run_plan_audit':
        if (!canAccessStudio(user, Number(a.studio_id))) return { error: 'No access to that studio.' };
        return auditYear(Number(a.studio_id), Number(a.year));
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

  let reply = prior?.reply || '';
  let finished = false;
  let nudged = !!prior?.nudged;
  let step = prior?.step ?? 0;
  const budget = input.budgetMs ?? Infinity;
  for (; step < (input.maxSteps ?? 12); step++) {
    // Time for another model call? If not, hand the work back; the browser calls again at once.
    if (Date.now() - started > budget)
      return {
        reply: '',
        actions,
        steps,
        questions: null,
        done: false,
        state: { messages, actions, steps, nudged, step, reply },
      };
    const response = await client.messages.create({
      model: COPILOT_MODEL,
      max_tokens: 32000,
      thinking: { type: 'adaptive', display: 'summarized' },
      output_config: { effort: 'high' },
      system: [{ type: 'text', text: SYSTEM + (input.system ? `\n\n${input.system}` : ''), cache_control: { type: 'ephemeral' } }],
      tools: TOOLS,
      messages,
    } as any);
    if (response.stop_reason === 'refusal') {
      reply = 'Claude declined this request.';
      break;
    }
    messages.push({ role: 'assistant', content: response.content });
    for (const b of response.content as any[])
      if (b.type === 'thinking' && b.thinking?.trim()) steps.push({ type: 'thinking', text: b.thinking.trim().slice(0, 1500) });
    const ask = (response.content as any[]).find(b => b.type === 'tool_use' && b.name === 'ask_clarifying_questions');
    if (ask) {
      questions = (Array.isArray(ask.input?.questions) ? ask.input.questions : [])
        .slice(0, 3)
        .map((q: any) => ({
          question: String(q.question || '').slice(0, 300),
          options: (Array.isArray(q.options) ? q.options : []).map((o: any) => String(o).trim().slice(0, 120)).filter((o: string) => o && !/^other\b/i.test(o)).slice(0, 5),
        }))
        .filter((q: AgentQuestion) => q.question);
      steps.push({ type: 'tool', tool: 'ask_clarifying_questions', input: `${questions?.length || 0} question(s)` });
      const text = (response.content as any[]).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
      reply = text || 'A couple of quick questions first:';
      finished = true;
      break;
    }
    const text = response.content
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('\n')
      .trim();
    if (text) reply = text;
    const uses = response.content.filter((b: any) => b.type === 'tool_use') as any[];
    if (response.stop_reason !== 'tool_use' || !uses.length) {
      // Thought but wrote nothing (often max_tokens spent on reasoning): ask for the answer once.
      if (!text && !nudged) {
        nudged = true;
        messages.push({ role: 'user', content: 'Write your final answer now, in the required shape. Keep reasoning brief.' });
        continue;
      }
      finished = true;
      break;
    }
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
        steps.push({
          type: 'tool',
          tool: u.name,
          input: JSON.stringify(u.input || {}).slice(0, 300),
          result: result?.error
            ? String(result.error)
            : Array.isArray(result)
              ? `${result.length} item(s)`
              : result?.queued
                ? `Queued proposal #${result.queued}`
                : result?.findings
                  ? `${result.findings.length} finding(s)`
                  : result?.offers
                    ? `${result.offers.length} offer(s)`
                    : 'ok',
          error: !!result?.error,
        });
        return { type: 'tool_result', tool_use_id: u.id, content: body.slice(0, 24000), is_error: !!result?.error };
      }),
    });
  }
  // Out of steps mid-research: answer the pending tool calls, then ask for the write-up with tools off.
  if (!finished) {
    const last = messages[messages.length - 1];
    if (last?.role === 'assistant') {
      const pending = (last.content || []).filter((b: any) => b.type === 'tool_use');
      if (pending.length)
        messages.push({
          role: 'user',
          content: pending.map((u: any) => ({ type: 'tool_result', tool_use_id: u.id, content: 'Step budget reached; not run.', is_error: true })),
        });
    }
    messages.push({ role: 'user', content: 'Stop researching. Write your final answer now from what you have, in the required shape, and list the proposals already queued.' });
    try {
      const final = await client.messages.create({
        model: COPILOT_MODEL,
        max_tokens: 16000,
        output_config: { effort: 'high' },
        system: [{ type: 'text', text: SYSTEM + (input.system ? `\n\n${input.system}` : ''), cache_control: { type: 'ephemeral' } }],
        tools: TOOLS,
        tool_choice: { type: 'none' },
        messages,
      } as any);
      const text = final.content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n').trim();
      if (text) reply = text;
    } catch {
      /* keep whatever text we had */
    }
  }
  return { reply: reply || (actions.length ? 'Here is what I propose.' : 'No answer was produced. Try a narrower request.'), actions, steps, questions, done: true };
}

export const AUDIT_BRIEF = `AUDIT MODE. Do not ask clarifying questions. You are auditing the sales plan independently, like a sceptical commercial director before sign-off.
1. Call run_plan_audit for the studio and year. Treat its findings as facts.
2. Read at most 4 months with get_month_plan — the largest targets, worst coverage and months with critical findings. Use get_year_overview for the rest. Call several tools in parallel in one turn.
3. Look beyond the checklist: loopholes (stacking, unlimited redemptions, no eligibility rules, offers that cannibalise full-price sales or each other), discrepancies (plan text vs offers, price vs product, buyers that the funnel cannot deliver), weak or repetitive creative, months with no clear moment, offers that train clients to wait for discounts.
4. Propose fixes with the propose_* tools for the highest-impact problems — at most 10 proposals, each tied to a finding. Be creative where the plan is flat: fresh names, sharper mechanics, offers built on the month's moment.
Reply in this shape, short and specific:
**Verdict** — one or two sentences on how strong the plan is.
**Top risks** — up to 6 bullets, most serious first, each naming the month/offer and the money at stake.
**Loopholes & discrepancies** — bullets.
**Ideas to make it stronger** — up to 5 creative, concrete bullets.
**Proposed changes** — one line per proposal you queued.`;
