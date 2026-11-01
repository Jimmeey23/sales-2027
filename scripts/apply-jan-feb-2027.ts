import { syncPlanMonths } from '../server/lib/planSync2027.js';

// Rebuilds plan months of 2027 from server/data/approved-plan-2027.json — the approved plan is the
// source of truth for the offers, their copy and the month's brief. Offers are matched by name and
// updated in place (notes, approvals and ids survive); anything the plan no longer uses is archived.
//
// The same rebuild runs by itself at startup, once per plan version (see lib/planSync2027), so this
// is the manual handle: pass the months to sync (default January and February, where the Stronger in
// 30 challenge moved).
const args = process.argv
  .slice(2)
  .filter(a => /^\d{1,2}$/.test(a))
  .map(Number);
const report = syncPlanMonths(args.length ? args : [1, 2]);
if (!report) {
  console.error('No studios or plan JSON to sync.');
  process.exit(1);
}
console.log(report);
