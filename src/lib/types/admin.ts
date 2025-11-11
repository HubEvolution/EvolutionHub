import type { D1Database, KVNamespace } from '@cloudflare/workers-types';

export interface AdminBindings {
  DB: D1Database;
  KV_AI_ENHANCER?: KVNamespace;
  KV_ADMIN_DASHBOARD?: KVNamespace;
  STYTCH_PROJECT_ID?: string;
  STYTCH_SECRET?: string;
  ENVIRONMENT?: string;
  INTERNAL_CREDIT_GRANT?: string;
}
