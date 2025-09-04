#!/usr/bin/env bash
set -euo pipefail

DB=/work/tmp_migrations.db
if [ -f "$DB" ]; then rm "$DB"; fi

for f in $(ls /work/migrations/*.sql | sort); do
  echo "Applying $f"
  sqlite3 "$DB" ".read $f"
done

echo "Schema for tables:"
for t in reports media edit_tokens comments comment_media; do
  echo "--- $t ---"
  sqlite3 "$DB" "PRAGMA table_info($t);"
done
