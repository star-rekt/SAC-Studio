import type { Nudge } from '../../../../../render/figma/FigmaLayers';

/** The fix loop's per-layer corrections to Figma's render (template lab):
 *  dx/dy px; for text ls (letter spacing px), fs (size factor), lh (line height px). */
export const NUDGE: Record<string, Nudge> = {
  "538:41053": {
    "dy": -2
  },
  "538:41046": {
    "dy": 6,
    "dx": 12,
    "ls": -3,
    "fs": 0.11
  }
};
