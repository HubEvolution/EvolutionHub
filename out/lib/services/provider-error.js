'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.buildProviderError = buildProviderError;
/**
 * Build a standardized provider error for downstream API routes to map into
 * { success: false, error: { type, message } } using createApiError.
 *
 * Mapping:
 *  - 401/403 => forbidden
 *  - 4xx (incl. 404/422) => validation_error
 *  - 5xx => server_error
 */
function buildProviderError(status, provider, payloadSnippet) {
  const message =
    status === 401 || status === 403
      ? 'Provider access denied'
      : status >= 400 && status < 500
        ? 'Provider rejected the request (validation error)'
        : 'Provider service error';
  const err = new Error(message);
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
    err.snippet = String(payloadSnippet).slice(0, 500);
  }
  return err;
}
