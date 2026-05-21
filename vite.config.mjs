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
});
