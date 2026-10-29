/** The Copy panel: every asset's text fields, what each one says, how much
 *  it holds before it contracts or wraps, and whether it fits now -- green,
 *  yellow (contracts, up to 10%) or red (past 10%, wraps, or overflows).
 *  Edits here are the same text edits as typing on the canvas.
 *
 *  It follows the format tab that's open, like the board. Fields are measured
 *  on a hidden stage that renders that tab's assets (mounted only while this
 *  panel is open). The stage gets a read-only copy of the edit API, so nothing on it
 *  -- a photo auto-placing itself, say -- can write back into the session. */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Ctx, useEdits, textOf, type Api } from './store';
import type { SheetAsset } from '../sheet/types';
import type { Contract } from '../model/textContracts';
import { contractFit, lineFit, blockFit, wrapLines, type FieldFit } from '../model/copyFit';

type Row = { ids: string[]; where: string; fallback: string; fit: FieldFit };
type AssetRows = { asset: SheetAsset; rows: Row[] };

let canvas: HTMLCanvasElement | null = null;
const context = () => (canvas ??= document.createElement('canvas')).getContext('2d')!;
const px = (v: string) => parseFloat(v) || 0;
const CLEAR = '\u0000CLEAR';

/** One field's fit, from the element as the stage drew it. */
function measureField(el: HTMLElement, text: string): FieldFit {
  const fitted = el.closest<HTMLElement>('[data-fit]');
  const ctx = context();
  if (fitted) {
    const c = JSON.parse(fitted.dataset.fit!) as Contract;
    // Parts of one fitted line (CODE and its value) may each carry the same
    // contract: the line is all of them together.
    const peers = fitted.parentElement
      ? [...fitted.parentElement.children].filter(e => (e as HTMLElement).dataset?.fit === fitted.dataset.fit) : [fitted];
    const whole = fitted === el && peers.length < 2 ? text : peers.map(e => e.textContent ?? '').join('');
    const upper = getComputedStyle(fitted).textTransform === 'uppercase';
    return contractFit(whole, c, c.font ? (s, size) => {
      ctx.font = `${c.font!.weight} ${size}px ${c.font!.family}`;
      return ctx.measureText(upper ? s.toUpperCase() : s).width;
    } : undefined);
  }
  const cs = getComputedStyle(el);
  // An inline run (CODE / its value) has no box of its own: its line is its parent's.
  const host = cs.display === 'inline' && el.parentElement ? el.parentElement : el;
  const hs = getComputedStyle(host);
  ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  const spacing = cs.letterSpacing === 'normal' ? 0 : px(cs.letterSpacing);
  const transform = (s: string) => cs.textTransform === 'uppercase' ? s.toUpperCase() : s;
  const width = (s: string) => ctx.measureText(transform(s)).width + spacing * s.length;
  if (/nowrap|^pre$/.test(hs.whiteSpace) || host !== el) {
    const parent = host.offsetParent as HTMLElement | null;
    const room = parent ? parent.clientWidth - host.offsetLeft : host.clientWidth;
    const others = host !== el ? width(host.textContent ?? '') - width(el.textContent ?? '') : 0;
    return lineFit(text, width(text), Math.max(1, room - others));
  }
  const inner = el.clientWidth - px(cs.paddingLeft) - px(cs.paddingRight);
  const perChar = width(text) / Math.max(1, text.length) || 1;
  const designLines = wrapLines(el.dataset.default ?? text, inner, width);
  return blockFit(text, wrapLines(text, inner, width), designLines, Math.floor(inner / perChar));
}

/** A field's place in its lockup -- its id after the asset's own. An email
 *  hero's fields live under its send (`…/send-1/…`), not the sheet asset,
 *  so failing an exact prefix, everything after the asset's variant segment. */
function whereOf(id: string, assetId: string) {
  const path = id.replace(/\/\d+$/, '');
  if (path.startsWith(assetId + '/')) return path.slice(assetId.length + 1);
  const parts = path.split('/');
  const variant = (p: string) => /^(base|send-\d+|v\d+|launch|ends-today)$/.test(p);
  const at = parts.length - 1 - [...parts].reverse().findIndex(variant);
  return parts.some(variant) && at < parts.length - 1 ? parts.slice(at + 1).join('/') : parts.slice(-2).join('/');
}

function measureAll(stage: HTMLElement, assets: SheetAsset[], edits: Api['edits']): AssetRows[] {
  return assets.map(asset => {
    const wrap = stage.querySelector<HTMLElement>(`[data-copy-asset="${CSS.escape(asset.id)}"]`);
    const rows = new Map<string, Row>();
    for (const el of wrap ? [...wrap.querySelectorAll<HTMLElement>('.ed[data-id]')] : []) {
      const id = el.dataset.id!, fallback = el.dataset.default ?? '';
      const text = textOf(edits, id, fallback);
      // Whether a field is listed depends on the template's text, never on
      // what's typed -- so clearing a field can't make its row disappear.
      if (/^[\p{P}\p{S}\s]*$/u.test(fallback)) continue; // dividers, bullets
      // Repeats of one line (a marquee's four copies) are one row.
      const key = id.replace(/\/\d+$/, '');
      const known = rows.get(key);
      if (known) { known.ids.push(id); continue; }
      rows.set(key, { ids: [id], where: whereOf(id, asset.id), fallback, fit: measureField(el, text) });
      continue;
    }
    return { asset, rows: [...rows.values()] };
  });
}

/** A field's text box. Copy is edited here, never removed: an emptied box
 *  commits nothing (the asset keeps its last text) and puts that text back
 *  when it loses focus. Removing an element is the Design tab's job. */
function CopyBox({ committed, onCommit, onRestore, edited }: {
  committed: string; onCommit: (value: string) => void; onRestore: () => void; edited: boolean;
}) {
  const [draft, setDraft] = useState(committed);
  const [focused, setFocused] = useState(false);
  useEffect(() => { if (!focused) setDraft(committed); }, [committed, focused]);
  return <div className="copyfit-box">
    <textarea rows={1} value={draft}
      onFocus={() => setFocused(true)}
      onBlur={() => { setFocused(false); setDraft(committed); }}
      onChange={e => { setDraft(e.target.value); if (e.target.value.trim()) onCommit(e.target.value); }} />
    {edited && <button className="copyfit-restore" onClick={onRestore}
      title="Put back the design's own text">Restore</button>}
  </div>;
}

const DOT = { ok: '#2E9E5B', contract: '#E0A800', wrap: '#D93025' } as const;

export function CopyPanel({ assets, tab, render, onJump }: {
  /** The assets of the format tab that's open -- not the whole session. */
  assets: SheetAsset[]; tab: string; render: (asset: SheetAsset) => ReactNode;
  onJump: (asset: SheetAsset, fieldId: string) => void;
}) {
  const api = useEdits();
  const stage = useRef<HTMLDivElement>(null);
  const [report, setReport] = useState<AssetRows[] | null>(null);
  const [warningsOnly, setWarningsOnly] = useState(false);
  const noop = () => {};
  const quiet: Api = useMemo(() => ({ ...api, mode: 'preview', select: noop, setText: noop, nudge: noop,
    resize: noop, setPic: noop, setPaint: noop, reset: noop }), [api]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let live = true;
    const timer = setTimeout(() => void document.fonts.ready.then(() => {
      if (live && stage.current) setReport(measureAll(stage.current, assets, api.edits));
    }), 250);
    return () => { live = false; clearTimeout(timer); };
  }, [api.edits, assets]);

  // Exactly the template's text means "no edit"; anything else -- a
  // trailing space while a word is being typed included -- is kept as typed.
  const write = (row: Row, value: string) => {
    for (const id of row.ids) api.setText(id, value === row.fallback ? CLEAR : value);
  };
  const counts = (rows: Row[]) => ({ wrap: rows.filter(r => r.fit.status === 'wrap').length,
    contract: rows.filter(r => r.fit.status === 'contract').length });
  const total = report ? report.reduce((t, a) => { const c = counts(a.rows); return { wrap: t.wrap + c.wrap, contract: t.contract + c.contract }; },
    { wrap: 0, contract: 0 }) : null;

  return <section className="copyfit">
    <h4>Copy fit</h4>
    <p className="muted">Each field's text, what it holds at its designed size (ideal) and with up to a 10%
      shrink (max). <b style={{ color: DOT.contract }}>Yellow</b> contracts; <b style={{ color: DOT.wrap }}>red</b> shrinks
      past 10%, wraps or overflows.</p>
    {total && <p className="copyfit-total">{tab}: {total.wrap} red · {total.contract} yellow across {
      report!.length} asset{report!.length === 1 ? '' : 's'}</p>}
    <label className="group-mode"><input type="checkbox" checked={warningsOnly}
      onChange={e => setWarningsOnly(e.target.checked)} /> Warnings only</label>
    {!report && <p className="muted">Measuring every asset…</p>}
    {report?.map(({ asset, rows }) => {
      const shown = warningsOnly ? rows.filter(r => r.fit.status !== 'ok') : rows;
      if (!shown.length) return null;
      const c = counts(rows);
      return <div key={asset.id} className="copyfit-asset">
        <h5>{asset.label} <small>{asset.format} · {asset.size[0]}×{asset.size[1]}</small>{' '}
          {(c.wrap || c.contract) ? <small className="copyfit-sum">{c.wrap ? `${c.wrap} red` : ''}{c.wrap && c.contract ? ' · ' : ''}
            {c.contract ? `${c.contract} yellow` : ''}</small> : null}</h5>
        {shown.map(row => <div key={row.ids[0]} className={`copyfit-row ${row.fit.status}`}>
          <button className="copyfit-where" onClick={() => onJump(asset, row.ids[0])} title="Show this field on the canvas">
            <i style={{ background: DOT[row.fit.status] }} />{row.where}</button>
          <CopyBox committed={textOf(api.edits, row.ids[0], row.fallback)}
            onCommit={value => write(row, value)}
            onRestore={() => write(row, row.fallback)} edited={row.ids[0] in api.edits.text} />
          <span className="copyfit-count">{row.fit.chars} / {row.fit.ideal} ideal
            {row.fit.max > row.fit.ideal ? ` · ${row.fit.max} max` : ''}</span>
          {row.fit.note && <span className="copyfit-note">{row.fit.note}</span>}
        </div>)}
      </div>;
    })}
    <div ref={stage} aria-hidden className="copyfit-stage">
      <Ctx.Provider value={quiet}>
        {assets.map(a => <div key={a.id} data-copy-asset={a.id}>{render(a)}</div>)}
      </Ctx.Provider>
    </div>
  </section>;
}
