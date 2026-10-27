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
import { alignGroup, labelOf, type Align } from './align';

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

/** The layers a designer has selected (shift/cmd-click, or a box-select),
 *  and the three alignments they can apply. By default, layers sharing a
 *  row (two runs on one line, a button's label on its own pill) move
 *  together, and every separate row then aligns independently against the
 *  same margin or centre line -- a badge, a title, an offer line, a date
 *  line and a CTA all land flush in one click without piling two layers
 *  that share a line on top of each other (see `alignGroup` in
 *  `./align.ts`). "Move everything as one block" is the rarer opt-in, for
 *  when even separate-looking rows should keep whatever stagger they
 *  already have and only the selection's own outer edge should move.
 *  Picking exactly which layers move is the designer's job either way:
 *  build the selection, then drop anything from the list below that
 *  shouldn't move before aligning. Listed with a remove button each, since a
 *  highlighted outline on the canvas is easy to lose track of once there are
 *  four or five of them. */
export function GroupRow() {
  const api = useEdits();
  const ids = api.selectedGroup;
  const [block, setBlock] = useState(false);
  if (!ids.length) return null;
  const align = (a: Align) => alignGroup(ids, a, api.edits, api.nudge, block);
  return <section className="picked group-row">
    <h4>Aligning {ids.length} layer{ids.length === 1 ? '' : 's'}</h4>
    <p className="muted">Shift or Cmd-click a layer (or box-select on the
      canvas) to add or remove it.</p>
    <ul className="group-list">
      {ids.map(id => <li key={id}>
        <span>{labelOf(id)}</span>
        <button onClick={() => api.toggleGroup(id)} aria-label={`Remove ${labelOf(id)}`}>&times;</button>
      </li>)}
    </ul>
    <label className="group-mode">
      <input type="checkbox" checked={block} onChange={e => setBlock(e.target.checked)} />
      Move everything as one block (off: separate lines align independently;
      layers sharing a line still move together)
    </label>
    <div className="group-align">
      <button onClick={() => align('left')}>Align left</button>
      <button onClick={() => align('center')}>Centre</button>
      <button onClick={() => align('right')}>Align right</button>
    </div>
    <button onClick={() => { ids.forEach(api.reset); api.clearGroup(); }}>
      Reset these layers to the template's own position
    </button>
    <button onClick={api.clearGroup}>Clear selection</button>
  </section>;
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
