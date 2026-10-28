// Intent catalogue and classifier for P57 Copilot.
// A question is scored against every intent; the winner is only used when it beats the
// runner-up by a margin, otherwise the engine asks a short clarifying question or falls
// back to a broad "overview" answer that still uses real data.

import { normalise, parseOfferKind, parsePercent, parseTime, parseMoney, tokens, type ParsedTime } from './text.js';

export type IntentId =
  | 'help'
  | 'month_plan'
  | 'month_gap'
  | 'year_outlook'
  | 'compare_studios'
  | 'funnel'
  | 'channels'
  | 'renewals'
  | 'segments'
  | 'products'
  | 'attendance'
  | 'offer_portfolio'
  | 'offer_build'
  | 'offer_compare'
  | 'what_if'
  | 'price_ladder'
  | 'plan_summary'
  | 'key_days'
  | 'explain'
  | 'navigate'
  | 'unknown';

export interface IntentSpec {
  id: IntentId;
  label: string;
  /** Human sentence used in the capability list. */
  description: string;
  patterns: RegExp[];
  /** Words that make this intent much more likely. */
  boost?: RegExp[];
  /** Words that must not be present. */
  exclude?: RegExp;
  weight?: number;
  examples: string[];
}

export const INTENTS: IntentSpec[] = [
  {
    id: 'help',
    label: 'Capabilities',
    description: 'Lists what Copilot can answer and how to ask it.',
    patterns: [/\bhelp\b/, /what can you (?:do|answer|tell)/, /capabilit/, /how do i use (?:you|copilot)/],
    examples: ['What can you do?'],
  },
  {
    id: 'month_gap',
    label: 'Gap to target',
    description: 'How far a month is from target, and the levers ranked by rupees.',
    patterns: [
      /how (?:do|can) we (?:hit|close|make|reach|cover)/,
      /hit (?:the )?(?:target|number|plan)/,
      /close (?:the )?gap/,
      /\bgap\b/,
      /shortfall|behind (?:on|target)|miss(?:ing)? (?:the )?target/,
      /what does it take/,
      /run.?rate/,
    ],
    boost: [/target|revenue|month|studio|close/, /how much (?:more|do we need)/],
    weight: 1.15,
    examples: ['How do we close the April gap at Kemps Corner?'],
  },
  {
    id: 'year_outlook',
    label: 'Year outlook',
    description: 'All twelve months: target, last year, growth, and the hardest months.',
    patterns: [
      /whole year|full year|year (?:outlook|overview|plan|summary)/,
      /which months? (?:are|look) (?:hard|tough|easy|big)/,
      /hardest|toughest|biggest months?/,
      /seasonal|seasonality/,
      /quarter(?:ly)? (?:view|summary|roll.?up)/,
      /\bq[1-4]\b.*\b(?:plan|outlook|summary|target)/,
      /month by month|month.by.month/,
      /outlook|projection|what does (?:the )?year/,
      /\b20\d{2}\b.*\byear\b|\byear\b.*\b20\d{2}\b/,
      /annual (?:target|plan|outlook|summary)|twelve months|12 months/,
    ],
    boost: [/year|annual|quarter|months?/],
    examples: ['Which months in 2027 look hardest and why?', 'Give me the Q2 outlook'],
  },
  {
    id: 'compare_studios',
    label: 'Studio benchmark',
    description: 'Compares budgets, growth, discount depth and product mix across studios.',
    patterns: [
      /compare (?:the )?(?:studios|locations|branches)/,
      /(?:studio|location)s? compared/,
      /best (?:performing )?(?:studio|location)/,
      /worst (?:performing )?(?:studio|location)/,
      /across (?:all )?(?:studios|locations)/,
      /which studio (?:is|has)/,
      /benchmark/,
    ],
    boost: [/studios?|locations?|bandra|kemps|kenkere|pop.?up/],
    weight: 1.1,
    examples: ['Compare all studios on 2027 targets'],
  },
  {
    id: 'funnel',
    label: 'Funnel diagnosis',
    description: 'Leads → trials → buyers against the target requirement, with sensitivity in rupees.',
    patterns: [
      /funnel|conversion|convert(?:ing)?|leads?|trials?|first visits?|buyers?/,
      /lead to (?:trial|buyer|purchase)/,
      /cost per (?:lead|buyer|acquisition)|cac/,
    ],
    boost: [/funnel|conversion|leads?|trials?|buyers?/],
    examples: ['Where does the funnel leak for Bandra?'],
  },
  {
    id: 'channels',
    label: 'Channel quality',
    description: 'Lead sources ranked by conversion and lifetime value.',
    patterns: [
      /channel|source|attribution|marketing mix|which (?:channels|sources)/,
      /(?:instagram|google|meta|facebook|walk.?in|referral) (?:leads?|performance|roi)/,
      /ad spend|spend|roas|roi/,
      /(?:lead )?sources? (?:convert|perform|qualify|drive|work)/,
      /(?:best|worst|which) (?:lead )?sources?/,
      /where (?:do|are) (?:our )?leads? (?:come from|coming from)/,
    ],
    boost: [/channel|source|marketing/],
    weight: 1.1,
    examples: ['Which lead sources convert best?'],
  },
  {
    id: 'renewals',
    label: 'Renewal risk',
    description: 'Packages due to expire, value at risk, and the follow-up order.',
    patterns: [
      /renew|expir|due back|churn|attrition|retention|win.?back|lapse/,
      /whose (?:package|membership) (?:ends|expires)/,
    ],
    boost: [/renew|expir|churn|retention/],
    weight: 1.1,
    examples: ['Show November renewals due', 'How much renewal value is at risk?'],
  },
  {
    id: 'segments',
    label: 'Member segments',
    description: 'Champions, loyal, at-risk, hibernating and new members with revenue share.',
    patterns: [
      /segment|cohort|rfm|membership base|member base/,
      /who are our (?:best|most valuable|loyal)/,
      /high.?value|vip|top members?/,
      /at.?risk (?:members?|clients?)/,
    ],
    boost: [/segment|cohort|members?|clients?/],
    examples: ['Break the member base into segments'],
  },
  {
    id: 'products',
    label: 'Product mix',
    description: 'Revenue by category and price band, and what carries the month.',
    patterns: [
      /product|category|mix|attach rate|what sells|best.?selling|package mix/,
      /memberships? vs|packs? vs|retail/,
      /what (?:carries|drives|makes|brings) (?:the )?(?:revenue|sales|money)/,
      /revenue mix|sales mix|top products?|which products?/,
    ],
    boost: [/product|category|mix|sell/],
    examples: ['What is carrying revenue at Kenkere House?'],
  },
  {
    id: 'attendance',
    label: 'Attendance quality',
    description: 'Check-in rate, late cancellations, day/time patterns and capacity headroom.',
    patterns: [
      /attendance|check.?in|no.?show|cancel|capacity|utilisation|utilization|class fill|peak|slot/,
      /busy|quiet (?:times?|slots?)/,
    ],
    boost: [/attendance|check.?in|cancel|capacity/],
    examples: ['When are we busiest, and where is the capacity headroom?'],
  },
  {
    id: 'offer_portfolio',
    label: 'Offer portfolio',
    description: 'Every planned offer by month, mechanism and depth, with gaps flagged.',
    patterns: [
      /offers? (?:book|bank|library|portfolio|calendar|plan)/,
      /which offers|list (?:the )?offers|all offers/,
      /promotions?|campaigns? (?:planned|live|calendar)/,
      /discount (?:depth|budget|cost)/,
      /offers? (?:are |is )?(?:planned|live|running|coming|scheduled)/,
      /what offers?|planned offers?/,
    ],
    boost: [/offers?|promotions?|campaigns?/],
    examples: ['What offers are planned for March?', 'How much discount are we planning in 2027?'],
  },
  {
    id: 'offer_build',
    label: 'Build an offer',
    description: 'Builds a policy-checked offer concept with real prices and guardrails.',
    patterns: [
      /build|create|draft|design|generate|propose|invent|new offer|campaign idea|ideas? for/,
      /give me \d+ (?:offers?|ideas?|concepts?)/,
      /offers? for|promotion for|campaign for/,
    ],
    boost: [/offer|promotion|campaign|idea|concept/],
    weight: 1.15,
    examples: ['Build a 3-for-2 newcomer offer for February'],
  },
  {
    id: 'offer_compare',
    label: 'Compare mechanisms',
    description: 'Compares offer mechanisms on price, margin and conversion risk.',
    patterns: [/compare (?:offers?|mechanisms?|promotions?)/, /(\w+) vs\.? (\w+)/, /better:? .* or .*/],
    boost: [/compare|vs|versus|or\b/],
    examples: ['Compare 2-for-1 with 3-for-2 at Bandra'],
  },
  {
    id: 'what_if',
    label: 'Scenario modelling',
    description: 'Models price, discount, conversion and volume assumptions with break-even maths.',
    patterns: [
      /what if|what happens if|scenario|simulate|sensitivity|model (?:a|the)/,
      /(?:raise|increase|cut|drop|lower) (?:the )?(?:price|discount|fee) /,
      /break.?even/,
      /if we (?:raise|cut|sell|convert|get)/,
    ],
    boost: [/if|scenario|simulate|break.?even/],
    weight: 1.2,
    examples: ['What if we raise prices 5% and lose 3% of volume?'],
  },
  {
    id: 'price_ladder',
    label: 'Price ladder',
    description: 'The studio’s real product ladder, entry points and price gaps.',
    patterns: [/price|ladder|mrp|list price|how much (?:is|does) .* cost|pricing/],
    boost: [/price|pricing|mrp|cost/],
    examples: ['Show the price ladder for Kemps Corner'],
  },
  {
    id: 'plan_summary',
    label: 'Month plan',
    description: 'The month’s theme, objective, strategy, actions and linked offers.',
    patterns: [
      /(?:plan|theme|objective|strategy|strategy for|actions?) for (?:the )?(?:month|january|february|march|april|may|june|july|august|september|october|november|december)/,
      /what(?:s| is) (?:the )?plan/,
      /month plan|monthly plan/,
      /brief|playbook/,
    ],
    boost: [/plan|theme|strategy|objective/],
    examples: ['What is the plan for April?'],
  },
  {
    id: 'key_days',
    label: 'Key days',
    description: 'Brand-relevant dates and the launch windows they create.',
    patterns: [/key days?|calendar|festival|diwali|christmas|new year|anniversary|holiday|moment/],
    boost: [/diwali|anniversary|calendar|festival/],
    examples: ['Which key days matter in Q4 2027?'],
  },
  {
    id: 'explain',
    label: 'Explain the last answer',
    description: 'Shows how the previous answer was calculated, with sources.',
    patterns: [/^why\b/, /^how (?:come|so)\b/, /explain (?:that|this|the last)/, /show (?:me )?(?:the )?(?:maths?|workings?|calculation)/, /where did .* come from/],
    examples: ['Why?'],
  },
  {
    id: 'navigate',
    label: 'Go somewhere',
    description: 'Opens the month workspace, offer bank or reports for you.',
    patterns: [/open|take me to|go to|navigate|jump to|show me the (?:page|screen)/, /where do i (?:find|edit)/],
    boost: [/open|take me|navigate|jump/],
    weight: 1.35,
    examples: ['Open April', 'Take me to the offer bank'],
  },
];

export interface CopilotSlots {
  time: ParsedTime | null;
  percent: number | null;
  money: number | null;
  offerKind: ReturnType<typeof parseOfferKind>;
  /** Studio named in the text, if any — resolved to an id later. */
  studioHint: string | null;
}

export interface Classification {
  intent: IntentId;
  score: number;
  /** 0..1 — how clearly this intent wins over the runner-up. */
  confidence: number;
  candidates: { id: IntentId; score: number }[];
  slots: CopilotSlots;
  matched: string[];
}

const STUDIO_HINTS = [
  'kemps corner',
  'kemps',
  'kwality',
  'bandra',
  'supreme hq',
  'kenkere',
  'kenkere house',
  'pop-up',
  'pop up',
  'popup',
  'copper + cloves',
  'copper and cloves',
  'plash',
  'taj wellington',
  'south united',
  'wework prestige',
  'wework galaxy',
  'mumbai',
  'bengaluru',
  'bangalore',
];

function studioHint(text: string): string | null {
  const lower = normalise(text);
  for (const hint of STUDIO_HINTS) if (lower.includes(hint)) return hint;
  return null;
}

/** Scores every intent and returns the ranking plus extracted slots. */
export function classify(input: string): Classification {
  const text = normalise(input);
  const wordTokens = tokens(text);
  const scores = new Map<IntentId, number>();
  const matched: string[] = [];

  for (const spec of INTENTS) {
    if (spec.exclude && spec.exclude.test(text)) continue;
    let score = 0;
    for (const pattern of spec.patterns) {
      const found = text.match(pattern);
      if (found) {
        score += 1;
        if (score === 1) matched.push(spec.id);
      }
    }
    if (score && spec.boost) for (const boost of spec.boost) if (boost.test(text)) score += 0.6;
    if (score) scores.set(spec.id, score * (spec.weight ?? 1));
  }

  // Question-shape heuristics that keep short follow-ups on topic.
  if (/^(why|how|and|what about|ok|then)\b/.test(text) && wordTokens.length <= 4) {
    scores.set('explain', Math.max(scores.get('explain') ?? 0, 1.4));
  }
  if (/\b(?:hi|hello|hey)\b/.test(text) && wordTokens.length <= 2) scores.set('help', 1.5);

  const ranked = [...scores.entries()]
    .map(([id, score]) => ({ id, score }))
    .sort((a, b) => b.score - a.score);
  const top = ranked[0];
  const runnerUp = ranked[1];
  if (!top) {
    return {
      intent: 'unknown',
      score: 0,
      confidence: 0,
      candidates: [],
      slots: extractSlots(text),
      matched: [],
    };
  }
  const confidence = runnerUp ? Math.min(1, (top.score - runnerUp.score) / top.score + 0.35) : 0.9;
  return {
    intent: top.id,
    score: top.score,
    confidence: Math.max(0, Math.min(1, confidence)),
    candidates: ranked.slice(0, 4),
    slots: extractSlots(text),
    matched,
  };
}

export function extractSlots(text: string): CopilotSlots {
  return {
    time: parseTime(text),
    percent: parsePercent(text),
    money: parseMoney(text),
    offerKind: parseOfferKind(text),
    studioHint: studioHint(text),
  };
}

export const INTENT_BY_ID = new Map(INTENTS.map(spec => [spec.id, spec]));
export type { ParsedTime };
