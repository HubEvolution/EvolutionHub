type IconName =
  | 'celebration'
  | 'rocket'
  | 'chart'
  | 'lightbulb'
  | 'search'
  | 'key'
  | 'refresh'
  | 'tool'
  | 'palette'
  | 'laptop'
  | 'photo'
  | 'noise'
  | 'preset'
  | 'sliders'
  | 'batch'
  | 'box'
  | 'mail'
  | 'gift'
  | 'edit'
  | 'target'
  | 'book'
  | 'plug'
  | 'clipboard'
  | 'check'
  | 'bell'
  | 'chat'
  | 'statusDot'
  | 'mouse';

interface IconProps {
  name: IconName | string;
  className?: string;
  ariaLabel?: string;
}

export default function Icon({ name, className = 'w-6 h-6', ariaLabel }: IconProps) {
  const ariaHidden = !ariaLabel;

  switch (name) {
    case 'clipboard':
      return (
        <svg
          className={className}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          aria-hidden={ariaHidden}
          role={ariaLabel ? 'img' : undefined}
          aria-label={ariaLabel}
        >
          <rect x="8" y="2" width="8" height="4" rx="1" fill="currentColor" />
          <rect
            x="4"
            y="6"
            width="16"
            height="14"
            rx="2"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
          />
        </svg>
      );
    case 'chat':
      return (
        <svg
          className={className}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          aria-hidden={ariaHidden}
          role={ariaLabel ? 'img' : undefined}
          aria-label={ariaLabel}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
            d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
          />
        </svg>
      );
    case 'tool':
      return (
        <svg
          className={className}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          aria-hidden={ariaHidden}
          role={ariaLabel ? 'img' : undefined}
          aria-label={ariaLabel}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
            d="M14 3l7 7-4 4-7-7"
          />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 14l-6 6" />
        </svg>
      );
    case 'plug':
      return (
        <svg
          className={className}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          aria-hidden={ariaHidden}
          role={ariaLabel ? 'img' : undefined}
          aria-label={ariaLabel}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
            d="M7 7v4a4 4 0 004 4h2v2a1 1 0 001 1h2v-4l-4-4"
          />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 3v4" />
        </svg>
      );
    case 'target':
      return (
        <svg
          className={className}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          aria-hidden={ariaHidden}
          role={ariaLabel ? 'img' : undefined}
          aria-label={ariaLabel}
        >
          <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <circle cx="12" cy="12" r="4" fill="currentColor" />
          <circle cx="12" cy="12" r="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>
      );
    case 'statusDot':
      return (
        <svg
          className={className}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 8 8"
          fill="currentColor"
          aria-hidden={ariaHidden}
          role={ariaLabel ? 'img' : undefined}
          aria-label={ariaLabel}
        >
          <circle cx="4" cy="4" r="4" />
        </svg>
      );
    case 'chart':
      return (
        <svg
          className={className}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          aria-hidden={ariaHidden}
          role={ariaLabel ? 'img' : undefined}
          aria-label={ariaLabel}
        >
          <rect x="3" y="11" width="4" height="8" rx="1" fill="currentColor" />
          <rect x="9" y="7" width="4" height="12" rx="1" fill="currentColor" />
          <rect x="15" y="3" width="4" height="16" rx="1" fill="currentColor" />
        </svg>
      );
    case 'preset':
    case 'sliders':
      return (
        <svg
          className={className}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          aria-hidden={ariaHidden}
          role={ariaLabel ? 'img' : undefined}
          aria-label={ariaLabel}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 6h16" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 12h10" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 18h8" />
          <circle cx="7" cy="12" r="1.5" fill="currentColor" />
          <circle cx="12" cy="18" r="1.5" fill="currentColor" />
        </svg>
      );
    case 'lightbulb':
      return (
        <svg
          className={className}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          aria-hidden={ariaHidden}
          role={ariaLabel ? 'img' : undefined}
          aria-label={ariaLabel}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
            d="M9 18h6M10 21h4"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
            d="M9 13a4 4 0 116 0c0 1.657-1 2-1.5 3H10.5C10 15 9 14.657 9 13z"
          />
        </svg>
      );
    default:
      // Fallback generic circle
      return (
        <svg
          className={className}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden={ariaHidden}
          role={ariaLabel ? 'img' : undefined}
          aria-label={ariaLabel}
        >
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>
      );
  }
}
