import { describe, expect, it, vi, beforeEach } from 'vitest';
import { POST } from '@/pages/api/user/profile';
import * as rateLimiterModule from '@/lib/rate-limiter';

vi.mock('@/lib/rate-limiter', () => ({
  standardApiLimiter: vi.fn().mockResolvedValue(null),
  apiRateLimiter: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/lib/security-logger', () => ({
  logProfileUpdate: vi.fn(),
  logSecurityEvent: vi.fn(),
  logApiError: vi.fn(),
  logAuthFailure: vi.fn(),
}));

const defaultUser = {
  id: 'user-123',
  name: 'Original Name',
  username: 'original_username',
};

const buildFormData = (entries: Record<string, FormDataEntryValue>) => {
  const form = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    form.append(key, value);
  }
  return form;
};

const createStatement = () => ({
  bind: vi.fn().mockReturnThis(),
  run: vi.fn().mockResolvedValue({ success: true }),
  first: vi.fn().mockResolvedValue(null),
});

type ContextBundle = {
  context: any;
  statements: {
    selectMeta: ReturnType<typeof createStatement>;
    selectUsername: ReturnType<typeof createStatement>;
    updateUser: ReturnType<typeof createStatement>;
  };
  prepareMock: ReturnType<typeof vi.fn>;
};

const buildContext = (options?: {
  formEntries?: Record<string, FormDataEntryValue>;
  user?: typeof defaultUser | null;
  cooldownDays?: string;
  clientAddress?: string;
  url?: string;
  headers?: HeadersInit;
}): ContextBundle => {
  const selectMeta = createStatement();
  const selectUsername = createStatement();
  const updateUser = createStatement();

  const prepareMock = vi.fn((sql: string) => {
    if (sql.startsWith('UPDATE users SET name = ?, username = ?, profile_last_updated_at = ? WHERE id = ?')) {
      return updateUser;
    }
    if (sql.startsWith('SELECT role, profile_last_updated_at AS last FROM users WHERE id = ?')) {
      return selectMeta;
    }
    if (sql.startsWith('SELECT id FROM users WHERE username = ? AND id != ?')) {
      return selectUsername;
    }
    return createStatement();
  });

  const db = { prepare: prepareMock };

  const context = {
    request: {
      formData: vi.fn(async () =>
        buildFormData(options?.formEntries ?? { name: 'New Name', username: 'new_username' })
      ),
      method: 'POST',
      url: options?.url ?? 'http://localhost/api/user/profile',
      headers: new Headers({
        'accept-language': 'de-DE,de;q=0.8,en;q=0.5',
        accept: 'application/json',
        Origin: 'http://localhost',
        Referer: 'http://localhost/profile',
        ...(options?.headers ?? {}),
      }),
    },
    locals: {
      user: options?.user ?? { ...defaultUser },
      runtime: {
        env: {
          DB: db,
          PROFILE_UPDATE_COOLDOWN_DAYS: options?.cooldownDays ?? '30',
          AUTH_CSRF_RELAXED: 'true',
        },
      },
    },
    clientAddress: options?.clientAddress ?? '127.0.0.1',
  };

  return { context, statements: { selectMeta, selectUsername, updateUser }, prepareMock };
};

describe('POST /api/user/profile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns validation error when name is too short', async () => {
    const { context } = buildContext({ formEntries: { name: 'A', username: 'valid_user' } });
    const response = await POST(context);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.type).toBe('validation_error');
    expect(body.error.message).toContain('Name must be between');
  });

  it('returns validation error when username contains invalid characters', async () => {
    const { context } = buildContext({ formEntries: { name: 'Valid', username: 'invalid@user' } });
    const response = await POST(context);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.type).toBe('validation_error');
    expect(body.error.message).toContain('letters, numbers and underscores');
  });

  it('returns validation error when username already exists', async () => {
    const { context, statements } = buildContext();
    statements.selectUsername.first.mockResolvedValueOnce({ id: 'other-user-999' });

    const response = await POST(context);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.type).toBe('validation_error');
    expect(body.error.message).toContain('Username already taken');
  });

  it('returns rate limit error when cooldown not elapsed for normal user', async () => {
    const { context, statements } = buildContext();
    const now = Date.now();
    statements.selectMeta.first.mockResolvedValueOnce({ role: 'user', last: now });

    const response = await POST(context);
    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBeTruthy();
    const body = await response.json();
    expect(body.error.type).toBe('rate_limit');
  });

  it('updates the profile successfully', async () => {
    const { context, statements } = buildContext();
    statements.updateUser.run.mockResolvedValueOnce({ success: true, changes: 1 });

    const response = await POST(context);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.user.username).toBe('new_username');
    expect(statements.updateUser.bind).toHaveBeenCalledWith(
      'New Name',
      'new_username',
      expect.any(Number),
      defaultUser.id
    );
  });

  it('propagates database errors as server error response', async () => {
    const { context, statements } = buildContext();
    const dbError = new Error('Database error during update');
    statements.updateUser.run.mockRejectedValueOnce(dbError);

    const response = await POST(context);
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error.type).toBe('server_error');
    expect(body.error.message).toBe('Database error during update');
  });

  it('respects API rate limiter and returns its response', async () => {
    const { context } = buildContext();
    const limiterResponse = new Response(JSON.stringify({ success: false, error: { type: 'rate_limit', message: 'Too many requests' } }), {
      status: 429,
      headers: { 'Retry-After': '30' },
    });
    vi.mocked(rateLimiterModule.apiRateLimiter).mockResolvedValueOnce(limiterResponse);

    const response = await POST(context);
    expect(response.status).toBe(429);
    const body = await response.json();
    expect(body.error.type).toBe('rate_limit');
  });
});
