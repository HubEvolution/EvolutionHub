// Analytics Utility für Funnel-Tracking und Conversion-Optimierung
interface AnalyticsEvent {
  event: string;
  event_category?: string;
  event_label?: string;
  value?: number;
  custom_parameters?: Record<string, any>;
}

interface FunnelEvent extends AnalyticsEvent {
  funnel_stage: 'awareness' | 'consideration' | 'decision';
  lead_magnet_id?: string;
  article_slug?: string;
  cta_type?: string;
  user_segment?: string;
}

interface ConversionEvent extends AnalyticsEvent {
  conversion_type: 'newsletter_signup' | 'lead_magnet_download' | 'consultation_request';
  lead_id?: string;
  lead_value?: number;
  attribution_source?: string;
}

// Analytics-Provider-Interface
interface AnalyticsProvider {
  name: string;
  initialized: boolean;
  track: (event: AnalyticsEvent) => void;
  identify: (userId: string, traits?: Record<string, any>) => void;
  page: (pageName?: string, properties?: Record<string, any>) => void;
}

// Google Analytics 4 Provider
class GoogleAnalyticsProvider implements AnalyticsProvider {
  name = 'Google Analytics';
  initialized = false;

  constructor(private measurementId: string) {
    this.initialize();
  }

  private initialize() {
    if (typeof window !== 'undefined' && this.measurementId) {
      // GA4 Script laden
      const script1 = document.createElement('script');
      script1.async = true;
      script1.src = `https://www.googletagmanager.com/gtag/js?id=${this.measurementId}`;
      document.head.appendChild(script1);

      // GA4 konfigurieren
      const script2 = document.createElement('script');
      script2.innerHTML = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${this.measurementId}', {
          page_title: document.title,
          page_location: window.location.href
        });
      `;
      document.head.appendChild(script2);

      this.initialized = true;
      console.log('✅ Google Analytics initialized:', this.measurementId);
    }
  }

  track(event: AnalyticsEvent) {
    if (typeof (window as any).gtag !== 'undefined') {
      (window as any).gtag('event', event.event, {
        event_category: event.event_category,
        event_label: event.event_label,
        value: event.value,
        ...event.custom_parameters
      });
    }
  }

  identify(userId: string, traits?: Record<string, any>) {
    if (typeof (window as any).gtag !== 'undefined') {
      (window as any).gtag('config', this.measurementId, {
        user_id: userId,
        custom_map: traits
      });
    }
  }

  page(pageName?: string, properties?: Record<string, any>) {
    if (typeof (window as any).gtag !== 'undefined') {
      (window as any).gtag('event', 'page_view', {
        page_title: pageName || document.title,
        page_location: window.location.href,
        ...properties
      });
    }
  }
}

// Plausible Analytics Provider (Privacy-friendly Alternative)
class PlausibleProvider implements AnalyticsProvider {
  name = 'Plausible';
  initialized = false;

  constructor(private domain: string) {
    this.initialize();
  }

  private initialize() {
    if (typeof window !== 'undefined' && this.domain) {
      const script = document.createElement('script');
      script.defer = true;
      script.setAttribute('data-domain', this.domain);
      script.src = 'https://plausible.io/js/script.js';
      document.head.appendChild(script);

      this.initialized = true;
      console.log('✅ Plausible Analytics initialized:', this.domain);
    }
  }

  track(event: AnalyticsEvent) {
    if (typeof window !== 'undefined' && (window as any).plausible) {
      (window as any).plausible(event.event, {
        props: {
          category: event.event_category,
          label: event.event_label,
          value: event.value,
          ...event.custom_parameters
        }
      });
    }
  }

  identify(userId: string, traits?: Record<string, any>) {
    // Plausible doesn't support user identification by default
    console.log('Plausible user identified:', { userId, traits });
  }

  page(_pageName?: string, properties?: Record<string, any>) {
    // Plausible automatically tracks page views
    if (properties && Object.keys(properties).length > 0) {
      this.track({
        event: 'pageview',
        custom_parameters: properties
      });
    }
  }
}

// Main Analytics Manager
class AnalyticsManager {
  private providers: AnalyticsProvider[] = [];
  private isInitialized = false;
  private cookieConsent = false;

  constructor() {
    this.initializeFromEnvironment();
    this.setupCookieConsentListener();
  }

  private initializeFromEnvironment() {
    if (typeof window === 'undefined') return;

    // Environment Variables auslesen
    const gaId = import.meta.env.PUBLIC_GA_MEASUREMENT_ID;
    const plausibleDomain = import.meta.env.PUBLIC_PLAUSIBLE_DOMAIN;

    // Provider initialisieren basierend auf verfügbaren Credentials
    if (gaId) {
      this.providers.push(new GoogleAnalyticsProvider(gaId));
    }

    if (plausibleDomain) {
      this.providers.push(new PlausibleProvider(plausibleDomain));
    }

    this.isInitialized = true;
    console.log(`🔍 Analytics Manager initialized with ${this.providers.length} providers`);
  }

  private setupCookieConsentListener() {
    if (typeof window !== 'undefined') {
      // Cookie Consent Event Listener
      document.addEventListener('cookieconsent:userpreferencesset', (event: any) => {
        this.cookieConsent = event.detail?.analytics || false;
        console.log('🍪 Cookie consent updated:', { analytics: this.cookieConsent });
      });
    }
  }

  // Event-Tracking mit Consent-Check
  track(event: AnalyticsEvent) {
    if (!this.cookieConsent || !this.isInitialized) {
      console.log('📊 Analytics blocked (no consent):', event);
      return;
    }

    this.providers.forEach(provider => {
      try {
        provider.track(event);
      } catch (error) {
        console.error(`Analytics error (${provider.name}):`, error);
      }
    });

    // Development-Logging
    console.log('📊 Analytics Event:', event);
  }

  // Funnel-spezifische Events
  trackFunnelEvent(event: FunnelEvent) {
    this.track({
      ...event,
      event_category: 'Funnel',
      custom_parameters: {
        funnel_stage: event.funnel_stage,
        lead_magnet_id: event.lead_magnet_id,
        article_slug: event.article_slug,
        cta_type: event.cta_type,
        user_segment: event.user_segment,
        ...event.custom_parameters
      }
    });
  }

  // Conversion-Events
  trackConversion(event: ConversionEvent) {
    this.track({
      ...event,
      event_category: 'Conversion',
      custom_parameters: {
        conversion_type: event.conversion_type,
        lead_id: event.lead_id,
        lead_value: event.lead_value,
        attribution_source: event.attribution_source,
        ...event.custom_parameters
      }
    });
  }

  // Page-Tracking
  trackPage(pageName?: string, properties?: Record<string, any>) {
    if (!this.cookieConsent || !this.isInitialized) return;

    this.providers.forEach(provider => {
      try {
        provider.page(pageName, properties);
      } catch (error) {
        console.error(`Page tracking error (${provider.name}):`, error);
      }
    });
  }

  // User-Identification
  identify(userId: string, traits?: Record<string, any>) {
    if (!this.cookieConsent || !this.isInitialized) return;

    this.providers.forEach(provider => {
      try {
        provider.identify(userId, traits);
      } catch (error) {
        console.error(`User identification error (${provider.name}):`, error);
      }
    });
  }
}

// Global Analytics Instance
let analytics: AnalyticsManager;

// Analytics initialisieren
export const initializeAnalytics = (): AnalyticsManager => {
  if (!analytics) {
    analytics = new AnalyticsManager();
  }
  return analytics;
};

// Helper-Funktionen für häufige Events
export const trackCTAClick = (ctaType: string, position: string, leadMagnetId?: string) => {
  analytics?.trackFunnelEvent({
    event: 'cta_click',
    funnel_stage: 'consideration',
    cta_type: ctaType,
    lead_magnet_id: leadMagnetId,
    custom_parameters: {
      cta_position: position,
      page_url: window.location.href
    }
  });
};

export const trackLeadMagnetDownload = (leadMagnetId: string, leadId?: string) => {
  analytics?.trackConversion({
    event: 'lead_magnet_download',
    conversion_type: 'lead_magnet_download',
    lead_id: leadId,
    lead_value: 10, // Estimated lead value
    attribution_source: document.referrer || 'direct',
    custom_parameters: {
      lead_magnet_id: leadMagnetId
    }
  });
};

export const trackNewsletterSignup = (source: string, leadId?: string) => {
  analytics?.trackConversion({
    event: 'newsletter_signup',
    conversion_type: 'newsletter_signup',
    lead_id: leadId,
    lead_value: 5,
    attribution_source: source,
    custom_parameters: {
      signup_source: source
    }
  });
};

export const trackScrollDepth = (percentage: number) => {
  analytics?.track({
    event: 'scroll_depth',
    event_category: 'Engagement',
    value: percentage,
    custom_parameters: {
      page_url: window.location.href
    }
  });
};

export const trackTimeOnPage = (seconds: number) => {
  analytics?.track({
    event: 'time_on_page',
    event_category: 'Engagement',
    value: seconds,
    custom_parameters: {
      page_url: window.location.href
    }
  });
};

// Export der Analytics-Instance
export { analytics };

// Browser-Global für Development/Debugging
if (typeof window !== 'undefined') {
  (window as any).evolutionAnalytics = {
    track: (event: AnalyticsEvent) => analytics?.track(event),
    trackCTAClick,
    trackLeadMagnetDownload,
    trackNewsletterSignup,
    trackScrollDepth,
    trackTimeOnPage
  };
}
