import 'dotenv/config';
import { db } from '../server/db.js';
import { applyPlanOffers, applyPlanTargets } from '../server/lib/plan2027.js';
import { applySlotOffers } from '../server/lib/offerCatalog.js';
import { applyTargetScenario, captureStandardBase, currentScenario } from '../server/lib/targetScenarios.js';

// Loads the 2027 Base plan targets and plan offers into the database. Safe to re-run:
// targets are versioned (approved values untouched) and offers are upserted by a stable id.
const year = Number(process.argv[2] || 2027);
const admin = Number((db.prepare("SELECT id FROM users WHERE role='administrator' ORDER BY id LIMIT 1").get() as any)?.id || 0) || null;
for (const r of applyPlanTargets(year, admin)) console.log(`${r.studio}: ₹${(r.annual / 100000).toFixed(1)}L across 12 months`);
db.prepare("UPDATE studios SET city='Bengaluru' WHERE name IN ('Pop-up','Copper + Cloves','Plash Pilates')").run();
captureStandardBase(year);
const scenario = currentScenario();
if (scenario !== 'standard') console.log('Re-applied target scenario:', applyTargetScenario(year, scenario, admin));
console.log('Plan offers:', applyPlanOffers(year, admin));
// Slot offers size their units from the Standard plan so switching scenarios never resizes offers silently.
console.log('Monthly newcomer / lapsed / renewal options:', applySlotOffers(year, admin));
