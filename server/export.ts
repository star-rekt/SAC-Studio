/** A folder of this campaign, ready to drag into Figma.
 *
 *  The plugin route needs a plugin installed, a manifest change and network
 *  permission; this needs none of them. Figma takes a multiple-file drop onto
 *  a canvas and names each layer after the file, which is the part worth
 *  knowing: the FILENAME IS THE STAMP. Drop forty-one PNGs and you get
 *  forty-one layers already named for the asset they are, without anything
 *  having written plugin data.
 *
 *  The folder also carries photographs used by the rendered assets, so a
 *  designer who wants to re-crop something in Figma has the source,
 *  and a manifest that says exactly what each file is, which is the thing a
 *  filename cannot hold losslessly.
 */
import { mkdir, mkdtemp, writeFile, copyFile, rm, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { shoot, EXPORTS } from './shot.ts';
import { PUBLIC } from './paths.ts';

export type Asset = {
  id: string; format: string; label: string; size: [number, number];
  media?: { photo?: string };
};

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Readable, sorts by type, and unique. Figma shows this as the layer name. */
const nameFor = (a: Asset, n: number) =>
  `${String(n + 1).padStart(2, '0')}-${slug(a.format)}-${slug(a.label)}`.slice(0, 70);

/** Preserve the web source directory in the bundle. Reference art and photos
 * often have the same extension, but only one of those directories has the
 * actual file; flattening both into photographs made Figma use grey boxes. */
export function bundledImage(layer: Record<string, unknown>, want?: Map<string, string>) {
  if (layer.type !== 'image' || typeof layer.src !== 'string' || layer.src.startsWith('data:'))
    return layer;
  const web = layer.src;
  const relative = web.replace(/^\/+/, '');
  // figma-assets: the images the compiled templates take from their boards
  // (Bump 2's photos and textures, say) -- a default design's own pictures.
  if (!/^(photos|reference|logos|graphics|figma-assets)\//.test(relative))
    throw Error(`Cannot export image outside the media library: ${web}`);
  const bundled = `media/${relative}`;
  want?.set(bundled, web);
  return { ...layer, src: bundled };
}

export type Report = {
  dir: string; zip?: string; files: number; failed: { id: string; why: string }[];
  brief?: Record<string, unknown>; ms: number;
};

/** The manifest alone, with no folder written.
 *
 *  The plugin wants what to build, not a bundle to open: it reads the images
 *  from this same server, so copying them to disk first would be a detour
 *  through the filesystem on the way back to the same bytes. */
/** Vite's dev server compiles a page's whole module graph on its first
 *  request, lazily, per module. Four fresh headless Chromes navigating to it
 *  at once (the real batch below) raced that cold compile against each
 *  page's own settle timeout, and whichever one lost rendered nothing at
 *  all -- not a timeout error, a genuinely empty page, which only surfaced
 *  three steps later as "no editable layers returned" on whichever asset
 *  happened to be the unlucky one (confirmed live: window.__layers was never
 *  defined because React had never mounted, not that toLayers() threw).
 *  One throwaway shot first, serial and outside the real batch, warms that
 *  compile so the concurrent batch always hits an already-warm server.
 *  Best-effort: a failed warm-up is not fatal, since the real batch still
 *  carries its own per-asset retry. */
async function warmUp(session: string, origin: string, asset: Asset, file: string) {
  await shoot(`${origin}/?shot=${encodeURIComponent(asset.id)}&s=${encodeURIComponent(session)}`,
    asset.size[0], asset.size[1], file, { small: false }).catch(() => undefined);
}

export async function briefOnly(
  session: string, name: string, assets: Asset[], origin: string,
): Promise<Record<string, unknown>> {
  // The single-file Figma download needs measured layers, not a duplicate
  // folder of SVGs, PNGs, photographs and a zip. Capture into our own temp
  // directory and remove it even if one frame fails.
  const scratch = await mkdtemp(join(tmpdir(), 'sac-figma-'));
  try {
    if (assets[0]) await warmUp(session, origin, assets[0], join(scratch, 'warmup.png'));
    const build: NonNullable<BriefShape['build']> = [];
    const queue = assets.map((asset, index) => ({ asset, index }));
    const workers = await Promise.allSettled(Array.from({ length: Math.min(4, queue.length) }, async () => {
      for (let job = queue.shift(); job; job = queue.shift()) {
        const { asset, index } = job;
        const url = `${origin}/?shot=${encodeURIComponent(asset.id)}&s=${encodeURIComponent(session)}`;
        const file = join(scratch, `${index}.png`);
        let shot = await shoot(url, asset.size[0], asset.size[1], file,
          { small: false, layers: true });
        let got = shot.ok ? shot.layers as { layers?: Record<string, unknown>[] } | undefined : undefined;
        // A dev-server reload racing the capture (Vite HMR firing mid-shot,
        // observed live against a running `npm run dev`) leaves window.__layers
        // momentarily unset on an otherwise fine page: the screenshot and the
        // SETTLED check both already succeeded, so shot.ok is true, but the
        // separate layers evaluate comes back empty. That is the same kind of
        // transient this retry already covers for an outright timeout -- worth
        // one more attempt before failing the whole export over it.
        if (!shot.ok && /never finished|did not return|did not produce|toLayers\(\) threw/.test(shot.error)
          || shot.ok && !got?.layers) {
          shot = await shoot(url, asset.size[0], asset.size[1], file,
            { small: false, layers: true });
          got = shot.ok ? shot.layers as { layers?: Record<string, unknown>[] } | undefined : undefined;
        }
        if (!shot.ok) throw Error(`${asset.id}: ${shot.error}`);
        if (!got?.layers) throw Error(`${asset.id}: no editable layers returned`);
        build.push({ frame: nameFor(asset, index), assetId: asset.id,
          width: shot.w, height: shot.h, layers: got.layers.map(l => bundledImage(l)) });
      }
    }));
    const failed = workers.find(r => r.status === 'rejected');
    if (failed?.status === 'rejected') throw failed.reason;
    build.sort((a, b) => a.frame.localeCompare(b.frame));
    const fontsNeeded = [...new Set(build.flatMap(f => f.layers
      .filter(l => l.type === 'text').map(l => `${l.font} ${l.weight}`)))].sort();
    return { v: 1, campaign: name, session, frames: build.length, fontsNeeded, build };
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}

export async function exportCampaign(
  session: string, name: string, assets: Asset[], origin: string,
  onProgress?: (done: number, total: number) => void,
  revision = '',
): Promise<Report> {
  const started = Date.now();
  const dir = join(EXPORTS, `${slug(name) || session}-figma`);
  await rm(dir, { recursive: true, force: true });
  await mkdir(join(dir, 'editable'), { recursive: true });
  await mkdir(join(dir, 'reference'), { recursive: true });
  await mkdir(join(dir, 'media'), { recursive: true });

  if (assets[0]) await warmUp(session, origin, assets[0], join(tmpdir(), `sac-warmup-${process.pid}.png`));

  const failed: Report['failed'] = [];
  const index: Record<string, unknown>[] = [];
  const build: Record<string, unknown>[] = [];
  const fonts = new Set<string>();
  /** bundled path -> the web path it came from, for everything to copy in. */
  const want = new Map<string, string>();
  let done = 0;

  // Four at a time, the same as a review: more browsers than that and the
  // smallest assets start timing out under contention.
  const queue = assets.map((a, i) => ({ a, i }));
  await Promise.all(Array.from({ length: Math.min(4, queue.length) }, async () => {
    for (let job = queue.shift(); job; job = queue.shift()) {
      const { a, i } = job;
      const file = join(dir, 'reference', `${nameFor(a, i)}.png`);
      const url = `${origin}/?shot=${encodeURIComponent(a.id)}&s=${encodeURIComponent(session)}`;
      // One retry, as the review path does. The only failures seen are
      // timeouts under contention -- four browsers at once, and it is never
      // the same asset twice. Without this an export of forty quietly comes
      // back as thirty-nine and the one missing is arbitrary.
      const how = { small: false as const, svg: true, layers: true };
      let shot = await shoot(url, a.size[0], a.size[1], file, how);
      if (!shot.ok && /never finished|did not return|did not produce/.test(shot.error))
        shot = await shoot(url, a.size[0], a.size[1], file, how);
      if (!shot.ok) failed.push({ id: a.id, why: shot.error });
      else {
        // SVG is the one to drag in: Figma reads it as layers, with the type
        // still type. The PNG is kept beside it as the reference render --
        // what the asset is MEANT to look like, against which an import that
        // flattened a mask can be checked.
        if (shot.svg) await writeFile(join(dir, 'editable', `${nameFor(a, i)}.svg`), shot.svg);
        const got = shot.layers as
          { layers?: Record<string, unknown>[]; fonts?: string[] } | undefined;
        for (const f of got?.fonts ?? []) fonts.add(f);

        // Every picture a layer names has to BE here, under the name the
        // brief uses. They were web paths -- /photos/hike-07.jpg -- which do
        // not exist in the folder, so a brief that looked complete pointed at
        // nothing and the logos were not even copied.
        const used = (got?.layers ?? []).map(l => bundledImage(l, want));
        index.push({ file: `editable/${nameFor(a, i)}.svg`,
                     reference: `reference/${nameFor(a, i)}.png`, assetId: a.id,
                     format: a.format, label: a.label,
                     size: [shot.w, shot.h], photograph: a.media?.photo ?? null });
        build.push({
          frame: nameFor(a, i), assetId: a.id,
          width: shot.w, height: shot.h,
          reference: `reference/${nameFor(a, i)}.png`,
          layers: used,
        });
      }
      onProgress?.(++done, assets.length);
    }
  }));

  // Include only media used by exported layers. A suggested photo in asset
  // metadata is not necessarily the image the selected template rendered.
  const missing: string[] = [];
  for (const [to, web] of want) {
    const from = join(PUBLIC, web.replace(/^\//, ''));
    if (existsSync(from)) {
      await mkdir(dirname(join(dir, to)), { recursive: true });
      await copyFile(from, join(dir, to));
    }
    else missing.push(web);
  }
  if (missing.length) failed.push({ id: 'media', why: `not found: ${missing.join(', ')}` });

  // The brief, which is the point of the folder.
  //
  //   The studio does not write a Figma file. It says what each asset is --
  //   a frame this size, a photograph here, a rounded orange rectangle tilted
  //   two degrees there, this string in Quiet Sans 800 at 58px at these
  //   coordinates -- and Claude builds it with Figma's own tools. What comes
  //   out is a native frame: text that can be retyped, rectangles that can be
  //   recoloured, a real mask where there is a mask. An SVG import is an
  //   approximation of all of that and flattens whatever it cannot express.
  build.sort((a, b) => String(a.frame).localeCompare(String(b.frame)));
  const brief = {
    v: 1, campaign: name, session,
    frames: build.length,
    units: 'pixels. x and y are from the frame top-left, y downwards. '
         + 'Sizes are as rendered, so place at 100%.',
    fontsNeeded: [...fonts].sort(),
    note: 'Each entry is one frame. The reference PNG beside it is what the '
        + 'frame should end up looking like; place it to check against and '
        + 'delete it when the frame matches.',
    steps: [
      'Load the /figma-use skill before calling use_figma.',
      'create_new_file, or ask which existing file to build into.',
      'For each frame below: make a frame of its width and height, named `frame`.',
      'Place the layers in the order given — they are already in back-to-front order.',
      'image: place the file named in `src`, relative to this folder. `x/y/width/height` is '
        + 'the visible box — clip to it. `draw` is where to put the image so it covers that box '
        + 'at its true aspect ratio; use those numbers rather than stretching it to the box, '
        + 'which is what skews a photograph. Rotate it `rotation` degrees about its centre where given — '
        + 'a badge or a card mark in a rotated frame still needs to come in tilted, not straight.',
      'rect: a rectangle at its box, filled `fill`, corner radius `radius`, rotated `rotation` degrees about its centre where given.',
      'text: a text layer at its box with that string, font, weight, size, line height, letter spacing, colour and alignment. Underline it when `underline` is true. Keep it text — never outline it.',
      'Check each frame against its reference PNG and fix what differs.',
      'Two things the brief cannot carry: the punched hole in the offer tag is a mask, '
        + 'and the scrims over the photographs are gradients. Add those in Figma where the reference shows them.',
    ],
    build,
  };
  await writeFile(join(dir, 'figma-brief.json'), JSON.stringify(brief, null, 1));

  await writeFile(join(dir, 'manifest.json'), JSON.stringify({
    v: 1, session, campaign: name, exportedAt: new Date().toISOString(),
    note: 'Each PNG is one asset. The file name is the layer name Figma will use; '
        + 'assetId here is the exact identity, which a file name cannot hold.',
    assets: index.sort((a, b) => String(a.file).localeCompare(String(b.file))),
  }, null, 1));

  await writeFile(join(dir, 'HOW TO USE.txt'),
`${name}
${index.length} assets, exported ${new Date().toLocaleString()}

INTO FIGMA — with the plugin
  Unzip this first if you were sent the zip.

  In Figma: Plugins > Development > SAC Email Studio, choose
  ${slug(name) || session}.figma.json from this folder, and build.

  Every asset becomes a frame. Text stays text and can be retyped, blocks stay
  shapes and can be recoloured, and each photograph sits in its own node named
  "Replace this photograph" so a shot can be swapped without rebuilding the
  asset around it.

  That one file carries everything — the layers, the photographs, the fonts it
  needs by name. The plugin asks for no network access at all.

  If a font it needs is missing, the build STOPS and names the face. It does
  not substitute: a swapped face changes the design without saying so, which
  is the failure the SVG route had.

INTO FIGMA — without the plugin
  Open the "editable" folder, select the files inside and drag those onto the
  canvas. Dragging the FOLDER does nothing: Figma takes files.

  This is the lesser route. The SVGs import as layers and the type stays type,
  but it is an import rather than a build: masks flatten, the punched hole in
  the offer tag arrives as a solid corner, and a font Figma cannot find is
  substituted and then squeezed to keep the original width, which reads as
  skewed type.

  A PNG from "reference" drags in too and is a flat picture. Fine for showing
  someone, useless for editing.

ONE WAY ONLY
  This is a snapshot. Changes made in Figma stay in Figma: exporting again
  overwrites these files and will not pick anything up from the board.
`);

  // The file the plugin takes, in the folder you just exported. Fetching it
  // from a URL while everything else lands on disk is a trap: you press
  // Export, get a folder, and the one file that builds the campaign is not in
  // it.
  const doc = await figmaDocument(session, name, revision, assets, origin, brief as BriefShape);
  await writeFile(join(dir, `${slug(name) || session}.figma.json`), JSON.stringify(doc));

  const zip = await zipUp(dir).catch(() => undefined);
  return { dir, zip, files: index.length, failed, brief, ms: Date.now() - started };
}

/** Every asset as a PNG, zipped: what a designer hands on when the campaign
 *  needs no Figma. Rendered as the Figma export is (the shot page, the
 *  session's own edits), into a temp folder that goes once the zip is read. */
export async function pngZip(session: string, name: string, assets: Asset[], origin: string): Promise<Buffer> {
  const scratch = await mkdtemp(join(tmpdir(), 'sac-png-'));
  const dir = join(scratch, slug(name) || session);
  try {
    await mkdir(dir);
    if (assets[0]) await warmUp(session, origin, assets[0], join(scratch, 'warmup.png'));
    const queue = assets.map((asset, index) => ({ asset, index }));
    const failed: string[] = [];
    await Promise.all(Array.from({ length: Math.min(4, queue.length) }, async () => {
      for (let job = queue.shift(); job; job = queue.shift()) {
        const { asset, index } = job;
        const url = `${origin}/?shot=${encodeURIComponent(asset.id)}&s=${encodeURIComponent(session)}`;
        const file = join(dir, `${nameFor(asset, index)}.png`);
        let shot = await shoot(url, asset.size[0], asset.size[1], file, { small: false });
        if (!shot.ok) shot = await shoot(url, asset.size[0], asset.size[1], file, { small: false });
        if (!shot.ok) failed.push(`${asset.label}: ${shot.error}`);
      }
    }));
    if (failed.length) throw Error(`${failed.length} asset${failed.length === 1 ? '' : 's'} did not render -- ${failed.join('; ')}`);
    return await readFile(await zipUp(dir));
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}

/** macOS and Linux both ship `zip`; without it the folder is still there. */
const zipUp = (dir: string) => new Promise<string>((res, rej) => {
  const out = `${dir}.zip`;
  execFile('zip', ['-r', '-q', out, dir.split('/').pop()!],
    { cwd: dirname(dir), timeout: 120_000 }, e => e ? rej(e) : res(out));
});

export const listExports = async () => {
  const names = existsSync(EXPORTS) ? await readdir(EXPORTS) : [];
  return names.filter(n => n.endsWith('-figma'));
};


/** The campaign as one self-contained file, for the Figma plugin.
 *
 *  Everything travels inside it -- the layers, the photographs as base64, the
 *  vector marks as SVG. The plugin then needs no network permission at all,
 *  which is what lets it be shared rather than only run from a checkout, and
 *  means a campaign can be mailed, archived or opened next year without the
 *  studio being up.
 *
 *  Borrowed wholesale from meta_ads_template_image_v1, which had already
 *  worked out that a file beats a fetch here.
 */
type BriefShape = {
  build?: { frame: string; assetId: string; width: number; height: number;
            layers: Record<string, unknown>[] }[];
  fontsNeeded?: string[];
};

export async function figmaDocument(
  session: string, name: string, revision: string, assets: Asset[], origin: string,
  ready?: BriefShape,
): Promise<Record<string, unknown>> {
  // An export already has the brief in hand. Re-rendering twenty-two assets a
  // second time to produce the same numbers would be a minute of browsers for
  // nothing.
  const brief = ready ?? (await briefOnly(session, name, assets, origin)) as BriefShape;

  const bytes: Record<string, string> = {};
  const vectors: Record<string, string> = {};

  const read = async (rel: string) => {
    const publicRoot = PUBLIC;
    if (rel.startsWith('media/'))
      return readFile(join(publicRoot, rel.slice('media/'.length))).catch(() => null);
    // Older briefs used flattened paths. Keep those readable, but all new
    // exports retain the real source directory above.
    const leaf = rel.split('/').pop()!;
    const dirs = rel.startsWith('photographs/') ? ['photos', 'reference', 'graphics']
      : rel.startsWith('logos/') ? ['logos'] : [];
    for (const dir of dirs) {
      const raw = await readFile(join(publicRoot, dir, leaf)).catch(() => null);
      if (raw) return raw;
    }
    return null;
  };

  // An upload arrives as the picture itself. It is given a name on the way
  // out so the bundle holds it once and the layer points at it, rather than
  // carrying a megabyte of base64 twice over.
  const named = new Map<string, string>();
  for (const f of brief.build ?? []) for (const l of f.layers) {
    if (l.type !== 'image' || typeof l.src !== 'string') continue;
    if (l.src.startsWith('data:')) {
      const was = l.src;
      let name = named.get(was);
      if (!name) {
        const comma = was.indexOf(',');
        const meta = was.slice(5, comma), body = was.slice(comma + 1);
        const ext = /svg/i.test(meta) ? 'svg' : /png/i.test(meta) ? 'png'
                  : /jpe?g/i.test(meta) ? 'jpg' : /webp/i.test(meta) ? 'webp' : 'bin';
        name = `uploads/upload-${named.size + 1}.${ext}`;
        named.set(was, name);
        const b64 = /;base64/i.test(meta);
        if (ext === 'svg') vectors[name] = b64
          ? Buffer.from(body, 'base64').toString('utf8') : decodeURIComponent(body);
        else bytes[name] = b64
          ? body : Buffer.from(decodeURIComponent(body), 'binary').toString('base64');
      }
      (l as { src: string }).src = name;
      continue;
    }
    const src = l.src;
    if (bytes[src] || vectors[src]) continue;
    const raw = await read(src);
    if (!raw) throw Error(`Export image not found: ${src}`);
    // An SVG arrives as editable vector paths rather than a picture of a
    // shape, which is the difference between a mark a designer can recolour
    // and one they have to replace.
    if (/\.svg$/i.test(src)) vectors[src] = raw.toString('utf8');
    else bytes[src] = raw.toString('base64');
  }

  return {
    schema: 'sac-studio/1',
    project: { id: session, name, revision, width: 0, height: 0 },
    fontsNeeded: brief.fontsNeeded ?? [],
    variants: (brief.build ?? []).map(f => ({
      id: f.assetId, name: f.frame, width: f.width, height: f.height, layers: f.layers,
    })),
    assets: bytes,
    vectors,
  };
}
