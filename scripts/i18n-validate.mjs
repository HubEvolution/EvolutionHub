#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';

const ROOT = process.cwd();
const LOCALES_DIR = path.join(ROOT, 'src', 'locales');
const FILES = ['en.json', 'de.json'];
const BASE_KEYS = ['pages.home', 'pages.datenschutz'];

function isObject(val) {
  return val && typeof val === 'object' && !Array.isArray(val);
}

function typeOf(val) {
  if (Array.isArray(val)) return 'array';
  return typeof val;
}

function getAtPath(obj, basePath) {
  return basePath.split('.').reduce((acc, key) => (acc ? acc[key] : undefined), obj);
}

function collectSchema(obj, prefix = '') {
  const schema = {};
  if (Array.isArray(obj)) {
    schema[prefix] = 'array';
    // Für Arrays prüfen wir nur den Typ, nicht die Struktur/Längen
    return schema;
  }
  if (!isObject(obj)) {
    schema[prefix] = typeOf(obj);
    return schema;
  }
  // Objekt: Schlüssel rekursiv sammeln
  if (prefix) schema[prefix] = 'object';
  for (const key of Object.keys(obj)) {
    const next = prefix ? `${prefix}.${key}` : key;
    Object.assign(schema, collectSchema(obj[key], next));
  }
  return schema;
}

function diffSchemas(schemaA, schemaB) {
  const missingInB = [];
  const missingInA = [];
  const typeMismatches = [];

  for (const key of Object.keys(schemaA)) {
    if (!(key in schemaB)) {
      missingInB.push(key);
    } else if (schemaA[key] !== schemaB[key]) {
      typeMismatches.push({ key, a: schemaA[key], b: schemaB[key] });
    }
  }
  for (const key of Object.keys(schemaB)) {
    if (!(key in schemaA)) {
      missingInA.push(key);
    }
  }
  return { missingInB, missingInA, typeMismatches };
}

async function readJSON(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

async function main() {
  try {
    const [en, de] = await Promise.all(
      FILES.map((f) => readJSON(path.join(LOCALES_DIR, f)))
    );

    const problems = [];

    for (const base of BASE_KEYS) {
      const enNode = getAtPath(en, base);
      const deNode = getAtPath(de, base);

      if (enNode === undefined) {
        problems.push(`EN: Schlüssel-Basis fehlt: ${base}`);
        continue;
      }
      if (deNode === undefined) {
        problems.push(`DE: Schlüssel-Basis fehlt: ${base}`);
        continue;
      }

      const enSchema = collectSchema(enNode, base);
      const deSchema = collectSchema(deNode, base);

      const { missingInB, missingInA, typeMismatches } = diffSchemas(enSchema, deSchema);
      if (missingInB.length) {
        problems.push(`DE: Fehlende Schlüssel relativ zu EN unter ${base} ->\n  - ` + missingInB.join('\n  - '));
      }
      if (missingInA.length) {
        problems.push(`EN: Fehlende Schlüssel relativ zu DE unter ${base} ->\n  - ` + missingInA.join('\n  - '));
      }
      if (typeMismatches.length) {
        problems.push(
          `Typkonflikte unter ${base}:\n` +
            typeMismatches
              .map((m) => `  - ${m.key}: EN=${m.a} vs DE=${m.b}`)
              .join('\n')
        );
      }
    }

    if (problems.length) {
      console.error('[i18n:validate] Probleme gefunden:\n' + problems.join('\n'));
      process.exit(1);
    }

    console.log('[i18n:validate] OK: Strukturen sind konsistent für', BASE_KEYS.join(', '));
  } catch (err) {
    console.error('[i18n:validate] Fehler:', err?.message || String(err));
    process.exit(1);
  }
}

main();
