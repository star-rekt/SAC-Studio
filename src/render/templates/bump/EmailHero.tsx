/** Bump email-hero. Structurally the same card this board family already
 *  ships for Autumn (`AutumnEmail.tsx`): full-bleed photo, a looping marquee
 *  ticker, one punched ticket-tag card holding the stacked offer and a
 *  flex CODE | divider | CTA row, and a brand strip with an "& More" tail.
 *  Confirmed against the real reference render -- same shape, same frame
 *  size (1200x826), Bump's own colour/photo/copy.
 *
 *  The code/divider/cta row is a flex row with `gap`, not three fixed
 *  positions -- real brief text replaces "CODE AUTUMN20"/"Shop Now" and a
 *  flex row reflows with it instead of overlapping or clipping. */
import type { SheetAsset } from '../../../sheet/types';
import { Editable, Ground } from '../../../edit/Editable';
import { Media } from '../../../edit/Media';
import { Picture } from '../../../edit/Picture';
import { ZONE_LIST, photoFor } from '../../../model/compose';
import { stack } from '../../../fonts';
import { useEdits, textOf } from '../../../edit/store';
import { fitText } from '../../../model/textContracts';
import { BrandMark } from '../BrandMark';

const FRAME_W = 1200, FRAME_H = 1125;
// Card box: 903.42x400.58, left:137.3, top:477, rotate(-3.31deg).
const CARD = { left: 137.3, top: 477, width: 903.42, height: 400.58 };

// Known, real logo assets to cycle through when a brief names a brand the library doesn't stock -- a template slot stays a logo-shaped placeholder the designer swaps, not blank or a text label.
const PLACEHOLDER_BRANDS = ['the-north-face', 'patagonia', 'mountain-hardwear'];

export function BumpEmailHero({ asset }: { asset: SheetAsset }) {
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
  const urgency = textOf(edits, `${id}/marquee`,
    asset.copy.marquee || asset.copy.eyebrow || '3 DAYS ONLY');
  const brands = asset.media.brands?.length
    ? asset.media.brands : ['the-north-face', 'patagonia', 'mountain-hardwear'];
  const zone = ZONE_LIST.find(z => z.id === asset.media.photo) ?? photoFor('hike', 0);
  const offerWidthBudget = 739.32;
  const offerFontSize = Math.min(
    fitText(lead, 'hero.title', { widthBudget: offerWidthBudget, fontMax: 166.05, charFactor: .6 }).fontSize,
    fitText(offer, 'hero.offer', { widthBudget: offerWidthBudget, fontMax: 166.05, charFactor: .6 }).fontSize,
  );

  return <Ground id={`${id}/fill`} className="sheet" style={{ width: w, height: h,
    position: 'relative', overflow: 'hidden', background: '#6D6D6D' }}>
    <div style={{ position: 'absolute', width: FRAME_W, height: FRAME_H,
      transform: `scale(${w / FRAME_W},${h / FRAME_H})`, transformOrigin: 'top left' }}>
      <Picture id={`${id}/photo`} zone={zone} initialSrc="/reference/autumn-social-photo.jpg"
        initialScale={1} focus={{ x: 50, y: 50 }}
        style={{ position: 'absolute', inset: 0 }} />
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'linear-gradient(180deg,#0003 0%,#0000 45%,#0008 100%)' }} />

      {/* Solid colour band behind the ticker -- this variant's marquee sits
          on a flat orange strip, not directly on the photo. */}
      <div style={{ position: 'absolute', left: 0, top: 0, width: FRAME_W, height: 95, background: '#F14222' }} />

      {/* Looping ticker -- four repeats wide enough that the seam never
          shows inside the 1200px frame, same approach as Autumn's. */}
      <div style={{ position: 'absolute', left: -15, top: 4, width: 1240, overflow: 'hidden',
        whiteSpace: 'nowrap', color: '#fff', fontFamily: stack('Quiet Sans'),
        fontSize: 65, fontWeight: 800, letterSpacing: -1.5, lineHeight: 1.2 }}>
        {Array.from({ length: 4 }, (_, n) => <span key={n}>
          <Editable as="span" id={`${id}/marquee/${n}`}>{urgency}</Editable>
          <Editable as="span" id={`${id}/marquee-divider/${n}`}
            style={{ margin: '0 24px', fontWeight: 400 }}>|</Editable></span>)}
      </div>

      {/* The ticket: one rotated wrapper, everything inside it in its own
          0,0-origin space so the single transform is the only tilt. */}
      <div style={{ position: 'absolute', ...CARD, transform: 'rotate(-3.31deg)' }}>
        <Media id={`${id}/ticket/mark`} src="/graphics/ticket-tag.svg" alt="Ticket"
          title="Click to recolour, resize or swap the ticket shape from the library"
          style={{ position: 'absolute', inset: 0, width: CARD.width, height: CARD.height }} />

        <Editable id={`${id}/offer`} as="h1" style={{ position: 'absolute', left: 48.22, top: 30,
          margin: 0, whiteSpace: 'pre-line', color: '#fff', fontFamily: stack('Quiet Sans'),
          fontWeight: 800, fontSize: offerFontSize, lineHeight: '137px',
          width: 739.32 }}>{`${lead}\n${offer}`}</Editable>

        <div style={{ position: 'absolute', left: 48.22, top: 325, display: 'flex', alignItems: 'baseline',
          gap: 13, whiteSpace: 'nowrap', color: '#fff', fontFamily: stack('Quiet Sans'),
          fontSize: 46.4547, letterSpacing: '0.1em', lineHeight: 1 }}>
          {codeLabel !== undefined ? <>
            <Editable id={`${id}/code/label`} style={{ fontWeight: 400 }}>{codeLabel}</Editable>
            <Editable id={`${id}/code/value`} style={{ fontWeight: 800 }}>{codeWord}</Editable>
          </> : <Editable id={`${id}/code`} style={{ fontWeight: 400 }}>{codeWord}</Editable>}
          <Editable as="span" id={`${id}/divider`}>|</Editable>
          <Editable id={`${id}/cta`} style={{ fontWeight: 700 }}>{`${cta} >`}</Editable>
        </div>
      </div>

      {/* Brand strip, same box Autumn uses -- this is the one piece of this
          design that genuinely doesn't move between the two boards
          (confirmed: identical frame size, identical bottom margin). */}
      <div style={{ position: 'absolute', left: 78, top: 990, right: 78, height: 87.62,
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
