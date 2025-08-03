import { describe, expect, it, vi, beforeAll, afterAll } from 'vitest';
import { createJwt, verifyJwt } from './jwt';
import * as honoJwt from 'hono/jwt';

// Mock hono/jwt
vi.mock('hono/jwt', () => ({
  sign: vi.fn(),
  verify: vi.fn()
}));

describe('JWT Utilities', () => {
  const testUserId = 'user123';
  const testSecret = 'test-jwt-secret';
  const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-token';
  const mockTimestamp = 1627480800000; // 2021-07-28T12:00:00.000Z
  
  beforeAll(() => {
    // Mock Date.now für konstante Timestamps
    vi.spyOn(Date, 'now').mockReturnValue(mockTimestamp);
    
    // Setup default mock behaviors
    vi.mocked(honoJwt.sign).mockResolvedValue(testToken);
    vi.mocked(honoJwt.verify).mockResolvedValue({
      userId: testUserId,
      exp: Math.floor(mockTimestamp / 1000) + (60 * 60 * 24 * 7)
    });
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe('createJwt', () => {
    it('sollte einen JWT-Token mit korrekten Payload erstellen', async () => {
      await createJwt(testUserId, testSecret);
      
      const expectedPayload = {
        userId: testUserId,
        exp: Math.floor(mockTimestamp / 1000) + (60 * 60 * 24 * 7) // 7 Tage
      };
      
      expect(honoJwt.sign).toHaveBeenCalledWith(expectedPayload, testSecret);
    });

    it('sollte den erzeugten Token zurückgeben', async () => {
      const result = await createJwt(testUserId, testSecret);
      
      expect(result).toBe(testToken);
    });

    it('sollte Fehler weiterleiten, wenn honoJwt.sign fehlschlägt', async () => {
      const testError = new Error('JWT signing error');
      vi.mocked(honoJwt.sign).mockRejectedValueOnce(testError);
      
      await expect(createJwt(testUserId, testSecret)).rejects.toThrow(testError);
    });
  });

  describe('verifyJwt', () => {
    it('sollte einen Token erfolgreich verifizieren', async () => {
      await verifyJwt(testToken, testSecret);
      
      expect(honoJwt.verify).toHaveBeenCalledWith(testToken, testSecret);
    });

    it('sollte den Payload zurückgeben, wenn der Token gültig ist', async () => {
      const expectedPayload = {
        userId: testUserId,
        exp: Math.floor(mockTimestamp / 1000) + (60 * 60 * 24 * 7)
      };
      
      vi.mocked(honoJwt.verify).mockResolvedValueOnce(expectedPayload);
      
      const result = await verifyJwt(testToken, testSecret);
      
      expect(result).toEqual(expectedPayload);
    });

    it('sollte null zurückgeben, wenn die Verifizierung fehlschlägt', async () => {
      vi.mocked(honoJwt.verify).mockRejectedValueOnce(new Error('Invalid token'));
      
      const result = await verifyJwt(testToken, testSecret);
      
      expect(result).toBeNull();
    });

    it('sollte null zurückgeben, wenn der Token abgelaufen ist', async () => {
      vi.mocked(honoJwt.verify).mockRejectedValueOnce(new Error('Token expired'));
      
      const result = await verifyJwt(testToken, testSecret);
      
      expect(result).toBeNull();
    });
  });
});
