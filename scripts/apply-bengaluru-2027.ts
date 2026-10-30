/* Apply the Bengaluru 2027 plan (Kenkere House + Pop-up) to the database.

   Run with `npm run plan:bengaluru`. It is idempotent: rows this importer created are
   replaced, everything else for these two studios in 2027 is archived rather than
   deleted, so a previous plan can be recovered from the offers table.

   What it writes:
     · one offer per row of the studio's sheet, with the source's own prices, units,
       expected revenue and rationale;
     · one monthly plan per campaign, with the campaign theme, the offers in plan order,
       and the newcomer / lapsed / renewal slots filled from the rows themselves.
*/
import { db, audit } from '../server/db.js';
import { CAMPAIGNS, CAMPAIGN_NOTES, OFFERS, type PlanOffer } from '../server/lib/bengaluru2027.js';

const YEAR = 2027;
const SOURCE = 'bengaluru_plan_2027';
const STUDIOS = ['Kenkere House', 'Pop-up'] as const;

const money = (v: number) =>
  `₹${(v / 100000).toLocaleString('en-IN', { maximumFractionDigits: v >= 1000000 ? 1 : 2 })}L`;
const int = (v: number) => Math.round(v).toLocaleString('en-IN');

const studioIds = new Map(
  (db.prepare('SELECT id,name FROM studios').all() as any[]).map(row => [row.name as string, row.id as number]),
);

const missing = STUDIOS.filter(name => !studioIds.has(name));
if (missing.length) throw new Error(`Studio(s) not found: ${missing.join(', ')}`);

// ── 1. Archive everything these two studios currently hold for 2027 ─────────
const archiveRun = db
  .prepare(
    `UPDATE offers SET status='archived', updated_at=CURRENT_TIMESTAMP
     WHERE year=? AND studio_id IN (${STUDIOS.map(() => '?').join(',')})
       AND generation_source != ? AND status != 'archived'`,
  )
  .run(YEAR, ...STUDIOS.map(n => studioIds.get(n)), SOURCE);
console.log(`Archived ${archiveRun.changes} previous 2027 offers for ${STUDIOS.join(' + ')}.`);

// Re-runs replace their own rows outright.
const previousRun = db
  .prepare(
    `DELETE FROM offers WHERE year=? AND generation_source=? AND studio_id IN (${STUDIOS.map(() => '?').join(',')})`,
  )
  .run(YEAR, SOURCE, ...STUDIOS.map(n => studioIds.get(n)));
if (previousRun.changes) console.log(`Replaced ${previousRun.changes} rows from a previous run.`);

// ── 2. Insert the offers ───────────────────────────────────────────────────
const insert = db.prepare(`
  INSERT INTO offers(
    offer_uid,name,headline,customer_copy,internal_description,rationale,objective,offer_type,
    studio_id,month,year,audience,benefit,mechanics,validity_start,validity_end,redemption_conditions,
    target_purchases,expected_asp,expected_revenue,effective_discount,revenue_target,
    status,approval_status,generation_source,data_mode,financials,risks,success_metrics,provenance,
    plan_slot,plan_rank
  ) VALUES (
    @offer_uid,@name,@headline,@customer_copy,@internal_description,@rationale,@objective,@offer_type,
    @studio_id,@month,@year,@audience,@benefit,@mechanics,@validity_start,@validity_end,@redemption_conditions,
    @target_purchases,@expected_asp,@expected_revenue,@effective_discount,@revenue_target,
    'draft','pending',@generation_source,'user',@financials,'[]',@success_metrics,@provenance,
    @plan_slot,@plan_rank
  )
`);

const rankWithin = new Map<string, number>();
const inserted: { id: number; studio: string; month: number; name: string; revenue: number | null; units: number | null; slot: string | null }[] = [];

const writeAll = db.transaction((rows: PlanOffer[]) => {
  for (const row of rows) {
    const key = `${row.studio}:${row.month}`;
    const rank = (rankWithin.get(key) || 0) + 1;
    rankWithin.set(key, rank);
    const studioId = studioIds.get(row.studio)!;
    const campaign = CAMPAIGNS[row.studio]?.[row.month] || null;
    const discount = row.discountPct ?? null;
    const result = insert.run({
      offer_uid: `BLR-${YEAR}-${row.studio === 'Pop-up' ? 'POP' : 'KH'}-${String(row.month).padStart(2, '0')}-${String(rank).padStart(2, '0')}`,
      name: row.name,
      headline: null,
      customer_copy: row.gets,
      internal_description: `${row.mechanic}. Base product: ${row.baseProduct}.`,
      rationale: row.why ? `Why: ${row.why}` : null,
      objective: row.objective,
      offer_type: row.type,
      studio_id: studioId,
      month: row.month,
      year: YEAR,
      audience: row.audience,
      benefit: row.gets,
      mechanics: JSON.stringify({
        mechanic: row.mechanic,
        baseProduct: row.baseProduct,
        window: row.window,
        ...(row.fixedPrice != null ? { fixedPrice: row.fixedPrice } : {}),
        ...(row.bonusValue != null ? { bonusValue: row.bonusValue } : {}),
      }),
      validity_start: row.start ?? null,
      validity_end: row.end ?? null,
      redemption_conditions: row.fixedPrice != null && row.listPrice ? `Fixed price ${row.window}.` : null,
      target_purchases: row.units ?? null,
      expected_asp: row.offerPrice ?? row.fixedPrice ?? null,
      expected_revenue: row.revenue ?? null,
      effective_discount: discount,
      revenue_target: row.revenue ?? null,
      generation_source: SOURCE,
      financials: JSON.stringify({
        // The plan treats financials.expectedRevenue as the modelled figure; keeping it
        // equal to the supplied revenue means the card never flags the forecast as stale.
        expectedRevenue: row.revenue ?? null,
        expectedBuyers: row.units ?? null,
        expectedAsp: row.offerPrice ?? row.fixedPrice ?? null,
        listPrice: row.listPrice ?? null,
        discountPct: discount,
        fixedPrice: row.fixedPrice ?? null,
        offerPrice: row.offerPrice ?? null,
        bonusValue: row.bonusValue ?? null,
        totalValuePct: row.totalValuePct ?? null,
      }),
      success_metrics: JSON.stringify(
        [
          row.units != null ? `${int(row.units)} units` : null,
          row.revenue != null ? `${money(row.revenue)} expected` : null,
        ].filter(Boolean),
      ),
      provenance: JSON.stringify({
        source: SOURCE,
        campaign,
        mechanic: row.mechanic,
        baseProduct: row.baseProduct,
        window: row.window,
        listPrice: row.listPrice ?? null,
        discountPct: discount,
        fixedPrice: row.fixedPrice ?? null,
        offerPrice: row.offerPrice ?? null,
        bonusValue: row.bonusValue ?? null,
        totalValuePct: row.totalValuePct ?? null,
        pricing: {
          product: row.baseProduct,
          discount: discount != null ? discount / 100 : undefined,
          customListPrice: row.listPrice ?? null,
        },
        recommended: true,
        recommendedMonths: [row.month],
      }),
      plan_slot: row.slot,
      plan_rank: rank,
    });
    inserted.push({
      id: Number(result.lastInsertRowid),
      studio: row.studio,
      month: row.month,
      name: row.name,
      revenue: row.revenue ?? null,
      units: row.units ?? null,
      slot: row.slot,
    });
  }
});
writeAll(OFFERS);
console.log(`Inserted ${inserted.length} offers.`);

// ── 2b. The same sheet as bank templates ───────────────────────────────────
// The offer bank holds the studio's catalogue — offers not yet tied to a month — so the
// bank view and the rail still have something to browse and reuse. Templates carry no
// month, so they never count toward a month's coverage.
const templateRank = new Map<string, number>();
const templateRun = db.transaction((rows: PlanOffer[]) => {
  for (const row of rows) {
    const tRank = (templateRank.get(row.studio) || 0) + 1;
    templateRank.set(row.studio, tRank);
    const studioId = studioIds.get(row.studio)!;
    const campaign = CAMPAIGNS[row.studio]?.[row.month] || null;
    const discount = row.discountPct ?? null;
    insert.run({
      offer_uid: `BLR-${YEAR}-${row.studio === 'Pop-up' ? 'POP' : 'KH'}-TPL-${String(tRank).padStart(2, '0')}`,
      name: row.name,
      headline: null,
      customer_copy: row.gets,
      internal_description: `${row.mechanic}. Base product: ${row.baseProduct}.`,
      rationale: row.why ? `Why: ${row.why}` : null,
      objective: row.objective,
      offer_type: row.type,
      studio_id: studioId,
      month: null,
      year: YEAR,
      audience: row.audience,
      benefit: row.gets,
      mechanics: JSON.stringify({ mechanic: row.mechanic, baseProduct: row.baseProduct, window: row.window }),
      validity_start: null,
      validity_end: null,
      redemption_conditions: null,
      target_purchases: row.units ?? null,
      expected_asp: row.offerPrice ?? row.fixedPrice ?? null,
      expected_revenue: row.revenue ?? null,
      effective_discount: discount,
      revenue_target: row.revenue ?? null,
      generation_source: SOURCE,
      financials: JSON.stringify({
        expectedRevenue: row.revenue ?? null,
        expectedBuyers: row.units ?? null,
        expectedAsp: row.offerPrice ?? row.fixedPrice ?? null,
        listPrice: row.listPrice ?? null,
        discountPct: discount,
        bonusValue: row.bonusValue ?? null,
        totalValuePct: row.totalValuePct ?? null,
      }),
      success_metrics: JSON.stringify(row.units != null ? [`${int(row.units)} units`] : []),
      provenance: JSON.stringify({
        source: SOURCE,
        role: 'template',
        campaign,
        mechanic: row.mechanic,
        baseProduct: row.baseProduct,
        window: row.window,
        pricing: {
          product: row.baseProduct,
          discount: discount != null ? discount / 100 : undefined,
          customListPrice: row.listPrice ?? null,
        },
      }),
      plan_slot: row.slot,
      plan_rank: null,
    });
  }
});
templateRun(OFFERS);
console.log(`Added ${OFFERS.length} bank templates.`);

// ── 3. Rebuild each month's plan around its campaign ───────────────────────
const upsertPlan = db.prepare(`
  INSERT INTO monthly_plans(studio_id,year,month,theme,objective,strategy,actions,notes,status,offer_ids,slots,content,updated_by)
  VALUES (?,?,?,?,?,?,'[]',?,'draft',?,?,NULL,NULL)
  ON CONFLICT(studio_id,year,month) DO UPDATE SET
    theme=excluded.theme,objective=excluded.objective,strategy=excluded.strategy,notes=excluded.notes,
    status=excluded.status,offer_ids=excluded.offer_ids,slots=excluded.slots,updated_at=CURRENT_TIMESTAMP
`);

const planMonths = new Set(inserted.map(row => `${row.studio}:${row.month}`));
let plansWritten = 0;

for (const studio of STUDIOS) {
  const months = [...planMonths]
    .filter(key => key.startsWith(`${studio}:`))
    .map(key => Number(key.split(':')[1]))
    .sort((a, b) => a - b);
  for (const month of months) {
    const rows = inserted.filter(row => row.studio === studio && row.month === month);
    const campaign = CAMPAIGNS[studio]?.[month] || `Campaign ${month}/${YEAR}`;
    const quantified = rows.filter(row => row.revenue != null);
    const total = quantified.reduce((sum, row) => sum + (row.revenue || 0), 0);
    const units = rows.reduce((sum, row) => sum + (row.units || 0), 0);

    // Slots are filled from the sheet's own audiences; anything else becomes a listed offer.
    const slots: Record<string, number> = {};
    for (const slot of ['newcomer', 'lapsed', 'renewal'] as const) {
      const hit = rows.find(row => row.slot === slot);
      if (hit) slots[slot] = hit.id;
    }
    const extras = rows.filter(row => !Object.values(slots).includes(row.id)).map(row => row.id);

    const objective =
      `${campaign}. ${rows.length} offer${rows.length === 1 ? '' : 's'}` +
      (quantified.length
        ? ` carrying ${money(total)}${rows.some(r => r.units != null) ? ` across ${int(units)} units` : ''}.`
        : ' — units and revenue to be agreed.') +
      (quantified.length < rows.length
        ? ` ${rows.length - quantified.length} offer${rows.length - quantified.length === 1 ? '' : 's'} still unpriced.`
        : '');

    const notes = CAMPAIGN_NOTES[studio]?.filter(n => n.month === month).map(n => n.note) || [];

    const strategy = [
      `# ${campaign}`,
      '',
      ...OFFERS.filter(row => row.studio === studio && row.month === month).map(row => {
        const money = row.revenue != null ? ` · ${row.revenue < 0 ? '-' : ''}${`₹${Math.abs(row.revenue).toLocaleString('en-IN')}`}` : ' · unpriced';
        const units = row.units != null ? ` · ${row.units} units` : '';
        return `• **${row.name}** — ${row.mechanic}. ${row.baseProduct}; ${row.window}.${units}${money}${row.why ? `\n  Why: ${row.why}` : ''}`;
      }),
      ...(notes.length ? ['', ...notes.map(note => `> ${note}`)] : []),
    ].join('\n');

    upsertPlan.run(
      studioIds.get(studio),
      YEAR,
      month,
      campaign,
      objective,
      strategy,
      [
        `Imported from the studio's 2027 campaign sheet on ${new Date().toISOString().slice(0, 10)}.`,
        ...(notes.length ? notes : []),
      ].join('\n'),
      JSON.stringify(extras),
      JSON.stringify(slots),
    );
    plansWritten++;
  }
}
console.log(`Wrote ${plansWritten} monthly plans.`);

// Months the sheet does not cover: any plan left over from the previous catalogue is
// emptied, so nothing points at an offer that is no longer live.
const clearPlan = db.prepare(`
  UPDATE monthly_plans SET theme=NULL, objective=NULL, strategy=NULL, notes=NULL,
    status='draft', slots='{}', offer_ids='[]', updated_at=CURRENT_TIMESTAMP
  WHERE studio_id=? AND year=? AND month=?
`);
let cleared = 0;
for (const studio of STUDIOS) {
  for (let month = 1; month <= 12; month++) {
    if (planMonths.has(`${studio}:${month}`)) continue;
    const result = clearPlan.run(studioIds.get(studio), YEAR, month);
    cleared += result.changes;
  }
}
if (cleared) console.log(`Cleared ${cleared} plan(s) for months with no campaign.`);

audit({
  userId: null,
  action: 'import',
  entityType: 'bengaluru_plan_2027',
  entityId: String(YEAR),
  studioId: studioIds.get('Kenkere House') || null,
  after: { offers: inserted.length, plans: plansWritten, source: SOURCE },
});

// ── 4. Report what landed ──────────────────────────────────────────────────
console.log('\nBengaluru 2027 plan\n');
const byMonth = new Map<string, typeof inserted>();
for (const row of inserted) {
  const key = `${row.month}`.padStart(2, '0');
  byMonth.set(key, [...(byMonth.get(key) || []), row]);
}
for (const [month, rows] of [...byMonth.entries()].sort()) {
  const total = rows.reduce((sum, row) => sum + (row.revenue || 0), 0);
  const unpriced = rows.filter(row => row.revenue == null).length;
  console.log(
    `  ${month}  ${String(rows.length).padStart(2)} offers  ${total < 0 ? '-' : ''}${money(Math.abs(total)).padEnd(9)}` +
      `${unpriced ? `  (${unpriced} unpriced)` : ''}`,
  );
  for (const row of rows) {
    const figure = row.revenue == null ? '—' : row.revenue < 0 ? `-${money(-row.revenue)}` : money(row.revenue);
    console.log(`      · ${row.studio === 'Pop-up' ? '[Pop-up] ' : ''}${row.name}${row.slot ? ` (${row.slot})` : ''} — ${figure}`);
  }
}
console.log(
  `\n${inserted.length} offers · ${plansWritten} plans · ${money(inserted.reduce((s, r) => s + (r.revenue || 0), 0))} expected across the year.`,
);
