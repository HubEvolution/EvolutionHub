import { describe, it, expect, vi } from 'vitest';
import { AiImageService } from '@/lib/services/ai-image-service';

// Helper to make a minimal valid PNG image File so the MIME sniffer accepts it
function makeTestFile(bytes = 2048, type = 'image/png'): File {
  const size = Math.max(bytes, 64);
  const buf = new Uint8Array(size);
  // PNG signature
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  buf.set(sig, 0);
  // Fill the rest with non-zero bytes
  for (let i = sig.length; i < buf.length; i++) buf[i] = (i * 31) & 0xff;
  return new File([buf], 'flower.png', { type });
}

describe('AiImageService - Workers AI tiny output retry', () => {
  it('retries once on tiny output and succeeds with larger image', async () => {
    // Arrange environment with minimal bindings
    const puts: Array<{ key: string; bytes: number; contentType?: string }> = [];
    const R2_AI_IMAGES = {
      async put(
        key: string,
        data: ArrayBuffer,
        opts?: { httpMetadata?: { contentType?: string } }
      ) {
        const bytes = data.byteLength;
        puts.push({ key, bytes, contentType: opts?.httpMetadata?.contentType });
      },
    } as unknown as import('@cloudflare/workers-types').R2Bucket;

    const aiRun = vi
      .fn()
      // First call returns a tiny image (1 KB)
      .mockResolvedValueOnce(new Uint8Array(1000))
      // Second call returns a normal-sized image (60 KB)
      .mockResolvedValueOnce(new Uint8Array(60 * 1024));

    // Force MIME sniffer to accept our test file as PNG
    vi.spyOn(AiImageService.prototype as any, 'detectImageMimeFromBytes').mockReturnValue(
      'image/png' as any
    );

    const service = new AiImageService({
      R2_AI_IMAGES,
      AI: { run: aiRun },
      WORKERS_AI_ENABLED: '1',
      ENVIRONMENT: 'production',
    });

    const file = makeTestFile(2048, 'image/png');

    // Act
    const result = await service.generate({
      ownerType: 'user',
      ownerId: 'u1',
      modelSlug: '@cf/runwayml/stable-diffusion-v1-5-img2img',
      file,
      requestOrigin: 'http://localhost:3000',
    });

    // Assert
    expect(aiRun).toHaveBeenCalledTimes(2); // one retry
    expect(result.imageUrl).toContain('/r2-ai/ai-enhancer/results/user/u1/');
    expect(puts.length).toBe(2); // original + result
    const resultPut = puts[1];
    expect(resultPut.bytes).toBeGreaterThanOrEqual(15 * 1024);
  });
});
