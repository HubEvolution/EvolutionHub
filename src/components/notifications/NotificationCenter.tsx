import React, { useState, useEffect, useCallback } from 'react';
import { Bell, CheckCheck, X } from 'lucide-react';
import type { Notification, NotificationStats } from '../../lib/types/notifications';

interface NotificationsResponse {
  notifications: Notification[];
  total: number;
  hasMore: boolean;
  unreadCount: number;
}

interface SuccessEnvelope<T> {
  success: true;
  data: T;
}

interface ErrorEnvelope {
  success?: false;
  error?: { message?: string };
}

interface NotificationCenterProps {
  className?: string;
}

const isSuccessResponse = <T,>(payload: SuccessEnvelope<T> | ErrorEnvelope | undefined): payload is SuccessEnvelope<T> =>
  Boolean(payload && 'success' in payload && payload.success === true);

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch notifications
  const fetchNotifications = useCallback(async (markAsRead = false) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        limit: '20',
        offset: '0',
      });

      const response = await fetch(`/api/notifications?${params}`, {
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }

      const result = (await response.json().catch(() => undefined)) as
        | SuccessEnvelope<NotificationsResponse>
        | ErrorEnvelope
        | undefined;

      if (!isSuccessResponse(result)) {
        throw new Error(result?.error?.message || 'Unknown error');
      }

      setNotifications(result.data.notifications);

      if (markAsRead && result.data.unreadCount > 0) {
        await fetch('/api/notifications/mark-all-read', {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
          },
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch stats periodically
  useEffect(() => {
    fetchNotifications();
    fetchStats();

    // Poll for new notifications every 30 seconds
    const interval = setInterval(() => {
      fetchNotifications();
      fetchStats();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications/stats', {
        method: 'GET',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch notification stats');
      }

      const result = (await response.json().catch(() => undefined)) as
        | SuccessEnvelope<NotificationStats>
        | ErrorEnvelope
        | undefined;

      if (!isSuccessResponse(result)) {
        throw new Error(result?.error?.message || 'Unknown error');
      }

      setStats(result.data);
    } catch (err) {
      // Stats failures should not surface to UI; keep silent but log
      console.error('Failed to fetch notification stats:', err);
    }
  }, []);

  // Handle notification click
  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      try {
        const response = await fetch('/api/notifications/mark-read', {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            notificationId: notification.id,
          }),
        });

        if (response.ok) {
          setNotifications((prev) =>
            prev.map((n) =>
              n.id === notification.id
                ? { ...n, isRead: true, readAt: Math.floor(Date.now() / 1000) }
                : n
            )
          );

          if (stats) {
            setStats((prev) => (prev ? { ...prev, unread: Math.max(0, prev.unread - 1) } : null));
          }
        }
      } catch (err) {
        console.error('Failed to mark notification as read:', err);
      }
    }
  };

  // Handle mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, isRead: true, readAt: Math.floor(Date.now() / 1000) }))
        );

        if (stats) {
          setStats((prev) => (prev ? { ...prev, unread: 0 } : null));
        }
      }
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  };

  // Format relative time
  const formatRelativeTime = (timestamp: number): string => {
    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;

    if (diff < 60) return 'gerade eben';
    if (diff < 3600) return `vor ${Math.floor(diff / 60)} Minuten`;
    if (diff < 86400) return `vor ${Math.floor(diff / 3600)} Stunden`;
    if (diff < 604800) return `vor ${Math.floor(diff / 86400)} Tagen`;

    return new Date(timestamp * 1000).toLocaleDateString('de-DE');
  };

  // Get priority color
  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'urgent':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'high':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'normal':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'low':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Notification Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
        aria-label="Benachrichtigungen"
      >
        <Bell className="w-6 h-6" />
        {stats && stats.unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {stats.unread > 99 ? '99+' : stats.unread}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />

          {/* Notification Panel */}
          <div className="absolute right-0 mt-2 w-96 max-h-96 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Benachrichtigungen</h3>
              <div className="flex items-center space-x-2">
                {stats && stats.unread > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800"
                    title="Alle als gelesen markieren"
                  >
                    <CheckCheck className="w-4 h-4" />
                    <span>Alle gelesen</span>
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="max-h-80 overflow-y-auto">
              {loading && (
                <div className="p-4 text-center text-gray-500">Lade Benachrichtigungen...</div>
              )}

              {error && <div className="p-4 text-center text-red-500">Fehler: {error}</div>}

              {!loading && !error && notifications.length === 0 && (
                <div className="p-4 text-center text-gray-500">Keine Benachrichtigungen</div>
              )}

              {!loading && !error && notifications.length > 0 && (
                <div className="divide-y divide-gray-100">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                        !notification.isRead ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <p
                              className={`text-sm font-medium ${
                                !notification.isRead ? 'text-gray-900' : 'text-gray-700'
                              }`}
                            >
                              {notification.title}
                            </p>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getPriorityColor(notification.priority)}`}
                            >
                              {notification.priority}
                            </span>
                          </div>
                          <p
                            className={`text-sm ${
                              !notification.isRead ? 'text-gray-700' : 'text-gray-500'
                            }`}
                          >
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {formatRelativeTime(notification.createdAt)}
                          </p>
                        </div>
                        {!notification.isRead && (
                          <div className="ml-2 flex-shrink-0">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-3 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={() => {
                    // Navigate to full notifications page
                    window.location.href = '/notifications';
                  }}
                  className="w-full text-sm text-blue-600 hover:text-blue-800 text-center"
                >
                  Alle Benachrichtigungen anzeigen
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationCenter;
