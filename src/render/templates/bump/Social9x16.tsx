/** Bump paid-social-9x16: the shared Bump social (./Social.tsx) on its own
 *  board frame (SC26_0058 Wk33 Bump). Kept as its own export so callers
 *  name the ratio they render. */
import type { SheetAsset } from '../../../sheet/types';
import { BumpSocial } from './Social';

export function BumpSocial9x16({ asset }: { asset: SheetAsset }) {
  return <BumpSocial asset={asset} ratio="9x16" />;
}
