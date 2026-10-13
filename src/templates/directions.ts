/** Three design directions per campaign, for email and for social.
 *
 *  A single render is a single answer, and the next run is not guaranteed to
 *  produce a different one -- so if a designer wants a choice, the choice has
 *  to be built, not re-rolled.
 *
 *  These three are fixed, not sampled. The same three every time, on every
 *  campaign: a direction you liked yesterday is still there today, and the one
 *  you did not does not come back wearing a different number. That also makes
 *  them discussable -- 'use Squared' means something across campaigns, which
 *  'use variant 2 of this run' never could.
 *
 *  They vary on things the plugin varied -- the accent, the corner, the
 *  photograph -- plus the shape of the lockup, which is the knob that actually
 *  changes how an asset reads. What they do not vary is the copy, the offer or
 *  the brand, because those are the campaign and not a design choice.
 */
import { BRAND } from '../model/compose';

export type Shape =
  /** Rounded tag with a punched hole: the published lockup. */
  | 'tag'
  /** Square-cut panel, no hole. Reads flatter and more editorial. */
  | 'panel'
  /** Tag with its lower corner cut away, so the photograph comes through it. */
  | 'notch';

export type Direction = {
  id: 'a' | 'b' | 'c';
  name: string;
  /** The lockup's fill. */
  accent: string;
  /** Corner radius in px at 1200 wide. Zero is a square cut. */
  radius: number;
  shape: Shape;
  /** Degrees of tilt on the lockup. The boards tilt slightly; flat is a choice. */
  tilt: number;
  /** How far to rotate into the photograph pool, so the three do not share a
   *  picture. */
  photo: number;
  why: string;
};

/** The three, in a fixed order, from the campaign's accent.
 *
 *  A is what the board publishes, so a campaign opened and never touched looks
 *  like the reference. B and C are departures a designer can defend, not
 *  randomness: one flatter and squarer, one cut so the photograph reads
 *  through the lockup.
 */
export function directionsFor(accent: string): Direction[] {
  return [
    { id: 'a', name: 'As published', accent, radius: 26, shape: 'tag', tilt: -2.2, photo: 0,
      why: 'the reference board’s original shape, palette and crop' },
    { id: 'b', name: 'Squared', accent: BRAND.ink, radius: 0, shape: 'panel', tilt: 0, photo: 1,
      why: 'square corners and a quieter ink accent; stepped social crop becomes a panel' },
    { id: 'c', name: 'Cut through', accent, radius: 26, shape: 'notch', tilt: -2.2, photo: 2,
      why: 'a cut corner and alternate stepped social crop, retaining the board accent' },
  ];
}

export const DIRECTION_IDS = ['a', 'b', 'c'] as const;
export type DirectionId = typeof DIRECTION_IDS[number];

/** Which family a format's direction is chosen for. Email and social are
 *  chosen apart because they are reviewed apart and by different people. */
export const familyOf = (format: string): 'email' | 'social' | null =>
  /^email-/.test(format) ? 'email'
  : /^paid-social-/.test(format) ? 'social'
  : null;
