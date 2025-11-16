#!/usr/bin/env node

// Guard pre_write_code operations from Cascade.
// Blocks edits to critical SSoT / infra files; allows everything else.

import fs from 'node:fs';
import path from 'node:path';

function readStdin() {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', reject);
  });
}

const protectedPatterns = [
  /\.env(\..*)?$/, // .env, .env.*
  /wrangler(\.ci)?\.toml$/, // wrangler.toml, wrangler.ci.toml
  /\.windsurf\/rules\//,
];

function isProtected(filePath) {
  const rel = filePath;
  return protectedPatterns.some((re) => re.test(rel));
}

async function main() {
  try {
    const raw = await readStdin();
    if (!raw) {
      process.exit(0);
      return;
    }

    const payload = JSON.parse(raw);
    const toolInfo = payload?.tool_info ?? {};
    const filePath = String(toolInfo.file_path || '').trim();

    if (!filePath) {
      process.exit(0);
      return;
    }

    const relPath = path.relative(process.cwd(), filePath);

    if (!process.env.CASCADES_HOOKS_DISABLE_LOG) {
      try {
        fs.mkdirSync('.logs', { recursive: true });
        fs.appendFileSync(
          '.logs/cascade-pre-write-guard.log',
          `${new Date().toISOString()} pre_write_code: ${relPath}\n`
        );
      } catch {
        // best-effort only
      }
    }

    if (isProtected(relPath)) {
      console.error(
        `Blocked Cascade from editing protected file: ${relPath}. ` +
          'Please edit this file manually in your editor.'
      );
      process.exit(2);
      return;
    }

    process.exit(0);
  } catch (err) {
    console.error('pre-write-guard hook error:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

main();
