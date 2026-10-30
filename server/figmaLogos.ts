/** The vendor logo library in Figma, searchable by brand: a brand's every
 *  variant listed (Black, White, a lockup...), a thumbnail rendered only when
 *  a search shows it, and the logo itself downloaded as SVG only when a
 *  designer picks it. Nothing is shipped with the app: the listing,
 *  thumbnails and picked logos are cached under DATA/figma-logos, and the
 *  listing is only rebuilt when the Figma file's version changes.
 *
 *  The file keeps each brand as a component set named for the brand ("Arc'teryx")
 *  whose components are its variants ("Property 1=White"), filed under A-Z
 *  frames; a few brands are single components, instances or frames. Needs
 *  the Figma token (figmaGallery.ts reads it). */
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { DATA } from './paths.ts';
import { api, save } from './figmaGallery.ts';

const FILE_KEY = 'ZKeDJNni12gxgWK0HRpDMF';
const ROOT = '1:151';
const DIR = join(DATA, 'figma-logos');
const INDEX = join(DIR, 'index.json');
const THUMB = 240;

export type LogoItem = { id: string; brand: string; variant: string; w: number; h: number;
  /** A white or knockout variant: shown on a dark tile so it can be seen. */
  light: boolean };
type Index = { version: string; items: LogoItem[] };
type Node = { id: string; name: string; type: string; visible?: boolean; children?: Node[];
  absoluteBoundingBox?: { width: number; height: number } };

const fileOf = (id: string, kind: 'thumb' | 'full') =>
  join(DIR, kind, `${id.replace(/[^0-9A-Za-z;-]/g, '-')}.${kind === 'thumb' ? 'png' : 'svg'}`);
export const validId = (id: string) => /^[0-9A-Za-z:;-]{1,80}$/.test(id);

/** "Property 1=Horizontal, Property 2=Red" -> "Horizontal · Red". */
const variantOf = (name: string) => name.split(',').map(p => p.split('=').pop()!.trim()).filter(Boolean).join(' · ');
const itemOf = (n: Node, brand: string, variant: string): LogoItem | null => {
  const b = n.absoluteBoundingBox;
  if (!b || b.width < 4 || b.height < 4) return null;
  return { id: n.id, brand: brand.trim(), variant, w: b.width, h: b.height,
    light: /white|knockout|reverse|inverse/i.test(`${variant} ${n.name}`) };
};
/** The frames that only file logos (the whole sheet, "Alphabetical Logos",
 *  each letter) -- looked into, never a logo themselves. */
const filing = (n: Node, depth: number) => depth === 0 || n.name === 'Alphabetical Logos' || /^[A-Z]$/.test(n.name);

function logosIn(n: Node, depth = 0, out: LogoItem[] = []): LogoItem[] {
  if (n.visible === false) return out;
  if (filing(n, depth)) { for (const c of n.children ?? []) logosIn(c, depth + 1, out); return out; }
  if (n.type === 'COMPONENT_SET') {
    for (const c of n.children ?? []) if (c.visible !== false) {
      const item = itemOf(c, n.name, variantOf(c.name));
      if (item) out.push(item);
    }
    return out;
  }
  // A brand drawn on its own (a component, an instance, a frame, a group).
  if (['COMPONENT', 'INSTANCE', 'FRAME', 'GROUP', 'VECTOR', 'BOOLEAN_OPERATION'].includes(n.type)) {
    const item = itemOf(n, n.name, '');
    if (item) out.push(item);
  }
  return out; // TEXT labels, RECTANGLE swatches, divider lines
}

let building: Promise<Index> | null = null;
let fresh: { at: number; index: Index } | null = null;

/** Every logo variant, rebuilt only when the Figma file has changed (and
 *  that checked at most once a minute). */
export function list(): Promise<Index> {
  if (fresh && Date.now() - fresh.at < 60_000) return Promise.resolve(fresh.index);
  return building ??= (async () => {
    const cached: Index | null = await readFile(INDEX, 'utf8').then(JSON.parse).catch(() => null);
    const { version } = await api<{ version: string }>(`/files/${FILE_KEY}?depth=1`);
    if (cached?.version === version) { fresh = { at: Date.now(), index: cached }; return cached; }
    const { nodes } = await api<{ nodes: Record<string, { document: Node } | null> }>(
      `/files/${FILE_KEY}/nodes?ids=${encodeURIComponent(ROOT)}&depth=4`);
    const root = nodes[ROOT]?.document;
    if (!root) throw new Error(`Frame ${ROOT} not found in the Figma logo file`);
    const items = logosIn(root).sort((a, b) => a.brand.localeCompare(b.brand) || a.variant.localeCompare(b.variant));
    const index = { version, items };
    await save(INDEX, JSON.stringify(index));
    fresh = { at: Date.now(), index };
    return index;
  })().finally(() => { building = null; });
}

/** Thumbnails asked for within a moment of each other are rendered in one
 *  Figma request (a search shows a page of them at once). Figma rate-limits
 *  renders, so:
 *  - a few fixed scales, not one per logo, so a page is one or two requests;
 *  - one batch at a time, in order;
 *  - a 429 waits and retries (2s, 5s, 12s);
 *  - and a batch that still fails only fails its thumbnails (shown as
 *    missing, rendered again on the next search) -- it runs outside any
 *    request, and an error escaping it took the whole server down. */
const SCALES = [0.1, 0.15, 0.2, 0.3, 0.45, 0.6, 1];
let queue: { item: LogoItem; done: () => void }[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let chain: Promise<void> = Promise.resolve();
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function patiently<T>(call: () => Promise<T>): Promise<T> {
  for (const wait of [2_000, 5_000, 12_000]) {
    try { return await call(); }
    catch (e) { if (!/^Figma 429/.test(String((e as Error).message))) throw e; await sleep(wait); }
  }
  return call();
}

async function flush() {
  const batch = queue; queue = [];
  const groups = new Map<number, typeof batch>();
  for (const q of batch) {
    const want = THUMB / Math.max(q.item.w, q.item.h);
    const scale = SCALES.find(s => s >= want) ?? Math.min(4, +want.toFixed(2));
    groups.set(scale, [...(groups.get(scale) ?? []), q]);
  }
  for (const [scale, group] of groups)
    for (let i = 0; i < group.length; i += 50) {
      const part = group.slice(i, i + 50), ids = part.map(q => q.item.id);
      try {
        const { images } = await patiently(() => api<{ images: Record<string, string | null> }>(
          `/images/${FILE_KEY}?ids=${encodeURIComponent(ids.join(','))}&format=png&scale=${scale}`));
        await Promise.all(ids.map(async id => {
          const url = images[id];
          const res = url ? await fetch(url).catch(() => null) : null;
          if (res?.ok) await save(fileOf(id, 'thumb'), Buffer.from(await res.arrayBuffer()));
        }));
      } catch (e) {
        console.error(`Figma logos: ${ids.length} thumbnails not rendered (${(e as Error).message})`);
      } finally { part.forEach(q => q.done()); }
    }
}

/** A logo's thumbnail (PNG), or the logo itself (SVG), fetched from Figma the
 *  first time it's asked for, then kept. */
export async function image(id: string, kind: 'thumb' | 'full'): Promise<Buffer | null> {
  const path = fileOf(id, kind);
  if (!existsSync(path)) {
    const item = (await list()).items.find(i => i.id === id);
    if (!item) return null;
    if (kind === 'thumb') await new Promise<void>(done => {
      queue.push({ item, done });
      timer ??= setTimeout(() => {
        timer = null;
        chain = chain.then(flush).catch(e => console.error(`Figma logos: ${(e as Error).message}`));
      }, 40);
    });
    else {
      const { images } = await patiently(() => api<{ images: Record<string, string | null> }>(
        `/images/${FILE_KEY}?ids=${encodeURIComponent(id)}&format=svg&svg_outline_text=true&svg_include_id=false`));
      const res = images[id] ? await fetch(images[id]!) : null;
      if (res?.ok) await save(path, Buffer.from(await res.arrayBuffer()));
    }
  }
  return existsSync(path) ? readFile(path) : null;
}
