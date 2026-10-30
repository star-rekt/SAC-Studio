import type { Nudge } from '../../../../../render/figma/FigmaLayers';

/** The fix loop's per-layer corrections to Figma's render (template lab):
 *  dx/dy px; for text ls (letter spacing px), fs (size factor), lh (line height px). */
export const NUDGE: Record<string, Nudge> = {
  "538:39427": {
    "dy": 2
  },
  "538:39411": {
    "dy": -1
  },
  "538:39412": {
    "dy": -2,
    "dx": -1,
    "ls": 0.25,
    "lh": -1
  },
  "I538:39426;21584:46496": {
    "dx": 1,
    "fs": -0.01
  }
};
