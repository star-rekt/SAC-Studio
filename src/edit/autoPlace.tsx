/** Smart placement: put a lockup's copy block on the side of the photo with
 *  room for it, then zoom and pan the photo so its subject stays clear of it.
 *
 *  The copy block is whatever a lockup wraps in <CopyBlock> -- ticket, offer,
 *  code, divider, CTA; never the marquee or the brand strip. It moves as ONE
 *  translate on that wrapper, so every gap inside it is kept exactly. A
 *  lockup designed centred (`fixed`, or whose block sits within 5% of the
 *  canvas centre at its template position) never moves; only its photo is
 *  framed around it.
 *
 *  Every rect is read off the DOM, so rotation, nesting and each template's
 *  own frame scale need no per-template geometry. A rotated card is taken by
 *  its bounding box, which only ever errs towards more clearance. */
import type { ReactNode } from 'react';
import { moveOf, sizeOf, type Api, type Edits } from './store';
import { alignShifts, type Align } from './align';
import { canvasZoom } from './Editable';
import { analysisFor } from '../model/analysePhoto';
import { composeCard, cardOptions, safeBand, isCentred, shapeCells, intersect, PLACEMENT_VERSION, type Rect, type CopyOption, type Composition } from '../model/autoFrame';

const CLEARANCE = 0.02; // of the photo box width, around the copy block
const MIN_CARD = 0.7; // the smallest a card may shrink to

/** Wraps a lockup's copy block. Zero-size and at the frame's origin, so
 *  children keep the exact absolute positions they had, and clicks still
 *  land on them rather than on a box spread over the photo. Its move and
 *  size edits translate and scale the whole block as one, about that origin. */
export function CopyBlock({ id, fixed, edits, children }: {
  id: string; fixed?: boolean; edits: Edits; children: ReactNode;
}) {
  const { dx, dy } = moveOf(edits, id), s = sizeOf(edits, id);
  return <div data-copy={fixed ? 'fixed' : ''} data-copy-id={id}
    style={{ position: 'absolute', left: 0, top: 0, width: 0, height: 0, transformOrigin: '0 0',
             transform: dx || dy || s !== 1 ? `translate(${dx}px, ${dy}px) scale(${s})` : undefined }}>{children}</div>;
}

/** A short stand-in for a src in saved edits -- an upload's src is a
 *  multi-megabyte data URL, which has no business being stored twice. */
export const srcKey = (src: string) => src.length > 200 ? `${src.length}:${src.slice(-48)}` : src;

const copyOf = (box: Element) =>
  box.closest('.sheet')?.querySelector<HTMLElement>('[data-copy-id]') ?? null;

/** Every id smart placement may have moved for the sheet a photo sits on
 *  (the block wrapper and each run inside it), so resetting an auto-placed
 *  photo can put its copy back -- moves only, never the text itself. */
export const copyIdsFor = (picId: string) => {
  const copy = copyOf(document.querySelector(`[data-id="${CSS.escape(picId)}"]`) ?? document.body);
  return copy ? [copy.dataset.copyId!, ...[...copy.querySelectorAll<HTMLElement>('[data-id]')].map(e => e.dataset.id!)] : [];
};

/** An element's clip-path outline, when it is clipped to a path (in its own px). */
const pathOf = (el: HTMLElement) => el.style.clipPath.match(/^path\("(.+)"\)$/)?.[1];

let hitCanvas: CanvasRenderingContext2D | null = null;
/** Whether a point (the path's own px) is inside an SVG path. */
const hitTest = (path: string) => {
  hitCanvas ??= document.createElement('canvas').getContext('2d');
  const p = new Path2D(path);
  return (x: number, y: number) => hitCanvas!.isPointInPath(p, x, y);
};

/** A shaped photo slot (`<Picture slot>`, Bump 2's windows, collage and
 *  banners) is framed within itself, not the sheet:
 *  - the part its clip outline hides is off limits, so a face lands where
 *    it can be seen, not under the copy's cut-out;
 *  - whatever covers the whole slot (its own outline mark) isn't an obstacle;
 *  - the free band is the slot itself, so composition (headroom, thirds) is
 *    judged in the slot -- not against a page several thousand px tall. */
function slotLimits(box: HTMLElement, obstacles: Rect[]) {
  const own: Rect = { x: 0, y: 0, w: box.clientWidth, h: box.clientHeight };
  const area = own.w * own.h;
  const kept = obstacles.filter(o => { const a = intersect(o, own); return a > 0 && a < area * 0.6; });
  const path = pathOf(box);
  const hidden = path ? shapeCells(own.w, own.h, hitTest(path), true) : [];
  return { band: own, obstacles: [...kept, ...hidden] };
}

const unionOf = (rects: DOMRect[]) => {
  const left = Math.min(...rects.map(r => r.left)), top = Math.min(...rects.map(r => r.top));
  return { left, top, right: Math.max(...rects.map(r => r.right)), bottom: Math.max(...rects.map(r => r.bottom)) };
};

/** A fingerprint of the copy's position and size edits, so follow mode can
 *  tell a designer's own move of the copy (which ends following) from the
 *  moves smart placement made itself. */
const sigOf = (moves: Record<string, { dx: number; dy: number }>, sizes: Record<string, number>, ids: string[]) =>
  ids.map(i => `${Math.round(moves[i]?.dx ?? 0)},${Math.round(moves[i]?.dy ?? 0)},${Math.round((sizes[i] ?? 1) * 100)}`).join('|');

/** Places a photo's copy and crop by design rules (composeCard). With
 *  `fixed` -- the designer's own crop, while following -- only the copy is
 *  placed around it and the photo is left exactly as it is. */
export async function autoPlace({ id, box, natural, initialScale, src, api, fixed }: {
  id: string; box: HTMLElement; natural: { w: number; h: number };
  initialScale: number; src: string; api: Api; fixed?: { x: number; y: number; scale: number };
}): Promise<Composition | null> {
  const analysis = await analysisFor(src);
  if (!analysis || !box.isConnected) return null;
  const b = box.getBoundingClientRect();
  const k = box.clientWidth / b.width; // screen px -> the photo box's own px
  const pad = box.clientWidth * CLEARANCE;
  const toBox = (left: number, top: number, w: number, h: number, by = pad): Rect =>
    ({ x: (left - b.left) * k - by, y: (top - b.top) * k - by, w: w * k + 2 * by, h: h * k + 2 * by });
  const sheetEl = box.closest('.sheet');
  const sheet = sheetEl?.getBoundingClientRect();
  if (!sheetEl || !sheet) return null;
  const copy = copyOf(box);
  const around = [...sheetEl.querySelectorAll<HTMLElement>('[data-id], [data-keepout]')]
    .filter(e => e !== sheetEl && !copy?.contains(e) && e !== box && !box.contains(e) && !e.contains(box))
    .map(e => e.getBoundingClientRect())
    .filter(r => r.width && r.height && r.width * r.height < sheet.width * sheet.height * 0.5)
    .map(r => toBox(r.left, r.top, r.width, r.height));
  const { band, obstacles } = box.hasAttribute('data-slot')
    ? slotLimits(box, around)
    : { band: safeBand(toBox(sheet.left, sheet.top, sheet.width, sheet.height, 0), around), obstacles: around };
  const base = { natural, box: { w: box.clientWidth, h: box.clientHeight }, initialScale,
    regions: analysis.regions, people: analysis.people, band, obstacles, fixed };
  const parts = copy ? [...copy.querySelectorAll('[data-id]')].map(e => e.getBoundingClientRect())
    .filter(r => r.width && r.height) : [];
  const ids = copy ? [copy.dataset.copyId!, ...[...copy.querySelectorAll<HTMLElement>('[data-id]')].map(e => e.dataset.id!)] : [];
  // Follow mode stops the moment the designer has moved the copy by hand.
  const p = api.edits.pic[id];
  if (fixed && p?.autoSig !== undefined && sigOf(api.edits.move, api.edits.size, ids) !== p.autoSig) {
    api.setPic(id, { follow: false });
    return null;
  }

  type Placed = CopyOption & { apply: () => Record<string, { dx: number; dy: number; s?: number }> };
  let options: Placed[] = [{ id: 'none', rank: 0, size: 1, rects: [], apply: () => ({}) }];
  if (copy && parts.length) {
    const copyId = copy.dataset.copyId!;
    const now = unionOf(parts);
    // A ticket card (one part covering most of the block) moves and scales as
    // one. Free-standing copy (a hero lockup) is aligned line by line with the
    // align panel's own AUTO mode instead.
    const blockArea = (now.right - now.left) * (now.bottom - now.top);
    const carded = parts.some(r => r.width * r.height >= blockArea * 0.6);
    if (carded) {
      const parent = copy.parentElement!;
      const pr = parent.getBoundingClientRect();
      const per = pr.width / (parent.clientWidth || 1); // screen px per wrapper px
      const moved = moveOf(api.edits, copyId), was = sizeOf(api.edits, copyId);
      // The card as designed, in wrapper px: undo the current translate+scale.
      const local = (sx: number, sy: number) => [(sx - pr.left) / per, (sy - pr.top) / per];
      const [nl, nt] = local(now.left, now.top), [nr, nb] = local(now.right, now.bottom);
      const home = { l: (nl - moved.dx) / was, t: (nt - moved.dy) / was, r: (nr - moved.dx) / was, b: (nb - moved.dy) / was };
      const inBox = (lx: number, ly: number) => ({ x: (pr.left + lx * per - b.left) * k, y: (pr.top + ly * per - b.top) * k });
      const h0 = inBox(home.l, home.t), h1 = inBox(home.r, home.b);
      const card = { w: h1.x - h0.x + 2 * pad, h: h1.y - h0.y + 2 * pad, cx: (h0.x + h1.x) / 2, cy: (h0.y + h1.y) / 2 };
      const hc = [(home.l + home.r) / 2, (home.t + home.b) / 2];
      const slots = copy.dataset.copy === 'fixed'
        ? [{ id: 'designed', rank: 0, size: 1, rects: [{ x: card.cx - card.w / 2, y: card.cy - card.h / 2, w: card.w, h: card.h }],
             card: { cx: card.cx, cy: card.cy } }]
        : cardOptions(card, band, obstacles, analysis.copySide, MIN_CARD);
      // translate(t) scale(s) about the wrapper's origin: the designed centre
      // hc lands on the target when t = target - s * hc.
      options = slots.map(o => ({ ...o, apply: () => {
        const target = local(o.card!.cx / k + b.left, o.card!.cy / k + b.top);
        return { [copyId]: { dx: target[0] - o.size * hc[0], dy: target[1] - o.size * hc[1], s: o.size } };
      } }));
    } else {
      const lines = ids.slice(1);
      const zoom = canvasZoom(box);
      const centred = copy.dataset.copy === 'fixed' || isCentred(now.left, now.right, sheet.left, sheet.width);
      const option = (side: Align | null, rank: number): Placed => {
        const plan = side ? alignShifts(lines, side) : alignShifts(lines, 'left').map(q => ({ ...q, shift: 0 }));
        return { id: side ?? 'as-is', rank, size: 1,
          rects: plan.map(({ box: e, shift }) => toBox(sheet.left + (e.left + shift) * zoom,
            sheet.top + e.top * zoom, (e.right - e.left) * zoom, (e.bottom - e.top) * zoom)),
          apply: () => Object.fromEntries(plan.map(({ id: line, shift }) => {
            const m = moveOf(api.edits, line);
            return [line, { dx: m.dx + shift, dy: m.dy }];
          })) };
      };
      const sides: Align[] = analysis.copySide === 'left' ? ['left', 'center', 'right'] : ['right', 'center', 'left'];
      options = [option(null, 0), ...centred ? [] : sides.map((side, i) => option(side, i + 1))];
    }
  }

  const comp = composeCard({ ...base, options });
  if (!comp) return null;
  const changes = (comp.option as Placed).apply();
  const moves = { ...api.edits.move }, sizes = { ...api.edits.size };
  for (const [key, v] of Object.entries(changes)) {
    api.nudge(key, v.dx, v.dy); moves[key] = { dx: v.dx, dy: v.dy };
    if (v.s !== undefined) { api.resize(key, v.s); sizes[key] = v.s; }
  }
  api.setPic(id, { ...(fixed ? {} : { x: comp.frame.x, y: comp.frame.y, scale: comp.frame.scale, auto: true }),
    autoFor: srcKey(src), autoV: PLACEMENT_VERSION, autoClean: comp.tier === 0, autoTough: comp.tough, follow: p?.follow ?? true,
    autoSig: sigOf(moves, sizes, ids) });
  return comp;
}
