# Lead-Magnet Assets – Prompt-Sammlung

Diese Datei enthält je Lead-Magnet einen hochwertigen Prompt zur Bildgenerierung für das Vorschaubild (WEBP).
Die Prompts sind in Deutsch formuliert und funktionieren gut mit Midjourney v6, DALL·E 3 oder Stable Diffusion XL (SDXL).

Keine Marken-Platzhalter nötig; Farb- und Typo-Hinweise sind generisch gehalten, Logo optional in der Nachbearbeitung.

Empfohlene Ausgabegröße: 1600×900 (16:9) für Blog-CTA. Export: WEBP, Qualitätsstufe 80–90.

Tipps für alle Modelle:

- Keine Artefakte, keine Wasserzeichen, kein Clipart-Look.
- Sauberes, realistisches Licht; moderne, ruhige Farbwelt.
- Echte Schrift wird meist schlechter gerendert – Titel/Untertitel bitte in Figma/Canva nachträglich setzen.

Midjourney (v6) Settings-Empfehlung: `--ar 16:9 --v 6 --style raw --s 200 --uplight`
SDXL Settings-Empfehlung: 1600×900, Steps 30–40, CFG 6–7, Sampler DPM++ SDE Karras, Hires fix optional.

---

## 1) New Work Transformations-Guide (Preview)

Prompt:
"""
Minimalistisches, modernes Editorial-Render eines eBook-Covers für einen Business-Guide zum Thema „New Work Transformation“.
Stil: skandinavischer Minimalismus, klare Linien, viel Negativraum, elegantes Licht, dezente Schlagschatten.
Farbwelt: dezente Akzentfarbe auf dunklem, edlem Hintergrund; harmonische, ruhige Töne.
Motiv: helle, luftige Office-Szene im Hintergrund mit subtiler Tiefenunschärfe (Menschen in Zusammenarbeit nur angedeutet, kein Fokus auf Gesichter), im Vordergrund ein stilvolles, realistisch anmutendes Buch-/Magazin-Cover als Mockup (leicht angewinkelt, hochwertiges Papier, feine Textur).
Komposition: ausgewogener Fokus auf das Cover; ausreichend Platz oben/unten/seitlich, um später Titel/Untertitel/Branding typografisch in der Nachbearbeitung zu platzieren.
Licht: soft daylight, realistische Materialität.
Ästhetik: Premium, vertrauenswürdig, seriös.
Vermeiden: übertriebene Neonfarben, Comic-Look, Stock-Foto-Klischees, Wasserzeichen, Text-Artefakte.
"""

Nachbearbeitung (Design): Titel/Untertitel später als Typografie ergänzen; Logo optional dezent integrieren.

---

## 2) KI‑Tools Checkliste 2025 (Preview)

Prompt:
"""
Hochwertiges, technologisch anmutendes Cover-Motiv für eine „KI‑Tools Checkliste 2025“.
Stil: clean tech, geometrische Raster, subtile Glows/Holos, dezente futuristische Elemente; keine überladenen Sci‑Fi Effekte.
Farbwelt: kühles Blau mit dezenten Akzenten auf dunklem, edlem Hintergrund.
Motiv: abstraktes Netzwerk/Gitter mit Knotenpunkten, stilisierte Icons für Kategorien (Automation, Content, Analytics, Collaboration), alles sehr reduziert; im Vordergrund ein flaches Dokument/Clipboard/Sheet‑Mockup als elegantes Objekt, das die Idee „Checkliste“ vermittelt.
Komposition: klare Hierarchie, zentrale Blickführung, ausreichend Freiraum für späteres Typo‑Overlay.
Licht: kontrollierte Reflexe, kein übermäßiger Glow, Schärfe auf dem Mockup.
Ästhetik: Präzision, Zuverlässigkeit, State‑of‑the‑Art.
Vermeiden: generische Stock‑Icons, übertriebene 3D‑Reflexe, sichtbare Schrift im Generat, Wasserzeichen.
"""

Nachbearbeitung (Design): Kurzen Claim + Jahr „2025“ mit neutraler, serifenloser Schrift setzen; Icons ggf. fein justieren; Logo optional.

---

## 3) Produktivitäts‑Masterclass (Preview)

Prompt:
"""
Premium‑Cover‑Visual für eine „Produktivitäts‑Masterclass“ mit Fokus auf Klarheit, Struktur und Motivation.
Stil: moderne Workspace‑Ästhetik, soft gradients, hochwertige Materialität, dezente Glas-/Acryl‑Effekte.
Farbwelt: klare Leitfarbe, subtile Verlaufshintergründe auf dunklem Hintergrund.
Motiv: realistisch anmutendes Desktop‑Mockup (Laptop/Tablet/Smartphone), auf dem reduzierte UI‑Elemente (To‑Do Listen, Kalender, KPI‑Widgets) als grafische Platzhalter sichtbar sind, ohne lesbaren Text.
Komposition: zentriertes Hauptobjekt mit Tiefe; großzügiger Negativraum für spätere Typografie.
Licht: cineastisches Keylight, sanfte Reflektionen.
Ästhetik: Fokus, Ruhe, Professionalität.
Vermeiden: sichtbarer Text, Low‑poly‑Look, überzogene Sättigung, Wasserzeichen.
"""

Nachbearbeitung (Design): Titel, Unterzeile und ggf. „Masterclass“-Badge sauber setzen; Logo optional dezent.

---

## Workflow‑Empfehlung

1. Prompt im Bildmodell (MJ/SDXL) ausführen, besten Seed sichern.
2. Bestes Ergebnis auswählen, in 1600×900 exportieren.
3. In Figma/Canva: Typografie, Jahr/Claim setzen; Logo optional; Kanten/Glow minimal nachschärfen.
4. Export als WEBP (Qualität 80–90), Dateiname passend zu `public/images/lead-magnets/*-preview.webp`.

## Optional: Text‑Content‑Prompts für PDF/ZIP

Wenn gewünscht, erstelle ich zusätzlich pro Lead‑Magnet einen strukturierten LLM‑Prompt für

- Inhaltsverzeichnis, Schreibstil, Umfang pro Kapitel,
- Grafiken/Tabellen‑Platzhalter,
- Export‑Vorgaben (A4, 20–30 Seiten, CTA‑Seiten, Impressum).
