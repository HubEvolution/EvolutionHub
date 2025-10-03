import { useEffect } from 'react';

export default function DebugInterceptors() {
  useEffect(() => {
    (async () => {
      try {
        if (import.meta.env.PUBLIC_ENABLE_DEBUG_PANEL === 'true') {
          const [{ installConsoleInterceptor }, { installNetworkInterceptor }] = await Promise.all([
            import('@/lib/console-interceptor'),
            import('@/lib/network-interceptor'),
          ]);
          installConsoleInterceptor();
          installNetworkInterceptor();
        }
      } catch {
        // no-op: never break the app due to debug init
      }
    })();
  }, []);
  return null;
}
