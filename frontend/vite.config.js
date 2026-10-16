import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // The preview build (npm run build:demo) is published as a page inside a
  // folder, so its asset URLs must be relative and it gets its own output.
  ...(mode === 'preview' ? { base: './', build: { outDir: 'dist-preview', assetsInlineLimit: 100_000_000 } } : {}),
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
}));
