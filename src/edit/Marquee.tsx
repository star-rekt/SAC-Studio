/** Box-select: drag a rectangle over an asset and every text run or graphic
 *  mark it touches joins the alignment group at once. Shift/cmd-click is
 *  precise but small text at a low zoom is a fiddly target one at a time --
 *  a designer who wants "everything in this corner" should be able to drag
 *  around it instead of hunting each run down.
 *
 *  Scoped to the one asset the drag started in (`.col`, the board's own
 *  per-asset wrapper) -- the same rule `alignGroup` itself falls back on --
 *  so a drag near a card's edge can never sweep up a neighbouring asset's
 *  layers too. */
import { useRef, useState } from 'react';
import { useEdits } from './store';

/** Every candidate layer the rectangle currently covers, scoped to the one
 *  asset the drag started in. Shared between the live preview (every mouse
 *  move) and the final pick on mouseup, so what a designer sees highlighted
 *  while dragging is exactly what they get when they let go -- not a second,
 *  separately-computed answer that could disagree with the first. */
function hitsIn(scope: Element | null | undefined, x1: number, y1: number, x2: number, y2: number): string[] {
  if (!scope) return [];
  // Never a `.gr` background: it is the full canvas (or close to it), so it
  // is caught by nearly any rectangle drawn on the asset at all, and a
  // backdrop joining an alignment group dominates the shift with its own
  // near-canvas-sized box. Shift/cmd-click still reaches it directly when a
  // designer genuinely means to move the background itself.
  return [...scope.querySelectorAll<HTMLElement>('.ed[data-id], .pic.media[data-id]')]
    .filter(el => {
      const b = el.getBoundingClientRect();
      return b.left < x2 && b.right > x1 && b.top < y2 && b.bottom > y1;
    }).map(el => el.dataset.id!);
}

export function Marquee({ active }: { active: boolean }) {
  const api = useEdits();
  const ref = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null);

  if (!active) return null;

  const down = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const scope = ref.current?.closest('.col');
    const x0 = e.clientX, y0 = e.clientY;
    setRect({ left: x0, top: y0, width: 0, height: 0 });
    // Defends against the one thing that behaves differently by drag
    // direction in a real browser: a native text selection, whose anchor is
    // the press point and whose extent (and so whatever it swallows of the
    // mouseup) differs depending on which way the drag runs. preventDefault
    // above already stops it starting on this overlay itself; this also
    // stops it continuing if the cursor momentarily leaves the overlay over
    // a contenteditable run mid-drag.
    const prevUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = 'none';

    const move = (m: MouseEvent) => {
      const left = Math.min(x0, m.clientX), top = Math.min(y0, m.clientY);
      const width = Math.abs(m.clientX - x0), height = Math.abs(m.clientY - y0);
      setRect({ left, top, width, height });
      // Live preview: highlight exactly what the rectangle covers right now,
      // so a designer can see the selection build (or shrink) as they drag,
      // in either direction, rather than finding out only on release.
      api.setGroup(hitsIn(scope, left, top, left + width, top + height));
    };
    const up = (m: MouseEvent) => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      document.body.style.userSelect = prevUserSelect;
      setRect(null);
      const x1 = Math.min(x0, m.clientX), y1 = Math.min(y0, m.clientY);
      const x2 = Math.max(x0, m.clientX), y2 = Math.max(y0, m.clientY);
      // A plain click, not a real drag, selects nothing -- it is how a
      // designer dismisses the box-select without picking anything up.
      api.setGroup(x2 - x1 < 3 && y2 - y1 < 3 ? [] : hitsIn(scope, x1, y1, x2, y2));
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  return <div ref={ref} className="marquee-capture" onMouseDown={down}>
    {rect && <div className="marquee-rect" style={rect} />}
  </div>;
}
