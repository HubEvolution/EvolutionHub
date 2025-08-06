import { describe, expect, it, vi, beforeAll, afterAll } from 'vitest';
import { hashPassword, comparePasswords } from '@/server/utils/hashing';
import * as bcryptjs from 'bcryptjs';

// Mock bcryptjs
vi.mock('bcryptjs', () => ({
  hash: vi.fn(),
  compare: vi.fn()
}));

describe('Hashing Utilities', () => {
  const testPassword = 'TestSecurePassword123!';
  const testHashedPassword = '$2a$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
  
  beforeAll(() => {
    // Setup default mock behaviors
    vi.mocked(bcryptjs.hash).mockResolvedValue(testHashedPassword);
    vi.mocked(bcryptjs.compare).mockResolvedValue(true);
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe('hashPassword', () => {
    it('sollte ein Passwort hashen mit dem richtigen Salt-Faktor', async () => {
      await hashPassword(testPassword);
      
      // Überprüfen, dass bcryptjs.hash mit dem richtigen Salt-Faktor (10) aufgerufen wurde
      expect(bcryptjs.hash).toHaveBeenCalledWith(testPassword, 10);
    });

    it('sollte den erzeugten Hash zurückgeben', async () => {
      const result = await hashPassword(testPassword);
      
      expect(result).toBe(testHashedPassword);
    });

    it('sollte Fehler weiterleiten, wenn bcryptjs.hash fehlschlägt', async () => {
      const testError = new Error('Hashing error');
      vi.mocked(bcryptjs.hash).mockRejectedValueOnce(testError);
      
      await expect(hashPassword(testPassword)).rejects.toThrow(testError);
    });
  });

  describe('comparePasswords', () => {
    it('sollte Passwort mit Hash korrekt vergleichen', async () => {
      await comparePasswords(testPassword, testHashedPassword);
      
      // Überprüfen, dass bcryptjs.compare mit den richtigen Parametern aufgerufen wurde
      expect(bcryptjs.compare).toHaveBeenCalledWith(testPassword, testHashedPassword);
    });

    it('sollte true zurückgeben, wenn das Passwort übereinstimmt', async () => {
      vi.mocked(bcryptjs.compare).mockResolvedValueOnce(true);
      
      const result = await comparePasswords(testPassword, testHashedPassword);
      
      expect(result).toBe(true);
    });

    it('sollte false zurückgeben, wenn das Passwort nicht übereinstimmt', async () => {
      vi.mocked(bcryptjs.compare).mockResolvedValueOnce(false);
      
      const result = await comparePasswords(testPassword, testHashedPassword);
      
      expect(result).toBe(false);
    });

    it('sollte Fehler weiterleiten, wenn bcryptjs.compare fehlschlägt', async () => {
      const testError = new Error('Compare error');
      vi.mocked(bcryptjs.compare).mockRejectedValueOnce(testError);
      
      await expect(comparePasswords(testPassword, testHashedPassword)).rejects.toThrow(testError);
    });
  });
});
