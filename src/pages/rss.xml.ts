import type { APIContext } from 'astro';
import { getCollection, type CollectionEntry } from 'astro:content';

type BlogEntry = CollectionEntry<'blog'>;

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function normalizeDate(value: BlogEntry['data']['pubDate']): Date {
  if (value instanceof Date) return value;
  if (typeof value === 'string' && value.length > 0) return new Date(value);
  return new Date();
}

export async function GET(context: APIContext): Promise<Response> {
  // Determine site origin from request
  const requestUrl = new URL(context.request.url);
  const site = `${requestUrl.protocol}//${requestUrl.host}`;

  // Load blog posts from content collection
  const posts: BlogEntry[] = await getCollection('blog');

  // Sort by pubDate desc and filter out drafts
  const items = posts
    .filter((entry): entry is BlogEntry => entry.data.draft !== true)
    .sort(
      (a, b) => normalizeDate(b.data.pubDate).getTime() - normalizeDate(a.data.pubDate).getTime()
    );

  const channelTitle = 'Evolution Hub – Blog';
  const channelLink = `${site}/blog`;
  const channelDescription = 'Neueste Beiträge aus dem Evolution Hub Blog';

  const rssItems: string[] = [];

  for (const entry of items) {
    const title = entry.data.title ?? entry.slug;
    const description = entry.data.description ?? '';
    const pubDate = normalizeDate(entry.data.pubDate).toUTCString();
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
