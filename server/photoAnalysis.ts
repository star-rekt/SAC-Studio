/** Where each photograph's subject is, worked out once in the studio
 *  (src/model/analysePhoto.ts, on-device, no model calls) and kept here so
 *  no photo is ever analysed twice -- across assets, placements or restarts.
 *  Keyed by a sha256 of the image's src, so a built-in path and an upload's
 *  data URL share one table. */
import { readFile, rename, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { DATA } from './paths.ts';

const FILE = join(DATA, 'photo-analysis.json');

export async function all(): Promise<Record<string, unknown>> {
  try {
    const value = JSON.parse(await readFile(FILE, 'utf8'));
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {};
    throw error;
  }
}

export async function put(hash: string, analysis: unknown) {
  const table = await all();
  table[hash] = analysis;
  await mkdir(dirname(FILE), { recursive: true });
  const pending = `${FILE}.${process.pid}.tmp`;
  await writeFile(pending, JSON.stringify(table));
  await rename(pending, FILE);
}
