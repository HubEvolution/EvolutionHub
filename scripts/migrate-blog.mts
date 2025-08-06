// scripts/migrate-blog.ts
import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
// Angenommen, die Feldtypen sind in "../lib/blog.ts" definiert und exportiert.
// Falls nicht, müssten diese Typen hier explizit definiert werden.
// Wir gehen davon aus, dass Sie eine Typdefinition wie diese haben könnten:
// interface ContentfulBlogPostFields { /* ... Felder wie in blog-post-content-type.json */ }

// Beispiel-Typdefinition, die den Feldern in Contentful entsprechen sollte.
// Aktualisieren Sie dies, falls Ihre Struktur abweicht.
interface ContentfulBlogPostFields {
  title: string;
  slug: string;
  content: any; // Contentful RichText Dokumentstruktur
  author?: string | undefined;
  publishDate?: string | undefined; // ISO 8601 Datum
  tags?: string[] | undefined;
  category?: string | undefined;
  image?: { sys: { id: string } } | undefined; // Geht von einem Link zu einem Asset aus
  imageAlt?: string | undefined;
}

// Die ID des Content Types in Contentful, die der blog-post-content-type.json entspricht.
const CONTENTFUL_CONTENT_TYPE_ID = 'blogPost';

// Hilfsfunktion, um Frontmatter-Daten sicher zu parsen und für Contentful vorzubereiten.
function prepareFields(frontmatter: Record<string, any>, markdownContent: string): Partial<ContentfulBlogPostFields> {
  const fields: Partial<ContentfulBlogPostFields> = {};

  if (frontmatter.title) fields.title = frontmatter.title;
  if (frontmatter.slug) fields.slug = frontmatter.slug;
  // Datumsformatierung für Contentful
  if (frontmatter.publishDate) {
    try {
      const date = new Date(frontmatter.publishDate);
      if (!isNaN(date.getTime())) {
        fields.publishDate = date.toISOString();
      }
    } catch (e) {
      console.warn(`Fehler beim Parsen des Datums "${frontmatter.publishDate}":`, e);
    }
  }
  if (frontmatter.tags) fields.tags = frontmatter.tags;
  if (frontmatter.category) fields.category = frontmatter.category;

  // Die Konvertierung von Markdown zu Contentful RichText ist komplex und erfordert eine Bibliothek.
  // Für dieses Beispiel konvertieren wir einfachen Text. Bilder und Links müssten speziell behandelt werden.
  // Ein Beispiel für die Struktur eines RichText-Dokuments:
  fields.content = {
    nodeType: 'document',
    content: [
      {
        nodeType: 'paragraph',
        content: [
          {
            nodeType: 'text',
            value: markdownContent.trim(), // Der eigentliche Inhalt nach dem Frontmatter
            marks: [],
            data: {}
          }
        ],
        data: {},
      },
    ],
    data: {},
  };

  // Behandlung von Bildern: Dies ist der kniffligste Teil.
  // Sie müssen zuerst Bilder in Contentful hochladen und erhalten deren Asset ID.
  // Dann müssten Sie die Markdown-Datei parsen, um Bildverweise zu finden,
  // die entsprechenden Asset IDs zu ermitteln und sie hier hinzuzufügen.
  // Beispiel für ein Bildfeld (muss manuell ergänzt werden oder das Skript erweitern):
  // if (frontmatter.image) {
  //   fields.image = { sys: { type: 'Link', linkType: 'Asset', id: 'ASSET_ID_IM_CONTENTFUL' } };
  // }
  // if (frontmatter.imageAlt) fields.imageAlt = frontmatter.imageAlt;


  return fields;
}

async function migrateBlogPosts() {
  const migrationFileDir = path.resolve(__dirname); // Verzeichnis, in dem das Skript liegt
  const blogSourceDir = path.resolve(migrationFileDir, '../src/content/blog'); // Pfad zu Ihren Markdown-Posts
  const outputFilePath = path.resolve(migrationFileDir, 'contentful_migration.json'); // Ziel-JSON-Datei

  console.log(`Suche nach Markdown-Dateien in: ${blogSourceDir}`);

  try {
    const files = await fs.readdir(blogSourceDir);
    const blogPostsForImport: Array<{ sys: { contentType: { sys: { id: string } } }; fields: Partial<ContentfulBlogPostFields> }> = [];

    for (const file of files) {
      if (file.endsWith('.md')) {
        const filePath = path.join(blogSourceDir, file);
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const { data: frontmatter, content } = matter(fileContent);

        const preparedFields = prepareFields(frontmatter, content);

        // Struktur für Contentful CLI Import anpassen
        blogPostsForImport.push({
          sys: {
            contentType: {
              sys: {
                id: CONTENTFUL_CONTENT_TYPE_ID
              }
            }
          },
          fields: preparedFields
        });
      }
    }

    await fs.writeFile(outputFilePath, JSON.stringify(blogPostsForImport, null, 2), 'utf-8');
    console.log(`Erfolgreich ${blogPostsForImport.length} Posts für Contentful vorbereitet.`);
    console.log(`Die Migrationsdatei wurde unter ${outputFilePath} gespeichert.`);

  } catch (error: any) {
    console.error('Fehler während des Migrationsskripts:', error.message);
    if (error.code === 'ENOENT') {
      console.error(`Stellen Sie sicher, dass der Pfad zum Blog-Verzeichnis korrekt ist: ${blogSourceDir}`);
    }
  }
}

// Erstellen Sie das Verzeichnis 'scripts', falls es nicht existiert.
// Dies sollte automatisch geschehen, wenn Sie die Datei erstellen.
// Der Aufruf der Migrationsfunktion.
migrateBlogPosts();