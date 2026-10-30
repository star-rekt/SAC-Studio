/** Adding to an asset in Build: a text layer, a graphic from the library, or
 *  a graphic of your own (uploaded with tags; your uploads can be retagged or
 *  removed). What's added is selected, so it can be moved, sized and coloured
 *  straight away. */
import { useRef, useState } from 'react';
import { useEdits } from '../edit/store';
import { UserTags, asDataUrl } from '../edit/Media';
import { byKind } from '../model/media';
import { tagsFromFilename, type UserMedia } from '../model/userMedia';
import type { SheetAsset } from '../sheet/types';

export function AddPanel({ asset }: { asset: SheetAsset }) {
  const api = useEdits();
  const file = useRef<HTMLInputElement>(null);
  const [tags, setTags] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const marks = [...byKind('mark'), ...api.library.filter(i => i.kind === 'mark')];
  const upload = async (f: File | undefined) => {
    if (!f) return;
    setBusy(true); setError('');
    try {
      const item = await api.addLibrary({ name: f.name.replace(/\.[^.]+$/, ''), kind: 'mark', file: await asDataUrl(f),
        tags: tags.trim() ? tags.split(',').map(t => t.trim()).filter(Boolean) : tagsFromFilename(f.name) });
      api.addGraphic(asset.id, item, asset.size);
      setTags('');
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    setBusy(false);
  };
  return <section className="st-add">
    <h3>Add</h3>
    <button className="st-add-text" onClick={() => api.addCustomText(asset.id, asset.size)}>+ Text</button>
    <h4>Graphics</h4>
    <ul className="lib">
      {marks.map(i => <li key={i.id}>
        <button title={`Add ${i.name}`} onClick={() => api.addGraphic(asset.id, i, asset.size)}>
          <img src={i.file} alt="" loading="lazy" />
          {!('userAdded' in i && i.userAdded) && <span>{i.name}</span>}
        </button>
        {'userAdded' in i && i.userAdded === true && <UserTags item={i as UserMedia} />}
      </li>)}
    </ul>
    <div className="st-upload">
      <input value={tags} placeholder="Tags (optional)" onChange={e => setTags(e.target.value)} />
      <button disabled={busy} onClick={() => file.current?.click()}>{busy ? 'Adding…' : 'Upload a graphic…'}</button>
      <input ref={file} type="file" accept="image/*,image/svg+xml" hidden
        onChange={e => { void upload(e.target.files?.[0]); e.target.value = ''; }} />
    </div>
    {error && <p className="st-ai-err">{error}</p>}
  </section>;
}
