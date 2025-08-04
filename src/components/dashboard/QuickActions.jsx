import React, { useEffect } from 'react';
import { useQuickActionStore } from '../../stores';
import Card from '../ui/Card.astro';
import type { QuickAction } from '../../types/dashboard';

interface QuickActionsProps {
  initialActions?: QuickAction[];
  title?: string;
}

const QuickActions: React.FC<QuickActionsProps> = ({ 
  initialActions = [],
  title = 'Quick Actions'
}) => {
  const { actions, setActions, executeAction } = useQuickActionStore();
  
  // Beim ersten Rendern die Aktionen laden
  useEffect(() => {
    if (initialActions && initialActions.length > 0 && actions.length === 0) {
      setActions(initialActions);
    }
  }, [initialActions]);

  const getVariantClasses = (variant: string = 'primary'): string => {
    const base = 'p-3 rounded-lg flex items-center justify-center text-xl transition-all';
    const variants: Record<string, string> = {
      primary: 'bg-blue-500/10 text-blue-500 dark:bg-blue-500/10 dark:text-blue-400',
      secondary: 'bg-gray-500/10 text-gray-600 dark:bg-gray-500/10 dark:text-gray-400',
      success: 'bg-green-500/10 text-green-600 dark:bg-green-500/10 dark:text-green-400',
      danger: 'bg-red-500/10 text-red-600 dark:bg-red-500/10 dark:text-red-400',
    };
    return `${base} ${variants[variant] || variants.primary}`;
  };

  const handleActionClick = async (actionName: string) => {
    await executeAction(actionName);
  };

  return (
    <Card title={title}>
      <div className="grid grid-cols-2 gap-3">
        {actions.length === 0 ? (
          <div className="col-span-full text-center py-4 text-gray-500 dark:text-gray-400">
            <p>No quick actions available</p>
          </div>
        ) : (
          actions.map((action) => (
            <button
              key={action.id}
              onClick={() => handleActionClick(action.action)}
              className="group w-full h-full p-4 rounded-xl transition-all bg-gray-50 dark:bg-transparent hover:bg-gray-100 dark:hover:bg-white/5 flex items-start space-x-3 text-left"
              aria-label={action.title}
            >
              <div 
                className={getVariantClasses(action.variant)}
                aria-hidden="true"
              >
                <img src={action.icon} alt={action.title} className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 dark:text-white group-hover:text-primary dark:group-hover:text-primary-light transition-colors">
                  {action.title}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {action.description}
                </p>
              </div>
            </button>
          ))
        )}
      </div>
    </Card>
  );
};

export default QuickActions;