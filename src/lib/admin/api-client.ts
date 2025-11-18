/**
 * Shared helper for calling admin APIs from the dashboard React island.
 *
 * All requests:
 * - include credentials (session cookie)
 * - expect JSON replies following createApiSuccess/createApiError shapes
 * - surface consistent AdminApiError instances on failure
 */

import type { AdminUserLifecycleRequest, AdminUserListQuery } from '@/lib/validation/schemas/admin';

export type AdminApiSuccess<T> = { success: true; data: T };
export type AdminApiErrorBody = {
  success?: false;
  error?: {
    type?: string;
    message?: string;
    details?: unknown;
  };
};

export class AdminApiError extends Error {
  readonly status: number;
  readonly payload: AdminApiErrorBody | undefined;
  readonly retryAfterSec?: number;

  constructor(
    status: number,
    message: string,
    payload?: AdminApiErrorBody,
    retryAfterSec?: number
  ) {
    super(message);
    this.name = 'AdminApiError';
    this.status = status;
    this.payload = payload;
    this.retryAfterSec = retryAfterSec;
  }
}

interface AdminFetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  query?: Record<string, string | number | boolean | null | undefined>;
  body?: unknown;
  requireCsrf?: boolean;
  signal?: AbortSignal;
}

const JSON_HEADERS: HeadersInit = {
  Accept: 'application/json',
};

function buildQueryString(query?: AdminFetchOptions['query']): string {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined || value === '') continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

function generateRandomToken(length = 32): string {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .slice(0, length);
  }
  // Fallback to Math.random (less secure but acceptable for same-origin CSRF token seed)
  return Array.from({ length })
    .map(() => Math.floor(Math.random() * 36).toString(36))
    .join('')
    .slice(0, length);
}

function getOrCreateCsrfToken(): string | undefined {
  if (typeof document === 'undefined') return undefined;
  try {
    const existing = document.cookie.match(/(?:^|; )csrf_token=([^;]+)/);
    if (existing && existing[1]) {
      return decodeURIComponent(existing[1]);
    }
    const token = generateRandomToken(32);
    const attrs = [
      'Path=/',
      'SameSite=Lax',
      typeof location !== 'undefined' && location.protocol === 'https:' ? 'Secure' : '',
    ]
      .filter(Boolean)
      .join('; ');
    document.cookie = `csrf_token=${encodeURIComponent(token)}; ${attrs}`;
    return token;
  } catch {
    return undefined;
  }
}

async function adminFetch<T>(path: string, options: AdminFetchOptions = {}): Promise<T> {
  const { method = 'GET', query, body, requireCsrf = false, signal } = options;
  const url = `${path}${buildQueryString(query)}`;

  const headers = new Headers(JSON_HEADERS);
  let fetchBody: BodyInit | undefined;

  if (body !== undefined) {
    headers.set('Content-Type', 'application/json');
    fetchBody = JSON.stringify(body);
  }

  if (requireCsrf) {
    const token = getOrCreateCsrfToken();
    if (token) headers.set('X-CSRF-Token', token);
  }

  const response = await fetch(url, {
    method,
    credentials: 'include',
    headers,
    body: fetchBody,
    cache: 'no-store',
    signal,
  });

  const contentType = response.headers.get('Content-Type') || '';
  const isJson = contentType.includes('application/json');
  const payload = isJson
    ? ((await response.json().catch(() => undefined)) as
        | AdminApiErrorBody
        | AdminApiSuccess<T>
        | undefined)
    : undefined;

  if (!response.ok) {
    let retryAfterSec: number | undefined = undefined;
    const retryAfterHeader = response.headers.get('Retry-After');
    if (retryAfterHeader) {
      const parsed = Number.parseInt(retryAfterHeader, 10);
      if (Number.isFinite(parsed) && parsed > 0) retryAfterSec = parsed;
    }
    if (!retryAfterSec && payload && typeof payload === 'object') {
      const ra = (payload as { retryAfter?: unknown })?.retryAfter;
      if (typeof ra === 'number' && Number.isFinite(ra) && ra > 0) retryAfterSec = ra;
    }
    const message =
      (payload as AdminApiErrorBody | undefined)?.error?.message ||
      response.statusText ||
      'Request failed';
    throw new AdminApiError(
      response.status,
      message,
      payload as AdminApiErrorBody | undefined,
      retryAfterSec
    );
  }

  if (!payload || typeof payload !== 'object') {
    throw new AdminApiError(response.status, 'Unexpected response shape');
  }

  if ('success' in payload && payload.success === true) {
    return payload.data as T;
  }

  const errPayload = payload as AdminApiErrorBody;
  const errMessage = errPayload.error?.message || 'Unknown error';
  throw new AdminApiError(response.status, errMessage, errPayload);
}

// ----- Response types ----------------------------------------------------

export interface AdminMetricAlert {
  type: 'low_active_users' | 'no_new_users' | 'data_stale' | 'low_sessions';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  sinceTs?: number;
}

export interface AdminDailyNewUsersPoint {
  day: string;
  count: number;
}

export interface AdminMetricsResponse {
  activeSessions?: number;
  activeUsers?: number;
  usersTotal?: number;
  usersNew24h?: number;
  usersNew7d?: number;
  usersNew30d?: number;
  usersNew7dPrevious?: number;
  usersNew30dPrevious?: number;
  growthRate7d?: number | null;
  growthRate30d?: number | null;
  dailyNewUsers?: AdminDailyNewUsersPoint[];
  alerts?: AdminMetricAlert[];
  stripe?: {
    total_volume?: number;
    mrr?: number;
    arr?: number;
  };
  traffic?: Array<{
    day: string;
    requests: number;
    visits: number;
  }>;
  ts?: number;
  cacheTtlMs?: number;
  cacheHit?: boolean;
}

export interface AdminTrafficPoint {
  t: string;
  pageViews?: number;
  visits?: number;
}

export interface AdminTrafficResponse {
  pageViews?: number;
  visits?: number;
  series?: AdminTrafficPoint[];
}

export interface AdminStatusResponse {
  user: { id: string; email?: string };
  plan: 'free' | 'pro' | 'premium' | 'enterprise';
  credits: number;
  subscriptions: Array<{
    id: string;
    plan: string;
    status: string;
    current_period_end: number | null;
    cancel_at_period_end: number | null;
    created_at: string;
    updated_at: string;
  }>;
}

export interface AdminUserSummaryResponse {
  user: {
    id: string;
    email: string;
    name?: string;
    plan: 'free' | 'pro' | 'premium' | 'enterprise';
    createdAt?: string | number | null;
  };
  credits: number;
  subscription: {
    id: string;
    plan: string;
    status: string;
    currentPeriodEnd: number | null;
    updatedAt: string;
  } | null;
  lastSeenAt?: number | null;
  lastIp?: string | null;
}

export interface AdminUserSessionsResponse {
  items: Array<{ id: string; userId: string; expiresAt: number | null }>;
}

export interface AdminCreditsUsageResponse {
  credits: number;
  tenths: number;
}

export interface AdminCreditsHistoryResponse {
  items: Array<{
    id: string;
    unitsTenths: number;
    createdAt?: number;
    expiresAt?: number;
  }>;
}

export interface AdminCreditsGrantResponse {
  email: string;
  userId: string;
  granted: number;
  balance: number;
  packId: string;
}

export interface AdminCreditsDeductResponse {
  email: string;
  userId: string;
  requested: number;
  deducted: number;
  balance: number;
}

export interface AdminAuditLogsResponse {
  items: Array<{
    id: string;
    createdAt: number;
    eventType: string;
    resource?: string;
    action?: string;
  }>;
}

export interface AdminRateLimitStateResponse {
  state: Record<
    string,
    {
      maxRequests: number;
      windowMs: number;
      entries: Array<{ key: string; count: number; resetAt?: number }>;
    }
  >;
}

export interface AdminDiscountCode {
  id: string;
  code: string;
  stripeCouponId: string;
  type: 'percentage' | 'fixed';
  value: number;
  maxUses: number | null;
  usesCount: number;
  validFrom: number | null;
  validUntil: number | null;
  status: 'active' | 'inactive' | 'expired';
  description: string | null;
  createdBy: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface AdminDiscountListResponse {
  items: AdminDiscountCode[];
  pagination: {
    limit: number;
    cursor: string | null;
    hasMore: boolean;
  };
}

export type AdminTelemetryEvent =
  | 'dashboard_loaded'
  | 'widget_interaction'
  | 'api_error'
  | 'action_performed';

export interface AdminTelemetryRequest {
  event: AdminTelemetryEvent;
  severity?: 'info' | 'warning' | 'error';
  context?: {
    section?: string;
    widget?: string;
    action?: string;
  };
  metadata?: Record<string, unknown>;
}

export interface AdminTelemetryResponse {
  id: string;
  recordedAt: number;
}

export interface AdminUserListItem {
  user: {
    id: string;
    email: string;
    name?: string | null;
    plan: 'free' | 'pro' | 'premium' | 'enterprise';
    status?: 'active' | 'banned' | 'deleted';
    createdAt?: number | string | null;
    stytchUserId?: string | null;
  };
  stats: {
    activeSessions: number;
    credits: number;
    totalJobs?: number;
  };
  lastSeenAt?: number | null;
  lastIp?: string | null;
  bannedAt?: number | null;
  deletedAt?: number | null;
  deletedBy?: string | null;
}

export interface AdminUserListResponse {
  items: AdminUserListItem[];
  nextCursor?: string;
}

export interface AdminUserActionResult {
  userId: string;
  status: 'active' | 'banned' | 'deleted';
  bannedAt?: number | null;
  deletedAt?: number | null;
  deletedBy?: string | null;
  auditLogId?: string;
}

export interface AdminSetPlanRequest {
  userId?: string;
  email?: string;
  plan: 'free' | 'pro' | 'premium' | 'enterprise';
  interval?: 'monthly' | 'annual';
  prorationBehavior?: 'create_prorations' | 'none';
  cancelImmediately?: boolean;
  reason?: string;
}

export interface AdminSetPlanResponse {
  userId: string;
  plan: 'free' | 'pro' | 'premium' | 'enterprise';
}

// ----- Public API -------------------------------------------------------

export function fetchAdminMetrics(signal?: AbortSignal) {
  return adminFetch<AdminMetricsResponse>('/api/admin/metrics', { signal });
}

export function fetchAdminTraffic(options: { series?: boolean } = {}, signal?: AbortSignal) {
  return adminFetch<AdminTrafficResponse>('/api/admin/traffic-24h', {
    query: options.series ? { series: 1 } : undefined,
    signal,
  });
}

export function fetchAdminStatus(signal?: AbortSignal) {
  return adminFetch<AdminStatusResponse>('/api/admin/status', { signal });
}

export function fetchAdminUserSummary(
  params: { email?: string; id?: string },
  signal?: AbortSignal
) {
  return adminFetch<AdminUserSummaryResponse>('/api/admin/users/summary', {
    query: params,
    signal,
  });
}

export function fetchAdminUserSessions(params: { userId: string }, signal?: AbortSignal) {
  return adminFetch<AdminUserSessionsResponse>('/api/admin/users/sessions', {
    query: params,
    signal,
  });
}

export function revokeAdminUserSessions(body: { userId: string }) {
  return adminFetch<AdminApiSuccess<unknown>>('/api/admin/users/revoke-sessions', {
    method: 'POST',
    body,
    requireCsrf: true,
  });
}

export function fetchAdminCreditsUsage(params: { userId: string }, signal?: AbortSignal) {
  return adminFetch<AdminCreditsUsageResponse>('/api/admin/credits/usage', {
    query: params,
    signal,
  });
}

export function fetchAdminUsersList(params: AdminUserListQuery, signal?: AbortSignal) {
  return adminFetch<AdminUserListResponse>('/api/admin/users/list', {
    query: params,
    signal,
  });
}

export function adminBanUser(userId: string, body: AdminUserLifecycleRequest) {
  return adminFetch<AdminUserActionResult>(`/api/admin/users/${encodeURIComponent(userId)}/ban`, {
    method: 'POST',
    body,
    requireCsrf: true,
  });
}

export function adminUnbanUser(userId: string, body: AdminUserLifecycleRequest) {
  return adminFetch<AdminUserActionResult>(`/api/admin/users/${encodeURIComponent(userId)}/unban`, {
    method: 'POST',
    body,
    requireCsrf: true,
  });
}

export function adminDeleteUser(userId: string, body: AdminUserLifecycleRequest) {
  return adminFetch<AdminUserActionResult>(`/api/admin/users/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
    body,
    requireCsrf: true,
  });
}

export function fetchAdminCreditsHistory(params: { userId: string }, signal?: AbortSignal) {
  return adminFetch<AdminCreditsHistoryResponse>('/api/admin/credits/history', {
    query: params,
    signal,
  });
}

export function adminGrantCredits(body: { email: string; amount?: number | string }) {
  return adminFetch<AdminCreditsGrantResponse>('/api/admin/credits/grant', {
    method: 'POST',
    body,
    requireCsrf: true,
  });
}

export function adminDeductCredits(body: {
  email: string;
  amount?: number | string;
  strict?: boolean;
  idempotencyKey?: string;
}) {
  return adminFetch<AdminCreditsDeductResponse>('/api/admin/credits/deduct', {
    method: 'POST',
    body,
    requireCsrf: true,
  });
}

export function fetchAdminAuditLogs(
  params: {
    limit?: number;
    eventType?: string;
    userId?: string;
    from?: number;
    to?: number;
    cursor?: string;
  } = {},
  signal?: AbortSignal
) {
  return adminFetch<AdminAuditLogsResponse>('/api/admin/audit/logs', {
    query: params,
    signal,
  });
}

export function fetchAdminRateLimitState(params: { name?: string } = {}, signal?: AbortSignal) {
  return adminFetch<AdminRateLimitStateResponse>('/api/admin/rate-limits/state', {
    query: params,
    signal,
  });
}

export function resetAdminRateLimit(body: { name: string; key: string }) {
  return adminFetch<AdminApiSuccess<unknown>>('/api/admin/rate-limits/reset', {
    method: 'POST',
    body,
    requireCsrf: true,
  });
}

export function fetchAdminDiscounts(
  params: {
    status?: 'active' | 'inactive' | 'expired';
    search?: string;
    isActiveNow?: boolean;
    hasRemainingUses?: boolean;
    limit?: number;
    cursor?: string | null;
  } = {},
  signal?: AbortSignal
) {
  return adminFetch<AdminDiscountListResponse>('/api/admin/discounts/list', {
    query: params,
    signal,
  });
}

export function adminCreateDiscount(body: {
  code: string;
  stripeCouponId: string;
  type: 'percentage' | 'fixed';
  value: number;
  maxUses?: number | null;
  validFrom?: number | null;
  validUntil?: number | null;
  description?: string | null;
  status?: 'active' | 'inactive' | 'expired';
}) {
  return adminFetch<{ discountCode: AdminDiscountCode }>('/api/admin/discounts/create', {
    method: 'POST',
    body,
    requireCsrf: true,
  });
}

export function adminCreateStripeCouponForDiscount(discountId: string) {
  return adminFetch<{ discountCode: AdminDiscountCode }>(
    `/api/admin/discounts/${encodeURIComponent(discountId)}/create-stripe-coupon`,
    {
      method: 'POST',
      requireCsrf: true,
    }
  );
}

export function postAdminTelemetry(body: AdminTelemetryRequest, signal?: AbortSignal) {
  return adminFetch<AdminTelemetryResponse>('/api/admin/telemetry', {
    method: 'POST',
    body,
    requireCsrf: true,
    signal,
  });
}

export function adminSetUserPlan(body: AdminSetPlanRequest) {
  return adminFetch<AdminSetPlanResponse>('/api/admin/users/set-plan', {
    method: 'POST',
    body,
    requireCsrf: true,
  });
}
