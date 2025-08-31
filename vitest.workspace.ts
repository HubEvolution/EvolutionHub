import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  './vitest.config.ts',
  './vitest.integration.config.ts',
  './test-suite-v2/vitest.config.ts',
]);
