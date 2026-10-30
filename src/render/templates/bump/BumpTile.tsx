/** All nine Bump CPLP tiles use the same orange halftone field and oversized,
 * centred two-line type. Content comes from the brief's category list. */
import type { SheetAsset } from '../../../sheet/types';
import { Editable, Ground } from '../../../edit/Editable';
import { stack } from '../../../fonts';
import { useEdits, textOf } from '../../../edit/store';
import { fitText } from '../../../model/textContracts';

/** `colour`: the field's, when another template's campaign takes this design. */
export function BumpTile({ asset, colour = '#f14222' }: { asset: SheetAsset; colour?: string }) {
  const [w,h] = asset.size;
  const words = (asset.scope.category || asset.label || 'CATEGORY').toUpperCase()
    .replace(/\bAPPAREL\b/g,'APPAREL').split(/\s+/);
  const line1 = words.length === 1 ? words[0] : words.slice(0,Math.ceil(words.length/2)).join(' ');
  const line2 = words.length === 1 ? '' : words.slice(Math.ceil(words.length/2)).join(' ');
  const text = line2 ? `${line1}\n${line2}` : line1;
  // Its contract: 163px when each line fits 1330px, shrinking to fit the
  // longer line (the live one, once edited), at most to 60%.
  const { edits } = useEdits();
  const fit = textOf(edits, `${asset.id}/category`, text).split('\n')
    .map(line => fitText(line, 'tile.category', { widthBudget: 1330, fontMax: 163, fontMin: 98, charFactor: .69 }))
    .reduce((a, b) => b.fontSize < a.fontSize ? b : a);
  const fontSize = fit.fontSize;
  return <Ground id={`${asset.id}/fill`} className="sheet" style={{width:w,height:h,position:'relative',overflow:'hidden',
    background:colour,backgroundImage:'radial-gradient(#1f1f1f55 .95px, transparent 1.3px)',
    backgroundSize:'7px 7px',display:'grid',placeItems:'center'}}>
    <Editable id={`${asset.id}/category`} fit={fit.contract} style={{fontFamily:stack('Quiet Sans'),
      fontWeight:800,fontSize,color:'#fff',textAlign:'center',whiteSpace:'pre-line',
      lineHeight:.92,letterSpacing:-3}}>{text}</Editable>
  </Ground>;
}
