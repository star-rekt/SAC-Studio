/** Talking to the connector. Vite proxies /ai to it, so there is no origin,
 *  no key and nothing to configure -- if the server is not running the calls
 *  fail and the panel says so. */
import type { AiParse, Verdict, Health, Fixes } from './types';

async function post<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(path, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({ error: `${r.status} ${r.statusText}` }));
  if (!r.ok) throw new Error(j.error ?? `${r.status}`);
  return j as T;
}

export const health = (): Promise<Health> =>
  fetch('/ai/health').then(r => r.json())
    .catch(() => ({ claude: null, chrome: null }));

export const readBriefWithAi = (text: string) =>
  post<{ parse: AiParse; ms: number }>('/ai/brief', { text });

/** Export one asset, and optionally have Claude look at it.
 *
 *  Both at once because they are one act: the PNG the judge opens is the
 *  export, so a verdict is never about a render nobody else can see. The
 *  shot is of the SESSION, not the template, so it carries the designer's
 *  own edits -- a verdict on the untouched sheet is a verdict on work nobody
 *  is looking at any more. */
export const review = (
  a: { id: string; format: string; label: string; size: [number, number] },
  session: string, look: boolean, deep = false,
) =>
  post<{ verdict?: Verdict; png: string; w: number; h: number; ms: number }>('/ai/judge', {
    url: `${location.origin}/?shot=${encodeURIComponent(a.id)}&s=${encodeURIComponent(session)}`,
    width: a.size[0], height: a.size[1],
    what: `${a.format.replace(/-/g, ' ')} (${a.label}), ${a.size[0]}x${a.size[1]}px`,
    name: a.id, session, look, deep,
  });

/** What to move, resize or retype to answer a review.
 *
 *  It shoots the asset again rather than reusing the PNG from the review: the
 *  designer may have changed something since, and a fix computed against a
 *  stale picture lands in the wrong place. */
export const propose = (
  a: { id: string; format: string; label: string; size: [number, number] },
  session: string, issues: string[],
) =>
  post<Fixes>('/ai/fix', {
    url: `${location.origin}/?shot=${encodeURIComponent(a.id)}&s=${encodeURIComponent(session)}`,
    width: a.size[0], height: a.size[1],
    what: `${a.format.replace(/-/g, ' ')} (${a.label}), ${a.size[0]}x${a.size[1]}px`,
    name: a.id, session, issues,
  });

/** Runs `n` at a time and reports each as it lands, so a 41-asset review shows
 *  its work instead of going quiet for eight minutes. */
export async function pool<T>(items: T[], n: number, each: (x: T) => Promise<void>) {
  const queue = [...items];
  await Promise.all(Array.from({ length: Math.min(n, queue.length) }, async () => {
    for (let x = queue.shift(); x !== undefined; x = queue.shift()) await each(x);
  }));
}
