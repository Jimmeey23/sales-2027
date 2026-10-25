import crypto from 'node:crypto';
import ExcelJS from 'exceljs';
import { db, audit } from '../server/db.js';

const dryRun = process.argv.includes('--dry-run');
const file = process.argv.find((arg, index) => index > 1 && !arg.startsWith('--')) || '/Users/jimmeeygondaa/Downloads/Physique57_Offer_Bank_2027.xlsx';
const year = 2027;
const workbook = new ExcelJS.Workbook();
await workbook.xlsx.readFile(file);

const monthNumber = (value: unknown) => {
  const i = ['january','february','march','april','may','june','july','august','september','october','november','december']
    .indexOf(String(value || '').trim().toLowerCase());
  if (i < 0) throw new Error(`Unknown month: ${value}`);
  return i + 1;
};
const cellText = (value: unknown) => value == null ? '' : String(value).trim();
const studioAliases: Record<string, string[]> = {
  'Kwality House & Supreme HQ': ['Kemps Corner', 'Bandra'],
  'Kwality House': ['Kemps Corner'],
  'Kenkere House': ['Kenkere House'],
  'Copper + Cloves': ['Copper + Cloves'],
  'Plash Pilates': ['Plash Pilates'],
  'Kenkere + C+C + Plash': ['Kenkere House', 'Copper + Cloves', 'Plash Pilates'],
  'Kenkere + C+C': ['Kenkere House', 'Copper + Cloves'],
  'Kenkere House + C+C': ['Kenkere House', 'Copper + Cloves'],
  'Kenkere House + C+C + Plash': ['Kenkere House', 'Copper + Cloves', 'Plash Pilates'],
  'C+C + Kenkere': ['Copper + Cloves', 'Kenkere House'],
  'C+C + Plash': ['Copper + Cloves', 'Plash Pilates'],
};
const studios = db.prepare('SELECT id,name FROM studios').all() as { id: number; name: string }[];
const studioByName = new Map(studios.map(s => [s.name, s]));
const objectiveFor = (segment: string, type: string) => {
  const s = segment.toLowerCase(), t = type.toLowerCase();
  if (/lapsed|win.?back|comeback/.test(s + ' ' + t)) return 'reactivation';
  if (/referral|friend/.test(s + ' ' + t)) return 'referral';
  if (/newcomer|trial|first.?time|lead/.test(s + ' ' + t)) return 'trial_conversion';
  if (/annual/.test(s + ' ' + t)) return 'annual_membership';
  if (/corporate|team/.test(s + ' ' + t)) return 'acquisition';
  if (/gift card/.test(t)) return 'additional_purchase';
  if (/anniversary/.test(t)) return 'anniversary';
  if (/student/.test(s + ' ' + t)) return 'acquisition';
  return 'retention';
};
const mechanicsFor = (type: string) => {
  if (/bundle|complimentary|free trainer/i.test(type)) return 'bundle';
  if (/gift card/i.test(type)) return 'fixed';
  if (/referral|friends/i.test(type)) return 'referral';
  if (/freeze|validity/i.test(type)) return 'validity_extension';
  if (/flash|discount|winback|anniversary|student|conditional/i.test(type)) return 'percentage';
  return 'experience';
};

const rationaleSheet = workbook.getWorksheet('06 Rationale Bank');
if (!rationaleSheet) throw new Error('Missing “06 Rationale Bank” worksheet.');
const rationales = new Map<string, string>();
for (let row = 4; row <= rationaleSheet.rowCount; row++) {
  const id = cellText(rationaleSheet.getCell(row, 1).value);
  const rationale = cellText(rationaleSheet.getCell(row, 6).value);
  if (id && rationale) rationales.set(id, rationale);
}

const sourceRows: { sheet: string; row: number; values: unknown[] }[] = [];
for (const sheetName of ['03 Mumbai Offers', '04 Bengaluru Offers']) {
  const sheet = workbook.getWorksheet(sheetName);
  if (!sheet) throw new Error(`Missing “${sheetName}” worksheet.`);
  for (let row = 4; row <= sheet.rowCount; row++) {
    const values = sheet.getRow(row).values as ExcelJS.CellValue[];
    if (/^(MUM|BLR)-\d{2}-\d{3}$/.test(cellText(values[1]))) sourceRows.push({ sheet: sheetName, row, values });
  }
}

const prepared = sourceRows.flatMap(({ sheet, row, values }) => {
  const [sourceId, monthText, name, type, segment, scope, price, mrp, discount, units, revenue, revPerUnit, validityDays, sourceStatus] = values.slice(1, 15);
  const id = cellText(sourceId), title = cellText(name), sourceLocation = cellText(scope);
  let month: number;
  try { month = monthNumber(monthText); } catch { throw new Error(`${sheet} row ${row}: invalid month ${JSON.stringify(monthText)} for ${id}`); }
  const names = studioAliases[sourceLocation];
  if (!names) throw new Error(`${sheet} row ${row}: unmapped studio scope “${sourceLocation}”.`);
  const targets = names.map(n => {
    const studio = studioByName.get(n);
    if (!studio) throw new Error(`${sheet} row ${row}: app studio “${n}” not found.`);
    return studio;
  });
  if (!id || !title || !cellText(type) || !Number.isFinite(Number(units)) || !Number.isFinite(Number(revenue)))
    throw new Error(`${sheet} row ${row}: required offer fields are missing.`);
  return targets.map(studio => ({
    id, month, title, type: cellText(type), segment: cellText(segment), sourceLocation, studio,
    price: Number(price) || Number(revPerUnit) || 0,
    mrp: Number(mrp) || null,
    discount: Number(discount) || 0,
    units: Number(units),
    revenue: Number(revenue),
    validityDays: Number(validityDays) || null,
    sourceStatus: cellText(sourceStatus),
    rationale: rationales.get(id) || '',
    sheet, row,
  }));
});
if (sourceRows.length !== 200) throw new Error(`Expected 200 source offer rows; found ${sourceRows.length}.`);
if (dryRun) {
  const byStudio = Object.fromEntries(studios.map(s => [s.name, prepared.filter(o => o.studio.id === s.id).length]).filter(([, count]) => count));
  console.log(JSON.stringify({ sourceOffers: sourceRows.length, locationEntries: prepared.length, byStudio }, null, 2));
  process.exit(0);
}

const adminId = (db.prepare("SELECT id FROM users WHERE role='administrator' ORDER BY id LIMIT 1").get() as any)?.id ?? null;
let created = 0, skipped = 0;
const insert = db.prepare(`INSERT INTO offers
  (offer_uid,name,headline,benefit,rationale,internal_description,objective,offer_type,studio_id,month,year,audience,
   target_purchases,expected_asp,expected_revenue,revenue_target,effective_discount,source_campaign,status,approval_status,
   generation_source,data_mode,financials,risks,success_metrics,provenance,created_by)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
const add = db.transaction(() => {
  for (const o of prepared) {
    const sourceKey = `workbook:physique57-offer-bank-2027:${o.id}`;
    const existing = db.prepare(`SELECT id FROM offers WHERE studio_id=? AND year=? AND json_extract(provenance,'$.sourceKey')=?`)
      .get(o.studio.id, year, sourceKey) as any;
    if (existing) { skipped++; continue; }
    const financials = {
      source: 'Workbook scenario', expectedBuyers: o.units, expectedRevenue: o.revenue,
      sellingPrice: o.price, originalMrp: o.mrp, contributionMargin: null, economicsComplete: false,
      warnings: ['Workbook projection; verify price, availability, and unit economics before approval.'],
    };
    const provenance = {
      sourceKey, source: 'Physique57_Offer_Bank_2027.xlsx', sourceOfferId: o.id,
      sourceSheet: o.sheet, sourceRow: o.row, sourceLocation: o.sourceLocation,
      sourceStatus: o.sourceStatus, sourceType: o.type, sourcePrice: o.price,
      originalMrp: o.mrp, validityDays: o.validityDays,
      linkGroup: `OFFERBANK27-${o.id}`,
      pricing: { product: null, discount: o.discount, mechanic: o.type },
    };
    const offerId = insert.run(
      `P57-${year}-${crypto.randomBytes(5).toString('hex').toUpperCase()}`,
      o.title,
      o.type,
      `Source offer type: ${o.type}. Target segment: ${o.segment}. Price: ₹${o.price}; original MRP: ${o.mrp ?? 'not stated'}; validity: ${o.validityDays ?? 'not stated'} days.`,
      o.rationale,
      `Imported from ${o.sheet}, row ${o.row} (${o.id}); workbook label: ${o.sourceStatus || '—'}.`,
      objectiveFor(o.segment, o.type),
      mechanicsFor(o.type),
      o.studio.id,
      o.month,
      year,
      o.segment,
      o.units,
      o.price,
      o.revenue,
      o.revenue,
      o.discount * 100,
      'Physique57 Offer Bank 2027',
      'draft',
      'pending',
      'offer_bank_2027',
      'user',
      JSON.stringify(financials),
      JSON.stringify(['Projection and rationale imported from source workbook; verify source assumptions before execution.']),
      JSON.stringify([]),
      JSON.stringify(provenance),
      adminId,
    );
    const offer = db.prepare('SELECT * FROM offers WHERE id=?').get(offerId.lastInsertRowid) as any;
    db.prepare('INSERT INTO offer_versions(offer_id,version,snapshot,changed_by) VALUES (?,?,?,?)')
      .run(offer.id, 1, JSON.stringify(offer), adminId);
    created++;
  }
});
add();
audit({ userId: adminId, action: 'offer_bank.import', entityType: 'offer_bank', entityId: String(year),
  after: { file, sourceOffers: sourceRows.length, locationEntries: prepared.length, created, skipped } });
console.log(JSON.stringify({ sourceOffers: sourceRows.length, locationEntries: prepared.length, created, skipped }, null, 2));
