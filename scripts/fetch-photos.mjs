/** Pulls the 31 catalogued photographs out of the design-system library.
 *
 *  The app runs without them -- a missing photograph draws as a stand-in
 *  carrying its own id and surface, so layout and type are judgeable straight
 *  away and a missing picture looks missing rather than looking like a
 *  decision. This fills them in for real.
 *
 *    FIGMA_TOKEN=figd_... npm run photos
 *
 *  The zones record a published COMPONENT KEY each. The REST API renders by
 *  node id, not by key, so each key is resolved through /v1/components/:key
 *  first -- one call per photograph, then one batched render call.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const TOKEN = process.env.FIGMA_TOKEN;
if (!TOKEN) {
  console.error('FIGMA_TOKEN is not set. Create a personal access token in Figma\n'
    + '(Settings > Security > Personal access tokens) and run:\n\n'
    + '  FIGMA_TOKEN=figd_... npm run photos\n');
  process.exit(1);
}
const api = async (path) => {
  const r = await fetch('https://api.figma.com/v1' + path, { headers: { 'X-Figma-Token': TOKEN } });
  if (!r.ok) throw new Error(`${path} -> ${r.status} ${r.statusText}`);
  return r.json();
};

const zones = JSON.parse(readFileSync(new URL('../src/data/zones.json', import.meta.url))).zones;
mkdirSync(new URL('../public/photos/', import.meta.url), { recursive: true });

// key -> { fileKey, nodeId }
const found = [];
for (const z of zones) {
  try {
    const { meta } = await api(`/components/${z.key}`);
    found.push({ id: z.id, file: meta.file_key, node: meta.node_id });
    process.stdout.write('.');
  } catch (e) {
    process.stdout.write('x');
    console.error(`\n  ${z.id}: ${e.message}`);
  }
}
console.log(`\nresolved ${found.length}/${zones.length}`);

// Render them, batched per file.
const byFile = {};
for (const f of found) (byFile[f.file] ??= []).push(f);

let saved = 0;
for (const [file, list] of Object.entries(byFile)) {
  const ids = list.map(l => l.node).join(',');
  const { images } = await api(`/images/${file}?ids=${encodeURIComponent(ids)}&format=jpg&scale=2`);
  for (const l of list) {
    const url = images[l.node];
    if (!url) { console.error(`  ${l.id}: no render returned`); continue; }
    const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
    writeFileSync(new URL(`../public/photos/${l.id}.jpg`, import.meta.url), buf);
    saved++;
    process.stdout.write('.');
  }
}
console.log(`\nsaved ${saved} photograph(s) to public/photos/`);
