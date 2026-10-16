/** All nine Bump CPLP tiles use the same orange halftone field and oversized,
 * centred two-line type. Content comes from the brief's category list. */
import type { SheetAsset } from '../../sheet/types';
import { Editable, Ground } from '../../edit/Editable';
import { stack } from '../../fonts';

export function BumpTile({ asset }: { asset: SheetAsset }) {
  const [w,h] = asset.size;
  const words = (asset.scope.category || asset.label || 'CATEGORY').toUpperCase()
    .replace(/\bAPPAREL\b/g,'APPAREL').split(/\s+/);
  const line1 = words.length === 1 ? words[0] : words.slice(0,Math.ceil(words.length/2)).join(' ');
  const line2 = words.length === 1 ? '' : words.slice(Math.ceil(words.length/2)).join(' ');
  const longest = Math.max(line1.length,line2.length);
  const fontSize = Math.min(163, Math.floor(1330 / Math.max(4,longest*.69)));
  return <Ground id={`${asset.id}/fill`} className="sheet" style={{width:w,height:h,position:'relative',overflow:'hidden',
    background:'#f14222',backgroundImage:'radial-gradient(#1f1f1f55 .95px, transparent 1.3px)',
    backgroundSize:'7px 7px',display:'grid',placeItems:'center'}}>
    <Editable id={`${asset.id}/category`} style={{fontFamily:stack('Quiet Sans'),
      fontWeight:800,fontSize,color:'#fff',textAlign:'center',whiteSpace:'pre-line',
      lineHeight:.92,letterSpacing:-3}}>{line2 ? `${line1}\n${line2}` : line1}</Editable>
  </Ground>;
}
