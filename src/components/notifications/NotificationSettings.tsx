import React, { useState, useEffect } from 'react';
import { Save, RefreshCw } from 'lucide-react';
import type {
  NotificationSetting,
  UpdateNotificationSettingsRequest,
} from '../../lib/types/notifications';

interface NotificationSettingsProps {
  userId: number;
  className?: string;
}

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({
  userId,
  className = '',
}) => {
  const [settings, setSettings] = useState<NotificationSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch settings
  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/notifications/settings', {
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch notification settings');
      }

      const result = await response.json();

      if (result.success) {
        setSettings(result.data);
      } else {
        throw new Error(result.error?.message || 'Unknown error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Initialize settings on mount
  useEffect(() => {
    fetchSettings();
  }, []);

  // Update setting
  const updateSetting = async (
    type: string,
    channel: string,
    enabled: boolean,
    frequency: string = 'immediate'
  ) => {
    try {
      setSaving(`${type}-${channel}`);
      setError(null);
      setSuccess(null);

      const request: UpdateNotificationSettingsRequest = {
        type: type as any,
        channel: channel as any,
        enabled,
        frequency: frequency as any,
      };

      const response = await fetch('/api/notifications/settings', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error('Failed to update notification setting');
      }

      const result = await response.json();

      if (result.success) {
        // Update local state
        setSettings((prev) =>
          prev.map((setting) =>
            setting.type === type && setting.channel === channel
              ? { ...setting, enabled, frequency, updatedAt: Math.floor(Date.now() / 1000) }
              : setting
          )
        );
        setSuccess('Einstellungen gespeichert');
      } else {
        throw new Error(result.error?.message || 'Unknown error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(null);
    }
  };

  // Reset to defaults
  const resetToDefaults = async () => {
    try {
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/notifications/settings/reset', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to reset notification settings');
      }

      const result = await response.json();

      if (result.success) {
        setSettings(result.data);
        setSuccess('Einstellungen auf Standard zurückgesetzt');
      } else {
        throw new Error(result.error?.message || 'Unknown error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // Group settings by type
  const groupedSettings = settings.reduce(
    (acc, setting) => {
      if (!acc[setting.type]) {
        acc[setting.type] = [];
      }
      acc[setting.type].push(setting);
      return acc;
    },
    {} as Record<string, NotificationSetting[]>
  );

  // Get localized type names
  const getTypeName = (type: string): string => {
    const names: Record<string, string> = {
      comment_reply: 'Antworten auf Kommentare',
      comment_mention: 'Erwähnungen in Kommentaren',
      comment_approved: 'Freigabe von Kommentaren',
      comment_rejected: 'Ablehnung von Kommentaren',
      system: 'System-Benachrichtigungen',
      email_digest: 'E-Mail-Zusammenfassung',
    };
    return names[type] || type;
  };

  // Get localized channel names
  const getChannelName = (channel: string): string => {
    const names: Record<string, string> = {
      in_app: 'In-App',
      email: 'E-Mail',
      push: 'Push',
    };
    return names[channel] || channel;
  };

  // Get localized frequency names
  const getFrequencyName = (frequency: string): string => {
    const names: Record<string, string> = {
      immediate: 'Sofort',
      daily: 'Täglich',
      weekly: 'Wöchentlich',
      never: 'Nie',
    };
    return names[frequency] || frequency;
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="flex items-center justify-center h-32">
          <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-500">Lade Einstellungen...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Benachrichtigungs-Einstellungen</h2>
          <button
            onClick={resetToDefaults}
            className="inline-flex items-center px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
            title="Auf Standardeinstellungen zurücksetzen"
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Zurücksetzen
          </button>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Verwalten Sie, wie und wann Sie Benachrichtigungen erhalten möchten.
        </p>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {success && (
        <div className="mx-6 mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-600">{success}</p>
        </div>
      )}

      {/* Settings */}
      <div className="p-6 space-y-6">
        {Object.entries(groupedSettings).map(([type, typeSettings]) => (
          <div key={type} className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-md font-medium text-gray-900 mb-3">{getTypeName(type)}</h3>

            <div className="space-y-3">
              {typeSettings.map((setting) => (
                <div
                  key={`${setting.type}-${setting.channel}`}
                  className="flex items-center justify-between"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={setting.enabled}
                          onChange={(e) =>
                            updateSetting(
                              setting.type,
                              setting.channel,
                              e.target.checked,
                              setting.frequency
                            )
                          }
                          disabled={saving === `${setting.type}-${setting.channel}`}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>

                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {getChannelName(setting.channel)}
                        </p>
                        {setting.enabled && (
                          <p className="text-xs text-gray-500">
                            Häufigkeit: {getFrequencyName(setting.frequency)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {setting.enabled && (
                    <select
                      value={setting.frequency}
                      onChange={(e) =>
                        updateSetting(setting.type, setting.channel, true, e.target.value)
                      }
                      disabled={saving === `${setting.type}-${setting.channel}`}
                      className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="immediate">Sofort</option>
                      <option value="daily">Täglich</option>
                      <option value="weekly">Wöchentlich</option>
                      <option value="never">Nie</option>
                    </select>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {Object.keys(groupedSettings).length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>Keine Benachrichtigungs-Einstellungen gefunden.</p>
            <button
              onClick={fetchSettings}
              className="mt-2 text-sm text-blue-600 hover:text-blue-800"
            >
              Einstellungen laden
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
        <p className="text-xs text-gray-500">
          Hinweis: E-Mail-Benachrichtigungen erfordern eine gültige E-Mail-Adresse in Ihrem Profil.
        </p>
      </div>
    </div>
  );
};

export default NotificationSettings;
