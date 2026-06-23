-- Remove IP address columns that were never populated by application code.
-- These columns exist in the initial schema but contradict the privacy guarantee
-- that no IP addresses or personally identifiable information are stored.

ALTER TABLE reports DROP COLUMN reporter_ip;
ALTER TABLE comments DROP COLUMN commenter_ip;
