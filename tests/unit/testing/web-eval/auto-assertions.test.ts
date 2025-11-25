import { describe, expect, it } from 'vitest';

import { generateAutoAssertions } from '@/lib/testing/web-eval/auto-assertions';

describe('generateAutoAssertions', () => {
  it('returns empty array for very short descriptions', () => {
    const assertions = generateAutoAssertions({ url: 'https://example.com', description: 'hi' });
    expect(Array.isArray(assertions)).toBe(true);
    expect(assertions.length).toBe(0);
  });

  it('extracts quoted phrases as textIncludes assertions', () => {
    const description =
      'Bitte prüfe, dass ein "Kontaktformular" und ein Hinweis auf "Datenschutz" vorhanden ist.';

    const assertions = generateAutoAssertions({ url: 'https://example.com/kontakt', description });

    const values = assertions.map((a) => a.value);

    expect(values).toContain('Kontaktformular');
    expect(values).toContain('Datenschutz');
  });

  it('falls back to keyword tokens when no quotes are present', () => {
    const description =
      'Check that the pricing page shows our Pro plan with monthly billing options.';

    const assertions = generateAutoAssertions({ url: 'https://example.com/pricing', description });

    expect(assertions.length).toBeGreaterThan(0);
    for (const a of assertions) {
      expect(a.kind).toBe('textIncludes');
      expect(typeof a.value).toBe('string');
      expect(a.value.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('respects the maxAssertions limit', () => {
    const description =
      'Check that the pricing page shows our Pro plan with monthly billing options and discount codes.';

    const assertions = generateAutoAssertions({
      url: 'https://example.com/pricing',
      description,
      maxAssertions: 2,
    });

    expect(assertions.length).toBeLessThanOrEqual(2);
  });
});
