import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from "@astrojs/react";
import cloudflare from "@astrojs/cloudflare";

// https://astro.build/config
export default defineConfig({
  // Provide a site URL for local development and for canonical tags
  // when no other site is specified. Crucial for the URL constructor.
  site: 'http://localhost:4321', // Set a specific URL for local development
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
        'Content-Type': 'text/css'
      },
      '**/*.js': {
        'Content-Type': 'application/javascript'
      },
      '**/*.svg': {
        'Content-Type': 'image/svg+xml'
      }
    }
  }),
  tsconfig: './tsconfig.json',
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
