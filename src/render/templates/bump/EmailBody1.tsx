/** Bump email send 1's full marketing email -- nav header, `EmailHeader1`'s
 *  hero (matched to this send specifically, not swapped with 2/3), body
 *  copy, product grid, brand grid and footer. Unlike the fixed-canvas
 *  hero/social assets, an email body is a naturally-flowing document (the
 *  board's own Figma data uses auto-layout/flexbox here, not absolute
 *  positioning), so this renders at its natural height rather than being
 *  scaled to a fixed frame. */
import type { SheetAsset } from '../../../sheet/types';
import { Ground } from '../../../edit/Editable';
import { EmailBodyContent } from './EmailBodyContent';

export function BumpEmailBody1({ asset, hero }: { asset: SheetAsset; hero?: React.ReactNode }) {
  // The real brief's own code, not a literal "AUTUMN20" -- this body copy
  // used to name that code regardless of what campaign it was.
  const codeWord = asset.copy.code || 'AUTUMN20';

  return <Ground id={`${asset.id}/fill`} className="sheet" style={{ width: 1200, position: 'relative',
    background: '#fff' }}>
    {hero}
    <EmailBodyContent asset={asset}
      bodyCopy={`The squirrels are stockpiling and honestly, they're onto something. Hoard clothing, camp, ski and snowboard gear at an extra 20% off with code ${codeWord}.`}
      secondHeader="Top Brands" />
  </Ground>;
}
