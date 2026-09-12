ALTER TABLE items ADD COLUMN recurrence_frequency TEXT NOT NULL DEFAULT 'none';
ALTER TABLE items ADD COLUMN recurrence_weekdays TEXT;
ALTER TABLE items ADD COLUMN recurrence_month_day INTEGER;
ALTER TABLE items ADD COLUMN recurrence_id TEXT;
CREATE INDEX IF NOT EXISTS idx_items_recurrence_id ON items(recurrence_id);