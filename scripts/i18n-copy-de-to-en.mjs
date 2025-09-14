#!/usr/bin/env node
import fs from 'fs/promises';
import { copyFile } from 'fs/promises';
import path from 'path';

const ROOT = process.cwd();
const EN_PATH = path.join(ROOT, 'src/locales/en.json');
const DE_PATH = path.join(ROOT, 'src/locales/de.json');
const EN_BAK_PATH = path.join(ROOT, 'src/locales/en.backup.json');

function isObject(val) {
  return val !== null && typeof val === 'object' && !Array.isArray(val);
}

function cloneDeep(val) {
  return JSON.parse(JSON.stringify(val));
}

/**
 * Copy values from src (DE) into dst (EN) ONLY when dst is missing the key.
 * - Does not overwrite existing EN values
 * - Treats arrays as leaf values: only set if entirely missing
 * - Recurses for plain objects
 * Returns number of keys added and array of structural conflicts encountered.
 */
function copyMissing(dst, src, prefix = '', stats) {
  const keys = Object.keys(src || {});
  for (const k of keys) {
    const keyPath = prefix ? `${prefix}.${k}` : k;
    const sVal = src[k];
    const dVal = dst?.[k];

    if (dVal === undefined) {
      // Destination missing: copy entire subtree
      dst[k] = cloneDeep(sVal);
      stats.added++;
      continue;
    }

    // Destination has a value already: do not overwrite primitives/arrays
    const sObj = isObject(sVal);
    const dObj = isObject(dVal);

    if (sObj && dObj) {
      // Recurse into objects
      copyMissing(dVal, sVal, keyPath, stats);
      continue;
    }

    // Type mismatch or non-object present in EN: keep EN as-is, count as kept
    stats.kept++;
  }
}

async function main() {
  const [enRaw, deRaw] = await Promise.all([
    fs.readFile(EN_PATH, 'utf8'),
    fs.readFile(DE_PATH, 'utf8'),
  ]);

  // Backup EN
  await copyFile(EN_PATH, EN_BAK_PATH);
  console.log(`[i18n-copy] Backup written: ${EN_BAK_PATH}`);

  const en = JSON.parse(enRaw);
  const de = JSON.parse(deRaw);

  const stats = { added: 0, kept: 0 };

  if (!isObject(en.pages)) en.pages = {};
  if (!isObject(en.common)) en.common = en.common ?? {};

  // Copy globally from DE to EN (limited to top-level to avoid wiping EN structure)
  copyMissing(en, de, '', stats);

  await fs.writeFile(EN_PATH, JSON.stringify(en, null, 2) + '\n', 'utf8');
  console.log('[i18n-copy] Completed.');
  console.log(`[i18n-copy] Added to EN: ${stats.added}`);
  console.log(`[i18n-copy] Kept existing EN entries: ${stats.kept}`);
}

main().catch((err) => {
  console.error('[i18n-copy] Error:', err);
  process.exit(1);
});
