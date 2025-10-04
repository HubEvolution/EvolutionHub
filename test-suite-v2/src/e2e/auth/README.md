# Auth E2E Test Suite

Comprehensive E2E tests for all authentication flows in Evolution Hub.

## 📁 Test Structure

```
auth/
├── oauth/
│   ├── github-oauth-flow.spec.ts          # GitHub OAuth happy path tests
│   ├── oauth-cookie-security.spec.ts      # Cookie security tests (v1.7.2 fixes)
│   ├── oauth-error-handling.spec.ts       # OAuth error scenarios
│   └── oauth-welcome-profile.spec.ts      # First-time user welcome flow
├── magic-link-flow.spec.ts                # Magic Link tests (EN)
├── magic-link-flow-de.spec.ts             # Magic Link tests (DE)
├── session-management.spec.ts             # Session lifecycle tests
├── auth-middleware.spec.ts                # Middleware redirect tests
└── README.md                              # This file
```

## 🎯 Test Coverage

### OAuth Tests (NEW - v1.7.2)

**`oauth/github-oauth-flow.spec.ts`** (270 lines)
- OAuth button visibility (EN/DE)
- OAuth start endpoint
- Complete OAuth flow (local dev with E2E_FAKE_STYTCH)
- Dashboard redirect with locale handling
- Target redirect parameter (r=...)
- Helper function usage

**`oauth/oauth-cookie-security.spec.ts`** (320 lines)
- HTTP cookie behavior (`session_id` only, no `__Host-session`)
- HTTPS cookie behavior (both `session_id` and `__Host-session`)
- Cookie attributes (HttpOnly, Secure, SameSite, Path)
- Explicit Set-Cookie headers in response
- Cookie persistence across navigations and reloads
- Helper function assertions

**`oauth/oauth-error-handling.spec.ts`** (210 lines)
- Missing token → MissingToken error
- Invalid token → InvalidOrExpired error
- Locale preservation in error redirects
- XSS/CSRF protection in error params
- Error recovery (retry after error)

**`oauth/oauth-welcome-profile.spec.ts`** (230 lines)
- New user → redirect to `/welcome-profile` (with locale)
- Returning user → skip welcome-profile
- Profile form validation
- Redirect to target after profile completion
- Preserve `next` parameter

### Magic Link Tests (EXISTING - Kept)

**`magic-link-flow.spec.ts`** (115 lines)
- Magic Link request
- `post_auth_redirect` cookie
- Dev bypass callback (local dev)
- Dashboard redirect

**`magic-link-flow-de.spec.ts`** (98 lines)
- German locale variant of Magic Link tests

### Session Management Tests (NEW)

**`session-management.spec.ts`** (280 lines)
- Session creation (OAuth, Magic Link)
- Session persistence (navigations, reloads)
- Session validation (middleware checks)
- Session invalidation (logout)
- Concurrent sessions (multiple tabs)
- Session security (no exposure in URL/body, session fixation prevention)

### Auth Middleware Tests (NEW)

**`auth-middleware.spec.ts`** (230 lines)
- Protected routes require auth
- Unauthenticated → redirect to login
- Authenticated → allow access
- Public routes accessible without auth
- Redirect to original target after login
- Locale handling in redirects
- Open redirect prevention
- Security headers

## 🧪 Test Helpers

All tests use shared helpers from `test-suite-v2/fixtures/auth-helpers.ts`:

```typescript
// Environment checks
isRemoteTarget(): boolean
isHttps(): boolean

// Email helpers
getTestEmail(): string
generateUniqueEmail(prefix?: string): string

// Cookie helpers
getCookieValue(page, name): Promise<string | undefined>
assertSessionCookies(context, baseUrl, options): Promise<void>

// Auth flow helpers
completeOAuthFlow(page, provider, options): Promise<void>
completeMagicLinkFlow(page, email, options): Promise<void>
loginAs(page, method, email?): Promise<void>
logout(page): Promise<void>

// Assertion helpers
assertAuthenticated(page): Promise<void>
assertNotAuthenticated(page): Promise<void>

// Profile helpers
completeWelcomeProfile(page, options): Promise<void>
```

## 🚀 Running Tests

### All Auth Tests

```bash
npm run test:e2e -- src/e2e/auth/
```

### Specific Test Suites

```bash
# OAuth tests only
npm run test:e2e -- src/e2e/auth/oauth/

# Magic Link tests only
npm run test:e2e -- src/e2e/auth/magic-link-flow.spec.ts

# Session management tests only
npm run test:e2e -- src/e2e/auth/session-management.spec.ts

# Auth middleware tests only
npm run test:e2e -- src/e2e/auth/auth-middleware.spec.ts
```

### Browser-Specific

```bash
# Chromium only
npm run test:e2e:chromium -- src/e2e/auth/

# Firefox only
npm run test:e2e:firefox -- src/e2e/auth/

# WebKit only
npm run test:e2e:webkit -- src/e2e/auth/
```

### UI Mode (Interactive)

```bash
npm run test:e2e:ui -- src/e2e/auth/
```

## 🌍 Environment Configuration

### Local Development (Recommended)

```bash
# .env or .env.development
E2E_FAKE_STYTCH=1                       # Enable mocked OAuth/Magic Link flows
BASE_URL=http://127.0.0.1:8787
STYTCH_TEST_EMAIL=test@example.com      # Test email for Magic Link
```

**Requirements:**
- `npm run dev:worker:dev` running
- E2E_FAKE_STYTCH=1 in wrangler.toml or env
- OAuth and Magic Link flows are mocked for E2E

### Remote/Staging

```bash
# .env.staging
E2E_FAKE_STYTCH=0                       # Disable mocked flows
TEST_BASE_URL=https://staging.hub-evolution.com
STYTCH_TEST_EMAIL=<your-verified-email>
```

**Limitations:**
- OAuth flows cannot be completed (requires real Stytch interaction)
- Only OAuth start and error handling tests will run
- Magic Link tests will be skipped

### Production Smoke Tests

```bash
# .env.production
E2E_PROD_AUTH_SMOKE=1
TEST_BASE_URL=https://hub-evolution.com
STYTCH_TEST_EMAIL=<your-verified-email>
```

**Only runs:**
- `/api/auth/magic/request` response validation
- Security header checks
- Error redirect validation

## 📊 Coverage Goals

| Flow | Coverage | Tests |
|------|----------|-------|
| **OAuth** | 90% | 18 test cases |
| **Magic Link** | 80% | 4 test cases (existing) |
| **Session** | 85% | 14 test cases |
| **Middleware** | 75% | 12 test cases |
| **Overall** | ~85% | 48 test cases |

## 🔧 Troubleshooting

### Tests Skipped (E2E_FAKE_STYTCH Required)

**Problem:** Most OAuth and session tests are skipped

**Solution:**
```bash
# Set E2E_FAKE_STYTCH=1 in wrangler.toml
[env.development.vars]
E2E_FAKE_STYTCH = "1"

# Restart dev server
npm run dev:worker:dev
```

### OAuth Callback Not Reached (Local Dev)

**Problem:** OAuth flow starts but callback never reached

**Solution:** Check `STYTCH_CUSTOM_DOMAIN` is commented out in `wrangler.toml` for development:

```toml
[env.development.vars]
# STYTCH_CUSTOM_DOMAIN = "login-test.hub-evolution.com"  # Comment out for local dev
```

### Cookie Tests Failing on HTTP

**Problem:** `__Host-session` cookie not set on local HTTP

**Expected:** This is correct behavior! `__Host-session` requires HTTPS. On HTTP, only `session_id` is set.

**Solution:** Tests are designed for this - no action needed.

### Tests Timing Out

**Problem:** Tests hang or timeout

**Solution:**
- Check dev server is running (`npm run dev:worker:dev`)
- Check BASE_URL matches dev server port (default: 8787)
- Increase timeout in test file if needed:
  ```typescript
  test.setTimeout(60000); // 60 seconds
  ```

## 📝 Adding New Tests

### 1. Use Test Helpers

```typescript
import {
  completeOAuthFlow,
  assertAuthenticated,
  assertSessionCookies,
} from '../../../fixtures/auth-helpers';

test('my new OAuth test', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  await completeOAuthFlow(page, 'github', { locale: 'en' });
  await assertAuthenticated(page);
  await assertSessionCookies(context, BASE_URL);

  await context.close();
});
```

### 2. Skip Remote Tests

```typescript
const IS_REMOTE = isRemoteTarget();
const FAKE_STYTCH = process.env.E2E_FAKE_STYTCH === '1';

test.skip(!FAKE_STYTCH || IS_REMOTE, 'Requires E2E_FAKE_STYTCH=1 and local dev');
```

### 3. Test Locale Variants

```typescript
test('OAuth flow (EN)', async ({ browser }) => {
  // Test with /en/ locale
});

test('OAuth flow (DE)', async ({ browser }) => {
  // Test with /de/ locale
});
```

## 🔗 Related Documentation

- [OAuth Login Issues Troubleshooting](../../../../../docs/troubleshooting/oauth-login-issues.md)
- [Stytch Custom Domains](../../../../../docs/ops/stytch-custom-domains.md)
- [Auth Flow Architecture](../../../../../docs/architecture/auth-flow.md)
- [Test Suite v2 README](../../../../README.md)

## ✅ Test Checklist (PR Review)

Before merging auth changes, ensure:

- [ ] All existing auth E2E tests pass
- [ ] New auth features have corresponding E2E tests
- [ ] Tests run on both HTTP (local) and HTTPS (staging) if applicable
- [ ] Tests skip gracefully when E2E_FAKE_STYTCH is not available
- [ ] Test helpers are used for common operations
- [ ] Locale variants (EN/DE) are tested
- [ ] Cookie security is validated
- [ ] Error scenarios are covered

---

**Last Updated:** 2025-01-15 (v1.7.2)
**Test Suite Version:** v2
**Total Test Files:** 8
**Total Test Cases:** ~48
