import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The Bump position check (dev/bump-positions): its own server and port so
// the Flash check on 5181 (dev/bump-preview/positions.html) stays as it is.
// Same public dir and API proxy as the Bump preview.
export default defineConfig({
  root: 'dev/bump-positions',
  publicDir: '../../public',
  plugins: [react()],
  optimizeDeps: { exclude: ['@mediapipe/tasks-vision'] },
  server: { port: 5182, strictPort: true,
    proxy: {
      '/ai': { target: `http://127.0.0.1:${process.env.SAC_AI_PORT ?? 5179}`, changeOrigin: true },
      '/api': { target: `http://127.0.0.1:${process.env.SAC_AI_PORT ?? 5179}`, changeOrigin: true },
    } },
});
