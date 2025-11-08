// /scripts/migrate-to-contentful.mjs
import dotenv from 'dotenv';
dotenv.config();

import pkg from 'contentful-management';
const { createClient } = pkg;
import richTextFromMarkdownPkg from '@contentful/rich-text-from-markdown';
const { richTextFromMarkdown } = richTextFromMarkdownPkg;
import { globby } from 'globby';
import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';

const DRY_RUN = process.argv.includes('--dry-run');

// --- Konfiguration ---
const SPACE_ID = process.env.CONTENTFUL_SPACE_ID;
const MANAGEMENT_TOKEN = process.env.CONTENTFUL_MANAGEMENT_TOKEN;
const ENVIRONMENT = process.env.CONTENTFUL_ENVIRONMENT || 'master';
const CONTENT_TYPE_ID = 'blogPost'; // Die API-ID deines Content Models aus der JSON
const BLOG_FILES_PATH = 'src/content/blog';
// Der Basispfad, von dem aus die Bildpfade in deinem Frontmatter relativ sind.
// Da deine Pfade wie '/src/content/blog/images/...' aussehen, ist das Projekt-Root richtig.
const IMAGE_BASE_PATH = process.cwd(); 

if (!DRY_RUN && (!SPACE_ID || !MANAGEMENT_TOKEN)) {
  console.error('Bitte setze CONTENTFUL_SPACE_ID und CONTENTFUL_MANAGEMENT_TOKEN in deiner .env Datei.');
  process.exit(1);
}

const client = !DRY_RUN
  ? createClient({
      accessToken: MANAGEMENT_TOKEN,
    })
  : null;

const dryRunReport = [];

const ensureReportsDir = async () => {
  try {
    await fs.mkdir('reports', { recursive: true });
  } catch (error) {
    console.warn('Konnte reports/ Verzeichnis nicht erstellen:', error);
  }
};

const resolveImagePath = (imageField) => {
  if (!imageField) return null;
  if (typeof imageField === 'string') return imageField;
  if (typeof imageField === 'object' && imageField.src) return imageField.src;
  if (typeof imageField === 'object' && imageField.path) return imageField.path;
  return null;
};

async function uploadAsset(space, environment, imagePath, imageAlt) {
  console.log(`🖼️  Lade Bild hoch: ${imagePath}`);
  if (!imagePath) {
    console.log('⚠️  Kein Bildpfad vorhanden, überspringe Upload.');
    return null;
  }
  if (DRY_RUN) {
    dryRunReport[dryRunReport.length - 1]?.assets.push({ imagePath, imageAlt });
    return { sys: { id: 'dryrun_asset' } };
  }
  try {
    // Erstelle den absoluten Pfad zum Bild
    const absoluteImagePath = path.join(IMAGE_BASE_PATH, imagePath.replace(/^\//, ''));
    const fileContent = await fs.readFile(absoluteImagePath);
    const fileName = path.basename(imagePath);

    // Bestimme den Content-Type anhand der Dateiendung
    const extension = path.extname(fileName).toLowerCase();
    let contentType = 'application/octet-stream'; // Fallback
    if (extension === '.webp') contentType = 'image/webp';
    if (extension === '.jpg' || extension === '.jpeg') contentType = 'image/jpeg';
    if (extension === '.png') contentType = 'image/png';
    if (extension === '.gif') contentType = 'image/gif';


    const asset = await environment.createAssetFromFiles({
      fields: {
        title: {
          'de-DE': imageAlt || fileName, // Wir nehmen an, Deutsch ist die Hauptsprache
        },
        description: {
          'de-DE': imageAlt || 'Titelbild für einen Blogartikel',
        },
        file: {
          'de-DE': {
            contentType: contentType,
            fileName: fileName,
            file: fileContent,
          },
        },
      },
    });

    const processedAsset = await asset.processForAllLocales();
    await processedAsset.publish();
    console.log(`✅ Bild erfolgreich hochgeladen und veröffentlicht: ${processedAsset.sys.id}`);
    return processedAsset;
  } catch (error) {
    console.error(`Fehler beim Hochladen von :`, error);
    return null;
  }
}

async function migrate() {
  console.log('🚀 Starte Migration zu Contentful...');
  let environment = null;
  if (!DRY_RUN) {
    const space = await client.getSpace(SPACE_ID);
    environment = await space.getEnvironment(ENVIRONMENT);
  }

  // Alle Markdown-Dateien im Blog-Verzeichnis finden
  const files = await globby([
    `${BLOG_FILES_PATH}/**/*.md`,
    `${BLOG_FILES_PATH}/**/*.mdx`,
  ]);
  console.log(`📁 Gefundene Dateien:`, files);
  console.log(`📄 ${files.length} Markdown-Dateien gefunden.`);

  for (const file of files) {
    console.log(`\n--- Verarbeite: ${file} ---`);
    const fileContent = await fs.readFile(file, 'utf-8');
    const { data, content } = matter(fileContent);

    dryRunReport.push({
      file,
      title: data.title ?? '(kein Titel)',
      slug: data.slug ?? path.basename(file, path.extname(file)),
      assets: [],
    });

    // 1. Bild hochladen (angepasst an deine Struktur)
    let assetLink = null;
    const imagePath = resolveImagePath(data.image);
    if (imagePath) {
      const asset = await uploadAsset(client, environment, imagePath, data.imageAlt);
      if (asset) {
        assetLink = {
          sys: {
            type: 'Link',
            linkType: 'Asset',
            id: asset.sys.id,
          },
        };
      }
    }

    // 2. Markdown zu Rich Text konvertieren
    const richTextBody = await richTextFromMarkdown(content);

    // 3. Contentful-Eintrag erstellen (Felder an deine JSON angepasst)
    console.log(`✍️  Erstelle Eintrag für: "${data.title}"`);
    try {
      const slug = data.slug ?? path.basename(file, path.extname(file));
      const entryPayload = {
        fields: {
          title: { 'de-DE': data.title },
          slug: { 'de-DE': slug },
          content: { 'de-DE': richTextBody },
          publishDate: data.pubDate ? { 'de-DE': data.pubDate } : undefined,
          author: data.author ? { 'de-DE': data.author } : undefined,
          category: data.category ? { 'de-DE': data.category } : undefined,
          tags: data.tags ? { 'de-DE': data.tags } : undefined,
          image: assetLink ? { 'de-DE': assetLink } : undefined,
          imageAlt: data.imageAlt ? { 'de-DE': data.imageAlt } : undefined,
        },
      };

      if (DRY_RUN) {
        dryRunReport[dryRunReport.length - 1].payload = entryPayload;
        console.log('🧪 Dry Run – Eintrag nicht erstellt.');
      } else {
        const entry = await environment.createEntry(CONTENT_TYPE_ID, entryPayload);
        await entry.publish();
        console.log(`✅ Eintrag erfolgreich erstellt und veröffentlicht: ${entry.sys.id}`);
      }
    } catch (error) {
      console.error(`Fehler beim Erstellen des Eintrags für :`, error.message);
      // Logge mehr Details bei Validierungsfehlern
      if (error.response && error.response.data && error.response.data.details) {
        console.error('Details:', JSON.stringify(error.response.data.details, null, 2));
      }
    }
  }

  if (DRY_RUN) {
    await ensureReportsDir();
    const reportPath = path.join('reports', 'contentful-dry-run.json');
    await fs.writeFile(reportPath, JSON.stringify(dryRunReport, null, 2), 'utf-8');
    console.log(`\n🧪 Dry Run abgeschlossen. Bericht gespeichert unter ${reportPath}`);
  } else {
    console.log('\n🎉 Migration abgeschlossen!');
  }
}

migrate().catch(console.error);
