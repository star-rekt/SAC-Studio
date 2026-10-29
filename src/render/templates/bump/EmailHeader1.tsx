/** Bump email send 1's hero (538:21930, 826): the shared Bump email send
 *  (./EmailSend.tsx) on its own board frame. Kept as its own export so
 *  callers name the send they render. */
import type { SheetAsset } from '../../../sheet/types';
import { BumpEmailSend } from './EmailSend';

export function BumpEmailHeader1({ asset }: { asset: SheetAsset }) {
  return <BumpEmailSend asset={asset} send={1} />;
}
