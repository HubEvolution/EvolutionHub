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
const RUNBOOK_FIELDS = ['runbook', 'status'];
const ADR_FIELDS = ['status', 'date'];

const scaffoldMode = process.argv.includes('--scaffold');

const FRONTMATTER_TEMPLATES = {
  default: {
    description: 'TODO: Kurzbeschreibung',
    owner: 'TODO: Team/Owner',
    priority: 'medium',
    lastSync: new Date().toISOString().slice(0, 10),
    codeRefs: 'TODO: relevante Dateien',
    testRefs: 'N/A',
  },
  feature: {
    feature: 'TODO: feature-key',
    status: 'draft',
  },
  runbook: {
    runbook: 'TODO: runbook-key',
    status: 'maintained',
  },
  adr: {
    status: 'accepted',
    date: new Date().toISOString().slice(0, 10),
  },
};

function getTemplateKeys(relativePath) {
  const keys = ['default'];
  if (/^docs\/features\/.+\.md$/i.test(relativePath) && !/README\.md$/i.test(relativePath)) {
    keys.push('feature');
  }
  if (/^docs\/runbooks\/.+\.md$/i.test(relativePath)) {
    keys.push('runbook');
  }
  if (/^docs\/architecture\/adrs\/.+\.md$/i.test(relativePath)) {
    keys.push('adr');
  }
  return [...new Set(keys)];
}

function toRelative(file) {
  return path.relative(PROJECT_ROOT, file).replace(/\\/g, '/');
}

function collectIssues({ data }, expectedFields) {
  return expectedFields.filter((field) => !(field in data));
}

async function scaffoldFrontmatter(file, existingData, templateKeys) {
  const content = await fs.readFile(file, 'utf8');
  const { content: body } = matter(content);
  const template = templateKeys.reduce((acc, key) => ({ ...acc, ...FRONTMATTER_TEMPLATES[key] }), {});
  const merged = { ...FRONTMATTER_TEMPLATES.default, ...template, ...existingData };
  const newContent = matter.stringify(body.trimStart(), merged);
  await fs.writeFile(file, `${newContent.trim()}\n`);
}

async function validateFile(file) {
  const content = await fs.readFile(file, 'utf8');
  const relativePath = toRelative(file);
  const { data } = matter(content);
  const issues = [];
  const templateKeys = getTemplateKeys(relativePath);

  if (!data || Object.keys(data).length === 0) {
    if (scaffoldMode) {
      await scaffoldFrontmatter(file, {}, templateKeys);
      return { relativePath, issues: [`Frontmatter automatisch ergänzt (${templateKeys.join('+')})`] };
    }
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
      if (scaffoldMode) {
        await scaffoldFrontmatter(file, data, templateKeys);
        return { relativePath, issues: [`Feature-Frontmatter ergänzt: ${missing.join(', ')}`] };
      }
      issues.push(`Feature-Frontmatter unvollständig: ${missing.join(', ')}`);
    }
  }

  // Runbook-Dokumente (docs/runbooks/*.md)
  if (/^docs\/runbooks\/.+\.md$/i.test(relativePath)) {
    const missing = collectIssues({ data }, RUNBOOK_FIELDS);
    if (missing.length) {
      if (scaffoldMode) {
        await scaffoldFrontmatter(file, data, templateKeys);
        return { relativePath, issues: [`Runbook-Frontmatter ergänzt: ${missing.join(', ')}`] };
      }
      issues.push(`Runbook-Frontmatter unvollständig: ${missing.join(', ')}`);
    }
  }

  // ADR-Dokumente (docs/architecture/adrs/*.md)
  if (/^docs\/architecture\/adrs\/.+\.md$/i.test(relativePath)) {
    const missing = collectIssues({ data }, ADR_FIELDS);
    if (missing.length) {
      if (scaffoldMode) {
        await scaffoldFrontmatter(file, data, templateKeys);
        return { relativePath, issues: [`ADR-Frontmatter ergänzt: ${missing.join(', ')}`] };
      }
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
