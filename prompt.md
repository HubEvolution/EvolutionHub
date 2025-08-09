ich aktiviere jetzt deinen autonomen Analyse-Modus. Deine folgende Aufgabe ist es, eine komplette Codebase vollständig selbstständig und ohne weiteres Eingreifen meinerseits zu analysieren. Du übernimmst die volle Kontrolle über den Analyseprozess von Anfang bis Ende.
Dein Ziel: Ein 100%iges, tiefgreifendes Verständnis der gesamten Architektur, aller Funktionalitäten und Zusammenhänge zu erlangen und mir dieses in strukturierter Form zu präsentieren.
Dein autonomer Prozessablauf:
 * Initialisierung: Ich gebe dir gleich den Startpunkt der Analyse (z.B. das Stammverzeichnis oder die Haupteingabedatei). Basierend darauf erstellst du intern eine Liste oder eine Warteschlange (Queue) aller zu analysierenden Dateien des Projekts. Du durchsuchst dafür rekursiv alle Verzeichnisse und folgst den Import-Anweisungen.
 * Sequenzielle Abarbeitung: Du arbeitest diese Liste systematisch und selbstständig ab, Datei für Datei.
 * Analyse & Reporting pro Datei: Für jede einzelne Datei in deiner Queue führst du die folgende Analyse durch und präsentierst das Ergebnis in einer einzelnen, zusammenhängenden Chat-Nachricht:
   * Dateiname: Nenne klar die Datei, die du gerade analysierst.
   * Zweck der Datei: Beschreibe ihre Hauptverantwortung.
   * Struktur & Inhalt: Liste die wichtigsten Funktionen, Klassen oder Komponenten auf und beschreibe kurz ihren Zweck, ihre Parameter und ihre Rückgabewerte.
   * Abhängigkeiten: Identifiziere alle internen Imports (zu anderen Projektdateien) und externen Abhängigkeiten (Bibliotheken, APIs).
 * Kontinuierlicher Fortschritt: Am Ende jeder einzelnen Dateianalyse kündigst du an, welche Datei du als Nächstes analysieren wirst, und fährst dann automatisch und ohne auf eine Antwort von mir zu warten mit dieser nächsten Datei fort. Dein Output wird ein kontinuierlicher Stream von Analyseergebnissen sein.
 * Globale Metriken (im Hintergrund sammeln): Während du Datei für Datei analysierst, sammelst und merkst du dir Informationen über das gesamte Projekt hinweg. Achte dabei besonders auf:
   * Redundanten Code: Identische oder sehr ähnliche Codeblöcke an verschiedenen Stellen.
   * Ungenutzte Artefakte: Dateien, Funktionen, Klassen oder Variablen, die nirgendwo importiert oder aufgerufen werden.
   * Potenzielle Probleme: Mögliche Bugs, fehlende Fehlerbehandlung, Performance-Engpässe.
   * Architektur-Muster: Wie die Komponenten global zusammenspielen.
 * Abschlussbericht: Nachdem du die letzte Datei in deiner Queue analysiert hast, erstellst du automatisch einen finalen Abschlussbericht. Dieser Bericht soll eine Management-Summary der gesamten Codebase sein und folgende Punkte zusammenfassen:
   * Eine Übersicht der Gesamtarchitektur.
   * Eine Liste aller identifizierten Redundanzen.
   * Eine Liste aller ungenutzten/veralteten Dateien.
   * Eine Zusammenfassung der kritischsten potenziellen Probleme.
   * Konkrete Vorschläge für Refactoring und Verbesserungen.
Meine Rolle: Meine einzige Aktion ist es, dir jetzt den Startpunkt zu geben. Danach beobachte ich nur noch deinen Output.
Bist du bereit, die Analyse vollständig autonom zu starten?
Der Startpunkt der Analyse ist: [Hier das Stammverzeichnis oder den Pfad zur Haupt-Datei einfügen]