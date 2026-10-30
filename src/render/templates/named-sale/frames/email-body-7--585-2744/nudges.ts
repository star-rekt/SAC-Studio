import type { Nudge } from '../../../../../render/figma/FigmaLayers';

/** The fix loop's per-layer corrections to Figma's render (template lab):
 *  dx/dy px; for text ls (letter spacing px), fs (size factor), lh (line height px). */
export const NUDGE: Record<string, Nudge> = {
  "538:38889": {
    "dy": 1,
    "dx": -2
  },
  "538:38883": {
    "dy": 1,
    "dx": 2,
    "ls": -0.5,
    "fs": -0.02
  },
  "538:38958": {
    "dy": 2,
    "dx": 2,
    "ls": -0.5,
    "fs": 0.02
  },
  "538:38943": {
    "dy": 2,
    "dx": 2,
    "ls": -0.5,
    "fs": 0.02
  },
  "538:38936": {
    "dy": 2,
    "dx": 2,
    "ls": -0.5,
    "fs": 0.02
  },
  "538:38951": {
    "dy": 2,
    "dx": 2,
    "ls": -0.5,
    "fs": 0.02
  },
  "538:38966": {
    "dy": 2,
    "dx": 2,
    "ls": -0.5,
    "fs": 0.02
  }
};
