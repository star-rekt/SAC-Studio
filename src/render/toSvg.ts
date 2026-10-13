/** The rendered asset, as SVG, so Figma gets layers rather than a picture.
 *
 *  A PNG dropped into Figma is a flat image. Correctly named, correctly
 *  sized, and untouchable -- which makes the whole export close to worthless
 *  for anyone who wants to move a headline. SVG imports as real nodes: text
 *  stays text and can be retyped, a rectangle stays a rectangle and can be
 *  recoloured.
 *
 *  This reads the live DOM rather than rebuilding from the sheet, for the same
 *  reason the screenshot does: what is on screen has already resolved every
 *  fit, fallback and edit, and a second opinion about any of those is a second
 *  renderer waiting to drift.
 *
 *  What it cannot carry, it says so by flattening: a mask, a blend mode or a
 *  gradient becomes the plain fill underneath. The punched hole in the ticket
 *  is a radial-gradient mask and will come through as a solid corner.
 */

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** rgb(a) to hex, because Figma reads hex and ignores some rgba() forms. */
function hex(c: string): { fill: string; opacity: number } | null {
  const m = c.match(/rgba?\(([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,/\s]+([\d.]+))?/);
  if (!m) return null;
  const a = m[4] === undefined ? 1 : Number(m[4]);
  if (a === 0) return null;
  const h = (n: string) => Number(n).toString(16).padStart(2, '0');
  return { fill: `#${h(m[1])}${h(m[2])}${h(m[3])}`, opacity: a };
}

const dataUri = (img: HTMLImageElement): string | null => {
  try {
    const c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    c.getContext('2d')!.drawImage(img, 0, 0);
    // A logo is a PNG with transparency around it. Encoding one as JPEG fills
    // that transparency with black, and every brand mark arrived in a black
    // box. Photographs stay JPEG because they are large and have no alpha.
    const flat = /\.jpe?g($|\?)/i.test(img.currentSrc || img.src);
    return flat ? c.toDataURL('image/jpeg', 0.86) : c.toDataURL('image/png');
  } catch { return null; }   // a cross-origin photograph taints the canvas
};

/** The name the font is installed under, not the name the web kit serves it
 *  by. Figma matches against installed fonts, and nothing is installed as
 *  'quiet-sans' -- an SVG asking for that gets Times. */
const DESKTOP: Record<string, string> = {
  'quiet-sans': 'Quiet Sans',
  'sofia-pro-variable': 'Sofia Pro',
  'sofia-pro': 'Sofia Pro',
};
const faceName = (css: string) => {
  const first = css.split(',')[0].replace(/["']/g, '').trim();
  return DESKTOP[first.toLowerCase()] ?? first;
};

export function toSvg(root: HTMLElement, w: number, h: number): string {
  const base = root.getBoundingClientRect();
  const body: string[] = [];

  const walk = (el: Element) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return;
    const b = el.getBoundingClientRect();
    const x = b.left - base.left, y = b.top - base.top;

    if (el instanceof HTMLImageElement && b.width > 1) {
      const src = dataUri(el);
      if (src) {
        // Cover, worked out here rather than asked for.
        //
        //   preserveAspectRatio="xMidYMid slice" is the correct way to say
        //   object-fit: cover, and Figma ignores it -- it stretches the image
        //   to whatever width and height you gave, so every photograph came
        //   in skewed to its frame. Emitting the image at its TRUE aspect and
        //   clipping to the box needs no slice support from anyone: the
        //   width and height are already right, so there is nothing to
        //   stretch.
        const fit = cover(el, b);
        const clip = `c${body.length}`;
        body.push(`<clipPath id="${clip}"><rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" `
          + `width="${b.width.toFixed(1)}" height="${b.height.toFixed(1)}"/></clipPath>`);
        body.push(`<image clip-path="url(#${clip})" `
          + `x="${(x + fit.dx).toFixed(1)}" y="${(y + fit.dy).toFixed(1)}" `
          + `width="${fit.w.toFixed(1)}" height="${fit.h.toFixed(1)}" `
          + `preserveAspectRatio="none" href="${src}"/>`);
      }
      return;
    }

    // A block with a fill becomes a rectangle. Masks and gradients flatten.
    const bg = hex(cs.backgroundColor);
    if (bg && b.width > 1 && b.height > 1) {
      const r = parseFloat(cs.borderTopLeftRadius) || 0;
      // A rotated block's bounding box is bigger than the block. Drawing the
      // box would give a rectangle visibly larger than the tag it stands for,
      // so the rotation is undone into a transform and the true size used.
      const spin = turnOf(cs.transform);
      const w2 = spin ? b.width / Math.abs(Math.cos(spin * Math.PI / 180)) : b.width;
      const t = spin
        ? ` transform="rotate(${spin.toFixed(2)} ${(x + b.width / 2).toFixed(1)} ${(y + b.height / 2).toFixed(1)})"`
        : '';
      body.push(`<rect${t} x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${b.width.toFixed(1)}" `
        + `height="${b.height.toFixed(1)}"${r ? ` rx="${Math.min(r, b.height / 2).toFixed(1)}"` : ''} `
        + `fill="${bg.fill}"${bg.opacity < 1 ? ` fill-opacity="${bg.opacity}"` : ''}`
        + `${el.getAttribute('data-id') ? ` id="${esc(el.getAttribute('data-id')!)}"` : ''}/>`);
    }

    // A leaf holding text becomes <text>, one <tspan> per line the browser made.
    const own = Array.from(el.childNodes)
      .filter(n => n.nodeType === 3 && (n.textContent ?? '').trim()).length > 0;
    if (own) {
      const fill = hex(cs.color) ?? { fill: '#000000', opacity: 1 };
      const size = parseFloat(cs.fontSize);
      const fam = faceName(cs.fontFamily);
      const rows = rowsOf(el, base);
      if (rows.length) {
        body.push(`<text${el.getAttribute('data-id') ? ` id="${esc(el.getAttribute('data-id')!)}"` : ''} `
          + `font-family="${esc(fam)}" font-size="${size.toFixed(1)}" `
          + `font-weight="${cs.fontWeight}" fill="${fill.fill}"`
          + `${cs.letterSpacing !== 'normal' ? ` letter-spacing="${parseFloat(cs.letterSpacing).toFixed(2)}"` : ''}>`
          + rows.map(r => `<tspan x="${r.x.toFixed(1)}" y="${r.y.toFixed(1)}">${esc(r.text)}</tspan>`).join('')
          + `</text>`);
      }
      return;
    }

    for (const kid of Array.from(el.children)) walk(kid);
  };

  for (const kid of Array.from(root.children)) walk(kid);
  if (hexBg(root)) body.unshift(hexBg(root)!);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" `
    + `viewBox="0 0 ${w} ${h}">\n${body.join('\n')}\n</svg>`;
}

const hexBg = (root: HTMLElement) => {
  const c = hex(getComputedStyle(root).backgroundColor);
  const b = root.getBoundingClientRect();
  return c ? `<rect x="0" y="0" width="${b.width.toFixed(1)}" height="${b.height.toFixed(1)}" fill="${c.fill}"/>` : null;
};

/** The rects the browser broke a run into, in asset coordinates. */
function rowsOf(el: Element, base: DOMRect) {
  const out: { text: string; x: number; y: number }[] = [];
  const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const r = document.createRange();
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    const whole = n.textContent ?? '';
    if (!whole.trim()) continue;
    r.selectNodeContents(n);
    const rects = Array.from(r.getClientRects()).filter(x => x.width > 0.5);
    if (rects.length <= 1) {
      const b = rects[0] ?? (n.parentElement as HTMLElement).getBoundingClientRect();
      out.push({ text: whole.trim(), x: b.left - base.left, y: b.bottom - base.top - b.height * 0.22 });
      continue;
    }
    // Wrapped: split the words across the rects by how wide each one is.
    const words = whole.trim().split(/\s+/);
    const total = rects.reduce((s, x) => s + x.width, 0);
    let i = 0;
    rects.forEach((b, k) => {
      const take = k === rects.length - 1 ? words.length - i
        : Math.max(1, Math.round(words.length * (b.width / total)));
      const text = words.slice(i, i + take).join(' ');
      i += take;
      if (text) out.push({ text, x: b.left - base.left, y: b.bottom - base.top - b.height * 0.22 });
    });
  }
  return out;
}

/** Degrees out of a CSS matrix, or 0. */
function turnOf(t: string): number {
  const m = t.match(/matrix\(([^)]+)\)/);
  if (!m) return 0;
  const [a, b] = m[1].split(',').map(Number);
  const deg = Math.atan2(b, a) * 180 / Math.PI;
  return Math.abs(deg) < 0.2 ? 0 : deg;
}

/** Where object-fit: cover actually puts an image inside its box, honouring
 *  object-position and any scale the designer has zoomed it by. Returns the
 *  drawn rectangle relative to the box's top-left. */
export function cover(img: HTMLImageElement, box: DOMRect) {
  const nw = img.naturalWidth || box.width, nh = img.naturalHeight || box.height;
  const cs = getComputedStyle(img);
  // The crop the designer set: a pan as object-position and a zoom as scale.
  const pos = cs.objectPosition.split(' ');
  const px = (parseFloat(pos[0]) || 50) / 100;
  const py = (parseFloat(pos[1] ?? pos[0]) || 50) / 100;
  const zoom = (() => {
    const m = cs.transform.match(/matrix\(([^)]+)\)/);
    return m ? Math.abs(Number(m[1].split(',')[0])) || 1 : 1;
  })();

  const s = Math.max(box.width / nw, box.height / nh) * zoom;
  const w = nw * s, h = nh * s;
  return { w, h, dx: (box.width - w) * px, dy: (box.height - h) * py };
}
