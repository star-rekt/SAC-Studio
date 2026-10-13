/** Desktop hero compositions measured from the three linked Figma boards.
 * Typography and each photograph are separate edit targets; no hero is a
 * flattened screenshot. A second requested hero reuses the board's layout
 * while its brief copy (or a designer's edits) changes independently. */
import type { SheetAsset } from '../../sheet/types';
import { Editable } from '../../edit/Editable';
import { Picture } from '../../edit/Picture';
import { Media } from '../../edit/Media';
import { ZONE_LIST, photoFor } from '../../model/compose';
import { stack } from '../../fonts';

const ink = '#333333', orange = '#f14222';
const base = (w: number, h: number, bw: number, bh: number): React.CSSProperties => ({
  position: 'absolute', width: bw, height: bh,
  transform: `scale(${w / bw},${h / bh})`, transformOrigin: 'top left',
});
const txt = (left: number, top: number, fontSize: number,
  extra?: React.CSSProperties): React.CSSProperties => ({ position: 'absolute', left, top,
  fontFamily: stack('Quiet Sans'), fontSize, lineHeight: 1, ...extra });

function photo(asset: SheetAsset, slot: string, src: string,
  style: React.CSSProperties, focus?: { x: number; y: number }) {
  const zone = ZONE_LIST.find(z => z.id === asset.media.photo) ?? photoFor('hike', 0);
  return <Picture id={`${asset.id}/${slot}/photo`} zone={zone} initialSrc={src}
    focus={focus} style={{ ...style, borderRadius: 14, overflow: 'hidden' }} />;
}

function Bump({ asset }: { asset: SheetAsset }) {
  const [w,h] = asset.size;
  const code = asset.copy.code ? `CODE ${asset.copy.code}` : asset.copy.qualifier || 'NO CODE NEEDED';
  return <div className="sheet" style={{width:w,height:h,position:'relative',overflow:'hidden',
    background:'#f5ecdf',
    backgroundImage:'linear-gradient(#f5ecdfaa,#f5ecdfaa),url(/reference/bump-paper.png)',
    backgroundSize:'cover,612px 408px'}}>
    <div style={base(w,h,1440,920)}>
      <Editable id={`${asset.id}/urgency`} style={txt(55,53,36,
        {color:orange,fontWeight:800,letterSpacing:5,textTransform:'uppercase'})}>
        {asset.copy.marquee || asset.copy.eyebrow || '4 DAYS ONLY'}
      </Editable>
      <Editable id={`${asset.id}/offer`} style={txt(53,112,87,
        {color:ink,fontWeight:800,letterSpacing:-3,whiteSpace:'nowrap',
          fontSize:asset.scope.topic ? Math.min(87, Math.floor(1250/(asset.scope.topic.length*.55))) : 87})}>
        {asset.scope.topic || `${asset.copy.lead || 'EXTRA'} ${asset.copy.offer || '20% OFF'}`}
      </Editable>
      <Editable id={`${asset.id}/code`} style={txt(54,207,55,
        {color:ink,whiteSpace:'nowrap'})}>{code}</Editable>
      <Editable id={`${asset.id}/cta`} style={txt(55,300,47,
        {color:'#fff',background:ink,borderRadius:12,padding:'24px 54px',
          fontWeight:700})}>{asset.copy.cta || 'Shop Now'}</Editable>
      {photo(asset,'collage/0','/reference/bump-hero-img0.png',
        {position:'absolute',left:55,top:434,width:430,height:444}, {x:50,y:71})}
      {photo(asset,'collage/1','/reference/bump-hero-img3.png',
        {position:'absolute',left:516,top:286,width:415,height:592}, {x:50,y:61})}
      {photo(asset,'collage/2','/reference/bump-hero-img4.png',
        {position:'absolute',left:962,top:286,width:428,height:306}, {x:60,y:49})}
      {photo(asset,'collage/3','/reference/bump-hero-img5.png',
        {position:'absolute',left:962,top:622,width:428,height:256}, {x:59,y:50})}
    </div>
  </div>;
}

function Autumn({ asset }: { asset: SheetAsset }) {
  const [w,h] = asset.size;
  return <div className="sheet" style={{width:w,height:h,position:'relative',overflow:'hidden',
    background:'#1b1a17'}}>
    <div style={base(w,h,1440,920)}>
      {photo(asset,'background','/reference/autumn-hero-photo.png',
        {position:'absolute',inset:0,width:1440,height:920,borderRadius:0}, {x:50,y:50})}
      <Media id={`${asset.id}/urgency/mark`} src="/graphics/brush-strip.svg"
        alt="Orange brush" style={{position:'absolute',left:900,top:215,width:462,height:86}} />
      <Editable id={`${asset.id}/urgency`} style={txt(935,222,59,
        {color:'#fff',fontWeight:800,whiteSpace:'nowrap'})}>
        {asset.copy.marquee || asset.copy.eyebrow || '3 DAYS ONLY'}
      </Editable>
      {!asset.scope.topic && <Editable id={`${asset.id}/lead`} style={txt(822,331,148,
        {color:'#fff',fontWeight:800})}>{asset.copy.lead || 'EXTRA'}</Editable>}
      <Editable id={`${asset.id}/offer`} style={txt(649,469,153,
        {color:'#fff',fontWeight:800,whiteSpace:'nowrap',
          fontSize:asset.scope.topic ? Math.min(153, Math.floor(710/(asset.scope.topic.length*.55))) : 153})}>{asset.scope.topic || asset.copy.offer || '20% OFF'}</Editable>
      <Editable id={`${asset.id}/code`} style={txt(824,630,61,
        {color:'#fff',whiteSpace:'nowrap'})}>
        {asset.copy.code ? `CODE ${asset.copy.code}` : asset.copy.qualifier || 'NO CODE NEEDED'}
      </Editable>
      <Editable id={`${asset.id}/cta`} style={txt(992,745,49,
        {color:'#fff',background:orange,borderRadius:20,padding:'26px 71px',
          fontWeight:700,whiteSpace:'nowrap'})}>{asset.copy.cta || 'Shop Now'}</Editable>
    </div>
  </div>;
}

function Flash({ asset }: { asset: SheetAsset }) {
  const [w,h] = asset.size;
  const offer = asset.copy.offer || '70% OFF';
  return <div className="sheet" style={{width:w,height:h,position:'relative',overflow:'hidden',
    background:'#565831'}}>
    <div style={base(w,h,1418,906)}>
      {photo(asset,'background','/reference/flash-hero-photo.png',
        {position:'absolute',inset:0,width:1418,height:906,borderRadius:0}, {x:51,y:52})}
      <Media id={`${asset.id}/urgency/mark`} src="/graphics/brush-strip.svg"
        alt="Orange brush" style={{position:'absolute',left:918,top:190,width:427,height:82}} />
      <Editable id={`${asset.id}/urgency`} style={txt(946,198,56,
        {color:'#fff',whiteSpace:'nowrap'})}>
        {asset.copy.marquee || asset.copy.eyebrow || '3 DAYS ONLY'}
      </Editable>
      <Editable id={`${asset.id}/lead`} style={txt(700,304,86,
        {color:'#fff',fontWeight:800,whiteSpace:'nowrap',
          fontSize:Math.min(86,Math.floor(620/((asset.copy.title || 'SALE').length*.65+2)))})}>{asset.scope.topic ? asset.copy.eyebrow || '' : `ϟ ${asset.copy.title || 'SALE'} ϟ`}</Editable>
      {!asset.scope.topic && <Editable id={`${asset.id}/prefix`} style={txt(518,417,52,
        {color:'#fff',whiteSpace:'pre-line',lineHeight:.85})}>{/\bUP\s+TO\b/i.test(asset.copy.body || '') ? 'UP\nTO' : asset.copy.lead || 'EXTRA'}</Editable>}
      <Editable id={`${asset.id}/offer`} style={txt(613,391,166,
        {color:'#fff',fontWeight:800,whiteSpace:'nowrap',letterSpacing:-6,
          fontSize:asset.scope.topic ? Math.min(166,Math.floor(730/(asset.scope.topic.length*.55))) : 166})}>{asset.scope.topic || offer}</Editable>
      <Editable id={`${asset.id}/qualifier`} style={txt(742,578,58,
        {color:'#fff',whiteSpace:'nowrap'})}>
        {asset.copy.qualifier && asset.copy.qualifier.length < 42 ? asset.copy.qualifier : ''}
      </Editable>
      {asset.copy.dates && <Editable id={`${asset.id}/dates`} style={txt(744,650,34,
        {color:'#fff',fontWeight:700,whiteSpace:'nowrap'})}>{asset.copy.dates}</Editable>}
      <Editable id={`${asset.id}/cta`} style={txt(930,713,53,
        {color:'#fff',background:orange,borderRadius:19,padding:'28px 72px',
          fontWeight:700})}>{asset.copy.cta || 'Shop Now'}</Editable>
    </div>
  </div>;
}

export function BoardHero({ asset, templateId }: {asset:SheetAsset;templateId:string}) {
  return templateId === 'sc26_0060' ? <Bump asset={asset} />
    : templateId === 'sc26_0058' ? <Autumn asset={asset} />
    : <Flash asset={asset} />;
}
