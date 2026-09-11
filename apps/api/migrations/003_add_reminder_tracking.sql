ALTER TABLE items ADD COLUMN reminded_at TEXT;

CREATE INDEX IF NOT EXISTS idx_items_reminder_eligibility ON items(type, status, reminder_at);