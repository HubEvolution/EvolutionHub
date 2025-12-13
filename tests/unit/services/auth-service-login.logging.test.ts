import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { D1Database } from '@cloudflare/workers-types';

import { AuthServiceImpl } from '@/lib/services/auth-service-impl';
import { ServiceErrorType, ServiceError } from '@/lib/services/types';

const mockLogAuthFailure = vi.fn();
const mockLogAuthSuccess = vi.fn();

vi.mock('@/server/utils/logger-factory', () => {
  return {
    loggerFactory: {
      createSecurityLogger: () => ({
        logSecurityEvent: vi.fn(),
        logAuthSuccess: mockLogAuthSuccess,
        logAuthFailure: mockLogAuthFailure,
        logApiAccess: vi.fn(),
        logApiError: vi.fn(),
      }),
    },
  };
});

// Stub bcrypt compare/hash to avoid expensive operations
const compareMock = vi.fn((..._args: unknown[]) => Promise.resolve(false));
const hashMock = vi.fn((..._args: unknown[]) => Promise.resolve(''));

vi.mock('bcrypt-ts', () => {
  return {
    compare: (...args: unknown[]) => compareMock(...args),
    hash: (...args: unknown[]) => hashMock(...args),
  };
});

vi.mock('@/lib/auth-v2', () => {
  return {
    createSession: vi.fn(async () => ({ id: 'sess-1', userId: 'user-1' })),
    validateSession: vi.fn(),
    validateSessionV2: vi.fn(),
    invalidateSession: vi.fn(),
  };
});

function createDbStub(userRow: unknown | null): D1Database {
  const db = {
    prepare: vi.fn().mockImplementation((_query: string) => {
      return {
        bind: vi.fn().mockImplementation((_email: string) => {
          return {
            first: vi.fn().mockResolvedValue(userRow),
          };
        }),
      };
    }),
  } as unknown as D1Database;

  return db;
}

describe('AuthServiceImpl.login security logging', () => {
  beforeEach(() => {
    mockLogAuthFailure.mockClear();
    mockLogAuthSuccess.mockClear();
    compareMock.mockReset();
  });

  it('logs AUTH_FAILURE user_not_found and throws authentication error', async () => {
    const db = createDbStub(null);
    const service = new AuthServiceImpl({ db, isDevelopment: true });

    compareMock.mockResolvedValue(false);

    const ipAddress = '203.0.113.10';
    const email = 'missing@example.com';

    await expect(service.login(email, 'password', ipAddress)).rejects.toMatchObject({
      type: ServiceErrorType.AUTHENTICATION,
    } satisfies Partial<ServiceError>);

    expect(mockLogAuthFailure).toHaveBeenCalledTimes(1);
    const [details, context] = mockLogAuthFailure.mock.calls[0];

    expect(details).toMatchObject({
      reason: 'user_not_found',
      email,
    });
    expect(context).toMatchObject({
      ipAddress,
      action: 'login_attempt',
    });
  });

  it('logs AUTH_FAILURE invalid_password when password does not match', async () => {
    const userRow = {
      id: 'user-1',
      email: 'user@example.com',
      password_hash: 'hashed',
      email_verified: 1,
    };
    const db = createDbStub(userRow);
    const service = new AuthServiceImpl({ db, isDevelopment: true });

    compareMock.mockResolvedValue(false);

    const ipAddress = '198.51.100.5';

    await expect(service.login(userRow.email, 'wrong-password', ipAddress)).rejects.toMatchObject({
      type: ServiceErrorType.AUTHENTICATION,
    } satisfies Partial<ServiceError>);

    expect(mockLogAuthFailure).toHaveBeenCalledTimes(1);
    const [details, context] = mockLogAuthFailure.mock.calls[0];

    expect(details).toMatchObject({
      reason: 'invalid_password',
      userId: userRow.id,
    });
    expect(context).toMatchObject({
      ipAddress,
      userId: userRow.id,
      action: 'login_attempt',
    });
  });

  it('logs AUTH_FAILURE email_not_verified when user email is not verified', async () => {
    const userRow = {
      id: 'user-2',
      email: 'user2@example.com',
      password_hash: 'hashed',
      email_verified: 0,
    };
    const db = createDbStub(userRow);
    const service = new AuthServiceImpl({ db, isDevelopment: true });

    compareMock.mockResolvedValue(true);

    const ipAddress = '192.0.2.20';

    await expect(service.login(userRow.email, 'password', ipAddress)).rejects.toMatchObject({
      type: ServiceErrorType.AUTHENTICATION,
    } satisfies Partial<ServiceError>);

    expect(mockLogAuthFailure).toHaveBeenCalledTimes(1);
    const [details, context] = mockLogAuthFailure.mock.calls[0];

    expect(details).toMatchObject({
      reason: 'email_not_verified',
      userId: userRow.id,
      email: userRow.email,
    });
    expect(context).toMatchObject({
      ipAddress,
      userId: userRow.id,
      action: 'login_attempt',
    });
  });

  it('logs AUTH_SUCCESS on successful login with verified email', async () => {
    const userRow = {
      id: 'user-3',
      email: 'ok@example.com',
      password_hash: 'hashed',
      email_verified: 1,
      name: 'User 3',
      username: 'user3',
      image: null,
      created_at: new Date().toISOString(),
    };
    const db = createDbStub(userRow);
    const service = new AuthServiceImpl({ db, isDevelopment: true });

    compareMock.mockResolvedValue(true);

    const ipAddress = '203.0.113.77';

    const result = await service.login(userRow.email, 'password', ipAddress);

    expect(result.user.id).toBe(userRow.id);
    expect(result.sessionId).toBe('sess-1');

    expect(mockLogAuthSuccess).toHaveBeenCalledTimes(1);
    const [details, context] = mockLogAuthSuccess.mock.calls[0];

    expect(details).toMatchObject({
      action: 'login',
      sessionId: 'sess-1',
    });
    expect(context).toMatchObject({
      userId: userRow.id,
      ipAddress,
      sessionId: 'sess-1',
      action: 'login_success',
    });
  });
});
