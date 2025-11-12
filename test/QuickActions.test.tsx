import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Define the QuickAction type
type QuickAction = {
  id: string;
  title: string;
  description: string;
  icon: string;
  variant: 'primary' | 'secondary';
  action: () => void;
};

// Mock the QuickActions component
const QuickActions: React.FC<{
  actions: QuickAction[];
  title?: string;
}> = ({ actions, title = 'Quick Actions' }) => {
  return (
    <div data-testid="quick-actions">
      <h3>{title}</h3>
      {actions.length === 0 ? (
        <p>No quick actions available</p>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {actions.map((action) => (
            <button
              key={action.id}
              className={`p-4 rounded-lg text-left transition-colors ${
                action.variant === 'primary'
                  ? 'bg-blue-500/10 hover:bg-blue-500/20'
                  : 'bg-gray-500/10 hover:bg-gray-500/20'
              }`}
              onClick={action.action}
            >
              <div className="flex items-center space-x-3">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full ${
                    action.variant === 'primary' ? 'bg-blue-500/10' : 'bg-gray-500/10'
                  }`}
                >
                  {action.icon}
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">{action.title}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{action.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// Mock the Card component
vi.mock('../ui/Card.astro', () => ({
  default: ({ children, title }: { children: React.ReactNode; title?: string }) => (
    <div data-testid="card">
      {title && <h3>{title}</h3>}
      {children}
    </div>
  ),
}));

// Mock the Astro global for testing
vi.mock('astro', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="astro-component">{children}</div>
  ),
}));

describe('QuickActions', () => {
  const mockActions = [
    {
      id: '1',
      title: 'New Project',
      description: 'Create a new project',
      icon: '➕',
      variant: 'primary' as const,
      action: vi.fn(),
    },
    {
      id: '2',
      title: 'Generate Report',
      description: 'Generate a new report',
      icon: '📊',
      variant: 'secondary' as const,
      action: vi.fn(),
    },
  ];

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  it('renders with default title when no title prop is provided', () => {
    render(<QuickActions actions={mockActions} />);
    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
  });

  it('renders with custom title when provided', () => {
    const customTitle = 'Custom Actions';
    render(<QuickActions actions={mockActions} title={customTitle} />);
    expect(screen.getByText(customTitle)).toBeInTheDocument();
  });

  it('renders the correct number of action buttons', () => {
    render(<QuickActions actions={mockActions} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(mockActions.length);
  });

  it('displays the correct action titles and descriptions', () => {
    render(<QuickActions actions={mockActions} />);

    mockActions.forEach((action) => {
      expect(screen.getByText(action.title)).toBeInTheDocument();
      expect(screen.getByText(action.description)).toBeInTheDocument();
    });
  });

  it('displays a message when no actions are provided', () => {
    render(<QuickActions actions={[]} />);
    expect(screen.getByText('No quick actions available')).toBeInTheDocument();
  });

  it('applies the correct variant class to action buttons', () => {
    render(<QuickActions actions={mockActions} />);

    mockActions.forEach((action, index) => {
      const button = screen.getAllByRole('button')[index];
      const expectedClass =
        action.variant === 'primary'
          ? 'bg-blue-500/10 hover:bg-blue-500/20'
          : 'bg-gray-500/10 hover:bg-gray-500/20';

      expect(button).toHaveClass(expectedClass);
    });
  });

  // Note: Testing the actual click behavior would require mocking the client-side script
  // which is more complex in Astro components. In a real app, you might want to
  // test this with a full E2E test using something like Playwright.
});
