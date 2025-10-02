#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';
const cwd = process.cwd();

function isExternal(link) {
  return /^(https?:)?\/\//i.test(link) || link.startsWith('mailto:') || link.startsWith('tel:');
}

function isAnchor(link) {
  return link.startsWith('#');
}

function isAbsoluteRoute(link) {
  return link.startsWith('/');
}

function normalizeTarget(link) {
  const hashIndex = link.indexOf('#');
  return hashIndex === -1 ? link : link.slice(0, hashIndex);
}

async function validateFileLink(baseFile, target) {
  if (!target) return true;
  const normalized = normalizeTarget(target);
  if (!normalized) return true;
  const ext = extname(normalized).toLowerCase();
  if (ext && !['.md', '.mdx', '.adoc', '.txt'].includes(ext)) return true;
  const abs = resolve(dirname(baseFile), normalized);
  try {
    const stat = await fs.stat(abs);
    return stat.isFile() || stat.isDirectory();
  } catch {
    return false;
  }
}

async function collectMarkdownFiles(dir = 'docs') {
  const results = [];
  const queue = [dir];
  while (queue.length) {
    const current = queue.pop();
    const abs = resolve(cwd, current);
    let dirents;
    try {
      dirents = await fs.readdir(abs, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const dirent of dirents) {
      const rel = current === '.' ? dirent.name : `${current}/${dirent.name}`;
      if (dirent.isDirectory()) {
        queue.push(rel);
      } else if (rel.endsWith('.md')) {
        results.push(rel);
      }
    }
  }
  return results;
}

async function main() {
  const files = await collectMarkdownFiles();
  const problems = [];
  for (const file of files) {
    const abs = resolve(cwd, file);
    const content = await fs.readFile(abs, 'utf8');
    const regex = /!?\[[^\]]*\]\(([^)]+)\)/g;
    let match;
    while ((match = regex.exec(content))) {
      const link = match[1].trim();
      if (!link || isExternal(link) || isAnchor(link) || isAbsoluteRoute(link)) continue;
      if (link.startsWith('data:')) continue;
      if (link.includes(':')) continue;
      const ok = await validateFileLink(abs, link);
      if (!ok) {
        problems.push({ file, link });
      }
    }
  }

  if (problems.length) {
    console.warn('[doc-links] Broken relative documentation links detected:');
    for (const problem of problems) {
      console.warn(` - ${problem.file} -> ${problem.link}`);
    }
    const strict = (process.env.DOC_LINKS_STRICT ?? '').toLowerCase();
    if (strict === '1' || strict === 'true') {
      process.exitCode = 1;
    }
    return;
  }

  console.log('[doc-links] All relative documentation links resolved successfully.');
}

main().catch((error) => {
  console.error('[doc-links] Link validation failed');
  console.error(error);
  process.exitCode = 1;
});
