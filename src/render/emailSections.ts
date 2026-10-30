/** An email's sections, for every template that has them: each design's
 *  blocks (a board frame, or the hero) grouped as a reader sees them -- a
 *  title bar, its products or tiles, the button closing it; the nav, hero,
 *  copy and footer on their own. Data only (no drawing), so the sheet and the
 *  Sections list can use it. Sections stay inside their template: an email
 *  takes its own template's sections, from any of its designs.
 *
 *  Named Sale's come from the template lab (named-sale/designs.ts); Bump's and
 *  Bump 2's are read here off their board layouts, by the frames' names. */
import type { EmailPart } from '../sheet/types';
import type { Section } from '../model/sections';
import type { FigmaLayout } from './figma/layout';
import { DESIGNS as NAMED_SALE } from './templates/named-sale/designs';
import { EMAIL_VARIANTS } from '../templates/variants';
import bump1 from '../data/figma/bump-body-1.json';
import bump2 from '../data/figma/bump-body-2.json';
import bump3 from '../data/figma/bump-body-3.json';
import b2d1 from '../data/figma/bump2-body-1.json';
import b2d2 from '../data/figma/bump2-body-2.json';
import b2d3 from '../data/figma/bump2-body-3.json';
import b2d4 from '../data/figma/bump2-body-4.json';
import b2d5 from '../data/figma/bump2-body-5.json';

export type SectionKind = 'inbox' | 'banner' | 'nav' | 'strip' | 'hero' | 'copy' | 'products' | 'brands'
  | 'categories' | 'deals' | 'section' | 'cta' | 'buttons' | 'footer';
/** A design's block: a section, or a part of one (a title bar, a product feed). */
export type BlockKind = Exclude<SectionKind, 'products'> | 'header' | 'feed';
type Block = { kind: BlockKind; frame?: string; label?: string; height: number };
/** A section: its kind, its title (its title bar's words), its look (what it
 *  draws, words and photos aside: two that look the same are offered once),
 *  and its blocks (their indexes in the design's own). */
export type EmailSection = { kind: SectionKind; label?: string; look: string; height: number; blocks: number[] };

/** What each kind of section is called, in the Sections list and in Figma. */
export const SECTION_NAMES: Record<SectionKind, string> = {
  inbox: 'Inbox', banner: 'Banner', nav: 'Nav', strip: 'Strip', hero: 'Hero', copy: 'Body copy', products: 'Product feed',
  brands: 'Brand tiles', categories: 'Category tiles', deals: 'More deals', section: 'Section', cta: 'Button',
  buttons: 'Category buttons', footer: 'Footer',
};
export const sectionName = (s: { kind: SectionKind; label?: string }) => s.label ? `${SECTION_NAMES[s.kind]} · ${s.label}` : SECTION_NAMES[s.kind];

/** The kinds a designer adds, removes and restyles; the rest stay as designed. */
export const OFFERED: SectionKind[] = ['products', 'brands', 'categories', 'buttons'];

/** A design's blocks, grouped: a title bar opens a section that takes the
 *  products or tiles after it, until a button closes it; tiles with no title
 *  bar run on their own until one. */
function group(blocks: Block[], looks: (b: number[]) => string): EmailSection[] {
  const out: (Omit<EmailSection, 'look' | 'height'> & { open: boolean })[] = [];
  blocks.forEach((b, i) => {
    const open = out.at(-1)?.open ? out.at(-1)! : null;
    if (open && ['feed', 'brands', 'categories', 'cta'].includes(b.kind)) {
      open.blocks.push(i);
      if (b.kind === 'feed') open.kind = 'products';
      else if (b.kind !== 'cta') open.kind = b.kind as SectionKind;
      else open.open = false;
      return;
    }
    out.push({ kind: b.kind === 'header' ? 'section' : b.kind === 'feed' ? 'products' : b.kind as SectionKind,
      label: b.kind === 'header' ? b.label : undefined, blocks: [i],
      open: ['header', 'feed', 'brands', 'categories'].includes(b.kind) });
  });
  return out.map(({ open: _, ...s }) => ({ ...s, look: looks(s.blocks), height: s.blocks.reduce((h, i) => h + blocks[i].height, 0) }));
}

const hash = (s: string) => { let h = 5381; for (const c of s) h = (h * 33 + c.charCodeAt(0)) >>> 0; return h.toString(36); };

/** What a board's frames draw: every layer from its frame's own top, text by
 *  its type and not its words or width, pictures by their boxes. */
function lookOf(layout: FigmaLayout, frames: string[]) {
  const kids = new Map<string | null, string[]>();
  for (const [id, l] of Object.entries(layout.layers)) kids.set(l.parent, [...(kids.get(l.parent) ?? []), id]);
  const below = (id: string): string[] => [id, ...(kids.get(id) ?? []).flatMap(below)];
  return hash(JSON.stringify(frames.flatMap(f => below(f).map(k => layout.layers[k]).filter(l => l.visible !== false).map(l => {
    const y = Math.round(l.y - layout.layers[f].y);
    return l.type === 'TEXT' ? ['T', y, Math.round(l.h), l.fill, l.text?.family, l.text?.size, l.text?.align]
      : [l.type, Math.round(l.x), y, Math.round(l.w), Math.round(l.h), l.fill];
  }))));
}

/** A board's top-level frames, top to bottom. */
const framesOf = (layout: FigmaLayout) => Object.entries(layout.layers)
  .filter(([, l]) => l.parent === null).sort((a, b) => a[1].y - b[1].y).map(([id]) => id);
const textsIn = (layout: FigmaLayout, root: string) => Object.entries(layout.layers)
  .filter(([id, l]) => { if (l.type !== 'TEXT') return false; for (let p = layout.layers[id].parent; p; p = layout.layers[p].parent) if (p === root) return true; return false; })
  .sort((a, b) => a[1].y - b[1].y).map(([, l]) => l.text?.chars ?? '');

/** Bump 2: its board's frames in its order, each a block, by name. */
export const BUMP2_LAYOUTS = { 'design-1': b2d1, 'design-2': b2d2, 'design-3': b2d3, 'design-4': b2d4, 'design-5': b2d5 } as unknown as Record<string, FigmaLayout>;
export function bump2Blocks(layout: FigmaLayout): Block[] {
  return framesOf(layout).map(frame => {
    const l = layout.layers[frame];
    const kind: BlockKind = l.name === 'SL/PH' ? 'inbox' : l.name === 'HEADER' ? 'nav' : l.name === 'Footer' ? 'footer'
      : l.name === 'SAC_Paid_1x1' || l.name === 'Email Hero' ? 'hero' : l.name === 'SAC Email Header' ? 'header'
      : l.name === 'SAC Bluecore SKUs' ? 'feed' : l.name === 'SAC Email CTA' ? 'cta'
      : Object.values(layout.layers).some(x => x.name === 'Vector 747' && within(layout, x, frame)) ? 'brands' : 'categories';
    return { kind, frame, label: kind === 'header' ? textsIn(layout, frame)[0] : undefined, height: l.h };
  });
}
const within = (layout: FigmaLayout, l: FigmaLayout['layers'][string], root: string) => {
  for (let p = l.parent; p; p = layout.layers[p].parent) if (p === root) return true;
  return false;
};

/** Bump: each send's email, in the order its body draws it (bump/EmailBody.tsx). */
export const BUMP_LAYOUTS = { 'send-1': bump1, 'send-2': bump2, 'send-3': bump3 } as unknown as Record<string, FigmaLayout>;
export function bumpBlocks(layout: FigmaLayout, heroHeight: number): Block[] {
  const all = framesOf(layout), named = (name: string, n = 0) => all.filter(f => layout.layers[f].name === name)[n];
  const at = (kind: BlockKind, frame: string, label?: string): Block => ({ kind, frame, label, height: layout.layers[frame].h });
  const heads = [named('SAC Email Header', 0), named('SAC Email Header', 1)];
  const tiles = named('Frame 4752');
  return [
    at('nav', named('HEADER')), { kind: 'hero', height: heroHeight }, at('copy', named('SAC Email Body')),
    at('header', heads[0], 'Your Top Picks'), at('feed', named('SAC Bluecore SKUs', 0)), at('cta', named('SAC Email CTA', 0)),
    at('header', heads[1], textsIn(layout, heads[1]).at(-1)),
    ...(tiles ? [at('brands', tiles)] : [at('feed', named('SAC Bluecore SKUs', 1)), at('cta', named('SAC Email CTA', 1))]),
    at('footer', named('Footer')),
  ];
}

const fromLayouts = (layouts: Record<string, FigmaLayout>, blocksOf: (l: FigmaLayout, design: string) => Block[]) => {
  const cache = new Map<string, EmailSection[]>();
  return (design: string) => {
    if (!cache.has(design)) {
      const layout = layouts[design], blocks = layout ? blocksOf(layout, design) : [];
      cache.set(design, group(blocks, b => lookOf(layout, b.map(i => blocks[i].frame).filter((f): f is string => !!f))));
    }
    return cache.get(design)!;
  };
};

/** Flash: its email's middle is its brief's sections for the send (design
 *  'brief', by their place in the brief), and a section can be added of any
 *  kind Flash draws (design 'added'), from the brief's categories and brands.
 *  The nav, teaser bar, hero and footer are always the email's own. */
const FROM_BRIEF: Partial<Record<Section['kind'], SectionKind>> = {
  productRecs: 'products', brandTiles: 'brands', categoryTiles: 'categories', moreDeals: 'deals', hero: 'copy', terms: 'strip',
};
export const FLASH_ADDED: Section[] = [
  { kind: 'productRecs', title: 'Product feed', header: '', cta: 'See More', count: 4 },
  { kind: 'brandTiles', title: 'Brand tiles', header: 'Shop Top Brands', items: [], count: 6, showPercent: false, cta: '' },
  { kind: 'categoryTiles', title: 'Category tiles', header: 'Shop by Category', items: [], cta: '' },
];
const flashSection = (sec: Section): EmailSection => {
  const kind = FROM_BRIEF[sec.kind] ?? 'section';
  return { kind, label: 'header' in sec && sec.header ? sec.header : undefined, look: kind, height: 600, blocks: [] };
};

/** Each template's sections, by design (its email designs' ids); Flash's by its brief's. */
const SECTIONS: Record<string, (design: string, brief?: Section[]) => EmailSection[]> = {
  sc26_0021: (design, brief = []) => (design === 'added' ? FLASH_ADDED : design === 'brief' ? brief : []).map(flashSection),
  named_sale: design => (NAMED_SALE.find(d => d.format === 'email-body' && d.id === design)?.sections ?? [])
    .map((s, i) => ({ kind: s.kind, label: s.label, look: s.look, height: s.height, blocks: [i] })),
  sc26_bump2: fromLayouts(BUMP2_LAYOUTS, bump2Blocks),
  // Bump's hero isn't a board frame: it's as tall as the send's design says.
  sc26_0060: fromLayouts(BUMP_LAYOUTS, (l, design) =>
    bumpBlocks(l, EMAIL_VARIANTS.sc26_0060?.find(v => v.id === design)?.height ?? 826)),
};

export const hasSections = (templateId: string) => templateId in SECTIONS;
/** A design's sections (a Flash email's: its brief's for the send). */
export const sectionsOf = (templateId: string, design: string, brief?: Section[]) => SECTIONS[templateId]?.(design, brief) ?? [];
/** An email's own sections, as parts: its design's (a Flash email's, its brief's). */
export const ownParts = (templateId: string, design: string, brief?: Section[]): EmailPart[] => {
  const own = templateId === 'sc26_0021' ? 'brief' : design;
  return sectionsOf(templateId, own, brief).map((_, section) => ({ design: own, section, key: '' }));
};
/** A part's section, if its design still has it. */
export const sectionOf = (templateId: string, p: EmailPart, brief?: Section[]) => sectionsOf(templateId, p.design, brief)[p.section];
/** The designs a template's sections are offered from (Flash: the kinds it draws). */
export const emailDesigns = (templateId: string) =>
  templateId === 'sc26_0021' ? ['added'] : (EMAIL_VARIANTS[templateId] ?? []).map(v => v.id);
