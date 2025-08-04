// Mobile menu functionality
document.addEventListener('DOMContentLoaded', () => {
  const mobileMenuButton = document.getElementById('mobile-menu-button') as HTMLElement;
  const mobileMenu = document.getElementById('mobile-menu') as HTMLElement;
  const menuItems = mobileMenu?.querySelectorAll('[role="menuitem"]');
  
  if (!mobileMenuButton || !mobileMenu) return;
  
  // Toggle mobile menu
  const toggleMenu = (expanded: boolean): void => {
    const isExpanded = expanded !== undefined ? expanded : mobileMenuButton.getAttribute('aria-expanded') === 'true';
    mobileMenuButton.setAttribute('aria-expanded', (!isExpanded).toString());
    mobileMenu.classList.toggle('hidden');
    mobileMenu.setAttribute('aria-hidden', isExpanded.toString());
    
    // Toggle body scroll
    document.body.style.overflow = !isExpanded ? 'hidden' : '';
    
    // Focus management
    if (!isExpanded && menuItems?.[0]) {
      setTimeout(() => {
        (menuItems[0] as HTMLElement).focus();
      }, 0);
    } else if (isExpanded) {
      mobileMenuButton.focus();
    }
  };
  
  // Toggle menu on button click
  mobileMenuButton.addEventListener('click', () => {
    const expanded = mobileMenuButton.getAttribute('aria-expanded') === 'true' || false;
    toggleMenu(expanded);
  });
  
  // Close menu on Escape key
  const handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && mobileMenuButton.getAttribute('aria-expanded') === 'true') {
      e.preventDefault();
      toggleMenu(true);
    }
  };
  document.addEventListener('keydown', handleKeyDown);
  
  // Keyboard navigation within menu
  if (menuItems && menuItems.length > 0) {
    const firstItem = menuItems[0] as HTMLElement;
    const lastItem = menuItems[menuItems.length - 1] as HTMLElement;
    
    const handleMenuItemKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Tab' && document.activeElement) {
        if (e.shiftKey && document.activeElement === firstItem) {
          e.preventDefault();
          lastItem.focus();
        } else if (!e.shiftKey && document.activeElement === lastItem) {
          e.preventDefault();
          firstItem.focus();
        }
      } else if (e.key === 'Escape') {
        toggleMenu(true);
      }
    };
    
    // Store reference to handleMenuItemKeyDown for cleanup
    const menuKeydownHandlers = new Map<Element, EventListener>();
    
    menuItems.forEach((item) => {
      const handler = handleMenuItemKeyDown as EventListener;
      menuKeydownHandlers.set(item, handler);
      item.addEventListener('keydown', handler);
    });
  
    // Close menu when clicking outside
    const handleClickOutside = (e: MouseEvent): void => {
      if (!e.target) return;
      
      const target = e.target as Node;
      const isClickInside = mobileMenuButton.contains(target) || 
                          (mobileMenu && mobileMenu.contains(target));
      
      if (!isClickInside && mobileMenuButton.getAttribute('aria-expanded') === 'true') {
        toggleMenu(true);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    
    // Cleanup function
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('click', handleClickOutside);
      
      if (menuItems) {
        menuItems.forEach(item => {
          const handler = menuKeydownHandlers.get(item);
          if (handler) {
            item.removeEventListener('keydown', handler);
          }
        });
      }
    };
  }
});
