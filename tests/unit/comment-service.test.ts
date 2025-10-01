import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CommentService } from '../../src/lib/services/comment-service';
import { getDb } from '../../src/lib/db/helpers';
import type { CreateCommentRequest } from '../../src/lib/types/comments';

// Mock the database
vi.mock('../../src/lib/db/helpers', () => ({
  getDb: vi.fn(() => ({
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([]))
      }))
    })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          leftJoin: vi.fn(() => ({
            groupBy: vi.fn(() => ({
              orderBy: vi.fn(() => ({
                limit: vi.fn(() => ({
                  offset: vi.fn(() => Promise.resolve([]))
                }))
              }))
            }))
          }))
        }))
      }))
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([]))
      }))
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve([]))
    })),
  })),
}));

// Mock the security modules
vi.mock('../../src/lib/security/csrf', () => ({
  validateCsrfToken: vi.fn(() => Promise.resolve(true)),
}));

vi.mock('../../src/lib/rate-limiter', () => ({
  rateLimit: vi.fn(() => Promise.resolve()),
}));

// Mock the ID generator
vi.mock('../../src/lib/utils/id-generator', () => ({
  generateId: vi.fn(() => 'test-id-123'),
}));

describe('CommentService', () => {
  let commentService: CommentService;
  let mockDb: any;

  beforeEach(() => {
    mockDb = getDb({} as any);
    commentService = new CommentService({} as any);
    vi.clearAllMocks();
  });

  describe('createComment', () => {
    it('should create a comment successfully for authenticated user', async () => {
      const request: CreateCommentRequest = {
        content: 'This is a test comment',
        entityType: 'blog_post',
        entityId: 'test-post-123',
      };

      // Mock successful database operations
      const mockSelect = mockDb.select as any;
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            { name: 'Test User', email: 'test@example.com' }
          ])
        })
      });

      const mockInsert = mockDb.insert as any;
      mockInsert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 'test-id-123' }])
        })
      });

      const result = await commentService.createComment(request, 1);

      expect(result).toBeDefined();
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should create a comment for guest user', async () => {
      const request: CreateCommentRequest = {
        content: 'This is a guest comment',
        entityType: 'blog_post',
        entityId: 'test-post-123',
        authorName: 'Guest User',
        authorEmail: 'guest@example.com',
      };

      const mockInsert = mockDb.insert as any;
      mockInsert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 'test-id-123' }])
        })
      });

      const result = await commentService.createComment(request);

      expect(result).toBeDefined();
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should reject comment with insufficient content length', async () => {
      const request: CreateCommentRequest = {
        content: 'Hi',
        entityType: 'blog_post',
        entityId: 'test-post-123',
      };

      await expect(commentService.createComment(request)).rejects.toThrow(
        'Comment content must be at least 3 characters long'
      );
    });

    it('should reject comment with excessive length', async () => {
      const request: CreateCommentRequest = {
        content: 'a'.repeat(2001),
        entityType: 'blog_post',
        entityId: 'test-post-123',
      };

      await expect(commentService.createComment(request)).rejects.toThrow(
        'Comment content must be less than 2000 characters'
      );
    });

    it('should reject comment with spam content', async () => {
      const request: CreateCommentRequest = {
        content: 'This is spam content with buy now keywords',
        entityType: 'blog_post',
        entityId: 'test-post-123',
      };

      await expect(commentService.createComment(request)).rejects.toThrow(
        'Comment contains prohibited content'
      );
    });
  });

  describe('updateComment', () => {
    it('should update comment successfully', async () => {
      const updateRequest = {
        content: 'Updated comment content',
      };

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await commentService.updateComment(
        'test-id-123',
        updateRequest,
        1,
        'valid-csrf-token'
      );

      expect(result).toBeDefined();
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should reject update with invalid content', async () => {
      const updateRequest = {
        content: 'Hi',
      };

      await expect(
        commentService.updateComment('test-id-123', updateRequest, 1, 'valid-csrf-token')
      ).rejects.toThrow('Comment content must be at least 3 characters long');
    });
  });

  describe('deleteComment', () => {
    it('should delete comment successfully', async () => {
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      await commentService.deleteComment('test-id-123', 1, 'valid-csrf-token');

      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe('getCommentById', () => {
    it('should return comment when found', async () => {
      const mockComment = {
        id: 'test-id-123',
        content: 'Test comment',
        authorId: 1,
        authorName: 'Test User',
        authorEmail: 'test@example.com',
        entityType: 'blog_post',
        entityId: 'test-post-123',
        status: 'approved',
        isEdited: false,
        createdAt: Math.floor(Date.now() / 1000),
        updatedAt: Math.floor(Date.now() / 1000),
      };

      mockDb.select.mockResolvedValueOnce([
        { comment: mockComment, reportCount: 0 }
      ]);

      const result = await commentService.getCommentById('test-id-123');

      expect(result).toBeDefined();
      expect(result.id).toBe('test-id-123');
      expect(mockDb.select).toHaveBeenCalled();
    });

    it('should throw error when comment not found', async () => {
      mockDb.select.mockResolvedValueOnce([]);

      await expect(commentService.getCommentById('non-existent-id')).rejects.toThrow(
        'Comment not found'
      );
    });
  });

  describe('listComments', () => {
    it('should return filtered comments', async () => {
      const mockComments = [
        {
          comment: {
            id: 'test-id-1',
            content: 'First comment',
            status: 'approved',
          },
          reportCount: 0,
        },
        {
          comment: {
            id: 'test-id-2',
            content: 'Second comment',
            status: 'approved',
          },
          reportCount: 1,
        },
      ];

      mockDb.select
        .mockResolvedValueOnce([{ count: 2 }]) // Total count
        .mockResolvedValueOnce(mockComments); // Comments list

      const result = await commentService.listComments({
        entityType: 'blog_post',
        entityId: 'test-post-123',
        limit: 10,
      });

      expect(result).toBeDefined();
      expect(result.comments).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(mockDb.select).toHaveBeenCalled();
    });
  });

  describe('moderateComment', () => {
    it('should moderate comment successfully', async () => {
      const moderationRequest = {
        action: 'approve' as const,
        reason: 'Good content',
      };

      mockDb.insert.mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          {
            id: 1,
            commentId: 'test-id-123',
            moderatorId: 1,
            action: 'approve',
            reason: 'Good content',
            createdAt: Math.floor(Date.now() / 1000),
          }
        ]),
      });

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await commentService.moderateComment(
        'test-id-123',
        moderationRequest,
        1
      );

      expect(result).toBeDefined();
      expect(result.action).toBe('approve');
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe('reportComment', () => {
    it('should report comment successfully', async () => {
      const reportRequest = {
        reason: 'spam' as const,
        description: 'This is spam content',
      };

      mockDb.insert.mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          {
            id: 1,
            commentId: 'test-id-123',
            reason: 'spam',
            description: 'This is spam content',
            status: 'pending',
            createdAt: Math.floor(Date.now() / 1000),
          }
        ]),
      });

      const result = await commentService.reportComment('test-id-123', reportRequest);

      expect(result).toBeDefined();
      expect(result.reason).toBe('spam');
      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  describe('getCommentStats', () => {
    it('should return comment statistics', async () => {
      const mockStats = [
        { status: 'approved', count: 10 },
        { status: 'pending', count: 3 },
        { status: 'rejected', count: 2 },
      ];

      mockDb.select.mockResolvedValueOnce(mockStats);

      const result = await commentService.getCommentStats();

      expect(result).toBeDefined();
      expect(result.total).toBe(15);
      expect(result.approved).toBe(10);
      expect(result.pending).toBe(3);
      expect(result.rejected).toBe(2);
      expect(mockDb.select).toHaveBeenCalled();
    });
  });
});