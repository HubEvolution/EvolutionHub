/**
 * Typed provider error utilities used by services (e.g. Replicate calls).
 *
 * These map provider HTTP statuses to internal API error types that
 * `api-middleware.ts` understands when building `{ success: false, error: { ... } }`.
 *
 * Mapping contract (mirrors API schema in api-middleware.ts):
 *  - 401/403 → `forbidden`
 *  - 4xx (incl. 404/422) → `validation_error`
 *  - 5xx → `server_error`
 *
 * Routes should catch thrown errors and pass through to `createApiError`
 * using the `apiErrorType` from this ProviderError, or let `withApiMiddleware`
 * handle it automatically via its typed error branch.
 */
export type ProviderErrorType = 'forbidden' | 'validation_error' | 'server_error';

export interface ProviderError extends Error {
  status: number;
  provider: string;
  apiErrorType: ProviderErrorType;
}

/**
 * Build a standardized provider error for downstream API routes to map into
 * { success: false, error: { type, message } } using createApiError.
 *
 * Mapping:
 *  - 401/403 => forbidden
 *  - 4xx (incl. 404/422) => validation_error
 *  - 5xx => server_error
 */
export function buildProviderError(
  status: number,
  provider: string,
  payloadSnippet?: string
): ProviderError {
  const message =
    status === 401 || status === 403
      ? 'Provider access denied'
      : status >= 400 && status < 500
        ? 'Provider rejected the request (validation error)'
        : 'Provider service error';

  const err = new Error(message) as ProviderError;
  err.status = status;
  err.provider = provider;
  err.apiErrorType =
    status === 401 || status === 403
      ? 'forbidden'
      : status >= 400 && status < 500
        ? 'validation_error'
        : 'server_error';

  // Attach a concise snippet for internal diagnostics only (callers may log)
  if (payloadSnippet) {
    (err as any).snippet = String(payloadSnippet).slice(0, 500);
  }

  return err;
}
