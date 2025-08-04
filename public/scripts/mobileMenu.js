// Mobile menu functionality
document.addEventListener('DOMContentLoaded', function () {
    var mobileMenuButton = document.getElementById('mobile-menu-button');
    var mobileMenu = document.getElementById('mobile-menu');
    var menuItems = mobileMenu === null || mobileMenu === void 0 ? void 0 : mobileMenu.querySelectorAll('[role="menuitem"]');
    if (!mobileMenuButton || !mobileMenu)
        return;
    // Toggle mobile menu
    var toggleMenu = function (expanded) {
        var isExpanded = expanded !== undefined ? expanded : mobileMenuButton.getAttribute('aria-expanded') === 'true';
        mobileMenuButton.setAttribute('aria-expanded', (!isExpanded).toString());
        mobileMenu.classList.toggle('hidden');
        mobileMenu.setAttribute('aria-hidden', isExpanded.toString());
        // Toggle body scroll
        document.body.style.overflow = !isExpanded ? 'hidden' : '';
        // Focus management
        if (!isExpanded && (menuItems === null || menuItems === void 0 ? void 0 : menuItems[0])) {
            setTimeout(function () {
                menuItems[0].focus();
            }, 0);
        }
        else if (isExpanded) {
            mobileMenuButton.focus();
        }
    };
    // Toggle menu on button click
    mobileMenuButton.addEventListener('click', function () {
        var expanded = mobileMenuButton.getAttribute('aria-expanded') === 'true' || false;
        toggleMenu(expanded);
    });
    // Close menu on Escape key
    var handleKeyDown = function (e) {
        if (e.key === 'Escape' && mobileMenuButton.getAttribute('aria-expanded') === 'true') {
            e.preventDefault();
            toggleMenu(true);
        }
    };
    document.addEventListener('keydown', handleKeyDown);
    // Keyboard navigation within menu
    if (menuItems && menuItems.length > 0) {
        var firstItem_1 = menuItems[0];
        var lastItem_1 = menuItems[menuItems.length - 1];
        var handleMenuItemKeyDown_1 = function (e) {
            if (e.key === 'Tab' && document.activeElement) {
                if (e.shiftKey && document.activeElement === firstItem_1) {
                    e.preventDefault();
                    lastItem_1.focus();
                }
                else if (!e.shiftKey && document.activeElement === lastItem_1) {
                    e.preventDefault();
                    firstItem_1.focus();
                }
            }
            else if (e.key === 'Escape') {
                toggleMenu(true);
            }
        };
        // Store reference to handleMenuItemKeyDown for cleanup
        var menuKeydownHandlers_1 = new Map();
        menuItems.forEach(function (item) {
            var handler = handleMenuItemKeyDown_1;
            menuKeydownHandlers_1.set(item, handler);
            item.addEventListener('keydown', handler);
        });
        // Close menu when clicking outside
        var handleClickOutside_1 = function (e) {
            if (!e.target)
                return;
            var target = e.target;
            var isClickInside = mobileMenuButton.contains(target) ||
                (mobileMenu && mobileMenu.contains(target));
            if (!isClickInside && mobileMenuButton.getAttribute('aria-expanded') === 'true') {
                toggleMenu(true);
            }
        };
        document.addEventListener('click', handleClickOutside_1);
        // Cleanup function
        return function () {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('click', handleClickOutside_1);
            if (menuItems) {
                menuItems.forEach(function (item) {
                    var handler = menuKeydownHandlers_1.get(item);
                    if (handler) {
                        item.removeEventListener('keydown', handler);
                    }
                });
            }
        };
    }
});
