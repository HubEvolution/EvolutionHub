#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, extname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const cwd = resolve(process.env.DOCS_INVENTORY_ROOT ?? process.cwd());
const outputPath = resolve(cwd, process.env.DOCS_INVENTORY_OUTPUT ?? 'docs/meta/registry.json');
const schemaDefault = resolve(__dirname, '../docs/meta/schema.json');
const schemaPath = resolve(cwd, process.env.DOCS_INVENTORY_SCHEMA ?? schemaDefault);

const FORMAT_MAP = new Map([
  ['.md', 'markdown'],
  ['.mdx', 'mdx'],
  ['.adoc', 'asciidoc'],
  ['.txt', 'text']
]);

function toPosix(p) {
  return p.split('\\').join('/');
}

function parseFrontMatter(raw) {
  const lines = raw.split(/\r?\n/);
  if (lines[0]?.trim() !== '---') {
    return { data: {}, content: raw };
  }
  const dataLines = [];
  let i = 1;
  for (; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      i++;
      break;
    }
    dataLines.push(lines[i]);
  }
  const data = {};
  for (const line of dataLines) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    data[key] = value;
  }
  const content = lines.slice(i).join('\n');
  return { data, content };
}

function extractHeadings(body, ext) {
  const headings = [];
  const lines = body.split(/\r?\n/);
  const adoc = ext === '.adoc';
  for (const line of lines) {
    if (!line.trim()) continue;
    if (line.trim().startsWith('<!--')) continue;
    if (adoc) {
      const match = line.match(/^(={1,6})\s+(.+?)\s*$/);
      if (match) {
        headings.push({ level: match[1].length, value: match[2].trim() });
      }
    }
    const mdMatch = line.match(/^(#{1,6})\s+(.+?)\s*$/);
    if (mdMatch) {
      headings.push({ level: mdMatch[1].length, value: mdMatch[2].trim() });
    }
  }
  return headings;
}

function extractDescription(body) {
  const cleaned = body
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]+`/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[\r\n]+/g, '\n');
  for (const block of cleaned.split('\n\n')) {
    const text = block.trim();
    if (!text) continue;
    if (text.startsWith('#') || text.startsWith('=')) continue;
    return text.replace(/\s+/g, ' ').slice(0, 280);
  }
  return undefined;
}

async function readDocument(file) {
  const absolute = resolve(cwd, file);
  const raw = await fs.readFile(absolute);
  const stat = await fs.stat(absolute);
  const hash = createHash('sha256').update(raw).digest('hex');
  const ext = extname(file).toLowerCase();
  const format = FORMAT_MAP.get(ext);
  const parsed = parseFrontMatter(raw.toString('utf8'));
  const headings = extractHeadings(parsed.content, ext);
  const title = parsed.data?.title ?? headings[0]?.value ?? undefined;
  const description = parsed.data?.description ?? extractDescription(parsed.content);
  const frontMatter = parsed.data && Object.keys(parsed.data).length ? parsed.data : undefined;
  return {
    path: toPosix(file),
    title,
    description,
    format,
    hash,
    size: raw.length,
    headings,
    frontMatter,
    lastModified: stat.mtime.toISOString()
  };
}

const IGNORED_PATTERNS = [
  /^node_modules\//,
  /^\.git\//,
  /^\.turbo\//,
  /^\.next\//,
  /^dist\//,
  /^temp\//,
  /^\.types\//,
  /^docs\/reference\/ts\//,
  /^docs\/reference\/api\//
];

async function listFiles(dir = '.') {
  const entries = [];
  const queue = [dir];
  while (queue.length) {
    const current = queue.pop();
    const absolute = resolve(cwd, current);
    const dirents = await fs.readdir(absolute, { withFileTypes: true });
    for (const dirent of dirents) {
      const rel = current === '.' ? dirent.name : `${current}/${dirent.name}`;
      const normalized = toPosix(rel);
      if (IGNORED_PATTERNS.some((regex) => regex.test(`${normalized}/`))) {
        continue;
      }
      if (dirent.isDirectory()) {
        queue.push(rel);
        continue;
      }
      entries.push(normalized);
    }
  }
  return entries;
}

async function main() {
  const allFiles = await listFiles();
  const documents = [];
  for (const file of allFiles) {
    const format = FORMAT_MAP.get(extname(file).toLowerCase());
    if (!format) continue;
    const info = await readDocument(file);
    documents.push(info);
  }

  documents.sort((a, b) => a.path.localeCompare(b.path));

  const registry = {
    $schema: toPosix(relative(dirname(outputPath), schemaPath)) || './schema.json',
    generatedAt: new Date().toISOString(),
    generatedBy: 'scripts/doc-inventory.mjs',
    sourceRoot: cwd,
    documents
  };

  await fs.mkdir(dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(registry, null, 2));

  console.log(`Documentation registry generated for ${documents.length} files at ${toPosix(relative(cwd, outputPath))}`);
}

main().catch((error) => {
  console.error('[doc-inventory] Failed to generate registry');
  console.error(error);
  process.exitCode = 1;
});
