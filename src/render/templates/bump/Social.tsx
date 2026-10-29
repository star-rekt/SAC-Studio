/** Bump paid social, every ratio: the board's photo, a tilted orange ticket
 *  card (EXTRA / 20% OFF, the code and CTA row, the vertical steep&cheap
 *  wordmark) and the brand row under it. Each ratio is its own Figma frame on
 *  SC26_0058 Wk33 Bump (569:16 / 569:17 / 569:18), compiled to
 *  src/data/figma/bump-social-<ratio>.json (npm run figma:pull) -- each with
 *  its own card size and tilt (-4.03 / -2.99 / -3.39 degrees). Every box,
 *  size, colour, tilt and crop comes from there; the card and brand row are
 *  the board's shared ticket lockup (./Ticket.tsx). */
import type { SheetAsset } from '../../../sheet/types';
import { ZONE_LIST, photoFor } from '../../../model/compose';
import type { Direction } from '../../../templates/directions';
import type { FigmaLayout } from '../../figma/layout';
import { FigmaFrame } from '../../figma/FigmaFrame';
import { TicketCard, brandMarks } from './Ticket';
import social1x1 from '../../../data/figma/bump-social-1x1.json';
import social4x5 from '../../../data/figma/bump-social-4x5.json';
import social9x16 from '../../../data/figma/bump-social-9x16.json';

/** Which Figma layer each editable layer is, by the part of its id after the
 *  asset's, per ratio. The Bump position check (localhost:5182) holds the
 *  render to these. */
export const BUMP_SOCIAL_FIGMA = {
  '1x1': { 'ticket/mark': '538:21744', wordmark: '538:21749', extra: '538:21788', cta: '538:21791',
    'brand/0': '538:21795', 'brand/1': '538:21797', 'brand/2': '538:21796' },
  '4x5': { 'ticket/mark': '538:21801', wordmark: '538:21806', extra: '538:21845', cta: '538:21848',
    'brand/0': '538:21852', 'brand/1': '538:21854', 'brand/2': '538:21853' },
  '9x16': { 'ticket/mark': '538:21858', wordmark: '538:21863', extra: '538:21902', cta: '538:21905',
    'brand/0': '538:21909', 'brand/1': '538:21911', 'brand/2': '538:21910' },
} as const;
/** The other layers read for geometry: the card group, the code run and the
 *  divider, and the fourth logo slot (the board's "& More"). */
const PARTS = {
  '1x1': { layout: social1x1, card: '538:21743', code: '538:21790', divider: '538:21792', more: '538:21798' },
  '4x5': { layout: social4x5, card: '538:21800', code: '538:21847', divider: '538:21849', more: '538:21855' },
  '9x16': { layout: social9x16, card: '538:21857', code: '538:21904', divider: '538:21906', more: '538:21912' },
} as const;
type Ratio = keyof typeof PARTS;
/** Behaviour (the card and brand row: ./Ticket.tsx) plus, here, the
 *  design directions' clip shapes. FigmaFrame supplies the photo at Figma's
 *  crop and smart placement (the card moves and scales as one). */
export function BumpSocial({ asset, direction, ratio }: { asset: SheetAsset; direction?: Direction; ratio: Ratio }) {
  const [w, h] = asset.size;
  const P = PARTS[ratio], layout = P.layout as unknown as FigmaLayout, map = BUMP_SOCIAL_FIGMA[ratio];
  const zone = ZONE_LIST.find(z => z.id === asset.media.photo) ?? photoFor('hike', 0);
  const photo = layout.frame.images?.[0] && layout.assets?.[layout.frame.images[0].ref];
  const clipPath = direction?.shape === 'panel' ? `path("M 30 30 H ${w - 30} V ${h - 30} H 30 Z")`
    : direction?.shape === 'notch' ? `path("M 30 30 H ${w - 30} V ${h - 30} H ${Math.round(w * .55)} V ${Math.round(h * .72)} H 30 Z")`
    : undefined;
  return <FigmaFrame id={asset.id} size={[w, h]} layout={layout} zone={zone} background="#838383" sheetStyle={{ clipPath }}
    photo={photo ? { id: `${asset.id}/photo`, src: photo.src, size: [photo.w, photo.h] } : undefined}
    fixed={brandMarks(asset, layout, [map['brand/0'], map['brand/1'], map['brand/2'], P.more])}>
    <TicketCard asset={asset} layout={layout} ticketSrc={`/graphics/ticket-tag-${ratio}.svg`} offerId="extra"
      parts={{ card: P.card, ticket: map['ticket/mark'], extra: map.extra, code: P.code, cta: map.cta,
        divider: P.divider, wordmark: map.wordmark }} />
  </FigmaFrame>;
}
