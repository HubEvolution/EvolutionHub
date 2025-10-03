/**
 * Unit tests for WebscraperService
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WebscraperService } from '../../../src/lib/services/webscraper-service';

// Mock KV
const mockKV = {
  get: vi.fn(),
  put: vi.fn(),
};

// Mock fetch
global.fetch = vi.fn();

describe('WebscraperService', () => {
  let service: WebscraperService;
  const mockEnv = {
    KV_WEBSCRAPER: mockKV as any,
    ENVIRONMENT: 'test',
    PUBLIC_WEBSCRAPER_V1: 'true',
    WEBSCRAPER_GUEST_LIMIT: '5',
    WEBSCRAPER_USER_LIMIT: '20',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new WebscraperService(mockEnv);
  });

  describe('URL Validation', () => {
    it('should reject non-HTTP(S) URLs', async () => {
      const input = { url: 'ftp://example.com' };

      await expect(service.scrape(input, 'guest', 'guest-123')).rejects.toThrow(
        'Only HTTP/HTTPS URLs are allowed'
      );
    });

    it('should reject blocked domains', async () => {
      const input = { url: 'http://localhost:3000' };

      await expect(service.scrape(input, 'guest', 'guest-123')).rejects.toThrow(
        'URL domain is blocked'
      );
    });

    it('should reject too long URLs', async () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(3000);
      const input = { url: longUrl };

      await expect(service.scrape(input, 'guest', 'guest-123')).rejects.toThrow(
        'URL too long or empty'
      );
    });

    it('should accept valid HTTP URLs', async () => {
      const input = { url: 'https://example.com' };

      // Mock KV to simulate no quota used
      mockKV.get.mockResolvedValue(null);
      mockKV.put.mockResolvedValue(undefined);

      // Mock fetch for robots.txt (allow)
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
      });

      // Mock fetch for actual page
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: {
          get: (key: string) => {
            if (key === 'content-type') return 'text/html';
            if (key === 'content-length') return '1000';
            return null;
          },
        },
        text: async () => '<html><head><title>Test</title></head><body><p>Test</p></body></html>',
      });

      const result = await service.scrape(input, 'guest', 'guest-123');

      expect(result).toBeDefined();
      expect(result.result.title).toBe('Test');
    });
  });

  describe('Quota Management', () => {
    it('should enforce guest quota', async () => {
      const input = { url: 'https://example.com' };

      // Mock KV to simulate quota exceeded (5/5 used)
      mockKV.get.mockResolvedValue(
        JSON.stringify({
          count: 5,
          resetAt: Date.now() + 86400000,
        })
      );

      await expect(service.scrape(input, 'guest', 'guest-123')).rejects.toThrow('Quota exceeded');
    });

    it('should allow scraping when under quota', async () => {
      const input = { url: 'https://example.com' };

      // Mock KV to simulate quota not exceeded (2/5 used)
      mockKV.get.mockResolvedValueOnce(
        JSON.stringify({
          count: 2,
          resetAt: Date.now() + 86400000,
        })
      );

      mockKV.put.mockResolvedValue(undefined);

      // Mock fetch for robots.txt
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
      });

      // Mock fetch for actual page
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: {
          get: (key: string) => {
            if (key === 'content-type') return 'text/html';
            if (key === 'content-length') return '1000';
            return null;
          },
        },
        text: async () => '<html><head><title>Test</title></head><body><p>Test</p></body></html>',
      });

      const result = await service.scrape(input, 'guest', 'guest-123');

      expect(result).toBeDefined();
      // Note: incrementUsage is called, incrementing the counter
      expect(result.usage.used).toBeGreaterThan(0);
    });
  });

  describe('Robots.txt Compliance', () => {
    it('should allow scraping when robots.txt allows', async () => {
      const input = { url: 'https://example.com/page' };

      mockKV.get.mockResolvedValue(null);
      mockKV.put.mockResolvedValue(undefined);

      // Mock fetch for robots.txt (allow all)
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        text: async () => 'User-agent: *\nAllow: /',
      });

      // Mock fetch for actual page
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: {
          get: (key: string) => {
            if (key === 'content-type') return 'text/html';
            if (key === 'content-length') return '1000';
            return null;
          },
        },
        text: async () => '<html><head><title>Test</title></head><body><p>Test</p></body></html>',
      });

      const result = await service.scrape(input, 'guest', 'guest-123');

      expect(result).toBeDefined();
      expect(result.result.robotsTxtAllowed).toBe(true);
    });

    it('should block scraping when robots.txt disallows', async () => {
      const input = { url: 'https://example.com/admin' };

      mockKV.get.mockResolvedValue(null);

      // Mock fetch for robots.txt (disallow /admin)
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        text: async () => 'User-agent: *\nDisallow: /admin',
      });

      await expect(service.scrape(input, 'guest', 'guest-123')).rejects.toThrow(
        'robots.txt disallows scraping this URL'
      );
    });
  });

  describe('Content Parsing', () => {
    it('should extract title and text', async () => {
      const input = { url: 'https://example.com' };

      mockKV.get.mockResolvedValue(null);
      mockKV.put.mockResolvedValue(undefined);

      (global.fetch as any).mockResolvedValueOnce({ ok: false }); // robots.txt

      const html = `
        <html>
          <head>
            <title>Test Title</title>
            <meta name="description" content="Test Description">
          </head>
          <body>
            <p>First paragraph</p>
            <p>Second paragraph</p>
          </body>
        </html>
      `;

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: {
          get: (key: string) => {
            if (key === 'content-type') return 'text/html';
            if (key === 'content-length') return String(html.length);
            return null;
          },
        },
        text: async () => html,
      });

      const result = await service.scrape(input, 'guest', 'guest-123');

      expect(result.result.title).toBe('Test Title');
      expect(result.result.description).toBe('Test Description');
      expect(result.result.text).toContain('First paragraph');
      expect(result.result.text).toContain('Second paragraph');
    });

    it('should extract links', async () => {
      const input = { url: 'https://example.com' };

      mockKV.get.mockResolvedValue(null);
      mockKV.put.mockResolvedValue(undefined);

      (global.fetch as any).mockResolvedValueOnce({ ok: false }); // robots.txt

      const html = `
        <html>
          <head><title>Test</title></head>
          <body>
            <a href="/page1">Link 1</a>
            <a href="https://example.com/page2">Link 2</a>
          </body>
        </html>
      `;

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: {
          get: (key: string) => {
            if (key === 'content-type') return 'text/html';
            if (key === 'content-length') return String(html.length);
            return null;
          },
        },
        text: async () => html,
      });

      const result = await service.scrape(input, 'guest', 'guest-123');

      expect(result.result.links).toContain('https://example.com/page1');
      expect(result.result.links).toContain('https://example.com/page2');
    });
  });
});
