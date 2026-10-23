import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import 'dotenv/config';
import { CHECKINS_PROVENANCE, importCheckinsFile } from '../server/lib/checkins.js';

async function main() {
  const supplied = process.argv[2] || process.env.CHECKINS_CSV;
  let filePath = supplied ? path.resolve(supplied) : '';
  let temporary = false;
  if (!filePath) {
    console.log('Downloading the authorised Google Sheets Checkins CSV export…');
    const response = await fetch(CHECKINS_PROVENANCE.exportUrl, { signal: AbortSignal.timeout(120000), redirect: 'follow' });
    if (!response.ok) throw new Error(`Google Sheets export failed (${response.status}). Supply CHECKINS_CSV with an authorised local export instead.`);
    const csv = await response.text();
    if (!csv.startsWith('Member ID,')) throw new Error('The export did not return the expected Checkins CSV. Supply an authorised local CSV export.');
    filePath = path.join(os.tmpdir(), `p57-checkins-${process.pid}.csv`);
    fs.writeFileSync(filePath, csv);
    temporary = true;
  }
  try {
    const result = importCheckinsFile({ filePath });
    console.log(JSON.stringify(result, null, 2));
  } finally {
    if (temporary) fs.rmSync(filePath, { force: true });
  }
}
main().catch(error => { console.error(error.message || error); process.exitCode = 1; });
