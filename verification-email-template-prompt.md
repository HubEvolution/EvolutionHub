# 🎨 Verifikations-E-Mail-Template für EvolutionHub

Du bist ein spezialisierter E-Mail-Template-Designer für EvolutionHub. Erstelle ein HTML-E-Mail-Template für die **Konto-Verifikation nach Registrierung**, das EXAKT dem bestehenden Design der Plattform entspricht.

## **Design-System (KRITISCH - exakt übernehmen)**

### **Brand-Farben:**
- Primary Gradient: `background: linear-gradient(135deg, #10b981, #06b6d4)` (Emerald zu Cyan)
- Subtle Gradients: `from-emerald-50 to-cyan-50` für Hintergründe
- Accent Colors: `#10b981` (Emerald-500), `#06b6d4` (Cyan-500)
- Text: `#111827` (Gray-900) für Headlines, `#6b7280` (Gray-600) für Body

### **Typography-System:**
- Headlines: `font-size: 1.5rem; font-weight: 700; color: #111827;` (text-2xl font-bold)
- Body Text: `font-size: 0.875rem; color: #6b7280;` (text-sm text-gray-600)
- Mono Text: `font-family: ui-monospace, 'Cascadia Code', monospace; font-size: 0.75rem;`

### **Layout-Pattern:**
- Container: `max-width: 600px; background: white; border-radius: 1rem; padding: 2rem; box-shadow: 0 4px 6px rgba(0,0,0,0.1);`
- Cards: `background: linear-gradient(to right, #ecfdf5, #cffafe); border-radius: 0.5rem; padding: 1.5rem;`
- Buttons: `background: linear-gradient(135deg, #10b981, #06b6d4); border-radius: 0.5rem; padding: 0.75rem 1.5rem; color: white; font-weight: 600;`

### **Icon-System:**
- Success Icons: Runde Container mit Emerald/Cyan-Gradient, weiße SVG-Icons innen
- Checkmarks: `fill="#10b981"` 
- Größen: 4rem für Haupt-Icons, 1rem für Inline-Icons

### **Spacing-System:**
- Sections: `margin-bottom: 1.5rem` (mb-6)
- Elements: `margin-bottom: 1rem` (mb-4)  
- Inline: `margin-bottom: 0.5rem` (mb-2)

## **Template-Spezifikationen**

### **E-Mail-Details:**
- **Zweck:** E-Mail zur Kontoaktivierung nach Registrierung
- **Betreff:** "Konto aktivieren - Willkommen bei EvolutionHub"
- **Call-to-Action:** "🚀 Konto jetzt aktivieren"
- **Gültigkeitshinweis:** "⏰ Wichtig: Dieser Link ist 24 Stunden gültig"

### **Variable Platzhalter:**
- `${userName}` - Name des Benutzers (Fallback: "dort")
- `${request.verificationUrl}` - Aktivierungslink
- `${request.email}` - E-Mail-Adresse des Benutzers

### **Content-Struktur:**
1. **Header** mit EvolutionHub-Logo (Gradient-Text)
2. **Begrüßung** mit userName
3. **Aktivierungsaufforderung** mit prominent CTA-Button
4. **Alternative Link-Darstellung** (monospace, grauer Hintergrund)
5. **24h-Gültigkeitshinweis** mit ⏰-Icon
6. **Benefit-Liste** mit grünen Checkmarks:
   - ✨ Persönliches Dashboard
   - 🚀 Moderne Produktivitäts-Tools
   - 📊 Projektmanagement-Features
   - 💡 New Work-Inspirationen
7. **Footer** mit E-Mail-Adresse, Disclaimer, Copyright

## **Technische Anforderungen**

### **E-Mail-Client-Kompatibilität:**
- Inline CSS für maximale Kompatibilität 
- Fallback für Gradients: `background-color: #10b981;`
- Alt-Texte für alle SVG-Icons
- Progressive Enhancement

### **Responsive Design:**
- Mobile-first mit @media queries für Desktop
- Touch-friendly Button-Größen (min. 44px height)
- Stack-Layout für mobile, side-by-side für Desktop wo sinnvoll

### **Accessibility & Anti-Spam:**
- WCAG 2.1 AA konform
- Authentische Absender-Kennzeichnung
- Dark Mode Support via `@media (prefers-color-scheme: dark)`

## **Integration-Anweisungen**

### **Einfügung in Code:**
- **Datei:** `/src/lib/services/email-service-impl.ts`
- **Methode:** `generateVerificationEmailHTML()`
- **Zeilen:** 243-298 (Ersetze das komplette `return` Statement)

### **Integration-Beispiel:**
```typescript
private generateVerificationEmailHTML(request: EmailVerificationRequest): string {
  const userName = request.userName || 'dort';
  
  return `
[HIER DEIN KOMPLETTES HTML-TEMPLATE EINFÜGEN]
  `;
}
```

## **Output-Format**

Erstelle ein vollständiges HTML-Template:

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Konto aktivieren - EvolutionHub</title>
    <style>
        /* Inline CSS hier */
    </style>
</head>
<body>
    <!-- Template-Inhalt hier -->
</body>
</html>
```

Das Template muss pixel-perfect zum EvolutionHub-Design passen und professionelle Business-E-Mail-Standards erfüllen.
