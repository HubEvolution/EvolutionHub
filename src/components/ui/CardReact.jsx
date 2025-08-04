import React from 'react';

/**
 * React-Version der Card-Komponente für die Verwendung in React-Komponenten
 * 
 * @param {Object} props - Die Komponenten-Props
 * @param {string} [props.title] - Der optionale Titel der Karte
 * @param {string} [props.className] - Zusätzliche CSS-Klassen
 * @param {string} [props.id] - Optionale ID für die Karte
 * @param {React.ReactNode} props.children - Der Inhalt der Karte
 * @returns {React.ReactElement}
 */
const CardReact = ({ title, className = '', children, id }) => {
  return (
    <div 
      id={id} 
      className={[
        "relative p-6 rounded-2xl overflow-hidden",
        // Solid background with border for light/dark mode
        "bg-white dark:bg-gray-800/50",
        "border border-gray-200 dark:border-white/10",
        // Subtle shadow for depth
        "shadow-sm",
        className
      ].join(' ')}
    >
      {/* Optional title */}
      {title && (
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
          {title}
        </h3>
      )}
      
      {/* Content */}
      <div className="relative">
        {children}
      </div>
    </div>
  );
};

export default CardReact;
