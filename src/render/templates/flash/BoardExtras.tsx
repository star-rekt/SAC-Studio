/** Theme-derived treatments for deliverables without a framed example on a
 * linked page. They deliberately reuse that campaign's own photograph,
 * palette and component language instead of drawing from another board. */
import type { SheetAsset } from '../../../sheet/types';
import { Editable, Ground } from '../../../edit/Editable';
import { Picture } from '../../../edit/Picture';
import { Media } from '../../../edit/Media';
import { ZONE_LIST, photoFor } from '../../../model/compose';
import { stack } from '../../../fonts';
import type { Direction } from '../../../templates/directions';
import { fitText, measureAndFit } from './textContracts';

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
  if (asset.format==='text-link') {
    const message = asset.scope.topic
      || (flash ? FLASH_AFFILIATE[((asset.scope.instance ?? 1) - 1) % FLASH_AFFILIATE.length] : undefined)
      || (asset.copy.qualifier?.match(/\b\d+\+/)
      ? `Buy ${asset.copy.qualifier.match(/\b\d+\+/)![0]} eligible items, save an extra ${(asset.copy.offer || '20% off').toLowerCase()}.`
      : `${asset.copy.lead || 'EXTRA'} ${asset.copy.offer || '20% OFF'} on select gear.`);
    const cta = `${asset.copy.cta || 'Shop Now'} →`;
    // A flex row with no fixed widths on either child: a long message and a
    // long CTA have nothing stopping them from pushing each other off the
    // 1200-wide canvas (clipped by .sheet's own overflow:hidden, not shrunk).
    const { fontSize: msgSize } = fitText(message, 'banner.message', { widthBudget: w * .72, fontMax: 31, fontMin: 20 });
    const { fontSize: ctaSize } = fitText(cta, 'section.cta', { widthBudget: w * .2, fontMax: 31, fontMin: 18 });
    return <Ground id={`${asset.id}/fill`} className="sheet" style={{width:w,height:h,
      background:'#fff',display:'flex',alignItems:'center',justifyContent:'center',
      gap:18,padding:'0 24px',color:ink}}>
      <Editable id={`${asset.id}/message`} style={text(msgSize!,{fontWeight:400,whiteSpace:'nowrap'})}>
        {message}
      </Editable>
      <Editable id={`${asset.id}/cta`} style={text(ctaSize!,{color:accent,
        textDecoration:'underline',whiteSpace:'nowrap'})}>
        {cta}</Editable>
    </Ground>;
  }
  // The rest of the function (for other formats like hero-mobile, compact-mobile, etc.)
  // is not Flash-specific and should be left in the main BoardExtras.tsx file
}