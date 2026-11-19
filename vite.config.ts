import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import fs from 'node:fs';
import path from 'node:path';

// Asegura que los iconos PWA (favicon, maskable y any) se generen y sincronicen desde src/components/icon/icon.svg
function syncAppIconPlugin() {
  return {
    name: 'sync-app-icon',
    buildStart() {
      const srcIcon = path.resolve(__dirname, 'src/components/icon/icon.svg');
      const publicDir = path.resolve(__dirname, 'public');
      if (!fs.existsSync(srcIcon)) return;
      if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

      const raw = fs.readFileSync(srcIcon, 'utf-8');

      // 1. Favicon: copia fiel del SVG original con fondo circular
      fs.writeFileSync(path.resolve(publicDir, 'favicon.svg'), raw, 'utf-8');

      // Extraer el trazo del glifo (segundo path o path con clase st1)
      const paths = raw.match(/<path[^>]+>/g) || [];
      const glyphTag = paths.find((p) => p.includes('class="st1"') || p.includes('st1')) || paths[1];
      const dMatch = glyphTag ? glyphTag.match(/d="([^"]+)"/) : null;

      if (dMatch && dMatch[1]) {
        const glyphD = dMatch[1];

        // 2. Icono Maskable (Android): Fondo cuadrado completo (#D0BCFF) y glifo dentro de la safe zone (70%)
        const maskableSvg = `<?xml version="1.0" encoding="utf-8"?>
<svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080">
  <rect width="1080" height="1080" fill="#D0BCFF" />
  <g transform="translate(540, 540) scale(0.70) translate(-540, -540)">
    <path fill="#381E72" d="${glyphD}" />
  </g>
</svg>
`;
        fs.writeFileSync(path.resolve(publicDir, 'icon-maskable.svg'), maskableSvg, 'utf-8');

        // 3. Icono Any / Splash Screen: Círculo con aire/margen armónico (80%) sobre el fondo del sistema
        const anySvg = `<?xml version="1.0" encoding="utf-8"?>
<svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080">
  <g transform="translate(540, 540) scale(0.80) translate(-540, -540)">
    <circle cx="540" cy="540" r="540" fill="#D0BCFF" />
    <path fill="#381E72" d="${glyphD}" />
  </g>
</svg>
`;
        fs.writeFileSync(path.resolve(publicDir, 'icon.svg'), anySvg, 'utf-8');
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
      includeAssets: ['favicon.svg', 'icon.svg', 'icon-maskable.svg'],
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
            src: './icon-maskable.svg',
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
