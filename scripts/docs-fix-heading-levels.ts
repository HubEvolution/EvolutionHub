import fs from 'node:fs';
import path from 'node:path';
import { globby } from 'globby';

function fixHeadingLevels(content: string) {
  const lines = content.split(/\r?\n/);
  const out: string[] = [];
  let prevLevel = 0;
  let inFence = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (/^```/.test(line)) {
      inFence = !inFence;
      out.push(line);
      continue;
    }
    if (inFence) {
      out.push(line);
      continue;
    }

    const m = line.match(/^(#{1,6})\s+(.*)$/);
    if (m) {
      const hashes = m[1];
      const text = m[2];
      const level = hashes.length;
      if (prevLevel === 0) {
        // allow any starting level
        prevLevel = level;
        out.push(line);
        continue;
      }
      if (level > prevLevel + 1) {
        const newLevel = prevLevel + 1;
        line = `${'#'.repeat(newLevel)} ${text}`;
      }
      prevLevel = (line.match(/^#+/)?.[0]?.length) || level;
      out.push(line);
      continue;
    }

    out.push(line);
  }

  return out.join('\n');
}

async function main() {
  const files = await globby('docs/**/*.md');
  const changed: string[] = [];
  for (const file of files) {
    const abs = path.resolve(file);
    const old = fs.readFileSync(abs, 'utf8');
    const next = fixHeadingLevels(old);
    if (next !== old) {
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
