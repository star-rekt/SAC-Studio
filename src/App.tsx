import { useMemo, useState, useCallback, useEffect } from 'react';
import { compose, BRAND } from './model/compose';
import { buildSheet, resolveBrief, sendsOf } from './sheet/build';
import { sheetHash, type Sheet } from './sheet/types';
import { TEMPLATES, templateById } from './templates/registry';
import { SPECS, specById, accentFor } from './templates/spec';
import { directionsFor, familyOf } from './templates/directions';
import { Direction } from './render/Email';
import { One } from './render/One';
import { BriefPanel, JudgePanel, AiHealth } from './ai/Panel';
import { applyOps } from './ai/apply';
import { Ctx, EMPTY, FRESH_PIC, sizeOf, paintOf, useEdits, type Edits, type Pic, type Paint } from './edit/store';
import { PicturePanel } from './edit/Picture';
import { Swatches, SizeRow, PositionRow, TextRow, GroupRow } from './edit/Controls';
import { Marquee } from './edit/Marquee';
import { MediaControls, LibraryPanel } from './edit/Media';
import { isMediaSlot } from './model/media';

/** Whether the selected layer is drawn by <Picture> (a photo that can be
 *  swapped and cropped), whatever its id is called -- a collage's
 *  `image-3`, a banner's `category/2/image`. A library mark or logo is
 *  `.pic.media`, and gets the media controls instead. */
const isPicture = (id: string) =>
  !!document.querySelector(`[data-id="${CSS.escape(id)}"]`)?.matches('.pic:not(.media)');
import type { Item } from './model/media';
import { listUserMedia, addUserMedia, retagUserMedia, deleteUserMedia,
         type UserMedia } from './model/userMedia';
import { analysisFor } from './model/analysePhoto';
import { outlookFor } from './templates/spec';
import { fontCheck, type FontReport } from './fonts';
import { listSessions, loadSession, saveSession, useAutosave, exportForFigma, downloadFigmaFile,
         type ExportReport } from './session/store';
import { readBriefWithAi } from './ai/client';
import { CopyPanel } from './edit/CopyFit';
import { OpenDialog, NewDialog, FigmaTokenDialog, TOKEN_SKIPPED } from './session/Dialogs';
import TYPE from './data/typography.json';
import BRIEF_TEXT from './data/brief.txt?raw';
import { EMAIL_VARIANTS, SITE_VARIANTS, emailVariant } from './templates/variants';

/** The campaign palette, from the design system's own tokens.
 *
 *  Free colour on a brand asset is a way to get off brand quickly, so the
 *  choices are the colours the boards already use, plus the two neutrals every
 *  lockup needs. 'None' puts it back to whatever the template said. */
/** Formats whose order in the tab bar follows how a campaign is actually
 *  reviewed: the things it is judged on first, the plumbing last. */
const ORDER = ['hero-desktop', 'hero-mobile', 'email-hero', 'email-body',
  'paid-social-1x1', 'paid-social-4x5', 'paid-social-9x16', 'cplp-tile',
  'gt', 'cb', 'text-banner', 'text-banner-mobile', 'compact-mobile',
  'plp-badging-mock', 'pdp-badging-mock', 'logo-strip', 'text-link'];
const rank = (f: string) => { const i = ORDER.indexOf(f); return i < 0 ? 99 : i; };

export default function App() {
  const [templateId, setTemplateId] = useState(TEMPLATES[0].id);
  const [sheet, setSheet] = useState<Sheet>(() => buildSheet(BRIEF_TEXT, TEMPLATES[0].id));
  // The sends come off the sheet, not from reading the brief a second time.
  const doc = useMemo(() => compose(sheet.brief.text, sendsOf(sheet),
    resolveBrief(sheet.brief.text, sheet.brief.html, sheet.brief.ai)),
    [sheet.brief.text, sheet.brief.html, sheet.brief.ai, sheet.assets]);
  const template = templateById(sheet.templateId)!;
  const outlook = specById(sheet.templateId)!;

  const [mode, setMode] = useState<'preview' | 'edit'>('edit');
  const [selected, select] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string[]>([]);
  const [boxSelect, setBoxSelect] = useState(false);
  const [panel, setPanel] = useState(false);
  const [zoom, setZoom] = useState(0.34);
  const [tab, setTab] = useState('email-hero');
  const [side, setSide] = useState<'design' | 'library' | 'claude' | 'copy'>('design');
  const [judging, setJudging] = useState<string | null>(null);
  const [booting, setBooting] = useState(true);
  /** Whether this campaign is actually on disk. Until it is, the badge must
   *  not say 'saved' -- which is what it said when the connector was down. */
  const [onDisk, setOnDisk] = useState(false);
  const [dialog, setDialog] = useState<'open' | 'new' | 'token' | null>(null);
  const [library, setLibrary] = useState<UserMedia[]>([]);
  const [customName, setCustomName] = useState('');

  // The optional Figma token: asked for once at start when none is saved and
  // the designer hasn't skipped it; the Figma gallery can ask again.
  useEffect(() => {
    let skipped = false;
    try { skipped = localStorage.getItem(TOKEN_SKIPPED) === '1'; } catch { /* private window */ }
    if (!skipped) void fetch('/api/figma-token').then(r => r.ok ? r.json() : null)
      .then(s => { if (s && !s.saved) setDialog(d => d ?? 'token'); }, () => {});
    const ask = () => setDialog('token');
    window.addEventListener('sac:figma-token', ask);
    return () => window.removeEventListener('sac:figma-token', ask);
  }, []);

  useEffect(() => {
    let live = true;
    listUserMedia().then(items => { if (live) setLibrary(items); }, () => {});
    return () => { live = false; };
  }, []);

  // Opening the studio opens the campaign you were last in. The first time
  // there is nothing to open, so the bundled brief becomes the first campaign
  // rather than being a thing you work in and then lose.
  useEffect(() => {
    let live = true;
    (async () => {
      // A connector that cannot be reached must not look like an empty disk:
      // answering that by starting a new campaign would abandon every one
      // already saved.
      const cards = await listSessions().catch(() => null);
      if (!live) return;
      if (cards === null) {
        setOnDisk(false);
      } else if (cards.length) {
        const s = await loadSession(cards[0].id).catch(() => null);
        if (live && s) { setSheet(s); setTemplateId(s.templateId); setOnDisk(true); }
      } else {
        const saved = await saveSession(sheet).then(() => true, () => false);
        if (live) setOnDisk(saved);
      }
      if (live) setBooting(false);
    })();
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = useAutosave(sheet, !booting);

  const edits = sheet.edits;
  const setEdits = useCallback((f: (e: Edits) => Edits) =>
    setSheet(s => ({ ...s, edits: f(s.edits), updatedAt: new Date().toISOString() })), []);

  const [fonts, setFonts] = useState<FontReport | null>(null);
  useEffect(() => {
    const want = (TYPE as { styles: { family: string; style: string }[] }).styles
      .map(st => ({ family: st.family,
                    weight: /ExtraBold|Black/.test(st.style) ? 800
                          : /Bold|SemiBold/.test(st.style) ? 700 : 400 }));
    const ask = () => setFonts(fontCheck(want));
    document.fonts?.ready.then(ask) ?? ask();
  }, []);

  /** Build this campaign's assets again from the brief it already holds.
   *
   *  A session stores the sheet, so a campaign built last week keeps last
   *  week's decisions -- including ones since found to be wrong. Edits and the
   *  campaign's identity survive, because the point is to re-derive what was
   *  derived, not to start again. */
  /** `undefined` keeps the current plan, `null` drops it and goes back to
   *  whatever the brief asked for. */
  const rebuild = (plan?: Sheet['plan'] | null) => setSheet(s => {
    const next = buildSheet(s.brief.text, s.templateId, s.name, s.brief.html, s.brief.ai,
                            plan === undefined ? s.plan : plan ?? undefined);
    const old = new Map(s.assets.map(a => [a.id, a.variant]));
    return { ...next, assets: next.assets.map(a => ({ ...a, variant: old.get(a.id) ?? a.variant })),
      edits: s.edits, direction: s.direction, formatDirections: s.formatDirections,
      id: s.id, createdAt: s.createdAt };
  });

  /** What is being built, so the deliverables list has something to tick. */
  const built = useMemo(() => new Set(sheet.assets.map(a => a.format)), [sheet.assets]);
  const countOf = (axis: 'send' | 'concept') =>
    new Set(sheet.assets.map(a => a.scope[axis]).filter(Boolean)).size;

  const replan = (patch: Partial<NonNullable<Sheet['plan']>>) =>
    rebuild({ formats: [...built], sends: countOf('send') || undefined,
              concepts: countOf('concept') || undefined, ...sheet.plan, ...patch });

  /** Read the brief again. A campaign holds the reading it was built with, so
   *  one made before the parser knew how to pick deliverables out of a brief
   *  keeps building everything. Re-reading is a few seconds and it is the only
   *  way that reading changes. */
  const [reReading, setReReading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<ExportReport | null>(null);
  const [exportNotice, setExportNotice] = useState('');
  const [exportError, setExportError] = useState(false);
  const reRead = async () => {
    setReReading(true);
    try {
      const { parse } = await readBriefWithAi(sheet.brief.text);
      setSheet(s => ({
        ...buildSheet(s.brief.text, s.templateId, s.name, s.brief.html, parse, s.plan),
        edits: s.edits, direction: s.direction, formatDirections: s.formatDirections,
        id: s.id, createdAt: s.createdAt,
      }));
    } catch { /* the panel's own health line already says if it is unreachable */ }
    setReReading(false);
  };

  const toggleFormat = (f: string) => {
    const next = new Set(built);
    next.has(f) ? next.delete(f) : next.add(f);
    replan({ formats: [...next] });
  };

  const setFormatCount = (format: string, count: number) => {
    const n = Math.max(1, Math.min(12, Math.round(count) || 1));
    const next = new Set(built); next.add(format);
    replan({ formats: [...next], quantities: { ...sheet.plan?.quantities, [format]: n } });
  };
  const addCustomFormat = () => {
    const format = customName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    if (!/^[a-z][a-z0-9-]*$/.test(format)) return;
    const next = new Set(built); next.add(format);
    replan({ formats: [...next] }); setCustomName(''); setTab(format);
  };
  const setCustomSize = (id: string, axis: 0 | 1, value: number) => {
    const n = Math.max(64, Math.min(8000, Math.round(value) || 64));
    setSheet(s => {
      const asset = s.assets.find(a => a.id === id);
      if (!asset?.custom) return s;
      const size: [number, number] = [...asset.size]; size[axis] = n;
      return { ...s, plan: { ...s.plan,
        customSizes: { ...s.plan?.customSizes, [id]: size } },
        assets: s.assets.map(a => a.id === id ? { ...a, size } : a),
        updatedAt: new Date().toISOString() };
    });
  };

  const pickTemplate = (id: string) => {
    setTemplateId(id);
    select(null);
    setSide('design');
    // The template decides the look; the brief decides the content and the
    // count, so a rebuild keeps the edits rather than discarding the work.
    // The reading is kept, so changing template does not pay for it again.
    setSheet(s => ({ ...buildSheet(s.brief.text, id, s.name, s.brief.html, s.brief.ai, s.plan),
                     edits: s.edits, direction: s.direction,
                     formatDirections: s.formatDirections,
                     id: s.id, createdAt: s.createdAt }));
  };

  const chooseEmailDesign = (send: string, variant: string) => setSheet(s => ({
    ...s, updatedAt: new Date().toISOString(),
    assets: s.assets.map(a => a.scope.send === send &&
      (a.format === 'email-body' || a.format === 'email-hero')
        ? { ...a, variant } : a),
  }));
  const chooseAssetDesign = (id: string, variant: string) => setSheet(s => ({
    ...s, updatedAt: new Date().toISOString(),
    assets: s.assets.map(a => a.id === id ? { ...a, variant } : a),
  }));

  const api = {
    edits, mode, selected, selectedGroup, library,
    select: useCallback((id: string | null) => {
      select(id);
      // A plain select starts a fresh single-item edit, not an addition to
      // a block being built up -- leaving the group in place here meant
      // clicking away from a 4-layer alignment group to check one more
      // mark, with no modifier held, silently added it as a 5th member.
      setSelectedGroup([]);
      if (id) {
        setPanel(true);
        setSide('design');
      }
    }, []),
    toggleGroup: useCallback((id: string) => {
      setSelectedGroup(g => g.includes(id) ? g.filter(x => x !== id) : [...g, id]);
      setPanel(true);
      setSide('design');
    }, []),
    addToGroup: useCallback((ids: string[]) => {
      if (!ids.length) return;
      setSelectedGroup(g => [...g, ...ids.filter(id => !g.includes(id))]);
      setPanel(true);
      setSide('design');
    }, []),
    setGroup: useCallback((ids: string[]) => {
      setSelectedGroup(ids);
      if (ids.length) { setPanel(true); setSide('design'); }
    }, []),
    clearGroup: useCallback(() => setSelectedGroup([]), []),
    setText: useCallback((id: string, v: string) =>
      setEdits(e => {
        // The sentinel means 'this is back to what the template says', which
        // is not the same as an empty string and must not be stored as one.
        if (v !== '\u0000CLEAR') return { ...e, text: { ...e.text, [id]: v } };
        if (!(id in e.text)) return e;
        const t = { ...e.text }; delete t[id];
        return { ...e, text: t };
      }), [setEdits]),
    nudge: useCallback((id: string, dx: number, dy: number) =>
      setEdits(e => ({ ...e, move: { ...e.move, [id]: { dx, dy } } })), [setEdits]),
    resize: useCallback((id: string, scale: number) =>
      setEdits(e => ({ ...e, size: { ...e.size, [id]: scale } })), [setEdits]),
    setPic: useCallback((id: string, p: Partial<Pic>) =>
      setEdits(e => ({ ...e, pic: { ...e.pic, [id]: { ...(e.pic[id] ?? FRESH_PIC), ...p } } })), [setEdits]),
    setPaint: useCallback((id: string, p: Paint) =>
      setEdits(e => ({ ...e, paint: { ...e.paint, [id]: { ...(e.paint?.[id] ?? {}), ...p } } })), [setEdits]),
    addLibrary: async (item: Parameters<typeof addUserMedia>[0]) => {
      const saved = await addUserMedia(item);
      setLibrary(items => [...items, saved]);
      // Analysed now, in the background, so placing it later costs nothing.
      if (saved.kind === 'photo') void analysisFor(saved.file);
      return saved;
    },
    retagLibrary: async (id: string, tags: string[]) => {
      const saved = await retagUserMedia(id, tags);
      setLibrary(items => items.map(item => item.id === id ? saved : item));
    },
    removeLibrary: async (id: string) => {
      if (await deleteUserMedia(id))
        setLibrary(items => items.filter(item => item.id !== id));
    },
    addGraphic: (assetId: string, item: Item, size: [number, number], custom = false) => {
      const id = crypto.randomUUID();
      const fill = custom && item.kind !== 'mark' && item.kind !== 'brand'
        && item.kind !== 'wordmark';
      const width = fill ? size[0] : Math.min(180, Math.round(size[0] * .2));
      const layer = { id, src: item.file, name: item.name,
        left: fill ? 0 : Math.round(size[0] * .08),
        top: fill ? 0 : Math.round(size[1] * .08),
        width, height: fill ? size[1] : width };
      setEdits(e => ({ ...e, graphics: { ...e.graphics,
        [assetId]: [...(e.graphics?.[assetId] ?? []), layer] } }));
      const slotId = `${assetId}/graphic/${id}/mark`;
      select(slotId); setPanel(true); setSide('design');
      return slotId;
    },
    removeGraphic: (assetId: string, layerId: string) => {
      const slotId = `${assetId}/graphic/${layerId}/mark`;
      setEdits(e => {
        const graphics = { ...e.graphics,
          [assetId]: (e.graphics?.[assetId] ?? []).filter(layer => layer.id !== layerId) };
        const move = { ...e.move }, size = { ...e.size }, pic = { ...e.pic },
              paint = { ...e.paint };
        delete move[`${slotId}/group`]; delete size[slotId];
        delete pic[slotId]; delete paint[slotId];
        return { ...e, graphics, move, size, pic, paint };
      });
      select(null);
    },
    addCustomText: (assetId: string, size: [number, number]) => {
      const id = crypto.randomUUID();
      const layer = { id, text: 'Type here', left: Math.round(size[0] * .08),
        top: Math.round(size[1] * .12), width: Math.round(size[0] * .8), height: 150 };
      setEdits(e => ({ ...e, customText: { ...e.customText,
        [assetId]: [...(e.customText?.[assetId] ?? []), layer] } }));
      const slot = `${assetId}/custom-text/${id}`;
      select(slot); setPanel(true); setSide('design');
      return slot;
    },
    removeCustomText: (assetId: string, layerId: string) => {
      const slot = `${assetId}/custom-text/${layerId}`;
      setEdits(e => {
        const customText = { ...e.customText,
          [assetId]: (e.customText?.[assetId] ?? []).filter(layer => layer.id !== layerId) };
        const text = { ...e.text }, move = { ...e.move }, size = { ...e.size },
              paint = { ...e.paint };
        delete text[slot]; delete move[slot]; delete size[slot]; delete paint[slot];
        return { ...e, customText, text, move, size, paint };
      });
      select(null);
    },
    setCustomBackground: (assetId: string, colour: string) => {
      if (!/^#[0-9a-fA-F]{6}$/.test(colour)) return;
      setEdits(e => ({ ...e, customBackground: { ...e.customBackground,
        [assetId]: colour } }));
    },
    reset: useCallback((id: string) => setEdits(e => {
      const t = { ...e.text }, m = { ...e.move }, p = { ...e.pic }, z = { ...e.size },
            c = { ...(e.paint ?? {}) };
      delete t[id]; delete m[id]; delete p[id]; delete z[id]; delete c[id];
      return { ...e, text: t, move: m, pic: p, size: z, paint: c };
    }), [setEdits]),
    resetAll: useCallback(() => setEdits(() => EMPTY), [setEdits]),
  };

  // A fix is a patch to the same edits a person makes by hand, so it saves,
  // renders and resets like any other -- and the next review photographs it.
  const applyFix = useCallback((ops: Parameters<typeof applyOps>[1]) =>
    setEdits(e => applyOps(e, ops)), [setEdits]);

  const count = Object.keys(edits.text).length + Object.keys(edits.move).length
              + Object.keys(edits.pic).length + Object.keys(edits.size).length
              + Object.keys(edits.paint ?? {}).length
              + Object.values(edits.graphics ?? {}).reduce((n, layers) => n + layers.length, 0)
              + Object.values(edits.customText ?? {}).reduce((n, layers) => n + layers.length, 0)
              + Object.keys(edits.customBackground ?? {}).length;

  // Only the template(s) that match this brief's own campaign type are
  // offered here -- a flash-sale brief does not get switched onto a bump
  // template by hand once the brief itself has said what it is. A guessed
  // type (nothing in the brief actually said so) only suggests a template;
  // every exposed template stays pickable.
  const exposedSpecs = SPECS.filter(s => s.exposed !== false);
  const templateMatches = doc.brief.typeConfident
    ? exposedSpecs.filter(s => s.type === doc.brief.type) : exposedSpecs;
  const templateOptions = templateMatches.length ? templateMatches : exposedSpecs;
  const locked = doc.brief.typeConfident && templateMatches.length === 1;

  const formats = useMemo(() => {
    const seen = new Map<string, number>();
    for (const a of sheet.assets) seen.set(a.format, (seen.get(a.format) ?? 0) + 1);
    return [...seen.entries()].sort((a, b) => rank(a[0]) - rank(b[0]));
  }, [sheet]);

  const shown = sheet.assets.filter(a => a.format === tab);
  const judged = shown.find(a => a.id === judging) ?? shown[0];
  const selectedGraphic = selected?.match(/^(.*)\/graphic\/([^/]+)\/mark$/);
  const selectedCustomText = selected?.match(/^(.*)\/custom-text\/([^/]+)$/);
  useEffect(() => { if (!formats.some(([f]) => f === tab) && formats.length) setTab(formats[0][0]); },
    [formats, tab]);

  return (
    <Ctx.Provider value={api}>
      <header className={"bar" + (panel ? " with-panel" : "")}>
        <strong>SAC Studio</strong>
        <select value={templateId} onChange={e => pickTemplate(e.target.value)}
                disabled={locked}
                title={locked
                  ? `Locked to this template — the brief reads as ${doc.brief.type}`
                  : 'The template decides the look; the brief decides the content'}>
          {templateOptions.map(t => (
            <option key={t.id} value={t.id}>
              {t.name} — {templateById(t.id)?.formats.length ?? 0} formats
            </option>
          ))}
        </select>
        <input className="cname" value={sheet.name} title="What this campaign is called"
               onChange={e => setSheet(s => ({ ...s, name: e.target.value,
                                               updatedAt: new Date().toISOString() }))} />
        <span className="muted">{sheet.assets.length} assets · #{sheetHash(sheet)}</span>
        <button onClick={() => setDialog('new')}>New</button>
        <button onClick={() => setDialog('open')}>Open</button>
        <span className={'save ' + (save.state === 'idle' && !onDisk ? 'failed' : save.state)}
              title={save.error ?? ''}>
          {booting ? 'opening…'
           : save.state === 'saving' ? 'saving…'
           : save.state === 'failed' ? 'not saved — is the connector running?'
           : save.state === 'saved' ? `saved ${save.at}`
           : onDisk ? 'saved'
           : 'not saved — is the connector running?'}
        </span>
        <div className="seg">
          <button className={mode === 'edit' ? 'on' : ''} onClick={() => setMode('edit')}>Edit</button>
          <button className={mode === 'preview' ? 'on' : ''} onClick={() => setMode('preview')}>Preview</button>
        </div>
        <label className="zoom">Zoom
          <input type="range" min={0.1} max={1} step={0.01} value={zoom}
                 onChange={e => setZoom(Number(e.target.value))} />
          {Math.round(zoom * 100)}%
        </label>
        {fonts && !fonts.ok && (
          <span className={'fontwarn' + (fonts.kitLoaded ? '' : ' bad')}
                title={fonts.kitLoaded
                  ? fonts.missing.map(m => `${m.family} ${m.weight} → ${m.usedInstead}`).join('\n')
                  : 'use.typekit.net did not load — check the network'}>
            {fonts.kitLoaded
              ? `${fonts.missing.length} weight(s) missing from the kit`
              : 'brand fonts did not load'}
          </span>
        )}
        <span className="muted">{count} edit(s)</span>
        <button onClick={api.resetAll} disabled={!count}>Reset all</button>
        <button className={boxSelect ? 'on' : ''}
          title="Drag a rectangle on the canvas to select every run or mark it touches"
          onClick={() => setBoxSelect(v => !v)}>
          {boxSelect ? 'Box select: on' : 'Box select'}
        </button>
        <button className={panel ? 'on' : ''} onClick={() => setPanel(v => !v)}>
          {panel ? 'Close editor' : 'Open editor'}
        </button>
      </header>

      <nav className={"tabs" + (panel ? " with-panel" : "")}>
        {formats.map(([f, n]) => (
          <button key={f} className={f === tab ? 'on' : ''} onClick={() => {
            setTab(f); select(null); setSide('design');
          }}>
            {f}<span>{n}</span>
          </button>
        ))}
      </nav>

      <main className={panel ? 'with-panel' : ''}>
        <div className="board" style={{ ['--z' as string]: zoom }}>
          {shown.map(a => {
            const sendIndex = a.scope.send
              ? doc.sends.findIndex(s => s.id === a.scope.send) : -1;
            return (
              <section key={a.id} className="col">
                <h3>{a.label}<small>{a.format} · {a.size[0]}×{
                  a.format === 'email-hero' && sendIndex >= 0
                    ? (v => v?.heroHeight ?? v?.height)(emailVariant(sheet.templateId, a.variant, sendIndex)) ?? a.size[1]
                    : a.size[1]}</small></h3>
                {a.scope.send && (a.format === 'email-hero' || a.format === 'email-body') &&
                  (EMAIL_VARIANTS[sheet.templateId]?.length ?? 0) > 1 &&
                  <label className="variant-choice">Design
                    <select value={emailVariant(sheet.templateId, a.variant, sendIndex)?.id}
                            onChange={e => chooseEmailDesign(a.scope.send!, e.target.value)}>
                      {EMAIL_VARIANTS[sheet.templateId].map(v =>
                        <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                  </label>}
                {(SITE_VARIANTS[sheet.templateId]?.[a.format]?.length ?? 0) > 1 &&
                  <label className="variant-choice">Design
                    <select value={a.variant === 'base'
                      ? /end/i.test(a.scope.phase ?? '') ? 'ends-today' : 'launch'
                      : a.variant}
                      onChange={e => chooseAssetDesign(a.id, e.target.value)}>
                      {SITE_VARIANTS[sheet.templateId][a.format].map(v =>
                        <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                  </label>}
                {mode === 'edit' && <p className="why">{a.because}</p>}
                {sendIndex >= 0 && a.format === 'email-hero' && <Direction doc={doc} i={sendIndex} />}
                <div className="scaler">
                  <One asset={a} doc={doc} template={template} outlook={outlook}
                       direction={sheet.direction} formatDirections={sheet.formatDirections} />
                  <Marquee active={boxSelect && mode === 'edit'} />
                </div>
              </section>
            );
          })}
        </div>
      </main>

      {dialog === 'open' && (
        <OpenDialog current={sheet.id} onClose={() => setDialog(null)}
          onPick={id => loadSession(id).then(s => {
            setSheet(s); setTemplateId(s.templateId); setJudging(null); setOnDisk(true);
          })} />
      )}
      {dialog === 'token' && <FigmaTokenDialog onClose={() => setDialog(null)} />}
      {dialog === 'new' && (
        <NewDialog onClose={() => setDialog(null)}
          onCreate={(brief, html, tid, name, ai) => {
            const fresh = buildSheet(brief, tid, name, html, ai);
            setSheet(fresh); setTemplateId(tid); setJudging(null);
            // A new campaign opens on Copy fit: what fits where, before any design work.
            setPanel(true); setSide('copy');
            saveSession(fresh).then(() => setOnDisk(true), () => setOnDisk(false));
          }} />
      )}

      {panel && (
      <aside className="panel">
        <button className="shut" onClick={() => setPanel(false)} aria-label="Close">&times;</button>
        <div className="aitab">
          <button className={side === 'design' ? 'on' : ''} onClick={() => setSide('design')}>Design</button>
          <button className={side === 'library' ? 'on' : ''} onClick={() => {
            setSide('library');
            if (shown.some(asset => asset.custom)) { select(null); return; }
            if (!selected || !isMediaSlot(selected)) {
              const id = document.querySelector('.board .pic[data-id]')?.getAttribute('data-id');
              if (id) api.select(id);
            }
          }}>Library</button>
          <button className={side === 'claude' ? 'on' : ''} onClick={() => setSide('claude')}>Claude</button>
          <button className={side === 'copy' ? 'on' : ''} onClick={() => setSide('copy')}>Copy</button>
        </div>

        {side === 'copy' ? (
          <CopyPanel assets={shown} tab={tab}
            render={a => <One asset={a} doc={doc} template={template} outlook={outlook}
              direction={sheet.direction} formatDirections={sheet.formatDirections} />}
            onJump={(a, field) => {
              // Show the field on the canvas without leaving this panel.
              setTab(a.format); select(field);
              requestAnimationFrame(() => document.querySelector(`.board [data-id="${CSS.escape(field)}"]`)
                ?.scrollIntoView({ block: 'center', behavior: 'smooth' }));
            }} />
        ) : side === 'library' ? (
          <LibraryPanel selected={selected}
            assets={shown.map(asset => ({ id: asset.id, label: asset.label,
              size: asset.size, custom: asset.custom }))} />
        ) : side === 'claude' ? (
          <>
            <AiHealth />
            <h4>The brief</h4>
            <BriefPanel text={sheet.brief.text} />
            <h4>Export and review</h4>
            <JudgePanel current={judged} tab={shown} all={sheet.assets}
                        session={sheet.id} pickCurrent={setJudging} apply={applyFix} />
          </>
        ) : (
          <>
            <GroupRow />
            {/* Stacked, not instead of. Selecting a run used to replace the
                whole Design tab with the run's own controls, and nothing ever
                deselected -- so after fixing a line the design directions and
                the deliverables were gone until the page was reloaded. */}
            {selected && (
            <section className="picked">
            <h4>Selected</h4>
            <code>{selected}</code>
            {selected.includes('/pic') || selected.includes('/el/') || selected.endsWith('/photo') || selected.endsWith('/ground')
              || isPicture(selected)
              ? <PicturePanel id={selected} />
              : selected.endsWith('/fill')
              ? <>
                  <p className="muted">A background shape. Click its text to edit that instead. Hold <kbd>Alt</kbd> and drag it to move it.</p>
                  <h4>Colour</h4>
                  <Swatches id={selected} type={false} />
                  <h4>Size</h4>
                  <SizeRow id={selected} />
                  <h4>Position</h4>
                  <PositionRow id={selected} />
                </>
              : isMediaSlot(selected)
              ? <MediaControls id={selected} />
              : <>
                  <p className="muted">Click and type to edit. Hold <kbd>Alt</kbd> and drag to move it.</p>
                  <TextRow id={selected} />
                  <h4>Colour</h4>
                  <Swatches id={selected} />
                  <h4>Size</h4>
                  <SizeRow id={selected} />
                  <h4>Position within component</h4>
                  <PositionRow id={selected} />
                </>}
            <button onClick={() => api.reset(selected)}>Reset this</button>
            {selectedGraphic && <button onClick={() =>
              api.removeGraphic(selectedGraphic[1], selectedGraphic[2])}>
              Remove graphic from this asset
            </button>}
            {selectedCustomText && <button onClick={() =>
              api.removeCustomText(selectedCustomText[1], selectedCustomText[2])}>
              Remove text layer
            </button>}
            <button onClick={() => api.select(null)}>Done with this one</button>
            </section>
            )}
            {shown.filter(asset => asset.custom).map(asset => <section key={asset.id}>
              <h4>Custom board — {asset.label}</h4>
              <p className="muted">This type was not on the selected design board, so it carries
                the brief's own copy as a starting text block rather than a design. Set its
                canvas size, then add layers from the library or your own.</p>
              <label>Width (px)
                <input type="number" min={64} max={8000} value={asset.size[0]}
                  onChange={e => setCustomSize(asset.id, 0, Number(e.target.value))} />
              </label>
              <label>Height (px)
                <input type="number" min={64} max={8000} value={asset.size[1]}
                  onChange={e => setCustomSize(asset.id, 1, Number(e.target.value))} />
              </label>
              <label>Background colour
                <input type="color" value={edits.customBackground?.[asset.id] ?? '#ffffff'}
                  onChange={e => api.setCustomBackground(asset.id, e.target.value)} />
              </label>
              <button onClick={() => api.addCustomText(asset.id, asset.size)}>Add text layer</button>
              <button onClick={() => { select(null); setSide('library'); }}>
                Add image or graphic from library
              </button>
              <p className="muted">Drag an image from the library, or drop a file on the board.
                Text layers can be typed, recoloured, resized and moved with Alt-drag.</p>
            </section>)}
            <h4>{outlook.name}</h4>
            <p className="muted">{outlook.why}</p>
            <h4>Outlook for this tab</h4>
            <ul>
              {Object.entries(outlookFor(outlook, tab)).map(([k, v]) => (
                <li key={k}><b>{k}</b> {String(v)}</li>
              ))}
            </ul>
            <h4>What was read</h4>
            <button onClick={() => rebuild()} title="Derive the assets again from this campaign's own brief, keeping your edits">
              Rebuild from the brief
            </button>
            <button onClick={reRead} disabled={reReading}
                    title="Have Claude read this brief again, then rebuild">
              {reReading ? 'Claude is reading…' : 'Read the brief again'}
            </button>
            <ul className="read">
              <li>{sheet.brief.ai
                ? 'read by Claude, checked against the parser'
                : 'read by the pattern parser only'}</li>
              {doc.brief.name && <li><b>Sale</b> {doc.brief.name}</li>}
              {doc.brief.offer && <li><b>Offer</b> {doc.brief.offer}</li>}
              {doc.brief.dates && <li><b>Dates</b> {doc.brief.dates}</li>}
              {doc.brief.code && <li><b>Code</b> {doc.brief.code}</li>}
              {!!doc.brief.brands?.length && <li><b>Brands</b> {doc.brief.brands.join(', ')}</li>}
              {doc.brief.creativeDirection && <li><b>Creative</b> {doc.brief.creativeDirection}</li>}
              {([
                ['email sends', new Set(sheet.assets.filter(a => a.scope.send)
                  .map(a => a.scope.send)).size],
                ['category tiles', new Set(sheet.assets.filter(a => a.scope.category)
                  .map(a => a.scope.category)).size],
                ['social concepts', new Set(sheet.assets.filter(a => a.scope.concept)
                  .map(a => a.scope.concept)).size],
                ['phases', new Set(sheet.assets.filter(a => a.scope.phase)
                  .map(a => a.scope.phase)).size],
              ] as [string, number][]).map(([k, n]) => (
                <li key={k} className={n ? '' : 'none'}>
                  {n || 'no'} {k}{n === 0 ? ' named in the brief' : ''}
                </li>
              ))}
            </ul>
            {shown.length > 0 && (
              <>
                <h4>Design direction — {tab}</h4>
                <p className="muted">Changes this asset type's colour and shape.
                  The published Figma treatment remains the default.</p>
                <ul className="dirs">
                  {directionsFor(accentFor(outlook, tab)).map(d => (
                    <li key={d.id} className={(sheet.formatDirections?.[tab]
                      ?? (familyOf(tab) ? sheet.direction?.[familyOf(tab)!] : undefined)
                      ?? 'a') === d.id ? 'on' : ''}>
                      <button onClick={() => setSheet(x => ({ ...x,
                        formatDirections: { ...x.formatDirections, [tab]: d.id },
                        updatedAt: new Date().toISOString() }))}>
                        <i style={{ background: d.accent,
                                    borderRadius: d.radius ? 6 : 0,
                                    transform: d.tilt ? `rotate(${d.tilt}deg)` : undefined }} />
                        <b>{d.name}</b>
                        <span>{d.why}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <h4>Deliverables</h4>
            <p className="muted">Ticked is what the brief asked for. Add what it
              did not, or drop what you do not need.</p>
            <ul className="deliver">
              {template.formats.map(f => (
                <li key={f.format}>
                  <label>
                    <input type="checkbox" checked={built.has(f.format)}
                           onChange={() => toggleFormat(f.format)} />
                    <span>{f.format}</span>
                    {built.has(f.format) && !/^email-|^paid-social-|^cplp-tile$/.test(f.format) ? (
                      <input type="number" min={1} max={12}
                             value={sheet.assets.filter(a => a.format === f.format).length || 1}
                             title="Number of this deliverable"
                             onClick={e => e.stopPropagation()}
                             onChange={e => setFormatCount(f.format, Number(e.target.value))} />
                    ) : <b>{sheet.assets.filter(a => a.format === f.format).length || ''}</b>}
                  </label>
                </li>
              ))}
            </ul>
            <label>Additional custom asset type
              <input value={customName} placeholder="e.g. homepage-card-4x3"
                onChange={e => setCustomName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addCustomFormat(); }} />
            </label>
            <button onClick={addCustomFormat}>Add custom board</button>
            <div className="counts">
              <label>
                <span>Emails</span>
                <input type="number" min={1} max={12} value={countOf('send') || 1}
                       onChange={e => replan({ sends: Number(e.target.value) })} />
              </label>
              <label>
                <span>Social concepts</span>
                <input type="number" min={1} max={6} value={countOf('concept') || 1}
                       onChange={e => replan({ concepts: Number(e.target.value) })} />
              </label>
            </div>
            {sheet.plan && (
              <button onClick={() => rebuild(null)}>Back to what the brief asked for</button>
            )}

            <h4>Take it to Figma</h4>
            <p className="muted">{sheet.assets.length} selected assets → {sheet.assets.length} Figma frames.
              The plugin file contains only those frames and their used media.</p>
            <button onClick={async () => {
              setSending(true); setSent(null); setExportNotice(''); setExportError(false);
              try {
                await saveSession(sheet);
                await downloadFigmaFile(sheet.id, sheet.name);
                setExportNotice(`${sheet.assets.length} assets downloaded as one Figma plugin file.`);
              } catch (e) {
                setExportError(true);
                setExportNotice(e instanceof Error ? e.message : String(e));
              }
              setSending(false);
            }} disabled={sending}>
              {sending ? `Rendering ${sheet.assets.length} assets…`
                       : `Download ${sheet.assets.length} assets for Figma`}
            </button>
            <button onClick={async () => {
              setSending(true); setSent(null); setExportNotice(''); setExportError(false);
              try { await saveSession(sheet); setSent(await exportForFigma(sheet.id)); }
              catch (e) { setSent({ dir: '', files: 0, ms: 0,
                failed: [{ id: '', why: e instanceof Error ? e.message : String(e) }] }); }
              setSending(false);
            }} disabled={sending}>Export optional review folder (SVG + PNG)</button>
            {exportNotice && <p className={exportError ? 'aierr' : 'muted'}>{exportNotice}</p>}
            {sending && <p className="muted">Rendering the selected assets; long emails
              may take a few minutes.</p>}
            {sent && (sent.files > 0 ? (
              <>
                <p className="muted">{sent.files} assets in <code>{sent.dir.split('/').slice(-1)[0]}</code>
                  — an SVG each in <b>editable</b>, the same as PNG in <b>reference</b>,
                  plus media used by those assets and a manifest. Only the
                  <code>.figma.json</code> is needed by the plugin.</p>
                <p className="muted">In Figma: <b>Plugins → Development → SAC Email Studio</b>,
                  choose the <code>.figma.json</code> in that folder, build. Text stays text,
                  and each photograph can be swapped without rebuilding the asset.</p>
                <p className="muted">A font it needs and cannot find stops the build and names
                  the face, rather than quietly swapping one in.</p>
                {sent.failed.length > 0 &&
                  <p className="aierr">{sent.failed.length} did not render: {
                    sent.failed.slice(0, 3).map(f => f.id).join(', ')}</p>}
              </>
            ) : <p className="aierr">{sent.failed[0]?.why ?? 'nothing was exported'}</p>)}

            <h4>This campaign</h4>
            <ul>
              <li>{sheet.assets.length} assets across {formats.length} types</li>
              <li>{template.formats.length} formats on this board</li>
              <li>hash #{sheetHash(sheet)}</li>
            </ul>
            <h4>How to work here</h4>
            <ul>
              <li><b>Text</b> — click and type. <kbd>Alt</kbd>-drag to move.</li>
              <li><b>Photographs</b> — drag to crop, scroll to zoom.</li>
            </ul>
          </>
        )}
      </aside>
      )}
    </Ctx.Provider>
  );
}
