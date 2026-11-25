CREATE TABLE IF NOT EXISTS quotes (
  quote_key TEXT PRIMARY KEY,
  reference TEXT NOT NULL UNIQUE,
  snapshot TEXT NOT NULL,
  expires INTEGER NOT NULL,
  bold_id TEXT,
  url TEXT
);
