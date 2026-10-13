/** Mason: hand one well-specified file to the local model, then gate it hard.
 *
 *  The division this enforces, learned the expensive way: the model is good at
 *  turning an exact table into valid code and bad at knowing whether the table
 *  is right. So a task carries its own numbers — mason never looks a
 *  measurement up — and nothing it writes survives a failing gate.
 *
 *  Bounded, not infinite: `attempts` tries, each one fed the previous gate's
 *  error, then it gives up and puts the original file back.
 *
 *    node scripts/mason.mjs tasks/<name>.json [--dry] [--keep]
 */
import { readFileSync, writeFileSync, existsSync, copyFileSync, unlinkSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { request } from 'node:http';

/** node's fetch gives up waiting for headers after 300s and a 30B thinking
 *  about a file takes longer than that. http has no such opinion. */
const post = (url, body) => new Promise((ok, no) => {
  const u = new URL(url);
  const data = JSON.stringify(body);
  const r = request({ hostname: u.hostname, port: u.port, path: u.pathname,
                      method: 'POST', timeout: 0,
                      headers: { 'content-type': 'application/json',
                                 'content-length': Buffer.byteLength(data) } },
    res => { let b = ''; res.on('data', c => b += c);
             res.on('end', () => { try { ok({ status: res.statusCode, json: JSON.parse(b) }); }
                                   catch { ok({ status: res.statusCode, json: { raw: b } }); } }); });
  r.on('error', no);
  r.setTimeout(0);
  r.end(data);
});

const OLLAMA = process.env.OLLAMA_HOST ?? 'http://127.0.0.1:11434';

const file = process.argv[2];
const dry = process.argv.includes('--dry');
const keepOnFail = process.argv.includes('--keep');
if (!file) { console.error('usage: node scripts/mason.mjs tasks/<name>.json'); process.exit(1); }

const task = JSON.parse(readFileSync(file, 'utf8'));
const {
  id, write: target, prompt, model = 'qwen3-coder:latest', attempts = 3,
  prefill = '', stop = [], context = [], gates = [], numCtx = 64000, temperature = 0.2,
} = task;

/** Files inlined into the prompt. A `path#upto:MARK` slice keeps the prompt
 *  small — schema.ts is twice as long as the half that matters. */
function inline(ref) {
  const [path, slice] = ref.split('#');
  let body = readFileSync(path, 'utf8');
  if (slice?.startsWith('upto:')) {
    const mark = slice.slice(5);
    const at = body.indexOf(mark);
    if (at > 0) body = body.slice(0, at);
  }
  return `\n### ${path}\n\n\`\`\`ts\n${body.trim()}\n\`\`\`\n`;
}

async function ask(extra) {
  const full = context.map(inline).join('') + '\n' + prompt + (extra ? `\n\n${extra}` : '');
  const messages = [{ role: 'user', content: full }];
  if (prefill) messages.push({ role: 'assistant', content: prefill });
  const started = Date.now();
  const { status, json: d } = await post(`${OLLAMA}/api/chat`, {
    model, messages, stream: false, think: false,
    options: { num_ctx: numCtx, temperature, stop },
  });
  if (status !== 200) throw new Error(`ollama ${status}: ${JSON.stringify(d).slice(0, 300)}`);
  const secs = ((Date.now() - started) / 1000).toFixed(0);
  const out = d.message?.content ?? '';
  console.log(`    ${d.eval_count ?? '?'} tok in ${secs}s`
    + ` (${Math.round((d.eval_count ?? 0) / Math.max((d.eval_duration ?? 1) / 1e9, 0.001))} tok/s)`);
  return { text: prefill + out, promptTokens: d.prompt_eval_count };
}

/** The model reasons in the open even with think:false, so take the FILE out
 *  of whatever it said. Prefill usually makes this a no-op; it is here for
 *  the run where it does not. */
function extract(text) {
  let body = text;
  const start = body.search(/^(\/\*\*|import )/m);
  if (start > 0) body = body.slice(start);
  body = body.replace(/^```[a-z]*\n?/gm, '').replace(/\n?```$/gm, '');
  for (const s of stop) {
    const at = body.lastIndexOf(s);
    if (at >= 0) { body = body.slice(0, at + s.length) + '\n'; break; }
  }
  return body.trimStart();
}

const GATES = {
  tsc: () => execSync('npx tsc --noEmit -p tsconfig.json', { stdio: 'pipe' }),
  templates: () => execSync('npx vite-node scripts/check-templates.ts', { stdio: 'pipe' }),
  build: () => execSync('npm run build', { stdio: 'pipe' }),
};

async function runGate(g) {
  if (g.startsWith('render:')) {
    const [, session, assetId, w, h] = g.split(':');
    const url = `http://localhost:5178/?shot=${encodeURIComponent(assetId)}&s=${session}`;
    const { status, json: d } = await post('http://localhost:5179/ai/judge',
      { url, width: +w, height: +h, session, name: `mason-${id}`, look: false });
    if (status !== 200 || d.error) throw new Error(`render failed: ${d.error ?? status}`);
    return;
  }
  if (g === 'export') {
    const session = task.session;
    const { status, json: d } = await post('http://localhost:5179/api/export',
      { session, origin: 'http://localhost:5178' });
    if (status !== 200 || d.failed?.length) throw new Error(`export: ${JSON.stringify(d.failed ?? d)}`);
    return;
  }
  const fn = GATES[g];
  if (!fn) throw new Error(`unknown gate "${g}"`);
  fn();
}

const backup = `${target}.mason-backup`;
if (existsSync(target)) copyFileSync(target, backup);
const restore = () => { if (existsSync(backup)) { copyFileSync(backup, target); unlinkSync(backup); } };

console.log(`mason: ${id}`);
console.log(`  model ${model} · num_ctx ${numCtx} · writes ${target}`);

let lastError = '';
for (let attempt = 1; attempt <= attempts; attempt++) {
  console.log(`  attempt ${attempt}/${attempts}`);
  const { text, promptTokens } = await ask(lastError && `Your last attempt FAILED this gate:

${lastError}

Fix exactly that and output the whole file again. Change nothing else.`);
  if (attempt === 1) console.log(`    prompt ${promptTokens} tok`);
  const body = extract(text);
  if (body.length < 100) { lastError = 'you produced almost nothing'; continue; }

  if (dry) { console.log(`\n--- would write ${body.length} chars to ${target} ---\n`);
             console.log(body.slice(0, 1200)); restore(); process.exit(0); }

  writeFileSync(target, body);
  let failed = null;
  for (const g of gates) {
    try { await runGate(g); console.log(`    gate ${g} ✓`); }
    catch (e) {
      const msg = (e.stdout?.toString() || '') + (e.stderr?.toString() || '') || e.message;
      failed = `gate ${g}:\n${msg.trim().slice(0, 1800)}`;
      console.log(`    gate ${g} ✗`);
      break;
    }
  }
  if (!failed) {
    if (existsSync(backup)) unlinkSync(backup);
    console.log(`\nmason: ${id} PASSED all ${gates.length} gate(s) — ${target} written`);
    process.exit(0);
  }
  lastError = failed;
  console.log(`    ${failed.split('\n')[1] ?? ''}`.slice(0, 160));
}

if (keepOnFail) { if (existsSync(backup)) unlinkSync(backup);
  console.error(`\nmason: ${id} FAILED after ${attempts} — output KEPT for inspection`); }
else { restore(); console.error(`\nmason: ${id} FAILED after ${attempts} — ${target} restored`); }
console.error(lastError);
process.exit(1);
