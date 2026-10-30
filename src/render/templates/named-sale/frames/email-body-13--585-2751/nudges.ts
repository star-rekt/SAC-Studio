import type { Nudge } from '../../../../../render/figma/FigmaLayers';

/** The fix loop's per-layer corrections to Figma's render (template lab):
 *  dx/dy px; for text ls (letter spacing px), fs (size factor), lh (line height px). */
export const NUDGE: Record<string, Nudge> = {
  "538:40436": {
    "dx": 4,
    "ls": 1,
    "fs": 0.04,
    "dy": 1
  },
  "538:40446": {
    "dy": 3,
    "ls": 0.25
  },
  "538:40512": {
    "dy": 4,
    "dx": 4,
    "ls": -1,
    "fs": 0.04
  },
  "538:40497": {
    "dy": 4,
    "dx": 4,
    "ls": -0.75,
    "fs": 0.04
  },
  "538:40520": {
    "dy": 4,
    "dx": 4,
    "ls": -0.75,
    "fs": 0.04
  },
  "538:40505": {
    "dy": 2,
    "dx": 2,
    "ls": -0.5,
    "fs": 0.02
  },
  "538:40490": {
    "dy": 4,
    "dx": 4,
    "ls": -0.75,
    "fs": 0.04
  },
  "538:40527": {
    "dy": 2,
    "dx": 2,
    "ls": -0.5,
    "fs": 0.02
  }
};
