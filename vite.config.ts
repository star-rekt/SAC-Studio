import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// /ai goes to the connector, so the app talks to one origin and there is
// nothing to configure. If the connector is not running the calls 503 and the
// panel says so rather than the page half-working.
export default defineConfig({
  plugins: [react()],
  // Already one ESM bundle. Left to the dep optimizer it is only discovered
  // when smart placement first dynamic-imports it, which re-optimizes and
  // fails that very import -- so the detectors silently never loaded.
  optimizeDeps: { exclude: ['@mediapipe/tasks-vision'] },
  server: {
    // strictPort because the alternative is worse than failing: Vite's default
    // is to hunt for a free port, and the next one up is the connector's. It
    // lands there, /ai and /api proxy to themselves, and the studio looks up
    // while quietly running against nothing.
    port: 5178, strictPort: true, open: true,
    proxy: {
      '/ai': { target: `http://127.0.0.1:${process.env.SAC_AI_PORT ?? 5179}`, changeOrigin: true },
      '/api': { target: `http://127.0.0.1:${process.env.SAC_AI_PORT ?? 5179}`, changeOrigin: true },
    },
  },
});
