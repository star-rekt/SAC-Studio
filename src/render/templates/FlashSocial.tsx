/** SC26_0021 paid social: the board's full-bleed trail photo, right-hand
 * copy stack and green brand rail. Ratios vary the spacing, not the visual
 * language. The photo, logos and text remain individually selectable. */
import type { SheetAsset } from '../../sheet/types';
import { Picture } from '../../edit/Picture';
import { Editable } from '../../edit/Editable';
import { Media } from '../../edit/Media';
import { ZONE_LIST, photoFor } from '../../model/compose';
import { stack } from '../../fonts';
import { BrandMark } from './BrandMark';

const white = '#fff';
export function FlashSocial({ asset }: { asset: SheetAsset }) {
  const [w,h] = asset.size, s = w/1080;
  const zone = ZONE_LIST.find(z => z.id === asset.media.photo) ?? photoFor('hike',0);
  const tall = h/w > 1.3, story = h/w > 1.6;
  const railH = 114*s;
  const offerTop = story ? h-railH-675*s : tall ? h-railH-540*s : 605*s;
  const id = `${asset.id}/flash-social`;
  const t = (left:number,top:number,fontSize:number,extra?:React.CSSProperties):React.CSSProperties =>
    ({position:'absolute',left,top,fontFamily:stack('Quiet Sans'),fontSize,
      color:white,lineHeight:1,...extra});
  const right = 48*s;
  return <div className="sheet" style={{width:w,height:h,position:'relative',overflow:'hidden',
    background:'#5b6642'}}>
    <Picture id={`${id}/photo`} zone={zone} initialSrc="/reference/flash-hero-photo.png"
      initialScale={story ? 1.2 : tall ? 1.25 : 1.314}
      zoomOrigin={{x:50,y:100}}
      focus={{x:50,y:50}}
      style={{position:'absolute',inset:0,width:w,height:h}} />
    <Media id={`${id}/wordmark`} src="/reference/flash-wordmark.svg" alt="Steep & Cheap"
      style={{position:'absolute',right:44*s,top:75*s,width:315*s,height:145*s,
        objectFit:'contain'}} />
    <Media id={`${id}/urgency/mark`} src="/reference/flash-social-brush.png" alt="Green brush"
      style={{position:'absolute',left:w-470*s,top:offerTop-180*s,
        width:440*s,height:81*s}} />
    <Editable id={`${id}/urgency`} style={t(w-440*s,offerTop-174*s,61*s,
      {whiteSpace:'nowrap'})}>
      {asset.copy.marquee || asset.copy.eyebrow || '3 DAYS ONLY'}
    </Editable>
    <Editable id={`${id}/lead`} style={t(w-680*s,offerTop-59*s,90*s,
      {fontWeight:800,whiteSpace:'nowrap',
        fontSize:Math.min(90,Math.floor(690/((asset.copy.title || 'SALE').length*.66+2)))*s})}>{asset.scope.topic ? asset.copy.eyebrow || '' : `ϟ ${asset.copy.title || 'SALE'} ϟ`}</Editable>
    {!asset.scope.topic && <Editable id={`${id}/prefix`} style={t(w-865*s,offerTop+69*s,58*s,
      {whiteSpace:'pre-line',lineHeight:.9})}>{/\bUP\s+TO\b/i.test(asset.copy.body || '') ? 'UP\nTO' : asset.copy.lead || 'EXTRA'}</Editable>}
    <Editable id={`${id}/offer`} style={t(w-780*s,offerTop+62*s,
      (asset.scope.topic ? Math.max(48, Math.floor(770 / (asset.scope.topic.length*.58))) : 163)*s,
      {fontWeight:800,letterSpacing:-5*s,whiteSpace:asset.scope.topic?'normal':'nowrap',width:750*s})}>
      {asset.scope.topic || asset.copy.offer || '75% OFF'}
    </Editable>
    {asset.copy.code && <Editable id={`${id}/code`} style={t(w-755*s,offerTop+255*s,48*s,
      {fontWeight:800,whiteSpace:'nowrap'})}>{`CODE ${asset.copy.code}`}</Editable>}
    {asset.copy.dates && <Editable id={`${id}/dates`} style={t(w-755*s,offerTop+315*s,32*s,
      {fontWeight:700,whiteSpace:'nowrap'})}>{asset.copy.dates}</Editable>}
    <div style={{position:'absolute',left:0,right:0,bottom:0,height:railH,
      background:'#79ac41',display:'flex',alignItems:'center',
      justifyContent:'space-around',padding:`0 ${right}px`}}>
      {(['la-sportiva','outdoor-research','mountain-hardwear','osprey'] as const)
        .map((brand,n)=><BrandMark key={brand} id={`${id}/brand/${n}`}
          name={asset.media.brands?.[n]} fallback={`/logos/brand-${brand}.svg`}
          style={{width:[168,150,164,150][n]*s,height:83*s,objectFit:'contain'}} />)}
      <Editable id={`${id}/more`} style={{fontFamily:stack('Quiet Sans'),
        fontSize:39*s,color:white,fontWeight:700,whiteSpace:'nowrap'}}>&amp; MORE</Editable>
    </div>
  </div>;
}
