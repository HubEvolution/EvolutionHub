import 'dotenv/config';

import { readFile } from 'node:fs/promises';
import path from 'node:path';

import contentfulManagement from 'contentful-management';

interface AssetManifestEntry {
  source: string;
  resolvedPath: string;
  referencedIn: string;
}

const LOCALE = 'en-US';
const PROCESS_TIMEOUT_MS = 30000;
const PROCESS_POLL_INTERVAL_MS = 1000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function processAndPublishAsset(environment: any, asset: any): Promise<void> {
  await asset.processForLocale(LOCALE);

  const startedAt = Date.now();
  while (true) {
    const refreshed = await environment.getAsset(asset.sys.id);
    const fileForLocale = refreshed.fields?.file?.[LOCALE];
    if (fileForLocale && 'url' in fileForLocale && fileForLocale.url) {
      if (!refreshed.isPublished()) {
        await refreshed.publish();
      }
      return;
    }

    if (Date.now() - startedAt > PROCESS_TIMEOUT_MS) {
      throw new Error(`Timed out waiting for asset ${asset.sys.id} to process`);
    }

    await delay(PROCESS_POLL_INTERVAL_MS);
  }
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

async function main(): Promise<void> {
  const manifestPath = path.resolve('scripts/contentful_assets.json');
  const manifestRaw = await readFile(manifestPath, 'utf8');
  const manifest = JSON.parse(manifestRaw) as AssetManifestEntry[];

  const spaceId = requireEnv('CONTENTFUL_SPACE_ID');
  const environmentId = process.env.CONTENTFUL_ENVIRONMENT?.trim() || 'master';
  const managementToken = requireEnv('CONTENTFUL_MANAGEMENT_TOKEN');

  const client = contentfulManagement.createClient({ accessToken: managementToken });
  const space = await client.getSpace(spaceId);
  const environment = await space.getEnvironment(environmentId);

  for (const entry of manifest) {
    const fileName = path.basename(entry.resolvedPath);
    const contentType = inferContentType(fileName);
    if (!contentType) {
      console.warn(`Skipping ${fileName}: unsupported extension`);
      continue;
    }

    const fileBuffer = await readFile(entry.resolvedPath);

    const assetId = entry.source
      .split('/')
      .pop()
      ?.replace(/\.[^.]+$/, '');
    if (!assetId) {
      console.warn(`Could not derive asset ID for ${entry.source}`);
      continue;
    }

    console.log(`Uploading asset ${fileName} as ${assetId} (${entry.referencedIn})`);

    const title = assetId.replace(/-/g, ' ');
    const fileArrayBuffer = fileBuffer.buffer.slice(
      fileBuffer.byteOffset,
      fileBuffer.byteOffset + fileBuffer.byteLength
    ) as ArrayBuffer;
    const upload = await environment.createUpload({ file: fileArrayBuffer });
    const fileFields = {
      contentType,
      fileName,
      uploadFrom: {
        sys: {
          type: 'Link',
          linkType: 'Upload',
          id: upload.sys.id,
        },
      },
    } as const;

    try {
      const existing = await environment.getAsset(assetId);
      const wasPublished = existing.isPublished();
      if (wasPublished) {
        await existing.unpublish();
      }

      existing.fields.title = existing.fields.title ?? { 'en-US': title };
      existing.fields.title['en-US'] = title;
      existing.fields.file = existing.fields.file ?? {};
      existing.fields.file['en-US'] = fileFields;

      const updated = await existing.update();
      await processAndPublishAsset(environment, updated);
      console.log(`${wasPublished ? '  Updated' : '  Published'} asset ${assetId}`);
      continue;
    } catch (error: unknown) {
      const err = error as { name?: string };
      if (err?.name !== 'NotFound') {
        throw error;
      }
    }

    const asset = await environment.createAssetWithId(assetId, {
      fields: {
        title: { 'en-US': title },
        file: {
          'en-US': fileFields,
        },
      },
    });

    await processAndPublishAsset(environment, asset);
    console.log(`  Published asset ${assetId}`);
  }
}

function inferContentType(fileName: string): string | undefined {
  const ext = path.extname(fileName).toLowerCase();
  switch (ext) {
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.webp':
      return 'image/webp';
    default:
      return undefined;
  }
}

main().catch((error) => {
  console.error('Fatal error while uploading assets:', error);
  process.exit(1);
});
