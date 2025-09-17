-- schema.sql

DROP TABLE IF EXISTS reports;
CREATE TABLE reports (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    description TEXT,
    longitude REAL NOT NULL,
    latitude REAL NOT NULL,
    timestamp INTEGER NOT NULL,
    -- NOTE: We explicitly DO NOT store IP addresses or any user-identifying data.
    icon TEXT
);

DROP TABLE IF EXISTS media;
CREATE TABLE media (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id TEXT NOT NULL,
    url TEXT NOT NULL,
    content_type TEXT,
    FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
);

DROP TABLE IF EXISTS comments;
CREATE TABLE comments (
    id TEXT PRIMARY KEY,
    report_id TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    media_url TEXT,
    -- NOTE: We explicitly DO NOT store IP addresses.
    FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
);

DROP TABLE IF EXISTS edit_tokens;
CREATE TABLE edit_tokens (
    token TEXT PRIMARY KEY,
    report_id TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
);

-- Indexes for faster queries
CREATE INDEX idx_reports_timestamp ON reports (timestamp);
CREATE INDEX idx_comments_report_id ON comments (report_id);
CREATE INDEX idx_media_report_id ON media (report_id);
