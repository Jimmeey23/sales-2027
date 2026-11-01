import { describe, expect, it } from 'vitest';
import { bindable, bindableRow } from '../server/lib/bindings';

/* An import writes whatever the file carries. A sheet has "yes" in an ads column, a forecast
   in a list, "₹24,940" in a price column — none of which SQLite will take, and the error it
   raises names the driver's accepted types rather than the offending column. These tests hold
   the guard that turns each value into something storable, and names the column when it can't. */

describe('what SQLite will accept', () => {
  it('takes numbers, strings, bigints, buffers and null as they are', () => {
    expect(bindable(42)).toBe(42);
    expect(bindable('Kemps Corner')).toBe('Kemps Corner');
    expect(bindable(12n)).toBe(12n);
    expect(bindable(null)).toBeNull();
    expect(bindable(undefined)).toBeNull();
  });

  it('writes a flag as 0 or 1 rather than a boolean', () => {
    expect(bindable(true)).toBe(1);
    expect(bindable(false)).toBe(0);
  });

  it('writes a date as text', () => {
    expect(bindable(new Date('2027-01-04T00:00:00.000Z'))).toBe('2027-01-04T00:00:00.000Z');
  });

  it('refuses an object or a list instead of binding it', () => {
    expect(() => bindable(['a bullet'])).toThrow(/list/);
    expect(() => bindable({ discount: 20 })).toThrow(/object/);
  });

  it('converts a whole row, naming the column it cannot store', () => {
    expect(bindableRow({ name: 'Week Zero', run_ads: true, month: 2 })).toEqual({
      name: 'Week Zero',
      run_ads: 1,
      month: 2,
    });
    expect(() => bindableRow({ name: 'Week Zero', mechanics: { discount: 20 } })).toThrow(/mechanics/);
  });
});
