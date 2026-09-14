DROP TRIGGER IF EXISTS items_fts_ai;
DROP TRIGGER IF EXISTS items_fts_ad;
DROP TRIGGER IF EXISTS items_fts_au;
DROP TABLE IF EXISTS items_fts;

CREATE VIRTUAL TABLE items_fts USING fts5(
  title,
  body,
  url,
  tags,
  project_name,
  tokenize='unicode61'
);

CREATE TRIGGER items_fts_ai AFTER INSERT ON items BEGIN
  INSERT INTO items_fts(rowid, title, body, url, tags, project_name)
  VALUES (
    new.rowid, new.title, new.body, new.url, new.tags,
    (SELECT name FROM projects WHERE id = new.project_id)
  );
END;

CREATE TRIGGER items_fts_ad AFTER DELETE ON items BEGIN
  DELETE FROM items_fts WHERE rowid = old.rowid;
END;

CREATE TRIGGER items_fts_au AFTER UPDATE ON items BEGIN
  DELETE FROM items_fts WHERE rowid = old.rowid;
  INSERT INTO items_fts(rowid, title, body, url, tags, project_name)
  VALUES (
    new.rowid, new.title, new.body, new.url, new.tags,
    (SELECT name FROM projects WHERE id = new.project_id)
  );
END;

CREATE TRIGGER items_fts_project_rename AFTER UPDATE OF name ON projects BEGIN
  UPDATE items_fts SET project_name = NEW.name
  WHERE rowid IN (SELECT rowid FROM items WHERE project_id = NEW.id);
END;

INSERT INTO items_fts(rowid, title, body, url, tags, project_name)
SELECT rowid, title, body, url, tags,
  (SELECT name FROM projects WHERE id = items.project_id)
FROM items;