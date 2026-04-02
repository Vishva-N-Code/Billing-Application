import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      manifest: false, // We use our own public/manifest.json
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        cleanupOutdatedCaches: true,
        skipWaiting: false,
        clientsClaim: false,
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10 MB (for logo.png)
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  base: '/',
  build: {
    chunkSizeWarningLimit: 2000, // raise from 500kb to 2MB (tesseract is heavy)
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

