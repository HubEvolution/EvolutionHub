#!/usr/bin/env tsx

/**
 * Health check script for post-deployment verification
 * Usage: tsx scripts/health-check.ts --url <BASE_URL>
 * Exit codes: 0 (success), 1 (failure)
 */

interface HealthResponse {
  status: string;
  services?: {
    d1: boolean;
    kv: boolean;
    r2: boolean;
  };
  duration?: string;
  timestamp?: string;
  version?: string;
  errors?: string[];
}

async function checkHealth(
  baseUrl: string,
  retries = 3,
  timeout = 10000,
  envLabel?: string
): Promise<boolean> {
  const url = `${baseUrl}/api/health`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const prefix = envLabel ? `[${envLabel}] ` : '';
      console.log(`${prefix}[Attempt ${attempt}/${retries}] Checking health: ${url}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'EvolutionHub-HealthCheck/1.0',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const body = (await response.json()) as any;

      // Support wrapped API shape: { success, data: { status, services, version } }
      const statusVal: string | undefined = body?.status ?? body?.data?.status;
      const servicesVal: HealthResponse['services'] | undefined =
        body?.services ?? body?.data?.services;
      const versionVal: string | undefined = body?.version ?? body?.data?.version;

      console.log(`  Status: ${response.status}`);
      console.log(`  Response: ${JSON.stringify(body, null, 2)}`);

      if (response.status === 200 && statusVal === 'ok') {
        console.log(`${envLabel ? `[${envLabel}] ` : ''}✅ Health check passed!`);
        if (servicesVal) {
          console.log(`  D1: ${servicesVal.d1 ? '✓' : '✗'}`);
          console.log(`  KV: ${servicesVal.kv ? '✓' : '✗'}`);
          console.log(`  R2: ${servicesVal.r2 ? '✓' : '✗'}`);
        }
        if (versionVal) {
          console.log(`  Version: ${versionVal}`);
        }
        return true;
      }
      if (response.status === 503) {
        console.warn(
          `${envLabel ? `[${envLabel}] ` : ''}⚠️  Services degraded (attempt ${attempt}/${retries})`
        );
        const errors = body?.errors ?? body?.data?.errors;
        if (errors && Array.isArray(errors)) console.warn(`  Errors: ${errors.join(', ')}`);
      } else {
        console.error(
          `${envLabel ? `[${envLabel}] ` : ''}❌ Unexpected status: ${response.status}`
        );
      }
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          console.error(
            `${envLabel ? `[${envLabel}] ` : ''}❌ Request timeout after ${timeout}ms (attempt ${attempt}/${retries})`
          );
        } else {
          console.error(
            `${envLabel ? `[${envLabel}] ` : ''}❌ Health check failed (attempt ${attempt}/${retries}): ${err.message}`
          );
        }
      }
    }

    if (attempt < retries) {
      const delay = 5000; // 5s between retries
      console.log(`  Retrying in ${delay / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  console.error(`❌ Health check failed after ${retries} attempts`);
  return false;
}

async function main() {
  const args = process.argv.slice(2);
  let baseUrl = process.env.BASE_URL || '';
  let envLabel: string | undefined;

  // Parse command-line arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--url' && args[i + 1]) {
      baseUrl = args[i + 1];
      i++;
    } else if (args[i] === '--env' && args[i + 1]) {
      envLabel = args[i + 1];
      i++;
    }
  }

  if (!baseUrl) {
    console.error('❌ Error: BASE_URL not provided');
    console.error('Usage: tsx scripts/health-check.ts --url <BASE_URL>');
    console.error('   or: BASE_URL=https://... tsx scripts/health-check.ts');
    process.exit(1);
  }

  // Remove trailing slash
  baseUrl = baseUrl.replace(/\/$/, '');

  console.log(`🔍 Starting health check for: ${baseUrl}`);
  console.log('');

  const success = await checkHealth(baseUrl, 3, 10000, envLabel);

  process.exit(success ? 0 : 1);
}

main().catch((err) => {
  console.error('❌ Unexpected error:', err);
  process.exit(1);
});
