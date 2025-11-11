import { useCallback } from 'react';
import { postAdminTelemetry, type AdminTelemetryEvent } from '@/lib/admin/api-client';

interface TelemetryOptions {
  severity?: 'info' | 'warning' | 'error';
  section?: string;
  widget?: string;
  action?: string;
  metadata?: Record<string, unknown>;
}

export function useAdminTelemetry(section?: string) {
  const sendEvent = useCallback(
    async (event: AdminTelemetryEvent, options: TelemetryOptions = {}) => {
      try {
        await postAdminTelemetry({
          event,
          severity: options.severity,
          context: {
            section: options.section ?? section,
            widget: options.widget,
            action: options.action,
          },
          metadata: options.metadata,
        });
      } catch {
        // deliberately ignore telemetry failures
      }
    },
    [section]
  );

  return { sendEvent };
}
