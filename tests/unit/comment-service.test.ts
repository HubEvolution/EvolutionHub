import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CommentService } from '../../src/lib/services/comment-service';
import type { CreateCommentRequest } from '../../src/lib/types/comments';

// Provide a handle so our module mock for drizzle can use the current mock DB
let currentMockDb: any = null;

vi.mock('drizzle-orm/d1', () => {
  return {
    drizzle: () => currentMockDb,
  };
});

// Local factory to create a fresh mock Drizzle client per test
function makeMockDb() {
  return {
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([])),
      })),
    })),
    // Select builder will be replaced per-test using mockReturnValueOnce with our chain helpers
    select: vi.fn(),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([])),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve([])),
    })),
  };
}

// Chain helpers for different select() shapes used by CommentService
function makeCountChain(result: any) {
  // usage: select(...).from(comments).where(baseWhere) -> resolves to result
  return {
    from: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve(result)),
    })),
  };
}

function makeWhereLimitChain(result: any) {
  return {
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        limit: vi.fn(() => Promise.resolve(result)),
      })),
    })),
  };
}

function makeListChain(result: any) {
  // usage: select(...).from(comments).where(baseWhere).orderBy(...).limit(...).offset(...) -> result
  const tail = {
    offset: vi.fn(() => Promise.resolve(result)),
  };
  const afterLimit = {
    limit: vi.fn(() => tail),
    orderBy: vi.fn(() => tail), // tolerate accidental order
  } as any;
  const afterWhere = {
    where: vi.fn(() => ({
      orderBy: vi.fn(() => ({
        limit: vi.fn(() => ({
          offset: vi.fn(() => Promise.resolve(result)),
        })),
      })),
    })),
  };
  return {
    from: vi.fn(() => ({
      where: afterWhere.where,
      orderBy: afterLimit.orderBy,
      limit: afterLimit.limit,
    })),
  } as any;
}

function makeJoinThenWhereLimitChain(result: any) {
  // usage: select(...).from(comments).leftJoin(...).where(...).limit(1) -> result
  return {
    from: vi.fn(() => ({
      leftJoin: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve(result)),
        })),
      })),
    })),
  };
}

function makeWhereThenOrderChain(result: any) {
  // usage: select(...).from(comments).where(...).orderBy(...) -> result
  return {
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        orderBy: vi.fn(() => Promise.resolve(result)),
      })),
    })),
  };
}

function makeGroupByChain(result: any) {
  // usage: select(...).from(comments).groupBy(comments.status) -> result
  return {
    from: vi.fn(() => ({
      groupBy: vi.fn(() => Promise.resolve(result)),
    })),
  };
}

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
    mockDb = makeMockDb();
    currentMockDb = mockDb; // drizzle() returns this
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
      // Provide rawDb.prepare stub for user lookup
      (commentService as any).rawDb = {
        prepare: vi.fn(() => ({
          bind: vi.fn(() => ({
            first: vi.fn(async () => ({ name: 'Test User', email: 'test@example.com' })),
          })),
        })),
      };
      // getCommentById select chain after insert
      mockSelect.mockReturnValueOnce(
        makeJoinThenWhereLimitChain([
          {
            comment: {
              id: 'test-id-123',
              content: request.content,
              authorId: 'user-1',
              authorName: 'Test User',
              authorEmail: 'test@example.com',
              parentId: null,
              entityType: request.entityType,
              entityId: request.entityId,
              status: 'approved',
              isEdited: false,
              createdAt: Math.floor(Date.now() / 1000),
              updatedAt: Math.floor(Date.now() / 1000),
            },
            reportCount: 0,
          },
        ])
      );

      const mockInsert = mockDb.insert as any;
      mockInsert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 'test-id-123' }]),
        }),
      });

      vi.spyOn(CommentService.prototype as any, 'getCommentById').mockResolvedValue({
        id: 'test-id-123',
        content: request.content,
        authorId: 'user-1',
        authorName: 'Test User',
        authorEmail: 'test@example.com',
        parentId: null,
        entityType: request.entityType,
        entityId: request.entityId,
        status: 'approved',
        isEdited: false,
        createdAt: Math.floor(Date.now() / 1000),
        updatedAt: Math.floor(Date.now() / 1000),
        reportCount: 0,
        replies: [],
      } as any);

      const result = await commentService.createComment(request, 'user-1');

      expect(result).toBeDefined();
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
          returning: vi.fn().mockResolvedValue([{ id: 'test-id-123' }]),
        }),
      });

      // getCommentById chain for created comment
      (mockDb.select as any).mockReturnValueOnce(
        makeJoinThenWhereLimitChain([
          {
            comment: {
              id: 'test-id-123',
              content: request.content,
              authorId: null,
              authorName: request.authorName,
              authorEmail: request.authorEmail,
              parentId: null,
              entityType: request.entityType,
              entityId: request.entityId,
              status: 'pending',
              isEdited: false,
              createdAt: Math.floor(Date.now() / 1000),
              updatedAt: Math.floor(Date.now() / 1000),
            },
            reportCount: 0,
          },
        ])
      );

      vi.spyOn(commentService as any, 'getCommentById').mockResolvedValue({
        id: 'test-id-123',
        content: request.content,
        authorId: null,
        authorName: request.authorName,
        authorEmail: request.authorEmail,
        parentId: null,
        entityType: request.entityType,
        entityId: request.entityId,
        status: 'pending',
        isEdited: false,
        createdAt: Math.floor(Date.now() / 1000),
        updatedAt: Math.floor(Date.now() / 1000),
        reportCount: 0,
        replies: [],
      } as any);

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
        content:
          'BUY NOW! Click here! http://bit.ly/abc http://example.com http://example.com http://example.com http://example.com',
        entityType: 'blog_post',
        entityId: 'test-post-123',
      };

      await expect(commentService.createComment(request)).rejects.toThrow(
        /Comment rejected due to spam detection/
      );
    });
  });

  describe('updateComment', () => {
    it('should update comment successfully', async () => {
      const updateRequest = { content: 'Updated comment content' };

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn(() => Promise.resolve([])),
        }),
      });

      // existing comment lookup before update
      (mockDb.select as any).mockReturnValueOnce(
        makeWhereLimitChain([
          {
            authorId: 'user-1',
            status: 'approved',
            entityType: 'blog_post',
            entityId: 'test-post-123',
          },
        ])
      );

      // getCommentById chain after update
      (mockDb.select as any).mockReturnValueOnce(
        makeJoinThenWhereLimitChain([
          {
            comment: {
              id: 'test-id-123',
              content: 'Updated comment content',
              authorId: 'user-1',
              authorName: 'Updated User',
              authorEmail: 'updated@example.com',
              parentId: null,
              entityType: 'blog_post',
              entityId: 'test-post-123',
              status: 'approved',
              isEdited: true,
              createdAt: Math.floor(Date.now() / 1000) - 10,
              updatedAt: Math.floor(Date.now() / 1000),
            },
            reportCount: 0,
          },
        ])
      );

      vi.spyOn(commentService as any, 'getCommentById').mockResolvedValue({
        id: 'test-id-123',
        content: 'Updated comment content',
        authorId: 'user-1',
        authorName: 'Updated User',
        authorEmail: 'updated@example.com',
        parentId: null,
        entityType: 'blog_post',
        entityId: 'test-post-123',
        status: 'approved',
        isEdited: true,
        createdAt: Math.floor(Date.now() / 1000) - 10,
        updatedAt: Math.floor(Date.now() / 1000),
        reportCount: 0,
        replies: [],
      } as any);

      const result = await commentService.updateComment(
        'test-id-123',
        updateRequest,
        'user-1',
        'valid-csrf-token'
      );

      expect(result).toBeDefined();
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should reject update with invalid content', async () => {
      const updateRequest = { content: 'Hi' };

      await expect(
        commentService.updateComment('test-id-123', updateRequest, 'user-1', 'valid-csrf-token')
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

      // existing comment lookup before delete
      (mockDb.select as any).mockReturnValueOnce(
        makeWhereLimitChain([
          {
            authorId: 'user-1',
            status: 'approved',
            entityType: 'blog_post',
            entityId: 'test-post-123',
          },
        ])
      );

      await commentService.deleteComment('test-id-123', 'user-1', 'valid-csrf-token');

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

      mockDb.select.mockReturnValueOnce(
        makeJoinThenWhereLimitChain([{ comment: mockComment, reportCount: 0 }])
      );

      const result = await commentService.getCommentById('test-id-123');

      expect(result).toBeDefined();
      expect(result.id).toBe('test-id-123');
      expect(mockDb.select).toHaveBeenCalled();
    });

    it('should throw error when comment not found', async () => {
      (mockDb.select as any).mockReturnValueOnce(makeJoinThenWhereLimitChain([]));

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
        .mockReturnValueOnce(makeCountChain([{ count: 2 }])) // total count
        .mockReturnValueOnce(makeListChain(mockComments)) // comments list
        .mockReturnValueOnce(makeWhereThenOrderChain([])); // replies list (empty)

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
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            {
              id: 1,
              commentId: 'test-id-123',
              moderatorId: 'mod-1',
              action: 'approve',
              reason: 'Good content',
              createdAt: Math.floor(Date.now() / 1000),
            },
          ]),
        }),
      });

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      // getCommentById after moderation
      (mockDb.select as any).mockReturnValueOnce(
        makeJoinThenWhereLimitChain([
          {
            comment: {
              id: 'test-id-123',
              content: 'Some content',
              authorId: 'user-1',
              authorName: 'User',
              authorEmail: 'user@example.com',
              parentId: null,
              entityType: 'blog_post',
              entityId: 'test-post-123',
              status: 'approved',
              isEdited: false,
              createdAt: Math.floor(Date.now() / 1000) - 10,
              updatedAt: Math.floor(Date.now() / 1000),
            },
            reportCount: 0,
          },
        ])
      );

      vi.spyOn(commentService as any, 'getCommentById').mockResolvedValue({
        id: 'test-id-123',
        content: 'Some content',
        authorId: 'user-1',
        authorName: 'User',
        authorEmail: 'user@example.com',
        parentId: null,
        entityType: 'blog_post',
        entityId: 'test-post-123',
        status: 'approved',
        isEdited: false,
        createdAt: Math.floor(Date.now() / 1000) - 10,
        updatedAt: Math.floor(Date.now() / 1000),
        reportCount: 0,
        replies: [],
      } as any);

      const result = await commentService.moderateComment(
        'test-id-123',
        moderationRequest,
        'mod-1'
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
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            {
              id: 1,
              commentId: 'test-id-123',
              reason: 'spam',
              description: 'This is spam content',
              status: 'pending',
              createdAt: Math.floor(Date.now() / 1000),
            },
          ]),
        }),
      });

      // count for getCommentReportCount
      (mockDb.select as any)
        .mockReturnValueOnce(makeCountChain([{ count: 1 }]))
        // getCommentById after report
        .mockReturnValueOnce(
          makeJoinThenWhereLimitChain([
            {
              comment: {
                id: 'test-id-123',
                content: 'Some content',
                authorId: 'user-1',
                authorName: 'User',
                authorEmail: 'user@example.com',
                parentId: null,
                entityType: 'blog_post',
                entityId: 'test-post-123',
                status: 'approved',
                isEdited: false,
                createdAt: Math.floor(Date.now() / 1000) - 10,
                updatedAt: Math.floor(Date.now() / 1000),
              },
              reportCount: 1,
            },
          ])
        );

      vi.spyOn(CommentService.prototype as any, 'getCommentReportCount').mockResolvedValue(
        1 as any
      );
      vi.spyOn(CommentService.prototype as any, 'getCommentById').mockResolvedValue({
        id: 'test-id-123',
        content: 'Some content',
        authorId: 'user-1',
        authorName: 'User',
        authorEmail: 'user@example.com',
        parentId: null,
        entityType: 'blog_post',
        entityId: 'test-post-123',
        status: 'approved',
        isEdited: false,
        createdAt: Math.floor(Date.now() / 1000) - 10,
        updatedAt: Math.floor(Date.now() / 1000),
        reportCount: 1,
        replies: [],
      } as any);

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

      mockDb.select.mockReturnValueOnce(makeGroupByChain(mockStats));

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
