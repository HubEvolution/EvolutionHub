#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import { globby } from 'globby';

const ROOT = process.cwd();
const DOCS_DIR = path.join(ROOT, 'docs');

// Disallowed patterns in docs (UI routes or outdated hosts)
// - forbid legacy UI auth routes like /auth/login, /auth/password-*
// - forbid UI reset-password route
// - forbid localhost:4321 (use 127.0.0.1:8787)
// Allow: /api/auth/*
const PATTERNS = [
  {
    name: 'legacy_ui_auth_route',
    regex: /(^|[^\w/])\/auth\/(?!api\/)[a-z0-9\-_/]*/i,
    hint: "Use Magic Link flow '/login' or API routes under /api/auth/*",
  },
  {
    name: 'ui_reset_password',
    regex: /(^|[^\w/])\/reset-password(?![\w-])/i,
    hint: 'Reset-password UI was removed; reference 410 API only if needed',
  },
  {
    name: 'localhost_4321',
    regex: /localhost:4321|http:\/\/localhost:4321/i,
    hint: 'Use http://127.0.0.1:8787 for local dev/e2e',
  },
];

(async () => {
  try {
    const files = await globby(['**/*.md', '**/*.mdx'], {
      cwd: DOCS_DIR,
      gitignore: true,
      absolute: true,
    });
    const problems = [];

    for (const file of files) {
      const content = await fs.readFile(file, 'utf8');
      const rel = path.relative(ROOT, file);
      for (const p of PATTERNS) {
        const matches = content.match(p.regex);
        if (matches) {
          problems.push({ file: rel, pattern: p.name, hint: p.hint });
        }
      }
    }

    if (problems.length) {
      console.error('[docs-link-audit] Disallowed references found:');
      for (const prob of problems) {
        console.error(`- ${prob.file}: ${prob.pattern} → ${prob.hint}`);
      }
      process.exit(1);
    }

    console.log('[docs-link-audit] OK: no disallowed references found.');
  } catch (err) {
    console.error('[docs-link-audit] failed:', err?.message || String(err));
    process.exit(1);
  }
})();
