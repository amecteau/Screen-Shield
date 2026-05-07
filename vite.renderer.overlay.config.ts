import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  root: resolve(__dirname, 'src/renderer/overlay'),
  base: './',
  build: {
    outDir: resolve(__dirname, 'dist/renderer/overlay'),
    emptyOutDir: true,
    sourcemap: true,
  },
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/renderer/shared'),
    },
  },
});
