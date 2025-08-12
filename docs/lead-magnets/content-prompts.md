# Lead-Magnet Content Prompts (PDF/ZIP)

Diese Datei enthält strukturierte LLM-Prompts zur Erstellung der Inhalte (PDF/ZIP) für die drei Lead-Magneten.
Sprache: Deutsch. Ton: professionell, klar, praxisnah. Keine Marken-Platzhalter nötig.

Export-Vorgaben (für alle):
- Format: PDF (A4), 20–30 Seiten für Guides/Workbooks; 6–12 Seiten für Checklisten.
- Struktur: Titelblatt, Impressum (Platzhalter), Inhaltsverzeichnis, Kapitel/Module, CTA-Seiten.
- Bilder/Diagramme als Platzhalter markieren: `[GRAFIK: Beschreibung]`, `[TABELLE: Beschreibung]`.
- Barrierefreiheit: klare Überschriften-Hierarchie (H1/H2/H3), Alt-Beschreibungen für Grafiken.
- Schreibstil: präzise, aktive Sprache, kurze Absätze, bullet points, Beispiele, Mini-Übungen.

Dateinamen (Vorschlag):
- `public/lead-magnets/new-work-transformations-guide.pdf`
- `public/lead-magnets/ki-tools-checkliste-2025.pdf`
- `public/lead-magnets/produktivitaets-masterclass-workbook.pdf`

---

## 1) New Work Transformations-Guide (PDF)

„Erstellen Sie ein praxisnahes eBook (20–30 Seiten) zum Thema New Work Transformation.“

Prompt (an LLM geben):
"""
Ziel: Erstelle ein praxisnahes eBook zur New Work Transformation für Führungskräfte in mittelständischen Unternehmen.

Rahmen:
- Umfang: 20–30 Seiten, A4. Struktur: Titel, Impressum (Platzhalter), Inhaltsverzeichnis, 6–8 Kapitel, Schluss/CTA.
- Schreibstil: professionell, verständlich, umsetzungsorientiert; kurze Absätze, bullet points, Beispiele aus dem Arbeitsalltag.
- Zielgruppe: Geschäftsführung, HR, Teamleads.
- Vermeide Marken-/Tool-Exklusivität; nenne generische Kategorien und exemplarische Vorgehensweisen.

Inhalt:
1) Einleitung: Warum New Work? Ziele, Mythen, ROI-Überblick.
2) Kultur & Führung: Vertrauenskultur, Ergebnisorientierung, Feedback-Mechanismen.
3) Organisation & Prozesse: autonome Teams, Meeting-Hygiene, Entscheidungsregeln.
4) Arbeitsmodelle: Hybrid/Remote, asynchrone Kollaboration, Fokuszeiten.
5) Tools & Infrastruktur: Kommunikations- und Kollaborationsformen, Automatisierungsklassen.
6) Kompetenzen: Rollenprofile, Upskilling, Lernpfade.
7) Change-Management: Stakeholder-Map, Pilotierung, Metriken, Risiken.
8) Roadmap (90 Tage): Quick Wins (30), Mid-Term (60), Verankerung (90).

Pro Kapitel:
- Zielsetzung (2–3 Sätze)
- Kernaussagen (3–5 bullet points)
- Praxisbeispiel (kurz, realitätsnah)
- Mini-Übung/Reflexion (1–2 Aufgaben)
- [GRAFIK: Diagramm/Framework-Bild]

Zusatz:
- Checkliste „Bereitschaft bewerten“ (10–15 Punkte)
- Glossar zentraler Begriffe (1–2 Sätze je Begriff)

CTA-Seiten (2):
- Nächste Schritte (Workshop, Assessment, Newsletter)
- Kontakt/Impressum (Platzhalter)

Ausgabeformat:
- Markdown mit H1/H2/H3, Listen, Tabellen. Grafiken als Platzhalter kennzeichnen.
"""

---

## 2) KI‑Tools Checkliste 2025 (PDF/ZIP)

„Erstellen Sie eine kompakte, aktualisierbare Checkliste (6–12 Seiten) für KI‑Tools 2025.“

Prompt (an LLM geben):
"""
Ziel: Erstelle eine kompakte Checkliste für den praktischen Einsatz von KI‑Tools 2025 in Unternehmen.

Rahmen:
- Umfang: 6–12 Seiten, A4. Variante A: PDF; Variante B: ZIP mit PDF + CSV/Markdown-Templates.
- Schreibstil: prägnant, tabellarisch, keine Tool-Lobhudelei; Fokus auf Evaluation und Governance.
- Zielgruppe: Ops, Marketing, Content, Data, HR, IT.

Struktur:
1) Einleitung: Einsatzfelder, Nutzen, Risiken (kurz, 1 Seite)
2) Evaluations-Checkliste (Matrix): Kriterien wie Datenschutz, Kosten, Reifegrad, Integrationen, UX, Support.
3) Kategorie-Übersichten (je 1 Seite):
   - Automation (Workflows, Agenten)
   - Content (Text, Bild, Video)
   - Analytics (BI, Forecasting, Anomalien)
   - Collaboration (Meeting, Notetaking, Übersetzung)
4) Governance & Compliance: Richtlinien, Freigabeprozess, Shadow-IT vermeiden.
5) Rollout-Plan (30/60/90 Tage) mit Verantwortlichkeiten.

Artefakte (für ZIP, optional):
- `templates/evaluationsmatrix.csv` mit Spalten: Kategorie, Use-Case, Tool, DSGVO-Status, Kosten/Monat, Reifegrad 1–5, Verantwortlich, Kommentar.
- `templates/pilotplan.md` mit Milestones, KPIs, Risiken.

Ausgabeformat:
- PDF-Inhalt in Markdown. Tabellen als Markdown-Tabellen.
- CSV/MD-Templates im Klartext als separate Dateien (falls ZIP-Variante).
"""

---

## 3) Produktivitäts‑Masterclass – Workbook (PDF)

„Erstellen Sie ein 20–30‑seitiges Workbook mit Übungen, Vorlagen und Reflexionen.“

Prompt (an LLM geben):
"""
Ziel: Erstelle ein Workbook zur Steigerung persönlicher und Team‑Produktivität.

Rahmen:
- Umfang: 20–30 Seiten, A4. Fokus auf Übungen, Checklisten, kurze Theorieblöcke.
- Schreibstil: motivierend, konkret, ohne Floskeln. Klarer Nutzen je Übung.
- Zielgruppe: Wissensarbeiter:innen, Teamleads, Solopreneure.

Module (Beispiele):
1) Fokus & Priorisierung: Eisenhower, Pareto, WIP‑Limits. [GRAFIK: Prioritäten-Quadranten]
2) Zeitgestaltung: Time‑Boxing, Deep Work, Meeting‑Diät. [TABELLE: Wochenplan‑Raster]
3) Aufgabenfluss: Kanban für 1–3 Personen, Definition of Done. [GRAFIK: Kanban‑Flow]
4) Digitale Hygiene: Inbox‑Zero, Tool‑Minimalismus, Benachrichtigungen.
5) Team‑Rituale: Weeklies, Retros, Entscheidungslog.
6) KPI‑Mini‑Set: Leading vs. Lagging, persönliche KPI‑Liste (max. 5).

Pro Modul:
- Zielbild (2–3 Sätze)
- Kurze Theorie (max. 200 Wörter)
- Übung (Schritt für Schritt, 10–15 Minuten)
- Vorlage (Tabellen/Checkliste) als Platzhalter
- Reflexion (3 Fragen)

Zusatz:
- 30‑Tage‑Challenge (tägliche Mikro‑Aufgaben)
- Troubleshooting‑Guide: 10 häufige Blocker und Gegenmaßnahmen

Ausgabeformat:
- Markdown mit H1/H2/H3, nummerierten Listen, Tabellen.
- Platzhalter für Vorlagen klar kennzeichnen.
"""

---

## Hinweise zur Produktion

- Generieren Sie Inhalte zuerst als Markdown, prüfen/überarbeiten Sie diese, und exportieren Sie anschließend nach PDF (A4).
- Bilder/Diagramme können mit den Preview‑Prompts erzeugt und anschließend als `[GRAFIK: ...]` ersetzt werden.
- CTA‑Seiten zuletzt: klare nächste Schritte (Newsletter, Workshop, Kontakt). Keine sensiblen Daten im Dokument.
- Benennung: Dateinamen konsistent, Inhalte versionslos halten (Jahr im Titel ok, im Dateinamen optional).
