import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import YAML from 'yaml';

type Json = any;

function uniqueSorted<T>(arr: T[]): T[] {
  return Array.from(new Set(arr)).sort((x: any, y: any) => (x > y ? 1 : x < y ? -1 : 0));
}

function isNumericEnumAnyOf(node: any): boolean {
  if (!node || typeof node !== 'object' || !Array.isArray(node.anyOf)) return false;
  return node.anyOf.every(
    (alt: any) => alt && typeof alt === 'object' && (alt.type === 'number' || alt.type === 'integer') && Array.isArray(alt.enum)
  );
}

function normalize(node: any): any {
  if (Array.isArray(node)) return node.map((n) => normalize(n));
  if (node && typeof node === 'object') {
    if (isNumericEnumAnyOf(node)) {
      const values = node.anyOf.flatMap((alt: any) => alt.enum ?? []);
      const ints = values.map((v: any) => (typeof v === 'number' ? (Number.isInteger(v) ? v : v) : v));
      return { type: 'integer', enum: uniqueSorted(ints) };
    }
    const out: Record<string, any> = {};
    for (const k of Object.keys(node)) {
      // Ignore documentation-only fields
      if (k === 'description' || k === 'example') continue;
      out[k] = normalize(node[k]);
    }
    if (Array.isArray(out.enum)) {
      out.enum = uniqueSorted(out.enum);
      const allNums = out.enum.every((v: any) => typeof v === 'number');
      const allInts = allNums && out.enum.every((v: number) => Number.isInteger(v));
      if (allNums && (out.type === 'number' || out.type === 'integer' || !out.type)) out.type = allInts ? 'integer' : 'number';
    }
    return out;
  }
  return node;
}

function deepEqual(a: Json, b: Json): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a && b && typeof a === 'object') {
    if (Array.isArray(a)) {
      if (!Array.isArray(b) || a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) if (!deepEqual(a[i], b[i])) return false;
      return true;
    }
    const ak = Object.keys(a).sort();
    const bk = Object.keys(b).sort();
    if (!deepEqual(ak, bk)) return false;
    for (const k of ak) if (!deepEqual(a[k], b[k])) return false;
    return true;
  }
  return false;
}

const root = process.cwd();
const pilotPath = resolve(root, 'reports', 'zod-openapi-pilot.components.json');
const openapiPath = resolve(root, 'openapi.yaml');

if (!existsSync(pilotPath)) {
  console.error('Pilot components not found. Run `npm run openapi:zod:pilot` first.');
  process.exit(2);
}

const pilotSchemasRaw = JSON.parse(readFileSync(pilotPath, 'utf-8')) as Record<string, Json>;
const openapiDocRaw = YAML.parse(readFileSync(openapiPath, 'utf-8')) as Json;
const yamlSchemasRaw = (openapiDocRaw?.components?.schemas ?? {}) as Record<string, Json>;

// Normalize both sides for fair comparison
const pilotSchemas: Record<string, Json> = {};
for (const k of Object.keys(pilotSchemasRaw)) pilotSchemas[k] = normalize(pilotSchemasRaw[k]);
const yamlSchemas: Record<string, Json> = {};
for (const k of Object.keys(yamlSchemasRaw)) yamlSchemas[k] = normalize(yamlSchemasRaw[k]);

const pilotOnly: string[] = [];
const yamlOnly: string[] = [];
const overlapChanged: string[] = [];

const pilotKeys = Object.keys(pilotSchemas).sort();
const yamlKeys = Object.keys(yamlSchemas).sort();

for (const k of pilotKeys) {
  if (!(k in yamlSchemas)) {
    pilotOnly.push(k);
  } else if (!deepEqual(pilotSchemas[k], yamlSchemas[k])) {
    overlapChanged.push(k);
  }
}
for (const k of yamlKeys) {
  if (!(k in pilotSchemas)) yamlOnly.push(k);
}

const report = { timestamp: new Date().toISOString(), overlapChanged, pilotOnly, yamlOnly };

const outDir = resolve(root, 'reports');
mkdirSync(outDir, { recursive: true });
const outPath = resolve(outDir, 'zod-openapi-diff.json');
writeFileSync(outPath, JSON.stringify(report, null, 2));

console.log('Zod↔OpenAPI Components Diff');
console.log(`Changed (overlap): ${overlapChanged.length ? overlapChanged.join(', ') : '-'}`);
console.log(`Pilot-only: ${pilotOnly.length ? pilotOnly.join(', ') : '-'}`);
console.log(`YAML-only: ${yamlOnly.length ? yamlOnly.join(', ') : '-'}`);
console.log(`Report: ${outPath}`);
