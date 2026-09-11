ALTER TABLE items ADD COLUMN priority TEXT;
ALTER TABLE items ADD COLUMN tags TEXT;

CREATE INDEX IF NOT EXISTS idx_items_type ON items(type);