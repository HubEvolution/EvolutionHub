import type { APIRoute } from 'astro';

/**
 * Health check endpoint for deployment verification
 * Tests connectivity to critical infrastructure: D1, KV, R2
 */
export const GET: APIRoute = async ({ locals }) => {
  const env = locals.runtime?.env;
  const startTime = Date.now();

  if (!env) {
    return new Response(
      JSON.stringify({
        status: 'error',
        message: 'Runtime environment not available',
        timestamp: new Date().toISOString(),
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const services = {
    d1: false,
    kv: false,
    r2: false,
  };

  const errors: string[] = [];

  // Test D1 database connectivity
  try {
    const result = await env.DB?.prepare('SELECT 1 as health').first();
    services.d1 = result?.health === 1;
    if (!services.d1) {
      errors.push('D1: Query returned unexpected result');
    }
  } catch (err) {
    services.d1 = false;
    errors.push(`D1: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }

  // Test KV (SESSION) connectivity
  try {
    // Simple availability test - just check if we can call the KV API
    const testKey = '__health_check__';
    await env.SESSION?.put(testKey, 'ok', { expirationTtl: 60 });
    const result = await env.SESSION?.get(testKey);
    services.kv = result === 'ok';
    await env.SESSION?.delete(testKey);
    if (!services.kv) {
      errors.push('KV: Could not read/write test key');
    }
  } catch (err) {
    services.kv = false;
    errors.push(`KV: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }

  // Test R2 (AI_IMAGES) connectivity
  try {
    // Just check if we can list - don't create any objects
    const list = await env.R2_AI_IMAGES?.list({ limit: 1 });
    services.r2 = list !== undefined;
    if (!services.r2) {
      errors.push('R2: Could not list bucket');
    }
  } catch (err) {
    services.r2 = false;
    errors.push(`R2: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }

  const duration = Date.now() - startTime;
  const allHealthy = services.d1 && services.kv && services.r2;
  const status = allHealthy ? 'ok' : 'degraded';
  const httpStatus = allHealthy ? 200 : 503;

  return new Response(
    JSON.stringify({
      status,
      services,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
      version: env.ENVIRONMENT || 'unknown',
      ...(errors.length > 0 && { errors }),
    }),
    {
      status: httpStatus,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    }
  );
};
