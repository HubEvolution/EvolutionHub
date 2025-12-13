import { describe, it, expect } from 'vitest';

import { csrfHeaders, hex32, sendJson } from '../../../shared/http';

interface ApiErrorShape {
  type: string;
  message: string;
  details?: Record<string, unknown>;
}

interface ApiSuccess<T> {
  success: true;
  data: T;
}

interface ApiErrorResponse {
  success: false;
  error: ApiErrorShape;
}

type ApiJson<T = unknown> = ApiSuccess<T> | ApiErrorResponse | null;

interface PromptEnhanceSuccessData {
  enhancedPrompt: string;
  enhancedPromptJson?: unknown;
}

describe('Prompt Enhancer API: POST /api/prompt-enhance — feature flag gating', () => {
  it('respects PUBLIC_PROMPT_ENHANCER_V1 flag by returning either 200 or 403 with feature.disabled key', async () => {
    const csrf = hex32();

    const { res, json } = await sendJson<ApiJson<PromptEnhanceSuccessData>>(
      '/api/prompt-enhance',
      {
        text: 'Write a short test prompt for an integration test.',
      },
      {
        headers: csrfHeaders(csrf),
      }
    );

    const contentType = res.headers.get('content-type') || '';
    expect(contentType).toContain('application/json');

    // Environment-agnostic assertions:
    // - Wenn das Feature per Flag deaktiviert ist, erwarten wir 403 + feature.disabled.prompt_enhancer.
    // - Wenn das Feature aktiv ist, erwarten wir 200 + success=true + enhancedPrompt-String.
    if (res.status === 403) {
      expect(json && json.success).toBe(false);
      if (!json || !('error' in json) || !json.error) return;

      expect(json.error.type).toBe('forbidden');
      expect(json.error.message).toBe('feature.disabled.prompt_enhancer');
      return;
    }

    expect(res.status).toBe(200);
    if (!json || json.success !== true) return;

    expect(typeof json.data.enhancedPrompt).toBe('string');
    expect(json.data.enhancedPrompt.length).toBeGreaterThan(0);
  });
});
