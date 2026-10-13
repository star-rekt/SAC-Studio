/** Reading and writing campaigns, and never losing one.
 *
 *  Saving is not a button. Every change the designer makes is written to disk
 *  a moment later, because the thing being fixed here is work disappearing on
 *  a reload -- and a Save button only fixes that for people who remember to
 *  press it.
 */
import { useEffect, useRef, useState } from 'react';
import type { Sheet } from '../sheet/types';
import { migrateSheet } from '../sheet/build';

export type Card = {
  id: string; name: string; templateId: string;
  updatedAt: string; createdAt: string; assets: number; edits: number;
};

const json = async (r: Response) => {
  const j = await r.json().catch(() => ({ error: `${r.status} ${r.statusText}` }));
  if (!r.ok) throw new Error(j.error ?? `${r.status}`);
  return j;
};

/** Throws when the connector cannot be reached, and that matters more than it
 *  looks: swallowing it and returning [] makes 'the server is down' identical
 *  to 'you have no campaigns', and the caller answers the second by starting a
 *  new one. That silently abandons every campaign on disk, which is the exact
 *  failure sessions exist to prevent. */
export const listSessions = (): Promise<Card[]> =>
  fetch('/api/sessions').then(json).then(j => j.sessions as Card[]);

export const loadSession = (id: string): Promise<Sheet> =>
  fetch(`/api/sessions/${encodeURIComponent(id)}`).then(json).then(j => migrateSheet(j.sheet));

export const saveSession = (s: Sheet): Promise<void> =>
  fetch(`/api/sessions/${encodeURIComponent(s.id)}`,
    { method: 'PUT', headers: { 'content-type': 'application/json' },
      body: JSON.stringify(s) }).then(json).then(() => undefined);

export const deleteSession = (id: string): Promise<void> =>
  fetch(`/api/sessions/${encodeURIComponent(id)}`, { method: 'DELETE' })
    .then(json).then(() => undefined);

export type SaveState = { state: 'idle' | 'saving' | 'saved' | 'failed'; at?: string; error?: string };

/** Writes the sheet a beat after it stops changing.
 *
 *  The delay is what makes it usable: dragging a headline fires a change per
 *  mouse move, and a write per mouse move would have the disk doing more work
 *  than the renderer. It also skips the first render, so merely opening a
 *  campaign does not rewrite it. */
export function useAutosave(sheet: Sheet, on: boolean): SaveState {
  const [save, setSave] = useState<SaveState>({ state: 'idle' });
  const first = useRef(true);

  useEffect(() => {
    if (!on) return;
    if (first.current) { first.current = false; return; }
    const t = setTimeout(async () => {
      setSave({ state: 'saving' });
      try {
        await saveSession(sheet);
        setSave({ state: 'saved', at: new Date().toLocaleTimeString() });
      } catch (e) {
        setSave({ state: 'failed', error: e instanceof Error ? e.message : String(e) });
      }
    }, 800);
    return () => clearTimeout(t);
  }, [sheet, on]);

  return save;
}

export type ExportReport = {
  dir: string; zip?: string; files: number;
  failed: { id: string; why: string }[]; ms: number;
};

/** Render every asset and put them in a folder to drag into Figma. Slow --
 *  it is a browser per asset -- so the caller shows that it is working. */
export const exportForFigma = (session: string): Promise<ExportReport> =>
  fetch('/api/export', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ session, origin: location.origin }),
  }).then(json);

/** The plugin needs only this one self-contained file; the review folder is
 * optional and should not be created as a side effect of downloading it. */
export async function downloadFigmaFile(session: string, name: string): Promise<void> {
  const response = await fetch(`/api/figma/${encodeURIComponent(session)}`);
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw Error(error.error || `${response.status} ${response.statusText}`);
  }
  // A Vite page can hot-reload while its separate connector remains stale.
  // Older connectors returned a valid-looking file without all used media.
  if (response.headers.get('x-sac-media-complete') !== '1')
    throw Error('The studio connector is out of date. Restart SAC Studio, then download the Figma file again.');
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = `${name.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-|-$/g, '') || session}.figma.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
