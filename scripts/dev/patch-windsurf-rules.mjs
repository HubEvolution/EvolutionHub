import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

function ensureDir(p) {
  const dir = dirname(p);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function insertIntoSection(content, sectionHeader, bulletsText) {
  const secIdx = content.indexOf(sectionHeader);
  if (secIdx === -1) {
    return content.trimEnd() + `\n\n${sectionHeader}\n\n${bulletsText}`;
  }
  const nextSecIdx = content.indexOf('\n## ', secIdx + sectionHeader.length);
  const insertPos = nextSecIdx === -1 ? content.length : nextSecIdx;
  return content.slice(0, insertPos).trimEnd() + `\n${bulletsText}` + content.slice(insertPos);
}

function patchAuthRules() {
  const file = '.windsurf/rules/auth.md';
  let content = readFileSync(file, 'utf8');
  const already = content.includes('STYTCH_PKCE') || content.includes('pkce_verifier') || content.includes('X-Stytch-Request-Id');
  if (already) return false;
  const bullets = [
    '- PKCE (feature-flagged): When `STYTCH_PKCE` is enabled, `POST /api/auth/magic/request` sets a short‑lived HttpOnly cookie `pkce_verifier` (SameSite=Lax, TTL 10 min) and includes a `pkce_code_challenge` in the Stytch request. `GET /api/auth/callback` must present `pkce_code_verifier`; the cookie is deleted after consumption. Disable PKCE for mobile webviews to avoid context-switch failures.\n',
    '- Observability: Auth callbacks (Magic Link and OAuth) set `X-Stytch-Request-Id` on responses to aid provider support correlation.\n',
  ].join('');
  content = insertIntoSection(content, '## Security & Privacy', bullets);
  writeFileSync(file, content, 'utf8');
  return true;
}

function patchApiSecurityRules() {
  const file = '.windsurf/rules/api-and-security.md';
  let content = readFileSync(file, 'utf8');
  let changed = false;
  if (!content.includes('X-Stytch-Request-Id')) {
    content = content.trimEnd() + '\n- Observability: auth callbacks include `X-Stytch-Request-Id` in responses. Capture/log this ID for provider support.\n';
    changed = true;
  }
  if (!content.includes('pkce_verifier')) {
    content = content.trimEnd() + '\n- PKCE cookie: `pkce_verifier` is HttpOnly, SameSite=Lax, TTL 10 minutes; created by `POST /api/auth/magic/request` when `STYTCH_PKCE` is enabled and deleted by `GET /api/auth/callback` after use.\n';
    changed = true;
  }
  if (changed) writeFileSync(file, content, 'utf8');
  return changed;
}

try {
  const a = patchAuthRules();
  const b = patchApiSecurityRules();
  console.log(JSON.stringify({ patched: { auth: a, apiAndSecurity: b } }));
} catch (e) {
  console.error('patch failed:', e?.message || e);
  process.exit(1);
}
