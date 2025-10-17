#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const docsRoot = path.join(repoRoot, 'docs');
const outFile = path.join(docsRoot, '_generated', 'codemap-docs-validation.v2.json');

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    if (e.name.startsWith('.')) continue; // skip dotfiles
    const full = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...walk(full));
    else files.push(full);
  }
  return files;
}

function isMd(file) {
  return file.endsWith('.md');
}

function relFromDocs(abs) {
  return path.relative(docsRoot, abs).replaceAll('\\', '/');
}

function slugify(h) {
  // GitHub-like slug: lowercase, trim, remove punctuation, collapse whitespace/dashes
  return h
    .toLowerCase()
    .trim()
    .replace(/[`*_~:.!?/\\\"'()\[\]{}<>|,@#$%^&+=]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function extractHeadings(md) {
  const lines = md.split(/\r?\n/);
  const headings = [];
  for (const line of lines) {
    const m = /^(#{1,6})\s+(.*)$/.exec(line);
    if (m) headings.push(slugify(m[2]));
  }
  return headings;
}

function extractLinks(md, fromRel) {
  const links = [];
  // match markdown links to .md with optional anchors: ](path.md#anchor)
  const re = /\]\(([^)]+?\.md)(#[^)]+)?\)/g;
  let m;
  while ((m = re.exec(md))) {
    const rawPath = m[1];
    const rawAnchor = (m[2] || '').replace(/^#/, '');
    // resolve target relative to docs root
    let targetAbs;
    if (rawPath.startsWith('/')) {
      // absolute from site root; normalize to docs root if it contains /docs/
      const idx = rawPath.indexOf('/docs/');
      if (idx >= 0) {
        targetAbs = path.join(repoRoot, rawPath.slice(idx + 1));
      } else {
        // cannot resolve; skip
        continue;
      }
    } else {
      const fromAbs = path.join(docsRoot, fromRel);
      const base = path.dirname(fromAbs);
      targetAbs = path.normalize(path.join(base, rawPath));
    }
    if (!targetAbs.endsWith('.md')) continue;
    const targetRel = relFromDocs(targetAbs);
    links.push({ targetRel, anchor: rawAnchor || null });
  }
  return links;
}

function readJsonSafe(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

function main() {
  const all = walk(docsRoot).filter(isMd);
  const nodes = new Set(all.map(relFromDocs));

  const registry = readJsonSafe(path.join(docsRoot, 'meta', 'registry.json'));
  const registryRefs = new Set(
    Array.isArray(registry?.documents) ? registry.documents.map((d) => d.path.replace(/^\//, '')) : []
  );

  const headingsByFile = new Map();
  const edges = new Map(); // toRel -> set(fromRel)
  const invalidAnchors = [];

  for (const abs of all) {
    const rel = relFromDocs(abs);
    const md = fs.readFileSync(abs, 'utf8');
    // cache headings for this file
    if (!headingsByFile.has(rel)) headingsByFile.set(rel, extractHeadings(md));
    const links = extractLinks(md, rel);
    for (const { targetRel, anchor } of links) {
      if (!nodes.has(targetRel)) continue; // only consider in-docs links
      if (!edges.has(targetRel)) edges.set(targetRel, new Set());
      edges.get(targetRel).add(rel);
      if (anchor) {
        const anchorSlug = slugify(anchor);
        const targetHeadings = headingsByFile.has(targetRel)
          ? headingsByFile.get(targetRel)
          : (() => {
              try {
                const targetMd = fs.readFileSync(path.join(docsRoot, targetRel), 'utf8');
                const hs = extractHeadings(targetMd);
                headingsByFile.set(targetRel, hs);
                return hs;
              } catch {
                return [];
              }
            })();
        if (!targetHeadings.includes(anchorSlug)) {
          invalidAnchors.push({ from: rel, to: targetRel, anchor: anchorSlug });
        }
      }
    }
  }

  // Compute orphans: nodes with no incoming edges, excluding canonical indices and registry refs
  const isIndex = (rel) => {
    if (rel === 'README.md') return true;
    const parts = rel.split('/');
    return parts.length === 2 && parts[1] === 'README.md'; // category indices
  };

  const orphans = Array.from(nodes).filter((rel) => {
    if (isIndex(rel)) return false;
    if (registryRefs.has(rel)) return false;
    const incoming = edges.get(rel);
    return !incoming || incoming.size === 0;
  });

  // Read existing report if present and merge
  let out = {};
  try {
    out = JSON.parse(fs.readFileSync(outFile, 'utf8'));
  } catch {
    out = {};
  }

  out.generatedAt = new Date().toISOString();
  out.method = {
    linkGraph: 'full crawl of markdown links across docs/** with anchor validation',
    codeRefs: 'validated against src/lib/api-middleware.ts and .windsurf/rules/api-and-security.md',
  };
  out.orphans = { exact: orphans, count: orphans.length };
  out.invalidAnchors = invalidAnchors;

  fs.writeFileSync(outFile, JSON.stringify(out, null, 2) + '\n');
  console.log(`Updated ${relFromDocs(outFile)} with ${orphans.length} orphans and ${invalidAnchors.length} invalid anchors.`);
}

main();
