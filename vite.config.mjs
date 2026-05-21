/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// CRA → Vite migration. Two non-obvious bits:
// - JSX lives in `.js` files (CRA style), so esbuild needs the JSX loader
//   for that extension during both dev and dep pre-bundling.
// - outDir kept as `build/` so existing deploy paths don't need to change.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'build',
    rollupOptions: {
      output: {
        // Function-based chunking: needed because recharts pulls in d3 via
        // scoped sub-packages (`d3-shape`, `d3-scale`, ...) and an
        // exact-array match would miss them. Visualization libs share
        // enough internals that splitting chart and motion separately
        // produces a circular chunk warning — merging them into one
        // viz-vendor avoids that.
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) {
            return 'react-vendor';
          }
          if (
            id.includes('recharts') ||
            id.includes('victory-vendor') ||
            /[\\/]node_modules[\\/]d3(-|[\\/])/.test(id) ||
            id.includes('framer-motion') ||
            id.includes('@react-spring') ||
            /[\\/]node_modules[\\/]react-spring[\\/]/.test(id)
          ) {
            return 'viz-vendor';
          }
          // html2canvas alone is ~150 kB raw — split it so the catch-all
          // vendor bundle stays under the 500 kB warning threshold.
          if (id.includes('html2canvas')) {
            return 'canvas-vendor';
          }
          return 'vendor';
        },
      },
    },
  },
  esbuild: {
    loader: 'jsx',
    include: /src\/.*\.jsx?$/,
    exclude: [],
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: { '.js': 'jsx' },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/setupTests.js'],
    css: false,
  },
});
