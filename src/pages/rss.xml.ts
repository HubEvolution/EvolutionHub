import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET(context: APIContext): Promise<Response> {
  // Determine site origin from request
  const requestUrl = new URL(context.request.url);
  const site = `${requestUrl.protocol}//${requestUrl.host}`;

  // Load blog posts from content collection
  const posts = await getCollection('blog');

  // Sort by pubDate desc and filter out drafts
  const items = posts
    .filter((p) => !(p.data as any)?.draft)
    .sort((a, b) => {
      const ad = (a.data as any)?.pubDate instanceof Date
        ? (a.data as any).pubDate
        : new Date((a.data as any)?.pubDate);
      const bd = (b.data as any)?.pubDate instanceof Date
        ? (b.data as any).pubDate
        : new Date((b.data as any)?.pubDate);
      return bd.getTime() - ad.getTime();
    });

  const channelTitle = 'Evolution Hub – Blog';
  const channelLink = `${site}/blog`;
  const channelDescription = 'Neueste Beiträge aus dem Evolution Hub Blog';

  const rssItems = items
    .map((entry) => {
      const title = String((entry.data as any)?.title || entry.slug);
      const description = String((entry.data as any)?.description || '');
      const pubDate = (entry.data as any)?.pubDate instanceof Date
        ? (entry.data as any).pubDate
        : new Date((entry.data as any)?.pubDate);
      const url = `${site}/blog/${entry.slug}`;
      const guid = url;
      return (
        `    <item>\n` +
        `      <title>${escapeXml(title)}</title>\n` +
        `      <link>${escapeXml(url)}</link>\n` +
        `      <guid isPermaLink=\"true\">${escapeXml(guid)}</guid>\n` +
        (description ? `      <description>${escapeXml(description)}</description>\n` : '') +
        `      <pubDate>${pubDate.toUTCString()}</pubDate>\n` +
        `    </item>`
      );
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<rss version="2.0">\n` +
    `  <channel>\n` +
    `    <title>${escapeXml(channelTitle)}</title>\n` +
    `    <link>${escapeXml(channelLink)}</link>\n` +
    `    <description>${escapeXml(channelDescription)}</description>\n` +
    `    <language>de</language>\n` +
    `${rssItems ? rssItems + '\n' : ''}` +
    `  </channel>\n` +
    `</rss>\n`;

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
