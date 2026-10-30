/** Bump paid-social-1x1: the shared Bump social (./Social.tsx) on its own
 *  board frame (SC26_0058 Wk33 Bump). Kept as its own export so callers
 *  name the ratio they render. */
import type { SheetAsset } from '../../../sheet/types';
import { BumpSocial } from './Social';

export function BumpSocial1x1({ asset }: { asset: SheetAsset }) {
  return <BumpSocial asset={asset} ratio="1x1" />;
}
