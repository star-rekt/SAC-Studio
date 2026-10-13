/** The controls any selected thing shares: how big it is, and what colour.
 *
 *  They lived inside the text branch of the panel, so adding a library panel
 *  for logos and marks took them away — selecting a mark gave you the twenty-
 *  two graphics and lost the size slider you had been using on it. A control
 *  that belongs to more than one kind of selection belongs in neither of them.
 */
import { useEffect, useState } from 'react';
import { useEdits, paintOf, sizeOf, moveOf } from './store';
import { BRAND } from '../model/compose';

const PALETTE: [string, string][] = [
  ['orange', BRAND.orange], ['cream', BRAND.cream], ['green', BRAND.green],
  ['ink', BRAND.ink], ['white', BRAND.white], ['charcoal', '#333333'],
];

export function Swatches({ id, fill = true, type = true }: {
  id: string; fill?: boolean; type?: boolean;
}) {
  const api = useEdits();
  const p = paintOf(api.edits, id);
  const row = (kind: 'fg' | 'bg', label: string) => (
    <div className="swatches">
      <span>{label}</span>
      {PALETTE.map(([name, hex]) => (
        <button key={name} title={`${label} ${name}`}
                className={p[kind] === hex ? 'on' : ''}
                style={{ background: hex }}
                onClick={() => api.setPaint(id, { [kind]: hex })} />
      ))}
      <button className={'clear' + (p[kind] ? '' : ' on')} title="Back to the template's own"
              onClick={() => api.setPaint(id, { [kind]: undefined })}>&times;</button>
    </div>
  );
  return <>{type && row('fg', 'Type')}{fill && row('bg', 'Fill')}</>;
}

export const SIZE_MIN = 0.4, SIZE_MAX = 2.5;

/** A visible text field for every React text layer. At canvas zoom, clicking
 * and typing into a CTA can look like clicking a flattened image; this field
 * makes the same edit discoverable without changing the template component. */
export function TextRow({ id }: { id: string }) {
  const api = useEdits();
  const [value, setValue] = useState('');
  useEffect(() => {
    const element = [...document.querySelectorAll<HTMLElement>('.ed[data-id]')]
      .find(node => node.dataset.id === id);
    setValue(api.edits.text[id] ?? element?.innerText ?? '');
  }, [id, api.edits.text[id]]);
  return <label>Text
    <textarea value={value} rows={Math.max(2, Math.min(5, value.split('\n').length))}
      onChange={event => { setValue(event.target.value); api.setText(id, event.target.value); }} />
  </label>;
}

export function SizeRow({ id }: { id: string }) {
  const api = useEdits();
  const at = sizeOf(api.edits, id);
  const set = (v: number) =>
    api.resize(id, Math.max(SIZE_MIN, Math.min(SIZE_MAX, Math.round(v * 100) / 100)));
  return (
    <>
      <label>
        <span>Scale<b>{at.toFixed(2)}×</b></span>
        <input type="range" min={SIZE_MIN} max={SIZE_MAX} step={0.01} value={at}
               onChange={e => set(Number(e.target.value))} />
      </label>
      <div className="nudge">
        {[-0.1, -0.02, +0.02, +0.1].map(d => (
          <button key={d} onClick={() => set(at + d)}>{d > 0 ? '+' : ''}{d}</button>
        ))}
      </div>
    </>
  );
}

/** Offsets are relative to the component's own published position. Moving a
 * line of type here never moves the ticket, image, or whole board around it. */
export function PositionRow({ id }: { id: string }) {
  const api = useEdits();
  const { dx, dy } = moveOf(api.edits, id);
  return <div className="position-row">
    <label>X offset (px)
      <input type="number" step="1" value={Math.round(dx)}
        onChange={e => api.nudge(id, Number(e.target.value) || 0, dy)} />
    </label>
    <label>Y offset (px)
      <input type="number" step="1" value={Math.round(dy)}
        onChange={e => api.nudge(id, dx, Number(e.target.value) || 0)} />
    </label>
  </div>;
}
