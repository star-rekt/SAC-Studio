/** Where a photograph's subject is, and which third of it copy can sit on --
 *  worked out on-device, with no model calls and no tokens.
 *
 *  Two MediaPipe detectors (bundled WASM + public/models/*.tflite, so it works
 *  offline and inside the desktop app's CSP): EfficientDet-Lite0 for people
 *  and the COCO gear classes our pursuits actually show (skis, snowboard,
 *  surfboard, bicycle, kite, boat, backpack), and BlazeFace for faces, which
 *  become `keep` boxes -- never cropped, never covered (as does the head of
 *  any person whose face it can't see). A photo with nothing
 *  detectable (a landscape, a swimmer far out on the water) gets a second
 *  look from Claude (a 512px copy, once, cached -- the only model call here),
 *  and only if that finds nothing either falls back to a cheap saliency map:
 *  edge energy plus colour distance from the image mean, on a 128px downscale.
 *
 *  Every box is normalised 0-1 on the SOURCE image, [x, y, w, h] -- the same
 *  convention as zones.json's `rect` -- so framing (autoFrame.ts) can map it
 *  through any crop. Each photo is analysed once: results are cached by a
 *  hash of its src on the server (GET/PUT /api/photo-analysis), so no asset,
 *  placement or restart ever pays for the same photo twice. */
import wasmLoaderPath from '@mediapipe/tasks-vision/vision_wasm_internal.js?url';
import wasmBinaryPath from '@mediapipe/tasks-vision/vision_wasm_internal.wasm?url';
import type { ObjectDetector, FaceDetector, PoseLandmarker, NormalizedLandmark } from '@mediapipe/tasks-vision';

export type Box = [number, number, number, number];
/** A part of the photo that matters, by how much it matters: a head is never
 *  covered, torso and arms (and what the hands hold) hardly ever, legs and
 *  loose gear only when nothing better exists. `subject` is a whole subject
 *  with no body parts known (Claude's or saliency's box). */
export type RegionKind = 'head' | 'torso' | 'arms' | 'legs' | 'gear' | 'subject';
export type Region = { kind: RegionKind; box: Box };
export type PhotoAnalysis = {
  v: number;
  /** Body parts (from MediaPipe Pose, or split from a person box when pose
   *  isn't sure), held gear, and faces -- what composition protects. */
  regions: Region[];
  /** Each person's whole body, for framing (headroom, size, thirds). */
  people: Box[];
  /** Which side the copy belongs on for this photo -- opposite the subject,
   *  or the calmer side when the subject is centred. The same for every
   *  format the photo is used in, so all sends tell one story. */
  copySide: 'left' | 'right';
  subject: Box;
  /** Each person or piece of gear on its own -- every one is kept whole and
   *  clear of the copy, without the empty gap between two people counting. */
  parts: Box[];
  keep: Box[];
  /** How busy each cell of a GRID_W x GRID_H grid over the source is, 0-1 --
   *  calm cells (sky, snow, rock) are where a card reads best. Row-major. */
  grid: number[];
  side: 'left' | 'right' | 'centre';
  dark: boolean;
  via: 'detector' | 'claude' | 'saliency';
};

// Bump when the analysis itself changes, so cached results from an older
// version are recomputed rather than trusted.
const VERSION = 7;
const SUBJECTS = new Set(['person', 'skis', 'snowboard', 'surfboard', 'bicycle', 'kite',
  'boat', 'backpack', 'dog', 'horse', 'skateboard', 'sports ball']);
// Detections smaller than this share of the frame are noise, not a subject.
const MIN_AREA = 0.002;
const MAP_W = 128;
export const GRID_W = 16, GRID_H = 10;

let detectors: Promise<{ objects: ObjectDetector; faces: FaceDetector; poses: PoseLandmarker } | null> | null = null;
const loadDetectors = () => detectors ??= (async () => {
  const { ObjectDetector, FaceDetector, PoseLandmarker } = await import('@mediapipe/tasks-vision');
  const fileset = { wasmLoaderPath, wasmBinaryPath };
  const [objects, faces, poses] = await Promise.all([
    ObjectDetector.createFromOptions(fileset, { runningMode: 'IMAGE', scoreThreshold: 0.35, maxResults: 10,
      baseOptions: { modelAssetPath: '/models/efficientdet_lite0.tflite', delegate: 'CPU' } }),
    FaceDetector.createFromOptions(fileset, { runningMode: 'IMAGE', minDetectionConfidence: 0.5,
      baseOptions: { modelAssetPath: '/models/blaze_face_short_range.tflite', delegate: 'CPU' } }),
    PoseLandmarker.createFromOptions(fileset, { runningMode: 'IMAGE', numPoses: 6, minPoseDetectionConfidence: 0.4,
      baseOptions: { modelAssetPath: '/models/pose_landmarker_lite.task', delegate: 'CPU' } }),
  ]);
  return { objects, faces, poses };
})().catch(error => { // no detectors -> saliency only, never a failed analysis
  console.warn('Smart placement: photo detectors failed to load, using saliency only.', error);
  return null;
});

const union = (boxes: Box[]): Box => {
  const x0 = Math.min(...boxes.map(b => b[0])), y0 = Math.min(...boxes.map(b => b[1]));
  const x1 = Math.max(...boxes.map(b => b[0] + b[2])), y1 = Math.max(...boxes.map(b => b[1] + b[3]));
  return [x0, y0, x1 - x0, y1 - y0];
};
const pad = ([x, y, w, h]: Box, by: number): Box => {
  const x0 = Math.max(0, x - w * by), y0 = Math.max(0, y - h * by);
  return [x0, y0, Math.min(1, x + w * (1 + by)) - x0, Math.min(1, y + h * (1 + by)) - y0];
};

/** A person's body parts from their pose landmarks, built in pixels so the
 *  padding is the same in both directions whatever the photo's shape. Only
 *  landmarks the model is reasonably sure of are used; a part with none is
 *  left out. MediaPipe's indices: 0-10 face, 11-12 shoulders, 13-16 elbows
 *  and wrists, 17-22 hands, 23-24 hips, 25-28 knees and ankles, 29-32 feet. */
function bodyFromPose(lm: NormalizedLandmark[], nw: number, nh: number): Region[] {
  const at = (i: number) => lm[i] && (lm[i].visibility ?? 1) > 0.5 ? [lm[i].x * nw, lm[i].y * nh] : null;
  const pts = (ids: number[]) => ids.map(at).filter((p): p is number[] => !!p);
  const s0 = at(11), s1 = at(12);
  const shoulder = s0 && s1 ? Math.hypot(s0[0] - s1[0], s0[1] - s1[1]) : 0;
  const boxOf = (ps: number[][], padX: number, padTop: number, padBottom = padTop): Box | null => {
    if (!ps.length) return null;
    const x0 = Math.min(...ps.map(p => p[0])) - padX, x1 = Math.max(...ps.map(p => p[0])) + padX;
    const y0 = Math.min(...ps.map(p => p[1])) - padTop, y1 = Math.max(...ps.map(p => p[1])) + padBottom;
    const bx = Math.max(0, x0 / nw), by = Math.max(0, y0 / nh);
    return [bx, by, Math.min(1, x1 / nw) - bx, Math.min(1, y1 / nh) - by];
  };
  const face = pts([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  // A head is bigger than its landmarks: hair, a hat, a helmet above them.
  const unit = Math.max(shoulder * 0.3, face.length > 1
    ? Math.max(...face.map(p => p[0])) - Math.min(...face.map(p => p[0])) : 0, Math.min(nw, nh) * 0.015);
  const parts: [RegionKind, Box | null][] = [
    ['head', boxOf(face, unit * 0.35, unit * 0.9, unit * 0.45)],
    ['torso', boxOf(pts([11, 12, 23, 24]), shoulder * 0.15, shoulder * 0.1)],
    // Hands padded wide: what they hold (a pole, a float, a ball) is theirs.
    ['arms', boxOf(pts([11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22]), shoulder * 0.35, shoulder * 0.25)],
    ['legs', boxOf(pts([23, 24, 25, 26, 27, 28, 29, 30, 31, 32]), shoulder * 0.15, shoulder * 0.05, shoulder * 0.15)],
  ];
  return parts.filter((p): p is [RegionKind, Box] => !!p[1]).map(([kind, box]) => ({ kind, box }));
}

/** A person box split the way a body usually stacks, for when pose isn't
 *  sure (far away, partly hidden, or a box from Claude). */
const bodyFromBox = ([x, y, w, h]: Box): Region[] => [
  { kind: 'head', box: [x + w * 0.2, y, w * 0.6, h * 0.18] },
  { kind: 'torso', box: [x, y + h * 0.12, w, h * 0.45] },
  { kind: 'legs', box: [x, y + h * 0.55, w, h * 0.45] },
];

/** Copy goes opposite the people; when they're centred, on the calmer half. */
function copySideFor(people: Box[], subject: Box, grid: number[]): 'left' | 'right' {
  const [x, , w] = people.length ? union(people) : subject;
  const cx = x + w / 2;
  if (cx < 0.45) return 'right';
  if (cx > 0.55) return 'left';
  let left = 0, right = 0;
  grid.forEach((v, i) => { if (i % GRID_W < GRID_W / 2) left += v; else right += v; });
  return left <= right ? 'left' : 'right';
}

/** Luma and a 0-1 saliency energy per cell of a MAP_W-wide downscale. */
function energyMap(img: HTMLImageElement) {
  const w = MAP_W, h = Math.max(1, Math.round(MAP_W * img.naturalHeight / img.naturalWidth));
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, w, h);
  const px = ctx.getImageData(0, 0, w, h).data;
  const luma = new Float32Array(w * h);
  let mr = 0, mg = 0, mb = 0;
  for (let i = 0; i < w * h; i++) {
    const r = px[i * 4], g = px[i * 4 + 1], b = px[i * 4 + 2];
    luma[i] = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    mr += r; mg += g; mb += b;
  }
  mr /= w * h; mg /= w * h; mb /= w * h;
  const edge = new Float32Array(w * h), colour = new Float32Array(w * h);
  let maxEdge = 1e-6, maxColour = 1e-6;
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      const at = (dx: number, dy: number) => luma[(y + dy) * w + x + dx];
      const gx = at(1, -1) + 2 * at(1, 0) + at(1, 1) - at(-1, -1) - 2 * at(-1, 0) - at(-1, 1);
      const gy = at(-1, 1) + 2 * at(0, 1) + at(1, 1) - at(-1, -1) - 2 * at(0, -1) - at(1, -1);
      const i = y * w + x;
      edge[i] = Math.hypot(gx, gy);
      colour[i] = Math.hypot(px[i * 4] - mr, px[i * 4 + 1] - mg, px[i * 4 + 2] - mb);
      maxEdge = Math.max(maxEdge, edge[i]); maxColour = Math.max(maxColour, colour[i]);
    }
  const energy = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) energy[i] = 0.5 * edge[i] / maxEdge + 0.5 * colour[i] / maxColour;
  return { w, h, luma, energy };
}

/** Where the busiest tenth of the image sits: the centroid of its
 *  highest-energy cells, plus or minus 1.2 standard deviations. (The middle
 *  70% of ALL energy came back as the same centred ~70% box for every photo
 *  -- texture is everywhere in an outdoor shot -- which made it useless.) */
function energyBox({ w, h, energy }: ReturnType<typeof energyMap>): Box {
  const cut = [...energy].sort((a, b) => b - a)[Math.floor(energy.length * 0.1)] ?? 0;
  let n = 0, sx = 0, sy = 0, sxx = 0, syy = 0;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (energy[y * w + x] < cut) continue;
      const u = (x + 0.5) / w, v = (y + 0.5) / h;
      n++; sx += u; sy += v; sxx += u * u; syy += v * v;
    }
  if (!n) return [0.25, 0.25, 0.5, 0.5];
  const cx = sx / n, cy = sy / n;
  const dx = 1.2 * Math.sqrt(Math.max(0, sxx / n - cx * cx)), dy = 1.2 * Math.sqrt(Math.max(0, syy / n - cy * cy));
  const x0 = Math.max(0, cx - dx), y0 = Math.max(0, cy - dy);
  return [x0, y0, Math.min(1, cx + dx) - x0, Math.min(1, cy + dy) - y0];
}

/** Mean saliency energy per cell of a GRID_W x GRID_H grid, normalised so
 *  the busiest cell is 1. */
function gridOf({ w, h, energy }: ReturnType<typeof energyMap>): number[] {
  const sums = new Array(GRID_W * GRID_H).fill(0), counts = new Array(GRID_W * GRID_H).fill(0);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const cell = Math.min(GRID_H - 1, Math.floor(y * GRID_H / h)) * GRID_W + Math.min(GRID_W - 1, Math.floor(x * GRID_W / w));
      sums[cell] += energy[y * w + x]; counts[cell]++;
    }
  const means = sums.map((sum, i) => sum / Math.max(1, counts[i]));
  const top = Math.max(...means, 1e-6);
  return means.map(m => +(m / top).toFixed(3));
}

/** The third with the least subject and least busy texture is where copy goes;
 *  `dark` is whether that third is dark enough for white type. */
function sideFor(map: ReturnType<typeof energyMap>, subject: Box): Pick<PhotoAnalysis, 'side' | 'dark'> {
  const sides = ['left', 'centre', 'right'] as const;
  const { w, h, luma, energy } = map;
  let total = 1e-6;
  const busy = [0, 0, 0], light = [0, 0, 0], cells = [0, 0, 0];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const t = Math.min(2, Math.floor(3 * x / w)), i = y * w + x;
      busy[t] += energy[i]; light[t] += luma[i]; cells[t]++; total += energy[i];
    }
  const [sx, , sw] = subject;
  const covered = (t: number) => Math.max(0, Math.min(sx + sw, (t + 1) / 3) - Math.max(sx, t / 3)) / Math.max(sw, 1e-6);
  const score = sides.map((_, t) => busy[t] / total + 2 * covered(t));
  const best = score.indexOf(Math.min(...score));
  return { side: sides[best], dark: light[best] / Math.max(1, cells[best]) < 0.5 };
}

type Located = { p: Box[]; h: Box[]; s: Box | null };

/** The second look: a photo the detectors found nothing in goes to Claude
 *  (POST /ai/photo) as a 512px JPEG, once -- the result is cached with the
 *  rest of the analysis. `null` when Claude isn't available or says nothing
 *  useful, and the saliency guess stands. */
async function locateWithClaude(img: HTMLImageElement): Promise<Located | null> {
  const canvas = document.createElement('canvas');
  const k = Math.min(1, 512 / Math.max(img.naturalWidth, img.naturalHeight));
  canvas.width = Math.round(img.naturalWidth * k); canvas.height = Math.round(img.naturalHeight * k);
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
  const response = await fetch('/ai/photo', { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ image: canvas.toDataURL('image/jpeg', 0.8) }) }).catch(() => null);
  if (!response?.ok) return null;
  const found = await response.json() as Located;
  return found.p.length || found.h.length || found.s ? found : null;
}

export async function analysePhoto(img: HTMLImageElement,
  confirm: (img: HTMLImageElement) => Promise<Located | null> = locateWithClaude): Promise<PhotoAnalysis> {
  const map = energyMap(img);
  const nw = img.naturalWidth, nh = img.naturalHeight;
  const toBox = (b: { originX: number; originY: number; width: number; height: number }): Box =>
    [b.originX / nw, b.originY / nh, b.width / nw, b.height / nh];
  const found = await loadDetectors();
  const subjects: Box[] = [], keep: Box[] = [], people: Box[] = [];
  const regions: Region[] = [], bodies: Box[] = [];
  if (found) {
    for (const lm of found.poses.detect(img).landmarks) {
      const body = bodyFromPose(lm, nw, nh);
      const torso = body.find(r => r.kind === 'torso')?.box;
      if (!torso) continue;
      // The pose model sometimes reports one person twice, the second time
      // badly (legs up at arm height): a torso inside someone already found
      // is that ghost, not a second person.
      const tx = torso[0] + torso[2] / 2, ty = torso[1] + torso[3] / 2;
      if (bodies.some(([x, y, w, h]) => tx > x && tx < x + w && ty > y && ty < y + h)) continue;
      regions.push(...body);
      bodies.push(union(body.map(r => r.box)));
    }
    for (const d of found.objects.detect(img).detections) {
      const name = d.categories[0]?.categoryName;
      if (!d.boundingBox || !name || !SUBJECTS.has(name)) continue;
      const box = toBox(d.boundingBox);
      // A weak "person" is usually a bush or a rock; only a confident one is
      // somebody whose head has to be protected.
      if (name === 'person' && (d.categories[0]?.score ?? 0) < 0.5) continue;
      subjects.push(box);
      if (name === 'person') people.push(box);
      else if (box[2] * box[3] >= MIN_AREA) regions.push({ kind: 'gear', box });
    }
    for (const d of found.faces.detect(img).detections)
      if (d.boundingBox) keep.push(pad(toBox(d.boundingBox), 0.15));
  }
  const faces = [...keep]; // detected faces only, before the guessed heads below
  // A head is as untouchable as a face, and helmets, goggles and turned
  // heads hide faces from BlazeFace: the top of every person box without a
  // detected face in it is kept too, so no crop ever loses someone's head.
  for (const [x, y, w, h] of people) {
    const head: Box = [x + w * 0.2, y, w * 0.6, h * 0.18];
    const hasFace = keep.some(([fx, fy, fw, fh]) => fx + fw / 2 > x && fx + fw / 2 < x + w && fy + fh / 2 < y + h * 0.4);
    if (!hasFace) keep.push(head);
  }
  // People the pose model missed (small, far, half-hidden) still count, by
  // their box split into head / torso / legs.
  for (const person of people.filter(b => b[2] * b[3] >= MIN_AREA)) {
    const cx = person[0] + person[2] / 2, cy = person[1] + person[3] / 2;
    if (bodies.some(([x, y, w, h]) => cx > x && cx < x + w && cy > y && cy < y + h)) continue;
    regions.push(...bodyFromBox(person));
    bodies.push(person);
  }
  // A face only counts on a body we found (or when we found nobody): a lone
  // "face" in a bush is BlazeFace being optimistic.
  for (const face of faces) {
    const cx = face[0] + face[2] / 2, cy = face[1] + face[3] / 2;
    if (!bodies.length || bodies.some(([x, y, w, h]) => cx > x && cx < x + w && cy > y - h * 0.1 && cy < y + h))
      regions.push({ kind: 'head', box: face });
  }
  let parts = subjects.filter(b => b[2] * b[3] >= MIN_AREA);
  let real = [...parts, ...keep.filter(b => b[2] * b[3] >= MIN_AREA)];
  let via: PhotoAnalysis['via'] = real.length ? 'detector' : 'saliency';
  if (!real.length) {
    const found = await confirm(img);
    if (found) {
      parts = found.p.length ? found.p : found.s ? [found.s] : [];
      keep.push(...found.h);
      for (const p of found.p) { regions.push(...bodyFromBox(p as Box)); bodies.push(p as Box); }
      for (const h of found.h) regions.push({ kind: 'head', box: h as Box });
      if (!found.p.length && found.s) regions.push({ kind: 'subject', box: found.s as Box });
      real = [...parts, ...found.h];
      via = 'claude';
    }
  }
  const subject = real.length ? union(real) : energyBox(map);
  if (!regions.length) regions.push({ kind: 'subject', box: subject });
  const grid = gridOf(map);
  return { v: VERSION, regions, people: bodies, copySide: copySideFor(bodies, subject, grid),
    subject, parts: parts.length ? parts : [subject], keep, grid,
    ...sideFor(map, subject),
    via };
}

let table: Promise<Record<string, PhotoAnalysis>> | null = null;
const cached = () => table ??= fetch('/api/photo-analysis')
  .then(r => r.ok ? r.json() : { items: {} }).then(j => j.items ?? {}).catch(() => ({}));
const hashOf = async (src: string) => [...new Uint8Array(
  await crypto.subtle.digest('SHA-256', new TextEncoder().encode(src)))]
  .map(b => b.toString(16).padStart(2, '0')).join('');
const memo = new Map<string, Promise<PhotoAnalysis | null>>();

/** The analysis for a photo src, from memory, then the server's cache, and
 *  only then by actually running it (and keeping the result). `null` when the
 *  image cannot be loaded -- callers leave the photo exactly as it was. */
export function analysisFor(src: string): Promise<PhotoAnalysis | null> {
  let pending = memo.get(src);
  if (!pending) {
    pending = (async () => {
      const [hash, known] = await Promise.all([hashOf(src), cached()]);
      if (known[hash]?.v === VERSION) return known[hash];
      const img = new Image();
      img.src = src;
      await img.decode();
      const analysis = await analysePhoto(img);
      known[hash] = analysis;
      void fetch(`/api/photo-analysis/${hash}`, { method: 'PUT',
        headers: { 'content-type': 'application/json' }, body: JSON.stringify(analysis) }).catch(() => {});
      return analysis;
    })().catch(() => null);
    memo.set(src, pending);
  }
  return pending;
}
