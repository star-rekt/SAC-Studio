/** Running Claude headlessly, with no API key and no tools it does not need.
 *
 *  `claude -p` uses the Claude Code login the user already has, so the studio
 *  asks for no key and stores none. Tools are granted per call and the grant
 *  is the whole security story: the brief reader gets `--allowed-tools ""`
 *  and so cannot touch this machine at all, the judge gets `Read` and so can
 *  open the one PNG it is pointed at and nothing else.
 *
 *  The prompt goes in on stdin rather than argv: briefs run to several
 *  thousand words and argv has a limit that a long one would find.
 */
import { spawn } from 'node:child_process';

export type Run =
  | { ok: true; text: string; ms: number }
  | { ok: false; error: string; ms: number };

/** `turns` is not a detail. Claude Code answers 'Error: Reached max turns (N)'
 *  and exits non-zero when it runs out, and it needs more of them for a bigger
 *  question: judging against eight written rules took more than the three that
 *  were plenty for 'does this read'. Too few looks exactly like a crash. */
export function ask(prompt: string, tools: string, turns = 8,
                    timeoutMs = 300_000, model?: string): Promise<Run> {
  const started = Date.now();
  return new Promise(resolve => {
    const p = spawn('claude', ['-p', '--max-turns', String(tools ? turns : 1),
                               '--allowed-tools', tools,
                               ...(model ? ['--model', model] : [])],
      { stdio: ['pipe', 'pipe', 'pipe'] });

    let out = '', err = '', killed = false;
    // Whether we killed it has to be remembered: a signalled process reports
    // its exit code as null, so without this a timeout is indistinguishable
    // from a crash and the message blames the wrong thing.
    const timer = setTimeout(() => { killed = true; p.kill('SIGKILL'); }, timeoutMs);
    const done = (r: Run) => { clearTimeout(timer); resolve(r); };

    p.stdout.on('data', d => { out += d; });
    p.stderr.on('data', d => { err += d; });
    p.on('error', e => done({ ok: false, error: `claude did not start: ${e.message}`, ms: Date.now() - started }));
    p.on('close', code => done(code === 0 && out.trim()
      ? { ok: true, text: out, ms: Date.now() - started }
      // Claude Code puts its own failures on STDOUT, not stderr -- 'Error:
      // Reached max turns (3)' arrives there and exit code 1 arrives here. Not
      // reading it is how a one-word diagnosis became 'exited 1 without saying
      // why' and cost an hour.
      : { ok: false, error:
            killed ? `Claude took longer than ${Math.round(timeoutMs / 1000)}s and was stopped`
          : out.trim() || err.trim()
            || `claude exited ${code} without saying why — usually transient, try again`,
          ms: Date.now() - started }));

    p.stdin.end(prompt);
  });
}

/** The first JSON object in the reply.
 *
 *  Asking for "ONLY JSON" gets JSON almost every time and a fenced block or a
 *  sentence of preamble the rest of the time. Both are recoverable, so they
 *  are recovered rather than reported as a failure the designer has to retry. */
export function firstJson<T>(text: string): T | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf('{');
  if (start < 0) return null;
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < body.length; i++) {
    const c = body[i];
    if (esc) { esc = false; continue; }
    if (inStr) { if (c === '\\') esc = true; else if (c === '"') inStr = false; continue; }
    if (c === '"') inStr = true;
    else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) {
      try { return JSON.parse(body.slice(start, i + 1)) as T; } catch { return null; }
    }
  }
  return null;
}
