import type { Nudge } from '../../../../../render/figma/FigmaLayers';

/** The fix loop's per-layer corrections to Figma's render (template lab):
 *  dx/dy px; for text ls (letter spacing px), fs (size factor), lh (line height px). */
export const NUDGE: Record<string, Nudge> = {
  "538:39998": {
    "dy": 1
  },
  "538:40063": {
    "dy": 4,
    "dx": 12,
    "ls": -2.25,
    "fs": 0.12
  },
  "538:40088": {
    "dy": 4,
    "dx": 12,
    "ls": -3,
    "fs": 0.12
  },
  "538:40077": {
    "dy": 4,
    "dx": 12,
    "ls": -2.75,
    "fs": 0.12
  },
  "538:40018": {
    "dy": 1,
    "dx": -1
  },
  "538:40084": {
    "dx": -1
  }
};
