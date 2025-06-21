-- PigMap.org Database Schema

-- Reports Table
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  count INTEGER DEFAULT 1,
  comment TEXT,
  longitude REAL NOT NULL,
  latitude REAL NOT NULL,
  timestamp INTEGER NOT NULL,
  reporter_ip TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Media Table
CREATE TABLE IF NOT EXISTS media (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  report_id TEXT NOT NULL,
  url TEXT NOT NULL,
  content_type TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
);

-- Indices for efficient queries
CREATE INDEX IF NOT EXISTS idx_reports_timestamp ON reports (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_reports_location ON reports (latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_reports_type ON reports (type);
CREATE INDEX IF NOT EXISTS idx_media_report_id ON media (report_id);
