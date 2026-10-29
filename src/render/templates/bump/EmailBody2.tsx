/** Bump email send 2's full marketing email: the shared Bump email body
 *  (./EmailBody.tsx) on send 2's own board frame, with send 2's hero.
 *  Kept as its own export so callers name the send they render. */
import type { SheetAsset } from '../../../sheet/types';
import { BumpEmailBody } from './EmailBody';

export function BumpEmailBody2({ asset, hero }: { asset: SheetAsset; hero?: React.ReactNode }) {
  return <BumpEmailBody asset={asset} hero={hero} send={2} />;
}
