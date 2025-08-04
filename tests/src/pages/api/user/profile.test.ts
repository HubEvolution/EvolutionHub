import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '../../../src/pages/api/user/profile';

// --- Mocks ---
vi.mock('@/lib/rate-limiter', () => ({
  standardApiLimiter: vi.fn().mockResolvedValue(null), // Default: allow request
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

// Explicitly import mocked functions for assertions
// Vitest's vi.mock makes these mocks available if they are defined in the same file's scope.
// Therefore, direct usage of logProfileUpdate, logApiError etc. within tests is fine.

describe('User Profile API Tests', () => {
  let mockDb;
  let mockPreparedStatement;
  let mockContext;
  let consoleErrorSpy;
  
  beforeEach(() => {
    // Erstellen von verschachtelten Mocks, die die DB-Chain richtig simulieren
    mockPreparedStatement = {
      bind: vi.fn().mockReturnThis(),
      run: vi.fn().mockResolvedValue({ success: true }),
      first: vi.fn().mockResolvedValue(null) // Default mock for first()
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
    
    // Mock for console.error
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
    // Note: logPermissionDenied is not explicitly called in the POST function logic for auth failure.
    // If it were, we'd add: expect(logPermissionDenied).toHaveBeenCalledWith(undefined, 'update_profile'); 
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
    mockPreparedStatement.first.mockResolvedValueOnce({ id: 'other-user-123' }); // Simulate username exists

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
    
    mockPreparedStatement.first.mockResolvedValueOnce(null); // Simulate username not existing

    const response = await POST(mockContext as any);
    
    expect(mockDb.prepare).toHaveBeenCalledWith('UPDATE users SET name = ?, username = ? WHERE id = ?');
    expect(mockPreparedStatement.bind).toHaveBeenCalledWith(newName, newUsername, 'user-123');
    expect(mockPreparedStatement.run).toHaveBeenCalled();
    
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/json');
    
    const responseData = await response.json();
    expect(responseData.message).toBe('Profile updated successfully');
    expect(responseData.user).toEqual({
      id: 'user-123',
      name: newName,
      username: newUsername
    });

    // --- Added logging assertion for successful update ---
    expect(logProfileUpdate).toHaveBeenCalledWith('user-123', { name: newName, username: newUsername });
  });

  it('sollte 500 zurückgeben, wenn ein Datenbankfehler auftritt', async () => {
    const formData = new FormData();
    formData.append('name', 'Valid Name');
    formData.append('username', 'valid_username');
    mockContext.request.formData.mockResolvedValueOnce(formData);
    
    mockPreparedStatement.first.mockResolvedValueOnce(null); // Simulate username não existing
    
    const dbError = new Error('Database error during update'); // More descriptive error
    mockPreparedStatement.run.mockRejectedValueOnce(dbError);

    const response = await POST(mockContext as any);
    
    // Check if console.error was called for the DB error
    expect(consoleErrorSpy).toHaveBeenCalledWith('Profile update error:', dbError);
    
    expect(response.status).toBe(500);
    expect(response.headers.get('Content-Type')).toBe('application/json');
    
    const responseData = await response.json();
    expect(responseData.error).toBe('Failed to update profile');

    // --- Added logging assertion for API error ---
    expect(logApiError).toHaveBeenCalledWith('user/profile', expect.any(Error));
  });

  // --- NEW TEST CASE FOR RATE LIMITING ---
  it('sollte 429 zurückgeben, wenn die Ratenbegrenzung überschritten wird', async () => {
    // Get access to the modules and their mocked functions for spying.
    // Vitest's vi.mock makes these functions available directly in the test scope.
    const rateLimiterModule = await import('@/lib/rate-limiter');
    const securityHeadersModule = await import('@/lib/security-headers');

    // Spy on the specific functions needed for this test.
    const rateLimiterSpy = vi.spyOn(rateLimiterModule, 'standardApiLimiter');
    const secureErrorResponseSpy = vi.spyOn(securityHeadersModule, 'secureErrorResponse');

    // Define the mock response for a rate-limited scenario.
    // Use the spied secureErrorResponse to create the response.
    const mockRateLimitedResponse = secureErrorResponseSpy('Zu viele Anfragen', 429);
    
    // Set the mock implementation for standardApiLimiter to return the rate-limited response.
    rateLimiterSpy.mockResolvedValueOnce(mockRateLimitedResponse as any); 

    // Execute the POST request with the mock context.
    const response = await POST(mockContext as any);

    // Assertions for the rate-limited response.
    expect(response.status).toBe(429);
    expect(response.headers.get('Content-Type')).toBe('application/json');
    const responseData = await response.json();
    expect(responseData.error).toBe('Zu viele Anfragen');

    // Restore the original implementations of the spied functions.
    rateLimiterSpy.mockRestore();
    secureErrorResponseSpy.mockRestore();
  });
});