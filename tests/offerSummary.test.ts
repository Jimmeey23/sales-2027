import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { offerDescription, offerSummary, offerHighlights } from '../src/lib/offerSummary';

/* An offer's description has one job: say what is being sold, what the client gets, and what
   the offer is for — in words a studio manager can repeat to a client. These tests hold the
   sentence to that: membership first, benefit second, purpose last, and short enough to read. */

const sentenceFor = (offer: any) => offerSummary(offer).sentence;

describe('the description', () => {
  it('reads as membership, benefit, purpose', () => {
    const summary = offerSummary({
      name: 'Committed Conversion',
      benefit: '3M unlimited: ₹49.2k (20% off the ₹61.5k list price).',
      objective: 'acquisition',
      provenance: { fields: { 'You pay': '3M unlimited: ₹49.2k (20% off the ₹61.5k list price).' } },
    });
    expect(summary.membership).toBe('3-month unlimited');
    expect(summary.benefit).toBe('at 20% off the list price');
    expect(summary.purpose).toBe('winning new clients');
    expect(summary.sentence).toBe('3-month unlimited at 20% off the list price — aimed at winning new clients.');
  });

  it('names the purpose of each stream in the studio’s own words', () => {
    const of = (objective: string) => offerSummary({ benefit: '12-class pack (10% off list).', objective }).purpose;
    expect(of('acquisition')).toBe('winning new clients');
    expect(of('reactivation')).toBe('bringing lapsed clients back');
    expect(of('retention')).toBe('renewing members before they lapse');
    expect(of('annual_membership')).toBe('selling annual plans before the year starts');
    expect(of('revenue_gap')).toBe('closing the month’s revenue gap');
  });

  it('falls back to the plan slot when the offer has no objective', () => {
    expect(offerSummary({ benefit: '1M unlimited (15% off list).', plan_slot: 'lapsed' }).purpose).toBe(
      'bringing lapsed clients back',
    );
    expect(offerSummary({ benefit: '1M unlimited (15% off list).', plan_slot: 'newcomer' }).purpose).toBe(
      'winning new clients',
    );
  });

  it('reads the membership from a credited intro instead of calling it a discount', () => {
    const sentence = sentenceFor({
      benefit: 'Intro: ₹2k for the 7-day unlimited intro, credited in full against a qualifying purchase.',
      objective: 'acquisition',
    });
    expect(sentence).toContain('7-day unlimited intro');
    expect(sentence).toContain('fee credited back');
  });

  it('says a renewal is the member’s own product at list price, plus the extras', () => {
    const sentence = sentenceFor({
      benefit: "Renewal at your product's list price (no % off).",
      objective: 'retention',
      effective_discount: 7,
      provenance: {
        fields: {
          'You pay': "Renewal at your product's list price (no % off).",
          'Effective discount': '7.0% effective = 0% cash + 7.0% in extras',
          'You get': ['• +7 days on 3M, +14 days on 6M'],
        },
      },
    });
    expect(sentence).toBe(
      'Your current membership at list price, with 7% back in extras, 7 extra days — aimed at renewing members before they lapse.',
    );
  });

  it('does not call the product a bonus (21 days unlimited is what it is, not what it adds)', () => {
    const sentence = sentenceFor({
      benefit: 'Kickstart 21 cohort: ₹10k (list price), 21 days unlimited.',
      objective: 'acquisition',
    });
    expect(sentence).not.toMatch(/21 extra days/);
  });

  it('reads a cash cut the plan states in words rather than in the split', () => {
    const sentence = sentenceFor({
      benefit: '3M at the standing 15% + stacked: 2 extra freezes.',
      objective: 'acquisition',
    });
    expect(sentence).toContain('3-month unlimited at 15% off the list price');
    expect(sentence).toContain('2 extra freezes');
  });
});

describe('every offer in the plan', () => {
  const plan: any[] = JSON.parse(fs.readFileSync('server/data/approved-plan-2027.json', 'utf8'));

  it('describes itself in one readable sentence', () => {
    const problems: string[] = [];
    for (const month of plan) {
      for (const offer of month.offers) {
        const summary = offerSummary(offer);
        const text = summary.sentence;
        if (!/ — aimed at .+\.$/.test(text)) problems.push(`${offer.name}: ${text}`);
        if (text.length > 165) problems.push(`${offer.name} is too long (${text.length}): ${text}`);
        if (!summary.membership) problems.push(`${offer.name}: no membership`);
        if (/^(A|The) (membership|studio experience)\b/.test(text))
          problems.push(`${offer.name} never names a product: ${text}`);
      }
    }
    expect(problems).toEqual([]);
  });

  it('turns the offer slot into a purpose when there is no objective', () => {
    for (const month of plan)
      for (const offer of month.offers) {
        const { purpose } = offerSummary(offer);
        expect(purpose).toMatch(/clients|members|plans|revenue|slots|anniversary|purchase/);
      }
  });
});

describe('offerDescription', () => {
  it('is the sentence, for callers that only need the line', () => {
    const offer = { benefit: '1M unlimited (15% off list).', objective: 'reactivation' };
    expect(offerDescription(offer)).toBe(offerSummary(offer).sentence);
  });
});

describe('highlighted offer details', () => {
  it('leads with the exact written price, not the marketing headline or the average ticket', () => {
    const highlights = offerHighlights({
      headline: 'Seven days. Then decide.',
      expected_asp: 22778,
      benefit: 'A less detailed benefit',
      provenance: {
        fields: {
          'You pay': ['₹2,000 for the 7-day unlimited intro; credited in full on a purchase within 72 hours.'],
          'You get': ['• Unlimited classes for 7 days', '• Standing 15% first-purchase perk'],
        },
      },
    });
    expect(highlights.terms).toBe(
      '₹2,000 for the 7-day unlimited intro; credited in full on a purchase within 72 hours.',
    );
    expect(highlights.inclusions).toEqual(['Unlimited classes for 7 days', 'Standing 15% first-purchase perk']);
    expect(highlights.terms).not.toContain('22,778');
  });
  it('keeps long conditions and all inclusions visible without truncating them', () => {
    const terms =
      `1-month unlimited at the campaign price. ${'A qualifying purchase must follow the written campaign rules. '.repeat(8)}`.trim();
    const inclusions = Array.from({ length: 7 }, (_, i) => `Included benefit ${i + 1}`);
    const offer = { benefit: terms, provenance: { fields: { 'You get': inclusions } } };
    const before = structuredClone(offer);
    expect(offerHighlights(offer)).toEqual({ terms, inclusions });
    expect(offer).toEqual(before);
  });
  it('supports older benefits, case-insensitive fields and multiline perks without repeating exact duplicates', () => {
    expect(offerHighlights({ benefit: '3-month unlimited at 15% off.' }).terms).toBe('3-month unlimited at 15% off.');
    expect(
      offerHighlights({
        fields: { 'you pay': 'At list price', 'You get': '• Seven extra days\n• Seven extra days\n• Two freezes' },
      }),
    ).toEqual({ terms: 'At list price', inclusions: ['Seven extra days', 'Two freezes'] });
  });
  it('uses structured mechanics or a derived description when explicit terms are missing', () => {
    expect(offerHighlights({ mechanics: { summary: 'Buy 3 classes for the price of 2.' } }).terms).toBe(
      'Buy 3 classes for the price of 2.',
    );
    expect(offerHighlights({}).terms).toBeTruthy();
    expect(offerHighlights({ benefit: { unknown: 'value' } }).terms).not.toContain('[object Object]');
  });
});
