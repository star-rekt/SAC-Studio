import { join } from 'node:path';

// Both the source server/ and the bundled dist-desktop/ sit one level below
// the application root. Only user data moves outside the installed app.
export const ROOT = join(import.meta.dirname, '..');
export const DATA = process.env.SAC_STUDIO_DATA_DIR || join(ROOT, 'data');
export const UI = join(ROOT, 'dist');
// Vite copies public/ into dist/; the installed app needs one copy, not two.
export const PUBLIC = process.env.SAC_STUDIO_DESKTOP === '1' ? UI : join(ROOT, 'public');
