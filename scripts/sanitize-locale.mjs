#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

function cropToBalancedJSON(s) {
  let i = 0;
  while (i < s.length && /\s/.test(s[i])) i++;
  if (i >= s.length) return null;
  if (s[i] !== '{' && s[i] !== '[') {
    const a = s.indexOf('{', i);
    const b = s.indexOf('[', i);
    if (a === -1 && b === -1) return null;
    i = a === -1 ? b : b === -1 ? a : Math.min(a, b);
  }
  let inStr = false;
  let esc = false;
  let depthO = 0;
  let depthA = 0;
  let started = false;
  for (let j = i; j < s.length; j++) {
    const ch = s[j];
    if (inStr) {
      if (esc) {
        esc = false;
        continue;
      }
      if (ch === '\\') {
        esc = true;
        continue;
      }
      if (ch === '"') {
        inStr = false;
        continue;
      }
      continue;
    }
    if (ch === '"') {
      inStr = true;
      continue;
    }
    if (ch === '{') {
      depthO++;
      started = true;
    } else if (ch === '}') {
      depthO--;
    } else if (ch === '[') {
      depthA++;
      started = true;
    } else if (ch === ']') {
      depthA--;
    }

    if (started && depthO === 0 && depthA === 0) {
      return s.slice(i, j + 1);
    }
  }
  return null;
}

function sanitizeJSONFile(p) {
  const abs = resolve(p);
  const raw = readFileSync(abs, 'utf8');
  let s = raw
    .replace(/^\uFEFF/, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u2028\u2029]/g, '');
  let obj;
  try {
    obj = JSON.parse(s.trim());
    console.log('Parsed OK without cropping');
  } catch (e1) {
    const cropped = cropToBalancedJSON(s);
    if (!cropped) {
      console.error('Unable to crop balanced JSON - rethrowing original error');
      throw e1;
    }
    obj = JSON.parse(cropped);
    console.log('Parsed OK after balanced cropping');
  }
  const out = JSON.stringify(obj, null, 2) + '\n';
  writeFileSync(abs, out, 'utf8');
  console.log('Rewrote', p, 'len', raw.length, '->', out.length);
}

const target = process.argv[2] || 'src/locales/de.json';
sanitizeJSONFile(target);
