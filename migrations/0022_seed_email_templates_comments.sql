-- Seed email templates for comment notifications (DE locale)
-- Uses UNIQUE(name) constraint; INSERT OR IGNORE to avoid duplication on re-run

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
  'Neue Antwort auf deinen Kommentar',
  '<h1>Neue Antwort</h1><p>Hallo {{userName}},</p><p>{{notification.authorName}} hat auf deinen Kommentar geantwortet.</p><p><a href="{{baseUrl}}/blog/{{notification.entityId}}#comments">Zum Beitrag</a></p><p><a href="{{baseUrl}}/settings/notifications">Benachrichtigungen verwalten</a></p>',
  'Neue Antwort auf deinen Kommentar von {{notification.authorName}}. Beitrag: {{baseUrl}}/blog/{{notification.entityId}}#comments',
  '["userName","baseUrl","notification"]',
  1,
  'de',
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
  'Moderationsentscheidung zu deinem Kommentar',
  '<h1>Moderation</h1><p>Hallo {{userName}},</p><p>Es gibt eine Entscheidung zu deinem Kommentar.</p><p><a href="{{baseUrl}}/blog/{{notification.entityId}}#comments">Zum Beitrag</a></p><p><a href="{{baseUrl}}/settings/notifications">Benachrichtigungen verwalten</a></p>',
  'Moderationsentscheidung zu deinem Kommentar. Beitrag: {{baseUrl}}/blog/{{notification.entityId}}#comments',
  '["userName","baseUrl","notification"]',
  1,
  'de',
  strftime('%s','now'),
  strftime('%s','now')
);
