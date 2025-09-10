# API-Dokumentation

Diese Dokumentation beschreibt alle öffentlichen APIs und Schnittstellen von EvolutionHub. Die API basiert auf OpenAPI 3.0.3 und verwendet Hono für Routing. Alle Responses folgen dem konsistenten Format:

```json
{
  "success": boolean,
  "data"?: T,
  "error"?: string
}
```

Fehler-Responses:
```json
{
  "success": false,
  "error": {
    "type": string,
    "message": string,
    "details"?: object
  }
}
```

**Sicherheitshinweise**:
- Authentifizierte Endpunkte erfordern eine gültige Session (Cookie).
- POST/PUT/PATCH/DELETE: CSRF-Schutz mit `X-CSRF-Token` Header (muss mit `csrf_token`-Cookie übereinstimmen).
- Rate-Limits: auth: 10/Min, aiGenerate: 15/Min, api: 30/Min.
- CORS: Allowed Origins per ENV, Fail-Closed.
- Logging: Anonymisierte IPs, strukturierte JSON-Logs.
- HTTPS erforderlich.

Basis-URL: `/` (relativ) oder `BASE_URL` aus Env.

## Authentifizierung-Endpunkte

### POST /api/auth/login
**Zusammenfassung**: Authentifiziert einen Benutzer und setzt Session-Cookie (Redirect).

**Beschreibung**: Sendet Login-Daten und redirectet zu Dashboard bei Erfolg.

**Request Body** (application/json):
```json
{
  "email": "user@example.com",
  "password": "securepass"
}
```

**Responses**:
- 302: Redirect zu Dashboard.
- 400: Validierungsfehler.

**Beispiel (fetch)**:
```javascript
fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'user@example.com', password: 'pass' }),
  credentials: 'same-origin'
});
```

### POST /api/auth/register
**Zusammenfassung**: Registriert einen Benutzer und startet Double-Opt-In (Redirect).

**Beschreibung**: Erstellt Account, sendet Verifizierungs-Email.

**Request Body**:
```json
{
  "email": "new@example.com",
  "password": "securepass",
  "name": "John Doe"
}
```

**Responses**:
- 302: Redirect zu /verify-email.

### POST /api/auth/forgot-password
**Zusammenfassung**: Fordert Passwort-Reset an (Redirect).

**Request Body**:
```json
{
  "email": "user@example.com"
}
```

**Responses**:
- 302: Redirect zu password-reset-sent.

### POST /api/auth/reset-password
**Zusammenfassung**: Setzt Passwort mit Token zurück (Redirect).

**Request Body**:
```json
{
  "token": "reset-token",
  "password": "newpass"
}
```

### GET /api/auth/verify-email
**Zusammenfassung**: Verifiziert Email und erstellt Session (Redirect).

**Query Params**:
- `token`: Verifizierungs-Token.

**Responses**:
- 302: Redirect zu Dashboard.

### POST /api/auth/resend-verification
**Zusammenfassung**: Sendet Verifizierungs-Email erneut (JSON).

**Request Body**:
```json
{
  "email": "user@example.com"
}
```

**Responses**:
- 200: { "success": true, "message": "Email sent" }

### POST /api/auth/change-password
**Zusammenfassung**: Ändert Passwort (Redirect, authentifiziert).

**Request Body**:
```json
{
  "oldPassword": "oldpass",
  "newPassword": "newpass"
}
```

### POST /api/auth/logout
**Zusammenfassung**: Logout und clear Session (Redirect).

## Benutzer-Endpunkte

### GET /api/user/me
**Zusammenfassung**: Holt aktuellen Benutzer (authentifiziert).

**Responses**:
- 200: { "success": true, "data": { "id": string, "email": string, "name": string } }

**Beispiel**:
```javascript
fetch('/api/user/me', { credentials: 'same-origin' })
  .then(res => res.json())
  .then(data => console.log(data.data));
```

### POST /api/user/profile
**Zusammenfassung**: Aktualisiert Profil (authentifiziert, CSRF).

**Request Body**:
```json
{
  "name": "New Name",
  "username": "newusername"
}
```

**Responses**:
- 200: { "success": true }

### POST /api/user/password
**Zusammenfassung**: Aktualisiert Passwort (authentifiziert, CSRF).

**Request Body**:
```json
{
  "oldPassword": "old",
  "newPassword": "new"
}
```

### PUT /api/user/settings
**Zusammenfassung**: Aktualisiert Einstellungen (authentifiziert).

**Request Body**:
```json
{
  "theme": "dark",
  "notifications": true
}
```

### POST /api/user/avatar
**Zusammenfassung**: Uploadet Avatar zu R2 (authentifiziert, multipart).

**Request Body** (multipart/form-data):
- `avatar`: File.

**Responses**:
- 200: { "success": true }

### DELETE /api/user/account
**Zusammenfassung**: Löscht Account (authentifiziert, CSRF).

## Dashboard-Endpunkte (authentifiziert)

### GET /api/dashboard/projects
**Zusammenfassung**: Holt Projekte.

**Responses**:
- 200: { "success": true, "data": [{ "id": string, "title": string }] }

### GET /api/dashboard/activity
**Zusammenfassung**: Holt Aktivitäts-Feed.

**Responses**:
- 200: { "success": true, "data": [{ "action": string, "timestamp": string }] }

### GET /api/dashboard/notifications
**Zusammenfassung**: Holt Benachrichtigungen.

### GET /api/dashboard/stats
**Zusammenfassung**: Holt Statistiken.

**Responses**:
- 200: { "success": true, "data": { "projects": 5, "tasks": 10 } }

### POST /api/dashboard/perform-action
**Zusammenfassung**: Führt Action aus (z.B. Projekt erstellen, CSRF).

**Request Body**:
```json
{
  "action": "createProject",
  "data": { "title": "New Project" }
}
```

### GET /api/dashboard/quick-actions
**Zusammenfassung**: Holt schnelle Actions (public).

## AI-Image-Endpunkte

### POST /api/ai-image/jobs
**Zusammenfassung**: Erstellt AI-Enhance-Job (CSRF, Rate-Limit 15/Min).

**Request Body** (multipart/form-data):
- `image`: Binary File.
- `model`: string (z.B. "sdxl").

**Responses**:
- 202: { "success": true, "data": { "id": string, "status": "queued" } }
- 429: Rate-Limit, Retry-After Header.

**Beispiel**:
```javascript
const formData = new FormData();
formData.append('image', file);
formData.append('model', 'sdxl');

fetch('/api/ai-image/jobs', {
  method: 'POST',
  body: formData,
  headers: { 'X-CSRF-Token': csrfToken },
  credentials: 'same-origin'
});
```

### GET /api/ai-image/jobs/{id}
**Zusammenfassung**: Holt Job-Status (Owner-Gating).

**Path Params**:
- `id`: Job-ID.

**Responses**:
- 200: { "success": true, "data": { "status": "succeeded", "output": { "url": string } } }
- 403: Nicht autorisiert.

### POST /api/ai-image/jobs/{id}/cancel
**Zusammenfassung**: Bricht Job ab (CSRF, Owner-Gating).

## Sonstige Endpunkte

### GET /api/tools
**Zusammenfassung**: Listet verfügbare Tools (public).

**Responses**:
- 200: { "success": true, "data": [{ "id": string, "name": string }] }

### POST /api/projects
**Zusammenfassung**: Erstellt Projekt (authentifiziert, CSRF).

### POST /api/lead-magnets/download
**Zusammenfassung**: Fordert Lead-Magnet an (Email-Gate).

**Request Body**:
```json
{
  "email": "user@example.com",
  "leadId": "lead-1"
}
```

**Responses**:
- 200: { "success": true, "downloadUrl": string }

### POST /api/newsletter/subscribe
**Zusammenfassung**: Abonnieren (Double-Opt-In).

**Request Body**:
```json
{
  "email": "user@example.com"
}
```

### GET /api/newsletter/confirm
**Zusammenfassung**: Bestätigt Abonnement.

**Query Params**:
- `token`: Confirmation-Token.

### GET /r2/{path}
**Zusammenfassung**: Proxy zu R2-Assets.

**Path Params**:
- `path`: Asset-Pfad.

### GET /r2-ai/{path}
**Zusammenfassung**: Proxy zu AI-Images (Owner-Gating für Results).

### POST /api/debug-login
**Zusammenfassung**: Debug-Login (Dev only).

### GET /api/debug/logs-stream
**Zusammenfassung**: SSE-Logs-Stream (Dev).

### POST /api/internal/users/sync
**Zusammenfassung**: Interner User-Sync (Trusted).

### POST /api/csp-report
**Zusammenfassung**: CSP-Reports akzeptieren.

### GET /api/test/seed-email-token
**Zusammenfassung**: Test-Token generieren (Dev).

## Schemas

### GenericResponse
```json
{
  "success": true,
  "message": "string"
}
```

### ApiErrorResponse
```json
{
  "success": false,
  "error": {
    "type": "ValidationError",
    "message": "Invalid input"
  }
}
```

### AiJob
```json
{
  "id": "job-123",
  "status": "succeeded",
  "model": "sdxl",
  "input": { "key": "upload/key.jpg", "url": "https://..." },
  "output": { "key": "result/key.jpg", "url": "https://..." },
  "createdAt": "2025-09-07T12:00:00Z"
}
```

Für detaillierte Specs siehe [openapi.yaml](../openapi.yaml). Endpunkte sind typisiert mit TypeScript und TSDoc. Bei Änderungen wird diese Doc aktualisiert.

---

*Letzte Aktualisierung: 2025-09-07*