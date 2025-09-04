// Simple script to verify i18n JSON files exist for each language referenced in src/i18n/index.js
const fs = require('fs');
const path = require('path');

const i18nDir = path.join(__dirname, '..', 'src', 'i18n');
const indexFile = path.join(i18nDir, 'index.js');

if (!fs.existsSync(indexFile)) {
  console.error('i18n index.js not found');
  process.exit(1);
}

const content = fs.readFileSync(indexFile, 'utf8');
const matches = content.match(/(\w+): require\('\.\/([\w-]+)\.json'\)/g) || [];

const missing = [];
for (const m of matches) {
  const parts = m.match(/require\('\.\/(.*?)\.json'\)/);
  if (parts && parts[1]) {
    const file = path.join(i18nDir, `${parts[1]}.json`);
    if (!fs.existsSync(file)) missing.push(parts[1] + '.json');
  }
}

if (missing.length === 0) {
  console.log('All i18n JSON files present');
  process.exit(0);
} else {
  console.error('Missing i18n files:', missing.join(', '));
  process.exit(2);
}
