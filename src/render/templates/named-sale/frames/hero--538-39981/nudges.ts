import type { Nudge } from '../../../../../render/figma/FigmaLayers';

/** The fix loop's per-layer corrections to Figma's render (template lab):
 *  dx/dy px; for text ls (letter spacing px), fs (size factor), lh (line height px). */
export const NUDGE: Record<string, Nudge> = {
  "538:39982": {
    "dy": -1
  },
  "538:39984": {
    "dy": -1
  },
  "538:39993": {
    "dy": 2,
    "dx": -2,
    "fs": 0.02
  },
  "538:39985": {
    "dy": -1,
    "dx": 2,
    "ls": 0.25
  }
};
