import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      manifest: false, // We use our own public/manifest.json
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        maximumFileSizeToCacheInBytes: 100 * 1024 * 1024, // 100 MB (for full offline seed data including all quotations)
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  base: '/',
  build: {
    chunkSizeWarningLimit: 100000, // raise warning limit for comprehensive offline seed database
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-pdf': ['jspdf', 'html2canvas'],
          'vendor-db': ['dexie'],
        },
      },
    },
  },
})

