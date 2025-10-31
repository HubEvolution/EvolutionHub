import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { OpenAPIRegistry, OpenApiGeneratorV3, extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
extendZodWithOpenApi(z);

// Import Zod schemas (use relative paths to avoid tsconfig paths issues in node scripts)
import { newsletterSubscribeSchema, newsletterUnsubscribeSchema } from '../src/lib/validation/schemas/newsletter';
import { billingCreditsRequestSchema, billingCancelRequestSchema } from '../src/lib/validation/schemas/billing';
import { templateSaveSchema } from '../src/lib/validation/schemas/templates';
import { dashboardActionSchema } from '../src/lib/validation/schemas/dashboard';
import { internalUserSyncSchema } from '../src/lib/validation/schemas/users';

const registry = new OpenAPIRegistry();

// Register component schemas with names matching (or close to) openapi.yaml components
registry.register(
  'NewsletterSubscribeRequest',
  newsletterSubscribeSchema.openapi({ description: 'Subscribe to newsletter with explicit consent and optional first name and source tag.' })
);
registry.register(
  'NewsletterUnsubscribeRequest',
  newsletterUnsubscribeSchema.openapi({ description: 'Unsubscribe a user by email address.' })
);
registry.register(
  'BillingCreditsRequest',
  billingCreditsRequestSchema.openapi({ description: 'Purchase a credits pack and optionally link to a workspace and return URL.' })
);
registry.register(
  'BillingCancelRequest',
  billingCancelRequestSchema.openapi({ description: 'Cancel a subscription by its Stripe subscriptionId.' })
);
registry.register(
  'TemplateSaveRequest',
  templateSaveSchema.openapi({ description: 'Save or update a reusable prompt template.' })
);
registry.register(
  'DashboardPerformActionRequest',
  dashboardActionSchema.openapi({ description: 'Discriminated action to perform in the dashboard (create project/task, invite member, view docs).' })
);
registry.register(
  'InternalUserSyncRequest',
  internalUserSyncSchema.openapi({ description: 'Minimal internal user payload used to sync id/email/name/image.' })
);

const generator = new OpenApiGeneratorV3(registry.definitions);
const document = generator.generateDocument({
  openapi: '3.0.3',
  info: {
    title: 'Evolution Hub — Zod Pilot Components',
    version: '0.1.0',
    description: 'Auto-derived component schemas from Zod (pilot).',
  },
  servers: [{ url: '/', description: 'local' }],
});

// Output to stdout
console.log(JSON.stringify(document.components?.schemas ?? {}, null, 2));

// Also write to reports for diffing
try {
  const outDir = resolve(process.cwd(), 'reports');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(resolve(outDir, 'zod-openapi-pilot.components.json'), JSON.stringify(document.components?.schemas ?? {}, null, 2));
} catch (e) {
  // ignore file write errors in CI
}
