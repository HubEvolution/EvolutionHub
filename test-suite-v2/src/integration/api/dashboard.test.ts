/**
 * Integration-Tests für Dashboard-API-Routen
 * 
 * Diese Tests decken die Dashboard-Endpunkte ab:
 * - activity.ts: GET Aktivitäten mit Auth/DB
 * - notifications.ts: GET Notifications mit Auth/DB
 * - perform-action.ts: POST Aktionen (create_project/task, etc.) mit Auth/DB
 * - projects.ts: GET Projects mit Auth/DB
 * - quick-actions.ts: GET statische Actions ohne Auth
 * - stats.ts: GET Stats (Counts) mit Auth/DB
 * 
 * Mocks: withAuthApiMiddleware (auth success/fail), D1-DB (queries/results/errors), logger.
 * Fokus: Auth-Integration, Error-Handling (401/500), Happy Paths.
 * 
 * @module dashboard.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET as getActivity } from '../../../../src/pages/api/dashboard/activity';
import { GET as getNotifications } from '../../../../src/pages/api/dashboard/notifications';
import { POST as postPerformAction } from '../../../../src/pages/api/dashboard/perform-action';
import { GET as getProjects } from '../../../../src/pages/api/dashboard/projects';
import { GET as getQuickActions } from '../../../../src/pages/api/dashboard/quick-actions';
import { GET as getStats } from '../../../../src/pages/api/dashboard/stats';
import type { APIContext } from 'astro';
import { withAuthApiMiddleware } from '@/lib/api-middleware';
import { logUserEvent, logApiAccess } from '@/lib/security-logger';
import type { D1Database } from '@cloudflare/workers-types';

// Mocks
vi.mock('@/lib/api-middleware', () => ({
  withAuthApiMiddleware: vi.fn(),
  createApiSuccess: vi.fn((data) => new Response(JSON.stringify({ success: true, data }))),
  createApiError: vi.fn((type, message) => new Response(JSON.stringify({ success: false, error: message }), { status: 400 })),
}));

vi.mock('@/lib/security-logger', () => ({
  logUserEvent: vi.fn(),
  logApiAccess: vi.fn(),
}));

const mockLogUserEvent = vi.mocked(logUserEvent);
const mockLogApiAccess = vi.mocked(logApiAccess);
const mockWithAuthApiMiddleware = vi.mocked(withAuthApiMiddleware);

const mockDB: D1Database = {
  prepare: vi.fn(() => ({
    bind: vi.fn().mockReturnThis(),
    all: vi.fn(),
    first: vi.fn(),
    run: vi.fn(),
  })),
} as any;

const mockEnv = { DB: mockDB };

const createMockContext = (auth = true, user = { id: 'user-123' }, request = new Request('http://test')): APIContext => ({
  request,
  locals: {
    runtime: { env: mockEnv },
    user: auth ? user : null,
  },
  clientAddress: '127.0.0.1',
} as any);

beforeEach(() => {
  vi.clearAllMocks();
  mockWithAuthApiMiddleware.mockImplementation((handler, options) => async (context) => {
    if (!context.locals.user) return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401 });
    return handler(context);
  });
});

describe('Dashboard API Integration Tests', () => {
  it('GET /activity - sollte Aktivitäten mit gültiger Auth und DB-Daten zurückgeben', async () => {
    const mockResults = [{ results: [{ id: 'act1', action: 'login', created_at: '2023-01-01', user: 'Test', user_image: 'img.jpg' }] }];
    mockDB.prepare().all.mockResolvedValue(mockResults);

    const context = createMockContext(true);
    const response = await getActivity(context);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual([{ id: 'act1', user: 'Test', action: 'login', timestamp: '2023-01-01', icon: '✨', color: 'text-purple-400' }]);
    expect(mockDB.prepare).toHaveBeenCalledWith(expect.stringContaining('SELECT a.id, a.action'));
    expect(mockLogUserEvent).toHaveBeenCalledWith('user-123', 'activity_feed_accessed', expect.any(Object));
  });

  it('GET /activity - sollte 401 bei fehlender Auth zurückgeben', async () => {
    const context = createMockContext(false);
    const response = await getActivity(context);

    expect(response.status).toBe(401);
    expect(mockWithAuthApiMiddleware).toHaveBeenCalled();
  });

  it('GET /activity - sollte 500 bei DB-Fehler zurückgeben', async () => {
    mockDB.prepare().all.mockRejectedValue(new Error('DB Error'));

    const context = createMockContext(true);
    const response = await getActivity(context);

    expect(response.status).toBe(500);
    expect(mockLogUserEvent).toHaveBeenCalledWith('user-123', 'activity_feed_error', expect.objectContaining({ error: 'DB Error' }));
  });

  it('GET /notifications - sollte Notifications mit gültiger Auth und DB-Daten zurückgeben', async () => {
    const mockResults = [{ results: [{ id: 'not1', title: 'New Notification' }] }];
    mockDB.prepare().all.mockResolvedValue(mockResults);

    const context = createMockContext(true);
    const response = await getNotifications(context);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data).toEqual([{ id: 'not1', title: 'New Notification' }]);
    expect(mockDB.prepare).toHaveBeenCalledWith(expect.stringContaining('SELECT * FROM notifications'));
    expect(mockLogUserEvent).toHaveBeenCalledWith('user-123', 'notifications_viewed', { notificationCount: 1 });
  });

  it('POST /perform-action - sollte create_project erfolgreich ausführen', async () => {
    const mockRequest = new Request('http://test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create_project' }),
    });
    const context = { ...createMockContext(true), request: mockRequest };

    mockDB.prepare().run.mockResolvedValue({ success: true });

    const response = await postPerformAction(context);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.message).toBe('Project created successfully');
    expect(mockDB.prepare).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO projects'));
    expect(mockLogUserEvent).toHaveBeenCalledWith('user-123', 'project_created', expect.any(Object));
  });

  it('POST /perform-action - sollte 400 bei invalid JSON zurückgeben', async () => {
    const mockRequest = new Request('http://test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid json',
    });
    const context = { ...createMockContext(true), request: mockRequest };

    const response = await postPerformAction(context);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('Invalid JSON in request body');
    expect(mockLogUserEvent).toHaveBeenCalledWith('user-123', 'invalid_dashboard_request', expect.any(Object));
  });

  it('POST /perform-action - sollte unknown action handhaben', async () => {
    const mockRequest = new Request('http://test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'unknown' }),
    });
    const context = { ...createMockContext(true), request: mockRequest };

    const response = await postPerformAction(context);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('Invalid action: unknown');
    expect(mockLogUserEvent).toHaveBeenCalledWith('user-123', 'invalid_dashboard_action', expect.any(Object));
  });

  it('GET /projects - sollte Projects mit gültiger Auth und DB-Daten zurückgeben', async () => {
    const mockResults = [{ results: [{ id: 'proj1', title: 'Test Project' }] }];
    mockDB.prepare().all.mockResolvedValue(mockResults);

    const context = createMockContext(true);
    const response = await getProjects(context);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual([{ id: 'proj1', title: 'Test Project', members: [] }]);
    expect(mockDB.prepare).toHaveBeenCalledWith(expect.stringContaining('SELECT id, title, description'));
    expect(mockLogApiAccess).toHaveBeenCalledWith('user-123', '127.0.0.1', expect.any(Object));
  });

  it('GET /quick-actions - sollte statische Actions ohne Auth zurückgeben', async () => {
    const context = createMockContext(false); // No auth
    const response = await getQuickActions(context);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].title).toBe('New Post');
    expect(mockLogApiAccess).toHaveBeenCalledWith('anonymous', '127.0.0.1', expect.any(Object));
  });

  it('GET /stats - sollte Stats mit Counts und Auth zurückgeben', async () => {
    mockDB.prepare().first
      .mockResolvedValueOnce({ count: 3 }) // projects
      .mockResolvedValueOnce({ count: 5 }) // tasks
      .mockResolvedValueOnce({ count: 2 }); // teamMembers

    const context = createMockContext(true);
    const response = await getStats(context);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data).toEqual({ projects: 3, tasks: 5, teamMembers: 2 });
    expect(mockDB.prepare).toHaveBeenNthCalledWith(1, expect.stringContaining('SELECT count(*) as count FROM projects'));
    expect(mockLogUserEvent).toHaveBeenCalledWith('user-123', 'dashboard_stats_viewed', expect.any(Object));
  });
});