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

/** Every layer may sit inside a clip (`parent`: that clip layer's `n`): it
 *  is drawn inside it and cut by it, as the browser cuts it. */
export type Layer = ({ parent?: number } & (
  | { n: number; name: string; type: 'clip';
      /** An element that cuts what's inside it: overflow that hides
       *  something, a CSS clip-path, a named shape. Its true box (unrotated)
       *  and turn; `radius` its corners; `path` the outline when it isn't a
       *  rectangle (in `view` units); `stroke` an outline drawn over it. */
      x: number; y: number; width: number; height: number; radius?: number; rotation?: number;
      path?: { path: string; view: [number, number] }; stroke?: string; strokeWidth?: number }
  | { n: number; name: string; type: 'image'; src: string;
      /** The visible box: clip the image to this. */
      x: number; y: number; width: number; height: number; radius?: number; rotation?: number;
      /** The shape the box is cut to, where it is not a rectangle. Without it
       *  the signature window arrives in Figma as a rectangular photograph
       *  and the staircase that makes the design is simply gone. */
      clip?: { path: string; view: [number, number]; stroke?: string; strokeWidth?: number };
      /** A CSS brightness() the studio draws it with (a white brand logo
       *  shown charcoal): Figma gets the artwork's colours scaled by it. */
      brightness?: number;
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
      colour: string; align: string; underline?: boolean; rotation?: number;
      /** Character ranges set differently from the rest (a paragraph's bold,
       *  green code word), as [from, to) offsets into `text`. */
      runs?: { from: number; to: number; weight?: number; colour?: string }[];
      x: number; y: number; width: number; height: number }));

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

function degreesOf(t: string): number {
  const m = t.match(/matrix\(([^)]+)\)/);
  if (!m) return 0;
  const [a, b] = m[1].split(',').map(Number);
  return Math.atan2(b, a) * 180 / Math.PI;
}

/** Total rotation from `el` up through (not including) `root`, in degrees.
 *
 *  A CSS `transform` does not inherit into a child's own computed style, so
 *  checking only `el`'s own transform reads a shape as perfectly upright
 *  whenever the rotation actually lives on a wrapper around it -- which is
 *  how every rotated card in these templates is built: one wrapper div
 *  carries `rotate()`, and the background/mark/text inside it never
 *  declares a transform of its own. Walking the ancestor chain and summing
 *  is what the renderer calls "the same tilt" when it says a mark "inherits
 *  the single rotation" from its card. */
function rotationOf(el: Element, root: HTMLElement): number {
  let total = 0;
  for (let cur: Element | null = el; cur && cur !== root; cur = cur.parentElement)
    total += degreesOf(getComputedStyle(cur).transform);
  return Math.abs(total) < 0.2 ? 0 : Math.round(total * 10) / 10;
}

/** Total scale from `el` up through (not including) `root`. Like rotation,
 *  a `scale()` on a wrapper (smart placement shrinks a whole ticket card that
 *  way) never shows in a child's own computed width, height or font size,
 *  which are what Figma is handed -- so each is multiplied by this. */
function scaleOf(el: Element, root: HTMLElement): number {
  let total = 1;
  for (let cur: Element | null = el; cur && cur !== root; cur = cur.parentElement) {
    const m = getComputedStyle(cur).transform.match(/matrix\(([^)]+)\)/);
    if (m) { const [a, b] = m[1].split(',').map(Number); total *= Math.hypot(a, b); }
  }
  return Math.abs(total - 1) < 0.001 ? 1 : total;
}

/** The box Figma wants for a rotated shape: true (unrotated) width/height,
 *  built back out from the shape's true centre -- not the bigger,
 *  axis-aligned box `getBoundingClientRect()` reports once rotation is
 *  involved. A `rotate()` transform leaves the shape's own centre fixed in
 *  place (true at any angle, for a pure rotation with no accompanying
 *  translate or scale, which is all this codebase ever composes), so the
 *  bounding box's centre is already the right point to rebuild from -- the
 *  element's own CSS width/height (unaffected by any transform, its own or
 *  an ancestor's) gives the true size to rebuild around it. */
function trueBox(b: DOMRect, cs: CSSStyleDeclaration, k = 1) {
  const w = parseFloat(cs.width) * k || b.width, h = parseFloat(cs.height) * k || b.height;
  const cx = b.left + b.width / 2, cy = b.top + b.height / 2;
  return { left: cx - w / 2, top: cy - h / 2, width: w, height: h };
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
  // Decoded: a URL's path spells a space as %20, and the exporter looks the
  // file up on disk by this name ("…/SC26_0021 Flash Sale Apr 4/…").
  return raw.startsWith('data:') ? raw : decodeURIComponent(new URL(raw, location.href).pathname);
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
 *
 *  `turn` (degrees): text set on a slant (a tilted tag) climbs word by word
 *  on the page, which read as a break after every word -- "EXTRA 20% OFF"
 *  arrived in Figma as three lines. Each word's height is taken across the
 *  text's own direction instead.
 */
function broken(el: HTMLElement, leading: number, turn = 0): string {
  const a = turn * Math.PI / 180;
  const across = (box: DOMRect) =>
    -Math.sin(a) * (box.left + box.width / 2) + Math.cos(a) * (box.top + box.height / 2);
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
      const at = turn ? across(box) : box.top;
      if (Math.abs(at - top) < leading / 2) lines[lines.length - 1] += ' ' + m[0];
      else { lines.push(m[0]); top = at; }
    }
  }
  return lines.join('\n');
}

import STEP from '../data/stepped-window.json';
import BUMP2_WINDOW from '../data/bump2-window.json';
import MARK_SHAPES from '../data/mark-shapes.json';

/** The shapes a slot may be cut to, by the name the renderer marks it with.
 *  One place, so the mask the browser draws and the mask Figma builds cannot
 *  be two different shapes. */
const SHAPES: Record<string, { path: string; width: number; height: number }> = {
  'stepped-window': STEP,
  'bump2-window': BUMP2_WINDOW,
};

/** Whether an element cuts what's inside it, and to what: the clip a layer
 *  container in Figma has to reproduce. Read off the computed style, so it
 *  holds for any template:
 *  - a named shape (`data-clip`: the stepped window);
 *  - a CSS clip-path -- path(), polygon(), or an inset() that cuts inward
 *    (an inset reaching outward, the hit-area trim on a headline, cuts
 *    nothing);
 *  - overflow hidden/clip, when something inside reaches past the box or
 *    the box rounds its corners over what's inside.
 *  `null` when it cuts nothing; `{}` for its plain (rounded) box. */
function clipShapeOf(el: Element, cs: CSSStyleDeclaration, b: DOMRect):
    { path?: string; view?: [number, number]; stroke?: string; strokeWidth?: number } | null {
  const named = SHAPES[el.getAttribute('data-clip') ?? ''];
  if (named) {
    const stroke = el.getAttribute('data-clip-stroke') ?? undefined;
    return { path: named.path, view: [named.width, named.height], stroke,
             strokeWidth: stroke ? Number(el.getAttribute('data-clip-width')) || 7 : undefined };
  }
  const w = (el as HTMLElement).offsetWidth || b.width, h = (el as HTMLElement).offsetHeight || b.height;
  const len = (v: string, of: number) => v.endsWith('%') ? parseFloat(v) / 100 * of : parseFloat(v) || 0;
  const cp = cs.clipPath;
  const path = cp.match(/^path\((?:[a-z-]+,\s*)?["'](.+)["']\)$/)?.[1];
  if (path) return { path, view: [w, h] };
  const poly = cp.match(/^polygon\((?:[a-z-]+,\s*)?(.+)\)$/)?.[1];
  if (poly) {
    const pts = poly.split(',').map(p => p.trim().split(/\s+/)).map(([x, y]) => `${len(x, w)} ${len(y, h)}`);
    return { path: `M ${pts.join(' L ')} Z`, view: [w, h] };
  }
  const inset = cp.match(/^inset\(([^)]*?)(?:\s+round\s+[^)]*)?\)$/)?.[1];
  if (inset) {
    const v = inset.trim().split(/\s+/);
    const [t, r, bt, l] = [v[0], v[1] ?? v[0], v[2] ?? v[0], v[3] ?? v[1] ?? v[0]];
    const top = len(t, h), right = len(r, w), bottom = len(bt, h), left = len(l, w);
    if (top > 0.5 || right > 0.5 || bottom > 0.5 || left > 0.5) {
      const x0 = Math.max(0, left), y0 = Math.max(0, top), x1 = w - Math.max(0, right), y1 = h - Math.max(0, bottom);
      return { path: `M ${x0} ${y0} H ${x1} V ${y1} H ${x0} Z`, view: [w, h] };
    }
  }
  if (!['hidden', 'clip'].includes(cs.overflowX) && !['hidden', 'clip'].includes(cs.overflowY)) return null;
  if (!el.children.length) return null;
  if (parseFloat(cs.borderTopLeftRadius) > 0) return {};
  const reach = Array.from(el.querySelectorAll('*')).some(d => {
    const r = d.getBoundingClientRect();
    return r.width > 0 && r.height > 0
      && (r.left < b.left - 0.5 || r.top < b.top - 0.5 || r.right > b.right + 0.5 || r.bottom > b.bottom + 0.5);
  });
  return reach ? {} : null;
}

/** A paragraph set as inline runs (a body copy with its code word in bold
 *  green, three spans): the whole of it as one text with its breaks, and
 *  the runs whose weight or colour differ from the paragraph's. Only for a
 *  paragraph that wraps -- a one-line pair of runs ("CODE" + the code) is
 *  exported as two placed runs, which lines up already; a wrapped one as
 *  three boxes overlapped in Figma. Words in adjacent runs with no space
 *  between them ("SPOOKY20" + ".") stay joined. */
function paragraphRuns(el: HTMLElement, cs: CSSStyleDeclaration, lead: number) {
  const kids = Array.from(el.children) as HTMLElement[];
  if (kids.length < 2 || Array.from(el.childNodes).some(k => k.nodeType === 3 && k.textContent!.trim())
      || kids.some(k => getComputedStyle(k).display !== 'inline' || k.children.length)
      || el.getBoundingClientRect().height < lead * 1.5) return null;
  const r = document.createRange();
  const lines: string[] = [];
  const spans: { kid: HTMLElement; from: number; to: number }[] = [];
  let top = NaN, glued = false;
  for (const kid of kids) {
    const data = kid.textContent ?? '';
    const node = kid.firstChild;
    for (const m of data.matchAll(/\S+/g)) {
      if (!node) break;
      r.setStart(node, m.index); r.setEnd(node, m.index + m[0].length);
      const box = r.getBoundingClientRect();
      if (!box.width && !box.height) continue;
      const join = m.index === 0 && glued && lines.length && Math.abs(box.top - top) < lead / 2;
      if (join) lines[lines.length - 1] += m[0];
      else if (lines.length && Math.abs(box.top - top) < lead / 2) lines[lines.length - 1] += ' ' + m[0];
      else { lines.push(m[0]); top = box.top; }
      const end = lines.join('\n').length;
      spans.push({ kid, from: end - m[0].length, to: end });
    }
    glued = !!data && !/\s$/.test(data);
  }
  const base = { weight: Number(cs.fontWeight) || 400, colour: hex(cs.color)?.fill };
  const runs: { from: number; to: number; weight?: number; colour?: string }[] = [];
  for (const kid of kids) {
    const own = spans.filter(s => s.kid === kid);
    if (!own.length) continue;
    const ks = getComputedStyle(kid), weight = Number(ks.fontWeight) || 400, colour = hex(ks.color)?.fill;
    if (weight === base.weight && colour === base.colour) continue;
    runs.push({ from: own[0].from, to: own.at(-1)!.to,
      ...(weight !== base.weight ? { weight } : null), ...(colour !== base.colour ? { colour } : null) });
  }
  return { text: lines.join('\n'), runs };
}


export function toLayers(root: HTMLElement): { layers: Layer[]; fonts: string[] } {
  const base = root.getBoundingClientRect();
  const layers: Layer[] = [];
  let n = 0;

  const name = (el: Element, fallback: string) =>
    el.getAttribute('data-id')?.split('/').slice(-2).join('/') ?? fallback;

  const walk = (el: Element, parent?: number) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return;
    const b = el.getBoundingClientRect();
    const k = scaleOf(el, root);
    if (b.width < 1 || b.height < 1) {
      // A position:absolute box with no explicit height and ONLY
      // absolutely-positioned children collapses to zero in its OWN box --
      // absolutely-positioned children never contribute to a parent's auto
      // size -- while those children still paint at real, visible positions.
      // There is nothing of this element's own to draw (and it cuts
      // nothing), but its children are not empty.
      for (const kid of Array.from(el.children)) walk(kid, parent);
      return;
    }

    // An element that cuts what's inside it becomes a container: its own
    // paint and everything inside it are drawn in it and cut by it. A
    // container, not a per-picture guess, so a tag hanging off a banner, a
    // turned photo in a window and a paper cut-out are each cut exactly as
    // the browser cuts them, in any template.
    const shape = clipShapeOf(el, cs, b);
    if (shape) {
      const spin = rotationOf(el, root);
      const box = spin || k !== 1 ? trueBox(b, cs, k) : b;
      layers.push({ n: ++n, parent, name: name(el, 'clip'), type: 'clip',
        x: r1(box.left - base.left), y: r1(box.top - base.top), width: r1(box.width), height: r1(box.height),
        radius: parseFloat(cs.borderTopLeftRadius) * k || undefined, rotation: spin || undefined,
        path: shape.path ? { path: shape.path, view: shape.view! } : undefined,
        stroke: shape.stroke, strokeWidth: shape.strokeWidth });
      parent = n;
    }

    if (el instanceof HTMLImageElement) {
      // The picture as drawn: its own box and turn, the artwork fitted in it
      // by its object-fit and object-position. Whatever crops it -- the
      // photo slot it pans and zooms inside, a window's outline -- is the
      // container around it, so nothing here has to guess at a crop.
      const rotation = rotationOf(el, root);
      const box = rotation || k !== 1 ? trueBox(b, cs, k) : { left: b.left, top: b.top, width: b.width, height: b.height };
      const nw = el.naturalWidth || box.width, nh = el.naturalHeight || box.height;
      const pos = cs.objectPosition.split(' ');
      const px = (parseFloat(pos[0]) || 50) / 100, py = (parseFloat(pos[1] ?? pos[0]) || 50) / 100;
      const fit = cs.objectFit === 'contain' ? Math.min(box.width / nw, box.height / nh)
        : cs.objectFit === 'fill' ? NaN : Math.max(box.width / nw, box.height / nh);
      const dw = Number.isNaN(fit) ? box.width : nw * fit, dh = Number.isNaN(fit) ? box.height : nh * fit;
      const bx = r1(box.left - base.left), by = r1(box.top - base.top);
      const bright = Number(cs.filter.match(/brightness\(([\d.]+)\)/)?.[1] ?? 1);
      layers.push({ n: ++n, parent, name: name(el, 'image'), type: 'image',
        src: srcOf(el),
        x: bx, y: by, width: r1(box.width), height: r1(box.height),
        radius: parseFloat(cs.borderTopLeftRadius) * k || undefined,
        rotation: rotation || undefined,
        brightness: bright !== 1 ? bright : undefined,
        draw: { x: r1(bx + (box.width - dw) * px), y: r1(by + (box.height - dh) * py), width: r1(dw), height: r1(dh) } });
      return;
    }

    const isText = Array.from(el.childNodes)
      .some(k => k.nodeType === 3 && (k.textContent ?? '').trim());
    // hex() already returns null for a transparent background (alpha 0), so
    // forcing this to null for every text element regardless was not "skip
    // the noise of an incidental fill" -- it was dropping every CTA pill's
    // own colour, since this codebase draws a button as one text element
    // with its own background rather than text inside a separate box. A
    // genuinely solid background behind a run of type is the button, not
    // noise under a headline.
    const bg = hex(cs.backgroundColor);
    if (bg) {
      // Checking only this element's OWN transform missed every mark drawn
      // inside a rotated wrapper (the ticket tag, the brush-strip badge, the
      // card textures) -- none of them declare a transform themselves, the
      // wrapper around them does, and a CSS transform doesn't inherit into
      // a child's computed style. Rotation is accumulated up the ancestor
      // chain instead, and once it's nonzero the box has to be rebuilt as
      // the TRUE (unrotated) one -- `getBoundingClientRect()` on a rotated
      // element reports the bigger axis-aligned box around it, and handing
      // that to Figma as if it were the shape's own size drew an oversized,
      // undistorted rectangle instead of a correctly-sized rotated one.
      const spin = rotationOf(el, root);
      const box = spin ? trueBox(b, cs, k) : { left: b.left, top: b.top, width: b.width, height: b.height };
      const markShape = el.getAttribute('data-clip-shape');
      const mark = markShape && (MARK_SHAPES as Record<string, { path: string; width: number; height: number }>)[markShape];
      layers.push({ n: ++n, parent, name: name(el, 'block'), type: 'rect',
        fill: bg.fill, opacity: bg.opacity < 1 ? bg.opacity : undefined,
        radius: parseFloat(cs.borderTopLeftRadius) * k || undefined,
        rotation: spin || undefined,
        clip: mark ? { path: mark.path, view: [mark.width, mark.height] } : undefined,
        x: r1(box.left - base.left), y: r1(box.top - base.top),
        width: r1(box.width), height: r1(box.height) });
    }

    const paragraph = !isText && el instanceof HTMLElement
      ? paragraphRuns(el, cs, (parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2)) : null;
    if (isText || paragraph) {
      const lead = r1((parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2) * k);
      const text = paragraph ? paragraph.text : broken(el as HTMLElement, lead, rotationOf(el, root));
      if (text) {
        const font = faceName(cs.fontFamily);
        const colour = hex(cs.color) ?? { fill: '#000000', opacity: 1 };
        // Every text field inside a rotated card (every offer/code/CTA line
        // in every email header and social -- the card rotates as one
        // wrapper, the text inside it never declares a transform of its
        // own) had NO rotation field at all and was positioned from its
        // rotated AABB -- it exported flat and in the wrong place while the
        // card around it came in correctly tilted. Same fix as rect/image:
        // accumulate the real rotation, rebuild the true (unrotated) box
        // from it when there is one.
        const spin = rotationOf(el, root);
        const box = spin ? trueBox(b, cs, k) : { left: b.left, top: b.top, width: b.width, height: b.height };
        const tx = r1(box.left - base.left), ty = r1(box.top - base.top);
        // The content box, not the border box. Padding belongs to the pill, and
        // a run pinned to the padded corner sits up and left of where the
        // studio drew it by exactly that padding.
        const inL = (parseFloat(cs.paddingLeft) + parseFloat(cs.borderLeftWidth)) * k;
        const inR = (parseFloat(cs.paddingRight) + parseFloat(cs.borderRightWidth)) * k;
        const inT = (parseFloat(cs.paddingTop) + parseFloat(cs.borderTopWidth)) * k;
        const inB = (parseFloat(cs.paddingBottom) + parseFloat(cs.borderBottomWidth)) * k;
        layers.push({ n: ++n, parent, name: name(el, 'text'), type: 'text', text,
          font, weight: Number(cs.fontWeight) || 400, size: r1(parseFloat(cs.fontSize) * k),
          lineHeight: lead,
          letterSpacing: cs.letterSpacing === 'normal' ? 0 : r1(parseFloat(cs.letterSpacing) * k),
          colour: colour.fill, align: cs.textAlign === 'start' ? 'left' : cs.textAlign,
          rotation: spin || undefined,
          // `text-decoration` was never read at all -- every underlined
          // link (Unsubscribe, Talk to a Gearhead, GT/CB/text-link copy)
          // exported as plain type.
          underline: cs.textDecorationLine.includes('underline') || undefined,
          runs: paragraph?.runs.length ? paragraph.runs : undefined,
          x: r1(tx + inL), y: r1(ty + inT),
          width: r1(box.width - inL - inR), height: r1(box.height - inT - inB) });
      }
      return;
    }

    for (const kid of Array.from(el.children)) walk(kid, parent);
  };

  for (const kid of Array.from(root.children)) walk(kid);

  // A running band repeats past the frame on purpose. The repeats that are
  // wholly outside it are not layers anyone wants to build -- the one that
  // straddles the edge stays, because that is the part you see.
  const W = base.width, H = base.height;
  const inside = layers.filter(l => l.x < W && l.y < H
                                 && l.x + l.width > 0 && l.y + l.height > 0);
  const fonts = [...new Set(inside.flatMap(l => l.type === 'text'
    ? [`${l.font} ${l.weight}`, ...(l.runs ?? []).filter(r => r.weight).map(r => `${l.font} ${r.weight}`)] : []))].sort();
  // Numbered again from 1, and each `parent` follows its clip's new number
  // (a clip wholly outside the frame takes its parent link with it).
  const renum = new Map(inside.map((l, i) => [l.n, i + 1]));
  return { layers: inside.map((l, i) => ({ ...l, n: i + 1,
    parent: l.parent !== undefined ? renum.get(l.parent) : undefined })), fonts };
}
