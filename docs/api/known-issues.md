# Bekannte API-Probleme & Verbesserungspotentiale

Bei der Implementierung und Testabdeckung der APIs wurden verschiedene Verbesserungspotentiale identifiziert, die mittel- bis langfristig behoben werden sollten.

## Auth-API-Probleme

### 1. Inkonsistente Fehlerbehandlung

Die Authentication-APIs zeigen inkonsistentes Verhalten bei der Fehlerbehandlung:

- **Unspezifische Fehlermeldungen**: Fast alle Fehler werden als `UnknownError` zurückgegeben, auch wenn die spezifische Fehlerursache bekannt ist (z.B. ungültiges Token, abgelaufenes Token)
- **Beispiel**: In `reset-password.ts` sollten spezifische Fehlercodes wie `InvalidToken` oder `ExpiredToken` zurückgegeben werden

```typescript
// Aktuell
return context.redirect(`/reset-password?token=${token}&error=UnknownError`, 302);

// Besser
return context.redirect(`/reset-password?token=${token}&error=InvalidToken`, 302);
```

### 2. Sicherheitsprobleme bei User-Enumeration

Eine Security Best Practice ist, keine Informationen preiszugeben, ob ein Benutzer existiert oder nicht:

- **Aktuelles Problem**: Die `forgot-password.ts` API gibt einen Fehler zurück, wenn keine E-Mail gefunden wurde, anstatt immer die gleiche Erfolgsmeldung anzuzeigen
- **Best Practice**: Immer die gleiche Erfolgsantwort zurückgeben, unabhängig davon, ob ein Benutzer gefunden wurde oder nicht

```typescript
// Aktuell
if (!existingUser) {
  return context.redirect('/forgot-password?error=UnknownError', 302);
}

// Besser (verhindert User Enumeration)
if (!existingUser) {
  // Bei nicht existierendem Benutzer trotzdem Erfolg anzeigen
  return context.redirect('/auth/password-reset-sent', 302);
}
```

### 3. Inkonsistente Redirect-URLs

Die APIs verwenden unterschiedliche Pfadformate für Redirects:

- Mal mit führendem `/auth/` (z.B. `/auth/login`)
- Mal ohne führendes `/auth/` (z.B. `/login`)
- Mal mit Fehlerparametern (`?error=`), mal ohne

Die URL-Struktur sollte vereinheitlicht werden, vorzugsweise mit einem zentralen Routing-System.

### 4. Probleme beim Email-Versand

Der E-Mail-Versand bei Passwort-Reset-Anfragen scheint nicht robust implementiert zu sein:

- **Problem**: Selbst bei korrekt konfiguriertem `resend`-API-Key gibt die `forgot-password.ts`-API häufig einen generischen Fehler zurück
- **Verbesserung**: Bessere Fehlerbehandlung und spezifischere Fehlermeldungen für E-Mail-Versandfehler

## API-Resilienz-Verbesserungen

### 1. Konsistente try/catch-Blöcke

Die Fehlerbehandlung sollte in allen APIs konsistent sein:

```typescript
try {
  // API-Logik
} catch (error) {
  console.error('Spezifische API-Operation fehlgeschlagen:', error);
  return context.redirect('/pfad?error=SpezifischerErrorCode', 302);
}
```

### 2. Spezifische Fehlermeldungen

Jede API sollte spezifische Fehlercodes zurückgeben, die dem Client helfen, das Problem zu verstehen:

- `InvalidInput`: Bei Validierungsfehlern
- `NotFound`: Bei nicht gefundenen Ressourcen
- `Forbidden`: Bei fehlenden Berechtigungen
- `ExpiredToken`: Bei abgelaufenen Tokens
- `InvalidToken`: Bei ungültigen Tokens

### 3. Zentrales Fehlerhandling

Empfehlung: Ein zentrales Fehlerbehandlungsmodul implementieren:

```typescript
// src/lib/error-handler.ts
export function handleApiError(context: any, error: any, path: string): Response {
  console.error(`API error in ${path}:`, error);

  // Spezifische Fehlertypen erkennen und entsprechend behandeln
  if (error instanceof ValidationError) {
    return context.redirect(`${path}?error=ValidationError`, 302);
  }

  // Generischer Fallback
  return context.redirect(`${path}?error=UnknownError`, 302);
}
```

Diese Verbesserungen würden nicht nur die Codebasis robuster machen, sondern auch die Benutzererfahrung verbessern und die Sicherheit erhöhen.
