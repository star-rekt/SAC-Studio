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
import { useEdits, picOf, sizeOf } from './store';
import { Swatches, SizeRow } from './Controls';
import { offeredFor, isMediaSlot, byKind, LIBRARY, PHOTOS,
         type Item, type Kind } from '../model/media';
import { tagsFromFilename, type UserMedia } from '../model/userMedia';

export function Media({ id, src, alt, style, title }: {
  id: string;
  /** What the template puts here before anyone changes it. */
  src: string;
  alt?: string;
  style?: React.CSSProperties;
  title?: string;
}) {
  const api = useEdits();
  const on = api.mode === 'edit';
  // The caller sizes the slot; the designer scales it. Both are numbers in a
  // style object, so this multiplies rather than stacking a transform —
  // transform: scale() would grow it from the middle and push it out of the
  // row it sits in.
  const sc = sizeOf(api.edits, id);
  const pic = picOf(api.edits, id);
  const sized = sc === 1 ? style : {
    ...style,
    width: typeof style?.width === 'number' ? style.width * sc : style?.width,
    height: typeof style?.height === 'number' ? style.height * sc : style?.height,
  };
  if (pic.hidden) return on ? <span data-id={id}
    className={'pic media removed' + (api.selected === id ? ' picked' : '')}
    style={sized} title="Image removed · click to restore from the editor"
    onClick={e => { e.stopPropagation(); api.select(id); }}>Image removed</span> : null;
  return (
    <img
      data-id={id}
      src={pic.url || src}
      alt={alt ?? ''}
      draggable={false}
      className={'pic media' + (on ? ' on' : '') + (api.selected === id ? ' picked' : '')}
      style={sized}
      title={on ? (title ?? 'Click to replace from the library') : undefined}
      onClick={e => { if (!on) return; e.stopPropagation(); api.select(id); }}
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
export const asDataUrl = (f: File) => new Promise<string>((ok, no) => {
  const r = new FileReader();
  r.onload = () => ok(String(r.result));
  r.onerror = () => no(r.error ?? new Error('could not read that file'));
  r.readAsDataURL(f);
});

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
        {grid(offered, `${offered.length} to choose from`)}</>
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
