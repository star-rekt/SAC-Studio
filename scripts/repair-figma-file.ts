/** Repair a legacy .figma.json whose layers point at media omitted by an old
 * connector. This only rebundles existing layers and local library images; it
 * does not render, export, or change any campaign layout. */
import { readFile, writeFile, rename } from 'node:fs/promises';
import { dirname } from 'node:path';
import { figmaDocument } from '../server/export.ts';

const [input, output] = process.argv.slice(2);
if (!input || !output || input === output)
  throw Error('Usage: node --import tsx scripts/repair-figma-file.ts input.figma.json output.figma.json');

const old = JSON.parse(await readFile(input, 'utf8')) as {
  schema?: string;
  project: { id: string; name: string; revision: string };
  fontsNeeded?: string[];
  variants: { id: string; name: string; width: number; height: number;
    layers: Record<string, unknown>[] }[];
};
if (old.schema !== 'sac-studio/1' || !Array.isArray(old.variants))
  throw Error('Not a SAC Studio Figma file');

const ready = { build: old.variants.map(v => ({ frame: v.name, assetId: v.id,
  width: v.width, height: v.height, layers: v.layers })),
  fontsNeeded: old.fontsNeeded };
const doc = await figmaDocument(old.project.id, old.project.name,
  old.project.revision, [], '', ready);
doc.project = old.project;

const assets = doc.assets as Record<string, string>;
const vectors = doc.vectors as Record<string, string>;
const variants = doc.variants as typeof old.variants;
const missing = [...new Set(variants.flatMap(v => v.layers
  .filter(l => l.type === 'image').map(l => String(l.src))))]
  .filter(src => !(src in assets) && !(src in vectors));
if (missing.length) throw Error(`Still missing ${missing.length} images: ${missing[0]}`);

const temp = `${output}.${process.pid}.tmp`;
await writeFile(temp, JSON.stringify(doc));
await rename(temp, output);
console.log(`Repaired ${variants.length} frames; embedded ${Object.keys(assets).length} images `
  + `and ${Object.keys(vectors).length} vectors in ${dirname(output)}`);
