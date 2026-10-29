/** Geometry for the three chosen Figma boards. Artwork is rendered by
 *  board-specific React components; this registry supplies canvas sizes and
 *  records whether a format was actually present on that board. When absent,
 *  only the size is borrowed from the corpus—not another campaign's imagery.
 *
 *  A board measures the same format many times over (SC26_0060 has 19
 *  email-heroes at 13 different heights). One has to stand for the format, so
 *  the canonical pick is the modal SIZE first -- the shape the board uses most
 *  -- and within that the richest measurement, the one that actually recorded
 *  a copy rect and the most elements. Picking by recency or by first-seen gave
 *  one-off experiments as the template.
 */
import REFS from '../data/references.json';
import { SPECS } from './spec';
import { CLASS_OF, type TemplateSpec } from './schema';

export type Rect = [number, number, number, number];

export type Element = { role: string; rect: Rect; radius?: number };

export type FormatSpec = {
  format: string;
  size: [number, number];
  /** How many of this format the board measured, and at how many sizes. */
  measured: { assets: number; sizes: number };
  ground: { role: string; fill?: string };
  accent?: { hue: string; roles: string[] };
  copy?: {
    rect: Rect; align: string; tone: string; toneHex?: string;
    register: string; capHeight?: number; offerLines?: number; rotation?: number;
    offerFontSize?: number;
  };
  elements: Element[];
  phases: string[];
  /** Own-board measurement, or standard geometry when that board lacks it. */
  basis: 'board' | 'standard';
};

export type Template = {
  id: string;
  aliases: string[];
  campaign: string;
  type: string;
  fileKey: string;
  formats: FormatSpec[];
  /** Why this board is in the set at all. */
  why: string;
};

type RawAsset = {
  format: string; size: [number, number]; phases?: string[];
  ground?: { role: string; fill?: string };
  accent?: { hue: string; roles: string[] };
  copy?: Record<string, unknown>;
  elements?: Element[];
};
type RawBoard = { campaign: string; fileKey: string; type: string; assets: RawAsset[] };

const BOARDS = (REFS as unknown as { boards: RawBoard[] }).boards;

/** Rects measured against a cropped artboard run outside 0..1 -- the badging
 *  mocks reach -0.689 and a width of 2.374. Those are measurement artefacts,
 *  not layouts, and rendering them as-is puts copy off the frame. */
const sane = (r: Rect | undefined): r is Rect =>
  !!r && r.length === 4 && r.every(n => Number.isFinite(n))
  && r[0] >= -0.05 && r[1] >= -0.05 && r[2] > 0 && r[2] <= 1.1 && r[3] > 0 && r[3] <= 1.1;

function canonical(assets: RawAsset[], basis: FormatSpec['basis']): FormatSpec {
  // The shape this board uses most often for this format.
  const bySize = new Map<string, RawAsset[]>();
  for (const a of assets) {
    const k = `${Math.round(a.size[0])}x${Math.round(a.size[1])}`;
    (bySize.get(k) ?? bySize.set(k, []).get(k)!).push(a);
  }
  const modal = [...bySize.values()].sort((x, y) => y.length - x.length)[0];

  // Within it, the richest measurement -- but a DISPLAY register outranks
  // everything, because the register decides whether the offer is set as a
  // headline or as a paragraph. SC26_0060's richest hero-desktop happens to be
  // a 'sentence' one, and taking it rendered 'EXTRA 20% OFF' as 32px body copy
  // on a 920px hero.
  const score = (a: RawAsset) =>
    (a.copy?.register === 'display' ? 100 : 0)
    + (a.copy ? 2 : 0) + (a.elements?.length ?? 0);
  const pick = [...modal].sort((x, y) => score(y) - score(x))[0];

  const c = pick.copy as undefined | Record<string, unknown>;
  const rect = c?.rect as Rect | undefined;

  return {
    format: pick.format,
    size: [Math.round(pick.size[0]), Math.round(pick.size[1])],
    measured: { assets: assets.length, sizes: bySize.size },
    ground: pick.ground ?? { role: 'texture', fill: '#FFFFFF' },
    accent: pick.accent,
    copy: c && sane(rect) ? {
      rect: rect!,
      align: String(c.align ?? 'left'),
      tone: String(c.tone ?? 'ink'),
      toneHex: c.toneHex as string | undefined,
      register: String(c.register ?? 'display'),
      // capHeight is a fraction of FRAME height -- but on a good share of the
      // corpus it was recorded as the copy BLOCK's height instead, where it
      // comes back exactly equal to rect[3]. cplp-tile reads 0.519 for both,
      // which as a cap height would be 356px of type in a 480px tile. Where
      // the two agree it is not a cap height and is not trusted.
      capHeight: typeof c.capHeight === 'number' && c.capHeight > 0 && c.capHeight <= 1
        && !(rect && Math.abs(c.capHeight - rect[3]) < 0.01)
        ? c.capHeight : undefined,
      offerLines: c.offerLines as number | undefined,
      rotation: typeof c.rotation === 'number' ? c.rotation : undefined,
      offerFontSize: typeof c.offerFontSize === 'number' ? c.offerFontSize : undefined,
    } : undefined,
    elements: (pick.elements ?? []).filter(e => sane(e.rect)),
    // Boards write the same phase as 'Launch' and 'launch'; title-case every
    // word so 'ends today' and 'Ends Today' are one phase, not two.
    phases: [...new Set(assets.flatMap(a => a.phases ?? []).map(p =>
      p.toLowerCase().replace(/\b[a-z]/g, c => c.toUpperCase())))],
    basis,
  };
}

const allByFormat = new Map<string, RawAsset[]>();
for (const b of BOARDS) for (const a of b.assets)
  (allByFormat.get(a.format) ?? allByFormat.set(a.format, []).get(a.format)!).push(a);

/** A missing format may borrow the corpus' modal canvas size, and nothing
 * else. Copy boxes, photo tiles and phases are campaign artwork; carrying
 * those across boards is how a Flash Sale acquired Bump components. */
function standardCanvas(assets: RawAsset[]): FormatSpec {
  const source = canonical(assets, 'standard');
  return {
    format: source.format,
    size: source.size,
    measured: { assets: 0, sizes: 0 },
    ground: { role: 'unmeasured' },
    elements: [],
    phases: [],
    basis: 'standard',
  };
}

/** The reference files contain email sections (brand grids, category lists,
 * teaser rows) that share the `email-hero` tag with the campaign marquee.
 * These are the marquee sizes identified by the saved node dissections. */
const EMAIL_HERO_SIZE: Record<string, string> = {
  'SC26_0021 Flash Sale Apr 4': '1200x1029',
  'SC26_0060 Wk35-36 Bump': '1200x1395',
};
// The corpus also contains email *sections* tagged email-body. Choosing its
// modal geometry made a whole email report as a 1199×2187 fragment.
const EMAIL_BODY_SIZE: Record<string, [number, number]> = {
  'SC26_0021 Flash Sale Apr 4': [1200, 5397],
  'SC26_0060 Wk35-36 Bump': [1200, 7185],
};

// The boards also contain a dark 1390×189 site strip tagged as PDP badging.
// The deliverable called PDP badging is the 679×1403 product-page mockup,
// paired with the PLP phone. Prefer that frame explicitly over a tag's mode.
const PDP_PHONE_SIZE = '679x1403';

/** One template record owns both its theme and its geometry source.
 *
 * A board does not need to contain every deliverable. Missing formats borrow
 * only a standard canvas size; all artwork still comes from this template's
 * declared class. */
function build(spec: TemplateSpec): Template {
  const b = BOARDS.find(x => x.campaign === spec.groundedIn);
  if (!b) throw new Error(`no reference board for ${spec.groundedIn}`);
  const byFormat = new Map<string, RawAsset[]>();
  for (const a of b.assets)
    (byFormat.get(a.format) ?? byFormat.set(a.format, []).get(a.format)!).push(a);
  const formats = Object.keys(CLASS_OF).map(format => {
    // Affiliate text is copy-only on the linked Flash board, with no framed
    // geometry in the dissection. Give it a small editing canvas rather than
    // silently discarding a deliverable explicitly named by the brief.
    if (format === 'text-link') return {
      format, size: [1200, 96] as [number,number],
      measured: { assets: 0, sizes: 0 }, ground: { role: 'unmeasured' },
      elements: [], phases: [], basis: 'standard' as const,
    };
    const recorded = byFormat.get(format);
    const preferred = format === 'email-hero' ? EMAIL_HERO_SIZE[b.campaign]
      : format === 'pdp-badging-mock' ? PDP_PHONE_SIZE : undefined;
    const selected = preferred && recorded
      ? recorded.filter(a => `${Math.round(a.size[0])}x${Math.round(a.size[1])}` === preferred)
      : recorded;
    const own = selected?.length ? selected : recorded;
    const standard = allByFormat.get(format);
    if (!own && !standard) throw new Error(`no geometry anywhere for ${format}`);
    const result = own ? canonical(own, 'board') : standardCanvas(standard!);
    return format === 'email-body' && EMAIL_BODY_SIZE[b.campaign]
      ? { ...result, size: EMAIL_BODY_SIZE[b.campaign] } : result;
  }).sort((x, y) => x.format.localeCompare(y.format));
  return {
    id: spec.id, aliases: spec.aliases ?? [],
    campaign: b.campaign, type: spec.type, fileKey: b.fileKey, why: spec.why,
    formats,
  };
}

export const TEMPLATES: Template[] = SPECS.map(build);

export const templateById = (id: string) =>
  TEMPLATES.find(t => t.id === id || t.aliases.includes(id));

/** Every format either template can serve, and which of them serves it. */
export function coverage() {
  const all = new Set(BOARDS.flatMap(b => b.assets.map(a => a.format)));
  return [...all].sort().map(format => ({
    format,
    servedBy: TEMPLATES.filter(t => t.formats.some(f => f.format === format)).map(t => t.id),
  }));
}
