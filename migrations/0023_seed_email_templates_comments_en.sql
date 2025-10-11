-- Seed email templates for comment notifications (EN locale)
-- Uses UNIQUE(name, locale) constraint if present; otherwise relies on name uniqueness per system design

INSERT OR IGNORE INTO email_templates (
  id,
  name,
  subject,
  html_content,
  text_content,
  variables,
  is_active,
  locale,
  created_at,
  updated_at
) VALUES (
  hex(randomblob(16)),
  'reply-notification',
  'New reply to your comment',
  '<h1>New Reply</h1><p>Hello {{userName}},</p><p>{{notification.authorName}} replied to your comment.</p><p><a href="{{baseUrl}}/blog/{{notification.entityId}}#comments">Open post</a></p><p><a href="{{baseUrl}}/settings/notifications">Manage notifications</a></p>',
  'New reply to your comment by {{notification.authorName}}. Post: {{baseUrl}}/blog/{{notification.entityId}}#comments',
  '["userName","baseUrl","notification"]',
  1,
  'en',
  strftime('%s','now'),
  strftime('%s','now')
);

INSERT OR IGNORE INTO email_templates (
  id,
  name,
  subject,
  html_content,
  text_content,
  variables,
  is_active,
  locale,
  created_at,
  updated_at
) VALUES (
  hex(randomblob(16)),
  'moderation-decision',
  'Moderation decision on your comment',
  '<h1>Moderation</h1><p>Hello {{userName}},</p><p>There is a moderation decision regarding your comment.</p><p><a href="{{baseUrl}}/blog/{{notification.entityId}}#comments">Open post</a></p><p><a href="{{baseUrl}}/settings/notifications">Manage notifications</a></p>',
  'Moderation decision regarding your comment. Post: {{baseUrl}}/blog/{{notification.entityId}}#comments',
  '["userName","baseUrl","notification"]',
  1,
  'en',
  strftime('%s','now'),
  strftime('%s','now')
);
