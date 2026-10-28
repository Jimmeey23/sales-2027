// P57 Copilot engine (v2).
//
// The engine turns one question into one grounded answer: classify the intent, resolve the
// studio and month it is about, run the matching tool, and hand back written prose plus
// typed cards, sources, follow-ups and the working behind every number. It never calls an
// AI provider, so it behaves identically with or without an API key.

import {
  cacheStats,
  defaultStudio,
  latestObservedMonth,
  resolveStudio,
  rollupMonth,
  segments,
  studios,
  targets,
  type Studio,
} from './context.js';
import { classify, INTENTS, INTENT_BY_ID, type Classification, type IntentId } from './intents.js';
import { TOOLS, routeIntent, type ToolContext, type ToolOutput } from './tools.js';
import { addMonths, monthKey, monthLabel, parseTime, timeToMonths, type MonthRef, type ParsedTime } from './text.js';

export const ENGINE_VERSION = '2027.2';
export const PLANNING_YEAR = 2027;
/** Answers above this confidence are stated plainly; below it the drawer offers a nudge. */
export const CONFIDENT = 0.62;

export interface EngineRequest {
  message: string;
  studioId?: number | null;
  history?: any[];
}

export interface EngineAnswer {
  content: string;
  attachments: Record<string, any>;
  mode: 'deterministic';
  saveOffer?: any;
}

export interface AnswerMeta {
  intent: IntentId;
  label: string;
  confidence: number;
  confident: boolean;
  candidates: { id: IntentId; score: number }[];
  matched: string[];
  tool: string;
  scope: { studioId: number | null; studio: string; year: number; months: string[]; month: string };
  timings: { classify: number; resolve: number; tool: number; total: number };
  cache: { hits: number; misses: number; hitRate: number; entries: number };
}

/** The planning month the conversation should assume when the question is silent. */
export function defaultMonth(year: number, today = new Date()): MonthRef {
  let next: MonthRef;
  try {
    const latest = latestObservedMonth();
    const [latestYear, latestMonth] = latest.split('-').map(Number);
    next = addMonths({ year: latestYear, month: latestMonth }, 1);
  } catch {
    next = { year: today.getFullYear(), month: today.getMonth() + 1 };
  }
  if (next.year === year) return next;
  if (next.year < year) return { year, month: 1 };
  return { year, month: 12 };
}

function yearOf(parsed: ParsedTime | null, fallback: number): number {
  if (!parsed) return fallback;
  if (parsed.kind === 'year') return parsed.year;
  if (parsed.kind === 'quarter') return parsed.year;
  if (parsed.kind === 'month') return parsed.month.year;
  if (parsed.kind === 'range') return parsed.from.year;
  return fallback;
}

function monthList(parsed: ParsedTime | null, year: number): MonthRef[] {
  const fallback = defaultMonth(year);
  const months = timeToMonths(parsed, fallback);
  // A relative phrase can point outside the plan year; keep the answer honest by clamping.
  const clamped = months.filter(ref => ref.month >= 1 && ref.month <= 12);
  return clamped.length ? clamped : [fallback];
}

function scopeLabel(studio: Studio | null): string {
  return studio ? studio.name : 'All studios';
}

function previousIntent(history: any[]): IntentId | null {
  for (const item of [...history].reverse()) {
    if (item.role !== 'assistant') continue;
    const intent = item.attachments?.intent?.id ?? item.attachments?.meta?.intent;
    if (intent && INTENT_BY_ID.has(intent)) return intent as IntentId;
  }
  return null;
}

function previousStudio(history: any[]): number | null {
  for (const item of [...history].reverse()) {
    if (item.role !== 'assistant') continue;
    const scope = item.attachments?.scope;
    if (scope?.assumed) continue;
    if (typeof scope?.studioId === 'number') return scope.studioId;
  }
  return null;
}

function helpAnswer(classification: Classification): ToolOutput {
  const groups: { title: string; items: IntentId[] }[] = [
    { title: 'Plan and targets', items: ['month_gap', 'year_outlook', 'plan_summary', 'what_if'] },
    { title: 'Performance and members', items: ['funnel', 'channels', 'renewals', 'segments', 'products', 'attendance'] },
    { title: 'Offers and studios', items: ['offer_portfolio', 'offer_build', 'offer_compare', 'price_ladder', 'compare_studios'] },
    { title: 'Time and navigation', items: ['key_days', 'navigate', 'explain'] },
  ];
  const lines = groups
    .map(group => {
      const specs = group.items.map(id => INTENT_BY_ID.get(id)!).filter(Boolean);
      return `**${group.title}**\n${specs.map(spec => `- ${spec.description} _(${spec.examples[0]})_`).join('\n')}`;
    })
    .join('\n\n');
  return {
    type: 'help',
    content: [
      '**I answer from your imported data only** — no model writes the numbers, and every answer shows its sources.',
      lines,
      'Tip: you do not need to name a studio. Ask the question, and add “at Kemps Corner” or “in April” to narrow it.',
    ].join('\n\n'),
    cards: [
      {
        kind: 'list',
        title: 'Try one of these',
        rows: INTENTS.filter(spec => spec.examples?.length)
          .slice(0, 8)
          .map(spec => ({ title: spec.examples[0], meta: spec.label, detail: spec.description })),
      },
    ],
    sources: [{ label: 'Data sources', detail: 'monthly_targets · offers · customer_packages · transactions · leads · checkins · segment_rules' }],
    followUps: ['How do we hit the April target?', 'Where is the funnel leaking?', 'Which offers are planned for Q2?', 'Compare the studios'],
    nextActions: ['Ask a question, then say “why?” to see the working.'],
  };
}

function unknownAnswer(classification: Classification): ToolOutput {
  const guesses = classification.candidates
    .slice(0, 3)
    .map(candidate => INTENT_BY_ID.get(candidate.id))
    .filter(Boolean) as { label: string; examples: string[] }[];
  return {
    type: 'unrecognised',
    content: [
      'I could not match that to a question I can answer from the data, and I will not invent an answer.',
      guesses.length
        ? `Closest things I can do: ${guesses.map(guess => `**${guess.label.toLowerCase()}** (${guess.examples[0]})`).join(' · ')}.`
        : 'Try naming a month, a studio or a metric — for example “April target gap” or “renewals due at 60%”.',
    ].join('\n\n'),
    sources: [],
    followUps: ['Give me the 2027 overview', 'Where is the funnel leaking?', 'What can you do?'],
  };
}

/** Runs one question end to end. Exported for tests: no HTTP, no auth, no writes. */
export function answerQuestion(request: EngineRequest): { answer: EngineAnswer; meta: AnswerMeta } {
  const started = performance.now();
  const message = String(request.message || '').trim();
  if (!message) throw Object.assign(new Error('Ask a question first.'), { status: 400 });
  if (message.length > 4000)
    throw Object.assign(new Error('Copilot messages must contain 1–4000 characters.'), { status: 422 });

  const history = Array.isArray(request.history) ? request.history : [];
  const classifyStart = performance.now();
  let classification = classify(message);
  const classifyMs = performance.now() - classifyStart;

  // Conversation memory: a short follow-up ("and in Bandra?", "why?") stays on topic.
  const remembered = previousIntent(history);
  if (remembered && (classification.intent === 'unknown' || classification.confidence < 0.45)) {
    classification = {
      ...classification,
      intent: remembered,
      confidence: Math.max(classification.confidence, 0.5),
      candidates: [{ id: remembered, score: classification.score || 1 }, ...classification.candidates].slice(0, 4),
    };
  }

  const resolveStart = performance.now();
  const fallbackStudioId = request.studioId ?? previousStudio(history);
  let resolvedStudio = resolveStudio(classification.slots.studioHint, fallbackStudioId);
  const parsed = classification.slots.time ?? parseTime(message);
  const year = yearOf(parsed, PLANNING_YEAR);
  let months = monthList(parsed, year);
  // Year-wide questions are answered across the whole plan year, not one fallback month.
  if (classification.intent === 'year_outlook') months = monthList({ kind: 'year', year, explicit: true }, year);
  if (classification.intent === 'offer_portfolio' && !parsed) months = monthList({ kind: 'year', year, explicit: false }, year);
  const primary = months.length === 1 ? months[0] : parsed?.kind === 'year' ? defaultMonth(year) : months[0];
  // An offer cannot be priced without a studio; name the biggest plan instead of dead-ending.
  let assumedStudio = false;
  if (!resolvedStudio && ['offer_build', 'offer_compare'].includes(classification.intent)) {
    resolvedStudio = defaultStudio(year);
    assumedStudio = Boolean(resolvedStudio);
  }
  const resolveMs = performance.now() - resolveStart;

  const toolId = routeIntent(classification.intent, message);
  const context: ToolContext = {
    studio: resolvedStudio,
    assumedStudio,
    scopeLabel: scopeLabel(resolvedStudio),
    year,
    months,
    primary,
    slots: classification.slots,
    message,
    history,
  };

  const toolStart = performance.now();
  let output: ToolOutput;
  if (classification.intent === 'help') output = helpAnswer(classification);
  else if (classification.intent === 'unknown') output = unknownAnswer(classification);
  else {
    try {
      output = TOOLS[toolId](context);
    } catch (error: any) {
      output = {
        type: 'error',
        content: [
          `I could not finish that answer: ${error?.message || 'unknown error'}.`,
          'Nothing has been estimated or invented to fill the gap — try a narrower question or a single studio.',
        ].join('\n\n'),
        sources: [],
        followUps: ['Give me the 2027 overview', 'Help'],
      };
    }
  }
  const toolMs = performance.now() - toolStart;
  const stats = cacheStats();
  const spec = INTENT_BY_ID.get(classification.intent);

  const attachments = {
    type: output.type,
    cards: output.cards ?? [],
    sources: output.sources ?? [],
    followUps: output.followUps ?? [],
    nextActions: output.nextActions ?? [],
    calculation: output.calculation ?? [],
    action: output.data?.action ?? null,
    intent: {
      id: classification.intent,
      label: spec?.label ?? 'Unknown',
      confidence: Number(classification.confidence.toFixed(2)),
      confident: classification.confidence >= CONFIDENT,
      candidates: classification.candidates,
      matched: classification.matched,
    },
    // Kept flat for the route's studio-access check.
    studioId: resolvedStudio?.id ?? null,
    scope: {
      studioId: resolvedStudio?.id ?? null,
      studio: scopeLabel(resolvedStudio),
      assumed: assumedStudio,
      year,
      months: months.map(ref => monthKey(ref.year, ref.month)),
      month: monthKey(primary.year, primary.month),
      monthLabel: monthLabel(primary.year, primary.month),
    },
    // Kept for the legacy "why?" path and for any client that only reads meta.
    meta: {
      intent: classification.intent,
      calculation: output.calculation ?? [],
      sources: output.sources ?? [],
      engine: ENGINE_VERSION,
    },
    performance: {
      ms: Math.round(performance.now() - started),
      stages: { classify: Math.round(classifyMs), resolve: Math.round(resolveMs), tool: Math.round(toolMs) },
      cache: { hits: stats.hits, misses: stats.misses, hitRate: stats.hitRate, entries: stats.entries },
      mode: 'deterministic',
    },
    data: undefined as any,
  };

  const answer: EngineAnswer = {
    content: output.content,
    attachments,
    mode: 'deterministic',
  };
  // Offer concepts stay one click from a draft; saving is still gated by the route.
  const concept = (output.data?.concepts ?? [])[0];
  if (output.type === 'offer_concept' && concept) answer.saveOffer = concept;

  const meta: AnswerMeta = {
    intent: classification.intent,
    label: spec?.label ?? 'Unknown',
    confidence: Number(classification.confidence.toFixed(2)),
    confident: classification.confidence >= CONFIDENT,
    candidates: classification.candidates,
    matched: classification.matched,
    tool: toolId,
    scope: { studioId: resolvedStudio?.id ?? null, studio: scopeLabel(resolvedStudio), year, months: attachments.scope.months, month: attachments.scope.month },
    timings: { classify: Math.round(classifyMs), resolve: Math.round(resolveMs), tool: Math.round(toolMs), total: Math.round(performance.now() - started) },
    cache: { hits: stats.hits, misses: stats.misses, hitRate: stats.hitRate, entries: stats.entries },
  };
  return { answer, meta };
}

let warmed = false;

/**
 * Warms the read cache off the request path so the first question in a session does not
 * pay for the heavy scans. Fire-and-forget: failures are ignored and never surface.
 */
export function warmCopilot(year = PLANNING_YEAR): void {
  if (warmed) return;
  warmed = true;
  const timer = setTimeout(() => {
    try {
      studios();
      targets(year, null);
      const month = defaultMonth(year);
      rollupMonth(month.year, month.month, null);
      latestObservedMonth();
      segments(null);
    } catch {
      /* warming is best-effort */
    }
  }, 30);
  (timer as any).unref?.();
}

/** Capability payload for `GET /api/copilot/capability`. */
export function engineCapability() {
  return {
    engine: ENGINE_VERSION,
    planningYear: PLANNING_YEAR,
    deterministic: true,
    intents: INTENTS.map(spec => ({ id: spec.id, label: spec.label, description: spec.description, examples: spec.examples })),
    tools: Object.keys(TOOLS),
    answerBlocks: ['kpi', 'bars', 'table', 'list', 'note'],
    supports: {
      conversationMemory: true,
      studioScoping: true,
      monthAndQuarterScoping: true,
      scenarios: true,
      sources: true,
      calculations: true,
      offerDrafts: true,
      streaming: false,
    },
    cache: cacheStats(),
    studios: studios().map(studio => ({ id: studio.id, name: studio.name, city: studio.city })),
  };
}
