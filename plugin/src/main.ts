/** SAC Email Studio — build a campaign as native Figma frames.
 *
 *  The studio renders a campaign in a browser, measures what it drew, and
 *  exports it as one .figma.json. This builds that file. It decides nothing:
 *  the same reason the renderer, the PNG exporter and the review all read the
 *  sheet rather than each holding an opinion.
 *
 *  Two earlier routes each lost something. Dragging SVG in is an import --
 *  masks flatten, and a face Figma lacks is substituted and then squeezed to
 *  keep the original advance width, which reads as skewed type. Driving the
 *  Figma MCP builds properly but runs server-side, where Quiet Sans is not
 *  among its 1,949 families even though it is installed on the designer's
 *  machine.
 *
 *  A plugin runs inside the app, so the fonts are the ones the designer has.
 *  And it takes a FILE rather than fetching: no network permission, nothing
 *  to be running, nothing to keep in step.
 */
import type { Clip, Doc, Layer, Variant } from './brief';

figma.showUI(__html__, { width: 400, height: 520, themeColors: true });

const rgb = (h: string) => ({
  r: parseInt(h.slice(1, 3), 16) / 255,
  g: parseInt(h.slice(3, 5), 16) / 255,
  b: parseInt(h.slice(5, 7), 16) / 255,
});

/** Figma writes a weight's style name several ways and a machine has only
 *  some of them. These are spellings of the SAME weight, not fallbacks to a
 *  lighter one -- a display line set 200 lighter than it was drawn is a
 *  different design, and the point of this plugin is that it is not. */
const SAME: Record<number, string[]> = {
  900: ['Black', 'Heavy'],
  800: ['ExtraBold', 'Extra Bold', 'Extrabold', 'Ultra Bold', 'UltraBold'],
  700: ['Bold'],
  600: ['SemiBold', 'Semi Bold', 'Semibold', 'Demi Bold', 'DemiBold'],
  500: ['Medium'],
  400: ['Regular', 'Book', 'Normal'],
  300: ['Light'],
};

function faceFor(family: string, weight: number, have: FontName[]): FontName | null {
  for (const style of SAME[Math.round(weight / 100) * 100] ?? SAME[400])
    for (const f of have) if (f.family === family && f.style === style) return f;
  return null;
}

/** Every face the document asks for, or a refusal naming the ones missing.
 *
 *  It stops rather than substituting. Substituting is how a campaign ends up
 *  looking wrong without anyone being told -- and it was told, in an earlier
 *  route, by the type coming out visibly squeezed. A designer who is missing
 *  Quiet Sans needs to install Quiet Sans, not receive an approximation of it. */
async function loadFaces(doc: Doc): Promise<FontName[]> {
  const have = await figma.listAvailableFontsAsync().then(f => f.map(x => x.fontName));
  const want = new Map<string, { family: string; weight: number }>();
  for (const v of doc.variants) for (const l of v.layers) if (l.type === 'text')
    want.set(l.font + '|' + l.weight, { family: l.font, weight: l.weight });

  const found: FontName[] = [];
  const missing: string[] = [];
  for (const w of want.values()) {
    const fn = faceFor(w.family, w.weight, have);
    if (fn) found.push(fn); else missing.push(`${w.family} ${w.weight}`);
  }
  if (missing.length)
    throw Error(`Missing font${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}.\n\n`
      + `In Figma web, install the licensed font files and Figma Font Installer, `
      + `or upload licensed TTF/OTF faces to your Figma account or organisation. `
      + `Reload Figma, then run this again. Nothing was built — `
      + `substituting a face would change the design without saying so.`);

  await Promise.all(found.map(fn => figma.loadFontAsync(fn)));
  return found;
}

function makeNode(l: Layer, images: Record<string, string>, vectors: Record<string, string>,
                  have: FontName[]): SceneNode {
  if (l.type === 'text') {
    const t = figma.createText();
    const fn = faceFor(l.font, l.weight, have);
    if (!fn) throw Error(`Font vanished between checking and building: ${l.font} ${l.weight}`);
    t.fontName = fn;
    t.characters = l.text;
    t.fontSize = Math.max(1, l.size);
    t.lineHeight = { unit: 'PIXELS', value: Math.max(1, l.lineHeight) };
    t.letterSpacing = { unit: 'PIXELS', value: l.letterSpacing };
    t.fills = [{ type: 'SOLID', color: rgb(l.colour) }];
    // The frame hugs its type rather than being resized to the measured box.
    //
    //   A fixed-width frame is re-broken by Figma's own shaping, and a line
    //   the browser fitted by half a pixel comes back as two -- a tile reading
    //   'Men's / Tops' where the studio shows 'Men's Tops'. The browser's
    //   breaks are already in the string, so the frame only has to keep them.
    //   What it costs is the box: build() puts the hugged frame back inside
    //   the measured one by its alignment.
    t.textAutoResize = 'WIDTH_AND_HEIGHT';
    t.textAlignHorizontal = (l.align || 'left').toUpperCase() as TextNode['textAlignHorizontal'];
    return t;
  }

  if (l.type === 'image') {
    // A clipping frame holding the picture, rather than a fill on a
    // rectangle. The inner node is then a thing a designer can select and
    // swap for a different shot without rebuilding the asset around it.
    const box = figma.createFrame();
    box.resize(l.width, l.height);
    box.fills = [];
    box.clipsContent = true;
    if (l.radius) box.cornerRadius = l.radius;

    const svg = vectors[l.src];
    if (svg) {
      const art = figma.createNodeFromSvg(svg);
      art.name = l.name;
      art.resize(l.draw.width, l.draw.height);
      art.x = l.draw.x - l.x; art.y = l.draw.y - l.y;
      box.appendChild(art);
      return box;
    }

    const art = figma.createRectangle();
    art.name = 'Replace this photograph';
    // The draw rectangle is where the picture has to sit to cover the box at
    // its own aspect. Asking Figma to FILL the box instead is what skewed
    // every photograph in the SVG route.
    art.resize(l.draw.width, l.draw.height);
    art.x = l.draw.x - l.x; art.y = l.draw.y - l.y;
    const hash = images[l.src];
    art.fills = hash
      ? [{ type: 'IMAGE', imageHash: hash, scaleMode: 'FILL' }]
      : [{ type: 'SOLID', color: { r: 0.85, g: 0.85, b: 0.85 } }];
    box.appendChild(art);

    if (l.clip) {
      // A mask, not a rounded corner. Figma masks by the alpha of whichever
      // node carries isMask, so the staircase goes in as a path with the
      // photograph grouped above it -- otherwise the signature window lands
      // in Figma as a rectangular photograph and the shape is simply gone.
      //
      // The outline stays OUT of that group: a mask eats its siblings, and
      // tracing the mask's own edge from inside it loses half the stroke.
      const mask = cutout(l.clip, l.width, l.height, '#000000');
      mask.name = 'mask';
      box.insertChild(0, mask);
      figma.group([mask, art], box).name = 'window';
      mask.isMask = true;
      if (l.clip.stroke) {
        const line = cutout(l.clip, l.width, l.height, 'none',
                            l.clip.stroke, l.clip.strokeWidth);
        line.name = 'outline';
        box.appendChild(line);
      }
    }
    return box;
  }

  if (l.clip) {
    // A mark from the graphics library -- its own path, not the coloured
    // rectangle around it, the same tool as the photo's stepped window.
    const shape = cutout(l.clip, l.width, l.height, l.fill);
    shape.name = l.name;
    shape.opacity = l.opacity ?? 1;
    return shape;
  }

  const r = figma.createRectangle();
  r.resize(l.width, l.height);
  r.fills = [{ type: 'SOLID', color: rgb(l.fill), opacity: l.opacity ?? 1 }];
  if (l.radius) r.cornerRadius = Math.min(l.radius, Math.min(l.width, l.height) / 2);
  return r;
}

/** The clip's path as a node the size of the box it cuts. */
function cutout(c: Clip, w: number, h: number, fill: string,
                stroke?: string, weight?: number): FrameNode {
  const n = figma.createNodeFromSvg(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" `
    + `viewBox="0 0 ${c.view[0]} ${c.view[1]}" preserveAspectRatio="none">`
    + `<path d="${c.path}" fill="${fill}"`
    + (stroke ? ` stroke="${stroke}" stroke-width="${weight ?? 7}"` : '')
    + `/></svg>`);
  n.x = 0; n.y = 0;
  return n;
}

/** Consecutive layers sharing a group name become a group, in place.
 *  Only consecutive ones, so the stacking order is never rearranged. */
function groupRuns(frame: FrameNode, layers: Layer[]) {
  const runs: { name: string; nodes: SceneNode[] }[] = [];
  let run: SceneNode[] = [], name = '';
  for (let i = 0; i < layers.length; i++) {
    const g = layers[i].group || '';
    if (g !== name) { if (run.length) runs.push({ name, nodes: run }); run = []; name = g; }
    if (g) run.push(frame.children[i]);
  }
  if (run.length) runs.push({ name, nodes: run });
  for (const r of runs) {
    if (r.nodes.length < 2) continue;
    const at = frame.children.indexOf(r.nodes[0]);
    figma.group(r.nodes, frame, at).name = r.name;
  }
}

async function build(doc: Doc): Promise<{ frames: number; page: string }> {
  if (!doc || doc.schema !== 'sac-studio/1' || !Array.isArray(doc.variants) || !doc.variants.length)
    throw Error('That is not a SAC Email Studio export.');
  for (const v of doc.variants) {
    if (!Array.isArray(v.layers)) throw Error(`${v.name}: no layers.`);
    if (!(v.width > 0 && v.height > 0 && v.width <= 8192 && v.height <= 8192))
      throw Error(`${v.name}: ${v.width}x${v.height} is not a frame size.`);
  }

  const missingMedia = new Set<string>();
  for (const v of doc.variants) for (const l of v.layers)
    if (l.type === 'image' && !(l.src in (doc.assets || {}))
      && !(l.src in (doc.vectors || {}))) missingMedia.add(l.src);
  if (missingMedia.size)
    throw Error(`${missingMedia.size} images are missing from this export. `
      + `Re-export the campaign from SAC Studio. First missing: ${missingMedia.values().next().value}`);

  const have = await loadFaces(doc);

  const images: Record<string, string> = {};
  for (const src of Object.keys(doc.assets || {}))
    images[src] = figma.createImage(figma.base64Decode(doc.assets[src])).hash;

  const page = figma.createPage();
  page.name = `${doc.project.name} · #${doc.project.revision}`;
  await figma.setCurrentPageAsync(page);

  const made: FrameNode[] = [];
  try {
    let x = 0, y = 0, rowTall = 0;
    for (let i = 0; i < doc.variants.length; i++) {
      const v: Variant = doc.variants[i];
      const frame = figma.createFrame();
      made.push(frame);
      frame.name = v.name;
      frame.resize(v.width, v.height);
      frame.clipsContent = true;
      frame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
      // Identity in the file, so a board can say which campaign and which
      // version of it this came from without anyone keeping a note.
      frame.setPluginData('sac-email-studio', JSON.stringify({
        project: doc.project.id, variant: v.id, revision: doc.project.revision,
      }));

      for (const l of v.layers) {
        const node = makeNode(l, images, doc.vectors || {}, have);
        frame.appendChild(node);
        node.name = l.name;
        node.x = l.x; node.y = l.y;
        if (l.type === 'text') {
          // It hugs, so it is put back where the studio had it rather than
          // against the corner of the box that was measured around it.
          if (l.align === 'center') node.x = l.x + (l.width - node.width) / 2;
          else if (l.align === 'right') node.x = l.x + l.width - node.width;
          node.y = l.y + (l.height - node.height) / 2;
        }
        if (l.type === 'rect' && l.rotation) {
          // CSS turns clockwise, Figma anticlockwise, and about the centre
          // rather than the corner -- a tag pinned by its corner swings away
          // from where the studio put it.
          const rad = (-l.rotation * Math.PI) / 180;
          const cos = Math.cos(rad), sin = Math.sin(rad);
          const cx = l.x + l.width / 2, cy = l.y + l.height / 2;
          node.relativeTransform = [
            [cos, -sin, cx - cos * (l.width / 2) + sin * (l.height / 2)],
            [sin,  cos, cy - sin * (l.width / 2) - cos * (l.height / 2)],
          ];
        }
        node.setPluginData('sac-layer', String(l.n));
      }
      groupRuns(frame, v.layers);

      if (i % 4 === 0 && i) { x = 0; y += rowTall + 160; rowTall = 0; }
      frame.x = x; frame.y = y;
      x += v.width + 160;
      rowTall = Math.max(rowTall, v.height);
      page.appendChild(frame);
    }
  } catch (e) {
    // All or nothing. A half-built page is worse than none: it looks finished.
    for (const f of made) f.remove();
    page.remove();
    throw e;
  }

  figma.currentPage.selection = made;
  figma.viewport.scrollAndZoomIntoView(made);
  return { frames: made.length, page: page.name };
}

figma.ui.onmessage = async (msg: { type: string; document?: Doc }) => {
  if (msg.type !== 'build' || !msg.document) return;
  try {
    const out = await build(msg.document);
    figma.ui.postMessage({ ok: true,
      message: `${out.frames} frames built on “${out.page}”. Text is text; `
             + `photographs can be swapped without rebuilding the asset.` });
  } catch (e) {
    figma.ui.postMessage({ ok: false, message: e instanceof Error ? e.message : String(e) });
  }
};
