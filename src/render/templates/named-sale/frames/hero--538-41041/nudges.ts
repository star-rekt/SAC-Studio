import type { Nudge } from '../../../../../render/figma/FigmaLayers';

/** The fix loop's per-layer corrections to Figma's render (template lab):
 *  dx/dy px; for text ls (letter spacing px), fs (size factor), lh (line height px). */
export const NUDGE: Record<string, Nudge> = {
  "538:41046": {
    "dy": 2,
    "dx": 2,
    "ls": -0.5,
    "fs": 0.02
  },
  "538:41043": {
    "dy": 2,
    "dx": -2,
    "fs": 0.02
  },
  "538:41071": {
    "dy": -1
  },
  "538:41067": {
    "dy": -1
  },
  "538:41057": {
    "dy": -1
  },
  "538:41047": {
    "dy": -1
  }
};
