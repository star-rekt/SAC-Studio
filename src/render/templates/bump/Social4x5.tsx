/** Bump paid-social-4x5. Frame is 1080x1350 (confirmed from the board's own
 *  CSS export -- a stray earlier draft of this file wrongly treated it as
 *  1080x1080, same square frame as paid-social-1x1). Same ticket card/
 *  wordmark/brand-row structure as Social1x1.tsx -- same proven fixes
 *  (flex CODE|CTA row instead of right-align+separate-line, wordmark
 *  centered via translate+rotate not flex-shrink, shared left edge between
 *  the offer text and the code row) -- just this frame's own real
 *  measurements, not reused percentages from the 1x1 version (the two
 *  designs don't share a card position, so the percentages don't carry
 *  over even though the structure does). */
import type { SheetAsset } from '../../../sheet/types';
import { Editable, Ground } from '../../../edit/Editable';
import { Media } from '../../../edit/Media';
import { Picture } from '../../../edit/Picture';
import { ZONE_LIST, photoFor } from '../../../model/compose';
import { stack } from '../../../fonts';
import { useEdits, textOf } from '../../../edit/store';
import { fitText } from '../../../model/textContracts';
import { BrandMark } from '../BrandMark';
import type { Direction } from '../../../templates/directions';

const FRAME_W = 1080, FRAME_H = 1350;
// Card ("Group 2918"): width:951.28, left:calc(50% - 951.28/2 - 8.36), top:51.59%,
// bottom:23.13% of the frame, rotate(-2.99deg).
const CARD = {
  left: FRAME_W / 2 - 951.28 / 2 - 8.36,
  top: FRAME_H * 0.5159,
  width: 951.28,
  height: FRAME_H * (1 - 0.5159 - 0.2313),
};

const txt = (left: number, top: number, fontSize: number,
  extra?: React.CSSProperties): React.CSSProperties => ({ position: 'absolute', left, top,
  fontFamily: stack('Quiet Sans'), fontSize, lineHeight: 1,
  textBoxTrim: 'trim-both', textBoxEdge: 'cap alphabetic', ...extra } as React.CSSProperties);

// Known, real logo assets to cycle through when a brief names a brand the library doesn't stock -- a template slot stays a logo-shaped placeholder the designer swaps, not blank or a text label.
const PLACEHOLDER_BRANDS = ['the-north-face', 'patagonia', 'mountain-hardwear'];

export function BumpSocial4x5({ asset, direction }: { asset: SheetAsset; direction?: Direction }) {
  const [w, h] = asset.size;
  const { edits } = useEdits();
  const id = asset.id;
  const clipPath = direction?.shape === 'panel' ? `path("M 30 30 H ${w - 30} V ${h - 30} H 30 Z")`
    : direction?.shape === 'notch' ? `path("M 30 30 H ${w - 30} V ${h - 30} H ${Math.round(w * .55)} V ${Math.round(h * .72)} H 30 Z")`
    : undefined;

  const lead = textOf(edits, `${id}/lead`, asset.copy.lead || 'EXTRA');
  const offer = textOf(edits, `${id}/offer`, asset.copy.offer || '20% OFF');
  // Split so the code WORD can be bold without the label "CODE" also being
  // bold -- Editable is plain-string-only (no mixed-weight runs within one
  // field), so the two need their own ids. Only when a real code exists:
  // the qualifier/no-code fallback is free text, not a label+word pair.
  const codeLabel = asset.copy.code ? textOf(edits, `${id}/code/label`, 'CODE') : undefined;
  const codeWord = asset.copy.code
    ? textOf(edits, `${id}/code/value`, asset.copy.code)
    : textOf(edits, `${id}/code`, asset.copy.qualifier || 'CODE AUTUMN20');
  const cta = textOf(edits, `${id}/cta`, (asset.copy.cta || 'Shop Now').toUpperCase());
  const brands = asset.media.brands?.length
    ? asset.media.brands : ['the-north-face', 'patagonia', 'mountain-hardwear'];

  // Shared left edge for the stacked offer text and the CODE|CTA row below it.
  const cardTextLeft = (26.09 / 100) * FRAME_W - CARD.left;
  const extraFontSize = Math.min(
    fitText(lead, 'hero.title', { widthBudget: 650, fontMax: 107.74, charFactor: .6 }).fontSize,
    fitText(offer, 'hero.offer', { widthBudget: 650, fontMax: 107.74, charFactor: .6 }).fontSize,
  );
  const zone = ZONE_LIST.find(z => z.id === asset.media.photo) ?? photoFor('hike', 0);

  return <Ground id={`${id}/fill`} className="sheet" style={{ width: w, height: h,
    position: 'relative', overflow: 'hidden', background: '#838383', clipPath }}>
    <div style={{ position: 'absolute', width: FRAME_W, height: FRAME_H,
      transform: `scale(${w / FRAME_W},${h / FRAME_H})`, transformOrigin: 'top left' }}>
      <Picture id={`${id}/photo`} zone={zone} initialSrc="/reference/autumn-social-photo.jpg"
        initialScale={1} focus={{ x: 50.934, y: 50 }}
        style={{ position: 'absolute', inset: 0 }} />

      {/* The card: one rotated wrapper -- everything inside sits in its own
          0,0-origin space and inherits the single tilt, nothing re-declares it. */}
      <div style={{ position: 'absolute', ...CARD,
        filter: 'drop-shadow(3.29741px 3.29741px 95.1304px rgba(0,0,0,.25)) '
          + 'drop-shadow(3.29741px 3.29741px 5.44073px rgba(0,0,0,.25))',
        transform: 'rotate(-2.99deg)' }}>
        {/* The real ticket/punched-corner mark from the library -- same
            component `EmailHeader1.tsx`/`EmailHero.tsx` use, not a fixed
            texture image standing in for it. Its own SVG path (evenodd)
            already cuts the punched corner as a true hole, recolourable and
            swappable like every other library mark. */}
        <Media id={`${id}/ticket/mark`} src="/graphics/ticket-tag.svg" alt="Ticket"
          title="Click to recolour, resize or swap the ticket shape from the library"
          style={{ position: 'absolute', inset: 0, width: CARD.width, height: CARD.height }} />

        {/* Vertical "steep&cheap / powered by Backcountry" lockup -- confirmed
            correct asset via the real session edit (Bump_ALPINE20 swapped
            this slot to `/reference/flash-wordmark.png`, the Flash board's
            own reversed wordmark): full lockup, white type, green "&" and
            rule, "powered by Backcountry" included, nothing to add back on
            top of it. Card-local box reused from Social9x16.tsx -- this card
            shares the same 951.28px card width and near-identical height. */}
        <Media id={`${id}/wordmark`} src="/reference/flash-wordmark.png" alt="Steep & Cheap, powered by Backcountry"
          style={{ position: 'absolute', left: 74.09, top: 113.06,
            width: 246.1, height: 112.1, transform: 'rotate(-90deg)' }} />

        {/* "EXTRA\n20% OFF" and the CODE | CTA row share one left edge.
            Nudged by the same relative amounts baked into Social1x1.tsx's
            default, carried over here now that the wordmark sits in its real
            box too and the two need the same breathing room from it. */}
        <Editable id={`${id}/extra`} style={txt(
          cardTextLeft + 50, (54.78 / 100) * FRAME_H - CARD.top - 2.94, extraFontSize,
          { fontWeight: 800, lineHeight: '117px', color: '#FFFFFF', whiteSpace: 'pre-line',
            width: 650 })}>{`${lead}\n${offer}`}</Editable>

        {/* fontSize lives on each Editable itself, not just the flex
            wrapper -- the per-element size-scale control only multiplies a
            NUMERIC `fontSize` on that same element's own style; reading it
            off an inherited parent font-size left these three with nothing
            of their own to scale, so resizing any of them did nothing. */}
        <div style={{ position: 'absolute', left: cardTextLeft + 52.94, top: 290 - 8.82,
          display: 'flex', alignItems: 'baseline', gap: 10, whiteSpace: 'nowrap',
          color: '#fff', fontFamily: stack('Quiet Sans'),
          letterSpacing: '0.1em', lineHeight: 1 }}>
          {/* No per-element top/left nudge -- `alignItems: 'baseline'` on the
              row already aligns code/divider/cta by their text baseline
              regardless of their different font sizes, which is the whole
              point of baseline alignment. Hand-dragged per-pixel offsets
              compounded on top of that (reverse-engineered from manual move
              edits) fought the baseline alignment rather than working with
              it, and the mismatch between what the browser's flex layout
              actually does and what those fixed numbers assumed is exactly
              what showed up as SHOP NOW sitting noticeably higher than CODE
              in the Figma export. */}
          {codeLabel !== undefined ? <>
            <Editable id={`${id}/code/label`} style={{ fontSize: 33.867, fontWeight: 400 }}>{codeLabel}</Editable>
            <Editable id={`${id}/code/value`} style={{ fontSize: 33.867, fontWeight: 800 }}>{codeWord}</Editable>
          </> : <Editable id={`${id}/code`} style={{ fontSize: 33.867, fontWeight: 400 }}>{codeWord}</Editable>}
          <Editable as="span" id={`${id}/divider`} style={{ fontSize: 33.867 }}>|</Editable>
          <Editable id={`${id}/cta`} style={{ fontSize: 33.867, fontWeight: 700 }}>{`${cta} >`}</Editable>
        </div>
      </div>

      {/* Brand strip: flat, unrotated, below the card -- space-between so
          the three logos + "& More" spread evenly across the row. */}
      <div style={{ position: 'absolute', left: 93, top: 1236, right: 93, height: 78.64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Up to 4 real/placeholder brand logos, no "& More" label -- see
            the email headers for why. */}
        {brands.slice(0, 4).map((brand, n) =>
          <BrandMark key={brand} id={`${id}/brand/${n}`} name={brand}
            fallback={`/logos/brand-${PLACEHOLDER_BRANDS[n % PLACEHOLDER_BRANDS.length]}.svg`}
            style={{ width: [156, 238, 136, 156][n] ?? 180, height: [68, 65, 74, 68][n] ?? 74, objectFit: 'contain' }} />)}
      </div>
    </div>
  </Ground>;
}
