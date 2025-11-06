#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promises as fs } from 'node:fs';
import { globby } from 'globby';
import matter from 'gray-matter';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');

const REQUIRED_COMMON_FIELDS = ['description', 'owner', 'priority', 'lastSync'];
const CATEGORY_EXTRA_FIELDS = ['codeRefs'];
const FEATURE_FIELDS = ['feature', 'status'];
const ADR_FIELDS = ['status', 'date'];

function toRelative(file) {
  return path.relative(PROJECT_ROOT, file).replace(/\\/g, '/');
}

function collectIssues({ data }, expectedFields) {
  return expectedFields.filter((field) => !(field in data));
}

async function validateFile(file) {
  const content = await fs.readFile(file, 'utf8');
  const relativePath = toRelative(file);
  const { data } = matter(content);
  const issues = [];

  if (!data || Object.keys(data).length === 0) {
    return { relativePath, issues: ['fehlende Frontmatter'] };
  }

  // Kategorie-README (docs/**/README.md)
  if (/^docs\/.*\/README\.md$/i.test(relativePath)) {
    const missing = [
      ...collectIssues({ data }, REQUIRED_COMMON_FIELDS),
      ...collectIssues({ data }, CATEGORY_EXTRA_FIELDS),
    ];
    if (missing.length) {
      issues.push(`Pflichtfelder fehlen: ${missing.join(', ')}`);
    }
  }

  // Feature-Dokumente (docs/features/**/*.md, außer README)
  if (/^docs\/features\/.+\.md$/i.test(relativePath) && !/README\.md$/i.test(relativePath)) {
    const missing = collectIssues({ data }, FEATURE_FIELDS);
    if (missing.length) {
      issues.push(`Feature-Frontmatter unvollständig: ${missing.join(', ')}`);
    }
  }

  // ADR-Dokumente (docs/architecture/adrs/*.md)
  if (/^docs\/architecture\/adrs\/.+\.md$/i.test(relativePath)) {
    const missing = collectIssues({ data }, ADR_FIELDS);
    if (missing.length) {
      issues.push(`ADR-Frontmatter unvollständig: ${missing.join(', ')}`);
    }
  }

  return { relativePath, issues };
}

async function main() {
  const files = await globby('docs/**/*.md', {
    cwd: PROJECT_ROOT,
    absolute: true,
    gitignore: true,
  });

  const results = await Promise.all(files.map(validateFile));
  const failures = results.filter(({ issues }) => issues.length > 0);

  if (failures.length) {
    console.error('Frontmatter-Validierung fehlgeschlagen:');
    for (const { relativePath, issues } of failures) {
      console.error(`- ${relativePath}`);
      for (const issue of issues) {
        console.error(`  • ${issue}`);
      }
    }
    process.exitCode = 1;
    return;
  }

  console.log(
    '[validate-frontmatter] Alle geprüften Dokumente erfüllen die Frontmatter-Anforderungen.'
  );
}

main().catch((error) => {
  console.error('[validate-frontmatter] Unerwarteter Fehler');
  console.error(error);
  process.exitCode = 1;
});
