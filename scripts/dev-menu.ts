#!/usr/bin/env tsx

/**
 * Interaktives Entwicklungsmenü für Evolution Hub
 *
 * Dieses Skript bietet ein einfaches interaktives Menü für die wichtigsten Entwicklungsbefehle.
 */

import * as readline from 'readline';
import { execa, execaCommand } from 'execa';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Chalk-Konfiguration für ESM-Kompatibilität
const chalk = {
  cyan: (text: string) => `\x1b[36m${text}\x1b[0m`,
  yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
  green: (text: string) => `\x1b[32m${text}\x1b[0m`,
  red: (text: string) => `\x1b[31m${text}\x1b[0m`,
  gray: (text: string) => `\x1b[90m${text}\x1b[0m`,
  bold: (text: string) => `\x1b[1m${text}\x1b[0m`,
  inverse: (text: string) => `\x1b[7m${text}\x1b[0m`,
  dim: (text: string) => `\x1b[2m${text}\x1b[0m`,
  magenta: (text: string) => `\x1b[35m${text}\x1b[0m`,
  blue: (text: string) => `\x1b[34m${text}\x1b[0m`,
  white: (text: string) => `\x1b[37m${text}\x1b[0m`,
};

// CI/TTY-Guard: In nicht-interaktiven Umgebungen sofort beenden
const IS_CI = Boolean(process.env.CI);
const IS_TTY = Boolean(process.stdin.isTTY);
const IS_INTERACTIVE = IS_TTY && !IS_CI;

// __dirname shim (ESM)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Persistent menu state (theme, animations)
type ThemeName = 'neon' | 'matrix' | 'retro' | 'mono';
type MenuState = { theme: ThemeName; animations: boolean };
const STATE_DIR = path.join(__dirname, '..', '.evolution-hub');
const STATE_PATH = path.join(STATE_DIR, 'menu-state.json');
function loadState(): MenuState {
  try {
    const raw = fs.readFileSync(STATE_PATH, 'utf-8');
    const s = JSON.parse(raw);
    return { theme: (s.theme as ThemeName) || 'neon', animations: s.animations !== false };
  } catch {
    return { theme: 'neon', animations: true };
  }
}
function saveState(state: MenuState) {
  try {
    fs.mkdirSync(STATE_DIR, { recursive: true });
    fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
  } catch {
    // ignore
  }
}
const MENU_STATE = loadState();

// Themes
type Theme = {
  name: string;
  primary: (s: string) => string;
  accent: (s: string) => string;
  highlight: (s: string) => string;
  ok: (s: string) => string;
  warn: (s: string) => string;
  err: (s: string) => string;
  muted: (s: string) => string;
  border: (s: string) => string;
};
const THEMES: Record<ThemeName, Theme> = {
  neon: {
    name: 'Neon',
    primary: (s) => chalk.magenta(s),
    accent: (s) => chalk.cyan(s),
    highlight: (s) => chalk.blue(chalk.bold(s)),
    ok: (s) => chalk.green(s),
    warn: (s) => chalk.yellow(s),
    err: (s) => chalk.red(s),
    muted: (s) => chalk.dim(s),
    border: (s) => chalk.white(s),
  },
  matrix: {
    name: 'Matrix',
    primary: (s) => `\x1b[32m${s}\x1b[0m`,
    accent: (s) => `\x1b[92m${s}\x1b[0m`,
    highlight: (s) => `\x1b[32;1m${s}\x1b[0m`,
    ok: (s) => `\x1b[92m${s}\x1b[0m`,
    warn: (s) => chalk.yellow(s),
    err: (s) => chalk.red(s),
    muted: (s) => chalk.gray(s),
    border: (s) => `\x1b[32m${s}\x1b[0m`,
  },
  retro: {
    name: 'Retro',
    primary: (s) => `\x1b[33;1m${s}\x1b[0m`,
    accent: (s) => `\x1b[36m${s}\x1b[0m`,
    highlight: (s) => `\x1b[35m${s}\x1b[0m`,
    ok: (s) => `\x1b[32m${s}\x1b[0m`,
    warn: (s) => `\x1b[33m${s}\x1b[0m`,
    err: (s) => `\x1b[31m${s}\x1b[0m`,
    muted: (s) => `\x1b[90m${s}\x1b[0m`,
    border: (s) => `\x1b[37m${s}\x1b[0m`,
  },
  mono: {
    name: 'Mono',
    primary: (s) => s,
    accent: (s) => s,
    highlight: (s) => chalk.bold(s),
    ok: (s) => s,
    warn: (s) => s,
    err: (s) => s,
    muted: (s) => chalk.dim(s),
    border: (s) => s,
  },
};
function theme(): Theme {
  return THEMES[MENU_STATE.theme] || THEMES.neon;
}

// Erstelle eine readline-Schnittstelle
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// --- CLI args parsing (supports direct action run: --action=deploy-staging, --yes) ---
type CliArgs = {
  action?: string;
  yes?: boolean;
};

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {};
  for (const a of argv.slice(2)) {
    if (a.startsWith('--action=')) args.action = a.split('=')[1];
    else if (a === '--yes' || a === '-y') args.yes = true;
  }
  return args;
}
const ARGS = parseArgs(process.argv);
const IS_DIRECT_ACTION = Boolean(ARGS.action);

// ASCII-Art-Logo
const logo = `
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   ███████╗██╗   ██╗ ██████╗ ██╗     ██╗   ██╗████████╗║
║   ██╔════╝██║   ██║██╔═══██╗██║     ██║   ██║╚══██╔══╝║
║   █████╗  ██║   ██║██║   ██║██║     ██║   ██║   ██║   ║
║   ██╔══╝  ╚██╗ ██╔╝██║   ██║██║     ██║   ██║   ██║   ║
║   ███████╗ ╚████╔╝ ╚██████╔╝███████╗╚██████╔╝   ██║   ║
║   ╚══════╝  ╚═══╝   ╚═════╝ ╚══════╝ ╚═════╝    ╚═╝   ║
║                                                       ║
║   ██╗  ██╗██╗   ██╗██████╗                           ║
║   ██║  ██║██║   ██║██╔══██╗                          ║
║   ███████║██║   ██║██████╔╝                          ║
║   ██╔══██║██║   ██║██╔══██╗                          ║
║   ██║  ██║╚██████╔╝██████╔╝                          ║
║   ╚═╝  ╚═╝ ╚═════╝ ╚═════╝                           ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
`;

// Typen für Menüoptionen
interface MenuOption {
  key: string;
  label: string;
  action: string;
  hint?: string;
}

// Hauptmenü-Optionen
const mainMenuOptions: MenuOption[] = [
  { key: '1', label: 'Lokale Entwicklung (Astro/Worker lokal)', action: 'dev-menu' },
  {
    key: '2',
    label: 'Remote-Entwicklung (Live-Daten) (Wrangler Remote)',
    action: 'wrangler dev --remote',
  },
  { key: '3', label: 'Lokale Umgebung einrichten (D1/KV/R2 Bindings)', action: 'setup:local' },
  { key: '4', label: 'Datenbank-Verwaltung (D1 Tools)', action: 'db-menu' },
  { key: '5', label: 'Build & Deployment (Build/Deploy/Tail)', action: 'build-menu' },
  { key: '6', label: 'Tests ausführen (Vitest/Playwright)', action: 'test-menu' },
  { key: '7', label: 'Health-Check (Quick diagnostics)', action: 'health-check' },
  { key: '8', label: 'Einstellungen (Theme & Animation)', action: 'settings-menu' },
  { key: '9', label: 'Qualität & Docs', action: 'docs-menu' },
  { key: '0', label: 'Beenden', action: 'exit' },
];

// Lokale Entwicklungs-Menü-Optionen
const devMenuOptions: MenuOption[] = [
  { key: '1', label: 'UI-Entwicklung (Astro-Server)', action: 'dev:astro' },
  { key: '2', label: 'Cloudflare-Entwicklung (Wrangler mit D1/R2/KV)', action: 'dev' },
  { key: '3', label: 'Wrangler ohne Build starten (schnell)', action: 'dev:worker:nobuild' },
  { key: '4', label: 'Wrangler Dev + Browser öffnen', action: 'dev:open' },
  { key: '5', label: 'Pages Fallback Dev (dist dienen)', action: 'dev:pages-fallback' },
  {
    key: '6',
    label: 'Lokale Datenbank zurücksetzen & Migrationen anwenden',
    action: 'reset-db-menu',
  },
  { key: '0', label: 'Zurück zum Hauptmenü', action: 'main-menu' },
];

// Datenbank-Reset-Menü-Optionen
const resetDbMenuOptions: MenuOption[] = [
  { key: '1', label: 'Alle Migrationen neu anwenden', action: 'apply-all-migrations' },
  { key: '2', label: 'Lokale Datenbank löschen und neu erstellen', action: 'recreate-db' },
  { key: '0', label: 'Zurück zum Entwicklungsmenü', action: 'dev-menu' },
];

// Datenbank-Menü-Optionen
const dbMenuOptions: MenuOption[] = [
  { key: '1', label: 'Lokale Datenbank einrichten', action: 'db:setup' },
  { key: '2', label: 'Datenbank-Schema generieren', action: 'db:generate' },
  { key: '3', label: 'Migrationen ausführen', action: 'db:migrate' },
  { key: '4', label: 'D1-Datenbank anzeigen', action: 'npx --no-install wrangler d1 list' },
  { key: '5', label: 'Remote-DB-Migrationen', action: 'remote-migrations-menu' },
  { key: '0', label: 'Zurück zum Hauptmenü', action: 'main-menu' },
];

// Build-Menü-Optionen
const buildMenuOptions: MenuOption[] = [
  { key: '1', label: 'Build erstellen (Astro)', action: 'build' },
  { key: '2', label: 'Build mit Watch-Modus', action: 'build:watch' },
  { key: '3', label: 'Preview starten', action: 'preview' },
  { key: '4', label: 'Worker-Build (prod)', action: 'build:worker' },
  { key: '5', label: 'Worker-Build (dev)', action: 'build:worker:dev' },
  { key: '6', label: 'Worker-Build (staging)', action: 'build:worker:staging' },
  { key: '7', label: 'Deployment', action: 'deploy-menu' },
  { key: '0', label: 'Zurück zum Hauptmenü', action: 'main-menu' },
];

// Deployment-Menü-Optionen
const deployMenuOptions: MenuOption[] = [
  { key: '1', label: 'Deploy zu Staging', action: 'deploy-staging' },
  { key: '2', label: 'Deploy zu Production (mit Bestätigung)', action: 'deploy-production' },
  { key: '3', label: 'Logs ansehen (Staging)', action: 'tail:staging' },
  { key: '4', label: 'Logs ansehen (Production)', action: 'tail:prod' },
  { key: '5', label: 'Staging öffnen', action: 'open-staging' },
  { key: '6', label: 'Production öffnen', action: 'open-production' },
  { key: '0', label: 'Zurück zum Build & Deployment', action: 'build-menu' },
];

// Remote-Migrationen-Menü-Optionen
const remoteMigrationsMenuOptions: MenuOption[] = [
  {
    key: '1',
    label: 'Neueste Migration auf Staging anwenden',
    action: 'apply-latest-migration-staging',
  },
  {
    key: '2',
    label: 'Neueste Migration auf Production anwenden (mit Bestätigung)',
    action: 'apply-latest-migration-production',
  },
  { key: '0', label: 'Zurück zur DB-Verwaltung', action: 'db-menu' },
];

// Test-Menü-Optionen
const testMenuOptions: MenuOption[] = [
  { key: '1', label: 'Unit-Tests ausführen', action: 'test', hint: 'Vitest' },
  { key: '2', label: 'Unit-Tests im Watch-Modus', action: 'test:watch' },
  { key: '3', label: 'Unit-Tests einmalig', action: 'test:once' },
  { key: '4', label: 'Coverage (Unit)', action: 'test:coverage' },
  { key: '5', label: 'E2E-Tests ausführen (v2)', action: 'test:e2e', hint: 'Playwright v2' },
  { key: '6', label: 'E2E-Tests mit UI', action: 'test:e2e:ui' },
  { key: '7', label: 'E2E HTML-Report (v2) öffnen', action: 'open-report-v2' },
  { key: '8', label: 'E2E HTML-Report (root) öffnen', action: 'open-report-v1' },
  { key: '0', label: 'Zurück zum Hauptmenü', action: 'main-menu' },
];

// Einstellungen-Menü
const settingsMenuOptions: MenuOption[] = [
  {
    key: '1',
    label: 'Theme wählen',
    action: 'settings-theme',
    hint: THEMES[MENU_STATE.theme].name,
  },
  {
    key: '2',
    label: MENU_STATE.animations ? 'Animationen deaktivieren' : 'Animationen aktivieren',
    action: 'toggle-animations',
  },
  { key: '0', label: 'Zurück', action: 'main-menu' },
];

// Qualität & Docs-Menü
const docsMenuOptions: MenuOption[] = [
  { key: '1', label: 'Lint (ESLint)', action: 'lint' },
  { key: '2', label: 'Format prüfen (Prettier)', action: 'format:check' },
  { key: '3', label: 'Format anwenden (Prettier)', action: 'format' },
  { key: '4', label: 'OpenAPI validieren', action: 'openapi:validate' },
  { key: '5', label: 'Docs bauen', action: 'docs:build' },
  { key: '0', label: 'Zurück zum Hauptmenü', action: 'main-menu' },
];

// Status Bar
let cachedWranglerVersion: string | null = null;
let cachedAstroVersion: string | null = null;
function getAstroVersion(): string {
  if (cachedAstroVersion) return cachedAstroVersion;
  try {
    const pkgPath = path.join(__dirname, '..', 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    const ver: string | undefined =
      (pkg.dependencies && pkg.dependencies.astro) ||
      (pkg.devDependencies && pkg.devDependencies.astro);
    cachedAstroVersion = ver || 'unknown';
  } catch {
    cachedAstroVersion = 'unknown';
  }
  return cachedAstroVersion;
}
async function getWranglerVersion(): Promise<string> {
  if (cachedWranglerVersion) return cachedWranglerVersion;
  try {
    const { stdout } = await execa('wrangler', ['--version']);
    cachedWranglerVersion = stdout.trim();
  } catch {
    cachedWranglerVersion = 'not found';
  }
  return cachedWranglerVersion;
}

function renderHeader(title: string, status?: string) {
  console.clear();
  console.log(theme().accent(logo));
  // Glitchy title line
  const glitched = glitchTitle(`=== ${title} ===`);
  console.log(theme().primary(glitched));
  const node = process.version;
  const astro = getAstroVersion();
  const env = process.env.NODE_ENV || 'local';
  const extra = status ? ` | ${status}` : '';
  console.log(
    theme().muted(
      `Node ${node} | Astro ${astro} | ENV ${env}${extra} | Theme ${THEMES[MENU_STATE.theme].name}`
    )
  );
  // Status widgets line (D1, KV) with subtle particles
  const particles = renderParticles(24);
  const d1 = statusCache.d1;
  const kv = statusCache.kv;
  const d1Str = d1.loading
    ? 'D1: …'
    : `D1: tbl ${d1.tables ?? '?'}${d1.sampleTable ? `, ${d1.sampleTable} ${d1.sampleRows ?? '?'}` : ''}`;
  const kvStr = kv.loading ? 'KV: …' : `KV ${kv.binding}: ≥${kv.keys ?? '?'}`;
  console.log(
    `${theme().accent(particles)} ${theme().muted('[' + d1Str + ']')} ${theme().muted('[' + kvStr + ']')}`
  );
  console.log('');
}

// Glitch/Particles helpers
function glitchTitle(s: string): string {
  if (!MENU_STATE.animations) return s;
  const chars = s.split('');
  const pool = ['#', '*', '/', '\\', '|', '~'];
  for (let i = 0; i < chars.length; i++) {
    if (Math.random() < 0.03) {
      chars[i] = pool[Math.floor(Math.random() * pool.length)];
    }
  }
  return chars.join('');
}
function renderParticles(width = 20): string {
  if (!MENU_STATE.animations) return ''.padEnd(width, ' ');
  const t = Math.floor(Date.now() / 120);
  let line = '';
  for (let i = 0; i < width; i++) {
    const on = (i * 7 + t) % 17 === 0 || (i * 13 + t) % 29 === 0;
    line += on ? (i % 2 === 0 ? '•' : '·') : ' ';
  }
  return line;
}

// Mini status widgets: D1 + KV (background refresh)
const statusCache = {
  d1: {
    loading: true as boolean,
    tables: null as number | null,
    sampleTable: '' as string,
    sampleRows: null as number | null,
    updatedAt: 0,
  },
  kv: { loading: true as boolean, binding: 'SESSION', keys: null as number | null, updatedAt: 0 },
};

async function refreshD1Status() {
  try {
    statusCache.d1.loading = true;
    const dbName = 'evolution-hub-main-local';
    // Tables count
    const qTables =
      "SELECT count(*) as c FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'";
    const { stdout: tOut } = await execa(
      'npx',
      [
        '--no-install',
        'wrangler',
        'd1',
        'execute',
        dbName,
        '--local',
        '--command',
        qTables,
        '--json',
      ],
      { timeout: 8000 }
    );
    const tJson = JSON.parse(tOut);
    const tables = Number(tJson?.results?.[0]?.c ?? tJson?.[0]?.c ?? tJson?.success?.[0]?.c ?? NaN);
    statusCache.d1.tables = Number.isFinite(tables) ? tables : null;
    // Determine a representative table dynamically: list user tables and pick the largest by row count (capped checks)
    let picked = '';
    let pickedCount: number | null = null;
    try {
      const listQuery =
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_drizzle_%' ORDER BY name";
      const { stdout: lOut } = await execa(
        'npx',
        [
          '--no-install',
          'wrangler',
          'd1',
          'execute',
          dbName,
          '--local',
          '--command',
          listQuery,
          '--json',
        ],
        { timeout: 8000 }
      );
      const lJson = JSON.parse(lOut);
      const names: string[] = (lJson?.results || lJson || [])
        .map((r: any) => r.name)
        .filter(Boolean);
      const maxChecks = Math.min(12, names.length);
      for (let i = 0; i < maxChecks; i++) {
        const tbl = names[i];
        try {
          const { stdout } = await execa(
            'npx',
            [
              '--no-install',
              'wrangler',
              'd1',
              'execute',
              dbName,
              '--local',
              '--command',
              `SELECT count(*) as c FROM ${tbl}`,
              '--json',
            ],
            { timeout: 8000 }
          );
          const j = JSON.parse(stdout);
          const rows = Number(j?.results?.[0]?.c ?? j?.[0]?.c ?? j?.success?.[0]?.c ?? NaN);
          if (Number.isFinite(rows)) {
            if (pickedCount === null || rows > pickedCount) {
              picked = tbl;
              pickedCount = rows;
            }
          }
        } catch {
          // ignore per-table errors
        }
      }
    } catch {
      // list failed; leave picked empty
    }
    statusCache.d1.sampleTable = picked;
    statusCache.d1.sampleRows = picked ? pickedCount : null;
    statusCache.d1.updatedAt = Date.now();
  } catch {
    // keep previous values
  } finally {
    statusCache.d1.loading = false;
  }
}

async function refreshKVStatus() {
  try {
    statusCache.kv.loading = true;
    const binding = statusCache.kv.binding;
    const args = [
      '--no-install',
      'wrangler',
      'kv',
      'key',
      'list',
      '--binding',
      binding,
      '--limit',
      '200',
      '--json',
    ];
    const { stdout } = await execa('npx', args, { timeout: 8000 });
    const arr = JSON.parse(stdout);
    statusCache.kv.keys = Array.isArray(arr) ? arr.length : null;
    statusCache.kv.updatedAt = Date.now();
  } catch {
    // ignore
  } finally {
    statusCache.kv.loading = false;
  }
}

function startStatusAutoRefresh() {
  // initial
  refreshD1Status().catch(() => {});
  refreshKVStatus().catch(() => {});
  // periodic refresh
  setInterval(() => refreshD1Status().catch(() => {}), 30000);
  setInterval(() => refreshKVStatus().catch(() => {}), 45000);
}

// Interaktive Auswahl (Pfeiltasten, Enter, Ziffern)
async function interactiveSelect(options: MenuOption[], title: string): Promise<MenuOption | null> {
  await getWranglerVersion(); // warm cache, non-blocking next renders
  let index = 0;
  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) process.stdin.setRawMode(true);

  return await new Promise((resolve) => {
    const onKey = (str: string, key: readline.Key) => {
      if (key.name === 'down') {
        index = (index + 1) % options.length;
        render();
      } else if (key.name === 'up') {
        index = (index - 1 + options.length) % options.length;
        render();
      } else if (key.name === 'return' || key.name === 'enter') {
        cleanup();
        resolve(options[index]);
      } else if (key.name === 'escape' || key.name === 'q' || (key.ctrl && key.name === 'c')) {
        cleanup();
        resolve({ key: '0', label: 'Beenden', action: 'exit' });
      } else if (/^[0-9]$/.test(str)) {
        const opt = options.find((o) => o.key === str);
        if (opt) {
          cleanup();
          resolve(opt);
        }
      } else if (str === 'b') {
        // back to main
        cleanup();
        resolve({ key: '0', label: 'Zurück', action: 'main-menu' });
      } else if (str === 'p') {
        cleanup();
        (async () => {
          const picked = await commandPalette();
          resolve(picked || { key: '0', label: 'Zurück', action: 'main-menu' });
        })();
      } else if (str === 's') {
        cleanup();
        resolve({ key: '0', label: 'Einstellungen', action: 'settings-menu' });
      }
    };
    process.stdin.on('keypress', onKey);

    function cleanup() {
      process.stdin.off('keypress', onKey);
      if (process.stdin.isTTY) process.stdin.setRawMode(false);
    }

    function render() {
      renderHeader(title, `Wrangler ${cachedWranglerVersion || ''}`);
      options.forEach((opt, i) => {
        const prefix = i === index ? theme().accent('›') : ' ';
        const line =
          `${theme().ok(opt.key)}: ${opt.label}` +
          (opt.hint ? ` ${theme().muted(`(${opt.hint})`)}` : '');
        console.log(i === index ? chalk.inverse(`${prefix} ${line}`) : `${prefix} ${line}`);
      });
      console.log('');
      console.log(
        theme().muted(
          '↑/↓ bewegen • Enter wählen • 0–9 Schnellwahl • p Palette • s Einstellungen • b zurück • q beenden'
        )
      );
    }

    // initial render
    render();
  });
}

// Command Palette
type PaletteItem = { label: string; action: string; hint?: string };
function getAllMenuActions(): PaletteItem[] {
  const groups = [
    mainMenuOptions,
    devMenuOptions,
    resetDbMenuOptions,
    dbMenuOptions,
    buildMenuOptions,
    deployMenuOptions,
    remoteMigrationsMenuOptions,
    testMenuOptions,
    settingsMenuOptions,
    docsMenuOptions,
  ];
  const items: PaletteItem[] = [];
  for (const g of groups) {
    for (const o of g) {
      if (o.action !== 'main-menu') items.push({ label: o.label, action: o.action, hint: o.hint });
    }
  }
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf-8'));
    const scripts = pkg.scripts as Record<string, string>;
    for (const name of Object.keys(scripts || {})) {
      items.push({ label: `npm:${name}`, action: name, hint: 'package script' });
    }
  } catch {}
  return items;
}

async function commandPalette(): Promise<MenuOption | null> {
  const items = getAllMenuActions();
  let query = '';
  let matches = items;
  let index = 0;
  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) process.stdin.setRawMode(true);

  return await new Promise((resolve) => {
    const onKey = (str: string, key: readline.Key) => {
      if (key.name === 'escape') {
        cleanup();
        resolve(null);
      } else if (key.name === 'return' || key.name === 'enter') {
        const picked = matches[index];
        cleanup();
        if (picked) resolve({ key: 'X', label: picked.label, action: picked.action });
        else resolve(null);
      } else if (key.name === 'backspace') {
        query = query.slice(0, -1);
        filter();
      } else if (key.name === 'down') {
        index = Math.min(index + 1, Math.max(0, matches.length - 1));
        render();
      } else if (key.name === 'up') {
        index = Math.max(index - 1, 0);
        render();
      } else if (str && str.length === 1 && !key.ctrl && !key.meta) {
        query += str;
        filter();
      }
    };
    process.stdin.on('keypress', onKey);

    function cleanup() {
      process.stdin.off('keypress', onKey);
      if (process.stdin.isTTY) process.stdin.setRawMode(false);
    }
    function filter() {
      const q = query.toLowerCase();
      matches = items
        .filter((it) => it.label.toLowerCase().includes(q) || it.action.toLowerCase().includes(q))
        .slice(0, 12);
      index = 0;
      render();
    }
    function render() {
      renderHeader('Command Palette', `Query: ${query || ''}`);
      if (matches.length === 0) {
        console.log(theme().muted('Keine Treffer. Tippe zum Suchen, ESC zum Schließen.'));
      } else {
        matches.forEach((m, i) => {
          const line = `${m.label} ${m.hint ? theme().muted(`(${m.hint})`) : ''} ${theme().muted('→ ' + m.action)}`;
          console.log(i === index ? chalk.inverse(line) : line);
        });
      }
      console.log('');
      console.log(theme().muted('Tippe zum Suchen • ↑/↓ bewegen • Enter wählen • ESC schließen'));
    }
    filter();
  });
}

// Intro animation (futuristic gradient wave)
function gradientChar(c: string, i: number, t: number): string {
  const palette = [theme().accent, theme().primary, theme().highlight];
  const fn = palette[(i + t) % palette.length];
  return fn(c);
}
async function playIntroAnimation() {
  if (!MENU_STATE.animations) return;
  readline.emitKeypressEvents(process.stdin);
  let skipped = false;
  const onKey = () => {
    skipped = true;
  };
  process.stdin.on('keypress', onKey);
  if (process.stdin.isTTY) process.stdin.setRawMode(true);
  const lines = logo.split('\n');
  const frames = 18;
  for (let t = 0; t < frames; t++) {
    if (skipped) break;
    console.clear();
    console.log(
      lines
        .map((line) =>
          line
            .split('')
            .map((ch, i) => gradientChar(ch, i, t))
            .join('')
        )
        .join('\n')
    );
    console.log('');
    console.log(theme().muted('Press any key to skip • Evolution Hub Dev Menu'));
    await new Promise((r) => setTimeout(r, 60));
  }
  process.stdin.off('keypress', onKey);
  if (process.stdin.isTTY) process.stdin.setRawMode(false);
}

// Funktion zum Anzeigen des Menüs
async function displayMenu(options: MenuOption[], title: string) {
  const selection = await interactiveSelect(options, title);
  if (selection) {
    // If selection came from palette, it won't be in current options
    if (selection.key === 'X') handleMenuSelection(selection.key, [selection]);
    else handleMenuSelection(selection.key, options);
  }
}

// Funktion zum Ausführen eines npm-Befehls
async function runNpmCommand(command: string) {
  console.clear();
  console.log(chalk.yellow(`Führe aus: npm run ${command}`));
  console.log(chalk.gray('-------------------------------------'));

  try {
    await execa('npm', ['run', command], { stdio: 'inherit' });
  } catch (_error) {
    console.error(chalk.red(`Fehler beim Ausführen von 'npm run ${command}'`));
    if (IS_DIRECT_ACTION) process.exit(1);
  }

  console.log('');
  console.log(chalk.gray('-------------------------------------'));
  console.log(chalk.green('Befehl abgeschlossen.'));

  if (IS_DIRECT_ACTION) {
    process.exit(0);
  } else {
    rl.question(chalk.yellow('Drücken Sie Enter, um fortzufahren...'), () => {
      displayMainMenu();
    });
  }
}

// Funktion zum Ausführen eines direkten Befehls
async function runCommand(command: string) {
  console.clear();
  console.log(chalk.yellow(`Führe aus: ${command}`));
  console.log(chalk.gray('-------------------------------------'));

  try {
    await execaCommand(command, { stdio: 'inherit', shell: true });
  } catch (_error) {
    console.error(chalk.red(`Fehler beim Ausführen von '${command}'`));
    if (IS_DIRECT_ACTION) process.exit(1);
  }

  console.log('');
  console.log(chalk.gray('-------------------------------------'));
  console.log(chalk.green('Befehl abgeschlossen.'));

  if (IS_DIRECT_ACTION) {
    process.exit(0);
  } else {
    rl.question(chalk.yellow('Drücken Sie Enter, um fortzufahren...'), () => {
      displayMainMenu();
    });
  }
}

// Hilfsfunktionen für das Deployment-Menü
function displayDeployMenu() {
  displayMenu(deployMenuOptions, 'Deployment');
}

// Prompt helper
async function ask(question: string, def?: string): Promise<string> {
  return await new Promise((resolve) => {
    const q = def ? `${question} [${def}]: ` : `${question}: `;
    rl.question(chalk.yellow(q), (answer) => resolve(answer || def || ''));
  });
}

function inferBaseUrl(): string {
  if (process.env.BASE_URL) return process.env.BASE_URL;
  try {
    const toml = fs.readFileSync(path.join(__dirname, '..', 'wrangler.toml'), 'utf-8');
    const m = toml.match(/BASE_URL\s*=\s*"([^"]+)"/);
    if (m) return m[1];
  } catch {}
  return 'http://127.0.0.1:8787';
}

async function runHealthCheck() {
  const defaultUrl = inferBaseUrl();
  const url = IS_DIRECT_ACTION ? defaultUrl : await ask('Health-Check Ziel-URL', defaultUrl);
  console.clear();
  console.log(chalk.yellow(`Führe aus: npm run health-check -- --url ${url}`));
  console.log(chalk.gray('-------------------------------------'));
  try {
    await execa('npm', ['run', 'health-check', '--', '--url', url], { stdio: 'inherit' });
  } catch (_error) {
    console.error(chalk.red(`Fehler beim Ausführen von 'npm run health-check'`));
    if (IS_DIRECT_ACTION) process.exit(1);
  }
  console.log('');
  console.log(chalk.gray('-------------------------------------'));
  console.log(chalk.green('Befehl abgeschlossen.'));
  if (IS_DIRECT_ACTION) {
    process.exit(0);
  } else {
    rl.question(chalk.yellow('Drücken Sie Enter, um fortzufahren...'), () => {
      displayMainMenu();
    });
  }
}

async function deployToEnv(env: 'staging' | 'production') {
  console.clear();
  console.log(chalk.yellow(`Starte Deployment für ${env.toUpperCase()}...`));
  console.log(chalk.gray('-------------------------------------'));
  try {
    console.log(chalk.cyan('Schritt 1/2: Worker-Build ausführen (npm run build:worker)...'));
    await execa('npm', ['run', 'build:worker'], { stdio: 'inherit' });
    console.log(chalk.cyan('\nSchritt 2/2: Wrangler Deploy ausführen...'));
    await execa('npx', ['--no-install', 'wrangler', 'deploy', '--env', env], { stdio: 'inherit' });
    console.log(chalk.green('\n✓ Deployment abgeschlossen.'));
  } catch (_error) {
    console.error(chalk.red(`✗ Deployment fehlgeschlagen: ${String(_error)}`));
  }
  console.log('');
  if (IS_DIRECT_ACTION) {
    process.exit(0);
  } else {
    rl.question(chalk.yellow('Drücken Sie Enter, um zum Deployment-Menü zurückzukehren...'), () => {
      displayDeployMenu();
    });
  }
}

function confirmProductionDeploy(onConfirm: () => void) {
  console.clear();
  console.log(chalk.red('Achtung: Sie sind dabei, auf PRODUCTION zu deployen!'));
  console.log('');
  console.log(chalk.yellow('Zur Bestätigung tippen Sie bitte exakt: hub-evolution.com'));
  rl.question(chalk.yellow('Eingabe: '), (answer) => {
    if (answer.trim() === 'hub-evolution.com') {
      onConfirm();
    } else {
      console.log(chalk.red('Abgebrochen: Eingabe stimmte nicht überein.'));
      setTimeout(displayDeployMenu, 1500);
    }
  });
}

async function tailEnv(env: 'staging' | 'production') {
  console.clear();
  console.log(chalk.yellow(`Starte Log Tail für ${env.toUpperCase()}... (Beenden mit Ctrl+C)`));
  console.log(chalk.gray('-------------------------------------'));
  try {
    await execa('npx', ['--no-install', 'wrangler', 'tail', '--env', env, '--format=pretty'], {
      stdio: 'inherit',
    });
  } catch (_error) {
    // tail beendet typischerweise per Ctrl+C; Fehler hier ignorieren
  }
  console.log('');
  if (IS_DIRECT_ACTION) {
    process.exit(0);
  } else {
    rl.question(chalk.yellow('Drücken Sie Enter, um zum Deployment-Menü zurückzukehren...'), () => {
      displayDeployMenu();
    });
  }
}

async function openUrl(url: string) {
  try {
    // macOS 'open', linux 'xdg-open', windows 'start'
    const opener =
      process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
    await execaCommand(`${opener} ${url}`, { stdio: 'inherit', shell: true });
  } catch (_error) {
    console.error(chalk.red(`Konnte URL nicht öffnen: ${url}`));
  }
  if (IS_DIRECT_ACTION) {
    process.exit(0);
  } else {
    rl.question(chalk.yellow('Drücken Sie Enter, um zum Deployment-Menü zurückzukehren...'), () => {
      displayDeployMenu();
    });
  }
}

// Remote-Migrationen: Menü und Aktionen
function displayRemoteMigrationsMenu() {
  displayMenu(remoteMigrationsMenuOptions, 'Remote-DB-Migrationen');
}

async function applyLatestMigrationToEnv(env: 'staging' | 'production') {
  console.clear();
  console.log(chalk.yellow(`Wende neueste Migration auf ${env.toUpperCase()} an...`));
  console.log(chalk.gray('-------------------------------------'));
  try {
    const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

    const migrationFiles = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    if (migrationFiles.length === 0) {
      console.log(chalk.red('Keine Migrationsdateien gefunden.'));
      rl.question(chalk.yellow('Enter zum Zurückkehren...'), () => displayRemoteMigrationsMenu());
      return;
    }

    const latestMigration = migrationFiles[migrationFiles.length - 1];
    const migrationPath = path.join(MIGRATIONS_DIR, latestMigration);
    const dbName = getDbNameForEnv(env);

    if (env === 'production') {
      console.log(chalk.red('Achtung: Migration auf PRODUCTION!'));
      console.log(chalk.yellow('Zur Bestätigung tippen Sie bitte exakt: hub-evolution.com'));
      rl.question(chalk.yellow('Eingabe: '), (answer) => {
        if (answer.trim() !== 'hub-evolution.com') {
          console.log(chalk.red('Abgebrochen: Eingabe stimmte nicht überein.'));
          setTimeout(displayRemoteMigrationsMenu, 1500);
        } else {
          (async () => {
            try {
              await execa(
                'npx',
                [
                  '--no-install',
                  'wrangler',
                  'd1',
                  'execute',
                  dbName,
                  '--env',
                  env,
                  `--file=${migrationPath}`,
                ],
                { stdio: 'inherit' }
              );
              console.log(chalk.green(`✓ Migration angewendet: ${latestMigration}`));
            } catch (err) {
              console.error(chalk.red(`✗ Fehler bei Migration: ${err}`));
            }
            rl.question(chalk.yellow('Enter zum Zurückkehren...'), () =>
              displayRemoteMigrationsMenu()
            );
          })();
        }
      });
      return;
    }

    try {
      await execa(
        'npx',
        [
          '--no-install',
          'wrangler',
          'd1',
          'execute',
          dbName,
          '--env',
          env,
          `--file=${migrationPath}`,
        ],
        { stdio: 'inherit' }
      );
      console.log(chalk.green(`✓ Migration angewendet: ${latestMigration}`));
    } catch (_error) {
      console.error(chalk.red(`✗ Fehler bei Migration: ${String(_error)}`));
    }
  } catch (_error) {
    console.error(chalk.red(`Fehler beim Anwenden der Migration: ${String(_error)}`));
  }
  rl.question(chalk.yellow('Enter zum Zurückkehren...'), () => displayRemoteMigrationsMenu());
}

function getDbNameForEnv(env: 'staging' | 'production') {
  // Basierend auf wrangler.toml Konfiguration
  return env === 'production' ? 'evolution-hub-main' : 'evolution-hub-main-local';
}

// Funktion zum Anzeigen des Hauptmenüs
function displayMainMenu() {
  displayMenu(mainMenuOptions, 'Evolution Hub Entwicklungsmenü');
}

// Funktion zum Anzeigen des Datenbank-Menüs
function displayDbMenu() {
  displayMenu(dbMenuOptions, 'Datenbank-Verwaltung');
}

// Funktion zum Anzeigen des Build-Menüs
function displayBuildMenu() {
  displayMenu(buildMenuOptions, 'Build & Deployment');
}

// Funktion zum Anzeigen des Test-Menüs
function displayTestMenu() {
  displayMenu(testMenuOptions, 'Tests');
}

// Funktion zum Anzeigen des Entwicklungsmenüs
function displayDevMenu() {
  displayMenu(devMenuOptions, 'Lokale Entwicklung');
}

// Funktion zum Anzeigen des Datenbank-Reset-Menüs
function displayResetDbMenu() {
  displayMenu(resetDbMenuOptions, 'Datenbank zurücksetzen');
}

function displaySettingsMenu() {
  // refresh labels reflecting current state
  settingsMenuOptions[0].hint = THEMES[MENU_STATE.theme].name;
  settingsMenuOptions[1].label = MENU_STATE.animations
    ? 'Animationen deaktivieren'
    : 'Animationen aktivieren';
  displayMenu(settingsMenuOptions, 'Einstellungen');
}

function displayDocsMenu() {
  displayMenu(docsMenuOptions, 'Qualität & Docs');
}

// Funktion zum Anwenden aller Migrationen (lokal)
async function applyAllMigrations() {
  console.clear();
  console.log(chalk.yellow('Wende alle Migrationen auf die lokale D1-Datenbank an...'));
  console.log(chalk.gray('-------------------------------------'));

  try {
    // Lese alle Migrationsdateien aus dem migrations-Verzeichnis
    const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

    const migrationFiles = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((file) => file.endsWith('.sql'))
      .sort(); // Sortiere nach Namen (0000_..., 0001_..., usw.)

    // Wende jede Migrationsdatei an
    for (const migrationFile of migrationFiles) {
      const migrationPath = path.join(MIGRATIONS_DIR, migrationFile);
      console.log(chalk.cyan(`Wende Migration an: ${migrationFile}`));

      try {
        await execa(
          'npx',
          [
            '--no-install',
            'wrangler',
            'd1',
            'execute',
            'evolution-hub-main-local',
            '--local',
            `--file=${migrationPath}`,
          ],
          { stdio: 'inherit' }
        );
        console.log(chalk.green(`✓ Migration erfolgreich angewendet: ${migrationFile}`));
      } catch (_error) {
        console.error(chalk.red(`✗ Fehler bei Migration ${migrationFile}: ${String(_error)}`));
      }
    }

    console.log(chalk.green('\n✓ Alle Migrationen wurden angewendet!'));
  } catch (_error) {
    console.error(chalk.red(`Fehler beim Anwenden der Migrationen: ${String(_error)}`));
  }

  console.log('');
  console.log(chalk.gray('-------------------------------------'));

  rl.question(chalk.yellow('Drücken Sie Enter, um fortzufahren...'), () => {
    displayResetDbMenu();
  });
}

// Funktion zum Löschen und Neuerstellen der lokalen Datenbank
async function recreateLocalDb() {
  console.clear();
  console.log(chalk.yellow('Lösche und erstelle die lokale D1-Datenbank neu...'));
  console.log(chalk.gray('-------------------------------------'));

  try {
    // Lösche die lokale D1-Datenbank
    console.log(chalk.cyan('Lösche lokale D1-Datenbank...'));

    // Finde alle SQLite-Dateien, die vom Wrangler-Server verwendet werden könnten
    const ROOT_DIR = path.join(__dirname, '..');

    // Haupt-SQLite-Datei im miniflare/databases-Verzeichnis
    const mainDbDir = path.join(ROOT_DIR, '.wrangler', 'd1', 'miniflare', 'databases');
    if (fs.existsSync(mainDbDir)) {
      const mainDbPath = path.join(mainDbDir, 'evolution-hub-main-local.sqlite');
      if (fs.existsSync(mainDbPath)) {
        fs.unlinkSync(mainDbPath);
        console.log(chalk.green(`✓ Gelöscht: ${mainDbPath}`));
      }
    }

    // Suche nach weiteren SQLite-Dateien im state/v3/d1-Verzeichnis
    const stateDbDir = path.join(
      ROOT_DIR,
      '.wrangler',
      'state',
      'v3',
      'd1',
      'miniflare-D1DatabaseObject'
    );
    if (fs.existsSync(stateDbDir)) {
      const stateFiles = fs.readdirSync(stateDbDir);
      for (const file of stateFiles) {
        if (file.endsWith('.sqlite')) {
          const filePath = path.join(stateDbDir, file);
          fs.unlinkSync(filePath);
          console.log(chalk.green(`✓ Gelöscht: ${filePath}`));
        }
      }
    }

    // Erstelle die lokale D1-Datenbank neu
    console.log(chalk.cyan('\nErstelle lokale D1-Datenbank neu...'));
    try {
      await execa('npx', ['--no-install', 'wrangler', 'd1', 'create', 'evolution-hub-main-local'], {
        stdio: 'inherit',
      });
    } catch (_error) {
      // Ignoriere Fehler, wenn die Datenbank bereits existiert
      console.log(chalk.yellow('Hinweis: Die Datenbank existiert möglicherweise bereits.'));
    }

    // Wende alle Migrationen an
    console.log(chalk.cyan('\nWende alle Migrationen an...'));
    await applyAllMigrations();
  } catch (_error) {
    console.error(chalk.red(`Fehler beim Neuerstellen der Datenbank: ${String(_error)}`));
  }

  console.log('');
  console.log(chalk.gray('-------------------------------------'));

  rl.question(chalk.yellow('Drücken Sie Enter, um fortzufahren...'), () => {
    displayResetDbMenu();
  });
}

// Funktion zum Behandeln der Menüauswahl
function handleMenuSelection(answer: string, options: MenuOption[]) {
  const selectedOption = options.find((option) => option.key === answer);

  if (!selectedOption) {
    console.log(chalk.red('Ungültige Option. Bitte versuchen Sie es erneut.'));
    setTimeout(() => {
      if (options === mainMenuOptions) displayMainMenu();
      else if (options === dbMenuOptions) displayDbMenu();
      else if (options === buildMenuOptions) displayBuildMenu();
      else if (options === testMenuOptions) displayTestMenu();
      else if (options === devMenuOptions) displayDevMenu();
      else if (options === resetDbMenuOptions) displayResetDbMenu();
      else if (options === deployMenuOptions) displayDeployMenu();
      else if (options === remoteMigrationsMenuOptions) displayRemoteMigrationsMenu();
    }, 1500);
    return;
  }

  switch (selectedOption.action) {
    case 'exit':
      console.log(chalk.green('Auf Wiedersehen!'));
      rl.close();
      break;
    case 'main-menu':
      displayMainMenu();
      break;
    case 'db-menu':
      displayDbMenu();
      break;
    case 'build-menu':
      displayBuildMenu();
      break;
    case 'test-menu':
      displayTestMenu();
      break;
    case 'docs-menu':
      displayDocsMenu();
      break;
    case 'settings-menu':
      displaySettingsMenu();
      break;
    case 'dev-menu':
      displayDevMenu();
      break;
    case 'reset-db-menu':
      displayResetDbMenu();
      break;
    case 'deploy-menu':
      displayDeployMenu();
      break;
    case 'deploy-staging':
      deployToEnv('staging');
      break;
    case 'deploy-production':
      confirmProductionDeploy(() => deployToEnv('production'));
      break;
    case 'tail-staging':
      tailEnv('staging');
      break;
    case 'tail-production':
      tailEnv('production');
      break;
    case 'open-staging':
      openUrl('https://staging.hub-evolution.com');
      break;
    case 'open-production':
      openUrl('https://hub-evolution.com');
      break;
    case 'open-report-v2':
      openUrl('test-suite-v2/reports/playwright-html-report/index.html');
      break;
    case 'open-report-v1':
      openUrl('playwright-report/index.html');
      break;
    case 'remote-migrations-menu':
      displayRemoteMigrationsMenu();
      break;
    case 'apply-latest-migration-staging':
      applyLatestMigrationToEnv('staging');
      break;
    case 'apply-latest-migration-production':
      applyLatestMigrationToEnv('production');
      break;
    case 'apply-all-migrations':
      applyAllMigrations();
      break;
    case 'recreate-db':
      recreateLocalDb();
      break;
    case 'health-check':
      runHealthCheck();
      break;
    case 'settings-theme': {
      const themeNames = Object.keys(THEMES) as ThemeName[];
      const opts: MenuOption[] = themeNames.map((name, idx) => ({
        key: String(idx + 1),
        label: `${THEMES[name].name}${name === MENU_STATE.theme ? ' (aktiv)' : ''}`,
        action: `set-theme:${name}`,
      }));
      opts.push({ key: '0', label: 'Zurück', action: 'settings-menu' });
      displayMenu(opts, 'Theme wählen');
      break;
    }
    default:
      if (selectedOption.action.startsWith('set-theme:')) {
        const next = selectedOption.action.split(':')[1] as ThemeName;
        MENU_STATE.theme = next;
        saveState(MENU_STATE);
        displaySettingsMenu();
        break;
      }
      if (selectedOption.action === 'toggle-animations') {
        MENU_STATE.animations = !MENU_STATE.animations;
        saveState(MENU_STATE);
        displaySettingsMenu();
        break;
      }
      if (selectedOption.action.startsWith('wrangler') || selectedOption.action.startsWith('npx')) {
        let cmd = selectedOption.action;
        if (cmd.startsWith('wrangler')) {
          cmd = `npx --no-install ${cmd}`;
        } else if (cmd.startsWith('npx wrangler')) {
          cmd = cmd.replace(/^npx wrangler\b/, 'npx --no-install wrangler');
        }
        runCommand(cmd);
      } else {
        runNpmCommand(selectedOption.action);
      }
      break;
  }
}

// Starte das Hauptmenü (nicht in CI/Non-TTY)
// Direktaufruf via --action in CI/Non-TTY unterstützen
if (ARGS.action) {
  // finde action in allen bekannten Optionen und führe aus
  const allOptions = [
    ...mainMenuOptions,
    ...devMenuOptions,
    ...resetDbMenuOptions,
    ...dbMenuOptions,
    ...buildMenuOptions,
    ...deployMenuOptions,
    ...remoteMigrationsMenuOptions,
    ...testMenuOptions,
    ...settingsMenuOptions,
    ...docsMenuOptions,
  ];
  const fakeOptions = allOptions.map((o, idx) => ({ ...o, key: String(idx) }));
  const match = fakeOptions.find((o) => o.action === ARGS.action);
  if (!match) {
    console.error(chalk.red(`Unbekannte Aktion: ${ARGS.action}`));
    process.exit(1);
  }
  handleMenuSelection(match.key, fakeOptions);
} else if (!IS_INTERACTIVE) {
  console.log(
    chalk.yellow('Nicht-interaktive Umgebung erkannt (CI oder kein TTY). Menü wird übersprungen.')
  );
  try {
    rl.close();
  } catch {
    /* noop */
  }
  process.exit(0);
} else {
  (async () => {
    startStatusAutoRefresh();
    await playIntroAnimation();
    displayMainMenu();
  })();
}

// Event-Handler für das Schließen der readline-Schnittstelle
rl.on('close', () => {
  process.exit(0);
});
