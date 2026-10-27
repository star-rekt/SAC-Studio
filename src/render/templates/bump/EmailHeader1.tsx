/** Bump email send 1's header/hero -- embedded "Email Hero" section inside
 *  `email-body` (1200x1125, the biggest of the three sends -- confirmed by
 *  reading each send's own embedded hero geometry directly, not the
 *  top-level "email-hero"/"email-hero/2" sections, which turned out to
 *  belong to neither send literally). Card: 903.42x400.58, left:137.3,
 *  rotate(-3.31deg). CODE/SHOP NOW use a real vertical rule, not a flex `|`,
 *  same as send 2/3 and paid-social-9x16; their raw top values differ by
 *  ~20px in the Figma export the same way every other instance of this
 *  pair does (likely a regular/bold cap-height quirk), so both are pinned
 *  to one shared top here instead of carried over mismatched. */
import type { SheetAsset } from '../../../sheet/types';
import { Editable, Ground } from '../../../edit/Editable';
import { Picture } from '../../../edit/Picture';
import { Media } from '../../../edit/Media';
import { stack } from '../../../fonts';
import { ZONE_LIST, photoFor } from '../../../model/compose';
import { useEdits, textOf } from '../../../edit/store';
import { fitText } from '../../../model/textContracts';
import { BrandMark } from '../BrandMark';

const FRAME_W = 1200, FRAME_H = 826;
const CARD = { left: 372, top: FRAME_H / 2 - 336.79 / 2 - 17.45, width: 759.56, height: 336.79 };

// Known, real logo assets to cycle through when a brief names a brand the library doesn't stock -- a template slot stays a logo-shaped placeholder the designer swaps, not blank or a text label.
const PLACEHOLDER_BRANDS = ['the-north-face', 'patagonia', 'mountain-hardwear'];

export function BumpEmailHeader1({ asset }: { asset: SheetAsset }) {
  const [w, h] = asset.size;
  const { edits } = useEdits();
  const id = asset.id;

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
  const urgency = textOf(edits, `${id}/marquee`, asset.copy.marquee || '3 DAYS ONLY');
  const brands = asset.media.brands?.length
    ? asset.media.brands : ['the-north-face', 'patagonia', 'mountain-hardwear'];

  const zone = ZONE_LIST.find(z => z.id === asset.media.photo) ?? photoFor('hike', 0);
  const offerWidthBudget = CARD.width - 39 * 2;
  const offerFontSize = Math.min(
    fitText(lead, 'hero.title', { widthBudget: offerWidthBudget, fontMax: 139.6, charFactor: .6 }).fontSize,
    fitText(offer, 'hero.offer', { widthBudget: offerWidthBudget, fontMax: 139.6, charFactor: .6 }).fontSize,
  );

  return <Ground id={`${id}/fill`} className="sheet" style={{ width: w, height: h,
    position: 'relative', overflow: 'hidden', background: '#6D6D6D' }}>
    <div style={{ position: 'absolute', width: FRAME_W, height: FRAME_H,
      transform: `scale(${w / FRAME_W},${h / FRAME_H})`, transformOrigin: 'top left' }}>
      <Picture id={`${id}/photo`} zone={zone} initialSrc="/reference/autumn-email-photo.jpg"
        initialScale={1.13} focus={{ x: 100, y: 95 }}
        style={{ position: 'absolute', inset: 0 }} />
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'linear-gradient(180deg,#0003 0%,#0000 45%,#0008 100%)' }} />

      <div style={{ position: 'absolute', left: -15, top: 14, width: 1240, overflow: 'hidden',
        whiteSpace: 'nowrap', color: '#fff', fontFamily: stack('Quiet Sans'),
        fontSize: 65, fontWeight: 800, letterSpacing: -1.5, lineHeight: 1.2 }}>
        {Array.from({ length: 4 }, (_, n) => <span key={n}>
          <Editable as="span" id={`${id}/marquee/${n}`}>{urgency}</Editable>
          <Editable as="span" id={`${id}/marquee-divider/${n}`}
            style={{ margin: '0 24px', fontWeight: 400 }}>|</Editable></span>)}
      </div>

      <div style={{ position: 'absolute', ...CARD,
        filter: 'drop-shadow(3.86718px 3.86718px 111.568px rgba(0,0,0,.25)) '
          + 'drop-shadow(3.86718px 3.86718px 6.38084px rgba(0,0,0,.25))',
        transform: 'rotate(-2.7deg)' }}>
        <Media id={`${id}/ticket/mark`} src="/graphics/ticket-tag.svg" alt="Ticket"
          title="Click to recolour, resize or swap the ticket shape from the library"
          style={{ position: 'absolute', inset: 0, width: CARD.width, height: CARD.height }} />

        {/* Real brief text (e.g. a long offer like "Spooky Good Deals") has
            no fixed cap otherwise, and a fixed 139.6px size would spill
            straight into the CODE/CTA row below it. Fit both lines, use the
            smaller result so neither overflows the card's own width. */}
        <Editable id={`${id}/offer`} as="h1" style={{ position: 'absolute', left: 39, top: 18,
          margin: 0, whiteSpace: 'pre-line', color: '#fff', fontFamily: stack('Quiet Sans'),
          fontWeight: 800, fontSize: offerFontSize, letterSpacing: -3,
          lineHeight: .83 }}>{`${lead}\n${offer}`}</Editable>

        <div style={{ position: 'absolute', left: 46, top: 265, display: 'flex', alignItems: 'baseline',
          gap: 13, whiteSpace: 'nowrap', color: '#fff', fontFamily: stack('Quiet Sans'),
          fontSize: 37, lineHeight: 1 }}>
          {codeLabel !== undefined ? <>
            <Editable id={`${id}/code/label`}>{codeLabel}</Editable>
            <Editable id={`${id}/code/value`} style={{ fontWeight: 800 }}>{codeWord}</Editable>
          </> : <Editable id={`${id}/code`}>{codeWord}</Editable>}
          <Editable as="span" id={`${id}/divider`}>|</Editable>
          <Editable id={`${id}/cta`} style={{ fontWeight: 800, letterSpacing: 1 }}>{`${cta} >`}</Editable>
        </div>
      </div>

      <div style={{ position: 'absolute', left: 84, right: 84, bottom: 25, height: 94,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Up to 4 real/placeholder brand logos, no "& More" label -- a
            static "more exist" tail wasn't swappable and stayed even when a
            brief named 4 brands or fewer (nothing more to point at). Every
            slot here is a real, swappable logo image instead. */}
        {brands.slice(0, 4).map((brand, n) =>
          <BrandMark key={brand} id={`${id}/brand/${n}`} name={brand}
            fallback={`/logos/brand-${PLACEHOLDER_BRANDS[n % PLACEHOLDER_BRANDS.length]}.svg`}
            style={{ width: [165, 230, 170, 165][n] ?? 180, height: 86, objectFit: 'contain' }} />)}
      </div>
    </div>
  </Ground>;
}
