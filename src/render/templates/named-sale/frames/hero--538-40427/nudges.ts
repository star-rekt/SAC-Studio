import type { Nudge } from '../../../../../render/figma/FigmaLayers';

/** The fix loop's per-layer corrections to Figma's render (template lab):
 *  dx/dy px; for text ls (letter spacing px), fs (size factor), lh (line height px). */
export const NUDGE: Record<string, Nudge> = {
  "538:40436": {
    "dy": 1,
    "dx": 4,
    "ls": 1,
    "fs": 0.04
  },
  "538:40437": {
    "dy": 2
  },
  "538:40440": {
    "dy": -1
  },
  "538:40441": {
    "dy": -1
  },
  "538:40442": {
    "dy": -1
  }
};
