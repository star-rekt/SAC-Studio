/** A Figma frame compiled to layout data (scripts/figma-pull.ts), and the CSS
 *  that puts a layer exactly where Figma has it.
 *
 *  Templates place layers from these numbers instead of retyping them. What
 *  Figma can't say -- which text shrinks to fit, which way a row grows when
 *  the copy is longer -- stays in the template; where Figma does say it
 *  (a text box's alignment), that's what decides. */
import type { CSSProperties } from 'react';
import { stack } from '../../fonts';

export type FigmaText = {
  chars: string; family: string; weight: number; size: number;
  lineHeight: number; letterSpacing: number;
  align: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED'; valign: 'TOP' | 'CENTER' | 'BOTTOM';
  resize: 'NONE' | 'WIDTH_AND_HEIGHT' | 'HEIGHT' | 'TRUNCATE';
  /** Figma's leading trim to cap height: the box runs cap top to baseline. */
  trim: boolean;
  /** Characters styled apart from the run, [from, to) -- hand kerning, a
   *  tightened space. An editable run can't carry these. */
  runs?: { from: number; to: number; style: Record<string, unknown> }[];
};
export type FigmaLayer = {
  name: string; type: string; parent: string | null; visible: boolean;
  /** The box, relative to the frame's top left -- for a rotated layer, the
   *  upright box round it (Figma's absoluteBoundingBox). */
  x: number; y: number; w: number; h: number;
  /** Its own rotation, and (`turn`) its whole rotation on the page, its
   *  ancestors' included -- degrees, as CSS rotate() takes them. */
  rotation?: number; turn?: number;
  /** A vector's outline (Figma's fillGeometry, in its own px), and its stroke. */
  path?: string; stroke?: { color?: string; weight: number; align: string; path?: string }; radius?: number; text?: FigmaText;
  /** Layer opacity, layer blur radius and drop shadow, as Figma sets them. */
  opacity?: number; blur?: number; shadow?: Shadow;
  /** Every drop shadow, when there's more than one. */
  shadows?: Shadow[];
  /** Gradients painted over its image (a banner's shade over its photo), as a CSS background. */
  shade?: string;
  /** Its blend mode, when not normal (Figma's name: MULTIPLY, SCREEN...). */
  blend?: string;
  /** A layer only Figma can draw (a custom effect): Figma's render of it,
   *  `ref` in the layout's assets, covering this box (frame px). */
  render?: { ref: string; x: number; y: number; w: number; h: number };
} & Fill;
type Shadow = { x: number; y: number; blur: number; color?: string };

/** A fill: a colour, and image fills bottom to top (`ref` keys the layout's
 *  `assets`); `crop` is the first image's imageTransform when it's cropped. */
type Fill = { fill?: string; image?: boolean; crop?: number[][];
  images?: { ref: string; mode: string; opacity?: number; blend?: string }[] };
export type FigmaLayout = {
  source: { file: string; node: string; name: string };
  size: [number, number];
  /** The frame's own fill: a colour, or the photo filling it. */
  frame: Fill;
  layers: Record<string, FigmaLayer>;
  /** The frame's image fills, saved under public/ by figma:pull. */
  assets?: Record<string, { src: string; w: number; h: number }>;
};

export function layerOf(layout: FigmaLayout, id: string): FigmaLayer {
  const l = layout.layers[id];
  if (!l) throw new Error(`${layout.source.name}: no layer ${id} -- re-run npm run figma:pull?`);
  return l;
}

/** The layer's own box, absolutely positioned in the frame. */
export const boxOf = (l: FigmaLayer): CSSProperties =>
  ({ position: 'absolute', left: l.x, top: l.y, width: l.w, height: l.h });

const JUSTIFY = { LEFT: 'flex-start', JUSTIFIED: 'flex-start', CENTER: 'center', RIGHT: 'flex-end' } as const;
const ITEMS = { TOP: 'flex-start', CENTER: 'center', BOTTOM: 'flex-end' } as const;

type Align = FigmaText['align'];

/** A box that holds a run the way Figma anchors it: a left-aligned run
 *  grows right, a centred one both ways, a right-aligned one left. `align`
 *  overrides Figma's where the design means something else -- a row that
 *  shares a right margin with the rest of its column, say. */
export const anchorOf = (l: FigmaLayer, align: Align = l.text?.align ?? 'LEFT'): CSSProperties => ({
  ...boxOf(l), display: 'flex', whiteSpace: 'nowrap', pointerEvents: 'none',
  justifyContent: JUSTIFY[align], alignItems: ITEMS[l.text?.valign ?? 'TOP'],
});

/** The run's type, exactly as Figma sets it. `fontSize` overrides the size
 *  (a fitted run); line height and tracking scale with it. */
export function typeOf(l: FigmaLayer, fontSize?: number): CSSProperties {
  const t = l.text!;
  const k = (fontSize ?? t.size) / t.size;
  return {
    fontFamily: stack(t.family), fontWeight: t.weight, fontSize: fontSize ?? t.size,
    lineHeight: `${t.lineHeight * k}px`, letterSpacing: t.letterSpacing * k,
    color: l.fill, whiteSpace: t.chars.includes('\n') ? 'pre' : 'nowrap',
    // CSS puts letter spacing after the last letter too; Figma's box ends at
    // the glyph. For a tracked-out run (an eyebrow) that trailing space is
    // taken back off the box.
    ...(t.letterSpacing > 0 ? { marginRight: -t.letterSpacing * k } : null),
    // A stroked run: CSS strokes on the glyph's edge, half each side, so
    // painted under the fill only the outer half shows -- an outside stroke
    // is drawn twice as wide, a centred one as is.
    ...(l.stroke && l.stroke.align !== 'INSIDE' ? { paintOrder: 'stroke fill',
      WebkitTextStroke: `${l.stroke.weight * k * (l.stroke.align === 'OUTSIDE' ? 2 : 1)}px ${l.stroke.color}` } : null),
    textAlign: t.align === 'RIGHT' ? 'right' : t.align === 'CENTER' ? 'center' : 'left',
    // Trimmed to cap height, the box is the cap box -- but the browser still
    // hit-tests the full line (its ascent and leading), so a big headline
    // took clicks meant for whatever sits just above it (the Bump hero's
    // EXTRA swallowed its urgency badge). A clip a little past the box --
    // room for accents above, descenders below -- keeps clicks to the run's
    // own area; nothing the run draws reaches past it.
    ...(t.trim ? { textBoxTrim: 'trim-both', textBoxEdge: 'cap alphabetic', clipPath: 'inset(-35% -10% -45% -10%)' } : null),
  } as CSSProperties;
}

/** The `focus`, `initialScale` and `rotate` that make Picture show exactly
 *  the crop a Figma image fill has (its imageTransform), for an image
 *  `natural` px in size filling a `box`. The same maths Picture draws with
 *  (autoFrame's geometry): a cover fit, zoomed, panned by focus % of the
 *  overflow -- plus a turn, when the board rotated the photo in its frame.
 *
 *  The transform maps the box (0..1) onto the image (0..1); in px that is
 *  k·R(φ) for a photo scaled k and turned φ, so the image draws at 1/k,
 *  turned -φ, its centre where the inverse puts it. */
export function cropOf(crop: number[][], box: [number, number], natural: [number, number]) {
  const [[a, b, tx], [c, d, ty]] = crop;
  const [W, H] = box, [nw, nh] = natural;
  // Box px -> image px.
  const m00 = nw * a / W, m01 = nw * b / H, m10 = nh * c / W, m11 = nh * d / H;
  const k = Math.sqrt(Math.abs(m00 * m11 - m01 * m10));
  const turn = Math.atan2(m10, m00);
  // The image's centre, back in box px (inverse of the affine map).
  const ix = nw / 2 - nw * tx, iy = nh / 2 - nh * ty, det = m00 * m11 - m01 * m10;
  const cx = (m11 * ix - m01 * iy) / det, cy = (-m10 * ix + m00 * iy) / det;
  const rw = nw / k, rh = nh / k;
  const cover = Math.max(W / nw, H / nh);
  const at = (centre: number, rendered: number, side: number) => rendered > side
    ? Math.min(100, Math.max(0, 50 - (centre - side / 2) / (rendered - side) * 100)) : 50;
  return { initialScale: rw / (nw * cover), focus: { x: at(cx, rw, W), y: at(cy, rh, H) },
    rotate: Math.abs(turn) > 0.002 ? -turn * 180 / Math.PI : 0 };
}

/** Where an image fill draws inside its layer's box: at its crop (a
 *  stretched, cropped fill), or covering the box (Figma's FILL). For an
 *  <img> inside a box of the layer's size with overflow hidden. */
export function imageRect(l: FigmaLayer): CSSProperties {
  if (!l.crop) return { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' };
  const [a, , tx] = l.crop[0], [, d, ty] = l.crop[1];
  const rw = l.w / a, rh = l.h / d;
  return { position: 'absolute', left: -tx * rw, top: -ty * rh, width: rw, height: rh, maxWidth: 'none' };
}

/** A cropped image layer nested in a clipping box (a deal banner's photo
 *  inside its rounded frame), as one crop of that box -- what `cropOf`
 *  takes. The layer's own box and crop place the image; this re-expresses
 *  where it lands as fractions of the box. */
export function cropWithin(box: { x: number; y: number; w: number; h: number }, l: FigmaLayer): number[][] {
  const [a, , tx] = l.crop?.[0] ?? [1, 0, 0], [, d, ty] = l.crop?.[1] ?? [0, 1, 0];
  const rw = l.w / a, rh = l.h / d;
  const left = l.x - tx * rw - box.x, top = l.y - ty * rh - box.y;
  return [[box.w / rw, 0, -left / rw], [0, box.h / rh, -top / rh]];
}

/** A rotated layer's own box: its centre (the upright box's centre) and its
 *  unrotated width and height, recovered from the upright box and its turn. */
export function ownBox(l: FigmaLayer) {
  const a = (l.turn ?? 0) * Math.PI / 180, c = Math.abs(Math.cos(a)), s = Math.abs(Math.sin(a));
  const d = c * c - s * s;
  // Near 45° the upright box can't tell width from height; keep it as is.
  const [w, h] = Math.abs(d) < 0.05 ? [l.w, l.h] : [(l.w * c - l.h * s) / d, (l.h * c - l.w * s) / d];
  return { cx: l.x + l.w / 2, cy: l.y + l.h / 2, w, h };
}

/** A layer's box inside `parent` (null: the frame) in the parent's own
 *  unrotated px, turned by what it adds to the parent's turn -- for a
 *  layer nested in a rotated group (a tilted ticket card's text). */
export function placeIn(l: FigmaLayer, parent: FigmaLayer | null): CSSProperties {
  const me = ownBox(l), turn = (l.turn ?? 0) - (parent?.turn ?? 0);
  let cx = me.cx, cy = me.cy;
  if (parent) {
    const p = ownBox(parent), a = -(parent.turn ?? 0) * Math.PI / 180;
    const dx = me.cx - p.cx, dy = me.cy - p.cy;
    cx = dx * Math.cos(a) - dy * Math.sin(a) + p.w / 2;
    cy = dx * Math.sin(a) + dy * Math.cos(a) + p.h / 2;
  }
  return { position: 'absolute', left: cx - me.w / 2, top: cy - me.h / 2, width: me.w, height: me.h,
    ...(Math.abs(turn) > 0.01 ? { transform: `rotate(${turn}deg)` } : null) };
}

/** Where brand `n` of a row goes, given the board's logo slots left to right.
 *  The board's own brand in its slot (matched by name against `boardNames`,
 *  else the slot layer's name) keeps its exact box; any other brand gets an
 *  even cell centred on the slot -- the row's tallest logo high and 85% of
 *  the gap to the nearest slot wide -- since a slot shaped for one wordmark
 *  (Merrell, 296x33) shrinks a square logo to a speck. Frame px. */
export function brandSlot(slots: FigmaLayer[], n: number, brand: string, boardNames?: string[]) {
  const norm = (t: string) => t.toLowerCase().replace(/[^a-z]/g, '');
  const own = slots[n], name = boardNames?.[n] ?? own.name;
  if (norm(brand).length > 2 && norm(name).startsWith(norm(brand))) return { x: own.x, y: own.y, w: own.w, h: own.h };
  const centre = (l: FigmaLayer) => l.x + l.w / 2, middle = (l: FigmaLayer) => l.y + l.h / 2;
  const near = Math.min(...slots.filter((_, j) => j !== n).map(o => Math.abs(centre(o) - centre(own))));
  const w = near * 0.85, h = Math.max(...slots.map(o => o.h));
  const cy = slots.reduce((t, o) => t + middle(o), 0) / slots.length;
  return { x: centre(own) - w / 2, y: cy - h / 2, w, h };
}

/** A layer's drop shadows as a CSS filter, radius as Figma's own CSS export
 *  writes it. */
export const shadowFilter = (l: FigmaLayer) => (l.shadows ?? (l.shadow ? [l.shadow] : []))
  .map(s => `drop-shadow(${s.x}px ${s.y}px ${s.blur}px ${s.color ?? '#0004'})`).join(' ') || undefined;
