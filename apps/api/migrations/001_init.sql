CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'note',
  status TEXT NOT NULL DEFAULT 'inbox',
  title TEXT NOT NULL,
  body TEXT,
  url TEXT,
  due_at TEXT,
  reminder_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  done_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
CREATE INDEX IF NOT EXISTS idx_items_created_at ON items(created_at);
CREATE INDEX IF NOT EXISTS idx_items_due_at ON items(due_at);
CREATE INDEX IF NOT EXISTS idx_items_reminder_at ON items(reminder_at);