/** Bump Social 4x5 component, transcribed from Figma design.
 *
 * Template ID: sc26_0060 (Bump)
 * Format: paid-social-4x5 (1080x1350)
 * Figma Source: ioB3sP8LwBiTUPQN7jlF81 node 569:8
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
const cream = '#f5ecdf';

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
 * Bump Social 4x5 component
 *
 * Frame: 1080px wide x 1350px tall, background #f5ecdf with texture overlay.
 * Layout: Hero image with organic mask, copy block overlay on left side.
 */
export function BumpSocial4x5({ asset }: { asset: SheetAsset }) {
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

  // Fit text to available space
  const { fontSize: urgencyFontSize } = fitText(urgency, 'hero.urgency', { widthBudget: 400, fontMax: 48 });
  const { fontSize: leadFontSize } = fitText(lead, 'hero.title', { widthBudget: 600, fontMax: 115 });
  const { fontSize: offerFontSize } = fitText(offer, 'hero.offer', { widthBudget: 700, fontMax: 115 });
  const { fontSize: codeFontSize } = fitText((codeLabel ?? '') + codeWord, 'hero.code', { widthBudget: 676, fontMax: 93 });
  const { fontSize: ctaFontSize } = fitText(cta, 'hero.cta', { widthBudget: 434, fontMax: 59 });

  // Exact measured positions off node 569:8 (get_design_context), not a
  // derived ratio: urgency top 446, lead/offer top 516.83, code top 763.97,
  // cta top 909.26 -- all canvas-absolute. The one dynamic adjustment kept
  // is offer-under-lead, using Figma's own line-height (68.37% of
  // leadFontSize) for the two-line "EXTRA / 20% OFF" stack.

  return (
    <Ground id={`${asset.id}/fill`} className="sheet" style={{
      width: w, height: h, position: 'relative', overflow: 'hidden',
      background: cream,
    }}>
      <div style={base(w, h, 1080, 1350)}>
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
            syntax -- not a `url(#id)` reference to a separate `<clipPath>`
            element, which silently failed to clip at all under this
            format's much larger non-uniform transform:scale() ratio (its
            983x1314 box stretches the 1023x1028 shape ~1.28x vertically,
            vs. 1x1's near-1:1) -- then the whole thing is scaled to the
            display box the same way `base()` is used everywhere else here.
            The outline is a real library mark (`Media`, mask-recolorable
            from the editor), not a hardcoded stroke colour. */}
        <div data-clip="bump2-window" data-clip-stroke={green}
          data-clip-width={WINDOW.strokeWeight}
          style={{
            position: 'absolute',
            left: 'calc(50% - 0.5px)', top: '50%',
            transform: 'translate(-50%, -50%)',
            width: 983, height: 1314, overflow: 'hidden',
          }}>
          <div style={base(983, 1314, WINDOW.width, WINDOW.height)}>
            <Picture
              id={`${asset.id}/hero-photo`}
              zone={zone}
              initialSrc="/reference/bump-social-4x5-hero.jpg"
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
            height (1350) -- not the flat 446px this had before, which put
            the block at 33% down, compressed into the middle of the taller
            frame instead of spanning it the way the window's own steps
            (which stretch with the frame) do. */}
        {/* Urgency text - "4 DAYS ONLY" */}
        <Editable
          id={`${asset.id}/urgency`}
          style={txt(52.57, 446, urgencyFontSize!, {
            fontFamily: stack('Quiet Sans'),
            fontWeight: 800,
            color: green,
            whiteSpace: 'nowrap',
            letterSpacing: 5.36,
          })}
        >
          {urgency}
        </Editable>

        {/* Lead + Offer text - stacked "EXTRA 20% OFF" */}
        <Editable
          id={`${asset.id}/lead`}
          style={txt(47, 516.83, leadFontSize!, {
            fontFamily: stack('Quiet Sans'),
            fontWeight: 800,
            color: ink,
            whiteSpace: 'nowrap',
            letterSpacing: -1.34,
          })}
        >
          {lead}
        </Editable>
        <Editable
          id={`${asset.id}/offer`}
          style={txt(47, 516.83 + leadFontSize! * 0.95, offerFontSize!, {
            fontFamily: stack('Quiet Sans'),
            fontWeight: 800,
            color: ink,
            whiteSpace: 'nowrap',
            letterSpacing: -1.34,
          })}
        >
          {offer}
        </Editable>

        {/* Code text - "CODE CHILLY20" */}
        <div style={txt(47, 763.97, codeFontSize!, {
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
          left: 57.75,
          top: 909.26,
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
                letterSpacing: -0.59,
              }}
            >
              {cta}
            </Editable>
        </div>

        {/* Wordmark lockup -- exact measured positions off node 569:8
            (inset 22.96%/72.53%/69.53%/5.37% and 28.87%/72.82%/69.5%/15.27%
            of 1080x1350), not a reused px pair from paid-social-1x1's own
            (different) measurement, and not the percentage-inset-plus-
            manual-margin stack this had before. */}
        <Media id={`${asset.id}/wordmark`} src="/logos/sac-logo-dark.svg" alt="Steep & Cheap"
          style={{ position: 'absolute', left: 58.0, top: 309.96,
            width: 238.68, height: 101.38 }} />
        <Media id={`${asset.id}/wordmark/caption`} src="/logos/sac-logo-dark-caption.svg"
          alt="Powered by Backcountry"
          style={{ position: 'absolute', left: 164.9, top: 389.7,
            width: 128.6, height: 22.05 }} />
      </div>
    </Ground>
  );
}
