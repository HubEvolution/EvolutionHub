import { Lucia } from 'lucia';
import { D1Adapter } from '@lucia-auth/adapter-sqlite';
import type { D1Database } from '@cloudflare/workers-types';

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