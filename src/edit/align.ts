/** Aligning a selection -- left, centre or right -- one of two ways:
 *
 *  AUTO (the default, and the one actually wanted day to day): elements
 *  whose vertical extent overlaps are clustered into one rigid object first
 *  -- two runs sharing a line ("UP TO" / "70% OFF"), or a button's label
 *  stacked on its own pill -- and that object moves as a unit, preserving
 *  the gap or overlap it already had. Separate objects (no vertical overlap
 *  between them) then each align independently against the SAME margin or
 *  centre line, the way PowerPoint's own "Align Left/Centre/Right" treats
 *  several selected shapes. This is what makes a whole hero's worth of
 *  separate lines -- a badge, a title, an offer row, a date line, a CTA --
 *  all land flush on one edge in a single click, without piling two layers
 *  that share a row on top of each other.
 *
 *  BLOCK (opt-in): the entire selection shifts by one shared amount instead,
 *  so nothing in it moves relative to anything else, full stop -- for the
 *  rarer case where even separate-looking rows are meant to keep whatever
 *  stagger they already have and only the selection's own outer edge should
 *  reach the margin.
 *
 *  Both AUTO-without-clustering and a flat "every layer independently" were
 *  tried before this and each broke a real composition (same-row layers
 *  overlapping, or a button's label pulling off-centre from its own pill) --
 *  clustering is what actually holds both cases at once.
 *
 *  One shared margin rather than a per-template one (there is no existing
 *  canvas-margin concept to read a narrower one from -- see `safe.ts`,
 *  which is about a photograph's own clear band, not the frame's edge). */
import { canvasZoom } from './Editable';
import { moveOf, type Edits } from './store';

export const ALIGN_MARGIN = 0.05; // 5% of the canvas width, each side
export type Align = 'left' | 'center' | 'right';

/** A text run's real ink extent, not its box -- except when the box has a
 *  background of its own, where the box IS the real extent.
 *
 *  Half this codebase's "left-aligned" copy (Bump's EXTRA/offer/code, among
 *  others) is actually a near-full-width box with `textAlign: 'right'` --
 *  measured straight, its left edge sits wherever the box happens to start,
 *  nowhere near the glyphs. "Align left" on it moved that mostly-empty box
 *  to the margin and left the visible word exactly where it was: the bug
 *  was moving the box, not the text. A Range over the element's own text
 *  node reports where the glyphs actually render -- respects text-align,
 *  and unions correctly over wrapped multi-line copy too.
 *
 *  But a CTA like Flash's "Shop Now" is ONE Editable that is both the text
 *  and its own orange pill (`background` set directly on it, centred with
 *  `display: grid`): the same Range measurement there reports only the
 *  glyphs, narrower than the pill on every side, and aligning it moved the
 *  WORD to the margin while the visible button -- the thing a designer
 *  actually means by "the CTA" -- kept going past the canvas edge. Whether
 *  a run has its own non-transparent background is what tells the two
 *  apart: plain copy never does, a drawn button always does, and nothing
 *  template-specific has to say which is which. */
function inkBox(el: Element): DOMRect {
  const ownBackground = el.classList.contains('ed')
    && /rgba?\(0, ?0, ?0, ?0\)|^transparent$/.test(getComputedStyle(el).backgroundColor) === false;
  if (el.classList.contains('ed') && !ownBackground && el.textContent?.trim()) {
    const range = document.createRange();
    range.selectNodeContents(el);
    const rects = [...range.getClientRects()];
    if (rects.length) {
      const left = Math.min(...rects.map(r => r.left)), right = Math.max(...rects.map(r => r.right));
      const top = Math.min(...rects.map(r => r.top)), bottom = Math.max(...rects.map(r => r.bottom));
      return new DOMRect(left, top, right - left, bottom - top);
    }
  }
  return el.getBoundingClientRect();
}

/** Every selected id's current horizontal edges, in the same authored
 *  (unzoomed) pixels `move.dx`/`move.dy` already live in -- read straight off
 *  the DOM rather than re-deriving a template's geometry, so it is right
 *  regardless of what rotation, nesting or prior nudge put the element where
 *  it now is. `null` when an id cannot be found or sits outside any `.sheet`
 *  (the one class every asset's own root carries -- see Compose.tsx/the
 *  template Social/Email files), so a stale id from a deleted layer cannot
 *  throw the whole alignment off. */
function edgesOf(id: string): { left: number; right: number; top: number; bottom: number;
                                 canvasWidth: number; canvas: Element } | null {
  const el = document.querySelector(`[data-id="${CSS.escape(id)}"]`);
  const canvas = el?.closest('.sheet');
  if (!el || !canvas) return null;
  const zoom = canvasZoom(el);
  const c = canvas.getBoundingClientRect();
  const b = inkBox(el);
  return { left: (b.left - c.left) / zoom, right: (b.right - c.left) / zoom,
           top: (b.top - c.top) / zoom, bottom: (b.bottom - c.top) / zoom,
           canvasWidth: c.width / zoom, canvas };
}

export type Edge = NonNullable<ReturnType<typeof edgesOf>>;

/** Union-find over vertical CENTRE proximity, not raw range overlap.
 *
 *  Range overlap looked right and was not: a display-sized "70% OFF" is tall
 *  enough that its ink box's own top edge reaches up past the title row
 *  sitting above it, on an asset where nothing about the visible layout
 *  actually overlaps -- two genuinely separate lines got merged into one
 *  cluster purely because one of them is set in a much bigger font than its
 *  neighbour, and the title only got part of the shift the rest of the
 *  selection did. Two elements sharing a LINE -- "UP TO" beside a much
 *  taller "70% OFF", a button's label centred on its own pill -- have
 *  vertical centres close together relative to how tall the smaller one is,
 *  even at wildly different font sizes; two separate lines do not, however
 *  far one of them bleeds into the other's space. Clusters still merge
 *  transitively (A with B, B with C -> all three move together). */
function clusters(edges: { id: string; box: Edge }[]): { id: string; box: Edge }[][] {
  const CENTER_FACTOR = 0.6; // of the shorter element's own height
  const parent = edges.map((_, i) => i);
  const find = (i: number): number => parent[i] === i ? i : (parent[i] = find(parent[i]));
  const union = (a: number, b: number) => { const ra = find(a), rb = find(b); if (ra !== rb) parent[ra] = rb; };
  const centerOf = (box: Edge) => (box.top + box.bottom) / 2;
  const heightOf = (box: Edge) => box.bottom - box.top;
  for (let i = 0; i < edges.length; i++)
    for (let j = i + 1; j < edges.length; j++) {
      const a = edges[i].box, b = edges[j].box;
      const distance = Math.abs(centerOf(a) - centerOf(b));
      const tolerance = Math.max(2, Math.min(heightOf(a), heightOf(b)) * CENTER_FACTOR);
      if (distance < tolerance) union(i, j);
    }
  const groups = new Map<number, { id: string; box: Edge }[]>();
  edges.forEach((e, i) => {
    const r = find(i);
    (groups.get(r) ?? groups.set(r, []).get(r)!).push(e);
  });
  return [...groups.values()];
}

/** Align `ids` left/centred/right. `block` forces the whole selection to
 *  move as one shared shift instead of clustering by row (see the module
 *  doc above); ids that cannot be measured (deleted, off-canvas) are
 *  skipped rather than failing the whole selection. */
export function alignGroup(ids: string[], align: Align, edits: Edits,
                            nudge: (id: string, dx: number, dy: number) => void,
                            block = false) {
  for (const { id, shift } of alignShifts(ids, align, block)) {
    const { dx, dy } = moveOf(edits, id);
    nudge(id, dx + shift, dy);
  }
}

/** What alignGroup would do, without doing it: each measurable id's current
 *  edges (authored px, relative to its canvas) and the horizontal shift that
 *  aligning would add -- so smart placement can try left, centre and right
 *  and only apply the one that frames the photo best. */
export function alignShifts(ids: string[], align: Align, block = false):
  { id: string; shift: number; box: Edge }[] {
  const out: { id: string; shift: number; box: Edge }[] = [];
  const all = ids.map(id => ({ id, box: edgesOf(id) }))
    .filter((e): e is { id: string; box: Edge } => e.box !== null);
  if (!all.length) return out;
  // Belt and braces alongside the same check at click-time (`pick` in
  // Editable.tsx): never align one element against another asset's canvas.
  // The first measured id's canvas is the group's.
  const canvas = all[0].box.canvas;
  const edges = all.filter(e => e.box.canvas === canvas);
  if (!edges.length) return out;

  // Every member shares one canvas in practice (one asset edited at a time);
  // the first one measured stands for the whole selection.
  const canvasWidth = edges[0].box.canvasWidth;
  const margin = canvasWidth * ALIGN_MARGIN;
  const target = (width: number) => align === 'left' ? margin
    : align === 'right' ? canvasWidth - margin - width
    : (canvasWidth - width) / 2;

  const groups = block ? [edges] : clusters(edges);
  for (const member of groups) {
    const left = Math.min(...member.map(m => m.box.left));
    const right = Math.max(...member.map(m => m.box.right));
    const shift = target(right - left) - left;
    for (const { id, box } of member) out.push({ id, shift, box });
  }
  return out;
}
