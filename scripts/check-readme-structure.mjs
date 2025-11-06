#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { globby } from 'globby';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');

const REQUIRED_HEADINGS = [
  '## Primärdokumente',
  '## Cross-Referenzen',
  '## Ownership & Maintenance',
  '## Standards & Konventionen',
];

async function validateReadme(file) {
  const content = await fs.readFile(file, 'utf8');
  const relativePath = path.relative(PROJECT_ROOT, file).replace(/\\/g, '/');

  const missing = REQUIRED_HEADINGS.filter((heading) => !content.includes(heading));
  const scopePresent = /\*\*Scope\*\*/.test(content);

  const issues = [];
  if (!scopePresent) {
    issues.push('fehlender **Scope**-Abschnitt (erwartet `**Scope** — ...`)');
  }
  if (missing.length) {
    issues.push(`fehlende Überschriften: ${missing.join(', ')}`);
  }

  return { relativePath, issues };
}

async function main() {
  const files = await globby('docs/**/README.md', {
    cwd: PROJECT_ROOT,
    absolute: true,
    gitignore: true,
  });

  if (!files.length) {
    console.log('[check-readme-structure] Keine README.md Dateien gefunden.');
    return;
  }

  const results = await Promise.all(files.map(validateReadme));
  const failures = results.filter(({ issues }) => issues.length > 0);

  if (failures.length) {
    console.error('README-Strukturprüfung fehlgeschlagen:');
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
    '[check-readme-structure] Alle README.md Dateien enthalten die erforderlichen Abschnitte.'
  );
}

main().catch((error) => {
  console.error('[check-readme-structure] Unerwarteter Fehler');
  console.error(error);
  process.exitCode = 1;
});
