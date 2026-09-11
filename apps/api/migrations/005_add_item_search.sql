CREATE VIRTUAL TABLE IF NOT EXISTS items_fts USING fts5(
  title,
  body,
  url,
  tags,
  content='items',
  content_rowid='rowid',
  tokenize='unicode61'
);

CREATE TRIGGER IF NOT EXISTS items_fts_ai AFTER INSERT ON items BEGIN
  INSERT INTO items_fts(rowid, title, body, url, tags)
  VALUES (new.rowid, new.title, new.body, new.url, new.tags);
END;

CREATE TRIGGER IF NOT EXISTS items_fts_ad AFTER DELETE ON items BEGIN
  INSERT INTO items_fts(items_fts, rowid, title, body, url, tags)
  VALUES ('delete', old.rowid, old.title, old.body, old.url, old.tags);
END;

CREATE TRIGGER IF NOT EXISTS items_fts_au AFTER UPDATE ON items BEGIN
  INSERT INTO items_fts(items_fts, rowid, title, body, url, tags)
  VALUES ('delete', old.rowid, old.title, old.body, old.url, old.tags);
  INSERT INTO items_fts(rowid, title, body, url, tags)
  VALUES (new.rowid, new.title, new.body, new.url, new.tags);
END;

INSERT INTO items_fts(items_fts) VALUES('rebuild');