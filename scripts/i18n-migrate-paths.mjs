#!/usr/bin/env node
/**
 * i18n-migrate-paths.mjs
 *
 * Non-destructive key migration for locale JSON files.
 * Example:
 *   node scripts/i18n-migrate-paths.mjs --from pages.home.pricing --to pages.pricing --locales en,de --dry-run
 *   node scripts/i18n-migrate-paths.mjs --from pages.home.pricing --to pages.pricing --apply
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const LOCALES_DIR = path.join(ROOT, 'src', 'locales');
const BACKUP_DIR = path.join(ROOT, '.backups');

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { dryRun: true, locales: ['en', 'de'] };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--from') opts.from = args[++i];
    else if (a === '--to') opts.to = args[++i];
    else if (a === '--locales') opts.locales = args[++i].split(',').map(s => s.trim());
    else if (a === '--apply') opts.dryRun = false;
    else if (a === '--dry-run') opts.dryRun = true;
  }
  if (!opts.from || !opts.to) {
    console.error('Usage: --from <path> --to <path> [--locales en,de] [--apply|--dry-run]');
    process.exit(1);
  }
  return opts;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function backupFile(absPath) {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const dir = path.join(BACKUP_DIR, `i18n-${ts}`);
  ensureDir(dir);
  const dest = path.join(dir, path.basename(absPath));
  fs.copyFileSync(absPath, dest);
  return dest;
}

function getByPath(obj, p) {
  const parts = p.split('.');
  let cur = obj;
  for (const key of parts) {
    if (cur == null || typeof cur !== 'object' || !(key in cur)) return undefined;
    cur = cur[key];
  }
  return cur;
}

function setByPath(obj, p, value) {
  const parts = p.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (typeof cur[key] !== 'object' || cur[key] == null) cur[key] = {};
    cur = cur[key];
  }
  cur[parts[parts.length - 1]] = value;
}

function deleteByPath(obj, p) {
  const parts = p.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (cur == null || typeof cur !== 'object') return false;
    cur = cur[key];
  }
  const last = parts[parts.length - 1];
  if (cur && Object.prototype.hasOwnProperty.call(cur, last)) {
    delete cur[last];
    return true;
  }
  return false;
}

function deepMerge(target, source) {
  if (Array.isArray(source)) return source; // overwrite arrays
  if (source && typeof source === 'object') {
    const out = { ...target };
    for (const [k, v] of Object.entries(source)) {
      out[k] = deepMerge(target ? target[k] : undefined, v);
    }
    return out;
  }
  return source;
}

function migrate(localeFile, from, to, dryRun) {
  const data = readJson(localeFile);
  const srcVal = getByPath(data, from);
  const dstVal = getByPath(data, to);

  if (srcVal === undefined) {
    console.log(`[${path.basename(localeFile)}] No source at '${from}'. Nothing to migrate.`);
    return { changed: false };
  }

  const merged = deepMerge(dstVal, srcVal);

  console.log(`[${path.basename(localeFile)}] Migrate '${from}' -> '${to}'`);
  if (dryRun) {
    console.log('  Dry-run: no changes written. Preview of destination value type:', typeof merged);
    return { changed: false, preview: true };
  }

  // Backup once per run per file
  backupFile(localeFile);

  setByPath(data, to, merged);
  deleteByPath(data, from);
  writeJson(localeFile, data);
  return { changed: true };
}

function main() {
  const opts = parseArgs();
  const mappings = [{ from: opts.from, to: opts.to }];

  for (const loc of opts.locales) {
    const localeFile = path.join(LOCALES_DIR, `${loc}.json`);
    if (!fs.existsSync(localeFile)) {
      console.warn(`Locale file not found: ${localeFile}`);
      continue;
    }
    for (const m of mappings) {
      migrate(localeFile, m.from, m.to, opts.dryRun);
    }
  }
  console.log('Done.');
}

main();
