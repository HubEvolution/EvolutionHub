"use strict";
/**
 * Orchestrate Entrance - WAAPI + IntersectionObserver
 *
 * Features:
 * - Web Animations API (WAAPI) for smooth entrance animations
 * - IntersectionObserver for lazy animation triggering
 * - Stagger support via data-stagger attribute
 * - Respects prefers-reduced-motion (instant appearance)
 * - Performance-optimized: only transform/opacity
 *
 * Usage:
 * <div data-animate>Fades in when visible</div>
 * <div data-animate data-stagger="100">Fades in with 100ms delay</div>
 * <script src="@/scripts/orchestrate-entrance.ts"></script>
 */
Object.defineProperty(exports, "__esModule", { value: true });
class EntranceOrchestrator {
    constructor() {
        this.observer = null;
        this.prefersReducedMotion = false;
        this.animatedElements = new Set();
        // Default animation configuration
        this.DEFAULT_CONFIG = {
            duration: 600,
            easing: 'cubic-bezier(0.4, 0, 0.2, 1)', // ease-out
            fill: 'both',
        };
        // Animation keyframes
        this.FADE_IN_UP = [
            {
                opacity: '0',
                transform: 'translateY(20px)',
            },
            {
                opacity: '1',
                transform: 'translateY(0)',
            },
        ];
        // Check for reduced motion preference
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        this.prefersReducedMotion = mediaQuery.matches;
        // Listen for changes to reduced motion preference
        mediaQuery.addEventListener('change', (event) => {
            this.prefersReducedMotion = event.matches;
        });
        this.init();
    }
    init() {
        if (this.prefersReducedMotion) {
            // Immediately show all elements with data-animate
            this.showAllInstantly();
            return;
        }
        this.setupObserver();
        this.observeElements();
    }
    setupObserver() {
        if (typeof IntersectionObserver === 'undefined') {
            this.showAllInstantly();
            return;
        }
        this.observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting && !this.animatedElements.has(entry.target)) {
                    this.animateElement(entry.target);
                }
            });
        }, {
            threshold: 0.1, // Trigger when 10% of element is visible
            rootMargin: '0px 0px -50px 0px', // Trigger slightly before element enters viewport
        });
    }
    observeElements() {
        const elements = document.querySelectorAll('[data-animate]');
        elements.forEach((element) => {
            // Set initial state (hidden)
            if (element instanceof HTMLElement) {
                element.style.opacity = '0';
                element.style.transform = 'translateY(20px)';
            }
            this.observer?.observe(element);
        });
    }
    animateElement(element) {
        if (!(element instanceof HTMLElement))
            return;
        // Mark as animated to prevent re-animation
        this.animatedElements.add(element);
        // Get stagger delay from data attribute
        const staggerDelay = parseInt(element.dataset.stagger || '0', 10);
        // Get custom duration from data attribute (optional)
        const customDuration = parseInt(element.dataset.animateDuration || '0', 10);
        const duration = customDuration || this.DEFAULT_CONFIG.duration;
        // Apply animation after stagger delay
        setTimeout(() => {
            const animation = element.animate(this.FADE_IN_UP, {
                duration,
                easing: this.DEFAULT_CONFIG.easing,
                fill: this.DEFAULT_CONFIG.fill,
            });
            // Cleanup inline styles after animation completes
            animation.onfinish = () => {
                element.style.opacity = '';
                element.style.transform = '';
            };
        }, staggerDelay);
    }
    showAllInstantly() {
        const elements = document.querySelectorAll('[data-animate]');
        elements.forEach((element) => {
            if (element instanceof HTMLElement) {
                // Immediately show element (no animation)
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
            }
        });
    }
    destroy() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        this.animatedElements.clear();
    }
    refresh() {
        // Re-observe new elements that were added dynamically
        if (this.prefersReducedMotion) {
            this.showAllInstantly();
            return;
        }
        const elements = document.querySelectorAll('[data-animate]');
        elements.forEach((element) => {
            if (!this.animatedElements.has(element)) {
                if (element instanceof HTMLElement) {
                    element.style.opacity = '0';
                    element.style.transform = 'translateY(20px)';
                }
                this.observer?.observe(element);
            }
        });
    }
}
// Auto-initialize when DOM is ready
if (typeof window !== 'undefined') {
    let orchestrator = null;
    const init = () => {
        orchestrator = new EntranceOrchestrator();
        // Expose refresh method globally for dynamic content
        window.__entranceOrchestrator = orchestrator;
    };
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    }
    else {
        init();
    }
    // Re-initialize after Astro view transitions (if using)
    document.addEventListener('astro:after-swap', () => {
        orchestrator?.destroy();
        init();
    });
}
exports.default = EntranceOrchestrator;
