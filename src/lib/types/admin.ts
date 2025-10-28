import type { D1Database, KVNamespace } from '@cloudflare/workers-types';

export interface AdminBindings {
  DB: D1Database;
  KV_AI_ENHANCER?: KVNamespace;
  ENVIRONMENT?: string;
  INTERNAL_CREDIT_GRANT?: string;
}
