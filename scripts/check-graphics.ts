/** Every graphic component is a real, swappable vector -- never a flattened
 *  PNG standing in for one, and never a colour-and-border-radius drawn
 *  straight onto an `<Editable>`/`<Ground>` as if that were a shape. Both
 *  read, in the app, as "this is editable" (an outline on hover, a panel
 *  that opens) while secretly offering nothing a designer can actually swap
 *  or recolour as a mark -- the exact gap the ticket card, the CTA pills and
 *  the category rows each had before being fixed this way, one at a time.
 *  This is the generic version of that fix, run over every template so the
 *  next one doesn't regress the same way.
 *
 *  Two checks:
 *   1. Every library item a designer can pick as a "mark" or "wordmark" is a
 *      real .svg file, not a raster standing in for one.
 *   2. No template source draws a shape directly: an `<Editable>`/`<Ground>`
 *      whose own `style` sets both `background` and `borderRadius` is a
 *      button or a pill painted with CSS, not the `<Media>`+mark-shapes
 *      vector it should be (see `docs/templates.md`).
 *
 *  `media.ts` is read as TEXT, not imported -- it drags in `compose.ts`'s
 *  `?raw` brief import, a Vite-only loader this plain script has no bundler
 *  for. Parsing is also just as reliable here: the data this check needs is
 *  the literal `kind:`/`file:` pair that is already present verbatim in the
 *  source, not anything that needs evaluating.
 *
 *  Exits 1 and names every offender, the same contract every other
 *  `check:*` script keeps. */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const faults: string[] = [];

/** Known rasters pending a real Figma vector pull -- named and dated rather
 *  than silently exempted, so this stays an honest backlog, not a bypass.
 *  Remove an id here the moment its real outline is extracted (the way
 *  `brush-stroke` replaced `flash-social-brush`), not before. */
const PENDING_VECTOR = new Set([
  'autumn-ticket',       // Autumn's punched ticket -- needs the same real-path
                         // pull `ticket-tag`/`brush-stroke` got, not a guess.
  'bump-tomorrow-panel', // Bump's "tomorrow" panel shape -- same, unpulled.
]);

// 1. Library "marks" and wordmarks must be real vectors.
const mediaSrc = readFileSync('src/model/media.ts', 'utf8');
const itemRe = /\{\s*id:\s*'([^']+)'[^{}]*?\bkind:\s*'(mark|wordmark)'[^{}]*?\bfile:\s*'([^']+)'[^{}]*?\}/g;
for (let m = itemRe.exec(mediaSrc); m; m = itemRe.exec(mediaSrc)) {
  const [, id, kind, file] = m;
  if (!file.endsWith('.svg') && !PENDING_VECTOR.has(id))
    faults.push(`media.ts: "${id}" (${kind}) is ${file} -- marks and wordmarks `
      + 'are swappable, recolourable vectors, not a raster placed once');
}

// 2. No template draws a shape by hand.
// `flash2` is still an unwired draft (not imported from `One.tsx`, not
// reachable from the app at all) -- see docs/templates.md. Checking dead
// code would make this gate permanently red for files nothing renders.
// `bump2` was this folder until sc26_bump2 wired it in; it is live now.
const DEAD_DRAFTS = new Set(['flash2']);

function tsxFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    if (DEAD_DRAFTS.has(name)) return [];
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return tsxFiles(full);
    return name.endsWith('.tsx') ? [full] : [];
  });
}

/** The balanced `{...}` span starting at `open` (the index of that `{`). */
function spanOf(src: string, open: number): string {
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}' && --depth === 0) return src.slice(open, i + 1);
  }
  return src.slice(open);
}

/** Where this JSX tag's own opening `<Name ...>` ends -- brace-depth aware,
 *  so a `>` inside an attribute's own `{...}` expression (an arrow function,
 *  a comparison, a nested tag passed as a prop) doesn't read as the tag's
 *  close. Without this, a tag with no `style={{` of its own (one styled via
 *  a helper call like `style={txt(...)}`) wrongly inherited whatever
 *  `style={{` happened to appear next in the file, possibly a different
 *  element's, several lines later. */
function tagEnd(src: string, start: number): number {
  let depth = 0;
  for (let i = start; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') depth--;
    else if (src[i] === '>' && depth === 0) return i;
  }
  return src.length;
}

for (const file of tsxFiles('src/render/templates')) {
  const src = readFileSync(file, 'utf8');
  for (const tag of ['<Editable', '<Ground']) {
    const tagRe = new RegExp(tag.replace('<', '<\\s*'), 'g');
    for (let m = tagRe.exec(src); m; m = tagRe.exec(src)) {
      // A tag's own `style={{` sits within its own opening tag -- a
      // `style=` turning up after the tag's `>` belongs to some other,
      // later element, not this one.
      const close = tagEnd(src, m.index);
      const styleAt = src.indexOf('style={{', m.index);
      if (styleAt === -1 || styleAt > close) continue;
      const open = styleAt + 'style='.length;
      const span = spanOf(src, open);
      if (/\bbackground\s*:/.test(span) && /\bborderRadius\s*:/.test(span)) {
        const line = src.slice(0, m.index).split('\n').length;
        faults.push(`${file}:${line}: a shape drawn with background+borderRadius on `
          + `${tag}> -- use a real <Media> mark instead (see docs/templates.md)`);
      }
    }
  }
}

if (faults.length) {
  console.error(`${faults.length} graphic-component fault(s):`);
  for (const f of faults) console.error('  ' + f);
  process.exit(1);
}
console.log('graphics clean: every mark is a real vector, no hand-drawn shapes');
