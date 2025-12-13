#!/usr/bin/env tsx
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { createClient as createDeliveryClient } from 'contentful';
import contentfulManagement from 'contentful-management';

type LocaleMap<T> = Record<string, T | undefined>;

type AssetLinkField = {
  sys?: {
    id?: string;
    type?: string;
    linkType?: string;
  };
};

interface DeliveryEntry {
  sys: { id: string };
  fields: {
    slug?: unknown;
    title?: unknown;
    image?: unknown;
    content?: unknown;
  };
}

interface DeliveryAsset {
  sys: { id: string };
  fields: {
    title?: unknown;
    file?: unknown;
  };
}

interface Candidate {
  entryId: string;
  slug: string;
  assetId: string;
  locales: string[];
}

interface MgmtEntry {
  fields: {
    image?: LocaleMap<AssetLinkField>;
  };
  update(): Promise<MgmtEntry>;
  publish(): Promise<MgmtEntry>;
}

interface MgmtEnvironment {
  getEntry(id: string): Promise<MgmtEntry>;
}

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

function extractHeroImageAssetIdFromFields(fields: { image?: unknown }): string | undefined {
  const imageField = fields.image as LocaleMap<AssetLinkField> | undefined;
  if (!imageField) return undefined;
  for (const link of Object.values(imageField)) {
    const id = link?.sys?.id;
    if (typeof id === 'string' && id.length > 0) return id;
  }
  return undefined;
}

function inferLocalesFromEntry(entry: DeliveryEntry): string[] {
  const collectKeys = (value: unknown): string[] => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return Object.keys(value as LocaleMap<unknown>);
    }
    return [];
  };

  const slugLocales = collectKeys(entry.fields.slug);
  const titleLocales = collectKeys(entry.fields.title);
  const merged = Array.from(new Set([...slugLocales, ...titleLocales]));

  return merged.length > 0 ? merged : ['en-US'];
}
function getFirstLocalizedString(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && !Array.isArray(value)) {
    const map = value as LocaleMap<unknown>;
    for (const v of Object.values(map)) {
      if (typeof v === 'string') return v;
    }
  }
  return undefined;
}

function normalize(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function findAssetIdForSlug(slug: string, assets: DeliveryAsset[]): string | undefined {
  const normalizedSlug = normalize(slug);

  const matchingAssets: DeliveryAsset[] = [];

  for (const asset of assets) {
    const title = getFirstLocalizedString(asset.fields.title);
    const fileFieldLocalized = resolveLocalizedField<{
      fileName?: unknown;
    }>(asset.fields.file as LocaleMap<{ fileName?: unknown }> | undefined);
    const fileName =
      fileFieldLocalized && typeof fileFieldLocalized.fileName === 'string'
        ? fileFieldLocalized.fileName
        : undefined;

    const candidates: string[] = [];
    if (typeof title === 'string') candidates.push(title);
    if (typeof fileName === 'string') candidates.push(fileName);

    const hasMatch = candidates.some((name) => {
      const normalizedName = normalize(name);
      return normalizedName.includes(normalizedSlug);
    });

    if (hasMatch) {
      matchingAssets.push(asset);
    }
  }

  if (matchingAssets.length === 1) {
    return matchingAssets[0].sys.id;
  }

  if (matchingAssets.length > 1) {
    console.warn(
      `[migrate] Ambiguous asset match for slug="${slug}" (matches=${matchingAssets
        .map((a) => a.sys.id)
        .join(', ')}) – skipping`
    );
  }

  return undefined;
}

async function collectCandidates(): Promise<Candidate[]> {
  const spaceId = ensureEnv('CONTENTFUL_SPACE_ID');
  const environment = ensureEnv('CONTENTFUL_ENVIRONMENT');
  const accessToken = process.env.CONTENTFUL_DELIVERY_TOKEN || ensureEnv('CONTENTFUL_ACCESS_TOKEN');

  const client = createDeliveryClient({ space: spaceId, environment, accessToken });

  const [entriesResponse, assetsResponse] = await Promise.all([
    client.getEntries({
      content_type: 'blogPost',
      include: 1,
      limit: 1000,
    }),
    client.getAssets({
      limit: 1000,
    }),
  ]);

  const items = (entriesResponse.items ?? []) as DeliveryEntry[];
  const assets = (assetsResponse.items ?? []) as DeliveryAsset[];

  const candidates: Candidate[] = [];

  for (const entry of items) {
    const fields = entry.fields;
    const slugRaw = fields.slug as unknown;
    const slug =
      typeof slugRaw === 'string'
        ? slugRaw
        : resolveLocalizedField<string>(slugRaw as LocaleMap<string>) || entry.sys.id;

    const existingHero = extractHeroImageAssetIdFromFields(fields);
    if (existingHero) {
      continue;
    }

    const matchedAssetId = findAssetIdForSlug(slug, assets);
    if (!matchedAssetId) {
      continue;
    }

    const locales = inferLocalesFromEntry(entry);

    candidates.push({
      entryId: entry.sys.id,
      slug,
      assetId: matchedAssetId,
      locales,
    });
  }

  return candidates;
}

async function applyMigration(env: MgmtEnvironment, candidates: Candidate[]): Promise<void> {
  for (const candidate of candidates) {
    try {
      const entry = await env.getEntry(candidate.entryId);
      const imageField = (entry.fields.image || {}) as LocaleMap<AssetLinkField>;

      const alreadyHasImage = Object.values(imageField).some((link) => {
        const id = link?.sys?.id;
        return typeof id === 'string' && id.length > 0;
      });
      if (alreadyHasImage) {
        // Skip if someone already set an image manually in the meantime
        // eslint-disable-next-line no-continue
        continue;
      }

      const locales = candidate.locales;
      if (!Array.isArray(locales) || locales.length === 0) {
        // Fallback to default locale
        locales.push('en-US');
      }

      entry.fields.image = entry.fields.image || {};
      const imageFieldMutable = entry.fields.image as LocaleMap<AssetLinkField>;

      locales.forEach((locale) => {
        if (!imageFieldMutable[locale]) {
          imageFieldMutable[locale] = {
            sys: {
              id: candidate.assetId,
              type: 'Link',
              linkType: 'Asset',
            } as unknown as { id: string },
          } as AssetLinkField;
        }
      });

      const updated = await entry.update();
      await updated.publish();
      console.log(
        `[apply] Set hero image for ${candidate.slug} (entryId=${candidate.entryId}, assetId=${candidate.assetId}, locales=${locales.join(',')})`
      );
    } catch (error) {
      console.error(
        `[apply] Failed to set hero image for entryId=${candidate.entryId}, slug=${candidate.slug}:`,
        error instanceof Error ? error.message : error
      );
    }
  }
}

async function main() {
  const apply = process.argv.includes('--apply');

  const candidates = await collectCandidates();

  const reportsDir = path.join(process.cwd(), 'reports');
  await fs.promises.mkdir(reportsDir, { recursive: true });
  const dryRunPath = path.join(reportsDir, 'blog-hero-image-migrate-dry-run.json');
  await fs.promises.writeFile(dryRunPath, JSON.stringify(candidates, null, 2), 'utf8');

  console.log('\nBlog Hero Image Migration (Contentful)');
  console.log('======================================');
  console.log(
    JSON.stringify(
      {
        totalCandidates: candidates.length,
        reportFile: path.relative(process.cwd(), dryRunPath),
        mode: apply ? 'apply' : 'dry-run',
      },
      null,
      2
    )
  );

  if (!apply) {
    console.log('\nDry-run only. Re-run with --apply to perform updates.');
    return;
  }

  const spaceId = ensureEnv('CONTENTFUL_SPACE_ID');
  const environmentId = ensureEnv('CONTENTFUL_ENVIRONMENT');
  const managementToken = ensureEnv('CONTENTFUL_MANAGEMENT_TOKEN');

  const mgmtClient = contentfulManagement.createClient({ accessToken: managementToken });
  const space = await mgmtClient.getSpace(spaceId);
  const env = await space.getEnvironment(environmentId);

  await applyMigration(env, candidates);
}

main().catch((error) => {
  console.error(
    '[contentful-blog-hero-migrate] Failed:',
    error instanceof Error ? error.message : error
  );
  process.exit(1);
});
