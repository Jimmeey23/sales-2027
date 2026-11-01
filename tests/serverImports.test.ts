import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/* The API imports a few modules that also run in the browser — the approved playbooks, the key
   dates, the offer summary. Vercel compiles each file to .js and lets Node's ESM loader link
   them, and that loader will not resolve an extensionless specifier:

     Cannot find module '/var/task/src/lib/offerPricing'
       imported from /var/task/src/lib/offerSummary.js

   The browser never notices, because Vite fills the extension in; only production does, and it
   takes the whole workspace down when it happens. So: every relative import reachable from the
   server, in src as well as in server, has to name its file. */

const ROOT = path.resolve(__dirname, '..');
const SKIP_DIR = new Set(['node_modules', 'dist', 'p57-data', '.git', 'shots', 'e2e']);

function walk(dir: string, out: string[] = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || SKIP_DIR.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx|mts)$/.test(entry.name)) out.push(full);
  }
  return out;
}

/** Relative specifiers in a module, ignoring type-only imports (erased before it ever runs). */
function relativeImports(file: string) {
  const source = fs.readFileSync(file, 'utf8');
  const out: string[] = [];
  const pattern = /(?:^|\n)\s*(?:import|export)\s+(type\s+)?[^;]*?from\s+['"](\.[^'"]*)['"]/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source))) {
    if (match[1]) continue;
    out.push(match[2]);
  }
  const dynamic = /import\(\s*['"](\.[^'"]*)['"]\s*\)/g;
  while ((match = dynamic.exec(source))) out.push(match[1]);
  return out;
}

/** Where a relative specifier points, given that .js specifiers are .ts files on disk. */
function resolveSpecifier(from: string, specifier: string) {
  const base = path.resolve(path.dirname(from), specifier);
  const candidates = [base, base.replace(/\.js$/, '.ts'), base.replace(/\.js$/, '.tsx'), `${base}.ts`, `${base}.tsx`];
  return candidates.find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
}

describe('every module the API can load', () => {
  it('names the file it imports, so Node ESM can resolve it in production', () => {
    const serverFiles = walk(path.join(ROOT, 'server'));
    const problems: string[] = [];
    const seen = new Set<string>();
    const queue = [...serverFiles];

    while (queue.length) {
      const file = queue.pop()!;
      if (seen.has(file)) continue;
      seen.add(file);
      for (const specifier of relativeImports(file)) {
        const target = resolveSpecifier(file, specifier);
        const where = path.relative(ROOT, file);
        if (!target) {
          problems.push(`${where} imports "${specifier}", which does not exist`);
          continue;
        }
        // Anything under src is compiled to .js and linked by Node, so it needs the extension.
        const inSrc = target.startsWith(path.join(ROOT, 'src') + path.sep);
        if (inSrc && !/\.[cm]?[jt]sx?$|\.json$/.test(specifier))
          problems.push(`${path.relative(ROOT, target)} is reached from ${where} — its own import "${specifier}" needs a .js extension`);
        if (inSrc) queue.push(target);
      }
    }

    expect(problems).toEqual([]);
  });

  it('finds the offer summary through the export, the way the API does', () => {
    const exportPath = path.join(ROOT, 'server/lib/planExport.ts');
    const specifier = relativeImports(exportPath).find(s => s.includes('offerSummary'));
    expect(specifier).toBe('../../src/lib/offerSummary.js');
    expect(resolveSpecifier(exportPath, specifier!)).toBe(path.join(ROOT, 'src/lib/offerSummary.ts'));
  });
});
