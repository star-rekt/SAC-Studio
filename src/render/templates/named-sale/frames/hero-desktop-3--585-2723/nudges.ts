import type { Nudge } from '../../../../../render/figma/FigmaLayers';

/** The fix loop's per-layer corrections to Figma's render (template lab):
 *  dx/dy px; for text ls (letter spacing px), fs (size factor), lh (line height px). */
export const NUDGE: Record<string, Nudge> = {
  "538:37604": {
    "dx": 4,
    "ls": 1.25,
    "fs": 0.04,
    "dy": 2
  },
  "538:37602": {
    "dx": -1,
    "ls": 0.25
  },
  "538:37607": {
    "dy": 1,
    "dx": -1
  }
};
