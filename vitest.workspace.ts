import { defineWorkspace } from 'vitest/config';

// vitest.config.ts already includes projects for unit+integration
// This workspace file delegates to that single config
export default defineWorkspace([
  './vitest.config.ts',
]);
