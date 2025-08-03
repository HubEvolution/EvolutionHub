// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from "@astrojs/react";
import cloudflare from "@astrojs/cloudflare";

// https://astro.build/config
export default defineConfig({
  site: 'https://hub-evolution.pages.dev',
  output: 'server',
  adapter: cloudflare(),
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
    logLevel: 'info'
  },
});
