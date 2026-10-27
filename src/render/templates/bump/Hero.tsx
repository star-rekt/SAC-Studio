/** Bump hero-desktop component, transcribed from the Bump board's "Copy as CSS" output.
 *
 * This component implements the exact layout structure from the Figma CSS data,
 * with all positions, sizes, and font properties matching the Bump board's measurements.
 *
 * Template ID: sc26_0060 (Bump)
 */

// Import base types and utilities
import type { SheetAsset } from '../../../sheet/types';
import { Editable, Ground } from '../../../edit/Editable';
import { Media } from '../../../edit/Media';
import { Picture } from '../../../edit/Picture';
import { ZONE_LIST, photoFor } from '../../../model/compose';
import { stack } from '../../../fonts';
import { useEdits, textOf } from '../../../edit/store';
import { fitText } from '../../../model/textContracts';

// Base styles and constants
const ink = '#333', orange = '#f14222', green = '#79ac41';
const base = (w: number, h: number, bw: number, bh: number): React.CSSProperties => ({
  position: 'absolute', width: bw, height: bh,
  transform: `scale(${w / bw},${h / bh})`, transformOrigin: 'top left',
});
// Figma trims every text box to cap-height ('leading-trim: both; text-edge: cap');
// the CSS equivalent is text-box-trim/text-box-edge, which this Chromium supports.
const txt = (left: number, top: number, fontSize: number,
  extra?: React.CSSProperties): React.CSSProperties => ({ position: 'absolute', left, top,
  fontFamily: stack('Quiet Sans'), fontSize, lineHeight: 1,
  textBoxTrim: 'trim-both', textBoxEdge: 'cap alphabetic', ...extra } as React.CSSProperties);

/**
 * Bump hero-desktop component with exact Figma measurements
 *
 * Frame: 1440px wide x 920px tall, background #FFFFFF.
 *
 * Background photo layer ("SC26_0049 Hero Launch"): absolute, left:0, top:0, width:1440, height:920
 * with gradient overlay `linear-gradient(110.82deg, rgba(73,65,63,0) 45.04%, rgba(73,65,63,0.78) 81.51%)`
 *
 * Lockup box: absolute box at left:647.9px, width:710.86px, height:613.69px, top:216.3px
 * (computed as 920/2 - 613.69/2 + 63.15 = 216.3px)
 */
export function BumpHero({ asset }: { asset: SheetAsset }) {
  const [w,h] = asset.size;
  const { edits } = useEdits();

  // Lockup dimensions and position
  const lockupLeft = 647.9;
  const lockupTop = 216.3;
  const lockupWidth = 710.86;
  const lockupHeight = 613.69;

  // Calculate lockup offset for absolute positioning
  const lockupOffset = {
    left: lockupLeft,
    top: lockupTop,
    width: lockupWidth,
    height: lockupHeight
  };

  // Function to convert percentage positions to absolute px within lockup (relative to lockup wrapper)
  const toLockupPx = (percent: number, dimension: 'width' | 'height') => {
    return (percent / 100) * lockupOffset[dimension];
  };

  // Extract live text values
  const extra = textOf(edits, `${asset.id}/extra`, asset.copy.lead || 'EXTRA');
  const offer = textOf(edits, `${asset.id}/offer`, asset.copy.offer || '20% OFF');
  // Split so the code WORD can be bold without the label "CODE" also being
  // bold -- Editable is plain-string-only (no mixed-weight runs within one
  // field), so the two need their own ids. Only when a real code exists:
  // the qualifier/no-code fallback is free text, not a label+word pair.
  const codeLabel = asset.copy.code ? textOf(edits, `${asset.id}/code/label`, 'CODE ') : undefined;
  const codeWord = asset.copy.code
    ? textOf(edits, `${asset.id}/code/value`, asset.copy.code)
    : textOf(edits, `${asset.id}/code`, asset.copy.qualifier || 'CODE AUTUMN20');
  const urgency = textOf(edits, `${asset.id}/urgency`, asset.copy.marquee || '3 DAYS ONLY');
  const cta = textOf(edits, `${asset.id}/cta`, asset.copy.cta || 'Shop Now');
  const zone = ZONE_LIST.find(z => z.id === asset.media.photo) ?? photoFor('hike', 0);
  // EXTRA's declared line-height (172px at its 177.068px design max) is taller
  // than the vertical gap Figma's own top percentages actually leave before
  // the next line (EXTRA top 20.59% to OFFER top 44.22% is only ~145px,
  // OFFER top 44.22% to CODE top 68.84% only ~151px) -- at the design's own
  // max font every line already overran the next one, code included. Capping
  // each line's own font size to what its real gap allows, and sizing
  // line-height off the actual font size (not a magic constant) instead of a
  // flat 172px, keeps the ratio Figma exported while never overrunning.
  const LINE_RATIO = 172 / 177.068;
  const extraGap = toLockupPx(44.22 - 20.59, 'height');
  const offerGap = toLockupPx(68.84 - 44.22, 'height');
  // Right edge shared with CODE/the urgency badge/the CTA pill (all land at
  // ~98.86-100% of the lockup) -- EXTRA/20% OFF right-align to that same
  // edge instead of hanging off their own left-aligned 24.09%.
  const textRightWidth = toLockupPx(98.86, 'width');
  const extraFontSize = fitText(extra, 'hero.title',
    { widthBudget: textRightWidth,
      fontMax: Math.min(177.068, extraGap / LINE_RATIO), charFactor: .6 }).fontSize;
  const offerFontSize = fitText(offer, 'hero.offer',
    { widthBudget: textRightWidth,
      fontMax: Math.min(177.068, offerGap / LINE_RATIO), charFactor: .6 }).fontSize;

  // Calculate the actual text positions and sizes within the lockup
  return <Ground id={`${asset.id}/fill`} className="sheet" style={{width:w,height:h,position:'relative',overflow:'hidden',
    background:'#FFFFFF'}}>
    <div style={base(w,h,1440,920)}>
      <Picture id={`${asset.id}/photo`} zone={zone} initialSrc="/reference/autumn-hero-photo.png"
        initialScale={1} focus={{ x: 50, y: 50 }}
        style={{position:'absolute',left:0,top:0,width:1440,height:920}} />
      <div style={{position:'absolute',left:0,top:0,width:1440,height:920,pointerEvents:'none',
        background:'linear-gradient(110.82deg, rgba(73,65,63,0) 45.04%, rgba(73,65,63,0.78) 81.51%)',
        backgroundBlendMode:'multiply',mixBlendMode:'normal'}} />

      {/* Lockup group - positioned absolutely at lockupLeft, lockupTop */}
      <div style={{position:'absolute',left:lockupLeft,top:lockupTop,width:lockupWidth,height:lockupHeight}}>

        {/* Drop-shadow wrapper (Group 3400) - positioned at 0% of lockup */}
        <div style={{position:'absolute',left:0,width:lockupWidth,height:toLockupPx(76.17, 'height'),
          filter:'drop-shadow(0px 0px 150.601px rgba(0,0,0,0.59))'}} />

        {/* "EXTRA" text -- right-aligned to the same right edge CODE, the
            urgency badge and the CTA pill all share (~98.86-100%), not its
            own left-aligned 24.09%. */}
        <Editable id={`${asset.id}/extra`} style={txt(
          toLockupPx(0, 'width'),
          toLockupPx(20.59, 'height'),
          extraFontSize,
          {
            fontFamily: stack('Quiet Sans'),
            fontWeight: 800,
            lineHeight: `${extraFontSize * LINE_RATIO}px`,
            letterSpacing: '-0.02em',
            textTransform: 'capitalize',
            textAlign: 'right',
            color: '#fff',
            textShadow: '2.47463px 4.94926px 14.4766px rgba(0,0,0,0.14)',
            width: textRightWidth,
          }
        )}>{extra}</Editable>

        {/* "20% OFF" text -- same right edge as EXTRA/CODE. */}
        <Editable id={`${asset.id}/offer`} style={txt(
          toLockupPx(0, 'width'),
          toLockupPx(44.22, 'height'),
          offerFontSize,
          {
            fontFamily: stack('Quiet Sans'),
            fontWeight: 800,
            lineHeight: `${offerFontSize * LINE_RATIO}px`,
            letterSpacing: '-0.02em',
            textTransform: 'capitalize',
            textAlign: 'right',
            color: '#fff',
            textShadow: '2.47463px 4.94926px 14.4766px rgba(0,0,0,0.14)',
            width: textRightWidth,
          }
        )}>{offer}</Editable>

        {/* "CODE AUTUMN20" text - left:0%, right:1.14%, top:68.84%, bottom:23.83%.
            A plain div carries the position/alignment; the label and the
            bold code word are two inline Editable spans inside it, so the
            line still right-aligns as one unit. */}
        <div style={txt(
          toLockupPx(0, 'width'),
          toLockupPx(68.84, 'height'),
          65.0648,
          {
            fontFamily: stack('Sofia Pro'),
            fontWeight: 500,
            lineHeight: '267px',
            textAlign: 'right',
            letterSpacing: '-0.02em',
            color: '#FFFFFF',
            textShadow: '3.85155px 7.7031px 22.5316px rgba(0,0,0,0.14)',
            width: toLockupPx(98.86, 'width') // 100 - 0 - 1.14 = 98.86%
          }
        )}>
          {codeLabel !== undefined ? <>
            <Editable as="span" id={`${asset.id}/code/label`}>{codeLabel}</Editable>
            <Editable as="span" id={`${asset.id}/code/value`} style={{ fontWeight: 800 }}>{codeWord}</Editable>
          </> : <Editable as="span" id={`${asset.id}/code`}>{codeWord}</Editable>}
        </div>

        {/* Urgency badge background (Group 3399 / Vector 741): a painted brush-stroke
            shape, not a flat rounded rect -- same recolorable mark used elsewhere. */}
        <Media id={`${asset.id}/urgency/mark`} src="/graphics/brush-strip.svg" alt="Badge"
          style={{position:'absolute',left:toLockupPx(35.71, 'width'),top:toLockupPx(0, 'height'),
          width:toLockupPx(64.29, 'width'),height:toLockupPx(14.97, 'height')}} />

        {/* "3 DAYS ONLY" text inside badge - left:41.66%, right:4.46%, top:4.03%, bottom:88.8% */}
        <Editable id={`${asset.id}/urgency`} style={txt(
          toLockupPx(41.66, 'width'),
          toLockupPx(4.03, 'height'),
          67.1346,
          {
            fontFamily: stack('Quiet Sans'),
            fontWeight: 700,
            lineHeight: '171px',
            letterSpacing: '-0.02em',
            textTransform: 'capitalize',
            color: '#FFFFFF'
          }
        )}>{urgency}</Editable>

        {/* CTA pill - absolute, left:48.29%, right:1%, top:85.28%, bottom:0%.
            The orange backing used to be a bare, un-wired <div> -- no data-id,
            so it read exactly like a flattened raster button: it couldn't be
            clicked, recoloured, resized or swapped, and the Figma export
            carried it as an anonymous "block" instead of a named layer. A
            plain <Ground> fixed the wiring but still only offered a flat
            colour swatch -- not the "recolour, resize or replace from the
            library" treatment every other graphic mark in the library gets.
            This is the real thing: `/graphics/pill.svg`, a genuine vector
            mask registered in mark-shapes.json (same mechanism as the ticket
            card and the brush-strip badge), so it shows up and behaves like
            the SVG component it is. */}
        <div style={{position:'relative',left:toLockupPx(48.29, 'width'),top:toLockupPx(85.28, 'height'),
          width:toLockupPx(50.71, 'width'),height:toLockupPx(14.72, 'height'),
          display:'flex',alignItems:'center',justifyContent:'center'}}>
          <Media id={`${asset.id}/cta/mark`} src="/graphics/pill.svg" alt="Button"
            title="Click to recolour, resize or swap the button shape from the library"
            style={{position:'absolute',inset:0,width:'100%',height:'100%'}} />
          <Editable id={`${asset.id}/cta`} style={{position:'relative',fontFamily:stack('Sofia Pro'),fontWeight:800,fontSize:47.0467,
            lineHeight:'54px',textAlign:'center',letterSpacing:'-0.01em',textTransform:'capitalize',
            color:'#FFFFFF',whiteSpace:'nowrap'}}>Shop Now</Editable>
        </div>
      </div>
    </div>
  </Ground>;
}