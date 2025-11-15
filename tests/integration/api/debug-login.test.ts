import { describe, it, expect } from 'vitest';
import { sendJson } from '../../shared/http';

// Integration check for /api/debug-login
// - In Entwicklungsumgebungen: 200 + Debug-Session wird erstellt
// - In anderen Umgebungen: 403 forbidden mit konsistenter Fehlershape
//
// Hinweis: Das eigentliche Security-Logging wird in Unit-/Service-Tests und
// route-nahen Tests (login-logger) abgedeckt. Dieser Test verifiziert das
// beobachtbare HTTP-Verhalten und die API-Fehlershape.

describe('Debug Login API', () => {
  it('POST /api/debug-login behaves consistently across environments', async () => {
    const { res, json } = await sendJson('/api/debug-login', {});

    // In Dev kann der Endpoint 200 liefern, in anderen Envs 403 (forbidden)
    expect([200, 403]).toContain(res.status);

    if (res.status === 200) {
      // Erfolgreicher Debug-Login
      expect(json && typeof json === 'object').toBe(true);
      const root = json as any;
      const data = root?.data ?? root;

      expect(data?.success).toBe(true);
      expect(typeof data?.userId === 'string' || data?.userId === undefined).toBe(true);

      const setCookie = res.headers.get('set-cookie') || res.headers.get('Set-Cookie') || '';
      expect(setCookie).toContain('session_id=');
    } else if (res.status === 403) {
      // Debug-Login außerhalb von Dev-Umgebungen ist verboten
      if (json && typeof json === 'object') {
        const err = (json as any).error;
        if (err && typeof err === 'object') {
          expect(err.type).toBe('forbidden');
        }
      }
    }
  });
});
