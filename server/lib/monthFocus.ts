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

const focusSchema = z.object({
  theme: z.string().trim().min(3).max(120),
  objective: z.string().trim().min(3).max(280),
  strategy: z.string().trim().min(20).max(2400),
  focusPoints: z.array(z.string().trim().min(3).max(220)).min(3).max(7),
  splitRationale: z.string().trim().max(900),
  actionPlan: z
    .array(z.object({ week: z.number().int().min(1).max(5), owner: z.string().trim().max(60), text: z.string().trim().min(3).max(260) }))
    .min(4)
    .max(16),
  reasoning: z
    .array(z.object({ heading: z.string().trim().min(2).max(80), points: z.array(z.string().trim().min(3).max(300)).min(1).max(6) }))
    .min(2)
    .max(6),
  risks: z.array(z.string().trim().min(3).max(260)).max(6),
});
export type MonthFocus = z.infer<typeof focusSchema>;

const str = (description: string) => ({ type: 'string', description });

// Drafts the month's focus, action plan and reasoning from the numbers and calendar the planner already has.
// The model writes words only; every figure shown to the user comes from the app, never from the model.
export async function generateMonthFocus(raw: FocusRequest): Promise<MonthFocus> {
  if (!process.env.OPENAI_API_KEY)
    throw Object.assign(
      new Error('AI provider is not configured. Set OPENAI_API_KEY on the server to generate the month focus.'),
      { status: 503, code: 'AI_NOT_CONFIGURED' },
    );
  const schema = {
    type: 'object',
    additionalProperties: false,
    required: ['theme', 'objective', 'strategy', 'focusPoints', 'splitRationale', 'actionPlan', 'reasoning', 'risks'],
    properties: {
      theme: str('Short, memorable month theme, max 8 words.'),
      objective: str('One sentence: the commercial job this month does.'),
      strategy: str(
        'How the team hits the number. 4-6 lines separated by newlines, each starting with "- ". Reference specific offers and key dates by name.',
      ),
      focusPoints: { type: 'array', items: str('One crisp, actionable focus point, max 18 words.'), description: '4-6 focus points.' },
      splitRationale: str(
        'Why the revenue split across new clients, renewals and comeback looks the way it does, tied to which offers carry each stream. Use only the supplied figures.',
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
            text: str('The action, imperative voice, specific (offer, channel, cohort, date).'),
          },
        },
      },
      reasoning: {
        type: 'array',
        description: '3-5 sections explaining the logic: why this target is reachable, the funnel maths, where each stream comes from, timing against key dates.',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['heading', 'points'],
          properties: { heading: str('Short section heading.'), points: { type: 'array', items: str('One reasoning bullet.') } },
        },
      },
      risks: { type: 'array', items: str('A risk and its mitigation, one line.'), description: '2-4 risks.' },
    },
  };
  const response = await fetch(`${process.env.AI_PROVIDER_BASE_URL || 'https://api.openai.com/v1'}/responses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      input: [
        {
          role: 'system',
          content:
            'You are the commercial lead for Physique 57 India (premium barre studios in Mumbai and Bengaluru). Write the monthly plan for one studio: a witty but commercially clear theme, a one-line objective, a bulleted strategy, focus points, the reasoning behind the revenue split, a week-by-week action plan and the logic for reaching the target. Use the supplied key dates, offers, stream split and funnel numbers; quote figures only as given (amounts are in INR, use lakh notation like ₹4.2L). Never invent offers, prices, discounts or revenue figures. If offer revenue is short of or well above target, say so and plan for it. Warm, energetic, confident. Return only structured JSON.',
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
    return focusSchema.parse(JSON.parse(text));
  } catch {
    throw Object.assign(new Error('AI output failed validation and was not saved. Retry the generation.'), {
      status: 422,
    });
  }
}
