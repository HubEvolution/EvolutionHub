#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function readJSON(p) {
  const abs = resolve(p);
  let raw = readFileSync(abs, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (err) {
    // Try to sanitize common issues: BOM, NULs, stray characters after final brace
    let sanitized = raw
      .replace(/^\uFEFF/, '') // strip BOM
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u2028\u2029]/g, ''); // strip other control chars
    try {
      return JSON.parse(sanitized.trim());
    } catch (e2) {
      // Balanced crop that ignores braces in strings
      const cropped = cropToBalancedJSON(sanitized);
      if (cropped) {
        try {
          const parsed = JSON.parse(cropped);
          console.warn(`[i18n-diff] Sanitized trailing characters in ${p}`);
          return parsed;
        } catch (e3) {
          // fallthrough
        }
      }
      if (p.includes('de.json')) {
        const t = sanitized.trimEnd();
        const lastObj = t.lastIndexOf('}');
        const lastArr = t.lastIndexOf(']');
        const lastClose = Math.max(lastObj, lastArr);
        const nextChar = lastClose >= 0 && lastClose + 1 < t.length ? t[lastClose + 1] : null;
        const nextCode = nextChar ? nextChar.charCodeAt(0) : null;
        console.error('[i18n-diff][de.json] debug', {
          length: t.length,
          lastObj,
          lastArr,
          lastClose,
          nextChar,
          nextCode
        });
      }
      console.error(`[i18n-diff] Failed to parse JSON: ${p}`);
      throw err;
    }
  }
}

function cropToBalancedJSON(s) {
  let i = 0;
  while (i < s.length && /\s/.test(s[i])) i++;
  if (i >= s.length) return null;
  const first = s[i];
  if (first !== '{' && first !== '[') {
    const a = s.indexOf('{', i);
    const b = s.indexOf('[', i);
    if (a === -1 && b === -1) return null;
    i = (a === -1) ? b : (b === -1 ? a : Math.min(a, b));
  }
  let inStr = false;
  let escape = false;
  let depthObj = 0;
  let depthArr = 0;
  let started = false;
  for (let j = i; j < s.length; j++) {
    const ch = s[j];
    if (inStr) {
      if (escape) { escape = false; continue; }
      if (ch === '\\') { escape = true; continue; }
      if (ch === '"') { inStr = false; continue; }
      continue;
    }
    if (ch === '"') { inStr = true; continue; }
    if (ch === '{') { depthObj++; started = true; }
    else if (ch === '}') { depthObj--; }
    else if (ch === '[') { depthArr++; started = true; }
    else if (ch === ']') { depthArr--; }
    if (started && depthObj === 0 && depthArr === 0) {
      return s.slice(i, j + 1);
    }
  }
  return null;
}

function flatten(obj, prefix = '') {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(out, flatten(v, key));
    } else {
      out[key] = true;
    }
  }
  return out;
}

const de = readJSON('src/locales/de.json');
const en = readJSON('src/locales/en.json');
const deKeys = flatten(de);
const enKeys = flatten(en);

const missingInDe = Object.keys(enKeys).filter((k) => !deKeys[k]).sort();
const missingInEn = Object.keys(deKeys).filter((k) => !enKeys[k]).sort();

function print(title, arr) {
  console.log(`${title}: ${arr.length}`);
  if (arr.length) {
    for (const k of arr) console.log(` - ${k}`);
  }
}

print('Missing in de (present in en)', missingInDe);
print('Missing in en (present in de)', missingInEn);

