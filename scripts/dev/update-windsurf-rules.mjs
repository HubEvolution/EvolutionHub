#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const rulesDir = path.join(root, '.windsurf', 'rules');

const priorities = new Map([
  ['api-and-security.md', 100],
  ['project-structure.md', 90],
  ['tooling-and-style.md', 80],
  ['testing-and-ci.md', 70],
]);

function updateFrontMatter(content, priority) {
  if (!content.startsWith('---')) return content;
  const end = content.indexOf('\n---', 3);
  if (end === -1) return content;
  const header = content.slice(0, end + 4); // include closing ---\n
  const rest = content.slice(end + 4);
  const lines = header.split(/\r?\n/);
  let hasPriority = false;
  let inserted = false;
  const newHeaderLines = lines.map((line) => {
    if (line.startsWith('priority:')) {
      hasPriority = true;
      return `priority: ${priority}`;
    }
    return line;
  });
  if (!hasPriority) {
    const idx = newHeaderLines.findIndex((l) => l.trim().toLowerCase().startsWith('trigger:'));
    if (idx !== -1) {
      newHeaderLines.splice(idx + 1, 0, `priority: ${priority}`);
      inserted = true;
    }
  }
  const newHeader = inserted || hasPriority ? newHeaderLines.join('\n') : lines.join('\n').replace('---\n', `---\npriority: ${priority}\n`);
  return newHeader + rest;
}

function updateProjectStructure(content) {
  let updated = content;
  // Add r2-ai alongside r2
  updated = updated.replace(
    /`src\/pages\/r2\/\*\*` and must stay ungated/,
    '`src/pages/r2/**` and `src/pages/r2-ai/**` and must stay ungated'
  );
  // Replace legacy tests/e2e with tests/playwright
  updated = updated.replace(
    /Keep Playwright suites in both legacy `tests\/e2e` and `test-suite-v2`/,
    'Keep Playwright suites in `tests/playwright` and `test-suite-v2`'
  );
  // Add setup dir note for integration tests
  updated = updated.replace(
    /Vitest specs sit beside sources \(`src\/\*\*\/*\{test,spec\}\`\) and under `tests\/unit`, `tests\/integration` \(`vitest\.config\.ts`\)\./,
    'Vitest specs sit beside sources (`src/**/*.{test,spec}`) and under `tests/unit`, `tests/integration` (`vitest.config.ts`) with setup under `tests/integration/setup/`.'
  );
  return updated;
}

function updateTestingAndCI(content) {
  let updated = content;
  // Extend report location
  updated = updated.replace(
    /stores HTML report in `playwright-report`/,
    'stores HTML report in `playwright-report` or `test-suite-v2/reports/playwright-html-report`'
  );
  // Add suites location bullet if not present
  if (!/tests\/playwright/.test(updated)) {
    const insAfter = updated.indexOf('\n', updated.indexOf('# Testing & CI Rules'));
    // Append near the end of bullets (after last listed bullet)
    const insertPoint = updated.lastIndexOf('\n', updated.length - 2);
    const addon = '\n- Playwright suites live in `tests/playwright` and `test-suite-v2`.\n';
    updated = updated.trimEnd() + addon + '\n';
  }
  return updated;
}

function updateToolingAndStyle(content) {
  let updated = content.trimEnd();
  const extras = [
    "- Ensure presence of `.prettierignore`, `.markdownlint.jsonc`, `.lintstagedrc.json`, and `eslint.config.dev.js`.",
  ];
  for (const line of extras) {
    if (!updated.includes(line)) {
      updated += '\n' + line;
    }
  }
  return updated + '\n';
}

for (const [file, prio] of priorities.entries()) {
  const filePath = path.join(rulesDir, file);
  if (!fs.existsSync(filePath)) {
    console.error(`[skip] ${file} not found`);
    continue;
  }
  const orig = fs.readFileSync(filePath, 'utf8');
  let next = updateFrontMatter(orig, prio);
  if (file === 'project-structure.md') next = updateProjectStructure(next);
  if (file === 'testing-and-ci.md') next = updateTestingAndCI(next);
  if (file === 'tooling-and-style.md') next = updateToolingAndStyle(next);
  if (next !== orig) {
    fs.writeFileSync(filePath, next, 'utf8');
    console.log(`[updated] ${file}`);
  } else {
    console.log(`[nochange] ${file}`);
  }
}
