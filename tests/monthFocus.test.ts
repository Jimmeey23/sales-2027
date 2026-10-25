import { describe, expect, it } from 'vitest';
import { focusSchema, generateMonthFocus, normalizeMonthFocus } from '../server/lib/monthFocus.js';

describe('monthFocus formatting & AI normalization', () => {
  it('normalizes raw LLM outputs into strict **Lead:** Body structure for #mw-sec-focus and #mw-sec-ai', () => {
    const raw = focusSchema.parse({
      theme: '  "### Founding 57 · Full-Value Commitment"  ',
      objective: '- Deliver ₹35.0L across Kemps Corner\nand lock 28 renewals at full list.',
      strategy: [
        '1. **Acquisition Anchor:** Close 22 newcomers on Newcomer 3M at ₹18,500',
        '### Renewal Lock: Work 42 expiring members from T-21',
        'Run hosted squad classes around 8 Mar International Women’s Day',
        '- • **Lapsed Comeback:** Convert 8 high-LTV alumni',
      ].join('\n'),
      focusPoints: [
        '1) **Front Desk:** Convert trials within 72 hours',
        '- Verify every duo buyer in Momence before checkout',
        '3. Trainer Handoff: Prescribe 3M commitment after class 2',
      ],
      splitRationale: [
        'New clients: ₹17.5L (50%) carried by Newcomer 3M',
        '- **Renewals (₹12.5L · 36%):** Anchored on T-14 outreach',
        'Comeback stream covers ₹5.0L from lapsed alumni',
      ].join('\n'),
      actionPlan: [
        { week: 1, owner: '  **Studio Manager** ', text: '- Launch WhatsApp pre-registration list' },
        { week: 2, owner: 'Front desk', text: '1. Audit trial follow-up SLA daily' },
        { week: 3, owner: '', text: 'Host mid-month community class' },
        { week: 4, owner: 'Trainers', text: 'Close month-end renewal pipeline' },
      ],
      reasoning: [
        {
          heading: '1. Target & YoY bridge',
          points: [
            '- Commercial Mandate: ₹35.0L represents +18% vs ₹29.6L LY',
            'Offer stack carries ₹36.2L (+₹1.2L buffer)',
          ],
        },
        {
          heading: '### Funnel math',
          points: ['1) **Acquisition:** 95 leads → 44 trials → 22 members', '2) **Retention:** 28 of 42 expiries'],
        },
      ],
      risks: [
        '- Discount drift — Hold zero promo codes and add 7-day bonus validity instead',
        'Late renewal outreach: Trigger T-21 manager calls for top 15 expiries',
      ],
    });

    const out = normalizeMonthFocus(raw);

    // Theme stripped of quotes and markdown headings
    expect(out.theme).toBe('Founding 57 · Full-Value Commitment');
    // Single-line clean objective
    expect(out.objective).not.toContain('\n');
    expect(out.objective.startsWith('-')).toBe(false);

    // Every strategy line starts with "- **...:** "
    const strategyLines = out.strategy.split('\n');
    expect(strategyLines.length).toBe(4);
    for (const line of strategyLines) {
      expect(line).toMatch(/^- \*\*[^*]+:\*\* .+/);
    }

    // Every focus point starts with "**...:** " without stray numbering/bullets
    expect(out.focusPoints.length).toBe(3);
    for (const fp of out.focusPoints) {
      expect(fp).toMatch(/^\*\*[^*]+:\*\* .+/);
      expect(fp).not.toMatch(/^\d+[.)]/);
    }

    // Every split rationale line starts with "- **...:** "
    const splitLines = out.splitRationale.split('\n');
    expect(splitLines.length).toBe(3);
    for (const sl of splitLines) {
      expect(sl).toMatch(/^- \*\*[^*]+:\*\* .+/);
    }

    // Reasoning headings & points normalized
    expect(out.reasoning[0].heading).toBe('Target & YoY bridge');
    expect(out.reasoning[1].heading).toBe('Funnel math');
    for (const block of out.reasoning) {
      for (const pt of block.points) {
        expect(pt).toMatch(/^\*\*[^*]+:\*\* .+/);
      }
    }

    // Risks formatted as "**Risk:** Mitigation"
    for (const risk of out.risks) {
      expect(risk).toMatch(/^\*\*[^*]+:\*\* .+/);
    }

    // Action owners defaulted & cleaned
    expect(out.actionPlan[0].owner).toBe('Studio Manager');
    expect(out.actionPlan[2].owner).toBe('Studio Manager');
    expect(out.actionPlan[0].text.startsWith('-')).toBe(false);
  });

  it('synthesises a complete data-grounded structured focus when OPENAI_API_KEY is absent', async () => {
    const prevKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    try {
      const result = await generateMonthFocus({
        studioName: 'Kwality House, Kemps Corner',
        monthName: 'April',
        year: 2027,
        currentTheme: 'Founding 57 Anniversary',
        target: 3500000,
        lastYear: 2950000,
        offerRevenue: 3620000,
        offerGap: -120000,
        keyDates: ['7 Apr · World Health Day', '18 Apr · Anniversary Weekend'],
        offers: ['Founding 57 Annual', 'Renewal Continuity 3M', 'Alumni Comeback 10-Pack'],
        offerDetails: [
          {
            name: 'Founding 57 Annual',
            stream: 'New client',
            benefit: 'Numbered annual membership at full price with studio perks',
            audience: 'High-intent newcomers',
            price: 95000,
            units: 18,
            revenue: 1710000,
          },
          {
            name: 'Renewal Continuity 3M',
            stream: 'Renewal',
            benefit: 'Bonus 10-day validity at list price',
            audience: 'Expiring 1M and 3M members',
            price: 42000,
            units: 32,
            revenue: 1344000,
          },
          {
            name: 'Alumni Comeback 10-Pack',
            stream: 'Reactivation',
            benefit: 'Complimentary posture consult + 10 classes',
            audience: 'Lapsed members >60 days',
            price: 23583,
            units: 24,
            revenue: 566000,
          },
        ],
        streams: { newClient: 1700000, renewal: 1300000, reactivation: 500000 },
        streamCoverage: { newClient: 1710000, renewal: 1344000, reactivation: 566000 },
        funnel: {
          leads: 112,
          trials: 52,
          newMembers: 22,
          renewalsNeeded: 32,
          expiriesDue: 48,
          reactivationsNeeded: 24,
          lapsedPool: 210,
        },
        steer: 'Zero discount codes; lead with numbered annual prestige',
      });

      expect(result.mode).toBe('synthesised');
      expect(result.theme).toContain('Founding 57');
      expect(result.objective).toContain('₹35.0L');
      expect(result.strategy).toContain('Leadership Steer');
      expect(result.strategy).toContain('Zero discount codes');
      expect(result.strategy.split('\n').every(l => /^- \*\*[^*]+:\*\* .+/.test(l))).toBe(true);
      expect(result.focusPoints.length).toBeGreaterThanOrEqual(4);
      expect(result.focusPoints.every(fp => /^\*\*[^*]+:\*\* .+/.test(fp))).toBe(true);
      expect(result.splitRationale.split('\n')).toHaveLength(3);
      expect(result.reasoning.length).toBeGreaterThanOrEqual(3);
      expect(result.risks.length).toBeGreaterThanOrEqual(3);
      expect(result.actionPlan.length).toBeGreaterThanOrEqual(6);
    } finally {
      if (prevKey !== undefined) process.env.OPENAI_API_KEY = prevKey;
    }
  });
});
