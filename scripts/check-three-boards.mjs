import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  await vite.ssrLoadModule('/scripts/check-three-boards.tsx');
} finally {
  await vite.close();
}
