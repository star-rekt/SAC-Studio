/** Desktop hero compositions measured from the three linked Figma boards.
 * Typography and each photograph are separate edit targets; no hero is a
 * flattened screenshot. A second requested hero reuses the board's layout
 * while its brief copy (or a designer's edits) changes independently. */
import type { SheetAsset } from '../../../sheet/types';
import { Editable, Ground } from '../../../edit/Editable';
import { Picture } from '../../../edit/Picture';
import { Media } from '../../../edit/Media';
import { ZONE_LIST, photoFor } from '../../../model/compose';
import { stack } from '../../../fonts';
import { useEdits, textOf } from '../../../edit/store';
import { fitText } from './textContracts';

const ink = '#333333';
const base = (w: number, h: number, bw: number, bh: number): React.CSSProperties => ({
  position: 'absolute', width: bw, height: bh,
  transform: `scale(${w / bw},${h / bh})`, transformOrigin: 'top left',
});
// Figma trims every text box to cap-height (its own 'leading-trim: both;
// text-edge: cap'); the CSS equivalent is text-box-trim/text-box-edge, which
// this Chromium supports. Without it, a normal line-height box is taller
// than Figma's and adds phantom leading above the glyphs, which is what put
// every headline and bolt a visible amount too low.
const txt = (left: number, top: number, fontSize: number,
  extra?: React.CSSProperties): React.CSSProperties => ({ position: 'absolute', left, top,
  fontFamily: stack('Quiet Sans'), fontSize, lineHeight: 1,
  textBoxTrim: 'trim-both', textBoxEdge: 'cap alphabetic', ...extra } as React.CSSProperties);

/** The bolt flanking Flash's title: the library's own "bolt" mark, not a
 *  text-glyph stand-in. It ships in white and in ink -- the board's own
 *  bolt is whichever one matches the title it sits beside, not always white. */
function Bolt({ id, size, pale = true }: { id: string; size: number; pale?: boolean }) {
  return <Media id={id} src={pale ? '/graphics/bolt.svg' : '/graphics/bolt-ink.svg'} alt=""
    style={{ width: size * 40 / 88, height: size, display: 'block' }} />;
}

function photo(asset: SheetAsset, slot: string, src: string,
  style: React.CSSProperties, focus?: { x: number; y: number }, initialScale?: number) {
  const zone = ZONE_LIST.find(z => z.id === asset.media.photo) ?? photoFor('hike', 0);
  return <Picture id={`${asset.id}/${slot}/photo`} zone={zone} initialSrc={src}
    focus={focus} initialScale={initialScale}
    style={{ ...style, borderRadius: 14, overflow: 'hidden' }} />;
}

/** Every number below is transcribed straight from the board's own
 *  "Copy as CSS" output for hero-desktop (1418x906, SC26_0021 Flash Sale
 *  Apr 4) -- literal top/left/width/height per layer, not re-derived from
 *  nested Figma auto-layout percentages. */
export function Flash({ asset }: { asset: SheetAsset }) {
  const [w,h] = asset.size;
  const offer = asset.copy.offer || '70% OFF';
  const { edits } = useEdits();
  const liveTitle = textOf(edits, `${asset.id}/lead`, asset.copy.title || 'SALE');
  const titleSize = asset.scope.topic ? 105 : fitText(liveTitle, 'hero.title', { widthBudget: 760 }).fontSize!;
  return <Ground id={`${asset.id}/fill`} className="sheet" style={{width:w,height:h,position:'relative',overflow:'hidden',
    background:'#565831'}}>
    <div style={base(w,h,1418,906)}>
      {/* Tuned by hand against this board's default photo (two hikers in a
          grass area) -- a swapped-in photo falls back to Picture's own
          generic center crop, not this. */}
      {photo(asset,'background','/reference/flash-hero-photo.png',
        {position:'absolute',inset:0,width:1418,height:906,borderRadius:0}, {x:93.59,y:98.70}, 1.06)}
      {/* The real vector outline (Figma node 804:13668, "Brush Stroke"), not
          the flattened orange PNG this used to point at -- a genuine library
          mark now, recolourable and swappable like every other graphic. */}
      <Media id={`${asset.id}/urgency/mark`} src="/graphics/brush-stroke.svg"
        alt="Orange brush" title="Click to recolour, resize or swap the brush mark from the library"
        style={{position:'absolute',left:909,top:190,width:437,height:78.75}} />
      {(() => {
        const urgency = asset.copy.marquee || asset.copy.eyebrow
          || (/end/i.test(asset.scope.phase ?? '') ? 'ENDS TODAY' : '3 DAYS ONLY');
        // The ink-brush mark is a fixed 437px graphic with nothing to clip
        // longer urgency text -- shrink to fit it instead of overrunning it.
        const { fontSize } = fitText(urgency, 'hero.urgency', { widthBudget: 437 - 60 });
        return <Editable id={`${asset.id}/urgency`} style={txt(940,207,fontSize!,
          {fontFamily:stack('Sofia Pro'),fontWeight:500,lineHeight:(fontSize!*.97)+'px',
            letterSpacing:-1.97,color:'#fff',whiteSpace:'nowrap'})}>{urgency}</Editable>;
      })()}
      {asset.scope.topic ? (
        <Editable id={`${asset.id}/lead`} style={txt(739,307,105,
          {lineHeight:'69px',color:'#fff',fontWeight:800,whiteSpace:'nowrap'})}>{asset.copy.eyebrow || ''}</Editable>
      ) : (() => {
        // The board's own bolt-to-bolt span (691 to 1315+31) only holds for
        // the exact headline it measured ("FLASH SALE"); centred with a
        // size-proportional gap reproduces the same look for any length.
        return <div style={{position:'absolute',left:350,top:307,width:1418,height:69,
          display:'flex',alignItems:'center',justifyContent:'center',gap:titleSize*.16}}>
          <Bolt id={`${asset.id}/lead/bolt-left`} size={69} />
          <Editable id={`${asset.id}/lead`} style={{fontFamily:stack('Quiet Sans'),lineHeight:'69px',
            textBoxTrim:'trim-both',textBoxEdge:'cap alphabetic',
            color:'#fff',fontWeight:800,letterSpacing:-3.15,whiteSpace:'nowrap',fontSize:titleSize} as React.CSSProperties}>{asset.copy.title || 'SALE'}</Editable>
          <Bolt id={`${asset.id}/lead/bolt-right`} size={69} />
        </div>;
      })()}
      {!asset.scope.topic && <Editable id={`${asset.id}/prefix`} style={txt(516,414,59,
        {color:'#fff',fontWeight:400,letterSpacing:-1.77,whiteSpace:'pre-line',lineHeight:'57px'})}>{/\bUP\s+TO\b/i.test(asset.copy.body || '') ? 'UP\nTO' : asset.copy.lead || 'EXTRA'}</Editable>}
      {(() => {
        const offerText = asset.scope.topic || offer;
        const { fontSize } = fitText(offerText, 'hero.offer', { widthBudget: 820 });
        return <Editable id={`${asset.id}/offer`} style={txt(601,414,fontSize!,
          {color:'#fff',fontWeight:800,whiteSpace:'nowrap',letterSpacing:-5.59,
            lineHeight:(fontSize!*.97)+'px'})}>{offerText}</Editable>;
      })()}
      {asset.copy.code && (() => {
        const { text: qualifier, fontSize } = fitText(asset.copy.qualifier ?? '', 'hero.qualifier');
        return <Editable id={`${asset.id}/qualifier`} style={txt(743,575,fontSize!,
          {fontWeight:400,lineHeight:(fontSize!*1.07)+'px',letterSpacing:-1.7,color:'#fff',textAlign:'right',
            left:undefined,right:72,whiteSpace:'nowrap'})}>{qualifier}</Editable>;
      })()}
      {/* Right-anchored to the same 72px margin as the qualifier line above
          it and the CTA button below -- a literal left:744 (an old guess at
          this one example's width) didn't end where either of those didw
          Sized off the title (SALE text), not a fixed 34px, so it scales
          with a shorter/longer campaign name the same way the title does. */}
      {asset.copy.dates && (() => {
        // Was sized off titleSize*.9 -- fine for the one example this board
        // measured, but a title's own fitted size (up to 105px) has nothing
        // to do with how big a short date range should render; it just made
        // the dates line huge whenever the title itself sat near its max.
        const { fontSize } = fitText(asset.copy.dates, 'hero.dates');
        return <Editable id={`${asset.id}/dates`} style={txt(744,616,fontSize!,
          {color:'#fff',fontWeight:700,whiteSpace:'nowrap',left:undefined,right:72,textAlign:'right'})}>{asset.copy.dates}</Editable>;
      })()}
      {(() => {
        const cta = textOf(edits, `${asset.id}/cta`, asset.copy.cta || 'Shop Now');
        // A fixed 417x104.5 button with no shrink: a CTA longer than "Shop
        // Now" would wrap messily inside this small box since nothing here
        // clips it either. Sized off the live (post-edit) text.
        const { fontSize } = fitText(cta, 'hero.cta', { widthBudget: 417 - 108 });
        // The orange backing used to be drawn straight onto the Editable
        // itself (`background: orange`) -- a flat placement, not a graphic
        // component: no swap, no recolour-as-a-mark, and (same bug Bump's
        // own CTA had) aligning the text moved the "box" along with it
        // since there was no background shape independent of the text to
        // measure. `/graphics/pill.svg` is the same rounded-pill mark Bump's
        // hero CTA already uses -- its corner radius is the same 24.4% of
        // its own height in both boards, not a coincidence worth a second
        // shape for -- stretched to this board's own 417x104.5 box.
        return <div style={{position:'absolute',left:929,top:712,width:417,height:104.5,
          display:'grid',placeItems:'center'}}>
          <Media id={`${asset.id}/cta/mark`} src="/graphics/pill.svg" alt="Button"
            title="Click to recolour, resize or swap the button shape from the library"
            style={{position:'absolute',inset:0,width:'100%',height:'100%'}} />
          <Editable id={`${asset.id}/cta`} style={{position:'relative',
            fontFamily:stack('Sofia Pro'),fontWeight:800,fontSize,letterSpacing:-0.54,lineHeight:(fontSize!*.68)+'px',
            whiteSpace:'nowrap',
            textBoxTrim:'trim-both',textBoxEdge:'cap alphabetic',
            color:'#fff',textAlign:'center'} as React.CSSProperties}>{cta}</Editable>
        </div>;
      })()}
    </div>
  </Ground>;
}