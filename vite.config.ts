import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import fs from 'node:fs';
import path from 'node:path';

// Asegura que el icono en src/components/icon/icon.svg se sincronice automáticamente con public/icon.svg
function syncAppIconPlugin() {
  return {
    name: 'sync-app-icon',
    buildStart() {
      const srcIcon = path.resolve(__dirname, 'src/components/icon/icon.svg');
      const publicIcon = path.resolve(__dirname, 'public/icon.svg');
      if (fs.existsSync(srcIcon)) {
        fs.copyFileSync(srcIcon, publicIcon);
      }
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [
    syncAppIconPlugin(),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Feriando — Gestión de Ventas',
        short_name: 'Feriando',
        description: 'Punto de venta offline-first para ferias con prorrateo inteligente y liquidación.',
        theme_color: '#F3EDF7',
        background_color: '#F3EDF7',
        display: 'standalone',
        start_url: './',
        scope: './',
        icons: [
          {
            src: './icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: './icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      },
    }),
  ],
});
