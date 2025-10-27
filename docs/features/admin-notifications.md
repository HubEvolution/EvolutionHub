# Admin & Notifications Subsystem

## Overview

This document consolidates the current source of truth for Evolution Hub's admin-only APIs, the notifications/email queue, warmup tooling, and the associated D1 schema. It focuses on the features that support comment moderation, backup/ops workflows, and user-facing notifications.

> All endpoints below are live in production unless noted otherwise. Inline references use the `@filepath#line-start-line-end` notation for quick navigation.

## Security & Roles

- **Authentication**: Every admin/notifications endpoint uses `withAuthApiMiddleware`, providing security headers, same-origin enforcement for unsafe methods, unified JSON envelopes, audit logging, and rate limiting (`standardApiLimiter` unless overridden).@src/lib/api-middleware.ts
- **Role gating**:
  - `requireAdmin` restricts access to users with the `admin` role.@src/lib/auth-helpers.ts#104-134
  - `requireModerator` allows `moderator` or `admin` roles (used for comment moderation UIs).@src/lib/auth-helpers.ts#136-145
- **CSRF**: `withAuthApiMiddleware` enables CSRF double-submit by default; some Hono routes disable it because the UI does not yet send the token (`enforceCsrfToken: false`).@src/pages/api/notifications/queue/process.ts#80-139
- **Rate limiting**: Admin APIs inherit middleware defaults (30/min) unless Hono routes define their own limiter (e.g., `/api/admin/backup` sets 10/min to avoid expensive jobs).@src/pages/api/admin/backup.ts#30-41

## D1 Schema (Notifications & Admin Tables)

| Table                   | Purpose                        | Key Columns                                                                                                  |
| ----------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `notifications`         | In-app notification feed       | `user_id`, `type` (`comment_reply`, `system`, …), `priority`, `is_read`, `created_at`                        |
| `notification_settings` | Per-user channel preferences   | `type`, `channel` (`in_app`, `email`), `enabled`, `frequency`                                                |
| `email_templates`       | Multi-lingual Resend templates | `name`, `locale`, `subject`, `html_content`, `variables`, `is_active`                                        |
| `email_queue`           | Pending outbound emails        | `template_id`, `status` (`pending`, `sent`, `failed`), `priority`, `scheduled_for`, `attempts`, `last_error` |
| `comment_moderation`    | Moderation audit history       | `comment_id`, `moderator_id`, `action`, `reason`, `created_at`                                               |
| `comment_reports`       | User-generated comment reports | `comment_id`, `reporter_id`, `reason`, `status`, `reviewed_by`                                               |
| `data_export_jobs`      | Admin backup/export jobs       | `type`, `status`, `file_path`, `record_count`, `error_message`, `triggered_by`, `is_automated`               |

See the definitive schema definitions in `src/lib/db/schema.ts` for full column metadata and enum values.@src/lib/db/schema.ts#141-192

## Admin & Moderation Endpoints

### Comments Moderation

- `GET /api/admin/comments` — Paginated moderation queue with optional filters (`status`, `entityType`, `entityId`, `includeReports`). Requires moderator/admin role and returns stats plus comment metadata.@src/pages/api/admin/comments/index.ts#27-160
- `GET /api/admin/comments/:id` — Fetches a single comment with admin metadata (Hono router).@src/pages/api/admin/comments/\[id]/moderate.ts#123-178
- `POST /api/admin/comments/:id/moderate` — Performs an action (`approve`, `reject`, `flag`, `hide`) on a comment. Payload supports optional `reason` and `notifyUser` flags.@src/pages/api/admin/comments/\[id]/moderate.ts#24-118
- `DELETE /api/admin/comments/:id` — Soft-deletes (hides) a comment with optional reason in body. Same Hono router, reuses comment-service hooks.@src/pages/api/admin/comments/\[id]/moderate.ts#182-254
- `POST /api/admin/comments/bulk-moderate` — Bulk action for up to N comment IDs (approve/reject/flag/hide). Responds with per-ID success state.@src/pages/api/admin/comments/bulk-moderate.ts#20-85

#### Comment Service integration

`CommentService` emits moderation events (updates D1, invalidates `KV_COMMENTS`, enqueues notifications) and centralizes status changes.@src/lib/services/comment-service.ts

### Admin Metrics & Status

- `GET /api/admin/status` — User-centric admin snapshot: plan, current credit balance (via `KV_AI_ENHANCER`), and last Stripe subscription events. Requires admin role.@src/pages/api/admin/status.ts#1-61
- `GET /api/admin/metrics` — High-level platform metrics (active sessions/users, total users, signups in last 24h). Uses defensive SQL for ISO vs epoch timestamps; admin-only.@src/pages/api/admin/metrics.ts#1-66

### Backup & Maintenance API (Hono)

The `/api/admin/backup` router manages data exports, scheduled jobs, and maintenance tasks. All routes enforce JWT + rate limit + `requireAdmin`.@src/pages/api/admin/backup.ts#6-59

Key endpoints include:

| Method & Path                                | Description                                                                              |
| -------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `GET /api/admin/backup/jobs`                 | List recent backup jobs with optional `status`/`type` filters.                           |
| `GET /api/admin/backup/jobs/:id`             | Retrieve a single job including file metadata.                                           |
| `GET /api/admin/backup/jobs/:id/progress`    | Progress tracker for running jobs.                                                       |
| `POST /api/admin/backup/create`              | Create a new backup job. Validates `type` ⟶ `['full','comments','users','incremental']`. |
| `POST /api/admin/backup/schedule`            | Register cron-based backups with a cron expression.                                      |
| `POST /api/admin/backup/maintenance/perform` | Trigger maintenance actions (`cleanup`, `optimization`, `migration`, `repair`).          |
| `POST /api/admin/backup/maintenance/cancel`  | Cancel queued maintenance jobs.                                                          |
| `POST /api/admin/backup/jobs/:id/retry`      | Retry failed backup job (resets status).                                                 |
| `DELETE /api/admin/backup/jobs/:id`          | Delete backup metadata (keeps R2 object).                                                |

Refer to the file for additional sub-routes and structured logging (each request is tagged with `requestId`).@src/pages/api/admin/backup.ts

## Notifications & Email Queue

### User-Facing API

- `GET /api/dashboard/notifications` — Returns the 10 most recent in-app notifications for the authenticated user. Reuses middleware and logs `notifications_viewed` events.@docs/api/dashboard_api.md#112-121
- `GET /api/notifications` (Hono) — JWT-protected API for listing notifications with filters (`type`, `priority`, `isRead`, `limit`, `offset`, `startDate`, `endDate`). Rate limited to 30/min.@src/pages/api/notifications/index.ts#89-121
- `POST /api/notifications/mark-read` — Mark a single notification as read (body requires `notificationId`).@src/pages/api/notifications/index.ts#133-167
- `POST /api/notifications/mark-all-read` — Bulk mark all notifications as read (10/min limit).@src/pages/api/notifications/index.ts#179-199
- `DELETE /api/notifications/:id` — Remove a notification record.@src/pages/api/notifications/index.ts#211-233
- `GET /api/notifications/stats` — Aggregated counts by type/priority/read state (15/min limit).@src/pages/api/notifications/index.ts#245-265

### Queue Processor

- `POST /api/notifications/queue/process` — Processes the email queue (default limit 10, overridable via `?limit=`). Requires admin auth, resolves `RESEND_API_KEY`, `EMAIL_FROM`, and `BASE_URL` from environment bindings. Same-origin enforced; CSRF disabled because the endpoint is invoked from internal tooling or cron.@src/pages/api/notifications/queue/process.ts#80-139

- Processing loop:
  1. Load pending queue items (status `pending`, `scheduled_for <= now`), ordered by priority.@src/lib/services/notification-service.ts#578-588
  2. Resolve template (`reply-notification`, `moderation-decision`, …) and render HTML/subject using `{{variable}}` substitution.@src/lib/services/notification-service.ts#470-540
  3. Send through Resend via `createEmailService`; successes mark `status=sent` with timestamp.@src/lib/services/notification-service.ts#607-616
  4. Failures increment `attempts`, persist `last_error`, and remain queued for retry.@src/lib/services/notification-service.ts#619-633
  5. Items pending >24h are automatically marked as failed by `processEmailQueue()`.@src/lib/services/notification-service.ts#692-707

### Email Templates & Seeds

- Templates are seeded via migration `0022_seed_email_templates_comments.sql` (reply & moderation templates for DE/EN).@migrations/0022_seed_email_templates_comments.sql
- Template management occurs through the `email_templates` table; the UI for managing templates is TBD.

## Warmup Tooling

`scripts/warmup.ts` preheats key pages/APIs after deploys. Usage:@scripts/warmup.ts#1-109

```bash
tsx scripts/warmup.ts --url https://example.evolution-hub.com --env production \
  --concurrency 4 --internal-health-token "$INTERNAL_HEALTH_TOKEN"
```

Workflow:

1. Health check `GET /api/health` (retries ×3).@scripts/warmup.ts#69-88
2. Optional internal auth health `GET /api/health/auth` when `INTERNAL_HEALTH_TOKEN` is provided.@scripts/warmup.ts#90-109
3. Warmup targets (defined later in the file) fetch static pages, API endpoints, and SSE/Poll routes to prime caches.

The script exits non-zero if health checks fail, but soft-fails on internal auth issues.

## Operational Notes

- **Cron/Workers**: Queue processing is typically triggered via cron hitting `/api/notifications/queue/process` with admin credentials. Ensure the cron runner provides same-origin requests (or configure allowed origins in middleware).
- **Environment Bindings**: Confirm the following bindings per environment in `wrangler.toml`:
  - `DB` (D1) and `KV_COMMENTS` for comment moderation.
  - `KV_AI_ENHANCER` for admin credits status.
  - `RESEND_API_KEY`, `EMAIL_FROM`, `BASE_URL`, optional `ENVIRONMENT` for queue processing.
- **Logs & Observability**: Admin endpoints log structured metadata via `loggerFactory` or manual `console` statements. Review Cloudflare worker logs for `requestId` traces.

## See Also

- [Comment System Implementation](../development/comment-system-implementation.md)
- [Dashboard API Reference](../api/dashboard_api.md)
- [Toast Notifications (Frontend)](../frontend/toast-notifications.md)
- [System Architecture Overview](../architecture/system-overview.md)
