/** Turning proposed operations into edits.
 *
 *  Every op is something the designer could have done by hand -- the same
 *  move, resize and retype the panel offers -- so a fix needs no new machinery
 *  and no special undo. It lands in `Edits`, autosaves with everything else,
 *  and `Reset this` takes any one of them back.
 *
 *  Moves and sizes COMPOUND on what is already there, because the proposal was
 *  computed against the render as it stands. Treating a dx of -40 as absolute
 *  would silently discard a nudge the designer had already made.
 */
import { moveOf, sizeOf, picOf, FRESH_PIC, type Edits } from '../edit/store';
import type { Op } from './types';

export function applyOps(e: Edits, ops: Op[]): Edits {
  const text = { ...e.text }, move = { ...e.move }, size = { ...e.size },
        pic = { ...e.pic }, paint = { ...(e.paint ?? {}) };
  for (const op of ops) {
    if (op.move) {
      const was = moveOf(e, op.id);
      move[op.id] = { dx: was.dx + op.move.dx, dy: was.dy + op.move.dy };
    }
    // Clamped to the same range the panel's own slider allows, so a fix can
    // never put an element somewhere the designer could not have put it.
    if (op.size !== undefined)
      size[op.id] = Math.max(0.4, Math.min(2.5, sizeOf(e, op.id) * op.size));
    if (op.text !== undefined) text[op.id] = op.text;
    // Contrast is the rule assets fail most often and it used to have no
    // remedy here at all: every contrast note went to cannotFix as 'needs a
    // scrim'. Recolouring the type or the block behind it is a real answer.
    if (op.colour) paint[op.id] = { ...(e.paint?.[op.id] ?? {}), ...op.colour };
    // A pan is absolute, not compounded: x and y name the point of the image
    // that sits at the middle of the box, so adding them would be meaningless.
    // Clamped to the same range dragging and scrolling the photograph allow.
    if (op.pic) {
      const was = picOf(e, op.id);
      pic[op.id] = { ...FRESH_PIC, ...was,
        x: Math.max(0, Math.min(100, op.pic.x)),
        y: Math.max(0, Math.min(100, op.pic.y)),
        scale: Math.max(1, Math.min(3, op.pic.scale)) };
    }
  }
  return { text, move, size, pic, paint };
}

/** What an op will do, in words, for the list the designer approves. */
export const describe = (op: Op): string => [
  op.move && `move ${Math.abs(op.move.dx)}px ${op.move.dx < 0 ? 'left' : 'right'}`
           + (op.move.dy ? ` and ${Math.abs(op.move.dy)}px ${op.move.dy < 0 ? 'up' : 'down'}` : ''),
  op.size !== undefined && `${op.size > 1 ? 'grow' : 'shrink'} to ${Math.round(op.size * 100)}%`,
  op.text !== undefined && `set to "${op.text}"`,
  op.pic && `reframe the photograph to ${op.pic.x}/${op.pic.y}`
          + (op.pic.scale > 1 ? ` at ${op.pic.scale}× zoom` : ''),
  op.colour && [op.colour.fg && `type ${op.colour.fg}`,
                op.colour.bg && `fill ${op.colour.bg}`].filter(Boolean).join(', '),
].filter(Boolean).join(', ') || 'no change';
