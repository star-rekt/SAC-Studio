/** Bump paid-social-1x1. Same ticket-tag card as `EmailHero.tsx`, plus a
 *  vertical "steep&cheap powered by Backcountry" lockup along the card's
 *  left edge (the board's own sub-brand badge, confirmed from the source:
 *  "Group 2910"/"Group 2909" are its vector paths, rotated -94.03deg
 *  absolute against the card's own -4.03deg -- i.e. -90deg of its own,
 *  turned to read bottom-to-top along the card's left side).
 *
 *  Unlike email-hero.txt, this board's own CSS export reports every
 *  position as a percentage of the FULL 1080x1080 FRAME, even for layers
 *  nested several groups deep (confirmed: "Subtract"'s left:5.74% is
 *  exactly 62px, the same absolute px the card itself sits at) -- so the
 *  conversion here is frame-% throughout, not the parent-group-relative
 *  math email-hero's text layers needed. Each value below is still made
 *  relative to the card's own box before being used, since every one of
 *  these elements is nested inside the single rotated card wrapper. */
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

const FRAME = 1080;
// Card ("Group 2918"): width:935, left:calc(50% - 935/2 - 10.5), top:47.22%,
// bottom:21.72% of the frame.
const CARD = {
  left: FRAME / 2 - 935 / 2 - 10.5,
  top: FRAME * 0.4722,
  width: 935,
  height: FRAME * (1 - 0.4722 - 0.2172),
};
const pct = (p: number, basis: number) => (p / 100) * basis;

const txt = (left: number, top: number, fontSize: number,
  extra?: React.CSSProperties): React.CSSProperties => ({ position: 'absolute', left, top,
  fontFamily: stack('Quiet Sans'), fontSize, lineHeight: 1,
  textBoxTrim: 'trim-both', textBoxEdge: 'cap alphabetic', ...extra } as React.CSSProperties);

// Known, real logo assets to cycle through when a brief names a brand the library doesn't stock -- a template slot stays a logo-shaped placeholder the designer swaps, not blank or a text label.
const PLACEHOLDER_BRANDS = ['the-north-face', 'patagonia', 'mountain-hardwear'];

export function BumpSocial1x1({ asset, direction }: { asset: SheetAsset; direction?: Direction }) {
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

  // Shared left edge for the stacked offer text and the CODE|CTA row below it
  // -- the real Figma value (26.33% of the frame). The -50 this used to carry
  // was compensating for the wordmark lockup sitting in the wrong place; now
  // that it's positioned off the real Group 2910/2909 data, this needs to be
  // the real number too, or the two drift back out of sync with each other.
  const cardTextLeft = pct(26.33, FRAME) - CARD.left;
  const extraFontSize = Math.min(
    fitText(lead, 'hero.title', { widthBudget: FRAME * (1 - 0.2633 - 0.2034), fontMax: 125.246, charFactor: .6 }).fontSize,
    fitText(offer, 'hero.offer', { widthBudget: FRAME * (1 - 0.2633 - 0.2034), fontMax: 125.246, charFactor: .6 }).fontSize,
  );
  const zone = ZONE_LIST.find(z => z.id === asset.media.photo) ?? photoFor('hike', 0);

  return <Ground id={`${id}/fill`} className="sheet" style={{ width: w, height: h,
    position: 'relative', overflow: 'hidden', background: '#838383', clipPath }}>
    <div style={{ position: 'absolute', width: FRAME, height: FRAME,
      transform: `scale(${w / FRAME},${h / FRAME})`, transformOrigin: 'top left' }}>
      <Picture id={`${id}/photo`} zone={zone} initialSrc="/reference/autumn-social-photo.jpg"
        initialScale={1} focus={{ x: 50, y: 50 }}
        style={{ position: 'absolute', inset: 0 }} />

      {/* The card: one rotated wrapper, same as email-hero -- everything
          inside sits in its own 0,0-origin space and inherits the single
          tilt, nothing re-declares it. */}
      <div style={{ position: 'absolute', ...CARD,
        filter: 'drop-shadow(3.24098px 3.24098px 93.5022px rgba(0,0,0,.25)) '
          + 'drop-shadow(3.24098px 3.24098px 5.34761px rgba(0,0,0,.25))',
        transform: 'rotate(-4.03deg)' }}>
        {/* The real ticket/punched-corner mark from the library -- same
            component `EmailHeader1.tsx`/`EmailHero.tsx` use, not a fixed
            texture image standing in for it. Its own SVG path (evenodd)
            already cuts the punched corner as a true hole, recolourable and
            swappable like every other library mark. */}
        <Media id={`${id}/ticket/mark`} src="/graphics/ticket-tag.svg" alt="Ticket"
          title="Click to recolour, resize or swap the ticket shape from the library"
          style={{ position: 'absolute', inset: 0, width: CARD.width, height: CARD.height }} />

        {/* Vertical "steep&cheap / powered by Backcountry" lockup along the
            card's left edge -- confirmed correct asset via the real session
            edit (Bump_ALPINE20 swapped this slot to
            `/reference/flash-wordmark.png`, the Flash board's own reversed
            wordmark): full lockup, white type, green "&" and rule, "powered
            by Backcountry" included, nothing to add back on top of it. */}
        <Media id={`${id}/wordmark`} src="/reference/flash-wordmark.png" alt="Steep & Cheap, powered by Backcountry"
          style={{ position: 'absolute', left: 54.9, top: 100.7,
            width: 242, height: 110.3, transform: 'rotate(-90deg)' }} />

        {/* "EXTRA\n20% OFF" and the CODE | CTA row share one left edge --
            the "C" of CODE lines up under the "E"/"2" above. Baked in from
            the Bump_ALPINE20 session's own saved nudges (its `move` edits on
            these four elements, folded into the base position here so a new
            asset starts where that session ended up, instead of a plain
            template default plus a leftover per-session offset stacked on
            top of it): extra +50,-17.65; the code/divider/cta row carries
            code's own +52.94,-8.82, with divider/cta's own small additional
            deltas applied as their own transform. */}
        <Editable id={`${id}/extra`} style={txt(
          cardTextLeft + 50, pct(51.37, FRAME) - CARD.top - 17.65, extraFontSize,
          { fontWeight: 800, lineHeight: '115px', letterSpacing: '-0.02em',
            color: '#FFFFFF', whiteSpace: 'pre-line',
            width: FRAME * (1 - 0.2633 - 0.2034) })}>{`${lead}\n${offer}`}</Editable>

        {/* fontSize lives on each Editable itself, not just the flex
            wrapper -- the per-element size-scale control (`sizeOf`) only
            multiplies a NUMERIC `fontSize` on that same element's own style;
            reading it off an inherited parent font-size left these three
            with nothing of their own to scale, so resizing any of them from
            the panel silently did nothing. */}
        <div style={{ position: 'absolute',
          left: cardTextLeft + 52.94, top: pct(72, FRAME) - CARD.top - 5 - 8.82,
          display: 'flex', alignItems: 'baseline', gap: 13, whiteSpace: 'nowrap',
          color: '#fff', fontFamily: stack('Quiet Sans'), lineHeight: 1 }}>
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
            <Editable id={`${id}/code/label`} style={{ fontSize: 41.31 }}>{codeLabel}</Editable>
            <Editable id={`${id}/code/value`} style={{ fontSize: 41.31, fontWeight: 800 }}>{codeWord}</Editable>
          </> : <Editable id={`${id}/code`} style={{ fontSize: 41.31 }}>{codeWord}</Editable>}
          <Editable as="span" id={`${id}/divider`} style={{ fontSize: 35.01 }}>|</Editable>
          <Editable id={`${id}/cta`} style={{ fontSize: 35.01, fontWeight: 800, letterSpacing: 1 }}>{`${cta} >`}</Editable>
        </div>
      </div>

      {/* Brand strip: flat, unrotated, below the card -- space-between so
          the three logos + "& More" spread evenly across the row instead of
          clumping on one side. */}
      <div style={{ position: 'absolute', left: 33, top: 962, right: 33, height: 86,
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
