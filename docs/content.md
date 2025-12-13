---
description: 'Richtlinien für Content Management (Blog, UI-Texte, Collections)'
owner: 'Content Team'
priority: 'medium'
lastSync: '2025-12-12'
codeRefs: 'src/content/**, src/utils/i18n.ts, docs/content.md'
testRefs: 'N/A'
---

<!-- markdownlint-disable MD051 -->

# Content Management Guidelines

This document provides guidelines for managing content on the Evolution Hub website, including blog posts, UI text, and general content.

## Blog Content Guidelines

### Frontmatter Schema

All blog posts must adhere to the following frontmatter schema (validated via Zod in `src/content/config.ts`):

Note: For Contentful-based blog posts, `description` may be missing during migration/relaunch phases; the rendering layer falls back to `excerpt` (first paragraphs) for SEO/RSS/on-page summaries.

#### Required Fields

```yaml
---
title: 'Post Title (5-120 characters)'
description: 'Meta description (20-200 characters)'
pubDate: '2025-01-15'
author: 'Evolution Hub Team' # String or object {name, avatar, bio}
category: 'New Work' # Enum: See categories below
tags: ['Tag1', 'Tag2'] # Min 2 chars, max 10 tags
image:
  src: '/src/content/blog/images/post-image.webp'
  width: 1200
  height: 675 # Aspect Ratio 1.5:1 - 2:1
imageAlt: 'Image description'
---

```text

#### Optional Fields

```yaml
updatedDate: '2025-01-20' # Must be after pubDate
featured: false # Highlight on index page
draft: false # Hide in production build

# Note: Blog index and taxonomy listings are ordered by (updatedDate ?? pubDate) descending.
# If updatedDate is present, it takes precedence for sorting; otherwise pubDate is used.

# Funnel Configuration
ctas:
  - type: 'leadmagnet'
    position: 'top'
    leadMagnet: 'new-work-guide'
    variant: 'subtle'
leadMagnets: ['new-work-guide'] # Max 2

# SEO Override
seo:
  title: 'SEO Title (max 60 chars)'
  description: 'SEO Description (max 160 chars)'
  canonical: 'https://hub-evolution.com/blog/post-slug'
```

### Available Categories

- Webentwicklung

- Design

- Performance

- Sicherheit

- Tutorials

- Neuigkeiten

- Allgemein

- Mentale Gesundheit

- Technologie

- Kommunikation

- Produktivität

- Führung

- Persönliche Entwicklung

- New Work

- Karriere

### Content Best Practices

**Title:**

- 5-120 characters

- Include primary keyword

- Actionable and compelling

**Description:**

- 20-200 characters

- Unique for each post

- Include call-to-action or value proposition

**Tags:**

- Minimum 2 characters each

- Maximum 10 tags per post

- Use existing tags when possible (see tag cloud)

- Lowercase preferred

**Images:**

- Minimum width: 1200px

- Aspect ratio: 1.5:1 to 2:1 (recommended: 1.778:1 - 1200x675)

- Format: WebP preferred, JPEG/PNG acceptable

- Alt-text: Required, descriptive (not "image" or filename)

- File naming: `kebab-case-description.webp`

**Content Structure:**

- Use H2 for main sections

- Use H3 for subsections

- Keep paragraphs concise (max 3-4 sentences)

- Include lists for scanability

- Use bold for emphasis (sparingly)

- Include internal links to related content

### CTA-Funnel Integration

Blog posts can integrate with the conversion funnel through CTAs:

**Automatic Category Mapping:**

- "New Work" → `new-work-guide` Lead Magnet

- "Technologie" → `ki-tools-checkliste` Lead Magnet

- "Produktivität" → `produktivitaets-masterclass` Lead Magnet

**Manual Override via Frontmatter:**

```yaml
ctas:

  - type: 'newsletter'
    position: 'top'
    variant: 'banner'

  - type: 'leadmagnet'
    position: 'bottom'
    leadMagnet: 'custom-lead-magnet-id'
    variant: 'primary'

```text

**CTA Types:**

- `newsletter`: Newsletter sign-up

- `leadmagnet`: Lead magnet download

- `consultation`: Booking/consultation CTA

- `social`: Social share/follow

---

## UI Content Guidelines

### Introduction Text

The introduction text on the index page is available in both German and English. When updating this text, ensure that both language versions are updated accordingly and that the content remains consistent in meaning and length.

### Heading Hierarchy

The website follows a strict heading hierarchy to ensure proper semantic structure and accessibility:

- H1: Page title (defined in the BaseLayout component)

- H2: Main section headings (e.g., "Powerful Features")

- H3: Subsection headings within main sections

- H4-H6: Further subheadings as needed

When adding new content, always use the appropriate heading level to maintain this hierarchy.

### ARIA Labels

All interactive elements (links, buttons, form elements) should have descriptive ARIA labels to improve accessibility for users with assistive technologies. ARIA labels should be concise and clearly describe the purpose or action of the element.

Examples of elements that should have ARIA labels:

- Navigation links

- Call-to-action buttons

- Form submit buttons

- Links to external resources

When adding new interactive elements, ensure they include appropriate ARIA labels.

---

## SEO Guidelines for Blog Posts

**Title Tags:**

- 50-60 characters (avoid truncation)

- Include primary keyword near beginning

- Brand name optional at end

**Meta Descriptions:**

- 150-160 characters

- Include primary keyword naturally

- Compelling call-to-action

- Unique for each post

**Schema.org Markup:**

- BlogPosting type automatically applied

- Author, datePublished, dateModified included

- Image with proper dimensions

**Internal Linking:**

- Link to related posts (3-5 per post)

- Use descriptive anchor text

- Link to relevant tool/landing pages

---

## Weiterführende Ressourcen

- **Blog- & Comment-System Plan**: [docs/features/blog+commentsystem-plan.md](./features/blog+commentsystem-plan.md)

- **SEO-Guidelines**: [docs/seo.md](./seo.md)

- **Frontend-Komponenten**: [docs/frontend/components.md](./frontend/components.md)

```text
