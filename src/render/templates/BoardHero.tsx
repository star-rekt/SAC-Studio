/** Desktop hero, by board: each board's own compiled hero (Flash, Bump,
 *  Bump 2). Typography and each photograph are separate edit
 *  targets; no hero is a flattened screenshot. A second requested hero reuses
 *  the board's layout while its brief copy (or a designer's edits) changes
 *  independently. */
import type { SheetAsset } from '../../sheet/types';
import { Flash } from './flash/BoardHero';
import { BumpHero } from './bump/Hero';
import { Bump2Hero } from './bump2/Hero';

export function BoardHero({ asset, templateId }: {asset:SheetAsset;templateId:string}) {
  // Bump 2's own board has both phases (launch and ends today).
  if (templateId === 'sc26_bump2') return <Bump2Hero asset={asset} />;
  return templateId === 'sc26_0060' ? <BumpHero asset={asset} />
    : <Flash asset={asset} />; // Flash template-specific hero component
}
