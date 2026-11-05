import { describe, expect, it } from 'vitest';
import {
  buildExplainer,
  sceneOffsets,
  spokenMoney,
  displayMoney,
  type ExplainerInput,
} from '../src/lib/explainerScript';

/* The explainer's script is what the voice reads and the charts draw, so it has to be
   deterministic, complete for any month the plan can hold, and honest about the numbers
   it is given. These tests pin all three. */

const offer = (over: Partial<ExplainerInput['offers'][number]> = {}) => ({
  id: 1,
  name: 'Lift Like a Girl',
  slot: 'newcomer',
  slotLabel: 'New clients',
  headline: 'Strong is a season, not a look.',
  benefit: '1M unlimited at 15% off list, plus a free guest pass.',
  rationale: 'Women renew at 78.1%.',
  audience: 'Women who finished a challenge',
  conditions: 'One per client.',
  kpi: 'Trial-to-member rate among women',
  offerType: 'percentage',
  ticket: 17203,
  buyers: 29,
  revenue: 498887,
  discount: 15,
  validity: '1 Mar – 31 Mar',
  ...over,
});

const input = (over: Partial<ExplainerInput> = {}): ExplainerInput => ({
  studioName: 'Kemps Corner',
  month: 3,
  year: 2027,
  theme: 'Main Character Month',
  description: 'Women’s Day plus format exploration.',
  target: 3300000,
  lastYear: 2570000,
  streams: [
    { key: 'newClient', label: 'New clients', value: 1200000 },
    { key: 'renewal', label: 'Renewals', value: 1800000 },
    { key: 'reactivation', label: 'Comeback', value: 300000 },
  ],
  standardTrade: { revenue: 998431, shareOfMonth: 30.3 },
  leads: 400,
  trials: 204,
  buyers: 55,
  renewalsDue: 78,
  renewalCoverage: 0.94,
  offers: [offer()],
  offerRevenue: 498887,
  plan: [
    { label: 'W1', text: 'Launch the challenge' },
    { label: 'W2', text: 'Women’s Day takeover' },
  ],
  ...over,
});

describe('the explainer script', () => {
  it('opens on the month, walks the plan, and closes', () => {
    const script = buildExplainer(input());
    expect(script.scenes[0].kind).toBe('open');
    expect(script.scenes[script.scenes.length - 1].kind).toBe('close');
    const kinds = script.scenes.map(s => s.kind);
    // Every part of the argument, in the order a person would make it.
    expect(kinds).toEqual(['open', 'target', 'streams', 'funnel', 'coverage', 'offer', 'plan', 'close']);
  });

  it('is deterministic — the same month gives the same words', () => {
    const a = buildExplainer(input());
    const b = buildExplainer(input());
    expect(JSON.stringify(a.scenes)).toBe(JSON.stringify(b.scenes));
  });

  it('speaks every scene, and never speaks an empty line', () => {
    for (const scene of buildExplainer(input()).scenes) {
      expect(scene.narration.length).toBeGreaterThan(10);
      expect(scene.narration).not.toMatch(/\s{2,}/);
    }
  });

  it('gives every scene longer than a heartbeat to land', () => {
    for (const scene of buildExplainer(input()).scenes) {
      expect(scene.duration).toBeGreaterThanOrEqual(3200);
    }
  });

  it('lays scenes end to end without a gap', () => {
    const script = buildExplainer(input());
    const offsets = sceneOffsets(script);
    expect(offsets[0]).toBe(0);
    expect(offsets).toHaveLength(script.scenes.length);
    for (let i = 1; i < offsets.length; i += 1) expect(offsets[i]).toBe(offsets[i - 1] + script.scenes[i - 1].duration);
    expect(script.duration).toBeGreaterThan(20000);
  });

  it('narrates the month’s own figures rather than a template', () => {
    const script = buildExplainer(input());
    const words = script.scenes.map(s => s.narration).join(' ');
    expect(words).toContain('Kemps Corner');
    expect(words).toContain('Main Character Month');
    expect(words).toContain('33 lakh rupees'); // the target
    expect(words).toContain('29 buyers'); // the offer's volume
  });

  it('introduces every offer the month has picked, in slot order', () => {
    const script = buildExplainer(
      input({
        offers: [
          offer({ id: 2, name: 'Lock In Early', slot: 'renewal', slotLabel: 'Renewals' }),
          offer({ id: 1, name: 'Lift Like a Girl', slot: 'newcomer', slotLabel: 'New clients' }),
        ],
      }),
    );
    const names = script.scenes.filter(s => s.kind === 'offer').map(s => s.data.name);
    expect(names).toEqual(['Lift Like a Girl', 'Lock In Early']);
  });

  it('says so when a month has no offers instead of inventing one', () => {
    const script = buildExplainer(input({ offers: [], offerRevenue: 0 }));
    expect(script.scenes.some(s => s.kind === 'offer')).toBe(false);
    const coverage = script.scenes.find(s => s.kind === 'coverage')!;
    expect(coverage.narration).toMatch(/No offers are picked/);
    expect(coverage.data.share).toBe(0);
  });

  it('survives a month with nothing in it at all', () => {
    const script = buildExplainer(
      input({
        target: 0,
        lastYear: 0,
        streams: [],
        offers: [],
        plan: [],
        leads: 0,
        trials: 0,
        buyers: 0,
        renewalsDue: 0,
      }),
    );
    expect(script.scenes.length).toBeGreaterThan(2);
    for (const scene of script.scenes) expect(Number.isFinite(scene.duration)).toBe(true);
  });

  it('quotes the plan’s own full-price figure when it declares one', () => {
    const script = buildExplainer(input());
    const coverage = script.scenes.find(s => s.kind === 'coverage')!;
    expect(coverage.data.standard).toBe(998431);
    const streams = script.scenes.find(s => s.kind === 'streams')!;
    expect(streams.data.standard).toBe(998431);
    expect(streams.data.standardShare).toBeCloseTo(30.3);
  });

  it('falls back to the arithmetic when the plan declares nothing', () => {
    const script = buildExplainer(input({ standardTrade: null }));
    const coverage = script.scenes.find(s => s.kind === 'coverage')!;
    expect(coverage.data.standard).toBe(3300000 - 498887);
  });
});

describe('money, as it is said and as it is shown', () => {
  it('speaks in lakh and crore, and rounds nothing below a lakh', () => {
    expect(spokenMoney(3300000)).toBe('33 lakh rupees');
    expect(spokenMoney(42000000)).toBe('4.2 crore rupees');
    // A ticket is a real number, not a rounded one: ₹17,203 is not "seventeen thousand".
    expect(spokenMoney(17203)).toBe('17,203 rupees');
    expect(spokenMoney(0)).toBe('nothing');
  });

  it('shows the same figures in the app’s own shorthand', () => {
    expect(displayMoney(3300000)).toBe('₹33L');
    expect(displayMoney(42000000)).toBe('₹4.2 Cr');
  });
});
