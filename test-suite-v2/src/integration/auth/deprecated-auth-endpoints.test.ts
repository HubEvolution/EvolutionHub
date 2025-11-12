/**
 * Integration-Tests: Deprecated Auth Endpunkte (410 Gone)
 *
 * Verifiziert konsistente 410 Gone Responses inkl. Format (HTML/JSON),
 * Allow-Header (bei nicht erlaubten Methoden), und No-Store Cache Header.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  setupTestServer,
  teardownTestServer,
  makeTestRequest,
} from '../../../utils/server-helpers';
import { getTestLogger } from '../../../utils/logger';

describe('Deprecated Auth Endpoints - 410 Gone', () => {
  let testServer: any;
  const logger = getTestLogger();

  beforeAll(async () => {
    logger.info('Starte Deprecated Auth Endpoint Tests');
    testServer = await setupTestServer();
  });

  afterAll(async () => {
    if (testServer) {
      await teardownTestServer(testServer);
    }
    logger.info('Deprecated Auth Endpoint Tests abgeschlossen');
  });

  beforeEach(() => {
    if (testServer) testServer.requestCount = 0;
  });

  describe('/api/auth/verify-email', () => {
    it('GET sollte 410 Gone (HTML) mit no-store liefern', async () => {
      const res = await makeTestRequest(testServer, 'GET', '/api/auth/verify-email');

      expect(res.status).toBe(410);
      // HTML-Body wird in der Testumgebung als String in JSON-Feld geliefert
      expect(typeof res.body).toBe('string');
      expect(res.body).toContain('<!doctype html>');
      expect(res.body).toContain('410 Gone');

      // Header-Checks
      expect(res.headers['Cache-Control']).toBe('no-store');
      expect(res.headers['Content-Type']).toContain('text/html');
    });

    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE'] as const) {
      it(`${method} sollte 410 Gone (JSON) mit Allow-Header und no-store liefern`, async () => {
        const res = await makeTestRequest(testServer, method, '/api/auth/verify-email');

        expect(res.status).toBe(410);
        expect(res.headers['Cache-Control']).toBe('no-store');
        expect(res.headers['Content-Type']).toBe('application/json');
        expect(res.headers['Allow']).toBe('GET, HEAD');

        expect(res.body).toMatchObject({
          success: false,
          error: {
            type: 'gone',
            message:
              'This endpoint has been deprecated. Please migrate to the new authentication flow.',
          },
        });
      });
    }
  });

  describe('/api/auth/logout', () => {
    for (const method of ['GET', 'POST'] as const) {
      it(`${method} sollte 410 Gone (HTML) mit no-store liefern`, async () => {
        const res = await makeTestRequest(testServer, method, '/api/auth/logout');

        expect(res.status).toBe(410);
        expect(typeof res.body).toBe('string');
        expect(res.body).toContain('<!doctype html>');
        expect(res.body).toContain('410 Gone');

        expect(res.headers['Cache-Control']).toBe('no-store');
        expect(res.headers['Content-Type']).toContain('text/html');
      });
    }

    for (const method of ['PUT', 'PATCH', 'DELETE'] as const) {
      it(`${method} sollte 410 Gone (JSON) mit Allow-Header und no-store liefern`, async () => {
        const res = await makeTestRequest(testServer, method, '/api/auth/logout');

        expect(res.status).toBe(410);
        expect(res.headers['Cache-Control']).toBe('no-store');
        expect(res.headers['Content-Type']).toBe('application/json');
        expect(res.headers['Allow']).toBe('GET, POST, HEAD');

        expect(res.body).toMatchObject({
          success: false,
          error: {
            type: 'gone',
            message:
              'This endpoint has been deprecated. Please migrate to the new authentication flow.',
          },
        });
      });
    }
  });
});
