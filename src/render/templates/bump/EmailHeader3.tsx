/** Bump email send 3's hero (538:22190, 929): the shared Bump email send
 *  (./EmailSend.tsx) on its own board frame. Kept as its own export so
 *  callers name the send they render. */
import type { SheetAsset } from '../../../sheet/types';
import { BumpEmailSend } from './EmailSend';

export function BumpEmailHeader3({ asset }: { asset: SheetAsset }) {
  return <BumpEmailSend asset={asset} send={3} />;
}
