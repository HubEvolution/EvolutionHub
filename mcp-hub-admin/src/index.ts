import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z, type ZodRawShape } from 'zod';

type Env = {
  HUB_BASE_URL: string;
  HUB_ADMIN_TOKEN: string;
  CONFIRM_SECRET: string;
  ALLOWED_HOSTS?: string;
  ALLOWED_ORIGINS?: string;
  ENABLE_STATEFUL_SESSIONS?: string;
};

type DangerousConfig = {
  dangerous: true;
  destructive?: boolean;
};

type ToolSpec = {
  name: string;
  description: string;
  method: 'GET' | 'POST' | 'DELETE';
  path: string; // may include :id style params
  shape: ZodRawShape;
  dangerous?: DangerousConfig;
};

const confirmShape: ZodRawShape = {
  dryRun: z.boolean().optional(),
  confirm: z
    .object({
      token: z.string().min(10).optional(),
      reason: z.string().max(500).optional(),
    })
    .optional(),
};

const adminUserLifecycleShape: ZodRawShape = {
  reason: z.string().max(500).optional(),
};

const adminSetPlanShape: ZodRawShape = {
  email: z.string().email().optional(),
  userId: z.string().min(1).optional(),
  plan: z.enum(['free', 'pro', 'premium', 'enterprise']),
  reason: z.string().max(500).optional(),
  interval: z.enum(['monthly', 'annual']).optional(),
  prorationBehavior: z.enum(['create_prorations', 'none']).optional(),
  cancelAtPeriodEnd: z.boolean().optional(),
  cancelImmediately: z.boolean().optional(),
};

const creditsAdjustShape: ZodRawShape = {
  email: z.string().email(),
  amount: z.number(),
  strict: z.boolean().optional(),
  reason: z.string().max(500).optional(),
};

const backupActionShape: ZodRawShape = {
  jobId: z.string().optional(),
  schedule: z.string().optional(),
  notes: z.string().optional(),
};

const commentModerateShape: ZodRawShape = {
  commentId: z.string(),
  action: z.enum(['approve', 'reject', 'hide', 'unhide', 'delete']),
  reason: z.string().max(500).optional(),
};

const toolSpecs: ToolSpec[] = [
  // Admin · Users
  {
    name: 'admin_users_summary',
    description: 'Get user summary by email or id',
    method: 'GET',
    path: '/api/admin/users/summary',
    shape: { email: z.string().email().optional(), id: z.string().optional() },
  },
  {
    name: 'admin_users_list',
    description: 'List users with admin insights',
    method: 'GET',
    path: '/api/admin/users/list',
    shape: {
      search: z.string().min(1).max(200).optional(),
      status: z.enum(['active', 'banned', 'deleted']).optional(),
      plan: z.enum(['free', 'pro', 'premium', 'enterprise']).optional(),
      limit: z.number().int().min(1).max(100).optional(),
      cursor: z.string().optional(),
    },
  },
  {
    name: 'admin_user_ban',
    description: 'Ban user (admin)',
    method: 'POST',
    path: '/api/admin/users/{id}/ban',
    shape: { ...adminUserLifecycleShape, id: z.string() },
    dangerous: { dangerous: true },
  },
  {
    name: 'admin_user_unban',
    description: 'Unban user (admin)',
    method: 'POST',
    path: '/api/admin/users/{id}/unban',
    shape: { ...adminUserLifecycleShape, id: z.string() },
    dangerous: { dangerous: true },
  },
  {
    name: 'admin_user_delete',
    description: 'Soft-delete user (admin)',
    method: 'DELETE',
    path: '/api/admin/users/{id}',
    shape: { ...adminUserLifecycleShape, id: z.string() },
    dangerous: { dangerous: true, destructive: true },
  },
  {
    name: 'admin_user_set_plan',
    description: 'Set user plan (admin override)',
    method: 'POST',
    path: '/api/admin/users/set-plan',
    shape: adminSetPlanShape,
    dangerous: { dangerous: true },
  },
  // Admin · Credits
  {
    name: 'admin_credits_usage',
    description: 'Get credits balance',
    method: 'GET',
    path: '/api/admin/credits/usage',
    shape: { userId: z.string().optional(), email: z.string().email().optional() },
  },
  {
    name: 'admin_credits_history',
    description: 'List credit packs',
    method: 'GET',
    path: '/api/admin/credits/history',
    shape: { userId: z.string().optional(), email: z.string().email().optional() },
  },
  {
    name: 'admin_credits_grant',
    description: 'Grant credits to a user',
    method: 'POST',
    path: '/api/admin/credits/grant',
    shape: creditsAdjustShape,
    dangerous: { dangerous: true },
  },
  {
    name: 'admin_credits_deduct',
    description: 'Deduct credits from a user',
    method: 'POST',
    path: '/api/admin/credits/deduct',
    shape: creditsAdjustShape,
    dangerous: { dangerous: true },
  },
  // Admin · System / Insights
  {
    name: 'admin_status',
    description: 'Admin status snapshot',
    method: 'GET',
    path: '/api/admin/status',
    shape: {},
  },
  {
    name: 'admin_metrics',
    description: 'Live admin metrics',
    method: 'GET',
    path: '/api/admin/metrics',
    shape: {},
  },
  {
    name: 'admin_traffic_24h',
    description: 'Traffic in the last 24h',
    method: 'GET',
    path: '/api/admin/traffic/24h',
    shape: {},
  },
  {
    name: 'admin_ip_geo',
    description: 'IP geolocation summary',
    method: 'GET',
    path: '/api/admin/ip-geo',
    shape: {},
  },
  // Admin · Moderation
  {
    name: 'admin_comments_list',
    description: 'List comments (admin)',
    method: 'GET',
    path: '/api/admin/comments',
    shape: {
      status: z.enum(['pending', 'approved', 'rejected']).optional(),
      entityType: z.string().optional(),
      entityId: z.string().optional(),
      limit: z.number().int().min(1).max(100).optional(),
      cursor: z.string().optional(),
    },
  },
  {
    name: 'admin_comment_get',
    description: 'Get comment detail (admin)',
    method: 'GET',
    path: '/api/admin/comments/{id}',
    shape: { id: z.string() },
  },
  {
    name: 'admin_comment_hide',
    description: 'Hide comment (admin)',
    method: 'POST',
    path: '/api/admin/comments/{id}/hide',
    shape: { id: z.string(), reason: z.string().max(500).optional() },
    dangerous: { dangerous: true },
  },
  {
    name: 'admin_comment_moderate',
    description: 'Moderate comment (approve/reject/hide/delete)',
    method: 'POST',
    path: '/api/admin/comments/moderate',
    shape: commentModerateShape,
    dangerous: { dangerous: true },
  },
  // Admin · Backups / Maintenance
  {
    name: 'admin_backup_jobs_list',
    description: 'List backup jobs',
    method: 'GET',
    path: '/api/admin/backup/jobs',
    shape: {},
  },
  {
    name: 'admin_backup_job_get',
    description: 'Get backup job',
    method: 'GET',
    path: '/api/admin/backup/jobs/{id}',
    shape: { id: z.string() },
  },
  {
    name: 'admin_backup_job_progress',
    description: 'Get backup job progress',
    method: 'GET',
    path: '/api/admin/backup/jobs/{id}/progress',
    shape: { id: z.string() },
  },
  {
    name: 'admin_backup_create',
    description: 'Create backup',
    method: 'POST',
    path: '/api/admin/backup/create',
    shape: backupActionShape,
    dangerous: { dangerous: true },
  },
  {
    name: 'admin_backup_schedule',
    description: 'Schedule backup',
    method: 'POST',
    path: '/api/admin/backup/schedule',
    shape: backupActionShape,
    dangerous: { dangerous: true },
  },
  {
    name: 'admin_backup_cleanup',
    description: 'Cleanup backups',
    method: 'POST',
    path: '/api/admin/backup/cleanup',
    shape: backupActionShape,
    dangerous: { dangerous: true },
  },
  {
    name: 'admin_backup_verify',
    description: 'Verify backup by id',
    method: 'POST',
    path: '/api/admin/backup/verify/{id}',
    shape: { id: z.string() },
    dangerous: { dangerous: true },
  },
  {
    name: 'admin_maintenance_perform',
    description: 'Perform maintenance job',
    method: 'POST',
    path: '/api/admin/backup/maintenance/perform',
    shape: backupActionShape,
    dangerous: { dangerous: true },
  },
  // Admin · Referrals
  {
    name: 'admin_referrals_list',
    description: 'List referral events (admin)',
    method: 'GET',
    path: '/api/admin/referrals/list',
    shape: {
      status: z.enum(['pending', 'verified', 'paid', 'cancelled']).optional(),
      limit: z.number().int().min(1).max(100).optional(),
      cursor: z.string().optional(),
    },
  },
  // Admin · Web-Eval
  {
    name: 'admin_web_eval_tasks_list',
    description: 'List Web-Eval tasks',
    method: 'GET',
    path: '/api/admin/web-eval/tasks',
    shape: {
      status: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
      limit: z.number().int().min(1).max(100).optional(),
      cursor: z.string().optional(),
    },
  },
  {
    name: 'admin_web_eval_task_get',
    description: 'Get Web-Eval task detail',
    method: 'GET',
    path: '/api/admin/web-eval/tasks/{id}',
    shape: { id: z.string() },
  },
];

const server = new McpServer({
  name: 'mcp-hub-admin',
  version: '0.1.0',
});

const encoder = new TextEncoder();

async function importHmacKey(secret: string) {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ]);
}

async function signConfirm(secret: string, payload: Record<string, unknown>) {
  const key = await importHmacKey(secret);
  const data = encoder.encode(JSON.stringify(payload));
  const sig = await crypto.subtle.sign('HMAC', key, data);
  return `${base64url(data)}.${base64url(new Uint8Array(sig))}`;
}

async function verifyConfirm(secret: string, token: string) {
  const [dataB64, sigB64] = token.split('.');
  if (!dataB64 || !sigB64) return null;
  const key = await importHmacKey(secret);
  const data = fromBase64url(dataB64);
  const sig = fromBase64url(sigB64);
  const ok = await crypto.subtle.verify('HMAC', key, sig, data);
  if (!ok) return null;
  const parsed = JSON.parse(new TextDecoder().decode(data)) as { exp: number; tool: string; input: unknown };
  if (Date.now() > parsed.exp) return null;
  return parsed;
}

function base64url(data: Uint8Array | ArrayBuffer) {
  const buf = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
  return btoa(String.fromCharCode(...buf)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function fromBase64url(input: string): Uint8Array {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(padded);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

function redactInput(input: unknown) {
  if (input && typeof input === 'object') {
    const clone: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input)) {
      if (k.toLowerCase().includes('token')) clone[k] = '[redacted]';
      else if (k.toLowerCase().includes('email')) clone[k] = '[redacted]';
      else clone[k] = v;
    }
    return clone;
  }
  return input;
}

async function callHub(
  env: Env,
  spec: ToolSpec,
  input: Record<string, unknown>,
  dangerous: DangerousConfig | undefined,
) {
  const dryRun = input.dryRun === true;
  const confirm = typeof input.confirm === 'object' ? (input.confirm as Record<string, unknown>) : undefined;

  const { pathParams, query, body } = splitParams(spec, input);
  const urlPath = applyPath(spec.path, pathParams);
  if (dangerous && !confirm?.token) {
    const token = await signConfirm(env.CONFIRM_SECRET, {
      tool: spec.name,
      input: { pathParams, query, body },
      exp: Date.now() + 10 * 60 * 1000,
    });
    return {
      dryRun: true,
      wouldDo: { method: spec.method, path: urlPath, query, body },
      confirmToken: token,
    };
  }
  if (dryRun) {
    return {
      dryRun: true,
      wouldDo: { method: spec.method, path: urlPath, query, body },
    };
  }
  if (dangerous && confirm?.token) {
    const parsed = await verifyConfirm(env.CONFIRM_SECRET, String(confirm.token));
    if (!parsed || parsed.tool !== spec.name) {
      throw new Error('Invalid or expired confirm token');
    }
  }

  const url = new URL(env.HUB_BASE_URL.replace(/\/+$/, '') + urlPath);
  if (spec.method === 'GET' && query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null) continue;
      url.searchParams.set(k, String(v));
    }
  }

  const init: RequestInit = {
    method: spec.method,
    headers: {
      Authorization: `Bearer ${env.HUB_ADMIN_TOKEN}`,
    },
  };
  if (spec.method !== 'GET') {
    init.headers = { ...init.headers, 'Content-Type': 'application/json' };
    if (body && Object.keys(body).length > 0) {
      init.body = JSON.stringify(body);
    }
  }

  const resp = await fetch(url.toString(), init);
  const text = await resp.text();
  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    parsed = { raw: text };
  }
  if (!resp.ok) {
    return {
      status: resp.status,
      error: parsed,
    };
  }
  return parsed;
}

function splitParams(spec: ToolSpec, input: Record<string, unknown>) {
  const pathParams: Record<string, string> = {};
  const query: Record<string, unknown> = {};
  const body: Record<string, unknown> = {};

  for (const [k, v] of Object.entries(input)) {
    if (k === 'dryRun' || k === 'confirm') continue;
    if (spec.path.includes(`{${k}}`)) {
      pathParams[k] = String(v);
    } else if (spec.method === 'GET') {
      query[k] = v;
    } else {
      body[k] = v;
    }
  }
  return { pathParams, query, body };
}

function applyPath(path: string, params: Record<string, string>) {
  let out = path;
  for (const [k, v] of Object.entries(params)) {
    out = out.replace(`{${k}}`, encodeURIComponent(v));
  }
  return out;
}

function toToolShape(shape: ZodRawShape, isDangerous: boolean): ZodRawShape {
  return isDangerous ? { ...shape, ...confirmShape } : shape;
}

function getHosts(env: Env) {
  const hosts = env.ALLOWED_HOSTS ? env.ALLOWED_HOSTS.split(',').map((s) => s.trim()).filter(Boolean) : [];
  const origins = env.ALLOWED_ORIGINS ? env.ALLOWED_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean) : [];
  return { hosts, origins };
}

function registerTools(env: Env) {
  for (const spec of toolSpecs) {
    const shape = toToolShape(spec.shape, !!spec.dangerous);
    const paramsSchema = z.object(shape).strict();
    server.registerTool(
      spec.name,
      {
        description: spec.description,
        inputSchema: shape,
        annotations:
          spec.dangerous === undefined
            ? undefined
            : {
                title: 'Dangerous admin operation',
                destructiveHint: spec.dangerous.destructive === true,
                readOnlyHint: false,
                idempotentHint: false,
                openWorldHint: true,
              },
      },
      async (input) => {
        const parsed = paramsSchema.parse(input);
        // Manual XOR check for set-plan
        if (spec.name === 'admin_user_set_plan') {
          const { email, userId } = parsed as Record<string, unknown>;
          const hasEmail = typeof email === 'string' && email.length > 0;
          const hasUser = typeof userId === 'string' && userId.length > 0;
          if (hasEmail === hasUser) {
            throw new Error('exactly one of email or userId required');
          }
        }
        const result = await callHub(env, spec, parsed as Record<string, unknown>, spec.dangerous);
        console.log(
          JSON.stringify({
            ts: new Date().toISOString(),
            tool: spec.name,
            dryRun: parsed['dryRun'] === true,
            confirmed: !!(parsed as { confirm?: { token?: string } }).confirm?.token,
            input: redactInput(parsed),
          }),
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      },
    );
  }
}

async function handleRequest(env: Env, request: Request): Promise<Response> {
  const { hosts, origins } = getHosts(env);
  const enableStateful = env.ENABLE_STATEFUL_SESSIONS === '1';

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: enableStateful ? crypto.randomUUID : undefined,
    enableJsonResponse: true,
    enableDnsRebindingProtection: hosts.length > 0 || origins.length > 0,
    allowedHosts: hosts.length > 0 ? hosts : undefined,
    allowedOrigins: origins.length > 0 ? origins : undefined,
  });

  await server.connect(transport);

  const body = request.method === 'POST' ? await request.json().catch(() => undefined) : undefined;
  const reqLike = createRequestLike(request, body);
  const resLike = new ResponseAdapter();
  await (
    transport as unknown as { handleRequest: (req: unknown, res: unknown, body?: unknown) => Promise<void> }
  ).handleRequest(reqLike as unknown, resLike as unknown, body);
  return resLike.toResponse();
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      // Lazy register tools once (idempotent if called multiple times)
      if ((server as unknown as { __registered?: boolean }).__registered !== true) {
        registerTools(env);
        (server as unknown as { __registered?: boolean }).__registered = true;
      }

      const pathname = new URL(request.url).pathname;
      if (request.method === 'GET' && pathname === '/health') {
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      // Simple root probe to avoid transport parse errors on bare GET /
      if (request.method === 'GET' && pathname === '/') {
        return new Response(JSON.stringify({ ok: true, service: 'mcp-hub-admin' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      // Reject other GETs early (e.g., ACME/.well-known) to avoid transport errors
      if (request.method === 'GET') {
        return new Response('Not Found', { status: 404 });
      }

      // Only POST to root is allowed for MCP transport
      if (request.method === 'POST' && pathname !== '/') {
        return new Response('Not Found', { status: 404 });
      }

      if (request.method !== 'GET' && request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
      }

      const response = await handleRequest(env, request);
      if (!(response instanceof Response)) {
        throw new TypeError('Handler did not return a Response');
      }
      return response;
    } catch (err) {
      console.error('mcp-hub-admin fetch error', err);
      return new Response('Internal Server Error', { status: 500 });
    }
  },
};

function createRequestLike(request: Request, parsedBody: unknown) {
  const url = new URL(request.url);
  // Build a minimal Node-like request expected by StreamableHTTPServerTransport
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });
  return {
    method: request.method,
    url: url.toString(),
    headers,
    body: parsedBody,
  };
}

class ResponseAdapter {
  status = 200;
  headers = new Headers();
  private chunks: Uint8Array[] = [];

  writeHead(status: number, headers?: Record<string, string>) {
    this.status = status;
    if (headers) {
      for (const [k, v] of Object.entries(headers)) this.headers.set(k, v);
    }
    return this;
  }

  setHeader(key: string, value: string) {
    this.headers.set(key, value);
  }

  write(chunk: string | Uint8Array) {
    const data = typeof chunk === 'string' ? new TextEncoder().encode(chunk) : chunk;
    this.chunks.push(data);
  }

  end(chunk?: string | Uint8Array) {
    if (chunk) this.write(chunk);
  }

  toResponse() {
    const body =
      this.chunks.length === 0
        ? null
        : new Blob(this.chunks.map((c) => new Uint8Array(c)), { type: this.headers.get('Content-Type') || undefined });
    return new Response(body, { status: this.status, headers: this.headers });
  }
}
