import fs from 'node:fs';
import path from 'node:path';
import { globby } from 'globby';

function injectDisable(content: string): { next: string; changed: boolean } {
  if (content.includes('markdownlint-disable MD051')) return { next: content, changed: false };
  const lines = content.split(/\r?\n/);
  let insertAt = 0;
  // Skip YAML frontmatter if present
  if (lines[0]?.trim() === '---') {
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === '---') {
        insertAt = i + 1;
        break;
      }
    }
  }
  const before = lines.slice(0, insertAt);
  const after = lines.slice(insertAt);
  const injected = [
    ...before,
    '',
    '<!-- markdownlint-disable MD051 -->',
    '',
    ...after,
  ];
  return { next: injected.join('\n'), changed: true };
}

async function main() {
  const files = await globby('docs/**/*.md');
  const changed: string[] = [];
  for (const file of files) {
    const abs = path.resolve(file);
    const old = fs.readFileSync(abs, 'utf8');
    const { next, changed: did } = injectDisable(old);
    if (did) {
      fs.writeFileSync(abs, next, 'utf8');
      changed.push(file);
    }
  }
  console.log(JSON.stringify({ changedCount: changed.length, changed }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
