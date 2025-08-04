import React, { useEffect } from 'react';
import { useActivityStore } from '../../stores';
import CardReact from '../ui/CardReact.jsx';
// Korrigierte Typdefinition für JSX-Datei
/* @type {import('../../types/dashboard').ActivityItem} */

/**
 * @typedef {Object} ActivityFeedProps
 * @property {import('../../types/dashboard').ActivityItem[]} [initialActivities]
 * @property {string} [title]
 * @property {number} [maxItems]
 */

/**
 * @param {ActivityFeedProps} props
 * @returns {React.ReactElement}
 */
const ActivityFeed = ({ 
  initialActivities = [],
  title = 'Recent Activity',
  maxItems = 5
}) => {
  const { activities, setActivities } = useActivityStore();
  
  // Beim ersten Rendern die Aktivitäten laden
  useEffect(() => {
    if (initialActivities && initialActivities.length > 0 && activities.length === 0) {
      setActivities(initialActivities);
    }
  }, [initialActivities]);

  /**
   * @param {string} dateString
   * @returns {string}
   */
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('de-DE', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <CardReact title={title} className="">
      <div className="space-y-4">
        {activities.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p>Keine aktuellen Aktivitäten</p>
          </div>
        ) : (
          activities.slice(0, maxItems).map((activity) => (
            <div 
              key={activity.id}
              className="flex items-start space-x-3 group border-b border-gray-100 dark:border-white/5 pb-3 last:border-b-0 last:pb-0"
            >
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline">
                  <p className="text-sm font-medium text-gray-800 dark:text-white truncate">
                    {activity.user} <span className="text-gray-500 dark:text-gray-400 font-normal">{activity.action}</span>
                  </p>
                  <span className="text-xs text-gray-500 dark:text-gray-500 whitespace-nowrap ml-2">
                    {formatDate(activity.timestamp)}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
        
        {activities.length > maxItems && (
          <div className="pt-2 text-center">
            <button className="text-sm text-primary hover:text-primary-light transition-colors">
              Alle Aktivitäten anzeigen
            </button>
          </div>
        )}
      </div>
    </CardReact>
  );
};

export default ActivityFeed;