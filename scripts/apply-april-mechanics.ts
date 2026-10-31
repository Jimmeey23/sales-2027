/* April's three playable mechanics — the wheel, the golden ticket and the nine gifts.

   Run with `npm run plan:april`. Idempotent: offers are keyed by a stable uid and only the
   ids this importer owns are added to the month's plan, so a planner's own picks survive. */
import 'dotenv/config';
import { db } from '../server/db.js';
import { applyAprilMechanics } from '../server/lib/aprilMechanics2027.js';

const year = Number(process.argv[2] || 2027);
const admin =
  Number((db.prepare("SELECT id FROM users WHERE role='administrator' ORDER BY id LIMIT 1").get() as any)?.id || 0) ||
  null;
const counts = applyAprilMechanics(year, admin);
const rows = db
  .prepare(
    "SELECT s.name studio, o.name, o.expected_revenue, o.target_purchases FROM offers o JOIN studios s ON s.id=o.studio_id WHERE o.year=? AND o.month=4 AND o.generation_source='april_mechanics_2027' ORDER BY s.city, s.name, o.name",
  )
  .all(year) as any[];
const money = (v: number) => `₹${(v / 100000).toLocaleString('en-IN', { maximumFractionDigits: 1 })}L`;
console.log(
  `\nApril ${year} mechanics — ${counts.created} created · ${counts.updated} updated · ${counts.attached} plan(s) re-attached\n`,
);
for (const row of rows)
  console.log(
    `  ${row.studio.padEnd(15)} ${row.name.padEnd(26)} ${String(row.target_purchases).padStart(3)} units  ${money(row.expected_revenue)}`,
  );
console.log(`\n${rows.length} offers · ${money(rows.reduce((s, r) => s + (r.expected_revenue || 0), 0))} expected.`);
