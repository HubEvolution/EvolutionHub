#!/usr/bin/env tsx
import { globby } from 'globby';
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

type ImageMeta = { src?: string; width?: number; height?: number } | undefined;

type ReportItem = {
  file: string;
  slug: string;
  image?: ImageMeta;
  imageExists: boolean;
  missingMeta: string[];
  suggestedImagePath?: string;
};

function toSlug(fp: string): string {
  const base = path.basename(fp, path.extname(fp));
  return base;
}

async function main() {
  const allowMissing = process.argv.includes('--allow-missing');

  const mdFiles = await globby(['src/content/blog/**/*.md']);
  const reports: ReportItem[] = [];

  for (const fp of mdFiles) {
    const raw = fs.readFileSync(fp, 'utf8');
    const fm = matter(raw);
    const data: any = fm.data || {};
    const image: ImageMeta = data.image;
    const slug = data.slug || data.title ? toSlug(fp) : toSlug(fp);

    let imageExists = false;
    let suggestedImagePath: string | undefined;
    const missingMeta: string[] = [];

    if (image && typeof image === 'object') {
      if ('src' in image && typeof image.src === 'string') {
        const rel = image.src.startsWith('/') ? image.src.slice(1) : image.src;
        const abs = path.join(process.cwd(), rel);
        imageExists = fs.existsSync(abs);
        suggestedImagePath = image.src;
      } else {
        missingMeta.push('image.src');
        suggestedImagePath = `/src/content/blog/images/${slug}.webp`;
      }
      if (!('width' in (image as any))) missingMeta.push('image.width');
      if (!('height' in (image as any))) missingMeta.push('image.height');
    } else {
      // No image at all
      suggestedImagePath = `/src/content/blog/images/${slug}.webp`;
    }

    reports.push({ file: fp, slug, image, imageExists, missingMeta, suggestedImagePath });
  }

  // Check default OG fallback existence
  const fallbackOg = path.join(process.cwd(), 'public/images/blog/default-og.jpg');
  const hasFallbackOg = fs.existsSync(fallbackOg);

  const missing = reports.filter((r) => !r.image || !r.imageExists || r.missingMeta.length > 0);

  const summary = {
    totalPosts: reports.length,
    issues: missing.length,
    missingOgFallback: !hasFallbackOg,
  };

  console.log('\nBlog Image Audit Report');
  console.log('=======================');
  console.log(JSON.stringify(summary, null, 2));
  console.log('\nDetails:');
  for (const r of missing) {
    console.log(
      JSON.stringify(
        {
          file: r.file,
          slug: r.slug,
          hasImage: !!r.image,
          imageSrc: r.image && (r.image as any).src,
          imageExists: r.imageExists,
          missingMeta: r.missingMeta,
          suggestedImagePath: r.suggestedImagePath,
        },
        null,
        2
      )
    );
  }

  if (!allowMissing && (missing.length > 0 || !hasFallbackOg)) {
    console.error(
      '\nFound missing images or metadata. Add images and width/height to frontmatter.'
    );
    if (!hasFallbackOg) {
      console.error('Missing fallback OG image at public/images/blog/default-og.jpg');
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
