#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import { relative, resolve } from 'node:path';
import { spawn } from 'node:child_process';

const cwd = process.cwd();
const configPath = resolve(cwd, process.env.API_EXTRACTOR_CONFIG ?? 'api-extractor.json');
const tsConfigPath = resolve(cwd, process.env.API_EXTRACTOR_TSCONFIG ?? 'tsconfig.json');
const typesOutDir = resolve(cwd, '.types');
const docOutputDir = resolve(cwd, 'docs/reference/ts');
const tempDir = resolve(cwd, 'temp');

async function collectDeclarationFiles(root) {
  const stack = [''];
  const results = [];
  while (stack.length) {
    const current = stack.pop();
    const base = resolve(root, current);
    let dirents;
    try {
      dirents = await fs.readdir(base, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const dirent of dirents) {
      const rel = current ? `${current}/${dirent.name}` : dirent.name;
      if (dirent.isDirectory()) {
        stack.push(rel);
      } else if (rel.endsWith('.d.ts')) {
        results.push(rel.replace(/\\/g, '/'));
      }
    }
  }
  return results;
}

async function ensureDeclarations() {
  const skip = (process.env.SKIP_TYPES_BUILD ?? '').toLowerCase();
  if (skip === '1' || skip === 'true') {
    console.log('[ae-run] Skipping declaration build because SKIP_TYPES_BUILD is set.');
    return;
  }
  console.log('[ae-run] Building TypeScript declarations...');
  await runCommand('npx', ['tsc', '--project', tsConfigPath, '--emitDeclarationOnly', '--declarationDir', typesOutDir]);
}

async function createAggregator() {
  const srcDir = resolve(typesOutDir, 'src');
  try {
    await fs.access(srcDir);
  } catch {
    await fs.writeFile(resolve(typesOutDir, 'index.d.ts'), 'export {};\n');
    return;
  }
  const files = (await collectDeclarationFiles(srcDir)).filter((file) => !file.includes('__tests__'));
  files.sort();
  const exports = files
    .filter((file) => file !== 'index.d.ts' && !file.endsWith('.test.d.ts'))
    .map((file) => file.replace(/\\/g, '/').replace(/\.d\.ts$/, ''))
    .map((file) => `export * from './${file}';`);
  const banner = '// Auto-generated barrel for API Extractor\n';
  const body = exports.length ? exports.join('\n') : 'export {};';
  await fs.writeFile(resolve(typesOutDir, 'index.d.ts'), `${banner}${body}\n`);
}

async function verifyConfig() {
  try {
    await fs.access(configPath);
  } catch {
    console.warn(`[ae-run] API Extractor config not found at ${configPath}.`);
  }
}

async function runExtractor() {
  console.log('[ae-run] Running API Extractor...');
  await runCommand('npx', ['@microsoft/api-extractor', 'run', '--local', '--verbose', '--config', configPath]);
}

async function runDocumenter() {
  console.log('[ae-run] Generating Markdown reference via API Documenter...');
  await runCommand('npx', ['@microsoft/api-documenter', 'markdown', '--input-folder', tempDir, '--output-folder', docOutputDir]);
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
  await verifyConfig();
  await fs.rm(typesOutDir, { recursive: true, force: true });
  await fs.rm(tempDir, { recursive: true, force: true });
  await fs.mkdir(typesOutDir, { recursive: true });
  await fs.mkdir(tempDir, { recursive: true });
  await ensureDeclarations();
  await createAggregator();
  await runExtractor();
  await fs.rm(docOutputDir, { recursive: true, force: true });
  await fs.mkdir(docOutputDir, { recursive: true });
  await runDocumenter();
  const relativeOutput = relative(cwd, docOutputDir) || docOutputDir;
  console.log(`[ae-run] API reference emitted to ${relativeOutput}`);
}

main().catch((error) => {
  console.error('[ae-run] API reference generation failed');
  console.error(error);
  process.exitCode = 1;
});
