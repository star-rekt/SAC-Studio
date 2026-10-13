/** A PNG of one asset, rendered by the same engine the designer is looking at.
 *
 *  The judge has to see the deliverable, not an approximation of it: the
 *  ticket's punched hole is a radial-gradient mask and the grain is a
 *  multiply blend, both of which a canvas-rasteriser gets wrong quietly. So
 *  the screenshot comes from Chrome pointed at the studio's own `?shot=`
 *  view -- same CSS, same fonts, same masks, no second renderer to drift.
 *
 *  Chrome is driven over DevTools rather than with `--screenshot`, for two
 *  reasons. `--screenshot` never returns against a Vite dev server, because
 *  the HMR socket stays open and Chrome waits for the network to go quiet
 *  that never does. And the shutter has to wait for the webfonts and the
 *  photographs specifically -- a judge shown a half-loaded page reports
 *  contrast problems nobody has.
 *
 *  It drives the installed browser, so the studio's dependencies stay at
 *  react and vite.
 */
import { spawn } from 'node:child_process';
import { mkdirSync, existsSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { DATA } from './paths.ts';

const CANDIDATES = [
  process.env.SAC_CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  ...[process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)'], process.env.LOCALAPPDATA]
    .filter((dir): dir is string => !!dir)
    .flatMap(dir => [join(dir, 'Google', 'Chrome', 'Application', 'chrome.exe'),
                     join(dir, 'Microsoft', 'Edge', 'Application', 'msedge.exe')]),
].filter((path): path is string => !!path);

export const chrome = () => CANDIDATES.find(existsSync) ?? null;

/** PNGs land in the campaign's own folder rather than a scratch directory.
 *  They are the export -- the thing the judge looks at is the thing you can
 *  open in Finder, attach to a ticket or hand to the Figma plugin, and there
 *  is no second rendering path to keep honest. */
export const EXPORTS = join(DATA, 'exports');

/** What can be changed on this asset, read off the render rather than guessed.
 *
 *  A verdict can point at pixels; a fix has to name a thing. These come from
 *  the same paint the photograph does, so an id and a box here describe
 *  exactly what is in the PNG. */
export type Part = {
  id: string;
  kind: 'text' | 'block' | 'picture';
  text?: string;
  size?: number;              // the run's rendered font size, px
  box: [number, number, number, number];   // x, y, w, h within the asset
  /** The nearest addressable element this one sits inside.
   *
   *  It has to be said, because both a block and a run apply their own
   *  translate: move a ticket 50px left and move the words on it 50px left
   *  too, and the words end up 100px left of where anyone wanted them. */
  within?: string;
};

export type Shot =
  | { ok: true; file: string; small: string; w: number; h: number; parts: Part[];
      band?: { box: [number, number, number, number]; why: string };
      svg?: string; layers?: unknown; ms: number }
  | { ok: false; error: string; ms: number };

const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

/** Chrome writes the port it actually bound to here, which is how you use
 *  port 0 and still find it. */
async function portOf(dir: string, until: number): Promise<number> {
  const f = join(dir, 'DevToolsActivePort');
  while (Date.now() < until) {
    if (existsSync(f)) {
      const n = Number(readFileSync(f, 'utf8').split('\n')[0]);
      if (n > 0) return n;
    }
    await wait(100);
  }
  throw new Error('Chrome never reported a debugging port');
}

/** A minimal DevTools client: send a command, get its reply, and let a caller
 *  wait on one event. Enough for navigate-and-photograph and nothing more. */
class Cdp {
  private ws: WebSocket;
  private id = 0;
  private waiting = new Map<number, (v: any) => void>();
  private events = new Map<string, () => void>();

  private constructor(ws: WebSocket) {
    this.ws = ws;
    ws.addEventListener('message', (e: MessageEvent) => {
      const m = JSON.parse(String(e.data));
      if (m.id !== undefined) this.waiting.get(m.id)?.(m);
      else this.events.get(m.method)?.();
    });
  }

  static connect(url: string, until: number): Promise<Cdp> {
    return new Promise((res, rej) => {
      const ws = new WebSocket(url);
      const t = setTimeout(() => rej(new Error('DevTools did not accept a connection')),
        Math.max(1000, until - Date.now()));
      ws.addEventListener('open', () => { clearTimeout(t); res(new Cdp(ws)); });
      ws.addEventListener('error', () => { clearTimeout(t); rej(new Error('DevTools connection failed')); });
    });
  }

  send(method: string, params: unknown = {}): Promise<any> {
    const id = ++this.id;
    return new Promise(res => {
      this.waiting.set(id, m => { this.waiting.delete(id); res(m.result ?? m); });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  once(method: string, ms: number): Promise<void> {
    return new Promise(res => {
      const t = setTimeout(() => { this.events.delete(method); res(); }, ms);
      this.events.set(method, () => { clearTimeout(t); this.events.delete(method); res(); });
    });
  }

  close() { try { this.ws.close(); } catch { /* already gone */ } }
}

/** Everything the page is still waiting for, waited on by name rather than by
 *  guessing at a delay.
 *
 *  `data-shot` is the page's own word for it, and it is the only one that
 *  knows: a shot view still fetching its campaign has no fonts pending and no
 *  images pending, so every other signal reads settled and the judge gets a
 *  screenshot of the word 'opening'. `document.fonts.ready` then covers the
 *  Adobe kit and `img.decode()` the photographs; neither is network idle,
 *  which a dev server never reaches. */
const SETTLED = `(async () => {
  const until = Date.now() + 20000;
  while (!document.documentElement.dataset.shot && Date.now() < until)
    await new Promise(r => setTimeout(r, 60));
  if (document.documentElement.dataset.shot === 'failed')
    return { failed: document.body.innerText.trim().slice(0, 200) || 'the page would not render' };
  await document.fonts.ready;
  await Promise.all([...document.images].map(i =>
    i.complete ? null : i.decode().catch(() => null)));
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  const el = document.getElementById('root')?.firstElementChild;
  const r = el ? el.getBoundingClientRect() : null;
  if (!r) return null;
  const raw = el.dataset.band;
  const band = raw ? { box: raw.split(',').map(Number), why: el.dataset.bandWhy || '' } : null;

  const round = n => Math.round(n * 10) / 10;
  const parts = [...document.querySelectorAll('[data-id]')].map(n => {
    const b = n.getBoundingClientRect();
    const kind = n.classList.contains('ed') ? 'text'
               : n.classList.contains('pic') ? 'picture' : 'block';
    const parent = n.parentElement?.closest('[data-id]');
    const out = { id: n.dataset.id, kind,
      box: [round(b.x - r.x), round(b.y - r.y), round(b.width), round(b.height)],
      within: parent ? parent.dataset.id : undefined };
    if (kind === 'text') {
      out.text = n.innerText.replace(/\s+/g, ' ').trim().slice(0, 120);
      out.size = Math.round(parseFloat(getComputedStyle(n).fontSize));
    }
    return out;
  }).filter(p => p.id && p.box[2] > 0 && p.box[3] > 0);

  return { w: Math.ceil(r.width), h: Math.ceil(r.height), parts, band };
})()`;

/** A deadline over the whole thing, not just its parts.
 *
 *  `Runtime.evaluate` with `awaitPromise` waits forever if the page's promise
 *  never settles, and one asset that does that hangs a 41-asset export for
 *  good. Every step already has its own timeout; this is the one that catches
 *  the step that does not. */
const deadline = <T,>(work: Promise<T>, ms: number, what: string) =>
  Promise.race([work, new Promise<never>((_, bad) =>
    setTimeout(() => bad(new Error(`${what} after ${ms / 1000}s`)), ms).unref())]);

/** `small: false` for a bundle someone will open. The reduced copy exists for
 *  the model to read and has no business sitting next to the deliverable --
 *  in an export folder it doubles the file count and a designer drags in
 *  thirty-seven low-resolution duplicates alongside the real thing. */
export async function shoot(url: string, w: number, h: number, file: string,
                            opts: { small?: boolean; svg?: boolean; layers?: boolean } = {}): Promise<Shot> {
  const started = Date.now();
  const bin = chrome();
  if (!bin) return { ok: false, error: 'no Chrome on this machine', ms: 0 };

  const until = Date.now() + 40_000;
  const profile = join(tmpdir(), `sac-shot-${process.pid}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dirname(file), { recursive: true });
  rmSync(profile, { recursive: true, force: true });

  const p = spawn(bin, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
    '--no-default-browser-check', '--disable-extensions', '--mute-audio',
    `--user-data-dir=${profile}`, '--remote-debugging-port=0',
    // Never a window shorter than this. The capture clips to the asset and
    // reaches beyond the viewport anyway, so the window size is free -- and a
    // ~100px-tall browser stalls under load. The only two assets that ever
    // failed an export were the two shortest: a 1400x109 banner and a 375x83
    // card, both fine on their own and both timing out with four running.
    `--window-size=${Math.round(w)},${Math.max(600, Math.min(Math.round(h), 2000))}`,
    'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });

  let stderr = '';
  p.stderr.on('data', d => { stderr += d; });

  let cdp: Cdp | null = null;
  try {
    const port = await portOf(profile, until);
    const list = await fetch(`http://127.0.0.1:${port}/json/list`).then(r => r.json()) as
      { type: string; webSocketDebuggerUrl?: string }[];
    const page = list.find(t => t.type === 'page' && t.webSocketDebuggerUrl);
    if (!page?.webSocketDebuggerUrl) throw new Error('Chrome opened no page to drive');

    cdp = await Cdp.connect(page.webSocketDebuggerUrl, until);
    await cdp.send('Page.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride',
      { width: Math.round(w), height: Math.max(600, Math.min(Math.round(h), 2000)),
        deviceScaleFactor: 1, mobile: false });

    const loaded = cdp.once('Page.loadEventFired', 20_000);
    await cdp.send('Page.navigate', { url });
    await loaded;

    // The page measures itself, so a fluid-height email is cropped to what it
    // actually drew rather than to whatever the sheet guessed.
    const measured = await deadline(
      cdp.send('Runtime.evaluate', { expression: SETTLED, awaitPromise: true, returnByValue: true }),
      30_000, 'the page never finished rendering');
    const box = measured?.result?.value as
      { w: number; h: number; parts?: Part[]; failed?: string;
        band?: { box: [number, number, number, number]; why: string } | null } | null;
    // Photographing a page that said it could not render produces a verdict on
    // an error message, which is worse than no verdict.
    if (box?.failed) throw new Error(box.failed);
    const W = Math.max(1, Math.round(box?.w || w));
    const H = Math.max(1, Math.round(box?.h || h));

    const png = await deadline(cdp.send('Page.captureScreenshot', {
      format: 'png', captureBeyondViewport: true,
      clip: { x: 0, y: 0, width: W, height: H, scale: 1 },
    }), 30_000, 'Chrome did not return an image');
    if (!png?.data) throw new Error('Chrome returned no image');
    writeFileSync(file, Buffer.from(png.data, 'base64'));

    // A second, smaller capture for the model to read. The PNG is the export
    // and stays full size; a review does not need 860KB to see that a tag sits
    // on someone's face, and the image is re-sent on every turn, so its size
    // is paid for several times over. Measured: 46s on the PNG, 37s on this.
    // Chrome does the reduction, so there is no image tool to install.
    // Layers, not pixels. Taken from the same paint as the photograph so the
    // two cannot disagree about what was on the page.
    let svg: string | undefined;
    if (opts.svg) {
      const got = await deadline(
        cdp.send('Runtime.evaluate', { expression: 'window.__svg && window.__svg()',
                                       awaitPromise: true, returnByValue: true }),
        30_000, 'the page did not produce SVG');
      const v = got?.result?.value;
      if (typeof v === 'string' && v.startsWith('<svg')) svg = v;
    }

    let layers: unknown;
    if (opts.layers) {
      const got = await deadline(
        cdp.send('Runtime.evaluate', { expression: 'window.__layers && window.__layers()',
                                       awaitPromise: true, returnByValue: true }),
        30_000, 'the page did not produce layers');
      layers = got?.result?.value ?? undefined;
    }

    if (opts.small === false)
      return { ok: true, file, small: file, w: W, h: H, svg, layers,
               parts: box?.parts ?? [], band: box?.band ?? undefined,
               ms: Date.now() - started };

    const scale = Math.min(1, 760 / Math.max(W, H));
    const jpg = await deadline(cdp.send('Page.captureScreenshot', {
      format: 'jpeg', quality: 62, captureBeyondViewport: true,
      clip: { x: 0, y: 0, width: W, height: H, scale },
    }), 30_000, 'Chrome did not return a reduced image');
    const small = file.replace(/\.png$/, '.look.jpg');
    if (jpg?.data) writeFileSync(small, Buffer.from(jpg.data, 'base64'));

    return { ok: true, file, small: jpg?.data ? small : file,
             w: W, h: H, parts: box?.parts ?? [], band: box?.band ?? undefined, svg, layers,
             ms: Date.now() - started };
  } catch (e) {
    return { ok: false, ms: Date.now() - started,
      error: (e instanceof Error ? e.message : String(e))
        + (stderr.trim() ? ` — ${stderr.trim().split('\n').slice(-1)[0]}` : '') };
  } finally {
    cdp?.close();
    p.kill('SIGKILL');
    // Tidying up must never fail the shot. A browser being killed is still
    // writing its profile out, so a concurrent batch hits ENOTEMPTY here --
    // which threw out of `finally` and turned four good screenshots into one
    // failed asset.
    try { rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 }); }
    catch { /* a temp directory left behind is not worth failing over */ }
  }
}
