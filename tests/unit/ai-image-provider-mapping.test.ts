import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AiImageService } from '@/lib/services/ai-image-service';
import type { AllowedModel } from '@/config/ai-image';

const DUMMY_MODEL: AllowedModel = {
  slug: 'owner/model:tag',
  label: 'Dummy',
  provider: 'replicate',
  supportsScale: false,
  supportsFaceEnhance: false,
};

function makeService(env: Partial<{ REPLICATE_API_TOKEN: string; ENVIRONMENT: string }>) {
  // Only fields used by runReplicate are needed
  return new AiImageService({
    REPLICATE_API_TOKEN: env.REPLICATE_API_TOKEN ?? 'token',
    ENVIRONMENT: env.ENVIRONMENT ?? 'production',
  } as any);
}

async function withMockedFetch<T>(status: number, body: string = 'err', fn: () => Promise<T>) {
  const original = globalThis.fetch;
  const res = new Response(body, { status });
  // @ts-expect-error allow vi mock assignment
  globalThis.fetch = vi.fn(async () => res);
  try {
    return await fn();
  } finally {
    globalThis.fetch = original;
  }
}

describe('AiImageService.runReplicate() provider error mapping', () => {
  let service: AiImageService;
  beforeEach(() => {
    service = makeService({ REPLICATE_API_TOKEN: 't', ENVIRONMENT: 'production' });
  });

  it('maps 401 to forbidden', async () => {
    await withMockedFetch(401, 'unauthorized', async () => {
      await expect(((service as any).runReplicate)(DUMMY_MODEL, { image: 'http://x' }))
        .rejects.toMatchObject({ apiErrorType: 'forbidden', status: 401 });
    });
  });

  it('maps 403 to forbidden', async () => {
    await withMockedFetch(403, 'forbidden', async () => {
      await expect(((service as any).runReplicate)(DUMMY_MODEL, { image: 'http://x' }))
        .rejects.toMatchObject({ apiErrorType: 'forbidden', status: 403 });
    });
  });

  it('maps 404 to validation_error', async () => {
    await withMockedFetch(404, 'not found', async () => {
      await expect(((service as any).runReplicate)(DUMMY_MODEL, { image: 'http://x' }))
        .rejects.toMatchObject({ apiErrorType: 'validation_error', status: 404 });
    });
  });

  it('maps 422 to validation_error', async () => {
    await withMockedFetch(422, 'unprocessable', async () => {
      await expect(((service as any).runReplicate)(DUMMY_MODEL, { image: 'http://x' }))
        .rejects.toMatchObject({ apiErrorType: 'validation_error', status: 422 });
    });
  });

  it('maps 500 to server_error', async () => {
    await withMockedFetch(500, 'server err', async () => {
      await expect(((service as any).runReplicate)(DUMMY_MODEL, { image: 'http://x' }))
        .rejects.toMatchObject({ apiErrorType: 'server_error', status: 500 });
    });
  });
});
