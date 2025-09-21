import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: 'div' | 'section';
}

const Card: React.FC<CardProps> = ({ as = 'div', className = '', ...props }) => {
  const Comp = as as any;
  return (
    <Comp
      className={`rounded-lg shadow bg-white dark:bg-gray-800 ${className}`}
      {...props}
    />
  );
};

export default Card;
