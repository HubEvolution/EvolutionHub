import fs from 'node:fs';
import path from 'node:path';
import { globby } from 'globby';
import GithubSlugger from 'github-slugger';

// Fallback normalization for input fragments to help map to canonical slugger output
function looseNormalize(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[–—−]/g, '-')
    .toLowerCase()
    .replace(/[^a-z0-9\s\-]/g, '')
    .trim()
    .replace(/[\s\-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function buildHeadingSlugMap(lines: string[]) {
  const slugger = new GithubSlugger();
  const canonicalSet = new Set<string>();
  const aliasToCanonical = new Map<string, string>();
  const allCanonicals: string[] = [];
  for (const line of lines) {
    const m = line.match(/^(#{1,6})\s+(.*)$/);
    if (!m) continue;
    const title = m[2].trim();
    const canonical = slugger.slug(title);
    canonicalSet.add(canonical);
    allCanonicals.push(canonical);
    aliasToCanonical.set(canonical, canonical);
    // add loose variants
    aliasToCanonical.set(looseNormalize(title), canonical);
    aliasToCanonical.set(looseNormalize(canonical), canonical);
  }
  return { canonicalSet, aliasToCanonical, allCanonicals };
}

function levenshtein(a: string, b: string): number {
  const n = a.length;
  const m = b.length;
  if (n === 0) return m;
  if (m === 0) return n;
  const dp = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = 0; i <= n; i++) dp[i][0] = i;
  for (let j = 0; j <= m; j++) dp[0][j] = j;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[n][m];
}

function fixFile(content: string) {
  const lines = content.split(/\r?\n/);
  const { canonicalSet, aliasToCanonical, allCanonicals } = buildHeadingSlugMap(lines);
  let changed = false;

  const linkRe = /(\]\(#)([^)]+)(\))/g; // matches ](#fragment)

  let next = content.replace(linkRe, (full, a, frag, c) => {
    const raw = decodeURIComponent(frag);
    // If already canonical, keep
    if (canonicalSet.has(raw)) return full;
    // Try exact alias mapping
    const try1 = aliasToCanonical.get(raw) || aliasToCanonical.get(looseNormalize(raw));
    if (try1) {
      changed = true;
      return `${a}${try1}${c}`;
    }
    const try2 = aliasToCanonical.get(frag) || aliasToCanonical.get(looseNormalize(frag));
    if (try2) {
      changed = true;
      return `${a}${try2}${c}`;
    }
    // Fuzzy match: includes or small Levenshtein distance
    const norm = looseNormalize(raw);
    let best: { slug: string; score: number } | null = null;
    for (const cand of allCanonicals) {
      if (cand.includes(norm) || norm.includes(cand)) {
        const score = Math.abs(cand.length - norm.length);
        if (!best || score < best.score) best = { slug: cand, score };
        continue;
      }
      const dist = levenshtein(norm, cand);
      const threshold = Math.max(2, Math.ceil(Math.min(norm.length, cand.length) * 0.2));
      if (dist <= threshold) {
        if (!best || dist < best.score) best = { slug: cand, score: dist };
      }
    }
    if (best) {
      changed = true;
      return `${a}${best.slug}${c}`;
    }
    return full;
  });

  // Second pass: collect all link fragments and inject anchors for those without existing id
  const existingAnchorIds = new Set<string>();
  const idAttrRe = /id="([^"]+)"/i;
  // scan entire rendered content for any id="..."
  next.split(/\r?\n/).forEach((l) => {
    const m = l.match(idAttrRe);
    if (m) existingAnchorIds.add(m[1]);
  });
  const missing = new Set<string>();
  next.replace(linkRe, (_full, _a, frag, _c) => {
    const id = decodeURIComponent(frag);
    if (!existingAnchorIds.has(id)) missing.add(id);
    return _full;
  });
  if (missing.size > 0) {
    const injected: string[] = [];
    injected.push('');
    injected.push('<!-- auto-inserted anchor aliases for internal links -->');
    for (const id of missing) {
      injected.push(`<a id="${id}"></a>`);
    }
    injected.push('');
    const firstHeadingIdx = lines.findIndex((l) => /^#{1,6}\s+/.test(l));
    if (firstHeadingIdx >= 0) {
      const before = lines.slice(0, firstHeadingIdx + 1);
      const after = lines.slice(firstHeadingIdx + 1);
      next = [...before, ...injected, ...after].join('\n');
    } else {
      next = injected.join('\n') + '\n' + next;
    }
    changed = true;
  }

  return { next, changed };
}

async function main() {
  const files = await globby('docs/**/*.md');
  const changed: string[] = [];
  for (const file of files) {
    const abs = path.resolve(file);
    const old = fs.readFileSync(abs, 'utf8');
    const { next, changed: did } = fixFile(old);
    if (did) {
      fs.writeFileSync(abs, next, 'utf8');
      changed.push(file);
    }
  }
  console.log(JSON.stringify({ changedCount: changed.length, changed }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
