import 'dotenv/config';

import type { EntryCollection } from 'contentful';
import {
  getContentfulClient,
  mapEntryToBlogPost,
  type BlogPostSkeleton,
} from '@/lib/contentful';

async function main() {
  const client = getContentfulClient();

  const response: EntryCollection<BlogPostSkeleton> = await client.getEntries<BlogPostSkeleton>({
    content_type: 'blogPost',
    include: 2,
    limit: 5,
    order: ['-fields.publishDate'],
  });

  const mapped = response.items.map((entry) => mapEntryToBlogPost(entry));

  console.dir(
    {
      total: response.total,
      fetched: response.items.length,
      mappedPreview: mapped.map((post) => ({
        id: post.id,
        slug: post.slug,
        title: post.data.title,
        formattedPubDate: post.formattedPubDate,
        tags: post.data.tags,
        hasImage: Boolean(post.data.image?.src),
      })),
    },
    { depth: null }
  );
}

main().catch((error) => {
  console.error('Failed to fetch or map Contentful entries:', error);
  process.exit(1);
});
