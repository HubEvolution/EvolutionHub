import React from 'react';

export type AlertVariant = 'error' | 'info' | 'success';

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
  role?: 'alert' | 'status';
}

const variantMap: Record<AlertVariant, string> = {
  error: 'text-red-700 bg-red-50 dark:text-red-300 dark:bg-red-900/20',
  info: 'text-blue-700 bg-blue-50 dark:text-blue-300 dark:bg-blue-900/20',
  success: 'text-green-700 bg-green-50 dark:text-green-300 dark:bg-green-900/20',
};

const Alert: React.FC<AlertProps> = ({
  variant = 'error',
  role = 'alert',
  className = '',
  ...props
}) => {
  return (
    <div
      role={role}
      className={`mt-2 text-sm rounded-md px-3 py-2 ${variantMap[variant]} ${className}`}
      {...props}
    />
  );
};

export default Alert;
