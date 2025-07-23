import { defineCollection, z } from 'astro:content';
import { format } from 'date-fns';
import { de } from 'date-fns/locale/index.js';

// Hilfsfunktion zur Validierung von Datumsangaben
const dateSchema = z.preprocess((arg) => {
  if (typeof arg === 'string' || arg instanceof Date) return new Date(arg);
  return undefined;
}, z.date());

// Autoren-Definition
const authorSchema = z.union([
  z.string(),
  z.object({
    name: z.string().min(2, 'Name muss mindestens 2 Zeichen lang sein'),
    avatar: z.string().url('Muss eine gültige URL sein').optional(),
    bio: z.string().optional(),
    twitter: z.string().startsWith('@').optional()
  })
]).transform(val => {
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
  'Karriere'
] as const;

// Blog-Collection definieren
export const blogCollection = defineCollection({
  type: 'content',
  schema: ({ image }) => z.object({
    // Erforderliche Felder
    title: z.string()
      .min(5, 'Titel muss mindestens 5 Zeichen lang sein')
      .max(120, 'Titel darf maximal 120 Zeichen lang sein'),
      
    description: z.string()
      .min(20, 'Beschreibung muss mindestens 20 Zeichen lang sein')
      .max(200, 'Beschreibung darf maximal 200 Zeichen lang sein'),
    
    // Datumsangaben
    pubDate: dateSchema
      .refine((date) => date <= new Date(), {
        message: 'Veröffentlichungsdatum darf nicht in der Zukunft liegen'
      }),
      
    updatedDate: dateSchema
      .optional()
      .refine((date, ctx) => {
        if (!date) return true;
        return date >= ctx.parent.pubDate;
      }, 'Aktualisierungsdatum muss nach dem Veröffentlichungsdatum liegen'),
    
    // Autor-Informationen
    author: authorSchema.default('EvolutionHub Team'),
    
    // Status-Flags
    draft: z.boolean().default(false),
    featured: z.boolean().default(false),
    
    // Kategorien & Tags
    category: z.enum(categories).default('Allgemein'),
    tags: z.array(
      z.string().min(2, 'Jedes Tag muss mindestens 2 Zeichen lang sein')
    ).max(10, 'Maximal 10 Tags erlaubt').default([]),
    
    // Medien
    image: image()
      .refine((img) => img.width >= 1200, {
        message: 'Bild muss mindestens 1200px breit sein'
      })
      .refine((img) => img.width / img.height >= 1.5 && img.width / img.height <= 2, {
        message: 'Bildseitenverhältnis sollte zwischen 1.5:1 und 2:1 liegen'
      })
      .optional(),
      
    imageAlt: z.string()
      .max(200, 'Alt-Text darf maximal 200 Zeichen lang sein')
      .optional(),
    
    // SEO
    seo: z.object({
      title: z.string()
        .max(60, 'SEO-Titel darf maximal 60 Zeichen lang sein')
        .optional(),
      description: z.string()
        .max(160, 'SEO-Beschreibung darf maximal 160 Zeichen lang sein')
        .optional(),
      canonical: z.string()
        .url('Muss eine gültige URL sein')
        .optional(),
      noindex: z.boolean().default(false)
    }).optional(),
    
    // Lesedauer (wird automatisch berechnet)
    readingTime: z.object({
      text: z.string(),
      minutes: z.number().min(0),
      time: z.number().min(0),
      words: z.number().min(0)
    }).optional(),
    
    // Benutzerdefinierte Felder
    custom: z.record(z.any()).optional()
  })
  .refine(
    (data) => {
      if (data.image && !data.imageAlt) {
        return false;
      }
      return true;
    },
    {
      message: 'Bild-Alt-Text ist erforderlich, wenn ein Bild angegeben ist',
      path: ['imageAlt']
    }
  )
});

// Exportiere die Collections
export const collections = {
  blog: blogCollection,
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
    .replace(/\s+/g, '-')       // Ersetze Leerzeichen durch Bindestriche
    .replace(/--+/g, '-')       // Entferne doppelte Bindestriche
    .trim();
}
