#!/usr/bin/env node
/**
 * Sync docs/rules/*.md -> .windsurf/rules/*.md
 * Intended for Phase 1 Security/Infra rules overwrite.
 */
import { promises as fs } from 'fs';
import path from 'path';

const repoRoot = process.cwd();
const srcDir = path.join(repoRoot, 'docs', 'rules');
const dstDir = path.join(repoRoot, '.windsurf', 'rules');

const files = [
  'api-and-security.md',
  'tooling-and-style.md',
  'project-structure.md',
  'infra.md',
  'testing-and-ci.md',
  'zod-openapi.md',
  // Phase 2 feature rules
  'auth.md',
  'enhancer.md',
  'prompt.md',
  'scraper.md',
  'transcriptor.md',
  'pricing.md',
];

async function main() {
  const results = [];
  for (const f of files) {
    const src = path.join(srcDir, f);
    const dst = path.join(dstDir, f);
    const data = await fs.readFile(src, 'utf8');
    await fs.writeFile(dst, data, 'utf8');
    results.push({ src, dst, bytes: data.length });
  }
  console.log('[sync] Completed rules sync:');
  for (const r of results) {
    console.log(`- ${path.relative(repoRoot, r.src)} -> ${path.relative(repoRoot, r.dst)} (${r.bytes} bytes)`);
  }
}

main().catch((err) => {
  console.error('[sync] Failed:', err);
  process.exit(1);
});
