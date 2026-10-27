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
const DEFAULT_FONT_MAX = 60, DEFAULT_FONT_MIN = 14, DEFAULT_CHAR_FACTOR = 0.55;

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
export function fitText(text: string, _key: string, opts: FitOpts): { fontSize: number } {
  const { widthBudget, fontMax = DEFAULT_FONT_MAX, fontMin = DEFAULT_FONT_MIN,
    charFactor = DEFAULT_CHAR_FACTOR } = opts;
  const len = Math.max(text.length, 1);
  const fontSize = Math.min(fontMax, Math.max(fontMin, Math.floor(widthBudget / (len * charFactor))));
  return { fontSize };
}

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
