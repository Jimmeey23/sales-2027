import { db } from '../db.js';
import { calculateOffer, type OfferInput, type OfferMechanism } from './calculations.js';

export const SERVICE_EXCLUSIONS = ['Retail','Money Credits','Gift Cards','Others'];
export const DEFAULT_ANNUAL_PERKS = { privateSessions: 2, guestPasses: 4, hostedClasses: 1, trainerConsultations: 12, privateSessionMinutes: 60 };
export type CommercialKind = 'newcomer_2_for_1'|'newcomer_3_for_2'|'intro_pack'|'paid_trial'|'free_trial'|'first_membership'|'lapsed_return'|'class_pack'|'annual'|'six_month'|'student'|'custom';

export function json(value: unknown, fallback: any = {}) { try { return JSON.parse(String(value)); } catch { return fallback; } }
export function getPolicy(studioId: number) {
  const row = db.prepare('SELECT p.*,s.name studio_name,s.code studio_code,s.max_discount_percent studio_cap,s.monthly_capacity FROM studios s LEFT JOIN studio_offer_policies p ON p.studio_id=s.id WHERE s.id=? AND s.active=1').get(studioId) as any;
  if (!row) throw Object.assign(new Error('Studio not found.'), { status: 404 });
  return { ...row, studio_id: studioId, formats: json(row.formats, []), trial_journey: json(row.trial_journey, {}), annual_perks: { ...DEFAULT_ANNUAL_PERKS, ...json(row.annual_perks, {}) },
    first_membership_discount: row.first_membership_discount ?? 15, lapsed_return_discount: row.lapsed_return_discount ?? 15,
    class_pack_discount: row.class_pack_discount ?? 10, annual_discount: row.annual_discount ?? 20, six_month_discount: row.six_month_discount ?? 15,
    newcomer_max_discount_percent: row.newcomer_max_discount_percent ?? row.studio_cap ?? 20, default_stacking_rule: row.default_stacking_rule || 'not_stackable' } as any;
}
export function getProduct(id?: number | null) {
  if (!id) return null;
  return db.prepare(`SELECT p.*,s.name catalogue_studio_name,s.code catalogue_studio_code FROM products p JOIN studios s ON s.id=p.studio_id WHERE p.id=? AND p.active=1`).get(id) as any;
}
function ownProducts(studioId: number) {
  return db.prepare(`SELECT p.*,s.name catalogue_studio_name,s.code catalogue_studio_code FROM products p JOIN studios s ON s.id=p.studio_id
    WHERE p.studio_id=? AND p.active=1 AND p.list_price>0 AND p.category NOT IN (${SERVICE_EXCLUSIONS.map(() => '?').join(',')}) ORDER BY p.list_price,p.name`).all(studioId, ...SERVICE_EXCLUSIONS) as any[];
}
export function commercialCatalog(studioId: number) {
  const policy = getPolicy(studioId), own = ownProducts(studioId);
  const configuredIds = [...new Set<number>(['intro_product_id','newcomer_product_id','single_class_product_id','private_product_id','virtual_private_product_id','retail_product_id'].map(key => policy[key]).filter((value): value is number => Boolean(value)))];
  const external = configuredIds.map(id => getProduct(id)).filter(p => p && p.studio_id !== studioId && !own.some(o => o.id === p.id));
  const products = [...own, ...external].map(p => ({ ...p, catalogue_source: p.studio_id === studioId ? 'own_studio' : 'hosted_catalogue',
    provenance_note: p.studio_id === studioId ? 'Product and MRP from this studio’s imported product master.' : `Hosted catalogue MRP at ${p.catalogue_studio_name}; not evidence of sales at the selected studio.` }));
  return { policy, products, configuredProductIds: configuredIds, generatedAt: new Date().toISOString() };
}
function requiredProduct(id: number | null | undefined, label: string) {
  const product = getProduct(id);
  if (!product || !(product.list_price > 0)) throw Object.assign(new Error(`${label} requires an active product with a verified MRP. Configure the studio policy first.`), { status: 422 });
  return product;
}
function inferClasses(product: any) {
  const match = String(product.name).match(/(?:^|\D)(\d{1,3})\s*(?:single\s*)?(?:class|session)/i);
  if (match) return Number(match[1]);
  if (/single class|drop[ -]?in|trial/i.test(product.name)) return 1;
  return 0;
}
function productSource(product: any, studioId: number) {
  return { productId: product.id, productName: product.name, mrp: product.list_price, catalogueStudioId: product.studio_id,
    catalogueStudio: product.catalogue_studio_name, source: product.studio_id === studioId ? 'own_studio_product_master' : 'explicit_hosted_catalogue',
    caveat: product.studio_id === studioId ? null : 'Catalogue MRP only; no partner-studio transaction actuals are inferred.' };
}
function chooseProduct(studioId: number, predicate: (p: any) => boolean) { return ownProducts(studioId).find(predicate) || null; }
function monthDates(year: number, month: number, days = 30) {
  const start = `${year}-${String(month).padStart(2,'0')}-01`;
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { start, end: `${year}-${String(month).padStart(2,'0')}-${String(Math.min(days,last)).padStart(2,'0')}` };
}
function membershipProducts(studioId: number) { return ownProducts(studioId).filter(p => /membership/i.test(p.category) || /membership|unlimited/i.test(p.name)); }
function representativeMembership(studioId: number, kind: string) {
  const products = membershipProducts(studioId);
  if (kind === 'annual') { const matches = products.filter(p => /annual|12[ -]?month|year/i.test(p.name) && !/install|intsall|monthly/i.test(p.name)); return matches.find(p => p.source === 'membership_catalogue') || matches[0]; }
  if (kind === 'six_month') { const matches = products.filter(p => /6[ -]?month|six[ -]?month/i.test(p.name)); return matches.find(p => p.source === 'membership_catalogue') || matches[0]; }
  const matches = products.filter(p => /1[ -]?month|30[ -]?day|monthly/i.test(p.name) && !/annual|install|intsall/i.test(p.name));
  return matches.find(p => p.source === 'membership_catalogue') || matches[0] || products[0];
}

export interface CommercialRequest {
  studioId: number; kind: CommercialKind; year: number; month: number; productId?: number; pricingProductId?: number;
  name?: string; headline?: string; customerCopy?: string; discountPercent?: number; fixedDiscount?: number;
  eligibleAudience?: number; redemptionRate?: number; targetRevenue?: number; durationDays?: number;
  format?: string; conditionType?: OfferInput['conditionType']; conditionValue?: string; minimumSpend?: number;
  mechanics?: Partial<OfferInput>; lifetimeRedemptionLimit?: number | null; allowPerksBeyondDiscountCap?: boolean;
}

export function buildCommercialOffer(request: CommercialRequest) {
  const policy = getPolicy(request.studioId), studio = db.prepare('SELECT * FROM studios WHERE id=?').get(request.studioId) as any;
  const kind = request.kind;
  let product: any, pricingProduct: any, eligibleProducts: number[] = [], mechanism: OfferMechanism = 'percentage';
  let discount = request.discountPercent ?? 0, fixedDiscount = request.fixedDiscount ?? 0, bundleQuantity: number | undefined, paidQuantity: number | undefined;
  let audience = 'New clients', objective = 'acquisition', name = request.name, benefit = '', conditionType = request.conditionType || 'none';
  let lifetimeRedemptionLimit = request.lifetimeRedemptionLimit;
  let mechanics: Partial<OfferInput> = { ...(request.mechanics || {}) };
  let formatCondition = request.format ? `Valid for ${request.format} only.` : '';
  if (kind === 'newcomer_2_for_1' || kind === 'newcomer_3_for_2') {
    pricingProduct = requiredProduct(request.pricingProductId || policy.single_class_product_id, 'Newcomer bundle pricing');
    const fulfilment = kind === 'newcomer_2_for_1' && policy.newcomer_product_id ? requiredProduct(policy.newcomer_product_id, 'Newcomer fulfilment') : pricingProduct;
    product = request.productId ? requiredProduct(request.productId, 'Newcomer fulfilment') : fulfilment;
    eligibleProducts = [product.id]; mechanism = 'buy_x_for_y'; bundleQuantity = kind === 'newcomer_2_for_1' ? 2 : 3; paidQuantity = 2;
    if (kind === 'newcomer_2_for_1') paidQuantity = 1;
    lifetimeRedemptionLimit ??= policy.newcomer_lifetime_limit ?? null;
    name ||= kind === 'newcomer_2_for_1' ? 'Twice the Burn. One First Step.' : 'Three Classes. Two Tickets. One Strong Start.';
    benefit = kind === 'newcomer_2_for_1' ? `Two ${request.format || 'eligible'} classes for the price of one` : `Three ${request.format || 'eligible'} classes for the price of two`;
    conditionType = 'newcomer';
    mechanics = { ...mechanics, pricingProductId: pricingProduct.id, fulfilmentProductId: product.id } as any;
  } else if (['intro_pack','paid_trial','free_trial'].includes(kind)) {
    product = requiredProduct(request.productId || policy.intro_product_id || policy.single_class_product_id, 'Trial journey');
    pricingProduct = kind === 'intro_pack' ? requiredProduct(request.pricingProductId || policy.single_class_product_id, 'Intro-pack single-class reference') : product;
    eligibleProducts = [product.id];
    if (kind === 'intro_pack') { mechanism = 'fixed'; discount = 0; fixedDiscount = request.fixedDiscount ?? pricingProduct.list_price * .5; name ||= `The ${studio.name} First Hello`; benefit = `50% off the first-class ${product.name}`; }
    if (kind === 'paid_trial') { mechanism = 'fixed'; fixedDiscount = request.fixedDiscount ?? 0; name ||= 'A Considered First Class'; benefit = `A paid first-class trial at ₹${Number(product.list_price - fixedDiscount).toLocaleString('en-IN')}`; }
    if (kind === 'free_trial') { mechanism = 'free_trial'; fixedDiscount = product.list_price; name ||= 'Your First Barre Is on Us'; benefit = `One complimentary ${request.format || 'Barre'} trial class`; conditionType = 'newcomer'; }
    if (conditionType === 'none') conditionType = 'newcomer'; lifetimeRedemptionLimit ??= 1;
  } else if (kind === 'first_membership' || kind === 'annual' || kind === 'six_month') {
    product = requiredProduct(request.productId || representativeMembership(request.studioId, kind)?.id, `${kind.replaceAll('_',' ')} offer`); pricingProduct = product;
    const memberships = membershipProducts(request.studioId);
    const annualMatches = memberships.filter(p => /annual|12[ -]?month|year/i.test(p.name) && !/install|intsall|monthly/i.test(p.name));
    const sixMatches = memberships.filter(p => /6[ -]?month|six[ -]?month/i.test(p.name));
    eligibleProducts = kind === 'first_membership' ? (memberships.length ? memberships.map(p => p.id) : [product.id])
      : kind === 'annual' ? (annualMatches.length ? annualMatches.map(p => p.id) : [product.id])
      : kind === 'six_month' ? (sixMatches.length ? sixMatches.map(p => p.id) : [product.id]) : [product.id];
    if (kind === 'first_membership') { discount = request.discountPercent ?? policy.first_membership_discount; name ||= 'Your First Membership, Properly Welcomed'; benefit = `${discount}% off a newcomer’s first eligible membership`; conditionType = 'newcomer'; lifetimeRedemptionLimit ??= 1; }
    if (kind === 'annual') {
      discount = request.discountPercent ?? policy.annual_discount; name ||= 'The Year of Strong'; objective = 'retention'; audience = 'Eligible renewing and new annual members';
      const perks = policy.annual_perks, privateProduct = getProduct(policy.private_product_id), single = getProduct(policy.single_class_product_id);
      mechanics = { ...mechanics, privateSessions: perks.privateSessions, privateSessionMinutes: perks.privateSessionMinutes || 60,
        privateSessionValue: privateProduct?.list_price || 0, privateSessionCost: privateProduct?.variable_cost,
        guestPasses: perks.guestPasses, guestPassValue: single?.list_price || 0, guestPassCost: single?.variable_cost,
        hostedClasses: perks.hostedClasses, hostedClassValue: single?.list_price || 0, hostedClassCost: single?.variable_cost,
        trainerConsultations: perks.trainerConsultations, trainerConsultationValue: 0, trainerConsultationCost: null,
        allowPerksBeyondDiscountCap: true };
      benefit = `${discount}% off plus ${perks.privateSessions} private sessions, ${perks.guestPasses} guest passes, ${perks.hostedClasses} hosted class and monthly trainer check-ins`;
    }
    if (kind === 'six_month') { discount = request.discountPercent ?? policy.six_month_discount; name ||= 'Six Months. Fully In.'; objective = 'retention'; audience = 'Eligible six-month unlimited buyers'; benefit = `${discount}% off the six-month unlimited membership`; }
  } else if (kind === 'lapsed_return') {
    product = requiredProduct(request.productId || policy.single_class_product_id || ownProducts(request.studioId)[0]?.id, 'Lapsed-return offer'); pricingProduct = product;
    const eligible = ownProducts(request.studioId); eligibleProducts = (eligible.length ? eligible : [product]).map(p => p.id);
    discount = request.discountPercent ?? policy.lapsed_return_discount; name ||= 'Your Comeback, Kept Simple'; objective = 'reactivation'; audience = 'Lapsed members making their first purchase back';
    benefit = `${discount}% off a lapsed member’s first purchase back`; conditionType = 'lapsed_return'; lifetimeRedemptionLimit ??= 1;
  } else if (kind === 'class_pack') {
    product = requiredProduct(request.productId, 'Class-pack offer'); pricingProduct = product; eligibleProducts = [product.id];
    discount = request.discountPercent ?? policy.class_pack_discount; name ||= `${inferClasses(product) || 'Class'} Sessions. One Smart Commitment.`; objective = 'additional_purchase'; audience = 'Eligible class-pack buyers';
    benefit = `${discount}% off ${product.name}`;
  } else if (kind === 'student') {
    product = requiredProduct(request.productId || policy.single_class_product_id, 'Student offer'); pricingProduct = product; eligibleProducts = [product.id];
    discount = request.discountPercent ?? 10; name ||= 'Strong Between the Seminars'; benefit = `${discount}% off ${product.name} for verified students`; conditionType = 'student';
    mechanics.conditionValue = request.conditionValue || 'Current student ID from a recognised institution; verify at purchase.';
  } else {
    product = requiredProduct(request.productId, 'Custom offer'); pricingProduct = requiredProduct(request.pricingProductId || product.id, 'Custom pricing'); eligibleProducts = [product.id];
    mechanism = (request.mechanics?.mechanism || 'percentage') as OfferMechanism; name ||= 'A Studio Original';
    benefit = request.customerCopy || 'A custom studio offer with explicitly configured benefits and conditions';
  }
  const targetRow = db.prepare('SELECT * FROM monthly_targets WHERE studio_id=? AND year=? AND month=?').get(request.studioId, request.year, request.month) as any;
  const targetRevenue = request.targetRevenue ?? Math.round(Number(targetRow?.approved_target ?? targetRow?.proposed_target ?? product.list_price * 30) * .05);
  const eligibleAudience = request.eligibleAudience ?? 250;
  const audienceSource = request.eligibleAudience === undefined ? 'scenario_assumption' : 'user_assumption';
  const maxDiscountPercent = kind === 'free_trial' ? 100 : ['newcomer_2_for_1','newcomer_3_for_2','intro_pack'].includes(kind) ? Math.max(policy.newcomer_max_discount_percent, 50)
    : Math.min(policy.studio_cap || 50, kind === 'annual' ? policy.annual_discount : kind === 'six_month' ? policy.six_month_discount : kind === 'first_membership' || kind === 'lapsed_return' ? 15 : policy.studio_cap || 20);
  const input: OfferInput = { listedPrice: pricingProduct.list_price, mechanism, discountPercent: discount, fixedDiscount,
    bundleQuantity, paidQuantity, targetRevenue, eligibleAudience, redemptionRate: request.redemptionRate ?? .1, conversionRate: 1,
    maxDiscountPercent, variableCost: product.variable_cost, campaignBudget: 0,
    capacityBuyers: studio.monthly_capacity ? Math.floor(studio.monthly_capacity * .1) : null,
    sessionsIncluded: inferClasses(product), conditionType, conditionValue: request.conditionValue,
    minimumSpend: request.minimumSpend, lifetimeRedemptionLimit, stackingRule: policy.default_stacking_rule,
    pricingProductId: pricingProduct.id, fulfilmentProductId: product.id,
    ...mechanics, policyKind: kind, format: request.format };
  validateStudioOfferPolicy(request.studioId,input,eligibleProducts);
  const financials = calculateOffer(input), dates = monthDates(request.year, request.month, request.durationDays || 30);
  const provenance = { pricing: productSource(pricingProduct, request.studioId), fulfilment: productSource(product, request.studioId), policyStudioId: request.studioId,
    audienceSource, targetId: targetRow?.id || null, targetSource: targetRow ? 'monthly_target_scenario' : 'product_price_scenario',
    generatedBy: 'deterministic_policy_engine', ai: false, historicalSalesUsed: false, calculatedAt: new Date().toISOString() };
  const risks = [...financials.errors, ...financials.warnings, audienceSource === 'scenario_assumption' ? 'Audience of 250 is an editable scenario assumption, not a customer count.' : null,
    'Revenue is a scenario, not an approved forecast or proven incremental lift.', 'Validate capacity, eligibility and product fulfilment before approval.'].filter(Boolean);
  const conditions = [formatCondition, conditionType === 'newcomer' ? 'New clients only; no prior eligible purchase.' : '', conditionType === 'lapsed_return' ? 'First purchase after the defined lapse window only.' : '',
    conditionType === 'student' ? String(input.conditionValue || 'Current student ID required.') : '', lifetimeRedemptionLimit ? `Maximum ${lifetimeRedemptionLimit} redemption per customer lifetime.` : '',
    input.stackingRule === 'not_stackable' ? 'Cannot be stacked with another discount or promotional benefit.' : `Stacking rule: ${input.stackingRule}.`,
    'Advance booking and studio terms apply.'].filter(Boolean).join(' ');
  return { name, headline: request.headline || `${name} — ${studio.name}`, customerCopy: request.customerCopy || `${benefit}. Available at ${studio.name}. Eligibility and redemption conditions apply.`,
    internalDescription: `Deterministic ${kind.replaceAll('_',' ')} policy concept with explicit product and MRP provenance.`,
    rationale: `${benefit}. Cash revenue is calculated from ${pricingProduct.name} MRP (₹${pricingProduct.list_price.toLocaleString('en-IN')}); complimentary value and cost are shown separately.`,
    studioId: request.studioId, studioName: studio.name, year: request.year, month: request.month, objective, offerType: input.mechanism,
    audience, excludedAudience: 'Employees, previously redeemed once-per-lifetime benefits, ineligible products/formats, and conflicting promotional redemptions.',
    eligibleProducts, productName: product.name, benefit, mechanics: input, validityStart: dates.start, validityEnd: dates.end,
    redemptionConditions: conditions, targetPurchases: financials.requiredBuyers, expectedAsp: financials.sellingPrice,
    expectedRevenue: financials.expectedRevenue, effectiveDiscount: financials.effectiveDiscountPercent, marginImpact: financials.contributionMargin,
    requiredLeads: null, requiredTrials: null, expectedConversion: input.redemptionRate, expectedRedemptions: financials.expectedRedemptions,
    revenueTarget: targetRevenue, financials, score: financials.errors.length ? 0 : 80, recommended: false, financialStatus: 'calculated_scenario',
    risks, successMetrics: ['Cash revenue versus scenario','Unique eligible buyers','Class capacity consumed','Complimentary benefit cost','90-day subsequent purchase rate'],
    cta: objective === 'reactivation' ? 'Book your comeback' : 'Start your strong chapter', provenance, generationSource: 'policy_engine' };
}

export function validateStudioOfferPolicy(studioId: number, mechanics: OfferInput, eligibleProductIds: number[] = []) {
  const policy = getPolicy(studioId), kind = mechanics.policyKind;
  const fail = (message: string) => { throw Object.assign(new Error(message), { status: 422 }); };
  const cap = mechanics.mechanism === 'free_trial' ? 100 : ['newcomer_2_for_1','newcomer_3_for_2','intro_pack'].includes(String(kind)) || mechanics.mechanism === 'buy_x_for_y' && mechanics.conditionType === 'newcomer'
    ? Math.max(50, policy.newcomer_max_discount_percent) : policy.studio_cap || 20;
  if (mechanics.format && policy.formats.length && !policy.formats.map((f: string) => f.toLowerCase()).includes(mechanics.format.toLowerCase())) fail(`${mechanics.format} is not enabled at this studio. Configured formats: ${policy.formats.join(', ')}.`);
  const format = String(mechanics.format || 'barre').toLowerCase(), journey = String(policy.trial_journey[format] || '');
  if (mechanics.mechanism === 'free_trial' && !journey.includes('free_trial')) fail(`A free trial is not part of the configured ${format} journey at ${policy.studio_name}. Use the studio’s approved paid trial, intro pack, or Newcomers 2-for-1 journey.`);
  if (mechanics.mechanism === 'free_trial' && ['Kemps Corner','Bandra'].includes(policy.studio_name) && format !== 'barre') fail('At Mumbai studios, only Barre has a free-trial option. Strength and PowerCycle require Newcomers 2-for-1.');
  if (kind === 'paid_trial' && !journey.includes('paid_trial')) fail(`A generic paid-trial journey is not configured for ${format} at ${policy.studio_name}.`);
  if ((['newcomer_2_for_1','newcomer_3_for_2'].includes(String(kind)) || mechanics.mechanism === 'buy_x_for_y' && mechanics.conditionType === 'newcomer') && !policy.newcomer_product_id) fail(`Newcomer bundles are not configured at ${policy.studio_name}. Paid-trial or unconfigured studios cannot silently substitute a single-class product.`);
  if (kind && kind !== 'custom' && !eligibleProductIds.length) fail('Select at least one eligible product for this standard policy offer.');
  const allowedExternal = new Set(['intro_product_id','newcomer_product_id','single_class_product_id','private_product_id','virtual_private_product_id','retail_product_id'].map(key => policy[key]).filter(Boolean));
  for (const productId of eligibleProductIds) {
    const product = getProduct(productId);
    if (!product) fail(`Eligible product ${productId} is missing or inactive.`);
    if (product.studio_id !== studioId && !allowedExternal.has(productId)) fail(`${product.name} belongs to another studio and is not an explicitly configured hosted-catalogue product.`);
  }
  const products = eligibleProductIds.map(id => getProduct(id)).filter(Boolean) as any[];
  const isMembership = (product: any) => /membership/i.test(product.category) || /membership|unlimited/i.test(product.name);
  if (['newcomer_2_for_1','newcomer_3_for_2'].includes(String(kind)) && mechanics.pricingProductId !== policy.single_class_product_id) fail('Newcomer bundle pricing must use the studio’s explicitly configured single-class MRP.');
  if (kind === 'newcomer_2_for_1' && (products.length !== 1 || products[0]?.id !== policy.newcomer_product_id)) fail('Newcomers 2-for-1 must use the configured newcomer fulfilment product.');
  if (kind === 'intro_pack' && policy.studio_name === 'Kenkere House' && (mechanics.pricingProductId !== policy.single_class_product_id || mechanics.fulfilmentProductId !== policy.intro_product_id)) fail('Kenkere intro pricing must reference the configured single-class MRP and intro-pack fulfilment product.');
  if (kind === 'first_membership' && products.some(product => !isMembership(product))) fail('First-membership policy can include membership products only.');
  if (kind === 'annual' && products.some(product => !/annual|12[ -]?month|year/i.test(product.name) || /install|intsall|monthly/i.test(product.name))) fail('Annual policy eligibility includes full annual memberships only, not monthly instalment products.');
  if (kind === 'six_month' && products.some(product => !/6[ -]?month|six[ -]?month/i.test(product.name))) fail('Six-month policy eligibility includes six-month unlimited products only.');
  const equal = (actual: unknown, expected: number) => Math.abs(Number(actual || 0) - expected) < 1e-8;
  if (kind === 'newcomer_2_for_1' && (mechanics.mechanism !== 'buy_x_for_y' || mechanics.bundleQuantity !== 2 || mechanics.paidQuantity !== 1 || mechanics.lifetimeRedemptionLimit !== 1)) fail('Newcomers 2-for-1 must price two classes with one paid and allow exactly one lifetime redemption.');
  if (kind === 'newcomer_3_for_2' && (mechanics.mechanism !== 'buy_x_for_y' || mechanics.bundleQuantity !== 3 || mechanics.paidQuantity !== 2)) fail('The newcomer alternative must remain three classes for the price of two.');
  if (kind === 'first_membership' && !equal(mechanics.discountPercent, policy.first_membership_discount)) fail(`First-membership discount is fixed by policy at ${policy.first_membership_discount}%.`);
  if (kind === 'lapsed_return' && (!equal(mechanics.discountPercent, policy.lapsed_return_discount) || mechanics.lifetimeRedemptionLimit !== 1)) fail(`Lapsed-return policy requires ${policy.lapsed_return_discount}% off the first purchase back and one redemption.`);
  if (kind === 'class_pack' && !equal(mechanics.discountPercent, policy.class_pack_discount)) fail(`The standard 10/20/30-class pack discount is ${policy.class_pack_discount}%.`);
  if (kind === 'annual') {
    if (!equal(mechanics.discountPercent, policy.annual_discount)) fail(`The standard annual membership discount is ${policy.annual_discount}%.`);
    for (const key of ['privateSessions','guestPasses','hostedClasses','trainerConsultations']) if (!equal((mechanics as any)[key], policy.annual_perks[key])) fail(`Annual ${key.replace(/([A-Z])/g,' $1').toLowerCase()} must match the configured policy.`);
  }
  if (kind === 'class_pack' && products.some(product => ![10,20,30].includes(inferClasses(product)))) fail('Standard class-pack policy applies only to 10, 20 and 30-class packs.');
  if (kind === 'six_month' && !equal(mechanics.discountPercent, policy.six_month_discount)) fail(`The standard six-month unlimited discount is ${policy.six_month_discount}%.`);
  if (kind === 'intro_pack' && policy.studio_name === 'Kenkere House' && !equal(mechanics.fixedDiscount, Number(mechanics.listedPrice) * .5)) fail('Kenkere New Client Intro Pack must be exactly 50% below its verified MRP.');
  if (mechanics.conditionType === 'student' && !String(mechanics.conditionValue || '').trim()) fail('Student offers require explicit eligibility and verification conditions.');
  return { cap, policy };
}

export function policyChecks(studioId: number) {
  const policy = getPolicy(studioId), checks: any[] = [];
  const add = (key: string, ok: boolean, detail: string, severity = 'error') => checks.push({ key, ok, detail, severity });
  add('formats', policy.formats.length > 0, policy.formats.length ? `Enabled formats: ${policy.formats.join(', ')}` : 'No studio formats configured.', 'warning');
  for (const [format, journey] of Object.entries(policy.trial_journey)) add(`journey_${format}`, true, `${format}: ${String(journey).replaceAll('_',' ')}`);
  for (const key of ['single_class_product_id','newcomer_product_id','intro_product_id']) if (policy[key]) {
    const product = getProduct(policy[key]); add(key, !!product && product.list_price > 0, product ? `${product.name} · MRP ₹${product.list_price}` : 'Configured product is missing or unpriced.');
  }
  const memberships = membershipProducts(studioId);
  add('membership_catalogue',memberships.length > 0,memberships.length ? `${memberships.length} priced membership options are available for first-membership eligibility.` : 'No verified own-studio membership MRP is available; first-membership offers remain blocked rather than priced by assumption.','warning');
  const packs = ownProducts(studioId).filter(product => [10,20,30].includes(inferClasses(product)));
  add('class_pack_catalogue',packs.length > 0,packs.length ? `${packs.length} eligible 10/20/30-class pack options resolved.` : 'No verified 10/20/30-class pack MRP is configured.','warning');
  return checks;
}
