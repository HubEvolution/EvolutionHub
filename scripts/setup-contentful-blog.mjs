import dotenv from 'dotenv';
dotenv.config();

import contentfulManagement from 'contentful-management';

const { createClient } = contentfulManagement;

const SPACE_ID = process.env.CONTENTFUL_SPACE_ID;
const ENVIRONMENT_ID = process.env.CONTENTFUL_ENVIRONMENT || 'master';
const MANAGEMENT_TOKEN = process.env.CONTENTFUL_MANAGEMENT_TOKEN;

if (!SPACE_ID || !MANAGEMENT_TOKEN) {
  console.error('Missing CONTENTFUL_SPACE_ID or CONTENTFUL_MANAGEMENT_TOKEN in environment.');
  process.exit(1);
}

const CONTENT_TYPE_ID = 'blogPost';

const contentTypeSpec = {
  name: 'Blog Post',
  description: 'Blog article managed via Contentful',
  displayField: 'title',
  fields: [
    {
      id: 'title',
      name: 'Title',
      type: 'Symbol',
      localized: false,
      required: true,
      validations: [],
    },
    {
      id: 'slug',
      name: 'Slug',
      type: 'Symbol',
      localized: false,
      required: true,
      validations: [
        { unique: true },
        {
          regexp: {
            pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
          },
        },
      ],
    },
    {
      id: 'publishDate',
      name: 'Publish Date',
      type: 'Date',
      localized: false,
      required: true,
      validations: [],
    },
    {
      id: 'author',
      name: 'Author',
      type: 'Symbol',
      localized: false,
      required: false,
      validations: [],
    },
    {
      id: 'category',
      name: 'Category',
      type: 'Symbol',
      localized: false,
      required: false,
      validations: [],
    },
    {
      id: 'tags',
      name: 'Tags',
      type: 'Array',
      localized: false,
      required: false,
      validations: [],
      items: {
        type: 'Symbol',
        validations: [],
      },
    },
    {
      id: 'image',
      name: 'Hero Image',
      type: 'Link',
      localized: false,
      required: false,
      validations: [],
      linkType: 'Asset',
    },
    {
      id: 'imageAlt',
      name: 'Image Alt Text',
      type: 'Symbol',
      localized: false,
      required: false,
      validations: [],
    },
    {
      id: 'content',
      name: 'Content',
      type: 'RichText',
      localized: false,
      required: true,
      validations: [
        {
          enabledNodeTypes: [
            'heading-1',
            'heading-2',
            'heading-3',
            'ordered-list',
            'unordered-list',
            'hr',
            'blockquote',
            'embedded-entry-block',
            'embedded-asset-block',
            'hyperlink',
            'entry-hyperlink',
            'asset-hyperlink',
            'paragraph',
          ],
        },
      ],
    },
  ],
};

const client = createClient({ accessToken: MANAGEMENT_TOKEN });

async function ensureContentType() {
  const space = await client.getSpace(SPACE_ID);
  const environment = await space.getEnvironment(ENVIRONMENT_ID);

  let contentType;
  try {
    contentType = await environment.getContentType(CONTENT_TYPE_ID);
    console.log(`Content type "${CONTENT_TYPE_ID}" found. Updating…`);
    contentType.name = contentTypeSpec.name;
    contentType.description = contentTypeSpec.description;
    contentType.displayField = contentTypeSpec.displayField;
    contentType.fields = contentTypeSpec.fields;
    contentType = await contentType.update();
  } catch (error) {
    if (error.name === 'NotFound' || error?.sys?.id === 'NotFound' || error?.response?.status === 404) {
      console.log(`Content type "${CONTENT_TYPE_ID}" not found. Creating…`);
      contentType = await environment.createContentTypeWithId(CONTENT_TYPE_ID, contentTypeSpec);
    } else {
      throw error;
    }
  }

  const publishedVersion = contentType.sys.publishedVersion ?? 0;
  if (contentType.sys.version > publishedVersion) {
    contentType = await contentType.publish();
    console.log(`Content type "${CONTENT_TYPE_ID}" published (v${contentType.sys.publishedVersion}).`);
  } else {
    console.log(`Content type "${CONTENT_TYPE_ID}" already published.`);
  }
}

ensureContentType()
  .then(() => {
    console.log('Done.');
  })
  .catch((error) => {
    console.error('Failed to ensure content type:', error);
    process.exit(1);
  });
