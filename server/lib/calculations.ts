export type Scenario = 'conservative' | 'base' | 'stretch';

export interface FunnelInput {
  revenueTarget: number;
  revenueAchieved: number;
  existingClientRevenue: number;
  renewalRevenue: number;
  reactivationRevenue: number;
  averageFirstPurchase: number;
  trialToPurchaseRate: number;
  bookingToAttendanceRate: number;
  leadToBookingRate: number;
  availableLeads?: number;
}

export interface FunnelResult {
  remainingGap: number;
  requiredNewClientRevenue: number;
  requiredNewBuyers: number | null;
  requiredCompletedTrials: number | null;
  requiredTrialBookings: number | null;
  requiredLeads: number | null;
  expectedLeadToPurchaseRate: number | null;
  funnelRevenueForecast: number;
  calculationPath: Array<{ label: string; formula: string; value: number | null; unit: string }>;
  warnings: string[];
}

const finite = (value: unknown, fallback = 0) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;
export const ceilCount = (value: number) => Math.max(0, Math.ceil(value - 1e-10));
export function safeDivide(numerator: number, denominator: number): number | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return null;
  return numerator / denominator;
}

export function calculateFunnel(raw: FunnelInput): FunnelResult {
  const input = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, finite(v)])) as unknown as FunnelInput;
  const warnings: string[] = [];
  for (const [label, value] of Object.entries({
    revenueTarget: input.revenueTarget,
    revenueAchieved: input.revenueAchieved,
    existingClientRevenue: input.existingClientRevenue,
    renewalRevenue: input.renewalRevenue,
    reactivationRevenue: input.reactivationRevenue,
    averageFirstPurchase: input.averageFirstPurchase,
  })) {
    if (value < 0) warnings.push(`${label} cannot be negative.`);
  }
  for (const [label, rate] of Object.entries({
    trialToPurchaseRate: input.trialToPurchaseRate,
    bookingToAttendanceRate: input.bookingToAttendanceRate,
    leadToBookingRate: input.leadToBookingRate,
  })) {
    if (rate < 0 || rate > 1) warnings.push(`${label} must be between 0% and 100%.`);
  }
  const remainingGap = Math.max(0, input.revenueTarget - input.revenueAchieved);
  const plannedExisting =
    Math.max(0, input.existingClientRevenue) +
    Math.max(0, input.renewalRevenue) +
    Math.max(0, input.reactivationRevenue);
  const requiredNewClientRevenue = Math.max(0, remainingGap - plannedExisting);
  let requiredNewBuyers: number | null = 0;
  if (requiredNewClientRevenue > 0) {
    const buyers = safeDivide(requiredNewClientRevenue, input.averageFirstPurchase);
    requiredNewBuyers = buyers === null ? null : ceilCount(buyers);
    if (buyers === null) warnings.push('A positive average first-purchase value is required to calculate new buyers.');
  }
  const step = (count: number | null, rate: number, label: string) => {
    if (count === null || count === 0) return count;
    if (rate <= 0 || rate > 1) {
      warnings.push(`${label} must be greater than 0% and no more than 100%.`);
      return null;
    }
    return ceilCount(count / rate);
  };
  const requiredCompletedTrials = step(requiredNewBuyers, input.trialToPurchaseRate, 'Trial-to-purchase conversion');
  const requiredTrialBookings = step(
    requiredCompletedTrials,
    input.bookingToAttendanceRate,
    'Booking-to-attendance rate',
  );
  const requiredLeads = step(requiredTrialBookings, input.leadToBookingRate, 'Lead-to-booking rate');
  const expectedLeadToPurchaseRate =
    input.trialToPurchaseRate > 0 && input.bookingToAttendanceRate > 0 && input.leadToBookingRate > 0
      ? input.trialToPurchaseRate * input.bookingToAttendanceRate * input.leadToBookingRate
      : null;
  const forecastBuyers =
    input.availableLeads !== undefined && expectedLeadToPurchaseRate !== null
      ? Math.floor(Math.max(0, input.availableLeads) * expectedLeadToPurchaseRate)
      : requiredNewBuyers;
  const funnelRevenueForecast =
    input.revenueAchieved +
    plannedExisting +
    (forecastBuyers === null ? 0 : forecastBuyers * Math.max(0, input.averageFirstPurchase));
  return {
    remainingGap,
    requiredNewClientRevenue,
    requiredNewBuyers,
    requiredCompletedTrials,
    requiredTrialBookings,
    requiredLeads,
    expectedLeadToPurchaseRate,
    funnelRevenueForecast,
    calculationPath: [
      { label: 'Revenue still required', formula: 'max(target − achieved, 0)', value: remainingGap, unit: 'INR' },
      {
        label: 'New-client revenue required',
        formula: 'max(gap − existing − renewals − reactivations, 0)',
        value: requiredNewClientRevenue,
        unit: 'INR',
      },
      {
        label: 'New purchasing clients',
        formula: 'ceil(new-client revenue ÷ average first purchase)',
        value: requiredNewBuyers,
        unit: 'clients',
      },
      {
        label: 'Completed trials',
        formula: 'ceil(new buyers ÷ trial-to-purchase rate)',
        value: requiredCompletedTrials,
        unit: 'trials',
      },
      {
        label: 'Trial bookings',
        formula: 'ceil(completed trials ÷ attendance rate)',
        value: requiredTrialBookings,
        unit: 'bookings',
      },
      {
        label: 'Qualified leads',
        formula: 'ceil(trial bookings ÷ lead-to-booking rate)',
        value: requiredLeads,
        unit: 'leads',
      },
    ],
    warnings,
  };
}

export type OfferMechanism =
  | 'percentage'
  | 'fixed'
  | 'bonus_classes'
  | 'validity_extension'
  | 'bundle'
  | 'referral'
  | 'experience'
  | 'threshold'
  | 'buy_x_for_y'
  | 'stacked'
  | 'conditional'
  | 'free_trial';
export interface OfferInput {
  listedPrice: number;
  mechanism: OfferMechanism;
  discountPercent?: number;
  fixedDiscount?: number;
  bonusClasses?: number;
  bonusClassValue?: number;
  bonusClassCost?: number | null;
  targetRevenue: number;
  eligibleAudience: number;
  redemptionRate: number;
  conversionRate?: number;
  maxDiscountPercent: number;
  minSellingPrice?: number | null;
  variableCost?: number | null;
  campaignBudget?: number;
  expectedPurchases?: number | null;
  baselineBuyers?: number;
  capacityBuyers?: number | null;
  capacityClasses?: number | null;
  sessionsIncluded?: number;
  stackedDiscountPercent?: number;
  stackingRule?: 'not_stackable' | 'benefits_only' | 'full';
  allowPerksBeyondDiscountCap?: boolean;
  bundleQuantity?: number;
  paidQuantity?: number;
  validityDays?: number;
  freezeAttempts?: number;
  freezeAttemptValue?: number;
  freezeAttemptCost?: number | null;
  validityDayValue?: number;
  validityDayCost?: number | null;
  guestPasses?: number;
  guestPassValue?: number;
  guestPassCost?: number | null;
  hostedClasses?: number;
  hostedClassValue?: number;
  hostedClassCost?: number | null;
  privateSessions?: number;
  privateSessionMinutes?: number;
  privateSessionValue?: number;
  privateSessionCost?: number | null;
  virtualPrivates?: number;
  virtualPrivateValue?: number;
  virtualPrivateCost?: number | null;
  trainerConsultations?: number;
  trainerConsultationValue?: number;
  trainerConsultationCost?: number | null;
  retailProductValue?: number;
  retailProductCost?: number | null;
  customBenefitValue?: number;
  customBenefitCost?: number | null;
  conditionType?: 'none' | 'student' | 'minimum_spend' | 'newcomer' | 'lapsed_return' | 'specific_format' | 'custom';
  conditionValue?: string;
  minimumSpend?: number;
  lifetimeRedemptionLimit?: number | null;
  policyKind?: string;
  format?: string;
  pricingProductId?: number;
  fulfilmentProductId?: number;
}
export interface OfferResult {
  sellingPrice: number | null;
  discountAmount: number;
  effectiveDiscountPercent: number;
  requiredBuyers: number | null;
  expectedBuyers: number | null;
  expectedRevenue: number | null;
  expectedRedemptions: number | null;
  discountCost: number | null;
  contributionMargin: number | null;
  breakEvenBuyers: number | null;
  revenueVsBaseline: number | null;
  incrementalRevenue: number | null;
  targetGap: number | null;
  errors: string[];
  warnings: string[];
  economicsComplete: boolean;
  referenceValue?: number;
  benefitValue?: number;
  benefitCost?: number | null;
  expectedBenefitCost?: number | null;
  expectedClasses?: number | null;
  totalDiscountPercent?: number;
  customerValue?: number;
}

function calculateCashOffer(input: OfferInput): OfferResult {
  const errors: string[] = [],
    warnings: string[] = [];
  if (input.targetRevenue < 0) errors.push('Target revenue cannot be negative.');
  if ((input.discountPercent ?? 0) < 0 || (input.fixedDiscount ?? 0) < 0)
    errors.push('Discount values cannot be negative.');
  if (input.maxDiscountPercent < 0 || input.maxDiscountPercent > 100)
    errors.push('Commercial discount ceiling must be between 0% and 100%.');
  const price = finite(input.listedPrice, -1);
  if (price <= 0) errors.push('Listed product price is missing or invalid.');
  const discountPercent = Math.max(0, finite(input.discountPercent));
  const fixedDiscount = Math.max(0, finite(input.fixedDiscount));
  if (discountPercent > input.maxDiscountPercent + 1e-9)
    errors.push(`Discount exceeds the ${input.maxDiscountPercent}% commercial ceiling.`);
  if (discountPercent > 100) errors.push('Percentage discount cannot exceed 100%.');
  if (input.eligibleAudience < 0) errors.push('Eligible audience cannot be negative.');
  for (const [label, rate] of [
    ['Redemption', input.redemptionRate],
    ['Conversion', input.conversionRate ?? 1],
  ] as const) {
    if (rate < 0 || rate > 1) errors.push(`${label} rate must be between 0% and 100%.`);
  }
  const discountAmount =
    input.mechanism === 'percentage'
      ? (Math.max(0, price) * discountPercent) / 100
      : input.mechanism === 'fixed' || input.mechanism === 'threshold'
        ? Math.min(Math.max(0, price), fixedDiscount)
        : 0;
  const sellingPrice = price > 0 ? Math.max(0, price - discountAmount) : null;
  if (
    sellingPrice !== null &&
    input.minSellingPrice !== undefined &&
    input.minSellingPrice !== null &&
    sellingPrice < input.minSellingPrice
  ) {
    errors.push(`Selling price is below the minimum acceptable ₹${input.minSellingPrice.toFixed(0)}.`);
  }
  if (input.mechanism === 'fixed' && price > 0 && (fixedDiscount / price) * 100 > input.maxDiscountPercent) {
    errors.push('Fixed discount exceeds the commercial ceiling at this product price.');
  }
  const bonusClasses = Math.max(0, finite(input.bonusClasses));
  const bonusValue = Math.max(0, finite(input.bonusClassValue)) * bonusClasses;
  const bonusCost = Math.max(0, finite(input.bonusClassCost)) * bonusClasses;
  const effectiveDiscountPercent =
    price > 0 ? Math.min(100, ((discountAmount + bonusValue) / (price + bonusValue)) * 100) : 0;
  if (effectiveDiscountPercent > input.maxDiscountPercent + 1e-9 && bonusValue > 0)
    errors.push('Total benefit value exceeds the commercial ceiling.');
  const requiredBuyers =
    sellingPrice && input.targetRevenue > 0
      ? ceilCount(input.targetRevenue / sellingPrice)
      : input.targetRevenue <= 0
        ? 0
        : null;
  const expectedRedemptions =
    input.eligibleAudience === 0
      ? 0
      : Math.floor(Math.max(0, input.eligibleAudience) * Math.max(0, input.redemptionRate));
  const calculatedBuyers = Math.max(0, Math.floor(expectedRedemptions * (input.conversionRate ?? 1)));
  const expectedBuyers =
    input.expectedPurchases !== undefined && input.expectedPurchases !== null
      ? Math.max(0, Math.floor(input.expectedPurchases))
      : calculatedBuyers;
  if (input.eligibleAudience === 0 && input.targetRevenue > 0)
    warnings.push('Eligible audience is zero; no purchases can be forecast from this audience.');
  if (expectedBuyers > expectedRedemptions && input.expectedPurchases !== undefined && input.expectedPurchases !== null)
    warnings.push('Manual expected purchases exceed modelled redemptions; validate this override.');
  if (input.capacityBuyers !== undefined && input.capacityBuyers !== null && expectedBuyers > input.capacityBuyers) {
    warnings.push(`Expected buyers exceed the stated capacity of ${input.capacityBuyers}.`);
  }
  const expectedRevenue = sellingPrice === null ? null : expectedBuyers * sellingPrice;
  const discountCost = sellingPrice === null ? null : (discountAmount + bonusCost) * expectedBuyers;
  const nonPriceBenefitNeedsCost =
    ['validity_extension', 'referral', 'experience', 'bundle'].includes(input.mechanism) &&
    !(input.campaignBudget && input.campaignBudget > 0);
  const economicsComplete =
    input.variableCost !== undefined &&
    input.variableCost !== null &&
    (bonusClasses === 0 || input.bonusClassCost !== undefined) &&
    !nonPriceBenefitNeedsCost;
  if (!economicsComplete)
    warnings.push('Contribution economics are incomplete: variable cost or bonus-class cost is unavailable.');
  const contributionMargin =
    sellingPrice === null || !economicsComplete
      ? null
      : (sellingPrice - Math.max(0, input.variableCost || 0) - bonusCost) * expectedBuyers -
        Math.max(0, finite(input.campaignBudget));
  const unitContribution =
    sellingPrice === null || !economicsComplete
      ? null
      : sellingPrice - Math.max(0, input.variableCost || 0) - bonusCost;
  const breakEvenBuyers =
    unitContribution && unitContribution > 0
      ? ceilCount(Math.max(0, finite(input.campaignBudget)) / unitContribution)
      : null;
  const baselineBuyers = Math.max(0, finite(input.baselineBuyers));
  const revenueVsBaseline = expectedRevenue === null ? null : expectedRevenue - baselineBuyers * Math.max(0, price);
  const incrementalRevenue = expectedRevenue === null ? null : expectedRevenue - baselineBuyers * (sellingPrice || 0);
  return {
    sellingPrice,
    discountAmount,
    effectiveDiscountPercent,
    requiredBuyers,
    expectedBuyers,
    expectedRevenue,
    expectedRedemptions,
    discountCost,
    contributionMargin,
    breakEvenBuyers,
    revenueVsBaseline,
    incrementalRevenue,
    targetGap: expectedRevenue === null ? null : Math.max(0, input.targetRevenue - expectedRevenue),
    errors,
    warnings,
    economicsComplete,
  };
}

export function calculateOffer(input: OfferInput): OfferResult {
  const errors: string[] = [],
    warnings: string[] = [];
  const invalidNumber = (value: unknown) =>
    value !== undefined && value !== null && (typeof value !== 'number' || !Number.isFinite(value));
  for (const [label, value] of [
    ['Expected purchases', input.expectedPurchases],
    ['Variable cost', input.variableCost],
    ['Minimum selling price', input.minSellingPrice],
    ['Buyer capacity', input.capacityBuyers],
    ['Class capacity', input.capacityClasses],
  ] as const)
    if (invalidNumber(value)) errors.push(`${label} must be a finite number.`);
  if (
    (input.expectedPurchases ?? 0) < 0 ||
    (input.variableCost ?? 0) < 0 ||
    (input.minSellingPrice ?? 0) < 0 ||
    (input.capacityBuyers ?? 0) < 0 ||
    (input.capacityClasses ?? 0) < 0
  )
    errors.push('Costs, overrides, minimum prices and capacities cannot be negative.');
  if ((input.discountPercent ?? 0) < 0 || (input.fixedDiscount ?? 0) < 0 || (input.stackedDiscountPercent ?? 0) < 0)
    errors.push('Discount values cannot be negative.');
  input = {
    ...input,
    listedPrice: finite(input.listedPrice, -1),
    targetRevenue: finite(input.targetRevenue, -1),
    eligibleAudience: finite(input.eligibleAudience, -1),
    redemptionRate: finite(input.redemptionRate, -1),
    conversionRate: input.conversionRate === undefined ? 1 : finite(input.conversionRate, -1),
    maxDiscountPercent: finite(input.maxDiscountPercent, -1),
    expectedPurchases: invalidNumber(input.expectedPurchases) ? null : input.expectedPurchases,
    variableCost: invalidNumber(input.variableCost) ? null : input.variableCost,
    minSellingPrice: invalidNumber(input.minSellingPrice) ? null : input.minSellingPrice,
    capacityBuyers: invalidNumber(input.capacityBuyers) ? null : input.capacityBuyers,
    capacityClasses: invalidNumber(input.capacityClasses) ? null : input.capacityClasses,
  };
  const stackingRule = input.stackingRule || 'not_stackable';
  const stackedDiscount = Math.max(0, finite(input.stackedDiscountPercent));
  if (stackedDiscount > 0 && stackingRule !== 'full')
    errors.push('Additional price stacking requires an explicit full-stacking rule.');
  let listedPrice = Number(input.listedPrice);
  let fixedDiscount = Math.max(0, finite(input.fixedDiscount));
  let discountPercent = Math.max(0, finite(input.discountPercent)) + stackedDiscount;
  let cashMechanism: OfferMechanism = ['fixed', 'threshold', 'conditional', 'free_trial'].includes(input.mechanism)
    ? 'fixed'
    : 'percentage';
  let bundleQuantity = Math.max(0, finite(input.bundleQuantity));
  let paidQuantity = Math.max(0, finite(input.paidQuantity));
  if (input.mechanism === 'buy_x_for_y') {
    if (!Number.isInteger(bundleQuantity) || bundleQuantity < 1)
      errors.push('Bundle class quantity must be a positive whole number.');
    if (!Number.isInteger(paidQuantity) || paidQuantity < 0 || paidQuantity >= bundleQuantity)
      errors.push('Paid quantity must be a whole number below the total bundle quantity.');
    bundleQuantity = Math.max(1, Math.floor(bundleQuantity || 1));
    paidQuantity = Math.max(0, Math.floor(paidQuantity));
    listedPrice = Math.max(0, finite(input.listedPrice)) * bundleQuantity;
    fixedDiscount = Math.max(0, finite(input.listedPrice)) * Math.max(0, bundleQuantity - paidQuantity);
    discountPercent = 0;
    cashMechanism = 'fixed';
  }
  const cash = calculateCashOffer({
    ...input,
    listedPrice,
    mechanism: cashMechanism,
    discountPercent,
    fixedDiscount,
    bonusClasses: 0,
    bonusClassValue: 0,
    bonusClassCost: 0,
  });
  let benefitValue = 0,
    benefitCost = 0;
  let economicsComplete = input.variableCost !== undefined && input.variableCost !== null;
  let missingCost = false;
  const benefit = (countRaw: unknown, unitValue: unknown, unitCost: unknown, label: string, allowFraction = false) => {
    if (invalidNumber(countRaw)) {
      errors.push(`${label} quantity must be a finite number.`);
      return;
    }
    const count = finite(countRaw);
    if (count < 0) {
      errors.push(`${label} quantity cannot be negative.`);
      return;
    }
    if (!allowFraction && count > 0 && !Number.isInteger(count))
      errors.push(`${label} quantity must be a whole number.`);
    if (!count) return;
    if (invalidNumber(unitValue) || Number(unitValue || 0) < 0)
      errors.push(`${label} customer value must be a non-negative finite number.`);
    benefitValue += count * Math.max(0, finite(unitValue));
    if (unitCost === undefined || unitCost === null || invalidNumber(unitCost) || Number(unitCost) < 0) {
      missingCost = true;
      if (invalidNumber(unitCost) || Number(unitCost) < 0)
        errors.push(`${label} cost must be a non-negative finite number or blank.`);
    } else benefitCost += count * Number(unitCost);
  };
  benefit(input.bonusClasses, input.bonusClassValue, input.bonusClassCost, 'Complimentary class');
  benefit(input.validityDays, input.validityDayValue, input.validityDayCost, 'Validity extension', true);
  benefit(input.freezeAttempts, input.freezeAttemptValue, input.freezeAttemptCost, 'Freeze attempt');
  benefit(input.guestPasses, input.guestPassValue, input.guestPassCost, 'Guest pass');
  benefit(input.hostedClasses, input.hostedClassValue, input.hostedClassCost, 'Hosted class');
  benefit(input.privateSessions, input.privateSessionValue, input.privateSessionCost, 'Private session');
  benefit(input.virtualPrivates, input.virtualPrivateValue, input.virtualPrivateCost, 'Virtual private');
  benefit(
    input.trainerConsultations,
    input.trainerConsultationValue,
    input.trainerConsultationCost,
    'Trainer consultation',
  );
  if (
    (input.retailProductValue || 0) > 0 ||
    (input.retailProductCost !== undefined && input.retailProductCost !== null)
  )
    benefit(1, input.retailProductValue, input.retailProductCost, 'Retail gift');
  if (
    (input.customBenefitValue || 0) > 0 ||
    (input.customBenefitCost !== undefined && input.customBenefitCost !== null)
  )
    benefit(1, input.customBenefitValue, input.customBenefitCost, 'Custom benefit');
  if (missingCost) economicsComplete = false;
  if (missingCost)
    warnings.push('One or more complimentary benefit costs are missing; contribution economics remain incomplete.');
  if (!economicsComplete && !missingCost)
    warnings.push('Contribution economics are incomplete: variable cost is unavailable.');
  if (input.conditionType === 'student' && !String(input.conditionValue || '').trim())
    warnings.push('State student eligibility and verification requirements before activation.');
  if ((input.minimumSpend || 0) < 0 || invalidNumber(input.minimumSpend))
    errors.push('Conditional minimum spend must be a non-negative finite number.');
  if ((input.minimumSpend || 0) > 0 && listedPrice < Number(input.minimumSpend))
    errors.push('The selected product or bundle does not meet the conditional minimum spend.');
  if (
    input.lifetimeRedemptionLimit !== undefined &&
    input.lifetimeRedemptionLimit !== null &&
    (!Number.isInteger(input.lifetimeRedemptionLimit) || input.lifetimeRedemptionLimit < 1)
  )
    errors.push('Lifetime redemption limit must be a positive whole number when configured.');
  if ((input.sessionsIncluded || 0) < 0) errors.push('Included base-product sessions cannot be negative.');
  if (
    (input.privateSessions || 0) > 0 &&
    (!(input.privateSessionMinutes || 0) || Number(input.privateSessionMinutes) <= 0)
  )
    errors.push('Private sessions require a positive duration in minutes.');
  const referenceValue = Math.max(0, listedPrice) + benefitValue;
  const effectiveDiscountPercent =
    referenceValue > 0 ? Math.min(100, ((cash.discountAmount + benefitValue) / referenceValue) * 100) : 0;
  if (effectiveDiscountPercent > input.maxDiscountPercent + 1e-9 && benefitValue > 0) {
    const message = `Total customer benefit value is ${effectiveDiscountPercent.toFixed(1)}% of reference value, above the ${input.maxDiscountPercent}% price-discount ceiling.`;
    if (input.allowPerksBeyondDiscountCap)
      warnings.push(`${message} Perks are separately disclosed and do not increase the cash discount.`);
    else
      errors.push(
        'Total benefit value exceeds the commercial ceiling. Enable an explicit perks exception or reduce benefits.',
      );
  }
  const expectedBuyers = cash.expectedBuyers;
  const expectedBenefitCost = expectedBuyers === null ? null : benefitCost * expectedBuyers;
  const discountCost =
    expectedBuyers === null || cash.sellingPrice === null ? null : (cash.discountAmount + benefitCost) * expectedBuyers;
  const contributionMargin =
    cash.sellingPrice === null || expectedBuyers === null || !economicsComplete
      ? null
      : (cash.sellingPrice - Math.max(0, input.variableCost || 0) - benefitCost) * expectedBuyers -
        Math.max(0, finite(input.campaignBudget));
  const unitContribution =
    cash.sellingPrice === null || !economicsComplete
      ? null
      : cash.sellingPrice - Math.max(0, input.variableCost || 0) - benefitCost;
  const breakEvenBuyers =
    unitContribution && unitContribution > 0
      ? ceilCount(Math.max(0, finite(input.campaignBudget)) / unitContribution)
      : null;
  const classUnits = input.mechanism === 'buy_x_for_y' ? bundleQuantity : Math.max(0, finite(input.sessionsIncluded));
  const expectedClasses =
    expectedBuyers === null
      ? null
      : expectedBuyers *
        (classUnits +
          Math.max(0, finite(input.bonusClasses)) +
          Math.max(0, finite(input.guestPasses)) +
          Math.max(0, finite(input.hostedClasses)));
  if (
    input.capacityClasses !== undefined &&
    input.capacityClasses !== null &&
    expectedClasses !== null &&
    expectedClasses > input.capacityClasses
  )
    warnings.push(`Expected class usage exceeds the stated capacity of ${input.capacityClasses}.`);
  if (input.mechanism === 'free_trial' || (cash.sellingPrice === 0 && input.targetRevenue > 0))
    warnings.push(
      'This is a free/acquisition experience with no direct offer revenue. Measure downstream purchase conversion separately.',
    );
  return {
    ...cash,
    effectiveDiscountPercent,
    discountCost,
    contributionMargin,
    breakEvenBuyers,
    economicsComplete,
    errors: [...cash.errors, ...errors],
    warnings: [...cash.warnings.filter(item => !item.startsWith('Contribution economics are incomplete')), ...warnings],
    referenceValue,
    benefitValue,
    benefitCost,
    expectedBenefitCost,
    expectedClasses,
    totalDiscountPercent: discountPercent,
    customerValue: referenceValue,
  };
}

export interface GoalStreamInput {
  key: 'renewal' | 'reactivation' | 'new_client' | 'additional';
  audience: number;
  conversionRate: number;
  averageSpend: number;
}
export function solveRevenueGoal(target: number, actual: number, streams: GoalStreamInput[]) {
  const gap = Math.max(0, target - actual);
  let remaining = gap;
  const allocations = streams.map(stream => {
    const feasibleBuyers = Math.floor(Math.max(0, stream.audience) * Math.min(1, Math.max(0, stream.conversionRate)));
    const potentialRevenue = feasibleBuyers * Math.max(0, stream.averageSpend);
    const contribution = Math.min(remaining, potentialRevenue);
    const buyers = stream.averageSpend > 0 ? Math.ceil(contribution / stream.averageSpend) : null;
    remaining = Math.max(0, remaining - contribution);
    return {
      ...stream,
      feasibleBuyers,
      potentialRevenue,
      contribution,
      buyers,
      requiredOutreach:
        stream.conversionRate > 0 && buyers !== null ? Math.ceil(buyers / Math.min(1, stream.conversionRate)) : null,
    };
  });
  return {
    gap,
    allocations,
    uncoveredGap: remaining,
    coveragePercent: gap > 0 ? ((gap - remaining) / gap) * 100 : 100,
  };
}

export function fingerprintOffer(value: {
  studioId: number;
  month: number;
  objective: string;
  segment: string;
  mechanism: string;
  discountPercent: number;
  productId?: number | null;
}) {
  return [
    value.studioId,
    value.month,
    value.objective,
    value.segment,
    value.mechanism,
    Math.round(value.discountPercent),
    value.productId || 0,
  ].join('|');
}
