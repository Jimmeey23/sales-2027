import pg from 'pg';
import { db } from '../db.js';
import { clearJsonCache } from './httpCache.js';

// Supabase Postgres is the durable store for planning data. The server keeps working against
// the local SQLite file; SQLite triggers record every change in _sync_outbox and a flusher
// writes those rows to Postgres. On startup Postgres is loaded back into SQLite, so whatever
// is in Supabase wins. Sales history, check-ins and leads stay local only.
export const SYNC_TABLES: Array<{ table: string; pk: string }> = [
  { table: 'studios', pk: 'id' },
  { table: 'users', pk: 'id' },
  { table: 'products', pk: 'id' },
  { table: 'studio_offer_policies', pk: 'studio_id' },
  { table: 'settings', pk: 'key' },
  { table: 'segment_rules', pk: 'id' },
  { table: 'monthly_targets', pk: 'id' },
  { table: 'target_versions', pk: 'id' },
  { table: 'offers', pk: 'id' },
  { table: 'offer_versions', pk: 'id' },
  { table: 'offer_experiments', pk: 'id' },
  { table: 'campaigns', pk: 'id' },
  { table: 'campaign_performance', pk: 'id' },
  { table: 'monthly_plans', pk: 'id' },
  { table: 'studio_playbook_items', pk: 'id' },
  { table: 'saved_reports', pk: 'id' },
  { table: 'audit_logs', pk: 'id' },
  // Shared so a login stays valid across Vercel instances.
  { table: 'auth_sessions', pk: 'id' },
];

let pool: pg.Pool | null = null;
let flushing: Promise<boolean> | null = null,
  timer: NodeJS.Timeout | null = null;
// Highest Supabase change-log entry this process has applied (see pullRemoteChanges).
let lastSeq = 0;
// _changes.seq is a bigserial: a lower seq can commit after a higher one is already visible, so each
// pull re-reads this trailing window and applies only the entries it has not seen yet.
const SEQ_WINDOW = 500;
const seenSeqs = new Set<number>();
const pruneSeen = () => {
  for (const seq of seenSeqs) if (seq <= lastSeq - SEQ_WINDOW) seenSeqs.delete(seq);
};
const quote = (name: string) => `"${name.replaceAll('"', '""')}"`;
// The local schema is fixed once the server has started, and load paths ask per cell, so cache it.
const columnCache = new Map<string, any[]>();
const columnsOf = (table: string) => {
  if (!columnCache.has(table)) columnCache.set(table, db.pragma(`table_info(${table})`) as any[]);
  return columnCache.get(table)!;
};
const pgType = (sqliteType: string) =>
  /INT/i.test(sqliteType) ? 'bigint' : /REAL|FLOA|DOUB|NUM/i.test(sqliteType) ? 'double precision' : 'text';

export const syncEnabled = () => Boolean(process.env.DATABASE_URL);

function installTriggers() {
  db.exec(
    'CREATE TABLE IF NOT EXISTS _sync_outbox (id INTEGER PRIMARY KEY AUTOINCREMENT, tbl TEXT NOT NULL, pk TEXT NOT NULL)',
  );
  db.exec('CREATE TABLE IF NOT EXISTS _sync_state (key TEXT PRIMARY KEY, value TEXT)');
  for (const { table, pk } of SYNC_TABLES) {
    for (const [event, ref] of [
      ['INSERT', 'NEW'],
      ['UPDATE', 'NEW'],
      ['DELETE', 'OLD'],
    ] as const) {
      db.exec(`CREATE TRIGGER IF NOT EXISTS _sync_${table}_${event.toLowerCase()} AFTER ${event} ON ${table}
        BEGIN INSERT INTO _sync_outbox(tbl, pk) VALUES ('${table}', CAST(${ref}.${pk} AS TEXT)); END`);
    }
  }
}

// One round trip to read what exists, then only create/alter what is missing (Supabase may be far away).
async function ensureRemoteSchema(client: pg.PoolClient) {
  const { rows } = await client.query(
    `SELECT table_name, column_name FROM information_schema.columns WHERE table_schema='public'`,
  );
  const existing = new Map<string, Set<string>>();
  for (const r of rows) {
    if (!existing.has(r.table_name)) existing.set(r.table_name, new Set());
    existing.get(r.table_name)!.add(r.column_name);
  }
  const statements: string[] = [];
  for (const { table, pk } of SYNC_TABLES) {
    const cols = columnsOf(table),
      have = existing.get(table);
    if (!have)
      statements.push(
        `CREATE TABLE ${quote(table)} (${cols.map(c => `${quote(c.name)} ${pgType(c.type)}${c.name === pk ? ' PRIMARY KEY' : ''}`).join(', ')})`,
      );
    else
      for (const c of cols)
        if (!have.has(c.name))
          statements.push(`ALTER TABLE ${quote(table)} ADD COLUMN ${quote(c.name)} ${pgType(c.type)}`);
  }
  statements.push(
    'CREATE TABLE IF NOT EXISTS "_changes" (seq bigserial PRIMARY KEY, tbl text NOT NULL, pk text NOT NULL, at timestamptz NOT NULL DEFAULT now())',
  );
  if (statements.length > 1) console.log(`Supabase: creating/updating ${statements.length - 1} table definitions…`);
  await client.query(statements.join(';\n'));
}

async function pushRows(client: pg.PoolClient, table: string, pk: string, rows: any[]) {
  if (!rows.length) return;
  const cols = columnsOf(table).map(c => c.name);
  const updates = cols
    .filter(c => c !== pk)
    .map(c => `${quote(c)}=EXCLUDED.${quote(c)}`)
    .join(', ');
  for (let i = 0; i < rows.length; i += 200) {
    const batch = rows.slice(i, i + 200),
      params: any[] = [];
    const values = batch
      .map(
        row =>
          `(${cols
            .map(c => {
              params.push(row[c] ?? null);
              return `$${params.length}`;
            })
            .join(',')})`,
      )
      .join(',');
    await client.query(
      `INSERT INTO ${quote(table)} (${cols.map(quote).join(',')}) VALUES ${values}
      ON CONFLICT (${quote(pk)}) DO ${updates ? `UPDATE SET ${updates}` : 'NOTHING'}`,
      params,
    );
  }
}

// Load Supabase into SQLite (Supabase wins). If Supabase is still empty, this is the first
// migration: push the local planning data up instead.
async function reconcile(client: pg.PoolClient, remoteEmpty: boolean) {
  const counts: Record<string, { local: number; remote: number; action: string }> = {};
  // Supabase is far away and each table is one round trip, so download them all at once (the pool caps concurrency).
  const remote = remoteEmpty
    ? null
    : await Promise.all(
        SYNC_TABLES.map(({ table }) =>
          pool!.query(`SELECT ${columnsOf(table).map(c => quote(c.name)).join(',')} FROM ${quote(table)}`),
        ),
      );
  db.pragma('foreign_keys = OFF');
  try {
    for (const [index, { table, pk }] of SYNC_TABLES.entries()) {
      const cols = columnsOf(table).map(c => c.name);
      if (remoteEmpty) {
        console.log(`Supabase: copying ${table}…`);
        await pushRows(client, table, pk, db.prepare(`SELECT * FROM ${table}`).all() as any[]);
        counts[table] = {
          local: Number((db.prepare(`SELECT COUNT(*) n FROM ${table}`).get() as any).n),
          remote: 0,
          action: 'pushed',
        };
        continue;
      }
      const { rows } = remote![index];
      db.transaction(() => {
        db.prepare(`DELETE FROM ${table}`).run();
        const insert = db.prepare(`INSERT INTO ${table} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`);
        for (const row of rows) insert.run(...cols.map(c => toLocal(table, c, row[c])));
      })();
      counts[table] = { local: rows.length, remote: rows.length, action: 'pulled' };
    }
    // Rows written by the reconcile itself are already in Supabase.
    db.prepare('DELETE FROM _sync_outbox').run();
    if (remoteEmpty)
      for (const { table } of SYNC_TABLES)
        counts[table].remote = Number((await client.query(`SELECT COUNT(*) n FROM ${quote(table)}`)).rows[0].n);
  } finally {
    db.pragma('foreign_keys = ON');
  }
  return counts;
}
const pgTypeOf = (table: string, column: string) => pgType(columnsOf(table).find(c => c.name === column)?.type || '');
// A column added to Supabase after its rows existed holds NULL there; a NOT NULL local column takes its default instead.
const notNullDefault = (table: string, column: string) => {
  const info = columnsOf(table).find(c => c.name === column);
  if (!info?.notnull || info.dflt_value === null) return null;
  const raw = String(info.dflt_value);
  return /^-?\d+(\.\d+)?$/.test(raw) ? Number(raw) : raw.replace(/^'(.*)'$/s, '$1').replaceAll("''", "'");
};
const toLocal = (table: string, column: string, value: any) =>
  value === null || value === undefined
    ? notNullDefault(table, column)
    : typeof value === 'string' && /^-?\d+$/.test(value) && pgTypeOf(table, column) === 'bigint'
      ? Number(value)
      : value;

// Sends every queued local change to Supabase and records it in the shared change log.
// Resolves true once the outbox is empty, false if sending failed (the changes stay queued).
export function flushOutbox(): Promise<boolean> {
  if (!pool) return Promise.resolve(true);
  if (flushing) return flushing.then(() => flushOutbox());
  let run: Promise<boolean> | null = null;
  run = (async () => {
    await Promise.resolve(); // let `flushing` be assigned before any early return clears it
    try {
      for (;;) {
        const pending = db.prepare('SELECT * FROM _sync_outbox ORDER BY id LIMIT 5000').all() as any[];
        if (!pending.length) return true;
        const latest = new Map<string, { tbl: string; pk: string }>();
        for (const item of pending) latest.set(`${item.tbl}:${item.pk}`, item);
        const client = await pool!.connect();
        try {
          await client.query('BEGIN');
          for (const spec of SYNC_TABLES) {
            const keys = [...latest.values()].filter(i => i.tbl === spec.table).map(i => i.pk);
            if (!keys.length) continue;
            const rows: any[] = [],
              gone: string[] = [];
            for (const key of keys) {
              const row = db.prepare(`SELECT * FROM ${spec.table} WHERE ${spec.pk}=?`).get(key);
              if (row) rows.push(row);
              else gone.push(key);
            }
            await pushRows(client, spec.table, spec.pk, rows);
            if (gone.length)
              await client.query(`DELETE FROM ${quote(spec.table)} WHERE ${quote(spec.pk)}::text = ANY($1)`, [gone]);
            await client.query('INSERT INTO "_changes"(tbl, pk) SELECT $1, unnest($2::text[])', [spec.table, keys]);
          }
          await client.query('COMMIT');
          db.prepare('DELETE FROM _sync_outbox WHERE id<=?').run(pending[pending.length - 1].id);
        } catch (error) {
          await client.query('ROLLBACK').catch(() => {});
          throw error;
        } finally {
          client.release();
        }
      }
    } catch (error: any) {
      console.error(`Supabase sync failed; changes are queued and will retry: ${error.message}`);
      return false;
    } finally {
      if (flushing === run) flushing = null;
    }
  })();
  flushing = run;
  return run!;
}


// Applies changes other processes (e.g. other Vercel instances) wrote since this one last looked.
export async function pullRemoteChanges() {
  if (!pool) return;
  const { rows: windowRows } = await pool.query(
    'SELECT seq, tbl, pk FROM "_changes" WHERE seq > $1 ORDER BY seq LIMIT 5000',
    [Math.max(0, lastSeq - SEQ_WINDOW)],
  );
  const changes = windowRows.filter(c => !seenSeqs.has(Number(c.seq)));
  if (!changes.length) return;
  const fetched: Array<{ spec: (typeof SYNC_TABLES)[number]; keys: string[]; rows: any[] }> = [];
  for (const spec of SYNC_TABLES) {
    const keys = [...new Set(changes.filter(c => c.tbl === spec.table).map(c => String(c.pk)))];
    if (!keys.length) continue;
    const { rows } = await pool.query(`SELECT * FROM ${quote(spec.table)} WHERE ${quote(spec.pk)}::text = ANY($1)`, [
      keys,
    ]);
    fetched.push({ spec, keys, rows });
  }
  const before = Number((db.prepare('SELECT COALESCE(MAX(id),0) n FROM _sync_outbox').get() as any).n);
  db.pragma('foreign_keys = OFF');
  try {
    db.transaction(() => {
      // Local edits not yet sent to Supabase win: never overwrite or delete those rows here.
      // (Read inside the transaction so no write can slip in between this check and the upserts.)
      const pendingKeys = new Set(
        (db.prepare('SELECT tbl, pk FROM _sync_outbox WHERE id<=?').all(before) as any[]).map(p => `${p.tbl}:${p.pk}`),
      );
      for (const { spec, keys: allKeys, rows: allRows } of fetched) {
        const keys = allKeys.filter(k => !pendingKeys.has(`${spec.table}:${k}`));
        const rows = allRows.filter(r => !pendingKeys.has(`${spec.table}:${String(r[spec.pk])}`));
        const cols = columnsOf(spec.table).map(c => c.name);
        const upsert =
          db.prepare(`INSERT INTO ${spec.table} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})
          ON CONFLICT(${spec.pk}) DO UPDATE SET ${cols
            .filter(c => c !== spec.pk)
            .map(c => `${c}=excluded.${c}`)
            .join(',')}`);
        for (const row of rows) upsert.run(...cols.map(c => toLocal(spec.table, c, row[c])));
        const present = new Set(rows.map(r => String(r[spec.pk])));
        for (const key of keys)
          if (!present.has(key)) db.prepare(`DELETE FROM ${spec.table} WHERE ${spec.pk}=?`).run(key);
      }
      // Rows written here already match Supabase; don't send them back.
      db.prepare('DELETE FROM _sync_outbox WHERE id>?').run(before);
    })();
  } finally {
    db.pragma('foreign_keys = ON');
  }
  for (const c of changes) seenSeqs.add(Number(c.seq));
  lastSeq = Math.max(lastSeq, Number(changes[changes.length - 1].seq));
  pruneSeen();
  clearJsonCache();
}

export async function startSupabaseSync() {
  installTriggers();
  if (!syncEnabled()) {
    console.warn('DATABASE_URL is not set: planning data is stored locally only.');
    return null;
  }
  // Supabase requires SSL; a local Postgres (for testing) usually has none.
  const local = /@(localhost|127\.0\.0\.1)|^postgres(ql)?:\/\/\//.test(process.env.DATABASE_URL!);
  // Verify the server certificate when a CA is supplied (Supabase's PEM in SUPABASE_CA_CERT).
  const ca = process.env.SUPABASE_CA_CERT?.replace(/\\n/g, '\n');
  if (!local && !ca)
    console.warn('Supabase: SUPABASE_CA_CERT is not set; the TLS certificate is not verified.');
  pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: local ? false : ca ? { ca, rejectUnauthorized: true } : { rejectUnauthorized: false },
    max: process.env.VERCEL ? 2 : 4,
    idleTimeoutMillis: 10000,
  });
  // An idle connection dropped by the pooler must not crash the server.
  pool.on('error', error => console.error(`Supabase connection error: ${error.message}`));
  console.log('Supabase: connecting…');
  const client = await pool.connect();
  let counts, remoteEmpty: boolean;
  const t0 = Date.now(),
    step = (label: string) => console.log(`Supabase: ${label} (${Date.now() - t0} ms)`);
  try {
    await ensureRemoteSchema(client);
    step('schema checked');
    remoteEmpty = Number((await client.query('SELECT COUNT(*) n FROM "studios"')).rows[0].n) === 0;
  } finally {
    client.release();
  }
  try {
    // First run pushes everything; otherwise send changes queued before the last shutdown, so loading from Supabase never loses them.
    // A fresh Vercel instance only holds the downloaded snapshot plus startup seeding; Supabase is authoritative,
    // so its queue is dropped. A database file that has already synced (a reused /tmp copy) may hold edits
    // that never reached Supabase, so its queue is kept and sent like any other.
    const synced = db.prepare("SELECT 1 FROM _sync_state WHERE key='synced'").get();
    if (process.env.VERCEL && !synced) db.prepare('DELETE FROM _sync_outbox').run();
    if (!remoteEmpty) {
      const queued = (db.prepare('SELECT COUNT(*) n FROM _sync_outbox').get() as any).n;
      if (queued) console.log(`Supabase: sending ${queued} queued changes…`);
      await flushOutbox();
    }
    if ((db.prepare('SELECT COUNT(*) n FROM _sync_outbox').get() as any).n)
      throw new Error('Queued changes could not be sent to Supabase; not loading remote data over them.');
    step('queue sent');
    const again = await pool.connect();
    try {
      counts = await reconcile(again, remoteEmpty);
      lastSeq = Number((await again.query('SELECT COALESCE(MAX(seq),0) n FROM "_changes"')).rows[0].n);
      // Entries already committed are part of the snapshot just loaded; only later commits need applying.
      seenSeqs.clear();
      for (const r of (await again.query('SELECT seq FROM "_changes" WHERE seq > $1', [Math.max(0, lastSeq - SEQ_WINDOW)])).rows)
        seenSeqs.add(Number(r.seq));
      db.prepare("INSERT OR REPLACE INTO _sync_state(key, value) VALUES ('synced', ?)").run(new Date().toISOString());
      step('planning data loaded');
      clearJsonCache();
    } finally {
      again.release();
    }
  } catch (error) {
    if (timer) clearInterval(timer);
    throw error;
  }
  if (process.env.VERCEL) return counts; // serverless: each write request flushes before responding
  // Locally, edits made elsewhere (e.g. on Vercel) are pulled on this timer instead of before each request.
  // One sync at a time; while offline, back off (up to 60s) and log only the first failure and the recovery.
  let busy = false, failures = 0, nextAt = 0;
  timer = setInterval(() => {
    if (busy || Date.now() < nextAt) return;
    busy = true;
    flushOutbox()
      .then(ok => {
        // Pulling now could load remote rows over edits still waiting to be sent.
        if (!ok) throw new Error('queued changes could not be sent');
        return pullRemoteChanges();
      })
      .then(() => {
        if (failures) console.log(`Supabase: reconnected after ${failures} failed attempt(s).`);
        failures = 0;
      })
      .catch(error => {
        if (!failures) console.error(`Supabase pull failed: ${error?.message || error} — retrying quietly until it is back.`);
        failures++;
        nextAt = Date.now() + Math.min(60000, 1500 * 2 ** Math.min(failures, 6));
      })
      .finally(() => { busy = false; });
  }, 1500);
  const shutdown = async () => {
    if (timer) clearInterval(timer);
    await flushOutbox();
    await pool?.end();
    process.exit(0);
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
  return counts;
}
