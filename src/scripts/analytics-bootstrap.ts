// Client-side bootstrap for analytics runtime
// Ensures Vite bundles this module and resolves aliases correctly
import initAnalytics from '@/scripts/analytics-runtime';

function bootstrap() {
  if (document.readyState !== 'loading') {
    initAnalytics();
  } else {
    document.addEventListener('DOMContentLoaded', initAnalytics);
  }

  // Optional: Cleanup beim Seitenwechsel
  window.addEventListener('beforeunload', () => {
    if (typeof (window as any)['analyticsCleanup'] === 'function') {
      (window as any)['analyticsCleanup']();
    }
  });
}

bootstrap();
