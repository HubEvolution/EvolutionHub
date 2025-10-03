#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { globby } from 'globby';

const root = process.cwd();

const rulesGlobs = [
  {
    file: 'api-and-security.md',
    activation: 'always_on',
    priority: 'n/a',
    globs: [
      'src/pages/api/**',
      'src/pages/r2-ai/**',
      'src/lib/api-middleware.ts',
      'src/lib/rate-limiter.ts',
      'src/lib/security/csrf.ts',
      'src/middleware.ts',
    ],
  },
  {
    file: 'project-structure.md',
    activation: 'always_on',
    priority: 'n/a',
    globs: [
      'src/pages/api/**',
      'src/pages/r2/**',
      'src/pages/r2-ai/**',
      'src/content/**',
      'src/locales/**',
      'src/styles/**',
      'scripts/**',
      'migrations/**',
      'tests/playwright/**',
      'test-suite-v2/**',
      'src/**/*.{test,spec}.{ts,tsx}',
      'tests/unit/**',
      'tests/integration/**',
      'tests/integration/setup/**',
      'dist/**',
      'public/**',
    ],
  },
  {
    file: 'testing-and-ci.md',
    activation: 'always_on',
    priority: 'n/a',
    globs: [
      'src/**/*.{ts,tsx}',
      'tests/unit/**',
      'tests/integration/**',
      'playwright-report/**',
      'test-suite-v2/reports/playwright-html-report/**',
    ],
  },
  {
    file: 'tooling-and-style.md',
    activation: 'always_on',
    priority: 'n/a',
    globs: [
      'tsconfig.json',
      'eslint.config.js',
      '.prettierrc.json',
      'AGENTS.md',
      '.prettierignore',
      '.markdownlint.jsonc',
      '.lintstagedrc.json',
      'eslint.config.dev.js',
    ],
  },
];

function now() {
  return new Date().toISOString();
}

async function countForGlob(pattern) {
  const isSingleFile = !pattern.includes('*') && !pattern.includes('?') && !pattern.includes('[');
  if (isSingleFile) {
    const exists = fs.existsSync(path.join(root, pattern));
    return exists ? 1 : 0;
  }
  const matches = await globby(pattern, { cwd: root, dot: false, gitignore: true, onlyFiles: true, followSymbolicLinks: true });
  return matches.length;
}

async function buildCoverageRows() {
  const rows = [];
  for (const entry of rulesGlobs) {
    for (const g of entry.globs) {
      const count = await countForGlob(g);
      rows.push({ file: entry.file, activation: entry.activation, priority: entry.priority, glob: g, count });
    }
  }
  return rows;
}

function deriveScriptsFromGlobalRulesMd(content) {
  const scriptNames = [
    'dev:worker',
    'dev:worker:dev',
    'dev:e2e',
    'dev:astro',
    'build',
    'preview',
    'build:worker',
    'test',
    'test:unit',
    'test:integration',
    'test:coverage',
    'test:e2e',
    'test:e2e:chromium',
    'test:e2e:firefox',
    'test:e2e:webkit',
    'test:e2e:mobile',
    'format',
    'format:check',
    'lint',
    'lint:md',
    'lint:md:fix',
  ];
  // Docs generators are grouped under docs:* in the report
  return { scripts: scriptNames, wantsDocsWildcard: true };
}

async function buildScriptsTable() {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const globalRulesPath = path.join(root, '..', '..', '.codeium', 'windsurf', 'memories', 'global_rules.md');
  let globalRulesContent = '';
  try { globalRulesContent = fs.readFileSync(globalRulesPath, 'utf8'); } catch {}
  const { scripts, wantsDocsWildcard } = deriveScriptsFromGlobalRulesMd(globalRulesContent);
  const rows = [];
  for (const s of scripts) {
    rows.push({ name: s, exists: Boolean(pkg.scripts?.[s]) });
  }
  // docs:*
  const hasDocsAny = Object.keys(pkg.scripts || {}).some((k) => k.startsWith('docs:'));
  rows.push({ name: 'docs:*', exists: hasDocsAny });
  return rows;
}

async function main() {
  const rows = await buildCoverageRows();
  const scriptsRows = await buildScriptsTable();
  const outDir = path.join(root, 'docs', '_generated');
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, 'cascade-rules-coverage.md');

  const lines = [];
  lines.push(`# Cascade Rules Coverage — Stand: ${now()}`);
  lines.push('');
  lines.push('## Regeln: Scope-Globs, Treffer, Activation, Priority');
  lines.push('');
  lines.push('| Datei | Activation | Priority | Scope-Glob | Treffer |');
  lines.push('|---|---|---|---|---:|');
  for (const r of rows) {
    const mark = r.count === 0 ? ' (NO MATCH)' : '';
    lines.push(`| ${r.file} | ${r.activation} | ${r.priority} | \`${r.glob}\` | ${r.count}${mark} |`);
  }
  lines.push('');
  lines.push('Hinweis: Globs wurden aus den jeweiligen Regeltexten abgeleitet. 0-Treffer sind explizit markiert.');
  lines.push('');
  lines.push('## Script-Check gegenüber global_rules.md');
  lines.push('');
  lines.push('| Script (erwartet lt. global_rules.md) | In package.json |');
  lines.push('|---|---|');
  for (const s of scriptsRows) {
    lines.push(`| ${s.name} | ${s.exists ? 'ja' : 'nein'} |`);
  }
  lines.push('');
  lines.push('Quelle:');
  lines.push("- Regeln: `.windsurf/rules/*.md`");
  lines.push('- Skripte: `package.json`');
  lines.push('- Referenz: `global_rules.md`');
  lines.push('');

  fs.writeFileSync(outFile, lines.join('\n'), 'utf8');
  console.log(`wrote ${path.relative(root, outFile)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
