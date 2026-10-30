/** The optional Figma token's dialog. */
import { useEffect, useState } from 'react';

/** Remembers a designer's Skip, so the studio stops asking at every start. */
export const TOKEN_SKIPPED = 'sac.figmaToken.skipped';

/** The optional Figma token: the studio asks once at start (when none is
 *  saved and nobody has skipped it), and again from the Figma gallery. The
 *  server saves it to the app's own .env and checks it with Figma; the
 *  token never comes back here, only whether one is saved. Without one the
 *  studio runs on the default library and local uploads. */
export function FigmaTokenDialog({ onClose }: { onClose: () => void }) {
  const [value, setValue] = useState('');
  const [saved, setSaved] = useState<{ saved: boolean; tail: string } | null>(null);
  const [state, setState] = useState<{ text: string; ok?: boolean | null } | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    void fetch('/api/figma-token').then(r => r.json()).then(setSaved, () => setSaved(null));
  }, []);
  const save = async () => {
    setBusy(true); setState({ text: 'Checking with Figma…' });
    try {
      const r = await fetch('/api/figma-token', { method: 'PUT', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token: value }) }).then(res => res.json());
      setState({ text: r.message, ok: r.valid });
      if (r.saved) {
        setValue(''); setSaved({ saved: true, tail: value.trim().slice(-4) });
        window.dispatchEvent(new Event('sac:figma-token-saved'));
      }
    } catch { setState({ text: 'The studio\u2019s server didn\u2019t answer. Try again.', ok: false }); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    await fetch('/api/figma-token', { method: 'DELETE' }).catch(() => {});
    setSaved({ saved: false, tail: '' }); setState({ text: 'Token removed. The Figma gallery is off.' });
  };
  const skip = () => { try { localStorage.setItem(TOKEN_SKIPPED, '1'); } catch { /* private window */ } onClose(); };
  return (
    <Modal title="Figma token (optional)" onClose={onClose}>
      <p>With a Figma token, the studio can browse the SAC image gallery in Figma. Without one, everything else
        works: the default library and your own uploads.</p>
      <p className="muted">Create one in Figma: Settings → Security → Personal access tokens (read-only file
        access is enough). It's saved only on this computer.</p>
      {saved?.saved && <p className="muted">A token is saved (ending …{saved.tail}). Paste a new one to replace it.</p>}
      <label className="field">
        <span>Token</span>
        <input type="password" value={value} placeholder="figd_…" autoComplete="off" spellCheck={false}
          onChange={e => setValue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && value.trim()) void save(); }} />
      </label>
      {state && <p className="muted" style={state.ok === false ? { color: '#b3261e' } : undefined}>{state.text}</p>}
      <div className="row">
        {saved?.saved ? <button onClick={remove}>Remove token</button> : <button onClick={skip}>Skip</button>}
        <button onClick={onClose}>{state?.ok ? 'Done' : 'Close'}</button>
        <button className="go" disabled={!value.trim() || busy} onClick={save}>Save token</button>
      </div>
    </Modal>
  );
}

function Modal({ title, children, onClose }: {
  title: string; children: React.ReactNode; onClose: () => void;
}) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);

  return (
    <div className="scrim" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <h3>{title}<button onClick={onClose} aria-label="Close">&times;</button></h3>
        {children}
      </div>
    </div>
  );
}
