import fs from 'node:fs';
import path from 'node:path';

function readJson(filePath: string) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function flattenKeys(obj: any, prefix = ''): string[] {
  const keys: string[] = [];
  if (obj === null || obj === undefined) return keys;
  const isObject = typeof obj === 'object';
  if (!isObject) {
    keys.push(prefix.replace(/^\./, ''));
    return keys;
  }
  if (Array.isArray(obj)) {
    obj.forEach((val, idx) => {
      const nextPrefix = prefix ? `${prefix}[${idx}]` : `[${idx}]`;
      keys.push(...flattenKeys(val, nextPrefix));
    });
    return keys;
  }
  for (const k of Object.keys(obj)) {
    const nextPrefix = prefix ? `${prefix}.${k}` : k;
    keys.push(...flattenKeys(obj[k], nextPrefix));
  }
  return keys;
}

function diffKeys(aKeys: Set<string>, bKeys: Set<string>) {
  const missingInB: string[] = [];
  for (const k of aKeys) if (!bKeys.has(k)) missingInB.push(k);
  missingInB.sort();
  return missingInB;
}

function main() {
  const root = process.cwd();
  const localesDir = path.join(root, 'src', 'locales');
  const enPath = path.join(localesDir, 'en.json');
  const dePath = path.join(localesDir, 'de.json');
  if (!fs.existsSync(enPath) || !fs.existsSync(dePath)) {
    console.error('Missing en.json or de.json in src/locales');
    process.exit(1);
  }
  const en = readJson(enPath);
  const de = readJson(dePath);

  const enKeys = new Set(flattenKeys(en));
  const deKeys = new Set(flattenKeys(de));

  const missingInEN = diffKeys(deKeys, enKeys);
  const missingInDE = diffKeys(enKeys, deKeys);

  const cap = 50;
  const moreEN = Math.max(0, missingInEN.length - cap);
  const moreDE = Math.max(0, missingInDE.length - cap);

  // Summary
  console.log('i18n key diff summary');
  console.log('---------------------');
  console.log(`Total EN keys: ${enKeys.size}`);
  console.log(`Total DE keys: ${deKeys.size}`);
  console.log(`Missing in EN: ${missingInEN.length}`);
  console.log(`Missing in DE: ${missingInDE.length}`);
  console.log('');

  // Details (capped)
  const printList = (title: string, list: string[], more: number) => {
    console.log(title);
    if (list.length === 0) {
      console.log('  none');
      return;
    }
    list.slice(0, cap).forEach((k) => console.log('  ' + k));
    if (more > 0) console.log(`  ... and ${more} more`);
    console.log('');
  };

  printList('Missing in EN (present in DE):', missingInEN, moreEN);
  printList('Missing in DE (present in EN):', missingInDE, moreDE);

  // Exit code for CI friendliness
  if (missingInEN.length > 0 || missingInDE.length > 0) {
    process.exitCode = 0; // non-breaking; change to 1 to fail CI
  }
}

main();
