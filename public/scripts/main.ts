/**
 * Main application scripts
 * Handles smooth scrolling, animations, and dark mode
 */

type HTMLElementWithFor = HTMLElement & { htmlFor?: string };

// Smooth scrolling for anchor links
const initSmoothScrolling = (): void => {
  document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e: Event) => {
      e.preventDefault();
      
      const targetId = anchor.getAttribute('href');
      if (!targetId) return;
      
      const targetElement = document.querySelector(targetId);
      if (!targetElement) return;
      
      targetElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });

      // Update URL without jumping
      if (history.pushState) {
        history.pushState(null, '', targetId);
      } else {
        location.hash = targetId;
      }
    });
  });
};

// Intersection Observer for fade-in animations
const initAnimations = (): void => {
  const observerOptions: IntersectionObserverInit = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-fade-in');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document.querySelectorAll('.fade-in').forEach(element => {
    observer.observe(element);
  });
};

// Dark mode functionality
const initDarkMode = () => {
  const darkModeToggle = document.getElementById('theme-toggle');
  const html = document.documentElement;
  const darkModeIcon = document.getElementById('theme-toggle-moon');
  const lightModeIcon = document.getElementById('theme-toggle-sun');

  // Check for saved user preference, default to dark mode
  const savedMode = localStorage.getItem('darkMode');
  const isDarkMode = savedMode === null ? true : savedMode === 'true';

  // Apply theme based on preference
  const applyTheme = (isDark: boolean) => {
    if (isDark) {
      html.classList.add('dark');
      darkModeIcon?.classList.add('hidden');
      lightModeIcon?.classList.remove('hidden');
    } else {
      html.classList.remove('dark');
      darkModeIcon?.classList.remove('hidden');
      lightModeIcon?.classList.add('hidden');
    }
    localStorage.setItem('darkMode', String(isDark));
  };

  // Toggle between light and dark mode
  const toggleTheme = () => {
    const isDark = !html.classList.contains('dark');
    applyTheme(isDark);
  };

  // Initialize with saved preference or default to dark
  applyTheme(isDarkMode);

  // Set up event listener for the toggle button
  if (darkModeToggle) {
    darkModeToggle.addEventListener('click', toggleTheme);
  }
};

// Initialize everything when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  initSmoothScrolling();
  initAnimations();
  initDarkMode();
});

// Handle HMR for development
if (import.meta.hot) {
  import.meta.hot.accept();
}
