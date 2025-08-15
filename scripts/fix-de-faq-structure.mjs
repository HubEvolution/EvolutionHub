#!/usr/bin/env node
/*
  Align DE faq.categories structure with EN by adding missing keys with placeholders,
  preserving existing values, and deduping duplicate array entries. Backs up DE file.
*/
import fs from 'fs';
import path from 'path';
import url from 'url';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const LOCALES_DIR = path.resolve(ROOT, 'src', 'locales');
const EN_FILE = path.resolve(LOCALES_DIR, 'en.json');
const DE_FILE = path.resolve(LOCALES_DIR, 'de.json');

function readFileText(file) {
  return fs.readFileSync(file, 'utf8');
}

function cropToBalancedBraces(s) {
  let start = s.indexOf('{');
  if (start === -1) return s;
  let depth = 0;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (ch === '{') depth++;
    if (ch === '}') {
      depth--;
      if (depth === 0) {
        return s.slice(start, i + 1);
      }
    }
  }
  return s.slice(start);
}

function safeParseJson(file) {
  let text = readFileText(file);
  text = text.replace(/^\uFEFF/, ''); // BOM
  try {
    return JSON.parse(text);
  } catch (e1) {
    try {
      const cropped = cropToBalancedBraces(text);
      return JSON.parse(cropped);
    } catch (e2) {
      console.error(`Failed to parse JSON for ${file}`);
      throw e2;
    }
  }
}

function writeJson(file, obj) {
  const out = JSON.stringify(obj, null, 2) + '\n';
  fs.writeFileSync(file, out, 'utf8');
}

function getAtPath(obj, dotted) {
  const parts = dotted.split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = cur[p];
  }
  return cur;
}

function ensurePath(obj, dotted) {
  const parts = dotted.split('.');
  let cur = obj;
  for (const p of parts) {
    if (!cur[p] || typeof cur[p] !== 'object' || Array.isArray(cur[p])) {
      cur[p] = {};
    }
    cur = cur[p];
  }
  return cur;
}

function placeholderFor(value) {
  if (Array.isArray(value)) return [];
  if (value === null) return null;
  switch (typeof value) {
    case 'string':
      return '';
    case 'number':
      return 0;
    case 'boolean':
      return false;
    case 'object':
      return {};
    default:
      return '';
  }
}

function alignStructure(src, dst) {
  if (!src || typeof src !== 'object' || Array.isArray(src)) return;
  for (const [k, v] of Object.entries(src)) {
    if (!(k in dst)) {
      dst[k] = placeholderFor(v);
    }
    const dv = dst[k];
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      if (!dv || typeof dv !== 'object' || Array.isArray(dv)) {
        dst[k] = {};
      }
      alignStructure(v, dst[k]);
    }
    // Arrays are considered terminal for parity. If missing, we already created [].
  }
}

function deepEqual(a, b) {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

function dedupeArrays(node) {
  if (!node || typeof node !== 'object') return;
  for (const [k, v] of Object.entries(node)) {
    if (Array.isArray(v)) {
      const seen = [];
      const out = [];
      for (const item of v) {
        const idx = seen.findIndex((x) => deepEqual(x, item));
        if (idx === -1) {
          seen.push(item);
          out.push(item);
        }
      }
      node[k] = out;
    } else if (v && typeof v === 'object') {
      dedupeArrays(v);
    }
  }
}

function backupFile(file) {
  const ts = new Date()
    .toISOString()
    .replace(/[-:TZ]/g, '')
    .slice(0, 14); // YYYYMMDDHHMMSS -> first 14
  const backup = `${file}.bak.${ts}`;
  fs.copyFileSync(file, backup);
  return backup;
}

function alignCategoriesPath(en, de, pathStr) {
  const enNode = getAtPath(en, pathStr);
  if (!enNode || typeof enNode !== 'object') return { changed: false };
  const deNode = ensurePath(de, pathStr);
  const before = JSON.stringify(deNode);
  alignStructure(enNode, deNode);
  dedupeArrays(deNode);
  const after = JSON.stringify(deNode);
  return { changed: before !== after };
}

function main() {
  const en = safeParseJson(EN_FILE);
  const de = safeParseJson(DE_FILE);

  const toAlign = ['faq.categories', 'common.faq.categories'];
  let changed = false;
  for (const p of toAlign) {
    const res = alignCategoriesPath(en, de, p);
    if (res.changed) changed = true;
  }

  if (!changed) {
    console.log('No structural changes required for de.json faq.categories');
    return;
  }

  const backup = backupFile(DE_FILE);
  writeJson(DE_FILE, de);
  console.log(`Updated de.json. Backup created at: ${backup}`);
}

main();
