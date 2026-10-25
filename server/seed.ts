import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { parse } from 'csv-parse/sync';
import { db, initSchema, audit } from './db.js';
import { hashPassword } from './lib/auth.js';
import { money, integer, parseDate, parseMonth, daysBetween } from './lib/format.js';
import { STUDIO_DEFINITIONS, canonicalStudio } from './lib/studios.js';
import { generateYearTargets } from './lib/intelligence.js';
import { recalculateSegments } from './lib/segments.js';
import { calculateOffer } from './lib/calculations.js';
import { importCheckinsFile } from './lib/checkins.js';
import { ensureCommercialSeed } from './lib/commercialSeed.js';
import { ensureBaselineData } from './lib/historicalBaseline.js';

initSchema();
const uploadDir = path.resolve('uploads');
if (!fs.existsSync(path.join(uploadDir, 'Sales - Raw - Sales (24).csv'))) {
  console.log('Raw CSV upload folder not present; hydrating bundled 2025–2026 historical baseline and 2027 commercial plan…');
  const result = ensureBaselineData();
  console.log('Baseline ready:', result);
  process.exit(0);
}
const existing = Number((db.prepare('SELECT COUNT(*) n FROM transactions').get() as any).n);
if (existing > 0 && process.env.FORCE_SEED !== 'true') {
  console.log(
    `Database already contains ${existing} transactions. Core seed skipped; checking idempotent commercial policies.`,
  );
  ensureCommercialSeed();
  process.exit(0);
}
if (existing > 0) {
  console.log('Rebuilding database from source files…');
  db.exec(`DELETE FROM offer_experiments; DELETE FROM copilot_messages; DELETE FROM copilot_conversations; DELETE FROM campaign_performance; DELETE FROM campaigns; DELETE FROM generation_history; DELETE FROM offer_versions; DELETE FROM offers;
    DELETE FROM target_versions; DELETE FROM monthly_targets; DELETE FROM segment_snapshots; DELETE FROM import_errors; DELETE FROM checkins; DELETE FROM transactions;
    DELETE FROM leads; DELETE FROM member_visits; DELETE FROM class_sessions; DELETE FROM trainer_performance; DELETE FROM customer_packages; DELETE FROM products;
    DELETE FROM imports; DELETE FROM studio_offer_policies; DELETE FROM audit_logs; DELETE FROM auth_sessions; DELETE FROM users; DELETE FROM studios;
    DELETE FROM settings WHERE key IN ('commercial_seed_version','commercial_seed_report'); DELETE FROM sqlite_sequence;`);
}

const hashSalt = process.env.MEMBER_HASH_SALT || 'p57-local-demonstration-salt';
const ref = (value: unknown) =>
  crypto
    .createHash('sha256')
    .update(`${hashSalt}:${String(value)}`)
    .digest('hex')
    .slice(0, 20);
const readCsv = (name: string) =>
  parse(fs.readFileSync(path.join(uploadDir, name)), {
    columns: true,
    bom: true,
    relaxColumnCount: true,
    skipEmptyLines: true,
  }) as any[];
const now = () => new Date().toISOString();

console.log('Creating studios and role-based users…');
const studioInsert = db.prepare(
  'INSERT INTO studios(name,code,city,aliases,max_discount_percent,monthly_capacity) VALUES (?,?,?,?,?,?)',
);
for (const s of STUDIO_DEFINITIONS) studioInsert.run(s.name, s.code, s.city, JSON.stringify(s.aliases), 20, null);
const studioIds = new Map((db.prepare('SELECT id,name FROM studios').all() as any[]).map(s => [s.name, s.id]));
const studioId = (value: unknown) => {
  const name = canonicalStudio(value);
  return name ? (studioIds.get(name) as number) : null;
};
const userInsert = db.prepare('INSERT INTO users(email,name,password_hash,role,assigned_studio_id) VALUES (?,?,?,?,?)');
const password = 'P57demo!';
const adminId = Number(
  userInsert.run('admin@p57.demo', 'Aisha Mehta', hashPassword(password), 'administrator', null).lastInsertRowid,
);
userInsert.run('management@p57.demo', 'Rohan Kapoor', hashPassword(password), 'senior_management', null);
userInsert.run('sales@p57.demo', 'Meera Shah', hashPassword(password), 'sales_manager', null);
userInsert.run(
  'studio@p57.demo',
  'Kemps Studio Manager',
  hashPassword(password),
  'studio_manager',
  studioIds.get('Kemps Corner'),
);
userInsert.run(
  'associate@p57.demo',
  'Sales Associate',
  hashPassword(password),
  'sales_associate',
  studioIds.get('Kemps Corner'),
);
userInsert.run('analyst@p57.demo', 'Read-only Analyst', hashPassword(password), 'read_only_analyst', null);

function importRecord(filename: string, category: string, total: number) {
  return Number(
    db
      .prepare(
        `INSERT INTO imports(filename,category,status,total_rows,summary,created_by) VALUES (?,?, 'processing',?,?,?)`,
      )
      .run(filename, category, total, JSON.stringify({ source: 'initial_upload', importedAt: now() }), adminId)
      .lastInsertRowid,
  );
}
function finishImport(id: number, imported: number, invalid: number, duplicates: number, extra: any = {}) {
  db.prepare(
    `UPDATE imports SET status='committed',valid_rows=?,invalid_rows=?,duplicate_rows=?,imported_rows=?,summary=?,completed_at=CURRENT_TIMESTAMP WHERE id=?`,
  ).run(imported, invalid, duplicates, imported, JSON.stringify({ source: 'initial_upload', ...extra }), id);
}
function importError(importId: number, row: number, field: string, message: string, raw: any) {
  if (Number((db.prepare('SELECT COUNT(*) n FROM import_errors WHERE import_id=?').get(importId) as any).n) < 5000)
    db.prepare('INSERT INTO import_errors(import_id,row_number,field,message,raw_row) VALUES (?,?,?,?,?)').run(
      importId,
      row,
      field,
      message,
      JSON.stringify(raw),
    );
}

console.log('Importing sales transactions…');
const salesFile = 'Sales - Raw - Sales (24).csv';
const salesRows = readCsv(salesFile);
const salesImport = importRecord(salesFile, 'sales', salesRows.length);
const usableSales: any[] = [];
let salesInvalid = 0,
  salesDuplicates = 0;
const salesUids = new Set<string>();
for (let i = 0; i < salesRows.length; i++) {
  const row = salesRows[i],
    sid = studioId(row['Calculated Location']),
    date = parseDate(row['Payment Date']);
  const uid = String(row['Sale Item ID'] || '').trim();
  if (
    !sid ||
    !date ||
    !uid ||
    row['Payment Status'] !== 'succeeded' ||
    String(row['Sec. Is Voided']).toUpperCase() === 'TRUE'
  ) {
    salesInvalid++;
    importError(
      salesImport,
      i + 2,
      !sid ? 'Calculated Location' : !date ? 'Payment Date' : 'Payment Status',
      'Excluded: missing studio/date/ID, unsuccessful payment, or voided item.',
      row,
    );
    continue;
  }
  if (salesUids.has(uid)) {
    salesDuplicates++;
    importError(salesImport, i + 2, 'Sale Item ID', 'Duplicate source identifier excluded.', row);
    continue;
  }
  salesUids.add(uid);
  usableSales.push({ row, sid, date, uid });
}
usableSales.sort((a, b) => a.date.localeCompare(b.date) || a.uid.localeCompare(b.uid));
const memberState = new Map<string, { seenService: boolean; previousEnd: string | null }>();
const txInsert =
  db.prepare(`INSERT INTO transactions(source_uid,member_ref,studio_id,purchased_at,month,amount,net_amount,discount_amount,discount_code,product_name,category,revenue_stream,is_first_observed,membership_start,membership_end,sold_by,import_id)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
const productPrices = new Map<string, number[]>();
const seedSales = db.transaction(() => {
  for (const item of usableSales) {
    const { row, sid, date, uid } = item;
    const member = ref(row['Member ID'] || row['Customer Email'] || uid);
    const category = String(row['Cleaned Category'] || 'Others').trim();
    const isService = !['Retail', 'Money Credits', 'Gift Cards', 'Others'].includes(category);
    const state = memberState.get(member) || { seenService: false, previousEnd: null };
    const start = parseDate(row['Sec. Membership Start Date']),
      end = parseDate(row['Sec. Membership End Date']);
    let stream = 'additional',
      first = 0;
    if (isService && !state.seenService) {
      stream = 'new_client';
      first = 1;
    } else if (isService && state.previousEnd && start) {
      const gap = daysBetween(state.previousEnd, start);
      if (gap !== null && gap > 60) stream = 'reactivation';
      else if (gap !== null && gap >= -45) stream = 'renewal';
    }
    if (isService) {
      state.seenService = true;
      if (end) state.previousEnd = end;
      memberState.set(member, state);
    }
    const code = String(row['Discount Code'] || '').trim();
    txInsert.run(
      uid,
      member,
      sid,
      date,
      date.slice(0, 7),
      money(row['Payment Value']),
      money(row['Price Excluding VAT In Currency']),
      money(row['Discount Value In Currency']),
      code && code !== '-' ? code : null,
      String(row['Cleaned Product'] || '').trim(),
      category,
      stream,
      first,
      start,
      end,
      String(row['Sold By'] || '') === '-' ? null : row['Sold By'],
      salesImport,
    );
    const price = money(row['Sale Item Unit Price Including VAT']);
    const product = String(row['Cleaned Product'] || '').trim();
    if (price > 0 && product) {
      const key = `${sid}|${product}|${category}`;
      const list = productPrices.get(key) || [];
      list.push(price);
      productPrices.set(key, list);
    }
  }
});
seedSales();
finishImport(salesImport, usableSales.length, salesInvalid, salesDuplicates, {
  dateRange: [usableSales[0]?.date, usableSales.at(-1)?.date],
  classification: 'First observed service purchase; renewal/reactivation inferred from membership end/start gaps.',
});

console.log('Creating studio-specific product price catalogue…');
const productInsert =
  db.prepare(`INSERT INTO products(studio_id,name,category,list_price,sessions_included,source) VALUES (?,?,?,?,?, 'observed_sales')
  ON CONFLICT(studio_id,name) DO UPDATE SET list_price=excluded.list_price,category=excluded.category`);
for (const [key, prices] of productPrices) {
  const [sid, name, category] = key.split('|');
  prices.sort((a, b) => a - b);
  const median = prices[Math.floor(prices.length / 2)];
  const sessions = /12 Class/.test(name)
    ? 12
    : /10 Class/.test(name)
      ? 10
      : /8 Class/.test(name)
        ? 8
        : /4 Class/.test(name)
          ? 4
          : /2 For 1/.test(name)
            ? 2
            : /Single|Session/.test(name)
              ? 1
              : 1;
  productInsert.run(Number(sid), name, category, median, sessions);
}
const membershipFile = 'Sales - Raw - Memberships (6).csv';
const membershipRows = readCsv(membershipFile);
const membershipImport = importRecord(membershipFile, 'products', membershipRows.length);
let productCount = 0,
  productInvalid = 0;
for (let i = 0; i < membershipRows.length; i++) {
  const row = membershipRows[i],
    price = money(row.price),
    name = String(row.name || '').trim();
  const hosts =
    String(row.hostId) === '13752'
      ? ['Kemps Corner', 'Bandra']
      : String(row.hostId) === '33905'
        ? ['Kenkere House']
        : [];
  if (!name || price <= 0 || !hosts.length || String(row.isDeleted) === 'TRUE') {
    productInvalid++;
    importError(
      membershipImport,
      i + 2,
      'name/price/hostId',
      'Product excluded: missing name, non-positive price, unsupported host, or deleted catalogue item.',
      row,
    );
    continue;
  }
  for (const studio of hosts) {
    productInsert.run(
      studioIds.get(studio),
      name,
      String(row.type || 'membership'),
      price,
      integer(row.numberOfEvents) || 1,
    );
    db.prepare(
      "UPDATE products SET external_id=?,validity_days=?,source='membership_catalogue' WHERE studio_id=? AND name=?",
    ).run(String(row.id || ''), integer(row.duration) || null, studioIds.get(studio), name);
  }
  productCount++;
}
finishImport(membershipImport, productCount, productInvalid, 0, {
  note: 'Host 13752 catalogue applied to both Mumbai revenue studios; prices remain studio-specific records.',
});

console.log('Importing lead snapshots…');
const leadFile = '❖ PM - Leads ❖ - ◉ Leads (33).csv';
const leadRows = readCsv(leadFile);
const leadImport = importRecord(leadFile, 'leads', leadRows.length);
const leadInsert =
  db.prepare(`INSERT OR IGNORE INTO leads(source_uid,member_ref,studio_id,created_at,month,converted_at,source_name,campaign,stage,trial_status,conversion_status,retention_status,purchases,ltv,visits,import_id)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
let leadValid = 0,
  leadInvalid = 0,
  leadDuplicates = 0;
const leadTx = db.transaction(() => {
  for (let i = 0; i < leadRows.length; i++) {
    const row = leadRows[i],
      sid = studioId(row.Center),
      date = parseDate(row['Created At']),
      uid = String(row.ID || '');
    if (!sid || !date || !uid) {
      leadInvalid++;
      importError(
        leadImport,
        i + 2,
        !sid ? 'Center' : 'Created At',
        'Missing or unsupported studio, creation date, or lead ID.',
        row,
      );
      continue;
    }
    const member = row['Member ID'] && row['Member ID'] !== '-' ? ref(row['Member ID']) : null;
    const result = leadInsert.run(
      uid,
      member,
      sid,
      date,
      date.slice(0, 7),
      parseDate(row['Converted To Customer At']),
      row['Source Name'],
      row['UTM Campaign'],
      row['Stage Name'],
      row['Trial Status'],
      row['Conversion Status'],
      row['Retention Status'],
      money(row['Purchases Made']),
      money(row.LTV),
      money(row.Visits),
      leadImport,
    );
    if (result.changes) leadValid++;
    else {
      leadDuplicates++;
      importError(leadImport, i + 2, 'ID', 'Duplicate lead identifier excluded.', row);
    }
  }
});
leadTx();
finishImport(leadImport, leadValid, leadInvalid, leadDuplicates, {
  attributionWindowDays: 90,
  note: 'Current-state lead snapshot; not a trial-booking event log.',
});

console.log('Importing first-visit and member lifecycle records…');
const visitFile = 'Day End Report - Part 1 - New (12).csv';
const visitRows = readCsv(visitFile);
const visitImport = importRecord(visitFile, 'visits', visitRows.length);
const visitInsert =
  db.prepare(`INSERT OR IGNORE INTO member_visits(source_uid,member_ref,studio_id,first_visit_at,month,first_purchase_at,first_purchase_value,ltv,visits,conversion_status,retention_status,source_name,import_id)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`);
let visitValid = 0,
  visitInvalid = 0,
  visitDuplicates = 0;
const visitTx = db.transaction(() => {
  for (let i = 0; i < visitRows.length; i++) {
    const row = visitRows[i],
      sid = studioId(row['Home Location'] || row['First Visit Location']),
      date = parseDate(row['First Visit Date']);
    if (!sid || !date || !row['Member Id']) {
      visitInvalid++;
      importError(
        visitImport,
        i + 2,
        !sid ? 'Home Location' : 'First Visit Date',
        'Missing studio, first visit date, or member ID.',
        row,
      );
      continue;
    }
    const uid = `${row['Member Id']}|${date}`;
    const result = visitInsert.run(
      uid,
      ref(row['Member Id']),
      sid,
      date,
      date.slice(0, 7),
      parseDate(row['First Purchase Date']),
      money(row['First Purchase Value']),
      money(row.Ltv),
      money(row['No of Visits']),
      row['Conversion Status'],
      row['Retention Status'],
      row.Source,
      visitImport,
    );
    if (result.changes) visitValid++;
    else {
      visitDuplicates++;
      importError(visitImport, i + 2, 'Member Id', 'Duplicate member first-visit record excluded.', row);
    }
  }
});
visitTx();
finishImport(visitImport, visitValid, visitInvalid, visitDuplicates, {
  attributionWindowDays: 90,
  note: 'First observed visit and post-trial purchase fields used for matured cohort conversion.',
});

console.log('Importing class session capacity…');
const sessionFile = 'Day End Report - Part 3 - Sessions (20).csv';
const sessionRows = readCsv(sessionFile);
const sessionImport = importRecord(sessionFile, 'sessions', sessionRows.length);
const sessionInsert = db.prepare(
  `INSERT OR IGNORE INTO class_sessions(source_uid,studio_id,session_date,month,capacity,checked_in,booked,session_name,session_type,import_id) VALUES (?,?,?,?,?,?,?,?,?,?)`,
);
let sessionValid = 0,
  sessionInvalid = 0,
  sessionDuplicates = 0;
const capacities = new Map<number, number[]>();
const sessionTx = db.transaction(() => {
  for (let i = 0; i < sessionRows.length; i++) {
    const row = sessionRows[i],
      sid = studioId(row.Location),
      date = parseDate(row.Date),
      uid = String(row.SessionID || '');
    if (!sid || !date || !uid) {
      sessionInvalid++;
      importError(
        sessionImport,
        i + 2,
        !sid ? 'Location' : 'Date',
        'Missing studio, session date, or session ID.',
        row,
      );
      continue;
    }
    const result = sessionInsert.run(
      uid,
      sid,
      date,
      date.slice(0, 7),
      money(row.Capacity),
      money(row.CheckedIn),
      money(row.Booked),
      String(row.SessionName || '').trim(),
      row.Type,
      sessionImport,
    );
    if (result.changes) sessionValid++;
    else sessionDuplicates++;
    if (date <= now().slice(0, 10)) {
      const list = capacities.get(sid) || [];
      list.push(money(row.Capacity));
      capacities.set(sid, list);
    }
  }
});
sessionTx();
for (const [sid, values] of capacities) {
  const observedMonths = new Set(sessionRows.filter(r => studioId(r.Location) === sid).map(r => parseMonth(r.Date)))
    .size;
  const monthlyCapacity = values.reduce((a, b) => a + b, 0) / Math.max(1, observedMonths);
  db.prepare('UPDATE studios SET monthly_capacity=? WHERE id=?').run(Math.round(monthlyCapacity), sid);
}
finishImport(sessionImport, sessionValid, sessionInvalid, sessionDuplicates, {
  note: 'Future scheduled sessions retained for capacity, but future attendance is not treated as actual.',
});

console.log('Importing trainer delivery and payroll performance…');
const payrollFile = 'Day End Report - Part 1 - Payroll (5).csv';
const payrollRows = readCsv(payrollFile);
const payrollImport = importRecord(payrollFile, 'trainer_performance', payrollRows.length);
const payrollInsert = db.prepare(
  `INSERT OR IGNORE INTO trainer_performance(source_uid,trainer_ref,trainer_name,studio_id,month,total_sessions,non_empty_sessions,customers,paid_revenue,conversion_rate,retention_rate,new_clients,import_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
);
let payrollValid = 0,
  payrollInvalid = 0,
  payrollDuplicates = 0;
const payrollTx = db.transaction(() => {
  for (let i = 0; i < payrollRows.length; i++) {
    const row = payrollRows[i],
      sid = studioId(row.Location),
      month = parseMonth(row['Month Year']),
      uid = String(row['Unique Key'] || '');
    if (!sid || !month || !uid || !row['Teacher ID']) {
      payrollInvalid++;
      importError(
        payrollImport,
        i + 2,
        !sid ? 'Location' : 'Month Year',
        'Missing studio, month, teacher, or unique key.',
        row,
      );
      continue;
    }
    const result = payrollInsert.run(
      uid,
      ref(row['Teacher ID']),
      String(row['Teacher Name'] || '').trim(),
      sid,
      month,
      money(row['Total Sessions']),
      money(row['Total Non-Empty Sessions']),
      money(row['Total Customers']),
      money(row['Total Paid']),
      money(row['Conversion Rate']) / 100,
      money(row['Retention Rate']) / 100,
      money(row.New),
      payrollImport,
    );
    if (result.changes) payrollValid++;
    else payrollDuplicates++;
  }
});
payrollTx();
finishImport(payrollImport, payrollValid, payrollInvalid, payrollDuplicates, {
  note: 'Trainer-month delivery, paid value, conversion and retention snapshots retained for authorised studio analysis.',
});

console.log('Importing package lifecycle and lapse records…');
const lapsedFile = 'Lapsed New - Lapsed (21).csv';
const lapsedRows = readCsv(lapsedFile);
const lapsedImport = importRecord(lapsedFile, 'packages', lapsedRows.length);
const packageInsert =
  db.prepare(`INSERT OR IGNORE INTO customer_packages(source_uid,member_ref,studio_id,status,product_name,purchase_date,start_date,end_date,churned_date,amount,discount_amount,original_amount,sessions_limit,sessions_used,days_since_last_visit,average_sessions_month,import_id)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
let packageValid = 0,
  packageInvalid = 0,
  packageDuplicates = 0;
const packageTx = db.transaction(() => {
  for (let i = 0; i < lapsedRows.length; i++) {
    const row = lapsedRows[i],
      sid = studioId(row['Primary Location']),
      purchase = parseDate(row['Purchase Date']);
    if (!sid || !purchase || !row['Member ID']) {
      packageInvalid++;
      importError(
        lapsedImport,
        i + 2,
        !sid ? 'Primary Location' : 'Purchase Date',
        'Missing studio, purchase date, or member ID.',
        row,
      );
      continue;
    }
    const uid = crypto
      .createHash('sha256')
      .update(
        [
          row['Member ID'],
          row['Membership Name'],
          purchase,
          parseDate(row['Start Date']),
          parseDate(row['End Date']),
          row['Amount Paid'],
        ].join('|'),
      )
      .digest('hex');
    const result = packageInsert.run(
      uid,
      ref(row['Member ID']),
      sid,
      row.Status,
      row['Membership Name'],
      purchase,
      parseDate(row['Start Date']),
      parseDate(row['End Date']),
      parseDate(row['Churned Date']),
      money(row['Amount Paid']),
      money(row['Discount Value']),
      money(row['Original Amount (Before Discount)']),
      money(row['Sessions Limit']) || null,
      money(row['Sessions Limit']) && row['Sessions Used %']
        ? (money(row['Sessions Limit']) * money(row['Sessions Used %'])) / 100
        : null,
      money(row['Days Since Last Visit']) || null,
      money(row['Average Sessions Per Month']) || null,
      lapsedImport,
    );
    if (result.changes) packageValid++;
    else packageDuplicates++;
  }
});
packageTx();
finishImport(lapsedImport, packageValid, packageInvalid, packageDuplicates, {
  note: 'Package-level status retained. Segment membership uses distinct privacy-safe customer references.',
});

console.log('Reconstructing historical promotion performance from discount codes…');
const historical = db
  .prepare(
    `SELECT discount_code,studio_id,COUNT(*) transactions,COUNT(DISTINCT member_ref||substr(purchased_at,1,10)) redemptions,
  SUM(amount) revenue,SUM(discount_amount) discount,MIN(purchased_at) first,MAX(purchased_at) last,AVG(amount) aov
  FROM transactions WHERE discount_code IS NOT NULL GROUP BY discount_code,studio_id HAVING COUNT(*)>=5`,
  )
  .all() as any[];
const offerInsert =
  db.prepare(`INSERT INTO offers(offer_uid,name,headline,internal_description,rationale,objective,offer_type,studio_id,month,year,audience,eligible_products,benefit,mechanics,
  validity_start,validity_end,expected_asp,effective_discount,actual_sales,actual_revenue,actual_redemptions,actual_discount_cost,source_campaign,status,approval_status,generation_source,data_mode,performance_notes,financials,risks,created_by)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
for (const h of historical) {
  const code = h.discount_code as string;
  const uid = `HIST-${crypto.createHash('sha1').update(`${code}|${h.studio_id}`).digest('hex').slice(0, 12)}`;
  const effective = h.revenue + h.discount > 0 ? (h.discount / (h.revenue + h.discount)) * 100 : 0;
  offerInsert.run(
    uid,
    code,
    `Historical promotion · ${code}`,
    'Reconstructed from imported sales rows carrying this discount code.',
    'Observed historical performance can inform tests, but does not establish incrementality or cross-studio transferability.',
    'historical_analysis',
    /%|OFF|\d/.test(code) ? 'percentage_or_fixed' : 'code_promotion',
    h.studio_id,
    Number(String(h.last).slice(5, 7)),
    Number(String(h.last).slice(0, 4)),
    'Unknown from source file',
    '[]',
    `Discount code ${code}`,
    JSON.stringify({ code }),
    h.first,
    h.last,
    h.aov,
    effective,
    h.transactions,
    h.revenue,
    h.redemptions,
    h.discount,
    code,
    'completed',
    'not_required',
    'historical_import',
    'actual',
    'Observed attributed revenue only. Redemptions are distinct customer-days, not necessarily incremental purchases.',
    '{}',
    JSON.stringify([
      'Attribution is not causal lift',
      'Eligibility and audience reach are unavailable',
      'Code may have been used across multiple campaigns',
    ]),
    adminId,
  );
}

let checkinsImported = 0;
const optionalCheckins = process.env.CHECKINS_CSV || path.resolve('p57-data/checkins-source.csv');
if (fs.existsSync(optionalCheckins)) {
  console.log('Importing privacy-safe Checkins behaviour…');
  checkinsImported = importCheckinsFile({ filePath: optionalCheckins, createdBy: adminId }).imported;
} else {
  console.log('Optional Checkins source not present. Run npm run import:checkins after seeding to add it.');
}

console.log('Building derived customer segments and 2026/2027 target recommendations…');
recalculateSegments();
generateYearTargets(2026, adminId);
generateYearTargets(2027, adminId);

console.log('Creating a clearly labelled demonstration campaign plan (no demonstration actuals)…');
const demoNames = [
  ['New Year, Same Iconic Burn', 'acquisition'],
  ['The Commitment Issues Cure', 'trial_conversion'],
  ['March Your Way Back', 'reactivation'],
  ['The Anniversary Flex', 'anniversary'],
  ['May We Have This Dance?', 'retention'],
  ['Hot Barre Summer', 'additional_purchase'],
  ['The Mid-Year Muscle', 'revenue_gap'],
  ['Absence Makes the Barre Grow Fonder', 'reactivation'],
  ['Stronger Than Your Excuses', 'new_client'],
  ['The Fall Back-to-Barre Club', 'retention'],
  ['Gratitude, But Make It Glutes', 'referral'],
  ['Sleigh the Burn', 'annual_membership'],
];
const campaignStudios = ['Kemps Corner', 'Bandra', 'Kenkere House'];
for (let month = 1; month <= 12; month++) {
  const sid = studioIds.get(campaignStudios[(month - 1) % campaignStudios.length]);
  const target = db
    .prepare('SELECT * FROM monthly_targets WHERE studio_id=? AND year=2027 AND month=?')
    .get(sid, month) as any;
  const product = db
    .prepare(
      `SELECT * FROM products WHERE studio_id=? AND category NOT IN ('Retail','Money Credits','Others') AND list_price>0 ORDER BY list_price DESC LIMIT 1`,
    )
    .get(sid) as any;
  if (!target || !product) continue;
  const revenueTarget = Math.round(target.proposed_target * 0.08);
  const mechanics = {
    listedPrice: product.list_price,
    mechanism: 'percentage',
    discountPercent: month === 4 ? 12 : 8,
    bonusClasses: 0,
    targetRevenue: revenueTarget,
    eligibleAudience: 300,
    redemptionRate: 0.12,
    conversionRate: 1,
    maxDiscountPercent: 20,
  };
  const result = calculateOffer(mechanics as any);
  const slug = `DEMO-2027-${String(month).padStart(2, '0')}`;
  const offerId = Number(
    offerInsert.run(
      slug,
      demoNames[month - 1][0],
      `${demoNames[month - 1][0]} — your next chapter starts here.`,
      'Demonstration planning concept. Edit and approve before use.',
      'Illustrative seeded workflow only; not an AI recommendation or historical result.',
      demoNames[month - 1][1],
      'percentage',
      sid,
      month,
      2027,
      'Planning audience — validate before launch',
      JSON.stringify([product.id]),
      `${mechanics.discountPercent}% off ${product.name}`,
      JSON.stringify(mechanics),
      `2027-${String(month).padStart(2, '0')}-01`,
      `2027-${String(month).padStart(2, '0')}-14`,
      result.sellingPrice,
      result.effectiveDiscountPercent,
      null,
      null,
      null,
      null,
      null,
      'draft',
      'pending',
      'demo_seed',
      'demo',
      'Demonstration data only; no actual results.',
      JSON.stringify(result),
      JSON.stringify(['Audience size is an unvalidated planning assumption']),
      adminId,
    ).lastInsertRowid,
  );
  db.prepare(
    'UPDATE offers SET revenue_target=?,target_purchases=?,expected_revenue=?,expected_redemptions=?,customer_copy=?,cta=? WHERE id=?',
  ).run(
    revenueTarget,
    result.requiredBuyers,
    result.expectedRevenue,
    result.expectedRedemptions,
    `${mechanics.discountPercent}% off ${product.name} for a limited time. One redemption per eligible customer; cannot be combined with another offer. Advance booking and studio terms apply.`,
    'Book your next chapter',
    offerId,
  );
  db.prepare(
    `INSERT INTO campaigns(name,studio_id,offer_id,year,start_date,end_date,audience,objective,target_revenue,expected_purchases,status,approval_status,owner_id,tasks,data_mode,notes,created_by)
    VALUES (?,?,?,?,?,?,?,?,?,?, 'draft','pending',?,?,?,?,?)`,
  ).run(
    demoNames[month - 1][0],
    sid,
    offerId,
    2027,
    `2027-${String(month).padStart(2, '0')}-01`,
    `2027-${String(month).padStart(2, '0')}-14`,
    'Validate segment before launch',
    demoNames[month - 1][1],
    revenueTarget,
    result.requiredBuyers,
    adminId,
    JSON.stringify([
      { id: 1, title: 'Validate eligible audience and product capacity', done: false },
      { id: 2, title: 'Approve final terms and WhatsApp copy', done: false },
    ]),
    'demo',
    'Demonstration planning record. Not published to any external platform.',
    adminId,
  );
}

audit({
  userId: adminId,
  action: 'initial_import',
  entityType: 'system',
  after: {
    files: checkinsImported ? 8 : 7,
    transactions: usableSales.length,
    leads: leadValid,
    visits: visitValid,
    sessions: sessionValid,
    packages: packageValid,
    checkins: checkinsImported,
  },
});
const commercialSeed = ensureCommercialSeed();
console.log(
  `Commercial policy seed: ${commercialSeed.created || 0} draft offers; ${commercialSeed.experiments || 0} experiments.`,
);
console.log('Seed complete.');
console.log(
  `Studios: ${studioIds.size}; transactions: ${usableSales.length}; leads: ${leadValid}; historical offers: ${historical.length}`,
);
console.log('Demo sign-in: admin@p57.demo / P57demo!');
