# Deployment and operations

## 1. Prerequisites and persistent storage

Use Node.js 20+ on a host with a persistent volume. Keep the database and staged uploads outside the frontend build directory. The default runtime paths are:

- `p57-data/studio.db`
- `p57-data/studio.db-wal` and `studio.db-shm` while active
- `p57-data/uploads/`

SQLite runs in WAL mode with foreign keys and a busy timeout. This deployment is designed for a single application process. Do not run multiple writers against the same database file; a multi-instance deployment would require a deliberate migration to a client/server database.

## 2. Configure secrets before the first seed

```bash
cp .env.example .env
```

Set a long random `MEMBER_HASH_SALT` before importing production data. Changing this salt later changes pseudonymised member identifiers and can break longitudinal matching. Keep it stable and secret.

For an HTTPS production deployment:

```dotenv
NODE_ENV=production
COOKIE_SECURE=true
DIRECT_WORKSPACE=true
DATABASE_PATH=./p57-data/studio.db
MEMBER_HASH_SALT=<long-random-secret>
PORT=3001
```

`COOKIE_SECURE=true` requires HTTPS. For local HTTP development, use `COOKIE_SECURE=false`.

This version intentionally has no login page. With `DIRECT_WORKSPACE=true`, it opens a persistent administrator demonstration session automatically. Only expose this mode behind a trusted network or identity-aware proxy. Setting `DIRECT_WORKSPACE=false` disables automatic entry; the UI then shows an unavailable state rather than a login form.

Optional real AI configuration:

```dotenv
OPENAI_API_KEY=<server-only-key>
OPENAI_MODEL=gpt-4.1-mini
AI_PROVIDER_BASE_URL=https://api.openai.com/v1
```

Never place these values in `VITE_` variables or frontend code.

## 3. Install, initialise, and build

```bash
npm ci
FORCE_SEED=true npm run seed   # first initialisation only; destructive rebuild
npm run import:checkins        # authorised Google Sheet export, or CHECKINS_CSV=/secure/path.csv
npm run targets:regenerate     # rewrites/versions proposed targets; approved targets are preserved
npm run build
```

The seed command reads the files in `uploads/`. Keep those files available for a reproducible initial import. The Checkins importer uses the supplied Google Sheet export by default and removes its temporary file; for a private sheet, supply an authorised local CSV through `CHECKINS_CSV` or the script argument. Subsequent operational files should use the guided import UI rather than a forced reseed. After any behavioural-source refresh, review and explicitly regenerate proposed recommendations so the new attendance evidence is applied to funnel assumptions.

## 4. Secure the seeded accounts

Every seeded demonstration account initially uses `P57demo!`. Rotate the administrator password with a production password of at least 12 characters:

```bash
npm run user -- password admin@p57.demo "replace-with-a-long-unique-password"
```

Rotate or deactivate every other demonstration account:

```bash
npm run user -- deactivate analyst@p57.demo
```

Password rotation and deactivation revoke existing sessions. The CLI prevents deactivating the last active administrator. Do not expose the application until the shared demonstration credentials have been removed from active use.

## 5. Start and expose the application

```bash
npm start
```

In production, Express serves both the API and the built `dist/` application on `PORT`. Bind the process to the private host/network expected by your platform and place it behind an HTTPS reverse proxy or managed application ingress.

Operationally:

- Forward the original protocol/client IP according to your proxy platform.
- Preserve cookies on the application domain.
- Do not expose the SQLite file or `p57-data/uploads/` as static web content.
- Keep server environment variables in the platform's secret manager.
- Monitor the health endpoint: `GET /api/health`.
- Use one application writer process and supervised restart/logging.

The development command, `npm run dev`, is not the production process manager.

## 6. Verify the deployment

From the application host, with the server running:

```bash
SMOKE_BASE_URL=http://127.0.0.1:3001 npm run smoke
npm test
```

The 16-check local smoke run uses future-dated isolated records and removes them afterwards. It verifies health, direct workspace access, dashboard integrity, Checkins behaviour and guided-import privacy, the Kemps Corner rent-aware target range, target persistence/versioning, offer approval/cloning, campaign conflicts/actuals, exports, staged imports, and read-only RBAC.

To run browser tests on a build server:

```bash
npx playwright install --with-deps chromium
E2E_BASE_URL=http://127.0.0.1:5173 npm run test:e2e
```

The included browser configuration expects the Vite development URL by default. For a production-only test on port 3001, set `E2E_BASE_URL=http://127.0.0.1:3001`.

## 7. Backups and recovery

Back up the database and uploaded source files together. Use a filesystem/volume snapshot or SQLite's online backup mechanism; do not copy only the main `.db` file while ignoring an active WAL.

A safe simple maintenance-window approach:

1. Stop the application writer.
2. Back up `p57-data/studio.db`, any WAL/SHM files, `p57-data/uploads/`, and the original `uploads/` sources.
3. Store the `MEMBER_HASH_SALT` securely with the recovery configuration.
4. Restart and run the smoke test.
5. Periodically test restoration on an isolated host.

Keep audit history with the database. Import deletion or reseeding is not a backup strategy.

## 8. Routine operations

- Import new actuals through Data Import & Management and retain each row-level report.
- Review unknown studio names before allowing automatic studio creation.
- Regenerate target recommendations only after reviewing the changed actual coverage.
- Approve targets/offers through the intended roles; do not edit the database to bypass approval.
- Record campaign actuals after the campaign and distinguish attributed revenue from measured incremental lift.
- Review audit logs and active studio access regularly.
- Run `npm audit`, unit tests, build, and smoke tests before deploying dependency updates.

## External dependency boundary

Google Sheets is an import source, not a live synchronisation service. Refreshes require an authorised export/import and produce a new provenance record. The application does not claim continuous sync.

The application is fully usable for internal planning, approvals, imports, calculations, and exports without external credentials. Real AI generation additionally requires the configured model provider. Momence, WhatsApp, CRM, and ad-platform publishing integrations are not present and must not be represented as completed actions.

## Vercel (current production: https://sales-2027.vercel.app)

- `api/index.ts` runs the Express API as one Vercel function in `syd1`, next to Supabase.
- Planning data (targets, plans, offers, campaigns, settings, users, sessions) lives in Supabase.
  Each instance loads it on a cold start and applies other instances' edits from the `_changes`
  log on every request; a write responds only after it is saved to Supabase.
- Sales history (sales lines, check-ins, leads, packages) is a compressed SQLite snapshot in the
  `_history_snapshot` table. After importing new Momence exports **locally**, run
  `npm run history:publish` so Vercel sees them. Imports made on the Vercel site itself are not kept.
- Required env var: `DATABASE_URL` (Supabase pooler URI, password URL-encoded). The function switches
  to the transaction pooler (port 6543) automatically. `DATABASE_PATH` is ignored on Vercel.
