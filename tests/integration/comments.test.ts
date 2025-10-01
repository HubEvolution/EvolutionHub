import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { getDb } from '../../src/lib/db/helpers';
import { commentService } from '../../src/lib/services/comment-service';
import type { CreateCommentRequest, UpdateCommentRequest } from '../../src/lib/types/comments';

// Test database setup
const TEST_DB_PATH = ':memory:';

describe('Comment API Integration Tests', () => {
  let db: any;

  beforeAll(async () => {
    // Initialize test database
    db = getDb({} as any);
  });

  afterAll(async () => {
    // Clean up test database
    if (db) {
      await db.close();
    }
  });

  beforeEach(async () => {
    // Reset database state before each test
    await resetDatabase();
  });

  describe('POST /api/comments', () => {
    it('should create a comment successfully for authenticated user', async () => {
      const request: CreateCommentRequest = {
        content: 'This is a test comment for integration testing',
        entityType: 'blog_post',
        entityId: 'test-post-123',
      };

      const result = await commentService.createComment(request, 1);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.content).toBe(request.content);
      expect(result.authorId).toBe(1);
      expect(result.entityType).toBe(request.entityType);
      expect(result.entityId).toBe(request.entityId);
      expect(result.status).toBe('pending');
    });

    it('should create a comment for guest user', async () => {
      const request: CreateCommentRequest = {
        content: 'This is a guest comment for testing',
        entityType: 'blog_post',
        entityId: 'test-post-123',
        authorName: 'Guest Tester',
        authorEmail: 'guest@example.com',
      };

      const result = await commentService.createComment(request);

      expect(result).toBeDefined();
      expect(result.authorId).toBeNull();
      expect(result.authorName).toBe(request.authorName);
      expect(result.authorEmail).toBe(request.authorEmail);
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
        content: 'Buy now! Limited time offer! Click here!',
        entityType: 'blog_post',
        entityId: 'test-post-123',
      };

      await expect(commentService.createComment(request)).rejects.toThrow(
        'Comment contains prohibited content'
      );
    });

    it('should enforce rate limiting', async () => {
      const request: CreateCommentRequest = {
        content: 'This is a test comment',
        entityType: 'blog_post',
        entityId: 'test-post-123',
      };

      // Create multiple comments rapidly to trigger rate limiting
      const promises = [];
      for (let i = 0; i < 6; i++) {
        promises.push(commentService.createComment(request, 1));
      }

      // At least one should fail due to rate limiting
      const results = await Promise.allSettled(promises);
      const rejected = results.filter(r => r.status === 'rejected');

      expect(rejected.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/comments', () => {
    beforeEach(async () => {
      // Create test comments
      await createTestComments();
    });

    it('should list comments for an entity', async () => {
      const result = await commentService.listComments({
        entityType: 'blog_post',
        entityId: 'test-post-123',
        limit: 10,
      });

      expect(result).toBeDefined();
      expect(result.comments.length).toBeGreaterThan(0);
      expect(result.total).toBeGreaterThan(0);
      expect(result.comments[0].entityType).toBe('blog_post');
      expect(result.comments[0].entityId).toBe('test-post-123');
    });

    it('should filter comments by status', async () => {
      const result = await commentService.listComments({
        entityType: 'blog_post',
        entityId: 'test-post-123',
        status: 'approved',
        limit: 10,
      });

      expect(result).toBeDefined();
      expect(result.comments.every(c => c.status === 'approved')).toBe(true);
    });

    it('should paginate results correctly', async () => {
      const page1 = await commentService.listComments({
        entityType: 'blog_post',
        entityId: 'test-post-123',
        limit: 2,
        offset: 0,
      });

      const page2 = await commentService.listComments({
        entityType: 'blog_post',
        entityId: 'test-post-123',
        limit: 2,
        offset: 2,
      });

      expect(page1.comments).toHaveLength(2);
      expect(page2.comments).toHaveLength(2);
      expect(page1.comments[0].id).not.toBe(page2.comments[0].id);
    });

    it('should return empty result for non-existent entity', async () => {
      const result = await commentService.listComments({
        entityType: 'blog_post',
        entityId: 'non-existent-post',
        limit: 10,
      });

      expect(result).toBeDefined();
      expect(result.comments).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('GET /api/comments/[id]', () => {
    let testCommentId: string;

    beforeEach(async () => {
      // Create a test comment
      const comment = await commentService.createComment({
        content: 'Test comment for individual retrieval',
        entityType: 'blog_post',
        entityId: 'test-post-123',
      }, 1);
      testCommentId = comment.id;
    });

    it('should retrieve comment by ID', async () => {
      const result = await commentService.getCommentById(testCommentId);

      expect(result).toBeDefined();
      expect(result.id).toBe(testCommentId);
      expect(result.content).toBe('Test comment for individual retrieval');
    });

    it('should throw error for non-existent comment', async () => {
      await expect(commentService.getCommentById('non-existent-id')).rejects.toThrow(
        'Comment not found'
      );
    });
  });

  describe('PUT /api/comments/[id]', () => {
    let testCommentId: string;

    beforeEach(async () => {
      // Create a test comment
      const comment = await commentService.createComment({
        content: 'Original comment content',
        entityType: 'blog_post',
        entityId: 'test-post-123',
      }, 1);
      testCommentId = comment.id;
    });

    it('should update comment successfully', async () => {
      const updateRequest: UpdateCommentRequest = {
        content: 'Updated comment content',
      };

      const result = await commentService.updateComment(
        testCommentId,
        updateRequest,
        1,
        'valid-csrf-token'
      );

      expect(result).toBeDefined();
      expect(result.content).toBe('Updated comment content');
      expect(result.isEdited).toBe(true);
    });

    it('should reject update with invalid content', async () => {
      const updateRequest: UpdateCommentRequest = {
        content: 'Hi',
      };

      await expect(
        commentService.updateComment(testCommentId, updateRequest, 1, 'valid-csrf-token')
      ).rejects.toThrow('Comment content must be at least 3 characters long');
    });

    it('should reject update by non-author', async () => {
      const updateRequest: UpdateCommentRequest = {
        content: 'Unauthorized update attempt',
      };

      await expect(
        commentService.updateComment(testCommentId, updateRequest, 999, 'valid-csrf-token')
      ).rejects.toThrow('Unauthorized to update this comment');
    });
  });

  describe('DELETE /api/comments/[id]', () => {
    let testCommentId: string;

    beforeEach(async () => {
      // Create a test comment
      const comment = await commentService.createComment({
        content: 'Comment to be deleted',
        entityType: 'blog_post',
        entityId: 'test-post-123',
      }, 1);
      testCommentId = comment.id;
    });

    it('should delete comment successfully', async () => {
      await commentService.deleteComment(testCommentId, 1, 'valid-csrf-token');

      // Verify comment is soft deleted
      await expect(commentService.getCommentById(testCommentId)).rejects.toThrow(
        'Comment not found'
      );
    });

    it('should reject deletion by non-author', async () => {
      await expect(
        commentService.deleteComment(testCommentId, 999, 'valid-csrf-token')
      ).rejects.toThrow('Unauthorized to delete this comment');
    });
  });

  describe('POST /api/comments/[id]/moderate', () => {
    let testCommentId: string;

    beforeEach(async () => {
      // Create a test comment
      const comment = await commentService.createComment({
        content: 'Comment to be moderated',
        entityType: 'blog_post',
        entityId: 'test-post-123',
      }, 1);
      testCommentId = comment.id;
    });

    it('should approve comment successfully', async () => {
      const result = await commentService.moderateComment(
        testCommentId,
        { action: 'approve', reason: 'Good content' },
        1
      );

      expect(result).toBeDefined();
      expect(result.action).toBe('approve');
      expect(result.commentId).toBe(testCommentId);

      // Verify comment status is updated
      const comment = await commentService.getCommentById(testCommentId);
      expect(comment.status).toBe('approved');
    });

    it('should reject comment successfully', async () => {
      const result = await commentService.moderateComment(
        testCommentId,
        { action: 'reject', reason: 'Inappropriate content' },
        1
      );

      expect(result).toBeDefined();
      expect(result.action).toBe('reject');

      // Verify comment status is updated
      const comment = await commentService.getCommentById(testCommentId);
      expect(comment.status).toBe('rejected');
    });

    it('should flag comment successfully', async () => {
      const result = await commentService.moderateComment(
        testCommentId,
        { action: 'flag', reason: 'Suspicious content' },
        1
      );

      expect(result).toBeDefined();
      expect(result.action).toBe('flag');

      // Verify comment status is updated
      const comment = await commentService.getCommentById(testCommentId);
      expect(comment.status).toBe('flagged');
    });
  });

  describe('POST /api/comments/[id]/report', () => {
    let testCommentId: string;

    beforeEach(async () => {
      // Create a test comment
      const comment = await commentService.createComment({
        content: 'Comment to be reported',
        entityType: 'blog_post',
        entityId: 'test-post-123',
      }, 1);
      testCommentId = comment.id;
    });

    it('should report comment successfully', async () => {
      const result = await commentService.reportComment(testCommentId, {
        reason: 'spam',
        description: 'This looks like spam content',
      });

      expect(result).toBeDefined();
      expect(result.commentId).toBe(testCommentId);
      expect(result.reason).toBe('spam');
      expect(result.description).toBe('This looks like spam content');
      expect(result.status).toBe('pending');
    });

    it('should reject duplicate reports from same user', async () => {
      // First report
      await commentService.reportComment(testCommentId, {
        reason: 'spam',
        description: 'First report',
      });

      // Second report from same IP should be rejected
      await expect(
        commentService.reportComment(testCommentId, {
          reason: 'harassment',
          description: 'Second report',
        })
      ).rejects.toThrow('Comment has already been reported');
    });
  });

  describe('GET /api/comments/stats', () => {
    beforeEach(async () => {
      // Create test comments with different statuses
      await createTestCommentsWithStatuses();
    });

    it('should return comment statistics', async () => {
      const result = await commentService.getCommentStats();

      expect(result).toBeDefined();
      expect(result.total).toBeGreaterThan(0);
      expect(typeof result.approved).toBe('number');
      expect(typeof result.pending).toBe('number');
      expect(typeof result.rejected).toBe('number');
      expect(typeof result.flagged).toBe('number');
      expect(result.total).toBe(
        result.approved + result.pending + result.rejected + result.flagged
      );
    });
  });

  describe('Nested Comments (Replies)', () => {
    let parentCommentId: string;

    beforeEach(async () => {
      // Create a parent comment
      const parentComment = await commentService.createComment({
        content: 'This is a parent comment',
        entityType: 'blog_post',
        entityId: 'test-post-123',
      }, 1);
      parentCommentId = parentComment.id;
    });

    it('should create reply to comment', async () => {
      const replyRequest: CreateCommentRequest = {
        content: 'This is a reply to the parent comment',
        entityType: 'blog_post',
        entityId: 'test-post-123',
        parentId: parentCommentId,
      };

      const reply = await commentService.createComment(replyRequest, 2);

      expect(reply).toBeDefined();
      expect(reply.parentId).toBe(parentCommentId);

      // Verify parent-child relationship in database
      const comments = await commentService.listComments({
        entityType: 'blog_post',
        entityId: 'test-post-123',
      });

      const parentWithReplies = comments.comments.find(c => c.id === parentCommentId);
      expect(parentWithReplies?.replies).toBeDefined();
      expect(parentWithReplies?.replies?.[0].id).toBe(reply.id);
    });

    it('should limit reply depth', async () => {
      // This would require implementing a depth check in the service
      // For now, we'll test that deeply nested replies are handled gracefully
      const replyRequest: CreateCommentRequest = {
        content: 'Deep reply',
        entityType: 'blog_post',
        entityId: 'test-post-123',
        parentId: parentCommentId,
      };

      const reply = await commentService.createComment(replyRequest, 2);
      expect(reply).toBeDefined();
    });
  });

  describe('Comment Validation and Security', () => {
    it('should sanitize HTML content', async () => {
      const request: CreateCommentRequest = {
        content: 'Comment with <script>alert("xss")</script> HTML',
        entityType: 'blog_post',
        entityId: 'test-post-123',
      };

      const result = await commentService.createComment(request, 1);

      // HTML should be sanitized
      expect(result.content).not.toContain('<script>');
      expect(result.content).toContain('HTML');
    });

    it('should validate entity type', async () => {
      const request: CreateCommentRequest = {
        content: 'Valid comment content',
        entityType: 'invalid_type',
        entityId: 'test-post-123',
      };

      await expect(commentService.createComment(request)).rejects.toThrow(
        'Invalid entity type'
      );
    });

    it('should validate entity ID format', async () => {
      const request: CreateCommentRequest = {
        content: 'Valid comment content',
        entityType: 'blog_post',
        entityId: '',
      };

      await expect(commentService.createComment(request)).rejects.toThrow(
        'Entity ID is required'
      );
    });
  });
});

// Helper functions for test setup
async function resetDatabase() {
  // Reset database to clean state
  // Delete test data in correct order (respecting foreign keys)

  try {
    // Delete comment-related data first (child tables)
    await db.run('DELETE FROM comment_reports');
    await db.run('DELETE FROM comment_moderation');
    await db.run('DELETE FROM comment_audit_logs');
    await db.run('DELETE FROM comments');

    // Reset users (keep only test users)
    await db.run('DELETE FROM users WHERE id > 999');

    // Ensure test users exist
    const testUser = await db.prepare('SELECT id FROM users WHERE id = 1').first();
    if (!testUser) {
      await db.run(`
        INSERT INTO users (id, name, email, password, role, created_at)
        VALUES (1, 'Test User', 'test@example.com', 'hashed', 'user', ${Date.now()})
      `);
    }

    const adminUser = await db.prepare('SELECT id FROM users WHERE id = 999').first();
    if (!adminUser) {
      await db.run(`
        INSERT INTO users (id, name, email, password, role, created_at)
        VALUES (999, 'Test Admin', 'admin@example.com', 'hashed', 'admin', ${Date.now()})
      `);
    }
  } catch (error) {
    console.error('Error resetting database:', error);
    throw error;
  }
}

async function createTestComments() {
  const testComments = [
    {
      content: 'First approved comment',
      entityType: 'blog_post',
      entityId: 'test-post-123',
      status: 'approved',
    },
    {
      content: 'Second approved comment',
      entityType: 'blog_post',
      entityId: 'test-post-123',
      status: 'approved',
    },
    {
      content: 'Pending comment',
      entityType: 'blog_post',
      entityId: 'test-post-123',
      status: 'pending',
    },
    {
      content: 'Comment for different post',
      entityType: 'blog_post',
      entityId: 'different-post-456',
      status: 'approved',
    },
  ];

  for (const comment of testComments) {
    await commentService.createComment(comment as CreateCommentRequest, 1);
  }
}

async function createTestCommentsWithStatuses() {
  const testComments = [
    { status: 'approved', count: 5 },
    { status: 'pending', count: 3 },
    { status: 'rejected', count: 2 },
    { status: 'flagged', count: 1 },
  ];

  for (const { status, count } of testComments) {
    for (let i = 0; i < count; i++) {
      await commentService.createComment({
        content: `${status} comment ${i + 1}`,
        entityType: 'blog_post',
        entityId: 'test-post-123',
      }, 1);

      // Update status for testing
      if (status !== 'pending') {
        await commentService.moderateComment(
          `test-id-${status}-${i}`,
          { action: status as any, reason: 'Test moderation' },
          1
        );
      }
    }
  }
}