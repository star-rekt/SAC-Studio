/** The Bump board's ticket lockup, shared by its socials and its email
 *  heroes: a tilted orange ticket card (two-line offer, CODE | CTA row, and
 *  on socials the vertical steep&cheap wordmark) and the brand row under it.
 *  Each caller passes its own compiled Figma frame and which layer is which;
 *  every box, size and tilt comes from there. */
import type { ReactNode } from 'react';
import type { SheetAsset } from '../../../sheet/types';
import { Editable } from '../../../edit/Editable';
import { Media } from '../../../edit/Media';
import { useEdits, textOf } from '../../../edit/store';
import { boardFit } from '../../../model/textContracts';
import { BrandMark } from '../BrandMark';
import { layerOf, typeOf, placeIn, brandSlot, shadowFilter, type FigmaLayout } from '../../figma/layout';

/** The card's layers in one board frame: the card group, its ticket shape,
 *  the two-line offer, the code and CTA runs, the divider line, and (socials
 *  only) the vertical wordmark. */
export type TicketParts = { card: string; ticket: string; extra: string; code: string; cta: string;
  divider: string; wordmark?: string };

/** The board's own brands, slot by slot (the first logo's layer is just "Brand Logo"). */
const BOARD_BRANDS = ['The North Face', 'Patagonia', 'Mountain Hardwear'];
// Known logos to fall back on when a brief names a brand the library doesn't stock.
const PLACEHOLDER_BRANDS = ['the-north-face', 'patagonia', 'mountain-hardwear'];

/** Behaviour decided here:
 *  - The card and everything on it keep the board's tilt.
 *  - Every run's contract is its board layer's (boardFit): the board's copy is
 *    the ideal count, longer copy contracts. The two-line offer is one field
 *    (`offerId`: socials call it `extra`, the emails `offer`), sized by its
 *    longer line.
 *  - The CODE | CTA row ends where the board's CTA ends and grows left;
 *    "CODE" plus the bold code word when the brief has a code, else its
 *    qualifier as one run. */
export function TicketCard({ asset, layout, parts, ticketSrc, offerId }: {
  asset: SheetAsset; layout: FigmaLayout; parts: TicketParts;
  /** The board's own ticket mark for this frame (scripts/figma-marks.ts). */
  ticketSrc: string;
  offerId: 'extra' | 'offer';
}) {
  const { edits } = useEdits();
  const L = (l: string) => layerOf(layout, l);
  const id = asset.id, card = L(parts.card);
  const local = (l: string) => placeIn(L(l), card) as { left: number; top: number; width: number; height: number };

  // The two lines share one field: once it's been edited, the lines being
  // fitted are that field's own, not the brief's.
  const offerText = `${asset.copy.lead || 'EXTRA'}\n${asset.copy.offer || '20% OFF'}`;
  const extra = L(parts.extra);
  const offerFit = textOf(edits, `${id}/${offerId}`, offerText).split('\n')
    .map(line => boardFit(line, 'hero.offer', extra)).reduce((a, b) => b.fontSize < a.fontSize ? b : a);

  // Split so the code word can be bold without the label "CODE" also being
  // bold -- Editable is plain-string-only, so the two need their own ids.
  const codeLabel = asset.copy.code ? textOf(edits, `${id}/code/label`, 'CODE ') : undefined;
  const codeWord = asset.copy.code ? textOf(edits, `${id}/code/value`, asset.copy.code)
    : textOf(edits, `${id}/code`, asset.copy.qualifier || 'CODE AUTUMN20');
  const codeFit = boardFit(`${codeLabel ?? ''}${codeWord}`, 'hero.code', L(parts.code));
  const cta = (asset.copy.cta || 'Shop Now').toUpperCase() + ' >';
  const ctaFit = boardFit(textOf(edits, `${id}/cta`, cta), 'hero.cta', L(parts.cta));

  // The CODE | CTA row in the card's own px: it ends at the CTA's right edge,
  // its runs bottom-aligned (cap boxes, so on one baseline), the board's gaps.
  const code = local(parts.code), ctaBox = local(parts.cta), divider = local(parts.divider);
  const lineW = Math.min(L(parts.divider).w, L(parts.divider).h);
  const lineLeft = divider.left + divider.width / 2 - lineW / 2;
  const gapBefore = lineLeft - (code.left + code.width), gapAfter = ctaBox.left - (lineLeft + lineW);
  const rowBottom = Math.max(code.top + code.height, ctaBox.top + ctaBox.height);

  // The card's own two drop shadows, from the board.
  return <div style={{ ...placeIn(card, null), filter: shadowFilter(card), pointerEvents: 'none' }}>
    {/* The board's own ticket (its size, corners and punched hole), a library
        mark: recolourable and swappable. */}
    <Media id={`${id}/ticket/mark`} src={ticketSrc} alt="Ticket"
      title="Click to recolour, resize or swap the ticket shape from the library"
      style={placeIn(L(parts.ticket), card)} />
    {parts.wordmark && /* The vertical "steep&cheap / powered by Backcountry" lockup along the card's left edge. */
      <Media id={`${id}/wordmark`} src="/reference/flash-wordmark.png" alt="Steep & Cheap, powered by Backcountry"
        style={{ ...placeIn(L(parts.wordmark), card), objectFit: 'contain' }} />}
    <div style={{ ...local(parts.extra), width: undefined, display: 'flex', alignItems: 'flex-start', pointerEvents: 'none' }}>
      <Editable id={`${id}/${offerId}`} fit={offerFit.contract}
        style={{ ...typeOf(extra, offerFit.fontSize), whiteSpace: 'pre-line' }}>{offerText}</Editable>
    </div>
    {/* Spans the card from its top down to the row: passes clicks to the offer and ticket under it. */}
    <div style={{ position: 'absolute', left: 0, width: ctaBox.left + ctaBox.width, top: 0, height: rowBottom, pointerEvents: 'none',
      display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end', whiteSpace: 'nowrap' }}>
      {/* CSS puts letter spacing after the last letter too; Figma's box ends at the glyph. */}
      <div data-code-line style={{ ...typeOf(L(parts.code), codeFit.fontSize),
        marginRight: gapBefore + (Number(typeOf(L(parts.code), codeFit.fontSize).letterSpacing) || 0) }}>
        {codeLabel !== undefined ? <>
          <Editable as="span" id={`${id}/code/label`} fit={codeFit.contract}>{codeLabel}</Editable>
          <Editable as="span" id={`${id}/code/value`} fit={codeFit.contract} style={{ fontWeight: 800 }}>{codeWord}</Editable>
        </> : <Editable as="span" id={`${id}/code`} fit={codeFit.contract}>{codeWord}</Editable>}
      </div>
      {/* A "|" in the code's type (its cap height is the board line's), in a
          box the line's own width so the row keeps the board's gaps. */}
      <Editable as="span" id={`${id}/divider`} style={{ ...typeOf(L(parts.code), codeFit.fontSize),
        display: 'inline-flex', justifyContent: 'center', width: lineW, letterSpacing: 0, marginRight: gapAfter }}>|</Editable>
      <Editable id={`${id}/cta`} fit={ctaFit.contract} style={typeOf(L(parts.cta), ctaFit.fontSize)}>{cta}</Editable>
    </div>
  </div>;
}

/** The brand row under the card: the brief's brands (up to four) in the
 *  board's logo slots -- three logos and, for a fourth, the board's "& More"
 *  place -- the board's own brand in its exact box, any other an even cell. */
export function brandMarks(asset: SheetAsset, layout: FigmaLayout, slots: string[]): ReactNode[] {
  const brands = asset.media.brands?.length ? asset.media.brands : ['the-north-face', 'patagonia', 'mountain-hardwear'];
  const boxes = slots.map(s => layerOf(layout, s));
  return brands.slice(0, 4).map((brand, n) => {
    const slot = brandSlot(boxes, n, brand, BOARD_BRANDS);
    return <BrandMark key={`${brand}-${n}`} id={`${asset.id}/brand/${n}`} name={brand}
      fallback={`/logos/brand-${PLACEHOLDER_BRANDS[n % PLACEHOLDER_BRANDS.length]}.svg`}
      style={{ position: 'absolute', left: slot.x, top: slot.y, width: slot.w, height: slot.h, objectFit: 'contain' }} />;
  });
}
