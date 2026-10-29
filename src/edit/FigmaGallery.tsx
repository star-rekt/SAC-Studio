/** The SAC image gallery from Figma, inside a photo slot's panel: pursuit
 *  chips over a grid of thumbnails. Only the thumbnails are fetched up front;
 *  picking one downloads its full image (server/figmaGallery.ts) and drops
 *  it into the slot as a data URL -- exactly as an upload does, so smart
 *  placement, saving and the Figma export all treat it the same way. */
import { useEffect, useState } from 'react';
import { asDataUrl } from './Media';

type GalleryItem = { id: string; name: string; tags: string[]; pursuits: string[] };

let listing: Promise<GalleryItem[]> | null = null;
const loadGallery = () => listing ??= fetch('/api/figma-gallery').then(async r => {
  const json = await r.json();
  if (!r.ok) throw new Error(json.error || `Figma gallery failed (${r.status})`);
  return json.items as GalleryItem[];
}).catch(error => { listing = null; throw error; });

const thumbUrl = (id: string) => `/api/figma-gallery/thumb/${encodeURIComponent(id)}`;

export function FigmaGallery({ onPick }: { onPick: (url: string) => void }) {
  const [items, setItems] = useState<GalleryItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chip, setChip] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => { loadGallery().then(setItems, e => setError(String(e.message ?? e))); }, []);

  const pick = async (item: GalleryItem) => {
    setBusy(item.id);
    try {
      const res = await fetch(`/api/figma-gallery/full/${encodeURIComponent(item.id)}`);
      if (!res.ok) throw new Error(`Could not download ${item.name} (${res.status})`);
      const blob = await res.blob();
      onPick(await asDataUrl(new File([blob], `${item.name}.jpg`, { type: 'image/jpeg' })));
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(null); }
  };

  if (error) return <p className="muted">Figma gallery: {error}</p>;
  if (!items) return <p className="muted">Loading the Figma gallery…</p>;
  const chips = [...new Set(items.flatMap(i => i.pursuits))].sort();
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const shown = items.filter(i => (!chip || i.pursuits.includes(chip))
    && words.every(w => i.name.toLowerCase().includes(w) || i.tags.some(t => t.startsWith(w))));
  return <>
    <h4>Figma gallery</h4>
    <div className="chips">
      <button className={chip ? '' : 'on'} onClick={() => setChip(null)}>All</button>
      {chips.map(c => <button key={c} className={chip === c ? 'on' : ''} onClick={() => setChip(c)}>{c}</button>)}
    </div>
    <input type="search" placeholder="Search the gallery" value={query} onChange={e => setQuery(e.target.value)} />
    <ul className="lib photos">
      {shown.map(item => <li key={item.id} className={busy === item.id ? 'on' : ''}>
        <button title={item.name} disabled={!!busy} onClick={() => void pick(item)}>
          <img src={thumbUrl(item.id)} alt="" loading="lazy" />
          <span>{busy === item.id ? 'Downloading…' : item.name}</span>
        </button>
      </li>)}
    </ul>
  </>;
}
