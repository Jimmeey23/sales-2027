import { describe, expect, it } from 'vitest';
import {
  groupOffersByCategory,
  offerCategory,
  OFFER_CATEGORIES,
  OFFER_CATEGORY_LABELS,
} from '../src/lib/offerCategory.js';

describe('offer lifecycle categories', () => {
  it('uses the requested labels and order everywhere', () => {
    expect(OFFER_CATEGORIES.map(category => category.label)).toEqual(['New', 'Winback', 'Renewal', 'Other']);
    expect(OFFER_CATEGORY_LABELS).toEqual({ new: 'New', winback: 'Winback', renewal: 'Renewal', other: 'Other' });
  });

  it.each([
    ['newcomer', 'new'],
    ['new', 'new'],
    ['New clients', 'new'],
    [' NEW CLIENT ', 'new'],
    ['lapsed', 'winback'],
    ['winback', 'winback'],
    ['Win-back', 'winback'],
    ['reactivation', 'winback'],
    ['renewal', 'renewal'],
    ['Renewals', 'renewal'],
    ['retention', 'renewal'],
    ['other', 'other'],
    ['privates', 'other'],
    ['bookout', 'other'],
    ['upgrade', 'other'],
  ] as const)('groups the assigned %s slot under %s', (plan_slot, expected) => {
    expect(offerCategory({ plan_slot, objective: 'revenue' })).toBe(expected);
  });

  it.each([
    ['acquisition', 'new'],
    ['trial_conversion', 'new'],
    ['new_client', 'new'],
    ['referral', 'new'],
    ['lead_source', 'new'],
    [' Trial Conversion ', 'new'],
    ['reactivation', 'winback'],
    ['win-back', 'winback'],
    ['retention_winback', 'winback'],
    ['retention', 'renewal'],
    ['annual_membership', 'renewal'],
    ['renewal', 'renewal'],
    ['additional_purchase', 'other'],
    ['aov', 'other'],
    ['product_sales', 'other'],
    ['revenue_gap', 'other'],
    ['anniversary', 'other'],
    ['weak_month', 'other'],
    ['historical_analysis', 'other'],
    ['revenue', 'other'],
  ] as const)('falls back to the %s objective as %s when no slot is assigned', (objective, expected) => {
    expect(offerCategory({ plan_slot: null, objective })).toBe(expected);
  });

  it('uses the saved slot before a conflicting objective', () => {
    expect(offerCategory({ plan_slot: 'lapsed', objective: 'acquisition' })).toBe('winback');
    expect(offerCategory({ plan_slot: 'newcomer', objective: 'retention' })).toBe('new');
    expect(offerCategory({ plan_slot: 'renewal', objective: 'additional_purchase' })).toBe('renewal');
    expect(offerCategory({ plan_slot: 'other', objective: 'acquisition' })).toBe('other');
  });

  it('uses the month selection before the bank offer slot', () => {
    const bankOffer = { plan_slot: 'renewal', objective: 'retention' };
    expect(offerCategory(bankOffer, 'newcomer')).toBe('new');
    expect(offerCategory(bankOffer, 'lapsed')).toBe('winback');
    expect(offerCategory(bankOffer)).toBe('renewal');
    expect(bankOffer.plan_slot).toBe('renewal');
  });

  it('supports the camel-case import field and blank legacy slots', () => {
    expect(offerCategory({ planSlot: 'lapsed', objective: 'acquisition' })).toBe('winback');
    expect(offerCategory({ plan_slot: ' ', planSlot: 'newcomer', objective: 'retention' })).toBe('new');
    expect(offerCategory({ plan_slot: '', objective: 'reactivation' })).toBe('winback');
  });

  it('keeps explicitly non-lifecycle slots in Other instead of guessing from their generic objective', () => {
    expect(offerCategory({ plan_slot: 'privates', objective: 'acquisition' })).toBe('other');
    expect(offerCategory({ plan_slot: 'goodwill', objective: 'retention' })).toBe('other');
  });

  it('does not infer an audience from promotional names or incidental copy', () => {
    const offer = { name: 'Renew your love for the comeback', audience: 'All clients', objective: 'revenue_gap' };
    expect(offerCategory(offer)).toBe('other');
  });

  it('handles missing, unfamiliar and prototype-like tokens safely', () => {
    expect(offerCategory({})).toBe('other');
    expect(offerCategory({ objective: 'new_unknown_objective' })).toBe('other');
    expect(offerCategory({ objective: 'constructor' })).toBe('other');
    expect(offerCategory({ plan_slot: '__proto__' })).toBe('other');
    expect(offerCategory({ plan_slot: 'toString', objective: 'acquisition' })).toBe('other');
  });
});

describe('exclusive, stable offer groups', () => {
  const offers = [
    { id: 4, plan_slot: null, objective: 'additional_purchase', revenue: 500 },
    { id: 2, plan_slot: 'lapsed', objective: 'acquisition', revenue: 400 },
    { id: 3, plan_slot: 'renewal', objective: 'retention', revenue: 300 },
    { id: 1, plan_slot: 'newcomer', objective: 'retention', revenue: 200 },
    { id: 5, plan_slot: 'lapsed', objective: 'reactivation', revenue: 100 },
  ];

  it('groups every offer once, in lifecycle order, without changing its values', () => {
    const before = structuredClone(offers);
    const groups = groupOffersByCategory(offers);
    expect(groups.map(group => [group.key, group.offers.map(offer => offer.id)])).toEqual([
      ['new', [1]],
      ['winback', [2, 5]],
      ['renewal', [3]],
      ['other', [4]],
    ]);
    expect(groups.flatMap(group => group.offers)).toHaveLength(offers.length);
    expect(new Set(groups.flatMap(group => group.offers.map(offer => offer.id))).size).toBe(offers.length);
    expect(groups.flatMap(group => group.offers).reduce((sum, offer) => sum + offer.revenue, 0)).toBe(1500);
    expect(offers).toEqual(before);
  });

  it('preserves the active sort within each category', () => {
    const sorted = [...offers].sort((a, b) => b.revenue - a.revenue);
    const groups = groupOffersByCategory(sorted);
    for (const group of groups) {
      const revenues = group.offers.map(offer => offer.revenue);
      expect(revenues).toEqual([...revenues].sort((a, b) => b - a));
    }
  });

  it('supports per-month assignments without changing the reusable bank offer', () => {
    const groups = groupOffersByCategory(offers, offer => (offer.id === 3 ? 'newcomer' : undefined));
    expect(groups.find(group => group.key === 'new')?.offers.map(offer => offer.id)).toEqual([3, 1]);
    expect(groups.some(group => group.key === 'renewal')).toBe(false);
    expect(offers.find(offer => offer.id === 3)?.plan_slot).toBe('renewal');
  });

  it('keeps library filters mutually exclusive even when slot and objective disagree', () => {
    const filteredIds = OFFER_CATEGORIES.flatMap(category =>
      offers.filter(offer => offerCategory(offer) === category.key).map(offer => offer.id),
    );
    expect(new Set(filteredIds).size).toBe(offers.length);
    expect(filteredIds).toHaveLength(offers.length);
  });

  it('omits empty headings and handles an empty list', () => {
    expect(groupOffersByCategory([])).toEqual([]);
    expect(groupOffersByCategory([{ objective: 'reactivation' }]).map(group => group.label)).toEqual(['Winback']);
  });
});
