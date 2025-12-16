import {
  createClient,
  type Asset,
  type AssetFile,
  type ContentfulClientApi,
  type Entry,
  type EntryFieldTypes,
  type EntrySkeletonType,
} from 'contentful';
import { BLOCKS, type Document as RichTextDocument } from '@contentful/rich-text-types';
import { documentToHtmlString } from '@contentful/rich-text-html-renderer';
import { z } from 'zod';

import type { BlogPostData, ProcessedBlogPost } from '@/content/types';
import { extractExcerpt } from './excerpt';
import { formatDate } from '@/lib/datetime';

const contentfulEnvSchema = z.object({
  spaceId: z.string().trim().min(1, 'CONTENTFUL_SPACE_ID missing'),
  environment: z.string().trim().min(1, 'CONTENTFUL_ENVIRONMENT missing'),
  accessToken: z.string().trim().min(1, 'CONTENTFUL_DELIVERY_TOKEN or fallback token missing'),
  host: z.string().trim().min(1, 'CONTENTFUL_API_HOST missing'),
});

type ContentfulEnvConfig = z.infer<typeof contentfulEnvSchema>;

let cachedEnvConfig: ContentfulEnvConfig | null = null;
let cachedClient: ContentfulClientApi<undefined> | null = null;

let runtimeEnvConfig: Record<string, unknown> | null = null;
let runtimeEnvFingerprint: string | null = null;

function hashString(input: string): string {
  // Small, deterministic hash (djb2 variant). Not for security.
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

function computeEnvFingerprint(env: Record<string, unknown> | null): string {
  const keys = [
    'CONTENTFUL_SPACE_ID',
    'CONTENTFUL_ENVIRONMENT',
    'CONTENTFUL_DELIVERY_TOKEN',
    'CONTENTFUL_ACCESS_TOKEN',
    'CONTENTFUL_PREVIEW_TOKEN',
    'CONTENTFUL_API_HOST',
  ];

  return keys
    .map((k) => {
      const v = env?.[k];
      return typeof v === 'string' ? hashString(v) : '';
    })
    .join('|');
}

export function setContentfulRuntimeEnv(env: unknown): void {
  const next = env && typeof env === 'object' ? (env as Record<string, unknown>) : null;
  const nextFingerprint = computeEnvFingerprint(next);

  if (runtimeEnvFingerprint !== nextFingerprint) {
    runtimeEnvConfig = next;
    runtimeEnvFingerprint = nextFingerprint;
    cachedEnvConfig = null;
    cachedClient = null;
  }
}

function resolveEnvVar(name: keyof NodeJS.ProcessEnv): string | undefined {
  const runtimeKey = String(name);
  const runtimeValue = runtimeEnvConfig?.[runtimeKey];
  if (typeof runtimeValue === 'string' && runtimeValue) {
    return runtimeValue;
  }
  if (typeof process !== 'undefined' && process.env && process.env[name]) {
    return process.env[name];
  }
  if (typeof import.meta !== 'undefined' && (import.meta as ImportMeta).env) {
    const envValue = ((import.meta as ImportMeta).env as Record<string, string | undefined>)[name];
    if (envValue) return envValue;
  }
  return undefined;
}

function readEnvConfig(): ContentfulEnvConfig {
  if (cachedEnvConfig) return cachedEnvConfig;

  const rawSpaceId = resolveEnvVar('CONTENTFUL_SPACE_ID');
  const rawEnvironment = resolveEnvVar('CONTENTFUL_ENVIRONMENT') ?? 'master';
  const rawDeliveryToken = resolveEnvVar('CONTENTFUL_DELIVERY_TOKEN');
  const rawAccessToken = resolveEnvVar('CONTENTFUL_ACCESS_TOKEN');
  const rawPreviewToken = resolveEnvVar('CONTENTFUL_PREVIEW_TOKEN');
  const explicitHost = resolveEnvVar('CONTENTFUL_API_HOST');

  let accessToken = rawDeliveryToken ?? rawAccessToken ?? undefined;
  let host = explicitHost ?? 'cdn.contentful.com';

  if (!accessToken && rawPreviewToken) {
    accessToken = rawPreviewToken;
    host = explicitHost ?? 'preview.contentful.com';
  }

  const parsed = contentfulEnvSchema.safeParse({
    spaceId: rawSpaceId,
    environment: rawEnvironment,
    accessToken,
    host,
  });

  if (!parsed.success) {
    throw new Error(
      `Invalid Contentful environment configuration: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`
    );
  }

  cachedEnvConfig = parsed.data;
  return cachedEnvConfig;
}

export function getContentfulClient(): ContentfulClientApi<undefined> {
  if (cachedClient) return cachedClient;

  const { spaceId, environment, accessToken, host } = readEnvConfig();

  cachedClient = createClient({
    space: spaceId,
    environment,
    accessToken,
    host,
  });

  return cachedClient;
}

interface BlogPostSkeleton extends EntrySkeletonType {
  contentTypeId: 'blogPost';
  fields: {
    title: EntryFieldTypes.Text;
    slug: EntryFieldTypes.Symbol;
    publishDate: EntryFieldTypes.Date;
    updatedDate?: EntryFieldTypes.Date;
    description: EntryFieldTypes.Text;
    author?: EntryFieldTypes.Text;
    category?: EntryFieldTypes.Text;
    tags?: EntryFieldTypes.Array<EntryFieldTypes.Symbol>;
    featured?: EntryFieldTypes.Boolean;
    draft?: EntryFieldTypes.Boolean;
    imageAlt?: EntryFieldTypes.Text;
    image?: EntryFieldTypes.AssetLink;
    content: EntryFieldTypes.RichText;
    lang?: EntryFieldTypes.Symbol;
  };
}

export type { BlogPostSkeleton };

export type ContentfulBlogEntry = Entry<BlogPostSkeleton>;

function normalizeAuthor(
  author: string | { name?: string } | null | undefined
): BlogPostData['author'] {
  if (!author) return 'EvolutionHub Team';
  if (typeof author === 'string') return author;
  if (author && typeof author === 'object' && author.name) {
    return author.name;
  }
  return 'EvolutionHub Team';
}

function normalizeDate(value: string | undefined | null): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function resolveAssetFile(file: Asset['fields']['file']): AssetFile | undefined {
  if (!file) return undefined;
  if (typeof file === 'object' && 'url' in file) {
    return file as AssetFile;
  }
  const values = Object.values(file as Record<string, AssetFile | undefined>);
  return values.find((value): value is AssetFile => Boolean(value && value.url));
}

function buildImageData(asset: Asset | null | undefined): BlogPostData['image'] {
  if (!asset) return undefined;
  const assetFile = resolveAssetFile(asset.fields?.file);
  if (!assetFile || typeof assetFile.url !== 'string') return undefined;

  const url = assetFile.url.startsWith('//') ? `https:${assetFile.url}` : assetFile.url;
  const imageDetails =
    (assetFile.details?.image as { width?: number; height?: number } | undefined) ?? {};
  const format = assetFile.contentType?.split('/')[1] ?? undefined;

  return {
    src: url,
    width: imageDetails.width ?? 1200,
    height: imageDetails.height ?? 630,
    format: format ?? 'jpeg',
  } satisfies BlogPostData['image'];
}

const EMPTY_RICH_TEXT: RichTextDocument = {
  nodeType: BLOCKS.DOCUMENT,
  data: {},
  content: [],
};

type LocalizedValue<T> = T | Record<string, T | undefined | null> | null | undefined;

function isLocalizedMap(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const keys = Object.keys(value);
  if (keys.length === 0) return false;
  return keys.every((key) => key.includes('-'));
}

function resolveLocalizedField<T>(value: LocalizedValue<T>, fallback: T): T {
  if (value === undefined || value === null) {
    return fallback;
  }
  if (Array.isArray(value)) {
    return value as unknown as T;
  }
  if (isLocalizedMap(value)) {
    for (const candidate of Object.values(value)) {
      if (candidate !== undefined && candidate !== null) {
        return candidate as T;
      }
    }
    return fallback;
  }
  return value as T;
}

function isAssetLike(value: unknown): value is Asset {
  return (
    typeof value === 'object' &&
    value !== null &&
    'fields' in (value as Record<string, unknown>) &&
    'sys' in (value as Record<string, unknown>)
  );
}

export function mapEntryToBlogPost(entry: ContentfulBlogEntry): ProcessedBlogPost {
  const fields = entry.fields;

  const title = resolveLocalizedField<string>(fields.title as LocalizedValue<string>, 'Untitled');
  const slug = resolveLocalizedField<string>(fields.slug as LocalizedValue<string>, entry.sys.id);
  const description = resolveLocalizedField<string>(
    fields.description as LocalizedValue<string>,
    ''
  );
  const pubDateIso = resolveLocalizedField<string>(
    fields.publishDate as LocalizedValue<string>,
    new Date().toISOString()
  );
  const pubDate = new Date(pubDateIso);
  const updatedDateIso = resolveLocalizedField<string | null>(
    fields.updatedDate as LocalizedValue<string | null>,
    null
  );
  const updatedDate = normalizeDate(updatedDateIso ?? undefined);
  const rawAuthor = resolveLocalizedField<string | { name?: string } | null>(
    fields.author as LocalizedValue<string | { name?: string } | null>,
    null
  );
  const author = normalizeAuthor(rawAuthor ?? undefined);
  const category = resolveLocalizedField<string>(
    fields.category as LocalizedValue<string>,
    'Allgemein'
  );
  const tags = resolveLocalizedField<string[]>(fields.tags as LocalizedValue<string[]>, []);
  const draft = resolveLocalizedField<boolean>(fields.draft as LocalizedValue<boolean>, false);
  const featured = resolveLocalizedField<boolean>(
    fields.featured as LocalizedValue<boolean>,
    false
  );
  const langRaw = resolveLocalizedField<string | null>(
    fields.lang as LocalizedValue<string | null>,
    'de'
  );
  const lang = langRaw === 'en' ? 'en' : 'de';

  const imageField = resolveLocalizedField<Asset | null>(
    fields.image as LocalizedValue<Asset | null>,
    null
  );
  const image = isAssetLike(imageField) ? buildImageData(imageField) : undefined;
  const imageAlt =
    resolveLocalizedField<string | null>(fields.imageAlt as LocalizedValue<string | null>, title) ??
    title;

  const content = resolveLocalizedField<RichTextDocument>(
    fields.content as LocalizedValue<RichTextDocument>,
    EMPTY_RICH_TEXT
  );

  const bodyHtml = documentToHtmlString(content);
  const bodyText = bodyHtml.replace(/<[^>]+>/g, ' ');
  const readingTime = calculateReadingTime(bodyText);

  const processed: ProcessedBlogPost = {
    id: entry.sys.id,
    slug,
    body: bodyText,
    bodyHtml,
    excerpt: extractExcerpt(bodyText, 280),
    data: {
      title,
      description,
      pubDate,
      updatedDate,
      author,
      category,
      tags,
      featured,
      draft,
      image,
      imageAlt,
      lang,
    },
    readingTime,
    formattedPubDate: formatDate(pubDate),
    formattedUpdatedDate: updatedDate ? formatDate(updatedDate) : undefined,
    url: `/blog/${slug}`,
  };

  return processed;
}

function calculateReadingTime(text: string) {
  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const minutes = Math.ceil(wordCount / 200);
  const time = minutes * 60 * 1000;
  return {
    text:
      minutes === 0
        ? 'Less than a minute read'
        : minutes === 1
          ? '1 minute read'
          : `${minutes} minutes read`,
    minutes,
    time,
    words: wordCount,
  };
}
