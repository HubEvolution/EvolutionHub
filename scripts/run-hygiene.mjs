import { mkdirSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';
import { execaCommand } from 'execa';

const logPath = 'reports/code-hygiene-last.log';
const stepDir = 'reports/hygiene';
const summaryJson = 'reports/code-hygiene-summary.json';

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function logHeader(title) {
  const line = `[${title}]`;
  console.log(`\n${line}`);
  appendFileSync(logPath, `\n${line}\n`);
}

async function runStep(title, cmd) {
  const stepSlug = slugify(title);
  const stepLog = `${stepDir}/${stepSlug}.log`;
  appendFileSync(stepLog, `[${title}] $ ${cmd}\n`);

  logHeader(`${title} $ ${cmd}`);
  const res = await execaCommand(cmd, { shell: true, reject: false });
  if (res.stdout) {
    console.log(res.stdout);
    appendFileSync(logPath, res.stdout + '\n');
    appendFileSync(stepLog, res.stdout + '\n');
  }
  if (res.stderr) {
    console.error(res.stderr);
    appendFileSync(logPath, res.stderr + '\n');
    appendFileSync(stepLog, res.stderr + '\n');
  }
  return res.exitCode ?? 0;
}

async function diagnostics(results) {
  // Extra diagnostics for failing steps
  const failed = results.filter(([name, code]) => code !== 0).map(([name]) => name);

  // Unit tests: verbose rerun to dedicated log
  if (failed.some((n) => n.includes('test:unit'))) {
    await runStep('test:unit:debug', 'npm run test:unit:run -- --reporter=verbose');
  }
  // Integration tests: verbose rerun
  if (failed.some((n) => n.includes('test:integration'))) {
    await runStep('test:integration:debug', 'npm run test:integration:run -- --reporter=verbose');
  }
  // Markdownlint JSON (only if docs:lint failed)
  if (failed.includes('docs:lint')) {
    // markdownlint supports --json output
    await runStep(
      'docs:lint:json',
      'markdownlint -c .markdownlint.json --json "docs/**/*.md" > reports/markdownlint.json || true'
    );
  }
}

async function main() {
  // Prepare log dirs/files
  if (!existsSync('reports')) mkdirSync('reports', { recursive: true });
  if (!existsSync(stepDir)) mkdirSync(stepDir, { recursive: true });
  writeFileSync(logPath, '');

  const results = [];

  // 1) Auto-fix pass
  results.push(['format', await runStep('format', 'npm run format')]);
  results.push([
    'eslint:fix',
    await runStep(
      'eslint:fix',
      "npx eslint 'src/**/*.{ts,astro}' --fix --cache --cache-location .cache/eslint"
    ),
  ]);
  results.push(['md:fix', await runStep('md:fix', 'npm run lint:md:fix')]);
  results.push(['docs:toc', await runStep('docs:toc', 'npm run docs:toc')]);

  // 2) Core strict checks (fail-soft)
  results.push(['format:check', await runStep('format:check', 'npm run format:check')]);
  results.push(['lint(strict)', await runStep('lint(strict)', 'npm run lint -- --max-warnings=0')]);
  results.push(['typecheck:src', await runStep('typecheck:src', 'npm run typecheck:src')]);

  // 3) Validation suite (fail-soft)
  results.push(['test:unit:run', await runStep('test:unit:run', 'npm run test:unit:run')]);
  results.push([
    'test:integration:run',
    await runStep('test:integration:run', 'npm run test:integration:run'),
  ]);
  results.push(['openapi:validate', await runStep('openapi:validate', 'npm run openapi:validate')]);
  results.push(['docs:lint', await runStep('docs:lint', 'npm run docs:lint')]);
  results.push(['lint:md', await runStep('lint:md', 'npm run lint:md')]);
  results.push(['docs:links', await runStep('docs:links', 'npm run docs:links')]);
  results.push(['docs:inventory', await runStep('docs:inventory', 'npm run docs:inventory')]);
  results.push(['i18n:audit', await runStep('i18n:audit', 'npm run i18n:audit')]);
  results.push(['security:scan', await runStep('security:scan', 'npm run security:scan')]);

  // Extra diagnostics for failed steps
  await diagnostics(results);

  // Summary
  logHeader('SUMMARY');
  const summary = results
    .map(([name, code]) => `${name}: ${code === 0 ? 'OK' : 'FAIL(' + code + ')'}`)
    .join('\n');
  console.log(summary);
  appendFileSync(logPath, summary + '\n');

  // Write machine-readable summary
  const json = Object.fromEntries(results.map(([name, code]) => [name, { ok: code === 0, code }]));
  writeFileSync(summaryJson, JSON.stringify(json, null, 2));

  // Always exit 0 (fail-soft summary at the end)
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  appendFileSync(logPath, `FATAL: ${err?.stack || err}\n`);
  process.exit(0);
});
