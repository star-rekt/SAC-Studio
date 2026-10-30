import type { Nudge } from '../../../../../render/figma/FigmaLayers';

/** The fix loop's per-layer corrections to Figma's render (template lab):
 *  dx/dy px; for text ls (letter spacing px), fs (size factor), lh (line height px). */
export const NUDGE: Record<string, Nudge> = {
  "538:38115": {
    "dy": 1,
    "dx": -2,
    "ls": -0.5,
    "fs": 0.01,
    "lh": 2
  }
};
