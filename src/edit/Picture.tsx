/** A photograph slot: replace it, crop it by dragging, zoom it, adjust it.
 *
 *  The crop is a pan-and-zoom over object-fit: cover, which is the same thing
 *  Figma's crop does and the same thing an <img> in an email does. Keeping to
 *  that means what is seen here is what the exported asset is, rather than a
 *  preview that has to be reproduced somewhere else. */
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useEdits, picOf, FRESH_PIC, type Pic } from './store';
import { asDataUrl } from './Media';
import { ZONE_LIST, photoUrl, standIn, type Zone } from '../model/compose';
import { byKind, PHOTOS } from '../model/media';

const byId = new Map(ZONE_LIST.map(z => [z.id, z]));
export const SuggestedImage = createContext<string | undefined>(undefined);

export function Picture({ id, zone, style, label, focus, initialSrc,
  initialScale = 1, zoomOrigin }: {
  id: string; zone: Zone; style?: React.CSSProperties; label?: string;
  /** Exact board asset shown until the designer chooses another photograph. */
  initialSrc?: string;
  /** Board crop before a designer makes a relative zoom edit. */
  initialScale?: number;
  zoomOrigin?: { x: number; y: number };
  /** Where to sit the crop before anyone has dragged it. Square slots take
   *  the middle; a shaped one says so, because the part of a photograph a
   *  mask keeps is not the part a centred crop shows. */
  focus?: { x: number; y: number };
}) {
  const api = useEdits();
  const suggestion = useContext(SuggestedImage);
  const p = { ...picOf(api.edits, id), ...(api.edits.pic[id] ? {} : focus ?? {}) };
  const box = useRef<HTMLDivElement>(null);
  const [missing, setMissing] = useState(false);
  const z = (p.zone && byId.get(p.zone)) || zone;
  const primary = /\/photo$/.test(id) && !/\/(product|collage)\//.test(id);
  const src = p.url || (p.zone ? photoUrl(z.id)
    : primary && suggestion ? suggestion : initialSrc || photoUrl(z.id));
  const on = api.mode === 'edit';

  // A failed load must not be permanent.
  //
  //   This used to unmount the <img> on error and render the stand-in in its
  //   place. Anyone who opened the page before the photographs were fetched
  //   then had no <img> left to point anywhere: picking another photograph
  //   from the panel changed the src of an element that was no longer on the
  //   page, so nothing appeared and the dropdown looked broken. The image now
  //   stays mounted and simply hides, and a new src is a fresh attempt.
  useEffect(() => { setMissing(false); }, [src]);

  const drag = (e: React.MouseEvent) => {
    if (!on) return;
    e.preventDefault(); e.stopPropagation();
    api.select(id);
    if (p.hidden) return;
    const w = box.current?.clientWidth || 1, h = box.current?.clientHeight || 1;
    const x0 = e.clientX, y0 = e.clientY, px = p.x, py = p.y;
    const move = (m: MouseEvent) => {
      // A normal click can produce a sub-pixel mousemove before mouseup.
      // Selecting a photograph must not silently create a crop edit.
      if (Math.hypot(m.clientX - x0, m.clientY - y0) < 3) return;
      api.setPic(id, {
        x: Math.max(0, Math.min(100, px - ((m.clientX - x0) / w) * 100)),
        y: Math.max(0, Math.min(100, py - ((m.clientY - y0) / h) * 100)) });
    };
    const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
    window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
  };

  const wheel = (e: React.WheelEvent) => {
    if (!on || p.hidden) return;
    api.setPic(id, { scale: Math.max(1, Math.min(3, p.scale - e.deltaY * 0.002)) });
  };

  const filter = `brightness(${p.brightness}) contrast(${p.contrast}) saturate(${p.saturate})`;

  return (
    <div ref={box} data-id={id}
         className={'pic' + (on ? ' on' : '') + (api.selected === id ? ' picked' : '')
           + (p.hidden ? ' removed' : '')}
         style={{ ...style, background: p.hidden ? 'transparent'
           : initialSrc && !missing ? 'transparent' : standIn(z) }}
         onMouseDown={drag} onWheel={wheel}
         title={on ? p.hidden ? 'Image removed · click to restore from the editor'
           : 'Drag to crop · scroll to zoom' : undefined}>
      {!p.hidden && <img src={src} alt={label ?? z.id} draggable={false}
           onError={() => setMissing(true)} onLoad={() => setMissing(false)}
           style={{ objectPosition: `${p.x}% ${p.y}%`, transform: `scale(${initialScale * p.scale})`,
                    transformOrigin: zoomOrigin ? `${zoomOrigin.x}% ${zoomOrigin.y}%` : undefined, filter,
                    opacity: missing ? 0 : 1 }} />}
      {p.hidden && on && <span className="removed-label">Image removed</span>}
      {!p.hidden && missing && (
        <div className="standin">
          <b>{z.id}</b>
          <span>{z.surface ?? 'photograph'}</span>
          <em>FIGMA_TOKEN=… npm run photos</em>
        </div>
      )}
    </div>
  );
}

/** The controls for whichever picture is selected. */
export function PicturePanel({ id }: { id: string }) {
  const api = useEdits();
  const p = picOf(api.edits, id);
  const file = useRef<HTMLInputElement>(null);
  const row = (k: keyof Pic, lo: number, hi: number, step: number, name: string) => (
    <label key={k}>
      <span>{name}<b>{(p[k] as number).toFixed(2)}</b></span>
      <input type="range" min={lo} max={hi} step={step} value={p[k] as number}
             onChange={e => api.setPic(id, { [k]: Number(e.target.value) } as Partial<Pic>)} />
    </label>
  );
  return (
    <>
      <h4>Photograph</h4>
      <button onClick={() => api.setPic(id, { hidden: !p.hidden })}>
        {p.hidden ? 'Restore image on this asset' : 'Remove image from this asset'}
      </button>
      <ul className="lib photos">
        {byKind('photo').map(i => (
          <li key={i.id} className={p.zone === i.id ? 'on' : ''}>
            <button title={`${i.name} · ${i.note ?? ''}`}
                    onClick={() => api.setPic(id, PHOTOS.some(p => p.id === i.id)
                      ? { zone: i.id, url: undefined, hidden: false }
                      : { url: i.file, zone: undefined, hidden: false })}>
              <img src={i.file} alt="" loading="lazy" />
              <span>{i.name}</span>
            </button>
          </li>
        ))}
      </ul>
      <button onClick={() => file.current?.click()}>Replace with a file…</button>
      <input ref={file} type="file" accept="image/*" hidden onChange={e => {
        const f = e.target.files?.[0]; e.target.value = ''; if (!f) return;
        // Not createObjectURL: that blob: reference dies with the document, so
        // the upload was lost on reload and silently dropped from the export.
        void asDataUrl(f).then(url => api.setPic(id, { url, zone: undefined, hidden: false }));
      }} />
      {row('scale', 1, 3, 0.01, 'Zoom')}
      {row('x', 0, 100, 1, 'Pan X')}
      {row('y', 0, 100, 1, 'Pan Y')}
      {row('brightness', 0.4, 1.6, 0.01, 'Brightness')}
      {row('contrast', 0.4, 1.6, 0.01, 'Contrast')}
      {row('saturate', 0, 2, 0.01, 'Saturation')}
      <button onClick={() => api.setPic(id, FRESH_PIC)}>Reset this photograph</button>
    </>
  );
}
