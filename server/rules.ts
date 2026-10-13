/** The art direction rules, and the geometry that makes them checkable.
 *
 *  The rules live in rules.md so they can be argued with and added to by
 *  whoever is art-directing, not only by whoever is editing TypeScript. They
 *  are read on every request rather than at startup, so an edit takes effect
 *  on the next review.
 *
 *  Geometry is computed here rather than left to the model. 'Follow the rule
 *  of thirds' is an opinion until something states where the third lines are
 *  and how far each element sits from them; then it is arithmetic, and a
 *  verdict can be checked rather than believed.
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Part } from './shot.ts';

const FILE = join(import.meta.dirname, 'rules.md');

export const rules = () => readFile(FILE, 'utf8')
  .catch(() => '(the rules file could not be read; judge on ordinary art direction)');

/** How many rules there are, so a verdict can be asked to answer all of them. */
export const count = (text: string) => (text.match(/^## \d+\./gm) ?? []).length;

/** Every rule's number and name, for labelling a verdict. */
export function names(text: string): Record<number, string> {
  const out: Record<number, string> = {};
  for (const m of text.matchAll(/^## (\d+)\.\s+(.+)$/gm)) out[Number(m[1])] = m[2].trim();
  return out;
}

/** The rules at a glance: a number, a name, and the one line that says how to
 *  check it.
 *
 *  Derived from the same file rather than written separately, so there is
 *  still one place to edit and no second list to forget. The full prose is
 *  what a person reads and what the slow pass is given; this is what the
 *  classifier gets, because handing it five thousand words to answer eight
 *  yes/no questions is most of why the slow pass is slow. */
export function digest(text: string): string {
  // Split rather than match to the end of the file: JavaScript has no \\Z, and
  // using it silently dropped the last rule from the digest.
  return text.split(/^## /m).slice(1).map(block => {
    const head = block.match(/^(\d+)\.\s+(.+)$/m);
    if (!head) return '';
    const body = block.slice(head[0].length);
    const check = body.match(/\*\*Check:\*\*\s*([\s\S]*?)(?=\n\*\*|\n\n|$)/);
    const first = body.split('\n').map(l => l.trim())
      .find(l => l && !l.startsWith('**') && !l.startsWith('-') && !l.startsWith('---'));
    const say = (check?.[1] ?? first ?? '').replace(/\s+/g, ' ').trim();
    return `${head[1]}. ${head[2].trim()} — ${say}`;
  }).filter(Boolean).join('\n');
}

const pc = (n: number, of: number) => Math.round((n / of) * 100);

/** The frame's third lines, and where every element sits against them. */
export function geometry(w: number, h: number, parts: Part[],
                         band?: { box: [number, number, number, number]; why: string }): string {
  const x1 = Math.round(w / 3), x2 = Math.round((w * 2) / 3);
  const y1 = Math.round(h / 3), y2 = Math.round((h * 2) / 3);
  const near = (c: number, a: number, b: number) =>
    Math.abs(c - a) <= Math.abs(c - b) ? a : b;

  const lines = parts.map(p => {
    const [x, y, pw, ph] = p.box;
    const cx = Math.round(x + pw / 2), cy = Math.round(y + ph / 2);
    const area = pc(pw * ph, w * h);
    // Only say this for elements big enough for it to mean anything; a 30px
    // run sitting off a third line is not a composition problem.
    const thirds = area >= 4
      ? ` · centre ${cx},${cy} is ${Math.abs(cx - near(cx, x1, x2))}px from the `
        + `x${near(cx, x1, x2) === x1 ? '⅓' : '⅔'} line and `
        + `${Math.abs(cx - Math.round(w / 2))}px from the middle`
      : ` · centre ${cx},${cy}`;
    return `- ${p.id} (${p.kind}) x${x} y${y}, ${pw}x${ph}`
      + (p.size ? `, ${p.size}px type` : '')
      + (p.within ? `, inside ${p.within}` : '')
      + ` · ${area}% of the frame${thirds}`
      + (p.text ? `\n    text: "${p.text}"` : '');
  });

  // The clear band is the answer to rule 3, already worked out by a person
  // who looked at the photograph. Saying it beats asking a model to find the
  // subject from the pixels and hope it agrees.
  const clear = band
    ? `\nType can sit clear of the subject at x${band.box[0]} y${band.box[1]}, `
      + `${band.box[2]}x${band.box[3]} — ${band.why}. Copy outside that band is `
      + `on the subject or on busy texture.\n`
    : '';

  return `The frame is ${w}x${h}. Its third lines are vertical at x=${x1} and x=${x2}, `
    + `horizontal at y=${y1} and y=${y2}. The middle is x=${Math.round(w / 2)}.\n`
    + clear + `\n` + lines.join('\n');
}
