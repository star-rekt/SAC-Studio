import type { Nudge } from '../../../../../render/figma/FigmaLayers';

/** The fix loop's per-layer corrections to Figma's render (template lab):
 *  dx/dy px; for text ls (letter spacing px), fs (size factor), lh (line height px). */
export const NUDGE: Record<string, Nudge> = {
  "I538:37793;21584:46496": {
    "dy": -1,
    "dx": -1
  },
  "538:37785": {
    "dy": 1
  }
};
