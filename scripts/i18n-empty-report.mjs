#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';

const ROOT = process.cwd();
const EN_PATH = path.join(ROOT, 'src/locales/en.json');
const DE_PATH = path.join(ROOT, 'src/locales/de.json');

function isObject(v) {
  return v !== null && typeof v === 'object';
}

function flatten(obj, prefix = '') {
  const out = {};
  const walk = (val, cur) => {
    if (Array.isArray(val)) {
      val.forEach((v, i) => walk(v, cur ? `${cur}.${i}` : String(i)));
    } else if (isObject(val)) {
      for (const k of Object.keys(val)) walk(val[k], cur ? `${cur}.${k}` : k);
    } else {
      out[cur] = val;
    }
  };
  walk(obj, prefix);
  return out;
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

  const emptyEn = Object.entries(flatEn)
    .filter(([, v]) => v === '')
    .map(([k]) => k)
    .sort();
  const emptyDe = Object.entries(flatDe)
    .filter(([, v]) => v === '')
    .map(([k]) => k)
    .sort();

  console.log('i18n empty strings report');
  console.log(`- en: ${emptyEn.length} empty values`);
  console.log(`- de: ${emptyDe.length} empty values`);

  if (emptyEn.length) {
    console.log('\nEmpty keys in en:');
    emptyEn.forEach((k) => console.log(' -', k));
  }
  if (emptyDe.length) {
    console.log('\nEmpty keys in de:');
    emptyDe.forEach((k) => console.log(' -', k));
  }
}

main().catch((err) => {
  console.error('Error generating i18n empty report:', err);
  process.exit(1);
});
