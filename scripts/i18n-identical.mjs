#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const dePath = path.join(root, 'src/locales/de.json');
const enPath = path.join(root, 'src/locales/en.json');

function loadJson(p) {
  const raw = fs.readFileSync(p, 'utf8');
  return JSON.parse(raw);
}

function isPlainObject(val) {
  return Object.prototype.toString.call(val) === '[object Object]';
}

function flatten(obj, prefix = '', out = {}) {
  if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
    out[prefix] = String(obj);
    return out;
  }
  if (Array.isArray(obj)) {
    obj.forEach((v, i) => {
      flatten(v, `${prefix}[${i}]`, out);
    });
    return out;
  }
  if (isPlainObject(obj)) {
    for (const [k, v] of Object.entries(obj)) {
      const next = prefix ? `${prefix}.${k}` : k;
      flatten(v, next, out);
    }
    return out;
  }
  return out; // ignore other types
}

function pickNamespace(dict, ns) {
  // Supports nested namespaces like "common.faq"
  const parts = ns.split('.');
  let cur = dict;
  for (const p of parts) {
    if (cur && isPlainObject(cur) && p in cur) {
      cur = cur[p];
    } else {
      return undefined;
    }
  }
  return cur;
}

function main() {
  const namespace = process.argv[2] || 'faq';
  const de = loadJson(dePath);
  const en = loadJson(enPath);

  const deNs = pickNamespace(de, namespace);
  const enNs = pickNamespace(en, namespace);

  if (!deNs || !enNs) {
    console.error(`[i18n-identical] Namespace not found in one or both locales: ${namespace}`);
    process.exitCode = 1;
    return;
  }

  const deFlat = flatten(deNs, namespace);
  const enFlat = flatten(enNs, namespace);

  const keys = new Set([...Object.keys(deFlat), ...Object.keys(enFlat)]);
  const identical = [];
  const onlyDe = [];
  const onlyEn = [];

  for (const k of keys) {
    const dv = deFlat[k];
    const ev = enFlat[k];
    if (dv === undefined) {
      onlyEn.push(k);
    } else if (ev === undefined) {
      onlyDe.push(k);
    } else if (dv === ev) {
      identical.push(k);
    }
  }

  console.log(`\n[i18n-identical] Namespace: ${namespace}`);
  console.log(`[i18n-identical] Total keys compared: ${keys.size}`);
  console.log(`[i18n-identical] Identical values: ${identical.length}`);
  if (identical.length) {
    console.log('\nIdentical keys:');
    identical.sort().forEach((k) => console.log(` - ${k}`));
  }

  if (onlyDe.length || onlyEn.length) {
    console.log('\n[Parity warnings]');
    if (onlyDe.length) {
      console.log(` - Missing in en.json: ${onlyDe.length}`);
      onlyDe.sort().forEach((k) => console.log(`   * ${k}`));
    }
    if (onlyEn.length) {
      console.log(` - Missing in de.json: ${onlyEn.length}`);
      onlyEn.sort().forEach((k) => console.log(`   * ${k}`));
    }
  }

  console.log('\n[i18n-identical] Done.');
}

main();
