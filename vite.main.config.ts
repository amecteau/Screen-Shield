import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  build: {
    outDir: 'dist/main',
    lib: {
      entry: resolve(__dirname, 'src/main/index.ts'),
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: [
        'electron',
        'electron-store',
        'electron-updater',
        'node:path',
        'node:fs',
        'node:crypto',
        'node:url',
        'node:os',
      ],
    },
    target: 'node22',
    sourcemap: true,
    minify: false,
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@main': resolve(__dirname, 'src/main'),
      '@shared': resolve(__dirname, 'src/renderer/shared'),
    },
  },
});
