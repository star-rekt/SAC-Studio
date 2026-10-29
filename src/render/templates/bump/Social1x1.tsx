/** Bump paid-social-1x1: the shared Bump social (./Social.tsx) on its own
 *  board frame (SC26_0058 Wk33 Bump). Kept as its own export so callers
 *  name the ratio they render. */
import type { SheetAsset } from '../../../sheet/types';
import type { Direction } from '../../../templates/directions';
import { BumpSocial } from './Social';

export function BumpSocial1x1({ asset, direction }: { asset: SheetAsset; direction?: Direction }) {
  return <BumpSocial asset={asset} direction={direction} ratio="1x1" />;
}
