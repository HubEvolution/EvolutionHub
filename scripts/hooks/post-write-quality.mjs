#!/usr/bin/env node

// post_write_code quality helper for Cascade.
// Does NOT run heavy CI; just prints targeted suggestions and optional lightweight logging.

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

function classifyPath(relPath) {
  const ext = path.extname(relPath);

  if (relPath.startsWith('src/pages/api/')) return 'api';
  if (relPath.startsWith('src/lib/validation/schemas/')) return 'validation';
  if (relPath.startsWith('tests/')) return 'tests';
  if (relPath.startsWith('docs/')) return 'docs';
  if (relPath.startsWith('.windsurf/rules/')) return 'rules';
  if (relPath === 'openapi.yaml') return 'openapi';
  if (relPath.startsWith('src/') && ext === '.astro') return 'astro';
  if (relPath.startsWith('src/')) return 'src';

  return 'other';
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
    const kind = classifyPath(relPath);

    if (!process.env.CASCADES_HOOKS_DISABLE_LOG) {
      try {
        fs.mkdirSync('.logs', { recursive: true });
        fs.appendFileSync(
          '.logs/cascade-post-write-quality.log',
          `${new Date().toISOString()} post_write_code: ${relPath} [${kind}]\n`
        );
      } catch {
        // best-effort only
      }
    }

    switch (kind) {
      case 'api': {
        console.log(
          `Hook Hinweis: ${relPath} geändert. ` +
            'Empfehlung: später "npm run openapi:validate" und "npm run test:integration" laufen lassen. Siehe bei größeren Änderungen auch .windsurf/rules/api-and-security.md und openapi.yaml.'
        );
        break;
      }
      case 'validation': {
        console.log(
          `Hook Hinweis: ${relPath} geändert. ` +
            'Empfehlung: passende Tests für Validierung (valid/invalid Cases) prüfen und bei API-relevanten Schemas "npm run openapi:validate" ausführen.'
        );
        break;
      }
      case 'astro': {
        console.log(
          `Hook Hinweis: ${relPath} geändert. ` +
            'Empfehlung: "npm run lint" und "npm run astro:check:ui" laufen lassen. Bei UI-Flows ggf. relevante E2E-Tests prüfen.'
        );
        break;
      }
      case 'src': {
        console.log(
          `Hook Hinweis: ${relPath} geändert. ` +
            'Empfehlung: "npm run lint" und "npm run typecheck:src" für diese Änderungen prüfen. TypeScript ist strict; bitte keine neuen "any" in src/** einführen.'
        );
        break;
      }
      case 'tests': {
        console.log(
          `Hook Hinweis: ${relPath} geändert. ` +
            'Erinnerung: In Tests kein direktes JSON.parse verwenden, sondern safeParseJson aus tests/shared/http.ts. Bei größeren Änderungen Tests mit "npm run test:once" oder passenden Teilkommandos laufen lassen.'
        );
        break;
      }
      case 'docs': {
        console.log(
          `Hook Hinweis: ${relPath} geändert. ` +
            'Empfehlung: Frontmatter (lastSync, codeRefs, testRefs) aktualisieren und bei strukturellen Doku-Änderungen "npm run docs:lint" und "npm run docs:links" prüfen.'
        );
        break;
      }
      case 'rules': {
        console.log(
          `Hook Hinweis: ${relPath} geändert. ` +
            'Governance: .windsurf/rules sind Single Source of Truth für Leitplanken. Prüfe, ob zugehörige Docs (z. B. unter docs/development oder docs/security) und ggf. Changelogs angepasst werden sollen.'
        );
        break;
      }
      case 'openapi': {
        console.log(
          'Hook Hinweis: openapi.yaml geändert. Empfehlung: "npm run openapi:validate" ausführen und relevante API-Dokumentation prüfen.'
        );
        break;
      }
      default: {
        break;
      }
    }

    process.exit(0);
  } catch (err) {
    console.error(
      'post-write-quality hook error:',
      err instanceof Error ? err.message : String(err)
    );
    process.exit(1);
  }
}

main();
