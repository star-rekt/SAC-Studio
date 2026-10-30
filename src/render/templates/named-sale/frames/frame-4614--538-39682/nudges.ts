import type { Nudge } from '../../../../../render/figma/FigmaLayers';

/** The fix loop's per-layer corrections to Figma's render (template lab):
 *  dx/dy px; for text ls (letter spacing px), fs (size factor), lh (line height px). */
export const NUDGE: Record<string, Nudge> = {
  "538:39694": {
    "dy": -1
  },
  "538:39697": {
    "dx": -1,
    "ls": 0.25
  },
  "I538:39690;21584:46496": {
    "dy": -1,
    "dx": -2,
    "ls": 0.5,
    "fs": 0.01
  },
  "538:39692": {
    "dy": -1
  },
  "538:39703": {
    "dy": -1
  }
};
