import { app, initApp, port } from './index.js';

// Local / always-on entry point. Vercel uses api/index.ts instead.
await initApp();
app.listen(port, '0.0.0.0', () => console.log(`P57 API listening on http://0.0.0.0:${port}`));
