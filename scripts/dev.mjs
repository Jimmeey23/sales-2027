// Runs `npm run dev` after predev cleanup: picks the first free API port from PORT (default 3001)
// and hands it to both the API server and the Vite proxy. Vite picks its own free port (strictPort: false).
import 'dotenv/config';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const isFree = port => new Promise(resolve => {
  const server = net.createServer().once('error', () => resolve(false));
  server.listen(port, '0.0.0.0', () => server.close(() => resolve(true)));
});

const preferred = Number(process.env.PORT || 3001);
let port = preferred;
while (!(await isFree(port))) port++;
if (port !== preferred) console.log(`API port ${preferred} is busy, using ${port}.`);

// Run concurrently's own entry with this node, no shell: the project path contains spaces
// ("Sales Plan 2027"), and a shell splits it into separate words.
const concurrently = fileURLToPath(new URL('../node_modules/concurrently/dist/bin/concurrently.js', import.meta.url));
const child = spawn(process.execPath, [concurrently, '-k', 'tsx watch server/main.ts', 'vite --host 0.0.0.0 --open'], {
  stdio: 'inherit',
  env: { ...process.env, PORT: String(port), API_PORT: String(port) },
});
child.on('exit', code => process.exit(code ?? 0));
