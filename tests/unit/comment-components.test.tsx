import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommentSection } from '../../src/components/comments/CommentSection';
import { CommentForm } from '../../src/components/comments/CommentForm';
import { CommentList } from '../../src/components/comments/CommentList';
import { CommentStats } from '../../src/components/comments/CommentStats';
import type { Comment } from '../../src/lib/types/comments';

// Mock the comment store
vi.mock('../../src/stores/comment-store', () => ({
  useCommentStore: vi.fn(() => ({
    comments: [],
    isLoading: false,
    error: null,
    createComment: vi.fn(),
    updateComment: vi.fn(),
    deleteComment: vi.fn(),
    reportComment: vi.fn(),
    loadComments: vi.fn(),
    clearError: vi.fn(),
  })),
}));

// Mock the auth context
vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 1, name: 'Test User', email: 'test@example.com' },
    isAuthenticated: true,
  })),
}));

// Mock the CSRF hook
vi.mock('../../src/lib/security/csrf', () => ({
  useCsrfToken: vi.fn(() => 'test-csrf-token'),
}));

// Mock the rate limiter hook
vi.mock('../../src/components/comments/hooks/useRateLimit', () => ({
  useRateLimit: vi.fn(() => ({
    canPost: true,
    remainingTime: 0,
    isLimited: false,
  })),
}));

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
    render(<CommentSection {...sectionProps} />);

    expect(screen.getByText('Kommentare')).toBeInTheDocument();
    expect(screen.getByText('Test Blog Post')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    const { useCommentStore } = require('../../src/stores/comment-store');
    useCommentStore.mockReturnValue({
      comments: [],
      isLoading: true,
      error: null,
      createComment: vi.fn(),
      updateComment: vi.fn(),
      deleteComment: vi.fn(),
      reportComment: vi.fn(),
      loadComments: vi.fn(),
      clearError: vi.fn(),
    });

    render(<CommentSection {...sectionProps} />);

    expect(screen.getByText('Lade Kommentare...')).toBeInTheDocument();
  });

  it('should show error state', () => {
    const { useCommentStore } = require('../../src/stores/comment-store');
    useCommentStore.mockReturnValue({
      comments: [],
      isLoading: false,
      error: 'Failed to load comments',
      createComment: vi.fn(),
      updateComment: vi.fn(),
      deleteComment: vi.fn(),
      reportComment: vi.fn(),
      loadComments: vi.fn(),
      clearError: vi.fn(),
    });

    render(<CommentSection {...mockProps} />);

    expect(screen.getByText('Fehler beim Laden der Kommentare')).toBeInTheDocument();
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

    expect(screen.getByPlaceholderText('Schreibe einen Kommentar...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Kommentar posten' })).toBeInTheDocument();
  });

  it('should render guest comment form', () => {
    const { useAuth } = require('../../src/contexts/AuthContext');
    useAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
    });

    render(<CommentForm {...formProps} />);

    expect(screen.getByPlaceholderText('Schreibe einen Kommentar...')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Dein Name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Deine E-Mail')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Kommentar posten' })).toBeInTheDocument();
  });

  it('should show rate limit message when limited', () => {
    const { useRateLimit } = require('../../src/components/comments/hooks/useRateLimit');
    useRateLimit.mockReturnValue({
      canPost: false,
      remainingTime: 30,
      isLimited: true,
    });

    render(<CommentForm {...mockProps} />);

    expect(screen.getByText(/Rate limit erreicht/)).toBeInTheDocument();
  });

  it('should validate comment content length', async () => {
    const user = userEvent.setup();
    render(<CommentForm {...mockProps} />);

    const textarea = screen.getByPlaceholderText('Schreibe einen Kommentar...');
    const submitButton = screen.getByRole('button', { name: 'Kommentar posten' });

    // Test minimum length
    await user.type(textarea, 'Hi');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Kommentar muss mindestens 3 Zeichen lang sein')).toBeInTheDocument();
    });
  });

  it('should validate guest user fields', async () => {
    const { useAuth } = require('../../src/contexts/AuthContext');
    useAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
    });

    const user = userEvent.setup();
    render(<CommentForm {...mockProps} />);

    const textarea = screen.getByPlaceholderText('Schreibe einen Kommentar...');
    const nameInput = screen.getByPlaceholderText('Dein Name');
    const emailInput = screen.getByPlaceholderText('Deine E-Mail');
    const submitButton = screen.getByRole('button', { name: 'Kommentar posten' });

    await user.type(textarea, 'This is a valid comment');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Name ist erforderlich')).toBeInTheDocument();
      expect(screen.getByText('E-Mail ist erforderlich')).toBeInTheDocument();
    });
  });

  it('should validate email format for guest users', async () => {
    const { useAuth } = require('../../src/contexts/AuthContext');
    useAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
    });

    const user = userEvent.setup();
    render(<CommentForm {...mockProps} />);

    const textarea = screen.getByPlaceholderText('Schreibe einen Kommentar...');
    const nameInput = screen.getByPlaceholderText('Dein Name');
    const emailInput = screen.getByPlaceholderText('Deine E-Mail');
    const submitButton = screen.getByRole('button', { name: 'Kommentar posten' });

    await user.type(textarea, 'This is a valid comment');
    await user.type(nameInput, 'Test User');
    await user.type(emailInput, 'invalid-email');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Bitte gib eine gültige E-Mail-Adresse ein')).toBeInTheDocument();
    });
  });
});

describe('CommentList', () => {
  const mockComments: Comment[] = [
    {
      id: 'comment-1',
      content: 'This is the first comment',
      authorId: 1,
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
          authorId: 2,
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
    currentUserId: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render comments list', () => {
    render(
      <CommentList
        onReply={function (content: string, parentId?: string): Promise<void> {
          throw new Error('Function not implemented.');
        }}
        {...mockProps}
      />
    );

    expect(screen.getByText('This is the first comment')).toBeInTheDocument();
    expect(screen.getByText('This is a reply')).toBeInTheDocument();
  });

  it('should show comment actions for own comments', () => {
    render(
      <CommentList
        onReply={function (content: string, parentId?: string): Promise<void> {
          throw new Error('Function not implemented.');
        }}
        {...mockProps}
      />
    );

    expect(screen.getByText('Bearbeiten')).toBeInTheDocument();
    expect(screen.getByText('Löschen')).toBeInTheDocument();
  });

  it('should show report action for other users comments', () => {
    const propsWithDifferentUser = {
      ...mockProps,
      currentUserId: 999, // Different user ID
    };

    render(
      <CommentList
        onReply={function (content: string, parentId?: string): Promise<void> {
          throw new Error('Function not implemented.');
        }}
        {...propsWithDifferentUser}
      />
    );

    expect(screen.getByText('Melden')).toBeInTheDocument();
  });

  it('should handle comment editing', async () => {
    const user = userEvent.setup();
    render(
      <CommentList
        onReply={function (content: string, parentId?: string): Promise<void> {
          throw new Error('Function not implemented.');
        }}
        {...mockProps}
      />
    );

    const editButton = screen.getByText('Bearbeiten');
    await user.click(editButton);

    const editTextarea = screen.getByDisplayValue('This is the first comment');
    await user.clear(editTextarea);
    await user.type(editTextarea, 'Updated comment content');

    const saveButton = screen.getByText('Speichern');
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockProps.onUpdateComment).toHaveBeenCalledWith(
        'comment-1',
        { content: 'Updated comment content' },
        'test-csrf-token'
      );
    });
  });

  it('should handle comment deletion', async () => {
    const user = userEvent.setup();
    render(
      <CommentList
        onReply={function (content: string, parentId?: string): Promise<void> {
          throw new Error('Function not implemented.');
        }}
        {...mockProps}
      />
    );

    const deleteButton = screen.getByText('Löschen');
    await user.click(deleteButton);

    // Should show confirmation dialog
    expect(screen.getByText('Kommentar löschen?')).toBeInTheDocument();

    const confirmButton = screen.getByText('Löschen');
    await user.click(confirmButton);

    await waitFor(() => {
      expect(mockProps.onDeleteComment).toHaveBeenCalledWith('comment-1', 'test-csrf-token');
    });
  });

  it('should handle comment reporting', async () => {
    const propsWithDifferentUser = {
      ...mockProps,
      currentUserId: 999, // Different user ID
    };

    const user = userEvent.setup();
    render(
      <CommentList
        onReply={function (content: string, parentId?: string): Promise<void> {
          throw new Error('Function not implemented.');
        }}
        {...propsWithDifferentUser}
      />
    );

    const reportButton = screen.getByText('Melden');
    await user.click(reportButton);

    // Should show report dialog
    expect(screen.getByText('Kommentar melden')).toBeInTheDocument();

    const spamRadio = screen.getByLabelText('Spam');
    await user.click(spamRadio);

    const submitButton = screen.getByText('Melden');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockProps.onReportComment).toHaveBeenCalledWith('comment-1', {
        reason: 'spam',
        description: '',
      });
    });
  });
});

describe('CommentStats', () => {
  it('should render comment statistics', () => {
    const mockStats = {
      total: 15,
      approved: 12,
      pending: 2,
      rejected: 1,
    };

    render(<CommentStats stats={mockStats} />);

    expect(screen.getByText('15 Kommentare insgesamt')).toBeInTheDocument();
    expect(screen.getByText('12 genehmigt')).toBeInTheDocument();
    expect(screen.getByText('2 ausstehend')).toBeInTheDocument();
    expect(screen.getByText('1 abgelehnt')).toBeInTheDocument();
  });

  it('should handle empty stats', () => {
    const mockStats = {
      total: 0,
      approved: 0,
      pending: 0,
      rejected: 0,
    };

    render(<CommentStats stats={mockStats} />);

    expect(screen.getByText('0 Kommentare insgesamt')).toBeInTheDocument();
  });
});
