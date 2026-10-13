/** Merge a measured board into src/data/references.json.
 *
 *  The studio renders from these numbers, so nothing enters without being
 *  checked against the vocabulary the existing sixteen boards already obey.
 *  A role nobody has seen, a tone that is not ink or cream, or a rect still
 *  in canvas pixels would not throw anywhere — it would quietly render an
 *  asset wrong, which is the failure that costs an afternoon.
 *
 *  Usage:  node scripts/add-board.mjs measured/autumn20.json [--dry]
 *  The input is one board: { campaign, fileKey, type, measuredAt, assets: [...] }
 */
import { readFileSync, writeFileSync } from 'node:fs';

const REFS = 'src/data/references.json';

const FORMATS = new Set([
  'hero-desktop', 'hero-mobile', 'cplp-tile', 'compact-mobile',
  'paid-social-1x1', 'paid-social-4x5', 'paid-social-9x16',
  'text-banner', 'text-banner-mobile', 'gt', 'cb',
  'email-hero', 'email-body', 'logo-strip',
  'plp-badging-mock', 'pdp-badging-mock',
]);
const GROUND = new Set(['texture', 'photo-bleed', 'accent-field']);
const ELEMENT = new Set(['photo-tile', 'photo-bleed', 'texture', 'plate', 'accent-field']);
const TONE = new Set(['ink', 'cream']);
const REGISTER = new Set(['display', 'sentence']);
const TYPE = new Set(['bump', 'flash-sale', 'named-sale', 'spend-save']);
const PHASE = new Set(['Launch', 'Ends Tomorrow', 'Ends Today']);
const HEX = /^#[0-9A-F]{6}$/i;

const problems = [];
const rect = (r, where) => {
  if (!Array.isArray(r) || r.length !== 4 || !r.every(n => Number.isFinite(n)))
    return problems.push(`${where}: rect is not four numbers — ${JSON.stringify(r)}`);
  // A bleed may run a little outside 0..1. A canvas coordinate cannot hide here.
  if (r.some(n => Math.abs(n) > 2))
    problems.push(`${where}: rect looks like pixels, not fractions — ${JSON.stringify(r)}`);
};

function check(board) {
  if (!board.campaign) problems.push('board: no campaign name');
  if (!TYPE.has(board.type)) problems.push(`board: type "${board.type}" is not one of ${[...TYPE]}`);
  if (!Array.isArray(board.assets) || !board.assets.length) problems.push('board: no assets');

  for (const [i, a] of (board.assets ?? []).entries()) {
    const at = `${board.campaign} asset ${i} (${a.format})`;
    if (!FORMATS.has(a.format)) problems.push(`${at}: not a known format`);
    if (!Array.isArray(a.size) || a.size.length !== 2 || !a.size.every(n => n > 0))
      problems.push(`${at}: size is not [w,h]`);
    if (a.ground && !GROUND.has(a.ground.role)) problems.push(`${at}: ground role "${a.ground.role}"`);
    if (a.ground?.fill && !HEX.test(a.ground.fill)) problems.push(`${at}: ground fill "${a.ground.fill}"`);
    if (a.accent?.hue && !HEX.test(a.accent.hue)) problems.push(`${at}: accent hue "${a.accent.hue}"`);
    for (const p of a.phases ?? []) if (!PHASE.has(p)) problems.push(`${at}: phase "${p}"`);
    if (a.copy) {
      rect(a.copy.rect, `${at} copy`);
      if (!TONE.has(a.copy.tone)) problems.push(`${at}: copy tone "${a.copy.tone}"`);
      if (!REGISTER.has(a.copy.register)) problems.push(`${at}: copy register "${a.copy.register}"`);
    }
    for (const [j, e] of (a.elements ?? []).entries()) {
      if (!ELEMENT.has(e.role)) problems.push(`${at}: element ${j} role "${e.role}"`);
      rect(e.rect, `${at} element ${j} (${e.role})`);
    }
  }
}

const file = process.argv[2];
const dry = process.argv.includes('--dry');
if (!file) { console.error('give it a measured board json'); process.exit(1); }

const board = JSON.parse(readFileSync(file, 'utf8'));
check(board);

if (problems.length) {
  console.error(`REFUSED — ${problems.length} problem(s):`);
  for (const p of problems) console.error('  ' + p);
  process.exit(1);
}

const refs = JSON.parse(readFileSync(REFS, 'utf8'));
const already = refs.boards.findIndex(b => b.campaign === board.campaign);
if (already >= 0) { refs.boards[already] = board; console.log(`replacing ${board.campaign}`); }
else { refs.boards.push(board); console.log(`adding ${board.campaign}`); }

const byFormat = {};
for (const a of board.assets) byFormat[a.format] = (byFormat[a.format] ?? 0) + 1;
console.log(`  ${board.assets.length} assets · ${Object.keys(byFormat).length} formats`);
console.log('  ' + Object.entries(byFormat).sort((a, b) => b[1] - a[1])
  .map(([f, n]) => `${f}:${n}`).join('  '));
console.log(`  boards now: ${refs.boards.length}`);

if (dry) { console.log('\n--dry, nothing written'); process.exit(0); }
writeFileSync(REFS, JSON.stringify(refs));
console.log(`\nwritten to ${REFS}`);
