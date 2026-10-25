import { db } from '../server/db.js';
import { applySalesOfferPlan } from '../server/lib/salesOfferPlan2027.js';

// Moves every 2027 month plan's offers back to the offer bank, then loads the “2027 Annual Sales and Offer Plan”:
// one selected newcomer / winback / renewal offer per studio-month, with the alternatives left in the bank.
// Safe to re-run: offers already imported are reused, not duplicated.
const year = Number(process.argv[2] || 2027);
const admin =
  (db.prepare("SELECT id FROM users WHERE role='administrator' ORDER BY id LIMIT 1").get() as any)?.id ?? null;
console.log('Sales and offer plan:', applySalesOfferPlan(year, admin));
