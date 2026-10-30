/** The vendor logo library from Figma, inside a brand slot's Library panel:
 *  a word search over every brand's variants (Black, White, a lockup...),
 *  thumbnails rendered only for what the search shows, and the logo itself
 *  downloaded as SVG only when picked -- then dropped into the slot as a
 *  data URL, exactly as an upload is (server/figmaLogos.ts). */
import { useEffect, useState } from 'react';
import { asDataUrl } from './Media';

type LogoItem = { id: string; brand: string; variant: string; light: boolean };

let listing: Promise<LogoItem[]> | null = null;
const loadLogos = () => listing ??= fetch('/api/figma-logos').then(async r => {
  const json = await r.json();
  if (!r.ok) throw new Error(json.error || `Figma logos failed (${r.status})`);
  return json.items as LogoItem[];
}).catch(error => { listing = null; throw error; });

const thumbUrl = (id: string) => `/api/figma-logos/thumb/${encodeURIComponent(id)}`;
/** Letters and digits only, so "arcteryx" finds Arc'teryx and "north face" The North Face. */
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, '');
const SHOWN = 60;

export function FigmaLogos({ brand, onPick }: { brand?: string; onPick: (url: string) => void }) {
  const [items, setItems] = useState<LogoItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState(brand ?? '');
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => {
    const load = () => { setError(null); loadLogos().then(setItems, e => setError(String(e.message ?? e))); };
    load();
    // A token saved while this said it needed one: try again.
    window.addEventListener('sac:figma-token-saved', load);
    return () => window.removeEventListener('sac:figma-token-saved', load);
  }, []);

  const pick = async (item: LogoItem) => {
    setBusy(item.id);
    try {
      const res = await fetch(`/api/figma-logos/full/${encodeURIComponent(item.id)}`);
      if (!res.ok) throw new Error(`Could not download ${item.brand} (${res.status})`);
      onPick(await asDataUrl(new File([await res.blob()], `${item.brand}.svg`, { type: 'image/svg+xml' })));
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(null); }
  };

  if (error) return <p className="muted">Figma logos: {error}{' '}
    {/token/i.test(error) && <button onClick={() => window.dispatchEvent(new Event('sac:figma-token'))}>Add Figma token</button>}</p>;
  if (!items) return <p className="muted">Loading the Figma logo library…</p>;
  const words = norm(query).split(/\s+/).filter(Boolean);
  const found = words.length ? items.filter(i => words.every(w => norm(`${i.brand} ${i.variant}`).includes(w))) : [];
  return <>
    <input type="search" placeholder="Search a brand" value={query} onChange={e => setQuery(e.target.value)} />
    {!words.length ? <p className="muted">Type a brand name to see its logos.</p>
      : !found.length ? <p className="muted">No logo for “{query}” in the Figma library.</p>
      : <>
        {found.length > SHOWN && <p className="muted">{found.length} matches; the first {SHOWN} shown, narrow the search for more.</p>}
        <ul className="lib">
          {found.slice(0, SHOWN).map(item => <li key={item.id} className={busy === item.id ? 'on' : ''}>
            <button title={`${item.brand}${item.variant ? ` · ${item.variant}` : ''}`} disabled={!!busy}
              onClick={() => void pick(item)}>
              {/* A white or knockout logo on a dark tile, so it can be seen. */}
              <img src={thumbUrl(item.id)} alt="" loading="lazy"
                style={{ background: item.light ? '#333' : undefined, objectFit: 'contain' }} />
              <span>{busy === item.id ? 'Downloading…' : `${item.brand}${item.variant ? ` · ${item.variant}` : ''}`}</span>
            </button>
          </li>)}
        </ul>
      </>}
  </>;
}
