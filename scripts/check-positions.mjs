/** The position check, headless: loads dev/bump-preview/positions.html in
 *  Chrome and fails if any mapped layer sits more than TOLERANCE px off the
 *  box Figma has for it.
 *
 *  Needs the Bump preview server (npm run preview:bump, port 5181) and
 *  Google Chrome, so it isn't part of `npm run check`.
 *
 *    npm run check:positions
 *    SHOT=/path/out.png npm run check:positions   also saves the overlay */
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

// Chrome and Figma lay the same font out a little differently (up to ~0.6%
// of a run's width on these boards): a few px is text engine, not placement.
// Keep in step with TOLERANCE in dev/bump-preview/positions.tsx.
const TOLERANCE = 4;
const URL = process.env.POSITIONS_URL || 'http://localhost:5181/positions.html';
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9341;

const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--no-first-run',
  `--user-data-dir=${process.env.TMPDIR || '/tmp'}/sac-positions-profile`, 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const done = code => { chrome.kill(); process.exit(code); };

let page;
for (let i = 0; i < 40 && !page; i++) {
  await sleep(250);
  page = await fetch(`http://127.0.0.1:${PORT}/json`).then(r => r.json())
    .then(l => l.find(t => t.type === 'page')).catch(() => null);
}
if (!page) { console.error('positions: Chrome did not start'); done(1); }
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);
let n = 0; const waiting = new Map();
const send = (method, params = {}) => new Promise(r => { const id = ++n; waiting.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id); } };
const value = async expression => (await send('Runtime.evaluate', { expression, returnByValue: true })).result?.result?.value;

await send('Emulation.setDeviceMetricsOverride', { width: 1500, height: 1200, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: URL });
let rows;
for (let t = 0; t < 60 && !rows; t++) { await sleep(500); if (await value('window.__positionsDone')) rows = await value('window.__positions'); }
if (!rows) { console.error(`positions: nothing measured at ${URL} -- is npm run preview:bump running?`); done(1); }

if (process.env.SHOT) {
  const size = await value('({ w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight })');
  const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true,
    clip: { x: 0, y: 0, width: size.w, height: size.h, scale: 1 } });
  writeFileSync(process.env.SHOT, Buffer.from(shot.result.data, 'base64'));
}

const pad = (s, w) => String(s).padStart(w);
let bad = 0;
for (const r of rows) {
  const status = r.hidden ? 'hidden in Figma' : r.missing ? 'NOT ON PAGE'
    : `${pad(r.dx, 7)} ${pad(r.dy, 7)} ${pad(r.dw, 7)} ${pad(r.dh, 7)}   worst ${r.off}px`;
  const fail = !r.hidden && (r.missing || r.off > TOLERANCE);
  if (fail) bad++;
  console.log(`${fail ? '✗' : ' '} ${r.target}/${r.layer.padEnd(16)} ${status}${r.note ? `   (${r.note})` : ''}`);
}
console.log(bad ? `\npositions: ${bad} layer(s) more than ${TOLERANCE}px off Figma` : '\npositions clean');
done(bad ? 1 : 0);
