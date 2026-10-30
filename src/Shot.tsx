/** The view the judge photographs: one asset, at its own size, with no studio
 *  chrome around it.
 *
 *  It loads the session off disk rather than rebuilding from the bundled
 *  brief, which is what makes the verdict worth having -- the judge sees this
 *  campaign, with this designer's edits on it, and not a clean render of
 *  something nobody is looking at any more.
 *
 *  It renders through the same `One` the studio does, so the thing being
 *  judged is the thing being designed.
 */
import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { compose } from './model/compose';
import { loadSession } from './session/store';
import { resolveBrief, sendsOf } from './sheet/build';
import { templateById } from './templates/registry';
import { specById, outlookFor } from './templates/spec';
import { One } from './render/One';
import { Ctx, EMPTY } from './edit/store';
import { ZONE_LIST } from './model/compose';
import { placeOn, safeBox } from './model/safe';
import { toSvg } from './render/toSvg';
import { toLayers } from './render/toLayers';
import type { Sheet } from './sheet/types';
import { listUserMedia, type UserMedia } from './model/userMedia';

const NOOP = {
  mode: 'preview' as const, selected: null, selectedGroup: [], library: [],
  select: () => {}, toggleGroup: () => {}, addToGroup: () => {}, setGroup: () => {}, clearGroup: () => {},
  setText: () => {}, nudge: () => {}, resize: () => {},
  setPic: () => {}, setPaint: () => {}, reset: () => {}, resetAll: () => {},
  addLibrary: async () => { throw new Error('preview is read only'); },
  retagLibrary: async () => {}, removeLibrary: async () => {},
  addGraphic: () => '', removeGraphic: () => {},
  addCustomText: () => '', removeCustomText: () => {}, setCustomBackground: () => {},
};

const Say = ({ children }: { children: string }) =>
  <pre style={{ font: '14px monospace', padding: 24 }}>{children}</pre>;

/** The page says when it is worth photographing.
 *
 *  Waiting on fonts and images is not enough once the session is fetched over
 *  HTTP: a page still waiting for its campaign has neither, so it looks
 *  settled and the judge gets handed a screenshot of the word 'opening'. The
 *  flag is the only thing that actually knows. */
function flag(state: 'ready' | 'failed') {
  document.documentElement.dataset.shot = state;
}

export default function Shot({ id, session }: { id: string; session: string }) {
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [library, setLibrary] = useState<UserMedia[] | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    loadSession(session).then(setSheet,
      e => setErr(e instanceof Error ? e.message : String(e)));
    listUserMedia().then(setLibrary, () => setLibrary([]));
  }, [session]);

  const doc = useMemo(() => sheet ? compose(sheet.brief.text, sendsOf(sheet),
    resolveBrief(sheet.brief.text, sheet.brief.html, sheet.brief.ai)) : null, [sheet]);

  const asset = sheet?.assets.find(a => a.id === id);
  const template = sheet ? templateById(sheet.templateId) : null;
  const outlook = sheet ? specById(sheet.templateId) : null;
  const drawable = !!(sheet && doc && asset && template && outlook && library);

  // The screenshotter asks for this when it wants layers rather than pixels.
  // It lives on window because the page is the only place that knows what was
  // actually drawn, which is the same reason the photograph is taken here.
  useLayoutEffect(() => {
    const w = window as unknown as { __svg?: () => string; __layers?: () => unknown };
    const el = () => document.getElementById('root')?.firstElementChild as HTMLElement;
    w.__svg = () => {
      const b = el().getBoundingClientRect();
      return toSvg(el(), Math.ceil(b.width), Math.ceil(b.height));
    };
    w.__layers = () => toLayers(el());
  }, []);

  // After paint, not during it, or the shutter can beat the pixels.
  useLayoutEffect(() => {
    if (err) flag('failed');
    else if (drawable) requestAnimationFrame(() => flag('ready'));
    // Session opened, but it holds no such asset: settled, and not worth a shot.
    else if (sheet && library !== null) flag('failed');
  }, [err, drawable, sheet, library]);

  if (err) return <Say>{`could not open session ${session}: ${err}`}</Say>;
  if (!sheet || !doc) return <Say>opening…</Say>;
  if (!asset || !template || !outlook)
    return <Say>{`no asset ${id} in ${sheet.name}`}</Say>;

  // The clear band, published on the element the screenshotter already reads,
  // so a verdict on where the copy sits is checked against the hand-reviewed
  // band rather than estimated off the pixels.
  //   Only when the copy actually sits on the photograph. A collage hero puts
  //   its type on cream and its photographs in tiles; telling the judge there
  //   is a clear band across the top of that is describing a different asset.
  //   An email hero is drawn by Email.tsx rather than the composer, so no
  //   outlook describes it; it is always a full-bleed photograph with the
  //   ticket sitting on it, which is exactly the case this rule is for.
  const bleeds = asset.format === 'email-hero'
    || (!!outlook && outlookFor(outlook, asset.format).ground === 'photo-bleed');
  const zone = bleeds ? ZONE_LIST.find(z => z.id === asset.media.photo) : undefined;
  const band = safeBox(zone, asset.size[0], asset.size[1]);

  return (
    <Ctx.Provider value={{ ...NOOP, edits: sheet.edits ?? EMPTY, library: library ?? [] }}>
      <div style={{ width: asset.size[0], background: '#fff' }}
           data-band={band ? `${band.x},${band.y},${band.w},${band.h}` : ''}
           data-band-why={zone ? placeOn(zone).why : ''}>
        <One asset={asset} doc={doc} template={template} outlook={outlook} />
      </div>
    </Ctx.Provider>
  );
}
