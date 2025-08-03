---
trigger: always_on
description: Authentication Module Rules
---

# Authentication Module Rules

## Database Queries
- Alle DB-Queries für User/Session müssen mit TypeScript typisiert werden
- Verwende strikte Typisierung für alle Datenbank-Operationen

## Session Management
- JWT-Sessions nur über HttpOnly-Cookies
- Keine clientseitige Speicherung von Tokens im localStorage oder sessionStorage
- Verwende sichere Cookie-Attribute (Secure, SameSite)

## Error Handling
- Einheitliche Error-Response-Struktur für alle Auth-Endpunkte
- Konsistente HTTP-Statuscodes
- Klare Fehlermeldungen ohne sensitive Informationen

## Security
- Passwort-Hashing mit bcrypt oder vergleichbarer sicherer Methode
- Rate-Limiting für Login-Endpunkte
- Input-Validierung für alle Auth-Parameter