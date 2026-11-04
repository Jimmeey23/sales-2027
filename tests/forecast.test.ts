import { describe, expect, it } from 'vitest';
import { expectedRevenueOf, forecastRevenue, hasValidForecast } from '../src/lib/forecast';
import { discountCapFor } from '../server/routes/offers';

describe('shared forecast validity', () => {
  it('accepts revenue within tolerance of its model and rejects stale or demo rows', () => {
    expect(hasValidForecast({ expected_revenue: 100000, financials: { expectedRevenue: 100005 } })).toBe(true);
    expect(hasValidForecast({ expected_revenue: 100000, financials: '{"expectedRevenue":120000}' })).toBe(false);
    expect(hasValidForecast({ expected_revenue: 5, data_mode: 'demo' })).toBe(false);
    expect(hasValidForecast({ expected_revenue: null })).toBe(false);
    expect(forecastRevenue({ expected_revenue: '2500' })).toBe(2500);
  });
  it('derives expected revenue from units × price unless overridden', () => {
    expect(expectedRevenueOf({ target_purchases: 10, expected_asp: 2500, expected_revenue: 1 })).toBe(25000);
    expect(
      expectedRevenueOf({ target_purchases: 10, expected_asp: 2500, expected_revenue: 7, financials: { revenueOverride: true } }),
    ).toBe(7);
    expect(expectedRevenueOf({ offer_type: 'deposit', target_purchases: 10, expected_asp: 5, expected_revenue: 0 })).toBe(0);
    expect(expectedRevenueOf({ expected_revenue: 900 })).toBe(900);
  });
});

describe('discount policy caps', () => {
  it('caps campaign offers at the studio cap and lets spot/annual/bulk reach 25%', () => {
    expect(discountCapFor({ name: 'Monsoon renewal', offer_type: 'percentage' }, 20)).toBe(20);
    expect(discountCapFor({ name: 'Spot price (flash)', offer_type: 'percentage' }, 20)).toBe(25);
    expect(discountCapFor({ name: 'Bulk privates (25%)', offer_type: 'fixed' }, 20)).toBe(25);
    expect(discountCapFor({ name: 'Gift card (3-for-2)', offer_type: 'buy_x_for_y' }, 20)).toBeNull();
  });
});
