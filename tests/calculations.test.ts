import { describe, expect, it } from 'vitest';
import { calculateFunnel, calculateOffer, solveRevenueGoal, fingerprintOffer } from '../server/lib/calculations';

const funnelInput = { revenueTarget: 100000, revenueAchieved: 20000, existingClientRevenue: 10000, renewalRevenue: 10000,
  reactivationRevenue: 5000, averageFirstPurchase: 10000, trialToPurchaseRate: .5, bookingToAttendanceRate: .8, leadToBookingRate: .25 };

describe('revenue and funnel calculation engine', () => {
  it('calculates the complete operational path and rounds counts upwards', () => {
    const result = calculateFunnel(funnelInput);
    expect(result.remainingGap).toBe(80000);
    expect(result.requiredNewClientRevenue).toBe(55000);
    expect(result.requiredNewBuyers).toBe(6);
    expect(result.requiredCompletedTrials).toBe(12);
    expect(result.requiredTrialBookings).toBe(15);
    expect(result.requiredLeads).toBe(60);
    expect(result.expectedLeadToPurchaseRate).toBeCloseTo(.1);
    expect(result.calculationPath).toHaveLength(6);
  });
  it('uses available leads for a separate funnel revenue forecast', () => {
    const result = calculateFunnel({ ...funnelInput, availableLeads: 50 });
    expect(result.funnelRevenueForecast).toBe(95000);
  });
  it('never divides by zero or returns Infinity', () => {
    const result = calculateFunnel({ ...funnelInput, trialToPurchaseRate: 0 });
    expect(result.requiredNewBuyers).toBe(6);
    expect(result.requiredCompletedTrials).toBeNull();
    expect(result.requiredTrialBookings).toBeNull();
    expect(result.requiredLeads).toBeNull();
    expect(result.warnings.join(' ')).toContain('Trial-to-purchase');
    expect(JSON.stringify(result)).not.toContain('Infinity');
  });
  it('returns null buyers when average first purchase is missing', () => {
    const result = calculateFunnel({ ...funnelInput, averageFirstPurchase: 0 });
    expect(result.requiredNewBuyers).toBeNull();
    expect(result.requiredLeads).toBeNull();
  });
  it('handles an already achieved target without inventing operational counts', () => {
    const result = calculateFunnel({ ...funnelInput, revenueAchieved: 120000 });
    expect(result.remainingGap).toBe(0);
    expect(result.requiredNewBuyers).toBe(0);
    expect(result.requiredLeads).toBe(0);
  });
  it('flags negative monetary inputs and invalid rates', () => {
    const result = calculateFunnel({ ...funnelInput, revenueTarget: -1, leadToBookingRate: 1.5 });
    expect(result.warnings.length).toBeGreaterThanOrEqual(2);
  });
});

describe('offer financial engine', () => {
  const base = { listedPrice: 10000, mechanism: 'percentage' as const, discountPercent: 10, targetRevenue: 100000,
    eligibleAudience: 100, redemptionRate: .2, conversionRate: .5, maxDiscountPercent: 20, variableCost: 4000, campaignBudget: 10000 };
  it('calculates price, units, revenue, discount cost, margin and break-even', () => {
    const result = calculateOffer(base);
    expect(result.sellingPrice).toBe(9000);
    expect(result.expectedRedemptions).toBe(20);
    expect(result.expectedBuyers).toBe(10);
    expect(result.expectedRevenue).toBe(90000);
    expect(result.requiredBuyers).toBe(12);
    expect(result.discountCost).toBe(10000);
    expect(result.contributionMargin).toBe(40000);
    expect(result.breakEvenBuyers).toBe(2);
    expect(result.targetGap).toBe(10000);
    expect(result.errors).toEqual([]);
  });
  it('supports fixed discounts', () => {
    const result = calculateOffer({ ...base, mechanism: 'fixed', discountPercent: 0, fixedDiscount: 1500 });
    expect(result.sellingPrice).toBe(8500);
    expect(result.effectiveDiscountPercent).toBe(15);
  });
  it('does not treat bonus classes as zero cost', () => {
    const result = calculateOffer({ ...base, mechanism: 'bonus_classes', discountPercent: 0, bonusClasses: 1, bonusClassValue: 1000, bonusClassCost: 300 });
    expect(result.discountCost).toBe(3000);
    expect(result.economicsComplete).toBe(true);
    expect(result.effectiveDiscountPercent).toBeCloseTo(9.09, 1);
  });
  it('flags incomplete economics when costs are missing', () => {
    const result = calculateOffer({ ...base, variableCost: null });
    expect(result.contributionMargin).toBeNull();
    expect(result.economicsComplete).toBe(false);
    expect(result.warnings.join(' ')).toContain('incomplete');
  });
  it('rejects a discount above the commercial ceiling', () => {
    const result = calculateOffer({ ...base, discountPercent: 25 });
    expect(result.errors.join(' ')).toContain('exceeds');
  });
  it('enforces a minimum selling price', () => {
    const result = calculateOffer({ ...base, minSellingPrice: 9500 });
    expect(result.errors.join(' ')).toContain('below');
  });
  it('handles a zero eligible audience without false revenue', () => {
    const result = calculateOffer({ ...base, eligibleAudience: 0 });
    expect(result.expectedBuyers).toBe(0);
    expect(result.expectedRevenue).toBe(0);
    expect(result.warnings.join(' ')).toContain('zero');
  });
  it('flags missing pricing and negative targets', () => {
    expect(calculateOffer({ ...base, listedPrice: 0 }).errors.length).toBeGreaterThan(0);
    expect(calculateOffer({ ...base, targetRevenue: -100 }).errors.join(' ')).toContain('negative');
  });
  it('warns when manual purchases exceed modelled redemptions or capacity', () => {
    const result = calculateOffer({ ...base, expectedPurchases: 30, capacityBuyers: 20 });
    expect(result.warnings.length).toBeGreaterThanOrEqual(2);
  });
});

describe('goal solver', () => {
  it('caps stream contributions and exposes an uncovered gap', () => {
    const result = solveRevenueGoal(1000000, 200000, [
      { key: 'renewal', audience: 10, conversionRate: .5, averageSpend: 10000 },
      { key: 'reactivation', audience: 10, conversionRate: .1, averageSpend: 10000 },
      { key: 'new_client', audience: 0, conversionRate: .2, averageSpend: 10000 },
    ]);
    expect(result.gap).toBe(800000);
    expect(result.allocations[0].contribution).toBe(50000);
    expect(result.allocations[1].contribution).toBe(10000);
    expect(result.uncoveredGap).toBe(740000);
    expect(result.coveragePercent).toBeCloseTo(7.5);
  });
  it('does not divide by zero when average spend or conversion is zero', () => {
    const result = solveRevenueGoal(10000, 0, [{ key: 'new_client', audience: 100, conversionRate: 0, averageSpend: 0 }]);
    expect(result.allocations[0].buyers).toBeNull();
    expect(result.allocations[0].requiredOutreach).toBeNull();
    expect(result.uncoveredGap).toBe(10000);
  });
});

describe('offer variation fingerprint', () => {
  it('changes when a strategic dimension changes', () => {
    const base = { studioId: 1, month: 4, objective: 'retention', segment: 'high_value', mechanism: 'percentage', discountPercent: 10, productId: 2 };
    expect(fingerprintOffer(base)).not.toBe(fingerprintOffer({ ...base, mechanism: 'bonus_classes' }));
    expect(fingerprintOffer(base)).not.toBe(fingerprintOffer({ ...base, studioId: 2 }));
  });
});
