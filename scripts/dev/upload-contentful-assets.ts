import fs from 'fs/promises';
import { createReadStream } from 'fs';
import path from 'path';
import contentfulManagement from 'contentful-management';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface AssetManifestEntry {
  source: string;
  resolvedPath: string;
  referencedIn: string;
}

async function loadManifest(): Promise<AssetManifestEntry[]> {
  const manifestPath = path.resolve(__dirname, '../contentful_assets.json');
  const raw = await fs.readFile(manifestPath, 'utf-8');
  return JSON.parse(raw) as AssetManifestEntry[];
}

function getEnvOrThrow(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Environment variable ${name} is required but not set.`);
  }
  return value;
}

async function uploadAssets() {
  const spaceId = getEnvOrThrow('CONTENTFUL_SPACE_ID');
  const environmentId = process.env.CONTENTFUL_ENVIRONMENT || 'master';
  const managementToken = getEnvOrThrow('CONTENTFUL_MANAGEMENT_TOKEN');

  const client = contentfulManagement.createClient({ accessToken: managementToken });
  const space = await client.getSpace(spaceId);
  const environment = await space.getEnvironment(environmentId);

  const manifest = await loadManifest();
  console.log(`Verarbeite ${manifest.length} Asset-Verweise aus contentful_assets.json`);

  for (const entry of manifest) {
    try {
      const fileName = path.basename(entry.resolvedPath);
      const contentType = detectContentType(fileName);

      console.log(`\n▸ Lade Asset hoch: ${fileName} (Referenz: ${entry.referencedIn})`);

      const asset = await environment.createAssetFromFiles({
        fields: {
          title: {
            'en-US': fileName,
          },
          description: {
            'en-US': `Imported for ${entry.referencedIn}`,
          },
          file: {
            'en-US': {
              contentType,
              fileName,
              file: createReadStream(entry.resolvedPath),
            },
          },
        },
      });

      const processed = await asset.processForAllLocales();
      const published = await processed.publish();

      console.log(`   ✓ Asset veröffentlicht (ID: ${published.sys.id})`);
    } catch (error) {
      console.error(`   ✗ Fehler beim Hochladen von ${entry.resolvedPath}`, error);
    }
  }

  console.log('\nFertig: Assets wurden verarbeitet. Aktualisiere contentful_migration.json mit den Asset-IDs, bevor du den Import startest.');
}

function detectContentType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
    case '.gif':
      return 'image/gif';
    default:
      return 'application/octet-stream';
  }
}

uploadAssets().catch((error) => {
  console.error('Upload abgebrochen:', error);
  process.exit(1);
});
