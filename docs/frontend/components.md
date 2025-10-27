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
<Button variant="primary" size="lg"> Jetzt starten </Button>

<Button variant="outline" disabled={isLoading}> Abbrechen </Button>
```

### CardReact

**Datei:** `src/components/ui/CardReact.jsx`

Container-Komponente für die Gruppierung verwandter Inhalte in React-Kontexten. In Astro werden stattdessen spezialisierte Karten wie `BlogCard.astro`, `dashboard/StatsCard.astro` oder `tools/ToolCard.astro` verwendet. Siehe auch `docs/frontend/card-components.md`.

**Props:**

- `title?`: `string` – Optionaler Titel, wird als Überschrift gerendert
- `id?`: `string`
- `className?`: `string` – Zusätzliche CSS-Klassen

**Beispiel (React):**

```jsx
import CardReact from '@/components/ui/CardReact';

export function Example() {
  return (
    <CardReact className="p-6">
      <h3 className="text-xl font-semibold">Kartenüberschrift</h3>
      <p>Karteninhalt hier…</p>
    </CardReact>
  );
}
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
<Input type="email" id="email" name="email" placeholder="E-Mail-Adresse eingeben" required />
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

### Header (Option&nbsp;C — Produktionslayout)

**Datei:** `src/components/Header.astro`

**Überblick:**

- Sticky, abgerundeter Glas-Header mit dunklem Verlauf, der nahtlos mit dem Footer harmoniert
- Desktop-Navigation (Links zu Dashboard, Tools, Pricing, Blog) mit Active-State-Hervorhebung
- Nutzerbereich (Avatar, Plan & Usage, ThemeToggle, Locale-Switch) innerhalb eines Dropdowns
- Mobile Drawer inkl. Auth-abhängiger Abschnitte und persistenter Locale-Links
- Scrollverhalten: transparent im Viewport, `HeaderScroll` setzt bei Solid-State Blur/Backdrop und Rand

**Gestaltungsdetails:**

- Hintergrund: `bg-gradient-to-b from-gray-900/10 to-transparent` (mobil) bzw. `from-gray-900/90 to-black/90` (>=md). Pattern Overlay aktiviert ab `md:` via Base64-SVG (`opacity-20`).
- `glass-header` Utility entfernt Legacy-Masken; Blur wird erst ab `md` aktiv, um mobile Layouts klar zu halten.
- Logo-Link leitet über `localizePath(currentLocale, '/')` immer zur lokalisierten Startseite.
- Locale-Switch (`setLocaleHref`) hängt `?set_locale=<lang>&next=<encoded URL>` an den aktuellen Pfad und respektiert Query/Hash.
- Navigationslinks prüfen mittels `isActiveLocalized` auch Sub-Routen (`/dashboard/*`). Active State erhält Gradient-Unterstrich, Screenreader-Markierung `(current page)`.
- Dropdown enthält ThemeToggle, Plan/Usage-Placeholder (per JS befüllt) und Logout-Link (`/api/user/logout`).
- Mobile Menü-Button steuert #mobile-menu; Icons werden über `#menu-icon` getauscht.
- Header erfüllt `role=navigation`, `aria-label="Main navigation"`; Buttons/Links sind mit `aria-*` versehen.

**Props & Integrationspunkte:**

- Erwartet optional `user`-Prop (Name, Email, Image) für Auth-Zustände.
- Nutzt `getLocale`, `localizePath` und `setLocaleHref` → Middleware redirectet anhand `set_locale`.
- JS-Verhalten (Solid Header bei Scroll) über `HeaderScroll.astro`.

**Beispiel-Einbindung:**

```astro
---
import Header from '@/components/Header.astro';
---

<Header user={Astro.locals.user} />
```

### Footer (Sollzustand — Produktionslayout)

**Datei:** `src/components/Footer.astro`

**Überblick:**

- Glas-Footer mit identischem Gradient/Pattern wie Header (dunkler Verlauf + Base64-SVG)
- 4- bzw. 5-Spalten-Layout: Brand, Quick Links, Rechtliches, Tools (dynamisch), Newsletter (optional)
- Social-Media-Icons **in fixer Reihenfolge**: GitHub → X → Reddit → TikTok → Instagram → LinkedIn → Pinterest (nur gerenderte Links erscheinen)
- Lokalisierte Navigation (DE neutral, EN mit `/en/`), Cookie-Settings-Link per `cookieSlug` Map
- Newsletter-Sektion standardmäßig ausgeblendet (`hideNewsletter=true`)

**Props:**

| Prop             | Typ       | Default | Beschreibung                                 |
| ---------------- | --------- | ------- | -------------------------------------------- |
| `locale`         | `Locale`  | `'de'`  | Steuert Übersetzungen, Pfade und Cookie-Slug |
| `hideNewsletter` | `boolean` | `true`  | Newsletter-Sektion ein-/ausblenden           |

**Gestaltungsdetails:**

- Container nutzt `.glass-footer` (Tailwind Utility in `global.css`): `backdrop-blur-xl`, `bg-white/60` (light) / `bg-gray-900/50` (dark) + dezente Border.
- Logo-Link verweist über `localizePath(locale, '/')` auf die lokalisierte Startseite, `aria-label="Evolution Hub Home"`.
- Social Links erhalten `aria-label`, `target="_blank"`, `rel="noopener noreferrer"`; Icons sind `16px` und skalieren via `group-hover`.
- Quick Links / Legal / Tools nutzen `localizePath` und `t('footer.*')` Übersetzungen; Items mit fehlendem Ziel (z. B. `comingSoon`) werden gefiltert.
- Cookie-Link: `/cookie-einstellungen` (DE) vs. `/cookie-settings` (EN) via `cookieSlug` Mapping.
- Newsletter-Form (wenn sichtbar) rendert `Newsletter.astro` inline.
- Abschließende Copyright-Zeile bezieht Text aus i18n (`footer.copyright`).

**Dynamische Tools-Liste:**

- `getAllTools(locale)` liefert Tool-Metadaten.
- Filtert `comingSoon === false` und sortiert anhand `rank(id)` (Imag Enhancer → Prompt Enhancer → Webscraper → Voice Visualizer → Rest).
- Icons über `Icon`-Komponente oder Fallback-SVG; Links sind lokalisiert (`tool.url`).

**Beispiel-Einbindung:**

```astro
---
import Footer from '@/components/Footer.astro';
---

<Footer locale="de" hideNewsletter={false} />
```

**Hinweise zur Internationalisierung:**

- Deutsche Seiten nutzen den neutralen Pfad (`/kontakt`), englische Seiten leben unter `/en/...` (via `localizePath`).
- Locale-Switch im Header respektiert bereits gesetzte `set_locale`-Cookies; Footer-Links bleiben konsistent.
- Übersetzungen stammen aus `src/utils/i18n` (`t('footer.*')`).

**Design-Referenzen:**

- Gradienten-/Pattern-Assets in Header & Footer identisch (siehe Base64-SVG in beiden Komponenten).
- Glass Utilities definiert in `src/styles/global.css` (`.glass-header`, `.glass-footer`).

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

<StatsCard title="Aktive Projekte" value={12} icon="project" change={8.2} trend="up" />
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

<Pagination currentPage={currentPage} totalPages={totalPages} baseUrl="/blog/page/" />
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

---

## Kommentar-Komponenten

Komponenten für das Kommentarsystem (React-basiert mit Zustand State Management).

### CommentSection

**Datei:** `src/components/comments/CommentSection.tsx`

Haupt-Container für Kommentare mit Mobile/Desktop-Detection und Error-Boundary.

**Props:**

- `entityType`: `'blog_post' | 'project' | 'general'` - Typ des kommentierten Entities
- `entityId`: `string` - ID/Slug des Entities
- `title`: `string` - Titel der Section (Standard: `'Kommentare'`)
- `className`: `string` - Zusätzliche CSS-Klassen (optional)
- `initialUser`: `{ id: number, name: string, email: string } | null` - Server-Side User-Context

**Features:**

- Automatische Mobile/Desktop-Detection (< 768px)
- Separate Komponenten für Mobile (CommentMobile) und Desktop (CommentList)
- Error-Boundary für resilientes Error-Handling
- Zustand-Store-Integration

**Beispiel:**

```astro
---
const user = Astro.locals.user || null;
const initialUser = user
  ? {
      id: Number(user.id),
      name: user.name,
      email: user.email,
    }
  : null;
---

<CommentSection entityType="blog_post" entityId={slug} initialUser={initialUser} client:load />
```

### CommentForm

**Datei:** `src/components/comments/CommentForm.tsx`

Formular für Comment-Eingabe mit Keyboard-Navigation.

**Features:**

- Auth-Mode: Nur Content-Field (User aus Session)
- Guest-Mode: Content + Name + Email-Fields
- Keyboard-Shortcuts: `Ctrl+Enter` (Submit), `Escape` (Cancel)
- ARIA-Labels für Accessibility
- Auto-Resize Textarea

**Beispiel:**

```tsx
<CommentForm
  onSubmit={handleCreateComment}
  isLoading={isLoading}
  currentUser={currentUser}
  placeholder="Schreibe einen Kommentar..."
/>
```

### CommentList

**Datei:** `src/components/comments/CommentList.tsx`

Threaded Comment-Display mit rekursivem Rendering.

**Features:**

- Nested Comments (Parent/Child bis Depth 3)
- Edit/Delete/Reply-Actions
- Status-Badges (Pending, Approved, Flagged)
- Load More Pagination
- Optimistic UI Updates

**Beispiel:**

```tsx
<CommentList
  comments={comments}
  onUpdateComment={handleUpdateComment}
  onDeleteComment={handleDeleteComment}
  onReply={handleCreateComment}
  currentUser={currentUser}
  isLoading={isLoading}
/>
```

### CommentMobile

**Datei:** `src/components/comments/CommentMobile.tsx`

Mobile-optimierte Kommentar-Ansicht.

**Features:**

- Touch-Friendly Button-Größen
- Optional: Swipe-to-Delete-Actions
- Responsive Typography
- Simplified Layout für kleine Screens

**Beispiel:**

```tsx
<CommentMobile
  comments={comments}
  onUpdateComment={handleUpdateComment}
  onDeleteComment={handleDeleteComment}
  onReply={handleCreateComment}
  currentUser={currentUser}
  maxDepth={3}
  enableSwipeActions={true}
/>
```

### CommentStats

**Datei:** `src/components/comments/CommentStats.tsx`

Zeigt Comment-Statistiken an (Total/Approved/Pending).

**Beispiel:**

```tsx
<CommentStats stats={stats} />
```

### CommentErrorBoundary

**Datei:** `src/components/comments/CommentErrorBoundary.tsx`

Error-Boundary für Graceful Error-Handling.

**Features:**

- Fallback-UI mit "Retry"-Button
- Dev-Mode: Stacktrace-Display
- Production: User-Friendly Error-Message

**Beispiel:**

```tsx
<CommentErrorBoundary>
  <CommentSection {...props} />
</CommentErrorBoundary>
```

### useCommentStore (Zustand)

**Datei:** `src/stores/comment-store.ts`

State-Management für Kommentare mit Zustand.

**State:**

```typescript
{
  comments: Comment[]
  stats: CommentStats | null
  currentUser: { id, name, email } | null
  csrfToken: string | null
  isLoading: boolean
  error: string | null
  hasMore: boolean
  pageSize: number
}
```

**Actions:**

- `fetchComments(filters?, append?)`: Fetch Comments
- `createComment(data, csrfToken?)`: Create Comment (Optimistic UI)
- `updateComment(id, data, csrfToken)`: Update Comment
- `deleteComment(id, csrfToken)`: Delete Comment (Soft-Delete)
- `loadMoreComments(baseFilters?)`: Load More Pagination
- `initializeCsrfToken()`: Initialize CSRF Token

**Beispiel:**

```tsx
import { useCommentStore } from '@/stores/comment-store';

export function MyComponent() {
  const { comments, createComment, isLoading } = useCommentStore();

  const handleSubmit = async (content: string) => {
    await createComment(
      {
        content,
        entityType: 'blog_post',
        entityId: 'my-post',
      },
      csrfToken
    );
  };

  return (
    <div>
      {comments.map((comment) => (
        <div key={comment.id}>{comment.content}</div>
      ))}
    </div>
  );
}
```

---

## Globale Mounts & Integrationen

Zentrale, global gemountete Komponenten und Integrationen. Details siehe verlinkte Dokumente.

- **AOSCoordinator** (`src/components/scripts/AOSCoordinator.astro`)
  - Wird in `src/layouts/BaseLayout.astro` nur gemountet, wenn `enableAOS === true`.
  - AOS-CSS wird im `<head>` ebenfalls nur bei `enableAOS` geladen.
  - Respektiert `prefers-reduced-motion` automatisch.
  - Siehe: `docs/frontend/aos-coordinator.md`.

- **AnalyticsCoordinator** (`src/components/scripts/AnalyticsCoordinator.astro`)
  - Wird in `BaseLayout.astro` gemountet, wenn `enableAnalytics === true`.

- **Toaster** (`src/components/Toaster`)
  - Global als React Island mit `client:load` eingebunden (siehe `BaseLayout.astro`).
  - Dient für Sonner-Toast-Benachrichtigungen (siehe Auth-Status-Notifier-Dokumentation, falls vorhanden).

- **Astro View Transitions**
  - `<ViewTransitions />` ist in `BaseLayout.astro` aktiv.
  - `AOSCoordinator` reagiert auf Transition-Events und ruft `AOS.refreshHard()` auf.

Weitere Hinweise und Beispiele:

- Kartenübersicht und Richtlinien: `docs/frontend/card-components.md`
- Header-Scroll-Animation: `docs/frontend/header-scroll-animation.md`
