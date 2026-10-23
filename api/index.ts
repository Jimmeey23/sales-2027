import fs from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { hydrateHistory } from '../server/lib/history.js';

// Vercel entry point. A cold start downloads the sales-history snapshot into /tmp, then loads
// the Express app (which opens that file) and syncs planning data from Supabase.
// Only /tmp is writable on Vercel, whatever DATABASE_PATH says in the project settings.
if (!process.env.DATABASE_PATH?.startsWith('/tmp/')) process.env.DATABASE_PATH = '/tmp/p57/studio.db';
// Serverless instances come and go: use Supabase's transaction pooler (6543), not the session pooler (5432).
if (process.env.DATABASE_URL?.includes('pooler.supabase.com:5432')) process.env.DATABASE_URL = process.env.DATABASE_URL.replace('pooler.supabase.com:5432', 'pooler.supabase.com:6543');
let ready: Promise<any> | null = null;
async function boot() {
  await hydrateHistory(process.env.DATABASE_PATH!);
  const mod = await import('../server/index.js');
  await mod.initApp();
  return mod.app;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const app = await (ready ||= boot());
    app(req, res);
  } catch (error: any) {
    ready = null;
    console.error(error);
    res.statusCode = 503; res.setHeader('Content-Type', 'application/json');
    let tmp = '';
    try { const s = fs.statfsSync('/tmp'); tmp = ` (/tmp free ${Math.round(s.bavail * s.bsize / 1048576)} of ${Math.round(s.blocks * s.bsize / 1048576)} MB)`; } catch { /* not available */ }
    res.end(JSON.stringify({ error: `The workspace is starting up or unavailable: ${error.message}${tmp}` }));
  }
}
