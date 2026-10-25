import { db } from '../server/db.js';
import { applyMembershipLibrary } from '../server/lib/membershipLibrary2027.js';

// Seeds twelve always-on offers per membership per planning location. Safe to re-run.
const year = Number(process.argv[2] || 2027);
const admin =
  (db.prepare("SELECT id FROM users WHERE role='administrator' ORDER BY id LIMIT 1").get() as any)?.id ?? null;
console.log('Membership library:', applyMembershipLibrary(year, admin));
