import type { AllowedModel } from '@/config/ai-image';

type WorkersAiParams = {
  image_b64: string;
  prompt?: string;
  negative_prompt?: string;
  strength?: number;
  guidance?: number;
  num_steps?: number;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

export function buildWorkersAiPayload(
  model: AllowedModel,
  input: Record<string, unknown>
): Record<string, unknown> {
  const defaults = (model.defaultParams ?? {}) as Partial<WorkersAiParams>;
  const payload: WorkersAiParams = { image_b64: '' };

  // image_b64 (required)
  const b64 = isRecord(input) && typeof input.image_b64 === 'string' ? input.image_b64 : null;
  if (!b64) {
    throw new Error("Workers AI requires base64 'image_b64'");
  }
  payload.image_b64 = b64;

  // prompt
  const providedPrompt =
    isRecord(input) && typeof input.prompt === 'string' ? input.prompt : undefined;
  const defaultPrompt = typeof defaults.prompt === 'string' ? defaults.prompt : undefined;
  payload.prompt =
    (providedPrompt && providedPrompt.trim()) || defaultPrompt || 'photo restoration';

  // negative_prompt
  const providedNeg =
    isRecord(input) && typeof input.negative_prompt === 'string'
      ? input.negative_prompt
      : undefined;
  const defaultNeg =
    typeof defaults.negative_prompt === 'string' ? defaults.negative_prompt : undefined;
  if ((providedNeg && providedNeg.trim()) || defaultNeg) {
    payload.negative_prompt = (providedNeg && providedNeg.trim()) || defaultNeg;
  }

  // strength
  const providedStrength =
    isRecord(input) && typeof input.strength === 'number' ? input.strength : undefined;
  if (typeof providedStrength === 'number' && Number.isFinite(providedStrength)) {
    payload.strength = providedStrength;
  } else if (typeof defaults.strength === 'number') {
    payload.strength = defaults.strength;
  }

  // guidance
  const providedGuidance =
    isRecord(input) && typeof input.guidance === 'number' ? input.guidance : undefined;
  if (typeof providedGuidance === 'number' && Number.isFinite(providedGuidance)) {
    payload.guidance = providedGuidance;
  } else if (typeof defaults.guidance === 'number') {
    payload.guidance = defaults.guidance;
  }

  // steps -> num_steps
  const providedSteps =
    isRecord(input) && typeof input.steps === 'number' ? input.steps : undefined;
  if (typeof providedSteps === 'number' && Number.isInteger(providedSteps)) {
    payload.num_steps = providedSteps;
  } else if (typeof defaults.num_steps === 'number') {
    payload.num_steps = defaults.num_steps;
  } else if (typeof (model.defaultParams as { steps?: number } | undefined)?.steps === 'number') {
    // Fallback if model.defaultParams used 'steps' instead of 'num_steps'
    payload.num_steps = (model.defaultParams as { steps?: number }).steps as number;
  }

  return payload as unknown as Record<string, unknown>;
}
