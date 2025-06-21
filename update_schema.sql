-- Update schema to make IP address columns nullable
-- This allows us to stop storing IP addresses while maintaining compatibility with existing data

-- First, check if the columns exist and are not nullable
PRAGMA table_info(reports);
PRAGMA table_info(comments);

-- Make reporter_ip column nullable if it's not already
-- SQLite doesn't have a direct ALTER COLUMN command, so we need to create a temporary table,
-- copy data, drop the original table, and rename the temporary table

-- For reports table
CREATE TABLE reports_new (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  comment TEXT,
  longitude REAL NOT NULL,
  latitude REAL NOT NULL,
  timestamp INTEGER NOT NULL,
  reporter_ip TEXT, -- Now nullable
  icon TEXT
);

-- Copy data from old table to new table
INSERT INTO reports_new SELECT * FROM reports;

-- Drop old table and rename new table
DROP TABLE reports;
ALTER TABLE reports_new RENAME TO reports;

-- For comments table
CREATE TABLE comments_new (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL,
  content TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  commenter_ip TEXT, -- Now nullable
  FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
);

-- Copy data from old table to new table
INSERT INTO comments_new SELECT * FROM comments;

-- Drop old table and rename new table
DROP TABLE comments;
ALTER TABLE comments_new RENAME TO comments;

-- Verify changes
PRAGMA table_info(reports);
PRAGMA table_info(comments);
