-- schema.sql — reference schema matching the state after all migrations are applied.
-- DO NOT run this against a live database — use the files in migrations/ instead.

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  count INTEGER DEFAULT 1,
  comment TEXT,
  longitude REAL NOT NULL,
  latitude REAL NOT NULL,
  timestamp INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  icon TEXT
);

CREATE TABLE IF NOT EXISTS media (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  report_id TEXT NOT NULL,
  url TEXT NOT NULL,
  content_type TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS edit_tokens (
  token TEXT PRIMARY KEY,
  report_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL,
  content TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS comment_media (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  comment_id TEXT NOT NULL,
  url TEXT NOT NULL,
  content_type TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reports_timestamp ON reports (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_reports_location ON reports (latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_reports_type ON reports (type);
CREATE INDEX IF NOT EXISTS idx_media_report_id ON media (report_id);
CREATE INDEX IF NOT EXISTS idx_edit_tokens_report_id ON edit_tokens (report_id);
CREATE INDEX IF NOT EXISTS idx_edit_tokens_expires_at ON edit_tokens (expires_at);
CREATE INDEX IF NOT EXISTS idx_comments_report_id ON comments (report_id);
CREATE INDEX IF NOT EXISTS idx_comments_timestamp ON comments (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_comment_media_comment_id ON comment_media (comment_id);
