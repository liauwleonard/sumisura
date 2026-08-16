import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// base must match the GitHub Pages repo name so asset URLs resolve once deployed.
const BASE = '/sumisura/'

export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // 'prompt', not 'autoUpdate': an automatic reload could land mid-measurement and
      // discard unsaved work, since saving in this app is explicit.
      registerType: 'prompt',
      includeAssets: ['apple-touch-icon.png', 'favicon.png', 'icon.svg'],
      manifest: {
        name: 'Sumisura',
        short_name: 'Sumisura',
        description: 'Buku ukuran dan pesanan untuk penjahit',
        lang: 'id',
        start_url: BASE,
        scope: BASE,
        display: 'standalone',
        orientation: 'any',
        background_color: '#f5f5f4',
        theme_color: '#b45309',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: `${BASE}index.html`,
        cleanupOutdatedCaches: true,
      },
      devOptions: { enabled: false },
    }),
  ],
})
