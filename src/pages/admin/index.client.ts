// Admin Dashboard client script (typed)
// Bundled via <script type="module" src={Astro.resolve('./index.client.ts')} nonce={Astro.locals.cspNonce}>

// Helpers
function ensureCsrfToken(): string {
  try {
    const cookie = document.cookie || '';
    const m = cookie.match(/(?:^|; )csrf_token=([^;]+)/);
    if (m && m[1]) return decodeURIComponent(m[1]);
    const buf = new Uint8Array(16);
    (globalThis.crypto || window.crypto).getRandomValues(buf);
    const token = Array.from(buf)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    const attrs = [
      'Path=/',
      'SameSite=Lax',
      typeof location !== 'undefined' && location.protocol === 'https:' ? 'Secure' : '',
    ]
      .filter(Boolean)
      .join('; ');
    document.cookie = `csrf_token=${encodeURIComponent(token)}; ${attrs}`;
    return token;
  } catch {
    return '';
  }
}

function $(id: string): HTMLElement | null {
  return document.getElementById(id);
}

function q<T = HTMLElement>(id: string): T | null {
  return (document.getElementById(id) as unknown) as T | null;
}

function show(el: Element | null) {
  if (el) el.classList.remove('hidden');
}

function hide(el: Element | null) {
  if (el) el.classList.add('hidden');
}

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {}
}

// Types for API responses we use
interface ApiSuccess<T> { success: true; data: T }
interface ApiError { success?: false; error?: { message?: string } }
type ApiResponse<T> = ApiSuccess<T> | ApiError;
function isApiSuccess<T>(j: unknown): j is ApiSuccess<T> {
  return !!j && (j as any).success === true;
}

type AdminStatus = ApiSuccess<{
  user: { id: string; email: string };
  plan: 'free' | 'pro' | 'premium' | 'enterprise';
  credits: number;
  subscriptions: Array<{ id: string; plan: string; status: string; current_period_end: number | null; updated_at: string }>;
}>;

type UserSummary = ApiSuccess<{
  user: { id: string; email: string; name?: string; plan: 'free' | 'pro' | 'premium' | 'enterprise' };
  credits: number;
  subscription: { status: string; currentPeriodEnd: number | null } | null;
  lastSeenAt?: number | null;
  lastIp?: string | null;
}>;

type MetricsData = { activeSessions?: number; activeUsers?: number; usersTotal?: number; usersNew24h?: number };

type CommentsList = ApiSuccess<{
  comments: Array<{ id: string; author?: { email?: string }; entityType: string; entityId: string; status: string; createdAt: string }>;
  stats: { total: number; pending: number; approved: number; rejected: number; flagged: number };
  pagination?: { count?: number };
}>;

// (Removed several unused type aliases to avoid lint warnings)

// Core logic
async function loadAdminStatus() {
  const container = q('admin-status-container');
  if (!container) return;
  try {
    const res = await fetch('/api/admin/status', { credentials: 'include', cache: 'no-store' });
    const j = (await res.json()) as AdminStatus | ApiError;
    if (!('success' in j) || !j.success) return;
    const d = j.data;
    const subs = Array.isArray(d.subscriptions) ? d.subscriptions.slice(0, 3) : [];
    container.innerHTML = `
      <div class="grid grid-cols-1 gap-3 text-sm text-white/80 sm:grid-cols-2">
        <div><span class="text-white/50">User ID:</span> ${d.user.id}</div>
        <div><span class="text-white/50">E‑Mail:</span> ${d.user.email}</div>
        <div><span class="text-white/50">Plan:</span> ${d.plan}</div>
        <div><span class="text-white/50">Credits:</span> ${d.credits}</div>
        <div class="sm:col-span-2">
          <div class="text-white/50 mb-1">Letzte Subscriptions</div>
          <ul class="space-y-1">
            ${subs
              .map(
                (s) => `
                  <li>
                    <span class="text-white/70">${s.plan}</span>
                    <span class="text-white/40"> • ${s.status}</span>
                    <span class="text-white/40"> • Ende: ${s.current_period_end ? new Date(s.current_period_end * 1000).toLocaleString() : '—'}</span>
                  </li>`
              )
              .join('')}
          </ul>
        </div>
      </div>`;
  } catch {}
}

async function loadMetrics() {
  try {
    const res = await fetch('/api/admin/metrics', { credentials: 'include', cache: 'no-store' });
    const j = (await res.json()) as ApiResponse<MetricsData>;
    const d: Partial<MetricsData> = isApiSuccess<MetricsData>(j) ? j.data : {};
    const set = (id: string, v: unknown) => { const el = $(id); if (el) el.textContent = String(v ?? '–'); };
    set('m-active-sessions', d.activeSessions);
    set('m-active-users', d.activeUsers);
    set('m-users-total', d.usersTotal);
    set('m-users-new24h', d.usersNew24h);
  } catch {}
}

function setStats(stats: { total: number; pending: number; approved: number; rejected: number; flagged: number }) {
  const set = (id: string, v: number) => { const el = $(id); if (el) el.textContent = String(v ?? 0); };
  set('cstat-total', stats.total);
  set('cstat-pending', stats.pending);
  set('cstat-approved', stats.approved);
  set('cstat-rejected', stats.rejected);
  set('cstat-flagged', stats.flagged);
}

let cOffset = 0;
let cStatusVal = 'all';
const PAGE_SIZE = 12;

function setPaging(count: number, total: number) {
  const cPage = q('c-page');
  const cPrev = q<HTMLButtonElement>('c-prev');
  const cNext = q<HTMLButtonElement>('c-next');
  const from = total === 0 ? 0 : cOffset + 1;
  const to = cOffset + count;
  if (cPage) cPage.textContent = `${from}–${to} von ${total}`;
  if (cPrev) cPrev.disabled = cOffset === 0;
  if (cNext) cNext.disabled = cOffset + count >= total;
}

async function loadComments() {
  try {
    const params = new URLSearchParams();
    params.set('limit', String(PAGE_SIZE));
    params.set('offset', String(cOffset));
    params.set('includeReports', 'true');
    if (cStatusVal && cStatusVal !== 'all') params.set('status', cStatusVal);
    const res = await fetch(`/api/admin/comments?${params.toString()}`, { credentials: 'include', cache: 'no-store' });
    const j = (await res.json()) as CommentsList | ApiError;
    const d = ('success' in j && j.success)
      ? j.data
      : { comments: [], stats: { total: 0, pending: 0, approved: 0, rejected: 0, flagged: 0 } };
    setStats(d.stats);
    const tbody = q<HTMLTableSectionElement>('comments-tbody');
    if (tbody && Array.isArray(d.comments)) {
      const comments = d.comments as Array<{ id: string; author?: { email?: string }; entityType: string; entityId: string; status: string; createdAt: string }>;
      tbody.innerHTML = comments
        .map((c: { id: string; author?: { email?: string }; entityType: string; entityId: string; status: string; createdAt: string }) => `
          <tr class="border-t border-white/10">
            <td class="px-2 py-1"><input type="checkbox" class="comment-select" data-comment-id="${c.id}" /></td>
            <td class="px-2 py-1 whitespace-nowrap">${c.id}</td>
            <td class="px-2 py-1">${(c.author?.email || '—')}</td>
            <td class="px-2 py-1">${c.entityType}:${c.entityId}</td>
            <td class="px-2 py-1">${c.status}</td>
            <td class="px-2 py-1 whitespace-nowrap">${c.createdAt}</td>
          </tr>
        `)
        .join('');
    }
    const pageCount = (d as any)?.pagination?.count ?? (Array.isArray(d.comments) ? d.comments.length : 0);
    const total = d.stats.total ?? 0;
    setPaging(pageCount, total);
  } catch {}
}

async function loadAuditLogs() {
  const list = q('audit-list');
  const err = q('audit-error');
  if (err) err.classList.add('hidden');
  if (list) list.innerHTML = '';
  try {
    const typeSel = q<HTMLSelectElement>('audit-type');
    const p = new URLSearchParams();
    p.set('limit', '10');
    const t = (typeSel && typeSel.value) || '';
    if (t) p.set('eventType', t);
    const res = await fetch(`/api/admin/audit/logs?${p.toString()}`, { credentials: 'include', cache: 'no-store' });
    const j = (await res.json()) as ApiResponse<{ items: Array<{ id: string; createdAt: number; eventType: string; resource?: string; action?: string }> }>;
    if (!res.ok || !isApiSuccess(j)) { if (err) { err.textContent = (j as ApiError)?.error?.message || 'Laden fehlgeschlagen'; err.classList.remove('hidden'); } return; }
    const items = j.data.items || [];
    if (list) {
      if (!items.length) {
        list.innerHTML = '<div class="text-white/50">Keine Einträge.</div>';
      } else {
        list.innerHTML = items.map((it) => {
          const d = new Date(it.createdAt).toLocaleString();
          return `<div class="border-t border-white/10 py-2"><div class="text-white/70">${d} • ${it.eventType}</div><div class="text-white/50">${it.resource || ''} ${it.action || ''}</div></div>`;
        }).join('');
      }
    }
  } catch {
    if (err) { err.textContent = 'Laden fehlgeschlagen'; err.classList.remove('hidden'); }
  }
}

async function loadSessionsForUser() {
  const userIdEl = q<HTMLInputElement>('sess-userid');
  const list = q('sess-list');
  const err = q('sess-error');
  if (err) err.classList.add('hidden');
  if (!userIdEl || !userIdEl.value.trim()) { if (err) { err.textContent = 'userId erforderlich'; err.classList.remove('hidden'); } return; }
  try {
    const p = new URLSearchParams(); p.set('userId', userIdEl.value.trim());
    const res = await fetch(`/api/admin/users/sessions?${p.toString()}`, { credentials: 'include', cache: 'no-store' });
    const j = (await res.json()) as ApiResponse<{ items: Array<{ id: string; userId: string; expiresAt: number | null }> }>;
    if (!res.ok || !isApiSuccess(j)) { if (err) { err.textContent = (j as ApiError)?.error?.message || 'Laden fehlgeschlagen'; err.classList.remove('hidden'); } return; }
    const items = Array.isArray(j.data.items) ? j.data.items : [];
    if (list) {
      list.innerHTML = items.map((s: { id: string; userId: string; expiresAt: number | null }) => {
        const d = s.expiresAt ? new Date(s.expiresAt).toLocaleString() : '—';
        return `<div class="border-t border-white/10 py-2"><div class="text-white/70">${s.id}</div><div class="text-white/50">Expires: ${d}</div></div>`;
      }).join('');
    }
  } catch {
    if (err) { err.textContent = 'Laden fehlgeschlagen'; err.classList.remove('hidden'); }
  }
}

async function revokeAllSessionsForUser() {
  const userIdEl = q<HTMLInputElement>('sess-userid');
  const err = q('sess-error');
  if (err) err.classList.add('hidden');
  if (!userIdEl || !userIdEl.value.trim()) { if (err) { err.textContent = 'userId erforderlich'; err.classList.remove('hidden'); } return; }
  try {
    const csrf = ensureCsrfToken();
    const res = await fetch('/api/admin/users/revoke-sessions', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
      body: JSON.stringify({ userId: userIdEl.value.trim() }),
    });
    const j = (await res.json()) as ApiResponse<unknown>;
    if (!res.ok || !isApiSuccess(j)) { if (err) { err.textContent = (j as ApiError)?.error?.message || 'Widerruf fehlgeschlagen'; err.classList.remove('hidden'); } return; }
    await loadSessionsForUser();
  } catch {
    if (err) { err.textContent = 'Widerruf fehlgeschlagen'; err.classList.remove('hidden'); }
  }
}

async function resolveUserId(raw: string): Promise<string | null> {
  const v = (raw || '').trim();
  if (!v) return null;
  if (v.includes('@')) {
    try {
      const p = new URLSearchParams(); p.set('email', v.toLowerCase());
      const res = await fetch(`/api/admin/users/summary?${p.toString()}`, { credentials: 'include', cache: 'no-store' });
      const j = (await res.json()) as UserSummary | ApiError;
      const id = 'success' in j && j.success ? j.data.user.id : null;
      return res.ok && id ? String(id) : null;
    } catch { return null; }
  }
  return v;
}

async function loadCreditsBalanceForUser() {
  const userIdEl = q<HTMLInputElement>('cu-userid');
  const out = q('cu-balance-out');
  const err = q('cu-error');
  if (err) err.classList.add('hidden');
  if (out) out.textContent = '';
  if (!userIdEl || !userIdEl.value.trim()) { if (err) { err.textContent = 'E‑Mail oder userId erforderlich'; err.classList.remove('hidden'); } return; }
  try {
    const resolved = await resolveUserId(userIdEl.value);
    if (!resolved) { if (err) { err.textContent = 'Konnte userId nicht auflösen'; err.classList.remove('hidden'); } return; }
    if (userIdEl && userIdEl.value !== resolved && !userIdEl.value.includes('@')) { userIdEl.value = resolved; }
    const p = new URLSearchParams(); p.set('userId', resolved);
    const res = await fetch(`/api/admin/credits/usage?${p.toString()}`, { credentials: 'include', cache: 'no-store' });
    const j = (await res.json()) as ApiResponse<{ credits: number; tenths: number }>;
    if (!res.ok || !isApiSuccess(j)) { if (err) { err.textContent = (j as ApiError)?.error?.message || 'Laden fehlgeschlagen'; err.classList.remove('hidden'); } return; }
    const d = j.data;
    if (out) out.textContent = `Balance: ${d.credits} Credits (${d.tenths} tenth)`;
  } catch {
    if (err) { err.textContent = 'Laden fehlgeschlagen'; err.classList.remove('hidden'); }
  }
}

async function loadCreditPacksForUser() {
  const userIdEl = q<HTMLInputElement>('cu-userid');
  const list = q('cu-packs-list');
  const err = q('cu-error');
  if (err) err.classList.add('hidden');
  if (list) list.innerHTML = '';
  if (!userIdEl || !userIdEl.value.trim()) { if (err) { err.textContent = 'E‑Mail oder userId erforderlich'; err.classList.remove('hidden'); } return; }
  try {
    const resolved = await resolveUserId(userIdEl.value);
    if (!resolved) { if (err) { err.textContent = 'Konnte userId nicht auflösen'; err.classList.remove('hidden'); } return; }
    if (userIdEl && userIdEl.value !== resolved && !userIdEl.value.includes('@')) { userIdEl.value = resolved; }
    const p = new URLSearchParams(); p.set('userId', resolved);
    const res = await fetch(`/api/admin/credits/history?${p.toString()}`, { credentials: 'include', cache: 'no-store' });
    const j = (await res.json()) as ApiResponse<{ items: Array<{ id: string; unitsTenths: number; createdAt?: number; expiresAt?: number }> }>;
    if (!res.ok || !isApiSuccess(j)) { if (err) { err.textContent = (j as ApiError)?.error?.message || 'Laden fehlgeschlagen'; err.classList.remove('hidden'); } return; }
    const items = Array.isArray(j.data.items) ? j.data.items : [];
    if (list) {
      list.innerHTML = items.map((p: { id: string; unitsTenths: number; createdAt?: number; expiresAt?: number }) => {
        const created = p.createdAt ? new Date(p.createdAt).toLocaleString() : '—';
        const expires = p.expiresAt ? new Date(p.expiresAt).toLocaleString() : '—';
        return `<div class="border-t border-white/10 py-2"><div class="text-white/70">${p.id}</div><div class="text-white/50">Units (tenths): ${p.unitsTenths} • Created: ${created} • Expires: ${expires}</div></div>`;
      }).join('');
    }
  } catch {
    if (err) { err.textContent = 'Laden fehlgeschlagen'; err.classList.remove('hidden'); }
  }
}

async function loadRateLimiterState() {
  const nameEl = q<HTMLInputElement>('rl-name');
  const err = q('rl-error');
  const stateEl = q('rl-state');
  if (err) err.classList.add('hidden');
  if (stateEl) stateEl.innerHTML = '';
  try {
    const p = new URLSearchParams();
    const name = (nameEl?.value || '').trim();
    if (name) p.set('name', name);
    const url = p.toString() ? `/api/admin/rate-limits/state?${p.toString()}` : '/api/admin/rate-limits/state';
    const res = await fetch(url, { credentials: 'include', cache: 'no-store' });
    const j = (await res.json()) as ApiResponse<{ state: Record<string, { maxRequests: number; windowMs: number; entries: Array<{ key: string; count: number; resetAt?: number }> }> }>;
    if (!res.ok || !isApiSuccess(j)) { if (err) { err.textContent = (j as ApiError)?.error?.message || 'Laden fehlgeschlagen'; err.classList.remove('hidden'); } return; }
    const state = j.data.state || {};
    if (stateEl) {
      stateEl.innerHTML = Object.entries(state).map(([limName, info]) => {
        const entries = Array.isArray((info as any).entries) ? (info as any).entries : [];
        const maxRequests = (info as any).maxRequests;
        const windowMs = (info as any).windowMs || 0;
        return `<div class="mb-3"><div class="text-white/70 font-medium">${limName} • max ${maxRequests}/ ${Math.round(windowMs/1000)}s</div>${entries
          .map((e: any) => `<div class="text-white/50">${e.key} • count ${e.count} • reset ${e.resetAt ? new Date(e.resetAt).toLocaleTimeString() : '—'}</div>`)
          .join('')}</div>`;
      }).join('');
    }
  } catch {
    if (err) { err.textContent = 'Laden fehlgeschlagen'; err.classList.remove('hidden'); }
  }
}

async function resetRateLimiterKeyAction() {
  const nameEl = q<HTMLInputElement>('rl-reset-name');
  const keyEl = q<HTMLInputElement>('rl-reset-key');
  const okEl = q('rl-success');
  const err = q('rl-error');
  if (err) err.classList.add('hidden');
  if (okEl) okEl.classList.add('hidden');
  const name = (nameEl?.value || '').trim();
  const key = (keyEl?.value || '').trim();
  if (!name || !key) { if (err) { err.textContent = 'name und key erforderlich'; err.classList.remove('hidden'); } return; }
  try {
    const csrf = ensureCsrfToken();
    const res = await fetch('/api/admin/rate-limits/reset', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
      body: JSON.stringify({ name, key }),
    });
    const j = (await res.json()) as ApiResponse<unknown>;
    if (!res.ok || !isApiSuccess(j)) { if (err) { err.textContent = (j as ApiError)?.error?.message || 'Reset fehlgeschlagen'; err.classList.remove('hidden'); } return; }
    if (okEl) { okEl.textContent = 'OK: Reset durchgeführt'; okEl.classList.remove('hidden'); }
    await loadRateLimiterState();
  } catch {
    if (err) { err.textContent = 'Reset fehlgeschlagen'; err.classList.remove('hidden'); }
  }
}

// Event wiring
function start() {
  // Lookup
  const lookupBtn = q<HTMLButtonElement>('lookup-btn');
  const lookupClear = q<HTMLButtonElement>('lookup-clear');
  const lookupInput = q<HTMLInputElement>('lookup-input');
  const lookupResult = q('lookup-result');
  const lookupError = q('lookup-error');

  lookupBtn?.addEventListener('click', async (e) => {
    e?.preventDefault?.();
    hide(lookupError); hide(lookupResult);
    const v = (lookupInput?.value || '').trim();
    if (!v) { if (lookupError) { lookupError.textContent = 'Bitte E‑Mail oder ID eingeben.'; show(lookupError); } return; }
    const p = new URLSearchParams();
    if (v.includes('@')) p.set('email', v.toLowerCase()); else p.set('id', v);
    const url = `/api/admin/users/summary?${p.toString()}`;
    try {
      const res = await fetch(url, { credentials: 'include', cache: 'no-store' });
      const json = (await res.json()) as UserSummary | ApiError;
      if (!('success' in json) || !json.success) { if (lookupError) { lookupError.textContent = (json as any)?.error?.message || 'Lookup fehlgeschlagen'; show(lookupError); } return; }
      const d = json.data;
      const lrId = q('lr-id'); const lrEmail = q('lr-email'); const lrName = q('lr-name'); const lrPlan = q('lr-plan'); const lrCredits = q('lr-credits'); const lrSub = q('lr-sub');
      if (lrId) lrId.textContent = d.user.id;
      if (lrEmail) lrEmail.textContent = d.user.email;
      if (lrName) lrName.textContent = d.user.name || '';
      if (lrPlan) lrPlan.textContent = d.user.plan;
      if (lrCredits) lrCredits.textContent = String(d.credits);
      if (lrSub) lrSub.textContent = d.subscription ? `${d.subscription.status} (Ende: ${d.subscription.currentPeriodEnd ? new Date(d.subscription.currentPeriodEnd * 1000).toLocaleString() : '—'})` : '—';
      const lrLastIp = q('lr-last-ip'); const lrLastSeen = q('lr-last-seen');
      if (lrLastIp) lrLastIp.textContent = d.lastIp || '—';
      if (lrLastSeen) lrLastSeen.textContent = d.lastSeenAt ? new Date(d.lastSeenAt).toLocaleString() : '—';
      show(lookupResult);
      // Prefill grant email
      const ge = q<HTMLInputElement>('grant-email'); if (ge && !ge.value) ge.value = d.user.email;
    } catch {
      if (lookupError) { lookupError.textContent = 'Lookup fehlgeschlagen'; show(lookupError); }
    }
  });

  lookupClear?.addEventListener('click', () => {
    if (lookupInput) lookupInput.value = '';
    hide(lookupResult); hide(lookupError);
  });

  const lrApply = q<HTMLButtonElement>('lr-apply-userid');
  lrApply?.addEventListener('click', () => {
    const uid = q('lr-id')?.textContent || '';
    const target = q<HTMLInputElement>('cu-userid');
    if (uid && target) target.value = uid;
  });

  const lrIpGeoBtn = q<HTMLButtonElement>('lr-ip-geo');
  const lrIpGeoOut = q('lr-ip-geo-out');
  lrIpGeoBtn?.addEventListener('click', async () => {
    try {
      const ip = q('lr-last-ip')?.textContent || '';
      if (!ip) return;
      const res = await fetch(`/api/admin/ip-geo?ip=${encodeURIComponent(ip)}`, { credentials: 'include', cache: 'no-store' });
      const j = (await res.json()) as ApiResponse<{ city?: string; country?: string; display?: string }>;
      if (!res.ok || !isApiSuccess(j)) { if (lrIpGeoOut) lrIpGeoOut.textContent = '—'; return; }
      const city = j.data.city || '';
      const country = j.data.country || '';
      const display = j.data.display || ((city || country) ? `${city ? city + ', ' : ''}${country}` : '—');
      if (lrIpGeoOut) lrIpGeoOut.textContent = display;
    } catch {
      if (lrIpGeoOut) lrIpGeoOut.textContent = '—';
    }
  });

  // Grant
  const grantBtn = q<HTMLButtonElement>('grant-btn');
  const grantEmail = q<HTMLInputElement>('grant-email');
  const grantAmount = q<HTMLInputElement>('grant-amount');
  const grantSuccess = q('grant-success');
  const grantError = q('grant-error');
  grantBtn?.addEventListener('click', async (e) => {
    e?.preventDefault?.();
    hide(grantSuccess); hide(grantError);
    const email = (grantEmail?.value || '').trim().toLowerCase();
    const amount = Math.max(1, parseInt(grantAmount?.value || '1000', 10) || 1000);
    if (!email) { if (grantError) { grantError.textContent = 'E‑Mail erforderlich'; show(grantError); } return; }
    try {
      const csrf = ensureCsrfToken();
      const res = await fetch('/api/admin/credits/grant', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
        body: JSON.stringify({ email, amount }),
      });
      const json = (await res.json()) as ApiResponse<{ granted: number; balance: number; packId?: string }>;
      if (!res.ok || !isApiSuccess(json)) { if (grantError) { grantError.textContent = (json as ApiError)?.error?.message || 'Gutschrift fehlgeschlagen'; show(grantError); } return; }
      const d = json.data || {} as { granted: number; balance: number; packId?: string };
      if (grantSuccess) { grantSuccess.textContent = `OK: ${d.granted} Credits gebucht. Neue Balance: ${d.balance}. Pack: ${d.packId}`; show(grantSuccess); }
    } catch {
      if (grantError) { grantError.textContent = 'Gutschrift fehlgeschlagen'; show(grantError); }
    }
  });

  const grantFillSelf = q<HTMLButtonElement>('grant-fill-self');
  grantFillSelf?.addEventListener('click', async () => {
    try {
      const res = await fetch('/api/admin/status', { credentials: 'include', cache: 'no-store' });
      const json = (await res.json()) as AdminStatus | ApiError;
      const email = ('success' in json && json.success) ? json.data.user.email : '';
      if (email && grantEmail) {
        grantEmail.value = email;
      }
    } catch {}
  });

  // Health
  const healthBtn = q<HTMLButtonElement>('health-btn');
  const healthStatus = q('health-status');
  healthBtn?.addEventListener('click', async (e) => {
    e?.preventDefault?.();
    if (healthStatus) healthStatus.textContent = '...';
    const t0 = performance.now();
    try {
      const res = await fetch('/api/health', { cache: 'no-store' });
      const ms = Math.round(performance.now() - t0);
      if (healthStatus) healthStatus.textContent = `${res.status} • ${ms}ms`;
    } catch {
      if (healthStatus) healthStatus.textContent = 'Fehler';
    }
  });

  // Comments filters & paging
  const cStatus = q<HTMLSelectElement>('c-status');
  const cPrev = q<HTMLButtonElement>('c-prev');
  const cNext = q<HTMLButtonElement>('c-next');
  cStatus?.addEventListener('change', () => { cStatusVal = cStatus.value; cOffset = 0; loadComments(); });
  cPrev?.addEventListener('click', () => { cOffset = Math.max(0, cOffset - PAGE_SIZE); loadComments(); });
  cNext?.addEventListener('click', () => { cOffset = cOffset + PAGE_SIZE; loadComments(); });

  // Sessions buttons
  const sessLoad = q<HTMLButtonElement>('sess-load');
  const sessRevokeAll = q<HTMLButtonElement>('sess-revoke-all');
  sessLoad?.addEventListener('click', () => loadSessionsForUser());
  sessRevokeAll?.addEventListener('click', () => revokeAllSessionsForUser());

  // Credits usage
  const cuBal = q<HTMLButtonElement>('cu-balance');
  const cuPacks = q<HTMLButtonElement>('cu-packs');
  const cuCopyBal = q<HTMLButtonElement>('cu-copy-balance');
  const cuCopyPacks = q<HTMLButtonElement>('cu-copy-packs');
  cuBal?.addEventListener('click', () => loadCreditsBalanceForUser());
  cuPacks?.addEventListener('click', () => loadCreditPacksForUser());
  cuCopyBal?.addEventListener('click', async () => {
    const v = (q<HTMLInputElement>('cu-userid')?.value || '').trim();
    if (!v) return;
    const id = v.includes('@') ? (await resolveUserId(v)) || v : v;
    const url = `${location.origin}/api/admin/credits/usage?userId=${encodeURIComponent(id)}`;
    const cmd = `curl -s -H 'Origin: ${location.origin}' '${url}'`;
    await copy(cmd);
  });
  cuCopyPacks?.addEventListener('click', async () => {
    const v = (q<HTMLInputElement>('cu-userid')?.value || '').trim();
    if (!v) return;
    const id = v.includes('@') ? (await resolveUserId(v)) || v : v;
    const url = `${location.origin}/api/admin/credits/history?userId=${encodeURIComponent(id)}`;
    const cmd = `curl -s -H 'Origin: ${location.origin}' '${url}'`;
    await copy(cmd);
  });

  // Rate limits
  const rlLoad = q<HTMLButtonElement>('rl-load');
  const rlReset = q<HTMLButtonElement>('rl-reset');
  const rlCopyGet = q<HTMLButtonElement>('rl-copy-get');
  const rlCopyReset = q<HTMLButtonElement>('rl-copy-reset');
  rlLoad?.addEventListener('click', () => loadRateLimiterState());
  rlReset?.addEventListener('click', () => resetRateLimiterKeyAction());
  rlCopyGet?.addEventListener('click', async () => {
    const name = (q<HTMLInputElement>('rl-name')?.value || '').trim();
    const url = name ? `${location.origin}/api/admin/rate-limits/state?name=${encodeURIComponent(name)}` : `${location.origin}/api/admin/rate-limits/state`;
    const cmd = `curl -s -H 'Origin: ${location.origin}' '${url}'`;
    await copy(cmd);
  });
  rlCopyReset?.addEventListener('click', async () => {
    const name = (q<HTMLInputElement>('rl-reset-name')?.value || '').trim() || '<name>';
    const key = (q<HTMLInputElement>('rl-reset-key')?.value || '').trim() || '<key>';
    const csrf = ensureCsrfToken();
    const body = JSON.stringify({ name, key });
    const cmd = `curl -s -X POST '${location.origin}/api/admin/rate-limits/reset' -H 'Origin: ${location.origin}' -H 'Content-Type: application/json' -H 'X-CSRF-Token: ${csrf}' --data '${body.replace(/'/g, "'\\''")}'`;
    await copy(cmd);
  });

  // Kick off initial loads
  loadMetrics();
  loadAdminStatus();
  loadComments();

  // Audit button
  const auditLoad = q<HTMLButtonElement>('audit-load');
  auditLoad?.addEventListener('click', () => loadAuditLogs());
}

// Start now or on DOMContentLoaded depending on readiness
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', start);
} else {
  start();
}

export {};
