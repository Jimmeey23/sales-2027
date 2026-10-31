import { describe, expect, it } from 'vitest';
import { parseRupees, planPricing } from '../src/lib/offerPricing';

const offer = (fields: Record<string, string[]>) => ({ provenance: { fields } });

describe('offer pricing read from the plan', () => {
  it('reads Indian short-form amounts', () => {
    expect(parseRupees('₹17.2k')).toBe(17200);
    expect(parseRupees('₹2k')).toBe(2000);
    expect(parseRupees('₹1,877')).toBe(1877);
    expect(parseRupees('₹1.5L')).toBe(150000);
    expect(parseRupees('no amount')).toBeNull();
  });

  it('separates the ticket from the list price it is measured against', () => {
    const pricing = planPricing(
      offer({
        'You pay': ['1M unlimited: ₹17.2k (15% off the ₹20.2k list price).'],
        'Effective discount': ['15.0% effective = 15% cash. Guest passes, consults and freezes are valued at zero.'],
      }),
    );
    expect(pricing.price).toBe(17200);
    expect(pricing.list).toBe(20200);
    expect(pricing.cashPct).toBe(15);
    expect(pricing.perkPct).toBeNull();
  });

  it('never mistakes an intro fee for a list price, and marks it as credited', () => {
    const pricing = planPricing(
      offer({
        'You pay': [
          'Intro: ₹2k for the 7-day unlimited intro, credited in full against a qualifying purchase within 72 hours. Then any pack or membership at 15% off list (the standing new-client perk).',
        ],
        'Effective discount': ['15.0% effective = 15% cash.'],
      }),
    );
    expect(pricing.price).toBe(2000);
    expect(pricing.list).toBeNull();
    expect(pricing.credited).toBe(true);
  });

  it('reads a perk-only discount as perk value, not cash', () => {
    const pricing = planPricing(
      offer({
        'You pay': ["Renewal at your product's list price (no % off)."],
        'Effective discount': ['7.0% effective = 0% cash + 7.0% in extras (classes, days, privates, retail).'],
      }),
    );
    expect(pricing.price).toBeNull();
    expect(pricing.list).toBeNull();
    expect(pricing.cashPct).toBe(0);
    expect(pricing.perkPct).toBe(7);
    expect(pricing.effectivePct).toBe(7);
  });

  it('derives the ticket when only the list price is stated', () => {
    const pricing = planPricing(
      offer({
        'You pay': ['3-month unlimited at 15% off the ₹45,000 list price.'],
        'Effective discount': ['15.0% effective = 15% cash.'],
      }),
    );
    expect(pricing.list).toBe(45000);
    expect(pricing.price).toBe(38250);
  });

  it('returns nulls rather than guessing when the plan states no price', () => {
    const pricing = planPricing({});
    expect(pricing).toMatchObject({ price: null, list: null, cashPct: null, perkPct: null });
  });
});
