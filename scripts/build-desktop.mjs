import { build } from 'esbuild';
import { cp, mkdir } from 'node:fs/promises';

await mkdir('dist-desktop', { recursive: true });
await build({
  entryPoints: ['server/index.ts'],
  outfile: 'dist-desktop/server.mjs',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  packages: 'external',
  sourcemap: false,
});
await cp('server/rules.md', 'dist-desktop/rules.md');
