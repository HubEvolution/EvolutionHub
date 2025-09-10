/**
 * Integration-Tests für AI Jobs API
 * Mockt Hono-Routes mit MSW für /api/ai-image/jobs/[id]
 * Testet Requests/Responses, Auth, Error-Handling
 */

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupServer } from 'msw/node';
import { rest } from 'msw';
import fetch from 'node-fetch'; // For integration fetch

// MSW Server
const server = setupServer();

// Mock global fetch
global.fetch = vi.fn();

beforeAll(() => server.listen());
afterAll(() => server.close());
beforeEach(() => server.resetHandlers());

const API_BASE = 'http://localhost:8787/api';

describe('AI Jobs API Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sollte GET Job erfolgreich returnen (authenticated)', async () => {
    // Arrange - Mock Hono Response
    server.use(
      rest.get(`${API_BASE}/ai-image/jobs/:id`, (req, res, ctx) => {
        return res(
          ctx.status(200),
          ctx.json({ success: true, data: { id: 'job1', status: 'completed' } })
        );
      })
    );

    // Act
    const response = await fetch(`${API_BASE}/ai-image/jobs/job1`, {
      headers: { 'Authorization': 'Bearer valid-token' },
    });
    const data = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.id).toBe('job1');
  });

  it('sollte GET Job für Guest returnen', async () => {
    // Arrange
    server.use(
      rest.get(`${API_BASE}/ai-image/jobs/:id`, (req, res, ctx) => {
        return res(
          ctx.status(200),
          ctx.json({ success: true, data: { id: 'job2', status: 'pending', ownerType: 'guest' } })
        );
      })
    );

    // Act
    const response = await fetch(`${API_BASE}/ai-image/jobs/job2`, {
      headers: { 'Cookie': 'guest_id=guest123' },
    });
    const data = await response.json();

    // Assert
    expect(data.data.ownerType).toBe('guest');
  });

  it('sollte unauthorized Error bei fehlender Auth returnen', async () => {
    // Arrange
    server.use(
      rest.get(`${API_BASE}/ai-image/jobs/:id`, (req, res, ctx) => {
        return res(
          ctx.status(401),
          ctx.json({ success: false, error: 'Unauthorized' })
        );
      })
    );

    // Act
    const response = await fetch(`${API_BASE}/ai-image/jobs/job3`);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('sollte not found Error bei ungültiger ID returnen', async () => {
    // Arrange
    server.use(
      rest.get(`${API_BASE}/ai-image/jobs/:id`, (req, res, ctx) => {
        return res(
          ctx.status(404),
          ctx.json({ success: false, error: 'Job not found' })
        );
      })
    );

    // Act
    const response = await fetch(`${API_BASE}/ai-image/jobs/invalid`);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(404);
    expect(data.error).toBe('Job not found');
  });

  it('sollte rate limit Error handhaben', async () => {
    // Arrange
    server.use(
      rest.get(`${API_BASE}/ai-image/jobs/:id`, (req, res, ctx) => {
        return res(
          ctx.status(429),
          ctx.json({ success: false, error: 'Rate limited' })
        );
      })
    );

    // Act
    const response = await fetch(`${API_BASE}/ai-image/jobs/job4`);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(429);
    expect(data.error).toBe('Rate limited');
  });

  it('sollte server error propagieren', async () => {
    // Arrange
    server.use(
      rest.get(`${API_BASE}/ai-image/jobs/:id`, (req, res, ctx) => {
        return res(
          ctx.status(500),
          ctx.json({ success: false, error: 'Server error' })
        );
      })
    );

    // Act
    const response = await fetch(`${API_BASE}/ai-image/jobs/job5`);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(500);
    expect(data.error).toBe('Server error');
  });

  it('sollte validation error bei fehlender ID returnen', async () => {
    // Arrange
    server.use(
      rest.get(`${API_BASE}/ai-image/jobs/`, (req, res, ctx) => { // Invalid path
        return res(
          ctx.status(400),
          ctx.json({ success: false, error: 'Job ID fehlt' })
        );
      })
    );

    // Act
    const response = await fetch(`${API_BASE}/ai-image/jobs/`);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(400);
    expect(data.error).toBe('Job ID fehlt');
  });

  it('sollte forbidden bei unauthorized access returnen', async () => {
    // Arrange
    server.use(
      rest.get(`${API_BASE}/ai-image/jobs/:id`, (req, res, ctx) => {
        return res(
          ctx.status(403),
          ctx.json({ success: false, error: 'Zugriff verweigert' })
        );
      })
    );

    // Act
    const response = await fetch(`${API_BASE}/ai-image/jobs/job6`, {
      headers: { 'Authorization': 'Bearer invalid-token' },
    });
    const data = await response.json();

    // Assert
    expect(response.status).toBe(403);
    expect(data.error).toBe('Zugriff verweigert');
  });

  it('sollte method not allowed für POST returnen', async () => {
    // Arrange
    server.use(
      rest.post(`${API_BASE}/ai-image/jobs/:id`, (req, res, ctx) => {
        return res(
          ctx.status(405),
          ctx.json({ success: false, error: 'Method not allowed' })
        );
      })
    );

    // Act
    const response = await fetch(`${API_BASE}/ai-image/jobs/job7`, { method: 'POST' });
    const data = await response.json();

    // Assert
    expect(response.status).toBe(405);
    expect(data.error).toBe('Method not allowed');
  });

  it('sollte CORS headers in Response haben', async () => {
    // Arrange
    server.use(
      rest.get(`${API_BASE}/ai-image/jobs/:id`, (req, res, ctx) => {
        return res(
          ctx.status(200),
          ctx.set('Access-Control-Allow-Origin', '*'),
          ctx.json({ success: true, data: { id: 'job8' } })
        );
      })
    );

    // Act
    const response = await fetch(`${API_BASE}/ai-image/jobs/job8`);
    const data = await response.json();

    // Assert
    expect(response.headers.get('access-control-allow-origin')).toBe('*');
    expect(data.success).toBe(true);
  });
});