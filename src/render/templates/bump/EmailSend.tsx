/** Bump email heroes, one per send: the board's photo, the looping marquee
 *  across the top, the tilted ticket card and the brand row. Each send is
 *  its own frame on SC26_0058 Wk33 Bump -- send 1 538:21930 (826 tall),
 *  send 2 538:22079 (1125), send 3 538:22190 (929) -- compiled to
 *  src/data/figma/bump-email-<send>.json (npm run figma:pull), each with its
 *  own card size, place and tilt (-2.7 / -3.31 / -4.32 degrees). The card and
 *  brand row are the board's shared ticket lockup (./Ticket.tsx). */
import type { SheetAsset } from '../../../sheet/types';
import { Editable } from '../../../edit/Editable';
import { ZONE_LIST, photoFor } from '../../../model/compose';
import { useEdits, textOf } from '../../../edit/store';
import { stack } from '../../../fonts';
import { layerOf, boxOf, type FigmaLayout } from '../../figma/layout';
import { FigmaFrame } from '../../figma/FigmaFrame';
import { TicketCard, brandMarks, type TicketParts } from './Ticket';
import email1 from '../../../data/figma/bump-email-1.json';
import email2 from '../../../data/figma/bump-email-2.json';
import email3 from '../../../data/figma/bump-email-3.json';

/** Which Figma layer each editable layer is, by the part of its id after the
 *  asset's, per send. The Bump position check (localhost:5182) holds the
 *  render to these. */
export const BUMP_EMAIL_FIGMA = {
  1: { 'ticket/mark': '538:21932', offer: '538:21938', cta: '538:21941',
    'brand/0': '538:21945', 'brand/1': '538:21947', 'brand/2': '538:21946' },
  2: { 'ticket/mark': '538:22081', offer: '538:22087', cta: '538:22090',
    'brand/0': '538:22094', 'brand/1': '538:22096', 'brand/2': '538:22095' },
  3: { 'ticket/mark': '538:22192', offer: '538:22198', cta: '538:22201',
    'brand/0': '538:22205', 'brand/1': '538:22207', 'brand/2': '538:22206' },
} as const;
/** Per send: the frame, the card's other layers, the fourth logo slot (the
 *  board's "& More"), whether the marquee sits on an orange band, and the
 *  board's marquee strip (a 110px picture of its text: where the marquee goes). */
const SENDS = {
  1: { layout: email1, card: '538:21931', code: '538:21940', divider: '538:21942', more: '538:21948', band: false, strip: '538:21949' },
  2: { layout: email2, card: '538:22080', code: '538:22089', divider: '538:22091', more: '538:22097', band: true, strip: '538:22098' },
  3: { layout: email3, card: '538:22191', code: '538:22200', divider: '538:22202', more: '538:22208', band: true, strip: '538:22210' },
} as const;
export type Send = keyof typeof SENDS;

/** The marquee as the board draws it (its strip is a picture, so these are
 *  measured off that picture): Sofia Pro, capitals 45px tall centred on the
 *  110px strip, each phrase followed by a solid cap-height bar 6px wide with
 *  45px before it and 38px after -- not a "|" glyph, which is thinner and
 *  drops below the baseline. */
const MARQUEE = { size: 65.3, weight: 700, cap: 45, bar: 6, before: 45, after: 38 };

/** Behaviour decided here, besides the ticket's own (./Ticket.tsx): the
 *  looping marquee, four repeats wide so its seam never shows, on sends 2
 *  and 3 over a flat orange band the copy keeps clear of. The board's own
 *  marquee is a picture of its text; this one stays editable. FigmaFrame
 *  supplies the photo at Figma's crop and smart placement (the card moves
 *  and scales as one, clear of the marquee). */
export function BumpEmailSend({ asset, send }: { asset: SheetAsset; send: Send }) {
  const { edits } = useEdits();
  const S = SENDS[send], layout = S.layout as unknown as FigmaLayout, map = BUMP_EMAIL_FIGMA[send];
  const id = asset.id;
  const zone = ZONE_LIST.find(z => z.id === asset.media.photo) ?? photoFor('hike', 0);
  const photo = layout.frame.images?.[0] && layout.assets?.[layout.frame.images[0].ref];
  const urgency = textOf(edits, `${id}/marquee`, asset.copy.marquee || '3 DAYS ONLY');
  const strip = layerOf(layout, S.strip);
  const parts: TicketParts = { card: S.card, ticket: map['ticket/mark'], extra: map.offer, code: S.code,
    cta: map.cta, divider: S.divider };

  return <FigmaFrame id={id} size={asset.size} layout={layout} zone={zone} background="#6D6D6D"
    photo={photo ? { id: `${id}/photo`, src: photo.src, size: [photo.w, photo.h] } : undefined}
    fixed={<>
      {S.band && <div data-keepout style={{ ...boxOf(strip), background: '#F14222' }} />}
      <div style={{ ...boxOf(strip), left: -15, width: strip.w + 40, overflow: 'hidden', pointerEvents: 'none',
        display: 'flex', alignItems: 'center', whiteSpace: 'nowrap', color: '#fff' }}>
        {Array.from({ length: 4 }, (_, n) => <span key={n} style={{ display: 'flex', alignItems: 'center', flex: 'none' }}>
          <Editable as="span" id={`${id}/marquee/${n}`} style={{ fontFamily: stack('Sofia Pro'), fontWeight: MARQUEE.weight,
            fontSize: MARQUEE.size, lineHeight: 1, textBoxTrim: 'trim-both', textBoxEdge: 'cap alphabetic' } as React.CSSProperties}>{urgency}</Editable>
          <Editable as="span" id={`${id}/marquee-divider/${n}`} style={{ display: 'inline-block', width: MARQUEE.bar,
            height: MARQUEE.cap, background: '#fff', color: 'transparent', fontSize: 1, overflow: 'hidden',
            margin: `0 ${MARQUEE.after}px 0 ${MARQUEE.before}px` }}>|</Editable></span>)}
      </div>
      {brandMarks(asset, layout, [map['brand/0'], map['brand/1'], map['brand/2'], S.more])}
    </>}>
    <TicketCard asset={asset} layout={layout} parts={parts} ticketSrc={`/graphics/ticket-tag-email-${send}.svg`}
      offerId="offer" />
  </FigmaFrame>;
}
