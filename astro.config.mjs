import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from "@astrojs/react";
import cloudflare from "@astrojs/cloudflare";

// https://astro.build/config
export default defineConfig({
  // Provide a site URL for local development and for canonical tags
  // when no other site is specified. Crucial for the URL constructor.
  site: 'http://localhost:8788', // Set correct URL for Wrangler development (Port 8788)
  output: 'server',
  base: '/',
  vite: {
    build: {
      // Verbessere Asset-Handling für Wrangler
      assetsInlineLimit: 0,
      cssCodeSplit: true,
      rollupOptions: {
        assetFileNames: 'assets/[name].[hash][extname]',
      },
    },
  },
  adapter: cloudflare({
    mode: 'directory',
    functionPerRoute: false,
    staticAssetHeaders: {
      // Target CSS files broadly to ensure correct MIME type handling.
      '**/*.css': {
        'Content-Type': 'text/css',
        // Cache CSS files for 1 year (31536000 seconds)
        'Cache-Control': 'public, max-age=31536000, immutable'
      },
      '**/*.js': {
        'Content-Type': 'application/javascript',
        // Cache JS files for 1 year
        'Cache-Control': 'public, max-age=31536000, immutable'
      },
      '**/*.svg': {
        'Content-Type': 'image/svg+xml',
        // Also cache SVGs for 1 year
        'Cache-Control': 'public, max-age=31536000, immutable'
      },
      // Add cache control for other static assets like fonts if necessary
      // '**/*.woff2': {
      //   'Content-Type': 'font/woff2',
      //   'Cache-Control': 'public, max-age=31536000, immutable'
      // },
      // '**/*.ttf': {
      //   'Content-Type': 'font/ttf',
      //   'Cache-Control': 'public, max-age=31536000, immutable'
      // }
    }
  }),
  tsconfig: './tsconfig.json',
  // Konfiguration zur Optimierung von Bildern während der Build-Zeit
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp'
    },
    // Compile-Modus für Cloudflare-Kompatibilität (Bildoptimierung zur Build-Zeit)
    serviceConfig: {
      limitInputPixels: false // Verhindert Image-Too-Large-Fehler bei großen Bildern
    },
    format: ['webp', 'avif', 'png', 'jpeg']
  },
  integrations: [
    react(),
    tailwind({
      configFile: './tailwind.config.js',
      applyBaseStyles: true,
      nesting: true
    })
  ],
  vite: {
    logLevel: 'info',
    build: {
      assetsInlineLimit: 0,
      // Einheitliche Ausgabestruktur für alle Assets
      outDir: './dist', // Ensure outDir is './dist'
      rollupOptions: {
        external: [/[._]test\.js$/, /[._]test\.ts$/, /[._]test\.astro$/],
        output: {
          // Ensure assets are placed directly in dist/assets/
          assetFileNames: 'assets/[name].[hash][extname]'
        }
      },
      ssr: {
        noExternal: [/[._]test\.js$/, /[._]test\.ts$/, /[._]test\.astro$/]
      }
    },
    // Exclude test files from the build
    resolve: {
      conditions: ['workerd', 'worker', 'browser'],
      // Definiere Import-Aliase für eine bessere Wartbarkeit und Refaktorisierbarkeit
      alias: {
        // Core-Module
        '@/lib': '/src/lib',
        '@/components': '/src/components',
        '@/layouts': '/src/layouts',
        '@/content': '/src/content',
        '@/types': '/src/types',
        '@/utils': '/src/utils',
        '@/assets': '/src/assets',
        '@/styles': '/src/styles',
        '@/api': '/src/pages/api',
        '@/tests': '/tests'
      },
    },
    // Removed Vite server headers as they might be redundant or problematic with the adapter config.
    // Relying on adapter's staticAssetHeaders for deployment and Vite's defaults for local dev.
    // server: {
    //   fs: {
    //     strict: false
    //   }
    // }
  },
  server: {
    host: true
  }
});
