# Beitrag leisten

Vielen Dank, dass du Evolution Hub weiterentwickeln möchtest! Dieser Leitfaden fasst die wichtigsten Erwartungen für Beiträge zusammen.

## Branch-Strategie

- **main** enthält den stabilen Produktionscode.
- Verwende Feature-Branches im Format `feature/<kurze-beschreibung>` für neue Funktionen.
- Verwende Fix-Branches im Format `fix/<kurze-beschreibung>` für Bugfixes.
- Synchronisiere deine Branches regelmäßig mit `main`, um Merge-Konflikte zu vermeiden.

## Commit-Style

Wir nutzen das Format [Conventional Commits](https://www.conventionalcommits.org/):

```text
<type>[optional scope]: <prägnante beschreibung>
```

Gültige Typen sind unter anderem `feat`, `fix`, `docs`, `refactor`, `test` und `chore`. Beispiel:

```text
feat(auth): füge passwortlosen login hinzu
```

## Pull-Request-Checkliste

Bitte stelle sicher, dass jeder PR folgende Punkte erfüllt:

- [ ] Linting ausgeführt (`npm run lint` und relevante Format-Checks)
- [ ] Tests ausgeführt (`npm run test` bzw. zielgerichtete Suites)
- [ ] Screenshots oder GIFs angehängt, wenn UI-Verhalten betroffen ist
- [ ] Changelog oder Release Notes aktualisiert, falls erforderlich

## Code-Style-Guide

- Formatierung erfolgt mit **Prettier** (`npm run format`).
- Statische Analysen laufen über **ESLint** (`npm run lint`).
- Halte dich an bestehende Projektstrukturen und benenne Dateien konsistent.

## Sicherheit

Lege niemals Secrets, Zugangsdaten oder personenbezogene Informationen im Repository ab. Nutze `.env`-Dateien und Cloudflare Secrets für vertrauliche Werte.

Vielen Dank für deine Beiträge – wir freuen uns auf deine Ideen!
