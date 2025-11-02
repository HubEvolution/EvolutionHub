import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { basename } from 'node:path';

const summaryPath = 'reports/code-hygiene-summary.json';
const stepDir = 'reports/hygiene';
const outPath = 'reports/assistant-task.md';

function lastLines(text, maxLines = 300) {
  const lines = text.split(/\r?\n/);
  if (lines.length <= maxLines) return text;
  return lines.slice(-maxLines).join('\n');
}

function safeRead(p) {
  try {
    return readFileSync(p, 'utf8');
  } catch {
    return '';
  }
}

function listStepLogs() {
  if (!existsSync(stepDir)) return [];
  return readdirSync(stepDir)
    .filter((f) => f.endsWith('.log'))
    .map((f) => `${stepDir}/${f}`)
    .sort();
}

function main() {
  if (!existsSync(summaryPath)) {
    console.error(`[hygiene-to-assistant] Missing ${summaryPath}. Run \`npm run hygiene\` first.`);
    process.exit(1);
  }
  const summary = JSON.parse(readFileSync(summaryPath, 'utf8'));
  const failed = Object.entries(summary)
    .filter(([, v]) => !v.ok)
    .map(([k]) => k);

  const parts = [];
  parts.push('# Hygiene Report for Assistant');
  parts.push('');
  parts.push('## Summary');
  parts.push('');
  parts.push('```json');
  parts.push(JSON.stringify(summary, null, 2));
  parts.push('```');
  parts.push('');

  if (failed.length === 0) {
    parts.push('All steps passed. No action required.');
  } else {
    parts.push('## Failing Steps');
    for (const name of failed) {
      parts.push(`- ${name}`);
    }
    parts.push('');
    parts.push('## Relevant Logs (tail)');
    const logs = listStepLogs();
    for (const logPath of logs) {
      const name = basename(logPath, '.log');
      // include debug logs and corresponding primary logs, but trim
      const content = lastLines(safeRead(logPath), 300);
      parts.push(`### ${name}`);
      parts.push('');
      parts.push('```text');
      parts.push(content || '(no content)');
      parts.push('```');
      parts.push('');
    }
  }

  parts.push('## Next Actions (for Assistant)');
  parts.push('- Analyze failing steps and propose minimal patches.');
  parts.push('- If tests fail, provide targeted code edits and updated tests where needed.');
  parts.push('- Keep changes small and standards-compliant (TypeScript strict, ESLint rules).');

  writeFileSync(outPath, parts.join('\n'));
  console.log(`[hygiene-to-assistant] Wrote ${outPath}`);
}

main();
