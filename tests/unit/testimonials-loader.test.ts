import { describe, it, expect, beforeEach } from 'vitest';
import { getTestimonials } from '@/lib/content/testimonials';
// Pull test-only helper from mocked astro:content
import { __setCollectionData } from 'astro:content';

function makeEntry(id: string, slug: string, data: any) {
  return { id, slug, body: '', data };
}

describe('testimonials loader', () => {
  beforeEach(() => {
    __setCollectionData('testimonials', []);
  });

  it('filters by language and fairly mixes across tools', async () => {
    // Seed 6 DE (2 per tool) and 3 EN (1 per tool)
    const de = [
      makeEntry('de-imag-1', 'de/imag/1', {
        tools: ['imag'],
        lang: 'de',
        author: 'A',
        role: 'r',
        quote: 'q1',
        weight: 60,
      }),
      makeEntry('de-imag-2', 'de/imag/2', {
        tools: ['imag'],
        lang: 'de',
        author: 'B',
        role: 'r',
        quote: 'q2',
        weight: 50,
      }),
      makeEntry('de-prompt-1', 'de/prompt/1', {
        tools: ['prompt'],
        lang: 'de',
        author: 'C',
        role: 'r',
        quote: 'q3',
        weight: 55,
      }),
      makeEntry('de-prompt-2', 'de/prompt/2', {
        tools: ['prompt'],
        lang: 'de',
        author: 'D',
        role: 'r',
        quote: 'q4',
        weight: 45,
      }),
      makeEntry('de-voice-1', 'de/voice/1', {
        tools: ['voice'],
        lang: 'de',
        author: 'E',
        role: 'r',
        quote: 'q5',
        weight: 52,
      }),
      makeEntry('de-voice-2', 'de/voice/2', {
        tools: ['voice'],
        lang: 'de',
        author: 'F',
        role: 'r',
        quote: 'q6',
        weight: 42,
      }),
    ];
    const en = [
      makeEntry('en-imag-1', 'en/imag/1', {
        tools: ['imag'],
        lang: 'en',
        author: 'G',
        role: 'r',
        quote: 'q7',
      }),
      makeEntry('en-prompt-1', 'en/prompt/1', {
        tools: ['prompt'],
        lang: 'en',
        author: 'H',
        role: 'r',
        quote: 'q8',
      }),
      makeEntry('en-voice-1', 'en/voice/1', {
        tools: ['voice'],
        lang: 'en',
        author: 'I',
        role: 'r',
        quote: 'q9',
      }),
    ];
    __setCollectionData('testimonials', [...de, ...en]);

    const selected = await getTestimonials({
      tools: ['imag', 'prompt', 'voice'],
      lang: 'de',
      limit: 6,
    });
    expect(selected).toHaveLength(6);

    // Map back by author to infer tool buckets order roughly 2 each
    const authors = selected.map((s) => s.author);
    const bucketCounts = { imag: 0, prompt: 0, voice: 0 };

    for (const entry of [...de]) {
      if (authors.includes(entry.data.author)) {
        if (entry.data.tools.includes('imag')) bucketCounts.imag++;
        if (entry.data.tools.includes('prompt')) bucketCounts.prompt++;
        if (entry.data.tools.includes('voice')) bucketCounts.voice++;
      }
    }

    // fair mix should be ~2 each when limit=6 (given 2 per bucket)
    expect(bucketCounts.imag).toBe(2);
    expect(bucketCounts.prompt).toBe(2);
    expect(bucketCounts.voice).toBe(2);
  });

  it('respects limit and includes featured/weight priority within buckets', async () => {
    const entries = [
      makeEntry('x1', 'imag/1', {
        tools: ['imag'],
        lang: 'en',
        author: 'A',
        role: 'r',
        quote: 'q',
        featured: true,
        weight: 80,
      }),
      makeEntry('x2', 'imag/2', {
        tools: ['imag'],
        lang: 'en',
        author: 'B',
        role: 'r',
        quote: 'q',
        weight: 20,
      }),
      makeEntry('y1', 'prompt/1', {
        tools: ['prompt'],
        lang: 'en',
        author: 'C',
        role: 'r',
        quote: 'q',
        weight: 75,
      }),
      makeEntry('y2', 'prompt/2', {
        tools: ['prompt'],
        lang: 'en',
        author: 'D',
        role: 'r',
        quote: 'q',
        weight: 10,
      }),
      makeEntry('z1', 'voice/1', {
        tools: ['voice'],
        lang: 'en',
        author: 'E',
        role: 'r',
        quote: 'q',
        weight: 70,
      }),
      makeEntry('z2', 'voice/2', {
        tools: ['voice'],
        lang: 'en',
        author: 'F',
        role: 'r',
        quote: 'q',
        weight: 5,
      }),
    ];
    __setCollectionData('testimonials', entries);

    const selected = await getTestimonials({
      tools: ['imag', 'prompt', 'voice'],
      lang: 'en',
      limit: 3,
    });
    expect(selected).toHaveLength(3);

    // Featured + highest weight from each bucket likely picked
    const pickedAuthors = selected.map((s) => s.author);
    expect(pickedAuthors).toContain('A'); // featured imag
    expect(pickedAuthors).toContain('C'); // high weight prompt
    expect(pickedAuthors).toContain('E'); // high weight voice
  });
});
