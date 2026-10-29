/** The SAC image gallery in Figma, as a photo library: thumbnails up front,
 *  the full image only when a designer actually picks one.
 *
 *  Reads one page of one file (every node on it with an image fill is a
 *  photo; its layer name carries its pursuit tags), renders a ~240px
 *  thumbnail of each in batches, and renders a full-size one (~3200px on the
 *  long edge) on demand. Everything is cached under DATA/figma-gallery and
 *  the listing is only rebuilt when the Figma file's version changes.
 *
 *  The token comes from FIGMA_TOKEN: in the desktop app, a .env in the app's settings folder
 *  (written by the studio's Figma token dialog, or the app menu's Figma Token…); in development,
 *  a gitignored .env in sac-email-studio/ or the workspace above it. The studio can save or
 *  remove it (saveToken / removeToken) but never reads it back -- only whether one is saved
 *  and its last four characters. Without one, only the gallery is off. */
import { readFile, writeFile, mkdir, rename, chmod } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { DATA, ROOT } from './paths.ts';

/** Where the token is saved: in the desktop app, its settings folder (the
 *  shell names it in SAC_STUDIO_ENV; an older shell doesn't, but its
 *  settings folder is always <app data>/SAC Studio) -- outside the content
 *  clone that updates replace, and never in a repo. In development,
 *  sac-email-studio/.env. */
const appData = () => process.platform === 'darwin' ? join(homedir(), 'Library', 'Application Support')
  : process.platform === 'win32' ? process.env.APPDATA ?? join(homedir(), 'AppData', 'Roaming')
  : process.env.XDG_CONFIG_HOME ?? join(homedir(), '.config');
const envFile = () => process.env.SAC_STUDIO_ENV
  ?? (process.env.SAC_STUDIO_DESKTOP === '1' ? join(appData(), 'SAC Studio', '.env') : join(ROOT, '.env'));

// The saved .env, then sac-email-studio/.env, then the workspace's own .env
// one level up. Any may hold FIGMA_TOKEN=…, or just the bare figd_… token on
// a line of its own.
for (const file of [...new Set([envFile(), join(ROOT, '.env'), join(ROOT, '..', '.env')])]) {
  try { process.loadEnvFile(file); } catch { /* not there: FIGMA_TOKEN may come from the shell */ }
  if (!process.env.FIGMA_TOKEN && existsSync(file)) {
    const bare = readFileSync(file, 'utf8').split(/\r?\n/).map(l => l.trim()).find(l => /^figd_[\w-]+$/.test(l));
    if (bare) process.env.FIGMA_TOKEN = bare;
  }
}

const FILE_KEY = 'ZbmNd04wAFBvGUpE7AQsKD';
const PAGE = '0:1';
const DIR = join(DATA, 'figma-gallery');
const INDEX = join(DIR, 'index.json');
const THUMB = 240, FULL = 3200;

// Words in a layer name that name a pursuit; everything else in the name is
// still a searchable tag, just not a filter chip.
export const PURSUITS = ['ski', 'snowboard', 'snow', 'swim', 'surf', 'paddle', 'kayak', 'water', 'hike',
  'camp', 'climb', 'bike', 'run', 'trail', 'fish', 'travel', 'lifestyle', 'gear'];

export type GalleryItem = { id: string; name: string; tags: string[]; pursuits: string[]; w: number; h: number };
type Index = { version: string; items: GalleryItem[] };

export class NoToken extends Error {}

/** Whether a token is in use, and its last four characters -- never the token. */
export const tokenStatus = () => {
  const t = process.env.FIGMA_TOKEN?.trim();
  return { saved: !!t, tail: t ? t.slice(-4) : '' };
};

/** The .env's other lines, with FIGMA_TOKEN (or a bare token line) taken out. */
const othersIn = async (file: string) => (await readFile(file, 'utf8').catch(() => ''))
  .split(/\r?\n/).filter(l => l.trim() && !/^\s*FIGMA_TOKEN\s*=/.test(l) && !/^figd_[\w-]+$/.test(l.trim()));

/** Saves the token (owner-only), uses it at once, and asks Figma whose it is:
 *  a wrong one is still saved, but the studio says so. */
export async function saveToken(value: string) {
  const token = value.trim();
  if (!/^[\w-]{20,}$/.test(token)) return { saved: false, valid: false, message: 'That doesn\u2019t look like a Figma token (figd_…).' };
  const file = envFile();
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, [...await othersIn(file), `FIGMA_TOKEN=${token}`].join('\n') + '\n', { mode: 0o600 });
  await chmod(file, 0o600); // `mode` only applies to a new file
  process.env.FIGMA_TOKEN = token;
  const me = await fetch('https://api.figma.com/v1/me', { headers: { 'X-Figma-Token': token } })
    .then(r => r.ok ? r.json() as Promise<{ handle?: string; email?: string }> : null, () => undefined);
  if (me === undefined) return { saved: true, valid: null, message: 'Saved. Figma couldn\u2019t be reached to check it; it\u2019ll be used when you\u2019re online.' };
  if (!me) return { saved: true, valid: false, message: 'Saved, but Figma rejected it. Check the token and save again.' };
  return { saved: true, valid: true, message: `Saved: connected to Figma as ${me.handle || me.email}.` };
}

export async function removeToken() {
  const file = envFile(), others = await othersIn(file);
  if (existsSync(file)) await writeFile(file, others.length ? others.join('\n') + '\n' : '', { mode: 0o600 });
  delete process.env.FIGMA_TOKEN;
}

const token = () => {
  const t = process.env.FIGMA_TOKEN?.trim();
  if (!t) throw new NoToken('The Figma gallery needs a Figma token. The default library and your own uploads work without it.');
  return t;
};

export async function api<T>(path: string): Promise<T> {
  const res = await fetch(`https://api.figma.com/v1${path}`, { headers: { 'X-Figma-Token': token() } });
  if (!res.ok) throw new Error(`Figma ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json() as Promise<T>;
}

const fileOf = (id: string, kind: 'thumb' | 'full') => join(DIR, kind, `${id.replace(/[^0-9A-Za-z;-]/g, '-')}.jpg`);
export const validId = (id: string) => /^[0-9A-Za-z:;-]{1,80}$/.test(id);

async function save(path: string, data: Buffer | string) {
  await mkdir(join(path, '..'), { recursive: true });
  const pending = `${path}.${process.pid}.tmp`;
  await writeFile(pending, data);
  await rename(pending, path);
}

type Node = { id: string; name: string; visible?: boolean; children?: Node[];
  fills?: { type: string; visible?: boolean }[]; absoluteBoundingBox?: { width: number; height: number } };

/** Tags from a layer name, split on anything that isn't a letter -- the
 *  gallery names its photos "Climb1", "Hike5", so a pursuit word runs
 *  straight into its number. Worked out on every read, not cached, so a
 *  change here applies without re-fetching the file. */
const tagged = (item: Omit<GalleryItem, 'tags' | 'pursuits'>): GalleryItem => {
  const tags = [...new Set(item.name.toLowerCase().match(/[a-z]{2,}/g) ?? [])];
  return { ...item, tags, pursuits: tags.filter(t => PURSUITS.includes(t)) };
};

function photosIn(node: Node, out: GalleryItem[] = []): GalleryItem[] {
  if (node.visible === false) return out;
  if (node.fills?.some(f => f.type === 'IMAGE' && f.visible !== false) && node.absoluteBoundingBox) {
    out.push(tagged({ id: node.id, name: node.name,
      w: node.absoluteBoundingBox.width, h: node.absoluteBoundingBox.height }));
    return out;
  }
  for (const child of node.children ?? []) photosIn(child, out);
  return out;
}

/** Renders `items` as JPEGs about `edge` px on their long side and saves
 *  them -- grouped by scale, 50 ids a request, since Figma renders one scale
 *  per call. */
async function render(items: GalleryItem[], edge: number, kind: 'thumb' | 'full') {
  const groups = new Map<number, GalleryItem[]>();
  for (const item of items) {
    const scale = Math.max(0.01, Math.min(4, +(edge / Math.max(item.w, item.h)).toFixed(2)));
    groups.set(scale, [...(groups.get(scale) ?? []), item]);
  }
  for (const [scale, group] of groups)
    for (let i = 0; i < group.length; i += 50) {
      const ids = group.slice(i, i + 50).map(item => item.id);
      const { images } = await api<{ images: Record<string, string | null> }>(
        `/images/${FILE_KEY}?ids=${encodeURIComponent(ids.join(','))}&format=jpg&scale=${scale}`);
      await Promise.all(ids.map(async id => {
        const url = images[id];
        if (!url) return;
        const res = await fetch(url);
        if (res.ok) await save(fileOf(id, kind), Buffer.from(await res.arrayBuffer()));
      }));
    }
}

let building: Promise<Index> | null = null;
let fresh: { at: number; index: Index } | null = null;

/** The gallery listing, rebuilt only when the Figma file has changed (and
 *  that only checked once a minute). */
export function list(): Promise<Index> {
  if (fresh && Date.now() - fresh.at < 60_000) return Promise.resolve(fresh.index);
  return building ??= (async () => {
    const cached: Index | null = await readFile(INDEX, 'utf8').then(JSON.parse).catch(() => null);
    const { version } = await api<{ version: string }>(`/files/${FILE_KEY}?depth=1`);
    if (cached?.version === version && cached.items.every(item => existsSync(fileOf(item.id, 'thumb')))) {
      const index = { version, items: cached.items.map(tagged) };
      fresh = { at: Date.now(), index };
      return index;
    }
    const { nodes } = await api<{ nodes: Record<string, { document: Node } | null> }>(
      `/files/${FILE_KEY}/nodes?ids=${encodeURIComponent(PAGE)}`);
    const page = nodes[PAGE]?.document;
    if (!page) throw new Error(`Page ${PAGE} not found in the Figma gallery file`);
    const items = photosIn(page);
    await render(items.filter(item => !existsSync(fileOf(item.id, 'thumb'))), THUMB, 'thumb');
    const index = { version, items };
    await save(INDEX, JSON.stringify(index));
    fresh = { at: Date.now(), index };
    return index;
  })().finally(() => { building = null; });
}

/** One image's bytes: its thumbnail, or its full render (fetched from Figma
 *  the first time it's asked for, then kept). */
export async function image(id: string, kind: 'thumb' | 'full'): Promise<Buffer | null> {
  const path = fileOf(id, kind);
  if (!existsSync(path)) {
    const item = (await list()).items.find(i => i.id === id);
    if (!item) return null;
    await render([item], kind === 'thumb' ? THUMB : FULL, kind);
  }
  return existsSync(path) ? readFile(path) : null;
}
