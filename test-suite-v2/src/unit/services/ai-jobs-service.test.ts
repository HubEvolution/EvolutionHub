/**
 * Unit-Tests für AI Jobs Service
 * Testet Job-Creation, Update, Delete und Retrieval
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createJob,
  updateJob,
  deleteJob,
  getJobById,
} from '../../../src/lib/services/ai-jobs-service';
import { db } from '../../../src/lib/db'; // Mocked
import { authService } from '../../../src/lib/services/auth-service'; // Mocked
import type { AIImageJob } from '../../../src/types/ai';

// Mock Drizzle
vi.mock('../../../src/lib/db', () => ({
  db: {
    insert: vi.fn(),
    select: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock Auth Service
vi.mock('../../../src/lib/services/auth-service', () => ({
  authService: {
    getCurrentUser: vi.fn(),
  },
}));

describe('AI Jobs Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createJob', () => {
    const mockPrompt = 'Test prompt';
    const mockUserId = 'user123';
    const mockJobData = {
      id: 'job1',
      prompt: mockPrompt,
      userId: mockUserId,
      status: 'pending',
    } as AIImageJob;

    it('sollte Job erfolgreich erstellen', async () => {
      // Arrange
      vi.mocked(authService.getCurrentUser).mockResolvedValue({ id: mockUserId });
      vi.mocked(db.insert).mockResolvedValue({ rowsAffected: 1, insertId: 'job1' });

      // Act
      const result = await createJob(mockPrompt);

      // Assert
      expect(result.success).toBe(true);
      expect(db.insert).toHaveBeenCalledWith(expect.anything(), [
        expect.objectContaining({ prompt: mockPrompt, userId: mockUserId }),
      ]);
      expect(result.data).toEqual({ id: 'job1', status: 'pending' });
    });

    it('sollte bei fehlender Auth fehlschlagen', async () => {
      // Arrange
      vi.mocked(authService.getCurrentUser).mockResolvedValue(null);

      // Act & Assert
      await expect(createJob(mockPrompt)).rejects.toThrow('Unauthorized');
    });

    it('sollte bei DB-Fehler fehlschlagen', async () => {
      // Arrange
      vi.mocked(authService.getCurrentUser).mockResolvedValue({ id: mockUserId });
      vi.mocked(db.insert).mockRejectedValue(new Error('DB error'));

      // Act & Assert
      await expect(createJob(mockPrompt)).rejects.toThrow('DB error');
    });

    it('sollte bei leerem Prompt fehlschlagen', async () => {
      // Act & Assert
      await expect(createJob('')).rejects.toThrow('Invalid prompt');
    });
  });

  describe('updateJob', () => {
    const mockJobId = 'job1';
    const mockUpdateData = { status: 'completed' };

    it('sollte Job-Status erfolgreich updaten', async () => {
      // Arrange
      vi.mocked(authService.getCurrentUser).mockResolvedValue({ id: 'user123' });
      vi.mocked(db.update).mockResolvedValue({ rowsAffected: 1 });

      // Act
      const result = await updateJob(mockJobId, mockUpdateData);

      // Assert
      expect(result.success).toBe(true);
      expect(db.update).toHaveBeenCalledWith(expect.anything(), mockUpdateData, { id: mockJobId });
    });

    it('sollte bei unauthorized Update fehlschlagen', async () => {
      // Arrange
      vi.mocked(authService.getCurrentUser).mockResolvedValue({ id: 'other-user' });

      // Act & Assert
      await expect(updateJob(mockJobId, mockUpdateData)).rejects.toThrow('Unauthorized');
    });

    it('sollte bei nicht existierendem Job fehlschlagen', async () => {
      // Arrange
      vi.mocked(authService.getCurrentUser).mockResolvedValue({ id: 'user123' });
      vi.mocked(db.update).mockResolvedValue({ rowsAffected: 0 });

      // Act & Assert
      await expect(updateJob(mockJobId, mockUpdateData)).rejects.toThrow('Job not found');
    });
  });

  describe('deleteJob', () => {
    const mockJobId = 'job1';

    it('sollte Job erfolgreich löschen', async () => {
      // Arrange
      vi.mocked(authService.getCurrentUser).mockResolvedValue({ id: 'user123' });
      vi.mocked(db.delete).mockResolvedValue({ rowsAffected: 1 });

      // Act
      const result = await deleteJob(mockJobId);

      // Assert
      expect(result.success).toBe(true);
      expect(db.delete).toHaveBeenCalledWith(expect.anything(), { id: mockJobId });
    });

    it('sollte bei unauthorized Delete fehlschlagen', async () => {
      // Arrange
      vi.mocked(authService.getCurrentUser).mockResolvedValue({ id: 'other-user' });

      // Act & Assert
      await expect(deleteJob(mockJobId)).rejects.toThrow('Unauthorized');
    });

    it('sollte bei nicht existierendem Job warnen aber success returnen', async () => {
      // Arrange
      vi.mocked(authService.getCurrentUser).mockResolvedValue({ id: 'user123' });
      vi.mocked(db.delete).mockResolvedValue({ rowsAffected: 0 });

      // Act
      const result = await deleteJob(mockJobId);

      // Assert
      expect(result.success).toBe(true); // Graceful handling
    });
  });

  describe('getJobById', () => {
    const mockJobId = 'job1';
    const mockJobData = { id: mockJobId, status: 'pending' } as AIImageJob;

    it('sollte Job erfolgreich abrufen', async () => {
      // Arrange
      vi.mocked(authService.getCurrentUser).mockResolvedValue({ id: 'user123' });
      vi.mocked(db.select).mockResolvedValue([mockJobData]);

      // Act
      const result = await getJobById(mockJobId);

      // Assert
      expect(result.success).toBe(true);
      expect(db.select).toHaveBeenCalledWith(expect.anything(), { id: mockJobId });
      expect(result.data).toEqual(mockJobData);
    });

    it('sollte bei invalidem ID fehlschlagen', async () => {
      // Act & Assert
      await expect(getJobById('invalid')).rejects.toThrow('Invalid job ID');
    });

    it('sollte bei nicht gefundenem Job null returnen', async () => {
      // Arrange
      vi.mocked(authService.getCurrentUser).mockResolvedValue({ id: 'user123' });
      vi.mocked(db.select).mockResolvedValue([]);

      // Act
      const result = await getJobById(mockJobId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.data).toBeNull();
    });
  });
});
