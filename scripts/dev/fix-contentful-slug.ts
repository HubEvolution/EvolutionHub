import 'dotenv/config';

import contentfulManagement from 'contentful-management';

function slugify(raw: string): string {
  return raw
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .trim();
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

async function main(): Promise<void> {
  const [rawSlug, rawNewSlug] = process.argv.slice(2);
  if (!rawSlug) {
    console.error('Usage: tsx scripts/dev/fix-contentful-slug.ts <current-slug-or-entry-id> [new-slug]');
    process.exit(1);
  }

  const spaceId = requireEnv('CONTENTFUL_SPACE_ID');
  const environmentId = process.env.CONTENTFUL_ENVIRONMENT?.trim() || 'master';
  const managementToken = requireEnv('CONTENTFUL_MANAGEMENT_TOKEN');

  const client = contentfulManagement.createClient({ accessToken: managementToken });
  const space = await client.getSpace(spaceId);
  const environment = await space.getEnvironment(environmentId);

  const normalizedNewSlug = rawNewSlug ? slugify(rawNewSlug) : slugify(rawSlug);

  let entries = [];
  if (rawSlug.length === 22 && !rawSlug.includes('-')) {
    // treat as entry ID if it looks like one
    try {
      const entry = await environment.getEntry(rawSlug);
      entries = [entry];
    } catch (error) {
      console.error(`Could not load entry ${rawSlug}:`, error);
      process.exit(1);
    }
  } else {
    const response = await environment.getEntries({ content_type: 'blogPost', 'fields.slug': rawSlug });
    entries = response.items;
  }

  if (entries.length === 0) {
    console.log(`No entries found for slug/id "${rawSlug}".`);
    return;
  }

  for (const entry of entries) {
    const title = (entry.fields?.title?.['en-US'] as string | undefined) ?? entry.sys.id;
    console.log(`Updating ${title} (${entry.sys.id}) -> slug ${normalizedNewSlug}`);
    entry.fields = entry.fields ?? {};
    entry.fields.slug = { ...(entry.fields.slug as Record<string, string> | undefined), 'en-US': normalizedNewSlug } as any;
    const updated = await entry.update();
    console.log('   Updated entry version', updated.sys.version);
    if (!updated.isPublished()) {
      const published = await updated.publish();
      console.log('   Published version', published.sys.version);
    } else {
      const published = await updated.publish();
      console.log('   Re-published version', published.sys.version);
    }
  }
}

main().catch((error) => {
  console.error('Fatal error while fixing slug:', error);
  process.exit(1);
});
