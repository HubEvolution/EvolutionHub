import { ensureCsrfToken } from '../security/csrf';

// Feature flag must gate all telemetry
const TELEMETRY_FLAG = (import.meta.env.PUBLIC_PROMPT_TELEMETRY_V1 || 'false') as string;

export interface PromptEnhancerStartedProps {
  mode: 'creative' | 'professional' | 'concise';
  hasFiles: boolean;
  fileTypes: string[];
}

export interface PromptEnhancerSucceededProps {
  latencyMs: number;
  maskedCount?: number;
}

export interface PromptEnhancerFailedProps {
  errorKind: string;
  httpStatus?: number;
}

export type TelemetryEventName =
  | 'prompt_enhance_started'
  | 'prompt_enhance_succeeded'
  | 'prompt_enhance_failed'
  | 'prompt_enhance_cta_upgrade_click';

interface TelemetryEnvelope<TProps> {
  eventName: TelemetryEventName;
  ts: number; // epoch ms
  context: { tool: 'prompt-enhancer' };
  props: TProps;
}

async function postTelemetry<TProps>(eventName: TelemetryEventName, props: TProps): Promise<void> {
  if (TELEMETRY_FLAG === 'false') return; // gated off
  try {
    const body: TelemetryEnvelope<TProps> = {
      eventName,
      ts: Date.now(),
      context: { tool: 'prompt-enhancer' },
      props,
    };
    const csrf = ensureCsrfToken();
    await fetch('/api/telemetry', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrf,
      },
      body: JSON.stringify(body),
    }).catch(() => undefined);
  } catch {
    // swallow telemetry errors
  }
}

export function emitPromptEnhancerStarted(props: PromptEnhancerStartedProps) {
  return postTelemetry('prompt_enhance_started', props);
}

export function emitPromptEnhancerSucceeded(props: PromptEnhancerSucceededProps) {
  return postTelemetry('prompt_enhance_succeeded', props);
}

export function emitPromptEnhancerFailed(props: PromptEnhancerFailedProps) {
  return postTelemetry('prompt_enhance_failed', props);
}

export function emitPromptEnhancerCtaUpgradeClick() {
  return postTelemetry('prompt_enhance_cta_upgrade_click', {} as Record<string, never>);
}
