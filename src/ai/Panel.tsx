/** The connector, as a designer sees it.
 *
 *  Two buttons and no settings. Reading the brief puts Claude's reading
 *  beside the parser's so the disagreements are visible; judging an asset
 *  photographs it and shows the verdict next to the photograph, so there is
 *  no taking the model's word for what it saw.
 */
import { useEffect, useState } from 'react';
import { health, readBriefWithAi, review, propose, pool } from './client';
import { reconcile, type Report, type Check } from './reconcile';
import type { AiParse, Health, Verdict, Fixes, Op } from './types';
import { describe } from './apply';
import type { SheetAsset } from '../sheet/types';

const MARK: Record<Check['state'], string> = {
  agree: '=', differ: '≠', 'only-code': '–', 'only-claude': '+',
};

export function BriefPanel({ text }: { text: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [report, setReport] = useState<Report | null>(null);
  const [parse, setParse] = useState<AiParse | null>(null);
  const [ms, setMs] = useState(0);

  const run = async () => {
    setBusy(true); setErr(''); setReport(null);
    try {
      const r = await readBriefWithAi(text);
      setParse(r.parse); setMs(r.ms); setReport(reconcile(r.parse, text));
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    setBusy(false);
  };

  return (
    <>
      <button onClick={run} disabled={busy}>
        {busy ? 'Claude is reading the brief…' : 'Read this brief with Claude'}
      </button>
      {busy && <p className="muted">About half a minute. No key needed — it uses your Claude Code login.</p>}
      {err && <p className="aierr">{err}</p>}

      {report && (
        <>
          <h4>Sends</h4>
          <ul>
            <li>brief declares <b>{report.sends.declared}</b></li>
            <li>parser found <b>{report.sends.code}</b>
                {report.sends.missing.length > 0 && <> — missing {report.sends.missing.join(', ')}</>}</li>
            <li>Claude found <b>{report.sends.claude}</b></li>
          </ul>

          <h4>{report.agree} agree · {report.differ} to look at</h4>
          <table className="recon">
            <tbody>
              {report.checks.map(c => (
                <tr key={c.field} className={c.state}>
                  <th title={c.note}>{c.field}</th>
                  <td>{c.code}</td>
                  <td className="m">{MARK[c.state]}</td>
                  <td>{c.claude}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="muted">Left is the parser, right is Claude. Rows marked ≠ are where they
            read the brief differently — neither is overruled automatically.</p>

          {parse && (
            <>
              <h4>What Claude read into each send</h4>
              <ul className="because">
                {parse.sends.map(s => (
                  <li key={s.id}>
                    <b>{s.id} {s.angle}</b>
                    {s.leadOn && <> — lead on {s.leadOn}{s.uptoPercent && ` at up to ${s.uptoPercent}%`}</>}
                    {s.showStack && <> · stacked lockup</>}
                    <i>{s.because}</i>
                  </li>
                ))}
              </ul>
            </>
          )}
          <p className="muted">{(ms / 1000).toFixed(1)}s</p>
        </>
      )}
    </>
  );
}

type Row = {
  asset: SheetAsset;
  state: 'queued' | 'running' | 'done' | 'failed';
  verdict?: Verdict; png?: string; error?: string; ms?: number; deep?: boolean;
  fixes?: Fixes; fixing?: boolean; fixErr?: string; applied?: number;
};

const RANK = { reject: 0, fix: 1, ship: 2 } as const;

/** Short names for the numbered rules in server/rules.md, so the checklist
 *  reads as words rather than numbers. A rule added to that file and not here
 *  still shows, as 'rule 9'. */
const RULES: Record<number, string> = {
  1: 'Nothing collides', 2: 'Rule of thirds', 3: 'Copy relates to the subject',
  4: 'Nothing important is cropped', 5: 'Contrast', 6: 'Type and graphic size',
  7: 'The photograph is framed', 8: 'Protected copy',
};

/** Measured on this corpus, not guessed: 41 assets export in about four
 *  minutes and a pair reviews in thirty-five seconds, three at a time. Tall
 *  assets dominate the export time -- an email body runs to 4,800px. */
const mins = (n: number, each: number) => {
  const s = Math.ceil(n / 4) * each;
  return s < 90 ? `${Math.round(s)}s` : `${Math.round(s / 60)} min`;
};

/** Exporting and reviewing, over one asset or the whole campaign.
 *
 *  The scope matters more than it looks. One asset answers 'is this right';
 *  a whole tab answers 'do these seven read as one campaign', which is the
 *  question a reviewer actually asks and the one nothing in the studio could
 *  answer before.
 */
export function JudgePanel({ current, tab, all, session, pickCurrent, apply }: {
  current?: SheetAsset; tab: SheetAsset[]; all: SheetAsset[]; session: string;
  pickCurrent: (id: string) => void;
  apply: (ops: Op[]) => void;
}) {
  const [scope, setScope] = useState<'one' | 'tab' | 'all'>('one');
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  const targets = scope === 'one' ? (current ? [current] : []) : scope === 'tab' ? tab : all;

  // A new campaign's verdicts are not this campaign's verdicts.
  useEffect(() => { setRows([]); setOpen(null); setErr(''); }, [session]);

  const run = async (look: boolean) => {
    if (!targets.length) return;
    setBusy(true); setErr(''); setOpen(null);
    setRows(targets.map(asset => ({ asset, state: 'queued' as const })));

    await pool(targets, 4, async asset => {
      put(asset.id, { state: 'running' });
      try {
        const out = await review(asset, session, look);
        put(asset.id, { state: 'done', verdict: out.verdict, png: out.png, ms: out.ms });
      } catch (e) {
        put(asset.id, { state: 'failed', error: e instanceof Error ? e.message : String(e) });
      }
    }).catch(e => setErr(e instanceof Error ? e.message : String(e)));

    setBusy(false);
  };

  const put = (id: string, patch: Partial<Row>) =>
    setRows(rs => rs.map(r => r.asset.id === id ? { ...r, ...patch } : r));

  /** The slow, thorough read of one asset. The quick pass answers which rules
   *  broke; this says why, in sentences, and costs about five times as long --
   *  which is worth it for the one asset being argued about and not for all
   *  forty-one. */
  const lookCloser = async (r: Row) => {
    put(r.asset.id, { state: 'running' });
    try {
      const out = await review(r.asset, session, true, true);
      put(r.asset.id, { state: 'done', verdict: out.verdict, png: out.png,
                        ms: out.ms, deep: true, fixes: undefined });
    } catch (e) {
      put(r.asset.id, { state: 'failed', error: e instanceof Error ? e.message : String(e) });
    }
  };

  /** Asking what would answer the review. Nothing is applied here -- the
   *  proposal is shown first, because a model moving things on a designer's
   *  artwork without asking is not a feature anyone wants. */
  const askFix = async (r: Row) => {
    if (!r.verdict?.issues.length) return;
    put(r.asset.id, { fixing: true, fixErr: '', fixes: undefined });
    try {
      const f = await propose(r.asset, session,
        r.verdict.issues.map(i => `${i.where}: ${i.what} — ${i.fix}`));
      put(r.asset.id, { fixing: false, fixes: f });
    } catch (e) {
      put(r.asset.id, { fixing: false, fixErr: e instanceof Error ? e.message : String(e) });
    }
  };

  const done = rows.filter(r => r.state === 'done');
  const judged = done.filter(r => r.verdict);
  const worst = [...judged].sort((a, b) =>
    RANK[a.verdict!.verdict] - RANK[b.verdict!.verdict]);

  return (
    <>
      <select value={scope} onChange={e => setScope(e.target.value as typeof scope)}
              disabled={busy}>
        <option value="one">This asset{current ? ` — ${current.label}` : ''}</option>
        <option value="tab">This tab — {tab.length} asset{tab.length === 1 ? '' : 's'}</option>
        <option value="all">Whole campaign — {all.length} assets</option>
      </select>

      {scope === 'one' && tab.length > 1 && (
        <select value={current?.id ?? ''} onChange={e => pickCurrent(e.target.value)}>
          {tab.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
        </select>
      )}

      <div className="doit">
        <button onClick={() => run(true)} disabled={busy || !targets.length}>
          {busy ? `${done.length} of ${rows.length}…` : 'Export & review'}
        </button>
        <button onClick={() => run(false)} disabled={busy || !targets.length}
                title="Write the PNGs without spending a model call on each">
          Export only
        </button>
      </div>

      {!busy && scope !== 'one' && targets.length > 0 && (
        <p className="muted">Roughly {mins(targets.length, 36)} to review
          {' '}{targets.length}, or {mins(targets.length, 8)} to just export them.</p>
      )}
      {err && <p className="aierr">{err}</p>}

      {rows.length > 0 && (
        <>
          {judged.length > 1 && (
            <h4>{judged.filter(r => r.verdict!.verdict === 'ship').length} ship ·{' '}
                {judged.filter(r => r.verdict!.verdict === 'fix').length} fix ·{' '}
                {judged.filter(r => r.verdict!.verdict === 'reject').length} reject</h4>
          )}
          <ul className="rows">
            {(!busy && judged.length > 1 ? worst : rows).map(r => (
              <li key={r.asset.id} className={r.state}>
                <button onClick={() => setOpen(o => o === r.asset.id ? null : r.asset.id)}>
                  {r.png
                    ? <img src={r.png} alt="" />
                    : <span className="ph" />}
                  <b>{r.asset.label}</b>
                  <span>{r.asset.format}</span>
                  {r.state === 'running' && <i>looking…</i>}
                  {r.state === 'queued' && <i>queued</i>}
                  {r.state === 'failed' && <i className="bad">{r.error}</i>}
                  {r.verdict && <em className={'verdict ' + r.verdict.verdict}>{r.verdict.verdict}</em>}
                  {r.verdict && r.verdict.issues.length > 0 &&
                    <i>{r.verdict.issues.length} issue{r.verdict.issues.length === 1 ? '' : 's'}</i>}
                  {r.state === 'done' && !r.verdict && <i>exported</i>}
                </button>

                {open === r.asset.id && r.verdict && (
                  <div className="detail">
                    {r.verdict.reads && <p className="reads">{r.verdict.reads}</p>}
                    <ul>
                      {r.verdict.subject && <li>subject — {r.verdict.subject}</li>}
                      {r.verdict.hierarchy && <li>reading order — {r.verdict.hierarchy}</li>}
                    </ul>
                    {r.verdict.rules && r.verdict.rules.length > 0 && (
                      <>
                        <h4>{r.verdict.rules.filter(x => x.pass).length} of{' '}
                            {r.verdict.rules.length} rules pass</h4>
                        <ul className="checks">
                          {r.verdict.rules.map(x => (
                            <li key={x.n} className={x.pass ? 'pass' : 'fail'}>
                              <b>{x.pass ? '✓' : '✕'} {RULES[x.n] ?? `rule ${x.n}`}</b>
                              {x.note && <i>{x.note}</i>}
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                    <ul className="issues">
                      {r.verdict.issues.map((i, n) => (
                        <li key={n} className={i.severity}>
                          <b>{i.rule ? `${RULES[i.rule] ?? `rule ${i.rule}`} — ` : ''}{i.where}</b> {i.what}
                          <i>{i.fix}</i>
                        </li>
                      ))}
                    </ul>
                    {!r.deep && (
                      <button className="fixit" onClick={() => lookCloser(r)}
                              title="A written review of this one asset. Slower — about 3 minutes — but it reasons it out instead of listing what broke.">
                        Look closer at this one (about 3 min)
                      </button>
                    )}
                    {r.verdict.issues.length > 0 && (
                      <button className="fixit" onClick={() => askFix(r)} disabled={r.fixing}>
                        {r.fixing ? 'Working out what would help… (about 2 min)'
                         : r.fixes ? 'Ask again' : 'What can Claude fix here?'}
                      </button>
                    )}
                    {r.fixErr && <p className="aierr">{r.fixErr}</p>}
                    {r.fixes && <Proposal r={r} apply={apply} put={put} />}
                    {r.png && <a href={r.png} target="_blank" rel="noreferrer">open the PNG</a>}
                    {r.ms && <p className="muted">{(r.ms / 1000).toFixed(1)}s</p>}
                  </div>
                )}
              </li>
            ))}
          </ul>
          <p className="muted">PNGs are written to <code>data/exports/{session}/</code>.</p>
        </>
      )}
    </>
  );
}

/** The proposal, before any of it happens.
 *
 *  Two lists and they matter equally. What it will do, and what a move, a
 *  resize or a retype cannot answer -- which on a typical hero is most of it,
 *  because 'add a scrim behind the logo row' is a change to the template and
 *  not an edit. Hiding that half would make the fix look better than it is.
 */
function Proposal({ r, apply, put }: {
  r: Row; apply: (ops: Op[]) => void; put: (id: string, patch: Partial<Row>) => void;
}) {
  const f = r.fixes!;
  return (
    <>
      {f.ops.length > 0 ? (
        <>
          <h4>{f.ops.length} change{f.ops.length === 1 ? '' : 's'} it can make</h4>
          <ul className="ops">
            {f.ops.map(op => (
              <li key={op.id}>
                <b>{op.id.split('/').pop()}</b> {describe(op)}
                <i>{op.why}</i>
              </li>
            ))}
          </ul>
          {r.applied ? (
            <p className="muted">Applied {r.applied}. Use <b>Reset this</b> on an element in
              the Design tab to take one back, then review again to see if it helped.</p>
          ) : (
            <button className="fixit go" onClick={() => {
              apply(f.ops);
              put(r.asset.id, { applied: f.ops.length });
            }}>Apply {f.ops.length === 1 ? 'it' : `all ${f.ops.length}`}</button>
          )}
        </>
      ) : (
        <p className="muted">Nothing here can be fixed by moving, resizing or retyping.</p>
      )}

      {f.cannotFix.length > 0 && (
        <>
          <h4>{f.cannotFix.length} need{f.cannotFix.length === 1 ? 's' : ''} a design change</h4>
          <ul className="ops cant">
            {f.cannotFix.map((c, n) => (
              <li key={n}><b>{c.problem}</b><i>needs {c.needs}</i></li>
            ))}
          </ul>
        </>
      )}
      {f.dropped > 0 && (
        <p className="muted">{f.dropped} suggestion{f.dropped === 1 ? '' : 's'} named an element
          that is not on this asset, and {f.dropped === 1 ? 'was' : 'were'} dropped.</p>
      )}
    </>
  );
}

/** Says plainly when the connector is not there, rather than letting the
 *  buttons fail one at a time. */
export function AiHealth() {
  const [h, setH] = useState<Health | null>(null);
  useEffect(() => { health().then(setH); }, []);
  if (!h) return null;
  if (h.claude && h.chrome) return (
    <p className="muted">Claude {h.claude.split(' ')[0]} · Chrome found
      {h.rules ? <> · judging against <a href="/ai/rules" target="_blank" rel="noreferrer">{h.rules} rules</a></> : null}</p>
  );
  return (
    <p className="aierr">
      {!h.claude && <>No connector. Run <code>npm run ai</code> in this folder.<br /></>}
      {h.claude && !h.chrome && <>Claude is here but there is no Chrome to render with, so judging is off.</>}
    </p>
  );
}
