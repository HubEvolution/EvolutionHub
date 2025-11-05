"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.collections = exports.testimonialsCollection = exports.blogCollection = void 0;
exports.formatDate = formatDate;
exports.generateSlug = generateSlug;
const astro_content_1 = require("astro:content");
const date_fns_1 = require("date-fns");
const locale_1 = require("date-fns/locale");
const remark_demote_h1_1 = require("../../scripts/remark/remark-demote-h1");
// Hilfsfunktion zur Validierung von Datumsangaben
const dateSchema = astro_content_1.z.preprocess((arg) => {
    if (typeof arg === 'string' || arg instanceof Date)
        return new Date(arg);
    return undefined;
}, astro_content_1.z.date());
// Autoren-Definition
const authorSchema = astro_content_1.z
    .union([
    astro_content_1.z.string(),
    astro_content_1.z.object({
        name: astro_content_1.z.string().min(2, 'Name muss mindestens 2 Zeichen lang sein'),
        avatar: astro_content_1.z.string().url('Muss eine gültige URL sein').optional(),
        bio: astro_content_1.z.string().optional(),
        twitter: astro_content_1.z.string().startsWith('@').optional(),
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
];
// Blog-Collection definieren
exports.blogCollection = (0, astro_content_1.defineCollection)({
    type: 'content',
    schema: ({ image }) => astro_content_1.z
        .object({
        // Erforderliche Felder
        title: astro_content_1.z
            .string()
            .min(5, 'Titel muss mindestens 5 Zeichen lang sein')
            .max(120, 'Titel darf maximal 120 Zeichen lang sein'),
        description: astro_content_1.z
            .string()
            .min(20, 'Beschreibung muss mindestens 20 Zeichen lang sein')
            .max(200, 'Beschreibung darf maximal 200 Zeichen lang sein'),
        // Datumsangaben
        pubDate: dateSchema.refine((date) => date <= new Date(), {
            message: 'Veröffentlichungsdatum darf nicht in der Zukunft liegen',
        }),
        updatedDate: dateSchema.optional().superRefine((date, ctx) => {
            const parent = ctx;
            const pub = parent.parent?.pubDate;
            if (date && pub && date < pub) {
                ctx.addIssue({
                    code: astro_content_1.z.ZodIssueCode.custom,
                    message: 'Aktualisierungsdatum muss nach dem Veröffentlichungsdatum liegen',
                });
            }
        }),
        // Autor-Informationen
        author: authorSchema.default('EvolutionHub Team'),
        // Status-Flags
        draft: astro_content_1.z.boolean().default(false),
        featured: astro_content_1.z.boolean().default(false),
        // Kategorien & Tags
        category: astro_content_1.z.enum(categories).default('Allgemein'),
        tags: astro_content_1.z
            .array(astro_content_1.z.string().min(2, 'Jedes Tag muss mindestens 2 Zeichen lang sein'))
            .max(10, 'Maximal 10 Tags erlaubt')
            .default([]),
        // Medien (Akzeptiere alle Dimensionen; UI/CI prüft Qualität separat)
        image: image().optional(),
        imageAlt: astro_content_1.z.string().max(200, 'Alt-Text darf maximal 200 Zeichen lang sein').optional(),
        // SEO
        seo: astro_content_1.z
            .object({
            title: astro_content_1.z.string().max(60, 'SEO-Titel darf maximal 60 Zeichen lang sein').optional(),
            description: astro_content_1.z
                .string()
                .max(160, 'SEO-Beschreibung darf maximal 160 Zeichen lang sein')
                .optional(),
            canonical: astro_content_1.z.string().url('Muss eine gültige URL sein').optional(),
            noindex: astro_content_1.z.boolean().default(false),
        })
            .optional(),
        // Lesedauer (wird automatisch berechnet)
        readingTime: astro_content_1.z
            .object({
            text: astro_content_1.z.string(),
            minutes: astro_content_1.z.number().min(0),
            time: astro_content_1.z.number().min(0),
            words: astro_content_1.z.number().min(0),
        })
            .optional(),
        // CTA-Konfiguration für Funnel-Integration
        ctas: astro_content_1.z
            .array(astro_content_1.z.object({
            type: astro_content_1.z.enum(['newsletter', 'leadmagnet', 'consultation', 'social']),
            position: astro_content_1.z.enum(['top', 'middle', 'bottom']),
            leadMagnet: astro_content_1.z.string().optional(),
            variant: astro_content_1.z.enum(['primary', 'secondary', 'subtle']).default('primary'),
            title: astro_content_1.z.string().optional(),
            description: astro_content_1.z.string().optional(),
            customText: astro_content_1.z.string().optional(),
        }))
            .max(3, 'Maximal 3 CTAs pro Artikel erlaubt')
            .default([]),
        // Lead-Magnet-Zuordnungen
        leadMagnets: astro_content_1.z
            .array(astro_content_1.z.string().refine((id) => {
            const validLeadMagnets = [
                'new-work-guide',
                'ki-tools-checkliste',
                'produktivitaets-masterclass',
            ];
            return validLeadMagnets.includes(id);
        }, 'Ungültige Lead-Magnet-ID'))
            .max(2, 'Maximal 2 Lead-Magneten pro Artikel')
            .default([]),
        // Funnel-Konfiguration
        funnel: astro_content_1.z
            .object({
            stage: astro_content_1.z.enum(['awareness', 'consideration', 'decision']).default('awareness'),
            priority: astro_content_1.z.number().min(1).max(10).default(5),
            targetAudience: astro_content_1.z.array(astro_content_1.z.string()).default([]),
            conversionGoal: astro_content_1.z.enum(['newsletter', 'lead', 'consultation', 'social']).optional(),
        })
            .optional(),
        // Erweiterte SEO für Funnel-Optimierung
        funnelSeo: astro_content_1.z
            .object({
            intent: astro_content_1.z
                .enum(['informational', 'commercial', 'transactional'])
                .default('informational'),
            competitiveness: astro_content_1.z.enum(['low', 'medium', 'high']).default('medium'),
            primaryKeyword: astro_content_1.z.string().optional(),
            secondaryKeywords: astro_content_1.z.array(astro_content_1.z.string()).max(5).default([]),
            searchVolume: astro_content_1.z.number().min(0).optional(),
        })
            .optional(),
        // Benutzerdefinierte Felder
        custom: astro_content_1.z.record(astro_content_1.z.unknown()).optional(),
    })
        .refine((data) => {
        if (data.image && !data.imageAlt) {
            return false;
        }
        return true;
    }, {
        message: 'Bild-Alt-Text ist erforderlich, wenn ein Bild angegeben ist',
        path: ['imageAlt'],
    }),
    remarkPlugins: [remark_demote_h1_1.remarkDemoteH1],
});
// Exportiere die Collections
// Testimonials collection (PR5)
exports.testimonialsCollection = (0, astro_content_1.defineCollection)({
    type: 'content',
    schema: astro_content_1.z.object({
        tools: astro_content_1.z.array(astro_content_1.z.string()).min(1),
        lang: astro_content_1.z.enum(['en', 'de']),
        author: astro_content_1.z.string().min(2),
        role: astro_content_1.z.string().min(2),
        quote: astro_content_1.z.string().min(12),
        company: astro_content_1.z.string().optional(),
        weight: astro_content_1.z.number().min(0).max(100).default(50).optional(),
        featured: astro_content_1.z.boolean().default(false).optional(),
    }),
});
exports.collections = {
    blog: exports.blogCollection,
    testimonials: exports.testimonialsCollection,
};
// Hilfsfunktion zum Formatieren von Datumsangaben
function formatDate(date, formatStr = 'PPP', locale = locale_1.de) {
    return (0, date_fns_1.format)(date, formatStr, { locale });
}
// Hilfsfunktion zum Generieren einer lesbaren URL
// Diese Funktion kann später in den Blog-Utilities verwendet werden
function generateSlug(text) {
    return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '') // Entferne Sonderzeichen
        .replace(/\s+/g, '-') // Ersetze Leerzeichen durch Bindestriche
        .replace(/--+/g, '-') // Entferne doppelte Bindestriche
        .trim();
}
