#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { spawn } from 'node:child_process';

const cwd = process.cwd();
const source = resolve(cwd, process.env.OPENAPI_SOURCE ?? 'openapi.yaml');
const htmlOutput = resolve(cwd, process.env.OPENAPI_HTML_OUTPUT ?? 'docs/reference/api/index.html');
const summaryOutput = resolve(cwd, process.env.OPENAPI_SUMMARY_OUTPUT ?? 'docs/reference/api/overview.md');

function stripQuotes(value) {
  return value?.replace(/^['"](.+)['"]$/, '$1') ?? '';
}

async function buildHtml() {
  console.log('[gen-openapi] Building Redoc HTML reference...');
  await fs.mkdir(dirname(htmlOutput), { recursive: true });
  try {
    await runCommand('npx', ['@redocly/cli', 'build-docs', source, '--output', htmlOutput]);
  } catch (error) {
    console.warn(`[gen-openapi] Unable to generate HTML with Redocly CLI: ${error.message}`);
    const fallback = '<!doctype html><html><body><h1>OpenAPI documentation unavailable</h1><p>The Redocly CLI is required to generate the HTML reference.</p></body></html>\n';
    await fs.writeFile(htmlOutput, fallback, 'utf8');
  }
}

function collectOperationsFromYaml(raw) {
  const operations = [];
  const lines = raw.split(/\r?\n/);
  let inPaths = false;
  let currentPath = null;
  let currentMethod = null;
  let summary = '';
  let description = '';
  let operationId = '';
  let tags = [];
  let readingTags = false;
  let readingDescription = false;

  function flush() {
    if (currentPath && currentMethod) {
      operations.push({
        method: currentMethod.toUpperCase(),
        path: stripQuotes(currentPath),
        summary: summary.trim(),
        description: description.trim(),
        operationId: stripQuotes(operationId),
        tags: tags.length ? tags : ['_untagged']
      });
    }
  }

  for (const line of lines) {
    const match = line.match(/^(\s*)(.*)$/);
    if (!match) continue;
    const indent = match[1].length;
    const trimmed = match[2].trim();
    if (!inPaths) {
      if (trimmed === 'paths:') {
        inPaths = true;
      }
      continue;
    }
    if (indent === 0 && trimmed && !trimmed.startsWith('#')) {
      flush();
      currentPath = null;
      currentMethod = null;
      if (trimmed !== 'paths:') {
        inPaths = false;
      }
      continue;
    }
    if (!trimmed) continue;
    if (indent === 2 && trimmed.endsWith(':')) {
      flush();
      currentPath = trimmed.slice(0, -1);
      currentMethod = null;
      continue;
    }
    if (indent === 4 && trimmed.endsWith(':')) {
      flush();
      currentMethod = trimmed.slice(0, -1);
      summary = '';
      description = '';
      operationId = '';
      tags = [];
      readingTags = false;
      readingDescription = false;
      continue;
    }
    if (!currentMethod) continue;
    if (indent === 6 && trimmed.startsWith('tags:')) {
      readingTags = true;
      tags = [];
      continue;
    }
    if (readingTags) {
      if (indent >= 8 && trimmed.startsWith('- ')) {
        tags.push(stripQuotes(trimmed.slice(2)));
        continue;
      }
      readingTags = false;
    }
    if (indent === 6 && trimmed.startsWith('summary:')) {
      summary = stripQuotes(trimmed.slice('summary:'.length).trim());
      continue;
    }
    if (indent === 6 && trimmed.startsWith('description:')) {
      const value = trimmed.slice('description:'.length).trim();
      if (value) {
        description = stripQuotes(value);
        readingDescription = false;
      } else {
        description = '';
        readingDescription = true;
      }
      continue;
    }
    if (readingDescription) {
      if (indent >= 8) {
        description += (description ? ' ' : '') + stripQuotes(trimmed.replace(/^-\s*/, ''));
        continue;
      }
      readingDescription = false;
    }
    if (indent === 6 && trimmed.startsWith('operationId:')) {
      operationId = stripQuotes(trimmed.slice('operationId:'.length).trim());
      continue;
    }
  }
  flush();
  return operations;
}

function renderSummary(rawYaml) {
  const operations = collectOperationsFromYaml(rawYaml);
  const titleMatch = rawYaml.match(/\btitle:\s*(.+)/);
  const versionMatch = rawYaml.match(/\bversion:\s*(.+)/);
  const rawTitle = stripQuotes(titleMatch?.[1] ?? 'API');
  const title = rawTitle.toLowerCase().includes('api') ? rawTitle : `${rawTitle} API`;
  const version = stripQuotes(versionMatch?.[1] ?? 'unversioned');
  const sourceLabel = relative(cwd, source) || source;
  const header = `---\ntitle: ${title} overview\ndescription: Concise endpoint inventory derived from ${sourceLabel}\n---\n\n`;
  if (!operations.length) {
    return `${header}_No operations were discovered in the specification._\n`;
  }
  const grouped = new Map();
  for (const op of operations) {
    for (const tag of op.tags) {
      if (!grouped.has(tag)) grouped.set(tag, []);
      grouped.get(tag).push(op);
    }
  }
  for (const [, ops] of grouped) {
    ops.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));
  }
  const sections = [`_Version ${version}_\n`];
  for (const [tag, ops] of [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const safeTag = tag === '_untagged' ? 'General' : tag;
    const tableHeader = '| Method | Path | Summary | Operation ID |\n| --- | --- | --- | --- |\n';
    const rows = ops
      .map((op) => {
        const summary = op.summary || op.description || '—';
        const operationId = op.operationId ? `\`${op.operationId}\`` : '—';
        const methodCell = `\`${op.method}\``;
        const pathCell = `\`${op.path}\``;
        return `| ${methodCell} | ${pathCell} | ${summary.replace(/\|/g, ' ')} | ${operationId} |`;
      })
      .join('\n');
    sections.push(`### ${safeTag}\n\n${tableHeader}${rows}\n`);
  }
  return `${header}${sections.join('\n')}\n`;
}

async function writeSummary() {
  console.log('[gen-openapi] Creating Markdown overview...');
  const raw = await fs.readFile(source, 'utf8');
  const markdown = renderSummary(raw);
  await fs.mkdir(dirname(summaryOutput), { recursive: true });
  await fs.writeFile(summaryOutput, markdown);
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit' });
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
      }
    });
    child.on('error', (error) => reject(error));
  });
}

async function main() {
  await buildHtml();
  await writeSummary();
  console.log('[gen-openapi] OpenAPI artefacts generated.');
}

main().catch((error) => {
  console.error('[gen-openapi] Failed to build OpenAPI documentation');
  console.error(error);
  process.exitCode = 1;
});
