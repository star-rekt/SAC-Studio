/** Opening a campaign and starting one.
 *
 *  Starting one is a brief and a template and nothing else, because that is
 *  genuinely all a campaign is here: the brief decides the content and the
 *  count, the template decides the look, and everything in between is derived.
 */
import { useEffect, useRef, useState } from 'react';
import { listSessions, deleteSession, type Card } from './store';
import { readBriefWithAi } from '../ai/client';
import type { AiParse } from '../ai/types';
import { SPECS } from '../templates/spec';
import { templateById } from '../templates/registry';
import { specById } from '../templates/spec';

const when = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(+d) ? '' : d.toLocaleString(undefined,
    { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export function OpenDialog({ current, onPick, onClose }: {
  current: string; onPick: (id: string) => void; onClose: () => void;
}) {
  const [cards, setCards] = useState<Card[] | null>(null);
  const [err, setErr] = useState('');
  const refresh = () => listSessions().then(c => { setCards(c); setErr(''); },
    e => setErr(e instanceof Error ? e.message : String(e)));
  useEffect(() => { refresh(); }, []);

  return (
    <Modal title="Campaigns" onClose={onClose}>
      {err ? <p className="aierr">Could not reach the connector — {err}. Your campaigns are
               still on disk; start it with <code>npm run ai</code>.</p>
       : !cards ? <p className="muted">Looking…</p>
       : cards.length === 0 ? <p className="muted">Nothing saved yet.</p>
       : (
        <ul className="cards">
          {cards.map(c => (
            <li key={c.id} className={c.id === current ? 'on' : ''}>
              <button onClick={() => { onPick(c.id); onClose(); }}>
                <b>{c.name}</b>
                <span>{specById(c.templateId)?.name ?? c.templateId} · {c.assets} assets
                  {c.edits > 0 && <> · {c.edits} edit{c.edits === 1 ? '' : 's'}</>}</span>
                <i>{when(c.updatedAt)}</i>
              </button>
              {c.id !== current && (
                <button className="x" title="Delete this campaign"
                        onClick={() => deleteSession(c.id).then(refresh)}>&times;</button>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="muted">Saved as files in <code>Documents/SAC_Studio/Sessions/</code>. The one you
        have open cannot be deleted from here.</p>
    </Modal>
  );
}

export function NewDialog({ onCreate, onClose }: {
  onCreate: (brief: string, html: string, templateId: string, name: string,
             ai?: AiParse) => void;
  onClose: () => void;
}) {
  const [reading, setReading] = useState(false);
  const [note, setNote] = useState('');
  const [brief, setBrief] = useState('');
  const [rich, setRich] = useState(false);
  const field = useRef<HTMLDivElement>(null);
  const [templateId, setTemplateId] = useState(SPECS[0].id);
  const [name, setName] = useState('');

  // The field keeps what was pasted into it, markup and all.
  //
  //   brief.ts reads a brief's own bold labels in preference to any pattern
  //   -- 'Sale Name', 'Dates', every section heading -- because that is
  //   structure the author gave rather than structure we guessed. A textarea
  //   throws all of it away on paste, which is what this used to be, and the
  //   parser was left inferring from a wall of plain lines.
  const read = () => {
    const el = field.current;
    if (!el) return;
    setBrief(el.innerText || '');
    setRich(/<(b|strong)\b/i.test(el.innerHTML || ''));
  };

  return (
    <Modal title="New campaign" onClose={onClose}>
      <label className="field">
        <span>Name <i>optional — the brief's own name is used otherwise</i></span>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Bundle &amp; Save" />
      </label>
      <label className="field">
        <span>Template <i>decides the look, not the content</i></span>
        <select value={templateId} onChange={e => setTemplateId(e.target.value)}>
          {SPECS.map(t => (
            <option key={t.id} value={t.id}>
              {t.name} — {templateById(t.id)?.formats.length ?? 0} formats
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Brief <i>paste it as it was written — headings, bullets and all</i></span>
        <div ref={field} className="paste" contentEditable suppressContentEditableWarning
             onInput={read} onBlur={read}
             data-empty="Paste the Wrike brief here. Keep its formatting — the bold labels are read." />
      </label>
      {brief.trim().length >= 40 && (
        <p className="muted">{rich
          ? 'Bold labels came through, so the brief\u2019s own headings are used rather than guessed at.'
          : 'No bold labels came through. This still works, but the brief is read by pattern rather than by its own headings \u2014 paste from Wrike rather than from a plain-text editor if you can.'}</p>
      )}
      <div className="row">
        <button onClick={onClose}>Cancel</button>
        <button className="go" disabled={brief.trim().length < 40 || reading}
                onClick={async () => {
                  // Claude reads it first. The pattern parser is exact on what
                  // it recognises and blank on what it does not, and a brief
                  // phrased a way it has not seen comes back empty rather than
                  // wrong -- which is how a campaign ends up with eighteen
                  // assets instead of forty and nothing to say why.
                  setReading(true); setNote('Claude is reading the brief…');
                  let ai: AiParse | undefined;
                  try { ai = (await readBriefWithAi(brief)).parse; }
                  catch (e) {
                    setNote('Claude could not read it — '
                      + (e instanceof Error ? e.message : String(e))
                      + '. Building from the pattern parser alone.');
                    await new Promise(r => setTimeout(r, 2200));
                  }
                  setReading(false);
                  onCreate(brief, field.current?.innerHTML ?? '', templateId, name.trim(), ai);
                  onClose();
                }}>
          {reading ? 'Reading…' : 'Build the campaign'}
        </button>
      </div>
      {note && <p className="muted">{note}</p>}
      {brief.trim().length > 0 && brief.trim().length < 40 &&
        <p className="muted">That is too short to read as a brief.</p>}
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
