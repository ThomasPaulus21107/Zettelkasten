CREATE TABLE IF NOT EXISTS index_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  source_branch TEXT NOT NULL,
  source_commit TEXT NOT NULL,
  indexed_at TEXT NOT NULL,
  note_count INTEGER NOT NULL,
  excluded_count INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS notes (
  source_commit TEXT NOT NULL,
  id TEXT NOT NULL,
  vault TEXT NOT NULL,
  path TEXT NOT NULL,
  title TEXT NOT NULL,
  aliases TEXT NOT NULL,
  markdown TEXT NOT NULL,
  PRIMARY KEY (source_commit, id)
);

CREATE VIRTUAL TABLE IF NOT EXISTS note_search USING fts5(
  source_commit UNINDEXED,
  id UNINDEXED,
  title,
  aliases,
  body,
  tokenize = 'unicode61 remove_diacritics 2'
);
