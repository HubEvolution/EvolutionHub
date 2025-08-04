# Komponenten-Dokumentation

Diese Dokumentation bietet einen Überblick über die Komponenten des Evolution Hub Frontends. Das Projekt verwendet Astro als Hauptframework mit React-Komponenten für interaktive Elemente.

## Inhaltsverzeichnis

1. [UI-Basiskomponenten](#ui-basiskomponenten)
2. [Layout-Komponenten](#layout-komponenten)
3. [Dashboard-Komponenten](#dashboard-komponenten)
4. [Blog-Komponenten](#blog-komponenten)
5. [Spezialkomponenten](#spezialkomponenten)

---

## UI-Basiskomponenten

Die UI-Basiskomponenten bilden die Grundbausteine der Benutzeroberfläche und werden in der gesamten Anwendung wiederverwendet.

### Button

**Datei:** `src/components/ui/Button.astro`

Eine flexible Button-Komponente mit verschiedenen Varianten, Größen und Zuständen.

**Props:**
- `variant`: `'primary' | 'secondary' | 'outline' | 'ghost' | 'link'` (Standard: `'primary'`)
- `size`: `'sm' | 'md' | 'lg'` (Standard: `'md'`)
- `type`: `'button' | 'submit' | 'reset'` (Standard: `'button'`)
- `disabled`: `boolean` (Standard: `false`)
- `fullWidth`: `boolean` (Standard: `false`)
- `className`: `string` für zusätzliche CSS-Klassen

**Beispiel:**
```astro
<Button variant="primary" size="lg">
  Jetzt starten
</Button>

<Button variant="outline" disabled={isLoading}>
  Abbrechen
</Button>
```

### Card

**Datei:** `src/components/ui/Card.astro`

Eine Container-Komponente für die Gruppierung verwandter Inhalte.

**Props:**
- `className`: `string` für zusätzliche CSS-Klassen

**Beispiel:**
```astro
<Card className="p-6">
  <h3 class="text-xl font-semibold">Kartenüberschrift</h3>
  <p>Karteninhalt hier...</p>
</Card>
```

### Input

**Datei:** `src/components/ui/Input.astro`

Eine Eingabefeld-Komponente für Formulare.

**Props:**
- `type`: `string` - HTML-Input-Typ (Standard: `'text'`)
- `id`: `string` - ID für das Input-Element
- `name`: `string` - Name des Input-Elements
- `placeholder`: `string` - Platzhaltertext
- `required`: `boolean` - Ob das Feld erforderlich ist
- `className`: `string` für zusätzliche CSS-Klassen

**Beispiel:**
```astro
<Input 
  type="email" 
  id="email" 
  name="email" 
  placeholder="E-Mail-Adresse eingeben" 
  required 
/>
```

### FormLabel

**Datei:** `src/components/ui/FormLabel.astro`

Eine Label-Komponente für Formularfelder.

**Props:**
- `for`: `string` - ID des zugehörigen Formularelements
- `className`: `string` für zusätzliche CSS-Klassen

**Beispiel:**
```astro
<FormLabel for="email">E-Mail-Adresse</FormLabel>
<Input type="email" id="email" name="email" />
```

### Skeleton

**Datei:** `src/components/ui/Skeleton.astro`

Eine Skeleton-Loading-Komponente für Inhalte, die noch geladen werden.

**Props:**
- `className`: `string` für zusätzliche CSS-Klassen
- `width`: `string` - Breite des Skeleton-Elements
- `height`: `string` - Höhe des Skeleton-Elements

**Beispiel:**
```astro
<Skeleton width="100%" height="24px" className="mb-2" />
<Skeleton width="70%" height="16px" className="mb-4" />
```

---

## Layout-Komponenten

Layout-Komponenten definieren die Struktur und das Layout der Anwendung.

### Header

**Datei:** `src/components/Header.astro`

Die Hauptnavigationsleiste der Anwendung.

**Features:**
- Responsive Navigation
- Dynamisches Menü basierend auf Authentifizierungsstatus
- Dark/Light-Mode-Toggle
- Mobile Navigation

**Beispiel:**
```astro
---
import Header from '@/components/Header.astro';
---

<Header />
```

### Footer

**Datei:** `src/components/Footer.astro`

Die Fußzeile der Anwendung mit Links, Copyright-Informationen und weiteren Ressourcen.

**Features:**
- Mehrspaltiges Layout
- Social-Media-Links
- Newsletter-Anmeldung
- Copyright-Informationen

**Beispiel:**
```astro
---
import Footer from '@/components/Footer.astro';
---

<Footer />
```

### ThemeProvider & ThemeToggle

**Dateien:** 
- `src/components/ThemeProvider.astro`
- `src/components/ThemeToggle.astro`

Komponenten zur Verwaltung und Umschaltung des Farbschemas (hell/dunkel).

**Beispiel:**
```astro
---
import ThemeProvider from '@/components/ThemeProvider.astro';
import ThemeToggle from '@/components/ThemeToggle.astro';
---

<ThemeProvider>
  <!-- Seiteninhalt -->
  <ThemeToggle />
</ThemeProvider>
```

---

## Dashboard-Komponenten

Komponenten speziell für das Dashboard der Anwendung.

### ProjectsPanel

**Datei:** `src/components/dashboard/ProjectsPanel.astro`

Zeigt die Projekte des Benutzers mit Fortschrittsanzeige und Aktionen an.

**Features:**
- Projektliste mit Status und Fortschritt
- Sortier- und Filterfunktionen
- Schnellaktionen für Projekte

**Beispiel:**
```astro
---
import ProjectsPanel from '@/components/dashboard/ProjectsPanel.astro';
---

<ProjectsPanel userId={currentUser.id} />
```

### ActivityFeed

**Datei:** `src/components/dashboard/ActivityFeed.astro`

Zeigt die neuesten Aktivitäten des Benutzers oder des Teams an.

**Features:**
- Chronologische Liste von Aktivitäten
- Verschiedene Aktivitätstypen (Kommentare, Projekte, etc.)
- Zeitstempel und Benutzerinformationen

**Beispiel:**
```astro
---
import ActivityFeed from '@/components/dashboard/ActivityFeed.astro';
---

<ActivityFeed userId={currentUser.id} limit={10} />
```

### Notifications

**Datei:** `src/components/dashboard/Notifications.astro`

Zeigt Benachrichtigungen für den Benutzer an.

**Features:**
- Ungelesene/gelesene Benachrichtigungen
- Verschiedene Benachrichtigungstypen
- Markieren als gelesen

**Beispiel:**
```astro
---
import Notifications from '@/components/dashboard/Notifications.astro';
---

<Notifications userId={currentUser.id} />
```

### QuickActions

**Datei:** `src/components/dashboard/QuickActions.astro`

Schnellzugriffsleiste für häufig verwendete Aktionen.

**Features:**
- Kontextbezogene Aktionen
- Tastenkombinationen
- Anpassbare Aktionen

**Beispiel:**
```astro
---
import QuickActions from '@/components/dashboard/QuickActions.astro';
---

<QuickActions userId={currentUser.id} />
```

### StatsCard

**Datei:** `src/components/dashboard/StatsCard.astro`

Zeigt Statistiken und Kennzahlen in Kartenform an.

**Props:**
- `title`: `string` - Titel der Statistik
- `value`: `string | number` - Wert der Statistik
- `icon`: `string` - Icon-Name
- `change`: `number` - Prozentuale Änderung (optional)
- `trend`: `'up' | 'down' | 'neutral'` - Trend der Statistik (optional)

**Beispiel:**
```astro
---
import StatsCard from '@/components/dashboard/StatsCard.astro';
---

<StatsCard 
  title="Aktive Projekte" 
  value={12} 
  icon="project" 
  change={8.2} 
  trend="up" 
/>
```

### UserProfile

**Datei:** `src/components/dashboard/UserProfile.astro`

Zeigt Benutzerinformationen und Profileinstellungen an.

**Features:**
- Profilbild
- Benutzerinformationen
- Schnellzugriff auf Profileinstellungen

**Beispiel:**
```astro
---
import UserProfile from '@/components/dashboard/UserProfile.astro';
---

<UserProfile user={currentUser} />
```

---

## Blog-Komponenten

Komponenten für den Blog-Bereich der Anwendung.

### BlogCard

**Datei:** `src/components/BlogCard.astro`

Zeigt eine Vorschau eines Blog-Beitrags an.

**Props:**
- `post`: `object` - Blog-Post-Daten
- `featured`: `boolean` - Ob der Beitrag hervorgehoben werden soll

**Beispiel:**
```astro
---
import BlogCard from '@/components/BlogCard.astro';
---

<BlogCard post={post} featured={index === 0} />
```

### BlogList

**Datei:** `src/components/BlogList.astro`

Zeigt eine Liste von Blog-Beiträgen an.

**Props:**
- `posts`: `array` - Liste der Blog-Posts
- `showFeatured`: `boolean` - Ob der erste Beitrag hervorgehoben werden soll

**Beispiel:**
```astro
---
import BlogList from '@/components/BlogList.astro';
---

<BlogList posts={latestPosts} showFeatured={true} />
```

### BlogPost

**Datei:** `src/components/BlogPost.astro`

Zeigt den vollständigen Inhalt eines Blog-Beitrags an.

**Props:**
- `post`: `object` - Blog-Post-Daten
- `showRelated`: `boolean` - Ob verwandte Beiträge angezeigt werden sollen

**Beispiel:**
```astro
---
import BlogPost from '@/components/BlogPost.astro';
---

<BlogPost post={currentPost} showRelated={true} />
```

---

## Spezialkomponenten

Weitere spezialisierte Komponenten für bestimmte Anwendungsfälle.

### ErrorBoundary

**Datei:** `src/components/ErrorBoundary.astro`

Fängt Fehler in Komponenten ab und zeigt eine Fallback-UI an.

**Props:**
- `fallback`: `string | Component` - Fallback-UI bei Fehlern

**Beispiel:**
```astro
---
import ErrorBoundary from '@/components/ErrorBoundary.astro';
import Fallback from '@/components/Fallback.astro';
---

<ErrorBoundary fallback={Fallback}>
  <DynamicComponent />
</ErrorBoundary>
```

### Pagination

**Datei:** `src/components/Pagination.astro`

Komponente für die Seitennavigation in Listen.

**Props:**
- `currentPage`: `number` - Aktuelle Seite
- `totalPages`: `number` - Gesamtanzahl der Seiten
- `baseUrl`: `string` - Basis-URL für die Seitenlinks

**Beispiel:**
```astro
---
import Pagination from '@/components/Pagination.astro';
---

<Pagination 
  currentPage={currentPage} 
  totalPages={totalPages} 
  baseUrl="/blog/page/" 
/>
```

### Newsletter

**Datei:** `src/components/Newsletter.astro`

Anmeldeformular für den Newsletter.

**Props:**
- `title`: `string` - Titel des Anmeldeformulars
- `description`: `string` - Beschreibung des Newsletters

**Beispiel:**
```astro
---
import Newsletter from '@/components/Newsletter.astro';
---

<Newsletter 
  title="Bleib auf dem Laufenden" 
  description="Erhalte die neuesten Updates direkt in dein Postfach." 
/>
```

### CategoryFilter

**Datei:** `src/components/CategoryFilter.astro`

Filter-Komponente für Kategorien oder Tags.

**Props:**
- `categories`: `array` - Liste der verfügbaren Kategorien
- `selectedCategory`: `string` - Aktuell ausgewählte Kategorie
- `baseUrl`: `string` - Basis-URL für die Kategorie-Links

**Beispiel:**
```astro
---
import CategoryFilter from '@/components/CategoryFilter.astro';
---

<CategoryFilter 
  categories={allCategories} 
  selectedCategory={currentCategory} 
  baseUrl="/tools/category/" 
/>
```

### SkipLink

**Datei:** `src/components/SkipLink.astro`

Barrierefreiheits-Komponente zum Überspringen der Navigation.

**Props:**
- `href`: `string` - Ziel-ID zum Überspringen (Standard: `'#content'`)
- `text`: `string` - Text des Links (Standard: `'Zum Inhalt springen'`)

**Beispiel:**
```astro
---
import SkipLink from '@/components/SkipLink.astro';
---

<SkipLink href="#main-content" />
```

---

## Komponentenorganisation

Die Komponenten sind nach folgenden Prinzipien organisiert:

1. **Atomares Design**:
   - Basiskomponenten (`ui/`) sind die kleinsten Bausteine
   - Diese werden zu größeren Komponenten zusammengesetzt
   - Komplexe Komponenten verwenden mehrere Basiskomponenten

2. **Funktionale Gruppierung**:
   - Dashboard-Komponenten in `dashboard/`
   - Blog-Komponenten direkt im Hauptverzeichnis
   - UI-Basiskomponenten in `ui/`

3. **Wiederverwendbarkeit**:
   - Komponenten sind so gestaltet, dass sie in verschiedenen Kontexten wiederverwendet werden können
   - Props ermöglichen Anpassungen ohne Codeduplizierung

4. **Konsistenz**:
   - Alle Komponenten folgen dem gleichen Muster für Props und Styling
   - Tailwind-Klassen werden konsistent angewendet
   - Dark-Mode-Unterstützung ist durchgängig implementiert
