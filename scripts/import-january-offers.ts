import { db } from '../server/db.js';
import { applyJanuaryOffers } from '../server/lib/januaryOffers2027.js';

// Loads “January 2027 — Top 25 Offers” into every planning location and selects them on the January plan.
// Safe to re-run: offers already imported for a studio are kept, not duplicated.
const year = Number(process.argv[2] || 2027);
const admin =
  (db.prepare("SELECT id FROM users WHERE role='administrator' ORDER BY id LIMIT 1").get() as any)?.id ?? null;
console.log('January offers:', applyJanuaryOffers(year, admin));
