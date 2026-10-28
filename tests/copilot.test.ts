import { describe, expect, it } from 'vitest';
import { answerQuestion, defaultMonth, engineCapability } from '../server/lib/copilot/engine.js';
import { classify } from '../server/lib/copilot/intents.js';
import {
  monthKey,
  monthLabel,
  monthRange,
  parseMoney,
  parseOfferKind,
  parsePercent,
  parseTime,
  timeToMonths,
} from '../server/lib/copilot/text.js';

describe('copilot text parsing', () => {
  it('reads Indian money formats', () => {
    expect(parseMoney('₹4.5L')).toBe(450_000);
    expect(parseMoney('45 lakh')).toBe(4_500_000);
    expect(parseMoney('1.2Cr')).toBe(12_000_000);
    expect(parseMoney('72k')).toBe(72_000);
    expect(parseMoney('no money here')).toBeNull();
  });
  it('converts percentages to fractions', () => {
    expect(parsePercent('at 60% conversion')).toBeCloseTo(0.6);
    expect(parsePercent('5 per cent')).toBeCloseTo(0.05);
    expect(parsePercent('nothing')).toBeNull();
  });
  it('resolves months, ranges, quarters and relative phrases', () => {
    expect(parseTime('April')).toMatchObject({ kind: 'month', month: { year: 2027, month: 4 } });
    expect(parseTime('2027-06')).toMatchObject({ kind: 'month', month: { year: 2027, month: 6 } });
    expect(parseTime('Q2')).toMatchObject({ kind: 'quarter', quarter: 2 });
    expect(timeToMonths(parseTime('Q2'), { year: 2027, month: 1 })).toHaveLength(3);
    expect(monthRange('2027-01', '2027-03')).toEqual(['2027-01', '2027-02', '2027-03']);
    expect(monthKey(2027, 4)).toBe('2027-04');
    expect(monthLabel(2027, 4)).toContain('April');
  });
  it('maps offer language onto policy kinds', () => {
    expect(parseOfferKind('three classes for the price of two')?.slug).toBe('newcomer_3_for_2');
    expect(parseOfferKind('2-for-1 newcomer')?.slug).toBe('newcomer_2_for_1');
    expect(parseOfferKind('win back lapsed members')?.slug).toBe('lapsed_return');
    expect(parseOfferKind('10 class pack')?.count).toBe(10);
  });
});

describe('copilot intent routing', () => {
  const cases: [string, string][] = [
    ['how do we hit the april target?', 'month_gap'],
    ['what is the 2027 outlook', 'year_outlook'],
    ['which months look hardest', 'year_outlook'],
    ['compare the studios', 'compare_studios'],
    ['where is the funnel leaking', 'funnel'],
    ['which lead sources convert best', 'channels'],
    ['renewals due at 60% conversion in june', 'renewals'],
    ['break the member base into segments', 'segments'],
    ['what carries revenue', 'products'],
    ['how is attendance at kemps corner', 'attendance'],
    ['what offers are planned for q2', 'offer_portfolio'],
    ['build me a 3 for 2 offer', 'offer_build'],
    ['compare 2 for 1 vs 3 for 2', 'offer_compare'],
    ['what if we raise prices 5% and lose 3% of volume', 'what_if'],
    ['show me the price ladder', 'price_ladder'],
    ['what is the plan for April', 'plan_summary'],
    ['key days in october', 'key_days'],
    ['open the offer bank', 'navigate'],
    ['hi', 'help'],
  ];
  it.each(cases)('%s → %s', (question, intent) => {
    expect(classify(question).intent).toBe(intent);
  });
  it('extracts studio and month slots together', () => {
    const result = classify('Show June renewals at Bandra');
    expect(result.slots.studioHint).toBe('bandra');
    expect(result.slots.time).toMatchObject({ kind: 'month', month: { month: 6 } });
  });
  it('admits when it cannot classify rather than guessing', () => {
    expect(classify('zzzz qqqq').intent).toBe('unknown');
  });
});

describe('copilot answers are grounded and typed', () => {
  const questions = [
    'how do we hit the april target?',
    'what is the 2027 outlook',
    'compare the studios',
    'where is the funnel leaking',
    'which lead sources convert best',
    'renewals due at 60% conversion',
    'break the member base into segments',
    'what carries revenue',
    'how is attendance',
    'what offers are planned for q2',
    'build me a 3 for 2 offer at Kemps Corner',
    'what if we raise prices 5% and lose 3% of volume in April',
    'show me the price ladder for Bandra',
    'what is the plan for April',
    'key days in october',
  ];
  it('returns written, sourced and carded answers for every intent', () => {
    for (const question of questions) {
      const { answer, meta } = answerQuestion({ message: question });
      expect(answer.content.length, question).toBeGreaterThan(40);
      expect(answer.mode).toBe('deterministic');
      expect(answer.attachments.intent.id, question).toBe(meta.intent);
      expect(answer.attachments.cards.length, question).toBeGreaterThan(0);
      expect(answer.attachments.sources.length, question).toBeGreaterThan(0);
      expect(answer.attachments.calculation.length, question).toBeGreaterThan(0);
      expect(meta.timings.total).toBeLessThan(4000);
      // No placeholder values may ever reach a user.
      for (const leak of ['NaN', 'undefined', 'Infinity', '[object']) {
        expect(answer.content, `${question} leaked ${leak}`).not.toContain(leak);
      }
    }
  });
  it('scopes to the studio named in the question', () => {
    const { answer } = answerQuestion({ message: 'how is attendance at kemps corner' });
    expect(answer.attachments.scope.studio.toLowerCase()).toContain('kemps');
    expect(answer.content).toContain('Kemps');
  });
  it('reuses cached data for a repeated question', () => {
    answerQuestion({ message: 'compare the studios' });
    const { meta } = answerQuestion({ message: 'compare the studios' });
    expect(meta.cache.hits).toBeGreaterThan(0);
    expect(meta.timings.total).toBeLessThan(500);
  });
  it('labels scenarios as scenarios and never as forecasts', () => {
    const { answer } = answerQuestion({ message: 'what if we raise prices 5% and lose 3% of volume in April' });
    expect(answer.content.toLowerCase()).toContain('scenario');
    expect(answer.attachments.cards.some((card: any) => card.kind === 'note')).toBe(true);
  });
  it('prices offers from the product master and names the policy cap', () => {
    const { answer } = answerQuestion({ message: 'build a 3 for 2 offer at Kemps Corner' });
    expect(answer.attachments.type).toBe('offer_concept');
    expect(answer.content).toMatch(/cap that applies to this mechanism/);
    expect(answer.saveOffer?.name).toBeTruthy();
    expect(answer.saveOffer?.studioId).toBeTruthy();
  });
  it('says which studio it assumed instead of pretending one was named', () => {
    const { answer } = answerQuestion({ message: 'build a 2 for 1 offer at Atlantis' });
    expect(answer.attachments.scope.assumed).toBe(true);
    expect(answer.content).toMatch(/because no studio was named/);
  });
  it('explains the previous calculation when asked why', () => {
    const first = answerQuestion({ message: 'how do we hit the april target?' });
    const history = [{ role: 'user', content: 'gap?' }, { role: 'assistant', attachments: first.answer.attachments }];
    const { answer } = answerQuestion({ message: 'why?', history });
    expect(answer.attachments.type).toBe('explain');
    expect(answer.content).toMatch(/formula|→/);
    expect(answer.attachments.cards.length).toBeGreaterThan(0);
  });
  it('offers help and admits ignorance without inventing an answer', () => {
    const help = answerQuestion({ message: 'what can you do' });
    expect(help.answer.attachments.type).toBe('help');
    expect(help.answer.content).toContain('imported data');
    const unknown = answerQuestion({ message: 'zzzz qqqq' });
    expect(unknown.answer.attachments.type).toBe('unrecognised');
    expect(unknown.answer.attachments.cards.length).toBe(0);
    expect(unknown.answer.attachments.sources.length).toBe(0);
  });
});

describe('copilot engine capability', () => {
  it('publishes intents, tools and block types', () => {
    const capability = engineCapability();
    expect(capability.intents.length).toBeGreaterThanOrEqual(19);
    expect(capability.tools).toContain('month_gap');
    expect(capability.answerBlocks).toContain('bars');
    expect(capability.supports.sources).toBe(true);
    expect(capability.cache).toHaveProperty('hitRate');
  });
  it('defaults to the first planning month when no observed month precedes it', () => {
    expect(defaultMonth(2027).year).toBe(2027);
    expect(defaultMonth(2027).month).toBeGreaterThanOrEqual(1);
  });
});
