# Komponenten-Dokumentation

Diese Datei dokumentiert wichtige Komponenten des Systems, mit Nutzungsbeispielen und Props-Referenzen. Alle Komponenten folgen den Coding-Standards (PascalCase, TypeScript-Interfaces) und sind modular für Wiederverwendbarkeit.

## UI-Komponenten

### Button.astro
**Beschreibung**: Wiederverwendbarer Button für UI-Elemente.

**Props**:
- `variant`: 'primary' | 'secondary' | 'danger' (default: 'primary')
- `size`: 'sm' | 'md' | 'lg' (default: 'md')
- `disabled`: boolean (default: false)

**Nutzungsbeispiel**:
```astro
---
// src/components/ui/Button.astro
---
<Button variant="primary" size="lg" disabled={false}>
  Klick mich
</Button>
```

### CardReact.jsx
**Beschreibung**: React-Komponente für Karten, z. B. in Dashboard.

**Props**:
- `title`: string
- `description`: string
- `image`: string (optional)

**Nutzungsbeispiel**:
```jsx
// src/components/ui/CardReact.jsx
import React from 'react';

export const Card = ({ title, description, image }) => (
  <div className="bg-white shadow-md rounded-lg p-6">
    {image && <img src={image} alt={title} />}
    <h3 className="text-xl font-bold">{title}</h3>
    <p>{description}</p>
  </div>
);
```

## Auth-Komponenten

### MagicLinkForm.astro
**Beschreibung**: Formular für Magic-Link-Authentifizierung.

**Props**:
- `action`: '/api/auth/magic/request' (default)
- `locale`: 'de' | 'en'

**Nutzungsbeispiel**:
```astro
---
// src/components/auth/MagicLinkForm.astro
---
<form action={action} method="POST">
  <input type="email" name="email" placeholder="E-Mail" />
  <button type="submit">Magic Link senden</button>
</form>
```

## Tools-Komponenten

### EnhancerActions.tsx
**Beschreibung**: Actions für AI-Image-Enhancer, inkl. Model-Auswahl und Download.

**Props**:
- `jobId`: string
- `onEnhance`: (model: string) => void

**Nutzungsbeispiel**:
```tsx
// src/components/tools/imag-enhancer/EnhancerActions.tsx
import { useState } from 'react';

export const EnhancerActions = ({ jobId, onEnhance }) => {
  const [model, setModel] = useState('sdxl');
  return (
    <div>
      <select value={model} onChange={(e) => setModel(e.target.value)}>
        <option value="sdxl">SDXL</option>
      </select>
      <button onClick={() => onEnhance(model)}>Verbessern</button>
    </div>
  );
};
```

### Dropzone.tsx
**Beschreibung**: Drag-and-Drop für Bild-Uploads.

**Props**:
- `onDrop`: (files: File[]) => void

**Nutzungsbeispiel**:
```tsx
// src/components/tools/imag-enhancer/Dropzone.tsx
export const Dropzone = ({ onDrop }) => (
  <div onDrop={(e) => onDrop(Array.from(e.dataTransfer.files))}>
    Datei hier ablegen
  </div>
);
```

## Dashboard-Komponenten

### ProjectsPanel.jsx
**Beschreibung**: Panel für Projekt-Übersicht im Dashboard.

**Props**:
- `projects`: array of Project

**Nutzungsbeispiel**:
```jsx
// src/components/dashboard/ProjectsPanel.jsx
import React from 'react';

export const ProjectsPanel = ({ projects }) => (
  <div className="grid grid-cols-3 gap-4">
    {projects.map(project => (
      <div key={project.id} className="border p-4">
        <h4>{project.title}</h4>
      </div>
    ))}
  </div>
);
```

### ActivityFeed.jsx
**Beschreibung**: Feed für Benutzeraktivitäten.

**Props**:
- `activities`: array of Activity

**Nutzungsbeispiel**:
```jsx
// src/components/dashboard/ActivityFeed.jsx
export const ActivityFeed = ({ activities }) => (
  <ul>
    {activities.map(activity => (
      <li key={activity.id}>{activity.action}</li>
    ))}
  </ul>
);
```

## Best Practices
- **Props-Validierung**: Immer TypeScript-Interfaces verwenden.
- **Accessibility**: WCAG 2.1 AA konform (ARIA-Labels, Keyboard-Navigation).
- **Performance**: Explizite Hydration-Direktiven (`client:load` nur bei Bedarf).

Weitere Komponenten: Siehe [src/components/](src/components/).

---

*Letzte Aktualisierung: 2025-09-07*