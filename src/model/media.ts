/** The media library: everything a placeholder can be filled with.
 *
 *  A template is a set of placeholders and the brief fills them. When what the
 *  brief gave is wrong -- a logo for a brand this campaign is not running, a
 *  mark that fights the photograph, a picture whose only clear band is pale
 *  sky -- this is what the designer replaces it from. That is the whole job:
 *  the composer does not need to be clever about contrast if swapping the
 *  picture takes two clicks.
 *
 *  Vector before raster wherever both exist. An SVG reaches Figma as paths a
 *  designer can recolour or retype; a PNG arrives as a picture of a logo, and
 *  that is what 'the images come flattened with logos' meant.
 */

import { ZONE_LIST, photoUrl } from './compose';
import NAMED_SALE_MARKS from '../render/templates/named-sale/marks.json';

export type Kind = 'photo' | 'product' | 'brand' | 'wordmark' | 'social' | 'mark' | 'texture';

export type Item = {
  id: string;
  kind: Kind;
  /** What a brief or a board calls it. */
  name: string;
  /** The other names the same thing goes by, so a brief saying 'OR' or 'MH'
   *  resolves to the right file rather than to nothing. */
  aka?: string[];
  file: string;
  vector: boolean;
  /** What a designer needs to know to choose it — for a photograph, where
   *  type can sit on it and what that surface is. */
  note?: string;
  /** A knocked-out mark, drawn for a dark ground. The library carries both
   *  cuts where we hold both, because a reversed logo on paper is invisible
   *  and that is not something a renderer should have to work out twice. */
  reversed?: boolean;
};

const brand = (id: string, name: string, file: string, aka?: string[]): Item =>
  ({ id: `brand-${id}`, kind: 'brand', name, aka, file: `/logos/brand-${id}.${file}`,
     vector: file === 'svg', reversed: file === 'svg' });

const mark = (id: string, name: string): Item =>
  ({ id, kind: 'mark', name, file: `/graphics/${id}.svg`, vector: true });

/** The marks, as the design system publishes them. */
const MARKS: [string, string][] = [
  ['brush-strip', 'Brush strip'], ['brush-stroke', 'Brush stroke'],
  ['torn-paper-wide', 'Torn paper, wide'],
  ['torn-paper-tall', 'Torn paper, tall'],
  ['bolt', 'Lightning bolt'], ['bolt-ink', 'Lightning bolt, ink'],
  ['burst-01', 'Burst 1'], ['burst-02', 'Burst 2'],
  ['circle-1', 'Circle 1'], ['circle-2', 'Circle 2'], ['circle-3', 'Circle 3'],
  ['line-1', 'Line 1'], ['line-2', 'Line 2'], ['line-3', 'Line 3'],
  ['line-4', 'Line 4'], ['line-5', 'Line 5'],
  ['arrow-01', 'Arrow 1'], ['arrow-02', 'Arrow 2'], ['arrow-05', 'Arrow 5'],
  ['arrow-07', 'Arrow 7'], ['arrow-09', 'Arrow 9'], ['arrow-12', 'Arrow 12'],
  ['arrow-14', 'Arrow 14'], ['arrow-16', 'Arrow 16'],
  ['ticket-tag', 'Ticket, punched corner'], ['ticket-tag-1x1', 'Ticket, Bump social 1x1'],
  ['ticket-tag-4x5', 'Ticket, Bump social 4x5'], ['ticket-tag-9x16', 'Ticket, Bump social 9x16'],
  ['ticket-tag-email-1', 'Ticket, Bump email send 1'], ['ticket-tag-email-2', 'Ticket, Bump email send 2'],
  ['ticket-tag-email-3', 'Ticket, Bump email send 3'],
  ['panel-step', 'Panel, stepped'],
  ['pill', 'Button pill'], ['pill-wide', 'Button pill, wide'],
  ['pill-tile', 'Button pill, tile'], ['pill-soft', 'Button pill, soft corner'],
  ['bump2-window-outline', 'Stepped window outline'],
  ['bump2-window-1x1', 'Stepped window, Bump 2 social 1x1'], ['bump2-window-4x5', 'Stepped window, Bump 2 social 4x5'],
  ['bump2-window-9x16', 'Stepped window, Bump 2 social 9x16'],
  ['bump2-email-1-window', 'Stepped window, Bump 2 email 1'], ['bump2-email-2-window', 'Stepped window, Bump 2 email 2'],
  ['bump2-email-3-window', 'Stepped window, Bump 2 email 3'], ['bump2-email-4-window', 'Stepped cut-out, Bump 2 email 4'],
  ['bump2-arrow', 'Brush arrow, Bump 2'],
  // Named Sale's pills and art, cut from its board by the template lab.
  ...NAMED_SALE_MARKS as [string, string][],
];

/** The photographs, with the band a person reviewed by eye.
 *
 *  They were a dropdown of their own, which is why 'move all imagery to the
 *  media library' needed saying: a designer looking for something that can
 *  carry type should not have to know that pictures live somewhere else from
 *  logos and marks. */
export const PHOTOS: Item[] = ZONE_LIST.map(z => ({
  id: z.id, kind: 'photo' as const, name: z.id, file: photoUrl(z.id), vector: false,
  note: `${z.band ?? 'band unrecorded'}${z.surface ? ` — ${z.surface}` : ''}`,
}));

export const LIBRARY: Item[] = [
  ...PHOTOS,
  { id: 'bump-social-photo', kind: 'photo', name: 'Bump social · log crossing',
    file: '/reference/bump-social-photo.jpg', vector: false,
    note: 'Original photograph from the Bump paid-social board' },
  { id: 'flash-email-photo', kind: 'photo', name: 'Flash email · launch',
    file: '/reference/flash-email-photo.jpg', vector: false },
  { id: 'flash-hero-photo', kind: 'photo', name: 'Flash desktop and social · hikers',
    file: '/reference/flash-hero-photo.png', vector: false },
  ...([0,3,4,5] as const).map(n => ({ id: `bump-hero-photo-${n}`,
    kind: 'photo' as const, name: `Bump desktop · collage ${n+1}`,
    file: `/reference/bump-hero-img${n}.png`, vector: false })),
  ...([
    ['badge-jacket-blue.png', 'Blue jacket'],
    ['badge-jacket-yellow.png', 'Yellow jacket'],
    ['badge-jacket-black.png', 'Black jacket'],
    ['badge-boot-brown.jpg', 'Brown hiking boot'],
    ['badge-boot-grey.jpg', 'Grey boot'],
    ['badge-shoe-beige.jpg', 'Beige walking shoe'],
  ] as const).map(([file, name]) => ({ id: file, kind: 'product' as const, name,
    file: `/reference/${file}`, vector: false })),
  // The roster, pulled as vectors off the DS file's Blake Examples page. Every
  // one is the REVERSED cut -- white, drawn to be knocked out of a dark ground
  // or an accent field, which is where a brand strip sits. A dark cut would
  // need its own pull; none of the current slots wants one.
  //
  // The brand strip on the homepage mockup looked like the obvious source and
  // is not: those nodes are 1200x1200 JPEGs, the brand TILES. 400KB each with
  // no vector layer at all.
  brand('the-north-face', 'The North Face', 'svg', ['TNF', 'North Face']),
  brand('patagonia', 'Patagonia', 'svg', ['Pata']),
  brand('mountain-hardwear', 'Mountain Hardwear', 'svg', ['MH']),
  brand('outdoor-research', 'Outdoor Research', 'svg', ['OR']),
  brand('osprey', 'Osprey', 'svg'),
  brand('la-sportiva', 'La Sportiva', 'svg'),
  brand('scarpa', 'Scarpa', 'svg'),
  brand('smartwool', 'Smartwool', 'svg'),
  brand('rab', 'Rab', 'svg'),

  // `sac-logo.png` carried a wrong navy "&" (should be the brand green) and
  // no underline rule -- pulled the real mark off the design system board
  // (Figma node 759:29603) instead, as a transparent SVG.
  { id: 'sac-logo', kind: 'wordmark', name: 'Steep & Cheap', file: '/logos/sac-logo-light.svg',
    vector: true },
  { id: 'sac-logo-reversed', kind: 'wordmark', name: 'Steep & Cheap, reversed',
    file: '/logos/sac-logo.svg', vector: true, reversed: true },
  { id: 'flash-wordmark', kind: 'wordmark', name: 'Flash board Steep & Cheap',
    file: '/reference/flash-wordmark.svg', vector: true, reversed: true },
  { id: 'social-facebook', kind: 'social', name: 'Facebook',
    file: '/logos/social-facebook.png', vector: false },
  { id: 'social-instagram', kind: 'social', name: 'Instagram',
    file: '/logos/social-instagram.png', vector: false },

  ...MARKS.map(([id, name]) => mark(id, name)),
  // No longer a separate catalog item: the real outline is `brush-stroke`
  // (registered via MARKS above), the same mark Flash's own hero/email
  // brush uses, recoloured green here instead of a second flattened asset.
  { id: 'bump-last-chance', kind: 'mark', name: 'Bump last-chance lines',
    file: '/reference/bump-last-chance-lines.svg', vector: true },
  { id: 'bump-tomorrow-panel', kind: 'mark', name: 'Bump tomorrow panel',
    file: '/reference/bump-ends-tomorrow-panel.png', vector: false },
  { id: 'chevron-left', kind: 'mark', name: 'Chevron left',
    file: '/reference/chevron-left.svg', vector: true },
  { id: 'chevron-right', kind: 'mark', name: 'Chevron right',
    file: '/reference/chevron-right.svg', vector: true },

  { id: 'topo', kind: 'texture', name: 'Topo grain', file: '/Topo.png', vector: false },
];

export const byKind = (kind: Kind) => LIBRARY.filter(i => i.kind === kind);

const flat = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/** The library item a brief's wording means, or nothing.
 *
 *  Nothing rather than a guess: a brief naming a brand we hold no logo for
 *  should show as missing, not quietly become whichever logo sorted first. */
export function find(name: string): Item | undefined {
  const want = flat(name);
  if (!want) return undefined;
  return LIBRARY.find(i => flat(i.name) === want || flat(i.id) === want
    || (i.aka ?? []).some(a => flat(a) === want));
}

/** Which library items may fill a slot, from the slot's id.
 *
 *  Keyed off the id the renderer gives the element rather than a prop, so a
 *  slot becomes swappable by being named -- there is no second registry of
 *  what-can-go-where to keep in step with the renderers. */
export function offeredFor(slotId: string): Item[] {
  // Photograph slots are rendered by Picture, not Media. They still belong to
  // the same library; previously this omission disabled every photo choice.
  if (/(?:\/photo|\/pic|\/el\/\d+)$/.test(slotId)) return byKind('photo');
  if (/\/product\/\d+$/.test(slotId)) return byKind('product');
  if (/\/mark$/.test(slotId)) return byKind('mark');
  if (/\/brand\/\d+$/.test(slotId)) return byKind('brand');
  if (/\/wordmark$/.test(slotId)) return byKind('wordmark');
  if (/\/social\/\d+$/.test(slotId)) return byKind('social');
  if (/\/grain$|\/fill$/.test(slotId)) return byKind('texture');
  return [];
}

/** True when this id names a media slot the library can fill. */
export const isMediaSlot = (slotId: string) => offeredFor(slotId).length > 0;
