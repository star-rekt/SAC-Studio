/** Where type can sit on a photograph, and what that means for placement.
 *
 *  `zones.json` carries a hand-reviewed clear band for all 31 photographs --
 *  a normalised rect on the source image, with a note saying what the surface
 *  is. It has been in the repo the whole time and nothing read it: the
 *  composer placed copy at a fixed 5% from the left whatever was behind it,
 *  which is why a review of almost every hero came back failing the rule about
 *  copy relating to its subject.
 *
 *  The file is explicit that the rect is on the SOURCE image, so a crop that
 *  cuts the band out does not have it. That is why this reads the band as a
 *  SIDE rather than as exact coordinates: which third is clear survives an
 *  ordinary cover-crop, and a pixel rect does not.
 */
import type { Zone } from './compose';

export type Place = {
  at: 'left' | 'right' | 'centre';
  vert: 'top' | 'middle' | 'bottom';
  /** Whether white type will hold on this band.
   *
   *  Nineteen of the thirty-one clear bands are sky, and most of those are
   *  recorded as pale, cloudy or grey. White display type on a pale sky is
   *  the single most repeated contrast finding in the audit, and the surface
   *  note has said so all along -- nothing read it. */
  dark: boolean;
  /** How much of the frame the clear band covers, 0 to 1. Thin bands cannot
   *  hold a full lockup and the caller may choose to shrink or move it. */
  room: number;
  why: string;
};

const MIDDLE: Place =
  { at: 'left', vert: 'middle', room: 1, dark: false,
    why: 'no clear band recorded for this photograph' };

/** Whether the band is light enough that white type disappears into it. */
const PALE = /pale|cloudy|grey|gray|white|snow|soft|hazy|clean blue|sandstone|sand/i;
export const paleBand = (z?: Zone) => !!z?.surface && PALE.test(z.surface);

export function placeOn(z?: Zone): Place {
  const r = z?.rect;
  if (!r || r.length !== 4 || r[2] <= 0 || r[3] <= 0) return MIDDLE;
  const [x, y, w, h] = r;
  const cx = x + w / 2, cy = y + h / 2;

  // A band spanning the frame says nothing about left or right, so the
  // vertical position carries the decision.
  const at: Place['at'] = w >= 0.85 ? 'centre' : cx < 0.45 ? 'left' : cx > 0.55 ? 'right' : 'centre';
  const vert: Place['vert'] = h >= 0.85 ? 'middle' : cy < 0.4 ? 'top' : cy > 0.6 ? 'bottom' : 'middle';

  return { at, vert, room: w * h, dark: !paleBand(z),
    why: `the clear band on ${z!.id} is ${z!.band ?? 'unrecorded'}`
       + (z!.surface ? ` (${z!.surface})` : '') };
}

/** The band as the judge should be told about it: in the frame's own pixels,
 *  so a verdict on where the copy sits can be checked rather than estimated. */
export function safeBox(z: Zone | undefined, w: number, h: number) {
  const r = z?.rect;
  if (!r || r.length !== 4) return null;
  return { x: Math.round(r[0] * w), y: Math.round(r[1] * h),
           w: Math.round(r[2] * w), h: Math.round(r[3] * h) };
}
