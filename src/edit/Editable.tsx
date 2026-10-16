/** A run of type that can be retyped and moved.
 *
 *  Moving is on a modifier-drag rather than a plain drag, because a plain drag
 *  inside a contenteditable is how you select text, and taking that away makes
 *  the field useless for the thing it is mainly for. */
import { useRef, type CSSProperties, type ReactNode } from 'react';
import { useEdits, textOf, moveOf, sizeOf, paintOf, picOf } from './store';

export const canvasZoom = (element: Element) => {
  const scaler = element.closest('.scaler');
  return scaler ? Number.parseFloat(getComputedStyle(scaler).zoom) || 1 : 1;
};

export function Editable({ id, children, style, as = 'div' }: {
  id: string; children: string; style?: CSSProperties; as?: 'div' | 'span' | 'h1' | 'h2' | 'p';
}) {
  const api = useEdits();
  const ref = useRef<HTMLElement>(null);
  const mv = moveOf(api.edits, id);
  const sc = sizeOf(api.edits, id);
  const value = textOf(api.edits, id, children);
  const on = api.mode === 'edit';
  const picked = api.selected === id;

  // The run's own size, scaled. Line height travels with it or a resized
  // headline overlaps the line under it.
  const st: CSSProperties = { ...style };
  // A colour set by hand or by a fix wins over the template's own.
  const paint = paintOf(api.edits, id);
  if (paint.fg) st.color = paint.fg;
  if (paint.bg) st.background = paint.bg;
  if (sc !== 1) {
    if (typeof st.fontSize === 'number') st.fontSize = Math.round(st.fontSize * sc);
    if (typeof st.lineHeight === 'string' && st.lineHeight.endsWith('px'))
      st.lineHeight = Math.round(parseFloat(st.lineHeight) * sc) + 'px';
  }

  const drag = (e: React.MouseEvent) => {
    if (!on || !(e.altKey || e.shiftKey || e.metaKey)) return;
    e.preventDefault(); e.stopPropagation();
    const x0 = e.clientX, y0 = e.clientY, { dx, dy } = mv;
    const zoom = canvasZoom(e.currentTarget);
    const move = (m: MouseEvent) =>
      api.nudge(id, dx + (m.clientX - x0) / zoom, dy + (m.clientY - y0) / zoom);
    const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
    window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
  };

  const Tag = as as 'div';
  return (
    <Tag
      ref={ref as never}
      className={'ed' + (on ? ' on' : '') + (picked ? ' picked' : '')}
      data-id={id}
      style={{ ...st, transform: `translate(${mv.dx}px, ${mv.dy}px)` }}
      contentEditable={on}
      suppressContentEditableWarning
      spellCheck={false}
      onMouseDown={drag}
      onFocus={() => api.select(id)}
      onBlur={(e) => {
        // Only record a change. Blur fires on any click-away, so this used to
        // write the rendered text back as an edit whenever a run was merely
        // touched -- and an edit shadows the template for ever after. A
        // 'UP TO' fixed in the template stayed broken on every campaign that
        // had ever been clicked, because a no-op edit was quietly winning.
        const now = (e.target as HTMLElement).innerText;
        if (now.trim() === children.trim()) api.setText(id, '\u0000CLEAR');
        else api.setText(id, now);
      }}
      onClick={() => on && api.select(id)}
      title={on ? 'Type to edit · Alt-drag to move · size in the editor panel' : undefined}
    >{value}</Tag>
  );
}

/** A colour-, size- and position-editable surface: the sheet's ground, an
 *  accent band, a ticket face.
 *
 *  Nothing here used to be wired to a background at all, which is what made
 *  every template's ground, strip and ticket face permanently the template's
 *  own colour, size and place. The `e.target !== e.currentTarget` guard is
 *  what lets this sit behind text runs without stealing their clicks: a
 *  click (or an alt-drag) on a run belongs to that run, same as always; on
 *  the bare background it belongs to this. */
export function Ground({ id, style, className, children, ...rest }: {
  id: string; style?: CSSProperties; className?: string; children?: ReactNode;
} & Record<string, unknown>) {
  const api = useEdits();
  const paint = paintOf(api.edits, id);
  const sc = sizeOf(api.edits, id);
  const mv = moveOf(api.edits, id);
  const texture = picOf(api.edits, id).url;
  const on = api.mode === 'edit';
  const picked = api.selected === id;

  const sized = sc === 1 ? null : {
    width: typeof style?.width === 'number' ? style.width * sc : style?.width,
    height: typeof style?.height === 'number' ? style.height * sc : style?.height,
  };
  const moved = (mv.dx || mv.dy)
    ? [style?.transform, `translate(${mv.dx}px, ${mv.dy}px)`].filter(Boolean).join(' ')
    : style?.transform;

  const drag = (e: React.MouseEvent) => {
    if (!on || e.target !== e.currentTarget || !(e.altKey || e.shiftKey || e.metaKey)) return;
    e.preventDefault(); e.stopPropagation();
    const x0 = e.clientX, y0 = e.clientY, { dx, dy } = mv;
    const zoom = canvasZoom(e.currentTarget);
    const move = (m: MouseEvent) =>
      api.nudge(id, dx + (m.clientX - x0) / zoom, dy + (m.clientY - y0) / zoom);
    const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
    window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
  };

  return (
    <div {...rest} data-id={id} className={[className, 'gr', on && 'on', picked && 'picked'].filter(Boolean).join(' ')}
      style={{ ...style, ...sized, transform: moved, ...(paint.bg ? { background: paint.bg } : null),
        ...(texture ? { backgroundImage: `url(${texture})`, backgroundSize: 'cover',
                         backgroundPosition: 'center' } : null) }}
      onMouseDown={drag}
      onClick={e => { if (!on || e.target !== e.currentTarget) return; api.select(id); }}
      title={on ? 'Alt-drag to move · size and colour in the editor panel' : undefined}
    >{children}</div>
  );
}

/** Non-editable wrapper that can still be moved, for a group of runs. */
export function Movable({ id, children, style }: {
  id: string; children: ReactNode; style?: CSSProperties;
}) {
  const api = useEdits();
  const mv = moveOf(api.edits, id);
  const paint = paintOf(api.edits, id);
  const on = api.mode === 'edit';
  const drag = (e: React.MouseEvent) => {
    if (!on) return;
    // Only move the block when the press did NOT land on a run of type.
    //
    //   preventDefault on every mousedown is what stopped the ticket being
    //   editable at all: it cancels focus, so the contenteditable inside
    //   never took the caret and 'EXTRA 20% OFF' could not be typed into.
    //   A press on a run belongs to that run; Alt still moves the block.
    const onRun = (e.target as HTMLElement).closest?.('.ed');
    if (onRun && !e.altKey) return;
    e.preventDefault();
    const x0 = e.clientX, y0 = e.clientY, { dx, dy } = mv;
    const zoom = canvasZoom(e.currentTarget);
    const move = (m: MouseEvent) =>
      api.nudge(id, dx + (m.clientX - x0) / zoom, dy + (m.clientY - y0) / zoom);
    const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
    window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
  };
  return <div className={'mv' + (on ? ' on' : '')} data-id={id}
      style={{ ...style, ...(paint.bg ? { background: paint.bg } : null),
               transform: `translate(${mv.dx}px, ${mv.dy}px)` }}
      onMouseDown={drag}>{children}</div>;
}
