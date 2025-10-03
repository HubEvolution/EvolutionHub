import { useEffect } from 'react';

export default function DebugInterceptors() {
  useEffect(() => {
    (async () => {
      try {
        if (import.meta.env.PUBLIC_ENABLE_DEBUG_PANEL === 'true') {
          const [
            { installConsoleInterceptor },
            { installNetworkInterceptor },
            { installGlobalErrorInterceptor },
            { installXHRInterceptor },
            { installBeaconInterceptor },
          ] = await Promise.all([
            import('@/lib/console-interceptor'),
            import('@/lib/network-interceptor'),
            import('@/lib/global-error-interceptor'),
            import('@/lib/xhr-interceptor'),
            import('@/lib/beacon-interceptor'),
          ]);
          installConsoleInterceptor();
          installNetworkInterceptor();
          installGlobalErrorInterceptor();
          installXHRInterceptor();
          installBeaconInterceptor();
        }
      } catch {
        // no-op: never break the app due to debug init
      }
    })();
  }, []);
  return null;
}
