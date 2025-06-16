/// <reference types='vitest' />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import * as path from 'path';

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../../node_modules/.vite/packages/ui/linked-panels-docs',
  plugins: [
    react(),
  ],
  // Configuration for building documentation site
  build: {
    outDir: './docs-dist',
    emptyOutDir: true,
    reportCompressedSize: true,
    // Standard app build for docs site
    rollupOptions: {
      input: 'src/docs/index.html', // Future docs entry point
    },
  },
  // Development server for docs
  server: {
    port: 4200,
    host: 'localhost',
  },
  // Resolve for docs development
  resolve: {
    alias: {
      'linked-panels': path.resolve(__dirname, 'src'),
    },
  },
  // Test configuration (kept for completeness)
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../../coverage/packages/ui/linked-panels',
      provider: 'v8' as const,
    },
  },
}));
