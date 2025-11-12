// Admin Dashboard client script (typed)
// Bundled via <script type="module" src={Astro.resolve('./index.client.ts')} nonce={Astro.locals.cspNonce}>
// Helpers
function ensureCsrfToken() {
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
async function loadTraffic24h() {
  try {
    const res = await fetch('/api/admin/traffic-24h?series=1', {
      credentials: 'include',
      cache: 'no-store',
    });
    const j = await res.json();
    const d = isApiSuccess(j) ? j.data : { pageViews: undefined, visits: undefined, series: [] };
    const set = (id, v) => {
      const el = $(id);
      if (el) el.textContent = String(v ?? '–');
    };
    set('traffic-pageviews', d.pageViews);
    set('traffic-visits', d.visits);
    const s = (Array.isArray(d.series) ? d.series : []).map((p) =>
      typeof p.pageViews === 'number' ? p.pageViews : typeof p.visits === 'number' ? p.visits : 0
    );
    drawSparkline('traffic-sparkline', s);
  } catch {}
}
function drawSparkline(svgId, values) {
  const svg = document.getElementById(svgId);
  if (!svg) return;
  const width =
    svg.viewBox && svg.viewBox.baseVal ? svg.viewBox.baseVal.width : svg.clientWidth || 200;
  const height =
    svg.viewBox && svg.viewBox.baseVal ? svg.viewBox.baseVal.height : svg.clientHeight || 36;
  if (!values || values.length === 0) {
    svg.innerHTML = '';
    return;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const n = values.length;
  const step = n > 1 ? width / (n - 1) : width;
  const points = values.map((v, i) => [i * step, height - ((v - min) / span) * height]);
  const d = points.map((p, i) => (i === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`)).join(' ');
  svg.innerHTML = `<path d="${d}" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.9" />`;
}
function $(id) {
  return document.getElementById(id);
}
function q(id) {
  return document.getElementById(id);
}
function show(el) {
  if (el) el.classList.remove('hidden');
}
function hide(el) {
  if (el) el.classList.add('hidden');
}
async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {}
}
// Date formatting (absolute + relative in de-DE)
function formatLastSeen(ms) {
  try {
    const d = new Date(Number(ms));
    const abs = new Intl.DateTimeFormat('de-DE', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(d);
    const sec = Math.round((Date.now() - d.getTime()) / 1000);
    const rtf = new Intl.RelativeTimeFormat('de-DE', { numeric: 'auto' });
    let rel = '';
    if (isFinite(sec)) {
      if (Math.abs(sec) < 60) rel = rtf.format(-sec, 'second');
      else if (Math.abs(sec) < 3600) rel = rtf.format(-Math.round(sec / 60), 'minute');
      else if (Math.abs(sec) < 86400) rel = rtf.format(-Math.round(sec / 3600), 'hour');
      else if (Math.abs(sec) < 2592000) rel = rtf.format(-Math.round(sec / 86400), 'day');
      else if (Math.abs(sec) < 31536000) rel = rtf.format(-Math.round(sec / 2592000), 'month');
      else rel = rtf.format(-Math.round(sec / 31536000), 'year');
    }
    return rel ? `${abs} (${rel})` : abs;
  } catch {
    try {
      return new Date(ms).toLocaleString();
    } catch {
      return '—';
    }
  }
}
function isApiSuccess(j) {
  return !!j && typeof j === 'object' && j.success === true;
}
// (Removed several unused type aliases to avoid lint warnings)
// Core logic
async function loadAdminStatus() {
  const container = q('admin-status-container');
  if (!container) return;
  try {
    const res = await fetch('/api/admin/status', { credentials: 'include', cache: 'no-store' });
    const j = await res.json();
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
    const j = await res.json();
    const d = isApiSuccess(j) ? j.data : {};
    const set = (id, v) => {
      const el = $(id);
      if (el) el.textContent = String(v ?? '–');
    };
    set('m-active-sessions', d.activeSessions);
    set('m-active-users', d.activeUsers);
    set('m-users-total', d.usersTotal);
    set('m-users-new24h', d.usersNew24h);
  } catch {}
}
function setStats(stats) {
  const set = (id, v) => {
    const el = $(id);
    if (el) el.textContent = String(v ?? 0);
  };
  set('cstat-total', stats.total);
  set('cstat-pending', stats.pending);
  set('cstat-approved', stats.approved);
  set('cstat-rejected', stats.rejected);
  set('cstat-flagged', stats.flagged);
}
let cOffset = 0;
let cStatusVal = 'all';
const PAGE_SIZE = 12;
function setPaging(count, total) {
  const cPage = q('c-page');
  const cPrev = q('c-prev');
  const cNext = q('c-next');
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
    const res = await fetch(`/api/admin/comments?${params.toString()}`, {
      credentials: 'include',
      cache: 'no-store',
    });
    const j = await res.json();
    const d =
      'success' in j && j.success
        ? j.data
        : { comments: [], stats: { total: 0, pending: 0, approved: 0, rejected: 0, flagged: 0 } };
    setStats(d.stats);
    const tbody = q('comments-tbody');
    if (tbody && Array.isArray(d.comments)) {
      const comments = d.comments;
      tbody.innerHTML = comments
        .map(
          (c) => `
          <tr class="border-t border-white/10">
            <td class="px-2 py-1"><input type="checkbox" class="comment-select" data-comment-id="${c.id}" /></td>
            <td class="px-2 py-1 whitespace-nowrap">${c.id}</td>
            <td class="px-2 py-1">${c.author?.email || '—'}</td>
            <td class="px-2 py-1">${c.entityType}:${c.entityId}</td>
            <td class="px-2 py-1">${c.status}</td>
            <td class="px-2 py-1 whitespace-nowrap">${c.createdAt}</td>
          </tr>
        `
        )
        .join('');
    }
    const pageCount = d.pagination?.count ?? (Array.isArray(d.comments) ? d.comments.length : 0);
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
    const typeSel = q('audit-type');
    const p = new URLSearchParams();
    p.set('limit', '10');
    const t = (typeSel && typeSel.value) || '';
    if (t) p.set('eventType', t);
    const res = await fetch(`/api/admin/audit/logs?${p.toString()}`, {
      credentials: 'include',
      cache: 'no-store',
    });
    const j = await res.json();
    if (!res.ok || !isApiSuccess(j)) {
      if (err) {
        err.textContent = j?.error?.message || 'Laden fehlgeschlagen';
        err.classList.remove('hidden');
      }
      return;
    }
    const items = j.data.items || [];
    if (list) {
      if (!items.length) {
        list.innerHTML = '<div class="text-white/50">Keine Einträge.</div>';
      } else {
        list.innerHTML = items
          .map((it) => {
            const d = new Date(it.createdAt).toLocaleString();
            return `<div class="border-t border-white/10 py-2"><div class="text-white/70">${d} • ${it.eventType}</div><div class="text-white/50">${it.resource || ''} ${it.action || ''}</div></div>`;
          })
          .join('');
      }
    }
  } catch {
    if (err) {
      err.textContent = 'Laden fehlgeschlagen';
      err.classList.remove('hidden');
    }
  }
}
async function loadSessionsForUser() {
  const userIdEl = q('sess-userid');
  const list = q('sess-list');
  const err = q('sess-error');
  if (err) err.classList.add('hidden');
  if (!userIdEl || !userIdEl.value.trim()) {
    if (err) {
      err.textContent = 'userId erforderlich';
      err.classList.remove('hidden');
    }
    return;
  }
  try {
    const p = new URLSearchParams();
    p.set('userId', userIdEl.value.trim());
    const res = await fetch(`/api/admin/users/sessions?${p.toString()}`, {
      credentials: 'include',
      cache: 'no-store',
    });
    const j = await res.json();
    if (!res.ok || !isApiSuccess(j)) {
      if (err) {
        err.textContent = j?.error?.message || 'Laden fehlgeschlagen';
        err.classList.remove('hidden');
      }
      return;
    }
    const items = Array.isArray(j.data.items) ? j.data.items : [];
    if (list) {
      list.innerHTML = items
        .map((s) => {
          const d = s.expiresAt ? new Date(s.expiresAt).toLocaleString() : '—';
          return `<div class="border-t border-white/10 py-2"><div class="text-white/70">${s.id}</div><div class="text-white/50">Expires: ${d}</div></div>`;
        })
        .join('');
    }
  } catch {
    if (err) {
      err.textContent = 'Laden fehlgeschlagen';
      err.classList.remove('hidden');
    }
  }
}
async function revokeAllSessionsForUser() {
  const userIdEl = q('sess-userid');
  const err = q('sess-error');
  if (err) err.classList.add('hidden');
  if (!userIdEl || !userIdEl.value.trim()) {
    if (err) {
      err.textContent = 'userId erforderlich';
      err.classList.remove('hidden');
    }
    return;
  }
  try {
    const csrf = ensureCsrfToken();
    const res = await fetch('/api/admin/users/revoke-sessions', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
      body: JSON.stringify({ userId: userIdEl.value.trim() }),
    });
    const j = await res.json();
    if (!res.ok || !isApiSuccess(j)) {
      if (err) {
        err.textContent = j?.error?.message || 'Widerruf fehlgeschlagen';
        err.classList.remove('hidden');
      }
      return;
    }
    await loadSessionsForUser();
  } catch {
    if (err) {
      err.textContent = 'Widerruf fehlgeschlagen';
      err.classList.remove('hidden');
    }
  }
}
async function resolveUserId(raw) {
  const v = (raw || '').trim();
  if (!v) return null;
  if (v.includes('@')) {
    try {
      const p = new URLSearchParams();
      p.set('email', v.toLowerCase());
      const res = await fetch(`/api/admin/users/summary?${p.toString()}`, {
        credentials: 'include',
        cache: 'no-store',
      });
      const j = await res.json();
      const id = 'success' in j && j.success ? j.data.user.id : null;
      return res.ok && id ? String(id) : null;
    } catch {
      return null;
    }
  }
  return v;
}
async function loadCreditsBalanceForUser() {
  const userIdEl = q('cu-userid');
  const out = q('cu-balance-out');
  const err = q('cu-error');
  if (err) err.classList.add('hidden');
  if (out) out.textContent = '';
  if (!userIdEl || !userIdEl.value.trim()) {
    if (err) {
      err.textContent = 'E‑Mail oder userId erforderlich';
      err.classList.remove('hidden');
    }
    return;
  }
  try {
    const resolved = await resolveUserId(userIdEl.value);
    if (!resolved) {
      if (err) {
        err.textContent = 'Konnte userId nicht auflösen';
        err.classList.remove('hidden');
      }
      return;
    }
    if (userIdEl && userIdEl.value !== resolved && !userIdEl.value.includes('@')) {
      userIdEl.value = resolved;
    }
    const p = new URLSearchParams();
    p.set('userId', resolved);
    const res = await fetch(`/api/admin/credits/usage?${p.toString()}`, {
      credentials: 'include',
      cache: 'no-store',
    });
    const j = await res.json();
    if (!res.ok || !isApiSuccess(j)) {
      if (err) {
        err.textContent = j?.error?.message || 'Laden fehlgeschlagen';
        err.classList.remove('hidden');
      }
      return;
    }
    const d = j.data;
    if (out) out.textContent = `Balance: ${d.credits} Credits (${d.tenths} tenth)`;
  } catch {
    if (err) {
      err.textContent = 'Laden fehlgeschlagen';
      err.classList.remove('hidden');
    }
  }
}
async function loadCreditPacksForUser() {
  const userIdEl = q('cu-userid');
  const list = q('cu-packs-list');
  const err = q('cu-error');
  if (err) err.classList.add('hidden');
  if (list) list.innerHTML = '';
  if (!userIdEl || !userIdEl.value.trim()) {
    if (err) {
      err.textContent = 'E‑Mail oder userId erforderlich';
      err.classList.remove('hidden');
    }
    return;
  }
  try {
    const resolved = await resolveUserId(userIdEl.value);
    if (!resolved) {
      if (err) {
        err.textContent = 'Konnte userId nicht auflösen';
        err.classList.remove('hidden');
      }
      return;
    }
    if (userIdEl && userIdEl.value !== resolved && !userIdEl.value.includes('@')) {
      userIdEl.value = resolved;
    }
    const p = new URLSearchParams();
    p.set('userId', resolved);
    const res = await fetch(`/api/admin/credits/history?${p.toString()}`, {
      credentials: 'include',
      cache: 'no-store',
    });
    const j = await res.json();
    if (!res.ok || !isApiSuccess(j)) {
      if (err) {
        err.textContent = j?.error?.message || 'Laden fehlgeschlagen';
        err.classList.remove('hidden');
      }
      return;
    }
    const items = Array.isArray(j.data.items) ? j.data.items : [];
    if (list) {
      list.innerHTML = items
        .map((p) => {
          const created = p.createdAt ? new Date(p.createdAt).toLocaleString() : '—';
          const expires = p.expiresAt ? new Date(p.expiresAt).toLocaleString() : '—';
          return `<div class="border-t border-white/10 py-2"><div class="text-white/70">${p.id}</div><div class="text-white/50">Units (tenths): ${p.unitsTenths} • Created: ${created} • Expires: ${expires}</div></div>`;
        })
        .join('');
    }
  } catch {
    if (err) {
      err.textContent = 'Laden fehlgeschlagen';
      err.classList.remove('hidden');
    }
  }
}
async function loadRateLimiterState() {
  const nameEl = q('rl-name');
  const err = q('rl-error');
  const stateEl = q('rl-state');
  if (err) err.classList.add('hidden');
  if (stateEl) stateEl.innerHTML = '';
  try {
    const p = new URLSearchParams();
    const name = (nameEl?.value || '').trim();
    if (name) p.set('name', name);
    const url = p.toString()
      ? `/api/admin/rate-limits/state?${p.toString()}`
      : '/api/admin/rate-limits/state';
    const res = await fetch(url, { credentials: 'include', cache: 'no-store' });
    const j = await res.json();
    if (!res.ok || !isApiSuccess(j)) {
      if (err) {
        err.textContent = j?.error?.message || 'Laden fehlgeschlagen';
        err.classList.remove('hidden');
      }
      return;
    }
    const state = j.data.state || {};
    if (stateEl) {
      const entriesHtml = Object.entries(state)
        .map(([limName, info]) => {
          const entries = Array.isArray(info.entries) ? info.entries : [];
          const maxRequests = info.maxRequests;
          const windowMs = info.windowMs || 0;
          const rows = entries
            .map(
              (e) =>
                `<div class="text-white/50">${e.key} • count ${e.count} • reset ${e.resetAt ? new Date(e.resetAt).toLocaleTimeString() : '—'}</div>`
            )
            .join('');
          return `<div class="mb-3"><div class="text-white/70 font-medium">${limName} • max ${maxRequests}/ ${Math.round(windowMs / 1000)}s</div>${rows}</div>`;
        })
        .join('');
      stateEl.innerHTML = entriesHtml;
    }
  } catch {
    if (err) {
      err.textContent = 'Laden fehlgeschlagen';
      err.classList.remove('hidden');
    }
  }
}
async function resetRateLimiterKeyAction() {
  const nameEl = q('rl-reset-name');
  const keyEl = q('rl-reset-key');
  const okEl = q('rl-success');
  const err = q('rl-error');
  if (err) err.classList.add('hidden');
  if (okEl) okEl.classList.add('hidden');
  const name = (nameEl?.value || '').trim();
  const key = (keyEl?.value || '').trim();
  if (!name || !key) {
    if (err) {
      err.textContent = 'name und key erforderlich';
      err.classList.remove('hidden');
    }
    return;
  }
  try {
    const csrf = ensureCsrfToken();
    const res = await fetch('/api/admin/rate-limits/reset', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
      body: JSON.stringify({ name, key }),
    });
    const j = await res.json();
    if (!res.ok || !isApiSuccess(j)) {
      if (err) {
        err.textContent = j?.error?.message || 'Reset fehlgeschlagen';
        err.classList.remove('hidden');
      }
      return;
    }
    if (okEl) {
      okEl.textContent = 'OK: Reset durchgeführt';
      okEl.classList.remove('hidden');
    }
    await loadRateLimiterState();
  } catch {
    if (err) {
      err.textContent = 'Reset fehlgeschlagen';
      err.classList.remove('hidden');
    }
  }
}
// Event wiring
function start() {
  // Lookup
  const lookupBtn = q('lookup-btn');
  const lookupClear = q('lookup-clear');
  const lookupInput = q('lookup-input');
  const lookupResult = q('lookup-result');
  const lookupError = q('lookup-error');
  lookupBtn?.addEventListener('click', async (e) => {
    e?.preventDefault?.();
    hide(lookupError);
    hide(lookupResult);
    const v = (lookupInput?.value || '').trim();
    if (!v) {
      if (lookupError) {
        lookupError.textContent = 'Bitte E‑Mail oder ID eingeben.';
        show(lookupError);
      }
      return;
    }
    const p = new URLSearchParams();
    if (v.includes('@')) p.set('email', v.toLowerCase());
    else p.set('id', v);
    const url = `/api/admin/users/summary?${p.toString()}`;
    try {
      const res = await fetch(url, { credentials: 'include', cache: 'no-store' });
      const json = await res.json();
      if (!('success' in json) || !json.success) {
        if (lookupError) {
          lookupError.textContent = json?.error?.message || 'Lookup fehlgeschlagen';
          show(lookupError);
        }
        return;
      }
      const d = json.data;
      const lrId = q('lr-id');
      const lrEmail = q('lr-email');
      const lrName = q('lr-name');
      const lrPlan = q('lr-plan');
      const lrCredits = q('lr-credits');
      const lrSub = q('lr-sub');
      if (lrId) lrId.textContent = d.user.id;
      if (lrEmail) lrEmail.textContent = d.user.email;
      if (lrName) lrName.textContent = d.user.name || '';
      if (lrPlan) lrPlan.textContent = d.user.plan;
      if (lrCredits) lrCredits.textContent = String(d.credits);
      if (lrSub)
        lrSub.textContent = d.subscription
          ? `${d.subscription.status} (Ende: ${d.subscription.currentPeriodEnd ? new Date(d.subscription.currentPeriodEnd * 1000).toLocaleString() : '—'})`
          : '—';
      const lrLastIp = q('lr-last-ip');
      const lrLastSeen = q('lr-last-seen');
      if (lrLastIp) lrLastIp.textContent = d.lastIp || '—';
      if (lrLastSeen) lrLastSeen.textContent = d.lastSeenAt ? formatLastSeen(d.lastSeenAt) : '—';
      show(lookupResult);
      // Prefill grant email
      const ge = q('grant-email');
      if (ge && !ge.value) ge.value = d.user.email;
    } catch {
      if (lookupError) {
        lookupError.textContent = 'Lookup fehlgeschlagen';
        show(lookupError);
      }
    }
  });
  lookupClear?.addEventListener('click', () => {
    if (lookupInput) lookupInput.value = '';
    hide(lookupResult);
    hide(lookupError);
  });
  const lrApply = q('lr-apply-userid');
  lrApply?.addEventListener('click', () => {
    const uid = q('lr-id')?.textContent || '';
    const target = q('cu-userid');
    if (uid && target) target.value = uid;
  });
  const lrIpGeoBtn = q('lr-ip-geo');
  const lrIpGeoOut = q('lr-ip-geo-out');
  lrIpGeoBtn?.addEventListener('click', async () => {
    try {
      let ip = (q('lr-last-ip')?.textContent || '').trim();
      if (!ip || ip === '—') ip = '';
      const isIpV4 = !!ip && /^(?:\d{1,3}\.){3}\d{1,3}$/.test(ip);
      const isIpV6 = !!ip && ip.includes(':');
      const url =
        ip && (isIpV4 || isIpV6)
          ? `/api/admin/ip-geo?ip=${encodeURIComponent(ip)}`
          : '/api/admin/ip-geo';
      const res = await fetch(url, { credentials: 'include', cache: 'no-store' });
      const j = await res.json();
      if (!res.ok || !isApiSuccess(j)) {
        if (lrIpGeoOut) lrIpGeoOut.textContent = '—';
        return;
      }
      const city = j.data.city || '';
      const country = j.data.country || '';
      const display =
        j.data.display || (city || country ? `${city ? city + ', ' : ''}${country}` : '');
      const ipStr = ('success' in j && j.success && j.data.ip) || '';
      const finalText = display ? (ipStr ? `${display} (${ipStr})` : display) : ipStr || '—';
      if (lrIpGeoOut) lrIpGeoOut.textContent = finalText;
    } catch {
      if (lrIpGeoOut) lrIpGeoOut.textContent = '—';
    }
  });
  // Grant
  const grantBtn = q('grant-btn');
  const grantDeduct = q('grant-deduct');
  const grantEmail = q('grant-email');
  const grantAmount = q('grant-amount');
  const grantStrict = q('grant-strict');
  const grantSuccess = q('grant-success');
  const grantError = q('grant-error');
  grantBtn?.addEventListener('click', async (e) => {
    e?.preventDefault?.();
    hide(grantSuccess);
    hide(grantError);
    const email = (grantEmail?.value || '').trim().toLowerCase();
    const amount = Math.max(1, parseInt(grantAmount?.value || '1000', 10) || 1000);
    if (!email) {
      if (grantError) {
        grantError.textContent = 'E‑Mail erforderlich';
        show(grantError);
      }
      return;
    }
    try {
      const csrf = ensureCsrfToken();
      const res = await fetch('/api/admin/credits/grant', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
        body: JSON.stringify({ email, amount }),
      });
      const json = await res.json();
      if (!res.ok || !isApiSuccess(json)) {
        if (grantError) {
          grantError.textContent = json?.error?.message || 'Gutschrift fehlgeschlagen';
          show(grantError);
        }
        return;
      }
      const d = json.data || {};
      if (grantSuccess) {
        grantSuccess.textContent = `OK: ${d.granted} Credits gebucht. Neue Balance: ${d.balance}. Pack: ${d.packId}`;
        show(grantSuccess);
      }
    } catch {
      if (grantError) {
        grantError.textContent = 'Gutschrift fehlgeschlagen';
        show(grantError);
      }
    }
  });
  grantDeduct?.addEventListener('click', async (e) => {
    e?.preventDefault?.();
    hide(grantSuccess);
    hide(grantError);
    const email = (grantEmail?.value || '').trim().toLowerCase();
    const amount = Math.max(1, parseInt(grantAmount?.value || '1000', 10) || 1000);
    if (!email) {
      if (grantError) {
        grantError.textContent = 'E‑Mail erforderlich';
        show(grantError);
      }
      return;
    }
    try {
      const csrf = ensureCsrfToken();
      const res = await fetch('/api/admin/credits/deduct', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
        body: JSON.stringify({ email, amount, strict: grantStrict ? !!grantStrict.checked : true }),
      });
      const json = await res.json();
      if (!res.ok || !isApiSuccess(json)) {
        if (grantError) {
          grantError.textContent = json?.error?.message || 'Abziehen fehlgeschlagen';
          show(grantError);
        }
        return;
      }
      const d = json.data || {};
      if (grantSuccess) {
        grantSuccess.textContent = `OK: ${d.deducted} Credits abgezogen. Neue Balance: ${d.balance}.`;
        show(grantSuccess);
      }
      const uidInput = q('cu-userid');
      if (uidInput && uidInput.value) {
        await loadCreditsBalanceForUser();
        await loadCreditPacksForUser();
      }
    } catch {
      if (grantError) {
        grantError.textContent = 'Abziehen fehlgeschlagen';
        show(grantError);
      }
    }
  });
  const grantFillSelf = q('grant-fill-self');
  grantFillSelf?.addEventListener('click', async () => {
    try {
      const res = await fetch('/api/admin/status', { credentials: 'include', cache: 'no-store' });
      const json = await res.json();
      const email = 'success' in json && json.success ? json.data.user.email : '';
      if (email && grantEmail) {
        grantEmail.value = email;
      }
    } catch {}
  });
  // Plan setzen
  const planBtn = q('plan-set-btn');
  const planTarget = q('plan-target');
  const planSelect = q('plan-select');
  const planReason = q('plan-reason');
  const planInterval = q('plan-interval');
  const planProration = q('plan-proration');
  const planCancelGroup = q('plan-cancel-group');
  const planCancelImmediate = q('plan-cancel-immediate');
  const planSuccess = q('plan-success');
  const planError = q('plan-error');
  // Toggle cancel options visibility depending on selected plan
  const toggleCancelVisibility = () => {
    const p = planSelect?.value || 'free';
    if (planCancelGroup) {
      if (p === 'free') planCancelGroup.classList.remove('hidden');
      else planCancelGroup.classList.add('hidden');
    }
  };
  planSelect?.addEventListener('change', toggleCancelVisibility);
  // Initialize visibility on load
  toggleCancelVisibility();
  planBtn?.addEventListener('click', async (e) => {
    e?.preventDefault?.();
    hide(planSuccess);
    hide(planError);
    const target = (planTarget?.value || '').trim();
    const plan = planSelect?.value || 'free';
    if (!target) {
      if (planError) {
        planError.textContent = 'E‑Mail oder userId erforderlich';
        show(planError);
      }
      return;
    }
    try {
      const csrf = ensureCsrfToken();
      const body = { plan };
      if (target.includes('@')) body.email = target.toLowerCase();
      else body.userId = target;
      const reason = (planReason?.value || '').trim();
      if (reason) body.reason = reason;
      // Include interval/proration. Keep defaults lightweight.
      const intervalVal = planInterval?.value || 'monthly';
      if (intervalVal) body.interval = intervalVal;
      const prorationVal = planProration?.value || 'create_prorations';
      if (prorationVal) body.prorationBehavior = prorationVal;
      if (plan === 'free') {
        const immediate = !!(planCancelImmediate && planCancelImmediate.checked);
        if (immediate) body.cancelImmediately = true;
        else body.cancelAtPeriodEnd = true; // explicit for clarity
      }
      const res = await fetch('/api/admin/users/set-plan', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !isApiSuccess(json)) {
        if (planError) {
          planError.textContent = json?.error?.message || 'Plan setzen fehlgeschlagen';
          show(planError);
        }
        return;
      }
      const d = json.data;
      if (planSuccess) {
        planSuccess.textContent = `OK: Plan gesetzt auf ${d.plan} (User ${d.userId})`;
        show(planSuccess);
      }
      const lrPlan = q('lr-plan');
      if (lrPlan) lrPlan.textContent = d.plan;
    } catch {
      if (planError) {
        planError.textContent = 'Plan setzen fehlgeschlagen';
        show(planError);
      }
    }
  });
  // Health
  const healthBtn = q('health-btn');
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
  const cStatus = q('c-status');
  const cPrev = q('c-prev');
  const cNext = q('c-next');
  cStatus?.addEventListener('change', () => {
    cStatusVal = cStatus.value;
    cOffset = 0;
    loadComments();
  });
  cPrev?.addEventListener('click', () => {
    cOffset = Math.max(0, cOffset - PAGE_SIZE);
    loadComments();
  });
  cNext?.addEventListener('click', () => {
    cOffset = cOffset + PAGE_SIZE;
    loadComments();
  });
  // Sessions buttons
  const sessLoad = q('sess-load');
  const sessRevokeAll = q('sess-revoke-all');
  sessLoad?.addEventListener('click', () => loadSessionsForUser());
  sessRevokeAll?.addEventListener('click', () => revokeAllSessionsForUser());
  // Credits usage
  const cuBal = q('cu-balance');
  const cuPacks = q('cu-packs');
  const cuCopyBal = q('cu-copy-balance');
  const cuCopyPacks = q('cu-copy-packs');
  cuBal?.addEventListener('click', () => loadCreditsBalanceForUser());
  cuPacks?.addEventListener('click', () => loadCreditPacksForUser());
  cuCopyBal?.addEventListener('click', async () => {
    const v = (q('cu-userid')?.value || '').trim();
    if (!v) return;
    const id = v.includes('@') ? (await resolveUserId(v)) || v : v;
    const url = `${location.origin}/api/admin/credits/usage?userId=${encodeURIComponent(id)}`;
    const cmd = `curl -s -H 'Origin: ${location.origin}' '${url}'`;
    await copy(cmd);
  });
  cuCopyPacks?.addEventListener('click', async () => {
    const v = (q('cu-userid')?.value || '').trim();
    if (!v) return;
    const id = v.includes('@') ? (await resolveUserId(v)) || v : v;
    const url = `${location.origin}/api/admin/credits/history?userId=${encodeURIComponent(id)}`;
    const cmd = `curl -s -H 'Origin: ${location.origin}' '${url}'`;
    await copy(cmd);
  });
  // Rate limits
  const rlLoad = q('rl-load');
  const rlReset = q('rl-reset');
  const rlCopyGet = q('rl-copy-get');
  const rlCopyReset = q('rl-copy-reset');
  rlLoad?.addEventListener('click', () => loadRateLimiterState());
  rlReset?.addEventListener('click', () => resetRateLimiterKeyAction());
  rlCopyGet?.addEventListener('click', async () => {
    const name = (q('rl-name')?.value || '').trim();
    const url = name
      ? `${location.origin}/api/admin/rate-limits/state?name=${encodeURIComponent(name)}`
      : `${location.origin}/api/admin/rate-limits/state`;
    const cmd = `curl -s -H 'Origin: ${location.origin}' '${url}'`;
    await copy(cmd);
  });
  rlCopyReset?.addEventListener('click', async () => {
    const name = (q('rl-reset-name')?.value || '').trim() || '<name>';
    const key = (q('rl-reset-key')?.value || '').trim() || '<key>';
    const csrf = ensureCsrfToken();
    const body = JSON.stringify({ name, key });
    const cmd = `curl -s -X POST '${location.origin}/api/admin/rate-limits/reset' -H 'Origin: ${location.origin}' -H 'Content-Type: application/json' -H 'X-CSRF-Token: ${csrf}' --data '${body.replace(/'/g, "'\\''")}'`;
    await copy(cmd);
  });
  // Kick off initial loads
  loadMetrics();
  loadTraffic24h();
  loadAdminStatus();
  loadComments();
  // Audit button
  const auditLoad = q('audit-load');
  auditLoad?.addEventListener('click', () => loadAuditLogs());
}
// Start now or on DOMContentLoaded depending on readiness
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', start);
} else {
  start();
}
