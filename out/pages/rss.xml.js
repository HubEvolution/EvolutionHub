"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const astro_content_1 = require("astro:content");
function escapeXml(s) {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}
function normalizeDate(value) {
    if (value instanceof Date)
        return value;
    if (typeof value === 'string' && value.length > 0)
        return new Date(value);
    return new Date();
}
async function GET(context) {
    // Determine site origin from request
    const requestUrl = new URL(context.request.url);
    const site = `${requestUrl.protocol}//${requestUrl.host}`;
    // Load blog posts from content collection
    const posts = await (0, astro_content_1.getCollection)('blog');
    // Sort by pubDate desc and filter out drafts
    const items = posts
        .filter((entry) => entry.data.draft !== true)
        .sort((a, b) => normalizeDate(b.data.pubDate).getTime() - normalizeDate(a.data.pubDate).getTime());
    const channelTitle = 'Evolution Hub – Blog';
    const channelLink = `${site}/blog`;
    const channelDescription = 'Neueste Beiträge aus dem Evolution Hub Blog';
    const rssItems = [];
    for (const entry of items) {
        const title = entry.data.title ?? entry.slug;
        const description = entry.data.description ?? '';
        const pubDate = normalizeDate(entry.data.pubDate).toUTCString();
        const url = `${site}/blog/${entry.slug}`;
        const lines = [
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
    const xmlLines = [
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
