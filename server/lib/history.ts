import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import pg from 'pg';
import Database from 'better-sqlite3';

// The sales history (sales lines, check-ins, leads, packages…) is too large to sync row by row,
// so it is published to Supabase as one compressed SQLite snapshot. Vercel instances download it
// on a cold start; planning data is then loaded live on top (see supabaseSync.ts).
// This module must not import ../db.js: it runs before the database file exists.
const CHUNK = 4 * 1024 * 1024;

function connect() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set.');
  const local = /@(localhost|127\.0\.0\.1)|^postgres(ql)?:\/\/\//.test(url);
  return new pg.Client({ connectionString: url, ssl: local ? false : { rejectUnauthorized: false } });
}

export async function publishHistory(sourcePath: string) {
  const tmp = path.join(os.tmpdir(), `p57-history-${Date.now()}.db`);
  await new Database(sourcePath, { readonly: true }).backup(tmp);
  const copy = new Database(tmp);
  // Drop data that is per-machine or not needed to run the app.
  copy.exec('DELETE FROM import_errors; DELETE FROM auth_sessions; DELETE FROM _sync_outbox; VACUUM;');
  copy.close();
  const gz = zlib.gzipSync(fs.readFileSync(tmp), { level: 9 });
  fs.rmSync(tmp, { force: true });
  const client = connect();
  await client.connect();
  try {
    await client.query(
      'CREATE TABLE IF NOT EXISTS "_history_snapshot" (part int PRIMARY KEY, data bytea NOT NULL, published_at timestamptz NOT NULL DEFAULT now())',
    );
    await client.query('BEGIN');
    await client.query('DELETE FROM "_history_snapshot"');
    for (let i = 0; i * CHUNK < gz.length; i++)
      await client.query('INSERT INTO "_history_snapshot"(part, data) VALUES ($1, $2)', [
        i,
        gz.subarray(i * CHUNK, (i + 1) * CHUNK),
      ]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
  return { compressedBytes: gz.length, parts: Math.ceil(gz.length / CHUNK) };
}

export async function hydrateHistory(targetPath: string) {
  if (fs.existsSync(targetPath)) return false;
  const client = connect();
  await client.connect();
  try {
    const t0 = Date.now();
    const { rows } = await client.query('SELECT data FROM "_history_snapshot" ORDER BY part');
    console.log(`History snapshot downloaded in ${Date.now() - t0} ms`);
    if (!rows.length)
      throw new Error('No history snapshot in Supabase. Run `npm run history:publish` from a machine with the data.');
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, zlib.gunzipSync(Buffer.concat(rows.map(r => r.data))));
    return true;
  } finally {
    await client.end();
  }
}
