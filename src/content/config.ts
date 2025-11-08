import { defineCollection, z } from 'astro:content';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

// Hilfsfunktion zur Validierung von Datumsangaben
const dateSchema = z.preprocess((arg) => {
  if (typeof arg === 'string' || arg instanceof Date) return new Date(arg);
  return undefined;
}, z.date());

// Autoren-Definition
const authorSchema = z
  .union([
    z.string(),
    z.object({
      name: z.string().min(2, 'Name muss mindestens 2 Zeichen lang sein'),
      avatar: z.string().url('Muss eine gültige URL sein').optional(),
      bio: z.string().optional(),
      twitter: z.string().startsWith('@').optional(),
    }),
  ])
  .transform((val) => {
    if (typeof val === 'string') {
      return { name: val };
    }
    return val;
  });

// Kategorien für Blog-Posts
const categories = [
  'Webentwicklung',
  'Design',
  'Performance',
  'Sicherheit',
  'Tutorials',
  'Neuigkeiten',
  'Allgemein',
  'Mentale Gesundheit',
  'Technologie',
  'Kommunikation',
  'Produktivität',
  'Führung',
  'Persönliche Entwicklung',
  'New Work',
  'Karriere',
] as const;

// Exportiere die Collections
// Testimonials collection (PR5)
export const testimonialsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    tools: z.array(z.string()).min(1),
    lang: z.enum(['en', 'de']),
    author: z.string().min(2),
    role: z.string().min(2),
    quote: z.string().min(12),
    company: z.string().optional(),
    weight: z.number().min(0).max(100).default(50).optional(),
    featured: z.boolean().default(false).optional(),
  }),
});

export const collections = {
  testimonials: testimonialsCollection,
};

// Hilfsfunktion zum Formatieren von Datumsangaben
export function formatDate(date: Date, formatStr = 'PPP', locale = de) {
  return format(date, formatStr, { locale });
}

// Hilfsfunktion zum Generieren einer lesbaren URL
// Diese Funktion kann später in den Blog-Utilities verwendet werden
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Entferne Sonderzeichen
    .replace(/\s+/g, '-') // Ersetze Leerzeichen durch Bindestriche
    .replace(/--+/g, '-') // Entferne doppelte Bindestriche
    .trim();
}
