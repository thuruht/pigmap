-- Remove all stored IP addresses for privacy
-- This script will set all IP address fields to NULL

-- Update reports table
UPDATE reports SET reporter_ip = NULL;

-- Update comments table
UPDATE comments SET commenter_ip = NULL;

-- Verify updates
SELECT COUNT(*) AS reports_with_ips FROM reports WHERE reporter_ip IS NOT NULL;
SELECT COUNT(*) AS comments_with_ips FROM comments WHERE commenter_ip IS NOT NULL;
