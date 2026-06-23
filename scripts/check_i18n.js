// Verify that src/i18n.js exports translations for all declared languages
// and that every language has the same set of translation keys.
const fs = require('fs');
const path = require('path');

const i18nFile = path.join(__dirname, '..', 'src', 'i18n.js');

if (!fs.existsSync(i18nFile)) {
  console.error('src/i18n.js not found');
  process.exit(1);
}

const content = fs.readFileSync(i18nFile, 'utf8');

// Extract language codes from languageNames object
const langNamesMatch = content.match(/export const languageNames\s*=\s*\{([^}]+)\}/s);
if (!langNamesMatch) {
  console.error('Could not find languageNames export in src/i18n.js');
  process.exit(1);
}
const declaredLangs = [...langNamesMatch[1].matchAll(/(\w+)\s*:/g)].map(m => m[1]);

// Extract language codes present in the translations object
const translationsMatch = content.match(/export const translations\s*=\s*\{([\s\S]+)\};\s*$/);
if (!translationsMatch) {
  console.error('Could not find translations export in src/i18n.js');
  process.exit(1);
}
const presentLangs = [...translationsMatch[1].matchAll(/^\s{4}(\w+)\s*:/gm)].map(m => m[1]);

const missing = declaredLangs.filter(l => !presentLangs.includes(l));
const extra   = presentLangs.filter(l => !declaredLangs.includes(l));

let ok = true;
if (missing.length > 0) {
  console.error('Languages declared in languageNames but missing translations:', missing.join(', '));
  ok = false;
}
if (extra.length > 0) {
  console.warn('Languages with translations not declared in languageNames:', extra.join(', '));
}

// Check that all present languages have the same set of keys
const keyPattern = /^\s{4}\w+\s*:\s*\{([^}]+)\}/gm;
const langKeys = {};
for (const lang of presentLangs) {
  const re = new RegExp(`\\b${lang}\\s*:\\s*\\{([^}]+)\\}`, 's');
  const m = translationsMatch[1].match(re);
  if (m) {
    langKeys[lang] = [...m[1].matchAll(/(\w+)\s*:/g)].map(k => k[1]).sort();
  }
}

const referenceLang = 'en';
const referenceKeys = langKeys[referenceLang];
if (referenceKeys) {
  for (const [lang, keys] of Object.entries(langKeys)) {
    if (lang === referenceLang) continue;
    const missingKeys = referenceKeys.filter(k => !keys.includes(k));
    if (missingKeys.length > 0) {
      console.warn(`  ${lang}: missing keys: ${missingKeys.join(', ')}`);
    }
  }
}

if (ok) {
  console.log(`i18n OK: ${presentLangs.length} languages (${presentLangs.join(', ')})`);
  process.exit(0);
} else {
  process.exit(2);
}
