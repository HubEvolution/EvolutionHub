import type { APIContext } from 'astro';
import { blogService } from '@/lib/blog';
import type { ProcessedBlogPost } from '@/content/types';

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function normalizeDate(value: Date | string | undefined | null): Date {
  if (value instanceof Date) return value;
  if (typeof value === 'string' && value.length > 0) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return new Date();
}

export async function GET(context: APIContext): Promise<Response> {
  // Determine site origin from request
  const requestUrl = new URL(context.request.url);
  const site = `${requestUrl.protocol}//${requestUrl.host}`;

  // Load blog posts from content collection
  const posts: ProcessedBlogPost[] = await blogService.getPublishedPosts();
  const items = [...posts].sort((a, b) =>
    normalizeDate(b.data.updatedDate ?? b.data.pubDate).getTime() -
    normalizeDate(a.data.updatedDate ?? a.data.pubDate).getTime()
  );

  const channelTitle = 'Evolution Hub – Blog';
  const channelLink = `${site}/blog`;
  const channelDescription = 'Neueste Beiträge aus dem Evolution Hub Blog';

  const rssItems: string[] = [];

  for (const entry of items) {
    const title = entry.data.title ?? entry.slug;
    const description = entry.data.description ?? '';
    const pubDate = normalizeDate(entry.data.updatedDate ?? entry.data.pubDate).toUTCString();
    const url = `${site}/blog/${entry.slug}`;

    const lines: string[] = [
      '    <item>',
      `      <title>${escapeXml(title)}</title>`,
      `      <link>${escapeXml(url)}</link>`,
      `      <guid isPermaLink="true">${escapeXml(url)}</guid>`,
    ];

    if (description) {
      lines.push(`      <description>${escapeXml(description)}</description>`);
    }

    lines.push(`      <pubDate>${pubDate}</pubDate>`);
    lines.push('    </item>');

    rssItems.push(lines.join('\n'));
  }

  const xmlLines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    '  <channel>',
    `    <title>${escapeXml(channelTitle)}</title>`,
    `    <link>${escapeXml(channelLink)}</link>`,
    `    <description>${escapeXml(channelDescription)}</description>`,
    '    <language>de</language>',
    ...rssItems,
    '  </channel>',
    '</rss>',
  ];

  const xml = `${xmlLines.join('\n')}\n`;

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
