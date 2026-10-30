import type { Nudge } from '../../../../../render/figma/FigmaLayers';

/** The fix loop's per-layer corrections to Figma's render (template lab):
 *  dx/dy px; for text ls (letter spacing px), fs (size factor), lh (line height px). */
export const NUDGE: Record<string, Nudge> = {
  "538:38039": {
    "dy": 2,
    "dx": 2,
    "ls": -0.5,
    "fs": 0.02
  },
  "538:38044": {
    "dx": -1
  },
  "538:38045": {
    "dy": -1
  },
  "I538:38053;21584:46496": {
    "dy": -1
  },
  "538:38038": {
    "dy": -1
  },
  "538:38043": {
    "dy": 1,
    "ls": -0.25
  }
};
