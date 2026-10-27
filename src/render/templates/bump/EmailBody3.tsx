/** Bump email send 3's full marketing email -- nav header, `EmailHeader3`'s
 *  hero matched to this send, body copy, product grid, brand grid and
 *  footer. See `EmailBody1.tsx` for why this is a flowing document rather
 *  than a scaled fixed-canvas asset. */
import type { SheetAsset } from '../../../sheet/types';
import { Ground } from '../../../edit/Editable';
import { EmailBodyContent } from './EmailBodyContent';

export function BumpEmailBody3({ asset, hero }: { asset: SheetAsset; hero?: React.ReactNode }) {
  const codeWord = asset.copy.code || 'AUTUMN20';

  return <Ground id={`${asset.id}/fill`} className="sheet" style={{ width: 1200, position: 'relative',
    background: '#fff' }}>
    {hero}
    <EmailBodyContent asset={asset}
      bodyCopy={`This is the last lap, the final send, the closing bell. Code ${codeWord} takes an extra 20% off The North Face, Patagonia, and more until midnight.`}
      secondHeader="Bestsellers" brandTiles={4} />
  </Ground>;
}
