/* ─────────────────────────────────────────────────────────────────────────────
   Studio intelligence.

   Everything here is deterministic. Each generator reads the plan's own numbers
   and turns them into prose, names, goals or an audit — no model is required, and
   every returned line can be traced back to a figure in `facts`. When a provider
   key is configured the route may ask a model to rewrite the prose, but the
   figures, the findings and the severity of each finding always come from here.
   ──────────────────────────────────────────────────────────────────────────── */

import { planFor, offersFor, renewals, rollupMonth, studios } from './copilot/context.js';

const MONTHS = [
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
const MONTH_SHORT = MONTHS.map(m => m.slice(0, 3));
const money = (v: number) =>
  `₹${(Math.max(0, v) / 100000).toLocaleString('en-IN', { maximumFractionDigits: v >= 1000000 ? 0 : 1 })}L`;
const int = (v: number) => Math.round(Math.max(0, v)).toLocaleString('en-IN');
const share = (a: number, b: number) => (b > 0 ? a / b : 0);
const pct = (v: number) => `${Math.round(v * 100)}%`;

// A stable hash so the same seed always proposes the same names.
function hash(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}
function pick<T>(list: T[], seed: string, salt: number) {
  return list[(hash(seed) + salt * 7919) % list.length];
}

export interface AiScope {
  studioId: number | null;
  year: number;
  month: number;
}

export interface MonthFacts {
  studio: string;
  studioId: number | null;
  year: number;
  month: number;
  monthName: string;
  theme: string;
  objective: string;
  strategy: string;
  notes: string;
  status: string;
  target: number;
  lastYear: number;
  growth: number | null;
  streams: { newClient: number; renewal: number; reactivation: number };
  leads: number;
  trials: number;
  buyers: number;
  leadToTrial: number | null;
  trialToBuyer: number | null;
  offers: {
    id: number;
    name: string;
    kind: string;
    audience: string;
    revenue: number;
    discount: number;
    status: string;
  }[];
  offerRevenue: number;
  coverage: number;
  warnings: string[];
  renewals: { due: number; value: number; renewed: number; lapsed: number };
  actions: number;
}

export function monthFacts(scope: AiScope): MonthFacts {
  const { studioId, year, month } = scope;
  const warnings: string[] = [];
  const roll: any = (() => {
    try {
      return rollupMonth(year, month, studioId);
    } catch (error: any) {
      warnings.push(`Month rollup unavailable: ${error.message}`);
      return null;
    }
  })();
  const plan: any = studioId
    ? (() => {
        try {
          return planFor(studioId, year, month);
        } catch (error: any) {
          warnings.push(`Plan unavailable: ${error.message}`);
          return null;
        }
      })()
    : null;
  let offers: any[] = [];
  try {
    offers = offersFor(studioId, year).filter((o: any) => o.month === month);
  } catch (error: any) {
    warnings.push(`Offers unavailable: ${error.message}`);
  }
  let renewal: any = null;
  try {
    renewal = renewals(`${year}-${String(month).padStart(2, '0')}`, studioId);
  } catch (error: any) {
    warnings.push(`Renewal book unavailable for this month: ${error.message}`);
  }
  const studioName = studioId ? studios().find(s => s.id === studioId)?.name || 'This studio' : 'All locations';
  const target = Number(roll?.target) || 0;
  const lastYear = Number(roll?.historical) || 0;
  const offerRevenue = offers.reduce((sum, o) => sum + (Number(o.expected_revenue) || 0), 0);
  const duePackages = Number(renewal?.summary?.duePackages) || 0;
  const dueValue = Number(renewal?.summary?.paidDueValue) || 0;
  const renewed = Number(renewal?.summary?.alreadyRenewedCohort) || 0;
  const lapsed = Number(renewal?.summary?.lapsedCohort) || 0;
  const leads = Number(roll?.leads) || 0;
  const trials = Number(roll?.trials) || 0;
  const buyers = Number(roll?.buyers) || 0;
  return {
    studio: studioName,
    studioId,
    year,
    month,
    monthName: MONTHS[month - 1] || '',
    theme: plan?.theme || roll?.byStudio?.[0]?.theme || '',
    objective: plan?.objective || '',
    strategy: plan?.strategy || '',
    notes: plan?.notes || '',
    status: plan?.status || roll?.basis || 'proposed',
    target,
    lastYear,
    growth: lastYear ? target / lastYear - 1 : null,
    streams: {
      newClient: Number(roll?.newClient) || 0,
      renewal: Number(roll?.renewal) || 0,
      reactivation: Number(roll?.reactivation) || 0,
    },
    leads,
    trials,
    buyers,
    leadToTrial: leads ? trials / leads : null,
    trialToBuyer: trials ? buyers / trials : null,
    offers: offers.map(o => ({
      id: Number(o.id),
      name: String(o.name || 'Untitled offer'),
      kind: String(o.offer_type || 'offer'),
      audience: String(o.audience || ''),
      revenue: Number(o.expected_revenue) || 0,
      // The column stores a percentage (21 means 21%); the audit works in fractions.
      discount: (() => {
        const raw = Number(o.effective_discount) || 0;
        return raw > 1 ? raw / 100 : raw;
      })(),
      status: String(o.status || 'draft'),
    })),
    offerRevenue,
    coverage: target ? offerRevenue / target : 0,
    warnings,
    renewals: { due: duePackages, value: dueValue, renewed, lapsed },
    actions: Array.isArray(plan?.actions) ? plan.actions.length : 0,
  };
}

/* ── The audit ─────────────────────────────────────────────────────────────── */

export type Severity = 'critical' | 'warn' | 'info' | 'good';
export interface Finding {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
  fix: string;
  metric?: string;
}

export function auditMonth(facts: MonthFacts): { score: number; verdict: string; findings: Finding[] } {
  const findings: Finding[] = [];
  const push = (f: Finding) => findings.push(f);

  if (!facts.target) {
    push({
      id: 'no-target',
      severity: 'critical',
      title: 'The month has no revenue target',
      detail: 'Every other check is measured against a target, so nothing below can be scored until one is set.',
      fix: 'Set a target for this month in Targets, or copy it from the approved annual plan.',
    });
  }

  if (facts.target && facts.coverage < 0.4) {
    push({
      id: 'thin-coverage',
      severity: facts.coverage < 0.15 ? 'critical' : 'warn',
      title: `Offers carry only ${pct(facts.coverage)} of the target`,
      detail: `${money(facts.offerRevenue)} of ${money(facts.target)} is backed by ${
        facts.offers.length
      } planned offer${facts.offers.length === 1 ? '' : 's'}. The rest is unaccounted for.`,
      fix: 'Add offers from the bank until coverage passes 70%, or restate the target.',
      metric: `${money(Math.max(0, facts.target * 0.7 - facts.offerRevenue))} still to cover`,
    });
  } else if (facts.coverage >= 0.7) {
    push({
      id: 'coverage-ok',
      severity: 'good',
      title: `Offers carry ${pct(facts.coverage)} of the target`,
      detail: `${money(facts.offerRevenue)} of ${money(facts.target)} is planned through ${facts.offers.length} offers.`,
      fix: 'Keep the live offers as drafted; the plans are load-bearing.',
    });
  }

  if (facts.offers.length === 0) {
    push({
      id: 'no-offers',
      severity: 'critical',
      title: 'No offers on the plan',
      detail: 'The month has a target but no commercial mechanic behind it.',
      fix: 'Pick at least a newcomer and a renewal mechanic from the offer bank.',
    });
  } else if (facts.offers.length === 1 && facts.target > 1500000) {
    push({
      id: 'single-offer',
      severity: 'warn',
      title: 'One mechanism carries the whole month',
      detail: `${facts.offers[0].name} is the only offer behind ${money(facts.target)}. A single mechanic leaves no second attempt if it underperforms.`,
      fix: 'Add a second, differently audienced offer — a lapsed-member comeback reads independently of a newcomer pack.',
    });
  }

  const expensive = facts.offers.filter(o => o.discount > 0.45);
  if (expensive.length) {
    push({
      id: 'discount-depth',
      severity: 'warn',
      title:
        'Deep discounting on ' +
        expensive
          .map(o => o.name)
          .slice(0, 2)
          .join(' and '),
      detail: `Effective discount is above 45% (${expensive
        .map(o => `${o.name} ${pct(o.discount)}`)
        .slice(0, 3)
        .join(', ')}). Revenue per buyer falls further than the volume usually recovers.`,
      fix: 'Cap the headline discount and add value (classes, assessments) instead of price.',
    });
  }

  if (facts.renewals.due > 0) {
    const renewalOffer = facts.offers.find(o =>
      /renew|loyal|member|annual|continu/i.test(`${o.name} ${o.kind} ${o.audience}`),
    );
    const renewedShare = share(facts.renewals.renewed, facts.renewals.due);
    if (!renewalOffer) {
      push({
        id: 'renewal-gap',
        severity: 'warn',
        title: `${int(facts.renewals.due)} memberships expire with no renewal mechanic`,
        detail: `Nothing on the plan speaks to a member who is already here. Their book is worth ${money(
          facts.renewals.value,
        )} this month, and ${int(facts.renewals.renewed)} have renewed so far.`,
        fix: 'Add the renewal offer and schedule the first call in week one, not week four.',
        metric: `${money(facts.renewals.value)} of renewal value on the table`,
      });
    } else if (renewedShare < 0.35) {
      push({
        id: 'renewal-slow',
        severity: 'info',
        title: `Only ${pct(renewedShare)} of the expiring cohort has renewed`,
        detail: `${int(facts.renewals.renewed)} of ${int(facts.renewals.due)} packages have renewed; ${
          renewalOffer.name
        } is on the plan but the conversation has not started.`,
        fix: 'Start the call list this week — a renewal offer that nobody is asked about is a discount nobody takes.',
        metric: `${money(facts.renewals.value)} due this month`,
      });
    } else {
      push({
        id: 'renewal-ok',
        severity: 'good',
        title: `The renewal book is moving: ${pct(renewedShare)} already renewed`,
        detail: `${int(facts.renewals.renewed)} of ${int(facts.renewals.due)} expiring packages have renewed, against ${money(
          facts.renewals.value,
        )} due.`,
        fix: 'Keep the calls weekly; the last fortnight is where renewals are lost.',
      });
    }
  }

  if (facts.growth !== null && facts.growth > 0.12 && !facts.streams.reactivation) {
    push({
      id: 'growth-without-comeback',
      severity: 'warn',
      title: `Target is ${Math.round(facts.growth * 100)}% above last year with no comeback stream`,
      detail: `Growth of ${money(Math.max(0, facts.target - facts.lastYear))} is fully assigned to new clients and renewals, and no revenue is planned from lapsed members.`,
      fix: 'Give the comeback stream a designated offer — it converts at a better cost than cold acquisition.',
    });
  }

  if (facts.offers.some(o => !o.audience)) {
    push({
      id: 'unsegmented',
      severity: 'info',
      title: 'An offer has no audience',
      detail:
        'An offer without a named audience cannot be prioritised against the others, and the copy has no one to speak to.',
      fix: 'Name the audience on each offer (newcomer, lapsed, expiring, member).',
    });
  }

  if (facts.leadToTrial !== null && facts.leadToTrial < 0.35) {
    push({
      id: 'funnel-leak',
      severity: 'warn',
      title: `Lead → trial is ${pct(facts.leadToTrial)}`,
      detail: `${int(facts.leads)} leads are required to produce ${int(facts.trials)} trials. Below 35% the month is buying leads it cannot convert.`,
      fix: 'Move budget into the channels that already convert, and tighten the trial booking script.',
    });
  }

  if (facts.status !== 'approved') {
    push({
      id: 'not-approved',
      severity: 'info',
      title: `The month is ${facts.status === 'locked' ? 'target-locked' : 'still a proposal'}`,
      detail: 'Numbers here are the plan, not a commitment. Publishing before approval will not change that.',
      fix: 'Approve the month once the offers and the target agree.',
    });
  }

  if (facts.actions === 0) {
    push({
      id: 'no-actions',
      severity: 'info',
      title: 'No actions are written for the month',
      detail: 'A plan without dated actions is a forecast. Nobody owns a number.',
      fix: 'Generate a four-week action plan and assign an owner to each line.',
    });
  }

  if (!findings.length) {
    push({
      id: 'clean',
      severity: 'good',
      title: 'Nothing is structurally wrong with this month',
      detail: 'Coverage, renewals, discounting and the funnel all sit inside their ranges.',
      fix: 'The remaining work is copy and sequencing — the numbers are sound.',
    });
  }

  const penalties: Record<Severity, number> = { critical: 26, warn: 11, info: 3, good: 0 };
  const score = Math.max(0, Math.min(100, 100 - findings.reduce((sum, f) => sum + penalties[f.severity], 0)));
  const verdict =
    score >= 85
      ? 'Sound. The month can run as planned.'
      : score >= 65
        ? 'Workable, with named gaps to close before it goes live.'
        : score >= 40
          ? 'Fragile. Several findings need a decision, not a tweak.'
          : 'Not ready. The month would be published without a commercial case.';
  return {
    score,
    verdict,
    findings: findings.sort(
      (a, b) =>
        ({ critical: 0, warn: 1, info: 2, good: 3 })[a.severity] -
        { critical: 0, warn: 1, info: 2, good: 3 }[b.severity],
    ),
  };
}

/* ── Sentiment ─────────────────────────────────────────────────────────────── */

const POSITIVE = [
  'grow',
  'growth',
  'win',
  'wins',
  'best',
  'strong',
  'bold',
  'celebrate',
  'celebration',
  'delight',
  'love',
  'warm',
  'premium',
  'exclusive',
  'craft',
  'care',
  'confident',
  'fresh',
  'return',
  'loyal',
  'loyalty',
  'reward',
  'momentum',
  'clear',
  'simple',
  'generous',
  'invite',
  'welcome',
  'shine',
  'rise',
];
const NEGATIVE = [
  'risk',
  'risky',
  'weak',
  'fail',
  'fails',
  'falling',
  'fall',
  'drop',
  'drops',
  'decline',
  'declining',
  'pressure',
  'churn',
  'churns',
  'lapse',
  'lapsed',
  'expensive',
  'hard',
  'difficult',
  'shortfall',
  'stall',
  'stalls',
  'quiet',
  'thin',
  'empty',
  'leak',
  'leaks',
  'problem',
  'concern',
  'unclear',
  'late',
  'delay',
];
const HEDGES = [
  'maybe',
  'perhaps',
  'possibly',
  'hopefully',
  'somewhat',
  'fairly',
  'try to',
  'attempt to',
  'should probably',
];

export function sentimentOf(text: string) {
  const words = text.toLowerCase().match(/[a-z']+/g) || [];
  const drivers: { term: string; weight: number; kind: 'positive' | 'negative' | 'hedge' }[] = [];
  let score = 0;
  for (const word of words) {
    if (POSITIVE.includes(word)) {
      score += 1;
      drivers.push({ term: word, weight: 1, kind: 'positive' });
    } else if (NEGATIVE.includes(word)) {
      score -= 1;
      drivers.push({ term: word, weight: -1, kind: 'negative' });
    }
  }
  for (const hedge of HEDGES) {
    if (text.toLowerCase().includes(hedge)) {
      score -= 0.6;
      drivers.push({ term: hedge, weight: -1, kind: 'hedge' });
    }
  }
  const wordCount = Math.max(1, words.length);
  // Normalised against length so a long brief is not automatically more emotional.
  const normalised = Math.max(-1, Math.min(1, score / Math.sqrt(wordCount) / 2.2));
  const unique = [...new Map(drivers.map(d => [d.term, d])).values()].slice(0, 8);
  const label =
    normalised > 0.35
      ? 'Confident'
      : normalised > 0.1
        ? 'Warm'
        : normalised > -0.1
          ? 'Neutral'
          : normalised > -0.35
            ? 'Cautious'
            : 'Anxious';
  return {
    score: Number(normalised.toFixed(2)),
    label,
    words: wordCount,
    drivers: unique,
    note: 'Lexicon-based reading of the month’s own writing — not a model’s opinion.',
  };
}

/* ── Copy ──────────────────────────────────────────────────────────────────── */

const FILLER: [RegExp, string][] = [
  [/\bin order to\b/gi, 'to'],
  [/\bdue to the fact that\b/gi, 'because'],
  [/\bat this point in time\b/gi, 'now'],
  [/\bwe are looking to\b/gi, 'we will'],
  [/\bwe would like to\b/gi, 'we will'],
  [/\butili[sz]e\b/gi, 'use'],
  [/\bleverage\b/gi, 'use'],
  [/\bsynerg(y|ies)\b/gi, 'fit'],
  [/\bvery\b|\breally\b|\bquite\b|\bjust\b|\bactually\b|\bbasically\b/gi, ''],
  [/\bhopefully\b|\bmaybe\b|\bperhaps\b|\bpossibly\b/gi, ''],
  [/\btry to\b/gi, 'will'],
  [/\bwe think\b/gi, 'we'],
  [/\bin the region of\b/gi, 'about'],
  [/\ba number of\b/gi, 'several'],
  [/\bwe think that\b/gi, 'we think'],
  [/\bmake sure to\b/gi, 'ensure'],
  [/\bhelp to\b/gi, 'help'],
  [/\s{2,}/g, ' '],
];

function tighten(text: string) {
  let out = text.trim();
  for (const [pattern, replacement] of FILLER) out = out.replace(pattern, replacement);
  out = out
    .replace(/\s+([,.;:])/g, '$1')
    .replace(/([.!?])\s*([a-z])/g, (_m, a, b) => `${a} ${b.toUpperCase()}`)
    .replace(/^([a-z])/, m => m.toUpperCase());
  return out;
}

const TONES = ['Tighter', 'Warmer', 'Sharper'] as const;
export type Tone = (typeof TONES)[number];

export function enhanceCopy(input: { text: string; kind?: string; tone?: string; facts: MonthFacts }) {
  const raw = String(input.text || '').trim();
  const facts = input.facts;
  const sentence = raw ? raw.split(/(?<=[.!?])\s+/)[0] : '';
  const metricLine = facts.target
    ? `${money(facts.target)} across ${facts.offers.length || 'no'} planned offer${facts.offers.length === 1 ? '' : 's'}`
    : '';
  // The audience is a stored label, often with a verification note in brackets: read it
  // as a phrase a sentence can hold, not as a database value.
  const audience =
    (facts.offers.find(o => o.audience)?.audience || 'the member base')
      .replace(/\(.*?\)/g, '')
      .replace(/[.;:]+$/, '')
      .trim()
      .toLowerCase() || 'the member base';
  const alternatives = [
    {
      tone: 'Tighter',
      text: tighten(raw),
      why: 'Filler and hedges removed; the first clause now leads.',
    },
    {
      tone: 'Warmer',
      text: sentence
        ? `${tighten(sentence)} ${facts.monthName} is the month we make ${audience} feel chosen rather than sold to.`
        : `${facts.monthName} is the month we make ${audience} feel chosen rather than sold to.`,
      why: 'Adds a human subject and a promise in the second clause.',
    },
    {
      tone: 'Sharper',
      text: metricLine
        ? `${tighten(sentence || raw)} The month must land ${metricLine}.`
        : `${tighten(sentence || raw)} The month must name its number before it is approved.`,
      why: 'Ends on the number the month is judged by.',
    },
  ];
  const notes: string[] = [];
  if (/\b(very|really|quite|just)\b/i.test(raw)) notes.push('Intensifiers are doing the work of better nouns.');
  if (raw.split(/\s+/).length > 45) notes.push('Longer than 45 words — split it into the promise and the proof.');
  if (!/\d/.test(raw) && facts.target) notes.push('No figure appears in the copy; the month has one worth quoting.');
  if (/\b(maybe|perhaps|hopefully|try to)\b/i.test(raw))
    notes.push('Hedged verbs weaken a commitment the plan already makes.');
  if (!notes.length) notes.push('The sentence is clean. Keep the first clause and cut nothing else.');
  return {
    original: raw,
    sentiment: sentimentOf(raw),
    alternatives,
    notes,
    speakable:
      alternatives.find(a => a.tone === (TONES.includes(input.tone as Tone) ? input.tone : 'Sharper'))?.text ||
      tighten(raw),
  };
}

/* ── Witty offer names ─────────────────────────────────────────────────────── */

const NAME_PARTS: Record<string, { lead: string[]; tail: string[] }> = {
  newcomer: {
    lead: ['First Bell', 'The First Ten', 'New Here?', 'Front Row', 'Debut'],
    tail: [
      'three classes on us',
      'your first week, on the house',
      'the newcomer handshake',
      'a first month with the edges filed off',
    ],
  },
  lapsed: {
    lead: ['Comeback', 'The Return', 'Back to the Barre', 'Missed You', 'Prodigal'],
    tail: ['we saved your spot', 'two weeks to remember why', 'the door is still open', 'your old spot, warmer'],
  },
  renewal: {
    lead: ['Stay', 'The Long Game', 'Same Room, Next Year', 'Continuity', 'Twelve More'],
    tail: ['lock the year at last year’s price', 'renew before the clock resets', 'another season in the same corner'],
  },
  member: {
    lead: ['Members’ Table', 'Inside Access', 'The Quiet Hour', 'Room Service'],
    tail: ['an hour the rest of the city cannot book', 'first refusal on every slot'],
  },
  gift: {
    lead: ['Wrap It', 'Gift the Barre', 'Something Worth Opening', 'Present Tense'],
    tail: ['a month someone will actually use', 'the class gift that is not a voucher'],
  },
  default: {
    lead: ['The Invitation', 'Open Studio', 'Try the Room', 'Bring a Friend'],
    tail: ['see the room before you decide', 'a class that answers the question'],
  },
};

const WITTY_TAILS = [
  'no small print, no cold calls',
  'one room, no excuses',
  'the good kind of pressure',
  'bring socks, leave doubt',
  'strong is a habit, not a mood',
  'tell your legs we said hi',
  'sweat now, thank us later',
];

export function offerNames(input: { seed?: string; audience?: string; kind?: string; theme?: string; month?: number }) {
  const seed = `${input.seed || ''}|${input.audience || ''}|${input.kind || ''}|${input.month || 0}`;
  const key = (input.audience || input.kind || 'default').toLowerCase();
  const bucket =
    NAME_PARTS[
      Object.keys(NAME_PARTS).find(k => key.includes(k)) ||
        (key.includes('new')
          ? 'newcomer'
          : key.includes('lapse')
            ? 'lapsed'
            : key.includes('renew')
              ? 'renewal'
              : 'default')
    ] || NAME_PARTS.default;
  const rows = [] as { name: string; tone: string; why: string }[];
  for (let i = 0; i < 6; i++) {
    const lead = pick(bucket.lead, seed, i);
    const tail = i % 3 === 2 ? pick(WITTY_TAILS, seed, i) : pick(bucket.tail, seed, i);
    const name = i % 2 === 0 ? `${lead} — ${tail}` : `${lead}: ${tail}`;
    rows.push({
      // Sentence case: the audience is not a headline, and the mechanic keeps its own words.
      name: name.charAt(0).toUpperCase() + name.slice(1),
      tone: ['irreverent', 'warm', 'premium', 'dry', 'bright', 'wry'][i % 6],
      why:
        i % 3 === 2
          ? 'The tail does the joking so the offer name stays legible in the app.'
          : 'Names the audience first, then the mechanic — readable at 11px on a phone.',
    });
  }
  return {
    names: [...new Map(rows.map(r => [r.name, r])).values()],
    guidance: `Offer names work when the audience is in the first two words and the mechanic is in the last three. ${
      input.theme ? `This month’s theme (“${input.theme}”) can supply the verb.` : ''
    }`.trim(),
  };
}

/* ── Actions ───────────────────────────────────────────────────────────────── */

export function actionPlan(facts: MonthFacts) {
  const offers = facts.offers.length ? facts.offers : [];
  const lead = offers[0]?.name || 'the lead offer';
  const second = offers[1]?.name || 'the second offer';
  const renewalOffer = offers.find(o => /renew|loyal|member|annual/i.test(`${o.name} ${o.kind} ${o.audience}`))?.name;
  const renewalMove = renewalOffer || 'the renewal mechanic';
  const weeks = [
    {
      week: 1,
      label: 'Set the room',
      metric: `${int(facts.renewals.due)} renewal calls booked`,
      actions: [
        `Call the ${int(facts.renewals.due)} memberships expiring this month — the first 40% of the list, scripted around ${renewalMove}.`,
        `Brief the front desk on ${lead} so the offer is quoted, not discovered.`,
        facts.target
          ? `Confirm the ${money(facts.target)} target with the studio lead and post it where the team can see it.`
          : 'Agree the month’s target before anything else is scheduled.',
      ],
    },
    {
      week: 2,
      label: 'Bring them in',
      metric: `${int(Math.round(facts.leads * 0.3))} leads`,
      actions: [
        `Open the acquisition push for ${lead} across the two channels that converted best last quarter.`,
        'Turn every trial booking into a front-desk greeting, not an automated reply.',
        `Re-engage lapsed members with a two-week window; give the comeback its own conversation, not a broadcast.`,
      ],
    },
    {
      week: 3,
      label: 'Convert',
      metric: `${int(Math.round(facts.buyers * 0.4))} memberships`,
      actions: [
        `Close the trials from week two in person, with ${second} as the fallback if the price is the objection.`,
        'Review the renewal list again — anyone called but not converted gets a second, different conversation.',
        `Check discount depth on ${lead}; if the room is filling, do not add more.`,
      ],
    },
    {
      week: 4,
      label: 'Close and count',
      metric: 'Month closed with variances owned',
      actions: [
        'Reconcile the month against the funnel: leads, trials, buyers, revenue, and the renewal gap that is left.',
        `Keep ${lead} live into the first week of next month if it is still converting.`,
        'Write down what worked in one page — next month’s plan should not rediscover it.',
      ],
    },
  ];
  return {
    weeks,
    owner: `${facts.studio} studio lead`,
    note: 'Sequenced from this month’s own numbers: renewals first, acquisition second, conversion while the trials are warm.',
  };
}

/* ── Goals ─────────────────────────────────────────────────────────────────── */

export function writingGoals(facts: MonthFacts) {
  const coverageGoal = Math.max(0.7, Math.min(0.95, facts.coverage + 0.15));
  const goals = [
    {
      id: 'coverage',
      horizon: 'Before approval',
      statement: `Every rupee of the ${facts.monthName} target is carried by a named offer`,
      metric: 'Offer coverage of target',
      from: pct(facts.coverage),
      to: pct(coverageGoal),
      how: 'Sum of expected revenue on the month’s offers ÷ the month’s target.',
    },
    {
      id: 'renewals',
      horizon: 'Month',
      statement: `${facts.monthName}’s expiring memberships are called before they lapse`,
      metric: 'Renewal coverage',
      from: `${int(facts.renewals.renewed)} of ${int(facts.renewals.due)}`,
      to: `${int(facts.renewals.due)} of ${int(facts.renewals.due)}`,
      how: 'Memberships with a logged conversation before their end date.',
    },
    {
      id: 'funnel',
      horizon: 'Month',
      statement: `Trials convert at a rate the month can afford`,
      metric: 'Trial → buyer',
      from: facts.trialToBuyer === null ? 'not set' : pct(facts.trialToBuyer),
      to: pct(Math.min(0.75, Math.max(0.45, (facts.trialToBuyer || 0.35) + 0.08))),
      how: `${int(facts.buyers)} required buyers ÷ ${int(facts.trials)} required trials.`,
    },
    {
      id: 'discount',
      horizon: 'Quarter',
      statement: 'Growth comes from mechanics, not from deeper discounts',
      metric: 'Revenue-weighted discount',
      from: pct(
        facts.offers.length
          ? facts.offers.reduce((sum, o) => sum + o.discount * o.revenue, 0) /
              Math.max(
                1,
                facts.offers.reduce((sum, o) => sum + o.revenue, 0),
              )
          : 0,
      ),
      to: '≤ 30%',
      how: 'Expected-revenue-weighted discount across live offers.',
    },
    {
      id: 'actions',
      horizon: 'Week',
      statement: 'Every week of the month has dated actions and a named owner',
      metric: 'Dated actions',
      from: `${facts.actions} written`,
      to: '12 written',
      how: 'Three actions per week, each with an owner and a date.',
    },
  ];
  return {
    goals,
    note: 'Written as commitments with a measurement attached, so a goal can be closed and not just felt.',
  };
}
