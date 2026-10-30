/** An email's sections: shown or hidden, dragged into order, each in the
 *  style of any of its template's designs' sections of the kind, and any
 *  section added. Sections stay inside their template (render/emailSections.ts).
 *  Only the content sections are offered; the nav, hero, copy and footer stay
 *  as the design has them. */
import { useMemo, useState } from 'react';
import type { EmailPart, SheetAsset } from '../sheet/types';
import type { Section } from '../model/sections';
import { OFFERED, SECTION_NAMES, emailDesigns, ownParts, sectionName, sectionsOf, type SectionKind } from '../render/emailSections';

const ref = (p: { design: string; section: number }) => `${p.design}:${p.section}`;
const newKey = () => `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

/** A template's offered sections, each look once (designs drawing the same
 *  section, words and photos aside, share one): the first design's, numbered
 *  as a style of its kind. */
function stylesOf(templateId: string) {
  const library = emailDesigns(templateId)
    .flatMap(design => sectionsOf(templateId, design).map((s, section) => ({ design, section, s })));
  return library.filter((x, i) => OFFERED.includes(x.s.kind)
    && library.findIndex(y => y.s.kind === x.s.kind && y.s.look === x.s.look) === i)
    .map((x, _, all) => ({ ...x, style: all.filter(y => y.s.kind === x.s.kind).indexOf(x) + 1 }));
}

export function Sections({ templateId, asset, design, brief, setParts, show }: { templateId: string; asset: SheetAsset; design: string;
  /** The send's sections in the brief (a Flash email's own). */
  brief?: Section[];
  setParts: (parts: EmailPart[] | undefined) => void;
  /** Bring the email's section into view: its marker on the page, else this height. */
  show: (part: number, top: number) => void }) {
  const STYLES = useMemo(() => stylesOf(templateId), [templateId]);
  const styleOf = (s: { kind: SectionKind; look: string }) => STYLES.find(x => x.s.kind === s.kind && x.s.look === s.look);
  const sectionOf = (p: { design: string; section: number }) => sectionsOf(templateId, p.design, brief)[p.section];
  const parts = asset.parts ?? ownParts(templateId, design, brief);
  const [open, setOpen] = useState<number | null>(null);
  const [dragged, setDragged] = useState<number | null>(null);
  // The email's own design's section keeps the email's edits; any other, or a
  // second copy of one, gets a key of its own.
  const keyFor = (p: { design: string; section: number }, list: EmailPart[]) =>
    p.design === design && !list.some(x => x.key === '' && ref(x) === ref(p)) ? '' : newKey();
  const set = (next: EmailPart[]) => setParts(next);
  // A style the email's own design draws too is taken from its own design.
  const own = (p: { design: string; section: number }) => {
    const x = sectionOf(p);
    const i = sectionsOf(templateId, design).findIndex(y => x && y.kind === x.kind && y.look === x.look);
    return i >= 0 ? { design, section: i } : p;
  };
  const move = (from: number, to: number) => {
    const next = [...parts], [p] = next.splice(from, 1); next.splice(to, 0, p); set(next);
  };
  const restyle = (i: number, value: string) => {
    const [d, n] = value.split(':'), rest = parts.filter((_, j) => j !== i);
    const p = own({ design: d, section: Number(n) });
    set(parts.map((x, j) => j === i ? { ...p, key: keyFor(p, rest) } : x));
  };
  const add = (value: string) => {
    const [d, n] = value.split(':'), p = own({ design: d, section: Number(n) });
    // In above the category buttons and footer at the bottom (category buttons above the footer).
    const below = sectionOf(p)?.kind === 'buttons' ? ['footer'] : ['buttons', 'footer'];
    let at = parts.length;
    while (at > 0 && below.includes(sectionOf(parts[at - 1])?.kind ?? '')) at--;
    const next = [...parts]; next.splice(at, 0, { ...p, key: keyFor(p, parts) }); set(next); setOpen(at);
    setTimeout(() => show(at, topOf(next, at)), 300);
  };
  // Where a section starts in the email: the shown sections above it, stacked.
  const topOf = (list: EmailPart[], i: number) =>
    list.slice(0, i).reduce((y, x) => y + (x.off ? 0 : sectionOf(x)?.height ?? 0), 0);

  return <>
    <ol className="st-sections">
      {parts.map((p, i) => {
        const s = sectionOf(p);
        if (!s || !OFFERED.includes(s.kind)) return null;
        return <li key={p.key || ref(p)} draggable className={`${p.off ? 'is-off' : ''}${dragged === i ? ' is-dragged' : ''}`}
          onDragStart={e => { setDragged(i); e.dataTransfer.effectAllowed = 'move'; }}
          onDragEnd={() => setDragged(null)}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); if (dragged !== null && dragged !== i) move(dragged, i); setDragged(null); }}>
          <div className="st-sec-row">
            <span className="st-grip" aria-hidden>⋮⋮</span>
            <input type="checkbox" checked={!p.off} title={p.off ? 'Show' : 'Hide'}
              onChange={() => set(parts.map((x, j) => j === i ? { ...x, off: x.off ? undefined : true } : x))} />
            <button className="st-sec-name" onClick={() => { setOpen(open === i ? null : i); if (!p.off) show(i, topOf(parts, i)); }} title={sectionName(s)}>
              {sectionName(s)}
            </button>
          </div>
          {open === i && <div className="st-sec-more">
            {STYLES.filter(x => x.s.kind === s.kind).length > 1
              ? <select value={ref(styleOf(s) ?? p)} onChange={e => restyle(i, e.target.value)} aria-label="Style">
                {STYLES.filter(x => x.s.kind === s.kind).map(x =>
                  <option key={ref(x)} value={ref(x)}>Style {x.style}</option>)}
              </select> : <span />}
            <button className="st-link" onClick={() => { set(parts.filter((_, j) => j !== i)); setOpen(null); }}>Remove</button>
          </div>}
        </li>;
      })}
    </ol>
    <div className="st-sec-foot">
      <select value="" onChange={e => e.target.value && add(e.target.value)} aria-label="Add section">
        <option value="">+ Add section</option>
        {OFFERED.filter(k => STYLES.some(x => x.s.kind === k)).map(k =>
          <optgroup key={k} label={SECTION_NAMES[k]}>
            {STYLES.filter(x => x.s.kind === k).map(x =>
              <option key={ref(x)} value={ref(x)}>{STYLES.filter(y => y.s.kind === k).length > 1 ? `${SECTION_NAMES[k]} · Style ${x.style}` : SECTION_NAMES[k]}</option>)}
          </optgroup>)}
      </select>
      {asset.parts && <button className="st-link" onClick={() => { setParts(undefined); setOpen(null); }}>Reset to design</button>}
    </div>
  </>;
}
