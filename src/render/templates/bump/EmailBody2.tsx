/** Bump email send 2's full marketing email -- nav header, `EmailHeader2`
 *  (`BumpEmailHero`)'s hero matched to this send, body copy, product grid,
 *  brand grid and footer. See `EmailBody1.tsx` for why this is a flowing
 *  document rather than a scaled fixed-canvas asset. */
import type { SheetAsset } from '../../../sheet/types';
import { Ground } from '../../../edit/Editable';
import { EmailBodyContent } from './EmailBodyContent';

export function BumpEmailBody2({ asset, hero }: { asset: SheetAsset; hero?: React.ReactNode }) {
  const codeWord = asset.copy.code || 'AUTUMN20';

  return <Ground id={`${asset.id}/fill`} className="sheet" style={{ width: 1200, position: 'relative',
    background: '#fff' }}>
    {hero}
    <EmailBodyContent asset={asset}
      bodyCopy={`Your sandals had a great run. Retire them with honor and take an extra 20% off boots, layers and cool-ready gear with code ${codeWord}.`}
      secondHeader="Bestselling Brands" />
  </Ground>;
}
