/** "Review with AI": a floating button that has Claude look at the asset on
 *  screen (the studio's judge, server/rules.md) and shows what it found --
 *  a verdict and the issues, nothing to talk back to. One result per asset,
 *  kept while the window is open; asking again looks again. */
import { useState } from 'react';
import { review, propose } from '../ai/client';
import { saveSession } from '../session/store';
import type { Fixes, Verdict } from '../ai/types';
import type { Sheet, SheetAsset } from '../sheet/types';

const SAYS = { ship: 'Good to go', fix: 'Needs fixes', reject: 'Needs rework' } as const;

/** Where an issue is, in words: a layer's id ("marquee/1", "ticket/mark", the asset's own id aside) read as its name. */
const place = (where: string, assetId: string) => where.split(/,\s*/)
  .map(w => w.startsWith(`${assetId}/`) ? w.slice(assetId.length + 1) : w)
  .map(w => /^[a-z][\w-]*(\/[\w-]+)*$/i.test(w) && /[/-]/.test(w) || /^[a-z]+$/.test(w)
    ? (w.split('/')[0] === 'cta' ? 'Button' : w.split('/')[0].replace(/-/g, ' ').replace(/^./, c => c.toUpperCase())) : w)
  .filter((w, i, all) => all.indexOf(w) === i).join(', ');

type Result = { state: 'running' } | { state: 'done'; verdict: Verdict } | { state: 'failed'; error: string };
type Fixing = { state: 'running' } | { state: 'done'; fixes: Fixes } | { state: 'failed'; error: string };

export function AiCheck({ sheet, asset }: { sheet: Sheet; asset: SheetAsset }) {
  const [fixing, setFixing] = useState<Record<string, Fixing>>({});
  const f = fixing[asset.id];
  // What Claude would change to answer the review: suggestions to make by hand, never applied.
  const suggest = async (verdict: Verdict) => {
    setFixing(m => ({ ...m, [asset.id]: { state: 'running' } }));
    try {
      await saveSession({ ...sheet, updatedAt: new Date().toISOString() });
      const fixes = await propose(asset, sheet.id, verdict.issues.map(i => `${i.where}: ${i.what} — ${i.fix}`));
      setFixing(m => ({ ...m, [asset.id]: { state: 'done', fixes } }));
    } catch (e) {
      setFixing(m => ({ ...m, [asset.id]: { state: 'failed', error: e instanceof Error ? e.message : String(e) } }));
    }
  };
  const [results, setResults] = useState<Record<string, Result>>({});
  const [open, setOpen] = useState(false);
  const r = results[asset.id];
  const run = async () => {
    setOpen(true);
    setResults(m => ({ ...m, [asset.id]: { state: 'running' } }));
    // A new look: the old suggestions answered the old verdict.
    setFixing(m => { const next = { ...m }; delete next[asset.id]; return next; });
    try {
      // The judge renders the saved campaign, so it sees what's on screen.
      await saveSession({ ...sheet, updatedAt: new Date().toISOString() });
      const out = await review(asset, sheet.id, true);
      setResults(m => ({ ...m, [asset.id]: out.verdict ? { state: 'done', verdict: out.verdict }
        : { state: 'failed', error: 'No verdict came back.' } }));
    } catch (e) {
      setResults(m => ({ ...m, [asset.id]: { state: 'failed', error: e instanceof Error ? e.message : String(e) } }));
    }
  };

  return <div className="st-ai">
    {open && r && <section className="st-ai-card" aria-live="polite">
      <header>
        <b>Review with AI</b>
        <button className="st-link" onClick={() => setOpen(false)} aria-label="Close">×</button>
      </header>
      {r.state === 'running' && <p className="st-quiet">Looking at {asset.label}… about half a minute.</p>}
      {r.state === 'failed' && <p className="st-ai-err">{r.error}</p>}
      {r.state === 'done' && <>
        <p className={`st-ai-verdict is-${r.verdict.verdict}`}>{SAYS[r.verdict.verdict]}</p>
        {r.verdict.reads && <p className="st-ai-reads">{r.verdict.reads}</p>}
        {r.verdict.issues.length > 0 ? <ol className="st-ai-issues">
          {r.verdict.issues.map((i, n) => <li key={n} className={`is-${i.severity}`}>
            <b>{place(i.where, asset.id)}</b> {i.what}{i.fix && <span>{i.fix}</span>}
          </li>)}
        </ol> : <p className="st-quiet">No issues found.</p>}
        {f?.state === 'done' && <div className="st-ai-fixes">
          {f.fixes.ops.length > 0 ? <>
            <b>{f.fixes.ops.length} change{f.fixes.ops.length === 1 ? '' : 's'} to make</b>
            <ul>{f.fixes.ops.map((op, n) => <li key={n}><b>{place(op.id, asset.id)}</b> {op.why}</li>)}</ul>
          </> : <p className="st-quiet">Nothing it can change by moving, sizing or retyping.</p>}
          {f.fixes.cannotFix.length > 0 && <ul className="st-quiet">{f.fixes.cannotFix.map((c, n) => <li key={n}>{c.problem} — {c.needs}</li>)}</ul>}
        </div>}
        {f?.state === 'failed' && <p className="st-ai-err">{f.error}</p>}
        <div className="st-row">
          {r.verdict.issues.length > 0 && f?.state !== 'done' && <button className="st-link" disabled={f?.state === 'running'}
            onClick={() => suggest(r.verdict)}>{f?.state === 'running' ? 'Suggesting…' : 'Suggest fixes'}</button>}
          <button className="st-link" onClick={run}>Look again</button>
        </div>
      </>}
    </section>}
    <button className="st-ai-fab" onClick={() => r?.state === 'done' && !open ? setOpen(true) : run()}
      disabled={r?.state === 'running'}>
      {r?.state === 'running' ? 'Reviewing…' : r?.state === 'done' && !open ? `AI: ${SAYS[r.verdict.verdict]}` : 'Review with AI'}
    </button>
  </div>;
}
