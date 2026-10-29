/** Framing for smart placement: the zoom and pan that keep a photo's subject
 *  clear of the copy block, as pure maths over the cached analysis
 *  (analysePhoto.ts) -- no DOM, no model, a few ms per placement.
 *
 *  `project` is Picture.tsx's crop maths exactly (cover, then initialScale x
 *  the designer's zoom, then a pan across the real pixel overflow), so a
 *  frame solved here is the crop the asset will actually show.
 *
 *  `composeCard` (below) places a photo's copy and crops the photo together
 *  by design rules, in strict order -- see its own comment. */
import type { Box, Region, RegionKind } from './analysePhoto';

/** Off-switch for the whole feature: false and nothing is ever auto-placed. */
export const SMART_PLACEMENT = true;
/** Bumped whenever placement itself improves: a photo auto-placed by an
 *  older version is placed again with the current rules (hand crops never). */
export const PLACEMENT_VERSION = 6; // 6: Bump 2's shaped slots framed inside their own shape

export type Rect = { x: number; y: number; w: number; h: number };
export type FrameInput = { natural: { w: number; h: number }; box: { w: number; h: number };
  initialScale: number; subject: Box; keep: Box[]; avoid: Rect[];
  /** Each person/object separately; defaults to the one subject box. */
  parts?: Box[] };

export const intersect = (a: Rect, b: Rect) =>
  Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x))
  * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));

const geometry = ({ natural, box, initialScale }: FrameInput, scale: number) => {
  const s = Math.max(box.w / natural.w, box.h / natural.h) * initialScale * scale;
  const rw = natural.w * s, rh = natural.h * s;
  return { rw, rh, ox: Math.max(0, rw - box.w), oy: Math.max(0, rh - box.h) };
};

export function project(input: FrameInput, scale: number, x: number, y: number, [u, v, w, h]: Box): Rect {
  const { rw, rh, ox, oy } = geometry(input, scale);
  const left = input.box.w / 2 - rw / 2 + (50 - x) / 100 * ox;
  const top = input.box.h / 2 - rh / 2 + (50 - y) / 100 * oy;
  return { x: left + u * rw, y: top + v * rh, w: w * rw, h: h * rh };
}

/** Whether a copy block sits on the canvas centre line (within 5% of its
 *  width) -- a centred lockup keeps its copy where the design put it. */
export const isCentred = (left: number, right: number, canvasLeft: number, canvasWidth: number) =>
  Math.abs((left + right) / 2 - (canvasLeft + canvasWidth / 2)) < canvasWidth * 0.05;

const STEPS = Array.from({ length: 51 }, (_, i) => i * 2);

/** How much covering each kind of region costs. A face is never worth it;
 *  legs and loose gear are the least important parts of a photo. */
export const WEIGHT: Record<RegionKind, number> = { head: 10, torso: 4, subject: 4, arms: 3, gear: 2, legs: 1 };
/** Overlap tier, worst part touched: 0 clean, 1 legs/gear only, 2 arms,
 *  3 torso or a whole subject, 4 a head. */
const TIER: Record<RegionKind, number> = { legs: 1, gear: 1, arms: 2, torso: 3, subject: 3, head: 4 };
export const MAX_ZOOM = 1.35; // over the plain cover fit, never more

/** One place the copy could go: `rects` is what it covers in photo-box px,
 *  `rank` how much a designer prefers it (0 = as designed), `size` its
 *  scale (1 = as designed), `corner` a bottom-left/right tough-call slot. */
export type CopyOption = { id: string; rank: number; size: number; rects: Rect[]; corner?: boolean;
  card?: { cx: number; cy: number } };
export type ComposeInput = {
  natural: { w: number; h: number }; box: { w: number; h: number }; initialScale: number;
  regions: Region[]; people: Box[];
  /** The part of the photo the design leaves free: below the marquee band,
   *  above the brand strip, inside the side margins -- photo-box px. */
  band: Rect; obstacles: Rect[]; options: CopyOption[];
  /** The designer's own crop: when set, only the copy is placed around it. */
  fixed?: { x: number; y: number; scale: number };
};
export type Composition = { option: CopyOption; frame: { x: number; y: number; scale: number };
  tier: number; overlap: number; tough: boolean };

const area = (r: Rect) => Math.max(0, r.w) * Math.max(0, r.h);
const unionRect = (rs: Rect[]): Rect => {
  const x0 = Math.min(...rs.map(r => r.x)), y0 = Math.min(...rs.map(r => r.y));
  return { x: x0, y: y0, w: Math.max(...rs.map(r => r.x + r.w)) - x0, h: Math.max(...rs.map(r => r.y + r.h)) - y0 };
};

/** The part of a w x h box a shape covers (or, `outside`, leaves out), as
 *  rects: the box cut into a grid about `cells` wide, each row's run of
 *  matching cells one rect. A photo slot clipped to a stepped window hides
 *  everything outside its outline -- those rects are where a face must not
 *  go. `hit` says whether a point is inside the shape. */
export function shapeCells(w: number, h: number, hit: (x: number, y: number) => boolean,
  outside = false, cells = 40): Rect[] {
  const cw = w / cells, rows = Math.max(1, Math.round(h / cw)), ch = h / rows, out: Rect[] = [];
  for (let r = 0; r < rows; r++) {
    let start = -1;
    for (let c = 0; c <= cells; c++) {
      const on = c < cells && hit((c + 0.5) * cw, (r + 0.5) * ch) !== outside;
      if (on && start < 0) start = c;
      if (!on && start >= 0) { out.push({ x: start * cw, y: r * ch, w: (c - start) * cw, h: ch }); start = -1; }
    }
  }
  return out;
}

/** The free band between whatever sits along the top (marquee, its band)
 *  and along the bottom (brand strip) of a frame, inside 5% side margins. */
export function safeBand(frame: Rect, obstacles: Rect[]): Rect {
  const topEdge = obstacles.filter(o => o.y + o.h <= frame.y + frame.h * 0.3).reduce((m, o) => Math.max(m, o.y + o.h), frame.y);
  const bottomEdge = obstacles.filter(o => o.y >= frame.y + frame.h * 0.7).reduce((m, o) => Math.min(m, o.y), frame.y + frame.h);
  const margin = frame.w * 0.05, gutter = frame.h * 0.02;
  return { x: frame.x + margin, y: topEdge + gutter, w: frame.w - 2 * margin, h: bottomEdge - topEdge - 2 * gutter };
}

/** The deliberate places a ticket card can go, largest first: as designed,
 *  mirrored, bottom-left/right, middle-left/right -- each at 100/90/80/70%,
 *  kept inside the free band and off every obstacle. Slots on the photo's
 *  copy side outrank the other side. */
export function cardOptions(card: { w: number; h: number; cx: number; cy: number }, band: Rect,
  obstacles: Rect[], copySide: 'left' | 'right', minSize = 0.7): CopyOption[] {
  const out: CopyOption[] = [];
  const mid = band.x + band.w / 2;
  for (const size of [1, 0.9, 0.8, 0.7].filter(s => s >= minSize - 1e-9)) {
    const w = card.w * size, h = card.h * size;
    if (w > band.w || h > band.h) continue;
    const left = band.x + w / 2, right = band.x + band.w - w / 2;
    const top = band.y + h / 2, bottom = band.y + band.h - h / 2, middle = band.y + band.h / 2;
    const clampX = (x: number) => Math.min(right, Math.max(left, x));
    const clampY = (y: number) => Math.min(bottom, Math.max(top, y));
    const slots: [string, number, number, boolean?][] = [
      ['designed', clampX(card.cx), clampY(card.cy)],
      ['mirror', clampX(2 * mid - card.cx), clampY(card.cy)],
      ['bottom-left', left, bottom, true], ['bottom-right', right, bottom, true],
      ['middle-left', left, middle], ['middle-right', right, middle],
    ];
    const seen: Rect[] = [];
    for (const [name, cx, cy, corner] of slots) {
      const rect = { x: cx - w / 2, y: cy - h / 2, w, h };
      if (seen.some(r => Math.abs(r.x - rect.x) < 4 && Math.abs(r.y - rect.y) < 4)) continue;
      if (obstacles.some(o => intersect(o, rect) > 0)) continue;
      seen.push(rect);
      const onCopySide = (cx < mid - 1) === (copySide === 'left') || Math.abs(cx - mid) <= 1;
      const rank = name === 'designed' ? 0 : (onCopySide ? 1 : 4) + (name === 'mirror' ? 0 : name.startsWith('bottom') ? 1 : 2);
      out.push({ id: `${name}@${Math.round(size * 100)}`, rank, size, rects: [rect], corner, card: { cx, cy } });
    }
  }
  return out;
}

/** Picks the copy option and the photo crop together, the way a designer
 *  would, in strict order: (1) touch the people as little as possible --
 *  nothing, then legs or gear only, then arms...; (2) keep the copy as big
 *  as designed; (3) keep it where it was designed, else on the photo's copy
 *  side; (4) zoom as little as possible -- down to the plain cover fit, up
 *  to MAX_ZOOM; (5) compose: subject on the third away from the copy, real
 *  headroom, a sensible size. Heads are always fully in frame and never
 *  under the marquee. When even the best touches arms or worse, it's a
 *  tough call: the copy goes to a bottom corner, the photo zooms right out,
 *  and the least weighted overlap wins. */
export function composeCard(input: ComposeInput): Composition | null {
  const { box, band, obstacles, options } = input;
  if (!options.length) return null;
  const fi: FrameInput = { natural: input.natural, box, initialScale: input.initialScale,
    subject: [0, 0, 1, 1], keep: [], avoid: [] };
  const frameRect = { x: 0, y: 0, w: box.w, h: box.h };
  type Shot = { x: number; y: number; scale: number; zoom: number; regions: { kind: RegionKind; r: Rect }[];
    base: { weighted: number; tier: number }; heads: Rect[]; people: Rect | null };
  const shoot = (x: number, y: number, scale: number): Shot => {
    const regions = input.regions.map(g => ({ kind: g.kind, r: project(fi, scale, x, y, g.box) }));
    const heads = regions.filter(g => g.kind === 'head').map(g => g.r);
    const people = input.people.length ? unionRect(input.people.map(b => project(fi, scale, x, y, b))) : null;
    return { x, y, scale, zoom: input.initialScale * scale, regions, heads, people,
      base: covered(regions, obstacles) };
  };
  // Head, torso and arms get breathing room and count on any contact; legs
  // and gear only once more than a sliver is covered.
  const breath = box.w * 0.015;
  const covered = (regions: Shot['regions'], over: Rect[]) => {
    let weighted = 0, tier = 0;
    for (const { kind, r: raw } of regions) {
      const protect = kind === 'head' || kind === 'torso' || kind === 'arms';
      const r = protect ? { x: raw.x - breath, y: raw.y - breath, w: raw.w + 2 * breath, h: raw.h + 2 * breath } : raw;
      const a = area(r);
      if (!a) continue;
      const hit = over.reduce((sum, o) => sum + intersect(o, r), 0) / a;
      if (protect ? hit === 0 : hit < 0.01) continue;
      weighted += WEIGHT[kind] * Math.min(1, hit);
      tier = Math.max(tier, TIER[kind]);
    }
    return { weighted, tier };
  };
  const inFrame = (r: Rect) => r.x >= -1 && r.y >= -1 && r.x + r.w <= box.w + 1 && r.y + r.h <= box.h + 1;
  const visible = (r: Rect) => intersect(r, frameRect) / Math.max(Math.min(r.w, box.w) * Math.min(r.h, box.h), 1e-6);

  // Every crop worth considering: zoom from the plain cover fit (which may
  // be below the template's own initialScale) to MAX_ZOOM, pan in 5% steps.
  let shots: Shot[] = [];
  if (input.fixed) shots = [shoot(input.fixed.x, input.fixed.y, input.fixed.scale)];
  else for (let z = 1; z <= MAX_ZOOM + 1e-9; z += 0.05) {
    const scale = z / input.initialScale;
    const s0 = shoot(50, 50, scale);
    const ox = geometry(fi, scale).ox, oy = geometry(fi, scale).oy;
    for (const x of ox ? STEPS.filter(v => v % 5 === 0) : [50])
      for (const y of oy ? STEPS.filter(v => v % 5 === 0) : [50])
        shots.push(x === 50 && y === 50 ? s0 : shoot(x, y, scale));
  }
  // Hard rules, relaxed only if nothing passes: heads whole, in frame and
  // clear of the marquee and brand strip; torso/arms/subject mostly in view.
  if (!input.fixed) {
    const clear = (h: Rect) => inFrame(h) && obstacles.every(o => intersect(o, h) === 0);
    const strict = shots.filter(s => s.heads.every(clear)
      && s.regions.every(g => !['torso', 'arms', 'subject'].includes(g.kind) || visible(g.r) >= 0.85));
    const heads = shots.filter(s => s.heads.every(clear));
    shots = strict.length ? strict : heads.length ? heads : shots;
  }

  const composeError = (s: Shot, o: CopyOption) => {
    if (!s.people) return 0;
    const copy = unionRect(o.rects), copyX = copy.x + copy.w / 2;
    const target = Math.abs(copyX - box.w / 2) < box.w * 0.08 ? box.w / 2 : copyX < box.w / 2 ? box.w * 2 / 3 : box.w / 3;
    const third = Math.abs(s.people.x + s.people.w / 2 - target) / box.w;
    const headTop = s.heads.length ? Math.min(...s.heads.map(h => h.y)) : s.people.y;
    const room = (headTop - band.y) / band.h;
    const headroom = room < 0.05 ? 0.05 - room : room > 0.2 ? room - 0.2 : 0;
    const size = s.people.h / band.h;
    const scale = size < 0.35 ? 0.35 - size : size > 0.9 ? size - 0.9 : 0;
    return third + headroom * 2 + scale;
  };
  type Pick = Composition & { key: number[] };
  const judge = (s: Shot, o: CopyOption): Pick => {
    const own = covered(s.regions, o.rects);
    const tier = Math.max(own.tier, s.base.tier), overlap = own.weighted + s.base.weighted;
    return { option: o, frame: { x: s.x, y: s.y, scale: s.scale }, tier, overlap, tough: false,
      key: [tier, tier ? Math.round(overlap * 10) : 0, -Math.round(o.size * 20), o.rank,
            Math.round(s.zoom * 20), composeError(s, o)] };
  };
  const better = (a: Pick, b: Pick) => { for (let i = 0; i < a.key.length; i++) if (a.key[i] !== b.key[i]) return a.key[i] < b.key[i]; return false; };

  let best: Pick | null = null;
  for (const s of shots) for (const o of options) { const p = judge(s, o); if (!best || better(p, best)) best = p; }
  if (!best || best.tier < 2 || input.fixed) return best;

  // A tough call: bottom corner, plain cover fit, least weighted overlap.
  let tough: Pick | null = null;
  const loosest = Math.min(...shots.map(s => s.zoom));
  for (const s of shots.filter(s => s.zoom <= loosest + 1e-9)) for (const o of options.filter(o => o.corner)) {
    const p = judge(s, o);
    p.key = [Math.round(p.overlap * 10), -Math.round(o.size * 20), composeError(s, o)];
    if (!tough || better(p, tough)) tough = p;
  }
  return tough ? { ...tough, tough: true } : best;
}
