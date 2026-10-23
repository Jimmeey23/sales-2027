import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { parse } from 'csv-parse/sync';
import { db, audit } from '../db.js';
import { canonicalStudio } from './studios.js';
import { parseDate } from './format.js';

export const CHECKINS_PROVENANCE = {
  spreadsheetId: '1a7XKv2WCog7o8nYuV8YcFdqtfPYJNRO6DelJ6Hn_z6Q',
  spreadsheetTitle: 'Day End Report - Part 4',
  worksheet: 'Checkins',
  sourceUrl: 'https://docs.google.com/spreadsheets/d/1a7XKv2WCog7o8nYuV8YcFdqtfPYJNRO6DelJ6Hn_z6Q/edit?gid=0#gid=0',
  exportUrl:
    'https://docs.google.com/spreadsheets/d/1a7XKv2WCog7o8nYuV8YcFdqtfPYJNRO6DelJ6Hn_z6Q/export?format=csv&gid=0',
};

const boolean = (value: unknown): number | null => {
  const text = String(value ?? '')
    .trim()
    .toUpperCase();
  if (text === 'TRUE' || text === '1') return 1;
  if (text === 'FALSE' || text === '0') return 0;
  return null;
};
const dateTime = (value: unknown): string | null => {
  const match = String(value ?? '')
    .trim()
    .match(/^(\d{4}-\d{2}-\d{2})[,\s]+(\d{2}:\d{2}:\d{2})/);
  return match && parseDate(match[1]) ? `${match[1]} ${match[2]}` : null;
};
const hashSalt = () => process.env.MEMBER_HASH_SALT || 'p57-local-demonstration-salt';
const memberRef = (value: unknown) =>
  crypto
    .createHash('sha256')
    .update(`${hashSalt()}:${String(value)}`)
    .digest();
const sourceUid = (parts: unknown[]) =>
  crypto
    .createHash('sha256')
    .update(parts.map(v => String(v ?? '').trim()).join('|'))
    .digest('hex');
const epoch = (value: string | null) => (value ? Math.floor(Date.parse(`${value.replace(' ', 'T')}Z`) / 1000) : null);
const safeErrorRow = (row: any) => ({
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

export function importCheckinsFile(options: { filePath: string; createdBy?: number; filename?: string }) {
  const filePath = path.resolve(options.filePath);
  if (!fs.existsSync(filePath)) throw new Error(`Checkins source file not found: ${filePath}`);
  const rows = parse(fs.readFileSync(filePath), {
    columns: true,
    bom: true,
    relaxColumnCount: true,
    skipEmptyLines: true,
  }) as any[];
  if (!rows.length) throw new Error('The Checkins source contains no data rows.');
  const required = ['Member ID', 'Session ID', 'Location', 'Date (IST)', 'Checked In', 'Is Late Cancelled'];
  const missing = required.filter(field => !(field in rows[0]));
  if (missing.length) throw new Error(`Checkins source is missing required columns: ${missing.join(', ')}`);
  const admin =
    options.createdBy ||
    Number((db.prepare(`SELECT id FROM users WHERE role='administrator' ORDER BY id LIMIT 1`).get() as any)?.id || 0) ||
    null;
  const filename = options.filename || `${CHECKINS_PROVENANCE.spreadsheetTitle} — Checkins.csv`;
  const importId = Number(
    db
      .prepare(
        `INSERT INTO imports(filename,file_path,category,worksheet,status,total_rows,summary,created_by)
    VALUES (?,?,?,?,'processing',?,?,?)`,
      )
      .run(
        filename,
        null,
        'checkins',
        CHECKINS_PROVENANCE.worksheet,
        rows.length,
        JSON.stringify({
          ...CHECKINS_PROVENANCE,
          importedAt: new Date().toISOString(),
          privacy: 'Source names and email addresses are not persisted.',
        }),
        admin,
      ).lastInsertRowid,
  );
  const errorInsert = db.prepare(
    'INSERT INTO import_errors(import_id,row_number,field,message,raw_row) VALUES (?,?,?,?,?)',
  );
  const insert = db.prepare(`INSERT OR IGNORE INTO checkins(source_uid,member_ref,studio_id,session_at,month,
    checked_in,late_cancelled,complimentary,class_name,visit_type,order_at,import_id)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`);
  const seen = new Set<string>();
  let imported = 0,
    invalid = 0,
    duplicates = 0,
    futureRows = 0,
    checked = 0,
    lateCancelled = 0,
    otherNotChecked = 0;
  let first: string | null = null,
    last: string | null = null;
  const today = new Date().toISOString().slice(0, 10);
  try {
    const work = db.transaction(() => {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNumber = i + 2;
        const studioName = canonicalStudio(row.Location);
        const studio = studioName ? (db.prepare('SELECT id FROM studios WHERE name=?').get(studioName) as any) : null;
        const sessionAt = dateTime(row['Date (IST)']);
        const checkedIn = boolean(row['Checked In']),
          late = boolean(row['Is Late Cancelled']);
        const complimentary = boolean(row.Complementary) ?? 0;
        const problem = !row['Member ID']
          ? 'Member ID'
          : !row['Session ID']
            ? 'Session ID'
            : !sessionAt
              ? 'Date (IST)'
              : !studio
                ? 'Location'
                : checkedIn === null
                  ? 'Checked In'
                  : late === null
                    ? 'Is Late Cancelled'
                    : null;
        if (problem) {
          invalid++;
          errorInsert.run(
            importId,
            rowNumber,
            problem,
            problem === 'Location' ? 'Unrecognised studio location.' : 'Missing or invalid required Checkins field.',
            JSON.stringify(safeErrorRow(row)),
          );
          continue;
        }
        const uid = sourceUid([row['Session ID'], row['Member ID'], row['Order At'], row['Date (IST)']]);
        if (seen.has(uid)) {
          duplicates++;
          errorInsert.run(
            importId,
            rowNumber,
            'source_uid',
            'Duplicate Session ID + member + order timestamp + session timestamp excluded.',
            JSON.stringify(safeErrorRow(row)),
          );
          continue;
        }
        seen.add(uid);
        const sessionDate = sessionAt!.slice(0, 10);
        const result = insert.run(
          Buffer.from(uid, 'hex'),
          memberRef(row['Member ID']),
          studio.id,
          epoch(sessionAt),
          sessionDate.slice(0, 7),
          checkedIn,
          late,
          complimentary,
          String(row['Cleaned Class'] || row['Session Name'] || '').trim() || null,
          String(row['Is New'] || '').trim() || null,
          epoch(dateTime(row['Order At'])),
          importId,
        );
        if (!result.changes) {
          duplicates++;
          errorInsert.run(
            importId,
            rowNumber,
            'source_uid',
            'Source record already exists; existing record preserved.',
            JSON.stringify(safeErrorRow(row)),
          );
          continue;
        }
        imported++;
        if (sessionDate > today) futureRows++;
        else {
          checked += checkedIn!;
          lateCancelled += late!;
          otherNotChecked += checkedIn === 0 && late === 0 ? 1 : 0;
        }
        first = !first || sessionDate < first ? sessionDate : first;
        last = !last || sessionDate > last ? sessionDate : last;
      }
      db.prepare(
        `UPDATE imports SET status='committed',valid_rows=?,invalid_rows=?,duplicate_rows=?,imported_rows=?,summary=?,completed_at=CURRENT_TIMESTAMP WHERE id=?`,
      ).run(
        imported,
        invalid,
        duplicates,
        imported,
        JSON.stringify({
          ...CHECKINS_PROVENANCE,
          source: 'google_sheets_csv_export',
          importedAt: new Date().toISOString(),
          dateRange: [first, last],
          behaviourThrough: today,
          futureScheduledRowsExcludedFromActuals: futureRows,
          observedStatusRows: { checkedIn: checked, lateCancelled, otherNotChecked },
          duplicateKey: 'SHA-256(Session ID + Member ID + Order At + Date IST)',
          privacy:
            'Only salted member hashes are stored. Names, email addresses, free-text customer identifiers and raw payment values are not persisted in checkins.',
          metricBoundary:
            'Paid is not imported or summed as revenue. Attendance and cancellation records are operational context, not revenue actuals or incremental lift.',
          trialLimitation:
            'Unattended rows are labelled Not Attended in the source, so trial-specific booking attendance cannot be recovered.',
        }),
        importId,
      );
      audit({
        userId: admin,
        action: 'import',
        entityType: 'checkins',
        entityId: importId,
        after: { importId, imported, invalid, duplicates, dateRange: [first, last] },
        reason: 'Imported privacy-safe member check-in and late-cancellation behaviour from the supplied Google Sheet.',
      });
    });
    work();
    return { importId, total: rows.length, imported, invalid, duplicates, futureRows, dateRange: [first, last] };
  } catch (error: any) {
    db.prepare(`UPDATE imports SET status='failed',error=? WHERE id=?`).run(error.message, importId);
    throw error;
  }
}
