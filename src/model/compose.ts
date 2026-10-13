/** The brief, turned into seven emails. Nothing here is invented: the words
 *  come from the brief, the geometry from references.json, the colours and
 *  type from the design system's own token files. */
import { readBrief, type Brief } from './brief';
import { readSends, impliedSend, type Send, type Section, type Item } from './sections';
import BRIEF_TEXT from '../data/brief.txt?raw';
import ZONES from '../data/zones.json';
import TOKENS from '../data/tokens.json';
import TYPE from '../data/typography.json';
import REFS from '../data/references.json';

export type { Brief, Send, Section, Item };

/* ---- the brand, read from the design system rather than typed in here ---- */
const prim = (TOKENS as { primitives: { name: string; value: unknown }[] }).primitives;
const colour = (n: string) => String(prim.find(p => p.name === 'color/' + n)?.value ?? '#000');

export const BRAND = {
  orange: colour('orange'), cream: colour('cream'), green: colour('green'),
  red: colour('red'), blue: colour('blue'), ink: colour('ink'), white: colour('white'),
};

type Style = { name: string; family: string; style: string; size: number; lineHeight: number };
const STYLES = (TYPE as { styles: Style[] }).styles;
export const type = (n: string) => STYLES.find(s => s.name === n) as Style;

/** The brand faces now come from the Adobe kit; the mapping and the
 *  missing-weight report live in src/fonts.ts. */
export { stack } from '../fonts';

/* ---- the measured email hero, from a board of this campaign's own type ----
 *
 *  Taking the tallest email hero in the corpus gave a Memorial Day board for a
 *  bump brief. The type has to lead, with the rest of the corpus as the
 *  fallback, which is the same rule the plugin uses to pick a board. */
const HEROES = (REFS as any).boards.flatMap((b: any) =>
  b.assets.filter((a: any) => a.format === 'email-hero' && a.copy)
    .map((a: any) => ({ ...a, campaign: b.campaign, boardType: b.type })));

export type HeroSpec = {
  campaign: string; size: [number, number]; ground: string; accent: string;
  copy: [number, number, number, number]; capHeight: number;
  photo: [number, number, number, number];
};

export function heroSpec(type: string): HeroSpec {
  const mine = HEROES.filter((h: any) => h.boardType === type);
  const h = (mine.length ? mine : HEROES).sort((a: any, b: any) => b.size[1] - a.size[1])[0];
  return {
    campaign: h.campaign, size: h.size, capHeight: h.copy.capHeight,
    ground: h.ground?.fill ?? BRAND.cream,
    accent: h.accent?.hue ?? BRAND.green,
    copy: h.copy.rect,
    photo: h.elements.find((e: any) => e.role === 'photo-tile')?.rect ?? [0.426, 0.05, 0.515, 0.447],
  };
}

/* ---- photography ---- */
export type Zone = {
  id: string; key: string; surface?: string; band?: string; note?: string;
  /** The clear band, normalised on the SOURCE image: x, y, width, height.
   *  Hand-reviewed for all 31 photographs. See model/safe.ts. */
  rect?: [number, number, number, number];
};
export const ZONE_LIST = (ZONES as unknown as { zones: Zone[] }).zones;
export const pursuitOf = (id: string) => id.replace(/(-\d+)+$/, '');

/** A real file if one has been fetched, and a brand-coloured stand-in keyed to
 *  the photograph's own surface when it has not. The stand-in is deliberately
 *  obvious: a missing picture should look missing, not look like a decision. */
export const photoUrl = (id: string) => `/photos/${id}.jpg`;
const SURFACE: [RegExp, string][] = [
  [/snow|pale sky|grey sky/i, '#C9D3DA'], [/blue sky/i, '#7FA8C9'],
  [/teal/i, '#2E7D82'], [/sunset|desert/i, '#D98A4F'],
  [/sandstone|rock/i, '#B07A52'], [/water|ocean|lake|sea/i, '#4A7C94'],
  [/valley|forest/i, '#5C7A4A'],
];
export const standIn = (z: Zone) =>
  (SURFACE.find(([re]) => re.test(z.surface ?? ''))?.[1]) ?? '#8A9A86';

/** Copy i of a run takes element i of the cluster. Same rule the plugin
 *  settled on, and for the same reason: hashing a seed collides. */
export function photoFor(pursuit: string, index: number): Zone {
  const pool = ZONE_LIST.filter(z => !pursuit || pursuitOf(z.id) === pursuit);
  const use = pool.length ? pool : ZONE_LIST;
  return use[((index % use.length) + use.length) % use.length];
}

/* ---- the document ---- */
export type Doc = {
  brief: Brief;
  spec: HeroSpec;
  sends: (Send & { pursuit: string; photo: Zone; index: number })[];
};

const PURSUIT_WORDS: [string, RegExp][] = [
  ['hike', /\bhiking\b|\bhike\b|\btrail\b/i], ['camp', /\bcamping\b|\bcamp\b/i],
  ['climb', /\bclimbing\b|\bclimb\b/i],
  ['water-swim', /\bfishing\b|\bswim\b|\bwater\b|\bpaddle\b/i],
  ['product-gear', /\bproduct\b|\bgear\b|\bapparel\b/i],
];

export function compose(text = BRIEF_TEXT, extra: Send[] = [], resolved?: Brief): Doc {
  const brief = resolved ?? readBrief(text, '', text);
  const found = readSends(text);
  const base = extra.length ? extra : found.length ? found : [impliedSend(brief.name)];
  const sends = base.map((s, i) => {
    const design = s.sections.find(x => x.kind === 'hero');
    const words = design && design.kind === 'hero' ? design.design : '';
    const own = PURSUIT_WORDS.find(([, re]) => re.test(words))?.[0] ?? '';
    const pursuit = own || brief.pursuit;
    return { ...s, pursuit, index: i, photo: photoFor(pursuit, i) };
  });
  return { brief, spec: heroSpec(brief.type), sends };
}

/** The offer, as this campaign states it. */
export const offerOf = (b: Brief) => b.offer || (b.percent ? `EXTRA ${b.percent}% OFF` : 'ON SALE');
