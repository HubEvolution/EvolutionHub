---
description: Blog Content Guardrails & Template (Contentful SSoT)
trigger: always_on
---

# Blog Content Rules (Contentful)

## Scope & SoT

- Quelle: Contentful Space `tmtc6fophkx8`, Environment `master`, Content Type `blogPost`.
- Astro-Content-Collection ist kein SoT mehr für Blog; nur Contentful-Felder sind maßgeblich.

## Pflichtfelder

- `title` (String)
- `slug` (String, URL-safe)
- `publishDate` (Datum, nicht in der Zukunft)
- `description` (Short meta/teaser)
- `content` (Rich Text)
- `category` (String)
- `tags` (Array of String, 1..10)
- `author` (String oder Objekt mit `name`)

## Empfohlene Validierungen (Contentful)

- Title: 5–120 Zeichen
- Description: 20–200 Zeichen
- Tags: min 2 Zeichen/Tag, max 10 Tags
- ImageAlt: max 200 Zeichen
- updatedDate: ≥ publishDate
- publishDate: ≤ heute
- Category: Whitelist (z. B. “Evolution Hub Story”, “Technologie”, “Produktivität”, …)
- Lang: default `de`; `en` erlaubt (Enum)

## Struktur-Template (Abschnitte/H2/H3)

1) Lead/Hook: Warum das Thema mehr als „nice to have“ ist (Kosten/Abuse/UX).
2) H2 „Hook …“: Problemrahmen (z. B. offene Textbox → Kosten/Abuse/PII).
3) Bullet-Liste „versteckte Risiken“: Kostenkontrolle, Abuse-Prevention, Sicherheit/PII.
4) Kurzfazit: „Mini-Produkt mit API/Limits/Fehlerformen“.
5) H2 „Kontext“: Warum brauchen wir das Feature? (Kommunikationsprobleme, fehlende Constraints).
6) Liste typischer Symptome: zu vage Prompt, fehlendes Output-Format/Beispiele.
7) Leitidee: Nutzer zu Explizitheit zwingen; Spezifikation statt „Magie“.
8) H2 „Modell-/Provider-Strategie“: pinned vs. latest, Env-getrieben, Austauschbarkeit.
9) H2 „Learnings“ (Bullets): Guardrails, Rate-Limits/Quoten, Modellnennung ohne Verklebung, Format/Constraints/Beispiele als UX.
10) H2 „Ausblick“: Nächste Schritte/Features; Wiederverwendung der Prinzipien.

## Stil & Ton

- Klar, technisch, deutsch; konkrete Modelle/IDs in Inline-Code (z. B. `gpt-4o-mini`, pinned Replicate IDs).
- Überschriften: H2 für Hauptabschnitte, H3 für Steps/Unterpunkte.
- Listen für Risiken/Steps/Learnings; kurze, dichte Absätze.

## Medien & SEO

- Image optional; wenn vorhanden: `image` + `imageAlt` (≤200 Zeichen), 1200x630 bevorzugt.
- Fallback OG: `/images/blog/default-og.svg`.
- SEO-Felder optional: `seo.title` (≤60), `seo.description` (≤160), `seo.canonical`, `seo.noindex` (bool).

## CTA/Leadmagnet (optional)

- CTAs pro Artikel optional in Frontmatter/Contentful-Feldern (Array). Positionen: `top`/`bottom`. Typen: `newsletter` | `leadmagnet` | `consultation` | `social`.
- Falls keine CTAs gesetzt: fallback CTA nach Kategorie (Newsletter/Leadmagnet/Consultation).

## Do & Don’t

- Do: Klarer Problemrahmen, Risiken, Guardrails, Modell-Strategie, Ausblick.
- Do: Tags sinnvoll (max 10), Kategorie aus Whitelist.
- Don’t: PII/Secrets im Content; keine vagen „AI macht’s schon“-Versprechen; keine Modellverklebung im Code-Sinn (Env-getrieben nennen statt hardcoden).

## Verarbeitung (Runtime)

- BlogService cached 60s; filtert drafts, category/tag/lang/featured/search; sort nach updatedDate/pubDate.
- Lang-Fallback `de`, Author-Fallback „EvolutionHub Team“, Category-Fallback „Allgemein“.

## Tests/Review

- Redaktionscheck: Pflichtfelder befüllt, Validierungsgrenzen eingehalten, H2/H3-Gliederung vorhanden.
- SEO: title/description gefüllt, Canonical geprüft, OG-Bild vorhanden oder Fallback.
- Links: interne Pfade locale-bewusst (`/blog/...`), keine toten Links.

## Qualitäts- & Voice-Guardrails

- Voice/Ton: klar, konkret, aktive Sprache, kurze Sätze; keine generischen Phrasen („In conclusion“, „Nowadays…“), keine Floskeln.
- Belegpflicht: Jede Behauptung mit Beispiel, Zahl oder Quelle stützen (Links oder interne Referenzen); keine erfundenen Facts.
- Mindeststruktur: mind. 1 Hook-Absatz, 2–3 H2-Abschnitte, 2 Bullet-Listen (z. B. Risiken/Learnings), 1 Ausblick.
- Länge: Ziel 900–1500 Wörter (anpassbar pro Briefing); Absätze <120 Wörter, Sätze im Schnitt ≤22 Wörter.
- Beispiele/Code: Bei Modellnamen/Flows konkrete Mini-Beispiele (Inline-Code oder kleiner Workflow).
- Anti-AI-Fingerprint: Vermeide Schablonen („In diesem Blogpost werden wir…“); nutze projektspezifische Details (eigene Limits, Flags, Modelle, Prozesse).
- Originalität: Pro Hauptabschnitt mind. 1 eigene Beobachtung/Failure-Mode; keine reinen AI-Generic-Tipps.
- CTA-Qualität: CTA inhaltlich spezifisch zum Artikelthema (kein generisches „Melde dich für den Newsletter an“).
- SEO-Feinheiten: Haupt-Keyword in Titel/H1, Description und 1–2 H2; 2–3 interne Links auf relevante Seiten/Posts; OG-Image gesetzt.
