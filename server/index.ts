import express from 'express';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import path from 'node:path';
import { db, initSchema } from './db.js';
import { authenticate, requireAuth, verifyPassword } from './lib/auth.js';
import { ensureCommercialSeed } from './lib/commercialSeed.js';
import { ensureBaselineData, ensureHistoricalCohorts } from './lib/historicalBaseline.js';
import { recalculateSegments } from './lib/segments.js';
import { syncBreakdownFunnels } from './lib/targetBreakdown.js';
import { flushOutbox, pullRemoteChanges, startSupabaseSync } from './lib/supabaseSync.js';
import registerAuthRoutes from './routes/auth.js';
import registerWorkspaceRoutes from './routes/workspace.js';
import registerTargetsRoutes from './routes/targets.js';
import registerOffersRoutes from './routes/offers.js';
import registerCopilotRoutes from './routes/copilot.js';
import registerStudioPlansRoutes from './routes/studioPlans.js';
import registerCampaignsRoutes from './routes/campaigns.js';
import registerImportsRoutes from './routes/imports.js';
import registerReportsRoutes from './routes/reports.js';
import registerAdminRoutes from './routes/admin.js';
initSchema();
if (process.env.NODE_ENV === 'production') {
  if (process.env.DIRECT_WORKSPACE === 'true')
    throw new Error(
      'Refusing production startup with DIRECT_WORKSPACE=true; this grants every visitor administrator access.',
    );
  const demoAccounts = db.prepare('SELECT email,password_hash FROM users WHERE active=1').all() as Array<{
    email: string;
    password_hash: string;
  }>;
  const sharedDemoAccounts = demoAccounts.filter(account => verifyPassword('P57demo!', account.password_hash));
  if (sharedDemoAccounts.length)
    throw new Error(
      `Refusing production startup while ${sharedDemoAccounts.length} active seeded account(s) still use the shared demonstration password. Rotate or disable them first.`,
    );
}
ensureBaselineData();
ensureCommercialSeed();
// Keep stored funnel volumes in step with the one target per location (see lib/targetBreakdown).
syncBreakdownFunnels(2027);
// Load planning data from Supabase (or migrate it there on first run) before serving requests.
// Called once per process: by server/main.ts locally and by api/index.ts on Vercel.
let initialising: Promise<void> | null = null;
export function initApp() {
  return (initialising ||= startSupabaseSync().then(counts => {
    if (counts) {
      console.log(
        'Supabase sync ready:',
        Object.entries(counts)
          .map(([t, c]) => `${t} ${c.action} ${c.local}`)
          .join(' · '),
      );
      // Supabase syncs planning tables only; ensure local historical cohorts & lifecycle segments remain populated.
      const adminId =
        Number(
          (db.prepare("SELECT id FROM users WHERE role='administrator' AND active=1 ORDER BY id LIMIT 1").get() as any)
            ?.id || 0,
        ) || null;
      ensureHistoricalCohorts(adminId);
      syncBreakdownFunnels(2027);
      if (Number((db.prepare('SELECT COUNT(*) n FROM segment_snapshots').get() as any)?.n || 0) === 0) {
        recalculateSegments();
      }
    }
  }));
}
const app = express();
const port = Number(process.env.PORT || 3001);
app.disable('x-powered-by');
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  next();
});
app.use(express.json({ limit: '3mb' }));
app.use(cookieParser());
// Serverless (Vercel): several short-lived instances share Supabase. Each request first applies
// changes made elsewhere, and a write only answers once its changes are safely in Supabase.
// Locally the same pull keeps a running dev server in step with edits made on Vercel.
// Requests that arrive while the startup sync runs wait for it (a failed sync still lets them through).
app.use('/api', (_req, _res, next) => {
  (initialising || Promise.resolve()).then(
    () => next(),
    () => next(),
  );
});
if (process.env.DATABASE_URL)
  app.use((req, res, next) => {
    if (process.env.VERCEL && req.method !== 'GET') {
      const end = res.end.bind(res);
      (res as any).end = (...args: any[]) => {
        flushOutbox().finally(() => end(...args));
        return res;
      };
    }
    pullRemoteChanges().then(() => next(), next);
  });
app.use(authenticate);

app.get('/api/health', (_req, res) => res.json({ ok: true, database: true, time: new Date().toISOString() }));
registerAuthRoutes(app);
app.use('/api', requireAuth);
registerWorkspaceRoutes(app);
registerTargetsRoutes(app);
registerOffersRoutes(app);
registerCopilotRoutes(app);
registerStudioPlansRoutes(app);
registerCampaignsRoutes(app);
registerImportsRoutes(app);
registerReportsRoutes(app);
registerAdminRoutes(app);

app.use('/api', (req, res) => res.status(404).json({ error: `API route not found: ${req.method} ${req.path}` }));
app.use((error: any, _req: any, res: any, _next: any) => {
  console.error(error);
  const status = error.status || (error instanceof multer.MulterError ? 400 : 500);
  res
    .status(status)
    .json({ error: error.message || 'Unexpected server error.', code: error.code, conflicts: error.conflicts });
});
if (process.env.NODE_ENV === 'production') {
  const dist = path.resolve('dist');
  app.use(express.static(dist));
  app.use((req, res, next) =>
    req.method === 'GET' && !req.path.startsWith('/api') ? res.sendFile(path.join(dist, 'index.html')) : next(),
  );
}
export { app, port };
export default app;
