# Typewriter-Animation

## Übersicht

Die Typewriter-Animation ist eine benutzerdefinierte Animation, die auf der Startseite verwendet wird, um die Hauptüberschrift dynamisch anzuzeigen. Sie simuliert den Effekt einer Schreibmaschine, bei der der Text Zeichen für Zeichen eingeblendet wird.

## Implementierung

Die Animation besteht aus drei Hauptkomponenten:

1. **HTML-Struktur**: Ein `<span>`-Element mit der ID `typewriter` innerhalb eines `<h1>`-Elements.
2. **CSS-Animation**: Keyframe-Animationen für das Schreiben und das Blinken des Cursors.
3. **JavaScript-Logik**: Vanilla-JS-Funktion, die den Text rotiert und die Animation steuert.

## Verwendung

Die Animation wird auf der Startseite (`src/pages/index.astro`) initialisiert:

```javascript
runTypewriter('typewriter', ['Build the Future with AI-Powered Tools', 'Entwickle die Zukunft mit KI-gestützten Tools'], 100);
```

## Parameter

- `elementId`: Die ID des HTML-Elements, auf das die Animation angewendet wird
- `texts`: Ein Array von Texten, durch die rotiert wird
- `speed`: Die Geschwindigkeit der Animation in Millisekunden

## Barrierefreiheit

Die Animation respektiert die `prefers-reduced-motion`-Einstellung des Browsers. Wenn diese aktiviert ist, wird die Animation deaktiviert und der Text statisch angezeigt.

## Hinzufügen neuer Texte

Um neue Texte zur Rotation hinzuzufügen, fügen Sie sie einfach zum Array im `runTypewriter`-Aufruf hinzu:

```javascript
runTypewriter('typewriter', [
  'Erster Text',
  'Zweiter Text',
  'Neuer Text'
], 100);