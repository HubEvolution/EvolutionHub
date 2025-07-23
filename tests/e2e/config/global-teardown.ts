import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  // Add any global teardown logic here
  console.log('Global teardown completed');
}

export default globalTeardown;
