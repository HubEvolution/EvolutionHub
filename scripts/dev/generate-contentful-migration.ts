import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import { richTextFromMarkdown } from '@contentful/rich-text-from-markdown';
import { fileURLToPath } from 'url';

interface ContentfulEntry {
  sys: {
    contentType: {
      sys: { id: string };
    };
  };
  fields: Record<string, unknown>;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONTENT_DIR = path.resolve(__dirname, '../..', 'src/content/blog');
const OUTPUT_PATH = path.resolve(__dirname, '../contentful_migration.json');

const ASSET_MAP: Record<string, string> = {
  'ki-als-kollege-hero.png': '5tWasCMSp8J3C19dmrEj9N',
  'digital-detox-kreativitaet.webp': '41aqtcQj3Z9toLwiPu9zCr',
  'gig-economy-chancen-risiken.webp': '3gK1przvC0b1dX80ItB1ro',
  'imposter-syndrom-ueberwinden.webp': '6LK05lenilC7jLCYE7eo1Q',
  'ki-im-alltag.webp': '4zGSqkgiCa3qlfvtIUm7SE',
  'konstruktives-feedback-geben.webp': '50KfFYjHiRF0g4CyDNoWDF',
  'lebenslanges-lernen-karriere.webp': '6pD0EsB8vFTv1o0OoWj4z0',
  'mentoring-2-0.webp': '7zvPGYJafWGpi5b9FgNGwg',
  'new-work-ist-eine-haltung.webp': '58bMvEX1iUNV2TDZYZ5ZVk',
  'pomodoro-technik-home-office.webp': 'RAMS8Md92YgsV57yd9JqU',
  'vom-ziel-zur-gewohnheit.webp': '76fHW1v0FvM7jc3nd9fixw',
  'wissensmanagement-second-brain.webp': '5eXtDhEzMHNV84bVYZ8kHS',
  'zukunft-der-fuehrung.webp': '4fzrzvjL4KGHljc2oBd08',
};

const wrap = <T>(value: T) => ({ 'en-US': value });

function slugify(raw: string): string {
  return raw
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .trim();
}

async function toRichText(markdown: string) {
  try {
    const doc = await richTextFromMarkdown(markdown);
    return { 'en-US': doc };
  } catch (error) {
    console.warn(
      'Falling back to plain paragraph for markdown snippet due to conversion error:',
      error
    );
    return {
      'en-US': {
        nodeType: 'document',
        data: {},
        content: [
          {
            nodeType: 'paragraph',
            data: {},
            content: [
              {
                nodeType: 'text',
                value: markdown.trim(),
                marks: [],
                data: {},
              },
            ],
          },
        ],
      },
    };
  }
}

async function generate(): Promise<void> {
  const files = await fs.readdir(CONTENT_DIR);
  const entries: ContentfulEntry[] = [];

  for (const file of files) {
    if (!file.endsWith('.md') && !file.endsWith('.mdx')) continue;

    const filePath = path.join(CONTENT_DIR, file);
    const raw = await fs.readFile(filePath, 'utf-8');
    const { data: frontmatter, content } = matter(raw);

    const slugSource: string =
      typeof frontmatter.slug === 'string' && frontmatter.slug.length > 0
        ? frontmatter.slug
        : path.parse(file).name;
    const slug = slugify(slugSource) || slugify(path.parse(file).name) || path.parse(file).name;

    const publishDate = frontmatter.pubDate ?? frontmatter.publishDate;
    const author = frontmatter.author ?? 'EvolutionHub Team';
    const category = frontmatter.category;
    const tags = Array.isArray(frontmatter.tags)
      ? frontmatter.tags
      : typeof frontmatter.tags === 'string'
        ? frontmatter.tags
            .split(',')
            .map((tag: string) => tag.trim())
            .filter(Boolean)
        : undefined;

    const imagePath: string | undefined =
      typeof frontmatter.image === 'string' ? frontmatter.image : undefined;
    const imageFile = imagePath ? path.basename(imagePath).replace(/^\.\//, '') : undefined;
    const assetId = imageFile ? ASSET_MAP[imageFile] : undefined;

    const fields: Record<string, unknown> = {};

    fields.title = wrap(frontmatter.title ?? slug);
    fields.slug = wrap(slug);

    if (publishDate) {
      fields.publishDate = wrap(new Date(publishDate).toISOString());
    } else {
      console.warn(`Warnung: ${slug} enthält kein publishDate/pubDate.`);
    }

    if (author) {
      fields.author = wrap(author);
    }

    if (category) {
      fields.category = wrap(category);
    }

    if (tags && tags.length > 0) {
      fields.tags = wrap(tags);
    }

    if (assetId) {
      fields.image = {
        'en-US': {
          sys: {
            type: 'Link',
            linkType: 'Asset',
            id: assetId,
          },
        },
      };
    }

    if (frontmatter.imageAlt) {
      fields.imageAlt = wrap(frontmatter.imageAlt);
    }

    fields.content = await toRichText(content);

    entries.push({
      sys: {
        contentType: {
          sys: {
            id: 'blogPost',
          },
        },
      },
      fields,
    });
  }

  const output = {
    entries,
    assets: [],
    contentTypes: [],
    editorInterfaces: [],
    tags: [],
    webhooks: [],
    locales: [],
  };

  await fs.writeFile(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`Migration-Datei erstellt: ${OUTPUT_PATH}`);
}

generate().catch((error) => {
  console.error('Fehler beim Erstellen der Migration:', error);
  process.exit(1);
});
