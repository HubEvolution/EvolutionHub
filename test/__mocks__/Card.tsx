import React from 'react';

// Mock for the Card component
const Card = ({
  children,
  title,
  className = '',
}: {
  children: React.ReactNode;
  title?: string;
  className?: string;
}) => (
  <div className={`card ${className}`} data-testid="card">
    {title && <h3 className="card-title">{title}</h3>}
    <div className="card-content">{children}</div>
  </div>
);

export default Card;
