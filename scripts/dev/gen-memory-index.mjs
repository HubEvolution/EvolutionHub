#!/usr/bin/env node
/**
 * Generate docs/_generated/memory-index.md
 *
 * Aggregates canonical rules and related docs into a single navigable index.
 * - Reads .windsurf/rules/*.md (priority from YAML front matter if present)
 * - Lists related docs from docs/architecture/ and docs/development/
 * - Emits a markdown file with quick links
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..', '..');

const RULES_DIR = path.join(ROOT, '.windsurf', 'rules');
const DOCS_DIR = path.join(ROOT, 'docs');
const OUT_DIR = path.join(DOCS_DIR, '_generated');
const OUT_FILE = path.join(OUT_DIR, 'memory-index.md');

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function readFrontMatter(src) {
  // Very small parser for leading YAML front matter
  const m = src.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { data: {}, content: src };
  try {
    const data = yaml.parse(m[1] || '') || {};
    const content = src.slice(m[0].length);
    return { data, content };
  } catch {
    return { data: {}, content: src };
  }
}

function listFiles(dir, filterFn) {
  try {
    const names = fs.readdirSync(dir);
    return names
      .map((n) => path.join(dir, n))
      .filter((p) => fs.statSync(p).isFile())
      .filter((p) => (filterFn ? filterFn(p) : true));
  } catch {
    return [];
  }
}

function rel(p) {
  return path.relative(ROOT, p).replace(/\\/g, '/');
}

function readTitle(md) {
  const lines = md.split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/^#\s+(.+)/);
    if (m) return m[1].trim();
  }
  return '';
}

function buildRulesIndex() {
  const files = listFiles(RULES_DIR, (p) => p.endsWith('.md'));
  const entries = files.map((fp) => {
    const src = fs.readFileSync(fp, 'utf-8');
    const { data, content } = readFrontMatter(src);
    const title = readTitle(content) || path.basename(fp);
    const priority = typeof data?.priority === 'number' ? data.priority : null;
    const stat = fs.statSync(fp);
    return {
      path: rel(fp),
      title,
      priority,
      mtime: stat.mtimeMs,
    };
  });
  entries.sort((a, b) => (b.priority ?? -1) - (a.priority ?? -1) || a.title.localeCompare(b.title));
  return entries;
}

function listDocsSubdir(sub) {
  const dir = path.join(DOCS_DIR, sub);
  const files = listFiles(dir, (p) => p.endsWith('.md'));
  return files.map((fp) => ({ path: rel(fp), title: path.basename(fp, '.md') }));
}

function generateMarkdown({ rules, archDocs, devDocs }) {
  const now = new Date().toISOString();
  const lines = [];
  lines.push('<!-- Generated: scripts/dev/gen-memory-index.mjs -->');
  lines.push(`# Memory Index`);
  lines.push('');
  lines.push(`Generated on ${now}. This index links canonical rules and related docs.`);
  lines.push('');

  lines.push('## Canonical Rules (.windsurf/rules/)');
  lines.push('');
  if (rules.length === 0) {
    lines.push('- No rules found.');
  } else {
    for (const r of rules) {
      const pStr = r.priority != null ? ` [priority: ${r.priority}]` : '';
      lines.push(`- **${r.title}**${pStr} — \
  ${r.path}`);
    }
  }
  lines.push('');

  lines.push('## Related Architecture Docs (docs/architecture/)');
  lines.push('');
  if (archDocs.length === 0) lines.push('- None');
  else
    for (const d of archDocs)
      lines.push(`- **${d.title}** — \
  ${d.path}`);
  lines.push('');

  lines.push('## Related Development Docs (docs/development/)');
  lines.push('');
  if (devDocs.length === 0) lines.push('- None');
  else
    for (const d of devDocs)
      lines.push(`- **${d.title}** — \
  ${d.path}`);
  lines.push('');

  lines.push('## How to regenerate');
  lines.push('');
  lines.push('```sh');
  lines.push('npm run mem:index');
  lines.push('```');
  lines.push('');

  return lines.join('\n');
}

async function main() {
  ensureDir(OUT_DIR);
  const rules = buildRulesIndex();
  const archDocs = listDocsSubdir('architecture');
  const devDocs = listDocsSubdir('development');
  const md = generateMarkdown({ rules, archDocs, devDocs });
  fs.writeFileSync(OUT_FILE, md);
  console.log(
    `✓ Wrote ${rel(OUT_FILE)} (${rules.length} rules, ${archDocs.length} arch docs, ${devDocs.length} dev docs)`
  );
}

main().catch((err) => {
  console.error('Failed to generate memory index:', err);
  process.exit(1);
});
