/** Copy fit: how much text each field holds before it contracts or wraps,
 *  and whether the text it has now fits -- the maths behind the Copy panel.
 *
 *  Three kinds of field:
 *   - contracted (it has a text contract from fitText / measureAndFit): it
 *     shrinks its font to stay inside `budget`. Green at the designed size,
 *     yellow while it shrinks by no more than CONTRACT (10%), red past that.
 *   - single line, fixed size: red once the text runs past the room it has.
 *   - multi-line, fixed size: red once it wraps to more lines than the
 *     template's own text does at the same width.
 *
 *  Pure: widths come in as numbers or a `measure` function, so this is
 *  checked without a browser (scripts/check-copyfit.ts). */
import type { Contract } from './textContracts';

export const CONTRACT = 0.1; // the most a font may shrink before it counts as too long
export type FitStatus = 'ok' | 'contract' | 'wrap';
export type FieldFit = { status: FitStatus; chars: number; ideal: number; max: number; note: string };

/** Width of a string at a font size, in px. */
export type Measure = (text: string, fontSize: number) => number;

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

const RANK: Record<FitStatus, number> = { ok: 0, contract: 1, wrap: 2 };

/** A contracted field, judged by the same arithmetic that sizes it. A field
 *  holding several lines ("EXTRA" / "20% OFF") is fitted line by line, so
 *  it is judged by its worst line. */
export function contractFit(text: string, c: Contract, measure?: Measure): FieldFit {
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length > 1) {
    const each = lines.map((line, i) => ({ i, fit: contractFit(line, c, measure) }));
    const worst = each.reduce((a, b) => RANK[b.fit.status] > RANK[a.fit.status]
      || (RANK[b.fit.status] === RANK[a.fit.status] && b.fit.chars - b.fit.ideal > a.fit.chars - a.fit.ideal) ? b : a);
    return { ...worst.fit, note: worst.fit.note && `Line ${worst.i + 1}: ${worst.fit.note}` };
  }
  const chars = text.length;
  const floorSize = Math.max(c.minSize, c.designSize * (1 - CONTRACT));
  if (c.font && measure) {
    // Measured for real (measureAndFit): compare the real width at the
    // designed size with the budget.
    const width = measure(text, c.designSize);
    const perChar = width / Math.max(1, chars) || c.designSize * 0.55;
    const ideal = Math.floor(c.budget / perChar);
    const max = Math.floor(c.budget / (perChar * floorSize / c.designSize));
    const shrink = Math.min(1, c.budget / Math.max(width, 1e-6));
    return judge(chars, ideal, max, shrink, width <= c.budget, width * floorSize / c.designSize <= c.budget);
  }
  const factor = c.charFactor ?? 0.55;
  const ideal = Math.floor(c.budget / (c.designSize * factor));
  const max = Math.floor(c.budget / (floorSize * factor));
  const shrink = Math.min(1, c.budget / (Math.max(1, chars) * factor) / c.designSize);
  return judge(chars, ideal, max, shrink, chars <= ideal, chars <= max);
}

function judge(chars: number, ideal: number, max: number, shrink: number, fits: boolean, contracts: boolean): FieldFit {
  if (fits) return { status: 'ok', chars, ideal, max, note: '' };
  if (contracts) return { status: 'contract', chars, ideal, max,
    note: `Shrinks to ${Math.round(shrink * 100)}% to fit — ${plural(chars - ideal, 'character')} over the designed size.` };
  return { status: 'wrap', chars, ideal, max,
    note: `Too long: would shrink to ${Math.round(shrink * 100)}% (more than ${CONTRACT * 100}%). Cut ${plural(chars - max, 'character')}.` };
}

/** A fixed-size single line: does the text run past the room it has? */
export function lineFit(text: string, width: number, available: number): FieldFit {
  const chars = text.length;
  const perChar = width / Math.max(1, chars) || 1;
  // Canvas and the page can disagree by a pixel or two: that's not a wrap.
  const slack = Math.max(2, available * 0.01);
  const fits = width <= available + slack;
  // A line that fits holds at least what it holds now.
  const ideal = Math.max(fits ? chars : 0, Math.floor(available / perChar));
  return fits
    ? { status: 'ok', chars, ideal, max: ideal, note: '' }
    : { status: 'wrap', chars, ideal, max: ideal,
        note: `Runs ${Math.round(width - available)}px past its box. Cut ${plural(chars - ideal, 'character')}.` };
}

/** Lines `text` takes when word-wrapped at `width` (hard breaks kept). */
export function wrapLines(text: string, width: number, measure: (s: string) => number): number {
  let lines = 0;
  for (const para of text.split('\n')) {
    let line = '';
    lines++;
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (line && measure(next) > width + 0.5) { lines++; line = word; } else line = next;
    }
  }
  return Math.max(1, lines);
}

/** A fixed-size multi-line field: more lines than its design takes is red. */
export function blockFit(text: string, lines: number, designLines: number, charsPerLine: number): FieldFit {
  const chars = text.length;
  const ideal = Math.max(lines <= designLines ? chars : 0, Math.max(1, designLines) * charsPerLine);
  return lines <= designLines
    ? { status: 'ok', chars, ideal, max: ideal, note: '' }
    : { status: 'wrap', chars, ideal, max: ideal,
        note: `Wraps to ${plural(lines, 'line')}; the design has ${designLines}.` };
}
