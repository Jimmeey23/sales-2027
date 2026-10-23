import { describe, expect, it } from 'vitest';
import { aiConceptSchema } from '../server/lib/offers';
import { canonicalStudio } from '../server/lib/studios';
import { money, parseDate, daysBetween } from '../server/lib/format';

describe('AI output validation', () => {
  it('rejects output with missing required fields', () => {
    expect(() => aiConceptSchema.parse({ offers: [{ name: 'Incomplete AI answer' }] })).toThrow();
  });
  it('rejects fewer than three concepts and invalid mechanisms', () => {
    expect(() => aiConceptSchema.parse({ offers: [] })).toThrow();
    const concept = { name: 'Valid name', headline: 'Valid headline', customerCopy: 'A sufficiently clear customer description.', rationale: 'A sufficiently clear internal rationale.', mechanism: 'free_everything', discountPercent: 0, fixedDiscount: 0, bonusClasses: 0, benefit: 'Benefit', cta: 'Book now', risks: [] };
    expect(() => aiConceptSchema.parse({ offers: [concept, concept, concept] })).toThrow();
  });
});

describe('source normalisation and metric integrity helpers', () => {
  it('normalises known studio aliases without hardcoding a studio count', () => {
    expect(canonicalStudio('Kwality House, Kemps Corner')).toBe('Kemps Corner');
    expect(canonicalStudio('Kenkere House, Bengaluru')).toBe('Kenkere House');
    expect(canonicalStudio('pop up')).toBe('Pop-up');
    expect(canonicalStudio('Unheard location')).toBeNull();
  });
  it('parses currency, Indian dates and date gaps consistently', () => {
    expect(money('₹1,23,456.50')).toBe(123456.5);
    expect(parseDate('15/06/2026 07:05:49')).toBe('2026-06-15');
    expect(daysBetween('2026-01-01', '2026-03-01')).toBe(59);
  });
  it('preserves negative revenue adjustments as numeric values', () => {
    expect(money('-1,250.00')).toBe(-1250);
  });
});
