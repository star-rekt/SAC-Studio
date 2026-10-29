/** Compile Figma frames into layout files: every layer's exact box, rotation,
 *  fill and text style, read from Figma's own node JSON -- so a template
 *  places its layers from Figma's numbers instead of numbers retyped by hand.
 *
 *    npm run figma:pull              every frame in src/data/figma/frames.json
 *    npm run figma:pull flash-hero   just that one
 *
 *  Writes src/data/figma/<slug>.json (committed: geometry only, no token),
 *  the frame's image fills to public/figma-assets/<image ref> (committed,
 *  one file per image shared by every frame that uses it: the
 *  board's own photos, textures and thumbnails of visible layers, each
 *  scaled to twice the size it's drawn at, at most 2400px -- a crop, stored
 *  as fractions, doesn't notice), and
 *  a 1x render of the frame to dev/bump-preview/figma/<slug>.png
 *  (gitignored) for the position overlay. Needs FIGMA_TOKEN, read the same
 *  way the gallery reads it. */
import { readFile, writeFile, mkdir, rm, readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { api } from '../server/figmaGallery.ts';
import type { FigmaLayout, FigmaLayer } from '../src/render/figma/layout.ts';

const ROOT = join(import.meta.dirname, '..');
const OUT = join(ROOT, 'src/data/figma');
const PNG = join(ROOT, 'dev/bump-preview/figma');
const ASSETS = join(ROOT, 'public/figma-assets');

/** `skip`: layers whose images aren't saved -- ones the board covers completely. */
type Frame = { slug: string; file: string; node: string; skip?: string[] };
type Box = { x: number; y: number; width: number; height: number };
type Paint = { type: string; visible?: boolean; opacity?: number; color?: { r: number; g: number; b: number; a: number };
  scaleMode?: string; imageTransform?: number[][]; imageRef?: string; blendMode?: string;
  gradientHandlePositions?: { x: number; y: number }[];
  gradientStops?: { position: number; color: { r: number; g: number; b: number; a: number } }[] };
type Effect = { type: string; visible?: boolean; radius: number; offset?: { x: number; y: number };
  color?: { r: number; g: number; b: number; a: number } };
type Node = {
  id: string; name: string; type: string; visible?: boolean; rotation?: number;
  absoluteBoundingBox?: Box; absoluteRenderBounds?: Box; blendMode?: string; fills?: Paint[]; cornerRadius?: number; opacity?: number; effects?: Effect[];
  characters?: string; style?: Record<string, unknown>; children?: Node[];
  characterStyleOverrides?: number[]; styleOverrideTable?: Record<string, Record<string, unknown>>;
  fillGeometry?: { path: string }[]; strokeGeometry?: { path: string }[];
  strokes?: Paint[]; strokeWeight?: number; strokeAlign?: string;
};

/** Characters Figma styles differently from the rest of their run (a
 *  tightened space, say), as [from, to) ranges with what changes. */
const runsOf = (n: Node) => {
  const at = n.characterStyleOverrides ?? [], table = n.styleOverrideTable ?? {};
  const runs: { key: number; from: number; to: number }[] = [];
  at.forEach((key, i) => {
    const last = runs.at(-1);
    if (last && last.key === key && last.to === i) last.to++;
    else if (key) runs.push({ key, from: i, to: i + 1 });
  });
  return runs.map(({ key, from, to }) => ({ from, to, style: Object.fromEntries(Object.entries(table[key] ?? {})
    // A recoloured run (a green code word) keeps its colour as `fill`.
    .map(([k, v]) => k === 'fills' ? ['fill', hex((v as Paint[]).find(f => f.type === 'SOLID' && f.visible !== false))] : [k, v])
    .filter(([, v]) => v !== undefined).map(([k, v]) => [k, typeof v === 'number' ? r2(v) : v])) }))
    .filter(r => Object.keys(r.style).length);
};

const r2 = (n: number) => Math.round(n * 100) / 100;
const hex = (p?: Paint) => {
  if (!p?.color) return undefined;
  const c = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0');
  const a = (p.color.a ?? 1) * (p.opacity ?? 1);
  return `#${c(p.color.r)}${c(p.color.g)}${c(p.color.b)}${a < 1 ? c(a) : ''}`.toUpperCase();
};

/** A layer's visible image fills, bottom to top, and the first one's crop
 *  (Figma's imageTransform) when it's cropped. */
const imageOf = (n: Node) => {
  let all = n.fills?.filter(f => f.type === 'IMAGE' && f.visible !== false && f.imageRef) ?? [];
  // An opaque, normal fill hides every image under it: keep it and those above.
  const top = all.findLastIndex(f => (f.opacity ?? 1) === 1 && (f.blendMode ?? 'NORMAL') === 'NORMAL');
  if (top > 0) all = all.slice(top);
  if (!all.length) return null;
  const f = all[0];
  return { image: true, ...(f.imageTransform ? { crop: f.imageTransform.map(r => r.map(v => +v.toFixed(5))) } : null),
    images: all.map(i => ({ ref: i.imageRef!, mode: i.scaleMode ?? 'FILL',
      ...(i.opacity !== undefined && i.opacity < 1 ? { opacity: r2(i.opacity) } : null),
      ...(i.blendMode && i.blendMode !== 'NORMAL' ? { blend: i.blendMode } : null) })) };
};

/** Linear gradients painted over a layer's last image (a banner's shade
 *  over its photo), topmost first, as CSS backgrounds. Figma places a
 *  gradient by two handles in the box (0..1); CSS by an angle and stops along
 *  the line through the centre that spans the box, so each stop is projected
 *  onto that line. */
const shadeOf = (n: Node) => {
  const b = n.absoluteBoundingBox, fills = (n.fills ?? []).filter(f => f.visible !== false);
  const last = fills.map(f => f.type).lastIndexOf('IMAGE');
  if (!b || last < 0) return null;
  const css = fills.slice(last + 1).filter(f => f.type === 'GRADIENT_LINEAR' && f.gradientHandlePositions && f.gradientStops)
    .map(f => {
      const [p0, p1] = f.gradientHandlePositions!.map(p => ({ x: p.x * b.width, y: p.y * b.height }));
      const dx = p1.x - p0.x, dy = p1.y - p0.y, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len;
      const line = Math.abs(b.width * ux) + Math.abs(b.height * uy);
      const stops = f.gradientStops!.map(st => {
        const x = p0.x + st.position * dx - b.width / 2, y = p0.y + st.position * dy - b.height / 2;
        const c = st.color, a = c.a * (f.opacity ?? 1);
        return `rgba(${Math.round(c.r * 255)}, ${Math.round(c.g * 255)}, ${Math.round(c.b * 255)}, ${r2(a)}) ${r2(((x * ux + y * uy) / line + 0.5) * 100)}%`;
      });
      return `linear-gradient(${r2(Math.atan2(dx, -dy) * 180 / Math.PI)}deg, ${stops.join(', ')})`;
    }).reverse();
  return css.length ? { shade: css.join(', ') } : null;
};

/** A vector that holds a photo or carries a stroke (a shaped window, an
 *  outline): its outline and its stroke, so a template can clip to it and
 *  draw it. Other vectors (logo glyphs) don't need theirs. Any other stroked
 *  layer -- a framed photo's border, an eyebrow on a green tab of its own
 *  stroke -- keeps its stroke; its box is its shape. */
const shapeOf = (n: Node) => {
  const stroke = n.strokes?.find(f => f.type === 'SOLID' && f.visible !== false);
  if (!['VECTOR', 'BOOLEAN_OPERATION'].includes(n.type)) return stroke && n.strokeWeight
    ? { stroke: { color: hex(stroke), weight: r2(n.strokeWeight), align: n.strokeAlign ?? 'CENTER' } } : null;
  const photo = n.fills?.some(f => f.type === 'IMAGE' && f.visible !== false);
  if (!photo && !stroke) return null;
  return { ...(n.fillGeometry?.length ? { path: n.fillGeometry.map(g => g.path).join(' ') } : null),
    ...(stroke ? { stroke: { color: hex(stroke), weight: r2(n.strokeWeight ?? 0), align: n.strokeAlign ?? 'CENTER',
      ...(n.strokeGeometry?.length ? { path: n.strokeGeometry.map(g => g.path).join(' ') } : null) } } : null) };
};

/** Layer opacity, layer blur and a drop shadow -- the effects these boards use. */
const effectsOf = (n: Node) => {
  const on = (n.effects ?? []).filter(e => e.visible !== false);
  const blur = on.find(e => e.type === 'LAYER_BLUR'), drops = on.filter(e => e.type === 'DROP_SHADOW'), shadow = drops[0];
  const shadowOf = (e: Effect) => ({ x: r2(e.offset?.x ?? 0), y: r2(e.offset?.y ?? 0), blur: r2(e.radius),
    color: hex({ type: 'SOLID', color: e.color }) });
  return {
    ...(n.opacity !== undefined && n.opacity < 1 ? { opacity: r2(n.opacity) } : null),
    ...(blur ? { blur: r2(blur.radius) } : null),
    ...(shadow ? { shadow: shadowOf(shadow) } : null),
    ...(drops.length > 1 ? { shadows: drops.map(shadowOf) } : null),
    ...(n.blendMode && !['PASS_THROUGH', 'NORMAL'].includes(n.blendMode) ? { blend: n.blendMode } : null),
  };
};

function compile(frame: Node, file: string): FigmaLayout {
  const origin = frame.absoluteBoundingBox!;
  const layers: Record<string, FigmaLayer> = {};
  // `turn` is the rotation every ancestor adds (Figma gives each node its own).
  const walk = (n: Node, parent: string | null, shown: boolean, turn = 0) => {
    const b = n.absoluteBoundingBox;
    const visible = shown && n.visible !== false;
    const absolute = turn + (n.rotation ?? 0) * 180 / Math.PI;
    if (b && n !== frame) {
      const solid = n.fills?.find(f => f.type === 'SOLID' && f.visible !== false);
      const s = n.style ?? {};
      layers[n.id] = {
        name: n.name, type: n.type, parent, visible,
        x: r2(b.x - origin.x), y: r2(b.y - origin.y), w: r2(b.width), h: r2(b.height),
        ...(n.rotation ? { rotation: r2(n.rotation * 180 / Math.PI) } : null),
        ...(Math.abs(absolute) > 0.01 ? { turn: r2(absolute) } : null),
        ...(solid ? { fill: hex(solid) } : null),
        ...imageOf(n),
        ...shadeOf(n),
        ...effectsOf(n),
        ...shapeOf(n),
        ...(n.cornerRadius ? { radius: r2(n.cornerRadius) } : null),
        // A custom (plugin) effect -- repeated offset lines, say -- only Figma
        // can draw: the layer is saved as Figma's render of it, over the box
        // it covers (its render bounds: stroke and effect included).
        ...(n.effects?.some(e => e.type === 'CUSTOM' && e.visible !== false) && n.absoluteRenderBounds ? { render: {
          ref: '', x: r2(n.absoluteRenderBounds.x - origin.x), y: r2(n.absoluteRenderBounds.y - origin.y),
          w: r2(n.absoluteRenderBounds.width), h: r2(n.absoluteRenderBounds.height) } } : null),
        ...(n.type === 'TEXT' ? { text: {
          chars: n.characters ?? '',
          family: String(s.fontFamily), weight: Number(s.fontWeight), size: r2(Number(s.fontSize)),
          lineHeight: r2(Number(s.lineHeightPx)), letterSpacing: r2(Number(s.letterSpacing ?? 0)),
          align: String(s.textAlignHorizontal ?? 'LEFT') as 'LEFT', valign: String(s.textAlignVertical ?? 'TOP') as 'TOP',
          resize: String(s.textAutoResize ?? 'NONE') as 'NONE', trim: s.leadingTrim === 'CAP_HEIGHT',
          ...(runsOf(n).length ? { runs: runsOf(n) } : null),
        } } : null),
      };
    }
    for (const c of n.children ?? []) walk(c, n === frame ? null : n.id, visible, n === frame ? 0 : absolute);
  };
  walk(frame, null, true);
  return { source: { file, node: frame.id, name: frame.name }, size: [r2(origin.width), r2(origin.height)],
    frame: { ...(hex(frame.fills?.find(f => f.type === 'SOLID')) ? { fill: hex(frame.fills!.find(f => f.type === 'SOLID')) } : null), ...imageOf(frame) },
    layers };
}

const frames: Frame[] = JSON.parse(await readFile(join(OUT, 'frames.json'), 'utf8'));
const only = process.argv[2];
await mkdir(PNG, { recursive: true });
for (const f of frames.filter(f => !only || f.slug === only)) {
  const res = await api<{ nodes: Record<string, { document: Node }> }>(
    `/files/${f.file}/nodes?ids=${encodeURIComponent(f.node)}&geometry=paths`);
  const layout = compile(res.nodes[f.node].document, f.file);
  // The frame's image fills, saved under public/ so the template can use them.
  // Visible layers only; each image sized to twice the largest it's drawn
  // (a crop draws the image bigger than its box by 1/scale), at most 2400px.
  const need = new Map<string, number>();
  const frameBox = { x: 0, y: 0, w: layout.size[0], h: layout.size[1], visible: true };
  const drawn = [...Object.entries(layout.layers).filter(([id]) => !f.skip?.includes(id)).map(([, l]) => l),
    { ...layout.frame, ...frameBox }];
  for (const l of drawn) {
    if (!l.visible) continue;
    const zoom = l.crop ? 1 / Math.min(Math.abs(l.crop[0][0]) || 1, Math.abs(l.crop[1][1]) || 1) : 1;
    // An overlay (a faint texture: partly transparent or blended) never needs
    // more than 1200px; a tiled one is drawn at its own size.
    for (const i of l.images ?? []) need.set(i.ref, Math.max(need.get(i.ref) ?? 0,
      i.opacity !== undefined || i.blend ? 1200 : i.mode === 'TILE' ? 2400 : Math.ceil(2 * Math.max(l.w, l.h) * zoom)));
  }
  const refs = [...need.keys()];
  // Photos: the frame's own fill, or any cropped fill. They never need alpha.
  const photos = new Set([layout.frame, ...drawn].filter(l => l.crop).flatMap(l => l.images?.map(i => i.ref) ?? []));
  if (refs.length) {
    await mkdir(ASSETS, { recursive: true });
    const { meta } = await api<{ meta: { images: Record<string, string> } }>(`/files/${f.file}/images`);
    layout.assets = {};
    for (const ref of refs) {
      const most = Math.min(2400, need.get(ref)!);
      const dims = (path: string) => execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', path], { encoding: 'utf8' })
        .match(/\d+/g)!.slice(-2).map(Number);
      // One file per image, shared by every frame that uses it; kept when
      // it's already as big as this frame needs.
      let file = ['jpg', 'png'].map(ext => `${ref}.${ext}`).find(name => existsSync(join(ASSETS, name)));
      if (!file || Math.max(...dims(join(ASSETS, file))) < most) {
        if (file) await rm(join(ASSETS, file));
        const res = await fetch(meta.images[ref]);
        file = `${ref}.${/png/.test(res.headers.get('content-type') ?? '') ? 'png' : 'jpg'}`;
        const path = join(ASSETS, file);
        await writeFile(path, Buffer.from(await res.arrayBuffer()));
        if (Math.max(...dims(path)) > most) execFileSync('sips', ['-Z', String(most), path], { stdio: 'ignore' });
        // A big PNG photo, or any with no transparency, is much smaller as a JPEG.
        if (file.endsWith('.png') && statSync(path).size > 300_000 && (photos.has(ref)
            || /hasAlpha: no/.test(execFileSync('sips', ['-g', 'hasAlpha', path], { encoding: 'utf8' })))) {
          file = `${ref}.jpg`;
          execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '85', path, '--out', join(ASSETS, file)], { stdio: 'ignore' });
          await rm(path);
        }
      }
      const [w, h] = dims(join(ASSETS, file));
      layout.assets[ref] = { src: `/figma-assets/${file}`, w, h };
    }
  }
  // Layers only Figma can draw: its render of each, at twice size.
  const custom = Object.entries(layout.layers).filter(([id, l]) => l.render && l.visible && !f.skip?.includes(id));
  if (custom.length) {
    await mkdir(ASSETS, { recursive: true });
    const r = await api<{ images: Record<string, string> }>(
      `/images/${f.file}?ids=${encodeURIComponent(custom.map(([id]) => id).join(','))}&format=png&scale=2`);
    for (const [id, l] of custom) {
      const ref = `render-${f.file}-${id.replace(/\W/g, '-')}`, file = `${ref}.png`;
      await writeFile(join(ASSETS, file), Buffer.from(await (await fetch(r.images[id])).arrayBuffer()));
      (layout.assets ??= {})[ref] = { src: `/figma-assets/${file}`, w: Math.round(l.render!.w * 2), h: Math.round(l.render!.h * 2) };
      l.render!.ref = ref;
    }
  }
  await writeFile(join(OUT, `${f.slug}.json`), JSON.stringify(layout, null, 1) + '\n');
  const img = await api<{ images: Record<string, string> }>(
    `/images/${f.file}?ids=${encodeURIComponent(f.node)}&format=png&scale=1`);
  const png = Buffer.from(await (await fetch(img.images[f.node])).arrayBuffer());
  await writeFile(join(PNG, `${f.slug}.png`), png);
  console.log(`${f.slug}: ${Object.keys(layout.layers).length} layers, ${layout.size.join('x')}`);
}

// Images no compiled frame uses any more (a frame re-pulled, a layer skipped).
const used = new Set<string>();
for (const f of frames) {
  const path = join(OUT, `${f.slug}.json`);
  if (!existsSync(path)) continue;
  const layout = JSON.parse(await readFile(path, 'utf8')) as FigmaLayout;
  for (const a of Object.values(layout.assets ?? {})) used.add(a.src.replace('/figma-assets/', ''));
}
for (const file of existsSync(ASSETS) ? await readdir(ASSETS) : [])
  if (!used.has(file)) { await rm(join(ASSETS, file)); console.log(`removed unused ${file}`); }
