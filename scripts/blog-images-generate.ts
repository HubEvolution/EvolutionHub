#!/usr/bin/env tsx
import { globby } from 'globby';
import fs from 'node:fs';
import path from 'node:path';

async function ensureDir(p: string) {
  await fs.promises.mkdir(p, { recursive: true });
}

async function download(url: string, dest: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.promises.writeFile(dest, buf);
}

async function main() {
  const blogDir = path.join(process.cwd(), 'src/content/blog');
  const imageDir = path.join(blogDir, 'images');
  const ogDir = path.join(process.cwd(), 'public/images/blog');
  await ensureDir(imageDir);
  await ensureDir(ogDir);

  const files = await globby(['src/content/blog/*.md']);
  let created = 0;
  for (const file of files) {
    const slug = path.basename(file, path.extname(file));
    const out = path.join(imageDir, `${slug}.webp`);
    if (fs.existsSync(out)) continue;
    const url = `https://placehold.co/1200x675/webp?text=${encodeURIComponent(slug)}`;
    await download(url, out);
    created++;
    console.log(`created: ${path.relative(process.cwd(), out)}`);
  }

  // default OG fallback
  const fallbackOg = path.join(ogDir, 'default-og.jpg');
  if (!fs.existsSync(fallbackOg)) {
    await download(
      `https://placehold.co/1200x675/jpg?text=${encodeURIComponent('EvolutionHub Blog')}`,
      fallbackOg
    );
    console.log(`created: ${path.relative(process.cwd(), fallbackOg)}`);
  }

  console.log(`done. images created: ${created}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
