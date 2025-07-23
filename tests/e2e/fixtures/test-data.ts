// Testdaten für E2E-Tests
export const testUsers = {
  admin: {
    email: 'admin@example.com',
    password: 'admin123',
    name: 'Admin User',
    role: 'admin'
  },
  standard: {
    email: 'user@example.com',
    password: 'user123',
    name: 'Standard User',
    role: 'user'
  },
  locked: {
    email: 'locked@example.com',
    password: 'locked123',
    name: 'Locked User',
    role: 'user',
    status: 'locked'
  }
};

// Mock-Daten für API-Antworten
export const mockResponses = {
  auth: {
    success: (user = testUsers.standard) => ({
      user: {
        id: 'user-123',
        email: user.email,
        name: user.name,
        role: user.role,
        image: 'https://example.com/avatar.png'
      },
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token'
    }),
    error: (message = 'Authentication failed') => ({
      error: {
        status: 401,
        message,
        code: 'AUTH_ERROR'
      }
    })
  }
};

// Hilfsfunktionen für Testdaten
export function generateRandomEmail(prefix = 'test') {
  return `${prefix}-${Math.random().toString(36).substring(2, 10)}@test.com`;
}

export function generateRandomString(length = 10) {
  return Math.random().toString(36).substring(2, length + 2);
}
