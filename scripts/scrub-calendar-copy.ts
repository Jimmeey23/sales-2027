/* Takes the calendar out of the offers.

   The month-level copy was rewritten by hand, but individual offers still carried day
   names — “The Galentine’s Duo”, “Black Friday Comeback”, “Monsoon Streak”. Each is
   renamed to the commercial mechanism it actually describes, and the remaining prose is
   scrubbed of festival and season references.

   Renaming changes an offer's provenance key, so the key is recomputed here; the importer
   then updates the existing row instead of creating a second one with the old name.

   Run: npx tsx scripts/scrub-calendar-copy.ts   (then `npm run plan:offers`) */

import fs from 'node:fs';
import path from 'node:path';

const FILE = path.resolve('server/data/sales-offer-plan-2027.json');
const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

// Offer names → the mechanism, with no day attached.
const RENAME: Record<string, string> = {
  '57 Days to Diwali': 'The 57-Day Cohort',
  'Black Friday Comeback': 'The Annual Envelope',
  'Black Friday Envelope': 'The Envelope',
  'Black Friday, Strong Monday': 'The Annual Window',
  'Come Home for Diwali': 'The Homecoming Invitation',
  'Diwali Bonus Credit': 'Credit in Advance',
  'Diwali Credit': 'Advance Credit',
  'Diwali Duo': 'The Duo Credit',
  "Galentine's Reunion Class": 'The Reunion Class',
  'Holiday Guest List': 'The Guest List',
  'Holiday Hangover': 'The Second Chance',
  'Monsoon Reunion Saturday': 'Reunion Saturday',
  'Monsoon Streak': 'The Streak',
  'Monsoon Streak Starter': 'The Streak Starter',
  'Old Friend, New Year': 'An Old Friend',
  "The Galentine's Duo": 'The Duo Rate',
  "Women's Day Comeback": 'The Homecoming',
  // Second sweep: campaign names that survived the first pass.
  'Strong Monday Six': 'The Annual Six',
  'Strong Monday Renewals': 'Annual Window Renewals',
  'The Resolution Refund': 'The Habit Refund',
  'Resolution Insurance+': 'Habit Insurance',
  'Festive Ready 12': 'Gift Ready 12',
  'Festive Lock-in': 'Gift Lock-in',
  'Festive Pause Pass': 'Gift Pause Pass',
};

// Prose scrubs, applied to every string field except `name`.
const SCRUB: [RegExp, string][] = [
  [/Galentine['’]s/gi, 'the duo'],
  [/Valentine['’]s/gi, 'the pair'],
  [/Women['’]s Day/gi, 'homecoming week'],
  [/Mother['’]s Day/gi, 'the second seat'],
  [/Father['’]s Day/gi, 'the second seat'],
  [/Friendship Day/gi, 'the squad window'],
  [/Black Friday/gi, 'the annual window'],
  [/Cyber Monday/gi, 'the close date'],
  [/Dasara/gi, 'the quiet week'],
  [/Diwali/gi, 'the gifting window'],
  [/Christmas/gi, 'the year end'],
  [/New Year['’]s/gi, 'the year start'],
  [/\bNew Year\b/gi, 'the year start'],
  [/monsoon/gi, 'the low-attendance stretch'],
  [/festival calendar/gi, 'the renewal calendar'],
  [/\bfestival\b/gi, 'gifting window'],
  [/\bfestive\b/gi, 'end-of-year'],
  [/Strong Monday/gi, 'the annual window'],
  [/Resolution\b/gi, 'Habit'],
];

const plan = JSON.parse(fs.readFileSync(FILE, 'utf8')) as any[];
let renamed = 0;
let scrubbed = 0;

for (const month of plan) {
  for (const o of month.offers) {
    const target = RENAME[o.name];
    if (target) {
      o.name = target;
      renamed++;
    }
    for (const [k, v] of Object.entries(o)) {
      if (typeof v !== 'string' || k === 'name' || k === 'provenance') continue;
      let next = v;
      for (const [re, to] of SCRUB) next = next.replace(re, to);
      if (next !== v) {
        (o as any)[k] = next;
        scrubbed++;
      }
    }
    // Keep the offer's identity stable across the rename.
    if (o.provenance) {
      const prov = JSON.parse(o.provenance);
      const key = `2027 Annual Sales and Offer Plan:${month.studio}:${month.month}:${o.stream}:${slug(o.name)}`;
      prov.sourceKey = key;
      prov.linkGroup = `SOP27-${String(month.month).padStart(2, '0')}-${slug(o.name)}`;
      o.provenance = JSON.stringify(prov);
    }
  }
}

fs.writeFileSync(FILE, `${JSON.stringify(plan, null, 2)}\n`);
console.log(`Renamed ${renamed} offer references · scrubbed ${scrubbed} copy fields`);
