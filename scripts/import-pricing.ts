#!/usr/bin/env npx tsx
/* Load the studio price lists (server/data/pricing/Pricing - <City>.csv) into the products
   catalogue that the Memberships page reads. Mumbai prices apply to Kemps Corner and Bandra,
   Bengaluru prices to Kenkere House and Pop-up. Rows are upserted by (studio, name); the
   "Testing & Internal" group is skipped. list_price is the GST-inclusive price, the figure
   offers are priced from.

     npx tsx scripts/import-pricing.ts [--dry] */
import 'dotenv/config';
import fs from 'node:fs';
import { db } from '../server/db.js';

const dry = process.argv.includes('--dry');
const FILES: Record<string, { file: string; studios: string[] }> = {
  Mumbai: { file: 'server/data/pricing/Pricing - Mumbai.csv', studios: ['Kemps Corner', 'Bandra'] },
  Bengaluru: { file: 'server/data/pricing/Pricing - Bengaluru.csv', studios: ['Kenkere House', 'Pop-up'] },
};

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = '',
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') (cell += '"'), i++;
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') row.push(cell), (cell = '');
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell), rows.push(row), (row = []), (cell = '');
    } else cell += c;
  }
  if (cell || row.length) row.push(cell), rows.push(row);
  return rows.filter(r => r.some(v => v.trim()));
}

const amount = (v: string) => {
  const n = Number(String(v).replace(/[^\d.]/g, ''));
  return /free/i.test(v) || !Number.isFinite(n) ? 0 : n;
};
const days = (v: string): number | null => {
  const m = v.match(/(\d+)\s*(day|month|year)/i);
  if (!m) return null;
  const n = Number(m[1]);
  return /year/i.test(m[2]) ? n * 365 : /month/i.test(m[2]) ? n * 30 : n;
};
const CATEGORY: Record<string, string> = {
  'Newcomers & Promos': 'Intro package',
  'Class Packs': 'Class package',
  'Unlimited (All-Access)': 'Unlimited membership',
  'Specialized Unlimited': 'Specialised membership',
  'Private Training': 'Private training package',
  'Complimentary & Perks': 'Complimentary pass',
};

const studioId = (name: string) => (db.prepare('SELECT id FROM studios WHERE name=?').get(name) as any)?.id as number;
const upsert = db.prepare(`
  INSERT INTO products(studio_id, external_id, name, category, list_price, sessions_included, validity_days, active, source,
    price_before_gst, plan_type, class_limit, freeze_attempts, max_freeze_days, active_signups, duration_label, price_basis)
  VALUES (@studio_id,@external_id,@name,@category,@list_price,@sessions,@validity,1,'price list',
    @before,@type,@limit,@freezes,@freeze_days,@signups,@duration,@basis)
  ON CONFLICT(studio_id, name) DO UPDATE SET external_id=excluded.external_id, category=excluded.category,
    list_price=excluded.list_price, sessions_included=excluded.sessions_included, validity_days=excluded.validity_days,
    active=1, source=excluded.source, price_before_gst=excluded.price_before_gst, plan_type=excluded.plan_type,
    class_limit=excluded.class_limit, freeze_attempts=excluded.freeze_attempts, max_freeze_days=excluded.max_freeze_days,
    active_signups=excluded.active_signups, duration_label=excluded.duration_label, price_basis=excluded.price_basis,
    updated_at=CURRENT_TIMESTAMP`);

let count = 0;
const run = db.transaction(() => {
  for (const [city, { file, studios }] of Object.entries(FILES)) {
    const [header, ...rows] = parseCsv(fs.readFileSync(file, 'utf8'));
    const col = (name: string) => header.findIndex(h => h.startsWith(name));
    let group = '';
    for (const r of rows) {
      if (r[0]?.trim()) group = r[0].replace(/^\d+\.\s*/, '').trim();
      if (/testing/i.test(group)) continue;
      const limit = r[col('Class Limit')];
      const classes = limit.match(/(\d+)/);
      const after = r[col('Price After GST')];
      const record = {
        external_id: r[col('ID')],
        name: r[col('Name')].trim(),
        category: CATEGORY[group] || group,
        list_price: amount(after),
        sessions: classes ? Number(classes[1]) : 0,
        validity: days(r[col('Duration')]),
        before: amount(r[col('Price Before GST')]),
        type: r[col('Type')],
        limit,
        freezes: Number(r[col('Freeze Attempts')]) || 0,
        freeze_days: days(r[col('Max Freeze Days')]) ?? 0,
        signups: Number(r[col('Active Signups')]) || 0,
        duration: r[col('Duration')],
        basis: /\/\s*mo/.test(after) ? 'per month' : 'one-off',
      };
      for (const s of studios) {
        const id = studioId(s);
        if (!id) throw new Error(`No studio named ${s}`);
        if (!dry) upsert.run({ ...record, studio_id: id });
        count++;
      }
    }
    console.log(`${city}: ${rows.length} rows → ${studios.join(', ')}`);
  }
});
run();
console.log(`${dry ? 'Would load' : 'Loaded'} ${count} price-list products.`);
