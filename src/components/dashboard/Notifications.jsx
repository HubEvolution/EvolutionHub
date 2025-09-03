import React, { useEffect } from 'react';
import { useNotificationStore } from '../../stores';
import CardReact from '@/components/ui/CardReact.jsx';
import Icon from '@/components/ui/Icon';

/**
 * @typedef {Object} Notification
 * @property {string} id
 * @property {string} message
 * @property {string} type
 * @property {string} timestamp
 */

/**
 * @typedef {Object} NotificationsProps
 * @property {Notification[]} [initialNotifications]
 * @property {string} [title]
 */

/**
 * @param {NotificationsProps} props
 * @returns {React.ReactElement}
 */
const Notifications = ({
  initialNotifications = [],
  title = 'Notifications'
}) => {
  const { notifications, setNotifications } = useNotificationStore();
  
  // Beim ersten Rendern die Benachrichtigungen laden
  useEffect(() => {
    if (initialNotifications && initialNotifications.length > 0 && notifications.length === 0) {
      setNotifications(initialNotifications);
    }
  }, [initialNotifications]);
  
  /**
   * @param {string} type
   * @returns {React.ReactNode}
   */
  const getIconForType = (type) => {
    switch (type) {
      case 'comment':
        return <Icon name="chat" className="w-5 h-5 text-gray-700 dark:text-gray-300" ariaLabel="Kommentar" />;
      case 'mention':
        return <span className="w-5 h-5 inline-flex items-center justify-center text-gray-700 dark:text-gray-300" aria-hidden="true">@</span>;
      case 'task_completed':
        return <Icon name="check" className="w-5 h-5 text-emerald-600 dark:text-emerald-400" ariaLabel="Abgeschlossen" />;
      default:
        return <Icon name="bell" className="w-5 h-5 text-blue-600 dark:text-blue-400" ariaLabel="Benachrichtigung" />;
    }
  };

  return (
    <CardReact title={title}>
      <div className="space-y-4">
        {notifications.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p>No new notifications</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div key={notification.id} className="flex items-start space-x-3">
              <div className="flex items-center justify-center w-6 h-6">
                {getIconForType(notification.type)}
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-800 dark:text-gray-200">{notification.message}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(notification.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </CardReact>
  );
};

export default Notifications;