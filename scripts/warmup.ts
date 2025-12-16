#!/usr/bin/env tsx

/**
 * Warmup script: Pre-warms key pages and lightweight API endpoints after deploy.
 * Usage:
 *   tsx scripts/warmup.ts --url <BASE_URL> [--env production|staging|testing] [--concurrency 4]
 * Exit codes:
 *   0 = health ok (and warmup attempted); 1 = health failed
 */

import fs from 'node:fs';
import path from 'node:path';
import { config as dotenvConfig } from 'dotenv';
import chalk from 'chalk';

function loadDotenv() {
  const root = process.cwd();
  const candidates = ['.env', '.env.local'];
  if (!process.env.DOTENV_CONFIG_QUIET) {
    process.env.DOTENV_CONFIG_QUIET = 'true';
  }
  for (const rel of candidates) {
    const p = path.join(root, rel);
    if (fs.existsSync(p)) {
      dotenvConfig({ path: p });
    }
  }
}

loadDotenv();

const DEFAULT_CONCURRENCY = 4;
const REQUEST_TIMEOUT_MS = 10_000;
const RETRIES = 1; // light retry for warmup
const DEFAULT_SLOW_MS = 1500;

type WarmupOutcome = 'ok' | 'warn' | 'fail';

type WarmupItem = {
  label: string;
  path: string;
  outcome: WarmupOutcome;
  httpStatus?: number;
  ms?: number;
  attempts: number;
  err?: string;
};

function formatOutcome(outcome: WarmupOutcome): string {
  if (outcome === 'ok') return chalk.green('OK');
  if (outcome === 'warn') return chalk.yellow('WARN');
  return chalk.red('FAIL');
}

function printHeader(baseUrl: string, envLabel: string | undefined, opts: { verbose: boolean; concurrency: number; slowMs: number }) {
  const title = chalk.magentaBright(chalk.bold('WARMUP'));
  const target = chalk.cyanBright(baseUrl);
  const env = envLabel ? chalk.gray(` [${envLabel}]`) : '';
  const mode = chalk.gray(`mode=${opts.verbose ? 'verbose' : 'compact'}`);
  const perf = chalk.gray(`c=${opts.concurrency} slow>=${opts.slowMs}ms`);
  const legend = `${chalk.green('OK')} ${chalk.gray('/')} ${chalk.yellow('WARN')} ${chalk.gray('/')} ${chalk.red('FAIL')}`;

  console.log(`${title} ${target}${env}`);
  console.log(`${mode} ${perf}  ${chalk.gray('•')} ${legend}`);
}

function printSectionHeader(label: string, meta: string) {
  console.log(chalk.cyanBright(`\n┏━ ${chalk.bold(label)} ${chalk.gray(meta)}`));
}

function printSectionFooter(summaryLine: string) {
  console.log(chalk.cyanBright(`┗━ ${summaryLine}`));
}

function stripAnsi(input: string): string {
  return input.replace(/\x1B\[[0-9;]*m/g, '');
}

function padAnsiRight(s: string, len: number): string {
  const plainLen = stripAnsi(s).length;
  if (plainLen >= len) return s;
  return s + ' '.repeat(len - plainLen);
}

function truncateAnsi(input: string, maxLen: number): string {
  if (maxLen <= 0) return '';
  if (stripAnsi(input).length <= maxLen) return input;

  const target = Math.max(0, maxLen - 1);
  let out = '';
  let visible = 0;

  for (let i = 0; i < input.length && visible < target; i += 1) {
    const ch = input[i];

    if (ch === '\x1b' && input[i + 1] === '[') {
      const rest = input.slice(i);
      const m = /^\x1b\[[0-9;]*m/.exec(rest);
      if (m) {
        out += m[0];
        i += m[0].length - 1;
        continue;
      }
    }

    out += ch;
    visible += 1;
  }

  return `${out}…\x1b[0m`;
}

function formatSectionCell(
  label: string,
  meta: string,
  summary: { ok: number; warn: number; fail: number; total: number; p95Ms: number | null; maxMs: number | null },
  extra?: string
): { top: string; bottom: string } {
  const suffix =
    summary.fail > 0
      ? chalk.red(`${summary.fail} fail`)
      : summary.warn > 0
        ? chalk.yellow(`${summary.warn} warn`)
        : chalk.green('all ok');
  const perf =
    summary.p95Ms !== null && summary.maxMs !== null
      ? chalk.gray(`p95 ${summary.p95Ms}ms, max ${summary.maxMs}ms`)
      : '';
  const top = `${chalk.cyanBright(chalk.bold(label))} ${chalk.gray(meta)}`;
  const bottom = `${chalk.gray('summary')} ${summary.ok}/${summary.total} ok, ${suffix} ${perf}${extra ? ` ${extra}` : ''}`;
  return { top, bottom };
}

function printTwoColumnGrid(
  cells: Array<{ top: string; bottom: string }>,
  opts?: { header?: string; headerMeta?: string }
) {
  const width = typeof process.stdout.columns === 'number' ? process.stdout.columns : 120;
  const colWidth = Math.max(40, Math.floor((width - 3) / 2));
  const rightWidth = Math.max(20, width - colWidth - 3);
  if (opts?.header) {
    printSectionHeader(opts.header, opts.headerMeta ?? '');
  }
  for (let i = 0; i < cells.length; i += 2) {
    const left = cells[i];
    const right = cells[i + 1];
    if (right) {
      const leftTop = padAnsiRight(truncateAnsi(left.top, colWidth), colWidth);
      const leftBottom = padAnsiRight(truncateAnsi(left.bottom, colWidth), colWidth);
      const rightTop = truncateAnsi(right.top, rightWidth);
      const rightBottom = truncateAnsi(right.bottom, rightWidth);
      console.log(`${leftTop} │ ${rightTop}`);
      console.log(`${leftBottom} │ ${rightBottom}`);
      console.log('');
    } else {
      console.log(truncateAnsi(left.top, width));
      console.log(truncateAnsi(left.bottom, width));
      console.log('');
    }
  }
}

function padRight(s: string, len: number): string {
  if (s.length >= len) return s;
  return s + ' '.repeat(len - s.length);
}

function summarizeItems(items: WarmupItem[]) {
  const ok = items.filter((i) => i.outcome === 'ok').length;
  const warn = items.filter((i) => i.outcome === 'warn').length;
  const fail = items.filter((i) => i.outcome === 'fail').length;
  const total = items.length;
  const msValues = items.map((i) => i.ms).filter((v): v is number => typeof v === 'number');
  const maxMs = msValues.length ? Math.max(...msValues) : null;
  const sorted = msValues.slice().sort((a, b) => a - b);
  const p95Ms = sorted.length ? sorted[Math.floor(sorted.length * 0.95)] : null;
  return { ok, warn, fail, total, maxMs, p95Ms };
}

function countMatches(text: string, regex: RegExp): number {
  const matches = text.match(regex);
  return matches ? matches.length : 0;
}

function parseArgs() {
  const args = process.argv.slice(2);
  let baseUrl = process.env.BASE_URL || '';
  let envLabel: string | undefined;
  let concurrency = DEFAULT_CONCURRENCY;
  let internalHealthToken = process.env.INTERNAL_HEALTH_TOKEN || '';
  let verbose = false;
  let slowMs = DEFAULT_SLOW_MS;

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--url' && args[i + 1]) {
      baseUrl = args[++i];
    } else if (a === '--env' && args[i + 1]) {
      envLabel = args[++i];
    } else if (a === '--concurrency' && args[i + 1]) {
      const v = Number(args[++i]);
      if (!Number.isNaN(v) && v > 0) concurrency = v;
    } else if (a === '--internal-health-token' && args[i + 1]) {
      internalHealthToken = args[++i];
    } else if (a === '--verbose') {
      verbose = true;
    } else if (a === '--slow-ms' && args[i + 1]) {
      const v = Number(args[++i]);
      if (!Number.isNaN(v) && v > 0) slowMs = v;
    }
  }
  if (!baseUrl) throw new Error('BASE_URL is required. Use --url https://... or set BASE_URL env');
  return { baseUrl: normalizeBaseUrl(baseUrl), envLabel, concurrency, internalHealthToken, verbose, slowMs };
}

function normalizeBaseUrl(u: string) {
  return u.replace(/\/$/, '');
}

async function requestWithTimeout(url: string, options: RequestInit & { timeout?: number } = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeout ?? REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'User-Agent': 'EvolutionHub-DeployWarmup/1.0',
        ...(options.headers || {}),
      },
    });
    return res;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function getJsonSafe(res: Response): Promise<unknown | null> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

type ToolStatus = 'enabled' | 'disabled' | 'unexpected';

interface ToolWarmupConfig {
  id: string;
  usagePath: string;
  pagePaths: string[];
}

interface ToolStatusResult {
  id: string;
  status: ToolStatus;
  httpStatus?: number;
  reason?: string;
}

type PreflightCheckResult = {
  id: string;
  url: string;
  outcome: WarmupOutcome;
  httpStatus?: number;
  ms?: number;
  attempts: number;
  reason?: string;
};

function formatPreflightCell(r: PreflightCheckResult): { top: string; bottom: string } {
  const status = typeof r.httpStatus === 'number' ? String(r.httpStatus) : '--';
  const ms = typeof r.ms === 'number' ? `${r.ms}ms` : '--';
  const attemptSuffix = r.attempts > 1 ? chalk.gray(`(attempts ${r.attempts})`) : '';
  const reasonSuffix = r.reason ? chalk.gray(`(${r.reason})`) : '';

  let displayUrl = r.url;
  try {
    displayUrl = new URL(r.url).pathname;
  } catch {
    displayUrl = r.url;
  }

  const top = `${chalk.cyanBright(r.id)} ${chalk.gray(displayUrl)}`;
  const bottom = `${formatOutcome(r.outcome)} ${padRight(status, 3)} ${padRight(ms, 6)} ${attemptSuffix} ${reasonSuffix}`.trim();
  return { top, bottom };
}

function readStatusFromHealthBody(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const b = body as { status?: unknown; data?: unknown };
  if (typeof b.status === 'string') return b.status;
  if (b.data && typeof b.data === 'object') {
    const d = b.data as { status?: unknown };
    if (typeof d.status === 'string') return d.status;
  }
  return undefined;
}

async function checkToolStatus(baseUrl: string, tool: ToolWarmupConfig): Promise<ToolStatusResult> {
  const url = `${baseUrl}${tool.usagePath}`;
  try {
    const res = await requestWithTimeout(url, { method: 'GET' });
    const body = await getJsonSafe(res);

    const success =
      Boolean(body && typeof body === 'object') &&
      Boolean((body as { success?: unknown }).success === true);
    if (res.status === 200 && success) {
      return { id: tool.id, status: 'enabled', httpStatus: res.status };
    }

    const errObj =
      body && typeof body === 'object' && (body as { error?: unknown }).error
        ? ((body as { error?: unknown }).error as { type?: unknown; message?: unknown })
        : null;
    const errType = errObj && typeof errObj.type === 'string' ? errObj.type : undefined;
    const errMessage = errObj && typeof errObj.message === 'string' ? errObj.message : undefined;

    if (
      res.status === 403 &&
      errType === 'forbidden' &&
      typeof errMessage === 'string' &&
      errMessage.startsWith('feature.disabled.')
    ) {
      return { id: tool.id, status: 'disabled', httpStatus: res.status, reason: errMessage };
    }

    return {
      id: tool.id,
      status: 'unexpected',
      httpStatus: res.status,
      reason: errMessage ?? 'unexpected_response',
    };
  } catch (e) {
    return {
      id: tool.id,
      status: 'unexpected',
      reason: (e as Error).message,
    };
  }
}

async function checkHealth(
  baseUrl: string,
  opts: { verbose: boolean },
  retries = 3,
  timeout = REQUEST_TIMEOUT_MS
): Promise<PreflightCheckResult> {
  const url = `${baseUrl}/api/health`;
  let lastStatus: number | undefined;
  let lastMs: number | undefined;
  let lastErr: string | undefined;
  let attempts = 0;
  for (let attempt = 1; attempt <= retries; attempt++) {
    attempts = attempt;
    try {
      if (opts.verbose) {
        console.log(chalk.gray(`health ${attempt}/${retries} ${url}`));
      }
      const t0 = Date.now();
      const res = await requestWithTimeout(url, { method: 'GET', timeout });
      const dt = Date.now() - t0;
      lastMs = dt;
      lastStatus = res.status;
      const body = await getJsonSafe(res);
      const statusVal = readStatusFromHealthBody(body);
      if (res.status === 200 && statusVal === 'ok') {
        if (opts.verbose) {
          console.log(`${chalk.green('OK')} health`);
        }
        return {
          id: 'health',
          url,
          outcome: 'ok',
          httpStatus: res.status,
          ms: dt,
          attempts,
        };
      }
      lastErr = `status=${res.status}`;
      if (opts.verbose) {
        console.warn(
          `${chalk.yellow('WARN')} health unexpected status=${res.status} payload=${JSON.stringify(body)}`
        );
      }
    } catch (err) {
      lastErr = (err as Error).message;
      if (opts.verbose) {
        console.error(`${chalk.red('FAIL')} health error: ${(err as Error).message}`);
      }
    }
    if (attempt < retries) await new Promise((r) => setTimeout(r, 3_000));
  }
  return {
    id: 'health',
    url,
    outcome: 'fail',
    httpStatus: lastStatus,
    ms: lastMs,
    attempts,
    reason: lastErr,
  };
}

async function checkInternalAuthHealth(
  baseUrl: string,
  token: string,
  opts: { verbose: boolean }
): Promise<PreflightCheckResult> {
  const url = `${baseUrl}/api/health/auth`;
  try {
    if (opts.verbose) {
      console.log(chalk.gray(`internal.auth ${url}`));
    }
    const t0 = Date.now();
    const res = await requestWithTimeout(url, {
      method: 'GET',
      headers: { 'X-Internal-Health': token },
      timeout: REQUEST_TIMEOUT_MS,
    });
    const dt = Date.now() - t0;
    if (res.ok) {
      if (opts.verbose) {
        console.log(`${chalk.green('OK')} internal auth`);
      }
      return {
        id: 'internal.auth',
        url,
        outcome: 'ok',
        httpStatus: res.status,
        ms: dt,
        attempts: 1,
      };
    }
    if (opts.verbose) {
      console.warn(`${chalk.yellow('WARN')} internal auth unexpected status=${res.status}`);
    }
    return {
      id: 'internal.auth',
      url,
      outcome: 'warn',
      httpStatus: res.status,
      ms: dt,
      attempts: 1,
      reason: `status=${res.status}`,
    };
  } catch (e) {
    if (opts.verbose) {
      console.warn(`${chalk.yellow('WARN')} internal auth error: ${(e as Error).message}`);
    }
    return {
      id: 'internal.auth',
      url,
      outcome: 'warn',
      attempts: 1,
      reason: (e as Error).message,
    };
  }
}

async function checkInternalCommentsHealth(
  baseUrl: string,
  token: string,
  opts: { verbose: boolean }
): Promise<PreflightCheckResult> {
  const url = `${baseUrl}/api/health/comments`;
  try {
    if (opts.verbose) {
      console.log(chalk.gray(`internal.comments ${url}`));
    }
    const t0 = Date.now();
    const res = await requestWithTimeout(url, {
      method: 'GET',
      headers: { 'X-Internal-Health': token },
      timeout: REQUEST_TIMEOUT_MS,
    });
    const dt = Date.now() - t0;
    if (res.ok) {
      const body = await getJsonSafe(res);
      const statusVal = readStatusFromHealthBody(body);
      if (statusVal === 'ok') {
        if (opts.verbose) {
          console.log(`${chalk.green('OK')} internal comments`);
        }
        return {
          id: 'internal.comments',
          url,
          outcome: 'ok',
          httpStatus: res.status,
          ms: dt,
          attempts: 1,
        };
      }
      if (opts.verbose) {
        console.warn(`${chalk.yellow('WARN')} internal comments body status=${statusVal ?? 'unknown'}`);
      }
      return {
        id: 'internal.comments',
        url,
        outcome: 'warn',
        httpStatus: res.status,
        ms: dt,
        attempts: 1,
        reason: `body.status=${statusVal ?? 'unknown'}`,
      };
    }
    if (opts.verbose) {
      console.warn(`${chalk.yellow('WARN')} internal comments unexpected status=${res.status}`);
    }
    return {
      id: 'internal.comments',
      url,
      outcome: 'warn',
      httpStatus: res.status,
      ms: dt,
      attempts: 1,
      reason: `status=${res.status}`,
    };
  } catch (e) {
    if (opts.verbose) {
      console.warn(`${chalk.yellow('WARN')} internal comments error: ${(e as Error).message}`);
    }
    return {
      id: 'internal.comments',
      url,
      outcome: 'warn',
      attempts: 1,
      reason: (e as Error).message,
    };
  }
}

async function warmSinglePath(
  baseUrl: string,
  path: string,
  label: string
): Promise<{ item: WarmupItem; text?: string }> {
  const url = `${baseUrl}${path}`;
  let lastErr: string | undefined;
  let lastStatus: number | undefined;
  let lastMs: number | undefined;
  let lastText: string | undefined;
  let attempts = 0;

  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    attempts = attempt + 1;
    try {
      const t0 = Date.now();
      const res = await requestWithTimeout(url, { method: 'GET' });
      lastMs = Date.now() - t0;
      lastStatus = res.status;
      if (res.ok) {
        lastText = await res.text();
        lastErr = undefined;
        break;
      }
      lastErr = `status=${res.status}`;
    } catch (e) {
      lastErr = (e as Error).message;
    }
  }

  const outcome: WarmupOutcome = lastErr ? 'fail' : 'ok';
  const item: WarmupItem = {
    label,
    path,
    outcome,
    httpStatus: lastStatus,
    ms: lastMs,
    attempts,
    err: lastErr,
  };

  return { item, text: lastText };
}

async function prewarmPaths(
  baseUrl: string,
  label: string,
  paths: string[],
  concurrency: number,
  opts: { verbose: boolean; slowMs: number; compactGrid?: boolean }
) {
  if (!opts.compactGrid) {
    printSectionHeader(label, `(${paths.length} req, c=${concurrency})`);
  }
  let inFlight = 0;
  let idx = 0;
  let ok = 0;
  const failed: { path: string; status?: number; err?: string }[] = [];
  const items: WarmupItem[] = [];

  return new Promise<{ ok: number; failed: typeof failed; items: WarmupItem[] }>((resolve) => {
    const next = () => {
      while (inFlight < concurrency && idx < paths.length) {
        const path = paths[idx++];
        inFlight++;
        (async () => {
          const url = `${baseUrl}${path}`;
          let lastErr: string | undefined;
          let lastStatus: number | undefined;
          let lastMs: number | undefined;
          let attempts = 0;
          for (let attempt = 0; attempt <= RETRIES; attempt++) {
            const tryNo = attempt + 1;
            attempts = tryNo;
            try {
              const t0 = Date.now();
              const res = await requestWithTimeout(url, { method: 'GET' });
              const dt = Date.now() - t0;
              lastMs = dt;
              lastStatus = res.status;
              if (res.ok) {
                if (opts.verbose) {
                  console.log(
                    `  ${formatOutcome('ok')} ${padRight(String(res.status), 3)} ${padRight(`${dt}ms`, 6)} ${path}`
                  );
                } else if (dt >= opts.slowMs) {
                  console.log(
                    `  ${formatOutcome('warn')} ${padRight(String(res.status), 3)} ${padRight(`${dt}ms`, 6)} ${opts.compactGrid ? `${padRight(label, 12)} ` : ''}${path} ${chalk.gray('(slow)')}`
                  );
                }
                ok++;
                items.push({
                  label,
                  path,
                  outcome: dt >= opts.slowMs ? 'warn' : 'ok',
                  httpStatus: res.status,
                  ms: dt,
                  attempts,
                });
                break;
              } else {
                lastErr = `status=${res.status}`;
                console.warn(
                  `  ${formatOutcome('warn')} ${padRight(String(res.status), 3)} ${padRight(`${dt}ms`, 6)} ${opts.compactGrid ? `${padRight(label, 12)} ` : ''}${path} ${chalk.gray(`(attempt ${tryNo})`)}`
                );
              }
            } catch (e) {
              lastErr = (e as Error).message;
              console.warn(
                `  ${formatOutcome('warn')} ${padRight('err', 3)} ${padRight('--', 6)} ${opts.compactGrid ? `${padRight(label, 12)} ` : ''}${path} ${chalk.gray(`(${lastErr}) attempt ${tryNo}`)}`
              );
            }
          }

          if (lastErr) {
            failed.push({ path, err: lastErr, status: lastStatus });
            items.push({
              label,
              path,
              outcome: 'fail',
              httpStatus: lastStatus,
              ms: lastMs,
              attempts,
              err: lastErr,
            });
          }
        })()
          .catch((e) => {
            const errMessage = (e as Error).message;
            failed.push({ path, err: errMessage });
            items.push({
              label,
              path,
              outcome: 'fail',
              attempts: 1,
              err: errMessage,
            });
          })
          .finally(() => {
            inFlight--;
            if (idx < paths.length) next();
            else if (inFlight === 0) {
              const summary = summarizeItems(items);
              const suffix =
                summary.fail > 0
                  ? chalk.red(`${summary.fail} fail`)
                  : summary.warn > 0
                    ? chalk.yellow(`${summary.warn} warn`)
                    : chalk.green('all ok');
              const perf =
                summary.p95Ms !== null && summary.maxMs !== null
                  ? chalk.gray(`p95 ${summary.p95Ms}ms, max ${summary.maxMs}ms`)
                  : '';
              if (!opts.compactGrid) {
                printSectionFooter(`${chalk.gray('summary')} ${summary.ok}/${summary.total} ok, ${suffix} ${perf}`);
              }
              resolve({ ok, failed, items });
            }
          });
      }
    };
    next();
  });
}

async function prewarmRssTopPosts(
  baseUrl: string,
  limit = 3,
  rssXml?: string,
  opts?: { verbose: boolean }
) {
  const rssUrl = `${baseUrl}/rss.xml`;
  try {
    let xml = rssXml;
    if (!xml) {
      const res = await requestWithTimeout(rssUrl, { method: 'GET' });
      if (!res.ok) {
        console.warn(`${chalk.yellow('WARN')} rss fetch skipped status=${res.status}`);
        return [] as string[];
      }
      xml = await res.text();
    }

    const links = Array.from(xml.matchAll(/<link>([^<]+)<\/link>/g))
      .map((m) => m[1])
      .filter((u) => typeof u === 'string' && u.includes('/blog/'))
      .slice(0, limit);
    const paths = links
      .map((u) => {
        try {
          const url = new URL(u, baseUrl);
          return url.origin === baseUrl ? url.pathname : url.pathname; // normalize to path
        } catch {
          return null;
        }
      })
      .filter((p): p is string => Boolean(p));
    if (opts?.verbose) {
      console.log(`${chalk.gray('rss')} found ${paths.length} blog post(s)`);
    }
    return paths;
  } catch (e) {
    console.warn(`${chalk.yellow('WARN')} rss error: ${(e as Error).message}`);
    return [];
  }
}

async function main() {
  const { baseUrl, envLabel, concurrency, internalHealthToken, verbose, slowMs } = parseArgs();
  printHeader(baseUrl, envLabel, { verbose, concurrency, slowMs });

  const allItems: WarmupItem[] = [];
  const compactCells: Array<{ top: string; bottom: string }> = [];
  const preflightCells: Array<{ top: string; bottom: string }> = [];

  const healthResult = await checkHealth(baseUrl, { verbose });
  if (!verbose) {
    preflightCells.push(formatPreflightCell(healthResult));
  }
  if (healthResult.outcome !== 'ok') {
    console.error(`${chalk.red('FAIL')} health check failed`);
    process.exit(1);
  }

  // Optional internal auth health (soft gate)
  if (internalHealthToken) {
    const authRes = await checkInternalAuthHealth(baseUrl, internalHealthToken, { verbose });
    const commentsRes = await checkInternalCommentsHealth(baseUrl, internalHealthToken, { verbose });
    if (!verbose) {
      preflightCells.push(formatPreflightCell(authRes));
      preflightCells.push(formatPreflightCell(commentsRes));
    }
  }

  if (!verbose && preflightCells.length > 0) {
    printTwoColumnGrid(preflightCells, { header: 'preflight', headerMeta: '(health checks)' });
  }

  // Pages & apps
  const pagePaths = [
    '/',
    '/en/',
    '/tools',
    '/en/tools',
    '/pricing',
    '/en/pricing',
    '/login',
    '/en/login',
    '/register',
    '/en/register',
    '/blog',
    '/en/blog',
  ];
  const pagesRes = await prewarmPaths(baseUrl, 'pages', pagePaths, concurrency, {
    verbose,
    slowMs,
    compactGrid: !verbose,
  });
  allItems.push(...pagesRes.items);
  if (!verbose) {
    compactCells.push(
      formatSectionCell('pages', `(${pagePaths.length} req, c=${concurrency})`, summarizeItems(pagesRes.items))
    );
  }

  const rssWarm = await warmSinglePath(baseUrl, '/rss.xml', 'seo');
  const sitemapWarm = await warmSinglePath(baseUrl, '/sitemap.xml', 'seo');

  const seoItems = [rssWarm.item, sitemapWarm.item];
  allItems.push(...seoItems);
  const rssItemsCount = typeof rssWarm.text === 'string' ? countMatches(rssWarm.text, /<item>/g) : null;
  const sitemapUrlCount =
    typeof sitemapWarm.text === 'string' ? countMatches(sitemapWarm.text, /<url>/g) : null;
  if (verbose) {
    printSectionHeader('seo', '(2 req)');
    for (const item of seoItems) {
      const isSlow = (item.ms ?? 0) >= slowMs;
      if (verbose || item.outcome !== 'ok' || isSlow) {
        console.log(
          `  ${formatOutcome(item.outcome)} ${padRight(String(item.httpStatus ?? ''), 3)} ${padRight(`${item.ms ?? '--'}ms`, 6)} ${item.path}`
        );
      }
    }
    {
      const seoSummary = summarizeItems(seoItems);
      const seoSuffix =
        seoSummary.fail > 0
          ? chalk.red(`${seoSummary.fail} fail`)
          : seoSummary.warn > 0
            ? chalk.yellow(`${seoSummary.warn} warn`)
            : chalk.green('all ok');
      const seoPerf =
        seoSummary.p95Ms !== null && seoSummary.maxMs !== null
          ? chalk.gray(`p95 ${seoSummary.p95Ms}ms, max ${seoSummary.maxMs}ms`)
          : '';
      printSectionFooter(
        `${chalk.gray('summary')} ${seoSummary.ok}/${seoSummary.total} ok, ${seoSuffix} ${seoPerf}`
      );
    }
    if (typeof rssItemsCount === 'number') {
      console.log(`  ${chalk.gray('rss')} items=${rssItemsCount}`);
    }
    if (typeof sitemapUrlCount === 'number') {
      console.log(`  ${chalk.gray('sitemap')} urls=${sitemapUrlCount}`);
    }
  } else {
    const seoExtra =
      typeof rssItemsCount === 'number' && typeof sitemapUrlCount === 'number'
        ? chalk.gray(`• rss=${rssItemsCount} sitemap=${sitemapUrlCount}`)
        : undefined;
    compactCells.push(formatSectionCell('seo', '(2 req)', summarizeItems(seoItems), seoExtra));
  }

  const tools: ToolWarmupConfig[] = [
    {
      id: 'prompt',
      usagePath: '/api/prompt/usage',
      pagePaths: ['/tools/prompt-enhancer/app', '/en/tools/prompt-enhancer/app'],
    },
    {
      id: 'ai-image',
      usagePath: '/api/ai-image/usage',
      pagePaths: ['/tools/imag-enhancer/app', '/en/tools/imag-enhancer/app'],
    },
    {
      id: 'ai-video',
      usagePath: '/api/ai-video/usage',
      pagePaths: ['/tools/video-enhancer/app', '/en/tools/video-enhancer/app'],
    },
    {
      id: 'voice',
      usagePath: '/api/voice/usage',
      pagePaths: ['/tools/voice-visualizer/app', '/en/tools/voice-visualizer/app'],
    },
    {
      id: 'webscraper',
      usagePath: '/api/webscraper/usage',
      pagePaths: ['/tools/webscraper/app', '/en/tools/webscraper/app'],
    },
    {
      id: 'web-eval',
      usagePath: '/api/testing/evaluate/usage',
      pagePaths: ['/tools/web-eval/app', '/en/tools/web-eval/app'],
    },
  ];

  const toolStatusResults = await Promise.all(tools.map((t) => checkToolStatus(baseUrl, t)));

  for (const tool of tools) {
    const r = toolStatusResults.find((x: ToolStatusResult) => x.id === tool.id);
    if (!r) continue;
    if (r.status !== 'enabled') continue;
    const toolRes = await prewarmPaths(baseUrl, `tool:${tool.id}`, tool.pagePaths, concurrency, {
      verbose,
      slowMs,
      compactGrid: !verbose,
    });
    allItems.push(...toolRes.items);
    if (!verbose) {
      compactCells.push(
        formatSectionCell(
          `tool:${tool.id}`,
          `(${tool.pagePaths.length} req, c=${concurrency})`,
          summarizeItems(toolRes.items)
        )
      );
    }
  }

  // APIs (public, lightweight)
  const apiPaths = ['/api/tools'];
  const apiRes = await prewarmPaths(baseUrl, 'apis', apiPaths, concurrency, {
    verbose,
    slowMs,
    compactGrid: !verbose,
  });
  allItems.push(...apiRes.items);
  if (!verbose) {
    compactCells.push(
      formatSectionCell('apis', `(${apiPaths.length} req, c=${concurrency})`, summarizeItems(apiRes.items))
    );
  }

  // Optional: warm top blog posts via RSS
  const rssPostPaths = await prewarmRssTopPosts(baseUrl, 3, rssWarm.text, { verbose });
  if (rssPostPaths.length > 0) {
    const blogRes = await prewarmPaths(baseUrl, 'blog-posts', rssPostPaths, concurrency, {
      verbose,
      slowMs,
      compactGrid: !verbose,
    });
    allItems.push(...blogRes.items);
    if (!verbose) {
      compactCells.push(
        formatSectionCell(
          'blog-posts',
          `(${rssPostPaths.length} req, c=${concurrency})`,
          summarizeItems(blogRes.items)
        )
      );
    }
  }

  if (!verbose) {
    printTwoColumnGrid(compactCells, { header: 'sections', headerMeta: '(compact grid)' });
  }

  const unexpected = toolStatusResults.filter((r: ToolStatusResult) => r.status === 'unexpected');
  const statusLines = toolStatusResults
    .map((r: ToolStatusResult) => {
      const suffix = r.reason ? ` (${r.reason})` : '';
      const http = typeof r.httpStatus === 'number' ? ` ${r.httpStatus}` : '';
      return `- ${r.id}: ${r.status.toUpperCase()}${http}${suffix}`;
    })
    .join('\n');
  if (verbose) {
    console.log(`\n${chalk.bold('Tools')}\n${statusLines}`);
  } else {
    const toolCells = toolStatusResults.map((r: ToolStatusResult) => {
      const suffix = r.reason ? ` (${r.reason})` : '';
      const http = typeof r.httpStatus === 'number' ? ` ${r.httpStatus}` : '';
      const status = r.status.toUpperCase();
      const top = `${chalk.cyanBright(r.id)} ${chalk.gray('status')}`;
      const bottom = `${status}${http}${suffix}`;
      return { top, bottom };
    });
    printTwoColumnGrid(toolCells, { header: 'tools', headerMeta: '(status)' });
  }

  const total = summarizeItems(allItems);
  const slowest = allItems
    .filter((i) => typeof i.ms === 'number')
    .slice()
    .sort((a, b) => (b.ms ?? 0) - (a.ms ?? 0))
    .slice(0, 5);
  console.log(
    `\n${chalk.bold('Summary')} total=${total.total} ok=${chalk.green(String(total.ok))} warn=${chalk.yellow(String(total.warn))} fail=${chalk.red(String(total.fail))}`
  );
  if (slowest.length > 0) {
    console.log(`${chalk.bold('Slowest')}`);
    for (const i of slowest) {
      console.log(
        `- ${padRight(`${i.ms}ms`, 8)} ${padRight(i.label, 12)} ${i.path}${i.httpStatus ? chalk.gray(` (${i.httpStatus})`) : ''}`
      );
    }
  }

  if (unexpected.length > 0) {
    console.error(`\n${chalk.red('FAIL')} warmup: ${unexpected.length} tool(s) unexpected`);
    process.exit(1);
  }

  console.log(`\n${chalk.green('OK')} warmup completed`);
  process.exit(0);
}

main().catch((e) => {
  console.error(`❌ Warmup fatal error: ${(e as Error).message}`);
  process.exit(1);
});
export {};
