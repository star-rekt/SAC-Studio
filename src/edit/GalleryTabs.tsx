/** A gallery in two tabs: the library's own pictures (Local), and Figma's --
 *  open once a Figma token is saved, else a button to add one. Photos and
 *  brand logos both choose this way; the tab last used is remembered. */
import { useEffect, useState, type ReactNode } from 'react';

/** Whether a Figma token is saved (the server says; it never sends the token). */
export function useFigmaToken() {
  const [saved, setSaved] = useState<boolean | null>(null);
  useEffect(() => {
    const ask = () => fetch('/api/figma-token').then(r => r.json()).then(s => setSaved(!!s.saved), () => setSaved(false));
    void ask();
    window.addEventListener('sac:figma-token-saved', ask);
    return () => window.removeEventListener('sac:figma-token-saved', ask);
  }, []);
  return saved;
}

const KEY = 'sac.gallery.tab';

export function GalleryTabs({ title, local, figma }: { title: string; local: ReactNode; figma: ReactNode }) {
  const saved = useFigmaToken();
  const [tab, setTab] = useState<'local' | 'figma'>(() => {
    try { return localStorage.getItem(KEY) === 'figma' ? 'figma' : 'local'; } catch { return 'local'; }
  });
  const choose = (t: 'local' | 'figma') => { setTab(t); try { localStorage.setItem(KEY, t); } catch { /* fine */ } };
  return <section className="gallery">
    <h4>{title}</h4>
    <div className="gallery-tabs" role="tablist">
      <button role="tab" aria-selected={tab === 'local'} className={tab === 'local' ? 'on' : ''} onClick={() => choose('local')}>Local</button>
      <button role="tab" aria-selected={tab === 'figma'} className={tab === 'figma' ? 'on' : ''} onClick={() => choose('figma')}>Figma</button>
    </div>
    {tab === 'local' ? local
      : saved ? figma
      : saved === false ? <p className="muted">Connect Figma to search its library.{' '}
          <button onClick={() => window.dispatchEvent(new Event('sac:figma-token'))}>Add Figma token</button></p>
      : null}
  </section>;
}
