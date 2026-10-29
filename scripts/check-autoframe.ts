/** Smart placement's composition, checked without a browser or a model:
 *  the crop maths must be Picture's exactly; the Alpine20 hiker must compose
 *  cleanly in every Bump email frame (no zoom past the cap, head and torso
 *  never covered, card never under 70%); a fixed crop must stay put; and a
 *  centred lockup's copy stays where its designer put it.
 *
 *  Exits 1 and names every failure, the same contract every other
 *  `check:*` script keeps. */
import { project, intersect, isCentred, composeCard, cardOptions, safeBand, shapeCells, MAX_ZOOM, type FrameInput } from '../src/model/autoFrame.ts';
import type { Box, Region } from '../src/model/analysePhoto.ts';

const faults: string[] = [];
const expect = (ok: boolean, what: string) => { if (!ok) faults.push(what); };
const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;

// 1. project() is Picture.tsx's crop maths: 2400x800 photo in a 1200x800 box
//    covers at 1x with 1200px of horizontal overflow; x=0 shows the left edge.
const wide: FrameInput = { natural: { w: 2400, h: 800 }, box: { w: 1200, h: 800 }, initialScale: 1,
  subject: [0, 0, 1, 1], keep: [], avoid: [] };
const left = project(wide, 1, 0, 50, [0, 0, 0.5, 1]);
expect(near(left.x, 0) && near(left.w, 1200) && near(left.h, 800), `project at x=0: ${JSON.stringify(left)}`);
const right = project(wide, 1, 100, 50, [0.5, 0, 0.5, 1]);
expect(near(right.x, 0), `project at x=100 should show the right half: ${JSON.stringify(right)}`);

// 8. composeCard on the photo that went wrong in the Alpine20 session: a
//    hiker jumping, arms out, centred, in all three Bump email frames.
const hiker = { natural: { w: 3195, h: 2131 },
  regions: [{ kind: 'head', box: [0.567, 0.157, 0.045, 0.081] }, { kind: 'torso', box: [0.529, 0.219, 0.106, 0.191] },
    { kind: 'arms', box: [0.417, 0.116, 0.36, 0.157] }, { kind: 'legs', box: [0.532, 0.383, 0.069, 0.278] }] as Region[],
  people: [[0.417, 0.116, 0.36, 0.545]] as Box[] };
const frames = [
  { name: 'E2 EmailHero', w: 1200, h: 1125, initialScale: 1, card: { w: 972, h: 499, cx: 589, cy: 677 },
    obstacles: [{ x: 0, y: 0, w: 1200, h: 95 }, { x: 78, y: 990, w: 1044, h: 88 }] },
  { name: 'E3 Header3', w: 1200, h: 929, initialScale: 1, card: { w: 800, h: 400, cx: 401, cy: 412 },
    obstacles: [{ x: 0, y: 0, w: 1200, h: 95 }, { x: 78, y: 795, w: 1044, h: 88 }] },
  { name: 'E4 Header1', w: 1200, h: 826, initialScale: 1.13, card: { w: 824, h: 421, cx: 752, cy: 396 },
    obstacles: [{ x: 0, y: 0, w: 1200, h: 82 }, { x: 84, y: 707, w: 1032, h: 94 }] },
];
for (const f of frames) {
  const box = { w: f.w, h: f.h };
  const band = safeBand({ x: 0, y: 0, w: f.w, h: f.h }, f.obstacles);
  const options = cardOptions(f.card, band, f.obstacles, 'left');
  const t0 = performance.now();
  const c = composeCard({ ...hiker, box, initialScale: f.initialScale, band, obstacles: f.obstacles, options });
  const ms = Math.round(performance.now() - t0);
  if (!c) { faults.push(`${f.name}: no composition`); continue; }
  const fi = { natural: hiker.natural, box, initialScale: f.initialScale, subject: [0, 0, 1, 1] as Box, keep: [], avoid: [] };
  const zoom = f.initialScale * c.frame.scale;
  const head = project(fi, c.frame.scale, c.frame.x, c.frame.y, hiker.regions[0].box);
  const torso = project(fi, c.frame.scale, c.frame.x, c.frame.y, hiker.regions[1].box);
  const covers = [...c.option.rects, ...f.obstacles];
  console.log(`  ${f.name}: ${c.option.id} zoom ${zoom.toFixed(2)} tier ${c.tier}${c.tough ? ' (tough call)' : ''} ${ms}ms`);
  expect(zoom <= MAX_ZOOM + 1e-6 && zoom >= 1 - 1e-6, `${f.name}: zoom ${zoom} outside cover..${MAX_ZOOM}`);
  expect(head.x >= 0 && head.y >= 0 && head.x + head.w <= f.w && head.y + head.h <= f.h, `${f.name}: head out of frame`);
  expect(covers.every(r => intersect(r, head) === 0) && covers.every(r => intersect(r, torso) === 0),
    `${f.name}: head or torso covered by ${c.option.id}`);
  expect(c.option.size >= 0.7, `${f.name}: card below the 70% floor`);
  expect(c.tier <= 1 || c.tough, `${f.name}: arms/torso/head touched without a tough call (tier ${c.tier})`);
}

// 9. With the designer's crop fixed, only the copy moves: the frame comes
//    back exactly as given.
{
  const f = frames[2], box = { w: f.w, h: f.h };
  const band = safeBand({ x: 0, y: 0, w: f.w, h: f.h }, f.obstacles);
  const fixed = { x: 20, y: 40, scale: 1.1 };
  const c = composeCard({ ...hiker, box, initialScale: f.initialScale, band, obstacles: f.obstacles,
    options: cardOptions(f.card, band, f.obstacles, 'left'), fixed });
  expect(!!c && c.frame.x === 20 && c.frame.y === 40 && c.frame.scale === 1.1, `fixed crop must not move: ${JSON.stringify(c?.frame)}`);
}

// 10. A shaped slot (Bump 2's stepped window): what its outline hides is off
//     limits. A 600x600 window missing its upper-right quarter (a copy
//     cut-out) -- where the hiker's head sits at the centred crop. The cells
//     are exactly that quarter, and the crop moves so head and torso land
//     in what can be seen.
{
  const w = 600, h = 600, notch = (x: number, y: number) => !(x > 300 && y < 300);
  const hidden = shapeCells(w, h, notch, true);
  const area = hidden.reduce((a, r) => a + r.w * r.h, 0);
  expect(Math.abs(area - 300 * 300) < 1 && hidden.every(r => r.x >= 300 - 1e-6 && r.y + r.h <= 300 + 1e-6),
    `shapeCells: hidden area ${area} should be the 300x300 notch`);
  const box = { w, h }, band = { x: 0, y: 0, w, h };
  const c = composeCard({ ...hiker, box, initialScale: 1, band, obstacles: hidden,
    options: [{ id: 'none', rank: 0, size: 1, rects: [] }] });
  if (!c) faults.push('slot: no composition');
  else {
    const fi = { natural: hiker.natural, box, initialScale: 1, subject: [0, 0, 1, 1] as Box, keep: [], avoid: [] };
    const head = project(fi, c.frame.scale, c.frame.x, c.frame.y, hiker.regions[0].box);
    const torso = project(fi, c.frame.scale, c.frame.x, c.frame.y, hiker.regions[1].box);
    console.log(`  slot (notched window): zoom ${(c.frame.scale).toFixed(2)} at ${c.frame.x},${c.frame.y} tier ${c.tier}`);
    expect(hidden.every(r => intersect(r, head) === 0 && intersect(r, torso) === 0), 'slot: head or torso under the hidden notch');
    expect(head.x >= 0 && head.y >= 0 && head.x + head.w <= w && head.y + head.h <= h, 'slot: head out of the window');
  }
}

// 6. Centred lockups are left alone; off-centre ones may move.
expect(isCentred(400, 800, 0, 1200), 'a block centred on the canvas is centred');
expect(isCentred(372, 1132, 0, 1200) === false, 'Bump email 1 (card right of centre) is not centred');
expect(isCentred(36, 765, 0, 1200) === false, 'Bump email 3 (card on the left) is not centred');

if (faults.length) {
  console.error(`autoframe: ${faults.length} failure(s)\n - ${faults.join('\n - ')}`);
  process.exit(1);
}
console.log("autoframe clean: crop maths, hiker in E2/E3/E4, fixed crop, centred lockups, shaped slot");
