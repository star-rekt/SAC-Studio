/** User-added media is separate from the immutable design-system library.
 * The original data URL also stays in any campaign that uses it, so deleting
 * a library entry never breaks an already saved design or its Figma export. */
import { randomUUID } from 'node:crypto';
import { readFile, rename, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { DATA } from './paths.ts';

const FILE = join(DATA, 'media-library.json');
const KINDS = new Set(['photo', 'product', 'brand', 'wordmark', 'social', 'mark', 'texture']);

export type UserMedia = {
  id: string; kind: string; name: string; file: string; vector: boolean;
  tags: string[]; userAdded: true; addedAt: string;
};

const cleanTags = (tags: unknown): string[] => Array.isArray(tags)
  ? [...new Set(tags.map(x => String(x).trim().toLowerCase()).filter(Boolean))].slice(0, 20)
  : [];

export async function list(): Promise<UserMedia[]> {
  try {
    const value = JSON.parse(await readFile(FILE, 'utf8'));
    return Array.isArray(value) ? value.filter(x => x?.userAdded === true) : [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
}

async function save(items: UserMedia[]) {
  await mkdir(dirname(FILE), { recursive: true });
  const pending = `${FILE}.${process.pid}.tmp`;
  await writeFile(pending, JSON.stringify(items));
  await rename(pending, FILE);
}

export async function add(input: unknown): Promise<UserMedia> {
  const value = input as Partial<UserMedia> | null;
  if (!value || typeof value.file !== 'string' ||
      !/^data:image\/(?:png|jpeg|webp|gif|svg\+xml);base64,/i.test(value.file))
    throw new Error('Upload an image file');
  const kind = KINDS.has(String(value.kind)) ? String(value.kind) : 'photo';
  const item: UserMedia = {
    id: `user-${randomUUID()}`, kind,
    name: String(value.name || 'Uploaded image').slice(0, 120),
    file: value.file, vector: value.file.startsWith('data:image/svg+xml;'),
    tags: cleanTags(value.tags), userAdded: true, addedAt: new Date().toISOString(),
  };
  const items = await list();
  await save([...items, item]);
  return item;
}

export async function retag(id: string, tags: unknown): Promise<UserMedia | null> {
  const items = await list();
  const at = items.findIndex(item => item.id === id);
  if (at < 0) return null;
  items[at] = { ...items[at], tags: cleanTags(tags) };
  await save(items);
  return items[at];
}

export async function remove(id: string): Promise<boolean> {
  const items = await list();
  const next = items.filter(item => item.id !== id);
  if (next.length === items.length) return false;
  await save(next);
  return true;
}
