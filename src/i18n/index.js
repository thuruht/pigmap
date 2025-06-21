// Export all translation files

export const translations = {
  en: require('./en.json'),
  es: require('./es.json'),
  ht: require('./ht.json'),
  zh: require('./zh.json'),
  vi: require('./vi.json'),
  ar: require('./ar.json'),
  am: require('./am.json'),
  sw: require('./sw.json'),
  so: require('./so.json'),
  fa: require('./fa.json'),
  fr: require('./fr.json'),
  ne: require('./ne.json'),
  kar: require('./kar.json'),
  my: require('./my.json'),
  pt: require('./pt.json'),
  ur: require('./ur.json'),
  ku: require('./ku.json')
};

// Map of language codes to display names
export const languageNames = {
  en: 'English',
  es: 'Español',
  ht: 'Kreyòl Ayisyen',
  zh: '中文',
  vi: 'Tiếng Việt',
  ar: 'العربية',
  am: 'አማርኛ',
  sw: 'Kiswahili',
  so: 'Soomaali',
  fa: 'فارسی',
  fr: 'Français',
  ne: 'नेपाली',
  kar: 'Karen',
  my: 'မြန်မာဘာသာ',
  pt: 'Português',
  ur: 'اردو',
  ku: 'Kurdî'
};

// Helper function to get translation
export function getTranslation(lang, key) {
  // Split the key by dots to access nested properties
  const parts = key.split('.');
  let result = translations[lang] || translations.en; // Fallback to English
  
  for (const part of parts) {
    if (result && result[part] !== undefined) {
      result = result[part];
    } else {
      // If translation is missing, fallback to English
      let fallback = translations.en;
      for (const fallbackPart of parts) {
        if (fallback && fallback[fallbackPart] !== undefined) {
          fallback = fallback[fallbackPart];
        } else {
          return key; // Last resort fallback to the key itself
        }
      }
      return fallback;
    }
  }
  
  return result;
}
