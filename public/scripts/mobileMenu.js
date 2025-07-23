// Mobile menu functionality
document.addEventListener('DOMContentLoaded', () => {
  const mobileMenuButton = document.getElementById('mobile-menu-button');
  const mobileMenu = document.getElementById('mobile-menu');
  const menuItems = mobileMenu?.querySelectorAll('[role="menuitem"]');
  
  if (!mobileMenuButton || !mobileMenu) return;
  
  // Toggle mobile menu
  const toggleMenu = (expanded) => {
    const isExpanded = expanded !== undefined ? expanded : mobileMenuButton.getAttribute('aria-expanded') === 'true';
    mobileMenuButton.setAttribute('aria-expanded', (!isExpanded).toString());
    mobileMenu.classList.toggle('hidden');
    mobileMenu.setAttribute('aria-hidden', isExpanded.toString());
    
    // Toggle body scroll
    document.body.style.overflow = !isExpanded ? 'hidden' : '';
    
    // Focus management
    if (!isExpanded && menuItems?.[0]) {
      setTimeout(() => {
        menuItems[0].focus();
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
  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && mobileMenuButton.getAttribute('aria-expanded') === 'true') {
      e.preventDefault();
      toggleMenu(true);
    }
  };
  document.addEventListener('keydown', handleKeyDown);
  
  // Keyboard navigation within menu
  if (menuItems && menuItems.length > 0) {
    const firstItem = menuItems[0];
    const lastItem = menuItems[menuItems.length - 1];
    
    const handleMenuItemKeyDown = (e) => {
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
    
    menuItems.forEach((item) => {
      item.addEventListener('keydown', handleMenuItemKeyDown);
    });
  }
  
  // Close menu when clicking outside
  const handleClickOutside = (e) => {
    if (!e.target) return;
    
    const target = e.target;
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
        item.removeEventListener('keydown', handleMenuItemKeyDown);
      });
    }
  };
});
