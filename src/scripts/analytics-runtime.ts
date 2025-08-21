// Client-side Analytics Runtime (ESM)
// - Läuft ausschließlich im Browser
// - Initial PageView NUR nach Analytics-Consent
// - Unterstützt SPA-Navigation via astro:page-load
// - Kapselt Scroll-Depth & Time-on-Page Tracking

import {
  initializeAnalytics,
  trackScrollDepth,
  trackTimeOnPage,
} from '@/lib/analytics';

// Lokaler Consent-Status für DSGVO-konformes Verhalten
let hasAnalyticsConsent = false;

// State
let analytics: ReturnType<typeof initializeAnalytics> | null = null;
let timeOnPageStart = Date.now();
let maxScrollDepth = 0;
const scrollDepthTracked = new Set<number>();

// Handler-Referenzen für Cleanup
let consentHandler: ((ev: Event) => void) | null = null;
let scrollHandler: (() => void) | null = null;
let beforeUnloadHandler: (() => void) | null = null;
let visibilityHandler: (() => void) | null = null;

export default function initAnalytics(): void {
  try {
    // Analytics-Manager initialisieren (lädt Provider abhängig von ENV)
    analytics = initializeAnalytics();

    // Consent Listener registrieren (aktiviert Tracking erst nach Zustimmung)
    consentHandler = (event: Event) => {
      // CookieConsent-Event-Schema: CustomEvent<{ analytics?: boolean; marketing?: boolean }>
      const detail = (event as CustomEvent<any>)?.detail || {};
      if (detail.analytics) {
        hasAnalyticsConsent = true;
        // Page View nach Consent
        analytics?.trackPage(document.title, {
          page_type: window.location.pathname.startsWith('/blog') ? 'blog' : 'page',
          consent_given: true,
        });
        // Scroll / Time Tracking erst jetzt aktivieren
        setupScrollTracking();
        setupTimeTracking();
      }

      if (detail.marketing) {
        // Facebook Pixel Consent
        if ('fbq' in window && typeof (window as any).fbq === 'function') {
          (window as any).fbq('consent', 'grant');
          (window as any).fbq('track', 'PageView');
        }
        // LinkedIn Insight Tag
        if ('_linkedin_data_partner_ids' in window) {
          const s = document.createElement('script');
          s.src = 'https://snap.licdn.com/li.lms-analytics/insight.min.js';
          document.head.appendChild(s);
        }
      }
    };
    document.addEventListener('cookieconsent:userpreferencesset', consentHandler as EventListener);

    // SPA-Navigation: PageView nur nach erteiltem Consent
    document.addEventListener('astro:page-load', () => {
      if (hasAnalyticsConsent) {
        analytics?.trackPage(document.title, {
          page_type: window.location.pathname.startsWith('/blog') ? 'blog' : 'page',
          navigation: 'astro:page-load',
        });
        // Page-spezifischen State zurücksetzen
        timeOnPageStart = Date.now();
        maxScrollDepth = 0;
        scrollDepthTracked.clear();
      }
    });

    // Globales Cleanup registrieren (optional von außen aufrufbar)
    (window as any).analyticsCleanup = cleanup;

    console.log('[AnalyticsRuntime] ✅ Initialized');
  } catch (error) {
    console.error('[AnalyticsRuntime] ❌ Failed to initialize:', error);
  }
}

function setupScrollTracking() {
  let throttleTimer: number | null = null;
  scrollHandler = () => {
    if (throttleTimer !== null) return;
    throttleTimer = window.setTimeout(() => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = Math.round((scrollTop / (docHeight || 1)) * 100);

      // Milestones tracken
      [25, 50, 75, 90].forEach((ms) => {
        if (scrollPercent >= ms && !scrollDepthTracked.has(ms)) {
          trackScrollDepth(ms);
          scrollDepthTracked.add(ms);
        }
      });

      maxScrollDepth = Math.max(maxScrollDepth, scrollPercent);
      throttleTimer = null;
    }, 100);
  };
  window.addEventListener('scroll', scrollHandler, { passive: true });
}

function setupTimeTracking() {
  // bevor Seitenwechsel / Tab schließen
  beforeUnloadHandler = () => {
    const timeSpent = Math.round((Date.now() - timeOnPageStart) / 1000);
    if (timeSpent > 10) {
      trackTimeOnPage(timeSpent);
    }
  };
  window.addEventListener('beforeunload', beforeUnloadHandler);

  // Tab-Sichtbarkeit
  visibilityHandler = () => {
    if (document.visibilityState === 'hidden') {
      const timeSpent = Math.round((Date.now() - timeOnPageStart) / 1000);
      if (timeSpent > 30) {
        trackTimeOnPage(timeSpent);
      }
    } else {
      timeOnPageStart = Date.now();
    }
  };
  document.addEventListener('visibilitychange', visibilityHandler);
}

function cleanup() {
  if (consentHandler) {
    document.removeEventListener('cookieconsent:userpreferencesset', consentHandler as EventListener);
    consentHandler = null;
  }
  if (scrollHandler) {
    window.removeEventListener('scroll', scrollHandler);
    scrollHandler = null;
  }
  if (beforeUnloadHandler) {
    window.removeEventListener('beforeunload', beforeUnloadHandler);
    beforeUnloadHandler = null;
  }
  if (visibilityHandler) {
    document.removeEventListener('visibilitychange', visibilityHandler);
    visibilityHandler = null;
  }
  console.log('[AnalyticsRuntime] 🧹 Cleaned up');
}
