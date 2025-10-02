#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';

const cwd = process.cwd();
const source = resolve(cwd, process.env.ENV_DOC_SOURCE ?? '.env.example');
const destination = resolve(cwd, process.env.ENV_DOC_OUTPUT ?? 'docs/reference/environment.md');
const sourceLabel = relative(cwd, source) || source;

async function readEnvFile(file) {
  const content = await fs.readFile(file, 'utf8').catch((error) => {
    if (error.code === 'ENOENT') {
      console.warn(`[gen-env-doc] Source file not found: ${file}`);
      return '';
    }
    throw error;
  });
  return content;
}

function parse(content) {
  const lines = content.split(/\r?\n/);
  const records = [];
  let commentBuffer = [];
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      commentBuffer = [];
      continue;
    }
    if (line.startsWith('#')) {
      commentBuffer.push(line.replace(/^#\s?/, ''));
      continue;
    }
    const [key, ...rest] = rawLine.split('=');
    if (!key) continue;
    const value = rest.join('=').trim();
    const description = commentBuffer.join(' ').trim() || undefined;
    records.push({
      name: key.trim(),
      defaultValue: value || undefined,
      description
    });
    commentBuffer = [];
  }
  return records;
}

function renderMarkdown(vars) {
  const header = `---\ntitle: Environment variables\ndescription: Reference of configuration sourced from ${sourceLabel}\n---\n\n`;
  const intro = 'This reference is generated from the `.env.example` template and lists every environment variable consumed by the application.\n\n';
  if (!vars.length) {
    return `${header}${intro}_No environment variables were discovered._\n`;
  }
  const tableHeader = '| Name | Default | Description |\n| --- | --- | --- |\n';
  const rows = vars
    .map(({ name, defaultValue, description }) => {
      const safeDefault = defaultValue ? `\`${defaultValue.replace(/\|/g, '\\|')}\`` : '—';
      const safeDescription = description ? description.replace(/\|/g, '\\|') : '—';
      return `| \`${name}\` | ${safeDefault} | ${safeDescription} |`;
    })
    .join('\n');
  return `${header}${intro}${tableHeader}${rows}\n`;
}

async function main() {
  const raw = await readEnvFile(source);
  const vars = parse(raw);
  await fs.mkdir(dirname(destination), { recursive: true });
  await fs.writeFile(destination, renderMarkdown(vars));
  console.log(`[gen-env-doc] Wrote ${vars.length} variable entries to ${destination}`);
}

main().catch((error) => {
  console.error('[gen-env-doc] Failed to generate documentation');
  console.error(error);
  process.exitCode = 1;
});
