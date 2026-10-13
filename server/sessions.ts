/** Sessions on disk, one JSON file each.
 *
 *  A session IS the sheet -- brief text, template, every asset's copy and
 *  photograph, and the designer's edits on top. There is nothing else to
 *  persist, so there is no session format to keep in step with the sheet
 *  format, and a file that lands here can be read by the PNG exporter and the
 *  Figma plugin without translation.
 *
 *  Plain files in a visible folder on purpose: a campaign that matters can be
 *  copied, diffed, mailed to someone or dropped in git, and nothing is locked
 *  inside a database the studio would then have to ship.
 */
import { readdir, readFile, writeFile, unlink, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { DATA } from './paths.ts';

export const DIR = join(DATA, 'sessions');

/** Ids come from the client and end up as filenames, so they are checked
 *  rather than trusted. */
export const legal = (id: string) => /^[a-z0-9][a-z0-9-]{0,63}$/i.test(id);

const file = (id: string) => join(DIR, `${id}.json`);

export type Card = {
  id: string; name: string; templateId: string;
  updatedAt: string; createdAt: string; assets: number; edits: number;
};

const card = (s: any): Card => ({
  id: s.id, name: s.name ?? 'Untitled', templateId: s.templateId ?? '',
  updatedAt: s.updatedAt ?? '', createdAt: s.createdAt ?? '',
  assets: s.assets?.length ?? 0,
  edits: ['text', 'move', 'size', 'pic']
    .reduce((n, k) => n + Object.keys(s.edits?.[k] ?? {}).length, 0),
});

/** Newest first, and a file that will not parse is skipped rather than taking
 *  the whole list down with it. */
export async function list(): Promise<Card[]> {
  await mkdir(DIR, { recursive: true });
  const names = (await readdir(DIR)).filter(n => n.endsWith('.json'));
  const cards = await Promise.all(names.map(async n => {
    try { return card(JSON.parse(await readFile(join(DIR, n), 'utf8'))); }
    catch { return null; }
  }));
  return cards.filter((c): c is Card => !!c && legal(c.id))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export const get = (id: string) =>
  readFile(file(id), 'utf8').then(JSON.parse).catch(() => null);

export async function put(id: string, sheet: unknown): Promise<void> {
  await mkdir(DIR, { recursive: true });
  await writeFile(file(id), JSON.stringify(sheet, null, 1));
}

export const remove = (id: string) => unlink(file(id)).then(() => true, () => false);
