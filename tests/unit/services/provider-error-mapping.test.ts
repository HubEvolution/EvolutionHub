import { describe, it, expect } from 'vitest';
import { buildProviderError } from '../../../src/lib/services/provider-error';

describe('provider-error mapping', () => {
  it('maps 401/403 to forbidden', () => {
    const e401 = buildProviderError(401, 'openai');
    const e403 = buildProviderError(403, 'openai');
    expect(e401.apiErrorType).toBe('forbidden');
    expect(e403.apiErrorType).toBe('forbidden');
  });

  it('maps 4xx to validation_error', () => {
    const e400 = buildProviderError(400, 'openai');
    const e404 = buildProviderError(404, 'openai');
    const e422 = buildProviderError(422, 'openai');
    expect(e400.apiErrorType).toBe('validation_error');
    expect(e404.apiErrorType).toBe('validation_error');
    expect(e422.apiErrorType).toBe('validation_error');
  });

  it('maps 5xx to server_error', () => {
    const e500 = buildProviderError(500, 'openai');
    const e503 = buildProviderError(503, 'openai');
    expect(e500.apiErrorType).toBe('server_error');
    expect(e503.apiErrorType).toBe('server_error');
  });
});
