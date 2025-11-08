import 'dotenv/config';

import contentfulManagement from 'contentful-management';

const DEFAULT_SLUGS = ['digital-detox-kreativitaet', 'digital-leadership'];

function resolveSlugs(): Set<string> {
  const cliSlugs = process.argv.slice(2).map((slug) => slug.trim()).filter(Boolean);
  const candidates = cliSlugs.length > 0 ? cliSlugs : DEFAULT_SLUGS;
  if (candidates.length === 0) {
    throw new Error('No slugs provided. Pass them as CLI arguments or configure DEFAULT_SLUGS.');
  }
  return new Set(candidates);
}

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
  const slugsToDelete = resolveSlugs();

  const client = contentfulManagement.createClient({ accessToken: managementToken });
  const space = await client.getSpace(spaceId);
  const environment = await space.getEnvironment(environmentId);

  const entries = await environment.getEntries({ content_type: 'blogPost', limit: 1000 });
  let removed = 0;

  for (const slug of slugsToDelete) {
    const matches = entries.items.filter(
      (entry) => (entry.fields?.slug?.['en-US'] as string | undefined) === slug
    );

    if (matches.length <= 1) {
      continue;
    }

    const sorted = matches.sort((a, b) => {
      const aDate = new Date(a.sys.updatedAt ?? a.sys.createdAt ?? 0).getTime();
      const bDate = new Date(b.sys.updatedAt ?? b.sys.createdAt ?? 0).getTime();
      return bDate - aDate;
    });

    const [keep, ...duplicates] = sorted;
    const keepTitle = (keep.fields?.title?.['en-US'] as string | undefined) ?? keep.sys.id;
    console.log(`Keeping latest entry for ${slug}: ${keepTitle} (${keep.sys.id})`);

    for (const duplicate of duplicates) {
      const title = (duplicate.fields?.title?.['en-US'] as string | undefined) ?? duplicate.sys.id;
      console.log(`→ Removing duplicate entry ${title} (${slug}), id=${duplicate.sys.id}`);

      if (duplicate.isPublished()) {
        await duplicate.unpublish();
        console.log('   Unpublished');
      }

      await duplicate.delete();
      removed += 1;
      console.log('   Deleted');
    }
  }

  if (removed === 0) {
    console.log('No duplicate entries found.');
  } else {
    console.log(`Done. Removed ${removed} entries.`);
  }
}

main().catch((error) => {
  console.error('Fatal error while cleaning duplicates:', error);
  process.exit(1);
});
