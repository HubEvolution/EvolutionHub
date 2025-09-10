---
category: ai-image
version: 1.0
applies_to: src/pages/api/ai-image/
rules:
  - Implementiere R2-Storage mit Error-Handling für Upload/Download-Operationen
  - Tracke Usage in D1 mit Drizzle ORM und anonymisierten IP
  - Guest-Ownership: AI-Jobs zuverifizierten Guests zuweisen post-Registrierung
  - Verwende konsistentes Response-Format: { success: boolean, data?: T, error?: string }
  - Rate-Limit für aiGenerate: 15/Minute, logge Exceeds
  - Validiere Input-Daten (Prompt, Model) mit TypeScript-Interfaces vor Processing
  - Logge API-Zugriffe strukturiert (JSON, Request-ID, anonymisierte IP)
  - E2E-Tests für Generate-Flow mit Playwright, inkl. Mobile-Responsiveness
---

### AI-Image Rules

– Implementiere R2-Storage mit Error-Handling für Upload/Download-Operationen
– Tracke Usage in D1 mit Drizzle ORM und anonymisierten IP
– Guest-Ownership: AI-Jobs zuverifizierten Guests zuweisen post-Registrierung
– Verwende konsistentes Response-Format: { success: boolean, data?: T, error?: string }
– Rate-Limit für aiGenerate: 15/Minute, logge Exceeds
– Validiere Input-Daten (Prompt, Model) mit TypeScript-Interfaces vor Processing
– Logge API-Zugriffe strukturiert (JSON, Request-ID, anonymisierte IP)
– E2E-Tests für Generate-Flow mit Playwright, inkl. Mobile-Responsiveness