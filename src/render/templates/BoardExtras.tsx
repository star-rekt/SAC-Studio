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

const photoByBoard: Record<string,string> = {
  sc26_0060:'/reference/bump-social-photo.jpg',
  sc26_0058:'/reference/autumn-hero-photo.png',
  sc26_0021:'/reference/flash-hero-photo.png',
};
const ink = '#333', orange = '#f14222', green = '#79ac41';
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
  const autumn = templateId==='sc26_0058';
  return <Ground id={`${asset.id}/fill`} className="sheet" style={{width:w,height:h,position:'relative',overflow:'hidden',
    background:'#24241b'}}>
    <ThemePicture asset={asset} templateId={templateId}
      style={{position:'absolute',inset:0,width:w,height:h}} />
    <div style={{position:'absolute',inset:0,pointerEvents:'none',
      background:'linear-gradient(90deg,#111b 0%,#1115 55%,transparent 100%)'}} />
    <Editable id={`${asset.id}/category`} style={{position:'absolute',left:65,top:h*.42,
      ...text(Math.min(118,1100/Math.max(9,(asset.label||'').length)*1.8),
        {color:'#fff',textTransform:'uppercase',maxWidth:w*.78})}}>
      {asset.scope.category || asset.label || 'CATEGORY'}
    </Editable>
    <Editable id={`${asset.id}/cta`} style={{position:'absolute',left:70,bottom:39,
      ...text(34,{color:'#fff',background:autumn?orange:green,
        padding:'15px 23px',borderRadius:7})}}>{asset.copy.cta || 'Shop Now'}</Editable>
  </Ground>;
}

export function DerivedSite({asset,templateId,direction}: {
  asset:SheetAsset;templateId:string;direction?:Direction}) {
  const [w,h] = asset.size;
  const bump = templateId==='sc26_0060', flash = templateId==='sc26_0021';
  const accent = direction && direction.id !== 'a' ? direction.accent
    : flash ? orange : green;
  if (asset.format==='text-link') return <Ground id={`${asset.id}/fill`} className="sheet" style={{width:w,height:h,
    background:'#fff',display:'flex',alignItems:'center',justifyContent:'center',
    gap:18,padding:'0 24px',color:ink}}>
    <Editable id={`${asset.id}/message`} style={text(31,{fontWeight:400})}>
      {asset.scope.topic || (asset.copy.qualifier?.match(/\b\d+\+/)
        ? `Buy ${asset.copy.qualifier.match(/\b\d+\+/)![0]} eligible items, save an extra ${(asset.copy.offer || '20% off').toLowerCase()}.`
        : `${asset.copy.lead || 'EXTRA'} ${asset.copy.offer || '20% OFF'} on select gear.`)}
    </Editable>
    <Editable id={`${asset.id}/cta`} style={text(31,{color:accent,
      textDecoration:'underline',whiteSpace:'nowrap'})}>
      {`${asset.copy.cta || 'Shop Now'} →`}</Editable>
  </Ground>;
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
    <Editable id={`${asset.id}/urgency`} style={{position:'absolute',left:24,top:26,
      ...text(25,{color:bump?green:'#fff',letterSpacing:2})}}>
      {asset.copy.marquee || asset.copy.eyebrow || 'LIMITED TIME'}
    </Editable>
    <Editable id={`${asset.id}/offer`} style={{position:'absolute',left:20,top:bump?83:h*.52,
      ...text(bump?65:68,{color:bump?ink:'#fff',whiteSpace:'pre-line',maxWidth:w-34})}}>
      {asset.scope.topic || `${asset.copy.lead || 'EXTRA'}\n${asset.copy.offer || '20% OFF'}`}
    </Editable>
    <Editable id={`${asset.id}/cta`} style={{position:'absolute',left:22,
      top:bump?h*.35:h*.81,...text(25,{background:bump?ink:orange,color:'#fff',
        borderRadius:10,padding:'17px 24px'})}}>{asset.copy.cta || 'Shop Now'}</Editable>
  </Ground>;
  const small = w<500;
  const bg = asset.format==='compact-mobile' ? ink : accent;
  const offer = asset.scope.topic || `${asset.copy.lead || 'EXTRA'} ${asset.copy.offer || '20% OFF'}`;
  return <Ground id={`${asset.id}/fill`} className="sheet" style={{width:w,height:h,background:bg,color:'#fff',
    display:'flex',alignItems:'center',justifyContent:'center',gap:small?7:24,
    padding:small?'0 10px':'0 40px'}}>
    <Editable id={`${asset.id}/message`} style={text(small?22:38,{whiteSpace:'nowrap'})}>
      {asset.copy.marquee && /END/i.test(asset.copy.marquee)
        ? `${asset.copy.marquee}: ${offer}` : offer}</Editable>
    <Editable id={`${asset.id}/cta`} style={text(small?18:32,
      {textDecoration:'underline',whiteSpace:'nowrap'})}>
      {asset.copy.cta || 'Shop Now'}</Editable>
  </Ground>;
}
