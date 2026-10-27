/** Bump Social 9x16 component, transcribed from Figma design.
 *
 * Template ID: sc26_0060 (Bump)
 * Format: paid-social-9x16 (1080x1920)
 */

import type { SheetAsset } from '../../../sheet/types';
import { Editable, Ground } from '../../../edit/Editable';
import { Media } from '../../../edit/Media';
import { Picture } from '../../../edit/Picture';
import { ZONE_LIST, photoFor } from '../../../model/compose';
import { stack } from '../../../fonts';
import { useEdits, textOf } from '../../../edit/store';
import { fitText } from '../../../model/textContracts';
import WINDOW from '../../../data/bump2-window.json';

// Base styles and constants
const ink = '#333';
const green = '#79ac41';
const orange = '#f14222';

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
 * Bump Social 9x16 component
 *
 * Frame: 1080px wide x 1920px tall, background #f5ecdf with texture overlay.
 */
export function BumpSocial9x16({ asset }: { asset: SheetAsset }) {
  const [w, h] = asset.size;
  const { edits } = useEdits();

  // Extract live text values from asset or edits
  const urgency = textOf(edits, `${asset.id}/urgency`, asset.copy.marquee || asset.copy.eyebrow || '4 DAYS ONLY');
  const lead = textOf(edits, `${asset.id}/lead`, asset.copy.lead || 'EXTRA');
  const offer = textOf(edits, `${asset.id}/offer`, asset.copy.offer || '20% OFF');
  // Split so the code WORD can be bold without the label "CODE" also being
  // bold -- Editable is plain-string-only (no mixed-weight runs within one
  // field), so the two need their own ids. Only when a real code exists:
  // the qualifier/no-code fallback is free text, not a label+word pair.
  const codeLabel = asset.copy.code ? textOf(edits, `${asset.id}/code/label`, 'CODE ') : undefined;
  const codeWord = asset.copy.code
    ? textOf(edits, `${asset.id}/code/value`, asset.copy.code)
    : textOf(edits, `${asset.id}/code`, asset.copy.qualifier || 'CODE CHILLY20');
  const cta = textOf(edits, `${asset.id}/cta`, asset.copy.cta || 'Shop Now');

  // Photo zone for the hero image
  const zone = ZONE_LIST.find(z => z.id === asset.media.photo) ?? photoFor('hike', 0);

  // Fit urgency text to available space
  const { fontSize: urgencyFontSize } = fitText(urgency, 'hero.urgency', { widthBudget: 400, fontMax: 48 });

  // Fit lead + offer text
  const { fontSize: leadFontSize } = fitText(lead, 'hero.title', { widthBudget: 600, fontMax: 115 });
  const { fontSize: offerFontSize } = fitText(offer, 'hero.offer', { widthBudget: 700, fontMax: 115 });

  // Fit code text
  const { fontSize: codeFontSize } = fitText((codeLabel ?? '') + codeWord, 'hero.code', { widthBudget: 676, fontMax: 93 });

  // Fit CTA text
  const { fontSize: ctaFontSize } = fitText(cta, 'hero.cta', { widthBudget: 430, fontMax: 59 });

  // Exact measured positions off node 569:9 (get_design_context), not a
  // derived ratio: urgency top 633, lead/offer top 703.83, code top 950.97,
  // cta top 1096.26 -- all canvas-absolute. The one dynamic adjustment kept
  // is offer-under-lead, using Figma's own line-height (68.37% of
  // leadFontSize) for the two-line "EXTRA / 20% OFF" stack.

  return (
    <Ground id={`${asset.id}/fill`} className="sheet" style={{
      width: w, height: h, position: 'relative', overflow: 'hidden',
      background: '#f5ecdf',
    }}>
      <div style={base(w, h, 1080, 1920)}>
        {/* Background texture overlay */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: `url('/reference/bump-paper.png')`,
          backgroundSize: '339.04px 226.03px',
          backgroundPosition: 'top left',
          mixBlendMode: 'darken',
          opacity: 0.4,
        }} />

        {/* The stepped window: same mechanism as paid-social-1x1's. The
            photo is clipped with the inline CSS `clip-path: path(...)`
            syntax -- not a CSS mask-image (a separately rasterized bitmap
            that can antialias a few px off the stroke outline) and not a
            `url(#id)` clipPath reference (silently failed to clip at all
            under this format's large non-uniform transform:scale() ratio)
            -- then the whole thing is scaled to the display box the same
            way `base()` is used everywhere else here. The outline is a
            real library mark (`Media`, mask-recolorable from the editor),
            not a hardcoded stroke colour. */}
        <div data-clip="bump2-window" data-clip-stroke={green}
          data-clip-width={WINDOW.strokeWeight}
          style={{
            position: 'absolute',
            left: 'calc(50% - 12.5px)', top: 'calc(50% - 98px)',
            transform: 'translate(-50%, -50%)',
            width: 983, height: 1314, overflow: 'hidden',
          }}>
          <div style={base(983, 1314, WINDOW.width, WINDOW.height)}>
            <Picture
              id={`${asset.id}/hero-photo`}
              zone={zone}
              initialSrc="/reference/bump-social-hero.png"
              initialScale={1}
              focus={{ x: 50, y: 50 }}
              style={{
                position: 'absolute', inset: 0,
                clipPath: `path("${WINDOW.path}")`,
              }}
            />
            <Media id={`${asset.id}/window/mark`} src="/graphics/bump2-window-outline.svg"
              fill={green} alt="Window outline"
              style={{ position: 'absolute', inset: 0 }} />
          </div>
        </div>

        {/* Copy block overlay on left side. Top is 1x1's own starting
            position (252 of 1080, 23.3% down) scaled to this frame's
            height (1920) -- not the flat 633px this had before, which put
            the block at 33% down, compressed into the middle of the taller
            frame instead of spanning it the way the window's own steps
            (which stretch with the frame) do. */}
        {/* Urgency text */}
        <Editable
          id={`${asset.id}/urgency`}
          style={txt(40.57, 633, urgencyFontSize!, {
            fontFamily: stack('Quiet Sans'),
            fontWeight: 800,
            color: green,
            whiteSpace: 'nowrap',
            letterSpacing: '5.36px',
          })}
        >
          {urgency}
        </Editable>

        {/* Lead + Offer text (stacked) */}
        <Editable
          id={`${asset.id}/lead`}
          style={txt(35, 703.83, leadFontSize!, {
            fontFamily: stack('Quiet Sans'),
            fontWeight: 800,
            color: ink,
            whiteSpace: 'nowrap',
            letterSpacing: '-1.34px',
          })}
        >
          {lead}
        </Editable>
        <Editable
          id={`${asset.id}/offer`}
          style={txt(35, 703.83 + leadFontSize! * 0.95, offerFontSize!, {
            fontFamily: stack('Quiet Sans'),
            fontWeight: 800,
            color: ink,
            whiteSpace: 'nowrap',
            letterSpacing: '-1.34px',
          })}
        >
          {offer}
        </Editable>

        {/* Code text */}
        <div style={txt(35, 950.97, codeFontSize!, {
          fontFamily: stack('Quiet Sans'),
          fontWeight: 400,
          color: ink,
          whiteSpace: 'nowrap',
        })}>
          {codeLabel !== undefined ? <>
            <Editable as="span" id={`${asset.id}/code/label`}>{codeLabel}</Editable>
            <Editable as="span" id={`${asset.id}/code/value`} style={{ fontWeight: 800 }}>{codeWord}</Editable>
          </> : <Editable as="span" id={`${asset.id}/code`}>{codeWord}</Editable>}
        </div>

        {/* CTA button */}
        <div style={{
          position: 'absolute',
          left: 45.75,
          top: 1096.26,
          width: 434.595,
          height: 110.96,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Media id={`${asset.id}/cta/mark`} src="/graphics/pill.svg" fill={ink}
            style={{ position: 'absolute', inset: 0 }} />
          <Editable
            id={`${asset.id}/cta`}
            style={{
              position: 'relative',
              fontFamily: stack('Quiet Sans'),
              fontWeight: 700,
              fontSize: ctaFontSize!,
              color: '#fff',
              height: 96,
              textTransform: 'capitalize',
              whiteSpace: 'nowrap',
              letterSpacing: '-0.59px',
              }}
            >
              {cta}
            </Editable>
        </div>

        {/* Brand logos at bottom */}
        <div style={{
          position: 'absolute',
          left: 'calc(50% + 0.12px)',
          top: 1480,
          transform: 'translateX(-50%)',
          width: 1080,
          height: 440,
        }}>
          {/* The North Face -- was wrongly set to the Steep & Cheap logo,
              duplicating the wordmark already shown near the copy block.
              Figma measures this against the full 1080x1920 canvas (inset
              77.19%/76.73%/19.23%/8.8%); converted to px within this div's
              own 1080x440 box (itself positioned at the canvas's top:1480). */}
          <Media
            id={`${asset.id}/brand-logo`}
            src="/logos/brand-the-north-face.svg"
            alt="The North Face"
            style={{
              position: 'absolute',
              left: 95.04, top: 2.0, width: 156.28, height: 68.8,
            }}
          />

          {/* Mountain Hardwear logo */}
          <Media
            id={`${asset.id}/mountain-hardwear-logo`}
            src="/logos/brand-mountain-hardwear.svg"
            alt="Mountain Hardwear"
            style={{
              position: 'absolute',
              left: 639.35,
              top: 0,
              marginTop: 56,
              width: 136.072,
              height: 74.43,
            }}
          />

          {/* Patagonia logo with text */}
          <div style={{
            position: 'absolute',
            left: 'calc(50% - 94.69px)',
            top: 'calc(50% + 566.06px)',
            transform: 'translate(-50%, -50%)',
            width: 238.076,
            height: 65.163,
          }}>
            <div style={{
              position: 'absolute',
              inset: '75.52% 15.63% -0.29% 13.19%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              fontFamily: stack('Sofia Pro'),
              fontWeight: 500,
              fontSize: 9.06,
              color: ink,
              textAlign: 'center',
              lineHeight: 0.79,
              letterSpacing: '-0.41px',
            }}>
              <p>Post season styles</p>
            </div>
            <Media
              id={`${asset.id}/patagonia-logo`}
              src="/logos/brand-patagonia.svg"
              alt="Patagonia"
              style={{
                position: 'absolute',
                inset: '0 3.66% 33.4% 0',
              }}
            />
          </div>

          {/* & More text */}
          <p style={{
            position: 'absolute',
            left: 917.83,
            top: 23.21,
            transform: 'translateX(-50%)',
            width: 134.819,
            height: 28.89,
            fontFamily: stack('Quiet Sans'),
            fontWeight: 700,
            fontSize: 40.823,
            color: ink,
            textAlign: 'center',
            textTransform: 'capitalize',
            letterSpacing: '-0.41px',
            lineHeight: 'normal',
          }}>
            & More
          </p>
        </div>

        {/* SAC Powered By logo (top right area) */}
        <Media
          id={`${asset.id}/sac-powered-by-logo`}
          src="/logos/sac-logo-dark.svg"
          alt="SAC Powered By"
          style={{
            position: 'absolute',
            inset: '25.89% 73.64% 68.82% 4.26%',
          }}
        />

        {/* Backcountry logo */}
        <Media
          id={`${asset.id}/backcountry-logo`}
          src="/logos/sac-logo-dark-caption.svg"
          alt="Backcountry"
          style={{
            position: 'absolute',
            inset: '30.04% 73.93% 68.82% 14.16%',
          }}
        />
      </div>
    </Ground>
  );
}
