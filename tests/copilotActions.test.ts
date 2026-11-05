import { describe, expect, it } from 'vitest';
import { consentText, describeAction, needsConsent, type CopilotAction } from '../src/lib/copilotActions';

const base = { studioId: 1, year: 2027, month: 3, why: '', allLocations: false };
const approved: CopilotAction = { kind: 'update_offer', ...base, offerId: 1, offerName: 'Spring Reset', approved: true, changes: { cta: 'Book' } };
const open: CopilotAction = { kind: 'add_offer', ...base, offerId: 2, offerName: 'Barre Return' };

describe('copilot actions', () => {
  it('asks consent only for approved offers', () => {
    expect(needsConsent(approved)).toBe(true);
    expect(needsConsent(open)).toBe(false);
    expect(consentText([open])).toBeNull();
    expect(consentText([approved, open])).toContain('Spring Reset');
  });
  it('describes actions plainly', () => {
    expect(describeAction(approved)).toBe('Edit “Spring Reset” · Mar 2027');
    expect(describeAction({ kind: 'update_plan', ...base, changes: {} })).toBe('Rewrite Mar 2027 plan');
  });
});
