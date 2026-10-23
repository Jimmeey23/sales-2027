import { db, audit } from '../db.js';
import { buildCommercialOffer, DEFAULT_ANNUAL_PERKS, type CommercialKind } from './commercial.js';

function product(studioId: number | undefined, name: string, source?: string) {
  if (!studioId) return null;
  return db.prepare(`SELECT * FROM products WHERE studio_id=? AND name=? AND active=1 AND list_price>0 ${source ? 'AND source=?' : ''} ORDER BY id LIMIT 1`).get(...(source ? [studioId,name,source] : [studioId,name])) as any;
}
function insertPolicy(studio: any, values: any, userId: number) {
  db.prepare(`INSERT OR IGNORE INTO studio_offer_policies(studio_id,formats,pricing_zone,trial_journey,intro_product_id,newcomer_product_id,single_class_product_id,
    private_product_id,virtual_private_product_id,newcomer_max_discount_percent,first_membership_discount,lapsed_return_discount,class_pack_discount,annual_discount,
    six_month_discount,annual_perks,newcomer_lifetime_limit,default_stacking_rule,notes,updated_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(studio.id, JSON.stringify(values.formats || []), values.pricingZone || (studio.city === 'Mumbai' ? 'mumbai' : studio.city === 'Bengaluru' ? 'bengaluru' : 'unconfigured'),
      JSON.stringify(values.trialJourney || {}), values.intro?.id || null, values.newcomer?.id || null, values.single?.id || null,
      values.private?.id || null, values.virtualPrivate?.id || null, values.newcomerCap ?? 50, 15, 15, 10, 20, 15,
      JSON.stringify(DEFAULT_ANNUAL_PERKS), values.lifetimeLimit ?? null, 'not_stackable', values.notes || null, userId);
}
export function ensureCommercialSeed() {
  const user = db.prepare(`SELECT id FROM users WHERE role='administrator' AND active=1 ORDER BY id LIMIT 1`).get() as any;
  if (!user) return { seeded: false, reason: 'No administrator available.' };
  const studios = db.prepare('SELECT * FROM studios WHERE active=1').all() as any[];
  const byName = Object.fromEntries(studios.map(s => [s.name,s]));
  for (const name of ['Kemps Corner','Bandra']) {
    const studio = byName[name]; if (!studio) continue;
    insertPolicy(studio, { formats: ['barre','strength','powercycle'], pricingZone: 'mumbai',
      trialJourney: { barre: 'free_trial_or_newcomers_2_for_1', strength: 'newcomers_2_for_1', powercycle: 'newcomers_2_for_1' },
      single: product(studio.id,'Studio Single Class','membership_catalogue') || product(studio.id,'Studio Single Class'),
      newcomer: product(studio.id,'Newcomers 2 For 1','membership_catalogue') || product(studio.id,'Newcomers 2 For 1'),
      private: product(studio.id,'Studio Private Class','membership_catalogue') || product(studio.id,'Studio Private Class'),
      virtualPrivate: product(studio.id,'Virtual Private Class','membership_catalogue') || product(studio.id,'Virtual Private Class'), lifetimeLimit: 1,
      notes: 'Kwality/Supreme journey: Barre may use a free trial; Strength and PowerCycle trials require Newcomers 2-for-1.' }, user.id);
  }
  const kenkere = byName['Kenkere House'];
  if (kenkere) insertPolicy(kenkere, { formats: ['barre'], pricingZone: 'bengaluru_kenkere',
    trialJourney: { barre: 'new_client_intro_pack_50_percent_or_newcomers_2_for_1' }, intro: product(kenkere.id,'New Client Intro Pack','membership_catalogue') || product(kenkere.id,'New Client Intro Pack'),
    newcomer: product(kenkere.id,'Studio Newcomer 2 for 1','membership_catalogue') || product(kenkere.id,'Studio Newcomer 2 for 1'),
    single: product(kenkere.id,'Studio Single Class','membership_catalogue') || product(kenkere.id,'Studio Single Class'),
    private: product(kenkere.id,'Studio Private Class','membership_catalogue') || product(kenkere.id,'Studio Private Class'),
    virtualPrivate: product(kenkere.id,'Virtual Private Class','membership_catalogue') || product(kenkere.id,'Virtual Private Class'), lifetimeLimit: 1,
    notes: 'New Client Intro Pack is 50% off MRP. Newcomers 2-for-1 is a separate once-per-lifetime option.' }, user.id);
  for (const [name,prefix] of [['Copper + Cloves','Copper + Cloves'],['Plash Pilates','Plash Pilates']] as const) {
    const studio = byName[name]; if (!studio || !kenkere) continue;
    insertPolicy(studio, { formats: ['barre'], pricingZone: `hosted_${prefix.toLowerCase().replaceAll(' ','_').replaceAll('+','and')}`,
      trialJourney: { barre: 'paid_trial' }, intro: product(kenkere.id,`${prefix} Single Class Package`,'membership_catalogue') || product(kenkere.id,`${prefix} Single Class Package`),
      single: product(kenkere.id,`${prefix} Single Class Package`,'membership_catalogue') || product(kenkere.id,`${prefix} Single Class Package`),
      notes: `Paid trial uses the explicitly configured Kenkere-hosted ${name} catalogue MRP. This is not ${name} sales actuals.` }, user.id);
  }
  for (const studio of studios) insertPolicy(studio, { formats: studio.city === 'Bengaluru' ? ['barre'] : [], notes: studio.city === 'Bengaluru' ? 'Bengaluru format scope: Barre only. Other journeys require explicit configuration.' : 'Standard first-membership and lapsed-return policy; configure local products and journey before launch.' }, user.id);
  const seedVersion = db.prepare(`SELECT value FROM settings WHERE key='commercial_seed_version'`).get() as any;
  if (seedVersion?.value === '1') return { seeded: false, reason: 'Standard offer seed already applied.' };
  let created = 0, experiments = 0; const issues: any[] = [];
  const create = (studioName: string, kind: CommercialKind, options: any = {}) => {
    const studio = byName[studioName]; if (!studio) return null;
    try {
      const concept = buildCommercialOffer({ studioId: studio.id, kind, year: options.year || 2027, month: options.month || 1, ...options });
      if (concept.financials.errors.length) { issues.push({ studio: studioName, kind, errors: concept.financials.errors }); return null; }
      const uid = `POLICY-${studio.code}-${kind.toUpperCase()}-${concept.eligibleProducts[0] || concept.mechanics.pricingProductId || 'MULTI'}`;
      if (db.prepare('SELECT 1 FROM offers WHERE offer_uid=?').get(uid)) return db.prepare('SELECT * FROM offers WHERE offer_uid=?').get(uid) as any;
      const row: any = { name: concept.name, headline: concept.headline, customer_copy: concept.customerCopy, internal_description: concept.internalDescription,
        rationale: concept.rationale, objective: concept.objective, offer_type: concept.offerType, studio_id: concept.studioId, month: concept.month, year: concept.year,
        audience: concept.audience, excluded_audience: concept.excludedAudience, eligible_products: JSON.stringify(concept.eligibleProducts), benefit: concept.benefit,
        mechanics: JSON.stringify(concept.mechanics), validity_start: concept.validityStart, validity_end: concept.validityEnd, redemption_conditions: concept.redemptionConditions,
        target_purchases: concept.targetPurchases, expected_asp: concept.expectedAsp, expected_revenue: concept.expectedRevenue, effective_discount: concept.effectiveDiscount,
        margin_impact: concept.marginImpact, expected_conversion: concept.expectedConversion, expected_redemptions: concept.expectedRedemptions, revenue_target: concept.revenueTarget,
        status: 'draft', approval_status: 'pending', generation_source: 'policy_engine', data_mode: 'scenario',
        performance_notes: 'Deterministic planning scenario only. No actual or incremental performance is claimed.', financials: JSON.stringify(concept.financials),
        risks: JSON.stringify(concept.risks), success_metrics: JSON.stringify(concept.successMetrics), provenance: JSON.stringify(concept.provenance), cta: concept.cta };
      const columns = Object.keys(row);
      const result = db.prepare(`INSERT INTO offers(offer_uid,created_by,${columns.join(',')}) VALUES (?,?${',?'.repeat(columns.length)})`).run(uid,user.id,...Object.values(row));
      const offer = db.prepare('SELECT * FROM offers WHERE id=?').get(result.lastInsertRowid) as any;
      db.prepare('INSERT INTO offer_versions(offer_id,version,snapshot,changed_by) VALUES (?,?,?,?)').run(offer.id,1,JSON.stringify(offer),user.id);
      created++; return offer;
    } catch (error: any) { issues.push({ studio: studioName, kind, error: error.message }); return null; }
  };
  for (const name of ['Kenkere House','Kemps Corner','Bandra']) {
    const control = create(name,'newcomer_2_for_1'), variant = create(name,'newcomer_3_for_2');
    const studio = byName[name];
    if (control && variant && !db.prepare('SELECT 1 FROM offer_experiments WHERE studio_id=? AND name=?').get(studio.id,'Monthly Newcomer Value Test')) {
      db.prepare(`INSERT INTO offer_experiments(studio_id,name,hypothesis,control_offer_id,variant_offer_id,start_date,end_date,cadence,status,minimum_sample,results,created_by)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(studio.id,'Monthly Newcomer Value Test',
        'Three classes for the price of two may improve first-month attendance and downstream conversion while preserving more cash per buyer than 2-for-1. This is a hypothesis, not a result.',
        control.id,variant.id,'2027-01-01','2027-12-31','monthly','draft',30,JSON.stringify({ note: 'No experiment outcomes yet. Record unique eligible buyers, attendance, cash revenue, benefit cost and 90-day downstream purchase by arm.' }),user.id);
      experiments++;
    }
  }
  create('Kenkere House','intro_pack');
  create('Copper + Cloves','paid_trial'); create('Plash Pilates','paid_trial');
  create('Kemps Corner','free_trial',{ format: 'barre' }); create('Bandra','free_trial',{ format: 'barre' });
  for (const studio of studios) { create(studio.name,'first_membership'); create(studio.name,'lapsed_return'); }
  for (const name of ['Kenkere House','Kemps Corner','Bandra']) {
    const studio = byName[name]; if (!studio) continue;
    for (const count of [10,20,30]) {
      const pack = product(studio.id,`Studio ${count} Single Class Pack`,'membership_catalogue') || product(studio.id,`Studio ${count} Single Class Pack`) ||
        (count === 10 ? product(studio.id,'Studio Extended 10 Single Class Pack','membership_catalogue') || product(studio.id,'Studio Extended 10 Single Class Pack') : null);
      if (pack) create(name,'class_pack',{ productId: pack.id }); else issues.push({ studio: name, kind: 'class_pack', error: `No verified ${count}-class pack MRP.` });
    }
    create(name,'annual'); create(name,'six_month'); create(name,'student');
  }
  db.prepare(`INSERT INTO settings(key,value) VALUES('commercial_seed_version','1') ON CONFLICT(key) DO UPDATE SET value='1',updated_at=CURRENT_TIMESTAMP`).run();
  db.prepare(`INSERT INTO settings(key,value) VALUES('commercial_seed_report',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=CURRENT_TIMESTAMP`).run(JSON.stringify({ created,experiments,issues,seededAt:new Date().toISOString() }));
  audit({ userId: user.id, action: 'commercial_policy_seed', entityType: 'system', after: { created,experiments,issues, note: 'Draft deterministic policy offers; no automatic approvals or performance.' } });
  return { seeded: true, created, experiments, issues };
}
