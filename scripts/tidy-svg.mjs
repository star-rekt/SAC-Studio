/** Strip the backdrop rects Figma's SVG export drags along.
 *
 *  An exported node carries two things that are not the artwork: the canvas
 *  colour behind it (#948C8C on this file), and any ancestor frame it sat
 *  inside — the brand logos came out with the email's own 1200x5397 white
 *  background attached, so a white knocked-out mark rendered as a white box.
 *
 *  A rect is a backdrop when it covers the whole viewBox or more. Anything
 *  smaller is part of the mark and is left alone.
 *
 *  Usage: node scripts/tidy-svg.mjs public/logos/*.svg
 */
import { readFileSync, writeFileSync } from 'node:fs';

const files = process.argv.slice(2);
if (!files.length) { console.error('give it some svg files'); process.exit(1); }

for (const file of files) {
  const before = readFileSync(file, 'utf8');
  const box = before.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  if (!box) { console.log(`skip  ${file} — no viewBox`); continue; }
  const [w, h] = [Number(box[1]), Number(box[2])];

  let dropped = 0;
  const after = before.replace(/<rect\b[^>]*\/>/g, tag => {
    const n = (k) => Number((tag.match(new RegExp(`${k}="([\\d.-]+)"`)) ?? [])[1] ?? NaN);
    const rw = n('width'), rh = n('height');
    if (!(rw >= w - 0.5 && rh >= h - 0.5)) return tag;   // smaller than the frame: artwork
    dropped++;
    return '';
  });

  if (dropped) writeFileSync(file, after);
  console.log(`${dropped ? 'tidy ' : 'ok   '} ${file} — ${dropped} backdrop rect(s) removed`);
}
