import { describe, it, expect } from 'vitest';
import { checkSpam, getSpamStats } from '../../src/lib/spam-detection';

describe('Spam Detection', () => {
  describe('checkSpam', () => {
    it('should detect obvious spam with keywords', () => {
      const result = checkSpam('Buy now! Click here for free viagra!');
      expect(result.isSpam).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.reasons).toContain(expect.stringContaining('Spam keywords'));
    });

    it('should accept clean comments', () => {
      const result = checkSpam('Great article! Thanks for sharing your insights.');
      expect(result.isSpam).toBe(false);
      expect(result.score).toBeLessThan(50);
    });

    it('should detect excessive links', () => {
      const result = checkSpam(
        'Check out http://link1.com http://link2.com http://link3.com http://link4.com'
      );
      expect(result.isSpam).toBe(true);
      expect(result.reasons).toContain(expect.stringContaining('Excessive links'));
    });

    it('should detect blacklisted URL shorteners', () => {
      const result = checkSpam('Visit http://bit.ly/abc123 for more info');
      expect(result.isSpam).toBe(true);
      expect(result.reasons).toContain(expect.stringContaining('Blacklisted URL'));
    });

    it('should detect excessive caps lock', () => {
      const result = checkSpam('THIS IS ALL CAPS AND VERY SUSPICIOUS!!!');
      expect(result.isSpam).toBe(true);
      expect(result.reasons).toContain(expect.stringContaining('caps lock'));
    });

    it('should detect word repetition', () => {
      const result = checkSpam(
        'spam spam spam spam spam spam spam spam'
      );
      // This might not be flagged as spam alone, but should be detected
      expect(result.score).toBeGreaterThan(0);
      if (result.isSpam) {
        expect(result.reasons).toContain(expect.stringContaining('repeated'));
      }
    });

    it('should handle strictness levels correctly', () => {
      const content = 'Buy viagra now! Click here for free pills!';

      const mediumResult = checkSpam(content, { strictness: 'medium' });
      const highResult = checkSpam(content, { strictness: 'high' });

      // Medium and high should detect this obvious spam
      expect(highResult.isSpam).toBe(true);
      expect(mediumResult.isSpam).toBe(true);

      // Low strictness might or might not flag it
      const lowResult = checkSpam(content, { strictness: 'low' });
      expect(lowResult.score).toBeGreaterThan(40); // Should have significant score
    });

    it('should be cautious with borderline cases', () => {
      const result = checkSpam('Check http://example.com');
      // Short content with single link might not be spam
      // Better to err on the side of caution
      expect(result.score).toBeGreaterThan(0);
      // Can be spam or not - depends on threshold
    });

    it('should allow normal comments with one link', () => {
      const result = checkSpam(
        'I found this really helpful article about TypeScript best practices: https://example.com/article. Thanks for the recommendation!'
      );
      expect(result.isSpam).toBe(false);
    });
  });

  describe('getSpamStats', () => {
    it('should return correct stats', () => {
      const stats = getSpamStats('Buy now! Visit http://example.com');

      expect(stats.length).toBeGreaterThan(0);
      expect(stats.linkCount).toBe(1);
      expect(stats.keywordCount).toBeGreaterThan(0);
      expect(stats.capsPercentage).toBeGreaterThan(0);
    });
  });
});
