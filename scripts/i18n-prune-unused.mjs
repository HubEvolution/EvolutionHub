#!/usr/bin/env node
/**
 * i18n-prune-unused.mjs
 *
 * Move specified i18n keys to an archived file instead of deleting them.
 * Usage examples:
 *   node scripts/i18n-prune-unused.mjs --keys pages.home.faq --locales en,de --dry-run
 *   node scripts/i18n-prune-unused.mjs --keys pages.home.faq,pages.home.features.legacy --apply
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const LOCALES_DIR = path.join(ROOT, 'src', 'locales');
const ARCHIVE_DIR = path.join(LOCALES_DIR, 'archived');

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { dryRun: true, locales: ['en', 'de'], keys: [] };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--keys') opts.keys = args[++i].split(',').map(s => s.trim()).filter(Boolean);
    else if (a === '--locales') opts.locales = args[++i].split(',').map(s => s.trim());
    else if (a === '--apply') opts.dryRun = false;
    else if (a === '--dry-run') opts.dryRun = true;
  }
  if (!opts.keys.length) {
    console.error('Usage: --keys <key1,key2,...> [--locales en,de] [--apply|--dry-run]');
    process.exit(1);
  }
  return opts;
}

function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }
function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function writeJson(file, data) { fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8'); }

function getByPath(obj, p) {
  const parts = p.split('.');
  let cur = obj;
  for (const key of parts) {
    if (cur == null || typeof cur !== 'object' || !(key in cur)) return undefined;
    cur = cur[key];
  }
  return cur;
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
    const value = cur[last];
    delete cur[last];
    return value;
  }
  return undefined;
}

function archive(locale, removedMap) {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  ensureDir(ARCHIVE_DIR);
  const file = path.join(ARCHIVE_DIR, `${locale}-archived-${ts}.json`);
  writeJson(file, removedMap);
  return file;
}

function pruneLocale(localeFile, keys, dryRun) {
  const data = readJson(localeFile);
  const removed = {};

  for (const k of keys) {
    const val = getByPath(data, k);
    if (val === undefined) {
      console.log(`[${path.basename(localeFile)}] Key not found, skip: ${k}`);
      continue;
    }
    if (dryRun) {
      console.log(`[${path.basename(localeFile)}] Would archive key: ${k}`);
      continue;
    }
    const value = deleteByPath(data, k);
    if (value !== undefined) {
      removed[k] = value;
      console.log(`[${path.basename(localeFile)}] Archived key: ${k}`);
    }
  }

  if (!dryRun) writeJson(localeFile, data);
  return removed;
}

function main() {
  const opts = parseArgs();

  for (const loc of opts.locales) {
    const localeFile = path.join(LOCALES_DIR, `${loc}.json`);
    if (!fs.existsSync(localeFile)) { console.warn(`Missing: ${localeFile}`); continue; }

    const removed = pruneLocale(localeFile, opts.keys, opts.dryRun);

    if (!opts.dryRun && Object.keys(removed).length) {
      const archivedPath = archive(loc, removed);
      console.log(`[${path.basename(localeFile)}] Archived ${Object.keys(removed).length} keys -> ${archivedPath}`);
    }
  }
  console.log('Done.');
}

main();
