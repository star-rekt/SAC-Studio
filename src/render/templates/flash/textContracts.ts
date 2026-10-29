/** How much text a given slot can actually hold, named once and shared.
 *
 *  Every template used to answer "how big should this text render" with its
 *  own hand-tuned `Math.min(cap, Math.floor(budget / (len * factor)))`, each
 *  with different magic numbers for the same shape of problem, and several
 *  slots had no answer at all -- a fixed font in a fixed box with no shrink
 *  and no clip, so a longer line than the one the board happened to show
 *  would just collide with whatever sat next to it. This is one registry of
 *  per-role contracts instead, so the same slot in Flash/Autumn/Bump looks
 *  up the same rule, and so the brief-reading prompt can tell Claude the
 *  budget *before* it writes a line, rather than us shrinking it after.
 */
import type { Contract } from '../../../model/textContracts';
import type { FigmaLayer } from '../../figma/layout';

export type Overflow = 'shrink' | 'wrap' | 'truncate' | 'suppress' | 'none';

export type TextContract = {
  /** A rough word budget -- the number told to Claude, not enforced here. */
  maxWords: number;
  /** The hard character cap this slot is designed around. */
  maxChars: number;
  wrap: 'nowrap' | 'wrap' | 'pre-line';
  onOverflow: Overflow;
  /** Shrink-to-fit knobs, only read when onOverflow === 'shrink'. Same shape
   *  as every template's own inline formula: fontSize = clamp(fontMin,
   *  fontMax, floor(widthBudget / (len * charFactor))). */
  fontMax?: number;
  fontMin?: number;
  widthBudget?: number;
  charFactor?: number;
};

/** Flash-only contracts, with the exact values Flash actually uses baked in directly.
 *  This is a fork of the shared contracts registry with only the roles Flash uses. */
export const CONTRACTS = {
  'hero.urgency': { maxWords: 3, maxChars: 20, wrap: 'nowrap', onOverflow: 'shrink',
    fontMax: 66, fontMin: 36, widthBudget: 420, charFactor: 0.52 },
  'hero.title': { maxWords: 3, maxChars: 22, wrap: 'nowrap', onOverflow: 'shrink',
    fontMax: 105, fontMin: 40, widthBudget: 760, charFactor: 0.65 },
  'hero.offer': { maxWords: 3, maxChars: 14, wrap: 'nowrap', onOverflow: 'shrink',
    fontMax: 186, fontMin: 72, widthBudget: 820, charFactor: 0.55 },
  // Contracts like every other run (it used to vanish past 42 characters).
  'hero.qualifier': { maxWords: 8, maxChars: 42, wrap: 'nowrap', onOverflow: 'shrink',
    fontMax: 57, fontMin: 40, widthBudget: 650, charFactor: 0.5 },
  'hero.dates': { maxWords: 4, maxChars: 20, wrap: 'nowrap', onOverflow: 'shrink',
    fontMax: 34, fontMin: 20, widthBudget: 400, charFactor: 0.5 },
  'hero.cta': { maxWords: 3, maxChars: 20, wrap: 'nowrap', onOverflow: 'shrink',
    fontMax: 54, fontMin: 28, widthBudget: 380, charFactor: 0.52 },
  'hero.code': { maxWords: 3, maxChars: 24, wrap: 'nowrap', onOverflow: 'shrink',
    fontMax: 48, fontMin: 26, widthBudget: 420, charFactor: 0.5 },

  'section.header': { maxWords: 4, maxChars: 26, wrap: 'nowrap', onOverflow: 'shrink',
    fontMax: 104, fontMin: 48, widthBudget: 1000, charFactor: 0.55 },
  'section.pillName': { maxWords: 3, maxChars: 20, wrap: 'nowrap', onOverflow: 'shrink',
    fontMax: 72, fontMin: 36, widthBudget: 620, charFactor: 0.52 },
  'section.tileName': { maxWords: 3, maxChars: 22, wrap: 'nowrap', onOverflow: 'shrink',
    fontMax: 58, fontMin: 28, widthBudget: 900, charFactor: 0.42 },
  'section.cta': { maxWords: 3, maxChars: 20, wrap: 'nowrap', onOverflow: 'shrink',
    fontMax: 64, fontMin: 32, widthBudget: 700, charFactor: 0.5 },

  'banner.message': { maxWords: 7, maxChars: 48, wrap: 'wrap', onOverflow: 'shrink',
    fontMax: 50, fontMin: 24, widthBudget: 1100, charFactor: 0.57 },
  'banner.details': { maxWords: 6, maxChars: 40, wrap: 'wrap', onOverflow: 'shrink',
    fontMax: 30, fontMin: 18, widthBudget: 900, charFactor: 0.5 },
  'banner.cta': { maxWords: 3, maxChars: 18, wrap: 'nowrap', onOverflow: 'shrink',
    fontMax: 50, fontMin: 28, widthBudget: 500, charFactor: 0.5 },

  'bar.message': { maxWords: 9, maxChars: 55, wrap: 'nowrap', onOverflow: 'shrink',
    fontMax: 48, fontMin: 22, widthBudget: 1250, charFactor: 0.51 },
} as const satisfies Record<string, TextContract>;

export type ContractRole = keyof typeof CONTRACTS;

/** The one place the shrink-to-fit arithmetic lives. Every template's old
 *  inline `Math.min(cap, Math.floor(budget/(len*k)))` is this, with its own
 *  constants -- same formula, now looked up instead of retyped. `widthBudget`
 *  can be overridden per call when a template's own box width is known and
 *  more exact than the contract's own calibrated default (e.g. a box whose
 *  width is the asset's own, not a constant). */
export function fitText(text: string, role: ContractRole,
  override?: { widthBudget?: number; charFactor?: number; fontMax?: number; fontMin?: number }): { text: string; fontSize?: number; contract?: Contract } {
  const c: TextContract = { ...CONTRACTS[role], ...override };
  // What Copy fit reads off the element: only a field that shrinks has a
  // budget to report against.
  const contract: Contract | undefined = c.onOverflow === 'shrink' && c.fontMax != null
    ? { key: role, budget: override?.widthBudget ?? c.widthBudget ?? 1000, designSize: c.fontMax,
        minSize: c.fontMin ?? c.fontMax, charFactor: c.charFactor ?? 0.58 } : undefined;
  const over = text.length > c.maxChars;
  if (c.onOverflow === 'suppress') return over ? { text: '' } : { text, fontSize: c.fontMax };
  if (c.onOverflow === 'truncate' && over)
    return { text: text.slice(0, Math.max(0, c.maxChars - 1)).trimEnd() + '…', fontSize: c.fontMax };
  if (c.onOverflow === 'shrink' && c.fontMax != null) {
    const widthBudget = override?.widthBudget ?? c.widthBudget ?? 1000;
    const fontSize = Math.round(Math.max(c.fontMin ?? c.fontMax, Math.min(c.fontMax,
      widthBudget / (Math.max(1, text.length) * (c.charFactor ?? 0.58)))));
    return { text, fontSize, contract };
  }
  return { text, fontSize: c.fontMax, contract };
}

/** A run's contract straight from its board layer (a compiled Figma text
 *  layer): designed at the board's size, with the board text's own width as
 *  its room and the board text's own average character width. The board's
 *  copy is then exactly the ideal count -- "3 DAYS ONLY" is 11 on every send
 *  of that design -- and longer copy contracts, the same rule on every run.
 *  `room` widens the space where the board text doesn't fill its slot (a
 *  category label before its arrow). */
export function boardFit(text: string, role: ContractRole, layer: FigmaLayer, room = layer.w) {
  const t = layer.text!;
  const chars = Math.max(1, ...t.chars.split(/[\n\u2028]/).map(l => l.trimEnd().length));
  return fitText(text, role, { fontMax: t.size, widthBudget: room, charFactor: layer.w / (chars * t.size) });
}

/** The actual rendered width of a line, not a guessed length*factor formula
 *  -- a character-count estimate calibrated against one or two example
 *  strings quietly stops working the moment a brief's real text has a
 *  different mix of wide/narrow characters than the examples did. Canvas
 *  measurement is exact for whatever the brief actually says, every time. */
let _measureCanvas: HTMLCanvasElement | null = null;
export function measureTextWidth(text: string, font: string, letterSpacing = 0): number {
  // The board-check scripts render every template through React's
  // server-side renderer, where there is no canvas (no DOM at all) -- fall
  // back to a rough character-count estimate rather than throwing. It only
  // has to be good enough to not crash the check; the browser always has a
  // real canvas, so the studio itself never takes this branch.
  if (typeof document === 'undefined') {
    const sizeMatch = font.match(/(\d+(?:\.\d+)?)px/);
    const fontSize = sizeMatch ? Number(sizeMatch[1]) : 16;
    return text.length * fontSize * .55 + Math.max(0, text.length - 1) * letterSpacing;
  }
  _measureCanvas ??= document.createElement('canvas');
  const ctx = _measureCanvas.getContext('2d')!;
  ctx.font = font;
  return ctx.measureText(text).width + Math.max(0, text.length - 1) * letterSpacing;
}

/** Whether a string is plausibly a short name/headline, not a paragraph of
 *  instructions wearing the same field. A brief in the numbered "Section 1 -
 *  Hero / Design: <sentence>" format puts a whole creative-direction
 *  paragraph in the same field a compact-checklist brief puts the three-word
 *  sale name in ("Design: Snowy landscape photography with the lockup on a
 *  clean ground..." vs "- Spring Flash Sale") -- a title contract's own
 *  maxWords/maxChars is calibrated for shrink-to-fit sizing, not for telling
 *  these apart, so this is deliberately far more permissive: anything within
 *  roughly double a title's own budget is still printed (and shrunk to fit);
 *  only something that is unmistakably prose gets rejected, in favour of
 *  falling through to the campaign's own name instead of printing an
 *  instruction meant for a designer, not a reader. */
export function looksLikeAName(text: string, role: ContractRole = 'hero.title'): boolean {
  const c = CONTRACTS[role];
  const trimmed = text.trim();
  const words = trimmed.split(/\s+/).filter(Boolean);
  // Sentence punctuation is the stronger signal: a real sale name is a noun
  // phrase with none of it ("First Chair Flash Sale"), while even a SHORT
  // design instruction reads as a sentence or two ("Text based only, no
  // photography. Format per this example." is only 9 words -- short enough
  // to pass a word-count check alone, but the comma and two periods give it
  // away). A trailing "!"/"?" on an actual short name is allowed through.
  const sentenceLike = /[.,;:](?!\s*$)/.test(trimmed) || (trimmed.match(/[.!?]/g)?.length ?? 0) > 1;
  return words.length > 0 && words.length <= c.maxWords * 3 && trimmed.length <= c.maxChars * 3
    && !sentenceLike;
}

/** Solves for the exact font size that fits `text` in `widthBudget`, by
 *  measuring the real rendered width at a reference size and scaling --
 *  rather than guessing a `charFactor` per font/weight combination, which
 *  (confirmed live: "WOMEN'S INSULATED JACKETS" still ran past its frame
 *  at a charFactor calibrated against shorter names in the same font) only
 *  ever matches the strings it happened to be checked against. Use this
 *  over `fitText`'s charFactor estimate wherever getting it right matters
 *  more than avoiding a canvas measurement. */
export function measureAndFit(text: string, font: { family: string; weight?: number | string },
  limits: { widthBudget: number; fontMax: number; fontMin?: number }): number {
  const REF = 100;
  const widthAtRef = measureTextWidth(text, `${font.weight ?? 400} ${REF}px ${font.family}`);
  if (widthAtRef <= 0) return limits.fontMax;
  const fontSize = REF * (limits.widthBudget / widthAtRef);
  return Math.round(Math.max(limits.fontMin ?? limits.fontMax * .3, Math.min(limits.fontMax, fontSize)));
}

/** One line per role, fed into the brief-reading prompt so Claude writes
 *  within the budget instead of us shrinking an overlong line afterward.
 *  Only the roles actually in play for a template need to be listed --
 *  callers pass the subset relevant to the campaign type. */
export function contractBrief(roles: ContractRole[]): string {
  return roles.map(role => {
    const c = CONTRACTS[role];
    return `- ${role}: at most ${c.maxWords} words (~${c.maxChars} characters), ` +
      (c.wrap === 'nowrap' ? 'must fit on one line' : 'may wrap to a second line');
  }).join('\n');
}