import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { createSession, validateSession, invalidateSession, type User, type SessionRow } from '@/lib/auth-v2';

// Mock für die D1-Datenbank
const mockDb = {
  prepare: vi.fn().mockReturnThis(),
  bind: vi.fn().mockReturnThis(),
  first: vi.fn(),
  run: vi.fn().mockResolvedValue({ success: true }),
};

// Mock für crypto.randomUUID
const originalRandomUUID = crypto.randomUUID;
vi.stubGlobal('crypto', {
  ...crypto,
  randomUUID: vi.fn().mockReturnValue('test-session-id'),
});

// Mock für die Date.now-Funktion
const mockNow = 1627480800000; // 28. Juli 2021, 12:00:00 UTC
vi.spyOn(Date, 'now').mockReturnValue(mockNow);

describe('Auth-Modul Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createSession', () => {
    it('sollte eine neue Session erstellen und in der Datenbank speichern', async () => {
      // Testdaten
      const userId = 'test-user-id';
      const expectedExpiresAt = new Date(mockNow + 60 * 60 * 24 * 30 * 1000); // 30 Tage später

      // Test ausführen
      const session = await createSession(mockDb as any, userId);

      // Überprüfungen
      expect(session).toEqual({
        id: 'test-session-id',
        userId: userId,
        expiresAt: expectedExpiresAt,
      });

      // Überprüfen, ob die Datenbankaufrufe korrekt sind
      expect(mockDb.prepare).toHaveBeenCalledWith(
        'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)'
      );
      expect(mockDb.bind).toHaveBeenCalledWith(
        'test-session-id',
        userId,
        Math.floor(expectedExpiresAt.getTime() / 1000)
      );
      expect(mockDb.run).toHaveBeenCalled();
    });
  });

  describe('validateSession', () => {
    it('sollte null zurückgeben, wenn keine Session gefunden wurde', async () => {
      // Mock für eine nicht gefundene Session
      mockDb.first.mockResolvedValueOnce(null);

      // Test ausführen
      const result = await validateSession(mockDb as any, 'non-existent-session');

      // Überprüfungen
      expect(result).toEqual({ session: null, user: null });
      expect(mockDb.prepare).toHaveBeenCalledWith('SELECT * FROM sessions WHERE id = ?');
      expect(mockDb.bind).toHaveBeenCalledWith('non-existent-session');
    });

    it('sollte null zurückgeben, wenn die Session abgelaufen ist', async () => {
      // Mock für eine abgelaufene Session
      const expiredSession: SessionRow = {
        id: 'expired-session',
        user_id: 'test-user-id',
        expires_at: Math.floor((mockNow - 1000) / 1000) // 1 Sekunde in der Vergangenheit
      };
      mockDb.first.mockResolvedValueOnce(expiredSession);

      // Test ausführen
      const result = await validateSession(mockDb as any, 'expired-session');

      // Überprüfungen
      expect(result).toEqual({ session: null, user: null });
      expect(mockDb.prepare).toHaveBeenCalledWith('DELETE FROM sessions WHERE id = ?');
      expect(mockDb.bind).toHaveBeenCalledWith('expired-session');
    });

    it('sollte null zurückgeben, wenn der Benutzer nicht gefunden wurde', async () => {
      // Mock für eine gültige Session, aber keinen Benutzer
      const validSession: SessionRow = {
        id: 'valid-session',
        user_id: 'test-user-id',
        expires_at: Math.floor((mockNow + 1000000) / 1000) // in der Zukunft
      };
      
      mockDb.first
        .mockResolvedValueOnce(validSession) // Session gefunden
        .mockResolvedValueOnce(null);        // Kein Benutzer gefunden

      // Test ausführen
      const result = await validateSession(mockDb as any, 'valid-session');

      // Überprüfungen
      expect(result).toEqual({ session: null, user: null });
      expect(mockDb.prepare).toHaveBeenNthCalledWith(
        2,
        expect.stringMatching(/^SELECT\s+.+\s+FROM\s+users\s+WHERE\s+id\s+=\s+\?$/)
      );
      expect(mockDb.bind).toHaveBeenNthCalledWith(2, 'test-user-id');
    });

    it('sollte eine gültige Session und Benutzerdaten zurückgeben', async () => {
      // Mocks für eine gültige Session und Benutzer
      const validSession: SessionRow = {
        id: 'valid-session',
        user_id: 'test-user-id',
        expires_at: Math.floor((mockNow + 1000000) / 1000) // in der Zukunft
      };
      
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        username: 'testuser',
        image: 'avatar.jpg',
        email_verified: false
      };
      
      mockDb.first
        .mockResolvedValueOnce(validSession) // Session gefunden
        .mockResolvedValueOnce(mockUser);    // Benutzer gefunden

      // Test ausführen
      const result = await validateSession(mockDb as any, 'valid-session');

      // Überprüfungen
      expect(result).toEqual({
        session: {
          id: 'valid-session',
          userId: 'test-user-id',
          expiresAt: new Date(validSession.expires_at * 1000)
        },
        user: mockUser
      });
    });
  });

  describe('invalidateSession', () => {
    it('sollte die Session aus der Datenbank löschen', async () => {
      // Test ausführen
      await invalidateSession(mockDb as any, 'test-session-id');

      // Überprüfungen
      expect(mockDb.prepare).toHaveBeenCalledWith('DELETE FROM sessions WHERE id = ?');
      expect(mockDb.bind).toHaveBeenCalledWith('test-session-id');
      expect(mockDb.run).toHaveBeenCalled();
    });
  });

  // Aufräumen nach allen Tests
  afterAll(() => {
    // Originale Funktionen wiederherstellen
    crypto.randomUUID = originalRandomUUID;
    vi.restoreAllMocks();
  });
});
