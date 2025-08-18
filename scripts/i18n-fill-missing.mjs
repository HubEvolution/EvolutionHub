#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';

const ROOT = process.cwd();
const EN_PATH = path.join(ROOT, 'src/locales/en.json');
const DE_PATH = path.join(ROOT, 'src/locales/de.json');

function isObject(val) {
  return val !== null && typeof val === 'object';
}

function flatten(input, prefix = '') {
  const out = {};
  const walk = (val, cur) => {
    if (Array.isArray(val)) {
      val.forEach((v, i) => walk(v, cur ? `${cur}.${i}` : String(i)));
    } else if (isObject(val)) {
      for (const k of Object.keys(val)) {
        walk(val[k], cur ? `${cur}.${k}` : k);
      }
    } else {
      out[cur] = val;
    }
  };
  walk(input, prefix);
  return out;
}

// Safe setter: creates missing containers, but never overwrites existing non-container values.
// Returns true if a value was set, false if skipped due to conflict or already present.
function safeSet(target, parts, value, conflicts) {
  let obj = target;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    const next = parts[i + 1];
    const needArray = /^\d+$/.test(next);
    const curVal = obj[key];
    if (curVal === undefined) {
      obj[key] = needArray ? [] : {};
    } else if (!isObject(curVal)) {
      // Conflict: a primitive exists where a container is required
      conflicts.push(parts.slice(0, i + 1).join('.'));
      return false;
    } else if (Array.isArray(curVal) && !needArray) {
      conflicts.push(parts.slice(0, i + 1).join('.'));
      return false;
    } else if (!Array.isArray(curVal) && needArray) {
      conflicts.push(parts.slice(0, i + 1).join('.'));
      return false;
    }
    obj = obj[key];
  }
  const last = parts[parts.length - 1];
  if (/^\d+$/.test(last)) {
    const idx = Number(last);
    if (!Array.isArray(obj)) {
      conflicts.push(parts.slice(0, parts.length - 1).join('.'));
      return false;
    }
    if (obj[idx] === undefined) {
      obj[idx] = value;
      return true;
    }
    return false;
  } else {
    if (obj[last] === undefined) {
      obj[last] = value;
      return true;
    }
    return false;
  }
}

async function main() {
  const [enRaw, deRaw] = await Promise.all([
    fs.readFile(EN_PATH, 'utf8'),
    fs.readFile(DE_PATH, 'utf8'),
  ]);

  const en = JSON.parse(enRaw);
  const de = JSON.parse(deRaw);

  const flatEn = flatten(en);
  const flatDe = flatten(de);

  const enKeys = new Set(Object.keys(flatEn));
  const deKeys = new Set(Object.keys(flatDe));
  const union = new Set([...enKeys, ...deKeys]);

  let addedToEn = 0;
  let addedToDe = 0;
  const conflictsEn = [];
  const conflictsDe = [];

  for (const k of union) {
    if (!enKeys.has(k)) {
      if (safeSet(en, k.split('.'), '', conflictsEn)) addedToEn++;
    }
    if (!deKeys.has(k)) {
      if (safeSet(de, k.split('.'), '', conflictsDe)) addedToDe++;
    }
  }

  // Pretty print with 2 spaces to follow project JS conventions
  await Promise.all([
    fs.writeFile(EN_PATH, JSON.stringify(en, null, 2) + '\n', 'utf8'),
    fs.writeFile(DE_PATH, JSON.stringify(de, null, 2) + '\n', 'utf8'),
  ]);

  console.log(`Filled missing i18n keys.`);
  console.log(`- Added to en: ${addedToEn}`);
  console.log(`- Added to de: ${addedToDe}`);
  if (conflictsEn.length) {
    console.warn(`- Skipped EN due to structural conflicts at:`, [...new Set(conflictsEn)].sort());
  }
  if (conflictsDe.length) {
    console.warn(`- Skipped DE due to structural conflicts at:`, [...new Set(conflictsDe)].sort());
  }
}

main().catch((err) => {
  console.error('Error filling missing i18n keys:', err);
  process.exit(1);
});
