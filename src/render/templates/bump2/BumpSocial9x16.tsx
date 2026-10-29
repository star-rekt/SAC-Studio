/** Bump 2 paid-social-9x16: the shared Bump 2 social (./Social.tsx) on its
 *  own board frame. Kept as its own export so callers name the ratio. */
import type { SheetAsset } from '../../../sheet/types';
import { Bump2Social } from './Social';

export function BumpSocial9x16({ asset }: { asset: SheetAsset }) {
  return <Bump2Social asset={asset} ratio="9x16" />;
}
