/** Shared text-fitting for every template (Flash and Bump both call this --
 *  one engine, not two). A contract never moves a field's own position: it
 *  only decides the font size that lets real brief text fit inside a box
 *  whose left/top the template itself fixed.
 *
 *  `fitText` is the cheap default: a character-count heuristic
 *  (`budget / (len * charFactor)`), the same formula every call site used
 *  inline before this was centralized -- good enough for most fields, and
 *  near-instant since it never touches the DOM or a canvas.
 *
 *  `measureAndFit` is for the few fields where that heuristic isn't
 *  accurate enough (a field that applies `text-transform: uppercase`, say,
 *  whose rendered glyphs are measurably wider than the source string) --
 *  it measures the real string against the real font via a canvas 2D
 *  context instead of guessing from character count. */
// The extension: the dev server runs this file in Node, which needs it.
import { stack } from '../fonts.ts';

const DEFAULT_FONT_MAX = 60, DEFAULT_FONT_MIN = 14, DEFAULT_CHAR_FACTOR = 0.55;

/** What a contracted field promises, carried onto its element (`data-fit`)
 *  so Copy fit (src/model/copyFit.ts) can say how much text it holds before
 *  it shrinks or wraps: `budget` px wide, `designSize` the size it is drawn
 *  at when the text fits, never below `minSize`. `charFactor` is the
 *  heuristic's average glyph width; `font` instead means the field is
 *  measured for real (measureAndFit). */
export type Contract = { key: string; budget: number; designSize: number; minSize: number;
  charFactor?: number; font?: { family: string; weight: number } };

/** The attribute that carries a contract, for a plain element (a row of
 *  spans) the fitted size is applied to; an <Editable> takes `fit` instead. */
export const fitAttr = (contract: Contract) => ({ 'data-fit': JSON.stringify(contract) });

export type FitOpts = {
  /** Available width, in px, the fitted text must stay inside. */
  widthBudget: number;
  fontMax?: number;
  fontMin?: number;
  /** Average glyph width as a fraction of font-size, tuned per field when
   *  the default doesn't match that font/weight's real proportions. */
  charFactor?: number;
};

/** `key` identifies the field role (e.g. 'hero.urgency') -- not consulted
 *  by the formula itself, but kept so a future brief-prompt generator (see
 *  the text-contracts plan) can enumerate every field a template actually
 *  uses without re-deriving the list by hand. */
export function fitText(text: string, key: string, opts: FitOpts): { fontSize: number; contract: Contract } {
  const { widthBudget, fontMax = DEFAULT_FONT_MAX, fontMin = DEFAULT_FONT_MIN,
    charFactor = DEFAULT_CHAR_FACTOR } = opts;
  const len = Math.max(text.length, 1);
  // Text that fits is set at the design size exactly -- rounding down here
  // drew a 38.93px board size at 38. Only a size that shrinks is rounded.
  const fits = widthBudget / (len * charFactor);
  const fontSize = fits >= fontMax ? fontMax : Math.max(fontMin, Math.floor(fits));
  return { fontSize, contract: { key, budget: widthBudget, designSize: fontMax, minSize: fontMin, charFactor } };
}

/** A run's contract straight from its compiled Figma text layer: designed at
 *  the board's size, the board text's own width as its room -- so the
 *  board's copy is set at exactly the board's size and wider copy contracts,
 *  down to 40% of it, rather than run into what's next to it. A fixed-width
 *  board box holds what fits it at the font's usual width. `room` widens the
 *  space where the board text doesn't fill its slot. Flash has the same rule
 *  over its own role registry (flash/textContracts.ts).
 *
 *  Width is measured, not counted: "CODE SPOOKY20" has the board's 13
 *  characters but is far wider than "CODE CHILLY20" (O, K, P against I, L).
 *  The new text is measured against the board's own line in the same face,
 *  and that ratio scales the board's width -- right even before the brand
 *  face has loaded, when both are measured in its fallback. The contract's
 *  character width is the one that gives this text this size, so the copy
 *  panel agrees with the render. */
export function boardFit(text: string, key: string,
  layer: { w: number; text?: { chars: string; size: number; resize?: string; family?: string; weight?: number } },
  room = layer.w) {
  // A two-line board run ("EXTRA⏎20% OFF") is sized by its longest line.
  const t = layer.text!, longest = t.chars.split(/[\n\u2028]/).map(l => l.trimEnd())
    .reduce((a, b) => b.length > a.length ? b : a, '');
  const chars = Math.max(1, longest.length);
  // A fixed-width board box is wider than its text: the box is the room, the
  // character width the font's usual one rather than one read off the box.
  const fixed = t.resize !== undefined && t.resize !== 'WIDTH_AND_HEIGHT';
  const factor = fixed ? DEFAULT_CHAR_FACTOR : layer.w / (chars * t.size);
  const ratio = t.family && t.weight ? widthRatio(text, longest, `${t.weight} ${t.size}px ${stack(t.family)}`) : undefined;
  // A hair of room so the board's own copy lands on the board's size: fitText
  // rounds down, and 25 can come out of the division as 24.999...
  return fitText(text, key, { widthBudget: room + 0.01, fontMax: t.size, fontMin: Math.round(t.size * 0.4),
    charFactor: ratio ? factor * ratio * chars / Math.max(text.length, 1) : factor });
}

/** How much wider `text` is than `board` in one face, or undefined with no
 *  document to measure in (a server render keeps the character count). */
function widthRatio(text: string, board: string, font: string) {
  if (typeof document === 'undefined' || !board.trim() || text === board) return undefined;
  measureCanvas ??= document.createElement('canvas');
  const ctx = measureCanvas.getContext('2d')!;
  ctx.font = font;
  const b = ctx.measureText(board).width;
  return b > 0 ? ctx.measureText(text).width / b : undefined;
}

/** measureAndFit's contract, for the field it sizes. */
export const measuredContract = (key: string, font: { family: string; weight: number },
  opts: { widthBudget: number; fontMax?: number; fontMin?: number }): Contract =>
  ({ key, budget: opts.widthBudget, designSize: opts.fontMax ?? DEFAULT_FONT_MAX,
     minSize: opts.fontMin ?? DEFAULT_FONT_MIN, font });

let measureCanvas: HTMLCanvasElement | null = null;

/** Real canvas-measured fit, for fields where the character-count heuristic
 *  understates the rendered width (confirmed case: a field whose own CSS
 *  applies `text-transform: uppercase`, whose capital glyphs are wider than
 *  the mixed-case source string `fitText` would otherwise measure). */
export function measureAndFit(text: string, font: { family: string; weight: number },
  opts: { widthBudget: number; fontMax?: number; fontMin?: number }): number {
  const { widthBudget, fontMax = DEFAULT_FONT_MAX, fontMin = DEFAULT_FONT_MIN } = opts;
  if (typeof document === 'undefined') return fitText(text, 'measureAndFit', opts).fontSize;
  measureCanvas ??= document.createElement('canvas');
  const ctx = measureCanvas.getContext('2d')!;
  let size = fontMax;
  while (size > fontMin) {
    ctx.font = `${font.weight} ${size}px ${font.family}`;
    if (ctx.measureText(text).width <= widthBudget) break;
    size -= 1;
  }
  return size;
}

/** Rough word/char budgets per field role, for telling the brief-parsing
 *  model how much room it actually has -- not pixel-precise (the model
 *  can't know its own eventual font weight/kerning), just enough so it
 *  writes copy that `fitText`/`measureAndFit` won't have to shrink to
 *  unreadable sizes. Seeded from the real widthBudget/fontMax pairs already
 *  in use at render time where a field has one; a reasonable estimate
 *  otherwise. */
const PROMPT_BUDGETS: Record<string, { maxWords: number; maxChars: number }> = {
  'hero.urgency': { maxWords: 4, maxChars: 24 },
  'hero.title': { maxWords: 4, maxChars: 28 },
  'hero.offer': { maxWords: 3, maxChars: 18 },
  'hero.qualifier': { maxWords: 8, maxChars: 48 },
  'hero.cta': { maxWords: 2, maxChars: 16 },
  'hero.code': { maxWords: 3, maxChars: 24 },
  'banner.message': { maxWords: 10, maxChars: 64 },
  'banner.details': { maxWords: 12, maxChars: 80 },
  'banner.cta': { maxWords: 2, maxChars: 16 },
  'section.header': { maxWords: 4, maxChars: 28 },
  'section.cta': { maxWords: 2, maxChars: 16 },
  'section.pillName': { maxWords: 2, maxChars: 18 },
  'section.tileName': { maxWords: 3, maxChars: 20 },
  'brand.fallbackName': { maxWords: 2, maxChars: 16 },
  'bar.message': { maxWords: 10, maxChars: 64 },
};
const DEFAULT_PROMPT_BUDGET = { maxWords: 6, maxChars: 40 };

/** Generates the "keep within these budgets" block spliced into the brief
 *  parser's own prompt (`server/prompts.ts`) -- the brief-writing side of
 *  the same contract `fitText`/`measureAndFit` enforce at render time, so
 *  the model is told the limit before it writes rather than having its
 *  copy silently shrunk or wrapped after the fact. */
export function contractBrief(keys: string[]): string {
  return keys.map(key => {
    const { maxWords, maxChars } = PROMPT_BUDGETS[key] ?? DEFAULT_PROMPT_BUDGET;
    return `${key}: ≤${maxWords} words / ≤${maxChars} characters, one line`;
  }).join('\n');
}

/** Dev-only QA check, not a runtime correction: since a contract never
 *  moves a field's position, a field that grows can only grow INTO
 *  whatever sits below/after it -- it can't be auto-resolved without
 *  breaking the "placement never changes" rule. This renders with real (or
 *  worst-case) text, measures every declared pair, and reports which ones
 *  actually collide, so a bad brief/contract combo is caught in review
 *  instead of shipped silently.
 *
 *  `pairs` are [selectorA, selectorB] CSS selectors (typically
 *  `[data-id="..."]`) for elements that sit near each other in the
 *  template and must never visually intersect. */
export function checkTextOverlaps(container: ParentNode, pairs: [string, string][]): string[] {
  const warnings: string[] = [];
  for (const [a, b] of pairs) {
    const elA = container.querySelector(a);
    const elB = container.querySelector(b);
    if (!elA || !elB) continue;
    const ra = elA.getBoundingClientRect();
    const rb = elB.getBoundingClientRect();
    const overlaps = ra.left < rb.right && ra.right > rb.left && ra.top < rb.bottom && ra.bottom > rb.top;
    if (overlaps) warnings.push(`${a} overlaps ${b}`);
  }
  return warnings;
}
