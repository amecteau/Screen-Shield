import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  root: resolve(__dirname, 'src/renderer/settings'),
  base: './',
  build: {
    outDir: resolve(__dirname, 'dist/renderer/settings'),
    emptyOutDir: true,
    sourcemap: true,
  },
  resolve: {
    alias: {
      '@renderer': resolve(__dirname, 'src/renderer'),
      '@shared': resolve(__dirname, 'src/renderer/shared'),
    },
  },
});
