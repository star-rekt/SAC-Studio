import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// A genuinely separate dev server for Bump template work -- its own port, its
// own root, no changes to the real studio's index.html/App.tsx/routing. It
// stays up independent of the main studio server (`npm run dev`), so killing
// or restarting one never takes down the other.
export default defineConfig({
  root: 'dev/bump-preview',
  // Vite's publicDir defaults to <root>/public, which with root moved here
  // stopped being the real project's public/ -- every logo, reference photo
  // and graphic the components reference by an absolute /path went missing
  // silently (browser-side 404, not a build error) until this pointed back
  // at it explicitly.
  publicDir: '../../public',
  plugins: [react()],
  // Same as the studio's: MediaPipe is one ESM bundle the dep optimizer must
  // not rediscover mid-session, and its gallery/analysis/AI routes live on
  // the studio's server.
  optimizeDeps: { exclude: ['@mediapipe/tasks-vision'] },
  server: { port: 5181, strictPort: true, open: true,
    proxy: {
      '/ai': { target: `http://127.0.0.1:${process.env.SAC_AI_PORT ?? 5179}`, changeOrigin: true },
      '/api': { target: `http://127.0.0.1:${process.env.SAC_AI_PORT ?? 5179}`, changeOrigin: true },
    } },
});
