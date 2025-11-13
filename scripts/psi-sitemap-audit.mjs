#!/usr/bin/env node
// Minimal PSI audit runner: fetches URLs from a sitemap or a list and queries
// PageSpeed Insights v5 API, printing a compact summary.
// No external deps; requires Node 18+ (global fetch) and a valid API key.

/*
Usage examples:

  node scripts/psi-sitemap-audit.mjs --sitemap https://example.com/sitemap.xml \
    --sample 20 --strategy mobile --categories performance,seo --concurrency 4

  node scripts/psi-sitemap-audit.mjs --urls ./urls.txt --strategy desktop

Env:
  PAGESPEED_API_KEY  (or pass --key)
*/

const HELP = `
psi-sitemap-audit.mjs

Options:
  --sitemap <url>          Source sitemap.xml URL
  --urls <file>            Plain text file with one URL per line
  --sample <n>             Sample N URLs from sitemap (default: 10)
  --strategy <s>           mobile | desktop (default: mobile)
  --categories <list>      Comma-separated: performance,seo,accessibility,best-practices (default: performance,seo,best-practices,accessibility)
  --concurrency <n>        Parallel requests (default: 3)
  --key <k>                PageSpeed API key (fallback: env PAGESPEED_API_KEY)
  --json                   Print machine-readable JSON in addition to table
  --help                   Show help
`;

import fs from 'node:fs/promises';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') args.help = true;
    else if (a === '--sitemap') args.sitemap = argv[++i];
    else if (a === '--urls') args.urlsFile = argv[++i];
    else if (a === '--sample') args.sample = Number(argv[++i]);
    else if (a === '--strategy') args.strategy = argv[++i];
    else if (a === '--categories') args.categories = argv[++i];
    else if (a === '--concurrency') args.concurrency = Number(argv[++i]);
    else if (a === '--key') args.key = argv[++i];
    else if (a === '--json') args.json = true;
  }
  return args;
}

function pickSample(items, n) {
  if (!n || n >= items.length) return items;
  const out = [];
  const step = Math.max(1, Math.floor(items.length / n));
  for (let i = 0; i < items.length && out.length < n; i += step) out.push(items[i]);
  return out;
}

async function readUrlsFromFile(file) {
  const content = await fs.readFile(file, 'utf8');
  return content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

async function readUrlsFromSitemap(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch sitemap: ${res.status} ${res.statusText}`);
  const xml = await res.text();
  const urls = Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g)).map((m) => m[1].trim());
  // Handle sitemap indexes by including nested sitemap <loc> entries if present
  const nestedSitemaps = Array.from(xml.matchAll(/<sitemap>\s*<loc>([^<]+)<\/loc>/g)).map((m) =>
    m[1].trim()
  );
  for (const sm of nestedSitemaps) {
    try {
      const nested = await readUrlsFromSitemap(sm);
      urls.push(...nested);
    } catch {
      // ignore nested fetch errors to keep run resilient
    }
  }
  return urls;
}

function buildPsiUrl({ url, strategy, categories, key }) {
  const base = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
  const params = new URLSearchParams({ url, strategy });
  for (const c of categories) params.append('category', c);
  if (key) params.set('key', key);
  return `${base}?${params.toString()}`;
}

async function runPsi(url, opts) {
  const endpoint = buildPsiUrl({
    url,
    strategy: opts.strategy,
    categories: opts.categories,
    key: opts.key,
  });
  const res = await fetch(endpoint);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`PSI error ${res.status}: ${body.slice(0, 200)}`);
  }
  const json = await res.json();
  const lr = json.lighthouseResult || {};
  const cats = lr.categories || {};
  const score = (name) => (cats[name]?.score != null ? Math.round(cats[name].score * 100) : null);
  return {
    url,
    strategy: opts.strategy,
    performance: score('performance'),
    seo: score('seo'),
    accessibility: score('accessibility'),
    bestPractices: score('best-practices'),
  };
}

async function pool(items, limit, worker) {
  const results = [];
  let i = 0;
  let active = 0;
  let rej;
  return await new Promise((resolve, reject) => {
    rej = reject;
    const maybeNext = () => {
      if (i >= items.length && active === 0) return resolve(results);
      while (active < limit && i < items.length) {
        const idx = i++;
        active++;
        Promise.resolve(worker(items[idx], idx))
          .then((r) => {
            results[idx] = r;
            active--;
            maybeNext();
          })
          .catch((err) => {
            reject(err);
          });
      }
    };
    maybeNext();
  });
}

function printTable(rows) {
  const pad = (s, w) => `${(s ?? '').toString()}`.padEnd(w);
  const cols = [
    { k: 'strategy', w: 8 },
    { k: 'performance', w: 12 },
    { k: 'seo', w: 6 },
    { k: 'accessibility', w: 14 },
    { k: 'bestPractices', w: 15 },
    { k: 'url', w: 0 },
  ];
  const header = cols.map((c) => (c.w ? pad(c.k, c.w) : c.k)).join('  ');
  console.log(header);
  console.log('-'.repeat(Math.min(120, header.length)));
  for (const r of rows) {
    console.log(cols.map((c) => (c.w ? pad(r[c.k], c.w) : r[c.k])).join('  '));
  }
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    console.log(HELP);
    return;
  }

  const strategy = (args.strategy || 'mobile').toLowerCase();
  if (!['mobile', 'desktop'].includes(strategy))
    throw new Error('Invalid --strategy (mobile|desktop)');
  const categories = (args.categories || 'performance,seo,best-practices,accessibility')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const concurrency = Number.isFinite(args.concurrency) ? Math.max(1, args.concurrency) : 3;
  const key = args.key || process.env.PAGESPEED_API_KEY;
  if (!key) {
    // Prompt interactively to avoid leaking keys to shell history
    const rl = createInterface({ input, output });
    const entered = await rl.question('Enter PAGESPEED_API_KEY: ');
    rl.close();
    if (!entered) throw new Error('Missing API key. Set env PAGESPEED_API_KEY or pass --key.');
    args.key = entered.trim();
  } else {
    args.key = key;
  }

  let urls = [];
  if (args.urlsFile) urls = await readUrlsFromFile(args.urlsFile);
  else if (args.sitemap) urls = await readUrlsFromSitemap(args.sitemap);
  else throw new Error('Provide --sitemap <url> or --urls <file>');

  const sample = Number.isFinite(args.sample) ? Math.max(1, args.sample) : 10;
  const picked = pickSample(urls, sample);
  if (picked.length === 0) throw new Error('No URLs found to audit');

  console.log(
    `Auditing ${picked.length} URLs with strategy=${strategy} categories=${categories.join(',')} concurrency=${concurrency}`
  );
  const rows = await pool(picked, concurrency, (u) =>
    runPsi(u, {
      strategy,
      categories,
      key: args.key,
    })
  );
  printTable(rows);
  if (args.json) {
    console.log(JSON.stringify({ strategy, categories, results: rows }, null, 2));
  }
}

main().catch((err) => {
  console.error('[psi-sitemap-audit] Error:', err.message || err);
  process.exit(1);
});
