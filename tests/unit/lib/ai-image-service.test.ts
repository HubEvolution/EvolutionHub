import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db', () => ({
  db: {
    insert: vi.fn(),
    select: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('@/lib/kv/usage', () => ({
  getUsage: vi.fn(),
  incrementDailyRolling: vi.fn(),
  rollingDailyKey: vi.fn(),
  legacyMonthlyKey: vi.fn(),
  getCreditsBalanceTenths: vi.fn(),
  consumeCreditsTenths: vi.fn(),
}));

vi.mock('@/server/utils/logger-factory', () => ({
  loggerFactory: {
    createLogger: () => ({
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

vi.mock('@/lib/utils/mime', () => ({
  detectImageMimeFromBytes: vi.fn().mockResolvedValue('image/png'),
}));

import { db } from '@/lib/db';
import { generateImage, uploadToR2 } from '@/lib/services/ai-image-service';
import { R2_BUCKET } from '@/lib/r2';
import { SESSION_KV } from '@/lib/kv';

describe('AI Image Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateImage', () => {
    const mockPrompt = 'Test prompt';
    const mockUserId = 'user123';

    it('returns success with job info on happy path', async () => {
      vi.mocked(db.insert).mockResolvedValue({ rowsAffected: 1 } as never);
      vi.mocked(db.select).mockResolvedValue([{ id: 'job1', prompt: mockPrompt, status: 'completed' }] as never);

      const result = await generateImage(mockPrompt, mockUserId);

      expect(result.success).toBe(true);
      expect(db.insert).toHaveBeenCalled();
      expect(result.data.jobId).toBe('job1');
    });

    it('throws if prompt is empty', async () => {
      await expect(generateImage('', mockUserId)).rejects.toThrow('Invalid prompt');
    });

    it('throws rate limit error when session KV indicates recent usage', async () => {
      vi.mocked(SESSION_KV.get).mockResolvedValueOnce('recent-use');

      await expect(generateImage(mockPrompt, mockUserId)).rejects.toThrow('Rate limited');
    });
  });

  describe('uploadToR2', () => {
    const mockBuffer = Buffer.from('test-image');
    const mockKey = 'test-key.jpg';
    const mockJobId = 'job-1';

    it('uploads buffer to R2 and updates job status', async () => {
      vi.mocked(R2_BUCKET.put).mockResolvedValue(undefined as never);
      vi.mocked(db.update).mockResolvedValue({ rowsAffected: 1 } as never);

      const result = await uploadToR2(mockBuffer, mockKey, mockJobId);

      expect(result).toBe(true);
      expect(R2_BUCKET.put).toHaveBeenCalledWith(mockKey, expect.objectContaining({ body: mockBuffer }));
      expect(db.update).toHaveBeenCalled();
    });

    it('throws when R2 upload fails', async () => {
      vi.mocked(R2_BUCKET.put).mockRejectedValue(new Error('Upload failed'));

      await expect(uploadToR2(mockBuffer, mockKey, mockJobId)).rejects.toThrow('Upload failed');
    });
  });
});
