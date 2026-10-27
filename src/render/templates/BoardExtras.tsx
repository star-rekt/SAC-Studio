/** Theme-derived treatments for deliverables without a framed example on a
 * linked page. They deliberately reuse that campaign's own photograph,
 * palette and component language instead of drawing from another board. */
import type { SheetAsset } from '../../sheet/types';
import { Editable, Ground } from '../../edit/Editable';
import { Picture } from '../../edit/Picture';
import { Media } from '../../edit/Media';
import { ZONE_LIST, photoFor } from '../../model/compose';
import { stack } from '../../fonts';
import type { Direction } from '../../templates/directions';
import { fitText, measureAndFit } from '../../model/textContracts';
import { DerivedSite as FlashDerivedSite } from './flash/BoardExtras';

const photoByBoard: Record<string,string> = {
  sc26_0060:'/reference/bump-social-photo.jpg',
  sc26_0058:'/reference/autumn-hero-photo.png',
  sc26_0021:'/reference/flash-hero-photo.png',
};
const ink = '#333', orange = '#f14222', green = '#79ac41';
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
  const autumn = templateId==='sc26_0058', flash = templateId==='sc26_0021';
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
      const fontSize = measureAndFit(label.toUpperCase(), { family: stack('Quiet Sans'), weight: 800 },
        { widthBudget: w * .78, fontMax: 118, fontMin: 36 });
      return <Editable id={`${asset.id}/category`} style={{position:'absolute',left:65,top:h*.42,
        ...text(fontSize, {color:'#fff',textTransform:'uppercase',whiteSpace:'nowrap'})}}>{label}</Editable>;
    })()}
    {(() => { const cta = asset.copy.cta || 'Shop Now';
      const { fontSize } = fitText(cta, 'section.cta', { widthBudget: w * .6, fontMax: 34 });
      return <div style={{position:'absolute',left:70,bottom:39,display:'inline-block'}}>
        <Media id={`${asset.id}/cta/mark`} src="/graphics/pill-tile.svg"
          fill={(autumn||flash)?orange:green} style={{position:'absolute',inset:0}} />
        <Editable id={`${asset.id}/cta`} style={{position:'relative',
          ...text(fontSize!,{color:'#fff',padding:'15px 23px',whiteSpace:'nowrap'})}}>{cta}</Editable>
      </div>; })()}
  </Ground>;
}

export function DerivedSite({asset,templateId,direction}: {
  asset:SheetAsset;templateId:string;direction?:Direction}) {
  const [w,h] = asset.size;
  const bump = templateId==='sc26_0060', flash = templateId==='sc26_0021';
  const accent = direction && direction.id !== 'a' ? direction.accent
    : flash ? orange : green;
  if (asset.format==='text-link' && templateId==='sc26_0021') {
    // Flash-specific affiliate text links - delegate to isolated flash component
    return <FlashDerivedSite asset={asset} templateId={templateId} direction={direction} />;
  }
  // The rest of the function remains unchanged for non-Flash templates
  if (asset.format==='logo-strip') return <Ground id={`${asset.id}/fill`} className="sheet" style={{width:w,height:h,
    background:accent,display:'flex',alignItems:'center',justifyContent:'space-around',
    padding:Math.min(20,w*.03)}}>
    {['the-north-face','patagonia','mountain-hardwear','osprey'].map((brand,n)=><Media
      key={brand} id={`${asset.id}/brand/${n}`} src={`/logos/brand-${brand}.svg`}
      alt={brand} style={{width:w*.20,height:h*.65,objectFit:'contain'}} />)}
  </Ground>;
  if (asset.format==='hero-mobile') return <Ground id={`${asset.id}/fill`} className="sheet" style={{width:w,height:h,
    position:'relative',overflow:'hidden',background:bump?'#f5ecdf':'#282820'}}>
    <ThemePicture asset={asset} templateId={templateId}
      style={{position:'absolute',left:0,top:bump?h*.48:0,width:w,height:bump?h*.52:h}} />
    {!bump && <div style={{position:'absolute',inset:0,pointerEvents:'none',
      background:'linear-gradient(180deg,#0005,transparent 46%,#0009)'}} />}
    {(() => { const urgency = asset.copy.marquee || asset.copy.eyebrow || 'LIMITED TIME';
      const { fontSize } = fitText(urgency, 'hero.urgency', { widthBudget: w - 48, fontMax: 25 });
      return <Editable id={`${asset.id}/urgency`} style={{position:'absolute',left:24,top:26,
        ...text(fontSize!,{color:bump?green:'#fff',letterSpacing:2,whiteSpace:'nowrap'})}}>{urgency}</Editable>; })()}
    <Editable id={`${asset.id}/offer`} style={{position:'absolute',left:20,top:bump?83:h*.52,
      ...text(bump?65:68,{color:bump?ink:'#fff',whiteSpace:'pre-line',maxWidth:w-34})}}>
      {asset.scope.topic || `${asset.copy.lead || 'EXTRA'}\n${asset.copy.offer || '20% OFF'}`}
    </Editable>
    {(() => { const cta = asset.copy.cta || 'Shop Now';
      const { fontSize } = fitText(cta, 'hero.cta', { widthBudget: w * .5, fontMax: 25 });
      return <div style={{position:'absolute',left:22,top:bump?h*.35:h*.81,display:'inline-block'}}>
        <Media id={`${asset.id}/cta/mark`} src="/graphics/pill-soft.svg"
          fill={bump?ink:orange} style={{position:'absolute',inset:0}} />
        <Editable id={`${asset.id}/cta`} style={{position:'relative',
          ...text(fontSize!,{color:'#fff',padding:'17px 24px',whiteSpace:'nowrap'})}}>{cta}</Editable>
      </div>; })()}
  </Ground>;
  const small = w<500;
  const bg = asset.format==='compact-mobile' ? ink : accent;
  const offer = asset.scope.topic || `${asset.copy.lead || 'EXTRA'} ${asset.copy.offer || '20% OFF'}`;
  const message = asset.copy.marquee && /END/i.test(asset.copy.marquee)
    ? `${asset.copy.marquee}: ${offer}` : offer;
  const cta = asset.copy.cta || 'Shop Now';
  const { fontSize: msgSize } = fitText(message, 'bar.message',
    { widthBudget: w * .6, fontMax: small ? 22 : 38, fontMin: small ? 14 : 22 });
  const { fontSize: ctaSize } = fitText(cta, 'section.cta',
    { widthBudget: w * .25, fontMax: small ? 18 : 32, fontMin: 14 });
  return <Ground id={`${asset.id}/fill`} className="sheet" style={{width:w,height:h,background:bg,color:'#fff',
    display:'flex',alignItems:'center',justifyContent:'center',gap:small?7:24,
    padding:small?'0 10px':'0 40px'}}>
    <Editable id={`${asset.id}/message`} style={text(msgSize!,{whiteSpace:'nowrap'})}>{message}</Editable>
    <Editable id={`${asset.id}/cta`} style={text(ctaSize!,
      {textDecoration:'underline',whiteSpace:'nowrap'})}>{cta}</Editable>
  </Ground>;
}
