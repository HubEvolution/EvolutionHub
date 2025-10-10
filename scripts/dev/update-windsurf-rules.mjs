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
  const newHeader =
    inserted || hasPriority
      ? newHeaderLines.join('\n')
      : lines.join('\n').replace('---\n', `---\npriority: ${priority}\n`);
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
    const addon = '\n- Playwright suites live in `tests/playwright` and `test-suite-v2`.\n';
    updated = updated.trimEnd() + addon + '\n';
  }
  // Add OpenAPI validation mention
  if (!/openapi:validate/.test(updated)) {
    updated =
      updated.trimEnd() + '\n- Validate OpenAPI via `npm run openapi:validate` before PRs.\n';
  }
  // Add docs build sync
  if (!/docs:build/.test(updated)) {
    updated =
      updated.trimEnd() +
      '\n- Keep docs in sync; regenerate with `npm run docs:build` when API or env docs change.\n';
  }
  // Add TEST_BASE_URL and E2E_FAKE_STYTCH hints
  if (!/TEST_BASE_URL/.test(updated)) {
    updated =
      updated.trimEnd() +
      '\n- E2E config honors `TEST_BASE_URL`; local runs default to `http://127.0.0.1:8787`. For auth smokes, `E2E_FAKE_STYTCH=1` enables the fake provider in dev.\n';
  }
  return updated;
}

function updateToolingAndStyle(content) {
  let updated = content.trimEnd();
  const extras = [
    '- Ensure presence of `.prettierignore`, `.markdownlint.jsonc`, `.lintstagedrc.json`, and `eslint.config.dev.js`.',
  ];
  for (const line of extras) {
    if (!updated.includes(line)) {
      updated += '\n' + line;
    }
  }
  return updated + '\n';
}

function updateApiAndSecurity(content) {
  let updated = content.trimEnd();
  const extras = [
    '- Observability: client logs are batched to `src/pages/api/debug/client-log.ts` (headers redacted, rate-limited). Enable the Debug Panel via `PUBLIC_ENABLE_DEBUG_PANEL`; see `src/components/ui/DebugPanel.tsx`.',
    '- AI Image Enhancer entitlements: server enforces plan-based quotas; UI reflects `allowedScales`/`canUseFaceEnhance`. Plans propagate via Stripe webhook; guests have separate KV-based limits.',
  ];
  for (const line of extras) {
    if (!updated.includes(line)) {
      updated += '\n' + line;
    }
  }
  return updated + '\n';
}

function updateProjectStructureExtra(content) {
  let updated = content.trimEnd();
  const line =
    '- Worker build details: `ASTRO_DEPLOY_TARGET=worker` copies static assets to `dist/assets` and writes `.assetsignore` to exclude `_worker.js`; Wrangler serves from `dist` (see `package.json` `build:worker` and `wrangler.toml [assets]`).';
  if (!updated.includes(line)) {
    updated += '\n' + line + '\n';
  }
  return updated;
}

for (const [file, prio] of priorities.entries()) {
  const filePath = path.join(rulesDir, file);
  if (!fs.existsSync(filePath)) {
    console.error(`[skip] ${file} not found`);
    continue;
  }
  const orig = fs.readFileSync(filePath, 'utf8');
  let next = updateFrontMatter(orig, prio);
  if (file === 'project-structure.md')
    next = updateProjectStructureExtra(updateProjectStructure(next));
  if (file === 'testing-and-ci.md') next = updateTestingAndCI(next);
  if (file === 'tooling-and-style.md') next = updateToolingAndStyle(next);
  if (file === 'api-and-security.md') next = updateApiAndSecurity(next);
  if (next !== orig) {
    fs.writeFileSync(filePath, next, 'utf8');
    console.log(`[updated] ${file}`);
  } else {
    console.log(`[nochange] ${file}`);
  }
}
