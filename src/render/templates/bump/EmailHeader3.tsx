/** Bump email send 3's header/hero -- embedded "Email Hero" inside
 *  `email-body/3` (1200x929, smallest of the three -- confirmed this send
 *  is genuinely a different frame size, not just different copy). Card:
 *  728.21x322.89, left:36.58 (near the left edge, not centered like sends
 *  1/2), rotate(-4.32deg). Same real-vertical-rule CODE/SHOP NOW pattern,
 *  tops pinned together for the same reason as EmailHeader1.tsx. */
import type { SheetAsset } from '../../../sheet/types';
import { Editable, Ground } from '../../../edit/Editable';
import { Media } from '../../../edit/Media';
import { Picture } from '../../../edit/Picture';
import { stack } from '../../../fonts';
import { ZONE_LIST, photoFor } from '../../../model/compose';
import { useEdits, textOf } from '../../../edit/store';
import { fitText } from '../../../model/textContracts';
import { BrandMark } from '../BrandMark';

const FRAME_W = 1200, FRAME_H = 929;
const CARD = { left: 36.58, top: 250.55, width: 728.21, height: 322.89 };

// Known, real logo assets to cycle through when a brief names a brand the library doesn't stock -- a template slot stays a logo-shaped placeholder the designer swaps, not blank or a text label.
const PLACEHOLDER_BRANDS = ['the-north-face', 'patagonia', 'mountain-hardwear'];

export function BumpEmailHeader3({ asset }: { asset: SheetAsset }) {
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
  const urgency = textOf(edits, `${id}/marquee`, asset.copy.marquee || 'LAST CHANCE');
  const brands = asset.media.brands?.length
    ? asset.media.brands : ['the-north-face', 'patagonia', 'mountain-hardwear'];

  const zone = ZONE_LIST.find(z => z.id === asset.media.photo)
    ?? ZONE_LIST.find(z => z.id === 'climb-03') ?? photoFor('hike', 0);
  const offerWidthBudget = CARD.width - 39.5 * 2;
  const offerFontSize = Math.min(
    fitText(lead, 'hero.title', { widthBudget: offerWidthBudget, fontMax: 133.845, charFactor: .6 }).fontSize,
    fitText(offer, 'hero.offer', { widthBudget: offerWidthBudget, fontMax: 133.845, charFactor: .6 }).fontSize,
  );

  return <Ground id={`${id}/fill`} className="sheet" style={{ width: w, height: h,
    position: 'relative', overflow: 'hidden', background: '#6D6D6D' }}>
    <div style={{ position: 'absolute', width: FRAME_W, height: FRAME_H,
      transform: `scale(${w / FRAME_W},${h / FRAME_H})`, transformOrigin: 'top left' }}>
      {/* No `initialSrc` here -- "/reference/bump-hero-photo.jpg" never existed
          on disk, which is why this hero rendered blank. The zone fallback
          above already resolves to climb-03, and Picture falls through to
          that zone's real photo (/photos/climb-03.jpg) once initialSrc is
          gone. */}
      <Picture id={`${id}/photo`} zone={zone}
        initialScale={1} focus={{ x: 58.33, y: 100 }}
        style={{ position: 'absolute', inset: 0 }} />
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'linear-gradient(180deg,#0003 0%,#0000 45%,#0008 100%)' }} />

      {/* Solid colour band behind the ticker -- this variant's marquee sits
          on a flat orange strip, not directly on the photo. */}
      <div style={{ position: 'absolute', left: 0, top: 0, width: FRAME_W, height: 95, background: '#F14222' }} />

      <div style={{ position: 'absolute', left: -15, top: 14, width: 1240, overflow: 'hidden',
        whiteSpace: 'nowrap', color: '#fff', fontFamily: stack('Quiet Sans'),
        fontSize: 65, fontWeight: 800, letterSpacing: -1.5, lineHeight: 1.2 }}>
        {Array.from({ length: 4 }, (_, n) => <span key={n}>
          <Editable as="span" id={`${id}/marquee/${n}`}>{urgency}</Editable>
          <Editable as="span" id={`${id}/marquee-divider/${n}`}
            style={{ margin: '0 24px', fontWeight: 400 }}>|</Editable></span>)}
      </div>

      <div style={{ position: 'absolute', ...CARD,
        filter: 'drop-shadow(3.11716px 3.11716px 89.9301px rgba(0,0,0,.25)) '
          + 'drop-shadow(3.11716px 3.11716px 5.14331px rgba(0,0,0,.25))',
        transform: 'rotate(-4.32deg)' }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: 13.6819,
          background: 'url(Texturelabs_Paper_354XL.jpg), #F14222', backgroundBlendMode: 'screen, normal' }} />
        <div style={{ position: 'absolute', left: 663.88, top: 22.63, width: 37.69, height: 35,
          borderRadius: '50%', background: '#D9D9D9' }} />

        <Editable id={`${id}/offer`} as="h1" style={{ position: 'absolute', left: 39.5, top: 20,
          margin: 0, whiteSpace: 'pre-line', color: '#fff', fontFamily: stack('Quiet Sans'),
          fontWeight: 800, fontSize: offerFontSize, lineHeight: '110px',
          width: 595.92 }}>{`${lead}\n${offer}`}</Editable>

        <div style={{ position: 'absolute', left: 39.5, top: 272, display: 'flex', alignItems: 'baseline',
          gap: 10, whiteSpace: 'nowrap', color: '#fff', fontFamily: stack('Quiet Sans'),
          fontSize: 37.4451, letterSpacing: '0.1em', lineHeight: 1 }}>
          {codeLabel !== undefined ? <>
            <Editable id={`${id}/code/label`} style={{ fontWeight: 400 }}>{codeLabel}</Editable>
            <Editable id={`${id}/code/value`} style={{ fontWeight: 800 }}>{codeWord}</Editable>
          </> : <Editable id={`${id}/code`} style={{ fontWeight: 400 }}>{codeWord}</Editable>}
          <Editable as="span" id={`${id}/divider`}>|</Editable>
          <Editable id={`${id}/cta`} style={{ fontWeight: 700 }}>{`${cta} >`}</Editable>
        </div>
      </div>

      <div style={{ position: 'absolute', left: 78, top: 795, right: 78, height: 87.62,
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
