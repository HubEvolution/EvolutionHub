import type { Entry, EntryFieldTypes, EntrySkeletonType } from 'contentful';
import { documentToHtmlString } from '@contentful/rich-text-html-renderer';
import { BLOCKS, type Document as RichTextDocument } from '@contentful/rich-text-types';

import { getContentfulClient } from '@/lib/contentful';

export type PublicDocLocale = 'de' | 'en';

interface PublicDocSkeleton extends EntrySkeletonType {
  contentTypeId: 'publicDoc';
  fields: {
    title: EntryFieldTypes.Text;
    slug: EntryFieldTypes.Symbol;
    locale: EntryFieldTypes.Symbol;
    summary?: EntryFieldTypes.Text;
    body: EntryFieldTypes.RichText;
    category?: EntryFieldTypes.Symbol;
    order?: EntryFieldTypes.Integer;
    isPublic?: EntryFieldTypes.Boolean;
  };
}

type ContentfulPublicDocEntry = Entry<PublicDocSkeleton>;

export type PublicDoc = {
  id: string;
  title: string;
  slug: string;
  locale: PublicDocLocale;
  summary: string;
  category: string;
  order: number;
  bodyHtml: string;
};

const EMPTY_RICH_TEXT: RichTextDocument = {
  nodeType: BLOCKS.DOCUMENT,
  data: {},
  content: [],
};

function toPublicDoc(entry: ContentfulPublicDocEntry): PublicDoc {
  const fields = entry.fields;

  const title = String(fields.title ?? '');
  const slug = String(fields.slug ?? entry.sys.id);
  const locale: PublicDocLocale = fields.locale === 'en' ? 'en' : 'de';

  const summaryRaw = fields.summary;
  const summary = typeof summaryRaw === 'string' ? summaryRaw : '';

  const categoryRaw = fields.category;
  const category = typeof categoryRaw === 'string' ? categoryRaw : '';

  const orderRaw = fields.order;
  const order = typeof orderRaw === 'number' && Number.isFinite(orderRaw) ? orderRaw : 0;

  const body = (fields.body as unknown as RichTextDocument | undefined) ?? EMPTY_RICH_TEXT;
  const bodyHtml = documentToHtmlString(body);

  return {
    id: entry.sys.id,
    title,
    slug,
    locale,
    summary,
    category,
    order,
    bodyHtml,
  };
}

type CacheItem<T> = {
  atMs: number;
  value: Promise<T>;
};

const CACHE_TTL_MS = 60_000;

export class PublicDocsService {
  private cacheByLocale: Partial<Record<PublicDocLocale, CacheItem<PublicDoc[]>>> = {};
  private cacheBySlug: Map<string, CacheItem<PublicDoc | null>> = new Map();

  async getFeatured(locale: PublicDocLocale, limit = 6): Promise<PublicDoc[]> {
    const nowMs = Date.now();
    const cached = this.cacheByLocale[locale];
    const isExpired = cached ? nowMs - cached.atMs > CACHE_TTL_MS : true;

    if (!cached || isExpired) {
      const value = (async () => {
        const client = getContentfulClient();
        const query: Record<string, unknown> = {
          content_type: 'publicDoc',
          include: 1,
          limit,
          order: ['fields.order', 'fields.title'],
          'fields.isPublic': true,
          'fields.locale': locale,
        };

        const res = await client.getEntries<PublicDocSkeleton>(query);
        const items = Array.isArray(res.items) ? res.items : [];
        return items.map((entry) => toPublicDoc(entry as ContentfulPublicDocEntry));
      })();

      this.cacheByLocale[locale] = { atMs: nowMs, value };
    }

    const result = await this.cacheByLocale[locale]!.value;
    return result.slice(0, Math.max(0, limit));
  }

  async getBySlug(locale: PublicDocLocale, slug: string): Promise<PublicDoc | null> {
    const safeSlug = String(slug ?? '').trim();
    if (!safeSlug) return null;

    const key = `${locale}:${safeSlug}`;
    const nowMs = Date.now();
    const cached = this.cacheBySlug.get(key);
    const isExpired = cached ? nowMs - cached.atMs > CACHE_TTL_MS : true;

    if (!cached || isExpired) {
      const value = (async () => {
        const client = getContentfulClient();
        const query: Record<string, unknown> = {
          content_type: 'publicDoc',
          include: 1,
          limit: 1,
          order: ['fields.order', 'fields.title'],
          'fields.isPublic': true,
          'fields.locale': locale,
          'fields.slug': safeSlug,
        };

        const res = await client.getEntries<PublicDocSkeleton>(query);
        const entry = res.items?.[0] as ContentfulPublicDocEntry | undefined;
        return entry ? toPublicDoc(entry) : null;
      })();

      this.cacheBySlug.set(key, { atMs: nowMs, value });
    }

    return this.cacheBySlug.get(key)!.value;
  }
}

export const publicDocsService = new PublicDocsService();
