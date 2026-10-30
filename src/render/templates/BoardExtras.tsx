/** Theme-derived treatments for deliverables without a framed example on a
 * linked page. They deliberately reuse that campaign's own photograph,
 * palette and component language instead of drawing from another board. */
import type { SheetAsset } from '../../sheet/types';
import { Editable, Ground } from '../../edit/Editable';
import { Picture } from '../../edit/Picture';
import { Media } from '../../edit/Media';
import { ZONE_LIST, photoFor } from '../../model/compose';
import { stack } from '../../fonts';
import { fitText, measureAndFit, measuredContract } from '../../model/textContracts';
import { DerivedSite as FlashDerivedSite } from './flash/BoardExtras';

const photoByBoard: Record<string,string> = {
  sc26_0060:'/reference/bump-social-photo.jpg',
  sc26_0021:'/reference/flash-hero-photo.png',
};
const ink = '#333', orange = '#f14222', green = '#79ac41';
/** A campaign's colour on its site formats: Flash's orange, the others' green. */
export const siteAccent = (templateId: string) => templateId === 'sc26_0021' ? orange : green;
// The Flash board's own "Affiliate Text Link" layer comment gives three
// example instances verbatim, not a formula to re-derive -- used as each
// instance's placeholder in reference order, same as GT/CB's literal copy.
const FLASH_AFFILIATE = [
  'Extra 20% off on-sale gear, code GETREADY. Ends Tuesday, 5/21.',
  'Sun hoodies & more UPF apparel up to 60% off.',
  'Memorial Day Sale is on! Up to 60% off gear.',
];
const text = (size:number, extra?:React.CSSProperties):React.CSSProperties => ({
  fontFamily:stack('Quiet Sans'),fontSize:size,lineHeight:1,fontWeight:800,...extra,
});

function ThemePicture({asset,templateId,style}: {asset:SheetAsset;templateId:string;
  style:React.CSSProperties}) {
  const zone = ZONE_LIST.find(z=>z.id===asset.media.photo) ?? photoFor('hike',0);
  return <Picture id={`${asset.id}/photo`} zone={zone}
    initialSrc={photoByBoard[templateId]} style={style} />;
}

export function DerivedTile({asset,templateId}: {asset:SheetAsset;templateId:string}) {
  const [w,h] = asset.size;
  return <Ground id={`${asset.id}/fill`} className="sheet" style={{width:w,height:h,position:'relative',overflow:'hidden',
    background:'#24241b'}}>
    <ThemePicture asset={asset} templateId={templateId}
      style={{position:'absolute',inset:0,width:w,height:h}} />
    <div style={{position:'absolute',inset:0,pointerEvents:'none',
      background:'linear-gradient(90deg,#111b 0%,#1115 55%,transparent 100%)'}} />
    {(() => {
      const label = asset.scope.category || asset.label || 'CATEGORY';
      // A wrapped second line here has nothing stopping it from growing
      // down into the CTA pinned near the bottom -- shrink to one line
      // instead of letting a long category name wrap into it.
      // Measure the UPPERCASE form: this font's capital glyphs render
      // noticeably wider than the mixed-case source string once CSS
      // `text-transform: uppercase` is applied -- measuring the source
      // string as typed understated the real rendered width by ~28%.
      const font = { family: stack('Quiet Sans'), weight: 800 };
      const opts = { widthBudget: w * .78, fontMax: 118, fontMin: 36 };
      const fontSize = measureAndFit(label.toUpperCase(), font, opts);
      return <Editable id={`${asset.id}/category`} fit={measuredContract('board.category', font, opts)} style={{position:'absolute',left:65,top:h*.42,
        ...text(fontSize, {color:'#fff',textTransform:'uppercase',whiteSpace:'nowrap'})}}>{label}</Editable>;
    })()}
    {(() => { const cta = asset.copy.cta || 'Shop Now';
      const fit = fitText(cta, 'section.cta', { widthBudget: w * .6, fontMax: 34 });
      const { fontSize } = fit;
      return <div style={{position:'absolute',left:70,bottom:39,display:'inline-block'}}>
        <Media id={`${asset.id}/cta/mark`} src="/graphics/pill-tile.svg"
          fill={siteAccent(templateId)} style={{position:'absolute',inset:0}} />
        <Editable id={`${asset.id}/cta`} fit={fit.contract} style={{position:'relative',
          ...text(fontSize!,{color:'#fff',padding:'15px 23px',whiteSpace:'nowrap'})}}>{cta}</Editable>
      </div>; })()}
  </Ground>;
}

/** `design`: the shared design chosen (templates/variants.ts siteDesign) --
 *  the affiliate link's row or bar, the mobile hero's cream or photo -- in
 *  this campaign's colours. */
export function DerivedSite({asset,templateId,design}: {
  asset:SheetAsset;templateId:string;design?:string}) {
  const [w,h] = asset.size;
  const bump = templateId==='sc26_0060';
  const accent = siteAccent(templateId);
  if (asset.format==='text-link' && design==='row') {
    // The affiliate link as a row (Flash's design), in this campaign's colour and copy.
    return <FlashDerivedSite asset={asset} templateId={templateId} />;
  }
  // The rest of the function remains unchanged for non-Flash templates
  if (asset.format==='logo-strip') return <Ground id={`${asset.id}/fill`} className="sheet" style={{width:w,height:h,
    background:accent,display:'flex',alignItems:'center',justifyContent:'space-around',
    padding:Math.min(20,w*.03)}}>
    {['the-north-face','patagonia','mountain-hardwear','osprey'].map((brand,n)=><Media
      key={brand} id={`${asset.id}/brand/${n}`} src={`/logos/brand-${brand}.svg`}
      alt={brand} style={{width:w*.20,height:h*.65,objectFit:'contain'}} />)}
  </Ground>;
  const cream = design==='cream';
  if (asset.format==='hero-mobile') return <Ground id={`${asset.id}/fill`} className="sheet" style={{width:w,height:h,
    position:'relative',overflow:'hidden',background:cream?'#f5ecdf':'#282820'}}>
    <ThemePicture asset={asset} templateId={templateId}
      style={{position:'absolute',left:0,top:cream?h*.48:0,width:w,height:cream?h*.52:h}} />
    {!cream && <div style={{position:'absolute',inset:0,pointerEvents:'none',
      background:'linear-gradient(180deg,#0005,transparent 46%,#0009)'}} />}
    {(() => { const urgency = asset.copy.marquee || asset.copy.eyebrow || 'LIMITED TIME';
      const fit = fitText(urgency, 'hero.urgency', { widthBudget: w - 48, fontMax: 25 });
      const { fontSize } = fit;
      return <Editable id={`${asset.id}/urgency`} fit={fit.contract} style={{position:'absolute',left:24,top:26,
        ...text(fontSize!,{color:cream?accent:'#fff',letterSpacing:2,whiteSpace:'nowrap'})}}>{urgency}</Editable>; })()}
    <Editable id={`${asset.id}/offer`} style={{position:'absolute',left:20,top:cream?83:h*.52,
      ...text(cream?65:68,{color:cream?ink:'#fff',whiteSpace:'pre-line',maxWidth:w-34})}}>
      {asset.scope.topic || `${asset.copy.lead || 'EXTRA'}\n${asset.copy.offer || '20% OFF'}`}
    </Editable>
    {(() => { const cta = asset.copy.cta || 'Shop Now';
      const fit = fitText(cta, 'hero.cta', { widthBudget: w * .5, fontMax: 25 });
      const { fontSize } = fit;
      return <div style={{position:'absolute',left:22,top:cream?h*.35:h*.81,display:'inline-block'}}>
        <Media id={`${asset.id}/cta/mark`} src="/graphics/pill-soft.svg"
          fill={cream?ink:bump?accent:orange} style={{position:'absolute',inset:0}} />
        <Editable id={`${asset.id}/cta`} fit={fit.contract} style={{position:'relative',
          ...text(fontSize!,{color:'#fff',padding:'17px 24px',whiteSpace:'nowrap'})}}>{cta}</Editable>
      </div>; })()}
  </Ground>;
  const small = w<500;
  const bg = asset.format==='compact-mobile' ? ink : accent;
  const offer = asset.scope.topic || `${asset.copy.lead || 'EXTRA'} ${asset.copy.offer || '20% OFF'}`;
  const message = asset.copy.marquee && /END/i.test(asset.copy.marquee)
    ? `${asset.copy.marquee}: ${offer}` : offer;
  const cta = asset.copy.cta || 'Shop Now';
  const msgFit = fitText(message, 'bar.message',
    { widthBudget: w * .6, fontMax: small ? 22 : 38, fontMin: small ? 14 : 22 });
  const { fontSize: msgSize } = msgFit;
  const ctaFit = fitText(cta, 'section.cta',
    { widthBudget: w * .25, fontMax: small ? 18 : 32, fontMin: 14 });
  const { fontSize: ctaSize } = ctaFit;
  return <Ground id={`${asset.id}/fill`} className="sheet" style={{width:w,height:h,background:bg,color:'#fff',
    display:'flex',alignItems:'center',justifyContent:'center',gap:small?7:24,
    padding:small?'0 10px':'0 40px'}}>
    <Editable id={`${asset.id}/message`} fit={msgFit.contract} style={text(msgSize!,{whiteSpace:'nowrap'})}>{message}</Editable>
    <Editable id={`${asset.id}/cta`} fit={ctaFit.contract} style={text(ctaSize!,
      {textDecoration:'underline',whiteSpace:'nowrap'})}>{cta}</Editable>
  </Ground>;
}
