// Lightweight static verifier for SQL migrations that does not require sqlite3.
// It scans CREATE TABLE and ALTER TABLE statements to ensure expected tables/columns
// are present in the migration SQL files. This is a best-effort check and does not
// execute the SQL (D1 still runs migrations on deploy).
// Run with: node scripts/verify_migrations.js

const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

function parseCreateTable(sql) {
  const tables = {};
  const createTableRegex = /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+([\w_]+)\s*\(([^;]+?)\);/gims;
  let match;
  while ((match = createTableRegex.exec(sql)) !== null) {
    const name = match[1].trim();
    const colsRaw = match[2];
    const cols = colsRaw.split(/,\n|,\s*/).map(s => s.trim()).filter(Boolean).map(def => {
      const parts = def.split(/\s+/);
      return parts[0].replace(/[`"\[]/g, '');
    });
    tables[name] = cols;
  }

  // Handle ALTER TABLE ADD COLUMN
  const alterRegex = /ALTER\s+TABLE\s+([\w_]+)\s+ADD\s+COLUMN\s+([\w_]+)\s+/gims;
  while ((match = alterRegex.exec(sql)) !== null) {
    const name = match[1].trim();
    const col = match[2].trim();
    tables[name] = tables[name] || [];
    if (!tables[name].includes(col)) tables[name].push(col);
  }

  return tables;
}

function run() {
  const files = fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql')).sort();
  const aggregated = {};

  for (const file of files) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    const tables = parseCreateTable(sql);
    for (const t of Object.keys(tables)) {
      aggregated[t] = aggregated[t] || [];
      aggregated[t] = Array.from(new Set(aggregated[t].concat(tables[t])));
    }
  }

  const expected = {
    reports: ['id','type','count','comment','longitude','latitude','timestamp','reporter_ip','created_at','icon'],
    media: ['id','report_id','url','content_type','created_at'],
    edit_tokens: ['token','report_id','expires_at','created_at'],
    comments: ['id','report_id','content','timestamp','commenter_ip','created_at'],
    comment_media: ['id','comment_id','url','content_type','created_at']
  };

  let ok = true;
  for (const table of Object.keys(expected)) {
    const cols = aggregated[table] || [];
    const missing = expected[table].filter(c => !cols.includes(c));
    if (missing.length > 0) {
      console.error(`MISSING in ${table}:`, missing.join(', '));
      ok = false;
    } else {
      console.log(`OK: ${table} appears to include expected columns`);
    }
  }

  if (!ok) process.exit(2);
}

run();
