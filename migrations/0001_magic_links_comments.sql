-- PigMap.org Database Schema Updates for Magic Links and Comments

-- Magic links for editing reports
CREATE TABLE IF NOT EXISTS edit_tokens (
  token TEXT PRIMARY KEY,
  report_id TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
);

-- Comments Table
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL,
  content TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  commenter_ip TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
);

-- Comment Media Table
CREATE TABLE IF NOT EXISTS comment_media (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  comment_id TEXT NOT NULL,
  url TEXT NOT NULL,
  content_type TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE
);

-- Indices for efficient queries
CREATE INDEX IF NOT EXISTS idx_edit_tokens_report_id ON edit_tokens (report_id);
CREATE INDEX IF NOT EXISTS idx_edit_tokens_expires_at ON edit_tokens (expires_at);
CREATE INDEX IF NOT EXISTS idx_comments_report_id ON comments (report_id);
CREATE INDEX IF NOT EXISTS idx_comments_timestamp ON comments (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_comment_media_comment_id ON comment_media (comment_id);
