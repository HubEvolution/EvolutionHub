/**
 * Typewriter animation function
 * @param elementId - The ID of the element to apply the typewriter effect to
 * @param texts - Array of texts to rotate through
 * @param speed - Speed of typing in milliseconds
 */
export function runTypewriter(elementId: string, texts: string[], speed: number): void {
  const elMaybe = document.getElementById(elementId);
  if (!(elMaybe instanceof HTMLElement)) return;
  const el: HTMLElement = elMaybe;

  let textIndex = 0;
  let charIndex = 0;
  let isDeleting = false;

  function type(): void {
    const currentText = texts[textIndex];

    if (isDeleting) {
      // Remove characters
      el.textContent = currentText.substring(0, charIndex - 1);
      charIndex--;
    } else {
      // Add characters
      el.textContent = currentText.substring(0, charIndex + 1);
      charIndex++;
    }

    // Set element class for CSS animation
    el.className = 'typewriter';

    // Check if word is complete
    if (!isDeleting && charIndex === currentText.length) {
      // Word is complete, pause before deleting
      isDeleting = true;
      setTimeout(type, 1500); // Pause before deleting
    } else if (isDeleting && charIndex === 0) {
      // Word is deleted, move to next word
      isDeleting = false;
      textIndex = (textIndex + 1) % texts.length;
      setTimeout(type, 500); // Pause before typing next word
    } else {
      // Continue typing or deleting
      setTimeout(type, speed);
    }
  }

  // Respect prefers-reduced-motion
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (mediaQuery.matches) {
    // Show all texts without animation
    el.textContent = texts[0];
    el.className = '';
    return;
  }

  // Start the typewriter effect
  type();
}
