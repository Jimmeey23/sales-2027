import { app, initApp, port } from './index.js';

// Local / always-on entry point. Vercel uses api/index.ts instead.
// Listen straight away; API requests wait for the Supabase sync, and a failed sync falls back to local data.
const ready = initApp().catch((error: any) =>
  console.error(`Supabase sync unavailable, using local data: ${error?.message || error}`),
);
app.listen(port, '0.0.0.0', () => console.log(`P57 API listening on http://0.0.0.0:${port}`));
export { ready };
