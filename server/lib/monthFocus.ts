import { z } from 'zod';

export const focusRequestSchema = z.object({
  studioName: z.string().max(120),
  monthName: z.string().max(20),
  year: z.number().int(),
  currentTheme: z.string().max(200).optional().default(''),
  target: z.number().nonnegative().optional().default(0),
  lastYear: z.number().nonnegative().optional().default(0),
  offerGap: z.number().optional().default(0),
  keyDates: z.array(z.string().max(120)).max(12).optional().default([]),
  offers: z.array(z.string().max(160)).max(12).optional().default([]),
  steer: z.string().max(400).optional().default(''),
});
export type FocusRequest = z.infer<typeof focusRequestSchema>;

const focusSchema = z.object({
  theme: z.string().trim().min(3).max(120),
  objective: z.string().trim().min(3).max(280),
  strategy: z.string().trim().min(20).max(1800),
});

// Drafts the month's theme, objective and strategy from the numbers and calendar the planner already has.
// The model writes words only; every figure shown to the user comes from the app, never from the model.
export async function generateMonthFocus(raw: FocusRequest) {
  if (!process.env.OPENAI_API_KEY)
    throw Object.assign(
      new Error('AI provider is not configured. Set OPENAI_API_KEY on the server to generate the month focus.'),
      { status: 503, code: 'AI_NOT_CONFIGURED' },
    );
  const schema = {
    type: 'object',
    additionalProperties: false,
    required: ['theme', 'objective', 'strategy'],
    properties: {
      theme: { type: 'string', description: 'Short, memorable month theme, max 8 words.' },
      objective: { type: 'string', description: 'One sentence: the commercial job this month does.' },
      strategy: {
        type: 'string',
        description: 'How the team hits the number: 3-5 short sentences or lines, week by week where useful.',
      },
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
            "You are the commercial lead for Physique 57 India (premium barre studios in Mumbai and Bengaluru). Write the monthly focus for one studio: a witty but commercially clear theme, a one-line objective and a practical strategy for the sales team. Use the supplied key dates and offers; do not invent offers, prices, discounts or revenue figures. Warm, energetic, confident. Return only structured JSON.",
        },
        { role: 'user', content: JSON.stringify(raw) },
      ],
      text: { format: { type: 'json_schema', name: 'p57_month_focus', strict: true, schema } },
    }),
    signal: AbortSignal.timeout(40000),
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
