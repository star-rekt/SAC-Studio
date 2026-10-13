import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
mkdirSync('dist', { recursive: true });
await build({ entryPoints: ['src/main.ts'], bundle: true, outfile: 'dist/code.js',
  format: 'iife', target: 'es2017', logLevel: 'info' });
const ui = await build({ entryPoints: ['src/ui.ts'], bundle: true, write: false,
  format: 'iife', target: 'es2017', logLevel: 'info' });
const html = readFileSync('src/ui.html', 'utf8')
  .replace('/*INLINE_JS*/', () => ui.outputFiles[0].text);
writeFileSync('dist/ui.html', html);
console.log('dist/ui.html written');
