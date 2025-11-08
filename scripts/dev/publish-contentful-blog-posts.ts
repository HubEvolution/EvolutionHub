import 'dotenv/config';

import contentfulManagement from 'contentful-management';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

async function main(): Promise<void> {
  const spaceId = requireEnv('CONTENTFUL_SPACE_ID');
  const environmentId = process.env.CONTENTFUL_ENVIRONMENT?.trim() || 'master';
  const managementToken = requireEnv('CONTENTFUL_MANAGEMENT_TOKEN');

  const client = contentfulManagement.createClient({ accessToken: managementToken });
  const space = await client.getSpace(spaceId);
  const environment = await space.getEnvironment(environmentId);

  const entries = await environment.getEntries({ content_type: 'blogPost', limit: 1000 });
  if (!entries.items.length) {
    console.log('No blogPost entries found.');
    return;
  }

  let publishedCount = 0;
  let skippedCount = 0;

  for (const entry of entries.items) {
    const title = (entry.fields?.title?.['en-US'] as string | undefined) ?? entry.sys.id;
    const slug = (entry.fields?.slug?.['en-US'] as string | undefined) ?? entry.sys.id;

    if (entry.isPublished() && !entry.isUpdated()) {
      skippedCount += 1;
      console.log(`↷  Skip: ${title} (${slug}) already published.`);
      continue;
    }

    try {
      const published = await entry.publish();
      publishedCount += 1;
      console.log(`✅ Published: ${title} (${slug}) → version ${published.sys.version}`);
    } catch (error) {
      console.error(`❌ Failed to publish ${title} (${slug}):`, error);
    }
  }

  console.log(`Done. Published ${publishedCount}, skipped ${skippedCount}.`);
}

main().catch((error) => {
  console.error('Fatal error while publishing blog posts:', error);
  process.exit(1);
});
