#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';

const ROOT = process.cwd();
const FILE = path.join(ROOT, 'routes.md');

(async () => {
  try {
    let md = await fs.readFile(FILE, 'utf8');

    // 1) Remove line-number suffix in link targets: (src/path:1) -> (src/path)
    md = md.replaceAll(/\((src\/[\w\-\/\[\]\.]+):(\d+)\)/g, '($1)');

    // 2) Replace the intro link to src/pages with a code span
    md = md.replace('([`src/pages`](src/pages:1))', '(`src/pages/`)');
    md = md.replace('([`src/pages`](src/pages))', '(`src/pages/`)');

    // 3) Escape bracketed placeholders in Legende section to avoid MDLink parsing
    md = md.replace('(z. B. [id] -> :id)', '(z. B. `[id]` -> `:id`)');
    md = md.replace('(z. B. [...slug] -> :...slug)', '(z. B. `[...slug]` -> `:...slug`)');

    await fs.writeFile(FILE, md, 'utf8');
    console.log('[normalize-routes-links] routes.md normalized.');
  } catch (err) {
    console.error('[normalize-routes-links] failed:', err?.message || String(err));
    process.exit(1);
  }
})();
