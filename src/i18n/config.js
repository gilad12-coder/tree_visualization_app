import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import heTranslations from './locales/he.json';
import enTranslations from './locales/en.json';

// Get language from localStorage or default to Hebrew
const getStoredLanguage = () => {
  try {
    const settings = localStorage.getItem('orgChartSettings');
    if (settings) {
      const parsedSettings = JSON.parse(settings);
      if (parsedSettings.language) {
        return parsedSettings.language;
      }
    }
  } catch (error) {
    // Silently handle errors
  }
  return 'he'; // Default to Hebrew
};

// Initialize i18n synchronously
i18n
  .use(initReactI18next)
  .init({
    resources: {
      he: {
        translation: heTranslations
      },
      en: {
        translation: enTranslations
      }
    },
    lng: getStoredLanguage(),
    fallbackLng: 'he',
    interpolation: {
      escapeValue: false
    },
    react: {
      useSuspense: false // Disable suspense to avoid loading delays
    }
  });

// Set initial document direction and language
const initialLang = i18n.language || 'he';
document.documentElement.dir = initialLang === 'he' ? 'rtl' : 'ltr';
document.documentElement.lang = initialLang;
// Only set Hebrew font when in Hebrew mode, otherwise use default system fonts
if (initialLang === 'he') {
  document.body.style.fontFamily = 'var(--font-hebrew)';
} else {
  document.body.style.fontFamily = ''; // Reset to default system fonts from index.css
}

export default i18n;
