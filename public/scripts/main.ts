import AOS from 'aos';
import toastr from 'toastr';

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

// Dark mode functionality
const initDarkMode = () => {
  const darkModeToggle = document.querySelector('.theme-toggle');
  console.log('Theme toggle button:', darkModeToggle);
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

// Initialize libraries
const initLibraries = () => {
  // Initialize AOS
  AOS.init({
    once: true,
    duration: 700,
  });

  // Configure Toastr
  toastr.options = {
    "closeButton": true,
    "progressBar": true,
    "positionClass": "toast-bottom-right",
  };
};

// Initialize everything when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  initSmoothScrolling();
  initDarkMode();
  initLibraries();
});

// Handle HMR for development
if (import.meta.hot) {
  import.meta.hot.accept();
}
