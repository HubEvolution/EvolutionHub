export function runTypewriter(elementId, textsProvider, delay = 100) {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with ID "${elementId}" not found.`);
    return;
  }

  let textArray = [];
  let currentIndex = 0;
  let charIndex = 0;
  let typingTimeout;

  const type = () => {
    if (currentIndex < textArray.length) {
      const currentText = textArray[currentIndex].text;
      if (charIndex < currentText.length) {
        element.textContent += currentText.charAt(charIndex);
        charIndex++;
        typingTimeout = setTimeout(type, delay);
      } else {
        // Nach dem Tippen eines Textes eine Weile warten, bevor gelöscht wird
        setTimeout(erase, textArray[currentIndex].delay || delay * 5);
      }
    }
  };

  const erase = () => {
    if (charIndex > 0) {
      element.textContent = element.textContent.slice(0, -1);
      charIndex--;
      typingTimeout = setTimeout(erase, delay / 2);
    } else {
      // Nach dem Löschen zum nächsten Text wechseln
      currentIndex++;
      if (currentIndex >= textArray.length) {
        currentIndex = 0; // Zurück zum Anfang springen
      }
      const nextDelay = textArray[currentIndex].delay || delay;
      typingTimeout = setTimeout(type, nextDelay);
    }
  };

  // Bereitet die Textdaten vor, die entweder Strings oder Übersetzungsschlüssel sind.
  // Wenn Texte als Funktion übergeben werden, wird diese aufgerufen, um die tatsächlichen Texte zu erhalten.
  const prepareTextArray = async (provider) => {
    let resolvedTexts = [];
    try {
      // Wir erwarten, dass provider eine Funktion ist, die ein Array von Strings zurückgibt
      resolvedTexts = await provider();
    } catch (error) {
      console.error('Error providing text for typewriter:', error);
      resolvedTexts = [{ text: 'Error loading text', delay }];
    }

    textArray = resolvedTexts.map((item) => {
      if (typeof item === 'string') {
        return { text: item, delay };
      } else if (typeof item === 'object' && item !== null) {
        return { text: item.text || '', delay: item.delay || delay };
      }
      return { text: '', delay }; // Fallback für unerwartete Einträge
    });

    if (textArray.length === 0) {
      textArray = [{ text: 'No text provided', delay }];
    }
    type(); // Start typing after preparing the array
  };

  // Übergabe der Textquelle (kann eine Funktion sein)
  prepareTextArray(textsProvider);
}
