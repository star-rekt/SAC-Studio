/** Bump hero-desktop/ends component for "ENDS TODAY" phase.
 *
 * Template ID: sc26_0060 (Bump)
 * Format: hero-desktop (1440x920)
 * Phase: ends-today
 */

import type { SheetAsset } from '../../../sheet/types';
import { Editable, Ground } from '../../../edit/Editable';
import { Media } from '../../../edit/Media';
import { Picture } from '../../../edit/Picture';
import { ZONE_LIST, photoFor } from '../../../model/compose';
import { stack } from '../../../fonts';
import { useEdits, textOf } from '../../../edit/store';
import { fitText } from '../../../model/textContracts';

// Constants
const ink = '#333';
const orange = '#f14222';
const bg = '#f5ecdf';

/** Scale the design to the target size while preserving proportions. */
const base = (w: number, h: number, bw: number, bh: number): React.CSSProperties => ({
  position: 'absolute', width: bw, height: bh,
  transform: `scale(${w / bw},${h / bh})`, transformOrigin: 'top left',
});

/** Text styled for Figma's cap-height trimming (textBoxTrim/textBoxEdge). */
const txt = (left: number, top: number, fontSize: number,
  extra?: React.CSSProperties): React.CSSProperties => ({
    position: 'absolute', left, top,
    fontFamily: stack('Quiet Sans'), fontSize, lineHeight: 1,
    textBoxTrim: 'trim-both', textBoxEdge: 'cap alphabetic', ...extra
  } as React.CSSProperties);

/**
 * Image card component with rounded corners.
 */
function ImageCard({
  id, src, style, zone
}: {
  id: string; src: string; style: React.CSSProperties; zone: ReturnType<typeof photoFor>;
}) {
  return (
    <div style={{ ...style, borderRadius: 13, overflow: 'hidden' }}>
      <Picture
        id={id}
        zone={zone}
        initialSrc={src}
        initialScale={1}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      />
    </div>
  );
}

/**
 * Bump hero-desktop/ends component
 *
 * Frame: 1440px wide x 920px tall, background #f5ecdf with texture overlay.
 * Layout: Top-left copy block + grid of 4 product images.
 */
export function HeroEndsToday({ asset }: { asset: SheetAsset }) {
  const [w, h] = asset.size;
  const { edits } = useEdits();

  // Extract live text values from asset or edits
  const urgency = textOf(edits, `${asset.id}/urgency`, asset.copy.marquee || asset.copy.eyebrow || 'ENDS TODAY');
  const offer = textOf(edits, `${asset.id}/offer`, asset.copy.offer || 'EXTRA 20% OFF');
  // Split so the code WORD can be bold without the label "CODE" also being
  // bold -- Editable is plain-string-only (no mixed-weight runs within one
  // field), so the two need their own ids. Only when a real code exists:
  // the qualifier/no-code fallback is free text, not a label+word pair.
  const codeLabel = asset.copy.code ? textOf(edits, `${asset.id}/code/label`, 'CODE ') : undefined;
  const codeWord = asset.copy.code
    ? textOf(edits, `${asset.id}/code/value`, asset.copy.code)
    : textOf(edits, `${asset.id}/code`, asset.copy.qualifier || 'CODE CHILLY20');
  const code = `${codeLabel ?? ''}${codeWord}`;
  const cta = textOf(edits, `${asset.id}/cta`, asset.copy.cta || 'Shop Now');

  // Fit text to available space
  const { fontSize: urgencyFontSize } = fitText(urgency, 'hero.urgency', { widthBudget: 1310, fontMax: 36 });
  const { fontSize: offerFontSize } = fitText(offer, 'hero.title', { widthBudget: 900, fontMax: 97 });
  const { fontSize: codeFontSize } = fitText(code, 'hero.code', { widthBudget: 694, fontMax: 60 });
  const { fontSize: ctaFontSize } = fitText(cta, 'hero.cta', { widthBudget: 120, fontMax: 47 });

  // Offer and code follow the line above them rather than a measured
  // absolute: both are shrink-to-fit, so a fixed top only held for the
  // board's own copy length and drifted out of rhythm (or overlapped) for
  // any other. The ratios are the gap the board actually measured, divided
  // by the font size that produced it.
  const offerTop = 48 + urgencyFontSize! * 1.0397;
  const codeTop = offerTop + offerFontSize! * 1.1016;

  return (
    <Ground id={`${asset.id}/fill`} className="sheet" style={{
      width: w, height: h, position: 'relative', overflow: 'hidden',
      background: bg,
    }}>
      <div style={base(w, h, 1440, 920)}>
        {/* Background texture overlay */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: `url('/graphics/bump-texture.png')`,
          backgroundSize: '339.04px 226.03px',
          backgroundPosition: 'top left',
          mixBlendMode: 'darken',
          opacity: 0.4,
        }} />

        {/* Copy block - top left. Needs an explicit size: every child here is
            itself `position: absolute`, so with none this box has no
            intrinsic size at all (0x0) -- which is fine for the text (it
            positions in px, unaffected by the container's size) but silently
            broke the CTA button below, whose position is a PERCENTAGE
            `inset` -- a percent of nothing is nothing, so it measured
            against a collapsed box instead of the 1440x920 frame Figma
            actually measured it against. */}
        <div style={{ position: 'absolute', left: 0, top: 48, width: 1440, height: 920 - 48 }}>
          {/* Urgency text */}
          <Editable
            id={`${asset.id}/urgency`}
            style={txt(72, 48, urgencyFontSize!, {
              fontFamily: stack('Quiet Sans'),
              fontWeight: 800,
              color: orange,
              letterSpacing: '6.55px',
              width: 1310,
            })}
          >
            {urgency}
          </Editable>

          {/* Offer text */}
          <Editable
            id={`${asset.id}/offer`}
            style={txt(72, offerTop, offerFontSize!, {
              fontFamily: stack('Quiet Sans'),
              fontWeight: 800,
              color: ink,
              letterSpacing: '-0.87px',
              whiteSpace: 'nowrap',
            })}
          >
            {offer}
          </Editable>

          {/* Code text */}
          <div style={txt(72, codeTop, codeFontSize!, {
            fontFamily: stack('Quiet Sans'),
            fontWeight: 400,
            color: ink,
            width: 694,
          })}>
            {codeLabel !== undefined ? <>
              <Editable as="span" id={`${asset.id}/code/label`}>{codeLabel}</Editable>
              <Editable as="span" id={`${asset.id}/code/value`} style={{ fontWeight: 800 }}>{codeWord}</Editable>
            </> : <Editable as="span" id={`${asset.id}/code`}>{codeWord}</Editable>}
          </div>

          {/* CTA button */}
          <div style={{
            position: 'absolute',
            left: 72, top: 872 * 0.3261, width: 1440 * (1 - 0.05 - 0.7368),
            height: 872 * (1 - 0.3261 - 0.5696),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Media id={`${asset.id}/cta/mark`} src="/graphics/pill-soft.svg" fill={ink}
              style={{ position: 'absolute', inset: 0 }} />
            <Editable
              id={`${asset.id}/cta`}
              style={{
                position: 'relative',
                fontFamily: stack('Sofia Pro'),
                fontWeight: 700,
                fontSize: ctaFontSize!,
                color: '#fff',
                textTransform: 'capitalize',
                letterSpacing: '-0.47px',
                whiteSpace: 'nowrap',
                lineHeight: 1,
              }}
            >
              {cta}
            </Editable>
          </div>
        </div>

        {/* Image grid - 4 product cards. Each card's own left/top is already
            canvas-absolute (card 3/4 at left:962 only fit a 1440-wide frame
            that way); this wrapper adding its own left:55,top:286 on top
            double-counted the offset and pushed every card ~250px past the
            canvas's bottom edge, clipped silently by the frame's own
            overflow:hidden -- which is what "image sizes are wrong" was. */}
        <div style={{ position: 'absolute', left: 0, top: 0 }}>
          {/* Card 1 - bottom left (431x446) */}
          <ImageCard
            id={`${asset.id}/image-1`}
            src="/reference/bump-product-1.jpg"
            zone={ZONE_LIST.find(z => z.id === asset.media.photo) ?? photoFor('hike', 0)}
            style={{
              position: 'absolute',
              left: 72,
              top: 435,
              width: 431,
              height: 446,
            }}
          />

          {/* Card 2 - center tall (414x595) */}
          <ImageCard
            id={`${asset.id}/image-2`}
            src="/reference/bump-product-2.jpg"
            zone={ZONE_LIST.find(z => z.id === asset.media.photo) ?? photoFor('hike', 1)}
            style={{
              position: 'absolute',
              left: 517,
              top: 286,
              width: 414,
              height: 595,
            }}
          />

          {/* Card 3 - top right (427x305) */}
          <ImageCard
            id={`${asset.id}/image-3`}
            src="/reference/bump-product-3.jpg"
            zone={ZONE_LIST.find(z => z.id === asset.media.photo) ?? photoFor('hike', 2)}
            style={{
              position: 'absolute',
              left: 941,
              top: 286,
              width: 427,
              height: 305,
            }}
          />

          {/* Card 4 - bottom right (427x259) */}
          <ImageCard
            id={`${asset.id}/image-4`}
            src="/reference/bump-product-4.jpg"
            zone={ZONE_LIST.find(z => z.id === asset.media.photo) ?? photoFor('hike', 3)}
            style={{
              position: 'absolute',
              left: 941,
              top: 622,
              width: 427,
              height: 259,
            }}
          />
        </div>
      </div>
    </Ground>
  );
}
