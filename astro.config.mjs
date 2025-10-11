import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from "@astrojs/react";
import cloudflare from "@astrojs/cloudflare";

// Determine build target (Worker vs Node dev) for conditional aliasing
const IS_WORKER_BUILD = Boolean(
  process.env.CLOUDFLARE ||
  process.env.WRANGLER_REMOTE ||
  process.env.CF_PAGES ||
  process.env.ASTRO_DEPLOY_TARGET === 'worker'
);

// Dev-only CSP policy for static HTML (middleware is bypassed for prerendered assets)
const DEV_CSP = [
  "default-src 'self' data: blob:",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: data: https://cdn.jsdelivr.net https://www.googletagmanager.com https://plausible.io https://static.cloudflareinsights.com https://challenges.cloudflare.com",
  "script-src-elem 'self' 'unsafe-inline' 'unsafe-eval' blob: data: https://cdn.jsdelivr.net https://www.googletagmanager.com https://plausible.io https://static.cloudflareinsights.com https://challenges.cloudflare.com",
  "connect-src 'self' ws: http: https:",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net",
  "img-src 'self' data: blob: https:",
  "font-src 'self' https://fonts.gstatic.com",
  "frame-src 'self' https://challenges.cloudflare.com",
  "frame-ancestors 'self'",
  "object-src 'none'",
  "base-uri 'self'",
].join('; ');

// Centralized Logging Configuration
const LOGGING_CONFIG = {
  // Environment-based settings
  isDevelopment: process.env.NODE_ENV === 'development' || process.env.MODE === 'development',
  
  // WebSocket Server Configuration
  websocket: {
    enabled: process.env.NODE_ENV === 'development',
    port: parseInt(process.env.LOGGING_WEBSOCKET_PORT) || 8081,
    host: process.env.LOGGING_WEBSOCKET_HOST || 'localhost',
  },
  
  // Log Levels
  levels: {
    development: ['debug', 'info', 'warn', 'error'],
    production: ['warn', 'error'],
  },
  
  // Security Logging
  security: {
    enabled: true,
    auditTrail: true,
    sensitiveDataFiltering: true,
  },
  
  // Frontend Debug Panel
  debugPanel: {
    enabled: process.env.NODE_ENV === 'development',
    maxLogEntries: 500,
    autoConnect: true,
  }
};

// Export logging configuration for use in other modules
export { LOGGING_CONFIG };

// Using custom i18n implementation in src/lib/i18n.js
// No external i18n package needed


// https://astro.build/config
export default defineConfig({
  // Provide a site URL for local development and for canonical tags
  // when no other site is specified. Crucial for the URL constructor.
  site: 'http://localhost:8787', // Match default Wrangler dev (http://localhost:8787)
  output: 'server',
  base: '/',
  trailingSlash: 'ignore',
  adapter: cloudflare({
    mode: 'directory',
    // Removed: functionPerRoute: true, to simplify the output structure.
    staticAssetHeaders: {
      // Ensure CSP headers exist in dev for prerendered/static HTML pages too
      ...(process.env.NODE_ENV === 'development'
        ? { '**/*.html': { 'Content-Security-Policy': DEV_CSP } }
        : {}),
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
      '**/*.webmanifest': {
        'Content-Type': 'application/manifest+json'
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
    // Custom i18n implementation via file structure:
    // - src/pages/index.astro (default/root)
    // - src/pages/de/index.astro (German)
    // - src/pages/en/index.astro (English)
    // - src/lib/i18n.js (translation function)
    // - src/locales/*.json (translation files)
  ],
  vite: {
    logLevel: 'info',
    build: {
      assetsInlineLimit: 0,
      cssCodeSplit: true,
      // outDir remains './dist'; let Astro manage its default /_astro asset path
      outDir: './dist',
      rollupOptions: {
        external: [/[._]test\.js$/, /[._]test\.ts$/, /[._]test\.astro$/]
      },
      ssr: {
        noExternal: [/[._]test\.js$/, /[._]test\.ts$/, /[._]test\.astro$/]
      }
    },
    resolve: {
      conditions: ['workerd', 'worker', 'browser'],
      alias: {
        '@/lib': '/src/lib',
        '@/components': '/src/components',
        '@/layouts': '/src/layouts',
        '@/content': '/src/content',
        '@/types': '/src/types',
        '@/utils': '/src/utils',
        '@/assets': '/src/assets',
        '@/styles': '/src/styles',
        '@/scripts': '/src/scripts',
        '@/api': '/src/pages/api',
        '@/tests': '/tests',
        '@/server': '/src/server'
      }
    },
    ssr: {
      // Silence SSR warnings about auto-externalized Node built-ins from transitive deps
      external: [
        'node:crypto',
        'node:events',
        'stream',
        'node:net',
        'node:tls',
        'node:timers/promises',
        'node:url'
      ]
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
