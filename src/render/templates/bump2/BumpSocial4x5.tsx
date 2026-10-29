/** Bump 2 paid-social-4x5: the shared Bump 2 social (./Social.tsx) on its
 *  own board frame. Kept as its own export so callers name the ratio. */
import type { SheetAsset } from '../../../sheet/types';
import { Bump2Social } from './Social';

export function BumpSocial4x5({ asset }: { asset: SheetAsset }) {
  return <Bump2Social asset={asset} ratio="4x5" />;
}
