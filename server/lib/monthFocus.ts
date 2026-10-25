import { z } from 'zod';

const streamNumbers = z.object({
  newClient: z.number().nonnegative().default(0),
  renewal: z.number().nonnegative().default(0),
  reactivation: z.number().nonnegative().default(0),
});

export const focusRequestSchema = z.object({
  studioName: z.string().max(120),
  monthName: z.string().max(20),
  year: z.number().int(),
  currentTheme: z.string().max(200).optional().default(''),
  target: z.number().nonnegative().optional().default(0),
  lastYear: z.number().nonnegative().optional().default(0),
  offerGap: z.number().optional().default(0),
  offerRevenue: z.number().nonnegative().optional().default(0),
  keyDates: z.array(z.string().max(120)).max(16).optional().default([]),
  offers: z.array(z.string().max(160)).max(16).optional().default([]),
  offerDetails: z
    .array(
      z.object({
        name: z.string().max(160),
        stream: z.string().max(60),
        benefit: z.string().max(400).optional().default(''),
        audience: z.string().max(200).optional().default(''),
        price: z.number().nonnegative().optional().default(0),
        units: z.number().nonnegative().optional().default(0),
        revenue: z.number().nonnegative().optional().default(0),
      }),
    )
    .max(16)
    .optional()
    .default([]),
  streams: streamNumbers.optional(),
  streamCoverage: streamNumbers.optional(),
  funnel: z.record(z.string(), z.number()).optional().default({}),
  steer: z.string().max(400).optional().default(''),
});
export type FocusRequest = z.infer<typeof focusRequestSchema>;

export const focusSchema = z.object({
  theme: z.string().trim().min(3).max(120),
  objective: z.string().trim().min(3).max(320),
  strategy: z.string().trim().min(20).max(2600),
  focusPoints: z.array(z.string().trim().min(3).max(240)).min(3).max(7),
  splitRationale: z.string().trim().max(1100),
  actionPlan: z
    .array(
      z.object({
        week: z.number().int().min(1).max(5),
        owner: z.string().trim().max(60),
        text: z.string().trim().min(3).max(260),
      }),
    )
    .min(4)
    .max(16),
  reasoning: z
    .array(
      z.object({
        heading: z.string().trim().min(2).max(80),
        points: z.array(z.string().trim().min(3).max(320)).min(1).max(6),
      }),
    )
    .min(2)
    .max(6),
  risks: z.array(z.string().trim().min(3).max(280)).max(6),
});
export type MonthFocus = z.infer<typeof focusSchema> & { mode?: 'ai' | 'synthesised' };

const str = (description: string) => ({ type: 'string', description });

const fmtLakh = (rupees: number) => {
  const v = Number(rupees) || 0;
  if (v >= 100000) {
    const l = v / 100000;
    return `₹${l >= 10 ? l.toFixed(1) : l.toFixed(2).replace(/\.?0+$/, '')}L`;
  }
  return `₹${Math.round(v).toLocaleString('en-IN')}`;
};

// Strips stray list markers, markdown headers or wrapping quotes and guarantees a clean "**Lead:** Body" structure
// so AI-generated items render with the exact same visual card grammar as curated Monthly Focus & Target entries.
function stripListPrefix(input: string): string {
  return String(input || '')
    .trim()
    .replace(/^(?:#{1,6}\s+|[-•*–—]\s+|\d+[.)]\s+)+/, '')
    .trim();
}

function ensureLeadColon(line: string, fallbackLead?: string): string {
  const clean = stripListPrefix(line);
  if (!clean) return '';
  // Matches both "**Lead:** Body" (colon inside **) and "**Lead**: Body" / "**Lead** — Body" (outside **)
  const boldMatch = clean.match(/^\*\*([^*]{2,64}?)(?:\s*[:—–-]\s*\*\*|\*\*\s*[:—–-])\s*(.+)$/);
  if (boldMatch) {
    return `**${boldMatch[1].trim().replace(/[:—–-]+$/, '').trim()}:** ${boldMatch[2].trim()}`;
  }
  // Plain "Lead: Body" or "Lead — Body" where Lead is concise (<= 6 words)
  const plainMatch = clean.match(/^([A-Za-z0-9₹%+&/()'’ -]{2,44})\s*(?::|—|–)\s+(.+)$/);
  if (plainMatch && plainMatch[1].trim().split(/\s+/).length <= 6) {
    return `**${plainMatch[1].trim()}:** ${plainMatch[2].trim()}`;
  }
  if (fallbackLead) {
    return `**${fallbackLead}:** ${clean}`;
  }
  return clean;
}

export function normalizeMonthFocus(raw: z.infer<typeof focusSchema>): z.infer<typeof focusSchema> {
  const cleanTheme = stripListPrefix(
    String(raw.theme || '')
      .trim()
      .replace(/^["'“”‘’]+|["'“”‘’]+$/g, ''),
  )
    .replace(/\*\*/g, '')
    .replace(/\.$/, '')
    .trim();

  const cleanObjective = stripListPrefix(
    String(raw.objective || '')
      .trim()
      .replace(/^["'“”]+|["'“”]+$/g, ''),
  )
    .replace(/\s+/g, ' ')
    .trim();

  const rawStrategyLines = String(raw.strategy || '')
    .split(/\r?\n/)
    .map(l => stripListPrefix(l))
    .filter(Boolean);

  const strategyFallbackLeads = ['Hero Offer', 'Renewal Lock-In', 'Trial Velocity', 'Comeback Push', 'Calendar Hook', 'Margin Guardrail'];
  const normalizedStrategy = (rawStrategyLines.length ? rawStrategyLines : [cleanObjective])
    .slice(0, 6)
    .map((line, i) => `- ${ensureLeadColon(line, strategyFallbackLeads[i % strategyFallbackLeads.length])}`)
    .join('\n');

  const focusFallbackLeads = ['Front Desk', 'Renewals', 'Pack Upgrade', 'Reactivation', 'Studio Experience', 'Discipline'];
  const normalizedFocusPoints = raw.focusPoints
    .map(p => stripListPrefix(p))
    .filter(Boolean)
    .slice(0, 6)
    .map((p, i) => ensureLeadColon(p, focusFallbackLeads[i % focusFallbackLeads.length]));

  const splitFallbackLeads = ['New Clients', 'Renewals', 'Comeback', 'Stream Balance'];
  const rawSplitLines = String(raw.splitRationale || '')
    .split(/\r?\n/)
    .map(l => stripListPrefix(l))
    .filter(Boolean);
  const normalizedSplitRationale =
    rawSplitLines.length > 0
      ? rawSplitLines
          .map((l, i) => `- ${ensureLeadColon(l, splitFallbackLeads[i % splitFallbackLeads.length])}`)
          .join('\n')
      : '';

  const pointFallbackLeads = ['Commercial Driver', 'Offer Coverage', 'Funnel Benchmark', 'Execution Lever', 'Margin Check'];
  const normalizedReasoning = raw.reasoning.slice(0, 5).map(sec => ({
    heading: stripListPrefix(sec.heading).replace(/\*\*/g, '').replace(/:$/, '').slice(0, 80),
    points: sec.points
      .map(pt => stripListPrefix(pt))
      .filter(Boolean)
      .slice(0, 5)
      .map((pt, j) => ensureLeadColon(pt, pointFallbackLeads[j % pointFallbackLeads.length])),
  }));

  const normalizedRisks = raw.risks
    .map(r => stripListPrefix(r))
    .filter(Boolean)
    .slice(0, 5)
    .map((r, i) => ensureLeadColon(r, `Risk ${i + 1}`));

  const normalizedActions = raw.actionPlan.slice(0, 16).map(a => ({
    week: Math.min(5, Math.max(1, Math.round(a.week))),
    owner: stripListPrefix(a.owner).replace(/\*\*/g, '').slice(0, 60) || 'Studio Manager',
    text: stripListPrefix(a.text).slice(0, 260),
  }));

  return focusSchema.parse({
    theme: cleanTheme.slice(0, 120),
    objective: cleanObjective.slice(0, 320),
    strategy: normalizedStrategy.slice(0, 2600),
    focusPoints: normalizedFocusPoints.length >= 3 ? normalizedFocusPoints : raw.focusPoints.map(stripListPrefix),
    splitRationale: normalizedSplitRationale.slice(0, 1100),
    actionPlan: normalizedActions,
    reasoning: normalizedReasoning,
    risks: normalizedRisks,
  });
}

// Data-grounded synthesiser used when OPENAI_API_KEY is not configured so "Enhance with AI" works seamlessly
// in every environment while obeying the exact same structured layout & formatting rules.
function synthesizeStructuredFocus(raw: FocusRequest): MonthFocus {
  const target = Number(raw.target || 0);
  const lastYear = Number(raw.lastYear || 0);
  const yoyPct = lastYear > 0 ? Math.round(((target - lastYear) / lastYear) * 100) : null;
  const streams = raw.streams || {
    newClient: Math.round(target * 0.34),
    renewal: Math.round(target * 0.48),
    reactivation: Math.max(0, Math.round(target - Math.round(target * 0.34) - Math.round(target * 0.48))),
  };
  const totalStream = Math.max(1, streams.newClient + streams.renewal + streams.reactivation);
  const newPct = Math.round((streams.newClient / totalStream) * 100);
  const renPct = Math.round((streams.renewal / totalStream) * 100);
  const reactPct = Math.max(0, 100 - newPct - renPct);

  const newOffer =
    raw.offerDetails.find(o => o.stream.toLowerCase().includes('new'))?.name ||
    raw.offers[0] ||
    'Newcomer Intro Offer';
  const renOffer =
    raw.offerDetails.find(o => o.stream.toLowerCase().includes('renew') || o.stream.toLowerCase().includes('ticket'))?.name ||
    raw.offers[1] ||
    '3M Commitment Upgrade';
  const reactOffer =
    raw.offerDetails.find(o => o.stream.toLowerCase().includes('comeback') || o.stream.toLowerCase().includes('react'))?.name ||
    raw.offers[2] ||
    'Comeback Pack';
  const keyDateLabel = raw.keyDates[0] || `Week 2 ${raw.monthName} showcase`;

  const leads = Math.round(Number(raw.funnel.leads || 0));
  const trials = Math.round(Number(raw.funnel.trials || 0));
  const newMembers = Math.round(Number(raw.funnel.newMembers || 0));
  const renewalsNeeded = Math.round(Number(raw.funnel.renewalsNeeded || 0));
  const expiriesDue = Math.round(Number(raw.funnel.expiriesDue || 0));
  const reactivationsNeeded = Math.round(Number(raw.funnel.reactivationsNeeded || 0));
  const lapsedPool = Math.round(Number(raw.funnel.lapsedPool || 0));

  const theme =
    raw.currentTheme && raw.currentTheme.trim().length >= 4
      ? raw.currentTheme.trim()
      : `${raw.monthName} Momentum · Full-Value Commitment`;

  const yoyClause =
    yoyPct !== null ? ` (${yoyPct >= 0 ? `+${yoyPct}%` : `${yoyPct}%`} vs ${fmtLakh(lastYear)} last year)` : '';
  const gapClause =
    raw.offerGap > 50000
      ? `, closing the ${fmtLakh(raw.offerGap)} offer gap through higher-ticket 3M upgrades`
      : '';

  const objective = `Deliver **${fmtLakh(target)}** at ${raw.studioName} in ${raw.monthName} ${raw.year}${yoyClause} by anchoring **${renPct}%** in list-price renewals and converting **${newMembers || 'target'}** new members${gapClause}.`;

  const strategyLines = [
    `- **Acquisition Anchor:** Lead front-of-funnel outreach with **${newOffer}** around **${keyDateLabel}** to convert ${trials > 0 ? `**${trials}** trials into **${newMembers}** paying members` : `newcomer demand into **${fmtLakh(streams.newClient)}**`}.`,
    `- **T-14 Renewal Lock-In:** Work ${expiriesDue > 0 ? `all **${expiriesDue}** expiring memberships` : 'the expiring cohort'} 14 days early using **${renOffer}** to secure **${renewalsNeeded > 0 ? `${renewalsNeeded} renewals` : fmtLakh(streams.renewal)}** without percentage discount codes.`,
    `- **Segmented Comeback Wave:** Reach into ${lapsedPool > 0 ? `the **${lapsedPool}**-member lapsed pool` : '61–365d lapsed members'} with **${reactOffer}** to land **${reactivationsNeeded > 0 ? `${reactivationsNeeded} reactivations` : fmtLakh(streams.reactivation)}** before mid-month.`,
    raw.offerGap > 25000
      ? `- **Gap Closure Play:** Bridge the **${fmtLakh(raw.offerGap)}** gap between target (**${fmtLakh(target)}**) and offer forecast (**${fmtLakh(raw.offerRevenue)}**) by stepping 1-in-4 1M renewers into 3M packs.`
      : `- **Pricing Discipline:** Keep offer coverage (**${fmtLakh(raw.offerRevenue || target)}**) aligned to the **${fmtLakh(target)}** goal using bonus classes or freeze extensions rather than cash markdowns.`,
  ];
  if (raw.steer?.trim()) {
    strategyLines.push(`- **Leadership Steer:** Execute priority directive — ${stripListPrefix(raw.steer)}.`);
  }

  const focusPoints = [
    `**Trial Follow-Up:** Call every ${raw.monthName} trial attendee within 48 hours and pitch **${newOffer}** at the studio desk.`,
    `**Pre-Expiry Outreach:** Contact ${expiriesDue > 0 ? `all **${expiriesDue}** expiring members` : 'expiring members'} by Week 2 to lock **${renewalsNeeded || 'target'}** renewals at list price.`,
    `**Ticket Mix Lift:** Position 3M memberships ahead of single packs so new-client revenue hits **${fmtLakh(streams.newClient)}**.`,
    `**Comeback Calling:** Assign named trainer/desk outreach across ${lapsedPool > 0 ? `top **${Math.min(80, lapsedPool)}** lapsed clients` : 'high-value lapsers'} for **${reactOffer}**.`,
  ];

  const splitRationale = [
    `- **New clients (${fmtLakh(streams.newClient)} · ${newPct}%):** Carried by **${newOffer}**${newMembers > 0 ? ` across **${leads}** leads → **${trials}** trials → **${newMembers}** buyers` : ''}.`,
    `- **Renewals (${fmtLakh(streams.renewal)} · ${renPct}%):** Anchored by **${renOffer}**${expiriesDue > 0 ? ` against **${expiriesDue}** scheduled expiries (**${renewalsNeeded}** renewals needed)` : ''}.`,
    `- **Comeback (${fmtLakh(streams.reactivation)} · ${reactPct}%):** Driven by **${reactOffer}**${lapsedPool > 0 ? ` converting **${reactivationsNeeded}** members from the **${lapsedPool}** lapsed pool` : ''}.`,
  ].join('\n');

  const actionPlan = [
    { week: 1, owner: 'Studio manager', text: `Brief desk & trainers on ${raw.monthName} ${fmtLakh(target)} target, stream quotas, and ${newOffer} positioning.` },
    { week: 1, owner: 'Front desk', text: `Launch T-14 renewal calls across ${expiriesDue > 0 ? `${expiriesDue} expiring packages` : 'upcoming expiries'} pitching ${renOffer}.` },
    { week: 2, owner: 'Marketing', text: `Activate ${keyDateLabel} campaign creative and WhatsApp broadcast to drive ${leads > 0 ? `${Math.ceil(leads * 0.4)} top-of-funnel leads` : 'trial bookings'}.` },
    { week: 2, owner: 'Sales associate', text: `Work high-LTV lapsed segment with ${reactOffer} to lock the first half of ${reactivationsNeeded || 'monthly'} comeback sales.` },
    { week: 3, owner: 'Trainer lead', text: `Host themed studio classes and hand off every trial attendee to the desk within 15 minutes of class finish.` },
    { week: 3, owner: 'Studio manager', text: `Audit mid-month pacing against ${fmtLakh(Math.round(target * 0.55))} checkpoint and escalate 1M→3M upgrade scripts.` },
    { week: 4, owner: 'Sales associate', text: `Close pending ${newOffer} trial cohorts and unrenewed ${raw.monthName} expiries before hard month-end cutoff.` },
    { week: 4, owner: 'Ops', text: `Reconcile promo redemptions, discount ceiling compliance, and pre-book next month's Week-1 trial roster.` },
  ];

  const reasoning = [
    {
      heading: 'Target & YoY Feasibility',
      points: [
        `**Commercial Step-Up:** ${fmtLakh(target)} target${lastYear > 0 ? ` compares against ${fmtLakh(lastYear)} last year (${yoyPct! >= 0 ? `+${yoyPct}%` : `${yoyPct}%`})` : ' sets the monthly pace'}, balanced across 3 active streams.`,
        `**Offer Coverage:** Selected offers model **${fmtLakh(raw.offerRevenue)}** against **${fmtLakh(target)}** (${raw.offerGap > 1000 ? `${fmtLakh(raw.offerGap)} remaining to close via pack upgrades` : 'fully covered by active slots'}).`,
      ],
    },
    {
      heading: 'Funnel & Conversion Maths',
      points: [
        `**Acquisition Volume:** Hitting **${fmtLakh(streams.newClient)}** requires **${leads || 'planned'}** leads → **${trials || 'planned'}** completed trials → **${newMembers || 'planned'}** new members.`,
        `**Retention Pool:** **${renewalsNeeded || 'Target'}** renewals against **${expiriesDue || 'scheduled'}** expiries keeps renewal pressure within historical studio conversion.`,
      ],
    },
    {
      heading: 'Calendar & Sequencing',
      points: [
        `**Anchor Moment:** Timing acquisition around **${keyDateLabel}** concentrates ad & community energy into Weeks 1–2.`,
        `**Clean Close:** Holding comeback and final expiry closes for Weeks 3–4 protects full-price margin early in the month.`,
      ],
    },
  ];

  const risks = [
    `**Trial Drop-Off:** Unbooked leads stall Week-3 buyer pacing — enforce same-day WhatsApp booking and 48-hour post-trial desk calls.`,
    `**Discount Creep on Renewals:** Habitual promo-code requests erode AOV — substitute bonus classes or a 14-day freeze perk instead of % markdowns.`,
    raw.offerGap > 25000
      ? `**Offer Coverage Shortfall (${fmtLakh(raw.offerGap)}):** Current offer units trail target — upsell 25% of 1M renewers into 3M commitments.`
      : `**Late-Month Bottleneck:** Back-loaded closes risk slippage — lock 55% of ${fmtLakh(target)} by Day 18 through Week-1 expiry outreach.`,
  ];

  return {
    ...normalizeMonthFocus({
      theme,
      objective,
      strategy: strategyLines.join('\n'),
      focusPoints,
      splitRationale,
      actionPlan,
      reasoning,
      risks,
    }),
    mode: 'synthesised',
  };
}

// Drafts the month's focus, action plan and reasoning from the numbers and calendar the planner already has.
// The model writes words only; every figure shown to the user comes from the app, never from the model.
export async function generateMonthFocus(raw: FocusRequest): Promise<MonthFocus> {
  if (!process.env.OPENAI_API_KEY) {
    return synthesizeStructuredFocus(raw);
  }
  const schema = {
    type: 'object',
    additionalProperties: false,
    required: ['theme', 'objective', 'strategy', 'focusPoints', 'splitRationale', 'actionPlan', 'reasoning', 'risks'],
    properties: {
      theme: str('Short, memorable editorial month theme, 3–7 words, plain text without quotes or markdown.'),
      objective: str(
        'One crisp sentence (18–32 words): the commercial mandate this month delivers. Bold key ₹ figures with **₹X.XL**.',
      ),
      strategy: str(
        'How the team hits the number. 4-5 lines separated by "\\n". EVERY line MUST strictly follow "- **<2-4 Word Play Name>:** <Concrete action naming exact offers, key dates and ₹ lakh figures>".',
      ),
      focusPoints: {
        type: 'array',
        items: str(
          'One crisp team priority, max 20 words, formatted strictly as "**<Owner or Lever>:** <Imperative action>" with NO leading bullet or number.',
        ),
        description: '4-5 structured team focus points.',
      },
      splitRationale: str(
        'Exactly 3 lines separated by "\\n", one per stream, formatted strictly as "- **New clients (₹X.XL · Y%):** ...", "- **Renewals (₹X.XL · Y%):** ...", "- **Comeback (₹X.XL · Y%):** ..." tied to named offers and supplied figures only.',
      ),
      actionPlan: {
        type: 'array',
        description: '8-12 concrete actions spread across weeks 1-4 (5 if the month needs it).',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['week', 'owner', 'text'],
          properties: {
            week: { type: 'integer', description: 'Week of the month, 1-5.' },
            owner: str('Role that owns it: Studio manager, Sales associate, Marketing, Front desk, Trainer lead or Ops.'),
            text: str('The action, imperative voice, specific (offer, channel, cohort, date). Plain text without leading bullets.'),
          },
        },
      },
      reasoning: {
        type: 'array',
        description: '3-4 sections explaining why this target is reachable, funnel maths, stream coverage, and key-date timing.',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['heading', 'points'],
          properties: {
            heading: str('Short 2-5 word section heading, plain text.'),
            points: {
              type: 'array',
              items: str('One reasoning bullet formatted as "**<2-4 Word Lead>:** <Supporting evidence using supplied figures>".'),
            },
          },
        },
      },
      risks: {
        type: 'array',
        items: str('Formatted strictly as "**<Risk Title>:** <Concrete studio mitigation>" on one line.'),
        description: '3-4 commercial risks paired with mitigations.',
      },
    },
  };
  const response = await fetch(`${process.env.AI_PROVIDER_BASE_URL || 'https://api.openai.com/v1'}/responses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: process.env.OPENAI_API_KEY ? process.env.OPENAI_MODEL || 'gpt-4.1-mini' : 'gpt-4.1-mini',
      input: [
        {
          role: 'system',
          content:
            'You are the commercial director for Physique 57 India (luxury barre & Pilates studios in Mumbai and Bengaluru). Write an executive, tightly structured monthly commercial brief for one studio. Every field renders inside a structured card grid in the app UI, so strictly obey the "**Lead:** Detail" formatting rules in the JSON schema. Use ONLY the supplied key dates, offers, stream split, and funnel figures (format INR in lakh notation like ₹4.2L). Never invent offers, prices, discounts, or revenue figures. If offer forecast trails or exceeds target, call out the exact gap and plan for it. Sharp, warm, commercially disciplined.',
        },
        { role: 'user', content: JSON.stringify(raw) },
      ],
      text: { format: { type: 'json_schema', name: 'p57_month_plan', strict: true, schema } },
    }),
    signal: AbortSignal.timeout(60000),
  });
  if (!response.ok)
    throw Object.assign(new Error(`AI provider returned ${response.status}. Retry in a moment.`), { status: 502 });
  const payload = (await response.json()) as any;
  const text =
    payload.output_text ||
    payload.output?.flatMap((o: any) => o.content || []).find((c: any) => c.type === 'output_text')?.text;
  try {
    return { ...normalizeMonthFocus(focusSchema.parse(JSON.parse(text))), mode: 'ai' };
  } catch {
    throw Object.assign(new Error('AI output failed validation and was not saved. Retry the generation.'), {
      status: 422,
    });
  }
}
