import { describe, it, expect } from 'vitest';
import { AiJobsService } from '@/lib/services/ai-jobs-service';
import type { AllowedModel } from '@/config/ai-image';

const DUMMY_MODEL: AllowedModel = {
  slug: 'owner/model:tag',
  label: 'Dummy',
  provider: 'replicate',
  supportsScale: false,
  supportsFaceEnhance: false,
};

function makeService(env: Partial<{ REPLICATE_API_TOKEN: string; ENVIRONMENT: string }>) {
  // Only the methods used by runReplicate are relevant; db is unused there
  const deps = {
    db: {} as any,
    isDevelopment: (env.ENVIRONMENT || '').toLowerCase() !== 'production',
  };
  return new AiJobsService(deps, {
    REPLICATE_API_TOKEN: env.REPLICATE_API_TOKEN ?? 'token',
    ENVIRONMENT: env.ENVIRONMENT ?? 'production',
  } as any);
}

async function withMockedFetch<T>(status: number, body: string = 'err', fn: () => Promise<T>) {
  const original = globalThis.fetch as typeof fetch;
  const res = new Response(body, { status });
  const fetchMock = (async () => res) as unknown as typeof fetch;
  (globalThis as any).fetch = fetchMock;
  try {
    return await fn();
  } finally {
    (globalThis as any).fetch = original;
  }
}

describe('AiJobsService.runReplicate() provider error mapping', () => {
  it('maps 401 to forbidden', async () => {
    const service = makeService({ REPLICATE_API_TOKEN: 't', ENVIRONMENT: 'production' });
    await withMockedFetch(401, 'unauthorized', async () => {
      await expect(
        (service as any).runReplicate(DUMMY_MODEL, { image: 'http://x' })
      ).rejects.toMatchObject({ apiErrorType: 'forbidden', status: 401 });
    });
  });

  it('maps 403 to forbidden', async () => {
    const service = makeService({ REPLICATE_API_TOKEN: 't', ENVIRONMENT: 'production' });
    await withMockedFetch(403, 'forbidden', async () => {
      await expect(
        (service as any).runReplicate(DUMMY_MODEL, { image: 'http://x' })
      ).rejects.toMatchObject({ apiErrorType: 'forbidden', status: 403 });
    });
  });

  it('maps 404 to validation_error', async () => {
    const service = makeService({ REPLICATE_API_TOKEN: 't', ENVIRONMENT: 'production' });
    await withMockedFetch(404, 'not found', async () => {
      await expect(
        (service as any).runReplicate(DUMMY_MODEL, { image: 'http://x' })
      ).rejects.toMatchObject({ apiErrorType: 'validation_error', status: 404 });
    });
  });

  it('maps 422 to validation_error', async () => {
    const service = makeService({ REPLICATE_API_TOKEN: 't', ENVIRONMENT: 'production' });
    await withMockedFetch(422, 'unprocessable', async () => {
      await expect(
        (service as any).runReplicate(DUMMY_MODEL, { image: 'http://x' })
      ).rejects.toMatchObject({ apiErrorType: 'validation_error', status: 422 });
    });
  });

  it('maps 500 to server_error', async () => {
    const service = makeService({ REPLICATE_API_TOKEN: 't', ENVIRONMENT: 'production' });
    await withMockedFetch(500, 'server err', async () => {
      await expect(
        (service as any).runReplicate(DUMMY_MODEL, { image: 'http://x' })
      ).rejects.toMatchObject({ apiErrorType: 'server_error', status: 500 });
    });
  });
});
