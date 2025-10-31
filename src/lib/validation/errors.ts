import type { ZodError } from 'zod';

export interface FormattedZodError {
  fieldErrors: Record<string, string[]>;
  issues: Array<{ path: string[]; code: string; message: string }>;
}

export function formatZodError(err: ZodError): FormattedZodError {
  const flattened = err.flatten();
  const issues = err.issues.map((i) => ({
    path: i.path.map(String),
    code: i.code,
    message: i.message,
  }));

  const fieldErrors: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(flattened.fieldErrors)) {
    fieldErrors[k] = (v || []).filter(Boolean) as string[];
  }
  if (flattened.formErrors && flattened.formErrors.length) {
    fieldErrors._form = flattened.formErrors;
  }

  return { fieldErrors, issues };
}
