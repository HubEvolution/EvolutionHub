import { describe, expect, it } from 'vitest';
import { GET } from './me';

describe('User Me API Tests', () => {
  it('sollte 401 zurückgeben, wenn kein Benutzer authentifiziert ist', () => {
    // Mock-Context ohne Benutzer
    const context = {
      locals: {}
    };
    
    // API-Aufruf
    const response = GET(context as any);
    
    // Überprüfungen
    expect(response.status).toBe(401);
    expect(response.headers.get('Content-Type')).toBe('application/json');
  });

  it('sollte den authentifizierten Benutzer zurückgeben', async () => {
    // Mock-Benutzerdaten
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      username: 'testuser',
      created_at: '2023-01-01T12:00:00Z',
    };
    
    // Mock-Context mit authentifiziertem Benutzer
    const context = {
      locals: {
        user: mockUser
      }
    };
    
    // API-Aufruf
    const response = GET(context as any);
    
    // Überprüfungen
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/json');
    
    // Response-Body überprüfen
    const responseData = await response.json();
    expect(responseData).toEqual(mockUser);
  });

  it('sollte den Benutzer ohne sensible Daten zurückgeben', async () => {
    // Mock-Benutzerdaten mit sensiblen Informationen
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      username: 'testuser',
      created_at: '2023-01-01T12:00:00Z',
      password_hash: 'hashed_password', // Sollte nicht zurückgegeben werden
      sessions: [], // Sollte nicht zurückgegeben werden
      role: 'user',
      some_internal_data: 'secret', // Weiteres Feld, das nicht zurückgegeben werden sollte
    };
    
    // Mock-Context mit authentifiziertem Benutzer
    const context = {
      locals: {
        user: mockUser
      }
    };
    
    // API-Aufruf
    const response = GET(context as any);
    
    // Überprüfungen
    const responseData = await response.json();
    
    // Erlaubte Felder sollten vorhanden sein
    expect(responseData.id).toBe('user-123');
    expect(responseData.email).toBe('test@example.com');
    expect(responseData.name).toBe('Test User');
    expect(responseData.username).toBe('testuser');
    expect(responseData.created_at).toBe('2023-01-01T12:00:00Z');
    
    // Sensible Daten sollten NICHT in der Response enthalten sein
    expect(responseData.password_hash).toBeUndefined();
    expect(responseData.sessions).toBeUndefined();
    expect(responseData.some_internal_data).toBeUndefined();
    expect(responseData.role).toBeUndefined();
  });
});
