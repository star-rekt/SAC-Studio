/** SAC Studio: start or open a campaign, then
 *  1. Plan -- what the brief asks for, by type, with counts;
 *  2. Build -- each type in its own window: its copy on the left, the asset,
 *     its customisation on the right; each asset confirmed (a change since
 *     asks for it again);
 *  3. Export -- once everything is confirmed, to Figma or as PNGs. */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { FigmaTokenDialog, TOKEN_SKIPPED } from '../session/Dialogs';
import { fontCheck, type FontReport } from '../fonts';
import TYPE from '../data/typography.json';
import './studio.css';
import { compose } from '../model/compose';
import { buildSheet, resolveBrief, sendsOf } from '../sheet/build';
import { templateById } from '../templates/registry';
import { specById } from '../templates/spec';
import { One } from '../render/One';
import { Ctx, EMPTY, useEdits } from '../edit/store';
import { PicturePanel } from '../edit/Picture';
import { Swatches, SizeRow, PositionRow, GroupRow } from '../edit/Controls';
import { Marquee } from '../edit/Marquee';
import { MediaControls, LibraryPanel } from '../edit/Media';
import { isMediaSlot } from '../model/media';
import { measureField } from '../edit/fieldFit';
import type { FieldFit } from '../model/copyFit';
import { listSessions, loadSession, saveSession, useAutosave, downloadFigmaFile, downloadPngs, type Card } from '../session/store';
import { AiCheck } from './AiCheck';
import { applyOps } from '../ai/apply';
import { AddPanel } from './AddPanel';
import { useEditApi } from '../edit/useEditApi';
import { readBrief } from '../model/brief';
import { readBriefWithAi } from '../ai/client';
import type { AiParse } from '../ai/types';
import { SPECS } from '../templates/spec';
import { templateLabel } from '../templates/labels';
import { migrateSheet } from '../sheet/build';
import { listUserMedia, type UserMedia } from '../model/userMedia';
import { EMAIL_VARIANTS, SITE_VARIANTS, emailVariant } from '../templates/variants';
import type { EmailPart, Sheet, SheetAsset } from '../sheet/types';
import { Sections } from './Sections';
import { hasSections } from '../render/emailSections';
import { ORDER, nameOf, statusOf, confirming } from './assets';


/** A copy field's label, from its id: what it is, not where it sits. */
const FIELDS: Record<string, string> = {
  title: 'Sale name', offer: 'Offer', lead: 'Offer lead', amount: 'Offer number', urgency: 'Urgency', cta: 'Button',
  code: 'Code', eyebrow: 'Eyebrow', qualifier: 'Terms', body: 'Body copy', subject: 'Subject line', preview: 'Preview text',
};
/** The brief's own lines (what the brief fills), shown first; the rest of a
 *  board's words (nav links, product placeholders) folded away. */
const MAIN = new Set(['title', 'offer', 'lead', 'amount', 'urgency', 'cta', 'code', 'eyebrow', 'qualifier', 'subject', 'preview']);
// A compiled board says what each line is (data-role, FigmaText); else read it off the id.
// A field's id after its asset's (and a section's own key: "email-body/e1~s1/…").
const after = (assetId: string, id: string) => id.slice(assetId.length).replace(/^~[^/]+/, '').slice(1);
const isMain = (assetId: string, f: { id: string; role?: string }) => f.role ? MAIN.has(f.role)
  : after(assetId, f.id).split('/').some(p => MAIN.has(p) || MAIN.has(p.replace(/-\d+$/, '')));
const fieldName = (assetId: string, id: string) => {
  const parts = after(assetId, id).split('/').filter(p => !/^\d+$/.test(p) && p !== 'label' && p !== 'value');
  const last = parts.at(-1) ?? id;
  return FIELDS[last] ?? last.replace(/-\d+$/, '').replace(/-/g, ' ').replace(/^./, c => c.toUpperCase());
};


const noop = () => {};

/** An email and its header: a send's header is the top of its email. */
const EMAIL = ['email-body', 'email-hero'];
/** Templates a campaign can switch between: the bumps, and the sales. */
const FAMILIES = [['sc26_0060', 'sc26_bump2'], ['sc26_0021', 'named_sale']];
const TYPE_WEIGHTS = (TYPE as { styles: { family: string; style: string }[] }).styles
  .map(st => ({ family: st.family, weight: /ExtraBold|Black/.test(st.style) ? 800 : /Bold|SemiBold/.test(st.style) ? 700 : 400 }));

/** Adding an asset type: one the template has, or a custom one by name. */
function AddType({ have, offered, onAdd }: { have: string[]; offered: string[]; onAdd: (format: string) => void }) {
  const [custom, setCustom] = useState<string | null>(null);
  const add = () => {
    const f = (custom ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (/^[a-z][a-z0-9-]*$/.test(f)) { onAdd(f); setCustom(null); }
  };
  return custom === null
    ? <select className="st-addtype" value="" onChange={e => e.target.value === '\u0000' ? setCustom('') : e.target.value && onAdd(e.target.value)} aria-label="Add an asset type">
        <option value="">+ Add an asset type</option>
        {offered.filter(f => !have.includes(f)).map(f => <option key={f} value={f}>{nameOf(f)}</option>)}
        <option value={'\u0000'}>Custom…</option>
      </select>
    : <div className="st-row st-addtype">
        <input autoFocus value={custom} placeholder="Name, e.g. Homepage card" onChange={e => setCustom(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') add(); if (e.key === 'Escape') setCustom(null); }} />
        <button className="st-go" onClick={add}>Add</button>
        <button className="st-link" onClick={() => setCustom(null)}>Cancel</button>
      </div>;
}

/** The Figma token: asked for once at start when none is saved and it wasn't
 *  skipped; a gallery's "Add Figma token" asks again. */
function TokenPrompt() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let skipped = false;
    try { skipped = localStorage.getItem(TOKEN_SKIPPED) === '1'; } catch { /* private window */ }
    if (!skipped) void fetch('/api/figma-token').then(r => r.ok ? r.json() : null)
      .then(s => { if (s && !s.saved) setOpen(true); }, () => {});
    const ask = () => setOpen(true);
    window.addEventListener('sac:figma-token', ask);
    return () => window.removeEventListener('sac:figma-token', ask);
  }, []);
  return open ? <FigmaTokenDialog onClose={() => setOpen(false)} /> : null;
}

export function Studio() {
  return <><Campaigns /><TokenPrompt /></>;
}

function Campaigns() {
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [library, setLibrary] = useState<UserMedia[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [fine, setFine] = useState(false);

  // A campaign named in the link opens straight away; otherwise, the start.
  const [starting, setStarting] = useState(!new URLSearchParams(location.search).get('s'));
  const [exporting, setExporting] = useState<'figma' | 'png' | null>(null);
  const [fonts, setFonts] = useState<FontReport | null>(null);
  useEffect(() => { const ask = () => setFonts(fontCheck(TYPE_WEIGHTS)); document.fonts?.ready.then(ask) ?? ask(); }, []);
  const [exportSaid, setExportSaid] = useState('');
  useEffect(() => {
    const want = new URLSearchParams(location.search).get('s');
    if (want) loadSession(want).then(setSheet, () => setStarting(true));
    listUserMedia().then(setLibrary, noop);
  }, []);
  const save = useAutosave(sheet as Sheet, !!sheet);
  const api = useEditApi({ edits: sheet?.edits ?? EMPTY, library, setLibrary,
    setEdits: f => setSheet(s => s && ({ ...s, edits: f(s.edits), updatedAt: new Date().toISOString() })) });
  const { selected, select } = api;
  const openSheet = (s: Sheet) => { history.replaceState(null, '', `?s=${encodeURIComponent(s.id)}`); setSheet(s); setStarting(false); };
  const toStart = () => { history.replaceState(null, '', location.pathname); setSheet(null); setOpen(null); setStarting(true); };

  if (starting) return <Start onOpen={openSheet} />;
  if (!sheet) return <main className="st"><p className="st-quiet">Opening…</p></main>;

  const template = templateById(sheet.templateId), outlook = specById(sheet.templateId);
  const formats = [...new Set(sheet.assets.map(a => a.format))]
    .sort((a, b) => (ORDER.indexOf(a) + 1 || 99) - (ORDER.indexOf(b) + 1 || 99));
  const all = sheet.assets.every(a => statusOf(sheet, a) === 'done');
  // Everything confirmed: straight out, to Figma or as PNGs.
  const out = async (how: 'figma' | 'png') => {
    setExporting(how); setExportSaid('');
    try {
      await saveSession({ ...sheet, updatedAt: new Date().toISOString() });
      await (how === 'figma' ? downloadFigmaFile : downloadPngs)(sheet.id, sheet.name);
      setExportSaid(how === 'figma' ? 'Downloaded. In Figma: Plugins → SAC Email Studio, then choose the file.'
        : `Downloaded ${sheet.assets.length} PNGs in one zip.`);
    } catch (e) { setExportSaid(e instanceof Error ? e.message : String(e)); }
    setExporting(null);
  };
  // More or fewer of a type: built again from the brief, keeping what's been done.
  // Built again from the brief with a changed plan (or template), keeping
  // what's been done: edits, confirmations, and each asset's design and
  // sections where the template is the same.
  const replan = (patch: (s: Sheet) => Partial<NonNullable<Sheet['plan']>>, templateId?: string) => setSheet(s => {
    if (!s) return s;
    const plan = { ...s.plan, formats: [...new Set(s.assets.map(a => a.format))], ...patch(s) };
    const t = templateId ?? s.templateId;
    const next = buildSheet(s.brief.text, t, s.name, s.brief.html, s.brief.ai, plan);
    const old = new Map(s.assets.map(a => [a.id, a]));
    return { ...next, assets: next.assets.map(a => t === s.templateId && old.has(a.id)
        ? { ...a, variant: old.get(a.id)!.variant, parts: old.get(a.id)!.parts } : a), edits: s.edits,
      confirmed: s.confirmed, id: s.id, createdAt: s.createdAt };
  });
  // Fewer than one removes the type. An email and its header are one: a
  // send's header is its email's top, so their counts go together.
  const paired = (format: string) => EMAIL.includes(format) ? EMAIL : [format];
  const setCount = (format: string, n: number) => replan(s => n < 1
    ? { formats: [...new Set(s.assets.map(a => a.format))].filter(f => !paired(format).includes(f)) }
    : { quantities: { ...s.plan?.quantities, ...Object.fromEntries(paired(format).map(f => [f, Math.min(12, n)])) } });
  const addType = (format: string) => replan(s => ({ formats: [...new Set([...s.assets.map(a => a.format), ...paired(format)])] }));
  const family = FAMILIES.find(f => f.includes(sheet.templateId)) ?? [sheet.templateId];

  return <Ctx.Provider value={api}>
    <main className="st">
      <button className="st-link" onClick={toStart}>‹ All campaigns</button>
      <header className="st-top">
        <div>
          <input className="st-name" value={sheet.name} aria-label="Campaign name"
            onChange={e => setSheet(s => s && ({ ...s, name: e.target.value, updatedAt: new Date().toISOString() }))} />
          {family.length > 1
            ? <select className="st-template" value={sheet.templateId} onChange={e => replan(() => ({}), e.target.value)} aria-label="Template">
                {family.map(t => <option key={t} value={t}>{templateLabel(t, specById(t)?.name)}</option>)}
              </select>
            : <p className="st-quiet">{templateLabel(sheet.templateId, outlook?.name)}</p>}
          {fonts && !fonts.ok && <p className="st-quiet st-fonts" title={fonts.missing.map(m => `${m.family} ${m.weight}`).join(', ')}>
            {fonts.kitLoaded ? `${fonts.missing.length} font weight${fonts.missing.length === 1 ? '' : 's'} missing` : 'Brand fonts did not load'}</p>}
        </div>
        <ol className="st-steps" aria-label="Steps">
          <li className={all ? 'is-done' : 'is-on'}>Plan</li><li className={all ? 'is-done' : ''}>Build</li><li className={all ? 'is-on' : ''}>Export</li>
        </ol>
        <span className="st-quiet">{save.state === 'saving' ? 'Saving…' : save.state === 'failed' ? 'Not saved' : 'Saved'}</span>
      </header>
      {!sheet.brief.ai && <p className="st-note">The brief was read without AI. Check each asset's copy as you build it.</p>}
      <ul className="st-plan">
        {formats.map(f => {
          const list = sheet.assets.filter(a => a.format === f), done = list.filter(a => statusOf(sheet, a) === 'done').length;
          return <li key={f} className={done === list.length ? 'is-done' : ''}>
            <div className="st-type"><b>{nameOf(f)}</b>
              <span className="st-quiet">{done === list.length ? 'All confirmed' : `${done} of ${list.length} confirmed`}</span></div>
            <div className="st-count">
              <button aria-label={list.length <= 1 ? 'Remove' : 'Fewer'} title={list.length <= 1 ? `Remove ${nameOf(f)}` : undefined}
                onClick={() => setCount(f, list.length - 1)}>−</button>
              <span>{list.length}</span>
              <button aria-label="More" onClick={() => setCount(f, list.length + 1)}>+</button>
            </div>
            <button className="st-go" onClick={() => { select(null); setOpen(f); }}>{done === list.length ? 'View' : 'Build'}</button>
          </li>;
        })}
      </ul>
      <div className="st-under">
        <AddType have={formats} offered={template?.formats.map(f => f.format) ?? []} onAdd={addType} />
        <button className="st-ghost st-fine-go" title="Every asset by type, side by side, with precise moves, alignment and backgrounds"
          onClick={() => { select(null); setFine(true);
            setOpen(formats.find(f => sheet.assets.some(a => a.format === f && statusOf(sheet, a) !== 'done')) ?? formats[0]); }}>Fine-tune</button>
      </div>
      {all && <section className="st-export">
        <div><b>Everything is confirmed</b>
          <span className="st-quiet">{exporting ? `Rendering ${sheet.assets.length} assets… long emails take a few minutes.` : exportSaid || 'Take it to Figma, or download it.'}</span></div>
        <button className="st-primary" disabled={!!exporting} onClick={() => out('figma')}>{exporting === 'figma' ? 'Exporting…' : 'Export to Figma'}</button>
        <button className="st-go" disabled={!!exporting} onClick={() => out('png')}>{exporting === 'png' ? 'Rendering…' : 'Download PNGs'}</button>
      </section>}
       {open && template && outlook && <Build key={fine ? 'fine' : open} format={open} formats={formats} fine={fine} sheet={sheet} setSheet={setSheet}
        template={template} outlook={outlook} selected={selected} onClose={() => { setOpen(null); setFine(false); select(null); }} />}
    </main>
  </Ctx.Provider>;
}

/** Build, and Fine-tune (`fine`): the same editor. Build is the quick pass
 *  through one type, an asset at a time. Fine-tune is every type in tabs, a
 *  type's assets side by side, and the precise tools besides: X/Y position,
 *  backgrounds, select several (shift-click or Select) and align, Reset an
 *  asset. Either confirms, so a campaign can go straight to Fine-tune. */
function Build({ format: start, formats, fine, sheet, setSheet, template, outlook, selected, onClose }: {
  format: string; formats: string[]; fine: boolean; sheet: Sheet; setSheet: (f: (s: Sheet | null) => Sheet | null) => void;
  template: NonNullable<ReturnType<typeof templateById>>; outlook: NonNullable<ReturnType<typeof specById>>;
  selected: string | null; onClose: () => void;
}) {
  const api = useEdits();
  const [format, setFormat] = useState(start);
  const list = sheet.assets.filter(a => a.format === format);
  const firstOpen = (f: string) => Math.max(0, sheet.assets.filter(a => a.format === f).findIndex(a => statusOf(sheet, a) !== 'done'));
  const [i, setI] = useState(() => firstOpen(start));
  const a = list[Math.min(i, list.length - 1)];
  const toTab = (f: string) => { setFormat(f); setI(firstOpen(f)); api.select(null); api.clearGroup(); };
  const doc = useMemo(() => compose(sheet.brief.text, sendsOf(sheet), resolveBrief(sheet.brief.text, sheet.brief.html, sheet.brief.ai)),
    [sheet]);
  const sendIndex = a.scope.send ? doc.sends.findIndex(s => s.id === a.scope.send) : -1;

  // The asset fitted to its pane: whole for a banner or a hero, by width for an email.
  const pane = useRef<HTMLDivElement>(null), stage = useRef<HTMLDivElement>(null);
  const [room, setRoom] = useState<[number, number]>([800, 600]);
  useLayoutEffect(() => {
    const el = pane.current; if (!el) return;
    const fit = () => setRoom([el.clientWidth - 48, el.clientHeight - 48]);
    fit(); const ro = new ResizeObserver(fit); ro.observe(el); return () => ro.disconnect();
  }, []);
  // Its height as drawn: an email of sections is as tall as they are.
  const [drawn, setDrawn] = useState(a.size[1]);
  useLayoutEffect(() => {
    const el = stage.current; if (!el) return;
    const at = () => (el.firstElementChild as HTMLElement | null)?.offsetHeight || a.size[1];
    const ro = new ResizeObserver(() => setDrawn(at())); ro.observe(el); return () => ro.disconnect();
  }, [a.id, a.size]);
  const tall = drawn > a.size[0] * 2;
  const fit = Math.min(1, room[0] / a.size[0], tall ? Infinity : room[1] / drawn);
  const whole = Math.min(1, room[0] / a.size[0], room[1] / drawn);
  // Zoom: 'fit' (by width for an email, whole otherwise), 'whole', or a scale.
  const [zoom, setZoom] = useState<'fit' | 'whole' | number>('fit');
  useEffect(() => setZoom('fit'), [a.id]);
  const k = zoom === 'fit' ? fit : zoom === 'whole' ? whole : zoom;
  const step = (by: number) => setZoom(Math.max(0.05, Math.min(3, Math.round(k * by * 100) / 100)));
  // A grid over the asset, cells across.
  const [grid, setGrid] = useState(0);
  const cell = grid ? a.size[0] / grid * k : 0;
  // Fine-tune: the type's assets side by side, emails three across, the rest
  // two, each at that width (and the zoom on top); Select, and Reset an asset.
  const [scale, setScale] = useState(1);
  const across = Math.min(list.length, drawn > a.size[0] * 2 ? 3 : 2);
  const kOf = (x: SheetAsset) => Math.min(1, (room[0] - 24 * (across - 1)) / (x.size[0] * across)) * scale;
  const [boxSelect, setBoxSelect] = useState(false);
  const [resetting, setResetting] = useState<string | null>(null);
  const resetAsset = (x: SheetAsset) => setSheet(s => s && ({ ...s, updatedAt: new Date().toISOString(),
    edits: Object.fromEntries(Object.entries(s.edits).map(([key, m]) => [key,
      m && typeof m === 'object' && !Array.isArray(m)
        ? Object.fromEntries(Object.entries(m).filter(([id]) => !(id === x.id || id.startsWith(`${x.id}/`) || id.startsWith(`${x.id}~`))))
        : m])) as Sheet['edits'] }));

  // Its copy: every editable run on it, as it reads now.
  // The list is the asset's own lines, read once per asset and design from
  // what the template draws (not what's typed): emptying a line keeps its field.
  const [fields, setFields] = useState<Fld[]>([]);
  useLayoutEffect(() => {
    const t = setTimeout(() => {
      const seen = new Set<string>();
      setFields([...stage.current?.querySelectorAll<HTMLElement>('.ed[data-id]') ?? []]
        .map(e => ({ id: e.dataset.id!, text: e.dataset.default ?? e.innerText, role: e.closest<HTMLElement>('[data-role]')?.dataset.role }))
        .filter(f => !seen.has(f.id) && seen.add(f.id) && !/^\W*(%|off)?\W*$/i.test(f.text.trim())));
    }, 50);
    return () => clearTimeout(t);
  }, [a.id, a.variant, JSON.stringify(a.parts), fine]);
  // How each line fits now, measured as the studio's copy check measures it.
  const [fits, setFits] = useState<Record<string, FieldFit>>({});
  useLayoutEffect(() => {
    const t = setTimeout(() => {
      const out: Record<string, FieldFit> = {};
      for (const f of fields) {
        const el = stage.current?.querySelector<HTMLElement>(`[data-id="${CSS.escape(f.id)}"]`);
        if (el) out[f.id] = measureField(el, el.innerText);
      }
      setFits(out);
    }, 120);
    return () => clearTimeout(t);
  }, [fields, sheet.edits.text, a.variant]);

  // The side panels' widths, dragged by the bars between them, kept per browser.
  const [cols, setCols] = useState<[number, number]>(() => {
    try { const v = JSON.parse(localStorage.getItem('st-cols') ?? ''); if (Array.isArray(v) && v.length === 2) return v as [number, number]; }
    catch { /* none yet, or no storage */ }
    return [300, 380];
  });
  const drag = (side: 0 | 1) => (e: React.MouseEvent) => {
    e.preventDefault();
    const x0 = e.clientX, w0 = cols[side];
    const move = (m: MouseEvent) => setCols(c => {
      const w = Math.max(220, Math.min(720, w0 + (side ? x0 - m.clientX : m.clientX - x0)));
      const next: [number, number] = side ? [c[0], w] : [w, c[1]];
      try { localStorage.setItem('st-cols', JSON.stringify(next)); } catch { /* fine */ }
      return next;
    });
    const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); document.body.style.cursor = ''; };
    window.addEventListener('mousemove', move); window.addEventListener('mouseup', up); document.body.style.cursor = 'col-resize';
  };

  const status = statusOf(sheet, a);
  const confirm = () => {
    setSheet(s => s && confirming(s, [a]));
    const next = list.findIndex((x, j) => j > i && statusOf(sheet, x) !== 'done');
    if (next >= 0) setI(next);
  };
  const setDesign = (variant: string) => setSheet(s => s && ({ ...s, updatedAt: new Date().toISOString(),
    assets: s.assets.map(x => (/^email-/.test(a.format) ? x.scope.send === a.scope.send && /^email-/.test(x.format) : x.id === a.id)
      ? { ...x, variant, parts: undefined } : x) }));
  const setParts = (parts: EmailPart[] | undefined) => setSheet(s => s && ({ ...s, updatedAt: new Date().toISOString(),
    assets: s.assets.map(x => x.id === a.id ? { ...x, parts } : x) }));
  const emailDesigns = /^email-/.test(format) && sendIndex >= 0 ? EMAIL_VARIANTS[sheet.templateId] ?? [] : [];
  const siteDesigns = SITE_VARIANTS[sheet.templateId]?.[format] ?? [];
  const designs = emailDesigns.length ? emailDesigns : siteDesigns;
  const design = emailDesigns.length ? emailVariant(sheet.templateId, a.variant, sendIndex)?.id
    : siteDesigns.find(d => d.id === a.variant)?.id ?? siteDesigns[0]?.id;
  // Something the designer added (a graphic, a text layer) can be removed again.
  const added = (m => m ? [m[2] ? 'graphic' : 'text', m[1], m[2] ?? m[3]] as const : null)(
    selected?.match(/^(.*)\/(?:graphic\/([^/]+)\/mark|custom-text\/([^/]+))$/));
  // Build is the quick pass: copy, photos, logos, graphics. A background
  // (an asset's or a panel's ground) is Fine-tune's, not Build's.
  const picked = selected && (fine || !/\/fill$/.test(selected)) ? selected : null;
  const kind = !picked ? null : picked.endsWith('/photo') || /\/pic$|\/el\//.test(picked)
    || document.querySelector(`[data-id="${CSS.escape(picked)}"]`)?.matches('.pic:not(.media)') ? 'photo'
    : /\/fill$/.test(picked) ? 'shape' : isMediaSlot(picked) ? 'media' : 'text';
  const confirmAll = () => setSheet(s => s && confirming(s, list.filter(x => statusOf(s, x) !== 'done')));
  const doneOf = (f: string) => sheet.assets.filter(x => x.format === f && statusOf(sheet, x) === 'done').length;
  const countOf = (f: string) => sheet.assets.filter(x => x.format === f).length;

  return <div className={`st-sheet${fine ? ' st-fine' : ''}`} role="dialog" aria-label={fine ? 'Fine-tune' : nameOf(format)}>
    <header className="st-bar">
      <button className="st-link" onClick={onClose}>‹ All assets</button>
      <h2>{fine ? 'Fine-tune' : nameOf(format)}</h2>
      {fine && <nav className="st-tabs">
        {formats.map(f => <button key={f} className={`${f === format ? 'is-on' : ''}${doneOf(f) === countOf(f) ? ' is-done' : ''}`}
          onClick={() => toTab(f)}>{nameOf(f)} <small>{doneOf(f)}/{countOf(f)}</small></button>)}
      </nav>}
      {!fine && list.length > 1 && <nav className="st-carousel">
        <button onClick={() => setI(Math.max(0, i - 1))} disabled={i === 0} aria-label="Previous">‹</button>
        {list.map((x, j) => <button key={x.id} className={`st-dot is-${statusOf(sheet, x)}${j === i ? ' is-on' : ''}`}
          onClick={() => setI(j)} title={x.label}>{j + 1}</button>)}
        <button onClick={() => setI(Math.min(list.length - 1, i + 1))} disabled={i === list.length - 1} aria-label="Next">›</button>
      </nav>}
      {!fine && <span className="st-quiet st-label">{a.label}</span>}
    </header>
    <div className="st-body" style={{ gridTemplateColumns: `${cols[0]}px 6px 1fr 6px ${cols[1]}px` }}>
      <aside className="st-copy">
        <h3>Copy</h3>
        {fields.filter(f => isMain(a.id, f)).map(f => <Field key={f.id} f={f} fit={fits[f.id]} name={f.role && FIELDS[f.role] ? FIELDS[f.role] : fieldName(a.id, f.id)} sheet={sheet} setSheet={setSheet} />)}
        {!fields.some(f => isMain(a.id, f)) && <p className="st-quiet">Nothing from the brief on this one.</p>}
        {fields.some(f => !isMain(a.id, f)) && <details className="st-more"><summary>More copy</summary>
          {fields.filter(f => !isMain(a.id, f)).map(f => <Field key={f.id} f={f} fit={fits[f.id]} name={f.role && FIELDS[f.role] ? FIELDS[f.role] : fieldName(a.id, f.id)} sheet={sheet} setSheet={setSheet} />)}
        </details>}
      </aside>
      <div className="st-split" onMouseDown={drag(0)} role="separator" aria-orientation="vertical" title="Drag to resize" />
      <section className="st-stage" ref={pane}>
        <div className="st-zoom" role="group" aria-label="Zoom">
          {fine ? <>
            <button onClick={() => setScale(z => Math.max(0.3, Math.round(z / 1.25 * 100) / 100))} aria-label="Zoom out">−</button>
            <button className="st-zoom-k" onClick={() => setScale(1)} title="Side by side, fitted">{Math.round(scale * 100)}%</button>
            <button onClick={() => setScale(z => Math.min(4, Math.round(z * 1.25 * 100) / 100))} aria-label="Zoom in">+</button>
            <span className="st-zoom-sep" />
            <button className={boxSelect ? 'is-on' : ''} onClick={() => setBoxSelect(v => !v)} title="Drag over an asset to select several things">Select</button>
          </> : <>
          <button onClick={() => step(1 / 1.25)} aria-label="Zoom out">−</button>
          <button className="st-zoom-k" onClick={() => setZoom('fit')} title="Fit to width">{Math.round(k * 100)}%</button>
          <button onClick={() => step(1.25)} aria-label="Zoom in">+</button>
          <button className={`st-zoom-all${zoom === 'whole' ? ' is-on' : ''}`} onClick={() => setZoom('whole')} title="See the whole asset">Fit all</button>
          <span className="st-zoom-sep" />
          </>}
          <button className={grid ? 'is-on' : ''} onClick={() => setGrid(g => g ? 0 : 12)} title="A grid over the asset">Grid</button>
          {grid > 0 && <>
            <button onClick={() => setGrid(g => Math.max(4, g - 4))} aria-label="Fewer grid lines">−</button>
            <button onClick={() => setGrid(g => Math.min(48, g + 4))} aria-label="More grid lines">+</button>
          </>}
        </div>
        {/* The asset at the zoom (CSS zoom, as the editing tools measure it), and the grid over it. */}
        {!fine && <div className="col st-canvas" style={{ width: a.size[0] * k }}>
          <div ref={stage} className="scaler" style={{ '--z': k, width: a.size[0] } as React.CSSProperties}>
            <One asset={a} doc={doc} template={template} outlook={outlook} />
          </div>
          {grid > 0 && <div className="st-grid" aria-hidden style={{ backgroundSize: `${cell}px ${cell}px` }} />}
        </div>}
        {/* Fine-tune: side by side; the one clicked into is the current asset. */}
        {fine && <div className="st-row-assets">{list.map((x, j) => {
          const kx = kOf(x), sx = statusOf(sheet, x);
          return <article key={x.id} className={`st-fine-asset${j === i ? ' is-current' : ''}`} onMouseDownCapture={() => setI(j)}>
            <header>
              <b>{x.label}</b>
              <span className={`st-state is-${sx}`}>{sx === 'done' ? 'Confirmed' : sx === 'changed' ? 'Changed' : ''}</span>
              <button className="st-link" onClick={() => { if (resetting === x.id) { resetAsset(x); setResetting(null); } else setResetting(x.id); }}
                onBlur={() => setResetting(null)}>{resetting === x.id ? 'Click again' : 'Reset'}</button>
            </header>
            <div className="col st-canvas" style={{ width: x.size[0] * kx }}>
              <div ref={j === i ? stage : undefined} className="scaler" style={{ '--z': kx, width: x.size[0] } as React.CSSProperties}>
                <One asset={x} doc={doc} template={template} outlook={outlook} />
              </div>
              {grid > 0 && <div className="st-grid" aria-hidden style={{ backgroundSize: `${x.size[0] / grid * kx}px ${x.size[0] / grid * kx}px` }} />}
              <Marquee active={boxSelect} />
            </div>
          </article>;
        })}</div>}
      </section>
      <div className="st-split" onMouseDown={drag(1)} role="separator" aria-orientation="vertical" title="Drag to resize" />
      {/* The studio's panel styles (thumbnail grids, swatches), in place. */}
      <aside className="st-edit panel">
        {designs.length > 1 && <><h3>Design</h3>
          <select value={design} onChange={e => setDesign(e.target.value)}>
            {designs.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select></>}
        {format === 'email-body' && hasSections(sheet.templateId) && design && <><h3>Sections</h3>
          <Sections templateId={sheet.templateId} asset={a} brief={doc.sends[sendIndex]?.sections} design={design} setParts={setParts}
            show={(part, top) => {
              const el = stage.current?.querySelector(`[data-part="${part}"]`), at = pane.current;
              if (!at) return;
              at.scrollTo({ top: el ? at.scrollTop + el.getBoundingClientRect().top - at.getBoundingClientRect().top - 24 : top * k, behavior: 'smooth' });
            }} /></>}
        {fine && api.selectedGroup.length > 0 ? <GroupRow /> : <>
        {!picked && <><p className="st-quiet">Click a photo, logo or line of copy on the asset to change it.</p>
          <AddPanel asset={a} /></>}
        {picked && kind !== 'photo' && <h3>{kind === 'media' ? 'Logo or graphic' : kind === 'shape' ? 'Background' : 'Text'}</h3>}
        {kind === 'photo' && <PicturePanel id={picked!} />}
        {kind === 'media' && <><MediaControls id={picked!} />
          <LibraryPanel selected={picked} assets={[{ id: a.id, label: a.label, size: a.size }]} /></>}
        {(kind === 'text' || kind === 'shape') && <>
          <h4>Colour</h4><Swatches id={picked!} type={kind === 'text'} />
          <h4>Size</h4><SizeRow id={picked!} />
          {fine && <><h4>Position</h4><PositionRow id={picked!} /></>}</>}
        {picked && <div className="st-picked">
          <button onClick={() => api.reset(picked)}>Reset</button>
          {added && <button onClick={() => added[0] === 'graphic'
            ? api.removeGraphic(added[1], added[2]) : api.removeCustomText(added[1], added[2])}>Remove</button>}
          <button onClick={() => api.select(null)}>Done</button>
        </div>}
        </>}
      </aside>
    </div>
    <AiCheck sheet={sheet} asset={a} apply={ops => setSheet(s => s && ({ ...s, edits: applyOps(s.edits, ops), updatedAt: new Date().toISOString() }))} />
    <footer className="st-bar st-bottom">
      <span className={`st-state is-${status}`}>{status === 'done' ? 'Confirmed' : status === 'changed' ? 'Changed since confirming' : 'Not confirmed'}</span>
      {fine && <span className="st-quiet st-label">{a.label}</span>}
      {fine && <button className="st-link" disabled={doneOf(format) === countOf(format)} onClick={confirmAll}>Confirm all {nameOf(format).toLowerCase()}</button>}
      <button className="st-primary" onClick={confirm} disabled={status === 'done'}>
        {status === 'changed' ? 'Confirm again' : status === 'done' ? 'Confirmed' : 'Confirm'}</button>
    </footer>
  </div>;
}

type Fld = { id: string; text: string; role?: string };
const FIT_WORDS = { ok: 'Fits', contract: 'Shrinks to fit', wrap: 'Too long' } as const;

/** One line of copy: edits the same run as typing on the asset does, says
 *  whether it fits, and can go back to the template's own words. */
function Field({ f, fit, name, sheet, setSheet }: { f: Fld; fit?: FieldFit; name: string; sheet: Sheet;
  setSheet: (f: (s: Sheet | null) => Sheet | null) => void }) {
  const edited = f.id in sheet.edits.text, value = sheet.edits.text[f.id] ?? f.text;
  const set = (text?: string) => setSheet(s => {
    if (!s) return s;
    const next = { ...s.edits.text };
    if (text === undefined) delete next[f.id]; else next[f.id] = text;
    return { ...s, updatedAt: new Date().toISOString(), edits: { ...s.edits, text: next } };
  });
  return <label className={`st-field is-${value.trim() ? fit?.status ?? 'ok' : 'empty'}`}>
    <span className="st-field-head">{name}
      {edited && <button type="button" className="st-link" onClick={() => set()}>Restore</button>}</span>
    <textarea rows={Math.min(5, Math.max(1, value.split('\n').length, Math.ceil(value.length / 32)))} value={value}
      placeholder="Empty: this line shows nothing" onChange={e => set(e.target.value)} />
    {value.trim() ? fit && <small>{FIT_WORDS[fit.status]}{fit.ideal ? ` · ${fit.chars} of ${fit.ideal} characters` : ''}
      {fit.status !== 'ok' && fit.note ? ` · ${fit.note}` : ''}</small>
      : <small>Empty</small>}
  </label>;
}

const when = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(+d) ? '' : d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

/** Step 1: start a campaign from its brief, or open one. */
function Start({ onOpen }: { onOpen: (s: Sheet) => void }) {
  const [cards, setCards] = useState<Card[] | null>(null);
  useEffect(() => { listSessions().then(setCards, () => setCards([])); }, []);
  const field = useRef<HTMLDivElement>(null);
  const [brief, setBrief] = useState(''), [name, setName] = useState('');
  const [busy, setBusy] = useState(false), [problem, setProblem] = useState('');
  // The brief says what kind of sale it is; the templates that fit come first, the one fit chosen.
  const shown = SPECS.filter(t => t.exposed !== false);
  const read = brief.trim().length >= 40 ? readBrief(field.current?.innerHTML || brief, '', brief) : undefined;
  const fits = read?.typeConfident ? shown.filter(t => t.type === read.type) : [];
  const [chosen, setChosen] = useState<string | null>(null);
  const templateId = chosen && shown.some(t => t.id === chosen) ? chosen : (fits[0] ?? shown[0]).id;

  const create = async () => {
    setBusy(true); setProblem('');
    let ai: AiParse | undefined;
    try { ai = (await readBriefWithAi(brief)).parse; }
    catch { /* built from the brief's own wording; the plan screen says so */ }
    try {
      const sheet = buildSheet(brief, templateId, name.trim(), field.current?.innerHTML ?? '', ai);
      await saveSession(sheet);
      onOpen(sheet);
    } catch (e) { setProblem(e instanceof Error ? e.message : String(e)); setBusy(false); }
  };
  const open = async (id: string) => {
    try { onOpen(await loadSession(id)); } catch (e) { setProblem(e instanceof Error ? e.message : String(e)); }
  };
  // A campaign saved elsewhere (a file from the Sessions folder, a teammate's):
  // read, brought up to date, saved here, opened.
  const pick = useRef<HTMLInputElement>(null);
  // Starts in Documents (where SAC_Studio keeps its Sessions folder) and
  // remembers the folder last picked from; a browser without that picker
  // gets the plain file dialog.
  const choose = async () => {
    const picker = (window as unknown as { showOpenFilePicker?: (o: object) => Promise<{ getFile(): Promise<File> }[]> }).showOpenFilePicker;
    if (!picker) return pick.current?.click();
    try {
      const [handle] = await picker({ id: 'sac-campaigns', startIn: 'documents', multiple: false,
        types: [{ description: 'Campaign', accept: { 'application/json': ['.json'] } }] });
      await importFile(await handle.getFile());
    } catch (e) { if ((e as Error).name !== 'AbortError') setOpenProblem((e as Error).message); }
  };
  const [all, setAll] = useState(false), [find, setFind] = useState('');
  const importFile = async (file?: File) => {
    if (!file) return;
    try {
      const raw = JSON.parse(await file.text());
      const sheet = migrateSheet(raw.sheet ?? raw);
      if (!sheet.id || !Array.isArray(sheet.assets)) throw new Error('That file isn\u2019t a campaign.');
      await saveSession(sheet);
      onOpen(sheet);
    } catch (e) { setOpenProblem(e instanceof SyntaxError ? 'That file isn\u2019t a campaign.' : e instanceof Error ? e.message : String(e)); }
  };
  const [openProblem, setOpenProblem] = useState('');

  return <main className="st st-start">
    <header className="st-hero">
      <h1 className="st-brand">SAC Studio<span aria-hidden>.</span></h1>
    </header>
    <div className="st-start-grid">
      <section className="st-card">
        <h2>New campaign</h2>
        <label className="st-in"><span>Name</span>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="From the brief if left empty" /></label>
        <label className="st-in"><span>Brief</span>
          <div ref={field} className="st-paste" contentEditable suppressContentEditableWarning
            data-empty="Paste the brief here" onInput={e => setBrief(e.currentTarget.innerText)} /></label>
        <label className="st-in"><span>Template</span>
          <select value={templateId} onChange={e => setChosen(e.target.value)}>
            {[...fits, ...shown.filter(t => !fits.includes(t))].map(t => <option key={t.id} value={t.id}>{templateLabel(t.id, t.name)}</option>)}
          </select></label>
        {problem && <p className="st-note">{problem}</p>}
        <button className="st-primary" disabled={brief.trim().length < 40 || busy} onClick={create}>
          {busy ? 'Reading the brief…' : 'Create campaign'}</button>
      </section>
      <section className="st-card">
        <h2>{all ? 'All campaigns' : 'Recent'}</h2>
        {!cards ? <p className="st-quiet">Loading…</p> : !cards.length ? <p className="st-quiet">No campaigns yet.</p>
          : <>
            {all && <input className="st-find" value={find} onChange={e => setFind(e.target.value)} placeholder="Find a campaign" autoFocus />}
            <ul className={`st-list${all ? ' is-all' : ''}`}>{cards
              .filter(c => !all || !find.trim() || c.name.toLowerCase().includes(find.trim().toLowerCase()))
              .slice(0, all ? undefined : 5).map(c => <li key={c.id}><button onClick={() => open(c.id)}>
              <b>{c.name}</b><span className="st-quiet">{templateLabel(c.templateId, specById(c.templateId)?.name)} · {when(c.updatedAt)}</span>
            </button></li>)}</ul></>}
        <div className="st-row">
          {cards && cards.length > 5 && <button className="st-ghost" onClick={() => { setAll(!all); setFind(''); }}>
            {all ? 'Show recent' : `All campaigns (${cards.length})`}</button>}
          <button className="st-ghost" onClick={choose}>Import a file…</button>
        </div>
        <input ref={pick} type="file" accept=".json,application/json" hidden onChange={e => { void importFile(e.target.files?.[0]); e.target.value = ''; }} />
        {openProblem && <p className="st-note">{openProblem}</p>}
      </section>
    </div>
  </main>;
}
