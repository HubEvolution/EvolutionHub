// Run with: node scripts/emoji-to-icon-codemod.mjs [--dry]
import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';

const DRY_RUN = process.argv.includes('--dry');

const repoRoot = process.cwd();

const INCLUDE_DIRS = ['src/pages', 'src/components', 'src/locales'];

const EXCLUDE_CONTAINS = [
  'node_modules',
  'dist',
  'coverage',
  'test/',
  'tests/',
  'test-suite-v2/',
  '/scripts/', // Komponenten-Skripte, nicht UI-Templates
  '/debug/', // Debug-Seiten/Ordner
  '/api/', // Serverrouten, keine UI-Seiten
];

const EXCLUDE_FILES = new Set(['src/components/ui/Icon.astro', 'src/components/ui/Icon.tsx']);

// Mapping Emoji → Icon-Key
const EMOJI_MAP = new Map(
  Object.entries({
    '🎉': 'celebration',
    '🚀': 'rocket',
    '📊': 'chart',
    '💡': 'lightbulb',
    '🔍': 'search',
    '🔑': 'key',
    '🔄': 'refresh',
    '🔧': 'tool',
    '🎨': 'palette',
    '💻': 'laptop',
    '🖼️': 'photo',
    '🔇': 'noise',
    '🎛️': 'preset',
    '📦': 'box',
    '📧': 'mail',
    '🎁': 'gift',
    '✍️': 'edit',
    '🎯': 'target',
    '📚': 'book',
    '🔌': 'plug',
    '📋': 'clipboard',
    '✅': 'check',
    '🔔': 'bell',
    '💬': 'chat',
    '🟢': 'statusDot',
    '🔵': 'statusDot',
    '🟠': 'statusDot',
    '🖱️': 'mouse',
  })
);

const VARIATION_SELECTOR = '\uFE0F'; // U+FE0F

function shouldWalk(fullPath) {
  const norm = fullPath.split(path.sep).join('/');
  for (const ex of EXCLUDE_CONTAINS) {
    if (norm.includes(ex)) return false;
  }
  return true;
}

function shouldProcessFile(fullPath) {
  const norm = fullPath.split(path.sep).join('/');
  if (!INCLUDE_DIRS.some((d) => norm.startsWith(d))) return false;
  if (EXCLUDE_FILES.has(norm)) return false;
  for (const ex of EXCLUDE_CONTAINS) {
    if (norm.includes(ex)) return false;
  }
  return true;
}

async function walk(dir, out = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (!shouldWalk(full)) continue;
    if (e.isDirectory()) {
      await walk(full, out);
    } else {
      if (shouldProcessFile(full)) out.push(full);
    }
  }
  return out;
}

// Ensure import for Astro file (adds inside frontmatter or creates one)
function ensureAstroIconImport(content) {
  const importLine = `import Icon from '@/components/ui/Icon.astro';`;

  if (content.startsWith('---')) {
    const end = content.indexOf('---', 3);
    if (end !== -1) {
      const header = content.slice(0, end + 3);
      const body = content.slice(end + 3);
      if (!header.includes(importLine)) {
        const updatedHeader = header.replace('---', `---\n${importLine}`);
        return updatedHeader + body;
      }
      return content;
    }
  }

  // no frontmatter
  if (!content.includes(importLine)) {
    return `---\n${importLine}\n---\n` + content;
  }
  return content;
}

// Ensure import for React file (.jsx/.tsx)
function ensureReactIconImport(content) {
  const aliasImport = `import Icon from '@/components/ui/Icon';`;
  // If any Icon import already exists (relative or alias), do nothing
  const anyIconImportRegex = /import\s+Icon\s+from\s+['"][^'"]*\/Icon['"];?/;
  if (anyIconImportRegex.test(content)) return content;

  // Insert after last import or at top
  const importRegex = /^(?:import .*?;\s*)+/s;
  const m = content.match(importRegex);
  if (m) {
    const last = m[0];
    return last + aliasImport + '\n' + content.slice(last.length);
  }
  return aliasImport + '\n' + content;
}

function escapeAttr(s) {
  return String(s).replace(/"/g, '"');
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildIconSnippet(iconKey, target = 'astro', ariaLabel) {
  const label = ariaLabel || iconKey;
  if (target === 'react') {
    return `<Icon name="${iconKey}" className="w-4 h-4 inline-block align-[-0.125em]" ariaLabel="${escapeAttr(label)}" />`;
  }
  return `<Icon name="${iconKey}" class="w-5 h-5 inline-block align-[-0.125em]" ariaLabel="${escapeAttr(label)}" />`;
}

// Replace emojis in text nodes (between ">" and "<") for Astro
function replaceTextNodesAstro(content) {
  return content.replace(/>([\s\S]*?)</g, (full, text) => {
    const replaced = replaceEmojiText(text, 'astro');
    return '>' + replaced + '<';
  });
}

// Replace emojis in text nodes (between ">" and "<") for React JSX/TSX
function replaceTextNodesReact(content) {
  return content.replace(/>([\s\S]*?)</g, (full, text) => {
    const replaced = replaceEmojiText(text, 'react');
    return '>' + replaced + '<';
  });
}

// Replace all emoji occurrences inside a text snippet
function replaceEmojiText(text, target) {
  let out = text;
  for (const [emoji, key] of EMOJI_MAP.entries()) {
    // Allow optional variation selector after emoji
    const pattern = new RegExp(`${escapeRegex(emoji)}(?:${VARIATION_SELECTOR})?`, 'g');
    out = out.replace(pattern, () => buildIconSnippet(key, target, key));
  }
  // Also normalize "<10ms" to HTML entity in text to avoid JSX parse issues
  out = out.replace(/<(\d+ms)/g, '<$1');
  return out;
}

async function processAstro(file) {
  let src = await readFile(file, 'utf8');
  const orig = src;

  // Only change text nodes in markup; keep frontmatter/scripts intact
  src = replaceTextNodesAstro(src);

  // Ensure import only if Icon snippets were inserted
  if (src.includes('<Icon name="')) {
    src = ensureAstroIconImport(src);
  }

  if (src !== orig) {
    if (!DRY_RUN) await writeFile(file, src, 'utf8');
    return true;
  }
  return false;
}

async function processJsxTsx(file) {
  let src = await readFile(file, 'utf8');
  const orig = src;

  src = replaceTextNodesReact(src);

  if (src.includes('<Icon name="')) {
    src = ensureReactIconImport(src);
  }

  if (src !== orig) {
    if (!DRY_RUN) await writeFile(file, src, 'utf8');
    return true;
  }
  return false;
}

function stripLeadingEmoji(str) {
  // Remove leading emoji + optional VS16 + spaces
  const emojis = Array.from(EMOJI_MAP.keys()).map(escapeRegex).join('|');
  const re = new RegExp(`^(?:${emojis})(?:${escapeRegex(VARIATION_SELECTOR)})?\\s*`);
  return str.replace(re, '');
}

function normalizeLocalesObject(obj) {
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    for (const k of Object.keys(obj)) {
      const v = obj[k];
      if (v && typeof v === 'object') {
        normalizeLocalesObject(v);
      } else if (typeof v === 'string') {
        if (k === 'icon' && EMOJI_MAP.has(v)) {
          obj[k] = EMOJI_MAP.get(v);
        } else {
          obj[k] = stripLeadingEmoji(v);
        }
      }
    }
  } else if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      const v = obj[i];
      if (v && typeof v === 'object') {
        normalizeLocalesObject(v);
      } else if (typeof v === 'string') {
        obj[i] = stripLeadingEmoji(v);
      }
    }
  }
}

async function processJson(file) {
  try {
    const src = await readFile(file, 'utf8');
    const data = JSON.parse(src);
    const before = JSON.stringify(data);
    normalizeLocalesObject(data);
    const after = JSON.stringify(data);
    if (before !== after) {
      const pretty = JSON.stringify(data, null, 2) + '\n';
      if (!DRY_RUN) await writeFile(file, pretty, 'utf8');
      return true;
    }
    return false;
  } catch (e) {
    console.warn(`[codemod] Überspringe ungültiges JSON: ${file} (${e?.message || e})`);
    return false;
  }
}

function extOf(file) {
  return path.extname(file).toLowerCase();
}

(async () => {
  const targets = [];
  for (const d of INCLUDE_DIRS) {
    const full = path.join(repoRoot, d);
    try {
      const st = await stat(full);
      if (st.isDirectory()) {
        await walk(full, targets);
      }
    } catch {
      // ignore missing dirs
    }
  }

  let changed = 0;
  const touched = [];

  for (const file of targets) {
    const ext = extOf(file);
    try {
      if (ext === '.astro') {
        const norm = file.split(path.sep).join('/');
        // Additional safety: skip API/debug/scripts paths
        if (norm.includes('/api/') || norm.includes('/debug/') || norm.includes('/scripts/')) {
          continue;
        }
        if (await processAstro(file)) {
          changed++;
          touched.push(file);
        }
      } else if (ext === '.tsx' || ext === '.jsx') {
        const norm = file.split(path.sep).join('/');
        if (norm.includes('/scripts/')) continue;
        if (await processJsxTsx(file)) {
          changed++;
          touched.push(file);
        }
      } else if (ext === '.json' && file.split(path.sep).join('/').startsWith('src/locales/')) {
        if (await processJson(file)) {
          changed++;
          touched.push(file);
        }
      }
    } catch (e) {
      console.warn(`[codemod] Fehler bei ${file}: ${e?.message || e}`);
    }
  }

  console.log(`[codemod] Fertig. Dateien ${DRY_RUN ? 'potenziell' : ''} geändert: ${changed}`);
  for (const f of touched) {
    console.log(` - ${f}`);
  }
})();
