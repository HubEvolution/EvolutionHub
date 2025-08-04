/**
 * @deprecated Diese Authentifizierungsimplementierung ist veraltet und wird in zukünftigen Versionen entfernt.
 * Bitte verwende stattdessen die Funktionen aus '@/lib/auth-v2.ts'.
 * 
 * Dieses Modul verwendet die Lucia-Bibliothek, die nicht mehr aktiv im Projekt verwendet wird.
 * Die Migration zu auth-v2.ts ist bereits abgeschlossen.
 */

import { Lucia } from 'lucia';
import { D1Adapter } from '@lucia-auth/adapter-sqlite';
import type { D1Database } from '@cloudflare/workers-types';

/**
 * @deprecated Bitte verwende die Funktionen aus '@/lib/auth-v2.ts'.
 */
export function initializeLucia(D1: D1Database) {
  const adapter = new D1Adapter(D1, {
    user: 'users',
    session: 'sessions'
  });

  return new Lucia(adapter, {
    sessionCookie: {
      attributes: {
        secure: import.meta.env.PROD,
      }
    },
    getUserAttributes: (attributes) => {
      return {
        username: attributes.username,
        email: attributes.email,
        name: attributes.name,
      };
    }
  });
}

/**
 * @deprecated Diese Typdefinitionen werden in zukünftigen Versionen entfernt.
 * Bitte verwende die Typen aus '@/lib/auth-v2.ts'.
 */
declare module 'lucia' {
  interface Register {
    Lucia: ReturnType<typeof initializeLucia>;
    DatabaseUserAttributes: {
      username: string;
      email: string;
      name: string;
    };
  }
}