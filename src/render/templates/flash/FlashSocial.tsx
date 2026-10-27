/** SC26_0021 paid social: the board's full-bleed trail photo, right-hand
 * copy stack and green brand rail. Every number below is transcribed from
 * the board's own "Copy as CSS" export, one entry per aspect ratio -- the
 * three ratios are not one layout scaled by width, they are three distinct
 * frames the board measured separately. */
import type { SheetAsset } from '../../../sheet/types';
import { Picture } from '../../../edit/Picture';
import { Editable, Ground } from '../../../edit/Editable';
import { Media } from '../../../edit/Media';
import { ZONE_LIST, photoFor } from '../../../model/compose';
import { stack } from '../../../fonts';
import { BrandMark } from '../BrandMark';
import { useEdits, textOf } from '../../../edit/store';
import { fitText } from './textContracts';

const trim = { textBoxTrim: 'trim-both', textBoxEdge: 'cap alphabetic' } as React.CSSProperties;

/** The bolt flanking the title: the library's own "bolt" mark, not a
 *  text-glyph stand-in. */
function Bolt({ id, size }: { id: string; size: number }) {
  return <Media id={id} src="/graphics/bolt.svg" alt=""
    style={{ width: size * 40 / 88, height: size, display: 'block' }} />;
}

const white = '#fff';

type Spec = typeof SPECS['1x1'];
const SPECS = {
  '1x1': {
    wordmark: { left: 776.89, top: 90.71, width: 273.11, height: 124.44 },
    brush: { left: 613, top: 410, width: 437, height: 78.75 },
    urgency: { left: 643.5, top: 427, fontSize: 65.62, lineHeight: 64 },
    bolt: { left: 395, right: 1019, top: 527, height: 69 },
    title: { left: 443, top: 527, fontSize: 104.94, lineHeight: 139 },
    upto: { left: 220, top: 634, fontSize: 58.97, lineHeight: 57 },
    // The board's own "75% OFF" frame: left 305.13, width 745 -> right edge
    // 1050.13 on a 1080-wide canvas, i.e. a 29.87px right margin. Dates/code
    // and (on 1x1/4x5) the title end at this same edge, not their own.
    offer: { left: 305.13, top: 634.46, fontSize: 186.21, lineHeight: 181, rightInset: 29.87 },
  },
  '4x5': {
    wordmark: { left: 729, top: 123.6, width: 293, height: 133.5 },
    brush: { left: 592, top: 445, width: 437, height: 78.75 },
    urgency: { left: 623, top: 462, fontSize: 65.62, lineHeight: 64 },
    bolt: { left: 374, right: 998, top: 562, height: 69 },
    title: { left: 422, top: 562, fontSize: 104.94, lineHeight: 139 },
    upto: { left: 199, top: 669, fontSize: 58.97, lineHeight: 57 },
    offer: { left: 284.13, top: 669.46, fontSize: 186.21, lineHeight: 181, rightInset: 50.87 },
  },
  '9x16': {
    wordmark: { left: 397.4, top: 176, width: 285.07, height: 129.89 },
    brush: { left: 311.8, top: 345.49, width: 457.13, height: 82.38 },
    urgency: { left: 344.2, top: 363.28, fontSize: 68.64, lineHeight: 67 },
    bolt: { left: 197.78, right: 850.52, top: 467.88, height: 72.18 },
    title: { left: 247.99, top: 467.88, fontSize: 109.78, lineHeight: 145 },
    upto: { left: 105.73, top: 579.81, fontSize: 61.69, lineHeight: 60 },
    offer: { left: 194.78, top: 580.29, fontSize: 194.79, lineHeight: 189, rightInset: 105.22 },
  },
};

export function FlashSocial({ asset }: { asset: SheetAsset }) {
  const [w,h] = asset.size;
  const { edits } = useEdits();
  const zone = ZONE_LIST.find(z => z.id === asset.media.photo) ?? photoFor('hike',0);
  // A 1080x1350 (4:5) frame's h/w is 1.25 -- under the old >1.3 threshold for
  // "tall", so every 4x5 asset silently rendered with the 1x1 spec instead.
  // The format name is the actual source of truth; aspect ratio is only a
  // fallback for a custom size the brief asked for outside these three.
  const story = asset.format === 'paid-social-9x16' || (!/^paid-social-/.test(asset.format) && h/w > 1.6);
  const tall = asset.format === 'paid-social-4x5'
    || (!/^paid-social-/.test(asset.format) && !story && h/w > 1.15);
  const spec: Spec = SPECS[story ? '9x16' : tall ? '4x5' : '1x1'];
  const railH = 114, id = `${asset.id}/flash-social`;
  const liveTitle = textOf(edits, `${id}/lead`, asset.copy.title || 'SALE');
  const titleSize = asset.scope.topic ? spec.title.fontSize
    : Math.min(spec.title.fontSize,Math.floor(690*(spec.title.fontSize/104.94)/(liveTitle.length*.66+2)));
  const t = (left:number,top:number,fontSize:number,extra?:React.CSSProperties):React.CSSProperties =>
    ({position:'absolute',left,top,fontFamily:stack('Quiet Sans'),fontSize,
      color:white,lineHeight:1,...trim,...extra});
  // Stacked just under the offer's own cap-height instead of a fixed
  // +200/+260 that assumed a specific font size, and sized off the title
  // rather than a flat 32/48px so both scale with it.
  const afterOffer = spec.offer.top + spec.offer.fontSize * 0.75 + 20;
  const dateSize = titleSize * .9;
  const codeGap = asset.copy.code ? dateSize * 0.78 + 15 : 0;
  const copyBottom = afterOffer + codeGap + (asset.copy.dates ? dateSize * 0.78 : 0);
  return <Ground id={`${id}/fill`} className="sheet" style={{width:w,height:h,position:'relative',overflow:'hidden',
    background:'#5b6642'}}>
    <Picture id={`${id}/photo`} zone={zone} initialSrc="/reference/flash-hero-photo.png"
      {...(story ? { initialScale: 1.29, focus: {x:39.19,y:0} }
        : { initialScale: tall ? 1.25 : 1.314, zoomOrigin: {x:50,y:100}, focus: {x:50,y:50} })}
      style={{position:'absolute',inset:0,width:w,height:h}} />
    <Media id={`${id}/wordmark`} src="/reference/flash-wordmark.svg" alt="Steep & Cheap, powered by Backcountry"
      style={{position:'absolute',left:spec.wordmark.left,top:spec.wordmark.top,
        width:spec.wordmark.width,height:spec.wordmark.height,objectFit:'contain'}} />
    {/* The same real vector outline BoardHero/FlashEmail use (Figma node
        804:13668, "Brush Stroke"), registered orange in the library --
        `fill` overrides just the default colour for this green usage,
        the same way a live recolour from the panel would. */}
    <Media id={`${id}/urgency/mark`} src="/graphics/brush-stroke.svg" alt="Green brush" fill="#79ac41"
      title="Click to recolour, resize or swap the brush mark from the library"
      style={{position:'absolute',left:spec.brush.left,top:spec.brush.top,
        width:spec.brush.width,height:spec.brush.height}} />
    {(() => {
      const urgency = asset.copy.marquee || asset.copy.eyebrow || '3 DAYS ONLY';
      // The brush mark is a fixed-width graphic (same shape as FlashEmail's);
      // fixed font + no shrink ran longer urgency text past its edges.
      const { fontSize } = fitText(urgency, 'hero.urgency', { widthBudget: spec.brush.width - 60, fontMax: spec.urgency.fontSize });
      return <Editable id={`${id}/urgency`} style={t(spec.urgency.left,spec.urgency.top,fontSize!,
        {fontFamily:stack('Sofia Pro'),fontWeight:500,lineHeight:(fontSize!*.97)+'px',whiteSpace:'nowrap'})}>{urgency}</Editable>;
    })()}
    {asset.scope.topic ? (() => {
      const eyebrow = asset.copy.eyebrow || '';
      const { fontSize } = fitText(eyebrow, 'hero.title', { widthBudget: w - spec.title.left - 40, fontMax: spec.title.fontSize });
      return <Editable id={`${id}/lead`} style={t(spec.title.left,spec.bolt.top,fontSize!,
        {lineHeight:spec.bolt.height+'px',fontWeight:800,whiteSpace:'nowrap'})}>{eyebrow}</Editable>;
    })() : (() => {
      // Bolts flank at the board's own fixed span for "FLASH SALE"; centred
      // with a size-proportional gap reproduces the same look at any length.
      // On 1x1/4x5 the title instead ends at the same right edge as the
      // offer below it (9x16 keeps the centred look -- its title already
      // sits clear of the offer block, unlike the tighter square/4x5 frames).
      return <div style={story ? {position:'absolute',left:0,width:w,top:spec.bolt.top,height:spec.bolt.height,
        display:'flex',alignItems:'center',justifyContent:'center',gap:titleSize*.18}
        : {position:'absolute',right:spec.offer.rightInset,top:spec.bolt.top,height:spec.bolt.height,
        display:'flex',alignItems:'center',justifyContent:'flex-end',gap:titleSize*.16}}>
        <Bolt id={`${id}/lead/bolt-left`} size={spec.bolt.height} />
        <Editable id={`${id}/lead`} style={{fontFamily:stack('Quiet Sans'),color:white,...trim,
          lineHeight:spec.bolt.height+'px',fontWeight:800,whiteSpace:'nowrap',fontSize:titleSize}}>{asset.copy.title || 'SALE'}</Editable>
        <Bolt id={`${id}/lead/bolt-right`} size={spec.bolt.height} />
      </div>;
    })()}
    {!asset.scope.topic && <Editable id={`${id}/prefix`} style={t(spec.upto.left,spec.upto.top,spec.upto.fontSize,
      {lineHeight:spec.upto.lineHeight+'px',whiteSpace:'pre-line'})}>{/\bUP\s+TO\b/i.test(asset.copy.body || '') ? 'UP\nTO' : asset.copy.lead || 'EXTRA'}</Editable>}
    <Editable id={`${id}/offer`} style={t(spec.offer.left,spec.offer.top,
      asset.scope.topic ? Math.max(48, Math.floor(770 / (asset.scope.topic.length*.58))) : spec.offer.fontSize,
      {lineHeight:spec.offer.lineHeight+'px',fontWeight:800,letterSpacing:-spec.offer.fontSize*.03,
        whiteSpace:asset.scope.topic?'normal':'nowrap',width:750})}>
      {asset.scope.topic || asset.copy.offer || '75% OFF'}
    </Editable>
    {/* Right-anchored to the offer's own right edge rather than its left --
        a left-anchored date under a huge, variable-width "75% OFF" landed
        wherever that text happened to end, not aligned with anything.
        9x16 keeps the centred copy column the title already uses there,
        rather than the right edge 1x1/4x5 anchor to. */}
    {/* The label "CODE" stays regular weight; only the code word itself is
        bold -- Editable is plain-string-only, so each needs its own id. */}
    {asset.copy.code && <div style={story
      ? t(0,afterOffer,dateSize,{width:w,textAlign:'center',whiteSpace:'nowrap'})
      : t(0,afterOffer,dateSize,{left:undefined,right:spec.offer.rightInset,textAlign:'right',
          whiteSpace:'nowrap'})}>
      <Editable as="span" id={`${id}/code/label`} style={{fontWeight:400}}>{'CODE '}</Editable>
      <Editable as="span" id={`${id}/code/value`} style={{fontWeight:800}}>{asset.copy.code}</Editable>
    </div>}
    {asset.copy.dates && <Editable id={`${id}/dates`} style={story
      ? t(0,afterOffer+codeGap,dateSize,{width:w,textAlign:'center',fontWeight:700,whiteSpace:'nowrap'})
      : t(0,afterOffer+codeGap,dateSize,{left:undefined,right:spec.offer.rightInset,textAlign:'right',
          fontWeight:700,whiteSpace:'nowrap'})}>{asset.copy.dates}</Editable>}
    {/* 9x16 has no bottom brand rail -- the logos sit directly under the
        copy instead, plain on the photo, not boxed in a green bar. */}
    {story ? (
      <div style={{position:'absolute',left:0,width:w,top:copyBottom+30,
        display:'flex',alignItems:'center',justifyContent:'center',gap:70}}>
        {(['la-sportiva','outdoor-research','mountain-hardwear','osprey'] as const)
          .map((brand,n)=><BrandMark key={brand} id={`${id}/brand/${n}`}
            name={asset.media.brands?.[n]} fallback={`/logos/brand-${brand}.svg`}
            style={{width:[126,113,123,113][n],height:62,objectFit:'contain'}} />)}
        <Editable id={`${id}/more`} style={{fontFamily:stack('Quiet Sans'),
          fontSize:30,color:white,fontWeight:700,whiteSpace:'nowrap'}}>&amp; MORE</Editable>
      </div>
    ) : (
      // A bare <div> here had no data-id -- unselectable, unrecolourable,
      // and exported as an anonymous Figma "block" instead of a named layer
      // (the same gap the Bump desktop hero's CTA pill had).
      <Ground id={`${id}/strip/fill`} style={{position:'absolute',left:0,right:0,bottom:0,height:railH,
        background:'#79ac41',display:'flex',alignItems:'center',
        justifyContent:'space-around',padding:'0 48px'}}>
        {(['la-sportiva','outdoor-research','mountain-hardwear','osprey'] as const)
          .map((brand,n)=><BrandMark key={brand} id={`${id}/brand/${n}`}
            name={asset.media.brands?.[n]} fallback={`/logos/brand-${brand}.svg`}
            style={{width:[168,150,164,150][n],height:83,objectFit:'contain'}} />)}
        <Editable id={`${id}/more`} style={{fontFamily:stack('Quiet Sans'),
          fontSize:39,color:white,fontWeight:700,whiteSpace:'nowrap'}}>&amp; MORE</Editable>
      </Ground>
    )}
  </Ground>;
}