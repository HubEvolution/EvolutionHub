import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import * as CommentMobileModule from '../../src/components/comments/CommentMobile';
import userEvent from '@testing-library/user-event';
import { CommentSection } from '../../src/components/comments/CommentSection';
import { CommentForm } from '../../src/components/comments/CommentForm';
import { CommentList } from '../../src/components/comments/CommentList';
import { CommentStats } from '../../src/components/comments/CommentStats';
import type { Comment } from '../../src/lib/types/comments';

// Local handles to tweak virtual mocks during tests (hoisted for Vitest)
const { useAuthMock, useRateLimitMock, useCommentStoreMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(
    (): { user: { id: string; name: string; email: string } | null; isAuthenticated: boolean } => ({
      user: { id: '1', name: 'Test User', email: 'test@example.com' },
      isAuthenticated: true,
    })
  ),
  useRateLimitMock: vi.fn(() => ({ canPost: true, remainingTime: 0, isLimited: false })),
  useCommentStoreMock: vi.fn(() => ({
    comments: [],
    isLoading: false,
    error: null as string | null,
    createComment: vi.fn(),
    updateComment: vi.fn(),
    deleteComment: vi.fn(),
    reportComment: vi.fn(),
    loadComments: vi.fn(),
    fetchComments: vi.fn(),
    clearError: vi.fn(),
  })),
}));

const noopReply = vi.fn(async () => {});

// Mock the comment store
(vi as any).mock(
  '../../src/stores/comment-store',
  () => ({
    useCommentStore: useCommentStoreMock,
  }),
  { virtual: true }
);

// Mock the auth context (virtual module)
(vi as any).mock(
  '../../src/contexts/AuthContext',
  () => ({
    useAuth: useAuthMock,
  }),
  { virtual: true }
);

// Mock the CSRF hook
vi.mock('../../src/lib/security/csrf', () => ({
  useCsrfToken: vi.fn(() => 'test-csrf-token'),
}));

// Mock the rate limiter hook (virtual module)
(vi as any).mock(
  '../../src/components/comments/hooks/useRateLimit',
  () => ({
    useRateLimit: useRateLimitMock,
  }),
  { virtual: true }
);

describe('CommentSection', () => {
  const sectionProps = {
    entityType: 'blog_post' as const,
    entityId: 'test-post-123',
    title: 'Test Blog Post',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render comment section with title', () => {
    vi.spyOn(CommentMobileModule, 'useIsMobile').mockReturnValue(false);
    render(<CommentSection {...sectionProps} />);

    // Component renders the page title and mobile container
    expect(screen.getByText('Test Blog Post')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    vi.spyOn(CommentMobileModule, 'useIsMobile').mockReturnValue(false);
    useCommentStoreMock.mockReturnValue({
      comments: [],
      isLoading: true,
      error: null,
      createComment: vi.fn(),
      updateComment: vi.fn(),
      deleteComment: vi.fn(),
      reportComment: vi.fn(),
      loadComments: vi.fn(),
      fetchComments: vi.fn(),
      clearError: vi.fn(),
    });

    render(<CommentSection {...sectionProps} />);

    expect(screen.getByText('Kommentare werden geladen...')).toBeInTheDocument();
  });

  it('should show error state', () => {
    vi.spyOn(CommentMobileModule, 'useIsMobile').mockReturnValue(false);
    useCommentStoreMock.mockReturnValue({
      comments: [],
      isLoading: false,
      error: null,
      createComment: vi.fn(),
      updateComment: vi.fn(),
      deleteComment: vi.fn(),
      reportComment: vi.fn(),
      loadComments: vi.fn(),
      fetchComments: vi.fn().mockRejectedValue(new Error('Fehler beim Laden der Kommentare')),
      clearError: vi.fn(),
    });

    render(<CommentSection {...sectionProps} />);
    // Wait for effect to run and error to be shown
    return waitFor(() => {
      expect(screen.getByText('Fehler beim Laden der Kommentare')).toBeInTheDocument();
    });
  });
});

describe('CommentForm', () => {
  const formProps = {
    onSubmit: vi.fn(async (_content: string) => {}),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render comment form for authenticated user', () => {
    render(<CommentForm {...formProps} />);

    expect(screen.getByLabelText('Kommentar schreiben')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Kommentar posten' })).toBeInTheDocument();
  });

  it('should render guest comment form', () => {
    useAuthMock.mockReturnValue({ user: null, isAuthenticated: false });

    render(<CommentForm {...formProps} />);

    expect(screen.getByLabelText('Kommentar schreiben')).toBeInTheDocument();
    expect(screen.getByText(/Du kommentierst als Gast/)).toBeInTheDocument();
    expect(screen.getByText('Melde dich an')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Kommentar posten' })).toBeInTheDocument();
  });

  it('should render form (rate limit hook not used by form)', () => {
    useRateLimitMock.mockReturnValue({ canPost: false, remainingTime: 30, isLimited: true });
    render(<CommentForm {...formProps} />);
    expect(screen.getByLabelText('Kommentar schreiben')).toBeInTheDocument();
  });

  it('should keep submit disabled when content is empty', async () => {
    const user = userEvent.setup();
    render(<CommentForm {...formProps} />);

    const submitButton = screen.getByRole('button', { name: 'Kommentar posten' });
    expect(submitButton).toBeDisabled();
    await user.click(submitButton);
    expect(screen.queryByText('Bitte gib einen Kommentar ein')).not.toBeInTheDocument();
  });

  it('should keep submit disabled for guest when content is empty', async () => {
    useAuthMock.mockReturnValue({ user: null, isAuthenticated: false });
    const user = userEvent.setup();
    render(<CommentForm {...formProps} />);
    const submitButton = screen.getByRole('button', { name: 'Kommentar posten' });
    expect(submitButton).toBeDisabled();
    await user.click(submitButton);
    expect(screen.queryByText('Bitte gib einen Kommentar ein')).not.toBeInTheDocument();
  });

  it('should submit a valid comment for guest users', async () => {
    useAuthMock.mockReturnValue({ user: null, isAuthenticated: false });
    const onSubmit = vi.fn(async () => {});
    const user = userEvent.setup();
    render(<CommentForm onSubmit={onSubmit} />);

    const textarea = screen.getByLabelText('Kommentar schreiben');
    const submitButton = screen.getByRole('button', { name: 'Kommentar posten' });
    await user.type(textarea, 'This is a valid comment');
    await user.click(submitButton);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith('This is a valid comment', undefined);
    });
  });
});

describe('CommentList', () => {
  const mockComments: Comment[] = [
    {
      id: 'comment-1',
      content: 'This is the first comment',
      authorId: '1',
      authorName: 'Test User 1',
      authorEmail: 'test1@example.com',
      entityType: 'blog_post',
      entityId: 'test-post-123',
      status: 'approved',
      isEdited: false,
      createdAt: Math.floor(Date.now() / 1000),
      updatedAt: Math.floor(Date.now() / 1000),
      replies: [
        {
          id: 'comment-2',
          content: 'This is a reply',
          authorId: '2',
          authorName: 'Test User 2',
          authorEmail: 'test2@example.com',
          entityType: 'blog_post',
          entityId: 'test-post-123',
          parentId: 'comment-1',
          status: 'approved',
          isEdited: false,
          createdAt: Math.floor(Date.now() / 1000),
          updatedAt: Math.floor(Date.now() / 1000),
        },
      ],
    },
  ];

  const mockProps = {
    comments: mockComments,
    onUpdateComment: vi.fn(),
    onDeleteComment: vi.fn(),
    onReportComment: vi.fn(),
    currentUserId: '1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render comments list', async () => {
    const user = userEvent.setup();
    render(<CommentList onReply={noopReply} {...mockProps} />);

    expect(screen.getByText('This is the first comment')).toBeInTheDocument();
    // Expand replies toggle before asserting reply content
    const toggle = screen.getByRole('button', { name: /Antworten anzeigen/i });
    await user.click(toggle);
    expect(screen.getByText('This is a reply')).toBeInTheDocument();
  });

  it('should show comment actions for own comments', () => {
    render(
      <CommentList
        onReply={noopReply}
        {...mockProps}
        currentUser={{ id: '1', name: 'Test User 1', email: 'test1@example.com' }}
      />
    );

    expect(screen.getByText('Bearbeiten')).toBeInTheDocument();
    expect(screen.getByText('Löschen')).toBeInTheDocument();
  });

  it('should not show edit/delete for other users comments', () => {
    const propsWithDifferentUser = {
      ...mockProps,
      // Not the author
    };

    render(
      <CommentList
        onReply={noopReply}
        {...propsWithDifferentUser}
        currentUser={{ id: '999', name: 'Other', email: 'other@example.com' }}
      />
    );
    expect(screen.queryByText('Bearbeiten')).not.toBeInTheDocument();
    expect(screen.queryByText('Löschen')).not.toBeInTheDocument();
  });

  it('should handle comment editing', async () => {
    const user = userEvent.setup();
    render(
      <CommentList
        onReply={noopReply}
        {...mockProps}
        currentUser={{ id: '1', name: 'Test User 1', email: 'test1@example.com' }}
      />
    );

    const editButton = screen.getByText('Bearbeiten');
    await user.click(editButton);

    const editTextarea = screen.getByDisplayValue('This is the first comment');
    await user.clear(editTextarea);
    await user.type(editTextarea, 'Updated comment content');

    const saveButton = screen.getByRole('button', { name: /speichern/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockProps.onUpdateComment).toHaveBeenCalledWith(
        'comment-1',
        'Updated comment content'
      );
    });
  });

  it('should handle comment deletion', async () => {
    const user = userEvent.setup();
    render(
      <CommentList
        onReply={noopReply}
        {...mockProps}
        currentUser={{ id: '1', name: 'Test User 1', email: 'test1@example.com' }}
      />
    );

    const deleteButton = screen.getByText('Löschen');
    await user.click(deleteButton);
    // Confirm deletion
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    // Trigger handleDelete
    await user.click(deleteButton);
    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalled();
      expect(mockProps.onDeleteComment).toHaveBeenCalledWith('comment-1');
    });
  });

  it('should toggle reply form for other user', async () => {
    const propsWithDifferentUser = { ...mockProps };
    const user = userEvent.setup();
    render(
      <CommentList
        onReply={async () => {}}
        {...propsWithDifferentUser}
        currentUser={{ id: '999', name: 'Other', email: 'other@example.com' }}
      />
    );

    const replyButton = screen.getAllByText('Antworten')[0];
    await user.click(replyButton);
    expect(screen.getByLabelText('Kommentar schreiben')).toBeInTheDocument();
  });
});

describe('CommentStats', () => {
  it('should render comment statistics', () => {
    const mockStats = {
      total: 15,
      approved: 12,
      pending: 2,
      rejected: 1,
      flagged: 0,
      hidden: 0,
    };

    render(<CommentStats stats={mockStats} />);

    // Assert on the summary row instead of combined text
    const totalLabel = screen.getByText('Gesamt:');
    expect(totalLabel).toBeInTheDocument();
    const totalValue = totalLabel.parentElement?.querySelector('span.font-medium');
    expect(totalValue?.textContent).toBe('15');
    const approvedLabel = screen.getByText('Freigegeben:');
    const approvedValue = approvedLabel.parentElement?.querySelector('span.font-medium');
    expect(approvedValue?.textContent).toBe('12');

    const pendingLabel = screen.getByText('Ausstehend:');
    const pendingValue = pendingLabel.parentElement?.querySelector('span.font-medium');
    expect(pendingValue?.textContent).toBe('2');

    const rejectedLabel = screen.getByText('Abgelehnt:');
    const rejectedValue = rejectedLabel.parentElement?.querySelector('span.font-medium');
    expect(rejectedValue?.textContent).toBe('1');
  });

  it('should handle empty stats', () => {
    const mockStats = {
      total: 0,
      approved: 0,
      pending: 0,
      rejected: 0,
      flagged: 0,
      hidden: 0,
    };

    render(<CommentStats stats={mockStats} />);

    const totalLabel = screen.getByText('Gesamt:');
    expect(totalLabel).toBeInTheDocument();
    const totalValue = totalLabel.parentElement?.querySelector('span.font-medium');
    expect(totalValue?.textContent).toBe('0');
  });
});
