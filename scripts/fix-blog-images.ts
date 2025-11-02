import fs from 'node:fs';
import path from 'node:path';

const BLOG_DIR = path.resolve('src/content/blog');
const IMAGES_DIR = path.join(BLOG_DIR, 'images');

function listImages(): string[] {
  try {
    return fs.readdirSync(IMAGES_DIR).filter((f) => fs.statSync(path.join(IMAGES_DIR, f)).isFile());
  } catch {
    return [];
  }
}

function pickCandidate(slug: string, images: string[]): string | null {
  const prefer = [`${slug}.webp`, `${slug}.png`];
  for (const p of prefer) if (images.includes(p)) return p;
  const webpVar = images.find((f) => f.startsWith(`${slug}-`) && f.endsWith('.webp'));
  if (webpVar) return webpVar;
  const pngVar = images.find((f) => f.startsWith(`${slug}-`) && f.endsWith('.png'));
  if (pngVar) return pngVar;
  return null;
}

function processFile(filePath: string, images: string[]) {
  const base = path.basename(filePath);
  if (base.endsWith('.md.tmpl'))
    return { file: base, action: 'skipped', reason: 'template' } as const;
  const slug = base.replace(/\.(md|mdx)$/i, '');
  const content = fs.readFileSync(filePath, 'utf8');
  const m = content.match(/^---[\s\S]*?---/);
  if (!m) return { file: base, action: 'skipped', reason: 'no_frontmatter' } as const;
  const fm = m[0];
  const lines = fm.split(/\r?\n/);
  const imgIdx = lines.findIndex((l) => /^image\s*:\s*/.test(l));
  if (imgIdx === -1) return { file: base, action: 'skipped', reason: 'no_image_field' } as const;
  const oldLine = lines[imgIdx];
  const oldPathMatch = oldLine.match(/image\s*:\s*(.+)$/);
  const oldVal = oldPathMatch ? oldPathMatch[1].trim() : '';
  const candidate = pickCandidate(slug, images);
  if (!candidate) return { file: base, action: 'skipped', reason: 'no_candidate' } as const;
  const newVal = `./images/${candidate}`;
  if (oldVal === newVal) return { file: base, action: 'unchanged', image: newVal } as const;
  lines[imgIdx] = `image: ${newVal}`;
  const newFm = lines.join('\n');
  const newContent = content.replace(fm, newFm);
  fs.writeFileSync(filePath, newContent, 'utf8');
  return { file: base, action: 'updated', oldImage: oldVal, newImage: newVal } as const;
}

function main() {
  const images = listImages();
  const files = fs
    .readdirSync(BLOG_DIR)
    .filter(
      (f) => /\.(md|mdx)$/i.test(f) && !f.endsWith('.md.tmpl') && f !== 'KI-als-Kollege.md.bak'
    )
    .map((f) => path.join(BLOG_DIR, f));
  const results = files.map((fp) => processFile(fp, images));
  const summary = {
    total: results.length,
    updated: results.filter((r) => r.action === 'updated').length,
    unchanged: results.filter((r) => r.action === 'unchanged').length,
    skipped: results.filter((r) => r.action === 'skipped').length,
  };
  console.log('Blog Image Fix Report');
  console.log('======================');
  console.log(JSON.stringify({ summary, results }, null, 2));
}

main();
