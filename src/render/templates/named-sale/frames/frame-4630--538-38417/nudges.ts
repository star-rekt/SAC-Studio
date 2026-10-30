import type { Nudge } from '../../../../../render/figma/FigmaLayers';

/** The fix loop's per-layer corrections to Figma's render (template lab):
 *  dx/dy px; for text ls (letter spacing px), fs (size factor), lh (line height px). */
export const NUDGE: Record<string, Nudge> = {
  "538:38422": {
    "ls": 0.5,
    "lh": -2
  },
  "538:38425": {
    "dy": 1
  }
};
