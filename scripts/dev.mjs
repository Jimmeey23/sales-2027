// Runs `npm run dev` after predev cleanup: picks the first free API port from PORT (default 3001)
// and hands it to both the API server and the Vite proxy. Vite picks its own free port (strictPort: false).
import 'dotenv/config';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import concurrently from 'concurrently';

const isFree = port => new Promise(resolve => {
  const server = net.createServer().once('error', () => resolve(false));
  server.listen(port, '0.0.0.0', () => server.close(() => resolve(true)));
});

const preferred = Number(process.env.PORT || 3001);
let port = preferred;
while (!(await isFree(port))) port++;
if (port !== preferred) console.log(`API port ${preferred} is busy, using ${port}.`);

// Use concurrently's API in this process rather than spawning its CLI: the project path contains
// spaces ("Sales Plan 2027"), and some Node builds pass argv differently, which made the CLI treat
// its own path as a command. Put the project's bin folder on PATH so tsx and vite resolve even
// when this file is run with plain `node` rather than through npm.
const bin = fileURLToPath(new URL('../node_modules/.bin', import.meta.url));
// The database driver (better-sqlite3) is built for the Node version in .nvmrc. Terminals inside
// VS Code can put another Node first on PATH (e.g. VS Code's own v24), which crashes the API with
// NODE_MODULE_VERSION errors, so put the .nvmrc Node from nvm first when it is installed.
const wanted = fs.readFileSync(new URL('../.nvmrc', import.meta.url), 'utf8').trim().replace(/^v/, '');
const nvmBin = path.join(process.env.NVM_DIR || path.join(os.homedir(), '.nvm'), 'versions', 'node', `v${wanted}`, 'bin');
const pinned = fs.existsSync(path.join(nvmBin, 'node')) ? `${nvmBin}${path.delimiter}` : '';
if (!pinned && process.versions.node !== wanted)
  console.warn(`Node ${wanted} (from .nvmrc) is not installed via nvm; the API may fail. Run: nvm install ${wanted}`);
const env = {
  PATH: `${pinned}${bin}${path.delimiter}${process.env.PATH ?? ''}`,
  PORT: String(port),
  API_PORT: String(port),
};
const { result } = concurrently(
  [
    { command: 'tsx watch server/main.ts', env },
    { command: 'vite --host 0.0.0.0 --open', env },
  ],
  { killOthersOn: ['failure', 'success'] },
);
result.then(() => process.exit(0), () => process.exit(1));
