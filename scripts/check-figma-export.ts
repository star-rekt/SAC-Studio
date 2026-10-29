import assert from 'node:assert/strict';
import { bundledImage, figmaDocument } from '../server/export.ts';

const paths = [
  '/reference/bump-window.png',
  '/photos/hike-07.jpg',
  '/logos/sac-logo.png',
  '/graphics/circle-1.svg',
  // A compiled template's own board image (Bump 2's default photo).
  '/figma-assets/345302902cffaea91d8cb3aa85fc7f71c3cd817f.png',
];
const layers = paths.map(src => bundledImage({ type: 'image', src }));
assert.deepEqual(layers.map(l => l.src), paths.map(src => `media${src}`));

const brief = { build: [{ frame: '01-smoke', assetId: 'smoke', width: 1080,
  height: 1080, layers }] };
const doc = await figmaDocument('smoke', 'Smoke', 'test', [], 'http://localhost:5178', brief);
const variants = doc.variants as { id: string; layers: { src: string }[] }[];
const assets = doc.assets as Record<string, string>;
const vectors = doc.vectors as Record<string, string>;
assert.deepEqual(variants.map(v => v.id), ['smoke']);
for (const layer of layers) {
  const src = layer.src as string;
  assert.ok(assets[src] || vectors[src], `${src} was not embedded`);
}
assert.equal(Object.keys(assets).length + Object.keys(vectors).length, paths.length);

await assert.rejects(figmaDocument('smoke', 'Smoke', 'test', [], 'http://localhost:5178',
  { build: [{ ...brief.build[0], layers: [{ type: 'image', src: 'media/reference/not-here.png' }] }] }),
  /Export image not found/);
console.log('Figma export: one frame, exact used media, missing media fails');
