import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

/**
 * Error Boundary für Comment-System
 * Fängt JavaScript-Fehler in der Component-Tree und zeigt Fallback-UI
 */
export class CommentErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Comment System Error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg
                className="h-6 w-6 text-red-600 dark:text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-base font-semibold text-red-800 dark:text-red-200">
                Kommentare konnten nicht geladen werden
              </h3>
              <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                <p className="mb-2">
                  {this.state.error?.message || 'Ein unbekannter Fehler ist aufgetreten'}
                </p>
                {import.meta.env.DEV && this.state.error && (
                  <details className="mt-3 p-3 bg-red-100 dark:bg-red-900/40 rounded border border-red-300 dark:border-red-700">
                    <summary className="cursor-pointer font-medium">
                      Technische Details (Dev-Mode)
                    </summary>
                    <pre className="mt-2 text-xs overflow-auto">{this.state.error.stack}</pre>
                    {this.state.errorInfo && (
                      <pre className="mt-2 text-xs overflow-auto">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    )}
                  </details>
                )}
              </div>
              <div className="mt-4">
                <button
                  onClick={this.handleReset}
                  className="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white text-sm font-medium rounded-md transition-colors"
                >
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Erneut versuchen
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="ml-3 inline-flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-800 text-white text-sm font-medium rounded-md transition-colors"
                >
                  Seite neu laden
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
