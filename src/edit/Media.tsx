/** A media placeholder: a logo, a mark, a texture — anything the library fills.
 *
 *  It rides the same `pic` edit the photograph already uses rather than
 *  inventing a second mechanism. That edit is proven end to end: it saves into
 *  the session, survives a reload, is read by the layer walk and reaches the
 *  Figma plugin. A parallel "which logo" store would have to earn all of that
 *  again, and would drift.
 *
 *  Still one <img>. The layer walk, the SVG route and the review all walk this
 *  exact DOM, and the Figma plugin indexes a frame's children positionally, so
 *  a wrapper here would be felt four files away.
 */
import { useEffect, useRef, useState } from 'react';
import { useEdits, picOf, sizeOf, paintOf, moveOf } from './store';
import { Swatches, SizeRow, PositionRow } from './Controls';
import { offeredFor, isMediaSlot, byKind, LIBRARY, PHOTOS,
         type Item, type Kind } from '../model/media';
import { FigmaLogos } from './FigmaLogos';
import { tagsFromFilename, type UserMedia } from '../model/userMedia';
import { canvasZoom, pick } from './Editable';
import MARK_SHAPES from '../data/mark-shapes.json';

/** The graphics library's own ids, keyed by the file CSS masks against --
 *  an svg whose name is in here has its real geometry (and the Figma plugin
 *  can build a vector from it); any other .svg still renders as a plain
 *  picture rather than guessing at a shape it has no path data for. */
const MASKABLE = new Set(Object.keys(MARK_SHAPES));
const maskableUrl = (url: string) => MASKABLE.has(url.replace(/^.*\/|\.svg$/g, ''));

export function Media({ id, src, alt, style, title, fill }: {
  id: string;
  /** What the template puts here before anyone changes it. */
  src: string;
  alt?: string;
  style?: React.CSSProperties;
  title?: string;
  /** The maskable (vector) branch's own default colour, for a mark the
   *  library stocks in one colour (the brush stroke ships registered
   *  orange) that a template needs in another -- Flash's social posts set
   *  it green, same mark. A live recolour from the panel still wins over
   *  this, the same as it wins over the registry's own default. */
  fill?: string;
}) {
  const api = useEdits();
  const on = api.mode === 'edit';
  // The caller sizes the slot; the designer scales it. Both are numbers in a
  // style object, so this multiplies rather than stacking a transform —
  // transform: scale() would grow it from the middle and push it out of the
  // row it sits in.
  const sc = sizeOf(api.edits, id);
  const pic = picOf(api.edits, id);
  const paint = paintOf(api.edits, id);
  const mv = moveOf(api.edits, id);
  const sized = sc === 1 ? style : {
    ...style,
    width: typeof style?.width === 'number' ? style.width * sc : style?.width,
    height: typeof style?.height === 'number' ? style.height * sc : style?.height,
  };
  const moved = (mv.dx || mv.dy)
    ? [sized?.transform, `translate(${mv.dx}px, ${mv.dy}px)`].filter(Boolean).join(' ')
    : sized?.transform;
  // Alt-drag, same modifier as every other editable thing -- a plain click
  // still just selects it, which is what opens the panel to swap or recolour.
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
  if (pic.hidden) return on ? <span data-id={id}
    className={'pic media removed' + (api.selected === id ? ' picked' : '')
      + (api.selectedGroup.includes(id) ? ' in-group' : '')}
    style={{ pointerEvents: 'auto', ...sized }} title="Image removed · click to restore from the editor"
    onClick={e => { e.stopPropagation(); pick(api, id, e); }}>Image removed</span> : null;
  const url = pic.url || src;
  // A mark drawn as <img> can never be recoloured -- an external bitmap or
  // svg reference is opaque to CSS no matter what the file holds inside it.
  // Masking against its own alpha, the way the brush-strip always has been,
  // keeps the same swap and size mechanism and adds a real colour control;
  // data-clip-shape below is what lets toLayers hand the Figma plugin the
  // real path instead of a flattened picture.
  if (maskableUrl(url)) {
    const shape = url.replace(/^.*\/|\.svg$/g, '');
    return (
      <div
        data-id={id}
        data-clip-shape={shape}
        className={'pic media vector' + (on ? ' on' : '') + (api.selected === id ? ' picked' : '')
          + (api.selectedGroup.includes(id) ? ' in-group' : '')}
        style={{ pointerEvents: 'auto', ...sized, transform: moved,
          background: paint.bg ?? fill ?? MARK_SHAPES[shape as keyof typeof MARK_SHAPES].fill,
          WebkitMaskImage: `url(${url})`, maskImage: `url(${url})`,
          WebkitMaskSize: '100% 100%', maskSize: '100% 100%',
          WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat' }}
        title={on ? (title ?? 'Click to recolour, resize or replace from the library · Alt-drag to move it · Shift-click to add to an alignment group') : undefined}
        onMouseDown={drag}
        onClick={e => { if (!on) return; e.stopPropagation(); pick(api, id, e); }}
      />
    );
  }
  return (
    <img
      data-id={id}
      src={url}
      alt={alt ?? ''}
      draggable={false}
      className={'pic media' + (on ? ' on' : '') + (api.selected === id ? ' picked' : '')
        + (api.selectedGroup.includes(id) ? ' in-group' : '')}
      style={{ pointerEvents: 'auto', ...sized, transform: moved }}
      title={on ? (title ?? 'Click to replace from the library · Alt-drag to move it · Shift-click to add to an alignment group') : undefined}
      onMouseDown={drag}
      onClick={e => { if (!on) return; e.stopPropagation(); pick(api, id, e); }}
    />
  );
}

/** The file a media slot is actually showing, for slots that are not an <img>
 *  — a CSS mask or a background. Same edit, read directly. */
export const mediaSrc = (edits: Parameters<typeof picOf>[0], id: string, fallback: string) =>
  picOf(edits, id).hidden ? '' : picOf(edits, id).url || fallback;


/** Read an upload as a data URL, not an object URL.
 *
 *  URL.createObjectURL hands back a blob: reference that lives and dies with
 *  the document. It was written into the session, so a campaign saved after an
 *  upload held a pointer to nothing; and the exporter resolves a src against
 *  public/, so a blob: src found no file and the picture was dropped from the
 *  bundle without a word. The bytes travel with the edit now.
 */
const readAsDataUrl = (f: Blob) => new Promise<string>((ok, no) => {
  const r = new FileReader();
  r.onload = () => ok(String(r.result));
  r.onerror = () => no(r.error ?? new Error('could not read that file'));
  r.readAsDataURL(f);
});

// Longer than any template frame needs (the biggest is 1440 wide, 1920
// tall) with room left to zoom in, and small enough that an original camera
// file doesn't blow past the server's upload limit or bloat every campaign
// that carries it.
const MAX_EDGE = 3200;

/** Whether any pixel is see-through, sampled on a 64px copy -- a PNG photo
 *  has none and is far smaller re-encoded as JPEG; a cut-out logo keeps PNG. */
const hasAlpha = (canvas: HTMLCanvasElement) => {
  const probe = document.createElement('canvas');
  probe.width = 64; probe.height = Math.max(1, Math.round(64 * canvas.height / canvas.width));
  const ctx = probe.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(canvas, 0, 0, probe.width, probe.height);
  const px = ctx.getImageData(0, 0, probe.width, probe.height).data;
  for (let i = 3; i < px.length; i += 4) if (px[i] < 250) return true;
  return false;
};

/** An upload as a data URL -- a raster photo larger than MAX_EDGE or 4 MB is
 *  downscaled (JPEG, or PNG when it has transparency) first. SVGs and small
 *  files go through untouched. */
export const asDataUrl = async (f: File): Promise<string> => {
  if (!/^image\/(jpeg|png|webp)$/.test(f.type)) return readAsDataUrl(f);
  const bitmap = await createImageBitmap(f).catch(() => null);
  if (!bitmap) return readAsDataUrl(f);
  const k = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  if (k === 1 && f.size <= 4_000_000) { bitmap.close(); return readAsDataUrl(f); }
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * k); canvas.height = Math.round(bitmap.height * k);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL(f.type === 'image/png' && hasAlpha(canvas) ? 'image/png' : 'image/jpeg', 0.9);
};

/** The selected slot's own controls — how big, what colour, and back to the
 *  template. The LIBRARY is a separate section with its own button; browsing
 *  what could go in a slot and adjusting what is already in it are two
 *  different jobs and they were sharing one panel. */
export function MediaControls({ id }: { id: string }) {
  const api = useEdits();
  const kind = offeredFor(id)[0]?.kind;
  const chosen = picOf(api.edits, id).url;
  const hidden = !!picOf(api.edits, id).hidden;
  const item = [...LIBRARY, ...api.library].find(i => i.file === chosen);
  return (
    <>
      <h4>{kind === 'brand' ? 'Brand' : kind === 'mark' ? 'Graphic'
        : kind === 'product' ? 'Product image' : 'Logo'}</h4>
      <p className="muted">
        {chosen
          ? (item ? `${item.name}, from the library.` : 'An uploaded file.')
          : 'As the template chose it.'}
        {' '}Open <b>Library</b> to replace it.
      </p>
      <button onClick={() => api.setPic(id, { hidden: !hidden })}>
        {hidden ? 'Restore image on this asset' : 'Remove image from this asset'}
      </button>
      <h4>Size</h4>
      <SizeRow id={id} />
      <h4>Position</h4>
      <PositionRow id={id} />
      {kind === 'mark' && (
        <>
          <h4>Colour</h4>
          {/* A mark is a shape filled with a colour, so only the fill applies;
              a logo is artwork and recolouring it is not ours to do. */}
          <Swatches id={id} type={false} />
        </>
      )}
      {/* reset, not setPic({url: undefined}): merging an undefined left the
          record behind, so a campaign put back the way it started still
          counted the edit and still carried it in the session. */}
      <button onClick={() => api.reset(id)}>Back to what the template chose</button>
    </>
  );
}

/** The library. Its own section, because it is a place you go to look for
 *  something — not a control on whatever happens to be selected. */
function UserTags({ item }: { item: UserMedia }) {
  const api = useEdits();
  const [draft, setDraft] = useState(item.tags.join(', '));
  const [error, setError] = useState('');
  useEffect(() => setDraft(item.tags.join(', ')), [item.tags]);
  const save = async () => {
    const tags = draft.split(',').map(x => x.trim()).filter(Boolean);
    if (tags.join(',') === item.tags.join(',')) return;
    try { await api.retagLibrary(item.id, tags); setError(''); }
    catch (e) { setError(String(e)); }
  };
  return <div className="user-media-controls">
    <label>Tags
      <input value={draft} placeholder="socks, trail, autumn"
        onChange={e => setDraft(e.target.value)} onBlur={() => { void save(); }}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void save(); } }} />
    </label>
    <button type="button" onClick={() => { void api.removeLibrary(item.id).catch(e => setError(String(e))); }}>
      Remove upload
    </button>
    {error && <small role="alert">{error}</small>}
  </div>;
}

/** The brand a brand slot shows now, by its logo's alt text ('Brand' when unnamed). */
const brandOf = (slot: string) => {
  const alt = document.querySelector(`[data-id="${CSS.escape(slot)}"]`)?.getAttribute('alt') ?? '';
  return alt && alt !== 'Brand' ? alt : '';
};

export function LibraryPanel({ selected, assets }: { selected: string | null;
  assets: { id: string; label: string; size: [number, number]; custom?: boolean }[] }) {
  const api = useEdits();
  const file = useRef<HTMLInputElement>(null);
  const slot = selected && isMediaSlot(selected) ? selected : null;
  const chosen = slot ? picOf(api.edits, slot) : undefined;
  const [tags, setTags] = useState('');
  const [kind, setKind] = useState<Kind>('photo');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [targetId, setTargetId] = useState(assets[0]?.id ?? '');
  const target = assets.find(asset => asset.id === targetId) ?? assets[0];

  const take = async (f: File | undefined) => {
    if (!f) return;
    setBusy(true); setError('');
    try {
      const item = await api.addLibrary({
        name: f.name.replace(/\.[^.]+$/, ''),
        kind: slot ? offeredFor(slot)[0]?.kind ?? kind : kind,
        file: await asDataUrl(f),
        tags: tags.trim() ? tags.split(',').map(x => x.trim()).filter(Boolean)
          : tagsFromFilename(f.name),
      });
      if (slot) api.setPic(slot, { url: item.file, zone: undefined, hidden: false });
      setTags('');
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };

  const allByKind = (value: Kind): Item[] => [
    ...byKind(value), ...api.library.filter(item => item.kind === value),
  ];

  const grid = (items: Item[], head: string) => items.length > 0 && (
    <section key={head}>
      <h4>{head}</h4>
      <ul className="lib">
        {items.map(i => (
          <li key={i.id} draggable={!!target?.custom}
            onDragStart={e => e.dataTransfer.setData('application/x-sac-media', i.id)}
            className={chosen?.url === i.file || chosen?.zone === i.id ? 'on' : ''}>
            <button title={i.note ? `${i.name} · ${i.note}` : i.name}
                    disabled={!slot}
                    onClick={() => slot && api.setPic(slot,
                      // A zone photograph is a crop-aware catalogue record;
                      // a reference-board photo is an exact file. Both must
                      // be selectable from the same library.
                      i.kind === 'photo' && PHOTOS.some(p => p.id === i.id)
                        ? { zone: i.id, url: undefined, hidden: false }
                        : { url: i.file, zone: undefined, hidden: false })}>
              <img src={i.file} alt="" loading="lazy" />
              <span>{i.name}</span>
            </button>
            {(i.kind === 'mark' || target?.custom) && target && <button type="button" className="add-graphic"
              onClick={() => api.addGraphic(target.id, i, target.size, target.custom)}>
              Add to {target.label}
            </button>}
            {'userAdded' in i && i.userAdded === true && <UserTags item={i as UserMedia} />}
          </li>
        ))}
      </ul>
    </section>
  );

  const offered = slot ? [...offeredFor(slot), ...api.library.filter(item =>
    offeredFor(slot).some(base => base.kind === item.kind))] : [];
  return (
    <>
      <h4>Library</h4>
      {target && <label>Board for new layers
        <select value={target.id} onChange={e => setTargetId(e.target.value)}>
          {assets.map(asset => <option key={asset.id} value={asset.id}>
            {asset.label} · {asset.id}
          </option>)}
        </select>
      </label>}
      {slot ? <><p className="muted">Replacing <code>{slot}</code></p>
        {grid(offered, `${offered.length} to choose from`)}
        {/* A brand slot can also take any logo from the Figma vendor library,
            searched from the brand it shows now. */}
        {offeredFor(slot)[0]?.kind === 'brand' && <FigmaLogos key={slot} brand={brandOf(slot)}
          onPick={url => api.setPic(slot, { url, zone: undefined, hidden: false })} />}</>
      : <p className="muted">Select an image or graphic on the artwork to replace it,
          or add an image below for later use.</p>}
      <h4>Add your own image</h4>
      {!slot && <label>Type
        <select value={kind} onChange={e => setKind(e.target.value as Kind)}>
          {(['photo','product','brand','mark','wordmark','social','texture'] as Kind[])
            .map(value => <option key={value} value={value}>{value}</option>)}
        </select>
      </label>}
      <label>Tags (comma separated)
        <input value={tags} placeholder="Auto-tag from filename if blank"
          onChange={e => setTags(e.target.value)} />
      </label>
      <button disabled={busy} onClick={() => file.current?.click()}>
        {busy ? 'Adding…' : slot ? 'Upload and use image…' : 'Add image to library…'}
      </button>
      <input ref={file} type="file" accept="image/*,image/svg+xml" hidden
             onChange={e => { void take(e.target.files?.[0]); e.target.value = ''; }} />
      {error && <p role="alert">{error}</p>}
      <p className="muted">Uploads are available across campaigns. Removing one from
        the library does not remove it from artwork that already uses it.</p>
      {!slot && <>
        {grid(allByKind('brand'), `Brands · ${allByKind('brand').length}`)}
        {grid(allByKind('photo'), `Photographs · ${allByKind('photo').length}`)}
        {grid(allByKind('product'), `Products · ${allByKind('product').length}`)}
        {grid(allByKind('mark'), `Graphics · ${allByKind('mark').length}`)}
        {grid(allByKind('wordmark'), 'Wordmark')}
        {grid(allByKind('social'), 'Social')}
        {grid(allByKind('texture'), 'Textures')}
      </>}
    </>
  );
}
