import { describe, it, beforeEach, expect } from 'vitest';
import { init, cleanup as enhanceCleanup } from '@/scripts/blog-post-enhancements';

/**
 * Unit tests for blog-post-enhancements.ts
 *
 * Verifies:
 * - Images inside <article> without a loading attribute get loading="lazy"
 * - Existing loading attributes are not overwritten
 * - Footnote links receive a11y attributes and classes
 * - Idempotent init() and safe cleanup()
 */

describe('blog-post-enhancements', () => {
  beforeEach(() => {
    // Reset module state between tests
    try { enhanceCleanup(); } catch {}

    // Reset DOM for each test
    document.body.innerHTML = `
      <main>
        <article>
          <h1>Post</h1>
          <img id="img-no-loading" src="/a.jpg" />
          <img id="img-with-loading" src="/b.jpg" loading="eager" />
          <p>See <a id="fn-link" href="#fn1">Footnote</a> and <a id="ref-link" href="#ref-1">Ref</a></p>
        </article>
      </main>
    `;
  });

  it('lazy loads images inside article that lack a loading attribute', () => {
    init();

    const imgNo = document.getElementById('img-no-loading') as HTMLImageElement | null;
    const imgWith = document.getElementById('img-with-loading') as HTMLImageElement | null;

    expect(imgNo).not.toBeNull();
    expect(imgWith).not.toBeNull();

    // Newly set to lazy
    expect(imgNo!.getAttribute('loading')).toBe('lazy');

    // Preserves existing value
    expect(imgWith!.getAttribute('loading')).toBe('eager');
  });

  it('enhances footnote and ref links with tooltip and underline styles', () => {
    init();

    const fn = document.getElementById('fn-link') as HTMLAnchorElement | null;
    const ref = document.getElementById('ref-link') as HTMLAnchorElement | null;

    expect(fn).not.toBeNull();
    expect(ref).not.toBeNull();

    for (const el of [fn!, ref!]) {
      expect(el.getAttribute('data-footnote-enhanced')).toBe('true');
      expect(el.getAttribute('data-tooltip')).toBe('Zum entsprechenden Absatz springen');
      expect(el.classList.contains('underline')).toBe(true);
      expect(el.classList.contains('decoration-dotted')).toBe(true);
      expect(el.classList.contains('decoration-gray-400')).toBe(true);
      expect(el.classList.contains('underline-offset-4')).toBe(true);
    }
  });

  it('is idempotent across multiple init calls and safe to cleanup', () => {
    expect(() => init()).not.toThrow();
    // call twice; should be no-op on second call
    expect(() => init()).not.toThrow();

    // cleanup should not throw even if called once
    expect(() => enhanceCleanup()).not.toThrow();

    // re-init should work after cleanup
    expect(() => init()).not.toThrow();
  });
});
