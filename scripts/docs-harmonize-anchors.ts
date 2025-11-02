/*
 * docs-harmonize-anchors.ts
 *
 * Purpose: Harmonize all internal anchor links in docs/** to a canonical ASCII-only slug policy.
 * Policy (Canonical Slug for MD051 "github.com"):
 *  - Canonical uses GitHub-style: lowercase, diacritics removed to ASCII, spaces→'-', punctuation stripped
 *  - Duplicate slugs within a file get suffixed with -2, -3, ...
 *  - Additionally, we support fuzzy mapping from German transliteration (ä→ae, ö→oe, ü→ue, ß→ss) to the canonical slug
 *
 * Behavior:
 *  - Parses headings (ATX and basic Setext) outside of fenced code blocks
 *  - Computes canonical slugs per heading according to the policy
 *  - Rewrites all intra-file links of the form ](#fragment) to the canonical slug
 *  - Optionally injects alias <a id="..."> for whitelisted legacy fragments (rare)
 *  - Outputs a concise summary; dry-run by default; use --write to apply changes
 *
 * Usage:
 *  - Dry run:  npx tsx scripts/docs-harmonize-anchors.ts
 *  - Write:     npx tsx scripts/docs-harmonize-anchors.ts --write
 *
 * Notes:
 *  - This script intentionally does not change heading text content.
 *  - Run after generating/refreshing TOCs (doctoc) so that TOC links are also harmonized.
 */

import fs from 'node:fs';
import path from 'node:path';
import { globby } from 'globby';
import GithubSlugger from 'github-slugger';

const WRITE = process.argv.includes('--write');

// Optional whitelist for legacy/public fragments that should remain as alias anchors in addition to the canonical one.
// Map: file path (glob) → array of fragment strings to alias under matched file(s)
const ALIAS_WHITELIST: Record<string, string[]> = {
  // Example:
  // 'docs/api/public_api.md': ['1-kommentare-api', 'kommentare-api']
};

// Apply German transliteration to build fuzzy legacy fragments (not canonical).
function transliterateGerman(input: string): string {
  return input
    .replace(/Ä/g, 'Ae')
    .replace(/Ö/g, 'Oe')
    .replace(/Ü/g, 'Ue')
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss');
}

// Legacy/fuzzy transliteration variant (ä→ae etc.) to help map older links/policies
function toGermanTranslitSlug(raw: string): string {
  const lower = transliterateGerman(raw)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '');
  let s = lower.replace(/\s+/g, '-');
  s = s.replace(/[^a-z0-9-]/g, '');
  s = s.replace(/-+/g, '-').replace(/^-+|-+$/g, '');
  return s;
}

type Heading = {
  lineIndex: number;
  level: number; // 1..6 for ATX, inferred 1..2 for Setext
  text: string;
  canonical: string;
  legacy: string; // for fuzzy mapping
  duplicatesIndex: number; // 1 for first, 2 for '-2', etc.
  finalSlug: string;
};

function matchGlob(file: string, pattern: string): boolean {
  if (pattern === file) return true;
  // Very small glob matcher: supports '**' and '*' for whitelist convenience
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '.*')
    .replace(/\*/g, '[^/]*');
  const re = new RegExp('^' + escaped + '$');
  return re.test(file);
}

async function main() {
  const root = process.cwd();
  const files = await globby(['docs/**/*.md', '!docs/_generated/**']);

  let totalChanged = 0;
  let totalLinksRewritten = 0;
  let totalAliasesInjected = 0;

  for (const file of files) {
    const abs = path.join(root, file);
    const original = fs.readFileSync(abs, 'utf8');
    const lines = original.split(/\r?\n/);

    const inCodeBlock: boolean[] = new Array(lines.length).fill(false);
    // Track fenced code blocks to avoid matching headings inside them
    let code = false;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (/^```/.test(l)) {
        code = !code;
      }
      inCodeBlock[i] = code;
    }

    const headings: Heading[] = [];
    const atx = /^(#{1,6})\s+(.*)$/; // ATX style

    for (let i = 0; i < lines.length; i++) {
      if (inCodeBlock[i]) continue;
      const m = lines[i].match(atx);
      if (m) {
        const level = m[1].length;
        const text = m[2].trim();
        headings.push({
          lineIndex: i,
          level,
          text,
          canonical: '', // will be set by slugger later
          legacy: toGermanTranslitSlug(text),
          duplicatesIndex: 0,
          finalSlug: '',
        });
        continue;
      }
      // Setext-style H1/H2: a line of text followed by === or ---
      if (i + 1 < lines.length && !inCodeBlock[i + 1]) {
        const underline = lines[i + 1];
        if (/^==+\s*$/.test(underline) || /^--+\s*$/.test(underline)) {
          const level = /^==/.test(underline) ? 1 : 2;
          const text = lines[i].trim();
          if (text.length > 0) {
            headings.push({
              lineIndex: i,
              level,
              text,
              canonical: '', // will be set by slugger later
              legacy: toGermanTranslitSlug(text),
              duplicatesIndex: 0,
              finalSlug: '',
            });
          }
          i++; // skip underline next loop
        }
      }
    }

    // De-duplicate final slugs per file according to policy, suffix with -2, -3...
    // Compute canonical unique slugs using GitHub Slugger (exact MD051 behavior)
    const slugger = new GithubSlugger();
    for (const h of headings) {
      const unique = slugger.slug(h.text);
      h.duplicatesIndex = 1; // slugger encodes duplicates in the slug itself
      h.finalSlug = unique;
      h.canonical = unique; // override to reflect final canonical fragment
    }

    if (headings.length === 0) {
      continue;
    }

    // Valid fragments (final slugs) present in this file
    const validFragments = new Set<string>();
    for (const h of headings) validFragments.add(h.finalSlug);

    // Build mapping of legacy/fragments to canonical final slug (fuzzy),
    // preferring the FIRST occurrence for duplicate headings.
    const fragmentMap = new Map<string, string>();
    const setIfMissing = (k: string, v: string) => {
      if (!k) return;
      if (!fragmentMap.has(k)) fragmentMap.set(k, v);
    };
    // Additional fuzzy variant: ASCII drop (diacritics removed, non a-z0-9 dropped)
    const toAsciiDropSlug = (raw: string): string =>
      raw
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
    for (const h of headings) {
      setIfMissing(h.finalSlug, h.finalSlug); // identity
      setIfMissing(h.canonical, h.finalSlug);
      setIfMissing(h.legacy, h.finalSlug);
      // Also map a simple variant (spaces->- from raw text)
      setIfMissing(h.text.toLowerCase().replace(/\s+/g, '-'), h.finalSlug);
      setIfMissing(toAsciiDropSlug(h.text), h.finalSlug);
    }

    // Rewrite intra-file links ](#...)
    let linkRewrites = 0;
    const linkRe = /(\]\(#)([^)]+)(\))/g;
    const updated = original.replace(linkRe, (full, a, frag, c) => {
      const key = frag.trim().toLowerCase();
      // If already a valid fragment, keep as-is
      if (validFragments.has(key)) return full;
      const mapped = fragmentMap.get(key);
      if (mapped && mapped !== key) {
        linkRewrites++;
        return `${a}${mapped}${c}`;
      }
      return full;
    });

    // Optionally inject alias anchors after headings when whitelisted
    let aliasInjectedForFile = 0;
    const aliasPatterns = Object.keys(ALIAS_WHITELIST).filter((p) => matchGlob(file, p));
    let withAliases = updated;
    if (aliasPatterns.length > 0) {
      const aliases = new Set<string>();
      for (const p of aliasPatterns) {
        for (const frag of ALIAS_WHITELIST[p]) aliases.add(frag);
      }
      if (aliases.size > 0) {
        // Insert an alias anchor directly below the heading line
        const split = withAliases.split(/\r?\n/);
        // Build quick lookup from lineIndex to finalSlug
        const lineToSlug = new Map<number, string>();
        for (const h of headings) {
          lineToSlug.set(h.lineIndex, h.finalSlug);
        }
        for (let i = 0; i < split.length; i++) {
          const m = split[i].match(atx);
          if (!m) continue;
          const h = headings.find((x) => x.lineIndex === i);
          if (!h) continue;
          // for each alias fragment that maps to this heading, insert alias anchor
          for (const alt of aliases) {
            const mapped = fragmentMap.get(alt);
            if (mapped && mapped === h.finalSlug) {
              // Insert alias only if not already present in the following line
              const nextLine = split[i + 1] || '';
              const aliasTag = `<a id="${alt}"></a>`;
              if (!nextLine.includes(aliasTag)) {
                split.splice(i + 1, 0, aliasTag);
                aliasInjectedForFile++;
              }
            }
          }
        }
        withAliases = split.join('\n');
      }
    }

    const changed = withAliases !== original;
    if (changed) {
      totalChanged++;
      totalLinksRewritten += linkRewrites;
      totalAliasesInjected += aliasInjectedForFile;
      if (WRITE) {
        fs.writeFileSync(abs, withAliases, 'utf8');
      }
    }

    // Also output per-file summary in dry-run to help review
    if (!WRITE && (linkRewrites > 0 || aliasInjectedForFile > 0)) {
      console.log(`~ ${file}: links→${linkRewrites}${aliasInjectedForFile ? `, aliases→${aliasInjectedForFile}` : ''}`);
    }
  }

  console.log(
    `${WRITE ? 'Applied' : 'Planned'}: filesChanged=${totalChanged}, linksRewritten=${totalLinksRewritten}, aliasesInjected=${totalAliasesInjected}`
  );
}

main().catch((err) => {
  console.error('docs-harmonize-anchors failed:', err);
  process.exit(1);
});
