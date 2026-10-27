/** Bump Social 1x1 component, transcribed from Figma design.
 *
 * Template ID: sc26_0060 (Bump)
 * Format: paid-social-1x1 (1080x1080)
 * Figma Source: ioB3sP8LwBiTUPQN7jlF81 node 569:7
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
 * Bump Social 1x1 component
 *
 * Frame: 1080px wide x 1080px tall, background #f5ecdf with texture overlay.
 * Layout: Hero image with organic mask on right, copy block on left.
 */
export function BumpSocial1x1({ asset }: { asset: SheetAsset }) {
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
  const { fontSize: leadFontSize } = fitText(lead, 'hero.title', { widthBudget: 600, fontMax: 150 });
  const { fontSize: offerFontSize } = fitText(offer, 'hero.offer', { widthBudget: 700, fontMax: 150 });
  const { fontSize: codeFontSize } = fitText((codeLabel ?? '') + codeWord, 'hero.code', { widthBudget: 676, fontMax: 93 });
  const { fontSize: ctaFontSize } = fitText(cta, 'hero.cta', { widthBudget: 434, fontMax: 59 });

  // Each line's top follows the line above it rather than a measured
  // absolute: the board was measured with one copy length, but lead/offer/
  // code/cta are all independently shrink-to-fit, so a later line's fixed
  // position only held for that one measurement and ran into the line above
  // it (or left an oversized gap) the moment any earlier line's font size
  // changed. The ratios are the gap the board actually measured, divided by
  // the font size that produced it, so they reduce to the real measured
  // positions for the board's own copy and track any other copy length too.
  const leadTop = 252 + urgencyFontSize! * 1.4756;
  const offerTop = leadTop + leadFontSize! * 0.6837;
  const codeTop = offerTop + offerFontSize! * 0.9639;
  const ctaTop = codeTop + codeFontSize! * 1.5623;

  return (
    <Ground id={`${asset.id}/fill`} className="sheet" style={{
      width: w, height: h, position: 'relative', overflow: 'hidden',
      background: cream,
    }}>
      <div style={base(w, h, 1080, 1080)}>
        {/* Paper grain overlay -- the board's own texture, darken-blended at
            40%, same asset the stepped-window photo sits on. */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: `url('/reference/bump-paper.png')`,
          backgroundSize: '339.04px 226.03px',
          backgroundPosition: 'top left',
          mixBlendMode: 'darken',
          opacity: 0.4,
        }} />

        {/* The stepped window: the board's signature shape, not a rounded
            rect standing in for it. Path and size come off the real node
            (ioB3sP8LwBiTUPQN7jlF81 569:7's "Vector 2"/"Vector 6"), not
            approximated -- `bump2-window.json`, registered in toLayers.ts's
            SHAPES so the Figma export cuts the same shape Chromium clips
            here, instead of exporting a rectangle.
            The photo is clipped with the inline CSS `clip-path: path(...)`
            syntax -- not a `url(#id)` reference to a separate `<clipPath>`
            element, which turned out unreliable here (silently failing to
            clip at all under some of this file's siblings' larger
            non-uniform transform:scale() ratios) -- in the shape's own
            native coordinate space, then the whole thing is scaled down to
            the display box with the same transform:scale() technique
            `base()` already uses everywhere else in this file, so the
            photo and the outline mark (both children of that one scaled
            wrapper) can't drift apart from each other. */}
        <div data-clip="bump2-window" data-clip-stroke={green}
          data-clip-width={WINDOW.strokeWeight}
          style={{
            position: 'absolute',
            left: 'calc(50% + 0.5px)', top: 'calc(50% + 0.5px)',
            transform: 'translate(-50%, -50%)',
            width: 983, height: 1021, overflow: 'hidden',
          }}>
          <div style={base(983, 1021, WINDOW.width, WINDOW.height)}>
          <Picture
            id={`${asset.id}/photo`}
            zone={zone}
            initialSrc="/reference/bump-social-photo.jpg"
            // Photo shown at its natural 2000px width rather than a tight
            // cover fit (2000 / 1531.88 cover width), expressed as a zoom
            // so drag-to-crop still pans the real overflow.
            initialScale={1.3056}
            focus={{ x: 50, y: 50 }}
            style={{
              position: 'absolute', inset: 0,
              clipPath: `path("${WINDOW.path}")`,
            }}
          />
          {/* The visible outline -- a real library mark (mask-recolorable
              from the editor), not a hardcoded stroke colour. */}
          <Media id={`${asset.id}/window/mark`} src="/graphics/bump2-window-outline.svg"
            fill={green} alt="Window outline"
            style={{ position: 'absolute', inset: 0 }} />
          </div>
        </div>

        {/* Copy block -- each field at its own measured absolute position
            (node 538:18094-538:18098), not nested relative offsets. The
            prior draft stacked lead/code/cta under one wrapper with
            hand-guessed relative tops, which drifted out of sync with the
            real line heights the moment the offer's two lines wrapped at
            their actual (~150px) size, and "CODE" ran straight into "OFF". */}
        <Editable id={`${asset.id}/urgency`} style={txt(49.82, 252, urgencyFontSize!, {
          fontFamily: stack('Quiet Sans'), fontWeight: 800, color: green,
          whiteSpace: 'nowrap', letterSpacing: 5.36 })}>{urgency}</Editable>

        <Editable id={`${asset.id}/lead`} style={txt(39.25, leadTop, leadFontSize!, {
          fontFamily: stack('Quiet Sans'), fontWeight: 800, color: ink,
          whiteSpace: 'nowrap', letterSpacing: -1.34 })}>{lead}</Editable>
        <Editable id={`${asset.id}/offer`} style={txt(39.25, offerTop, offerFontSize!, {
          fontFamily: stack('Quiet Sans'), fontWeight: 800, color: ink,
          whiteSpace: 'nowrap', letterSpacing: -1.34, marginTop: 24 })}>{offer}</Editable>

        <div style={txt(39.25, codeTop, codeFontSize!, {
          fontFamily: stack('Quiet Sans'), fontWeight: 400, color: ink,
          whiteSpace: 'nowrap', width: 676.859, marginTop: 24 })}>
          {codeLabel !== undefined ? <>
            <Editable as="span" id={`${asset.id}/code/label`}>{codeLabel}</Editable>
            <Editable as="span" id={`${asset.id}/code/value`} style={{ fontWeight: 800 }}>{codeWord}</Editable>
          </> : <Editable as="span" id={`${asset.id}/code`}>{codeWord}</Editable>}
        </div>

        {/* CTA pill */}
        <div style={{ position: 'absolute', left: 50, top: ctaTop,
          width: 434.595, height: 110.96,
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Media id={`${asset.id}/cta/mark`} src="/graphics/pill.svg" fill={ink}
            style={{ position: 'absolute', inset: 0 }} />
          <Editable id={`${asset.id}/cta`} style={{ position: 'relative', fontFamily: stack('Quiet Sans'),
            fontWeight: 700, fontSize: ctaFontSize!, color: '#fff', height: 96,
            textTransform: 'capitalize', whiteSpace: 'nowrap', letterSpacing: -0.59 }}>
            {cta}
          </Editable>
        </div>

        {/* Wordmark lockup, bottom-left -- the board's own "dark" cut (ink
            type for the cream ground, not the white-on-dark variant the
            ticket-card Bump wears), as two real vector marks: the
            steep&amp;cheap glyph lockup and the "powered by Backcountry"
            caption underneath it, each its own swappable library graphic
            rather than one flattened logo image. */}
        <Media id={`${asset.id}/wordmark`} src="/logos/sac-logo-dark.svg" alt="Steep & Cheap"
          style={{ position: 'absolute', left: 66.0, top: 921.0, width: 188.37, height: 85.51 }} />
        <Media id={`${asset.id}/wordmark/caption`} src="/logos/sac-logo-dark-caption.svg"
          alt="Powered by Backcountry"
          style={{ position: 'absolute', left: 150.34, top: 988.2, width: 101.51, height: 18.59 }} />
      </div>
    </Ground>
  );
}
