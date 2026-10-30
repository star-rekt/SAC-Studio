/** The AI connector: `claude -p` behind three HTTP routes, and nothing else.
 *
 *  Deliberately thin. The studio already holds the deterministic brief parser,
 *  the sheet and the renderer, so putting the reconciliation here would mean a
 *  second copy of all three -- which is the mistake this repo has already paid
 *  for once. The server runs the model and hands back what it said. Deciding
 *  whether to believe it happens in the app, next to the parser that
 *  disagrees.
 *
 *  No dependencies: Node 24 runs TypeScript as it stands and serves HTTP on
 *  its own, so the connector adds nothing to install.
 *
 *    GET  /ai/health          is claude on PATH, is there a browser to shoot with
 *    POST /ai/brief   {text}  the brief, read as intent
 *    POST /ai/judge   {url,width,height,what}  a PNG of that view, and a verdict on it
 *    POST /ai/fix     {…,issues}  what to move, resize or retype to answer them
 *    GET  /ai/shot/<campaign>/<asset>.png  the PNG the judge was looking at,
 *                                           which is also the export on disk
 *
 *  It also keeps the sessions, which are not an AI job but do need a disk the
 *  browser does not have:
 *
 *    GET    /api/sessions      every campaign on disk, newest first
 *    GET    /api/sessions/:id  one sheet
 *    PUT    /api/sessions/:id  save it
 *    DELETE /api/sessions/:id
 *    POST   /api/export      a folder of PNGs to drag into Figma
 *    GET    /api/brief/:id   the same manifest, for the Figma plugin to build
 *    GET    /api/export-file/:path  one image the manifest names
 *    GET    /api/figma/:id    the campaign as one .figma.json for the plugin
 *    GET    /api/figma-token   whether a Figma token is saved (and its last 4 characters)
 *    PUT    /api/figma-token {token}  save it (checked with Figma); DELETE  remove it
 *    GET    /api/figma-gallery              the Figma photo gallery (thumbnails listed)
 *    GET    /api/figma-gallery/thumb/:node  a ~240px thumbnail
 *    GET    /api/figma-gallery/full/:node   the full image, fetched on first pick
 *    GET    /api/figma-logos              the Figma vendor logo library (every variant listed)
 *    GET    /api/figma-logos/thumb/:node  a ~240px PNG, rendered when a search shows it
 *    GET    /api/figma-logos/full/:node   the logo as SVG, fetched on first pick
 *    POST   /ai/photo {image}  where the people/subject are, for a photo the
 *                              on-device detectors found nothing in (small JPEG)
 *    GET    /api/photo-analysis        every cached photo analysis, by src hash
 *    PUT    /api/photo-analysis/:hash  keep one (worked out in the studio)
 */
import { createServer } from 'node:http';
import { readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { join, normalize, relative, isAbsolute } from 'node:path';
import { execFile } from 'node:child_process';
import { UI, PUBLIC } from './paths.ts';
import { ask, firstJson } from './claude.ts';
import { shoot, chrome, EXPORTS } from './shot.ts';
import { PARSE, JUDGE, CLASSIFY, FIX, LOCATE } from './prompts.ts';
import { rules, count, names, digest, geometry } from './rules.ts';
import * as sessions from './sessions.ts';
import * as media from './media.ts';
import * as photoAnalysis from './photoAnalysis.ts';
import * as gallery from './figmaGallery.ts';
import * as logos from './figmaLogos.ts';
import { exportCampaign, briefOnly, figmaDocument, pngZip } from './export.ts';

const PORT = Number(process.env.SAC_AI_PORT ?? 5179);
const DESKTOP = process.env.SAC_STUDIO_DESKTOP === '1';
const within = (root: string, file: string) => {
  const path = relative(root, file);
  return path !== '..' && !path.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`)
    && !isAbsolute(path);
};
const mime = (file: string) => {
  if (/\.html$/i.test(file)) return 'text/html; charset=utf-8';
  if (/\.js$/i.test(file)) return 'text/javascript; charset=utf-8';
  if (/\.css$/i.test(file)) return 'text/css; charset=utf-8';
  if (/\.svg$/i.test(file)) return 'image/svg+xml';
  if (/\.png$/i.test(file)) return 'image/png';
  if (/\.webp$/i.test(file)) return 'image/webp';
  if (/\.jpe?g$/i.test(file)) return 'image/jpeg';
  if (/\.json$/i.test(file)) return 'application/json';
  return 'application/octet-stream';
};
const studioOrigin = () => `http://127.0.0.1:${(server.address() as { port: number } | null)?.port ?? PORT}`;

/** Measured on one email hero, same rules, same image:
 *
 *    prose, default model, 860KB png   199s   excellent
 *    classifier, haiku, 860KB png       56s   poor, self-contradictory
 *    classifier, haiku, 84KB jpeg      119s   poor
 *    classifier, default, 860KB png     46s   accurate
 *    classifier, default, 84KB jpeg     37s   accurate
 *
 *  So the small model is both slower and worse here and is not used. What
 *  bought the time was the shape of the answer, not the size of the brain:
 *  five short tuples instead of eight paragraphs. SAC_QUICK_MODEL is left as
 *  an override for anyone who wants to try again when the models change.
 */
const QUICK_MODEL = process.env.SAC_QUICK_MODEL || undefined;

type Tight = { v?: string; s?: string; i?: [number, string, string, string][] };

const SEV: Record<string, 'high' | 'medium' | 'low'> =
  { H: 'high', M: 'medium', L: 'low' };
const WHERE: Record<string, string> =
  { L: 'left third', C: 'centre', R: 'right third', none: 'no clear subject' };

/** The classifier's one line, opened back out into the shape the studio reads.
 *  Expanding here rather than in the app keeps the compact form an
 *  implementation detail of being fast. */
function expand(t: Tight, label: Record<number, string>, n: number) {
  // Which rules failed is derived from the issues rather than asked for
  // separately. Asked for both, it returned 'FFFFFFFF' beside five issues
  // naming five rules -- two answers to one question, disagreeing.
  const broke = new Set((t.i ?? []).map(x => Number(x[0])));
  return {
    verdict: (['ship', 'fix', 'reject'].includes(t.v ?? '') ? t.v : 'fix') as
      'ship' | 'fix' | 'reject',
    reads: '',
    subject: WHERE[t.s ?? 'none'] ?? t.s,
    hierarchy: '',
    rules: Array.from({ length: n }, (_, k) => ({
      n: k + 1, pass: !broke.has(k + 1), note: '',
    })),
    issues: (t.i ?? []).slice(0, 5).map(([rule, sev, where, what]) => ({
      rule, severity: SEV[String(sev).toUpperCase()] ?? 'medium',
      where: String(where ?? '').slice(0, 60),
      what: String(what ?? '').slice(0, 160),
      fix: '', 
    })),
    label,
  };
}

const body = (req: import('node:http').IncomingMessage, maxChars = 4_000_000) => new Promise<string>((res, rej) => {
  // Past the limit, stop keeping the bytes but let the request finish, so the
  // studio gets a real error back instead of a dropped connection (which it
  // could only report as "Unexpected end of JSON input").
  let s = '', over = false;
  req.on('data', c => { if (over) return; s += c; if (s.length > maxChars) { over = true; s = ''; } });
  req.on('end', () => over
    ? rej(new Error(`That upload is too large (over ${Math.round(maxChars / 1_000_000)} MB).`)) : res(s));
  req.on('error', rej);
});

const claudeVersion = () => new Promise<string | null>(res =>
  execFile('claude', ['--version'], { timeout: 10_000 },
    (e, out) => res(e ? null : out.trim())));

/** A screenshot name that cannot escape the shots directory, derived from the
 *  asset id so re-judging the same asset overwrites rather than piles up. */
/** A content hash of the decisions, so a built board can say which version of
 *  the campaign it came from. Same shape as the studio's own. */
function sheetHashOf(sheet: { templateId?: string; brief?: { text?: string }; assets?: unknown[] }) {
  const stable = JSON.stringify({ t: sheet.templateId, b: sheet.brief?.text, n: sheet.assets?.length });
  let h = 0x811c9dc5;
  for (let i = 0; i < stable.length; i++) { h ^= stable.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

const safeName = (s: string) => s.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 80) || 'shot';

const server = createServer(async (req, res) => {
  const send = (code: number, data: unknown) => {
    res.writeHead(code, { 'content-type': 'application/json',
                          'x-content-type-options': 'nosniff' });
    res.end(JSON.stringify(data));
  };

  const host = req.headers.host ?? '';
  const origin = req.headers.origin;
  const allowedOrigin = !origin || origin === studioOrigin() ||
    // The dev placement lab (vite.bump-preview, :5181) proxies here too.
    (!DESKTOP && (origin === 'http://localhost:5178' || origin === 'http://localhost:5181'));
  if (!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host) || !allowedOrigin)
    return send(403, { error: 'local studio requests only' });

  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'allow': 'GET,POST,PUT,DELETE,OPTIONS' });
    return res.end();
  }

  const url = new URL(req.url ?? '/', studioOrigin());

  try {
    if (url.pathname === '/ai/health') {
      const book = await rules();
      return send(200, { claude: await claudeVersion(), chrome: chrome(), rules: count(book) });
    }

    if (url.pathname === '/ai/rules')
      return send(200, { text: await rules() });

    if (url.pathname.startsWith('/ai/shot/')) {
      const rel = normalize(decodeURIComponent(url.pathname.slice('/ai/shot/'.length)));
      const file = join(EXPORTS, rel.replace(/^(\.\.[/\\])+/, ''));
      if (!within(EXPORTS, file)) return send(403, { error: 'outside the exports directory' });
      const png = await readFile(file).catch(() => null);
      if (!png) return send(404, { error: 'no such shot' });
      res.writeHead(200, { 'content-type': 'image/png', 'cache-control': 'no-store' });
      return res.end(png);
    }

    // Export is a long call -- forty-one browsers' worth -- so it answers
    // once at the end rather than streaming. The UI says how long to expect.
    if (url.pathname === '/api/export' && req.method === 'POST') {
      const { session, origin } = JSON.parse(await body(req)) as
        { session?: string; origin?: string };
      if (!session || !sessions.legal(session)) return send(400, { error: 'no campaign named' });
      const sheet = await sessions.get(session);
      if (!sheet) return send(404, { error: `no session ${session}` });
      const out = await exportCampaign(session, sheet.name ?? session, sheet.assets,
        origin ?? studioOrigin(), undefined, sheetHashOf(sheet));
      return send(200, out);
    }

    // One file carrying the whole campaign: layers, photographs as base64,
    // vector marks as SVG. The plugin needs no network permission to read it,
    // so it can be shared rather than only run from a checkout.
    if (url.pathname.startsWith('/api/figma/') && req.method === 'GET') {
      const id = decodeURIComponent(url.pathname.slice('/api/figma/'.length));
      if (!sessions.legal(id)) return send(400, { error: `not a session id: ${id}` });
      const sheet = await sessions.get(id);
      if (!sheet) return send(404, { error: `no session ${id}` });
      // This connector is a separate process from whatever actually serves
      // the studio's pages -- Vite's own port in dev, this same server only
      // in the packaged desktop build. Defaulting to studioOrigin() (this
      // server's own port) meant the screenshot step navigated to a 404 in
      // dev every time, failing with a baffling "no editable layers
      // returned" rather than an origin error. The caller names its own
      // origin instead; local-only, same as the rest of this server.
      const reqOrigin = url.searchParams.get('origin');
      const shotOrigin = reqOrigin && /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(reqOrigin)
        ? reqOrigin : studioOrigin();
      const doc = await figmaDocument(id, sheet.name ?? id, sheetHashOf(sheet),
        sheet.assets, shotOrigin);
      res.writeHead(200, {
        'content-type': 'application/json',
        'content-disposition': `attachment; filename="${safeName(sheet.name ?? id)}.figma.json"`,
        'x-sac-media-complete': '1',
      });
      return res.end(JSON.stringify(doc));
    }

    // Every asset as a PNG, in one zip. Same origin rule as the Figma file.
    if (url.pathname.startsWith('/api/png/') && req.method === 'GET') {
      const id = decodeURIComponent(url.pathname.slice('/api/png/'.length));
      if (!sessions.legal(id)) return send(400, { error: `not a session id: ${id}` });
      const sheet = await sessions.get(id);
      if (!sheet) return send(404, { error: `no session ${id}` });
      const reqOrigin = url.searchParams.get('origin');
      const shotOrigin = reqOrigin && /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(reqOrigin)
        ? reqOrigin : studioOrigin();
      try {
        const zip = await pngZip(id, sheet.name ?? id, sheet.assets, shotOrigin);
        res.writeHead(200, { 'content-type': 'application/zip',
          'content-disposition': `attachment; filename="${safeName(sheet.name ?? id)}-png.zip"` });
        return res.end(zip);
      } catch (e) {
        return send(500, { error: e instanceof Error ? e.message : String(e) });
      }
    }

    // What the plugin builds from. Same manifest the folder carries, without
    // writing a folder: the plugin reads the images from this server too, so
    // putting them on disk first is a detour back to the same bytes.
    if (url.pathname.startsWith('/api/brief/') && req.method === 'GET') {
      const id = decodeURIComponent(url.pathname.slice('/api/brief/'.length));
      if (!sessions.legal(id)) return send(400, { error: `not a session id: ${id}` });
      const sheet = await sessions.get(id);
      if (!sheet) return send(404, { error: `no session ${id}` });
      const origin = req.headers['x-studio-origin'] as string | undefined;
      return send(200, await briefOnly(id, sheet.name ?? id, sheet.assets,
        origin ?? studioOrigin()));
    }

    // One picture the manifest names, by the path it names it by. The plugin
    // turns these into Figma images itself, so there is no upload step.
    if (url.pathname.startsWith('/api/export-file/') && req.method === 'GET') {
      const rel = normalize(decodeURIComponent(url.pathname.slice('/api/export-file/'.length)));
      if (!/^(media\/(photos|reference|logos|graphics|figma-assets)|photographs|logos|graphics)\//.test(rel)
          || rel.includes('..'))
        return send(400, { error: 'only exported media' });
      const leaf = rel.split('/').pop()!;
      const source = rel.startsWith('media/') ? rel.slice('media/'.length)
        : `${rel.startsWith('photographs/') ? 'photos' : rel.split('/')[0]}/${leaf}`;
      const file = join(PUBLIC, source);
      const bytes = await readFile(file).catch(() => null);
      if (!bytes) return send(404, { error: `no such file: ${rel}` });
      res.writeHead(200, {
        'content-type': /\.svg$/i.test(leaf) ? 'image/svg+xml'
          : /\.png$/i.test(leaf) ? 'image/png'
          : /\.webp$/i.test(leaf) ? 'image/webp' : 'image/jpeg',
        'cache-control': 'no-store',
      });
      return res.end(bytes);
    }

    if (url.pathname === '/api/media' && req.method === 'GET')
      return send(200, { items: await media.list() });
    if (url.pathname === '/api/media' && req.method === 'POST')
      return send(201, { item: await media.add(JSON.parse(await body(req, 64_000_000))) });
    if (url.pathname.startsWith('/api/media/')) {
      const id = decodeURIComponent(url.pathname.slice('/api/media/'.length));
      if (!/^user-[a-f0-9-]{36}$/.test(id)) return send(400, { error: 'invalid media id' });
      if (req.method === 'PATCH') {
        const { tags } = JSON.parse(await body(req)) as { tags?: unknown };
        const item = await media.retag(id, tags);
        return item ? send(200, { item }) : send(404, { error: 'media not found' });
      }
      if (req.method === 'DELETE')
        return send(200, { ok: await media.remove(id) });
    }

    if (url.pathname === '/api/figma-token') {
      if (req.method === 'GET') return send(200, gallery.tokenStatus());
      if (req.method === 'PUT') {
        const { token } = JSON.parse(await body(req, 4_000)) as { token?: string };
        return send(200, await gallery.saveToken(String(token ?? '')));
      }
      if (req.method === 'DELETE') { await gallery.removeToken(); return send(200, gallery.tokenStatus()); }
    }

    if (url.pathname === '/api/figma-gallery' && req.method === 'GET') {
      try {
        const { items } = await gallery.list();
        return send(200, { items });
      } catch (e) {
        if (e instanceof gallery.NoToken) return send(503, { error: e.message });
        throw e;
      }
    }
    const pictured = url.pathname.match(/^\/api\/figma-gallery\/(thumb|full)\/([^/]+)$/);
    if (pictured && req.method === 'GET') {
      const id = decodeURIComponent(pictured[2]);
      if (!gallery.validId(id)) return send(400, { error: 'invalid node id' });
      const bytes = await gallery.image(id, pictured[1] as 'thumb' | 'full');
      if (!bytes) return send(404, { error: 'not in the Figma gallery' });
      res.writeHead(200, { 'content-type': 'image/jpeg', 'cache-control': 'private, max-age=86400' });
      return res.end(bytes);
    }

    if (url.pathname === '/api/figma-logos' && req.method === 'GET') {
      try {
        const { items } = await logos.list();
        return send(200, { items });
      } catch (e) {
        if (e instanceof gallery.NoToken) return send(503, { error: e.message });
        throw e;
      }
    }
    const logo = url.pathname.match(/^\/api\/figma-logos\/(thumb|full)\/([^/]+)$/);
    if (logo && req.method === 'GET') {
      const id = decodeURIComponent(logo[2]);
      if (!logos.validId(id)) return send(400, { error: 'invalid node id' });
      const bytes = await logos.image(id, logo[1] as 'thumb' | 'full');
      if (!bytes) return send(404, { error: 'not in the Figma logo library' });
      res.writeHead(200, { 'content-type': logo[1] === 'full' ? 'image/svg+xml' : 'image/png',
        'cache-control': 'private, max-age=86400' });
      return res.end(bytes);
    }

    if (url.pathname === '/ai/photo' && req.method === 'POST') {
      const { image } = JSON.parse(await body(req, 2_000_000)) as { image?: string };
      const jpeg = image?.match(/^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/);
      if (!jpeg) return send(400, { error: 'send a small JPEG data URL' });
      const file = join(tmpdir(), `sac-photo-${randomUUID()}.jpg`);
      await writeFile(file, Buffer.from(jpeg[1], 'base64'));
      try {
        const run = await ask(LOCATE(file), 'Read', 3, 90_000, QUICK_MODEL);
        if (!run.ok) return send(502, { error: run.error });
        const found = firstJson<{ p?: unknown; h?: unknown; s?: unknown }>(run.text);
        if (!found) return send(502, { error: 'Claude did not answer with JSON' });
        const box = (b: unknown) => Array.isArray(b) && b.length === 4
          && b.every(n => typeof n === 'number' && n >= 0 && n <= 1) ? b as number[] : null;
        const boxes = (v: unknown) => Array.isArray(v) ? v.map(box).filter((b): b is number[] => !!b) : [];
        return send(200, { p: boxes(found.p), h: boxes(found.h), s: box(found.s), ms: run.ms });
      } finally { await rm(file, { force: true }); }
    }

    if (url.pathname === '/api/photo-analysis' && req.method === 'GET')
      return send(200, { items: await photoAnalysis.all() });
    if (url.pathname.startsWith('/api/photo-analysis/') && req.method === 'PUT') {
      const hash = url.pathname.slice('/api/photo-analysis/'.length);
      if (!/^[a-f0-9]{64}$/.test(hash)) return send(400, { error: 'invalid photo hash' });
      await photoAnalysis.put(hash, JSON.parse(await body(req)));
      return send(200, { ok: true });
    }

    if (url.pathname === '/api/sessions' && req.method === 'GET')
      return send(200, { sessions: await sessions.list() });

    if (url.pathname.startsWith('/api/sessions/')) {
      const id = decodeURIComponent(url.pathname.slice('/api/sessions/'.length));
      if (!sessions.legal(id)) return send(400, { error: `not a session id: ${id}` });

      if (req.method === 'GET') {
        const sheet = await sessions.get(id);
        return sheet ? send(200, { sheet }) : send(404, { error: `no session ${id}` });
      }
      if (req.method === 'PUT') {
        // Uploaded images travel as data URLs inside the campaign file. The
        // old 4MB request cap rejected an otherwise valid image on autosave.
        const sheet = JSON.parse(await body(req, 64_000_000));
        // The id in the path is the one that counts, so a sheet cannot be
        // saved over a different session by carrying the wrong id inside.
        await sessions.put(id, { ...sheet, id });
        return send(200, { ok: true, id });
      }
      if (req.method === 'DELETE')
        return send(200, { ok: await sessions.remove(id) });
    }

    if (url.pathname === '/ai/brief' && req.method === 'POST') {
      const { text } = JSON.parse(await body(req)) as { text?: string };
      if (!text?.trim()) return send(400, { error: 'no brief text' });
      // No tools at all: a brief is untrusted text and this call cannot act on
      // anything it says even if it asks to.
      const r = await ask(PARSE(text), '');
      if (!r.ok) return send(502, { error: r.error, ms: r.ms });
      const parse = firstJson(r.text);
      return parse
        ? send(200, { parse, ms: r.ms })
        : send(502, { error: 'Claude replied without JSON', raw: r.text.slice(0, 2000), ms: r.ms });
    }

    // Export and judge are one call because they are one act: the PNG the
    // judge opens is the export, so a verdict can never be about a render
    // nobody else can see. `look: false` exports without spending 30s on an
    // opinion, which is what reviewing 41 assets wants.
    if (url.pathname === '/ai/judge' && req.method === 'POST') {
      const { url: target, width, height, what, name, session, look = true, deep = false } =
        JSON.parse(await body(req)) as {
          url?: string; width?: number; height?: number; what?: string;
          name?: string; session?: string; look?: boolean; deep?: boolean };
      if (!target) return send(400, { error: 'no url to shoot' });
      if (!session || !sessions.legal(session)) return send(400, { error: 'no campaign named' });

      const leaf = `${safeName(name ?? what ?? 'asset')}.png`;
      const file = join(EXPORTS, session, leaf);
      const png = `/ai/shot/${session}/${leaf}`;

      // One retry, because the only failure seen in practice is a timeout
      // under contention -- three browsers at once, and the smallest asset
      // (375x83) was the one that stalled. On its own it renders in a second.
      let shot = await shoot(target, width ?? 1200, height ?? 900, file);
      if (!shot.ok && /never finished|did not return/.test(shot.error)) {
        const first = shot.ms;
        shot = await shoot(target, width ?? 1200, height ?? 900, file);
        if (shot.ok) shot.ms += first;
      }
      if (!shot.ok) return send(502, { error: `screenshot failed: ${shot.error}`, ms: shot.ms });
      if (!look) return send(200, { png, w: shot.w, h: shot.h, parts: shot.parts,
                                    band: shot.band, ms: shot.ms });

      // `Read` and nothing else: the judge can open the PNG it was handed and
      // has no way to reach the rest of the machine.
      const book = await rules();
      const n = count(book);
      const geo = geometry(shot.w, shot.h, shot.parts, shot.band);
      const label = names(book);

      const r = deep
        ? await ask(JUDGE(shot.file, what ?? 'marketing asset', book, geo, n), 'Read')
        : await ask(CLASSIFY(shot.small, what ?? 'marketing asset', digest(book), geo, n),
                    'Read', 4, 120_000, QUICK_MODEL);
      if (!r.ok) return send(502, { error: r.error, png, ms: shot.ms + r.ms });

      const raw = firstJson<Tight & Record<string, unknown>>(r.text);
      if (!raw) return send(502, { error: 'Claude replied without JSON',
        raw: r.text.slice(0, 2000), png, ms: shot.ms + r.ms });

      const verdict = deep ? { ...raw, label } : expand(raw, label, n);
      return send(200, { verdict, png, w: shot.w, h: shot.h, parts: shot.parts,
                         band: shot.band, deep, ms: shot.ms + r.ms });
    }

    // Answering a verdict with edits. It shoots again rather than trusting a
    // PNG from before, because the designer may have changed something since
    // -- and a fix computed against a stale picture lands in the wrong place.
    if (url.pathname === '/ai/fix' && req.method === 'POST') {
      const { url: target, width, height, what, name, session, issues } =
        JSON.parse(await body(req)) as {
          url?: string; width?: number; height?: number; what?: string;
          name?: string; session?: string; issues?: string[] };
      if (!target) return send(400, { error: 'no url to shoot' });
      if (!session || !sessions.legal(session)) return send(400, { error: 'no campaign named' });
      if (!issues?.length) return send(400, { error: 'nothing to fix' });

      const leaf = `${safeName(name ?? 'asset')}.png`;
      const file = join(EXPORTS, session, leaf);
      const shot = await shoot(target, width ?? 1200, height ?? 900, file);
      if (!shot.ok) return send(502, { error: `screenshot failed: ${shot.error}`, ms: shot.ms });
      if (!shot.parts.length)
        return send(200, { ops: [], cannotFix: issues.map(p => ({ problem: p,
          needs: 'this asset has no element the studio can move, resize or retype' })),
          png: `/ai/shot/${session}/${leaf}`, ms: shot.ms });

      // The small copy and a higher ceiling, for the same reasons as the
      // review: the picture is re-sent on every turn, and this is the longest
      // prompt in the studio -- the whole rulebook, the geometry, the issues
      // and a schema. At eight turns it ran out and said so.
      const r = await ask(FIX(shot.small, what ?? 'marketing asset',
        issues.map((x, i) => `${i + 1}. ${x}`).join('\n'),
        await rules(), geometry(shot.w, shot.h, shot.parts, shot.band)), 'Read', 20);
      if (!r.ok) return send(502, { error: r.error, ms: shot.ms + r.ms });

      const out = firstJson<{ ops?: unknown[]; cannotFix?: unknown[] }>(r.text);
      if (!out) return send(502, { error: 'Claude replied without JSON',
        raw: r.text.slice(0, 2000), ms: shot.ms + r.ms });

      // Anything naming an element that is not on the asset is dropped here
      // rather than being applied to nothing in the studio.
      const known = new Set(shot.parts.map(p => p.id));
      const ops = (out.ops ?? []).filter((o): o is { id: string } =>
        !!o && typeof o === 'object' && known.has((o as { id: string }).id));
      return send(200, { ops, cannotFix: out.cannotFix ?? [],
        dropped: (out.ops ?? []).length - ops.length,
        png: `/ai/shot/${session}/${leaf}`, parts: shot.parts, ms: shot.ms + r.ms });
    }

    if (DESKTOP && req.method === 'GET' && !url.pathname.startsWith('/api/') &&
        !url.pathname.startsWith('/ai/')) {
      const leaf = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname).slice(1);
      const file = join(UI, leaf);
      if (!within(UI, file)) return send(403, { error: 'outside the studio' });
      const bytes = await readFile(file).catch(() => null);
      if (!bytes) return send(404, { error: `no file ${url.pathname}` });
      res.writeHead(200, { 'content-type': mime(file), 'x-content-type-options': 'nosniff' });
      return res.end(bytes);
    }
    return send(404, { error: `no route ${req.method} ${url.pathname}` });
  } catch (e) {
    return send(500, { error: e instanceof Error ? e.message : String(e) });
  }
});

export const ready = new Promise<number>((resolve, reject) => {
  server.on('error', (e: NodeJS.ErrnoException) => {
  // Saying which port and what to do beats a stack trace, because the usual
  // cause is a connector from the last run that never exited.
  console.error(e.code === 'EADDRINUSE'
    ? `Port ${PORT} is taken — another connector is probably still running.\n`
      + `  lsof -nP -iTCP:${PORT} -sTCP:LISTEN     to see what has it\n`
      + `  SAC_AI_PORT=5189 npm run ai             to use a different one`
    : String(e));
    reject(e);
    if (!DESKTOP) process.exitCode = 1;
  });
  server.listen(PORT, '127.0.0.1', () => {
    const port = (server.address() as { port: number }).port;
    console.log(`SAC Studio → http://127.0.0.1:${port}/`);
    resolve(port);
  });
});

export const close = () => new Promise<void>((resolve, reject) =>
  server.close(error => error ? reject(error) : resolve()));
