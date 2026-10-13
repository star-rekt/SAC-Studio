/** Make a mark stretch to the box it is masking.
 *
 *  An <svg> with no preserveAspectRatio defaults to "xMidYMid meet", so used
 *  as a CSS mask at 100% 100% it LETTERBOXES instead of stretching: a tall
 *  torn-paper put behind a wide urgency label fitted to the label's height and
 *  came out as a 54px square in the middle of it. brush-strip only looked
 *  right because 646x115 happens to match the shape of a label.
 *
 *  So every mark declares "none". A mark is a shape that takes the dimensions
 *  of whatever it decorates; that is the whole job.
 *
 *  Usage: node scripts/mask-ready.mjs public/graphics/*.svg
 */
import { readFileSync, writeFileSync } from 'node:fs';

for (const file of process.argv.slice(2)) {
  const before = readFileSync(file, 'utf8');
  if (/<svg[^>]*preserveAspectRatio=/.test(before)) {
    console.log(`ok    ${file} — already declares one`);
    continue;
  }
  const after = before.replace(/<svg\b/, '<svg preserveAspectRatio="none"');
  if (after === before) { console.log(`skip  ${file} — no <svg> root`); continue; }
  writeFileSync(file, after);
  console.log(`set   ${file}`);
}
