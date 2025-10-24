import React from 'react';

/**
 * React-Version der Card-Komponente für die Verwendung in React-Komponenten
 * 
 * @param {Object} props - Die Komponenten-Props
 * @param {string} [props.title] - Der optionale Titel der Karte
 * @param {string} [props.className] - Zusätzliche CSS-Klassen
 * @param {string} [props.id] - Optionale ID für die Karte
 * @param {('default'|'holo')} [props.variant] - Opt-in Landing Holo Look
 * @param {React.ReactNode} props.children - Der Inhalt der Karte
 * @returns {React.ReactElement}
 */
const CardReact = ({ title, className = '', children, id, variant = 'default' }) => {
  if (variant === 'holo') {
    return (
      <div
        id={id}
        className={[
          'relative p-6 rounded-2xl overflow-hidden isolate',
          // Landing holo panel look
          'border border-white/10 bg-white/10 dark:bg-white/5 backdrop-blur-xl landing-holo-panel',
          'shadow-sm',
          className,
        ].join(' ')}
      >
        <div className="absolute inset-0 rounded-2xl pointer-events-none landing-holo-bg" aria-hidden="true"></div>
        {title && (
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            {title}
          </h3>
        )}
        <div className="relative">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div 
      id={id} 
      className={[
        'relative p-6 rounded-2xl overflow-hidden',
        // Solid background with border for light/dark mode
        'bg-white dark:bg-gray-800/50',
        'border border-gray-200 dark:border-white/10',
        // Subtle shadow for depth
        'shadow-sm',
        className
      ].join(' ')}
    >
      {title && (
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
          {title}
        </h3>
      )}
      <div className="relative">
        {children}
      </div>
    </div>
  );
};

export default CardReact;

