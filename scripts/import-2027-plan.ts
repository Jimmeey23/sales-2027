import 'dotenv/config';
import { db } from '../server/db.js';
import { applyPlanOffers, applyPlanTargets } from '../server/lib/plan2027.js';

// Loads the 2027 Base plan targets and plan offers into the database. Safe to re-run:
// targets are versioned (approved values untouched) and offers are upserted by a stable id.
const year = Number(process.argv[2] || 2027);
const admin = Number((db.prepare("SELECT id FROM users WHERE role='administrator' ORDER BY id LIMIT 1").get() as any)?.id || 0) || null;
for (const r of applyPlanTargets(year, admin)) console.log(`${r.studio}: ₹${(r.annual / 100000).toFixed(1)}L across 12 months`);
console.log('Offers:', applyPlanOffers(year, admin));
