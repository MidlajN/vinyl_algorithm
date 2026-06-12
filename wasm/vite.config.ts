import { defineConfig } from 'vite';

export default defineConfig({
  worker: {
    format: 'es',
  },
  server: {
    port: 5175,
    // Proxy backend requests for compare mode
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
  },
});
