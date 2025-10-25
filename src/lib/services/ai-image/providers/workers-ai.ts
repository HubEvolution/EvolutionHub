import type { AllowedModel } from '@/config/ai-image';

export function buildWorkersAiPayload(
  model: AllowedModel,
  input: Record<string, unknown>
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  const b64 = typeof (input as any).image_b64 === 'string' ? (input as any).image_b64 : null;
  if (!b64) {
    throw new Error("Workers AI requires base64 'image_b64'");
  }
  (payload as any).image_b64 = b64;

  const providedPrompt =
    typeof (input as any).prompt === 'string' ? (input as any).prompt : undefined;
  const defaultPrompt = (model.defaultParams as any)?.prompt;
  (payload as any).prompt =
    (providedPrompt && providedPrompt.trim()) || defaultPrompt || 'photo restoration';

  const providedNeg =
    typeof (input as any).negative_prompt === 'string' ? (input as any).negative_prompt : undefined;
  const defaultNeg = (model.defaultParams as any)?.negative_prompt;
  if ((providedNeg && providedNeg.trim()) || defaultNeg) {
    (payload as any).negative_prompt = (providedNeg && providedNeg.trim()) || defaultNeg;
  }

  if (typeof (input as any).strength === 'number' && Number.isFinite((input as any).strength)) {
    (payload as any).strength = (input as any).strength;
  } else if (typeof (model.defaultParams as any)?.strength === 'number') {
    (payload as any).strength = (model.defaultParams as any).strength;
  }

  if (typeof (input as any).guidance === 'number' && Number.isFinite((input as any).guidance)) {
    (payload as any).guidance = (input as any).guidance;
  } else if (typeof (model.defaultParams as any)?.guidance === 'number') {
    (payload as any).guidance = (model.defaultParams as any).guidance;
  }

  if (typeof (input as any).steps === 'number' && Number.isInteger((input as any).steps)) {
    (payload as any).num_steps = (input as any).steps;
  } else if (typeof (model.defaultParams as any)?.steps === 'number') {
    (payload as any).num_steps = (model.defaultParams as any).steps;
  }

  return payload;
}
