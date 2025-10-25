import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: 'div' | 'section';
  variant?: 'default' | 'holo';
}

const Card: React.FC<CardProps> = ({
  as = 'div',
  className = '',
  variant = 'holo',
  children,
  ...props
}) => {
  const Comp = as as any;
  if (variant === 'holo') {
    return (
      <Comp
        className={`relative isolate rounded-lg border border-white/10 bg-white/10 dark:bg-white/5 backdrop-blur-xl landing-holo-panel ${className}`}
        {...props}
      >
        <div className="absolute inset-0 rounded-lg pointer-events-none landing-holo-bg"></div>
        {children}
      </Comp>
    );
  }
  return (
    <Comp className={`rounded-lg shadow bg-white dark:bg-gray-800 ${className}`} {...props}>
      {children}
    </Comp>
  );
};

export default Card;
