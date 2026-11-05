import { describe, expect, it } from 'vitest';
import { cleanEdits, ruleEdits } from '../server/lib/offerEditCopilot';

const offers = [
  { id: 1, name: 'Spring Reset', discount: 0.2, expected_asp: 18000, redemption_conditions: 'One per client' },
  { id: 2, name: 'Barre Return', discount: 0.1, expected_asp: 12000 },
];

describe('offer edit copilot', () => {
  it('reads a discount change for every offer in scope', () => {
    const r = ruleEdits('drop the discount to 15%', offers);
    expect(r.edits).toHaveLength(2);
    expect(r.edits[0].changes.pricing).toEqual({ discount: 0.15 });
  });
  it('skips discounts above policy', () => {
    expect(ruleEdits('discount 70%', offers).edits).toHaveLength(0);
  });
  it('drops unchanged fields and offers outside scope', () => {
    const out = cleanEdits(
      [
        { offerId: 1, changes: { redemption_conditions: 'One per client', expected_asp: 20000 }, why: '' },
        { offerId: 99, changes: { name: 'Ghost offer' }, why: '' },
      ],
      offers,
    );
    expect(out).toEqual([{ offerId: 1, changes: { expected_asp: 20000 }, why: '' }]);
  });
  it('renames a single offer', () => {
    const r = ruleEdits('rename to Summer Reset', [offers[0]]);
    expect(r.edits[0].changes.name).toBe('Summer Reset');
  });
});
