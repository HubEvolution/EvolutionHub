#!/usr/bin/env node

// Update changelog entries in selected Windsurf rules files.
// Usage:
//   node scripts/dev/update-rules-changelog.mjs --date 2025-12-08 --text "Hook-Scope klargezogen"

import fs from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_FILES = ['.windsurf/rules/_README.md', '.windsurf/rules/tooling-and-style.md'];

function parseArgs(argv) {
  const args = { date: null, text: null, files: DEFAULT_FILES };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--date' && argv[i + 1]) {
      args.date = argv[i + 1];
      i += 1;
    } else if (arg === '--text' && argv[i + 1]) {
      args.text = argv[i + 1];
      i += 1;
    } else if (arg === '--files' && argv[i + 1]) {
      args.files = argv[i + 1]
        .split(',')
        .map((f) => f.trim())
        .filter(Boolean);
      i += 1;
    }
  }
  if (!args.date || !args.text) {
    throw new Error('Usage: --date YYYY-MM-DD --text "Changelog entry" [--files fileA,fileB]');
  }
  return args;
}

function insertChangelog(content, entry) {
  const marker = '## Changelog';
  const lines = content.split('\n');
  const markerIdx = lines.findIndex((line) => line.trim() === marker);
  if (markerIdx === -1) {
    throw new Error('Changelog marker not found');
  }

  // Insert right after the marker (skip one empty line if present).
  let insertIdx = markerIdx + 1;
  if (lines[insertIdx]?.trim() === '') {
    insertIdx += 1;
  }

  // Avoid duplicate entry.
  if (lines.some((line) => line.trim() === entry)) {
    return content;
  }

  lines.splice(insertIdx, 0, entry);
  return lines.join('\n');
}

async function updateFile(filePath, entry) {
  const absPath = path.resolve(process.cwd(), filePath);
  const original = await fs.readFile(absPath, 'utf8');
  const updated = insertChangelog(original, entry);
  if (updated !== original) {
    await fs.writeFile(absPath, updated, 'utf8');
    console.log(`Updated: ${filePath}`);
  } else {
    console.log(`Unchanged (entry exists): ${filePath}`);
  }
}

async function main() {
  const { date, text, files } = parseArgs(process.argv.slice(2));
  const entry = `- ${date}: ${text}`;

  for (const file of files) {
    try {
      await updateFile(file, entry);
    } catch (err) {
      console.error(`Failed to update ${file}:`, err instanceof Error ? err.message : String(err));
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
