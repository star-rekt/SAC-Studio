/** Library marks drawn from the boards, each exact for its frame:
 *  - Bump's tickets: the frame's own rounded rectangle minus its punched
 *    hole, un-rotated into the card's own px -- so a ticket fills its card
 *    box exactly (one shared shape was letterboxed in every card of a
 *    different proportion);
 *  - Bump 2's stepped windows: the outline Figma strokes round each ratio's
 *    photo window (its strokeGeometry, filled), so it can be recoloured.
 *
 *    node --import tsx scripts/figma-marks.ts
 *
 *  Writes public/graphics/<name>.svg and its src/data/mark-shapes.json
 *  entry. Run after npm run figma:pull for these frames; register a new name
 *  in MARKS (src/model/media.ts) once. */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ownBox, type FigmaLayout } from '../src/render/figma/layout.ts';

const ROOT = join(import.meta.dirname, '..');
const TICKETS = [
  { name: 'ticket-tag-1x1', slug: 'bump-social-1x1', rect: '538:21746', hole: '538:21747' },
  { name: 'ticket-tag-4x5', slug: 'bump-social-4x5', rect: '538:21803', hole: '538:21804' },
  { name: 'ticket-tag-9x16', slug: 'bump-social-9x16', rect: '538:21860', hole: '538:21861' },
  { name: 'ticket-tag-email-1', slug: 'bump-email-1', rect: '538:21934', hole: '538:21935' },
  { name: 'ticket-tag-email-2', slug: 'bump-email-2', rect: '538:22083', hole: '538:22084' },
  { name: 'ticket-tag-email-3', slug: 'bump-email-3', rect: '538:22194', hole: '538:22195' },
];
const WINDOWS = [
  { name: 'bump2-window-1x1', slug: 'bump2-social-1x1', layer: '538:18091' },
  { name: 'bump2-window-4x5', slug: 'bump2-social-4x5', layer: '538:18138' },
  { name: 'bump2-window-9x16', slug: 'bump2-social-9x16', layer: '538:18191' },
  // Four email designs' hero outlines (photo windows, a cut-out); design 5's
  // is a Figma effect, saved as Figma's render by the compiler instead.
  { name: 'bump2-email-1-window', slug: 'bump2-body-1', layer: '538:18705' },
  { name: 'bump2-email-2-window', slug: 'bump2-body-2', layer: '538:18263' },
  { name: 'bump2-email-3-window', slug: 'bump2-body-3', layer: '538:18399' },
  { name: 'bump2-email-4-window', slug: 'bump2-body-4', layer: '538:18484' },
];
/** Bump 2's category arrow: its two brush strokes (shaft and head) in one mark. */
const ARROW = { name: 'bump2-arrow', slug: 'bump2-body-1', group: '538:18756', parts: ['538:18757', '538:18758'] };

const n = (v: number) => String(Math.round(v * 100) / 100);
const shapesPath = join(ROOT, 'src/data/mark-shapes.json');
const shapes = JSON.parse(readFileSync(shapesPath, 'utf8'));
for (const t of TICKETS) {
  const layout = JSON.parse(readFileSync(join(ROOT, 'src/data/figma', `${t.slug}.json`), 'utf8')) as FigmaLayout;
  const rect = layout.layers[t.rect], hole = layout.layers[t.hole];
  const r = ownBox(rect), e = ownBox(hole), a = -(rect.turn ?? 0) * Math.PI / 180;
  const dx = e.cx - r.cx, dy = e.cy - r.cy;
  const hx = dx * Math.cos(a) - dy * Math.sin(a) + r.w / 2, hy = dx * Math.sin(a) + dy * Math.cos(a) + r.h / 2;
  const k = rect.radius ?? 0, c = (e.w + e.h) / 4, [w, h] = [r.w, r.h];
  const path = `M ${n(k)},0 H ${n(w - k)} A ${n(k)},${n(k)} 0 0 1 ${n(w)},${n(k)} V ${n(h - k)} `
    + `A ${n(k)},${n(k)} 0 0 1 ${n(w - k)},${n(h)} H ${n(k)} A ${n(k)},${n(k)} 0 0 1 0,${n(h - k)} V ${n(k)} `
    + `A ${n(k)},${n(k)} 0 0 1 ${n(k)},0 Z M ${n(hx + c)},${n(hy)} A ${n(c)},${n(c)} 0 1 0 ${n(hx - c)},${n(hy)} `
    + `A ${n(c)},${n(c)} 0 1 0 ${n(hx + c)},${n(hy)} Z`;
  writeFileSync(join(ROOT, 'public/graphics', `${t.name}.svg`),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n(w)} ${n(h)}"><path fill-rule="evenodd" d="${path}" fill="${rect.fill ?? '#F14222'}"/></svg>\n`);
  shapes[t.name] = { fill: rect.fill ?? '#F14222', height: Number(n(h)), path, width: Number(n(w)) };
  console.log(`${t.name}: ${n(w)}x${n(h)}, hole at ${n(hx)},${n(hy)} r${n(c)}`);
}
for (const t of WINDOWS) {
  const layout = JSON.parse(readFileSync(join(ROOT, 'src/data/figma', `${t.slug}.json`), 'utf8')) as FigmaLayout;
  const l = layout.layers[t.layer], stroke = l.stroke!;
  // A centred stroke reaches half its weight past the shape's box: the mark's
  // box is the shape's box grown by that much on every side.
  const pad = stroke.align === 'CENTER' ? stroke.weight / 2 : stroke.align === 'OUTSIDE' ? stroke.weight : 0;
  const box = `${n(-pad)} ${n(-pad)} ${n(l.w + 2 * pad)} ${n(l.h + 2 * pad)}`;
  writeFileSync(join(ROOT, 'public/graphics', `${t.name}.svg`),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}"><path fill-rule="nonzero" d="${stroke.path}" fill="${stroke.color ?? '#79AC41'}"/></svg>\n`);
  shapes[t.name] = { fill: stroke.color ?? '#79AC41', height: Number(n(l.h + 2 * pad)), path: stroke.path!, width: Number(n(l.w + 2 * pad)) };
  console.log(`${t.name}: ${n(l.w)}x${n(l.h)} outline, stroke ${stroke.weight} ${stroke.align}`);
}
{
  const layout = JSON.parse(readFileSync(join(ROOT, 'src/data/figma', `${ARROW.slug}.json`), 'utf8')) as FigmaLayout;
  const g = layout.layers[ARROW.group], parts = ARROW.parts.map(p => layout.layers[p]);
  const pad = Math.max(...parts.map(p => p.stroke!.weight)) / 2;
  const box = `${n(-pad)} ${n(-pad)} ${n(g.w + 2 * pad)} ${n(g.h + 2 * pad)}`;
  const color = parts[0].stroke!.color ?? '#FFFFFF';
  // Figma writes absolute M/L/C/Z paths, every argument an x,y pair: moving
  // each part into the group's px is adding its offset to every pair.
  const move = (d: string, dx: number, dy: number) => {
    let i = 0;
    return d.replace(/-?[\d.]+(?:e-?\d+)?/g, v => n(Number(v) + (i++ % 2 ? dy : dx)));
  };
  const path = parts.map(p => move(p.stroke!.path!, p.x - g.x, p.y - g.y)).join('');
  writeFileSync(join(ROOT, 'public/graphics', `${ARROW.name}.svg`),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}"><path d="${path}" fill="${color}"/></svg>\n`);
  shapes[ARROW.name] = { fill: color, height: Number(n(g.h + 2 * pad)), path, width: Number(n(g.w + 2 * pad)) };
  console.log(`${ARROW.name}: ${n(g.w)}x${n(g.h)}`);
}
writeFileSync(shapesPath, JSON.stringify(shapes, null, 2) + '\n');
