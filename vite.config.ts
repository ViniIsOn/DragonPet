import { defineConfig } from 'vite';

// Relative base keeps the build working both on a web server and inside the
// Android WebView (Capacitor serves the bundle from a local origin).
export default defineConfig({
  base: './',
  server: {
    // The Arena live preview is served through an e2b.app hostname.
    allowedHosts: ['.e2b.app'],
  },
  preview: {
    allowedHosts: ['.e2b.app'],
  },
  build: {
    target: 'es2019',
    cssCodeSplit: false,
    assetsInlineLimit: 8192,
  },
});
