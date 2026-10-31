import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    // If 5173 is still taken, Vite moves to the next free port.
    strictPort: false,
    allowedHosts: true,
    // scripts/dev.mjs sets API_PORT to whichever port the API server got.
    // `xfwd` keeps the browser's own host in X-Forwarded-Host, so links the API builds
    // (a calendar feed behind a QR code, for one) point at the URL the phone can reach
    // instead of at the internal API port.
    proxy: {
      '/api': { target: `http://127.0.0.1:${process.env.API_PORT || 3001}`, changeOrigin: false, xfwd: true },
    },
  },
  build: { outDir: 'dist', sourcemap: false },
});
