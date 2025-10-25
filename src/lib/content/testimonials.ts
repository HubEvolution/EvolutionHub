import { getCollection } from 'astro:content';

export type Lang = 'en' | 'de';

export interface TestimonialFrontmatter {
  tools: string[];
  lang: Lang;
  author: string;
  role: string;
  quote: string;
  company?: string;
  weight?: number;
  featured?: boolean;
}

export interface TestimonialEntry {
  id: string;
  slug: string;
  body: string;
  data: TestimonialFrontmatter;
}

export interface GetTestimonialsOptions {
  tools: string[];
  lang: Lang;
  limit?: number;
}

function sortByPriority(a: TestimonialEntry, b: TestimonialEntry): number {
  const af = a.data.featured ? 1 : 0;
  const bf = b.data.featured ? 1 : 0;
  if (af !== bf) return bf - af; // featured first
  const aw = a.data.weight ?? 50;
  const bw = b.data.weight ?? 50;
  if (aw !== bw) return bw - aw; // higher weight first
  // stable by slug
  return a.slug.localeCompare(b.slug);
}

/**
 * Fair-mix selection across tools using round-robin buckets.
 */
function fairMix(entries: TestimonialEntry[], tools: string[], limit: number): TestimonialEntry[] {
  const buckets = tools.map((t) =>
    entries.filter((e) => e.data.tools.includes(t)).sort(sortByPriority)
  );
  const used = new Set<string>();
  const result: TestimonialEntry[] = [];
  let exhausted = 0;
  let idx = 0;
  while (result.length < limit && exhausted < buckets.length * 2) {
    const b = buckets[idx % buckets.length];
    // Remove already used from head
    while (b.length && used.has(b[0].id)) b.shift();
    if (b.length) {
      const pick = b.shift()!;
      if (!used.has(pick.id)) {
        used.add(pick.id);
        result.push(pick);
      }
      exhausted = 0; // progress
    } else {
      exhausted++;
    }
    idx++;
  }
  return result.slice(0, limit);
}

export async function getTestimonials(opts: GetTestimonialsOptions) {
  const { tools, lang, limit = 6 } = opts;
  const all = (await getCollection('testimonials')) as TestimonialEntry[];
  const filtered = all.filter((e) => e.data.lang === lang);
  const selected = tools.length ? fairMix(filtered, tools, limit) : filtered.slice(0, limit);
  return selected.map((e) => ({
    quote: e.data.quote,
    author: e.data.author,
    role: e.data.role + (e.data.company ? `, ${e.data.company}` : ''),
  }));
}
