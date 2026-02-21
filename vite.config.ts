import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico'],
      manifest: {
        name: 'GTD タスクマネージャー',
        short_name: 'GTD',
        description: 'GTD方式のタスク管理アプリ',
        theme_color: '#3b82f6',
        background_color: '#f3f4f6',
        display: 'standalone',
        start_url: '/gtd-taskmanager/',
        scope: '/gtd-taskmanager/',
        icons: [
          {
            src: 'icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },
    }),
  ],
  base: '/gtd-taskmanager/',
})
