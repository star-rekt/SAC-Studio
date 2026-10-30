/** A compiled frame drawn layer for layer, from a full-detail compile
 *  (figma-pull FIGMA_PULL_FULL): fills in order (colour, gradient, cropped
 *  image), vector outlines and strokes, box strokes, clipping, opacity,
 *  blend, blur and shadows, each layer inside its parent so clips and turns
 *  nest as Figma's do.
 *
 *  A template built on it (the template lab generates them) passes `slots`:
 *  for the layers a designer edits -- copy, the photo, brand logos -- an
 *  element of its own, drawn at that layer's box and in its place in the
 *  board's stacking order. Everything else (bands, waves, textures, marks) is
 *  drawn from the board as it is, so a template's own code stays the part
 *  that does something.
 *
 *  `nudges` are per-layer corrections the lab's fix loop found to match
 *  Figma's render (dx/dy px; for text ls: letter spacing px, fs: size
 *  factor, lh: line height px). NudgeOverride lets the lab try one live. */
import { createContext, useContext, type CSSProperties, type ReactNode } from 'react';
import { Editable } from '../../edit/Editable';
import { Media } from '../../edit/Media';
import { useEdits, textOf } from '../../edit/store';
import { CopyBlock } from '../../edit/autoPlace';
import { boardFit } from '../../model/textContracts';
import { placeIn, typeOf, shadowFilter, type FigmaLayer, type FigmaLayout, type FigmaPaint } from './layout';

export type Nudge = { dx?: number; dy?: number; ls?: number; fs?: number; lh?: number };
/** A slot: what to draw for a layer, given its placed box (its parent's px,
 *  turn and nudge included), its nudge, and `board()` -- the layer drawn as
 *  the board has it (a brand slot shows the board's logo until the brief
 *  names a brand). */
export type Slot = (l: FigmaLayer, box: CSSProperties & { width: number; height: number }, nudge: Nudge,
  board: (how?: { bare?: boolean }) => ReactNode) => ReactNode;
/** Nudges tried live (the lab's fix loop), over a template's own. */
export const NudgeOverride = createContext<Record<string, Nudge> | null>(null);

const blendOf = (b?: string) => b ? b.toLowerCase().replace(/_/g, '-') as CSSProperties['mixBlendMode'] : undefined;
/** An image fill's CSS size: a tile at its scale of the image's own size. */
const sizeOf = (p: Extract<FigmaPaint, { type: 'IMAGE' }>, layout: FigmaLayout) => {
  const a = layout.assets?.[p.ref];
  return p.mode === 'TILE' ? a ? `${a.w * (p.scale ?? 1)}px ${a.h * (p.scale ?? 1)}px` : 'auto'
    : p.mode === 'FIT' ? 'contain' : p.mode === 'STRETCH' ? '100% 100%' : 'cover';
};

/** One fill as a full-size layer of its box. */
function Paint({ p, layout, w, h }: { p: FigmaPaint; layout: FigmaLayout; w: number; h: number }) {
  const base: CSSProperties = { position: 'absolute', inset: 0, mixBlendMode: blendOf(p.blend), pointerEvents: 'none' };
  if (p.type === 'SOLID') return <div style={{ ...base, background: p.color }} />;
  if (p.type === 'GRADIENT') return <div style={{ ...base, background: p.css }} />;
  const src = layout.assets?.[p.ref]?.src;
  if (!src) return null;
  if (p.crop) {
    // imageTransform maps the box (0..1) onto the image (0..1) -- scale, turn
    // and offset. Its inverse carries a box-size element showing the whole
    // image to where the image sits, as a CSS matrix in px.
    const [[a, b, tx], [c, d, ty]] = p.crop, det = a * d - b * c;
    const m00 = d / det, m01 = -b / det, m10 = -c / det, m11 = a / det;
    const m02 = -(m00 * tx + m01 * ty), m12 = -(m10 * tx + m11 * ty);
    return <div style={{ ...base, overflow: 'hidden', opacity: p.opacity }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, transformOrigin: '0 0',
        transform: `matrix(${m00}, ${m10 * h / w}, ${m01 * w / h}, ${m11}, ${w * m02}, ${h * m12})`,
        backgroundImage: `url(${src})`, backgroundSize: '100% 100%' }} />
    </div>;
  }
  return <div style={{ ...base, opacity: p.opacity, backgroundImage: `url(${src})`, backgroundSize: sizeOf(p, layout),
    backgroundPosition: p.mode === 'TILE' ? '0 0' : 'center', backgroundRepeat: p.mode === 'TILE' ? 'repeat' : 'no-repeat' }} />;
}

/** The type of a text layer, as the board sets it (with its nudge). */
export function textLook(l: FigmaLayer, fontSize: number | undefined, nudge: Nudge, width: number): CSSProperties {
  const t = l.text!, size = (fontSize ?? t.size) * (1 + (nudge.fs ?? 0)), k = size / t.size;
  const wraps = t.resize !== 'WIDTH_AND_HEIGHT';
  // Its colour is its topmost solid fill: a text can carry several (white
  // under black, say), and Figma shows the top one.
  const top = l.paints?.filter((p): p is Extract<FigmaPaint, { type: 'SOLID' }> => p.type === 'SOLID').at(-1)?.color;
  return { ...typeOf(l, size), ...(top ? { color: top } : null), width: wraps ? width : undefined, whiteSpace: wraps ? 'pre-wrap' : 'pre',
    letterSpacing: t.letterSpacing * k + (nudge.ls ?? 0), lineHeight: `${t.lineHeight * k + (nudge.lh ?? 0)}px`,
    textTransform: t.case === 'UPPER' ? 'uppercase' : t.case === 'LOWER' ? 'lowercase' : t.case === 'TITLE' ? 'capitalize' : undefined,
    textDecoration: t.decoration === 'UNDERLINE' ? 'underline' : t.decoration === 'STRIKETHROUGH' ? 'line-through' : undefined,
    fontStyle: t.italic ? 'italic' : undefined,
    alignSelf: t.align === 'CENTER' ? 'center' : t.align === 'RIGHT' ? 'flex-end' : 'flex-start' };
}

/** The lab's corrections on a text's box, for the Figma export to take back
 *  off: they match the browser's type to Figma's render, and Figma itself
 *  wants the board's own numbers. */
const nudgeOf = (n: Nudge) => Object.keys(n).length ? { 'data-nudge': JSON.stringify(n) } : null;

/** The box a text layer is set in: its vertical alignment. */
const textBox = (l: FigmaLayer, box: CSSProperties): CSSProperties => ({ ...box, display: 'flex', flexDirection: 'column',
  justifyContent: l.text!.valign === 'CENTER' ? 'center' : l.text!.valign === 'BOTTOM' ? 'flex-end' : 'flex-start',
  pointerEvents: 'none' });

/** A text's image fills (a grain laid over its colour): each a copy of the
 *  run over it, the image clipped to its letters, in the fill's opacity and
 *  blend -- so the copy under it stays live, editable text. */
function Grain({ l, layout, look, children }: { l: FigmaLayer; layout: FigmaLayout; look: CSSProperties; children: ReactNode }) {
  return <>{(l.paints ?? []).map((p, i) => {
    const src = p.type === 'IMAGE' && layout.assets?.[p.ref]?.src;
    if (p.type !== 'IMAGE' || !src) return null;
    return <div key={i} aria-hidden data-export="skip" style={{ ...look, position: 'absolute', left: 0, top: 0, color: 'transparent',
      WebkitTextStroke: undefined, paintOrder: undefined, pointerEvents: 'none', opacity: p.opacity, mixBlendMode: blendOf(p.blend),
      backgroundImage: `url(${src})`, WebkitBackgroundClip: 'text', backgroundClip: 'text',
      backgroundRepeat: p.mode === 'TILE' ? 'repeat' : 'no-repeat', backgroundPosition: p.mode === 'TILE' ? '0 0' : 'center',
      backgroundSize: sizeOf(p, layout) }}>{children}</div>;
  })}</>;
}
/** A run with its grain over it (when its layer has one). */
const grained = (l: FigmaLayer, layout: FigmaLayout, look: CSSProperties, run: ReactNode, letters: ReactNode) =>
  l.paints?.some(p => p.type === 'IMAGE')
    ? <div style={{ position: 'relative', alignSelf: look.alignSelf }}>{run}<Grain l={l} layout={layout} look={look}>{letters}</Grain></div>
    : run;

/** A board text a designer edits, set exactly as the board sets it: its
 *  contract from the board layer (boardFit), the brief's copy or the
 *  board's own. A run styled apart on the board (a bold code word) is its
 *  own field, keeping that style -- an editable field is plain text. */
export function FigmaText({ l, box, nudge, id, text, contract, layout }: { l: FigmaLayer; box: CSSProperties & { width: number };
  nudge: Nudge; id: string; text: string; contract: string; layout: FigmaLayout }) {
  const { edits } = useEdits();
  const t = l.text!, board = t.chars.replace(/\u2028/g, '\n');
  text = text.replace(/\u2028/g, '\n');
  // Runs only while the copy is the board's own: another line has no runs to keep.
  const runs = text === board && t.runs?.length ? t.runs : undefined;
  if (!runs) {
    // Each line fitted on its own (a two-line board run, "EXTRA⏎20% OFF"); the run takes the smallest.
    // A paragraph (a fixed-width box the board's own copy wraps in) wraps at
    // the board's size instead: fitted as one line, a sentence shrank to 40%.
    const live = textOf(edits, id, text);
    const paragraph = t.resize !== undefined && t.resize !== 'WIDTH_AND_HEIGHT' && l.h > t.lineHeight * 1.5;
    const fitted = live.split('\n').map(line => boardFit(line, contract, l)).reduce((a, b) => b.fontSize < a.fontSize ? b : a);
    const fit = paragraph ? { ...fitted, fontSize: t.size } : fitted;
    const look = textLook(l, fit.fontSize, nudge, box.width);
    return <div style={textBox(l, box)} {...nudgeOf(nudge)}>
      {grained(l, layout, look, <Editable id={id} fit={fit.contract} style={{ ...look, pointerEvents: 'auto' }}>{text}</Editable>, live)}
    </div>;
  }
  const cuts = [...new Set([0, board.length, ...runs.flatMap(r => [r.from, r.to])])].sort((a, b) => a - b);
  const parts = cuts.slice(0, -1).map((from, i) => ({ from, text: board.slice(from, cuts[i + 1]),
    style: runs.find(r => r.from <= from && r.to > from)?.style ?? {} }));
  const fit = boardFit(parts.map((p, i) => textOf(edits, `${id}/${i}`, p.text)).join(''), contract, l), k = fit.fontSize / t.size;
  const look = textLook(l, fit.fontSize, nudge, box.width);
  const size = (p: typeof parts[number]) => ({ fontWeight: p.style.fontWeight as number,
    fontSize: p.style.fontSize ? (p.style.fontSize as number) * k : undefined });
  return <div style={textBox(l, box)} {...nudgeOf(nudge)}>
    {grained(l, layout, look, <div style={look}>
      {parts.map((p, i) => <Editable key={i} as="span" id={`${id}/${i}`} fit={fit.contract}
        style={{ ...size(p), color: p.style.fill as string, pointerEvents: 'auto' }}>{p.text}</Editable>)}
    </div>, parts.map((p, i) => <span key={i} style={size(p)}>{textOf(edits, `${id}/${i}`, p.text)}</span>))}
  </div>;
}

/** A board mark as the studio's own graphic (a library mark: recoloured,
 *  resized, swapped, exported as its vector path), at the layer's box --
 *  grown by `pad` (fractions of the box, each side) where the mark's art
 *  overhangs it, a stroke's half-width. The board's grain over it is kept:
 *  each image fill masked to the same shape. */
export function FigmaMark({ l, box, id, src, fill, pad = [0, 0], layout }: { l: FigmaLayer;
  box: CSSProperties & { width: number; height: number }; id: string; src: string; fill?: string;
  pad?: [number, number]; layout: FigmaLayout }) {
  const px = box.width * pad[0], py = box.height * pad[1];
  const at: CSSProperties = { position: 'absolute', left: (box.left as number) - px, top: (box.top as number) - py,
    width: box.width + 2 * px, height: box.height + 2 * py, transform: box.transform, opacity: box.opacity, filter: box.filter };
  const grain = (l.paints ?? []).filter((p): p is Extract<FigmaPaint, { type: 'IMAGE' }> => p.type === 'IMAGE');
  return <>
    <Media id={id} src={src} fill={fill} alt={l.name} style={at} />
    {/* Its blend and opacity on the masked box itself: a mask isolates what's
        inside it, so a blend in there had nothing under it to darken. */}
    {grain.map((p, i) => <div key={i} data-export="skip" style={{ ...at, pointerEvents: 'none', WebkitMaskImage: `url(${src})`, maskImage: `url(${src})`,
      WebkitMaskSize: '100% 100%', maskSize: '100% 100%', mixBlendMode: blendOf(p.blend), opacity: p.opacity }}>
      <Paint p={{ ...p, blend: undefined, opacity: undefined }} layout={layout} w={at.width as number} h={at.height as number} />
    </div>)}
  </>;
}

/** A layer's stroke alone, over whatever a slot draws in its place (a photo
 *  slot keeps its window's outline). */
export function FigmaStroke({ l, box }: { l: FigmaLayer; box: CSSProperties }) {
  const s = l.stroke;
  if (!s) return null;
  if (s.path) return <div style={{ ...box, pointerEvents: 'none' }}>
    <div style={{ position: 'absolute', inset: 0, background: s.color, clipPath: `path("${s.path}")` }} />
  </div>;
  return <div style={{ ...box, pointerEvents: 'none', borderRadius: l.radius,
    ...(s.align === 'INSIDE' ? { boxShadow: `inset 0 0 0 ${s.weight}px ${s.color}` }
      : { outline: `${s.weight}px solid ${s.color}`, outlineOffset: s.align === 'CENTER' ? -s.weight / 2 : 0 }) }} />;
}

function Layer({ id, layout, kids, slots, nudges, plain, bare }: { id: string; layout: FigmaLayout; kids: Map<string | null, string[]>;
  slots: Record<string, Slot>; nudges: Record<string, Nudge>;
  /** Draw this layer as the board has it, whatever its slot. */
  plain?: boolean;
  /** Without its own fill and stroke: what's in it, over a slot that draws its shape (a pill). */
  bare?: boolean }) {
  const l = layout.layers[id];
  if (!l.visible) return null;
  const parent = l.parent ? layout.layers[l.parent] : null;
  const placed = placeIn(l, parent) as CSSProperties & { width: number; height: number };
  const nudge = nudges[id] ?? {};
  const move = nudge.dx || nudge.dy ? ` translate(${nudge.dx ?? 0}px, ${nudge.dy ?? 0}px)` : '';
  const box = { ...placed, transform: `${placed.transform ?? ''}${move}` || undefined };
  const filter = [l.blur ? `blur(${l.blur / 2}px)` : '', shadowFilter(l) ?? ''].filter(Boolean).join(' ') || undefined;
  // A slot draws in the layer's place with the layer's own effects (a headline's shadow).
  if (slots[id] && !plain) return <>{slots[id](l, { ...box, opacity: l.opacity, mixBlendMode: blendOf(l.blend), filter }, nudge,
    how => <Layer id={id} layout={layout} kids={kids} slots={slots} nudges={nudges} plain bare={how?.bare} />)}</>;

  const w = placed.width, h = placed.height;
  const style: CSSProperties = { ...box, opacity: l.opacity, mixBlendMode: blendOf(l.blend), filter,
    borderRadius: l.radius, overflow: l.clips ? 'hidden' : undefined, pointerEvents: 'none' };
  // A boolean operation's children are its operands: Figma draws only the
  // result, in its own fill (a white bolt made of two gold halves).
  const children = l.type === 'BOOLEAN_OPERATION' ? []
    : (kids.get(id) ?? []).map(k => <Layer key={k} id={k} layout={layout} kids={kids} slots={slots} nudges={nudges} />);
  const paints = bare ? [] : (l.paints ?? []).map((p, i) => <Paint key={i} p={p} layout={layout} w={w} h={h} />);

  if (l.type === 'TEXT' && l.text) {
    // A board text no template edits: set as the board sets it, runs and all.
    const t = l.text, chars = t.chars.replace(/\u2028/g, '\n'), k = 1 + (nudge.fs ?? 0);
    const cuts = t.runs?.length ? [...new Set([0, chars.length, ...t.runs.flatMap(r => [r.from, r.to])])].sort((a, b) => a - b) : null;
    const look = textLook(l, undefined, nudge, w);
    const letters = (coloured: boolean) => cuts ? cuts.slice(0, -1).map((from, i) => {
      const r = t.runs!.find(x => x.from <= from && x.to > from)?.style ?? {};
      return <span key={i} style={{ fontWeight: r.fontWeight as number, color: coloured ? r.fill as string : undefined,
        fontSize: r.fontSize ? (r.fontSize as number) * k : undefined }}>{chars.slice(from, cuts[i + 1])}</span>;
    }) : chars;
    return <div style={textBox(l, style)} {...nudgeOf(nudge)}>
      {grained(l, layout, look, <div style={look}>{letters(true)}</div>, letters(false))}
    </div>;
  }
  if (l.path || l.stroke?.path || l.regions) {
    // A vector: its fills cut to its outline; its stroke, its stroke outline
    // filled. A line has a stroke outline and no fill outline (no area to fill).
    return <div style={style}>
      {paints.length > 0 && l.path && <div style={{ position: 'absolute', inset: 0, clipPath: `path(${l.evenodd ? 'evenodd, ' : ''}"${l.path}")` }}>{paints}</div>}
      {l.regions?.map((r, i) => <div key={i} style={{ position: 'absolute', inset: 0, background: r.fill, clipPath: `path("${r.path}")` }} />)}
      {l.stroke?.path && <div style={{ position: 'absolute', inset: 0, background: l.stroke.color, clipPath: `path("${l.stroke.path}")` }} />}
      {children}
    </div>;
  }
  // A box: its fills, its stroke on the board's side of the edge, then what's in it.
  const s = bare ? undefined : l.stroke;
  const edge: CSSProperties = s ? s.align === 'INSIDE' ? { boxShadow: `inset 0 0 0 ${s.weight}px ${s.color}` }
    : { outline: `${s.weight}px solid ${s.color}`, outlineOffset: s.align === 'CENTER' ? -s.weight / 2 : 0 } : {};
  return <div style={{ ...style, ...edge }}>
    {paints.length > 0 && <div style={{ position: 'absolute', inset: 0, borderRadius: l.radius, overflow: 'hidden' }}>{paints}</div>}
    {children}
  </div>;
}

export function FigmaLayers({ layout, slots = {}, nudges = {}, copy }: { layout: FigmaLayout;
  slots?: Record<string, Slot>; nudges?: Record<string, Nudge>;
  /** The copy's lockups (top-level layers), moved as one by smart placement
   *  round the photo (docs/smart-placement.md): drawn in a CopyBlock, in the
   *  place of the first of them. */
  copy?: { id: string; layers: string[] } }) {
  const live = useContext(NudgeOverride);
  const { edits } = useEdits();
  const all = live ? { ...nudges, ...live } : nudges;
  const kids = new Map<string | null, string[]>();
  for (const [id, l] of Object.entries(layout.layers)) kids.set(l.parent, [...(kids.get(l.parent) ?? []), id]);
  const [w, h] = layout.size;
  return <>
    {(layout.frame.paints ?? []).map((p, i) => <Paint key={i} p={p} layout={layout} w={w} h={h} />)}
    {/* The layers, apart from the frame's own background: the lab hides
        these to capture that background (Figma's export leaves it out). */}
    <div data-figma-layers style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {(kids.get(null) ?? []).map(id => !copy?.layers.includes(id)
        ? <Layer key={id} id={id} layout={layout} kids={kids} slots={slots} nudges={all} />
        : id === (kids.get(null) ?? []).find(t => copy.layers.includes(t))
        ? <CopyBlock key="copy" id={copy.id} edits={edits}>
            {copy.layers.map(c => <Layer key={c} id={c} layout={layout} kids={kids} slots={slots} nudges={all} />)}
          </CopyBlock>
        : null)}
    </div>
  </>;
}
