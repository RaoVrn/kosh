CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_name_unique ON projects(lower(name));
CREATE INDEX IF NOT EXISTS idx_projects_archived_at ON projects(archived_at);

ALTER TABLE items ADD COLUMN project_id TEXT REFERENCES projects(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_items_project_id ON items(project_id);