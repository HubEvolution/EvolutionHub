import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { POST } from './profile';

// Mocks für die Security-Module
vi.mock('@/lib/rate-limiter', () => ({
  standardApiLimiter: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/lib/security-headers', () => ({
  secureJsonResponse: vi.fn((data, status = 200) => new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })),
  secureErrorResponse: vi.fn((message, status = 400) => new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' }
  }))
}));

vi.mock('@/lib/security-logger', () => ({
  logProfileUpdate: vi.fn(),
  logApiError: vi.fn(),
  logPermissionDenied: vi.fn()
}));

describe('User Profile API Tests', () => {
  // Mock für DB-Chain
  let mockDb;
  let mockPreparedStatement;
  let mockContext;
  
  // Mock für console.error
  let consoleErrorSpy;
  
  beforeEach(() => {
    // Erstellen von verschachtelten Mocks, die die DB-Chain richtig simulieren
    mockPreparedStatement = {
      bind: vi.fn().mockReturnThis(),
      run: vi.fn().mockResolvedValue({ success: true })
    };
    
    mockDb = {
      prepare: vi.fn().mockReturnValue(mockPreparedStatement)
    };
    
    mockContext = {
      request: {
        formData: vi.fn().mockResolvedValue(new FormData()),
      },
      locals: {
        user: {
          id: 'user-123',
          name: 'Original Name',
          username: 'original_username',
        },
        runtime: {
          env: {
            DB: mockDb
          },
        },
      },
    };
    
    // Mock für console.error
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  
  afterEach(() => {
    vi.resetAllMocks();
    consoleErrorSpy.mockRestore();
  });

  it('sollte 401 mit JSON-Fehlermeldung zurückgeben, wenn kein Benutzer authentifiziert ist', async () => {
    // Context ohne authentifizierten Benutzer
    const unauthenticatedContext = {
      ...mockContext,
      locals: { runtime: mockContext.locals.runtime } // Ohne user Objekt
    };

    const response = await POST(unauthenticatedContext as any);
    
    expect(response.status).toBe(401);
    expect(response.headers.get('Content-Type')).toBe('application/json');
    
    const responseData = await response.json();
    expect(responseData.error).toBe('Not authenticated');
  });

  it('sollte 400 zurückgeben, wenn der Name zu kurz ist', async () => {
    const formData = new FormData();
    formData.append('name', 'A'); // Zu kurz
    formData.append('username', 'validusername');
    mockContext.request.formData.mockResolvedValueOnce(formData);

    const response = await POST(mockContext as any);
    
    expect(response.status).toBe(400);
    expect(response.headers.get('Content-Type')).toBe('application/json');
    
    const responseData = await response.json();
    expect(responseData.error).toBe('Name must be between 2 and 50 characters');
  });

  it('sollte 400 zurückgeben, wenn der Benutzername zu kurz ist', async () => {
    const formData = new FormData();
    formData.append('name', 'Valid Name');
    formData.append('username', 'ab'); // Zu kurz
    mockContext.request.formData.mockResolvedValueOnce(formData);

    const response = await POST(mockContext as any);
    
    expect(response.status).toBe(400);
    expect(response.headers.get('Content-Type')).toBe('application/json');
    
    const responseData = await response.json();
    expect(responseData.error).toBe('Username must be between 3 and 30 characters');
  });

  it('sollte 400 zurückgeben, wenn der Name zu lang ist', async () => {
    const formData = new FormData();
    formData.append('name', 'A'.repeat(51)); // Zu lang (51 Zeichen)
    formData.append('username', 'validusername');
    mockContext.request.formData.mockResolvedValueOnce(formData);

    const response = await POST(mockContext as any);
    
    expect(response.status).toBe(400);
    expect(response.headers.get('Content-Type')).toBe('application/json');
    
    const responseData = await response.json();
    expect(responseData.error).toBe('Name must be between 2 and 50 characters');
  });

  it('sollte 400 zurückgeben, wenn der Benutzername ungültige Zeichen enthält', async () => {
    const formData = new FormData();
    formData.append('name', 'Valid Name');
    formData.append('username', 'invalid@username'); // Ungültiges Zeichen @
    mockContext.request.formData.mockResolvedValueOnce(formData);

    const response = await POST(mockContext as any);
    
    expect(response.status).toBe(400);
    expect(response.headers.get('Content-Type')).toBe('application/json');
    
    const responseData = await response.json();
    expect(responseData.error).toBe('Username may only contain letters, numbers and underscores');
  });

  it('sollte 409 zurückgeben, wenn der Benutzername bereits existiert', async () => {
    const formData = new FormData();
    formData.append('name', 'Valid Name');
    formData.append('username', 'existinguser'); // Bereits existierender Username
    mockContext.request.formData.mockResolvedValueOnce(formData);

    // Username-Kollisionsprüfung simulieren
    // Neuer DB-API Flow verwendet first() für Username-Kollisionsprüfung
    const firstMock = vi.fn().mockResolvedValueOnce({ id: 'other-user-123' });
    mockPreparedStatement.first = firstMock;

    const response = await POST(mockContext as any);
    
    expect(response.status).toBe(409);
    expect(response.headers.get('Content-Type')).toBe('application/json');
    
    const responseData = await response.json();
    expect(responseData.error).toBe('Username already taken');
  });

  it('sollte das Profil erfolgreich aktualisieren', async () => {
    const newName = 'New Name';
    const newUsername = 'new_username';
    
    const formData = new FormData();
    formData.append('name', newName);
    formData.append('username', newUsername);
    mockContext.request.formData.mockResolvedValueOnce(formData);
    
    // Username-Kollisionsprüfung simulieren (kein Konflikt)
    mockPreparedStatement.first = vi.fn().mockResolvedValueOnce(null);

    const response = await POST(mockContext as any);
    
    // Überprüfen, dass die Datenbank korrekt aktualisiert wurde
    expect(mockDb.prepare).toHaveBeenCalledWith(
      'UPDATE users SET name = ?, username = ? WHERE id = ?'
    );
    expect(mockPreparedStatement.bind).toHaveBeenCalledWith(
      newName, newUsername, 'user-123'
    );
    expect(mockPreparedStatement.run).toHaveBeenCalled();
    
    // Überprüfen der erfolgreichen Antwort mit erweiterten Daten
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/json');
    
    const responseData = await response.json();
    expect(responseData.message).toBe('Profile updated successfully');
    expect(responseData.user).toBeDefined();
    expect(responseData.user).toEqual({
      id: 'user-123',
      name: newName,
      username: newUsername
    });
  });

  it('sollte 500 zurückgeben, wenn ein Datenbankfehler auftritt', async () => {
    const formData = new FormData();
    formData.append('name', 'Valid Name');
    formData.append('username', 'valid_username');
    mockContext.request.formData.mockResolvedValueOnce(formData);
    
    // Username-Kollisionsprüfung simulieren (kein Konflikt)
    mockPreparedStatement.first = vi.fn().mockResolvedValueOnce(null);
    
    // Datenbankfehler beim Update simulieren
    const dbError = new Error('Database error');
    mockPreparedStatement.run.mockRejectedValueOnce(dbError);

    const response = await POST(mockContext as any);
    
    // Überprüfen, dass der Fehler protokolliert wurde
    expect(consoleErrorSpy).toHaveBeenCalledWith('Profile update error:', dbError);
    
    // Überprüfen der Fehlerantwort
    expect(response.status).toBe(500);
    expect(response.headers.get('Content-Type')).toBe('application/json');
    
    const responseData = await response.json();
    expect(responseData.error).toBe('Failed to update profile');
  });
});
