// Runs before `npm run dev`: stops dev servers left over from earlier runs of this project
// (including ones paused with Ctrl+Z) so ports 3001/5173 and the database file are free.
import { execSync } from 'node:child_process';
import path from 'node:path';

const project = path.resolve('.');
const patterns = ['tsx watch server/main.ts', 'node_modules/.bin/vite', 'node_modules/.bin/concurrently', 'tsx/dist'];
const ps = execSync('ps -ax -o pid=,command=', { encoding: 'utf8' });
const mine = new Set([process.pid, process.ppid]);
const stale = ps.split('\n').map(line => line.trim().match(/^(\d+)\s+(.*)$/)).filter(Boolean)
  .filter(([, pid, cmd]) => !mine.has(Number(pid)) && cmd.includes(project) && patterns.some(p => cmd.includes(p)))
  .map(([, pid]) => Number(pid));

// Anything still listening on the API port (e.g. a server started another way) is also stopped.
try {
  for (const pid of execSync('lsof -nP -t -iTCP:3001 -sTCP:LISTEN', { encoding: 'utf8' }).split('\n').filter(Boolean).map(Number)) if (!mine.has(pid)) stale.push(pid);
} catch { /* nothing listening */ }

for (const pid of new Set(stale)) { try { process.kill(pid, 'SIGKILL'); } catch { /* already gone */ } }
console.log(stale.length ? `Stopped ${new Set(stale).size} old dev process(es).` : 'No old dev servers running.');
