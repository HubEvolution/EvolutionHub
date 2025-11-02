import fs from 'node:fs';
import path from 'node:path';
import { globby } from 'globby';

function detectFenceLang(block: string): string {
  const sample = block.slice(0, 400).toLowerCase();
  const bashHints = [
    'npm ',
    'pnpm ',
    'yarn ',
    'curl ',
    'wrangler ',
    'bash',
    'sh ',
    'node ',
    'npx ',
  ];
  if (bashHints.some((h) => sample.includes(h))) return 'bash';
  const jsonHints = ['{', '"', '}', ']'];
  if (jsonHints.every((h) => sample.includes(h))) return 'json';
  return 'text';
}

function fixMarkdown(content: string): string {
  const lines = content.split(/\r?\n/);
  const out: string[] = [];
  let i = 0;
  const seenHeadings = new Map<string, number>();
  let inFence = false;

  const pushLine = (l: string) => {
    // Collapse multiple blank lines
    if (l.trim() === '') {
      const prev = out[out.length - 1] ?? '';
      if (prev.trim() === '') return; // skip extra blanks
    }
    out.push(l);
  };

  while (i < lines.length) {
    let line = lines[i];

    // Track code fences (do not alter inside)
    if (/^```/.test(line)) {
      if (!inFence) {
        // opening fence: ensure language
        if (/^```\s*$/.test(line))
          line = '```' + detectFenceLang(lines.slice(i + 1, i + 20).join('\n'));
        // ensure blank before fence
        if (out.length > 0 && out[out.length - 1].trim() !== '') pushLine('');
      }
      inFence = !inFence;
      pushLine(line);
      i++;
      // ensure blank after closing fence
      if (!inFence && i < lines.length && lines[i].trim() !== '') pushLine('');
      continue;
    }

    if (inFence) {
      pushLine(line);
      i++;
      continue;
    }

    // Headings: ensure blank lines around and deduplicate within file
    if (/^#{1,6}\s/.test(line)) {
      if (out.length > 0 && out[out.length - 1].trim() !== '') pushLine('');
      const headingText = line.replace(/^#{1,6}\s+/, '').trim();
      const count = seenHeadings.get(headingText) || 0;
      if (count > 0) {
        line = line.replace(/^(#{1,6}\s+)(.*)$/, (_m, p1, p2) => `${p1}${p2} (${count + 1})`);
      }
      seenHeadings.set(headingText, count + 1);
      pushLine(line);
      const next = lines[i + 1];
      if (next !== undefined && next.trim() !== '') pushLine('');
      i++;
      continue;
    }

    // Ordered list blocks: support "." and ")" markers; enforce 1/1/1 style
    if (/^\s*\d+[\.)]/.test(line)) {
      const blockIdxStart = i;
      const block: { idx: number; indent: string; text: string; num: number; marker: string }[] =
        [];
      while (i < lines.length && /^\s*\d+[\.)]/.test(lines[i])) {
        const m = lines[i].match(/^(\s*)(\d+)([\.)])(\s+)(.*)$/);
        if (!m) break;
        const indent = m[1] ?? '';
        const num = Number(m[2]);
        const marker = m[3] ?? '.';
        const text = m[5] ?? '';
        block.push({ idx: i, indent, text, num, marker });
        i++;
      }
      const markerChar = block[0]?.marker || '.';
      // Ensure blank line before list
      if (out.length > 0 && out[out.length - 1].trim() !== '') pushLine('');
      block.forEach((b) => {
        pushLine(`${b.indent}1${markerChar} ${b.text}`);
      });
      // Ensure blank after list
      if (i < lines.length && lines[i].trim() !== '') pushLine('');
      continue;
    }

    // Unordered list: ensure blank line before block start
    if (/^\s*[-*+]\s+/.test(line)) {
      if (out.length > 0 && out[out.length - 1].trim() !== '') pushLine('');
      pushLine(line);
      i++;
      continue;
    }

    pushLine(line);
    i++;
  }

  // Post-pass: renumber any remaining ordered-list lines to 1/1/1 (outside fences)
  const renumbered: string[] = [];
  let fence = false;
  for (const l of out) {
    if (/^```/.test(l)) {
      fence = !fence;
      renumbered.push(l);
      continue;
    }
    if (!fence) {
      const m = l.match(/^(\s*)(\d+)([\.)])(\s+)(.*)$/);
      if (m) {
        renumbered.push(`${m[1]}1${m[3]} ${m[5]}`);
        continue;
      }
    }
    renumbered.push(l);
  }

  // Ensure single trailing newline
  while (renumbered.length > 0 && renumbered[renumbered.length - 1] === '') renumbered.pop();
  return renumbered.join('\n') + '\n';
}

async function main() {
  const files = await globby('docs/**/*.md');
  const changed: string[] = [];
  for (const file of files) {
    const abs = path.resolve(file);
    const old = fs.readFileSync(abs, 'utf8');
    const next = fixMarkdown(old);
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
