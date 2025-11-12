/**
 * Unit-Tests für das Auth-v2 Modul
 *
 * Diese Tests decken die Kernfunktionen von src/lib/auth-v2.ts ab:
 * - createSession: Erstellung einer neuen Session mit DB-Insert
 * - validateSession: Validierung inkl. Ablauf-Check, Löschung abgelaufener Sessions, User-Laden
 * - invalidateSession: Löschung einer Session
 *
 * @module auth-v2.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSession, validateSession, invalidateSession } from '../../../src/lib/auth-v2';
import type { D1Database, D1PreparedStatement } from '@cloudflare/workers-types';
import type { Session, User } from '../../../src/lib/auth-v2';

// Mock für D1Database
vi.mock('@cloudflare/workers-types', () => ({
  D1Database: vi.fn(),
  D1PreparedStatement: vi.fn(),
}));

const mockPrepare = vi.fn();
const mockBind = vi.fn().mockReturnThis();
const mockRun = vi.fn();
const mockFirst = vi.fn();

const mockD1: D1Database = {
  prepare: mockPrepare,
} as unknown as D1Database;

beforeEach(() => {
  vi.clearAllMocks();
  mockPrepare.mockReturnValue({
    bind: mockBind,
    run: mockRun,
    first: mockFirst,
  } as unknown as D1PreparedStatement);
  vi.useFakeTimers();
});

describe('createSession', () => {
  it('sollte eine neue Session erfolgreich erstellen und in die DB einfügen', async () => {
    const userId = 'user-123';
    const mockSessionId = 'session-123';
    vi.stubGlobal('crypto', { randomUUID: () => mockSessionId });
    const now = Date.now();
    const expiresAt = new Date(now + 60 * 60 * 24 * 30 * 1000);

    mockRun.mockResolvedValue({ success: true });

    const session = await createSession(mockD1, userId);

    expect(mockPrepare).toHaveBeenCalledWith(
      'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)'
    );
    expect(mockBind).toHaveBeenCalledWith(
      mockSessionId,
      userId,
      Math.floor(expiresAt.getTime() / 1000)
    );
    expect(mockRun).toHaveBeenCalled();
    expect(session).toEqual({
      id: mockSessionId,
      userId,
      expiresAt,
    });
  });

  it('sollte einen Fehler werfen, wenn DB-Insert fehlschlägt', async () => {
    const userId = 'user-123';
    mockRun.mockRejectedValue(new Error('DB Error'));

    await expect(createSession(mockD1, userId)).rejects.toThrow('DB Error');
  });
});

describe('validateSession', () => {
  const mockSessionId = 'session-123';
  const mockUserId = 'user-123';
  const mockExpiresAt = Date.now() + 60 * 60 * 1000; // 1 Stunde in Zukunft
  const mockSessionRow = {
    id: mockSessionId,
    user_id: mockUserId,
    expires_at: mockExpiresAt,
  };

  it('sollte eine gültige Session und User zurückgeben', async () => {
    mockFirst
      .mockReturnValueOnce(mockSessionRow) // sessions query
      .mockReturnValueOnce({
        id: mockUserId,
        email: 'test@example.com',
        name: 'Test User',
        username: 'testuser',
        image: 'avatar.jpg',
        email_verified: true,
        email_verified_at: 1234567890,
      }); // users query

    const result = await validateSession(mockD1, mockSessionId);

    expect(mockPrepare).toHaveBeenNthCalledWith(1, 'SELECT * FROM sessions WHERE id = ?');
    expect(mockBind).toHaveBeenNthCalledWith(1, mockSessionId);
    expect(mockFirst).toHaveBeenNthCalledWith(1, mockSessionRow);
    expect(mockPrepare).toHaveBeenNthCalledWith(
      2,
      'SELECT id, email, name, username, image, email_verified, email_verified_at FROM users WHERE id = ?'
    );
    expect(mockBind).toHaveBeenNthCalledWith(2, mockUserId);
    expect(result.session).toEqual({
      id: mockSessionId,
      userId: mockUserId,
      expiresAt: new Date(mockExpiresAt * 1000),
    });
    expect(result.user).toEqual({
      id: mockUserId,
      email: 'test@example.com',
      name: 'Test User',
      username: 'testuser',
      image: 'avatar.jpg',
      email_verified: true,
    });
  });

  it('sollte null zurückgeben, wenn Session-ID nicht existiert', async () => {
    mockFirst.mockReturnValueOnce(null); // sessions query

    const result = await validateSession(mockD1, mockSessionId);

    expect(result.session).toBeNull();
    expect(result.user).toBeNull();
    expect(mockPrepare).toHaveBeenCalledWith('SELECT * FROM sessions WHERE id = ?');
    expect(mockBind).toHaveBeenCalledWith(mockSessionId);
  });

  it('sollte abgelaufene Session löschen und null zurückgeben', async () => {
    const expiredExpiresAt = Date.now() / 1000 - 3600; // Vor 1 Stunde abgelaufen
    mockFirst.mockReturnValueOnce({
      id: mockSessionId,
      user_id: mockUserId,
      expires_at: expiredExpiresAt,
    });

    mockRun.mockResolvedValue({ success: true }); // DELETE

    const result = await validateSession(mockD1, mockSessionId);

    expect(mockPrepare).toHaveBeenNthCalledWith(2, 'DELETE FROM sessions WHERE id = ?');
    expect(mockBind).toHaveBeenNthCalledWith(2, mockSessionId);
    expect(mockRun).toHaveBeenCalled();
    expect(result.session).toBeNull();
    expect(result.user).toBeNull();
  });

  it('sollte null zurückgeben, wenn User nicht existiert', async () => {
    mockFirst
      .mockReturnValueOnce(mockSessionRow) // sessions
      .mockReturnValueOnce(null); // users

    const result = await validateSession(mockD1, mockSessionId);

    expect(result.session).toBeNull();
    expect(result.user).toBeNull();
  });

  it('sollte einen Fehler werfen, wenn DB-Abfrage fehlschlägt', async () => {
    mockFirst.mockRejectedValue(new Error('DB Query Error'));

    await expect(validateSession(mockD1, mockSessionId)).rejects.toThrow('DB Query Error');
  });
});

describe('invalidateSession', () => {
  const mockSessionId = 'session-123';

  it('sollte eine Session erfolgreich löschen', async () => {
    mockRun.mockResolvedValue({ success: true });

    await invalidateSession(mockD1, mockSessionId);

    expect(mockPrepare).toHaveBeenCalledWith('DELETE FROM sessions WHERE id = ?');
    expect(mockBind).toHaveBeenCalledWith(mockSessionId);
    expect(mockRun).toHaveBeenCalled();
  });

  it('sollte einen Fehler werfen, wenn DB-Löschung fehlschlägt', async () => {
    mockRun.mockRejectedValue(new Error('DB Delete Error'));

    await expect(invalidateSession(mockD1, mockSessionId)).rejects.toThrow('DB Delete Error');
  });
});
