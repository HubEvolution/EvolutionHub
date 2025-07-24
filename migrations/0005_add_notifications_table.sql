-- Migration to add the notifications table

CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL, -- 'comment', 'mention', 'task_completed', 'system'
  read INTEGER DEFAULT 0, -- 0 for false, 1 for true
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);