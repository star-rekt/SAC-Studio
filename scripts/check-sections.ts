/** Named Sale's email sections, checked without a browser: each design's
 *  sections are contiguous bands that make up its whole frame, and an email
 *  whose brief lists sections is built of them, in its order, with its headers.
 *
 *  Exits 1 and names every failure, the same contract every other
 *  `check:*` script keeps. */
import { DESIGNS } from '../src/render/templates/named-sale/designs.ts';
import { briefParts, sectionOf } from '../src/render/templates/named-sale/sections.ts';
import { ownParts as partsOf, sectionsOf, emailDesigns } from '../src/render/emailSections.ts';
import type { Section } from '../src/model/sections.ts';

const faults: string[] = [];
const expect = (ok: boolean, what: string) => { if (!ok) faults.push(what); };

// 1. A design's own sections stack back to the whole frame.
const emails = DESIGNS.filter(d => d.format === 'email-body');
expect(emails.length > 0 && emails.every(d => d.sections?.length), 'every email design has sections');
for (const d of emails) {
  const s = d.sections ?? [];
  expect(s[0]?.top === 0, `${d.id}: starts at 0`);
  s.forEach((x, i) => i && expect(x.top === s[i - 1].top + s[i - 1].height, `${d.id}: section ${i} follows the one above`));
  const end = s.at(-1)!.top + s.at(-1)!.height;
  expect(Math.abs(end - d.size[1]) < 0.01, `${d.id}: sections end at ${end}, the frame at ${d.size[1]}`);
  expect(s.filter(x => x.kind === 'hero').length === 1, `${d.id}: one hero`);
}

// 1b. Bump's and Bump 2's: every block of a design in exactly one section, in order.
for (const t of ['sc26_0060', 'sc26_bump2']) for (const d of emailDesigns(t)) {
  const blocks = sectionsOf(t, d).flatMap(s => s.blocks);
  expect(blocks.length > 3 && blocks.every((b, i) => b === i), `${t} ${d}: sections cover its blocks in order (${blocks.join(',')})`);
  expect(sectionsOf(t, d).filter(s => s.kind === 'hero').length === 1, `${t} ${d}: one hero`);
}

// 1c. Flash: an email's own sections are its brief's, in order; it can add the kinds it draws.
const flashBrief = [{ kind: 'categoryTiles', title: 'S1', header: 'Top Categories', items: [], cta: '' },
  { kind: 'productRecs', title: 'S2', header: '', cta: 'See More' }] as Section[];
expect(JSON.stringify(partsOf('sc26_0021', 'launch', flashBrief)) === JSON.stringify([{ design: 'brief', section: 0, key: '' }, { design: 'brief', section: 1, key: '' }]),
  'Flash: its own sections are the brief\'s');
expect(sectionsOf('sc26_0021', 'brief', flashBrief).map(x => x.kind).join() === 'categories,products', 'Flash: brief kinds read as the board\'s');
expect(sectionsOf('sc26_0021', 'added').map(x => x.kind).join() === 'products,brands,categories', 'Flash: kinds it can add');

// 2. No sections in the brief: the email is its design's own.
expect(briefParts('design-5', []) === undefined, 'no brief sections: none chosen');
expect(briefParts('design-5', [{ kind: 'terms', title: 'Terms' }]) === undefined, 'no section kinds the board has: none chosen');

// 3. The brief's sections between the design's top and bottom, in order, with headers.
const asked: Section[] = [
  { kind: 'productRecs', title: 'Section 2', header: 'Flash Sale Top Picks', cta: 'Shop Now' },
  { kind: 'moreDeals', title: 'Section 3', header: 'More Deals', items: [] },
  { kind: 'brandTiles', title: 'Section 4', header: 'Shop Top Brands', items: [], count: 6, showPercent: true, cta: '' },
  { kind: 'categoryTiles', title: 'Section 5', header: '', items: [], cta: '' },
] as Section[];
const parts = briefParts('design-5', asked)!;
const kinds = parts.map(p => sectionOf(p)?.kind);
const own = partsOf('named_sale', 'design-5').map(p => sectionOf(p)?.kind);
expect(JSON.stringify(kinds) === JSON.stringify([...own.slice(0, own.indexOf('products')), 'products', 'brands', 'categories',
  ...own.slice(own.indexOf('products') + 1)]), `design 5 + brief: ${kinds.join(', ')}`);
const feed = parts.find(p => sectionOf(p)?.kind === 'products')!, brands = parts.find(p => sectionOf(p)?.kind === 'brands')!;
expect(feed.design === 'design-5' && feed.key === '' && feed.heading === 'Flash Sale Top Picks', 'its own product feed, under the brief header');
expect(brands.design !== 'design-5' && brands.key !== '' && brands.heading === 'Shop Top Brands', 'brand tiles from a design that has them, keyed apart');
expect(!('heading' in parts.find(p => sectionOf(p)?.kind === 'categories')!), 'no header in the brief: the board\'s own');
expect(JSON.stringify(briefParts('design-5', asked)) === JSON.stringify(parts), 'the same brief builds the same sections');

if (faults.length) { console.error(`check:sections -- ${faults.length} failed:\n  ${faults.join('\n  ')}`); process.exit(1); }
console.log(`check:sections -- ${emails.length} designs, ${emails.reduce((n, d) => n + (d.sections?.length ?? 0), 0)} sections, brief mapping OK`);
