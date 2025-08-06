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

// --- Konfiguration ---
const SPACE_ID = process.env.CONTENTFUL_SPACE_ID;
const MANAGEMENT_TOKEN = process.env.CONTENTFUL_MANAGEMENT_TOKEN;
const ENVIRONMENT = process.env.CONTENTFUL_ENVIRONMENT || 'master';
const CONTENT_TYPE_ID = 'blogPost'; // Die API-ID deines Content Models aus der JSON
const BLOG_FILES_PATH = 'src/content/blog';
// Der Basispfad, von dem aus die Bildpfade in deinem Frontmatter relativ sind.
// Da deine Pfade wie '/src/content/blog/images/...' aussehen, ist das Projekt-Root richtig.
const IMAGE_BASE_PATH = process.cwd(); 

if (!SPACE_ID || !MANAGEMENT_TOKEN) {
  console.error('Bitte setze CONTENTFUL_SPACE_ID und CONTENTFUL_MANAGEMENT_TOKEN in deiner .env Datei.');
  process.exit(1);
}

const client = createClient({
  accessToken: MANAGEMENT_TOKEN,
});

async function uploadAsset(space, environment, imagePath, imageAlt) {
  console.log(`🖼️  Lade Bild hoch: ${imagePath}`);
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
  const space = await client.getSpace(SPACE_ID);
  const environment = await space.getEnvironment(ENVIRONMENT);

  // Alle Markdown-Dateien im Blog-Verzeichnis finden
  const files = await globby([`${BLOG_FILES_PATH}/**/*.md`]);
  console.log(`📁 Gefundene Dateien:`, files);
  console.log(`📄 ${files.length} Markdown-Dateien gefunden.`);

  for (const file of files) {
    console.log(`\n--- Verarbeite:  ---`);
    const fileContent = await fs.readFile(file, 'utf-8');
    const { data, content } = matter(fileContent);

    // 1. Bild hochladen (angepasst an deine Struktur)
    let assetLink = null;
    if (data.image && data.image.src) {
      const asset = await uploadAsset(space, environment, data.image.src, data.imageAlt);
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
      const entry = await environment.createEntry(CONTENT_TYPE_ID, {
        fields: {
          title: { 'de-DE': data.title },
          slug: { 'de-DE': path.basename(file, '.md') }, // Nutzt den Dateinamen als Slug
          // 'description' ist kein Feld in deinem Content Model, aber 'content' ist es.
          // Wir mappen den Markdown-Body auf das 'content'-Feld.
          content: { 'de-DE': richTextBody },
          publishDate: { 'de-DE': data.pubDate },
          author: { 'de-DE': data.author },
          category: { 'de-DE': data.category },
          tags: { 'de-DE': data.tags },
          image: { 'de-DE': assetLink },
          imageAlt: { 'de-DE': data.imageAlt },
        },
      });

      await entry.publish();
      console.log(`✅ Eintrag erfolgreich erstellt und veröffentlicht: ${entry.sys.id}`);
    } catch (error) {
      console.error(`Fehler beim Erstellen des Eintrags für :`, error.message);
      // Logge mehr Details bei Validierungsfehlern
      if (error.response && error.response.data && error.response.data.details) {
        console.error('Details:', JSON.stringify(error.response.data.details, null, 2));
      }
    }
  }

  console.log('\n🎉 Migration abgeschlossen!');
}

migrate().catch(console.error);
