import { describe, expect, it } from 'vitest';
import { calculateOffer, type OfferInput } from '../server/lib/calculations.js';
import { buildCommercialOffer, commercialCatalog, getPolicy, validateStudioOfferPolicy } from '../server/lib/commercial.js';
import { renewalReport } from '../server/lib/renewals.js';
import { recommendTarget, studioProfile } from '../server/lib/intelligence.js';
import { deterministicCopilot } from '../server/lib/copilot.js';
import { db } from '../server/db.js';

const base: OfferInput = { listedPrice: 1350, mechanism: 'buy_x_for_y', bundleQuantity: 2, paidQuantity: 1, targetRevenue: 2700,
  eligibleAudience: 10, redemptionRate: 1, conversionRate: 1, maxDiscountPercent: 50, variableCost: 200, campaignBudget: 0 };

describe('advanced offer economics', () => {
  it('prices 2-for-1 from two single-class MRPs and counts two classes per buyer', () => {
    const result = calculateOffer(base);
    expect(result.sellingPrice).toBe(1350); expect(result.referenceValue).toBe(2700); expect(result.effectiveDiscountPercent).toBe(50);
    expect(result.expectedRevenue).toBe(13500); expect(result.expectedClasses).toBe(20); expect(result.errors).toEqual([]);
  });
  it('keeps 3-for-2 cash and reference values distinct', () => {
    const result = calculateOffer({ ...base, bundleQuantity: 3, paidQuantity: 2 });
    expect(result.sellingPrice).toBe(2700); expect(result.referenceValue).toBe(4050); expect(result.effectiveDiscountPercent).toBeCloseTo(33.3333,3);
    expect(result.expectedRevenue).toBe(27000); expect(result.expectedClasses).toBe(30);
  });
  it('requires an explicit full-stacking rule and calculates total cash discount', () => {
    const input: OfferInput = { ...base, mechanism: 'stacked', listedPrice: 1000, discountPercent: 10, stackedDiscountPercent: 5, maxDiscountPercent: 20, stackingRule: 'full' };
    expect(calculateOffer(input).sellingPrice).toBe(850);
    expect(calculateOffer({ ...input, stackingRule: 'benefits_only' }).errors.join(' ')).toContain('full-stacking');
  });
  it('combines price, guest, private and validity benefits without hiding their costs', () => {
    const result = calculateOffer({ ...base, mechanism: 'bundle', listedPrice: 1000, discountPercent: 10, maxDiscountPercent: 20, variableCost: 100,
      allowPerksBeyondDiscountCap: true, sessionsIncluded: 1, guestPasses: 2, guestPassValue: 100, guestPassCost: 20,
      privateSessions: 1, privateSessionMinutes: 30, privateSessionValue: 500, privateSessionCost: 200,
      validityDays: 10, validityDayValue: 0, validityDayCost: 0 });
    expect(result.benefitValue).toBe(700); expect(result.benefitCost).toBe(240); expect(result.referenceValue).toBe(1700);
    expect(result.contributionMargin).toBe(5600); expect(result.expectedClasses).toBe(30); expect(result.economicsComplete).toBe(true);
    expect(result.warnings.join(' ')).toContain('separately disclosed');
  });
  it('does not treat missing benefit costs as zero or fractional quantities as valid', () => {
    const missing = calculateOffer({ ...base, mechanism: 'bundle', retailProductValue: 500, retailProductCost: null });
    expect(missing.economicsComplete).toBe(false); expect(missing.contributionMargin).toBeNull();
    expect(calculateOffer({ ...base, guestPasses: 1.5, guestPassCost: 0 }).errors.join(' ')).toContain('whole number');
  });
  it('handles free trials and invalid numeric input without NaN or negative buyers', () => {
    const free = calculateOffer({ ...base, mechanism: 'free_trial', fixedDiscount: 1350, maxDiscountPercent: 100 });
    expect(free.sellingPrice).toBe(0); expect(free.expectedRevenue).toBe(0); expect(free.warnings.join(' ')).toContain('no direct offer revenue');
    const invalid = calculateOffer({ ...base, redemptionRate: Number.NaN, conversionRate: -.5, variableCost: Number.NaN });
    expect(invalid.errors.length).toBeGreaterThan(0); expect(invalid.expectedBuyers).toBeGreaterThanOrEqual(0); expect(invalid.economicsComplete).toBe(false);
    for (const value of [invalid.expectedBuyers,invalid.expectedRevenue,invalid.effectiveDiscountPercent]) expect(Number.isFinite(value)).toBe(true);
  });
  it('checks conditional spend and class-capacity assumptions', () => {
    const result = calculateOffer({ ...base, minimumSpend: 5000, capacityClasses: 5 });
    expect(result.errors.join(' ')).toContain('minimum spend'); expect(result.warnings.join(' ')).toContain('capacity');
  });
});

describe('studio-specific policy enforcement', () => {
  it('binds Kenkere to Barre and explicit product-master IDs', () => {
    const policy = getPolicy(3); expect(policy.formats).toEqual(['barre']); expect(policy.single_class_product_id).toBe(32); expect(policy.newcomer_product_id).toBe(235);
  });
  it('prices the Kenkere intro from the ₹1,350 single class and sells at ₹675', () => {
    const offer = buildCommercialOffer({ studioId: 3, kind: 'intro_pack', year: 2027, month: 1 });
    expect(offer.mechanics.listedPrice).toBe(1350); expect(offer.financials.sellingPrice).toBe(675); expect(offer.eligibleProducts).toEqual([98]);
  });
  it('calculates Kenkere newcomer alternatives and once-lifetime control', () => {
    const control = buildCommercialOffer({ studioId: 3, kind: 'newcomer_2_for_1', year: 2027, month: 1 });
    const variant = buildCommercialOffer({ studioId: 3, kind: 'newcomer_3_for_2', year: 2027, month: 1 });
    expect(control.financials.sellingPrice).toBe(1350); expect(control.mechanics.lifetimeRedemptionLimit).toBe(1); expect(variant.financials.sellingPrice).toBe(2700);
  });
  it('allows Mumbai Barre free trial but rejects Strength free trial', () => {
    expect(buildCommercialOffer({ studioId: 1, kind: 'free_trial', format: 'barre', year: 2027, month: 1 }).financials.sellingPrice).toBe(0);
    expect(() => buildCommercialOffer({ studioId: 1, kind: 'free_trial', format: 'strength', year: 2027, month: 1 })).toThrow(/Strength|free trial/i);
  });
  it('uses hosted paid-trial MRP with provenance and rejects partner newcomer bundles', () => {
    const offer = buildCommercialOffer({ studioId: 5, kind: 'paid_trial', year: 2027, month: 1 });
    expect(offer.financials.sellingPrice).toBe(900); expect(offer.provenance.pricing.source).toBe('explicit_hosted_catalogue');
    expect(offer.provenance.historicalSalesUsed).toBe(false);
    expect(() => buildCommercialOffer({ studioId: 5, kind: 'newcomer_3_for_2', year: 2027, month: 1 })).toThrow(/not configured/i);
  });
  it('deduplicates a hosted product used by multiple policy roles', () => {
    const catalog = commercialCatalog(5), ids = catalog.products.map(product => product.id);
    expect(new Set(ids).size).toBe(ids.length); expect(ids.filter(id => id === 243)).toHaveLength(1);
    expect(catalog.products.find(product => product.id === 243)?.catalogue_source).toBe('hosted_catalogue');
  });
  it('enforces standard pack/membership discounts and annual perks', () => {
    const pack = buildCommercialOffer({ studioId: 1, kind: 'class_pack', productId: 162, year: 2027, month: 1 });
    expect(pack.mechanics.listedPrice).toBe(18500); expect(pack.financials.sellingPrice).toBe(16650);
    const annual = buildCommercialOffer({ studioId: 1, kind: 'annual', year: 2027, month: 1 });
    expect(annual.mechanics.discountPercent).toBe(20); expect(annual.mechanics.privateSessions).toBe(2); expect(annual.mechanics.guestPasses).toBe(4);
    expect(annual.mechanics.hostedClasses).toBe(1); expect(annual.mechanics.trainerConsultations).toBe(12); expect(annual.financials.economicsComplete).toBe(false);
    expect(() => validateStudioOfferPolicy(1,{ ...pack.mechanics, discountPercent: 20 },pack.eligibleProducts)).toThrow(/10%/);
  });
});

describe('renewals, historic findings and target scenarios', () => {
  it('keeps due values, historical renewal revenue and projected conversion separate', () => {
    const report = renewalReport('2026-11',1,.6);
    expect(report.summary.duePackages).toBeGreaterThan(0); expect(report.summary.paidDueValue).toBeGreaterThan(0); expect(report.summary.listDueValue).toBeGreaterThan(0);
    expect(report.selectedMonthHistoricalRenewal.revenue).toBe(0); expect(report.projection?.status).toBe('scenario_not_forecast');
    expect(report.projection?.projectedRevenueFromKnownValues).toBeCloseTo(report.summary.paidDueValue * .6,5);
  });
  it('excludes partial October 2026 from historic findings', () => {
    const profile = studioProfile(1,2026) as any;
    expect(profile.historic.through).toBe('2026-09'); expect(profile.historic.comparisons).toHaveLength(9); expect(profile.historic.findings.length).toBeGreaterThan(0);
  });
  it('orders aggressive at or above standard and nominal while respecting Kemps rent cap', () => {
    let nominal = 0, standard = 0, aggressive = 0; const monthlyStandard: number[] = [];
    for (let month = 1; month <= 12; month++) {
      const n = recommendTarget(1,2027,month,'nominal'), s = recommendTarget(1,2027,month,'standard'), a = recommendTarget(1,2027,month,'aggressive');
      nominal += n.proposed_target; standard += s.proposed_target; aggressive += a.proposed_target; monthlyStandard.push(s.proposed_target);
      for (const target of [n,s,a]) { expect(target.proposed_target).toBeGreaterThanOrEqual(3000000); expect(target.proposed_target).toBeLessThanOrEqual(4000000); }
    }
    expect(new Set(monthlyStandard).size).toBeGreaterThan(4);
    expect(aggressive).toBeGreaterThanOrEqual(standard); expect(aggressive).toBeGreaterThanOrEqual(nominal);
  });
});

describe('deterministic Copilot', () => {
  it('parses a trailing conversion assumption without calling it a forecast', async () => {
    const answer = await deterministicCopilot('Show renewals due in November 2026 at 60% conversion',3);
    expect(answer.attachments.report.projection.conversionRate).toBe(.6); expect(answer.content).toContain('not a forecast');
  });
  it('builds but does not save a simulation-only newcomer concept', async () => {
    const answer = await deterministicCopilot('Simulate a 3-for-2 newcomer offer for January 2027',3);
    expect(answer.attachments.concept.financials.sellingPrice).toBe(2700); expect(answer.saveOffer).toBeFalsy();
  });
  it('returns a persistent-plan payload with actuals and future target separated', async () => {
    const answer = await deterministicCopilot('Build a complete sales plan for January 2027',3);
    expect(answer.attachments.type).toBe('sales_plan'); expect(answer.attachments.plan.latestObserved.month).not.toBe('2027-01');
    expect(answer.attachments.plan.concepts.length).toBeGreaterThan(0); expect(answer.attachments.plan.boundaries.join(' ')).toContain('approval');
  });
});

describe('commercial seed remains read-only during tests', () => {
  it('retains draft policy offers and linked experiments without approvals', () => {
    const offers = db.prepare("SELECT COUNT(*) n,SUM(CASE WHEN status!='draft' OR approval_status='approved' THEN 1 ELSE 0 END) invalid FROM offers WHERE generation_source='policy_engine'").get() as any;
    expect(offers.n).toBeGreaterThanOrEqual(39); expect(offers.invalid || 0).toBe(0);
    expect(Number((db.prepare('SELECT COUNT(*) n FROM offer_experiments').get() as any).n)).toBeGreaterThanOrEqual(3);
  });
});
