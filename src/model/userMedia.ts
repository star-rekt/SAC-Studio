import type { Item, Kind } from './media';

export type UserMedia = Item & {
  userAdded: true;
  tags: string[];
  addedAt: string;
};

const read = async (response: Response) => {
  const json = await response.json();
  if (!response.ok) throw new Error(json.error || `Media request failed (${response.status})`);
  return json;
};

export const listUserMedia = async (): Promise<UserMedia[]> =>
  (await read(await fetch('/api/media'))).items;

export const addUserMedia = async (item: {
  name: string; kind: Kind; file: string; tags: string[];
}): Promise<UserMedia> =>
  (await read(await fetch('/api/media', { method: 'POST',
    headers: { 'content-type': 'application/json' }, body: JSON.stringify(item) }))).item;

export const retagUserMedia = async (id: string, tags: string[]): Promise<UserMedia> =>
  (await read(await fetch(`/api/media/${encodeURIComponent(id)}`, { method: 'PATCH',
    headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tags }) }))).item;

export const deleteUserMedia = async (id: string): Promise<boolean> =>
  (await read(await fetch(`/api/media/${encodeURIComponent(id)}`, { method: 'DELETE' }))).ok;

export const tagsFromFilename = (name: string): string[] =>
  [...new Set(name.replace(/\.[^.]+$/, '').toLowerCase().split(/[^a-z0-9]+/)
    .filter(part => part.length > 1))];
