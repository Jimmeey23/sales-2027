import 'dotenv/config';
import { db, audit } from '../server/db.js';
import { generateYearTargets } from '../server/lib/intelligence.js';

const years = process.argv.slice(2).map(Number);
const selected = years.length ? years : [2026, 2027];
if (selected.some(year => !Number.isInteger(year) || year < 2020 || year > 2100)) throw new Error('Years must be integers between 2020 and 2100.');
const admin = Number((db.prepare("SELECT id FROM users WHERE role='administrator' ORDER BY id LIMIT 1").get() as any)?.id || 0) || null;
for (const year of selected) {
  generateYearTargets(year, admin || undefined, true);
  audit({ userId: admin, action: 'generate_recommendations', entityType: 'annual_targets', entityId: year,
    after: { year, overwrite: true, trigger: 'targets:regenerate' },
    reason: 'Regenerated proposed recommendations after source refresh; approved targets preserved.' });
  const summary = db.prepare('SELECT COUNT(*) months,SUM(proposed_target) proposed,SUM(approved_target) approved FROM monthly_targets WHERE year=?').get(year) as any;
  console.log(`${year}: ${summary.months} studio-months · proposed ₹${Math.round(summary.proposed).toLocaleString('en-IN')} · approved ₹${Math.round(summary.approved || 0).toLocaleString('en-IN')}`);
}
