/* Prints every month's cover narration exactly as it should be spoken, with the character
   count that has to stay under the speech limit. Run: npx tsx scripts/narration-sheet.ts */
import { coverScript, coverNarration } from '../src/data/coverNarration';

for (let m = 1; m <= 12; m++) {
  const script = coverScript(m);
  console.log(`\n=== ${String(m).padStart(2, '0')} ${coverNarration(m).title} · ${script.length} chars · ${coverNarration(m).segments.length} segments`);
  console.log(script);
}
