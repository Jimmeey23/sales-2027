import fs from 'node:fs';
import crypto from 'node:crypto';
import { parse } from 'csv-parse/sync';
import ExcelJS from 'exceljs';
import { db } from '../db.js';
import { canonicalStudio } from './studios.js';
import { money, parseDate, daysBetween } from './format.js';
import { recalculateSegments } from './segments.js';

export const IMPORT_FIELDS: Record<string, Record<string, string>> = {
  sales: {
    source_uid: 'Sale Item ID',
    member_id: 'Member ID',
    studio: 'Calculated Location',
    date: 'Payment Date',
    amount: 'Payment Value',
    net_amount: 'Price Excluding VAT In Currency',
    discount_amount: 'Discount Value In Currency',
    discount_code: 'Discount Code',
    product: 'Cleaned Product',
    category: 'Cleaned Category',
    payment_status: 'Payment Status',
    voided: 'Sec. Is Voided',
    membership_start: 'Sec. Membership Start Date',
    membership_end: 'Sec. Membership End Date',
    sold_by: 'Sold By',
  },
  leads: {
    source_uid: 'ID',
    member_id: 'Member ID',
    studio: 'Center',
    date: 'Created At',
    converted_at: 'Converted To Customer At',
    source_name: 'Source Name',
    campaign: 'UTM Campaign',
    stage: 'Stage Name',
    trial_status: 'Trial Status',
    conversion_status: 'Conversion Status',
    retention_status: 'Retention Status',
    purchases: 'Purchases Made',
    ltv: 'LTV',
    visits: 'Visits',
  },
  visits: {
    member_id: 'Member Id',
    studio: 'Home Location',
    date: 'First Visit Date',
    first_purchase_at: 'First Purchase Date',
    first_purchase_value: 'First Purchase Value',
    ltv: 'Ltv',
    visits: 'No of Visits',
    conversion_status: 'Conversion Status',
    retention_status: 'Retention Status',
    source_name: 'Source',
  },
  sessions: {
    source_uid: 'SessionID',
    studio: 'Location',
    date: 'Date',
    capacity: 'Capacity',
    checked_in: 'CheckedIn',
    booked: 'Booked',
    product: 'SessionName',
    category: 'Type',
  },
  checkins: {
    member_id: 'Member ID',
    session_id: 'Session ID',
    studio: 'Location',
    date: 'Date (IST)',
    order_at: 'Order At',
    checked_in: 'Checked In',
    late_cancelled: 'Is Late Cancelled',
    complimentary: 'Complementary',
    product: 'Cleaned Class',
    visit_type: 'Is New',
  },
  packages: {
    member_id: 'Member ID',
    studio: 'Primary Location',
    status: 'Status',
    product: 'Membership Name',
    date: 'Purchase Date',
    start_date: 'Start Date',
    end_date: 'End Date',
    churned_date: 'Churned Date',
    amount: 'Amount Paid',
    discount_amount: 'Discount Value',
    original_amount: 'Original Amount (Before Discount)',
    sessions_limit: 'Sessions Limit',
    sessions_used_percent: 'Sessions Used %',
    days_since_last_visit: 'Days Since Last Visit',
    average_sessions_month: 'Average Sessions Per Month',
  },
  products: {
    source_uid: 'id',
    studio: 'hostId',
    product: 'name',
    category: 'type',
    amount: 'price',
    sessions_limit: 'numberOfEvents',
    validity_days: 'duration',
  },
  targets: {
    studio: 'Studio',
    year: 'Year',
    month: 'Month',
    proposed_target: 'Proposed Target',
    approved_target: 'Approved Target',
    scenario: 'Scenario',
  },
};
const REQUIRED: Record<string, string[]> = {
  sales: ['source_uid', 'member_id', 'studio', 'date', 'amount'],
  leads: ['source_uid', 'studio', 'date'],
  visits: ['member_id', 'studio', 'date'],
  sessions: ['source_uid', 'studio', 'date'],
  checkins: ['member_id', 'session_id', 'studio', 'date', 'checked_in', 'late_cancelled'],
  packages: ['member_id', 'studio', 'date'],
  products: ['product', 'amount'],
  targets: ['studio', 'year', 'month'],
};

function cellText(value: any) {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object')
    return String(value.text || value.result || value.richText?.map((x: any) => x.text).join('') || '');
  return String(value);
}
async function readRows(importRow: any, worksheet?: string): Promise<any[]> {
  if (/\.xlsx$|\.xlsm$/i.test(importRow.filename)) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(importRow.file_path);
    const sheet = worksheet ? workbook.getWorksheet(worksheet) : workbook.worksheets[0];
    if (!sheet) throw new Error('Selected worksheet was not found.');
    const headers = (sheet.getRow(1).values as any[]).slice(1).map(cellText);
    const rows: any[] = [];
    sheet.eachRow((row, number) => {
      if (number === 1) return;
      const values = (row.values as any[]).slice(1);
      const item = Object.fromEntries(headers.map((h, i) => [h, cellText(values[i])]));
      if (Object.values(item).some(v => String(v).trim())) rows.push(item);
    });
    return rows;
  }
  return parse(fs.readFileSync(importRow.file_path), {
    columns: true,
    bom: true,
    relaxColumnCount: true,
    skipEmptyLines: true,
  }) as any[];
}
export async function inspectImport(id: number, worksheet?: string) {
  const row = db.prepare('SELECT * FROM imports WHERE id=?').get(id) as any;
  if (!row) throw new Error('Import not found.');
  let sheets: string[] = [];
  if (/\.xlsx$|\.xlsm$/i.test(row.filename)) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(row.file_path);
    sheets = workbook.worksheets.map(s => s.name);
  }
  const rows = await readRows(row, worksheet);
  const headers = rows.length ? Object.keys(rows[0]) : [];
  const category = detectCategory(headers);
  const mapping = suggestMapping(category, headers);
  const studios = [
    ...new Set(
      rows
        .slice(0, 1000)
        .map(r => r[mapping.studio])
        .filter(Boolean)
        .map(String),
    ),
  ];
  const unknownStudios = studios.filter(
    s => !canonicalStudio(s) && !db.prepare('SELECT 1 FROM studios WHERE name=?').get(s),
  );
  const dates = rows
    .slice(0, 1000)
    .map(r => parseDate(r[mapping.date]))
    .filter(Boolean)
    .sort();
  return {
    headers,
    sample: rows.slice(0, 15),
    totalRows: rows.length,
    sheets,
    worksheet: worksheet || sheets[0] || null,
    detectedCategory: category,
    suggestedMapping: mapping,
    unknownStudios,
    detectedDateRange: dates.length ? [dates[0], dates.at(-1)] : null,
  };
}
function detectCategory(headers: string[]) {
  let best = 'sales',
    score = -1;
  for (const [category, fields] of Object.entries(IMPORT_FIELDS)) {
    const matches = Object.values(fields).filter(v => headers.includes(v)).length;
    if (matches > score) {
      best = category;
      score = matches;
    }
  }
  return best;
}
function suggestMapping(category: string, headers: string[]) {
  const fields = IMPORT_FIELDS[category] || IMPORT_FIELDS.sales;
  return Object.fromEntries(
    Object.entries(fields).map(([key, source]) => [key, headers.includes(source) ? source : '']),
  );
}
function hashRef(value: unknown) {
  return crypto
    .createHash('sha256')
    .update(`${process.env.MEMBER_HASH_SALT || 'p57-local-demonstration-salt'}:${String(value)}`)
    .digest('hex')
    .slice(0, 20);
}
function hashBinaryRef(value: unknown) {
  return crypto
    .createHash('sha256')
    .update(`${process.env.MEMBER_HASH_SALT || 'p57-local-demonstration-salt'}:${String(value)}`)
    .digest();
}
function booleanValue(value: unknown) {
  const text = String(value ?? '')
    .trim()
    .toUpperCase();
  return text === 'TRUE' || text === '1' ? 1 : text === 'FALSE' || text === '0' ? 0 : null;
}
function epochDateTime(value: unknown) {
  const match = String(value ?? '')
    .trim()
    .match(/^(\d{4}-\d{2}-\d{2})[T,\s]+(\d{2}:\d{2}:\d{2})/);
  return match && parseDate(match[1]) ? Math.floor(Date.parse(`${match[1]}T${match[2]}Z`) / 1000) : null;
}
function errorRow(category: string, row: any) {
  if (category !== 'checkins') return JSON.stringify(row);
  return JSON.stringify({
    Location: row.Location,
    'Session ID': row['Session ID'],
    'Date (IST)': row['Date (IST)'],
    'Order At': row['Order At'],
    'Checked In': row['Checked In'],
    'Is Late Cancelled': row['Is Late Cancelled'],
    Complementary: row.Complementary,
    'Cleaned Class': row['Cleaned Class'],
    'Is New': row['Is New'],
  });
}
function resolveStudio(value: unknown) {
  const canonical = canonicalStudio(value);
  if (canonical) return (db.prepare('SELECT id FROM studios WHERE name=?').get(canonical) as any)?.id || null;
  return (db.prepare('SELECT id FROM studios WHERE name=?').get(String(value || '').trim()) as any)?.id || null;
}
function normalise(row: any, category: string, mapping: Record<string, string>, rowNumber: number) {
  const get = (field: string) => (mapping[field] ? row[mapping[field]] : '');
  const errors: string[] = [];
  for (const field of REQUIRED[category] || [])
    if (!String(get(field) ?? '').trim() && !(field === 'amount' && money(get(field)) === 0))
      errors.push(`Missing required field: ${field}`);
  const date = parseDate(get('date'));
  if (category !== 'products' && category !== 'targets' && !date) errors.push('Invalid or missing date.');
  const studioId = category === 'targets' || category !== 'products' ? resolveStudio(get('studio')) : null;
  if (category !== 'products' && !studioId) errors.push(`Unrecognised studio: ${get('studio') || '(blank)'}`);
  if (category === 'sales' && get('payment_status') && String(get('payment_status')).toLowerCase() !== 'succeeded')
    errors.push('Payment status is not succeeded.');
  if (category === 'sales' && String(get('voided')).toUpperCase() === 'TRUE') errors.push('Voided sale item excluded.');
  if (category === 'checkins') {
    if (!epochDateTime(get('date'))) errors.push('Invalid Checkins session timestamp.');
    if (booleanValue(get('checked_in')) === null) errors.push('Checked In must be TRUE or FALSE.');
    if (booleanValue(get('late_cancelled')) === null) errors.push('Is Late Cancelled must be TRUE or FALSE.');
  }
  if (category === 'targets') {
    const year = Number(get('year')),
      month = Number(get('month'));
    if (!Number.isInteger(year) || year < 2020 || year > 2100) errors.push('Invalid planning year.');
    if (!Number.isInteger(month) || month < 1 || month > 12) errors.push('Month must be 1–12.');
  }
  const uid =
    category === 'checkins'
      ? crypto
          .createHash('sha256')
          .update(
            [get('session_id'), get('member_id'), get('order_at'), get('date')]
              .map(v => String(v ?? '').trim())
              .join('|'),
          )
          .digest('hex')
      : category === 'visits'
        ? `${get('member_id')}|${date}`
        : category === 'packages'
          ? crypto
              .createHash('sha256')
              .update(
                [
                  get('member_id'),
                  get('product'),
                  date,
                  parseDate(get('start_date')),
                  parseDate(get('end_date')),
                  get('amount'),
                ].join('|'),
              )
              .digest('hex')
          : String(get('source_uid') || '');
  return { get, date, studioId, uid, errors, rowNumber, raw: row };
}

export async function validateImport(
  id: number,
  category: string,
  mapping: Record<string, string>,
  worksheet?: string,
) {
  const importRow = db.prepare('SELECT * FROM imports WHERE id=?').get(id) as any;
  if (!importRow) throw new Error('Import not found.');
  db.prepare(`UPDATE imports SET status='validating',category=?,mapping=?,worksheet=?,error=NULL WHERE id=?`).run(
    category,
    JSON.stringify(mapping),
    worksheet || null,
    id,
  );
  db.prepare('DELETE FROM import_errors WHERE import_id=?').run(id);
  try {
    const rows = await readRows(importRow, worksheet);
    const seen = new Set<string>();
    let valid = 0,
      invalid = 0,
      duplicates = 0;
    const errorInsert = db.prepare(
      'INSERT INTO import_errors(import_id,row_number,field,message,raw_row) VALUES (?,?,?,?,?)',
    );
    const duplicateTable =
      category === 'sales'
        ? 'transactions'
        : category === 'leads'
          ? 'leads'
          : category === 'sessions'
            ? 'class_sessions'
            : category === 'checkins'
              ? 'checkins'
              : category === 'packages'
                ? 'customer_packages'
                : category === 'visits'
                  ? 'member_visits'
                  : null;
    for (let i = 0; i < rows.length; i++) {
      const item = normalise(rows[i], category, mapping, i + 2);
      let duplicate = false;
      if (item.uid && duplicateTable) {
        if (seen.has(item.uid)) duplicate = true;
        else if (
          db
            .prepare(`SELECT 1 FROM ${duplicateTable} WHERE source_uid=?`)
            .get(category === 'checkins' ? Buffer.from(item.uid, 'hex') : item.uid)
        )
          duplicate = true;
        seen.add(item.uid);
      }
      if (duplicate) {
        duplicates++;
        errorInsert.run(
          id,
          i + 2,
          'source_uid',
          'Duplicate source record; existing record will be preserved.',
          errorRow(category, rows[i]),
        );
      } else if (item.errors.length) {
        invalid++;
        item.errors.forEach(message => errorInsert.run(id, i + 2, null, message, errorRow(category, rows[i])));
      } else valid++;
    }
    const summary = {
      valid,
      invalid,
      duplicates,
      total: rows.length,
      validatedAt: new Date().toISOString(),
      category,
      note: 'Invalid and duplicate rows are never silently discarded. Download the error report for row-level detail.',
      ...(category === 'checkins'
        ? {
            privacy: 'Names and email addresses are not persisted; member references are salted hashes.',
            metricBoundary:
              'Checkins are operational behaviour, not revenue actuals. Current-day and future sessions are excluded from observed metrics.',
          }
        : {}),
    };
    db.prepare(
      `UPDATE imports SET status='validated',total_rows=?,valid_rows=?,invalid_rows=?,duplicate_rows=?,summary=? WHERE id=?`,
    ).run(rows.length, valid, invalid, duplicates, JSON.stringify(summary), id);
    return summary;
  } catch (error: any) {
    db.prepare(`UPDATE imports SET status='failed',error=? WHERE id=?`).run(error.message, id);
    throw error;
  }
}

export async function commitImport(id: number, userId: number, createStudios = false) {
  const importRow = db.prepare('SELECT * FROM imports WHERE id=?').get(id) as any;
  if (!importRow || !['validated', 'committing'].includes(importRow.status))
    throw new Error('Validate the file before importing.');
  const category = importRow.category,
    mapping = JSON.parse(importRow.mapping || '{}');
  const rows = await readRows(importRow, importRow.worksheet);
  if (createStudios) {
    for (const row of rows) {
      const raw = mapping.studio ? row[mapping.studio] : null;
      if (raw && !resolveStudio(raw)) {
        const name = String(raw).trim(),
          code =
            name
              .replace(/[^A-Za-z]/g, '')
              .slice(0, 6)
              .toUpperCase() || `S${Date.now()}`;
        try {
          db.prepare('INSERT INTO studios(name,code,city,aliases) VALUES (?,?,?,?)').run(
            name,
            `${code}${String(Date.now()).slice(-3)}`,
            'Unspecified',
            JSON.stringify([name]),
          );
        } catch {
          /* concurrent duplicate surfaced during validation */
        }
      }
    }
  }
  let imported = 0,
    skipped = 0;
  const memberState = new Map<string, any>();
  const insertError = db.prepare(
    'INSERT INTO import_errors(import_id,row_number,field,message,raw_row) VALUES (?,?,?,?,?)',
  );
  const work = db.transaction(() => {
    for (let i = 0; i < rows.length; i++) {
      const item = normalise(rows[i], category, mapping, i + 2);
      if (item.errors.length) {
        skipped++;
        continue;
      }
      const { get, studioId, uid } = item;
      const date = item.date!;
      try {
        if (category === 'sales') {
          const member = hashRef(get('member_id'));
          let state = memberState.get(member);
          if (!state) {
            state = db
              .prepare(
                `SELECT COUNT(*) seen,MAX(membership_end) previous_end FROM transactions WHERE member_ref=? AND category NOT IN ('Retail','Money Credits','Gift Cards','Others')`,
              )
              .get(member);
            memberState.set(member, state);
          }
          const service = !['Retail', 'Money Credits', 'Gift Cards', 'Others'].includes(String(get('category')));
          const start = parseDate(get('membership_start')),
            end = parseDate(get('membership_end'));
          let stream = 'additional',
            first = 0;
          if (service && !state.seen) {
            stream = 'new_client';
            first = 1;
          } else if (service && state.previous_end && start) {
            const gap = daysBetween(state.previous_end, start);
            if (gap !== null && gap > 60) stream = 'reactivation';
            else if (gap !== null && gap >= -45) stream = 'renewal';
          }
          const result = db
            .prepare(
              `INSERT OR IGNORE INTO transactions(source_uid,member_ref,studio_id,purchased_at,month,amount,net_amount,discount_amount,discount_code,product_name,category,revenue_stream,is_first_observed,membership_start,membership_end,sold_by,import_id)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            )
            .run(
              uid,
              member,
              studioId,
              date,
              date.slice(0, 7),
              money(get('amount')),
              money(get('net_amount')),
              money(get('discount_amount')),
              String(get('discount_code') || '').replace(/^-$/, '') || null,
              get('product'),
              get('category'),
              stream,
              first,
              start,
              end,
              get('sold_by') || null,
              id,
            );
          if (!result.changes) {
            skipped++;
            continue;
          }
          if (service) {
            state.seen = 1;
            if (end) state.previous_end = end;
          }
        } else if (category === 'leads') {
          const result = db
            .prepare(
              `INSERT OR IGNORE INTO leads(source_uid,member_ref,studio_id,created_at,month,converted_at,source_name,campaign,stage,trial_status,conversion_status,retention_status,purchases,ltv,visits,import_id)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            )
            .run(
              uid,
              get('member_id') && get('member_id') !== '-' ? hashRef(get('member_id')) : null,
              studioId,
              date,
              date.slice(0, 7),
              parseDate(get('converted_at')),
              get('source_name'),
              get('campaign'),
              get('stage'),
              get('trial_status'),
              get('conversion_status'),
              get('retention_status'),
              money(get('purchases')),
              money(get('ltv')),
              money(get('visits')),
              id,
            );
          if (!result.changes) {
            skipped++;
            continue;
          }
        } else if (category === 'visits') {
          const result = db
            .prepare(
              `INSERT OR IGNORE INTO member_visits(source_uid,member_ref,studio_id,first_visit_at,month,first_purchase_at,first_purchase_value,ltv,visits,conversion_status,retention_status,source_name,import_id)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            )
            .run(
              uid,
              hashRef(get('member_id')),
              studioId,
              date,
              date.slice(0, 7),
              parseDate(get('first_purchase_at')),
              money(get('first_purchase_value')),
              money(get('ltv')),
              money(get('visits')),
              get('conversion_status'),
              get('retention_status'),
              get('source_name'),
              id,
            );
          if (!result.changes) {
            skipped++;
            continue;
          }
        } else if (category === 'sessions') {
          const result = db
            .prepare(
              `INSERT OR IGNORE INTO class_sessions(source_uid,studio_id,session_date,month,capacity,checked_in,booked,session_name,session_type,import_id) VALUES (?,?,?,?,?,?,?,?,?,?)`,
            )
            .run(
              uid,
              studioId,
              date,
              date.slice(0, 7),
              money(get('capacity')),
              money(get('checked_in')),
              money(get('booked')),
              get('product'),
              get('category'),
              id,
            );
          if (!result.changes) {
            skipped++;
            continue;
          }
        } else if (category === 'checkins') {
          const sessionAt = epochDateTime(get('date'))!;
          const result = db
            .prepare(
              `INSERT OR IGNORE INTO checkins(source_uid,member_ref,studio_id,session_at,month,checked_in,late_cancelled,complimentary,class_name,visit_type,order_at,import_id)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
            )
            .run(
              Buffer.from(uid, 'hex'),
              hashBinaryRef(get('member_id')),
              studioId,
              sessionAt,
              date.slice(0, 7),
              booleanValue(get('checked_in')),
              booleanValue(get('late_cancelled')),
              booleanValue(get('complimentary')) ?? 0,
              get('product') || null,
              get('visit_type') || null,
              epochDateTime(get('order_at')),
              id,
            );
          if (!result.changes) {
            skipped++;
            continue;
          }
        } else if (category === 'packages') {
          const result = db
            .prepare(
              `INSERT OR IGNORE INTO customer_packages(source_uid,member_ref,studio_id,status,product_name,purchase_date,start_date,end_date,churned_date,amount,discount_amount,original_amount,sessions_limit,sessions_used,days_since_last_visit,average_sessions_month,import_id)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            )
            .run(
              uid,
              hashRef(get('member_id')),
              studioId,
              get('status'),
              get('product'),
              date,
              parseDate(get('start_date')),
              parseDate(get('end_date')),
              parseDate(get('churned_date')),
              money(get('amount')),
              money(get('discount_amount')),
              money(get('original_amount')),
              money(get('sessions_limit')) || null,
              (money(get('sessions_limit')) * money(get('sessions_used_percent'))) / 100 || null,
              money(get('days_since_last_visit')) || null,
              money(get('average_sessions_month')) || null,
              id,
            );
          if (!result.changes) {
            skipped++;
            continue;
          }
        } else if (category === 'products') {
          const sid = resolveStudio(get('studio'));
          if (!sid) {
            skipped++;
            insertError.run(
              id,
              i + 2,
              'studio',
              'Product skipped: map host ID to a studio or add products manually.',
              JSON.stringify(rows[i]),
            );
            continue;
          }
          db.prepare(
            `INSERT INTO products(studio_id,external_id,name,category,list_price,sessions_included,validity_days,source) VALUES (?,?,?,?,?,?,?,'import') ON CONFLICT(studio_id,name) DO UPDATE SET list_price=excluded.list_price,updated_at=CURRENT_TIMESTAMP WHERE products.source!='manual'`,
          ).run(
            sid,
            uid || null,
            get('product'),
            get('category') || 'package',
            money(get('amount')),
            money(get('sessions_limit')) || 1,
            money(get('validity_days')) || null,
          );
        } else if (category === 'targets') {
          const year = Number(get('year')),
            month = Number(get('month'));
          const proposed = money(get('proposed_target')),
            approved =
              mapping.approved_target && String(get('approved_target')).trim() ? money(get('approved_target')) : null;
          db.prepare(
            `INSERT INTO monthly_targets(studio_id,year,month,proposed_target,approved_target,scenario,source,data_mode,updated_by) VALUES (?,?,?,?,?,?,'import','imported',?)
            ON CONFLICT(studio_id,year,month) DO UPDATE SET proposed_target=excluded.proposed_target,approved_target=excluded.approved_target,scenario=excluded.scenario,source='import',data_mode='imported',version=monthly_targets.version+1,updated_at=CURRENT_TIMESTAMP`,
          ).run(studioId, year, month, proposed, approved, get('scenario') || 'base', userId);
        }
        imported++;
      } catch (error: any) {
        skipped++;
        insertError.run(id, i + 2, null, `Import failed: ${error.message}`, errorRow(category, rows[i]));
      }
    }
  });
  work();
  db.prepare(
    `UPDATE imports SET status='committed',imported_rows=?,summary=?,completed_at=CURRENT_TIMESTAMP WHERE id=?`,
  ).run(
    imported,
    JSON.stringify({
      ...JSON.parse(importRow.summary || '{}'),
      imported,
      skippedDuringCommit: skipped,
      committedAt: new Date().toISOString(),
    }),
    id,
  );
  if (['sales', 'leads', 'visits', 'packages'].includes(category)) recalculateSegments();
  return { imported, skipped, total: rows.length };
}
