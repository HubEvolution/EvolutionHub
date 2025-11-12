/**
 * Unit-Tests für AI Image Service
 * Testet generateImage, uploadToR2 und Error-Handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateImage, uploadToR2 } from '../../../src/lib/services/ai-image-service';
import { db } from '../../../src/lib/db'; // Mocked
import { R2_BUCKET } from '../../../src/lib/r2'; // Mocked
import { SESSION_KV } from '../../../src/lib/kv'; // Mocked
import type { AIImageJob } from '../../../src/types/ai';

// Mock Drizzle
vi.mock('../../../src/lib/db', () => ({
  db: {
    insert: vi.fn(),
    select: vi.fn(),
    update: vi.fn(),
  },
}));

// Mock R2 und KV
vi.mock('@cloudflare/workers-types', () => ({
  R2Bucket: vi.fn(),
}));

// Mock Hono Response Helper
vi.mock('../../../src/lib/response-helpers', () => ({
  createSuccessResponse: vi.fn(),
  createErrorResponse: vi.fn(),
}));

describe('AI Image Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateImage', () => {
    const mockPrompt = 'Test prompt';
    const mockUserId = 'user123';
    const mockJobData = { id: 'job1', prompt: mockPrompt, status: 'completed' } as AIImageJob;

    it('sollte erfolgreich ein Bild generieren und Job speichern', async () => {
      // Arrange
      const mockApiResponse = { success: true, data: { imageUrl: 'test-url' } };
      vi.mocked(db.insert).mockResolvedValue({ rowsAffected: 1 });
      vi.mocked(db.select).mockResolvedValue([mockJobData]);

      // Act
      const result = await generateImage(mockPrompt, mockUserId);

      // Assert
      expect(result.success).toBe(true);
      expect(db.insert).toHaveBeenCalledWith(expect.anything()); // AI Jobs Table
      expect(result.data).toEqual({ imageUrl: 'test-url', jobId: 'job1' });
    });

    it('sollte Fehler bei API-Fehler handhaben', async () => {
      // Arrange
      const mockError = { success: false, error: 'API failed' };
      vi.mocked(db.insert).mockResolvedValue({ rowsAffected: 1 });

      // Act & Assert
      await expect(generateImage(mockPrompt, mockUserId)).rejects.toThrow('API failed');
    });

    it('sollte bei invalidem Prompt fehlschlagen', async () => {
      // Act & Assert
      await expect(generateImage('', mockUserId)).rejects.toThrow('Invalid prompt');
    });

    it('sollte Rate-Limit prüfen und ablehnen', async () => {
      // Arrange
      vi.mocked(SESSION_KV.get).mockResolvedValue('recent-use');

      // Act & Assert
      await expect(generateImage(mockPrompt, mockUserId)).rejects.toThrow('Rate limited');
    });
  });

  describe('uploadToR2', () => {
    const mockBuffer = Buffer.from('test-image');
    const mockKey = 'test-key.jpg';
    const mockJobId = 'job1';

    it('sollte Bild erfolgreich zu R2 uploaden', async () => {
      // Arrange
      vi.mocked(R2_BUCKET.put).mockResolvedValue(undefined);
      vi.mocked(db.update).mockResolvedValue({ rowsAffected: 1 });

      // Act
      const result = await uploadToR2(mockBuffer, mockKey, mockJobId);

      // Assert
      expect(result).toBe(true);
      expect(R2_BUCKET.put).toHaveBeenCalledWith(
        mockKey,
        expect.objectContaining({ body: mockBuffer })
      );
    });

    it('sollte bei Upload-Fehler fehlschlagen', async () => {
      // Arrange
      vi.mocked(R2_BUCKET.put).mockRejectedValue(new Error('Upload failed'));

      // Act & Assert
      await expect(uploadToR2(mockBuffer, mockKey, mockJobId)).rejects.toThrow('Upload failed');
    });

    it('sollte Job-Status bei Erfolg updaten', async () => {
      // Arrange
      vi.mocked(R2_BUCKET.put).mockResolvedValue(undefined);
      vi.mocked(db.update).mockResolvedValue({ rowsAffected: 1 });

      // Act
      await uploadToR2(mockBuffer, mockKey, mockJobId);

      // Assert
      expect(db.update).toHaveBeenCalledWith(expect.anything(), { status: 'uploaded' });
    });
  });

  // Weitere Edge-Cases
  it('sollte große Buffer handhaben (Size Limit)', async () => {
    const largeBuffer = Buffer.alloc(10 * 1024 * 1024); // 10MB
    vi.mocked(R2_BUCKET.put).mockResolvedValue(undefined);

    await expect(uploadToR2(largeBuffer, mockKey, mockJobId)).rejects.toThrow('File too large');
  });
});
