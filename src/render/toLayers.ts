/** The rendered asset as a list of layers, for something else to build.
 *
 *  The studio does not try to write a Figma file. It says what the asset is
 *  -- a frame of this size, a photograph here, a rounded orange rectangle
 *  tilted two degrees there, this string in Quiet Sans 800 at 58px at these
 *  coordinates -- and Claude builds that with Figma's own tools. What comes
 *  out is a native Figma frame: real text frames that can be retyped, real
 *  rectangles that can be recoloured, a real mask where there is a mask.
 *
 *  An SVG import cannot be that. It arrives as an approximation, flattens
 *  anything it cannot express, and depends on font names resolving by luck.
 *
 *  This reads the live DOM for the same reason the screenshot does: what is on
 *  screen has already resolved every fit, fallback and edit, and a second
 *  opinion about any of those is a second renderer waiting to drift.
 */

export type Layer =
  | { n: number; name: string; type: 'image'; src: string;
      /** The visible box: clip the image to this. */
      x: number; y: number; width: number; height: number; radius?: number;
      /** The shape the box is cut to, where it is not a rectangle. Without it
       *  the signature window arrives in Figma as a rectangular photograph
       *  and the staircase that makes the design is simply gone. */
      clip?: { path: string; view: [number, number]; stroke?: string; strokeWidth?: number };
      /** Where to draw the image so it covers that box at its true aspect.
       *  Given explicitly because 'cover' leaves the crop to be rediscovered,
       *  and whoever rediscovers it gets a different answer. */
      draw: { x: number; y: number; width: number; height: number } }
  | { n: number; name: string; type: 'rect'; fill: string; opacity?: number;
      radius?: number; rotation?: number;
      /** A mark from the graphics library, cut to its own path rather than
       *  its bounding box -- without it a brush stroke or an arrow arrives in
       *  Figma as the coloured rectangle around it. */
      clip?: { path: string; view: [number, number] };
      x: number; y: number; width: number; height: number }
  | { n: number; name: string; type: 'text'; text: string; font: string;
      weight: number; size: number; lineHeight: number; letterSpacing: number;
      colour: string; align: string;
      x: number; y: number; width: number; height: number };

const hex = (c: string): { fill: string; opacity: number } | null => {
  const m = c.match(/rgba?\(([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,/\s]+([\d.]+))?/);
  if (!m) return null;
  const a = m[4] === undefined ? 1 : Number(m[4]);
  if (a === 0) return null;
  const h = (n: string) => Number(n).toString(16).padStart(2, '0');
  return { fill: `#${h(m[1])}${h(m[2])}${h(m[3])}`.toUpperCase(), opacity: a };
};

/** The name the font is installed under, not the one the web kit serves it by.
 *  Figma matches installed fonts and nothing is installed as 'quiet-sans'. */
const DESKTOP: Record<string, string> = {
  'quiet-sans': 'Quiet Sans', 'sofia-pro-variable': 'Sofia Pro', 'sofia-pro': 'Sofia Pro',
};
const faceName = (css: string) => {
  const first = css.split(',')[0].replace(/["']/g, '').trim();
  return DESKTOP[first.toLowerCase()] ?? first;
};

function turnOf(t: string): number {
  const m = t.match(/matrix\(([^)]+)\)/);
  if (!m) return 0;
  const [a, b] = m[1].split(',').map(Number);
  const deg = Math.atan2(b, a) * 180 / Math.PI;
  return Math.abs(deg) < 0.2 ? 0 : Math.round(deg * 10) / 10;
}

const r1 = (n: number) => Math.round(n * 10) / 10;

/** The source as the exporter will go looking for it.
 *
 *  A data: URL is the picture itself -- an upload travelling inside the
 *  campaign rather than a file on disk -- so it is kept whole. Parsed as a URL
 *  it becomes a 'pathname' of base64, which resolves to no file, and the
 *  exporter drops the image without saying so. */
const srcOf = (el: HTMLImageElement) => {
  const raw = el.currentSrc || el.src;
  return raw.startsWith('data:') ? raw : new URL(raw, location.href).pathname;
};

/** The run with the breaks the browser actually made in it.
 *
 *  Figma lays a fixed-width text frame out with its own shaping, so a line the
 *  browser fitted by half a pixel comes back broken in two -- which is what
 *  put a tile's category on two lines when the studio shows it on one. Carry
 *  the breaks and nothing downstream has to decide where a line ends.
 *
 *  Per word, because a soft break only happens at a break opportunity, and a
 *  hard <br> reads the same way: the next word simply starts at a new top.
 */
function broken(el: HTMLElement, leading: number): string {
  const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const r = document.createRange();
  const lines: string[] = [];
  let top = NaN;
  for (let t = walk.nextNode(); t; t = walk.nextNode()) {
    for (const m of (t as Text).data.matchAll(/\S+/g)) {
      r.setStart(t, m.index); r.setEnd(t, m.index + m[0].length);
      const box = r.getBoundingClientRect();
      if (!box.width && !box.height) continue;   // hidden; innerText skipped it too
      // Half the leading, so a word set on a different baseline within the
      // same line -- a superscript, a smaller unit -- is not read as a break.
      if (Math.abs(box.top - top) < leading / 2) lines[lines.length - 1] += ' ' + m[0];
      else { lines.push(m[0]); top = box.top; }
    }
  }
  return lines.join('\n');
}

import { cover } from './toSvg';
import STEP from '../data/stepped-window.json';
import MARK_SHAPES from '../data/mark-shapes.json';

/** The shapes a slot may be cut to, by the name the renderer marks it with.
 *  One place, so the mask the browser draws and the mask Figma builds cannot
 *  be two different shapes. */
const SHAPES: Record<string, { path: string; width: number; height: number }> = {
  'stepped-window': STEP,
};

/** The shape this element is cut to, if an ancestor says it is cut at all. */
function clipOf(el: Element, root: HTMLElement) {
  const holder = el.closest('[data-clip]');
  if (!holder || !root.contains(holder)) return undefined;
  const shape = SHAPES[holder.getAttribute('data-clip') ?? ''];
  if (!shape) return undefined;
  const stroke = holder.getAttribute('data-clip-stroke') ?? undefined;
  return { path: shape.path, view: [shape.width, shape.height] as [number, number],
           stroke, strokeWidth: stroke ? Number(holder.getAttribute('data-clip-width')) || 7
                                       : undefined };
}

export function toLayers(root: HTMLElement): { layers: Layer[]; fonts: string[] } {
  const base = root.getBoundingClientRect();
  const layers: Layer[] = [];
  let n = 0;

  const name = (el: Element, fallback: string) =>
    el.getAttribute('data-id')?.split('/').slice(-2).join('/') ?? fallback;

  const walk = (el: Element) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return;
    const b = el.getBoundingClientRect();
    const x = r1(b.left - base.left), y = r1(b.top - base.top);
    if (b.width < 1 || b.height < 1) return;

    if (el instanceof HTMLImageElement) {
      const fit = cover(el, b);
      layers.push({ n: ++n, name: name(el, 'image'), type: 'image',
        src: srcOf(el),
        x, y, width: r1(b.width), height: r1(b.height),
        radius: parseFloat(cs.borderTopLeftRadius) || undefined,
        clip: clipOf(el, root),
        draw: { x: r1(x + fit.dx), y: r1(y + fit.dy),
                width: r1(fit.w), height: r1(fit.h) } });
      return;
    }

    // A run of type is one layer, not two. Emitting the fill as well gave a
    // rectangle sitting exactly under every headline, which is noise to build
    // and noise to pick through afterwards.
    const isText = Array.from(el.childNodes)
      .some(k => k.nodeType === 3 && (k.textContent ?? '').trim());
    const bg = isText ? null : hex(cs.backgroundColor);
    if (bg) {
      const spin = turnOf(cs.transform);
      const markShape = el.getAttribute('data-clip-shape');
      const mark = markShape && (MARK_SHAPES as Record<string, { path: string; width: number; height: number }>)[markShape];
      layers.push({ n: ++n, name: name(el, 'block'), type: 'rect',
        fill: bg.fill, opacity: bg.opacity < 1 ? bg.opacity : undefined,
        radius: parseFloat(cs.borderTopLeftRadius) || undefined,
        rotation: spin || undefined,
        clip: mark ? { path: mark.path, view: [mark.width, mark.height] } : undefined,
        x, y, width: r1(b.width), height: r1(b.height) });
    }

    if (isText) {
      const lead = r1(parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2);
      const text = broken(el as HTMLElement, lead);
      if (text) {
        const font = faceName(cs.fontFamily);
        const colour = hex(cs.color) ?? { fill: '#000000', opacity: 1 };
        // The content box, not the border box. Padding belongs to the pill, and
        // a run pinned to the padded corner sits up and left of where the
        // studio drew it by exactly that padding.
        const inL = parseFloat(cs.paddingLeft) + parseFloat(cs.borderLeftWidth);
        const inR = parseFloat(cs.paddingRight) + parseFloat(cs.borderRightWidth);
        const inT = parseFloat(cs.paddingTop) + parseFloat(cs.borderTopWidth);
        const inB = parseFloat(cs.paddingBottom) + parseFloat(cs.borderBottomWidth);
        layers.push({ n: ++n, name: name(el, 'text'), type: 'text', text,
          font, weight: Number(cs.fontWeight) || 400, size: r1(parseFloat(cs.fontSize)),
          lineHeight: lead,
          letterSpacing: cs.letterSpacing === 'normal' ? 0 : r1(parseFloat(cs.letterSpacing)),
          colour: colour.fill, align: cs.textAlign === 'start' ? 'left' : cs.textAlign,
          x: r1(x + inL), y: r1(y + inT),
          width: r1(b.width - inL - inR), height: r1(b.height - inT - inB) });
      }
      return;
    }

    for (const kid of Array.from(el.children)) walk(kid);
  };

  for (const kid of Array.from(root.children)) walk(kid);

  // A running band repeats past the frame on purpose. The repeats that are
  // wholly outside it are not layers anyone wants to build -- the one that
  // straddles the edge stays, because that is the part you see.
  const W = base.width, H = base.height;
  const inside = layers.filter(l => l.x < W && l.y < H
                                 && l.x + l.width > 0 && l.y + l.height > 0);
  const fonts = [...new Set(inside.filter(l => l.type === 'text')
    .map(l => `${l.font} ${l.weight}`))].sort();
  return { layers: inside.map((l, i) => ({ ...l, n: i + 1 })), fonts };
}
