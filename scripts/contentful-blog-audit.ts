#!/usr/bin/env tsx
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from 'contentful';
import type { Document as RichTextDocument } from '@contentful/rich-text-types';

interface AuditItem {
  entryId: string;
  slug: string;
  hasHeroImage: boolean;
  heroImageAssetId?: string;
  firstBodyAssetId?: string;
}

type LocaleMap<T> = Record<string, T | undefined>;

type AssetLinkField = {
  sys?: {
    id?: string;
  };
};

type RichNode = {
  nodeType?: string;
  data?: {
    target?: {
      sys?: {
        id?: string;
      };
    };
  };
  content?: RichNode[];
};

function ensureEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var ${name}`);
  }
  return value;
}

function resolveLocalizedField<T>(value: T | LocaleMap<T> | undefined): T | undefined {
  if (!value) return undefined;
  if (typeof value === 'object' && !Array.isArray(value)) {
    const map = value as LocaleMap<T>;
    for (const v of Object.values(map)) {
      if (v !== undefined) return v;
    }
    return undefined;
  }
  return value as T;
}

function extractHeroImageAssetId(fields: { image?: unknown }): string | undefined {
  const imageField = fields.image as LocaleMap<AssetLinkField> | undefined;
  if (!imageField) return undefined;
  for (const link of Object.values(imageField)) {
    const id = link?.sys?.id;
    if (typeof id === 'string' && id.length > 0) return id;
  }
  return undefined;
}

function toRichTextDocument(value: unknown): RichTextDocument | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const maybeDoc = value as { nodeType?: string };
  if (maybeDoc.nodeType) return value as RichTextDocument;
  const map = value as LocaleMap<RichTextDocument>;
  for (const v of Object.values(map)) {
    if (v && typeof v === 'object' && 'nodeType' in v) return v;
  }
  return undefined;
}

function findFirstAssetIdInDocument(doc: RichTextDocument): string | undefined {
  const visit = (nodes: RichNode[]): string | undefined => {
    for (const node of nodes) {
      if (node.nodeType === 'embedded-asset-block' || node.nodeType === 'embedded-asset-inline') {
        const id = node.data?.target?.sys?.id;
        if (typeof id === 'string' && id.length > 0) return id;
      }
      if (Array.isArray(node.content)) {
        const nested = visit(node.content);
        if (nested) return nested;
      }
    }
    return undefined;
  };

  const root = doc as unknown as RichNode;
  if (Array.isArray(root.content)) {
    return visit(root.content);
  }
  return undefined;
}

async function main() {
  const spaceId = ensureEnv('CONTENTFUL_SPACE_ID');
  const environment = ensureEnv('CONTENTFUL_ENVIRONMENT');
  const accessToken = process.env.CONTENTFUL_DELIVERY_TOKEN || ensureEnv('CONTENTFUL_ACCESS_TOKEN');

  const client = createClient({ space: spaceId, environment, accessToken });

  const collection = await client.getEntries({
    content_type: 'blogPost',
    include: 2,
    limit: 1000,
  });

  const items = (collection.items ?? []) as Array<{
    sys: { id: string };
    fields: { slug?: unknown; image?: unknown; content?: unknown };
  }>;

  const auditItems: AuditItem[] = items.map((entry) => {
    const fields = entry.fields;
    const slugRaw = fields.slug as unknown;
    const slug =
      typeof slugRaw === 'string'
        ? slugRaw
        : resolveLocalizedField<string>(slugRaw as LocaleMap<string>) || entry.sys.id;

    const heroImageAssetId = extractHeroImageAssetId(fields);
    const hasHeroImage = typeof heroImageAssetId === 'string';

    const contentField = fields.content as unknown;
    const doc = toRichTextDocument(contentField);
    const firstBodyAssetId = doc ? findFirstAssetIdInDocument(doc) : undefined;

    return {
      entryId: entry.sys.id,
      slug,
      hasHeroImage,
      heroImageAssetId,
      firstBodyAssetId,
    };
  });

  const total = auditItems.length;
  const withoutHero = auditItems.filter((item) => !item.hasHeroImage);
  const candidates = withoutHero.filter((item) => !!item.firstBodyAssetId);

  const reportsDir = path.join(process.cwd(), 'reports');
  await fs.promises.mkdir(reportsDir, { recursive: true });
  const outPath = path.join(reportsDir, 'blog-hero-image-audit.json');
  await fs.promises.writeFile(outPath, JSON.stringify(auditItems, null, 2), 'utf8');

  console.log('\nBlog Hero Image Audit');
  console.log('======================');
  console.log(
    JSON.stringify(
      {
        totalPosts: total,
        withoutHeroImage: withoutHero.length,
        withCandidateFromBody: candidates.length,
        reportFile: path.relative(process.cwd(), outPath),
      },
      null,
      2
    )
  );

  if (withoutHero.length > 0) {
    console.log('\nExamples without hero image (up to 10):');
    withoutHero.slice(0, 10).forEach((item) => {
      console.log(
        `- ${item.slug} (entryId=${item.entryId}, firstBodyAssetId=${item.firstBodyAssetId ?? 'none'})`
      );
    });
  }
}

main().catch((error) => {
  console.error('[contentful-blog-audit] Failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
