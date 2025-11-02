<!-- markdownlint-disable MD051 -->

# UI/UX-Richtlinien

Diese Dokumentation beschreibt die UI/UX-Richtlinien für das Evolution Hub Projekt. Sie dient als Leitfaden für konsistente Benutzeroberflächen und Interaktionen in der gesamten Anwendung.

## Inhaltsverzeichnis

1. [Designprinzipien](#designprinzipien)
1. [Navigation und Information Architecture](#navigation-und-information-architecture)
1. [Formulardesign](#formulardesign)
1. [Feedback und Benachrichtigungen](#feedback-und-benachrichtigungen)
1. [Barrierefreiheit](#barrierefreiheit)
1. [Interaktionsmuster](#interaktionsmuster)
1. [Content-Richtlinien](#content-richtlinien)
1. [Performance-Optimierung](#performance-optimierung)

---

## Designprinzipien

Die folgenden Prinzipien leiten alle Design- und Entwicklungsentscheidungen im Evolution Hub:

### 1. Klarheit

- **Einfache Sprache**: Verwende klare, präzise Formulierungen ohne Fachjargon

- **Visuelle Hierarchie**: Wichtige Elemente sollten visuell hervorgehoben sein

- **Fokussierte Interfaces**: Jeder Bildschirm hat einen klaren Zweck und Hauptaktion

### 2. Konsistenz

- **Einheitliche Komponenten**: Verwende die dokumentierten UI-Komponenten

- **Konsistente Interaktionen**: Ähnliche Aktionen sollten ähnlich funktionieren

- **Vorhersehbare Muster**: Nutze etablierte UX-Muster für bekannte Interaktionen

### 3. Effizienz

- **Minimale Klicks**: Wichtige Aktionen sollten mit wenigen Klicks erreichbar sein

- **Tastaturnavigation**: Alle Funktionen sollten per Tastatur bedienbar sein

- **Kontextbezogene Aktionen**: Zeige relevante Aktionen im aktuellen Kontext an

### 4. Feedback

- **Reaktionsfähigkeit**: Jede Benutzeraktion sollte sofortiges visuelles Feedback geben

- **Status-Kommunikation**: System-Status klar kommunizieren (Laden, Erfolg, Fehler)

- **Fortschrittsanzeige**: Bei längeren Prozessen Fortschritt anzeigen

### 5. Flexibilität

- **Responsive Design**: Optimale Nutzung auf allen Geräten

- **Personalisierung**: Wichtige Einstellungen anpassbar machen

- **Skalierbarkeit**: Design soll mit wachsender Funktionalität skalieren

---

## Navigation und Information Architecture

### Navigationsstruktur

Die Navigation des Evolution Hub folgt einer klaren Hierarchie:

1. **Hauptnavigation** (Header)

   - Logo (Link zur Startseite)

   - Primäre Navigation (Dashboard, Projekte, Tools, Blog)

   - Benutzermenü (Profil, Einstellungen, Logout)

   - Suche

   - Theme-Toggle

1. **Sekundäre Navigation** (Seitenspezifisch)

   - Tabs oder Segmented Controls für Unterabschnitte

   - Breadcrumbs für tiefere Hierarchieebenen

1. **Utility-Navigation** (Footer)

   - Rechtliche Informationen

   - Support-Links

   - Social Media

   - Newsletter-Anmeldung

### Navigationsrichtlinien

- **Konsistente Positionierung**: Navigationselemente sollten immer an der gleichen Position sein

- **Aktiver Zustand**: Der aktuelle Abschnitt sollte deutlich hervorgehoben sein

- **Responsive Anpassung**: Auf mobilen Geräten Burger-Menü verwenden

- **Zurück-Navigation**: Immer einen klaren Weg zurück anbieten

- **Suchfunktion**: Globale Suche für schnellen Zugriff auf Inhalte

### Information Architecture

- **Logische Gruppierung**: Zusammengehörige Inhalte gruppieren

- **Progressive Disclosure**: Komplexe Informationen schrittweise offenbaren

- **Konsistente Terminologie**: Gleiche Begriffe für gleiche Konzepte

- **Klare Hierarchie**: Wichtige Informationen zuerst präsentieren

- **Kontextuelle Hilfe**: Hilfe und Erklärungen im Kontext anbieten

---

## Formulardesign

### Formularstruktur

- **Logische Gruppierung**: Zusammengehörige Felder gruppieren

- **Einspaltiges Layout**: Bevorzuge einspaltiges Layout für einfache Scanbarkeit

- **Fortschrittsanzeige**: Bei mehrstufigen Formularen Fortschritt anzeigen

- **Konsistente Ausrichtung**: Labels und Eingabefelder konsistent ausrichten

- **Responsive Anpassung**: Auf kleineren Bildschirmen stapeln statt verkleinern

### Formularelemente

- **Labels**: Immer sichtbare Labels verwenden, keine Placeholder als Labels

- **Hilfetext**: Kurze Hilfetexte unter Feldern für Kontext

- **Fehlermeldungen**: Inline-Fehlermeldungen neben betroffenen Feldern

- **Pflichtfelder**: Mit Sternchen (*) markieren, sparsam einsetzen

- **Eingabevalidierung**: Live-Validierung nach Verlassen des Feldes

### Beispiel für Formularstruktur

```html
<form class="space-y-6">
  <div class="space-y-4">
    <h2 class="text-xl font-semibold">Persönliche Informationen</h2>
    
    <div class="space-y-2">
      <FormLabel for="name" required>Name</FormLabel>
      <Input 
        id="name" 
        name="name" 
        type="text" 
        required 
        aria-describedby="name-help"
      />
      <p id="name-help" class="text-sm text-gray-500">
        Bitte gib deinen vollständigen Namen ein.
      </p>
    </div>
    
    <div class="space-y-2">
      <FormLabel for="email" required>E-Mail</FormLabel>
      <Input 
        id="email" 
        name="email" 
        type="email" 
        required 
        aria-describedby="email-help"
      />
      <p id="email-help" class="text-sm text-gray-500">
        Wir senden dir eine Bestätigungs-E-Mail.
      </p>
    </div>
  </div>
  
  <div class="pt-4">
    <Button type="submit">Absenden</Button>
  </div>
</form>

```text

---

## Feedback und Benachrichtigungen

### Feedback-Typen

1. **Inline-Feedback**

   - Direkt neben oder unter dem betroffenen Element

   - Für Formularvalidierung und kontextbezogene Hinweise

   - Farbcodierung: Rot für Fehler, Gelb für Warnungen, Grün für Erfolg

1. **Toast-Benachrichtigungen**

   - Kurzzeitige Benachrichtigungen am oberen oder unteren Bildschirmrand

   - Für temporäre Statusmeldungen (Erfolg, Info)

   - Automatisches Verschwinden nach 5 Sekunden

   - Möglichkeit zum manuellen Schließen

1. **Modals/Dialoge**

   - Für wichtige Meldungen, die Benutzerinteraktion erfordern

   - Fokus auf den Dialog lenken (Rest der Seite abdunkeln)

   - Klare Aktionsbuttons (Primär, Sekundär, Abbrechen)

1. **Statusanzeigen**

   - Für laufende Prozesse (Laden, Speichern)

   - Fortschrittsbalken für längere Prozesse

   - Spinner für kurze Ladezeiten

### Feedback-Richtlinien

- **Zeitnah**: Feedback sollte unmittelbar nach der Aktion erfolgen

- **Klar**: Eindeutige Botschaft, was passiert ist oder was zu tun ist

- **Hilfreich**: Konstruktive Hinweise zur Problemlösung bei Fehlern

- **Nicht störend**: Feedback sollte den Arbeitsfluss nicht unterbrechen

- **Konsistent**: Gleiche Arten von Feedback für ähnliche Situationen

### Beispiele für Feedback-Komponenten

```jsx
// Toast-Benachrichtigung
<div class="fixed bottom-4 right-4 bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded shadow-md">
  <div class="flex">
    <div class="flex-shrink-0">
      <svg class="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
      </svg>
    </div>
    <div class="ml-3">
      <p class="text-sm">Projekt erfolgreich gespeichert</p>
    </div>
    <div class="ml-auto pl-3">
      <button class="inline-flex text-gray-400 hover:text-gray-500">
        <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
        </svg>
      </button>
    </div>
  </div>
</div>

// Fehler-Feedback in einem Formular
<div class="space-y-2">
  <FormLabel for="password" required>Passwort</FormLabel>
  <Input 
    id="password" 
    name="password" 
    type="password" 
    required 
    aria-invalid="true"
    aria-describedby="password-error"
    class="border-red-500 focus:ring-red-500"
  />
  <p id="password-error" class="text-sm text-red-600">
    Passwort muss mindestens 8 Zeichen enthalten.
  </p>
</div>
```

---

## Barrierefreiheit

Evolution Hub strebt WCAG 2.1 AA-Konformität an und folgt diesen Richtlinien:

### Grundprinzipien

1. **Wahrnehmbar**

   - Textalternativen für Nicht-Text-Inhalte (Bilder, Icons)

   - Untertitel und Transkripte für Medien

   - Ausreichender Kontrast (mindestens 4.5:1 für normalen Text)

   - Responsive Layouts für verschiedene Bildschirmgrößen

1. **Bedienbar**

   - Vollständige Tastaturzugänglichkeit

   - Ausreichend Zeit für Interaktionen

   - Keine blinkenden Inhalte, die Anfälle auslösen könnten

   - Klare Navigation und Orientierungshilfen

1. **Verständlich**

   - Konsistente Navigation und Bezeichnungen

   - Vorhersehbares Verhalten bei Interaktionen

   - Fehleridentifikation und -vorschläge

   - Klare Anweisungen und Hilfetexte

1. **Robust**

   - Kompatibilität mit aktuellen und zukünftigen Technologien

   - Valider HTML-Code

   - Korrekte ARIA-Attribute

### Praktische Umsetzung

- **Semantisches HTML**: Korrekte HTML-Elemente für ihren Zweck verwenden

- **ARIA-Attribute**: Nur wenn nötig, zur Ergänzung von semantischem HTML

- **Fokus-Management**: Sichtbarer Fokus-Indikator, logische Tab-Reihenfolge

- **Bildtexte**: Alt-Texte für alle Bilder, leere Alt-Texte für dekorative Bilder

- **Skip-Links**: "Zum Inhalt springen"-Link für Tastaturbenutzer

### Beispiele für barrierefreie Komponenten

```html
<!-- Skip-Link -->
<a href="#main-content" class="sr-only focus:not-sr-only focus:absolute focus:p-4 focus:bg-white focus:text-black focus:z-50">
  Zum Hauptinhalt springen
</a>

<!-- Barrierefreier Button mit Icon -->
<button 
  aria-label="Benachrichtigungen öffnen" 
  class="p-2 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
>
  <svg aria-hidden="true" class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
    <!-- SVG-Pfad -->
  </svg>
</button>

<!-- Formularfeld mit Fehler -->
<div>
  <label for="username" id="username-label">Benutzername</label>
  <input 
    type="text" 
    id="username" 
    aria-invalid="true" 
    aria-describedby="username-error"
  />
  <div id="username-error" role="alert">
    Benutzername wird bereits verwendet.
  </div>
</div>

```text

---

## Interaktionsmuster

### Hover-Zustände

- **Buttons**: Farbänderung, subtile Skalierung

- **Karten**: Leichte Elevation (Schatten), subtile Skalierung

- **Links**: Unterstreichung oder Farbänderung

- **Interaktive Elemente**: Cursor-Änderung zu Pointer

### Fokus-Zustände

- **Sichtbarer Fokus-Ring**: Für alle interaktiven Elemente

- **Konsistente Farbe**: Emerald-500 für den Fokus-Ring

- **Ausreichende Größe**: Mindestens 2px Breite für den Fokus-Ring

### Touch-Interaktionen

- **Touch-Targets**: Mindestens 44x44px für Touch-Ziele

- **Ausreichender Abstand**: Mindestens 8px zwischen Touch-Zielen

- **Swipe-Gesten**: Für Listen und Karussells

- **Pull-to-Refresh**: Für Listen mit aktualisierbaren Inhalten

### Drag & Drop

- **Visuelles Feedback**: Element hebt sich beim Ziehen ab

- **Drop-Zonen**: Deutlich hervorheben, wenn ein Element darüber schwebt

- **Erfolgs-/Fehlerfeedback**: Nach dem Ablegen

- **Tastatur-Alternative**: Für Drag & Drop-Funktionen

### Beispiele für Interaktionsmuster

```jsx
// Hover-Zustand für Karten
<div class="transition-all duration-200 transform hover:scale-105 hover:shadow-lg">
  <!-- Karteninhalt -->
</div>

// Fokus-Zustand für Buttons
<button class="focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2">
  Button-Text
</button>

// Drag & Drop-Element
<div 
  draggable="true"
  class="cursor-grab active:cursor-grabbing bg-white p-4 rounded-lg shadow"
  aria-roledescription="draggable item"
>
  Ziehbares Element
</div>
```

---

## Content-Richtlinien

### Tonalität und Sprache

- **Freundlich und professionell**: Direkt, aber nicht zu informell

- **Inklusiv**: Geschlechtsneutrale Sprache verwenden

- **Präzise**: Klare, eindeutige Formulierungen

- **Konsistent**: Gleiche Begriffe für gleiche Konzepte

### Textformatierung

- **Überschriften**: Klare Hierarchie (H1 > H2 > H3)

- **Absätze**: Kurz und fokussiert, maximal 3-4 Sätze

- **Listen**: Für Aufzählungen und Schritte

- **Hervorhebungen**: Sparsam einsetzen (fett, kursiv)

### Schreibstil

- **Aktiv statt Passiv**: "Du kannst Projekte erstellen" statt "Projekte können erstellt werden"

- **Direkte Ansprache**: "Du" statt "der Benutzer"

- **Positiv formulieren**: Was möglich ist, nicht was nicht möglich ist

- **Handlungsorientiert**: Klare Aktionsaufforderungen

### Fehlermeldungen

- **Spezifisch**: Genau beschreiben, was falsch ist

- **Lösungsorientiert**: Vorschläge zur Behebung anbieten

- **Freundlich**: Nicht beschuldigend formulieren

- **Kurz und prägnant**: Auf das Wesentliche konzentrieren

### Beispiele für Content-Richtlinien

```text
// Gut
"Bitte gib eine gültige E-Mail-Adresse ein, damit wir dir eine Bestätigung senden können."

// Schlecht
"Ungültige E-Mail-Adresse eingegeben."

// Gut
"Projekt erfolgreich gespeichert. Du kannst es jetzt in deiner Projektliste finden."

// Schlecht
"Operation erfolgreich durchgeführt."

// Gut
"Wähle die Tools aus, die du für dein Projekt verwenden möchtest."

// Schlecht
"Tools für das Projekt müssen ausgewählt werden."

```text

---

## Performance-Optimierung

### Ladezeiten

- **Lazy Loading**: Bilder und Komponenten erst laden, wenn sie sichtbar werden

- **Code-Splitting**: JavaScript-Bundles aufteilen für schnelleres initiales Laden

- **Preloading**: Kritische Ressourcen vorladen

- **Caching**: Effektive Cache-Strategien für statische Assets

### Rendering-Optimierung

- **Virtualisierung**: Für lange Listen nur sichtbare Elemente rendern

- **Debouncing/Throttling**: Für häufige Events (Scroll, Resize, Input)

- **Web Workers**: Rechenintensive Aufgaben in separaten Threads

- **Memoization**: Ergebnisse teurer Berechnungen zwischenspeichern

### Wahrnehmbare Performance

- **Skeleton Screens**: Statt Spinner für bessere wahrgenommene Ladezeit

- **Optimistische UI-Updates**: UI sofort aktualisieren, bevor Server antwortet

- **Progressive Enhancement**: Grundfunktionalität ohne JavaScript

- **Mikro-Interaktionen**: Kleine Animationen für Feedback während des Wartens

### Beispiele für Performance-Optimierung

```jsx
// Lazy Loading für Bilder
<img 
  src="placeholder.jpg" 
  data-src="actual-image.jpg" 
  class="lazy-image" 
  alt="Beschreibung" 
/>

// Virtualisierte Liste
function VirtualizedList({ items }) {
  return (
    <div style={{ height: '500px', overflow: 'auto' }}>
      {items.slice(startIndex, endIndex).map(item => (
        <ListItem key={item.id} data={item} />
      ))}
    </div>
  );
}

// Skeleton Screen
function SkeletonCard() {
  return (
    <div class="bg-white p-4 rounded-lg shadow">
      <div class="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
      <div class="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
      <div class="h-4 bg-gray-200 rounded w-5/6"></div>
    </div>
  );
}
```

---

## Zusammenfassung

Diese UI/UX-Richtlinien bieten einen umfassenden Rahmen für die Gestaltung und Entwicklung konsistenter, benutzerfreundlicher Interfaces im Evolution Hub. Sie sollten bei allen Design- und Entwicklungsentscheidungen berücksichtigt werden, um ein kohärentes und qualitativ hochwertiges Benutzererlebnis zu gewährleisten.

Die Richtlinien sind als lebendes Dokument zu verstehen und sollten regelmäßig überprüft und aktualisiert werden, um neue Best Practices und Erkenntnisse aus Benutzerforschung zu integrieren.
